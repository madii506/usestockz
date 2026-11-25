// STOCKZ app: the full launcher with a live coin card, the stock board, wallet x-ray, calculator and the coins board
import { $, $$, esc, isAddr, short, usd, store, toast } from './util.js';
import { bySym, onPrices, priceOf } from './data.js';
import { shell, connect, wallet } from './shell.js';
import { mountBoard } from './board.js';
import { mountCalc, picks } from './calc.js';
import { mountXray } from './xray.js';
import { coinCard, cardPng } from './card.js';
import { stillArt } from './halftone.js';

// the sidebar points at tabs on this page
const TABS = ['launch', 'stocks', 'xray', 'calc', 'coins'];
$$('.nav a').forEach(a => { if (TABS.includes(a.dataset.nav)) a.setAttribute('href', '/app#' + a.dataset.nav); });
const ui = shell({ page: 'launch', onNav: h => route(h) });
function route(h = location.hash) {
  const m = /#(\w+)(?:=(.+))?/.exec(h || '#launch'); let v = m ? m[1] : 'launch'; if (!TABS.includes(v)) v = 'launch';
  $$('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.v === v));
  $$('.view').forEach(s => s.classList.toggle('on', s.dataset.view === v));
  ui.mark(v);
  if (v === 'xray' && m && m[2] && isAddr(decodeURIComponent(m[2]))) xr.run(decodeURIComponent(m[2]));
  if (v === 'calc') requestAnimationFrame(() => calc.set(S));
  if (v === 'coins') requestAnimationFrame(() => stillArt($('#emptyArt'), { candles: 5, seed: 21, dissolve: 3 }));
  if (v === 'xray') requestAnimationFrame(() => { const a = $('#xrArt'); a && stillArt(a, { candles: 4, seed: 11, dissolve: 2 }); });
}
$('#tabs').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; history.replaceState(null, '', '#' + b.dataset.v); route(); });
$$('[data-go]').forEach(b => b.addEventListener('click', () => { history.replaceState(null, '', '#' + b.dataset.go); route(); }));
addEventListener('hashchange', () => route());

// the draft, shared with the home page
const qs = new URLSearchParams(location.search).get('stock');
const draft = Object.assign({ to: '', sym: 'NVDA', name: '', tick: '', desc: '', x: '', web: '', buy: 0 }, store.get('stockz:draft', {}));
if (qs && bySym[qs.toUpperCase()]) draft.sym = qs.toUpperCase();
if (!bySym[draft.sym]) draft.sym = 'NVDA';
let S = draft.sym, IMG = null;
const save = () => store.set('stockz:draft', { ...draft, sym: S });

const card = coinCard($('#aCard'));
const F = { to: $('#aTo'), name: $('#aName'), tick: $('#aTick'), desc: $('#aDesc'), x: $('#aX'), web: $('#aWeb') };
Object.entries(F).forEach(([k, el]) => { el.value = draft[k] || ''; el.addEventListener('input', () => { if (k === 'tick') el.value = el.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); draft[k] = el.value.trim(); save(); render(); }); });
const buy = $('#aBuy'), paintR = el => el.style.setProperty('--p', `${((el.value - el.min) / (el.max - el.min)) * 100}%`);
buy.value = draft.buy || 0; buy.addEventListener('input', () => { draft.buy = +buy.value; save(); render(); });
const P = picks($('#aPicks'), S, v => { S = v; save(); render(); board.cards.forEach(c => c.classList.toggle('pick', c.dataset.sym === v)); });
$('#aMine').addEventListener('click', async () => { const pk = wallet() || await connect(); if (pk) { F.to.value = pk; draft.to = pk; save(); render(); } });

