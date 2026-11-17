/* Родительский режим: график и прогноз, проблемные слоги, ручной замер,
   настройки, экспорт/импорт, «позаниматься вместе». */
import { S, settings, h, btn, nav, topbar, save, saveSettingsNow, toast, parentGate, today } from '../app.js';
import { saveSettings, exportJSON, importJSON, loadState, defaultState, getRecordings } from '../storage.js';
import { problemTop } from '../adaptive.js';
import { forecast } from '../reading.js';
import { SPEED_LADDER } from '../content/rewards.js';
import * as audio from '../audio.js';

export function mountParent(root) {
  const scr = h('div', 'screen parent');
  scr.append(topbar('🔒 Родительский режим'));
  const tabs = h('div', 'tabs');
  const body = h('div', '');
  const mk = (label, fn) => {
    const b = h('button', '', label);
    b.addEventListener('click', () => {
      tabs.querySelectorAll('button').forEach(x => x.classList.remove('on'));
      b.classList.add('on'); body.innerHTML = ''; fn();
    });
    tabs.append(b); return b;
  };
  const t1 = mk('📈 Прогресс', pageProgress);
  mk('⏱️ Замер скорости', () => nav('measure'));
  mk('⚙️ Настройки', pageSettings);
  mk('🤝 Вместе сегодня', pageTogether);
  scr.append(tabs, body);
  root.append(scr);
  t1.click();
}

function pageProgress() {
  const body = document.querySelector('.parent > div:last-child');
  body.append(h('h2', '', 'Скорость чтения (слов/мин)'));
  const cv = h('canvas', 'chart'); cv.width = 760; cv.height = 260;
  body.append(cv);
  drawChart(cv);
  const f = forecast();
  const best = Math.max(0, ...S.measurements.map(m => m.wpm));
  body.append(h('div', '', `Лучший результат: <b>${best}</b> сл/мин. Лестница: ${SPEED_LADDER.join(' → ')} → <b>40</b>.`));
  body.append(h('div', '', f && f.days !== null
    ? `📅 Прогноз при текущем темпе: 40 сл/мин примерно через <b>${f.days}</b> дн.`
    : '📅 Прогноз появится после 2–3 замеров.'));
  if (S.goal) body.append(h('div', '', '🏆 Цель достигнута! Диплом доступен на карте.'));

  body.append(h('h2', '', 'Проблемные слоги и слова (топ-10)'));
  const tbl = h('table', '', '<tr><th>Элемент</th><th>Точность</th><th>Попыток</th><th>Реакция</th></tr>');
  problemTop(10).forEach(p => {
    tbl.append(h('tr', '', `<td>${p.key.split(':')[1]}</td><td>${Math.round(p.acc * 100)}%</td><td>${p.n}</td><td>${(p.rt / 1000).toFixed(1)} с</td>`));
  });
  body.append(tbl);

  body.append(h('h2', '', 'Время в игре по дням'));
  const days = Object.entries(S.timeByDay).slice(-7);
  body.append(h('div', '', days.map(([d, s]) => `${d.slice(5)}: ${Math.round(s / 60)} мин`).join(' · ') || 'Пока нет данных'));
  body.append(h('div', '', `Пройдено текстов: ${S.textsRead.length} из 15. Уровней: ${Object.keys(S.progress.levels).length}.`));

  body.append(h('h2', '', 'Записи голоса'));
  const recBtn = btn('🎧 Послушать последние записи', async () => {
    const recs = await getRecordings();
    if (!recs.length) { toast('Записей пока нет (включите микрофон в настройках).'); return; }
    const last = recs[recs.length - 1];
    const a = new Audio(URL.createObjectURL(last.blob));
    a.play().catch(() => toast('Не удалось воспроизвести запись.'));
  }, 'big ghost');
  body.append(recBtn);
}

