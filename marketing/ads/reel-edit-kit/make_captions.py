#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Shivaa Jewels — cinematic caption & graphics generator (kit-only build, v2).

Reads timeline.json and regenerates, deterministically:
  captions/shivaa-jewels-captions.ass   kinetic ASS (libass) — burn-in source
  captions/shivaa-jewels-captions.srt   plain SRT (same cues)
  graphics/panels/cue-NN.png            per-cue deep-maroon gradient backing panels
  graphics/offer-card.png               editorial offer card (+ mandatory disclaimer)
  graphics/frame-accent.png             restrained gold corner framing (full reel)
  graphics/overlays.json                overlay schedule consumed by render.py

Motion design (v2 "cinematic"):
  * word-by-word kinetic reveal — karaoke \\ko pops each word as it is spoken
  * gold sheen pass — a second \\kf layer sweeps warm gold through the line
  * light shine bar — one soft blurred bar sweeps across each cue on entry
  * gold hairline draws itself across the panel top (\\fscx 0→100)
  * keyword emphasis — muted gold + bold + refined underline, exactly when spoken
  * offer card — light sweep pass + twinkling gold sparkles at the corners
  * everything eases: fade-in, gentle rise, clean fade-out. No bounce/spin/emoji.

Design law: one font only (Noto Sans Devanagari SemiBold), ivory captions,
muted gold keywords, max 2 lines per cue, lower-centre safe area.
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
SHEEN = (255, 226, 158)          # bright warm gold for the sheen pass
SHINE = (255, 244, 224)          # near-white warm shine bar
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

COMBINING = set("ऀँंऺ़ािीुूृृेैोॉौ्ॎऀ्ॏऀ्॑ऀऀ॔ॕऀॖॗऀॢऀॣ".replace("ऀ्", "")) | set("ािीुूृेैोॉौ्ंँः़ॎॏ॑॓॔ॕॖॗॢॣ")

def _expand(line, i, L):
    """never split a grapheme cluster: swallow trailing/leading matras & signs"""
    while i + L < len(line) and line[i + L] in COMBINING:
        L += 1
    while i > 0 and line[i - 1] in COMBINING:
        i -= 1; L += 1
    return i, L

def hl_spans(line, hls):
    """return list of (start, end) char ranges that are highlights"""
    spans, i = [], 0
    protected = [h.replace(" ", NBSP) for h in hls]
    while i < len(line):
        hit = None
        for h in protected:
            if h and line.startswith(h, i):
                j, L = _expand(line, i, len(h)); hit = (j, j + L); break
        if hit:
            spans.append(hit); i = hit[1]
        else:
            i += 1
    return spans

def tokens_of(line):
    """space-separated tokens (highlight phrases stay whole via NBSP)"""
    return [t for t in line.split(" ") if t]

def ko_tags(tokens, total_cs):
    """karaoke durations (centiseconds) proportional to visible length"""
    lens = [max(2, len(t.replace(NBSP, " "))) for t in tokens]
    tot = sum(lens) or 1
    cs = [max(8, int(round(total_cs * l / tot))) for l in lens]
    drift = total_cs - sum(cs)
    cs[-1] = max(8, cs[-1] + drift)
    return cs

def rich_ko_line(line, hls, total_cs, mode):
    """mode 'main': ivory + gold highlight pops; mode 'sheen': \\kf gold sweep"""
    spans = hl_spans(line, hls)
    toks = tokens_of(line)
    cs = ko_tags(toks, total_cs)
    pos, out = 0, []
    if mode == "sheen":
        out.append("{\\ko10}")
    for t, k in zip(toks, cs):
        a, b = pos, pos + len(t)
        is_hl = any(sa <= a and b <= sb for sa, sb in spans)
        vis = t.replace(NBSP, " ")
        if mode == "main":
            if is_hl:
                out.append("{\\ko%d\\c%s\\b1\\u1}%s{\\c%s\\b0\\u0}" %
                           (k, ass_color(GOLD), vis, ass_color(IVORY)))
            else:
                out.append("{\\ko%d}%s" % (k, vis))
        else:
            out.append("{\\kf%d}%s" % (k, vis))
        pos = b + 1
    return " ".join(out)

