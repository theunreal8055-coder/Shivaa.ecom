#!/usr/bin/env python3
"""Build the v183 code update from a committed revision.

v183 — FY 2026–27 Growth Mission deck (Admin → FY Mission, admin-only).
The owner's work order: an interactive dashboard for this financial year's two
numbers — 700 B2B jeweller partners and 1,100 retail customers — both to be
completed before 30 March 2027, with a live countdown, visible only in the
admin portal, in a high-fidelity finish.

What ships (6 files, root layout):
1 · api.php        FY deck helpers + four admin-only routes
                   (GET/POST admin/fy-targets, POST …/entry, …/entry-undo),
                   fyEntries ledger, rel 183
2 · index.html     stamps → 183, 57× ?v=183, css/v183.css linked last
3 · js/app.js      APP_REL = 183
4 · js/admin.js    "FY Mission" tab: countdown, lane rings, run-rate, growth
                   curve, ledger, mission settings
5 · sw.js          SHELL/REL 183, 52× ?v=183, MEDIA stays shivaa-media-v168
6 · css/v183.css   the deck's design system (scoped to .fy-deck only)

No schema change: fyTargets/fyEntries are JSON collections in v183 (like
khata / cashbook / savingsPlans), so there is no upgrade-sql.php in this ZIP
and the install is extract-only.

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
    'index.html',
    'js/app.js',
    'js/admin.js',
    'sw.js',
    'css/v183.css',
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
    assert contents['index.html'].count(f'?v={stamp}'.encode()) >= 57
    assert contents['sw.js'].count(f'?v={stamp}'.encode()) == 52
    for name in ['index.html', 'sw.js', 'js/app.js', 'js/admin.js']:
        assert b'?v=182' not in contents[name], f'{name} still pins a v182 URL'

    # css/v183.css is the last stylesheet and the worker precaches it
    html = contents['index.html'].decode()
    links = re.findall(r'<link[^>]*rel="stylesheet"[^>]*href="(/css/[^"]+)"', html)
    assert links and links[-1] == f'/css/v183.css?v={stamp}', links[-3:]
    # admin-only sheet loads non-blocking (v117 pattern) with a noscript fallback
    assert f'<link rel="preload" as="style" href="/css/v183.css?v={stamp}"'.encode() in contents['index.html']
    assert f'<noscript><link rel="stylesheet" href="/css/v183.css?v={stamp}"></noscript>'.encode() in contents['index.html']
    assert contents['index.html'].count(f'?v={stamp}'.encode()) >= 58
    for link in links:
        assert f"'{link}'".encode() in contents['sw.js'], f'precache missing {link}'

    # ── api.php: the deck is admin-only and its numbers are derived ──
    api = contents['api.php']
    for needle in [
        b'function shv_fy_defaults(): array',
        b'function shv_fy_config(array $db): array',
        b'function shv_fy_records(array $db, string $lane): array',
        b'function shv_fy_lane(array $db, array $cfg, string $lane, int $now): array',
        b'function shv_fy_history(array $db, array $cfg, string $lane, int $now): array',
        b'function shv_fy_view(array $db): array',
        b"'admin/fy-targets'",
        b"'admin/fy-targets/entry'",
        b"'admin/fy-targets/entry-undo'",
        b'counts are NEVER invented',
        b"'serverNow' => $now * 1000",
        b"'2027-03-30T23:59:59+05:30'",
        b"'target' => 700",
        b"'target' => 1100",
        b"'fyEntries'",
    ]:
        assert needle in api, f'api.php missing {needle.decode()}'
    block_start = api.index('v183 · FY 2026–27 Growth Mission deck — ADMIN ONLY'.encode())
    block_end = api.index('/* ── making charges ── */'.encode(), block_start)
    block = api[block_start:block_end]
    assert block.count(b'need_admin($db)') == 4, 'every FY route must be admin-gated'
    assert b"'fy-targets' &&" not in api, 'no non-admin fy route may exist'

    # ── admin.js: the tab, its gate and its handlers ──
    adm = contents['js/admin.js']
    for needle in [
        b"['fy','\xf0\x9f\x91\x91','FY Mission']",
        b"if (tab === 'fy') {",
        b'/api/admin/fy-targets',
        b'ShivaaAdmin.fyAddEntry',
        b'ShivaaAdmin.fyUndoEntry',
        b'ShivaaAdmin.fySaveTargets',
        b'deck.countdown.serverNow',
        b'setInterval(paint, 1000)',
    ]:
        assert needle in adm, f'js/admin.js missing {needle.decode()}'
    assert adm.index(b"state.user.role !== 'admin'") < adm.index(b"['fy','"), 'tab behind the admin gate'

    # ── css/v183.css: nothing outside the .fy- namespace ──
    css = re.sub(rb'/\*[\s\S]*?\*/', b'', contents['css/v183.css'])
    assert b'.fy-deck{' in css
    assert b'prefers-reduced-motion' in css and b'@media print' in css

    out = ROOT / f'shivaa-update-v{stamp}.zip'
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
        for f in FILES:
            info = zipfile.ZipInfo(f, date_time=(2026, 10, 3, 12, 0, 0))
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
