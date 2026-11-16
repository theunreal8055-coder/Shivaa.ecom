# v251 — “Alive” · install guide

**Zip:** `shivaa-update-v251.zip` · **772 files** · **45,504,067 B**
**sha256:** `c03ff713453d3d2c7c3ed2c93168419f8d6b5eb06b3927471eb22a81c4fa60fa`
**Contains v237 → v250.** One upload brings the shop up to date.

Raw download:
`https://github.com/theunreal8055-coder/Shivaa.ecom/raw/arena/95be65a4-shivaa-ecom/shivaa-update-v251.zip`

---

## Aap ne kya kaha (16 Nov)

> “The app should feel more live and smooth and the smoothness must be on the next level,
> it should load faster and without decreasing the quality, make the next update, improve
> more smoothness.”

Teen cheezein: **live lage**, **smooth ho**, **jaldi load ho — quality kam na ho**.
v251 teeno ka jawab deta hai, aur har number isi tree par naapa gaya hai.

---

## 1 · Smooth — tap ka jawab

Pehle: card, tile, chip, tab, drawer row — inme se **kisi par bhi press nahi tha**. Sirf
buttons par tha. Isliye phone par tap karke lagta tha ki kuch hua hi nahi.

Ab: har wo cheez jo ungli chhooti hai, **90 ms me `scale(.977)`** se darti hai — aur ye
sirf `transform` hai, compositor ka kaam, paint nahi. Press path se `filter` hata diya
(v107 har press par repaint kar raha tha).

Desktop ko chhua nahi — ye rules `html.shv-mobile` me band hain, PC par wahi hover/blur.

## 2 · Live — dukaan chal rahi hai, dikhta hai

| signal | kab chalta hai |
|---|---|
| price pending — grey bar **saans leta hai** (opacity, 1.4 s) | jab tak rate na aaye |
| utility strip par **6 px live dot** | hamesha (ek hi permanent signal) |
| grid ki **pehli row 24 ms ke gap** se baithti hai (10 px travel, opacity kabhi 0 nahi) | page khulte waqt, 340 ms |
| **bag badge pop** (320 ms) | jab cart/wishlist ka number badle — MutationObserver, poll nahi |
| **gold hairline sweep** | jab naya rate aaye (`rates` event) |

**Settled page par inme se sirf EK chalta hai.** Isi liye ye “live” lagta hai par battery
aur compositor par bojh nahi.

Naya: **2 px gold read bar** — page me aap kahan hain, wo bharta hai. Sirf `transform:
scaleX()`, ek frame me ek baar. Page ki height scroll handler me **nahi** naapi jaati
(resize aur route change par naapi jaati hai) — warna smoothness hi jank ban jaati.

## 3 · Fast — quality bina kam

Pehle stylesheet: **965,451 B**. Ab: **876,841 B** = **88,610 B kam (−9.2 %)**, gzip
me ~191 KB → **174,636 B**.

Ye “minify karke dekho kya hota hai” nahi hai. Naya tool `tools/build-css-min.mjs`
**likhne se mana kar deta hai** agar minified sheet original se structurally alag ho:
8,758 effective rules (selector + uska media context), 9 `@font-face`, 264 `@keyframes` —
sab rule-by-rule compare hote hain, `restructure:false` (koi rule merge/move nahi hota).
Proof fail = koi file write nahi. Isliye quality loss ka sawaal hi nahi.

Rollback ek line ka kaam hai: `index.html` me `<link>` ko wapas `/css/shivaa.css` par
kar dein — wo file zip me maujood hai.

Upar se: app jo bhi `<img>` banata hai, usme ab `decoding="async"` hai (43 template
jagah), taaki photo decode karne se frame na ruke.

## 4 · 3-minute check (phone)

1. Home kholiye → **pehli row** thodi si upar se baithti hai, ek ke baad ek. Screen
   **blink nahi** karti (v249 ka kaam bacha hua hai).
2. Kisi card ko daba ke rakhiye → **90 ms me halka dabta hai**.
3. Kisi product par “Add to bag” → upar **bag ka number pop** karta hai.
4. 15-20 second rukiye → rates aate hi **gold line strip ke neeche ek baar sweep** karti hai.
5. Page ke top par **2 px gold line** — scroll karte hi bhurti hai, rukte hi rukti hai.
6. PC par kholiye → blur, hover, sab waisa hi. v251 ne PC ko chhua nahi.

## 5 · Numbers jo aap khud dekh sakte hain

Phone par browser console:

```js
Shivaa.v251.report()
// alive 251 · phone · live pulses 1 · pending prices 0 · sync-decode fixups 0 · page 0%
Shivaa.v250.report()
// still 251 · phone · 1284 els · blur 0 · blend 0 · filterBlur 0 · animating 15 · promoted 0
```

`live pulses` **1** hona chahiye settled page par (wo live dot). Zyada = kuch atka hua hai.

## 6 · Gates (is tree par, is commit se pehle)

| suite | result |
|---|---|
| `qa/browser/t-v251-alive.mjs` | **46 / 0** (naya) |
| `t-v250-still` | 34 / 0 |
| `t-v249-steady` | 36 / 0 |
| `t-v248-instant` | 37 / 0 |
| `t-v247-premium` / `t-v246-light` / `t-v245-scroll` | 53 / 58 / 39, 0 red |
| `t-v244-butter` / `t-v243-header` / `t-v242-taps` | 54 / 36 / 41, 0 red |
| `t-v241-perf` / `t-v240-rip` | 43 / 16, 0 red |
| `python3 qa/check-handoff.py` | 259 checks, 0 red |

## 7 · Install

1. Zip download → extract into `public_html/` (zip ke andar `cms/` folder hai, wahi merge
   karna hai — `.htaccess` aur `config.php` zip me nahi hain, wo server par safe hain).
2. `https://shivaa.in/api/version` → `"rel": 251` dikhna chahiye.
3. Phone par hard-refresh (ya app band karke kholein) taaki naya service worker
   (`shivaa-shell-v251`) le le.

## 8 · Sach

Sandbox me compositor/rasteriser nahi hai — main **fps ya stutter naap nahi sakta**.
Jo main de sakta hoon: element-level ginti (blur 0, blend 0, promoted 0, infinite 2,
animated 15), byte ke aankde, aur har rule ka source-level proof. Isliye “faster” ka
claim bytes par hai, aur “smooth” ka claim us par ki koi rule layout/paint nahi karta.
Agar phone par phir bhi kuch atke, `Shivaa.v251.report()` aur `Shivaa.v250.report()`
bhejiyega — usi se pata chalega kaun sa element bhaari hai.
