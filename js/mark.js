// the Z mark as points: sampled once from the favicon (same origin, so the pixels are readable)
let cache = null;
export function markMask(n = 64) {
  if (cache && cache.n === n) return Promise.resolve(cache);
  return new Promise(res => {
    const im = new Image(); im.src = '/img/fav-512.png';
    im.onload = () => {
      const c = document.createElement('canvas'); c.width = c.height = n; const x = c.getContext('2d', { willReadFrequently: true });
      x.drawImage(im, 0, 0, n, n); const d = x.getImageData(0, 0, n, n).data; const m = new Uint8Array(n * n);
      for (let i = 0; i < n * n; i++) m[i] = d[i * 4 + 3] > 110 ? 1 : 0;
      cache = { n, m }; res(cache);
    };
    im.onerror = () => res({ n, m: new Uint8Array(n * n) });
  });
}
