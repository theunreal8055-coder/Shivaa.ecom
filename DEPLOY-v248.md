# DEPLOY — Shivaa v248 “Instant”

**Zip:** `shivaa-update-v248.zip` — 763 files · 45,051,400 B
**sha256:** `861d946d45afaac68b395aafc29eee36399df6ab9e8b067361f7429e10553faa`
**Isme kya hai:** v237 se v247 tak sab kuch + naya v248. **Ek hi upload se poora shop update ho jayega.**
**Kis branch se:** `arena/95be65a4-shivaa-ecom`

---

## 1 · Seedha jawab — 3 second kahan jaate the

Aapne likha: *"jab bhi koi option ya button dabata hoon, 3 second rukta hai, phir agla page load hota hai."*

Problem slow page nahi tha. Page banana **90–150 millisecond** ka kaam hai (maine naapa). 3 second **wait** tha —
tap aur page ke beech mein **teen cheezein** khadi thi. Teeno hata di gayi hain:

| # | kya rok raha tha | ab kya hai |
|---|---|---|
| 1 | **View transition** — link ka default action rok deta tha, purane page ka photo banata tha, phir hash set karta tha (300 ms cap + rAF ke andar). Isi waqt browser poora page ka snapshot rasterise karta tha, aur page touch nahi leta tha. | **Band by default.** `?vt=1` se hi on hoga. Page ab seedha native hash navigation hai. |
| 2 | **`scrollTo({top:0})` + `html{scroll-behavior:smooth}`** — naya page **purane scroll position par** banta tha, phir page dheere-dheere upar slide karta tha. Isi liye lagta tha "kuch nahi hua… phir load shuru hua". | Router ab `behavior:'instant'` maangta hai, aur `css/v248.css` mein `auto` last word hai. Tap ke aas-paas 700 ms tak scroll animation band. |
| 3 | **Rail centring** — jo chip aapne dabaya aur jo page chhod rahi thi, use pehle smooth `scrollIntoView` se centre kiya ja raha tha. | Jo link page chhodta hai, uske liye centring **skip**. |

**Rule aage ke liye:** tap aur page ke beech koi animation nahi. Animation ko tez nahi karna — **hataana** hai.

## 2 · Pehli baar kholne par slow

Pehle ek **opaque splash** ("Curating your experience") page ko dhak kar baitha rehta tha jab tak saara data
na aaye. Phone par wahi "stuck" lagta hai.

- Ab splash **260 ms** par hat jaata hai — aur uske peeche **page ka skeleton** (hero + cards ki shape) pehle se
  maujood hai. Yaani pehli frame se hi shop khula hua dikhta hai.
- Cold-visit paint ceiling **6 s → 4 s**. Yeh safe hai kyunki jis price ka rate nahi aaya, wahan **skeleton**
  dikhta hai — ₹0 ya ₹NaN kabhi nahi.
- Test: maine **saare network request hamesha ke liye hang** kar diye — phir bhi skeleton screen par tha.

## 3 · Scroll (navigate karne ke baad)

- Route badalne par `lazySweep` **teen baar** chalta tha (0 / 900 / 2600 ms), aur har baar har image par
  `getBoundingClientRect()` — yaani forced layout, teen baar, un hi 3 second mein jab aap scroll kar rahe hote.
  Ab **ek baar, next frame par** (+ 2600 ms wala CMS pass).
- Jab tak ungli chal rahi hai (`html.shv-scrolling`), entrance animation, reveal class aur image fade **band**.
  Jo cheez ungli ke neeche aa rahi hai wo seedha **hai** — fade-in nahi karti.
- v117 ke **110 KB decorative scripts** (aurum/motion/boost) idle window ka intezaar karte the, jo gesture ke
  beech khul jaati thi → scroll hichakta tha. Ab **700 ms asli shaanti** ka intezaar (max 12 s).

## 4 · Naya: Tap Meter (ab evidence milega, adjectives nahi)

Phone par kholiye: `https://aapki-site.com/?tapdiag=1`

1. 4–5 button/category dabaiye.
2. Screen ke neeche ek chhota kaala box numbers dikhayega — screenshot bhej dijiye.

Ya console mein: `Shivaa.v248.report()` — ek line copy karke bhej dijiye.

Isme 4 numbers honge:
- **press→hash** — agar yeh bada hai, koi code click rok raha hai.
- **hash→page** — agar yeh bada hai, page banana bhaari hai.
- **press→paint** — total, ungli se screen tak.
- **long tasks** — main thread kitni der block raha (50 ms se upar wale).

Yeh seedha bata dega ki agli baar kahan dekhna hai. Bina iske main phir se andaza lagaunga — aur wahi nahi karna.

## 5 · 3 minute ka phone check (order mein)

1. Site kholiye (pehli baar) — **splash 260 ms** mein jaana chahiye, skeleton dikhna chahiye, phir content.
2. Kisi bhi category par tap — page **usi second** badalna chahiye, upar se shuru (slide nahi).
3. Page ko neeche scroll kijiye — content **ruk kar fade nahi** hona chahiye, seedha aana chahiye.
4. 5–6 buttons dabaiye — har baar same behaviour.
5. `?tapdiag=1` se ek screenshot.
6. PC par bhi 2 minute: menu categories, product page, scroll.

## 6 · Wazan (v246 se aage)

| | pehle | ab |
|---|---|---|
| Picture markup (phone home) | 5,113 KB (v245) | 1.46 MB (v247) |
| Script requests | 33 | **2** (`app.js` + `rel.js`) |
| CSS requests | 58 | **1** (`shivaa.css`) |
| Splash par rukna | jab tak data na aaye (6 s tak) | **260 ms** |
| Tap → page (sandbox) | — | **11 ms → hash · 145 ms → page** (`?vt=1` wala raasta band) |

## 7 · Kya nahi badla

- Design, colours, typography, product pages, cart, checkout — **kuch nahi chheda**.
- v245 ka scroll repair, v246 ka weight, v247 ka flat-at-rest feel — **sab waisa hi hai**, aur ab unke upar
  tap ka wait bhi gaya.
- `?nofx=1` (saari decoration band) — abhi bhi kaam karta hai.

## 8 · Rollback

Purana zip (v247) sambhal ke rakhiye. Kuch bhi ajeeb lage to **wahi zip wapas upload** kar dijiye — site
turant purani haalat mein aa jayegi. Naya code purani files ko delete nahi karta, sirf replace karta hai.

## 9 · Meri honest baat

Main sandbox mein hoon — mere paas aapke phone ki screen, GPU, ya network nahi hai. Jo main **prove** kar sakta
huna: tap aur page ke beech **teeno rukavat code se hat gayi hain**, splash 260 ms par jaata hai, aur route par
teen forced layout ki jagah **ek** bacha hai. Jo main **nahi** keh sakta: "ab bilkul smooth hai" — woh aapke
phone par hi pata chalega.

Isi liye is baar meter bhi bheja hai. Agli report **numbers** ke saath aaye to main andaza nahi lagaunga.
