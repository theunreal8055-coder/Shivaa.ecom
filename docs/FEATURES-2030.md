# SHIVAA 2030 — Futuristic Feature Roadmap (15 Sep 2026)

Owner asked: *"list more features which are 2030-like."* Plain-language menu below.
Rule for all of these (owner's law): nothing fake — every feature must run on real
data (live rates, real HUIDs, real catalogue). Items marked **FOUNDATION EXISTS**
already have a starting point in the code.

## Tier 1 · Flagship "wow" (phased over months, needs 3D/AI work)

1. **AR virtual try-on** — point the phone camera at your hand and see the actual
   ring on your own finger; earrings on ears, necklace on neck. Needs 3D models
   of designs (built design-by-design, starting with 10 bestsellers).
2. **"See it on a hand like mine"** — upload one hand photo, AI shows the ring
   wearing on it. The 2D shortcut to AR; works with today's AI, no 3D needed.
3. **3D spin view** — rotate/zoom every piece on the product page. Same 3D models
   as AR feed this.
4. **AI jewellery consultant (chat)** — "show me bridal sets under ₹2 lakh" and it
   answers from the real catalogue. The old Saathi bot was removed *ahead of
   Gemini* — this is its planned successor. **FOUNDATION EXISTS** (catalogue API).
5. **Voice shopping in Hindi/Marwari** — speak to search, ask "aaj sone ka bhav?",
   hear the price read out. Built for our Nagaur/Jayal customers.
6. **Custom design studio** — customer describes a design ("peacock band, 6 g"),
   AI shows a preview, our jeweller confirms makability + price. Feeds the
   3-lakh-design catalogue vision instead of fighting it.

## Tier 2 · Trust & transparency (jewellery's #1 buying reason)

7. **Price-breakup X-ray** — tap any price, watch it split live: metal value (at
   *this second's* rate) + making + stones + GST. **FOUNDATION EXISTS** (bill
   breakup already computed; this makes it the hero).
8. **Tap-to-lock live rate** — rate moving on screen, one tap locks your price
   for 48 hours. **FOUNDATION EXISTS** (48 h quote validity + checkout rate-lock
   clock already live).
9. **Pre-dispatch video verification** — see YOUR piece on a live video call from
   the shop before it ships. **FOUNDATION EXISTS** (`#/videoconsult` page).
10. **Digital certificate vault** — HUID + bill + assay + photos in the customer's
    locker, transferable on gift/resale, one-tap buyback lookup. Needs real HUIDs
    from the supplier first (catalogue is `not_provided` today — process fix, then
    this feature).
11. **Rate history vs today** — "22K today vs 30-day average", factual charts, no
    fake predictions. **FOUNDATION EXISTS** (rate history API already serves it).

## Tier 3 · Money & loyalty (keeps customers for life)

12. **"Your jewellery portfolio"** — everything you bought from Shivaa, repriced at
    *today's* live rate, with one-tap buyback quote. Our 100% buyback promise made
    visible. **FOUNDATION EXISTS** (buyback page + live rates + order history).
13. **Swarna Nidhi 11+1 plan, activated** — ledger, installment reminders, pay
    online. **FOUNDATION EXISTS** (page + copy already live, needs the ledger).
14. **Smart alerts** — "your wishlisted ring got ₹1,200 cheaper today" (rate-linked),
    festival reminders (Dhanteras, Bhai Dooj, wedding season). **FOUNDATION EXISTS**
    (rate-alert form + wishlist).
15. **Family accounts** — shared shortlists, gifting with surprise reveal, Bhai Dooj
    gifting flow.
16. **One-tap WhatsApp checkout** — cart → WhatsApp order with payment link. We are
    already a WhatsApp shop; this formalises it. **FOUNDATION EXISTS** (wa order
    messages throughout).
17. **Video shopping nights** — weekly live "new designs" show on the site, tap to
    buy while watching.

## Tier 4 · Comfort (uncle/aunty-friendly)

18. **Hindi (+ Marwari) toggle** — full storefront in the customer's language.
19. **Big-text "Aunty mode"** — large fonts, price readout aloud, extra-simple
    checkout.
20. **AI size predictor** — 3 questions (or one photo with a coin for scale) → ring
    size recommendation. **FOUNDATION EXISTS** (ring sizer page).

## Tier 5 · B2B partner superpowers

21. **Partner ledger + settlement tracking** — fine-metal grams ledger, dues,
    rate-lock for bulk orders. **FOUNDATION EXISTS** (design selection + bullion
    board live).
22. **Supplier auto-intake** — supplier drops photos + weights → designs auto-stage
    into the catalogue pipeline. This is the 10,000–15,000 images/hr vision from
    the 6 Sep plan (Replicate batch + budget cap + A/B gate).
23. **AI catalogue QC** — auto-reject bad supplier photos (price tags in frame,
    wrong purity marks, blurry). **FOUNDATION EXISTS** (`tag_scan.py` + zoom gate).

## Suggested phasing

- **v120 (next):** bug fixes (rates blank page, category photos) + owner's pick
  from the v120 menu (WhatsApp alerts / old-gold calculator / Hindi / etc.).
- **v121–v122:** portfolio value, tap-to-lock rate, rate history, size predictor —
  all build on live foundations.
- **6-month bets:** AR try-on pilot (10 designs), AI consultant, Swarna Nidhi
  ledger, supplier auto-intake.
- **Needs partners/process first:** certificate vault (needs supplier HUIDs),
  XRF assay reports (needs assay partner), live courier tracking (needs courier
  account).
