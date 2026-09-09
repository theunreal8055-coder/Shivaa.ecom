# Shivaa.in — 100 g Gold Offer: Action Plan, Checklists & Runbooks
**Companion to `01-Full-Research-Report-100g-Gold-Offer.md`** · 9 September 2026

Use this as the working file. Mark items done with `[x]`.

## Confirmed campaign decisions (owner, 9 Sep 2026)

- **Draw/winner announcement: 31 December 2026** — "New Year Gold Finale", live on Instagram. This is the campaign's single **fixed public date**.
- **"12 September": reinstated as the campaign launch / first public announcement** (latest brief, 9 Sep 2026). Because full legal clearance cannot complete by then, it runs as a **compliant announcement + free pre-registration only** — official entries open once the gate register is green (target early Oct). See file 09 §9.1.
- **Structure: Hybrid** — draw open to ALL via a free no-purchase entry on the website; verified purchasers (≥5 g gold + ≥100 g silver per order) get perks and bonus entries.
- **Prize: 100 g 24K BIS-certified gold biscuit** (market value ~₹15L at announcement; never promise a fixed rupee figure).
- **TDS: winner pays** statutory tax (~30%, ~₹4.7L at ₹15L) before delivery — disclose in every ad, post and the Live.
- **Marketing budget: ₹9,00,000 (owner-fixed)** — phased across the campaign window from public launch to 31 Dec.

---

## Timeline at a glance

| When | Milestone | Owner |
|---|---|---|
| 9–11 Sep | Lawyer & CA engaged; board resolution; GST application confirmed; prize vendor shortlisted | Owner |
| **12 Sep 2026** | **Compliant announcement Live + free pre-registration** (no entries, no purchase linkage) — per latest brief; full scheme opens after legal gates | Marketing |
| 13–15 Sep | T&C, official rules, privacy policy, grievance officer, Meta disclaimer live | Legal + Dev |
| 15–30 Sep | Supplier agreements (first 20–30); catalogue phasing; **prize biscuit purchased + earmarked** | Ops + Owner |
| 1–24 Oct | Pre-Diwali push; quiz/chatbot QA; free-entry route tested; entry ledger build | Marketing + Dev |
| 25 Oct–6 Nov | Dhanteras–Diwali peak campaign (biggest spend of the festive window) | Marketing |
| 6 Nov (Dhanteras) | Festival sales peak; purchaser perks emphasised; double bonus-entry push | All |
| 8–10 Nov | Diwali (8 Nov) + Bhai Dooj (10 Nov) engagement lives; entries keep flowing | Marketing |
| 11 Nov–24 Dec | Wedding/Christmas gifting content; entry reminders; weekly "entries so far" updates | Marketing |
| 25–30 Dec | Entry ledger final push; pre-draw audit + freeze prep; biscuit, certificates, auditor staged | Ops + Auditor |
| **31 Dec 2026** | **LIVE DRAW — New Year Gold Finale; winner announced** | All |
| 1–15 Jan 2027 | Winner verification (ID/PAN), TDS deposit, biscuit handover w/ certificate, re-draw if forfeit | CA + Ops |
| Jan 2027 | Winner story PR, retention offers, TDS forms, GST returns | Marketing + CA |
| 31 Jan 2027 | Campaign report + financier pack | Owner |

---

## Phase 0 — Paper & people first (9–11 Sep, gates everything)

- [ ] **GSTIN**: applied/obtained for the Rajasthan entity (repo shows GSTIN empty — must be live on the site before selling).
- [ ] **PAN & TAN** confirmed; company bank account for TDS deposit.
- [ ] **Board resolution** approving: the hybrid offer, the 100 g prize (~₹15L), the ₹9L budget, prize custodian.
- [ ] Lawyer engaged — opinion requested on: sweepstake/hybrid structure; IPC 294A comfort; TN/WB exclusion ("void where prohibited"); Rajasthan gambling law; CCPA "contest to promote sale" exposure.
- [ ] CA engaged — mechanics for: 194B/115BB in-kind prize TDS (winner pays); GST/ITC treatment of the gifted biscuit; GST return calendar; TCS/194Q at scale.
- [ ] Prize biscuit vendor shortlist (certified refiners: MMTC-PAMP / Government Mint type) — purchase target **by 30 Sep** (locks gold price; 3-month hold risk removed).
- [ ] Insurance: prize storage + transit; festive jewellery parcel insurance.

## Phase 1 — Compliance assets live (13–15 Sep, before paid ads)

- [ ] **Terms & Conditions** final (report Section 6) — includes: free no-purchase entry route, purchasers' bonus-entry perk, eligibility (18+, India, "void where prohibited", TN/WB excluded unless licensed), prize description with market-value wording, tax terms (winner pays ~30% statutory TDS, PAN mandatory), draw method (audited, live 31 Dec), forfeit/re-draw rule.
- [ ] **Official-rules page** live at `shivaa.in/official-rules` and linked from Instagram bio, posts, landing page and checkout.
- [ ] **Grievance Officer + nodal officer** appointed; name/contact displayed; 48-hr ack / 30-day redress inbox configured.
- [ ] **Privacy policy (DPDP)** + consent language for quiz/entry/winner data; **AI chatbot disclosure**.
- [ ] Ad copy + Live script legally reviewed (fixed wording: *"100 g of 24K BIS-certified gold biscuit — market value ~₹15 lakh as on the announcement date — 100% gift to one entrant; winner pays statutory tax (~30%) as per law; winner announced live on 31 Dec 2026"*).
- [ ] Meta disclaimer included in all contest posts (word-for-word Instagram release line).

## Phase 2 — Product & prize (15–30 Sep)

