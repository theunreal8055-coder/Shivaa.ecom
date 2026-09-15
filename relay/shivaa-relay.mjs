#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════
   SHIVAA BULLION RELAY (v78)
   Always-on bridge between Angel One SmartAPI's OFFICIAL push WebSocket
   (SmartStream v2 — tick-by-tick LTP/Quote/SnapQuote, no 1 rps REST limit)
   and the Shivaa PHP board.

   Three delivery modes, chosen automatically by where this runs:
   1. SAME HOST as the PHP site (a small VPS): writes data/.angel-tick.json
      atomically ~10×/second — api.php serves it directly, zero HTTP hops.
   2. REMOTE HOST (free/cheap Node host): the site polls GET /tick (JSON)
      and browsers can open GET /stream (Server-Sent Events) for instant
      push. Both require ?key= / X-Relay-Key matching STREAM_KEY.
   3. No relay running: the PHP app silently falls back to its own 1 rps
      REST polling — nothing breaks.

   Zero build step. Requires Node >= 18 and the `ws` package (npm install).
   Configure via relay.config.json (see relay.config.example.json) or
   environment variables. Runs under systemd / pm2 / any Node host.
   ═══════════════════════════════════════════════════════════════════════ */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { WebSocket } from 'ws';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/* ───────── config (file, then environment overrides) ───────── */
function loadConfig() {
  let file = {};
  const argCfg = process.argv.find(a => a.startsWith('--config='));
  const cfgPath = argCfg ? argCfg.split('=')[1] : path.join(__dirname, 'relay.config.json');
  try { file = JSON.parse(fs.readFileSync(cfgPath, 'utf8')); } catch { /* optional */ }
  const env = process.env;
  return {
    apiKey: env.SHIVAA_ANGEL_APIKEY || file.apiKey || '',
    clientCode: env.SHIVAA_ANGEL_CLIENT || file.clientCode || '',
    mpin: env.SHIVAA_ANGEL_MPIN || file.mpin || '',
    totpSecret: env.SHIVAA_ANGEL_TOTP || file.totpSecret || '',
    goldToken: env.SHIVAA_GOLD_TOKEN || file.goldToken || '',
    silverToken: env.SHIVAA_SILVER_TOKEN || file.silverToken || '',
    mode: parseInt(env.SHIVAA_MODE || file.mode || '3', 10),       // 1 LTP · 2 Quote · 3 SnapQuote (depth)
    host: env.SHIVAA_RELAY_HOST || file.host || '127.0.0.1',
    // cloud hosts (Render, Railway…) inject a standard PORT env
    port: parseInt(env.SHIVAA_RELAY_PORT || env.PORT || file.port || '8944', 10),
    streamKey: env.SHIVAA_RELAY_KEY || file.streamKey || crypto.randomBytes(18).toString('hex'),
    publicUrl: (env.SHIVAA_PUBLIC_URL || file.publicUrl || '').replace(/\/+$/, ''),
    // when running on the same box as cms/, point this at cms/data
    cacheDir: env.SHIVAA_CACHE_DIR || file.cacheDir || path.resolve(__dirname, '..', 'data'),
    stateFile: env.SHIVAA_STATE_FILE || file.stateFile || path.join(__dirname, '.relay-state.json'),
    writeCache: !('SHIVAA_WRITE_CACHE' in env) ? (file.writeCache !== false) : env.SHIVAA_WRITE_CACHE === '1',
  };
}
const CFG = loadConfig();
const log = (...a) => console.log(new Date().toISOString(), ...a);

/* ───────── RFC 6238 TOTP (same algorithm as api.php) ───────── */
function totpNow(base32Secret, whenSec = Math.floor(Date.now() / 1000)) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const secret = (base32Secret || '').toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = '';
  for (const ch of secret) { const v = alphabet.indexOf(ch); if (v >= 0) bits += v.toString(2).padStart(5, '0'); }
  const key = Buffer.alloc(Math.floor(bits.length / 8));
  for (let i = 0; i < key.length; i++) key[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);
  const counter = Buffer.alloc(8);
  counter.writeUInt32BE(Math.floor(whenSec / 30) >>> 0, 4);
  const hmac = crypto.createHmac('sha1', key).update(counter).digest();
  const off = hmac[hmac.length - 1] & 0x0f;
  const num = ((hmac[off] & 0x7f) << 24) | (hmac[off + 1] << 16) | (hmac[off + 2] << 8) | hmac[off + 3];
  return String(num % 1000000).padStart(6, '0');
}

