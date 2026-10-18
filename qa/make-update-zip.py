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
import os
import sys
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CMS = os.path.join(ROOT, 'cms')


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
    print('shivaa-update-v%d.zip' % rel)
    print('  files     : %d  (v%d had %d)' % (len(names), rel - 1, len(previous_list(rel - 1))))
    print('  raw bytes : %s' % format(raw, ','))
    print('  zip bytes : %s' % format(os.path.getsize(out), ','))
    print('  sha256    : %s' % digest)


if __name__ == '__main__':
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    build(int(sys.argv[1]), list_only='--list' in sys.argv)
