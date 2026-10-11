# v195 — Shivaa Black membership card, as the main home hero

Release stamp: **195** (index.html, js/app.js APP_REL, sw.js SHELL/REL, api.php version).
Update file: `shivaa-update-v195.zip` (built by `tools/mega/make-v195-zip.py`, 130 files).

## What the customer sees
- **Home hero:** directly under the main hero, a black-and-gold Shivaa Black banner with a
  CSS card. Guests see "Claim your free card". Members see their masked card number and
  "View my Shivaa Black card" (the full number never appears on the home page).
- **Claim page (#/black-card):** three steps.
  1. Your details: name on the card, and the registered mobile (read-only).
  2. Delivery address: house/street, area (optional), city, state, PIN, delivery mobile.
  3. Review and claim: "Delivered free · ₹0", the benefit, and a tick-box to confirm.
- **After claiming:** the full card, member ID, certificate number, validity, delivery
  address, and "Copy my card number" with how-to-use steps.

## The rules (all decided on the server)
- 20% off the **making charges only**. Metal and stones stay at today's rate.
- Six months from the day of the claim (a calendar anniversary, not 180 days).
- The physical card is delivered **free**: the delivery fee is always ₹0.
- Bound to the registered mobile. Changing the mobile hides the card and its coupon.
- The card number is the coupon code. Typed with or without spaces, it works at checkout.
- A card number belonging to one account never works for anyone else, and never falls
  through to a public coupon.
- Claiming twice changes nothing; a missing delivery address can be added later.

## What changed in the code
- `api.php`: the Shivaa Black helpers (`black_*`), one shared coupon lookup
  (`coupon_resolve`) used by the checkout preview and the order route, the GET and claim
  routes, and the signed-in coupon list.
- `js/v195-black.js`: the hero card and the claim page.
- `js/app.js`: three small hooks (the hero slot, the fill call, the `black-card` page).
- `css/v195.css`: the black theme, the card, the steps, phone layout, reduced motion.

## Checks
- `v195-php-run.js`: 14/14, against real PHP. Claim, address rules, idempotency, checkout
  preview and order arithmetic, guest and other-member refusal, mobile binding, expiry.
- `v195-dom-run.js`: 6/6, in jsdom. Guest and member hero, sign-in page, the three
  steps with validation, a failed claim.
- `v195-check.js`: 10/10. Stamps, load order, hero placement, single coupon lookup,
  no duplicate PHP functions, copy, phone and reduced-motion rules.

## Not verified here
- No real browser or phone (the headless browser download is blocked). Please check on a
  phone: the hero, the card, the three steps, and a checkout with the card number.
- Physical dispatch: the card is saved with status "to-ship". There is no admin screen
  for printing or dispatch yet.
