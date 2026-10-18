#!/usr/bin/env python3
"""v229 — the HTTP round trip, end to end, against qa/preview_shim.py.

    python3 qa/build-test-db.py --with-staff
    python3 qa/preview_shim.py --port 8090 &
    python3 qa/v229-routes.py

Why a script and not a browser suite: these are the parts a jsdom run cannot
reach — a real multipart upload, a real byte-for-byte file stream, real 401/403/
409 boundaries between three different people. Everything here is a contract the
owner depends on: his note must not leak, another customer must not see a bill,
a text file renamed .png must be refused, and a renewal must not change the
number printed on the plastic card.

It REFUSES to run twice against the same shim (exit 3 + SKIP), because the dev
layer keeps uploaded bills and renewals in RAM: run 2 would fail on fixture
drift and teach everyone to ignore a red gate. Restart the shim, or rebuild the
fixture, and run it again.
"""
import io
import json
import os
import sys
import urllib.error
import urllib.request

BASE = os.environ.get('SHIVAA_BASE', 'http://127.0.0.1:8090')
PW = 'shivaa123'
MEMBER = '9308956260'
STRANGER = '9812345678'

ok, bad = [], []


def T(name, cond, extra=''):
    (ok if cond else bad).append(name + ((' → ' + str(extra)) if extra and not cond else ''))
    if not cond:
        print('  ✗ %s%s' % (name, (' → ' + str(extra)) if extra else ''))


def req(method, path, body=None, token=None, raw=None, ctype=None):
    url = BASE + path
    data = raw if raw is not None else (json.dumps(body).encode() if body is not None else None)
    r = urllib.request.Request(url, data=data, method=method)
    if token:
        r.add_header('Authorization', 'Bearer ' + token)
    if data is not None:
        r.add_header('Content-Type', ctype or 'application/json')
    try:
        with urllib.request.urlopen(r, timeout=25) as resp:
            payload = resp.read()
            return resp.status, dict(resp.headers), payload
    except urllib.error.HTTPError as e:
        payload = e.read()
        return e.code, dict(e.headers), payload


def jget(path, token=None):
    st, hd, body = req('GET', path, token=token)
    try:
        return st, json.loads(body or b'{}')
    except ValueError:
        return st, {'_raw': body[:120]}


def jpost(path, body=None, token=None):
    st, hd, raw = req('POST', path, body=body if body is not None else {}, token=token)
    try:
        return st, json.loads(raw or b'{}')
    except ValueError:
        return st, {'_raw': raw[:120]}


def multipart(fields, files):
    """files: list of (fieldname, filename, bytes). Hand-built: no cgi module."""
    boundary = '----shivaaV229' + os.urandom(6).hex()
    out = io.BytesIO()
    for k, v in fields.items():
        out.write(('--' + boundary + '\r\n').encode())
        out.write(('Content-Disposition: form-data; name="%s"\r\n\r\n' % k).encode())
        out.write((str(v) + '\r\n').encode())
    for name, filename, data in files:
        out.write(('--' + boundary + '\r\n').encode())
        out.write(('Content-Disposition: form-data; name="%s"; filename="%s"\r\n' % (name, filename)).encode())
        out.write(b'Content-Type: application/octet-stream\r\n\r\n')
        out.write(data)
        out.write(b'\r\n')
    out.write(('--' + boundary + '--\r\n').encode())
    return out.getvalue(), 'multipart/form-data; boundary=' + boundary


def otp_login(phone):
    st, p = jpost('/api/auth/send-otp', {'phone': phone})
    if st != 200:
        return None, 'send-otp %d %s' % (st, p)
    code = p.get('code') or p.get('previewCode') or p.get('devCode')
    if not code:
        return None, 'the shim did not reveal a code: %s' % list(p)[:8]
    st, p = jpost('/api/auth/otp-login', {'phone': phone, 'code': str(code)})
    if st != 200 or not p.get('token'):
        return None, 'otp-login %d %s' % (st, p)
    return p['token'], p


# a real 1x1 PNG, and a text file wearing a .png filename
PNG = bytes.fromhex('89504e470d0a1a0a0000000d494844520000000100000001080600000'
                    '01f15c4890000000a49444154789c6300010000050001'
                    '0d0a2db40000000049454e44ae426082')
NOT_AN_IMAGE = b'this is a text file wearing a .png filename\n'


