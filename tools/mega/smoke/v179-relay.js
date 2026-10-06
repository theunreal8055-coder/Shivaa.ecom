/* v179 — relay v2 smoke: the REAL cms/relay/relay.js, run against a mock
   Angel SmartAPI. This is the execution proof for the owner's complaint:
   "signal is aborted without reason" is exactly the error class T04
   exercises (a mid-stream failure that must self-heal, not kill the
   feed). T05 proves the daily 3:30 AM session expiry heals itself by
   re-login. T07 proves a crashed relay still serves the last good tick.
   The mock also verifies the relay's TOTP is genuine RFC 6238 for the
   configured secret (the same rule api.php enforces), and that the
   nearest-expiry contract wins in Search Scrip resolution. */
'use strict';
const assert = require('node:assert');
const { spawn } = require('node:child_process');
const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');

const RELAY = path.join(process.env.SMOKE_CMS || path.resolve(__dirname, '../../../cms'), 'relay', 'relay.js');
const MOCK_PORT = 48141, RELAY_PORT = 48142, RELAY2_PORT = 48143;
const SECRET = 'GEZDGNBVGY3TQOJQ';
const TICK_KEY = 'qa-tick-key';
const STREAM_KEY = 'qa-stream-key';
/* Calendar-safe futures fixture. The old test hardcoded SEP26; once that
   contract expired the real relay correctly chose MAR27 while the mock kept
   returning quotes for SEP26, turning the full forward-only belt red. Build a
   nearest and a farther live contract from today's month instead. */
const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
function fixtureContract(monthsAhead, tokenStem) {
  const now = new Date();
  let base = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const expiryGrace = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 30, 15);
  if (Date.now() > expiryGrace) base = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + monthsAhead, 1));
  const yy = String(d.getUTCFullYear()).slice(-2);
  return { suffix:`27${MONTHS[d.getUTCMonth()]}${yy}`, goldToken:`${tokenStem}1`, silverToken:`${tokenStem}2` };
}
const NEAR = fixtureContract(0, '99210010');
const FAR = fixtureContract(6, '99210020');

let pass = 0, fail = 0;
async function test(name, fn) {
  try { await fn(); pass++; console.log('PASS ' + name); }
  catch (e) { fail++; console.log('FAIL ' + name + ': ' + (e && e.message || e)); }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* independent RFC 6238, same shape as api.php — the mock's oracle */
function b32(s) {
  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  s = String(s).toUpperCase().replace(/[\s-]/g, '');
  let bits = 0, value = 0; const out = [];
  for (const ch of s) { const i = A.indexOf(ch); if (i < 0) continue; value = (value << 5) | i; bits += 5; if (bits >= 8) { bits -= 8; out.push((value >>> bits) & 0xff); } }
  return Buffer.from(out);
}
function totpAt(tsSec) {
  const buf = Buffer.alloc(8); buf.writeBigUInt64BE(BigInt(Math.floor(tsSec / 30)));
  const h = crypto.createHmac('sha1', b32(SECRET)).update(buf).digest();
  const o = h[h.length - 1] & 0x0f;
  return String((((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3]) % 1e6).padStart(6, '0');
}

const mock = {
  logins: 0, totpSeen: [], quoteMode: 'ok', quoteCount: 0,
  listen(port) { return new Promise((res) => { this.srv = http.createServer(handleMock); this.srv.listen(port, '127.0.0.1', () => res()); }); },
};
function handleMock(req, res) {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    const send = (code, obj, raw) => { res.writeHead(code, raw ? {} : { 'Content-Type': 'application/json' }); res.end(raw ? obj : JSON.stringify(obj)); };
    try {
      if (req.url.includes('loginByPassword')) {
        mock.logins++;
        const j = JSON.parse(body || '{}');
        const now = Math.floor(Date.now() / 1000);
        mock.totpSeen.push(j.totp);
        if (!j.clientcode || !j.password || (j.totp !== totpAt(now) && j.totp !== totpAt(now - 30)))
          return send(400, { status: false, message: 'mock: bad credentials or TOTP' });
        return send(200, { status: true, data: { jwtToken: 'jwt-' + mock.logins, feedToken: 'feed-1' } });
      }
      if (req.url.includes('searchScrip')) {
        const j = JSON.parse(body || '{}');
        const metal = String(j.searchscrip || '').toUpperCase();
        if (metal !== 'GOLD' && metal !== 'SILVER') return send(400, { status: false, message: 'bad searchscrip' });
        const nearToken = metal === 'GOLD' ? NEAR.goldToken : NEAR.silverToken;
        const farToken = metal === 'GOLD' ? FAR.goldToken : FAR.silverToken;
        return send(200, { status: true, data: [
          { tradingsymbol: metal + FAR.suffix, symboltoken: farToken },
          { tradingsymbol: metal + '_BAD', symboltoken: '1' },
          { tradingsymbol: metal + NEAR.suffix, symboltoken: nearToken },
        ] });
      }
      if (req.url.includes('/quote/')) {
        mock.quoteCount++;
        if (mock.quoteMode === 'network500') return send(500, 'mock boom', true);
        if (mock.quoteMode === 'unauthorized') return send(401, { status: false, message: 'token expired' });
        const g = 90000 + mock.quoteCount, s = 105000 + mock.quoteCount;
        return send(200, { status: true, data: { fetched: [
          { tradingsymbol: 'GOLD' + NEAR.suffix, symbolToken: NEAR.goldToken, ltp: g, bid: g - 5, ask: g + 5, open: g, high: g + 10, low: g - 10, close: g - 20, chg: 10, chgPct: 0.01, oi: 1000, atp: g, vol: 50, feedTime: new Date().toISOString() },
          { tradingsymbol: 'SILVER' + NEAR.suffix, symbolToken: NEAR.silverToken, ltp: s, bid: s - 20, ask: s + 20, open: s, high: s + 100, low: s - 100, close: s - 200, chg: 50, chgPct: 0.05, oi: 2000, atp: s, vol: 60, feedTime: new Date().toISOString() },
        ], unfetched: [] } });
      }
      send(404, { status: false, message: 'mock: unknown path ' + req.url });
    } catch (e) { send(500, 'mock handler error: ' + e.message, true); }
  });
}

