# Shivaa Jewels — Play Store launch checklist

Tick these in order. Steps marked **[GATE]** can stop the launch dead — do not
skip them because "it's just a form".

## A · Before anything else (the two gates that decide whether today is possible)

- [ ] **[GATE] What kind of Play Console account is this?**
      A **personal** account created **after 13 November 2023** must run a
      closed test with **12 testers opted in for 14 continuous days** before
      Google will even show the *Apply for production access* button. That is
      roughly **3 weeks**, not today. An organisation account, or a personal
      account created before that date with an app already in production, is
      exempt. **Check this first** — it decides the whole plan.
- [ ] **[GATE] Is the developer account verified?** New accounts need identity
      verification (government photo ID + address + phone). Until it clears you
      can upload builds and fill the listing but cannot publish anywhere.
- [ ] Decide the package name. `in.shivaa.jewels` is the kit's default and it is
      **permanent**. If you want a different one, change it in all three files
      (`playstore/twa-manifest.json`, `playstore/assetlinks.json`,
      `cms/.well-known/assetlinks.json`) before the keystore exists.

## B · The web side (done in this repository — v183)

- [ ] Deploy **v183** to Hostinger (see `DEPLOY-v183.md`): backup → extract the
      ZIP → confirm `https://shivaa.in/api/version` reports `rel: 183` with
      `stamp.matched: true`.
- [ ] Confirm `https://shivaa.in/.well-known/assetlinks.json` returns the JSON
      (not a 403, not your site's HTML). This is the file Google fetches.
- [ ] Confirm `https://shivaa.in/#/delete-account` opens the erasure page.
- [ ] Confirm `https://shivaa.in/#/privacy` opens the privacy policy.

## C · The keystore (the one irreversible mistake)

- [ ] Generate the upload keystore on a machine you control:
      `keytool -genkeypair -v -keystore shivaa-upload-key.keystore -alias shivaa -keyalg RSA -keysize 2048 -validity 10000`
- [ ] **Back it up twice, offline** (a USB stick in a drawer + one encrypted
      copy). Lose it and the app can never be updated again — not "it's hard",
      *impossible*. There is no recovery, no support ticket, no exception.
- [ ] Never commit it. The repo's `.gitignore` already blocks `*.keystore`,
      `*.jks`, `*.p12`, `*.pfx` and `playstore/twa/`.
- [ ] When you create the app in Play Console, choose **Play App Signing** and
      let Google hold the app signing key. You keep the upload key.

## D · Build the app bundle

- [ ] Install Node 18+, a JDK 17, and the Android SDK command-line tools.
- [ ] `npm install -g @bubblewrap/cli@^1.26` (its template already compiles and
      targets **API 36**, which Play requires of every new app since 31 Aug 2026).
- [ ] `mkdir -p ~/shivaa-twa && cd ~/shivaa-twa`
- [ ] Copy the kit in: `cp <repo>/playstore/twa-manifest.json .`
- [ ] Put the keystore next to it as `shivaa-upload-key.keystore`.
- [ ] `bubblewrap fingerprint` → copy the SHA-256 it prints.
- [ ] Paste that fingerprint into `playstore/assetlinks.json` **and**
      `cms/.well-known/assetlinks.json` (both slots: upload key + Play App
      Signing key), deploy v183 again, then verify the URL returns it.
- [ ] `bubblewrap build` → produces `app-release-bundle.aab`.
- [ ] `node <repo>/playstore/verify.mjs` → must exit 0.

## E · Play Console — app creation and store listing

- [ ] Create the app: name `Shivaa Jewels`, default language English (India),
      type **App**, category **Shopping**, price **Free**.
- [ ] Store listing: paste the copy from `playstore/listing.md`.
- [ ] Upload the app icon (512x512) and the feature graphic (1024x500).
- [ ] Upload 2 to 8 phone screenshots — `playstore/screenshots/CAPTURE.md`
      explains exactly which screens to capture and how to frame them.
- [ ] Contact details: `Support@shivaa.in`, `+91 89050 05921`.
- [ ] Privacy policy URL: `https://shivaa.in/#/privacy`.

## F · App content (the declarations)

- [ ] Account deletion URL: `https://shivaa.in/#/delete-account`.
- [ ] Ads: none.
- [ ] Content rating questionnaire — **declare user-generated content** (reviews).
      See the UGC note in `playstore/listing.md`.
- [ ] Target audience: 18+.
- [ ] Data safety form: fill from the table in `playstore/listing.md`.
- [ ] News app: no. Government app: no. Health: no. Financial features: no.
- [ ] **[GATE] Decide on UGC reporting before you answer the questionnaire
      honestly** — either add a report button or accept that reviews must come
      out of the app's public surfaces.

## G · Release

- [ ] **Internal testing** first: upload the AAB to the internal track (up to
      100 testers, live in minutes). Install it on a real Android phone.
- [ ] On that phone, verify — this is the acceptance that matters:
      - the app opens full-screen with no browser address bar (that alone proves
        Digital Asset Links worked);
      - browse, open a product, add to cart;
      - **pay**: run a real UPI payment through Cashfree inside the app and
        confirm the return-to-app works;
      - **erase an account** through Account → Privacy and my data;
      - the footer "add to your phone" band does not appear (it correctly hides
        in standalone mode).
- [ ] Only then pick the track:
      - **exempt account** → production;
      - **new personal account** → closed testing with 12+ testers, 14 days,
        then apply for production access.
- [ ] Countries: start with India, add more later.
- [ ] Submit for review. First reviews of new accounts commonly take a few days.

## H · After it is live

- [ ] Keep the PWA and the app in step: the app is the website, so every
      `shivaa-update-vNNN.zip` release updates the app's content too, with no
      Play upload. Only a *native* change (icon, colours, package) needs a new
      AAB.
- [ ] Bump `appVersionCode` for every AAB you upload. Never reuse one.
- [ ] Watch the Play Console vitals (crashes, ANRs) — the app is Chrome, so
      they will usually be the site's own JS errors.

## The honest version of "launching today"

You can **have a working, installable, signed app today** and be on the store
the same day *if* your developer account is exempt from the closed-testing rule.
If it is a new personal account, the app can be built, uploaded and installed by
you and your staff today — but **public listing is 14 days of closed testing +
review away**, and nothing in this repository can shorten that. Plan the
marketing around the date Google actually gives you.
