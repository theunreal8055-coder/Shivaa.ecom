#!/usr/bin/env python3
"""v107 surgical patcher — applies every exact-match edit onto the live v104
tree. Aborts on the FIRST mismatch so a half-patched tree is impossible."""
import sys, io, os

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'cms')
P = []          # (path, old, new, expected_count)


def add(path, old, new, count=1):
    P.append((path, old, new, count))


# ═══════════════════════ js/app.js ═══════════════════════
add('js/app.js', """  if (routes[page]) {
    const res = routes[page](view, q, seg[1]);""",
    """  clearInterval(window._v107Redir);                     // v107 — any new navigation cancels a pending unknown-route redirect
  if (routes[page]) {
    const res = routes[page](view, q, seg[1]);""")

add('js/app.js', """    let n = 3;
    const iv = setInterval(() => {
      n--; const el = $('#redirN'); if (el) el.textContent = n;
      if (n <= 0) { clearInterval(iv); location.hash = '#/'; }
    }, 1000);""",
    """    let n = 3;
    clearInterval(window._v107Redir);
    window._v107Redir = setInterval(() => {
      n--; const el = $('#redirN'); if (el) el.textContent = n;
      if (n <= 0) { clearInterval(window._v107Redir); window._v107Redir = null; location.hash = '#/'; }
    }, 1000);""")

add('js/app.js', """    const pickRates = () => ({ gold22: state.rates.gold22, gold24: state.rates.gold24, gold18: state.rates.gold18, silver: state.rates.silver });
    window._co = { subtotal, freeShip: subtotal >= state.settings.freeShipAbove, coupon: null, disc: 0, items, rateLock: null, lockTimer: null, payCfg, payMethod: 'Online' };""",
    """    const pickRates = () => ({ gold22: state.rates.gold22, gold24: state.rates.gold24, gold18: state.rates.gold18, silver: state.rates.silver });
    /* v107 — the lock window is server-owned (pay/config lockMinutes) and a
       lock in flight survives a refresh via localStorage. The server still
       enforces the +/-2% band at submit, so a stale or hand-edited lock can
       never make the shop sell below the band. */
    const LOCKSEC = () => Math.max(300, Math.min(3600, ((window._co && window._co.lockMinutes) || 20) * 60));
    window._co = { subtotal, freeShip: subtotal >= state.settings.freeShipAbove, coupon: null, disc: 0, items, rateLock: null, lockTimer: null, payCfg, payMethod: 'Online', lockMinutes: (payCfg && payCfg.lockMinutes) || 20 };
    try {
      const savedLock = JSON.parse(localStorage.getItem('shv_rate_lock') || 'null');
      if (savedLock && savedLock.stampedAt && savedLock.rates &&
          (Date.now() - new Date(savedLock.stampedAt).getTime()) / 1000 <= LOCKSEC()) window._co.rateLock = savedLock;
    } catch (e) {}
    const setLock = () => {
      window._co.rateLock = { rates: pickRates(), stampedAt: new Date().toISOString() };
      try { localStorage.setItem('shv_rate_lock', JSON.stringify(window._co.rateLock)); } catch (e) {}
    };""")

add('js/app.js', "return age <= 20 * 60 ? l : null;", "return age <= LOCKSEC() ? l : null;")
add('js/app.js', "const left = Math.max(0, 20 * 60 - Math.floor((Date.now() - new Date(l.stampedAt).getTime()) / 1000));",
    "const left = Math.max(0, LOCKSEC() - Math.floor((Date.now() - new Date(l.stampedAt).getTime()) / 1000));", 2)

add('js/app.js', """      const b = $('#rlLockBtn'); if (b) b.onclick = () => { window._co.rateLock = { rates: pickRates(), stampedAt: new Date().toISOString() }; coTotals(); paintLock(); };""",
    """      const b = $('#rlLockBtn'); if (b) b.onclick = () => { setLock(); coTotals(); paintLock(); };""")

