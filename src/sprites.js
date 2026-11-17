/* Рисованые персонажи: PNG на малиновом фоне → вырезаем фон на canvas,
   кэшируем. Позы + моргание. Если файла нет — остаётся старый SVG. */
const POSES = {
  lilo: ['idle', 'blink', 'jump', 'coconut'],
  stitch: ['idle', 'blink', 'jump', 'surf']
};
const cache = new Map();   // 'who:pose' → dataURL | null (нет файла)
const loading = new Map();

export function spriteURL(who, pose) {
  const key = who + ':' + pose;
  if (cache.has(key)) return Promise.resolve(cache.get(key));
  if (loading.has(key)) return loading.get(key);
  const p = new Promise(resolve => {
    if (!POSES[who] || !POSES[who].includes(pose)) { cache.set(key, null); resolve(null); return; }
    const img = new Image();
    img.onload = () => {
      try {
        const cv = document.createElement('canvas');
        cv.width = img.width; cv.height = img.height;
        const g = cv.getContext('2d');
        g.drawImage(img, 0, 0);
        const d = g.getImageData(0, 0, cv.width, cv.height);
        const px = d.data;
        for (let i = 0; i < px.length; i += 4) {
          const r = px[i], gg = px[i + 1], b = px[i + 2];
          // малиновый фон: много красного и синего, мало зелёного
          if (r > 150 && b > 150 && gg < 130) {
            const strength = Math.min(r, b) - gg;
            px[i + 3] = strength > 90 ? 0 : Math.max(0, 255 - strength * 3); // мягкий край
          }
        }
        g.putImageData(d, 0, 0);
        const url = cv.toDataURL('image/png');
        cache.set(key, url); resolve(url);
      } catch { cache.set(key, null); resolve(null); }
    };
    img.onerror = () => { cache.set(key, null); resolve(null); };
    img.src = 'assets/chars/' + who + '-' + pose + '.png';
  });
  loading.set(key, p);
  return p;
}

/* Подгружаем основные позы заранее — первый показ без задержки */
export function preloadSprites() {
  for (const who of Object.keys(POSES))
    for (const pose of POSES[who]) spriteURL(who, pose);
}

/* Моргание: раз в 3–5 с герои с открытыми глазами моргают на 160 мс */
let blinkTimer = null;
export function startBlinking(getCharSVG) {
  if (blinkTimer) return;
  const tick = () => {
    document.querySelectorAll('.char[data-pose="idle"]').forEach(async el => {
      const who = el.dataset.who;
      const closed = await spriteURL(who, 'blink');
      const open = await spriteURL(who, 'idle');
      if (!closed || !open || el.dataset.pose !== 'idle') return;
      el.innerHTML = '<img src="' + closed + '" alt="">';
      setTimeout(() => {
        if (el.dataset.pose === 'idle') el.innerHTML = '<img src="' + open + '" alt="">';
      }, 160);
    });
    blinkTimer = setTimeout(tick, 3000 + Math.random() * 2000);
  };
  blinkTimer = setTimeout(tick, 2500);
}
