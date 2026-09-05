#!/usr/bin/env python3
"""DEV-ONLY read-only preview server for the Shivaa cms (NO PHP in sandbox).

Serves cms/ static files (with HTTP Range for <video>) + a READ-ONLY subset of
/api/* mirroring api.php response shapes (settings, rates, products,
products/{id}, catalogs, making-charges, pages). All writes -> 405.
NOT a replacement for api.php; never deploy. Verified shapes against api.php
v37 (compute_price / current_rates ported 1:1).

Run: python3 qa/preview_shim.py [--port 8090]
"""
import argparse, json, re, threading
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlparse, parse_qs

ROOT = Path(__file__).resolve().parent.parent / "cms"
DB_FILE = ROOT / "data" / "db.json"
_lock = threading.Lock()

PURITY_KEY = {"24K": "gold24", "22K": "gold22", "18K": "gold18"}

def db():
    with _lock:
        return json.load(open(DB_FILE, encoding="utf-8"))

def current_rates(d):
    ov = d["rates"].get("override")
    if ov:
        return {"gold24": int(ov["gold24"]), "gold22": int(ov["gold22"]),
                "gold18": int(ov["gold18"]), "silver": float(ov["silver"])}
    l = d["rates"]["last"]
    gp = int(d["settings"].get("jaipurPremium", 55))
    sp = float(d["settings"].get("jaipurSilverPremium", 3))
    return {"gold24": int(l["gold24"]) + gp, "gold22": int(l["gold22"]) + gp,
            "gold18": int(l["gold18"]) + round(gp * 0.75),
            "silver": round(float(l["silver"]) + sp, 1)}

def compute_price(p, R):
    key = "silver" if p["metal"] == "Silver" else PURITY_KEY.get(p["purity"], "gold22")
    rate = float(R[key])
    metal = int(round(rate * float(p["weightG"])))
    if p.get("mcScheme") == "percent":
        mc = int(round(metal * float(p.get("mcValue", 0)) / 100))
    elif p.get("mcScheme") == "perGram":
        mc = int(round(float(p.get("mcValue", 0)) * float(p["weightG"])))
    else:
        mc = int(round(float(p.get("mcValue", 0))))
    stone = int(round(float(p.get("stoneValue", 0))))
    sub = metal + mc + stone
    gst = int(round(sub * 0.03))
    return {"ratePerGram": round(rate, 2), "metalValue": metal, "makingCharge": mc,
            "stoneValue": stone, "subtotal": sub, "gst": gst, "total": sub + gst}

def priced(d, p):
    y = dict(p)
    y.setdefault("lessWeightG", 0)
    y.setdefault("wastagePct", 8)
    y["price"] = compute_price(p, current_rates(d))
    return y

class Handler(SimpleHTTPRequestHandler):
    server_version = "ShivaaPreviewShim/1.0"

    def translate_path(self, path):
        return str(ROOT / urlparse(path).path.lstrip("/"))

    def log_message(self, fmt, *args):
        pass

    def _json(self, code, obj):
        body = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("X-Shivaa-Preview", "read-only-shim")
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self, *a):  self._json(405, {"error": "Preview shim is read-only"})
    def do_PUT(self, *a):   self._json(405, {"error": "Preview shim is read-only"})
    def do_DELETE(self, *a):self._json(405, {"error": "Preview shim is read-only"})

    def _serve_static(self):
        import mimetypes, shutil
        p = Path(self.translate_path(self.path))
        if p.is_dir():
            p = p / "index.html"
        if not p.is_file() or not str(p).startswith(str(ROOT)):
            self.send_error(404)
            return
        size = p.stat().st_size
        ctype = mimetypes.guess_type(str(p))[0] or "application/octet-stream"
        rng = self.headers.get("Range")
        start, end = 0, size - 1
        code = 200
        if rng:
            m = re.match(r"bytes=(\d*)-(\d*)", rng)
            if m and (m.group(1) or m.group(2)):
                if m.group(1):
                    start = int(m.group(1))
                    if m.group(2): end = min(int(m.group(2)), size - 1)
                else:
                    start = size - int(m.group(2))
                if 0 <= start <= end < size:
                    code = 206
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Content-Length", str(end - start + 1))
        if code == 206:
            self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        self.send_header("X-Shivaa-Preview", "read-only-shim")
        self.end_headers()
        with open(p, "rb") as f:
            f.seek(start)
            shutil.copyfileobj(f, self.wfile, length=end - start + 1)

    def do_GET(self):
        u = urlparse(self.path)
        route = u.path[len("/api/"):] if u.path.startswith("/api/") else None
        if route is None:
            if u.path in ("/", ""):
                self.path = "/index.html"
            return self._serve_static()
        q = parse_qs(u.query)
        d = db()
        if route == "settings":
            return self._json(200, d["settings"])
        if route == "rates":
            last = d["rates"]["last"]
            return self._json(200, {**last,
                "spot": {k: last[k] for k in ("gold24", "gold22", "gold18", "silver")},
                "jaipur": current_rates(d),
                "premium": {"gold": int(d["settings"].get("jaipurPremium", 55)),
                            "silver": float(d["settings"].get("jaipurSilverPremium", 3))},
                "override": d["rates"].get("override"),
                "history": d["rates"].get("history", [])[-120:],
                "nextUpdateIn": 60})
        if route == "making-charges":
            return self._json(200, {"table": d["makingCharges"], "gst": 3})
        if route == "products":
            lst = [x for x in d["products"] if x.get("active")]
            if q.get("category"): lst = [x for x in lst if x["category"] == q["category"][0]]
            if q.get("metal"):    lst = [x for x in lst if x["metal"] == q["metal"][0]]
            if q.get("tag"):      lst = [x for x in lst if q["tag"][0] in x.get("tags", [])]
            if q.get("q"):
                s = q["q"][0].lower()
                lst = [x for x in lst if s in " ".join([x["name"], x["category"],
                       x.get("desc", ""), " ".join(x.get("tags", []))]).lower()]
            return self._json(200, {"products": [priced(d, x) for x in lst],
                                    "rates": current_rates(d)})
        m = re.match(r"^products/([\w-]+)$", route)
        if m:
            pid = m.group(1)
            hit = next((x for x in d["products"] if x.get("id") == pid), None)
            if not hit:
                return self._json(404, {"error": "Not found"})
            sim = [priced(d, x) for x in d["products"]
                   if x["category"] == hit["category"] and x.get("id") != pid
                   and x.get("active")][:4]
            rev = [r for r in d.get("reviews", []) if r.get("productId") == pid]
            return self._json(200, {"product": priced(d, hit), "rates": current_rates(d),
                                    "similar": sim, "reviews": rev})
        if route == "catalogs":
            return self._json(200, {"catalogs": [], "gated": True})
        if route == "pages":
            return self._json(200, {"pages": d.get("pages", [])})
        if route in ("auth/me", "wishlist", "orders", "bullion", "sms/status"):
            return self._json(401, {"error": "Unauthorized"})
        return self._json(404, {"error": f"Unknown API GET /{route}"})

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=8090)
    a = ap.parse_args()
    srv = ThreadingHTTPServer(("0.0.0.0", a.port), Handler)
    print(f"Shivaa preview shim (READ-ONLY) on 0.0.0.0:{a.port} — cms={ROOT}")
    srv.serve_forever()
