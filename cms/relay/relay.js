#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════════
   SHIVAA · Angel relay v2 — the self-healing MCX ticker (v179)

   Replaces the v78 relay that lived only on Render. Same public contract
   the site already speaks:
     GET /tick            → latest tick JSON   (X-Relay-Key auth)
     GET /stream?key=…    → public SSE for the jewellers' screens
     GET /healthz         → liveness + feed state
   …but it is built ONLY on the Angel SmartAPI REST endpoints that the
   site's own api.php already proves in production (loginByPassword +
   TOTP, searchScrip, quote @ 1 rps) — no proprietary WebSocket protocol,
   nothing to guess, and every failure mode is one the code explicitly
   heals:

     · any network error — including "signal is aborted without reason" —
       is a RECONNECT with exponential backoff + jitter (1 s → 300 s cap),
       reset on the first good frame;
     · daily 3:30 AM session expiry → automatic re-login (TOTP generated
       here from the secret, same as api.php); re-logins are gated to one
       per 30 s so a bad secret can never storm the API;
     · contract rollover (a token stops being fetched) → automatic
       Search-Scrip re-resolution, nearest expiry first;
     · HTTP 429 → polite 5 s poll backoff until the account recovers;
     · watchdog: no frame for 90 s while the market is open → force
       re-login + re-resolution and continue;
     · the latest tick is persisted to disk, so /tick still answers after
       a crash/restart until the feed re-establishes;
     · unhandled rejections and uncaught exceptions are logged, never
       fatal — the process keeps serving the last good tick.

   Config: environment variables (preferred on Render) or
   relay.config.json next to this file. Env wins over the file.
     ANGEL_API_KEY / ANGEL_CLIENT / ANGEL_MPIN / ANGEL_TOTP_SECRET
     RELAY_TICK_KEY    (X-Relay-Key the SITE sends on /tick)
     RELAY_STREAM_KEY  (public ?key=… for /stream, the jewellers' screens)
     ANGEL_GOLD_TOKEN / ANGEL_SILVER_TOKEN  (optional manual contract tokens)
     PORT              (Render sets this; default 8080)

   Node 18+ · zero npm dependencies · one file.
   ══════════════════════════════════════════════════════════════════════ */
'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const IS_TZ = 'Asia/Kolkata';
const log = (...a) => console.log(new Date().toISOString(), ...a);

/* ── config ───────────────────────────────────────────────────────────── */
function loadConfig() {
  const file = path.join(__dirname, 'relay.config.json');
  const f = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
  const env = process.env;
  const c = {
    apiKey: env.ANGEL_API_KEY || f.apiKey || '',
    client: env.ANGEL_CLIENT || f.client || '',
    mpin: env.ANGEL_MPIN || f.mpin || '',
    totpSecret: env.ANGEL_TOTP_SECRET || f.totpSecret || '',
    tickKey: env.RELAY_TICK_KEY || f.tickKey || '',
    streamKey: env.RELAY_STREAM_KEY || f.streamKey || '',
    goldToken: env.ANGEL_GOLD_TOKEN || f.goldToken || '',
    silverToken: env.ANGEL_SILVER_TOKEN || f.silverToken || '',
    port: parseInt(env.PORT || f.port || '8080', 10),
  };
  return c;
}
const CFG = loadConfig();

/* ── TOTP (RFC 6238, 6 digits, 30 s step — identical to api.php) ─────── */
function b32decode(s) {
  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  s = String(s).toUpperCase().replace(/[\s-]/g, '');
  let bits = 0, value = 0; const out = [];
  for (const ch of s) {
    const idx = A.indexOf(ch); if (idx < 0) continue;
    value = (value << 5) | idx; bits += 5;
    if (bits >= 8) { bits -= 8; out.push((value >>> bits) & 0xff); }
  }
  return Buffer.from(out);
}
function totp(secret) {
  try {
    const key = b32decode(secret); if (!key.length) return '';
    const counter = Math.floor(Date.now() / 1000 / 30);
    const buf = Buffer.alloc(8); buf.writeBigUInt64BE(BigInt(counter));
    const h = crypto.createHmac('sha1', key).update(buf).digest();
    const o = h[h.length - 1] & 0x0f;
    const code = (((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3]) % 1e6;
    return String(code).padStart(6, '0');
  } catch { return ''; }
}

/* ── Angel SmartAPI REST (the same endpoints api.php uses) ───────────── */
const BASE = process.env.ANGEL_API_BASE || 'https://apiconnect.angelbroking.com'; // env override = smoke tests against a mock
const HEADERS = {
  'X-UserType': 'USER', 'X-SourceID': 'WEB',
  'X-ClientLocalIP': '127.0.0.1', 'X-ClientPublicIP': '127.0.0.1',
  'X-MACAddress': '00:00:00:00:00:00', 'X-PrivateKey': CFG.apiKey,
  'Content-Type': 'application/json', 'Accept': 'application/json',
};

/* Every fetch gets a CONNECT-phase-only abort signal: 15 s to establish
   the response, and after that NOTHING may abort a good connection — this
   is the exact class of bug behind "signal is aborted without reason". */
function fetchJson(url, method, body, extraHeaders, timeoutMs = 15000) {
  return new Promise((resolve) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => { try { ctrl.abort('timeout'); } catch {} }, timeoutMs);
    fetch(url, {
      method, headers: { ...HEADERS, ...(extraHeaders || {}) },
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    }).then(async (res) => {
      clearTimeout(t);
      let j = null; try { j = await res.json(); } catch {}
      resolve({ code: res.status, json: j });
    }).catch((e) => { clearTimeout(t); resolve({ code: 0, json: null, error: (e && e.message) || String(e) }); });
  });
}

