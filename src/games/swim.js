/* Заплыв за жемчугом: замер скорости в игре. 60 секунд,
   жемчужина за каждое прочитанное слово (тап взрослого по слову). */
import { h, btn, S, save, sparkle } from '../app.js';
import { renderText, wordCount, wpm, saveMeasurement } from '../reading.js';
import { checkSpeedMedals } from '../rewards.js';
import { askQuestions } from '../screens/measure.js';

export function mount(field, ctx) {
  const item = ctx.tasks.item;
  const total = wordCount(item.text);
  let words = 0, errors = 0, seconds = 0, running = false, over = false;

  field.innerHTML = '';
  const stat = h('div', 'counters', `🦪 0 · ⏱️ 60`);
  const bar = h('div', 'timerbar'); const fill = h('i'); fill.style.width = '100%'; bar.append(fill);
  const box = renderText(item.text, { arcs: false, colors: false, stress: false });
  const pearls = h('div', '', ''); pearls.style.fontSize = '26px';
  field.append(h('div', 'hintline', 'Плыви за жемчугом! Читай вслух — взрослый отмечает каждое слово тапом.'), stat, bar, box, pearls);

  box.querySelectorAll('.w').forEach(w => {
    w.addEventListener('click', () => {
      if (!running || over || w.classList.contains('done')) return;
      w.classList.add('done'); words++;
      pearls.textContent += '🦪';
      ctx.audio.sfx('tap');
      update();
    });
  });

  let timer = null;
  const bStart = btn('🏊 Плыву!', () => {
    if (running || over) return;
    running = true;
    ctx.audio.startRecording();
    timer = setInterval(() => {
      seconds++;
      fill.style.width = Math.max(0, 100 - seconds / 60 * 100) + '%';
      update();
      if (seconds >= 60) end();
    }, 1000);
  }, 'big coral');
  const bErr = btn('➖ Запинка', () => { if (running) { errors++; update(); } }, 'big ghost');
  const row = h('div', 'row'); row.append(bStart, bErr);
  field.append(row);

  function update() {
    stat.innerHTML = `🦪 ${words} · ➖ ${errors} · ⏱️ ${Math.max(0, 60 - seconds)} · <b>${wpm(words, errors, seconds)} сл/мин</b>`;
  }

  function end() {
    if (over) return;
    over = true; running = false;
    clearInterval(timer);
    ctx.audio.stopRecording();
    const speed = wpm(words, errors, Math.max(seconds, 1));
    askQuestions(item, comp => {
      saveMeasurement({ wpm: speed, words, errors, seconds, textId: item.id, comp });
      checkSpeedMedals();
      for (let k = 0; k < Math.min(words, 10); k++) ctx.hit({ key: 't:' + item.id }, true);
      sparkle(field, 30);
      ctx.finish();
      if (S.goal) ctx.later(() => {}, 0);
    });
  }
}
