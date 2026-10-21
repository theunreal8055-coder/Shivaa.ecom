# DEPLOY-v227.md — Shivaa Ecom · v227 "The Reading Layer"

**What the owner asked for:** *"On any product page, the verify and create button of Shivaa black
membership card is not working, fix it … and login form has a problem when someone clicks on forget
password then it shows a email otp button but it should show a number otp button and then make a new
password, fix these in the next update and make design elements and design physics and design texts
more better."*

**Status:** built, packaged, the whole QA gate green, pushed to `arena/e8a470c6-shivaa-ecom`.
**NOT live.** Live stays **v205** until the owner says yes. Next number after this one: **v228**.

---

## 1 · The black-card button — what was actually broken

The owner's report was exact: on a product page, **Verify & create** did nothing. It was reproduced
in jsdom on `#/product/p_smp_rings_01` before anything was changed, and the cause had three parts:

| # | what the code did | what the shopper saw |
|---|---|---|
| 1 | `blackReadIntake()` searched for `[data-black-claim] [data-bc-intake]` — a form that **only exists on `#/black-card`** | on a PDP it read empty fields and returned *"Enter your name…"* |
| 2 | `beginBlackClaim()` then hit `if (intake.error && intake.form) … return` — `form` was null, so it fell through to a different error branch | nothing happened at all |
| 3 | the status writer wrote into `.bc-claim-status`, which also only exists on `#/black-card` | no sheet, no message, no clue |

So the button was not "sometimes" broken: on **every** product page, for **every** visitor, signed in
or out, it was a dead tap.

**The fix (`cms/js/app.js`):**

- the reader is **form-aware**: if a `[data-bc-intake]` form is on the page it reads the form, and if
  it is not (the PDP invite card) it reads what the page actually offers;
- the **invite card on the PDP carries its own live status line** (`.bc-commerce-status`) — the sheet
  now opens *on the page it was pressed on*, and any message is written there;
- the claim **falls back to the account name** instead of asking a signed-in shopper to type a name
  the account already has, and an account with no name at all is sent to `#/black-card` — the one
  page that asks for it — rather than getting a button that refuses;
- the **post-login auto-claim prefills the form first**; it had been silently broken for every
  first-time visitor (the redirect landed on a form the claim then read as empty);
- **the claim intent is armed only after validation passes.** This was a real bug found by the new
  suite: the old code armed `_blackClaimAfterLogin` at the top of `beginBlackClaim`, so a *refused*
  empty claim on the black-card page would later fire itself on the next sign-in.

**Proven end to end in jsdom, on a real PDP hash:**

- signed out → sheet opens, live status reads *"Verify your registered mobile to create the card…"*,
  and the return hash is remembered (`#/product/p_smp_rings_01`);
- signed in → OTP → name → card **SBM284596**, `expires 2027-04-18`, `20 / making-charges /
  Meera Kanwar` → back on the same piece, which now reads **"Save ₹854 on this piece · Exactly 20 % of
  ₹4,269 making charges"**;
- the intent is consumed exactly once;
- an empty claim on `#/black-card` is still refused, and no longer leaves an intent behind.

## 2 · Forgot password — a number, then a new one

The owner's point: the form showed an **email** OTP when it should ask for the **mobile**, and then let
the shopper set a new password.

- **mobile is the default field** on the sign-in door; email is one tap away and still works;
- the **4-digit code goes to the registered mobile** — even when the shopper starts with an email
  address, the SMS still goes to the mobile on the account (the API resolves it);
- after the code the shopper sets **new password + repeat** on the same screen, with a live
  **"Resend in 30s"** countdown that is genuinely disabled until it expires;
- `cms/api.php` accepts `{phone}` **or** `{email}` for the reset request, counts the rate limit per
  identifier, and the confirm step resolves the account by phone or email.

**Proven in jsdom:** the mobile field is the default, the email toggle works both ways, the demo
4-digit code is shown in this fixture, resend is disabled at 30 s, a mismatched repeat is refused with
*"The two passwords are not the same"*, and the **new password signs in (200) while the old one is
refused (401)**. The email path still texts the registered mobile.

## 3 · Home-page bugs, from the owner's own list

