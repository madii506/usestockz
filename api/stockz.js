// Stockz API (one Vercel function behind /api/:path):
//   /api/prices  live prices of every tokenized stock Stockz pays in (Jupiter price v3), cached 30 s
//   /api/xray    what any wallet's public stock holdings look like on Solana (RPC), the thing Stockz keeps private
//   /api/config  the $STOCKZ contract address and X link, once they're set in Vercel (STOCKZ_CA, STOCKZ_X)
const STOCKS = [
  { sym: 'NVDA', name: 'NVIDIA', cat: 'stock', mint: 'Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh' },
  { sym: 'AAPL', name: 'Apple', cat: 'stock', mint: 'XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp' },
  { sym: 'TSLA', name: 'Tesla', cat: 'stock', mint: 'XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB' },
  { sym: 'MSFT', name: 'Microsoft', cat: 'stock', mint: 'XspzcW1PRtgf6Wj92HCiZdjzKCyFekVD8P5Ueh3dRMX' },
  { sym: 'GOOGL', name: 'Alphabet', cat: 'stock', mint: 'XsCPL9dNWBMvFtTmwcCA5v3xWPSMEBCszbQdiLLq6aN' },
  { sym: 'AMZN', name: 'Amazon', cat: 'stock', mint: 'Xs3eBt7uRfJX8QUs4suhyU8p2M6DoUDrJyWBa8LLZsg' },
  { sym: 'META', name: 'Meta', cat: 'stock', mint: 'Xsa62P5mvPszXL1krVUnU5ar38bBSVcWAB6fmPCo5Zu' },
  { sym: 'COIN', name: 'Coinbase', cat: 'stock', mint: 'Xs7ZdzSHLU9ftNJsii5fCeJhoRWSC32SQGzGQtePxNu' },
  { sym: 'SPY', name: 'S&P 500', cat: 'index', mint: 'XsoCS1TfEyfFhfvj8EtZ528L3CaKBDBRqRapnBbDF2W' },
  { sym: 'QQQ', name: 'Nasdaq 100', cat: 'index', mint: 'Xs8S1uUs1zvS2p7iwtsG3b6fkhpvmwz4GYU3gWAmWHZ' },
  { sym: 'GLD', name: 'Gold', cat: 'metal', mint: 'Xsv9hRk1z5ystj9MhnA7Lq4vjSsLwzL2nxrwmwtD3re' },
  { sym: 'SLV', name: 'Silver', cat: 'metal', mint: 'XsxAd6okt8y1RRK6gNg7iJaqiWNiq5Md5EDf3ZrF2dm' },
];
const SOL = 'So11111111111111111111111111111111111111112';
const TOKEN = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', T22 = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PE6TbtDAy3ByQSm';
const THIN = 5000;                                                  // under $5K of liquidity the price is stale: say so
const RPCS = () => [process.env.RPC_URL, 'https://api.mainnet-beta.solana.com', 'https://solana-rpc.publicnode.com'].filter(Boolean);
const isAddr = s => typeof s === 'string' && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s);

async function fetchT(url, opts = {}, ms = 8000) {
  const c = new AbortController(); const t = setTimeout(() => c.abort(), ms);
  try { return await fetch(url, { ...opts, signal: c.signal }); } finally { clearTimeout(t); }
}
async function rpc(method, params) {
  let last;
  for (const url of RPCS()) {
    try {
      const r = await fetchT(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) });
      if (r.status === 429 || r.status >= 500 || r.status === 403 || r.status === 401) { last = new Error('rpc ' + r.status); continue; }
      const j = await r.json();
      if (j.error) { last = new Error(j.error.message || 'rpc error'); continue; }
      return j.result;
    } catch (e) { last = e; }
  }
  throw last || new Error('no rpc');
}
function send(res, code, body, cache = 'no-store') {
  res.statusCode = code; res.setHeader('content-type', 'application/json; charset=utf-8'); res.setHeader('cache-control', cache);
  res.end(JSON.stringify(body));
}
const mult = s => {                                                 // xStocks scale their UI amount; use the multiplier in force now
  if (!s) return 1;
  const next = s.newMultiplierEffectiveAt && Date.parse(s.newMultiplierEffectiveAt) <= Date.now();
  return +(next ? s.newMultiplier : s.multiplier) || 1;
};

