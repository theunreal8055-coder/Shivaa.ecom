# SHIVAA v128 — deploy sheet (SBIePay / SBI payment gateway)

**Release:** v128 · SBIePay (State Bank of India) hosted checkout, dormant until selected
**Also:** refund-policy acceptance tick on checkout *while SBIePay is live* · provider-aware copy
**Deploy:** merge the PR to `main` → *Hostinger Deploy (auto)* syncs `cms/` → `public_html/` and
verifies the live stamp. Manual hPanel upload is the emergency path only.

---

## 1 · What changed

| File | Why it changed |
|------|----------------|
| `sbiepay.gateway.php` | **new** — the whole SBIePay integration (AES-128-CBC `EncryptTrans`, request pipe, status API, ledger credit, idempotent by SBI txn id) |
| `api.php` | `require_once` of the gateway; `pay/order` gains the `sbiepay` branch; new routes `pay/sbiepay/return`, `pay/sbiepay/status`, `admin/sbi-reconcile`; `admin/pay-test` gains the SBIePay probe; settings validation for `sbiMerchantId` / `sbiSellerSecret` / `sbiAggregatorId` / `sbiAccountId` / `sbiEnv`; `payProvider` accepts `sbiepay` |
| `js/v128.js` | **new** — handoff sheet + host-validated auto-POST to SBI, PayU→SBIePay copy relabel (only while SBIePay is live), refund-policy acceptance tick on checkout |
| `js/admin.js` | Payments → **SBIePay fieldset** (Merchant ID, Seller key, Aggregator ID, Account identifier, UAT/Production) + "Test SBIePay credentials" + the Success/Failure URL to paste into the SBIePay form |
| `index.html` | `__SHIVAA_REL=128`, `/js/app.js?v=128`, v128 layer script tag |
| `js/app.js` | `APP_REL = 128` (release handshake), staff bundle cache key `admin.js?v=128` |
| `sw.js` | shell → `shivaa-shell-v128`, precache carries `app.js?v=128` + `js/v128.js?v=128` |
| `tools/sbi-selftest.php` | **new** — offline proof of the crypto + parsers (`php tools/sbi-selftest.php`) |
| `docs/SBI-EPAY-INTEGRATION.md` | **new** — onboarding, switch-on, UAT test, go-live, troubleshooting, protocol appendix |

`data/**`, `uploads/**` and `.htaccess` are never synced. No database change is needed.

**Safe by default:** with provider = Demo or PayU nothing in the SBI path executes. A wrong/absent
seller key can never start an SBI payment, and the return route refuses to credit anything it cannot
verify with SBI's own status API.

---

## 2 · Upload

* **Normal:** merge the PR → watch *Actions → Hostinger Deploy (auto)*. Preflight lints every
  `cms/*.php`, then the sync runs; the job fails loudly if `https://shivaa.in` does not serve
  `__SHIVAA_REL=128` within two minutes.
* **Manual (emergency):** hPanel → File Manager → `public_html` → upload the release files (or zip)
  → Extract → overwrite. `.htaccess` is not part of this release.

---

## 3 · Verify after deploy (2 minutes, no SBI keys needed)

```bash
curl -s https://shivaa.in/ | grep -o '__SHIVAA_REL=[0-9]*'      # → __SHIVAA_REL=128
curl -s https://shivaa.in/js/v128.js | head -3                   # the new layer is live
curl -s https://shivaa.in/api/pay/config                         # → "mode":"payu"|"demo" plus a new "sbiepay":{"ready":false,...}
```

In the shop: place a test order with Demo/PayU selected — the flow must be **identical to before**
(same PayU sheet, same wording). That is the proof the release is inert until SBI is switched on.

On the server (Hostinger SSH/terminal, or any PHP machine):

```bash
php tools/sbi-selftest.php     # 25 assertions, exits 0 = encryption + parsers match SBI's format
```

---

## 4 · Switching SBIePay on (when SBI's welcome kit arrives)

1. Admin → Payments → provider **SBIePay**, Site base URL `https://shivaa.in`.
2. Merchant ID + Seller key (+ Aggregator ID / Account identifier if the kit names them) → Environment
   **UAT** → Save. The panel runs **Test SBIePay credentials** automatically (AES round-trip + live
   probe of SBI's status API).
3. Register Success URL = Failure URL = `https://shivaa.in/api/pay/sbiepay/return` with SBIePay.
4. Test a small order on UAT → then Environment **Production** with live credentials → one real ₹1–₹11
   payment → confirm it settles.

Full walkthrough, documents checklist and troubleshooting: **`docs/SBI-EPAY-INTEGRATION.md`**.

---

## 5 · Rollback

Merge a revert (or upload the previous `api.php` + delete `js/v128.js` and restore the previous
`index.html`/`sw.js`). No customer data, orders or settings are touched by v128; switching the
provider back to **PayU** or **Demo** in Admin → Payments is enough to stop all SBI traffic
immediately, with no deployment at all.