def plain_line(line):
    return line.replace(NBSP, " ")

# ---------------------------------------------------------------- events
events, overlays, srt_cues = [], [], []
panels_dir = os.path.join(KIT, "graphics", "panels")
os.makedirs(panels_dir, exist_ok=True)
os.makedirs(os.path.join(KIT, "captions"), exist_ok=True)

BAR = "m 46 0 l 166 0 l 120 %d l 0 %d z"          # slanted shine bar (height patched per cue)
HAIR = "m 0 0 l %d 0 l %d 5 l 0 5 z"               # gold hairline (width patched per cue)
STAR = "m 0 -26 l 6 -6 l 26 0 l 6 6 l 0 26 l -6 6 l -26 0 l -6 -6 z"

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
        # ---- opaque ASS backing rect where footage carries the burned sticker
        if not (e < 45.8 or s > 54.2):
            rw, rh = wpx, hpx
            rect = ("m 14 0 l %d 0 l %d 14 l %d %d l %d %d l 14 %d l 0 %d l 0 14 z"
                    % (rw - 14, rw, rw, rh - 14, rw - 14, rh, rh, rh - 14))
            events.append((0, s, e,
                           "{\\p1\\an7\\pos(%d,%d)\\move(%d,%d,%d,%d,0,340)\\fade(60,240)"
                           "\\c%s\\alpha&H10&}%s"
                           % (x0, y0, x0, y0 + 22, x0, y0, ass_color(MAR_DEEP), rect), ""))
        # ---- kinetic caption layers
        total_cs = max(60, int((e - s) * 92))
        glow = "{\\blur7\\bord0\\shad0\\alpha&H78&}%s" % "\\N".join(plain_line(l) for l in grp)
        main = "\\N".join(rich_ko_line(l, blk["highlights"], total_cs, "main") for l in grp)
        sheen = "{\\alpha&H74&\\c%s}%s" % (ass_color(SHEEN),
                 "\\N".join(rich_ko_line(l, blk["highlights"], total_cs, "sheen") for l in grp))
        move = "\\move(540,%d,540,%d,0,340)" % (TEXT_BOTTOM + 22, TEXT_BOTTOM)
        base = "{\\an2\\pos(540,%d)%s\\fade(60,240)}" % (TEXT_BOTTOM, move)
        events.append((0, s, e, base, glow))
        events.append((1, s, e, base, main))
        events.append((2, s, e, base, sheen))
        # ---- shine bar sweep across the cue on entry
        bar = BAR % (block_h + 36, block_h + 36)
        bx0, bx1 = 540 - wpx // 2 - 190, 540 + wpx // 2 + 40
        events.append((3, s, min(e, s + 1.15),
                       "{\\p1\\an7\\move(%d,%d,%d,%d,0,950)\\blur10\\clip(%d,%d,%d,%d)\\c%s\\alpha&HE0&}%s"
                       % (bx0, top - 16, bx1, top - 16, x0, y0, x0 + wpx, y0 + hpx, ass_color(SHINE), bar), ""))
        # ---- gold hairline draws itself along the panel top
        events.append((3, s, e,
                       "{\\p1\\an7\\pos(%d,%d)\\fscx0\\t(0,360,\\fscx100)\\c%s\\alpha&H5A&}%s"
                       % (x0 + 32, y0 + 9, ass_color(GOLD), HAIR % (wpx - 64, wpx - 64)), ""))
        srt_cues.append((s, e, "\n".join(plain_line(l) for l in grp)))

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
    d.line([(0, y), (cw, y)], fill=col + (232,)
           )
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
card.save(os.path.join(KIT, "graphics", "offer-card.png"))   # kept for reference only
oc_y = 300
ocx = (W - cw) // 2
ocs, oce = OC["start"], OC["end"]
CHAM = 26
cardpath = ("m %d 0 l %d 0 l %d %d l %d %d l %d %d l %d %d l %d %d l %d %d z"
            % (CHAM, cw - CHAM, cw, CHAM, cw, ch - CHAM, cw - CHAM, ch,
               CHAM, ch, 0, ch - CHAM, 0, CHAM))
