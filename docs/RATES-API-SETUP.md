# Live gold-rate API — setup guide

Written 6 September 2026. Nothing in this guide is implemented yet.
Read section 1 before spending money on any API.

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

## 2. Would the metals-api.com page you found help?

Partly. Metals-API does publish India city symbols (their site shows e.g.
`USDXAU-BANG` for Bangalore at a visible premium over plain `USDXAU`), and a
Jaipur symbol is what that blog post is selling. So yes — it would fix the
"spot instead of India" problem.

But before subscribing, note:

- **Cost.** Metals-API's entry plan is around **$19.99/month** (2,500 calls);
  their Gold tier is far higher. The blog post is marketing for those plans.
- **Provenance.** A city symbol is a vendor's derived number. As a jeweller you
  are judged against **IBJA** (India Bullion and Jewellers Association) — the
  rate your customers and competitors quote.
- **Better fit exists.** `metals.dev` has an **authority endpoint** that returns
  prices published by **IBJA and MCX** directly:
  `GET https://api.metals.dev/v1/metal/authority?api_key=…&authority=ibja&currency=INR&unit=g`
  Their plans start at **$0 (100 calls/mo)**, **$1.79/mo (2,000)** and
  **$9.99/mo (10,000)** — roughly a tenth of Metals-API's price for the data
  that matters more to you.

| Option | India-specific? | Entry cost | Verdict |
| --- | --- | --- | --- |
| **metals.dev — `authority=ibja`** | **IBJA, the Indian benchmark** | $1.79–$9.99/mo | **Recommended primary** |
| metals.dev — `authority=mcx` | MCX futures (India) | same key | Useful cross-check |
| metals-api.com — Jaipur symbol | City-level derived | ~$19.99/mo | Reasonable alternative / second source |
| Current gold-api + FX | No — spot only | free | Keep only as a last-resort input, never as the price |
| Manual admin override | Owner types the sarafa rate | free | **Already built** — keep it as the safety net |

**Recommendation: start with metals.dev at $1.79–$9.99/month, keep your
existing admin override, and only add Metals-API later if you want a second
independent source.**

---

## 3. Step-by-step setup

### Step 0 — Decide what "our rate" means (owner decision, before any code)
Write down one sentence: *"Shivaa's website 24K rate = IBJA 999 rate + X ₹/g."*
Get X by comparing IBJA's published rate against what your Jaipur supplier
quotes you, on three different days. Do not guess it, and do not keep ₹55 —
that number was sized against a spot-derived base and no longer means anything.

### Step 1 — Create the account and key
1. Sign up at metals.dev, verify email.
2. Dashboard → copy the API key.
3. Pick a plan using the quota maths in section 4 (start on Free to test).

### Step 2 — Store the key on the server, never in the repo
Your repo auto-deploys to `public_html` every 5 minutes, so a key committed to
Git is a key published to the world. Put it beside your existing sync config:

```bash
# on Hostinger, over SSH — NOT in the repo
cat > ~/.shivaa-rates.json <<'JSON'
{ "provider": "metals.dev", "api_key": "PASTE_KEY_HERE", "authority": "ibja" }
JSON
chmod 600 ~/.shivaa-rates.json
```
`api.php` reads it from outside the web root. Add `.shivaa-rates.json` to
`.gitignore` as belt-and-braces.

### Step 3 — Discover the exact response keys (one throwaway call)
The docs only show the LBMA example, so confirm IBJA's field names once:

```bash
curl -s "https://api.metals.dev/v1/metal/authority?api_key=KEY&authority=ibja&currency=INR&unit=g" | python3 -m json.tool
```
IBJA publishes fineness-wise rates (999 / 995 / 916 / 750 gold, 999 silver).
Note the actual key names from that output — the mapping in Step 4 depends on
them. **Do not assume; paste the real output into the next step.**

### Step 4 — Replace `rates_refresh()` in `cms/api.php`
Shape of the new function (field names to be filled from Step 3):

