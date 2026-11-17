/* Фотоаппарат Лило: в видоискателе НАПИСАННОЕ слово,
   ребёнок читает его и фотографирует нужную картинку. */
import { h, shuffle, rnd, sparkle, save, S } from '../app.js';
import { renderWord } from '../reading.js';

export function mount(field, ctx) {
  let i = 0, misses = 0;
  const tasks = ctx.tasks;
  const isSyl = tasks[0] && tasks[0].kind === 'syl';

  function round() {
    if (i >= tasks.length) { ctx.finish(); return; }
    const item = tasks[i];
    misses = 0;
    field.innerHTML = '';
    ctx.setTarget(item.text);

    const finder = h('div', 'road');
    finder.style.borderColor = '#0fb5ba';
    finder.append(h('div', '', '📷&nbsp;'), isSyl ? h('div', 'sylcard', item.text) : renderWord(item));
    field.append(h('div', 'hintline', 'Прочитай слово в камере и сфотографируй нужную картинку!'), finder);

    const others = shuffle(tasks.filter(t => t.text !== item.text && t.emoji !== item.emoji)).slice(0, 2);
    while (others.length < 2) others.push(tasks[rnd(tasks.length)]);
    const opts = shuffle([item, ...others]);
    const row = h('div', 'choices');
    opts.forEach(o => {
      const b = h('button', 'choice', o.emoji || '🥥');
      b.addEventListener('click', () => {
        if (o.text === item.text) {
          ctx.hit(item, true);
          ctx.audio.sfx('shutter');
          sparkle(b, 16);
          b.style.border = '6px solid #fff';
          if (item.emoji) { S.photos.push(item.emoji); if (S.photos.length > 24) S.photos.shift(); save(); }
          ctx.audio.speak(item.text, { who: 'lilo' });
          ctx.later(() => { i++; round(); }, 1100);
        } else {
          ctx.hit(item, false);
          b.classList.add('wobble'); setTimeout(() => b.classList.remove('wobble'), 350);
          misses++;
          if (misses >= 2) row.querySelectorAll('.choice').forEach(c => { if (c.textContent === item.emoji) c.classList.add('glow'); });
        }
      });
      row.append(b);
    });
    field.append(row);
    field.append(h('div', 'row', '')).append(ctx.helpBtn(() => ctx.audio.speak(item.text, { who: 'lilo', slow: true })));
  }
  round();
}
