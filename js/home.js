// STOCKZ home: smooth scroll, the halftone hero, live board, the pinned story, the privacy slider, calculator, x-ray,
// a launch draft that builds its coin card live, and the closing field.
import { $, $$, esc, isAddr, short, usd, num, store, toast, reduced, mobile } from './util.js';
import { STOCKS, bySym, logo, logoUrl, onPrices, prices, priceOf } from './data.js';
import { shell } from './shell.js';
import { createField, stillArt } from './halftone.js';
import { mountReel } from './reel.js';
import { playIntro } from './intro.js';
import { mountCoin } from './coin3d.js';
import { mountCalc, picks } from './calc.js';
import { mountXray } from './xray.js';
import { mountStory } from './story.js';
import { coinCard } from './card.js';

// smooth scroll
let lenis = null;
if (!reduced && window.Lenis && !matchMedia('(pointer: coarse)').matches) {
  lenis = new window.Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 0.9 });
  if (document.documentElement.classList.contains('intro')) lenis.stop();
  const raf = t => { lenis.raf(t); requestAnimationFrame(raf); }; requestAnimationFrame(raf);
}
const go = (h, offset = -10) => { const el = $(h); if (!el) return; if (lenis) lenis.scrollTo(el, { offset, duration: 1.3 }); else el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }); };
$$('a[href^="#"], a[href^="/#"]').forEach(a => a.addEventListener('click', e => {
  const h = a.getAttribute('href').replace(/^\//, ''); if (h.length > 1 && $(h.split('=')[0])) { e.preventDefault(); go(h.split('=')[0]); history.replaceState(null, '', h); }
}));

const ui = shell({ page: 'home', onNav: h => hashNav(h) });
playIntro().then(() => { const wait = () => document.documentElement.classList.contains('intro') ? setTimeout(wait, 100) : lenis && lenis.start(); wait(); });

// the hero field and the closing field
createField($('#field'), { candles: 15, seed: 3, top: 0.16, bottom: 0.86, gap: 10 });
createField($('#finalCv'), { candles: 22, seed: 8, top: 0.2, bottom: 0.9, heightK: 0.8, particles: false });

// words that arrive, blocks that rise
$$('.split-words').forEach(el => {
  const walk = n => [...n.childNodes].forEach(c => {
    if (c.nodeType === 3) { const f = document.createDocumentFragment(); c.textContent.split(/(\s+)/).forEach(t => { if (!t) return; if (/^\s+$/.test(t)) f.append(t); else { const s = document.createElement('span'); s.className = 'w'; s.textContent = t; f.append(s); } }); c.replaceWith(f); }
    else if (c.nodeType === 1) walk(c);
  });
  walk(el); $$('.w', el).forEach((w, i) => (w.style.transitionDelay = `${i * 0.05}s`));
});
const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('vis'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -10% 0px' });
const watch = () => $$('.rv:not(.vis), .split-words:not(.vis)').forEach(el => io.observe(el));
watch();

// nav highlight follows the section in view
const secs = ['stocks', 'calc', 'xray', 'privacy', 'coins'].map(id => $('#' + id)).filter(Boolean);
addEventListener('scroll', () => {
  let cur = 'home'; for (const s of secs) if (s.getBoundingClientRect().top < innerHeight * 0.45) cur = s.id === 'coins' ? 'coins' : s.id;
  if (scrollY < innerHeight * 0.5) cur = 'home'; ui.mark(cur);
}, { passive: true });

// one stock follows you through the page
let SYM = (store.get('stockz:draft', {}).sym) || 'NVDA'; if (!bySym[SYM]) SYM = 'NVDA';
const setStock = sym => { SYM = sym; calc.set(sym); story.setStock(sym); lp.set(sym); reel.mark(sym); draft.sym = sym; store.set('stockz:draft', draft); render(); paintReveal(); };

// the stock reel
const reel = mountReel({ track: $('#reel'), section: $('#stocks'), pin: $('#reelPin'), bar: $('#reelBar'), pick: SYM, onPick: sym => { setStock(sym); toast(`Paid in ${sym}`); } });
requestAnimationFrame(watch);

// story
const story = mountStory({ root: $('#how'), canvas: $('#storyCv'), steps: $('#steps'), rail: $('#rail'), tag: $('#vizTag'), hud: { fee: $('#hudFee'), stock: $('#hudStock'), seen: $('#hudSeen') } });
story.setStock(SYM);

// privacy slider: drag to see through the encryption
const rv = $('#reveal'), hd = $('#rvHandle');
const setCut = x => { const r = rv.getBoundingClientRect(); const k = Math.min(0.94, Math.max(0.06, (x - r.left) / r.width)); rv.style.setProperty('--cut', `${k * 100}%`); };
let drag = false;
hd.addEventListener('pointerdown', e => { drag = true; hd.setPointerCapture(e.pointerId); });
hd.addEventListener('pointermove', e => drag && setCut(e.clientX));
hd.addEventListener('pointerup', () => (drag = false));
rv.addEventListener('click', e => { if (!e.target.closest('#rvHandle')) setCut(e.clientX); });
hd.querySelector('button').addEventListener('keydown', e => { const cur = parseFloat(getComputedStyle(rv).getPropertyValue('--cut')) || 55; if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); rv.style.setProperty('--cut', `${Math.min(94, Math.max(6, cur + (e.key === 'ArrowLeft' ? -5 : 5)))}%`); } });
// a gentle hint: the line sweeps once when the slider first comes into view
new IntersectionObserver(([e], o) => { if (!e.isIntersecting || reduced) return; o.disconnect(); let t0 = performance.now(); const an = now => { const t = (now - t0) / 1600; if (t > 1 || drag) return; rv.style.setProperty('--cut', `${55 + Math.sin(t * Math.PI * 2) * 22}%`); requestAnimationFrame(an); }; requestAnimationFrame(an); }, { threshold: 0.5 }).observe(rv);
// the public side scrambles: ciphertext that never settles
const HEX = '0123456789abcdef';
const scr = $$('.hx[data-scr]');
setInterval(() => { if (document.hidden) return; scr.forEach(el => { const n = +el.dataset.scr; let s = ''; for (let i = 0; i < n; i++) s += HEX[(Math.random() * 16) | 0]; el.textContent = el.closest('.rv-big') ? s : s.replace(/(.{4})/g, '$1 ').trim(); }); }, 110);
function paintReveal() {
  const p = priceOf(SYM), st = prices(); const s = bySym[SYM];
  $('#rvAsset').textContent = `${SYM} · ${s.name}`;
  const logoEl = $('#rvLogo'); logoEl.src = logoUrl(SYM); logoEl.onerror = () => (logoEl.style.visibility = 'hidden');
  const fee = 1.2, sh = p && st.sol ? fee * st.sol.price / p.price : null;
  $('#rvAmt').textContent = sh != null ? `${num(sh, 4)} shares` : 'live price offline';
  $('#rvVal').textContent = sh != null ? usd(sh * p.price) : '—';
  $('#rvVal').nextElementSibling.textContent = 'one day of fees from a coin trading 400 SOL a day, at the live price. Readable by that wallet only.';
}
onPrices(paintReveal);

