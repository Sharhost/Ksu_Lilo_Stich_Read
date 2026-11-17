/* Движок уровня: очередь заданий, комбо, точки-прогресс, мягкие ошибки,
   режим «давай вместе», подсказка после 6 с простоя, награды. */
import { S, settings, h, btn, nav, topbar, updateDots, charEl, say, sparkle, setMood, save, rnd, shuffle } from '../app.js';
import * as audio from '../audio.js';
import { record, pick } from '../adaptive.js';
import { grantLevelRewards, checkSpeedMedals } from '../rewards.js';
import { OPEN_SYLLABLES, CLOSED_SYLLABLES, TABLES } from '../content/syllables.js';
import { WORDS } from '../content/words.js';
import { SENTENCES } from '../content/sentences.js';
import { TEXTS } from '../content/texts.js';
import { ZONES } from './map.js';

import * as fusion from '../games/fusion.js';
import * as surf from '../games/surf.js';
import * as coconut from '../games/coconut.js';
import * as jumps from '../games/jumps.js';
import * as puzzle from '../games/puzzle.js';
import * as photo from '../games/photo.js';
import * as mill from '../games/mill.js';
import * as karaoke from '../games/karaoke.js';
import * as swim from '../games/swim.js';
import * as space from '../games/space.js';
const GAMES = { fusion, surf, coconut, jumps, puzzle, photo, mill, karaoke, swim, space };

/* Какие задания нужны игре */
function buildTasks(zone, level, game) {
  const sylPool = (zone <= 2 ? OPEN_SYLLABLES : OPEN_SYLLABLES.concat(CLOSED_SYLLABLES))
    .map(s => ({ key: 'syl:' + s, text: s, syllables: [s], stress: 0, kind: 'syl' }));
  const stage = zone === 3 ? 2 : zone === 4 ? 3 : 4;
  const wordPool = WORDS.filter(w => w.stage === stage || (zone === 5 && w.stage === 5))
    .map(w => ({ ...w, key: 'w:' + w.text, kind: 'word' }));
  switch (game) {
    case 'fusion': case 'surf': return pick(sylPool, 10);
    case 'mill': return { table: TABLES[(level - 1) % TABLES.length] };
    case 'coconut': case 'photo': return pick(zone <= 2 ? sylPool : wordPool, zone <= 2 ? 8 : 6);
    case 'jumps': case 'puzzle': return pick(wordPool.filter(w => w.syllables.length >= 2), 5);
    case 'space': return pick(wordPool, 8);
    case 'karaoke': {
      if (zone === 6 && level <= 4) {
        const s = SENTENCES[(level * 4 + rnd(4)) % SENTENCES.length];
        return { mode: 'sentence', item: s };
      }
      const unseen = TEXTS.filter(t => !S.textsRead.includes(t.id));
      const t = (unseen.length ? unseen : TEXTS)[(level - 5 + TEXTS.length) % (unseen.length || TEXTS.length)] || TEXTS[0];
      return { mode: 'text', item: t };
    }
    case 'swim': {
      const unseen = TEXTS.filter(t => !S.textsRead.includes(t.id));
      return { mode: 'text', item: (unseen.length ? unseen : TEXTS)[rnd(unseen.length || TEXTS.length)] };
    }
  }
  return pick(sylPool, 10);
}

