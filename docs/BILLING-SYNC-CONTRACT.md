# Billing Sync Contract — showroom billing ⇄ shop stock (v182)

> The contract the showroom billing app (`public_html/billing/`) uses to keep
> its counter sales in step with the shop's stock — including the Hostinger
> MySQL catalogue that v180/v181 established. Shipped with **Release 182**.
> The bridge is **dark by default**: until the owner pastes a sync key in
> Admin → Settings, every call answers `403` and nothing changes.

---

## 1. What crosses the bridge

| Direction | Call | Purpose |
|---|---|---|
| billing → shop | `POST /api/billing/stock-movement` | a counter sale / issue / return moves stock by a signed delta |
| shop → billing | `GET /api/billing/stock` | stock snapshot (sku-level) to price and invoice against |

Everything else stays inside each system: invoices, GST, customers and payments
belong to the billing app; catalogue, rates and orders belong to the shop. This
is a **doorway with one narrow pipe**, not a merge — the same law as the
`/billing/` tile in Admin → Settings.

## 2. Authentication — HMAC request signing

A single shared secret lives in the shop's settings key **`billingSyncSecret`**
(owner-pasted in Admin → Billing Software card; 16–128 chars `[A-Za-z0-9_-]`;
write-only — blank keeps the saved key, never shown back in full). The billing
app stores the same value in its own config.

Every request carries two headers:

```
X-Shivaa-Ts:        unix seconds (integer, stringified)
X-Shivaa-Signature: hex( HMAC_SHA256( secret , canonical ) )
```

Canonical string (exactly four lines, `\n` = LF, body is the **raw** request
body — empty string for GET):

```
<ts>\n<HTTP METHOD>\n<route>\n<raw body>
```

where `<route>` is the path after `/api/` with no leading slash
(e.g. `billing/stock-movement`). Example (PHP):

```php
$sig = hash_hmac('sha256', $ts . "\n" . 'POST' . "\n" . 'billing/stock-movement' . "\n" . $rawJson, $secret);
// headers: X-Shivaa-Ts: $ts · X-Shivaa-Signature: $sig
```

Rules the shop enforces server-side (do not weaken):

- signature compared with `hash_equals` (timing-safe) — wrong signature → `401`;
- timestamp must be within **±5 minutes** of server time — stale/replayed → `401`;
- no secret configured → `403` with an honest "not configured" message.

## 3. `POST /api/billing/stock-movement`

Request body (JSON):

```json
{
  "movementId": "BILL-1001-line-3",   // REQUIRED · idempotency key, ≤64 chars [A-Za-z0-9_-]
  "sku": "SHV-RG-001",                // or "productId": "p_..." (one of the two REQUIRED)
  "delta": -1,                        // REQUIRED · non-zero whole number, ±100000
  "ref": "BILL-1001",                 // optional · invoice/bill reference, ≤64 chars
  "note": "counter sale"              // optional · ≤200 chars
}
```

- `delta` is units moved: **negative = sold/issued out of stock**, positive =
  returned/restocked. Stock is clamped at 0 (never negative) and at 10 000 000.
- **Idempotent:** `movementId` is the de-dup key. A replay returns
  `200 {"ok": true, "duplicate": true, "result": {...first result...}}` and
  moves nothing. The billing app should stamp one stable id per bill line and
  retry safely on timeouts.
- Response `200`:

```json
{
  "ok": true,
  "movementId": "BILL-1001-line-3",
  "result": {
    "productId": "p_a1b2c3", "sku": "SHV-RG-001",
    "stockBefore": 4, "stockAfter": 3, "delta": -1,
    "ref": "BILL-1001", "note": "counter sale", "at": "2026-09-25T12:00:00+05:30"
  }
}
```

Errors: `400` (bad payload — message says exactly what), `404` (no product for
that sku/productId), `401/403` (auth), `429` (rate limit: 240/hour per IP).

The movement is written through the shop's ordinary save path, so it lands in
`data/db.json` **and** mirrors to Hostinger MySQL (`products.stock`) — the same
dual-write safety net as every other stock change. Every movement is recorded
in the admin audit trail (`billing.stock-movement`).

## 4. `GET /api/billing/stock`

Query params: `sku` (exact match, optional) · `limit` (default 500, max 5000) ·
`offset` (default 0). Signed like every other call (empty body).

```json
{
  "products": [
    { "id": "p_a1b2c3", "sku": "SHV-RG-001", "name": "...", "category": "rings",
      "purity": "22K", "weightG": 4.25, "stock": 3, "active": true, "status": "live" }
  ],
  "total": 78, "offset": 0, "limit": 500,
  "asOf": "2026-09-25T12:00:00+05:30"
}
```

Page with `offset`/`limit` for big catalogues (the 3-lakh plan). Staged
(`status: "pending_review"` / `"skipped"`) rows are included with their status
so the counter never invoices an unpublished piece by accident — check
`active === true` before selling.

## 5. Out of scope (on purpose — later releases, never a first step)

- Shared staff login between the two apps.
- Shop *orders* appearing inside the billing app (or vice versa).
- Catalogue/price writes from the billing side (weights/prices stay owner-typed).

When the owner wants one of these, it becomes its own reviewed release with a
contract addendum here.

## 6. Install notes for the billing app

1. Generate a long random key (e.g. `openssl rand -hex 24`) — **you** paste it
   into Admin → Settings → Billing Software → *Stock-sync key* on the shop, and
   into the billing app's config. Never send it in chat, never commit it.
2. Point the billing app at `https://shivaa.in/api/...` (same origin as the
   shop — no CORS needed for server-side PHP).
3. Clock-skew matters: keep the billing server's time NTP-synced (the ±5 min
   window rejects stale signatures).
4. On any `401`, re-check: raw-body signing (not parsed/re-serialised), the
   route string without `/api/`, and the timestamp.

---
*Release 182 · 25 Sep 2026. Implementation: `cms/api.php`
(`shv_billing_sync_auth`, `billing/stock`, `billing/stock-movement`).
Tests: `tools/mega/smoke/v182-php-run.js` P08 (signed flow, idempotency,
clamping, dark-by-default).*
