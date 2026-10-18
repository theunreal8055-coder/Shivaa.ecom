# HANDOFF-unreal8055.md — Shivaa Ecom · agent-to-agent handoff

---
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
   `settings.blackDiscountPct` (**default 25**, clamped 0-40, 0 = benefit off
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

**COUNTDOWN: release 230 pending owner review — nothing deployed without the
owner's explicit yes.** Live today: **v228** (the owner uploaded it on 17 Oct
2026 and reported it "working fine and good"; v206–v227 went live with it).
Built and shipped to this repository, **not live**: **v229, v230**. Deploy v230
— it contains v229, and v229 on its own quotes 25% to members, which the owner
has called a false claim.

Last updated: 2026-10-18 (v230 "The Legibility Release" — the certificate's member name
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

1. **Forward-only.** Never reuse or renumber a shipped release. Live is **v228**;
   **v229 and v230 are built and pending the owner's yes** (deploy **v230** — it
   contains v229 and corrects its 25% claim); **the next release is v231**.
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
- **`bash qa/v230-gate.sh`** — the current release gate in one command: bundle
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
