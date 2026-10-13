# HANDOFF-unreal8055.md — Shivaa Ecom · agent-to-agent handoff

**COUNTDOWN: release 211 pending owner review — nothing deployed without the
owner's explicit yes.** Live today on WWW + Netlify: **v205**. Built and
shipped to this repository, **not live**: v206, v207, v208, v209, v210, v211.

Last updated: 2026-10-12 (session branch `arena/09f3c79f-shivaa-ecom`, v208
megabrief delivered; v209 "Alive Release" — flip 5D, film case, food banners,
flicker kill, Passport auth — packaged).

---

## 1 · The absolute rules (owner's — never break)

1. **Forward-only.** Never reuse or renumber a shipped release. Live is v205;
   v206–v208 are built; **next release is v209**. Never deploy an older tree
   over a newer live one. No reverts, no force-pushes, no resurrecting old
   zips.
2. **Nothing goes live without the owner's explicit yes.** A push, a merge, a
   green test run, or a finished zip is NOT approval. If the owner only
   reviews, review only.
3. **Every release** gets: version stamps in `index.html` (`?v=NNN` +
   `window.__SHIVAA_REL`), `sw.js` (SHELL name, REL, SHELL_FILES), `app.js`
   (`APP_REL`), `api.php` (`'rel' => NNN`), a root `DEPLOY-vNNN.md`, a
   `shivaa-update-vNNN.zip` of the whole `cms/` tree (minus `data/`), both
   docs updated, then commit + push to `arena/09f3c79f-shivaa-ecom`.
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
| v211 | The Stillness Release: Shivaa Black hero flicker/flash killed at the root (noise blends, blur filters, drop-shadow on the flip card, pointer-churn, infinite loops, twinkle canvas), food offer banners = painted charger-plate art panels, case degrades to still frames instead of dying | built, owner review pending |

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
