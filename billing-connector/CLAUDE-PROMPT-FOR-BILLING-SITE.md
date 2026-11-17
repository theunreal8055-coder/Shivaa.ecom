# Connect Your Live Hostinger Billing Website to Shivaa.in (2-Minute Setup)

## Step 1 — On Shivaa Admin (`shivaa.in/#/admin?tab=settings`)
1. Open **Admin → Settings → Billing Software & Two-Way Sync**.
2. Enter your live billing website URL (for example `https://your-billing-domain.com`) — the webhook URL fills in automatically as `https://your-billing-domain.com/shivaa-connector.php`.
3. Click **Generate key → Copy key**, then click **Save billing sync**.
4. Click **⬇ Download `shivaa-connector.php`**.

## Step 2 — On Your Live Billing Website (Hostinger → File Manager)
1. Upload `shivaa-connector.php` into your billing website's `public_html/`.
2. Open `shivaa-connector.php` and paste your copied sync key into line 24:
   ```php
   if (!defined('SHIVAA_SYNC_SECRET')) define('SHIVAA_SYNC_SECRET', 'shv_live_...');
   ```
   *(Optional: if your billing site uses MySQL, fill `SHIVAA_BILLING_DB_NAME`, `SHIVAA_BILLING_DB_USER`, and `SHIVAA_BILLING_DB_PASS` right below it. If left blank, it stores safely in private locked JSON files outside `public_html`.)*
3. Go back to Shivaa Admin and click **Test connection** (shows green ✔), then click **Sync existing customers & leads**.

## Step 3 — Wire Automatic Customer Saving & PDF Bill Upload

### Instant Drop-In for **Shivaa Jewels — Jewellery Software** (`sj-api.php` + `sj-billx.js` / `sj-pwa.js`)
No editing or secret pasting needed — your existing `shivaa-connector.php` stays untouched:
1. Upload `billing-connector/shivaa-hooks.php` to `public_html/shivaa-hooks.php` (next to `shivaa-connector.php`). It automatically recognizes logged-in `sj-api.php` users (Owner / Manager / Staff; blocks View-only writes) with zero extra login token.
2. Upload `billing-connector/sj-ecom.js` to `public_html/sj-ecom.js` (next to `sj-pwa.js`).
3. Open `public_html/index.html`, find `<script src="sj-pwa.js` right above `</body>`, and add **one line** right after it:
   ```html
   <script src="sj-ecom.js?v=46"></script>
   ```
4. Refresh the billing software and open **Setup → 🌐 Shivaa.in Website Sync** → tap **🔄 Sync Now**.
   - Every new Pakka GST sale bill saved in the billing software automatically uploads its Signature/Royal A4 PDF to the customer's `shivaa.in/#/my-bills` profile (matched by 10-digit mobile) and adjusts matching SKU stock.
   - Every opened bill modal gets a **🌐 Shivaa.in par bhejo** button to send or update any past bill/estimate in one tap; deleting a bill voids it on `shivaa.in`.
   - Website customers (Retail + B2B Wholesale), CRM leads, and online orders auto-sync every 60 seconds straight into `S.customers` / `S.leads` (AES-256 encrypted via `sj-api.php` across all phones & computers).
   - Live Gold 24K (`₹/10 g`) and Silver 999 (`₹/kg`) rates apply in one tap from `shivaa.in`.
   - *(If you update your billing software in Claude later, tell Claude: "Keep `<script src="sj-ecom.js?v=...">` after `sj-pwa.js` in `index.html`, keep `sj-ecom.js` in `sw.js`, and never overwrite `shivaa-connector.php`, `shivaa-hooks.php`, or `sj-ecom.js`.")*

### Generic Prompt (for other PHP/JS billing apps)
You can paste the prompt below directly into **Claude** inside your billing software project, and it will connect your exact customer/lead database and PDF bill saver automatically:

```text
My jewellery billing website (PHP + HTML + JavaScript on Hostinger) now has `public_html/shivaa-connector.php` installed and connected to our Shivaa e-commerce website (`https://www.shivaa.in`). Please wire it into my billing software with these exact hooks (do NOT edit SHIVAA_SYNC_SECRET or expose it in HTML/JS):

