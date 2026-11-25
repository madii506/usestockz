// the coin card: what a Stockz coin looks like, built live from the launch form, and saved as a PNG
import { esc, short, usd, rng } from './util.js';
import { logo, priceOf, bySym } from './data.js';

const LEV = 12, COLS = Array.from({ length: LEV }, (_, i) => { const t = Math.pow(i / (LEV - 1), 1.2); return `rgb(${Math.round(10 + 148 * t)},${Math.round(84 + 171 * t)},${Math.round(48 + 157 * t)})`; });
// a field of halftone candles, drawn once, used behind the card and in the PNG
function field(ctx, W, H, seed, g) {
  const R = rng(seed), n = 6, span = W / n;
  for (let i = 0; i < n; i++) {
    const w = span * 0.46, h = H * (0.22 + R() * 0.24), cx = span * (i + 0.5), cy = H * (0.62 - i * 0.05 + (R() - 0.5) * 0.12), rr = w / 2;
    for (let y = 0; y < H; y += g * 0.866) for (let x = cx - w; x < cx + w; x += g) {
      const top = cy - h / 2 + rr, bot = cy + h / 2 - rr, py = Math.min(bot, Math.max(top, y)), dx = (x - cx) / rr, dy = (y - py) / rr, q = dx * dx + dy * dy;
      if (q > 1) continue;
      const v = Math.max(0, dx * -0.46 + dy * -0.42 + Math.sqrt(1 - q) * 0.78) ** 1.25 * 0.96 + 0.04;
      ctx.fillStyle = COLS[Math.min(LEV - 1, Math.round(v * 0.75 * (LEV - 1)))]; ctx.globalAlpha = 0.55;
      ctx.beginPath(); ctx.arc(x + (Math.floor(y / (g * 0.866)) % 2 ? g / 2 : 0), y, g * 0.46 * Math.sqrt(v), 0, 6.2832); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}
// the coin's image, or a halftone disc with its first letter when there's none
export function drawImg(cv, img, tick) {
  const c = cv.getContext('2d'), S = cv.width; c.clearRect(0, 0, S, S);
  if (img) { const r = Math.max(S / img.width, S / img.height), w = img.width * r, h = img.height * r; c.drawImage(img, (S - w) / 2, (S - h) / 2, w, h); return; }
  c.fillStyle = '#0d1a13'; c.fillRect(0, 0, S, S);
  const g = S / 14;
  for (let y = g / 2; y < S; y += g * 0.866) for (let x = g / 2; x < S; x += g) {
    const dx = (x - S / 2) / (S * 0.42), dy = (y - S / 2) / (S * 0.42), q = dx * dx + dy * dy; if (q > 1) continue;
    const v = Math.max(0, -0.46 * dx - 0.42 * dy + Math.sqrt(1 - q) * 0.78) ** 1.2 * 0.95 + 0.05;
    c.fillStyle = COLS[Math.min(LEV - 1, Math.round(v * (LEV - 1)))]; c.beginPath(); c.arc(x, y, g * 0.46 * Math.sqrt(v), 0, 6.2832); c.fill();
  }
  c.fillStyle = '#04140b'; c.font = `800 ${Math.round(S * 0.42)}px InterD, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText((tick || 'S').replace('$', '').slice(0, 1).toUpperCase() || 'S', S / 2, S / 2 + S * 0.03);
}

export function coinCard(root) {
  root.innerHTML = `<canvas class="bg" aria-hidden="true"></canvas><span class="coin-tag">preview</span>
    <div class="coin-body">
      <div class="coin-top"><canvas width="128" height="128" class="cimg"></canvas><div><b class="cname">Your coin</b><span class="ctick">$TICKER</span></div></div>
      <p class="coin-desc cdesc">Pays its creator fees to a stock account.</p>
      <div class="coin-pay">
        <div class="r"><span>Pays</span><b class="cto">any wallet</b></div>
        <div class="r"><span>In</span><b class="cin"></b></div>
        <div class="r"><span class="clbl">Price now</span><b class="cpx">—</b></div>
        <div class="r"><span>On Solana</span><b>encrypted</b></div>
      </div>
    </div>`;
  const bg = root.querySelector('canvas.bg');
  const paintBg = () => { const r = bg.getBoundingClientRect(); if (!r.width) return; const d = Math.min(2, devicePixelRatio || 1); bg.width = r.width * d; bg.height = r.height * d; const c = bg.getContext('2d'); c.scale(d, d); field(c, r.width, r.height, 5, 9); };
  new ResizeObserver(paintBg).observe(bg);
  let last = {};
  return function update(d) {
    last = d;
    root.querySelector('.cname').textContent = d.name || 'Your coin';
    root.querySelector('.ctick').textContent = '$' + (d.tick || 'TICKER');
    root.querySelector('.cdesc').textContent = d.desc || `Pays its creator fees to a stock account, in ${bySym[d.sym]?.name || 'stocks'}.`;
    root.querySelector('.cto').textContent = d.to ? short(d.to, 4) : 'any wallet';
    root.querySelector('.cin').innerHTML = `${logo(d.sym)}${esc(d.sym)}`;
    root.querySelector('.cin .tlg') && (root.querySelector('.cin .tlg').style.cssText = 'width:22px;height:22px');
    const p = priceOf(d.sym); root.querySelector('.clbl').textContent = `${d.sym} now`; root.querySelector('.cpx').textContent = p ? usd(p.price) : '—';
    drawImg(root.querySelector('.cimg'), d.img || null, d.tick);
  };
}

// the same card as a 1080 x 1350 PNG (stock logos stay out: remote images would block the export)
export async function cardPng(d) {
  await document.fonts.ready;
  const W = 1080, H = 1350, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d');
  c.fillStyle = '#060807'; c.fillRect(0, 0, W, H); field(c, W, H, 5, 22);
  const im = document.createElement('canvas'); im.width = im.height = 200; drawImg(im, d.img || null, d.tick);
  c.save(); c.beginPath(); c.roundRect(64, 64, 200, 200, 48); c.clip(); c.drawImage(im, 64, 64); c.restore();
  c.fillStyle = '#f2f7f4'; c.font = '800 70px InterD, sans-serif'; c.fillText((d.name || 'Your coin').slice(0, 22), 296, 150);
  c.fillStyle = '#2ee68a'; c.font = '600 40px JB, monospace'; c.fillText('$' + (d.tick || 'TICKER'), 300, 214);
  c.fillStyle = '#a3ada8'; c.font = '400 34px InterT, sans-serif';
  const words = (d.desc || `Pays its creator fees to a stock account, in ${bySym[d.sym]?.name || 'stocks'}.`).split(' '); let line = '', y = 340;
  for (const w of words) { const t = line ? line + ' ' + w : w; if (c.measureText(t).width > W - 128) { c.fillText(line, 64, y); line = w; y += 46; if (y > 440) break; } else line = t; } if (y <= 440) c.fillText(line, 64, y);
  c.fillStyle = 'rgba(9,12,10,0.9)'; c.strokeStyle = '#27302b'; c.lineWidth = 2; c.beginPath(); c.roundRect(64, 900, W - 128, 370, 40); c.fill(); c.stroke();
  const p = priceOf(d.sym);
  [['Pays', d.to ? short(d.to, 6) : 'any wallet'], ['In', `${d.sym} · ${bySym[d.sym]?.name || ''}`], [`${d.sym} now`, p ? usd(p.price) : '—'], ['On Solana', 'encrypted']].forEach(([a, b], i) => {
    const yy = 980 + i * 76; c.fillStyle = '#a3ada8'; c.font = '400 34px InterT, sans-serif'; c.fillText(a, 110, yy);
    c.fillStyle = '#f2f7f4'; c.font = '600 34px JB, monospace'; const tw = c.measureText(b).width; c.fillText(b, W - 110 - tw, yy);
  });
  c.fillStyle = '#2ee68a'; c.font = '800 36px InterD, sans-serif'; c.fillText('STOCKZ', 64, 860); c.fillStyle = '#6c7671'; c.font = '500 26px JB, monospace'; c.fillText('PREVIEW · LAUNCHES OPEN SOON', 270, 858);
  return new Promise(res => cv.toBlob(b => res(b), 'image/png'));
}