function drawChart(cv) {
  const g = cv.getContext('2d');
  const W = cv.width, H = cv.height, pad = 36;
  g.clearRect(0, 0, W, H);
  g.strokeStyle = '#e4dcc4'; g.fillStyle = '#6b7f8e'; g.font = '13px sans-serif';
  // сетка лестницы 10..40
  for (let v = 0; v <= 45; v += 5) {
    const y = H - pad - (v / 45) * (H - pad * 2);
    g.beginPath(); g.moveTo(pad, y); g.lineTo(W - 10, y); g.stroke();
    g.fillText(String(v), 6, y + 4);
  }
  const y40 = H - pad - (40 / 45) * (H - pad * 2);
  g.strokeStyle = '#ff6f61'; g.setLineDash([6, 4]);
  g.beginPath(); g.moveTo(pad, y40); g.lineTo(W - 10, y40); g.stroke(); g.setLineDash([]);
  g.fillText('цель 40', W - 70, y40 - 6);
  const ms = S.measurements;
  if (!ms.length) { g.fillText('Замеров пока нет — сделайте первый!', pad + 10, H / 2); return; }
  const t0 = ms[0].date, t1 = Math.max(ms[ms.length - 1].date, t0 + 864e5);
  g.strokeStyle = '#0fb5ba'; g.lineWidth = 3; g.beginPath();
  ms.forEach((m, i) => {
    const x = pad + (m.date - t0) / (t1 - t0) * (W - pad - 20);
    const y = H - pad - (Math.min(m.wpm, 45) / 45) * (H - pad * 2);
    i ? g.lineTo(x, y) : g.moveTo(x, y);
  });
  g.stroke(); g.lineWidth = 1;
  ms.forEach(m => {
    const x = pad + (m.date - t0) / (t1 - t0) * (W - pad - 20);
    const y = H - pad - (Math.min(m.wpm, 45) / 45) * (H - pad * 2);
    g.fillStyle = '#0a7f83'; g.beginPath(); g.arc(x, y, 5, 0, 7); g.fill();
    g.fillStyle = '#6b7f8e';
    g.fillText(new Date(m.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }), x - 14, H - 10);
  });
}

