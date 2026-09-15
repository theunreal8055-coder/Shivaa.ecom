# Shivaa on a phone — the v118 mobile experience file

**Written:** 15 Sep 2026 · **Branch:** `arena/01a0a4a8-shivaa-ecom` (from `main` @ `ea2d48b`)
**Reads with:** [`ARENA-STATE.md`](ARENA-STATE.md) · [`HANDOFF.md`](HANDOFF.md) · [`MEMORY.md`](MEMORY.md) · [`docs/AGENT-HANDOFF.md`](docs/AGENT-HANDOFF.md)

> **Status: PLAN + GUIDE. Nothing in Parts 1–2 and Part 5 is live yet.** Everything
> described as "already working" was measured in this checkout today. Everything
> described as "we can do next" is a proposal with numbers attached — no code has
> been changed and nothing has been deployed by writing this file.

---

## WHO THIS FILE IS FOR

| Part | Reader | What it answers |
|---|---|---|
| **Part 1** | You — the owner (no technical words) | What is already good, what more we can do, what you gain, what you have to do |
| **Part 2** | Your customers' phones | What has been fixed for them lately, in shop language |
| **Part 3** | The next engineer / agent | The same list as an engineering backlog with file evidence and pass/fail gates |
| **Part 4** | Anyone before a release | How we prove it works — and the rules that stop us from breaking the live shop |
| **Part 5** | You, for a decision | What to build first — pick from the menu |

---

# PART 1 — For the owner (plain language)

## 1.1 The one-line summary

Your site is already **well-built for phones** — bottom navigation, safe-area
handling for notched screens, swipe galleries, a sticky "Add to Cart" bar, WhatsApp
chat, offline shell. What is still missing is mostly **weight and delivery**: the
photos are shipped at full size, the first screen waits for code before it can
appear, and the phone never gets offered "install the shop". Those are the changes
that make a phone feel *butter*, and they are all measurable.

## 1.2 What the last few releases already gave your phone customers

| Already live | Why the phone customer feels it |
|---|---|
| **v117 "butter"** (15 Sep) | Tapping the banner dots/arrows no longer throws the page down the screen. Fonts went from one 354 KB stuck file to three small loadable files. About 310 KB of CSS and 110 KB of JavaScript moved out of the first screen's way. Sections below the fold stop rendering off-screen on phones. |
| **v116** | Category menu, carousel, quick view and the payment messages were repaired for phones; 44 px touch targets; `touch-action` tuning so taps register first time. |
| **v115** | All 17 category tiles came back; a fresh page can no longer run old code ("the update changed nothing"); quick view works on weak data. |
| **v114** | Checkout stopped throwing a 500 error on the invoice number — phones can complete a purchase again. |
| **Ongoing** | Bottom tab bar (Home / Shop / Rates / Wishlist / Account), sticky price + Add-to-Cart bar on product pages, film posters that don't auto-download on data, WhatsApp chat button, installable-app manifest, offline page, capped photo cache on the phone. |

## 1.3 The six updates worth doing next (in the order I'd do them)

### ① Right-size the photos — the single biggest win
**Plain:** every phone currently downloads the *full-size* studio photo, even for a
tiny thumbnail in the grid. Nothing else on this list comes close to this in
customer-felt improvement.
**Measured today:** the ring photos alone are **69.5 MB across 356 files** (average
200 KB, biggest 480 KB); `cms/images` is **215 MB**. Just scrolling one 65-piece
shop page can pull **~13 MB** of photos (**~25 MB** if every "flip" second photo
loads). There is **no** `srcset`, **no** WebP/AVIF, and **no** resize step anywhere
— confirmed by search, zero occurrences.
**Fix:** generate 2–3 smaller copies per photo (phone-thumb / phone-large / desktop),
serve WebP with the JPEG as fallback, and let the browser pick. The flip photo stays
— it just becomes a light preview instead of a full studio file.
**You gain:** the grid appears in roughly **a quarter of the data time**; customers
on daily-data packs stop paying for pixels they cannot see; the 3-lakh catalogue
becomes feasible instead of impossible.
**You must do:** nothing. It is a server-side pipeline + template change.

