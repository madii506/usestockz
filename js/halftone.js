// The Stockz halftone field: a candlestick chart drawn in green dots, lit from the top left, with an encryption sweep
// that scrambles every dot it passes into noise before the chart settles back. Dots are bucketed by colour so a frame
// is a dozen fills, not thousands.
import { rng, reduced } from './util.js';

const LEVELS = 12;
const COLS = Array.from({ length: LEVELS }, (_, i) => {
  const t = i / (LEVELS - 1), a = [10, 84, 48], b = [158, 255, 205], k = Math.pow(t, 1.2);
  return `rgb(${Math.round(a[0] + (b[0] - a[0]) * k)},${Math.round(a[1] + (b[1] - a[1]) * k)},${Math.round(a[2] + (b[2] - a[2]) * k)})`;
});
const hash = (a, b) => { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

export function createField(canvas, opt = {}) {
  const o = { gap: 11, candles: 16, seed: 3, sweep: true, particles: true, trend: 0.55, vignette: 0.5, heightK: 1, top: 0.12, bottom: 0.9, ...opt };
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, dpr = 1, gap = o.gap, cols = 0, rows = 0, colCandle = [], C = [], parts = [], running = true, raf = 0, t0 = performance.now(), lx = -0.46, ly = -0.42, mx = 0.5, my = 0.5;
  const R = rng(o.seed);

  function build() {
    const r = canvas.getBoundingClientRect(); W = Math.max(1, r.width); H = Math.max(1, r.height);
    dpr = Math.min(window.devicePixelRatio || 1, W < 700 ? 1.5 : 2);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    gap = W < 700 ? o.gap * 0.82 : o.gap;
    cols = Math.ceil(W / gap) + 2; rows = Math.ceil(H / (gap * 0.866)) + 2;
    // candles laid out as a rising chart across the width, bodies and wicks in dot columns
    const n = W < 700 ? Math.max(7, Math.round(o.candles * 0.55)) : o.candles;
    const R2 = rng(o.seed); C = []; let level = 0.5;
    const span = W / n;
    for (let i = 0; i < n; i++) {
      level += (R2() - 0.5) * 0.22 + (o.trend - 0.5) * 0.08; level = Math.min(0.85, Math.max(0.15, level));
      const w = span * (0.56 + R2() * 0.2), h = H * (0.16 + R2() * 0.26) * o.heightK;
      const cy = H * (o.top + (o.bottom - o.top) * (1 - level)) ;
      C.push({ cx: span * (i + 0.5) + (R2() - 0.5) * span * 0.12, cy, w, h, wa: h * (0.15 + R2() * 0.35), wb: h * (0.1 + R2() * 0.3), ph: R2() * 6.28, sp: 0.4 + R2() * 0.6, amp: 4 + R2() * 10, up: R2() > 0.25 });
    }
    colCandle = new Array(cols).fill(-1);
    for (let c = 0; c < cols; c++) {
      const x = c * gap; let best = -1, bd = 1e9;
      C.forEach((k, i) => { const d = Math.abs(x - k.cx); if (d < k.w * 0.62 && d < bd) { bd = d; best = i; } });
      colCandle[c] = best;
    }
  }

  function intensity(k, x, y, bob) {
    const r = k.w / 2, cy = k.cy + bob, top = cy - k.h / 2 + r, bot = cy + k.h / 2 - r;
    let py = Math.min(bot, Math.max(top, y)), dx = (x - k.cx) / r, dy = (y - py) / r, q = dx * dx + dy * dy;
    if (q <= 1) {
      const nz = Math.sqrt(1 - q); let v = dx * lx + dy * ly + nz * 0.78; v = v < 0 ? 0 : v;
      return Math.pow(v, 1.25) * 0.96 + 0.04;
    }
    // the wick: a thin pill above and below the body
    const ww = k.w * 0.09, wx = (x - k.cx) / ww;
    if (Math.abs(wx) <= 1 && y > cy - k.h / 2 - k.wa && y < cy + k.h / 2 + k.wb) {
      const nz = Math.sqrt(1 - wx * wx); const v = Math.max(0, wx * lx + nz * 0.8);
      return 0.35 + v * 0.45;
    }
    return 0;
  }

  function frame(now) {
    const t = (now - t0) / 1000;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    // light follows the pointer a little
    lx += ((-0.46 + (mx - 0.5) * 0.5) - lx) * 0.05; ly += ((-0.42 + (my - 0.5) * 0.4) - ly) * 0.05;
    const SW = 7.5, sweepP = (t % SW) / 5.6, sx = -W * 0.1 + sweepP * W * 1.2, band = Math.max(60, W * 0.05);
    const paths = COLS.map(() => new Path2D()), noise = new Path2D();
    const tick = Math.floor(t * 12);
    for (let c = 0; c < cols; c++) {
      const ki = colCandle[c]; if (ki < 0) continue;
      const k = C[ki], bob = reduced ? 0 : Math.sin(t * k.sp + k.ph) * k.amp;
      for (let r = 0; r < rows; r++) {
        const x = c * gap + (r % 2 ? gap / 2 : 0), y = r * gap * 0.866;
        let v = intensity(k, x, y, bob); if (v <= 0.02) continue;
        let rad = gap * 0.47 * Math.sqrt(v), lev = Math.min(LEVELS - 1, Math.round(v * (LEVELS - 1)));
        if (o.sweep && !reduced) {
          // passed by the sweep: scrambled, then settling back over 2.6 s
          const passed = sweepP <= 1.25 ? (sx - x) / (W * 1.2 / 5.6) : 99;
          if (passed > -0.08 && passed < 2.6) {
            const e = passed < 0 ? 1 : 1 - passed / 2.6, hz = hash(c * 131 + r, tick + (passed < 0.12 ? 0 : 7));
            if (hz < e * 0.85) {
              rad = gap * 0.47 * Math.sqrt(hash(r * 17 + c, tick)) * (0.5 + 0.5 * e);
              lev = Math.min(LEVELS - 1, Math.round((0.45 + 0.55 * hash(c, r + tick)) * (LEVELS - 1)));
              if (Math.abs(x - sx) < band * 0.5 && hz < 0.2) { noise.moveTo(x + rad * 1.3, y); noise.arc(x, y, rad * 1.3, 0, 6.2832); continue; }
            }
          }
        }
        paths[lev].moveTo(x + rad, y); paths[lev].arc(x, y, rad, 0, 6.2832);
      }
    }
    for (let i = 0; i < LEVELS; i++) { ctx.fillStyle = COLS[i]; ctx.fill(paths[i]); }
    ctx.fillStyle = '#d9ffe9'; ctx.fill(noise);
    if (o.sweep && !reduced && sweepP <= 1.1) {           // the scan line itself
      const g = ctx.createLinearGradient(sx - band, 0, sx + 4, 0);
      g.addColorStop(0, 'rgba(46,230,138,0)'); g.addColorStop(1, 'rgba(46,230,138,0.16)');
      ctx.fillStyle = g; ctx.fillRect(sx - band, 0, band + 4, H);
      ctx.fillStyle = 'rgba(158,255,205,0.55)'; ctx.fillRect(sx, 0, 1.5, H);
    }
    if (o.particles && !reduced) {                         // loose dots leaving the candle tops: the encrypted part drifting off
      if (parts.length < 140 && R() < 0.5) { const k = C[Math.floor(R() * C.length)]; parts.push({ x: k.cx + (R() - 0.5) * k.w, y: k.cy - k.h / 2, vy: -(14 + R() * 30), vx: (R() - 0.5) * 8, life: 0, max: 2 + R() * 3, r: gap * (0.12 + R() * 0.2) }); }
      const p2 = new Path2D(); const dt = 1 / 60;
      parts = parts.filter(p => { p.life += dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.life > p.max) return false; const a = 1 - p.life / p.max; const rr = p.r * a; p2.moveTo(p.x + rr, p.y); p2.arc(p.x, p.y, rr, 0, 6.2832); return true; });
      ctx.fillStyle = 'rgba(120,240,180,0.7)'; ctx.fill(p2);
    }
    if (running && !reduced) raf = requestAnimationFrame(frame);
  }

  build();
  const ro = new ResizeObserver(() => { build(); if (reduced || !running) frame(performance.now()); }); ro.observe(canvas);
  const onMove = e => { mx = e.clientX / innerWidth; my = e.clientY / innerHeight; };
  addEventListener('pointermove', onMove, { passive: true });
  const io = new IntersectionObserver(([e]) => { const v = e.isIntersecting; if (v && !running) { running = true; raf = requestAnimationFrame(frame); } else if (!v) { running = false; cancelAnimationFrame(raf); } });
  io.observe(canvas);
  document.addEventListener('visibilitychange', () => { if (document.hidden) { running = false; cancelAnimationFrame(raf); } else if (canvas.isConnected) { running = true; raf = requestAnimationFrame(frame); } });
  raf = requestAnimationFrame(frame);
  return { stop() { running = false; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); removeEventListener('pointermove', onMove); } };
}

