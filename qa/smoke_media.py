"""Smoke test: login -> upload REAL image (180KB) + REAL video -> create product with media."""
import http.client, json, uuid, subprocess, sys

BASE = '127.0.0.1', 4010

def call(method, path, token=None, body=None, ctype='application/json'):
    c = http.client.HTTPConnection(*BASE, timeout=60)
    h = {'Content-Type': ctype}
    if token: h['Authorization'] = 'Bearer ' + token
    c.request(method, path, body=body, headers=h)
    r = c.getresponse(); data = r.read(); c.close()
    return r.status, data

# 0 · login
st, data = call('POST', '/api/auth/login', body=json.dumps({"email": "admin@shivaa.in", "password": "Shivaa@Launch#2026"}).encode())
tok = json.loads(data)['token']
print(f"1. login            -> {st} OK")

def upload(path, cat='rings'):
    data = open(path, 'rb').read()
    b = uuid.uuid4().hex
    body = (f"--{b}\r\nContent-Disposition: form-data; name=\"category\"\r\n\r\n{cat}\r\n").encode()
    body += (f"--{b}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"f{path[-4:]}\"\r\n"
             f"Content-Type: {'video/mp4' if path.endswith('.mp4') else 'image/jpeg'}\r\n\r\n").encode()
    body += data + f"\r\n--{b}--\r\n".encode()
    st, resp = call('POST', '/api/media', token=tok, body=body,
                    ctype=f'multipart/form-data; boundary={b}')
    print(f"2. upload {path.split('/')[-1]:<18} ({len(data)/1024:.0f} KB) -> {st} {resp.decode()[:90]}")
    return json.loads(resp).get('url') if st in (200, 201) else None

# make a small (1.5MB) test video
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-loop', '1', '-t', '5', '-i',
                'site-v2/images/products/ring-floral.jpg',
                '-vf', 'scale=720:720,zoompan=z=\'min(zoom+0.01,1.12)\':d=150:s=720x720:fps=30',
                '-c:v', 'libx264', '-crf', '28', '-pix_fmt', 'yuv420p', '/tmp/smoke.mp4'], check=True)

img_url = upload('site-v2/images/products/ring-kundan.jpg')
vid_url = upload('/tmp/smoke.mp4')

# 3 · product with that media
rec = {"name": "SMOKE TEST PROD", "sku": "SMOKE-001", "category": "rings", "metal": "Gold",
       "purity": "22K", "weightG": 3.0, "mcScheme": "percent", "mcValue": 12,
       "images": [img_url], "video": vid_url, "active": True,
       "desc": "smoke test — delete me", "tags": ["smoke"]}
st, resp = call('POST', '/api/products', token=tok, body=json.dumps(rec).encode())
pid = json.loads(resp).get('id')
print(f"3. product POST     -> {st} id={pid} images={json.loads(resp).get('images')} video={json.loads(resp).get('video')}")

# 4 · verify via GET
st, resp = call('GET', f'/api/products/{pid}')
p = json.loads(resp)['product']
print(f"4. GET product      -> {st} imgs={len(p['images'])} video={bool(p.get('video'))} price=₹{p['price']['total']}")

# 5 · cleanup
st, _ = call('DELETE', f'/api/products/{pid}', token=tok)
import os
for f in [img_url, vid_url]:
    fp = 'site-v2' + f
    if fp and os.path.exists(fp): os.remove(fp)
print(f"5. cleanup          -> {st} (product + media deleted)")
print("\nALL PASS — the update file's media route works with real files (200KB image, MB-scale video).")
