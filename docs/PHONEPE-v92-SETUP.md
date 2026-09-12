# PhonePe Payment Gateway — setup & go-live guide (v92)

**For:** Ernate Shine Jewellery Private Limited
**What this is:** the Shivaa site (v92+) already contains the complete PhonePe
integration (Standard Checkout, redirect flow, server-to-server verification,
refunds, test mode). Until the steps below are done the shop keeps working
exactly as today — demo checkout, **UPI QR + screenshot proof**, COD and
WhatsApp orders are all unchanged. Nothing switches over until you select
PhonePe and paste keys.

---

## 1. Keep these KYC documents ready (Pvt Ltd)

PhonePe onboarding asks for these as clear photos/PDFs:

1. **Company PAN card** (the 10-char PAN in the company name).
2. **GSTIN + GST registration certificate** (you already have this; it is
   printed on your Shivaa tax invoices).
3. **Certificate of Incorporation + CIN** (from MCA).
4. **Current bank account proof** — a cancelled cheque leaf or bank
   statement/passbook first page showing pre-printed account number,
   IFSC and the **company** name. Settlements go here.
5. **Authorised signatory** (director) PAN and Aadhaar — live eKYC is done
   with an OTP; keep the signatory's phone handy.
6. **Business address proof** (electricity/gas bill, rent agreement).
7. Website details (already live): business description, a contact page,
   privacy policy, terms, refund/cancellation policy — all present on
   shivaa.in.
8. A square **logo, 512×512 PNG**.
9. Business category: **Gems & Jewellery / Jewellery retail**.

---

## 2. Create the PhonePe business account

1. Open **https://business.phonepe.com** → **Sign Up** (use the
   director/owner email and a phone that receives OTPs).
2. Verify email + mobile with OTP.
3. Choose **Accept payments online → Payment Gateway (Standard Checkout)**.
   (Do not choose Payment Links / Payouts — the site uses the gateway API.)
4. Fill the business profile **exactly as on PAN/GST**:
   - Legal name: **ERNATE SHINE JEWELLERY PRIVATE LIMITED** (match PAN case)
   - PAN, GSTIN, CIN, registered address, category, website
     `https://www.shivaa.in` (replace with your final domain).
5. **Bank details:** current account number + IFSC; upload the cancelled
   cheque/statement.
6. **Signatory KYC:** director PAN + Aadhaar, complete the OTP/Video KYC.
7. Submit. Activation is typically **1–5 working days**; the dashboard opens
   immediately in a limited mode.

### Testing before activation (UAT sandbox — optional, free)

- PhonePe's developer portal (**https://developer.phonepe.com**, sign in with
  the same business account) issues **per-merchant UAT sandbox keys** under
  *Payment Gateway → API Keys/Sandbox*.
- PhonePe's published sample apps also use these shared UAT credentials, which
  work for an end-to-end practice run:
  - Merchant ID `PGTESTPAYUAT`
  - Salt key `099eb0cd-02cf-4e2a-8aca-3e6c6aff0399`, salt index `1`
  - Follow PhonePe's "PG sandbox testing" page for the test UPI flow.
- Sandbox money is never real.

---

## 3. Get the three values from the PhonePe dashboard

Menu **Payment Gateway → Integrations / API Keys** (UAT has its own section):

1. **Merchant ID (MID)** — looks like `SHIVAAONLINE` or `PGTESTPAYUAT`.
2. **Salt Key** — a UUID-style secret. ⚠ Shown once; PhonePe masks it later.
3. **Salt Index** — usually **1** (a small number shown next to the salt).

### URLs PhonePe may ask you to whitelist

The integration sends these with every transaction, but activation support
sometimes asks for them in writing (replace the domain with yours):

- **Redirect/return URL:** `https://www.shivaa.in/api/pay/phonepe/return`
- **Server callback URL:** `https://www.shivaa.in/api/pay/phonepe/callback`

Your Shivaa admin (**Settings → Payments**) displays both values
automatically once the Site base URL is filled.

---

## 4. Paste keys into the Shivaa admin

