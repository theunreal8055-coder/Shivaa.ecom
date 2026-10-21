# PUBLISH.md — AAB se Play Store par "Live" tak

Yeh page **publish** ka hai. Build ke liye `playstore/make-aab.sh`, aur
waqt ke hisaab se `playstore/TODAY.md` dekho. Yahan sirf woh hai jo upload ke
**baad** hota hai — aur woh teen jagah hai jahan app **reject** hoti hai.

---

## 0 · Ek zaroori baat pehle: v228 ki zip me fingerprints abhi **placeholder** hain

`shivaa-update-v228.zip` ke andar `.well-known/assetlinks.json` me abhi bhi
`REPLACE_WITH_…` likha hai. Yaani **live site Google ko bata rahi hai ki yeh app
uski nahi hai.** Isi ka natija:

- app me **URL bar** dikhega (full screen nahi),
- Play review me *"app sirf ek wrapped website hai"* ka risk.

Yeh ek hi file ka kaam hai — poora zip dobara nahi chadana:

```
public_html/.well-known/assetlinks.json      ← bas yeh ek file replace karni hai
```

Do fingerprint chahiye: **upload key** (aapke keystore ka) aur **Play App Signing**
(Play Console se, **pehli upload ke baad** milta hai). Dono ek command se:

```bash
node playstore/set-fingerprint.mjs "<upload-sha256>" "<play-signing-sha256>"
# repo ki DONO copies likh deta hai (kit + shipped), byte-identical
```

Phir `cms/.well-known/assetlinks.json` ko server par upload karo aur check karo:

```bash
bash playstore/verify-live.sh
# exit 0 = Google ka verifier khush. exit 2 = upar likha hai kya galat hai.
```

---

## 1 · Upload → publish ka poora rasta (5 stappen)

| # | kahan | kya | result |
|---|---|---|---|
| 1 | Console → **Testing → Internal testing** | AAB upload → *Start rollout* | minutes me install ho jata hai (100 testers tak) |
| 2 | Console → **Release → Setup → App signing** | **App signing key certificate SHA-256** copy karo | doosra fingerprint mil gaya |
| 3 | repo + server | `set-fingerprint.mjs "<upload>" "<play-signing>"` → `assetlinks.json` upload → `verify-live.sh` | app full-screen |
| 4 | phone | uninstall → opt-in link → install → §3 ki 8 checks | asli proof |
| 5 | Console → **Testing** | account ke hisaab se **Closed testing** ya **Production** | review |

**Rule:** step 3 ke bina step 5 mat karo. Review me asset links toota hua mila to
rejection ka sabse aam karan wahi hota hai.

---

## 2 · Kaunsa track, aur kya likhna hai

### Agar account **exempt** hai (organisation, ya 13 Nov 2023 se pehle ka personal)

Console → **Production → Create new release** → wahi AAB → release notes → **India** →
*Submit for review*. Pehla review aam taur par **1–7 din**.

### Agar **naya personal account** hai (13 Nov 2023 ke baad bana)

1. **Closed testing → Create new release** → AAB.
2. **Testers** tab → email list → **12+ asli log** (staff, parivaar, customers).
3. Sabko opt-in link bhejo; sab **14 lagatar din** opted-in rehne chahiye.
4. 14 din poore hone par *Apply for production access* button aata hai.
5. Approve hone par Production release.

Isse koi code, koi trick, koi support ticket nahi badal sakta. Marketing us date se
pehle mat karo.

---

## 3 · Phone par 8 checks (publish se pehle, sab zaroori)

- [ ] **Full screen, koi address bar nahi** — yahi asset links ka proof hai.
- [ ] Home → product → price breakdown → cart (price sahi, ₹ ek hi baar).
- [ ] **Asli UPI payment** Cashfree se → wapas **app me** aata hai → order confirm.
- [ ] Account → **Privacy & my data** → code → `DELETE` → account erase + logout.
- [ ] Footer "add to your phone" band **nahi** dikhta (standalone me chhupta hai).
- [ ] Rotate → app band → dobara kholo → airplane mode on/off (offline shell zinda).
- [ ] Product share → WhatsApp → link khulta hai.
- [ ] Back button: page ke andar peeche jata hai, app se bahar nahi.

---

## 4 · Console ke jawab (paste karne layak)

Poora copy `playstore/listing.md` me hai. Yahan woh 8 jawab hain jinme galti hoti hai:

| Console poochhta hai | jawab |
|---|---|
| App name / short description | `Shivaa Jewels` · `Handcrafted gold & silver jewellery from Jaipur, at live gold rates.` |
| Category / type / price | Shopping · App · Free |
| Privacy policy | `https://shivaa.in/#/privacy` |
| **Account deletion URL** | `https://shivaa.in/#/delete-account` (v228 se asli page hai) |
| Ads | **No** (koi third-party ad SDK nahi) |
| Target audience | **18+** |
| Financial features | **No** — payment gateway hai, lending/banking/investment nahi |
| Data safety | name, phone, email, address, order history collect hota hai; **encrypted in transit: yes**; **deletion: yes** (in-app page) |
| News / government / health app | No / No / No |
| **User-generated content** | **Yes** — customer reviews (§5 dekho) |

