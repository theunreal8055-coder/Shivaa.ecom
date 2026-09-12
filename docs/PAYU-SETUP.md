# PayU payment gateway — setup guide (v94)

Shivaa Jewellers accepts online payments through **PayU (PayU India hosted
checkout)**. The customer is sent to PayU's secure payment page (UPI, cards,
net-banking, wallets), PayU returns them to the shop, and every result is
**re-verified server-to-server** (`verify_payment`) before the order is
credited.

The previous gateway options (PhonePe and Razorpay) have been removed from the
website's admin and checkout in this update — see "Removing PhonePe / Razorpay"
at the bottom.

- Until PayU Merchant Key + Salt are pasted, the shop keeps working in **demo
  mode** plus **UPI-QR screenshot proof** and **COD / WhatsApp** ordering.
- Online flow: checkout → signed POST to `test.payu.in` / `secure.payu.in` →
  PayU page → return to `/api/pay/payu/return` → server verification → order
  page with success / failure / pending banner and automatic polling.

---

## 1. Get PayU access

1. Register/complete KYC at the PayU Business onboarding portal
   (<https://onboarding.payu.in> / <https://business.payu.in>): business PAN,
   GSTIN, current account, authorised signatory for the Pvt Ltd.
2. After approval open the dashboard; under **Integration / Developer** you get
   two environments:
   - **Test (sandbox)** — Merchant Key + Salt for `test.payu.in`
   - **Production (live)** — Merchant Key + Salt for `secure.payu.in`
3. The Salt is shown once — store it in a password manager.

## 2. Admin → Payments

1. Open the shop admin → **Payments & gateway**.
2. Payment provider: **PayU (UPI · cards · net-banking · wallets)**.
3. Fill **Site base URL** = your public https address, e.g.
   `https://www.shivaa.in` (no trailing slash).
4. Paste **Merchant Key** and **Merchant Salt**, choose **Environment**:
   - **Test mode** while testing,
   - **Production** after PayU activates live settlements.
5. Click **Test PayU credentials** — expected message:
   *"Credentials accepted by PayU (test/prod) — merchant key recognised."*
   A rejection ("Invalid key" / "Invalid hash") means the key/salt/environment
   combination doesn't match (test key only works with Test mode, live key only
   with Production).
6. Set the prepaid discount % and COD fee as before; Save.

> The Salt is write-only: it is never displayed back, never sent to browsers
> (public settings responses strip it), and leaving the box blank on save keeps
> the previously stored salt.

## 3. Success / Failure URLs (surl / furl)

Set these in the PayU dashboard's integration/web-redirect settings (the shop
also sends them with every payment automatically, so even if the dashboard
fields are blank the redirect works):

- **Success URL (surl):** `https://<your-domain>/api/pay/payu/return`
- **Failure URL (furl):** `https://<your-domain>/api/pay/payu/return`

The same endpoint handles both; it verifies PayU's reverse SHA-512 hash **and**
calls `verify_payment` server-to-server, so a tampered or replayed redirect can
never mark an order paid. The order page then polls verification for pending
cases.

## 4. Test in sandbox

1. Environment = **Test mode**, provider = PayU, Save.
2. Place an order and choose **Pay online**. You should be redirected to the
   PayU test page with the amount prefilled.
3. Test cards (use the current numbers from the PayU integration kit if these
   have rotated; use any future expiry and the OTP shown on the test page):
   - Success card: `5123 4567 8901 2346`, CVV any 3 digits, future expiry
   - Failure card: `5123 4567 8901 2347`
   - Net-banking/UPI options on the test page return explicit success/failure.
4. Matrix to run:
   - Success → order flips to Paid / Partially paid; ledger line "PayU · <mode>".
   - Failure → back on the order page with a red banner; "Pay now" retries with
     a fresh transaction id (`…-A2`).
   - Pending/cancelled → pending banner; the page polls `verify_payment` and
     flips automatically if PayU later confirms success (credited exactly once,
     keyed on PayU's mihpayid).
   - Partial payment (balance due) → new attempt charges only the balance.
   - Cancelled order → payment start is refused server-side.
   - Admin → Orders → ↩️ on a PayU order: full/partial refund; the order shows
     Refunded only after PayU reports the refund completed (a second refund is
     blocked while one is still processing).

## 5. Go live

1. Ask PayU for production activation and complete their go-live checklist.
2. Paste the **production** Merchant Key + Salt, switch Environment to
   **Production**, click **Test PayU credentials**.
3. Place one small real UPI order, confirm Paid + ledger entry, then refund it
   and wait for the refund to complete (check_action_status polling updates it;
   refunds also appear in the PayU dashboard).
4. Live mode requires a public https Site URL (the server refuses to start a
   live payment without it).

## 6. How it is built (audits)

- Request form: fields `key, txnid, amount` (₹, two decimals — not paise),
  `productinfo, firstname, email, phone, surl, furl, udf1…udf10`, and
  `hash = sha512(key|txnid|amount|productinfo|firstname|email|udf1|…|udf10|salt)`.
- The browser auto-POSTs this form to
  `https://test.payu.in/_payment` / `https://secure.payu.in/_payment`.
- Return verification:
  `sha512(salt|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key)`
  compared with `hash_equals` (timing-safe); `additionalCharges` handled.
- Server API (`postservice.php?form=2`, form-urlencoded):
  - `verify_payment` — hash `sha512(key|command|var1|salt)`, reads
    `transaction_details.<txnid>.status` and `net_amount_debit`; amount must
    match the local attempt.
  - `cancel_refund_transaction` — hash
    `sha512(key|command|var1|var2|var3|salt)` (mihpayid, token, amount).
  - `check_action_status` — refund completion polling.
- Per-attempt ids: `<orderId>-A1`, `-A2`, … (PayU txnid charset, ≤30 chars);
  refunds tracked by our key `-RF1`, `-RF2`, …
- Guard rails carried forward: server-only verification, hash/timing-safe
  checks, gateway order must belong to the local order, amount match,
  idempotent credit on mihpayid/txnid, cancelled-order block, rate limits on
  pay-order/pay-proof/status, 20-minute rate lock (±2% band), part-payment
  ledger, prepaid discount, COD fee, UPI-QR proof + manual approval, secrets
  never exposed publicly.

---

## Removing PhonePe / Razorpay — is it a problem?

**No.** v94 removes both from the website:

- Admin → Payments provider list shows only **Demo** and **PayU**; the
  PhonePe and Razorpay fields/cards/test buttons are gone.
- The checkout no longer contains PhonePe/Razorpay code paths; no scripts are
  loaded from their domains and the CSP no longer whitelists their hosts
  (only `secure.payu.in` / `test.payu.in` are allowed as form targets).
- The server refuses to save `phonepe`/`razorpay` as the provider; any stale
  saved value is treated as **demo**, so old code can never activate.
- Historical orders keep displaying their old ledger labels ("PhonePe" /
  "Razorpay") if any ever existed — records are not deleted.
- The old gateway response routes remain in the server file but are completely
  dormant/unreachable (no selectable provider, no keys). If you want the
  unused helper functions physically deleted from `api.php` as well, that is a
  safe follow-up cleanup once PayU is confirmed live for a few days — ask and
  it will be stripped in the next update.

Switching gateways does **not** affect products, orders, the bullion desk,
GST/invoices, UPI-QR proof, COD/WhatsApp flows, or the rate lock.
