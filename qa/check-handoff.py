#!/usr/bin/env python3
"""check-handoff.py — one command that proves the four things agents get wrong:

  1. the LEDGER is well formed and the highest release is the one marked live;
  2. the SHIPPED TREE (index.html, sw.js, app.js, api.php) carries that number;
  3. every ZIP in the ledger exists, is committed, and has the recorded sha256 —
     so the raw GitHub download links can never rot;
  4. every HANDOFF DOC states the same live number and the same next number, and
     none of them still claims an older release is live.

    python3 qa/check-handoff.py            # human lines
    python3 qa/check-handoff.py --quiet    # only failures + the summary

Exit 0 = every check green. Exit 1 = at least one red. Exit 2 = the ledger is unreadable.
"""
import hashlib
import io
import json
import os
import re
import subprocess
import sys
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LEDGER = os.path.join(ROOT, 'docs', 'release-ledger.json')

DOCS = [
    'docs/NEXT-CHAT-HEAD.md',
    'HANDOFF.md',
    'docs/RELEASE-LEDGER.md',
    'MEMORY.md',
    'AGENTS.md',
    'ARENA-STATE.md',
    'docs/AGENT-HANDOFF.md',
]

# A current-state claim naming an older release. These are the exact sentences that
# were true yesterday and lie today; anything found in a doc's top region is a FAIL.
STALE = [
    r'[Ll]ive site is \*\*v(?!{live}\b)\d+',
    r'[Ll]ive site: v(?!{live}\b)\d+',
    r'LIVE: v(?!{live}\b)\d+',
    r'[Ll]ive is v(?!{live}\b)\d+',
    r'[Ll]ive: \*\*v(?!{live}\b)\d+',
    r'[Pp]ushed, not live',
    r'[Nn]ext release number is \*\*v(?!{next}\b)\d+',
    r'[Nn]ext release number: \*\*v(?!{next}\b)\d+',
]

QUIET = '--quiet' in sys.argv
checks = 0
red = 0


def ok(name, condition, detail=''):
    global checks, red
    checks += 1
    if condition:
        if not QUIET:
            print('PASS  %s' % name)
        return True
    red += 1
    print('FAIL  %s%s' % (name, ('  — ' + detail) if detail else ''))
    return False


def read(rel):
    with io.open(os.path.join(ROOT, rel), encoding='utf-8', errors='replace') as fh:
        return fh.read()


def head(rel, lines=160):
    with io.open(os.path.join(ROOT, rel), encoding='utf-8', errors='replace') as fh:
        return ''.join(fh.readline() for _ in range(lines))


def sha256(path):
    h = hashlib.sha256()
    with io.open(path, 'rb') as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


def git(*args):
    try:
        out = subprocess.run(['git'] + list(args), cwd=ROOT, stdout=subprocess.PIPE,
                             stderr=subprocess.DEVNULL, timeout=180)
        return out.stdout.decode('utf-8', 'replace')
    except Exception:
        return ''


