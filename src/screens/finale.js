/* Финал: «Ксюша читает быстрее Стича!» + диплом PNG с именем. */
import { S, h, btn, nav, topbar, charEl, sparkle, fmt } from '../app.js';
import * as audio from '../audio.js';

export function mountFinale(root) {
  const scr = h('div', 'screen');
  scr.append(topbar('🏆 Финал!'));
  const chars = h('div', 'chars');
  chars.append(charEl('lilo', 'cheer'), charEl('stitch', 'cheer'));
  const best = Math.max(...S.measurements.map(m => m.wpm));
  scr.append(
    h('div', 'bubble', `🎉 <b>${fmt('{n}')} читает быстрее Стича!</b> 🎉<br>${best} слов в минуту — и всё понимает!`),
    chars
  );
  const cv = h('canvas', 'chart'); cv.width = 1200; cv.height = 850;
  drawDiploma(cv, best);
  scr.append(cv);
  const row = h('div', 'row');
  row.append(btn('💾 Скачать диплом (PNG)', () => {
    const a = document.createElement('a');
    a.href = cv.toDataURL('image/png');
    a.download = `diplom-${S.profile.name}.png`;
    a.click();
  }, 'big coral'));
  row.append(btn('🏝️ На карту', () => nav('map'), 'big teal'));
  scr.append(row);
  root.append(scr);
  audio.sfx('finale');
  audio.speak(fmt(`Ура! ${S.profile.name} читает быстрее Стича! ${best} слов в минуту! Охана гордится тобой!`), { who: 'lilo' });
  let bursts = 0;
  const t = setInterval(() => { sparkle(scr, 20); if (++bursts > 5) clearInterval(t); }, 900);
  return () => clearInterval(t);
}

function drawDiploma(cv, best) {
  const g = cv.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 850);
  grad.addColorStop(0, '#c9f2f3'); grad.addColorStop(1, '#fff7e6');
  g.fillStyle = grad; g.fillRect(0, 0, 1200, 850);
  g.strokeStyle = '#0fb5ba'; g.lineWidth = 14;
  roundRect(g, 30, 30, 1140, 790, 40); g.stroke();
  g.strokeStyle = '#ffb347'; g.lineWidth = 4;
  roundRect(g, 52, 52, 1096, 746, 30); g.stroke();
  g.textAlign = 'center'; g.fillStyle = '#0a7f83';
  g.font = 'bold 64px sans-serif'; g.fillText('🌺 ДИПЛОМ ЧТЕЦА ОХАНЫ 🌺', 600, 150);
  g.fillStyle = '#233a4d'; g.font = 'bold 92px sans-serif';
  g.fillText(S.profile.name, 600, 300);
  g.font = '40px sans-serif';
  g.fillText('читает быстрее Стича!', 600, 380);
  g.font = 'bold 120px sans-serif'; g.fillStyle = '#c94f43';
  g.fillText(`${best}`, 600, 540);
  g.font = '36px sans-serif'; g.fillStyle = '#233a4d';
  g.fillText('слов в минуту — с пониманием прочитанного', 600, 600);
  g.font = '30px sans-serif'; g.fillStyle = '#6b7f8e';
  g.fillText(new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }), 600, 680);
  g.font = '60px sans-serif';
  g.fillText('🏄‍♀️ 🌺 💙 🥥 ⭐', 600, 770);
}
function roundRect(g, x, y, w, hh, r) {
  g.beginPath();
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + hh, r); g.arcTo(x + w, y + hh, x, y + hh, r);
  g.arcTo(x, y + hh, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
