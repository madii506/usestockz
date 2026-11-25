// the stock board: one card per stock with the live price, 24h move, market cap and a little halftone chart
import { esc, usd, pct, rng, reduced } from './util.js';
import { STOCKS, logo, onPrices } from './data.js';

function mini(cv, ch, seed) {
  const r = cv.getBoundingClientRect(); const W = r.width || 120, H = r.height || 70, dpr = Math.min(2, devicePixelRatio || 1);
  cv.width = W * dpr; cv.height = H * dpr; const c = cv.getContext('2d'); c.scale(dpr, dpr); c.clearRect(0, 0, W, H);
  const R = rng(seed), n = 7, g = 5; let lvl = 0.5; const pts = [];
  for (let i = 0; i < n; i++) { lvl += (R() - 0.5) * 0.3 + (ch == null ? 0 : Math.sign(ch) * 0.06); lvl = Math.min(0.85, Math.max(0.15, lvl)); pts.push(lvl); }
  const up = ch == null || ch >= 0;
  pts.forEach((l, i) => {
    const x = (i + 0.5) * (W / n), cy = H * (1 - l), h = H * (0.18 + R() * 0.22);
    for (let y = cy - h / 2; y < cy + h / 2; y += g * 0.87) for (let dx = -1; dx <= 1; dx++) {
      const v = 1 - Math.abs(dx) * 0.45; c.fillStyle = up ? `rgba(46,230,138,${0.25 + 0.6 * v})` : `rgba(255,107,107,${0.2 + 0.5 * v})`;
      c.beginPath(); c.arc(x + dx * g, y, g * 0.38 * v, 0, 6.2832); c.fill();
    }
  });
}

export function mountBoard(root, { onPick, pick } = {}) {
  root.innerHTML = STOCKS.map((s, i) => `
    <button class="stk rv d${i % 4}" type="button" data-sym="${s.sym}" aria-label="${esc(s.name)}">
      <div class="stk-top">${logo(s.sym)}<div><div class="stk-sym">${s.sym}</div><div class="stk-name">${esc(s.name)}</div></div></div>
      <div class="stk-px num"><span class="sk">$000.00</span></div>
      <span class="stk-ch num"><span class="sk">+0.00%</span></span>
      <div class="stk-meta"><span>${s.cat === 'index' ? 'ETF' : s.cat === 'metal' ? 'metal ETF' : 'stock'}</span><span class="mc">—</span></div>
      <canvas aria-hidden="true"></canvas>
    </button>`).join('');
  const cards = [...root.querySelectorAll('.stk')];
  cards.forEach((c, i) => {
    c.addEventListener('click', () => { cards.forEach(x => x.classList.toggle('pick', x === c)); onPick ? onPick(c.dataset.sym) : (location.href = `/app?stock=${c.dataset.sym}#launch`); });
    if (!reduced && matchMedia('(pointer: fine)').matches) {
      c.addEventListener('pointermove', e => { const r = c.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5; c.style.transform = `perspective(700px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg) translateZ(4px)`; });
      c.addEventListener('pointerleave', () => (c.style.transform = ''));
    }
  });
  if (pick) cards.forEach(x => x.classList.toggle('pick', x.dataset.sym === pick));
  const fill = st => {
    cards.forEach((c, i) => {
      const s = st.stocks ? st.stocks.find(x => x.sym === c.dataset.sym) : null;
      const px = c.querySelector('.stk-px'), ch = c.querySelector('.stk-ch'), mc = c.querySelector('.mc');
      if (!s) { if (st.at) { px.textContent = '—'; ch.textContent = 'offline'; ch.className = 'stk-ch num'; } return; }
      px.textContent = usd(s.price); ch.textContent = `${s.ch24 >= 0 ? '▲' : '▼'} ${pct(s.ch24)} 24h`; ch.className = `stk-ch num ${s.ch24 >= 0 ? 'up' : 'dn'}`;
      mc.textContent = s.mcap ? `${usd(s.mcap)} mkt cap` : '—';
      if (s.thin && !c.querySelector('.thin')) c.insertAdjacentHTML('beforeend', '<span class="thin">thin market</span>');
      mini(c.querySelector('canvas'), s.ch24, i * 7 + 3);
    });
  };
  onPrices(fill);
  return { cards };
}
