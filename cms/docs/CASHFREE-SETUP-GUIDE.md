# Cashfree Setup Guide — Shivaa Jewellers (v128)

Cashfree is the **only** payment gateway on this website (PayU / PhonePe /
Razorpay were fully removed in v128). This guide walks through everything
needed to take real payments — from account creation to the first live order.
All steps verified against the official Cashfree docs (links at the bottom).

---

## Part A — Cashfree account (one-time, ~1 day including approval)

1. **Create the merchant account** — [merchant.cashfree.com](https://merchant.cashfree.com).
   KYC is **mandatory for live payments** (PAN, business proof, bank account).
   Sandbox access is instant and needs no KYC.
2. **Two environments, two key pairs.** In the Merchant Dashboard, top-right
   corner: **Switch to Test** (yellow banner) / **Switch to Prod**.

   |                | Sandbox (test)                    | Production                       |
   |----------------|-----------------------------------|----------------------------------|
   | API host       | `sandbox.cashfree.com`            | `api.cashfree.com`               |
   | App ID starts  | `TEST_`                           | `PROD_`                          |
   | Money moves?   | No — simulated only               | Yes — real settlements           |
   | KYC            | Not required                      | Required                         |

3. **Generate keys** — Dashboard → **API Keys** → create. Copy the
   **App ID** (a.k.a. Client ID) and **Secret Key** (a.k.a. Client Secret).
   ⚠️ The Secret Key is shown only once — save it in a password manager.
   **Never put the Secret Key into any website/JS file or chat.** It lives
   only in this website's admin Settings (it is stored server-side, never
   shown back, and never sent to the storefront — the public settings API
   strips it automatically).

## Part B — Domain whitelisting (required before live checkout opens)

Dashboard → **Payment Gateway → Developers → Whitelisting → Add New**
→ type **Website URL** → enter `https://www.shivaa.in`.

Rules enforced by Cashfree:
- Only `https://` URLs are accepted (no http, no custom ports).
- The website must already show **Contact Us**, **Terms & Conditions** and
  **Refunds & Cancellations** pages, listed products, and INR pricing —
  Shivaa already has all of these.
- Review normally completes **within 24 hours** (track it on the same page).

## Part C — Connect in the Shivaa admin

Admin panel → **Settings → Payments & gateway**:

1. **Payment provider** → `Cashfree (UPI · cards · net-banking · wallets · 120+ methods)`
2. **Site base URL** → `https://www.shivaa.in` (must be https for production)
3. **App ID** → paste the App ID. **Secret Key** → paste the secret.
4. **Environment** → `Sandbox` first (see Part D), later `Production`.
5. **Save payments** → press **Test Cashfree credentials**.
   - ✅ *Credentials accepted* → keys are good.
   - ❌ *looks like a TEST_ key but environment is production* (or vice
     versa) → you pasted the wrong key pair for the selected environment.
   - ❌ *HTTP 401/403* → re-copy the keys exactly (no spaces).

The card also prints the two URLs you configure on the Cashfree side:
- **Return URL** `https://www.shivaa.in/api/pay/cashfree/return` — sent
  automatically with every order; nothing to do.
- **Webhook URL** `https://www.shivaa.in/api/pay/cashfree/webhook` — see Part E.

## Part D — Sandbox testing (do ALL of these before going live)

Use the official Cashfree test data in sandbox:

**Test cards** (any name; expiry `03/2028`, CVV `123`, **OTP `111000`**):
- Visa credit `4444333322221111` · Visa debit `4706131211212123`
- Mastercard credit `5105105105105100` · RuPay debit `6074825972083818`

