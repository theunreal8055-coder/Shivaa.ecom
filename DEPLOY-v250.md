# DEPLOY — Shivaa v250 "Still"

**Zip:** `shivaa-update-v250.zip` — 769 files · 45,317,152 B
**sha256:** `0b96fcf2d7604090fb73d3f222e381fca9ccdab8f309a7d5944d09bedc295537`
**Isme kya hai:** v237 se v249 tak sab + naya v250. **Ek hi upload se poora shop update.**
**Branch:** `arena/95be65a4-shivaa-ecom`

---

## 1 · Is baar maine andaza nahi lagaya — naapa

Aapne likha: *"still legs and there are flickering issues and scrolling also strucks and the page doesn't
move anywhere sometimes… even if I don't have mention them find them and fix them."*

Toh maine aapke **phone ki screen par jo asli mein ban raha hai** wo gina — 1284 elements, 390×780.
**Jo mila (v249 mein):**

| cheez | kitni thi | ab |
|---|---|---|
| `backdrop-filter` (har ek = ek blur pass, har scroll frame par dobara) | **21** — lagbhag har product card ke button par | **0** |
| `mix-blend-mode` (blending group) | **6** | **0** |
| `filter: blur()` (poori surface ka blur) | **4** | **0** |
| `will-change` (compositor ko layer ka promise) | **31** | **0** |
| **kabhi na rukne wali animations** | **25** — 14 ghoomte QR badge, 4 tairte blur orbs, beams, glow, ek chalte marquee ke andar **70 star pops** | **2** (sirf do marquee, jo sirf transform chalate hain) |
| kul animating elements | **141** | **15** |

Yeh sab **phone par hi band** hai (`html.shv-mobile`), desktop par waisa hi rehta hai — taste kam nahi hui,
sirf wo kaam gaya jo phone sambhal nahi sakta.

## 2 · Flickering ka asli mujrim — **meri hi galti thi (v248)**

v248 mein maine likha tha: "scroll ke waqt saari entrance animation band kar do". Lekin `shv-scrolling` class
**har gesture ke pehle scroll par on** hoti hai aur 200 ms baad off — yaani **jo animation chal rahi hoti thi wo
cut hoti thi, aur class hatne par phir se shuru** hoti thi. Wahi flicker tha. Ab wo rule hata diya hai, aur
uski zaroorat bhi nahi — kyunki ab koi content invisible se shuru hi nahi hota.

## 3 · Blink ka asli karan — v248 se bhi purana

`#view > * { animation: viewIn .45s both }` — **har page ke har section ko opacity 0 se fade-in** karta tha,
aur `both` ka matlab animation shuru hone se **pehle bhi invisible**. Har navigation = khaali screen → fade.
Ab:
- `viewIn`, `rvIn`, `v210Rise`, `v211Rise`, `starPop` — kisi mein opacity 0 nahi (sirf 6 px travel).
- Upar se guarantee: `#view, #view > * { animation: none !important; opacity: 1 !important }`.

## 4 · "Scrolling strucks" ka karan

Shop page par **poori site ka ekmatra non-passive `touchmove`** listener tha (`#view` par, pull-to-refresh ke
liye). Non-passive ka matlab: browser **har frame par pehle JavaScript ka intezaar** karta hai. Phone par yahi
"scroll atak raha hai" hai. Ab wo listener **sirf tab lagta hai jab pull shuru hoti hai**, baaki waqt browser
ko koi rukavat nahi. Saath mein Chrome ka apna pull-to-refresh (`overscroll-behavior-y: contain`) aur tap ke baad
chipak jaane wale hover transforms bhi band.

## 5 · "Page doesn't move anywhere sometimes"

`lockScroll()` ek counter hai (sheet khulti hai → lock, band hoti hai → unlock). Agar ek baar unlock chhoot jaye
to `html.no-scroll` chipka reh jata hai — **page bilkul scroll nahi hota aur har tap bekar lagta hai**.
Ab ek watchdog hai: lock on + **koi dikhta hua overlay nahi** + aap page hilane ki koshish kar rahe ho → 700 ms
mein page wapas mil jata hai. (Sheet khuli ho to haath nahi lagata — test kiya hua hai.)

## 6 · 3 minute ka check

1. **Reload** — splash nahi, seedha page (device pehle khol chuka hai).
2. Category → product → back: har jagah page **turant**, koi fade-in nahi, koi blink nahi.
3. **Scroll** — content rukta nahi, fade nahi, page ungli ke saath chalta hai.
4. 8–10 second rukiye — page khud se dobara **nahi** banega, kuch ghoomta/चमकता nahi rahega (sirf 2 marquee).
5. Kisi card par tap → photo zoom hokar chipki nahi rahegi.
6. PC par 2 minute — wahan blur/motion sab pehle jaisa hai.

## 7 · Numbers chahiye to

Console mein:
```
Shivaa.v250.report()   // phone abhi kya composit kar raha hai
Shivaa.v249.report()   // page kitni baar khud redraw hua
Shivaa.v248.report()   // tap kitna slow tha
```
Line copy karke bhej dijiye — agli baar phir andaza nahi lagaunga.

**Ek request:** devtools → Network → `app.min.js` → Headers. Agar `Content-Encoding: gzip` nahi hai, aapka
server files compress nahi kar raha (`.htaccess` main ship nahi karta) — wahan 3× farq padta hai. Screenshot
bhej dijiye.

## 8 · Rollback

Purana zip sambhal ke rakhiye. Purana zip upload = purani site. Naya code kuch delete nahi karta.

## 9 · Honest baat

Main **prove** kar sakta hoon: phone home par animations 141 → 15, infinite 25 → 2, blur 21 → 0, blend 6 → 0,
`will-change` 31 → 0 (gate `t-v250-still` yeh har baar naapta hai), blink ka source fix hai, non-passive scroll
listener gaya, aur frozen page apne aap theek hota hai. Main **nahi** keh sakta "ab bilkul perfect hai" — ye
aapke phone par hi pata chalega. Isi liye teen report() diye hain.
