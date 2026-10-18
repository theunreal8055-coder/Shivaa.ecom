# DEPLOY-v231.md — Shivaa Ecom · v231 "The Engraved Layer"

**Deploy this one.** It contains v229 (Shivaa Black control room + renewal + in-store
bills + the certificate as a document), v230 (the two bugs you reported, fixed) and
v231 (the graphics taken further, and the certificate made cheaper to paint).

**Your two reports — both fixed in v230, and made un-breakable in v231:**

| you said | what it actually was | now |
|---|---|---|
| *"the name … is of same colour as of background"* | Old layers (v201/v205) turned the name into **gold foil** — a gradient clipped to the letters with `color:transparent` — which was correct on the **dark** certificate those releases shipped. Today's certificate is **cream paper**, so the foil measured **~1.4:1** (WCAG needs 4.5:1). v229 had set a darker colour, which won the cascade but left the foil machinery in place. | The whole treatment is removed (background, clip, text-fill, filter) and the name is **ink `#2b1a05`**: **15.4:1** on the lightest paper, **9.6:1** on the darkest — **AAA**. Same ink in the **A4 download**, pure black in **print**. v231 states it on the bare selector, so no future edit can lose it. |
| *"25% … this is a false claim … should be only at 20%"* | v229 had made the rate one setting with a **25** default — my choice, and a claim the site never made. | The shipped default is **20** in all four places (server, app, Admin field, dev mirror). Card, certificate, promise line, checkout, PDP/bag strips, CTA, fine print and the downloaded artwork all say **20%**. No card reissued, no number changed. Premium's lifetime 20%, Amrita ji's ticket and public `MAKING20` untouched. Old receipts keep the rate they actually paid. |

**Status: built, gate green (22 checks, 0 red), pushed — NOT LIVE.** Live is still
**v228**. Nothing deploys without your haan.

---

## 1 · What v231 adds

**Graphics, further (as asked):**

- **Microtext band** under the top border — 5.5 px letterspaced text reading
  *SHIVAA FAMILY · PRESTIGIOUS MEMBER · SHIVAA JEWELS JAIPUR · NOT A FINANCIAL
  INSTRUMENT*. This is the banknote cue that makes a photocopy look like a
  photocopy; the canvas download has had it since v229, the sheet on screen never
  did. It is rendered from an attribute, so a screen reader does not read it aloud
  and it drops out of print.
- **Corner ornaments engraved with a gold diamond** (still exactly four — v229
  removed the duplicate).
- **Guilloche** in two fine bands, **seal** with a tick band and two rings,
  **double-rule engraved border**, record boxes with an accent edge, the promise
  line in a **cartouche**, a **signature rule** with the title under it, a hairlined
  **verify strip**, and a **flourish under the name** so the eye lands on the member.
- The **title is pressed, not glowed**, and the card's **20% plate** — the number you
  read first — has crisp ink edges.
- Small screens keep every one of these instead of dropping them.

**Smooth (by subtraction, not effects):**

- The guilloche used to be a **full-sheet** element whose gradients were merely
  *positioned* as bands — so the browser painted the whole ~900×600 sheet. It is now
  **two 58 px bands** (44 px on a phone): same artwork, about **a fifth** of the
  painted area.
- v230 had already removed a **per-glyph `filter`** and a **gradient clipped to
  letter outlines** from the most painted element on the member page, and added
  `contain: paint` so the sheet does not repaint the page through it.
- **No `@keyframes`, no `transition`, no `will-change`, no filter** in either layer.
  A certificate is a document; a document that moves is a document nobody trusts.
  The v224/v225/v226 smoothness suites are all still green.

---

## 2 · Stamps and the bundle (this exact tree)

| place | value |
|---|---|
| `cms/index.html` | **32** × `?v=231`, `window.__SHIVAA_REL = 231` |
| `cms/sw.js` | **31** × `?v=231`, `shivaa-shell-v231`, `const REL = 231` |
| `cms/js/app.js` | `const APP_REL = 231` |
| `cms/api.php` | `'rel' => 231` (braces balanced — there is no `php` binary here) |
| `cms/css/shivaa.css` | **906,692 B raw / 178,863 B gzip** · **65 layers / 65 blocks** · `VERIFY OK` ×2 · **55** provenance markers · still **one** `<link>` |
| new layers | `cms/css/v230.css` (legibility) + `cms/css/v231.css` (engraving), both appended last in `tools/css-bundle-order.txt` |

`playstore/verify-live.sh` untouched — its `rel >= 228` floor describes the **live**
site, and an equality would fail for a package you have not uploaded yet.

---

## 3 · QA — the whole gate, serially, on this exact tree

**`bash qa/v231-gate.sh`** → **22 checks run, 0 red**.

| phase | suite | result |
|---|---|---|
| 0 | bundle proof (65/65, one `<link>`) · `qa/phpbal.py` · `node --check` ×5 · both defaults are 20 | OK |
| 1 | t7-audit 4/0 · t-v206-flip ALL PASS · t-v209-alive 96/0 · t-v218-sidebar 13/0 · t-v219-depth 22/0 · t-v220-billing-gone 13/0 · t-v221-cleanup 34/0 · t-v222-bundle 36/0 · t-v223-smooth 39/0 · t-v224-corners 64/0 · t-v225-appfeel 80/0 · t-v226-butter 61/0 · t-v227-blackcard 28/28 · t-v227-design 41/41 · t-v227-reset 31/31 · t-v228-play 52/0 | **all green** |
| 1b | `qa/v229-routes.py` (real HTTP round trip) | **61 / 0** |
| 2 | `t-v229-bills` | **102 / 0** |
| 2 | **`t-v231-ink` (new)** | **53 / 0** |
| 2 | `t-v230-cert` | **61 / 0** |
| 2 | `t-v229-black` | **88 / 0** |
| 3 | `playstore/verify.mjs` | exit 2 **by design** (fingerprints still placeholders), no FAIL lines |

