/* Интервальное повторение: статистика по каждому слогу/слову,
   подбор заданий ~60% нового / ~40% повторения, проблемные — чаще. */
import { S, save } from './app.js';

const BOX_MS = [0, 6e4 * 10, 36e5 * 6, 864e5, 864e5 * 3, 864e5 * 7]; // лесенка интервалов

export function record(key, ok, rt = 0) {
  const st = S.stats[key] || { ok: 0, n: 0, rt: 0, box: 0, due: 0 };
  st.n++;
  if (ok) { st.ok++; st.box = Math.min(st.box + 1, BOX_MS.length - 1); }
  else st.box = Math.max(0, st.box - 1);
  st.rt = st.rt ? Math.round(st.rt * 0.7 + rt * 0.3) : rt;
  st.due = Date.now() + BOX_MS[st.box];
  st.last = Date.now();
  S.stats[key] = st;
  save();
}

export function accuracy(key) {
  const st = S.stats[key];
  return st && st.n ? st.ok / st.n : null;
}

/* Вес для повторения: чем хуже точность и дольше просрочка — тем чаще */
function reviewWeight(st) {
  const acc = st.n ? st.ok / st.n : 0.5;
  const overdue = Math.max(0, Date.now() - st.due) / 864e5;
  return (1.2 - acc) * 2 + Math.min(overdue, 3) + 0.2;
}

function weightedSample(pool, count, weightFn) {
  const out = [], items = pool.map(p => ({ p, w: weightFn(p) }));
  while (out.length < count && items.length) {
    const total = items.reduce((s, i) => s + i.w, 0);
    let r = Math.random() * total, idx = 0;
    for (; idx < items.length; idx++) { r -= items[idx].w; if (r <= 0) break; }
    idx = Math.min(idx, items.length - 1);
    out.push(items[idx].p);
    items.splice(idx, 1);
  }
  return out;
}

/* pick(pool, count): pool — массив заданий c полем key.
   60% — новые/мало виденные, 40% — повторение по весам. */
export function pick(pool, count) {
  const fresh = pool.filter(p => !S.stats[p.key] || S.stats[p.key].n < 2);
  const seen = pool.filter(p => S.stats[p.key] && S.stats[p.key].n >= 2);
  const nNew = Math.min(fresh.length, Math.round(count * 0.6));
  const nRev = count - nNew;
  const newPart = weightedSample(fresh, nNew, () => 1);
  let revPart = weightedSample(seen, nRev, p => reviewWeight(S.stats[p.key]));
  // если повторять нечего — добираем новым (и наоборот)
  if (revPart.length < nRev) revPart = revPart.concat(weightedSample(
    fresh.filter(p => !newPart.includes(p)), nRev - revPart.length, () => 1));
  if (newPart.length < nNew) newPart.push(...weightedSample(
    seen.filter(p => !revPart.includes(p)), nNew - newPart.length, p => reviewWeight(S.stats[p.key])));
  const all = [...newPart, ...revPart];
  // перемешиваем, чтобы повторение не шло блоком
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1)); [all[i], all[j]] = [all[j], all[i]];
  }
  return all.slice(0, count);
}

/* Топ проблемных элементов для родительского режима */
export function problemTop(n = 10) {
  return Object.entries(S.stats)
    .filter(([, st]) => st.n >= 2)
    .map(([key, st]) => ({ key, acc: st.ok / st.n, n: st.n, rt: st.rt }))
    .sort((a, b) => a.acc - b.acc || b.n - a.n)
    .slice(0, n);
}
