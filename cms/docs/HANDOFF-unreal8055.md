# HANDOFF-unreal8055.md — Shivaa Ecom · agent-to-agent handoff

**COUNTDOWN: release 223 pending owner review — nothing deployed without the
owner's explicit yes.** Live today on WWW + Netlify: **v205**. Built and
shipped to this repository, **not live**: v206, v207, v208, v209, v210, v211,
v212, v213, v214, v215, v216, v217, v218, v219, v220, v221, v222, v223.

Last updated: 2026-10-15 (v223 "The Smooth Release" — the owner asked for the
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

Build branch note: this repository's v221, v222 and v223 builds ran on the
session branch `arena/e8a470c6-shivaa-ecom`, which is branched from
`arena/09f3c79f-shivaa-ecom` at its v220 tip (`4a9e239`) — the two trees were
byte-identical when v221 started. `arena/09f3c79f-shivaa-ecom` itself was not
modified.

---

## 1 · The absolute rules (owner's — never break)

1. **Forward-only.** Never reuse or renumber a shipped release. Live is v205;
   v206–v223 are built; **next release is v224**. Never deploy an older tree
   over a newer live one. No reverts, no force-pushes, no resurrecting old
   zips.
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