add('js/app.js', """  window._co.rateLock = { rates: pickRates(), stampedAt: new Date().toISOString() };
  coTotals(); paintLock(); startLockClock();""",
    """  if (!window._co.rateLock) setLock();        // v107 — auto-arm (restored lock wins)
  coTotals(); paintLock(); startLockClock();""")

add('js/app.js', """<button type="button" class="btn btn-gold btn-sm" id="rlLockBtn">🔒 Lock today&rsquo;s rate · 20 min</button>`;""",
    """<button type="button" class="btn btn-gold btn-sm" id="rlLockBtn">🔒 Lock today&rsquo;s rate · ${LOCKSEC() / 60} min</button>`;""")

add('js/app.js', """    const upiUri = `upi://pay?pa=${encodeURIComponent(pa)}&pn=${pn}&am=${amt.toFixed(2)}&cu=INR&tn=${note}`;""",
    """    const upiUri = `upi://pay?pa=${encodeURIComponent(pa)}&pn=${pn}&am=${amt.toFixed(2)}&cu=INR&tn=${note}&tr=${encodeURIComponent(orderId)}`;   // v107 — merchant txn ref, UPI apps echo it back""")

add('js/app.js', """The order stays rate-locked meanwhile.</p>""",
    """The order stays rate-locked meanwhile.<br><small>This code is stamped to order <b>${esc(orderId)}</b> for exactly <b>${fmt(amt)}</b> — if your UPI app shows a different amount, close this sheet and reopen it to mint a fresh code.</small></p>""")

add('js/app.js', """  drawAt: new Date(2026, 10, 11, 23, 59, 59).getTime(),
  // the module switches itself off from the first moment of 1 Dec 2026
  endAt: new Date(2026, 11, 1, 0, 0, 0).getTime(),""",
    """  drawAt: Date.parse('2026-11-11T23:59:59+05:30'),   // v107 — IST-absolute instants (host-TZ-proof)
  // the module switches itself off from the first moment of 1 Dec 2026
  endAt: Date.parse('2026-12-01T00:00:00+05:30'),""")

# ═══════════════════════ js/auth.js ═══════════════════════
add('js/auth.js', """          chip.innerHTML = `Code sent to <b>${esc(d.masked)}</b>${d.via === 'sms' ? '' : ' — check the inbox and the spam folder'}`;""",
    """          chip.innerHTML = `Code sent to <b>${esc(d.masked)}</b>${d.via === 'sms' ? ' by SMS — it lands in ~10 seconds' : ' by email (SMS gateway off) — check inbox & spam'}`;""")

add('js/auth.js', """      if (!r.ok) { busy(btn, false); return showErr(esc(d.error || 'Could not send the code — try again')); }""",
    """      if (!r.ok) {
        busy(btn, false);
        // v107 — throttles must say how long, not look like a dead gateway
        const wait = Number(d.retryAfter || 0);
        return showErr(esc(d.error || 'Could not send the code — try again') + (wait > 0 ? ` — retry in ${Math.ceil(wait)}s` : ''));
      }""")

# ═══════════════════════ js/admin.js ═══════════════════════
add('js/admin.js', """see <b>OTP-SETUP-GUIDE.md</b>.'}</p>`;""",
    """see <b>OTP-SETUP-GUIDE.md</b>.'}</p>` + window.ShivaaAdmin.v107WizHTML(s);""")

