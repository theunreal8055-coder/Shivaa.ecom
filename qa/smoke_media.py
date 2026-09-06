"""Smoke test (v42): login -> upload 4 REAL images -> create product -> assert
images-only. Product videos were retired in v42, so this suite also asserts the
negative paths: /api/media rejects a video, and a product POST that carries a
`video` key comes back without one.

Run against a real api.php (php -S 0.0.0.0:4010); the preview shim is read-only.
"""
import http.client, json, uuid, subprocess, sys, os

BASE = '127.0.0.1', 4010
CMS = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'cms')
fails = []

def call(method, path, token=None, body=None, ctype='application/json'):
    c = http.client.HTTPConnection(*BASE, timeout=60)
    h = {'Content-Type': ctype}
    if token: h['Authorization'] = 'Bearer ' + token
    c.request(method, path, body=body, headers=h)
    r = c.getresponse(); data = r.read(); c.close()
    return r.status, data

def check(name, cond, extra=''):
    if not cond: fails.append(name)
    print(('PASS ' if cond else 'FAIL ') + name + (f' — {extra}' if extra else ''))

# 0 · login
st, data = call('POST', '/api/auth/login', body=json.dumps(
    {"email": "admin@shivaa.in", "password": os.environ.get('SHIVAA_ADMIN_PW', '')}).encode())
tok = json.loads(data)['token']
print(f"1. login            -> {st} OK")

def upload(path, cat='rings', ctype=None):
    data = open(path, 'rb').read()
    b = uuid.uuid4().hex
    body = (f"--{b}\r\nContent-Disposition: form-data; name=\"category\"\r\n\r\n{cat}\r\n").encode()
    body += (f"--{b}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"f{path[-4:]}\"\r\n"
             f"Content-Type: {ctype or 'image/jpeg'}\r\n\r\n").encode()
    body += data + f"\r\n--{b}--\r\n".encode()
    st, resp = call('POST', '/api/media', token=tok, body=body,
                    ctype=f'multipart/form-data; boundary={b}')
    return st, resp

# 2 · four real images upload fine
img_urls = []
for name in ['ring-kundan.jpg', 'ring-floral.jpg', 'ring-couple.jpg', 'ring-signet.jpg']:
    p = os.path.join(CMS, 'images', 'products', name)
    if not os.path.exists(p):
        p = os.path.join(CMS, 'images', 'products', 'samples', name)
    if not os.path.exists(p):
        continue
    st, resp = upload(p)
    url = json.loads(resp).get('url') if st in (200, 201) else None
    print(f"2. upload {name:<24} -> {st} {url}")
    if url: img_urls.append(url)
check(f'4 images uploaded via /api/media — got {len(img_urls)}', len(img_urls) == 4)

# 3 · a video is REJECTED by /api/media
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-loop', '1', '-t', '3', '-i',
                os.path.join(CMS, 'images', 'products', 'ring-floral.jpg'),
                '-vf', 'scale=720:720,fps=30', '-c:v', 'libx264', '-crf', '28',
                '-pix_fmt', 'yuv420p', '/tmp/smoke.mp4'], check=True)
st, resp = upload('/tmp/smoke.mp4', ctype='video/mp4')
check('video upload rejected with 400', st == 400, f'status={st} body={resp.decode()[:110]}')
check('rejection message names images-only', 'video' in resp.decode().lower(),
      resp.decode()[:110])

# 4 · product POST carrying a `video` key must come back WITHOUT one
rec = {"name": "SMOKE TEST PROD", "sku": "SMOKE-001", "category": "rings", "metal": "Gold",
       "purity": "22K", "weightG": 3.0, "mcScheme": "percent", "mcValue": 12,
       "images": img_urls, "video": "/uploads/videos/rings/nope.mp4", "active": True,
       "desc": "smoke test — delete me", "tags": ["smoke"]}
st, resp = call('POST', '/api/products', token=tok, body=json.dumps(rec).encode())
created = json.loads(resp)
pid = created.get('id')
print(f"4. product POST     -> {st} id={pid} images={len(created.get('images') or [])}")
check('product created with exactly 4 images', len(created.get('images') or []) == 4)
check('product POST drops the `video` key', 'video' not in created)

# 5 · a PUT that tries to re-attach a video must not stick
st, resp = call('PUT', f'/api/products/{pid}', token=tok,
                body=json.dumps({"video": "/uploads/videos/rings/nope.mp4"}).encode())
check('PUT with a `video` key does not re-attach it', 'video' not in json.loads(resp),
      str(json.loads(resp).get('video')))

# 6 · verify via public GET
st, resp = call('GET', f'/api/products/{pid}')
p = json.loads(resp)['product']
check('GET returns 4 images and no video',
      len(p['images']) == 4 and 'video' not in p,
      f"imgs={len(p['images'])} video={p.get('video')} price=Rs{p['price']['total']}")

# 7 · cleanup
st, _ = call('DELETE', f'/api/products/{pid}', token=tok)
for f in img_urls:
    fp = CMS + f.replace('/uploads/', '/uploads/')
    if fp and os.path.exists(fp): os.remove(fp)
print(f"7. cleanup          -> {st} (product + media deleted)")
print(f"\n{6 - len(fails)} passed · {len(fails)} failed" if not fails else "\nFAILED: " + ', '.join(fails))
sys.exit(1 if fails else 0)
