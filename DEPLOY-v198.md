# Shivaa update v198: the full Shivaa Black membership feature

File: `shivaa-update-v198.zip` (129 files, sha256 `23e331e4…2bb`). Unzip into the site root, as for earlier updates.

## Why this update exists

The full Black feature (flip card, six-month journey, Family certificate, claim page,
checkout and cart offers, account card, header pill, side menu, footer link and the black
home hero) was built in the uploaded **v186** release (`shivaa-update-v186 (2).zip`). Its
front-end code was never committed to this repository. The v187 to v197 updates carried only
a partial version (the v195 strip), which is why the full card stopped showing.

v198 restores the v186 front end and keeps everything added since (offers, Premium card,
Amrita page, contrast and mobile fixes).

## What the customer sees

- **Home main hero:** the black campaign hero. "Get my Black Card" (or "Open my Black Card"
  when the customer has one), the live card, the 20% promise, and the Family certificate note.
  "Explore jewellery" and "Win 10g Gold Biscuit" stay as buttons.
- **Below the hero:** the privileges section, then the public 20% offer, the category bar and
  the carousel, as before.
- **Header pill, side menu and footer:** a link to Shivaa Black on every page.
- **Claim page (`#/black-card`):** for signed-in customers, the claim card asks for the
  delivery address (name, mobile, house/street, area, city, state, PIN). The physical card is
  free. The card and the Family certificate are saved to the account.
- **Terms as built:** 20% off making charges only, for six calendar months. Not applied to
  metal, stones, GST or shipping. One card per retail account. Card and certificate stay in
  My Account after the benefit ends.

## Changes in this update

- `js/app.js`: the v186 Black front end is restored (card, journey, certificate, claim with
  address, save/share, checkout and cart hooks). The v195 module hooks are removed, so only
  one black card page exists.
- `index.html`: links to `css/v184.css`, `v185.css`, `v186.css` (missing from the line before)
  and the black hero preload. The v195/v197 layers and their slots are removed.
- `api.php`: the account payload includes `blackCard` (only for the bound mobile). The coupon
  check answers in the making-charge shape the checkout reads (`making_percent`,
  `eligibleBasis`) and accepts `makingAmount`. Orders record `makingChargeDiscount`.
- `sw.js`: shell `shivaa-shell-v198`, precache includes the Black stylesheets.
- Removed: `js/v195-black.js`, `css/v195.css`, `css/v197.css`.

## Tests

- `tools/mega/smoke/v198-check.js`: 9/9 (stamps, no leftover v195/v197 layers, Black stylesheets
  linked and precached, black hero, header/side/footer links, one card page, claim sends the
  address, server contract, account payload).
- `npm test` exit 0 (the chain now starts with `v198-check.js`; `v197-check.js` and
  `v195-dom-run.js` are retired with the v195 module).
- `v169-check.js`: its sandbox now provides `blackCardActive` (the checkout depends on it).
- `v184-php-run.js`: 18/18.

## Not verified here

No real browser or phone was available, so the visual result and the flip and motion
behaviour are untested. Please check on a phone: the home hero, the claim page with the
address step, the card flip, the footer and side-menu links, and a checkout with a
making-charge code.

## Decisions to confirm with the owner

- A new card needs a full delivery address before it is created. A signed-in customer who
  clicks the claim button without an address is asked to fill it in first.
- Checkout keeps the existing rule: a code that does not validate for the account is left out
  of the order and the order is placed at full price. The stricter rule from the v186 release
  (reject the order) was not adopted because an existing test requires the current behaviour.
