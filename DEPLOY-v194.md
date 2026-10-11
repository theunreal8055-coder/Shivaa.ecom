# v194 — full-app mobile fit, fluid controls

Release stamp: **194** (index.html, js/app.js APP_REL, sw.js SHELL/REL, api.php version).
Update file: `shivaa-update-v194.zip` (built by `tools/mega/make-v194-zip.py`, 128 files, about 3.7 MB).

## The red strip on sideways slides
- Cause: on phones the page background was maroon (`#1d0509`), and some wide strips
  (tickers, marquees, carousels) let the page slide sideways a little. The maroon
  showed at the edge.
- Fix (css/v194.css): the page can no longer slide sideways (`overflow-x: clip` on html
  and body, no sideways bounce). The page background is cream, so any edge reveal is
  never red. Media (images, video, iframes, SVG, tables) is capped to the screen width.
- Safety net (js/v194.js): if the page is still scrolled sideways it returns to the left
  edge, and any top-level block still wider than the screen is clipped. Fixed headers,
  bottom bars and overlays are left alone.

## Buttons and motion
- Every button and link has no tap delay and no grey tap flash.
- Press feedback on touch: a soft squeeze (scale .97). On desktop, a 1 px lift.
- Disabled buttons look disabled and do not respond to hover.
- Keyboard focus outline in gold.
- Reduced-motion users get no lifts, no squeezes, and no fades.

## Checks
- `tools/mega/smoke/v194-check.js`: 9/9. Stamps, load order, overflow, cream root,
  media caps, guard script, touch feedback, every JS file parses, and every inline
  `onclick`/`onsubmit`/`onchange` handler points at a defined function.
- Full `npm test` chain: see the release log.

## Not verified here
- No browser or phone in the build sandbox (headless Chromium download is blocked).
  Please test on your phone:
  1. Slide the home page left and right with a finger. No coloured strip should appear.
  2. Tap the main buttons (Shop, Add to bag, checkout, the Premium card claim).
  3. Rotate the phone and check that the layout still fits.

## Not in this file
- The 239 MB product photo library is already live on the server. It is not repacked
  here, because a full copy would exceed the file size limit. Upload only the photos
  this release changes, if any.
- Shivaa Black card restoration: still waiting for your choice (port into v194, or use
  the v186 base).
