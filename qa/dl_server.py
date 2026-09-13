#!/usr/bin/env python3
"""v107 download server :8099 — direct link to the update zip."""
import http.server, os, socketserver

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGE = """<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Shivaa v107 update</title>
<style>
 body{margin:0;min-height:100vh;display:grid;place-items:center;background:radial-gradient(120%% 90%% at 50%% -10%%,#5a1620,#2a0a10 60%%);color:#f7efe4;font:15px/1.6 system-ui,sans-serif;text-align:center;padding:24px}
 .card{max-width:560px;background:rgba(0,0,0,.25);border:1px solid rgba(212,175,90,.35);border-radius:20px;padding:34px 30px}
 h1{color:#f6e3b4;font-size:26px;margin:0 0 6px}
 p{color:#c9b394}
 a.btn{display:inline-block;margin:18px 0 6px;padding:14px 34px;border-radius:999px;background:linear-gradient(135deg,#f6e3b4,#d9af63);color:#2a0a10;font-weight:800;text-decoration:none;font-size:16px}
 code{color:#f6e3b4;background:rgba(255,255,255,.08);padding:2px 8px;border-radius:6px}
 ul{text-align:left;color:#c9b394;font-size:13.5px}
</style>
<div class=card>
 <h1>&#10022; Shivaa v107</h1>
 <p>Complete strategic update &mdash; %s bytes &middot; 58 entries &middot; SHA-256 manifest inside</p>
 <a class=btn href="/shivaa-update-v107.zip" download>Download shivaa-update-v107.zip</a>
 <p>Extract straight into <code>public_html</code>. Read <code>READ-ME-FIRST.txt</code> first.</p>
 <ul>
  <li>38 files byte-identical to live v104 &middot; 9 surgical edits &middot; 9 new files</li>
  <li>Payments/checkout bundle, OTP gateway wizard, PWA + sitemap fixes</li>
  <li>Removable UX layer: <code>css/v107.css</code> + <code>js/v107.js</code></li>
 </ul>
</div>"""


class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def do_GET(self):
        if self.path in ('/', '/index.html'):
            size = os.path.getsize(os.path.join(ROOT, 'shivaa-update-v107.zip'))
            body = (PAGE % f"{size:,}").encode()
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        if self.path.startswith('/shivaa-update-v107.zip'):
            self.path = '/shivaa-update-v107.zip'
            self.send_response(200)
            self.send_header('Content-Type', 'application/zip')
            self.send_header('Content-Disposition', 'attachment; filename="shivaa-update-v107.zip"')
            length = os.path.getsize(os.path.join(ROOT, 'shivaa-update-v107.zip'))
            self.send_header('Content-Length', str(length))
            self.end_headers()
            with open(os.path.join(ROOT, 'shivaa-update-v107.zip'), 'rb') as f:
                self.wfile.write(f.read())
            return
        self.send_error(404)

    def log_message(self, *a):
        pass


socketserver.ThreadingTCPServer.allow_reuse_address = True
with socketserver.ThreadingTCPServer(('0.0.0.0', 8099), H) as httpd:
    httpd.serve_forever()