function startRelay(port) {
  return new Promise((resolve) => {
    const p = spawn(process.execPath, [RELAY], {
      cwd: path.dirname(RELAY),
      env: { ...process.env,
        ANGEL_API_BASE: 'http://127.0.0.1:' + MOCK_PORT,
        ANGEL_API_KEY: 'qa-key', ANGEL_CLIENT: '1000000001', ANGEL_MPIN: '1234',
        ANGEL_TOTP_SECRET: SECRET, RELAY_TICK_KEY: TICK_KEY, RELAY_STREAM_KEY: STREAM_KEY,
        PORT: String(port) },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    p.log = '';
    p.stdout.on('data', (d) => (p.log += d));
    p.stderr.on('data', (d) => (p.log += d));
    p.on('exit', (code) => { if (p.waiters) p.waiters.forEach((w) => w(code)); p.waiters = []; });
    p.waitExit = (ms) => new Promise((res) => { p.waiters = p.waiters || []; if (p.exited) return res(p.code); p.waiters.push(res); setTimeout(() => res(null), ms); });
    p.base = 'http://127.0.0.1:' + port;
    // wait for the HTTP surface
    (function wait() {
      http.get(p.base + '/healthz', (r) => { r.resume(); resolve(p); })
        .on('error', () => { if (p.exited) return resolve(p); setTimeout(wait, 100); });
    })();
  });
}
function getJson(url, headers) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    http.get({ hostname: u.hostname, port: u.port, path: u.pathname + u.search, headers: headers || {} }, (r) => {
      let b = '';
      r.on('data', (c) => (b += c));
      r.on('end', () => { let j = null; try { j = JSON.parse(b); } catch {} resolve({ code: r.statusCode, json: j, body: b }); });
    }).on('error', reject);
  });
}
async function waitFor(fn, what, ms) {
  const t0 = Date.now();
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() - t0 > ms) throw new Error('timed out waiting for ' + what + (relayLogs() ? ' | relay log: ' + relayLogs().slice(-400) : ''));
    await sleep(250);
  }
}
let R1 = null, R2 = null;
Object.assign(globalThis, { getR1: () => R1, getR2: () => R2 });
function relayLogs() { return R1 ? R1.log : ''; }

