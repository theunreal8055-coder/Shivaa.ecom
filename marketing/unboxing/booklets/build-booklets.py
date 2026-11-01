#!/usr/bin/env python3
"""
Shivaa Black — the two app booklets, as print-ready PDFs.

    python3 marketing/unboxing/booklets/build-booklets.py            # build
    python3 marketing/unboxing/booklets/build-booklets.py --render    # build + PNGs

Writes:
    marketing/unboxing/booklets/SHIVAA-BLACK-booklet-EN.pdf
    marketing/unboxing/booklets/SHIVAA-BLACK-booklet-HI.pdf

A5 portrait, 148 x 210 mm, 12 pages each, the same page order in both languages,
so the Hindi book can be dropped in place of the English one or printed as the
other side of the same gathering.

WHY THIS FILE HAS ITS OWN LINE BREAKER
--------------------------------------
Devanagari needs real shaping (matras reorder, conjuncts form), which fpdf2 does
through uharfbuzz. fpdf2 2.9.0 then measures the *unshaped* string to decide
where to break a line, and its wrap of already-shaped text corrupts the second
line whenever a line mixes scripts ("shivaa.in — ब्राउज़र से…" came out as
unrelated glyphs). So this builder never calls multi_cell for body text:
`rt()` splits a paragraph into words, picks a font per word by script, measures
each word with that font (shaped), breaks greedily by width, and draws word by
word with cell(). One line, one run, no re-slicing.

FONTS
    Marcellus            cms/fonts/marcellus-400.woff2      display, Latin
    Cormorant Garamond   cms/fonts/cormorant-garamond.woff2  body, Latin
    Jost                 cms/fonts/jost.woff2                labels, Latin
    Noto Sans Devanagari @fontsource/noto-sans-devanagari 5.3.0  (OFL)
    Noto Sans (latin)    @fontsource/noto-sans 5.3.0            (OFL, latin inside Hindi)

COPY RULES honoured here: the only percentage is 20, on making charges only; six
months, renewable; every app capability named exists as a route in cms/js/app.js;
no invented price, purity, customer count or guarantee.
"""
from __future__ import annotations

import os
import re
import subprocess
import sys
import tempfile

from fpdf import FPDF

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
FONTS = os.path.join(REPO, "cms", "fonts")
CACHE = os.path.join(tempfile.gettempdir(), "shivaa-fonts")

# ── palette (cms/css/styles.css) ───────────────────────────────────────────
INK = (20, 17, 14)
INK_SOFT = (43, 33, 24)
GOLD = (185, 138, 47)
GOLD_L = (212, 175, 90)
GOLD_PALE = (239, 220, 178)
GOLD_DIM = (150, 133, 102)
CREAM = (250, 246, 239)
CREAM_2 = (244, 236, 221)
MAROON = (110, 30, 42)
MUTED = (111, 99, 83)
LINE = (216, 201, 171)
WHITE = (255, 255, 255)

W, H = 148.0, 210.0
M = 14.0
CW = W - 2 * M
SAFE = 1.6          # keep text a hair inside any rule that follows it
DEV = re.compile(r"[\u0900-\u097F]")

PFX = "@fontsource/noto-sans-devanagari"
PFX2 = "@fontsource/noto-sans"


# ══════════════════════════════════════════════════════════════════════════
#  fonts: woff/woff2 -> ttf (fontTools), npm packages fetched once
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


def _lining_figures(src: str, out: str) -> str:
    """Cormorant's default digits are oldstyle (10,000 reads as IO,OOO). fpdf2 has
    no API for OpenType features, so the font's own 'lnum' substitution is baked
    into the cmap instead: every digit maps to its lining glyph."""
    os.makedirs(CACHE, exist_ok=True)
    dst = os.path.join(CACHE, out)
    if os.path.exists(dst):
        return dst
    from fontTools.ttLib import TTFont
    f = TTFont(src)
    f.flavor = None
    mapping: dict[str, str] = {}
    try:
        gsub = f["GSUB"].table
        idx = {i: fr for i, fr in enumerate(gsub.FeatureList.FeatureRecord)}
        lookups = set()
        for fr in idx.values():
            if fr.FeatureTag == "lnum":
                lookups.update(fr.Feature.LookupListIndex)
        for li in lookups:
            for sub in gsub.LookupList.Lookup[li].SubTable:
                if hasattr(sub, "mapping"):
                    mapping.update(sub.mapping)
    except Exception:
        mapping = {}
    if mapping:
        cmap_table = f["cmap"]
        for table in cmap_table.tables:
            for cp in range(0x30, 0x3A):
                g = table.cmap.get(cp)
                if g in mapping:
                    table.cmap[cp] = mapping[g]
    f.save(dst)
    return dst


def _npm(pkg: str, version: str, member: str, out: str) -> str:
    os.makedirs(CACHE, exist_ok=True)
    dst = os.path.join(CACHE, out)
    if os.path.exists(dst):
        return dst
    slug = pkg.split("/")[-1]
    tgz = os.path.join(CACHE, f"{slug}-{version}.tgz")
    if not os.path.exists(tgz):
        subprocess.run(["curl", "-sSfL", "-o", tgz,
                        f"https://registry.npmjs.org/{pkg}/-/{slug}-{version}.tgz"], check=True)
    subprocess.run(["tar", "xzf", tgz, "-C", CACHE], check=True)
    src = os.path.join(CACHE, "package", "files", member)
    if not os.path.exists(src):
        raise SystemExit(f"missing {member} in {pkg}")
    return _to_ttf(src, out)


FONT_FILES = {}


def build_fonts() -> dict:
    if FONT_FILES:
        return FONT_FILES
    f = {
        "disp": _to_ttf(os.path.join(FONTS, "marcellus-400.woff2"), "marcellus.ttf"),
        "serif": _lining_figures(_to_ttf(os.path.join(FONTS, "cormorant-garamond.woff2"),
                                        "cormorant.ttf"), "cormorant-lnum.ttf"),
        "sans": _to_ttf(os.path.join(FONTS, "jost.woff2"), "jost.ttf"),
    }
    for wt in (400, 500, 700):
        f[f"dev{wt}"] = _npm(PFX, "5.3.0",
                             f"noto-sans-devanagari-devanagari-{wt}-normal.woff", f"nsd-{wt}.ttf")
        f[f"lat{wt}"] = _npm(PFX2, "5.3.0",
                             f"noto-sans-latin-{wt}-normal.woff", f"nsl-{wt}.ttf")
    FONT_FILES.update(f)
    return f


