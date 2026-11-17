/* Читай-караоке: подсветка синхронно с голосом, эхо-чтение,
   3 повторного чтения с ракетами роста скорости, 2 вопроса картинками. */
import { h, btn, settings, S, save, sparkle } from '../app.js';
import { renderText, wordCount, wpm } from '../reading.js';
import { askQuestions } from '../screens/measure.js';

export function mount(field, ctx) {
  const { mode, item } = ctx.tasks;
  const text = item.text;
  const total = wordCount(text);
  const speeds = [];
  let rep = 0;

  function showRound() {
    field.innerHTML = '';
    const box = renderText(text);
    const wordEls = [...box.querySelectorAll('.w')];
    const rockets = h('div', 'rockets');
    drawRockets(rockets);
    const echo = rep === 0; // первый раз — эхо-чтение
    field.append(
      h('div', 'hintline', echo
        ? 'Сначала послушай Лило, повтори за ней — потом читай сама!'
        : `Чтение ${rep + 1} из 3 — читай сама, взрослый отметит время!`),
      box, rockets
    );
    ctx.setTarget(''); // текст целиком не озвучиваем до попытки, кроме эхо-режима

    const row = h('div', 'row');
    if (echo) {
      row.append(btn('🔊 Эхо: слушай Лило', () => {
        ctx.audio.speak(text, {
          who: 'lilo',
          onWord: i => {
            wordEls.forEach(w => w.classList.remove('hl'));
            if (wordEls[i]) wordEls[i].classList.add('hl');
          },
          onEnd: () => wordEls.forEach(w => w.classList.remove('hl'))
        });
      }, 'big teal'));
    }
    let reading = false, t0 = 0, readTimer = null;
    const bRead = btn('📖 Читаю!', () => {
      if (reading) return;
      reading = true; t0 = Date.now();
      ctx.audio.cancelSpeech();
      ctx.audio.startRecording();
      bRead.textContent = '✅ Прочитала!';
      // лёгкая подсветка-«водитель» взгляда слева-направо во время чтения ребёнка
      let wi = 0;
      readTimer = setInterval(() => {
        wordEls.forEach(w => w.classList.remove('hl'));
        if (wordEls[wi]) wordEls[wi].classList.add('hl');
        wi = Math.min(wi + 1, wordEls.length - 1);
      }, 900 / settings.rate);
    }, 'big coral');
    const bDone = btn('✅ Прочитала!', () => {
      if (!reading) { bRead.click(); return; }
      reading = false;
      clearInterval(readTimer);
      ctx.audio.stopRecording();
      wordEls.forEach(w => { w.classList.remove('hl'); w.classList.add('done'); });
      const sec = (Date.now() - t0) / 1000;
      const speed = wpm(total, 0, sec);
      speeds.push(speed);
      ctx.hit({ key: (mode === 'text' ? 't:' : 's:') + item.id }, true);
      drawRockets(rockets);
      sparkle(rockets, 14);
      rep++;
      ctx.later(() => {
        if (rep < 3) showRound();
        else finishText();
      }, 1200);
    }, 'big lime');
    bDone.id = 'adult-ok'; // пробел/Enter тоже работают
    row.append(bRead, bDone);
    if (settings.mic) row.append(h('div', 'hintline', '🎙️ Запись включится автоматически'));
    field.append(row);
  }

  function drawRockets(el) {
    el.innerHTML = '';
    const max = Math.max(30, ...speeds);
    speeds.forEach((s, i) => {
      const r = h('div', 'rocket');
      const barEl = h('div', 'bar');
      barEl.style.height = Math.max(10, s / max * 100) + 'px';
      r.append(h('div', '', '🚀'), barEl, h('div', '', `${s} сл/мин`));
      el.append(r);
    });
    if (!speeds.length) el.append(h('div', 'hintline', 'Здесь появятся ракеты твоей скорости!'));
  }

  function finishText() {
    if (mode === 'text') {
      if (!S.textsRead.includes(item.id)) { S.textsRead.push(item.id); save(); }
      askQuestions(item, correct => {
        ctx.hit({ key: 't:' + item.id + ':q' }, correct >= 1);
        ctx.finish();
      });
    } else ctx.finish();
  }

  showRound();
}
