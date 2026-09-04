#!/usr/bin/env python3
"""STAGE 6 · UPLOAD — media + products to shivaa.in (category-wise, idempotent).

1) PUT each shot/video via POST /api/media (multipart, admin token, needs the v36 patch)
   -> returns /uploads/designs/{category}/{sku}/shot_studio.jpg (auto-sharded by category)
2) POST /api/products with the metadata record + absolute image paths + video path
3) Optional: POST /api/catalogs to attach the source catalogue PDF to the category

SAFE BY DEFAULT: --dry-run prints payloads, uploads nothing. Uses live login, no
stored passwords. Skips designs already uploaded (SKU lookup) -> resumable forever.

Run: python 06_upload.py --email admin@shivaa.in --password '***' [--dry-run] [--limit 5]
"""
import argparse, json, mimetypes, os, sys, time
from pathlib import Path
import urllib.request, urllib.error
from lib_common import setup_logging, load_json, save_json, Ledger, multipart_body, LOG

def api(base, route, method="GET", token=None, json_body=None, files=None, fields=None, timeout=180):
    url = base.rstrip("/") + route
    if files:
        boundary, body = multipart_body(files, fields)
        req = urllib.request.Request(url, data=body, method="POST")
        req.add_header("Content-Type", f"multipart/form-data; boundary={boundary}")
    else:
        data = json.dumps(json_body).encode() if json_body is not None else None
        req = urllib.request.Request(url, data=data, method=method,
                                     headers={"Content-Type": "application/json"} if data else {})
    if token: req.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        try: return e.code, json.loads(e.read().decode())
        except Exception: return e.code, {"error": str(e)}

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--config", default="config.json")
    ap.add_argument("--email", default="")
    ap.add_argument("--password", default="")
    ap.add_argument("--dry-run", action="store_true", default=None, help="force dry-run")
    ap.add_argument("--live", action="store_true", help="override config: actually upload")
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--only", default="")
    ap.add_argument("--media-only", action="store_true")
    ap.add_argument("--catalog", default="", help="attach this PDF as catalogue (repeatable)")
    a = ap.parse_args()
    cfg = load_json(a.config)
    work = Path(cfg["paths"]["work_dir"]); out = Path(cfg["paths"]["out_dir"])
    LOG = setup_logging(work)
    ucfg = cfg["upload"]
    base = ucfg["base_url"]
    dry = False if a.live else (a.dry_run if a.dry_run is not None else ucfg.get("dry_run", True))
    designs = load_json(work / "designs.json")
    if a.only: designs = [d for d in designs if d["sku"] in a.only.split(",")]
    if a.limit: designs = designs[:a.limit]

    LOG.info("login %s …", a.email)
    st, r = api(base, "/api/auth/login", "POST", json_body={"email": a.email, "password": a.password})
    if st != 200 or not r.get("token"):
        LOG.error("login failed (%s): %s", st, r); sys.exit(1)
    tok = r["token"]; LOG.info("logged in as %s", r.get("user", {}).get("name", ""))

    ledger = Ledger(work / "ledger_upload.csv", ["id", "sku", "stage", "status", "location", "ts"])

    for d in designs:
        sku = d["sku"]
        meta_p = out / sku / "meta.json"
        if not meta_p.exists():
            LOG.warning("no meta.json for %s — run stage 5 first", sku); continue
        meta = load_json(meta_p)
        media = {}
        for k in ["studio", "worn", "gift", "editorial"]:
            f = out / sku / f"shot_{k}.jpg"
            if f.exists(): media[k] = str(f)
        vid = out / sku / "video.mp4"
        paths = [*media.values(), str(vid)] if vid.exists() else [*media.values()]

        # 1 · media
        img_paths = []
        cat = meta.get("category") or "general"
        for k, p in media.items():
            key = f"shot_{k}_{sku}"
            loc = f"/uploads/designs/{cat}/{sku}/shot_{k}.jpg"
            if ledger.done(f"{sku}::media::{k}"):
                img_paths.append(loc); continue
            if dry:
                LOG.info("[dry] PUT %s -> media", p); img_paths.append(loc); continue
            st2, r2 = api(base, ucfg["media_route"], "POST", tok, files={"file": p}, fields={"category": cat})
            if st2 in (200, 201) and r2.get("url"):
                img_paths.append(r2["url"])
                ledger.set(f"{sku}::media::{k}", sku=sku, stage="media", status="done", location=r2["url"], ts=time.time())
                LOG.info("media %s -> %s", k, r2["url"])
            else:
                LOG.error("media fail %s: %s", k, r2); ledger.set(f"{sku}::media::{k}", sku=sku, stage="media", status="fail", ts=time.time())
        video_path, video_new = None, False
        if vid.exists():
            if ledger.done(f"{sku}::video"):
                video_path = f"/uploads/videos/{cat}/{sku}/video.mp4"
            elif dry:
                video_path = f"/uploads/videos/{cat}/{sku}/video.mp4"
            else:
                st3, r3 = api(base, ucfg["media_route"], "POST", tok, files={"file": str(vid)}, fields={"category": cat})
                if st3 in (200, 201) and r3.get("url"):
                    video_path, video_new = r3["url"], True
                    ledger.set(f"{sku}::video", sku=sku, stage="media", status="done", location=r3["url"], ts=time.time())
                else:
                    LOG.error("video fail: %s", r3)
        if a.media_only: continue

        # 2 · product record (exact api.php schema)
        rec = {k: meta[k] for k in ["name", "category", "metal", "purity", "weightG", "mcScheme",
                                    "mcValue", "stoneValue", "stoneDesc", "stoneType", "stoneColour",
                                    "desc", "tags", "sizes", "stock", "active", "lessWeightG",
                                    "wastagePct", "barcode", "supplier", "supplierId", "costPerGram",
                                    "seo", "category_note", "mediaNote"] if k in meta}
        rec["sku"] = meta.get("sku") or d["sku"]
        rec["images"] = img_paths or [d.get("img", "")]
        if video_path: rec["video"] = video_path
        prod_done = ledger.get(f"{sku}::product")
        if prod_done and prod_done.get("status") == "done":
            if video_new:
                # re-sync: product was created before the video arrived -> PUT it in
                pid = prod_done.get("location", "")
                st6, r6 = api(base, f"{ucfg['products_route']}/{pid}", "PUT", tok, json_body={"video": video_path})
                LOG.info("resync video on %s -> %s", sku, st6)
            else:
                LOG.info("skip product (done) %s", sku)
            continue
        if dry:
            save_json(work / "payloads" / f"{sku}.json", rec)
            LOG.info("[dry] would POST /api/products %s (%d images%s)", sku, len(img_paths), " + video" if video_path else "")
            continue
        st4, r4 = api(base, ucfg["products_route"], "POST", tok, json_body=rec)
        if st4 == 200 and r4.get("id"):
            ledger.set(f"{sku}::product", sku=sku, stage="product", status="done", location=r4.get("id", ""), ts=time.time())
            LOG.info("product %s -> %s", sku, r4["id"])
        else:
            LOG.error("product fail %s (%s): %s", sku, st4, r4)
        time.sleep(ucfg.get("batch_pause_s", 1.5))

    for c in filter(None, a.catalog):
        name = Path(c).stem.replace("_", " ").replace("-", " ").title()
        st5, r5 = api(base, ucfg["categories_route"], "POST", tok, files={"file": c},
                      fields={"title": name, "category": "General", "featured": "false"})
        LOG.info("catalog %s -> %s %s", c, st5, r5)
    print(f"\nUPLOAD {'(DRY-RUN)' if dry else ''} finished — {work/'ledger_upload.csv'}")

if __name__ == "__main__":
    main()
