# Feature advice — what to build next (6 September 2026)

**Status: PROPOSALS ONLY.** Nothing here is implemented, live, or approved.
This is an audit of the current `cms/` code plus a suggested order of work.
It does not replace [`FEATURE-ROADMAP.md`](FEATURE-ROADMAP.md), whose standing
instruction still applies: one feature at a time, owner's exact spec first,
and never fabricate payment, courier, notification, legal, BIS, HUID, GSTIN,
certificate or analytics data.

---

## A. Blockers — the shop cannot really trade until these are done

### A1. Checkout does not take money (highest priority)
Evidence in the code today:
- `cms/js/app.js:1598` — the checkout screen literally says
  *"Demo checkout — no real payment is processed."*
- `cms/api.php:627` — any order that is not `COD` or `WhatsApp` is stamped
  `paymentStatus = 'Paid'` immediately, with no gateway, no transaction id and
  no verification. The UPI / card options at `app.js:1592` are labels only.

What a real implementation needs (Razorpay / Cashfree / PhonePe — owner picks
and supplies live keys; keys go in server env or `~/.shivaa-sync.json`-style
config, **never** in the repo):
1. `POST /api/payments/create` → create a gateway order for the server-computed
   amount. Never trust an amount sent by the browser.
2. Order is written as `paymentStatus = 'Pending'` and stock is **reserved**,
   not deducted.
3. `POST /api/payments/webhook` → verify the gateway signature server-side, then
   flip to `Paid`, deduct stock, award loyalty points.
4. `POST /api/payments/verify` for the browser return trip (still signature
   checked; the webhook stays the source of truth).
5. Refund path for cancellations, and a reconciliation view in admin.
6. Remove the demo banner only when the above is genuinely wired.

Until keys exist, the honest interim is: keep COD + WhatsApp, and label online
payment as *coming soon* rather than pretending it succeeded.

### A2. GST tax invoice
`settings.gstin` is empty and the invoice at `app.js:2740` is described in code
as *owner-only, watermarked*. A jewellery business collecting real money needs a
compliant tax invoice: sequential invoice number, seller GSTIN, buyer details,
HSN 7113, GST split (CGST+SGST intra-state vs IGST inter-state), place of supply,
making charges shown separately. This is a legal prerequisite for A1, not a nicety.
**Needs the real GSTIN from the owner — do not generate a placeholder.**

### A3. Order lifecycle after "Placed"
`api.php` has `GET /api/orders/{id}` but **no update route** — an order is frozen
at status `Placed` forever. Meanwhile `app.js:3814` promises customers *"the moment
your order ships we WhatsApp and email you the courier name and tracking number."*
Right now that promise is entirely manual.

Proposed: `PUT /api/admin/orders/{id}` (admin-only) that appends to the existing
`timeline` array — Placed → Packed → Shipped (courier + AWB + tracking URL) →
Delivered / Cancelled — plus a customer-facing tracking strip on `#/account`.
Courier-API integration (Shiprocket/Delhivery) can come later; even manual
status + AWB entry closes the gap honestly.

### A4. Order notifications
`sms.php` exists but only for login OTP. Nothing notifies a customer or the shop
when an order is placed. Minimum: order-confirmation email + WhatsApp/SMS to the
buyer, and an alert to the shop's number. This is the cheapest trust win available.

---

## B. Revenue / growth

### B1. SEO — the biggest untapped free traffic (recommended first non-blocker)
Findings: hash routing only (`#/shop`, `#/product/...`), **no `sitemap.xml`, no
`robots.txt`, zero `application/ld+json`** anywhere, and one static
`<title>`/`<meta description>` for all 342 products. Google cannot index a single
product page today.

Proposed:
- PHP-rendered pretty URLs (`/rings/PGS5001-rajkumari`) that serve real
  `<title>`, description, canonical and Open Graph tags, then hand over to the SPA.
- JSON-LD `Product` (price, availability, `aggregateRating` from the 767 real
  reviews) + `LocalBusiness` for the Nagaur store + `BreadcrumbList`.
- `sitemap.xml` generated from `data/db.json` on write, and `robots.txt`.
- Category landing copy for "22K gold ring Rajasthan" style queries.

This is self-contained, uses only real data, and compounds every month it runs.

### B2. Verified-buyer reviews with photos
`api.php` reviews POST accepts a review from **any logged-in user for any product**
with no purchase check. Add: only buyers of that SKU can review, a "Verified
purchase" badge, optional customer photo upload, and admin moderation. Higher
trust and it feeds the `aggregateRating` in B1.

### B3. Delivery estimate + insured-shipping clarity by pincode
Cart/PDP shows a flat `shippingFee` 250 / free above 50,000. A pincode box giving
"delivered by <date>, insured" reduces drop-off measurably on high-ticket carts.

### B4. Abandoned-cart and back-in-stock nudges
Carts are client-side only. Persisting a cart per logged-in user enables a single
polite WhatsApp/email nudge, plus "notify me" on out-of-stock SKUs.

### B5. Appointment / video-call booking
For ₹50k+ pieces, a "book a video call or store visit" slot booker converts far
better than a buy button. Small feature, big fit for jewellery.

---

## C. Operational integrity

### C1. Live rate freshness is a pricing risk
`rates.last` in the demo DB is stamped **2026-08-29** — eight days stale — and
`POST /api/rates/refresh` is gated behind `need_admin`, i.e. manual. Since every
price is `rate × weight`, a stale or failed feed silently mis-prices the whole
catalogue.
Proposed: server cron refresh, a `rateAsOf` stamp shown next to prices, and a
fail-safe — if the rate is older than N hours, show "rate being updated" and hold
checkout rather than selling at a wrong price. (Order-time `rateSnapshot` is
already implemented and correct — keep it.)

### C2. Single-file JSON database
`data/db.json` holds products, orders, users, tokens and 767 reviews. Concurrent
writes can lose an order. Options in increasing effort: file locking + atomic
write on every save, nightly off-server backup, eventually SQLite/MySQL. At the
very least, **automated daily backups before any real orders arrive.**

### C3. Deploy safety
The Hostinger cron pulls `main` every 5 minutes and auto-deploys `cms/`, with a
`php -l` gate and a one-generation backup. There is no staging step. Suggested:
a `settings.featureFlags` block so a new feature can ship dark and be switched on
after a live smoke test, and keep the `?v=` cache-bust discipline (currently v41).

### C4. Performance / mobile
`app.js` is 4,248 lines and `styles.css` 4,568 lines, loaded on every route
including the homepage. Route-level code splitting, lazy image loading and a PWA
manifest (add-to-home-screen, offline catalogue browsing) would help buyers on 4G.

---

## Suggested order

| # | Work | Why now |
| --- | --- | --- |
| 1 | A1 payments (+ A2 invoice) | Nothing else matters if the site cannot take money |
| 2 | A3 order status + A4 notifications | Delivers the promise already made on-screen |
| 3 | C1 rate cron + fail-safe | Protects against selling at the wrong price |
| 4 | B1 SEO | Largest free-traffic gain, uses only real data |
| 5 | B2 verified reviews | Cheap trust, feeds SEO ratings |
| 6 | C2/C3 backups + flags, then B3–B5, C4 | Hardening and conversion polish |

## What the owner must supply (never invent these)
- Payment gateway choice + live API keys and webhook secret.
- Real GSTIN and the registered invoice series.
- Courier partner (if API tracking is wanted) and its credentials.
- Sender identity for email/WhatsApp notifications (domain, DLT template ids,
  WhatsApp Business number approval).
- The exact original wording for roadmap Features 3–21, which is still not in
  this checkout.
