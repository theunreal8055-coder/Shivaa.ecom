# DEPLOY-v247 — “Atelier” (ab premium jaisa *lagta* hai, na ki sirf tez)

**Package:** `shivaa-update-v247.zip` · **761 files** · **45,038,330 B** · sha256
`6ca456deaacfcf523f2f151e46b3b0700c0252c18387a6abe4d153e99e3214c5`
> **Commit:** `b4dbe47` · branch `arena/95be65a4-shivaa-ecom`
>
> **Yeh release:** v247 (v237 se v246 tak sab isme hai) · **Next number:** v248

---

## 1 · Aap theek keh rahe the — page “bhaari” lagta tha, dikhta nahi tha

v246 ne **wazan** kam kiya (5 MB photo → 1.5 MB). Lekin aapne kaha *“still doesn't feel good … premium
designer jaisa”*. Aap sahi the: **page par rehte hue bhi kaam ho raha tha** — decoration ke naam par, har
frame par. Ye teen cheezein app me padi hui thi:

| Problem | Kya ho raha tha |
|---|---|
| `will-change: transform` + `preserve-3d` **10 card types** par | Har card ka apna GPU layer, hamesha. Home par **23 layers**. Phone ka GPU memory aur har scroll frame ka kaam. |
| Card photo par **base `scale(1.08)`** | Har photo hamesha 8% badi karke dikhayi ja rahi thi → **soft/blurry** dikhti thi, aur resample hoti rehti thi. |
| `.pc-body{translateZ(10px)}` + hero par **24s ka infinite Ken Burns** | Card ke andar ka **text** ek alag layer par tha (sharp nahi), aur poori first screen hamesha animate ho rahi thi. |

**Ab:** home par **23 layers → 14** (aur wo 14 magnetic-buttons hain jinka phone par koi matlab nahi, wahan
bhi band), **3D elements 37 → 1**. Photo apne asli size par, crisp. Text seedha screen par. Hover ka lift
PC par wahi hai, phone par kuch nahi.

---

## 2 · Ek chhupa hua bug: photos **default me invisible** thi

v215 se har content photo `opacity:0` se shuru hoti thi, aur ek JS class aane par dikhti thi. Agar wo class
kisi bhi wajah se na aaye (cached photo, tab wapas khola, layer late load), **photo kabhi nahi dikhti** —
khaali frame. Ab ulta hai: photo **shuru se dikhti hai**, aur apne load hone par 240 ms me softly aati hai.
Chaaron taraf safety hai (4 second ka failsafe).

---

## 3 · Ab touch turant jawab deta hai

- Tap par **grey rectangle** (Android) — **band**.
- `touch-action: manipulation` — double-tap zoom ka **300 ms ka intezaar** khatam.
- Button/card press par **90 ms** me halka dabav, phir wapas.
- Keyboard se chalane par **gold focus ring** (accessibility bhi premium hoti hai).
- **iPhone par input focus karne par page zoom nahi hoga** (16px floor) — yehi sabse “sasta” lagne wala
  moment tha.

---

## 4 · Ek hi motion language

11 release se 11 easing aur 15 duration aa gayi thi — sab alag. Ab **5 token** (`--sx-*`), aur har animation
sirf **opacity/transform** par (koi layout property nahi). Headline **balanced** wrap hoti hai, price
**tabular numerals** me (rate tick par number sideways nahi hilta), route change par 240 ms ka halka rise,
aur `prefers-reduced-motion` sab band kar deta hai. `?nofx=1` is layer ko bhi band karta hai.

---

## 5 · First screen ab **0.7 second** me

v246 tak home screen gold-rate ka intezaar karti thi (worst case 6 second splash) — kyunki rate ke bina
price ₹0/₹NaN dikhta. Ab:

- agar catalogue phone me pehle se hai → **700 ms** me screen paint;
- price ki jagah ek **skeleton** (chamakta hua khaali slot, **kabhi ₹0 nahi, kabhi ₹NaN nahi**);
- rate aate hi price wahi apni jagah **bhar jaata** hai (patch, page dobara load nahi);
- cold device / deep link / baaki routes par **6 second** ka wahi ceiling.

---

## 6 · Do asli bug jo ginti ke dauraan mile

- Home ka **“Most loved right now”** strip aur **“Recently viewed”** strip **har card par ₹NaN** dikha raha
  tha. Wajah: API ka `price` ek object hai (`{metalValue, gst, total…}`), aur dono templates
  `Math.round(x.price)` kar rahe the. Ab dono wahi price path use karte hain jo grid use karta hai.
- Recently-viewed strip photo **original** file se la raha tha — ab thumb se.

---

## 7 · Wazan aur bhi kam

Campaign banner (**167 KB**) aur 9 film posters (**450 KB**) ke 560/320 webp bhi bana diye. Phone par home
screen ab **1.46 MB** photo markup (v245 par **5.11 MB** thi).

---

## 8 · Aapke liye check (3 minute, phone par pehle)

1. **Browser band karke dobara kholen** (purana `sw.js` phone me hai — ek baar hard reload zaroori).
2. Home khule — pehli screen **turant** aani chahiye, price ek pal me bhar jaayega.
3. **Scroll** karein — home, shop, category. Rukna nahi chahiye (v245 wala fix bhi yahin check ho jaata hai).
4. Kisi card par **tap** karein — turant jawab, grey flash nahi.
5. **Quick view** kholen — photo turant, dhundhli nahi.
6. Search/pincode field par tap karein — **iPhone par page zoom nahi hona chahiye**.
7. Kuch bhi bhaari lage to: `?perfdiag=1` ka **Copy report** + phone ka model bhej dein. Diagnostic:
   `window.Shivaa.v247.audit()` (layers, pictures, prices waiting). Kill switch: `?nofx=1`.

---

## 9 · Kya nahi badla

Route, price, gold rate, cart, checkout, payment, admin/seller panel, database — **kuch nahi chhua**.
Design ka koi hissa hataya nahi gaya (gold, gradient, shimmer, sheets, hero — sab wahi, sirf saaf aur
steady).

## 10 · Rollback

Isme v237–v246 sab hai, ek hi upload kaafi hai. Pichhla **kaam karta** build **v241**; v244 (jo phone tod
raha tha) par wapas na jaayein. Rollback = pichhli ledger row, usse peeche nahi.
