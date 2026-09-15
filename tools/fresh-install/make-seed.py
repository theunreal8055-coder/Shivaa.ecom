#!/usr/bin/env python3
"""SHIVAA fresh-install — build the CLEAN-STORE seed (v115-FI).

`cms/data/db.seed.json` is what `install.php` copies to `data/db.json` on a
brand-new host. It is the production catalogue with the *customer* half wiped:

  KEPT (store config + catalogue — the thing that makes it "your" shop)
    settings        store identity, GSTIN/CIN/UDYAM, shipping, premiums, release
    rates.last      last known Jaipur rates so the price engine is never ÷0
    rates.override  an admin's manual override, if any (fresh installs start at 0 history)
    rates.history   trimmed to the newest 12 points (chart has something to draw)
    makingCharges   the 15 category/purity charge rules every quote uses
    products        the 65 PGS rings, exactly as Catalogue Deploy wrote them
    coupons         the 4 live codes
    catalogs        the 17 B2B catalogue entries (PDFs ride in the media pack)
    pages           whatever static pages exist today

  CLEARED (people, money and anything that could be someone's data)
    users, orders, partners, settlements, reviews, product review counters,
    serviceRequests, newsletter, contactMsgs, rateAlerts, tokens, otps,
    loginfails, securityLog, bullion (float), bullionOrders, metalOrders,
    customOrders, returns/refund queues

Nothing is invented: no synthetic customers, no fake reviews, no placeholder
orders. A fresh host therefore opens on a *fully stocked but unsold* shop.

Run: python3 tools/fresh-install/make-seed.py [--check]
  --check  do not write; exit 1 if the committed seed is stale
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
DB = ROOT / "cms/data/db.json"
SEED = ROOT / "cms/data/db.seed.json"

KEEP_LISTS = ("makingCharges", "products", "coupons", "catalogs", "pages")
CLEAR_LISTS = ("users", "orders", "partners", "settlements", "reviews", "serviceRequests",
               "newsletter", "contactMsgs", "rateAlerts", "tokens", "otps", "loginfails",
               "securityLog", "bullionOrders", "metalOrders", "customOrders", "returns",
               "refunds", "kycQueue", "support", "wishlists", "carts")
CLEAR_DICTS = ("bullion",)


def build(db: dict) -> tuple[dict, dict]:
    seed = json.loads(json.dumps(db))      # deep copy, style-neutral
    rep = {"cleared": {}, "kept": {}, "trimmed": {}, "normalised": {}}

    for k in CLEAR_LISTS:
        if k in seed:
            rep["cleared"][k] = len(seed[k]) if isinstance(seed[k], list) else 1
            seed[k] = [] if isinstance(seed[k], list) else {}
    for k in CLEAR_DICTS:
        if k in seed and isinstance(seed[k], dict):
            rep["cleared"][k] = "numbers zeroed, book kept"
            seed[k] = zero_money(seed[k])
            seed[k]["updatedAt"] = None

    for k in KEEP_LISTS:
        if k in seed and isinstance(seed[k], list):
            rep["kept"][k] = len(seed[k])

    # product review counters must agree with the (now empty) reviews list
    n = 0
    for p in seed.get("products", []):
        if isinstance(p, dict) and p.get("reviews"):
            p["reviews"] = 0
            n += 1
    rep["normalised"]["products[].reviews → 0"] = n

    rates = seed.get("rates") or {}
    hist = rates.get("history")
    if isinstance(hist, list) and len(hist) > 12:
        rep["trimmed"]["rates.history"] = {"from": len(hist), "to": 12}
        rates["history"] = hist[-12:]
    elif isinstance(hist, list):
        rep["trimmed"]["rates.history"] = {"from": len(hist), "to": len(hist)}
    rates["override"] = (rates.get("override") if isinstance(rates.get("override"), (int, float, type(None))) else 0)
    seed["rates"] = rates

    # sms/mail state is host-specific, never a seed value
    if "sms" in seed and isinstance(seed["sms"], dict):
        rep["cleared"]["sms"] = "counters zeroed, mode=demo (no gateway is seeded)"
        orig = seed["sms"]
        seed["sms"] = {**{k: zero_money(v) for k, v in orig.items()},
                       "lastErr": "", "provider": "", "mode": "demo"}
        if not isinstance(seed["sms"].get("reset"), (dict, list)):
            seed["sms"]["reset"] = orig.get("reset", "")

    seed["_install"] = {
        "seedFrom": "cms/data/db.json @ v115 tip",
        "builtBy": "tools/fresh-install/make-seed.py",
        "note": ("Clean-store seed: real catalogue + store config, zero customers, "
                 "orders, reviews or partner money. install.php copies this to data/db.json "
                 "and creates the first admin account."),
    }
    return seed, rep


def zero_money(v):
    """Zero every number, keep every string and the whole dict/list SHAPE.

    `bullion.cash` is a price BOOK (rows of {label, purity, buy, sell}), not a
    scalar — collapsing it to 0 would break the Bullion Desk on a fresh host.
    So a clean install keeps the jeweller's configured instruments and zeroes
    only the money, plus the previous tick (deltas then read "— steady")."""
    if isinstance(v, bool):
        return False
    if isinstance(v, (int, float)):
        return 0
    if isinstance(v, dict):
        return {k: zero_money(x) for k, x in v.items()}
    if isinstance(v, list):
        return [zero_money(x) for x in v]
    return v


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true")
    a = ap.parse_args()
    db = json.loads(DB.read_text(encoding="utf-8"))
    seed, rep = build(db)
    blob = json.dumps(seed, indent=1, ensure_ascii=False) + "\n"   # same style as db.json

    if a.check:
        cur = SEED.read_text(encoding="utf-8") if SEED.exists() else ""
        stale = cur.strip() != blob.strip()
        print(("SEED STALE — re-run make-seed.py" if stale else "SEED UP TO DATE")
              + f" · {len(seed.get('products', []))} products · {len(blob) / 1024:.0f} KB")
        return 1 if stale else 0

    SEED.write_text(blob, encoding="utf-8")
    print(f"wrote {SEED.relative_to(ROOT)}  ({len(blob) / 1024:.0f} KB)")
    print(f"  products kept      : {len(seed['products'])} "
          f"({seed['products'][0]['sku']}…{seed['products'][-1]['sku']})")
    print(f"  lists kept         : " + ", ".join(f"{k}={v}" for k, v in rep["kept"].items()))
    print(f"  lists cleared       : " + ", ".join(f"{k}({v})" for k, v in rep["cleared"].items() if v not in (0, {}, [])))
    print(f"  trimmed            : {rep['trimmed']}")
    print(f"  normalised         : {rep['normalised']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