/* ───────── near-month GOLD/SILVER contract resolution ─────────
   Mirrors api.php angel_search_candidates(): nearest-expiry token
   whose symbol matches GOLDddMMMyyyy / SILVERddMMMyyyy exactly. */
const MONTHS = { JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5, JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11 };
// Angel returns MCX symbols two ways: "GOLD05OCT2026" and the current
// searchScrip shape "GOLD04DEC26FUT" (2-digit year, FUT/FUTCOM suffix).
function symExpiry(sym) {
  const m = /^[A-Z]+?(\d{1,2})([A-Z]{3})(\d{2,4})(?:FUT\w*)?$/.exec((sym || '').toUpperCase().trim());
  if (!m) return 0;
  let yy = parseInt(m[3], 10);
  if (m[3].length === 2) yy = 2000 + yy;
  return Date.UTC(yy, MONTHS[m[2]] ?? 0, parseInt(m[1], 10)) / 1000;
}
function pickContract(rows, metal) {
  const re = new RegExp(`^${metal}(\\d{1,2})([A-Z]{3})(\\d{2,4})(?:FUT\\w*)?$`);
  const cands = [];
  for (const r of rows || []) {
    const sym = String(r.tradingsymbol || r.tradingSymbol || r.symbol || '').toUpperCase().trim();
    const tok = String(r.symboltoken || r.symbolToken || r.token || '').trim();
    if (!re.test(sym) || !tok) continue;
    // exclude mini/micro/option variants if the API ever includes them
    if (/^(GOLDM|GOLDGUINEA|GOLDPETAL|GOLDTEN|SILVERM|SILVERMICRO)/.test(sym)) continue;
    const exp = symExpiry(sym);
    if (exp > Date.now() / 1000 - 3 * 86400) cands.push({ exp, token: tok, symbol: sym });
  }
  cands.sort((a, b) => a.exp - b.exp);
  return cands[0] || null;
}

/* ───────── Angel SmartStream v2 binary packet parser ─────────
   Byte layout (Little Endian), per the official SmartAPI SDK:
     0  u8  subscription mode (1 LTP, 2 Quote, 3 SnapQuote)
     1  u8  exchange type (5 = MCX)
     2  25× ASCII token, NUL terminated
     27 i64 sequence number
     35 i64 exchange timestamp (epoch ms)
     43 i64 last traded price          × 1/100
     51 i64 last traded quantity
     59 f64 average traded price
     67 f64 volume for the day
     75 f64 total buy quantity
     83 f64 total sell quantity
     91 i64 open ×1/100 · 99 high · 107 low · 115 close
     123 i64 last-trade timestamp ms · 131 i64 OI · 139 i64 OI chg %
     147…347 ten 20-byte depth rows (u16 flag, i64 qty, i64 price/100, u16 orders)
     347/355 circuit limits, 363/371 52-week H/L                                    */
function parsePacket(buf) {
  if (!buf || buf.length < 51) return null;
  const i64 = (o) => buf.readBigInt64LE(o).toString();
  const mode = buf.readUInt8(0);
  const exch = buf.readUInt8(1);
  let token = '';
  for (let i = 2; i < 27 && buf[i] !== 0; i++) token += String.fromCharCode(buf[i]);
  const out = {
    subscriptionMode: mode, exchangeType: exch, token,
    sequence: Number(buf.readBigInt64LE(27)),
    exchangeTimestampMs: Number(buf.readBigInt64LE(35)),
    ltp: Number(buf.readBigInt64LE(43)) / 100,
  };
  if (mode === 2 || mode === 3) {
    Object.assign(out, {
      lastQty: i64(51), atp: buf.readDoubleLE(59), vol: buf.readDoubleLE(67),
      totBuy: buf.readDoubleLE(75), totSell: buf.readDoubleLE(83),
      open: Number(buf.readBigInt64LE(91)) / 100,
      high: Number(buf.readBigInt64LE(99)) / 100,
      low: Number(buf.readBigInt64LE(107)) / 100,
      close: Number(buf.readBigInt64LE(115)) / 100,
    });
  }
  if (mode === 3) {
    out.lttMs = Number(buf.readBigInt64LE(123));
    out.oi = Number(buf.readBigInt64LE(131));
    out.oiChgPct = Number(buf.readBigInt64LE(139));
    const rows = [];
    for (let k = 0; k < 10; k++) {
      const o = 147 + k * 20;
      if (o + 20 > buf.length) break;
      rows.push({
        flag: buf.readUInt16LE(o),
        qty: Number(buf.readBigInt64LE(o + 2)),
        price: Number(buf.readBigInt64LE(o + 10)) / 100,
        orders: buf.readUInt16LE(o + 18),
      });
    }
    // The official SDK swaps the flag sides; orient by LTP instead so we are
    // correct regardless: bids sit at/below LTP, asks at/above it.
    const f0 = rows.find(r => r.flag === 0);
    const f1 = rows.find(r => r.flag === 1);
    let bidRow = null, askRow = null;
    if (f0 && f1 && out.ltp > 0) {
      if (f0.price <= out.ltp && f1.price >= out.ltp) { bidRow = f0; askRow = f1; }
      else if (f1.price <= out.ltp && f0.price >= out.ltp) { bidRow = f1; askRow = f0; }
    }
    bidRow = bidRow || (f0?.price ? f0 : null);
    askRow = askRow || (f1?.price ? f1 : null);
    out.bid = bidRow?.price || 0; out.bidQty = bidRow?.qty || 0;
    out.ask = askRow?.price || 0; out.askQty = askRow?.qty || 0;
  }
  return out;
}

