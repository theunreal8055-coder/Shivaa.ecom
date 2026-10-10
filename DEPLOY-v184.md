# v184 — Amrita ji's thank-you page + the "off making charges" fix

**Release 184 · built 10 Oct 2026 · NOT deployed — the owner's yes is required.**

Live site is **v181**. This tree is **v184**. Forward-only: never deploy an older
tree over a newer one.

---

## 1. What this release is

Two unrelated things, both small on the surface.

### A. A private, phone-first page for one guest — `#/amrita`

The owner's words: *"a page for Amrita ji… she is the SBI Jayal branch manager,
her account was blocked on 1 Oct, and the family sent sandwiches made by mummy."*

The page walks five steps, in this order:

1. **How were the sandwiches?** — five big tappable stars.
2. **A reaction.** On 5 stars, a full celebration (confetti, a gold flare, the
   card lighting up). On anything less, a warm thank-you that never scolds her —
   *"thank you for being honest, mummy has already made a note of it."* Both
   paths continue to step 3.
3. **"Those sandwiches were just a trailer, mam."** — three choices:
   - Idli Sambhar with special coconut chutney
   - Special veg-cheese dosa with 2 secret chutney recipes
   - Paneer butter masala with laccha partha

   Tapping one runs its own little animation and marks it chosen.
4. **Her details.** Mobile number → the **same OTP system every retail customer
   uses** (`auth/send-otp` → `auth/otp-login` → `auth/register` for a new
   number) → name. The page says out loud that **everything else is optional**,
   and offers city / occasion as skippable extras.
5. **The card.** A real coupon for **20% off making charges**, with a
   **system-allotted number** (`AMR-XXXX-XXXX`, no ambiguous characters) that
   she never types or chooses.

### B. A money bug — "off making charges" used to mean "off everything"

**Every percent coupon in this shop discounted the entire order value** — the
metal, the stones *and* the making charges. A coupon written as *"20% off making
charges"* therefore took 20% of the metal as well.

On a ₹1,00,000 order with ₹12,868 of making charges, that is **₹20,000 off
instead of ₹2,400** — the shop pays ₹17,600 it never offered.

v184 lets a coupon declare a scope:

| `scope` | the discount is a slice of | before v184 |
|---|---|---|
| *(absent)* or `'all'` | the whole order value | unchanged — identical behaviour |
| `'making'` | the making charges only, clamped to them | — |

The base is computed **on the server**, from the making charge the server itself
priced, so no client can widen it. The checkout preview (`coupons/validate`) and
the order route call the *same* function, so the number she is shown and the
number she is charged are the same number. Each order row now records
`couponScope` so the discount can be explained after the fact.

The Amrita card is issued with `scope: 'making'` — that is the whole point of it.

---

## 2. ⚠️ ONE THING NEEDS YOUR DECISION — `RAKHI20` is live and over-discounting

Read this before anything else. **I have not changed it. It is your data and
your call.**

```
code        RAKHI20
type        percent  value 20
active      true
expiresAt   (none)
scope       (none → whole order)
note        "Raksha Bandhan — 20% off making charges, till 28 Aug"
```

Two separate problems, both live right now:

