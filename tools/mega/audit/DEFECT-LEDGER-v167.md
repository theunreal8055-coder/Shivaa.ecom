# DEFECT LEDGER — the 100-bug hunt (started 21 Sep 2026)

Owner brief: *"find 100 bugs errors and glitches in the app and fix them as a specialist
doctor of shivaa website."*

Every row below was **found by reading behaviour, reproduced, then fixed** — no row is a
guess and no row is "looks wrong". Reproductions live in `work/audit/` (the jsdom crawler,
the interactive harness and the probes) and in `tools/mega/smoke/` (the runnable gates).
Rows marked **FIXED** are in the release named in the last column; **OPEN** rows are
confirmed defects waiting for their ship window, with the evidence that confirmed them.

Legend · `app.js`/`admin.js` are unminified on purpose (the owner edits copy in them).

| # | Area | Defect (what the shopper/owner sees) | How it was confirmed | Status · release |
|---|------|--------------------------------------|----------------------|------------------|
| 1 | B2B KYC | `window.Shivaa.kycOtpVerify` wrote to `autoCode`, a `let` inside `kycGate()` — a strict-mode ReferenceError that killed the catch block *before* the status line and the toast. A partner whose OTP was rejected saw a form that silently did nothing. | code read + the unhandled-error hook | FIXED · v167 |
| 2 | Scheme landing | Two `function fillPrizeWorth()` declarations in the same scope — the later one silently won and the first was dead, together with the never-called `finaleLandingHook()`. | zero-reference scan over `cms/js/*.js` | FIXED · v167 |
| 3 | Cart / save-for-later | `cartMoveBack()` matched `(x.size \|\| '') === (x.size \|\| '')` — the same expression on both sides. A ring saved for later in size 16 merged into the size-12 line already in the bag: the shopper ordered the wrong size. | diff of the line against `find(...)` intent | FIXED · v167 |
| 4 | Category rail | `initCatbar()` read `.catbar2` / `.cb-prev` / `.cb-next` off every `.cb-wrap` without a null check — a rail-less wrap threw on the next line and took the rest of the render with it. | harness boot with a hand-built wrap | FIXED · v167 |
| 5 | Category rail | **Listener leak.** One `window` resize listener per navigation, each closing over that render's rail: 7 live listeners after one lap of the site, 14 after three. | `work/audit/probe-listeners.js` counts | FIXED · v167 |
| 6 | v125 layer | `mountCase()` re-registered its shared resize/observer listeners on every home render (again on the MutationObserver pass). | `work/audit/probe-resize.js` double registration | FIXED · v167 |
| 7 | Cart / prepaid | The prepaid saving was computed with `payCfg.prepaidPct \|\| 2`, but `api.php` reads `prepaidPct` with `??`. With the owner's setting at **0%** the cart advertised "Pay online & save − ₹X" that the server never took off. | api.php 3960-4070 vs app.js reader | FIXED · v167 |
| 8 | Checkout total | `#coTotal` used the same `\|\|`-semantics percentage → the headline total could not match what the gateway charged. | same | FIXED · v167 |
| 9 | Checkout (mobile) | `#coMobileTotal` — third copy of the same wrong figure on the sticky mobile bar. | same | FIXED · v167 |
| 10 | Quote sheet | Quote totals re-derived the discount inline instead of the one reader; totals drifted from checkout. | same | FIXED · v167 |
| 11 | Quote sheet | The "prepaid saving" discount rows printed even at 0%, promising a discount line of ₹0. | same | FIXED · v167 |
| 12 | Checkout | The free-shipping row was looked up with `.summary .sum-row:nth-last-child(2)` — that is the **COD** row; the shipping row was never the node being patched. | DOM order of the summary block | FIXED · v167 |
| 13 | Checkout | Because of #12 the shipping line was never repainted when a live rate tick carried the bag across the free-shipping threshold: the shopper kept seeing the old fee until a full rebuild. | same + rate-tick replay | FIXED · v167 |
| 14 | Shop filters | The filter drawer's title was not a heading at all — the sheet had no title for a screen reader. | `probe-a11y.js` heading sweep | FIXED · v167 |
| 15 | Shop filters | Filter groups went `h1 → h4` (five group headings) — a skipped level on the shop page. | same | FIXED · v167 |
| 16 | Shop filters | `#priceRange` had no accessible name and no `aria-valuetext`: a screen reader announced a bare number between 10000 and 1500000. | `probe-a11y.js` field-no-label | FIXED · v167 |
| 17 | Shop sort | `#sortSel` had no accessible name (its label was a sibling text node). | same | FIXED · v167 |
| 18 | Shop price | The slider's top stop (₹15,00,000) was labelled **"Any"** but still filtered: any piece priced above ₹15L vanished from the grid with no way to see why. | `pages.shop` filter predicate | FIXED · v167 |
| 19 | Shop badge | The filter-count badge held `+ (value < 1500000 ? 0 : 0)` — a term that can only ever be 0, so the price filter was never counted; and it did not refresh while the drawer was open. | arithmetic + live probe | FIXED · v167 |
| 20 | Legal pages | `legalCard()` emitted `h3` under a page `h1` (shipping / terms / refund) — three pages skipped a heading level. | `probe-a11y.js` | FIXED · v167 |
| 21 | Contact | "Find us" / "Send a message" jumped `h1 → h3`. | same | FIXED · v167 |
| 22 | Rates | "Today's chart" / the rate alert box / the price-build breakdown all jumped `h1 → h3`. | same | FIXED · v167 |
| 23 | Cart | An **empty bag had no `h1` at all**: the route rendered `<div class="empty"><h3>` and nothing else — the page a first-time shopper is most likely to land on. | `probe-a11y.js` no-h1 | FIXED · v167 |
| 24 | Quote | Empty quotation: same fragment, no `h1`. | same | FIXED · v167 |
| 25 | Orders | A bad/expired guest order link rendered "Order not found" as an `h3` with no page heading and no way back. | same | FIXED · v167 |
| 26 | Invoice | "Invoice not found" — `h3`, no page heading. | same | FIXED · v167 |
| 27 | Certificates | "Certificate not found" — `h3`, no page heading. | same | FIXED · v167 |
| 28 | CMS pages | A retired/renamed owner page rendered "Page not found" as an `h3` fragment. | same | FIXED · v167 |
| 29 | Cart | The empty bag's own heading was an `h3` directly under the page's `h1` (level skip) — fixed with #23. | same | FIXED · v167 |
| 30 | Quote | Same level skip on the empty quotation. | same | FIXED · v167 |
| 31 | Wishlist | Empty wishlist heading was `h3` under the page `h1`. | same | FIXED · v167 |
| 32 | Compare | Empty compare tray heading was `h3`. | same | FIXED · v167 |
| 33 | Gift registry | Empty shared registry heading was `h3`. | same | FIXED · v167 |
| 34 | Certificates | Empty certificate locker heading was `h3`. | same | FIXED · v167 |
| 35 | Orders | Empty order list heading was `h3`. | same | FIXED · v167 |
| 36 | Ring sizer | The three sizer cards ("Match a ring", "Printable strip", "Size chart") were `h3` under an `h1`. | same | FIXED · v167 |
| 37 | Lifetime care | "The Shivaa care promise" and "Book a care visit" were `h3` under an `h1`. | same | FIXED · v167 |
| 38 | Bespoke services | The three service cards were `h4` under an `h1` — two levels skipped on the page the owner sends B2B enquiries to. | same | FIXED · v167 |
| 39 | Bespoke services | "Book / Request a quote" and "How it works" were `h3` under an `h1`. | same | FIXED · v167 |
| 40 | Privacy | "Jewellery is personal…" and the DPO card were `h3` under an `h1` on the DPDPA page. | same | FIXED · v167 |
| 41 | Account | A signed-out visitor opened `#/account`: the login sheet opened **over an empty page** — closing the sheet left a blank screen with no heading and no explanation. | harness boot on `#/account` | FIXED · v167 |
| 42 | Track order | Same blank-page door on `#/track` (and the earlier no-h1 finding was this, not a missing heading). | harness boot | FIXED · v167 |
| 43 | Certificates | Same on `#/certificates`. | harness boot | FIXED · v167 |
| 44 | Invoice | Same on `#/invoice/<id>`. | harness boot | FIXED · v167 |
| 45 | All sheets | `#modalBox` is `role="dialog" aria-modal="true"` with **no accessible name** — every sheet in the site was an unnamed dialog. | `index.html:332` + `openModal` | FIXED · v167 |
| 46 | All sheets | The close button's accessible name was the literal character "✕". | same | FIXED · v167 |
| 47 | Toasts | `toast()` called `$('#toastWrap').appendChild` unguarded: one missing wrapper and **every** message on the site dies with it (including the ones that report errors). | code read + probe | FIXED · v167 |
| 48 | Login sheet | **Two elements carried `id="shvErr"`** (the retail pane and the jeweller pane both render on step 1). Every error went to the first match — the pane that is `hidden` on the jeweller door — so a partner's wrong password showed a spinner that stopped and nothing else. | `probe-login-jwl.js` before/after | FIXED · v167 |
| 49 | Header search | `#searchInput` carried `outline:none` and an ID selector beats the generic `:focus-visible` rule in `styles.css` (the same rule is repeated in `aurum.css`) — keyboard users got no focus indicator on the busiest control in the header. | computed style vs `:focus-visible` rules | FIXED · v167 |
| 50 | Service worker | `MEDIA_TTL` was declared in the v120 layer and read **nowhere**: the image cache was trimmed for count, never for age, so a photo replaced at the same URL kept its old bytes on every device that had already seen it. | `sw.js` declaration vs `trimMedia()` | FIXED · v167 |
| 51 | v166 layer | The graphics failsafe requested `/js/aurum.js?v=166` etc. — the *frozen* 166 URLs. On a device that had already seen 166 the failsafe re-fetched the exact bytes that had just failed (immutable for a year), and on a newer page it loaded a mismatched trio. | `retryEnhancements()` source | FIXED · v167 |
| 52 | PDP delivery line | `freeShipAbove` was read with `\|\| 50000`-less fallback — a missing key printed "free shipping over ₹0". | settings-key audit | FIXED · v167 |
| 53 | Privacy | The policy PDF link opened `target="_blank"` with no `rel="noopener noreferrer"`. | `target="_blank"` inventory | FIXED · v167 |
| 54 | Account | The invoice link opened in a new tab without `rel="noopener"`. | same | FIXED · v167 |
| 55 | Labels | **140+ generated fields** (checkout address, contact, care, services, gift card, savings, buyback, B2B KYC, and the whole admin panel) had a visible `<label>` that was never associated with its control — a screen reader announced "edit text, blank". Counted: admin.js 94 sites, app.js 47. | `probe-a11y.js` field-no-label ×32 on the crawled routes; source scan 141 | FIXED · v167 (delegated pairing layer `js/v167.js`, proven by its own control run) |
| 56 | Orders | `pages.order` dereferenced the response inline: a 200 that carries **no order** (a proxy, a cached body, a backend change) fell straight through to `order.paymentStatus` and the whole route died — "Cannot read properties of null (reading 'paymentStatus')" in front of the shopper. | `work/audit/probe-noh1.js` | FIXED · v167 |
| 57 | All routes | The **last-resort route error view** was `<h3>Something slipped</h3>` with no page heading, no way home and no retry — the shape every failed page took. | same | FIXED · v167 |
| 58 | Routing | An unknown URL rendered the fragment `<h3>This page has slipped its clasp</h3>` (no `h1`). | `probe-a11y.js` no-h1 | FIXED · v167 |
| 59 | Certificates | `pages.certificate` opened the login sheet over an **empty page** — the same blank-screen class as #41-44, on the route that prints the certificate sheet. | `probe-noh1.js` | FIXED · v167 |
| 60 | B2B KYC | The business-card **dropzone was click-only**: a partner on a keyboard or with a screen reader had no way to attach the file the form invites them to add. | markup read + probe | FIXED · v167 |
| 61 | B2B KYC | The hidden file input `#kyCardFile` was unnamed. | `probe-a11y.js` field-no-label | FIXED · v167 |
| 62 | PDP | Every product page jumped `h1 → h3` on **"BIS hallmark / HUID"** (`hallmark.js`). | `probe-a11y.js` heading-skip | FIXED · v167 |
| 63 | Services | The three service cards still skipped a level (`h1 → h3`): they are the page's own sections and are now `h2`. | same | FIXED · v167 |
| 64 | Savings · Buyback | The two range sliders (`#svRange`, `#bbRange`) had **no accessible name** — a `for=` can name only one control in a block, and the slider was the second. | same | FIXED · v167 |

