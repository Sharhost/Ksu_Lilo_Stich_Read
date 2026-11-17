/* Генерация озвучки через Яндекс SpeechKit. Запускается на GitHub Actions.
   Повторный запуск пропускает уже готовые файлы (можно прерывать).
   Имя ребёнка для реплик: по умолчанию Ксюша. */
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { BANK } from '../src/content/lines.js';
import { OPEN_SYLLABLES, CLOSED_SYLLABLES } from '../src/content/syllables.js';
import { WORDS } from '../src/content/words.js';
import { SENTENCES } from '../src/content/sentences.js';
import { TEXTS } from '../src/content/texts.js';

const KEY = process.env.SPEECHKIT_KEY;
if (!KEY) { console.error('Нет ключа SPEECHKIT_KEY'); process.exit(1); }
const NAME = process.env.NAME || 'Ксюша';
const FORM_T = process.env.FORM_T || 'Ксюшенька';
const FORM_S = process.env.FORM_S || 'Ксюш';
const OUT = 'assets/voice';
await mkdir(OUT, { recursive: true });

const fmt = t => t.replaceAll('{n}', NAME).replaceAll('{t}', FORM_T).replaceAll('{s}', FORM_S);

/* Собираем все тексты, которые игра когда-либо произносит */
const texts = new Set();
for (const event of Object.keys(BANK)) for (const l of BANK[event]) texts.add(fmt(l.text));
for (const s of [...OPEN_SYLLABLES, ...CLOSED_SYLLABLES]) texts.add(s);
for (const w of WORDS) { texts.add(w.text); texts.add(w.syllables.join('… ')); }
for (const s of SENTENCES) texts.add(s.text);
for (const t of TEXTS) { texts.add(t.text); for (const q of t.questions) texts.add(q.q); }
[
  'Это наш остров! Нажми на большую стрелку — начнём игру.',
  'Это альбом наклеек Охана! Смотри, какие уже собраны.',
  'Это твой остров! Ставь наклейки, где захочешь.',
  'Ура! Ты читаешь быстрее Стича! Вот твой диплом!',
  'Выбери уровень!', 'Стич устал. Покормим его кокосом?',
  NAME + ', привет! Это Лило.',
  'Ура! ' + NAME + ' читает быстрее Стича! Охана гордится тобой!'
].forEach(t => texts.add(t));

/* Манифест: точный текст → файл. Дописываем существующий */
let manifest = {};
try { manifest = JSON.parse(await readFile(OUT + '/manifest.json', 'utf8')); } catch {}

let i = Object.keys(manifest).length, done = 0, skipped = 0;
const list = [...texts];
for (const text of list) {
  if (manifest[text] && existsSync(OUT + '/' + manifest[text])) { skipped++; continue; }
  const file = 'v' + String(++i).padStart(4, '0') + '.mp3';
  const body = new URLSearchParams({
    text, lang: 'ru-RU', voice: 'alena', emotion: 'good',
    speed: '0.9', format: 'mp3', folderId: process.env.FOLDER_ID || ''
  });
  let ok = false;
  for (let attempt = 0; attempt < 3 && !ok; attempt++) {
    try {
      const res = await fetch('https://tts.api.cloud.yandex.net/speech/v1/tts:synthesize', {
        method: 'POST',
        headers: { Authorization: 'Api-Key ' + KEY },
        body
      });
      if (!res.ok) throw new Error('HTTP ' + res.status + ': ' + (await res.text()).slice(0, 200));
      await writeFile(OUT + '/' + file, Buffer.from(await res.arrayBuffer()));
      manifest[text] = file;
      ok = true; done++;
      console.log('✓', file, text.slice(0, 50));
    } catch (e) {
      console.warn('попытка', attempt + 1, e.message);
      await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
    }
  }
  if (!ok) { console.error('✗ пропущено:', text.slice(0, 60)); i--; }
  await writeFile(OUT + '/manifest.json', JSON.stringify(manifest, null, 1));
  await new Promise(r => setTimeout(r, 120)); // бережём лимиты API
}
console.log('Готово: новых', done, ', уже было', skipped, '. Файлы в', OUT);