/* ───────── relay core ───────── */
class Relay {
  constructor(cfg) { this.cfg = cfg; this.jwt = ''; this.feed = ''; this.ws = null;
    this.legs = { gold: null, silver: null }; this.pairs = { gold: null, silver: null };
    this.lastAnyTick = 0; this.lastLogin = 0; this.lastResolve = 0;
    this.connected = false; this.snapshot = null; this.sse = new Set();
    this.publishQueued = false; this.stopped = false;
  }

  headers(extra = {}) {
    return {
      'Accept': 'application/json', 'Content-Type': 'application/json',
      'X-UserType': 'USER', 'X-SourceID': 'WEB', 'X-ClientLocalIP': '127.0.0.1',
      'X-ClientPublicIP': '127.0.0.1', 'X-MACAddress': '00:00:00:00:00:00',
      'X-PrivateKey': this.cfg.apiKey, ...extra,
    };
  }

  async http(pathname, payload, extra = {}) {
    const r = await fetch('https://apiconnect.angelbroking.com' + pathname, {
      method: 'POST', headers: this.headers(extra), body: JSON.stringify(payload),
    });
    const j = await r.json().catch(() => null);
    return { code: r.status, json: j };
  }

  async login() {
    const { json, code } = await this.http(
      '/rest/auth/angelbroking/user/v1/loginByPassword',
      { clientcode: this.cfg.clientCode, password: this.cfg.mpin, totp: totpNow(this.cfg.totpSecret) });
    const d = json?.data;
    if (!d?.jwtToken) throw new Error('login failed HTTP ' + code + ': ' + (json?.message || 'no jwt'));
    this.jwt = d.jwtToken; this.feed = d.feedToken || '';
    this.lastLogin = Date.now();
    log('logged in as', this.cfg.clientCode);
  }

  async resolveTokens(force = false) {
    // coalesce overlapping calls (the 5 s watchdog must not stack probes)
    if (this._resolving) return this._resolving;
    this._resolving = this._resolveTokensInner(force).finally(() => {
      setTimeout(() => { this._resolving = null; }, 30000);
    });
    return this._resolving;
  }

