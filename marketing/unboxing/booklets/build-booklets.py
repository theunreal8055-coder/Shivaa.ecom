#!/usr/bin/env python3
"""
Shivaa Black — the six-page booklet, told by Shivaa.

    python3 marketing/unboxing/booklets/build-booklets.py            # build
    python3 marketing/unboxing/booklets/build-booklets.py --render    # build + PNGs

Writes four files into this folder:

    SHIVAA-BLACK-booklet-HI.pdf   A5, 6 pages, Hindi (Devanagari)
    SHIVAA-BLACK-booklet-EN.pdf   A5, 6 pages, English
    SHIVAA-BLACK-booklet-HI-animated.pdf   the same book, with motion
    SHIVAA-BLACK-booklet-EN-animated.pdf

WHAT "ANIMATED" MEANS IN A PDF
------------------------------
A printed PDF cannot play a video, so the animation here is the kind a PDF can
actually do, and it survives print:

1. **Optional content (layers).** Every page carries two to three extra *frames*:
   a gold foil sweep over the title, the making-charge row lighting up, the app
   cards walking one by one, the code dots filling, the QR pulsing. They are real
   PDF Optional Content Groups, stacked on the page as Form XObjects, default off.
   In Acrobat / PDF Expert / Preview the reader toggles them from the Layers panel;
   the first frame of each page is the one that prints.
2. **Page transitions.** Each page carries /Trans = Fade, so a full-screen reader
   cross-fades between pages instead of cutting.

The plain PDFs are the printable versions (no layers, no transitions). Both books
are generated from the same code and the same page order.

THE ART
-------
Five illustrations of the same woman, kept consistent by generating each from the
first: `art/muse-hero.png`, `-gesture`, `-phone`, `-card`, `-namaste`.
Rendered here at 768 × 1376 px; re-run with higher-resolution files in `art/` for
press (300 dpi at the printed size, see FOR-THE-PRINTER.md).

THE COPY is first person, in Shivaa's voice. House rules still apply: the only
percentage is 20, on making charges only; six months, renewable; no invented
price, purity, guarantee or customer count.
"""
from __future__ import annotations

import io
import os
import re
import subprocess
import sys
import tempfile

import pikepdf
from fpdf import FPDF
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
FONTS = os.path.join(REPO, "cms", "fonts")
ART = os.path.join(HERE, "art")
CACHE = os.path.join(tempfile.gettempdir(), "shivaa-fonts")
CROP = os.path.join(tempfile.gettempdir(), "shivaa-art")

# ── palette (cms/css/styles.css) ───────────────────────────────────────────
INK = (20, 17, 14)
INK_2 = (32, 28, 24)
INK_SOFT = (43, 33, 24)
GOLD = (185, 138, 47)
GOLD_L = (212, 175, 90)
GOLD_PALE = (239, 220, 178)
GOLD_DIM = (150, 133, 102)
CREAM = (250, 246, 239)
CREAM_2 = (244, 236, 221)
CREAM_3 = (237, 225, 203)
MAROON = (110, 30, 42)
MUTED = (111, 99, 83)
LINE = (216, 201, 171)
WHITE = (255, 255, 255)

W, H = 148.0, 210.0
M = 12.0
CW = W - 2 * M
SAFE = 1.4
DEV = re.compile(r"[\u0900-\u097F]")
PFX_DEV = "@fontsource/noto-sans-devanagari"
PFX_LAT = "@fontsource/noto-sans"


# ══════════════════════════════════════════════════════════════════════════
#  fonts
# ══════════════════════════════════════════════════════════════════════════
def _to_ttf(src: str, out: str) -> str:
    os.makedirs(CACHE, exist_ok=True)
    dst = os.path.join(CACHE, out)
    if not os.path.exists(dst):
        from fontTools.ttLib import TTFont
        f = TTFont(src)
        f.flavor = None
        f.save(dst)
    return dst


def _lining(src: str, out: str) -> str:
    """Cormorant's default digits are oldstyle; bake its own lnum substitution in."""
    os.path.exists(os.path.join(CACHE, out)) or os.makedirs(CACHE, exist_ok=True)
    dst = os.path.join(CACHE, out)
    if os.path.exists(dst):
        return dst
    from fontTools.ttLib import TTFont
    f = TTFont(src)
    f.flavor = None
    mapping: dict = {}
    try:
        gsub = f["GSUB"].table
        for fr in gsub.FeatureList.FeatureRecord:
            if fr.FeatureTag == "lnum":
                for li in fr.Feature.LookupListIndex:
                    for sub in gsub.LookupList.Lookup[li].SubTable:
                        if hasattr(sub, "mapping"):
                            mapping.update(sub.mapping)
    except Exception:
        mapping = {}
    if mapping:
        for t in f["cmap"].tables:
            for cp in range(0x30, 0x3A):
                g = t.cmap.get(cp)
                if g in mapping:
                    t.cmap[cp] = mapping[g]
    f.save(dst)
    return dst


def _npm(pkg: str, version: str, member: str, out: str) -> str:
    dst = os.path.join(CACHE, out)
    if os.path.exists(dst):
        return dst
    os.makedirs(CACHE, exist_ok=True)
    slug = pkg.split("/")[-1]
    tgz = os.path.join(CACHE, f"{slug}-{version}.tgz")
    if not os.path.exists(tgz):
        subprocess.run(["curl", "-sSfL", "-o", tgz,
                        f"https://registry.npmjs.org/{pkg}/-/{slug}-{version}.tgz"], check=True)
    subprocess.run(["tar", "xzf", tgz, "-C", CACHE], check=True)
    return _to_ttf(os.path.join(CACHE, "package", "files", member), out)


_F = {}


def fonts() -> dict:
    if _F:
        return _F
    _F.update({
        "disp": _to_ttf(os.path.join(FONTS, "marcellus-400.woff2"), "marcellus.ttf"),
        "serif": _lining(_to_ttf(os.path.join(FONTS, "cormorant-garamond.woff2"),
                                 "cormorant.ttf"), "cormorant-lnum.ttf"),
        "sans": _to_ttf(os.path.join(FONTS, "jost.woff2"), "jost.ttf"),
    })
    for wt in (400, 500, 700):
        _F[f"dev{wt}"] = _npm(PFX_DEV, "5.3.0",
                              f"noto-sans-devanagari-devanagari-{wt}-normal.woff", f"nsd-{wt}.ttf")
        _F[f"lat{wt}"] = _npm(PFX_LAT, "5.3.0", f"noto-sans-latin-{wt}-normal.woff", f"nsl-{wt}.ttf")
    return _F


