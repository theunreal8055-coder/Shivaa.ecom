# shivaa-website-facts-for-grok.md — Shivaa Ecom · product & tech facts

---
**v236 — THE COUNTER BOOK** (2026-10-23). Six things a working bullion counter
was still missing, each with a number behind it. Nothing here prices anything:
every figure is derived from a deal the desk already wrote, at a rate the board
already quoted.

**1 · Money on a deal.** A deal recorded its value and nothing else, so "kitna
baaki hai" had no answer. `POST /api/bullion/orders/<id>/pay` now records a
receipt — cash, UPI, RTGS or cheque, each with the reference the bank will ask
for — and the deal carries `paid`, `due` and `total = value + TCS`. Overpaying is
refused with the figure still open (`Only ₹70,792 is outstanding on BL…`), a UPI
or RTGS receipt without a reference is refused, and a cancelled deal takes no
money. `paid + due = total`, to the rupee, asserted over real HTTP.

**2 · A party ledger that does not reset.** `GET /api/bullion/ledger?from&to`
returns every deal in the window with value, TCS, total, paid and due — plus an
**opening balance carried from before the window**, so the closing figure is the
real balance and not a fresh count from zero (`closing = opening + window due`).
One function, `bullion_order_due()`, feeds the ledger, the day book, the credit
limit and the invoice, so they cannot disagree.

**3 · The tax invoice.** A dealing slip is not a tax document.
`GET /api/bullion/slips/<slipNo>/invoice` renders the slip as a GST invoice —
HSN 7108 for gold (7106 for silver), place of supply, the partner's GSTIN, TCS
206C(1H) @ 0.1 % on a buy (and an explicit "not applicable" on a sell), the total,
and the amount **in words** with Indian numbering (`Twenty-eight thousand seven
hundred seventeen rupees only`). Printed by the app, one slip at a time.

**4 · Being told, once.** A rate alert used to fire only while the page was open
and in front of the jeweller. `POST /api/bullion/alerts/claim` hands out reached
alerts **once** — `notifiedAt` is written server-side, so the second claim gets
nothing and no phone, tab or reload can announce the same alert twice. The desk
asks for notification permission once, keeps a 20 s claim loop while it is open,
and draws the alert through the service worker (`message`, plus `push` and
`notificationclick` wired for the day a real push sender exists). No permission →
the old in-page toast, and the desk keeps working.

**5 · A limit, not just a measurement.** Exposure was reported and never bounded.
The office can set a rupee limit per partner (`PUT /api/bullion/limit`); a deal
that would cross it is refused **before it is written**, with all three figures:
*"This deal would take your account to ₹X against a limit of ₹Y — ₹Z is already
outstanding."* Zero means no limit. A jeweller can read their limit and cannot
set it (403).

**6 · A book you can search.** Deals filter server-side by text, date range and
status, and the filter is remembered on the device, so a counter keeps the same
view all morning. Every deal row carries paid and due, its slips are buttons that
open the invoice, and the CSV carries the money columns.

**The honesty fix.** The board advertised "unfix (rate-lock)" while the code only
filed a note. It is now a **request with a queue**: the jeweller asks, the office
answers or declines (`POST /api/bullion/unfix/<id>/resolve`, admin only), and the
jeweller sees the answer. Every string that claimed a facility the code did not
run has been rewritten to say what actually happens — the desk confirms on call,
and nothing is locked until it does.

New suite `qa/browser/t-v236-book.mjs` (**109 assertions**): money maths over real
HTTP, the ledger's opening/closing rule, the invoice's HSN/TCS/words, the
one-shot claim, the rate-lock queue with the office's answer, the limit refusing a
900 g deal and accepting a 1 g one, the server-side filters, and then the screen —
the money strip, the filter that hides and restores the book, a payment recorded
from the form (the due on that same card drops by exactly what was typed), the
invoice opening with its number and words, the ledger's rows and print, and
notifications drawn by the worker (and not claimed when permission is denied).
New gate **`bash qa/v236-gate.sh`** → **27 checks, 0 red**, with `t-v235-live`
71/0, `t-v234-desk` 111/0, `t-v233-nidhi` 146/0, `t-v232-idle` 87/0,
`t-v229-bills` 102/0, `t-v231-ink` 53/0, `t-v230-cert` 61/0, `t-v229-black` 88/0,
`qa/v229-routes.py` 61/0, `t-v222-bundle` 36/0, `t-v225-appfeel` 80/0.
**368 files** (adds `css/v236.css`; the stylesheet is **70 layers / 70 blocks**,
still **one** request, 942,329 B raw / 185,156 B gzipped).

