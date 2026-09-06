# Live gold-rate API — setup guide

Written 6 September 2026.
**Answer to "can we do this for free": yes — ₹0/month is enough. See section 2.**
The code is written and tested on branch `arena/01a07792-shivaa-ecom` but is
**not deployed** and must not be merged until the API key is on the server.
Read section 1 first — it explains why this matters more than it sounds.

---

## 1. The real problem: your feed is not wrong, it is *the wrong kind of rate*

`cms/api.php` (`rates_refresh()`, line 78) currently does:

```
XAU spot in USD  →  × USD/INR  →  ÷ 31.1035  =  gold24 (INR per gram)
```
Sources: `api.gold-api.com/price/XAU`, `api.gold-api.com/price/XAG`,
`open.er-api.com/v6/latest/USD`. Then `current_rates()` adds
`settings.jaipurPremium` = **₹55/gram**.

That formula produces the **international spot** price. India's gold price is
spot **plus import duty, plus IGST at customs, plus the local bullion premium**.
Those are not small.

Check the numbers in your own database:

| | Your site | Indian market, same day |
| --- | --- | --- |
| 24K, 29 Aug 2026 | **₹13,688/g** (+₹55 premium = ₹13,743) | **₹15,824/g** (₹1,58,240 per 10 g) |
| 22K, 29 Aug 2026 | **₹12,548/g** (+₹55 = ₹12,603) | **₹14,505/g** (₹1,45,050 per 10 g) |

Market figures: city gold rates published for 29 Aug and 6 Sep 2026 (24K
₹1,54,800 / 22K ₹1,41,900 per 10 g on 6 Sep across major Indian cities).

**Your site is pricing gold roughly 13% below the Indian market.**
On one 10-gram 22K ring that is about **₹19,000 of metal value given away**,
before making charges. `compute_price()` then adds making charges and 3% GST on
top of that already-too-low metal value, so the error flows into every price,
every invoice and every B2B settlement.

> Sanity note: published city rates usually exclude GST and include a local
> premium, so treat the 13% as indicative, not exact. **Benchmark against the
> Jaipur sarafa rate you actually buy at** before locking any number in.
> Also check the live `data/db.json` — the copy in this repo shows `orders: []`,
> so if no real orders have been placed yet, nothing has been lost. Confirm that
> on the server.

**A second, more serious issue: the code invents prices when the feed fails.**
Lines 92–93 do a random walk (`mt_rand`) around a hard-coded `BASE_GOLD` of
₹11,850 and label it `simulated` / `cached+sim` — and `compute_price()` sells at
it. A fabricated gold rate driving real invoices must go, regardless of which
API you pick. That is the single most important change in this document.

---

## 2. Yes — this can be done for FREE

**The key fact: IBJA publishes only twice a business day.** Tradable prices are
polled 11:30–12:00 and 16:30–17:00 IST and displayed at roughly **12:05 PM and
5:05 PM** on business days only (no Sundays or Mumbai holidays). There is no
tick-by-tick Indian rate to chase — so you need about **2 API calls a day**.

| | |
| --- | --- |
| 2 calls × ~26 business days | **~52 calls/month** |
| metals.dev **Free** plan | **100 calls/month**, no credit card, 60-second data |
| Headroom left over | ~48 calls for retries, testing and manual refreshes |

The free plan also explicitly includes **MCX & IBJA prices**, and metals.dev's
docs state *"All endpoints are available on all the plans"* — so the authority
endpoint you need is not paywalled.

**Conclusion: ₹0/month covers it.** Upgrade to $1.79/mo (2,000 calls) only if
you later want hourly refreshes, or $9.99/mo for 10-minute refreshes.

### Why not metals-api.com (the page you found)?
It would work — they do publish India city symbols. But their entry plan is
about **$19.99/month**, and a "Jaipur" symbol is a vendor-derived figure. IBJA
is the benchmark your customers, competitors and the Sovereign Gold Bond scheme
actually reference. Free and more authoritative beats $20/month and derived.

Keep metals-api on the shelf as an optional second source later.

### One more thing that makes IBJA the right base
IBJA's published rates are *"inclusive of all taxes and levies relating to
import duty, customs but **excluding GST**"*. Your `compute_price()` adds 3% GST
itself — so an IBJA rate slots in exactly where your code expects, with no
double-counting.

---

## 3. What is already built (on branch `arena/01a07792-shivaa-ecom`, NOT deployed)

| File | What it does |
| --- | --- |
| `cms/rates_provider.php` | The feed: config loading, IBJA mapping, plausibility check, jump guard, quota guard. **Never fabricates a rate.** |
| `cms/cron_rates.php` | CLI runner with `--discover`, `--dry-run`, `--force`. Refuses to run over the web. |
| `cms/api.php` | `rates_refresh()` now delegates to the provider; **the `mt_rand()` simulator and `BASE_GOLD` are deleted**; `/api/rates` gained a `freshness` block (`rateAsOf`, `ageMinutes`, `stale`, `source`). |
| `qa/test_rates.php` | 35 assertions covering every guard. |