export function mountLevel(root, { zone, level }) {
  const z = ZONES[zone - 1];
  const game = zone === 6 ? (level === 10 ? 'swim' : 'karaoke') : z.games[(level - 1) % z.games.length];
  const tasks = buildTasks(zone, level, game);
  const total = Array.isArray(tasks) ? tasks.length : (game === 'mill' ? 25 : game === 'swim' ? 10 : 5);

  const scr = h('div', 'screen');
   scr.classList.add('scene');
  scr.style.backgroundImage = 'url(assets/scenes/zone' + zone + '.jpg)';
  scr.append(topbar(`${z.emoji} ${z.name} · ${level}`, 0));
  const combo = h('div', 'combo'); const comboFill = h('i'); combo.append(comboFill);
  scr.append(combo);
  const field = h('div', 'field');
  scr.append(field);
  const chars = h('div', 'chars');
  chars.append(charEl('lilo'), charEl('stitch'));
  const bubble = h('div', 'bubble', '&nbsp;'); bubble.id = 'bubble';
  scr.append(chars, bubble);
  root.append(scr);

  /* --- состояние движка --- */
  let ok = 0, helped = 0, wrong = 0, done = 0, comboN = 0;
  let fastWrong = 0, lastHitAt = Date.now();
  let idleTimer = null, finished = false, timers = [];
  const readAloud = ['fusion', 'surf', 'mill', 'karaoke', 'swim', 'space'].includes(game);

  const ctx = {
    tasks, settings, S, audio, game, zone, level, readAloud,
    target: '', hinted: false,
    field,
    say, sparkle,
    setTarget(t) { ctx.target = t; ctx.hinted = false; resetIdle(); },
    /* взрослая панель проверки — основа проверки чтения вслух */
    adultBar(onOk, onHelp) {
      const bar = h('div', 'adultbar');
      const bOk = btn('👍 Получилось', () => onOk(), 'big lime');
      const bHelp = btn('🤝 Помогли', () => onHelp(), 'big ghost');
      bOk.id = 'adult-ok';
      bar.append(bOk, bHelp);
      bar.append(h('div', 'hintline', ''));
      return bar;
    },
    helpBtn(fn) { return btn('🔊 Помоги', fn, 'big ghost'); },
    hit(item, isOk, isHelp = false) {
      if (finished) return;
      const now = Date.now(), rt = now - lastHitAt; lastHitAt = now;
      done++;
      if (item && item.key) record(item.key, isOk, rt);
      if (isOk) {
        ok++; comboN++;
        fastWrong = 0;
        audio.sfx(comboN >= 3 ? 'combo' : 'ding');
        sparkle(field, comboN >= 3 ? 24 : 12);
        setMood('stitch', 'cheer');
        if (comboN === 5) say('combo');
        else if (ok % 4 === 0) say('success');
        // «почти»-угадывание: быстрые промахи подряд → режим «давай вместе»
      } else if (isHelp) { helped++; comboN = 0; audio.sfx('soft'); say('miss'); }
      else {
        wrong++; comboN = 0; audio.sfx('soft');
        if (rt < 900) fastWrong++; else fastWrong = 0;
        if (fastWrong >= 3) { fastWrong = 0; say('miss'); }
        else if (wrong % 2 === 1) say('miss');
      }
      comboFill.style.width = Math.min(100, comboN * 20) + '%';
      updateDots(Math.min(5, Math.ceil(done / total * 5)));
      resetIdle();
    },
    finish() {
      if (finished) return;
      finished = true;
      clearTimeout(idleTimer); timers.forEach(clearTimeout);
      audio.stopRecording();
      const attempts = ok + helped + wrong;
      const acc = attempts ? ok / attempts : 1;
      finishOverlay(zone, level, acc, readAloud);
    },
    later(fn, ms) { const t = setTimeout(fn, ms); timers.push(t); return t; }
  };

  /* Подсказка звуком — только после 6 с простоя (не до попытки!) */
  function resetIdle() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      if (!finished && ctx.target && !ctx.hinted) {
        ctx.hinted = true;
        audio.speak(ctx.target, { who: 'lilo', slow: true });
      }
    }, 6000);
  }

  say('start');
  GAMES[game].mount(field, ctx);
  resetIdle();

  /* клавиатура: пробел/Enter = «получилось» */
  const onKey = e => {
    if ((e.key === ' ' || e.key === 'Enter') && document.getElementById('adult-ok')) {
      e.preventDefault(); document.getElementById('adult-ok').click();
    }
  };
  document.addEventListener('keydown', onKey);

  return () => { // cleanup при уходе с экрана
    finished = true;
    clearTimeout(idleTimer); timers.forEach(clearTimeout);
    document.removeEventListener('keydown', onKey);
    audio.cancelSpeech(); audio.stopRecording();
  };
}

/* Итог уровня: ракушки по точности, XP, наклейка, цветок леи */
function finishOverlay(zone, level, acc, readAloud) {
  const r = grantLevelRewards(zone, level, acc);
  const medals = checkSpeedMedals();
  audio.sfx('reward');
  const ov = h('div', 'overlay');
  const card = h('div', 'rewardcard');
  if (acc >= 0.8) {
    card.append(h('div', 'stickerbig', r.sticker ? r.sticker.emoji : '🌺'));
    card.append(h('h2', '', r.sticker ? (r.dupShells ? `${r.sticker.name} уже есть → +🐚${r.dupShells}` : `Новая наклейка: ${r.sticker.name}!`) : 'Уровень пройден!'));
  } else {
    card.append(h('div', 'stickerbig', '🌱'));
    card.append(h('h2', '', 'Ещё чуть-чуть!'));
  }
  card.append(h('div', 'counters', `<span>+🐚 ${r.shells}</span><span>+⭐ ${r.xp}</span><span>+🌸 1</span>`));
  medals.forEach(id => card.append(h('div', '', `🏅 Новая медаль «Молния»!`)));
  const bubble = h('div', 'bubble', '&nbsp;'); bubble.id = 'bubble';
  card.append(bubble);
  const row = h('div', 'row');
  if (acc >= 0.8 && level < 10) row.append(btn('▶️ Дальше', () => { ov.remove(); nav('level', { zone, level: level + 1 }); }, 'big coral'));
  if (acc < 0.8) row.append(btn('🔁 Ещё разок', () => { ov.remove(); nav('level', { zone, level }); }, 'big coral'));
  row.append(btn('🏝️ Карта', () => { ov.remove(); nav('map'); }, 'big teal'));
  card.append(row);
  ov.append(card);
  document.body.append(ov);
  sparkle(card, 30);
  say(acc >= 0.8 ? 'reward' : 'end');
}
