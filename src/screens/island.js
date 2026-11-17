/* Свой остров: песочница-декоратор. Наклейки ставятся тапом,
   двигаются перетаскиванием с магнитным прилипанием к сетке 40px. */
import { S, h, btn, nav, topbar, save, charEl, sparkle } from '../app.js';
import { STICKERS } from '../content/rewards.js';
import * as audio from '../audio.js';

export function mountIsland(root) {
  const scr = h('div', 'screen');
  scr.append(topbar('🏝️ Мой остров'));
  const fieldEl = h('div', 'islandfield');
  const tray = h('div', 'tray');
  const hint = h('div', 'hintline', 'Выбери наклейку внизу и нажми на остров. Двойной тап — убрать.');
  scr.append(fieldEl, hint, tray);
  root.append(scr);

  // герои с нарядами живут на острове
  ['lilo', 'stitch'].forEach((who, i) => {
    const c = charEl(who, 'happy');
    c.style.position = 'absolute'; c.style.left = (8 + i * 14) + '%'; c.style.bottom = '6px';
    if (S.outfit[who]) {
      const badge = h('div', '', S.outfit[who]);
      badge.style.cssText = 'position:absolute;top:-14px;right:-6px;font-size:30px';
      c.append(badge);
    }
    fieldEl.append(c);
  });

  let selected = null;
  const owned = STICKERS.filter(st => S.stickers[st.id]);
  if (!owned.length) tray.append(h('div', 'hintline', 'Наклейки появятся после первых уровней! 🌺'));
  owned.forEach(st => {
    const b = h('button', '', st.emoji);
    b.addEventListener('click', () => {
      audio.sfx('tap');
      tray.querySelectorAll('button').forEach(x => x.classList.remove('sel'));
      b.classList.add('sel'); selected = st;
    });
    tray.append(b);
  });

  function draw() {
    fieldEl.querySelectorAll('.st').forEach(e => e.remove());
    S.island.forEach((item, idx) => {
      const st = STICKERS.find(s => s.id === item.id);
      if (!st) return;
      const el = h('div', 'st', st.emoji);
      el.style.left = item.x + '%'; el.style.top = item.y + '%';
      attachDrag(el, idx);
      fieldEl.append(el);
    });
  }

  function attachDrag(el, idx) {
    let moved = false, sx = 0, sy = 0;
    el.addEventListener('pointerdown', e => {
      e.preventDefault(); el.setPointerCapture(e.pointerId);
      moved = false; sx = e.clientX; sy = e.clientY;
    });
    el.addEventListener('pointermove', e => {
      if (!el.hasPointerCapture(e.pointerId)) return;
      if (Math.hypot(e.clientX - sx, e.clientY - sy) > 8) moved = true;
      if (!moved) return;
      const r = fieldEl.getBoundingClientRect();
      // магнитная сетка 40px — никакой мелкой моторики
      const x = Math.round((e.clientX - r.left) / 40) * 40;
      const y = Math.round((e.clientY - r.top) / 40) * 40;
      S.island[idx].x = Math.max(3, Math.min(97, x / r.width * 100));
      S.island[idx].y = Math.max(5, Math.min(95, y / r.height * 100));
      el.style.left = S.island[idx].x + '%'; el.style.top = S.island[idx].y + '%';
    });
    el.addEventListener('pointerup', () => { if (moved) save(); });
    el.addEventListener('dblclick', () => { S.island.splice(idx, 1); save(); draw(); });
  }

  fieldEl.addEventListener('click', e => {
    if (!selected || e.target.closest('.st') || e.target.closest('.char')) return;
    const r = fieldEl.getBoundingClientRect();
    const x = Math.round((e.clientX - r.left) / 40) * 40;
    const y = Math.round((e.clientY - r.top) / 40) * 40;
    S.island.push({ id: selected.id, x: x / r.width * 100, y: y / r.height * 100 });
    save(); audio.sfx('pop'); sparkle(fieldEl, 10); draw();
  });

  draw();
}
