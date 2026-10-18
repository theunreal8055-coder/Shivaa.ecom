# DEPLOY-v229.md — Shivaa Ecom · v229 "The Paperwork Release"

**What the owner asked for:** *"Sab banao agle update main"* — (A) Admin me Shivaa
Black tab + cards-to-ship queue, (B) renewal, (C) the offer gap — *"or ek cheez or
banao iske sath"*: (D) offline/in-store purchase bills, **owner-side upload only**,
the customer seeing **exactly** "view and download your in-store purchases" and
nothing more, and (E) *"customer ka prestigious member certificate research krke
ekdum best level ka banado"*. *"agli update file main ye sab rakho."*

**Status:** built, packaged, the whole gate green on this exact tree
(**20 checks, 0 red**), pushed to `arena/e8a470c6-shivaa-ecom`.
**NOT LIVE.** The live site stays **v228** until you say haan. Next number after
this one: **v230**.

Everything here is web-side. Nothing needs the Android toolchain and nothing
changes the Play listing.

---

## 1 · What was actually missing, and what now exists

| # | the gap | what v229 does |
|---|---|---|
| A | Shivaa Black members existed only as rows inside `users[]`. There was **no screen** showing who holds a card, what the number is, when it runs out, or which free plastic cards still have to be printed and posted. | **Admin → Shivaa Black**: every member with card number, member ID, issued, valid-through, days left and renewal count; a summary strip (members / active / renewal open / expired / **cards to post** / printed / shipped / current %); a filter (all · cards still to post · renewal open · active · expired); **↻ Renew** per member; **🖶 Printed → ✔ Shipped** for the free card; a **CSV** export; a **printable posting list** of address labels (`page-break-inside: avoid`, so it can be cut out and taped to an envelope); and a **sidebar badge** counting what is still to post. |
| B | A six-month card simply **stopped**. Renewing meant a phone call and a hand-edited JSON file on the server. | The member renews **in one tap** on their own Shivaa Black page: `POST /api/black-card/renew`. It opens only in the **last 30 days** of validity or after expiry (otherwise **409** with a plain reason and the days left), is rate-blocked at 6/hour, and keeps `memberId` / `cardNumber` / `certificateNo` — the number printed on the plastic in the customer's pocket never changes, only the window moves, by **six calendar months**. Your own route (`POST /api/admin/black-card/renew`, 1-36 months) **extends a live card from its own expiry**, so renewing somebody early never takes away a day they already earned. |
| C | Every Black line on the site said **20% off making charges** — exactly what the public `MAKING20` coupon gives a guest who has never signed in. A card that costs a KYC form and matches the public offer is not a privilege. | The member percentage is now **ONE setting**: `settings.blackDiscountPct`, default **25**, clamped 0-40, in **Admin → Settings** right under the public offer box. The server resolves it once per request (`$GLOBALS['shv_black_pct']` → `black_discount_pct()`); the SPA reads it through `blackPct()`. Card face, card reverse, certificate, promise line, claim copy, member page, scope note, hero, PDP strip, bag strip, checkout line and the downloaded artwork all follow it — **and no card number ever changes**, because no coupon row is stored per member. |
| D | Customers buy at the counter, the paper bill stays with you, and there was **nowhere** to put it. | **Admin → In-store Bills**: upload the bill (jpg / png / webp / pdf, up to 6 files × 8 MB) with customer name, mobile, bill number, date, store, amount, what was bought and a **private note**. Files go to a private folder **beside** `public_html` — never inside the web root — and are streamed **by index** through `GET /api/store-bills/{id}/file/{i}` with `no-store`, `nosniff` and `SAMEORIGIN`. The customer page **`#/my-bills`** ("Your in-store purchases", also a tile on the account page) has **exactly two verbs: View and Download**. |
| E | The certificate had three record boxes (so the certificate number and the member ID shared one), no expiry, no signatory, no title under the signature, no verification line, and no promise line carrying the real percentage and the real dates. | The certificate is now a **document**: one guilloche (engine-turned) band, **four** record boxes — certificate no · member ID · issued · **valid through** — the member's name in caps as the largest element after the title, a promise line with the live % and both dates plus its scope (*"never on metal value, stones, GST or shipping"*), a **signature block with a title** (*For Shivaa Jewels · Proprietor · the Shivaa Family*), a **verify line** a stranger can follow (`shivaa.in` + the certificate number), `RENEWED n×`, and a state pill that turns **gold** ("certificate permanently archived") when the six months are up while the certificate itself stays in the account forever. The download is now **A4 landscape 3508×2480 px @300 dpi** — real print artwork, not an upscaled screen capture. |

