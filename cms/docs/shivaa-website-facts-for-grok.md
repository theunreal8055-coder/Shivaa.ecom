# shivaa-website-facts-for-grok.md — Shivaa Ecom · product & tech facts

**COUNTDOWN: release 214 pending owner review.** Live: **v205** (WWW +
Netlify). Forward-only rule in force — next release number is **v216**.
Updated 2026-10-12 from `arena/09f3c79f-shivaa-ecom`.

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

- **Shivaa Black Card** (v184+) — retail-only, six-month, OTP-verified
  personal membership: **20% off making charges** + lifetime keepsake
  **Prestigious Member Certificate** (name + member id, flip card in account,
  zero invented award copy). Partner-tier pricing is separate.
- **Premium card** (v191) — free home delivery for life, free claim.
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
