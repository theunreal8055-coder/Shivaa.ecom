# SHIVAA v114 — deploy note

Upload the contents of `shivaa-update-v114.zip` into your `public_html` web
root (the folder that holds `index.html` and `api.php`). Overwrite when asked.
Files sit at the **root of the zip** — no `cms/` folder to move.

## What this release fixes

Checkout was throwing a PHP 8 `TypeError` on every order once the financial-year
invoice number was minted. `declare(strict_types=1)` makes `str_pad()` require a
string; the old line passed `((int)date('y')) ± 1` (an int). The whole
`try { … }` in `api.php` caught it as 500, so the shopper saw “Something went
wrong” and no order was saved.

v114 builds the GST financial year (April–March, IST — already the process
timezone) as two zero-padded **strings**:

```php
$fyStart = ((int)date('n') >= 4) ? (int)date('y') : (int)date('y') - 1;
$fy = str_pad((string)$fyStart, 2, '0', STR_PAD_LEFT)
    . '-'
    . str_pad((string)($fyStart + 1), 2, '0', STR_PAD_LEFT);
```

Invoice numbers stay `SHV/{fy}/{seq}` (example in September 2026: `SHV/26-27/0101`).

## Files in the zip

| Path | Change |
|---|---|
| `api.php` | Invoice FY uses `$fyStart` + `(string)` `str_pad` (v114) |
| `DEPLOY-v114.md` | this note |

## After upload

1. `api.php` takes effect on the next request — no restart, no migration, no
   cache buster. Existing orders keep their invoice numbers.
2. Sanity check: place a demo checkout (or hit POST `/api/orders` as a signed-in
   customer). The response should be 200 with `invoiceNo` like `SHV/26-27/…`,
   not a 500.

## Verify before you upload (optional)

```bash
node tools/mega/php-sweep/sweep.mjs    # expect: 211 routes · 0 exceptions
```

The sweep inventories every API / SPA dispatcher and flags `str_pad(int, …)`
TypeError risks under `strict_types=1`. A clean tree prints `211 routes · 0 exceptions`.

## Rollback

Re-upload the previous `api.php` from `shivaa-update-v113.zip` (or `main` before
this merge). No database change is involved; the next order would again 500 on
the old FY line.
