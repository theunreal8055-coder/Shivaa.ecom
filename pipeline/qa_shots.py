#!/usr/bin/env python3
"""QA GATE for AI photoshoot shots — the machine version of the human eye.

On the 65-ring shoot, a HUMAN caught the failures: PGS5021's prop card with
garbled text, PGS5037's WHITE price tag (the green-tag scan missed it because
it only looked for bright spring-green). At 10,000 designs no human can do
that, so this gate runs the cheap checks automatically and only sends the
flagged shots to a person.

Checks per shot:
  1. tag-green  — bright spring-green supplier tag pixels (proven predicate,
                  copied from demo65/tools/tag_scan.py)
  2. tag-white  — near-white low-saturation blob in the CENTRAL box, i.e. a
                  price tag that rendered white (PGS5037 lesson). Experimental:
                  enable with --white. An ivory backdrop would also score, so
                  only use it on dark-background house shots.
  3. ref-drift  — mean colour distance between the shot's centre and the
                  original design photo's centre; a shot that invented a
                  different ring drifts far. Tune --drift in the A/B.

NOT a replacement for visual QA. The documented failure stays: a tag rendered
as DARK EMERALD in editorial scenes is colour-identical to green velvet and no
pixel-colour scan can catch it (verified on PGS5036::editorial, 6 Sep 2026).
Flagged shots must be re-rolled or looked at by a person before upload.

The colour predicates import ONLY colorsys, so they are unit-testable on a
machine without PIL (this repo's dev sandbox has none). The image scan needs
PIL: `pip install pillow`.

Run on the machine that has the shots:
    python3 pipeline/qa_shots.py --media demo65/media [--white] [--json out.json]
Exit code 1 if any shot is flagged (so a batch job can stop / re-roll).
"""
import argparse, colorsys, json, sys
from pathlib import Path

# ── colour predicates (PIL-free; unit-tested in qa/qa_v48_static.py) ─────
def is_tag_green(r, g, b):
    """Bright spring-green supplier tag: ~155deg hue, bright, saturated."""
    h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
    return 0.36 <= h <= 0.47 and l >= 0.55 and s >= 0.45

def is_tag_white(r, g, b):
    """Price tag that rendered WHITE (PGS5037): near-white, low saturation.
    s<=0.20 admits the slight warm tint a white tag picks up in JPEG while
    still rejecting ivory silk (s~0.40) and candle bokeh (l~0.68)."""
    h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
    return l >= 0.88 and s <= 0.20

# ── image scan (needs PIL) ───────────────────────────────────────────────
def _load():
    try:
        from PIL import Image
        return Image
    except ImportError:
        print("PIL not installed — pip install pillow. "
              "Colour predicates above are still importable for tests.", file=sys.stderr)
        sys.exit(2)

def scan_shot(path, min_frac=0.003, white=False):
    Image = _load()
    with Image.open(path) as im:
        im = im.convert("RGB")
        small = im.resize((120, 120))
        px = list(small.getdata())
        green = sum(1 for r, g, b in px if is_tag_green(r, g, b)) / len(px)
        # central 50% box for the white-tag test (tags hang near the ring)
        w = h = 120
        cx0, cx1, cy0, cy1 = w // 4, 3 * w // 4, h // 4, 3 * h // 4
        box = [small.getpixel((x, y)) for y in range(cy0, cy1) for x in range(cx0, cx1)]
        whitef = sum(1 for r, g, b in box if is_tag_white(r, g, b)) / len(box)
    flags = []
    if green >= min_frac:
        flags.append(f"tag-green {green:.3%}")
    if white and whitef >= min_frac:
        flags.append(f"tag-white {whitef:.3%}")
    return {"green": round(green, 5), "white": round(whitef, 5), "flags": flags}

def ref_drift(shot_path, ref_path):
    Image = _load()
    with Image.open(shot_path) as a, Image.open(ref_path) as b:
        a = a.convert("RGB").resize((32, 32))
        b = b.convert("RGB").resize((32, 32))
        pa, pb = list(a.getdata()), list(b.getdata())
    return round(sum(abs(x[0]-y[0]) + abs(x[1]-y[1]) + abs(x[2]-y[2])
                     for x, y in zip(pa, pb)) / (3 * len(pa)), 2)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--media", required=True, help="folder with SKU dirs of shot_*.jpg")
    ap.add_argument("--min", type=float, default=0.003)
    ap.add_argument("--white", action="store_true", help="also run the experimental white-tag scan")
    ap.add_argument("--drift", type=float, default=0, help="flag shots whose centre colour drifts this far from the ref (0 = off)")
    ap.add_argument("--json", default="", help="also write a JSON report")
    a = ap.parse_args()

    media = Path(a.media)
    report, flagged = [], 0
    for d in sorted(p for p in media.iterdir() if p.is_dir() and p.name != "designs"):
        ref = media / "designs" / f"{d.name}.jpg"
        for f in sorted(d.glob("shot_*.jpg")):
            r = scan_shot(f, a.min, a.white)
            if a.drift and ref.exists():
                dv = ref_drift(f, ref)
                r["drift"] = dv
                if dv > a.drift:
                    r["flags"].append(f"ref-drift {dv}")
            if r["flags"]:
                flagged += 1
                print(f"FLAG {d.name}::{f.stem[5:]:<10} " + " · ".join(r["flags"]))
            report.append({"sku": d.name, "shot": f.stem[5:], **r})
    print(f"\nscanned {len(report)} shots — {flagged} flagged")
    if a.json:
        Path(a.json).write_text(json.dumps(report, indent=1))
        print("report ->", a.json)
    sys.exit(1 if flagged else 0)

if __name__ == "__main__":
    main()
