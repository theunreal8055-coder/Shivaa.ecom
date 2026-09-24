#!/usr/bin/env python3
"""Build the v176 code update from a committed revision.

v176 — failed payments stop counting as sales, and the gateway test orders
can be purged from the dashboard. Owner report, 23 Sep 2026:

  "Actually can you reset all the sales data, because when i was deploying the
   payment gateway integration I was trying sales without actually paying and
   its showing in sales in my dashboard, how can you show sales even if the
   payment is failed, first Delete all the sales data, don't touch b2b and
   b2c customers"

1 · THE DEFECT — WHY A FAILED PAYMENT WAS A "SALE".
   A Cashfree payment that fails, is dropped at the bank page, or is simply
   never completed NEVER marks the order Failed. cashfree_apply() records the
   failure in cfLastFailure and leaves paymentStatus exactly where it was at
   creation: 'Awaiting payment'. The row stays in db['orders'] with a live
   fulfilment status, and every revenue figure in the admin API filtered on
   fulfilment status ALONE:

       admin/stats    $liveOrders = ... ($o['status'] ?? '') !== 'Cancelled'
                      $rev = array_sum(array_column($liveOrders, 'total'));
       admin/reports  $valid = ... ($o['status'] ?? '') !== 'Cancelled'
                      $revenue += (int)($o['total'] ?? 0);
       admin/cashbook same shape, split into online/COD/WhatsApp buckets

   paymentStatus was never consulted, so each test the owner ran while wiring
   up Cashfree was summed into revenue, AOV and the daily chart at its FULL
   order total. On the synthetic order book used to prove this, 56% of the
   reported "revenue" was money that never arrived.

   v176 introduces ONE definition of money received — order_money_received() —
   and routes all three endpoints through it. A sale is money the shop holds:
   Paid counts the total, Partially paid counts amountPaid, and everything
   else (Awaiting payment / Confirm on WhatsApp / Proof submitted / Pending
   (COD) / Refunded) counts zero until it is genuinely collected. Order COUNT
   still reports every order placed, and the paid/unpaid split is now returned
   so the dashboard shows the difference instead of hiding it.

2 · THE PURGE — one admin action, backup first.
   The owner also asked for the data itself to be deleted. POST
   /api/admin/purge-unpaid removes ONLY db['orders'] rows whose payment never
   completed; GET on the same route is a dry-run preview (counts, value, a
   per-payment-status breakdown and the first 25 rows) so nothing is deleted
   blind. Before a single row is removed the FULL database is written to
   data/backups/db-before-purge-<timestamp>.json (web-denied by .htaccess),
   the last 10 such backups are retained, and the action is audit-logged.
   users (B2B + B2C customers), partners, products, settlements, reviews,
   coupons and catalogs are never touched — proved by assertion in the
   verification run. Paid, Partially paid, COD and Refunded orders survive,
   because that money is real. A second, explicit scope ('all') exists for a
   complete sales reset and is gated behind a longer confirmation phrase
   ('DELETE ALL SALES') so it cannot be reached by a stray click.

Cumulative on v175 (photo/title overlap + Cashfree phone leak), v174
(photo-frame containment), v173 (shared-link crash), v172 (share button) and
v171 (gallery upload + category names): same files, so installing v176 alone
on a v165+ site delivers all six. Requires a full v165-or-newer CMS
installation. No DB/uploads/host config.
Usage: python3 tools/mega/make-v176-zip.py [commit-ish]
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
    stamp = '176'
    assert f'__SHIVAA_REL={stamp};'.encode() in contents['index.html']
    assert f'APP_REL = {stamp};'.encode() in contents['js/app.js']
    assert f"SHELL = 'shivaa-shell-v{stamp}'".encode() in contents['sw.js']
    assert f'const REL = {stamp};'.encode() in contents['sw.js']
    assert f"'rel'   => {stamp},".encode() in contents['api.php']
    assert b"MEDIA = 'shivaa-media-v168'" in contents['sw.js']   # no media changed
    assert contents['index.html'].count(f'?v={stamp}'.encode()) >= 50
    html = contents['index.html'].decode()
    # the repair sheet must be the LAST stylesheet a real browser applies
    links = re.findall(r'<link[^>]*rel="stylesheet"[^>]*href="(/css/[^"]+)"', html)
    assert links and links[-1] == f'/css/v175.css?v={stamp}', links[-3:]
    for sheet in ['v174.css', 'v175.css']:
        assert f"'/css/{sheet}?v={stamp}'".encode() in contents['sw.js'], sheet
    # ── v176: a sale is money that actually arrived ──
    api = contents['api.php']
    assert b'function order_money_received(array $o): int' in api, 'helper missing'
    assert b'function order_is_paid_sale(array $o): bool' in api, 'paid-sale helper missing'
    assert b'function order_is_unpaid_attempt(array $o): bool' in api, 'unpaid-attempt helper missing'
    # all three revenue sites must go through the helper, not a raw total
    assert api.count(b'order_money_received(') >= 4, 'helper not used everywhere'
    assert b"$rev = array_sum(array_map('order_money_received', $liveOrders));" in api, 'stats still raw'
    assert b'$received = order_money_received($o);' in api, 'report/cashbook still raw'
    assert b"$revenue += (int)($o['total'] ?? 0);" not in api, 'old report line still present'
    assert b"$rev = array_sum(array_column($liveOrders, 'total'));" not in api, 'old stats line still present'
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
    assert b"@mkdir($bkDir" in purge_block, 'backup directory not created'
    assert b"jout(500, ['error' => 'Could not write the safety backup" in purge_block, 'purge must abort if the backup fails'
    # the dashboard surface for it
    assert b'pgPreview' in contents['js/admin.js'], 'purge UI missing'
    assert b'/api/admin/purge-unpaid' in contents['js/admin.js'], 'purge API call missing'
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
    output = ROOT / 'shivaa-update-v176.zip'
    with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for name, content in contents.items():
            info = zipfile.ZipInfo(name, date_time=(2026, 9, 23, 0, 0, 0))
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
