#!/usr/bin/env python3
"""Build the v179 code update from a committed revision.

v179 — the permanent bullion-rates fix. The owner's ask: "MCX connection
from render is showing 'signal is aborted without reason', the dollar
connection is working fine — give me a permanent solution for bullion
rates that I don't ever have to touch the rates in the next update."

Root cause: the Render-hosted relay held a long-lived SmartStream
connection that aborts and never self-heals; and the site's MCX-down
fallback was raw spot × USDINR — ~10-14% under market (no duty, no
premium), so the owner had to hand-calibrate the admin factors (and the
B2B RTGS strip, which derives from the same anchor).

v179 makes the site price bullion correctly with NO relay and NO owner
action, in four layers:

1 · THE CALIBRATED PREMIUM (api.php).
   While the official MCX feed and the international spot are BOTH live,
   the MCX-over-spot premium is measured into a rolling window
   (rates.premiumCalib, 200 samples). When MCX is down, the site prices
   from spot × the median of the recent sane samples (0.9-1.5 band) —
   falling back to the owner's settings factors. The quote is labelled
   honestly ('mcx-est', 'spotKind': 'mcx-est', premiumEst in the stamp)
   and lands in /api/rates as the `health` object the admin strip and
   the storefront tag render from. The B2B RTGS strip rides the same
   anchor, so the desk's numbers stay on-market too — this is the
   "rtgs rates" the owner had been hand-fixing.

2 · LAST-GOOD PERSISTENCE (api.php).
   Every live MCX pack is stored as rates.mcxLastGood, so the admin
   always knows the last true price and exactly when it was. A missing
   official feed degrades to the estimate — it never blanks the board.

3 · GET PERSISTENCE (api.php).
   The public GET /api/rates route calls jout() — which exits — before
   the end-of-request save, so the refresh's stamp, calibration window
   and last-good state were silently lost on every poll. The route now
   db_saves the changed state before answering.

4 · THE RELAY v2 (cms/relay/relay.js — its own host, NOT in this zip).
   A zero-dependency Node service that replaces the dead v78 relay.
   Same public contract (/tick, /stream?key=, now /healthz), built only
   on the REST endpoints the site itself uses, with an explicit
   self-heal for every failure mode: any network error (including
   "signal is aborted without reason") becomes a backoff + retry; the
   daily 3:30 AM session expiry re-logs in automatically (TOTP, 30 s
   gate); contract rollover re-resolves; 429 backs off politely; a 90 s
   no-frame watchdog forces a fresh session; the last tick is persisted
   and served across a crash. Deployed to Render from the cms/relay
   folder (see cms/relay/README-RENDER.md). Until it is deployed — or if
   it ever sleeps — layers 1-3 carry the prices alone.

One-time owner action after deploy: paste the five Angel credentials
into Admin → Settings (site-side feed, layer 1's input) — then never
again.

What v179 does NOT change: no new site assets (the ZIP stays nine files:
the v177 seven plus the v178 css/js pair), no admin money/purge code, no
media. Stamps move 178 → 179 in lockstep (index, app.js, sw.js, api.php,
every ?v= URL); the media cache deliberately stays at 168.

Usage: python3 tools/mega/make-v179-zip.py [commit-ish]
"""
import hashlib
import re
import subprocess
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FILES = [
    'api.php', 'index.html', 'sw.js',
    'css/v175.css',          # v175 — the photo/title overlap root cause
    'css/v174.css',          # v174 — photo-frame containment + paint order
    'css/v178.css',          # v178 — the in-footer app band + guide sheet
    'js/app.js', 'js/admin.js',
    'js/v178.js',            # v178 — vendored QR encoder + band behaviour
]

def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT)