rise = "\\move(%d,%d,%d,%d,0,340)"
events.append((4, ocs, oce, "{\\p1\\an7\\pos(%d,%d)%s\\fad(300,350)\\c%s\\alpha&H0C&}%s"
               % (ocx, oc_y, rise % (ocx, oc_y + 26, ocx, oc_y), ass_color(MAR_DEEP), cardpath), ""))
events.append((4, ocs, oce, "{\\p1\\an7\\pos(%d,%d)%s\\fad(300,350)\\c%s\\alpha&H28&}%s"
               % (ocx + 40, oc_y + 26, rise % (ocx + 40, oc_y + 52, ocx + 40, oc_y + 26), ass_color(GOLD),
                  HAIR % (cw - 80, cw - 80)), ""))
events.append((4, ocs, oce, "{\\an5\\pos(540,%d)%s\\fad(300,350)\\fs44\\c%s\\alpha&H11&}%s"
               % (oc_y + 78, rise % (540, oc_y + 104, 540, oc_y + 78), ass_color(IVORY), title), ""))
events.append((4, ocs, oce, "{\\p1\\an7\\pos(%d,%d)%s\\fad(300,350)\\c%s\\alpha&H32&}%s"
               % (540 - 150, oc_y + 131, rise % (540 - 150, oc_y + 157, 540 - 150, oc_y + 131), ass_color(GOLD),
                  HAIR % (300, 300)), ""))
pre, post = main.split("20%", 1)
events.append((4, ocs, oce, "{\\an5\\pos(540,%d)%s\\fad(300,350)\\fs62\\b1}%s{\\c%s}20%%{\\c%s}%s{\\b0}"
               % (oc_y + 196, rise % (540, oc_y + 222, 540, oc_y + 196), pre, ass_color(GOLD),
                  ass_color(IVORY), post), ""))
events.append((4, ocs, oce, "{\\an5\\pos(540,%d)%s\\fad(300,350)\\fs27\\c%s\\alpha&H4E&}%s"
               % (oc_y + 318, rise % (540, oc_y + 344, 540, oc_y + 318), ass_color(IVORY),
                  "\\N".join(disc)), ""))

# ---- offer card motion: light sweep pass + twinkling corner sparkles
ocs, oce = OC["start"], OC["end"]
sweepbar = "m 40 0 l 200 0 l 150 %d l -10 %d z" % (ch, ch)
events.append((4, ocs + 0.35, min(oce, ocs + 1.65),
               "{\\p1\\an7\\move(%d,%d,%d,%d,0,1100)\\blur10\\c%s\\alpha&H8A&}%s"
               % (ocx - 300, oc_y, ocx + cw + 60, oc_y, ass_color(SHINE), sweepbar), ""))
for k, (sx, sy) in enumerate([(ocx + 46, oc_y + 44), (ocx + cw - 52, oc_y + 70),
                              (ocx + cw - 90, oc_y + ch - 46), (ocx + 70, oc_y + ch - 60)]):
    for c in range(2):
        t0 = ocs + 0.5 + k * 0.35 + c * 1.7
        if t0 + 1.0 > oce:
            continue
        events.append((5, t0, t0 + 1.0,
                       "{\\p1\\an5\\pos(%d,%d)\\fscx30\\fscy30\\t(0,260,\\fscx115\\fscy115)"
                       "\\t(260,520,\\fscx35\\fscy35)\\c%s\\alpha&H26&\\fade(140,160)}%s"
                       % (sx, sy, ass_color(SHEEN), STAR), ""))

# ---------------------------------------------------------------- brand strip
STRIP_Y, STRIP_H = 1430, 260
strip = Image.new("RGBA", (W, STRIP_H), (0, 0, 0, 0))
d = ImageDraw.Draw(strip)
for y in range(STRIP_H):
    f = y / max(1, STRIP_H - 1)
    col = tuple(int(MAR_MID[c] + (MAR_DEEP[c] - MAR_MID[c]) * f) for c in range(3))
    d.line([(0, y), (W, y)], fill=col + (238,))
