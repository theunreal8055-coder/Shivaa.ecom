#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════
   SHIVAA — local preview server (Node.js API shim + static host)
   ═══════════════════════════════════════════════════════════════
   Purpose: give a faithful, functional preview of the v37 site in
   this sandbox, which has no PHP runtime (and apt is blocked).
   It serves the real static assets and reproduces the read-only GET
   endpoints from api.php the same way, reading cms/data/db.json.

   It mirrors api.php response shapes for:
     /api/products, /api/products/:id, /api/catalogs, /api/rates,
     /api/settings, /api/making-charges, /api/pages, /api/auth/me
   Write endpoints are stubbed to return 501 (preview only). No writes
   to db.json are ever made.
   ═══════════════════════════════════════════════════════════════ */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;                       // cms/
const DB_FILE = path.join(ROOT, 'data', 'db.json');
const PORT = process.env.PORT || 8090;

const PURITY_22 = 0.9167, PURITY_18 = 0.75;

function loadDb() {
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

/* ---- reproduce api.php current_rates() ---- */
function currentRates(db) {
  const ov = db.rates.override;
  if (ov) return { gold24: ov.gold24, gold22: ov.gold22, gold18: ov.gold18, silver: ov.silver };
  const l = db.rates.last;
  const gp = db.settings.jaipurPremium ?? 55;
  const sp = db.settings.jaipurSilverPremium ?? 3;
  return {
    gold24: l.gold24 + gp,
    gold22: l.gold22 + gp,
    gold18: l.gold18 + Math.round(gp * 0.75),
    silver: Math.round((l.silver + sp) * 10) / 10,
  };
}

/* ---- reproduce api.php compute_price() ---- */
function computePrice(p, R) {
  const key = p.metal === 'Silver' ? 'silver' : ('gold' + String(p.purity).replace('K', ''));
  const rate = Number(R[key]);
  const metalValue = Math.round(rate * Number(p.weightG));
  let makingCharge;
  if (p.mcScheme === 'percent') makingCharge = Math.round(metalValue * Number(p.mcValue) / 100);
  else if (p.mcScheme === 'perGram') makingCharge = Math.round(Number(p.mcValue) * Number(p.weightG));
  else makingCharge = Math.round(Number(p.mcValue));
  const stoneValue = Math.round(Number(p.stoneValue ?? 0));
  const subtotal = metalValue + makingCharge + stoneValue;
  const gst = Math.round(subtotal * 0.03);
  return {
    ratePerGram: Math.round(rate * 100) / 100,
    metalValue, makingCharge, stoneValue, subtotal, gst, total: subtotal + gst,
  };
}

function JSONout(res, code, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  });
  res.end(body);
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.gif': 'image/gif',
  '.ico': 'image/x-icon', '.mp4': 'video/mp4', '.webm': 'video/webm',
  '.pdf': 'application/pdf', '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.ttf': 'font/ttf', '.otf': 'font/otf', '.eot': 'application/vnd.ms-fontobject',
};

function serveStatic(req, res, urlPath) {
  // decode, strip query, prevent traversal
  let p = decodeURIComponent(urlPath.split('?')[0]);
  if (p === '/' || p === '') p = '/index.html';
  const safe = path.normalize(p).replace(/^(\.\.[/\\])+/, '');
  let file = path.join(ROOT, safe);
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end('Forbidden'); }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('Not found'); }
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