// a small, still halftone drawing (empty states, cards): a few candles, one dissolving
export function stillArt(canvas, { candles = 4, seed = 9, dissolve = 1 } = {}) {
  const ctx = canvas.getContext('2d'); const r = canvas.getBoundingClientRect(); const W = r.width || 200, H = r.height || 140, dpr = Math.min(2, devicePixelRatio || 1);
  canvas.width = W * dpr; canvas.height = H * dpr; ctx.scale(dpr, dpr);
  const R = rng(seed), g = 6, span = W / candles;
  for (let i = 0; i < candles; i++) {
    const w = span * 0.5, h = H * (0.35 + R() * 0.35), cx = span * (i + 0.5), cy = H * (0.35 + R() * 0.3), rr = w / 2, dis = i === dissolve;
    for (let y = 0; y < H; y += g * 0.866) for (let x = cx - w; x < cx + w; x += g) {
      const top = cy - h / 2 + rr, bot = cy + h / 2 - rr, py = Math.min(bot, Math.max(top, y)), dx = (x - cx) / rr, dy = (y - py) / rr, q = dx * dx + dy * dy;
      if (q > 1) continue;
      const v = Math.max(0, dx * -0.46 + dy * -0.42 + Math.sqrt(1 - q) * 0.78) ** 1.25 * 0.96 + 0.04;
      let X = x, Y = y, s = g * 0.47 * Math.sqrt(v);
      if (dis && y < cy) { const k = (cy - y) / (h / 2); if (R() < k * 0.55) continue; X += (R() - 0.5) * g * 2 * k; Y -= R() * g * 3 * k; s *= 1 - 0.5 * k; }
      ctx.fillStyle = COLS[Math.min(LEVELS - 1, Math.round(v * (LEVELS - 1)))]; ctx.beginPath(); ctx.arc(X, Y, s, 0, 6.2832); ctx.fill();
    }
  }
}
