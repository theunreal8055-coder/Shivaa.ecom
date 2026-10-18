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
import argparse, copy, datetime, json, re, secrets, threading, time
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
    # v120 preview parity: 22K follows the live anchor formula (api.php v119+)
    g22p = int(d["settings"].get("gold22Premium", 398))
    anchor_g = int(l["gold24"])
    return {"gold24": anchor_g + gp, "gold22": round(anchor_g * 0.9167) + g22p,
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
       "partners": {}, "by_partner": {}, "reviews": [],
       # v227 — passwords set through the reset flow (bcrypt is unavailable here)
       "passwords": {},
       # v227 — Shivaa Black memberships created through the claim flow
       "blackCards": {},
       # v228 — accounts erased through #/delete-account (<uid> -> "otp"|"session")
       "erased": {},
       # v229 — in-store bills uploaded through Admin -> In-store Bills. The
       # document bytes live in RAM only: the sandbox has no private folder
       # beside a document root, and inventing one would hide the very failure
       # mode (503, nothing saved) the owner has to be told about.
       "bills": []}
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


def dev_reset_lookup(body):
    """v227 — the shim resolves the account by mobile (default) or email, the
    same way api.php does, so the SPA branches identically against both."""
    phone = dev_phone10(body.get("phone"))
    email = str(body.get("email") or "").strip().lower()
    if not email and dev_valid_phone(phone):
        return next((u for u in dev_all_users() if dev_phone10(u.get("phone")) == phone), None), phone, True
    return next((u for u in dev_all_users()
                 if str(u.get("email", "")).lower() == email), None), phone, False


def dev_send_reset_otp(phone):
    """A reset code is minted to the registered mobile, never handed back to
    the browser in api.php; the sandbox returns it so the flow is testable."""
    now = int(time.time())
    code = "".join(secrets.choice("0123456789") for _ in range(OTP_DIGITS))
    DEV["otps"] = [o for o in DEV["otps"] if o["exp"] > now - 3600]
    DEV["otps"].append({"phone": phone, "code": code, "exp": now + 300,
                        "tries": 0, "at": now, "verified": False, "purpose": "reset"})
    return code


def dev_check_reset_otp(phone, code):
    found = None
    for o in reversed(DEV["otps"]):
        if o["phone"] == phone and o.get("purpose") == "reset":
            found = o
            break
    if found is None:
        return 400, {"error": "Request a reset code first"}
    if found["exp"] < int(time.time()):
        return 400, {"error": "That code has expired - request a new one"}
    if found["tries"] >= 5:
        return 429, {"error": "Too many attempts on this code - request a new one"}
    found["tries"] += 1
    if found["code"] != str(code or ""):
        return 400, {"error": "Incorrect code"}
    return 200, found


def _is_num(v):
    try:
        float(v)
        return True
    except (TypeError, ValueError):
        return False


def dev_black_card(uid):
    card = DEV["blackCards"].get(uid)
    if card:
        return card
    # v229 — adopt the card already stored on the account, the way api.php reads
    # users[i].blackCard. DEV["blackCards"] only ever held cards the shim itself
    # created, so a fixture member arrived cardless and every membership
    # assertion had nothing to look at.
    if not uid:
        return None
    u = next((x for x in dev_all_users() if x.get("id") == uid), None)
    own = (u or {}).get("blackCard")
    if isinstance(own, dict) and own:
        DEV["blackCards"][uid] = copy.deepcopy(own)
    return DEV["blackCards"].get(uid)


def dev_black_pct():
    """v229 - mirrors api.php black_discount_pct(): ONE setting, default 25,
    clamped 0-40. Every dev surface reads it through here so the shim cannot
    drift from the server it stands in for."""
    v = DEV_SETTINGS.get("blackDiscountPct", db()["settings"].get("blackDiscountPct"))
    try:
        n = int(round(float(v)))
    except (TypeError, ValueError):
        return 25
    return max(0, min(40, n))


def dev_add_months(iso, months):
    """v229 - mirrors api.php black_add_months(): whole calendar months, and a
    31st lands on the last day of a shorter month instead of rolling over."""
    try:
        start = datetime.datetime.fromisoformat(str(iso).replace("Z", ""))
    except ValueError:
        return iso
    total = start.month - 1 + max(1, int(months))
    year, month = start.year + total // 12, total % 12 + 1
    import calendar
    day = min(start.day, calendar.monthrange(year, month)[1])
    return start.replace(year=year, month=month, day=day).strftime("%Y-%m-%dT%H:%M:%S")


def dev_black_left(card):
    """seconds left on a card; negative once it has expired"""
    try:
        until = datetime.datetime.fromisoformat(str(card.get("expiresAt", "")).replace("Z", ""))
    except ValueError:
        return 0
    return int((until - datetime.datetime.now()).total_seconds())


