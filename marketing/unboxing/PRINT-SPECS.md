# PRINT SPECS — hand this to every vendor

Give each vendor only **their** page. Do not hand the whole file to one printer;
they will quote the whole job and subcontract three parts of it.

Colour reference (from the live site's CSS): gold `#b98a2f`, gold light `#d4af5a`,
maroon `#6e1e2a`, ink `#2b2118`, cream `#faf6ef`.
Type reference (from the site's own font files): Marcellus (display),
Cormorant Garamond (serif text), Jost (sans / small print).
Logo file: `cms/images/logo.png` — ask for a vector (`.ai`/`.svg`) from whoever
made the logo before printing; a 40 px PNG scaled to 60 mm will print soft.

---

## 0 · Common to every item

| Item | Spec |
|---|---|
| Colour mode | CMYK + **Pantone 871 C** (gold, metallic, foil or ink) + **Pantone 202 C** (maroon) |
| Proof | one **physical** proof per item before the run. Digital PDF approval is not enough |
| Bleed | 3 mm all round |
| Safe area | 4 mm from trim |
| Image resolution | 300 dpi at final size, minimum |
| Black | rich black `C60 M50 Y40 K100` for large areas; **K100 only** for text below 8 pt (otherwise registration drift makes text blurry) |
| Gold text | never as CMYK gold on black — it prints brown. Foil, or Pantone 871 C |
| Barcode / QR | 4-module quiet zone, module ≥ 0.4 mm, **K100 only**, on cream/white |
| Fonts | all text converted to outlines before sending plates |
| Overprint | black text over foil: overprint ON, but no white knockout |

---

## 1 · Rigid box maker

```
TYPE            two-piece rigid box, lid + base, magnetic close
OUTER (lid)     175 × 95 × 18 mm
OUTER (base)    175 × 95 × 22 mm
TOLERANCE       ±0.5 mm; lid must sit flush, no light gap at corners
BOARD           1200 gsm grey board, 2.0 mm
WRAP            157 gsm matt art paper, laminated
LID TOP         logo blind-embossed + gold foil; no other print
LID SIDES       plain black
BASE SIDES      plain black
INTERIOR        cream uncoated paper lining, glued flat, no wrinkles at radii
MAGNETS         2 × Ø6 mm N35, hidden, opposite corners; pull force 0.8–1.2 kg
                (more than that and a customer with weak hands cannot open it)
CORNER RADIUS   R3 outside
FINISH          matt lamination outside; NO gloss, NO soft-touch
                (soft-touch marks with every fingerprint on camera)
INSIDE LID      printed line in gold foil, centred, per copy deck §1
RIBBON          12 mm cream satin, 180 mm, glued under the tray, 15 mm tail
PACKING         each box in a paper sleeve, then a 5-ply carton of 25
```

**Do not:** print on the inside base (it is covered by the tray), use EVA foam
with a shiny surface (it photographs as cheap), or add a plastic window.

---

## 2 · Sleeve printer

```
SIZE            176 × 96 × 24 mm, open both ends, 1 mm board or 350 gsm
PRINT           full bleed, 4 colour + Pantone 871 C
FRONT           per copy deck §1 — band layout, gold foil on the wordmark only
BACK            legal block, 6 pt
FINISH          matt lamination + spot UV on the ring motif ONLY
SPECIAL         hand-numbering area: a 30 × 8 mm cream patch, unvarnished,
                at the lower right of the front, so the serial can be written
                in ink and not slide
```

---

## 3 · Insert (tray) maker

```
TYPE            2-layer, die-cut, moulded pulp or 1.5 mm greyboard + cream paper
OUTER           168 × 88 × 12 mm
LAYER 1         card well 90 × 58 mm, depth 1.0 mm, thumb notch R12 at the
                lower edge, ribbon slot 3 × 60 mm under the card
LAYER 2         booklet bay 148 × 88 × 6 mm (booklet drops in flat)
SILVER POCKET   55 × 40 mm recess, 1.5 mm deep, with a glassine envelope glued in
FINISH          cream paper wrap, no foil, no print except the tray-edge line
EDGE PRINT      "Ek reel banaiye · tag @shivaa.jewels" — 6 pt, ink, one edge only
```

**Fit test demanded of the vendor:** send one tray with a dummy card and a
dummy booklet inside. The card must lift out with the ribbon, not with a
fingernail.

---

## 4 · Card printer (variable data)

```
SIZE            85.60 × 53.98 mm, R3.18 corners (ISO/IEC 7810 ID-1)
STOCK A (default)  0.8 mm matt black PVC, gold foil + spot UV
STOCK B (premium)  0.6 mm brass, gold PVD, laser-engraved text
PRINT           front per copy deck §2; back 5.5 pt
VARIABLE DATA   name, member ID, card number, issue date — one card per record,
                supplied as CSV; ask for a 3-card proof with real-looking data
QR              https://shivaa.in/#/black-card — fixed, identical on every card
                (if a printed serial is introduced, QR becomes
                 https://shivaa.in/#/black-card/activate?s=SERIAL)
FINISH          matt, NO gloss. Edge-to-edge print is not required; a 2 mm
                black border reads better than a cut-through misregistration
PACKING         in the tray, never loose — brass corners ding in transit
```

---

## 5 · Silver supplier + laser engraver

```
ITEM            0.500 g fine silver (999) square sheet
SIZE            20.0 × 20.0 mm at 0.12 mm nominal thickness
                (0.10 mm → 21.8 mm · 0.15 mm → 17.8 mm — weight is fixed, size moves)
WEIGHT          0.500 g ± 0.02 g, weighed, not estimated
FINISH          matt brushed face (a mirror face shows every fingerprint)
ENGRAVING       fibre laser or diamond-cut; lines ≥ 0.15 mm; text ≥ 1.2 mm cap
FACE            logo (simplified to 11 mm wide) + phone + shivaa.in
REVERSE         "0.500 g · 999"
PURITY RECORD   supplier invoice + purity certificate kept in your files
PACKING         one sheet per 35 × 50 mm glassine envelope with a
                tarnish-inhibitor strip; 100 envelopes per tray, no PVC anywhere
CAUTION         sheets bend; do not stack more than 20 without tissue between
```

---

## 6 · Booklet printer

```
FORMAT          148 × 88 mm portrait, 24 pages (12 English + 12 Hindi)
BINDING         saddle stitch, 2 stitches, gold thread
STOCK INSIDE    100 gsm uncoated cream (bulky, not art paper — art paper
                cracks on the fold at this page count)
STOCK COVER     250 gsm, matt laminated, gold foil on the wordmark
COLOURS         4 colour + Pantone 871 C; the Hindi side may use Pantone 202 C
                for headings, matching the site's maroon
PRINT ORDER     cover 4/1 (outside foil + inside 1 colour), inside 4/4
THICKNESS       target ≤ 2.2 mm, so it drops into a 6 mm bay with the certificate
PROOF           one **stitched dummy** in the final stock, opened and closed
                20 times, before the run
```

---

## 7 · Certificate printer

```
SIZE            85 × 120 mm
STOCK           250 gsm cream, uncoated (it must take ink from a pen)
PRINT           1 colour + Pantone 871 C foil border
SPECIAL         a 25 mm blank strip at the foot, uncoated and unvarnished,
                for the hand signature; a 6 mm blank line for the serial
NUMBERING       either printed variable serials, or a numbering machine —
                the serial must match the box, the card and the app record
PACKING         supplied flat, not folded
```

---

## 8 · Reproducibility note for the attic

Keep, in one folder, for every item: the final PDF/plates, the Pantone numbers,
the dieline, the vendor's sample, and the CSV of serials. When the second batch
is needed in six months, this folder is the difference between a reprint and a
redesign.