---

## 5 · UGC — woh ek declaration jo app gira sakta hai

App me **customer reviews** hain (`POST /api/reviews`), yaani UGC hai. Play UGC
policy do cheezein maangti hai: **report karne ka rasta** aur **moderation ka proof**.

Aaj sach yeh hai:

- moderation **hai** — admin panel se review hide/delete hota hai;
- par app me **"Report" button nahi** hai.

Teen honest raste:

| rasta | kya karna | risk |
|---|---|---|
| **A · Reviews abhi app se hatao** | product page se reviews section hide (ek chhota release) | 0 — lekin social proof kam |
| **B · Report button banao (recommended)** | `POST /api/reviews/report` (rate-limited, admin-visible) + har review par *Report* | 0 — Play ko dikhane layak mechanism |
| **C · "No UGC" declare karo** | — | **mat karo.** Code me reviews hain; galat declaration removal risk hai |

Agar B chahiye to bolo — main **v229** me bana dunga (api + UI + admin queue + tests),
aur woh release Play se pehle deploy ho jayegi. App TWA hai, isliye content update
Play upload ke bina chala jata hai.

---

## 6 · Review me kya reject hota hai (aur 1-line fix)

| rejection | asli wajah | fix |
|---|---|---|
| *"App is a wrapped website / not linked to your website"* | live assetlinks me placeholder ya galat fingerprint | §0 — dono fingerprint + `verify-live.sh` exit 0 |
| *"Broken functionality"* | reviewer ne OTP/payment tak nahi pahunch paya | **App access** me likho: guest browse, checkout ke liye OTP; test number do |
| *"Account deletion not available"* | purana tree (v205-v227) live tha | v228 live karo — `#/delete-account` page |
| *"Missing privacy policy"* | URL blank ya 404 | `https://shivaa.in/#/privacy` |
| *"Data safety mismatch"* | form me "no data collected" | §4 ki table bharo |
| *"UGC without reporting"* | §5 | A / B me se ek |
| *"Deceptive behaviour / permissions"* | manifest me extra permission | hum TWA hain, koi extra permission nahi — `bubblewrap` ka default hi rehne do |

Rejection aaye to **naya versionCode** banana padta hai (same code dobara nahi ja sakta):

```bash
node playstore/version-bump.mjs --status          # kya already gaya hai
node playstore/version-bump.mjs set <next>        # naya code
bash playstore/make-aab.sh                        # rebuild
```

---

## 7 · Publish ke baad

- **Content update = `shivaa-update-vNNN.zip` deploy.** Play upload nahi. App agli
  baar khulte hi naya site dikhata hai.
- **Naya AAB** sirf native change par (icon, splash, colour, package, shortcuts,
  permissions). Har baar:
  ```bash
  node playstore/version-bump.mjs --status
  bash playstore/make-aab.sh
  # upload ke baad:
  node playstore/version-bump.mjs uploaded production "v229 content"
  ```
- **Vitals:** Console → Quality → Android vitals. App Chrome hai, isliye crash
  aam taur par site ka JS error hota hai — woh web release se theek hota hai.
- **Ratings/reviews** Play par aate hain; in-app review prompt abhi nahi hai
  (chahe to v229 ke saath add kar sakte hain — Play In-App Review API TWA me chalti hai).

---

## 8 · Aaj ke commands (copy-paste)

```bash
# 0 · repo
cd <repo> && git pull

# 1 · kya ready hai
bash playstore/preflight.sh

# 2 · keystore (ek hi baar) + backup
bash playstore/make-aab.sh --init-key
cp ~/shivaa-upload-key.keystore /media/<usb>/

# 3 · build
bash playstore/make-aab.sh

# 4 · Play Console -> Internal testing -> AAB upload (UI)
node playstore/version-bump.mjs uploaded internal "first upload"

# 5 · dono fingerprint + live check
node playstore/set-fingerprint.mjs "<upload-sha256>" "<play-signing-sha256>"
#    cms/.well-known/assetlinks.json server par upload karo (ek file)
bash playstore/verify-live.sh          # exit 0 chahiye

# 6 · phone: uninstall -> opt-in link -> install -> §3 checks
```

---

## 9 · Yeh sandbox kya nahi kar sakta

- **AAB build/sign** — JDK, Android SDK aur `dl.google.com` nahi.
- **Play Console** — aapka login; credentials kabhi chat me nahi.
- **Live site probe** — `shivaa.in` yahan se reachable nahi; `verify-live.sh`
  aapke machine par chalega.
- **Screenshots** — asli phone se, kit jhooti UI nahi banati.
