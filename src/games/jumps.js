/* Прыжки Лило: платформы-слоги, собери слово по порядку.
   Лило прыгает по верным слогам, слово звучит после сборки. */
import { h, shuffle, charSVG, sparkle } from '../app.js';

export function mount(field, ctx) {
  let i = 0;
  const tasks = ctx.tasks;

  function round() {
    if (i >= tasks.length) { ctx.finish(); return; }
    const item = tasks[i];
    let next = 0, misses = 0;
    field.innerHTML = '';
    ctx.setTarget(item.text);

    const pic = h('div', '', item.emoji); pic.style.fontSize = '64px';
    const jumper = h('div', 'char', charSVG('lilo', 'happy'));
    jumper.style.width = '80px'; jumper.style.height = '95px';
    const built = h('div', 'readword');
    const plats = h('div', 'plats');
    field.append(h('div', 'hintline', 'Прыгай по слогам по порядку — собери слово!'), pic, jumper, built, plats);

    shuffle(item.syllables.map((s, idx) => ({ s, idx }))).forEach(({ s, idx }) => {
      const b = h('button', 'plat', s);
      b.addEventListener('click', () => {
        if (b.classList.contains('used')) return;
        if (idx === next) {
          b.classList.add('used');
          jumper.classList.remove('cheer'); void jumper.offsetWidth; jumper.classList.add('cheer');
          built.append(h('span', 'syl', s));
          ctx.audio.sfx('ding');
          next++;
          if (next === item.syllables.length) {
            ctx.hit(item, true);
            sparkle(built, 18);
            ctx.audio.speak(item.text, { who: 'lilo' });
            ctx.later(() => { i++; round(); }, 1300);
          }
        } else {
          ctx.hit(item, false);
          b.classList.add('wobble'); setTimeout(() => b.classList.remove('wobble'), 350);
          misses++;
          if (misses >= 2) plats.querySelectorAll('.plat').forEach(p => {
            if (!p.classList.contains('used') && p.textContent === item.syllables[next]) p.classList.add('glow');
          });
        }
      });
      plats.append(b);
    });
    field.append(h('div', 'row', '')).append(ctx.helpBtn(() => ctx.audio.speak(item.syllables.join('… '), { who: 'lilo', slow: true })));
  }
  round();
}