// the image: redrawn on a canvas, so nothing hidden in the file survives
const file = $('#aFile'), drop = $('#aDrop');
const take = f => { if (!f || !/^image\/(png|jpeg|gif|webp)$/.test(f.type)) return toast('PNG, JPG, GIF or WebP only'); if (f.size > 8e6) return toast('Under 8 MB, please'); const im = new Image(); im.onload = () => { IMG = im; render(); URL.revokeObjectURL(im.src); }; im.src = URL.createObjectURL(f); };
file.addEventListener('change', () => take(file.files[0]));
drop.addEventListener('dragover', e => { e.preventDefault(); drop.style.borderColor = 'var(--g)'; });
drop.addEventListener('dragleave', () => (drop.style.borderColor = ''));
drop.addEventListener('drop', e => { e.preventDefault(); drop.style.borderColor = ''; take(e.dataTransfer.files[0]); });

function render() {
  paintR(buy); $('#aoBuy').textContent = +buy.value ? `${(+buy.value).toFixed(2)} SOL` : 'none';
  const d = { ...draft, sym: S, img: IMG };
  card(d);
  const c = $('#aImg'); const cx = c.getContext('2d'); cx.clearRect(0, 0, 128, 128); if (IMG) { const r = Math.max(128 / IMG.width, 128 / IMG.height); cx.drawImage(IMG, (128 - IMG.width * r) / 2, (128 - IMG.height * r) / 2, IMG.width * r, IMG.height * r); }
  const p = priceOf(S), ok = isAddr(draft.to);
  $('#aSum').innerHTML = `
    <div><span>Gets paid</span><b>${draft.to ? (ok ? esc(short(draft.to, 6)) : '<span style="color:var(--red)">not a Solana wallet yet</span>') : '—'}</b></div>
    <div><span>Paid in</span><b>${S} · ${esc(bySym[S].name)}${p ? ` · ${usd(p.price)}` : ''}</b></div>
    <div><span>Creator on chain</span><b>a fresh coin wallet</b></div>
    <div><span>Payouts</span><b>every hour, sealed with Umbra</b></div>
    <div><span>First buy</span><b>${+buy.value ? `${(+buy.value).toFixed(2)} SOL` : 'none'}</b></div>`;
}
onPrices(render); render();
// share the draft on X: the text says exactly what the coin will do
$('#aShare').addEventListener('click', e => {
  const t = draft.tick ? `$${draft.tick}` : 'my coin', who = isAddr(draft.to) ? short(draft.to, 4) : 'a wallet';
  const text = `Launching ${t} on Stockz: every hour its creator fees buy ${S} and pay ${who}, privately.`;
  e.currentTarget.href = 'https://x.com/intent/post?text=' + encodeURIComponent(text + '\n\n' + location.origin);
});

$('#aForm').addEventListener('submit', e => {
  e.preventDefault();
  const miss = !isAddr(draft.to) ? 'Add the wallet that gets paid' : !draft.name ? 'Name the coin' : !draft.tick ? 'Add a ticker' : null;
  if (miss) { toast(miss); return; }
  $('#aState').textContent = 'Launches open soon. Your draft is saved in this browser, ready for launch day.'; toast('Draft saved. Launches open soon.');
});
$('#aPng').addEventListener('click', async () => {
  const b = await cardPng({ ...draft, sym: S, img: IMG }); if (!b) return toast('Could not make the PNG');
  const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `${(draft.tick || 'stockz').toLowerCase()}-card.png`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
});

// stocks, x-ray, calculator
const board = mountBoard($('#aBoard'), { pick: S, onPick: sym => { S = sym; P.set(sym); save(); render(); history.replaceState(null, '', '#launch'); route(); toast(`Paid in ${sym}`); } });
$$('.rv').forEach(el => el.classList.add('vis'));
const xr = mountXray({ form: $('#xrForm'), input: $('#xrIn'), out: $('#xrOut'), err: $('#xrErr'), me: $('#xrMe') });
const calc = mountCalc({ vol: $('#cVol'), fee: $('#cFee'), oVol: $('#oVol'), oFee: $('#oFee'), pickRoot: $('#cPicks'), day: $('#cDay'), shares: $('#cShares'), month: $('#cMonth'), canvas: $('#calcCv'), note: $('#cNote'), sym: S, coinForm: $('#cCoin'), coinIn: $('#cCoinIn'), coinNote: $('#cCoinNote') });
route();
