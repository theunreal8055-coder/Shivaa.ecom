#!/usr/bin/env python3
"""Build the v177 code update from a committed revision.

v177 — the v176 rework, fixed. The owner's ask: "make v176 again but better,
without bugs and errors." v176 shipped the right definition of "money
received" and a backup-first purge, but the executed release carried real
defects that a parser pass and a Python simulation cannot see. v177 repairs
each of them at the source and adds executed PHP 8.3 tests that would have
caught every one of them.

1 · THE KILLER — the confirmed purge could never run.
   The backup line called json_encode() with JSON_UNESIGNED_SLASHES /
   JSON_UNESIGNED_UNICODE — constants that do not exist in PHP. Every
   confirmed POST /api/admin/purge-unpaid threw "Undefined constant" and
   500'd AFTER the owner typed the phrase: no backup, no delete, no note.
   v177 uses the real JSON_UNESCAPED_* pair (the same flags db_save uses)
   and tools/mega/smoke/v177-check.js asserts the typo can never return.

2 · THE PREVIEW LIED ABOUT ITS OWN SCOPE.
   The UI previews with GET /api/admin/purge-unpaid?scope=… but v176 read
   the scope only from the POST body, so every preview answered 'unpaid':
   with "every order" selected the owner saw a partial preview, the short
   phrase and no all-sales warning. v177 reads GET from the query and POST
   from the body, validating both to the two known scopes.

3 · BACKUPS COULD CLOBBER EACH OTHER.
   Two purges inside one second collided on db-before-purge-<Ymd-His>.json
   and the second silently overwrote the first — deleting through a backup
   that no longer exists. v177 makes the name unique before writing.

4 · THE DAY BOOK'S COD TILE READ ₹0 FOREVER.
   v176 filtered the cash book on the order's creation day while
   order_money_received() excludes COD until delivery — so the COD bucket
   was structurally always zero, even on the day the cash was collected.
   v177 counts money on the day it arrives, from the order's own payment
   ledger (v60: every accepted payment is a row with `at`/`status`):
   online and UPI rows on their receipt day, a proof on the day the owner
   approves it, COD on the day its row is written (cash in hand), and
   pre-ledger rows on paidAt then createdAt. The tile is renamed
   "COD collected" to say what it now means.

5 · CRASH-PROOFING THE v176 SURFACE.
   admin/stats' byDay hit PHP 8 "undefined array key" + substr(null) on a
   legacy row without createdAt and could 500 the whole dashboard; the
   purge preview's sample name raised a TypeError on a legacy scalar
   `address`; the audit line re-read the bearer token mid-route. All three
   are guarded. The scope=all success note no longer claims "every paid
   order was untouched".

What v177 does NOT change: the one-definition-of-money-received core
(order_money_received / order_is_paid_sale / order_is_unpaid_attempt and
the three revenue endpoints), the phrases, the backup-first ordering, the
customers-untouchable scope, and the v165+ cumulative 7-file layout.
Stamps move 176 → 177 in lockstep; the media cache deliberately stays at
168 because no media changed.

Cumulative on v176/v175/v174/v173/v172/v171: same seven files, so
installing v177 alone on a v165+ site delivers all seven.
Usage: python3 tools/mega/make-v177-zip.py [commit-ish]
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
    'js/app.js', 'js/admin.js',
]

def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT)

def build(revision='HEAD'):
    commit = git('rev-parse', '--verify', revision + '^{commit}').decode().strip()
    contents = {f: git('show', f'{commit}:cms/{f}') for f in FILES}
    stamp = '177'
    assert f'__SHIVAA_REL={stamp};'.encode() in contents['index.html']
    assert f'APP_REL = {stamp};'.encode() in contents['js/app.js']
    assert f"SHELL = 'shivaa-shell-v{stamp}'".encode() in contents['sw.js']
    assert f'const REL = {stamp};'.encode() in contents['sw.js']
    assert f"'rel'   => {stamp},".encode() in contents['api.php']
    assert b"MEDIA = 'shivaa-media-v168'" in contents['sw.js']   # no media changed
    assert contents['index.html'].count(f'?v={stamp}'.encode()) >= 50
    assert b'?v=176' not in contents['index.html'], 'v176 asset URL left behind'
    assert b'?v=176' not in contents['sw.js'], 'v176 asset URL left behind'
    html = contents['index.html'].decode()
    # the repair sheet must be the LAST stylesheet a real browser applies
    links = re.findall(r'<link[^>]*rel="stylesheet"[^>]*href="(/css/[^"]+)"', html)
    assert links and links[-1] == f'/css/v175.css?v={stamp}', links[-3:]
    for sheet in ['v174.css', 'v175.css']:
        assert f"'/css/{sheet}?v={stamp}'".encode() in contents['sw.js'], sheet
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
    # the preview honours the scope the UI selected
    assert api.count(b"$_GET['scope'] ?? 'unpaid'") == 1, 'GET preview lost its scope'
    assert api.count(b"($b['scope'] ?? 'unpaid') : ($_GET['scope'] ?? 'unpaid')") == 1, 'scope source split broken'
    # same-second backups cannot overwrite each other
    assert b'for ($bkN = 2; file_exists($bkPath); $bkN++)' in api, 'backup name collision is back'
    # the note tells the truth about what survived
    assert b"$survivors = $scope === 'all'" in api, 'scope-honest note missing'
    assert b'. B2B and B2C customers, partners, products and every paid order were untouched.' not in api, 'the lying note is back'
    # legacy rows cannot 500 the admin
    assert b"$d = substr((string)($o['createdAt'] ?? ''), 0, 10);\n      if ($d === '') continue;" in api, 'stats byDay guard missing'
    assert b'is_array($o[\'address\'] ?? null)' in api, 'preview address guard missing'
    assert b"$adminUser = need_admin($db);" in api, 'purge must keep the validated admin'
    assert b"req_user($db)['name'] ?? 'admin'" not in api, 'mid-route bearer re-read is back'
    # the day book counts ledger money on the day it arrives
    assert b"$d = substr((string)($p['approvedAt'] ?? $p['at'] ?? ''), 0, 10);" in api, 'proof approval-day rule missing'
    assert b"if ($method === 'COD') $codSales += $amt;" in api, 'COD bucket not ledger-driven'
    assert b"if (substr((string)($o['createdAt'] ?? ''), 0, 10) !== $day || ($o['status'] ?? '') === 'Cancelled') continue;" not in api, 'v176 creation-day filter is back'
    assert b'COD collected' in contents['js/admin.js'], 'day-book tile rename missing'
    # the purge endpoint
    assert b"$route === 'admin/purge-unpaid'" in api, 'purge route missing'
    assert b"db-before-purge-" in api, 'no safety backup before delete'
    assert b"'DELETE ALL SALES'" in api and b"'DELETE UNPAID'" in api, 'confirmation phrases missing'
    # customers must be provably out of reach of the purge: isolate just that
    # route's block (from its declaration to the next route handler).
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
    assert b"jout(500, ['error' => 'Could not write the safety backup'" in purge_block, 'purge must abort if the backup fails'
    # the dashboard surface for it
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
    # v175 — Cashfree phone leak stays closed
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
    output = ROOT / 'shivaa-update-v177.zip'
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
