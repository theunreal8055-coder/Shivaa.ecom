#!/usr/bin/env python3
"""Build the v178 code update from a committed revision.

v178 — use Shivaa like an app: no store, no APK, no upload. The owner's ask:
"how can we give customers an option to download the app on their mobile
without uploading to the Play Store?" The site already ships the whole PWA
substrate (standalone manifest, 192/512 + maskable icons, service worker,
iOS meta tags, offline shell) — what was missing was the nudge. v178 adds
exactly that, and nothing else:

1 · THE IN-FOOTER APP BAND (plain footer HTML in index.html).
   A quiet card between the footer nav and the trust row: a QR code of the
   canonical site URL, a one-line pitch and a CTA. It lives in the normal
   footer flow. It is NOT the v140 install chip: that floating element was
   removed after the owner complained it "never really goes away", and the
   v178 suite asserts the band uses no fixed/absolute positioning, no
   timers, no alerts, and never creates the dead chip's id.

2 · THE QR (js/v178.js, fully client-side).
   qrcode-generator 1.4.4 (MIT, © 2009 Kazuhiko Arase) is vendored verbatim
   in its own IIFE; the code for https://shivaa.in/ is drawn onto a canvas
   with a quiet zone, no image, no network. iPhone and Android, one code.

3 · THE CTA (one-tap where the browser offers it).
   Chrome/Edge capture the real beforeinstallprompt (preventDefault, stored)
   and fire it ONLY on the CTA tap; appinstalled and a declined choice are
   both handled; the band hides itself once the app is installed or the
   page already runs standalone (Chrome display-mode + iOS navigator).

4 · THE GUIDE SHEET (tap-only overlay, instant close).
   iPhone: Share → "Add to Home Screen". Other Android browsers: ⋮ menu →
   "Add to Home screen". Desktop: browser menu → Install. Closes at once on
   the × button, the backdrop or Esc. The dismiss on the card is persisted
   (localStorage, versioned key) with a 30-day courtesy re-show — then it
   stays out of the way without being gone forever.

What v178 does NOT change: no API route, no admin surface, no money code,
no media. Stamps move 177 → 178 in lockstep (index, app.js, sw.js, api.php,
every ?v= URL); the media cache deliberately stays at 168 because no media
changed.

Cumulative on v177/v176/v175/v174/v173/v172/v171: nine files (the v177 seven
plus css/v178.css and js/v178.js), so installing v178 alone on a v165+ site
delivers everything.
Usage: python3 tools/mega/make-v178-zip.py [commit-ish]
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
    stamp = '178'
    assert f'__SHIVAA_REL={stamp};'.encode() in contents['index.html']
    assert f'APP_REL = {stamp};'.encode() in contents['js/app.js']
    assert f"SHELL = 'shivaa-shell-v{stamp}'".encode() in contents['sw.js']
    assert f'const REL = {stamp};'.encode() in contents['sw.js']
    assert f"'rel'   => {stamp},".encode() in contents['api.php']
    assert b"MEDIA = 'shivaa-media-v168'" in contents['sw.js']   # no media changed
    assert contents['index.html'].count(f'?v={stamp}'.encode()) >= 56
    for name in ['index.html', 'sw.js', 'js/app.js']:
        assert b'?v=177' not in contents[name], f'{name} still pins a v177 URL'
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
    # ── v178: the band is real footer HTML ──
    for el in [b'id="shvAppBand"', b'id="shvAppQr"', b'id="shvAppCta"', b'id="shvAppDismiss"']:
        assert el in contents['index.html'], f'band element {el.decode()} missing'
    assert b'<canvas id="shvAppQr" width="256" height="256">' in contents['index.html']
    m_band = re.search(rb'<section class="fv-appband"[^>]*>.*?</section>', html.encode(), re.S)
    assert m_band, 'fv-appband section not found'
    assert b'hidden' not in m_band.group(0).split(b'>')[0], 'band must ship unhidden'
    i_cols, i_band, i_trust = (html.index(s) for s in
        ['<nav class="fv-cols"', '<section class="fv-appband"', '<div class="fv-trust"'])
    assert i_cols < i_band < i_trust, 'band must sit between the footer nav and the trust row'
    # ── v178: the v140 law in the shipped code ──
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
    # ── v177: the confirmed purge actually runs ──
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
    output = ROOT / 'shivaa-update-v178.zip'
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