1. **It should have expired.** Raksha Bandhan 2026 was **Friday 28 August**
   ([calendardate.com](https://www.calendardate.com/raksha_bandhan_2026.htm)).
   Today is **10 October** — **43 days past** the date in its own note. It never
   expired because the date lives only in the human-readable note; there is no
   `expiresAt` for the site to read.
2. **It is scoped to the whole order.** Its note promises making charges, so
   every order it touches is losing 20% of the metal value as well.

Together: **a promotion that ended six weeks ago is currently giving 20% off the
entire order value.** On a ₹1,00,000 order that is ₹20,000 off.

### How to fix it — one click, in Admin → Coupons

The coupons table used to show an **Active checkbox that did nothing** (a static
`checked` input with no handler). v184 wires it up, and adds a **"Takes off"**
column plus a fix form, so you can correct this yourself:

1. **Admin → Coupons.** Look at the **Takes off** column. `RAKHI20` says
   *Whole order* while its note says *off making charges* — the mismatch is
   visible at a glance. (`SHIVAA10`, `FIRST2000` and `WEDDING5` are correctly
   scoped: whole order, as their notes promise.)
2. **Fastest safe action:** untick `RAKHI20`'s **Active** box. It stops
   discounting immediately and is never deleted.
3. **To keep the offer but make it honest:** use the *"Fix what a coupon takes
   off"* form — pick `RAKHI20`, set **Takes off → Making charges only**, and set
   an expiry if you want one. The note and the code are never rewritten, and
   every change is written to the audit log with your name on it.

A test in the belt (`C15`) reproduces exactly this coupon's shape and proves the
fix takes it from 20%-of-everything to 20%-of-making.

---

## 3. The page is OFF until you say yes

Nothing about this page can reach a shopper until you turn it on.

- `settings.amritaPage` is **absent from the live database**, so the page is
  **dark by default**.
- The home-page card and the page itself both check the flag, and an off page
  bounces straight to the home page.
- **The switch is enforced on the server, not only in the browser.** With it
  off, `POST /api/amrita/card` answers **404** and no card can be minted — so
  the "remove this page" button really closes the door rather than hiding a
  link.

### To turn it on (one tick, one save)

**Admin → Settings → "🤍 Amrita ji's thank-you page"** → tick → Save.

### To take it down (two ways, both one click)

1. **On the page itself** — while you are logged in as admin, a discreet
   *"Owner controls"* strip appears at the bottom. **"Remove this page from the
   website"** flips the switch and sends you home. This is the button for when
   she is standing next to you and you want it gone *now*.
2. **Admin → Settings** — untick the same box and save.

### What happens to her details when you do

**Nothing.** Her record lives in its own collection (`amritaGuests`) and the
coupon she was issued stays active and usable. Test `C11` proves this: after the
switch goes off, the guest row, the card code and the coupon are all still there,
and the coupon still works at checkout. Removing the page never costs her the
card.

---

## 4. Privacy

**Her SBI account, her branch and her account status are nowhere on the page.**
It is about the food and the family's thanks — nothing else. The page says at the
foot: *"Made for one guest, for a few days. Nothing here is shared with anyone
else."*

The belt enforces this: test `A15` fails if the page ever mentions her bank, a
blocked account, a branch manager or an IFSC code. The page is also kept out of
`sitemap.php`, so it is not crawlable, and it is never linked unconditionally —
the only way in is the home card, and only while the switch is on.

Her details are visible to you alone (`GET /api/amrita/guest` is admin-only,
test `C14`).

---

## 5. The card itself

- **Number:** `AMR-XXXX-XXXX`, allotted by the server, no `0/O` or `1/I` so it
  can be read aloud.
- **Worth:** 20% off **making charges only**.
- **Minimum order:** none.
- **Single use, one person:** `oncePerUser` + locked to her account, so it
  cannot be forwarded to anyone else (test `C10`).
- **No expiry** — deliberately. The page is temporary; the card she earned is
  not. If you want it to lapse, set an expiry in Admin → Coupons.
- **Idempotent:** a refresh, a back button or a re-tapped button returns the
  same card and never mints a second coupon (test `C09`).
- **Where she finds it:** saved to her account, so it appears at checkout and in
  her account under Coupons. She does not need to write it down.

---

## 6. Files changed

| File | What |
|---|---|
| `cms/api.php` | `coupon_scope()` + `coupon_discount()`; scope-aware order route, `coupons/validate` and coupon creation; new `amrita/card` + `amrita/guest` routes; `PUT /api/coupons/{id}`; `amritaPage` strict boolean; `rel` → 184 |
| `cms/js/app.js` | `pages.amrita` (the five steps); gated home card; scope-aware `applyCoupon()`; `makingTotal` threaded to the checkout; `APP_REL` → 184 |
| `cms/js/admin.js` | the `amritaPage` kill switch; coupons **Takes off** column, working Active checkbox, and the fix form |
| `cms/css/v184.css` | **new** — the page and its card, phone-first, fully reduced-motion aware |
| `cms/index.html` | loads `v184.css` last; all 55 asset stamps + `__SHIVAA_REL` → 184 |
| `cms/sw.js` | `SHELL`/`REL` → 184, precaches `v184.css`, v184 changelog entry |
| `tools/mega/smoke/v184-check.js` | **new** — 15 static tests |
| `tools/mega/smoke/v184-php-run.js` | **new** — 18 executed-PHP tests |
| `tools/mega/smoke/v183-php-run.js` | `X01` given a `rel >= 183` floor, as `v182-php-run` P01 was |
| `tools/mega/smoke/package.json` | both new suites wired into `npm test` |

### A bug fixed on the way

**`cms/sw.js` did not parse.** The v183 changelog entry had been inserted *after*
the comment block's closing marker, which turned the whole service worker into a
syntax error. A worker that cannot parse never registers — so the offline shell
and every release announcement were silently dead. Nobody noticed because
nothing runs `node --check` on the worker.

It is fixed, and test `A03` now runs `node --check` on `sw.js` on every belt so
it cannot happen again. **This mattered: had v183 been deployed, the site would
have lost its offline shell and its "always the latest version" mechanism.**

---

## 7. Verification

Run it yourself:

```
cd tools/mega/smoke && npm ci && npm test
```

| Suite | Result |
|---|---|
| deploy-approval gate | 20 / 20 |
| **v184-check** (new) | **15 / 15** |
| **v184-php-run** (new) | **18 / 18** |
| v183-php-run | 9 / 9 |
| v182-php-run | 9 / 9 |
| v181-php-run | 6 / 6 |
| v180-php-run | 8 / 8 |
| v179-php-run | 25 / 25 |
| v169-check / php-run | 25 / 25 · 28 / 28 |
| v168-check / php-run | 39 / 39 · N40 12 / 12 |
| v179-relay | 0 / 7 — **pre-existing, unrelated** (proved by running it against a pristine worktree) |

`v183-check`, `v182-check`, `v181-check` and `v180-check` **SKIP** on this tree:
they are stamp-exact probes for their own releases and their regression content
re-runs inside the current chain. That is by design, not a gap.

The PHP tests execute the real `api.php` under PHP 8.3 in an isolated fixture.
No production traffic, no real OTPs, no repository database writes.

---

## 8. Deploy

Forward-only, and only on your explicit yes.

```
gh workflow run "Deploy shivaa.in" --ref main -f confirm="DEPLOY SHIVAA LIVE"
```

The exact phrase and the branch restriction are enforced by the deploy-approval
gate; a merge or a push is **not** deployment approval.

**A push/merge is not approval. Nothing here is live until you run it.**

After deploying:

1. **Admin → Settings** → tick *Amrita ji's thank-you page* → Save.
2. Open `https://shivaa.in/#/amrita` **on a phone** — that is what it was built
   for.
3. Walk it once yourself: stars → 5 → the menu → your own number for the OTP.
   You will get a card; that is fine, it is scoped to making charges and is one
   use on your account. (Or skip it and just look.)
4. When you are done with her, use the one-click remove.

---

## 9. What I could not do here

- **No real OTP was sent.** The SMS gateway is not configured in this sandbox.
  Her code will arrive by SMS on the live site exactly as it does for every
  other customer — but that path is the one thing worth watching on the first
  real run.
- **No browser here**, so the animations were verified by code review and by the
  reduced-motion guard, not by eye. Look at it on your phone before she does.
- **I have not touched the live database.** `RAKHI20`, `amritaPage` and every
  other setting are exactly as you left them.
