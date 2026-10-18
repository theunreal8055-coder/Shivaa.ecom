# DEPLOY-v230.md — Shivaa Ecom · v230 "The Legibility Release"

**The owner reported two things** (18 Oct 2026):

> *"The name of the prestigious customer in the membership certificate is of same
> colour as of background but it should be of a different colour. Secondly on the
> card you have mention the 25% of on making charges so this is a false claim —
> everywhere there is mention of any kind of offer that should be only at 20% off
> making charges for the customers of prestigious members. Update the changes and
> graphics even more and make the app smooth."*

Both were real. Both are fixed. **Status: built, gate green (21 checks, 0 red),
pushed — NOT LIVE.** Live is still **v228**. **Deploy v230, not v229**: v230
contains all of v229 and corrects the 25% claim v229 shipped with.

---

## 1 · Bug 1 — the name was the same colour as the paper

**He was right, and the cause is older than the certificate he was looking at.**

`v201`/`v205` gave the member's name a **gold-foil treatment**:

```css
background: linear-gradient(100deg, #fff4d2, #e8c877 35%, #fff8e6 50%, #c9a050 72%);
-webkit-background-clip: text; background-clip: text; color: transparent;
filter: drop-shadow(0 1px 0 rgba(0,0,0,.6)) drop-shadow(0 0 22px rgba(232,200,119,.22));
```

That was correct on the **dark** certificate stage those releases shipped
(`.bc-commerce` was `#0a0806`). The paper certificate that `v184`/`v229` render is
**cream** (`#f4e2a6 → #fffdf1 → #ead18a`), so foil-clipped glyphs on cream paper
measure about **1.4:1** — WCAG 2.2 asks **4.5:1** for text and **3:1** for large
text. The dark `drop-shadow` behind it turned what was left into a smear.

**v229 set `color:#3d2405`, which won the colour cascade but left the treatment in
place** — the clipped background, `background-clip:text` and the dark-stage filter
all still applied. *Setting a colour is not the same as removing a treatment.*

`cms/css/v230.css` §1 removes all four mechanisms and puts ink on paper:

| | before | after |
|---|---|---|
| name ink | foil `#e8c877`, clipped to glyphs, `color:transparent` | **`#2b1a05`**, solid |
| contrast on lightest paper `#fffdf1` | ~1.5:1 | **15.4:1** (AAA) |
| contrast on darkest paper `#ead18a` | ~1.4:1 | **9.6:1** (AAA) |
| filter | two `drop-shadow`s, per glyph, re-rasterised on every paint | **none** + one cheap letterpress `text-shadow` |
| copy line | `rgba(255,240,205,.72)` — cream on cream | `#4b3410` (12.9:1) |
| A4 download | `#4d2e04` | **`#2b1a05`** — the same ink as the screen |
| print | foil | **pure black**, shadow off |

`!important` is used here and **only** here, on purpose: `styles.css` has foil
utilities that use `-webkit-text-fill-color:transparent !important`, and a
legibility fix that a utility class can beat is not a fix. The suite asserts that
every `!important` in the new layer is ink, a foil reset or a print declaration —
**never a layout property**.

**How to check it after deploying:** open `#/black-card` as a member → the name
should be dark brown-black on the cream sheet, readable at arm's length; then
**Save / share certificate** and open the PNG — same ink, sharp at 100%.

---

## 2 · Bug 2 — 25% was a claim the site never made

Because v229 turned the member rate into ONE setting, this is a **default** change
in the four places that carry it, and nothing else moves:

| place | was | now |
|---|---|---|
| `api.php` `black_pct_setting()` | 25 | **20** |
| `app.js` `blackPct()` fallback | 25 | **20** |
| Admin → Settings field + its save | 25 | **20** |
| `qa/preview_shim.py` dev mirror | 25 | **20** |

- The clamp stays **0-40** and the setting is still yours: **Admin → Settings →
  "✦ Shivaa Black member discount"**. Only what *ships* changed.
- **No card is reissued and no number changes.** The server overrides whatever a
  card carries with the setting, so members keep their card number, member ID and
  certificate number.
- Every surface already read the setting, so all of these now say **20%**: card
  face, card reverse, invite strip, certificate promise line and fine print, claim
  copy, member page headline and scope note, "Shop with my 20%", hero, PDP strip,
  bag strip, checkout line, coupon label, and the downloaded artwork.
- **Historical receipts are the exception and stay the exception**: an old order
  derives its own rate from its own two numbers, so an order that really paid a
  different percentage never reprints itself.
- **Premium's lifetime 20%, Amrita ji's personal ticket and the public `MAKING20`
  offer are untouched** — separate programmes that were already 20%.

**One consequence to know:** a Shivaa Black member and a guest using the public
`MAKING20` coupon now get the same 20% off making charges. The membership's
difference is the six-month card, the certificate, the free physical card and the
account — not a bigger percentage. That is your call and it is what you asked for;
if you ever want the gap back, change the one setting (21, 22, 25…) and every
surface follows in the same second.