# ══════════════════════════════════════════════════════════════════════════
#  the document
# ══════════════════════════════════════════════════════════════════════════
class Booklet(FPDF):
    def __init__(self, lang: str):
        super().__init__(orientation="P", unit="mm", format=(W, H))
        self.lang = lang
        self.set_auto_page_break(False)
        self.set_margins(M, M, M)
        self.set_title("Shivaa Black — the app booklet" if lang == "EN"
                       else "शिवा ब्लैक — ऐप किताब")
        self.set_author("Shivaa Jewels, Jayal")
        self.set_subject("Shivaa Black card and app — what you get")
        self.set_creator("Shivaa · marketing/unboxing/booklets")
        self.set_keywords("Shivaa Black, app booklet, 20 % making charges, Jayal")
        f = build_fonts()
        for name in ("disp", "serif", "sans"):
            self.add_font(name, "", f[name])
        for wt in (400, 500, 700):
            self.add_font(f"dev{wt}", "", f[f"dev{wt}"])
            self.add_font(f"lat{wt}", "", f[f"lat{wt}"])
        self.set_text_shaping(True)     # Devanagari matras + conjuncts

        # role -> (devanagari family, latin family)
        if lang == "HI":
            self.roles = {
                "display": ("dev700", "lat700"),
                "body": ("dev400", "lat400"),
                "strong": ("dev700", "lat700"),
                "mid": ("dev500", "lat500"),
                "label": ("dev500", "lat500"),
            }
        else:
            self.roles = {
                "display": ("disp", "disp"),
                "body": ("serif", "serif"),
                "strong": ("sans", "sans"),
                "mid": ("sans", "sans"),
                "label": ("sans", "sans"),
            }

    # ── the line breaker ──────────────────────────────────────────────────
    def _font_for(self, word: str, role: str) -> str:
        dev, lat = self.roles[role]
        return dev if DEV.search(word) else lat

    def _runs(self, word: str, role: str) -> list[str]:
        """Split one word into script runs: Devanagari glyphs come from the Indic
        font, everything else (digits, comma, %, ₹) from the Latin one."""
        dev, _ = self.roles[role]
        runs: list[str] = []
        for ch in word:
            want_dev = bool(DEV.match(ch))
            if runs and runs[-1][0] == want_dev:
                runs[-1][1] += ch
            else:
                runs.append([want_dev, ch])
        return runs

    def _word_runs(self, word: str, role: str, size: float) -> list[tuple]:
        """[(font, text, width)] for one word, measured run by run."""
        dev, lat = self.roles[role]
        out = []
        for is_dev, chunk in self._runs(word, role):
            fnt = dev if is_dev else lat
            self.set_font(fnt, "", size)
            out.append((fnt, chunk, self.get_string_width(chunk)))
        return out

    def lines_of(self, text: str, w: float, size: float, role: str = "body") -> list[list[list[tuple]]]:
        """Greedy wrap. A line is a list of words; a word is a list of runs of
        (font, chunk, width). Kept as words so the inter-word gap is counted
        exactly once."""
        out: list[list[list[tuple]]] = []
        self.set_font(self.roles[role][1], "", size)
        sp = self.get_string_width(" ")
        for para in text.split("\n"):
            cur: list[list[tuple]] = []
            curw = 0.0
            for word in para.split(" "):
                if word == "":
                    continue
                runs = self._word_runs(word, role, size)
                ww = sum(w3 for _, _, w3 in runs)
                need = ww + (sp if cur else 0.0)
                if cur and curw + need > w:
                    out.append(cur)
                    cur, curw = [runs], ww
                else:
                    cur.append(runs)
                    curw += need
            out.append(cur)
        return out

    def rt(self, text: str, x: float, y: float, w: float, size: float, lh: float,
           role: str = "body", colour=None, align: str = "L") -> float:
        """Draw text as measured runs; returns the y under the last line."""
        if colour:
            self.set_text_color(*colour)
        self.set_font(self.roles[role][1], "", size)
        sp = self.get_string_width(" ")
        for line in self.lines_of(text, w, size, role):
            total = sum(sum(w3 for _, _, w3 in word) for word in line) + sp * max(0, len(line) - 1)
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

    def height_of(self, text: str, w: float, size: float, lh: float, role: str = "body") -> float:
        return len(self.lines_of(text, w, size, role)) * lh

    # ── utility ───────────────────────────────────────────────────────────
    def spaced(self, text: str, x: float, y: float, w: float, size: float,
               colour, spacing: float = 0.5, align: str = "L", latin: bool = True):
        """A letter-spaced label. Only ever Latin (Devanagari must not be spaced)."""
        self.set_font("sans", "", size)
        self.set_text_color(*colour)
        try:
            self.set_char_spacing(spacing)
        except Exception:
            pass
        total = self.get_string_width(text)
        cx = x + (w - total) / 2 if align == "C" else (x + w - total if align == "R" else x)
        self.set_xy(cx, y)
        self.cell(total, 4, text)
        try:
            self.set_char_spacing(0)
        except Exception:
            pass
        return y + 4

    def rule(self, y: float, w: float = 0.0, x: float = 0.0, colour=GOLD, lw: float = 0.3):
        self.set_draw_color(*colour)
        self.set_line_width(lw)
        self.line(x or M, y, (x or M) + (w or CW), y)

    def cream_page(self, n: int, kicker: str):
        self.add_page()
        self.set_fill_color(*CREAM)
        self.rect(0, 0, W, H, "F")
        self.set_draw_color(*LINE)
        self.set_line_width(0.25)
        self.rect(M - 5, M - 5, CW + 10, H - 2 * M + 10)
        self.set_font("sans", "", 6.4)
        self.set_text_color(*MUTED)
        self.set_xy(M - 2, H - M + 1.0)
        self.cell(20, 4, f"{n:02d}")
        if DEV.search(kicker):
            self.set_font("dev500", "", 6.6)
            self.set_text_color(*MUTED)
            self.set_xy(W - M - 40, H - M + 0.6)
            self.cell(42, 4, kicker, align="R")
        else:
            self.spaced(kicker, W - M - 42, H - M + 0.4, 42, 6.2, MUTED, 0.7, align="R")

    def kicker(self, text: str, y: float) -> float:
        if DEV.search(text):
            self.set_font("dev700", "", 8.2)
            self.set_text_color(*GOLD)
            self.set_xy(M, y)
            self.cell(CW, 4.5, text)
        else:
            self.spaced(text.upper(), M, y + 0.6, CW, 6.8, GOLD, 0.9)
        self.rule(y + 6.4, 16, lw=0.6)
        return y + 11.5

    def h1(self, text: str, y: float, size: float = 20.0, colour=INK) -> float:
        y = self.rt(text, M, y, CW - SAFE, size, size * 0.46, "display", colour)
        return y + 2.6

    def para(self, text: str, y: float, size: float = 10.0, w: float | None = None,
             colour=INK_SOFT, lh: float | None = None, role: str = "body") -> float:
        lh = lh or size * 0.3528 * (1.62 if self.lang == "HI" else 1.5)
        y = self.rt(text, M, y, (w or CW) - SAFE, size, lh, role, colour)
        return y + 2.2

    def card(self, x: float, y: float, w: float, h: float, num: str, title: str,
             text: str, fill=WHITE, title_colour=MAROON,
             title_size: float = 8.8, body_size: float = 8.0, pad: float = 4.4):
        self.set_fill_color(*fill)
        self.set_draw_color(*LINE)
        self.set_line_width(0.2)
        self.rect(x, y, w, h, "DF")
        ty = y + pad
        if num:
            self.set_font("sans", "", 7.2)
            self.set_text_color(*GOLD)
            self.set_xy(x + 4, ty)
            self.cell(8, 3.6, num)
            ty += 4.2
        ty = self.rt(title, x + 4, ty, w - 8 - SAFE, title_size, 4.0, "strong", title_colour)
        self.rt(text, x + 4, ty + 1.4, w - 8 - SAFE, body_size, 3.6, "body", MUTED)

    # ── cover ─────────────────────────────────────────────────────────────
    def cover(self, eyebrow: str, title: str, sub: str, lower_left: str, lower_right: str):
        self.add_page()
        self.set_fill_color(*INK)
        self.rect(0, 0, W, H, "F")
        self.set_draw_color(*GOLD)
        self.set_line_width(0.4)
        self.rect(M - 5, M - 5, CW + 10, H - 2 * M + 10)
        # ring motif, drawn (never an image, so it stays sharp at any size)
        cx, cy = W / 2, H * 0.40
        for r, lw, col in ((24, 0.5, GOLD), (28.5, 0.22, GOLD_L), (34, 0.18, GOLD)):
            self.set_draw_color(*col)
            self.set_line_width(lw)
            self.ellipse(cx - r, cy - r, 2 * r, 2 * r)

        if DEV.search(eyebrow):
            self.set_font("dev500", "", 7.6)
            self.set_text_color(*GOLD_L)
            self.set_xy(M, 24)
            self.cell(CW, 4, eyebrow, align="C")
        else:
            self.spaced(eyebrow, M, 24, CW, 6.6, GOLD_L, 1.5, align="C")

        self.rt(title, M, cy - 15, CW, 26 if self.lang == "EN" else 22, 12,
                "display", GOLD_L, align="C")
        self.rt(sub, M + 14, cy + 9, CW - 28, 9.6, 4.9, "body", CREAM_2, align="C")

        self.rule(H * 0.68, 30, (W - 30) / 2, GOLD, 0.25)
        self.rt(lower_left, M + 6, H * 0.71, CW - 12, 9.0, 4.6, "body", GOLD_PALE, align="C")
        self.rt(lower_right, M + 4, H - 24, CW - 8, 6.6, 3.6, "label", GOLD_DIM, align="C")


