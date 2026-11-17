/* Кокосовый тир: цель — картинка (для слов) или карточка-слог,
   ребёнок ЧИТАЕТ кокосы и лопает нужный. Никакого автоозвучания цели. */
import { h, shuffle, rnd, sparkle } from '../app.js';

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

    // цель: эмодзи слова (читать!) или визуальная карточка слога (поиск глазами)
    const target = h('div', 'sylcard', isSyl ? item.text : item.emoji);
    target.style.fontSize = isSyl ? '52px' : '72px';
    field.append(h('div', 'hintline', isSyl ? 'Найди и лопни такой же слог!' : 'Прочитай кокосы и лопни слово к картинке!'), target);

    const others = shuffle(tasks.filter(t => t.text !== item.text)).slice(0, 3);
    while (others.length < 3) others.push(tasks[rnd(tasks.length)]);
    const opts = shuffle([item, ...others.slice(0, 3)]);
    const row = h('div', 'choices');
    opts.forEach(o => {
      const b = h('button', 'choice', `🥥<small>${o.text}</small>`);
      b.addEventListener('click', () => {
        if (o.text === item.text) {
          ctx.hit(item, true);
          ctx.audio.sfx('pop');
          sparkle(b, 20);
          b.innerHTML = '✨';
          // слово произносится ПОСЛЕ верного прочтения
          ctx.audio.speak(item.text, { who: 'stitch' });
          ctx.later(() => { i++; round(); }, 1100);
        } else {
          ctx.hit(item, false);
          b.classList.add('wobble');
          setTimeout(() => b.classList.remove('wobble'), 350);
          misses++;
          if (misses >= 2) row.querySelectorAll('.choice').forEach(c => {
            if (c.textContent.includes(item.text)) c.classList.add('glow');
          });
        }
      });
      row.append(b);
    });
    field.append(row);
    field.append(h('div', 'row', '')).append(ctx.helpBtn(() => ctx.audio.speak(item.text, { who: 'lilo', slow: true })));
  }
  round();
}
