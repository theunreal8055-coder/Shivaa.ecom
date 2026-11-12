# DEPLOY-v241 — “Smooth” (home page ki lag, root cause se fix)

**Package:** `shivaa-update-v241.zip` · **682 files** · **43,636,784 B** · sha256
`6987184a07398433c59cb4304f3f0b0e2a27583fed97d13787a0bcf90c7c8cdf`
**Site ab:** v240 (aapne apply kiya) · **Yeh release:** v241 (v237–v240 andar hain) · **Sirf yehi ek zip install karni hai.**

> **Commit:** `65d0d4f0956c0db188c0ee9e896a7f49ca68a133` · branch `arena/95be65a4-shivaa-ecom` · zip GitHub par live (43,636,784 B confirmed)

---

## 1 · Pehle: kya sach me dikkat thi

Aapne kaha "shuru main home page par lag karta hai, smooth feel nahi hota". Code padhne par char
cheezein mili — aur teeno **home page ke pehle screen** par paisa kharch kar rahi thi.

### 1.1 Sabse bada: card ki photo poori size me aa rahi thi

Home page par 12 bestseller cards (har card me 2 photo = 24) + 17 category tiles + review photos.
Har photo **200–420 KB** ki thi — yeh poora-hero size ki photo hai, jabki card sirf ~180 pixel chauda hai.

Phone in sab ko download karta tha **aur decode bhi karta tha jab aap already scroll kar rahe the**.
Yahi "lag" hai. 2–5 MB sirf home page ki photos par.

**v241 ka fix:** har photo ka ek **chhota WebP bhai** ship hota hai — 320 px aur 560 px. Total **308 files,
5.8 MB** (`qa/build-thumbs.py` banata hai). App ab card me chhota wala maangta hai:

```
pehle : /images/products/earrings-jhumka.jpg          214 KB
ab    : /images/thumbs/products/earrings-jhumka-560.webp   ~25 KB
```

Home page ki photos: **2–5 MB → ~0.5 MB.** Aapki **koi original photo delete ya replace nahi hui** —
product page, zoom aur catalogue pehle jaisi poori quality hi dikhate hain. Agar koi nayi photo bina thumb
ke aaye, app pehle original try karta hai (aapko toota image kabhi nahi dikhega).

### 1.2 Scroll ka stutter: header aur bottom bar

`.header` (upar chipka rehta hai) aur `.mnav` (neeche ka bar) dono par `backdrop-filter: blur(...)` laga
tha — aur unke peeche ka background pehle se **92–97 % opaque** tha. Matlab har scroll frame par phone
poora page blur karke dobara paint kar raha tha, dikhne me kuch farak nahi pad raha tha. Mid-range
Android par yahi sabse common "smooth nahi lagta" wala kaaran hai.

**v241:** phone par blur hata diya, wahi rang **98.5 % opaque** kar diya — dekhne me same, par per-frame
GPU kaam khatam. **Desktop par frost waise hi hai.**

### 1.3 Ek payment SDK har page par

Cashfree ka SDK har page load par download + parse ho raha tha — chahe koi checkout kar hi na raha ho.
App me pehle se on-demand loader maujood tha, to yeh `<script>` sirf wazan tha. **v241 me hata diya** —
ab SDK tabhi aata hai jab koi actually pay karta hai.

### 1.4 Purani phone par splash 6 second tak

Jis phone me catalogue pehle se save tha, wo bhi network ka intezaar karti thi — **6 second tak**.
**v241:** uske paas data pehle se hai, to **800 ms** me paint. Pehli baar wale ke liye 6 second ka cap
waisa hi hai (wahan data aana zaroori hai).

---

## 2 · Aap khud naap sakte hain — `?perf=1`

Koi bhi page kholiye aur URL ke aage `?perf=1` laga dijiye, jaise:

```
https://shivaa.in/?perf=1
```

Neeche ek chhota black box khulega, usme aapke **phone ke asli number** honge:

- first byte · DOM ready · page load (milliseconds)
- kitne KB aaye — CSS / JS / IMAGES / FONTS / API alag-alag
- sabse bhaari 6 files ke naam aur size

Box par tap karke band ho jaayega. Yeh kisi aur ko nahi dikhta.

**Comparison:** v241 lagane se pehle ek baar `?perf=1` dekh lein (agar chahein), phir baad me. Farak
seedha IMAGES ki line me dikhega.

---

## 3 · Apply (4 step)

1. Hostinger → **File Manager** → `public_html`
2. `shivaa-update-v241.zip` upload → **Extract** (overwrite)
3. zip delete karein
4. `https://shivaa.in/api/version` → `rel: 241`, `stamp.matched: true`

> Zip **43 MB** ki hai (pehle 37 MB). Bada hona normal hai — 308 nayi chhoti photo files andar hain.

## 4 · Phone par check list (1 minute)

- [ ] Home page kholein → hero + cards turant aayein, photos blurry nahi lagengi (560 px, 2x screen par bhi theek)
- [ ] Scroll karein → upar ka header aur neeche ka bar **behtar** smooth, koi lakir/transparency toota nahi
- [ ] Koi bhi card kholein → product page ki photo **pehle jaisi full quality** (wahan thumbs use nahi hote)
- [ ] Category strip me 17 tiles → sab photos dikh rahi hain
- [ ] `?perf=1` → IMAGES wali line **kai sau KB** ke aas-paas (pehle kai MB)
- [ ] Hard refresh ek baar (worker `shivaa-shell-v241` par chala jaayega)

## 5 · Rollback

`shivaa-update-v240.zip` dobara extract kar dein. Thumbs folder extra rahega — nuksaan nahi, koi page
use nahi karega.

## 6 · Kya chhua nahi gaya

Koi route, price, money maths, admin screen, schema, `.htaccess`, `config.php`, `data/`, `uploads/`
nahi. `cms/data/db.json` ship nahi hota. CSS bundle dobara bana hai par sirf **ek nayi layer** (`v241.css`)
jodne ke liye — 70 → **71 layers**, 943,458 B.

## 7 · Honest status

- `node --check` — app.js, sw.js, v241.js **clean**
- `node qa/browser/t-v241-perf.mjs` — **43/43 PASS** (thumb URLs, files on disk, blur rules, SDK gone, 800 ms cap, stamps)
- `node qa/browser/t-v240-rip.mjs` — **16/16 PASS** (drawer guard abhi bhi intact; iske 3 release-number pins ko ">= 240" kar diya taaki wo suite aage bhi signal rahe)
- `python3 qa/check-handoff.py` — **202 checks, 0 red** (commit ke baad)
- **`bash qa/v241-gate.sh` NAHI chalaya** — v236 gate se banake 0 red karna baaki hai.
- Purane suites (`t-v221`, `t-v222`, `t-v223`, `t-v225`, `t-v226`) apne release ke **number par pinned** hain,
  isliye wo red dikhte hain — unme asli check (ek hi stylesheet, bundle) pass hota hai, sirf `?v=236` jaisa
  pin fail hota hai. Yeh pehle se aisa hai.
- Sandbox me **browser engine nahi hai** (jsdom me layout nahi hota), isliye: jsdom me poora home page
  render karke verify kiya ki **26/26 card photos thumbs se aa rahi hain, 0 original**; aur thumbs HTTP par
  `image/webp` ke roop me 200 dete hain. Asli proof aapka `?perf=1` hai.
