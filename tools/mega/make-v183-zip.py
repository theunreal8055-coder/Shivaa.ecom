#!/usr/bin/env python3
"""Build the v183 code update from a committed revision.

v183 — SUPPLIER (MANUFACTURER) PROGRAMME, confidential by design.
The owner's work order: a supplier section on the website where manufacturers
set up their IDs, every supplier gets a UNIQUE code, and an order for any
supplier's design routes straight to that supplier's portal — while customers
and jeweller partners never learn whose design it is. The secret is enforced
mechanically (see cms/hallmark.php + shv_public_order in api.php).

What ships (6 files, root layout):
1 · api.php (supplier book + unique-code minting, apply/approve/portal routes,
   supplier-scoped designs & media, derived order-routing tickets with a strict
   workflow, admin book/assign/rotate/orders routes, fulfilment-only projection,
   suppliers + supply_orders SQL overlay/mirror, rel 183)
2 · hallmark.php (the public product pass now strips the maker — one choke
   point, so no storefront or partner surface can leak the origin)
3 · index.html (stamps → 183, drawer + footer "For Manufacturers" doors)
4 · js/app.js (APP_REL = 183, #/suppliers application, #/supplier portal,
   supplier login routing + header pill)
5 · js/admin.js (🏭 Suppliers tab: book, codes, approval, design assignment,
   routed orders, drop-ship rules)
6 · sw.js (SHELL/REL 183, 51× ?v=183, MEDIA stays shivaa-media-v168)
7 · upgrade-sql.php (suppliers table with UNIQUE code + supply_orders ledger,
   upserts, count verification)

Usage: python3 tools/mega/make-v183-zip.py [commit-ish]
"""
import hashlib
import re
import subprocess
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FILES = [
    'api.php',
    'hallmark.php',
    'index.html',
    'js/app.js',
    'js/admin.js',
    'sw.js',
    'upgrade-sql.php',
]

def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT)

def build(revision='HEAD'):
    commit = git('rev-parse', '--verify', revision + '^{commit}').decode().strip()
    contents = {f: git('show', f'{commit}:cms/{f}') for f in FILES}
    stamp = '183'

    # ── stamp lockstep ──
    assert f'__SHIVAA_REL={stamp};'.encode() in contents['index.html']
    assert f'APP_REL = {stamp};'.encode() in contents['js/app.js']
    assert f"SHELL = 'shivaa-shell-v{stamp}'".encode() in contents['sw.js']
    assert f'const REL = {stamp};'.encode() in contents['sw.js']
    assert f"'rel'   => {stamp},".encode() in contents['api.php']
    assert b"MEDIA = 'shivaa-media-v168'" in contents['sw.js']
    assert contents['index.html'].count(f'?v={stamp}'.encode()) >= 56
    assert contents['sw.js'].count(f'?v={stamp}'.encode()) == 51
    for name in ['index.html', 'sw.js', 'js/app.js', 'js/admin.js']:
        assert b'?v=182' not in contents[name], f'{name} still pins a v182 URL'

    # v178.css remains the last stylesheet
    html = contents['index.html'].decode()
    links = re.findall(r'<link[^>]*rel="stylesheet"[^>]*href="(/css/[^"]+)"', html)
    assert links and links[-1] == f'/css/v178.css?v={stamp}', links[-3:]

    # ── api.php checks ──
    api = contents['api.php']
    for needle in [
        b'function shv_supplier_code_mint(array $db): string',
        b'function shv_supplier_code_taken(array $db, string $code, string $exceptId = \'\'): bool',
        b'function shv_supplier_strip(array $row): array',
        b'function shv_supplier_for_product(array $db, array $product): ?array',
        b'function shv_supplier_route_order(array &$db, array &$order): void',
        b'function shv_supplier_ctx(array $db): array',
        b'function shv_supply_status_apply(array &$db, string $orderId, string $supplierId, string $status, string $note, bool $isAdmin): array',
        b'function shv_sql_supplier_overlay(array &$db): void',
        b'function shv_sql_supplier_mirror(array $db): void',
        b"'suppliers/apply'", b"'supplier/designs'", b"'supplier/orders'",
        b"'admin/suppliers/assign'", b"'admin/suppliers/orders'",
        b"'suppliers','supplyOrders'",
        b"if (function_exists('shv_supplier_route_order')) shv_supplier_route_order($db, $order);",
        b"'supplierDropShip' => false, 'supplierSeesCustomer' => false",
    ]:
        assert needle in api, f'api.php missing {needle.decode()}'

    # ── hallmark.php: the public product pass strips the maker ──
    hall = contents['hallmark.php']
    assert b"if (function_exists('shv_supplier_strip')) $product = shv_supplier_strip($product);" in hall

    # ── upgrade-sql.php checks ──
    inst = contents['upgrade-sql.php']
    for needle in [
        b'CREATE TABLE IF NOT EXISTS `suppliers`', b'UNIQUE KEY `uq_supplier_code`',
        b'CREATE TABLE IF NOT EXISTS `supply_orders`',
        b'function shv_upsert_suppliers', b'function shv_upsert_supply_orders',
        b"$upSuppliers = shv_upsert_suppliers", b"$upSupplyOrders = shv_upsert_supply_orders",
        b'suppliers count: json=',
    ]:
        assert needle in inst, f'upgrade-sql.php missing {needle.decode()}'

    # ── front-end surfaces ──
    app = contents['js/app.js']
    assert b'pages.suppliers = async (view) => {' in app
    assert b'pages.supplier = async (view, q) => {' in app
    assert b"role === 'supplier' ? '#/supplier'" in app
    adm = contents['js/admin.js']
    assert '🏭'.encode() in adm and b'Suppliers' in adm
    assert b'ShivaaAdmin.supAssign' in adm and b'ShivaaAdmin.supRotate' in adm
    assert contents['index.html'].count(b'href="#/suppliers"') >= 3

    out = ROOT / f'shivaa-update-v{stamp}.zip'

    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
        for f in FILES:
            info = zipfile.ZipInfo(f, date_time=(2026, 10, 1, 12, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            z.writestr(info, contents[f])

    data = out.read_bytes()
    print(f'built {out.name}: {len(FILES)} files, {len(data)} bytes')
    print(f'SHA-256 {hashlib.sha256(data).hexdigest()}')
    print(f'source commit {commit}')
    for f in FILES:
        print(f'  {f:22s} {len(contents[f]):8d}')
    return out

if __name__ == '__main__':
    build(sys.argv[1] if len(sys.argv) > 1 else 'HEAD')
