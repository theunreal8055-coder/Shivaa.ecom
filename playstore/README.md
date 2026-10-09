# Shivaa Jewels on Google Play — the launch kit

**Read this page top to bottom once. It is the whole plan, in order, with the
places it can stop dead marked as gates.**

---

## 0 · What you already have, and what this adds

Shivaa is already a full **Progressive Web App**: a standalone manifest, a
service worker with an offline shell, maskable icons, and (since v178) a footer
card that lets a shopper add it to their home screen in two taps. That is 90% of
an app, and it is why the Play Store route is *cheap* here: the app is a
**Trusted Web Activity** — a verified, full-screen window onto `shivaa.in`, with
your own icon, your own splash screen and your own listing. No second codebase,
no React Native rewrite, no separate content to keep in step.

What was missing, and what this kit and release **v183** add:

| Piece | What it is | Where it lives |
|---|---|---|
| Digital Asset Links | the file that proves `shivaa.in` belongs to your app | `cms/.well-known/assetlinks.json` |
| The `.htaccess` guard | the site denies every `*.json`; this re-grants the one Google fetches | `cms/.well-known/.htaccess` |
| A stable web-manifest `id` | so the installed PWA and the Play app are **one** identity | `cms/manifest.json` + `.webmanifest` |
| In-app account erasure | Play **requires** it for any app with accounts | `POST /api/auth/delete-account` + the page in `cms/js/app.js` |
| The TWA build config | Bubblewrap's own schema, ready to build | `playstore/twa-manifest.json` |
| Play graphics | icon, feature graphic, screenshot framing | `playstore/graphics/` |
| Listing copy + App-content answers | paste-ready | `playstore/listing.md` |
| The tick-box runbook | | `playstore/CHECKLIST.md` |
| An offline verifier | 17 checks on the kit itself | `playstore/verify.mjs` |

---

## 1 · The two gates — check these before you spend an hour

### Gate 1: what kind of developer account is this?

This is the single fact that decides whether "today" is real.

- **Personal account created after 13 November 2023** → Google requires a
  **closed test with at least 12 testers opted in for 14 continuous days**
  before the *Apply for production access* button even appears. Internal testing
  does not count. There is no bypass and no support ticket that waives it.
  **Public listing is roughly three weeks away, minimum.**
- **Organisation account** (D-U-N-S verified) → exempt.
- **Personal account created before that date, with an app already in
  production** → exempt.

**If you are on the 12-tester path, here is the honest plan:** build and sign
the app today, push it to **internal testing**, install it on your own and your
staff's phones today, and start the closed test with 12 real people the same
day. Marketing goes out on the day Google grants production — not before.
Nothing in this repository can shorten that window, and anyone who tells you
otherwise is selling something.

### Gate 2: is the account verified?

New Play Console accounts need identity verification (government photo ID,
proof of address, phone). Until it clears you can upload builds and fill in the
listing, but you cannot publish to any track. Budget a few business days.

---

## 2 · Deploy the web side (release 183)

The app is the website, so the website has to ship the three things the app
depends on. Follow `DEPLOY-v183.md`:

1. Back up `public_html` from hPanel.
2. Extract `shivaa-update-v183.zip` into it.
3. Check `https://shivaa.in/api/version` → `rel: 183`, `stamp.matched: true`.

Then confirm the two URLs the Play listing and Google's verifier will use:

```bash
curl -s https://shivaa.in/.well-known/assetlinks.json | head -20
curl -s -o /dev/null -w '%{http_code}\n' https://shivaa.in/#/delete-account
```

The first must return the JSON. If it returns **403**, the `.htaccess` guard did
not land — see `playstore/htaccess-wellknown.txt` for the one-block fix to paste
at the end of the site's `.htaccess`.

> **Why that file is fragile:** `cms/.htaccess` denies every `*.json` (correctly —
> it protects `db.json`). Google's app-link check fetches
> `/.well-known/assetlinks.json` and treats a 403 as "this app does not own this
> website". A `.htaccess` inside `.well-known/` is merged *after* its parent, so
> `Require all granted` there wins. That file ships in the ZIP.

---

## 3 · The keystore — the only irreversible step in this whole plan

```bash
keytool -genkeypair -v -keystore shivaa-upload-key.keystore \
  -alias shivaa -keyalg RSA -keysize 2048 -validity 10000
```

**Back it up twice, offline.** A USB stick in a drawer and one encrypted copy.
Lose this file and the app can never be updated again — not "it becomes
difficult", *impossible*. Google cannot reissue it, there is no recovery flow,
and the only remedy is a brand-new package name and a new store listing.

