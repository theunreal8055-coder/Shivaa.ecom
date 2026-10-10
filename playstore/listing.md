# Shivaa Jewels — Google Play listing copy

Everything below is ready to paste into Play Console. Nothing here is invented:
every claim is a phrase the site already uses, and every factual answer is
derived from the code in `cms/` (the last column says where to check it).

**App name (30 characters max, cannot be changed after publish):**
`Shivaa Jewels` — 13 characters. ✔

**Package name (permanent — the one decision you can never undo):**
`in.shivaa.jewels`

> If you would rather have `com.shivaa.jewels` or `in.shivaa.app`, change it NOW
> — in `playstore/twa-manifest.json` AND `playstore/assetlinks.json` AND
> `cms/.well-known/assetlinks.json` (all three must match), before the keystore
> is created. Once the app is published the package name is frozen forever.

**Default language:** English (en-IN) — add Hindi (hi-IN) later if you want.

---

## Store listing

**Short description (80 characters max):**

```
Fine gold & silver jewellery at Shivaa's live rates. Honest making charges.
```

79 characters. ✔

**Full description (4000 characters max):**

```
Shivaa Jewels — jewellery priced the way it should be: at the live metal rate, with every gram, every making charge and every stone shown in plain sight.

FROM THE COUNTER AT JAYAL, NAGAUR
Our family has kept the same tanch for over thirty years. Shivaa is that counter, on your phone — the same weights, the same hallmarking, the same prices, now from anywhere in India.

WHAT THE APP DOES

· Live gold and silver rates, updated through the day
· Shop rings, necklaces, earrings, bangles, mangalsutra and silver
· Every product page breaks the price down: metal value, making charges, stones, GST — no bundled mystery total
· Ring size guide with true-scale Indian sizes 8 to 26
· BIS hallmarking explained, and the HUID verification walkthrough
· Direct checkout — UPI, card, netbanking or cash on delivery
· Order tracking from placed to delivered, with your invoice and digital purity certificate
· Save a wishlist, manage delivery addresses, and collect Royalty points on every order
· The Bhai Dooj Gold Finale — 10 g of certified 24K gold

HOW PRICING WORKS
Gold and silver prices move all day, so Shivaa never freezes a rate silently. The app shows the live rate, the premium we add for Jaipur workmanship, and locks your price at checkout for a short window so what you see is what you pay. If the market moves sharply, we tell you before you pay.

HONESTY IS THE PRODUCT
· Weights come from the supplier tag or the weighing scale, and the app says which
· Purity is stated, not implied — and the hallmarking process is explained in full
· Making charges are a line item, never a percentage hidden in the total
· If something is an estimate, the app labels it an estimate

DELIVERY AND CARE
Insured delivery across India. Every order ships with an invoice, a purity certificate and a hallmarking record you can verify yourself.

SUPPORT
Jayal, Nagaur, Rajasthan · +91 89050 05921 · Support@shivaa.in
Open every day, 10:00 to 20:30.

Ernate Shine Jewellery Pvt. Ltd. · shivaa.in
```

(~1,950 characters — well inside the cap.)

---

## Graphics

| Asset | File | Size |
|---|---|---|
| App icon | `playstore/graphics/out/icon-512.png` | 512x512 |
| Feature graphic | `playstore/graphics/out/feature-graphic-1024x500.png` | 1024x500 |
| Phone screenshots | `playstore/graphics/out/screenshots/*.png` | 1080x1920 (2 to 8 needed) |

Regenerate any of them with `python3 playstore/graphics/make-graphics.py`.
The icon and the feature graphic are built from the repository's own art, so
they can never drift from the brand.

---

## App content — the declarations Play will ask for

| Section | Answer | Where to verify |
|---|---|---|
| Privacy policy URL | `https://shivaa.in/#/privacy` | `pages.privacy` in `cms/js/app.js`; PDF edition at `https://shivaa.in/docs/shivaa-privacy-policy.pdf` |
| Account deletion URL | `https://shivaa.in/#/delete-account` | v183 route `POST /api/auth/delete-account` + the page in `cms/js/app.js` |
| App access | "All functionality is available without special access" — the store needs no login; only *My Account* (orders, addresses, wishlist) sits behind an OTP | public catalogue routes in `cms/api.php`; `auth/me` |
| Ads | "No, my app does not contain ads" | no ad SDK in `cms/index.html` or `cms/js/` |
| Content rating (IARC) | Shopping / e-commerce. Violence, sex, drugs, gambling: none. **User-generated content: YES — customers post product reviews** | `POST /api/reviews` in `cms/api.php` |
| Target audience | 18+ (a jewellery purchase is an adult transaction; the site's own policy says the service is for adults) | `pages.privacy` section 9 |
| Data safety — collected | Name, email, phone, delivery addresses, order history, app interactions | `pages.privacy` section 2 table |
| Data safety — shared | Nothing sold or shared for advertising. Processors only: hosting, logistics, payment gateway, SMS | `pages.privacy` section 8 |
| Data safety — encrypted in transit | Yes (HTTPS/TLS only) | HSTS in `cms/.htaccess` |
| Data safety — deletion | Yes — in-app erasure, same URL as above | v183 route |
| Government app | No | — |
| Financial features | No — a shop that uses a payment gateway; no lending, banking or investing product | Cashfree hosted checkout only |
| Health | No | — |

### Two things the listing will ask that the code does not yet answer

1. **UGC moderation.** Customers post product reviews, so Play expects a way to
   *report* objectionable content and evidence that it is moderated. A review
   can be hidden from the admin side today, but there is **no in-app "report
   this review" button**. Either build one (small) or keep reviews off the app's
   public surfaces until it exists. Do not answer "no UGC" — the code says
   otherwise.
2. **Reviewer access.** Play's reviewer will open the app and try to shop. Guest
   checkout is on (`settings.guestCheckout`), so they can reach checkout without
   an account. Leave it on.

---

## Release notes (version 1.0.0)

```
Shivaa Jewels, now as an app.

· Live gold and silver rates, all day
· Every price broken down — metal, making charges, stones, GST
· Ring size guide, hallmarking and HUID walkthrough
· Direct checkout with UPI, card, netbanking or cash on delivery
· Order tracking, invoices and digital purity certificates
· Your wishlist, addresses and Royalty points

Same counter, same weights, same honesty — from Jayal, Nagaur to your phone.
```

---

## Version numbers

`appVersionCode` is an integer that must go **up** with every upload — Play
refuses a repeat. `appVersion` is what the shopper sees.

| Upload | appVersionCode | appVersion |
|---|---|---|
| First release | 1 | 1.0.0 |
| Every later upload | +1 | 1.0.1, 1.1.0, ... |

Edit both in `playstore/twa-manifest.json` before each `bubblewrap build`.
