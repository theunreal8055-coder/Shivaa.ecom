# The two booklets — print-ready PDFs

Built 1 Nov 2026. A5 portrait (148 × 210 mm), **12 pages each**, the same page
order in both languages.

| File | What it is |
|---|---|
| `SHIVAA-BLACK-booklet-EN.pdf` | English booklet, 12 pages |
| `SHIVAA-BLACK-booklet-HI.pdf` | Hindi (Devanagari) booklet, 12 pages |
| `preview-EN.png` / `preview-HI.png` | all twelve pages on one sheet, to look at quickly |
| `build-booklets.py` | the builder — edit copy here, re-run, both PDFs rebuild |
| `FOR-THE-PRINTER.md` | paper, binding, colour, bleed — hand this to the printer |

Rebuild:

```bash
pip install fpdf2 fonttools uharfbuzz brotli qrcode pymupdf   # once
python3 marketing/unboxing/booklets/build-booklets.py --render
```

`--render` also writes PNGs to `/tmp/booklet-preview` for a visual check.

## Page map (identical in both books)

| Page | English | हिन्दी |
|---|---|---|
| 1 | Cover — *Shivaa Black* | आवरण — *शिवा ब्लैक* |
| 2 | What you are holding | आपके हाथ में क्या है |
| 3 | Twenty percent — on the craft only (+ the bill, line by line) | बीस प्रतिशत — सिर्फ़ कारीगरी पर (+ बिल) |
| 4 | Eight things the app does | आठ काम जो यह करता है |
| 5 | The rate, and the plan (11 + 1) | भाव, और योजना |
| 6 | **Why it does not feel like a website** — the six measured motions | **यह वेबसाइट जैसा क्यों नहीं लगता** |
| 7 | Three steps, about forty seconds | तीन कदम, लगभग चालीस सेकंड |
| 8 | Everything in one place (certificates, bills, track, care) | सब कुछ एक जगह |
| 9 | Size, care, buyback | साइज़, देखभाल, बायबैक |
| 10 | Six months, then one tap (renewal + write-your-date) | छह महीने, फिर एक टैप |
| 11 | The terms, without the fog (+ this book belongs to) | शर्तें, बिना धुंध के |
| 12 | Back cover — address, phone, QR | पिछला आवरण — पता, फ़ोन, QR |

Page 6 is the "animations and highlights" page the owner asked for. It is not a
list of effects: each card names a number that was measured on the live page —
**zero** animation frames a second when idle (was 123), **58** stylesheets
collapsed to **one** bundle, **zero** video bytes before you scroll, a press that
answers and a drag that does not, one motion owner per navigation, and no timer
that rebuilds the page. The owner's house rule applies to print too: no effect is
described that the site cannot do.

## What is deliberately NOT in either book

- **No price.** A booklet printed today cannot promise tomorrow's rate.
- **No "for life" for the 20 %.** The card is six months, renewable; the other
  20 % product (the banner Premium card) is a different object and is not in the
  box. This is the same decision flagged in `../UNBOXING-SYSTEM.md` §1.
- **No 25 %.** The only percentage on any page, in either language, is 20, on
  making charges only.
- **No testimonial, no customer count, no "best in the world"**, no invented
  purity or HUID claim.
- **No rupee glyph.** The site's fonts (and the Noto Devanagari file used here)
  carry no U+20B9, so it is written as `10,000 rupees` / `10,000 रुपये`. If the
  printer wants ₹, it needs a font that has it — see `FOR-THE-PRINTER.md`.

## Verified facts each page leans on (from source, not memory)

| Claim in the booklet | Where it is true in the code |
|---|---|
| 20 % off making charges, six months, free renewal in the last 30 days | `blackPct()`, `black_six_month_expiry()`, `POST /api/black-card/renew` |
| Card bound to the verified mobile; OTP sign-in, no password | `black-card/claim` (401/403 paths) |
| Certificates, in-store bills, tracking, care plan, sizer | routes `#/certificates`, `#/my-bills`, `#/track`, `#/care`, `#/sizer` |
| Swarna Nidhi 11 + 1 | `pages.savings` ("Save a fixed amount for eleven months. We pay the twelfth.") |
| Rates now say where the number came from | `#/rates` + `src = 'MCX estimate · spot ×…'` |
| 123 → 0 idle frames, 58 → 1 stylesheet, 0 video bytes at mount | v232 / v222 / v223 releases (`DEPLOY-v232.md`, `DEPLOY-v222.md`, `DEPLOY-v223.md`) |
| Buyback on pure gold value, zero deduction | `pages.buyback` |
| Jayal address, phone, entity name, hours | `cms/index.html` JSON-LD + footer |

## How the Hindi is set

Devanagari is shaped with HarfBuzz (`set_text_shaping(True)`) — without it a
matra like `ि` prints in the wrong place and conjuncts fall apart. The builder in
this folder does its own line breaking (see the note at the top of
`build-booklets.py`): fpdf2 2.9 measures the *unshaped* string for wrapping and
corrupts a mixed Latin/Devanagari line, which is why words here are measured one
run at a time. Fonts: Noto Sans Devanagari 400/500/700 (OFL) for Hindi, Jost for
digits and Latin inside it; Marcellus / Cormorant Garamond / Jost — the site's
own faces — for English.
