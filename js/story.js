// The pinned story: ~900 green dots that morph from a new coin, to a chart of trades paying fees, to the stock the fees
// buy, to encrypted noise, to a padlock: the private balance. Scroll drives it on desktop; a clock drives it on phones.
import { $, $$, clamp, ease, num, rng, reduced, mobile } from './util.js';
import { priceOf, prices } from './data.js';

const LEV = 10, COLS = Array.from({ length: LEV }, (_, i) => { const t = Math.pow(i / (LEV - 1), 1.15); return `rgb(${Math.round(12 + 150 * t)},${Math.round(96 + 159 * t)},${Math.round(54 + 152 * t)})`; });
const TAGS = ['pump.fun · new coin', 'every trade · creator fee', 'Jupiter · SOL → stock', 'Umbra · sealed on Solana', 'private balance · yours only'];

function sample(W, H, N, draw, seed) {
  const cv = document.createElement('canvas'); cv.width = Math.round(W); cv.height = Math.round(H); const c = cv.getContext('2d', { willReadFrequently: true });
  draw(c, W, H); const d = c.getImageData(0, 0, cv.width, cv.height).data; const pts = []; const step = Math.max(2, Math.round(Math.sqrt((W * H) / (N * 6))));
  for (let y = 0; y < cv.height; y += step) for (let x = 0; x < cv.width; x += step) { const i = (y * cv.width + x) * 4; if (d[i + 3] > 120) pts.push({ x, y, s: d[i] / 255 }); }
  const R = rng(seed); for (let i = pts.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [pts[i], pts[j]] = [pts[j], pts[i]]; }
  const out = []; for (let i = 0; i < N; i++) out.push(pts.length ? pts[i % pts.length] : { x: W / 2, y: H / 2, s: 0.5 });
  return out.sort((a, b) => (a.x + a.y * 0.35) - (b.x + b.y * 0.35));
}
const lit = (c, x, y, r) => { const g = c.createRadialGradient(x - r * 0.4, y - r * 0.45, r * 0.1, x, y, r * 1.05); g.addColorStop(0, '#fff'); g.addColorStop(1, '#2a2a2a'); return g; };

