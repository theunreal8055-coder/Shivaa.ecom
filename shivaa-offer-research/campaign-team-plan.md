# New Year Gold Finale — Campaign Team Plan
**People, teams and phasing to run the campaign end-to-end (12 Sep 2026 → 31 Jan 2027)**

Companion to `pitch-deck.pdf` (deck itself is unchanged). Scale assumes: ~1,000–1,100
qualifying gold customers (≈10/day) + silver upside, 20–60k campaign visits, up to
~15–25k entries, entries close ≈18–20 Dec, live CA-witnessed draw on 31 Dec 2026,
report by 31 Jan 2027.

---

## 1. Guiding constraints (from the approved deck)

- **Four-way duty split** (Compliance 11 of 12): draw, entry-ledger, prize custody and
  finance must sit in **different hands** — no one person holds two of these.
- **Two-person custody** for the prize biscuit and high-value stock (Compliance 7/8).
- **Seller-of-record duties** on the platform: 48-hr ack / 30-day redress, returns,
  refunds, invoice + dispatch-weight checks (Compliance 4/5).
- Gate sign-offs (G1–G10) need **named owners** — each role below lists its gates.
- Ops + compliance budget in the plan is **Rs 9.2L** (tooling, CS, load-test, filings);
  salaries shown here are mostly existing staff + paid part-timers/freelancers funded
  from the same envelope or the Rs 9L marketing line (influencers/creatives).

## 2. Recommended structure — 8 teams, ~22 people (FTE-equivalent)

| # | Team | Headcount | Team lead | When needed |
|---|------|-----------|-----------|-------------|
| 1 | Leadership & Investor Reporting | 2 | Owner (Campaign Director) + Campaign Manager | Sep → Jan |
| 2 | Compliance, Legal & Draw Governance | 3 | Compliance Officer | Sep → Jan |
| 3 | Marketing, Content & Influencer | 4 | Media & Performance Lead | Sep → Dec |
| 4 | Technology, Entry Ledger & QA | 3.5 | Lead Developer | Sep → Jan |
| 5 | Supply, QC & Fulfilment | 4 | Supply & Inventory Manager | Sep → Jan |
| 6 | Customer Experience & Grievance | 3 | CX / Grievance Lead | Oct → Jan |
| 7 | Finance, GST & TDS | 2 | Finance Lead | Sep → Jan |
| 8 | Prize & 31-Dec Draw Production | 0.5 (+vendor) | Draw & Prize Officer (in team 2) | Nov → 31 Dec |

**Retained advisors (outside headcount):** consumer/advertising lawyer, CA (jewellery
retail + GST/income tax), insurer, draw AV/live-stream vendor.

---

## 3. Team-by-team detail

### Team 1 — Leadership & Investor Reporting (2)
| Role | Type | Accountability |
|------|------|----------------|
| Campaign Director (Owner) | Full-time (you) | Final decisions; gate sign-offs G1–G10; board resolution; investor interface |
| Campaign Manager | Full-time **new** | Daily cross-team coordination; vendor deadlines; weekly check-in agenda; MIS pack |

Weekly compliance check-ins (dated agenda: copy, grievances, free route, refund SLA)
are run by this pair. Monthly MIS + final report by 31 Jan 2027.

### Team 2 — Compliance, Legal & Draw Governance (3)
| Role | Type | Accountability |
|------|------|----------------|
| Compliance Officer | Full-time **new** | Owns G1/G2/G4/G7 evidence file: T&C, official rules, ad pre-clearance loop, state map, ASCI/CCPA register, notices log |
| Draw & Prize Officer | Part-time (from Nov) | Custody log (two-person), insurance, SHA-256 freeze co-ordination, CA witness, recording retention (8 yrs), re-draw rule execution |
| Legal Ops Assistant | Part-time | Versioned ad archive, complaint/notice register, approval log (creative-ID → approver → date) |

**Retained:** lawyer (opinions + per-state review), CA (tax note). Gate owners: G1/G2/G7 lawyer+Compliance; G4 lawyer+Dev; G10 this team.

### Team 3 — Marketing, Content & Influencer (4)
| Role | Type | Accountability |
|------|------|----------------|
| Media & Performance Lead | Full-time **new** | Spends the Rs 9.0L in phases (0.8 / 3.4 / 1.8 / 2.6 / 0.4L); Meta/Google, geo exclusions (TN/WB), pixel + consent, CAC tracking |
| Content Creator / Copywriter | Full-time **new** | Creatives & Live scripts through the compliance approval loop; "win a chance" wording; no "100% free" |
| Community & Influencer Coordinator | Part-time/full | Influencer outreach with #ad; Live sessions (12 Sep, interim, 31 Dec); engagement; comment moderation |
| Marketing Analyst | Part-time (shared w/ Tech) | Funnel dashboard: reach → visits → entries → orders → CAC; creative A/B results |

Freelance budget inside the Rs 9L line: photographer/videographer (prize, maker
workshops, draw), 1–2 short-term influencers.

