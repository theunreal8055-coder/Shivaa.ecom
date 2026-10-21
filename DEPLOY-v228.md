# DEPLOY-v228.md — Shivaa Ecom · v228 "The Play Store Gate"

**What the owner asked for:** *"Now let's launch the app on Play Store."*

**Status:** built, packaged, the whole QA gate green, pushed to `arena/e8a470c6-shivaa-ecom`.
**NOT live.** Live stays **v205** until the owner says yes. Next number after this one: **v229**.

This release is the **web half** of the Play launch — the three things Google checks on the
website side. The Android bundle itself cannot be built in this sandbox (no JDK, no Android SDK,
no route to `dl.google.com`); §5 is the exact recipe for your own machine, and §5.3 is what still
blocks the store even after that.

---

## 1 · What was actually broken for Play (not paperwork)

The launch kit in `playstore/` was written at v183. It is consistent — `node playstore/verify.mjs`
reports 15 pass / 0 fail — but three things were **not**:

| # | what the docs said | what the code did |
|---|---|---|
| 1 | "the in-app account erasure page is at `#/delete-account`" | **no page ever existed.** `POST /api/auth/delete-account` shipped at v183 and **nothing called it**; `#/delete-account` fell through the router to Home. The URL you would paste into Play Console opened the shop. |
| 2 | the TWA shortcut **"Ring size guide" → `#/size-guide`** | the sizer has always lived at `#/sizer`; `#/size-guide` opened nothing |
| 3 | (found by the route walk this release) | `holdRepeat` kept stepping a page that had been left — a removed button never receives `pointerup` — and the size page's `paint()` threw `Cannot read properties of null` four times in a 51-route walk |

Play's User Data policy requires **both** an in-app erase **and** a public URL that erases without
installing anything. Both are now the same page, and both are proven.

## 2 · The erasure page — what it does

`cms/js/app.js` → `pages['delete-account']` (alias `#/erase-account`):

- **signed out** (the public URL Play is given): the shopper types the 10-digit mobile, taps
  *Send code*, gets a 4-digit SMS, types it, types **DELETE**, and the account is erased. There is
  deliberately **no sign-in step** — nobody should have to log in in order to leave;
- **signed in**: the session is proof; one field (the word DELETE) and it is done;
- the page lists what is erased (name, mobile, email, addresses, wishlist, profile, every device)
  and what is kept with the name removed (invoices, hallmark and KYC records the law requires);
- the **server** is the only judge: the owner account and B2B partner accounts are refused, the code
  is single-use and burned on success, every device token for the account is dropped, and the row is
  anonymised. The page then shows the server's own message;
- a signed-in device **signs itself out** the moment the erase succeeds;
- the account screen now carries a **Privacy & my data** tile, so the route is reachable in-app;
- the sitemap lists the URL, so it can be crawled and checked.

**Proven end to end in jsdom** (new suite `qa/browser/t-v228-play.mjs`, 51 assertions): the refusal
without the word, the real code → real erase, then **old device token → 401**, **old email/password →
401**, and **the used code cannot erase a second time**. Plus the signed-in path, and that
`#/size-guide`, `#/rates` and `#/shop` all render (the three TWA shortcuts).

## 3 · Stamps and the bundle (this exact tree)

| place | value |
|---|---|
| `cms/index.html` | **32** × `?v=228`, `window.__SHIVAA_REL = 228` |
| `cms/sw.js` | **31** × `?v=228`, `shivaa-shell-v228`, `REL = 228` |
| `cms/js/app.js` | `APP_REL = 228` |
| `cms/api.php` | `'rel' => 228` |
| `cms/css/shivaa.css` | **unchanged** — 885,408 B raw / 175,338 B gzip · **62 layers / 62 blocks** · `VERIFY OK` ×2 · one `<link>` |

v228 adds **no new css/js layer** (the page lives in `app.js`), so the bundle, the cascade order and
the layer counts are exactly what v227 shipped. That is why the older suites' stamp numbers moved but
their layer counts did not.

## 4 · QA — the whole gate, serially, against this exact tree

| suite | result |
|---|---|
| `t-v228-play` | **51 / 0** — the page, the server's refusals, the store links, the live erase |
| `t-v227-blackcard` | 28 / 0 |
| `t-v227-reset` | 31 / 0 |
| `t-v227-design` | 41 / 0 |
| `t-v226-butter` | 61 / 0 |
| `t-v225-appfeel` | 80 / 0 |
| `t-v224-corners` | 64 / 0 |
| `t-v223-smooth` | 39 / 0 |
| `t-v222-bundle` | 36 / 0 |
| `t-v221-cleanup` | 34 / 0 |
| `t-v220-billing-gone` | 13 / 0 |
| `t-v219-depth` | 22 / 0 |
| `t-v218-sidebar` | 13 / 0 |
| `t-v209-alive` | 96 / 0 |
| `t-v206-flip` | all pass |
| `t7-audit` | **4 / 0** — all 51 routes render, 130 buttons clicked, **zero uncaught errors** |
| `node playstore/verify.mjs` | 15 pass / 0 fail / **2 warnings = the owner's two open items** (§5.3) |

## 5 · The Play launch — the honest order of operations

Nothing below can be done from this sandbox. Each line is either yours or needs a machine with a JDK.

### 5.1 Before anything: which Play account is this?

- **Personal account created after 13 Nov 2023** → Play requires a **closed test with 12 testers
  opted in for 14 continuous days** before *Apply for production access* even appears. Internal
  testing does not count. Realistic public launch: **~3 weeks from now, minimum**.
- **Organisation account** (D-U-N-S) → exempt.
- **Personal account from before that date with an app already live** → exempt.

### 5.2 Your machine (one time)

