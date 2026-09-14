# SHIVAA FEATURE LINEAGE v94 → v107
Derived from the version tags embedded in the live codebase (cms/),
plus the v105/v106 prototypes preserved in qa/v106-src and the v107 layer.
v94→v104 ship in the baseline zip byte-for-byte (verified cumulative:
union of v94..v103 file sets ⊆ v104, zero reversions, 47/47 identical).

## v94
- v94 — PayU India hosted checkout (SHA-512 redirect) ═══════════
- v94 — PayU hosted checkout is the only live gateway in the UI. PhonePe
- v94 — PayU hosted checkout: build the SHA-512 signed form the browser
- v94 (provider no longer selectable in admin).
- v94 · PayU hosted-checkout return + client poll ════════
- v94 — PayU refund (admin-initiated). cancel_refund_transaction via
- v94 (provider
- v94 — only demo + PayU can be selected; PhonePe/Razorpay options were
- v94 — PayU hosted checkout
- v94 — show the exact surl/furl to paste into the PayU dashboard
- v94 — gateway refund (PayU; historical PhonePe orders too). Full or
- v94 — full-page navigation seam (tests capture instead of navigating).
- v94 — brief overlay while the browser leaves for the PayU payment page
- v94 — PayU hosted checkout: the server signs and returns the form fields;
- v94 — PayU: signed form POST redirect; PayU returns the browser to
- v94 — returning from the PayU hosted page (?pu=success|pending|fail)
- v94 — after a PayU redirect return, ask the server to run verify_payment

## v95
- v95 mobile experience layer (loaded last, wins ties)
- v95 phone rule existed but LOST (a later
- v95 phone rule targeted a class name that does
- v95 already sets
- v95's 601–900px tablet band (3 product
- v95's small-phone band
- v95 rules were written against class names the app does not use, so
- v95's `.page-hero{padding:38px 0 34px}` (order 4553)
- v95 added 40px+34px of section padding on top — ≈1.15 screens
- v95's admin inline-grid overrides were written WITH a space after the
- v95 shrank these with transform:scale(), which (a) takes the +/- buttons
- v95, and the other two sit in
- v95's 601–900px tablet band and silently rewrote it. A pointer query
- v95 sticky phone bar

## v96
- v96 — god-tier smoothness & mobile refinement layer
- v96 — premium motion engine for Shivaa

## v97
- v97 — THE UNICORN PASS
- v97 tried to stop that with one root-level `overflow-x: clip`.
- v97 used inset:-16px -13px (a 35px box) against a 9px gap =
- v97 rules above are last in source order, but four of them still lost
- v97's mistake was declaring phone rules at ≤900px, which sat on
- v97 "page will not scroll" failure.

## v98
- v98 — DESKTOP VERTICAL RHYTHM (owner report: "gaps in the home page")
- v98 keeps the goal and changes the
- v98 REVERTED — `html { overflow-x: clip }` was removed.
- v98 CHANGED APPROACH. v97 re-declared `grid-template-columns` with
- v98 widens the gap to 26px so pitch == hit box == 35px: the
- v98 narrowed: v97 also forced `display:block` on .cert-tbl / .q-tbl
- v98 REVERTED — `content-visibility:auto` was removed from `.rev-marquee`

## v99
- v99 · Saathi removed ahead of the Gemini chatbot.
- v99: bot.css/bot.js dropped from the shell (Saathi removed ahead of Gemini).
- v99 · will-change is now scoped to (hover:hover).
- v99: Saathi chat motion removed with the feature (Gemini will bring its own).
- v99 TOUCH & COMPOSITOR PASS
- v99 deliberately does
- v99 already gives sheets their dvh heights — not duplicated here)
- v99 perf block already frees both pseudo-elements on touch) ──
- v99 · STAFF-ONLY BUNDLE, LOADED ON DEMAND ───────────
- v99 · staff routes are lazy: fetch the bundle, then replay this route

