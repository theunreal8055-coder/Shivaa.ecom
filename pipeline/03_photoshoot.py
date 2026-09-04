#!/usr/bin/env python3
"""STAGE 3 · PHOTOSHOOT — one design photo -> 4 AI photoshoot images (design-preserving img2img).

Provider adapters (add more in GENERATORS):
  replicate : black-forest-labs/flux-dev image-to-image (API token in env)
  fal       : fal.ai flux/dev image-to-image
  openai    : gpt-image-1 edit (API key in env)

Output: out/{sku}/shot_<key>.jpg  +  work/ledger_shots.csv  +  work/costs.csv
Run: python 03_photoshoot.py --limit 20 [--only SKU] [--workers 4] [--shot studio,worn]
"""
import argparse, base64, io, json, os, time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from lib_common import setup_logging, load_json, save_json, Ledger, Retry, RateLimit, LOG

GENERATORS = {}

def register(name):
    def deco(fn): GENERATORS[name] = fn; return fn
    return deco

@register("replicate")
def gen_replicate(api_key, prompt, src, size, strength, model):
    import replicate  # pip install replicate
    client = replicate.Client(api_token=api_key)
    b64 = base64.b64encode(Path(src).read_bytes()).decode()
    out = client.run(model, input={"prompt": prompt, "image": f"data:image/jpeg;base64,{b64}",
                                   "image_strength": strength, "aspect_ratio": size, "num_outputs": 1})
    for item in out:
        if isinstance(item, dict) and "read" in item: return item["read"]
        return item
    raise RuntimeError("no output")

@register("fal")
def gen_fal(api_key, prompt, src, size, strength, model):
    import fal_client  # pip install fal-client
    b64 = base64.b64encode(Path(src).read_bytes()).decode()
    handler = fal_client.submit(model, arguments={"prompt": prompt,
        "image_url": f"data:image/jpeg;base64,{b64}", "strength": strength}, with_logs=False)
    res = handler.result()
    return res["images"][0]["url"]

@register("openai")
def gen_openai(api_key, prompt, src, size, strength, model):
    from openai import OpenAI  # pip install openai
    c = OpenAI(api_key=api_key)
    r = c.images.edit(model=model, image=Path(src), prompt=prompt, size=size, n=1)
    return r.data[0].url

def fetch_bytes(url_or_path, out_path: Path):
    if str(url_or_path).startswith("http"):
        import urllib.request
        req = urllib.request.Request(url_or_path, headers={"User-Agent": "shivaa-pipe"})
        with urllib.request.urlopen(req, timeout=120) as r, open(out_path, "wb") as f:
            f.write(r.read())
    else:
        out_path.write_bytes(Path(url_or_path).read_bytes())

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--config", default="config.json")
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--only", default="", help="comma SKUs")
    ap.add_argument("--workers", type=int, default=0)
    ap.add_argument("--shot", default="", help="comma shot keys, default all")
    a = ap.parse_args()
    cfg = load_json(a.config)
    work = Path(cfg["paths"]["work_dir"]); out = Path(cfg["paths"]["out_dir"])
    LOG = setup_logging(work)
    pcfg = cfg["photoshoot"]
    key = os.environ.get(pcfg.get("api_key_env", "REPLICATE_API_TOKEN"), "")
    if not key:
        LOG.error("Set %s env var (or put key in config)", pcfg.get("api_key_env")); sys.exit(1)
    gen = GENERATORS[pcfg["provider"]]; model = pcfg.get("model_image", "")
    shots = [s for s in pcfg["shots"] if not a.shot or s["key"] in a.shot.split(",")]
    designs = load_json(work / "designs.json")
    if a.only: designs = [d for d in designs if d["sku"] in a.only.split(",")]
    if a.limit: designs = designs[:a.limit]
    ledger = Ledger(work / "ledger_shots.csv", ["id", "sku", "shot", "status", "cost", "stdout", "ts"])
    rl = RateLimit(per_min=pcfg.get("per_min", 60))
    retry = Retry(pcfg.get("retries", 3))
    costs = []

    def job(d, shot):
        rid = f"{d['sku']}::{shot['key']}"
        if ledger.done(rid): return rid, "skip", None
        src = d.get("img_path") or d.get("img")
        if not src or not Path(src).exists():
            return rid, "no-source", None
        target = out / d["sku"] / f"shot_{shot['key']}.jpg"
        target.parent.mkdir(parents=True, exist_ok=True)
        if target.exists() and target.stat().st_size > 10000:
            ledger.set(rid, sku=d["sku"], shot=shot["key"], status="done", cost=0, ts=time.time())
            return rid, "exists", str(target)
        try:
            rl.wait()
            t0 = time.time()
            url, _ = retry(gen, key, shot["prompt"], src, pcfg.get("size", "1024x1024"),
                           pcfg.get("img2img_strength", 0.55), model)
            fetch_bytes(url, target)
            # shrink to 1500px max, re-encode (site-friendly weight)
            from PIL import Image
            im = Image.open(target).convert("RGB"); im.thumbnail((1500, 1500))
            im.save(target, quality=88)
            cost = pcfg.get("cost_per_shot", 0.15)
            ledger.set(rid, sku=d["sku"], shot=shot["key"], status="done", cost=cost, ts=time.time())
            costs.append({"sku": d["sku"], "shot": shot["key"], "cost_usd": cost, "secs": round(time.time() - t0, 1)})
            return rid, "ok", str(target)
        except Exception as e:
            ledger.set(rid, sku=d["sku"], shot=shot["key"], status="fail", cost=0, ts=time.time(), stdout=str(e)[:300])
            return rid, "fail", str(e)[:160]

    with ThreadPoolExecutor(max_workers=a.workers or pcfg.get("workers", 4)) as ex:
        futs = [ex.submit(job, d, s) for d in designs for s in shots]
        for i, fu in enumerate(as_completed(futs), 1):
            rid, st, extra = fu.result()
            LOG.info("[%d/%d] %s %s", i, len(futs), st.upper().ljust(9), rid)
    if costs: save_json(work / "costs_shots.json", costs)
    print(f"\nSHOTS done — check {work/'ledger_shots.csv'}")

if __name__ == "__main__":
    import sys
    main()