function pageSettings() {
  const body = document.querySelector('.parent > div:last-child');
  const mkRange = (label, key, min, max, step) => {
    const l = h('label', '', `<span style="min-width:220px">${label}</span>`);
    const r = h('input'); r.type = 'range'; r.min = min; r.max = max; r.step = step; r.value = settings[key];
    const v = h('span', '', String(settings[key]));
    r.addEventListener('input', () => { settings[key] = parseFloat(r.value); v.textContent = r.value; saveSettingsNow(); });
    l.append(r, v); body.append(l);
  };
  const mkCheck = (label, key, extra) => {
    const l = h('label', '', `<span style="min-width:220px">${label}</span>`);
    const c = h('input'); c.type = 'checkbox'; c.checked = settings[key];
    c.addEventListener('change', () => { settings[key] = c.checked; saveSettingsNow(); extra && extra(); });
    l.append(c); body.append(l);
  };
  body.append(h('h2', '', 'Профиль'));
  const nameRow = h('label', '', '<span style="min-width:220px">Имя ребёнка</span>');
  const nameIn = h('input'); nameIn.type = 'text'; nameIn.value = S.profile.name;
  nameIn.addEventListener('change', () => { S.profile.name = nameIn.value.trim() || 'Ксюша'; save(); });
  nameRow.append(nameIn); body.append(nameRow);
  [['formT', 'Ласково (Ксюшенька)'], ['formS', 'Коротко (Ксюш)']].forEach(([k, label]) => {
    const l = h('label', '', `<span style="min-width:220px">${label}</span>`);
    const i = h('input'); i.type = 'text'; i.value = S.profile[k];
    i.addEventListener('change', () => { S.profile[k] = i.value.trim() || S.profile.name; save(); });
    l.append(i); body.append(l);
  });

  body.append(h('h2', '', 'Звук'));
  mkCheck('Весь звук', 'sound');
  mkCheck('Фоновая музыка (укулеле)', 'music', () => { settings.music ? audio.startMusic() : audio.stopMusic(); });
  mkRange('Громкость голоса', 'voiceVol', 0, 1, 0.05);
  mkRange('Громкость музыки', 'musicVol', 0, 1, 0.05);
  mkRange('Громкость эффектов', 'sfxVol', 0, 1, 0.05);
  mkRange('Скорость речи', 'rate', 0.6, 1.3, 0.05);
  const test = btn('🔊 Проверить голос', () => audio.speak(`${S.profile.name}, привет! Это Лило.`, { who: 'lilo' }), 'big ghost');
  body.append(test);
  if (!audio.hasRuVoice()) body.append(h('div', 'hintline', '⚠️ Русский TTS не найден. Установите русский голос в системе (iOS: Настройки → Универсальный доступ → Устный контент → Голоса). Пока игра работает в режиме «читает взрослый».'));

  body.append(h('h2', '', 'Методика и подсказки'));
  mkCheck('Слоговые дуги', 'arcs');
  mkCheck('Знак ударения', 'stress');
  mkCheck('Цвет слогов', 'colors');
  mkCheck('Режим «только слоги» (без слов)', 'syllOnly');
  mkRange('Длина сессии, мин', 'sessionMin', 5, 25, 1);
  const fs = h('label', '', '<span style="min-width:220px">Форс-ступень (0 = авто)</span>');
  const sel = h('select');
  ['0', '1', '2', '3', '4', '5', '6'].forEach(v => {
    const o = h('option', '', v === '0' ? 'Авто' : 'Зона ' + v); o.value = v;
    if (String(settings.forceStage) === v) o.selected = true;
    sel.append(o);
  });
  sel.addEventListener('change', () => {
    settings.forceStage = parseInt(sel.value); saveSettingsNow();
    if (settings.forceStage > 0) { S.progress.current = { zone: settings.forceStage, level: 1 }; save(); toast('Ступень выбрана принудительно. Зона открыта на карте.'); }
  });
  fs.append(sel); body.append(fs);
  if (settings.forceStage > 0) {
    // форс-режим открывает выбранную зону, не ломая статистику
    S.progress.zoneAcc[settings.forceStage - 1] = S.progress.zoneAcc[settings.forceStage - 1] || { ok: 2, n: 2 };
    save();
  }

  body.append(h('h2', '', 'Комфорт'));
  mkCheck('Спокойные анимации', 'calm');
  mkCheck('Крупный шрифт', 'big');
  mkCheck('Разрешить микрофон и запись голоса', 'mic');
  mkCheck('Бонус: распознавание речи (не блокирует)', 'recognition');

  body.append(h('h2', '', 'Данные'));
  const row = h('div', 'row');
  row.append(btn('💾 Экспорт JSON', () => exportJSON(S, settings), 'big ghost'));
  const file = h('input'); file.type = 'file'; file.accept = '.json'; file.style.display = 'none';
  file.addEventListener('change', async () => {
    try {
      const data = await importJSON(file.files[0]);
      Object.assign(S, data.state);
      Object.assign(settings, data.settings || {});
      save(); saveSettingsNow(); toast('Прогресс загружен!'); nav('parent');
    } catch { toast('Не удалось прочитать файл прогресса.'); }
  });
  row.append(btn('📂 Импорт JSON', () => file.click(), 'big ghost'), file);
  row.append(btn('🗑️ Сбросить прогресс', () => parentGate(() => {
    if (confirm('Точно удалить весь прогресс? Это действие нельзя отменить.')) {
      Object.assign(S, defaultState()); save(); toast('Прогресс сброшен.'); nav('map');
    }
  }), 'big coral'));
  body.append(row);
}

function pageTogether() {
  const body = document.querySelector('.parent > div:last-child');
  const top = problemTop(3).map(p => p.key.split(':')[1]);
  const best = Math.max(0, ...S.measurements.map(m => m.wpm));
  const tips = [
    top.length ? `1. Сегодня 5 минут «дорожки»: тяните вместе ${top.slice(0, 3).join(', ')} — м-м-ааа → МА.` : '1. Сегодня 5 минут «дорожки»: тяните слоги вместе — м-м-ааа → МА.',
    '2. Один короткий текст прочитайте 3 раза: сначала вы, потом вместе, потом она сама. Хвалите за старание.',
    best ? `3. В конце — весёлый замер на 60 секунд. Сейчас рекорд ${best} сл/мин, побейте его вместе!` : '3. В конце — первый замер на 60 секунд: просто слушайте и отмечайте слова тапом.'
  ];
  body.append(h('h2', '', '🤝 Позаниматься вместе — план на сегодня'));
  tips.forEach(t => body.append(h('p', '', t)));
  body.append(btn('⏱️ Перейти к замеру', () => nav('measure'), 'big teal'));
  body.append(h('p', 'hintline', 'Главное правило: не произносите слово раньше ребёнка — пусть сначала попробует сама. Хвалите усилие, а не «умность».'));
}