`t-v231-ink` is the one to read if you only read one: it **computes WCAG contrast**
for both the failing foil and the fixed ink, proves the bare-selector reset is in the
*shipped bundle* **after** the foil rule it replaces, proves nothing after it makes
certificate text transparent again, counts the guilloche nodes and asserts their
**height** (because "less paint" is a number, not a feeling), and proves 20 is a
*default* rather than a new hardcode by moving the setting to 21 and watching the
certificate follow.

**Two red lines on the first run — both assertion faults, both the same family as
earlier releases (an anchor that is not what it thinks it is):** a stamp pin written
as a **regex** (`/__SHIVAA_REL\s*=\s*230/`) survived a roll that only replaces literal
spellings; and a slice ended on `indexOf('/* section marker */')` over a string whose
comments had already been stripped, so `-1` turned the slice into "everything but the
last character". Both fixed, and both written into `cms/docs/HANDOFF-unreal8055.md` §4
so the next release does not pay for them again.

**Not run:** `t8-v106.mjs`, `t10-v107.mjs` — `t8-v106` hangs at step 1 on the
**untouched HEAD tree** too (proved at v229 by running HEAD's own extracted copy).
The gate script says so in its header.

### 3.1 What this sandbox could NOT test — check after deploying

| cannot test here | what to do on the live site |
|---|---|
| **Real PHP** (no `php` binary at all — `api.php` was balance-checked and grepped, never executed) | `curl -s https://shivaa.in/api/version` → `"rel":231`, `"stamp":{"matched":true}` |
| **Real rendering on your phone** | `#/black-card` → the name must be **dark ink on cream**, readable at arm's length; the microtext band visible as a fine line under the top border |
| **The A4 download pixels** (jsdom has no canvas, so the suite tests the guard) | **Save / share certificate** → 3508×2480 landscape, sharp at 100 %, name in dark ink |
| **Printing** | **Print / save PDF** → name black, microtext gone, nothing cut |
| **The private bills folder on your host** (from v229) | Admin → In-store Bills: either the upload form, or the amber box with both fixes (`DEPLOY-v229.md` §2) |
| **Live network / SMS / Cashfree** | unchanged by these releases |

---

## 4 · How to deploy

1. Download **`shivaa-update-v231.zip`** (repo root, or
   `https://github.com/theunreal8055-coder/Shivaa.ecom/raw/arena/e8a470c6-shivaa-ecom/shivaa-update-v231.zip`).
   **360 files · 37,333,506 B · sha256
   `114394131d4033ca8e18dea9bf139bb8495b3691529f0b2fcb13c42647fb937c`**
2. Unzip **into `public_html`**, overwriting. Paths are relative to `cms/`. The zip
   has **no** `data/db.json`, **no** `.htaccess`, **no** `config.php`, **no**
   `uploads/` content (except the `kyc` deny rule), **no** old zips, **no** `qa/`.
3. Verify: `curl -s https://shivaa.in/api/version` → `"rel":231`.
4. Look at the certificate on your phone (§3.1) and at **Admin → Settings** — the
   Shivaa Black field should read **20**.
5. Once, for v229's bills: check the private folder beside `public_html`
   (`DEPLOY-v229.md` §2). It is the only hosting step in all three releases.

**Rollback:** re-upload **`shivaa-update-v228.zip`** — that is what is live today.
Do **not** "roll back" to v229 or v230: v229 quotes 25 % to members (the claim you
rejected) and v230's legibility fix is one class-list edit away from dead.
Forward-only from there — never renumber, never deploy an older tree over a newer one.

---

## 5 · Still waiting on you (unchanged)

1. **Play account type** — personal accounts created after 13 Nov 2023 need **12
   testers for 14 continuous days** before production; an organisation account does not.
2. **The UGC / reviews declaration (A/B)** in Play Console — the site has customer
   reviews, so the declaration must match what the app actually shows.
3. **Both SHA-256 fingerprints** into `cms/.well-known/assetlinks.json` (still
   placeholders — that is why the browser bar shows instead of the app prompt):
   `node playstore/set-fingerprint.mjs`, then re-upload **only** that file and prove it
   with `playstore/verify-live.sh`.

---

## 6 · Where the code lives

| what | where |
|---|---|
| the structural ink fix | `cms/css/v231.css` §1 (bare `.bc-cert-name` + the no-colour guard on every other line) |
| microtext | `cms/css/v231.css` §2 + the `data-microtext` span in `cms/js/app.js` `blackCertificateHTML()` |
| the paint win | `cms/css/v231.css` §3 (two 58 px bands, `.bc-guilloche-foot`) + the second span in the markup |
| engraving | `cms/css/v231.css` §4 corner diamonds · §5 title + benefit plate · §6 small screens · §7 print |
| the v230 legibility layer | `cms/css/v230.css` §1 name · §1b the measured ratios · §2 flourish · §3 seal · §4 border + guilloche · §5 boxes/cartouche/signature/verify · §7 `contain:paint` · §8 print |
| the shipped 20 | `cms/api.php` `black_pct_setting()` · `cms/js/app.js` `blackPct()` · `cms/js/admin.js` Settings field + save · `qa/preview_shim.py` `dev_black_pct()` |
| the proof | `qa/browser/t-v231-ink.mjs` (53) · `qa/browser/t-v230-cert.mjs` (61) · `qa/v231-gate.sh` (22 checks) · `qa/v229-routes.py` (61) |
