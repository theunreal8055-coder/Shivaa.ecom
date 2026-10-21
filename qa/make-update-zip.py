#!/usr/bin/env python3
"""Build shivaa-update-vNNN.zip the way the last several releases were built.

    python3 qa/make-update-zip.py 229            # from the previous release's list
    python3 qa/make-update-zip.py 229 --list     # just print the file list

The rule this encodes: an update zip is the PREVIOUS zip's exact file list plus
whatever this release added. Nothing else is added and nothing is dropped,
because dropping a file from an update zip silently leaves the old copy on the
server — the one failure mode an "update" must never have.

The zip is deliberately NOT the whole cms/ tree. It omits, as v228 did:
  · .htaccess and cms/config.php  — server-only, and overwriting .htaccess on a
    live host is how a working site stops working;
  · data/db.json                  — the live records. Never ships, ever;
  · uploads/**                    — customer and catalogue uploads (except
    uploads/kyc/.htaccess, which denies that directory and must stay);
  · images/designs/**, most images/films/**, fonts/**, the privacy PDF, the
    favicon/logo/icon set, setup-mysql.php, upgrade-sql.php and the three old
    update zips that happen to sit inside cms/.
"""
import hashlib
import io
import json
import os
import sys
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CMS = os.path.join(ROOT, 'cms')
LEDGER = os.path.join(ROOT, 'docs', 'release-ledger.json')


def ledger():
    """the forward-only ledger, or None if it is not there (an old branch)"""
    try:
        return json.load(io.open(LEDGER, encoding='utf-8'))
    except Exception:
        return None


def previous_list(rel):
    """the file list of the previous release zip, in its own order"""
    prev = os.path.join(ROOT, 'shivaa-update-v%d.zip' % rel)
    if not os.path.isfile(prev):
        raise SystemExit('the previous release zip is missing: ' + prev)
    with zipfile.ZipFile(prev) as z:
        return [n for n in z.namelist() if not n.endswith('/')]


def new_files(rel):
    """what this release added that the previous zip could not have contained"""
    added = []
    layer = 'css/v%d.css' % rel
    if os.path.isfile(os.path.join(CMS, layer)):
        added.append(layer)
    return added


def build(rel, list_only=False):
    names = previous_list(rel - 1)
    for extra in new_files(rel):
        if extra in names:
            raise SystemExit('%s is already in the v%d list' % (extra, rel - 1))
        # keep the cascade order visible in the archive too
        anchor = 'css/v%d.css' % (rel - 1)
        at = names.index(anchor) + 1 if anchor in names else len([n for n in names if n.startswith('css/')])
        names.insert(at, extra)

    missing = [n for n in names if not os.path.isfile(os.path.join(CMS, n))]
    if missing:
        raise SystemExit('these files are in the list but not in the tree: %r' % missing)
    forbidden = [n for n in names
                 if n.startswith('data/') or n == 'db.json' or n.startswith('.git')
                 or n == '.htaccess' or n == 'config.php']
    if forbidden:
        raise SystemExit('refusing to ship %r' % forbidden)

    if list_only:
        print('\n'.join(names))
        print('%d files' % len(names))
        return

    out = os.path.join(ROOT, 'shivaa-update-v%d.zip' % rel)
    raw = 0
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for n in names:
            b = io.open(os.path.join(CMS, n), 'rb').read()
            raw += len(b)
            zi = zipfile.ZipInfo(n, date_time=(2026, 10, 18, 0, 0, 0))
            zi.external_attr = 0o644 << 16
            zi.compress_type = zipfile.ZIP_DEFLATED
            z.writestr(zi, b)
    digest = hashlib.sha256(io.open(out, 'rb').read()).hexdigest()
    size = os.path.getsize(out)

    # ── forward-only guard ───────────────────────────────────────────────────
    # A release number in docs/release-ledger.json is spent. Rebuilding it is only
    # allowed when the bytes come out identical — that is a reproduction (useful after
    # a sandbox reset), not a release. Different bytes under a spent number is exactly
    # the mistake this guard exists to stop, so the file is deleted and the run fails.
    led = ledger()
    if led:
        rows = led.get('releases') or []
        newest = max([r['release'] for r in rows], default=0)
        row = next((r for r in rows if r['release'] == rel), None)
        if row:
            same = (digest == row.get('sha256') and size == row.get('bytes')
                    and len(names) == row.get('files'))
            if not same:
                os.remove(out)
                raise SystemExit(
                    'REFUSING: v%d is already in the ledger (%s…, %s B, %d files) and this tree\n'
                    'rebuilds different bytes (%s…, %s B, %d files).\n'
                    'A spent release number is never rebuilt for shipping. Bump the release\n'
                    'number, or check out the tree the package was actually built from.'
                    % (rel, (row.get('sha256') or '')[:16], row.get('bytes'), row.get('files'),
                       digest[:16], size, len(names)))
            verdict = ('  ledger    : matches the shipped v%d — faithful rebuild, '
                       'not a new release' % rel)
        else:
            if rel <= newest:
                os.remove(out)
                raise SystemExit('REFUSING: v%d is not in the ledger and is not newer than v%d.\n'
                                 'Never reuse a release number.' % (rel, newest))
            verdict = '  ledger    : new release v%d' % rel
            if led.get('next_release') != rel:
                verdict += ('\n  WARNING   : the ledger says the next release is v%s — '
                            'update the ledger in the same commit' % led.get('next_release'))
    else:
        verdict = ('  ledger    : NOT FOUND — this is an old tree; the build cannot prove '
                   'it is a new release')

    print('shivaa-update-v%d.zip' % rel)
    print('  files     : %d  (v%d had %d)' % (len(names), rel - 1, len(previous_list(rel - 1))))
    print('  raw bytes : %s' % format(raw, ','))
    print('  zip bytes : %s' % format(size, ','))
    print('  sha256    : %s' % digest)
    print(verdict)


if __name__ == '__main__':
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    build(int(sys.argv[1]), list_only='--list' in sys.argv)
