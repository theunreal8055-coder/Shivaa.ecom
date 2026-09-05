#!/usr/bin/env python3
"""Contact sheets of tag crops (8 per sheet, page order) for fast visual reading."""
from PIL import Image
from pathlib import Path
HERE = Path(__file__).resolve().parent.parent
TAGS = HERE / "work" / "tags"
SHEETS = HERE / "work" / "sheets"
SHEETS.mkdir(parents=True, exist_ok=True)
files = sorted(TAGS.glob("*.png"))
H = 800; W = 320; COLS = 8
for s in range(0, len(files), COLS):
    chunk = files[s:s + COLS]
    sheet = Image.new("RGB", (W * COLS + 10 * (COLS + 1), H + 20), (245, 245, 245))
    for i, f in enumerate(chunk):
        t = Image.open(f)
        sc = min(W / t.width, H / t.height)
        t = t.resize((int(t.width * sc), int(t.height * sc)), Image.LANCZOS)
        sheet.paste(t, (10 + i * (W + 10), 10 + (H - t.height) // 2))
    sheet.save(SHEETS / f"sheet_{s // COLS + 1:02d}.png", quality=92)
    print(f"sheet_{s // COLS + 1:02d}.png: {chunk[0].stem} … {chunk[-1].stem}")