let SESSION = null;           // {jwt, feed}
let lastLoginAt = 0;          // re-login gate (30 s)
const state = {
  state: 'starting',          // starting|live|backoff|market-closed|error
  backoffMs: 1000,
  frames: 0,
  lastFrameAt: 0,
  lastError: '',
  tokens: { gold: '', silver: '', goldSymbol: '', silverSymbol: '', goldExp: 0, silverExp: 0 },
  lastTick: null,             // the published tick
  lastOkAt: 0,
};

async function login() {
  if (!CFG.apiKey || !CFG.client || !CFG.mpin || !CFG.totpSecret) { state.lastError = 'credentials missing in relay config'; return false; }
  if (Date.now() - lastLoginAt < 30000) return !!SESSION;      // gate
  lastLoginAt = Date.now();
  const r = await fetchJson(BASE + '/rest/auth/angelbroking/user/v1/loginByPassword', 'POST',
    { clientcode: CFG.client, password: CFG.mpin, totp: totp(CFG.totpSecret) });
  const j = r.json;
  if (r.code === 200 && j && j.status && j.data && j.data.jwtToken) {
    SESSION = { jwt: j.data.jwtToken, feed: j.data.feedToken || '' };
    log('logged in');
    return true;
  }
  state.lastError = 'login: ' + (j && j.message ? j.message : ('HTTP ' + r.code + (r.error ? ' ' + r.error : '')));
  log(state.lastError);
  return false;
}

/* nearest-month MCX futures via Search Scrip — mirrors angel_search_candidates */
function expiryMs(sym) {
  const m = /^(GOLD|SILVER)\d{1,2}([A-Z]{3})(\d{2,4})$/.exec(String(sym).toUpperCase());
  if (!m) return 0;
  const months = { JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5, JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11 };
  const mon = months[m[2]]; if (mon === undefined) return 0;
  let year = 2000 + parseInt(m[3], 10);
  if (year < 100) year += 2000;
  const now = new Date();
  if (year < now.getFullYear()) year += 100;
  return Date.UTC(year, mon, 27, 15, 0, 0);
}
async function resolveTokens() {
  if (CFG.goldToken && CFG.silverToken) {
    state.tokens = { gold: CFG.goldToken, silver: CFG.silverToken, goldSymbol: 'GOLD(manual)', silverSymbol: 'SILVER(manual)', goldExp: 0, silverExp: 0 };
    return true;
  }
  if (!SESSION) return false;
  const h = { Authorization: 'Bearer ' + SESSION.jwt, 'X-FeedToken': SESSION.feed };
  const out = {};
  for (const metal of ['GOLD', 'SILVER']) {
    const r = await fetchJson(BASE + '/rest/secure/angelbroking/order/v1/searchScrip', 'POST',
      { exchange: 'MCX', searchscrip: metal }, h, 12000);
    const rows = (r.json && r.json.status && Array.isArray(r.json.data)) ? r.json.data : [];
    const pat = new RegExp('^' + metal + '(\\d{1,2})([A-Z]{3})(\\d{2,4})$');
    const cands = [];
    for (const row of rows) {
      if (!row) continue;
      const sym = String(row.tradingsymbol || row.tradingSymbol || row.symbol || '').toUpperCase();
      const tok = String(row.symboltoken ?? row.symbolToken ?? row.token ?? '').trim();
      if (!tok || !pat.test(sym)) continue;
      const exp = expiryMs(sym); if (!exp || exp < Date.now() - 3 * 86400000) continue;
      cands.push({ exp, token: tok, sym });
    }
    cands.sort((a, b) => a.exp - b.exp);
    if (!cands.length) { state.lastError = metal + ': no live future found in Search Scrip'; return false; }
    out[metal] = cands[0];
  }
  state.tokens = { gold: out.GOLD.token, silver: out.SILVER.token,
    goldSymbol: out.GOLD.sym, silverSymbol: out.SILVER.sym,
    goldExp: out.GOLD.exp, silverExp: out.SILVER.exp };
  log('contracts resolved:', out.GOLD.sym, out.SILVER.sym);
  return true;
}

