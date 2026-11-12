# DEPLOY-v245 — “Scroll back” (v244 ki galti, usi ghante theek)

**Package:** `shivaa-update-v245.zip` · **688 files** · **43,663,243 B** · sha256
`68c2e0b3d9b951aab4d96fcd3a031f0e0d5e0dcc0dea5de861aba7d0386c8552`
> **Commit:** `c00549b` · branch `arena/95be65a4-shivaa-ecom`
>
> **Site ab:** v244 (aapne lagaya — aur usi ne phone tod diya) · **Yeh release:** v245

---

## 1 · Pehle: galti meri thi, aur mujhe pata hai kahan

Aapne v244 lagaya aur phone par scroll band ho gaya. Aap sahi the. Maine “smoothness” ke chakkar me
**do cheezein** daali thi jo phone par nahi chalti — aur v244 se pehle bhi app me isi tarah ki 7–8 jagah
padi hui thi. Ab **poori tarah hata di gayi hain**.

### 1.1 Asli mujrim: `content-visibility: auto`

Yeh CSS ek “screen se door wala hissa mat banao” ka nuskha hai. Iska dawa hai ki jo card abhi screen se
door hai use browser na banaye — speed ke liye. Lekin iske **do side effects** hain:

1. Jo hissa skip hua, uski **asli height nahi napi jaati** — uski jagah ek **anumanit height**
   (`contain-intrinsic-size`, humne 320px/720px likha tha) maan li jaati hai. Grid ke 60 card jinki asli
   height 3000px hai, wo page par sirf 720px gin sake. Matlab **document apne content se chhota** — aap
   neeche scroll hi nahi kar sakte. Yeh exactly aapki shikayat hai: *“i cant even scroll anything”*.
2. Skip hua hissa **kabhi ban hi nahi raha tha**, aur uske andar ki **lazy photos kabhi maangi hi nahi
   gayi thi** — isliye khaali dabbe. Yeh *“blank space”*.

Yeh cheez app me pehle se kai jagah thi — `.p-grid` (poora product grid!), `.pillars`, `.ugc-wall`,
`.catbar-outer`, `.p-card`, `.ds-card`, `#view > section`, footer — aur v244 ne do jagah aur badha di
(7th card se aage, phone par 5th se). **Sab delete.**

### 1.2 Doosri galti: `html, body { overflow-x: hidden }`

v244 me maine yeh daala tha. iPhone/iPad par yeh jaana-maana scroll-killer hai — body khud scroll
container ban jaati hai aur momentum mar jaata hai. **Hata diya.** Ab `clip` hai, jo sirf kinare kaat-ta
hai, scroll container nahi banata.

### 1.3 Teesri cheez — ehtiyat: parking kabhi atki nahi rahegi

v244 me scroll ke dauraan sajawaT (shimmer) tham jaati thi. Nazariya theek tha, lekin agar kabhi timer
atak jaaye to page “frozen” dikhta hai. Ab:

- **400 ms watchdog** — jahan scroll ruka, wahin class hat jaati hai;
- route change / tab wapas aane / tab chhupne par **turant** release;
- aur ek **kill switch: `?nofx=1`** — URL me lagate hi parking, decode-ahead, sab band, poori site plain.
  Agar kabhi phir kuch atke, aap bas `?nofx=1` laga ke bata dein — turant pata chal jayega.

---

## 2 · Isi ke saath jo theek kiya (blank space ka ilaaj)

- **Jo photo screen par hai, wo khaali nahi chhod di jaati.** Har render ke baad aur scroll rukne par ek
  baar check hota hai: screen par dikh rahi koi photo abhi shuru bhi nahi hui to use turant maanga jaata
  hai (max 40 photos, ek baar — loop nahi).
- **Photo ka frame cream rehta hai**, safed nahi — jab tak photo aaye, jagah saaf dikhti hai.
- **Grids par `contain` bhi hataya** — jo bhi layout containment bachi thi, gaya.

---

## 3 · Jo v244 ka kaam **rakha** gaya (kyunki wo sahi tha)

Yeh rollback **nahi** hai — sirf wo cheez hataayi hai jo phone tod rahi thi:

- Sticky header / bottom bar par **per-frame blur band** (PC par scroll isi se atakta tha) — **wahi hai**.
- Card par `will-change` sirf hover par — **wahi hai**.
- Scroll ke dauraan sajawaT thamna — **wahi hai**, ab watchdog ke saath.
- Photo ek screen pehle decode — **wahi hai**, lekin **phone par sirf 240 px** aage (700 px nahi) aur
  phone par photo ko `eager` **majboor nahi** kiya jaata. Isse hi phone par decode ka bojh tha.
- Back button scroll yaad rakhta hai — **wahi hai**.
- `?perfdiag=1` panel — **wahi hai**, aur ab ek line extra: `scrollable … · cards … · blank … · skipped …`.

---

## 4 · Aapke liye check (2 minute, phone par pehle)

1. Phone par site kholen → **browser band karke dobara kholen** (ya `Ctrl+Shift+R` / Chrome me
   “Reload” long-press → “Hard reload”). Zaroori hai: purana `sw.js` phone me baitha hai.
2. **Neeche tak scroll karein** — shop page par bhi, home par bhi. Kahin rukna nahi chahiye.
3. Cards ke beech **khaali dabbe** nahi dikhne chahiye — photo ke peeche cream colour rahega, safed nahi.
4. Kisi category par tap → page khule, phir **Back** → wapas wahi jagah.
5. Agar phir bhi atke: URL me `?nofx=1` lagayen (jaise `shivaa.in/?nofx=1`). Agar iske baad scroll theek
   chale, matlab culprit decoration parking hai — mujhe bas itna likh dein, main usi layer ko hata dunga.
   Aur `?perfdiag=1` ka **Copy report** bhej dein.

---

## 5 · Kya nahi badla

Route, price, gold rate, cart, checkout, payment, admin/seller panel, database — **kuch nahi chhua**.
Design me ek bhi cheez nahi hataayi (gold, gradient, shimmer, blur-once sheets — sab wahi).

## 6 · Rollback

Pichla **lagaya hua** build **v244** hai — par wahi toota hua hai, us par wapas na jaayein. Uske pehle
**v241** (jo aapne lagaya tha aur taps ke alawa theek tha). v245 me v237–v244 ka poora kaam hai, isliye
ek hi upload sab jagah le aata hai.
