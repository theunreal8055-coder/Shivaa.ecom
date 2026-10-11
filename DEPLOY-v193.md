# v193 — luxury polish layer

Release stamp: **193** (index.html, js/app.js APP_REL, sw.js SHELL/REL, api.php version).

## What changed (css/v193.css, loaded last, precached)
- Gold sheen on the gold call-to-action buttons; a refined gold focus ring.
- Offer cards: a finer gold frame, gold-gradient percentage figures, a slightly
  wider badge letter-spacing. On desktop with a mouse, cards lift gently on hover.
- Footer and side-menu offers: refined gold figures.
- Gold hairline dividers.
- Phones: slightly roomier offer-card spacing, still inside the screen.
- Reduced motion: no lifts, no transitions on those elements.

## Not changed
- Prices, coupons, checkout, Premium card logic, the offers route, and the
  Amrita page. This release is visual only.
- The Shivaa Black card has NOT been restored yet. It needs the owner's decision on
  how to merge it with the current coupon system (see the earlier message).

## Not verified here
- No browser or phone in the build sandbox. Check the home page and the offer cards on
  a phone and a laptop after installing.

## Update file
`shivaa-update-v193.zip`, built by `tools/mega/make-v193-zip.py`.

## Checks
- `tools/mega/smoke/v193-check.js`: 20/20.
- Full `npm test` chain: see the release log.