1. **`₹₹6,998/g`.** The live-rate ribbon (`.ub-rates`) printed the rupee sign twice on every figure —
   `fmt()`/`fmt2()` have printed it since v120 and the template added another. `tickTxt()` now guards
   (`✦ ₹₹7,123/g` → `✦ ₹7,123/g`) and the ribbon's markup no longer supplies its own sign.
2. **The hero hint was not a control.** The legacy cue was a bare injected `<div>` that sat in the tab
   order's way, took taps and answered nothing. It is a real `<button>` now (`data-hero-cue`), with a
   hover, a press, an accessible label, and 44 px of reach on a touch screen (40 px otherwise); the
   browser's own focus ring is left in place, and the black-card hero's own cue is untouched and still
   jumps to `#blackPrivileges`.
3. **Long text that could not wrap.** `ub-rates` and the large button label were `white-space: nowrap`
   and could push a narrow phone sideways; both are allowed to wrap at 768 px.
4. **Eager, unsized images.** The news logo and the mega-menu feature art were loading eagerly with no
   intrinsic size (layout shift on a slow phone). Both are deferred and sized; the decorative logos
   stay eager on purpose (they are above the fold and a deferred logo flashes empty).

## 4 · Design elements, physics and text — "more better"

`cms/js/v227.js` + `cms/css/v227.css` (the last bundle layer) are the **reading layer**: nothing here
animates a property a phone has to re-layout, and nothing assumes a guessed pixel.

- **The footer clears the bottom nav by its real height.** `--shv-mnav-h` is measured from the live
  `.mnav` on load/resize/route change (64 px fallback, asserted in CSS), instead of the guessed 60 px
  that left the last footer line under the bar on some phones. `scroll-padding-bottom` and `#backTop`
  follow the same variable.
- **Late mounts stay deferred.** Images inserted after the first sweep (a route change, a card
  re-render) get `loading="lazy"` and `decoding="async"`; already-sized images are left alone.
- **The category rail centres the active chip without moving the page** — `scrollLeft` arithmetic on
  the rail only, never `scrollIntoView` (which moves the document). Under
  `prefers-reduced-motion: reduce` the rail jumps instead of gliding.
- **Gold that can be read.** `.fv-base` (.5/.6 alpha) and `.fvt-id` (.55) — the deepest footer copy —
  are lifted to a floor; the design's gold on maroon stays, it is simply legible now.
- **Press physics that match the hand, not the mouse.** The new states use the same
  `--shv-press: .97` token as the rest of the house and sit behind the same coarse/hover union as v226,
  so nothing new can stick after a tap on a phone.
