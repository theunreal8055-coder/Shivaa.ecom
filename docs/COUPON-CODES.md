# COUPON-CODES.md — kaunsa code kisko milta hai, kahan save hota hai, redeem kaise hota hai

Read-only investigation, 18 Oct 2026, against the **v228** tree (`cms/api.php`,
`cms/js/app.js`). Nothing was changed and nothing was deployed. Line numbers are
from this tree, so they drift after the next release — grep the function names.

**The short answer to the three questions:**

1. **Har member ka code alag hota hai** — Shivaa Black ka 16-digit number
   `black_unique_code()` se banta hai (`api.php:4243`), jo pehle se maujood
   **saare** coupon codes aur **saare** members ke card numbers ke against check
   karta hai. Do logon ko ek jaisa code milna namumkin hai.
   (Public offers `MAKING20` / `FREEDEL` sabke liye **same** hote hain — woh
   alag cheez hai, §2.)
2. **Redeem** checkout par hota hai: member ka code pehle se **bhara hua** aata
   hai aur apne aap **apply** ho jata hai (`app.js:6836`, `app.js:6963`). Koi
   type nahi karna padta. Chahe to card page se copy/share bhi kar sakta hai.
3. **Haan, code turant save ho jata hai** — par **coupon list me nahi**. Woh
   usi customer ke record par jata hai: `cms/data/db.json` → `users[i].blackCard`
   (`api.php:5723`, `db_save` at `5728`) + ek `auditLog` entry `black-card.claim`.
   Discount har request par card se **dobara calculate** hota hai, kahin store nahi hota.

---

## 1 · Shivaa Black card — poori zindagi, step by step

| step | kya hota hai | code |
|---|---|---|
| 1 | Customer `#/black-card` (ya product page ke invite card) par naam + registered mobile bharta hai | `app.js:4140-4157` |
| 2 | OTP sign-in hota hai; card **signed-in mobile se bind** hota hai | `api.php:5689` |
| 3 | Server card banata hai: `memberId` `SBM-2026-XXXXXXXX`, `cardNumber` `2020 XXXX XXXX XXXX`, `certificateNo` `SFP-2026-XXXXXXXX`, 6-mahine ki expiry | `api.php:5710-5722` |
| 4 | Card **user record par save** + audit log + atomic `db_save` | `api.php:5723-5728` |
| 5 | Delivery address diya to physical card **FREE** ship queue me (`status: 'to-ship'`) | `api.php:4287-4290`, `5662-5683` |
| 6 | Card + certificate PNG download/share — code us par **print** hota hai | `app.js:4283-4340` (`MEMBER · COUPON CODE`) |
| 7 | Checkout par code **auto-fill + auto-apply** | `app.js:6836`, `6963`, `7071` |
| 8 | Order route wahi discount **server par dobara** calculate karta hai | `api.php:6109`, `6124` |

**Card ka number kaisa dikhta hai:** `2020` branded prefix + 12 random digits,
4-4 ke groups me (`api.php:4249-4251`). `random_int()` — predictable nahi.
80 koshish, warna `RuntimeException` (chupchap duplicate nahi deta).

**Expiry:** 6 calendar mahine, month-end roll-over ke bina — 31 Aug → 28/29 Feb
(`black_six_month_expiry`, `api.php:4234`). Expire hone par card **archive** ho
jata hai ("KEPT FOREVER"), benefit band; number dobara generate nahi hota.

**Kis ko milta hai:** koi bhi **signed-in retail customer** jiske paas valid
10-digit Indian mobile ho. **Free**, koi minimum purchase nahi, koi spend gate
nahi (`api.php:5685-5695` — sirf role + mobile + rate-limit 12/hour).
Admin/B2B accounts ko 403.

---

## 2 · Site par maujood chhe code families

