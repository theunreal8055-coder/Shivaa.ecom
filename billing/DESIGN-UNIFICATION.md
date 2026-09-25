# Billing ⇄ Shop Unification — design (agreed 25 Sep 2026)

The owner's requirement: one system of record for stock and revenue across the
online shop and the offline counter, with B2B and B2C reported separately and
cumulatively.

Decisions locked in conversation on 25 Sep 2026:

| Question | Answer | Consequence |
|---|---|---|
| One database or two? | **One** — the shop's MySQL | Billing tables live beside the shop's; reports are plain SQL joins, not bridge calls |
| Website stock vs physical stock | **Both are real** — some designs are ready stock, some made to order, and it varies per item | Needs a per-item fulfilment flag, not one global rule |
| What is B2B? | **Wholesale to other jewellers** | Links to the shop's existing approved partners, not a new list |
| Pieces or grams? | **Show both, everywhere** | Every stock and sales surface carries `pcs` and `g` side by side |

---

## 1. Database plan

**One database, two owners, one contained blast radius.**

- Billing's tables are created in the shop's existing MySQL database.
- **`users` and `settings` are renamed** to `billing_users` and `billing_settings`.
  Verified collision: the shop's `settings` is 58 key-value rows; billing's is a
  single row holding shop name, GSTIN and metal rates. The shop's `users` has
  roles; billing's has `email` + `password_hash`.
- **Billing gets its own MySQL user** with grants limited to:
  - full rights on `billing_*`
  - `SELECT` on `products`, `orders`
  - `UPDATE (stock)` on `products` only

  This is the mitigation for the one real risk of sharing a database: a bug in
  the billing app physically cannot rewrite shop tables.
- **The shop's existing tables are never restructured.** Additive columns only,
  through a normal release (v183+), tested, with the owner's explicit yes.
- The two orphan tables in the old Neon database (`deals`, `b2b_deals`) are not
  in the app's code at all and are dropped, not migrated.

## 2. The stock model

The two stock numbers are not the same *kind* of number, and pretending
otherwise would make one of them a lie:

```
shop  products.stock        INT  — a COUNT of pieces (default 10; the intake
                                   importer writes 1 for unique pieces)
billing inventory_items     DECIMAL — gross_wt / less_wt / stone_wt / net_wt,
                                      i.e. WEIGHTS in grams
```

So each item carries **both**, plus a flag saying how it is fulfilled:

| Field | Meaning | Moved by |
|---|---|---|
| `online_stock` (pcs) | What the website shows and sells from. Stays exactly as `products.stock` behaves today. | An online order |
| `physical_pcs` | Pieces actually in the shop | Counter sale, karigar return, purchase, owner correction |
| `physical_grams` | Fine/net grams actually in the shop | Same movements, weighed |
| `fulfilment` | `ready` or `made_to_order` | Set per item by the owner |

**The fulfilment flag is what makes "mixed" work.** For a `ready` item an
online sale really does take a piece out of the tray, so it decrements
`physical_pcs` and `physical_grams`. For a `made_to_order` item it does not —
the sale triggers production instead, and physical stock is untouched.

`fulfilment` rides inside the shop's existing `products.data_json` (which
already stores the full product row — see `shv_sql_product_values`), so the
shop needs **no schema change** for it.

### Stock ledger

One row per movement, never edited, always append-only:

```
stock_ledger: id, sku, product_id, channel, delta_pcs, delta_grams,
              ref_type, ref_id, note, created_at
channel ∈ { online_b2c, offline_b2c, offline_b2b, karigar, purchase, correction }
```

This is the part that makes the numbers trustworthy. When physical and online
disagree — and they will — the ledger shows which bill caused it instead of
leaving everyone guessing.

## 3. Channels

Neither system has this today:

- Shop `orders` has **no channel column**; every order is implicitly retail.
- Billing `invoices.type` is `GST | Estimate` — a *document type*, not a
  channel.

So `channel` is added to billing invoices with three values:

```
b2c_online   — a website order (written by the shop, read by billing)
b2c_offline  — a counter sale to a customer
b2b          — wholesale to an approved jeweller partner
```

On shop `orders` this is one new additive column, the same pattern v182 used
for `status` and `batch_id`.

## 4. B2B links to partners that already exist

The shop already runs a B2B trade desk and this must not be duplicated:

- jeweller partners are **shop users carrying a `partnerId`** (`api.php:3452`)
- they are approved through `partners/apply` — *"APPROVED jeweller partners
  only"* (`api.php:3462`)
- they are settled weekly through `settlements`, keyed
  `partnerId_weekEnding` (the composite-id fix from v181/v182)

So a billing `b2b` invoice references a shop `partnerId`. Wholesale pricing
should read the same B2B bullion anchor the shop's desk already quotes, so the
counter and the website can never sell the same gold at two different numbers.

## 5. Revenue

With one database this is a single query, not a sync:

```
cumulative revenue  = SUM(shop orders.total  WHERE paid)
                    + SUM(billing invoices.grand_total)
split by channel    = group the same rows by channel
```

The revenue section shows: total, then `b2c_online` / `b2c_offline` / `b2b`,
then cumulative — and because every stock movement is in the ledger, revenue
and stock can be reconciled against each other.

## 6. What is already done

The billing app is already ported off Neon Postgres onto MySQL
(commit `1df5b1a`, DDL `ff21f13`): 19 files, `tsc --noEmit` clean, 12 tables
generated by `drizzle-kit`. That work stands regardless of the decisions
above; the only change needed is the `users` → `billing_users` and `settings` →
`billing_settings` renames.

## 7. Still open

- Whether B2B wholesale invoices should write into the shop's `settlements`
  automatically, or stay in the billing app and be reconciled by hand.
- Whether the shop's `orders` should gain the `channel` column in the same
  release as the billing tables, or a release later.
- Opening stock: the owner's current physical holdings need to be entered once
  before the ledger means anything.