def main():
    print('v229 round trip against %s' % BASE)

    # ── 0 · freshness: a dirty shim is refused, not quietly failed ──────────
    st, owner_login = jpost('/api/auth/login', {'email': 'owner@shivaa.in', 'password': PW})
    if st != 200 or not owner_login.get('token'):
        print('SKIP: cannot sign in as the owner (%d %s).' % (st, owner_login))
        print('      Rebuild the staffed fixture and restart the shim:')
        print('        python3 qa/build-test-db.py --with-staff')
        print('        python3 qa/preview_shim.py --port 8090')
        return 3
    admin = owner_login['token']
    st, pre = jget('/api/admin/store-bills', token=admin)
    if st == 200 and pre.get('count'):
        print('SKIP: this shim already carries %d uploaded bill(s) — the dev layer keeps'
              % pre.get('count'))
        print('      them in RAM, so a second run would fail on fixture drift, not on code.')
        print('      Restart the shim and run again.')
        return 3

    # ── 1 · the queue the owner asked for ───────────────────────────────────
    st, q = jget('/api/admin/black-card/queue', token=admin)
    T('queue: the owner sees it', st == 200, st)
    T('queue: one member, one free card still to post',
      q.get('members') == 1 and q.get('toShip') == 1, q)
    T('queue: the percentage it reports is the shipped 20', q.get('pct') == 20, q.get('pct'))
    T('queue: that member is inside the renewal window', q.get('renewable') == 1, q)
    st, _ = jget('/api/admin/black-card/queue')
    T('queue: no token, no answer', st in (401, 403), st)

    # ── 2 · the member reads her own card ───────────────────────────────────
    mem, info = otp_login(MEMBER)
    T('member: OTP sign-in works', bool(mem), info)
    if not mem:
        return 1
    st, m = jget('/api/black-card', token=mem)
    card = m.get('membership') or {}
    T('member: she has a card', st == 200 and bool(card), st)
    T('member: the value stored on the card is overridden by the setting (20)',
      card.get('discountPct') == 20, card.get('discountPct'))
    T('member: the card reports its renewal facts',
      card.get('renewable') is True and 15 <= int(card.get('daysLeft') or 0) <= 20
      and card.get('renewals') == 0,
      {k: card.get(k) for k in ('renewable', 'daysLeft', 'renewals')})
    T('member: the certificate number is not the member id',
      card.get('certificateNo') and card.get('certificateNo') != card.get('memberId'),
      (card.get('certificateNo'), card.get('memberId')))
    number_before = card.get('cardNumber')
    expiry_before = card.get('expiresAt')

    # ── 3 · renewal, in one tap, from her own account ───────────────────────
    st, r = jpost('/api/black-card/renew', {}, token=mem)
    T('renew: it succeeds inside the window', st == 200 and r.get('ok') is True, (st, r))
    got = r.get('membership') or {}
    T('renew: the card number never changes',
      got.get('cardNumber') == number_before, (number_before, got.get('cardNumber')))
    T('renew: six calendar months were added',
      str(got.get('expiresAt', ''))[:7] > str(expiry_before)[:7]
      and str(got.get('expiresAt', ''))[:4] >= str(expiry_before)[:4],
      (expiry_before, got.get('expiresAt')))
    T('renew: the counter moved and the old expiry is kept',
      got.get('renewals') == 1 and r.get('previousExpiresAt') == expiry_before, r)
    st, again = jpost('/api/black-card/renew', {}, token=mem)
    T('renew: a second tap straight after is refused with the days left',
      st == 409 and 'days to go' in str(again.get('error', '')), (st, again))
    st, _ = jpost('/api/black-card/renew', {})
    T('renew: no token, no renewal', st == 401, st)
    st, _ = jpost('/api/admin/black-card/renew', {'userId': 'u_aarti', 'months': 6}, token=mem)
    T('renew: a member cannot use the owner route', st == 403, st)

    # ── 4 · the free card's journey ─────────────────────────────────────────
    st, d = jpost('/api/admin/black-card/delivery', {'userId': 'u_aarti', 'status': 'printed'}, token=admin)
    T('delivery: to-ship → printed', st == 200 and (d.get('delivery') or {}).get('status') == 'printed', (st, d))
    st, d = jpost('/api/admin/black-card/delivery',
                  {'userId': 'u_aarti', 'status': 'shipped', 'trackingNo': 'RJ7712345678'}, token=admin)
    T('delivery: printed → shipped with a tracking number',
      st == 200 and (d.get('delivery') or {}).get('trackingNo') == 'RJ7712345678', (st, d))
    st, d = jpost('/api/admin/black-card/delivery', {'userId': 'u_aarti', 'status': 'posted'}, token=admin)
    T('delivery: an invented status is refused', st == 400, (st, d))
    st, d = jpost('/api/admin/black-card/delivery', {'userId': 'u_aarti', 'status': 'printed'}, token=mem)
    T('delivery: a member cannot move it', st == 403, st)
    st, q2 = jget('/api/admin/black-card/queue', token=admin)
    T('queue: nothing is left to post', q2.get('toShip') == 0 and q2.get('shipped') == 1, q2)

    # ── 5 · the owner uploads a paper bill ──────────────────────────────────
    fields = {'customerName': 'Aarti Sharma', 'phone': MEMBER, 'billNo': 'SJ/26/0417',
              'billDate': '2026-10-02', 'store': 'Shivaa Jewels · Jaipur', 'amount': '52400',
              'items': '22K gold bangle pair · 18.40 g', 'notes': 'paid by UPI, old chain exchanged'}
    raw, ctype = multipart(fields, [('files[]', 'bill-page-1.png', PNG)])
    st, hd, body = req('POST', '/api/admin/store-bills', raw=raw, ctype=ctype, token=admin)
    up = json.loads(body or b'{}')
    T('upload: the owner can save a bill', st == 200 and up.get('ok') is True, (st, up))
    T('upload: it auto-linked to her account by the mobile on the paper',
      up.get('linked') is True, up.get('linked'))
    bill = up.get('bill') or {}
    bill_id = bill.get('id')
    T('upload: the owner-side record keeps his private note',
      bill.get('notes') == fields['notes'], bill.get('notes'))
    T('upload: one file, recognised by its bytes',
      len(bill.get('files') or []) == 1 and bill['files'][0].get('ext') == 'png'
      and bill['files'][0].get('size') == len(PNG), bill.get('files'))
    T('upload: the stored reference is not in the payload at all',
      'ref' not in json.dumps(bill.get('files')), bill.get('files'))

    raw, ctype = multipart(fields, [('files[]', 'lie.png', NOT_AN_IMAGE)])
    st, hd, body = req('POST', '/api/admin/store-bills', raw=raw, ctype=ctype, token=admin)
    T('upload: a text file named .png is refused on its bytes', st == 400, (st, body[:90]))

    bad_fields = dict(fields, billDate='2030-01-01')
    raw, ctype = multipart(bad_fields, [('files[]', 'b.png', PNG)])
    st, hd, body = req('POST', '/api/admin/store-bills', raw=raw, ctype=ctype, token=admin)
    T('upload: a bill dated in the future is refused', st == 400, (st, body[:90]))

    raw, ctype = multipart(fields, [('files[]', 'b.png', PNG)])
    st, hd, body = req('POST', '/api/admin/store-bills', raw=raw, ctype=ctype)
    T('upload: no token, no upload', st in (401, 403), st)
    st, hd, body = req('POST', '/api/admin/store-bills', raw=raw, ctype=ctype, token=mem)
    T('upload: a member cannot upload', st == 403, st)

    # ── 6 · the customer side: view and download, nothing else ──────────────
    st, mine = jget('/api/store-bills', token=mem)
    T('list: she sees exactly her one bill', st == 200 and mine.get('count') == 1, (st, mine))
    row = (mine.get('bills') or [{}])[0]
    T('list: it carries bill no, date, store, items and amount',
      row.get('billNo') == 'SJ/26/0417' and row.get('billDate') == '2026-10-02'
      and row.get('store') == fields['store'] and row.get('items') == fields['items']
      and float(row.get('amount') or 0) == 52400.0, row)
    T('list: the owner note is NOT in her payload', 'notes' not in row, sorted(row))
    T('list: nor is any stored reference', 'ref' not in json.dumps(row), row)
    f0 = (row.get('files') or [{}])[0]
    T('list: her file object is index + type + size only',
      f0.get('i') == 0 and f0.get('ext') == 'png' and f0.get('size') == len(PNG), f0)

    st, hd, data = req('GET', '/api/store-bills/%s/file/0' % bill_id, token=mem)
    T('stream: she can open it', st == 200, st)
    T('stream: the bytes are identical to what the owner uploaded', data == PNG, len(data))
    T('stream: served inline as an image, never sniffed, never cached',
      hd.get('Content-Type') == 'image/png'
      and str(hd.get('Content-Disposition', '')).startswith('inline')
      and hd.get('X-Content-Type-Options') == 'nosniff'
      and 'no-store' in str(hd.get('Cache-Control', '')), hd)
    st, hd2, data2 = req('GET', '/api/store-bills/%s/file/0?download=1' % bill_id, token=mem)
    T('download: ?download=1 switches to attachment, same bytes',
      st == 200 and str(hd2.get('Content-Disposition', '')).startswith('attachment') and data2 == PNG,
      (st, hd2.get('Content-Disposition')))
    st, _, _ = req('GET', '/api/store-bills/%s/file/0' % bill_id)
    T('stream: no token, no document', st == 401, st)
    st, _, _ = req('GET', '/api/store-bills/%s/file/7' % bill_id, token=mem)
    T('stream: a page that does not exist is a 404, not a document', st == 404, st)
    # api.php answers 404 for an unmatched /api/ route; the shim's catch-all
    # answers a generic 200 {} so page boots never stall on a route nobody
    # implemented. Asserting 404 here would test the stub, so what is asserted
    # is the property both of them guarantee: a path-shaped index never
    # produces the document.
    st, hd3, body3 = req('GET', '/api/store-bills/%s/file/..%%2f..%%2findex' % bill_id, token=mem)
    T('stream: a path-shaped index cannot reach a document',
      st >= 400 or (body3 != PNG and 'image/' not in str(hd3.get('Content-Type', ''))),
      (st, hd3.get('Content-Type'), len(body3)))

    other, info2 = otp_login(STRANGER)
    T('stranger: OTP sign-in works', bool(other), info2)
    st, theirs = jget('/api/store-bills', token=other)
    T('stranger: their own list is empty', st == 200 and theirs.get('count') == 0, theirs)
    st, _, _ = req('GET', '/api/store-bills/%s/file/0' % bill_id, token=other)
    T('stranger: 403 on somebody else\'s bill', st == 403, st)
    st, _, _ = req('GET', '/api/store-bills/%s' % bill_id, token=other)
    T('stranger: there is no route that hands over a whole bill by id', st in (404, 405, 200), st)

    # ── 7 · one setting moves the whole programme ───────────────────────────
    st, _, s = req('PUT', '/api/settings', body={'blackDiscountPct': 31}, token=admin)
    T('setting: the owner can move it', st == 200, st)
    st, pub = jget('/api/settings')
    T('setting: the storefront reads the new number', pub.get('blackDiscountPct') == 31, pub.get('blackDiscountPct'))
    st, m31 = jget('/api/black-card', token=mem)
    T('setting: the card follows it', (m31.get('membership') or {}).get('discountPct') == 31,
      (m31.get('membership') or {}).get('discountPct'))
    st, _, s = req('PUT', '/api/settings', body={'blackDiscountPct': 90}, token=admin)
    T('setting: 90 is refused, not stored', st == 400, (st, s))
    st, _, s = req('PUT', '/api/settings', body={'blackDiscountPct': 'soon'}, token=admin)
    T('setting: a word is refused too', st == 400, (st, s))
    st, _, s = req('PUT', '/api/settings', body={'blackDiscountPct': 20}, token=admin)
    T('setting: restored to the shipped default',
      st == 200 and json.loads(s or b'{}').get('blackDiscountPct') == 20, (st, s))
    st, m25 = jget('/api/black-card', token=mem)
    T('setting: and the card is back on 20', (m25.get('membership') or {}).get('discountPct') == 20,
      (m25.get('membership') or {}).get('discountPct'))

    # ── 8 · the desk's destructive verbs ────────────────────────────────────
    raw, ctype = multipart({'notes': 'corrected: part payment received'}, [])
    st, hd, body = req('POST', '/api/admin/store-bills/%s' % bill_id, raw=raw, ctype=ctype, token=admin)
    ed = json.loads(body or b'{}')
    T('edit: the owner can correct a note',
      st == 200 and (ed.get('bill') or {}).get('notes') == 'corrected: part payment received', (st, ed))
    T('edit: the bill number survived the edit',
      (ed.get('bill') or {}).get('billNo') == 'SJ/26/0417', ed.get('bill'))
    st, _, body = req('POST', '/api/admin/store-bills/%s' % bill_id, raw=raw, ctype=ctype, token=mem)
    T('edit: a member cannot', st == 403, st)
    st, _, body = req('DELETE', '/api/admin/store-bills/%s' % bill_id, token=mem)
    T('delete: a member cannot', st == 403, st)
    st, _, body = req('DELETE', '/api/admin/store-bills/%s' % bill_id, token=admin)
    dl = json.loads(body or b'{}')
    T('delete: the owner can, and the stored page goes with it',
      st == 200 and dl.get('filesUnlinked') == 1, (st, dl))
    st, after = jget('/api/store-bills', token=mem)
    T('delete: her list is empty again', after.get('count') == 0, after)
    st, _, _ = req('GET', '/api/store-bills/%s/file/0' % bill_id, token=admin)
    T('delete: the document is really gone', st == 404, st)

    print('\n%d PASS · %d FAIL' % (len(ok), len(bad)))
    for b in bad:
        print('  FAIL ' + b)
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
