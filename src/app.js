/* Ядро: состояние, роутер экранов, персонажи, реплики, искры, сессия. */
import { loadState, loadSettings, queueSave, saveSettings, defaultState, flushSave } from './storage.js';
import * as audio from './audio.js';
import { line } from './content/lines.js';

export let S = null;
export const settings = loadSettings();
export function save() { queueSave(S); }
export function saveSettingsNow() { saveSettings(settings); applyBodyModes(); audio.applyVolumes(); }
export function applyBodyModes() {
  document.body.classList.toggle('calm', settings.calm);
  document.body.classList.toggle('big', settings.big);
}

/* --- утилиты --- */
export const rnd = n => Math.floor(Math.random() * n);
export const pick = a => a[rnd(a.length)];
export function shuffle(a) { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = rnd(i + 1); [r[i], r[j]] = [r[j], r[i]]; } return r; }
export function h(tag, cls, html) {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (html !== undefined) el.innerHTML = html;
  return el;
}
export function btn(label, fn, cls = 'big') {
  const b = h('button', cls, label);
  b.addEventListener('click', () => { audio.sfx('tap'); fn(); });
  return b;
}
export const today = () => new Date().toISOString().slice(0, 10);

/* --- имя: подстановка форм --- */
export function fmt(text) {
  const p = S.profile;
  return text.replaceAll('{n}', p.name).replaceAll('{t}', p.formT).replaceAll('{s}', p.formS);
}

/* --- персонажи: собственные SVG-иллюстрации --- */
export function charSVG(who, mood = 'normal') {
  const eyes = mood === 'happy'
    ? '<path d="M38 52 q5 -7 10 0 M62 52 q5 -7 10 0" stroke="#233a4d" stroke-width="3.5" fill="none" stroke-linecap="round"/>'
    : '<circle cx="43" cy="52" r="4.5" fill="#233a4d"/><circle cx="67" cy="52" r="4.5" fill="#233a4d"/>';
  const mouth = mood === 'cheer'
    ? '<path d="M44 66 q11 12 22 0 z" fill="#c94f43"/>'
    : mood === 'think'
      ? '<path d="M46 68 q9 -4 18 0" stroke="#233a4d" stroke-width="3" fill="none" stroke-linecap="round"/>'
      : '<path d="M45 65 q10 9 20 0" stroke="#233a4d" stroke-width="3" fill="none" stroke-linecap="round"/>';
  if (who === 'lilo') return `<svg viewBox="0 0 110 130" aria-label="Лило">
    <path d="M20 60 q-6 -46 35 -48 q41 2 35 48 q4 34 -10 44 l-50 0 q-14 -10 -10 -44z" fill="#3b2b20"/>
    <circle cx="55" cy="56" r="30" fill="#e8b88a"/>
    <path d="M25 46 q10 -26 30 -26 q20 0 30 26 q-14 -12 -30 -12 q-16 0 -30 12z" fill="#3b2b20"/>
    <circle cx="84" cy="34" r="8" fill="#ff6f61"/><circle cx="84" cy="34" r="3" fill="#ffb347"/>
    ${eyes}${mouth}
    <path d="M30 96 q25 -12 50 0 l-4 26 q-21 8 -42 0z" fill="#ff6f61"/>
    <path d="M38 100 q17 -7 34 0" stroke="#fff7e6" stroke-width="4" fill="none"/>
  </svg>`;
  return `<svg viewBox="0 0 110 130" aria-label="Стич">
    <path d="M18 30 q-14 -22 4 -26 q16 -2 22 22z" fill="#2f6fd0"/>
    <path d="M92 30 q14 -22 -4 -26 q-16 -2 -22 22z" fill="#2f6fd0"/>
    <path d="M22 26 q-8 -14 2 -17 q10 -1 15 15z" fill="#8fc3ff"/>
    <path d="M88 26 q8 -14 -2 -17 q-10 -1 -15 15z" fill="#8fc3ff"/>
    <ellipse cx="55" cy="60" rx="34" ry="30" fill="#2f6fd0"/>
    <ellipse cx="55" cy="70" rx="22" ry="16" fill="#8fc3ff"/>
    <ellipse cx="43" cy="50" rx="8" ry="9" fill="#fff"/><ellipse cx="67" cy="50" rx="8" ry="9" fill="#fff"/>
    <circle cx="43" cy="52" r="4" fill="#233a4d"/><circle cx="67" cy="52" r="4" fill="#233a4d"/>
    <ellipse cx="55" cy="63" rx="6" ry="4.5" fill="#1d3f7a"/>
    ${mood === 'cheer' ? '<path d="M42 72 q13 12 26 0 z" fill="#1d3f7a"/>' : '<path d="M44 72 q11 7 22 0" stroke="#1d3f7a" stroke-width="3" fill="none" stroke-linecap="round"/>'}
    <path d="M46 92 q9 6 18 0 l4 26 q-13 7 -26 0z" fill="#2f6fd0"/>
    <path d="M50 8 q5 -8 10 0" stroke="#2f6fd0" stroke-width="4" fill="none"/>
  </svg>`;
}
export function charEl(who, mood = 'normal') {
  const el = h('div', 'char sway', charSVG(who, mood));
  el.dataset.who = who;
  return el;
}
export function setMood(who, mood) {
  document.querySelectorAll(`.char[data-who="${who}"]`).forEach(el => {
    el.innerHTML = charSVG(who, mood);
    el.classList.remove('cheer');
    if (mood === 'cheer' || mood === 'happy') { void el.offsetWidth; el.classList.add('cheer'); }
  });
}