function mapQuote(item, metal, token) {
  const n = (k) => Number(item[k] ?? 0) || 0;
  return {
    symbol: String(item.tradingsymbol || item.tradingSymbol || (metal === 'GOLD' ? state.tokens.goldSymbol : state.tokens.silverSymbol) || ''),
    ltp: n('ltp'), bid: n('bid'), ask: n('ask'), bidQty: n('bidQty'), askQty: n('askQty'),
    open: n('open'), high: n('high'), low: n('low'), close: n('close'),
    chg: n('chg'), chgPct: n('chgPct'), oi: n('oi'), atp: n('atp'), vol: n('vol'),
    feedTime: String(item.feedTime || ''), token,
  };
}

async function pollOnce() {
  if (!SESSION) return false;
  const h = { Authorization: 'Bearer ' + SESSION.jwt, 'X-FeedToken': SESSION.feed };
  const r = await fetchJson(BASE + '/rest/secure/angelbroking/market/v1/quote/', 'POST',
    { mode: 'LTP', exchangeTokens: { MCX: [state.tokens.gold, state.tokens.silver] } }, h, 12000);
  const j = r.json;
  const fetched = (j && Array.isArray(j.data && j.data.fetched)) ? j.data.fetched : [];
  const unfetched = (j && Array.isArray(j.data && j.data.unfetched)) ? j.data.unfetched : [];
  const byTok = {};
  for (const it of fetched) byTok[String(it.symbolToken ?? it.symboltoken ?? '')] = it;
  const g = byTok[state.tokens.gold]; const s = byTok[state.tokens.silver];
  if (r.code >= 200 && r.code < 300 && g && s && Number(g.ltp) > 0 && Number(s.ltp) > 0) {
    const tick = {
      at: new Date().toISOString(), source: 'live-mcx',
      open: Number(g.bid) > 0 && Number(g.ask) > 0 && Number(s.bid) > 0 && Number(s.ask) > 0,
      gold: mapQuote(g, 'GOLD', state.tokens.gold), silver: mapQuote(s, 'SILVER', state.tokens.silver),
      stale: false, ts: Date.now() / 1000, relay: true, servedFrom: 'relay-v2',
    };
    state.lastTick = tick; state.lastFrameAt = Date.now(); state.frames++; state.lastOkAt = Date.now();
    state.backoffMs = 1000; state.lastError = '';
    if (state.state !== 'live') { state.state = 'live'; log('feed LIVE', tick.gold.symbol, tick.silver.symbol); }
    try { fs.writeFileSync(path.join(__dirname, 'relay-last-tick.json'), JSON.stringify(tick)); } catch {}
    broadcast(tick);
    return true;
  }
  const refusedTok = unfetched.map((u) => String(u.symbolToken ?? '')).join(',');
  if (r.code === 401 || r.code === 400 || r.code === 403 || r.code === 429 ||
      (j && !j.status) || refusedTok.includes(state.tokens.gold) || refusedTok.includes(state.tokens.silver)) {
    state.lastError = 'quote refused (HTTP ' + r.code + (refusedTok ? '; tokens: ' + refusedTok : '') + (j && j.message ? '; ' + j.message : '') ;
    if (r.code === 429) { state.state = 'backoff'; log('rate limited — backing off 5 s'); await sleep(5000); }
    const wasSession = (r.code === 401 || r.code === 400 || r.code === 403 || (j && !j.status));
    if (wasSession) { SESSION = null; await login(); if (!SESSION) return false; }
    if (refusedTok.includes(state.tokens.gold) || refusedTok.includes(state.tokens.silver)) {
      log('contract rollover suspected — re-resolving tokens');
      await resolveTokens();
    }
    return false;
  }
  state.lastError = 'quote empty (HTTP ' + r.code + (r.error ? '; ' + r.error : '') ;
  return false;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* market open? Mon–Fri 09:00–23:40 IST (same rule as api.php) */
function marketOpen() {
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: IS_TZ }));
  const day = d.getDay(); const hm = d.getHours() * 100 + d.getMinutes();
  return day >= 1 && day <= 5 && hm >= 900 && hm <= 2340;
}