```php
function rates_cfg(): array {
  $f = getenv('SHIVAA_RATES_CFG') ?: (getenv('HOME') . '/.shivaa-rates.json');
  return is_readable($f) ? (json_decode((string)file_get_contents($f), true) ?: []) : [];
}

/** Returns ['gold24'=>float,'silver'=>float,'source'=>string] or null. Never invents. */
function fetch_india_rates(array $cfg): ?array {
  $key = $cfg['api_key'] ?? '';
  if ($key === '') return null;
  $url = 'https://api.metals.dev/v1/metal/authority'
       . '?api_key=' . urlencode($key)
       . '&authority=' . urlencode($cfg['authority'] ?? 'ibja')
       . '&currency=INR&unit=g';
  $r = fetch_url($url, 8);
  if (!$r || ($r['status'] ?? '') !== 'success') return null;
  $rt = $r['rates'] ?? [];
  $g = $rt['<24K_KEY_FROM_STEP_3>'] ?? null;   // IBJA 999 fine gold, INR/gram
  $s = $rt['<SILVER_KEY_FROM_STEP_3>'] ?? null;
  if (!$g || !$s) return null;
  return ['gold24' => (float)$g, 'silver' => (float)$s, 'source' => 'ibja'];
}

function rates_refresh(array &$db): array {
  $last = $db['rates']['last'] ?? null;
  $new  = fetch_india_rates(rates_cfg());

  if (!$new) {
    // NO SIMULATION. Hold the last known good rate and mark it stale.
    if (!$last) return $db['rates']['last'] = ['t'=>now_iso(),'source'=>'unavailable','gold24'=>null,'gold22'=>null,'gold18'=>null,'silver'=>null];
    $last['source'] = 'stale (feed unavailable)';
    $last['staleSince'] = $last['staleSince'] ?? now_iso();
    return $db['rates']['last'] = $last;
  }

  // Sanity guard: refuse a silent >7% jump; needs admin confirmation instead.
  if ($last && !empty($last['gold24'])) {
    $delta = abs($new['gold24'] - $last['gold24']) / $last['gold24'];
    if ($delta > 0.07) {
      $last['source'] = 'held (feed moved ' . round($delta * 100, 1) . '% — admin review)';
      $db['rates']['pendingReview'] = $new + ['t' => now_iso()];
      return $db['rates']['last'] = $last;
    }
  }

  $stamp = [
    't' => now_iso(),
    'gold24' => (int)round($new['gold24']),
    'gold22' => (int)round($new['gold24'] * PURITY_22),
    'gold18' => (int)round($new['gold24'] * PURITY_18),
    'silver' => round($new['silver'], 1),
    'source' => $new['source'],
  ];
  $db['rates']['last'] = $stamp;
  $db['rates']['history'][] = $stamp;
  if (count($db['rates']['history']) > 720) $db['rates']['history'] = array_slice($db['rates']['history'], -720);
  return $stamp;
}
```

Also delete `BASE_GOLD` / `BASE_SILVER` once nothing references them, so the
₹11,850 fallback cannot come back.

**Purity note:** IBJA publishes 916 (22K) and 750 (18K) rates directly. Using
IBJA's own 916 figure is more defensible than `gold24 × 0.9167` — prefer the
published value where available.

### Step 5 — Move refreshing to cron (and cap the quota)
Today `GET /api/rates` refreshes whenever the stamp is older than 11 minutes
(line 269). That is fine with a free unauthenticated feed, but with a metered
key a traffic spike burns your quota. Switch to:

1. A tiny CLI script `cms/cron_rates.php` that loads the DB, calls
   `rates_refresh()`, saves, exits. No HTTP, no auth surface.
2. Hostinger → Advanced → Cron Jobs, alongside your existing `auto_sync.php`:
   ```
   */15 * * * * /usr/bin/php /home/USER/public_html/cron_rates.php >> /home/USER/shivaa-rates.log 2>&1
   ```
3. In `api.php`, keep the lazy refresh but only as a backstop — e.g. allow it at
   most once every 30 minutes, so a bot cannot drain the quota.

### Step 6 — Set the premium honestly
With an IBJA-based feed, `jaipurPremium` becomes the small, real difference
between IBJA and your local buying rate — the X from Step 0. Change it in
Admin → Settings, and record *why* it has that value.

### Step 7 — Verify for three days before trusting it
Do **not** flip prices live the same hour. Run the cron, and each morning
compare your `/api/rates` output against (a) IBJA's published rate, (b) a public
city rate page, (c) your own sarafa quote. Log the three numbers. Only when
they agree within your expected premium should you announce live pricing.

Keep the **admin override** (`POST /api/rates/override`, already built) as the
manual brake for any day the feed misbehaves.

### Step 8 — Add the stale-rate safety rail
Because price = rate × weight, a stale rate must never quietly sell metal. In
`compute_price()` / checkout: if the rate stamp is older than N hours (owner
picks N, e.g. 6), show *"live rate updating — prices confirmed on WhatsApp"* and
hold checkout, rather than transacting at yesterday's number. Show the
`rateAsOf` timestamp next to every price. Your existing order-time
`rateSnapshot` is good design — keep it.

---

## 4. Quota maths (so you buy the right plan)

One cron call per refresh, one call per run (the authority endpoint returns gold
and silver together):

| Refresh every | Calls/month | Cheapest metals.dev plan |
| --- | --- | --- |
| 60 min | ~744 | $1.79 (2,000) |
| 30 min | ~1,488 | $1.79 (2,000) |
| 15 min | ~2,976 | $9.99 (10,000) |
| 10 min | ~4,464 | $9.99 (10,000) |
| 5 min | ~8,928 | $9.99 (10,000) |

For a retail jewellery site, **15–30 minutes is plenty** — Indian rates are
published a couple of times a day, not tick-by-tick. Start at 30 minutes on the
$1.79 plan; move to $9.99 only if you want faster.

Add the free-tier caveat: 100 calls/month is enough to *test*, not to run.

---

## 5. What I need from you to implement this

1. Which provider you want (my recommendation: metals.dev, IBJA authority).
2. The API key — **paste it into `~/.shivaa-rates.json` on the server yourself**;
   do not send it in chat and do not put it in the repo.
3. The output of the Step 3 discovery call, so I can map the exact field names.
4. Your answer to Step 0: IBJA + how many ₹/gram = Shivaa's rate.
5. Confirmation of whether the live `db.json` has real orders priced with the
   old formula — if yes, that needs a separate conversation about the invoices
   already issued.

I cannot test any of this from the build sandbox — outbound network is blocked
here (`api.metals.dev`, `api.gold-api.com` and `shivaa.in` all fail to connect).
All verification has to run on the Hostinger server.