**v235 — THE MILLISECOND DESK** (2026-10-23). The owner's ask: *"keep it
updated every millisecond"*. No exchange on earth sends a price a thousand times
a second, and pretending otherwise would put a number on a jeweller's screen
that never existed — the one thing a bullion desk must never do. So this release
does not fake it. It makes the desk keep up with the data it has, to the frame,
and makes every number say **how old it is**:

**1 · The frame, not the fetch.** A tick that arrives is painted in the very
next animation frame instead of waiting behind a timer, and ticks that land
inside the same frame collapse into **one** repaint — the newest wins. Eight
ticks pushed in a single frame now cost `paints = 1`. The value flash that used
to restart by reading `offsetWidth` (a forced layout per changed number, a dozen
on a busy second, on the phone that is also decoding ticks) now restarts on the
next frame instead: **zero** layout reads for a price change, counted with a
getter in the suite, not promised. The board's 30 s full refresh is untouched.

**2 · Every number says how old it is.** A millisecond clock
(`12:04:31.284`) and, beside it, the real age of the digits on screen — the
exchange age the server reports **plus** the time it took to reach this frame.
The strip also shows the measured arrival rate (`1.0/s`, or `9.4/s` when the
push relay is feeding the cache), because "is this actually updating?" should
never be a guess. Past 1.5 s the age chip turns amber, past 5 s red, and the
board itself **dims and says so** — a stale price shown as live is a loss, not a
bug. One `requestAnimationFrame` loop writes those three strings and nothing
else: no markup, no layout read, no network. It starts with the board, stops
when the tab is hidden, and never runs on a page without a board, so the
storefront pays exactly nothing for it.

**3 · Ask at the rate the server can answer.** `GET /api/bullion/tick` now
carries `nowMs` (the server's own clock, so a phone with a wrong clock cannot
advertise a freshness it does not have), `cacheAgeMs`, and a `poll` hint with a
reason: **250 ms** when a push relay is filling the cache ten times a second,
**1000 ms** against the exchange's 1 s micro-cache, **5000 ms** when the
snapshot is stale. The desk used to ask every 800 ms against a 1 s cache — one
request in five came back with the bytes it already had. It now asks at the
cache's own rate: same freshness, **20 % fewer requests**, and 4× the frames
when the relay is live.

New suite `qa/browser/t-v235-live.mjs` (**71 assertions**): it proves the wire
fields and the poll hint, drives the coalescer (eight ticks → one paint, newest
wins), measures the clock against wall time, watches the age chip turn amber and
red, dims the board at five seconds, freezes the loop on a hidden tab, counts
layout reads during a price change (**0**), and boots the same strip inside the
SPA and *not* on the shop home. Gate **`bash qa/v235-gate.sh`** → **26 checks, 0
red**, with `t-v234-desk` 111/0, `t-v233-nidhi` 146/0, `t-v232-idle` 87/0,
`t-v229-bills` 102/0, `t-v231-ink` 53/0, `t-v230-cert` 61/0, `t-v229-black` 88/0,
`qa/v229-routes.py` 61/0. **367 files** (adds `css/v235.css`; the stylesheet is
**69 layers / 69 blocks**, still **one** request, 936,026 B raw / 184,230 B
gzipped).

**v234 — THE DESK APP** (2026-10-23). The owner's ask: *"make the bullion
application for PC as well as for Android more compatible and operational"*.
The desk was already live and priced; what it was not was a tool a jeweller can
work from all day. Three things were missing, and each one is a number.

**1 · It was a page inside a shop, not an app.** `/desk.html` is a real,
installable app: its own manifest (`desk.webmanifest` — `Shivaa Bullion Desk`,
standalone, `orientation: any`, four shortcuts straight to Rates / Quote / Day
book / Deals, maskable icon), its own scope, its own runtime (`js/v234.js`,
loaded by the desk **only** — `index.html` remains byte-for-byte free of it), and
the storefront's utility strip, masthead, bottom nav and footer removed so the
board is the first thing on screen. The shell is **generated** from
`index.html` by `tools/build-desk-shell.py`: seven asserted transforms, and
`--check` fails if the two ever drift, because `app.js` binds dozens of the
shop's elements and a hand-made second HTML shell would rot the first time a
release touched the page.

