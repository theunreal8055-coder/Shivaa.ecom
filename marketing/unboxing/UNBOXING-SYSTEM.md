# The Black Box — Shivaa's unboxing system for the 20 % card

**Prepared:** 1 Nov 2026 · **For:** Shivaa Jewels, Jayal (Nagaur), Rajasthan
**Status:** plan + print-ready copy + measurement specs. No vendor has been booked, no box exists yet.

You asked for: a smartphone-type box, the 20 % card inside instead of a phone,
a 0.500 g silver logo sheet for marketing with your number and message, and two
booklets (English + Hindi) about the app and its benefits. This document builds
exactly that, then adds 18 ideas and the honest guardrails.

---

## 0 · The facts this document is built on

Every claim below is taken from your own live site source, not from memory:

| Fact | Value | Where it comes from |
|---|---|---|
| Card name in the app | **Shivaa Black** | `cms/js/app.js` `#/black-card` |
| The privilege | **20 % off making charges only** — never metal, stones, GST, shipping | `blackPct()`, `cms/api.php:4931` |
| Validity | **six months**, renewable free **in the last 30 days** (or after expiry) | `black_six_month_expiry()`, `POST /api/black-card/renew` |
| How a card is created | OTP sign-in with the registered mobile → `POST /api/black-card/claim`; the app makes `memberId` (SBM…) + `cardNumber` | `cms/api.php:6537` |
| The physical card | delivered **free**, bound to the verified account | `#/black-card/physical` |
| A second 20 % product exists | **"Premium card"** — 20 % for **life**, claimed from the public banner | `cms/api.php:4945`, `premiumCardHTML()` |
| Shop | Shivaa Jewels Jayal, Main Road, Jayal, Rajasthan 341023 | `cms/index.html` JSON-LD |
| Legal entity | Ernate Shine Jewellery Private Limited | site footer |
| Phone / email / IG | +91 89050 05921 · Support@shivaa.in · @shivaa.jewels | site header/footer |
| Brand type | Marcellus (display), Cormorant Garamond, Jost (text) | `cms/fonts/` |
| Brand colour | gold `#b98a2f` / `#d4af5a`, maroon `#6e1e2a`, ink `#2b2118`, cream `#faf6ef` | `cms/css/styles.css` |
| Logo | "Shivaa INC." script, dark navy | `cms/images/logo.png` |

**The one thing to settle before the printer starts** — see §1.

---

## 1 · Decide this first: which 20 % is on the plastic?

Your site has **two different 20 % products**, and a printed box cannot say both:

| | Shivaa Black (member card) | Premium card (banner offer) |
|---|---|---|
| What | the boxed card | claimed from the home-page banner |
| Term | **6 months**, renewable | **for life** |
| Physical card | yes, delivered free | no |
| Discount | 20 % off making charges | 20 % off making charges |

**Recommendation: the box carries the Shivaa Black card**, and every printed line
says *"six months, renewable"* — because:

1. The plastic is bound to an account that already expires in six months. If the
   box prints *"for life"*, the customer has a card in her purse that contradicts
   her own app on day 181. That is the single most expensive wording mistake
   available here.
2. **Six months is better marketing than lifetime.** A renewal is a reason to
   come back with the box in hand, on a date you control. "For life" is a reason
   to never think about you again.
3. Renewal is free and one tap, so the honest sentence is *"free to renew,
   every six months"* — that reads generous and is literally true.

If you would rather box the lifetime Premium card, say so and I will re-roll
§5–§7 copy to match; the structure of this document does not change.

---

## 2 · The box, in millimetres

Phone-box feel comes from **proportion and weight**, not from size. A rigid box
that is 22 mm deep in the hand feels like a phone; a 60 mm deep one feels like a
sweet box.

