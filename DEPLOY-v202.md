# Shivaa update v202: the Shivaa Black home hero, redrawn with light, depth and motion

File: `shivaa-update-v202.zip`. Unzip into the site root, as for earlier updates.

## What changed
- `cms/css/v202.css` (new, loaded last). Visual only:
  - Layered obsidian and champagne backdrop, with a slowly rotating gold light cone behind the card.
  - Champagne italic headline line with a breathing glow.
  - Glass promise chips with a gold edge, and a gold CTA sheen.
  - Card stage: a gently floating card, a glancing light sweep across the card face, a floor glow, and a glass certificate chip.
  - Reduced-motion users get the static version.
- Stamp moved 201 → 202 in `index.html`, `sw.js` (shell `shivaa-shell-v202`, precache lists `v202.css`),
  `app.js` (`APP_REL`) and `api.php` (`rel`).
- Markup, copy, prices and scripts are unchanged.

## Verification
- Hero screenshot at 1280 wide, checked after a 7-second wait so the reveal finishes.
- Found and fixed during the check: gold-foil text on the italic line made the words invisible,
  because the reveal script splits words into child spans. Replaced with solid champagne plus glow.
- Contrast audit of every visible button: 0 under 3:1.
- Not run: the full smoke suite and a phone check.

## Deploy
Owner approval required. After upload, hard refresh the home page on a phone.
