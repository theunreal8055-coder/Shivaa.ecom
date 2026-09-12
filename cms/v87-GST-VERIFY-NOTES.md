# Shivaa update **v87** — live GST verification for jeweller partnerships (APITxT GST API)

The **For Jewellers** partnership form now verifies every GSTIN **live
against the official GST register through APITxT**
(`GET https://apitxt.com/api/gst/{GSTIN}?authkey=…`) — using **the same
auth key that already sends your OTP SMS**. **There is nothing new to
configure or deploy on the key side**: the existing
`public_html/data/sms-config.json` is read automatically.

**Cost:** 1 APITxT credit per distinct GSTIN. Successful answers are
cached for 30 days (inactive numbers for 24 h), so the applicant's
"Verify GST" click and the server's re-check when they submit cost
**one credit total**, not two. Keep a small APITxT balance; when the
wallet is empty the form keeps working checksum-only and marks the
application for manual verification at approval.

**Tests:** static suite **v87: 233/233 green** (includes all v81–v86
assertions); new end-to-end browser test of the partnership form
**v87-gst-functional: all green across repeated runs**; v83/v84/v85
functional, board and v80 suites all green; PHP lint and JS syntax
pass.

---

## What the jeweller sees (For Jewellers → Partner Application)

1. Types the 15-character GSTIN and taps **✓ Verify GST**.
2. The number is checksum-tested first (free), then looked up live.
   - **Active business:** the form shows
     `✓ Govt-verified: LEGAL NAME · Active · trade name …`, the
     **Firm name is auto-filled from the government record and
     locked**, and City is suggested from the registered district.
   - **Cancelled / Suspended / inactive:** the row shows
     `✗ This GSTIN is not Active in the GST register (…)` and the
     application button stays locked — only Active GSTINs can apply.
   - **Service unreachable / out of credit:** the number is still
     accepted on checksum validity with a small "verified at approval"
     note, so a temporary APITxT outage never blocks business.
3. Mobile OTP, email and password work exactly as before.

## What the server does differently

- New `apitxt_key()` helper — reads `data/gst-config.json` if you ever
  want a separate verification key, otherwise the APITxT key from
  `data/sms-config.json` (only when that file's provider is `apitxt`).
- `kyc/gst-lookup` now calls APITxT first and returns legal name, trade
  name, business type, registration date, status, address, district and
  pincode. Your older custom GST provider (if an admin key was saved)
  remains as an automatic fallback; SSRF protections on it are
  unchanged.
- **`partners/apply` re-verifies on the server** before accepting an
  application — the browser cannot be tricked into claiming a verified
  number. An inactive GSTIN is rejected outright; an Active record is
  snapshotted into the application (`gstinLiveVerified`, `gstStatus`,
  `legalName`, `tradeName`, `businessType`, `registrationDate`,
  registered address/district/pincode, verification timestamp).
- Lookup traffic is excluded from the global database write lock (like
  SMS/Razorpay calls) and the credit-saving cache is written with a
  fresh locked read-merge, so a slow APITxT response can never stall
  the shop or overwrite concurrent orders.
- Per-connection lookup cap remains **24/hour** (wallet protection).

## What you see in Admin

- Partner applications queue shows **`GST ✓ live`** (with the
  registered legal name under the firm) or an amber **`GST ? check`**
  for checksum-only applications that need a manual glance before
  approval.
- Settings → SMS card now shows a **GST verification: ● LIVE —
  APITXt reuses this key** row (plus how many numbers are cached).
- The old "GST verification API key" settings field is now labelled
  **optional** — leave it blank; it only exists for a different
  provider in future.

## Deploy (no new config file needed)

1. hPanel → File Manager → `public_html`, upload
   **`shivaa-update-v87.zip`**, extract with overwrite.
2. Do **not** touch `data/` — `db.json` and `sms-config.json` (your
   APITxT key) stay exactly as they are.
3. Hard-refresh (Ctrl+F5) so the new `app.js`/`admin.js` (v87) load;
   the service worker cache is bumped automatically.
4. Live test (costs 1 credit): open **For Jewellers**, enter any real
   Active GSTIN (e.g. a supplier's), tap **Verify GST** — the legal
   name should auto-fill within a couple of seconds.
5. Check **Admin → Settings** shows "GST verification ● LIVE".

If the live test ever shows "(firm name verified when we approve)"
instead, check APITxT wallet balance or the key — the form still
accepts applications and you verify manually.

Rollback: re-upload `shivaa-update-v86.zip` the same way; no database
format change is involved (the new `gstCache` table is ignored by older
code harmlessly).