let cache = null, cacheAt = 0;
async function prices() {
  if (cache && Date.now() - cacheAt < 30000) return cache;
  const ids = [...STOCKS.map(s => s.mint), SOL].join(',');
  const r = await fetchT('https://lite-api.jup.ag/price/v3?ids=' + ids, {}, 9000);
  if (!r.ok) throw new Error('jupiter ' + r.status);
  const j = await r.json();
  const stocks = STOCKS.map(s => {
    const v = j[s.mint] || {};
    const liq = typeof v.liquidity === 'number' ? v.liquidity : null;
    return {
      ...s, x: s.sym + 'x', price: v.usdPrice || null, ch24: typeof v.priceChange24h === 'number' ? v.priceChange24h : null,
      liq, thin: liq != null && liq < THIN, stock: v.stockData ? v.stockData.price : null, mcap: v.stockData ? v.stockData.mcap : null,
      decimals: v.decimals || 8, mult: mult(v.scaledUiConfig),
    };
  });
  const sol = j[SOL] ? { price: j[SOL].usdPrice, ch24: j[SOL].priceChange24h } : null;
  cache = { stocks, sol, at: Date.now(), source: 'jupiter' }; cacheAt = Date.now();
  return cache;
}

async function xray(wallet) {
  const [p, bal, a, b] = await Promise.all([
    prices().catch(() => null),
    rpc('getBalance', [wallet]).catch(() => null),
    rpc('getTokenAccountsByOwner', [wallet, { programId: TOKEN }, { encoding: 'jsonParsed' }]).catch(() => ({ value: [] })),
    rpc('getTokenAccountsByOwner', [wallet, { programId: T22 }, { encoding: 'jsonParsed' }]).catch(() => ({ value: [] })),
  ]);
  const by = Object.fromEntries((p ? p.stocks : STOCKS).map(s => [s.mint, s]));
  const held = {}; let tokens = 0;
  for (const v of [...(a.value || []), ...(b.value || [])]) {
    const i = v.account.data.parsed.info, ta = i.tokenAmount;
    if (+ta.amount > 0) tokens++;
    if (!by[i.mint] || !(+ta.amount > 0)) continue;
    const s = by[i.mint]; const ui = (+ta.amount / 10 ** ta.decimals) * (s.mult || 1);
    held[i.mint] = (held[i.mint] || 0) + ui;
  }
  const holdings = Object.entries(held).map(([mint, amount]) => {
    const s = by[mint]; return { sym: s.sym, name: s.name, mint, amount, price: s.price || null, value: s.price ? amount * s.price : null };
  }).sort((x, y) => (y.value || 0) - (x.value || 0));
  const sol = bal ? bal.value / 1e9 : null;
  return {
    wallet, sol, solValue: sol != null && p && p.sol ? sol * p.sol.price : null, tokens, holdings,
    total: holdings.reduce((t, h) => t + (h.value || 0), 0), at: Date.now(),
  };
}

// a real coin's last 24 hours from Dexscreener, so the calculator can run on actual volume
async function coin(ca) {
  const r = await fetchT('https://api.dexscreener.com/tokens/v1/solana/' + ca, {}, 8000);
  if (!r.ok) throw new Error('dexscreener ' + r.status);
  const pairs = (await r.json()) || [];
  if (!pairs.length) return null;
  const vol = pairs.reduce((t, p) => t + ((p.volume && p.volume.h24) || 0), 0);
  const top = pairs.slice().sort((x, y) => ((y.liquidity && y.liquidity.usd) || 0) - ((x.liquidity && x.liquidity.usd) || 0))[0];
  return { ca, name: top.baseToken && top.baseToken.name, symbol: top.baseToken && top.baseToken.symbol, vol24: vol, priceUsd: +top.priceUsd || null, mcap: top.marketCap || top.fdv || null, dex: top.dexId, url: top.url };
}

module.exports = async (req, res) => {
  const u = new URL(req.url, 'http://x'); const path = (u.searchParams.get('__p') || u.pathname.replace(/^\/api\/?/, '')).replace(/\/+$/, '');
  try {
    if (path === 'prices') return send(res, 200, await prices(), 'public, s-maxage=30, stale-while-revalidate=120');
    if (path === 'xray') {
      const w = (u.searchParams.get('wallet') || '').trim();
      if (!isAddr(w)) return send(res, 400, { error: 'That is not a Solana wallet address.' });
      return send(res, 200, await xray(w));
    }
    if (path === 'coin') {
      const ca = (u.searchParams.get('ca') || '').trim();
      if (!isAddr(ca)) return send(res, 400, { error: 'That is not a Solana token address.' });
      const c = await coin(ca); if (!c) return send(res, 404, { error: 'No trading found for that coin.' });
      return send(res, 200, c, 'public, s-maxage=60');
    }
    if (path === 'config') return send(res, 200, { ca: process.env.STOCKZ_CA || null, x: process.env.STOCKZ_X || null }, 'public, s-maxage=60');
    return send(res, 404, { error: 'unknown route' });
  } catch (e) { return send(res, 502, { error: String(e.message || e) }); }
};
module.exports._t = { mult, STOCKS };