// calculator
const calc = mountCalc({ vol: $('#cVol'), fee: $('#cFee'), oVol: $('#oVol'), oFee: $('#oFee'), pickRoot: $('#cPicks'), day: $('#cDay'), shares: $('#cShares'), month: $('#cMonth'), canvas: $('#calcCv'), note: $('#cNote'), sym: SYM, coinForm: $('#cCoin'), coinIn: $('#cCoinIn'), coinNote: $('#cCoinNote') });

// x-ray
const xr = mountXray({ form: $('#xrForm'), input: $('#xrIn'), out: $('#xrOut'), err: $('#xrErr'), me: $('#xrMe'), art: $('#xrArt') });
function hashNav(h) { const m = /#xray=([1-9A-HJ-NP-Za-km-z]{32,44})/.exec(h || location.hash); if (m) { go('#xray'); xr.run(m[1]); } }
hashNav(location.hash);
addEventListener('hashchange', () => hashNav(location.hash));

// launch draft (shared with /app)
const draft = Object.assign({ to: '', sym: SYM, name: '', tick: '', desc: '' }, store.get('stockz:draft', {}));
const card = coinCard($('#coinCard'));
const F = { to: $('#lTo'), name: $('#lName'), tick: $('#lTick') };
Object.entries(F).forEach(([k, el]) => { el.value = draft[k] || ''; el.addEventListener('input', () => { if (k === 'tick') el.value = el.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); draft[k] = el.value.trim(); store.set('stockz:draft', draft); render(); }); });
const lp = picks($('#lPicks'), SYM, v => setStock(v));
function render() {
  card({ ...draft, sym: SYM });
  const p = priceOf(SYM); const ok = isAddr(draft.to);
  $('#lSum').innerHTML = `<div><span>Gets paid</span><b>${draft.to ? (ok ? esc(short(draft.to, 6)) : '<span style="color:var(--red)">not a wallet yet</span>') : '—'}</b></div>
    <div><span>Paid in</span><b>${SYM} · ${esc(bySym[SYM].name)}</b></div><div><span>${SYM} right now</span><b class="num">${p ? usd(p.price) : '—'}</b></div>
    <div><span>Status</span><b>Launches open soon</b></div>`;
}
onPrices(render); render();

