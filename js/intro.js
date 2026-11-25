// The intro, once per visit and wordless. A halftone market rises out of the dark while the camera glides over it;
// every dot is pulled out of its candle into a vortex and lands as the Z, turning in 3D; a light crosses its face,
// a scan seals it, a pulse locks it, and the camera dives through the mark into the page.
// Any key, click, wheel or touch skips it. Time only moves while the tab is visible.
import { markMask } from './mark.js';

const html = document.documentElement;
const LEV = 12;
const ramp = (a, b) => Array.from({ length: LEV }, (_, i) => { const t = i / (LEV - 1); return `rgb(${Math.round(a[0] + (b[0] - a[0]) * t)},${Math.round(a[1] + (b[1] - a[1]) * t)},${Math.round(a[2] + (b[2] - a[2]) * t)})`; });
const GREEN = ramp([9, 64, 37], [178, 255, 218]);
const MINT = ramp([36, 140, 98], [240, 255, 248]);
const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const eOut = x => 1 - Math.pow(1 - x, 3);
const eIn = x => x * x * x;
const eIO = x => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const eBack = (x, s) => 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2);
const hash = i => { const h = Math.sin(i * 127.1 + 311.7) * 43758.5453; return h - Math.floor(h); };
const rng = seed => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const TAU = Math.PI * 2;

// the timeline, in seconds
const T = { pull: 1.2, pullSpan: 0.62, fly: 0.95, settle: 3.1, glint: 2.55, seal0: 3.08, seal1: 3.72, lock: 3.76, dive: 4.0, reveal: 4.3, end: 4.85 };