/* --- реплики: текст + голос, без повторов подряд (логика в content/lines.js) --- */
export function say(event, opts = {}) {
  const l = line(event);
  const text = fmt(l.text);
  const bubble = document.getElementById('bubble');
  if (bubble) bubble.innerHTML = `<b>${l.who === 'lilo' ? 'Лило' : 'Стич'}:</b> ${text}`;
  setMood(l.who, opts.mood || (event === 'success' || event === 'reward' || event === 'combo' ? 'cheer' : event === 'miss' ? 'think' : 'happy'));
  if (!opts.silent) audio.speak(text, { who: l.who });
  return text;
}

/* --- искры/частицы (canvas, без мельтешения) --- */
const fx = document.getElementById('fx');
const fctx = fx.getContext('2d');
let parts = [], fxRunning = false;
function fxLoop() {
  fctx.clearRect(0, 0, fx.width, fx.height);
  parts = parts.filter(p => p.life > 0);
  for (const p of parts) {
    p.x += p.vx; p.y += p.vy; p.vy += 0.12; p.life -= 0.02;
    fctx.globalAlpha = Math.max(0, p.life);
    fctx.fillStyle = p.color;
    fctx.beginPath(); fctx.arc(p.x, p.y, p.r, 0, 7); fctx.fill();
  }
  fctx.globalAlpha = 1;
  if (parts.length) requestAnimationFrame(fxLoop); else fxRunning = false;
}
export function sparkle(target, count = 16) {
  if (settings.calm) count = 5;
  fx.width = innerWidth; fx.height = innerHeight;
  let x = innerWidth / 2, y = innerHeight / 2;
  if (target instanceof Element) { const r = target.getBoundingClientRect(); x = r.left + r.width / 2; y = r.top + r.height / 2; }
  const colors = ['#ffb347', '#ff6f61', '#9acd32', '#0fb5ba', '#fff'];
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2, v = 2 + Math.random() * 3;
    parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, r: 2 + Math.random() * 3, life: 1, color: pick(colors) });
  }
  if (!fxRunning) { fxRunning = true; requestAnimationFrame(fxLoop); }
}

/* --- тосты --- */
export function toast(msg, actionLabel, fn, ms = 6000) {
  const t = h('div', 'toast', `<span>${msg}</span>`);
  if (actionLabel) t.append(btn(actionLabel, () => { t.remove(); fn(); }, 'big lime'));
  document.getElementById('toasts').append(t);
  setTimeout(() => t.remove(), ms);
}

