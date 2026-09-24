# v178 — use Shivaa like an app: no store, no APK, no upload

**24 September 2026 · published on `arena/01a0d168-shivaa-ecom` · NOT DEPLOYED · NOT OWNER-INSTALLED**

The owner's request, verbatim: *"How can we give customers an option to
download the app in their mobile without even uploading it to the
playstore… is apk file way better or webapp way better or you have any
advanced modern smarter way?"* The answer, agreed with the owner:
**PWA first.** The site already ships the entire app substrate — a
standalone manifest, 192/512 + maskable icons, a service worker with
offline fallback, the iOS meta tags, an offline shell. What was missing
was the nudge, so this release adds exactly that, and nothing else: a
quiet **in-footer app band** with a **QR code** and a **CTA**, plus the
**iPhone / Android guide sheet** for the two taps browsers cannot do
one-shot. No APK, no Play Store, no signing key, no upload — and every
future release updates the "app" automatically through the existing
release dial.

This is a **forward release 178** (v177 stays shipped and untouched, per
the forward-only rule): the v177 seven files plus two new assets, nine
files total.

## Latest update download

**`shivaa-update-v178.zip`**, built from source commit
`0c8cd291510999503259f370d49eccf044dc4866`.

- **9 files · 445,829 bytes**; cumulative v171–v178 code-file union, a
  superset of the v177 package (adds `css/v178.css` + `js/v178.js`).
