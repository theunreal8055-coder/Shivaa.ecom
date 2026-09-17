#!/usr/bin/env python3
"""STAGE 5-FREE · ₹0 METADATA — template product copy from REAL data only (no AI, no invention).

Builds work/designs_meta.json for stage 6 upload. Facts come from stage 2 normalize
(supplier tags via free Tesseract OCR). Anything unknown is OMITTED — never guessed.
Designs missing weight/purity are parked in work/quarantine_free.json (owner fills
weight in the admin panel; the nightly report lists them).

Run: python 05_free_metadata.py --config config.free.json [--limit 50] [--only SKU]
"""
import argparse, json
from pathlib import Path

from lib_common import setup_logging, load_json, save_json, LOG

PRETTY = {
    "rings": "Ring", "bangles": "Bangle", "bracelets": "Bracelet",
    "necklaces": "Necklace", "earrings": "Earrings", "pendants": "Pendant",
    "mangalsutra": "Mangalsutra", "nosepins": "Nose Pin", "chains": "Chain",
    "silver": "Silver Piece", "bajubandh": "Bajubandh", "rakhdi": "Rakhdi",
    "aad": "Aad", "sheeshphool": "Sheeshphool", "hathphool": "Hathphool",
    "punach": "Punach", "bridalanklets": "Bridal Anklet",
}
BRAND = ("Shivaa Jewellers — Sadar Bazaar, Jayal, Nagaur, Rajasthan. "
         "Hand-finished by our own karigars.")


def title_for(d):
    cat = PRETTY.get(d.get("category", ""), "Jewellery")
    metal = d.get("metal") or ""
    purity = d.get("purity") or ""
    bits = " ".join(x for x in (purity, metal, cat) if x).strip()
    return f"{bits} — {d['sku']}" if bits else f"Shivaa {cat} — {d['sku']}"


def desc_for(d):
    p = []
    p.append(BRAND)
    facts = []
    if d.get("purity"): facts.append(f"Purity: {d['purity']}")
    if d.get("metal"):  facts.append(f"Metal: {d['metal']}")
    if d.get("weightG"): facts.append(f"Gross weight: {d['weightG']} g")
    if d.get("stoneDesc"): facts.append(f"Stones: {d['stoneDesc']}")
    if facts:
        p.append("Specifications:\n" + "\n".join(f"• {f}" for f in facts))
    p.append("BIS-hallmarked where applicable. Each piece is photographed exactly as "
             "supplied by our karigars — what you see is the piece you get.")
    p.append("Jaipur live-rate pricing. Making charges as shown at checkout. "
             "Insured shipping across India.")
    return "\n\n".join(p)


def tags_for(d):
    t = [d.get("category", "jewellery"), "shivaa", "jaipur", "handmade"]
    if d.get("metal"): t.append(d["metal"].lower())
    if d.get("purity"): t.append(str(d["purity"]).lower())
    return t[:8]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--config", default="config.free.json")
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--only", default="")
    a = ap.parse_args()
    cfg = load_json(a.config)
    work = Path(cfg["paths"]["work_dir"])
    setup_logging(work)
    designs = load_json(work / "designs.json")
    if a.only:
        want = set(a.only.split(","))
        designs = [d for d in designs if d["sku"] in want]
    if a.limit:
        designs = designs[: a.limit]
    ready, quarantine = [], []
    for d in designs:
        rec = dict(d)
        rec["title"] = title_for(d)
        rec["description"] = desc_for(d)
        rec["tags"] = tags_for(d)
        rec["images"] = [
            str(Path(cfg["paths"]["out_dir"]) / d["sku"] / n)
            for n in ("shot_studio.jpg", "shot_raw.jpg")
            if (Path(cfg["paths"]["out_dir"]) / d["sku"] / n).exists()
        ]
        vid = Path(cfg["paths"]["out_dir"]) / d["sku"] / "video.mp4"
        if vid.exists():
            rec["video"] = str(vid)
        # honest gate: upload only what we can price truthfully
        if d.get("weightG") and d.get("metal"):
            ready.append(rec)
        else:
            quarantine.append(rec)
    save_json(work / "designs_meta.json", ready)
    save_json(work / "quarantine_free.json",
              [{"sku": q["sku"], "category": q.get("category"), "reason":
                "weight/metal unknown — fill in admin panel"} for q in quarantine])
    LOG.info("metadata: %d ready for upload · %d quarantined (missing weight/metal)",
             len(ready), len(quarantine))


if __name__ == "__main__":
    main()
