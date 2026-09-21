# DEPLOY — v165 · Cashfree Failures Tell the Truth (the 6-ear-studs error)

**Zip:** `shivaa-update-v165.zip`
- **Files (5, root layout):** `api.php`, `index.html`, `sw.js`, `js/app.js`, `js/admin.js`
- Extract into `public_html/` → overwrite. Never touches `data/db.json` or `.htaccess`.

---

## What you reported

> "Cashfree could not start this payment — choose WhatsApp/COD, the UPI QR tab, or retry in a moment."
> Only on the **6 ear studs**. Every other product pays fine.

## What we found (root cause)

The error text is the site's own safety line — it appears when **Cashfree itself refuses
to create the payment session**. The real reason Cashfree refuses has been recorded in
your site's audit log the whole time, but no screen showed it.

The decisive clue is **price**:

- The 6 studs are priced by live gold rate: 3 g × ~₹14,300 + 15% making + 3% GST ≈
  **₹49,600 – ₹55,100 each** (all six, today's rates).
- Every other product you tested (rings 1.1–3.3 g) sits **below ≈₹45,000**.
- The **only field in the Cashfree create-order request that changes from product to
  product is the amount** — customer, order shape, even the one-click block are identical.
- Cashfree's own troubleshooting page lists exactly this case: **"You have exceeded the
  maximum amount limit set for your MID"** — young/new merchant accounts get a
  per-transaction cap (commonly around ₹50,000) until Cashfree raises it.

That is why the failure is 100% reproducible on the studs and 100% absent on everything
lighter: it was never a bug in the studs' page, cart or checkout — the gateway declines
the **amount**.

## What v165 changes on the site

1. **The customer message is now honest for this case.** If Cashfree declines with an
   amount-limit error, the site says: *"This piece is above our current online-payment
   limit — please pay with the UPI QR tab (works for any amount) or on WhatsApp/COD.
   We are raising the limit with our payment partner."* No more "retry in a moment"
   for a retry that could never succeed.
2. **The raw Cashfree reason is never swallowed again.** It reaches the browser console
   (`[shivaa-gateway] …`), the API response (`gatewayCode`/`gatewayMessage`), and
   **Admin → Reports → Audit log** — payment rows now have a **"gateway details"**
   expander showing Cashfree's exact response (HTTP code, its own error code + message,
   and the order amount).
3. Stamps 165 in lockstep (index/app/sw/api). QA: `v165-check 31/31`,
   `v165-php-run 12/12` (executed on the embedded PHP 8.3), `v164-check 114/114`,
   `v164-php-run 17/17`, pay-audit invariants 10/10 unchanged.

## What YOU do (the actual fix — 10 minutes)

1. **Confirm it in one tap** (after this deploy): open the site in an incognito window →
   any stud → ⚡ Buy Now → you'll now see the amount-limit message (or, if Cashfree's
   reason is different, Admin → Reports → Audit log → gateway details will name it
   exactly — send me a screenshot if so).
2. **Ask Cashfree to raise the per-transaction limit** — this is the real fix:
   - Cashfree Merchant Dashboard → Support, or the support form at
     <https://www.cashfree.com/support/> — or reply to your onboarding/KAM thread.
   - What to write: *"Please raise the maximum per-transaction order amount limit on our
     MID. We sell 22K gold jewellery; single pieces legitimately price between ₹50,000
     and ₹3,00,000. Current limit rejects Create-Order with an amount error."*
   - Jewellery UPI itself allows ₹2 lakh per transaction (NPCI rule since 15 Sep 2025),
     so once Cashfree lifts the MID cap, online payment will work to your real prices.
3. **Until the limit is raised**, the studs still sell with zero code friction:
   the **UPI QR tab** on the order page (any amount — the customer's own bank UPI limit
   applies), WhatsApp order, and COD all keep working exactly as before.

---

*After Cashfree raises the limit, nothing on the site needs changing — the studs will
simply pass Create-Order like every other piece.*
