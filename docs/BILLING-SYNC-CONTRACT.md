# Billing Sync Contract — shivaa.in ⇄ Billing Software (v253 “Bridge”)

Two-way HMAC-SHA256 authenticated bridge between the Shivaa e-commerce website (`shivaa.in`) and the owner's live Hostinger PHP/HTML/JS billing software.

- **Dark by default:** Until a sync key (`settings.billingSyncSecret`) is saved in **Admin → Settings → Billing Software & Two-Way Sync**, every `/api/billing/*` endpoint replies `403` and no outbound queue entries are created.
- **Write-only secret:** `billingSyncSecret` is never stored in code, never returned to public `/api/boot` or `/api/settings`, and masked (`••••`) even for authenticated admins.
- **Zero storefront latency:** Outbound webhooks queue in memory during customer requests and dispatch *after* `fastcgi_finish_request()` releases the HTTP response and database lock.
- **Private PDF storage:** Incoming customer purchase PDFs are verified by magic bytes (`%PDF-`, JPEG, PNG, WEBP — ≤ 8 MB, max 6 files/bill), stored with `0600` permissions inside `.shivaa-private-bills` **outside `public_html`**, linked by verified 10-digit Indian mobile, and streamed only to the authenticated customer (`#/my-bills`) or admin via `GET /api/store-bills/{id}/file/{index}`.

---

## 1 · Authentication (HMAC-SHA256)

Every request in either direction carries:

```
X-Shivaa-Ts:        <unix timestamp in seconds>
X-Shivaa-Signature: <lowercase hex HMAC-SHA256>
```

### Billing → Shivaa (`https://www.shivaa.in/api/billing/...`)

Canonical string (`\n` = LF, `<route>` has no leading slash and no query string, `<rawBody>` is `""` on `GET`):

```
<ts>\n<HTTP METHOD>\n<route>\n<rawBody>
```

For `multipart/form-data` uploads to `POST /api/billing/bills`, `<rawBody>` is replaced by:

```
multipart:<billNo>:<10-digit phone>:<sha256 hex of first uploaded file>
```

### Shivaa → Billing webhook (`POST https://<billing-domain>/shivaa-connector.php`)

Additional headers: `X-Shivaa-Event` (event name) and `X-Shivaa-Delivery` (unique delivery ID). Canonical string:

```
<ts>\nPOST\nwebhook\n<rawJsonBody>
```

Server rules enforced on both sides:
- Constant-time comparison via `hash_equals()`.
- Replay window: `|now - ts| <= 300` seconds (±5 minutes).
- Outbound SSRF protection: HTTPS-only (port 443/8443), no redirects, public IP verification + `CURLOPT_RESOLVE` DNS pinning.

---

## 2 · Endpoints on `shivaa.in`

| Method & Path | Direction / Purpose |
|---|---|
| `GET\|POST /api/billing/ping` | Signed handshake: returns release `253`, clock skew, `billStorageReady`, enabled switches & record counts. |
| `POST /api/billing/bills` | **Save/update customer purchase PDF on their Shivaa profile (`#/my-bills`).** Idempotent by `externalId` (defaults to `billNo`); matches existing or future customer account by 10-digit mobile; optional atomic SKU stock deduction (`adjustStock: true`). |
| `GET /api/billing/bills` | List synced bills (`?phone=`, `?externalId=`, `?billNo=`, `?limit=`, `?offset=`). |
| `POST /api/billing/bill-void` or `DELETE /api/billing/bills/{externalId}` | Remove a cancelled/voided bill and unlink its private PDF file(s). |
| `GET /api/billing/stock` | Catalogue & SKU stock snapshot including purity, `weightG`, stock count and live computed price breakup. |
| `POST /api/billing/stock-movement` | Single (`movementId`, `sku`/`productId`, `delta` or absolute `setStock`, `ref`, `note`) or batch (`movements: [...]`) idempotent stock adjustment. |
| `GET /api/billing/rates` | Live 24K, 22K, 18K gold & silver rates, retail rates, making-charges table and GST %. |
| `GET /api/billing/customers` | Pull retail customers & B2B partners (`?since=`, `?q=`, `?limit=`, `?offset=`). |
| `GET /api/billing/leads` | Pull unified leads across all 9 channels (`?channel=`, `?since=`, `?limit=`, `?offset=`). |
| `GET /api/billing/orders` | Pull website orders with SKU items, addresses & paid GST `invoiceNo` (`?status=`, `?since=`, `?limit=`, `?offset=`). |
| `GET /api/billing/events?after=<seq>` | Incremental ordered event stream for missed-webhook catch-up. |
| `POST /api/billing/events/ack` | Mark pulled event IDs (`{"ids": [...]}`) as delivered. |

### Admin endpoints (`need_admin` required)
- `GET /api/admin/billing/status` — live status, KPI counts, recent sync log & outbox tail.
- `POST /api/admin/billing/test` — sends live signed `billing.ping` to `billingWebhookUrl`.
- `POST /api/admin/billing/backfill` — idempotently queues existing customers, leads & orders.
- `POST /api/admin/billing/retry` — retries up to 25 pending/failed outbound events.
- `GET /api/admin/billing/connector` — downloads `shivaa-connector.php` pre-filled with the shop's canonical URL.

---

## 3 · Outbound Webhook Events (Shivaa → Billing)

Envelope:
```json
{
  "id": "bev_42_9f1a2b3c",
  "seq": 42,
  "event": "customer.created",
  "sentAt": "2026-11-16T18:30:00+05:30",
  "shop": "shivaa.in",
  "rel": 253,
  "data": { ... }
}
```

Events emitted automatically:
- `customer.created` — new OTP customer registration, B2B partner signup, guest order with verified mobile, or first login of an unsynced customer.
- `customer.updated` — profile update, address add/edit, Shivaa Black claim.
- `lead.created` — `channel` is one of `contact`, `service_request`, `custom_order`, `metal_exchange`, `partner_application`, `savings_plan`, `rate_alert`, `abandoned_cart`, `newsletter`.
- `order.created` — new website order placed.
- `order.paid` — payment verified & official GST `invoiceNo` minted (`order_issue_invoice`).
- `order.updated` — order status / dispatch update.
- `billing.ping` — Admin connection test.

---

## 4 · `POST /api/billing/bills` Payload Example

```json
{
  "externalId": "INV-2026-0412",
  "billNo": "INV-2026-0412",
  "billDate": "2026-11-16",
  "store": "Shivaa Jewels · Jaipur",
  "customerName": "Priya Sharma",
  "phone": "9876543210",
  "amount": 148500.00,
  "adjustStock": true,
  "items": [
    { "sku": "SHV-NK-014", "name": "22K Gold Choker", "purity": "22K", "weightG": 18.42, "qty": 1, "amount": 148500 }
  ],
  "pdfBase64": "JVBERi0xLjQK...",
  "filename": "INV-2026-0412.pdf",
  "notes": "Paid by UPI"
}
```

If the customer already has an account with `9876543210`, the PDF appears immediately in their **`#/my-bills`** profile with **View** and **Download** actions. If they have not signed up yet, it stays securely matched to `9876543210` and links automatically the moment they log in with OTP on `shivaa.in`.
