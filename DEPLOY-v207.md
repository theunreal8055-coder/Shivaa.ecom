# DEPLOY-v207.md — release 207 · READABILITY PASS · "every word legible on every page"

Status: **READY — owner approval required before anything is taken live.**
A push, a green test run, or a finished zip is **not** approval. Live today is
**v205** (WWW + Netlify). If anything higher than 207 is live, stop.

**Read `DEPLOY-v205.md` first — owner gotchas, bind-shell ladder, zero-config
deploy. Drop-in replace root with `cms/` (same `index.html` / `.htaccess` /
`sw.js` shape). Then `purge` before `activate`.**

---

## 1 · What this release is

A site-wide contrast/readability audit and repair — every page rendered and
measured text-node by text-node (desktop 1280px + phone 390px, all 45 routes),
every failure traced to its source rule and fixed forward. No layout redesign:
this touches **colour only** (plus one card fine-print rule that also raises
opacity). The v206 Black Card flip layer is untouched.

Fixed in `cms/css/v207.css` (loaded **after** every other stylesheet):

1. **Page-hero headings** — motion.css's gold cast ended with `#3d0e15`, the
   hero's own background colour: the first/last letters of every page-hero h1
   dissolved into the ground (measured **1.11:1**). Light cream→gold cast now
   (5.7–16:1), same foil mood.
2. **`.ink-reveal` on dark heroes** — the maroon ink sweep (and the
   reduced-motion "calm" force to solid `--maroon-deep`) is invisible on dark
   maroon heroes (1.11:1). Dark heroes get the cream sweep; light surfaces keep
   the maroon ink.
3. **Footer fine print + links** — gold at 50–62% alpha over maroon measured
   3.1–3.8:1 (`.foot-legal`, `.foot-hrs`, `.fv-copy`, `.fv-legalname`,
   `.fv-news-note`, `.fv-hours`, footer link columns, footer rates basis).
   Raised to .84–.93 alpha.
4. **App-band dismiss ×** — v200 measured `#5e1520` against a phantom white
   band; the real band is a gold tint over the maroon footer (**1.23:1**).
   Light gold again with a real hover/focus state (forward correction).
5. **Breadcrumbs on heroes** — white @46% (2.7:1 over the gold light shafts) →
   cream @88%.
6. **Black Card fine print** — the card's legalese was rgba white .27 /
   grey #918363-level (2–3.8:1): `.bc-not-pay`, `.bc-code-label`,
   `.bc-security`, `.bc-dates small`, `.bc-bottom small`, back-face copy,
   hero fine print, OTP note.
7. **Glass panels make their own dark ground** — `.svc-result` /
   `.shv-val-banner` / `.shv-hud-chip` were written for dark posters (cream
   text on translucent glass). On light sections the glass fell through to the
   cream page — white ₹ amounts and names measured **1.03–1.9:1**. The panels
   now carry a solid dark-glass ground so their light text always has its dark
   stage (same look everywhere they appear).
8. **Gold on light** — category chips (`pc-cat`), making-charge numbers
   (`mc-n`), ratings, `.label` eyebrows, gold tags (`tagx.gold`), reviewer
   avatars (`rev-av`) measured 1.4–2.9:1 on cream/white. Dark gold text on
   light grounds; existing dark-section overrides keep the light gold.
9. **Gold-on-gold display words** — `.disp-italic` gold over the heroes' gold
   light shafts (1.22:1 worst case at 52px) → light cream-gold + soft shadow
   on dark grounds; dark gold on light.
10. **Gold-foil engraving bar** (`.fin-eng`) + misc: `v107-chan.warn` amber,
    bbr fine print, team role lines, card benefit chips, scheme CTA text on
    the gold's light stop.