- [ ] Supplier agreements for first 20–30 Mumbai manufacturers: hallmark/HUID warranty, purity/weight accuracy, design-IP indemnity, GSTIN+PAN on file, delivery/returns, defect liability.
- [ ] Catalogue phasing plan: launch set (2,000–10,000 verified festive designs) → scale weekly to year-end; **never advertise "4 lakh designs" until the catalogue truly supports it**.
- [ ] **Prize biscuit purchased by 30 Sep**: certificate + invoice; serial photographed; storage with 2-person access log; insurance note updated.
- [ ] QC gate enforced: weight/purity/HUID verified per listing (gold HUID mandatory; silver per IS 2112:2025 marks).

## Phase 3 — Website build (this repo's CMS) (13 Sep–15 Oct)

- [ ] Campaign landing page: offer explainer, official-rules link, countdown to 31 Dec, free-entry form, T&C checkbox.
- [ ] **Free no-purchase entry route** implemented + tested end-to-end (this is what keeps the scheme legal).
- [ ] Quiz module (skill + preference) → bonus/lead scoring; chatbot/style assistant scoped to catalogue + campaign rules, discloses AI.
- [ ] Order-threshold validation: purchaser perk applies only to orders with **≥5 g gold AND ≥100 g silver**, paid, non-cancelled after the cooling-off window.
- [ ] Entry ledger (audit trail: order id / free-entry id, phone, quiz score, entry time) — freeze prep for 31 Dec.
- [ ] Fraud controls: mobile OTP, entry caps per verified identity, bulk/bot order heuristics.
- [ ] Legal identity block site-wide: legal name, registered address, **GSTIN**, customer care, grievance officer (extend the existing trust page).
- [ ] Live-draw page: embedded stream, auditor name, prize on screen, rules recap.
- [ ] Consent + analytics (funnel: reach → visit → entry → qualifying order).

## Phase 4 — Marketing execution (public launch → 31 Dec, ₹9L)

- [ ] **Public-launch Live** (date TBD — recommended ~1 Nov before Dhanteras; script in report Section 11) + boosted after.
- [ ] Phase budgets per report Section 10 (reserve ~₹2L for December finale):
  - 9–30 Sep ₹1.2L · 1–24 Oct ₹1.8L · 25 Oct–10 Nov ₹3.0L · 11–30 Nov ₹1.0L · 1–31 Dec ₹2.0L.
- [ ] Content cadence: teasers, manufacturer stories, hallmark/HUID education, countdown posts, festive gifting, wedding + Christmas angles, "entries so far" updates.
- [ ] Influencer/invitee posts with **#ad** disclosure and compliant claim wording.
- [ ] Retargeting: window shoppers Sep–Oct → Dhanteras/Diwali offers → New Year finale.
- [ ] KPI dashboard: reach → visits (3–5%) → entries (15–25% of visits) → qualifying orders (1–2%) → CAC ≤ ₹12–15k per qualifying buyer.

## Phase 5 — Draw-day runbook (31 December 2026, New Year Gold Finale)

**Before (25–30 Dec)**
- [ ] Entry ledger freeze time announced in rules (e.g., 31 Dec 2026, 12:00 IST); export + SHA-256 hash published.
- [ ] Auditor appointed + briefed; random-draw tool chosen and rehearsed.
- [ ] Biscuit + certificate + scales staged; winner-verification kit (ID/PAN forms, contact script).
- [ ] Technical rehearsal: stream (Instagram Business + site embed), screenshare, backup power/internet.

**Draw day (31 Dec)**
1. Start Live on Instagram (Business account) + embedded on site.
2. Recap rules on air: prize, tax terms, free-entry route, "void where prohibited".
3. Auditor opens the frozen ledger; hash announced for the record.
4. Random winner selected live with auditor present (recorded tool/screenshare + manual step).
5. Announce winner (name/city only); attempt live call.
6. State next steps publicly: verification within 48 hrs; PAN; ~30% TDS payment before delivery; delivery within 30 days; forfeit → re-draw policy.
7. Save the full stream + generate logs; announce consolation perks/New Year offers.

**After (1–15 Jan 2027)**
- [ ] Winner verification (identity + PAN); if invalid/unresponsive → re-draw per T&C (recorded, published).
- [ ] **TDS deposited** within statutory timeline (CA); Form 16A / 26AS to winner.
- [ ] Biscuit handover with certificate + invoice; photo/video with consent.
- [ ] Publish winner-announcement post + full compliance recap.

## Phase 6 — Post-campaign (Jan 2027)

- [ ] Winner story content (consent) + retention offers to all buyers and entrants.
- [ ] TDS/GST filings; grievance log reviewed; complaints closed <30 days.
- [ ] Campaign report: GMV, qualifying orders, entries, CAC, ROI vs report Section 8 scenarios, complaints, legal status.
- [ ] **Financier pack**: report Sections 7–8 + this executed checklist + site metrics + next-phase plan.

---

## Do-not-launch checklist (kill criteria — any one unmet = postpone the Live)

- [ ] Lawyer & CA engaged and structure finalised (no "launch first, ask later").
- [ ] GSTIN live on site; entity can invoice.
- [ ] Prize biscuit physically procured + earmarked with certificate (or purchase order dated ≤30 Sep).
- [ ] Free-entry route live and tested; T&C + official rules + Meta disclaimer published.
- [ ] Grievance officer contact live; complaint inbox working.
- [ ] Qualifying catalogue actually fulfil-able (no phantom listings).
- [ ] Live-draw tool rehearsed; auditor confirmed.

---
*Prepared for Shivaa (shivaa.in) — 9 Sep 2026. General guidance, not legal/tax advice; confirm all statutes and rates at launch.*
