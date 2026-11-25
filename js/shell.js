// The app shell every page shares: sidebar + drawer, the top bar, search, wallet connect, the $STOCKZ pill,
// the live price tape, the cursor dot and magnetic buttons.
import { $, $$, esc, isAddr, short, copy, toast, usd, pct, reduced } from './util.js';
import { STOCKS, logo, onPrices, startPrices, config } from './data.js';

export function shell({ page = 'home', onNav } = {}) {
  // drawer on small screens
  const open = v => document.body.classList.toggle('drawer', v);
  $('#menuBtn')?.addEventListener('click', () => open(true));
  $('#scrim')?.addEventListener('click', () => open(false));
  $$('.nav a').forEach(a => a.addEventListener('click', () => open(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape') open(false); });
  // top bar turns solid once the page moves
  const top = $('#top'); const solid = () => top?.classList.toggle('solid', scrollY > 10); addEventListener('scroll', solid, { passive: true }); solid();
  // nav state
  const mark = id => $$('.nav a').forEach(a => a.classList.toggle('on', a.dataset.nav === id));
  mark(page);
  // search: stocks by symbol or name, or a wallet to x-ray
  const q = $('#q'), res = $('#qres'); let hl = -1, items = [];
  const go = it => { res.classList.remove('show'); q.blur(); if (it.href) location.href = it.href; };
  const render = () => {
    const v = q.value.trim(); items = [];
    if (isAddr(v)) items.push({ html: `<b style="font-family:var(--mono)">${esc(short(v, 6))}</b>`, sub: 'X-ray this wallet', href: (page === 'home' ? '' : '/') + `#xray=${encodeURIComponent(v)}` });
    const low = v.toLowerCase();
    if (v) STOCKS.filter(s => s.sym.toLowerCase().includes(low) || s.name.toLowerCase().includes(low)).slice(0, 6)
      .forEach(s => items.push({ html: `${logo(s.sym, 'tlg')}<span style="margin:0;font:700 15px var(--disp);color:var(--ink)">${s.sym}</span>`, sub: s.name, href: `/app?stock=${s.sym}#launch` }));
    if (v && !items.length) items.push({ html: 'No stock or wallet matches', sub: '' });
    res.innerHTML = items.map((it, i) => `<a href="${it.href || '#'}" data-i="${i}" class="${i === hl ? 'hl' : ''}">${it.html}<span>${esc(it.sub)}</span></a>`).join('');
    res.querySelectorAll('.tlg').forEach(i => (i.style.cssText = 'width:26px;height:26px'));
    res.classList.toggle('show', !!v);
  };
  q?.addEventListener('input', () => { hl = -1; render(); });
  q?.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); hl = (hl + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % Math.max(1, items.length); render(); }
    if (e.key === 'Enter') { e.preventDefault(); const it = items[hl < 0 ? 0 : hl]; if (it) { go(it); if (it.href && it.href.startsWith('#')) onNav?.(it.href); } }
    if (e.key === 'Escape') { res.classList.remove('show'); q.blur(); }
  });
  res?.addEventListener('click', e => { const a = e.target.closest('a'); if (!a) return; const it = items[+a.dataset.i]; if (!it || !it.href) { e.preventDefault(); return; } if (it.href.startsWith('#')) { e.preventDefault(); go(it); history.replaceState(null, '', it.href); onNav?.(it.href); } });
  document.addEventListener('click', e => { if (!e.target.closest('.search')) res?.classList.remove('show'); });
  addEventListener('keydown', e => { if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') { e.preventDefault(); q?.focus(); } });

  // wallet connect (read only: we only ever read the public key)
  const cbtn = $('#connect');
  const setBtn = pk => { if (!cbtn) return; cbtn.textContent = pk ? short(pk, 4) : 'Connect wallet'; cbtn.classList.toggle('g', !!pk); };
  cbtn?.addEventListener('click', async () => { const pk = await connect(); setBtn(pk); });
  setBtn(walletKey);

  // $STOCKZ pill: shows the CA once it's set in Vercel
  config().then(c => {
    const ca = c && c.ca; const txt = $('#caTxt'), cp = $('#caCopy'), buy = $('#caBuy'), ch = $('#caChart');
    if (!ca) return;
    if (txt) txt.textContent = short(ca, 6);
    [cp, buy, ch].forEach(el => el?.setAttribute('aria-disabled', 'false'));
    cp?.addEventListener('click', () => copy(ca, 'Contract address copied'));
    if (buy) buy.href = `https://pump.fun/coin/${ca}`; if (ch) ch.href = `https://dexscreener.com/solana/${ca}`;
    const w = $('.capill .where'); if (w) w.textContent = 'Live on pump.fun';
  });
  $('#caPill')?.addEventListener('click', e => { const t = $('#ca'); if (t) { e.preventDefault(); t.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' }); } });

  // live tape
  const tape = $('#tape');
  if (tape) {
    const draw = st => {
      const list = STOCKS.map(s => ({ ...s, ...(st.stocks ? st.stocks.find(x => x.sym === s.sym) || {} : {}) }));
      const one = list.map(s => `<span class="tape-item">${logo(s.sym, 'tlg')}${s.sym}<span class="num">${s.thin ? 'thin market' : usd(s.price)}</span><span class="num ${s.ch24 >= 0 ? 'up' : 'dn'}">${s.thin ? '' : pct(s.ch24)}</span></span>`).join('');
      tape.innerHTML = one + one;
      tape.querySelectorAll('.tlg').forEach(i => (i.style.cssText = 'width:22px;height:22px'));
    };
    draw({}); onPrices(draw);
  }
  startPrices();

  // cursor dot + magnetic buttons (pointer devices only)
  if (matchMedia('(pointer: fine)').matches && !reduced) {
    const cur = $('.cursor'); let cx = -50, cy = -50, tx = -50, ty = -50;
    addEventListener('pointermove', e => { tx = e.clientX; ty = e.clientY; cur?.classList.add('on'); cur?.classList.toggle('big', !!e.target.closest('a,button,input,[role=button],.stk')); }, { passive: true });
    const loop = () => { cx += (tx - cx) * 0.25; cy += (ty - cy) * 0.25; if (cur) cur.style.transform = `translate(${cx}px,${cy}px)`; requestAnimationFrame(loop); }; loop();
    $$('.mag').forEach(b => {
      b.addEventListener('pointermove', e => { const r = b.getBoundingClientRect(); b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.18}px,${(e.clientY - r.top - r.height / 2) * 0.24}px)`; });
      b.addEventListener('pointerleave', () => (b.style.transform = ''));
    });
  }
  return { mark };
}

// ---- wallet: Phantom, Solflare or Backpack, read-only
let walletKey = null;
try { walletKey = sessionStorage.getItem('stockz:wallet'); } catch { }
export const wallet = () => walletKey;
export async function connect() {
  const prov = window.phantom?.solana || window.solflare || window.backpack || window.solana;
  if (!prov) { toast('No Solana wallet found in this browser'); return null; }
  try {
    const r = await prov.connect(); const pk = (r && r.publicKey ? r.publicKey : prov.publicKey)?.toString();
    if (pk) { walletKey = pk; try { sessionStorage.setItem('stockz:wallet', pk); } catch { } toast('Wallet connected, read only'); }
    return pk || null;
  } catch { toast('Connection cancelled'); return null; }
}