# ══════════════════════════════════════════════════════════════════════════
#  the page
# ══════════════════════════════════════════════════════════════════════════
class Book(FPDF):
    def __init__(self, lang: str):
        super().__init__(orientation="P", unit="mm", format=(W, H))
        self.lang = lang
        self.hi = lang == "HI"
        self.set_auto_page_break(False)
        self.set_margins(M, M, M)
        self.set_title("Shivaa Black — six pages, in her words" if not self.hi
                       else "शिवा ब्लैक — छह पन्ने, उन्हीं की ज़ुबानी")
        self.set_author("Shivaa Jewels, Jayal")
        self.set_subject("The Shivaa Black card and the app")
        self.set_creator("Shivaa · marketing/unboxing/booklets")
        f = fonts()
        for n in ("disp", "serif", "sans"):
            self.add_font(n, "", f[n])
        for wt in (400, 500, 700):
            self.add_font(f"dev{wt}", "", f[f"dev{wt}"])
            self.add_font(f"lat{wt}", "", f[f"lat{wt}"])
        self.set_text_shaping(True)
        self._bill_y = 150.0
        self._bill_step = 7.0
        self._grid_pitch = 18.0
        self._rows_y = 90.0
        self._row_step = 18.6
        self._grid_y = 120.0
        self._strip_y = 150.0
        self._sig_y = 120.0
        self.roles = ({
            "display": ("dev700", "lat700"), "body": ("dev400", "lat400"),
            "strong": ("dev700", "lat700"), "mid": ("dev500", "lat500"),
            "label": ("dev500", "lat500"),
        } if self.hi else {
            "display": ("disp", "disp"), "body": ("serif", "serif"),
            "strong": ("sans", "sans"), "mid": ("sans", "sans"),
            "label": ("sans", "sans"),
        })

    # ── text: measured, per-script runs, own wrapping ─────────────────────
    def _runs(self, word: str, role: str) -> list[list]:
        out: list[list] = []
        for ch in word:
            is_dev = bool(DEV.match(ch))
            if out and out[-1][0] == is_dev:
                out[-1][1] += ch
            else:
                out.append([is_dev, ch])
        return out

    def _word(self, word: str, role: str, size: float) -> list[tuple]:
        dev, lat = self.roles[role]
        out = []
        for is_dev, chunk in self._runs(word, role):
            fnt = dev if is_dev else lat
            self.set_font(fnt, "", size)
            out.append((fnt, chunk, self.get_string_width(chunk)))
        return out

    def lines_of(self, text: str, w: float, size: float, role="body") -> list[list[list[tuple]]]:
        out: list[list[list[tuple]]] = []
        self.set_font(self.roles[role][1], "", size)
        sp = self.get_string_width(" ")
        for para in text.split("\n"):
            cur: list[list[tuple]] = []
            cw = 0.0
            for word in para.split(" "):
                if not word:
                    continue
                runs = self._word(word, role, size)
                ww = sum(r[2] for r in runs)
                need = ww + (sp if cur else 0.0)
                if cur and cw + need > w:
                    out.append(cur)
                    cur, cw = [runs], ww
                else:
                    cur.append(runs)
                    cw += need
            out.append(cur)
        return out

    def rt(self, text: str, x: float, y: float, w: float, size: float, lh: float,
           role="body", colour=INK_SOFT, align="L") -> float:
        self.set_text_color(*colour)
        self.set_font(self.roles[role][1], "", size)
        sp = self.get_string_width(" ")
        for line in self.lines_of(text, w, size, role):
            total = sum(sum(r[2] for r in word) for word in line) + sp * max(0, len(line) - 1)
            cx = x + (w - total) / 2 if align == "C" else (x + w - total if align == "R" else x)
            for word in line:
                for fnt, chunk, ww in word:
                    self.set_font(fnt, "", size)
                    self.set_xy(cx, y)
                    self.cell(ww, lh, chunk)
                    cx += ww
                cx += sp
            y += lh
        return y

    def hgt(self, text: str, w: float, size: float, lh: float, role="body") -> float:
        return len(self.lines_of(text, w, size, role)) * lh

    def spaced(self, text: str, x, y, w, size, colour, sp=0.9, align="L"):
        """Letter-spaced line, shaping-safe: Devanagari runs stay whole,
        Latin runs are drawn glyph by glyph so the tracking is real."""
        self.set_text_color(*colour)
        if DEV.search(text):             # Devanagari tracking breaks conjuncts
            self.rt(text, x, y, w, size, size * 0.55, "body", colour, align)
            return
        parts = []                       # (font, piece, width)
        for is_dev, chunk in self._runs(text, "body"):
            if is_dev:
                dev, lat = self.roles["body"]
                self.set_font(dev, "", size)
                parts.append((dev, chunk, self.get_string_width(chunk)))
            else:
                dev, lat = self.roles["body"]
                self.set_font(lat, "", size)
                for ch in chunk:
                    parts.append((lat, ch, self.get_string_width(ch)))
        total = sum(p[2] for p in parts) + sp * max(0, len(parts) - 1)
        cx = x + (w - total) / 2 if align == "C" else (x + w - total if align == "R" else x)
        n = len(parts)
        for i, (fnt, piece, ww) in enumerate(parts):
            self.set_font(fnt, "", size)
            self.set_xy(cx, y)
            self.cell(ww, size * 0.5, piece)
            cx += ww + (sp if i < n - 1 else 0)

    # ── furniture ─────────────────────────────────────────────────────────
    def rule(self, y, w=0.0, x=None, colour=GOLD, lw=0.3):
        self.set_draw_color(*colour)
        self.set_line_width(lw)
        x0 = M if x is None else x
        self.line(x0, y, x0 + (w or CW), y)

    def field(self, x, y, w, h, fill=CREAM, edge=None, lw=0.25):
        self.set_fill_color(*fill)
        if edge:
            self.set_draw_color(*edge)
            self.set_line_width(lw)
            self.rect(x, y, w, h, "DF")
        else:
            self.rect(x, y, w, h, "F")

    def frame_rect(self, inset=7.0, colour=GOLD, lw=0.4):
        self.set_draw_color(*colour)
        self.set_line_width(lw)
        self.rect(inset, inset, W - 2 * inset, H - 2 * inset)

    def eyebrow(self, num: str, text: str, y: float, dark: bool = False):
        col = GOLD_L if dark else GOLD
        self.set_font("sans", "", 7.0)
        self.set_text_color(*col)
        self.set_xy(M, y)
        self.cell(10, 4, num)
        if self.hi:
            self.set_font("dev700", "", 8.0)
            self.set_xy(M + 10, y - 0.4)
            self.cell(CW - 10, 4.4, text)
        else:
            self.spaced(text.upper(), M + 10, y + 0.5, CW - 10, 6.4, col, 1.0)
        self.rule(y + 5.6, 16, M, col, 0.5)
        return y + 10.4

    def h1(self, text: str, y: float, size=21.0, colour=INK, w=None) -> float:
        return self.rt(text, M, y, (w or CW) - SAFE, size, size * 0.46, "display", colour) + 2.4

    def quote(self, text: str, x, y, w, size=10.0, lh=None, dark=False, mark=True) -> float:
        """Her voice: a hairline on the left, a gold opening quote, then the line."""
        lh = lh or size * 0.3528 * (1.62 if self.hi else 1.5)
        top = y
        if mark:
            self.set_font("disp", "", size * 3.2)
            self.set_text_color(*(GOLD_PALE if dark else GOLD_PALE))
            self.set_xy(x - 0.6, y - 2.6)
            self.cell(8, 10, "\u201c")
        y = self.rt(text, x + 6.4, y, w - 6.4 - SAFE, size, lh, "body",
                    CREAM_2 if dark else INK_SOFT)
        self.set_draw_color(*(GOLD if dark else GOLD))
        self.set_line_width(0.5)
        self.line(x, top - 1.0, x, y - lh + 1.6)
        return y + 1.6

    # ── art: cropped to the box, never stretched ──────────────────────────
    def plate(self, x, y, w, h, colour=None):
        """A hairline L along the top and left of a photo plate, so a cropped
        figure reads as a deliberate inset rather than a stray rectangle."""
        self.set_draw_color(*(colour or GOLD_DIM))
        self.set_line_width(0.3)
        self.line(x, y, min(x + w, W - 7), y)
        self.line(x, y, x, min(y + h, H - 7))

    def art(self, name: str, x, y, w, h, focus="center", matte=True):
        src = os.path.join(ART, f"muse-{name}.png")
        os.makedirs(CROP, exist_ok=True)
        key = f"{name}-{int(w*4)}x{int(h*4)}-{focus}.png"
        dst = os.path.join(CROP, key)
        if not os.path.exists(dst):
            im = Image.open(src).convert("RGB")
            iw, ih = im.size
            target = w / h
            if iw / ih > target:                       # source too wide
                nw = int(ih * target)
                left = {"left": 0, "right": iw - nw}.get(focus, (iw - nw) // 2)
                im = im.crop((left, 0, left + nw, ih))
            else:                                      # source too tall
                nh = int(iw / target)
                top = {"top": 0, "bottom": ih - nh}.get(focus, (ih - nh) // 2)
                im = im.crop((0, top, iw, top + nh))
            im = im.resize((int(w * 4), int(h * 4)), Image.LANCZOS)
            im.save(dst)
        if matte:
            self.field(x, y, w, h, CREAM)
        self.image(dst, x=x, y=y, w=w, h=h)


# ══════════════════════════════════════════════════════════════════════════
#  copy — six pages, first person
# ══════════════════════════════════════════════════════════════════════════
EN = {
    "p1_eb1": "SHIVAA JEWELS", "p1_eb2": "JAYAL · RAJASTHAN",
    "p1_title1": "SHIVAA", "p1_title2": "BLACK",
    "p1_sub": "Six pages, in my words.",
    "p1_quote": "I am Shivaa. This little book is everything I would tell you at the counter — and nothing I would not.",
    "p1_foot": "No. 0142 / 0500",
    "p1_side": "A CARD · A LITTLE SILVER · TWENTY PERCENT OFF THE CRAFT",

    "p2_num": "01", "p2_eb": "The privilege",
    "p2_h": "Twenty percent, on the craft alone",
    "p2_lead": "A piece of jewellery is four things: the metal, the stones, the making, and the tax. I take something off one of them.",
    "p2_quote": "I reduce the making charges. Never the gold. The gold you pay for is the gold you carry home.",
    "p2_is_t": "What the card is",
    "p2_is": ["20 % off making charges, on every Shivaa piece",
              "Six months from the day it is issued",
              "Free to renew, as often as you like",
              "Bound to your verified mobile number",
              "Applied by itself at checkout"],
    "p2_isnt_t": "What it is not",
    "p2_isnt": ["Not 20 % off the price of the jewellery",
                "Not a discount on gold or silver",
                "Not a loan, an EMI or a credit card",
                "Not for another person's number",
                "Not a reason to buy what you did not want"],
    "p2_bill_t": "This is the whole arithmetic",
    "p2_bill": [("Metal, at the day's rate", "unchanged", False),
                ("Making charges", "10,000", False),
                ("Shivaa Black takes 20 % of that", "\u2212 2,000", True),
                ("Stones · GST · delivery", "unchanged", False),
                ("You pay for the making", "8,000", True)],

    "p3_num": "02", "p3_eb": "The app",
    "p3_h": "Eight things, in your hand",
    "p3_quote": "Everything you used to have to ask at the counter is in the app — at midnight, from another city, without calling anyone.",
    "p3_cards": [
        ("01", "Today's rate", "Gold and silver, and where the number came from."),
        ("02", "The shop", "Every piece, its making charge written separately."),
        ("03", "Swarna Nidhi", "11 + 1: eleven months you, the twelfth me."),
        ("04", "Certificates", "Purity and price, per order. Save or print."),
        ("05", "My bills", "In-store bills in your account. View, download."),
        ("06", "Track", "Insured, seal-checked, OTP-verified at the door."),
        ("07", "Ring size", "Measured at home, against a ring you own."),
        ("08", "Care & buyback", "Lifetime care, and buyback on the pure gold."),
    ],
    "p3_foot": "Free. No subscription, no advertising, and your number is not sold.",

    "p4_num": "03", "p4_eb": "The feel",
    "p4_h": "Why it does not feel like a website",
    "p4_quote": "I did not trust my own eyes on this one. I measured it, then I printed the numbers.",
    "p4_rows": [
        ("123 \u2192 0", "Animation frames a second on a page that is just sitting there. Two loops used to run forever; now they sleep.", "quiet"),
        ("58 \u2192 1", "Stylesheets blocking the first screen, now one bundle of 70 layers. The page arrives sooner.", "bundle"),
        ("0", "Video bytes fetched before you scroll. The films wake only when you reach them.", "film"),
        ("2 \u2192 1", "Layout reads per ten pointer moves. One delegated engine, one cached rect per visit.", "press"),
        ("1", "Motion owner per navigation. A page change slides; it does not flash white.", "slide"),
        ("0", "Timers that rebuild the page while you read. Your thumb stays where it was.", "steady"),
    ],
    "p4_note": "Measured on the real page in a test browser. Where I print a before and an after, I counted both.",

    "p5_num": "04", "p5_eb": "Forty seconds",
    "p5_h": "Three steps, then it is done",
    "p5_steps": [("1", "Scan", "The code on the back of this book, or shivaa.in."),
                 ("2", "Sign in", "The number this card was issued to. Six digits by SMS. No password."),
                 ("3", "See your card", "Same number as the plastic. The discount now applies itself.")],
    "p5_note": "Nothing to print, nothing to carry. The plastic is a keepsake; the card in the app is the one that gives the discount.",
    "p5_note": "Nothing to print, nothing to carry. The plastic is a keepsake; the card in the app is the one that gives the discount.",
    "p5_quote": "If you change your mobile number, tell me at the counter before you change it. The card follows you.",
    "p5_sign_t": "SIGN IN WITH THE NUMBER ON THIS CARD",
    "p5_box_t": "Write your date here",
    "p5_box_p": "The certificate in your box carries the same date as the app. The app cannot be lost; paper can.",
    "p5_day": "day / month / year",

    "p6_h": "Come back with the box.",
    "p6_p": "Bring the card, this book, and — if you kept it — the little silver. First cleaning is free, every visit, for life.",
    "p6_sig": "— Shivaa, Jayal",
    "p6_addr": "SHIVAA JEWELS\nMain Road, Jayal, Rajasthan 341023 · Nagaur",
    "p6_contact": "+91 89050 05921\nsupport@shivaa.in · @shivaa.jewels",
    "p6_hours": "Open every day, 10:00 to 20:30",
    "p6_qr": "Your card, on your phone",
    "p6_legal": "Ernate Shine Jewellery Pvt. Ltd. · shivaa.in",
}

HI = {
    "p1_eb1": "शिवा ज्वेल्स", "p1_eb2": "जायल · राजस्थान",
    "p1_title1": "शिवा", "p1_title2": "ब्लैक",
    "p1_sub": "छह पन्ने, मेरी ज़ुबानी।",
    "p1_quote": "मैं शिवा हूँ। यह छोटी किताब वह सब है जो मैं आपको दुकान पर बताती हूँ — और वह कुछ भी नहीं, जो मैं नहीं बताती।",
    "p1_foot": "क्रमांक 0142 / 0500",
    "p1_side": "एक कार्ड · थोड़ी चांदी · कारीगरी पर बीस प्रतिशत कम",

    "p2_num": "01", "p2_eb": "सुविधा",
    "p2_h": "बीस प्रतिशत, सिर्फ़ कारीगरी पर",
    "p2_lead": "गहने में चार चीज़ें होती हैं: धातु, नग, कारीगरी और कर। मैं इनमें से एक पर कम करती हूँ।",
    "p2_quote": "मैं मेकिंग चार्ज कम करती हूँ। सोना कभी नहीं। जितना सोना आप लेंगी, उतना ही घर ले जाएँगी।",
    "p2_is_t": "कार्ड क्या है",
    "p2_is": ["मेकिंग चार्ज पर 20% कम, शिवा के हर गहने पर",
              "जारी होने के दिन से छह महीने",
              "नवीनीकरण मुफ़्त, जितनी बार चाहें",
              "आपके सत्यापित मोबाइल नंबर से जुड़ा",
              "भुगतान के समय खुद लग जाता है"],
    "p2_isnt_t": "कार्ड क्या नहीं है",
    "p2_isnt": ["गहने के दाम पर 20% छूट नहीं",
                "सोने या चांदी पर छूट नहीं",
                "कर्ज़, ईएमआई या क्रेडिट कार्ड नहीं",
                "किसी और के नंबर पर नहीं",
                "जो नहीं चाहिए वह खरीदने की वजह नहीं"],
    "p2_bill_t": "पूरा हिसाब यही है",
    "p2_bill": [("धातु, उस दिन के भाव पर", "जैसी है वैसी", False),
                ("मेकिंग चार्ज", "10,000", False),
                ("शिवा ब्लैक, उसका 20%", "\u2212 2,000", True),
                ("नग · जीएसटी · डिलीवरी", "जैसे हैं वैसे", False),
                ("मेकिंग में आप देंगी", "8,000", True)],

    "p3_num": "02", "p3_eb": "ऐप",
    "p3_h": "आठ काम, आपके हाथ में",
    "p3_quote": "जो सब दुकान पर पूछना पड़ता था, वह ऐप में है — आधी रात, दूसरे शहर से, किसी को फ़ोन किए बिना।",
    "p3_cards": [
        ("01", "आज का भाव", "सोना-चांदी, और भाव कहाँ से आया।"),
        ("02", "दुकान", "हर गहना, मेकिंग चार्ज अलग लिखी हुई।"),
        ("03", "स्वर्ण निधि", "11 + 1: ग्यारह महीने आप, बारहवाँ मैं।"),
        ("04", "प्रमाण-पत्र", "हर ऑर्डर का शुद्धता और दाम। सहेजिए, छापिए।"),
        ("05", "मेरे बिल", "दुकान की खरीदारी खाते में। देखिए, डाउनलोड कीजिए।"),
        ("06", "ऑर्डर कहाँ है", "बीमित, सीलबंद, ओटीपी से सत्यापित।"),
        ("07", "अंगूठी का साइज़", "घर बैठे, अपनी ही अंगूठी से।"),
        ("08", "देखभाल, बायबैक", "जीवनभर देखभाल, शुद्ध सोने पर बायबैक।"),
    ],
    "p3_foot": "मुफ़्त। कोई सदस्यता-शुल्क नहीं, कोई विज्ञापन नहीं, आपका नंबर किसी को नहीं बेचा जाता।",

    "p4_num": "03", "p4_eb": "एहसास",
    "p4_h": "यह वेबसाइट जैसा क्यों नहीं लगता",
    "p4_quote": "इस बात पर मैंने अपनी आँखों पर भरोसा नहीं किया। नापा, फिर आँकड़े छापे।",
    "p4_rows": [
        ("123 \u2192 0", "रुके हुए पन्ने पर एक सेकंड में एनिमेशन फ़्रेम। दो लूप हमेशा चलते थे, अब सोते हैं।", "quiet"),
        ("58 \u2192 1", "पहला पन्ना रोकने वाली स्टाइलशीटें, अब एक बंडल में 70 परतें।", "bundle"),
        ("0", "स्क्रॉल से पहले खींची गई वीडियो बाइट। फ़िल्म तभी जागती है जब आप वहाँ पहुँचें।", "film"),
        ("2 \u2192 1", "दस उँगली-हरकतों पर लेआउट पढ़ाई। एक इंजन, हर गहने की नाप एक बार।", "press"),
        ("1", "पन्ना बदलने पर गति का एक ही मालिक। पन्ना खिसकता है, सफ़ेद झलकता नहीं।", "slide"),
        ("0", "पढ़ते वक़्त पन्ना दोबारा बनाने वाला टाइमर। आपका अंगूठा वहीं रहता है।", "steady"),
    ],
    "p4_note": "असली पन्ने पर, टेस्ट ब्राउज़र में नापा गया। जहाँ पहले और बाद का आँकड़ा है, वहाँ दोनों गिने गए।",

    "p5_num": "04", "p5_eb": "चालीस सेकंड",
    "p5_h": "तीन कदम, फिर काम हो गया",
    "p5_steps": [("1", "स्कैन", "किताब के पिछले पन्ने का कोड, या shivaa.in।"),
                 ("2", "साइन इन", "जिस नंबर पर कार्ड जारी हुआ। छह अंक SMS से। कोई पासवर्ड नहीं।"),
                 ("3", "अपना कार्ड देखिए", "वही नंबर जो कार्ड पर है। छूट अब खुद लगेगी।")],
    "p5_note": "छापने को कुछ नहीं, साथ रखने को कुछ नहीं। प्लास्टिक यादगार है; छूट ऐप के कार्ड से मिलती है।",
    "p5_quote": "मोबाइल नंबर बदलना हो तो बदलने से पहले दुकान पर बता दीजिए। कार्ड आपके साथ चलता है।",
    "p5_sign_t": "इसी कार्ड के नंबर से साइन इन",
    "p5_box_t": "अपनी तारीख़ यहाँ लिखिए",
    "p5_box_p": "डिब्बे का प्रमाण-पत्र और ऐप, दोनों पर एक ही तारीख़ है। ऐप खो नहीं सकता, काग़ज़ खो जाता है।",
    "p5_day": "दिन / माह / वर्ष",

    "p6_h": "डिब्बा लेकर फिर आइए।",
    "p6_p": "कार्ड, यह किताब, और अगर संभालकर रखी है तो वह थोड़ी चांदी साथ लाइए। पहली सफ़ाई हर बार मुफ़्त, जीवनभर।",
    "p6_sig": "— शिवा, जायल",
    "p6_addr": "शिवा ज्वेल्स\nमेन रोड, जायल, राजस्थान 341023 · नागौर",
    "p6_contact": "+91 89050 05921\nsupport@shivaa.in · @shivaa.jewels",
    "p6_hours": "रोज़ खुला, सुबह 10:00 से रात 8:30 तक",
    "p6_qr": "अपना कार्ड, अपने फ़ोन पर",
    "p6_legal": "अर्नेट शाइन ज्वेलरी प्रा. लि. · shivaa.in",
}


# ══════════════════════════════════════════════════════════════════════════
#  drawn marks
# ══════════════════════════════════════════════════════════════════════════
def glyph(b: Book, kind: str, x: float, y: float, col=None, lw=0.3):
    col = col or GOLD
    b.set_draw_color(*col)
    b.set_line_width(lw)
    if kind == "quiet":
        b.line(x - 5.4, y, x + 5.4, y)
        for dx in (-5.4, 0, 5.4):
            b.ellipse(x + dx - 0.7, y - 0.7, 1.4, 1.4)
    elif kind == "bundle":
        for k in range(3):
            b.line(x - 5.4, y - 1.5 + k * 1.5, x + 5.4, y - 1.5 + k * 1.5)
    elif kind == "film":
        for dx in (-4.6, 1.6):
            b.line(x + dx, y - 2.8, x + dx, y + 2.8)
            b.line(x + dx, y - 2.8, x + dx + 3.0, y)
            b.line(x + dx, y + 2.8, x + dx + 3.0, y)
    elif kind == "press":
        for r in (1.6, 3.0, 4.4):
            b.ellipse(x - r, y - r, 2 * r, 2 * r)
    elif kind == "slide":
        b.line(x - 5.4, y, x + 3.6, y)
        b.line(x + 1.0, y - 2.1, x + 3.6, y)
        b.line(x + 1.0, y + 2.1, x + 3.6, y)
    else:
        b.line(x - 5.4, y - 2.2, x + 5.4, y - 2.2)
        b.line(x - 5.4, y + 2.2, x + 5.4, y + 2.2)
        b.set_dash_pattern(dash=0.7, gap=0.7)
        b.line(x - 5.4, y, x + 5.4, y)
        b.set_dash_pattern()


def ornament(b: Book, cx: float, cy: float, r: float = 9.0, col=GOLD, lw=0.3):
    """A small lotus-ish rosette, drawn from arcs and petals — no image, no font."""
    b.set_draw_color(*col)
    b.set_line_width(lw)
    b.ellipse(cx - r, cy - r, 2 * r, 2 * r)
    b.ellipse(cx - r * 0.62, cy - r * 0.62, 2 * r * 0.62, 2 * r * 0.62)
    for i in range(8):
        import math
        a = i * math.pi / 4
        b.line(cx + math.cos(a) * r * 0.62, cy + math.sin(a) * r * 0.62,
               cx + math.cos(a) * r, cy + math.sin(a) * r)
    b.ellipse(cx - 1.1, cy - 1.1, 2.2, 2.2)


# ══════════════════════════════════════════════════════════════════════════
#  pages — `frame` 0 is the printed page; 1..n are the animated overlay marks
#  (overlays must paint ONLY their own marks: they are stacked on the base)
# ══════════════════════════════════════════════════════════════════════════
def page1(b: Book, c: dict, frame: int = 0):
    b.add_page()
    if frame == 1:                      # the twin rule arrives under the title
        b.set_draw_color(*GOLD_L)
        b.set_line_width(0.8)
        b.line(M, 94.0, M + 12, 94.0)
        b.set_draw_color(*GOLD_DIM)
        b.set_line_width(0.25)
        b.line(M, 95.8, M + 26, 95.8)
        return
    if frame == 2:                      # the seal, low in the black panel
        ornament(b, M + 9.0, H - 42, 7.5, GOLD, 0.35)
        return
    b.field(0, 0, W, H, INK)
    b.frame_rect(7, GOLD, 0.45)
    b.art("hero", 60, 0, 88, 210, focus="top", matte=True)
    # the left column is a black panel with its own gold hairline
    b.set_draw_color(*GOLD_DIM)
    b.set_line_width(0.3)
    b.line(58, 7, 58, H - 7)
    ornament(b, 21, 30, 6.4, GOLD, 0.3)
    b.spaced(c["p1_eb1"], M, 42, 44, 6.2, GOLD_L, 1.3)
    b.spaced(c["p1_eb2"], M, 48, 44, 5.4, GOLD_DIM, 0.9)
    b.rule(56, 14, M, GOLD, 0.45)
    b.rt(c["p1_title1"], M, 64, 44, 19.0, 9.4, "display", GOLD_L)
    b.rt(c["p1_title2"], M, 73.4, 44, 19.0, 9.4, "display", CREAM)
    b.rt(c["p1_sub"], M, 88, 40, 8.0, 4.2, "body", GOLD_PALE)
    qy = 112
    b.set_draw_color(*GOLD)
    b.set_line_width(0.6)
    b.line(M, qy - 2, M, qy + 40)
    b.rt(c["p1_quote"], M + 4, qy, 36 - SAFE, 7.2, 3.7, "body", CREAM_2)
    # vertical promise, running up the panel edge
    with b.rotation(90, x=50.0, y=H - 24):
        b.spaced(c["p1_side"], 50.0, H - 24, 76, 5.0, GOLD_DIM, 0.7)
    b.rt(c["p1_foot"], M, H - 20, 40, 5.8, 3.2, "label", GOLD_DIM)


def page2(b: Book, c: dict, frame: int = 0):
    b.add_page()
    if frame == 1:                      # the row that does the work
        b.set_draw_color(*MAROON)
        b.set_line_width(0.5)
        b.rect(M - 3.0, b._bill_y + b._bill_step * 2 - 1.4, 80.6, 8.4)
        return
    if frame == 2:                      # the total, boxed in gold
        b.set_draw_color(*GOLD)
        b.set_line_width(0.7)
        b.rect(M - 3.0, b._bill_y + b._bill_step * 4 - 1.4, 80.6, 8.4)
        return
    b.field(0, 0, W, H, CREAM)
    b.frame_rect(7, LINE, 0.3)
    b.art("gesture", 92, 46, 56, 164, focus="top", matte=True)
    b.plate(92, 46, 56, 164)
    b.eyebrow(c["p2_num"], c["p2_eb"], M + 2)
    y = b.h1(c["p2_h"], M + 13, 19.0, INK, w=80)
    y = b.rt(c["p2_lead"], M, y + 2, 76 - SAFE, 8.6, 4.3, "body", MUTED) + 3.2
    y = b.quote(c["p2_quote"], M, y + 1, 76, 9.4) + 4.0
    for i, (t, items) in enumerate(((c["p2_is_t"], c["p2_is"]), (c["p2_isnt_t"], c["p2_isnt"]))):
        b.rt(t, M, y, 74, 8.4, 4.3, "strong", MAROON if i == 0 else MUTED)
        b.rule(y + 5.0, 70, M, GOLD if i == 0 else LINE, 0.25)
        yy = y + 8.2
        for it in items:
            b.set_font("sans", "", 7.8)
            b.set_text_color(*(GOLD if i == 0 else MUTED))
            b.set_xy(M, yy + 0.2)
            b.cell(3.4, 3.4, "+" if i == 0 else "x")
            yy = b.rt(it, M + 4.0, yy, 70 - 4.0 - SAFE, 7.8, 3.5, "body",
                      INK_SOFT if i == 0 else MUTED) + 1.1
        y = yy + 3.8
    y = b.rt(c["p2_bill_t"], M, y, 76, 8.6, 4.4, "strong", MAROON) + 1.0
    b.rule(y, 74, M, LINE, 0.2)
    y += 2.0
    b._bill_y = y
    b._bill_step = 7.0
    for lab, val, hot in c["p2_bill"]:
        if hot:
            b.field(M - 1.6, y - 0.9, 77, 7.0, (236, 220, 186))
        b.rt(lab, M, y, 50, 8.0, 3.9, "body", INK_SOFT)
        b.rt(val, M + 26, y, 50, 8.0, 3.9, "strong" if hot else "body",
             MAROON if hot else INK_SOFT, align="R")
        y += 7.0


def page3(b: Book, c: dict, frame: int = 0):
    b.add_page()
    if frame:                           # one row of the grid lights per frame
        colw = (CW - 6) / 2
        for i in range(0, 8):
            if i // 2 != frame - 1:
                continue
            x = M + (i % 2) * (colw + 6)
            yy = b._grid_y + (i // 2) * b._grid_pitch
            b.set_draw_color(*GOLD)     # outline only: the words stay readable
            b.set_line_width(0.35)
            b.rect(x - 2.4, yy - 2.2, colw + 3.4, b._grid_pitch - 2.0)
        return
    b.field(0, 0, W, H, INK)
    band = 64.0
    b.art("phone-crop", 0, 0, W, band, focus="center", matte=True)
    b.set_draw_color(*GOLD)
    b.set_line_width(0.5)
    b.line(0, band, W, band)
    y = b.eyebrow(c["p3_num"], c["p3_eb"], band + 10, dark=True)
    y = b.h1(c["p3_h"], y + 1.5, 17.0, CREAM)
    y = b.quote(c["p3_quote"], M, y + 0.6, CW, 8.6, dark=True) + 2.6
    colw = (CW - 6) / 2
    b._grid_y = y + 1.0
    b._grid_pitch = ((H - 24) - b._grid_y) / 4
    for i, (num, t, d) in enumerate(c["p3_cards"]):
        x = M + (i % 2) * (colw + 6)
        yy = b._grid_y + (i // 2) * b._grid_pitch
        b.set_font("sans", "", 6.4)
        b.set_text_color(*GOLD)
        b.set_xy(x, yy)
        b.cell(6, 3.2, num)
        b.rt(t, x + 6.4, yy - 0.8, colw - 6.4, 8.0, 3.9, "strong", GOLD_PALE)
        b.rt(d, x + 6.4, yy + 3.9, colw - 6.4 - SAFE, 7.2, 3.3, "body", CREAM_3)
    b.rule(H - 20, 18, M, GOLD, 0.4)
    b.rt(c["p3_foot"], M, H - 16, CW - SAFE, 7.4, 3.6, "body", GOLD_DIM)


def page4(b: Book, c: dict, frame: int = 0):
    b.add_page()
    if frame == 1:                       # the first number, circled
        b.set_draw_color(*MAROON)
        b.set_line_width(0.45)
        b.ellipse(M + 0.2, b._rows_y - 2.4, 17.0, 12.0)
        return
    if frame == 2:                       # press: a ripple at the glyph
        b.set_draw_color(*GOLD)
        b.set_line_width(0.35)
        cy = b._rows_y + 3 * b._row_step + 3.6
        for r in (2.6, 4.4):
            b.ellipse(M + 22.4 - r, cy - r, 2 * r, 2 * r)
        return
    b.field(0, 0, W, H, CREAM)
    b.frame_rect(7, LINE, 0.3)
    b.art("hero", 96, 30, 52, 66, focus="top", matte=True)
    b.plate(96, 30, 52, 66)
    y = b.eyebrow(c["p4_num"], c["p4_eb"], M + 2)
    y = b.h1(c["p4_h"], y + 2, 18.0, INK, w=84)
    y = b.quote(c["p4_quote"], M, y + 1, 80, 8.6) + 3.4
    b._rows_y = y
    b._row_step = 18.6
    for i, (figure, text, kind) in enumerate(c["p4_rows"]):
        yy = y + i * 18.6
        b.set_font("sans", "", 15.0)
        b.set_text_color(*MAROON)
        b.set_xy(M, yy)
        b.cell(25, 7.4, figure)
        glyph(b, kind, M + 22.2, yy + 3.4, GOLD)
        b.rt(text, M + 32, yy - 0.6, 52 - SAFE, 7.3, 3.4, "body", MUTED)
        b.rule(yy + 15.2, 84, M, LINE, 0.2)
    b.rule(H - 24, 18, M, GOLD, 0.4)
    b.rt(c["p4_note"], M, H - 20, 84 - SAFE, 7.3, 3.5, "body", MUTED)


def page5(b: Book, c: dict, frame: int = 0):
    b.add_page()
    if frame in (1, 2):                 # the code fills, then the tick
        y2 = b._strip_y + 4.6
        for k in range(6):
            if k >= (3 if frame == 1 else 6):
                continue
            b.set_fill_color(*GOLD)
            b.ellipse(M + 41.5 + k * 4.0, y2 + 4.0, 1.5, 1.5, "F")
        if frame == 2:
            tx, ty = M + 64.6, y2 + 7.0
            b.set_draw_color(*GOLD)
            b.set_line_width(0.7)
            b.line(tx - 2.6, ty, tx - 0.7, ty + 2.1)
            b.line(tx - 0.7, ty + 2.1, tx + 3.0, ty - 2.1)
        return
    b.field(0, 0, W, H, INK)
    b.frame_rect(7, GOLD, 0.35)
    b.art("card", 84, 48, 64, 84, focus="center", matte=True)
    b.plate(84, 48, 64, 84)
    y = b.eyebrow(c["p5_num"], c["p5_eb"], M + 4, dark=True)
    y = b.h1(c["p5_h"], y + 2, 18.0, CREAM, w=70)
    for num, t, d in c["p5_steps"]:
        b.rt(num, M, y - 2.4, 12, 18, 9.2, "display", GOLD)
        yy = b.rt(t, M + 11, y, 58, 9.4, 4.6, "strong", GOLD_PALE)
        yy = b.rt(d, M + 11, yy + 1.0, 58 - SAFE, 7.5, 3.5, "body", CREAM_3)
        y = yy + 6.0
    b._strip_y = y + 3
    # the sign-in card, drawn: a number field, six dots, a tick
    b.field(M, b._strip_y - 3.6, 70, 26, INK_2, GOLD_DIM, 0.3)
    b.rt(c["p5_sign_t"], M + 4, b._strip_y - 0.6, 62, 6.2, 3.1, "label", GOLD_DIM)
    y2 = b._strip_y + 4.6
    b.field(M + 4, y2, 30, 9.4, (28, 24, 20), GOLD_DIM, 0.2)
    b.rt("+91 98765 43210", M + 5.4, y2 + 2.7, 28, 6.0, 3.2, "label", MUTED)
    b.field(M + 37, y2, 29, 9.4, (28, 24, 20), GOLD_DIM, 0.2)
    for k in range(6):
        b.set_fill_color(*GOLD_DIM)
        b.ellipse(M + 41.5 + k * 4.0, y2 + 4.0, 1.5, 1.5, "F")
    # the tick box, right of the card (over the black gutter)
    b.rt("✓" if False else "", 0, 0, 0, 0, 0, "label", GOLD) if False else None
    b.rule(b._strip_y + 32, 18, M, GOLD, 0.4)
    b.rt(c["p5_note"], M, b._strip_y + 36, 68 - SAFE, 7.2, 3.5, "body", CREAM_3)
    y = b.quote(c["p5_quote"], M, b._strip_y + 52, 70, 8.0, dark=True) + 2
    bh = 30
    b.field(84, 142, 64, bh, INK_2, GOLD, 0.35)
    yy = b.rt(c["p5_box_t"], 88, 146, 56, 8.4, 4.2, "strong", GOLD_PALE)
    b.rt(c["p5_box_p"], 88, yy + 0.8, 52 - SAFE, 6.4, 3.1, "body", MUTED)
    b.set_draw_color(*GOLD_DIM)
    b.set_line_width(0.3)
    b.line(88, 142 + bh - 6.4, 144, 142 + bh - 6.4)
    b.rt(c["p5_day"], 88, 142 + bh - 5.6, 56, 5.6, 2.9, "label", GOLD_DIM)


def page6(b: Book, c: dict, frame: int = 0):
    b.add_page()
    qx, qy, qs = M, H - 74, 28
    if frame == 1:                       # the code breathes
        b.set_draw_color(*GOLD_L)
        for r, lw in ((1, 0.4), (2, 0.25)):
            b.set_line_width(lw)
            b.rect(qx - 1.4 - r * 1.8, qy - 1.4 - r * 1.8, qs + 2.8 + r * 3.6, qs + 2.8 + r * 3.6)
        return
    if frame == 2:                       # a small rosette by the signature
        ornament(b, M + 6.0, H - 93, 6.0, GOLD_PALE, 0.3)
        return
    b.field(0, 0, W, H, INK)
    b.art("namaste", 66, 0, 82, 210, focus="top", matte=True)
    b.set_draw_color(*GOLD)
    b.set_line_width(0.45)
    b.line(66, 0, 66, H)
    y = b.rt(c["p6_h"], M, 26, 52 - SAFE, 15.0, 7.4, "display", GOLD_L)
    y = b.rt(c["p6_p"], M, y + 2.4, 50 - SAFE, 7.6, 3.6, "body", CREAM_2)
    y = b.rt(c["p6_sig"], M, y + 1.0, 50, 8.6, 4.8, "display", GOLD_PALE)
    b._sig_y = y - 1.0
    y += 4
    b.rule(y, 18, M, GOLD, 0.4)
    y += 4
    for line, size, col in ((c["p6_addr"], 7.8, CREAM_2), (c["p6_contact"], 7.2, GOLD_PALE),
                            (c["p6_hours"], 7.2, GOLD_PALE)):
        y = b.rt(line, M, y, 50 - SAFE, size, size * 0.55, "body", col) + 1.6
    b.field(qx - 2, qy - 2, qs + 4, qs + 4, CREAM)
    b.image(qr_png(), x=qx, y=qy, w=qs, h=qs)
    b.rt(c["p6_qr"], M, qy + qs + 9.4, 52, 6.2, 3.1, "body", GOLD_PALE)
    b.rt(c["p6_legal"], M, H - 22, 50 - SAFE, 5.8, 2.9, "label", GOLD_DIM)


PAGES = (page1, page2, page3, page4, page5, page6)
FRAMES = (3, 3, 3, 3, 3, 3)


def qr_png() -> str:
    import qrcode
    p = os.path.join(CACHE, "qr-black-card.png")
    if not os.path.exists(p):
        os.makedirs(CACHE, exist_ok=True)
        q = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=14, border=1)
        q.add_data("https://shivaa.in/#/black-card")
        q.make(fit=True)
        q.make_image(fill_color="#14110e", back_color="#faf6ef").save(p)
    return p


# ══════════════════════════════════════════════════════════════════════════
#  build: base pages, then the animated edition with frames as layers
# ══════════════════════════════════════════════════════════════════════════
def base_pdf(lang: str, c: dict, anchors_out: list | None = None) -> bytes:
    b = Book(lang)
    for fn in PAGES:
        fn(b, c, 0)
        if anchors_out is not None:      # the measured anchors of this page
            anchors_out.append({k: getattr(b, k, None) for k in ANCHORS})
    return bytes(b.output())


ANCHORS = ("_bill_y", "_bill_step", "_grid_y", "_grid_pitch", "_strip_y", "_sig_y",
           "_rows_y")


def frame_pdf(lang: str, c: dict, page_index: int, frame: int,
              anchors: list | None = None) -> bytes | None:
    """One overlay document: only the marks of that page and frame.

    Anchors come from the base document already typeset for this language, so
    the marks land exactly on the rows, dots and boxes they point at."""
    fn = PAGES[page_index]
    b = Book(lang)
    if anchors:                          # same layout pass as the printed page
        for k, v in anchors[page_index].items():
            setattr(b, k, v)
    fn(b, c, frame)                      # draws only this frame's marks
    return bytes(b.output())


def make_plain(lang: str, c: dict, out: str) -> str:
    data = base_pdf(lang, c)
    with open(out, "wb") as fh:
        fh.write(data)
    return out


def make_animated(lang: str, c: dict, out: str) -> str:
    anchors: list = []
    pdf = pikepdf.open(io.BytesIO(base_pdf(lang, c, anchors)))
    first_frame: list = []               # frame 1 is shown, frame 2 waits
    for pi, page in enumerate(pdf.pages):
        if page.get("/Resources") is None:
            page.Resources = pikepdf.Dictionary()
        if page.Resources.get("/XObject") is None:
            page.Resources.XObject = pikepdf.Dictionary()
        # /Trans = Fade: full-screen readers cross-fade between pages
        page.Trans = pdf.make_indirect(pikepdf.Dictionary(
            Type=pikepdf.Name.Trans, S=pikepdf.Name.Fade, D=0.8, M=pikepdf.Name.O))
        for fr in range(1, FRAMES[pi]):
            overlay = pikepdf.open(io.BytesIO(frame_pdf(lang, c, pi, fr, anchors)))
            sp = overlay.pages[0]
            cs = sp.Contents
            raw = (b"".join(bytes(s.read_bytes()) for s in cs)
                   if isinstance(cs, pikepdf.Array) else bytes(cs.read_bytes()))
            if not raw.strip():
                continue
            xo = pikepdf.Stream(pdf, raw)
            xo.Type = pikepdf.Name.XObject
            xo.Subtype = pikepdf.Name.Form
            xo.BBox = pikepdf.Array([0, 0, W * 72 / 25.4, H * 72 / 25.4])
            res = pikepdf.Dictionary()
            for key in ("/Font", "/ExtGState", "/ColorSpace", "/XObject"):
                if key in sp.get("/Resources", {}):
                    val = sp.Resources[key]
                    if not val.is_indirect:
                        continue
                    res[key] = pdf.copy_foreign(val)
            xo.Resources = res
            name = pikepdf.Name(f"/Pg{pi + 1}F{fr}")
            page.Resources.XObject[name] = xo
            if page.Resources.get("/Properties") is None:
                page.Resources.Properties = pdf.make_indirect(pikepdf.Dictionary())
            ocg = pdf.make_indirect(pikepdf.Dictionary(
                Type=pikepdf.Name.OCG,
                Name=pikepdf.String(("Frame %d · page %d" if lang == "EN" else "फ़्रेम %d · पन्ना %d")
                                    % (fr, pi + 1))))
            pdf.Root.OCProperties = pdf.Root.get("/OCProperties") or pdf.make_indirect(
                pikepdf.Dictionary(OCGs=pikepdf.Array(),
                                   D=pikepdf.Dictionary(Order=pikepdf.Array(),
                                                        ON=pikepdf.Array(),
                                                        OFF=pikepdf.Array(),
                                                        BaseState=pikepdf.Name.OFF)))
            oc = pdf.Root.OCProperties
            oc.OCGs.append(ocg)
            if fr == 1:
                first_frame.append(ocg)
            d = oc.D
            off = d.get("/OFF")
            if off is None:
                off = d.OFF = pikepdf.Array()
            off.append(ocg)
            order = d.get("/Order")
            if order is None:
                order = d.Order = pikepdf.Array()
            order.append(ocg)
            # append the overlay to the page content, inside its own marked block
            cur = page.Contents
            raw0 = (b"".join(bytes(s.read_bytes()) for s in cur)
                    if isinstance(cur, pikepdf.Array) else bytes(cur.read_bytes()))
            pname = f"/MCF{fr}"            # page-local layer name
            page.Resources.Properties[pname] = ocg
            block = (f"/OC {pname} BDC q 1 0 0 1 0 0 cm {name} Do Q EMC\n".encode())
            page.Contents = pdf.make_stream(b"q\n" + raw0 + b"\nQ\n" + block)
    # a reader that ignores scripts still sees frame 1 of every page; turning
    # on "Frame 2 · ..." in the Layers panel plays the rest of the beat
    oc = pdf.Root.OCProperties
    oc.D.ON = pikepdf.Array(first_frame)
    oc.D.OFF = pikepdf.Array([o for o in oc.OCGs if o not in first_frame])
    oc.D.BaseState = pikepdf.Name.OFF
    pdf.save(out, linearize=False)
    return out


def main() -> int:
    os.makedirs(HERE, exist_ok=True)
    made = []
    for lang, c in (("EN", EN), ("HI", HI)):
        plain = os.path.join(HERE, f"SHIVAA-BLACK-booklet-{lang}.pdf")
        anim = os.path.join(HERE, f"SHIVAA-BLACK-booklet-{lang}-animated.pdf")
        made += [make_plain(lang, c, plain), make_animated(lang, c, anim)]
    for p in made:
        print(f"{os.path.basename(p):44s} {os.path.getsize(p) / 1024:7.1f} KB")
    if "--render" in sys.argv:
        import pymupdf
        out = os.path.join(tempfile.gettempdir(), "booklet-preview")
        os.makedirs(out, exist_ok=True)
        for p in made:
            tag = os.path.basename(p).replace("SHIVAA-BLACK-booklet-", "").replace(".pdf", "")
            with pymupdf.open(p) as doc:
                for i, page in enumerate(doc, 1):
                    page.get_pixmap(dpi=120).save(os.path.join(out, f"{tag}-p{i:02d}.png"))
        print("rendered to", out)
        # one contact sheet per language: the animated book, frame 1 showing
        from PIL import Image, ImageDraw
        for lang in ("EN", "HI"):
            src = os.path.join(HERE, f"SHIVAA-BLACK-booklet-{lang}-animated.pdf")
            with pymupdf.open(src) as doc:
                tiles = []
                for page in doc:
                    pix = page.get_pixmap(dpi=96)
                    tiles.append(Image.frombytes("RGB", (pix.width, pix.height), pix.samples))
            tw, th = tiles[0].size
            gap, pad = 18, 26
            cols, rows = 3, 2
            sheet = Image.new("RGB", (pad * 2 + cols * tw + (cols - 1) * gap,
                                      pad * 2 + rows * th + (rows - 1) * gap),
                              (250, 246, 239))
            dr = ImageDraw.Draw(sheet)
            for i, tile in enumerate(tiles):
                x = pad + (i % cols) * (tw + gap)
                y = pad + (i // cols) * (th + gap)
                sheet.paste(tile, (x, y))
                dr.rectangle([x - 1, y - 1, x + tw, y + th], outline=(185, 138, 47))
            dst = os.path.join(HERE, f"preview-{lang}.png")
            sheet.save(dst)
            print(f"contact sheet  {os.path.basename(dst):44s} {sheet.size[0]}x{sheet.size[1]}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