export function mountStory({ root, canvas, steps, rail, tag, hud }) {
  const ctx = canvas.getContext('2d'); let W = 0, H = 0, dpr = 1, N = 900, F = [], sym = 'NVDA', p = 0, raf = 0, vis = true, t0 = performance.now();
  const stepEls = $$('.step', steps), bars = $$('i', rail);
  function forms() {
    const r = canvas.getBoundingClientRect(); if (r.width < 10 || r.height < 10) return; W = r.width; H = r.height; dpr = Math.min(2, devicePixelRatio || 1);
    canvas.width = W * dpr; canvas.height = H * dpr; N = W < 600 ? 520 : 900;
    const cx = W / 2, cy = H * 0.42, R0 = Math.min(W, H) * 0.24;
    F = [
      sample(W, H, N, c => { c.fillStyle = lit(c, cx, cy, R0); c.beginPath(); c.arc(cx, cy, R0, 0, 6.2832); c.fill(); c.fillStyle = '#000'; c.font = `800 ${R0 * 1.05}px InterD, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.globalCompositeOperation = 'destination-out'; c.fillText('$', cx, cy + R0 * 0.04); }, 1),
      sample(W, H, N, c => { const n = 6, span = W * 0.72 / n, x0 = W * 0.14; for (let i = 0; i < n; i++) { const h = H * (0.16 + ((i * 37) % 11) / 40), x = x0 + span * (i + 0.5), y = H * (0.62 - i * 0.055); c.fillStyle = lit(c, x, y, span * 0.6); c.beginPath(); c.roundRect(x - span * 0.28, y - h / 2, span * 0.56, h, span * 0.28); c.fill(); c.fillRect(x - span * 0.04, y - h / 2 - h * 0.3, span * 0.08, h * 1.6); } }, 2),
      null,
      sample(W, H, N, (c, w, h) => { const R = rng(7); for (let i = 0; i < 2600; i++) { const v = R(); c.fillStyle = `rgb(${v * 255},${v * 255},${v * 255})`; c.fillRect(W * 0.12 + R() * W * 0.76, H * 0.14 + R() * H * 0.56, 3, 3); } }, 4),
      sample(W, H, N, c => { const bw = Math.min(W, H) * 0.42, bh = bw * 0.78, x = cx - bw / 2, y = cy - bh * 0.18; c.strokeStyle = '#ddd'; c.lineWidth = bw * 0.13; c.beginPath(); c.arc(cx, y, bw * 0.3, Math.PI, 0); c.stroke(); c.fillStyle = lit(c, cx, y + bh / 2, bw * 0.7); c.beginPath(); c.roundRect(x, y, bw, bh, bw * 0.12); c.fill(); c.globalCompositeOperation = 'destination-out'; c.beginPath(); c.arc(cx, y + bh * 0.42, bw * 0.08, 0, 6.2832); c.fill(); c.fillRect(cx - bw * 0.035, y + bh * 0.42, bw * 0.07, bh * 0.3); }, 5),
    ];
    stockForm();
  }
  function stockForm() {
    if (!W || !F.length) return; const cx = W / 2, cy = H * 0.42;
    F[2] = sample(W, H, N, c => { const fs = Math.min(W * 0.86 / (sym.length * 0.72), H * 0.3); c.font = `800 ${fs}px InterD, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; const g = c.createLinearGradient(cx - fs, cy - fs / 2, cx + fs, cy + fs / 2); g.addColorStop(0, '#fff'); g.addColorStop(1, '#3a3a3a'); c.fillStyle = g; c.fillText(sym, cx, cy); }, 3);
  }
  function progress(now) {
    if (mobile() || reduced) return ((now - t0) / 1000 % 16) / 16;
    const r = root.getBoundingClientRect(); return clamp(-r.top / Math.max(1, r.height - innerHeight), 0, 0.9999);
  }
  let lastStep = -1;
  function frame(now) {
    raf = requestAnimationFrame(frame); if (!vis || !W) return;
    p = progress(now); const sp = p * 5, s = Math.min(4, Math.floor(sp)), k = sp - s;
    if (s !== lastStep) { lastStep = s; stepEls.forEach((el, i) => el.classList.toggle('on', i === s)); if (tag) tag.textContent = TAGS[s].replace('stock', sym); }
    bars.forEach((b, i) => b.style.setProperty('--k', i < s ? 1 : i === s ? k : 0));
    // HUD: fees grow through the story, the stock count follows the live prices
    const fee = 1.2 * ease(clamp(p * 1.25, 0, 1)); const st = prices(), pr = priceOf(sym), solp = st.sol ? st.sol.price : null;
    hud.fee.textContent = `${num(fee, 3)} SOL`;
    const shares = pr && solp && s >= 2 ? fee * solp / pr.price * ease(clamp((sp - 2) / 0.8, 0, 1)) : 0;
    hud.stock.textContent = `${num(shares, 4)} ${sym}`;
    hud.seen.textContent = s >= 3 ? 'encrypted' : 'public'; hud.seen.style.color = s >= 3 ? 'var(--g)' : '';
    // morph: hold each formation, then move to the next in the last 45% of its step
    const a = F[s], b = F[Math.min(4, s + 1)], kk = s < 4 ? clamp((k - 0.55) / 0.45, 0, 1) : 0, t = now / 1000;
    if (!a || !b || a.length < N || b.length < N) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    const gap = W < 600 ? 7 : 9, paths = COLS.map(() => new Path2D());
    const noisy = (s === 3 && kk < 0.6) || (s === 2 && kk > 0.5);
    for (let i = 0; i < N; i++) {
      const A = a[i], B = b[i], d = (i / N) * 0.35, q = ease(clamp((kk - d) / 0.65, 0, 1));
      let x = A.x + (B.x - A.x) * q, y = A.y + (B.y - A.y) * q - Math.sin(q * Math.PI) * 40 * ((i % 7) / 7 - 0.3);
      let v = A.s + (B.s - A.s) * q;
      if (noisy && !reduced) { const h = Math.sin(i * 12.9898 + Math.floor(t * 14) * 78.233) * 43758.5453; const fr = h - Math.floor(h); x += (fr - 0.5) * 6; y += ((fr * 7) % 1 - 0.5) * 6; v = 0.3 + fr * 0.7; }
      else if (!reduced) { y += Math.sin(t * 1.6 + i * 0.37) * 1.2; }
      const r = gap * 0.46 * Math.sqrt(Math.max(0.08, v)), lv = Math.min(LEV - 1, Math.round(v * (LEV - 1)));
      paths[lv].moveTo(x + r, y); paths[lv].arc(x, y, r, 0, 6.2832);
    }
    for (let i = 0; i < LEV; i++) { ctx.fillStyle = COLS[i]; ctx.fill(paths[i]); }
    if (s === 3 && !reduced) {                            // the sealing scan
      const sx = W * clamp(k * 1.3, 0, 1.1), g = ctx.createLinearGradient(sx - 80, 0, sx, 0); g.addColorStop(0, 'rgba(46,230,138,0)'); g.addColorStop(1, 'rgba(46,230,138,.18)');
      ctx.fillStyle = g; ctx.fillRect(sx - 80, 0, 80, H); ctx.fillStyle = 'rgba(158,255,205,.6)'; ctx.fillRect(sx, 0, 1.5, H);
    }
    if (s === 1 && !reduced) {                            // trades flying in, each dropping a fee dot
      for (let j = 0; j < 14; j++) { const ph = (t * 0.6 + j / 14) % 1, side = j % 2 ? -1 : 1, x = W / 2 + side * (W * 0.55) * (1 - ph), y = H * 0.25 + (j * 37 % 100) / 100 * H * 0.45; ctx.fillStyle = `rgba(242,247,244,${0.25 + 0.5 * (1 - ph)})`; ctx.beginPath(); ctx.arc(x, y, 2.4, 0, 6.2832); ctx.fill(); }
    }
  }
  forms();
  new ResizeObserver(() => forms()).observe(canvas);
  new IntersectionObserver(([e]) => (vis = e.isIntersecting)).observe(root);
  document.fonts.ready.then(forms);
  raf = requestAnimationFrame(frame);
  return { setStock(v) { sym = v; if (W) stockForm(); lastStep = -1; } };
}
