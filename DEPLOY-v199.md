# Shivaa update v199: the Black card journey, name and mobile first, Premium, then the physical-card address

File: `shivaa-update-v199.zip` (129 files). Unzip into the site root, as for earlier updates.

## The customer journey now

1. **Name and mobile.** The customer opens the Shivaa Black card (hero button, header, side menu or footer). They type their name and registered mobile. Guests then verify the mobile with the one-time code. Signed-in customers use their own number, which is read-only.
2. **The card is shown.** The personal card, with the 20% making-charge privilege for six calendar months, and the Family certificate.
3. **The Premium offer.** Under the card: *20% off making charges, for life*, with a "Get home delivery physical card" button. Premium is claimed when the button is pressed (once per account).
4. **The address page** (`#/black-card/delivery`). Name on the card, mobile, house and street, area, city, state and PIN. The physical card is delivered free. The address is saved once on the card; a second request is refused.

## Changes

- **Claim** (`POST black-card/claim`): name and mobile only. The address is no longer needed to create the card. The card is bound to the verified mobile as before.
- **New** `POST black-card/delivery`: validates the address, sets the free physical-card delivery, refuses a second request.
- **Premium** is now **20% off making charges, for life**. It is a virtual coupon (`SHV-P-…`), like the Black card. It is applied automatically at checkout and can be typed in. The account returns `premiumCode` only while Premium is active.
- **Premium no longer gives free delivery.** Only the physical card is delivered free. Premium customers' orders are charged delivery as everyone else's are. Premium copy on the home offer, the card and the claim message is updated to match.
- `api.php` rel 199. `sw.js` shell `shivaa-shell-v199`. `index.html` and `app.js` stamped 199.

## Tests

- `tools/mega/smoke/v199-check.js`: 11/11.
- `tools/mega/smoke/v195-php-run.js`: 17/17. D02 changed from "claim without address is refused" to "claim needs no address"; D02b, D15 (Premium code and 20% of making charges) and D16 (non-Premium cannot use the code) are new.
- `npm test`: all suites pass. `v179-relay.js` is timing-sensitive under the full chain: it failed once inside `npm test` and passed when run alone twice.

## Not verified here

No browser or phone was available. Please check on a phone: the name and mobile step, the OTP sheet pre-filled with the mobile, the card and Premium panel, the address page, and a checkout where the Premium code applies by itself.

## Decisions to confirm

- Premium's "for life" 20% has no expiry and no minimum order, as the owner described it.
- The mobile is verified by OTP before the card is created for guests. The name and mobile are not enough on their own, because the card is bound to the verified mobile.
- Premium no longer includes free home delivery for life (the owner chose this option).