async function run() {
  log('relay v2 starting', CFG.apiKey ? '(credentials present)' : '(NO credentials — idle)');
  if (!CFG.apiKey) { state.state = 'error'; state.lastError = 'credentials missing in relay config'; }
  for (;;) {
    try {
      if (!CFG.apiKey) { await sleep(60000); continue; }
      if (!SESSION) {
        if (!await login()) { await backoff(); continue; }
        if (!state.tokens.gold && !await resolveTokens()) { await backoff(); continue; }
      }
      // rollover: the resolved month has passed → re-resolve
      if (state.tokens.goldExp && state.tokens.goldExp < Date.now() - 86400000) {
        log('resolved contracts expired — re-resolving');
        await resolveTokens();
      }
      const ok = await pollOnce();
      if (!ok) { await backoff(); continue; }
      // watchdog: no frame for 90 s while open → force a fresh session
      if (marketOpen() && Date.now() - state.lastFrameAt > 90000) {
        log('watchdog: no frame for 90 s — forcing re-login');
        SESSION = null;
      }
      await sleep(1000);            // Angel's 1 rps quote limit
    } catch (e) {
      // THIS is the permanent answer to "signal is aborted without reason":
      // any abort/timeout/network failure lands here and becomes a sane
      // backoff + retry loop instead of a dead process.
      state.lastError = (e && e.message) || String(e);
      log('feed error (will reconnect):', state.lastError);
      await backoff();
    }
  }
}
async function backoff() {
  state.state = 'backoff';
  const jitter = Math.random() * 0.5 + 0.75;      // 75–125 %
  await sleep(Math.min(state.backoffMs * jitter, 300000));
  state.backoffMs = Math.min(state.backoffMs * 2, 300000);
}

/* ── the HTTP surface (same contract as v78) ─────────────────────────── */
const clients = new Set();
function broadcast(tick) {
  const line = 'data: ' + JSON.stringify(tick) + '\n\n';
  for (const res of clients) { try { res.write(line); } catch { clients.delete(res); } }
}
function publicTick() {
  let t = state.lastTick;
  if (!t) {
    try { t = JSON.parse(fs.readFileSync(path.join(__dirname, 'relay-last-tick.json'), 'utf8')); } catch {}
  }
  if (!t) return null;
  if (Date.now() - (t.ts * 1000) > 30000) t = { ...t, stale: true };
  return t;
}
const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  if (u.pathname === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      ok: state.state === 'live', state, frames: state.frames,
      lastFrameAgeMs: state.lastFrameAt ? Date.now() - state.lastFrameAt : null,
      lastError: state.lastError, backoffMs: state.backoffMs,
      uptimeSec: Math.round(process.uptime()),
    }));
  }
  if (u.pathname === '/tick') {
    if (CFG.tickKey && req.headers['x-relay-key'] !== CFG.tickKey) { res.writeHead(403); return res.end('forbidden'); }
    const t = publicTick();
    if (!t) { res.writeHead(204); return res.end(); }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(t));
  }
  if (u.pathname === '/stream') {
    if (CFG.streamKey && u.searchParams.get('key') !== CFG.streamKey) { res.writeHead(403); return res.end('forbidden'); }
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.write('retry: 1000\n\n');
    const t = publicTick(); if (t) res.write('data: ' + JSON.stringify(t) + '\n\n');
    clients.add(res);
    const hb = setInterval(() => { try { res.write(': hb\n\n'); } catch { clearInterval(hb); } }, 15000);
    req.on('close', () => { clients.delete(res); clearInterval(hb); });
    return;
  }
  res.writeHead(404); res.end('relay v2: /tick · /stream · /healthz');
});
process.on('unhandledRejection', (e) => log('unhandledRejection (ignored, feed loop self-heals):', (e && e.message) || e));
process.on('uncaughtException', (e) => log('uncaughtException (ignored, feed loop self-heals):', (e && e.message) || e));
server.listen(CFG.port, () => log('relay v2 listening on :' + CFG.port + ' (stream clients: dynamic)'));
run();
