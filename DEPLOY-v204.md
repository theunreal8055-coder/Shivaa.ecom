# Shivaa update v204: the physical-card button works, the address page is rewritten, and the Black card is phone-ready

File: `shivaa-update-v204.zip`. Unzip into the site root, as for earlier updates.

## 1. "Get home delivery physical card" was dead (fixed)
- **Cause:** `cms/js/app.js` is one large wrapper function. The delivery click handler (added in v199)
  sat after that wrapper closed. Inside the handler, `state` was out of scope, so the handler threw
  on its first line and nothing happened. The same misplacement stopped the footer and side-menu
  offer slots from filling (`fillBannerOffer` was out of scope).
- **Fix:** the wrapper's closing bracket moved to the end of the file, so the handler and the
  banner call run inside it. No logic changed.
- **Verified:** with a signed-in test member (API intercepted), clicking the button sends
  `POST /api/premium/claim`, then opens `#/black-card/delivery`. The page errors are gone.

## 2. The address page
- Heading: "Where should we deliver *your* card?"
- Field label: "Where should we deliver your card?"
- The big button now reads **GET MY CARD ✦** (full width, extra-large).

## 3. The Black card on phones (`cms/css/v204.css`)
- The card and its code, figures and captions scale for narrow screens and stay readable.
- The membership panels stack in one column, with a two-column benefit grid.
- The address form is single-column, with clean fields and no heavy frame lines.

## Stamp
Moved 203 → 204 in `index.html`, `sw.js` (shell `shivaa-shell-v204`, precache lists `v204.css`),
`app.js` (`APP_REL`) and `api.php` (`rel`).

## Verification
- Delivery flow reproduced and fixed in a browser (desktop and phone widths).
- Contrast audit of every visible button: 0 under 3:1.
- Not run: the full smoke suite; a real-device check; a live PHP run (PHP is not installed in this sandbox).
- Test note: the preview API stub does not sign anyone in, so the flow was tested with the API intercepted.

## Deploy
Owner approval required. After upload, hard refresh the Black Card page on a phone, and tap
"Get home delivery physical card" to check the address page.
