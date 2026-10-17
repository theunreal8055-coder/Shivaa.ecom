# UPLOAD-STEPS.md — uploading Shivaa Jewels to Google Play, in order

This is the **linear walkthrough**: every command, every Play Console screen, in the
order that actually works. For a same-day push, `playstore/TODAY.md` is the
time-boxed version; the wrappers are `bash playstore/preflight.sh` (checks six
things that burn an hour), `bash playstore/make-aab.sh` (build) and
`node playstore/version-bump.mjs` (records the upload, guards the code). The wider plan is `playstore/README.md`; the tick-box
version is `playstore/CHECKLIST.md`; the words to paste are `playstore/listing.md`.

**One sentence of context:** the app is a **Trusted Web Activity** — a verified,
full-screen window onto `shivaa.in`. There is no second codebase. A website
release (`shivaa-update-vNNN.zip`) updates the app's content; only a *native*
change (icon, splash, colours, package, shortcuts) needs a new Android bundle.

---

## 0 · Who does what

| already done in this repository | only you can do |
|---|---|
| TWA build config (`playstore/twa-manifest.json`, package `in.shivaa.jewels`) | the Play Console account + identity verification |
| the web manifest, maskable icons, shortcuts | the **keystore** (and its backup) |
| the account-erasure page `#/delete-account` (v228) | the **fingerprints** (§4) |
| asset-links file + its `.htaccess` guard | the **screenshots** (§6) |
| store copy, data-safety answers, graphics | building the AAB (§3) and uploading it (§8) |
| `playstore/verify.mjs` (17 offline checks) | the UGC declaration decision (§7.5) |

**Two facts that decide your calendar** (both in `playstore/README.md` §1):

1. A **personal** Play account created **after 13 Nov 2023** must run a closed test
   with **12 testers opted in for 14 continuous days** before production access is
   even offered. Public launch ≈ **3 weeks**. An **organisation** account, or a
   personal account from before that date with an app already live, is exempt.
2. A new account needs **identity verification** (ID + address + phone) before it
   can publish to any track. Uploading and filling forms works meanwhile.

---

## 1 · The website must be live FIRST — at v228, never v183

Google fetches `https://shivaa.in/.well-known/assetlinks.json` and Play asks you for
`https://shivaa.in/#/delete-account`. Both must exist on the live domain before the
app is worth testing.

> **Forward-only:** the old kit says "deploy v183". Do **not**. Live is v205; the
> newest release is **v228** (`DEPLOY-v228.md`), and deploying an older tree over a
> newer one is a revert — forbidden.

1. Deploy `shivaa-update-v228.zip` per `DEPLOY-v228.md` §7 (backup → upload → hard refresh).
2. Check, from any terminal:

```bash
curl -s https://shivaa.in/api/version                    # rel: 228, stamp.matched: true
curl -s https://shivaa.in/.well-known/assetlinks.json    # must be the JSON, not HTML
curl -s -o /dev/null -w '%{http_code}\n' https://shivaa.in/   # 200
```

3. On a phone open `https://shivaa.in/#/delete-account` — the page must ask for a
   mobile number (if it opens the shop, the deploy did not land).

**A 403 or an HTML page instead of the JSON** means `cms/.well-known/.htaccess` did
not land — see `playstore/htaccess-wellknown.txt`.

---

## 2 · The keystore — the one irreversible step

On a machine you control (not this sandbox, not a borrowed laptop):

```bash
keytool -genkeypair -v -keystore shivaa-upload-key.keystore \
  -alias shivaa -keyalg RSA -keysize 2048 -validity 10000
```

- **Back it up twice, offline** (USB in a drawer + one encrypted copy). Lose it and
  the app can never be updated again — Google cannot reissue it, there is no
  support path, only a new package name and a new listing.
- It must never enter git. `.gitignore` already blocks `*.keystore`, `*.jks`,
  `*.p12`, `*.pfx` and `playstore/twa/`.

---

## 3 · Build the bundle (AAB)

You need **Node 18+**, a **JDK 17** and the **Android SDK command-line tools**.
Bubblewrap can download and manage the last two itself on first run.

```bash
node -v                                   # must be 18 or newer
npm install -g @bubblewrap/cli@^1.26

mkdir -p ~/shivaa-twa && cd ~/shivaa-twa
cp <repo>/playstore/twa-manifest.json .
cp ~/shivaa-upload-key.keystore .         # same folder, same name as the manifest says

bubblewrap build                          # answers "yes" to downloading the SDK/JDK
# -> app-release-bundle.aab
```

