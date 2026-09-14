#!/usr/bin/env python3
"""DEV-ONLY read-only preview server for the Shivaa cms (NO PHP in sandbox).

Serves cms/ static files (with HTTP Range for <video>) + a READ-ONLY subset of
/api/* mirroring api.php response shapes (settings, rates, products,
products/{id}, catalogs, making-charges, pages, trust, hallmark/status,
bullion, auth/me, wishlist, orders, coupons, catalogues).

v105 adds an IN-MEMORY dev layer so the new UI flows can be exercised without
PHP: auth/send-otp, auth/otp-login, auth/register, auth/login, kyc/* and a few
no-op POSTs. OTP codes come back in the JSON (like api.php's demo mode).
Nothing is ever written to db.json; catalogue writes still return 405.
Seeded accounts accept the preview password "shivaa123".
NOT a replacement for api.php; never deploy. Verified shapes against api.php
v37 (compute_price / current_rates ported 1:1).

Run: python3 qa/preview_shim.py [--port 8090]
"""
import argparse, json, re, secrets, threading, time
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlparse, parse_qs

ROOT = Path(__file__).resolve().parent.parent / "cms"
DB_FILE = ROOT / "data" / "db.json"
_lock = threading.Lock()

PURITY_KEY = {"24K": "gold24", "22K": "gold22", "18K": "gold18"}

# in-memory admin edits (PUT /api/settings) — applied on read, never written to
# db.json, so the Admin panel can be previewed without touching real data.
DEV_SETTINGS = {}


def db():
    with _lock:
        d = json.load(open(DB_FILE, encoding="utf-8"))
    if DEV_SETTINGS:
        d.setdefault("settings", {}).update(DEV_SETTINGS)
    return d

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