---

## 3 · Graphics taken further

| what | how |
|---|---|
| **Seal** | 96 px, a `conic-gradient` tick band, two rings, a foil sheen and an inset highlight; 78 px on a phone |
| **Border** | engraved double rule — five inset shadows (7 px cream, 8 px gold hairline, 12 px cream, 13 px gold) instead of two |
| **Guilloche** | finer (4 px period, was 5) and a fifth vertical band; still four gradients + one, no image request |
| **Record boxes** | accent top edge (2 px gold), inset highlight, deeper label tracking — they read as records, not chips |
| **Promise line** | now a **cartouche**: hairline above and below, cream fill. It is the legal line, so it looks like one |
| **Signature** | a rule to sign on, with the title letterspaced under it |
| **Verify line** | a strip with hairlines either side (`::before`/`::after`), so it reads as a footer, not a footnote |
| **Name flourish** | a double rule with a centre diamond under the name — the eye lands on the member, not the logo |
| **Corners** | crisper: solid `#9b6e1b`, opacity .8, 54 px (still exactly four — v229 removed the duplicate `c4`) |
| **Small screens** | every one of the above kept, scaled — nothing is dropped on a phone |

---

## 4 · "Make the app smooth" — this release does it by subtraction

The certificate is the most painted element on the member page (a ~900 px sheet of
layered gradients). Two things made it expensive and both are gone:

1. **the per-glyph `filter: drop-shadow()`** — a filter re-rasterises its subtree
   on every paint, and this one ran twice per glyph row;
2. **the gradient clipped to glyph outlines** (`background-clip:text`) — the
   browser has to clip a full-sheet gradient to text instead of painting it once.

Then `contain: paint` on the sheet keeps whatever is left inside it, so scrolling
the member page does not repaint the page *through* the certificate. The sheet
already had `overflow:hidden` and `position:relative`, so this changes no layout.

And what was **not** added: no `@keyframes`, no `transition`, no `will-change`, no
filter loop. A certificate is a document, and a document that moves is a document
nobody trusts. The decorative layers stay `pointer-events:none` and out of the
compositor's way. The v224/v225/v226 rules all still hold and their suites are
green.

---

## 5 · Stamps and the bundle (this exact tree)

| place | value |
|---|---|
| `cms/index.html` | **32** × `?v=230`, `window.__SHIVAA_REL = 230` |
| `cms/sw.js` | **31** × `?v=230`, `shivaa-shell-v230`, `const REL = 230` |
| `cms/js/app.js` | `const APP_REL = 230` |
| `cms/api.php` | `'rel' => 230` (592 KB, braces balanced) |
| `cms/css/shivaa.css` | **902,920 B raw / 178,362 B gzip** · **64 layers / 64 blocks** · `VERIFY OK` ×2 · **54** provenance markers · still **one** `<link>` |
| `cms/css/v230.css` | new, appended **last** in `tools/css-bundle-order.txt` |

`playstore/verify-live.sh` was **not** touched: its `rel >= 228` floor describes
the live site, and an equality there would fail for a package you have not
uploaded yet.

---

## 6 · QA — the whole gate, serially, on this exact tree

One command: **`bash qa/v230-gate.sh`** → **21 checks run, 0 red**.

| phase | suite | result |
|---|---|---|
| 0 | bundle proof (64 layers / 64 blocks / one `<link>`) | VERIFY OK ×2 |
| 0 | `qa/phpbal.py cms/api.php` (no php binary exists here) | BALANCED |
| 0 | `node --check` app.js · admin.js · sw.js · t-v230-cert | OK ×4 |
| 1 | t7-audit 4/0 · t-v206-flip ALL PASS · t-v209-alive 96/0 · t-v218-sidebar 13/0 · t-v219-depth 22/0 · t-v220-billing-gone 13/0 · t-v221-cleanup 34/0 · t-v222-bundle 36/0 · t-v223-smooth 39/0 · t-v224-corners 64/0 · t-v225-appfeel 80/0 · t-v226-butter 61/0 · t-v227-blackcard 28/28 · t-v227-design 41/41 · t-v227-reset 31/31 · t-v228-play 52/0 | **all green** |
| 1b | `qa/v229-routes.py` (real HTTP round trip) | **61 / 0** |
| 2 | `t-v229-bills` | **102 / 0** |
| 2 | **`t-v230-cert` (new)** | **61 / 0** |
| 2 | `t-v229-black` | **88 / 0** |
| 3 | `playstore/verify.mjs` | exit 2 **by design** (fingerprints still placeholders), no FAIL lines |