def main():
    if not os.path.isfile(LEDGER):
        print('FAIL  docs/release-ledger.json is missing')
        return 2
    try:
        led = json.load(io.open(LEDGER, encoding='utf-8'))
    except Exception as exc:
        print('FAIL  docs/release-ledger.json does not parse: %s' % exc)
        return 2

    releases = led.get('releases') or []
    if not releases:
        print('FAIL  the ledger has no releases')
        return 2
    numbers = [r['release'] for r in releases]
    newest = max(numbers)
    entry = [r for r in releases if r['release'] == newest][0]
    nxt = led.get('next_release')
    live = led.get('live', {}).get('release')

    print('Shivaa handoff check — ledger newest v%d, live v%s, next v%s'
          % (newest, live, nxt))
    print('')

    ok('ledger schema is 1', led.get('schema') == 1, repr(led.get('schema')))
    ok('release numbers are unique', len(numbers) == len(set(numbers)),
       str(sorted(numbers)))
    ok('release numbers ascend', numbers == sorted(numbers))
    ok('live release is the highest in the ledger', live == newest,
       'live says %s, highest row is v%d' % (live, newest))
    ok('next release is exactly one past live', nxt == newest + 1,
       'next says %s, expected %d' % (nxt, newest + 1))
    ok('the ledger names the release branch',
       led.get('release_branch') == 'arena/e8a470c6-shivaa-ecom',
       repr(led.get('release_branch')))
    ok('the live row is marked live', entry.get('status') == 'live',
       repr(entry.get('status')))

    # ── 2 · the shipped tree carries the newest number ────────────────────────
    index = read('cms/index.html')
    sw = read('cms/sw.js')
    app = read('cms/js/app.js')
    api = read('cms/api.php')

    m = re.search(r'window\.__SHIVAA_REL\s*=\s*(\d+)', index)
    ok('index.html carries __SHIVAA_REL = %d' % newest, bool(m) and int(m.group(1)) == newest,
       m.group(0) if m else 'not found')
    m = re.search(r'\bREL\s*=\s*(\d+)', sw)
    ok('sw.js carries REL = %d' % newest, bool(m) and int(m.group(1)) == newest,
       m.group(0) if m else 'not found')
    m = re.search(r"'shivaa-shell-v(\d+)'", sw)
    ok('sw.js names shivaa-shell-v%d' % newest, bool(m) and int(m.group(1)) == newest,
       m.group(0) if m else 'not found')
    m = re.search(r'^const APP_REL = (\d+);', app, re.M)
    ok('app.js carries APP_REL = %d' % newest, bool(m) and int(m.group(1)) == newest,
       m.group(0) if m else 'not found')
    m = re.search(r"'rel'\s*=>\s*(\d+)", api)
    ok("api.php carries 'rel' => %d" % newest, bool(m) and int(m.group(1)) == newest,
       m.group(0) if m else 'not found')

    # the release's own CSS layer, if it added one, must be shipped in the bundle
    layer = entry.get('layer')
    if layer:
        # the ledger stores the LAYER FILE NAME ('v232.css'); the order file lists
        # basenames and the bundle marks each block with '/* v232.css */'
        order = [ln.strip() for ln in read('tools/css-bundle-order.txt').splitlines()]
        bundle = read('cms/css/shivaa.css')
        ok('%s exists under cms/css/' % layer,
           os.path.isfile(os.path.join(ROOT, 'cms', 'css', layer)))
        ok('%s is in the bundle order' % layer, layer in order)
        ok('%s is inside cms/css/shivaa.css' % layer,
           ('/* %s */' % layer) in bundle)

    # ── 3 · every zip in the ledger exists, is committed, and matches ─────────
    tracked = git('ls-tree', '--name-only', 'HEAD')
    for r in releases:
        name = r.get('zip') or ''
        path = os.path.join(ROOT, name)
        ok('v%d zip exists  %s' % (r['release'], name), os.path.isfile(path))
        if not os.path.isfile(path):
            continue
        ok('v%d zip size is %s' % (r['release'], format(r.get('bytes', -1), ',')),
           os.path.getsize(path) == r.get('bytes'),
           'on disk %s' % format(os.path.getsize(path), ','))
        if r['release'] == newest or not QUIET:
            ok('v%d zip sha256 matches' % r['release'], sha256(path) == r.get('sha256'))
        with zipfile.ZipFile(path) as z:
            files = [n for n in z.namelist() if not n.endswith('/')]
        ok('v%d zip has %s files' % (r['release'], r.get('files')),
           len(files) == r.get('files'), 'on disk %d' % len(files))
        ok('v%d zip is committed in HEAD' % r['release'], name in tracked,
           'commit it — the raw download link reads from git')

    # never ship live data or the server's own config
    with zipfile.ZipFile(os.path.join(ROOT, entry['zip'])) as z:
        names = z.namelist()
    bad = [n for n in names if n.startswith('data/') or n == '.htaccess'
           or n == 'config.php']
    ok('the live package carries no data/, .htaccess or config.php', not bad, repr(bad[:3]))

    # ── 4 · the docs agree with the ledger ────────────────────────────────────
    for doc in DOCS:
        if not os.path.isfile(os.path.join(ROOT, doc)):
            ok('%s exists' % doc, False)
            continue
        top = head(doc)
        ok('%s names live v%d near the top' % (doc, newest),
           re.search(r'\bv%d\b' % newest, top) is not None)
        ok('%s names next v%d near the top' % (doc, nxt),
           re.search(r'\bv%d\b' % nxt, top) is not None)
        ok('%s points at qa/where-am-i.sh' % doc, 'where-am-i.sh' in top)

        for pattern in STALE:
            rx = re.compile(pattern.format(live=newest, next=nxt))
            hit = rx.search(top)
            ok('%s has no stale claim  /%s/' % (doc, pattern[:34]), hit is None,
               hit.group(0) if hit else '')

    # the next-release ritual and the zip builder must know about the ledger
    zip_py = read('qa/make-update-zip.py')
    ok('make-update-zip.py reads the ledger', 'release-ledger.json' in zip_py)
    ok('make-update-zip.py refuses a spent number',
       'refusing' in zip_py.lower() or 'REFUSING' in zip_py)

    head_doc = read('docs/NEXT-CHAT-HEAD.md')
    ok('NEXT-CHAT-HEAD names the release branch',
       'arena/e8a470c6-shivaa-ecom' in head_doc)
    ok('NEXT-CHAT-HEAD quotes the live zip sha256',
       entry['sha256'][:16] in head_doc)

    print('')
    print('%d checks, %d red' % (checks, red))
    return 1 if red else 0


if __name__ == '__main__':
    sys.exit(main())
