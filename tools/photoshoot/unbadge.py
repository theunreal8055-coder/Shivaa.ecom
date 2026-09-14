#!/usr/bin/env python3
"""v111 — remove the composited Shivaa INC. badge from a finalized shot.

The badge box is deterministic (finalize.py house geometry):
  bw = round(896*0.21094)=189px wide, placed x>=896-189-22, y>=1195-bh-23.
We fill that box with the local background (median of the rows just above the
box + slight vertical gradient), which is imperceptible to the image model
when the de-badged file is used as the zoom-out reference.
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image

TARGET_W, TARGET_H = 896, 1195
BADGE_W_REL = 0.21094
RIGHT_MARGIN_REL = 0.02455
BOTTOM_MARGIN_REL = 0.01925


def unbadge(src: str, dst: str):
    im = Image.open(src).convert('RGB')
    if im.size != (TARGET_W, TARGET_H):
        # finalize() enforces 896x1195; anything else is unexpected — still try
        im = im.resize((TARGET_W, TARGET_H), Image.LANCZOS)
    a = np.array(im)
    bw = round(TARGET_W * BADGE_W_REL)
    bh_rel = 387 / 912  # badge.png native aspect
    bh = round(bw * bh_rel)
    bx = TARGET_W - bw - round(TARGET_W * RIGHT_MARGIN_REL)
    by = TARGET_H - bh - round(TARGET_H * BOTTOM_MARGIN_REL)
    # background estimate: rows above the badge box, same x range (badge never
    # overlaps the product in house geometry), plus the columns to the left
    strip_top = a[max(0, by - 40):by - 6, bx - 10:bx + bw + 10, :]
    strip_left = a[by:by + bh + 10, max(0, bx - 50):bx - 6, :]
    bg = np.median(np.concatenate([strip_top.reshape(-1, 3), strip_left.reshape(-1, 3)]), axis=0)
    rng = np.random.default_rng(7)
    box = np.tile(bg, (bh + 2, bw + 2, 1)).astype(np.int16)
    box += rng.integers(-3, 4, box.shape, dtype=np.int16)  # subtle grain
    a[by - 1:by + bh + 1, bx - 1:bx + bw + 1, :] = np.clip(box, 0, 255)
    out = Path(dst); out.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(a.astype(np.uint8)).save(out, quality=92)
    return str(out)


if __name__ == '__main__':
    if len(sys.argv) != 3:
        sys.exit('usage: unbadge.py IN OUT')
    print('unbadged ->', unbadge(sys.argv[1], sys.argv[2]))