Also in this release, because the two halves had to agree:

- **Erasure treats bills like orders.** They are GST/tax records, so
  `bills_anonymize()` runs at **both** erasure call sites (`auth/delete-account`
  and `admin/user-data/{id}/anonymize`): the name becomes *Deleted customer*, the
  mobile and `userId` are cleared, the note is emptied, `anonymizedAt` is stamped,
  and the count goes into the audit entry. **The record survives; the person does
  not.**
- **A receipt never follows a setting.** Historical order and invoice rows derive
  their own percentage from the order's two numbers (`blackOrderPct()` = discount ÷
  making-charge basis), so an order placed at 20% still says 20% after you move the
  programme to 25%.
- **The owner's private note stays private.** `bill_public($b, $admin)` sends
  `notes`, `phone`, `userId` and `createdBy` only to an admin, and never sends the
  stored `ref` to anybody. The customer page has no upload, edit, delete or dispute
  control at all — the suite asserts that as a negative, on the source, on the API
  payload **and** on the rendered DOM.

---

## 2 · The one step that can fail on your hosting — read this first

Bills must **not** sit inside `public_html`. The code wants a folder **beside** it:

```
/home/u486999505/                       ← the private folder goes HERE
/home/u486999505/.shivaa-private-bills  ← 0700, PHP creates it on the first upload
/home/u486999505/public_html/           ← the website
```

On Hostinger shared hosting PHP usually **can** create that folder. If the parent
directory is not writable it cannot — and then nothing is silently lost: uploads
answer **503 "Private bill storage is unavailable — nothing was saved. Ask the host
for a writable folder beside public_html (or set SHIVAA_PRIVATE_BILLS_DIR)."**, and
**Admin → In-store Bills** shows the same warning in an amber box with both fixes
and a **disabled** upload button, instead of a save button that appears to work.

**How to check in 30 seconds after deploying:** open **Admin → In-store Bills**.
Either you see the upload form, or you see the amber warning. Or upload one real
bill and watch it appear in the table below.

**If the warning is there, either fix works:**

1. **hPanel → File Manager:** go one level **above** `public_html`, create a folder
   named `.shivaa-private-bills`, set permissions to **700**. No code change.
2. **Or point the code at any writable private path** with an environment variable
   (hPanel → PHP configuration → environment variables):
   `SHIVAA_PRIVATE_BILLS_DIR=/home/u486999505/private-bills`.

The code refuses a **symlink** and refuses any path **inside** the document root,
so neither fix can be turned into a public URL by accident. The folder is `0700`,
stored files are `0600`, and the type is checked against magic bytes **on the way
in and again on the way out** — a text file renamed `.png` is refused (proven in
the suite).

Nothing else in this release needs a server change: no new PHP extension, no cron,
no database migration, no `.htaccess` edit. The existing `RewriteRule ^data/ -
[F,NC,L]` still blocks `db.json`, and bills are not in `data/` anyway.

---

## 3 · The percentage decision (this changes the moment you deploy)

`settings.blackDiscountPct` does not exist in your live `db.json` yet, so **the
code's default applies: 25%**. That means the instant v229 is live, **every
existing Shivaa Black member's making-charge discount goes from 20% to 25%** — on
the card, on the certificate, at checkout, and in the order calculation. No card is
reissued and no code changes; it is one number, read once per request. A card
created under the old 20% shows 25% too, because the server overrides the stored
value from the setting (the suite proves exactly this case).

If you want a different number, set it **before** you tell anybody:
**Admin → Settings → "✦ Shivaa Black member discount — % off MAKING CHARGES"**
(whole number 0-40) → Save settings.