### ② Make the first screen appear before the code arrives
**Plain:** today the page body is empty until a big script has downloaded, run, and
asked the server for prices. On a phone that is the difference between "instant" and
"is it loading?".
**Measured today:** the critical path is **≈316 KB of compressed code** before the
first product can be painted (113 KB render-blocking CSS + 196 KB JavaScript +
7 KB HTML), against a **522 KB** `app.js`. The first-screen hero images are not
pre-loaded and carry no priority hint, while a *lower* carousel slide does — so the
browser is being told to prioritise the wrong picture.
**Fix:** put a light static "skeleton" of the hero into `index.html` (so the first
pixel needs no script), pre-load the real hero image with high priority, and split
the per-page CSS/JS so the home screen does not carry the code for 30 other pages.
**You gain:** the shop looks open almost immediately on 4G; it stops feeling like an
app waiting for permission.

### ③ Offer "Install Shivaa" on the phone
**Plain:** your app icon can sit on a customer's home screen — no Play Store, no fee.
You already carry everything needed (app manifest, icons, shortcuts, offline shell),
but **nothing ever asks**. Search confirms the install event is never listened for.
**Fix:** a small, dismissible "Add Shivaa to your home screen" chip after a customer
has visited twice, plus the correct three-tap instructions for iPhone (Safari has no
automatic prompt).
**You gain:** the cheapest repeat-visit tool in Indian mobile commerce — opens
full-screen, loads from the phone, and looks like a real app. Perfect for the
festive season and for B2B jewellers who come back daily for rates.

### ④ Prepare the catalogue for 3,00,000 designs
**Plain:** right now the shop draws **every** matching product at once. That is fine
for 65 rings. At thousands, a mid-range phone will freeze or crash.
**Measured today:** `cms/js/app.js` writes the whole filtered list into the page in
one go (`shopGrid.innerHTML = list.map(...)`), with no paging and no windowing.
**Fix:** show 24 at a time and load the next batch as the customer scrolls, plus ask
the server for one page of results at a time.
**You gain:** the promise of a 3-lakh catalogue becomes real on a ₹9,000 phone —
which is exactly the phone your customers use.

