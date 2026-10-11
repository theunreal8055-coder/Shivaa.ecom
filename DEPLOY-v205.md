# Shivaa update v205: Prestigious Member certificate redesign, and the physical-card delivery flow

File: `shivaa-update-v205.zip`. Unzip into the site root, as for earlier updates.

## 1. The delivery button and the flow
- The Premium button now shows "Opening your delivery form…" while it works, and restores its label on error.
- The delivery page reloads the card from the server if the page has no copy of it, instead of silently
  sending the member back to the card page. If the member has no card, it says so and links to create one.
- After the address is saved, the page re-renders the confirmation "Your physical card is set." It used to
  set the same hash, so the form stayed on screen.
- Verified in a headless browser with mocked API responses (the PHP backend was not run here):
  button → premium claim (its reply has no card data) → address form → "GET MY CARD" → confirmation. No page errors.
- Earlier cause (fixed in v204): the click handler sat outside the app's scope, so the click threw
  "state is not defined".

## 2. The Prestigious Member certificate
Research (web, Oct 2026): premium certificates lead with restraint and one premium accent. They use a
refined serif for the name, generous margins, bold foil rather than hairlines, an embossed seal, and a
guilloche background as the security texture. Sources: adobe stock guilloche certificates; Corcoran
Printing, "The Art of Foil Stamped Certificates"; 4over4, "Certificate and Award Printing Ideas With a
Foil Finish"; Vervante, "Add Elegance with Embossed Gold Seals on Certificates".

What the redesign does (visual only; markup and copy are unchanged apart from a frame and a fourth corner):
- Obsidian paper with a guilloche texture and a slow light band, in the Shivaa Black theme.
- A double frame: a fine outer line and a gold inner line, with four corner ornaments.
- A foil seal with an embossed rim and a turning light.
- An engraved "S" watermark.
- A gold foil name, a diamond divider, and a ledger row for the details.
- A cream heading, with the italic line in gold. An older rule had made it dark bronze, hard to read.

## Verification
- Certificate screenshots at 1280 and 390 wide.
- Contrast audit of visible buttons: see the audit run for this release.
- Not run: the PHP backend and the full smoke suite. Phone test still needed.

## Deploy
Owner approval required. After upload, hard refresh the Black Card page on a phone and test the
"Get home delivery physical card" button with a real account.
