/* Карта острова: 6 зон, дерево Охана, сундук, счётчики, вход в альбом/остров. */
import { S, h, btn, go, nav, topbar, charEl, say, sparkle, parentGate, toast, save, settings } from '../app.js';
import { zoneUnlocked, levelUnlocked, treeStage, chestAvailable, openChest } from '../rewards.js';
import { TREE_STAGES } from '../content/rewards.js';
import * as audio from '../audio.js';

export const ZONES = [
  { id: 1, name: 'Лагуна слогов', emoji: '🌊', x: 12, y: 62, games: ['fusion', 'surf'] },
  { id: 2, name: 'Мельница', emoji: '🌀', x: 30, y: 40, games: ['mill'] },
  { id: 3, name: 'Пляж слов', emoji: '🏖️', x: 52, y: 66, games: ['puzzle', 'jumps', 'photo', 'coconut'] },
  { id: 4, name: 'Грот ракушек', emoji: '🐚', x: 70, y: 44, games: ['coconut', 'photo', 'puzzle', 'space'] },
  { id: 5, name: 'Джунгли', emoji: '🌴', x: 40, y: 18, games: ['jumps', 'puzzle', 'space', 'coconut'] },
  { id: 6, name: 'Вулкан историй', emoji: '🌋', x: 74, y: 14, games: ['karaoke', 'swim'] }
];

export function mountMap(root) {
  const scr = h('div', 'screen');
  const bar = topbar('🏝️ Остров Охана');
  const gear = btn('⚙️', () => parentGate(() => nav('parent')), 'iconbtn');
  bar.append(gear);
  scr.append(bar);

  const counters = h('div', 'counters',
    `<span>🐚 ${S.shells}</span><span>⭐ ${S.xp}</span><span>🌸 ${S.lei}</span><span>${TREE_STAGES[treeStage()].emoji} ${TREE_STAGES[treeStage()].name}</span>`);
  scr.append(counters);

  const map = h('div', 'map');
  const cur = S.progress.current;
  ZONES.forEach(z => {
    const unlocked = zoneUnlocked(z.id);
    const isNext = unlocked && z.id === cur.zone;
    const b = h('button', 'zone' + (unlocked ? '' : ' lock') + (isNext ? ' next' : ''),
      `${unlocked ? z.emoji : '🔒'}<small>${z.name}</small>`);
    b.style.left = z.x + '%'; b.style.top = z.y + '%';
    b.addEventListener('click', () => {
      audio.sfx('tap');
      if (!unlocked) { toast('Собери 80% успеха в предыдущей зоне — и эта откроется! 🌺'); return; }
      zoneLevels(z);
    });
    map.append(b);
  });
  if (S.goal) {
    const gold = btn('🏆 Диплом!', () => nav('finale'), 'big coral');
    gold.style.position = 'absolute'; gold.style.left = '8%'; gold.style.top = '8%';
    map.append(gold);
  }
  scr.append(map);

  const row = h('div', 'row');
  const play = btn(`▶️ Играть: ${ZONES[cur.zone - 1].name}`, () => nav('level', { zone: cur.zone, level: cur.level }), 'big coral');
  row.append(play);
  row.append(btn('📔 Альбом', () => nav('album'), 'big teal'));
  row.append(btn('🏝️ Мой остров', () => nav('island'), 'big lime'));
  if (chestAvailable()) row.append(btn('🎁 Сундук', () => {
    const r = openChest();
    audio.sfx('reward'); sparkle(row, 24);
    toast(`В сундуке: 🐚 ${r.shells}` + (r.sticker ? ` и наклейка ${r.sticker.emoji} ${r.sticker.name}!` : '!'), null, null, 6000);
    nav('map');
  }, 'big'));
  scr.append(row);

  const chars = h('div', 'chars');
  chars.append(charEl('lilo'), charEl('stitch'));
  scr.append(chars, h('div', 'bubble', '&nbsp;'));
  scr.lastChild.id = 'bubble';
  root.append(scr);
  say('start');
}

/* Выбор уровня внутри зоны: 10 коротких уровней */
function zoneLevels(z) {
  const ov = h('div', 'overlay');
  const card = h('div', 'rewardcard');
  card.append(h('h2', '', `${z.emoji} ${z.name}`));
  const grid = h('div', 'row');
  for (let l = 1; l <= 10; l++) {
    const open = levelUnlocked(z.id, l);
    const acc = S.progress.levels[z.id + ':' + l];
    const label = open ? (acc ? '🌺' : '▶️') + ' ' + l : '🔒';
    const b = btn(label, () => { if (open) { ov.remove(); nav('level', { zone: z.id, level: l }); } }, open ? 'big teal' : 'big ghost');
    b.style.minWidth = '90px';
    grid.append(b);
  }
  card.append(grid, btn('🏠 Назад', () => ov.remove(), 'big ghost'));
  ov.append(card);
  document.body.append(ov);
  audio.speak('Выбери уровень!', { who: 'lilo' });
}
