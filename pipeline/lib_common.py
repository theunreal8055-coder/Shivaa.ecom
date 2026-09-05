"""Shared helpers: ledgers, retry, rate-limit, image sanity, JSON IO, slug ids."""
import csv, hashlib, json, mimetypes, os, sys, time, logging
from pathlib import Path

LOG = logging.getLogger("shivaa-pipe")

def setup_logging(work_dir: Path):
    work_dir.mkdir(parents=True, exist_ok=True)
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)-5s %(message)s",
        handlers=[logging.StreamHandler(sys.stdout),
                  logging.FileHandler(work_dir / "run.log", encoding="utf-8")])
    return LOG

def load_json(p):
    with open(p, encoding="utf-8") as f: return json.load(f)

def save_json(p, obj):
    p = Path(p); p.parent.mkdir(parents=True, exist_ok=True)
    tmp = p.with_suffix(".tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=1)
    os.replace(tmp, p)

CACHE = {}
def cached_json(p):
    """load with mtime cache for long runs."""
    key = str(p)
    m = os.path.getmtime(p)
    if CACHE.get(key, (None,))[0] != m:
        CACHE[key] = (m, load_json(p))
    return CACHE[key][1]

class Ledger:
    """CSV ledger per design-id -> status; enables resume + audit + cost export."""
    def __init__(self, path: Path, fields):
        self.path = Path(path); self.fields = fields
        self.rows = {}
        if self.path.exists():
            with open(self.path, newline="", encoding="utf-8") as f:
                for r in csv.DictReader(f):
                    self.rows[r.get("id", "")] = r
        self.f = open(self.path, "a", newline="", encoding="utf-8") if not self.path.exists() else open(self.path, "a", newline="", encoding="utf-8")
        self.w = csv.DictWriter(self.f, fieldnames=fields, extrasaction="ignore")
        if self.path.stat().st_size == 0: self.w.writeheader()

    def set(self, rid, **kv):
        kv["id"] = kv.get("id", rid)
        self.w.writerow(kv); self.f.flush()
        self.rows[rid] = kv

    def get(self, rid, default=None): return self.rows.get(rid, default)
    def done(self, rid): return self.rows.get(rid, {}).get("status") == "done"

class Retry:
    def __init__(self, tries=3, base=2.0, backoff=2.0):
        self.tries, self.base, self.backoff = tries, base, backoff
    def __call__(self, fn, *a, **kw):
        last = None
        for i in range(self.tries):
            try:
                return fn(*a, **kw), None
            except Exception as e:
                last = e
                LOG.warning("retry %d/%d failed: %s", i + 1, self.tries, e)
                time.sleep(self.base * (self.backoff ** i))
        raise last

class RateLimit:
    """simple token bucket per-second-per-worker throttle."""
    def __init__(self, per_min=60): self.per_min = per_min; self.stamps = []
    def wait(self):
        now = time.time()
        self.stamps = [s for s in self.stamps if now - s < 60]
        if len(self.stamps) >= self.per_min:
            time.sleep(max(0.2, 60 - (now - self.stamps[0])))
        self.stamps.append(time.time())

def multipart_body(files: dict, fields: dict = None):
    """Build a multipart/form-data body: files {name: path} + optional form fields."""
    import uuid
    boundary = uuid.uuid4().hex
    body = b""
    for k, v in (fields or {}).items():
        body += (f"--{boundary}\r\nContent-Disposition: form-data; name=\"{k}\"\r\n\r\n{v}\r\n").encode()
    for field, path in files.items():
        p = Path(path)
        body += (f"--{boundary}\r\nContent-Disposition: form-data; name=\"{field}\"; "
                 f"filename=\"{p.name}\"\r\nContent-Type: {mimetypes.guess_type(p.name)[0] or 'application/octet-stream'}\r\n\r\n").encode()
        body += p.read_bytes() + b"\r\n"
    body += f"--{boundary}--\r\n".encode()
    return boundary, body

def slug_id(prefix: str, sku: str) -> str:
    s = hashlib.sha1(sku.encode()).hexdigest()[:10]
    return f"{prefix}_{s}"

def sku_from_pdf(seq: int, cat: str) -> str:
    """Stable sequential SKU — unaffected by cover-page skipping or page layout."""
    return f"SHV-{cat[:3].upper()}-{seq:04d}"

def img_ok(path: Path, min_px=256):
    try:
        from PIL import Image
        im = Image.open(path); im.verify()
        with Image.open(path) as im2:
            return im2.width >= min_px and im2.height >= min_px
    except Exception:
        return False