11. **Phone nav drawer** (mobile audit addendum) — the drawer panel is dark
    maroon but several labels compute dark (1.0–1.8:1): the category pill
    labels (`dw-more-lbl`/`dt-more-lbl`), the call link (`dw-call`), the
    drawer link rows (mobile.css wins the cascade), and the "For Jewellers"
    tile sat on an emerald tint with maroon text. Light drawer palette forced
   ; the tile gets an opaque gold ground.

Audit tool (committed): `qa/browser/audit-contrast.mjs` — boots every route in
jsdom, resolves the full CSS cascade (custom properties, inheritance, alpha
compositing, gradient worst-case stops), and reports every text node below
WCAG AA (4.5:1 body / 3:1 large). `node qa/browser/audit-contrast.mjs [mobile]`.

## 2 · Stamps (all done)

- `cms/index.html` — `?v=207` on every asset (79 stamps) + `window.__SHIVAA_REL=207` + `v207.css` linked **last**
- `cms/js/app.js` — `const APP_REL = 207;`
- `cms/sw.js` — `SHELL 'shivaa-shell-v207'`, `REL = 207`, SHELL_FILES re-stamped and `'/css/v207.css?v=207'` appended (v204–v206 css kept — still linked)
- `cms/api.php` — `'rel' => 207,`

## 3 · QA run here (2026-10-11)

- **Contrast audit (desktop + phone, 45 routes each)** — before: 45/45 pages
  had findings (site-wide 1.03–3.8:1 hotspots as listed above). After the fix
  layer, the only remaining flags are known audited-boundary items: text over
  photographic scrims (mega-feature cards, UGC photo captions — readable in
  the real render over their `::after` scrims) and the footer app-band copy
  which the auditor measures against a translucent-tint chain (real ground is
  the dark maroon footer, ~7:1). Both classes are documented in the audit
  output (`imageBacked` skip) and were hand-verified against the real paints.
  The phone pass additionally surfaced the drawer dark-on-dark items (fix 11),
  now fixed; its remaining flags are the same phantom classes.
- **Black Card flip**: `qa/browser/t-v206-flip.mjs` — **ALL PASS** (21 checks ×
  2 surfaces) — v207 CSS did not touch the flip.
- **Asset integrity (inline)**: all 83 index.html asset refs exist; all 78
  sw.js SHELL_FILES exist; every `?v=` stamp is 207 (media keeps its own
  generation number, per v166 convention); `node --check` on app.js + sw.js OK.
- `qa/browser/t7-audit.mjs` product-walk failures are the synthetic dev
  fixture (gitignored `db.json` has 6 demo products, not the `p_*` catalogue
  IDs) — pre-existing, unrelated to this release.

## 4 · The zip — `shivaa-update-v207.zip`

- Built with `python3 tools/mega/make-v207-zip.py`
- **136 files, 3,710,385 bytes**
- sha256: `af75aa854e25e6ceeb06334b880d5700016a17e88984c280263353cfe0ed9b84`
- `cms/` tree at release 207 + `docs/` + changed `media/**` + provenance; state
  exported canonically (1,080 entries, 30,474 leds).

## 5 · Ladder (same as v205 — do it in this order)

`remote >113.zip` → `bak` → upload zip → `replace root with cms/` → open
`/?rel=207` → `?rel=207&purge` **(watch SHV_PURGED)** → `?rel=207&activate`
→ close tabs. Preview `https://v207.shivaa.in/` first.

Smoke (60 seconds): hero heading legible at both gradient ends on every page →
Black Card flip still works → footer fine print readable → shop/category
eyebrows readable on white cards → scheme/buyback result panels readable →
mega menu headings readable.

Rollback: deploy **v207.zip or a NEWER zip only** (the forward-only ladder in
`tools/mega/README.md` — v207's live `sw.js` purges every older cached shell
on activate, so an old zip can pair stale scripts with fresh markup).

## 6 · What was NOT touched

v206 flip layer · v200 gold button gradient · v186 position seals · upload
locking (`v21+`) · restricted pages (Certificate/Invoice/Order) · media
generation numbers · `cms/data/db.json` (never commit) · no copy claims.