- `@bubblewrap/cli` 1.26's template compiles and targets **API 36**, which Play
  requires of every new app since **31 Aug 2026**. Nothing to patch.
- `bubblewrap build` also produces `app-release-signed.apk` — useful for a quick
  side-load test, **not** for the store. Play takes the **`.aab`**.

---

## 4 · Fingerprints — the step that decides "full screen" or "browser bar"

There are **two** fingerprints, and both go in the file, or Play says *"your app is
not linked to your website"*:

| fingerprint | where it comes from |
|---|---|
| **upload key** | `bubblewrap fingerprint` (prints it), or `keytool -list -v -keystore shivaa-upload-key.keystore` |
| **Play app signing key** | Play Console → your app → **Release → Setup → App signing** (this exists only **after** the first upload, or when you enable Play App Signing) |

Because the Play signature only exists after the first upload, do it in two passes:

**Pass 1 — get the app into Play at all**

```bash
bubblewrap fingerprint        # copy the SHA-256 it prints
```

```bash
node playstore/set-fingerprint.mjs --status        # shows the two slots
node playstore/set-fingerprint.mjs "<upload-sha256>" "<upload-sha256>"   # see note
```

> The helper refuses two *identical* fingerprints on purpose (Play App Signing
> means two different keys). On pass 1, before Play has shown you its key, either
> wait for pass 2 and set both at once, or paste only the upload key by hand into
> both files. **Pass 2 is the one that matters** — the app is usually tested only
> after it.

**Pass 2 — after the first upload**

1. Play Console → **App signing** → copy the **app signing key certificate SHA-256**.
2. `node playstore/set-fingerprint.mjs "<upload-sha256>" "<play-signing-sha256>"`
   — this writes **both** `playstore/assetlinks.json` and
   `cms/.well-known/assetlinks.json`, byte-identically (the file Google fetches is
   the shipped copy; editing only one is the classic mistake).
3. Redeploy the web tree (the file is inside the zip), then:

```bash
curl -s https://shivaa.in/.well-known/assetlinks.json | head -20
```

4. Uninstall the app, reinstall from the internal-testing link, open it: **no
   address bar** = asset links verified.

`node playstore/verify.mjs` must exit **0** before you go further (it exits **2**
while fingerprints or screenshots are still missing — that is "waiting on you",
not "broken").

---

## 5 · Create the app in Play Console

1. <https://play.google.com/console> → **Create app**.
2. Name **Shivaa Jewels**, default language **English (India)**, type **App**,
   **Free**, accept the declarations.
3. Package name is fixed by the AAB (`in.shivaa.jewels`) — it is permanent.
4. Fill **Dashboard → Set up your app**: privacy policy URL, app access, ads,
   content rating, target audience, data safety — the exact answers are in
   `playstore/listing.md` §App content.
5. **Store listing** → paste title / short / full description from
   `playstore/listing.md`; upload the assets from §6 below.
6. **App access**: the shop is browsable without an account; checkout needs OTP.
   Say so and give the reviewer a demo number if you have one.

---

## 6 · Store listing assets

| asset | spec | where it is |
|---|---|---|
| App icon | 512×512 PNG, no transparency | `playstore/graphics/out/icon-512.png` |
| Feature graphic | 1024×500 | `playstore/graphics/out/feature-graphic-1024x500.png` |
| Phone screenshots | 2–8, portrait, min 320 px | **you capture them** — `playstore/screenshots/CAPTURE.md` |
| Tablet shots | optional | same |

The kit refuses to invent app UI. `playstore/graphics/make-graphics.py` regenerates
the icon and the feature graphic from the real brand art if you change the design.

---

## 7 · App content — the forms, and the one decision that is yours

1. **Privacy policy:** `https://shivaa.in/#/privacy`
2. **Account deletion:** `https://shivaa.in/#/delete-account`
   (this URL only works because v228 added the page — before that it opened Home)
3. **Ads:** none. **News app / government app / health:** no.
4. **Content rating questionnaire:** declare that the app contains **user reviews**
   (user-generated content).
5. **UGC — decide before you answer.** Customers post reviews
   (`POST /api/reviews`) and there is **no in-app report button**. Play expects a
   report mechanism and evidence of moderation. Two honest options:
   - **A.** reviews come off the app's public surfaces until the report flow exists (no code, no risk);
   - **B.** build `POST /api/reviews/report` (rate-limited, admin-visible) + a *Report*
     link on every review, as its own release with its own tests.
   **Do not** answer "no UGC" — the code says otherwise, and a wrong declaration is
   a removal risk, not a warning.