def build(revision='HEAD'):
    commit = git('rev-parse', '--verify', revision + '^{commit}').decode().strip()
    contents = {f: git('show', f'{commit}:cms/{f}') for f in FILES}
    stamp = '179'
    assert f'__SHIVAA_REL={stamp};'.encode() in contents['index.html']
    assert f'APP_REL = {stamp};'.encode() in contents['js/app.js']
    assert f"SHELL = 'shivaa-shell-v{stamp}'".encode() in contents['sw.js']
    assert f'const REL = {stamp};'.encode() in contents['sw.js']
    assert f"'rel'   => {stamp},".encode() in contents['api.php']
    assert b"MEDIA = 'shivaa-media-v168'" in contents['sw.js']   # no media changed
    assert contents['index.html'].count(f'?v={stamp}'.encode()) >= 56
    for name in ['index.html', 'sw.js', 'js/app.js']:
        assert b'?v=178' not in contents[name], f'{name} still pins a v178 URL'
    html = contents['index.html'].decode()
    # v178.css must be the LAST stylesheet a real browser applies
    links = re.findall(r'<link[^>]*rel="stylesheet"[^>]*href="(/css/[^"]+)"', html)
    assert links and links[-1] == f'/css/v178.css?v={stamp}', links[-3:]
    for sheet in ['v174.css', 'v175.css', 'v178.css']:
        assert f"'/css/{sheet}?v={stamp}'".encode() in contents['sw.js'], sheet
    assert f"'/js/v178.js?v={stamp}'".encode() in contents['sw.js'], 'band script not precached'
    # v178.js must load after v167.js (last deferred layer)
    scripts = re.findall(r'<script src="(/js/[^"]+)" defer></script>', html)
    assert '/js/v167.js' + f'?v={stamp}' in scripts and '/js/v178.js' + f'?v={stamp}' in scripts
    assert scripts.index(f'/js/v178.js?v={stamp}') > scripts.index(f'/js/v167.js?v={stamp}')
    # ── v178: the band is real footer HTML (cumulative) ──
    for el in [b'id="shvAppBand"', b'id="shvAppQr"', b'id="shvAppCta"', b'id="shvAppDismiss"']:
        assert el in contents['index.html'], f'band element {el.decode()} missing'
    assert b'<canvas id="shvAppQr" width="256" height="256">' in contents['index.html']
    m_band = re.search(rb'<section class="fv-appband"[^>]*>.*?</section>', html.encode(), re.S)
    assert m_band, 'fv-appband section not found'
    assert b'hidden' not in m_band.group(0).split(b'>')[0], 'band must ship unhidden'
    i_cols, i_band, i_trust = (html.index(s) for s in
        ['<nav class="fv-cols"', '<section class="fv-appband"', '<div class="fv-trust"'])
    assert i_cols < i_band < i_trust, 'band must sit between the footer nav and the trust row'
    # ── v178: the v140 law in the shipped code (cumulative) ──
    band_js = contents['js/v178.js']
    assert b'Kazuhiko Arase' in band_js and b'MIT' in band_js, 'vendored QR license missing'
    assert b'var QRFactory = (function () {' in band_js, 'QR encoder IIFE missing'
    assert b'beforeinstallprompt' in band_js and b'preventDefault' in band_js
    assert b'appinstalled' in band_js
    assert b'(display-mode: standalone)' in band_js and b'navigator.standalone === true' in band_js
    assert b"shv.appband.v1" in band_js and b'30 * 86400e3' in band_js
    assert b'shvInstallChip' not in band_js, 'the dead install-chip id is back'
    assert b'setTimeout' not in band_js and b'setInterval' not in band_js, 'timers are back'
    assert b'https://shivaa.in/' in band_js, 'canonical QR target missing'
    band_css = contents['css/v178.css'].decode()
    band_block = band_css[band_css.index('.fv-appband{'):band_css.index('.fv-appband[hidden]')]
    assert not re.search(r'position:\s*(fixed|absolute)', band_block), 'the band floats again'
    assert '.shv-sheet{position:fixed' in band_css, 'only the tap-open sheet may overlay'
    assert '[hidden]{display:none}' in band_css
    assert 'prefers-reduced-motion' in band_css
    # ── v176 core must still be present (the good part stays) ──
    api = contents['api.php']
    assert b'function order_money_received(array $o): int' in api, 'helper missing'
    assert b'function order_is_paid_sale(array $o): bool' in api, 'paid-sale helper missing'
    assert b'function order_is_unpaid_attempt(array $o): bool' in api, 'unpaid-attempt helper missing'
    assert api.count(b'order_money_received(') >= 4, 'helper not used everywhere'
    assert b"$rev = array_sum(array_map('order_money_received', $liveOrders));" in api, 'stats still raw'
    assert b'$received = order_money_received($o);' in api, 'report still raw'
    assert b"$revenue += (int)($o['total'] ?? 0);" not in api, 'old report line still present'
    assert b"$rev = array_sum(array_column($liveOrders, 'total'));" not in api, 'old stats line still present'
    # ── v177: the confirmed purge actually runs (cumulative) ──
    assert b'JSON_UNESIGNED' not in api, 'undefined json flag is back — every purge 500s'
    assert b'JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE' in api, 'backup flags wrong'
    assert api.count(b"$_GET['scope'] ?? 'unpaid'") == 1, 'GET preview lost its scope'
    assert api.count(b"($b['scope'] ?? 'unpaid') : ($_GET['scope'] ?? 'unpaid')") == 1, 'scope source split broken'
    assert b'for ($bkN = 2; file_exists($bkPath); $bkN++)' in api, 'backup name collision is back'
    assert b"$survivors = $scope === 'all'" in api, 'scope-honest note missing'
    assert b'. B2B and B2C customers, partners, products and every paid order were untouched.' not in api, 'the lying note is back'
    assert b"$d = substr((string)($o['createdAt'] ?? ''), 0, 10);\n      if ($d === '') continue;" in api, 'stats byDay guard missing'
    assert b'is_array($o[\'address\'] ?? null)' in api, 'preview address guard missing'
    assert b"$adminUser = need_admin($db);" in api, 'purge must keep the validated admin'
    assert b"req_user($db)['name'] ?? 'admin'" not in api, 'mid-route bearer re-read is back'
    assert b"$d = substr((string)($p['approvedAt'] ?? $p['at'] ?? ''), 0, 10);" in api, 'proof approval-day rule missing'
    assert b"if ($method === 'COD') $codSales += $amt;" in api, 'COD bucket not ledger-driven'
    assert b"if (substr((string)($o['createdAt'] ?? ''), 0, 10) !== $day || ($o['status'] ?? '') === 'Cancelled') continue;" not in api, 'v176 creation-day filter is back'
    assert b'COD collected' in contents['js/admin.js'], 'day-book tile rename missing'
    assert b"$route === 'admin/purge-unpaid'" in api, 'purge route missing'
    assert b"db-before-purge-" in api, 'no safety backup before delete'
    assert b"'DELETE ALL SALES'" in api and b"'DELETE UNPAID'" in api, 'confirmation phrases missing'
    m = re.search(
        rb"if \(\(\$route === 'admin/purge-unpaid' && \$method === 'GET'\)[\s\S]*?\n  if \(\$route === ",
        api)
    assert m, 'purge route block not delimited'
    purge_block = m.group(0)
    for bad in [b"$db['users']", b"$db['partners']", b"$db['products']",
                b"$db['settlements']", b"$db['reviews']", b"$db['coupons']"]:
        assert bad not in purge_block, f'purge touches {bad!r}'
    assert b"array_splice($db['orders']" in purge_block, 'purge must only splice orders'
    assert b'@mkdir($bkDir' in purge_block, 'backup directory not created'
    assert b"jout(500, ['error' => 'Could not write the safety backup" in purge_block, 'purge must abort if the backup fails'
    assert b'pgPreview' in contents['js/admin.js'], 'purge UI missing'
    assert b'/api/admin/purge-unpaid' in contents['js/admin.js'], 'purge API call missing'
    assert b"purge-unpaid?scope=' + pgScope.value" in contents['js/admin.js'], 'UI must preview the scope it shows'
    assert b'unpaidOrders' in contents['js/admin.js'], 'paid/unpaid split not shown'
    # ── v179: the calibrated premium engine ──
    assert b'function premium_calibrate(array &$db, array $mcx, float $gUsd, float $sUsd, float $inr): void' in api, 'calibrator missing'
    assert b"function premium_factor_for(array $db, string $metal): array" in api, 'factor resolver missing'
    assert b"function rates_health(array $db): array" in api, 'health reporter missing'
    assert b'array_slice((array)($db[\'rates\'][\'premiumCalib\'] ?? []), -200)' in api, 'window not capped at 200'
    assert b'abs($r - $prev[\'gold\']) > 0.30' in api, 'calibration sanity jump guard missing'
    assert b'in_array($src, [\'live\', \'live-mcx\', \'mcx-est\', \'mcx-est(partial)\'], true)' in api, 'spotKind ladder wrong'
    assert b"'source' => ($liveLegs >= 2) ? 'mcx-est' : 'mcx-est(partial)'" in api, 'mcx-est source missing'
    assert b"spotKind' => 'mcx-est'" not in api and b"($premiumEst ? 'mcx-est'" in api, 'spotKind not premium-aware'
    assert b"if ($gUsd > 0 && $pgF[0] > 0) { $gold24 = ($gUsd * $inr) / OZ * $pgF[0];" in api, 'gold estimate line missing'
    assert b"'premiumEst' => $premiumEst" in api, 'stamp does not carry the applied premium'
    # calibration runs while both feeds are live
    assert b"if ($gUsd > 0 && $sUsd > 0 && $inr > 0) premium_calibrate($db, $mcx, $gUsd, $sUsd, $inr);" in api, 'calibration not called on the live path'
    # last-good persistence
    assert b"$db['rates']['mcxLastGood'] = ['at' => now_iso(), 'goldPerG'" in api, 'mcxLastGood not persisted'
    # the GET route must persist before jout exits
    m_get = re.search(rb"if \(\$route === 'rates' && \$method === 'GET'\) \{\n    if \(rates_stale\(\$db\)\) \{ rates_refresh\(\$db\); \$changed = true; \}\n    // v179[\s\S]*?\n    if \(\$changed\) db_save\(\$DB_FILE, \$db\);", api)
    assert m_get, 'GET /api/rates still loses the refresh to the jout-exit'
    # health rides the public payload
    assert b"'health' => rates_health($db)," in api, 'health missing from /api/rates'
    assert b"'overall' => $overall," in api, 'overall verdict missing'
    # relay pull health side-file, throttled
    assert b'$rhFile = $GLOBALS[\'ROOT\'] . \'/data/.relay-health.json\';' in api, 'relay health side-file missing'
    assert b"($rhPrev ? strtotime($rhPrev['at']) : 0) > time() - 300" in api, 'relay health not throttled'
    # the legacy raw-spot-only path must be gone
    assert b"$gA = $mcx['gold'] ? round(($mcx['gold']['ltp'] / 10) * 1.0, 2) : round(($sg / OZ) * $inr, 2);" not in api, 'raw spot anchor is back'
    # ── v179: the UI renders the honest state ──
    assert b'function v179HealthStrip(R)' in contents['js/admin.js'], 'admin health strip missing'
    assert b'${v179HealthStrip(R)}' in contents['js/admin.js'], 'strip not rendered in the rates tab'
    for k in ['health.mcx', 'health.relay', 'health.angel', 'health.spot', 'health.premium']:
        assert k.encode() in contents['js/admin.js'], f'strip does not read {k}'
    assert b"String(R.source || '').startsWith('mcx-est')" in contents['js/app.js'], 'storefront honest label missing'
    assert b'(auto-learned)' in contents['js/app.js'], 'calibration origin not shown to the customer'
    # ── the relay v2 ships in the repo (deployed separately, never in the zip) ──
    relay = (ROOT / 'cms/relay/relay.js').read_bytes()
    assert b'signal is aborted without reason' in relay, 'the abort class not named in the relay'
    assert b"const BASE = process.env.ANGEL_API_BASE || 'https://apiconnect.angelbroking.com'" in relay, 'base must be the SmartAPI REST host'
    assert b'function totp(secret)' in relay and b"function b32decode(s)" in relay, 'TOTP not self-contained'
    assert b'if (Date.now() - lastLoginAt < 30000) return !!SESSION;' in relay, 're-login gate missing'
    assert b'resolveTokens()' in relay and b'searchScrip' in relay, 'rollover re-resolution missing'
    assert b"if (r.code === 429)" in relay, '429 backoff missing'
    assert b'Date.now() - state.lastFrameAt > 90000' in relay, '90 s watchdog missing'
    assert b'relay-last-tick.json' in relay, 'last-tick persistence missing'
    assert b"process.on('unhandledRejection'" in relay and b"process.on('uncaughtException'" in relay, 'crash tolerance missing'
    assert b"req.headers['x-relay-key'] !== CFG.tickKey" in relay, '/tick not key-gated'
    assert b"u.searchParams.get('key') !== CFG.streamKey" in relay, '/stream not key-gated'
    assert b"u.pathname === '/healthz'" in relay, '/healthz missing'
    assert b"it.symbolToken ?? it.symboltoken" in relay, 'quote token casing not lenient'
    relpkg = (ROOT / 'cms/relay/package.json').read_bytes()
    assert b'"start": "node relay.js"' in relpkg and b'"node": ">=18"' in relpkg, 'relay deploy manifest wrong'
    assert (ROOT / 'cms/relay/README-RENDER.md').exists(), 'Render deployment guide missing'
    # ── cumulative prior repairs must still be present ──
    assert b'const timeFmt = iso => {' in contents['js/app.js']
    assert b'pr = price(p, R)' in contents['js/app.js']
    assert b'window.Shivaa.shareProduct = async id =>' in contents['js/app.js']
    assert b'apgUpload' in contents['js/admin.js']
    assert b'window.Shivaa.CATS' in contents['js/admin.js']
    assert b'$storePhone' not in api, 'shop-number fallback is back'
    assert b"$cfPlaceholder = '9000000000'" in api, 'neutral placeholder missing'
    assert b"'customer_phone' => $cfPhone" in api
    css = contents['css/v175.css'].decode()
    assert re.search(r'max-width:\s*1080px[\s\S]*?\.pd-gallery\s*\{\s*top:\s*auto', css), 'offset not dropped'
    assert re.search(r'min-width:\s*1081px[\s\S]*?\.pd-gallery\s*\{\s*position:\s*sticky;\s*top:\s*100px', css), 'desktop sticky'
    css174 = contents['css/v174.css'].decode()
    assert re.search(r'\.gal-wrap\s*\{\s*contain:\s*paint', css174), 'v174 containment'
    assert re.search(r'\.pd-info\s*\{\s*position:\s*relative;\s*z-index:\s*2', css174), 'v174 paint order'
    assert all(not f.startswith(('data/', 'uploads/', 'cms/')) and f != '.htaccess' for f in FILES)
    assert 'relay' not in [f.replace('.php','').split('/')[-1] for f in FILES], 'the relay is a Render service, not a site file'
    output = ROOT / 'shivaa-update-v179.zip'
    with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for name, content in contents.items():
            info = zipfile.ZipInfo(name, date_time=(2026, 9, 24, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            z.writestr(info, content)
    with zipfile.ZipFile(output) as z:
        assert z.testzip() is None
        assert z.namelist() == FILES
        for name, content in contents.items():
            assert z.read(name) == content, name
    print(f'Source commit: {commit}')
    print(f'{output.name}: {len(FILES)} files, {output.stat().st_size} bytes')
    print('SHA-256: ' + hashlib.sha256(output.read_bytes()).hexdigest())
    return output

if __name__ == '__main__':
    build(sys.argv[1] if len(sys.argv) > 1 else 'HEAD')