d.line([(0, 0), (W, 0)], fill=GOLD + (200,), width=3)
d.line([(0, STRIP_H - 2), (W, STRIP_H - 2)], fill=GOLD + (120,), width=2)
cf_strip = ImageFont.truetype(FONT_PATH, 40)
cf_sub = ImageFont.truetype(FONT_PATH, 30)
d.text((W / 2, 96), "SHIVAA JEWELS", font=cf_strip, fill=GOLD + (255,), anchor="ma", spacing=6)
d.text((W / 2, 168), "जयल, राजस्थान — हॉलमार्क्ड आभूषण", font=cf_sub, fill=IVORY + (215,), anchor="ma")
strip.save(os.path.join(KIT, "graphics", "brand-strip.png"))   # reference only
strippath = "m 0 0 l %d 0 l %d %d l 0 %d z" % (W, W, STRIP_H, STRIP_H)
sts, ste = 46.0, 54.0   # sticker window on part-5 footage (independent of card)
events.append((3, sts, ste, "{\\p1\\an7\\pos(0,%d)\\move(0,%d,0,%d,0,340)\\fad(250,300)"
               "\\c%s\\alpha&H0C&}%s" % (STRIP_Y, STRIP_Y + 18, STRIP_Y, ass_color(MAR_DEEP), strippath), ""))
events.append((3, sts, ste, "{\\p1\\an7\\pos(0,%d)\\move(0,%d,0,%d,0,340)\\fad(250,300)"
               "\\c%s\\alpha&H14&}%s" % (STRIP_Y, STRIP_Y + 18, STRIP_Y, ass_color(GOLD),
               "m 0 0 l %d 0 l %d 4 l 0 4 z" % (W, W)), ""))
events.append((3, sts, ste, "{\\an5\\pos(540,%d)\\move(540,%d,540,%d,0,340)\\fad(250,300)"
               "\\fs40\\fsp6\\c%s\\alpha&H00&}SHIVAA JEWELS"
               % (STRIP_Y + 96, STRIP_Y + 114, STRIP_Y + 96, ass_color(GOLD)), ""))
events.append((3, sts, ste, "{\\an5\\pos(540,%d)\\move(540,%d,540,%d,0,340)\\fad(250,300)"
               "\\fs30\\c%s\\alpha&H22&}जयल, राजस्थान — हॉलमार्क्ड आभूषण"
               % (STRIP_Y + 168, STRIP_Y + 186, STRIP_Y + 168, ass_color(IVORY)), ""))

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

# ---------------------------------------------------------------- ASS file
ass = []
ass += ["[Script Info]", "Title: Shivaa Jewels owner reel captions (kinetic v2)", "ScriptType: v4.00+",
        "PlayResX: %d" % W, "PlayResY: %d" % H, "WrapStyle: 2", "ScaledBorderAndShadow: yes", ""]
ass += ["[V4+ Styles]",
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding"]
fam = "Noto Sans Devanagari SemiBold" if "Noto" in FONT_PATH else "Mukta SemiBold"
ass.append("Style: Cap,%s,%d,%s,%s,%s,%s,0,0,0,0,100,100,%s,0,1,2.0,0.6,2,90,90,420,1"
           % (fam, FS, ass_color(IVORY), ass_color(IVORY, 0xFF), ass_color((0, 0, 0), 0xB4),
              ass_color((0, 0, 0), 0x80), SPACING))
ass.append("")
ass += ["[Events]", "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text"]
for layer, s, e, tags, text in events:
    ass.append("Dialogue: %d,%s,%s,Cap,,0,0,0,,%s%s" % (layer, ass_ts(s), ass_ts(e), tags, text))
open(os.path.join(KIT, "captions", "shivaa-jewels-captions.ass"), "w", encoding="utf-8").write("\n".join(ass) + "\n")

json.dump(overlays, open(os.path.join(KIT, "graphics", "overlays.json"), "w", encoding="utf-8"),
          ensure_ascii=False, indent=1)
print("cues: %d  panels: %d  overlays: %d  kinetic events: %d  font: %s"
      % (len(srt_cues), cue_no, len(overlays), len(events), os.path.basename(FONT_PATH)))
print("ASS: captions/shivaa-jewels-captions.ass | SRT: captions/shivaa-jewels-captions.srt")