// coins: an honest empty state
stillArt($('#emptyArt'), { candles: 5, seed: 21, dissolve: 3 });

// help the first load: reveal anything already on screen
setTimeout(watch, 200);

// scroll progress along the top
const prog = $('#prog');
addEventListener('scroll', () => { const h = document.documentElement.scrollHeight - innerHeight; if (prog) prog.style.transform = `scaleX(${h > 0 ? scrollY / h : 0})`; }, { passive: true });

// stats: count up when seen; the first one is the live combined market cap of every stock a coin can pay in
const countUp = (el, to, fmt) => { const t0 = performance.now(), d = 1500; const f = now => { const k = Math.min(1, (now - t0) / d); el.textContent = fmt(to * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(f); }; requestAnimationFrame(f); };
const so = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return; so.unobserve(e.target);
  e.target.querySelectorAll('[data-count]').forEach(el => {
    const c = el.dataset.count, suf = el.dataset.suf || '';
    if (c === 'mcap') { const go2 = st => { if (!st.stocks) { if (st.at) el.textContent = '—'; return; } const v = st.stocks.reduce((t, s) => t + (s.mcap || 0), 0); countUp(el, v / 1e12, x => `$${x.toFixed(1)}T`); }; onPrices(go2); }
    else countUp(el, +c, x => `${Math.round(x)}${suf}`);
  });
}), { threshold: 0.35 });
const statsEl = $('#stats'); if (statsEl) so.observe(statsEl);

// eyebrows decode like a message coming out of the encryption
const GL = '0123456789abcdef#%&*+=';
const eo = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting || reduced) return; eo.unobserve(e.target); const el = e.target, txt = el.textContent, t0 = performance.now(), d = 700;
  const f = now => { const k = Math.min(1, (now - t0) / d), n = Math.floor(txt.length * k); let s = txt.slice(0, n); for (let i = n; i < txt.length; i++) s += txt[i] === ' ' ? ' ' : GL[(Math.random() * GL.length) | 0]; el.textContent = s; if (k < 1) requestAnimationFrame(f); else el.textContent = txt; };
  requestAnimationFrame(f);
}), { threshold: 0.6 });
$$('.ey').forEach(el => eo.observe(el));