**Test UPI VPAs** (enter as the UPI ID on the Cashfree page):
- `testsuccess@gocash` — payment succeeds
- `testfailure@gocash` — payment fails
- `testinvalid@gocash`, `testdeclineuser@gocash`, `testinsufficientfunds@gocash`, …
  (full list: [Data to Test Integration](https://www.cashfree.com/docs/api-reference/payments/data-to-test-integration))

**Net-banking:** TEST Bank (code `3333`).

### Sandbox test matrix

| # | Scenario | How | Expected |
|---|----------|-----|----------|
| 1 | Successful payment | test card / `testsuccess@gocash` | Order page shows *Payment received*, ledger line `Cashfree`, status **Paid** |
| 2 | Failed payment | `testfailure@gocash` | Banner *Payment was not completed*, order stays **Awaiting payment**, retry works |
| 3 | Cancelled / dropped | close Cashfree page mid-way | Order stays payable; webhook marks nothing; poller shows pending |
| 4 | Pending then success | pay after returning to the order page via *Pay now* | New Cashfree order id (`-A2`) created, pays fine |
| 5 | Duplicate / retry | press Pay twice quickly, or pay same order again after Paid | Rate limit blocks floods; an already-PAID order cannot be double-credited (idempotent on order id + amount check) |
| 6 | Page refresh after paying | refresh the order page | Banner/poller re-confirms from Cashfree, still Paid |
| 7 | Customer closes browser after paying | pay, close tab | **Webhook** still marks the order Paid (check Orders in admin) |
| 8 | Amount tampering | edit amounts in browser dev-tools and hit pay | Server always charges the **stored order balance** — browser amounts are ignored |
| 9 | Cancelled order | try paying a cancelled order | Rejected with a clear message |
| 10 | Refund (admin) | Orders → ↩️ on a paid sandbox order | Cashfree accepts; status flips once Cashfree reports SUCCESS (in sandbox pass `refund_note` = SUCCESS/FAILED/PENDING via support if you want to force states) |
| 11 | Wrong-key guard | paste PROD keys with Sandbox selected | Test button flags the mismatch before any payment |

## Part E — Webhook (do this in BOTH sandbox and production)

The webhook is what protects you when a customer pays but never comes back to
the site (closed tab, lost network). The website verifies every webhook's
HMAC signature before acting on it.

Dashboard → **Payment Gateway → Developers → Webhooks → Add Webhook Endpoint**:
1. URL: `https://www.shivaa.in/api/pay/cashfree/webhook`
   (http allowed in sandbox only; production requires https).
2. Webhook version: **2023-08-01** (matches the API version this site uses).
3. Press **Test** — Cashfree pings the URL; expect a success tick.
4. Events to enable: **Success Payment**, **Failed Payment**,
   **User Dropped Payment**, **Refund**.
5. Use **Logs** on the same page to inspect any delivery issues.

## Part F — Go live (production)

1. KYC approved + domain `https://www.shivaa.in` whitelisted (Part B).
2. Dashboard switched to **Prod** → copy the **PROD_** App ID + Secret Key.
3. Admin → Payments: paste production keys, environment **Production**,
   Save → **Test Cashfree credentials** ✅.
4. Repeat Part E for the **production** dashboard (webhooks are configured
   per environment).
5. Place **one small real order** with your own card/UPI, confirm it appears
   in the Cashfree dashboard and settles, then refund it through
   Orders → ↩️ to exercise the refund path end-to-end.
6. Cashfree publishes a final [go-live checklist](https://www.cashfree.com/docs/payments/online/go-live/checklist) — worth one last skim.

---

## Security model (what the code guarantees)

- **Secret key never leaves the server.** Order creation, verification,
  refunds and webhook checks all happen in `cms/api.php`. The browser only
  ever sees the `payment_session_id` (which is single-use and order-bound).
- **Amounts are server-owned.** The Cashfree order is created for the
  outstanding balance stored in `data/db.json` — never for a number coming
  from the browser.
- **Nothing is trusted blindly.** The order flips to *Paid* only after
  `GET /pg/orders/{order_id}` answers `order_status = PAID` **and** the
  amount equals the attempt amount. Redirects and webhook payloads only
  trigger that check.
- **Webhook signatures verified** as `base64(HMAC-SHA256(timestamp + rawBody, secret))`
  with a 10-minute replay window; unsigned/forged calls get a 401.
- **Idempotent crediting** — a replayed webhook/redirect/poll can never add
  a second payment line for the same Cashfree order.

## Official documentation (all pages referenced)

| Topic | Link |
|-------|------|
| Payments overview / integration options | https://www.cashfree.com/docs/payments/overview |
| Quickstart (account → keys → go-live) | https://www.cashfree.com/docs/payments/quickstart-guide |
| Hosted Web Checkout (the flow this site uses) | https://www.cashfree.com/docs/payments/online/web/redirect |
| Create Order API | https://www.cashfree.com/docs/api-reference/payments/latest/orders/create |
| Get Order / order status API | https://www.cashfree.com/docs/api-reference/payments/latest/orders/get |
| Refunds API | https://www.cashfree.com/docs/api-reference/payments/latest/refunds/create |
| Webhooks overview | https://www.cashfree.com/docs/payments/online/webhooks/overview |
| Webhook configuration | https://www.cashfree.com/docs/payments/online/webhooks/configure |
| Webhook signature verification | https://www.cashfree.com/docs/payments/online/webhooks/signature-verification |
| Domain whitelisting | https://www.cashfree.com/docs/payments/online/go-live/whitelist |
| Go-live checklist | https://www.cashfree.com/docs/payments/online/go-live/checklist |
| Sandbox test data (cards / UPI / OTPs) | https://www.cashfree.com/docs/api-reference/payments/data-to-test-integration |
| Full docs index | https://www.cashfree.com/docs/llms.txt |
