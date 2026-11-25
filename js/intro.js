// The intro, once per visit and wordless: green dots gather out of the dark into the Z, a scan seals it,
// then the dots fall away into the page. Any key, click, wheel or touch skips it.
import { markMask } from './mark.js';
const html = document.documentElement;
export async function playIntro() {
  const box = document.getElementById('intro');
  if (!html.classList.contains('intro') || !box) { box && box.remove(); return; }
  const cv = document.getElementById('introCv'), ctx = cv.getContext('2d');
  const W = innerWidth, H = innerHeight, dpr = Math.min(1.5, devicePixelRatio || 1); cv.width = W * dpr; cv.height = H * dpr;
  const { n, m } = await markMask(56);
  const S = Math.min(W, H) * 0.42, ox = W / 2 - S / 2, oy = H / 2 - S / 2, cell = S / n, P = [];
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) if (m[j * n + i]) {
    const tx = ox + (i + 0.5) * cell, ty = oy + (j + 0.5) * cell, a = Math.random() * 6.2832, d = Math.max(W, H) * (0.55 + Math.random() * 0.5);
    P.push({ tx, ty, sx: W / 2 + Math.cos(a) * d, sy: H / 2 + Math.sin(a) * d, dl: Math.random() * 0.35, v: 0.55 + 0.45 * Math.max(0, 1 - ((i / n) + (j / n)) * 0.6), fx: (Math.random() - 0.5) * 2, fy: 0.6 + Math.random() });
  }
  const T = { gather: 1.15, hold: 0.55, fall: 0.6 }, END = T.gather + T.hold + T.fall;
  let t0 = performance.now(), done = false;
  const finish = () => {
    if (done) return; done = true; box.classList.add('out'); html.classList.remove('intro');
    try { sessionStorage.setItem('stockz:intro', '1'); } catch { }
    setTimeout(() => box.remove(), 700); ['keydown', 'pointerdown', 'wheel', 'touchstart'].forEach(e => removeEventListener(e, finish, true));
  };
  ['keydown', 'pointerdown', 'wheel', 'touchstart'].forEach(e => addEventListener(e, finish, { capture: true, passive: true }));
  const ease = x => 1 - Math.pow(1 - x, 3);
  const frame = now => {
    if (done) return; const t = (now - t0) / 1000; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    const scan = (t - T.gather - 0.05) / (T.hold * 0.8), sx = ox - 40 + scan * (S + 80);
    for (const p of P) {
      let x, y, r = cell * 0.42 * Math.sqrt(p.v), a = 1, col = '#2ee68a';
      const k = Math.min(1, Math.max(0, (t - p.dl) / (T.gather - 0.35)));
      if (t < T.gather) { const e = ease(k); x = p.sx + (p.tx - p.sx) * e; y = p.sy + (p.ty - p.sy) * e; a = 0.25 + 0.75 * k; }
      else if (t < T.gather + T.hold) { x = p.tx; y = p.ty; const pulse = 1 + 0.08 * Math.sin(Math.min(1, (t - T.gather) / T.hold) * Math.PI); x = W / 2 + (x - W / 2) * pulse; y = H / 2 + (y - H / 2) * pulse; if (scan > 0 && x < sx) { col = '#9effcc'; if (Math.random() < 0.18) { x += (Math.random() - 0.5) * cell; y += (Math.random() - 0.5) * cell; } } }
      else { const f = (t - T.gather - T.hold) / T.fall; x = p.tx + p.fx * f * 120; y = p.ty + p.fy * f * f * H * 0.7; a = 1 - f; col = '#9effcc'; }
      ctx.globalAlpha = Math.max(0, a); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();
    }
    if (t >= T.gather && t < T.gather + T.hold && scan > 0 && scan < 1.1) { ctx.globalAlpha = 0.7; ctx.fillStyle = '#9effcc'; ctx.fillRect(sx, oy - 30, 1.5, S + 60); }
    ctx.globalAlpha = 1;
    if (t > END - 0.25) finish(); else requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  setTimeout(finish, 5000);
}