# ══════════════════════════════════════════════════════════════════════════
#  copy — one dict per language, identical keys, identical page order
# ══════════════════════════════════════════════════════════════════════════
EN = {
    "cover_eb": "SHIVAA JEWELS · JAYAL",
    "cover_title": "SHIVAA BLACK",
    "cover_sub": "The card, and the app that makes it work.\nTwenty percent off the craft — nothing else.",
    "cover_ll": "Six months · free to renew · one tap in the app",
    "cover_rr": "ERNATE SHINE JEWELLERY PVT. LTD. · MAIN ROAD, JAYAL 341023",

    "p2_kick": "This book",
    "p2_h": "What you are holding",
    "p2_p": "Twelve pages. No prices that expire next week, no words you have to ask the counter to "
            "explain. What the card is, what the app does, and what happens on the day it expires.",
    "p2_cards": [
        ("01", "The card", "20 % off making charges, six months, tied to your mobile number."),
        ("02", "The app", "shivaa.in — installed from the browser, no app store needed."),
        ("03", "Your papers", "Certificates, in-store bills and order tracking, in one place."),
        ("04", "The renewal", "One tap in the last thirty days. Your number never changes."),
    ],
    "p2_foot": "Everything in this book is done by the app on a phone. Nothing needs a laptop, a "
               "password, or a visit to the shop.",
    "p2_mark": "This book has a second half. The same twelve pages in Hindi are at the back: turn "
               "it over.",

    "p3_kick": "The privilege",
    "p3_h": "Twenty percent — on the craft only",
    "p3_p": "A piece of jewellery is four things: metal, stones, making charges, and GST. This card "
            "reduces one of those four. The metal you pay for is the metal you take home.",
    "p3_ex": "If a piece carries 10,000 rupees of making charges, you pay 8,000. The metal, the "
             "stones, the GST and the delivery stay exactly as they are — and all four lines are "
             "shown to you before you pay, not after.",
    "p3_is": ("What it is", ["20 % off making charges, on every Shivaa piece",
                             "Six months from the day your card is issued",
                             "Free to renew, as many times as you like",
                             "Tied to one verified mobile number",
                             "Applied automatically at checkout"]),
    "p3_bill_t": "The same piece, on the bill",
    "p3_bill": [
        ("Metal, at the day's rate", "unchanged", False),
        ("Making charges", "10,000", False),
        ("Shivaa Black, 20 % of making", "− 2,000", True),
        ("Stones, GST, delivery", "unchanged", False),
        ("You pay for making", "8,000", True),
    ],
    "p3_isnt": ("What it is not", ["Not 20 % off the price of the jewellery",
                                   "Not a discount on gold or silver",
                                   "Not a loan, an EMI or a credit card",
                                   "Not transferable to another person",
                                   "Not a reason to buy what you did not want"]),

    "p4_kick": "The app",
    "p4_h": "Eight things it does",
    "p4_p": "shivaa.in is a shop, not a brochure. Install it once from your browser — Android, "
            "iPhone or computer — and the pages you opened keep working offline.",
    "p4_cards": [
        ("01", "Today's rates", "Gold and silver through the day, with the source named."),
        ("02", "The shop", "Every piece, with its making charge written separately."),
        ("03", "Swarna Nidhi", "The 11 + 1 plan: eleven months you, the twelfth us."),
        ("04", "My certificates", "Purity and price certificate for each order. Save or print."),
        ("05", "My bills", "In-store purchases in your account. View, or download."),
        ("06", "Track your order", "Insured, seal-checked, OTP-verified at the door."),
        ("07", "Ring size at home", "Measure against a ring you own. No shop visit."),
        ("08", "Care & buyback", "Lifetime care plan, and buyback on the pure gold value."),
    ],
    "p4_foot": "Free. No subscription, no advertisement, and your number is not sold to anyone.",

    "p5_kick": "Two things worth knowing",
    "p5_h": "The rate, and the plan",
    "p5_rate_t": "The rate is the rate",
    "p5_rate_p": "The app shows gold and silver through the day and says where each number came "
                 "from. When the live feed is unavailable it says so on the page, instead of "
                 "showing yesterday's figure in today's clothes. Every product page shows the four "
                 "lines — metal, making, stones, GST — before you decide.",
    "p5_plan_t": "Swarna Nidhi · 11 + 1",
    "p5_plan_p": "Save a fixed amount every month for eleven months. Shivaa pays the twelfth. Then "
                 "you take gold at the rate of the day you buy it. Your instalments and the "
                 "twelfth-month gift both show in the app, so nobody has to guess.",
    "p5_bar": "the only bar this card touches",
    "p5_eleven": "Eleven instalments from you, the twelfth from us. On a gold purchase there is no "
                 "making charge attached to either.",
    "p5_note": "Both of these are on the site today. Where a number cannot be shown honestly, we "
               "would rather print the word estimate beside it.",

    "p6_kick": "The feel",
    "p6_h": "Why it does not feel like a website",
    "p6_p": "Six things were measured, not guessed. A jewellery shop on a phone has to feel like an "
            "object in the hand: quick to answer, quiet when idle, and never jumping while you read.",
    "p6_cards": [
        ("01", "It goes quiet", "A still page asks for zero animation frames a second. It used to ask "
                                "for 123, from two loops that never slept."),
        ("02", "One stylesheet", "58 render-blocking sheets became one bundle of 70 layers. The first "
                                 "screen arrives sooner."),
        ("03", "Films wait their turn", "Videos load only when you reach them: zero video bytes at "
                                        "open. Nothing eats your data before you scroll."),
        ("04", "Every press answers", "A tap gets a ripple and, on most phones, a small buzz. A drag "
                                      "does not: a swipe is not a click."),
        ("05", "Pages slide, not reload", "One motion owner per navigation, so a page change moves "
                                          "like an app instead of flashing white."),
        ("06", "Nothing jumps while you read", "No layout animation, no timer that rebuilds the page. "
                                               "Your thumb stays where it was."),
    ],
    "p6_foot": "Measured on a real page in a test browser, not claimed on a slide. Where a number is "
               "a before-and-after, both halves were counted.",

    "p7_kick": "Start",
    "p7_h": "Three steps, about forty seconds",
    "p7_steps": [
        ("1", "Scan", "Point your camera at the code on the back of this book, or type shivaa.in."),
        ("2", "Sign in", "Enter the mobile number this card was issued to. We send a six-digit code. "
                         "There is no password to forget."),
        ("3", "See your card", "It appears with the same number printed on the plastic in your hand. "
                               "From then on the discount applies itself at checkout."),
    ],
    "p7_note": "The card follows the number. If you change your mobile, tell us at the counter before "
               "you change it, and we will move the card with you.",

    "p8_kick": "Your papers",
    "p8_h": "Everything in one place",
    "p8_p": "Paper gets lost. A certificate kept in an almirah for eleven years is a certificate "
            "nobody can find. The app keeps the same documents, and you can still print them.",
    "p8_rows": [
        ("My certificates", "The purity and price certificate for each order: open, save, print."),
        ("My bills", "In-store purchases, in your account. Two buttons: view, download."),
        ("Track your order", "Insured, tamper-sealed, signature and OTP verified at delivery."),
        ("Care plan", "The lifetime care promise, and what it covers, in the same place."),
    ],
    "p8_note": "A bill in the app is the same bill you were handed at the counter, not a summary of "
               "it. If the two ever disagree, the counter's copy is the one we answer to.",

    "p9_kick": "At home",
    "p9_h": "Size, care, buyback",
    "p9_blocks": [
        ("Find your ring size",
         "Two ways, both in the app: place an existing ring on the screen and match the inner "
         "circle, or measure the inside diameter with a ruler. It is the page we open most."),
        ("Lifetime care",
         "Cleaning and polishing are free for as long as you own the piece. Bring it in; we will "
         "also tell you honestly if a clasp is tired before it fails."),
        ("Buyback",
         "On the pure gold value of any Shivaa piece, with zero deduction. The promise is written "
         "down, not remembered, and it is in the app."),
    ],
    "p9_rows": [
        ("Saved in the app", "Certificates and bills, in your account, printable any time."),
        ("What we never do", "No heating at home to test a piece, no toothpaste on gold or stones."),
    ],
    "p9_foot": "If a clasp feels loose, bring it in. A repair that arrives early is cheap; one that "
               "arrives late is a lost stone.",

    "p10_kick": "Renewal",
    "p10_h": "Six months, then one tap",
    "p10_p": "In the last thirty days of your card's life, a Renew button appears on it in the app. "
             "One tap, free. Your member ID and card number never change, so the plastic in your "
             "purse stays correct: only the date moves.",
    "p10_p2": "If the card lapses, renewal starts from the day you tap it. We do not add months you "
              "did not earn, and we do not take any away either.",
    "p10_strip": "Month 1 to 6 · renew in the last 30 days",
    "p10_after_t": "On the day it lapses",
    "p10_after": [
        ("The privilege stops", "The 20 % comes off your next bill's making line."),
        ("Nothing is deleted", "Card, certificates and bills stay in your account."),
        ("A renewal is offered", "One tap restarts six months from that day, free."),
    ],
    "p10_box_t": "Write your date here",
    "p10_box_p": "The exact expiry is printed on the certificate in your box, and it is on the card "
                 "page in the app. It is the same date in both places, and the app is the copy that "
                 "cannot be lost.",

    "p11_kick": "Plain words",
    "p11_h": "The terms, without the fog",
    "p11_terms": [
        "The 20 % applies to making charges only, on Shivaa's own jewellery, for six months from "
        "issue.",
        "It does not apply to bullion, coins, or metal bought at the day's rate.",
        "It cannot be combined with another making-charge offer.",
        "Renewal is free, and it does not change your member ID or card number.",
        "The card is bound to one verified mobile number and is not transferable.",
        "A decision on a specific piece is made at the counter, in front of you, on paper.",
        "Nothing here is a loan, a deposit, a credit facility or an investment.",
    ],
    "p11_foot": "If a sentence in this book and a sentence at the counter ever disagree, ask us to "
                "write it down. Whichever one we are willing to sign is the one that is true.",
    "p11_own": "This book belongs to",
    "p11_issued": "Issued at the counter by",
    "p11_l_name": "NAME",
    "p11_l_date": "DATE",

    "p12_h": "Come back with the box.",
    "p12_p": "Bring the card, the booklet and, if you kept it, the silver. First cleaning is free, "
             "every visit, for life.",
    "p12_addr": "SHIVAA JEWELS\nMain Road, Jayal, Rajasthan 341023 · Nagaur district",
    "p12_contact": "+91 89050 05921 · support@shivaa.in · @shivaa.jewels",
    "p12_hours": "Open every day, 10:00 to 20:30",
    "p12_legal": "Ernate Shine Jewellery Pvt. Ltd. · shivaa.in",
    "p12_qr": "Scan for your card",
}