### Team 4 — Technology, Entry Ledger & QA (3.5)
| Role | Type | Accountability |
|------|------|----------------|
| Lead Developer | Full-time (existing) | Storefront, quiz, free-entry route, entry ledger, audited-draw module, HUID workflow, queue/rate-limiter |
| Frontend/UX + QA Engineer | Full-time **new/contract** | Mobile UX, DPDP consent UI (no pre-checked boxes), end-to-end dry run, load rehearsal before peaks |
| DevOps/Data (part-time) | 0.5 | MFA, encrypted backups, least privilege, uptime on 6 Nov / 8 Nov / 31 Dec; DB of record for ledger freeze + SHA-256 |

**Guardrails:** draw module deterministic + witnessed, ledger isolated from sales DB;
AI concierge never touches winner selection. Gate owners: G6 (tested end-to-end), G9
(load + queue) with Ops.

### Team 5 — Supply, QC & Fulfilment (4)
| Role | Type | Accountability |
|------|------|----------------|
| Supply & Inventory Manager | Full-time (existing) | 200-maker pipeline, vendor agreements (G8: hallmark/IP/SLA/returns/indemnity), advances, consignment & bullion lines, stock ledger |
| QC Officer | Full-time **new** | BIS/HUID verification (BIS Care), XRF batch QC, certificate↔serial↔invoice matching, purity labels (916 ≠ 999) |
| Dispatch & Logistics Executive | Full-time **new** | Insured dispatch ≤7 days, invoice + dispatch-weight check, e-way bills, returns/reverse logistics |
| Stock & Custody Keeper | Full-time (existing) | Two-person custody with Draw Officer; cycle counts; prize biscuit storage/insurance docs |

### Team 6 — Customer Experience & Grievance (3)
| Role | Type | Accountability |
|------|------|----------------|
| CX / Grievance Lead | Full-time **new** | SLA queue (48-hr ack / 30-day redress), published escalation CS → grievance officer → senior owner, complaint log |
| Support Executives ×2 | Full-time (existing/seasonal Oct–Dec) | Pre-sales (quiz, free-route help), order status, refunds; +1 temp added 1–15 Dec if entry volume demands |

This team also runs the **consolation funnel** after the draw (offers to non-winning
entrants) with marketing's approval.

### Team 7 — Finance, GST & TDS (2)
| Role | Type | Accountability |
|------|------|----------------|
| Finance Lead | Full-time (existing) | GSTIN live (G3), GSTR-1/3B calendar, 2A reconciliation, e-invoicing, ITC §17(5)(h) reversal file, vendor payments 15/30/45-day, escrow (prize ≈15L + TDS ≈4.7L), CTR/SFT limits |
| Accounts Executive | Full-time (existing) | Invoicing (HSN 7113, 3%), TDS challans + 24Q, 26AS, Form 16A, PAN/KYC of winner, monthly recon |

**Retained:** CA for the TDS ≈31.2% computation and GST/ITC-on-gift model. Finance
Lead + Draw Officer must be **different people** (duty split).

### Team 8 — Prize & 31-Dec Draw Production (0.5 + vendors)
- Draw & Prize Officer (Team 2) runs it.
- Hired for the event: AV/live-stream production, CA witness (external), notary,
  security for the biscuit handover, winner PR release.
- Cost: inside prize/logistics (Rs 15.8L) + ops lines — not extra marketing.

---

## 4. Phasing & totals

| Phase | Window | Active core | Temps/contracts added |
|-------|--------|-------------|------------------------|
| Setup & gates | now → 11 Sep | Teams 1,2,4,7 (+lawyer/CA) | — |
| Compliant launch | 12 Sep → early Oct | + Marketing (soft), Content | Videographer |
| Entries + festivals | early Oct → 15 Nov | All teams | +1 CX temp; QC/dispatch peak |
| Wedding/Christmas | 16 Nov → 15 Dec | All teams | Draw & Prize Officer full; +1 CX |
| Close & freeze | 16–20 Dec | 1,2,4,7 | — |
| Draw night | 31 Dec | 1,2,4,8 + CA witness | AV/live-stream vendor, security |
| TDS, handover, report | Jan 2027 | 1,7 (+2) | — |

**Numbers summary**
- 8 teams, **≈22 people FTE-equivalent** through the campaign window.
- **New/paid additions:** Campaign Manager, Compliance Officer, Media & Performance
  Lead, Content Creator, Frontend/QA (contract), QC Officer, Dispatch Executive,
  CX/Grievance Lead + seasonal CX temps, influencer/AV freelancers — roughly
  **8–9 hires + 3–4 seasonal/contract**.
- **Already in house:** Owner, Lead Developer, Supply/Inventory Manager, Finance
  Lead, Accounts Executive, Stock Keeper, Support Executives (assumed existing from
  the live storefront).

## 5. Compliance notes every leader must respect
- Campaign Manager and Compliance Officer both attend every weekly check-in.
- Nobody in Team 3 approves their own copy — clearance always via Team 2.
- Winner release only after Finance confirms PAN + TDS deposit + Form 16A path.
- Two-person rule: prize custody = Draw Officer **+** Stock Keeper; payments above a
  threshold = Finance Lead **+** Campaign Director.
- Kill-switch triggers (pre-agreed in the board resolution) may only be invoked by
  the Campaign Director after a lawyer/CA call.
