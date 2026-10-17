# TODAY.md — "aaj hi Play Store par update" ka seedha jawab

**Sach pehle:** Play Store par woh cheez "aaj" nahi hoti jo Google ke haath me hai.
Jo aapke aur mere haath me hai, woh aaj ho sakta hai — aur neeche usi ka
time-table hai. Har line ke saath likha hai **kaun** karega.

---

## 0 · "Update" ke teen matlab — teeno ka jawab alag hai

| kya | kya chahiye | aaj? |
|---|---|---|
| **A · App ka content update** (naye products, v228 ka erasure page, design fixes) | sirf website par `shivaa-update-v228.zip` deploy | **HAAN — 10 minute.** App website hi hai; agli baar khulte hi naya content. Play upload ki zaroorat nahi. |
| **B · Play par build daalna / naya AAB** | keystore + AAB + upload | **HAAN — ~90 minute**, agar keystore ban gaya. Aaj hi internal testing par phone me install ho jayega. |
| **C · Public "Update"/"Install" button sabke liye** | Google ka review | **Aapke account type par.** Exempt account → aaj submit, 1–7 din me live. Naya personal account → 12 testers × 14 din, phir production. Isse koi bypass nahi kar sakta. |

> Agar app **pehle se Play par live hai** (pichhli baar upload hua tha), to "update"
> ka matlab sirf **B** hai: naya AAB (versionCode badha kar) → review → update live.
> Aaj ka content fir bhi **A** se turant chala jayega.

---

## 1 · Aaj ka time-table (T-0 se T+2h)

Har step ke baad agla step tabhi, jab pichhla ho jaye.

| samay | kaam | kaun |
|---|---|---|
| **T-0 · 10 min** | **v228 live karo** — `shivaa-update-v228.zip` upload (backup → extract) → `curl https://shivaa.in/api/version` me `rel: 228` | aap |
| **T-10 · 2 min** | Browser me `https://shivaa.in/#/delete-account` kholo — page aaye (home nahi) | aap |
| **T-12 · 5 min** | `bash playstore/preflight.sh` — jo `[FAIL]/[todo]` aaye, wahi bacha kaam | aap |
| **T-17 · 3 min** | `bash playstore/make-aab.sh --init-key` — keystore banta hai. **Do jagah backup** | aap |
| **T-20 · 10–25 min** | `bash playstore/make-aab.sh` — pehli baar JDK + Android SDK download hote hain, isliye thoda lamba. AAB ban jata hai | aap |
| **T-45 · 5 min** | `bubblewrap fingerprint` (ya script ka output) → SHA-256 note karo | aap |
| **T-50 · 10 min** | Play Console → Create app (agar pehli baar) → Internal testing → AAB upload → rollout | aap |
| **T-60 · 5 min** | Testers me apna Gmail → opt-in link phone par → install | aap |
| **T-65 · 10 min** | Phone par 5 checks (§4) | aap |
| **T-75 · 2 min** | `node playstore/version-bump.mjs uploaded internal "first upload"` | aap |
| **T-77 · 5 min** | `node playstore/set-fingerprint.mjs "<upload>" "<play-signing>"` → **sirf** `.well-known/assetlinks.json` server par upload → `bash playstore/verify-live.sh` → phone par **address bar gayab** | aap |
| **T+90** | Closed testing (12 testers) ya Production submit — account type ke hisaab se | aap |

**Yahan main kya kar sakta hoon:** script, kit, checks, docs — sab taiyaar hain.
**Jo main nahi kar sakta:** AAB build (is sandbox me JDK/Android SDK nahi, `dl.google.com`
blocked), Play Console (aapka login), aur aapke phone ke screenshots.

---

## 2 · Do cheezein jo aaj bhi ruk sakti hain (aur unka toDaa)

1. **Screenshots (2+) — sirf phone se.** Play 2 se kam accept nahi karta.
   `playstore/screenshots/CAPTURE.md` me kaunse 5 screen aur frame kaise, sab likha hai.
   **5 minute ka kaam** — home, product page, gold rate, black card, cart.
   Ye aaj hi ho sakta hai; isliye ye "kal" ka bahana nahi hona chahiye.