- Requires an existing full **v165-or-newer CMS**, not an empty hosting folder.
- **SHA-256:** `72464db96b0fe9c91d11c4b6c4f9785da0b59b88b68d6c3a4bcc7c18b31f509f`
- [Download v178 ZIP on GitHub](https://github.com/theunreal8055-coder/Shivaa.ecom/raw/e8fbf5234729dfa98533fa79c9dbfdf479615db5/shivaa-update-v178.zip)
- Source commit: `0c8cd291510999503259f370d49eccf044dc4866` (the code the
  ZIP contains). Publication commit: `e8fbf5234729dfa98533fa79c9dbfdf479615db5`
  (the ZIP on this session branch). The build is deterministic and every
  member byte-matches its committed `cms/` source (verified against
  `git show 0c8cd29:cms/…`).
- Builder: `python3 tools/mega/make-v178-zip.py` (asserts every cumulative
  prior repair — v176 revenue core, v177 purge fixes — plus the v178
  invariants: band placement, the v140 law, the vendored QR license,
  precache, lockstep stamps).

**Forward-only.** The v177 and v176 ZIPs and links are unchanged and must
stay available. Do not reset, revert to or restore an older release, do
not reuse or renumber a shipped release, and do not force-push or rewrite
history. **The next release is 179 or higher.**

**Back up your website and database first.** Upload/extract into the
existing website folder that contains `index.html` and `api.php` (usually
`public_html`, or `public_html/cms` for that installation). The ZIP has
root-relative members, **no extra `cms/` folder**. Replace the code files
together; never extract only the worker.

No database, uploads, credentials, media or host-managed `.htaccess` is
included. No API route changed, so there is nothing to re-configure. No
main merge, Hostinger deployment or real payment was performed.

### Package contents

```text
api.php
index.html
sw.js
js/app.js
js/admin.js
css/v175.css
css/v174.css
css/v178.css     ← new — the band + guide sheet styles (last stylesheet)
js/v178.js       ← new — vendored QR encoder (MIT) + band behaviour
```

Release handshake and shell asset URLs are **178**; staff follows APP_REL.
The media cache deliberately remains **168** because no media changed.

### What the customer sees, phone by phone

- **Everyone, first visit:** a quiet gold card in the **footer** — a QR
  code of `https://shivaa.in/`, one line of copy ("Shivaa on your phone —
  free, no Play Store") and a button. It is part of the page, not a
  pop-up: it never floats, never covers anything, and appears exactly
  where the eye is already scrolling. **Hide** dismisses it instantly and
  it stays dismissed for 30 days (then it may introduce itself once more —
  and if dismissed again, the same 30-day rest).
- **Android, Chrome/Edge:** tapping **"✦ Add to my phone"** fires the
  browser's own install prompt (captured via `beforeinstallprompt` — the
  prompt is **only ever fired by the tap**, never on its own). *Install*
  puts a full-screen Shivaa icon on the home screen; the card removes
  itself the moment `appinstalled` fires.
- **iPhone / iPad (Safari):** tapping the button opens a **two-step
  guide**: ① tap the Share button ▢, ② "Add to Home Screen". The sheet
  closes instantly on the ×, a backdrop tap or Esc. (iOS does not offer a
  one-tap install to web apps — the two taps are the shortest legal road.)
- **Other Android browsers** (Samsung Internet, Firefox, …): the same
  sheet with the ⋮-menu → "Add to Home screen" steps.
- **Anyone who scans the QR:** the camera opens `https://shivaa.in/`;
  from there the same one-tap (Android) or two-tap (iPhone) flow.
- **Inside the installed app** (standalone mode, Chrome or iOS): the band
  is never rendered — no reminder to "install" what you already have.

### The v140 law — enforced by tests, not by memory

The old floating install chip was removed in v140 after the owner
complained it "never really goes away". v178's suite asserts, on the
shipped bytes: the band uses **no `position:fixed/absolute`**, the file
contains **no timers at all** (nothing can re-appear on its own), no
browser alerts, it **never creates the dead chip's element id**, the only
overlay is the tap-open sheet, and every close (×, backdrop, Esc, dismiss)
is **instant** with the dismiss **persisted** in a versioned
`localStorage` key.

### What did not change

No API route, no admin surface, no money code, no orders, no customers,
no media. The v176/v177 purge, stats and cash-book behaviour is carried
unchanged (the builder re-asserts every one of those invariants, and the
executed PHP suite re-runs all 17 of them against the 178 tree).

### Verification recorded — executed, on the shipped bytes

- **`v178-check.js` 17/17** — static invariants (lockstep 178 stamps, zero
  177 leftovers, band between the footer nav and the trust row, v178.css
  last, both new assets precached, v178.js after v167.js), the **vendored
  QR encoder executed** (version-1 grid for the site URL, correct finder
  patterns, timing dark-on-even, dark module, deterministic re-draw, grid
  growth for longer content), the v140-law assertions above, and **DOM
  behaviour on the real shipped band markup in an isolated browser**:
  first visit shows the card with the QR drawn on-device (cream
  background, quiet zone); the captured install prompt fires **only on the
  CTA tap** and never alone; a declined prompt leaves the card exactly as
  it was; the iPhone sheet names "Share" and "Add to Home Screen" and
  closes instantly via button, Esc and backdrop; the Android fallback
  names the ⋮ menu; `appinstalled` hides the band and remembers it; the
  dismiss is instant and **persists across reloads** with the 30-day
  re-show honoured; standalone (Chrome `display-mode` and iOS
  `navigator.standalone`) never shows the band.
- **`v178-php-run.js` 17/17 — real PHP 8.3 under the isolated fixture**,
  re-run against the **extracted ZIP bytes**: the complete v177 regression
  carried over unchanged (revenue trio on the 10-order book, scope-honest
  previews, refused phrases write nothing, the safe delete with its backup
  and byte-identical customers, the full reset with the honest note,
  same-second backup uniqueness, retention, legacy-row crash guards, the
  day-book money rules) — proof the 178 re-stamp disturbed none of it —
  plus `/api/version` now reporting **178** with a matched
  index/app/worker handshake.
- **Full belt: 158 executed checks, 0 failures** — deployment-approval
  gate 20, v178 17, v178 PHP 17, v169 pages 25, v169 PHP 28, v168 boundary
  39, v168 PHP 12. The superseded v177 static suite stays on disk, off the
  chain (its stamp assertions are 177-shaped by design).
- ZIP integrity (`testzip`), member list (exactly the 9 files,
  root-relative), byte-for-byte member match against commit `0c8cd29`.

**Not verified — state this plainly:** no owner install; the live site is
unreachable from the sandbox; the real `beforeinstallprompt` and the
iPhone Share sheet were exercised with faithful stubs, not with a real
Chrome/Safari installation — a physical phone is the final acceptance.
No main merge, no Hostinger deployment, no real payment.

## Owner-approved live acceptance, still pending

1. Confirm `/api/version` reports **178** with matched index/app/worker
   stamps.
2. Open the live site, scroll to the footer: the gold card appears with a
   crisp QR (no flash of unstyled card; `v178.css` is the last sheet).
3. **Android phone, Chrome:** scan the QR with the camera → the site
   opens → tap **"✦ Add to my phone"** → the browser's *Install Shivaa
   Jewels* prompt appears (only because you tapped) → Install → a gold
   Shivaa icon on the home screen, opening full-screen → the footer card
   is gone (and stays gone while the app is open).
4. **iPhone:** scan the QR with the camera (or open in Safari) → tap the
   button → the two-step sheet → Share ▢ → *Add to Home Screen* → icon on
   the home screen. The sheet closed instantly the moment you tapped ×
   (or the backdrop, or Esc).
5. On the site, tap **Hide** → the card disappears at once → reload → it
   is still gone. (Thirty days later it may return once; hide again for
   another rest.)
6. The v140 rule, with your own eyes: nothing floats, nothing pops up by
   itself, nothing re-appears while the page is open.
7. Push (later, optional Phase 2 — Android web push only, never iPhone):
   the agreed plan stays on the existing WhatsApp/SMS lanes for iPhone.
