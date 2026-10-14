# DEPLOY-v217.md — release 217 · "THE STEADY RELEASE" · the page stops jumping, the case is reinstalled

Status: **READY — owner approval required before anything is taken live.**
A push, a green test run, or a finished zip is **not** approval. Live today is
**v205** (WWW + Netlify). If anything higher than 217 is live, stop.

**Read `DEPLOY-v205.md` first — owner gotchas, bind-shell ladder, zero-config
deploy. Drop-in replace root with `cms/` (same shape). Then `purge` before
`activate`.** This package carries v206 → v217 and includes the **film files**
(`images/films/` — 18 media files) and the offer artwork (`images/offers/`).

---

## 1 · The owner's orders → what was wrong → the fix

### ① "The page keeps refreshing, and when I scroll it goes to the top"

**Root cause (found in the home-page code):** releases v117, v121, v122 and
v214 told the browser to *skip drawing* sections, product cards and the
footer until they came near the screen (`content-visibility: auto`), using a
fixed height guess for each. On a phone each section's real height differed
from its guess, so as you scrolled the page height kept changing under your
finger and the browser lost its place — the page jumped toward the top, which
looks exactly like a refresh.

**Fix:** every home section, product card and the footer now lays out at its
real size. Off-screen skipping is gone for the home page. Sideways overflow
(the case cards) is clipped so it can never move the page.

### ② "Reinstall the turn-the-case feature completely — it still does not work"

The case was rebuilt from scratch in `cms/js/v217-case.js`:

- **one touch/mouse path** (pointer events) — vertical scrolling always belongs
  to the page, sideways drag always belongs to the case;
- **no scroll listeners, no resize observers, no focus or page-scroll calls** —
  nothing the case does can move the page;
- **one play-state function** — each film's play/pause is changed only when it
  has to be;
- **phones play the front film only** (the others show their poster and play
  the moment they come round — by drag, arrows, the thumb rail or a tap);
  **laptops play all four**, as approved in v210.

Verified in the test browser: four cards, four thumbnails; on a phone only
the front film is asked to play; on a laptop all four are.

### ③ "Fix the sidebar on mobile — opening, usability and smoothness"

- The menu now slides in from the left in one smooth 0.36 s motion (transform,
  not layout), with a dimmed scrim that fades in behind it.
- Every menu link and button is at least 48 px tall.
- The page underneath is locked while the menu is open.
- The close button, the scrim and swiping left all close it.

### ④ "Fix the search option"

- On a phone the header no longer carries a second, cramped search box beside
  the logo. The search button opens **one full-screen search panel**.
- The search field is 16 px (no zoom-on-focus on iPhone) and 50 px tall.

### ⑤ "Win a 10g 24K Gold Biscuit — the two buttons are unreadable and not mobile-friendly"

- The outline button **"Explore 6 Exclusive Studs (Men / Women)"** was cream
  text on a cream-ish background. It is now **cream text on dark glass with a
  gold edge**; on hover/focus it turns gold with dark text.
- On a phone the campaign card stacks: the picture is a clean 16:10 frame, the
  title scales down to fit, and both buttons are full-width 52 px targets.

### ⑥ "More variations and animations for the four offer banners"

Each of the four home offer panels now has its own motif, on top of the
artwork and the light sweep from v216:

1. **Black Card (20% off making charges)** — a slowly turning gold rim.
2. **Free delivery** — a gift-ribbon glint that travels across the band.
3. **Premium card** — a field of twinkling diamond points.
4. **Keepsake certificate** — a wax-seal ring that breathes.

Panels also get a slightly deeper hover shadow. Reduced-motion visitors see
them still.

## 2 · Files

- `cms/js/v217-case.js` — **new**: the case, reinstalled.
- `cms/js/v125.js` — the page now mounts the case through v217 (the reel is still v125's).
- `cms/css/v217.css` — **new**: scroll stability, case transforms, drawer,
  search, campaign card, offer motifs.
- `cms/index.html` — links `v217.css` and loads `v217-case.js`; stamps 217.
- `cms/sw.js`, `cms/js/app.js` (`APP_REL = 217`), `cms/api.php` (`'rel' => 217`).

## 3 · QA — on this tree

| Suite | Result |
|---|---|
| `qa/browser/t-v209-alive.mjs` | **PASS 115 / FAIL 0** — incl. S3i v217 (case has no scroll/resize/focus calls, flat transforms, DOM hooks kept, scroll fix, drawer, search, campaign, four motifs) |
| `qa/browser/t-v206-flip.mjs` (no-flip guard) | ALL PASS |
| `qa/browser/t7-audit.mjs` | **PASS 4 / FAIL 0** — 50 routes · 152 buttons · 0 errors |
| Scroll/refresh probe (home, desktop + phone) | 0 hash changes · 0 scroll-to-top calls · 0 page reloads |
| Film playback probe (home) | laptop: 4 films play · phone: 1 film (the front one) plays |

Note: the QA run uses a synthetic 14-product fixture (the real catalogue is not
in the repository), so product counts differ from the live site.

**Please check on a real phone before approving:** the sidebar slide, the search
panel, the campaign card's buttons, the offer motifs, and that scrolling stays
where you left it. The sandbox has no real phone browser, so those were checked
by code and in the test browser only.

## 4 · The package

- `shivaa-update-v217.zip` — **347 files · 37,063,666 bytes · sha256
  `cd38679f7d80f34abec4f4cb2fc0f96379a3a88010b6ad96f699ab6be5c64060`**
- Download: `https://github.com/theunreal8055-coder/Shivaa.ecom/raw/arena/09f3c79f-shivaa-ecom/shivaa-update-v217.zip`
- Rollback rung: `shivaa-update-v216.zip` (sha256 `f2b17014…0954`), then v215 (`22307874…dd92`).
  Never roll live back past what was deployed; never deploy an older tree over a newer one.

## 5 · Deploy (owner only — same recipe as v205)

1. Download the v217 zip above.
2. Extract — the folder contents are the site root.
3. Drop them in at the domain root (replace existing, same shape as v205).
4. Then `purge`, **then** `activate`.
5. On the phone: scroll the home page up and down — it should stay where you
   are; open the menu and search; turn the case by drag and see the front film play.

Nothing goes live without the owner's explicit yes.