### ⑤ Stop paying for bytes twice (compression + cache headers)
**Plain:** your server compresses files the older, heavier way and does not mark
versioned files as "never ask again".
**Measured today:** `.htaccess` uses `mod_deflate` only (no Brotli), and versioned
assets carry a 7-day cache with no `immutable` flag even though every file already
has a `?v=` stamp.
**Fix:** turn on Brotli (Hostinger's LiteSpeed supports it) with deflate as the
fallback, and mark `?v=` files as long-cache.
**You gain:** roughly **20–30% fewer bytes on every cold visit** and fewer repeat
downloads — free speed on the same hosting plan.

### ⑥ Respect small data plans and weak signal
**Plain:** a "Lite mode" for customers on 2G or a limited pack — smaller photos, no
background animation — plus honest behaviour when the signal drops mid-tap.
**Measured today:** the site is already careful (films do not auto-load on data,
photos are cached on the phone up to 60 images), but it ignores the browser's
"save data" setting, and a wishlist/cart tap made in a tunnel is simply lost.
**Fix:** honour the save-data signal, add a visible Lite switch, and queue the tap so
it goes through when the signal returns ("saved, will sync").
**You gain:** trust in small towns and on trains — the customer never loses a
wishlist tap, and never silently burns 10 MB.

## 1.4 The smaller polish list (do them when the six above are done)

- iPhone: 8 places still use the old full-height rule that makes the page jump when
  Safari's address bar hides — switch to the modern viewport units.
- Search box: give the phone keyboard a proper "search" key and a friendly way out
  when nothing matches (offer WhatsApp) instead of a dead end.
- Bottom tab labels are 9.5 px — below the comfortable reading floor; a nudge to
  ~11 px costs nothing and helps older customers.
- Zoom on the product photo is the moment trust is won (hallmark, finish, stone
  colour). We should verify pinch/double-tap zoom behaves on every Android browser
  family we can test, and make the zoom hint obvious.
- "HUID on this piece" deserves a visible chip on the product page, not only in the
  menu — it is your strongest honesty signal on a phone.

## 1.5 What I will never do without your word

- Never invent a weight, purity, price, certificate, rating or analytics number.
- Never publish a change that failed its automated checks — the live shop updates
  from `main` within about 5 minutes, so an unchecked merge *is* a live outage.
- Never touch the live database by hand; products only through the proper flow.
- Never add a fake "success" message for a payment, courier or notification that
  isn't real.

---

# PART 2 — For the customer (paste-ready for WhatsApp / Instagram)

> Copy this block as-is when you want to tell customers what has improved.
> Lines are short on purpose so they read well on a phone.

**✦ Shivaa on your phone — now smoother**

Namaste 🙏 We have been working on how Shivaa feels on a mobile phone.

**What is better now**
• Tapping the banner dots and arrows no longer jumps the page — the slider stays put.
• Pages open faster: the heavy fonts and slow scripts moved out of the way.
• Categories, quick view and the product photos work on slow data too.
• Checkout is fixed and completes properly.
• Your gold rate stays live while you browse.

**Put Shivaa on your home screen (no app store needed)**
• *Android (Chrome):* open shivaa.in → tap the ⋮ menu → **Add to Home screen** → Install.
• *iPhone (Safari):* open shivaa.in → tap the **Share** box → scroll → **Add to Home Screen** → Add.
• You then get one tap to open the shop, full screen, with your wishlist and cart kept.

**Small tips to enjoy it more**
• Swipe the product photo left/right to see all four shots; tap the **2** badge on a
  card to see the second photo; pinch or tap to zoom into the craft.
• Save your ring size once (Ring Size Guide) — Shivaa then marks the rings that come
  in your size while you shop.
• Tap ♥ on anything you love; use **Compare** to place up to four pieces side by side
  and share the shortlist on WhatsApp.
• Watching rates? Keep **Live Rates** in the bottom bar — it updates through the day.
• On limited data: product films wait for your tap instead of downloading themselves.
• Slow signal? Your last-viewed catalogue and rates still open.

**If something ever looks old or stuck**
1. Close **all** Shivaa tabs and open shivaa.in fresh (pull down twice to refresh), then
2. Phone Settings → Site settings → find shivaa.in → **Clear & reset**.
That clears a stale copy from the phone. Nothing is lost — your account, wishlist and
orders live on your login, not on the phone.

Support: **+91 89050 05921** · Support@shivaa.in · Instagram @shivaa.jewels

---

# PART 3 — Engineering backlog (the same list, with evidence)

Everything below was measured in this checkout on 15 Sep 2026. **Nothing is
implemented yet.**

| ID | Item | Evidence (measured today) | Fix | Acceptance gate | Effort | Risk |
|---|---|---|---|---|---|---|
| **M1** | Responsive image derivatives | `grep -rn srcset --include='*.js' --include='*.html'` = **0**; `<picture>` = **0**; `.webp`/`.avif` on disk = **0**; `cms/images` = **215 MB**; `images/designs/rings` = **356 files / 69.5 MB** (mean 200 KB, median 174 KB, max 480 KB); sources are 1024² and 1653×2205 | Build `400/800/1200` WebP + JPEG fallback; add `srcset`/`sizes` in `productCard()`, quick-view, PDP gallery (`gal-slide`), hero/banners | Every product `<img>` has ≥2 candidates; a 65-card grid cold-loads **≤4 MB**; visual QA: no shot differs in framing | M | Low (additive; originals untouched) |
| **M2** | First-paint skeleton + LCP priority | `cms/index.html` `<main id="view"></main>` is empty; all 4 first-screen images are injected by `js/app.js`; `<head>` pre-loads fonts only; the only `fetchpriority="high"` sits on a *below-the-fold* carousel slide | Static hero/skeleton markup + inline critical CSS; `<link rel="preload" as="image" fetchpriority="high">` for the home hero (art-directed via `media`); move the priority hint to the real first image | First content painted with JS disabled; hero request starts in the first ~100 ms | M–L | Medium (touches boot order — gate with smoke) |
| **M3** | Split the critical path | Blocking CSS **500 KB raw / 113 KB gzip** (8 files); critical JS **647 KB raw / 196 KB gzip** (8 files); `app.js` alone **522 KB / 156 KB gzip**; ≈**316 KB gzip** before first product paint | Per-route CSS/JS chunks (the pattern already exists for aurum/motion/boost via `js/v117.js`); keep only shell + home styles blocking | Home critical path ≤ **90 KB gzip CSS** and ≤ **120 KB gzip JS**; smoke `v113b-check.js` + `v117-check.js` still green | L | Medium–High (biggest blast radius) |
| **M4** | Install to home screen | `manifest.webmanifest` complete (standalone, portrait, 3 icons, 3 shortcuts) but `beforeinstallprompt` appears **nowhere** in `cms/` | Dismissible install chip (2nd visit, sessionStorage-guarded) + iOS Share→Add instructions; reuse `/images/icons/apple-touch-icon.png` | jsdom test: chip appears on the 2nd visit and never again after dismiss; `display:standalone` verified on a real Android device | S–M | Low |
| **M5** | Catalogue scale | `cms/js/app.js` (~line 2428): `$('#shopGrid').innerHTML = list.length ? list.map(...).join('') : emptyHtml` — whole list, one write; no paging/windowing anywhere | Windowed render (first 24 + `IntersectionObserver` sentinel) and server-side paging on `/api/products` | 2,000 fake SKUs render in a QA profile with no long task > 200 ms; DOM nodes stay bounded | M | Low–Medium |
| **M6** | Compression + cache headers | `cms/.htaccess`: `mod_deflate` only; `ExpiresByType` 7 days for css/js, no `Cache-Control: immutable` despite `?v=` on every asset | `mod_brotli` with deflate fallback; `immutable` on `?v=` files; confirm gzip/brotli actually on | `curl -H 'Accept-Encoding: br'` returns `content-encoding: br`; Lighthouse "efficient cache policy" passes | S | Low |
| **M7** | Save-data / Lite mode | `prefers-reduced-data` appears **nowhere**; `MEDIA_MAX = 60` photo cache and the film tap-to-load gate already exist (credit where due) | Honour `prefers-reduced-data` + visible Lite switch (small derivatives, no ambience, no auto-films) | With the signal forced on, page weight drops ≥50% and the switch persists | S–M | Low |
| **M8** | Offline action queue | SW caches `/api/products` + `/api/rates` and answers navigations from the shell; cart/wishlist writes are plain `fetch` → a tunnel tap is lost | Queue mutations in IndexedDB + Background Sync where available, with a "saved, will sync" toast | Airplane-mode add-to-wishlist → reconnect → server has it exactly once (idempotent key) | M | Medium (data writes — needs care) |
| **M9** | iOS viewport units | 8 × `100vh` remain (`css/styles.css` ×7, `css/boost.css` ×1) while 7 × `100dvh` already exist | Replace with `dvh`/`svh` (+`vh` fallback) | No layout jump when Safari's address bar hides/shows on iOS | S | Low |
| **M10** | Search keyboard + dead ends | `#searchInput` has no `enterkeyhint`; recent searches already exist (`sh_recent`) | `enterkeyhint="search"`, `type=search`, and a "no match → ask on WhatsApp / call" panel | Zero-result search always offers a next step; keyboard shows the search key | S | Low |
| **M11** | Legibility floor | `.mnav a { font-size: 9.5px }` (`css/mobile.css`) for the bottom-tab labels | Raise to ~11 px (re-check 5-tab fit at 320 px) | Fits at 320 px with no truncation; contrast check passes | S | Low |
| **M12** | Photo zoom trust pass | Zoom/pan/double-tap logic exists (`qv-photo.qv-zoom`, `gal-wrap` handlers); "swipe / drag" hint present | Device matrix pass (Chrome/Samsung Internet/Mi Browser/UC/Safari); make zoom obvious; keep pinch from fighting the page | Zoom in/out and swipe-to-next confirmed on ≥4 real Android browsers | S–M | Low |
| **M13** | HUID chip on the PDP | `pd-stamp` ("HUID check guide →") exists; the trust content still sits mostly in the menu | Surface a per-piece HUID/purity chip beside the price | Chip visible above the fold on 360×640; copy stays truthful (guide, never "BIS verified") | S | Low (copy must stay honest) |
| **M14** | Guardrail tests | `tools/mega/smoke/v113b-check.js` (32) + `v117-check.js` (27); SW precache ↔ `index.html` parity is *hand*-maintained — the exact class of bug that caused v115 | Add a mobile-budget check: critical-path gzip bytes, `srcset` present on every product card, derivative existence, and an automatic SW ↔ `index.html` `?v=` comparison | Suite fails loudly on a byte-budget regression or a stale precache entry | M | Low |

**Suggested order:** M1 → M2 → M4 → M6 → M5 → M14 (then M3, M7–M13).
That order front-loads what customers feel, keeps the risky boot-order work (M3)
behind a green harness, and lands the catalogue-scale work (M5) before the 3-lakh
import begins.

---

# PART 4 — How we prove it (and the rules we don't bend)

1. **Harness first.** `node tools/mega/smoke/v113b-check.js` (32 assertions) and
   `node tools/mega/smoke/v117-check.js` (27) must be green *before* a merge and
   again *on the built zip* (`SMOKE_CMS=<overlay-dir>`). New mobile work adds
   assertions in the same style (M14) — the harness has already caught three real
   bugs that a code read missed.
2. **Byte budget, not vibes.** M1/M3/M6 are judged against numbers
   (grid cold-load ≤ 4 MB; home critical path ≤ 90 KB gzip CSS / 120 KB gzip JS).
   Measured in this file, re-measured after the change.
3. **One version stamp everywhere.** Every `?v=` in `cms/index.html` bumps together
   (currently 11 refs), `cms/sw.js` `SHELL` bumps (`shivaa-shell-v117` → `v118`) and
   its precache list matches `index.html` exactly — the v115-class bug.
4. **Release shape** follows the existing pattern: `cms/` edits → `DEPLOY-v118.md` →
   `shivaa-update-v118.zip` → PR into `main` → the Hostinger cron auto-deploys
   `cms/` within ~5 minutes.
5. **Live truth rule.** The 65 products (PGS5001–PGS5065), 4 shots each, are the
   verified catalogue. Nothing in a mobile change may alter product data, prices or
   images — the M1 pass adds *derivatives beside* the originals, never overwrites.
6. **Never fabricate.** No invented analytics, ratings, certificates or gateway
   states — including in any "before/after speed" claim we publish.

---

# PART 5 — What I verified today, and what needs your call

**Verified in this checkout (commands available in the session log):**

- No `srcset`, no `<picture>`, no WebP/AVIF, no server-side resize path — **0 occurrences**.
- `cms/images` = **215 MB**; ring photos = **356 files / 69.5 MB**, mean **200 KB**, max **480 KB**.
- Critical path = **113 KB gzip blocking CSS** + **196 KB gzip critical JS** + 7 KB HTML.
- `index.html` provides an empty `<main>`; first-screen images are script-injected;
  hero image not preloaded; the only `fetchpriority="high"` is on a lower carousel slide.
- No install-prompt listener; manifest/icons/shortcuts/offline shell all present and correct.
- Shop grid writes the entire filtered list in one `innerHTML` write.
- 8 × `100vh` remain (iOS jump risk); `prefers-reduced-data` unused; no offline mutation queue.
- Already good: bottom nav + safe-area, sticky PDP buy bar with price, WhatsApp FAB and
  PDP share, tap-to-load films, 60-image phone cache, offline shell + update banner,
  `content-visibility` below the fold, reduced-motion and mobile canvas guards.

**Needs your word before I build:** which items to implement as **v118** (see the menu
below). Also helpful, when convenient: a note on which Android browsers your customers
actually use (for M12), and whether the Lite-mode switch (M7) should be visible in the
menu or stay automatic.

**Not measurable from this sandbox:** real-device timings on your customers' phones
(the sandbox cannot reach shivaa.in), and any analytics-style before/after — that stays
empty until you approve a measurement method.

---

# DECISION MENU

| Choice | Contains | Give me |
|---|---|---|
| **A — Fast comfort pack** *(recommended first)* | M1, M2, M6, M9, M10, M11 | A visible speed jump with low risk |
| **B — A + install & scale** | A + M4, M5, M14 | Speed, home-screen install, ready for the big catalogue |
| **C — Everything** | All of M1–M14 | The full mobile programme, more turns, more testing |
| **D — Doc only for now** | Nothing built | This file stands as the plan; I keep it updated |

Say a letter (or pick your own items by ID) and the work starts on this branch, with
the harness as the gate before anything reaches the live shop.
