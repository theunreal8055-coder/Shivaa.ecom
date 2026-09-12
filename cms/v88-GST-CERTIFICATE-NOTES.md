# Shivaa update **v88** — GST certificate PDF + full KYC detail card for partner review

Adds the two follow-ons from v87's live GST verification, both inside
**Admin → Partners**:

1. **View GST certificate (Form GST REG-06)** — one click pulls the
   official certificate PDF from APITxT and shows it **inside the admin
   panel** with a download button.
2. **Full KYC detail card** — everything the GST register returned is
   laid out for the reviewer instead of hidden in a tooltip, including a
   one-click **Re-verify live** for applications that only passed the
   checksum.

The APITxT auth key is still the same `data/sms-config.json` key — no new
configuration.

**Tests:** static suite **v88: 76/76 green**; end-to-end browser tests for
the partner form (v87) and the admin card/certificate/re-verify (v88) all
green across repeated runs; PHP lint + all JS syntax checks pass.

---

## How it works in the admin panel

Admin → **Partners** tab → each application row now has a **KYC details**
button (when a GSTIN exists). It opens a card showing:

- Live status pill: **✓ Active · govt-verified** (green) or
  **? checksum only — verify below** (amber);
- registered (legal) name, trade name, constitution, registration date;
- registered principal address with district, state and pincode;
- firm PAN (embedded in the GSTIN), owner PAN (if provided), state;
- exact date/time the record was verified by the site;
- buttons **📄 View GST certificate (REG-06)** and **↻ Re-verify live**.

### Certificate viewer

- Calls APITxT `action=download` and renders the government PDF inline in
  a tall viewer, with a **⬇ Download PDF** button
  (`GST-REG-06-<GSTIN>.pdf`).
- **1 APITxT credit on the first view per GSTIN; repeat views within 30
  days are free** — the PDF is cached on the server inside
  `data/gst-certs/`. That folder sits under the `data/` deny rule **and**
  gets its own auto-written `.htaccess`, so identity documents can never
  be downloaded by a direct URL — only an authenticated admin streaming
  them through PHP can read them.
- The PDF is verified by its `%PDF` magic bytes; wallet-empty (301),
  rejected-key (304) and not-Active (205) responses show clear messages
  instead of a broken download.
- The route is GET (so the browser can stream it), admin-token gated,
  checksum-validated before spending a credit, and writes **nothing** to
  `db.json` (respecting the "GET never mutates state" rule).

### Re-verify live

- For amber "checksum only" applications (e.g. APITxT was briefly
  unreachable when the jeweller applied), **↻ Re-verify live** makes a
  fresh register call (1 credit), upgrades the stored KYC snapshot
  (status, names, constitution, registration date, address, pincode,
  PAN), back-fills the partner's registered postal address, and refreshes
  both the open card and the partner table.
- Capped at 60 calls/hour per admin and recorded in the audit log
  (`gst.reverify`); the database is reloaded after the external HTTP wait
  so concurrent orders can never be overwritten.

### Auto-saved registered address

New applications now also save the registered **principal place of
business** as a top-level postal address + pincode on the partner record
(ready for pickup lists / tax invoices), separately from the KYC
snapshot. The applicant's typed city is kept as-is (their working city may
differ from the registered district).

## Costs at a glance (APITxT)

| Action | Credits |
|---|---|
| Verify GST while filling the form | 1 per new GSTIN (cached 30 days; the submit re-check is free) |
| View certificate | 1 per GSTIN, then free for 30 days |
| Re-verify live from admin | 1 per click (forced fresh) |

## Deploy (same 3-minute process)

1. hPanel → File Manager → `public_html`, upload
   **`shivaa-update-v88.zip`**, extract with overwrite.
2. Don't touch `data/` — `db.json`, `sms-config.json` and (after first
   use) the private `gst-certs/` cache all live there.
3. Hard refresh (Ctrl+F5) — admin.js cache is bumped to v88.
4. Test: Admin → Partners → **KYC details** on a live-verified
   application → **View GST certificate** should open the PDF inline;
   opening it a second time costs nothing (server cache).

Rollback: re-upload `shivaa-update-v87.zip`; no database format change.
