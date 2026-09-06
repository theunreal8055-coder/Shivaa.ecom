#!/usr/bin/env python3
"""STAGE 7 · BULK — headless, parallel, resumable catalogue production at scale.

WHY THIS EXISTS
---------------
The agent can generate at most 10 images per message. At 4 images per design,
400,000 designs = 1,600,000 images = 160,000 messages. That is not achievable by
an agent, ever. Scale requires a *script* that calls an image API in parallel and
runs unattended for days. This is that script.

It does the whole chain per design, in parallel, with a resumable ledger:

    shoot 4 photos -> normalise the catalogue plate -> stamp logo
    -> write title/description/specs -> upload product + media to the site

USAGE
-----
    export PHOTOSHOOT_API_KEY=...          # image generation
    export SHIVAA_ADMIN_PASSWORD=...       # site login
    python3 pipeline/07_bulk.py --designs demo65/work/designs.json \
        --media demo65/media --workers 16 --limit 1000

    python3 pipeline/07_bulk.py ... --dry-run     # build payloads, upload nothing
    python3 pipeline/07_bulk.py ... --resume      # skip everything already done

Every stage is idempotent and ledgered, so a crash at design 380,000 costs
nothing: rerun with --resume.
"""
from __future__ import annotations
import argparse, base64, json, os, queue, sys, threading, time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib import request as urlreq, error as urlerr

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "demo65" / "tools"))

LOCK = threading.Lock()


# ───────────────────────────── ledger ─────────────────────────────
class Ledger:
    """Append-only JSONL: one line per design per stage. Crash-safe, resumable."""

    def __init__(self, path: Path):
        self.path = path
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.done: dict[str, set[str]] = {}
        if path.exists():
            for line in path.read_text().splitlines():
                try:
                    r = json.loads(line)
                except Exception:
                    continue
                if r.get("ok"):
                    self.done.setdefault(r["sku"], set()).add(r["stage"])

    def has(self, sku: str, stage: str) -> bool:
        return stage in self.done.get(sku, ())

    def mark(self, sku: str, stage: str, ok: bool, note: str = "") -> None:
        with LOCK:
            with self.path.open("a") as fh:
                fh.write(json.dumps({"sku": sku, "stage": stage, "ok": ok,
                                     "note": note[:300], "ts": time.time()}) + "\n")
            if ok:
                self.done.setdefault(sku, set()).add(stage)


# ─────────────────────────── copywriting ───────────────────────────
BRAND = ("Shivaa Jewellers — Sadar Bazaar, Jayal, Nagaur, Rajasthan. "
         "BIS hallmarked, hand-finished by our karigars.")


def build_copy(d: dict) -> dict:
    """Title, description and specs — derived ONLY from verified ground truth.

    Never invents weight, purity or price. Anything unknown is simply omitted.
    """
    sku = d["sku"]
    metal, purity = d.get("metal", ""), d.get("purity", "")
    wt = d.get("weightG")
    base = d.get("name") or f"{metal} {d.get('category','Jewellery').title()} {sku}"
    title = base if purity in base else f"{base} | {metal} {purity}".strip(" |")

    bits = [f"{metal} {purity}".strip()]
    if wt:
        bits.append(f"{wt} g")
    stone = (d.get("stoneDesc") or "").strip()
    if stone:
        bits.append(stone)
    mc = d.get("mcValue")
    mc_txt = (f"{mc}% making charges" if d.get("mcScheme") == "percent" and mc
              else (f"₹{mc}/g making charges" if mc else ""))
    if mc_txt:
        bits.append(mc_txt)

    desc = (f"{base} — " + ", ".join(b for b in bits if b) + ". "
            "Gold price follows the live Jaipur bullion rate of the day. "
            f"{BRAND}")

    tags = list(dict.fromkeys(
        [t.lower() for t in d.get("tags", [])] +
        [d.get("category", ""), metal.lower(), purity.lower(), "mens",
         "bishallmarked", "handcrafted"]))
    return {"name": title, "desc": desc, "tags": [t for t in tags if t],
            "shortDesc": ", ".join(b for b in bits if b)}


