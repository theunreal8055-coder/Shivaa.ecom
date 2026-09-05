#!/usr/bin/env python3
"""STAGE 5 · METADATA — SEO title, description, tags, alt text per design via LLM.

SPEC-LOCK guardrail: the prompt hands the LLM ONLY the validated design row and forbids
inventing numbers; afterwards we regex-verify that every weight/purity/metal literal in the
output exists in the source row, else the design is quarantined to work/review_queue.json
(no fabricated specs — handoff rule #5).

Providers: openai | gemini | anthropic | craft (write meta by hand in work/meta_manual.json)
Output: out/{sku}/meta.json  -> exactly what POST /api/products expects + SEO body.
Run: python 05_metadata.py --limit 30
"""
import argparse, json, os, re
from pathlib import Path
from lib_common import setup_logging, load_json, save_json, Ledger, LOG

CAT_LABEL = {"rings": "Ring", "bangles": "Bangle & Kada", "necklaces": "Necklace Set",
             "earrings": "Earrings", "bracelets": "Bracelet", "pendants": "Pendant",
             "mangalsutra": "Mangalsutra", "nosepins": "Nose Pin", "silver": "Silver",
             "bajubandh": "Bajubandh", "rakhdi": "Rakhdi", "aad": "Fancy Aad",
             "sheeshphool": "Sheesh Phool", "hathphool": "Hathphool", "punach": "Punach",
             "bridalanklets": "Bridal Anklets", "chains": "Chain", "general": "Jewellery"}

def build_prompt(d, cfg):
    lock = {k: d.get(k) for k in cfg["metadata"].get("spec_lock", [])}
    return f"""You write jewellery e-commerce copy for {cfg['metadata']['brand']}
Write for product: {json.dumps(d, ensure_ascii=False)}
HARD RULES:
1. Use ONLY the facts in the row above. NEVER invent weight, purity, karat, price, carat, stone value.
2. Always add the sentence: "BIS hallmarked & hand-finished by our karigars. Priced live on gold/silver bullion rate of the day."
   (silver: "925 silver" instead of BIS hallmark sentence)
3. Return strict JSON only: {{"title": "...", "desc": "...", "tags": [...6-8 short lowercase tags...],
   "seo_keywords": [...], "alt": "...", "category_note": "..."}} — title 60-90 chars incl category name."""

def extract_json(txt):
    m = re.search(r"\{[\s\S]*\}", txt)
    return json.loads(m.group()) if m else None

def check_spec_lock(meta_txt: str, d, fields):
    """Verify every weight/purity literal in generated copy exists in the source row.
    Word boundaries prevent false matches (e.g. '2014 gold' or '6.69g')."""
    bad = []
    for f in fields:
        src = str(d.get(f, ""))
        if not src: continue
        if f == "weightG":
            for w in re.findall(r"\b\d+(?:\.\d+)?\s?g(?:rams?)?\b(?!\w)", meta_txt.lower()):
                v = float(re.search(r"\d+(?:\.\d+)?", w).group())
                if abs(v - float(src)) > 0.01: bad.append((f, w))
        elif f == "purity":
            for p in re.findall(r"\b\d{2}K\b|\b925\b", meta_txt.upper()):
                if p != str(src).upper(): bad.append((f, p))
    return bad

def template_meta(d):
    """Deterministic zero-API metadata from validated fields only (spec-safe)."""
    cat = CAT_LABEL.get(d["category"], "Jewellery")
    metal = d["metal"]; purity = d["purity"]
    wt = f"{d['weightG']:g}"
    stones = d.get("stoneDesc") or d.get("stoneType") or ""
    stone_bit = f" with {stones.lower()}" if stones else ""
    title = f"{d['name']} | {metal} {purity}" if d["name"] else f"{cat.title()} — {metal} {purity}"
    desc = (f"{d['name'] or cat.title()} — {metal} {purity}, {wt} g{stone_bit}, hand-finished by our "
            f"karigars with {float(d.get('mcValue', 12)):g}% making charges. {metal} price follows the live "
            f"Jaipur bullion rate of the day. BIS hallmark & purity assured by Shivaa Jewellers, "
            f"Jayal — Nagaur, Rajasthan.")
    tags = [cat, metal.lower(), purity.lower(), wt + "g"]
    if stones: tags += [stones.lower().split()[0]]
    tags += ["handcrafted", "bishallmarked" if metal == "Gold" else "925silver"]
    extra = [t for t in d.get("tags", []) if t and t not in tags]
    tags = tags[:3] + extra + tags[3:]   # design tags (e.g. mens) before fillers
    return {"title": title, "desc": desc,
            "tags": list(dict.fromkeys(tags))[:8],
            "seo_keywords": [f"{cat.lower()} {metal.lower()} {purity}" if not stones else f"{stones.lower()} {cat.lower()}",
                             f"{metal.lower()} {purity} {cat.lower()} price", "shivaa jewellers " + cat.lower()],
            "alt": f"{metal} {purity} {cat.lower()}{stone_bit} — {title}",
            "category_note": f"{cat} by Shivaa Jewellers"}

