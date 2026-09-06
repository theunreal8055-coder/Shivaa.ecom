"""Isolated, short-lived PHP test server. Never starts against cms/data/db.json.

Synthetic HUID/session fixtures are for QA only and are deleted with the temp
workspace. Product/rate values are copied from the repository, not invented.
Set PHP_BIN to a native PHP binary or php-wasm-cli; PHP=8.2 selects WASM version.
"""
import collections
import copy
import json
import os
from pathlib import Path
import shlex
import shutil
import signal
import socket
import subprocess
import tempfile
import threading
import time
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
ADMIN_TOKEN = 'qa_admin_session_only'
CUSTOMER_TOKEN = 'qa_customer_session_only'
ENTRY = {'huid': 'TST0A1', 'pieceLabel': 'QA piece only', 'sourceNote': 'SYNTHETIC QA SOURCE — never publish'}


class IsolatedCMS:
    def __init__(self):
        self.tmp = tempfile.TemporaryDirectory(prefix='shivaa-huid-qa-')
        self.cms = Path(self.tmp.name) / 'cms'
        self.cms.mkdir()
        for p in (ROOT / 'cms').glob('*.php'):
            shutil.copy(p, self.cms / p.name)
        shutil.copy(ROOT / 'cms/index.html', self.cms / 'index.html')
        for directory in ('css', 'js'):
            shutil.copytree(ROOT / 'cms' / directory, self.cms / directory)
        for directory in ('images', 'uploads', 'docs'):
            (self.cms / directory).symlink_to(ROOT / 'cms' / directory, target_is_directory=True)
        (self.cms / 'data').mkdir()
        self.db_file = self.cms / 'data/db.json'
        self.fixture = json.loads((ROOT / 'cms/data/db.json').read_text())
        self.fixture['products'] = self.fixture['products'][:3]
        for key in ('users', 'orders', 'partners', 'settlements', 'serviceRequests', 'newsletter', 'contactMsgs', 'rateAlerts', 'bullionOrders', 'metalOrders', 'customOrders', 'reviews', 'pages'):
            self.fixture[key] = []
        for key in ('tokens', 'otps', 'loginfails', 'sms'):
            self.fixture[key] = {}
        for role, token in (('admin', ADMIN_TOKEN), ('customer', CUSTOMER_TOKEN)):
            uid = 'qa_' + role
            self.fixture['users'].append({'id': uid, 'role': role, 'name': 'QA ' + role, 'email': role + '@example.invalid'})
            self.fixture['tokens'][token] = {'userId': uid, 'exp': int(time.time()) + 1800}
        self.ids = [p['id'] for p in self.fixture['products']]
        self.reset()
        self.process = None
        self.log = collections.deque(maxlen=100)

    def reset(self):
        self.db_file.write_text(json.dumps(copy.deepcopy(self.fixture), ensure_ascii=False))

    def start(self):
        with socket.socket() as sock:
            sock.bind(('0.0.0.0', 0))
            port = sock.getsockname()[1]
        self.url = f'http://127.0.0.1:{port}'  # test runner only; browser API calls remain relative
        command = shlex.split(os.environ.get('PHP_BIN', 'php')) + [
            '-S', f'0.0.0.0:{port}', '-t', str(self.cms), str(ROOT / 'qa/php_router.php')]
        env = dict(os.environ, SHIVAA_QA_SNAPSHOT_RATES='1', SHIVAA_PREVIEW_READ_ONLY='0')
        self.process = subprocess.Popen(command, cwd=ROOT, env=env, stdout=subprocess.PIPE,
                                        stderr=subprocess.STDOUT, text=True, start_new_session=True)
        ready = threading.Event()

        def read_log():
            for line in self.process.stdout:
                self.log.append(line.rstrip())
                if 'Development Server' in line and 'started' in line:
                    ready.set()
            ready.set()

        self.reader = threading.Thread(target=read_log, daemon=True)
        self.reader.start()
        if not ready.wait(25) or self.process.poll() is not None:
            raise RuntimeError('PHP test server failed to start: ' + '\n'.join(self.log))
        # WASM can emit PHP's startup line just before Node binds the socket.
        # Bounded readiness within this one-shot test harness, not a dev watcher.
        deadline = time.monotonic() + 5
        while True:
            try:
                if self.request('hallmark/status')[0] == 200:
                    break
            except urllib.error.URLError:
                if time.monotonic() >= deadline:
                    raise RuntimeError('PHP test socket did not become ready')
                time.sleep(.025)
        return self

    def request(self, path, method='GET', body=None, token=None, raw=None, content_type='application/json'):
        headers = {}
        data = raw if raw is not None else (json.dumps(body).encode() if body is not None else None)
        if data is not None:
            headers['Content-Type'] = content_type
        if token:
            headers['Authorization'] = 'Bearer ' + token
        request = urllib.request.Request(self.url + '/api/' + path, data=data, headers=headers, method=method)
        try:
            response = urllib.request.urlopen(request, timeout=15)
        except urllib.error.HTTPError as error:
            response = error
        with response:
            text = response.read().decode()
            return response.status, json.loads(text), response.headers

    def close(self):
        if self.process is not None and self.process.poll() is None:
            os.killpg(self.process.pid, signal.SIGTERM)
            try:
                self.process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                os.killpg(self.process.pid, signal.SIGKILL)
                self.process.wait(timeout=5)
        if hasattr(self, 'reader'):
            self.reader.join(timeout=2)
        if self.process and self.process.stdout:
            self.process.stdout.close()
        self.tmp.cleanup()

    def __enter__(self):
        try:
            return self.start()
        except Exception:
            self.close()
            raise

    def __exit__(self, *args):
        self.close()