6. **Data safety:** fill from the table in `playstore/listing.md` (account data,
   order/address, payment handled by Cashfree; encrypted in transit; deletion by
   request — the in-app page is what satisfies it).

---

## 8 · Upload the AAB

1. Play Console → **Testing → Internal testing** → **Create new release**.
2. Upload `app-release-bundle.aab`. Play reads the version code (`1`) and name (`1.0.0`).
3. Release notes: one line is fine.
4. **Review release → Start rollout to Internal testing.**
5. **Testers** tab → create an email list (your own account first) → copy the
   **opt-in link** → open it on the phone with the same Google account → install.
6. Internal testing is live in minutes and takes up to 100 testers.

> If Play says *"You need to use a different version code"*, the code was used
> before. Bump `appVersionCode` in `playstore/twa-manifest.json` and rebuild —
> **never reuse** one.

---

## 9 · Test on the phone (this is the acceptance)

- [ ] The app opens **full screen, no address bar** — that one observation proves
      the asset links (§4).
- [ ] Browse → product → price breakdown → cart.
- [ ] **Pay:** a real UPI payment through Cashfree, and the return **into the app**.
      This is the highest-risk part of a TWA and the thing a browser tab cannot prove.
- [ ] **Erase an account:** Account → *Privacy & my data* → send code → type
      `DELETE` → signed out everywhere, then sign-in with the old number fails.
- [ ] The footer "add to your phone" band **does not** appear (correct in standalone).
- [ ] Rotate, kill and reopen, airplane mode on/off — the offline shell survives.
- [ ] Share a product to WhatsApp from inside the app; the link opens the piece.

Only after every line above: choose the track (§10).

---

## 10 · Release track

| account | track |
|---|---|
| organisation, or personal from before 13 Nov 2023 with a live app | **Production**, countries: India first, submit for review |
| new personal account | **Closed testing** → 12+ real testers → **14 continuous days** opted in → *Apply for production access* |

First reviews of new accounts commonly take a few days. Marketing goes out on the
day Google actually publishes, not before.

---

## 11 · When something goes wrong

| symptom | cause | fix |
|---|---|---|
| app opens **with a URL bar** | asset links not verified | check `.well-known/assetlinks.json` returns JSON **and** contains **both** fingerprints; redeploy; uninstall/reinstall (verification is cached) |
| `assetlinks.json` returns **403** or HTML | `.well-known/.htaccess` did not land | paste the block from `playstore/htaccess-wellknown.txt` at the end of the site `.htaccess` |
| Play: *"app is not linked to your website"* | same as above, or the Play signing key is missing | run §4 pass 2 |
| *"You need to use a different version code"* | code reused | bump `appVersionCode`, rebuild |
| *"App not installed"* on the tester phone | tester not on the list, or wrong Google account | open the **opt-in link** with the invited account first |
| Bundle rejected: target SDK too low | old bubblewrap | `npm i -g @bubblewrap/cli@^1.26` (API 36) |
| Payment returns to the browser, not the app | Cashfree redirect not allowed in the TWA | capture the exact step and the URL it lands on; that is a Cashfree/manifest change, not a store one |
| `#/delete-account` opens Home | the live tree is older than v228 | deploy v228 (forward-only) |

---

## 12 · After it is live

- **Content updates need no Play upload** — deploy `shivaa-update-vNNN.zip` as usual.
  The app shows the new site on the next launch.
- **A new AAB** is only for native changes (icon, splash, colours, package,
  shortcuts, permissions). Each upload: bump `appVersionCode`, rebuild, new release.
- Watch **Play Console → Quality → Android vitals**; the app is Chrome, so crashes
  are almost always the site's own JS errors — fix them in a web release.

---

## 13 · What cannot be done from the agent's sandbox

- **No AAB** — no JDK, no Android SDK, no route to `dl.google.com`.
- **No Play Console access** — no credentials, and none should ever be pasted into chat.
- **No live probe of `shivaa.in`** — unreachable from here; §1 checks are yours.
- **No `php -l`** — PHP is not installed here; `api.php` changed by one integer in v228.

Everything else in the kit is verified offline by `node playstore/verify.mjs`
(the manifest, the asset links, the TWA config, the graphics' exact pixel sizes, and
that no credential has crept into the repo).
