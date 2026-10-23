#!/usr/bin/env python3
"""build-desk-shell.py — generate cms/desk.html from cms/index.html.

    python3 tools/build-desk-shell.py            # write cms/desk.html
    python3 tools/build-desk-shell.py --check    # exit 1 if it is out of sync

WHY THIS EXISTS
---------------
v234 gives the jeweller desk its own installable app. The tempting shortcut is a
second hand-written HTML shell, and it is the wrong one: `app.js` binds dozens of
the shell's elements (modal overlay, toast wrap, search drawer, mnav, footer) and
assumes they exist. A hand-made shell would either crash or rot the first time a
release touched index.html.

So desk.html is index.html plus a small, asserted set of transforms — nothing
else. Every transform below must match exactly once or this script fails, which
is what stops the two files drifting apart. `--check` regenerates in memory and
compares, so a QA suite can prove the shipped desk.html is in sync.

The transforms:
  1 · the title and the description become the desk's;
  2 · /manifest.webmanifest → /desk.webmanifest (its own app identity);
  3 · canonical → /desk.html, plus `noindex` (it is a counter tool, not a page);
  4 · <html lang="en"> → <html lang="en" class="shv-desk">  (the layer's scope);
  5 · <body> → <body class="shv-desk-body">;
  6 · the release stamp is followed by the desk's default route (only when the
      URL has no hash, so a shortcut like #/partner?view=bullion&sec=book wins);
  7 · /js/v234.js is loaded last, and only here — a shopper never downloads it.
"""
import io
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'cms', 'index.html')
OUT = os.path.join(ROOT, 'cms', 'desk.html')

TITLE = 'Shivaa Bullion Desk — live rates, firm quotes, day book'
DESC = ('The jeweller desk as an app: live gold and silver rates per fine gram, '
        '90-second firm quotes, dealing slips and a day book. Partners only.')

BOOT = """<!-- v234 · desk default route. A shortcut from the installed app
     (/desk.html#/partner?view=bullion&sec=book) always wins; a bare open lands
     on the board, never on the shop. -->
<script>
  if (!location.hash) history.replaceState(null, '', location.pathname + '#/partner?view=bullion');
</script>"""

DESK_JS = """<!-- v234 · the desk app runtime — install prompt, keyboard map, wake lock,
     pull-to-refresh, share and density. Loaded by desk.html ONLY (a shopper
     never pays for it). -->
<script src="/js/v234.js?v=__REL__" defer></script>"""


def transform(src: str, rel: str = None) -> str:
    s = src
    if rel is None:
        import re
        m = re.search(r'window\.__SHIVAA_REL\s*=\s*(\d+)', s)
        rel = m.group(1) if m else '0'

    def once(old, new, label):
        nonlocal s
        n = s.count(old)
        if n != 1:
            raise SystemExit('desk-shell: expected exactly one %s, found %d' % (label, n))
        s = s.replace(old, new, 1)

    # 1 · title + description
    import re
    m = re.search(r'<title>[^<]*</title>', s)
    if not m:
        raise SystemExit('desk-shell: index.html has no <title>')
    s = s[:m.start()] + '<title>' + TITLE + '</title>' + s[m.end():]
    m = re.search(r'<meta name="description" content="[^"]*">', s)
    if not m:
        raise SystemExit('desk-shell: index.html has no meta description')
    s = s[:m.start()] + '<meta name="description" content="' + DESC + '">' + s[m.end():]

    # 2 · its own manifest
    once('<link rel="manifest" href="/manifest.webmanifest">',
         '<link rel="manifest" href="/desk.webmanifest">', 'manifest link')

    # 3 · canonical + noindex
    once('<link rel="canonical" href="https://shivaa.in/">',
         '<link rel="canonical" href="https://shivaa.in/desk.html">\n<meta name="robots" content="noindex,follow">',
         'canonical link')

    # 4 · scope class for the desk layer
    once('<html lang="en">', '<html lang="en" class="shv-desk">', 'html tag')

    # 5 · body class
    once('<body>', '<body class="shv-desk-body">', 'body tag')

    # 6 · default route, straight after the release stamp
    stamp = '<script>window.__SHIVAA_REL=%s;</script>' % rel
    once(stamp, stamp + '\n' + BOOT, 'release stamp')

    # 7 · the desk runtime, last script on the page
    once('</body>', DESK_JS.replace('__REL__', rel) + '\n</body>', 'body close')
    return s


def main():
    src = io.open(SRC, encoding='utf-8').read()
    want = transform(src)
    if '--check' in sys.argv:
        have = io.open(OUT, encoding='utf-8').read() if os.path.isfile(OUT) else ''
        if have != want:
            print('desk.html is OUT OF SYNC with index.html — run '
                  'python3 tools/build-desk-shell.py')
            return 1
        print('desk.html is in sync with index.html (%d bytes)' % len(want.encode()))
        return 0
    io.open(OUT, 'w', encoding='utf-8').write(want)
    print('wrote cms/desk.html (%d bytes)' % len(want.encode()))
    return 0


if __name__ == '__main__':
    sys.exit(main())
