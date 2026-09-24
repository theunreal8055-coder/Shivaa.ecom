#!/usr/bin/env python3
"""Build the v180 code update from a committed revision.

v180 — the SQL runtime switch (Phase 1+2 of the 3-lakh catalogue plan).
The owner's work order: continue the Hostinger MySQL migration so 3 lakh
designs cannot slow the site the way one giant JSON file would.

What ships (6 files, root layout):

1 · DUAL-MODE STORAGE (api.php).
   db_driver in config.php is finally honoured. When it reads 'mysql':
   product content is served from Hostinger MySQL (JSON still defines
   membership + order as the reconciliation baseline) — but ONLY when the
   mirror is provably healthy: PDO connects, no data/.sql-mirror-behind
   flag, and every JSON product id exists in SQL with equal counts.
   Any doubt → the JSON safety net, with the exact reason published on
   /api/version → db.reason (driver-json / no-connection / mirror-behind /
   count-mismatch / id-mismatch / sql-empty / sql-error).

2 · MIRROR-ON-SAVE (api.php).
   After the proven JSON save succeeds (flock, atomic rename, 409 snapshot
   — all unchanged), product rows are diffed per-id against the load
   snapshot and mirrored (upsert + delete) — so EVERY mutation site
   (admin CRUD, stock decrements, hallmark edits) is covered without
   touching a single route. GET/HEAD never mirror (rate polls stay free).
   A mirror failure never fails the request: it writes
   data/.sql-mirror-behind and, while that flag exists, reads AND mirror
   writes stay off until /upgrade-sql.php reconciles — healing is
   installer-owned and audited, never silent.

3 · THE INSTALLER (upgrade-sql.php — NEW, arrives only in this ZIP;
   excluded from the GitHub auto-deploy like setup-mysql.php).
   One idempotent URL: admin-password gate (same bcrypt/legacy verify as
   api.php, per-IP throttle), BACKUP of data/db.json FIRST, schema
   up/grades (data_json full-row column, FULLTEXT(name,desc) for 300k
   search, LONGTEXT desc, Phase-3 tables prepared), full product
   reconcile from the live JSON, count + byte-identical spot-check
   verification, then the mirror flag clears and reads switch to MySQL.

4 · HONEST TELEMETRY.
   /api/version gains the public `db` payload (driver/mode/reason/
   counts/mirrorBehind — booleans and counts only, never credentials).
   Admin → Live Rates gains the v180 Data Source strip: green when MySQL
   serves the catalogue, amber with the plain-English reason + the
   fix (open /upgrade-sql.php) when the safety net is holding, plus the
   one-line rollback (db_driver => 'json').

5 · compute_price hardening (found by the executed gate, not by reading):
   a row missing metal/purity (API-created) used to error the product
   page; it now prices with catalogue defaults. Every real catalogue row
   carries both keys, so no existing price changes.

Stamps move 179 → 180 in lockstep (index, app.js, sw.js, api.php, every
?v= URL); the media cache deliberately stays shivaa-media-v168.
NO orders/users/settings runtime migration yet (Phase 3 — separate
release), no money-route changes, no customers, no media.

Requires live v179 or newer. Rollback: restore the five pre-existing
files from backup and/or set db_driver => 'json' in config.php (the
installer file can stay; it changes nothing by existing).

Usage: python3 tools/mega/make-v180-zip.py [commit-ish]
"""
import re
import subprocess
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FILES = [
    'api.php',
    'index.html',
    'sw.js',
    'js/app.js',
    'js/admin.js',
    'upgrade-sql.php',   # v180 — the one-time reconciler, ZIP-only delivery
]

def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT)

