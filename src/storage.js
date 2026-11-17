/* IndexedDB-враппер без зависимостей + localStorage для настроек.
   Схема версионируется, сохранение — debounce 300 мс. */
const DB_NAME = 'ksusha-reads', DB_VER = 1, STATE_KEY = 'state';
let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) { reject(new Error('no idb')); return; }
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = () => req.result.createObjectStore('kv');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

export async function idbGet(key) {
  try {
    const db = await openDB();
    return await new Promise((res, rej) => {
      const r = db.transaction('kv').objectStore('kv').get(key);
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
  } catch { // запасной путь — localStorage (приватный режим и т.п.)
    try { return JSON.parse(localStorage.getItem('idb:' + key)); } catch { return undefined; }
  }
}

export async function idbSet(key, val) {
  try {
    const db = await openDB();
    await new Promise((res, rej) => {
      const t = db.transaction('kv', 'readwrite');
      t.objectStore('kv').put(val, key);
      t.oncomplete = res; t.onerror = () => rej(t.error);
    });
  } catch {
    try { localStorage.setItem('idb:' + key, JSON.stringify(val)); } catch { /* квота — не роняем игру */ }
  }
}

/* Миграции схемы состояния: ключ — версия, ИЗ которой мигрируем */
const STATE_VER = 1;
const MIGRATIONS = { /* 0→1: базовая схема, мигрировать нечего */ };

export function defaultState() {
  return {
    v: STATE_VER,
    profile: { name: 'Ксюша', formT: 'Ксюшенька', formS: 'Ксюш', avatar: '🌺', start: new Date().toISOString() },
    progress: { levels: {}, zoneAcc: {}, current: { zone: 1, level: 1 } },
    shells: 0, xp: 0, lei: 0,
    stickers: {}, island: [], outfit: { lilo: '', stitch: '' },
    medals: [], measurements: [], textsRead: [], photos: [],
    daily: { last: '' }, timeByDay: {}, stats: {}, millPB: {},
    goal: false, seenScreens: {}
  };
}

export async function loadState() {
  let s = await idbGet(STATE_KEY);
  if (!s) return defaultState();
  while (s.v < STATE_VER && MIGRATIONS[s.v]) { s = MIGRATIONS[s.v](s); s.v++; }
  //补齐 новые поля без потери старых данных
  const d = defaultState();
  for (const k of Object.keys(d)) if (s[k] === undefined) s[k] = d[k];
  return s;
}

let saveTimer = null, pending = null;
export function queueSave(state) {
  pending = state;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flushSave, 300);
}
export async function flushSave() {
  clearTimeout(saveTimer);
  if (pending) { const s = pending; pending = null; await idbSet(STATE_KEY, s); }
}
// Сохраняем при сворачивании вкладки — прогресс не теряется
addEventListener('visibilitychange', () => { if (document.hidden) flushSave(); });
addEventListener('pagehide', flushSave);

/* Настройки — мелкие, живут в localStorage */
export function defaultSettings() {
  return {
    sound: true, music: true, voiceVol: 0.9, musicVol: 0.25, sfxVol: 0.8, rate: 1,
    arcs: true, stress: true, colors: true, syllOnly: false,
    calm: false, big: false, mic: false, recognition: false,
    sessionMin: 12, forceStage: 0, ttsHintShown: false
  };
}
export function loadSettings() {
  try { return { ...defaultSettings(), ...JSON.parse(localStorage.getItem('settings') || '{}') }; }
  catch { return defaultSettings(); }
}
export function saveSettings(s) { try { localStorage.setItem('settings', JSON.stringify(s)); } catch {} }

/* Экспорт / импорт прогресса файлом JSON */
export function exportJSON(state, settings) {
  const blob = new Blob([JSON.stringify({ state, settings }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'ksusha-progress.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
export function importJSON(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => { try {
      const data = JSON.parse(r.result);
      if (!data.state || !data.state.profile) throw new Error('bad');
      res(data);
    } catch (e) { rej(e); } };
    r.onerror = () => rej(r.error);
    r.readAsText(file);
  });
}

/* Записи голоса: максимум 10 последних */
export async function addRecording(blob) {
  const recs = (await idbGet('recs')) || [];
  recs.push({ date: Date.now(), blob });
  while (recs.length > 10) recs.shift();
  await idbSet('recs', recs);
}
export async function getRecordings() { return (await idbGet('recs')) || []; }
