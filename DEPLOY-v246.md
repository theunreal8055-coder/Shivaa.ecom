# DEPLOY-v246 — “Lightning” (Photo halke, request kam, speed asli)

**Package:** `shivaa-update-v246.zip` · **689 files** · **43,776,814 B** · sha256
`d389c28b1829541aae93deade6b1029f423e01b4fb9c77d5100366560a98ef88`
> **Commit:** `28a0992` · branch `arena/95be65a4-shivaa-ecom`
>
> **Yeh release:** v246 (v237 se v245 tak sab isme hai) · **Next number:** v247

---

## 1 · Aapki shikayat sahi thi — aur wajah wazan thi, “speed” nahi

Aapne likha: *“App lags and feel stuck and doesn't load everything fast”*. Maine pehle **ginti** ki, phir
kuch badla. Do number nikle, dono hi buri tarah galat the:

| | Pehle (v245) | Ab (v246) |
|---|---|---|
| Phone par home screen ki photos | **72 photos = 5,113 KB** | **1,832 KB** (aur asli browser isse bhi kam khinchta hai) |
| `index.html` ke script requests | **33 alag files** | **2** (`app.js` + `rel.js`) |
| Service worker install ke fetches | ~40 ek saath | **18**, chaar-chaar karke |

5 MB photos 4G phone par — bas isi ka intezaar tha. Isliye “stuck” lagta tha; app kharab nahi tha, **bhaari**
tha.

---

## 2 · Photo ki galti (asli wajah)

Har chhoti jagah par **camera ki poori photo** bhej di ja rahi thi:

- review ke 150 px ke gol circle me **409 KB** ki `cust-2.jpg`;
- home ke 360 px card me **244 KB** ki `necklace-rani.jpg`;
- category ki 72 px ki 18 goli me 40–132 KB ki originals;
- quick-view kholte hi **244 KB** ki photo;
- UGC wall me bhi poori photo.

Aur mazedaar baat: **chhoti photos pehle se bani hui thi** (`images/thumbs/…-320.webp`, `…-560.webp`, v241 se
saikdon files) — par un paanch jagahon ne unhe maanga hi nahi, seedha badi photo ka naam likh diya.

Ab har chhoti jagah `thumbAttrs()` se jaati hai: browser ko 320 aur 560 dono diye jaate hain, wo apne aap
sahi chunta hai. Badi photo `data-full` me rehti hai (zoom ke liye), aur agar thumb kisi wajah se na mile to
photo phir bhi dikhegi — khaali dabra nahi.

**Niyam (aage ke liye):** kisi bhi card, tile, strip ya goli me `images[0]` seedha `src=` me nahi likhna.
Sirf `thumbAttrs()`.

---

## 3 · Request ki galti (33 → 2)

33 `<script>` files thi, aur `defer` ka matlab — har file **pichhli ke baad** chalti hai. 4G par 33 chakkar,
aur beech me ek slow file aayi to uske peeche sab ruk gaya. Phone par yeh seconds ban jaata hai.

Ab 31 behaviour layers ek file `js/rel.js` me, **usi order me** jodi gayi hain (`tools/build-js-bundle.py`).
`app.js` jaan-boojh kar alag hai: koi bhi decoration layer shop kholne se nahi rok sakti. Dono files page ke
shuru se hi download hona shuru ho jaati hain (pehle parser unhe page ke neeche tak padhne ke baad dhoondta
tha).

**Service worker:** update aate hi wo ~40 files `cache:'reload'` se maangta tha — theek us waqt jab page khud
download ho raha hota tha. Ab **chaar-chaar** files, aur fonts/icons/photos browser ke apne cache se.

---

## 4 · Ek chhupa hua khatra, jo band kar diya

v245 me `content-visibility` (jo aapka scroll tod raha tha) maine **shipped css file se haath se** hataya tha.
Agli baar jab css bundle banti, wo **saari 19 lines wapas** aa jaati — yani wahi purana bug laut aata. Ab wo
declarations **12 source layers se hi** hata di gayi hain aur bundle unhi se banti hai. Shipped css me ab
sirf **ek** `content-visibility` bacha hai — wo guard jo aur kuch aane hi nahi deta.

**Matlab: v245 ka scroll fix bilkul jaisa tha waisa hai**, aur ab wo galti se bhi undo nahi ho sakta.

---

## 5 · Kya **nahi** kiya (jaan boojh kar)

Kuch bhi chhupaya nahi, rokа nahi, late nahi kiya. Koi `content-visibility`, koi `overflow-x: hidden`, koi
“photo ko baad me load karo”. Sirf **bytes kam kiye** aur **requests kam kiye**. Design, gold, gradient,
shimmer, sheets — sab wahi.

---

## 6 · Aapke liye check (2 minute, phone par pehle)

1. **Browser band karke dobara kholen** (purana `sw.js` phone me baitha hai — ek baar hard reload zaroori hai).
2. Home khule — photos pehle se hi tez aani chahiye. PC par bhi dekh lein.
3. Neeche tak scroll — home, shop, category, product. Kahin rukna nahi chahiye (v245 wala fix bhi yahin
   check ho jaayega).
4. Kisi card par tap → quick view turant khule, photo dhundhli nahi.
5. Agar phir bhi kuch bhaari lage: `?perfdiag=1` ka **Copy report** bhej dein, aur bata dein phone ka model.
   Kill switch wahi hai: `?nofx=1`.

---

## 7 · Rollback

Isme v237–v245 sab hai, isliye ek hi upload kaafi hai. Pichhla **kaam karta** build **v241** tha; v244 (jo
phone tod raha tha) par wapas na jaayein. Rollback ka matlab sirf pichhli ledger row — usse peeche nahi.
