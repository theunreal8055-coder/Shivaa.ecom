# shivaa-website-facts-for-grok.md — Shivaa Ecom · product & tech facts

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

**COUNTDOWN: release 228 pending owner review.** Live: **v205** (WWW +
Netlify). Forward-only rule in force — next release number is **v229**.
Updated 2026-10-17 (v228) from `arena/e8a470c6-shivaa-ecom` (branched from
`arena/09f3c79f-shivaa-ecom` at its v220 tip `4a9e239`).

**Loading (v222):** the shop serves **one** stylesheet, `/css/shivaa.css`
(stamped `?v=228`), built from the 61 historical layers (62 cascade
positions — `v186.css` deliberately sits at two of them) by
`tools/build-css-bundle.py` using the cascade order in
`tools/css-bundle-order.txt`. It is **58 render-blocking requests → 1**, and
**268 KB → 168 KB gzipped** (v227 bundle: 885,408 B raw / 175,338 B gzipped). The individual layer files still exist under
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
