// a halftone coin with the Z engraved on it, turning slowly: the closing centrepiece
import { markMask } from './mark.js';
import { reduced } from './util.js';
const LEV = 12, COLS = Array.from({ length: LEV }, (_, i) => { const t = Math.pow(i / (LEV - 1), 1.15); return `rgb(${Math.round(10 + 150 * t)},${Math.round(84 + 171 * t)},${Math.round(48 + 158 * t)})`; });
export async function mountCoin(cv) {
  const { n, m } = await markMask(40); const ctx = cv.getContext('2d'); let W, H, dpr, raf = 0, vis = false;
  const L = [-0.42, -0.4, 0.82];
  const size = () => { const r = cv.getBoundingClientRect(); W = r.width; H = r.height; dpr = Math.min(1.5, devicePixelRatio || 1); cv.width = W * dpr; cv.height = H * dpr; };
  size(); addEventListener('resize', size);
  const frame = now => {
    raf = requestAnimationFrame(frame); if (!vis) return;
    const t = now / 1000, th = reduced ? 0.35 : Math.sin(t * 0.7) * 0.6 + Math.sin(t * 0.23) * 0.14, s = Math.cos(th), sn = Math.sin(th);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    const R = Math.min(W, H) * 0.42, cx = W / 2, cy = H / 2 + (reduced ? 0 : Math.sin(t * 1.1) * 4), cells = 42, g = (2 * R) / cells, paths = COLS.map(() => new Path2D());
    ctx.fillStyle = '#070807'; ctx.beginPath(); ctx.arc(W / 2, H / 2, Math.min(W, H) * 0.495, 0, 6.2832); ctx.fill();
    for (let j = 0; j < cells; j++) for (let i = 0; i < cells; i++) {
      const u = (i + 0.5) / cells * 2 - 1, v = (j + 0.5) / cells * 2 - 1, q = u * u + v * v; if (q > 1) continue;
      // a slightly domed face, turned around the vertical axis
      const nx0 = u * 0.38, ny = v * 0.38, nz0 = Math.sqrt(Math.max(0, 1 - nx0 * nx0 - ny * ny));
      const nx = nx0 * s + nz0 * sn, nz = -nx0 * sn + nz0 * s; if (nz < 0 && Math.abs(s) > 0.02) { }
      let I = Math.max(0, nx * L[0] + ny * L[1] + Math.abs(nz) * L[2]);
      const mu = s >= 0 ? u : -u, mi = Math.min(n - 1, Math.max(0, Math.floor((mu * 0.62 + 0.5) * n))), mj = Math.min(n - 1, Math.max(0, Math.floor((v * 0.62 + 0.5) * n)));
      const inZ = Math.abs(mu) < 0.8 && Math.abs(v) < 0.8 && m[mj * n + mi];
      if (inZ) I = 0.12 + I * 0.25; else I = 0.25 + I * 0.75;
      if (q > 0.86) I = Math.min(1, I + 0.25);                       // the rim catches the light
      const x = cx + u * R * s, y = cy + v * R, r = g * 0.46 * Math.sqrt(I) * (0.55 + 0.45 * Math.abs(s));
      const lv = Math.min(LEV - 1, Math.round(I * (LEV - 1))); paths[lv].moveTo(x + r, y); paths[lv].arc(x, y, r, 0, 6.2832);
    }
    // the rim shows on one side as the coin sways
    const thick = R * 0.13 * Math.abs(sn), side = sn > 0 ? -1 : 1;
    if (thick > g * 0.5) for (let j = 0; j < cells; j++) {
      const v = (j + 0.5) / cells * 2 - 1, hw = Math.sqrt(Math.max(0, 1 - v * v)); if (hw < 0.08) continue;
      for (let d = g * 0.55; d < thick; d += g * 0.8) { const x = cx + side * (R * s * hw + d), y = cy + v * R, rr = g * 0.36; paths[3 + (j % 2)].moveTo(x + rr, y); paths[3 + (j % 2)].arc(x, y, rr, 0, 6.2832); }
    }
    for (let i = 0; i < LEV; i++) { ctx.fillStyle = COLS[i]; ctx.fill(paths[i]); }
  };
  new IntersectionObserver(([e]) => (vis = e.isIntersecting)).observe(cv);
  raf = requestAnimationFrame(frame);
}