HI = {
    "cover_eb": "शिवा ज्वेल्स · जायल",
    "cover_title": "शिवा ब्लैक",
    "cover_sub": "कार्ड, और वह ऐप जो उसे चलाता है।\nकारीगरी पर बीस प्रतिशत कम — बस इतना।",
    "cover_ll": "छह महीने · नवीनीकरण मुफ़्त · ऐप में एक टैप",
    "cover_rr": "अर्नेट शाइन ज्वेलरी प्रा. लि. · मेन रोड, जायल 341023",

    "p2_kick": "यह किताब",
    "p2_h": "आपके हाथ में क्या है",
    "p2_p": "बारह पन्ने। ऐसा कोई दाम नहीं जो अगले हफ़्ते ख़त्म हो जाए, और ऐसा कोई शब्द नहीं जिसका "
            "मतलब दुकान पर पूछना पड़े। कार्ड क्या है, ऐप क्या करता है, और जिस दिन कार्ड ख़त्म होगा "
            "उस दिन क्या होता है।",
    "p2_cards": [
        ("01", "कार्ड", "मेकिंग चार्ज पर 20% कम, छह महीने, आपके मोबाइल नंबर से जुड़ा।"),
        ("02", "ऐप", "shivaa.in — ब्राउज़र से इंस्टॉल, किसी स्टोर की ज़रूरत नहीं।"),
        ("03", "आपके काग़ज़ात", "प्रमाण-पत्र, दुकान के बिल और ऑर्डर की जानकारी, एक जगह।"),
        ("04", "नवीनीकरण", "आख़िरी तीस दिनों में एक टैप। आपका नंबर कभी नहीं बदलता।"),
    ],
    "p2_foot": "इस किताब का हर काम फ़ोन पर ऐप से होता है। न लैपटॉप चाहिए, न पासवर्ड, न दुकान तक "
               "आने की ज़रूरत।",
    "p2_mark": "इस किताब का दूसरा हिस्सा पीछे है: वही बारह पन्ने अंग्रेज़ी में। किताब पलट दीजिए।",

    "p3_kick": "सुविधा",
    "p3_h": "बीस प्रतिशत — सिर्फ़ कारीगरी पर",
    "p3_p": "गहने में चार चीज़ें होती हैं: धातु, नग, मेकिंग चार्ज और जीएसटी। यह कार्ड इनमें से एक "
            "कम करता है। जितना सोना आप लेंगी, उतना ही घर ले जाएँगी।",
    "p3_ex": "अगर किसी गहने की मेकिंग चार्ज 10,000 रुपये है, तो आप 8,000 देंगी। धातु, नग, जीएसटी और "
             "डिलीवरी जैसी हैं वैसी रहती हैं, और चारों लाइनें भुगतान से पहले दिखाई जाती हैं, बाद में नहीं।",
    "p3_is": ("क्या है", ["मेकिंग चार्ज पर 20% कम, शिवा के हर गहने पर",
                          "कार्ड जारी होने के दिन से छह महीने",
                          "नवीनीकरण मुफ़्त, जितनी बार चाहें",
                          "एक सत्यापित मोबाइल नंबर से जुड़ा",
                          "भुगतान के समय खुद लग जाता है"]),
    "p3_bill_t": "वही गहना, बिल पर",
    "p3_bill": [
        ("धातु, उस दिन के भाव पर", "जैसी है वैसी", False),
        ("मेकिंग चार्ज", "10,000", False),
        ("शिवा ब्लैक, मेकिंग का 20%", "− 2,000", True),
        ("नग, जीएसटी, डिलीवरी", "जैसे हैं वैसे", False),
        ("मेकिंग में आप देंगी", "8,000", True),
    ],
    "p3_isnt": ("क्या नहीं है", ["गहने के दाम पर 20% छूट नहीं",
                                 "सोने या चांदी पर छूट नहीं",
                                 "कर्ज़, ईएमआई या क्रेडिट कार्ड नहीं",
                                 "किसी दूसरे व्यक्ति को नहीं जाता",
                                 "जो नहीं चाहिए वह खरीदने की वजह नहीं"]),

    "p4_kick": "ऐप",
    "p4_h": "आठ काम जो यह करता है",
    "p4_p": "shivaa.in एक दुकान है, कोई विज्ञापन-पर्चा नहीं। ब्राउज़र से एक बार इंस्टॉल कीजिए, और "
            "खोले हुए पन्ने बिना इंटरनेट भी खुलते हैं।",
    "p4_cards": [
        ("01", "आज का भाव", "सोना और चांदी, दिन भर, और भाव कहाँ से आया।"),
        ("02", "दुकान", "हर गहना, मेकिंग चार्ज अलग से लिखी हुई।"),
        ("03", "स्वर्ण निधि", "11 + 1: ग्यारह महीने आप, बारहवाँ हम।"),
        ("04", "मेरे प्रमाण-पत्र", "हर ऑर्डर का शुद्धता और दाम का प्रमाण-पत्र।"),
        ("05", "मेरे बिल", "दुकान की खरीदारी खाते में। देखिए या डाउनलोड कीजिए।"),
        ("06", "ऑर्डर कहाँ है", "बीमित, सीलबंद, ओटीपी से सत्यापित।"),
        ("07", "घर बैठे साइज़", "अपनी अंगूठी से नापिए, दुकान आए बिना।"),
        ("08", "देखभाल और बायबैक", "जीवनभर देखभाल, बायबैक शुद्ध सोने के मूल्य पर।"),
    ],
    "p4_foot": "मुफ़्त। कोई सदस्यता-शुल्क नहीं, कोई विज्ञापन नहीं, और आपका नंबर हम किसी को नहीं बेचते।",

    "p5_kick": "दो बातें जो जाननी चाहिए",
    "p5_h": "भाव, और योजना",
    "p5_rate_t": "भाव वही भाव है",
    "p5_rate_p": "ऐप दिन भर सोने-चांदी का भाव दिखाता है, और यह भी कि वह कहाँ से आया। जब लाइव फ़ीड "
                 "उपलब्ध नहीं होती, ऐप यह पन्ने पर लिख देता है, कल का भाव आज के कपड़े पहनकर नहीं "
                 "दिखाता। हर गहने के पन्ने पर चारों लाइनें दिखती हैं: धातु, मेकिंग, नग, जीएसटी।",
    "p5_plan_t": "स्वर्ण निधि · 11 + 1",
    "p5_plan_p": "हर महीने तय रक़म, ग्यारह महीने। बारहवाँ महीना शिवा भरता है। फिर जिस दिन खरीदिए, उस "
                 "दिन के भाव पर सोना मिलता है। आपकी क़िस्तें और बारहवें महीने का तोहफ़ा, दोनों ऐप में "
                 "दिखते हैं।",
    "p5_bar": "कार्ड सिर्फ़ इसी हिस्से को छूता है",
    "p5_eleven": "ग्यारह क़िस्तें आपकी, बारहवीं हमारी। सोना खरीदने पर इन दोनों पर कोई मेकिंग चार्ज "
                 "नहीं लगता।",
    "p5_note": "दोनों चीज़ें आज साइट पर हैं। जो आँकड़ा ईमानदारी से नहीं दिख सकता, उसके आगे हम अनुमान "
               "लिखना पसंद करते हैं।",

    "p6_kick": "एहसास",
    "p6_h": "यह वेबसाइट जैसा क्यों नहीं लगता",
    "p6_p": "छह चीज़ें नापी गई हैं, अंदाज़े से नहीं लिखी गईं। फ़ोन पर सराफ़े की दुकान हाथ में रखी चीज़ "
            "जैसी लगनी चाहिए: जवाब झट से, बेकार में चुप, और पढ़ते वक़्त पन्ना कहे नहीं।",
    "p6_cards": [
        ("01", "चुप हो जाता है", "रुके हुए पन्ने पर हर सेकंड शून्य एनिमेशन। पहले 123 था, दो ऐसे लूप "
                                 "से जो कभी नहीं सोते थे।"),
        ("02", "एक स्टाइलशीट", "58 अलग फ़ाइलों की जगह एक बंडल, 70 परतें। पहला पन्ना जल्दी आता है।"),
        ("03", "फ़िल्म अपनी बारी पर", "वीडियो तभी खिंचता है जब आप वहाँ पहुँचें: खोलते ही शून्य वीडियो "
                                      "बाइट। स्क्रॉल से पहले डेटा नहीं खर्च।"),
        ("04", "हर दबाव का जवाब", "टैप पर लहर और ज़्यादातर फ़ोन पर हल्की गूँज। खींचने पर नहीं, "
                                  "स्वाइप क्लिक नहीं होता।"),
        ("05", "पन्ना खिसकता है", "पन्ना लोड नहीं होता, खिसकता है। एक ही जगह से गति तय होती है, "
                                  "इसलिए सफ़ेद झलक नहीं पड़ती।"),
        ("06", "पढ़ते वक़्त कुछ कूदता नहीं", "न लेआउट का एनिमेशन, न पन्ना दोबारा बनाने वाला टाइमर। "
                                            "आपका अंगूठा वहीं रहता है।"),
    ],
    "p6_foot": "यह सब असली पन्ने पर, टेस्ट ब्राउज़र में नापा गया है, स्लाइड पर लिखी बात नहीं। जहाँ "
               "पहले और बाद का आँकड़ा है, वहाँ दोनों गिने गए हैं।",

    "p7_kick": "शुरुआत",
    "p7_h": "तीन कदम, लगभग चालीस सेकंड",
    "p7_steps": [
        ("1", "स्कैन", "किताब के पिछले पन्ने का कोड कैमरे से खोलिए, या shivaa.in टाइप कीजिए।"),
        ("2", "साइन इन", "वही मोबाइल नंबर डालिए जिस पर यह कार्ड जारी हुआ है। हम छह अंकों का कोड "
                         "भेजते हैं। कोई पासवर्ड नहीं जो याद रखना पड़े।"),
        ("3", "अपना कार्ड देखिए", "ऐप में वही नंबर दिखेगा जो आपके हाथ के कार्ड पर छपा है। उसके बाद "
                                  "छूट भुगतान के समय खुद लग जाती है।"),
    ],
    "p7_note": "कार्ड नंबर के साथ चलता है। मोबाइल नंबर बदलना हो तो बदलने से पहले दुकान पर बता दीजिए, "
               "हम कार्ड उसी नंबर के साथ आगे बढ़ा देंगे।",

    "p8_kick": "आपके काग़ज़ात",
    "p8_h": "सब कुछ एक जगह",
    "p8_p": "काग़ज़ खो जाता है। अलमारी में ग्यारह साल रखा प्रमाण-पत्र वह प्रमाण-पत्र है जो किसी को "
            "मिलता नहीं। ऐप वही काग़ज़ात रखता है, और आप उन्हें छाप भी सकती हैं।",
    "p8_rows": [
        ("मेरे प्रमाण-पत्र", "हर ऑर्डर का शुद्धता और दाम का प्रमाण-पत्र: खोलिए, सहेजिए, छापिए।"),
        ("मेरे बिल", "दुकान की खरीदारी आपके खाते में। दो बटन: देखिए, डाउनलोड कीजिए।"),
        ("ऑर्डर कहाँ है", "बीमित, सीलबंद, डिलीवरी पर हस्ताक्षर और ओटीपी से सत्यापित।"),
        ("देखभाल योजना", "जीवनभर की देखभाल का वादा, और उसमें क्या शामिल है, उसी जगह।"),
    ],
    "p8_note": "ऐप का बिल वही बिल है जो दुकान पर आपको दिया गया, उसका सारांश नहीं। अगर कभी दोनों में "
               "फ़र्क़ दिखे, तो हम दुकान वाले बिल के हिसाब से जवाब देंगे।",

    "p9_kick": "घर पर",
    "p9_h": "साइज़, देखभाल, बायबैक",
    "p9_blocks": [
        ("अपनी अंगूठी का साइज़",
         "दो तरीक़े, दोनों ऐप में: अपनी अंगूठी स्क्रीन पर रखकर अंदर का गोला मिलाइए, या पैमाने से "
         "अंदर का व्यास नापिए। यह हमारा सबसे ज़्यादा खुलने वाला पन्ना है।"),
        ("जीवनभर देखभाल",
         "सफ़ाई और पॉलिश मुफ़्त, जब तक गहना आपके पास है। ले आइए, और कोई कुंडी ढीली हो तो टूटने से "
         "पहले सच बता देंगे।"),
        ("बायबैक",
         "शिवा के किसी भी गहने के शुद्ध सोने के मूल्य पर, बिना कटौती। यह वादा लिखा हुआ है, याद रखने "
         "पर नहीं छोड़ा, और ऐप में मौजूद है।"),
    ],
    "p9_rows": [
        ("ऐप में सुरक्षित", "प्रमाण-पत्र और बिल, आपके खाते में, कभी भी छाप सकती हैं।"),
        ("यह हम कभी नहीं करते", "घर पर गर्म करके गहना जाँचना नहीं, सोने-नगों पर टूथपेस्ट नहीं।"),
    ],
    "p9_foot": "कुंडी ढीली लगे तो ले आइए। समय पर आया मरम्मत सस्ता है, देर से आया नग खो देता है।",

    "p10_kick": "नवीनीकरण",
    "p10_h": "छह महीने, फिर एक टैप",
    "p10_p": "कार्ड के आख़िरी तीस दिनों में ऐप उस पर नवीनीकरण का बटन दिखा देता है। एक टैप, मुफ़्त। "
             "सदस्य आईडी और कार्ड नंबर कभी नहीं बदलते, इसलिए आपके बटुए का कार्ड सही रहता है, "
             "सिर्फ़ तारीख़ आगे बढ़ती है।",
    "p10_p2": "अगर कार्ड बंद हो गया, तो नवीनीकरण उसी दिन से शुरू होता है जिस दिन आप टैप करेंगी। बिना "
              "कमाए महीने हम नहीं जोड़ते, और आपके महीने काटते भी नहीं।",
    "p10_strip": "महीना 1 से 6 · आख़िरी 30 दिनों में नवीनीकरण",
    "p10_after_t": "जिस दिन कार्ड ख़त्म होगा",
    "p10_after": [
        ("सुविधा रुक जाती है", "अगले बिल की मेकिंग लाइन से 20% हट जाता है।"),
        ("कुछ मिटता नहीं", "कार्ड, प्रमाण-पत्र और बिल खाते में रहते हैं।"),
        ("नवीनीकरण मिलता है", "एक टैप, उसी दिन से छह महीने, मुफ़्त।"),
    ],
    "p10_box_t": "अपनी तारीख़ यहाँ लिख लीजिए",
    "p10_box_p": "असली अंतिम तारीख़ आपके डिब्बे के प्रमाण-पत्र पर छपी है, और ऐप के कार्ड पन्ने पर भी "
                 "है। दोनों जगह एक ही तारीख़ है, और ऐप वह प्रति है जो खो नहीं सकती।",

    "p11_kick": "सरल शब्द",
    "p11_h": "शर्तें, बिना धुंध के",
    "p11_terms": [
        "20% सिर्फ़ मेकिंग चार्ज पर, शिवा के अपने गहनों पर, जारी होने से छह महीने तक।",
        "बुलियन, सिक्के, या उस दिन के भाव पर बेची गई धातु पर लागू नहीं।",
        "मेकिंग चार्ज की किसी दूसरी पेशकश के साथ नहीं जुड़ेगा।",
        "नवीनीकरण मुफ़्त है, और इससे सदस्य आईडी या कार्ड नंबर नहीं बदलता।",
        "कार्ड एक सत्यापित मोबाइल नंबर से जुड़ा है और हस्तांतरणीय नहीं है।",
        "किसी ख़ास गहने का फ़ैसला दुकान पर, आपके सामने, काग़ज़ पर लिखकर होगा।",
        "यहाँ कुछ भी कर्ज़, जमा, क्रेडिट सुविधा या निवेश नहीं है।",
    ],
    "p11_foot": "अगर इस किताब की कोई लाइन और दुकान की कोई लाइन कभी अलग-अलग लगे, तो हमें लिखकर देने को "
                "कहिए। जिसे हम हस्ताक्षर करके देने को तैयार हों, वही सच है।",
    "p11_own": "यह किताब किसकी है",
    "p11_issued": "दुकान पर जारी की गई",
    "p11_l_name": "नाम",
    "p11_l_date": "तारीख़",

    "p12_h": "डिब्बा लेकर फिर आइए।",
    "p12_p": "कार्ड, किताब और, अगर संभालकर रखा है तो, वह चांदी साथ लाइए। पहली सफ़ाई हर बार मुफ़्त, "
             "जीवनभर।",
    "p12_addr": "शिवा ज्वेल्स\nमेन रोड, जायल, राजस्थान 341023 · ज़िला नागौर",
    "p12_contact": "+91 89050 05921 · support@shivaa.in · @shivaa.jewels",
    "p12_hours": "रोज़ खुला, सुबह 10:00 से रात 8:30 तक",
    "p12_legal": "अर्नेट शाइन ज्वेलरी प्रा. लि. · shivaa.in",
    "p12_qr": "अपना कार्ड खोलने के लिए स्कैन कीजिए",
}