**2 · A PC is not a phone.** From 1000 px the desk is a counter: the bottom tab
bar becomes a seated segmented row, the desk-maths strip gets four columns, the
calculator two, and every table is tabular-figure. From 1500 px the quote rail
sits **beside** the board, sticky, so a firm quote never leaves sight. A keyboard
map runs the whole thing (`1–4` tabs, `C` quote, `B` day book, `R` refresh,
`F` full screen, `P` print, `?` the map) — and it works in the browser too, not
only in the installed app. On Android every control the counter touches is
44 px, safe-area insets are respected in standalone, the page never bounces
away under a finger, a downward drag refreshes the rates, an opt-in wake lock
stops the screen sleeping mid-quote, and a quote or a slip can go out through
the phone's own share sheet.

**3 · It could quote but not count.** A firm quote was the end of the desk's
paperwork. Now metal has a document: **`POST /api/bullion/orders/<id>/settle`**
settles in full *or in tranches* — 40 g today and 60 g tomorrow write **two
numbered slips** (`DS<yymd>-<nnnn>`) and leave **one** order whose `settledGrams`
is 100, never 200. Over-settling is refused with the number still open; a deal
whose metal has moved cannot be cancelled; a new one can, with a reason on the
record; another jeweller cannot touch either. **`GET /api/bullion/daybook`** adds
up the day on the server's own date (a phone in another timezone cannot move the
totals): bought and sold grams, fine grams, value, TCS, settled grams and slips,
open grams and value, mark-to-market — as a screen, as CSV, and as paper.
**`POST /api/bullion/watch`** pins the four rows a desk actually trades, per
partner, and the board gains a **fine price and a ★ on every row** plus a "My
metals" filter. `bullion_exposure` now separates settled from open grams, so the
exposure figure is what is actually still at risk.

New suite `qa/browser/t-v234-desk.mjs` (**111 assertions**): it proves the shell
is in sync, drives the tranche maths over real HTTP, and then boots
`desk.html#/partner?view=bullion` in jsdom — the shop chrome gone, a fine price
and a star on every row, the star saved server-side, the day book rendered, a
slip written from the screen, a quote whose clock visibly counts down — and boots
the same board inside the SPA to prove the tool did not become app-only. New gate
**`bash qa/v234-gate.sh`** → **25 checks, 0 red**, with `t-v233-nidhi` 146/0,
`t-v232-idle` 87/0, `t-v229-bills` 102/0, `t-v231-ink` 53/0, `t-v230-cert` 61/0,
`t-v229-black` 88/0, `qa/v229-routes.py` 61/0. **366 files** (adds `css/v234.css`,
`desk.html`, `desk.webmanifest`, `js/v234.js`; the bundle is **68 layers / 68
blocks**, still **one** stylesheet request, 934,114 B raw / 183,810 B gzipped).

**v233 — THE PASSBOOK RELEASE** (2026-10-23). Two owner asks, one release:
*"Make the Swarna Nidhi teacher fully functional and traceable for every
customer"* and *"make the bullion feature for jewellers more practical and
updated"*.

**Swarna Nidhi is a document.** A plan is `SN<yy>-<seq>` (`SN26-0001`); every
instalment is a numbered receipt (`SN26-0001-01`). **One** builder,
`savings_view()`, feeds three surfaces — the customer's passbook, the public
lookup and the owner's ledger — so the receipt number on the counter slip is the
number in the app. A passbook shows months paid, amount, the **grams bought at
the rate that instalment actually paid**, the next due date, the bonus month
(one month free, unlocked at 11 instalments) and progress. A customer with no
login can trace a plan with its number **plus the last four digits of the
registered mobile** (`POST /api/savings/track`): masked holder (`A•••• Sharma`),
never the phone, email or a staff note, 30 lookups an hour per IP then a
15-minute block. `POST /api/savings/request` raises a redeem/close request from
the passbook; the desk stamps it `done`. The owner's Nidhi tab is a ledger —
receipts, **⇢ Open plan** for a customer who paid at the counter (`POST
/api/admin/savings/open`), printable receipt, CSV.

**The jeweller's desk prices metal.** `GET /api/bullion` now carries ₹ per
**fine gram** for every row (the only way 995 compares with 999), the best row
per metal, purity factors 999/995/916/750, mark-to-market `exposure`, and the
partner's quote history. `POST /api/bullion/quote` returns `BQ<yymd>-<nnnn>`,
**90 seconds** of life, TCS **0.1 %** on a buy and none on a sell; `POST
/api/bullion/order` takes `quoteNo` and refuses — in words — an expired quote, a
quote whose metal moved more than **0.2 %**, one for the other side, or somebody
else's. An order without a quote still works. New `qa/browser/t-v233-nidhi.mjs`
(**146**), new gate `bash qa/v233-gate.sh` (**24 checks, 0 red**). Packaged as
`shivaa-update-v233.zip`; adds `css/v233.css` (67 cascade positions).