def call_llm(cfg, prompt):
    p = cfg["metadata"]["provider"]; key = os.environ.get(cfg["metadata"].get("api_key_env", "OPENAI_API_KEY"))
    if p == "openai":
        from openai import OpenAI
        r = OpenAI(api_key=key).chat.completions.create(
            model=cfg["metadata"].get("model", "gpt-4o-mini"),
            messages=[{"role": "user", "content": prompt}], temperature=0.4)
        return r.choices[0].message.content
    if p == "gemini":
        import google.generativeai as genai
        genai.configure(api_key=key)
        m = genai.GenerativeModel(cfg["metadata"].get("model", "gemini-2.0-flash"))
        return m.generate_content(prompt).text
    if p == "anthropic":
        from anthropic import Anthropic
        r = Anthropic(api_key=key).messages.create(model="claude-3-5-haiku-latest",
            max_tokens=800, messages=[{"role": "user", "content": prompt}])
        return r.content[0].text
    raise RuntimeError(f"provider {p} not available (use openai|gemini|anthropic|craft)")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--config", default="config.json")
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--only", default="")
    ap.add_argument("--provider", default="")
    a = ap.parse_args()
    cfg = load_json(a.config)
    work = Path(cfg["paths"]["work_dir"]); out = Path(cfg["paths"]["out_dir"])
    LOG = setup_logging(work)
    mcfg = cfg["metadata"]
    if a.provider: mcfg["provider"] = a.provider
    designs = load_json(work / "designs.json")
    if a.only: designs = [d for d in designs if d["sku"] in a.only.split(",")]
    if a.limit: designs = designs[:a.limit]
    ledger = Ledger(work / "ledger_meta.csv", ["id", "sku", "status", "ts"])
    manual = {}
    mp = work / "meta_manual.json"
    if mp.exists(): manual = load_json(mp)

    review = []
    for d in designs:
        tgt = out / d["sku"] / "meta.json"
        if ledger.done(d["sku"]) and tgt.exists():
            continue
        try:
            if mcfg["provider"] == "template":
                raw = json.dumps(template_meta(d)); meta = json.loads(raw)
            elif mcfg["provider"] == "craft":
                meta = manual.get(d["sku"])
                if not meta:
                    review.append({**d, "why": "no manual entry"}); continue
                raw = json.dumps(meta)
            else:
                raw = call_llm(mcfg, build_prompt(d, cfg))
                meta = extract_json(raw) or {}
            # check decoded text (never escaped JSON) — "\u2014" style artifacts
            # can otherwise smuggle digits next to ' g'
            bad = check_spec_lock(json.dumps(meta, ensure_ascii=False), d, mcfg["spec_lock"])
            if bad:
                review.append({**d, "why": f"spec-lock violation {bad}"})
                ledger.set(d["sku"], sku=d["sku"], status="review", ts=__import__("time").time())
                continue
            cat = d["category"] or "general"
            rec = {"sku": d["sku"], "name": meta.get("title", d["name"]),
                   "category": d["category"], "metal": d["metal"], "purity": d["purity"],
                   "weightG": d["weightG"], "mcScheme": d.get("mcScheme", "percent"),
                   "mcValue": d.get("mcValue", 12), "stoneValue": d.get("stoneValue", 0),
                   "stoneDesc": d.get("stoneDesc", ""), "stoneType": d.get("stoneType", ""),
                   "stoneColour": d.get("stoneColour", ""),
                   "desc": meta.get("desc", ""), "tags": meta.get("tags", []),
                   "sizes": d.get("sizes", []), "stock": d.get("stock", 10),
                   "barcode": d.get("barcode", ""), "lessWeightG": d.get("lessWeightG", 0),
                   "wastagePct": d.get("wastagePct", 8), "active": True,
                   "supplier": d.get("supplier", ""), "supplierId": d.get("supplierId", ""),
                   "costPerGram": d.get("costPerGram", 0),
                   "seo": {"keywords": meta.get("seo_keywords", []), "alt": meta.get("alt", "")},
                   "category_note": meta.get("category_note", f"{CAT_LABEL.get(cat, cat)} by Shivaa Jewellers"),
                   "mediaNote": "AI-stylised visualisation of the original design photo."}
            save_json(tgt, rec)
            ledger.set(d["sku"], sku=d["sku"], status="done", ts=__import__("time").time())
        except Exception as e:
            LOG.error("meta %s: %s", d["sku"], str(e)[:200])
            ledger.set(d["sku"], sku=d["sku"], status="fail", ts=__import__("time").time())
    save_json(work / "review_queue.json", review)
    print(f"\nMETADATA done — review queue: {len(review)} (see {work/'review_queue.json'})")

if __name__ == "__main__":
    from time import time as _t
    main()