1. AUTO-SAVE WEBSITE LEADS, CUSTOMERS & ONLINE ORDERS INTO MY BILLING SOFTWARE:
   Create `public_html/shivaa-hooks.php` (automatically loaded by `shivaa-connector.php`) and implement:
   - `function on_shivaa_customer(array $c, string $event): void`
     Upsert the customer into my billing software's main customer table/file (match by 10-digit `$c['phone']` or `$c['id']`). Fields available: `id`, `name`, `phone`, `email`, `address`, `city`, `state`, `pincode`, `dob`, `anniversary`, `role`, `firm`, `gstin`, `pan`, `blackMember`, `blackDiscountPct`, `createdAt`.
   - `function on_shivaa_lead(array $l, string $event): void`
     Save incoming website leads into my leads list (and if my app has no separate leads table, save as a lead/prospect customer matched by `$l['phone']` / `$l['leadId']`). Fields available: `leadId`, `channel` (`contact`, `service_request`, `custom_order`, `metal_exchange`, `partner_application`, `savings_plan`, `rate_alert`, `abandoned_cart`, `newsletter`), `name`, `phone`, `email`, `city`, `gstin`, `summary`, `message`, `budget`, `amount`, `createdAt`.
   - `function on_shivaa_order(array $o, string $event): void`
     Record website e-commerce orders (`order.created`, `order.paid`, `order.updated`). Fields: `id`, `invoiceNo`, `customerName`, `phone`, `email`, `status`, `paymentStatus`, `paymentMethod`, `shippingAddress`, `items` (`[{sku, name, purity, weightG, qty, unitPrice, lineTotal}]`), `subtotal`, `discount`, `gst`, `shipping`, `total`, `amountPaid`, `createdAt`.

2. AUTO-SAVE EVERY CUSTOMER PURCHASE BILL (PDF) TO THEIR SHIVAA E-COMMERCE PROFILE (`#/my-bills`):
   Whenever a bill/invoice is created or updated for a customer with a 10-digit mobile number:
   - Option A (if PDF is generated in PHP):
     ```php
     define('SHIVAA_CONNECTOR_LIB', true);
     require_once __DIR__ . '/shivaa-connector.php';
     $sync = shivaa_push_bill_pdf([
       'externalId'   => (string)$billId,      // stable ID so edits replace cleanly without duplicates
       'billNo'       => (string)$invoiceNo,
       'billDate'     => $billDateYmd,         // YYYY-MM-DD (or DD-MM-YYYY)
       'store'        => 'Shivaa Jewels · Jaipur',
       'customerName' => (string)$customerName,
       'phone'        => (string)$customerPhone,
       'email'        => (string)($customerEmail ?? ''),
       'amount'       => (float)$grandTotal,
       'items'        => $items,               // array of ['sku'=>..., 'name'=>..., 'purity'=>..., 'weightG'=>..., 'qty'=>..., 'amount'=>...] OR summary string
       'adjustStock'  => true,                 // automatically deducts matching SKU stock on shivaa.in
       'pdfBytes'     => $pdfBinaryString,     // OR 'pdfPath' => '/path/to/invoice.pdf'
       'filename'     => $invoiceNo . '.pdf',
     ]);
     ```
   - Option B (if PDF is generated in browser JavaScript with jsPDF / html2pdf / pdfmake):
     ```js
     async function syncBillPdfToShivaa(bill, pdfBlob) {
       const fd = new FormData();
       fd.append('file', pdfBlob, (bill.billNo || 'invoice') + '.pdf');
       fd.append('externalId', bill.id || bill.billNo);
       fd.append('billNo', bill.billNo);
       fd.append('billDate', bill.date); // YYYY-MM-DD
       fd.append('customerName', bill.customerName);
       fd.append('phone', bill.phone);
       fd.append('amount', String(bill.grandTotal));
       fd.append('items', JSON.stringify(bill.items || []));
       fd.append('adjustStock', '1');
       const res = await fetch('/shivaa-connector.php?action=push_bill', {
         method: 'POST',
         body: fd,
         credentials: 'same-origin',
       });
       return res.json();
     }
     ```
   - When a bill is cancelled or deleted, call `shivaa_void_bill((string)$billId, 'Cancelled')` (PHP) or `POST /shivaa-connector.php?action=void_bill` with `{ externalId: bill.id }` (JS) so voided bills are removed from the customer's profile.

3. OPTIONAL — LIVE GOLD/SILVER RATES & STOCK SYNC:
   - Fetch live Shivaa 24K/22K/18K gold & silver rates via `shivaa_get_rates()` (PHP) or `GET /shivaa-connector.php?action=live_rates` (JS).
   - Pull any missed events on dashboard load via `POST /shivaa-connector.php?action=catchup`.
```