/* --- роутер --- */
const screens = {};
export function register(name, fn) { screens[name] = fn; }
let cleanup = null;
export function go(name, params = {}) {
  audio.cancelSpeech();
  if (cleanup) { try { cleanup(); } catch {} cleanup = null; }
  const root = document.getElementById('app');
  root.innerHTML = '';
  const res = screens[name](root, params);
  if (typeof res === 'function') cleanup = res;
  // голосовая подсказка при первом появлении экрана (навигация без чтения)
  const hints = {
    map: 'Это наш остров! Нажми на большую стрелку — начнём игру.',
    album: 'Это альбом наклеек Охана! Смотри, какие уже собраны.',
    island: 'Это твой остров! Ставь наклейки, где захочешь.',
    finale: 'Ура! Ты читаешь быстрее Стича! Вот твой диплом!'
  };
  if (hints[name] && !S.seenScreens[name]) {
    S.seenScreens[name] = true; save();
    setTimeout(() => audio.speak(hints[name], { who: 'lilo' }), 400);
  }
}

/* Верхняя панель: домой, где я, сколько осталось (точки) */
export function topbar(place, dots = null) {
  const bar = h('div', 'topbar');
  bar.append(btn('🏠', () => go('map'), 'iconbtn'));
  bar.append(h('div', 'place', place));
  if (dots !== null) {
    const d = h('div', 'dots');
    for (let i = 0; i < 5; i++) d.append(h('i', i < dots ? 'on' : ''));
    bar.append(d);
  } else bar.append(h('div', '', ''));
  return bar;
}
export function updateDots(n) {
  document.querySelectorAll('.dots i').forEach((el, i) => el.classList.toggle('on', i < n));
}

/* --- сессия: мягкая пауза, учёт времени --- */
let sessionSec = 0, pauseShownAt = 0;
setInterval(() => {
  if (!S || document.hidden) return;
  const scr = currentScreen;
  if (scr === 'welcome' || scr === 'parent' || scr === 'measure') return;
  sessionSec += 10;
  const d = today();
  S.timeByDay[d] = (S.timeByDay[d] || 0) + 10;
  if (sessionSec % 60 === 0) save();
  const limit = settings.sessionMin * 60;
  if (sessionSec >= limit && sessionSec - pauseShownAt >= limit) {
    pauseShownAt = sessionSec;
    softPause();
  }
}, 10000);

function softPause() {
  const ov = h('div', 'overlay');
  const card = h('div', 'rewardcard');
  card.append(h('div', '', charSVG('stitch', 'think')));
  card.append(h('div', 'bubble', `<b>Стич:</b> ${fmt('{s} устал… Покормим его кокосом?')}`));
  audio.speak(fmt('Стич устал. Покормим его кокосом?'), { who: 'stitch' });
  const row = h('div', 'row');
  row.append(btn('🥥 Покормить', () => {
    audio.sfx('munch'); sparkle(card, 20); setMood('stitch', 'cheer');
    setTimeout(() => ov.remove(), 700);
  }, 'big lime'));
  row.append(btn('▶️ Играть дальше', () => ov.remove(), 'big ghost'));
  card.append(row);
  ov.append(card);
  document.body.append(ov);
}