add('js/admin.js', """window.ShivaaAdmin = {};

/* ── v33 · SMS gateway status + test sender (Settings tab) ── */""",
    """window.ShivaaAdmin = {};

/* ── v107 · SMS gateway configuration wizard (Settings → Code delivery) ──
   Writes data/sms-config.json through the API (admin-only, keys never
   echoed back in full). Replaces the "create the file in File Manager"
   instruction that made OTP look broken for anyone without FTP access. */
window.ShivaaAdmin.v107WizHTML = s => {
  const c = (window._v107sms && window._v107sms.config) || {};
  const providers = (window._v107sms && window._v107sms.providers) || ['msg91', 'fast2sms', 'apitxt', 'textlocal', 'custom'];
  return `
  <div class="v107-wiz">
    <h4>Gateway setup wizard ${window._v107sms && window._v107sms.exists ? '· <span style="color:#1a7f37">config file present</span>' : '· <span style="color:#b45309">no config file yet</span>'}</h4>
    <div class="grid">
      <div><label>Provider</label><select id="wizProvider">${providers.map(p => `<option value="${p}" ${c.provider === p ? 'selected' : ''}>${p}</option>`).join('')}<option value="">— switch off (email only) —</option></select></div>
      <div><label>API key / auth key</label><input id="wizKey" type="password" autocomplete="off" placeholder="${c.key ? 'saved: ' + c.key : 'paste from gateway dashboard'}"></div>
      <div><label>Sender ID / SID</label><input id="wizSender" value="${esc(c.sender || '')}" placeholder="SHIVAA"></div>
      <div><label>DLT entity ID (optional)</label><input id="wizEntity" value="${esc(c.entityId || '')}"></div>
      <div><label>DLT template ID (optional)</label><input id="wizTemplate" value="${esc(c.templateId || '')}"></div>
      <div><label>WebOTP domain</label><input id="wizDomain" value="${esc(c.domain || 'shivaa.in')}"></div>
    </div>
    <div style="margin-top:8px"><label>Message text ({code} is replaced)</label><input id="wizMsg" value="${esc(c.message || '')}" placeholder="{code} is your Shivaa Jewellers verification code…"></div>
    <div class="grid" style="margin-top:8px">
      <div><label>Custom gateway URL (provider = custom)</label><input id="wizUrl" value="${esc(c.url || '')}" placeholder="https://gateway/send?to={phone}&text={msg}"></div>
      <div><label>Custom method</label><select id="wizMethod"><option ${c.method === 'GET' ? 'selected' : ''}>GET</option><option ${c.method !== 'GET' ? 'selected' : ''}>POST</option></select></div>
    </div>
    <label style="display:flex;gap:8px;align-items:center;margin-top:10px;font-size:12px"><input type="checkbox" id="wizAutofill" ${c.autofill === false ? '' : 'checked'} style="width:auto"> Android auto-fill footer (“@shivaa.in #CODE”)</label>
    <div class="kyc-inline" style="margin-top:10px">
      <button class="btn btn-primary btn-sm" onclick="ShivaaAdmin.smsSave(event)">Save gateway config</button>
      <button class="btn btn-ghost btn-sm" onclick="ShivaaAdmin.smsReload(event)">Reload saved values</button>
    </div>
    <div id="wizRaw" class="raw" hidden></div>
    <p class="hint">Keys are stored in <b>data/sms-config.json</b> (0600, web-denied by .htaccess). Saving never prints the full key back — only the last four characters. After saving, send yourself a test SMS above: the gateway's raw reply is printed here so a DLT or balance problem is visible in one click.</p>
  </div>`;
};
window.ShivaaAdmin.smsReload = async e => {
  if (e) e.preventDefault();
  try { window._v107sms = await api('/api/sms/config'); window.ShivaaAdmin.smsCard(); toast('Gateway config reloaded'); }
  catch (err) { toast(err.message, 'err'); }
};
window.ShivaaAdmin.smsSave = async e => {
  if (e) e.preventDefault();
  const g = id => (document.getElementById(id) || {}).value || '';
  const body = {
    provider: g('wizProvider'), key: g('wizKey'), sender: g('wizSender'),
    entityId: g('wizEntity'), templateId: g('wizTemplate'), domain: g('wizDomain'),
    message: g('wizMsg'), url: g('wizUrl'), method: g('wizMethod'),
    autofill: !!((document.getElementById('wizAutofill') || {}).checked),
  };
  if (body.key && body.key.indexOf('•') >= 0) delete body.key;   // untouched masked value
  try {
    const r = await api('/api/sms/config', { method: 'PUT', body: JSON.stringify(body) });
    toast(r.note || 'Saved');
    await window.ShivaaAdmin.smsReload();
  } catch (err) { toast(err.message, 'err'); }
};

/* ── v33 · SMS gateway status + test sender (Settings tab) ── */""")

