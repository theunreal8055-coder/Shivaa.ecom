#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Shivaa Jewels — Hinglish (Roman-script) captions only.
Reads timeline.json windows; emits captions/shivaa-hinglish.ass (+ .srt).
Plain, clean captions: ivory text, soft dark outline+shadow, gentle fade.
No panels, no cards, no graphics — captions only, as instructed.
"""
import json, os
from PIL import ImageFont

KIT = os.path.dirname(os.path.abspath(__file__))
TL = json.load(open(os.path.join(KIT, "timeline.json"), encoding="utf-8"))
META = TL["meta"]
W, H = META["canvas"]["w"], META["canvas"]["h"]
FS = 60
MAXW = 940
TEXT_BOTTOM = 1500

HING = {
 "hook": "Ram-Ram sa! Kya aapko Jayal mein shaadi ke liye aabhushan lene hain?",
 "invite": "To door jaane ki zaroorat nahi hai sa — Shivaa Jewels par aapko dulhan ke aabhushanon ka khaas sangrah mil jayega.",
 "showroom": "Hamare showroom mein aapki shaadi ki taiyari ke liye design dekhne aur chunne ki poori suvidha hai.",
 "bridal": "Haar, jhumke, chooda-bangdi aur poora dulhan set — apni pasand ke design aaram se dekhiye.",
 "app": "Shivaa ke app par hi dulhan ke aabhushanon ke sundar design dekhiye, tasveerein badliye aur apni pasand chun lijiye.",
 "rate": "Aur aaj ka live sone ka bhaav bhi Shivaa ke app par saaf-saaf dekh lijiye.",
 "offer": "Pehli baar aabhushan kharidne walon ke liye khaas offer — making charge par poore 20% ki chhoot.",
 "membership": "Shivaa Jewels ka Black Membership card lijiye, aur aage bhi making charge par 20% ka labh paate rahiye.",
 "safety": "Beti ki shaadi ka gehna kharidne se pehle hallmark, sahi wazan aur making charge zaroor jaanchiye.",
 "cta": "Free bridal design trial ke liye WhatsApp par 'Bridal' likho ya abhi call karo.",
}

FONT_PATH = os.path.join(KIT, "fonts", "NotoSansDevanagari-SemiBold.ttf")
if not os.path.exists(FONT_PATH):
    FONT_PATH = os.path.join(KIT, "fonts", "Mukta-SemiBold.ttf")
FONT = ImageFont.truetype(FONT_PATH, FS)

def width_of(s):
    return FONT.getlength(s)

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
    groups = [lines[i:i+2] for i in range(0, len(lines), 2)]
    total = sum(sum(len(l) for l in g) for g in groups) or 1
    out, t = [], start
    for g in groups:
        dur = (end - start) * sum(len(l) for l in g) / total
        out.append((t, t + dur, g)); t += dur
    out[-1] = (out[-1][0], end, out[-1][2])
    return out

def ass_ts(t):
    cs = int(round(t * 100))
    return "%d:%02d:%02d.%02d" % (cs // 360000, (cs // 6000) % 60, (cs // 100) % 60, cs % 100)

def srt_ts(t):
    ms = int(round(t * 1000))
    return "%02d:%02d:%02d,%03d" % (ms // 3600000, (ms // 60000) % 60, (ms // 1000) % 60, ms % 1000)

events, srt = [], []
for blk in TL["blocks"]:
    text = HING[blk["id"]]
    lines = wrap(text)
    for (s, e, grp) in chunk_cues(lines, blk["start"], blk["end"]):
        events.append((s, e, "\\N".join(grp)))
        srt.append((s, e, "\n".join(grp)))

ass = ["[Script Info]", "Title: Shivaa Jewels reel — Hinglish captions", "ScriptType: v4.00+",
       "PlayResX: %d" % W, "PlayResY: %d" % H, "WrapStyle: 2", "ScaledBorderAndShadow: yes", "",
       "[V4+ Styles]",
       "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
       "Style: Hing,Noto Sans Devanagari SemiBold,%d,&H00F0EFF5,&H000000FF,&H00140E0C,&H00000000,1,0,0,0,100,100,0.4,0,1,2.6,0.7,2,60,60,60,1" % FS,
       "",
       "[Events]",
       "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text"]
for s, e, txt in events:
    ass.append("Dialogue: 0,%s,%s,Hing,,0,0,0,,{\\an2\\pos(540,%d)\\fad(140,200)}%s"
               % (ass_ts(s), ass_ts(e), TEXT_BOTTOM, txt))
open(os.path.join(KIT, "captions", "shivaa-hinglish.ass"), "w", encoding="utf-8").write("\n".join(ass) + "\n")
out = []
for i, (s, e, txt) in enumerate(srt, 1):
    out += [str(i), "%s --> %s" % (srt_ts(s), srt_ts(e)), txt, ""]
open(os.path.join(KIT, "captions", "shivaa-hinglish.srt"), "w", encoding="utf-8").write("\n".join(out))
print("hinglish cues: %d" % len(events))
