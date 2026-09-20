const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;
const CMS = path.resolve(__dirname, '../cms');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.mp4': 'video/mp4',
  '.webmanifest': 'application/manifest+json',
  '.pdf': 'application/pdf',
  '.zip': 'application/zip',
};

const server = http.createServer((req, res) => {
  // CORS & allow any host/origin
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') return res.writeHead(204).end();

  const parsedUrl = new URL(req.url, 'http://' + (req.headers.host || 'localhost'));
  const pathname = decodeURIComponent(parsedUrl.pathname);

  // ── Mock API routes ──
  if (pathname.startsWith('/api/')) {
    let db = { products: [], settings: {}, rates: {} };
    try {
      db = JSON.parse(fs.readFileSync(path.join(CMS, 'data/db.json'), 'utf8'));
    } catch (e) {}

    
    if (pathname === '/api/finale/entry' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        let b = {};
        try { b = JSON.parse(body); } catch(e) {}
        const orderId = (b.orderId || '').trim();
        const CAMPAIGN_SKUS = ['SHV-STUD-M1', 'SHV-STUD-M2', 'SHV-STUD-M3', 'SHV-STUD-W1', 'SHV-STUD-W2', 'SHV-STUD-W3', 'p_stud_m1', 'p_stud_m2', 'p_stud_m3', 'p_stud_w1', 'p_stud_w2', 'p_stud_w3'];
        
        // Mock qualifying check
        let isQualifying = true; // allow testing
        let order = (db.orders || []).find(o => o.id === orderId);
        if (order) {
          isQualifying = (order.items || []).some(it => CAMPAIGN_SKUS.includes(it.sku) || CAMPAIGN_SKUS.includes(it.id));
        }

        // Quiz answers check
        if (b.answers) {
          const ans = b.answers;
          let score = 0;
          if (ans.q1 === 'b') score++;
          if (ans.q2 === 'c') score++;
          if (ans.q3 === 'b') score++;
          if (ans.q4 === 'b') score++;
          if (ans.q5 === 'b') score++;
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            ok: true,
            score,
            total: 5,
            message: 'Quiz submitted and locked permanently. Good luck in the 10g Gold Biscuit lucky draw!'
          }));
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          ok: true,
          eligible: isQualifying,
          orderId: orderId || 'DEMO-ORDER-101',
          scheme: '10g Gold Bullion Campaign'
        }));
      });
      return;
    }
    if (pathname === '/api/version') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        ok: true,
        rel: 162,
        shell: 'shivaa-shell-v162',
        stamp: { index: 162, app: 162 }
      }));
    }

    if (pathname === '/api/orders' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        let b = {};
        try { b = JSON.parse(body); } catch(e) {}
        const oid = 'SHV-' + Math.floor(100000 + Math.random() * 900000);
        const pin = Math.random().toString(36).substring(2, 10);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          id: oid,
          pin: pin,
          total: 48500,
          status: 'Placed',
          paymentStatus: 'Awaiting payment',
          guest: true,
          items: b.items || []
        }));
      });
      return;
    }

    if (pathname === '/api/pay/order' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        let b = {};
        try { b = JSON.parse(body); } catch(e) {}
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          mode: 'demo',
          orderId: b.orderId || 'SHV-DEMO-1',
          amount: 4850000,
          gatewayOrderId: 'demo_' + Math.random().toString(36).substring(2, 10)
        }));
      });
      return;
    }

    if (pathname === '/api/pay/cashfree/status' && req.method === 'POST') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        ok: true,
        paid: true,
        status: 'PAID'
      }));
    }

    if (pathname === '/api/rates') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      const goldPerG = 15056;
      const prem22 = (db.settings && db.settings.gold22Premium) ? Number(db.settings.gold22Premium) : 398;
      const gold22 = Math.round(goldPerG * 0.9167) + prem22;
      return res.end(JSON.stringify({
        live: true,
        t: new Date().toISOString(),
        gold24: 15139,
        gold22: gold22,
        gold18: 11354,
        silver: 236.2,
        spot: { gold24: 15084, gold22: 13828, gold18: 11313, silver: 233.2 },
        jaipur: { gold24: 15139, gold22: gold22, gold18: 11354, silver: 236.2 },
        anchorLevel: { mode: 'mcx-future', source: 'mcx-live', goldPerG: 15084, silverPerG: 233.2, at: new Date().toISOString() },
        premium: { gold22: prem22, gold: 55, silver: 3 },
        rtgs: {
          rows: [
            { purity: '9950', name: 'Gold 995 (Jaipur / RTGS)', buy: 150500, sell: 150800 },
            { purity: '9999', name: 'Gold 9999 (Fine)', buy: 151200, sell: 151500 },
            { purity: 'silver', name: 'Silver 999 (RTGS/kg)', buy: 235000, sell: 236500 }
          ],
          anchor: 'mcx-future',
          updatedAt: new Date().toISOString()
        },
        history: []
      }));
    }

    if (pathname === '/api/settings') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ settings: db.settings || {} }));
    }

    if (pathname === '/api/products') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ products: db.products || [] }));
    }

    if (pathname.startsWith('/api/products/')) {
      const id = pathname.replace('/api/products/', '');
      const prod = (db.products || []).find(p => p.id === id || p.sku === id) || (db.products || [])[0];
      const similar = (db.products || []).filter(p => p.category === (prod && prod.category) && p.id !== (prod && prod.id)).slice(0, 4);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        product: prod,
        similar,
        reviews: (db.reviews || []).filter(r => r.productId === (prod && prod.id)),
        rates: { gold24: 15139, gold22: 14226, gold18: 11354, silver: 236.2 }
      }));
    }

    if (pathname === '/api/pages') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ pages: db.pages || [] }));
    }

    if (pathname === '/api/catalogs') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ catalogs: db.catalogs || [] }));
    }

    if (pathname === '/api/making-charges') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ table: db.makingCharges || [] }));
    }

    if (pathname === '/api/auth/me') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ user: null }));
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: true }));
  }

  // ── Static Files from CMS ──
  let relPath = pathname;
  if (relPath === '/' || relPath.endsWith('/')) relPath = path.join(relPath, 'index.html');
  const filePath = path.join(CMS, relPath.replace(/^\//, ''));

  // Prevent path traversal
  if (!path.resolve(filePath).startsWith(path.resolve(CMS))) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // SPA fallback to index.html if not found and not an asset
      if (!path.extname(pathname)) {
        const idx = path.join(CMS, 'index.html');
        return fs.readFile(idx, (e, buf) => {
          if (e) { res.writeHead(404).end('Not found'); return; }
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(buf);
        });
      }
      res.writeHead(404).end('Not found: ' + pathname);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME[ext] || 'application/octet-stream';

    // Video streaming / Range support
    const range = req.headers.range;
    if (range && ext === '.mp4') {
      const total = stats.size;
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : total - 1;
      const chunksize = (end - start) + 1;

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${total}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': contentType,
      });

      const fileStream = fs.createReadStream(filePath, { start, end });
      fileStream.pipe(res);
      return;
    }

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'Accept-Ranges': 'bytes',
      'Cache-Control': ext.match(/woff2|jpg|png|mp4/) ? 'public, max-age=86400' : 'no-cache',
    });

    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Shivaa Jewels preview server listening on http://0.0.0.0:${PORT}`);
});
