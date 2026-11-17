# DEPLOY — v253 (“Bridge”)

> **Status:** Packaged 16 Nov 2026 on branch `arena/a20b3005-shivaa-ecom` — **NOT deployed**. Only deploy after explicit owner approval.
>
> - **Package:** `shivaa-update-v253.zip` (cumulative — includes every change from v237 through v253, including v250 “Still”, v251 “Alive” and v252 “Silk”)
> - **Files:** `777` (v252 had `774`; adds `billing-sync.php`, `docs/shivaa-connector.php.txt`, `css/v253.css`)
> - **Size:** `45,562,801` bytes
> - **SHA-256:** `8f752196d38dce6e6d16ceaa4e59f53ad2ed102f18034fd45aacdef9fcd837f6`
> - **Data safety:** `cms/data/db.json`, customer orders, private `.shivaa-private-bills` vault, root `.htaccess` and `config.php` are **never** touched by this ZIP.

---

## 1 · What v253 ships

1. **Two-Way Showroom Billing Bridge (`cms/billing-sync.php` + `cms/api.php`):**
   - **Website → Billing (automatic, 0 ms shopper delay):** Every customer signup/profile/address/Shivaa Black/B2B update, every lead across all 9 channels (contact, appointments/services, custom orders, metal exchange, jeweller KYC applications, Swarna Nidhi enrolments, rate alerts, abandoned carts, newsletter), and every online order (`order.created`, `order.paid` with GST `invoiceNo`, `order.updated`) queues in `billingOutbox` and fires a signed HTTPS webhook **after** the shopper's HTTP response finishes, plus signed pull/catch-up routes `GET /api/billing/{rates,stock,customers,leads,orders,events}` and `POST /api/billing/events/ack`.
   - **Billing → Website (automatic purchase PDF bills + counter stock):** `POST /api/billing/bills` (HMAC-signed JSON base64 or `multipart/form-data`) verifies real `%PDF-`/image magic bytes, stores files `0600` in `.shivaa-private-bills` outside `public_html`, normalizes Indian `DD/MM/YYYY` dates, deduplicates by `externalId`, optionally deducts SKU stock (`adjustStock` / `deductStock`), and auto-links by 10-digit mobile to the customer's **`#/my-bills`** profile (View & Download only — even if a walk-in customer signs up weeks later). Also adds `POST /api/billing/bill-void`, `DELETE /api/billing/bills/{externalId}`, and `POST /api/billing/stock-movement` (`delta` or `setStock`, single or batch).
   - **Security:** Dark by default (`403` until a sync key is saved), HMAC-SHA256 with ±300 s timestamp window and constant-time `hash_equals`, write-only masked secret (`••••`), SSRF-safe public-IP DNS-pinned HTTPS webhooks on ports `443`/`8443` with zero redirects, zero secrets exported.
2. **Owner Control Center (`cms/js/admin.js` + `cms/css/v253.css`):**
   - **Admin → Settings → Billing Software Sync (`#billingSyncCard`):** Set Billing Website URL + Webhook URL, one-click `Generate key` / `Copy key`, 5 independent sync toggles, `Download shivaa-connector.php`, `Copy setup code for billing site`, `Test connection`, `Sync existing customers & leads`, `Retry queued`, `Disconnect`, and live sync log.
   - **Admin → In-store Bills:** `⚡ auto · billing` badge on synced bills.
   - **Zero shopper overhead:** `admin.js` remains lazy-loaded (0 B added to shopper JS); v252 performance preserved (`css/shivaa.min.css` 8,807 rules verified 1:1, `app.min.js` & `rel.min.js` sha256-verified).
3. **Drop-In Hostinger Connector for the Billing Website:**
   - `billing-connector/shivaa-connector.php` (also downloadable directly from **Admin → Settings**) — works with both **MySQL** (`shivaa_synced_customers`, `shivaa_synced_leads`, `shivaa_synced_orders`, `shivaa_sync_state`) and **private JSON** (`.shivaa-billing-sync`), supports `shivaa-hooks.php` callbacks (`on_shivaa_customer`, `on_shivaa_lead`, `on_shivaa_order`), PHP SDK (`shivaa_push_bill_pdf()`, `shivaa_push_stock()`, `shivaa_get_rates()`, …), and authenticated JS bridge.
   - Companion guides: `billing-connector/CLAUDE-PROMPT-FOR-BILLING-SITE.md` and `docs/BILLING-SYNC-CONTRACT.md`.

---

## 2 · Installing on `shivaa.in` (when approved)

1. Back up `public_html/data/db.json` from Hostinger File Manager first.
2. Verify `sha256sum shivaa-update-v253.zip` matches `8f752196d38dce6e6d16ceaa4e59f53ad2ed102f18034fd45aacdef9fcd837f6`.
3. Upload and extract `shivaa-update-v253.zip` into `public_html/` on `shivaa.in` (overwrite shipped app files; `data/`, `.shivaa-private-bills/`, root `.htaccess` and `config.php` stay untouched).
4. Confirm `https://www.shivaa.in/api/version` reports `"rel": 253`.

---

## 3 · Connecting Your Live Billing Website (2 minutes)

1. Open `https://www.shivaa.in/#/admin?tab=settings` → **Billing Software Sync**.
2. Enter your live billing website URL (the webhook URL auto-fills to `https://<your-billing-domain>/shivaa-connector.php`), click **Generate key → Copy key**, and click **Save billing sync**.
3. Click **Download shivaa-connector.php**, upload it to your billing website's `public_html/` on Hostinger, paste the copied key into `SHIVAA_SYNC_SECRET` (and optionally add your billing site's MySQL credentials in the 4 lines right below it; leave blank for automatic private JSON storage).
4. Back on Shivaa Admin → Settings, click **Test connection** (confirms green handshake + latency + storage mode), then click **Sync existing customers & leads** for the initial one-time import.
5. To auto-push every customer purchase PDF bill into their Shivaa `#/my-bills` profile (and map incoming leads/customers directly into your billing app's own tables), paste `billing-connector/CLAUDE-PROMPT-FOR-BILLING-SITE.md` (or click **Copy setup code for billing site**) into the Claude project for your billing site.

---

## 4 · Rollback

Re-extract the prior release package (`shivaa-update-v252.zip`, sha256 `6a6b57c2d0d9b585f45a399d7dc0fb7172c6d22758ba3ac03e59a317083306db`, or the currently deployed package). `data/db.json` and `.shivaa-private-bills/` remain intact; extra `billing*` keys are harmlessly ignored by older builds.
