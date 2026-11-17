/* Космический тир: прочитай слово вслух — выстрел!
   Основа — тап взрослого; распознавание речи — необязательный бонус. */
import { h, btn, settings, sparkle, charSVG } from '../app.js';
import { renderWord } from '../reading.js';

export function mount(field, ctx) {
  let i = 0, stopListen = null;
  const tasks = ctx.tasks;

  function round() {
    if (stopListen) { stopListen(); stopListen = null; }
    if (i >= tasks.length) { ctx.finish(); return; }
    const item = tasks[i];
    field.innerHTML = '';
    ctx.setTarget(item.text);

    const sky = h('div', 'sea');
    sky.style.background = 'linear-gradient(180deg,#1d2a52,#3b2b63)';
    const ship = h('div', 'surfer', charSVG('stitch', 'happy'));
    ship.style.bottom = '10px';
    const asteroid = h('div', '');
    asteroid.style.cssText = 'position:absolute;right:14%;top:24px;display:flex;flex-direction:column;align-items:center;transition:transform .3s,opacity .3s';
    asteroid.append(h('div', '', '☄️'), renderWord(item));
    sky.append(ship, asteroid);
    field.append(h('div', 'hintline', 'Прочитай слово на астероиде — Стич выстрелит!'), sky);

    const shoot = (ok, help) => {
      if (stopListen) { stopListen(); stopListen = null; }
      ctx.hit(item, ok, help);
      if (ok) {
        ctx.audio.sfx('laser');
        asteroid.style.transform = 'scale(1.4)';
        asteroid.style.opacity = '0';
        sparkle(asteroid, 22);
        ctx.audio.speak(item.text, { who: 'stitch' });
      }
      ctx.later(() => { i++; round(); }, ok ? 1100 : 1500);
    };

    const bar = ctx.adultBar(() => shoot(true, false), () => {
      ctx.audio.speak(item.text, { who: 'lilo', slow: true });
      shoot(false, true);
    });
    field.append(bar);
    const row = h('div', 'row');
    row.append(ctx.helpBtn(() => ctx.audio.speak(item.text, { who: 'lilo', slow: true })));
    if (settings.recognition && settings.mic && ctx.audio.recognitionAvailable()) {
      const mic = btn('🎤 Бонус: скажи слово', () => {
        stopListen = ctx.audio.listenOnce(item.text, () => { shoot(true, false); });
      }, 'big ghost');
      row.append(mic);
    }
    field.append(row);
  }
  round();
}
