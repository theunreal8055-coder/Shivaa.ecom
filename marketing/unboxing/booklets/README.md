# The two booklets — six pages, animated

Built 1 Nov 2026. A5 portrait (148 × 210 mm), **exactly 6 pages each**, the same
page order in both languages. She narrates all six pages — one drawing of the
same woman (maroon saree, gold jhumkas, cream / maroon / gold) on every spread.

| File | What it is |
|---|---|
| `SHIVAA-BLACK-booklet-EN.pdf` | English booklet, 6 pages, print copy |
| `SHIVAA-BLACK-booklet-HI.pdf` | Hindi (Devanagari) booklet, 6 pages, print copy |
| `SHIVAA-BLACK-booklet-EN-animated.pdf` | same book **+ 12 PDF layers** and a fade between pages — open in Acrobat, see *Layers* |
| `SHIVAA-BLACK-booklet-HI-animated.pdf` | the Hindi animated edition |
| `preview-EN.png` / `preview-HI.png` | all six pages on one contact sheet |
| `build-booklets.py` | the builder — copy lives in the `EN` / `HI` dicts inside it |
| `FOR-THE-PRINTER.md` | paper, binding, colour, bleed — hand this to the printer |

Rebuild:

```bash
pip install fpdf2 fonttools uharfbuzz brotli qrcode pymupdf pikepdf   # once
python3 marketing/unboxing/booklets/build-booklets.py --render
```

`--render` writes PNGs to `/tmp/booklet-preview` and refreshes the two contact
sheets in this folder.

## Page map (identical in both books)

| Page | Story beat | English | हिन्दी | Her drawing |
|---|---|---|---|---|
| 1 | the promise | Cover — **Shivaa Black**, the seal, the promise running up the panel edge | आवरण — **शिवा ब्लैक** | full right column, black panel left |
| 2 | the arithmetic | Twenty percent, on the craft alone — *is / is not* + the bill 10,000 → −2,000 → 8,000 | बीस प्रतिशत, सिर्फ़ कारीगरी पर (+ पूरा हिसाब) | inset, right, "I reduce the making charges" |
| 3 | the app | Eight things, in your hand — 2 × 4 grid on black over a full-bleed photo band | आठ काम, आपके हाथ में | phone in hand, top band |
| 4 | the feel | **Why it does not feel like a website** — six measured motions | **यह वेबसाइट जैसा क्यों नहीं लगता** | small inset, top right |
| 5 | the card | Three steps, then it is done — drawn sign-in strip + write-your-date box | तीन कदम, फिर काम हो गया | holding the black card |
| 6 | the return | Back cover — QR, address, phone, hours, signature | पिछला आवरण — पता, फ़ोन, QR | namaste, full right column |

Page 4 is the "animations" page the owner asked for, and it is not a list of
effects: every row prints a number measured on the live page — **123 → 0**
animation frames a second when idle, **58 → 1** stylesheet collapsed into one
bundle, **0** video bytes fetched before you scroll, a press that answers, one
motion owner per navigation, no timer that rebuilds the page.

## The animated edition

"The animated PDF" means **PDF layers (OCGs) + page transitions**, which is what
Acrobat, Foxit and the desktop viewers actually play. fpdf2 cannot write either,
so the builder finishes the job with `pikepdf`:

- each page gets **two overlay layers** — `Frame 1 · page N` and `Frame 2 · page N`
  (`फ़्रेम 1 · पन्ना N` / `फ़्रेम 2 · पन्ना N` in Hindi), 12 layers per book;
- **Frame 1 is on, Frame 2 is off** when the file opens, so a reader that ignores
  layers still sees the finished page, and turning Frame 2 on in the Layers panel
  plays the second beat;
- every page carries `/Trans /Fade 0.8` so a full-screen reader cross-fades
  between pages instead of cutting.

| Page | Frame 1 (on at open) | Frame 2 (turn on to play) |
|---|---|---|
| 1 | twin gold rule under the title | the rosette seal low in the black panel |
| 2 | the −2,000 row boxed in maroon | the 8,000 total boxed in gold |
| 3 | module rows 01–02 outlined | rows 03–04 outlined |
| 4 | `123` circled | a ring ripple at the press glyph |
| 5 | three dots filled | all six filled + a tick |
| 6 | two gold rings around the QR | a rosette above the QR |

Honest limit: a browser's built-in PDF viewer, the in-app iframe preview and
phone viewers show **one static frame** (Frame 1). Layers need Acrobat / Foxit /
a print-RIP preview to be switchable. Nothing about this changes the print file —
`SHIVAA-BLACK-booklet-EN.pdf` and `-HI.pdf` carry no layers at all.

## What is deliberately NOT in either book

- **No price.** A booklet printed today cannot promise tomorrow's rate.
- **No "for life" for the 20 %.** The card is six months, renewable; the separate
  Premium card is a different object and is not in this box
  (`../UNBOXING-SYSTEM.md` §1).
- **No 25 %.** The only percentage in either book is 20, on making charges only.
- **No testimonial, no customer count, no invented purity / HUID claim**, no
  invented card number (the seal reads `0142 / 0500`, a specimen).
- **No rupee glyph.** Neither the site fonts nor the Noto Devanagari file carry
  U+20B9, so amounts are bare numerals (`10,000`, `− 2,000`, `8,000`). If the
  printer wants `₹`, it needs a font that has it — see `FOR-THE-PRINTER.md`.

## Verified facts each page leans on (from source, not memory)

| Claim in the booklet | Where it is true in the code |
|---|---|
| 20 % off making charges, six months, free renewal in the last 30 days | `blackPct()`, `black_six_month_expiry()`, `POST /api/black-card/renew` |
| Card bound to the verified mobile; OTP sign-in, no password | `black-card/claim` (401/403 paths) |
| Certificates, in-store bills, tracking, care plan, sizer | routes `#/certificates`, `#/my-bills`, `#/track`, `#/care`, `#/sizer` |
| Swarna Nidhi 11 + 1 | `pages.savings` |
| Rates say where the number came from | `#/rates` + `src = 'MCX estimate · spot ×…'` |
| 123 → 0 idle frames, 58 → 1 stylesheet, 0 video bytes at mount | v232 / v222 / v223 releases |
| Buyback on pure gold value, zero deduction | `pages.buyback` |
| Jayal address, phone, entity name, hours | `cms/index.html` JSON-LD + footer |

## How the Hindi is set

Devanagari is shaped with HarfBuzz (`set_text_shaping(True)`) — without it a matra
like `ि` lands in the wrong place and conjuncts fall apart. fpdf2 2.9 measures the
*unshaped* string when it wraps, so this builder does its own line breaking
(`lines_of` / `rt`) and its own letter-spacing: **tracking is applied to Latin
only** — spaced-out Devanagari breaks the conjuncts, so a Hindi eyebrow is set
plain.

## Art

`art/muse-{hero,gesture,card,phone,phone-crop,namaste}.png` — 768 × 1376,
cream `#faf6ef`, maroon saree, gold jhumkas. `phone-crop` is the same drawing with
the stray floating arm on the right trimmed off, so page 3's full-width band can
be a tight crop. Cropped and resized per placement into `$TMP/shivaa-art`; fonts
cached in `$TMP/shivaa-fonts`.