| family | code | unique? | kahan save | kya discount | expiry |
|---|---|---|---|---|---|
| **Shivaa Black** | `2020 XXXX XXXX XXXX` | **har member ka alag** | `users[i].blackCard` (coupon list me **nahi**) | 20% **making charges** par | 6 mahine |
| **Shivaa Premium** | `SHV-P-XXXXXXXX` | har user ka alag, par **derived** (userId ke sha256 se) | sirf `users[i].premium = true` flag; code store hi nahi hota | 20% making charges | **life** |
| **Public offer** | `MAKING20` (owner badal sakta hai: `settings.bannerOfferCode`) | **sabke liye same** — guest bhi | `coupons[]` | 20% making charges | none |
| **Public delivery** | `FREEDEL` | **sabke liye same** | `coupons[]` | shipping ₹0 | none |
| **Birthday / Anniversary** | `BDAY-<userId ke last 4>-2026` | per user per year | `coupons[]` (`forUser` bound) | 5% order par, min ₹10,000 | date + 10 din |
| **Amrita card** | generated unique | per guest | `coupons[]` + `amritaGuests[]` | 20% making, once per user | none |

Public offers `GET /api/offers/banner` par pehli baar **auto-seed** hote hain
(`api.php:5585-5615`) aur tab tak chalte hain jab tak owner
`settings.bannerOfferOn = false` na kare.

---

## 3 · Redeem: server ka lookup order (yehi asli security hai)

`coupon_resolve()` (`api.php:4340`) **ek hi** function hai jo
`POST /api/coupons/validate` aur order route — dono jagah chalta hai:

1. Typed code = **apne** live Black card ka number → virtual Black coupon (20% making).
2. Typed code = **apna** Premium code → virtual Premium coupon.
3. Typed code = **kisi aur** ke card ka number → **`null`** (fail closed,
   `black_code_reserved`, `api.php:4328`). Public coupon me fall-through **nahi** hota.
4. Warna ordinary `coupons[]` list, `coupon_live()` + `coupon_for_user()` ke saath.

**Virtual coupon ka matlab:** Black/Premium coupon kabhi `coupons[]` me likha hi
nahi jata. Har request par card se **banaya** jata hai (`black_coupon_for_user`,
`api.php:4294`). Fayda: card ki expiry db.json me badalte hi benefit turant band —
koi coupon row edit karne ki zaroorat nahi. Nuksan: Admin → Coupons screen par
member codes **dikhte hi nahi** (§5).

**Discount ka math** server karta hai, browser nahi (`coupon_discount`,
`api.php:4157`): `scope = 'making'` → base = sirf making charges × qty; metal,
stones, bullion par **kuch nahi**. Validate route `type: 'making_percent'`,
`eligibleBasis` aur `discount` lautata hai (`api.php:5755-5762`); order route
wahi figure dobara nikalta hai (`api.php:6124`). Making charges ₹0 hon to 400:
*"this bag carries none"*.

**Ek baar me ek code.** Black aur public MAKING20 stack nahi hote — jo pehle
match hua wahi. (Dono 20% making hain, isliye farq bhi nahi padta — §5.4.)

---

## 4 · Customer ko kya dikhta hai

- **Card page** (`#/black-card`): black card visual, `MEMBER / COUPON NUMBER`,
  issued/valid-until, "Locked to +91 XXXXX XXXXX", copy button, **Save / share card**
  (PNG), certificate.
- **Checkout**: `Shivaa Black found — 20% off ₹X making charges` strip +
  coupon box me code **pehle se bhara** + apne aap applied; teen-step progress
  ("2 Verifying → ✓ Mobile verified", "3 Apply saving → ✓ ₹X applied").
- **Product page**: invite card ("Save my personalised card ✦") aur, card hone
  par, us piece par kitna bachega.
- **Guest**: coupon box khali; `MAKING20` / `FREEDEL` type kar sakta hai.

---

## 5 · Jo cheezein abhi **missing** hain (owner ke faisle ke liye)

1. **Admin panel me member list nahi hai.** `GET /api/admin/users` har user ka
   `blackCard` bhejta hai (`pub_user`, `api.php:3722-3732`), lekin Customers
   table sirf Name/Email/Phone/Role/Points/Joined dikhata hai (`admin.js:719-731`).
   Yaani **kaun member hai, uska code kya hai, kab expire hoga** — yeh admin UI
   me kahin nahi. Sirf db.json padhne se pata chalta hai.
