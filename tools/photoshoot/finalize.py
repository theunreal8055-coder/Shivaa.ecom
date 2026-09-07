#!/usr/bin/env python3
"""Finalize a generated shot to house style (896x1195 + Shivaa INC. badge)."""
import sys
from pathlib import Path
from PIL import Image

HERE = Path(__file__).parent
TARGET_W, TARGET_H = 896, 1195
BADGE_W_REL = 0.21094
RIGHT_MARGIN_REL = 0.02455
BOTTOM_MARGIN_REL = 0.01925


def finalize(src: str, dst: str):
    im = Image.open(src).convert('RGB')
    w, h = im.size
    tgt = TARGET_W / TARGET_H
    if w / h > tgt:
        nw = round(h * tgt); x = (w - nw) // 2
        im = im.crop((x, 0, x + nw, h))
    else:
        nh = round(w / tgt); y = (h - nh) // 2
        im = im.crop((0, y, w, y + nh))
    im = im.resize((TARGET_W, TARGET_H), Image.LANCZOS)
    badge = Image.open(HERE / 'badge.png').convert('RGBA')
    bw = round(TARGET_W * BADGE_W_REL)
    bh = round(bw * badge.size[1] / badge.size[0])
    badge = badge.resize((bw, bh), Image.LANCZOS)
    bx = TARGET_W - bw - round(TARGET_W * RIGHT_MARGIN_REL)
    by = TARGET_H - bh - round(TARGET_H * BOTTOM_MARGIN_REL)
    im.paste(badge, (bx, by), badge)
    out = Path(dst)
    out.parent.mkdir(parents=True, exist_ok=True)
    im.save(out, quality=89)


if __name__ == '__main__':
    finalize(sys.argv[1], sys.argv[2])
    print('finalized ->', sys.argv[2])
