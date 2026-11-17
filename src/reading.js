/* Рендер слов/текстов: дуги, ударение, цвет слогов, подсветка.
   Замер скорости: сл/мин = (слова − запинки) × 60 / секунды. */
import { S, settings, h, save } from './app.js';
import { WORDS, EXTRA_WORDS } from './content/words.js';
import { TEXTS } from './content/texts.js';

const VOWELS = 'аеёиоуыэюя';
const dict = new Map();
for (const w of [...WORDS, ...EXTRA_WORDS]) dict.set(w.text.toLowerCase(), w);
export function lookupWord(text) {
  return dict.get(text.toLowerCase().replace(/[.,!?;:—-]/g, '')) || null;
}

/* Слово со слогами. Ударение — комбинируемый знак после гласной ударного слога. */
export function renderWord(word, opts = {}) {
  const arcs = opts.arcs ?? settings.arcs;
  const colors = opts.colors ?? settings.colors;
  const stress = opts.stress ?? settings.stress;
  const el = h('span', 'readword' + (arcs ? ' arcs' : '') + (colors ? ' colors' : ''));
  const syls = word.syllables || [word.text];
  syls.forEach((syl, i) => {
    let txt = syl;
    if (stress && i === word.stress) {
      const vi = [...syl].findIndex(c => VOWELS.includes(c.toLowerCase()));
      if (vi >= 0) txt = syl.slice(0, vi + 1) + '\u0301' + syl.slice(vi + 1);
    }
    el.append(h('span', 'syl', txt));
  });
  return el;
}

/* Текст: каждое слово — span с data-i для караоке-подсветки и тапов-жемчужин */
export function renderText(text, opts = {}) {
  const box = h('div', 'readtext' + ((opts.arcs ?? settings.arcs) ? ' arcs' : '') + ((opts.colors ?? settings.colors) ? ' colors' : ''));
  const tokens = text.split(/\s+/);
  tokens.forEach((tok, i) => {
    const w = h('span', 'w');
    w.dataset.i = i;
    const info = lookupWord(tok);
    if (info && (opts.arcs ?? settings.arcs)) {
      info.syllables.forEach((syl, si) => {
        let txt = syl;
        if ((opts.stress ?? settings.stress) && si === info.stress) {
          const vi = [...syl].findIndex(c => VOWELS.includes(c.toLowerCase()));
          if (vi >= 0) txt = syl.slice(0, vi + 1) + '\u0301' + syl.slice(vi + 1);
        }
        w.append(h('span', 'syl', txt));
      });
      // знаки препинания оставляем как есть
      const tail = tok.match(/[.,!?;:]+$/);
      if (tail) w.append(document.createTextNode(tail[0]));
    } else w.textContent = tok;
    box.append(w, document.createTextNode(' '));
  });
  return box;
}

export function wordCount(text) { return text.trim().split(/\s+/).length; }

/* сл/мин: слова минус запинки, нормированные на 60 секунд */
export function wpm(words, errors, seconds) {
  if (seconds < 5) return 0;
  return Math.max(0, Math.round((words - errors) * 60 / seconds));
}

/* Незнакомый текст для замера: не из textsRead, по силам (ступень по прогрессу) */
export function pickMeasureText() {
  const maxStage = Math.min(6, 2 + Object.keys(S.progress.levels).length / 8 | 0);
  const unseen = TEXTS.filter(t => !S.textsRead.includes(t.id) && t.tier <= Math.max(1, maxStage - 1));
  const pool = unseen.length ? unseen : TEXTS.filter(t => !S.textsRead.includes(t.id));
  const list = pool.length ? pool : TEXTS;
  return list[Math.floor(Math.random() * list.length)];
}

export function saveMeasurement(m) {
  S.measurements.push({ date: Date.now(), ...m });
  if (!S.textsRead.includes(m.textId)) S.textsRead.push(m.textId);
  checkGoal();
  save();
}

/* Цель: 3 замера подряд на РАЗНЫХ незнакомых текстах ≥40 и ≥1 верный ответ из 2 */
export function checkGoal() {
  const ms = S.measurements;
  if (ms.length < 3) return false;
  const last = ms.slice(-3);
  const ok = last.every(m => m.wpm >= 40 && m.comp >= 1)
    && new Set(last.map(m => m.textId)).size === 3;
  if (ok && !S.goal) {
    S.goal = true;
    if (!S.medals.includes('goal')) S.medals.push('goal');
    save();
  }
  return S.goal;
}

/* Прогноз: линейная регрессия по замерам → через сколько дней 40 сл/мин */
export function forecast() {
  const ms = S.measurements;
  if (ms.length < 2) return null;
  const t0 = ms[0].date;
  const xs = ms.map(m => (m.date - t0) / 864e5), ys = ms.map(m => m.wpm);
  const n = xs.length, sx = xs.reduce((a, b) => a + b, 0), sy = ys.reduce((a, b) => a + b, 0);
  const sxx = xs.reduce((a, x) => a + x * x, 0), sxy = xs.reduce((a, x, i) => a + x * ys[i], 0);
  const denom = n * sxx - sx * sx;
  if (!denom) return null;
  const k = (n * sxy - sx * sy) / denom, b = (sy - k * sx) / n;
  if (k <= 0.05) return { days: null, slope: k };
  const lastX = xs[xs.length - 1];
  const days = Math.max(0, Math.ceil((40 - b) / k - lastX));
  return { days, slope: k };
}