**v232 — THE IDLE RELEASE** (2026-10-18). *"App is not feeling smooth, it should
feel like buttery smooth and ultra smooth, without decreasing the quality."*
Measured before changing anything: a silent home page — no input, no scrolling —
asked `requestAnimationFrame` for **1264 frames in twelve seconds**, and **1148
of them came from two loops that never stop**: the bullion interpolator (60 fps
forever, two `document.querySelector` calls per frame, hidden tabs included) and
the cursor glow (which wrote `style.left`/`style.top` at 60 fps — a forced
layout of a 340 px `mix-blend-mode:screen` layer per frame — with the mouse
parked). **Idle frame rate: 123/s → 0/s.** `bindTilt()` also hung a mousemove on
**every card** and read a rect **per event**, and `init3DCardTilts()` hung a
touchmove on four families (a layout read per touch event *while scrolling*);
one delegated engine now takes one rect per card visit and one write per frame.
`bindMagnetic()` had the same disease on every button and every glare card, and
joined the same engine.
And a press answer has been dead on every phone since v226: `styles.css:4637`
(`transform:none !important` under `@media (max-width:820px)`) and `v219.css:129`
beat v226's `.p-card:active` / `.cat-card:active` / offer-card rules, so the
three surfaces a shopper taps most never answered a finger — `css/v232.css` §1
restores them with v226's own values. Also: nine card families stop reserving a
permanent GPU layer each; the quick-view pill every phone shows on every card
stops carrying `backdrop-filter:blur(6px)` behind a fill that is already 96 %
opaque; 56 of the 68 `<img>` literals now ask for `decoding="async"` (except the
largest-contentful-paint set); a hidden tab stops polling the gold rate every
second. **`content-visibility` stays sealed off** (v217 §1: fixed height guesses
made the page jump toward the top). Suite `t-v232-idle.mjs` (87), gate
`bash qa/v232-gate.sh` (23 checks). Packaged as `shivaa-update-v232.zip`; **no
new request** — the governors live in `app.js`.

---
**v228 — THE PLAY STORE GATE** (2026-10-17). The owner asked to launch on Google
Play. The launch kit (`playstore/`, written at v183) was already in the repo and
green apart from two things; the first was a real gap, not a formality:

1. **The account-erasure page did not exist.** Play's User Data policy asks every
   app with accounts for an in-app erase AND a public URL that does it without
   installing anything. `POST /api/auth/delete-account` has shipped since v183,
   but **no page ever called it** — every document pointed at
   `https://shivaa.in/#/delete-account`, and that hash fell through the router to
   Home. The link Play asks for would have opened the shop. Now `#/delete-account`
   (alias `#/erase-account`) is a real page: signed out it proves the number with
   a fresh SMS code (deliberately no sign-in first — nobody should log in to
   leave), signed in the session is proof; both need the word DELETE; the owner
   account and B2B partners are refused by the server; success anonymises the
   row, kills every device token, and the page repeats the server's own words.
   The account screen carries a **Privacy & my data** tile. Proven end to end in
   jsdom: code → erase → old token 401 → old password 401 → the code cannot be
   reused.
2. **The "Ring size guide" shortcut pointed at nothing.** `#/size-guide` was in
   the TWA manifest since the kit was written; the sizer has always lived at
   `#/sizer`. The shortcut is now an alias, and the suite proves all three
   shortcuts render.
3. **A bug the route walk found:** `holdRepeat` kept stepping a page that had
   been left (the removed button never received `pointerup`), and the ring-size
   page's `paint()` then threw `Cannot read properties of null`. The repeat now
   stops when its element leaves the page; `paint`/`paintCal` are guarded.

New suite `t-v228-play.mjs` (51 assertions). Nothing about the app's content
changed: the TWA is a verified window onto `shivaa.in`, so a web release IS an
app release.

---
**v227 — THE READING LAYER** (2026-10-17). The owner's list, in their order:

