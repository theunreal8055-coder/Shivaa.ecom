# SHIVAA — Supplier Portal (manufacturer / karigar side)

Alag portal, alag login, alag domain path: **`shivaa.in/suppliers`** (public landing) →
GST verify → **`shivaa.in/supplier/dashboard`** (locked app).

Jeweller portal = **demand** side (buys).
Supplier portal = **supply** side (manufacturers, wholesalers, karigar units — banate aur bhejte hain).
Dono ke beech Shivaa = catalogue, rate, settlement aur bharosa.

---

## 0. Public landing page — `/suppliers`

| Block | Content |
|---|---|
| Hero | "अपना कारख़ाना, पूरे भारत के जौहरियों तक" + *Apply as supplier* button |
| Numbers | verified jewellers on platform · orders/month · average payout days |
| Why Shivaa | zero listing fee · ready demand · on-time settlement · no bad debt (Shivaa guarantees payment) · free product photography |
| Kya chahiye | GST · BIS/hallmark tie-up · minimum capacity · categories |
| Kaise chalta hai | 4 steps: apply → verify → catalogue upload → orders start |
| FAQ | rate kaise tay hoga, wastage/MC kaise set karein, payment kab milega, return policy |
| CTA | GST number field → OTP → application form |

---

## 1. Onboarding & KYC (ek baar)

- **GST number** → auto-fetch legal name, address, status (same verification as jeweller side)
- PAN · Udyam/MSME · firm type (proprietor / partnership / pvt ltd)
- **BIS hallmark registration** number + hallmarking centre tie-up
- Bank account + cancelled cheque + UPI (payouts ke liye) · optional **metal account** (gold loan / grams)
- Signed supplier agreement (e-sign) + commission/margin sheet
- **Capability profile** — ye sabse important hai:
  - categories: rings · chains · mangalsutra · bangles · bridal sets · temple · kundan · meena · CZ · machine-made
  - processes: casting · CNC · hand-made · meenakari · stone setting · electroforming
  - purity range: 14K / 18K / 22K / 24K bullion
  - weight range per piece (min–max grams)
  - **daily capacity** (grams/day aur pieces/day)
  - karigar count · lead time (ready stock vs made-to-order days)
  - MOQ (minimum order) · service pincodes
- Status flow: `Applied → Documents verified → Sample approved → Live`

---

## 2. Catalogue manager (dil hai portal ka)

- **Bulk upload** CSV/Excel — aapke मौजूदा schema par: `sku, name, category, metal, purity, weight, mc, sizes, stoneDesc, tags, img`
  (extend: `wastage%, moq, leadTimeDays, stockType, hsn, huid, netWeight, grossWeight, stoneWeight, costType`)
- Drag-drop **image/video upload** — auto square crop, background clean-up, 4 angles + 1 video per SKU
- Single-SKU form bhi (phone se, camera se photo kheench kar)
- **Variants**: size list, weight tolerance (±), purity options
- **Pricing fields**: wastage % · making charge (₹/gram, ₹/piece, ya %) · quantity slabs (1–5 pcs, 6–20, 20+)
- Stock type: **Ready stock** (turant dispatch) vs **Made to order** (X din)
- Draft → **Shivaa QC review** → Live (photo quality, weight sanity, duplicate SKU check)
- Bulk edit, clone, archive, seasonal on/off (e.g. bridal sirf shaadi season mein)

---

## 3. Rate & pricing engine

- Live gold/silver rate feed; supplier apna **wastage + MC** set karta hai, final rate auto-calc
- Rate validity window (e.g. 15 min lock on order placement)
- **Special rate** kisi ek jeweller ya group ke liye (loyal buyers)
- Festive/clearance pricing, quantity discount slabs
- Transparent break-up jo jeweller ko dikhe: metal value + wastage + MC + hallmark + 3% GST

---

## 4. Order desk

- Incoming orders ki list: new · accepted · in production · ready · dispatched · delivered · returned
- **Accept / reject SLA timer** (e.g. 2 ghante) — reject reason mandatory
- **Production tracking** jo jeweller bhi live dekhe:
  `Order received → Wax/CAD → Casting → Filing → Setting → Polish → Hallmark → QC → Packed → Dispatched`
- Har stage par photo upload (bharosa banta hai, dispute khatam)
- Actual weight at dispatch vs estimated weight + tolerance rule (±2%) → auto price adjust
- Partial dispatch, short-close, back-order

---

## 5. Custom order (bespoke) desk

