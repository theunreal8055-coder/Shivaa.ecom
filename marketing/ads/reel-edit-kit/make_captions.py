#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Shivaa Jewels — premium caption & graphics generator (kit-only build).

Reads timeline.json and regenerates, deterministically:
  captions/shivaa-jewels-captions.ass   styled ASS (libass) — burn-in source
  captions/shivaa-jewels-captions.srt   plain SRT (same cues)
  graphics/panels/cue-NN.png            per-cue deep-maroon gradient backing panels
  graphics/offer-card.png               editorial offer card (+ mandatory disclaimer)
  graphics/frame-accent.png             restrained gold corner framing (full reel)
  graphics/overlays.json                overlay schedule consumed by render.py

Design law (handoff §7/§8): one font only (Noto Sans Devanagari SemiBold),
ivory captions, muted gold keywords + refined gold underline, max 2 lines per
cue, lower-centre safe area, fade-in + gentle upward reveal + clean fade-out.
No bounce / spin / shake / emoji / neon anywhere in this file.
"""
import json, os, sys, math
from PIL import Image, ImageDraw, ImageFont

KIT = os.path.dirname(os.path.abspath(__file__))
TL = json.load(open(os.path.join(KIT, "timeline.json"), encoding="utf-8"))
META = TL["meta"]
W, H = META["canvas"]["w"], META["canvas"]["h"]
FS = META["caption_font_size"]
SPACING = META["letter_spacing"]
MAXW = META["safe_area"]["max_text_width"]
TEXT_BOTTOM = META["safe_area"]["caption_bottom_y"]
IVORY = tuple(int(META["colors"]["ivory"][i:i+2], 16) for i in (1, 3, 5))
GOLD = tuple(int(META["colors"]["gold"][i:i+2], 16) for i in (1, 3, 5))
MAR_DEEP = tuple(int(META["colors"]["maroon_deep"][i:i+2], 16) for i in (1, 3, 5))
MAR_MID = tuple(int(META["colors"]["maroon_mid"][i:i+2], 16) for i in (1, 3, 5))

FONT_PATH = os.path.join(KIT, "fonts", "NotoSansDevanagari-SemiBold.ttf")
if not os.path.exists(FONT_PATH):
    FONT_PATH = os.path.join(KIT, "fonts", "Mukta-SemiBold.ttf")
FONT = ImageFont.truetype(FONT_PATH, FS)
ASC, DESC = FONT.getmetrics()
LH = ASC + DESC                      # line box height (matches libass hhea box)
PAD_Y, PAD_X, RAD = 30, 54, 30

def ass_color(rgb, alpha=0):
    r, g, b = rgb
    return "&H%02X%02X%02X%02X&" % (alpha, b, g, r)

def ass_ts(t):
    cs = int(round(t * 100))
    return "%d:%02d:%02d.%02d" % (cs // 360000, (cs // 6000) % 60, (cs // 100) % 60, cs % 100)

def width_of(s):
    return FONT.getlength(s) + SPACING * max(0, len(s) - 1)

NBSP = "\u00A0"

def protect(text, hls):
    """keep highlight phrases unbreakable while wrapping"""
    for h in hls:
        text = text.replace(h, h.replace(" ", NBSP))
    return text

def wrap(text, maxw=MAXW):
    words, lines, cur = text.split(" "), [], ""
    for w in words:
        trial = (cur + " " + w).strip()
        if width_of(trial) <= maxw or not cur:
            cur = trial
        else:
            lines.append(cur); cur = w
    if cur:
        lines.append(cur)
    return lines

def chunk_cues(lines, start, end):
    """<=2 lines per cue; time split proportional to characters"""
    groups = [lines[i:i+2] for i in range(0, len(lines), 2)]
    total = sum(sum(len(l) for l in g) for g in groups) or 1
    out, t = [], start
    for g in groups:
        dur = (end - start) * sum(len(l) for l in g) / total
        out.append((t, t + dur, g)); t += dur
    out[-1] = (out[-1][0], end, out[-1][2])
    return out

COMBINING = set("ऀँंःऺ़ािीुूृृेैोॉौ्ॎॏ॒॑॓॔ॕॖॗॢॣ")

def _expand(line, i, L):
    """never split a grapheme cluster: swallow trailing/leading matras & signs"""
    while i + L < len(line) and line[i + L] in COMBINING:
        L += 1
    while i > 0 and line[i - 1] in COMBINING:
        i -= 1; L += 1
    return i, L

def rich_line(line, hls):
    """ASS line with muted-gold + refined underline on spoken highlight words"""
    parts, buf, i = [], "", 0
    protected = [(h.replace(" ", NBSP)) for h in hls]
    while i < len(line):
        hit = None
        for h in protected:
            if line.startswith(h, i):
                j, L = _expand(line, i, len(h)); hit = line[j:j+L]; break
        if hit:
            if buf: parts.append(("t", buf)); buf = ""
            parts.append(("h", hit)); i += len(hit)
        else:
            buf += line[i]; i += 1
    if buf: parts.append(("t", buf))
    s = ""
    for kind, txt in parts:
        txt = txt.replace(NBSP, " ")
        if kind == "h":
            s += "{\\c%s\\u1\\b1}%s{\\b0\\u0\\c%s}" % (ass_color(GOLD), txt, ass_color(IVORY))
        else:
            s += txt
    return s

def plain_line(line):
    return line.replace(NBSP, " ")

# ---------------------------------------------------------------- events
events, overlays, srt_cues = [], [], []
panels_dir = os.path.join(KIT, "graphics", "panels")
os.makedirs(panels_dir, exist_ok=True)
os.makedirs(os.path.join(KIT, "captions"), exist_ok=True)

cue_no = 0
for blk in TL["blocks"]:
    lines = wrap(protect(blk["text"], blk["highlights"]), MAXW)
    for (s, e, grp) in chunk_cues(lines, blk["start"], blk["end"]):
        cue_no += 1
        n = len(grp)
        block_h = n * LH
        top = TEXT_BOTTOM - block_h
        # ---- backing panel (deep-maroon vertical gradient, rounded)
        wpx = int(max(width_of(plain_line(l)) for l in grp)) + 2 * PAD_X
        hpx = block_h + 2 * PAD_Y
        img = Image.new("RGBA", (wpx, hpx), (0, 0, 0, 0))
        d = ImageDraw.Draw(img)
        for y in range(hpx):
            f = y / max(1, hpx - 1)
            col = tuple(int(MAR_MID[c] + (MAR_DEEP[c] - MAR_MID[c]) * f) for c in range(3))
            a = int(150 - 44 * f)                      # subtle transparency gradient
            d.line([(0, y), (wpx, y)], fill=col + (a,))
        mask = Image.new("L", (wpx, hpx), 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, wpx - 1, hpx - 1], RAD, fill=255)
        img.putalpha(Image.composite(img.split()[3], Image.new("L", (wpx, hpx), 0), mask))
        pf = os.path.join(panels_dir, "cue-%02d.png" % cue_no)
        img.save(pf)
        x0 = (W - wpx) // 2
        y0 = top - PAD_Y
        overlays.append({"file": "graphics/panels/cue-%02d.png" % cue_no, "start": round(s, 3),
                         "end": round(e, 3), "x": x0, "y": y0, "rise": 22, "fin": 0.21, "fout": 0.26})
        # ---- ASS: glow under-layer + main layer, gentle upward reveal
        joined = "\\N".join(rich_line(l, blk["highlights"]) for l in grp)
        glow = "{\\blur7\\bord0\\shad0\\alpha&H78&}%s" % "\\N".join(plain_line(l) for l in grp)
        move = "\\move(540,%d,540,%d,0,340)" % (TEXT_BOTTOM + 22, TEXT_BOTTOM)
        events.append((0, s, e, "{\\an2\\pos(540,%d)%s\\fad(210,260)}" % (TEXT_BOTTOM, move), glow))
        events.append((1, s, e, "{\\an2\\pos(540,%d)%s\\fad(210,260)}" % (TEXT_BOTTOM, move), joined))
        srt_cues.append((s, e, "\n".join(plain_line(l) for l in grp)))

# ---------------------------------------------------------------- ASS file
ass = []
ass += ["[Script Info]", "Title: Shivaa Jewels owner reel captions", "ScriptType: v4.00+",
        "PlayResX: %d" % W, "PlayResY: %d" % H, "WrapStyle: 2", "ScaledBorderAndShadow: yes", ""]
ass += ["[V4+ Styles]",
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding"]
fam = "Noto Sans Devanagari SemiBold" if "Noto" in FONT_PATH else "Mukta SemiBold"
ass.append("Style: Cap,%s,%d,%s,%s,%s,%s,0,0,0,0,100,100,%s,0,1,2.0,0.6,2,90,90,420,1"
           % (fam, FS, ass_color(IVORY), ass_color(IVORY), ass_color((0, 0, 0), 0xB4),
              ass_color((0, 0, 0), 0x80), SPACING))
ass.append("")
ass += ["[Events]", "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text"]
for layer, s, e, tags, text in events:
    ass.append("Dialogue: %d,%s,%s,Cap,,0,0,0,,%s%s" % (layer, ass_ts(s), ass_ts(e), tags, text))
open(os.path.join(KIT, "captions", "shivaa-jewels-captions.ass"), "w", encoding="utf-8").write("\n".join(ass) + "\n")

# ---------------------------------------------------------------- SRT file
def srt_ts(t):
    ms = int(round(t * 1000))
    return "%02d:%02d:%02d,%03d" % (ms // 3600000, (ms // 60000) % 60, (ms // 1000) % 60, ms % 1000)
srt = []
for i, (s, e, txt) in enumerate(srt_cues, 1):
    srt += [str(i), "%s --> %s" % (srt_ts(s), srt_ts(e)), txt, ""]
open(os.path.join(KIT, "captions", "shivaa-jewels-captions.srt"), "w", encoding="utf-8").write("\n".join(srt))

# ---------------------------------------------------------------- offer card
OC = TL["offer_card"]
cf_title = ImageFont.truetype(FONT_PATH, 44)
cf_main = ImageFont.truetype(FONT_PATH, 62)
cf_disc = ImageFont.truetype(FONT_PATH, 27)
def wl(font, s): return font.getlength(s)
title, main, disc = OC["title"], OC["main"], OC["disclaimer"]
main_w = wl(cf_main, main)
cw = int(max(wl(cf_title, title), main_w, max(wl(cf_disc, d) for d in disc))) + 160
P_TOP, P_TITLE, P_GAP1, P_MAIN, P_GAP2, P_DISC, P_BOT = 56, 56, 42, 84, 46, 40 * len(disc), 52
ch = P_TOP + P_TITLE + P_GAP1 + P_MAIN + P_GAP2 + P_DISC + P_BOT
card = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
d = ImageDraw.Draw(card)
for y in range(ch):
    f = y / (ch - 1)
    col = tuple(int(MAR_MID[c] + (MAR_DEEP[c] - MAR_MID[c]) * f) for c in range(3))
    d.line([(0, y), (cw, y)], fill=col + (232,))
m = Image.new("L", (cw, ch), 0)
ImageDraw.Draw(m).rounded_rectangle([0, 0, cw - 1, ch - 1], 26, fill=255)
card.putalpha(Image.composite(card.split()[3], Image.new("L", (cw, ch), 0), m))
d = ImageDraw.Draw(card)
d.rounded_rectangle([10, 10, cw - 11, ch - 11], 20, outline=GOLD + (150,), width=2)   # thin gold rule frame
y = P_TOP
d.text((cw / 2, y), title, font=cf_title, fill=IVORY + (235,), anchor="ma")
y = P_TOP + P_TITLE + P_GAP1 // 2
d.line([(cw / 2 - 150, y), (cw / 2 + 150, y)], fill=GOLD + (170,), width=2)           # refined gold hairline
y = P_TOP + P_TITLE + P_GAP1
pre, post = main.split("20%", 1)
tot = wl(cf_main, pre) + wl(cf_main, "20%") + wl(cf_main, post)
x = cw / 2 - tot / 2
d.text((x, y), pre, font=cf_main, fill=IVORY + (255,), anchor="la")
x += wl(cf_main, pre)
d.text((x, y), "20%", font=cf_main, fill=GOLD + (255,), anchor="la")
x += wl(cf_main, "20%")
d.text((x, y), post, font=cf_main, fill=IVORY + (255,), anchor="la")
y = P_TOP + P_TITLE + P_GAP1 + P_MAIN + P_GAP2
for ln in disc:
    d.text((cw / 2, y), ln, font=cf_disc, fill=IVORY + (178,), anchor="ma")
    y += 40
card.save(os.path.join(KIT, "graphics", "offer-card.png"))
oc_y = 300
overlays.append({"file": "graphics/offer-card.png", "start": OC["start"], "end": OC["end"],
                 "x": (W - cw) // 2, "y": oc_y, "rise": 26, "fin": 0.30, "fout": 0.35})

# ---------------------------------------------------------------- frame accent
fa = Image.new("RGBA", (W, H), (0, 0, 0, 0))
d = ImageDraw.Draw(fa)
L, T, IN = 96, 3, 64
for (cx, cy, sx, sy) in [(IN, IN, 1, 1), (W - IN, IN, -1, 1), (IN, H - IN, 1, -1), (W - IN, H - IN, -1, -1)]:
    d.line([(cx, cy), (cx + sx * L, cy)], fill=GOLD + (64,), width=T)
    d.line([(cx, cy), (cx, cy + sy * L)], fill=GOLD + (64,), width=T)
fa.save(os.path.join(KIT, "graphics", "frame-accent.png"))
overlays.append({"file": "graphics/frame-accent.png", "start": 0.6, "end": 9999,
                 "x": 0, "y": 0, "rise": 0, "fin": 0.8, "fout": 0.5})

json.dump(overlays, open(os.path.join(KIT, "graphics", "overlays.json"), "w", encoding="utf-8"),
          ensure_ascii=False, indent=1)
print("cues: %d  panels: %d  overlays: %d  font: %s" % (len(srt_cues), cue_no, len(overlays), os.path.basename(FONT_PATH)))
print("ASS: captions/shivaa-jewels-captions.ass | SRT: captions/shivaa-jewels-captions.srt")