1. **"the verify and create button of shivaa black membership card is not
   working" on any product page.** Reproduced and root-caused: the claim
   reader looked for `[data-black-claim] [data-bc-intake]`, a form that only
   exists on `#/black-card`. On a PDP it returned "Enter your name…",
   `beginBlackClaim` stopped at that error, and the status writer targeted
   `.bc-claim-status` elements that were not on the page either — a tap with
   no sheet, no message, nothing. The reader is form-aware now, the invite
   card carries its own live status line, the claim falls back to the account
   name, and an account with no name at all is sent to the one page that asks
   for it instead of a dead button. The post-login auto-claim prefills the
   form first — it had been silently broken for every first-time visitor.
   Proven end to end in jsdom: OTP → name → card issued → back on the same
   piece, now showing "Save ₹854 on this piece".
2. **"forget password … should show a number otp button"** — forgot-password
   is mobile-first now (email one tap away), the 4-digit code goes to the
   registered mobile, then the shopper sets a **new password + repeat** on the
   same screen, with a real 30 s resend countdown. `api.php` accepts `{phone}`
   or `{email}` and always texts the registered mobile; the rate limit counts
   per identifier. Proven: the new password signs in, the old one is refused.
3. **Home-page bugs** — the live rate ribbon printed `₹₹6,998/g` on every
   figure (`fmt()` has added the sign since v120); the legacy hero hint was a
   bare `<div>` that ate taps and answered nothing; the home hero's own
   "discover" button measured 44 % white inside 60 % opacity; the news logo
   and the mega feature art loaded eagerly with no intrinsic size.
4. **"make design elements and design physics and design texts more better"** —
   `js/v227.js` + `css/v227.css` (last layer): the footer bleed follows the
   nav's measured height instead of a guessed 60 px, below-the-fold art that
   mounts after the first sweep is still deferred, the category rail centres
   its active chip on arrival with `scrollLeft` arithmetic (the page never
   moves) and stops animating under `prefers-reduced-motion`, and the deepest
   footer copy is no longer 50 % gold on maroon.

Suites: `t-v227-blackcard` 28, `t-v227-reset` 31, `t-v227-design` 41. The
older gate is unchanged and green (butter 61, appfeel 80, corners 64, bundle
36, smooth 39, cleanup 34, billing-gone 13, depth 22, sidebar 13, alive 96,
flip all, t7 4). Packaged as `shivaa-update-v227.zip`.

**COUNTDOWN: release 235 pending owner review — nothing goes live without the
owner's explicit yes.** Live: **v234** (applied by the owner on 23 Oct 2026).
Built and not live: **v235 — deploy v235**, which contains v234 and makes the
bullion desk keep up with its data to the frame: one paint per animation frame,
a millisecond clock and the true age of every number on screen, a dimmed board
past five seconds, and a poll hint from the server (250 ms with a push relay,
1 s against the exchange cache). Forward-only rule in force — next release
number is **v236**.
Updated 2026-10-23 (v235) on the `arena/800194ed-shivaa-ecom` session branch,
whose base commit `fd90c0f` is the release branch `arena/e8a470c6-shivaa-ecom`'s
v232 tip.

**Loading (v222):** the shop serves **one** stylesheet, `/css/shivaa.css`
(stamped `?v=235`), built from the 68 historical layers (69 cascade
positions — `v186.css` deliberately sits at two of them) by
`tools/build-css-bundle.py` using the cascade order in
`tools/css-bundle-order.txt`. It is **58 render-blocking requests → 1**, and
**268 KB → 168 KB gzipped** (v235 bundle: 936,026 B raw / 184,230 B gzipped). The individual layer files still exist under
`cms/css/` (the QA suites read them, and a rollback restores `index.html`
alone), but nothing on the page links them any more. Scripts are unchanged:
21 local files, all `defer` (plus the Cashfree SDK), with `admin.js`/`qr.js`
fetched on demand and `motion.js`/`aurum.js`/`boost.js` injected after first
paint by `v117.js`.

**v227 (the reading layer):** the black-card "Verify & create" button works from
every product page now (a signed-out tap opens the mobile sheet and reports on the
page it was pressed on, and a signed-in shopper gets the card in one pass — then
returns to the piece they were reading, which now shows the saving); forgot-password
is mobile-first (4-digit code to the registered mobile, then new password + repeat,
real 30 s resend; the API accepts `{phone}` or `{email}` and always texts the
registered mobile); the live-rate ribbon no longer prints `₹₹6,998/g`; the footer
clears the bottom nav by its measured height instead of a guessed 60 px; and the
category rail centres its active chip without moving the page.

