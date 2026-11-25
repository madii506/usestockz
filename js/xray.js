// the wallet x-ray: what any Solana wallet's stock holdings look like to everyone (read from Solana through /api/xray)
import { $, esc, isAddr, short, usd, num, sol } from './util.js';
import { logo } from './data.js';
import { connect, wallet } from './shell.js';
import { stillArt } from './halftone.js';

export function mountXray({ form, input, out, err, me, art }) {
  if (art) stillArt(art, { candles: 4, seed: 11, dissolve: 2 });
  let busy = false;
  async function run(addr) {
    addr = String(addr || '').trim(); err.textContent = '';
    if (!isAddr(addr)) { err.textContent = 'That is not a Solana wallet address.'; return; }
    if (busy) return; busy = true; input.value = addr;
    out.innerHTML = `<div class="xr-head"><div><span>Reading Solana</span></div><span>${esc(short(addr, 6))}</span></div><div class="xr-list">${'<div class="xr-row"><span class="tlg sk"></span><div><b class="sk">NVDA</b><small class="sk">0.0000 shares</small></div><em class="sk">$0.00</em></div>'.repeat(3)}</div>`;
    try {
      const r = await fetch('/api/xray?wallet=' + encodeURIComponent(addr), { cache: 'no-store' }); const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'read failed');
      const n = j.holdings.length;
      out.innerHTML = `
        <div class="xr-head"><div><b class="num">${usd(j.total)}</b><br><span>in tokenized stocks, visible to anyone</span></div><span>${esc(short(addr, 6))}</span></div>
        <div class="xr-list">${n ? j.holdings.map((h, i) => `<div class="xr-row" style="animation-delay:${i * 60}ms">${logo(h.sym)}<div><b>${esc(h.sym)}</b><small>${num(h.amount, h.amount < 1 ? 4 : 2)} shares</small></div><em>${usd(h.value)}</em></div>`).join('')
          : `<div class="xr-row"><span class="tlg tlg0">0</span><div><b>No tokenized stocks</b><small>${j.tokens} token account${j.tokens === 1 ? '' : 's'} · ${sol(j.sol, 3)} public</small></div><em>${usd(j.solValue)}</em></div>`}</div>
        <div class="xr-warn" style="margin-top:16px">${n ? `Anyone can read these ${n} position${n === 1 ? '' : 's'}, their size and every change, forever.` : 'Nothing in stocks here, but every token and every SOL in this wallet is public all the same.'} Stockz pays into a private balance instead, where this view stays empty.</div>`;
    } catch (e) {
      out.innerHTML = `<div class="xr-empty">Couldn't read Solana right now. Try again in a moment.</div>`;
      err.textContent = String(e.message || e).slice(0, 120);
    } finally { busy = false; }
  }
  form.addEventListener('submit', e => { e.preventDefault(); run(input.value); });
  me?.addEventListener('click', async () => { const pk = wallet() || await connect(); if (pk) run(pk); });
  return { run };
}