```
OUTER SLEEVE            176 × 96 × 24 mm   printed artwork, slides off
LID (rigid)             175 × 95 × 18 mm   1200 gsm grey board + 157 gsm wrap
BASE (rigid)            175 × 95 × 22 mm   magnetic close, ribbon pull
TRAY (insert)           168 × 88 × 12 mm   2-layer: card well on top, booklet below
CARD WELL                90 × 58 mm        card 85.6 × 54 + 2 mm each side
THUMB NOTCH               r 12 mm half-circle at the well's lower edge
BOOKLET BAY             148 × 88 × 6 mm    holds one 24-page A7-ish booklet
SILVER POCKET            55 × 40 mm        glassine envelope, tarnish strip inside
RIBBON                180 × 12 mm satin    under the card, 15 mm tail out
```

**Contents, top to bottom** (this order is the whole trick — see §3):

1. Card, in its well, ribbon under it
2. Silver sheet, in its envelope, in a pocket beside the card *(not under it —
   a customer who lifts the card must not drop the silver)*
3. One bilingual booklet, in the bay under the tray
4. A hand-numbered certificate of authenticity, 85 × 120 mm, resting on the booklet
5. Nothing else. Empty space is a luxury signal; a full box reads like a hamper.

**Materials**

- Board: 1200 gsm grey board, 2.0 mm, wrapped in 157 gsm matt art paper.
- Inside lining: **uncoated cream** (`#faf6ef`). Black-on-white outside, cream
  inside — the cream is what makes the card look like it is lying on silk.
- Foil: **Pantone 871 C** gold metallic, hot foil, plus **blind emboss** on the
  logo. Foil on black board is the cheapest way to look expensive.
- Spot UV on the sleeve's ring motif only. No full-surface gloss — it shows
  fingerprints in photos, and unboxing is photographed.
- Closure: two 6 mm neodymium magnets in the lid, base-side steel shim. No
  ribbon tie (people cannot retie it, so the box never gets reused).

**Dieline files:** `mockups/`, and the printer brief in `PRINT-SPECS.md`.
Bleed 3 mm, safe 4 mm, CMYK + 1 Pantone 871 C + 1 Pantone 202 C (maroon), 300 dpi.

---

## 3 · The unboxing sequence — eight moments, 19 seconds

Design for a camera held one-handed at chest height, because that is how it will
be filmed. Each moment has a job:

| # | Moment | What the customer sees | Seconds |
|---|---|---|---|
| 1 | Sleeve slides off | hand-numbered seal `No. 0142 / 0500` | 3 |
| 2 | Lid lifts (magnet resists, then gives) | cream interior, gold ring pressed into the lid foam | 2 |
| 3 | First read | card alone in its well, cream on gold | 3 |
| 4 | Lift the card | ribbon, then the **member's name printed** underneath | 2 |
| 5 | Notice the silver | 20 mm silver square, engraved, in a glassine sleeve | 3 |
| 6 | Open the booklet | page 1 is a single Hindi line, not a list | 3 |
| 7 | The QR | one code, three jobs (§6.3) | 2 |
| 8 | Close the lid | inside-lid line: *"Rakh lijiye. Agli baar isi dibbe mein lenge."* | 1 |

**Rules that make it film well**

- One focal point per layer. Never two objects visible at the same height.
- The card must be **the brightest thing** in the box. Cream card on black
  board; if the card is black, nothing photographs.
- No plastic windows, no polybag, no tape. Glassine and paper only.
- The name is printed, not written by hand, on the card; the *certificate* is
  hand-numbered and hand-signed. Machine + hand is the premium signal.

---

## 4 · The 0.500 g silver sheet

### 4.1 The arithmetic (so the weight is real, not a claim)

Silver 999 density 10.49 g/cm³.

```
0.500 g ÷ 10.49 g/cm³        = 0.04766 cm³ of metal
at 0.12 mm thickness         = 0.04766 ÷ 0.012 cm = 3.97 cm² of face
√3.97 cm²                    = 1.99 cm  →  a 20 × 20 mm square
```