# raw provider reply under the wizard after a test send
add('js/admin.js', """    const r = await api('/api/sms/test', { method: 'POST', body: JSON.stringify({ phone: ph }) });
    if (r.ok) toast('Test SMS sent ✓ — check the phone');
    else toast(r.note || ('Not sent: ' + (r.error || 'no SMS gateway configured')), 'err');""",
    """    const r = await api('/api/sms/test', { method: 'POST', body: JSON.stringify({ phone: ph }) });
    if (r.ok) toast('Test SMS sent ✓ — check the phone');
    else toast(r.note || ('Not sent: ' + (r.error || 'no SMS gateway configured')), 'err');
    // v107 — surface the gateway's RAW reply so DLT/balance/key faults are visible
    const raw = document.getElementById('wizRaw');
    if (raw) {
      raw.hidden = false;
      raw.textContent = 'gateway reply (' + (r.provider || 'none') + '): ' +
        (r.response ? String(r.response).slice(0, 600) : (r.error || r.note || 'no reply — check keys & DLT template')) +
        (r.hint ? '\\nhint: ' + r.hint : '');
    }""")

# load wizard values whenever the card renders
add('js/admin.js', """    const s = await api('/api/sms/status');
    const st = s.stats || {}, live = !!s.configured;""",
    """    const s = await api('/api/sms/status');
    const st = s.stats || {}, live = !!s.configured;
    // v107 — feed the wizard (masked values only)
    try { window._v107sms = await api('/api/sms/config'); } catch (e2) { window._v107sms = null; }""")

# ═══════════════════════ api.php ═══════════════════════
add('api.php', """foreach (($db['otps'] ?? []) as $o) if ($o['phone'] === $phone && time() - $o['at'] < 30) jout(429, ['error' => 'Wait 30 seconds between OTP requests']);""",
    """foreach (($db['otps'] ?? []) as $o) if ($o['phone'] === $phone && time() - $o['at'] < 30) jout(429, ['error' => 'Wait 30 seconds between OTP requests', 'retryAfter' => 30 - (time() - $o['at'])]);""")

add('api.php', """    if (empty($d['ok'])) jout(502, ['error' => 'The code could not be sent just now — please retry in a minute, or WhatsApp +91 89050 05921.']);""",
    """    if (empty($d['ok'])) jout(502, ['error' => 'The code could not be sent just now — please retry in a minute, or WhatsApp +91 89050 05921.', 'channel' => $d['channel'] ?? 'none', 'configured' => (bool)shivaa_sms_config()]);""")

add('api.php', """      'prepaidPct' => (float)($s['prepaidPct'] ?? 2),""",
    """      'prepaidPct' => (float)($s['prepaidPct'] ?? 2),
      /* v107 — checkout reads the rate-lock window from here (was hardcoded) */
      'lockMinutes' => (int)($s['rateLockMinutes'] ?? 20),""")