function handleApi(db, route, method, query, req, res) {
  const R = currentRates(db);

  if (route === 'rates' && method === 'GET') {
    const last = db.rates.last;
    return JSONout(res, 200, {
      gold24: last.gold24, gold22: last.gold22, gold18: last.gold18, silver: last.silver,
      spot: { gold24: last.gold24, gold22: last.gold22, gold18: last.gold18, silver: last.silver },
      jaipur: R,
      premium: { gold: db.settings.jaipurPremium ?? 55, silver: db.settings.jaipurSilverPremium ?? 3 },
      override: db.rates.override ?? null,
      history: (db.rates.history || []).slice(-120),
      nextUpdateIn: 60,
      t: last.t,
    });
  }

  if (route === 'products' && method === 'GET') {
    let list = db.products.filter(x => x.active);
    if (query.category) list = list.filter(x => x.category === query.category);
    if (query.q) { const s = String(query.q).toLowerCase(); list = list.filter(x => (x.name + ' ' + x.category + ' ' + (x.desc||'') + ' ' + (x.tags||[]).join(' ')).toLowerCase().includes(s)); }
    if (query.metal) list = list.filter(x => x.metal === query.metal);
    if (query.tag) list = list.filter(x => (x.tags||[]).includes(query.tag));
    const out = list.map(x => ({ ...x, lessWeightG: x.lessWeightG ?? 0, wastagePct: x.wastagePct ?? 8, price: computePrice(x, R) }));
    return JSONout(res, 200, { products: out, rates: R });
  }

  const pm = route.match(/^products\/([\w-]+)$/);
  if (pm && method === 'GET') {
    const id = pm[1];
    const prod = db.products.find(x => x.id === id);
    if (!prod) return JSONout(res, 404, { error: 'Not found' });
    const similar = db.products.filter(x => x.category === prod.category && x.id !== id && x.active).slice(0, 4).map(x => ({...x, price: computePrice(x, R)}));
    const reviews = (db.reviews || []).filter(r => r.productId === id);
    return JSONout(res, 200, { product: { ...prod, price: computePrice(prod, R) }, rates: R, similar, reviews });
  }

  if (route === 'catalogs' && method === 'GET') {
    // Boot() reads this as a public list; gate only when a non-partner token present.
    // For the preview we surface the public title list (match api.php's public behaviour).
    const list = db.catalogs || [];
    return JSONout(res, 200, { catalogs: list, gated: false });
  }

  if (route === 'making-charges' && method === 'GET') {
    return JSONout(res, 200, { table: db.makingCharges, gst: 3 });
  }

  if (route === 'settings' && method === 'GET') {
    const pub = { ...(db.settings || {}) };
    ['gstApi', 'sms', 'paymentKeys', 'payment', 'secrets', 'razorpay'].forEach(k => delete pub[k]);
    const r = (db.settings && db.settings.razorpay) || {};
    pub.razorpay = { enabled: !!((r.key_id && r.key_secret)), keyId: r.key_id || '', mode: r.mode || 'test' };
    return JSONout(res, 200, pub);
  }

  if (route === 'pages' && method === 'GET') {
    const list = (db.pages || []).filter(x => x.published);
    if (query.slug) { const pg = list.find(x => x.slug === query.slug); return pg ? JSONout(res, 200, pg) : JSONout(res, 200, { error: 'Not found' }); }
    return JSONout(res, 200, { pages: list.map(x => ({ title: x.title, slug: x.slug, updatedAt: x.updatedAt || '' })) });
  }

  if (route === 'auth/me' && method === 'GET') {
    // Preview is public; no bearer token -> treat as signed out (matches api.php req_user on no token).
    return JSONout(res, 200, { user: null });
  }

  // ── v41 referral — stubbed (preview has no auth/user) so the UI never 501s ──
  if (route === 'referral' && method === 'GET') {
    return JSONout(res, 200, { code: 'SHVDEMO', earned: 0, pointsAwarded: 0, count: 0 });
  }

  // ── v41 review moderation (read-only preview mirror) ──
  if (route === 'reviews' && method === 'GET') {
    const status = query.status || 'all';
    let list = (db.reviews || []).filter(r => r.status !== 'rejected');
    if (status !== 'all' && status) list = list.filter(r => (r.status || 'approved') === status);
    return JSONout(res, 200, { reviews: list.slice().reverse() });
  }
  const rvPut = route.match(/^reviews\/([\w-]+)$/);
  if (rvPut && method === 'PUT') return JSONout(res, 200, { ok: true, status: 'approved', verified: true });
  if (rvPut && method === 'DELETE') return JSONout(res, 200, { ok: true });

  // ── v41 abandoned cart (read-only preview mirror) ──
  if (route === 'cart-abandon' && method === 'POST') {
    return JSONout(res, 200, { id: 'ab_preview', subtotal: 0 });
  }
  if (route === 'cart-abandon' && method === 'GET') return JSONout(res, 200, { carts: [] });
  const abNudge = route.match(/^cart-abandon\/([\w-]+)$/);
  if (abNudge && method === 'POST') return JSONout(res, 200, { ok: true, level: 1, nextDueAt: null });

  // v40 Razorpay payment shim. In the sandbox there are no real keys, so we expose
  // config (enabled=false) and stub create/verify. With keys set in production api.php
  // these are real. Preview lets the checkout UX be exercised end-to-end (demo mode).
  if (route === 'payment/config' && method === 'GET') {
    const r = (db.settings && db.settings.razorpay) || {};
    const enabled = !!((r.key_id && r.key_secret));
    return JSONout(res, 200, { enabled, keyId: enabled ? r.key_id : null, mode: r.mode || 'test', currency: 'INR', name: (db.settings && db.settings.storeName) || 'Shivaa Jewellers' });
  }
  if (route === 'payment/create-order' && method === 'POST') {
    return JSONout(res, 400, { error: 'Preview shim: Razorpay is read-only here. Add keys in Admin → Settings to go live.' });
  }
  if (route === 'payment/verify' && method === 'POST') {
    return JSONout(res, 400, { error: 'Preview shim: Razorpay is read-only here.' });
  }

  // Writes are out of scope for the preview — 501 so the UI gracefully no-ops.
  return JSONout(res, 501, { error: 'Writes disabled in preview (read-only shim)' });
}

const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://localhost');
  const pathname = u.pathname;
  const method = req.method;

  if (pathname.startsWith('/api/')) {
    let db;
    try { db = loadDb(); } catch (e) { return JSONout(res, 500, { error: 'db.json unreadable' }); }
    const route = pathname.slice('/api/'.length).replace(/\/+$/, '');
    const query = Object.fromEntries(u.searchParams);
    return handleApi(db, route, method, query, req, res);
  }

  return serveStatic(req, res, pathname);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Shivaa preview server running on http://0.0.0.0:${PORT}`);
  console.log('Serving static cms/ + read-only API shim (products, catalogs, rates, settings, pages).');
});