So **20 × 20 mm at 0.12 mm nominal thickness = 0.500 g of 999 silver.** Ask the
supplier to stamp or laser the actual weight on the back (`0.500 g · 999`), and
to keep a ±0.02 g tolerance. Print the tolerance in the certificate; a customer
who weighs it on a jeweller's scale must find what you promised.

If the supplier's sheet is sold in 0.10 mm or 0.15 mm, the size moves, not the
weight:

| Thickness | Side of square for 0.500 g |
|---|---|
| 0.10 mm | 21.8 mm |
| 0.12 mm | 20.0 mm |
| 0.15 mm | 17.8 mm |

**Material note:** 0.12 mm silver is a foil, not a plate. It bends under a
thumbnail. That is fine for a keepsake and wrong for anything worn daily — say
so plainly in the booklet instead of letting a customer discover it.

### 4.2 What is engraved on it (face, 20 × 20 mm)

Laser-engraved or diamond-cut; minimum line width 0.15 mm, minimum text height
1.2 mm or it fills in.

```
┌────────────────────┐
│   Shivaa  (logo,   │   logo: 11 mm wide, centred, 1.5 mm from top
│   simplified)      │
│  ──────────────    │   rule: 0.2 mm
│  +91 89050 05921   │   number, 1.6 mm cap height
│  shivaa.in         │   1.4 mm
│  0.500 g · 999     │   back face only
└────────────────────┘
```

**Do not engrave:** a price, a rate, a date, or "20 %" — the number lives on the
card and in the app, and a rate on metal becomes false the next morning.

### 4.3 The mechanic that pays for itself

The sheet is a **come-back token**, not a giveaway:

> Bring this silver back to the shop within 12 months and we will take it in at
> that day's silver rate against any purchase — the marketing value stays with
> us, the metal never leaves the family.

- Value of 0.500 g at today's rate is small in rupees, which is exactly why this
  works: it costs you almost nothing and gives her a **reason to walk in**.
- It must be worded as *"taken in at the day's silver rate, less any making, at
  our discretion, against a purchase"* — never "cash", never a fixed rupee figure.
- Renewal + silver return + free cleaning = three separate reasons to return.
  One box, three visits.

### 4.4 Keeping it silver

- Pack with a **tarnish-inhibitor strip** in the glassine sleeve. No PVC, no
  self-seal plastic bag (PVC yellows and stains silver).
- Booklet page 10: *"Chandi hawa se kala ho jaati hai — lifafe mein hi rakhein,
  aur saal mein ek baar dukaan par saaf karwa lein, free."* Free cleaning is the
  cheapest reason to visit that exists.
- If you ever sell the silver as jewellery rather than gifting it as a keepsake,
  BIS hallmarking applies. As a gift item it does not — but keep the supplier
  invoice and purity certificate in your files anyway.

---

## 5 · The card

Size ISO/IEC 7810 ID-1: **85.60 × 53.98 mm**, corner radius 3.18 mm.

**Material choice, in order of what actually photographs well**

| Option | Cost cue | Verdict |
|---|---|---|
| 0.6 mm brass, gold PVD, laser engrave | highest | best in hand and on camera; corners can ding, so ship in its well, never loose |
| 0.8 mm matt black PVC, gold foil + spot UV | middle | the sensible default for 500 pcs |
| 350 gsm cotton card, letterpress | lowest | feels like a wedding invite, not a membership — skip |

**Front**

```
        SHIVAA  (logo, foil gold)
        ─────────────────────────
        SHIVAA BLACK
        MEMBER SINCE 11 / 2026
        Priya Sharma                    ← personalised, printed
        SBM 0042 · CARD 0001 0421       ← memberId · cardNumber
        20 % OFF MAKING CHARGES
        SIX MONTHS · FREE TO RENEW
                                    [QR]
```

**Back**