2. **Dusra fingerprint (Play App Signing) — pehli upload ke BAAD milta hai.**
   Isliye order hai: AAB upload → Console `App signing` se SHA-256 → dono fingerprint
   ek command se. Us se pehle app browser-bar ke saath khulega — **ye normal hai**,
   galti nahi.

---

## 3 · Screenshots ka jhhatpat tareeka (5 min)

1. `shivaa-update-v228.zip` live hone ke baad, phone par `https://shivaa.in` kholo.
2. Chrome menu → **Add to Home screen** → icon se kholo (address bar nahi dikhega).
3. Ye 5 screenshots lo (power + volume-down):
   `#/` (home) · ek product page · `#/rates` · `#/black-card` · `#/cart`
4. File names: `playstore/screenshots/01-home.png`, `02-product.png`, …
   (min 320 px, max 3840 px — phone ke normal shots isi range me hote hain).
5. `node playstore/verify.mjs` → G03 PASS ho jayega.

---

## 4 · Phone par 5 checks (T-65)

- [ ] App **full screen** khulta hai, **koi address bar nahi** (yahi asset-links ka proof)
- [ ] Product → price breakdown → cart
- [ ] **Asli UPI payment** Cashfree se, aur wapas app me
- [ ] Account → **Privacy & my data** → code → `DELETE` → account erase
- [ ] Footer ka "add to your phone" band **nahi** dikhta

---

## 5 · Track ka faisla (T+90)

| account | kya karo | kab live |
|---|---|---|
| Organisation account / 13 Nov 2023 se pehle ka personal | **Production**, India | review 1–7 din |
| 13 Nov 2023 ke baad bana personal account | **Closed testing**, 12 testers, 14 lagatar din → *Apply for production* | ~3 hafte |

Ye date Google ke rule se hai, kisi code se nahi badalti. Marketing us date ke hisaab se.

---

## 6 · Aaj ke commands, ek jagah

```bash
# 0 · repo me, ek baar
cd <repo>

# 1 · kit ka health
bash playstore/preflight.sh

# 2 · keystore (ek hi baar zindagi me) + backup
bash playstore/make-aab.sh --init-key
cp ~/shivaa-upload-key.keystore /media/<usb>/      # + encrypted copy

# 3 · AAB
bash playstore/make-aab.sh

# 4 · Play Console me upload (UI) — phir:
node playstore/version-bump.mjs uploaded internal "first upload"

# 5 · dono fingerprint (upload + Play App Signing)
node playstore/set-fingerprint.mjs "<upload-sha256>" "<play-signing-sha256>"
#    -> web tree dobara deploy, phone par app uninstall/reinstall

# 6 · kabhi bhi status
node playstore/version-bump.mjs --status
node playstore/set-fingerprint.mjs --status
node playstore/verify.mjs
```

---

## 7 · Jo galat ho sakta hai (aur 10-second fix)

| error | matlab | fix |
|---|---|---|
| `You need to use a different version code` | wahi code dobara | `node playstore/version-bump.mjs set <next>` → rebuild |
| app me address bar | assetlinks verify nahi hua | `curl https://shivaa.in/.well-known/assetlinks.json` — JSON aana chahiye; dono fingerprint; app uninstall/reinstall |
| assetlinks par **403** | `.well-known/.htaccess` nahi pahuncha | `playstore/htaccess-wellknown.txt` ka block site `.htaccess` me jodo |
| `App not installed` | tester list/account galat | opt-in link **usi** Gmail se kholo |
| bubblewrap: `Java not found` | JDK nahi | `bubblewrap build` khud download karne de, ya JDK 17 install |
| `#/delete-account` home khulta hai | live tree v228 se purana | v228 deploy karo |

---

## 9 · Publish (upload ke baad ka rasta)

Poora rasta — internal → closed → production, review ke 7 rejection aur unke fix —
`playstore/PUBLISH.md` me hai. Sabse zaroori line: **assetlinks fix ke bina
production submit mat karo**, aur UGC declaration se pehle §5 ka faisla lo.

## 8 · Aaj ke baad

- Content badalna = **zip deploy**. Play upload nahi.
- Naya AAB sirf **native** change par (icon, splash, colour, package, shortcuts) —
  har baar `version-bump.mjs uploaded …` se pehle code badhao.
- `playstore/uploads.json` git me commit hota hai — **wahi** record hai ki kaunsa
  versionCode ja chuka hai. Isi liye galti se reuse nahi hota.