2. **Physical card ki shipping queue nahi hai.** Claim par address save hota hai
   aur `delivery.status = 'to-ship'` likha jata hai (`api.php:4289`), par
   **koi screen use padhti nahi** — repo me `to-ship` sirf wahin hai. Owner ko
   "kaunse card print karke post karne hain" ki list nahi milti, aur "shipped"
   mark karne ka rasta bhi nahi. Card FREE promise kiya gaya hai.
3. **Renewal ka rasta nahi hai.** 6 mahine baad card expire → `black-card/claim`
   idempotent hai (`api.php:5699-5706`: sirf missing delivery address bharta hai),
   isliye naya card kabhi nahi banta. Renew karne ka ek bhi route nahi. Purana
   member dobara benefit chahe to db.json haath se edit karna padega.
4. **Black ka discount exclusive nahi hai.** Public `MAKING20` **har** customer
   (guest bhi) ko wahi 20% making charges deta hai. To Black card ki asli value
   physical card + certificate + status hai, extra discount nahi. Agar Black ko
   sach me premium banana ho: `settings.bannerOfferOn = false`, ya public offer
   ko 10% karo, ya Black ko 25%.
5. **Chhoti doc galti:** `api.php:5629` ka comment Premium card ko *"free home
   delivery for LIFE"* kehta hai, par code jo deta hai woh **20% off making
   charges for life** hai (`api.php:4312-4320`, `freeShipping => false`), aur UI
   bhi wahi kehta hai (`app.js:12222`). Comment purana hai — behaviour sahi hai.

Chahe to in me se koi bhi **v229** me bana deta hoon. Sabse zyada kaam ka
combination: **Admin → Shivaa Black** tab (members + codes + expiry + filter) aur
**Cards to ship** queue (print list + "shipped" mark). Renewal aur offer-gap ek
chhote release me aa sakte hain.

---

## 6 · Sandbox me kya verify hua, kya nahi

- **Padha gaya (authoritative):** `coupon_resolve`, `black_unique_code`,
  `black_coupon_for_user`, `premium_coupon_for_user`, `coupon_discount`, teeno
  black-card routes, order route ka coupon hissa, checkout prefill/auto-apply,
  certificate canvas, admin users route + Customers table.
- **Chala nahi:** is sandbox me **PHP nahi** hai, isliye `api.php` execute nahi
  hua. `qa/preview_shim.py` black-card claim/GET mirror karta hai (UI tests ke
  liye), par uska `coupons/validate` **sirf static coupon list** dekhta hai —
  `coupon_resolve` ka Black/Premium/fail-closed branch mirror nahi karta. Matlab
  redemption ka server-side behaviour **code-reading se** confirm hua hai,
  live server par chala kar nahi.
- **Logic transcription check (19/19 pass, repo me ship nahi kiya):**
  `black_unique_code`, `coupon_resolve`, `black_coupon_for_user`,
  `premium_coupon_for_user` aur `coupon_discount` ko line-by-line Node me
  likh kar chalaya. Result: 3 members → 3 alag codes (1000-member batch me bhi
  koi duplicate nahi); ₹1,00,000 order / ₹12,000 making → **₹2,400** off;
  doosre member ka code, guest ka code, re-bound mobile, expired card, admin
  account — **sab null** (fail closed); public `MAKING20`/`FREEDEL` guests ke
  liye chalte rahe; Premium code kahin store nahi hota, har baar recomputed.
  Yeh script jaan-boojh kar `qa/` me nahi daali: woh **meri reading** ko test
  karti hai, asli PHP ko nahi — `api.php` badalne par bhi green reh sakti thi,
  jo jhoothi tasalli hoti.
- Live par khud check karne ka tareeka: phone/PC par sign in → `#/black-card` →
  card banwao → code copy karo → checkout me dekho (pehle se bhara + auto-applied
  hona chahiye). Phir **doosre** number se sign in karke wahi code type karo —
  "Invalid coupon code" aana chahiye. (`/api/black-card` session token maangta
  hai, isliye plain `curl` se nahi khulega.)