- Jeweller ka sketch/photo/reference aata hai
- Supplier quote deta hai: weight range · wastage · MC · days · advance %
- Revision thread (chat + attachments), CAD/wax photo approval step
- Approved quote → order ban jata hai (same production tracker)

---

## 6. Dead stock, old gold & bullion

- Jeweller jo **dead stock lot** daalta hai, suppliers us par **bid** karein (melt value calculator ke saath)
- Old gold exchange: purity test report upload, net payable calculation
- Supplier agar bullion bhi bechta hai: bar/coin listing, live rate, RTGS booking window

---

## 7. Logistics & dispatch

- Pickup request (Sequel / Brinks / BVC insured courier)
- Auto **e-way bill** jab value > ₹50,000 · invoice + challan PDF
- Packaging checklist + seal photo + AWB tracking (jeweller ko bhi dikhe)
- Insurance declaration per parcel; claim workflow agar parcel kharab/chori

---

## 8. Payments & settlement

- Do ledger alag-alag: **₹ ledger** aur **metal ledger (grams in/out)** — trade ki asli zaroorat
- Settlement cycle (e.g. har shukravar) · RTGS/NEFT/UPI/cash entry
- Auto GST invoice, credit note on return, TDS/TCS handling
- Advance / milestone payment for big custom orders
- Payout history, downloadable statement (PDF + Excel), reconciliation view
- Outstanding aur ageing report (30/60/90 din)

---

## 9. Quality, trust & scorecard

Har supplier ka public **score** (jeweller ko dikhe):

| Metric | Target |
|---|---|
| On-time dispatch % | > 95% |
| Weight accuracy (±) | ±1.5% |
| Return/defect rate | < 2% |
| Response time | < 2 ghante |
| Catalogue freshness | har mahine naye SKU |

Badges: **Verified** · **Hallmark Partner** · **Fast Dispatch** · **Top Rated**
Purity assurance: XRF test report upload, HUID per piece, repair/return workflow with photos.

---

## 10. Analytics — "kya banayein"

- Har SKU par views · enquiries · orders · conversion
- Top cities aur top buyers
- Lost-sale reasons (rate zyada, lead time lamba, out of stock)
- **Trend board**: platform par kis category/design ki demand badh rahi hai, kaunse weight band bik rahe hain
- Rate sensitivity: kis price point par order girta hai

---

## 11. Communication

- In-portal chat: supplier ↔ jeweller (order-wise) aur supplier ↔ Shivaa ops
- WhatsApp alerts: naya order, payment credited, QC query, rate change
- Shivaa broadcast: "is season bridal sets ki demand hai, stock badhaiye"
- Support ticket with SLA

---

## 12. Team, roles & security

- Roles: Owner · Manager · Production supervisor · Accountant
- Permissions per role (sirf accountant ledger dekhe, karigar sirf orders)
- 2FA/OTP login, device list, activity log (kisne rate badla, kab)
- Audit trail har price aur weight change par

---

## 13. Document vault & compliance

GST returns · BIS licence · insurance policy · agreement · PAN — expiry reminders ke saath
(e.g. "BIS licence 30 din mein expire ho raha hai").

---

## 14. Shivaa admin side (internal)

- Supplier approval queue + sample approval
- Catalogue QC queue (photo/weight/duplicate check)
- Margin & commission config per supplier/category
- SLA breach dashboard, penalty, warning, suspend/blacklist
- Payout batch generation + bank file export
- Fraud checks: same GST/bank/IFSC do accounts par

---

## 15. Build order (recommended)

**Phase 1 — MVP (2–3 hafte)**
GST onboarding → catalogue bulk upload + QC → order list with accept/reject → production stages → ₹ ledger + settlement → WhatsApp alerts

**Phase 2**
Custom order desk · logistics + e-way bill · metal ledger · scorecard & badges · analytics

**Phase 3**
Dead-stock bidding · special rates per jeweller · trend board · supplier app (PWA)

---

## 16. Technical notes (aapke current setup ke hisaab se)

- Catalogue ka source `demo65/suppliers/tags.csv` jaisa CSV hi rahe — portal usi schema ko extend kare,
  taaki existing site bina badle data padh sake.
- Supplier images `cms/uploads/suppliers/<supplierId>/<sku>-1.jpg` pattern mein rakhen.
- Jeweller portal ka GST verification flow dobara use karein — ek hi verification service, do role: `role=jeweller | supplier`.
- Har SKU par `supplierId` field add karna zaroori hai (abhi nahi hai) — isi se order routing, ledger aur scorecard chalega.
- Rate engine ek hi jagah (shared service), jeweller side aur supplier side dono wahi use karein.