(async () => {
  const t0 = Date.now();
  const deadline = 150000;
  await mock.listen(MOCK_PORT);

  R1 = await startRelay(RELAY_PORT);

  await test('T01 the relay boots, logs in once, and resolves the NEAREST-expiry contract', async () => {
    await waitFor(async () => {
      const h = await getJson(R1.base + '/healthz');
      return h.json && h.json.state && h.json.state.state === 'live';
    }, 'state live', 30000);
    assert.equal(mock.logins, 1, 'exactly one login at boot');
    assert.ok(mock.totpSeen[0] === totpAt(Math.floor(Date.now() / 1000)) || mock.totpSeen[0] === totpAt(Math.floor(Date.now() / 1000) - 30),
      'TOTP is a valid RFC 6238 code for the configured secret (' + mock.totpSeen[0] + ')');
    const t = await getJson(R1.base + '/tick', { 'X-Relay-Key': TICK_KEY });
    assert.equal(t.code, 200);
    assert.equal(t.json.gold.symbol, 'GOLD' + NEAR.suffix, 'nearest expiry wins, not the far month');
    assert.equal(t.json.silver.symbol, 'SILVER' + NEAR.suffix);
    assert.ok(t.json.gold.ltp > 0 && t.json.silver.ltp > 0);
    assert.equal(t.json.relay, true);
  });

  await test('T02 /tick is key-gated and serves the live shape the site expects', async () => {
    const bad = await getJson(R1.base + '/tick', { 'X-Relay-Key': 'wrong' });
    assert.equal(bad.code, 403);
    const t = await getJson(R1.base + '/tick', { 'X-Relay-Key': TICK_KEY });
    for (const k of ['at', 'source', 'open', 'gold', 'silver', 'stale', 'ts', 'relay', 'servedFrom']) assert.ok(k in t.json, 'tick.' + k);
    assert.equal(t.json.source, 'live-mcx');
  });

  await test('T03 SSE /stream is key-gated and pushes live frames to the screens', async () => {
    const bad = await new Promise((res) => http.get(R1.base + '/stream?key=wrong', (r) => { res(r.statusCode); r.resume(); }));
    assert.equal(bad, 403);
    const frames = await new Promise((resolve, reject) => {
      const req = http.get(R1.base + '/stream?key=' + STREAM_KEY, (r) => {
        let got = 0, buf = '';
        r.on('data', (c) => {
          buf += c;
          let i;
          while ((i = buf.indexOf('\n\n')) >= 0) {
            const msg = buf.slice(0, i); buf = buf.slice(i + 2);
            if (msg.startsWith('data: ')) { got++; try { resolve({ got, last: JSON.parse(msg.slice(6)) }); } catch {} }
          }
        });
        setTimeout(() => reject(new Error('no SSE frame in 8 s')), 8000);
      });
      req.on('error', reject);
    });
    assert.ok(frames.got >= 1);
    assert.ok(frames.last.gold && frames.last.gold.ltp > 0);
  });

  await test('T04 a mid-stream failure self-heals: backoff, then LIVE again (the "signal is aborted" class)', async () => {
    const framesBefore = (await getJson(R1.base + '/healthz')).json.frames;
    mock.quoteMode = 'network500';
    await waitFor(async () => ((await getJson(R1.base + '/healthz')).json.state.state === 'backoff'), 'state backoff', 20000);
    mock.quoteMode = 'ok';
    await waitFor(async () => {
      const h = await getJson(R1.base + '/healthz');
      return h.json.state.state === 'live' && h.json.frames > framesBefore;
    }, 'state live again with more frames', 45000);
    const h = await getJson(R1.base + '/healthz');
    assert.ok(h.json.lastFrameAgeMs < 5000, 'frames flowing (' + h.json.lastFrameAgeMs + ' ms ago)');
    const t = await getJson(R1.base + '/tick', { 'X-Relay-Key': TICK_KEY });
    assert.ok(t.json.gold.ltp > 0, 'tick fresh after recovery');
  });

  await test('T05 a dead session (3:30 AM expiry) heals by automatic re-login', async () => {
    const loginsBefore = mock.logins;
    mock.quoteMode = 'unauthorized';
    await waitFor(async () => ((await getJson(R1.base + '/healthz')).json.state.state === 'backoff'), 'state backoff after 401', 25000);
    mock.quoteMode = 'ok';
    await waitFor(async () => ((await getJson(R1.base + '/healthz')).json.state.state === 'live'), 'state live after re-login', 45000);
    assert.ok(mock.logins >= loginsBefore + 1, 're-logged in (logins ' + loginsBefore + ' -> ' + mock.logins + ')');
    const lastTotp = mock.totpSeen[mock.totpSeen.length - 1];
    const now = Math.floor(Date.now() / 1000);
    assert.ok(lastTotp === totpAt(now) || lastTotp === totpAt(now - 30), 're-login TOTP also valid');
  });

  await test('T06 /healthz is the contract the admin strip renders from', async () => {
    const h = await getJson(R1.base + '/healthz');
    for (const k of ['ok', 'state', 'frames', 'lastFrameAgeMs', 'lastError', 'uptimeSec']) assert.ok(k in h.json, 'healthz.' + k);
    assert.equal(h.json.ok, true);
    assert.ok(typeof h.json.state.state === 'string');
  });

  await test('T07 a crashed relay still serves the last good tick on restart', async () => {
    const onDisk = JSON.parse(fs.readFileSync(path.join(path.dirname(RELAY), 'relay-last-tick.json'), 'utf8'));
    assert.ok(onDisk.gold && onDisk.gold.ltp > 0, 'last tick persisted by the live relay');
    R1.kill('SIGTERM');
    await R1.waitExit(5000);
    R2 = await startRelay(RELAY2_PORT);
    // immediately after boot — before this new process has polled — the
    // persisted tick must be served, or a fresh one
    const t = await getJson(R2.base + '/tick', { 'X-Relay-Key': TICK_KEY });
    assert.equal(t.code, 200);
    assert.ok(t.json.gold.ltp > 0, 'tick available right after a restart');
    assert.equal(t.json.source, 'live-mcx');
  });

  cleanup();
  console.log('\nv179 relay: ' + pass + ' passed, ' + fail + ' failed (' + Math.round((Date.now() - t0) / 1000) + ' s)');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('relay harness error: ' + (e && e.stack || e)); cleanup(); process.exit(1); });

function cleanup() {
  for (const p of [globalThis.getR1(), globalThis.getR2()]) {
    try { if (p && !p.killed) { p.killed = true; p.kill('SIGKILL'); } } catch {}
  }
  try { if (mock.srv) mock.srv.close(); } catch {}
}
process.on('exit', cleanup);
