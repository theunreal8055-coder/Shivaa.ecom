# v128 — Cashfree is now the ONLY payment gateway

**Fresh start:** every previous gateway has been removed from the codebase —
PayU (was the live gateway since v94), PhonePe v2 and Razorpay (dormant code),
including their server functions, API routes, admin settings, checkout UI,
refund flows and credential validation. On the next settings save, any legacy
gateway keys still stored in `data/db.json` (`payuKey`, `payuSalt`, `ppClientId`,
`rzpKeyId`, …) are wiped automatically.

The shop now runs **Cashfree Hosted Web Checkout** (PG API `2023-08-01`),
which accepts 120+ payment methods (UPI, cards, net-banking, wallets, EMI)
on Cashfree's PCI-compliant hosted page.

## How the flow works

```
Customer taps "Pay now"
   │
   ├─ 1. Browser → POST /api/pay/order
   │      Server → POST https://(sandbox|api).cashfree.com/pg/orders
   │      (x-client-id + x-client-secret + x-api-version: 2023-08-01)
   │      → receives order_id + payment_session_id
   │
   ├─ 2. Browser loads https://sdk.cashfree.com/js/v3/cashfree.js
   │      Cashfree({ mode }).checkout({ paymentSessionId, redirectTarget: "_self" })
   │      → customer pays on Cashfree's hosted page
   │
   └─ 3. Confirmation (three independent lanes, all server-verified):
          · return_url  → GET  /api/pay/cashfree/return?co=<order>
          · webhook     → POST /api/pay/cashfree/webhook   (HMAC-signed)
          · page poller → POST /api/pay/cashfree/status
          All three only TRIGGER a reconcile: the order is marked Paid only
          after GET /pg/orders/{order_id} reports order_status = PAID and the
          amount matches. The redirect/webhook is never trusted on its own.
```

## What was added / changed

### Backend — `cms/api.php`
- `cashfree_cfg / cashfree_ready / cashfree_active_provider` — settings
  (`cfAppId`, `cfSecretKey`, `cfEnv`), provider is `demo` or `cashfree`.
- `cashfree_call / cashfree_create_order / cashfree_fetch_order` — signed PG
  API client (sandbox: `sandbox.cashfree.com`, production: `api.cashfree.com`).
- `cashfree_apply / cashfree_apply_refund` — idempotent ledger reconcile
  (amount must match; duplicate payment ids are ignored).
- `cashfree_webhook_verified` — `base64(HMAC-SHA256(timestamp . rawBody, secret))`
  with a 10-minute replay window.
- Routes:
  - `GET  /api/pay/config` → reports `mode: cashfree|demo`
  - `POST /api/pay/order` → creates the Cashfree order (return_url + notify_url included)
  - `GET  /api/pay/cashfree/return` → reconcile + 302 into the SPA (`?cf=success|fail|pending`)
  - `POST /api/pay/cashfree/webhook` → signature-verified reconcile
  - `POST /api/pay/cashfree/status` → customer-page poller (+ refund status)
  - `POST /api/admin/pay-test` → credential probe against Cashfree
  - `POST /api/admin/refund` → `POST /pg/orders/{id}/refunds` (full/partial)
- `pay/verify` now only completes the local-build simulated gateway; real
  payments always go through Cashfree.
- Settings validation accepts only `demo|cashfree`; legacy gateway settings
  are deleted on save.

### Frontend
- `cms/js/app.js` — Cashfree SDK launcher (`Shivaa.cashfreeCheckout`), handoff
  sheet with retry/cancel, checkout wording, order-page banners + poller.
- `cms/js/admin.js` — Payments card: Cashfree App ID / Secret Key / environment,
  "Test Cashfree credentials", return + webhook URL display, Cashfree refunds.
- `cms/js/bot.js`, `cms/css/v118.css`, `tools/mega/smoke/v118-check.js` updated.
- **Deleted:** `cms/payu.gateway.fixed.php`, `cms/PAYU_BUGFIX_REPORT.md`.

## Go-live checklist (owner)

1. Cashfree Merchant Dashboard → **API Keys** → copy the **App ID** and
   **Secret Key** (sandbox first, then production).
2. Dashboard → **whitelist the website domain** (`www.shivaa.in`).
3. Admin → Settings → **Payments & gateway**:
   - Provider: **Cashfree**
   - Site base URL: `https://www.shivaa.in` (https required for production)
   - Paste App ID + Secret Key, choose Sandbox/Production, **Save payments**
   - Press **Test Cashfree credentials** (✅ expected).
