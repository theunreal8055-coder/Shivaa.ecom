# Shivaa update v201: the Shivaa Black membership, redrawn as a luxury object

File: `shivaa-update-v201.zip` (131 files). Unzip into the site root, as for earlier updates.

## What changed
- `cms/css/v201.css` (new, loaded last). Visual only:
  - Obsidian stage with a slowly turning champagne hairline and fine gold grain.
  - Gold-foil headline type and a gold journey track.
  - Benefit tiles on glass with gold-foil numerals and a hover sheen.
  - Underlined name and mobile fields, stacked under their labels (they had run into the label).
  - Gold CTA with a slow sheen (paused under reduced motion).
  - Engraved-style membership certificate and matching panels.
- Stamp moved 200 → 201 in `index.html`, `sw.js` (shell `shivaa-shell-v201`, precache lists `v201.css`),
  `app.js` (`APP_REL`) and `api.php` (`rel`).
- Markup, copy, prices and the OTP/claim logic are unchanged.

## Verification
- Desktop full-page screenshot of `#/black-card` before and after.
- Contrast audit of every visible button: 0 under 3:1. The first draft of the CTA gradient failed
  (2.6:1) and was fixed before this build.
- Not run: the full smoke suite and a phone check.

## Deploy
Owner approval required. Upload the zip contents, then hard refresh the Black Card page on a phone.