**Click feel (v226):** every press answers. 265 of 1058 visible interactive elements had no `:active`
rule at all (102 mega-menu tiles, 40 category-bar tiles, 33 Quick-view buttons, the brand link, the offer
pill, the utility/footer links); on a phone `mobile.css`'s `*:hover{transform:none!important}` also erased
the browser's own answer for them. `css/v226.css` gives each family a transform press, gapless on both
`(pointer: coarse)` and `(hover: none)`; `js/v226.js` adds the house gold ripple (the v89 `.rip` span)
on tap, one 5 ms haptic per real tap, rail centring on a chip/tab/step tap, and a pop on the wish and
compare badges that only the cart badge used to have. A page change is now a cross-fade where
`startViewTransition` exists (chrome stays still, entrance stands down) and never a smooth slide of the
page being left (`html.route-jump`); a 2px gold hairline at the top of the screen appears only if the
next page takes longer than 180 ms.

**Smoothness (v225):** the chrome scrolls from **one frame** now. `js/v225.js` is the only place in the
shipped tree that reads the scroller's geometry, and it measures on resize / route / document-resize
instead of per frame — a six-event scroll burst reads the document **zero** times (before: two listeners ×
two reads per frame). The progress hairline takes a quantised `transform` (0.1%) and the back-to-top ring a
1/120-of-a-turn `conic-gradient` value, so the two properties that must repaint repaint 120 times a page
instead of 60 times a second. The parallax (hero/banner/poster media) runs on touch too, at **11px** instead
of 26, with each element's offset **cached** — no `getBoundingClientRect()` inside a frame on any device.
`@keyframes mSkeleton` (PDP skeletons ×7 + every product-card photo placeholder) and `@keyframes auProg`
(the 3px bar) stopped animating `background-position` — a repaint loop no browser can composite — and sweep
with `translate` instead. On a touch device `.p-card` stops reserving a GPU layer (`will-change`) for a
hover state a finger cannot reach: 20–60 fewer layers. Eight rails and the scheme stepper get
`scroll-snap-type: x proximity` + `overscroll-behavior-x: contain`, and `css/v225.css` (last layer in the
bundle) extends the 16px focus-zoom floor to the 681–900px tablet band, adds the gold card hairline and
suppresses the grey tap flash where the house already draws its own press state.

**Smoothness (v224):** every continuously running animation is compositor-only.
The hero float, the pillar line sweep, the finale sheen and the two hover
shines were animating `margin-top`/`left` — a full re-layout of the page on
every frame — and two decorative loops animated `filter`/`blur()`. They now
animate `translate`/`opacity` with the same geometry. Both draw countdowns used
to rebuild their four cells with `innerHTML` once a second forever; the footer
rate ticker rewrote identical markup every 2.5 s; the `data-rate-age` line was
written every second whether or not it changed. All four now build once, write
only a changed digit/text node, and pause off screen (120px
`IntersectionObserver`) and on a hidden tab: **~35 DOM node writes a second →
~2**. `css/v224.css` (the layer that was last before v225.css) carries the usability corners:
16px field floors so iOS never zooms a focused input (39 selectors, each one
below 16px everywhere it appeared — nothing large is shrunk), 27px hit areas on
the 6-8px carousel dots, `env(safe-area-inset-bottom)` on the concierge/theme/
back-to-top FABs, a `dvh` height on the chat panel, tabular figures on live
numbers, and `overscroll-behavior: contain` on the panels. Two CSS files on
disk are dead and stay dead: `bot.css` and `v108.css` — never linked, not even
before the bundle, and nothing loads `bot.js`/`v108.js`.

