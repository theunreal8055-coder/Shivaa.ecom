# DEPLOY v183 — Supplier (Manufacturer) Programme, confidential by design

**Release:** 183 · **Built:** 1 Oct 2026 · **Live before this runs:** 181 (v182 was built but never deployed)
**Status:** built + gated; **deploy only after the owner's explicit yes**
**Source commit:** `e8ca0fe` · **Prerequisite:** live **181 or newer**

**What this release is, in one line:** a supplier section on the website —
manufacturers apply through the access gate (OTP-verified), the owner approves
them in Admin → 🏭 Suppliers, each gets a **server-minted unique code**
(`SHV-SUP-XXXXX`), designs are linked to the maker **internally**, and every
order item on a supplier's design is **routed to that supplier's portal**
(`#/supplier`) as a work ticket — while **customers and jeweller partners never
see whose design it is**.

> **The secrecy rule (owner's law):** the origin keys
> (`supplier`, `supplierId`, `supplierCode`, `supplierSku`, `supplierName`,
> `supplierNotes`, `supplierPayout`, `costPerGram`, `weightSource`) are stripped
> in **two mechanical chokepoints**: `hallmark_product()` in `cms/hallmark.php`
> for every public product payload, and `shv_public_order()` in `api.php` for
> every public order row **and** its item snapshots. No customer-facing or
> partner-facing screen is left to convention.

---

## Package

**File:** `shivaa-update-v183.zip`
**Size:** 484,877 bytes · **SHA-256:**
`504d4b88239eb1143e1cc4fd0f4e7261892ceb7b8d8aca8a30b695d8184dea7d`
**Layout:** root of the ZIP = overwrite into `public_html/` (same as v165+).
**7 files:**

| File | Bytes | What changed |
|---|---:|---|
| `api.php` | 559,271 | Supplier book + code mint/rotate (`SHV-SUP-*`, case-insensitive uniqueness) · `suppliers/apply` (OTP proof, dup email/mobile guards) · `suppliers/me` · `supplier/designs` · `supplier/media` · `supplier/orders` (+ work statuses) · admin `suppliers`/`designs`/`assign`/`orders` · order-routing hook on checkout · fulfilment-only projection (no retail math) · `suppliers` + `supplyOrders` dual-mode overlay & mirror · confidentiality strips · two owner switches (`supplierDropShip`/`supplierSeesCustomer`, both default **false**) · rel 183 |
| `hallmark.php` | 12,031 | the public product pass now strips the maker (one choke point) |
| `index.html` | 32,047 | stamps → 183 (56× `?v=183`, `__SHIVAA_REL=183`) · **For Manufacturers** door in the drawer + footer |
| `js/app.js` | 680,737 | `APP_REL = 183` · public `#/suppliers` (apply → reveal your code) · supplier portal `#/supplier` (orders · designs · new design · profile) · supplier login routes to the portal, header pill follows |
| `js/admin.js` | 341,662 | 🏭 **Suppliers** tab: the book (codes, approve/suspend, rotate code, copy), design assignment, routed-order board, drop-ship rules; pending badge shows from Overview too |
| `sw.js` | 13,069 | SHELL/REL 183, 51× `?v=183`, MEDIA deliberately stays `shivaa-media-v168` |
| `upgrade-sql.php` | 37,110 | Reconciler: `suppliers` table (**`UNIQUE KEY uq_supplier_code`**) + `supply_orders` ledger + indexes, upserts, count verification |

Not packaged (never are): `.htaccess`, `data/`, `uploads/`, `config.php`,
`setup-mysql.php`, billing files.

**v182 skipped on purpose?** No — this ZIP is a superset. v183's `api.php` /
`upgrade-sql.php` carry v182's Phase-4 catalogue intake + billing bridge as
well, and `upgrade-sql.php` applies **every** pending column batch in one run.
If the owner wants one deploy instead of two, install v183 directly: live
**181 → 183** is a supported path and the installer report will name both
sets of checks.

---

## Before you start

1. **Full `public_html` backup** from hPanel (Files → Backups).
2. Confirm live is 181+: open `https://shivaa.in/api/version` — you should
   see `"rel": 181`.
3. Have your **CMS admin password** ready for `upgrade-sql.php`.

---

## Install (extract — 2 minutes)

1. Download `shivaa-update-v183.zip`.
2. hPanel → File Manager → `public_html/` → **Upload** the ZIP →
   **Extract** it there, allowing overwrite.
3. Until step B runs, the site keeps serving from the JSON safety net if you
   browse in between — nothing goes down.

## B. Reconcile the new schema (one URL, ~1 minute)

1. Open **`https://shivaa.in/upgrade-sql.php`**
2. Enter your CMS admin password, press **Run**.
3. It walks through and reports each step. What matters on this release:
   - **Backup first** — timestamped copy of `db.json` in `data/backups/`;
   - **Schema** — creates `suppliers` (unique code index) and
     `supply_orders` (three indexes), plus any v182 columns still pending;
   - **Upload** — syncs every collection, including the supplier book and
     the routed supply tickets;
   - **Verify** — count checks, including
     `Suppliers: N (unique codes) · Routed supply tickets: N`;
   - **Done** — clears the mirror flag so every collection engages MySQL.

---

## Using the supplier programme

### The owner (Admin → 🏭 Suppliers)
1. **Screen applications** — new applications arrive with status *pending*;
   the nav badge shows how many (from any tab, including Overview).
2. **Approve** — the manufacturer can now open `#/supplier`; **Suspend**
   freezes the portal without touching their code.
3. **Rotate code** — only if a code must be re-issued; the new code is
   rewritten onto their designs and the old one is retired, and the change is
   audited. **Never re-issue a code to a different firm** — codes are the
   permanent trace on every order slip.
4. **Assign designs** — pick a supplier, tick designs, assign. This is the
   only place the maker's name is ever visible to a person.
5. **Routed orders** — every paid order item on a supplier's design appears
   here and in that supplier's portal, with statuses
   `routed → acknowledged → in_production → ready → dispatched → delivered`
   (plus `hold`/`cancelled`). You may force any status. The **🖨 button prints
   the internal supplier job slip** — the one sheet that carries the supplier
   code so support and finance can trace a listing or a transaction. It is
   marked internal and must never travel inside a parcel: the customer-facing
   packing slip and label carry no supplier field at all.
6. **Portal rules** — two switches, both OFF by default:
   - *Supplier drop-ships to the customer* — when ON, the supplier sees the
     delivery address to ship to; when OFF, the maker ships to the Shivaa
     workshop and the customer's details stay with Shivaa.
   - *Supplier sees customer name* — cannot act alone; it only unlocks
     together with drop-ship.

### The manufacturer
- Applies at **`https://shivaa.in/#/suppliers`** (OTP-verified mobile, firm
  details, GSTIN optional-but-checked), agrees to the declaration, and
  immediately sees their **reserved unique supplier code**.
- After approval: **`#/supplier`** — routed orders (with strict "you may only
  advance one step" workflow), their designs and review status, a new-design
  form (weight, purity and weight source are **mandatory** — the system
  refuses to invent them), and their profile.

---

## Verify (3 minutes)

1. `https://shivaa.in/api/version` — expect:
   - `"rel": 183`
   - `"stamp": { "matched": true, "index": 183, "app": 183, "sw": 183 }`
   - `"db": { "driver": "mysql", "mode": "mysql", "reason": "", ... }`
2. **The mystery-shopper test (the owner's own rule).** Open the storefront,
   order one assigned design, then look at the product page, the cart, the
   order confirmation and *Your Orders*: **no maker name, code, SKU or
   weight-source string anywhere** — only Shivaa. Then open that supplier's
   portal: the work ticket is there, with the design and the quantity.
3. Admin → 🏭 Suppliers shows the book and the routed ticket.
4. `https://shivaa.in/#/suppliers` renders the manufacturer door; the drawer
   and the footer both link to it.

---

## Rollback (any time, 30 seconds)

- In `config.php` set `db_driver => 'json'` and save. Reads and writes revert
  to the JSON file instantly — no supplier data can be lost, because JSON is
  the write-truth and the SQL tables are a mirror.
- Code rollback: restore your `public_html` backup taken before extracting.
- Never deploy an older tree over this one (forward-only from 183). The
  `suppliers`/`supply_orders` tables are additive and safe to leave in place.
