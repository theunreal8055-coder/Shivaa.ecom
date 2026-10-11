# Shivaa update v203: the Shivaa Black card, with holographic foil and motion

File: `shivaa-update-v203.zip`. Unzip into the site root, as for earlier updates.

## What changed
- `cms/css/v203.css` (new, loaded last). Visual only:
  - Holographic foil that follows the pointer, using the card's existing tilt variables.
  - A living champagne-to-violet rim that turns slowly around the card.
  - A light sweep across the card face every few seconds.
  - Floating gold dust, and orbit rings that turn slowly.
  - A hologram ring on the seal, a breathing number glow, and a shimmering code.
  - A lit grid on the back, and a soft reflection under the card.
  - The top-right status pill sits above the effects, so its text stays readable.
  - Reduced-motion users get the same look with no movement.
- Stamp moved 202 → 203 in `index.html`, `sw.js` (shell `shivaa-shell-v203`, precache lists `v203.css`),
  `app.js` (`APP_REL`) and `api.php` (`rel`).
- Markup, copy, prices and the flip and pointer scripts are unchanged.

## Verification
- Card screenshot on `#/black-card`, hovered.
- Found and fixed during the check: the seal overlapped its label because a position override
  pulled it out of layout, and the status pill text was hidden by the foil. Both are fixed.
- Contrast audit of every visible button: 0 under 3:1.
- Not run: the full smoke suite and a phone check.

## Deploy
Owner approval required. After upload, hard refresh the Black Card page on a phone.