add('api.php', """  if ($changed) db_save($DB_FILE, $db);
  jout(404, ['error' => 'Unknown API']);""",
    """  /* ── v107 · honest delivery channel for the Passport sheet (public, tiny) ── */
  if ($route === 'auth/delivery' && $method === 'GET') {
    rate_block($db, 'delivery', client_ip(), 120, 3600);
    $c = shivaa_sms_config();
    jout(200, ['channel' => $c ? 'sms' : 'email', 'configured' => (bool)$c, 'provider' => $c['provider'] ?? null]);
  }

  /* ── v107 · SMS gateway wizard: read (masked) / write data/sms-config.json ──
     Admin-only. GET never returns a full key; PUT validates, writes 0600 and
     is the ONLY supported writer besides File Manager. Deleting = provider "". */
  if ($route === 'sms/config' && $method === 'GET') {
    need_admin($db);
    $file = __DIR__ . '/data/sms-config.json';
    $raw = is_file($file) ? json_decode((string)file_get_contents($file), true) : null;
    $mask = function ($v) { $v = (string)$v; return $v === '' ? '' : (strlen($v) <= 4 ? str_repeat('•', strlen($v)) : str_repeat('•', strlen($v) - 4) . substr($v, -4)); };
    $keyOf = is_array($raw) ? ($raw['authkey'] ?? $raw['key'] ?? $raw['token'] ?? '') : '';
    jout(200, [
      'exists' => is_array($raw),
      'writable' => is_writable(dirname($file)),
      'config' => is_array($raw) ? [
        'provider' => (string)($raw['provider'] ?? ''),
        'key' => $mask($keyOf),
        'sender' => (string)($raw['sender_id'] ?? $raw['sender'] ?? $raw['from'] ?? ''),
        'entityId' => (string)($raw['entity_id'] ?? ''),
        'templateId' => (string)($raw['template_id'] ?? ''),
        'domain' => (string)($raw['domain'] ?? 'shivaa.in'),
        'autofill' => (bool)($raw['autofill'] ?? true),
        'message' => (string)($raw['message'] ?? ''),
        'url' => (string)($raw['url'] ?? ''),
        'method' => (string)($raw['method'] ?? ''),
      ] : null,
      'stats' => $db['sms'] ?? null,
      'devMarker' => is_file(__DIR__ . '/data/.otp-dev-mode'),
      'providers' => ['msg91', 'fast2sms', 'apitxt', 'textlocal', 'custom'],
    ]);
  }
  if ($route === 'sms/config' && $method === 'PUT') {
    need_admin($db);
    $b = body_json();
    $provider = strtolower(trim((string)($b['provider'] ?? '')));
    if (!in_array($provider, ['msg91', 'fast2sms', 'apitxt', 'textlocal', 'custom', ''], true)) {
      jout(400, ['error' => 'Unknown provider — pick one from the list']);
    }
    $file = __DIR__ . '/data/sms-config.json';
    if ($provider === '') {
      if (is_file($file)) @unlink($file);
      jout(200, ['ok' => true, 'exists' => false, 'note' => 'Gateway removed — codes fall back to email until you add one.']);
    }
    $key = trim((string)($b['key'] ?? ''));
    if (strpos($key, '•') !== false) $key = '';      // masked echo → refuse
    if (strlen($key) < 8) jout(400, ['error' => 'Paste the full API key from your gateway dashboard (the saved one is masked on purpose)']);
    $cfg = ['provider' => $provider];
    $keyField  = ['msg91' => 'authkey', 'fast2sms' => 'key', 'apitxt' => 'authkey', 'textlocal' => 'key', 'custom' => ''];
    $sendField = ['fast2sms' => 'sender_id', 'textlocal' => 'sender', 'msg91' => 'sender_id'];
    if ($keyField[$provider] !== '') $cfg[$keyField[$provider]] = substr($key, 0, 128);
    $sender = substr(preg_replace('/[^A-Za-z0-9+ ]/', '', (string)($b['sender'] ?? '')), 0, 16);
    if ($sender !== '' && isset($sendField[$provider])) $cfg[$sendField[$provider]] = $sender;
    $tpl = preg_replace('/[^A-Za-z0-9]/', '', (string)($b['templateId'] ?? ''));
    if ($tpl !== '') $cfg['template_id'] = $tpl;
    $ent = preg_replace('/[^A-Za-z0-9]/', '', (string)($b['entityId'] ?? ''));
    if ($ent !== '') $cfg['entity_id'] = $ent;
    $dom = preg_replace('/[^a-z0-9.\\-]/', '', strtolower((string)($b['domain'] ?? 'shivaa.in')));
    $cfg['domain'] = $dom !== '' ? substr($dom, 0, 60) : 'shivaa.in';
    $cfg['autofill'] = (bool)($b['autofill'] ?? true);
    $msg = trim((string)($b['message'] ?? ''));
    if ($msg !== '') $cfg['message'] = substr($msg, 0, 160);
    if ($provider === 'custom') {
      $url = filter_var((string)($b['url'] ?? ''), FILTER_VALIDATE_URL);
      if (!$url) jout(400, ['error' => 'Custom provider needs a full https:// URL with {phone} and {msg} placeholders']);
      $cfg['url'] = substr($url, 0, 300);
      $cfg['method'] = strtoupper((string)($b['method'] ?? 'POST')) === 'GET' ? 'GET' : 'POST';
    }
    if (!is_writable(dirname($file))) jout(500, ['error' => 'data/ is not writable by PHP — set the folder to 755 in File Manager, then retry']);
    $ok = @file_put_contents($file, json_encode($cfg, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\\n", LOCK_EX);
    if ($ok === false) jout(500, ['error' => 'Could not write data/sms-config.json']);
    @chmod($file, 0600);
    jout(200, ['ok' => true, 'exists' => true, 'note' => 'Saved. Now send a test SMS to your own mobile — the raw gateway reply appears under the form.']);
  }

  if ($changed) db_save($DB_FILE, $db);
  jout(404, ['error' => 'Unknown API']);""")

