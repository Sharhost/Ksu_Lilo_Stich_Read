/* Звук: TTS ru-RU (Лило/Стич), WebAudio-SFX, генеративное укулеле,
   запись голоса и необязательное распознавание. Всё без внешних файлов. */
import { settings } from './app.js';
import { addRecording } from './storage.js';

let ctx = null, sfxGain = null, musicGain = null, unlocked = false;
let ruVoice = null, voicesReady = false, musicTimer = null;

/* --- Разблокировка звука по первому тапу (iOS) --- */
export function unlock() {
  if (unlocked) return;
  unlocked = true;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    sfxGain = ctx.createGain(); sfxGain.connect(ctx.destination);
    musicGain = ctx.createGain(); musicGain.connect(ctx.destination);
    applyVolumes();
    if (ctx.state === 'suspended') ctx.resume();
    if (settings.music) startMusic();
  } catch { /* без WebAudio игра всё равно работает */ }
  initVoices();
}

export function applyVolumes() {
  if (!ctx) return;
  sfxGain.gain.value = settings.sound ? settings.sfxVol : 0;
  musicGain.gain.value = (settings.sound && settings.music) ? settings.musicVol : 0;
}

/* --- TTS --- */
function initVoices() {
  if (!('speechSynthesis' in window)) return;
  const pickVoice = () => {
    const vs = speechSynthesis.getVoices().filter(v => v.lang && v.lang.toLowerCase().startsWith('ru'));
    if (vs.length) {
      // женский голос предпочтительнее для Лило
      ruVoice = vs.find(v => /milena|katya|alena|irina|svetlana|google/i.test(v.name)) || vs[0];
      voicesReady = true;
    }
  };
  pickVoice();
  speechSynthesis.onvoiceschanged = pickVoice;
  setTimeout(pickVoice, 1500);
}
export function hasRuVoice() { return voicesReady && !!ruVoice; }

let fallbackTimers = [];
function clearFallback() { fallbackTimers.forEach(clearTimeout); fallbackTimers = []; }

/* speak(text, {who:'lilo'|'stitch', onWord(i), onEnd, slow})
   Подсветка: onboundary; если событий нет — оценка по слогам. */
export function speak(text, opts = {}) {
  cancelSpeech();
  if (!settings.sound || !('speechSynthesis' in window) || !ruVoice) {
    // Режим «читает взрослый»: сразу даём fallback-подсветку и завершаем
    fallbackHighlight(text, opts);
    return;
  }
  const u = new SpeechSynthesisUtterance(text);
  u.voice = ruVoice; u.lang = 'ru-RU';
  const base = settings.rate * (opts.slow ? 0.65 : 1);
  if (opts.who === 'stitch') { u.pitch = 1.4; u.rate = 1.05 * base; }
  else { u.pitch = 1.05; u.rate = 0.9 * base; }
  u.volume = settings.voiceVol;

  // offsets слов для подсветки
  const words = [...text.matchAll(/\S+/g)].map(m => ({ start: m.index, end: m.index + m[0].length }));
  let gotBoundary = false, ended = false;
  const finish = () => { if (ended) return; ended = true; clearFallback(); opts.onEnd && opts.onEnd(); };
  u.onboundary = e => {
    gotBoundary = true;
    const i = words.findIndex(w => e.charIndex >= w.start && e.charIndex < w.end);
    if (i >= 0 && opts.onWord) opts.onWord(i);
  };
  u.onend = finish; u.onerror = finish;
  try { speechSynthesis.speak(u); } catch { fallbackHighlight(text, opts); return; }
  // fallback, если boundary не приходит (некоторые движки)
  fallbackTimers.push(setTimeout(() => { if (!gotBoundary && !ended) fallbackHighlight(text, opts, true); }, 450));
}

function fallbackHighlight(text, opts, keepSpeech = false) {
  const words = text.match(/\S+/g) || [];
  const rate = settings.rate * (opts.who === 'stitch' ? 1.05 : 0.9);
  let t = keepSpeech ? 0 : 150;
  words.forEach((w, i) => {
    const syl = (w.match(/[аеёиоуыэюя]/gi) || [w]).length;
    const dur = (syl * 190 + 140) / rate;
    fallbackTimers.push(setTimeout(() => opts.onWord && opts.onWord(i), t));
    t += dur;
  });
  if (!keepSpeech) fallbackTimers.push(setTimeout(() => opts.onEnd && opts.onEnd(), t + 100));
}

export function cancelSpeech() {
  clearFallback();
  if ('speechSynthesis' in window) { try { speechSynthesis.cancel(); } catch {} }
}

