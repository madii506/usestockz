// the stocks Stockz pays in, their logos, and live prices from /api/prices
import { esc } from './util.js';
export const STOCKS = [
  { sym: 'NVDA', name: 'NVIDIA', cat: 'stock' }, { sym: 'AAPL', name: 'Apple', cat: 'stock' }, { sym: 'TSLA', name: 'Tesla', cat: 'stock' },
  { sym: 'MSFT', name: 'Microsoft', cat: 'stock' }, { sym: 'GOOGL', name: 'Alphabet', cat: 'stock' }, { sym: 'AMZN', name: 'Amazon', cat: 'stock' },
  { sym: 'META', name: 'Meta', cat: 'stock' }, { sym: 'COIN', name: 'Coinbase', cat: 'stock' }, { sym: 'SPY', name: 'S&P 500', cat: 'index' },
  { sym: 'QQQ', name: 'Nasdaq 100', cat: 'index' }, { sym: 'GLD', name: 'Gold', cat: 'metal' }, { sym: 'SLV', name: 'Silver', cat: 'metal' },
];
export const bySym = Object.fromEntries(STOCKS.map(s => [s.sym, s]));
export const logoUrl = sym => `https://xstocks-metadata.backed.fi/logos/tokens/${sym}x.png`;
// a logo that falls back to a monogram if the image can't load
export function logo(sym, cls = 'tlg') {
  return `<img class="${cls}" src="${logoUrl(sym)}" alt="" loading="lazy" referrerpolicy="no-referrer" data-sym="${esc(sym)}">`;
}
// inline onerror handlers are blocked by the page's CSP, so one capturing listener swaps a broken logo for a monogram
document.addEventListener('error', e => {
  const im = e.target; if (!(im instanceof HTMLImageElement) || !im.dataset.sym || !im.classList.contains('tlg')) return;
  const s = document.createElement('span'); s.className = im.className + ' tlg0'; s.style.cssText = im.style.cssText; s.textContent = im.dataset.sym.slice(0, 2); im.replaceWith(s);
}, true);
let state = { stocks: null, sol: null, at: 0, ok: false }, subs = [], timer = null, inflight = null;
export const prices = () => state;
export const priceOf = sym => (state.stocks ? (state.stocks.find(s => s.sym === sym) || null) : null);
export function onPrices(fn) { subs.push(fn); if (state.at) fn(state); return () => (subs = subs.filter(f => f !== fn)); }
async function load() {
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const r = await fetch('/api/prices', { cache: 'no-store' });
      const j = await r.json(); if (!r.ok || !j.stocks) throw new Error(j.error || 'prices');
      state = { stocks: j.stocks, sol: j.sol, at: j.at || Date.now(), ok: true };
    } catch { state = { ...state, ok: false, at: state.at || Date.now() }; }
    subs.forEach(f => f(state)); inflight = null; return state;
  })();
  return inflight;
}
export function startPrices() {
  if (timer) return; load(); timer = setInterval(() => { if (!document.hidden) load(); }, 60000);
}
let cfg = null;
export async function config() {
  if (cfg) return cfg;
  try { cfg = await (await fetch('/api/config')).json(); } catch { cfg = { ca: null, x: null }; }
  return cfg;
}