# ── v105 · trust profile (mirror of cms/trust.php) ────────────────────────
GSTIN_SHAPE = re.compile(r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$")
GSTIN_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"

def trust_gstin(value):
    """Shape + mod-36 checksum, exactly like trust_gstin() in trust.php."""
    if not isinstance(value, str):
        return None
    g = value.strip().upper()
    if not GSTIN_SHAPE.match(g):
        return None
    total = 0
    for i in range(14):
        n = GSTIN_CHARS.index(g[i]) * (1 if i % 2 == 0 else 2)
        total += n // 36 + n % 36
    return g if g[14] == GSTIN_CHARS[(36 - total % 36) % 36] else None

def trust_profile(d):
    st = d.get("settings") if isinstance(d.get("settings"), dict) else {}
    def ident(value, pattern):
        if not isinstance(value, str):
            return None
        v = value.strip()
        return v if re.fullmatch(pattern, v) else None
    address = st.get("address")
    if not (isinstance(address, str) and address.strip() and len(address) <= 500
            and not re.search(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", address)):
        address = None
    return {"schemaVersion": 1, "source": "store_settings",
            "business": {"cin": ident(st.get("cin"), r"[LU][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}"),
                         "udyam": ident(st.get("udyam"), r"UDYAM-[A-Z]{2}-[0-9]{2}-[0-9]{7}"),
                         "address": address},
            "gstin": trust_gstin(st.get("gstin")),
            "certificates": [],
            "registryVerification": {"performed": False, "checkedAt": None}}


# ── v105 · in-memory dev auth (never persisted, never in db.json) ─────────
OTP_DIGITS = 4          # v106 — must match const OTP_DIGITS in cms/api.php

# Response shapes mirror api.php exactly (demoMode/devCode, 400/404/409/429,
# pub_user fields) so the SPA branches the same way it does against PHP.
DEV = {"otps": [], "tokens": {}, "users": [], "wishlist": {}, "orders": {},
       "partners": {}, "by_partner": {}, "reviews": []}
PREVIEW_PASSWORD = "shivaa123"          # bcrypt is unavailable in the sandbox
GST_STATES = {"08": "Rajasthan", "27": "Maharashtra", "29": "Karnataka", "24": "Gujarat",
              "07": "Delhi", "09": "UP", "33": "Tamil Nadu", "36": "Telangana",
              "19": "West Bengal", "23": "Madhya Pradesh", "32": "Kerala", "06": "Haryana",
              "03": "Punjab", "05": "Uttarakhand", "30": "Goa", "37": "Andhra Pradesh"}


def gstin_check(g):
    """Port of gstin_check() in api.php — shape, state code, mod-36 checksum."""
    g = str(g or "").strip().upper()
    if not GSTIN_SHAPE.match(g):
        return {"valid": False, "reason": "Format must be 15 chars, e.g. 08AABCU9603R1ZM"}
    state = GST_STATES.get(g[:2])
    if not state:
        return {"valid": False, "reason": "Unknown state code"}
    total = 0
    for i in range(14):
        if g[i] not in GSTIN_CHARS:
            return {"valid": False, "reason": "Illegal character"}
        n = GSTIN_CHARS.index(g[i]) * (1 if i % 2 == 0 else 2)
        total += n // 36 + n % 36
    if g[14] != GSTIN_CHARS[(36 - total % 36) % 36]:
        return {"valid": False, "reason": "Checksum failed — please retype the GSTIN"}
    return {"valid": True, "state": state, "pan": g[2:12]}


def bullion_rows(d):
    """Port of bullion_rows() in api.php (partner metal desk)."""
    b = d.get("bullion") or {}
    cash = dict(b.get("cash") or {})
    prev = b.get("prev") or {}
    r = d["rates"]["last"]
    gp = int(d["settings"].get("bullionGoldPremium", 10))
    sp = int(d["settings"].get("bullionSilverPremium", 2))
    fine, sil = float(r["gold24"]), float(r["silver"])
    rows = [
        {"key": "tdsGold995", "label": "TDS GOLD", "purity": "995 (99.50%)", "mode": "RTGS",
         "buy": round(fine * 0.995 + gp - 2), "sell": round(fine * 0.995 + gp + 2)},
        {"key": "silverChorsa", "label": "SILVER CHORSA", "purity": "98.00%", "mode": "RTGS",
         "buy": round(sil * 0.98), "sell": round(sil * 0.98 + 2)},
        {"key": "silverPeti", "label": "SILVER BANK PETI", "purity": "999 fine (99.9%)", "mode": "RTGS",
         "buy": round(sil * 0.999 + sp - 1), "sell": round(sil * 0.999 + sp + 1)},
        {"key": "silverPetiBulk", "label": "SILVER PETI — BULK", "purity": "999 fine (99.9%)", "mode": "RTGS",
         "buy": round(sil * 0.999 + sp * 0.6 - 1), "sell": round(sil * 0.999 + sp * 0.6 + 1)},
    ]
    cash_defs = {"goldImport995": fine * 0.995, "goldIndian": fine * 0.995 + 15, "goldRef9930": fine * 0.993}
    for k, c in cash.items():
        buy = c.get("buy") or round(cash_defs.get(k, 0))
        sell = c.get("sell") or round(cash_defs.get(k, 0) + 40)
        rows.append({"key": k, "label": c.get("label"), "purity": c.get("purity"), "mode": "CASH",
                     "buy": int(buy), "sell": int(sell),
                     "change": int(buy) - int((prev.get(k) or {}).get("buy", buy)), "editable": True})
    hist = d["rates"].get("history") or []
    if len(hist) > 1:
        y = hist[-2]
        chg = {"tdsGold995": round((r["gold24"] - y["gold24"]) * 0.995),
               "silverChorsa": round((r["silver"] - y["silver"]) * 0.98),
               "silverPeti": round((r["silver"] - y["silver"]) * 0.999),
               "silverPetiBulk": round((r["silver"] - y["silver"]) * 0.999)}
        for row in rows:
            if row["key"] in chg:
                row["change"] = chg[row["key"]]
    for row in rows:
        row.setdefault("change", 0)
    return {"rows": rows, "updatedAt": b.get("updatedAt"),
            "date": time.strftime("%d %b %Y", time.gmtime())}


def dev_phone10(v):
    return re.sub(r"\D", "", str(v or ""))[-10:]


def dev_valid_phone(v):
    return bool(re.fullmatch(r"[6-9]\d{9}", dev_phone10(v)))


def dev_all_users():
    return db().get("users", []) + DEV["users"]


def dev_pub_user(u):
    return {"id": u.get("id"), "name": u.get("name"), "email": u.get("email"),
            "phone": u.get("phone", ""), "role": u.get("role", "customer"),
            "loyaltyPoints": u.get("loyaltyPoints", 0), "partnerId": u.get("partnerId"),
            "createdAt": u.get("createdAt", ""), "profile": u.get("profile", []),
            "addresses": u.get("addresses", [])}


def dev_issue(u):
    tok = secrets.token_hex(24)
    DEV["tokens"][tok] = u["id"]
    return tok


def dev_token(handler):
    auth = handler.headers.get("Authorization") or ""
    tok = auth[7:].strip() if auth.lower().startswith("bearer ") else ""
    if not tok:
        tok = parse_qs(urlparse(handler.path).query).get("token", [""])[0]
    uid = DEV["tokens"].get(tok)
    return next((u for u in dev_all_users() if u.get("id") == uid), None) if uid else None


def dev_send_otp(phone):
    """Mirrors the send-otp guards: 30 s cooldown, 5-minute expiry, 5 tries."""
    now = int(time.time())
    for o in DEV["otps"]:
        if o["phone"] == phone and now - o["at"] < 30:
            return 429, {"error": "Wait 30 seconds between OTP requests"}
    code = "".join(secrets.choice("0123456789") for _ in range(OTP_DIGITS))   # v106 — 4-digit codes, mirroring api.php
    DEV["otps"] = [o for o in DEV["otps"] if o["exp"] > now - 3600]
    DEV["otps"].append({"phone": phone, "code": code, "exp": now + 300,
                        "tries": 0, "at": now, "verified": False})
    return 200, {"ok": True, "demoMode": True, "devCode": code, "digits": OTP_DIGITS}


def dev_check_otp(phone, code):
    """Returns (http_status, payload, otp_record|None) like api.php."""
    found = next((o for o in reversed(DEV["otps"]) if o["phone"] == phone), None)
    if found is None:
        return 400, {"error": "Request an OTP first"}, None
    if found["exp"] < int(time.time()):
        return 400, {"error": "OTP expired — request a new one"}, None
    if found["tries"] >= 5:
        return 429, {"error": "Too many attempts — request a new OTP"}, None
    found["tries"] += 1
    if found["code"] != str(code or ""):
        return 400, {"error": "Incorrect OTP"}, None
    found["verified"] = True
    return 200, {}, found


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

    def do_POST(self, *a):
        u = urlparse(self.path)
        if not u.path.startswith("/api/"):
            return self._json(405, {"error": "Preview shim is read-only"})
        route = u.path[len("/api/"):]
        try:
            length = int(self.headers.get("Content-Length", 0) or 0)
            body = json.loads(self.rfile.read(length) or b"{}") if length else {}
        except ValueError:
            body = {}
        if not isinstance(body, dict):
            body = {}
        if self.dev_api(route, body) is not False:
            return
        return self._json(405, {"error": "Preview shim is read-only"})

    def dev_api(self, route, body):
        """v105 in-memory auth/OTP/KYC endpoints — api.php response shapes.
        Returns False for real catalogue writes, which must stay 405."""
        if route in ("auth/send-otp", "kyc/send-otp"):
            phone = dev_phone10(body.get("phone"))
            if not dev_valid_phone(phone):
                return self._json(400, {"error": "Enter a valid 10-digit Indian mobile"})
            code, payload = dev_send_otp(phone)
            return self._json(code, payload)
        if route in ("auth/otp-login", "kyc/verify-otp"):
            phone = dev_phone10(body.get("phone"))
            status, payload, _rec = dev_check_otp(phone, body.get("code"))
            if status != 200:
                return self._json(status, payload)
            if route == "kyc/verify-otp":
                return self._json(200, {"ok": True})
            hit = next((u for u in dev_all_users() if dev_phone10(u.get("phone")) == phone), None)
            if hit:
                return self._json(200, {"token": dev_issue(hit), "user": dev_pub_user(hit)})
            return self._json(404, {"error": "No account with this number — please register first"})
        if route == "auth/register":
            name = str(body.get("name") or "").strip()
            email = str(body.get("email") or "").strip().lower()
            password = str(body.get("password") or "")
            phone = dev_phone10(body.get("phone"))
            if not (name and email and password):
                return self._json(400, {"error": "Name, email & password required"})
            if len(password) < 8:
                return self._json(400, {"error": "Password must be at least 8 characters"})
            if not dev_valid_phone(phone):
                return self._json(400, {"error": "Valid 10-digit phone required"})
            if not any(o["phone"] == phone and o["verified"] for o in DEV["otps"]):
                return self._json(400, {"error": "Verify your phone with OTP first"})
            if any(str(u.get("email", "")).lower() == email for u in dev_all_users()):
                return self._json(409, {"error": "Email already registered"})
            u = {"id": "dev_u_" + secrets.token_hex(4), "name": name, "email": email,
                 "phone": phone, "role": "customer", "loyaltyPoints": 120, "wishlist": [],
                 "createdAt": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime())}
            DEV["users"].append(u)
            return self._json(200, {"token": dev_issue(u), "user": dev_pub_user(u)})
        if route == "auth/login":
            email = str(body.get("email") or "").strip().lower()
            hit = next((u for u in db().get("users", [])
                        if str(u.get("email", "")).lower() == email), None)
            if not hit:
                return self._json(401, {"error": "Invalid email or password"})
            if str(body.get("password") or "") != PREVIEW_PASSWORD:
                return self._json(401, {"error": "Invalid email or password",
                                        "previewNote": "The shim cannot check bcrypt hashes — use '"
                                                       + PREVIEW_PASSWORD + "' for seeded accounts"})
            return self._json(200, {"token": dev_issue(hit), "user": dev_pub_user(hit)})
        if route == "kyc/check-gstin":
            return self._json(200, gstin_check(body.get("gstin")))
        if route == "kyc/gst-lookup":
            chk = gstin_check(body.get("gstin"))
            if not chk["valid"]:
                return self._json(400, {"error": chk["reason"]})
            return self._json(200, {"configured": False,
                                    "note": "Add a GST API key in Admin → Settings to auto-verify legal names online"})
        if route == "wishlist":
            u = dev_token(self)
            if not u:
                return self._json(401, {"error": "Login required"})
            ids = DEV["wishlist"].setdefault(u["id"], [])
            pid = str(body.get("id") or "")
            if body.get("add") and pid and pid not in ids:
                ids.append(pid)
            if not body.get("add"):
                DEV["wishlist"][u["id"]] = [x for x in ids if x != pid]
            return self._json(200, {"wishlist": DEV["wishlist"][u["id"]]})
        if route == "orders":
            u = dev_token(self)
            if not u:
                return self._json(401, {"error": "Login required"})
            return self._json(200, {"orders": DEV["orders"].get(u["id"], []),
                                    "preview": "Checkout needs PHP (razorpay/orders + stock lock)."})
        if route == "partners/apply":
            if not (body.get("firm") and body.get("email") and body.get("phone") and body.get("password")):
                return self._json(400, {"error": "Firm, email, phone & password required"})
            gst = gstin_check(body.get("gstin"))
            if not gst["valid"]:
                return self._json(400, {"error": "GSTIN invalid: " + gst["reason"]})
            phone = dev_phone10(body.get("phone"))
            if not any(o["phone"] == phone and o["verified"] for o in DEV["otps"]):
                return self._json(400, {"error": "Verify your phone with OTP first"})
            email = str(body.get("email")).strip().lower()
            if any(str(x.get("email", "")).lower() == email for x in dev_all_users()):
                return self._json(409, {"error": "Email already registered — login instead"})
            pid = "dev_pt_" + secrets.token_hex(4)
            now = time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime())
            partner = {"id": pid, "firm": body["firm"], "contactPerson": body.get("contactPerson", ""),
                       "city": body.get("city") or gst["state"], "phone": body.get("phone"), "email": email,
                       "kyc": {"gstin": str(body.get("gstin")).upper(), "gstinValid": True,
                               "gstinState": gst["state"], "pan": gst["pan"],
                               "ownerPan": str(body.get("ownerPan", "")).upper(), "otpVerified": True, "at": now},
                       "message": body.get("message", ""), "status": "pending", "appliedAt": now}
            DEV["partners"][pid] = partner
            u = {"id": "dev_u_" + secrets.token_hex(4), "name": body["firm"], "email": email,
                 "phone": body.get("phone"), "role": "partner", "partnerId": pid,
                 "loyaltyPoints": 0, "wishlist": [], "createdAt": now}
            DEV["users"].append(u)
            DEV["by_partner"][u["id"]] = partner
            return self._json(200, {"ok": True, "id": pid, "token": dev_issue(u), "user": dev_pub_user(u)})
        if route == "reviews":
            u = dev_token(self)
            if not u:
                return self._json(401, {"error": "Login required"})
            if not (body.get("productId") and body.get("text")):
                return self._json(400, {"error": "productId & text required"})
            rv = {"id": "dev_rv_" + secrets.token_hex(4), "productId": body["productId"],
                  "userName": u.get("name"), "rating": max(1, min(5, int(body.get("rating") or 5))),
                  "text": str(body["text"])[:500],
                  "createdAt": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime())}
            DEV["reviews"].append(rv)
            return self._json(200, rv)
        if route == "contact":
            if not (body.get("name") and body.get("message")):
                return self._json(400, {"error": "Name & message required"})
            return self._json(200, {"ok": True, "preview": True})
        if route == "newsletter":
            if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[A-Za-z]{2,}", str(body.get("email") or "")):
                return self._json(400, {"error": "Valid email required"})
            return self._json(200, {"ok": True, "preview": True})
        if route == "services":
            if not (body.get("name") and body.get("phone")):
                return self._json(400, {"error": "Name & phone required"})
            return self._json(200, {"ok": True, "preview": True})
        if route == "coupons/validate":
            code = str(body.get("code") or "").strip().upper()
            amount = float(body.get("amount") or 0)
            hit = next((c for c in db().get("coupons", [])
                        if str(c.get("code", "")).upper() == code and c.get("active")), None)
            if not hit:
                return self._json(404, {"error": "That code is not active"})
            if amount < float(hit.get("minOrder") or 0):
                return self._json(400, {"error": "Minimum ₹{:,.0f} for {}".format(float(hit.get("minOrder") or 0), code)})
            return self._json(200, hit)
        if route in ("rates/alert", "addresses", "auth/profile"):
            return self._json(200, {"ok": True, "preview": True,
                                    "message": "Preview shim accepted this in memory — nothing was stored."})
        # ── v107 audit extras (POST) ──
        if route == "pay/order":
            return self._json(200, {"ok": True, "orderId": "TST107", "amount": 8200000,
                                    "upiId": "shivaa@ybl", "upiName": "Shivaa Jewellers"})
        if route in ("pay/verify", "pay/proof"):
            return self._json(200, {"ok": True, "status": "pending"})
        if route == "refunds":
            return self._json(200, {"ok": True, "id": "RF1"})
        if route in ("sms/config", "sms/test", "mail/test"):
            return self._json(401, {"error": "admin only"})
        print("  [shim] generic POST /%s" % route)
        return self._json(200, {"ok": True, "note": "shim generic accept"})

    def do_PUT(self, *a):
        route = urlparse(self.path).path[len("/api/"):] if self.path.startswith("/api/") else ""
        if route == "settings":
            u = dev_token(self)
            if not u or u.get("role") != "admin":
                return self._json(403, {"error": "Admin access required"})
            try:
                length = int(self.headers.get("Content-Length", 0) or 0)
                body = json.loads(self.rfile.read(length) or b"{}") if length else {}
            except ValueError:
                body = {}
            if not isinstance(body, dict):
                return self._json(400, {"error": "Invalid payload"})
            # mirror api.php: merge keys, keep everything else (incl. cin/udyam/gstin)
            DEV_SETTINGS.update({k: v for k, v in body.items()})
            return self._json(200, db()["settings"])
        return self._json(405, {"error": "Preview shim is read-only"})
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
        if route == "trust":
            return self._json(200, trust_profile(d))
        if route == "hallmark/status":
            return self._json(200, {"mode": "official_handoff", "automaticLookupAvailable": False,
                                    "reason": "not_connected", "verified": False, "record": None,
                                    "source": None, "checkedAt": None,
                                    "message": "Automatic BIS verification is not connected. Complete the lookup in the official BIS Care app using Verify HUID. Shivaa does not receive that result.",
                                    "officialLinks": []})
        if route == "bullion":
            u = dev_token(self)
            if not u or u.get("role") not in ("partner", "admin"):
                return self._json(403, {"error": "Jeweller access only"})
            return self._json(200, bullion_rows(d))
        if route == "catalogues":
            return self._json(200, {"catalogues": d.get("catalogues", [])})
        if route == "coupons":
            return self._json(200, {"coupons": [c for c in d.get("coupons", []) if c.get("active")]})
        if route == "wishlist":                      # api.php allows this anonymously
            u = dev_token(self)
            ids = DEV["wishlist"].get(u["id"], []) if u else []
            R = current_rates(d)
            items = [priced(d, x) for x in d["products"] if x.get("id") in ids]
            return self._json(200, {"wishlist": ids, "items": items})
        if route == "sms/status":
            return self._json(200, {"provider": "preview", "enabled": False, "demo": True})
        if route == "auth/me":
            u = dev_token(self)
            return self._json(200, {"user": dev_pub_user(u) if u else None})
        if route in ("orders", "partners/me"):
            u = dev_token(self)
            if not u:
                return self._json(401, {"error": "Login required"})
            if route == "orders":
                mine = [o for o in d.get("orders", []) if o.get("userId") == u["id"]]
                return self._json(200, {"orders": list(reversed(mine)) + DEV["orders"].get(u["id"], [])})
            partners = d.get("partners", [])
            pid = u.get("partnerId") or (partners[0]["id"] if partners else "")
            pr = next((x for x in partners if x.get("id") == pid), None)
            if pr is None:
                pr = DEV["partners"].get(u["id"])
            setl = [x for x in d.get("settlements", []) if x.get("partnerId") == pid]
            return self._json(200, {"partner": pr, "settlements": setl})
        # ── v107 audit extras ─────────────────────────────────────────────
        if route == "auth/delivery":
            return self._json(200, {"channel": "email", "configured": False, "provider": None})
        if route == "sms/config" or route == "sms/status" or route.startswith("admin/"):
            return self._json(401, {"error": "admin only"})
        if route == "pay/config":
            return self._json(200, {"mode": "demo", "provider": "payu",
                "payu": {"ready": False, "env": "test"}, "prepaidPct": 2, "codFeePct": 0,
                "upiId": "shivaa@ybl", "upiName": "Shivaa Jewellers", "lockMinutes": 20})
        if route == "services":
            return self._json(200, {"services": []})
        if route == "finale/count":
            return self._json(200, {"count": 1284, "entries": 1284})
        if route == "finale/entry":
            return self._json(200, {"entry": None})
        if route == "finale/quiz":
            return self._json(200, {"questions": [], "best": None})
        if route == "reviews":
            return self._json(200, {"reviews": [], "avg": 0, "count": 0})
        if route == "referrals/stats":
            return self._json(200, {"referrals": 0, "earned": 0, "code": ""})
        if route == "refunds/mine":
            return self._json(401, {"error": "login required"})
        if route == "coupons":
            return self._json(200, {"coupons": []})
        if route.startswith("orders/"):
            oid = route.split("/", 1)[1]
            prods = d.get("products", [])[:1]
            p0 = prods[0] if prods else {"id": "x", "name": "Test", "metal": "Gold",
                 "purity": "22K", "weightG": 5, "mcScheme": "flat", "mcValue": 1000,
                 "stoneValue": 0, "images": [], "sizes": []}
            _ord = {"id": oid, "status": "Confirmed",
                "createdAt": "2026-09-01T10:00:00+05:30", "total": 82000,
                "amountPaid": 82000, "balance": 0, "paymentStatus": "Paid", "gateway": "upi-qr",
                "payments": [{"at": "2026-09-01T10:05:00+05:30", "mode": "upi-qr",
                              "status": "approved", "amount": 82000, "ref": "UPI123"}],
                "refunds": [], "items": [{"p": p0, "name": p0.get("name", "Test"), "qty": 1, "size": "14", "unitPrice": 82000, "hsn": "7113"}], "rateSnapshot": {"gold22": 14300, "gold24": 15600, "gold18": 11603, "silver": 239, "stampedAt": "2026-09-01T09:50:00+05:30"}, "subtotal": 80000, "discount": 0,
                "rateLock": {"stampedAt": "2026-09-01T09:50:00+05:30", "rates": {"gold22": 14300, "gold24": 15600, "gold18": 11603, "silver": 239}},
                "invoiceNo": "INV-" + oid, "userName": "Test Guest",
                "earnedPoints": 82, "phone": "9876543210", "email": "t@t.in",
                "address": {"name": "Test Guest", "phone": "9876543210",
                            "line1": "1 Test Lane", "city": "Jaipur",
                            "state": "Rajasthan", "pin": "302001"}}
            return self._json(200, {"order": _ord})
        if route == "wishlist":
            return self._json(200, {"ids": []})
        print("  [shim] generic GET /%s" % route)
        return self._json(200, {})


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=8090)
    a = ap.parse_args()
    srv = ThreadingHTTPServer(("0.0.0.0", a.port), Handler)
    print(f"Shivaa preview shim on 0.0.0.0:{a.port} — cms={ROOT}")
    print(f"  catalogue = read-only · auth/OTP/kyc = in-memory dev layer (preview password '{PREVIEW_PASSWORD}')")
    srv.serve_forever()
