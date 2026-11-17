/* Мельница слогов: таблица 5×5 на скорость, 35 секунд,
   комбо-множитель и личный рекорд. Проверка — взрослый/самопроверка. */
import { h, btn, save, S, sparkle } from '../app.js';

export function mount(field, ctx) {
  const table = ctx.tasks.table;
  const cells = [];
  table.cons.forEach(c => table.vows.forEach(v => cells.push(c + v)));
  let idx = 0, score = 0, comboN = 1, seconds = 0, over = false;

  field.innerHTML = '';
  const stat = h('div', 'counters', '🌀 0 · ✖️1');
  const bar = h('div', 'timerbar'); const fill = h('i'); fill.style.width = '100%'; bar.append(fill);
  const grid = h('div', 'mill');
  const btns = cells.map((s, i) => {
    const b = h('button', i === 0 ? 'cur' : '', s);
    b.addEventListener('click', () => { if (i === idx && !over) hit(true); });
    grid.append(b); return b;
  });
  field.append(h('div', 'hintline', 'Читай выделенный слог! Взрослый жмёт «получилось» или сам слог.'), stat, bar, grid);
  ctx.setTarget(cells[0]);

  const timer = setInterval(() => {
    seconds++;
    fill.style.width = Math.max(0, 100 - seconds / 35 * 100) + '%';
    if (seconds >= 35) end();
  }, 1000);
  ctx.later(() => {}, 0);

  function hit(ok) {
    if (over) return;
    const key = 'syl:' + cells[idx];
    ctx.hit({ key }, ok, false);
    if (ok) {
      score += comboN;
      comboN = Math.min(5, comboN + 1);
      btns[idx].classList.add('ok');
    } else comboN = 1;
    btns[idx].classList.remove('cur');
    idx++;
    if (idx >= cells.length) { end(); return; }
    btns[idx].classList.add('cur');
    ctx.setTarget(cells[idx]);
    stat.innerHTML = `🌀 ${score} · ✖️${comboN}`;
  }

  const bar2 = ctx.adultBar(() => hit(true), () => hit(false));
  field.append(bar2);

  function end() {
    if (over) return;
    over = true; clearInterval(timer);
    const pbKey = table.id;
    const pb = S.millPB[pbKey] || 0;
    const isRecord = score > pb;
    if (isRecord) { S.millPB[pbKey] = score; save(); }
    stat.innerHTML = `🌀 ${score}` + (isRecord ? ' 🏆 Новый рекорд!' : ` · рекорд ${Math.max(pb, score)}`);
    if (isRecord) sparkle(grid, 26);
    ctx.later(() => ctx.finish(), 1200);
  }
}
