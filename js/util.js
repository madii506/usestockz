// small shared helpers
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const isAddr = s => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(String(s || '').trim());
export const short = (a, n = 4) => (a && a.length > n * 2 + 1 ? `${a.slice(0, n)}…${a.slice(-n)}` : a || '');
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const ease = t => t * t * (3 - 2 * t);
export const usd = (v, d) => {
  if (v == null || !isFinite(v)) return '—';
  const a = Math.abs(v);
  if (a >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (a >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  if (a >= 1e4) return `$${(v / 1e3).toFixed(1)}K`;
  return `$${v.toLocaleString('en-US', { minimumFractionDigits: d ?? 2, maximumFractionDigits: d ?? 2 })}`;
};
export const pct = v => (v == null || !isFinite(v) ? '—' : `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(2)}%`);
export const num = (v, d = 4) => (v == null || !isFinite(v) ? '—' : v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }));
export const sol = (v, d = 3) => (v == null || !isFinite(v) ? '—' : `${v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })} SOL`);
export const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } },
};
let tt;
export function toast(msg) {
  const t = $('#toast'); if (!t) return; t.textContent = msg; t.classList.add('show');
  clearTimeout(tt); tt = setTimeout(() => t.classList.remove('show'), 2200);
}
export async function copy(text, label = 'Copied') {
  try { await navigator.clipboard.writeText(text); toast(label); } catch { toast('Copy failed'); }
}
export const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const mobile = () => matchMedia('(max-width: 1000px)').matches;
// a seeded random, so drawings look the same on every visit
export function rng(seed = 1) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