# ══════════════════════════════════════════════════════════════════════════
#  pages
# ══════════════════════════════════════════════════════════════════════════
def qr_png() -> str:
    import qrcode
    path = os.path.join(CACHE, "qr-black-card.png")
    if not os.path.exists(path):
        q = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=12, border=2)
        q.add_data("https://shivaa.in/#/black-card")
        q.make(fit=True)
        q.make_image(fill_color="#14110e", back_color="#faf6ef").save(path)
    return path


def glyph_mark(pdf: "Booklet", kind: str, x: float, y: float):
    """Six small drawn marks: they say 'motion' without a filter or an emoji."""
    pdf.set_draw_color(*GOLD_L)
    pdf.set_line_width(0.25)
    if kind == "quiet":
        pdf.line(x - 6, y, x + 6, y)
        for dx in (-6, 0, 6):
            pdf.ellipse(x + dx - 0.7, y - 0.7, 1.4, 1.4)
    elif kind == "bundle":
        for k in range(3):
            pdf.line(x - 6, y - 1.7 + k * 1.7, x + 6, y - 1.7 + k * 1.7)
    elif kind == "film":
        for dx in (-5, 2):
            pdf.line(x + dx, y - 3.2, x + dx, y + 3.2)
            pdf.line(x + dx, y - 3.2, x + dx + 3.4, y)
            pdf.line(x + dx, y + 3.2, x + dx + 3.4, y)
    elif kind == "press":
        for r in (1.8, 3.4, 5.0):
            pdf.ellipse(x - r, y - r, 2 * r, 2 * r)
    elif kind == "slide":
        pdf.line(x - 6, y, x + 4, y)
        pdf.line(x + 1, y - 2.3, x + 4, y)
        pdf.line(x + 1, y + 2.3, x + 4, y)
    else:   # steady
        pdf.line(x - 6, y - 2.6, x + 6, y - 2.6)
        pdf.line(x - 6, y + 2.6, x + 6, y + 2.6)
        pdf.set_dash_pattern(dash=0.8, gap=0.8)
        pdf.line(x - 6, y, x + 6, y)
        pdf.set_dash_pattern()