- **Micro-copy.** The live ribbon now says where the numbers come from (*"Live from the Jaipur
  desk"*) instead of a bare "Live"; the black-card status lines say what will happen next ("Verify
  your registered mobile to create the card…") instead of a generic wait message.

## 5 · Stamps (this exact tree)

| place | value |
|---|---|
| `cms/index.html` | **32** × `?v=227`, `window.__SHIVAA_REL = 227`, `/js/v227.js?v=227` (deferred, after `app.js`) |
| `cms/sw.js` | **31** × `?v=227`, `shivaa-shell-v227`, `REL = 227` |
| `cms/js/app.js` | `APP_REL = 227` |
| `cms/api.php` | `'rel' => 227` |
| `tools/css-bundle-order.txt` | `… v226.css, v227.css` (last) |
| `cms/css/shivaa.css` | **885,408 B** raw / **175,338 B** gzip · **62 layers / 62 blocks** · `VERIFY OK` ×2 · one `<link>` |

## 6 · QA — the whole gate, serially, against this exact tree

Every suite was run with cwd = repo root, one at a time, never in parallel.

| suite | result |
|---|---|
| `t-v227-blackcard` | **28 / 0** — the claim from a PDP, signed out and in, and the refusal |
| `t-v227-reset` | **31 / 0** — mobile-first, code, new password, resend, old password refused |
| `t-v227-design` | **41 / 0** — cue as a control, ₹₹ guard, readable gold, measured nav height, reduced motion |
| `t-v226-butter` | 61 / 0 |
| `t-v225-appfeel` | 80 / 0 |
| `t-v224-corners` | 64 / 0 |
| `t-v223-smooth` | 39 / 0 |
| `t-v222-bundle` | 36 / 0 — `VERIFY: all 62 blocks present, contiguous and in order` |
| `t-v221-cleanup` | 34 / 0 |
| `t-v220-billing-gone` | 13 / 0 |
| `t-v219-depth` | 22 / 0 |
| `t-v218-sidebar` | 13 / 0 |
| `t-v209-alive` | 96 / 0 |
| `t-v206-flip` | all pass |
| `t7-audit` | 4 / 0 — all 51 internal routes render |

`node --check` on `app.js`, `auth.js`, `v227.js`, `sw.js`: OK. Every older suite's exact release-stamp
assertion (`?v=` counts, `__SHIVAA_REL`, shell name, "inventory grew by exactly one layer") was rolled
to 227 — that is the only reason they failed before the roll, and they were hand-checked line by line.

## 7 · The package

**`shivaa-update-v227.zip`** at repo root — the whole `cms/` tree, paths relative to `cms/`.

- **357 files · 37,266,250 B**
- sha256 **`c4cbf83d6efb06fc518a3882af9b6b8727a6dd1743e40ff5fe657602769ccc0f`**
- extracted and `cmp`-ed: **357/357 identical** to the tree this document describes; the two new files
  are `css/v227.css` (12,169 B) and `js/v227.js` (10,044 B);
- **no `qa/`**, **no `cms/data/db.json`** (the local fixture is gitignored and never ships), no
  `.git`, no `DEPLOY-*`, no zips inside the zip.

Download:
`https://github.com/theunreal8055-coder/Shivaa.ecom/raw/arena/e8a470c6-shivaa-ecom/shivaa-update-v227.zip`

## 8 · How to deploy

1. Back up the live tree the way you always do.
2. Upload the zip's contents over the site root.
3. Hard-refresh once, or let the service-worker banner move a returning phone to
   `shivaa-shell-v227`.
4. Confirm `?v=227` in the browser's network tab for `shivaa.css`, `v226.js` and `v227.js`.

**Rollback:** re-upload **`shivaa-update-v226.zip`** (355 files · 37,250,664 B · sha256
`602a519266efa2e51936c42a99d997dc3933209139a700fd7f9a4550a89ef463`) — or the v225 zip before that
(353 · 37,238,134 B · `3c943a937f8f6d52e8d447887ebefb188a980ccdf0d432a16cf9ed0c83b01ae0`). Never
restore an older tree over a newer one, and never reuse a release number.

## 9 · What to check on the phone (3 minutes) — the owner's three points

1. **Open any product** (`#/product/…`), scroll to the black-card invite and tap **Verify & create**.
   The sheet must open *there*, with a line under the button saying what will happen. Signed out, it
   asks for the mobile; signed in, it should offer the card in one pass and bring you back to the same
   piece, which should then show the saving on that piece's making charges.
2. **Sign-in → Forgot password.** The first field must be the **mobile number**, the code must arrive
   by SMS to that number, and after the code you must be able to set a **new password** and repeat it.
   Then sign in with the new one. (The email option is still one tap away.)
3. **The home page:** the rate ribbon must read `₹6,998/g`, never `₹₹6,998/g`; the hint under the hero
   must answer a tap; nothing should slide sideways.
4. **iPhone with the notch:** scroll to the very bottom of the home page — the last footer line must
   sit *above* the bottom nav, not under it.

## 10 · Not verified here

- **No real browser, no real phone, no real SMS, no real PHP.** The black-card journey and the reset
  flow are proven end to end in jsdom against the local shim (`qa/preview_shim.py`, same routes as
  `api.php`), not against the live server. The SMS itself, and `php -l`, cannot run in this sandbox.
- **The touch feel** (press, ripple, haptic) is asserted structurally; only a thumb can judge it.
- The service worker's cache bump (`shivaa-shell-v227`) needs a real origin to be observed.
- Real-device Safari quirks around `scroll-padding-bottom` and safe-area insets are the one place the
  footer measurement could still surprise; §9.4 is the check for it.

## 11 · Rollback of a failed deploy

If v227 has a defect the owner cannot live with: restore `shivaa-update-v226.zip` (see §8), tell the
agent exactly what happened on which phone and which tap, and the next release number is still
**v228** — never a renumbered v227.