- Keep it **above 20**, or the card matches the public `MAKING20` offer again and
  the gap you asked me to close is back.
- **0** switches the member discount off **without deleting anybody's card** — the
  certificate, the member number and the account all stay exactly as they are.
- The public offers (`MAKING20` 20% + `FREEDEL`), the **Premium** card's own
  lifetime 20%, and **Amrita ji's** personal 20% ticket are separate programmes and
  are **untouched**.

A worked example at the default: an order of ₹1,00,000 with ₹12,000 of making
charges saves a Black member **₹3,000** (was ₹2,400 at 20%). The discount is on
**making charges only** — never on metal value, stones, GST or shipping — and that
sentence is now printed on the certificate itself.

---

## 4 · Stamps and the bundle (this exact tree)

| place | value |
|---|---|
| `cms/index.html` | **32** × `?v=229`, `window.__SHIVAA_REL = 229` |
| `cms/sw.js` | **31** × `?v=229`, `shivaa-shell-v229`, `const REL = 229` |
| `cms/js/app.js` | `const APP_REL = 229` (791,736 B) |
| `cms/js/admin.js` | 360,577 B |
| `cms/api.php` | `'rel' => 229` (592,167 B, braces balanced) |
| `cms/css/shivaa.css` | **894,469 B raw / 176,971 B gzip** · **63 layers / 63 blocks** · `VERIFY OK` ×2 · **53** provenance markers · still **one** `<link>` |
| `cms/css/v229.css` | 13,322 B, added **last** in `tools/css-bundle-order.txt` (`v186.css` still listed twice, by design) |

No `228` stamp survives in any shipped carrier. The stamp roll also updated the
literal stamp assertions **and the "which layer is newest" pins** inside eleven
older QA suites — that is the ritual, not an accident: a suite pinned to v228 goes
red the moment v229 ships, and a red gate teaches everyone to ignore the gate.

`playstore/verify-live.sh` was **not** touched. It checks `rel >= 228` against the
**live** site, which is still v228 until you deploy; an equality there would fail
for a release that has not been uploaded yet.

`cms/css/v229.css` adds **no `@keyframes` at all** and animates no layout
property, so the compositor-only rule from v224 still holds. Printing reuses the
`body.bc-printing` / `.bc-print-zone` machinery v184 built; **no `@page` rule was
added**, because a landscape `@page` would rotate every invoice on the site along
with the certificate.

---

## 5 · QA — the whole gate, serially, against this exact tree

One command: **`bash qa/v229-gate.sh`**. It rebuilds the fixtures itself and
starts/stops its own shim on port 8090. Result: **20 checks run, 0 red**.

| phase | suite | result |
|---|---|---|
| 0 | bundle builder's own proof (63 layers, 63 blocks, one `<link>`) | VERIFY OK ×2 |
| 0 | `qa/phpbal.py cms/api.php` (no php binary exists here) | BALANCED |
| 0 | `node --check` app.js · admin.js · sw.js | OK ×3 |
| 1 | `t7-audit` | 4 / 0 |
| 1 | `t-v206-flip` | ALL PASS |
| 1 | `t-v209-alive` | 96 / 0 |
| 1 | `t-v218-sidebar` | 13 / 0 |
| 1 | `t-v219-depth` | 22 / 0 |
| 1 | `t-v220-billing-gone` | 13 / 0 |
| 1 | `t-v221-cleanup` | 34 / 0 |
| 1 | `t-v222-bundle` | 36 / 0 |
| 1 | `t-v223-smooth` | 39 / 0 |
| 1 | `t-v224-corners` | 64 / 0 |
| 1 | `t-v225-appfeel` | 80 / 0 |
| 1 | `t-v226-butter` | 61 / 0 |
| 1 | `t-v227-blackcard` | 28 / 28 |
| 1 | `t-v227-design` | 41 / 41 |
| 1 | `t-v227-reset` | 31 / 31 |
| 1 | `t-v228-play` | 52 / 0 |
| 1b | `qa/v229-routes.py` (real HTTP round trip) | **61 / 0** |
| 2 | `t-v229-bills` | **102 / 0** |
| 2 | `t-v229-black` | **88 / 0** |
| 3 | `playstore/verify.mjs` | exit 2 **by design** (the fingerprints are still placeholders), no FAIL lines |