# ──────────────────────────── image API ────────────────────────────
def gen_image(prompt: str, ref: Path, out: Path, api_key: str,
              endpoint: str, timeout: int = 180) -> None:
    """POST prompt+reference to the configured image endpoint, save the result.

    Deliberately provider-agnostic: point IMAGE_API_URL at whatever service you
    buy. Expects JSON {"image_base64": "..."} or {"url": "..."}.
    """
    payload = {
        "prompt": prompt,
        "image": base64.b64encode(ref.read_bytes()).decode(),
        "size": "1024x1024",
    }
    req = urlreq.Request(endpoint, data=json.dumps(payload).encode(),
                         headers={"Content-Type": "application/json",
                                  "Authorization": f"Bearer {api_key}"})
    with urlreq.urlopen(req, timeout=timeout) as r:
        body = json.loads(r.read())
    out.parent.mkdir(parents=True, exist_ok=True)
    if body.get("image_base64"):
        out.write_bytes(base64.b64decode(body["image_base64"]))
    elif body.get("url"):
        with urlreq.urlopen(body["url"], timeout=timeout) as im:
            out.write_bytes(im.read())
    else:
        raise RuntimeError(f"no image in response: {str(body)[:200]}")


# ───────────────────────────── uploading ─────────────────────────────
class Site:
    def __init__(self, base: str, email: str, password: str, dry: bool):
        self.base, self.dry = base.rstrip("/"), dry
        self.token = ""
        if not dry:
            self.token = self._login(email, password)

    def _login(self, email: str, password: str) -> str:
        req = urlreq.Request(f"{self.base}/api/auth/login",
                             data=json.dumps({"email": email, "password": password}).encode(),
                             headers={"Content-Type": "application/json"})
        with urlreq.urlopen(req, timeout=60) as r:
            return json.loads(r.read()).get("token", "")

    def _post(self, path: str, obj: dict) -> dict:
        req = urlreq.Request(f"{self.base}{path}", data=json.dumps(obj).encode(),
                             headers={"Content-Type": "application/json",
                                      "Authorization": f"Bearer {self.token}"})
        with urlreq.urlopen(req, timeout=120) as r:
            return json.loads(r.read())

    def upload_media(self, f: Path) -> str:
        """multipart POST /api/media -> public url"""
        if self.dry:
            return f"/uploads/designs/{f.parent.name}_{f.name}"
        boundary = "----shivaa" + os.urandom(8).hex()
        body = (f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; "
                f"filename=\"{f.name}\"\r\nContent-Type: image/jpeg\r\n\r\n"
                ).encode() + f.read_bytes() + f"\r\n--{boundary}--\r\n".encode()
        req = urlreq.Request(f"{self.base}/api/media", data=body,
                             headers={"Content-Type": f"multipart/form-data; boundary={boundary}",
                                      "Authorization": f"Bearer {self.token}"})
        with urlreq.urlopen(req, timeout=300) as r:
            return json.loads(r.read())["url"]

    def upsert(self, product: dict) -> dict:
        if self.dry:
            return {"dry_run": True, "sku": product["sku"]}
        return self._post("/api/products", product)