def build(lang: str, c: dict, out_path: str) -> str:
    pdf = Booklet(lang)
    kick = "SHIVAA BLACK" if lang == "EN" else "शिवा ब्लैक"
    hi = lang == "HI"
    floor = H - M - 9          # nothing may cross this line except the folio

    def guard(tag: str, bottom: float):
        if bottom > floor:
            raise AssertionError(f"{lang} page {tag}: content ends at {bottom:.1f}mm, "
                                 f"past the {floor:.1f}mm floor")

    # ── helpers that measure instead of assuming ──────────────────────────
    def grid(items, y, cols, gap_x=2.0, gap_y=3.2, pad=4.4, min_h=24.0,
             title_size=8.8, body_size=8.0, marks=None, num=True):
        """Cards whose height comes from the copy, row by row. Never overlaps."""
        cw = (CW - gap_x * (cols - 1)) / cols
        rows = [items[i:i + cols] for i in range(0, len(items), cols)]
        for r, row in enumerate(rows):
            need = min_h
            for it in row:
                num_b, t, d = it
                h = pad + (4.2 if (num and num_b) else 0)
                h += len(pdf.lines_of(t, cw - 8 - SAFE, title_size, "strong")) * 4.0
                h += 1.4 + len(pdf.lines_of(d, cw - 8 - SAFE, body_size, "body")) * 3.6
                need = max(need, h + pad)
            for i, it in enumerate(row):
                num_b, t, d = it
                x = M + i * (cw + gap_x)
                pdf.card(x, y, cw, need, num_b if num else "", t, d,
                         title_size=title_size, body_size=body_size, pad=pad)
                if marks:
                    glyph_mark(pdf, marks[len([0]) - 1 + 0] if False else
                               marks[(r * cols + i) % len(marks)], x + cw - 13, y + 6.2)
            y += need + gap_y
        return y - gap_y

    def panel(y, h, fill=CREAM_2, border=LINE, bar=None, lw=0.2):
        pdf.set_fill_color(*fill)
        pdf.set_draw_color(*border)
        pdf.set_line_width(lw)
        pdf.rect(M, y, CW, h, "DF")
        if bar:
            pdf.set_fill_color(*bar)
            pdf.rect(M, y, 2.2, h, "F")

    def rows(items, y, gap=3.0, pad=4.4, title_size=9.4, body_size=8.6, icon=None):
        for r, (t, d) in enumerate(items):
            th = len(pdf.lines_of(t, CW - 9, title_size, "strong")) * 4.4
            dh = len(pdf.lines_of(d, CW - 9 - SAFE, body_size, "body")) * 4.0
            h = pad + th + dh + pad
            pdf.set_fill_color(*WHITE)
            pdf.set_draw_color(*LINE)
            pdf.set_line_width(0.2)
            pdf.rect(M, y, CW, h, "DF")
            yy = pdf.rt(t, M + pad + 1, y + pad - 0.6, CW - 9, title_size, 4.4, "strong", MAROON)
            pdf.rt(d, M + pad + 1, yy + 0.8, CW - 9 - SAFE, body_size, 4.0, "body", MUTED)
            if icon:
                icon(r, M + pad / 2 - 0.4, y + pad - 1.5)
            y += h + gap
        return y - gap

    # ── 1 · cover ─────────────────────────────────────────────────────────
    pdf.cover(c["cover_eb"], c["cover_title"], c["cover_sub"], c["cover_ll"], c["cover_rr"])

    # ── 2 · what you are holding ─────────────────────────────────────────
    pdf.cream_page(2, kick)
    y = pdf.kicker(c["p2_kick"], M + 1)
    y = pdf.h1(c["p2_h"], y, 19)
    y = pdf.para(c["p2_p"], y + 1)
    y = grid(c["p2_cards"], y + 5, 2, min_h=33)
    ex_h = pdf.height_of(c["p2_foot"], CW - 13 - SAFE, 8.6, 4.2) + 12
    y += 6
    panel(y, ex_h, bar=MAROON, border=GOLD, lw=0.35)
    pdf.rt(c["p2_foot"], M + 7, y + 6, CW - 13 - SAFE, 8.6, 4.2, "body", INK_SOFT)
    y += ex_h + 12
    guard(2, y + 12)
    pdf.rule(y, 20, lw=0.4)
    pdf.rt(c["p2_mark"], M, y + 5, CW - SAFE, 9.4, 4.8, "body", MAROON)

    # ── 3 · the privilege ────────────────────────────────────────────────
    pdf.cream_page(3, kick)
    y = pdf.kicker(c["p3_kick"], M + 1)
    y = pdf.h1(c["p3_h"], y, 19)
    y = pdf.para(c["p3_p"], y + 1)
    ex_h = pdf.height_of(c["p3_ex"], CW - 14 - SAFE, 9.2, 4.6) + 9
    panel(y + 3, ex_h, bar=MAROON, border=GOLD, lw=0.35)
    pdf.rt(c["p3_ex"], M + 8, y + 7, CW - 14 - SAFE, 9.2, 4.6, "body", INK_SOFT)
    y = y + ex_h + 10
    colw = CW / 2 - 2
    bottoms = []
    for i, (title, items) in enumerate((c["p3_is"], c["p3_isnt"])):
        x = M + i * (CW / 2 + 2)
        yy = pdf.rt(title, x, y, colw, 9.0, 4.6, "strong", MAROON if i == 0 else MUTED)
        pdf.rule(y + 5.6, colw - 4, x, GOLD if i == 0 else LINE, 0.3)
        yy = y + 9
        for it in items:
            pdf.set_font("sans", "", 8.4)          # + and x live in the Latin font only
            pdf.set_text_color(*(GOLD if i == 0 else MUTED))
            pdf.set_xy(x, yy + 0.2)
            pdf.cell(3.6, 3.6, "+" if i == 0 else "x")
            yy = pdf.rt(it, x + 4.2, yy, colw - 4.2 - SAFE, 8.4, 3.7, "body",
                        INK_SOFT if i == 0 else MUTED) + 1.6
        bottoms.append(yy)
    y = max(bottoms) + 9
    y = pdf.rt(c["p3_bill_t"], M, y, CW, 9.4, 4.8, "strong", MAROON) + 1.4
    pdf.rule(y, CW, M, LINE, 0.2)
    y += 2
    for lab, val, hot in c["p3_bill"]:
        if hot:
            pdf.set_fill_color(*GOLD_PALE)
            pdf.rect(M, y - 0.8, CW, 7.6, "F")
        pdf.rt(lab, M + 2, y, CW * 0.60, 8.8, 4.2, "body", INK_SOFT)
        pdf.rt(val, M + CW * 0.30, y, CW * 0.68, 8.8, 4.2,
               "strong" if hot else "body", MAROON if hot else INK_SOFT, align="R")
        y += 8.0
    guard(3, y)

    # ── 4 · eight things the app does ────────────────────────────────────
    pdf.cream_page(4, kick)
    y = pdf.kicker(c["p4_kick"], M + 1)
    y = pdf.h1(c["p4_h"], y, 19)
    y = pdf.para(c["p4_p"], y + 1)
    # pick the largest type that still leaves room for the closing line
    cw = (CW - 2) / 2
    for ts, bs, gap, mh in ((8.8, 8.0, 3.2, 26.0), (8.4, 7.6, 2.8, 23.0),
                            (8.2, 7.4, 2.4, 21.0), (8.0, 7.2, 2.0, 19.0)):
        need_total = 0.0
        for r in range(4):
            need = mh
            for num, t, d in c["p4_cards"][r * 2:r * 2 + 2]:
                h = 4.4 + 4.2 + len(pdf.lines_of(t, cw - 8 - SAFE, ts, "strong")) * 4.0
                h += 1.4 + len(pdf.lines_of(d, cw - 8 - SAFE, bs, "body")) * 3.6 + 4.4
                need = max(need, h)
            need_total += need + gap
        foot_h = pdf.height_of(c["p4_foot"], CW - SAFE, 8.4, 4.0)
        if y + 5 + need_total - gap + 6 + foot_h <= floor:
            break
    y = grid(c["p4_cards"], y + 5, 2, gap_y=gap, min_h=mh, title_size=ts, body_size=bs)
    y += 6
    pdf.rule(y, 18, lw=0.4)
    pdf.rt(c["p4_foot"], M, y + 4.4, CW - SAFE, 8.4, 4.0, "body", MUTED)
    guard(4, y + 4.4 + foot_h)

    # ── 5 · the rate and the plan ────────────────────────────────────────
    pdf.cream_page(5, kick)
    y = pdf.kicker(c["p5_kick"], M + 1)
    y = pdf.h1(c["p5_h"], y, 19)
    y = pdf.rt(c["p5_rate_t"], M, y + 2, CW, 10.6, 5.2, "strong", MAROON) + 1.8
    y = pdf.para(c["p5_rate_p"], y, 9.6) + 6
    y = pdf.rt(c["p5_plan_t"], M, y, CW, 10.6, 5.2, "strong", MAROON) + 1.8
    y = pdf.para(c["p5_plan_p"], y, 9.6) + 7

    # the four lines of a price — a bar chart, drawn
    labels = (["METAL", "MAKING", "STONES", "GST"] if not hi
              else ["धातु", "मेकिंग", "नग", "जीएसटी"])
    widths = [CW * 0.44, CW * 0.26, CW * 0.16, CW * 0.14]
    x = M
    hot = labels[1]
    for lab, bw in zip(labels, widths):
        pdf.set_fill_color(*(GOLD_PALE if lab == hot else CREAM_2))
        pdf.set_draw_color(*LINE)
        pdf.set_line_width(0.2)
        pdf.rect(x, y, bw - 1.4, 10, "DF")
        pdf.rt(lab, x, y + 3.0, bw - 1.4, 7.6 if not hi else 8.2, 4, "label",
               MAROON if lab == hot else MUTED, align="C")
        x += bw
    ax = M + widths[0] + (widths[1] - 1.4) / 2
    pdf.set_draw_color(*MAROON)
    pdf.set_line_width(0.3)
    pdf.set_fill_color(*MAROON)
    pdf.line(ax, y + 13, ax, y + 17.5)
    pdf.polygon([(ax - 1.4, y + 17.2), (ax + 1.4, y + 17.2), (ax, y + 19.2)], style="F")
    y = pdf.rt(c["p5_bar"], M, y + 20.5, CW - SAFE, 8.8, 4.4, "body", MAROON, align="C") + 8

    # the eleven and the one, drawn
    n = 12
    bw = (CW - 11 * 1.6) / n
    for i in range(n):
        pdf.set_fill_color(*(GOLD if i == n - 1 else CREAM_2))
        pdf.set_draw_color(*(GOLD if i == n - 1 else LINE))
        pdf.set_line_width(0.2)
        pdf.rect(M + i * (bw + 1.6), y, bw, 9, "DF")
        pdf.rt(str(i + 1), M + i * (bw + 1.6), y + 2.6, bw, 6.6, 3.4, "label",
               CREAM if i == n - 1 else MUTED, align="C")
    y = pdf.rt(c["p5_eleven"], M, y + 11.5, CW - SAFE, 8.6, 4.2, "body", MUTED) + 6
    pdf.rt(c["p5_note"], M, y, CW - SAFE, 8.6, 4.4, "body", MUTED)
    guard(5, y + 12)

    # ── 6 · the feel (measured motion) ───────────────────────────────────
    pdf.cream_page(6, kick)
    y = pdf.kicker(c["p6_kick"], M + 1)
    y = pdf.h1(c["p6_h"], y, 18.4)
    y = pdf.para(c["p6_p"], y + 1, 9.4)
    kinds = ["quiet", "bundle", "film", "press", "slide", "steady"]
    marks = []
    for i in range(len(c["p6_cards"])):
        marks.append(kinds[i])
    y = grid(c["p6_cards"], y + 3, 2, gap_y=3.0, min_h=26.0,
             title_size=8.8, body_size=7.8, marks=marks)
    foot_h = pdf.height_of(c["p6_foot"], CW - 10 - SAFE, 8.4, 4.0) + 12
    y += 6
    panel(y, foot_h, border=LINE)
    pdf.rt(c["p6_foot"], M + 5, y + 5.4, CW - 10 - SAFE, 8.4, 4.0, "body", MUTED)
    guard(6, y + foot_h)

    # ── 7 · three steps ──────────────────────────────────────────────────
    pdf.cream_page(7, kick)
    y = pdf.kicker(c["p7_kick"], M + 1)
    y = pdf.h1(c["p7_h"], y, 19)
    y += 6
    for num, t, d in c["p7_steps"]:
        pdf.rt(num, M, y - 3.6, 14, 24, 12, "display", GOLD_PALE)
        yy = pdf.rt(t, M + 15, y, CW - 15, 11, 5.2, "strong", MAROON)
        yy = pdf.rt(d, M + 15, yy + 1.6, CW - 15 - SAFE, 9.4, 4.9, "body", INK_SOFT)
        y = yy + 10
        pdf.rule(y - 4.5, CW, M, LINE, 0.2)
    y += 2
    # the three fields of the sign-in screen, drawn
    fw = (CW - 8) / 3
    for i in range(3):
        x0 = M + i * (fw + 4)
        pdf.set_fill_color(*WHITE)
        pdf.set_draw_color(*LINE)
        pdf.set_line_width(0.2)
        pdf.rect(x0, y, fw, 11, "DF")
    pdf.rt("+91  98765 43210", M, y + 3.4, fw, 7.6, 4.2, "label", MUTED, align="C")
    for d in range(6):                      # the six-digit code, drawn as dots
        pdf.set_fill_color(*GOLD)
        pdf.ellipse(M + (fw + 4) + fw / 2 - 8.5 + d * 3.0, y + 5.0, 1.5, 1.5, "F")
    tx, ty = M + 2 * (fw + 4) + fw / 2, y + 5.5   # a tick, drawn
    pdf.set_draw_color(*GOLD)
    pdf.set_line_width(0.6)
    pdf.line(tx - 3, ty, tx - 1, ty + 2.4)
    pdf.line(tx - 1, ty + 2.4, tx + 3.4, ty - 2.4)
    y += 18
    panel(y, 26, border=LINE)
    pdf.rt(c["p7_note"], M + 5, y + 6, CW - 10 - SAFE, 8.6, 4.2, "body", MUTED)
    guard(7, y + 26)

    # ── 8 · your papers ──────────────────────────────────────────────────
    pdf.cream_page(8, kick)
    y = pdf.kicker(c["p8_kick"], M + 1)
    y = pdf.h1(c["p8_h"], y, 19)
    y = pdf.para(c["p8_p"], y + 1)
    y = rows(c["p8_rows"], y + 4) + 8
    nh = pdf.height_of(c["p8_note"], CW - 10 - SAFE, 8.6, 4.2) + 13
    panel(y, nh, border=LINE)
    pdf.rt(c["p8_note"], M + 5, y + 6, CW - 10 - SAFE, 8.6, 4.2, "body", MUTED)
    guard(8, y + nh)

    # ── 9 · size, care, buyback ──────────────────────────────────────────
    pdf.cream_page(9, kick)
    y = pdf.kicker(c["p9_kick"], M + 1)
    y = pdf.h1(c["p9_h"], y, 19)
    # a drawn sizer: three rings, one gold
    bx, byy = W - M - 38, y - 4
    pdf.set_draw_color(*LINE)
    pdf.set_line_width(0.3)
    for r in (5.4, 7.8, 10.2):
        pdf.ellipse(bx + 18 - r, byy + 18 - r, 2 * r, 2 * r)
    pdf.set_draw_color(*GOLD)
    pdf.set_line_width(0.55)
    pdf.ellipse(bx + 18 - 7.8, byy + 18 - 7.8, 15.6, 15.6)
    pdf.rt("14 · 17 · 20", bx, byy + 36, 36, 6.4, 3.4, "label", MUTED, align="C")
    pdf.rt("mm" if not hi else "मिमी", bx, byy + 39.6, 36, 6.4, 3.4, "label", MUTED, align="C")
    for i, (t, p) in enumerate(c["p9_blocks"]):
        y = pdf.rt(t, M, y + (2 if i == 0 else 4), CW - 40, 10.2, 5.0, "strong", MAROON) + 1.6
        y = pdf.para(p, y, 9.0, w=CW - 40) + 4
    y = rows(c["p9_rows"], y + 2, gap=2.2, pad=3.8, title_size=8.8, body_size=8.2) + 5
    pdf.rule(y, 18, lw=0.4)
    pdf.rt(c["p9_foot"], M, y + 4.2, CW - SAFE, 8.4, 4.1, "body", MUTED)
    guard(9, y + 12)

    # ── 10 · renewal ─────────────────────────────────────────────────────
    pdf.cream_page(10, kick)
    y = pdf.kicker(c["p10_kick"], M + 1)
    y = pdf.h1(c["p10_h"], y, 19)
    y = pdf.para(c["p10_p"], y + 1)
    y = pdf.para(c["p10_p2"], y + 2) + 4
    n = 6
    step = CW / n
    for i in range(n):
        pdf.set_fill_color(*(GOLD_PALE if i == n - 1 else CREAM_2))
        pdf.set_draw_color(*LINE)
        pdf.set_line_width(0.2)
        pdf.rect(M + i * step, y, step - 1.2, 11, "DF")
        pdf.rt(str(i + 1), M + i * step, y + 3.4, step - 1.2, 7.0, 3.6, "label",
               MAROON if i == n - 1 else MUTED, align="C")
    y = pdf.rt(c["p10_strip"], M, y + 13.5, CW - SAFE, 8.2, 4.2, "body", MUTED) + 7
    bh = pdf.height_of(c["p10_box_p"], CW - 10 - SAFE, 8.6, 4.1) + 26
    panel(y, bh, border=GOLD, lw=0.4)
    yy = pdf.rt(c["p10_box_t"], M + 5, y + 5.4, CW - 10, 9.8, 5.0, "strong", MAROON)
    pdf.rt(c["p10_box_p"], M + 5, yy + 1.6, CW - 10 - SAFE, 8.6, 4.1, "body", MUTED)
    pdf.set_draw_color(*LINE)
    pdf.set_line_width(0.3)
    pdf.line(M + 5, y + bh - 5.5, W - M - 5, y + bh - 5.5)
    pdf.rt("दिन / माह / वर्ष" if hi else "day / month / year",
           M + 5, y + bh - 12.2, CW - 10, 6.8, 3.4, "label", LINE, align="L")
    y += bh + 8
    # what happens on the day it lapses — three facts, drawn as a strip
    y = pdf.rt(c["p10_after_t"], M, y, CW, 9.2, 4.6, "strong", MAROON) + 1.4
    pdf.rule(y, CW, M, LINE, 0.2)
    y += 2.4
    for t, d in c["p10_after"]:
        pdf.rt("·", M + 1, y, 4, 9.0, 4.4, "body", GOLD)
        yy = pdf.rt(t, M + 5, y, CW * 0.34, 8.8, 4.3, "strong", INK_SOFT)
        pdf.rt(d, M + CW * 0.36, y, CW * 0.64, 8.6, 4.1, "body", MUTED)
        y = max(yy, y + 4.3) + 3.4
    guard(10, y)

    # ── 11 · plain words ─────────────────────────────────────────────────
    pdf.cream_page(11, kick)
    y = pdf.kicker(c["p11_kick"], M + 1)
    y = pdf.h1(c["p11_h"], y, 19)
    y += 4
    for i, t in enumerate(c["p11_terms"], 1):
        pdf.set_font("sans", "", 7.2)
        pdf.set_text_color(*GOLD)
        pdf.set_xy(M, y + 0.6)
        pdf.cell(6, 3.6, f"{i:02d}")
        y = pdf.rt(t, M + 6.4, y, CW - 6.4 - SAFE, 9.2, 4.5, "body", INK_SOFT) + 3.8
    y += 2
    pdf.rule(y, 20, lw=0.4)
    fh = pdf.height_of(c["p11_foot"], CW - SAFE, 8.4, 4.1) + 8
    panel(y + 4, fh, border=LINE)
    pdf.rt(c["p11_foot"], M + 5, y + 8, CW - 10 - SAFE, 8.4, 4.1, "body", MUTED)
    y = y + 4 + fh + 12
    # the page that makes this book hers: two lines to write on, in ink
    pdf.set_draw_color(*LINE)
    pdf.set_line_width(0.3)
    pdf.rt(c["p11_own"], M, y, CW, 8.8, 4.4, "strong", MAROON)
    pdf.line(M, y + 12, M + CW * 0.64, y + 12)
    pdf.rt(c["p11_l_name"], M, y + 13.6, CW * 0.4, 6.6, 3.3, "label", MUTED)
    y += 24
    pdf.rt(c["p11_issued"], M, y, CW, 8.6, 4.3, "strong", MAROON)
    pdf.line(M, y + 12, M + CW * 0.52, y + 12)
    pdf.line(M + CW * 0.60, y + 12, M + CW, y + 12)
    pdf.rt(c["p11_l_name"], M, y + 13.6, CW * 0.4, 6.6, 3.3, "label", MUTED)
    pdf.rt(c["p11_l_date"], M + CW * 0.60, y + 13.6, CW * 0.4, 6.6, 3.3, "label", MUTED)
    guard(11, y + 18)

    # ── 12 · back cover ──────────────────────────────────────────────────
    pdf.add_page()
    pdf.set_fill_color(*INK)
    pdf.rect(0, 0, W, H, "F")
    pdf.set_draw_color(*GOLD)
    pdf.set_line_width(0.4)
    pdf.rect(M - 5, M - 5, CW + 10, H - 2 * M + 10)
    y = pdf.rt(c["p12_h"], M, 26, CW - SAFE, 17 if not hi else 15.5, 8.6, "display", GOLD_L)
    y = pdf.rt(c["p12_p"], M, y + 3, CW - 44 - SAFE, 9.4, 4.8, "body", CREAM_2)

    # a quiet ornament in the empty middle, drawn
    cxr, cyr = W * 0.66, H * 0.44
    for r, lw, col in ((16, 0.35, GOLD), (19, 0.18, GOLD_L), (23, 0.14, GOLD)):
        pdf.set_draw_color(*col)
        pdf.set_line_width(lw)
        pdf.ellipse(cxr - r, cyr - r, 2 * r, 2 * r)
    pdf.rt("SHIVAA" if not hi else "शिवा", cxr - 16, cyr - 3.4, 32, 7.2, 3.8, "label",
           GOLD_PALE, align="C")

    qs = 30
    qy = H - 100
    qx = W - M - qs
    pdf.set_fill_color(*CREAM)
    pdf.rect(qx - 2.4, qy - 2.4, qs + 4.8, qs + 4.8, "F")
    pdf.image(qr_png(), x=qx, y=qy, w=qs, h=qs)
    pdf.rt(c["p12_qr"], qx - 6, qy + qs + 3.4, qs + 12, 6.6, 3.3, "body", GOLD_PALE, align="C")

    pdf.set_draw_color(*GOLD)
    pdf.set_line_width(0.25)
    pdf.line(M, H - 74, W - M, H - 74)
    yy = H - 69
    yy = pdf.rt(c["p12_addr"], M, yy, CW - 40 - SAFE, 9.2, 4.8, "body", CREAM_2) + 2
    yy = pdf.rt(c["p12_contact"], M, yy, CW - 40 - SAFE, 8.4, 4.2, "body", GOLD_PALE) + 1.4
    yy = pdf.rt(c["p12_hours"], M, yy, CW - 40 - SAFE, 8.4, 4.2, "body", GOLD_PALE) + 1.4
    pdf.rt(c["p12_legal"], M, H - 22, CW - SAFE, 6.8, 3.6, "label", GOLD_DIM)

    pdf.output(out_path)
    return out_path


def main() -> int:
    os.makedirs(HERE, exist_ok=True)
    paths = [build("EN", EN, os.path.join(HERE, "SHIVAA-BLACK-booklet-EN.pdf")),
             build("HI", HI, os.path.join(HERE, "SHIVAA-BLACK-booklet-HI.pdf"))]
    for p in paths:
        print(f"{os.path.basename(p):32s} {os.path.getsize(p) / 1024:7.1f} KB")
    if "--render" in sys.argv:
        import pymupdf
        out = os.path.join(tempfile.gettempdir(), "booklet-preview")
        os.makedirs(out, exist_ok=True)
        for p, tag in zip(paths, ("EN", "HI")):
            with pymupdf.open(p) as doc:
                for i, page in enumerate(doc, 1):
                    page.get_pixmap(dpi=110).save(os.path.join(out, f"{tag}-p{i:02d}.png"))
        print("rendered to", out)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
