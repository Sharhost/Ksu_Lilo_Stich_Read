/* Ручной замер скорости для взрослого: незнакомый текст, 60 секунд,
   тап по слову = прочитано, кнопка запинки, затем 2 вопроса картинками. */
import { S, h, btn, nav, topbar, sparkle, save, toast } from '../app.js';
import { renderText, wordCount, wpm, pickMeasureText, saveMeasurement } from '../reading.js';
import { checkSpeedMedals } from '../rewards.js';
import * as audio from '../audio.js';

export function mountMeasure(root) {
  const scr = h('div', 'screen parent');
  scr.append(topbar('⏱️ Замер скорости'));
  const text = pickMeasureText();
  const total = wordCount(text.text);
  let words = 0, errors = 0, seconds = 0, timer = null, running = false, stopped = false;

  const info = h('div', '', 'Незнакомый текст · ' + total + ' слов. Нажимайте на каждое прочитанное слово. Запинка — кнопка «➖». Ребёнок читает вслух 60 секунд.');
  const box = renderText(text.text, { arcs: false, colors: false, stress: false });
  const stat = h('div', 'counters', '📖 0 · ➖ 0 · ⏱️ 60');
  const bar = h('div', 'timerbar'); const fill = h('i'); fill.style.width = '100%'; bar.append(fill);
  const row = h('div', 'row');
  const pearls = h('div', '', '');
  scr.append(info, stat, bar, box, pearls, row);
  root.append(scr);

  box.querySelectorAll('.w').forEach(w => {
    w.addEventListener('click', () => {
      if (!running || w.classList.contains('done')) return;
      w.classList.add('done'); words++;
      pearls.textContent += '🦪';
      audio.sfx('tap'); update();
    });
  });

  const bStart = btn('▶️ Старт', () => {
    if (running || stopped) return;
    running = true; bStart.disabled = true;
    if (audio.isRecording()) audio.stopRecording();
    audio.startRecording();
    timer = setInterval(() => {
      seconds++;
      fill.style.width = Math.max(0, 100 - seconds / 60 * 100) + '%';
      update();
      if (seconds >= 60) stop();
    }, 1000);
  }, 'big lime');
  const bErr = btn('➖ Запинка', () => { if (running) { errors++; audio.sfx('soft'); update(); } }, 'big ghost');
  const bStop = btn('⏹️ Стоп', () => { if (running) stop(); }, 'big coral');
  row.append(bStart, bErr, bStop);

  function update() {
    stat.innerHTML = '📖 ' + words + ' · ➖ ' + errors + ' · ⏱️ ' + Math.max(0, 60 - seconds)
      + ' · <b>' + wpm(words, errors, seconds) + ' сл/мин</b>';
  }

  function stop() {
    running = false; stopped = true;
    clearInterval(timer); audio.stopRecording();
    const speed = wpm(words, errors, Math.max(seconds, 1));
    askQuestions(text, comp => {
      saveMeasurement({ wpm: speed, words, errors, seconds, textId: text.id, comp });
      const medals = checkSpeedMedals();
      sparkle(scr, 30); audio.sfx('reward');
      toast('Записано: ' + speed + ' сл/мин, понимание ' + comp + '/2.' + (medals.length ? ' 🏅 Новая медаль!' : ''), null, null, 8000);
      if (S.goal) nav('finale'); else nav('parent');
    });
  }

  return () => { clearInterval(timer); audio.stopRecording(); };
}

/* 2 вопроса на понимание — варианты картинками, вопрос озвучивается */
export function askQuestions(text, done) {
  let idx = 0, correct = 0;
  const ov = h('div', 'overlay');
  const card = h('div', 'rewardcard');
  ov.append(card); document.body.append(ov);
  const next = () => {
    if (idx >= text.questions.length) { ov.remove(); done(correct); return; }
    const q = text.questions[idx];
    card.innerHTML = '';
    card.append(h('h2', '', q.q));
    audio.speak(q.q, { who: 'lilo' });
    const row = h('div', 'qcards');
    q.options.forEach(o => {
      const b = h('button', 'qcard', o.emoji);
      b.addEventListener('click', () => {
        if (o.ok) { correct++; audio.sfx('ding'); sparkle(b, 14); }
        else audio.sfx('soft'); // без негатива: просто идём дальше
        idx++; setTimeout(next, 350);
      });
      row.append(b);
    });
    card.append(row);
  };
  next();
}
