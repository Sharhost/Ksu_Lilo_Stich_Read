/* Альбом 60 наклеек «Охана» + стена достижений + медали и наряды. */
import { S, h, btn, nav, topbar, save, settings, saveSettingsNow, charEl } from '../app.js';
import { STICKERS, MEDALS, OUTFITS } from '../content/rewards.js';
import { unlockedOutfits } from '../rewards.js';
import * as audio from '../audio.js';

export function mountAlbum(root) {
  const scr = h('div', 'screen');
  scr.append(topbar('📔 Альбом Охана'));
  const tabs = h('div', 'tabs');
  const body = h('div', '');
  const mk = (label, fn) => {
    const b = h('button', '', label);
    b.addEventListener('click', () => {
      audio.sfx('tap');
      tabs.querySelectorAll('button').forEach(x => x.classList.remove('on'));
      b.classList.add('on'); body.innerHTML = ''; fn();
    });
    tabs.append(b); return b;
  };
  const t1 = mk('🌺 Наклейки', pageStickers);
  mk('🏅 Медали', pageMedals);
  mk('👗 Наряды', pageOutfits);
  mk('📸 Я расту!', pageWall);
  scr.append(tabs, body);
  root.append(scr);
  t1.click();
}

let page = 0;
function pageStickers() {
  const body = document.querySelector('.screen > div:last-child');
  const owned = Object.keys(S.stickers).length;
  body.append(h('div', 'counters', `Собрано: ${owned} из ${STICKERS.length}`));
  const grid = h('div', 'grid');
  const per = 20, pages = Math.ceil(STICKERS.length / per);
  page = Math.min(page, pages - 1);
  STICKERS.slice(page * per, page * per + per).forEach(st => {
    const has = !!S.stickers[st.id];
    grid.append(h('div', 'cell' + (has ? '' : ' off'), `${st.emoji}<small>${has ? st.name : '???'}</small>`));
  });
  body.append(grid);
  const row = h('div', 'row');
  row.append(btn('⬅️', () => { page = (page + pages - 1) % pages; refresh(); }, 'iconbtn'));
  row.append(h('div', '', `Страница ${page + 1} / ${pages}`));
  row.append(btn('➡️', () => { page = (page + 1) % pages; refresh(); }, 'iconbtn'));
  body.append(row);
  function refresh() { body.innerHTML = ''; pageStickers(); }
}

function pageMedals() {
  const body = document.querySelector('.screen > div:last-child');
  const grid = h('div', 'grid');
  MEDALS.forEach(m => {
    const has = S.medals.includes(m.id);
    grid.append(h('div', 'cell' + (has ? '' : ' off'), `${m.emoji}<small>${m.name}</small>`));
  });
  body.append(grid);
}

function pageOutfits() {
  const body = document.querySelector('.screen > div:last-child');
  body.append(h('div', 'hintline', 'Наряды открываются за опыт ⭐. Выбери — герои наденут их на острове!'));
  const open = unlockedOutfits();
  ['lilo', 'stitch'].forEach(who => {
    body.append(h('h3', '', who === 'lilo' ? '👧 Лило' : '💙 Стич'));
    const row = h('div', 'row');
    row.append(btn('Без наряда', () => { S.outfit[who] = ''; save(); }, S.outfit[who] ? 'big ghost' : 'big teal'));
    OUTFITS.forEach(o => {
      const has = open.includes(o);
      const b = btn(`${o.emoji} ${o.name}` + (has ? '' : ` (⭐${o.xp})`), () => {
        if (has) { S.outfit[who] = o.emoji; save(); pageOutfitsRefresh(); }
      }, S.outfit[who] === o.emoji ? 'big coral' : has ? 'big ghost' : 'big ghost');
      if (!has) b.style.opacity = .55;
      row.append(b);
    });
    body.append(row);
  });
  function pageOutfitsRefresh() { body.innerHTML = ''; pageOutfits(); }
}

/* Стена достижений: «читала 5 → читаю 30» + фото из игры «Фотоаппарат» */
function pageWall() {
  const body = document.querySelector('.screen > div:last-child');
  const ms = S.measurements;
  if (ms.length) {
    const first = ms[0], last = ms[ms.length - 1];
    body.append(h('div', 'rewardcard',
      `<div style="font-size:26px">Я читала <b>${first.wpm}</b> сл/мин → читаю <b>${last.wpm}</b> сл/мин! 🚀</div>`));
  } else body.append(h('div', 'hintline', 'Первый замер скорости появится здесь — попроси взрослого!'));
  if (S.photos.length) {
    body.append(h('h3', '', '📸 Мои фотографии'));
    const grid = h('div', 'grid');
    S.photos.slice(-12).forEach(p => grid.append(h('div', 'cell', p)));
    body.append(grid);
  }
}
