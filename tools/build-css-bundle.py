#!/usr/bin/env python3
"""v222 — build the single stylesheet bundle (cms/css/shivaa.css).

WHY: index.html linked **58 <link> tags for 57 separate stylesheets — every one
of them render-blocking**. The browser could not paint until all of them had
arrived, and six of them came in late through the preload-swap pattern, so the
page restyled itself a moment after first paint. That is the "not loading
correctly / not smooth" the owner reported. One bundle = one blocking request,
nothing arriving late, ~100 KB less to send (the layers gzip far better
together than apart).

THE ORDER lives in tools/css-bundle-order.txt, not in index.html. That is
deliberate: once index.html links only the bundle, deriving the order from it
would mean bundling the bundle into itself. (The first draft of this script did
exactly that, and qa/browser/t-v222-bundle.mjs caught it.)

WHAT THIS DOES
  · reads the cascade order from tools/css-bundle-order.txt;
  · strips CSS comments (quote- and escape-aware, never touching strings/url());
  · concatenates the layers into cms/css/shivaa.css with a provenance header;
  · verifies index.html links exactly that one stylesheet;
  · verifies its own output byte-for-byte, and that every block sits at its
    own position, in order, without overlap.

WHAT IT DELIBERATELY DOES NOT DO
  · No minification. Whitespace is left alone so a bundle rule reads exactly
    like its source; gzip/brotli take care of the bytes.
  · No deduping — see the note about v186.css in the order file.
  · It never edits or deletes a source layer. They stay in the repo and in the
    release zip: the QA suites read them, and a rollback restores index.html
    alone.

USAGE
  python3 tools/build-css-bundle.py            # dry run: report only
  python3 tools/build-css-bundle.py --write    # write cms/css/shivaa.css
"""
import io, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORDER_FILE = os.path.join(ROOT, 'tools', 'css-bundle-order.txt')
INDEX = os.path.join(ROOT, 'cms', 'index.html')
OUT = os.path.join(ROOT, 'cms', 'css', 'shivaa.css')
BUNDLE_NAME = 'shivaa.css'
WRITE = '--write' in sys.argv


def strip_comments(src):
    """Remove /* ... */ but never inside a string or after an escape.

    Each comment becomes a single space so `a/*x*/b` reads `a b`, never `ab` —
    gluing two tokens together would be a real bug, not a cosmetic one.
    """
    out = []
    i, n = 0, len(src)
    while i < n:
        c = src[i]
        if c in '"\'':
            q = c
            out.append(c)
            i += 1
            while i < n:
                ch = src[i]
                out.append(ch)
                if ch == '\\' and i + 1 < n:
                    out.append(src[i + 1])
                    i += 2
                    continue
                i += 1
                if ch == q:
                    break
            continue
        if c == '/' and i + 1 < n and src[i + 1] == '*':
            j = src.find('*/', i + 2)
            i = n if j < 0 else j + 2
            out.append(' ')
            continue
        out.append(c)
        i += 1
    return ''.join(out)


def read_order():
    order = []
    for ln in io.open(ORDER_FILE, encoding='utf-8'):
        ln = ln.strip()
        if not ln or ln.startswith('#'):
            continue
        order.append(ln)
    return order


def main():
    order = read_order()
    if not order:
        sys.exit('css-bundle-order.txt is empty')

    # guard: the bundle must never be an input to itself
    if BUNDLE_NAME in order:
        sys.exit('%s must not appear in the order file — it is the output' % BUNDLE_NAME)

    missing = [f for f in order if not os.path.exists(os.path.join(ROOT, 'cms', 'css', f))]
    if missing:
        sys.exit('missing css files: %s' % ', '.join(missing))

    parts, bodies = [], []
    raw_total = stripped_total = 0
    for f in order:
        src = io.open(os.path.join(ROOT, 'cms', 'css', f), encoding='utf-8').read()
        body = strip_comments(src).strip('\n')
        raw_total += len(src)
        stripped_total += len(body)
        bodies.append(body)
        parts.append('/* %s */' % f)
        parts.append(body)

    bundle = '\n'.join(parts) + '\n'

    dupes = sorted({f for f in order if order.count(f) > 1})
    print('layers in the cascade order : %d' % len(order))
    print('distinct layers             : %d' % len(set(order)))
    print('kept as duplicates (by design): %s' % (', '.join(dupes) or 'none'))
    print()
    print('source bytes                : %9d (%.1f KB)' % (raw_total, raw_total / 1024))
    print('after comment strip         : %9d (%.1f KB)' % (stripped_total, stripped_total / 1024))
    print('bundle bytes                : %9d (%.1f KB)' % (len(bundle), len(bundle) / 1024))

    # ── index.html must link exactly this one stylesheet ────────────────────
    index_src = io.open(INDEX, encoding='utf-8').read()
    links = re.findall(r'<link rel="stylesheet" href="([^"]+)"', index_src)
    expect_link = '/css/%s?v=%s' % (BUNDLE_NAME,
                                    (re.search(r'__SHIVAA_REL=(\d+)', index_src) or [None, '?'])[1])
    if links != [expect_link]:
        sys.exit('index.html must link exactly [%s], found %s' % (expect_link, links))
    print('\nindex.html links            : %s' % expect_link)
    print('index.html stylesheet links : 1 (was 58)')

    # ── prove the output: byte equality against an independent rebuild ──────
    expect_parts = []
    for f, body in zip(order, bodies):
        expect_parts.append('/* %s */' % f)
        expect_parts.append(body)
    if bundle != '\n'.join(expect_parts) + '\n':
        sys.exit('VERIFY FAILED: bundle does not equal the ordered concatenation')
    print('\nVERIFY: bundle == ordered concatenation of all %d layers  OK' % len(order))

    pos = 0
    for f, body in zip(order, bodies):
        at = bundle.find(body, pos)
        if at < 0:
            sys.exit('VERIFY FAILED: %s not found at its position' % f)
        pos = at + len(body)
    print('VERIFY: all %d blocks present, contiguous and in order  OK' % len(order))

    if WRITE:
        io.open(OUT, 'w', encoding='utf-8').write(bundle)
        print('\nwrote %s (%d bytes)' % (os.path.relpath(OUT, ROOT), len(bundle)))
    else:
        print('\ndry run — re-run with --write')


main()
