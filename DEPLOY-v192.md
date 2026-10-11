# v192 — mobile polish layer

Release stamp: **192** (index.html, js/app.js APP_REL, sw.js SHELL/REL, api.php version).

## What changed (css/v192.css, loaded last, precached)
- **Everywhere:** tap highlight removed; tap-friendly touch handling; images and
  videos never wider than the screen; focus outline for keyboard users; a softer,
  premium press feedback on buttons (fine-pointer devices only).
- **Phones (≤ 767px):**
  - form fields at 16px, so iPhone Safari does not zoom in when a field is tapped;
  - buttons at least 44px tall;
  - long text wraps instead of pushing the page sideways;
  - the bottom bar clears the iPhone home indicator;
  - side menus scroll smoothly and do not scroll the page behind them;
  - offer cards keep safe-area padding on notched phones.
- **Reduced motion:** respected. Loading spinners keep running; only button
  transitions and smooth scrolling are turned off.
- Desktop layout is not changed by this file.

## Not verified here
- No browser or phone is available in the build sandbox, so the screens were NOT
  rendered and checked. The checks are static (rules present, scoped, not hiding
  content). Please test home, shop, product, cart and checkout on a phone.
- Anything that still looks wrong on a real screen needs a screenshot to fix.

## Update file
`shivaa-update-v192.zip`, built by `tools/mega/make-v192-zip.py`.

## Checks
- `tools/mega/smoke/v192-check.js`: 17/17.
- Full `npm test` chain: see the release log.
