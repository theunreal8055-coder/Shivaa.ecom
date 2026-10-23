# HANDOFF-unreal8055.md — Shivaa Ecom · agent-to-agent handoff

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

**v233 — THE PASSBOOK RELEASE** (2026-10-23). Two owner asks in one release:
*"Make the Swarna Nidhi teacher fully functional and traceable for every
customer"* and *"make the bullion feature for jewellers more practical and
updated"*. Both were dead ends for a reason that had nothing to do with design —
a plan had no number, a receipt had no number, and a jeweller could see a rate
but could not get a firm price for it. This release gives the money a document
and the desk a quotation.

**A · Swarna Nidhi is a document now.** A plan is numbered `SN<yy>-<seq>`
(`SN26-0001`) and every instalment is a numbered receipt
(`SN26-0001-01`). **One** server view, `savings_view()`, feeds all three
surfaces — the customer's passbook, the public lookup and the owner's ledger —
so the receipt number on the counter slip is the number in the app and the
number in the office. A passbook carries months paid, the amount and the
**grams bought at the rate that was actually paid** for that instalment, the
next due date, the bonus month (one month free, unlocked at 11 instalments) and
the progress to maturity.

*Tracing without a login.* `POST /api/savings/track` answers a plan number plus
the **last four digits of the registered mobile**. It returns the masked holder
(`A•••• Sharma`), never the phone, the email or a staff note, and it is
rate-limited to **30 lookups an hour per IP**, then a 15-minute block — a
counter customer, a father-in-law and a shop assistant can all check the same
plan without any of them seeing who else is on it.

*Asking from the app.* `POST /api/savings/request` records a redeem or close
request from the passbook; it appears in the owner's Nidhi tab and is stamped
`done` (with a timestamp) the moment the desk acts on the plan.

*The desk.* The Nidhi tab is now a ledger: every plan with its receipts, a
plain-language status, **⇢ Open plan** for a customer who paid at the counter
(`POST /api/admin/savings/open`, admin only, refuses an unknown mobile and a
customer who already has a live plan), instalment entry, a printable receipt,
redeem, close, and CSV of the whole book.

**B · The jeweller's desk prices metal instead of quoting a rate.** `GET
/api/bullion` now carries a `desk` block — ₹ per **fine gram** for every row
(the only way 995 is comparable with 999), the cheapest row per metal, spread
and day change, purity factors for 999/995/916/750 — plus `exposure` (open
deals, net grams, open value, **mark-to-market** against the live board) and the
partner's own quote history.

*Firm quotes.* `POST /api/bullion/quote` returns `BQ<yymd>-<nnnn>` — server
priced, **90 seconds** of life, TCS at 0.1 % on a buy (none on a sell), fine
grams computed from the row's purity. `POST /api/bullion/order` accepts
`quoteNo` and refuses, with a sentence rather than a silent re-price, a quote
that has expired, a quote whose metal has moved more than **0.2 %**, a quote for
the other side, or somebody else's quote. An order placed without a quote still
works — the old flow is untouched.

*The desk screen.* Rate board with the fine-gram strip under it, the best row
named, open metal marked to the board, and a calculator that takes grams or
kilograms, a purity and a side and returns the live value **and** the firm quote
number in one tap.

Suites: new `qa/browser/t-v233-nidhi.mjs` (**146 assertions**, three surfaces
against one database — it proves the grams in the passbook are the sum of the
receipts, that the receipt number in the admin answer is the number on the
customer's receipt, that a lookup with the wrong mobile is refused, and that the
public answer leaks neither phone nor email nor staff note; it opens a plan,
writes two receipts, redeems it, opens a second plan for another customer,
prices a quote and places a quoted order). New gate **`bash qa/v233-gate.sh`** →
**24 checks, 0 red**, with `t-v232-idle` 87/0, `t-v229-bills` 102/0,
`t-v231-ink` 53/0, `t-v230-cert` 61/0, `t-v229-black` 88/0, `qa/v229-routes.py`
61/0. **362 files** (adds `css/v233.css`; the bundle is **67 layers / 67
blocks**, still **one** stylesheet request, 924,855 B raw).

**v232 — THE IDLE RELEASE** (2026-10-18). The owner's report was one line:
*"App is not feeling smooth, it should feel like buttery smooth and ultra smooth,
without decreasing the quality."* So this release measured the app before
touching it, and then removed work. **Deploy v232** — it contains v229, v230 and
v231.

**What the measurement found.** A silent home page — no input, no scrolling,
nothing on screen moving — asked `requestAnimationFrame` for **1264 frames in
twelve seconds**, and **1148 of them came from two loops that never stop**:

| loop | where | what it did | frames in 12 s |
|---|---|---|---|
| `_msTick` | `app.js` (bullion interpolator) | lerped the gold/silver ticker at 60 fps forever, with **two `document.querySelector` calls inside every frame**, whether or not a number was still moving, whether or not the tab was open | 574 |
| `glow` | `app.js` (cursor glow) | wrote **`style.left` / `style.top`** at 60 fps forever — a forced layout of a 340 px `mix-blend-mode:screen` layer per frame — with the mouse parked, and on a page where the element is `display:none` | 574 |

That is an **idle rate of 123 frames a second**: the main thread never once went
quiet between app.js parsing and the tab closing, so every scroll, every tap and
every image decode had to queue behind it. After the change the same window
measures **0 frames a second**.

1. **Both loops now run only while there is something to move.** The
   interpolator keeps its two nodes (re-finding them only when a route has
   rebuilt the strip), wakes on a `rates` event, **arrives exactly on the last
   frame** instead of stopping 0.01 short, and stands down while the tab is
   hidden. Same `0.14` easing, same rounding, same text. The glow sits at a
   `0,0` origin (`css/v232.css` §4) and moves on a `translate3d`, wakes on a
   real `mousemove`, and ends the moment it catches up with a parked pointer;
   its growth on a hot target uses the `scale` property (`460/340 = 1.3529`)
   instead of animating `width`/`height`, inside `@supports (scale:1)` so the
   old rule stays as the fallback. The rates poll also stops in a hidden tab —
   it was asking the server for gold **once a second** with nobody watching —
   and restarts on the way back, which the existing visibility handler already
   anticipated.
2. **One tilt engine instead of a listener per card.** `bindTilt()` hung a
   `mousemove` on **every** `.p-card`/`.cat-card`/`.poster`/`.testi` it was
   handed (a hundred-piece grid = a hundred listeners) and each event ran
   `getBoundingClientRect()` and then wrote a transform: a forced layout and a
   paint per pointer event, with no frame coalescing, so a mouse reporting at
   120 Hz bought 120 layouts a second. `init3DCardTilts()` did the same for four
   more families **and hung a `touchmove` on them** — a layout read per touch
   event *while the page is scrolling*, the most expensive thing a phone can be
   asked to do under a moving thumb. There is now one delegated `mousemove` and
   one `touchmove` for the whole document: the rect is taken **once per card
   visit** (a touch gesture takes it at `touchstart` and reuses it), the write
   is coalesced into one frame, and a gesture that turns out to be a scroll
   stands the tilt down instead of wobbling a card the reader is trying to read
   past. Measured in jsdom: ten pointer moves over one card = **one** layout
   read, twenty more on a settled card = **zero**. Selectors, degrees,
   perspective and resting transforms are unchanged. The same treatment went to
   the two pointer effects next door: `bindMagnetic()` hung a `mousemove` on
   every primary/gold/outline button and on every
   `.catlog`/`.testi`/`.acct-tile`/`.addr-card`, each reading a rect per event;
   both now share one delegated listener, one cached rect and one write per
   frame, with identical maths (7 px across, 5 px down, the glare's two
   percentages).
3. **A press answer that has been dead on every phone since v226 shipped.**
   v226 wrote `.p-card:active, .cat-card:active { transform: translateY(1px)
   scale(.985) }`, and `styles.css:4637` has said
   `.p-card,.cat-card,.poster,.testi { transform:none !important }` under
   `@media (max-width:820px)` since v42 — an important declaration beats a
   normal one whatever the order, so **the product card, the category card and
   the offer banner (`v219.css:129` neutralises that one on coarse pointers)
   have never answered a finger.** `css/v232.css` §1 restores all three with
   v226's own values, marked important for the same reason v226 marked its
   anchor list, in both phone guards separately (a nested media list inside an
   `and` is Media Queries 4 and a rule that silently fails to parse is how the
   press went missing), and inside `prefers-reduced-motion: no-preference` with
   a §6 block that turns it back off.
4. **A layer per card, a blur per card, a decode on the frame.** Nine card
   families carry a permanent `will-change:transform` (`styles.css:1532`) — a
   GPU layer reserved per element for a hover a finger cannot trigger; v121,
   v139 and v225 reset `.p-card` alone, so the other eight were still reserving
   one each, forever. §2 releases all nine, promotes only while a pointer is
   actually over the card (Chrome re-promotes by itself for the length of any
   transform transition, so nothing is lost), and flattens on touch — the same
   treatment `styles.css:4640` has given the four tilt families since v42. On a
   phone **every product card's quick-view pill is permanently visible**
   (`@media (hover:none){.pc-quick{opacity:1}}`) **and carries
   `backdrop-filter:blur(6px)` behind a fill that is already
   `rgba(255,252,244,.96)`**: fourteen backdrop filters in this bundle sit
   behind a fill of 0.94 or more, where the backdrop contributes at most 6 % of
   a pixel. §3 takes the blur off the one that multiplies with the catalogue and
   closes its fill to `.98` — the pill reads *more* solid, and its own text
   contrast is unchanged. The fixed bars were measured and **keep their glass**:
   two of them on screen at once is not a hundred. `app.js` also sweeps and
   watches for `decoding="async"` now, because **56 of the 68 `<img>` literals
   it renders had no `decoding` attribute** and an image whose bytes land while
   a thumb is moving can be decoded on the main thread inside that frame; the
   images that *are* the largest contentful paint (`#preloader`, `.hero`,
   `.page-hero`, `.poster`, `.c-slide`, `.gal-track`, `[data-lcp]`) and anything
   the markup marked `loading="eager"` or `fetchpriority="high"` are skipped, so
   this release does not buy one kind of smooth with another.