Verified by actually executing PHP 8.2: **35/35 tests pass**, and a live
`GET /api/rates` smoke test returns HTTP 200 with all 342 products still pricing
correctly. With the network unavailable the API now answers
`"source": "stale (feed unavailable)"` and holds the last real rate — where the
old code would have invented one.

**Behaviour before you add a key:** the benchmark is disabled, so it falls back
to the old spot maths (labelled honestly) and, if that also fails, holds the
last known rate. Nothing breaks, and nothing is fabricated.

---

## 4. Step-by-step setup (all free)

### Step 0 — Decide what "our rate" means (owner decision, before any code)
Write down one sentence: *"Shivaa's website 24K rate = IBJA 999 rate + X ₹/g."*
Get X by comparing IBJA's published rate against what your Jaipur supplier
quotes you, on three different days. Do not guess it, and do not keep ₹55 —
that number was sized against a spot-derived base and no longer means anything.

### Step 1 — Get the free key
Sign up at metals.dev (no card needed), verify email, copy the API key from the
dashboard. Stay on the Free plan.

### Step 2 — Put the key on the server, never in git
Your repo auto-deploys to `public_html` every 5 minutes, so a key committed to
Git is a key published to the world.

```bash
# on Hostinger over SSH — NOT in the repo
cat > ~/.shivaa-rates.json <<'JSON'
{
  "enabled": true,
  "provider": "metals.dev",
  "api_key": "PASTE_KEY_HERE",
  "authority": "ibja",
  "currency": "INR",
  "unit": "g",
  "monthly_cap": 95,
  "max_jump_pct": 7,
  "spot_fallback": true
}
JSON
chmod 600 ~/.shivaa-rates.json
```

`monthly_cap: 95` is the safety belt — the code stops calling at 95 so you can
never blow past the free 100 and get cut off.

### Step 3 — Discover the exact field names (1 call)
```bash
php ~/public_html/cron_rates.php --discover
```
Prints the raw IBJA response plus what the mapper extracted. The mapper matches
on content (`999`, `916`, `750`, `silver`), so it should work unchanged — this
step just proves it. If the numbers look like per-10-gram figures, add
`"scale": 0.1` to the config. **The code refuses implausible values rather than
silently dividing by 10**, so a unit mistake cannot become a 10× pricing error.

### Step 4 — Dry run (0 further risk)
```bash
php ~/public_html/cron_rates.php --dry-run
```
Shows old → new for 24K / 22K / silver and writes nothing. Compare the numbers
against ibjarates.com before going further.

### Step 5 — Schedule it (2 calls/day)
Hostinger → Advanced → Cron Jobs, alongside your existing `auto_sync.php`.
Just after IBJA publishes:
```
7 12 * * 1-6 /usr/bin/php ~/public_html/cron_rates.php >> ~/shivaa-rates.log 2>&1
7 17 * * 1-6 /usr/bin/php ~/public_html/cron_rates.php >> ~/shivaa-rates.log 2>&1
```
Mon–Sat only, because IBJA does not publish on Sundays. ~52 calls/month.

### Step 6 — Set the premium honestly
`jaipurPremium` becomes the small, real gap between IBJA and your local buying
rate — the X from Step 0. Change it in Admin → Settings and record why.

### Step 7 — Verify for three days before trusting it
Each morning compare `/api/rates` against (a) ibjarates.com, (b) a public city
rate page, (c) your own sarafa quote. Only when they agree within your expected
premium should you announce live pricing. The **admin override**
(`POST /api/rates/override`) stays as the manual brake.

### Step 8 — Optional: the stale-rate brake
`/api/rates` now reports `freshness.stale` (default: older than 48 hours — long
enough to survive Sundays and festival holidays). **Nothing is blocked yet** —
deliberately, so a config slip cannot stop your shop selling. When you are ready,
we wire it to show *"live rate updating — price confirmed on WhatsApp"* instead
of transacting on an old number.

---

## 5. What I need from you

1. A free metals.dev key, pasted into `~/.shivaa-rates.json` **on the server by
   you** — do not send it in chat and never commit it.
2. The output of `--discover` and `--dry-run` (redact the key), so I can confirm
   the mapping and the numbers.
3. Your answer to Step 0: IBJA + how many ₹/gram = Shivaa's rate.
4. Confirmation of whether the live `db.json` has real orders priced with the
   old formula — if yes, that needs a separate conversation about the invoices
   already issued.

**Do not merge this branch to `main` until step 2 is done.** `main` auto-deploys
within 5 minutes, and while the change is safe (it holds rates rather than
inventing them), you want the key in place so the first live refresh pulls a
real IBJA number.

**Testing honesty:** the sandbox has no outbound network (`api.metals.dev`,
`api.gold-api.com` and `shivaa.in` all fail to connect) and no system PHP, so I
ran the code under a PHP 8.2 WebAssembly build instead: `qa/test_rates.php`
passes 35/35 and `GET /api/rates` returns HTTP 200 against the real `db.json`.
What that does **not** prove is the live provider response — that is exactly
what Step 3's `--discover` call is for, and it must run on your server.