/* --- SFX: синтез --- */
function tone(freq, dur, type = 'sine', vol = 0.5, when = 0, slideTo = null) {
  if (!ctx || !settings.sound) return;
  const t = ctx.currentTime + when;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(sfxGain);
  o.start(t); o.stop(t + dur + 0.05);
}
function noise(dur, vol = 0.3, when = 0, freq = 1200) {
  if (!ctx || !settings.sound) return;
  const t = ctx.currentTime + when;
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource(); src.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq;
  const g = ctx.createGain(); g.gain.value = vol;
  src.connect(f); f.connect(g); g.connect(sfxGain);
  src.start(t);
}
export function sfx(name) {
  if (!ctx || !settings.sound) return;
  switch (name) {
    case 'tap': tone(620, 0.07, 'triangle', 0.25); break;
    case 'ding': tone(880, 0.12, 'sine', 0.4); tone(1320, 0.18, 'sine', 0.35, 0.07); break;
    case 'combo': [660, 880, 1100, 1320].forEach((f, i) => tone(f, 0.1, 'triangle', 0.3, i * 0.06)); break;
    case 'pop': noise(0.12, 0.4, 0, 900); tone(300, 0.1, 'square', 0.15, 0, 120); break;
    case 'reward': [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, 'triangle', 0.35, i * 0.12)); break;
    case 'finale': [523, 659, 784, 1046, 1318, 1568].forEach((f, i) => tone(f, 0.3, 'triangle', 0.35, i * 0.14)); break;
    case 'laser': tone(1400, 0.22, 'sawtooth', 0.25, 0, 220); break;
    case 'splash': noise(0.35, 0.3, 0, 600); break;
    case 'munch': tone(160, 0.09, 'square', 0.25); tone(120, 0.09, 'square', 0.25, 0.12); break;
    case 'shutter': noise(0.05, 0.35, 0, 2500); tone(1000, 0.05, 'square', 0.15, 0.05); break;
    case 'soft': tone(440, 0.15, 'sine', 0.2); tone(520, 0.15, 'sine', 0.18, 0.1); break; // мягкий «почти»
  }
}

/* --- Генеративное укулеле: тихий луп C–Am–F–G --- */
const CHORDS = [[261.6, 329.6, 392, 523.2], [220, 261.6, 329.6, 440], [174.6, 220, 261.6, 349.2], [196, 246.9, 293.7, 392]];
const PENTA = [523.2, 587.3, 659.3, 784, 880];
let beat = 0;
function pluck(freq, when, vol) {
  const t = ctx.currentTime + when;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'triangle'; o.frequency.value = freq * (1 + (Math.random() - 0.5) * 0.004);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
  o.connect(g); g.connect(musicGain);
  o.start(t); o.stop(t + 0.6);
}
export function startMusic() {
  if (!ctx || musicTimer) return;
  const step = () => {
    if (!settings.sound || !settings.music) return;
    const chord = CHORDS[Math.floor(beat / 8) % 4];
    const b = beat % 8;
    if (b === 0) pluck(chord[0] / 2, 0, 0.5);
    if (b % 2 === 0) chord.slice(1).forEach((f, i) => pluck(f, i * 0.03, 0.22));
    if (b % 2 === 1 && Math.random() < 0.35) pluck(PENTA[Math.floor(Math.random() * PENTA.length)], 0.05, 0.16);
    beat++;
  };
  musicTimer = setInterval(step, 326); // ~92 bpm, восьмые
}
export function stopMusic() { clearInterval(musicTimer); musicTimer = null; }

/* --- Запись голоса ребёнка (только с согласия в настройках) --- */
let recorder = null, chunks = [];
export async function startRecording() {
  if (!settings.mic || recorder) return false;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    chunks = [];
    recorder = new MediaRecorder(stream);
    recorder.ondataavailable = e => chunks.push(e.data);
    recorder.onstop = async () => {
      stream.getTracks().forEach(t => t.stop());
      await addRecording(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }));
      recorder = null;
    };
    recorder.start();
    return true;
  } catch { recorder = null; return false; }
}
export function stopRecording() { if (recorder && recorder.state !== 'inactive') recorder.stop(); }
export function isRecording() { return !!recorder; }

/* --- Распознавание речи: только бонус, никогда не блокирует --- */
export function recognitionAvailable() {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}
export function listenOnce(target, onMatch) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR || !settings.recognition || !settings.mic) return () => {};
  try {
    const r = new SR();
    r.lang = 'ru-RU'; r.interimResults = false; r.maxAlternatives = 3;
    const norm = s => s.toLowerCase().replace(/ё/g, 'е').replace(/[^а-я]/g, '');
    const want = norm(target);
    r.onresult = e => {
      for (const res of e.results) for (const alt of res)
        if (norm(alt.transcript).includes(want)) { onMatch(); break; }
    };
    r.onerror = () => {}; // тишина/ошибка — просто ничего не происходит
    r.start();
    const stop = setTimeout(() => { try { r.stop(); } catch {} }, 5000);
    return () => { clearTimeout(stop); try { r.stop(); } catch {} };
  } catch { return () => {}; }
}