def build(revision='HEAD'):
    commit = git('rev-parse', '--verify', revision + '^{commit}').decode().strip()
    contents = {f: git('show', f'{commit}:cms/{f}') for f in FILES}
    stamp = '180'
    # ── stamp lockstep ──
    assert f'__SHIVAA_REL={stamp};'.encode() in contents['index.html']
    assert f'APP_REL = {stamp};'.encode() in contents['js/app.js']
    assert f"SHELL = 'shivaa-shell-v{stamp}'".encode() in contents['sw.js']
    assert f'const REL = {stamp};'.encode() in contents['sw.js']
    assert f"'rel'   => {stamp},".encode() in contents['api.php']
    assert b"MEDIA = 'shivaa-media-v168'" in contents['sw.js']   # no media changed
    assert contents['index.html'].count(f'?v={stamp}'.encode()) >= 56
    assert contents['sw.js'].count(f'?v={stamp}'.encode()) == 51
    for name in ['index.html', 'sw.js', 'js/app.js', 'js/admin.js']:
        assert b'?v=179' not in contents[name], f'{name} still pins a v179 URL'
    # v178.css must still be the LAST stylesheet (no new css in v180)
    html = contents['index.html'].decode()
    links = re.findall(r'<link[^>]*rel="stylesheet"[^>]*href="(/css/[^"]+)"', html)
    assert links and links[-1] == f'/css/v178.css?v={stamp}', links[-3:]

    api = contents['api.php']
    # ── the dual-mode layer, complete ──
    for needle in [
        b'function shv_db_driver(): string',
        b'function shv_sql_products_overlay(array $jsonProducts): array',
        b'function shv_sql_products_mirror(array $products): void',
        b'function shv_sql_overlay_verdict(array $jsonProducts, array $sqlById): string',
        b'data/.sql-mirror-behind',
        b"'db' => shv_version_db()",
        b"function_exists('shv_sql_products_overlay')",
        b"function_exists('shv_sql_products_mirror')",
        b'compute_price(array $p, array $R)',
        b"$p['metal'] ?? 'Gold'",
        b"(string)($p['purity'] ?? '22K')",
    ]:
        assert needle in api, f'api.php missing {needle.decode()}'
    # mirror AFTER the saved snapshot; never on GET
    i_snap = api.index(b"$GLOBALS['__shv_snapshots'][$DB_FILE] = hash('sha256', $json);")
    i_mir = api.index(b"function_exists('shv_sql_products_mirror')")
    assert i_snap < i_mir, 'mirror must run after the JSON save'
    mir_body = api[api.index(b'function shv_sql_products_mirror'):api.index(b'function shv_version_db')]
    assert b"REQUEST_METHOD" in mir_body and b'GET' in mir_body, 'GET guard'
    # ── installer invariants ──
    inst = contents['upgrade-sql.php']
    post = inst.index(b"$_SERVER['REQUEST_METHOD'] === 'POST'")
    assert inst.index(b'shv_backup_json_db();', post) < inst.index(b'shv_ensure_schema($pdo);', post), 'backup first'
    assert inst.index(b'shv_ensure_schema($pdo);', post) < inst.index(b'shv_upsert_products($pdo,', post)
    assert b'password_verify' in inst and b'shv_attempts_locked' in inst
    assert b'db-before-sql-reconcile-' in inst and b'unlink($MIRROR_FLAG)' in inst
    assert b'CREATE TABLE IF NOT EXISTS `products`' in inst and b'ft_name_desc' in inst
    assert b'Cache-Control: no-store' in inst and b'noindex,nofollow' in inst
    assert b'catalog_batches' in inst   # Phase-3 review-queue table prepared
    # ── admin strip ──
    adm = contents['js/admin.js']
    assert b'v180DbStrip' in adm and b'id="v180DbStrip"' in adm
    assert b"/upgrade-sql.php" in adm and b"db_driver => 'json'" in adm
    # ── cumulative floors stay ──
    for fn in [b'function order_money_received(array $o): int',
               b'function order_is_paid_sale(array $o): bool',
               b'function order_is_unpaid_attempt(array $o): bool']:
        assert fn in api, 'v176 money core missing'
    assert b'function premium_calibrate' in api, 'v179 premium calibration missing'
    assert b"$source = 'live-mcx';" in api, 'v179 live-rate sourcing missing'

    out = ROOT / f'shivaa-update-v{stamp}.zip'
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
        for f in FILES:
            z.writestr(f, contents[f])
    # deterministic: fixed timestamps
    import hashlib
    data = out.read_bytes()
    # rebuild with fixed date_time for byte-stability
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
        for f in FILES:
            info = zipfile.ZipInfo(f, date_time=(2026, 9, 24, 12, 0, 0))
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
