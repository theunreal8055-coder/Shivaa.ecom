#!/usr/bin/env python3
"""Build shivaa-update-v167.zip — root layout for public_html.

v167 "EVERY FIELD HAS A NAME, EVERY PAGE HAS A HEADING" — the accessibility and
honesty pass found by the bug hunt of 21 Sep 2026.

Fixes in this release (each one reproduced before and after the change):

  A11Y · 140+ generated form fields had a visible <label> that was never
         associated with its control (no for=/id pair) — a screen reader read
         them all as "edit text, blank". js/v167.js pairs them in one delegated
         pass (attrs only, no markup, no design).
  A11Y · the empty bag, the quotation, both not-found views, the CMS page-miss
         and the six empty list states were <h3>s with no <h1> above them.
  A11Y · the member routes (account / track / certificates / invoice) opened the
         login sheet over an EMPTY page — closing it left a blank screen.
  A11Y · #modalBox was role="dialog" aria-modal="true" with NO accessible name
         at all; every sheet now borrows its own first heading, and the close
         button is labelled "Close" instead of a bare ✕ character.
  A11Y · heading levels skipped (h1 → h3/h4) on the legal pages, contact, rates,
         care, services, sizer, privacy and the product page (the BIS hallmark
         block on every PDP).
  A11Y · the B2B business-card dropzone was CLICK-ONLY: a partner on a keyboard
         had no way to attach the file the form invites; it is a real button now.
  BUG  · any route failure rendered "<h3>Something slipped</h3>" — a fragment
         with no page heading, no route home and no retry. Same for an unknown
         URL. Both are pages now, and a failed page can be retried in place.
  BUG  · pages.order dereferenced a missing order (`order.paymentStatus`): a 200
         without an order body crashed the whole route into the error view.
  A11Y · pages.certificate opened the login sheet over an EMPTY page (the same
         blank-screen class fixed for account/track/certificates/invoice).
  A11Y · #searchInput had outline:none with no keyboard replacement (an ID
         selector beat every generic :focus-visible rule in styles.css).
  BUG  · the login sheet rendered TWO elements with id="shvErr"; every error was
         written into the first (hidden) pane, so a jeweller's failed password
         showed a spinner that stopped and nothing else.
  BUG  · toast() threw if #toastWrap was ever missing — every message on the
         page died with it.
  BUG  · the shop filter badge could only ever show 0 for the price slider
         (`+ (value < 1500000 ? 0 : 0)`) and never refreshed while the drawer
         was open.
  BUG  · the slider's top stop (₹15,00,000) silently hid any piece priced above
         it while the label said "Any" — no ceiling now, honest "Any".
  DATA · the prepaid saving was read with `|| 2`: an owner-set 0% showed a 0-line
         saving row and a total that did not match api.php (which reads `?? 0`).
  DATA · freeShipAbove fell back to 0 (= no free shipping) instead of the
         published ₹50,000 when the setting key is absent.
  CACHE· sw.js declared MEDIA_TTL in the v120 layer and never read it: a photo
         replaced at the same URL kept its old bytes for every phone that had
         already seen it.
  CACHE· the v166 graphics failsafe (/js/aurum.js?v=166 …) asked for the frozen
         166 copies — the exact bytes that had just failed, on the devices that
         had already seen them. It now rides the page's own release.
  LEAK · v125.js mounted its shared resize/observer listeners once per render.

data/db.json and .htaccess are NEVER shipped in update zips (owner data + a
host-managed file). Files inside the zip are stored directly at ROOT
(e.g. index.html, NOT cms/index.html).
"""
import hashlib
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
CMS = ROOT / 'cms'
OUT = ROOT / 'shivaa-update-v167.zip'

FILES = [
    'api.php',
    'index.html',
    'sw.js',
    'css/v167.css',
    'js/app.js',
    'js/auth.js',
    'js/hallmark.js',
    'js/v116.js',
    'js/v117.js',
    'js/v125.js',
    'js/v166.js',
    'js/v167.js',
]


def build_zip(target_path):
    with zipfile.ZipFile(target_path, 'w', zipfile.ZIP_DEFLATED) as z:
        for rel in FILES:
            f = CMS / rel
            if not f.exists():
                raise SystemExit(f'missing: {f}')
            z.write(f, rel)

    names = zipfile.ZipFile(target_path).namelist()
    assert sorted(names) == sorted(FILES), f'Mismatch in zip files: {names}'
    assert not any(n.startswith('cms/') for n in names), 'No cms/ prefix allowed'
    assert not any(n.endswith('.htaccess') or n.endswith('db.json') for n in names), \
        'data + .htaccess must never ship'


if __name__ == '__main__':
    build_zip(OUT)
    h = hashlib.md5(OUT.read_bytes()).hexdigest()
    print(f'{OUT.name} · {OUT.stat().st_size} bytes · {len(FILES)} files')
    print(f'md5  {h}')
    for rel in FILES:
        print(f'  {rel}  {(CMS / rel).stat().st_size:>7} B')