Phase 1 runs on the plain fixture the historic suites have always run on. Phase 2
runs on `qa/build-test-db.py --with-staff` (an owner, one Shivaa Black member
expiring in 18 days with a free card `to-ship`, one unrelated customer), each
against a **freshly restarted shim** — renewal and upload legitimately mutate the
in-memory dev layer. `qa/v229-routes.py` **exits 3 with SKIP** rather than failing
when the shim already carries state, so a dirty environment can never be mistaken
for a regression.

**Not run, and why (both pre-existing, neither caused by v229):** `t8-v106.mjs`
and `t10-v107.mjs`. `t8-v106` hangs at step 1 waiting for `.pc-qv` on `#/shop` —
and it does so on the **untouched HEAD tree** as well, proved during this release
by extracting HEAD's own harness *and* suite (`git archive HEAD qa/browser`) and
running those: it printed `·· 1 quick view` and never came back inside 150 s. That
is why neither appears in the v228 gate table either. The gate script says this in
its own header, so the next person does not have to rediscover it.

### 5.1 What this sandbox could NOT test — check these on the live site

| cannot test here | why | what to do after deploying |
|---|---|---|
| **Real PHP execution** | there is no `php` binary in this sandbox at all; `api.php` was checked with a brace/string balance pass and grep, never executed | `curl -s https://shivaa.in/api/version` → `"rel":229`, `"stamp":{"matched":true}`; then open Admin → Shivaa Black and Admin → In-store Bills |
| **The private folder on your host** | filesystem permissions differ per host | §2 — look for the amber warning, then upload one real bill |
| **Printed output** | jsdom does not print | On the Shivaa Black page press **Print / save PDF** (card + certificate); in Admin → Shivaa Black press **🖶 Print posting list** — check the labels are not cut and the certificate name is gold, not blank |
| **The A4 download on a phone** | jsdom has no canvas (`getContext` returns null), so the suite tests the *guard*, not the artwork | On your phone: Shivaa Black → **Save / share certificate**, then open the file — it should be 3508×2480 landscape and sharp at 100% |
| **Real browser multipart uploads** | the shim parses multipart itself (correctly, but it is not PHP) | Upload a **phone photo** of a paper bill (jpg) and a **scan** (pdf), then open both from the customer side |
| **Live network / SMS / Cashfree** | no route out to those hosts | unchanged by this release |

---

## 6 · How to deploy

1. Download **`shivaa-update-v229.zip`** (repo root, or
   `https://github.com/theunreal8055-coder/Shivaa.ecom/raw/arena/e8a470c6-shivaa-ecom/shivaa-update-v229.zip`).
   **358 files · 37,317,163 B · sha256
   `c9c54cf09476be53f07b6a21eb3ed9f60852918177fe68cb4beb5f71a8a62d23`**
   (built by `python3 qa/make-update-zip.py 229` — the previous zip's exact file
   list plus `css/v229.css`. It was rebuilt once, after the two countdown docs in
   `cms/docs/` were updated, because those ship inside the zip.)
2. Unzip **into `public_html`**, overwriting. Paths inside the zip are relative to
   `cms/`, so `api.php` lands at `public_html/api.php`. The zip contains **no**
   `data/db.json` (your live records are never overwritten), **no** `.htaccess`,
   **no** `config.php`, **no** `uploads/` content (except the `kyc` deny rule),
   **no** old zips and **no** `qa/`.
3. Check §2 (the private bills folder).
4. Check §3 (the percentage — it is 25 unless you set it).
5. Verify: `curl -s https://shivaa.in/api/version` → `"rel":229`,
   `"stamp":{"matched":true}`. Then, on a phone that visited before: open the site
   once — the release guard moves it to 229 by itself, no reload, never mid-form
   and never mid-payment.
