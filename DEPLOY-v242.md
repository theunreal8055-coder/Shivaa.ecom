# DEPLOY-v242 — “Responsive” (clicks wapas kaam kar rahe hain)

**Package:** `shivaa-update-v242.zip` · **683 files** · **43,644,946 B** · sha256
`ceaa75c99a516f0157037557aaa82a6c7ee7f84943dc374438bc443a3aecfa0c`
**Site ab:** v241 (aapne lagaya) · **Yeh release:** v242 (v237–v241 andar hain) · **Sirf yehi zip install karein.**

> **Commit:** *(push ke baad bhara jaayega)*

---

## 1 · Pehle sach: clicks "tootey" nahi the, wo nigal liye ja rahe the

Maine v241 ke poore tap path ko jsdom me dobara chalaya — **har button phir bhi chalta hai** (tile navigate
karta hai, quick view khulta hai, wishlist toggle hota hai). Matlab page zinda tha; **tap khaaya ja raha tha**.
v241 me teen cheezein aisi thi jo tap kha sakti hain, aur teeno hata di gayi hain.

### 1.1 Service worker har photo ke baad poori image-cache scan kar raha tha

v241 me maine cache limit 60 → 160 kar di (kyunki thumbnails chhoti hain). Lekin `trimMedia()` **har image
likhne ke baad har entry ke liye `c.match()`** chalata tha. Home page par ~100 photo hain × 160 entries =
**hazaaron CacheStorage read**, pehle scroll ke dauraan, worker ke ek hi thread par. Page paint hota, phir
phone ghisatta. Ab: count-trim sirf delete karta hai (koi read nahi), aur age-sweep **max ek ghante me ek baar**
(+ activation par ek baar).

### 1.2 Paint ke 1–3 second baad poora view dobara render ho raha tha

v241 me phone ke cache se 800 ms par paint hota tha, aur API ka jawab aate hi `boot()` dobara chalta tha.
`route()` koi bhi khula sheet band karta hai, bag khaali karta hai, aur `#view` ko naya likh deta hai —
yaani us window me tap daala to **tap drop**, aur agar tap se kuch khula tha to **aapki ungli ke neeche hi
band**. Ab app.js **"calm repaint"** karta hai: 4 second tak koi touch nahi, koi sheet khuli nahi, tab visible
— tab repaint. Data aata hai, bas kabhi haath ke neeche nahi.

### 1.3 Ek bacha hua full-screen layer tap kha sakta tha

Band overlay bhi clickable reh jaata tha — site smooth scroll karti hai par dead lagti hai. Ab rule hai:
`.modal-overlay:not(.open){pointer-events:none}` + jo bhi screen-cover layer apne andar koi control nahi
rakhta, use on-the-spot neutralise kar diya jata hai.

**Aur agar phir bhi kabhi ho:** koi bhi URL le kar `?tapdiag=1` laga dein (jaise `shivaa.in/?tapdiag=1`).
Ab har tap par neeche ek box batayega ki **phone ne us point par kaunsa element "hit" kiya** — uska naam,
size, z-index, pointer-events, sheet khuli hai ya nahi. Ek screenshot bhej dein, culprit naam ke saath
saamne hoga. (Title par tap karke box band.)

---

## 2 · Do bug jo aapne bataye hi nahi — maine khud dhoondhe

### 2.1 pehle screen par ₹0 price (v241 ki galti)

v241 me 800 ms par paint hota tha lekin **gold rate** ab tak nahi aata — rate jaan-boojh kar cache nahi hota
(sahee hai: purana rate aaj ka rate ban ke nahi dikhna chahiye). Isliye us waqt price ₹0 / ₹NaN aa sakta tha.
**v242 ne wo fast paint wapas hata diya** — 6 second ka honest ceiling wapas. Jo speed aapko achhi lagi
(photos + blur) wo dono bani hui hain.

### 2.2 product page ki badi photo soft ho gayi thi (v241 ki galti)

v241 me thumbnail rule har photo par lag raha tha — product page ki **main gallery photo** bhi 560 px
thumbnail ban gayi thi (3x screen par soft). Ab thumbnails sirf **grids/cards** me lagte hain; product page,
gallery aur hero art **original** hi rehte hain.

## 3 · Chhoti cheezein jo saath me theek hui

- Touch device par **hover wali doosri photo** ab render hi nahi hoti — phone kabhi hover nahi kar sakta,
  par browser use download kar raha tha (~25 KB × 13 cards).
- `boot()` do baar chalne par purane **timers stack** ho rahe the (1s aur 30s). Ab ek hi rakhta hai.
- Worker ki precache list me `v237.js` **do baar** likha tha — saaf kiya.
- Review form ka button `type="submit"` declare karta hai (bina type wala button form submit kar deta hai).
- Header logo par `width/height` — header load par re-flow nahi hota (click-jump kam).

---

## 4 · Apply (4 step)

1. Hostinger → **File Manager** → `public_html`
2. `shivaa-update-v242.zip` upload → **Extract** (overwrite)
3. zip delete karein
4. `https://shivaa.in/api/version` → `rel: 242`, `stamp.matched: true`

Zip phir ~43 MB (v241 jaisa hi) — thumbnails pehle se server par hain, yeh zip sirf unhe list me rakhti hai.

## 5 · Phone par check list (1 minute)

- [ ] Home page → koi **category tile** tap → shop khule
- [ ] Koi card → **Quick view** → modal khule aur khula rahe (apne aap band na ho)
- [ ] Card ka **heart** tap → fill ho jaye
- [ ] Header ka **burger** → drawer khule, row tap → navigate
- [ ] **Add to bag** → bag drawer khule, tap karne par band na ho
- [ ] Product page → **main photo sharp** (pehle se behtar dikhegi — original wapas)
- [ ] Koi bhi URL + `?perf=1` → pehle jaisa timing box (IMAGES line abhi bhi kam)
- [ ] Hard refresh ek baar (worker `shivaa-shell-v242` par chala jaayega)

## 6 · Rollback

`shivaa-update-v241.zip` dobara extract kar dein — par usme taps ka issue hai, isliye rollback sirf zaroorat par.

## 7 · Kya chhua nahi gaya

Koi route, price, money maths, admin screen, schema, `.htaccess`, `config.php`, `data/`, `uploads/` nahi.
**CSS bundle same** — 71 layers / 71 blocks (v242 me koi nayi css layer nahi; `v242.js` chhoti style rules
khud inject karta hai).

## 8 · Honest status

- `node --check` — app.js, sw.js, v241.js, v242.js **clean**
- `node qa/browser/t-v242-taps.mjs` — **36/36 PASS**
- `node qa/browser/t-v241-perf.mjs` — **43/43 PASS** (iske 4 release-number pins ko "current stamp" kar diya, taaki suite aage bhi signal rahe)
- `node qa/browser/t-v240-rip.mjs` — **16/16 PASS** (drawer guard intact)
- `python3 qa/check-handoff.py` — **204 checks, 0 red** (commit ke baad)
- jsdom mobile run: 13/13 cards thumbnails se, hover photo 0, PDP photo original, tile tap → navigate,
  quick view khula, stray layers 0, page errors 0
- **`bash qa/v242-gate.sh` NAHI chalaya** — v236 gate se banake 0 red karna baaki hai.
- Sandbox me **browser engine nahi hai** (jsdom me layout nahi hota), isliye tap problem CSS guess karke nahi,
  v241 ke har change ka runtime asar padh kar pakda gaya.