```
20 % off the making charges only, on every Shivaa jewellery purchase.
Not on metal, stones, GST, shipping or any other component.
Valid six months from issue. Renew free at shivaa.in/#/black-card.
This card is bound to +91 89050 05921's verified account holder.
Not transferable. Not a payment instrument. Not a credit card.
Shivaa Jewels · Ernate Shine Jewellery Pvt. Ltd. · Jayal, Nagaur 341023
support@shivaa.in · shivaa.in
```

**Three rules**

1. **Never print "for life"** unless the account says lifetime (§1).
2. **The QR must be a URL you control**, not a wrapped shortener:
   `https://shivaa.in/#/black-card`. A dead QR on 500 cards is 500 broken promises.
3. **Print the mobile number she registered with nowhere.** Put the number that
   *you* answer. A card that prints the customer's number is a card you must
   reprint every time she changes it.

**The personalisation step is the bottleneck, not the printing.** Cards are
printed after the claim, in batches of 25, with a 7-day promise. If you print
500 blanks first, you own 500 cards that cannot be activated (§13 explains how
to fix that properly in code).

---

## 6 · The booklet

### 6.1 One booklet or two?

You asked for two, English and Hindi. Three ways to do it:

| Approach | Pages | Feel | Cost |
|---|---|---|---|
| **A. One bilingual booklet, flip sides** — English 1–12, then turn it over, Hindi 13–24 | 24 pp, saddle stitch, two colourways on the cover | one object, one story, cheaper; the Hindi reader is not made to feel second | **recommended** |
| B. Two slim booklets, 12 pp each, both in the bay | 24 pp total | the "two little books" reveal | +15–20 % |
| C. One booklet, English with Hindi underneath on the same page | 16 pp | cheapest, busiest, worst line length | — |

Recommendation: **A**, at 148 × 88 mm (fits the bay exactly), 24 pages,
100 gsm uncoated cream inside, 250 gsm cover with gold foil, saddle-stitched
with two visible stitches in gold thread. Two stitches, not three — three reads
as a school notebook.

If you want B, the copy decks in `copy/` are already split so page 1–12 English
and page 1–12 Hindi stand alone as separate booklets. Nothing to rewrite.

### 6.2 Page map (A — bilingual, 24 pp)

| Page | English face | Hindi face |
|---|---|---|
| 1 | Cover: `A little black box.` | आवरण: `एक छोटा काला डिब्बा।` |
| 2 | What is in this box | इस डिब्बे में क्या है |
| 3 | A note from the family | परिवार की ओर से |
| 4–5 | What Shivaa Black is — and what it is not | शिवा ब्लैक क्या है — और क्या नहीं |
| 6 | Your card, read line by line | आपका कार्ड, लाइन दर लाइन |
| 7 | Three steps to make it work | तीन कदम |
| 8–9 | The app: what it does for you | ऐप: आपके लिए क्या करता है |
| 10 | The silver in your hand | आपके हाथ की चांदी |
| 11 | Care, and free cleaning for life | देखभाल, और जीवनभर मुफ़्त सफ़ाई |
| 12 | Renewal: one tap | नवीनीकरण: एक टैप |
| 13 | Bring a friend | किसी अपने को लाइए |
| 14 | Where we are | हम कहाँ हैं |
| 15 | The plain-words terms | सरल शब्दों में शर्तें |
| 16 | Back cover: QR, phone, address | पिछला आवरण |

*(The same twelve pages run again in Hindi — pages 13–24 — so the booklet is 24
physical pages: 12 English, turn it over, 12 Hindi. Both decks are written in
full in `copy/` and the page numbers match one for one, so a change on one side
is a change on the other.)*

### 6.3 The QR does three jobs

One code, on the card back, the booklet back cover, and the inside lid:

```
https://shivaa.in/#/black-card
```

1. **Activate / open the card** — OTP sign-in with the registered mobile, then
   `POST /api/black-card/claim`. This route already exists and already binds the
   card to the mobile.
2. **Watch 40 seconds** — a video on that page: *"your 20 % kahan lagta hai"*,
   with the making-charge arithmetic on screen (`20 % of making × qty`), because
   the number one question at the counter is *"kitna milega"*.