6. Smoke test in this order: **#/black-card** as a member (certificate: four boxes,
   promise line, signature, verify line; renewal strip if the card is in its last
   month) → **#/my-bills** (empty state, then a bill you uploaded: View, Download)
   → **Admin → Shivaa Black** (queue, filter, Renew, Printed/Shipped, CSV, print
   posting list) → **Admin → In-store Bills** (upload a real photo, View it,
   Download it, Edit/attach a second page, drop a page, delete) → one checkout with
   the member code auto-applied, checking the saving line says 25%.

**Rollback:** re-upload **`shivaa-update-v228.zip`** (357 files · 37,271,610 B ·
sha256 `c9975a92…fbab9`). Forward-only from there: never deploy an older tree over
a newer one, and never renumber. A rollback leaves `settings.blackDiscountPct` in
`db.json` (harmless — v228 does not read it) and leaves any uploaded bills in the
private folder (also harmless — v228 has no route that serves them).

---

## 7 · Still waiting on you (unchanged by this release)

1. **Play account type** — personal accounts created after 13 Nov 2023 need **12
   testers for 14 continuous days** before production. An organisation account does
   not.
2. **The UGC / reviews declaration (A/B)** in Play Console — the site has customer
   reviews, so the declaration has to match what the app actually shows.
3. **Both SHA-256 fingerprints** into `cms/.well-known/assetlinks.json` (today it
   still holds placeholders, which is why the browser bar shows instead of the app
   prompt). Use `playstore/set-fingerprint.mjs`, then re-upload **only** that one
   file and prove it with `playstore/verify-live.sh`.

---

## 8 · Where the code lives (for the next agent)

| what | where |
|---|---|
| the member percentage | `api.php` `black_pct_setting()` + `black_discount_pct()` + `$GLOBALS['shv_black_pct']` (set right after `$db = db_load()`, before any route); `app.js` `blackPct()` / `blackPctWord()` / `blackSaving()` / **`blackOrderPct(o)`** for historical rows |
| renewal | `api.php` `black_add_months()`, `black-card/renew`, `admin/black-card/renew`; `app.js` `blackRenewHTML()` + `window.Shivaa.renewBlackCard`; `admin.js` `ShivaaAdmin.blackRenew` |
| the card queue | `api.php` `admin/black-card/queue`, `admin/black-card/delivery`; `admin.js` `tab === 'black'` + `blackFilter` / `blackShip` / `blackCsv` / `blackPrint` |
| the bill vault | `api.php` `shv_bill_private_dir`, `shv_bill_detect_ext`, `shv_bill_store_upload`, `shv_bill_resolve_ref`, `shv_bill_unlink`, `bill_public($b,$admin)`, `bills_for_user`, `bill_index`, `bill_link_user`, `bill_clean`, `bill_files_from_upload`, `bills_anonymize`, and the routes `store-bills`, `store-bills/{id}/file/{i}`, `admin/store-bills`, `admin/store-bills/{id}` |
| the customer page | `app.js` `BILL_EXT` / `window.Shivaa.openBillFile` / `billFileName` / `billFileRowHTML` / `billCardHTML` / `pages['my-bills']` (all above `pages['erase-account']`), plus the account tile and `window.Shivaa.reloadView` |
| the certificate | `app.js` `blackCertificateHTML()` (now `.bc-certificate.v229`) and `window.Shivaa.saveBlackCertificate` (A4 canvas, scaled by `BK = 3508/1800`); `css/v229.css` §A |
| the owner's desk | `admin.js` `tab === 'bills'` + `ShivaaAdmin.billOpen` / `billCreate` / `billEdit` / `billSave` / `billDrop` / `billDelete` |
| the dev mirror | `qa/preview_shim.py` — `dev_black_pct`, `dev_add_months`, `dev_black_left`, `dev_black_renew`, `dev_black_card` (now **adopts** a stored card), `dev_file_kind`, `dev_multipart`, `dev_bill_validate`, `dev_bill_store`, `dev_bill_link`, `dev_bill_public`, `dev_bills_for`, `dev_multipart_api` |
| the gate | `qa/v229-gate.sh` · `qa/v229-routes.py` · `qa/phpbal.py` · `qa/make-update-zip.py` · `qa/build-test-db.py --with-staff` · `qa/browser/t-v229-black.mjs` · `qa/browser/t-v229-bills.mjs` |