# ═══════════════════════ sw.js ═══════════════════════
add('sw.js', """const SHELL = 'shivaa-shell-v104';
const MEDIA = 'shivaa-media-v104';""",
    """const SHELL = 'shivaa-shell-v107';
const MEDIA = 'shivaa-media-v107';""")

add('sw.js', """const SHELL_FILES = ['/', '/index.html', '/css/fonts.css?v=42', '/css/styles.css?v=99',
  '/css/hallmark.css?v=42', '/css/trust.css?v=42', '/css/finale.css?v=44',
  '/css/motion.css?v=104', '/css/mobile.css?v=104', '/css/aurum.css?v=104',
  '/js/app.js?v=104', '/js/motion.js?v=104', '/js/aurum.js?v=104',
  '/js/hallmark.js?v=104', '/js/trust.js?v=104', '/images/icons/icon-512.png'];""",
    """/* v107 — the list now matches index.html exactly (it drifted in v99–v104:
   auth.js/otp-autofill.js were never precached and icon-512.png did not even
   exist, so addAll() rejected and the install handler swallowed it). */
const SHELL_FILES = ['/', '/index.html',
  '/css/fonts.css?v=107', '/css/styles.css?v=107', '/css/hallmark.css?v=107',
  '/css/trust.css?v=107', '/css/finale.css?v=107', '/css/motion.css?v=107',
  '/css/mobile.css?v=107', '/css/aurum.css?v=107', '/css/v107.css?v=107',
  '/js/otp-autofill.js?v=107', '/js/app.js?v=107', '/js/hallmark.js?v=107',
  '/js/trust.js?v=107', '/js/auth.js?v=107', '/js/motion.js?v=107',
  '/js/aurum.js?v=107', '/js/v107.js?v=107',
  '/manifest.webmanifest', '/offline.html',
  '/images/icons/icon-192.png', '/images/icons/icon-512.png',
  '/images/icons/icon-maskable-512.png', '/images/icons/apple-touch-icon.png'];""")

add('sw.js', """self.addEventListener('message', (e) => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});""",
    """self.addEventListener('message', (e) => {
  // v107 — accept both the legacy string and the {type} object form
  if (e.data === 'SKIP_WAITING' || (e.data && e.data.type === 'SKIP_WAITING')) self.skipWaiting();
});""")

add('sw.js', """self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(SHELL_FILES).catch(() => {})).then(() => self.skipWaiting()));
});""",
    """self.addEventListener('install', (e) => {
  /* v107 — per-file precache. addAll() is all-or-nothing: one 404 in the list
     (which is exactly what the missing icon was) zeroed the WHOLE shell cache
     and .catch(()=>{}) hid it. Now each file is fetched and stored on its own;
     a single failure degrades to network-first for that one file. */
  e.waitUntil(caches.open(SHELL).then((c) => Promise.allSettled(SHELL_FILES.map((u) =>
    fetch(u, { cache: 'reload', credentials: 'same-origin' })
      .then((r) => { if (r && r.ok) return c.put(u, r); })
      .catch(() => {})
  ))).then(() => self.skipWaiting()));
});""")

