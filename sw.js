/* Service worker: полный офлайн, stale-while-revalidate, безопасное обновление */
const VERSION = 'ksusha-v1.1.0';
const SHELL = [
  './', './index.html', './manifest.webmanifest', './styles/main.css',
  './styles/skin.css',
  './assets/icons/icon.svg', './assets/icons/maskable.svg',
  './src/app.js', './src/audio.js', './src/storage.js', './src/adaptive.js',
  './src/reading.js', './src/rewards.js', './src/sprites.js',
  './src/screens/map.js', './src/screens/level.js', './src/screens/album.js',
  './src/screens/island.js', './src/screens/parent.js', './src/screens/measure.js',
  './src/screens/finale.js',
  './src/games/fusion.js', './src/games/surf.js', './src/games/coconut.js',
  './src/games/jumps.js', './src/games/puzzle.js', './src/games/photo.js',
  './src/games/mill.js', './src/games/karaoke.js', './src/games/swim.js',
  './src/games/space.js',
  './src/content/syllables.js', './src/content/words.js', './src/content/sentences.js',
  './src/content/texts.js', './src/content/lines.js', './src/content/rewards.js',
  './assets/scenes/map.jpg', './assets/scenes/zone1.jpg', './assets/scenes/zone2.jpg',
  './assets/scenes/zone3.jpg', './assets/scenes/zone4.jpg', './assets/scenes/zone5.jpg',
  './assets/scenes/zone6.jpg',
  './assets/ui/woodpack.jpg',
  './assets/chars/lilo-idle.png', './assets/chars/lilo-blink.png', './assets/chars/lilo-jump.png',
  './assets/chars/lilo-coconut.png', './assets/chars/stitch-idle.png', './assets/chars/stitch-blink.png',
  './assets/chars/stitch-jump.png', './assets/chars/stitch-surf.png',
  './assets/fonts/nunito-400.woff2', './assets/fonts/nunito-700.woff2', './assets/fonts/nunito-800.woff2'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)));
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VERSION) await caches.delete(k);
    await self.clients.claim();
  })());
});

/* Обновление по кнопке «Обновить игру» — данные в IndexedDB не трогаем */
self.addEventListener('message', e => {
  if (e.data === 'skip-waiting') self.skipWaiting();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const cached = await cache.match(req, { ignoreSearch: true });
    const network = fetch(req).then(res => {
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    }).catch(() => null);
    if (cached) return cached;                     // мгновенно из кэша…
    const fresh = await network;                   // …фоном обновляем
    if (fresh) return fresh;
    if (req.mode === 'navigate') return cache.match('./index.html');
    return Response.error();
  })());
});