1. Sign in to your site admin → **Settings → 💳 Payments & gateway**.
2. **Site base URL:** `https://www.shivaa.in` (no trailing slash). This must be
   the real public https address — PhonePe sends customers back here.
3. **Payment provider:** select **PhonePe (UPI · cards · net-banking ·
   wallets)**.
4. Fill **Merchant ID**, **Salt Key**, **Salt Index** (normally 1).
5. First testing round: set **Environment = UAT / sandbox**.
6. Click **Save payments** — the panel runs **Test PhonePe Keys** itself; or
   press that button. Expected green result:
   *"Credentials accepted by PhonePe (uat) … (TRANSACTION_NOT_FOUND)"* —
   not-found for the random test transaction is the success signal.
   `CHECKSUM_ERROR`/401 means the salt key or salt index is wrong.
7. The shop stays on UPI-QR/demo until the environment is production and keys
   are present — there is no half-finished state customers can see.

---

## 5. Run a UAT test transaction

1. On a phone, add an item → checkout → Pay online. You are redirected to
   PhonePe's sandbox payment screen (the page shows a test banner).
2. Complete the test UPI flow per PhonePe's sandbox instructions.
3. You return to the Shivaa order page:
   - success → green **Payment received** banner and the ledger shows
     **PhonePe** within a few seconds;
   - failure → red banner and the **Pay now** button stays available;
   - pending → the page asks the server to reconcile automatically.
4. Admin → Orders shows the gateway reference (`GW: …`) in the payment cell.

---

## 6. Go live

1. Wait for PhonePe's **activation/live approval email**.
2. Admin → Settings → Payments: switch **Environment to Production**, paste
   the **production** Merchant ID + Salt Key (+ index), Save.
3. Click **Test PhonePe Keys** → must show *accepted (prod)*.
4. Do one **real ₹1 (or cheapest item)** transaction with your own UPI —
   confirm the order flips to **Paid**.
5. In Admin → Orders press the **↩️** button on that order and refund it, to
   prove the refund path. PhonePe settles refunds in **5–7 working days** to
   the source UPI/card.
6. Settlements land in the current account per your PhonePe settlement
   schedule (usually T+1); reports/reconciliation are in the PhonePe
   dashboard.
7. Part-refunds work: ↩️ asks the amount and never allows more than what was
   captured.

---

## 7. How it behaves day to day

- Customer taps Pay online → full-page redirect to PhonePe → chooses UPI app,
  card, net-banking or wallet → PhonePe returns them to the order page.
- **Card data never touches shivaa.in** — PhonePe hosts the entire payment
  page. The site only stores the gateway transaction id and amount.
- Every result is double-checked server-to-server with a signed status call;
  browser messages are never trusted. A server callback independently credits
  the order if the browser closed early.
- The same transaction can never credit twice (idempotent ledger); amounts
  must match the order exactly; cancelled orders cannot be charged.
- If PhonePe is unreachable, or keys are missing, checkout automatically keeps
  the existing **UPI QR screenshot** flow, COD and WhatsApp.

---

## 8. Troubleshooting

| Symptom in admin/on site | Cause / fix |
|---|---|
| Test keys → `CHECKSUM_ERROR` / 401/403 | Salt key pasted wrong, or wrong **salt index**. Re-copy; each salt has its index. |
| Live init fails: *needs an https site* | Site base URL must start `https://` (Hostinger has free SSL; enable it). |
| Customers return to the wrong domain | Fix **Site base URL**, Save, retry. |
| Redirect works but order stays pending | The callback couldn't reach `/api/pay/phonepe/callback`; the order page reconciles itself, and PhonePe retries callbacks. Check the URL is public (not a preview host). |
| UAT keys work, live doesn't | Production activation not complete, or production salt differs from UAT. |
| Payment debited but failed banner shown | PhonePe auto-refunds such cases in 5–7 days; the customer can also retry — the gateway blocks double capture. |
| Want to pause PhonePe later | Set provider back to **Demo/UPI QR** — nothing is lost; UPI-QR + COD continue. |

Fees/MDR are as stated in your PhonePe merchant contract (shown during
onboarding); they are collected by PhonePe, not by the site.