## v101
- v101 — multipart submissions carry the optional business-card upload;
- v101 optional KYC document
- v101 command-palette search lives OUTSIDE the header (backdrop-filter containment) -->
- v101 — the house signature ══════════ -->
- v101">
- v101 — owner-supplied GSTIN. Format grammar only; this is NOT a government
- v101 — registered company name and public brand name. Rendered as text;
- v101 — the owner supplied the store's GSTIN; still a self-declared
- v101 · COMPONENT EDITION — watermark · quick view · search · footer
- v101 ────────────────────────────────────────────────────
- v101 {
- v101 — same row on light cards (contact page etc.): deep maroon glyphs
- v101 — next sign-in rebuilds the shell
- v101 — switching Bullion / Dashboard / Reports must NOT rebuild the
- v101 — reports view renders in-place into this host -->
- v101 view switching: bullion is the jeweller's home EVERY open;
- v101 — custom-order form stays collapsed to its title until requested
- v101 — jewellers land on live bullion rates EVERY time they sign in
- v101 re-collapse on success
- v101 — re-sync the INSTANT the jeweller comes back to the tab or the
- v101 · item 14 — the brand's three official channels, single source of
- v101 footer). cls 'fv-social--light'
- v101 · item 11 — jewellers land on the live Bullion Desk every fresh app
- v101: welcome-back bar when a saved cart is waiting — mobile-first
- v101 — press-and-hold continuous stepper.
- v101: Indian showroom-standard
- … +13 more tagged changes in code comments

## v102
- v102 — smarter refinements over the v101 surfaces (mobile-first)
- v102 — keep the last good board so the desk opens on flaky mobile
- v102 — offline fallback: paint the last saved board, clearly flagged
- v102 — same weighted ranking as the palette
- v102 — swipe the card right (or far left) to dismiss it
- v102 — preload the gallery so swiping never shows a blank frame
- v102 — preselect the size the customer saved from the ring sizer
- v102 — hardware keyboard arrows flip photos while the sheet is open
- v102 — double-click zoom for mouse users + drag to pan
- v102 — native share sheet on phones, copy-link fallback on desktop
- v102 — the calibration persists on this
- v102 — tap a row to set the circle)
- v102 — eager-load the second shot so the first swipe is instant
- v102 — newsletter signup used to reference an undefined inline handler;
- v102 — returning visitors who already joined see a confirmation, not a form
- v102 — debounced input so fast typing doesn't thrash the palette
- v102 — "/" opens search from anywhere (never while typing in a field)
- v102 — weighted multi-token search across name, SKU, category, tags

## v103
- v103 — owner-supplied GST registration certificate shown on the Trust
- v103 — the one document the Trust page can publish: the owner-uploaded GST
- v103 — at most one allowlisted certificate is ever published.
- v103 adds
- v103: media moved into its own quota-aware cache (the v102 single cache
- v103 — cache-first for product photos, background-refresh; cached photo
- v103 — confidence & speed: delivery, data-saver, personal memory, trust
- v103 skeleton shimmer behind catalogue photos while they load
- v103 smarter recently-viewed: live rate-trend hint ──
- v103 — GST certificate
- v103 — GST registration certificate for the public Trust page
- v103 — recent cards carry live rate-trend hints
- v103 — one-tap "rings in your saved size"
- v103 — one-tap "rings in your size" personal filter
- v103 — data-saver: films stay poster frames on cellular / save-data
- v103 — auto-runs when a pin is remembered
- v103 — snapshot price + rate for the home trend hint
- v103 — also remembers the price + rate at view time so the home strip
- v103 — build the recent strip's rate-trend hint for one remembered piece
- v103 — data-saver for the 65 product films (142 MB of media). Films
- v103 — honest delivery promise by pincode + COD eligibility.
- v103: one source of truth for PDP, cart and checkout; region label
- v103 — bind every [data-delivery] widget (PDP + cart share this).
- v103 — saved-for-later (private, local like the cart)
- v103 — remembered pincode answers immediately
- v103 — pincode autofills the state and answers delivery/COD before submit
- … +4 more tagged changes in code comments

## v104
- v104: shell/media bumped; a SKIP_WAITING message lets the in-app banner
- v104 · COUTURE TOUCH — flagship phone layout
- v104 chrome rides above the sticky buy/bottom bars cleanly
- v104 — sticky refine bar on the shop grid: filters/sort stay under the
- v104 · COUTURE TOUCH — flagship mobile motion & platform chrome
- v104 loop/entrance stands down ──
- v104 restores the life with pure translate3d on already-promoted layers
- v104 selector
- v104 again.
- v104 — honest, app-style connectivity chrome) ──
- v104 — when a freshly downloaded service worker is installed while this
- v104 — phone photo counter pill
- v104 · COUTURE TOUCH — flagship mobile interaction layer
- v104's Quick View pre-selects)
- v104 selector in CSS (see css/v107.css), never store secrets
- v104 paints it.
- v104 per-piece panel; we append the honesty FAQ

