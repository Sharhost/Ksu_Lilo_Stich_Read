/* Слоговый сёрфинг: волна-слог плывёт к Стичу, прочитай — и он перепрыгнет.
   Волна ждёт ответа: таймера-провала нет. */
import { h, charSVG, sparkle } from '../app.js';

export function mount(field, ctx) {
  let i = 0;
  const tasks = ctx.tasks;

  function round() {
    if (i >= tasks.length) { ctx.finish(); return; }
    const item = tasks[i];
    field.innerHTML = '';
    ctx.setTarget(item.text);

    const sea = h('div', 'sea');
    const surfer = h('div', 'surfer', charSVG('stitch', 'happy'));
    const wave = h('div', 'wave');
    wave.append(h('div', 'sylcard', item.text));
    sea.append(surfer, wave);
    field.append(h('div', 'hintline', 'Читай слог на волне — Стич прыгнет!'), sea);

    // волна подъезжает и ЖДЁТ у сёрфера
    ctx.later(() => { wave.style.right = '38%'; }, 60);

    const pass = (ok, help) => {
      ctx.hit(item, ok, help);
      if (ok) {
        surfer.classList.add('jump');
        ctx.audio.sfx('splash');
        sparkle(surfer, 14);
      }
      wave.classList.add('pass');
      ctx.later(() => { i++; round(); }, ok ? 900 : 1400);
    };
    field.append(ctx.adultBar(() => pass(true, false), () => {
      ctx.audio.speak(item.text, { who: 'stitch' });
      pass(false, true);
    }));
    field.append(h('div', 'row', '')).append(ctx.helpBtn(() => ctx.audio.speak(item.text, { who: 'lilo', slow: true })));
  }
  round();
}