4. Dashboard → **Webhooks**: set the webhook URL shown in the admin card to
   `https://www.shivaa.in/api/pay/cashfree/webhook` (signature is verified
   automatically with your secret key).
5. Place a sandbox test order end-to-end, then flip `cfEnv` to **production**
   with the live keys and test again.

Refunds: Orders → ↩️ on a Cashfree-paid order. Cashfree settles refunds
asynchronously; the order flips to *Refunded* once Cashfree reports SUCCESS
(the customer order-page poller and webhook advance the status).

## Verified against the official Cashfree documentation

Every piece of this integration was checked against Cashfree's own docs on
2026-09-17 (index: https://www.cashfree.com/docs/llms.txt):

| Doc page | What it confirmed for this build |
|----------|-----------------------------------|
| Payments Overview | Hosted Web Checkout is the correct integration method for a PHP site (vs. Elements/mobile SDKs/plugins) |
| Quickstart Guide | Sandbox = `sandbox.cashfree.com` + `TEST_…` keys; Production = `api.cashfree.com` + `PROD_…` keys; KYC required for live. **The admin "Test" button flags TEST_/PROD_ key-vs-environment mismatches.** |
| Hosted Web Checkout (web integration) | 3-step flow: server creates order → JS SDK `cashfree.checkout({paymentSessionId})` → confirm via Get Order; `return_url` recommended + webhook recommended (both implemented) |
| Create Order API | Request shape used: `order_id`, `order_amount`, `order_currency`, `customer_details`, `order_meta.return_url` (incl. the documented `{order_id}` placeholder), `order_meta.notify_url`, `order_note`, `order_tags.checkout_context` |
| Get Order API | `order_status = PAID` is the success condition; verified server-to-server before crediting |
| Webhooks — Overview / Configuration / Signature | Registered per environment, version 2023-08-01, events Success/Failed/Dropped Payment + Refund; signature = `base64(HMAC-SHA256(timestamp + rawBody, secret))` — exactly what `cashfree_webhook_verified()` checks |
| Refunds API | `POST /pg/orders/{id}/refunds` with `refund_id` (3–40 chars) + `refund_amount` + `refund_note`; status via `GET /pg/orders/{id}/refunds/{refund_id}` |
| Domain whitelisting | https-only, needs Contact/Terms/Refund pages + INR pricing, ~24 h review — captured in the setup guide Part B |
| Data to Test Integration | Sandbox test cards (OTP `111000`), test UPI VPAs (`testsuccess@gocash` etc.) — captured in the setup guide Part D |

## Mapping: the recommended integration plan ↔ this implementation

| Recommended step | Where it lives |
|---|---|
| 1. Audit existing checkout | Done — existing `pay/config · pay/order · pay/verify` architecture kept, no second checkout system |
| 2. Add Cashfree configuration | `settings.cfAppId / cfSecretKey / cfEnv` + admin Payments card |
| 3. Cashfree order creation in PHP | `cashfree_create_order()` inside `POST /api/pay/order` — **amount computed from the stored order balance, never from the browser** |
| 4. Cashfree JS checkout | `Shivaa.cashfreeCheckout()` in `cms/js/app.js` (official v3 SDK, `redirectTarget: '_self'`) |
| 5. Return URL | `/api/pay/cashfree/return?co=…&order_id={order_id}` |
| 6. Server-side verification | `cashfree_fetch_order()` + `cashfree_apply()` (PAID + amount match) |
| 7. Webhook | `/api/pay/cashfree/webhook` with HMAC verification + replay guard |
| 8. Connect to existing order | `order_add_payment()` ledger → `paymentStatus = Paid` |
| 9. Prevent duplicates | Rate limit on `pay/order`, idempotent crediting on Cashfree order id, fresh `-A<n>` id per retry |
| 10. Test sandbox | Setup guide Part D (11-scenario matrix + official test cards/UPI VPAs) |
| 11. Switch to production | Setup guide Part F (PROD_ keys, production webhook, whitelisting) |
| 12. Small real transaction | Setup guide Part F step 5 (pay + refund drill) |

**Operator guide:** [`cms/docs/CASHFREE-SETUP-GUIDE.md`](cms/docs/CASHFREE-SETUP-GUIDE.md) —
account, keys, whitelisting, admin wiring, webhook setup, sandbox test matrix,
go-live checklist, and every official doc link.