**`content-visibility` is deliberately untouched.** v117/v121/v122/v214/v215
tried it and v217 sealed it off: with a fixed height guess the page height
changed as the shopper scrolled, the browser lost its place, and the page jumped
toward the top — the owner's "it refreshes while scrolling". Off-screen skipping
is not worth that, and `#view *` is forced `visible !important` to this day.

New suite `qa/browser/t-v232-idle.mjs` (**87 assertions**): it counts frames in
a silent three-second window (**at most one**, where the same window asked for
~370 before) and then proves the counter is not a dead instrument by counting
the frames a real `mousemove` wakes; it instruments `getBoundingClientRect` and
proves one read per card visit, one more when the pointer moves to the next
card, one more after a scroll, and zero for twenty moves on a settled card; it
proves the v42 gate still holds on a phone; it proves the decode governor swept
76 images, governs one inserted after boot, and leaves an eager image and a hero
image alone; it hides the tab and proves the server is not asked for anything,
then shows it and proves the poll comes back. The cascade facts (which jsdom
cannot resolve, because it applies no media queries) are asserted against the
shipped bundle: both press declarations, why v232's wins, the nine released
families, the three places the blur is switched off and the desktop rule that
keeps it. New gate **`bash qa/v232-gate.sh`** → **23 checks, 0 red**, with v231
(53/0), v230 (61/0) and v229 (bills 102/0, black 88/0, routes 61/0) still green.
**This release adds no new request** — the governors live in `app.js`, next to
the loops they govern, and `css/v232.css` is the 66th cascade position
(910,723 B raw / 179,425 B gzipped).

**Eight red lines on the first run of the new suite, and not one of them was the
release.** Six were assertion faults of the families this repo keeps
re-meeting: an anchor written against a **comment** in a string whose comments
had been stripped (`indexOf` of the prose, not the code); a count taken against
**raw** text in one half of an `&&` and **whitespace-normalised** text in the
other, so the two halves disagreed about what a rule looks like; a passive-
listener check written as a double negative over the whole file instead of over
the one function; `indexOf` where the assignment appears **twice** in the
function, so the check compared the wrong one (use `lastIndexOf` and say why).
The other two were the suite measuring the page before it had finished mounting
late blocks, so unrelated reads landed in the tilt tally — **a frame-cost
assertion needs a settle, and the settle has to be longer than the last late
mount.** Both are now in the suite as comments, because the next person to write
a timing assertion will not read this paragraph.

**v231 — THE ENGRAVED LAYER** (2026-10-18). The owner's two reports were already
fixed in v230; he asked for the graphics to go further and the app to be smoother,
so this release does the three things v230 left open. **Deploy v231** — it contains
v229 and v230.