  async _resolveTokensInner(force = false) {
    if (!force && this.lastResolve && Date.now() - this.lastResolve < 6 * 3600 * 1000
        && this.pairs.gold?.token && this.pairs.silver?.token) return;
    const auth = { Authorization: 'Bearer ' + this.jwt, 'X-FeedToken': this.feed };
    const searchMetal = async (metal) => {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const { json, code } = await this.http('/rest/secure/angelbroking/order/v1/searchScrip',
            { exchange: 'MCX', searchscrip: metal }, auth);
          const rows = Array.isArray(json?.data) ? json.data : null;
          if (rows) {
            const pick = pickContract(rows, metal);
            if (pick) { log('searchScrip', metal, '->', pick.symbol, pick.token); return pick; }
            log('searchScrip', metal, 'no candidate in', rows.length, 'rows; sample:',
              rows.slice(0, 4).map(r => r.tradingsymbol || r.tradingSymbol || r.symbol).join(','));
          } else {
            log('searchScrip', metal, 'HTTP', code, json?.message || json?.errorcode || 'no data');
          }
        } catch (e) { log('searchScrip', metal, 'failed:', e.message); }
        await new Promise(r => setTimeout(r, 2500));
      }
      return this.masterPick(metal);   // instrument-master fallback
    };
    for (const metal of ['GOLD', 'SILVER']) {
      const key = metal === 'GOLD' ? 'gold' : 'silver';
      const manual = this.cfg[key === 'gold' ? 'goldToken' : 'silverToken'];
      if (manual) { this.pairs[key] = { token: manual, symbol: 'manual ' + metal, exp: 0 }; continue; }
      const pick = await searchMetal(metal);
      if (pick) this.pairs[key] = pick;
      // Angel enforces ~1 request/sec even on searchScrip
      await new Promise(r => setTimeout(r, 1300));
    }
    this.lastResolve = Date.now();
    try { fs.writeFileSync(this.cfg.stateFile, JSON.stringify({ at: new Date().toISOString(), pairs: this.pairs }, null, 2)); } catch { /* ignore */ }
    log('contracts:', this.pairs.gold?.symbol, this.pairs.gold?.token, '/', this.pairs.silver?.symbol, this.pairs.silver?.token);
  }

  /* Instrument-master fallback — same logic as api.php angel_tokens():
     pull the public scrip master, pull MCX records, keep only the exact
     near-month GOLDddMMMyyyy / SILVERddMMMyyyy futures. */
  async masterPick(metal) {
    const urls = [
      'https://margincalculator.angelbroking.com/OpenAPI_File/files/OpenAPIScripMaster.json',
      'https://margincalculator.angelone.in/OpenAPI_File/files/OpenAPIScripMaster.json',
    ];
    const re = new RegExp(`\\{[^{}]*?"exch_seg"\\s*:\\s*"MCX"[^{}]*?\\}`, 'g');
    const symRe = new RegExp(`^${metal}(\\d{1,2})([A-Z]{3})(\\d{2,4})(?:FUT\\w*)?$`);
    for (const u of urls) {
      try {
        const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Shivaa/1.0)' } });
        if (!r.ok) { log('master HTTP', r.status, u); continue; }
        const raw = await r.text();
        if (!raw.includes('MCX')) { log('master: no MCX data from', u); continue; }
        let best = null;
        for (const m of raw.matchAll(re)) {
          let rec; try { rec = JSON.parse(m[0]); } catch { continue; }
          const sym = String(rec.symbol || '').toUpperCase().trim();
          const name = String(rec.name || '').toUpperCase().trim();
          const inst = String(rec.instrumenttype || '').toUpperCase().trim();
          if (!symRe.test(sym)) continue;
          if (name !== metal) continue;
          if (inst && inst !== 'FUTCOM') continue;
          const exp = symExpiry(sym);
          if (exp < Date.now() / 1000 - 3 * 86400) continue;
          const tok = String(rec.token || '').trim();
          if (!tok) continue;
          if (!best || exp < best.exp) best = { exp, token: tok, symbol: sym };
        }
        if (best) { log('master', metal, '->', best.symbol, best.token); return best; }
        log('master: no', metal, 'future found in scrip master');
      } catch (e) { log('master fetch failed:', e.message); }
    }
    return null;
  }

  async ensureSession() {
    if (!this.jwt || Date.now() - this.lastLogin > 25 * 60 * 1000) await this.login();
    await this.resolveTokens();
  }

  subscribeAll() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return false;
    const tokens = [];
    for (const k of ['gold', 'silver']) if (this.pairs[k]?.token) tokens.push(this.pairs[k].token);
    if (!tokens.length) { log('no tokens to subscribe yet'); return false; }
    this.ws.send(JSON.stringify({
      correlationID: 'shivaa-' + Date.now().toString(36).slice(-8),
      action: 1, params: { mode: this.cfg.mode, tokenList: [{ exchangeType: 5, tokens }] },
    }));
    log('subscribed to', tokens.join(', '));
    return true;
  }

  connect() {
    const ws = new WebSocket('wss://smartapisocket.angelone.in/smart-stream', {
      handshakeTimeout: 15000,
      headers: {
        Authorization: this.jwt, 'x-api-key': this.cfg.apiKey,
        'x-client-code': this.cfg.clientCode, 'x-feed-token': this.feed,
      },
    });
    this.ws = ws;
    ws.on('open', () => {
      this.connected = true;
      log('smart-stream open');
      this.subscribeAll();
    });
    ws.on('message', (data) => {
      try {
        if (Buffer.isBuffer(data) && data.length > 1) this.onPacket(data);
        else log('control:', data.toString().slice(0, 40));
      } catch (e) { log('parse error:', e.message); }
    });
    ws.on('ping', () => { try { ws.pong(); } catch { /* ignore */ } });
    ws.on('close', (code) => { this.connected = false; log('smart-stream closed', code); this.scheduleReconnect(3000); });
    ws.on('error', (e) => { this.connected = false; log('smart-stream error:', e.message); try { ws.terminate(); } catch { /* ignore */ } });
    this.pingTimer = setInterval(() => { try { ws.ping(); } catch { /* ignore */ } }, 10000);
  }

  onPacket(buf) {
    const p = parsePacket(buf);
    if (!p) return;
    const key = this.pairs.gold?.token === p.token ? 'gold' : (this.pairs.silver?.token === p.token ? 'silver' : null);
    if (!key) return;
    const prev = this.legs[key] || {};
    this.legs[key] = { ...prev, ...p, lastTickAt: Date.now() };
    this.lastAnyTick = Date.now();
    this.schedulePublish();
  }

  buildSnapshot() {
    const stale = !this.lastAnyTick || Date.now() - this.lastAnyTick > 30000;
    const pack = (key, fallbackSymbol) => {
      const q = this.legs[key]; const pr = this.pairs[key];
      const ltp = q?.ltp || 0, close = q?.close || 0;
      const chg = close > 0 ? +(ltp - close).toFixed(2) : 0;
      const chgPct = close > 0 ? +(((ltp - close) / close) * 100).toFixed(2) : 0;
      return {
        symbol: pr?.symbol || fallbackSymbol, ltp,
        bid: q?.bid || 0, ask: q?.ask || 0, bidQty: q?.bidQty || 0, askQty: q?.askQty || 0,
        open: q?.open || 0, high: q?.high || 0, low: q?.low || 0, close,
        oi: Math.round(q?.oi || 0), atp: Math.round((q?.atp || 0) * 100) / 100,
        vol: Math.round(q?.vol || 0), feedTime: q?.exchangeTimestampMs || Date.now(),
        chg, chgPct,
      };
    };
    const gold = pack('gold', 'GOLD'), silver = pack('silver', 'SILVER');
    const open = gold.bid > 0 && gold.ask > 0 && silver.bid > 0 && silver.ask > 0;
    return {
      at: new Date().toISOString(), ts: Date.now() / 1000, source: 'live-mcx',
      relay: true, http: open ? 200 : 0, open, stale,
      gold, silver, error: stale ? (this.lastAnyTick ? 'no ticks in 30 s (market likely closed)' : 'waiting for first tick…') : '',
      servedFrom: 'relay-ws', delayMs: 800,
    };
  }

  schedulePublish() {
    if (this.publishQueued) return;
    this.publishQueued = true;
    setImmediate(() => {
      this.publishQueued = false;
      this.publish();
      clearTimeout(this._pubCoast);
      this._pubCoast = setTimeout(() => this.publish(), 120);   // tail tick within 120 ms
    });
  }

  publish() {
    if (!this.legs.gold && !this.legs.silver) return;
    const snap = this.buildSnapshot();
    this.snapshot = snap;
    if (this.cfg.writeCache) {
      try {
        fs.mkdirSync(this.cfg.cacheDir, { recursive: true });
        const tmp = path.join(this.cfg.cacheDir, '.angel-tick.relay.tmp');
        fs.writeFileSync(tmp, JSON.stringify(snap));
        fs.renameSync(tmp, path.join(this.cfg.cacheDir, '.angel-tick.json'));
      } catch (e) { if (!this._cacheWarned) { log('cache write failed:', e.message); this._cacheWarned = true; } }
    }
    const payload = `event: tick\ndata: ${JSON.stringify(snap)}\n\n`;
    for (const res of this.sse) { try { res.write(payload); } catch { /* dropped below */ } }
  }

  scheduleReconnect(delay) {
    clearTimeout(this._reconn); clearInterval(this.pingTimer);
    this._reconn = setTimeout(async () => {
      try {
        // session dies daily at ~03:30 IST; force a fresh login every reconnect
        await this.ensureSession();
        this.connect();
      } catch (e) { log('reconnect failed:', e.message); this.scheduleReconnect(10000); }
    }, delay);
  }

  /* contract rollover watch + closed-market heartbeat */
  startWatchdogs() {
    // free cloud hosts sleep after ~15 min without INBOUND traffic; an
    // occasional self-hit over the public URL keeps the relay warm 24×7
    if (this.cfg.publicUrl) {
      const wake = () => fetch(this.cfg.publicUrl + '/healthz').catch(() => {});
      wake(); setInterval(wake, 10 * 60 * 1000);
    }
    setInterval(() => {
      if (this.connected) this.publish();                    // keeps stale flag fresh
      const missingPair = !this.pairs.gold?.token || !this.pairs.silver?.token;
      // a leg that goes quiet during a session means contract rollover
      const quietLeg = ['gold', 'silver'].some(k => {
        const t = this.legs[k]?.lastTickAt; return t && Date.now() - t > 20 * 60 * 1000;
      });
      const missingDue = missingPair && Date.now() - (this.lastResolve || 0) > 30 * 1000;
      if (missingDue || (quietLeg && Date.now() - (this.lastResolve || 0) > 30 * 60 * 1000)) {
        log(missingDue ? 'tokens missing — re-resolving' : 'possible contract rollover — re-resolving tokens');
        this.ensureSession().then(() => this.subscribeAll()).catch(() => {});
      }
    }, 5000);
  }

  /* ───────── tiny HTTP/SSE server (remote-host mode) ───────── */
  startHttp() {
    const keyOk = (url, req) => {
      const k = new URL(url, 'http://x').searchParams.get('key') || req.headers['x-relay-key'];
      return k && crypto.timingSafeEqual(Buffer.from(String(k)), Buffer.from(this.cfg.streamKey));
    };
    const srv = http.createServer((req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      const u = new URL(req.url, 'http://x');
      if (u.pathname === '/healthz') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          ok: true, connected: this.connected, open: !!this.snapshot?.open,
          stale: !!this.snapshot?.stale, pairs: {
            gold: this.pairs.gold?.symbol, silver: this.pairs.silver?.symbol },
          lastTick: this.lastAnyTick ? new Date(this.lastAnyTick).toISOString() : null,
        }));
      }
      if (!keyOk(req.url, req)) { res.writeHead(401); return res.end('unauthorized'); }
      if (u.pathname === '/tick') {
        if (!this.snapshot) { res.writeHead(503); return res.end('warming up'); }
        res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
        return res.end(JSON.stringify(this.snapshot));
      }
      if (u.pathname === '/stream') {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache',
          Connection: 'keep-alive', 'X-Accel-Buffering': 'no',
        });
        res.write(': connected\n\n');
        if (this.snapshot) res.write(`event: tick\ndata: ${JSON.stringify(this.snapshot)}\n\n`);
        this.sse.add(res);
        const hb = setInterval(() => { try { res.write(': hb\n\n'); } catch { /* dropped below */ } }, 25000);
        req.on('close', () => { clearInterval(hb); this.sse.delete(res); });
        return;
      }
      res.writeHead(404); res.end('not found');
    });
    srv.listen(this.cfg.port, this.cfg.host, () =>
      log(`relay HTTP on http://${this.cfg.host}:${this.cfg.port}  ·  stream key ${this.cfg.streamKey.slice(0, 6)}…`));
  }

  async main() {
    if (!this.cfg.apiKey || !this.cfg.clientCode || !this.cfg.mpin || !this.cfg.totpSecret) {
      console.error('Missing credentials. Fill relay.config.json (apiKey, clientCode, mpin, totpSecret) or set SHIVAA_* env vars.');
      process.exit(2);
    }
    // reuse previously resolved contracts if the search endpoint is briefly down
    try { const st = JSON.parse(fs.readFileSync(this.cfg.stateFile, 'utf8')); this.pairs = st.pairs || {}; } catch { /* cold start */ }
    await this.ensureSession();
    this.connect();
    this.startWatchdogs();
    this.startHttp();
    process.on('SIGTERM', () => { this.stopped = true; try { this.ws?.close(); } catch { /* ignore */ } process.exit(0); });
    process.on('SIGINT', () => { this.stopped = true; try { this.ws?.close(); } catch { /* ignore */ } process.exit(0); });
  }
}

/* ───────── exports for the unit test, then bootstrap ───────── */
export { parsePacket, totpNow, pickContract, symExpiry };
if (import.meta.url === `file://${process.argv[1]}`) {
  new Relay(CFG).main().catch(e => { console.error('relay fatal:', e); process.exit(1); });
}