## v105
- v105/v106 prototyped that the live v104 line did not already

## v106
- v106 lesson, live markup) ───────

## v107
- v107 — checkout reads the rate-lock window from here (was hardcoded)
- v107 · honest delivery channel for the Passport sheet (public, tiny) ──
- v107 · SMS gateway wizard: read (masked) / write data/sms-config.json ──
- v107.css?v=107">
- v107.js?v=107" defer></script>
- v107';
- v107 — the list now matches index.html exactly (it drifted in v99–v104
- v107.css?v=107'
- v107.js?v=107'
- v107 — accept both the legacy string and the {type} object form
- v107 — per-file precache. addAll() is all-or-nothing: one 404 in the list
- v107
- v107 · offline fallback served by sw.js when the network is gone and the
- v107: comment realigned with the live config (it still described the
- v107 · enhancement layer
- v107-, #v107)
- v107-tick {
- v107-tick::-webkit-scrollbar { display: none; }
- v107-tick .v107-cell {
- v107-tick .v107-cell small { font-size: 10px; letter-spacing: .14em; text-transform: uppercase; color: var(--i
- v107-tick .v107-cell b { font-size: 14px; color: var(--gold-hi, #f0d9a6); font-weight: 600; }
- v107-tick .v107-cell i { font-style: normal; font-size: 10.5px; }
- v107-tick .up i   { color: #4ea06b; }
- v107-tick .down i { color: #c4685f; }
- v107-tick .flat i { color: var(--ink-3, #9b8672); }
- v107-basis .live-dot::before, .v107-tick .v107-cell.live-dot::before {
- … +138 more tagged changes in code comments

## v105 / v106 (prototypes on a stale base — NOT deployable, mined for v107)
- footer live-rate ticker + honest basis line            → ported (v107 layer)
- tap-reactive glow / press feedback / hidden-tab pause → ported (v107 layer)
- Quick View scroll reset + focus management            → ported (v107 layer)
- design full-detail sheet (gross/less/net, fine metal) → ported (v107 layer)
- route-scoped unknown-route redirect                   → ported (app.js edit)
- true-scale ring size guide page                       → ported (#/size-guide)
- OTP box enhance() paste/split/auto-advance            → already native in live auth.js
- trust page GSTIN hero / footer chip                   → already native in live trust.js
- hallmark honesty FAQ accordion + privacy notes        → ported (v107 layer append)
- 1,062 lines of styles.css + v105.css for stale markup → dropped (would fight mobile.css)

## v107 (this update)
- payments/checkout bundle: auto-arm + persisted rate lock (server lockMinutes),
  UPI tr= order stamping, order timeline, GST invoice block, fee lines
- OTP delivery honesty: admin gateway wizard (writes data/sms-config.json 0600),
  raw provider reply on test sends, retryAfter on throttles, shopper channel line
- PWA: per-file precache (addAll all-or-nothing defect), real icons 32/180/192/
  512/maskable, offline.html, update-ready banner
- sitemap.xml generated from db.json (robots.txt 404 fixed)
- finale: IST-absolute draw/end instants; stale finale.css comment realigned
- canvas getContext guards (privacy-mode browsers); removable UX layer
