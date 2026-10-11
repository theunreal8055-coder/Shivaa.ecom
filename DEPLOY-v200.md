# Shivaa update v200: button colour fixes across the site

File: `shivaa-update-v200.zip` (130 files). Unzip into the site root, as for earlier updates.

## What was wrong
A contrast audit of every visible button (desktop and mobile, all main routes) found text that was
unreadable against its background:

- **Gold buttons lost their gold fill.** `v193.css` set `background-image` on `.btn-gold` to a white
  sheen only, which wiped the gold gradient. Dark text then sat on black or on the page background.
  Affected: "Verify mobile & create my card", "Get my Black Card", "Enter scheme details", and others.
- **Outline button on cream.** "iPhone / iPad" on the hallmark hero used cream text on cream.
- **Scheme page.** The "Skip to gender selection" outline button used dark maroon text on dark maroon.
  The gold CTA beside it had dark text on maroon.
- **App banner.** The "Hide ×" control was cream on white.
- **Black Card menu row and film captions.** Dark text on black.

## What changed
- `cms/css/v200.css` (new, loaded last in `index.html`). Restores the gold fill on `.btn-gold` (excluding
  the Black Card CTAs, which already have their own gold). It also sets readable colours for the cases above.
- Stamp moved from 199 to 200: `index.html`, `sw.js` (shell `shivaa-shell-v200`, precache includes
  `v200.css`), `app.js` (`APP_REL = 200`), `api.php` (`rel 200`).

## Verification
- Re-run of the contrast audit with computed colours and gradient stops: 0 buttons below 3:1 (was 7 unique).
- Screenshot of the Black Card hero: the gold button now shows dark text on a gold fill.
- Not checked on a real phone. Check the Black Card, hallmark and scheme pages after a hard refresh.

## Deploy
Upload the zip contents to the site root. The service worker will install the new shell on the next visit.
