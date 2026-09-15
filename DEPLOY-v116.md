# Shivaa v120 — banner CTA and Quick View touch hotfix · PayU remains v116

This hotfix fixes the two reported storefront interactions on top of v116 without changing the COD, WhatsApp, UPI-proof, cart, or SPA route contracts.

## 1. Deploy the code

Upload these files to the existing `cms/` installation, preserving `data/`, `uploads/`, and the existing media library:

- `index.html`
- `js/app.js`
- `js/boost.js`
- `css/v115.css`
- `sw.js`

The PayU/API file is unchanged by this hotfix; keep the v116 `api.php` already deployed (or upload it together with the same release bundle).

The shell now uses v120 cache/query stamps. A registered service worker should update itself; if a device still shows the old shell, reload once after the in-app update prompt appears.

## 2. Confirm the performance change

- The first poster remains an image while the page becomes usable.
- Hero/carousel/section MP4 files are attached only after visibility/hover and use `preload="none"`.
- Hidden carousel films are paused and are not all downloaded at first paint.
- Non-critical custom footer pages load in the background.
- Live rates poll every 15 seconds while the exchange feed is live and every 60 seconds off-hours; prices still interpolate between server ticks.

## 3. Confirm the carousel and Quick View

On the home page:

1. Wait 5.5 seconds on desktop (12 seconds on touch/mobile) and confirm the poster advances, even while the pointer is resting over the banner.
2. Use the left/right arrows, dot buttons, keyboard arrows, and a horizontal swipe.
3. Resting the pointer over the deck does not pause autoplay; keyboard focus and an active drag pause it briefly, then autoplay resumes.
4. On `/shop`, **Quick view** is intentionally visible and clickable without requiring a hover. Confirm it opens without changing the hash, then test gallery, quantity, size, and Add to Bag.

## 4. Configure PayU — real credentials are required

The checked-in database intentionally contains no merchant credential. Do not put credentials in Git or in this document.

In **Admin → Payments**:

1. Set **Payment provider** to **PayU**.
2. Set **Site base URL** to the public shop origin, for example `https://www.shivaa.in` (no `/api` suffix). It must be reachable by PayU; production mode must use HTTPS.
3. Select `test` and paste the matching PayU test **Merchant Key** and **Merchant Salt**. Save.
4. Click **Test PayU credentials** and wait for the server-side probe to say the credentials were accepted.
5. In the PayU dashboard set both Success URL and Failure URL to:

   `https://YOUR_DOMAIN/api/pay/payu/return`

   The checkout sends the order-specific `?co=...` query automatically.

The API now rejects an attempt to save PayU with a missing key, salt, or public base URL instead of silently leaving a half-configured provider. The checkout also reports exactly what is missing and retains UPI QR/COD/WhatsApp fallbacks.

## 5. PayU verification behavior

The flow is:

1. `POST /api/pay/order` creates a unique PayU `txnid`, records the attempt, and returns a SHA-512 signed hosted-payment form.
2. The browser posts that form to `test.payu.in` or `secure.payu.in`.
3. PayU posts the browser to `/api/pay/payu/return`.
4. The server validates the configured merchant key and reverse hash, then calls PayU `verify_payment` server-to-server.
5. Only the exact verified `txnid` and matching amount can add an approved payment ledger entry and mark the order paid.
6. If verification is unavailable, the order stays pending; a browser redirect or browser-only status can never mark it paid. The customer can retry from the order page.

After a successful test transaction, inspect the order ledger for `gateway: payu`, the PayU attempt state, and the payment reference. Only then change the PayU environment to `prod` and replace both credentials with the matching live pair.

## 6. Validation notes

- JavaScript syntax, pointer/swipe checks, Quick View Add-to-Bag checks, and current jsdom smoke checks pass.
- The local sandbox does not have PHP or a live PayU account, so PHP linting and an actual hosted transaction must be completed on the PHP host with test credentials.
- Never use the browser's `?pu=success` value or a client payment promise as proof of payment; the server verification step is authoritative.
