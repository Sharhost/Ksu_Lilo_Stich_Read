/* Четыре контура наград: мгновенная (в играх), за уровень,
   коллекции (наклейки/остров), долгая (дерево/медали/наряды). */
import { S, save, rnd } from './app.js';
import { STICKERS, MEDALS, TREE_STAGES, OUTFITS, SPEED_LADDER } from './content/rewards.js';

export function treeStage() {
  const xp = S.xp;
  let stage = 0;
  TREE_STAGES.forEach((t, i) => { if (xp >= t.xp) stage = i; });
  return stage;
}

/* Ракушки за уровень — по точности, не по скорости */
export function levelShells(acc) { return acc >= 0.9 ? 3 : acc >= 0.8 ? 2 : 1; }

export function grantLevelRewards(zone, level, acc) {
  const key = zone + ':' + level;
  const firstPass = acc >= 0.8 && !S.progress.levels[key];
  const shells = levelShells(acc);
  S.shells += shells;
  S.xp += Math.round(8 + acc * 12);
  let sticker = null, dupShells = 0;
  if (acc >= 0.8) {
    S.lei++;
    S.progress.levels[key] = Math.max(S.progress.levels[key] || 0, acc);
    // наклейка: предпочитаем ещё не собранную
    const unowned = STICKERS.filter(st => !S.stickers[st.id]);
    const pool = unowned.length && Math.random() < 0.8 ? unowned : STICKERS;
    sticker = pool[rnd(pool.length)];
    if (S.stickers[sticker.id]) { dupShells = 3; S.shells += 3; }
    else S.stickers[sticker.id] = 1;
    // следующий уровень зоны
    const cur = S.progress.current;
    if (cur.zone === zone && cur.level === level && level < 10) cur.level = level + 1;
  }
  // точность зоны — для открытия следующей
  const za = S.progress.zoneAcc[zone] || { ok: 0, n: 0 };
  za.ok += acc; za.n += 1;
  S.progress.zoneAcc[zone] = za;
  checkCollectionMedals();
  save();
  return { shells, sticker, dupShells, firstPass, xp: Math.round(8 + acc * 12) };
}

export function zoneUnlocked(zone) {
  if (zone === 1) return true;
  const za = S.progress.zoneAcc[zone - 1];
  return !!za && za.n >= 2 && za.ok / za.n >= 0.8;
}
export function levelUnlocked(zone, level) {
  if (!zoneUnlocked(zone)) return false;
  if (level === 1) return true;
  return !!S.progress.levels[zone + ':' + (level - 1)];
}

/* Медали «Молния» за ступени лестницы скорости */
export function checkSpeedMedals() {
  const best = Math.max(0, ...S.measurements.map(m => m.wpm));
  const got = [];
  SPEED_LADDER.forEach(step => {
    const id = 'speed' + step;
    if (best >= step && !S.medals.includes(id)) { S.medals.push(id); got.push(id); }
  });
  if (got.length) save();
  return got;
}

/* Ежедневный сундук: без наказаний за пропуск */
export function chestAvailable() {
  const today = new Date().toISOString().slice(0, 10);
  return S.daily.last !== today;
}
export function openChest() {
  S.daily.last = new Date().toISOString().slice(0, 10);
  const shells = 3 + rnd(5);
  S.shells += shells;
  let sticker = null;
  if (Math.random() < 0.5) {
    const unowned = STICKERS.filter(st => !S.stickers[st.id]);
    if (unowned.length) { sticker = unowned[rnd(unowned.length)]; S.stickers[sticker.id] = 1; }
    else S.shells += 3;
  }
  save();
  return { shells, sticker };
}

export function unlockedOutfits() {
  return OUTFITS.filter(o => S.xp >= o.xp);
}
export function medalInfo(id) { return MEDALS.find(m => m.id === id); }