- Never commit it. `.gitignore` already blocks `*.keystore`, `*.jks`, `*.p12`,
  `*.pfx` and `playstore/twa/`.
- When you create the app in Play Console, choose **Play App Signing** and let
  Google hold the app signing key. You keep the upload key; Google holds the
  other half. Both fingerprints go into `assetlinks.json`.

---

## 4 · Build the bundle

```bash
# one time, on the machine that will hold the keystore
node -v                     # 18 or newer
npm install -g @bubblewrap/cli@^1.26

mkdir -p ~/shivaa-twa && cd ~/shivaa-twa
cp <repo>/playstore/twa-manifest.json .
cp ~/shivaa-upload-key.keystore .        # next to twa-manifest.json

bubblewrap fingerprint                   # prints the SHA-256 to publish
bubblewrap build                         # -> app-release-bundle.aab
```

`@bubblewrap/cli` 1.26's own template already sets `compileSdkVersion 36` and
`targetSdkVersion 36` — which is exactly what Play demands of every new app
since **31 August 2026** (Android 16). Nothing to patch.

Paste the fingerprint into **both** `playstore/assetlinks.json` and
`cms/.well-known/assetlinks.json`, deploy v183 again, then:

```bash
node <repo>/playstore/verify.mjs    # exit 0 = the kit is complete
```

`verify.mjs` checks 17 things offline: the manifest a TWA is built from, the
asset links, the TWA config, the graphics' exact dimensions, and that no
credential has crept into the repo. It exits **2** while it is still waiting on
you (fingerprints, screenshots) and **1** if something is actually wrong.

---

## 5 · Play Console

Create the app, then work down the checklist in `playstore/CHECKLIST.md`. The
copy to paste is in `playstore/listing.md`; the two URLs it asks for are:

- **Privacy policy:** `https://shivaa.in/#/privacy`
- **Account deletion:** `https://shivaa.in/#/delete-account`

### The declaration that needs a decision from you

The app has **user-generated content** — customers post product reviews
(`POST /api/reviews`). Play's rules then expect a way to *report* objectionable
content and evidence of moderation. There is no in-app report button today.
Either we build one (it is small — a `POST /api/reviews/report` route and a
button) or reviews come off the app's public surfaces until it exists. Do not
answer "no UGC" — the code says otherwise, and a wrong declaration is a
removal-risk, not a warning.

---

## 6 · Test it on a real phone before you upload anywhere

Internal testing is live within minutes and takes up to 100 testers. Install the
AAB and check, in this order:

- [ ] The app opens **full screen with no address bar**. That single observation
      proves Digital Asset Links worked; if you see a URL bar, stop and fix
      `assetlinks.json` before going further.
- [ ] Browse, open a product, read the price breakdown, add to cart.
- [ ] **Pay.** Run a real UPI payment through Cashfree inside the app and
      confirm you land back in the app with the order confirmed. This is the
      highest-risk part of a TWA and the one thing a browser tab will not prove.
- [ ] **Erase an account**: Account → Privacy and my data → send code → type
      DELETE. Confirm you are signed out everywhere and the row is anonymised
      (Admin → the customer list shows "Deleted customer").
- [ ] The footer "add to your phone" band does **not** appear inside the app —
      it correctly hides in standalone mode, so nobody is told to install what
      they already have.
- [ ] Rotate the phone, kill and reopen the app, turn the network off and on.
      The service worker should keep the shell alive.

---

## 7 · Release

- **Exempt account** → upload the AAB to **production**, countries: India to
  start, submit for review.
- **New personal account** → upload to **closed testing**, add 12+ real testers,
  keep them opted in for 14 continuous days, then *Apply for production access*.

Every later upload: bump `appVersionCode` in `playstore/twa-manifest.json`
(never reuse a number) and rebuild. The **content** of the app updates itself
through the normal `shivaa-update-vNNN.zip` release — the app is the website, so
a website release is an app release. Only a *native* change (icon, colours,
splash, package) needs a new AAB.

---

## What is deliberately not claimed here

- No AAB is built or signed in this repository: the sandbox has no JDK, no
  Android SDK and no route to `dl.google.com`. `bubblewrap build` runs on your
  machine, in step 4.
- No live site was probed while writing this. The sandbox cannot reach
  `shivaa.in`; the deploy and verification steps are yours to run.
- No screenshot was invented. `make-graphics.py` refuses to fabricate app UI and
  says so instead — capture them on a phone (`screenshots/CAPTURE.md`).
- Google's own app-link verification and Play's review are human steps. This kit
  gets you to the door with everything on the right side of it.