def dev_black_public(card):
    """mirrors api.php black_card_public() - the SPA reads these fields"""
    out = dict(card)
    out["program"] = "Shivaa Black"
    out["discountPct"] = dev_black_pct()
    out["discountBasis"] = "making-charges"
    out["certificateTitle"] = "Shivaa Family Prestigious Member"
    left = dev_black_left(card)
    out["status"] = "active" if left >= 0 else "expired"
    out["benefitActive"] = left >= 0
    # v229 - the renewal facts travel with the card, so the page and the server
    # can never disagree about whether the button exists.
    out["daysLeft"] = max(0, left // 86400)
    out["renewals"] = int(card.get("renewals") or 0)
    out["renewable"] = left <= 30 * 86400
    return out


def dev_black_renew(u, months=6):
    """v229 - mirrors POST black-card/renew. Returns (status, payload)."""
    card = DEV["blackCards"].get(u.get("id"))
    if not card:
        return 404, {"error": "Create your Shivaa Black card first."}
    left = dev_black_left(card)
    if left > 30 * 86400:
        days = left // 86400
        return 409, {"error": "Renewal opens in the last 30 days of your validity — %d days to go." % days,
                     "daysLeft": days, "renewable": False}
    previous = card.get("expiresAt")
    card["previousExpiresAt"] = previous
    now = time.strftime("%Y-%m-%dT%H:%M:%S")
    card["expiresAt"] = dev_add_months(previous if left > 0 else now, months)
    card["renewedAt"] = now
    card["renewals"] = int(card.get("renewals") or 0) + 1
    card["discountPct"] = dev_black_pct()
    return 200, {"ok": True, "membership": dev_black_public(card), "user": dev_pub_user(u),
                 "previousExpiresAt": previous, "renewals": card["renewals"]}


def dev_black_claim(u, body):
    """the idempotent claim api.php runs: one card per retail account"""
    uid = u.get("id")
    card = DEV["blackCards"].get(uid)
    created = False
    if not card:
        now = time.strftime("%Y-%m-%dT%H:%M:%S")
        exp = (datetime.datetime.now() + datetime.timedelta(days=183)).strftime("%Y-%m-%dT%H:%M:%S")
        card = {
            "version": 2, "program": "Shivaa Black",
            "memberId": "SBM" + str(secrets.randbelow(10 ** 6)).zfill(6),
            "cardNumber": str(secrets.randbelow(10 ** 16)).zfill(16),
            "holderName": str(body.get("name") or u.get("name") or "SHIVAA MEMBER").strip(),
            "mobile": dev_phone10(u.get("phone")),
            "issuedAt": now, "expiresAt": exp,
            "discountPct": 20, "discountBasis": "making-charges",
            "couponId": "c" + str(secrets.randbelow(10 ** 8)).zfill(8),
            "certificateNo": "SFP" + str(secrets.randbelow(10 ** 6)).zfill(6),
            "issuedTo": u.get("email", ""),
            "delivery": None,
        }
        DEV["blackCards"][uid] = card
        created = True
    return card, created


def dev_file_kind(data):
    """v229 - the file type is decided by the BYTES, never by the filename.
    Mirrors api.php shv_bill_detect_ext() on the way in and again on the way
    out: a text file renamed lie.png must be refused here too, or the suite
    would be testing a server that does not exist."""
    if not isinstance(data, (bytes, bytearray)) or len(data) < 12:
        return None
    head = bytes(data[:12])
    if head.startswith(b"\xff\xd8\xff"):
        return "jpg"
    if head.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if head[:4] == b"RIFF" and head[8:12] == b"WEBP":
        return "webp"
    if head.startswith(b"%PDF-"):
        return "pdf"
    return None


DEV_BILL_MIME = {"jpg": "image/jpeg", "png": "image/png", "webp": "image/webp",
                 "pdf": "application/pdf"}


def dev_multipart(raw, boundary):
    """v229 - hand-rolled multipart parser (cgi.FieldStorage is gone in 3.13).

    Splitting on b"\r\n" + boundary silently drops the FIRST part of every
    upload, which is exactly the part that carries the customer's name, so the
    split is on the delimiter itself and the preamble is discarded. The trailing
    CRLF is removed by length, never by strip(): strip() eats document bytes and
    a PDF that loses its last two bytes is a corrupt PDF.
    """
    parts = []
    delim = b"--" + boundary
    for chunk in raw.split(delim)[1:]:
        if chunk[:2] == b"--":
            continue                                   # closing delimiter
        chunk = chunk.lstrip(b"\r\n")
        head, _, data = chunk.partition(b"\r\n\r\n")
        if data.endswith(b"\r\n"):
            data = data[:-2]
        disp = b""
        ctype = ""
        for line in head.split(b"\r\n"):
            low = line.lower()
            if low.startswith(b"content-disposition:"):
                disp = line
            elif low.startswith(b"content-type:"):
                ctype = line.split(b":", 1)[1].strip().decode("utf-8", "replace")
        name = filename = None
        m = re.search(rb'name="([^"]*)"', disp)
        if m:
            name = m.group(1).decode("utf-8", "replace")
        m = re.search(rb'filename="([^"]*)"', disp)
        if m:
            filename = m.group(1).decode("utf-8", "replace")
        parts.append({"name": name, "filename": filename, "type": ctype, "data": data})
    return parts


def dev_bill_public(b, admin=False):
    """v229 - mirrors api.php bill_public($b, $admin). One serialiser, and the
    owner's private note plus the stored reference only ever leave for an
    admin."""
    files = [{"i": i, "ext": f.get("ext", ""), "size": int(f.get("size") or 0),
              "label": f.get("label", ""), "uploadedAt": f.get("uploadedAt", "")}
             for i, f in enumerate(b.get("files", []))]
    out = {"id": b.get("id", ""), "billNo": b.get("billNo", ""), "billDate": b.get("billDate", ""),
           "store": b.get("store", ""), "customerName": b.get("customerName", ""),
           "amount": float(b.get("amount") or 0), "items": b.get("items", ""),
           "files": files, "createdAt": b.get("createdAt", ""), "updatedAt": b.get("updatedAt", "")}
    if admin:
        out["phone"] = b.get("phone", "")
        out["userId"] = b.get("userId", "")
        out["notes"] = b.get("notes", "")
        out["createdBy"] = b.get("createdBy", "")
        out["anonymizedAt"] = b.get("anonymizedAt")
    return out


def dev_bills_for(u):
    """v229 - mirrors api.php bills_for_user(): by account id when linked,
    otherwise by the last ten digits of the mobile written on the paper."""
    uid = u.get("id") or ""
    mobile = dev_phone10(u.get("phone"))
    out = []
    for b in DEV["bills"]:
        if uid and b.get("userId") == uid:
            out.append(b)
        elif mobile and dev_phone10(b.get("phone")) == mobile:
            out.append(b)
    out.sort(key=lambda b: str(b.get("billDate", "")), reverse=True)
    return out


def dev_bill_find(bill_id):
    return next((b for b in DEV["bills"] if b.get("id") == bill_id), None)


def dev_bill_validate(f, create=False):
    """v229 - mirrors api.php bill_clean(). Returns an error string or ''."""
    phone = re.sub(r"\D", "", str(f.get("phone") or ""))[-10:]
    date = str(f.get("billDate") or "").strip()[:10]
    if not create:
        return ""
    if not str(f.get("billNo") or "").strip():
        return "The bill number is required — it is what the customer and your register both quote."
    if not str(f.get("customerName") or "").strip():
        return "The customer name is required."
    if not re.match(r"^[6-9]\d{9}$", phone):
        return "A valid 10-digit customer mobile is required — it is how the bill reaches the right account."
    if not re.match(r"^\d{4}-\d{2}-\d{2}$", date):
        return "The bill date must look like 2026-05-06."
    try:
        if datetime.datetime.strptime(date, "%Y-%m-%d").date() > datetime.date.today():
            return "A bill date cannot be in the future."
    except ValueError:
        return "The bill date must look like 2026-05-06."
    return ""


def dev_bill_store(files, existing=None, cap=6):
    """v229 - mirrors api.php bill_files_from_upload(). Returns (rows, error).
    Over the cap the upload is REFUSED, not truncated: a bill missing its last
    page is worse than an error the owner can act on. The type comes from the
    bytes, never from the filename."""
    rows = list(existing or [])
    for part in files:
        if len(rows) >= cap:
            return None, ("Each bill takes up to 6 files of 8 MB — jpg, png, webp or pdf, "
                          "and the file must really be one of those.")
        data = part.get("data") or b""
        if len(data) < 1 or len(data) > 8388608:
            return None, ("Each bill takes up to 6 files of 8 MB — jpg, png, webp or pdf, "
                          "and the file must really be one of those.")
        kind = dev_file_kind(data)
        if kind is None:
            return None, ("Each bill takes up to 6 files of 8 MB — jpg, png, webp or pdf, "
                          "and the file must really be one of those.")
        label = str(part.get("filename") or "")[:80]
        rows.append({"ref": "private-bills:bill_" + secrets.token_hex(16) + "." + kind,
                     "ext": kind, "size": len(data), "label": label, "originalName": label,
                     "uploadedAt": time.strftime("%Y-%m-%dT%H:%M:%S"), "_bytes": data})
    return rows, ""


def dev_bill_link(row):
    """v229 - mirrors api.php bill_link_user(): the mobile on the paper finds the
    account, so a customer who registers later still sees their old bills."""
    if row.get("userId"):
        return False
    phone = dev_phone10(row.get("phone"))
    if not phone:
        return False
    for u in dev_all_users():
        if (u.get("role") or "customer") != "customer":
            continue
        if dev_phone10(u.get("phone")) == phone:
            row["userId"] = u.get("id")
            return True
    return False


def dev_pub_user(u):
    return {"id": u.get("id"), "name": u.get("name"), "email": u.get("email"),
            "phone": u.get("phone", ""), "role": u.get("role", "customer"),
            "loyaltyPoints": u.get("loyaltyPoints", 0), "partnerId": u.get("partnerId"),
            "createdAt": u.get("createdAt", ""), "profile": u.get("profile", []),
            "addresses": u.get("addresses", []),
            # v227 — api.php's pub_user() carries the member's own card, and the
            # SPA reads state.user.blackCard straight after a claim.
            # v229 — read it through dev_black_card(), not off the row: db() is
            # re-read from disk every call, so after a renewal the row is the
            # stale one and DEV holds the truth.
            "blackCard": dev_black_public(dev_black_card(u.get("id")))
            if dev_black_card(u.get("id")) else None}


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
    found = next((o for o in reversed(DEV["otps"])
                  if o["phone"] == phone and not o.get("consumedByLogin")), None)
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
        length = int(self.headers.get("Content-Length", 0) or 0)
        raw = self.rfile.read(length) if length else b""
        ctype = (self.headers.get("Content-Type") or "")
        if ctype.lower().startswith("multipart/form-data"):
            # v229 — Admin -> In-store Bills uploads real files
            mb = re.search(r'boundary=(?:"([^"]+)"|([^;]+))', ctype, re.I)
            boundary = (mb.group(1) or mb.group(2) or "").strip().encode() if mb else b""
            fields, files = {}, []
            for part in dev_multipart(raw, boundary):
                if part.get("filename"):
                    files.append(part)
                elif part.get("name"):
                    fields[part["name"]] = part["data"].decode("utf-8", "replace")
            return self.dev_multipart_api(route, fields, files, parse_qs(u.query))
        try:
            body = json.loads(raw or b"{}")
        except ValueError:
            body = {}
        if not isinstance(body, dict):
            body = {}
        if self.dev_api(route, body) is not False:
            return
        return self._json(405, {"error": "Preview shim is read-only"})

    def dev_multipart_api(self, route, fields, files, q):
        """v229 — the bill desk. Owner-side only: a customer token gets 403 here,
        exactly as api.php's need_admin() does."""
        u = dev_token(self)
        if not u or u.get("role") != "admin":
            return self._json(403, {"error": "Admin access required"})
        now = time.strftime("%Y-%m-%dT%H:%M:%S")
        if route == "admin/store-bills":
            err = dev_bill_validate(fields, create=True)
            if err:
                return self._json(400, {"error": err})
            rows, err2 = dev_bill_store(files)
            if rows is None:
                return self._json(400, {"error": err2})
            if not rows:
                return self._json(400, {"error": "Attach the bill itself — a photo or a PDF of the paper."})
            try:
                amount = round(max(0.0, min(1e8, float(fields.get("amount") or 0))), 2)
            except ValueError:
                amount = 0.0
            row = {"id": "sb_" + secrets.token_hex(8),
                   "billNo": str(fields.get("billNo") or "").strip()[:40],
                   "billDate": str(fields.get("billDate") or "").strip()[:10],
                   "store": (str(fields.get("store") or "").strip()[:120] or "Shivaa Jewels · Jaipur"),
                   "customerName": str(fields.get("customerName") or "").strip()[:120],
                   "phone": re.sub(r"\D", "", str(fields.get("phone") or ""))[-10:],
                   "userId": "", "amount": amount,
                   "items": str(fields.get("items") or "").strip()[:600],
                   "notes": str(fields.get("notes") or "").strip()[:600],
                   "files": rows, "createdBy": u.get("id"), "createdAt": now, "updatedAt": now}
            linked = dev_bill_link(row)
            DEV["bills"].append(row)
            return self._json(200, {"ok": True, "linked": linked, "bill": dev_bill_public(row, True)})
        m = re.match(r"^admin/store-bills/([\w-]+)$", route)
        if m:
            b = dev_bill_find(m.group(1))
            if not b:
                return self._json(404, {"error": "Bill not found"})
            drop = (q.get("dropFile") or [None])[0]
            if drop is not None:
                i = int(drop)
                if i < 0 or i >= len(b.get("files", [])):
                    return self._json(404, {"error": "That page of the bill does not exist."})
                b["files"].pop(i)
            err = dev_bill_validate(fields, create=False)
            if err:
                return self._json(400, {"error": err})
            for k in ("billNo", "billDate", "store", "customerName", "phone", "amount", "items", "notes"):
                if k not in fields:
                    continue
                if k == "amount":
                    try:
                        b[k] = round(max(0.0, min(1e8, float(fields[k] or 0))), 2)
                    except ValueError:
                        pass
                elif k == "phone":
                    b[k] = re.sub(r"\D", "", str(fields[k]))[-10:]
                elif k == "billDate":
                    if re.match(r"^\d{4}-\d{2}-\d{2}$", str(fields[k])[:10]):
                        b[k] = str(fields[k])[:10]
                else:
                    b[k] = str(fields[k]).strip()[:600 if k in ("items", "notes") else 120]
            if files:
                rows, err2 = dev_bill_store(files, existing=b.get("files", []))
                if rows is None:
                    return self._json(400, {"error": err2})
                b["files"] = rows
            dev_bill_link(b)
            b["updatedAt"] = now
            return self._json(200, {"ok": True, "bill": dev_bill_public(b, True)})
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
        if route == "auth/reset/start":
            hit, phone, by_phone = dev_reset_lookup(body)
            generic = {"ok": True, "sent": True, "devCode": None}
            if not hit:
                # deliberately identical whether or not the account exists
                return self._json(200, dict(generic, message="If that account exists, a 4-digit code is on its way to the registered mobile."))
            if not dev_valid_phone(hit.get("phone")):
                return self._json(200, dict(generic, noPhone=True,
                                            message="That account has no mobile on file."))
            code = dev_send_reset_otp(dev_phone10(hit.get("phone")))
            masked = dev_phone10(hit.get("phone"))
            masked = masked[:2] + "XXXXX" + masked[-3:]
            return self._json(200, {"ok": True, "sent": True, "demoMode": True, "devCode": code,
                                    "phone": dev_phone10(hit.get("phone")), "masked": masked,
                                    "via": "sms",
                                    "message": "If that account exists, a 4-digit code is on its way to the registered mobile."})
        if route == "auth/reset/confirm":
            hit, phone, by_phone = dev_reset_lookup(body)
            code = str(body.get("code") or "")
            pw = str(body.get("password") or "")
            if len(pw) < 8:
                return self._json(400, {"error": "New password must be at least 8 characters"})
            if not hit:
                return self._json(400, {"error": "That code is not valid - request a new one"})
            status, found = dev_check_reset_otp(dev_phone10(hit.get("phone")), code)
            if status != 200:
                return self._json(status, found if isinstance(found, dict) else {"error": "Incorrect code"})
            DEV["passwords"][hit["id"]] = pw
            # every other session for this account is revoked
            revoked = [t for t, uid in DEV["tokens"].items() if uid == hit["id"]]
            for t in revoked:
                DEV["tokens"].pop(t, None)
            DEV["otps"] = [o for o in DEV["otps"]
                           if not (o["phone"] == dev_phone10(hit.get("phone")) and o.get("purpose") == "reset")]
            return self._json(200, {"ok": True, "email": hit.get("email"),
                                    "role": hit.get("role", "customer"),
                                    "sessionsRevoked": len(revoked),
                                    "message": "Password updated. Sign in with your email and the new password."})
        if route == "auth/register":
            name = str(body.get("name") or "").strip()
            email = str(body.get("email") or "").strip().lower()
            password = str(body.get("password") or "")
            phone = dev_phone10(body.get("phone"))
            # v227 — mirrors api.php: a NAME and a verified OTP are the whole
            # requirement (v56 mobile-first sign-up). Email and password are
            # optional; a missing email gets the synthetic address the API
            # issues. The previous shape demanded all three, which made the
            # retail sheet's own sign-up step fail in the sandbox.
            if not name:
                return self._json(400, {"error": "Name is required"})
            if not dev_valid_phone(phone):
                return self._json(400, {"error": "Valid 10-digit phone required"})
            if password and len(password) < 8:
                return self._json(400, {"error": "Password must be at least 8 characters"})
            if not any(o["phone"] == phone and o.get("verified") for o in DEV["otps"]):
                return self._json(400, {"error": "Verify your phone with OTP first"})
            # one account per mobile — the OTP already proved possession
            same = next((u for u in dev_all_users() if dev_phone10(u.get("phone")) == phone), None)
            if same:
                return self._json(200, {"token": dev_issue(same), "user": dev_pub_user(same)})
            if email and any(str(u.get("email", "")).lower() == email for u in dev_all_users()):
                return self._json(409, {"error": "Email already registered"})
            if not email:
                email = phone + "@phone.shivaa.in"
            u = {"id": "dev_u_" + secrets.token_hex(4), "name": name, "email": email,
                 "phone": phone, "role": "customer", "loyaltyPoints": 120, "wishlist": [],
                 "profile": {k: body[k] for k in ("dob", "anniversary", "gender", "city") if body.get(k)},
                 "createdAt": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime())}
            DEV["users"].append(u)
            if password:
                DEV["passwords"][u["id"]] = password
            return self._json(200, {"token": dev_issue(u), "user": dev_pub_user(u)})
        if route == "auth/delete-account":
            # v228 — mirrors api.php: a session *or* a fresh SMS code proves the
            # account; the owner and B2B partners are refused; the row is
            # anonymised and every device token is dropped.
            if str(body.get("confirm") or "").strip() != "DELETE":
                return self._json(400, {"error": "Type DELETE to confirm"})
            u = dev_token(self)
            via = "session"
            if not u:
                phone = dev_phone10(body.get("phone"))
                if not dev_valid_phone(phone):
                    return self._json(400, {"error": "Enter the 10-digit mobile on the account"})
                code = str(body.get("code") or "")
                if not code:
                    return self._json(400, {"error": "Request a code first"})
                status, payload, _rec = dev_check_otp(phone, code)
                if status != 200:
                    return self._json(400, {"error": "That code is not valid — request a new one"})
                if _rec is not None:
                    _rec["consumedByLogin"] = True   # single use, burned here
                u = next((x for x in dev_all_users() if dev_phone10(x.get("phone")) == phone), None)
                if not u:
                    return self._json(400, {"error": "That code is not valid — request a new one"})
                via = "otp"
            role = (u.get("role") or "customer")
            if role == "admin":
                return self._json(400, {"error": "The owner account cannot be erased from the app"})
            if role == "partner":
                return self._json(400, {"error": "This is a B2B partner account — ask Shivaa to close it"})
            uid = u.get("id")
            # anon-out the in-memory user (the seeded db is read-only here)
            for x in DEV["users"]:
                if x.get("id") == uid:
                    x["name"] = "Deleted customer"
                    x["email"] = "deleted+" + str(uid) + "@privacy.local"
                    x["phone"] = ""
                    x["addresses"] = []
                    x["wishlist"] = []
                    x["profile"] = {"erased": True}
                    x["selfErased"] = True
                    DEV["passwords"].pop(uid, None)
                    DEV["blackCards"].pop(uid, None)
            DEV["tokens"] = {t: v for t, v in DEV["tokens"].items() if v != uid}
            DEV["erased"] = dict(DEV.get("erased") or {}, **{str(uid): via})
            return self._json(200, {"ok": True, "erased": True,
                                    "message": "Your account is erased. Orders already placed stay with us for tax and hallmarking records, with your name removed."})
        if route == "auth/login":
            email = str(body.get("email") or "").strip().lower()
            # v227 — the dev layer's own registered accounts sign in here too:
            # without this, an account created through the sheet (register) could
            # never be used to prove that a reset password works.
            hit = next((u for u in dev_all_users()
                        if str(u.get("email", "")).lower() == email), None)
            if not hit:
                return self._json(401, {"error": "Invalid email or password"})
            given = str(body.get("password") or "")
            dev_pw = DEV["passwords"].get(hit.get("id"))
            if given != PREVIEW_PASSWORD and (not dev_pw or given != dev_pw):
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
        # ── v229 · renewal, member side ──
        if route == "black-card/renew":
            u = dev_token(self)
            if not u:
                return self._json(401, {"error": "Sign in with your registered mobile to renew Shivaa Black."})
            if (u.get("role") or "customer") != "customer":
                return self._json(403, {"error": "Shivaa Black is exclusively for retail customers."})
            status, payload = dev_black_renew(u, 6)
            if status == 200:
                u["blackCard"] = payload["membership"]
            return self._json(status, payload)
        # ── v229 · the owner's side of Shivaa Black ──
        if route == "admin/black-card/renew":
            u = dev_token(self)
            if not u or u.get("role") != "admin":
                return self._json(403, {"error": "Admin access required"})
            try:
                months = int(body.get("months") or 6)
            except (TypeError, ValueError):
                return self._json(400, {"error": "months must be between 1 and 36"})
            if months < 1 or months > 36:
                return self._json(400, {"error": "months must be between 1 and 36"})
            target = next((x for x in dev_all_users() if x.get("id") == body.get("userId")), None)
            if not target:
                return self._json(404, {"error": "Customer not found"})
            status, payload = dev_black_renew(target, months)
            if status == 200:
                target["blackCard"] = payload["membership"]
            return self._json(status, payload)
        if route == "admin/black-card/delivery":
            u = dev_token(self)
            if not u or u.get("role") != "admin":
                return self._json(403, {"error": "Admin access required"})
            status = str(body.get("status") or "")
            if status not in ("to-ship", "printed", "shipped"):
                return self._json(400, {"error": "status must be to-ship, printed or shipped"})
            target = next((x for x in dev_all_users() if x.get("id") == body.get("userId")), None)
            if not target:
                return self._json(404, {"error": "Customer not found"})
            card = dev_black_card(target.get("id")) or target.get("blackCard")
            if not card:
                return self._json(404, {"error": "This customer has no Shivaa Black card"})
            if not card.get("delivery"):
                return self._json(409, {"error": "This member has not requested the free physical card yet"})
            card["delivery"]["status"] = status
            card["delivery"]["updatedAt"] = time.strftime("%Y-%m-%dT%H:%M:%S")
            track = re.sub(r"[^A-Za-z0-9 _-]", "", str(body.get("trackingNo") or ""))[:60].strip()
            if track:
                card["delivery"]["trackingNo"] = track
            if status == "shipped" and not card["delivery"].get("shippedAt"):
                card["delivery"]["shippedAt"] = time.strftime("%Y-%m-%dT%H:%M:%S")
            DEV["blackCards"][target.get("id")] = card
            target["blackCard"] = dev_black_public(card)
            return self._json(200, {"ok": True, "membership": dev_black_public(card),
                                    "delivery": card["delivery"]})
        if route == "black-card/claim":
            u = dev_token(self)
            if not u:
                return self._json(401, {"error": "Sign in by OTP with your registered mobile to claim Shivaa Black."})
            if (u.get("role") or "customer") != "customer":
                return self._json(403, {"error": "Shivaa Black is exclusively for retail customers."})
            card, created = dev_black_claim(u, body)
            u["blackCard"] = dev_black_public(card)
            return self._json(200, {"ok": True, "created": created,
                                    "membership": dev_black_public(card),
                                    "user": dev_pub_user(u)})
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
            # v229 — blackDiscountPct is clamped and refused out of range here
            # exactly as api.php's $numRules does: a shim that quietly accepted
            # 90 would let a suite pass against a server that says 400.
            if "blackDiscountPct" in body:
                v = body["blackDiscountPct"]
                if isinstance(v, (dict, list)) or not str(v).strip() or not _is_num(v):
                    return self._json(400, {"error": "blackDiscountPct must be a number"})
                n = int(round(float(v)))
                if n < 0 or n > 40:
                    return self._json(400, {"error": "blackDiscountPct is outside its allowed range (0–40)"})
                body["blackDiscountPct"] = n
            # mirror api.php: merge keys, keep everything else (incl. cin/udyam/gstin)
            DEV_SETTINGS.update({k: v for k, v in body.items()})
            return self._json(200, db()["settings"])
        return self._json(405, {"error": "Preview shim is read-only"})
    def do_DELETE(self, *a):
        u = urlparse(self.path)
        route = u.path[len("/api/"):] if u.path.startswith("/api/") else ""
        m = re.match(r"^admin/store-bills/([\w-]+)$", route)
        if m:
            # v229 — deleting a bill deletes its stored pages too, which is the
            # only verb on this desk that destroys anything.
            me = dev_token(self)
            if not me or me.get("role") != "admin":
                return self._json(403, {"error": "Admin access required"})
            b = dev_bill_find(m.group(1))
            if not b:
                return self._json(404, {"error": "Bill not found"})
            gone = len(b.get("files", []))
            DEV["bills"] = [x for x in DEV["bills"] if x.get("id") != m.group(1)]
            return self._json(200, {"ok": True, "deleted": m.group(1), "filesUnlinked": gone})
        return self._json(405, {"error": "Preview shim is read-only"})

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
        if route == "version":
            # v228 — api.php reports the release + the Data Source dial; the
            # shim answers the same shape so playstore/verify-live.sh and the
            # admin strip can be exercised locally. No credentials, ever.
            import re as _re
            idx = (ROOT / "index.html").read_text(encoding="utf-8", errors="ignore")
            app = (ROOT / "js" / "app.js").read_text(encoding="utf-8", errors="ignore")
            sw = (ROOT / "sw.js").read_text(encoding="utf-8", errors="ignore")
            rel_i = _re.search(r"__SHIVAA_REL\s*=\s*(\d+)", idx)
            rel_a = _re.search(r"APP_REL\s*=\s*(\d+)", app)
            rel_s = _re.search(r"REL\s*=\s*(\d+)", sw)
            shell = _re.search(r"SHELL = '([^']+)'", sw)
            ri = int(rel_i.group(1)) if rel_i else 0
            ra = int(rel_a.group(1)) if rel_a else 0
            rs = int(rel_s.group(1)) if rel_s else 0
            return self._json(200, {
                "ok": True, "rel": ri, "shell": shell.group(1) if shell else "?",
                "stamp": {"index": ri, "app": ra, "sw": rs,
                          "matched": ri == ra and (rs == 0 or rs == ri)},
                "db": {"driver": "json", "mode": "json", "reason": "preview-shim",
                       "sqlCount": None, "jsonCount": len(d.get("products", [])),
                       "mirrorBehind": False},
            })
        if route == "settings":
            return self._json(200, d["settings"])
        if route == "rates":
            last = d["rates"]["last"]
            return self._json(200, {**last,
                "spot": {k: last[k] for k in ("gold24", "gold22", "gold18", "silver")},
                "jaipur": current_rates(d),
                "premium": {"gold": int(d["settings"].get("jaipurPremium", 55)),
                            "gold22": int(d["settings"].get("gold22Premium", 398)),
                            "silver": float(d["settings"].get("jaipurSilverPremium", 3))},
                "anchorLevel": {"mode": "spot", "source": "preview-db",
                                "goldPerG": int(last["gold24"]), "silverPerG": float(last["silver"]),
                                "at": time.strftime("%Y-%m-%dT%H:%M:%S+05:30", time.localtime()), "ageMs": None},
                "t": time.strftime("%Y-%m-%dT%H:%M:%S+05:30", time.localtime()),
                "source": "preview",
                "override": d["rates"].get("override"),
                "history": d["rates"].get("history", [])[-120:],
                "nextUpdateIn": 60})
        if route == "making-charges":
            return self._json(200, {"table": d["makingCharges"], "gst": 3})
        if route == "offers/banner":
            # v208 QA parity — mirrors api.php offers/banner (making + FREEDEL shapes)
            on = d["settings"].get("bannerOfferOn", True)
            offers = []
            if on:
                mCode = (d["settings"].get("bannerOfferCode") or "MAKING20").upper()
                offers = [{"kind": "making", "code": mCode, "percent": 20.0},
                          {"kind": "delivery", "code": "FREEDEL"}]
            return self._json(200, {"offers": offers, "premium": {"claimed": False}})
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
        # v227 — Shivaa Black: the member reads their card here (api.php: GET black-card)
        if route == "black-card":
            u = dev_token(self)
            if not u:
                return self._json(401, {"error": "Sign in with your registered mobile to open Shivaa Black."})
            if (u.get("role") or "customer") != "customer":
                return self._json(403, {"error": "Shivaa Black is exclusively for retail customers."})
            card = dev_black_card(u.get("id"))
            return self._json(200, {"membership": dev_black_public(card) if card else None})
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
        # ── v229 · in-store bills, customer side: view and download only ──
        if route == "store-bills":
            u = dev_token(self)
            if not u:
                return self._json(401, {"error": "Sign in with your registered mobile to see your in-store purchases."})
            if (u.get("role") or "customer") == "admin":
                rows = [dev_bill_public(b, True) for b in reversed(DEV["bills"])]
                return self._json(200, {"bills": rows, "count": len(rows), "storage": True})
            mine = dev_bills_for(u)
            return self._json(200, {"bills": [dev_bill_public(b) for b in mine], "count": len(mine)})
        m = re.match(r"^store-bills/([\w-]+)/file/(\d+)$", route)
        if m:
            u = dev_token(self)
            if not u:
                return self._json(401, {"error": "Sign in to open your in-store purchase."})
            b = dev_bill_find(m.group(1))
            if not b:
                return self._json(404, {"error": "Purchase not found."})
            if (u.get("role") or "customer") != "admin" and b not in dev_bills_for(u):
                return self._json(403, {"error": "This purchase belongs to another customer."})
            idx = int(m.group(2))
            files = b.get("files", [])
            if idx < 0 or idx >= len(files):
                return self._json(404, {"error": "That page of the bill does not exist."})
            data = files[idx].get("_bytes") or b""
            ext = files[idx].get("ext", "")
            # re-checked on the way out, exactly as api.php does
            if dev_file_kind(data) != ext:
                return self._json(404, {"error": "Bill file not found or unsupported."})
            want_dl = q.get("download", [""])[0] not in ("", "0", "false")
            body = bytes(data)
            self.send_response(200)
            self.send_header("Content-Type", DEV_BILL_MIME.get(ext, "application/octet-stream"))
            self.send_header("Content-Disposition",
                             ("%s; filename=\"shivaa-bill-%s-%d.%s\"" %
                              ("attachment" if want_dl else "inline",
                               re.sub(r"[^A-Za-z0-9_-]", "", str(b.get("billNo") or b.get("id"))),
                               idx + 1, ext)))
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "private, no-store, max-age=0")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("X-Frame-Options", "SAMEORIGIN")
            self.send_header("X-Shivaa-Preview", "read-only-shim")
            self.end_headers()
            self.wfile.write(body)
            return
        # ── v229 · the owner's side ──
        if route == "admin/black-card/queue":
            u = dev_token(self)
            if not u or u.get("role") != "admin":
                return self._json(403, {"error": "Admin access required"})
            qq = {"members": 0, "active": 0, "expired": 0, "renewable": 0,
                  "toShip": 0, "printed": 0, "shipped": 0, "pct": dev_black_pct()}
            for row in dev_all_users():
                card = dev_black_card(row.get("id")) or row.get("blackCard")
                if not card:
                    continue
                qq["members"] += 1
                pub = dev_black_public(card)
                qq["active" if pub["status"] == "active" else "expired"] += 1
                if pub["renewable"]:
                    qq["renewable"] += 1
                d = card.get("delivery") or {}
                if d:
                    st = str(d.get("status") or "to-ship")
                    qq["printed" if st == "printed" else ("shipped" if st == "shipped" else "toShip")] += 1
            return self._json(200, qq)
        if route == "admin/store-bills":
            u = dev_token(self)
            if not u or u.get("role") != "admin":
                return self._json(403, {"error": "Admin access required"})
            rows = [dev_bill_public(b, True) for b in reversed(DEV["bills"])]
            return self._json(200, {"bills": rows, "count": len(rows), "storage": True,
                                    "storageDir": "private (outside the web root)"})
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