// the manifesto: words light up as the section scrolls past
const mani = $('#mani'), mtxt = $('#maniTxt');
if (mtxt) {
  const words = [];
  const wrap = (node, green) => [...node.childNodes].forEach(c => {
    if (c.nodeType === 3) { const f = document.createDocumentFragment(); c.textContent.split(/(\s+)/).forEach(t => { if (!t) return; if (/^\s+$/.test(t)) f.append(t); else { const sp = document.createElement('span'); sp.className = 'w' + (green ? ' g' : ''); sp.textContent = t; f.append(sp); words.push(sp); } }); c.replaceWith(f); }
    else if (c.nodeType === 1) wrap(c, green || c.classList.contains('g'));
  });
  wrap(mtxt, false);
  let litN = -1, mq = false;
  const lightUp = () => { mq = false; if (mobile() || reduced) { if (litN !== words.length) { words.forEach(w => w.classList.add('lit')); litN = words.length; } return; } const r = mani.getBoundingClientRect(); if (r.bottom < -200 || r.top > innerHeight + 200) return; const k = Math.min(1, Math.max(0, (-r.top + innerHeight * 0.25) / (r.height - innerHeight * 0.6))); const n = Math.round(words.length * k); if (n === litN) return; litN = n; words.forEach((w, i) => w.classList.toggle('lit', i < n)); };
  addEventListener('scroll', () => { if (!mq) { mq = true; requestAnimationFrame(lightUp); } }, { passive: true }); lightUp();
}

// who will you pay: a little halftone drawing on each card
$$('.use canvas[data-art]').forEach(c => stillArt(c, { candles: 6, seed: +c.dataset.art, dissolve: (+c.dataset.art) % 6 }));

// the comparison rows slide in, the ticks pop
const vsT = $('#vsTable'); if (vsT) new IntersectionObserver(([e], o) => { if (e.isIntersecting) { vsT.classList.add('vis'); o.disconnect(); } }, { threshold: 0.3 }).observe(vsT);

// the roadmap line fills as you read down it
const road = $('#roadList'), rfill = $('#roadFill'), rms = $$('.rm');
let rq = false;
const roadScroll = () => { rq = false; if (!road) return; if (Math.abs(road.getBoundingClientRect().top) > innerHeight * 3) return; const r = road.getBoundingClientRect(); const k = Math.min(1, Math.max(0, (innerHeight * 0.62 - r.top) / r.height)); rfill.style.setProperty('--k', k); rms.forEach((el, i) => el.classList.toggle('on', i === 0 || el.getBoundingClientRect().top < innerHeight * 0.62)); };
addEventListener('scroll', () => { if (!rq) { rq = true; requestAnimationFrame(roadScroll); } }, { passive: true }); roadScroll();

// the turning coin at the end
const coinEl = $('#coin3d'); if (coinEl) mountCoin(coinEl);

// the band: two rows of big type that run with the scroll, faster when you scroll faster, backwards when you scroll up
const band = $('#band');
if (band) {
  const rows = $$('.band-row', band);
  rows[1].innerHTML = STOCKS.map(s => `<span>${logo(s.sym)}${s.sym}</span><i>✦</i>`).join('');
  rows.forEach(r => (r.innerHTML += r.innerHTML));
  let x = 0, vis = false, last = performance.now(), lastY = scrollY, vel = 0, dir = 1;
  new IntersectionObserver(([e]) => (vis = e.isIntersecting), { rootMargin: '100px' }).observe(band);
  const loop = now => {
    requestAnimationFrame(loop); const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const dy = scrollY - lastY; lastY = scrollY; vel += (dy / Math.max(dt, 0.004) - vel) * 0.12;
    if (!vis || reduced) return;
    if (Math.abs(vel) > 40) dir = vel > 0 ? 1 : -1;
    x += (42 + Math.min(1100, Math.abs(vel) * 0.42)) * dt * dir;
    rows.forEach((r, i) => { const w = r.scrollWidth / 2 || 1, m = ((x * (i ? 0.8 : 1)) % w + w) % w; r.style.transform = `translate3d(${i ? m - w : -m}px,0,0)`; });
  };
  requestAnimationFrame(loop);
}

// the hero drifts back as you leave it
const heroEl = $('#hero'), heroIn = $('.hero-in');
if (heroEl && heroIn && !reduced) {
  let ticking = false;
  const heroExit = () => { ticking = false; const y = scrollY, h = heroEl.offsetHeight || 1; if (y > h * 1.1) return; const k = Math.min(1, y / h); heroIn.style.transform = y > 0 ? `translate3d(0,${(y * 0.3).toFixed(1)}px,0) scale(${(1 - k * 0.06).toFixed(4)})` : ''; heroIn.style.opacity = y > 0 ? String(Math.max(0, 1 - k * 1.35).toFixed(3)) : ''; };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(heroExit); } }, { passive: true });
}