/* --- родительский вход: удержание 3 с + пример --- */
export function parentGate(after) {
  const ov = h('div', 'overlay');
  const g = h('div', 'gate');
  g.append(h('div', '', '🔒 Для взрослых'));
  const ring = h('div', 'holdring', '👆');
  g.append(ring, h('div', 'hintline', 'Нажми и держи 3 секунды'));
  let timer = null;
  const start = e => { e.preventDefault(); ring.classList.add('fill'); timer = setTimeout(() => { ring.classList.remove('fill'); mathStep(g, ov, after); }, 3000); };
  const cancel = () => { clearTimeout(timer); ring.classList.remove('fill'); };
  ring.addEventListener('pointerdown', start);
  ring.addEventListener('pointerup', cancel);
  ring.addEventListener('pointerleave', cancel);
  g.append(btn('Отмена', () => ov.remove(), 'big ghost'));
  ov.append(g);
  document.body.append(ov);
}
function mathStep(g, ov, after) {
  const a = 3 + rnd(6), b = 3 + rnd(6), answer = a * b;
  const opts = shuffle([answer, answer + a, answer - b > 0 ? answer - b : answer + 2]);
  g.innerHTML = '';
  g.append(h('div', '', `Сколько будет ${a} × ${b}?`));
  const row = h('div', 'row');
  opts.forEach(v => row.append(btn(String(v), () => {
    if (v === answer) { ov.remove(); after(); }
    else { g.append(h('div', 'hintline', 'Попробуй ещё раз 🙂')); }
  }, 'big teal')));
  g.append(row, btn('Отмена', () => ov.remove(), 'big ghost'));
}

/* --- текущий экран и старт --- */
let currentScreen = 'welcome';
const _go = go;
// обёртка запоминает имя экрана для учёта времени
export function nav(name, params) { currentScreen = name; _go(name, params); }

async function boot() {
  S = await loadState();
  applyBodyModes();
  const { mountMap } = await import('./screens/map.js');
  const { mountLevel } = await import('./screens/level.js');
  const { mountAlbum } = await import('./screens/album.js');
  const { mountIsland } = await import('./screens/island.js');
  const { mountParent } = await import('./screens/parent.js');
  const { mountMeasure } = await import('./screens/measure.js');
  const { mountFinale } = await import('./screens/finale.js');
  register('map', mountMap); register('level', mountLevel);
  register('album', mountAlbum); register('island', mountIsland);
  register('parent', mountParent); register('measure', mountMeasure);
  register('finale', mountFinale);
  register('welcome', mountWelcome);
  nav('welcome');
  initSW();
}

function mountWelcome(root) {
  const scr = h('div', 'screen');
  scr.style.justifyContent = 'center';
  const chars = h('div', 'chars');
  chars.append(charEl('lilo', 'happy'), charEl('stitch', 'cheer'));
  scr.append(
    h('div', 'bubble', '🌺 Ксюша, Лило и Стич 🌺<br><b>Учимся читать!</b>'),
    chars,
    h('div', 'row', '')
  );
  const start = btn('🏄 Начать приключение!', () => {
    audio.unlock(); // разблокировка звука на iOS — первый тап
    audio.sfx('reward');
    nav('map');
  }, 'big coral');
  start.style.fontSize = '30px';
  scr.querySelector('.row').append(start);
  const gear = btn('⚙️', () => parentGate(() => nav('parent')), 'iconbtn');
  gear.style.position = 'absolute'; gear.style.top = '12px'; gear.style.right = '12px';
  scr.append(gear);
  root.append(scr);
}

/* --- PWA: регистрация и обновление без потери данных --- */
function initSW() {
  if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return;
  navigator.serviceWorker.register('./sw.js').then(reg => {
    reg.addEventListener('updatefound', () => {
      const nw = reg.installing;
      nw.addEventListener('statechange', () => {
        if (nw.state === 'installed' && navigator.serviceWorker.controller) {
          toast('Вышла новая версия игры 🌟', 'Обновить игру', () => {
            navigator.serviceWorker.addEventListener('controllerchange', () => location.reload());
            reg.waiting.postMessage('skip-waiting');
          }, 30000);
        }
      });
    });
  }).catch(() => {});
  // подсказка родителю, если русского голоса нет
  setTimeout(() => {
    if (!audio.hasRuVoice() && !settings.ttsHintShown) {
      settings.ttsHintShown = true; saveSettingsNow();
      toast('Русский голос не найден — читайте вслух вместе с ребёнком (режим «читает взрослый» включён).', null, null, 12000);
    }
  }, 3500);
}

boot();
