/* Ступень 1: слияние слога. «Дорожка»: согласная едет к гласной,
   звуки тянутся и сливаются м-м-м-ааа → МА. Демо — только после попытки. */
import { h, btn, settings, sparkle } from '../app.js';

export function mount(field, ctx) {
  let i = 0;
  const tasks = ctx.tasks;

  function round() {
    if (i >= tasks.length) { ctx.finish(); return; }
    const item = tasks[i];
    const syl = item.text;
    const cons = syl[0], vow = syl.slice(1);
    field.innerHTML = '';
    ctx.setTarget(syl);

    const road = h('div', 'road');
    const mover = h('div', 'sylcard mover', cons);
    const track = h('div', 'track');
    const vowel = h('div', 'sylcard', vow);
    const merged = h('div', 'merged', syl.toUpperCase());
    road.append(mover, track, vowel, h('div', '', '&nbsp;&nbsp;'), merged);
    field.append(h('div', 'hintline', 'Прочитай слог: согласная едет к гласной!'), road);

    const demo = (afterAttempt) => {
      road.classList.remove('go'); void road.offsetWidth;
      road.classList.add('go');
      // тянем звуки: медленно «м… а», затем слитно «ма»
      ctx.audio.speak(`${cons}… ${vow}`, { who: 'lilo', slow: true, onEnd: () => {
        ctx.audio.speak(syl, { who: 'lilo' });
      } });
    };

    const bar = ctx.adultBar(
      () => { // получилось: подкрепляем слиянием ПОСЛЕ попытки
        ctx.hit(item, true);
        demo(true);
        sparkle(road, 16);
        ctx.later(() => { i++; round(); }, 1900);
      },
      () => { // помогли: показываем дорожку вместе
        ctx.hit(item, false, true);
        demo(false);
        ctx.later(() => { i++; round(); }, 2300);
      }
    );
    const help = ctx.helpBtn(() => demo(false));
    const row = h('div', 'row'); row.append(help);
    field.append(bar, row);
  }
  round();
}