1. **The ink fix is now structural, not one selector deep.** v230 keyed its reset
   on `.bc-certificate.v230 .bc-cert-name` — correct, and one class-list edit away
   from dead. v231 states the same reset on the **bare** `.bc-cert-name` (all four
   mechanisms, each `!important`: `background`, `background-image`,
   `background-clip`, `-webkit-text-fill-color` + `color`, and `filter`), and gives
   every other line of the document `-webkit-text-fill-color: currentColor` +
   `background-clip: border-box`, so no future foil utility can make a certificate
   illegible again. **That guard restates no colours** — a legibility layer that
   also picks the palette is a layer nobody can restyle without a fight, and
   `t-v231-ink` asserts exactly that (it failed on the first run because the
   assertion's own slice was wrong, not because the rule was).
2. **Microtext** — the banknote cue the design research asks for and the HTML sheet
   never had (the canvas download has carried it since v229). One 9px band of 5.5px
   letterspaced text under the top border, rendered from `data-microtext` via
   `content: attr()`, so there is **no text node** for a screen reader to read out
   and nothing duplicated in markup. It says what the document is *and* what it is
   not (`NOT A FINANCIAL INSTRUMENT`). **One band, not two**: a pseudo-element of a
   9px-tall parent cannot be positioned at the foot of a 600px sheet, and
   decorative layers positioned by guesswork are how a certificate ends up with a
   stray line through the signature.
3. **Paint, i.e. the smoothness half — subtraction again.** The guilloche was a
   **full-sheet** element whose gradients were merely *positioned* as bands, so the
   browser rasterised the whole ~900×600 sheet. It is now **two 58px elements**
   (44px on a phone) with a `.bc-guilloche-foot` modifier: same artwork, about a
   fifth of the rasterised area. The suite asserts the height, because "less paint"
   is a claim about a number, not a feeling. Still **no `@keyframes`, no
   `transition`, no `will-change`, no `filter`**; v230's `contain: paint` still
   isolates the sheet.

Graphics also taken further, as asked: each corner ornament is **engraved with a
gold diamond** (still exactly four — v229 removed the duplicate `c4`), the title is
letterspaced and *pressed* rather than glowed, the kicker tracking is wider, and the
card's **benefit plate** — the number the owner reads first — gets crisp ink edges.
Small screens keep all of it.

New suite `qa/browser/t-v231-ink.mjs` (**53 assertions**): it recomputes both WCAG
ratios (foil ~1.4:1 failing, ink 15.4:1 / 9.6:1 passing — the ink now clears AAA on
*both* paper stops), checks the bare-selector reset is in the shipped bundle
**after** the foil rule it replaces, proves nothing after it makes certificate text
transparent again, counts the guilloche nodes and asserts their height, and proves
20 is still a *default* by moving the setting to 21 and watching the certificate
follow. New gate **`bash qa/v231-gate.sh`** → **22 checks, 0 red**, with v230
(61/0) and v229 (bills 102/0, black 88/0, routes 61/0) still green.

**Two red lines on the first run, both assertion faults, both the same family as
v229's and v230's — an anchor that is not what it thinks it is.** (a) A stamp pin
written as a **regex** (`/__SHIVAA_REL\s*=\s*230/`) survived a roll that only
knows literal spellings (`__SHIVAA_REL=230`, `__SHIVAA_REL = 230`); **when you roll
stamps, grep for the regex spellings too.** (b) A slice ended on
`indexOf('/* ── §2')` over a string whose comments had already been stripped, so
`indexOf` returned **-1** and `slice(start, -1)` became "everything except the last
character" — which swallowed a later section's colours and failed a check about an
earlier one. **A -1 from indexOf is never a position**; end slices on tokens that
survive whatever stripping you did, and assert the slice is real before trusting it.

**v230 — THE LEGIBILITY RELEASE** (2026-10-18). The owner looked at the v229
certificate and the v229 card and reported two things. Both were real, and neither
was a matter of taste:

1. **"the name of the prestigious customer in the membership certificate is of
   same colour as of background."** Measured, not guessed: `v201`/`v205` gave
   `.bc-cert-name` a **gold-foil treatment** — a gradient `background` clipped to
   the glyphs with `color:transparent`, plus a dark `drop-shadow` filter. That was
   correct on the **dark** certificate stage those releases shipped. The paper
   certificate that `v184`/`v229` render is **cream**
   (`#f4e2a6 → #fffdf1 → #ead18a`), and the foil's mid-stop measures about
   **1.4:1** against it (WCAG asks 4.5:1, and 3:1 for large text). v229 set
   `color:#3d2405`, which **wins the colour cascade but left the treatment in
   place** — `background-clip:text`, the foil `background-image` and the
   dark-stage filter all still applied. *Setting a colour is not the same as
   removing a treatment.* `css/v230.css` §1 removes all four mechanisms with
   `!important` — the clipped background, the clip itself, `-webkit-text-fill-color`
   (which beats `color` where it is set) and the filter — and puts ink
   **`#2b1a05`** on paper: **15.4:1** on the lightest stop, **9.6:1** on the
   darkest (AAA). `!important` is deliberate and narrow: `styles.css` has foil
   utilities that use `-webkit-text-fill-color:transparent !important`, and a
   legibility fix a utility class can beat is not a fix. The suite asserts that
   every `!important` in the layer is ink, a foil reset or a print declaration —
   never a layout property. `.bc-cert-copy` was cream-on-cream for the same reason
   and is ink now; the **A4 download draws the same ink**; print forces pure
   black.
2. **"on the card you have mention the 25% of on making charges so this is a false
   claim ... should be only at 20% off making charges for the customers of
   prestigious members."** Because v229 made the rate ONE setting, this is a
   **default** change in the four places that carry it — `api.php
   black_pct_setting()`, `app.js blackPct()`, the Admin Settings field and its
   save body, and `qa/preview_shim.py dev_black_pct()` — and nothing else moves.
   The clamp stays **0-40** and the setting is still the owner's to change; only
   what ships changed. The fixture's stored `discountPct` flips **20 → 25** so the
   suite still proves the server overrides whatever a card carries, and the
   Settings help text now says what ships instead of arguing for a number the
   owner did not choose. **Consequence to remember:** a member card and the public
   `MAKING20` offer now quote the same 20% — that is the owner's decision, and
   Premium's lifetime 20% and Amrita ji's ticket were already 20% and are
   untouched.

**Graphics taken further** (also asked for): a seal with a conic tick band, two
rings and a foil sheen; a double-rule engraved border; a denser guilloche with a
fifth vertical band; record boxes with an accent top edge and an inset highlight;
the promise line in a **cartouche** (it is the legal line); a signature rule to
sign on; the verify line as a strip with hairlines either side; and a **flourish
under the name** so the eye lands on it. Small screens keep every one of those
decisions instead of dropping them.

**Smoothness was subtraction.** The certificate is the most painted element on the
member page: this removes a per-glyph `filter` (a filter re-rasterises on every
paint of its subtree) and a gradient clipped to glyph outlines, then adds
`contain: paint` so the sheet does not repaint the page through it. **No
`@keyframes`, no `transition`, no `will-change`** — a document that moves is a
document nobody trusts.

New suite `qa/browser/t-v230-cert.mjs` (**61 assertions**): it computes WCAG
contrast for both the failing foil and the fixed ink so the bug is proved rather
than described, checks the cascade order in the shipped bundle, and proves 20 is a
*default* and not a new literal by moving the setting to 22 and watching the
certificate follow. New gate **`bash qa/v230-gate.sh`** → **21 checks, 0 red**
(v229's suites still green: bills 102/0, black 88/0, routes 61/0).

**v229 — THE PAPERWORK RELEASE** (2026-10-18). The owner asked for the whole
queued list in one update — *"Sab banao agle update main"* — plus one more thing:
offline/in-store purchase bills, and a member certificate built to the best level
research allows. Five gaps, all built, gate green (**20 checks, 0 red**), **not
live**:

1. **Admin had no Shivaa Black screen at all.** Members were rows inside
   `users[]`. Now `Admin → Shivaa Black`: every member with card number, member
   ID, issued, valid-through, days left and renewal count; a summary strip;
   filters; **↻ Renew** per member (1-36 months, and a live card **extends from
   its own expiry** rather than resetting a clock the customer already earned);
   **🖶 Printed → ✔ Shipped** for the free physical card; CSV; a printable
   posting list of address labels; and a sidebar badge counting what is still to
   post (`GET /api/admin/black-card/queue`, one pass over `users[]`).
2. **Renewal did not exist.** A six-month card simply stopped. `POST
   /api/black-card/renew` opens only in the **last 30 days** of validity or after
   expiry (otherwise **409** naming the days left), is rate-blocked 6/h, and keeps
   `memberId` / `cardNumber` / `certificateNo` — the number on the plastic in the
   customer's pocket never changes. Six **calendar** months (`black_add_months()`:
   a 31st lands on the last day of a shorter month, never rolls over).
3. **The offer gap.** Every Black line said **20%**, which is exactly what the
   public `MAKING20` coupon gives a guest. The percentage is now ONE setting,
   `settings.blackDiscountPct` (**default 25 at v229 — superseded: v230 ships 20**, clamped 0-40, 0 = benefit off
   without deleting anybody's card), resolved once per request into
   `$GLOBALS['shv_black_pct']` and read on the client through `blackPct()`. No
   coupon row is stored per member, so one number moves every member and no card
   number changes. **Deploying therefore raises every existing member from 20% to
   25% automatically** — that is the intended fix, and `DEPLOY-v229.md` §3 says so
   in terms the owner can act on. Historical rows are the exception and stay
   exceptions: `blackOrderPct(o)` derives an old order's rate from that order's own
   two numbers, because a receipt must never follow a setting.
4. **In-store bills.** Owner-side upload only (`Admin → In-store Bills`): jpg /
   png / webp / pdf, ≤6 files × 8 MB, stored in `.shivaa-private-bills` **beside**
   the document root (env `SHIVAA_PRIVATE_BILLS_DIR`, 0700/0600, refuses a symlink
   or an in-docroot path), type decided by magic bytes **on the way in and again on
   the way out**. Customers get `#/my-bills` with **exactly two verbs — View and
   Download** — and `GET /api/store-bills/{id}/file/{i}` **by index**, `no-store`,
   `nosniff`, `SAMEORIGIN`. `bill_public($b, $admin)` is one serialiser whose
   `$admin` flag decides whether the owner's private note, the mobile and the
   stored `ref` leave the server at all. Unavailable storage is a **503 that says
   nothing was saved** plus an amber box in the tab — never a save button that
   appears to work. Erasure treats a bill like the tax record it is:
   `bills_anonymize()` runs at **both** erasure routes and the record survives.
5. **The certificate became a document.** Four record boxes (certificate no ·
   member ID · issued · **valid through** — the first two are different
   identifiers and used to share one box), the name in caps as the largest element
   after the title, a promise line stating the percentage, both dates and the scope
   (*never on metal value, stones, GST or shipping*), a **signatory with a title**
   (*For Shivaa Jewels · Proprietor · the Shivaa Family*), a **verify line** naming
   `shivaa.in` and the certificate number, `RENEWED n×`, one guilloche band, four
   corner ornaments (the old markup shipped `c4` twice), and a state pill that
   turns **gold** rather than grey when the window closes — the certificate is
   still an honour. The download is now **A4 landscape 3508×2480 @300 dpi**: the
   same drawing scaled uniformly (`BK = 3508/1800`) so the seal is rendered at
   print resolution instead of upscaled.

New QA: `qa/v229-gate.sh` (the whole gate in one command), `qa/v229-routes.py`
(61 real-HTTP checks; **exits 3 + SKIP** on a dirty shim rather than failing on
fixture drift), `qa/browser/t-v229-black.mjs` (88), `qa/browser/t-v229-bills.mjs`
(102), `qa/phpbal.py` (brace/string balance for a 592 KB PHP file — there is no
`php` binary here), `qa/make-update-zip.py` (the zip is the previous zip's exact
list plus what this release added), and `qa/build-test-db.py --with-staff`.

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

**COUNTDOWN: release 235 pending owner review — nothing deployed without the
owner's explicit yes.** Live today: **v234** — the owner applied it on 23 Oct
2026 and immediately asked for the desk to keep updating "every millisecond".
Built and shipped to this repository, **not live**: **v235**. **Deploy v235** —
it contains v234 and makes the desk keep up with its data to the frame, shows
the age of every number to the millisecond, and polls at the rate the server can
actually answer; nothing that is live today is renumbered or re-shipped.

Last updated: 2026-10-23 (v235 "The Millisecond Desk" — the desk repaints on the
frame a tick lands, every number prints its true age to the millisecond, and the
poll rate follows what the server can actually answer. Earlier the same day, v234
"The Desk App" — a plan number and a receipt
number for every rupee, one view behind the customer's passbook, the public lookup and
the owner's ledger, a jeweller's board priced per fine gram, firm 90-second quotes with
TCS and a 0.2 % staleness band, and exposure marked to the live board. Earlier, v232
"The Idle Release" — the two loops that never slept
now sleep, one delegated tilt engine replaces a listener and a layout read per card,
the press answer v226 wrote for a phone comes back, nine card families stop reserving
a GPU layer each, the quick-view pill every phone shows on every card stops blurring a
backdrop it cannot see, and images decode off the frame. Earlier the same day: v231
"The Engraved Layer" — the certificate name fix is
now stated on the bare selector so no class-list edit can lose it, the sheet gains a
microtext security band rendered from an attribute, the guilloche paints two 58px
bands instead of a full sheet, corners are engraved with diamonds, and the member rate
still ships at 20 and still moves with the one setting. Earlier the same day: v230
"The Legibility Release" — the certificate's member name
was gold foil clipped to transparent glyphs on cream paper, about 1.4:1, and is now ink at
15.4:1; the member rate ships at 20% because 25% was a claim the site never made; the sheet
is engraved rather than decorated; and the paint cost of the certificate went down because a
per-glyph filter and a glyph-clipped gradient were removed. Earlier the same day: v229
"The Paperwork Release" — Admin gained a Shivaa Black control room with the free-card posting
queue, members can renew in one tap, the member percentage became ONE setting, in-store paper
bills got a private owner-side vault with a customer page that can only View and Download, and
the certificate became a document with four record boxes, a signatory, a verify line and an
A4 300 dpi download).
product page, forgot-password asks for the mobile then sets a new password, the home page's
₹₹ and dead hero hint are gone, and the footer/rail/copy got measured).
perfect, even more buttery smooth, and "fantastic animations on every clicks". Measured first: across 6
routes and 1058 visible interactive elements, matched against all 155 `:active` selector heads in the
shipped bundle, **265 answered a press with nothing** — 102 mega-menu tiles, 40 category-bar tiles, 33
Quick-view buttons, the brand link, the header offer pill, the utility and footer contact links. On a
phone it is worse: `mobile.css` neutralises `*:hover` with `!important` (correct — nothing may stick
after a tap) and its own press list is short, so most of those 265 had no answer at all. That is what
"clicks feel dead" is. `css/v226.css` (last layer in the bundle) now gives every measured family a
press — transform-only, springy, and under the union of `(pointer: coarse)` and `(hover: none)` so the
answer exists exactly where the neutraliser does — plus the house gold ripple on the pressable surface
(`js/v226.js`, reusing the v89 `.rip` span) and a single 5 ms haptic on a real tap (never on the down
of a drag). A page change no longer animates a long slide of the page being left:
`html{scroll-behavior:smooth}` was applying to the router's own `scrollTo(0,0)`, so `html.route-jump`
makes that one scroll instant. A 2px gold hairline sweeps the top of the screen **only** if the next
page has taken more than 180 ms to render — on a fast tap nothing is created at all. Where the browser
has `startViewTransition` (Chrome/Android, Safari 18) a page change now cross-fades the content while
the header, utility strip and bottom nav stay perfectly still, and the entrance animation stands down
for that one navigation. Two more badges answer too: the wish and compare counts pop like the cart
badge always has. New suite `qa/browser/t-v226-butter.mjs` (61 assertions). Packaged as
`shivaa-update-v226.zip`.

Earlier, 2026-10-16 (v225 "The App-Feel Release" — the owner asked for it to be even smoother
and even more graphically advanced, "just like modern-day D2C brand apps". What was left was the
frame itself: two scroll listeners ran their own rAF and each re-read
`documentElement.scrollHeight` **on every frame** — the one number that cannot change while a
finger is moving. `js/v225.js` now owns the chrome (progress hairline, back-to-top ring, its
`show` class) from ONE passive listener and ONE rAF, with the geometry measured only on resize /
route / document-resize and the writes quantised (bar 0.1%, ring 1/120 turn); both old handlers
feature-detect `window.__shvHub` and stand down. Measured: a six-event scroll burst reads the
document **zero** times. Two infinite `background-position` loops became composited `translate`
sweeps (`@keyframes mSkeleton` — the PDP skeleton ×7 and **every** product-card photo
placeholder — and `@keyframes auProg` on the 3px bar), a phone stopped reserving a GPU layer
per product card for a hover state it cannot trigger, the parallax finally runs on touch (11px,
offsets cached, no rect reads in a frame), eight rails plus the scheme stepper snap and own
their gesture, the 16px focus-zoom floor reached the 681–900px tablet band, twelve more live
numeral strips went tabular, and the card got the house gold hairline. New suite
`qa/browser/t-v225-appfeel.mjs` (80 assertions). Packaged as `shivaa-update-v225.zip`
(353 files, 37,235,572 B, sha256 3a05ef1c88635787c2d4a7509949194ddc7831bea5403abd38998bffc9c1e3dc).

Earlier, 2026-10-16 (v224 "The Every-Corner Release" — the owner asked
for it to be even smoother and for every usability corner to be checked. The
smoothness work was found where it was still hiding: **four CSS animations were
re-laying-out the page on every frame** (the hero float animated `margin-top`,
the pillar sweep, the finale sheen and the hover shine animated `left`, and two
decorative loops animated `filter`/`blur`). A layout animation is a full
re-layout per frame, and the hero one runs from the first paint of the home
page — that is the lag that survives a fast connection. All of them are now
`translate`/`opacity` only, i.e. compositor work, with the same geometry.
Then the **timers**: both countdowns rebuilt their whole strip with `innerHTML`
once a second for as long as the page stayed open (on screen or not), the
footer rate ticker rewrote byte-identical markup every 2.5 s, and the
"MCX live · Ns ago" line was written every second whether or not the text
changed. Now the strips are built once, only a changed digit is written, and
every one of those timers pauses off screen and on a hidden tab. Measured on
the scheme page: the page went from **~35 DOM node writes a second to ~2**.
Usability corners fixed with it: fields that made **iOS zoom the whole page in
on focus** (the 16 px floor existed in several layers but later layers
re-declared smaller sizes on top of it — the new v224 layer holds it), 6-8 px
carousel dots are now **tap targets** (size unchanged, 27 px hit area), the
concierge and utility FABs now **clear the phone's home indicator**, the chat
panel can no longer be taller than the visible screen, and the per-second
numerals use tabular figures so the strip stops re-measuring itself. Also
verified: **nothing was lost when the 58 stylesheets became one bundle** (all
57 files v221 linked are in the bundle — checked against the old `<link>`
list), no 404s, no DOM leak, no layout shift, and only two CSS files on disk
(`bot.css`, `v108.css`) are provably dead — they were never linked, not even
before the bundle, and nothing loads `bot.js`/`v108.js`. Packaged.)

Earlier, 2026-10-15 (v223 "The Smooth Release" — the owner asked for the
site to feel as smooth as a delivery app, with no lag and no bugs. The cause of
the lag was found and removed: the five gold-thread films set `preload="auto"`
**and their `src`** at mount, so **all 4.5 MB of video was requested the moment
the home page rendered**, before the reader had scrolled anywhere near them, and
every film then kept decoding off-screen frames while the reader scrolled past.
Now a film mounts with **no `src`** and `preload="none"` — a fresh home page
requests **zero video bytes** — one observer wakes the film you have actually
reached, and a film you have gone well past is released (buffer handed back).
Reduced-motion visitors never fetch a film. The same pass confirmed the rest of
the smoothness surface is clean: **23 of 25 scroll/touch listeners already
passive** (the one blocker is the gallery's deliberate drag), **no DOM leak**
(idle DOM stable at 1897 nodes), **no 404s** (264 local references checked),
**no layout shift** (product cards already reserve their space). Packaged; the
v222 load release below is one release back).

Build branch note: this repository's v221–v227 builds ran on the
session branch `arena/e8a470c6-shivaa-ecom`, which is branched from
`arena/09f3c79f-shivaa-ecom` at its v220 tip (`4a9e239`) — the two trees were
byte-identical when v221 started. `arena/09f3c79f-shivaa-ecom` itself was not
modified.

---

## 1 · The absolute rules (owner's — never break)

1. **Forward-only.** Never reuse or renumber a shipped release. Live is **v234**;
   **v235 is built and pending the owner's yes** (the desk repaints on the frame
   the data lands, every number carries its true age in milliseconds, and the
   poll rate follows what the server can actually produce); **the next release
   is v236**.
   Never deploy an older tree over a newer live one. No reverts, no force-pushes,
   no resurrecting old zips.
2. **Nothing goes live without the owner's explicit yes.** A push, a merge, a
   green test run, or a finished zip is NOT approval. If the owner only
   reviews, review only.
3. **Every release** gets: version stamps in `index.html` (`?v=NNN` +
   `window.__SHIVAA_REL`), `sw.js` (SHELL name, REL, SHELL_FILES), `app.js`
   (`APP_REL`), `api.php` (`'rel' => NNN`), a root `DEPLOY-vNNN.md`, a
   `shivaa-update-vNNN.zip` of the whole `cms/` tree (minus `data/`), both
   docs updated, then commit + push (from v221 onward: to the session branch
   `arena/e8a470c6-shivaa-ecom` — see the build branch note above).
4. `cms/data/db.json` is a **synthetic local fixture** (gitignored). Never
   commit it, never hand-edit it on the live host. The preview shim needs it —
   regenerate if the sandbox is reset (rates shape: `rates.last` needs
   gold24/gold22/gold18/silver).
5. Do not delete branches. Do not merge other branches into this one. This
   session is permanently on `arena/09f3c79f-shivaa-ecom`.
6. **No invented superlatives** in customer-facing copy ("best in the world").
   Ask the owner for facts instead. Historic forms (Gold biscuits, tilak) are
   the safe vocabulary.
7. CSS seals: never `filter` on `.bc-card` (flattens preserve-3d — v206
   neutralizes v184's hover with `filter:none`); the flip card stays
   `div[role=button][data-flip-card]` (never `<button>`); never transform
   `.c-slide` or `.c-slide img` (flex track + Ken Burns); never override
   earlier `position` seals; `background-clip:text` does not survive on
   reveal-split words (use solid colours); keep the v200 gold button gradient.
   After any `cms/js/app.js` edit, `node --check cms/js/app.js` and confirm
   the closing `})();` of the IIFE is intact.

## 2 · Class-name ground truth (the audit's old map lied)

- The home gold-biscuit campaign banner is
  `.shv-home-campaign-entry > .shv-home-campaign-card > .shv-hcc-art` +
  `.shv-hcc-content` (`.shv-hcc-kicker/-title/-sub/-cta-row`). **`.shv-hcc` is
  a phantom class — rules on it do nothing.**
- Offers: home hero slot `[data-banner-offer]` (non-compact) renders
  `.shv-offer-grid` of `.shv-offer-card` (`bannerOfferCard` + `premiumCardHTML`
  + `certificateCardHTML`); drawer/footer compact slots render
  `.shv-offer-stack > .shv-offer-mini` (`bannerOfferMini`, markup =
  `.shv-offer-mini-pct` + `.shv-offer-mini-txt`).
- Rate strip: `#rateStrip .rscell [data-rsh]`, flash classes `m-flash-up` /
  `m-flash-down`, plus the `.rs-ticker` marquee ribbon (v208).
- Flip card: `.bc-card-wrap` / `.bc-card` (v184.css holds the base 3D; v208
  adds the `-webkit-` spellings for iOS).

## 3 · Release log

| Rel | Theme | Status |
|-----|-------|--------|
| v205 | T3 live baseline (WWW + Netlify) | **LIVE** |
| v206 | Black Card flip fix (`filter:none` neutralizer, glint, focus ring) | built, awaiting deploy |
| v207 | Readability pass (45 routes × desktop + mobile audit, colour only) | built, awaiting deploy |
| v208 | Megabrief: offer-certificate 4-box, rate-strip motion, header fix, mobile comfort (search, banners, case, drawer minis, auth, B2B), bug hunt | built, delivered to owner |
| v209 | The Alive Release: flip-tap + 5D on phone & laptop (is-lit filter flatten bug), film case turns itself + 4 films play, Amrita food banners animated, laptop scroll-flicker kill (sticky header backdrop-filter + v208 parallax), Passport auth reborn | built, delivered to owner |
| v210 | The Gallery Release: the 4 case films really run (all four autoplay, gesture unlock, film FILES now ship in the zip) + the 4 home offer banners are art panels | built, delivered to owner |
| v211 | The Stillness Release: Shivaa Black hero flicker/flash killed at the root (noise blends, blur filters, drop-shadow on the flip card, pointer-churn, infinite loops, twinkle canvas), food offer banners = painted charger-plate art panels, case degrades to still frames instead of dying | built, delivered to owner |
| v212 | The Clarity Release: tap-to-flip works everywhere (covered tap area + invisible hint + tap friction fixed; whole card-wrap is the tap target; gold pill hint), the 4 offer banners = strict two-zone art-band/typography panels, zero text overlap | built, delivered to owner |
| v213 | The Pocket Release: the films case turns on phones (touch spin owns sideways swipes, -webkit-3D chain, films mount on save-data too), Black Card hero stage restored on mobile (styles.css display:none !important was hiding it), home orphan markup removed, sidebar thumb pass | built, delivered to owner |
| v220 | The Billing Removal Release: the showroom billing software is taken off the website. Admin → Settings loses the Billing Software card and its sync-key form; the signed billing stock bridge (billing/stock and billing/stock-movement routes, signing helpers, billing-sync rate limit, sync-key setting) is removed from api.php; docs/BILLING-SYNC-CONTRACT.md is deleted. The billing app folder on the server (public_html/billing/) is not in this repo and must be deleted by the owner in Hostinger. |
| v219 | The Depth Release: the 10 g Gold Scheme entry is readable (its gold fill never painted, so v217's dark ink sat on dark glass; both are now set on that button); the four offer banners tilt toward a mouse pointer (7 degrees max, mouse only, never on touch) with a pointer glare and a drifting artwork layer; the offer buttons are gold pills with a light sweep and lift; off-screen banners pause their sheen. New: js/v219.js (passive, rAF-batched). |
| v221 | The Clean-Up Release: the dead revolving-case code is removed. `js/v125.js` loses the never-called case mount routine and its scaffolding (~15 KB); the case CSS is removed from all eleven stylesheets that still carried it (275 lines), while even the shared selector lists are trimmed selector-by-selector so every live rule survives — including bare `.sv-case-no`, which the gold thread's FILM badge still uses. No visual or behavioural change is intended. |
| v222 | The Load Release: the shop loads as ONE stylesheet. `index.html` linked 58 render-blocking <link> tags for 57 stylesheets (and six of them arrived late through the preload-swap pattern, restyling the page after first paint); they are now bundled into `/css/shivaa.css` by `tools/build-css-bundle.py` in the exact historical cascade order — 1 blocking request, 168 KB gzipped instead of 268 KB, nothing late. `sw.js` precaches that one file instead of 57. Also fixes a boot race: `state.settings` was null until `/api/settings` answered (boot caps that at 6 s and paints anyway), so a route rendered in that window threw — the Contact page read `.address` off null and died on a slow connection. |
| v223 | The Smooth Release: the lag had one cause and it is gone. `filmMedia()` in `js/v125.js` mounted all five gold-thread films with `preload="auto"` **and** their `src`, so **~4.5 MB of video was requested at home-page render** before the reader scrolled anywhere near the films, and each film kept decoding off-screen frames afterwards. Films now mount with **no `src`** and `preload="none"` (fresh home page = **0 video bytes**); one `IntersectionObserver` (`rootMargin: 1200px`) wakes the film being watched (`wake`), pauses-but-keeps the near ones, and **releases** the buffer of a film left well behind (`rest`); `wake()` is idempotent, a released film is never treated as broken (v211 error handler returns early when there is no `src`), and reduced-motion visitors never fetch a film. Posters, the FILM badge, `playsinline` and the full-screen reel are unchanged. No CSS and no JS files were added or removed. | The same pass measured the rest of the smoothness surface and found no further win to take: **23 of 25 scroll/touch listeners are already passive** (the only blocking one is the product gallery's horizontal drag, which must call `preventDefault()`), the idle DOM is **stable at 1897 nodes** (no leak), 264 local asset references contain **no 404**, product cards already reserve their space (no layout shift), and JS bundling was **considered and rejected** (deferred scripts already download in parallel; `app.js` holds 308 top-level declarations and two files carry top-level `'use strict'`, so concatenating them risks cross-file leakage). New suite `qa/browser/t-v223-smooth.mjs` (39 assertions) owns the contract and fails any new non-passive scroll/touch listener. | built, delivered to owner |
| v224 | The Every-Corner Release: (1) **smoothness** — every continuously running CSS animation is now compositor-only: the hero float animated `margin-top`, the pillar sweep / finale sheen / hover shine animated `left`, `floatBullion` animated a 40px `drop-shadow` and `bcBeam` a `blur()`. All five now animate `translate`/`opacity` with identical geometry (the two shadows/bursts are static filters, and the private `--px`/`--py` hero parallax was found to have no producer in any shipped file). (2) **timers** — `bindCountdown` and `bindFinaleCd` rebuilt all four cells with `innerHTML` once a second, forever, on screen or not; the footer rate ticker rebuilt byte-identical markup every 2.5 s; the `data-rate-age` line was written every second regardless of change. All four now build once, write only changed digits/text nodes, and pause when off screen (`IntersectionObserver`, 120px) or on a hidden tab. ~35 DOM node writes/second → ~2. (3) **usability corners** — new `css/v224.css` (last layer in the bundle): the iOS focus-zoom floor (a focused field under 16px makes Safari zoom the page in and never zoom back; the floor existed in v116/v120/v192/v194 but later layers overrode it — the 39 selectors raised here are below 16px *everywhere* they appear, so nothing can shrink, and the deliberately large fields (`.otp-boxes input` 17-22px, `.shv-otp input` 20-28px, `.bbc-wt input` 34px) are untouched); the quick-view/gallery dots keep their 6-8px look but gain a 27px hit area on a 20px-pitch row; the concierge, theme and back-to-top FABs clear `env(safe-area-inset-bottom)`; the chat panel gets a `dvh` height so it can never be taller than the visible screen; live numerals are tabular; panel scroll no longer drags the page behind it; the newsletter field asks for the email keyboard and no autocapitalise; and the admin/QR images that shipped without `alt` now have it. New suite `qa/browser/t-v224-corners.mjs` (62 assertions) owns all of it. | built, delivered to owner |
| v225 | The App-Feel Release: the frame the phone paints while a thumb is moving. (1) **one scroll frame** — `app.js` and `aurum.js` each ran their own scroll listener on their own rAF and each read `documentElement.scrollHeight` + `clientHeight` on **every frame**; `js/v225.js` now owns the chrome from one passive listener and one rAF, measuring the geometry only when it can change (resize, route, a `ResizeObserver` on the body, three late passes) and quantising the writes (bar 0.1%, ring 1/120 of a turn). A six-event scroll burst reads the document **zero** times; `hub.measures` does not move, and a resize does re-measure. Both old handlers feature-detect `window.__shvHub` and stand down, so a warm cache can never leave the bar with two writers or none. (2) **parallax on the phone** — feature 12 was gated to `(hover:hover) and (pointer:fine)` over 1023px; a coarse pointer now runs it at **11px instead of 26**, still off for reduced-motion and `au-lite`, still tagged only within 80px of the viewport, and each element's document offset is **cached** (re-taken when the hub reports the document changed shape) so a scroll frame performs **no `getBoundingClientRect()`** on any device; a detached element is dropped instead of being written to for ever from a 0×0 box. (3) **two infinite repaint loops become composited sweeps** — `@keyframes mSkeleton` (the PDP skeleton ×7, plus `.pc-imgwrap` / `.tv-ph` while a photo loads, which is **every** product card) and `@keyframes auProg` (the 3px progress bar, which never idled for a second of any visit) animated `background-position`, which no browser can composite. Both now move a pseudo-element with `translate` — same colour, speed and angle; `.pc-imgwrap::after` is already the gold hairline, so the placeholder sweep is a `::before` at z-index 0 with the photos lifted while the placeholder is live. (4) **a card is no longer a GPU layer on a phone** — `.p-card` reserved `will-change: transform` for a hover state a finger cannot trigger (20–60 layers held in video memory on a shop page); `html.au-touch .p-card { will-change: auto }`, desktop untouched. (5) **rails** — eight `overflow-x:auto` rails (`.cat-chips`, `.adr-sw`, `.stages`, `.sz-strip-wrap`, `.tabs`, `.acct-nav`, `.adm-nav`) plus the scheme stepper gain `scroll-snap-type: x proximity`, snap points on their children and `overscroll-behavior-x: contain`, so a flick parks on a label and a swipe at the end cannot become the browser's back gesture. (6) **tablets** — the v224 16px focus-zoom floor extended to the 681–900px band (an iPad in portrait is 768px), same field list, still no `!important`, so nothing large can shrink. (7) **depth and digits** — twelve more live numeral strips go tabular, `.p-card` gets the house gold hairline (`rgba(212,175,90,.14)`, `.42` + a wine-tinted shadow on hover) and the Android grey tap flash is suppressed on the eight card/chip/tile selectors that already answer with their own press transform. New suite `qa/browser/t-v225-appfeel.mjs` (80 assertions). | built, delivered to owner |
| v226 | The Butter Release: every click answers. (1) **press physics** — the measurement above; each dead family now has a transform press, and on a finger the rules carry `!important` because `mobile.css`'s `*:hover{transform:none!important}` would otherwise erase them. (2) **ripple + haptic** — `js/v226.js` reuses the v89 `.rip` span: small controls ripple at touch-down, big surfaces (a product card, a list row) ripple only on a real tap so starting a scroll never lights them up, rail items ripple on release so a flick cannot fire a ripple on every chip it passes, and the host is clipped only for the 700 ms the ripple is alive. One 5 ms vibration on a real tap, gated like the house gates haptics (coarse AND not reduced-motion). (3) **rail centring** — tapping a chip, tab or step in a snapped rail glides that item to the middle of the rail. (4) **badges** — the wish and compare counters pop with the same `mBump` keyframe the cart badge has used since v89. (5) **route jump** — `html.route-jump` makes the router's scroll-to-top instant for that one navigation instead of animating a long slide of the page being left. (6) **pace bar** — a 2px gold hairline sweeps the top of the screen only when the next page takes longer than 180 ms; on a fast tap nothing is created. (7) **view transitions** — where `startViewTransition` exists the content cross-fades (6-10px, transform/opacity) while the chrome stays still and the entrance stands down for that navigation; skipped for reduced motion, for `au-lite` devices and for a link marked `data-no-vt`. New suite `qa/browser/t-v226-butter.mjs` (61 assertions). | built, delivered to owner |
| v227 | The Reading Layer: (1) **the black-card claim works from every product page** — the reader demanded `[data-black-claim] [data-bc-intake]`, which only exists on `#/black-card`, so a PDP tap returned "Enter your name", stopped there, and the status writer had nowhere to write either; the reader is form-aware, the invite card carries its own status line, the claim falls back to the account name and sends a nameless account to the page that asks, and the post-login auto-claim prefills its form first. (2) **forgot-password is mobile-first** — 4-digit code to the registered mobile, then new password + repeat, real 30 s resend; `api.php` takes `{phone}` or `{email}` and always texts the registered mobile. (3) **home page** — the rate ribbon printed `₹₹` on every figure, the legacy hero hint was a bare `<div>` that ate taps, the home hero's "discover" measured 44 % white in 60 % opacity, and the news logo + mega feature art loaded eagerly with no intrinsic size. (4) **the reading layer** — footer bleed follows the nav's measured height, late mounts are still deferred, the rail centres its active chip without moving the page and stops animating under reduced motion, and the deepest footer gold is readable. Suites: blackcard 28, reset 31, design 41. Packaged as `shivaa-update-v227.zip`. |
| v231→v232 note | v232 supersedes v231, v230 and v229; deploy **v232** only. | — |
| v235 | **The Millisecond Desk**: the owner asked for the desk to keep updating *every millisecond*. No exchange sends a thousand prices a second, so nothing here pretends to — it makes the desk keep up with the data it has, to the frame, and makes every number state its age. (1) **The frame, not the fetch**: `pushTick()` queues an arriving tick and paints at most **one per animation frame**, newest wins (eight ticks in one frame → `paints = 1`); the value flash restarts on the next frame instead of reading `offsetWidth`, so a price change costs **zero** forced layout reads (counted with a getter in the suite). (2) **Every number says how old it is**: a millisecond clock, the true age of the digits on screen (server `ageMs` + time to reach the frame), and the measured arrival rate, written by one rAF loop that touches text only; amber past 1.5 s, red and a dimmed board past 5 s; the loop stops on a hidden tab and never starts without a board, so the storefront pays nothing. (3) **Ask at the rate the server can answer**: `/api/bullion/tick` now carries `nowMs`, `cacheAgeMs` and a `poll` hint with a reason — 250 ms when a push relay fills the cache, 1000 ms against the 1 s exchange cache, 5000 ms when stale. The desk used to poll every 800 ms against a 1 s cache (one request in five wasted); it now polls at the cache's rate — same freshness, 20 % fewer requests. New `qa/browser/t-v235-live.mjs` (**71**); gate `bash qa/v235-gate.sh` → **26 checks, 0 red** with v234-desk 111/0, v233 146/0, v232 87/0, v229 bills 102/0, ink 53/0, cert 61/0, black 88/0, routes 61/0. **367 files** (adds `css/v235.css`; 69 layers / 69 blocks, still one stylesheet request). | built, awaiting the owner's yes — **deploy this** |
| v234 | **The Desk App**: the owner asked for the bullion application to be more compatible and operational on PC and Android. (1) **An app, not a page inside a shop**: `/desk.html` is generated from `index.html` by `tools/build-desk-shell.py` (seven asserted transforms; `--check` in the gate fails on drift) and carries its own identity — `desk.webmanifest` (`Shivaa Bullion Desk`, standalone, `orientation: any`, four shortcuts to Rates/Quote/Day book/Deals, maskable icon, scope `/desk.html`), its own runtime `js/v234.js` loaded by the desk **only** (index.html stays free of it), and no utility strip, masthead, bottom nav or footer. (2) **A PC is not a phone**: from 1000 px the tab bar becomes a seated segmented row, the maths strip four columns, the calculator two; from 1500 px the quote rail is sticky *beside* the board. A keyboard map (`1–4`, `C` quote, `B` day book, `R` refresh, `F` full screen, `P` print, `?`) works in the browser too. On Android: 44 px targets, safe-area insets, no rubber-band, pull-to-refresh, an opt-in wake lock, and Share for a quote or a slip. (3) **Metal gets paperwork**: `POST /api/bullion/orders/<id>/settle` settles in full **or in tranches** — 40 g then 60 g write **two** numbered slips (`DS<yymd>-<nnnn>`) and leave **one** order at 100 g, never 200; over-settling, a cancel after metal moved, and another jeweller's deal are each refused in words. `GET /api/bullion/daybook` totals the day on the **server's** date (grams, fine grams, value, TCS, settled, open, mark-to-market) as a screen, CSV and paper; `POST /api/bullion/watch` pins the rows a desk trades, and every row now prints its **₹ per fine gram** with a ★; `bullion_exposure` separates settled from open grams. New `qa/browser/t-v234-desk.mjs` (**111**), gate `bash qa/v234-gate.sh` → **25 checks, 0 red** with v233 146/0, v232 87/0, v231 53/0, v230 61/0, v229 bills 102/0, black 88/0, routes 61/0. **366 files** (adds `css/v234.css`, `desk.html`, `desk.webmanifest`, `js/v234.js`; 68 layers / 68 blocks, still one stylesheet request). | built, awaiting the owner's yes — **deploy this** |
| v233 | **The Passbook Release**: the owner asked for a Swarna Nidhi that is fully functional and traceable for every customer, and a jeweller's bullion desk that is more practical. Neither was a design problem. (1) **A plan had no number and a receipt had no number**, so nothing could be traced outside the counter: a plan is `SN<yy>-<seq>` (`SN26-0001`), every instalment a numbered receipt (`SN26-0001-01`), and ONE builder (`savings_view()`) now feeds the customer passbook, the public lookup and the owner's ledger — the same view three times, so the three cannot disagree. The passbook carries grams bought **at the rate that instalment actually paid**, next due, the bonus month (unlocked at 11 instalments) and progress; `POST /api/savings/track` answers a plan number plus the **last four of the registered mobile** with a masked holder and **no** phone, email or staff note, 30 lookups an hour per IP then a 15-minute block; `POST /api/savings/request` lets the customer raise a redeem/close request that the desk stamps `done`; the Nidhi tab is a ledger (receipts, `⇢ Open plan` for a counter payment via `POST /api/admin/savings/open`, printable receipt, CSV). (2) **The desk could see a rate but not buy one**: `GET /api/bullion` now carries ₹ per **fine gram** per row (the only way 995 compares with 999), the best row per metal, purity factors 999/995/916/750, and mark-to-market `exposure`; `POST /api/bullion/quote` returns `BQ<yymd>-<nnnn>`, **90 s** of life, TCS 0.1 % on a buy (0 on a sell); `POST /api/bullion/order` takes `quoteNo` and refuses — in words — an expired quote, one whose metal moved **>0.2 %**, one for the other side, or somebody else's, while the old quote-less flow still works. New `qa/browser/t-v233-nidhi.mjs` (**146**), gate `bash qa/v233-gate.sh` → **24 checks, 0 red** with v232 87/0, v231 53/0, v230 61/0, v229 bills 102/0, black 88/0, routes 61/0. **362 files** (adds `css/v233.css`; 67 layers / 67 blocks, still one stylesheet request). | built, awaiting the owner's yes — **deploy this** |
| v232 | **The Idle Release**: the owner said the app does not feel smooth. Measured first: a silent home page asked for **1264 animation frames in twelve seconds**, **1148 of them from two loops that never stop** — `_msTick` (the bullion interpolator, two `document.querySelector` calls per frame, forever, hidden tabs included) and the cursor glow (which wrote **`style.left`/`style.top`** at 60 fps, a forced layout of a 340 px `mix-blend-mode:screen` layer per frame, with the mouse parked). Idle rate **123 frames/s → 0**. `bindTilt()` hung a mousemove **per card** and read a rect **per event**; `init3DCardTilts()` hung a touchmove on four families, i.e. a layout read per touch event *while scrolling* — one delegated engine now takes **one rect per card visit** and **one write per frame**, and a scroll gesture stands the tilt down. **A press answer dead on every phone since v226**: `styles.css:4637` (`transform:none !important` at ≤820px) and `v219.css:129` beat v226's `.p-card:active`/`.cat-card:active`/offer-card rules, so the three things a shopper taps most never answered a finger — restored with v226's own values, important, gated on `no-preference`. Nine card families stop reserving a permanent GPU layer each (promoted only while a pointer is over them, flat on touch); the quick-view pill every phone shows on every card stops carrying `backdrop-filter:blur(6px)` behind a fill that is already 96 % opaque (and closes to .98, so it reads *more* solid); 56 of 68 `<img>` literals get `decoding="async"` except the LCP set; a hidden tab stops polling the gold rate every second. `content-visibility` deliberately untouched — v217 sealed it after the page-jump bug. New `qa/browser/t-v232-idle.mjs` (**87** — counts frames in a silent window, counts layout reads per pointer move, proves the counter is live, hides the tab); gate `bash qa/v232-gate.sh` → **23 checks, 0 red** with v231 53/0, v230 61/0, v229 bills 102/0, black 88/0, routes 61/0. **361 files** (adds `css/v232.css`; **no new request** — the governors live in `app.js`). | built, awaiting the owner's yes — **deploy this** |
| v231 | **The Engraved Layer**: the owner asked for the graphics to go further and the app to be smoother, after v230 fixed his two reports. (1) **The ink fix became structural** — v230 keyed its reset on `.bc-certificate.v230 .bc-cert-name`, which is one class-list edit away from dead, so v231 states the same four-mechanism reset on the **bare** `.bc-cert-name` with `!important` and gives every other line of the document `-webkit-text-fill-color: currentColor` + `background-clip: border-box`; that guard restates **no colours**, so a future layer can still restyle the sheet. (2) **Microtext**: one 9px band of 5.5px letterspaced text under the top border, rendered from `data-microtext` via `content: attr()` (no text node, nothing duplicated), reading `SHIVAA FAMILY · PRESTIGIOUS MEMBER · SHIVAA JEWELS JAIPUR · NOT A FINANCIAL INSTRUMENT` — the banknote cue the HTML sheet never had. One band only: a pseudo-element of a 9px parent cannot reach the foot of a 600px sheet. (3) **Paint**: the guilloche was a full-sheet element whose gradients were merely *positioned* as bands, so the browser rasterised ~900×600; it is now two **58px** elements (44px on a phone) with a `.bc-guilloche-foot` modifier — same artwork, about a fifth of the area, and the suite asserts the height because "less paint" is a claim about a number. Plus engraved corner diamonds (still exactly four), a pressed rather than glowed title, and crisp ink on the card's benefit plate. Still **no keyframes / transitions / will-change / filter**; `contain:paint` from v230 still isolates the sheet. New `qa/browser/t-v231-ink.mjs` (**53** — recomputes both WCAG ratios, checks the bare-selector reset lands **after** the foil rule in the shipped bundle, counts the guilloche nodes, and proves 20 is a default by moving the setting to 21); gate `bash qa/v231-gate.sh` → **22 checks, 0 red** with v230 61/0, v229 bills 102/0, black 88/0, routes 61/0. **360 files** (adds `css/v231.css`). | built, awaiting the owner's yes — **deploy this** |
| v230 | **The Legibility Release**: the owner reported that the member's name on the certificate was the same colour as the background. It was — `v201`/`v205` clipped a gold foil into `.bc-cert-name` (`background-clip:text` + `color:transparent` + a dark `drop-shadow`) for the **dark** stage those releases shipped, and the paper certificate is cream, so it measured ~**1.4:1**. v229 had set a colour, which won the cascade but left the treatment in place; `css/v230.css` removes all four mechanisms (`background`, `background-clip`, `-webkit-text-fill-color`, `filter`) with `!important` scoped to ink/foil/print only, and puts ink `#2b1a05` on paper at **15.4:1 / 9.6:1** (AAA), with the same ink in the A4 download and pure black in print. Second report: **25% is a false claim — prestigious members are 20% off making charges**; since v229 the rate is ONE setting, so the *default* moved in `api.php`, `app.js`, the Admin field and the dev mirror, the clamp (0-40) and the owner's control did not, and the fixture now stores 25 so the override is still proven. Graphics taken further (seal with a conic tick band and two rings, engraved double-rule border, denser guilloche, record boxes with an accent edge, the promise line in a cartouche, a signature rule, a hairlined verify strip, a flourish under the name), and smoothness as subtraction: a per-glyph filter and a glyph-clipped gradient removed from the most painted element on the member page, `contain:paint` added, **no keyframes, no transitions, no will-change**. New `qa/browser/t-v230-cert.mjs` (61 assertions — it computes WCAG contrast for both the failing foil and the fixed ink, and proves 20 is a default by moving the setting to 22); new gate `bash qa/v230-gate.sh` → **21 checks, 0 red** with v229 still green (bills 102/0, black 88/0, routes 61/0). **358 files** (adds `css/v230.css`). | built, awaiting the owner's yes — **deploy this, not v229** |
| v229 | **The Paperwork Release**: (1) `Admin → Shivaa Black` — members were only ever rows in `users[]`, so there was nowhere to see who holds a card, when it runs out, or which free plastic cards still have to be printed and posted; the tab adds the list, a summary strip, filters, per-member **↻ Renew** (1-36 months, a live card **extends from its own expiry**), **🖶 Printed → ✔ Shipped**, CSV, a printable posting list of address labels and a sidebar badge fed by `GET /api/admin/black-card/queue`. (2) **Renewal exists**: `POST /api/black-card/renew`, open only in the last 30 days of validity or after expiry (else **409** naming the days left), rate-blocked 6/h, keeping `memberId`/`cardNumber`/`certificateNo` and adding six **calendar** months. (3) **The offer gap closed**: the member percentage was a literal 20 in nine places — exactly what public `MAKING20` gives a guest — and is now ONE setting, `settings.blackDiscountPct` (default **25**, 0-40, 0 = off without deleting cards), resolved once per request; no coupon row per member, so one number moves everybody and no card number changes, while `blackOrderPct(o)` keeps historical receipts on the rate they actually paid. (4) **In-store bills**: owner-side upload only, `.shivaa-private-bills` **beside** the docroot (env override, 0700/0600, no symlinks, magic bytes in *and* out), streamed **by index** with `no-store`/`nosniff`/`SAMEORIGIN`; the customer page `#/my-bills` has **exactly two verbs, View and Download**, and `bill_public($b,$admin)` never sends the owner's note or a stored `ref` to a customer; unavailable storage is a **503 that says nothing was saved** plus an amber box, and erasure anonymizes bills at **both** routes because a bill is a GST record. (5) **The certificate is a document**: four record boxes (certificate no and member ID are different identifiers and shared one box), valid-through, a promise line with the percentage, both dates and the scope, a signatory **with a title**, a verify line naming `shivaa.in` and the certificate number, `RENEWED n×`, one guilloche band, four corner ornaments (the old markup shipped `c4` twice), an archived pill that turns **gold** not grey, and an **A4 landscape 3508×2480 @300 dpi** download. Gate: `bash qa/v229-gate.sh` → **20 checks, 0 red**; new suites `t-v229-black` 88/0, `t-v229-bills` 102/0, `qa/v229-routes.py` 61/0. | built, awaiting the owner's yes |
| v228 | The Play Store Gate: the erasure page Google requires now exists. `POST /api/auth/delete-account` had shipped at v183 with no caller and no page — every document pointed at `#/delete-account`, which fell through the router to Home, so the URL Play would have been given opened the shop. `#/delete-account` (alias `#/erase-account`) is now a page: signed out it proves the number with a fresh SMS code (no sign-in first), signed in the session is proof, both need the word DELETE, the owner and B2B partners are refused server-side, success anonymises the row and kills every device token, and the page repeats the server's message; the account screen carries a Privacy & my data tile. The TWA shortcut "Ring size guide" pointed at `#/size-guide`, which never existed (the sizer is `#/sizer`) — now an alias, and all three shortcuts are proven to render. `holdRepeat` also stopped stepping pages that were left (t7-audit caught the TypeError on the size page). New suite `t-v228-play.mjs` (51). Packaged as `shivaa-update-v228.zip`. |
| v218 | The Sign-in Release: the 10 g Gold Scheme entry on home is highlighted (halo ring, larger target); the funnel stops jumping to top (scroll only when the step is off screen, never on first paint); the sidebar is the earlier drawer again plus swipe-left-to-close; the film case is removed for good (script, mount, module, CSS hooks, tests); the Retail and Jeweller B2B sign-in sheet is restyled in v218.css under #shvAuthWrap, JS and IDs unchanged. |
| v217 | The Steady Release: root cause of the refresh/jump-to-top found — content-visibility:auto on home sections and product cards (v117/v121/v122/v214) with guessed heights made the page height change while scrolling; now forced to real layout. Case reinstalled as cms/js/v217-case.js (one pointer path, no scroll/resize listeners, one play-state function; phones play the front film only). Mobile drawer rebuilt (slide + scrim + 48px targets); phone search = one full-screen panel; Win-10g campaign buttons readable + stacked on phones; offer panels get four motifs (rim, ribbon, diamond points, seal) | built, owner review pending |
| v216 | The Wow Release: offer banners get real painted artwork (images/offers) + one slow light sweep instead of drawn shapes; phone films — on touch screens only the front film plays (phones cannot decode four at once), the others show posters and play when brought round; Black Card hero becomes one column (card, certificate, status) with one calm float, no overlap, no drop-shadow | built, owner review pending |
| v215 | The Proof Release: owner's four points solved at the root — flip stays dead (guard suite), organic three-property card float (translate/rotate/scale at 5.4/8.6/6.7s) + gleam every 5.2s, THE scroll-flicker root killed (motion.css blur-up: every content image animated blur(6px)+scale(1.06) on load — now opacity-only), phone case rebuilt as flat 2D cover-flow (no preserve-3d — cheap WebViews flattened the 3D ring, which is why drag and all-four-films kept dying), wrap fold hides the spin seam, thumb rail of all four posters on every screen | built, owner review pending |
| v214 | The Smooth Release: tap-to-flip removed entirely (owner order), card floats + gleams (compositor-only), scroll-flicker deep pass (motion.css image blur-up killed, aurum shimmer/pulse/halo loops frozen), load smoothing (content-visibility), phone case fixed for good (pan-y restored on cards — v213's manipulation had handed swipes to the browser; webkit-prefixed inline transforms; all-four-films thumb rail) | built, owner review pending |

## 4 · QA tooling (all under `qa/`)

- `python3 qa/preview_shim.py --port 8090` — static + API mirror (needs
  `cms/data/db.json`; `offers/banner` route added in v208). Never deploy it.
- `node qa/browser/t-v206-flip.mjs` — flip regression (ALL PASS at v209).
- `node qa/browser/t-v209-alive.mjs` — the owner-complaint acceptance suite
  (flip/case/food/flicker/Passport — PASS 34/0 at v209).
- `node qa/browser/t7-audit.mjs` — routes/buttons/errors walk (PASS 4/4 at
  v208: 50 routes, 151 buttons, product page 30 controls, 0 real errors;
  jsdom internals filtered).
- `node qa/browser/audit-contrast.mjs [mobile]` — strict contrast greeter;
  gold-on-cream design language is an accepted owner trade-off (flagged rows
  ≥4.5/3:1 only need fixing when a REAL user complaint matches).
- `node qa/browser/harness.mjs` — jsdom boot harness (jsdom lives at
  `/tmp/node_modules` — `npm install --prefix /tmp jsdom` after sandbox
  resets). Run long audits with `nohup` + **unique log names**.
  v229 additions: **`opts.seed(window)`** runs in `beforeParse`, which is the
  only moment a suite can put `shv_token` in localStorage (app.js reads it and
  fetches `/api/auth/me` during its own boot, and every `JSDOM.fromURL` gets a
  fresh localStorage); the fetch stub reads the body **once** with
  `arrayBuffer()` and derives `text()/json()/arrayBuffer()/blob()` from that one
  read, because a bill is a PNG that `r.text()` would mangle; and
  **`URL.createObjectURL`/`revokeObjectURL`** are stubbed over a countable map
  (`window.__blobStore`) so a suite can prove that opening a second file revokes
  the first. `getContext` still returns null by design — the canvas savers always
  take their toast-guard path, so assert the guard, never a blob.
- **`bash qa/v235-gate.sh`** — the current release gate in one command: bundle
  proof (69 layers / 69 blocks), `qa/phpbal.py cms/api.php`, `node --check` ×10,
  the sixteen historic suites plus `t-v232-idle` on the plain fixture,
  `qa/v229-routes.py`, then the seven stateful suites each on a **fresh staffed
  shim** (the new one is `t-v235-live`, 71), then `playstore/verify.mjs`.
  **26 checks, 0 red** at v235.
  (`qa/v231-gate.sh`, `qa/v230-gate.sh` and `qa/v229-gate.sh` are the previous
  gates, kept for the same reason the older suites are kept.)
- `node qa/browser/t-v232-idle.mjs` — the idle release (**87 assertions**, ~45 s,
  three boots: desktop home, desktop shop, phone shop). It counts
  `requestAnimationFrame` calls in a silent window and then proves the counter
  works by counting the ones a real `mousemove` wakes; it instruments
  `getBoundingClientRect` to prove one read per card visit and zero for twenty
  moves on a settled card; it hides the tab to prove the rates poll stops.
  **A frame-cost assertion needs a settle longer than the last late mount** — the
  first run tallied eight unrelated reads because the page was still mounting.
  Re-runnable: no login, no mutation.
- **`bash qa/v231-gate.sh`** — the v231 gate, kept as history (22 checks, 65/65).
- `node qa/browser/t-v231-ink.mjs` — the engraved layer (53 assertions): both WCAG
  ratios recomputed, the bare-selector ink reset proven to be in the shipped bundle
  **after** the foil rule it replaces, the microtext band checked for `aria-hidden`
  + empty text node + a long `data-microtext`, the guilloche counted and its height
  asserted (the paint claim is a number), and 20 proven to be a default by moving
  the setting to 21. Re-runnable: no OTP, no renewal consumed.
- **`bash qa/v230-gate.sh`** — the v230 gate in one command: bundle
  proof (64 layers / 64 blocks), `qa/phpbal.py cms/api.php`, `node --check` ×4, the
  sixteen historic suites on the plain fixture, `qa/v229-routes.py`, then the three
  stateful suites each on a **fresh staffed shim**, then `playstore/verify.mjs`.
  **21 checks, 0 red** at v230. (`qa/v229-gate.sh` is the previous release's gate
  and is kept for the same reason the older suites are kept.)
- `node qa/browser/t-v230-cert.mjs` — the legibility release (61 assertions):
  WCAG contrast computed for the failing foil and the fixed ink, the cascade order
  in the shipped bundle, the graphics, the smoothness subtractions, and a proof
  that 20 is a *default* rather than a new literal (it moves the setting to 22 and
  watches the certificate follow, then restores 20). Re-runnable: no OTP, no
  renewal consumed.
- **`bash qa/v229-gate.sh`** — the v229 gate in one command: bundle
  proof, `qa/phpbal.py cms/api.php`, `node --check` ×3, the sixteen historic
  suites on the plain fixture, `qa/v229-routes.py`, then the two v229 suites each
  on a **fresh staffed shim**. Builds its own fixtures and starts/stops its own
  shim on port 8090 — do not start another one while it runs. Exit 0 = green.
  `t8-v106` and `t10-v107` are deliberately excluded and the script says why
  (t8-v106 hangs at step 1 on the untouched HEAD tree too — proved by running
  HEAD's own extracted copy).
- `python3 qa/v229-routes.py` — the HTTP round trip jsdom cannot reach: a real
  multipart upload, a byte-identical stream, and the 401/403/409 boundaries
  between three people (61 checks). **Exits 3 with SKIP** when the shim already
  carries uploaded bills, because the dev layer keeps state in RAM and a second
  run would fail on fixture drift rather than on code.
- `node qa/browser/t-v229-black.mjs` — the certificate, the renewal and the ONE
  number (88 assertions). **Consumes the fixture member's renewable window**, so
  rebuild the staffed fixture and restart the shim to run it again; it restores
  `blackDiscountPct` to 25 before finishing.
- `node qa/browser/t-v229-bills.mjs` — the in-store bill contract, both halves
  and the negatives (102 assertions). Signs both customers in with the preview
  password, **not** OTP: the shim's OTP has a 30 s cooldown, and a suite that
  cannot be re-run inside a minute is a suite nobody re-runs. It deletes its own
  bill, so it passes back to back against one shim.
- **When you roll stamps for a release, grep for the REGEX spellings too.** A pin
  written `/__SHIVAA_REL\s*=\s*230/` survives a roll that replaces the literal
  `__SHIVAA_REL=230`, and the suite then demands a release that no longer exists.
  Same family: never end a source slice on `indexOf('/* comment */')` if the string
  has had its comments stripped — `-1` turns `slice(start, end)` into "everything
  but the last character", and the check silently reads the wrong section.
- `python3 qa/build-test-db.py [--with-staff]` — the fixture. **`--with-staff`**
  adds the owner (the plain fixture has ZERO users, so no admin token exists at
  all), one Shivaa Black member expiring in 18 days — inside the renewal window,
  free card `to-ship`, stored `discountPct` deliberately **20** so the suite
  proves the setting overrides a card created under the old number — and one
  unrelated customer who must get 403 on somebody else's bill. Dates are relative
  to today, and `blackDiscountPct` is deliberately **absent** from settings,
  because it is absent on the live site too and the code's own default is what has
  to be proven.
- `python3 qa/phpbal.py cms/api.php` — the cheapest honest check available with no
  `php` binary: strips comments and strings, then proves every brace, paren and
  bracket balances and the file ends at depth 0. Not a parser; run it after every
  api.php splice.
- `python3 qa/make-update-zip.py NNN` — builds `shivaa-update-vNNN.zip` as the
  previous zip's **exact** file list plus what this release added, refusing to
  build if a listed file is missing from the tree or a forbidden path (`data/`,
  `.htaccess`, `config.php`) appears in it.

## 5 · Owner bug-board → fix map (v208)

| Owner report | Root cause | Fix |
|---|---|---|
| Logo overlaps, desktop header messy (screenshot 1) | `.shv-offer-side` strip leaked into the desktop nav | v208.css §1 hides it ≥861px, one-line header |
| "3 cards" ugly strip, want 4 boxes + certificate | old `bannerOfferMini`×2 + premium mini in hero | `bannerOfferCard`×2 + `premiumCardHTML` + `certificateCardHTML` |
| 20% making = Black Card holders only, no code | copy + card styling | badge "Shivaa Black members", no code shown, `#/black-card` CTA (backend coupons unchanged: MAKING20 still exists; FREEDEL unchanged) |
| Text same colour as background (banner) | `.gold-txt` `background-clip:text` fails on mobile browsers | solid `#f0d28c` + shadow (v208.css §6) |
| Drawer/footer offer minis unreadable, 2 lines become 3 | cream text on light grounds + cramped note line | dark-context restyle + note moved to tooltip (§4) |
| Product names unreadable on cards | stale colours | fixed in v207 §2 (shipped inside v208 zip) |
| Rate strip ugly / numbers hard to read | no motion + thin colours | ticker ribbon + flash arrows + bigger `rs-val` (§7) |
| Mobile case not turning | `.sv-case-stage` ate touch gestures | `touch-action:pan-y` (§12; JS radius already adaptive) |
| Search slow | debounce + tiny box | 60ms + slide-open (§9) |
| Ads flicker, 5D wanted | unpromoted layers repaint | promote + inner-layer parallax (§2, reduced-motion aware) |
| Login/signup not advanced enough | plain panel | gradient brand panel + tighter controls (§10) |
| B2B text same-colour-as-background + unprofessional | old heading block | luxury ledger block, trust chips (§11 + app.js `bf-head`) |
| Desktop flip broken on live (v205) | v205 lacks v206 neutralizer; no `-webkit-` 3D | v208 carries v206 + adds webkit prefixes (§14) |

## 6 · Task list the owner has queued (not built yet)

Quote via WhatsApp from a catalogue page · Hire-a-jewellery-bachelor-friend ·
Thali-shringar invite links · GSTIN/UDYAM-enrolled small-jeweller resale
programme · Owner's own catalogue-page promotion control panel · College
festive campaigns (sona-mela etc.). **Ask the owner before inventing details
for any of these.**
