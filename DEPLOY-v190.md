# v190 — two offers for every customer: 20% off making charges + FREE home delivery

Release stamp: **190** (index.html, js/app.js APP_REL, sw.js SHELL/REL, api.php version).

## What customers see
- **Home banner:** two cards, "20% off making charges" (code **MAKING20**) and
  "FREE home delivery" (code **FREEDEL**). Guests and signed-in customers alike.
- **Footer and side menu:** the same two offers, compact.

## How it works
- `GET /api/offers/banner` returns the live offers. On first use it creates the two
  public coupons if they are missing. They run until the owner switches them off.
- **MAKING20** is 20% off the making charges only (scope *making*). The owner can
  change the code under Settings → "Making-charges coupon code".
- **FREEDEL** carries `freeShipping`. The order route waives the delivery fee when it
  is applied; the checkout shows the shipping line as FREE.
- Switch: Admin → Settings → "Offers for every customer" (ON by default). Untick it to
  hide both. An owner who switches one coupon off under Coupons keeps it off.

## Known limit (please read)
- Coupons are applied on the server only for **signed-in** orders (existing rule).
  A guest sees the offer card, but the discount/free delivery applies only after they
  sign in at checkout. Lifting that rule is a payment-path change; not done here.

## Update file
`shivaa-update-v190.zip` (124 files), built by `tools/mega/make-v190-zip.py`.

## Checks
- `tools/mega/smoke/v190-check.js`: 9/9.
- `php-parse-check.js`: `api.php` parses (negative control rejected).
- Full `npm test` chain: see the release log.
- Not run live: a real checkout with the offers applied (no PHP runtime or browser here).
