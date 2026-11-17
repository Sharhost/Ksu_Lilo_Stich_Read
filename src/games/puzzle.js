/* Собери слово: пазл из слогов. Тап-выбор + перетаскивание
   с магнитным прилипанием к ближайшему слоту. */
import { h, shuffle, sparkle } from '../app.js';

export function mount(field, ctx) {
  let i = 0;
  const tasks = ctx.tasks;

  function round() {
    if (i >= tasks.length) { ctx.finish(); return; }
    const item = tasks[i];
    let placed = 0, selected = null, misses = 0;
    field.innerHTML = '';
    ctx.setTarget(item.text);

    const pic = h('div', '', item.emoji); pic.style.fontSize = '64px';
    const slots = h('div', 'slots');
    const tiles = h('div', 'tiles');
    field.append(h('div', 'hintline', 'Собери слово из слогов: нажми слог, потом место — или перетащи!'), pic, slots, tiles);

    const slotEls = item.syllables.map((s, idx) => {
      const el = h('div', 'slot', '');
      el.dataset.idx = idx;
      el.addEventListener('click', () => { if (selected) tryPlace(selected, el); });
      slots.append(el);
      return el;
    });

    function tryPlace(tile, slot) {
      const idx = parseInt(slot.dataset.idx);
      if (slot.textContent) return;
      if (parseInt(tile.dataset.idx) === idx) {
        slot.textContent = tile.textContent;
        tile.classList.add('gone');
        selected = null;
        ctx.audio.sfx('ding');
        placed++;
        if (placed === item.syllables.length) {
          ctx.hit(item, true);
          sparkle(slots, 18);
          ctx.audio.speak(item.text, { who: 'lilo' }); // после сборки — можно
          ctx.later(() => { i++; round(); }, 1300);
        }
      } else {
        ctx.hit(item, false);
        misses++;
        tile.classList.remove('sel'); selected = null;
        slot.classList.add('wobble'); setTimeout(() => slot.classList.remove('wobble'), 350);
        if (misses >= 2) slotEls[placed].classList.add('glow');
      }
    }

    shuffle(item.syllables.map((s, idx) => ({ s, idx }))).forEach(({ s, idx }) => {
      const t = h('button', 'tile', s);
      t.dataset.idx = idx;
      t.addEventListener('click', () => {
        tiles.querySelectorAll('.tile').forEach(x => x.classList.remove('sel'));
        t.classList.add('sel'); selected = t;
        ctx.audio.sfx('tap');
      });
      // перетаскивание с магнитом: отпускаем рядом со слотом — прилипает
      t.addEventListener('pointerdown', e => { t.setPointerCapture(e.pointerId); });
      t.addEventListener('pointerup', e => {
        let best = null, bestD = 90;
        slotEls.forEach(sl => {
          const r = sl.getBoundingClientRect();
          const d = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
          if (d < bestD) { bestD = d; best = sl; }
        });
        if (best) tryPlace(t, best);
      });
      tiles.append(t);
    });
    field.append(h('div', 'row', '')).append(ctx.helpBtn(() => ctx.audio.speak(item.syllables.join('… '), { who: 'lilo', slow: true })));
  }
  round();
}
