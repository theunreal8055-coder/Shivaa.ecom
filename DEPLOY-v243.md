# DEPLOY-v243 — “Header bar” (PC par header ki categories wapas)

**Package:** `shivaa-update-v243.zip` · **684 files** · **43,648,349 B** · sha256
`00aac36db94b231c3a4554eb74d170b1697bf0a66493643a7c147624b9e13b65`
**Site ab:** v241 (aapne lagaya) · **Yeh release:** v243 (v237–v242 andar hain) · **Sirf yehi zip install karein.**

> **Commit:** `9616e3a` (code `f9a91e9`) · branch `arena/95be65a4-shivaa-ecom` · zip GitHub par live
> (43,648,349 B confirmed)
>
> v242 aapne download kiya tha lekin lagaya nahi. **v243 me v242 ka poora kaam hai** (clicks, ₹0 wala pehla
> screen, product ka badi photo) — yaani v242 ki alag zip ki zaroorat nahi, yeh ek file sab le aayegi.

---

## 1 · Sach pehle: categories **delete nahi hui thi**

Aapne likha: “PC main header se jo categories thi vo sab ud chuki hain”. DOM me dekha — **saari 9 categories
apni jagah hain**, `All 17 categories` button hai, mega-menu ke 17 tile hain. Kuch bhi gayab nahi hua. Jo hua
wo yeh: **unko screen se bahar dhakel diya gaya.**

### 1.1 Ek hi element, do kaam

`#mainNav` **ek hi** element hai jo do jagah do roop me dikhta hai:

| screen | `#mainNav` kya hai |
|---|---|
| phone (≤820 px) | side drawer — upar se neeche, har row poori chaudai ki |
| PC (>820 px) | header ke andar **horizontal category bar**, 52 px unchi, 9 barabar links |

### 1.2 Drawer ki “fix” PC par bhi chal padi

Drawer me rows toot rahi thi (patli, text kata hua). v238/v239 ne unhe theek kiya — lekin **v239 ne style
seedha element par (inline) likh diya**, aur **koi screen-size check nahi lagaya**:

```
a.style.setProperty('width', '100%', 'important')   /* har row par */
```

Phone par yeh bilkul sahi hai. PC par matlab: **9 links, har ek “poori bar ki chaudai” maang raha hai.**
52 px ki bar me 9 × 100% ke liye jagah nahi → bar khaali dikhne lagi. Aur inline style **css ki saari 71
layers ko haraa deta hai** — isi liye koi bhi css rule use wapas nahi la saka.

### 1.3 Ab kya badla

- **v239** ab sirf ≤820 px par kaam karta hai (`drawerMode()` gate).
- **v240** ka cleanup ab PC par ulta kaam karta hai — drawer ke nishaan hataata hai, aur window resize /
  rotate / dock hone par dobara check karta hai.
- **v243 (naya layer)** PC par bar se drawer ke saare inline nishaan hataata hai (row, label, sub-label),
  load ke baad 0.4 s / 1.5 s / 3.5 s par dobara dekhta hai (purani cached script baad me kuch likh de to bhi),
  aur phone par **kuch nahi chhedta**.
- v243 **kuch banata nahi, chhupata nahi, hataata nahi** — sirf woh inline properties delete karta hai jo
  PC par honi hi nahi chahiye. CSS wapas maalik hai.

---

## 2 · Dono taraf proof (dom test, real index.html)

`qa/browser/t-v243-header.mjs` — **36/36 pass**:

- PC: bar me 9 links, **0 rows par inline width/display**, labels par inline `min-width` nahi, `All
  categories` button zinda, mega-menu ke 17 tile, header `compact` me atka nahi;
- PC: bar ka link click → route badla (`#/shop`), `All categories` click → mega-menu khula;
- Phone: 9 rows **abhi bhi** full-width (drawer fix bacha hua), `nav#mnav` untouched, koi page error nahi.

Purane gate bhi dobara chalaye: `t-v242-taps` **37/37**, `t-v241-perf` **43/43**, `t-v240-rip` **16/16**,
`qa/check-handoff.py` — 0 red.

### 2.1 Aapke liye check (30 second)

1. PC par site kholen → **header ke neeche category bar** dikhni chahiye (Gifting, Gold Rates, Buyback,
   Black Card, Savings …).
2. Kisi category par click → page khulna chahiye.
3. `All 17 categories` → mega-menu khule.
4. Phone par site kholen → ☰ drawer → rows poori chaudai, text saaf.
5. Agar purani cache atak jaye: `Ctrl + Shift + R` (PC) / browser band karke kholen (phone).

Agar phir bhi bar na dikhe, URL me `?navdiag=1` laga dein — screen par row/pane ki naap aur mode
(drawer/bar) likha aayega. Screenshot bhej dein, main usi line se pakad lunga.

---

## 3 · v242 se kya-kya andar hai (kyunki aapne v242 lagaya nahi)

- **Clicks**: service worker har photo ke baad poori cache scan karta tha; paint ke 1–3 s baad `boot()`
  dobara chalta tha aur aapki ungli ke neeche sheet band kar deta tha. Dono theek. `?tapdiag=1` bacha hua hai.
- **₹0 / ₹NaN pehla screen** (v241 ki galti): 800 ms wala paint rate aane se pehle price likh deta tha —
  ab honest 6 s ceiling wapas.
- **Product page ki badi photo** 560 px thumbnail ban gayi thi — ab sirf grid chhoti photo use karta hai,
  product page original dikhata hai.
- **v237** accordion, **v238** drawer width guard, **v239** grid guard + `?navdiag=1`, **v240** ripple
  position fix — sab andar.

---

## 4 · Install (aap hi karenge, main deploy nahi karta)

1. `shivaa-update-v243.zip` **cms/** ke andar extract karein (overwrite = yes).
2. `data/db.json`, `.htaccess`, `config.php` zip me **nahi** hain — aapki live files ko chhua nahi jayega.
3. Site kholen, ek baar `Ctrl+Shift+R`. Header bar turant dikhni chahiye.
4. Settings → Services Worker / “clear cache” ki zaroorat nahi — `sw.js` khud `shivaa-shell-v243` par chala jata hai.

**Rollback:** ledger ka pichla row v242 nahi hai (wo kabhi laga nahi) — pichla *lagaya hua* build **v241** hai.
Zaroorat pade to v241 ki zip wapas extract karein.

---

## 5 · Kya nahi badla

Route, price, gold rate calculation, cart, checkout, payment, admin/seller panel, database — **kuch nahi
chhua**. Yeh release sirf ek inline style ki safai hai, plus v242 ka pehle se packaged kaam.
