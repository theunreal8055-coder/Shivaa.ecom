# Shivaa — Supplier Programme: the confidentiality contract (v183)

> **Owner's law:** *"customers and jewellers must not know whose design this
> is — this should all be a secret."*

This document is the engineering answer. It says exactly where the secret is
kept, how it is enforced mechanically (not by convention), what the supplier
themselves can and cannot see, and how the owner can change the policy later
without re-plumbing anything.

---

## 1. Who knows what

| Party | Knows the maker? | Can act on it? |
|---|---|---|
| Shopper (retail customer) | **No** — never | — |
| Jeweller partner (B2B) | **No** — never | — |
| Supplier portal (`#/supplier`) | **Yes, only their own book** | sees their own designs, their own routed tickets, their own code |
| Admin (owner side) | Yes — that is the point | assigns designs, approves firms, sees every routed ticket |

The secrecy direction is **buyers → maker**, not the other way around: a
supplier knows their own firm and their own work. Nothing on earth lets
supplier A see supplier B's designs, tickets or code.

## 2. Where the secret is kept (the data)

Internal-only fields, on the product row:

```
supplier        (legacy maker-name free-text field — legacy, still stripped)
supplierId      the routing key (permanent; a supplier's id never changes)
supplierCode    the human code (SHV-SUP-XXXXX) — snapshot for slips/support
supplierSku     the maker's own design number
supplierName    denormalised firm name for the admin book
supplierNotes   owner's private notes about the firm
supplierPayout  internal commercial arrangement
costPerGram     landed cost — never public
weightSource    intake provenance ("supplier declaration — …")
```

And on an order, per item: the same `supplierId` / `supplierCode` snapshot
(frozen at checkout, plus `supplierSku`), and on the order row:
`supplyRouted: [supplierId,…]`.

## 3. The two chokepoints (how it is enforced)

**Rule: nothing public is allowed to be assembled anywhere else.**

1. **Products** — every customer/partner-facing product payload is built by
   `hallmark_product()` (`cms/hallmark.php`), which ends with:

   ```php
   if (function_exists('shv_supplier_strip')) $product = shv_supplier_strip($product);
   ```

   `shv_supplier_strip()` (api.php) removes every key in the list above. The
   storefront list, product page, suggestions, wishlist, catalogue and search
   all answer through this one function — adding a new public surface that
   returns raw `db.products` rows would be a bug, and the suites fail if the
   call site changes (v164-check pins the call at `hallmark.php`; v183-check
   S05 asserts the strip).

2. **Orders** — `shv_public_order()` (api.php) strips the order row **and each
   `items[]` snapshot** before any customer/partner response, so nothing that
   went through checkout can be read back with the maker attached.

Supplier-facing lists are built by **whitelist projection**, not by deleting
fields: `shv_supplier_order_lines()` copies only what the workshop needs to
make the piece — `{productId, sku, supplierSku, name, img, qty, weightG,
purity, metal, size, engraving, hsn}` plus the line status. That is why a
supplier cannot see retail math even by guessing a query — the numbers were
never copied.

## 4. What the supplier DOES see (and why that is not a leak)

A routed ticket shows:

- the design (name + image + **their own** SKU), quantity, weight, purity,
  metal, size/engraving/HSN where the order carries them,
- a ticket status and the supplier's own notes,
- the workshop as the ship-to (default), or the customer's delivery address
  **only if the owner has switched on drop-ship**.

It never shows: unit price, rate per gram, making charge, GST, discount,
order totals, the other items on that order, the buyer's other orders, or any
other supplier's anything.

## 5. The two owner switches (Settings → supplier portal rules)

Both are strict booleans in the settings PUT, both **default OFF**:

| Switch | OFF (default) | ON |
|---|---|---|
| `supplierDropShip` | the maker ships to the **Shivaa workshop**; the buyer's address is never revealed | the maker ships to the buyer; **then** the delivery address is revealed to that supplier for that ticket |
| `supplierSeesCustomer` | buyer identity stays with Shivaa | unlocks the buyer's name — **only when drop-ship is also ON** (a reveal cannot act alone) |

Turning a switch is a one-line admin action; nothing in the data model moves,
and turning them back off re-hides the fields on the next read.

## 6. The unique code (why it is not a leak either)

- `SHV-SUP-XXXXX`: alphabet without `I/L/O/U` so it cannot be misread; minted
  server-side; **case-insensitive** uniqueness both in code and by
  `UNIQUE KEY uq_supplier_code` in MySQL.
- Reserved when the application is filed (the applicant is shown their
  reserved code so they can quote it to support) and permanent once issued.
- It appears **only** on the Admin → 🏭 Suppliers book, the supplier's own
  portal, and the **internal supplier job slip** (`🖨` on a routed order,
  `ShivaaAdmin.supPrint`) that the owner prints for the workshop/accounts —
  the one sheet that carries the code so support and finance can trace a
  listing or a transaction. The customer-facing packing slip / shipping label
  (`admPrintDoc`) carries no supplier field at all: a slip that travels inside
  a parcel can never reveal the maker.
- Rotation exists for the rare case a code must be re-issued; it rewrites the
  `supplierCode` snapshot on that supplier's products, is audited, and can
  never be pointed at a different firm.

## 7. If the owner later chooses to credit the maker

The owner has said the secrecy may last "for now", and may later want
"Made by X" on the design. Nothing here forecloses that:

- The mapping (`supplierId` on the product) is the source of truth and is
  never deleted — only hidden at the serialisation step.
- Crediting later = a presentation change in the two chokepoints (e.g. emit
  `madeBy` from `supplierName` when `supplierId` is a *visible* supplier) plus
  a settings switch. No data migration, no re-linking.

## 8. Regression guards (where the law is tested)

- `tools/mega/smoke/v183-check.js` — S05/S06 assert the strip helpers and the
  chokepoints exist and are wired.
- `tools/mega/smoke/v183-php-run.js` — P05/P06 run the real routes and scan
  the raw JSON of product list, product page and order payloads for any of
  the secret keys; P07 asserts a second supplier sees zero of supplier A's
  tickets and that a customer is refused the supplier route.
- `tools/mega/php-sweep/sweep.mjs` — sweeps every route for shape exceptions
  (240 routes on v183).