3. **WhatsApp us** — a `wa.me/918905005921?text=` link pre-filled with the
   member number, so a support chat starts with the card already identified.

---

## 7 · Copy

Every printable line, in both languages, with the arithmetic and the legal lines
already written: **`copy/COPY-EN.md`** and **`copy/COPY-HI.md`**.

House rules applied to print, same as the site:

- The only percentage anywhere is **20**, the making charge only. No second
  number in any sentence, including the fine print.
- No "best", "guaranteed", "100 %", "cheapest", "No. 1". If it cannot be
  measured, it is not printed.
- No invented purity, HUID, or certification claim. Hallmark is described, never
  promised per piece.
- Hindi is written, not transliterated. Devanagari for everything except
  `Shivaa`, `shivaa.in`, numbers and units.

---

## 8 · Eighteen more ideas

### Inside the box (costs paise, changes the feel)

1. **Hand-numbered certificate** `No. 0142 / 0500`, signed in ink by you. The
   only hand-made object in the box, and the one people photograph.
2. **A "for" line on the sleeve**: `For ____________`, printed as a fill-in.
   Turns stock into a gift without a reprint.
3. **Inside-lid line** in gold foil: *"Rakh lijiye. Agli baar isi dibbe mein
   lenge."* — the single cheapest instruction that makes the box get reused.
4. **Today's rate, printed on the certificate**: `Silver ₹___/g on ___`. Fill it
   in at packing. It dates the box, proves it was packed by a human, and teaches
   *"rate roz badalta hai, isliye app"* in one line.
5. **The renewal date pre-printed**: `Aapka card 11 May 2027 tak`. The customer
   does not have to work out six months, and you have booked the next visit.
6. **A blank "gift to" card + envelope**, 90 × 60 mm, so she can pass the box on
   without buying anything.
7. **A ring sizer strip** (paper, printed, 60 × 120 mm) with the app's `#/sizer`
   QR. It is the most-returned-to page in any Indian jewellery site and it costs
   nothing to add.

### Around the box (marketing)

8. **Serial → activation:** every box has a serial that also appears in the app
   (§13). You will be able to answer *"how many boxes turned into members"* —
   the only number that matters. Today nobody can answer it.
9. **The 20-second unboxing prompt** printed on the tray edge: *"Ek reel banaiye,
   @shivaa.jewels tag kijiye"* + a prize that is not a discount (a free cleaning
   for a year, a silver polish kit). Discount prizes train discount-hunting.
10. **One box, many sleeves.** The sleeve is the only printed campaign surface.
    Diwali sleeve, wedding-season sleeve, Jayal-mela sleeve — same box, same
    tray, ₹40 of print per campaign instead of ₹400.
11. **Counter ritual.** In the shop, staff hand it over **closed** and let the
    customer open it. A box that is opened by the person who is not paying is a
    box wasted.
12. **The three-day WhatsApp**: `Aapka card chalu hua? (1) Haan (2) Nahi —
    madad chahiye`. One question, one reply, and you learn your activation rate.
13. **Bridal variant**: same box, maroon sleeve, booklet page 3 replaced with a
    6-line blessing for the bride, and the silver sheet engraved with the
    wedding date instead of the number. Same tooling, higher price point.
14. **Corporate/bulk variant**: 20 boxes for a jeweller's referral network, each
    with the partner's name on the certificate — your bullion desk already has
    those relationships (`#/partner`).

### After the box (the part that compounds)

15. **Renewal as an event, not a reminder.** The app already opens renewal in the
    last 30 days. Print the date; send one WhatsApp on the date; offer a free
    polish with it.
16. **The silver return is a counter visit.** §4.3. Track it: *returned* vs
    *kept* tells you whether the token is working.
17. **Box-as-warranty.** Tell her the bills live in `#/my-bills` and the box
    serial is on her account. She keeps the box because the box is the receipt.
