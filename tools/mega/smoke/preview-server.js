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
  const u = decodeURIComponent(req.url.split('?')[0]);
  const send = (code, body, type) => { res.writeHead(code, { 'content-type': type }); res.end(body); };
  if (u.startsWith('/api/')) {
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
    else if (u === '/api/auth/me') out = { user: null };
    else out = {};
    return send(200, JSON.stringify(out), 'application/json');
  }
  let f = path.join(CMS, u === '/' ? 'index.html' : u);
  if (!path.resolve(f).startsWith(path.resolve(CMS))) return send(403, 'no', 'text/plain');
  fs.readFile(f, (e, b) => e ? send(404, 'not found', 'text/plain')
    : send(200, b, MIME[path.extname(f)] || 'application/octet-stream'));
}).listen(8080, '0.0.0.0', () => console.log('Shivaa preview on 0.0.0.0:8080 — serving ' + CMS));
