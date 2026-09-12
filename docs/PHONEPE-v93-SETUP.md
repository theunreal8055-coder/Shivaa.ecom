# PhonePe Standard Checkout v2 — setup guide (v93)

Shivaa Jewellers accepts online payments through **PhonePe Standard Checkout v2**
(the current OAuth / O-Bearer API). This is the integration new merchants get in
the PhonePe Business dashboard today. It replaces the older salt-key /
X-VERIFY v1 flow entirely.

- Customers click **Pay now** → the PhonePe PayPage opens (UPI, cards, netbanking, wallets)
- Payments are confirmed server-to-server via the **Order Status API** and PhonePe's
  **HMAC webhooks** — the browser redirect is never trusted
- Until credentials are pasted, the shop keeps working in **demo mode** plus
  UPI-QR screenshot proof and COD / WhatsApp ordering exactly as before
- Razorpay fields remain in the admin if you ever want to switch providers

---

## 1. Get PhonePe access for the business

1. Log in to the **PhonePe for Business** dashboard (<https://business.phonepe.com>).
2. The default dashboard is the in-store QR / Soundbox product. Online payment
   gateway keys appear only after you **Create New Business** and complete KYC
   for the private limited company (PAN, GSTIN, business proof, bank account,
   authorised signatory). Reference number of the current application is kept
   in the owner's onboarding notes.
3. Once the PG application is approved, open **Developer Settings** in the dashboard.

## 2. API credentials (Developer Settings → API keys)

Create/expand the API keys section and copy:

| Dashboard label | Shivaa admin field |
|---|---|
| **Client ID** | Client ID |
| **Client Secret** (shown once) | Client Secret (paste & save; it is never displayed back) |
| **Client Version** (normally `1`) | Client Version |

The server exchanges these for an **O-Bearer access token**
(`client_credentials` grant), caches it until a few minutes before expiry, and
automatically re-mints it. A 401/403 triggers one forced refresh.

> Secret hygiene: the Client Secret and webhook secret are stored only in the
> server's private `data/db.json` on Hostinger, are write-only in the admin UI,
> and are stripped from every public settings response.

## 3. Set the environment switch

In **Admin → Payments → PhonePe Standard Checkout**:

- **UAT / sandbox (Test Mode ON)** while testing — uses `api-preprod.phonepe.com`
  and the staging PayPage (`mercury-stg.phonepe.com`)
- **Production (live money)** after go-live approval — uses `api.phonepe.com`
  and `mercury.phonepe.com`

Fill **Site URL** (e.g. `https://www.shivaajewellers.in`, https, no trailing
slash). The customer return URL is sent automatically with every payment as
`paymentFlow.merchantUrls.redirectUrl` and is shown in the admin card for reference:

- Return (browser): `https://<your-domain>/api/pay/phonepe/return`
- Webhook (server): `https://<your-domain>/api/pay/phonepe/callback`

Click **Test PhonePe credentials** — it forces an OAuth token request and shows
*Credentials accepted by PhonePe (uat/prod) — OAuth token issued*. A rejection
such as `invalid_client` almost always means the Client ID / Version / Secret
triple doesn't match (re-copy the secret; note Test Mode must be ON for UAT keys).

## 4. Create the webhook (Developer Settings → Webhook)

1. Choose **Create Webhook → HMAC** (recommended). PhonePe shows a
   **Checksum Secret Key** and a Webhook ID; paste the checksum secret into
   **Webhook Checksum Secret** in the admin.
   - (Alternative "SHA" mode is also supported: put the webhook username and
     password in the `ppWebhookUser` / `ppWebhookPass` settings; the server
     checks `Authorization: SHA256(username:password)`.)
2. URL: `https://<your-domain>/api/pay/phonepe/callback`
3. Subscribe to these four events:
   - `checkout.order.completed`
   - `checkout.order.failed`
   - `pg.refund.completed`
   - `pg.refund.failed`
4. Save. PhonePe signs the **raw JSON body** with HMAC-SHA256; the server
   verifies the `x-phonepe-checksum-signature` header (hex or base64) with a
   timing-safe comparison and rejects anything that doesn't match with HTTP 401.
5. The endpoint answers 2xx quickly, is fully idempotent, and always
   cross-checks order events with the Order Status API. Missed webhooks are
   covered by the customer-facing status poller (and refunds are additionally
   tracked via the Refund Status API, per PhonePe's mandate).

## 5. Test in UAT

PhonePe's UAT uses a simulator (Android app `com.phonepe.simulator`; iOS via
the Firebase invite from the integration team). On a phone with the real
PhonePe app, scanning the UPI QR returns a **Success / Failure / Pending**
choice; cards/netbanking show the same choice page.

Sample test cards (OTP `123456`):

- Credit: `4208 5851 9011 6667`, exp `06/2027`, CVV `508`
- Debit:  `4242 4242 4242 4242`, exp `12/2027`, CVV `936`

Suggested matrix:

1. UPI QR → **Success** → order flips to Paid / Partially paid, ledger line
   "PhonePe · UPI_QR", idempotent on refresh/webhook replay.
2. UPI QR → **Failure** → order stays payable; "Pay now" retries with a fresh
   attempt id (`…-A2`).
3. UPI QR → **Pending** → banner "PhonePe is confirming your payment"; the
   page polls `pay/phonepe/status` (first check ~20s, then back-off schedule);
   success later still credits exactly once.
4. Close the PayPage / press back → no charge, order remains open.
5. Admin → order → **Refund** (full and partial): response state is PENDING;
   the order shows the refund only as settled when `pg.refund.completed` (or
   Refund Status API) reports **COMPLETED**. Starting a second refund while one
   is PENDING/CONFIRMED is blocked; a FAILED refund is retried with a brand-new
   refund id.
6. Tamper a webhook body (or send no signature) → HTTP 401, ledger untouched.
7. A cancelled order can never be charged: PhonePe init is refused server-side.

## 6. Go live

1. Ask PhonePe integration for production activation (UAT sign-off checklist:
   token caching, redirect URL handling, order-id mapping, status
   reconciliation schedule, webhook event handling + 2xx, refund tracking via
   both channels).
2. In the webhook tab create the **production HMAC webhook** pointing at the
   same `/api/pay/phonepe/callback` path and paste the new checksum secret.
3. Admin → Payments → switch Environment to **Production**, re-test credentials.
4. Place one small real order (UPI), verify Paid state and the ledger entry,
   then refund it and wait for COMPLETED.
5. Live keys require a public https Site URL; the shop refuses to start a live
   payment without one.

## 7. How the integration is built (for reference / audits)

- `POST {auth}/v1/oauth/token` — form-urlencoded `client_id`, `client_version`,
  `client_secret`, `grant_type=client_credentials`; header
  `Authorization: O-Bearer <access_token>` on every PG call
- `POST {pg}/checkout/v2/pay` — `merchantOrderId` (shop order id + attempt
  suffix, charset `[A-Za-z0-9_-]`), `amount` in integer paise,
  `expireAfter`, `paymentFlow.type = PG_CHECKOUT` with the `redirectUrl`,
  optional prefill phone; response provides the mercury `redirectUrl`
- Client opens it with PhonePe's `checkout.js`
  (`PhonePeCheckout.transact({ tokenUrl })`) and falls back to full-page
  navigation if the bundle cannot load
- `GET {pg}/checkout/v2/order/{merchantOrderId}/status` — only the root
  `state` COMPLETED/FAILED is trusted; `paymentDetails[]` supplies the
  transaction id and instrument; the paid amount must equal the stored attempt
- `POST {pg}/payments/v2/refund` — `{ merchantRefundId, originalMerchantOrderId,
  amount }`, then `GET /payments/v2/refund/{merchantRefundId}/status`;
  states PENDING / CONFIRMED / COMPLETED / FAILED
- Webhook body `{ event, payload }` — `event` is authoritative (the deprecated
  `type` field is ignored), `payload.state` drives reconciliation, epochs are ms

### Built-in protections (carried forward and extended)

- Server-side verification only; hash_equals / timing-safe compares
- Gateway order must match a locally created attempt, and its amount must match
- Idempotent credit keyed by PhonePe transaction id (webhook retries are safe)
- Cancelled orders can never be initialised or credited
- Rate limits on pay-order / pay-proof / status endpoints
- 20-minute server rate lock keeps displayed price == billed price (±2% band)
- Part-payment ledger, prepaid discount, COD handling fee, UPI-QR proof and
  manual approval flows unchanged
- Secrets never returned by public settings GET; tokens cached in the
  deny-all `data/` directory with 0600 perms