**Smoothness (v223):** the gold-thread films are **poster-first with deferred
media**. Until v222 each film `<video>` set `preload="auto"` and its `src` at
mount, so a fresh home page pulled **all five films (~4.5 MB)** before the
reader had scrolled anywhere near them, and each kept decoding off-screen
frames while the reader passed. Now a film mounts with **no `src`** and
`preload="none"` — a fresh home page requests **0 video bytes** — one
`IntersectionObserver` with a 1200px margin calls `wake()` on the film actually
on screen (attach the file, then play), pauses-but-keeps the near ones, and
`rest()` releases the buffer of a film left well behind (`wake()` is
idempotent, so scrolling back never re-downloads). A released film is never
mistaken for a broken one (the v211 error handler returns early when there is no
`src`), and `prefers-reduced-motion` visitors never fetch a film at all. The
rest of the smoothness surface was measured and is already clean: **23 of 25
scroll/touch listeners are passive** (the only blocking one is the product
gallery's deliberate horizontal drag), idle DOM is **stable at 1897 nodes**, 264
local asset references hold **no 404**, and product cards already reserve their
space so images cannot shift the layout. JS bundling was considered and
rejected (deferred files already parallelise; `app.js` alone is 760 KB with 308
top-level declarations and two files carry top-level `'use strict'`).
`qa/browser/t-v223-smooth.mjs` (39 assertions) now locks all of this.

## 1 · What the site is

Shivaa Jewels — premium gold & silver jewellery e-commerce, rooted in the
owner's family goldsmith history across **Nagaur → Jayal (Nagaur district) →
Jaipur, Rajasthan**. SPA in `index.html` + `cms/js/app.js` (one IIFE,
`window.Shivaa` facade), PHP API in `api.php`, JSON storage, Cashfree
payments, OTP demo login, service-worker PWA (`sw.js`), Netlify + Apache
`.htaccess` dual hosting. All UI copy English.

## 2 · Pricing (live formula)

`price = metal(weight × rate) + making + stone − discount + GST(3%)` —
outlined in `#pdBreakup` on every product page. Rate cards: 22K anchors to
the 24K spot rate (`22K = round(24K × 0.9167) + 398`), 18K `= 18Kspot +
round(premium × 0.75)`, silver `= spot + 3`, Jaipur premium `+55` on 24K.
`?edit=1` in the owner module opens the manual override ("Boss calculator"),
status chips "Spot mode"/"Override active".

## 3 · Memberships & offers

- **Shivaa Black Card** (v184+, reworked v227, v229 and v230) — retail-only,
  six-month, OTP-verified personal membership: **20% off making charges**, which
  is what every member-facing surface says and what the site has always promised.
  Since v229 that number is ONE setting (`settings.blackDiscountPct`, clamped
  0-40, and 0 switches the benefit off *without deleting anybody's card*), set in
  **Admin → Settings**; since **v230 it ships at 20**, because a 25% default was
  a claim the site never made and the owner called it false. Do not quote any
  other percentage for Shivaa Black unless the owner has changed the setting. The server resolves it
  once per request; the card, the certificate, checkout and the downloaded
  artwork all read the same number, and **no coupon row is stored per member**,
  so changing it moves every member at once and no card number ever changes.
  A card carries its own stored percentage and the server **overrides it from the
  setting**, so no card has to be reissued for a rate change and a card created
  under an older number quotes the current one.
  **Historical orders are the exception**: an invoice or order row derives its own
  rate from that order's two numbers, because a receipt must never follow a
  setting.
- **Renewal** (v229) — `POST /api/black-card/renew`, one tap on `#/black-card`.
  It opens only in the **last 30 days** of validity or after expiry (otherwise
  **409** with the days left), is rate-blocked 6/hour, and adds **six calendar
  months** while keeping `memberId`, `cardNumber` and `certificateNo` — the number
  printed on the plastic card never changes. The owner's route
  (`POST /api/admin/black-card/renew`, 1-36 months) **extends a live card from its
  own expiry**, so renewing somebody early never costs them a day.
- **The free physical card** (v229) — `Admin → Shivaa Black` tracks it
  `to-ship → printed → shipped` (`POST /api/admin/black-card/delivery`), with a
  sidebar badge counting what is still to post, a CSV export and a printable
  posting list of address labels.
- **Prestigious Member Certificate** — a lifetime keepsake issued with the card,
  since v229 a real document, since v230 a legible one (the member's name was gold
  foil clipped to transparent glyphs on cream paper, about 1.4:1 contrast; it is
  now ink at 15.4:1 on the lightest paper and 9.6:1 on the darkest, and the
  downloaded A4 sheet draws the same ink), and since v231 an **engraved** one: a
  banknote-style **microtext band** under the top border reading *SHIVAA FAMILY ·
  PRESTIGIOUS MEMBER · SHIVAA JEWELS JAIPUR · NOT A FINANCIAL INSTRUMENT*, a
  guilloche in two fine bands, four corner ornaments each set with a gold diamond,
  a seal with a tick band and two rings, the promise line in a cartouche, a
  signature rule with a title under it, and a verify line naming `shivaa.in`. It is
  a recognition document, **not a financial instrument**, and it says so on the
  sheet: four record boxes (certificate no · member ID ·
  issued · valid through), the member's name in caps as the largest element after
  the title, a promise line stating the percentage, both dates and the scope
  (*never on metal value, stones, GST or shipping*), a signatory **with a title**
  (*For Shivaa Jewels · Proprietor · the Shivaa Family*), a verify line naming
  `shivaa.in` and the certificate number, `RENEWED n×`, and a pill that turns
  **gold** ("certificate permanently archived") when the window closes while the
  certificate itself stays in the account forever. Downloads as **A4 landscape
  3508×2480 px @300 dpi**. No invented award copy, ever.
- **In-store purchase bills** (v229) — customers buy at the counter and the paper
  bill stays with the owner, who uploads it from **Admin → In-store Bills**
  (jpg/png/webp/pdf, ≤6 files × 8 MB, name, mobile, bill no, date, store, amount,
  items, private note). Files live in `.shivaa-private-bills` **beside**
  `public_html` — never inside the web root — and are streamed **by index** with
  `no-store`, `nosniff` and `SAMEORIGIN`. The customer side (`#/my-bills`, also an
  account tile) has **exactly two verbs: View and Download**. There is no upload,
  edit, delete or dispute control on that side and the owner's private note is
  never sent to a customer. Bills auto-link to an account by the mobile written on
  the paper. Erasure **anonymizes** a bill rather than deleting it (it is a GST/tax
  record) at both erasure routes. If the private folder is unavailable, uploads
  answer **503** and the admin tab says so — nothing is ever half-saved.
- **Premium card** (v191) — free home delivery for life, free claim, and its own
  **lifetime 20%** making-charge benefit. That 20% is a *separate programme* and
  was deliberately left alone when Shivaa Black moved to a setting; so were
  Amrita ji's personal ticket and the public `MAKING20` offer.
- Public offers (v190): `MAKING20` (20% off making) + `FREEDEL` (free home
  delivery). v208 presentation: the making offer is labelled **Shivaa Black
  members only, no coupon code shown** (attached at checkout); FREEDEL keeps
  its code. Backend coupons are unchanged.

## 4 · B2B partners (`#/partners`)

Local jewellers/resellers with GSTIN or Udyam; no fabricated customer lists.
Order desk with live-rate table + lock-in timer (HLR/P3 formats), credit
window, invoice/PDF/WhatsApp (`wa.me/919269520140`), buyback & exchange,
festive gold-scheme ("Goddess Laxmi Sona Scheme" — keeping the original name),
1-gram jewellery, refined gold biscuit/coin/sheet ("Gold Biscuit Deal"). The
biscuit is the site's core symbol — historic gold biscuits in copy are safe.

## 5 · Engineering invariants

- Versions stamped in 4 files per release (index.html, sw.js, app.js, api.php).
- `cms/data/db.json` = synthetic fixture, gitignored, never deployed.
- CSS seals: no `filter` on `.bc-card`; flip card is a `div[role=button]`;
  never transform `.c-slide` boxes or their `img` (Ken Burns); v200 gold
  button gradient stays; `background-clip:text` fails on some mobile
  browsers — solid colours for words that must stay legible (`.gold-txt`
  fixed in v208).
- Phantom class warning: **`.shv-hcc` does not exist** — the campaign banner
  wrapper is `.shv-home-campaign-card`. Any rule targeting `.shv-hcc` is dead.
- 3D seals (v209): `filter` on ANY ancestor of the Black Card (including
  `.bc-card-wrap.is-lit`'s old drop-shadow) flattens `preserve-3d` — the flip
  dies. Lights/glows ride on box-shadow/opacity only. Sticky chrome never uses
  `backdrop-filter` (Windows-Chrome scroll flash). No per-frame scroll writers
  on banners (v208's parallax was removed in v209 for this).
- QA: `qa/preview_shim.py` (port 8090, mirrors api.php shapes incl.
  `offers/banner` since v208), `qa/browser/t7-audit.mjs` (route/button/error
  walk), `qa/browser/t-v206-flip.mjs`, `qa/browser/audit-contrast.mjs`.
  jsdom is installed to `/tmp/node_modules` (reinstall after sandbox resets).
- Zips are repo-root `shivaa-update-vNNN.zip` = the `cms/` tree at zip root
  (minus `data/`), drop-in replace for the domain root. Since v210 the zip
  also carries `images/films/film-*` + `thread-*` (the case/thread media) —
  do not trim them; the owner's "videos not working" was missing files. Owner download link
  form: `https://github.com/theunreal8055-coder/Shivaa.ecom/raw/arena/09f3c79f-shivaa-ecom/shivaa-update-vNNN.zip`.

## 6 · Brand mood

Maroon / cream / gold foil, heavy serifs (no modern sans for display),
ornate frames, film reveal, consistent token palette. "5D" = layered
scroll depth (raised cream cards, inner-layer parallax, metallic sweeps) —
implemented calm and reduced-motion-aware in v208, never gimmicky.