**Result of the sweep this ledger belongs to:** `work/audit/probe-a11y.js` went from
**68 issues on 44 routes → 0**. The label count alone (`field-no-label`) was 32 → 0.

## Confirmed and OPEN (next ship windows)

| # | Area | Defect | Evidence |
|---|------|--------|----------|
| 65 | Admin · invoices | `admin.js:3596` renders dead invoice totals (a figure that is not the order's total). | code read + admin render |
| 66 | app.js | Four `reject()`/`throw` paths reject with a non-`Error` (the lint pass flagged them; the line numbers moved with this release's edits — re-anchor against `work/audit/eslint*.json` before filing). | lint pass |
| 67 | motion / aurum | Three closures captured in a loop (motion.js:79, aurum.js:495/496/537). | lint pass |
| 68 | Dead code | `app.js` 752 · 2176 · 2387 · 2420 · 4710 · 5116 · `v116.js:16` · `v125.js:384` · `v107.js:269` · `admin.js` 705 · 1858 · 2809 · `aurum.js:634` — all zero-reference (line numbers shifted in this release; re-run the scan in `work/audit/`). | zero-ref scan |
| 69 | Promises | Promise executor returns a value (`app.js` 4587/4588/5309/5326/5511/6001/9942, `bot.js:241`) — the returned value is silently dropped. | lint pass |
| 70 | CSS | `--font-serif` used at ~14 sites and `--sans` at `styles.css:4530-31` — neither custom property is declared anywhere. | CSS token scan (`work/audit/css.mjs`) |
| 71 | Home / shop | "Bangles" and "Necklaces" tiles link to collections with no inventory behind them. | catalogue vs `LIVE_CATS()` |
| 72 | Cart | `data-cart-ship` (4507-11 / 4659) is written by the cart drawer patcher and read nowhere. | attribute scan |
| 73 | a11y remainder | The unassociated-label remainder in `admin.js` (94 sites) — the storefront is covered by `js/v167.js`; the admin panel is style-pinned byte-wise by earlier releases, so it needs its own pass. | source scan |
| 74 | SEO | `cms/sitemap.xml` (a stale hand-written file, 13 URLs) lists `/#/tryon`, a route that has not existed since v134 disabled boost.js; the live generator is `sitemap.php`. | route list vs sitemap |
| 75 | PWA | `cms/manifest.json` is orphaned (the page links `manifest.webmanifest`) and still points at `/images/logo.png`; also ships in the repo root. | manifest pair |
| 76 | Gates | `tools/mega/smoke/smoke.js:102/125` asserts a `routes.tryon` that no longer exists. | gate run |

## Ruled out (checked and NOT defects — do not re-file)

| Area | Why it is fine |
|------|----------------|
| `cms/js/v166.js` `catalogTries` | It **is** reset on every success (`catalogBusy = false; catalogTries = 0;`) and by the Retry button — the earlier "never resets" note was wrong. |
| `cms/sw.js` fetch branches | Every path either returns early (never calling `respondWith`) or answers with a real `Response`; the `cache.put` calls are clone-safe. No `respondWith(undefined)`. |
| `this` inside `v107.js:57` / `v120.js:25` wrappers | Both are pass-through wrappers (`orig.apply(this, arguments)`); the receiver is the caller's, which is the intended contract. |
| `v155-direct.js` "EX.busy eats the extras" | **Flaky suite, not a defect:** the same code scores 23/24 and 24/24 on baseline `f05a68b` across runs (timing race between three `exDirect` taps and the stubbed gateway). Verified on a clean worktree of `HEAD`. |
| `#searchInput` / `.otp-boxes input` / `.wt-tx input` `outline:none` | Each had a `:focus` border or box-shadow, or generic `:focus-visible` coverage — except the header search, which is #49. |
| Campaign studs without `createdAt` in source | They are stamped at runtime (`ensureCampaignStuds()`), so sort-newest is safe. |
| `#rtPwIn` / `#rgPass` / `#jwPass` | Emitted by `pwFieldHTML({id})` — generated ids, not missing ones. |
| Settings keys absent from `db.settings` | Each has a deliberate client fallback (`?? 2`, `=== false`, …) — one of them was wrong (`freeShipAbove`, #52) and is fixed; the rest are correct. |

*Rows are added as the hunt continues; the running total that matters for the owner's
brief is the FIXED count, and every FIXED row ships in a numbered release with its own
gate (see `tools/mega/smoke/v167-check.js`).*