`t-v230-cert` is the interesting one: it **computes WCAG contrast** for both the
failing foil and the fixed ink, so the bug is proved rather than described; it
checks the cascade order in the *shipped bundle* (the v230 rule must come after
the foil rule it replaces); it asserts no shipped surface still says 25% to a
member; and it proves 20 is a **default and not a new literal** by moving the
setting to 22 and watching the certificate follow, then restoring 20. It is
re-runnable — no OTP (the shim's has a 30 s cooldown) and no renewal consumed.

**Not run, and why:** `t8-v106.mjs` and `t10-v107.mjs` — `t8-v106` hangs at step 1
waiting for `.pc-qv` on `#/shop`, and it does so on the **untouched HEAD tree**
too (proved at v229 by running HEAD's own extracted copy). The gate script says
this in its header so nobody re-adds it.

### 6.1 What this sandbox could NOT test — check these after deploying

| cannot test here | what to do on the live site |
|---|---|
| **Real PHP** (no `php` binary at all — `api.php` was brace/string-balance checked and grepped, never executed) | `curl -s https://shivaa.in/api/version` → `"rel":230`, `"stamp":{"matched":true}` |
| **Real rendering / your phone's browser** | Open `#/black-card`: the name must be dark ink on cream, not gold-on-cream |
| **The A4 download artwork** (jsdom has no canvas, so the suite tests the guard, not the pixels) | **Save / share certificate** on a phone → the PNG must be 3508×2480 landscape, sharp at 100%, name in dark ink |
| **Printing** | **Print / save PDF** on the member page → name prints black, guilloche light, nothing cut |
| **The private bills folder on your host** (unchanged from v229) | Admin → In-store Bills: either the upload form or an amber warning with both fixes (`DEPLOY-v229.md` §2) |
| **Live network / SMS / Cashfree** | unchanged by this release |

---

## 7 · How to deploy

1. Download **`shivaa-update-v230.zip`** (repo root, or
   `https://github.com/theunreal8055-coder/Shivaa.ecom/raw/arena/e8a470c6-shivaa-ecom/shivaa-update-v230.zip`).
   **359 files · 37,326,620 B · sha256
   `371084903c4359ce069e08dfee63149f44475786c36a76b1fb7ba743342a4dfe`**
2. Unzip **into `public_html`**, overwriting. Paths are relative to `cms/`. The zip
   contains **no** `data/db.json`, **no** `.htaccess`, **no** `config.php`, **no**
   `uploads/` content (except the `kyc` deny rule), **no** old zips and **no** `qa/`.
3. Verify: `curl -s https://shivaa.in/api/version` → `"rel":230`.
4. Look at the certificate on your phone (§6.1) and at **Admin → Settings** — the
   Shivaa Black field should read **20**.
5. If you have not deployed v229 yet, also do `DEPLOY-v229.md` §2 once (the private
   bills folder beside `public_html`) — that is the only hosting step in either
   release.

**Rollback:** re-upload **`shivaa-update-v228.zip`** (that is what is live today).
Do **not** "roll back" to v229 — it quotes 25% to members, which is the claim you
rejected. Forward-only from there: never renumber, never deploy an older tree over
a newer one.

---

## 8 · Still waiting on you (unchanged)

1. **Play account type** — personal accounts created after 13 Nov 2023 need **12
   testers for 14 continuous days** before production; an organisation account does
   not.
2. **The UGC / reviews declaration (A/B)** in Play Console — the site has customer
   reviews, so the declaration must match what the app actually shows.
3. **Both SHA-256 fingerprints** into `cms/.well-known/assetlinks.json` (still
   placeholders, which is why the browser bar shows instead of the app prompt):
   `node playstore/set-fingerprint.mjs`, then re-upload **only** that file and prove
   it with `playstore/verify-live.sh`.

---

## 9 · Where the code lives

| what | where |
|---|---|
| the legibility fix | `cms/css/v230.css` §1 (name), §1b (the measured contrast, written down so nobody restores the foil), §2 (flourish), §8 (print) |
| the graphics | `cms/css/v230.css` §3 seal · §4 border + guilloche · §5 record boxes, cartouche, signature, verify strip · §6 small screens |
| the smoothness | `cms/css/v230.css` §7 (`contain:paint`, `pointer-events:none`, and what was removed) |
| the shipped 20 | `cms/api.php` `black_pct_setting()` · `cms/js/app.js` `blackPct()` · `cms/js/admin.js` Settings field + save · `qa/preview_shim.py` `dev_black_pct()` |
| the certificate markup | `cms/js/app.js` `blackCertificateHTML()` — class `bc-certificate v229 v230`, plus `<span class="bc-cert-name-rule">` |
| the A4 download | `cms/js/app.js` `window.Shivaa.saveBlackCertificate` — ink `#2b1a05`, 3508×2480 |
| the proof | `qa/browser/t-v230-cert.mjs` (61) · `qa/v230-gate.sh` (21 checks) · `qa/phpbal.py` · `qa/make-update-zip.py` |