```bash
node -v                                   # 18+
npm install -g @bubblewrap/cli@^1.26
keytool -genkeypair -v -keystore shivaa-upload-key.keystore \
  -alias shivaa -keyalg RSA -keysize 2048 -validity 10000
mkdir -p ~/shivaa-twa && cd ~/shivaa-twa
cp <repo>/playstore/twa-manifest.json .
cp ~/shivaa-upload-key.keystore .
bubblewrap fingerprint                    # prints the SHA-256 — THIS ONE MATTERS
bubblewrap build                          # -> app-release-bundle.aab
```

**Back the keystore up twice, offline.** Lose it and the app can never be updated again — Google
cannot reissue it. It must never enter git (`.gitignore` already blocks `*.keystore`).

When you create the app in Play Console, choose **Play App Signing**; Google then holds the app
signing key and you keep the upload key. **Both** fingerprints go into the asset-links file.

### 5.3 The two open items `verify.mjs` is still waiting on

1. **Fingerprints.** Paste the upload-key SHA-256 **and** the Play-app-signing SHA-256 into **both**
   `playstore/assetlinks.json` and `cms/.well-known/assetlinks.json` (they must stay identical),
   redeploy the web tree, then check:
   ```bash
   curl -s https://shivaa.in/.well-known/assetlinks.json | head -20
   ```
   It must return the JSON — a **403** means `cms/.well-known/.htaccess` did not land.
2. **Screenshots.** Capture 2+ real phone screenshots (Play will not accept fewer) —
   `playstore/screenshots/CAPTURE.md`. The kit never fabricates app UI.

After both: `node playstore/verify.mjs` must exit **0** (today it exits **2** = "waiting on you",
not "broken").

### 5.4 The declaration that needs your decision — reviews

The app has **user-generated content**: customers post reviews (`POST /api/reviews`), and there is
**no in-app report button**. Play expects a report mechanism and evidence of moderation. Two honest
options:

- **A — reviews off in the app** until the report flow exists (no code, no risk), or
- **B — build it**: a `POST /api/reviews/report` route (rate-limited, admin-visible) plus a *Report*
  link on every review. Small, but it is PHP that cannot be syntax-checked in this sandbox, so it
  ships as its own release with its own tests.

Do **not** answer "no UGC" — the code says otherwise, and a wrong declaration is a removal risk.

### 5.5 Upload and test

1. Upload the AAB to **internal testing** (live in minutes, up to 100 testers).
2. Install and check, in this order: **full screen with no address bar** (that single observation
   proves the asset links), browse → product → price breakdown → cart, **a real UPI payment through
   Cashfree and the return into the app**, **erase an account** (Account → Privacy & my data →
   code → DELETE), the footer "add to your phone" band must be hidden, rotate/kill/reopen/offline.
3. **Exempt account** → upload to **production** (India to start). **New personal account** →
   closed test with 12+ real testers, 14 continuous days, then apply.

### 5.6 Everything after that is a web release

The Play app is a verified window onto `shivaa.in`. A `shivaa-update-vNNN.zip` deploy updates the
app's content — no new AAB. Only a **native** change (icon, colours, splash, package, shortcuts)
needs a rebuild and a bumped `appVersionCode` (never reuse a number).

## 6 · The package

**`shivaa-update-v228.zip`** at repo root — the whole `cms/` tree, paths relative to `cms/`.

- **357 files · 37,271,610 B**
- sha256 **`c9975a92f6498acfdff2f20b784e4be451bf9e072457e0ff3dc4582a2fedbab9`**
- extracted and `cmp`-ed **357/357** identical to this tree (including
  `.well-known/assetlinks.json`, `.well-known/.htaccess` and both shipped countdown docs);
- **no `qa/`**, **no `cms/data/db.json`**, no `.git`, no `DEPLOY-*`, no zips inside the zip.

Download:
`https://github.com/theunreal8055-coder/Shivaa.ecom/raw/arena/e8a470c6-shivaa-ecom/shivaa-update-v228.zip`

## 7 · How to deploy the web half

1. Back up the live tree the way you always do.
2. Upload the zip's contents over the site root.
3. Hard-refresh once, or let the service-worker banner move a returning phone to
   `shivaa-shell-v228`.
4. Confirm `?v=228` in the network tab, then:
   ```bash
   curl -s https://shivaa.in/api/version        # rel: 228, stamp.matched: true
   curl -s -o /dev/null -w '%{http_code}\n' https://shivaa.in/   # 200
   ```
5. Open `https://shivaa.in/#/delete-account` on a phone — the page must render (not Home).

**Rollback:** re-upload **`shivaa-update-v227.zip`** (357 files · 37,266,250 B · sha256
`c4cbf83d6efb06fc518a3882af9b6b8727a6dd1743e40ff5fe657602769ccc0f`) — or the v226 zip before that
(355 · 37,250,664 B · `602a519266efa2e51936c42a99d997dc3933209139a700fd7f9a4550a89ef463`). Never
restore an older tree over a newer one, and never reuse a release number.

## 8 · What the sandbox could not test

- **No AAB, no JDK, no Android SDK, no route to `dl.google.com`.** Nothing was compiled or signed here.
- **No real browser, no real phone, no real SMS, no PHP.** The erase flow is proven in jsdom against
  the local shim (same routes and status codes as `api.php`); `php -l` cannot run here, and
  `api.php` changed by one integer this release (`'rel' => 228`).
- **No live-site probe.** `shivaa.in` is unreachable from this sandbox, so the asset-links URL, the
  `.htaccess` merge and the Play Console checks are yours (§5.3).
- **The store review is a human process.** Nothing here can shorten a 12-tester / 14-day gate.
