#!/usr/bin/env python3
"""Deliver pending Arena bridge jobs to the live billing app.

Called by .github/workflows/billing-bridge.yml. Lives in its own file rather
than a shell heredoc because a heredoc's terminator has to land at column 0 of
the script GitHub Actions actually runs, and YAML block-scalar indentation
makes that easy to break silently — which it did.

Reads every billing/jobs/*.json that is not a receipt, stamps on the shop
admin password, a fresh nonce and the current time, POSTs it, and writes
<name>.receipt.json. A job is deleted only once the endpoint genuinely
answered, so a failed delivery is retried rather than lost.

HTTP 200 alone proves nothing: when inbox.php is not installed the storefront
SPA fallback answers 200 with the homepage.
"""
import datetime
import glob
import json
import os
import re
import secrets
import subprocess
import sys
import time

ENDPOINT = os.environ.get('ENDPOINT', 'https://shivaa.in/billing/inbox.php')
AUTH = os.environ.get('SHIVAA_ADMIN_PASSWORD', '')


def site_version():
    """The billing version actually being served, read from the meta tag
    index.php now emits. Stamped into every receipt so the repo always shows
    which code was live at delivery time — the sandbox cannot reach shivaa.in,
    and behaviour alone could not tell v9 from v10 apart."""
    try:
        proc = subprocess.run(['curl', '-s', '--max-time', '15',
                               'https://shivaa.in/billing/'],
                              capture_output=True, text=True)
        m = re.search(r'name="billing-version" content="([^"]+)"', proc.stdout)
        return m.group(1) if m else 'meta tag not found'
    except Exception as e:
        return 'unknown (%s)' % e


def deliver(path):
    with open(path) as f:
        job = json.load(f)

    payload = dict(job)
    payload['auth'] = AUTH
    payload['nonce'] = secrets.token_hex(16)
    payload['ts'] = int(time.time())

    proc = subprocess.run(
        ['curl', '-s', '-D', '/tmp/bridge-hdr', '-o', '/tmp/bridge-resp',
         '-w', '%{http_code}', '--max-time', '60',
         '-H', 'Content-Type: application/json',
         '--data-binary', json.dumps(payload), ENDPOINT],
        capture_output=True, text=True)

    code = (proc.stdout or '000').strip() or '000'

    ctype = ''
    try:
        for line in open('/tmp/bridge-hdr', errors='replace'):
            if line.lower().startswith('content-type:'):
                ctype = line.split(':', 1)[1].strip()
    except OSError:
        pass

    try:
        body = open('/tmp/bridge-resp', errors='replace').read()
    except OSError:
        body = ''

    try:
        parsed = json.loads(body)
    except Exception:
        parsed = None

    accepted = (code == '200' and isinstance(parsed, dict)
                and 'ok' in parsed and 'application/json' in ctype)

    receipt = {
        'job': os.path.basename(path),
        'http': code,
        'content_type': ctype,
        'delivered_at': datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ'),
        'accepted': accepted,
        'response': parsed if parsed is not None else body[:400],
        'site_version': site_version(),
    }
    if not accepted:
        receipt['note'] = (
            'The endpoint did not answer as JSON. Most likely '
            'billing/inbox.php is not installed yet, so the storefront '
            'fallback served its homepage instead.')

    base = path[:-5] if path.endswith('.json') else path
    with open(base + '.receipt.json', 'w') as f:
        json.dump(receipt, f, indent=2)

    print('  %s -> http %s, content-type %s, accepted %s'
          % (os.path.basename(path), code, ctype or '-', accepted))
    if accepted:
        os.remove(path)
        print('  job consumed')
    else:
        print('  NOT accepted - job left in place for retry')
    return accepted


def main():
    if not AUTH:
        print('SHIVAA_ADMIN_PASSWORD is empty - cannot authenticate')
        return 1

    jobs = sorted(p for p in glob.glob('billing/jobs/*.json')
                  if not p.endswith('.receipt.json'))
    print('found %d pending job file(s)' % len(jobs))
    if not jobs:
        return 0

    failures = 0
    for j in jobs:
        try:
            if not deliver(j):
                failures += 1
        except Exception as e:
            print('  %s -> EXCEPTION %s' % (j, e))
            failures += 1
    # Exit non-zero only if every delivery failed, so the run is visibly red
    # when nothing landed, but a partial batch still commits its receipts.
    return 1 if failures == len(jobs) else 0


if __name__ == '__main__':
    sys.exit(main())