18. **Measure cost per activated member, not cost per box.** If a box costs
    ₹480 and 60 of 100 activate and buy, the cost per member is ₹800 — cheap. If
    12 of 100 activate, it is ₹4,000 — expensive. Print the serial, count the
    activations, and stop guessing.

---

## 9 · Production: who to hire, what it costs

**Four vendors, not one.** A single "packaging guy" will give you a beautiful
sample and a bad batch.

| Job | Type of vendor | Jaipur area to ask | MOQ reality |
|---|---|---|---|
| Rigid box + foil + emboss + magnet | rigid-box maker | Sitapura industrial area, Sanganer | 300–500 pcs typical |
| Booklet printing + saddle stitch | offset printer | Sitapura / MI Road printers | 500 pcs typical |
| Metal/PVC cards + personalisation | card specialist (Delhi/Mumbai usually) | ask for "loyalty card, variable data" | 100 pcs, 7-day reruns |
| 0.500 g silver sheets, laser engrave | bullion/silver sheet supplier + laser job work | Johari Bazaar silver suppliers | 100 pcs |

**Cost formula (fill in the quotes — I will not invent your supplier prices)**

```
per box = box + sleeve + insert + card + silver + booklet + certificate + labour
        =  B  +   S   +   I    +  C   +   Ag    +   P     +     K       +   L
```

Ranges I would *expect* in Rajasthan in 2026, to sanity-check a quote — **not
prices to budget on**:

