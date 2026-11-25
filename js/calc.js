// the calculator: daily volume x creator fee -> SOL a day -> shares of the picked stock at live prices, over 30 days
import { $, num, usd, sol, ease } from './util.js';
import { STOCKS, logo, onPrices, prices } from './data.js';

export function picks(root, sel, onChange) {
  root.innerHTML = STOCKS.map(s => `<button type="button" class="pk${s.sym === sel ? ' on' : ''}" data-sym="${s.sym}">${logo(s.sym, 'tlg')}${s.sym}</button>`).join('');
  root.querySelectorAll('.pk .tlg').forEach(i => (i.style.cssText = 'width:28px;height:28px'));
  root.addEventListener('click', e => { const b = e.target.closest('.pk'); if (!b) return; root.querySelectorAll('.pk').forEach(x => x.classList.toggle('on', x === b)); onChange(b.dataset.sym); });
  return { set(sym) { root.querySelectorAll('.pk').forEach(x => x.classList.toggle('on', x.dataset.sym === sym)); } };
}

export function mountCalc({ vol, fee, oVol, oFee, pickRoot, day, shares, month, canvas, note, sym = 'NVDA', coinForm, coinIn, coinNote }) {
  let S = sym, anim = 1, from = null;
  const P = picks(pickRoot, S, v => { S = v; update(); });
  const paint = el => el.style.setProperty('--p', `${((el.value - el.min) / (el.max - el.min)) * 100}%`);
  const draw = (sh, k) => {
    const r = canvas.getBoundingClientRect(); const W = r.width, H = r.height, dpr = Math.min(2, devicePixelRatio || 1);
    if (!W) return; canvas.width = W * dpr; canvas.height = H * dpr; const c = canvas.getContext('2d'); c.scale(dpr, dpr);
    c.clearRect(0, 0, W, H);
    const pad = 28, days = 30, max = sh * days || 1, bw = (W - pad) / days;
    c.strokeStyle = 'rgba(255,255,255,0.06)'; c.lineWidth = 1;
    for (let i = 0; i <= 4; i++) { const y = 8 + (H - 30) * (i / 4); c.beginPath(); c.moveTo(pad, y); c.lineTo(W, y); c.stroke(); }
    c.fillStyle = '#6c7671'; c.font = '500 11px JB, monospace';
    c.fillText('day 1', pad, H - 6); c.fillText('day 30', W - 44, H - 6);
    for (let d = 0; d < days; d++) {
      const val = sh * (d + 1) * Math.min(1, Math.max(0, k * days - d)), h = (H - 30) * (val / max), x = pad + d * bw + bw / 2;
      const g = Math.max(3, bw * 0.36);
      for (let y = H - 22; y > H - 22 - h; y -= g * 1.05) {
        const t = (H - 22 - y) / (H - 30); c.fillStyle = `rgba(${Math.round(20 + 140 * t)},${Math.round(150 + 105 * t)},${Math.round(90 + 115 * t)},0.95)`;
        c.beginPath(); c.arc(x, y, g * 0.42, 0, 6.2832); c.fill();
      }
    }
  };
  function update() {
    const v = +vol.value, f = +fee.value; paint(vol); paint(fee);
    oVol.textContent = `${v.toLocaleString('en-US')} SOL`; oFee.textContent = `${f.toFixed(2)}%`;
    const st = prices(); const p = st.stocks ? st.stocks.find(x => x.sym === S) : null; const sp = st.sol ? st.sol.price : null;
    const feeSol = v * f / 100, feeUsd = sp ? feeSol * sp : null, sh = feeUsd && p && p.price ? feeUsd / p.price : null;
    day.textContent = sol(feeSol, 3);
    shares.innerHTML = sh != null ? `${num(sh, sh < 1 ? 4 : 2)} ${S}` : '—';
    month.textContent = sh != null ? `${num(sh * 30, 2)} · ${usd(sh * 30 * p.price, 0)}` : '—';
    if (note) note.textContent = sh != null ? `At $${num(sp, 2)} a SOL and ${usd(p.price)} a ${S} share, before swap costs. An estimate, not a promise: fees follow trading.` : 'Live prices are offline, so share counts are hidden. Fees in SOL still add up.';
    from = performance.now(); anim = 0; const go = now => { anim = Math.min(1, (now - from) / 700); draw(sh || 0, ease(anim)); if (anim < 1) requestAnimationFrame(go); }; requestAnimationFrame(go);
  }
  vol.addEventListener('input', () => { if (coinNote) coinNote.textContent = ''; update(); }); fee.addEventListener('input', update);
  coinForm?.addEventListener('submit', async e => {
    e.preventDefault(); const ca = coinIn.value.trim(); coinNote.style.color = '';
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(ca)) { coinNote.textContent = 'That is not a Solana token address.'; coinNote.style.color = 'var(--red)'; return; }
    coinNote.textContent = 'Reading its last 24 hours…';
    try {
      const r = await fetch('/api/coin?ca=' + encodeURIComponent(ca)); const j = await r.json(); if (!r.ok) throw new Error(j.error || 'not found');
      const sp = prices().sol ? prices().sol.price : null; if (!sp) throw new Error('SOL price is offline');
      const v = Math.max(5, Math.round(j.vol24 / sp / 5) * 5); if (v > +vol.max) vol.max = String(Math.ceil(v / 1000) * 1000);
      vol.value = String(v); update();
      coinNote.textContent = `Using $${(j.symbol || '').replace(/[<>&]/g, '')}'s last 24 hours: ${usd(j.vol24, 0)} traded, about ${v.toLocaleString('en-US')} SOL.`;
    } catch (err) { coinNote.textContent = String(err.message || err); coinNote.style.color = 'var(--red)'; }
  });
  onPrices(update); addEventListener('resize', () => update());
  update();
  return { set(sym) { S = sym; P.set(sym); update(); } };
}
