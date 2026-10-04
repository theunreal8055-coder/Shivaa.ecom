/* Shivaa preview server — serves cms/ statically and emulates the PHP API
   from cms/data/db.json, so the sidebar + search bar can be tapped for real.
   Sandbox-only tool; never deployed. */
const fs = require('fs'); const http = require('http'); const path = require('path');
const CMS = path.join(__dirname, '..', '..', '..', 'cms');
const DB = JSON.parse(fs.readFileSync(path.join(CMS, 'data/db.json'), 'utf8'));
const MIME = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json',
  '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.png':'image/png', '.webp':'image/webp', '.svg':'image/svg+xml',
  '.woff2':'font/woff2', '.mp4':'video/mp4', '.ico':'image/x-icon', '.txt':'text/plain', '.xml':'application/xml',
  '.webmanifest':'application/manifest+json' };
const jaipur = { gold24: 15655, gold22: 14405, gold18: 11696, silver: 242.4 };
const rates = { t: new Date().toISOString(), source: 'live-mcx', live: false,
  spot: { gold24: 15600, gold22: 14350, gold18: 11650, silver: 239 }, jaipur, ...jaipur,
  rtgs: { rows: {}, anchor: 'mcx-future', updatedAt: new Date().toISOString() },
  premium: { gold: 55, silver: 3, gold22: 398 },
  anchorLevel: { mode: 'mcx-future', goldPerG: 15056, silverPerG: 99500 },
  history: [Object.assign({ t: new Date(Date.now() - 6e4).toISOString() }, jaipur)], nextUpdateIn: 60 };

http.createServer((req, res) => {
  if (process.env.PREVIEW_BRIDAL === '1' && req.url === '/') {
    res.writeHead(302, { Location: '/#/bridal' }); res.end(); return;
  }
  const u = decodeURIComponent(req.url.split('?')[0]);
  const send = (code, body, type) => { res.writeHead(code, { 'content-type': type }); res.end(body); };
  if (u.startsWith('/api/')) {
    // Preview-only stand-in for the live booking endpoint. Validate the minimum
    // contract, issue a disposable reference, and deliberately do not retain PII.
    if (u === '/api/services' && req.method === 'POST') {
      let raw = '';
      req.on('data', chunk => { raw += chunk; });
      req.on('end', () => {
        let body = {};
        try { body = JSON.parse(raw || '{}'); } catch (_) { return send(400, JSON.stringify({ error: 'Invalid JSON' }), 'application/json'); }
        const phone = String(body.phone || '').replace(/\D/g, '');
        if (!['bridal', 'mayra'].includes(body.type) || !String(body.name || '').trim() || !/^[6-9]\d{9}$/.test(phone)
            || body.contactConsent !== true || body.privacyConsent !== true)
          return send(400, JSON.stringify({ error: 'Please complete the required fields and consent.' }), 'application/json');
        const id = 'pv_sr_' + Date.now().toString(36);
        return send(200, JSON.stringify({ ok: true, preview: true, request: { id, type: body.type, status: 'new', createdAt: new Date().toISOString() } }), 'application/json');
      });
      return;
    }
    let out = {};
    if (u === '/api/rates') out = rates;
    else if (u === '/api/settings') out = { settings: DB.settings };
    else if (u === '/api/making-charges') out = { table: DB.makingCharges ? DB.makingCharges : [] };
    else if (u === '/api/catalogs') out = { catalogs: DB.catalogs || [] };
    else if (u === '/api/products') out = { products: DB.products };
    else if (u.startsWith('/api/products/')) {
      const id = u.split('/').pop();
      out = { product: DB.products.find(p => p.id === id || p.sku === id) || DB.products[0], similar: [], reviews: [], rates: (DB.rates || {}).last };
    } else if (u === '/api/pages') out = { pages: [] };
    /* v166 — the release endpoint the freshness controller reads (same shape as
       api.php), so the preview behaves exactly like production. */
    else if (u === '/api/version') out = { ok: true, rel: 183, shell: 'shivaa-shell-v183', builtAt: new Date().toISOString(),
      forceLatest: (DB.settings && DB.settings.forceLatestVersion) !== false,
      stamp: { index: 183, app: 183, sw: 183, matched: true } };
    else if (u === '/api/auth/me') out = { user: null };
    else out = {};
    return send(200, JSON.stringify(out), 'application/json');
  }
  let f = path.join(CMS, u === '/' ? 'index.html' : u);
  if (!path.resolve(f).startsWith(path.resolve(CMS))) return send(403, 'no', 'text/plain');
  fs.readFile(f, (e, b) => e ? send(404, 'not found', 'text/plain')
    : send(200, b, MIME[path.extname(f)] || 'application/octet-stream'));
}).listen(8080, '0.0.0.0', () => console.log('Shivaa preview on 0.0.0.0:8080 — serving ' + CMS));