| Line | Expected range per box |
|---|---|
| rigid box + foil + magnet | ₹110 – ₹190 |
| printed sleeve | ₹25 – ₹45 |
| 2-layer insert | ₹22 – ₹40 |
| card, variable data | ₹55 – ₹130 (PVC → brass) |
| 0.500 g 999 silver, engraved | *(0.5 g × today's silver rate) + ₹45 – ₹90 making* |
| booklet, 24 pp | ₹22 – ₹38 |
| certificate + envelope | ₹6 – ₹12 |
| labour, packing, seal | ₹10 – ₹18 |

For 500 boxes that is roughly **₹2.4 – ₹4.6 lakh plus the silver**. Get three
quotes per line, and ask each vendor for **one physical sample before the run** —
samples are ₹1,500–3,000 and they are the cheapest insurance in this project.

**Timeline, if you start this week:** samples 7–10 days · approvals 3 days ·
production 18–22 days · silver + cards after member data 7 days · **≈ 5 weeks to
first 25 boxes.**

---

## 10 · Packing-day QC (one page, pin it on the wall)

Every box, checked by a second person:

- [ ] Serial on the box = serial on the certificate = serial in the app record
- [ ] Name on the card matches the name on the account, spelled as she wrote it
- [ ] Card number and member ID printed, not blank
- [ ] Expiry date = issue + 6 calendar months, and it matches the app
- [ ] Silver in the glassine sleeve, tarnish strip present, weight line readable
- [ ] QR scanned once **by a phone that is not yours** — lands on `#/black-card`
- [ ] Booklet: no missing pages, both languages present, stitched, not glued
- [ ] No finger marks on foil (cotton gloves for the whole packing table)
- [ ] Lid closes with a soft click and no gap at the corners
- [ ] Weigh 1 in 20 boxes on a jeweller's scale: card + silver + paper tally

---

## 11 · What to measure

| Number | How | Why |
|---|---|---|
| boxes printed | vendor invoice | the denominator |
| boxes handed over | serial list per outlet | the real distribution |
| claims activated | `blackCard.createdAt` per serial (§13) | the only conversion that matters |
| activations within 7 days | serial handover date vs claim date | is the box's copy working? |
| first purchase within 60 days | order list, member flag | does 20 % produce a sale or a discount hunter? |
| renewals at 6 months | `blackCard.renewals` | did the box buy you a second visit? |
| silver returned | counter log | did the token work? |
| cost per activated member | ₹ spent ÷ activations | the number to defend at the counter |

Pilot first: **25 boxes**, one handover script, two weeks, then read the numbers
before you print 500. If 25 does not activate, 500 will not either.

---

## 12 · Guardrails (your standing rules, applied to print)

1. **Nothing goes to print before the owner's yes.** Same rule as a deploy.
2. **One percentage.** 20, making charges only, everywhere, including fine print.
3. **No claim you cannot prove.** No "best", no invented purity, no invented
   founding year, no fabricated customer count, no "100 % hallmarked" per piece.
4. **Term must match the account.** Six months, renewable — unless §1 is decided
   otherwise in writing.
5. **The QR points at a URL you own**, on your domain, not a third-party
   shortener that can expire.
6. **Weight on the metal is the weight on the certificate is the weight in the
   scale.** ±0.02 g tolerance printed.
7. **No plastic** (PVC bags, acetate windows). Glassine, paper, board. It is
   also the cheaper option and it is what Indian EPR rules push you towards.
8. **Testimonials are somebody's actual words or they do not exist.** If you
   want a quote in the booklet, it comes from a real named customer with her
   permission — otherwise the page stays a promise, not a quotation.

---

## 13 · What I can build in code for this (v237 candidate)

The box is print. Three small things in the app make the box *work*, and none of
them exist yet:

| # | What | Why it is needed |
|---|---|---|
| 1 | **Printed-serial activation**: `POST /api/black-card/activate { serial }` — binds a pre-printed serial to the signed-in member, refuses a serial already used, writes `serial` into `blackCard` | today the card is created from the account and gets a **new** number; a pre-printed card can never match it, so the plastic in the box and the card in the app are two different objects |
| 2 | **Serial registry + admin screen**: `GET /api/admin/black-card/serials` (list, status, member, date), CSV export | so you know how many boxes became members (§11) |
| 3 | **Claim page copy for a box**: `#/black-card/activate` — one field, the serial, then OTP, then `Your card No. 0142 is now yours` | the QR needs somewhere to land that asks for the serial |

Add to that a **box-serial field on the printed certificate** so the physical
chain is unbroken. That is one release, roughly the size of v235, and the gate
would be a `t-v237-box` suite proving: a serial activates once, a second claim is
refused in words, a spent serial cannot be re-bound, and the admin list matches.

Say the word and I will build it as **v237** — it changes no price and moves no rate.

---

## 14 · Photo and film shot list

For the product shots and the 40-second film, once one sample box exists:

1. Flat lay, closed, on cream linen, top light, no shadows on foil
2. Sleeve half-off, seal visible in focus
3. Lid lifting, 30° open, cream interior glowing
4. Card in well, straight down
5. Hand lifting the card by the ribbon
6. Silver square on a fingertip (shows the real size)
7. Booklet open at page 1, Hindi side
8. All contents laid out in a row, in the order they are unpacked
9. Extreme close: engraving on the silver, raked light
10. Extreme close: the customer's name on the card, raked light

Film: 40 s, vertical, **no music with a beat drop** — the sound design is paper,
magnet, paper. Text on screen: the arithmetic of 20 %, then the phone number.

---

## 15 · Five questions for you

1. §1 — **Black (six months, renewable)** or **Premium (lifetime)** card in the box?
2. One bilingual booklet (recommended) or two separate slim booklets?
3. Card material: matt black PVC (default) or brass gold (best in hand, +cost)?
4. How many boxes first — 25 pilot, or straight to 250?
5. Do you want me to build **v237 = serial activation + admin serial list** so
   the printed card and the app card can be the same object?

---

**Files in this folder**

```
UNBOXING-SYSTEM.md      ← this plan
PRINT-SPECS.md          ← hand this to the printer and the box maker
VENDOR-BRIEF.md         ← copy-paste WhatsApp message per vendor, in Hinglish
copy/COPY-EN.md         ← every English line, final text
copy/COPY-HI.md         ← every Hindi line, final text
mockups/                ← print-ready SVG layouts (box, card, silver, booklet)
preview.html            ← open in a browser to see all mockups together
```