export async function playIntro() {
  const box = document.getElementById('intro');
  if (!html.classList.contains('intro') || !box) { box && box.remove(); return; }
  box.classList.add('intro-on');
  const cv = document.getElementById('introCv'), ctx = cv.getContext('2d');
  const W = innerWidth, H = innerHeight, small = W < 700;
  const dpr = Math.min(1.5, devicePixelRatio || 1);
  cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);

  let done = false, raf = 0;
  const off = () => ['keydown', 'pointerdown', 'wheel', 'touchstart'].forEach(e => removeEventListener(e, skip, true));
  const finish = fast => {
    if (done) return; done = true; cancelAnimationFrame(raf); off();
    try { sessionStorage.setItem('stockz:intro', '1'); } catch { }
    html.classList.remove('intro'); box.classList.add('intro-out');
    setTimeout(() => box.remove(), fast ? 480 : 80);
  };
  function skip() { finish(true); }
  ['keydown', 'pointerdown', 'wheel', 'touchstart'].forEach(e => addEventListener(e, skip, { capture: true, passive: true }));
  setTimeout(() => finish(true), 11000);                                     // never hold the page hostage

  const [{ n, m }] = await Promise.all([markMask(small ? 40 : 56), Promise.race([document.fonts.load('600 24px JB'), new Promise(r => setTimeout(r, 500))]).catch(() => { })]);
  if (done) return;

  // ---- the mark, as points in 3D: the face, plus the side walls that show when it turns
  let x0 = n, x1 = -1, y0 = n, y1 = -1;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) if (m[j * n + i]) { if (i < x0) x0 = i; if (i > x1) x1 = i; if (j < y0) y0 = j; if (j > y1) y1 = j; }
  if (x1 < 0) { finish(true); return; }
  const ZW = 3.2, cs = ZW / (x1 - x0 + 1), mx = (x0 + x1 + 1) / 2, my = (y0 + y1 + 1) / 2, TH = 0.5;
  const at = (i, j) => (i >= 0 && j >= 0 && i < n && j < n && m[j * n + i] ? 1 : 0);
  const tg = [];
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    if (!at(i, j)) continue;
    const X = (i + 0.5 - mx) * cs, Y = (j + 0.5 - my) * cs;
    tg.push({ x: X, y: Y, z: -TH / 2, nx: 0, ny: 0, nz: -1, face: 1, u: (i - x0) / (x1 - x0 + 1) });
    const gx = at(i - 1, j) - at(i + 1, j), gy = at(i, j - 1) - at(i, j + 1);
    if (gx || gy) {
      const l = Math.hypot(gx, gy), nx = gx / l, ny = gy / l;
      for (let k = 1; k <= 3; k++) tg.push({ x: X + nx * cs * 0.45, y: Y + ny * cs * 0.45, z: -TH / 2 + (TH * k) / 3, nx, ny, nz: 0, face: 0, u: 0 });
    }
  }
  const N = tg.length;

  // ---- the camera: the mark sits D0 in front of it and fills about half the screen
  const Zpx = Math.min(W * 0.62, H * 0.5), D0 = 6, F = (Zpx * D0) / ZW, cx = W / 2, cy = H / 2;
  const cam = t => { const k = eIO(clamp(t / 2.3)), yaw = 0.17 - 0.21 * k; return { x: 0.75 - 0.95 * k, y: -0.12 * k, z: 2.8 * k, co: Math.cos(yaw), si: Math.sin(yaw) }; };
  const toCam = (wx, wy, wz, c) => { const x = wx - c.x, y = wy - c.y, z = wz - c.z; return [x * c.co - z * c.si, y, x * c.si + z * c.co]; };

  // ---- the market: candles of lit halftone dots standing on a dotted floor, exactly N dots in all
  const R = rng(20261125), yG = 1.9, P = [];
  let ci = 0;
  while (P.length < N && ci < 600) {
    const z = 4.4 + Math.pow(R(), 0.85) * 19, half = ((W / 2) * z) / F * 1.15, x = (R() * 2 - 1) * half;
    const h = 0.8 + R() * 2.9, w = 0.46, up = R() > 0.22, rise = 0.02 + R() * 0.6 + z * 0.006, leave = T.pull + R() * T.pullSpan;
    const cols = 3, sp = w / cols, rows = Math.max(3, Math.round(h / sp));
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const u = ((c + 0.5) / cols) * 2 - 1, f = (r + 0.5) / rows, nx = u * 0.9, nz = -Math.sqrt(1 - nx * nx);
      const capT = Math.max(0, 1 - (h * (1 - f)) / (w * 0.5));             // the rounded top catches the light
      const d = Math.max(0, nx * -0.6 + nz * -0.69 + capT * 0.4);
      const b = clamp((0.08 + 0.92 * d) * (0.55 + 0.45 * f) * (up ? 1 : 0.5));
      P.push({ wx: x + u * w * 0.5, wy: yG - f * h, wz: z, f, rise, leave: leave + hash(P.length) * 0.08, b, sp, ci });
    }
    for (let k = 1; k <= 3; k++) P.push({ wx: x, wy: yG - h - k * sp, wz: z, f: 1 + k * 0.05, rise, leave: leave + 0.02, b: 0.28, sp, ci });
    ci++;
  }
  P.sort((a, b) => a.wz - b.wz); P.length = Math.min(P.length, N);           // trim the farthest dots if we went over
  const floor = [];
  for (let z = 2.5; z < 30; z += 0.8) for (let x = -15; x <= 15; x += 0.8) floor.push([x, z]);

  // pair each dot with a point on the mark by angle, so the vortex turns as one
  const c0 = cam(T.pull);
  P.forEach(p => { const q = toCam(p.wx, p.wy, p.wz, c0); p.ang = Math.atan2(q[1] * F / q[2], q[0] * F / q[2]); });
  const order = tg.map((q, i) => [Math.atan2(q.y, q.x), i]).sort((a, b) => a[0] - b[0]).map(a => a[1]);
  P.slice().sort((a, b) => a.ang - b.ang).forEach((p, k) => (p.tgt = order[Math.min(order.length - 1, Math.round((k * (order.length - 1)) / Math.max(1, P.length - 1)))]));
  // any point left without a dot gets a spare from the field, so the mark never has holes
  const used = new Uint8Array(N); P.forEach(p => (used[p.tgt] = 1));
  let spare = 0; for (let i = 0; i < N; i++) if (!used[i] && P.length) { const s = P[spare++ % P.length]; P.push({ ...s, tgt: i, b: s.b }); }

  // ---- the hex glyphs the seal flickers through
  const GL = '0123456789abcdef', gs = 40, atlas = document.createElement('canvas');
  atlas.width = gs * 16; atlas.height = gs;
  const ax = atlas.getContext('2d'); ax.font = `600 ${gs * 0.8}px JB, ui-monospace, monospace`; ax.textAlign = 'center'; ax.textBaseline = 'middle'; ax.fillStyle = '#d4ffe9';
  for (let i = 0; i < 16; i++) ax.fillText(GL[i], gs * i + gs / 2, gs / 2 + 2);

  // ---- the mark's pose over time: it turns to face you, sways, thumps when it locks, then rushes past
  const L = (() => { const v = [-0.45, -0.5, -0.74], l = Math.hypot(...v); return v.map(a => a / l); })();
  const pose = t => {
    const k = clamp((t - T.pull) / (T.settle - T.pull)), dk = clamp((t - T.dive) / (T.end - T.dive));
    const sway = t > T.settle ? Math.sin((t - T.settle) * 2.4) * 0.03 : 0;
    const a = -1.05 * (1 - eBack(k, 1.15)) + sway + 0.32 * eIn(dk), b = 0.3 * (1 - eOut(k)) - 0.12 * eIn(dk);
    const th = t > T.lock ? Math.sin(Math.PI * clamp((t - T.lock) / 0.24)) : 0;
    return { ca: Math.cos(a), sa: Math.sin(a), cb: Math.cos(b), sb: Math.sin(b), sc: 1 - 0.05 * th, D: D0 * Math.pow(0.025, eIO(dk)) };
  };
  const place = (q, o, out) => {
    const X = q.x * o.sc, Y = q.y * o.sc, Z = q.z * o.sc;
    const x1 = X * o.ca + Z * o.sa, z1 = -X * o.sa + Z * o.ca;
    out[0] = x1; out[1] = Y * o.cb - z1 * o.sb; out[2] = Y * o.sb + z1 * o.cb + o.D;
    const nx1 = q.nx * o.ca + q.nz * o.sa, nz1 = -q.nx * o.sa + q.nz * o.ca;
    out[3] = nx1; out[4] = q.ny * o.cb - nz1 * o.sb; out[5] = q.ny * o.sb + nz1 * o.cb;
    return out;
  };
  const shade = (q, v, t) => {
    if (!q.face && v[3] * v[0] + v[4] * v[1] + v[5] * v[2] >= 0) return -1;   // a wall facing away
    let b = 0.18 + 0.82 * Math.max(0, v[3] * L[0] + v[4] * L[1] + v[5] * L[2]);
    if (q.face) { const sw = (t - T.glint) / 0.75 * 1.5 - 0.25; b += 0.7 * Math.max(0, 1 - Math.abs(q.u - sw) * 7); }
    return clamp(b);
  };

  // ---- one frame
  const pg = GREEN.map(() => new Path2D()), pm = MINT.map(() => new Path2D());
  let t = 0, last = 0;
  const v = [0, 0, 0, 0, 0, 0];
  const frame = now => {
    if (done) return;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0; last = now; t += dt;
    if (t >= T.end) { finish(false); return; }
    raf = requestAnimationFrame(frame);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // a dark wash; while the dots fly it only half clears, so they leave trails
    if (t < T.dive) {
      const wash = t < T.pull + 0.1 ? 1 : t < T.settle - 0.5 ? 0.3 : 0.3 + 0.7 * clamp((t - T.settle + 0.5) / 0.35);
      ctx.globalAlpha = 1; ctx.fillStyle = `rgba(5,6,5,${wash})`; ctx.fillRect(0, 0, W, H);
    } else ctx.clearRect(0, 0, W, H);
    if (t >= T.reveal) { html.classList.remove('intro'); box.classList.add('intro-thru'); box.style.backgroundColor = `rgba(5,6,5,${(1 - eIO(clamp((t - T.reveal) / (T.end - T.reveal - 0.08)))).toFixed(3)})`; }
    ctx.globalAlpha = 1 - eOut(clamp((t - 4.3) / 0.5));

    const c = cam(t), o = pose(t);
    // the floor: fades in from the horizon, out as the vortex starts
    const fa = clamp(t / 0.5) * (1 - clamp((t - T.pull) / 0.45));
    if (fa > 0.01) {
      for (const [x, z] of floor) { const q = toCam(x, yG + 0.05, z, c); if (q[2] < 0.5) continue; const sx = cx + (q[0] * F) / q[2], sy = cy + (q[1] * F) / q[2]; if (sx < -4 || sx > W + 4 || sy > H + 4) continue; const s = Math.max(1.2, Math.min(3.4, 18 / q[2])); ctx.fillStyle = `rgba(46,230,138,${(fa * Math.min(0.62, 4 / q[2])).toFixed(3)})`; ctx.fillRect(sx - s / 2, sy - s / 2, s, s); }
    }

    for (let i = 0; i < LEV; i++) { pg[i] = new Path2D(); pm[i] = new Path2D(); }
    const scan = clamp((t - T.seal0) / (T.seal1 - T.seal0)), sx0 = cx - Zpx * 0.62, sx1 = cx + Zpx * 0.62, scanX = sx0 + (sx1 - sx0) * eIO(scan) - 40 + 80 * scan;
    const glyphs = [];
    for (let i = 0; i < P.length; i++) {
      const p = P[i], q = tg[p.tgt];
      let x, y, z, b, r;
      if (t < p.leave) {                                                        // still a candle
        const k = clamp((t - p.rise - p.f * 0.26) / 0.18); if (k <= 0) continue;
        const a = toCam(p.wx, p.wy, p.wz, c); x = a[0]; y = a[1]; z = a[2]; if (z < 0.4) continue;
        b = clamp(p.b * (0.9 + 0.1 * Math.sin(t * 7 + i * 1.7))); r = p.sp * 0.5 * Math.sqrt(Math.max(0.06, b)) * eOut(k) * 1.06;
      } else {
        place(q, o, v); let bt = shade(q, v, t);
        const k = clamp((t - p.leave) / T.fly);
        if (k < 1) {                                                            // in the vortex
          if (!p.p0) p.p0 = toCam(p.wx, p.wy, p.wz, cam(p.leave));
          const e = eIO(k), [ax0, ay0, az0] = p.p0;
          const r0 = Math.hypot(ax0, ay0), th0 = Math.atan2(ay0, ax0), r1 = Math.hypot(v[0], v[1]), th1 = Math.atan2(v[1], v[0]);
          let d = th1 - th0; d -= Math.round(d / TAU) * TAU;
          const th = th0 + (d + TAU) * e, rr = r1 + (r0 - r1) * Math.pow(1 - e, 1.6);
          x = Math.cos(th) * rr; y = Math.sin(th) * rr; z = az0 + (v[2] - az0) * e;
          b = clamp(p.b + ((bt < 0 ? 0.3 : bt) - p.b) * e + 0.45 * Math.sin(Math.PI * e));
          r = (p.sp + (cs - p.sp) * e) * 0.5 * Math.sqrt(Math.max(0.1, b));
        } else {                                                                // on the mark
          if (bt < 0) continue;
          x = v[0]; y = v[1]; z = v[2]; b = bt; r = cs * 0.5 * Math.sqrt(Math.max(0.08, b)) * 1.04;
        }
      }
      if (z < 0.16) continue;
      const s = F / z, X = cx + x * s, Y = cy + y * s, rad = Math.min(30, r * s);
      if (X < -rad || X > W + rad || Y < -rad || Y > H + rad || rad < 0.25) continue;
      const lv = Math.min(LEV - 1, Math.round(b * (LEV - 1)));
      if (t >= T.seal0 && t >= p.leave + T.fly && X < scanX) {                // sealed
        if (X > scanX - 90 && hash(i) < 0.42 && t < T.seal1 + 0.1) { glyphs.push(X, Y, rad, i); continue; }
        pm[lv].moveTo(X + rad, Y); pm[lv].arc(X, Y, rad, 0, TAU);
      } else { pg[lv].moveTo(X + rad, Y); pg[lv].arc(X, Y, rad, 0, TAU); }
    }
    for (let i = 0; i < LEV; i++) { ctx.fillStyle = GREEN[i]; ctx.fill(pg[i]); ctx.fillStyle = MINT[i]; ctx.fill(pm[i]); }
    const tick = Math.floor(t * 18);
    for (let g = 0; g < glyphs.length; g += 4) { const s = Math.max(7, glyphs[g + 2] * 2.6), ch = Math.floor(hash(glyphs[g + 3] + tick) * 16); ctx.drawImage(atlas, ch * gs, 0, gs, gs, glyphs[g] - s / 2, glyphs[g + 1] - s / 2, s, s); }

    // the seal: a hard scan line with a stepped band behind it
    if (scan > 0 && scan < 1) {
      const top = cy - Zpx * 0.62, hh = Zpx * 1.24;
      [[64, 0.05], [36, 0.08], [14, 0.14]].forEach(([wd, al]) => { ctx.fillStyle = `rgba(158,255,204,${al})`; ctx.fillRect(scanX - wd, top, wd, hh); });
      ctx.fillStyle = 'rgba(214,255,234,.95)'; ctx.fillRect(scanX - 1, top - 18, 2, hh + 36);
    }
    // the lock: two rings of dots go out from the mark
    for (const [d0, al] of [[0, 1], [0.12, 0.5]]) {
      const k = clamp((t - T.lock - d0) / 0.62); if (k <= 0 || k >= 1) continue;
      const rr = Zpx * (0.6 + 0.75 * eOut(k)), cnt = small ? 90 : 150, a0 = 1 - k;
      ctx.fillStyle = `rgba(190,255,224,${(a0 * al).toFixed(3)})`;
      ctx.beginPath(); for (let j = 0; j < cnt; j++) { const an = (j / cnt) * TAU; const px = cx + Math.cos(an) * rr, py = cy + Math.sin(an) * rr; ctx.moveTo(px + 2.2, py); ctx.arc(px, py, 2.2, 0, TAU); } ctx.fill();
    }
  };
  raf = requestAnimationFrame(frame);
}
