# DEPLOY-v244 — “Butter” (PC par har cheez makhan jaisi)

**Package:** `shivaa-update-v244.zip` · **686 files** · **43,657,910 B** · sha256
`5b3bfdb3fa490fc32071bb17339ecfbc30ca634cfd5f9439f56a487c784453d8`
**Site ab:** v241 (aapne lagaya) · **Yeh release:** v244 (v237–v243 andar hain) · **Sirf yehi zip install karein.**

> v242 aur v243 aapne install nahi ki. **v244 me dono ka poora kaam hai** — clicks, ₹0 wala pehla screen, product
> ki badi photo, aur PC header ki categories. Ek hi file sab le aayegi.

---

## 1 · Jo asli me frame kha raha tha (guess nahi, measure)

Aapki line: *“buttery smooth, easy to navigate, every button like butter, fast loading of every page, page
stuck nahi lagni chahiye.”* Maine poora scroll + render path dobara padha. **Chaar cheezein** abhi bhi har
frame par waqt le rahi thi — chaaron band ho gayi hain.

### 1.1 PC ka header har scroll frame par poori screen dobara blur kar raha tha

Header sticky hai (upar chipka rehta hai). Scroll shuru hote hi wo `.scrolled` state me jaata hai, aur us
state me likha tha:

```
.header.scrolled { backdrop-filter: blur(20px) saturate(1.25) }
```

Matlab: **jab tak aap scroll karte hain, browser har frame par header ke peechhe ki poori screen dobara
blur karta rehta hai.** Yeh ek full-screen GPU pass hai, har frame, sirf ek aisa fill dikhane ke liye jo
pehle se hi 86–98% opaque tha — yaani aankh ko farak lagbhag zero.

v241 me maine **exactly yehi cheez phone par** hataayi thi, aur note me likh diya tha “desktop ke paas GPU
headroom hai”. Nahi hai. Ab PC par bhi blur gaya — **same cream colour, same height, same border, same
shadow**, bas ek pass kam. `.utilbar`, `.mnav`, PDP ka buy bar, KYC bar — sab par same.

### 1.2 Har product card apna alag GPU layer bana ke rakha hua tha

`.p-card`, `.cat-card`, `.acct-tile`, `.testi`, `.trust`, `.catlog` — sab par `will-change:transform`
**hamesha** ke liye. 60 cards = 60 layers GPU memory me. Laptop ki shared memory me yeh texture eviction
aur kahin-aur jank ban ke aata hai. v241 ne yeh sirf touch par theek kiya tha (`html.au-touch`), isliye
desktop par layers bachi hui thi.

Ab card **sirf tab layer banta hai jab mouse uske upar ho** — jis ek pal me us layer ka faayda hai — aur
mouse hatne par chhod diya jaata hai.

### 1.3 Lambi grid ke saare card har render par bante the

Shop page par 60+ cards: har page change par 60 cards ka style + layout + paint. Ab **7th card se aage**
`content-visibility:auto` hai — browser unhe tab tak nahi banata jab tak wo screen ke paas na aayein, aur
ek baar dekhne ke baad unki asli height yaad rakhta hai, isliye scrollbar **koodta nahi**.

### 1.4 ~180 golden shimmers hamesha chal rahe the

Gold foil sweep, sheen, marquee, dust — inme se zyadatar `background-position` animate karte hain, yaani
**har frame par us element ka poora repaint**, screen par ho ya na ho. Ab **jab tak ungli scroll kar rahi
hai** yeh sajawaT tham jaati hai (`html.shv-scrolling`), aur scroll rukte hi turant wahi se chalu ho jaati
hai. Kuch hataaya nahi gaya — isliye kuch “koodta” bhi nahi: paused animation wahin se resume hoti hai.

---

## 2 · Iske upar teen cheezein jo CSS nahi kar sakta

1. **Photo ek screen pehle decode hoti hai.** Jo photo screen par aate waqt decode hoti hai, wahi scroll me
   atakti hai. Ab ek observer 700 px pehle se bytes maangta hai, decode karta hai, phir chhod deta hai.
2. **Jis piece par mouse jaata hai, uski badi photo pehle se warm.** app.js pehle se product ka JSON warm
   karta tha (v186) — ab usi intent par photo bhi. Product page khulte hi jewellery wahan hoti hai, 300 ms
   baad nahi.
3. **Back button wapas wahin le jaata hai jahan aap the.** Pehle Back dabane par page top par chala jaata
   tha — lagta tha “site bhool gayi”. Ab har route ka scroll offset session bhar yaad rehta hai.

Aur: **tab chhupne par** bhi sajawaT tham jaati hai (battery + laptop fan).

---

## 3 · “Stuck” ka ilaaj — `?perfdiag=1`

Main aapse bina soche-samjhe “ab smooth hai” nahi kahunga. Site par koi bhi page kholein aur URL me
`?perfdiag=1` laga dein (jaise `shivaa.in/?perfdiag=1#/shop`). Neeche corner me ek chhota box aayega:

- **fps** (aur worst frame kitne ms ka tha),
- **long tasks** — kitni baar main thread 50 ms+ atka,
- **LCP** (bada element kitni der me aaya) aur **CLS** (page kitna kooda),
- chal rahi animations ki ginti, aur **sabse dheemi 4 files**,
- **Copy report** button.

Jahan bhi “atak” lage, wahan scroll karke **Copy report** dabaiye aur wo text paste kar dein. Usi line se
main agla fix banaunga — andhere me nahi.

---

## 4 · Aapke liye check (1 minute)

1. PC par site kholen → `Ctrl + Shift + R` (ek baar).
2. Page scroll karein — header ab solid cream hai (pehle blur ke saath thoda see-through). Scroll “chipchipa”
   nahi lagna chahiye.
3. Kisi product card par mouse le jaayein → card uthta hai (hover), click → photo pehle se ready.
4. Shop page kholein, neeche tak scroll karein — cards aate dam niyam se aane chahiye, page koodna nahi chahiye.
5. Kisi product me jaayein, phir **Back** — wapas usi jagah, top par nahi.
6. Phone par bhi ek baar dekh lein — drawer, bottom nav, sab jaisa tha waisa.

---

## 5 · Kya nahi badla

Route, price, gold rate, cart, checkout, payment, admin/seller panel, database — **kuch nahi chhua**. Yeh
release sirf frame ka kharcha hataati hai: blur, layers, off-screen cards, aur bekaar chalti animations.
Design ki ek bhi cheez hataayi nahi gayi (gold, gradient, shimmer — sab wahi, bas scroll karte waqt tham
jaate hain).

## 6 · Rollback

Pichla **lagaya hua** build **v241** hai. Zaroorat pade to v241 ki zip wapas extract kar lein. (v242, v243
kabhi install nahi hui — inka rollback point nahi hai.)
