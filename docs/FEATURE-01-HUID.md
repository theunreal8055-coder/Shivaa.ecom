# Feature 1 — BIS hallmark / HUID lookup, real-data-only rebuild

Updated: 6 September 2026 · UI asset version: **39**

## Release boundary

**The safe guide and recording workflow are implemented; automatic live BIS
verification is NOT connected.** This is not a claim that a live API integration
has shipped, nor that any item has been verified. The owner has approved production release; publication and live
confirmation are pending.

This checkout contained no item-level HUID records and no documented, authorised
BIS lookup integration. Do not guess an endpoint, scrape/reverse-engineer the
BIS Care app, treat a format check as authenticity, or fill missing records from
catalogue purity, a SKU, a barcode or store identity.

BIS identifies HUID as a six-character alphanumeric item identifier and directs
consumers to the BIS Care app's “Verify HUID” feature. Its FAQ also distinguishes
individual articles and detachable parts. [4](https://www.bis.gov.in/hallmarking-overview/hallmarking-faqs/hallmarking-faq/?lang=en)

The official app information page and the two download destinations were checked
on **6 September 2026**:

- https://www.bis.gov.in/bis-apps/?lang=en
- https://play.google.com/store/apps/details?id=com.bis.bisapp
- https://apps.apple.com/in/app/bis-care-app/id6443724891

That date is a **link/guidance review date**, never an item verification date.
No real HUID was queried during development. Test codes exist only in clearly
labelled, isolated QA fixtures; they are not known BIS records.

## Customer experience

- Open **HUID Check** in navigation or `#/hallmark`; also linked from the footer,
  FAQ and product pages.
- The availability warning is visible before entry: **on-site live BIS
  verification is not connected**.
- Input accepts exactly six ASCII letters/numbers. Only case and surrounding
  ASCII spaces/tabs/line breaks are normalised. No character substitution,
  punctuation stripping, Unicode lookalikes, guessed digits or truncation.
- An accepted format results in **“Format accepted · NOT verified”**, not a green
  badge, certificate, “found” response, purity or registration details.
- Official BIS Care/app-store links are a handoff, not an embedded live lookup.
  The user completes the check there; this site does not receive the result.
  No HUID is appended to these links and no result is inferred from opening them.
- The explicit copy action copies only the entered code. Clipboard failure says
  so and selects the text for manual copying; it does not claim success.
- Input edits, clearing and navigation invalidate pending/previous results.
  The request has an eight-second timeout. Offline, malformed, forged and
  unexpected responses remain unavailable, never “not found” or “verified”.
- No application lookup history, analytics events, verification timestamps,
  external requests or HUID URL parameters are created. A stateless POST sends
  the entered code to Shivaa for format checking; it is not sent to BIS.
  Infrastructure logging remains an operator responsibility: do not enable
  request-body logging on this endpoint.

## Staff records (optional, blank by default)

Go to **Admin → Products → HUIDs** on the relevant product.

1. Add a row only for an actual physical piece or detachable part. A design/SKU
   can represent multiple pieces; a recorded code is not an allocation promise.
2. Enter the HUID actually read, a public piece/part label, and a private source
   note explaining where it was read. Do not add personal/customer information.
3. Save. The public label stays **“Recorded · not verified”**. There is no
   verification checkbox, generated HUID, certificate upload or sample autofill.
4. Remove incorrect rows and save to clear them. All rows may be removed.

Data is stored under `product.hallmark` only when an authorised staff member
saves. It is marked `schemaVersion: 1`, `provenance: staff_entered` with server-
owned revision, editor identity and save time. These are administrative metadata,
not evidence of a BIS check.

- A row requires `huid`, `pieceLabel` (1–80 characters) and `sourceNote` (1–300).
  At most 50 rows per product. Unknown fields, control characters, missing
  provenance and duplicate codes are rejected.
- Duplicate HUIDs across products, including inactive products, are rejected.
- Optimistic revisions prevent one HUID editor overwriting another stale HUID
  editor; the dedicated save re-reads under the CMS file lock and replaces the
  DB atomically. This does not redesign all legacy CMS write transactions.
- Public product list/detail/similar/wishlist responses expose only the HUID and
  piece label, always unverified. Source notes and staff audit metadata remain
  behind admin authentication.
- Generic product POST/PUT requests cannot set `hallmark*`, `huid*` or `bis*`
  fields. Existing automation's ordinary product/specification patches remain
  supported. Integrations sending full GET product objects must omit these
  read-only projections and use the dedicated endpoint for actual references.
- Unrecognised legacy hallmark fields/verification flags are not promoted into
  evidence. Staff are asked to re-enter substantiated references.
- No migration, seed, changes to `cms/data/db.json`, supplier data or media.

## API contract

| Endpoint | Behaviour |
| --- | --- |
| `GET /api/hallmark/status` | 200; `official_handoff`, `automaticLookupAvailable: false`, `reason: not_connected`; official links, no record/source/check timestamp |
| `POST /api/hallmark/lookup` | JSON object containing **only** string `huid`; accepted format returns **503** with `status: unavailable`, `formatValid: true`, `verified: false`, `record/source/checkedAt: null` |
| Invalid lookup request | 400 malformed/object/extra-field error; 413 above 1 KiB; 415 wrong content type; 422 invalid HUID type/format; 405 wrong method |
| `GET /api/admin/products/{id}/hallmark` | Admin-only staff entries and revision; 404 for missing product |
| `PUT /api/admin/products/{id}/hallmark` | Admin-only JSON `entries` and integer `expectedRevision`; 200 saved staff references; 409 duplicate/stale edit; 422 invalid fields; 413 above 100,000 bytes |

All JSON responses are `Cache-Control: no-store`. Lookup/status run **before**
loading the DB and do not call the legacy rate engine or any external service.
A 503 for an accepted code is the **intended disconnected behaviour**, not a
successful official lookup and not evidence that BIS itself is down.

## What is required before enabling automatic live verification

This release intentionally has **no guessed provider contract or generic URL/key
switch** that could turn arbitrary JSON into a BIS result. A future integration
needs a separate reviewed change with:

- Documented official or explicitly authorised API access, permission to display
  and retain its data, and real response/error/status semantics.
- Server-side credentials configured outside Git and public settings. Never ask
  for secrets in chat, expose them to browser code, or add a mock production mode.
- Strict TLS, an allowlisted endpoint, bounded requests, abuse/rate controls and
  no redirects to arbitrary hosts.
- Exact queried/returned HUID matching; real source and check time; explicit
  missing fields; proper treatment of inactive/revoked/mismatched/not-found
  records, outages, authentication failures and stale/cached results.
- Tests against the documented contract before any “verified” display is added.
  A local/source-note match or an uploaded document must never unlock it.

## Related claim cleanup and scope

Removed unconditional BIS/certificate guarantees from product gallery/perks,
product certification text, generated product WhatsApp copy, home/FAQ/brand
hallmark copy and the invoice footer. Removed two hard-coded testimonials that
asserted hallmark/certificate evidence rather than rewriting their quotations.
Existing catalogue descriptions are preserved and labelled as catalogue claims,
not verification. Stored records/reviews/PDFs/images were not edited.

**This is not an audit or implementation of the other roadmap features.** Legacy
rates, payment, courier, notifications, legal/GST, review and analytics behaviour
elsewhere still needs its own authorised, evidence-led work. Do not infer that
it is production-integrated or substantiated from the presence of existing UI.
Feature 13 comparison and shared shortlist behaviour is preserved.

## Test / deploy

```sh
php -l cms/hallmark.php
php -l cms/api.php
node --check cms/js/app.js
node --check cms/js/hallmark.js
node --check cms/js/admin.js
php qa/test_hallmark.php
python3 qa/test_hallmark_api.py
# Requires Playwright + a Chromium installation:
python3 qa/test_hallmark_ui.py
```

`PHP_BIN` can specify an alternative executable; `BROWSER_BIN` can specify a
Chromium path. Validated with actual PHP 8.2.32 running through PHP.wasm,
Chromium/Playwright, and isolated temporary databases. No Hostinger/BIS live
end-to-end verification was performed.

Latest local results: **67 PHP unit checks**, **8 HTTP test groups** and **53
browser checks** passed, including Compare + Shareable Shortlist regression.
PHP/JavaScript syntax checks passed and the tracked catalogue DB is unchanged.

The tests run the production PHP code using `qa/php_router.php`; they do not use
the old Python API shim. The test server is torn down afterwards. A read-only
preview can use the same router on an **isolated** CMS copy with
`SHIVAA_PREVIEW_READ_ONLY=1`; it rejects writes except the stateless lookup and
labels unchanged repository rates as a snapshot, never inventing a refresh.
Never deploy the QA router, test fixtures, scratch workspace or tools.

Deploy all changed/new `cms/` code together via the normal release workflow,
without replacing `data/` or `uploads/`. If copying manually, put `hallmark.php`
and new JS/CSS assets in place before `api.php` and `index.html`. All nine JS/CSS
cache references are version 39. Confirm the public route, deliberately
unavailable API result, missing-data PDP, authenticated editor and compare page
on the deployed host before declaring the safe workflow live. Do **not** label
the automatic integration complete until the requirements above are met.
