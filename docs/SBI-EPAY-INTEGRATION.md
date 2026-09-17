# Deploying the SBI payment gateway on shivaa.in

**For:** the Shivaa shop owner + whoever administers the website.
**Covers:** SBIePay (State Bank of India's payment gateway) — how to get it, how to switch it on,
how to test it, how to go live, and what to do when something looks stuck.
**Code status:** the website already contains the complete SBIePay integration (`v128`). It stays
**dormant** — customers keep using the current gateway — until you paste SBI's credentials in
Admin → Payments and press Save.

---

## 0 · The 60-second answer

SBI's online gateway is **SBIePay** (also written SBI e-Pay). Unlike a self-service gateway
(Razorpay, Cashfree), SBIePay is **onboarding-gated**, because it is a service of the bank itself:

| Step | Where | What you need |
|---|---|---|
| 1. Apply | `https://epay.sbi.bank.in` → **Sign Up** (or download the **MIF** form and email `business.sbiepay@sbi.co.in`) | Firm PAN, address proof, banker's certificate, GST/Shop registration, cancelled cheque, bank statement |
| 2. Site checks | your website | valid **SSL** (shivaa.in has it), a **Returns & Refund policy** page that customers accept before paying (we add the acceptance tick automatically), **VSCC** certificate by a CERT-In-empanelled auditor for private merchants |
| 3. Approval → welcome kit | email from SBIePay | **Merchant ID**, **Seller Key** (also called Merchant Key), **Aggregator ID** (usually `SBIEPAY`), **Account Identifier** (usually `NEFT`), plus UAT (test) credentials |
| 4. Switch on | Admin → Payments → *SBIePay* | paste Merchant ID + Seller Key, pick UAT first → **Test SBIePay credentials** → then Production |
| 5. Deploy | merge the v128 PR to `main` | GitHub Actions syncs `cms/` → Hostinger `public_html/` and verifies the live stamp automatically |

Everything in steps 4–5 is already built. Step 1 is paperwork with SBI — it is the only part that
takes real time (typically **2–6 weeks** for a private merchant, sometimes longer).

**Is there an instant SBI gateway? No.** SBIePay has no self-service signup and no public sandbox —
its own FAQ says the RM and Risk/Fraud/Compliance team scrutinise the application, then a pricing
offer and document set follow, and the account is activated only after those documents are approved.
If you need to accept money **today**, the fastest SBI-flavoured route is an **SBI UPI VPA** pasted
into Admin → Payments → *Counter UPI ID* (the QR + screenshot flow already works, same day), with a
fintech PA (PayU — already wired) as the card/netbanking bridge. Full comparison in §10.

---

## 1 · Reality check — read this before you spend weeks on SBIePay

* **SBIePay's merchant mix is institutional.** Its public material and onboarding flow are aimed at
  government departments, educational institutes, trusts and registered firms. A private jewellery
  retailer *can* be onboarded, but expect the firm's full KYC, a signed agreement with SBI, and an
  auditor's **Vendor Site Compliance Certificate (VSCC)**. Budget for the auditor fee and 2–6 weeks.
* **Bank-run vs company-run.** SBIePay is operated by the bank, which is **exempt** from the RBI's
  payment-aggregator authorisation requirement that non-bank aggregators must hold. (SBI's separate
  fintech arm, *SBI Payment Services Pvt Ltd*, was still in the RBI's "applications under process"
  list as of **16 Aug 2026** — that does not affect an SBIePay merchant account at the bank, but it is
  worth knowing if anyone tells you "SBI isn't RBI-approved".)
* **You already have a working gateway.** The site ships with PayU hosted checkout wired end-to-end
  (and a zero-config UPI-QR fallback). If the goal is *sell online this week*, use PayU/UPI; add
  SBIePay when the paperwork completes. Both can coexist: whichever provider is selected is the one
  customers see.
* **Why someone still wants SBIePay:** settlement into your SBI current account, direct bank
  settlement (T+2 working days is the usual promise), often sharper MDR on SBI-issued debit cards, and
  a bank-branded checkout some customers trust more.
* **Rates are quoted per merchant.** Ask for the pricing offer **in writing** (card / net-banking /
  UPI / wallet / international) before you sign the agreement, and ask who bears chargebacks,
  settlement delay risk and refund costs.

---

## 2 · Onboarding, step by step

### 2.1 Apply

1. Open **`https://epay.sbi.bank.in`** → **Sign Up** (mobile + OTP), and complete the four forms:
   business details → contact details → transaction/bank details → **technical details**.
2. In the **technical details** form, when asked for URLs, give the address the shop now serves:
   ```
   Success URL : https://shivaa.in/api/pay/sbiepay/return
   Failure URL : https://shivaa.in/api/pay/sbiepay/return
   ```
   Both are the same endpoint by design — the server tells success from failure with SBI's own
   status API, never from which URL the customer landed on.
   Integration type: **hosted checkout / aggregator hosted listener** (the customer pays on SBI's
   page; card data never touches shivaa.in).
3. Alternatively download the **MIF (Merchant Information Form)** from the same site, fill it, and
   email it to `business.sbiepay@sbi.co.in`. Your SBI branch relationship manager can also raise it.

### 2.2 Documents SBIePay asks for (private merchant)

* PAN of the proprietor / firm / company / trust.
* Address proof of the firm — landline telephone bill **or** electricity bill in the firm's name.
* KYC of every authorised signatory (photo, PAN, address proof).
* **Banker's certificate** with account details + signature verification.
* Blank cancelled cheque + **one year** bank statement.
* One of: Central/State sales-tax registration (GST certificate) **or** Municipal/Shops &
  Establishments registration.
* Signed **agreement with SBI** (they send it after the pricing offer is accepted).
* **VSCC** — Vendor Site Compliance Certificate from a **CERT-In empanelled auditor** (private
  merchants must supply this; government/educational institutes may self-certify).

### 2.3 Site prerequisites the auditor will look at

| Requirement | Where shivaa.in stands |
|---|---|
| Valid SSL on the domain | ✅ shivaa.in runs HTTPS (not strictly required for the aggregator-hosted model, but it is checked) |
| **Domain registered in the merchant's / firm's name** (stated SBIePay requirement) | ⚠️ verify in the registrar panel — the site resolving is not enough. If the domain is in a personal or third-party name, transfer it to the firm/merchant name before applying |
| Goods / fees and prices displayed on the site | ✅ the catalogue shows every piece with its price |
| Customer-friendly, specific refund policy, visible on the site | ✅ `https://shivaa.in/#/refund` (linked in the footer). Keep it specific: timelines, who pays return shipping, custom/engraved pieces |
| Refund policy **accepted by the customer before** landing on SBIePay | ✅ v128 injects an acceptance tick on checkout while SBIePay is the live provider |
| No card data stored on the site | ✅ hosted checkout, PCI burden stays with SBI |
| Correct merchant name/contact on the checkout page | ✅ order + site settings feed the bank page |

### 2.4 After approval

SBIePay emails your **welcome kit**: Merchant ID, Seller Key, Aggregator ID, Account Identifier, and
UAT credentials. Keep the seller key secret — it is the AES key that signs every payment request; the
website stores it in a field the public API never returns.

---

## 3 · What the website already does (v128)

```
Customer taps Pay
      │
      ▼
POST /api/pay/order ──► server builds the SBI pipe request, AES-encrypts it
      │                 (seller key stays on the server), returns
      │                 {mode:'sbiepay', action, fields:{EncryptTrans, merchIdVal}}
      ▼
Browser auto-POSTs to https://sbiepay.sbi/secure/AggregatorHostedListener
      │                 (customer pays on SBI's page — UPI / cards / net-banking)
      ▼
SBI sends the browser back ──► /api/pay/sbiepay/return   (encrypted payload)
      │
      ▼
Server decrypts it only to identify the order/attempt
      │
      ▼
Server calls SBI's status API  sbiepay.sbi/payagg/statusQuery/getStatusQuery
      │                 and credits the order ONLY when SBI says SUCCESS
      │                 and the amount matches the attempt (idempotent by SBI txn id)
      ▼
Customer lands on  /#/order/<id>?pu=success   with the payment ledger updated
```

Safety properties built in:

* The redirect is **never** trusted — a forged return POST cannot be encrypted without the seller
  key, and even a valid-looking one is re-checked with SBI before money appears in the ledger.
* Replays cannot double-credit (already-credited SBI transaction ids are ignored).
* Amount mismatches are logged (`payment.sbiepay-amount-mismatch`) and left pending for the owner.
* If the customer's browser never comes back (closed tab, dead network), the order page's poller
  still reconciles against SBI — and the rescue route `admin/sbi-reconcile` can credit an order from
  the **ATRN** shown in the SBIePay dashboard.

Files that make this work:

| File | Role |
|---|---|
| `cms/sbiepay.gateway.php` | all SBIePay plumbing: config, AES encrypt/decrypt, request pipe, status API, ledger credit |
| `cms/api.php` | routes: `pay/order` (sbiepay branch), `pay/sbiepay/return`, `pay/sbiepay/status`, `admin/pay-test`, `admin/sbi-reconcile`, settings validation |
| `cms/js/v128.js` | the handoff sheet + auto-POST, provider-aware copy, refund-policy acceptance tick |
| `cms/js/admin.js` | Payments → SBIePay fields, "Test SBIePay credentials" |
| `tools/sbi-selftest.php` | offline proof that encryption/parsing match SBI's published format |

---

## 4 · Switch it on (no code needed)

1. Open **`https://shivaa.in/#/admin`** → **Payments**.
2. **Payment provider** → *SBIePay — State Bank of India*.
3. **Site base URL** → `https://shivaa.in` (must be the public https address; SBI's success/fail URLs
   are built from it).
4. Fill: **Merchant ID**, **Seller Key**, **Aggregator ID** (`SBIEPAY` unless the kit says otherwise),
   **Account Identifier** (`NEFT` unless the kit says otherwise), **Environment** = *UAT / test*.
5. **Save payments** → the panel immediately runs **Test SBIePay credentials**:
   * first it encrypts and decrypts a probe with your seller key (catches a truncated paste),
   * then it asks SBI's status API about a transaction that cannot exist.
   "Seller key verified … endpoint answered" = the credentials are structurally good.
6. Copy the URL shown under the fields into your SBIePay onboarding reply (Success URL = Failure URL
   = `https://shivaa.in/api/pay/sbiepay/return`).

> While provider = **Demo** or **PayU**, none of the SBI code runs. You cannot break the live shop by
> pasting a wrong key — the server simply refuses to start an SBI payment until the key is present
> and usable.

---

## 5 · Test on UAT (test.sbiepay.sbi)

Use SBI's staging credentials (welcome kit) and `Environment = UAT`:

1. Place a small order (₹1–₹100) on shivaa.in, choose *Pay online*, tap **Pay now**.
2. You should see the "Opening SBIePay…" sheet, then SBI's test payment page.
3. Pay with the **test instrument** SBIePay provides (test card / test net-banking credentials).
4. Expect: SBI returns you to `/#/order/<id>?pu=success`; the order shows **Paid**, the payment
   ledger shows a line with mode `sbiepay` and the SBI transaction id; the invoice is issued.
5. Test the failure path: cancel on the SBI page → `?pu=fail`, order stays *Awaiting payment*.
6. Test the "closed tab" path: pay, but close the browser before returning; open the order page →
   the poller should still confirm it (it asks SBI directly).
7. Check **Audit log** (admin) for `payment.sbiepay-paid` and any `payment.sbiepay-verify-fail`.

Run the offline protocol check any time (needs PHP, no internet):

```bash
php tools/sbi-selftest.php      # 25 assertions on encryption + parsers; exits 0 when all green
```

---

## 6 · Go live

1. Ask SBIePay to **activate production** for your merchant id and confirm your server IP(s) are
   whitelisted if they asked for them.
2. Admin → Payments → **Environment = Production** (live credentials) → Save.
3. Make one **real, small payment** (₹1–₹11) with your own card/UPI and check:
   * the order flips to Paid and the ledger shows the ATRN,
   * the amount **settles** into the SBI current account on the promised cycle (usually T+2),
   * the SBIePay dashboard shows the same transaction id.
4. Only then announce it. Keep the UPI-QR fallback filled in (it works even if the gateway is down)
   and keep a screenshot of the SBIePay dashboard for your first reconciliation.

---

## 7 · Refunds and reconciliation

* **Raise SBI refunds in the SBIePay merchant dashboard** (it holds the ATRN → refund flow). Record
  the refund against the order in the panel so the books and the customer's order page agree;
  the site's refund policy timelines (`#/refund`) are what the customer sees.
* SBI's encrypted refund endpoint (`…/payagg/bookRefundCancellation/AggStandardEncRefundQueryService`)
  is documented inside `cms/sbiepay.gateway.php` for a future in-panel refund pass; it is deliberately
  **not** wired yet, because an untested refund path is worse than a dashboard one.
* **Daily reconciliation:** SBIePay dashboard total for the day ↔ Orders list (filter gateway
  `sbiepay`) ↔ bank statement. Any order stuck on *Awaiting payment* with a matching SBI success row
  is the closed-tab case: copy its **ATRN** and run `admin/sbi-reconcile` (or send it to Arena/your
  developer) — the server verifies with SBI before crediting.

---

## 8 · Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| "SBIePay encryption failed — check the Seller Key" | Seller key truncated, or has spaces/line breaks from copy-paste | Re-paste from the welcome kit; Save; run Test again |
| Test says "did not accept the credentials" | UAT credentials with `Production` selected (or vice versa), merchant not yet activated, or your server IP not whitelisted | Match the environment to the credential set; ask SBIePay to activate / whitelist |
| SBI page shows an invalid merchant / checksum error | Aggregator ID or Account Identifier wrong (or the merchant id pasted into the wrong field) | Copy the exact values from the welcome kit; Test again |
| Customer paid, order still *Awaiting payment* | Status API call failed (network egress blocked, IP not whitelisted, SBI maintenance) | Check audit log `payment.sbiepay-verify-fail`; retry the order page (poller) or use `admin/sbi-reconcile` with the ATRN |
| Customer landed on the order page but sees the old "PayU" wording | Browser served the cached shell | Hard-refresh once; the v128 shell stamp (`__SHIVAA_REL=128`) forces a fresh bundle on the next visit |
| Refund asked by customer, no button in the panel | SBI refunds live in the SBIePay dashboard (by design) | Raise it there, then record it in the panel |

---

## 9 · Deploying this code to shivaa.in

The repo's contract (see `HOSTINGER-AUTO-DEPLOY.md`) is: **Actions = primary**.

1. Merge the v128 PR into `main` → the *Hostinger Deploy (auto)* workflow runs, lints every
   `cms/*.php`, syncs `cms/` → `public_html/` over FTPS (never touching `data/`, `uploads/`,
   `.htaccess`), then verifies `https://shivaa.in` serves `__SHIVAA_REL=128`.
2. Nothing in the customer flow changes until a provider is selected in Admin → Payments — the
   release is safe to deploy ahead of SBI's approval.
3. Manual fallback (emergency only): hPanel → File Manager → `public_html` → upload the release zip →
   Extract (overwrite).

Post-deploy sanity check (no gateway keys needed):

```bash
curl -s https://shivaa.in/ | grep -o '__SHIVAA_REL=[0-9]*'          # → 128
curl -s -X POST https://shivaa.in/api/pay/payu/status \
  -H 'Content-Type: application/json' -d '{"orderId":"x"}'          # 401/404 = route alive
```

---

## 10 · Instant or procedure? (the honest timeline)

**There is no instant SBI payment gateway.** Confirmed against SBIePay's own FAQ: once your
application arrives, *"SBIePay Relationship Manager and Risk, Fraud and Compliance team will
scrutinize your application. On approval, you will receive the pricing offer along with the list of
documents that will be required… your account shall be activated once your documents submitted by you
are approved."* There is also **no public sandbox** — UAT (`test.sbiepay.sbi`) credentials come with
or after the welcome kit, so onboarding and integration cannot be parallelised by a developer alone.

What *is* fast, ranked by time to the first live rupee:

| # | Route | Time to live | What it covers | Trade-off |
|---|---|---|---|---|
| 1 | **SBI UPI VPA + the site's QR flow** — get an SBI UPI ID (SBI Pay / YONO Business / branch), paste it in **Admin → Payments → Counter UPI ID** | **Same day** | Real UPI money into the SBI account, per-order QR, customer uploads the payment screenshot, the counter approves it | UPI only, no cards/netbanking, manual approval per order, best under ~₹1 lakh per transaction |
| 2 | **An RBI-authorised fintech PA** (PayU is already wired; Razorpay/PhonePe code is present but dormant) | **Hours – 3 days** (digital KYC; most delays are name/address mismatches across PAN, bank and GST) | Cards, netbanking (incl. SBI netbanking), UPI, wallets — the customer's *SBI card / SBI netbanking* works fine | Not SBI-branded, and money settles from the PA's escrow, not directly from SBI |
| 3 | **SBI Payments in-store acceptance** (YONO SBI Merchant app / Bharat QR / POS, via `sbipayments.com` or the branch) | **Days** (onboarded through their team) | Counter-side Bharat QR/UPI, tap-to-pay, T+1 settlement | Not a website checkout — it digitises the shop counter, not shivaa.in |
| 4 | **SBIePay hosted checkout** (what v128 implements) | **2 – 6 weeks** (RM + Risk/Fraud/Compliance scrutiny → pricing offer → document set → activation) | Full online acceptance: netbanking (~45 banks direct), Visa/MC/RuPay/Maestro + international cards, UPI, 3-D Secure, T+2 settlement; **aggregator-hosted = no card data on the site, no PCI-DSS burden** | The procedure in §2; merchant-hosted would additionally demand PCI-DSS compliance |

### How to compress the SBIePay timeline (not to zero, but shorter)

1. Use the **online Sign Up** (`epay.sbi.bank.in`) rather than only the paper MIF — it starts the RM
   review immediately; the MIF route adds a hand-off.
2. Send the **complete document pack in one go** (§2.2). Every round-trip costs days.
3. Ask your **SBI branch relationship manager to push it** — an existing current-account relationship
   with real turnover is the strongest accelerator available.
4. Arrange the **VSCC** with a CERT-In empanelled auditor **before** SBI asks for it (it is the
   longest external item — an audit of the site, not of your shop).
5. Check the **domain is registered in the merchant's name** (a stated SBIePay requirement) — verify
   the registrant in your Hostinger/.IN registrar panel, not just that the site resolves.
6. Keep **goods and prices displayed** on the site (they are) and make sure the **refund policy is
   shown and accepted before** the customer reaches SBIePay (v128 injects the acceptance tick).
7. Register **Success URL = Failure URL = `https://shivaa.in/api/pay/sbiepay/return`** exactly, and
   ask for the **UAT credentials in the same email** as the welcome kit.
8. Because our code is already written and structurally tested, day one of the welcome kit = paste
   three values, run Test, then UAT. There is nothing left to build.

### Cost expectations (typical market figures — get them in writing from SBIePay)

Cards and net-banking commonly quote around **1.8–2.5% + GST**; a setup fee is often waived for
existing SBI customers, an AMC of roughly ₹1,000–10,000/yr can apply, chargebacks carry a per-instance
fee, and settlement is **T+2 working days**. UPI is generally the cheapest rail for merchants —
confirm what applies to your turnover category in the pricing offer. Nothing here changes the fact
that the site works today on PayU/UPI, so treat the SBI quote as a comparison, not a prerequisite.

### Settlement — what actually reaches the account, and when

**SBIePay does not offer instant settlement.** Its own FAQ is explicit: settlement follows the RBI
nodal-account instruction of a **maximum T+2 working days** (T = the day of intimation of transaction
completion) for private merchants and autonomous bodies — *"while genuine efforts are made to settle
the funds by T+1 working day itself, all the funds shall be settled by T+2 working days."* Government
bodies settle T+3. International collections follow the same cycle, credited in rupees only.

| Channel | When the money reaches your account | Notes |
|---|---|---|
| **SBIePay online** (cards · netbanking · UPI · wallets) | **T+2 working days max** (best-effort T+1) | All channels aggregate into one nodal account and the day's collections land as a single credit; fees come off either as net settlement or as a monthly invoice, per your agreement |
| **SBI Payments POS / YONO SBI Merchant (Bharat QR)** | Auto-settlement at end of day → **next day (T+1)** | Counter-side acceptance, not the website |
| **Your own SBI UPI VPA** — the site's *Counter UPI ID* QR flow | **Instant** — UPI credits the payee's bank account in real time, no aggregator holds the money | UPI only; bank per-transaction limits apply (typically ₹1 lakh, higher for approved categories); you approve each screenshot in Orders |
| **Fintech PA "instant settlement"** (Cashfree/Razorpay-style add-on) | Minutes — paid, risk-gated | Understand what it is: the PA **pre-funds** you ahead of its own T+1/T+2 cycle. It is a cash-flow product with a fee, not a faster RBI settlement cycle |

So: if the goal is money in the SBI account *today*, the UPI VPA QR flow is the only route that does
it — that is why it exists as step 1 in the ranking above. If the goal is automatic card/netbanking
collection, budget for **T+2** with SBIePay (and ask the RM whether any on-demand/T+0 product exists
for your merchant category — none is published; get any offer in writing, with cut-off time, fee and
whether it is revocable).

### The recommendation in one line

Run routes 1 + 2 now (selling today), submit route 4 in parallel (the paperwork), and switch to
SBIePay the moment the welcome kit lands — the code is already in place, dormant, waiting for three
values.

---

## Appendix A · Protocol reference (what v128 implements)

**Hosted checkout (POST, `application/x-www-form-urlencoded`)**

```
LIVE  https://sbiepay.sbi/secure/AggregatorHostedListener
UAT   https://test.sbiepay.sbi/secure/AggregatorHostedListener

EncryptTrans = base64( AES-128-CBC( pipe, key = seller key, IV = seller key[0:16], PKCS#7 ) )
merchIdVal   = Merchant ID
[MultiAccountInstructionDtls = AES( "amount|currency|accountIdentifier" rows joined by "||" )]

pipe = merchantId|operatingMode|country|currency|amount|otherInfo|successUrl|failUrl|
       aggregatorId|merchantOrderNo|merchantCustomerId|payMode|accessMedium|transactionSource
       defaults: DOM | IN | INR | SBIEPAY | NA | NB | ONLINE | ONLINE
```

**Status query (server-to-server POST)** — the only source of truth

```
LIVE  https://sbiepay.sbi/payagg/statusQuery/getStatusQuery
UAT   https://test.sbiepay.sbi/payagg/statusQuery/getStatusQuery
form: queryRequest = sbiTransactionId|merchantId|merchantOrderNo|amount
      aggregatorId, merchantId
```

**Success/failure return** — SBI posts the result to the registered Success/Failure URL. v128 accepts
`EncryptTrans` / `encData` / `EncryptedResponse`, a plain pipe body, or plain fields, then re-verifies
with the status API.

**Field order of the server response pipe**

```
merchant_order_no|sbi_transaction_id|transaction_status|amount|currency|pay_mode|extra_details|
reason|bank_code|bank_reference_number|transaction_date|country|CIN|merchant_id|total_fees|ref1…ref9
(transaction_status ∈ SUCCESS | FAIL | PENDING)
```

**Status pipe order** (differs from the return pipe):
`merchant_id|sbi_transaction_id|transaction_status|country|currency|extra_details|merchant_order_no|
amount|reason|bank_code|bank_reference_number|transaction_date|pay_mode|CIN|merchant_id|total_fees|ref1…ref9|na`

**Refund pipe order:**
`merchant_id|sbi_transaction_id|sbi_refund_transaction_id|transaction_status|reason|refund_order_no|
merchant_order_no`

**Sources used to pin this down** (both independent, agreeing on field order + crypto):
the public SBIePay integration sample circulating as `sbi_epay` (AES class + `AggregatorHostedListener`
POST with `EncryptTrans` + `merchIdVal`), and the `Jagdish-J-P/sbi-pay` package
(`config/config.php` endpoints, `src/Traits/Encryption.php`, `src/Messages/PaymentRequestMessage.php`,
`TransactionStatusMessage.php`, `RefundRequestMessage.php`, `src/Constant/Response.php`).
SBIePay does not publish these pages openly — when the welcome kit arrives, diff this appendix against
the kit's integration document before going live.
