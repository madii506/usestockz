// the stock reel: twelve big live cards; on desktop the page's vertical scroll slides them sideways
import { esc, usd, pct, rng, clamp, reduced, mobile } from './util.js';
import { STOCKS, logo, onPrices } from './data.js';
import { roll } from './roll.js';

function art(cv, ch, seed) {
  const r = cv.getBoundingClientRect(); const W = r.width || 300, H = r.height || 180, dpr = Math.min(1.5, devicePixelRatio || 1);
  cv.width = W * dpr; cv.height = H * dpr; const c = cv.getContext('2d'); c.scale(dpr, dpr); c.clearRect(0, 0, W, H);
  const R = rng(seed), n = 9, g = 7, up = ch == null || ch >= 0; let lvl = 0.45;
  for (let i = 0; i < n; i++) {
    lvl += (R() - 0.5) * 0.24 + (up ? 0.03 : -0.03); lvl = clamp(lvl, 0.12, 0.88);
    const x = (i + 0.5) * (W / n), cy = H * (1 - lvl), h = H * (0.18 + R() * 0.25), w = W / n * 0.5, rr = w / 2;
    for (let y = cy - h / 2 - h * 0.25; y < cy + h / 2 + h * 0.25; y += g * 0.87) for (let xx = x - w; xx < x + w; xx += g) {
      const top = cy - h / 2 + rr, bot = cy + h / 2 - rr, py = Math.min(bot, Math.max(top, y)), dx = (xx - x) / rr, dy = (y - py) / rr, q = dx * dx + dy * dy;
      let v; if (q <= 1) v = Math.max(0, dx * -0.46 + dy * -0.42 + Math.sqrt(1 - q) * 0.78) ** 1.25 * 0.95 + 0.05; else if (Math.abs(xx - x) < g * 0.6) v = 0.35; else continue;
      c.fillStyle = up ? `rgba(${Math.round(20 + 140 * v)},${Math.round(130 + 125 * v)},${Math.round(80 + 125 * v)},${0.35 + 0.5 * v})` : `rgba(255,${Math.round(90 + 60 * v)},${Math.round(90 + 60 * v)},${0.25 + 0.45 * v})`;
      c.beginPath(); c.arc(xx, y, g * 0.45 * Math.sqrt(v), 0, 6.2832); c.fill();
    }
  }
}

export function mountReel({ track, section, pin, bar, onPick, pick }) {
  track.innerHTML = STOCKS.map((s, i) => `
    <article class="rc" data-sym="${s.sym}">
      <canvas aria-hidden="true"></canvas>
      <div class="rc-top">${logo(s.sym)}<div><div class="rc-sym">${s.sym}</div><div class="rc-name">${esc(s.name)}</div></div></div>
      <div class="rc-px num" aria-live="off">—</div>
      <span class="rc-ch num">live price loading</span>
      <span class="rc-mc">${s.cat === 'index' ? 'ETF' : s.cat === 'metal' ? 'metal ETF' : 'stock'}</span>
      <a class="btn g sm rc-go" href="/app?stock=${s.sym}#launch" data-stock="${s.sym}">Pay in ${s.sym} <span class="ar">→</span></a>
    </article>`).join('');
  const cards = [...track.querySelectorAll('.rc')];
  const mark = sym => cards.forEach(c => c.classList.toggle('pick', c.dataset.sym === sym));
  if (pick) mark(pick);
  cards.forEach(c => c.addEventListener('click', e => { if (e.target.closest('.rc-go')) return; mark(c.dataset.sym); onPick && onPick(c.dataset.sym); }));
  onPrices(st => cards.forEach((c, i) => {
    const s = st.stocks ? st.stocks.find(x => x.sym === c.dataset.sym) : null; const px = c.querySelector('.rc-px'), ch = c.querySelector('.rc-ch'), mc = c.querySelector('.rc-mc');
    if (!s) { if (st.at) { px.textContent = '—'; ch.textContent = 'offline'; } return; }
    roll(px, usd(s.price)); ch.textContent = `${s.ch24 >= 0 ? '▲' : '▼'} ${pct(s.ch24)} today`; ch.className = `rc-ch num ${s.ch24 >= 0 ? 'up' : 'dn'}`;
    mc.textContent = `${s.mcap ? usd(s.mcap) + ' market cap · ' : ''}${s.cat === 'index' ? 'ETF' : s.cat === 'metal' ? 'metal ETF' : 'stock'}`;
    if (s.thin && !c.querySelector('.thin')) c.insertAdjacentHTML('beforeend', '<span class="thin">thin market</span>');
    art(c.querySelector('canvas'), s.ch24, i * 13 + 5);
  }));
  // desktop: pin the section and slide the strip as you scroll through it
  let span = 0; const geo = { x0: 0, c: [] };
  const lead = () => Math.round(innerHeight * 0.16);
  const head = pin.querySelector('.reel-head');
  const size = () => {
    if (mobile() || reduced) { section.style.height = ''; track.style.transform = ''; track.style.paddingLeft = track.style.paddingRight = ''; return; }
    const pad = head ? Math.max(24, Math.round(head.getBoundingClientRect().left - pin.getBoundingClientRect().left)) : 40;
    track.style.paddingLeft = track.style.paddingRight = pad + 'px'; if (bar) bar.parentElement.style.margin = `0 ${pad}px`;
    span = Math.max(0, track.scrollWidth - pin.clientWidth);
    geo.x0 = pin.getBoundingClientRect().left; geo.c = cards.map(c => c.offsetLeft + c.offsetWidth / 2);
    section.style.height = `${innerHeight + span + lead() * 2}px`;
  };
  let cur = 0, target = 0, raf = 0;
  const tick = () => {
    cur += (target - cur) * 0.14; if (Math.abs(target - cur) < 0.2) cur = target;
    track.style.transform = `translate3d(${-cur}px,0,0)`; if (bar) bar.style.transform = `scaleX(${span ? cur / span : 0})`;
    // cards ease in as they cross the middle of the screen
    const mid = innerWidth / 2;
    cards.forEach((c, i) => { const d = Math.min(1, Math.abs(geo.x0 + geo.c[i] - cur - mid) / (innerWidth * 0.7)); c.style.opacity = (1 - d * 0.45).toFixed(3); });
    raf = cur !== target ? requestAnimationFrame(tick) : 0;
  };
  const onScroll = () => {
    if (mobile() || reduced) { cards.forEach(c => (c.style.opacity = '')); return; }
    const r = section.getBoundingClientRect(); target = clamp(-r.top - lead(), 0, span);
    if (!raf) raf = requestAnimationFrame(tick);
  };
  size(); addEventListener('resize', () => { size(); onScroll(); }); addEventListener('scroll', onScroll, { passive: true }); onScroll();
  return { mark };
}
