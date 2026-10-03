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

/* v183 — every page this dev server sends carries a ribbon: the numbers on
   screen are preview fixtures, never live data. */
const PREVIEW_BANNER = `<div style="position:fixed;left:0;right:0;bottom:0;z-index:99999;background:#6e1e2a;color:#f7edda;font:600 11.5px/1.4 'Jost',system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;text-align:center;padding:7px 10px;box-shadow:0 -6px 20px rgba(0,0,0,.35)">Local preview · fixture data · not the live store</div>`;
const injectBanner = buf => Buffer.from(String(buf).replace('<body>', '<body>' + PREVIEW_BANNER));

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
        rel: 163,
        shell: 'shivaa-shell-v163',
        stamp: { index: 163, app: 163 }
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

    if (pathname === '/api/pay/config') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        mode: 'cashfree',
        guestCheckout: true,
        provider: 'cashfree',
        cashfree: { ready: true, test: false },
        prepaidPct: 0,
        lockMinutes: 20,
        codFeePct: 0,
        upiId: '',
        upiName: 'Shivaa Jewels',
        currency: 'INR'
      }));
    }

    /* ── v183 · FY Growth Mission deck (Admin → FY Mission) ───────────────
       PREVIEW FIXTURE ONLY. It mirrors the *shape* of the real
       GET /api/admin/fy-targets and derives its counts from this repo's
       cms/data/db.json so the deck looks like it will on the live site —
       but the authoritative implementation is cms/api.php
       (shv_fy_view), which tools/mega/smoke/v183-php-run.js executes for
       real under PHP 8.3. Never quote preview numbers as live numbers. */
    if (pathname.startsWith('/api/admin/fy-targets')) {
      const FY_START = '2026-04-01T00:00:00+05:30';
      const FY_END = '2027-03-30T23:59:59+05:30';
      const readBody = () => new Promise(done => { let b = ''; req.on('data', c => { b += c; }); req.on('end', () => { let j = {}; try { j = JSON.parse(b); } catch (e) {} done(j); }); });
      const fyState = global.__fyPreview = global.__fyPreview || {
        targets: { b2b: 700, retail: 1100 }, baselines: { b2b: 40, retail: 120 },
        entries: [{ id: 'fy_preview1', lane: 'retail', count: 20, source: 'Counter register p.4 · Jayal showroom', note: 'Week 40 walk-ins', at: new Date(Date.now() - 2 * 86400000).toISOString(), by: 'Karan Soni' }],
      };
      const stamps = (rows, keys) => rows.map(r => keys.map(k => r[k]).find(v => !!v) || '').filter(Boolean);
      const lane = (key, label, rows, keyKeys, startTs) => {
        const fromDb = rows.length;
        const manual = fyState.entries.filter(e => e.lane === key).reduce((a, e) => a + Number(e.count || 0), 0);
        const achieved = fromDb + fyState.baselines[key] + manual;
        const target = fyState.targets[key];
        const remaining = Math.max(0, target - achieved);
        const elapsedDays = Math.max(1, Math.floor((Date.now() - startTs) / 86400000));
        const daysLeft = Math.max(0, Math.floor((Date.parse(FY_END) - Date.now()) / 86400000));
        const growth = stamps(rows, keyKeys).filter(s => Date.parse(s) >= startTs).length
          + fyState.entries.filter(e => e.lane === key).reduce((a, e) => a + Number(e.count || 0), 0);
        const perDay = growth / elapsedDays;
        const proj = remaining === 0 ? Date.now() : (perDay > 0 ? Date.now() + (remaining / perDay) * 86400000 : null);
        const verdict = remaining === 0 ? 'achieved' : proj === null ? 'stalled'
          : proj <= Date.parse(FY_END) - 14 * 86400000 ? 'ahead' : proj <= Date.parse(FY_END) ? 'onTrack' : 'behind';
        return { key, label, target, achieved, remaining, pct: Math.round(Math.min(100, achieved / target * 1000) / 10),
          baseline: fyState.baselines[key], fromDb, manual, pending: 0, buyers: 0, fyGrowth: growth,
          requiredPerDay: Math.round(remaining / Math.max(1, daysLeft) * 100) / 100,
          requiredPerWeek: Math.round(remaining / Math.max(1, daysLeft) * 7 * 10) / 10,
          actualPerDay: Math.round(perDay * 100) / 100, actualPerWeek: Math.round(perDay * 7 * 10) / 10,
          elapsedDays, daysLeft, projectedAt: proj ? new Date(proj).toISOString() : null,
          slackDays: proj ? Math.floor((Date.parse(FY_END) - proj) / 86400000) : null, verdict };
      };
      const history = (rows, keyKeys, baseline) => {
        const startTs = Date.parse(FY_START);
        const months = {};
        let cur = new Date(startTs); cur.setDate(1); cur.setHours(0, 0, 0, 0);
        const now = new Date();
        for (let g = 0; cur <= now && g < 24; g++) { months[cur.toISOString().slice(0, 7)] = 0; cur.setMonth(cur.getMonth() + 1); }
        let opening = baseline;
        for (const s of stamps(rows, keyKeys)) {
          const t = Date.parse(s); if (!t) continue;
          if (t < startTs) { opening++; continue; }
          const k = new Date(t).toISOString().slice(0, 7);
          if (k in months) months[k]++;
        }
        let cum = opening;
        return { opening, months: Object.entries(months).map(([m, n]) => ({ m, new: n, cum: (cum += n) })) };
      };
      const build = () => {
        const startTs = Date.parse(FY_START);
        const partners = (db.partners || []).filter(p => p.status === 'approved');
        const customers = (db.users || []).filter(u => u.role === 'customer');
        const b2b = lane('b2b', 'B2B Jeweller Partners', partners, ['joined', 'appliedAt', 'createdAt'], startTs);
        const retail = lane('retail', 'Retail Customers', customers, ['createdAt'], startTs);
        const mission = { target: b2b.target + retail.target, achieved: b2b.achieved + retail.achieved };
        mission.remaining = Math.max(0, mission.target - mission.achieved);
        mission.pct = Math.round(Math.min(100, mission.achieved / mission.target * 1000) / 10);
        return { previewFixture: true, config: { label: 'FY 2026–27 Growth Mission', fyStart: FY_START, deadline: FY_END,
            lanes: { b2b: { label: b2b.label, target: b2b.target, baseline: b2b.baseline }, retail: { label: retail.label, target: retail.target, baseline: retail.baseline } } },
          lanes: { b2b, retail }, mission,
          countdown: { deadline: FY_END, deadlineTs: Date.parse(FY_END), fyStart: FY_START, fyStartTs: startTs,
            serverNow: Date.now(), nowIso: new Date().toISOString(), ended: false,
            daysLeft: Math.floor((Date.parse(FY_END) - Date.now()) / 86400000), totalDays: 363,
            daysElapsed: Math.floor((Date.now() - startTs) / 86400000) },
          history: { b2b: history(partners, ['joined', 'appliedAt', 'createdAt'], b2b.baseline), retail: history(customers, ['createdAt'], retail.baseline) },
          entries: fyState.entries.slice().reverse(),
          sources: { b2b: 'partners collection — rows with status=approved (preview copy of db.json)',
            retail: 'users collection — rows with role=customer (preview copy of db.json)',
            manual: 'owner-logged ledger rows below — each one carries the register/export it came from' },
          limits: { maxTarget: 1000000, maxEntry: 1000 } };
      };
      const json = o => { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); };
      if (req.method === 'GET') return json(build());
      return readBody().then(b => {
        if (pathname === '/api/admin/fy-targets/entry') {
          if (!String(b.source || '').trim()) return json({ error: 'Source required — record which register / export / list this count came from (counts are NEVER invented)' });
          const e = { id: 'fy_' + Math.random().toString(36).slice(2, 8), lane: b.lane === 'b2b' ? 'b2b' : 'retail',
            count: Math.max(1, Math.min(1000, Number(b.count) || 1)), source: String(b.source).slice(0, 160),
            note: String(b.note || '').slice(0, 200), at: new Date().toISOString(), by: 'Preview Admin' };
          fyState.entries.push(e);
          return json({ ok: true, entry: e, deck: build() });
        }
        if (pathname === '/api/admin/fy-targets/entry-undo') {
          const i = fyState.entries.findIndex(e => e.id === b.id);
          if (i < 0) return json({ error: 'Entry not found' });
          const [removed] = fyState.entries.splice(i, 1);
          return json({ ok: true, removed, deck: build() });
        }
        if (b.b2bTarget) fyState.targets.b2b = Math.max(1, Number(b.b2bTarget) || 700);
        if (b.retailTarget) fyState.targets.retail = Math.max(1, Number(b.retailTarget) || 1100);
        fyState.baselines.b2b = Math.max(0, Number(b.b2bBaseline) || 0);
        fyState.baselines.retail = Math.max(0, Number(b.retailBaseline) || 0);
        return json({ ok: true, deck: build() });
      });
    }

    /* ── v183 · preview sign-in: any password opens the admin panel locally ── */
    const PREVIEW_ADMIN = { id: 'u_admin', name: 'Karan Soni', email: 'admin@shivaa.in', phone: '+91 8905005921',
      role: 'admin', loyaltyPoints: 0, wishlist: [], profile: [], addresses: [], createdAt: new Date().toISOString() };
    const bearer = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (pathname === '/api/auth/login' && req.method === 'POST') {
      let body = '';
      req.on('data', c => { body += c; });
      return req.on('end', () => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, token: 'preview-admin', user: PREVIEW_ADMIN, preview: true }));
      });
    }
    if (pathname === '/api/auth/me') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ user: bearer === 'preview-admin' ? PREVIEW_ADMIN : null }));
    }
    if (pathname.startsWith('/api/admin/')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: true, previewFixture: true, partners: [], users: [], requests: [], log: [], purchases: [], karigars: [], jobs: [], plans: [], carts: [], orders: [], asks: [], reviews: [], alerts: [] }));
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
          const out = injectBanner(buf);
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Length': out.length });
          res.end(out);
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

    /* HTML gets the preview ribbon; everything else streams untouched */
    if (ext === '.html') {
      return fs.readFile(filePath, (e, buf) => {
        if (e) { res.writeHead(404).end('Not found'); return; }
        const out = injectBanner(buf);
        res.writeHead(200, { 'Content-Type': contentType, 'Content-Length': out.length, 'Cache-Control': 'no-cache' });
        res.end(out);
      });
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
  console.log('  Admin → FY Mission: #/admin?tab=fy  (any password signs you in as preview admin)');
  console.log('  ⚠ FY deck numbers here are PREVIEW FIXTURES — the authoritative deck is cms/api.php (v183-php-run.js executes it for real).');
});