# ──────────────────────────── per-design ────────────────────────────
def process(d: dict, cfg: dict, media: Path, site: Site, led: Ledger,
            api_key: str, endpoint: str, dry: bool) -> tuple[str, bool, str]:
    sku = d["sku"]
    try:
        outdir = media / sku
        ref = ROOT / cfg["_designs_dir"] / f"{sku}.jpg"
        shots = cfg["photoshoot"]["shots"]

        # 1 ─ photoshoot
        if not led.has(sku, "shots"):
            missing = [s for s in shots
                       if not (outdir / f"shot_{s['key']}.jpg").exists()]
            if missing and not api_key:
                raise RuntimeError(
                    f"PHOTOSHOOT_API_KEY not set — {len(missing)} shot(s) missing "
                    f"for {sku}: {[s['key'] for s in missing]}")
            for s in missing:
                gen_image(s["prompt"], ref, outdir / f"shot_{s['key']}.jpg",
                          api_key, endpoint)
            led.mark(sku, "shots", True)

        # 2 ─ normalise the standardised catalogue plate
        if not led.has(sku, "plate"):
            front = outdir / "shot_front.jpg"
            if front.exists():
                from normalize_plate import normalise
                normalise(front, front)
            led.mark(sku, "plate", True)

        # 3 ─ brand mark
        if not led.has(sku, "brand"):
            from brand_logo import stamp_file
            for s in shots:
                f = outdir / f"shot_{s['key']}.jpg"
                if f.exists():
                    stamp_file(f)
            led.mark(sku, "brand", True)

        # 4 ─ copy + payload
        copy = build_copy(d)
        urls = []
        for s in shots:
            f = outdir / f"shot_{s['key']}.jpg"
            if f.exists():
                urls.append(site.upload_media(f))
        product = {
            "sku": sku, "name": copy["name"], "desc": copy["desc"],
            "category": d.get("category", "rings"), "metal": d.get("metal", ""),
            "purity": d.get("purity", ""), "weightG": d.get("weightG"),
            "mcScheme": d.get("mcScheme", "percent"), "mcValue": d.get("mcValue"),
            "stoneValue": d.get("stoneValue", 0), "stoneDesc": d.get("stoneDesc", ""),
            "sizes": d.get("sizes", []), "tags": copy["tags"],
            "images": urls, "active": True,
        }
        (outdir / "payload.json").write_text(json.dumps(product, indent=1))

        # 5 ─ upsert
        if not led.has(sku, "upload"):
            site.upsert(product)
            led.mark(sku, "upload", True)
        return sku, True, f"{len(urls)} images"
    except Exception as e:
        led.mark(sku, "error", False, str(e))
        return sku, False, str(e)[:200]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--designs", default="demo65/work/designs.json")
    ap.add_argument("--config", default="demo65/config.json")
    ap.add_argument("--media", default="demo65/media")
    ap.add_argument("--designs-dir", default="demo65/media/designs")
    ap.add_argument("--ledger", default="demo65/work/bulk_ledger.jsonl")
    ap.add_argument("--workers", type=int, default=8)
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--only", default="")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()

    cfg = json.loads((ROOT / a.config).read_text())
    cfg["_designs_dir"] = a.designs_dir
    designs = json.loads((ROOT / a.designs).read_text())
    if a.only:
        keep = set(a.only.split(","))
        designs = [d for d in designs if d["sku"] in keep]
    if a.limit:
        designs = designs[:a.limit]

    led = Ledger(ROOT / a.ledger)
    up = cfg.get("upload", {})
    site = Site(up.get("base_url", ""), up.get("admin_email", "admin@shivaa.in"),
                os.environ.get("SHIVAA_ADMIN_PASSWORD", ""),
                a.dry_run or up.get("dry_run", True))

    api_key = os.environ.get("PHOTOSHOOT_API_KEY", "")
    endpoint = os.environ.get("IMAGE_API_URL", "")

    t0 = time.time()
    ok = fail = 0
    with ThreadPoolExecutor(max_workers=a.workers) as ex:
        futs = [ex.submit(process, d, cfg, ROOT / a.media, site, led,
                          api_key, endpoint, a.dry_run) for d in designs]
        for i, f in enumerate(as_completed(futs), 1):
            sku, good, note = f.result()
            ok, fail = ok + good, fail + (not good)
            if i % 25 == 0 or not good:
                rate = i / max(0.001, time.time() - t0)
                print(f"[{i}/{len(designs)}] {sku} {'OK' if good else 'FAIL ' + note} "
                      f"· {rate*3600:.0f}/h · ok={ok} fail={fail}", flush=True)

    dt = time.time() - t0
    print(f"\nBULK done — {ok} ok, {fail} failed in {dt/60:.1f} min "
          f"({ok/max(dt,1)*3600:.0f} designs/hour)")
    if fail:
        print(f"Re-run the same command to retry only the failures (ledger: {a.ledger})")


if __name__ == "__main__":
    main()