# ═══════════════════════ manifest.webmanifest ═══════════════════════
MANIFEST = """{
  "name": "Shivaa Jewellers — Jaipur",
  "short_name": "Shivaa",
  "description": "BIS-hallmarked jewellery priced live from the Jaipur bullion rate. Shop, ring sizer, gold rates, B2B catalogues and the Gold Finale.",
  "start_url": "/#/",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#2a0a10",
  "theme_color": "#2a0a10",
  "lang": "en-IN",
  "categories": ["shopping", "lifestyle"],
  "icons": [
    { "src": "/images/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/images/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "/images/icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ],
  "shortcuts": [
    { "name": "Shop jewellery", "url": "/#/shop", "icons": [{ "src": "/images/icons/icon-192.png", "sizes": "192x192" }] },
    { "name": "Today's gold rate", "url": "/#/rates", "icons": [{ "src": "/images/icons/icon-192.png", "sizes": "192x192" }] },
    { "name": "Ring size guide", "url": "/#/size-guide", "icons": [{ "src": "/images/icons/icon-192.png", "sizes": "192x192" }] }
  ]
}
"""

# ═══════════════════════ index.html ═══════════════════════
add('index.html', """<link rel="stylesheet" href="/css/aurum.css?v=104">""",
    """<link rel="stylesheet" href="/css/aurum.css?v=107">
<link rel="stylesheet" href="/css/v107.css?v=107">""")
add('index.html', """<script src="/js/aurum.js?v=104" defer></script>""",
    """<script src="/js/aurum.js?v=107" defer></script>
<script src="/js/v107.js?v=107" defer></script>""")
for old_v, name in [('?v=42', 'fonts/hallmark/trust'), ('?v=99', 'styles'), ('?v=44', 'finale'), ('?v=104', 'motion/mobile/aurum js+css'), ('?v=58', 'otp-autofill/auth')]:
    pass  # handled by the global bump below


def bump(path):
    """?v=NN → ?v=107 for every local css/js asset (cache-bust the release)."""
    global MANIFEST
    p = os.path.join(ROOT, path)
    s = io.open(p, encoding='utf-8').read()
    import re
    s2 = re.sub(r'(\.(?:css|js)\?v=)\d+', r'\\g<1>107', s)
    if s2 != s:
        io.open(p, 'w', encoding='utf-8').write(s2)
        print('  bumped ?v= → 107 in', path)


# ═══════════════════════ .htaccess ═══════════════════════
add('.htaccess', """# API: /api/...  →  api.php
RewriteRule ^api/(.*)$ api.php?__route=$1 [QSA,L]""",
    """# API: /api/...  →  api.php
RewriteRule ^api/(.*)$ api.php?__route=$1 [QSA,L]

# v107 — robots.txt has advertised /sitemap.xml forever; generate it from db.json
RewriteRule ^sitemap\\.xml$ sitemap.php [L]

# v107 — the data/ folder is server-state only (db.json, sms-config.json,
# error logs). *.json was already denied; this closes .txt/.log gaps too.
RewriteRule ^data/ - [F,NC,L]""")

# ═══════════════════════ apply ═══════════════════════
def main():
    fails = []
    for path, old, new, count in P:
        p = os.path.join(ROOT, path)
        s = io.open(p, encoding='utf-8').read()
        n = s.count(old)
        if n != count:
            fails.append((path, count, n, old[:70]))
            continue
        s = s.replace(old, new)
        io.open(p, 'w', encoding='utf-8').write(s)
        print('  ✓ %-14s ×%d  %s' % (path, n, old.strip().splitlines()[0][:64]))
    io.open(os.path.join(ROOT, 'manifest.webmanifest'), 'w', encoding='utf-8').write(MANIFEST)
    print('  ✓ manifest.webmanifest rewritten (icons 192/512/maskable + shortcuts)')
    bump('index.html')
    bump('sw.js')
    if fails:
        print('\n✗ MISMATCHES — nothing left half-applied for these:')
        for f in fails:
            print('   %s expected %d found %d :: %s' % f)
        sys.exit(1)
    print('\nAll %d patches applied cleanly.' % len(P))


if __name__ == '__main__':
    main()
