#!/usr/bin/env python3
"""v113b patch set — bug fixes on top of the v113 work already on main.

Run from the repo root:  python3 tools/mega/patch-v113b.py
Idempotent: an edit whose result is already present is skipped and reported.
"""
import io
import sys

ROOT = 'cms/js/'
EDITS = []


def edit(path, old, new, label):
    EDITS.append((path, old, new, label))


# ─────────────────────────────────────────────────────────────────────────────
# 1 · carousel: start() must be idempotent or the timers stack up
# ─────────────────────────────────────────────────────────────────────────────
edit('app.js',
     """  const stop = () => clearInterval(window._carTimer);""",
     """  const stop = () => { clearInterval(window._carTimer); window._carTimer = null; };""",
     'carousel stop() clears the handle')

edit('app.js',
     """  const start = () => {
    // v42: slower auto-advance on mobile (12s vs 5.5s desktop) so it glides, not jumps""",
     """  const start = () => {
    /* v113b - never stack intervals. Every pointercancel / lostpointercapture /
       visibilitychange used to add another timer on top of the running one, so
       after a scroll or a tab switch the deck advanced two, three, four slides
       per tick. clearInterval first makes start() idempotent. */
    clearInterval(window._carTimer);
    // v42: slower auto-advance on mobile (12s vs 5.5s desktop) so it glides, not jumps""",
     'carousel start() is idempotent')

# ─────────────────────────────────────────────────────────────────────────────
# 2 · KYC: a wrong OTP must be retryable, and a code sent to an old number
#     must never be accepted
# ─────────────────────────────────────────────────────────────────────────────
edit('app.js',
     """    if (otpIn) otpIn.addEventListener('input', () => {
      clearTimeout(tO);
      const v = otpIn.value.replace(/\\D/g, '').slice(0, 4);
      if (v.length !== 4 || v === autoCode || window._kyc.otp) return;
      if (!window._kycOtpSent) return;            // nothing to verify yet
      tO = setTimeout(() => { if (otpIn.value.replace(/\\D/g, '').slice(0, 4) === v) { autoCode = v; window.Shivaa.kycOtpVerify(); } }, 260);
    });""",
     """    if (otpIn) otpIn.addEventListener('input', () => {
      clearTimeout(tO);
      const v = otpIn.value.replace(/\\D/g, '').slice(0, 4);
      if (v.length !== 4 || window._kyc.otp) return;
      /* v113b - the code must belong to the number currently typed, and a code
         that FAILED must be retryable: only one that already succeeded (or is
         in flight) is skipped. Before this a mistyped digit left the partner
         looking at a silent form with no way forward but a reload. */
      const now = $('#kyPhone') ? $('#kyPhone').value.replace(/\\D/g, '') : '';
      if (!window._kycOtpSent || window._kycOtpSent !== now) return;   // nothing to verify yet
      if (v === autoCode && window._kycOtpFailed !== v) return;
      tO = setTimeout(() => { if (otpIn.value.replace(/\\D/g, '').slice(0, 4) === v) { autoCode = v; window.Shivaa.kycOtpVerify(); } }, 260);
    });""",
     'KYC auto-verify retries a wrong code')

edit('app.js',
     """  try {
    await api('/api/kyc/verify-otp', { method: 'POST', body: JSON.stringify({ phone, code }) });
    window._kyc.otp = true;
    const st = $('#otpStat'); st.textContent = '✓ Mobile verified'; st.className = 'kyc-status ok';
    window.Shivaa.kycGate();
  } catch (e) { toast(e.message, 'err'); }
  finally { window._kycOtpVerifying = false; }""",
     """  try {
    await api('/api/kyc/verify-otp', { method: 'POST', body: JSON.stringify({ phone, code }) });
    window._kyc.otp = true;
    window._kycOtpFailed = '';                                 // v113b - nothing pending
    const st = $('#otpStat'); st.textContent = '✓ Mobile verified'; st.className = 'kyc-status ok';
    window.Shivaa.kycGate();
  } catch (e) {
    /* v113b - remember the rejected code so the auto-verifier lets the same
       digits be submitted again, clear the field so the retry starts clean, and
       say WHY on the form itself (a toast is easy to miss mid-form). */
    window._kycOtpFailed = code;
    autoCode = '';
    try { $('#kyOtp').value = ''; } catch (err) {}
    const st = $('#otpStat'); if (st) { st.textContent = '✗ ' + e.message; st.className = 'kyc-status bad'; }
    toast(e.message, 'err');
  }
  finally { window._kycOtpVerifying = false; }""",
     'KYC verify records a rejected code')

edit('app.js',
     """  if (which === 'otp') {
    window._kyc.otp = false;
    const st = $('#otpStat'); if (st) { st.textContent = ''; st.className = 'kyc-status'; }
    const otp = $('#kyOtp'); if (otp) otp.value = '';
  }""",
     """  if (which === 'otp') {
    window._kyc.otp = false;
    /* v113b - a code already sent belongs to the number it went to. This runs
       on EVERY keystroke in the phone field (its inline oninput), so it may
       only forget the code when the digits really changed - re-typing or
       re-pasting the same number must not silently disable auto-verify. */
    const ph = $('#kyPhone') ? $('#kyPhone').value.replace(/\D/g, '') : '';
    if (window._kycOtpSent && window._kycOtpSent !== ph) {
      window._kycOtpSent = '';
      window._kycOtpFailed = '';
    }
    const st = $('#otpStat'); if (st) { st.textContent = ''; st.className = 'kyc-status'; }
    const otp = $('#kyOtp'); if (otp) otp.value = '';
  }""",
     'KYC clears the sent marker when the phone changes')

# ─────────────────────────────────────────────────────────────────────────────
# 3 · login: the 10th digit must not be able to fire two SMS
# ─────────────────────────────────────────────────────────────────────────────
edit('auth.js',
     """  let otpPhone = '', otpTimer = null, resendLeft = 0, verifiedPhone = '';""",
     """  let otpPhone = '', otpTimer = null, resendLeft = 0, verifiedPhone = '';
  /* v113b - the retail door auto-sends on the 10th digit. These two flags keep
     that auto-send and a tapped Send button/resend from reaching the SMS
     gateway twice for the same number. */
  let otpSentFor = '', otpInFlight = false;""",
     'login tracks which number already has a code')

edit('auth.js',
     """      const ph = inp.value;
      if (ph.length !== 10 || ph === autoSent || !/^[6-9]\\d{9}$/.test(ph)) return;
      autoT = setTimeout(async () => {
        if (inp.value !== ph) return;
        autoSent = ph; otpPhone = ph;
        const e0 = $('#shvErr'); if (e0) e0.hidden = true;
        await sendOtp();
      }, 260);""",
     """      const ph = inp.value;
      if (ph !== otpSentFor) otpSentFor = '';      // v113b - edited number, no live code
      if (ph.length !== 10 || ph === autoSent || !/^[6-9]\\d{9}$/.test(ph)) return;
      autoT = setTimeout(async () => {
        if (inp.value !== ph) return;
        autoSent = ph; otpPhone = ph;
        if (otpInFlight || otpSentFor === ph) return;   // v113b - one SMS per number
        const e0 = $('#shvErr'); if (e0) e0.hidden = true;
        await sendOtp();
      }, 260);""",
     'login auto-send cannot double-fire')

edit('auth.js',
     """  async function sendOtp() {
    const btn = $('#shvPhoneBtn') || $('#shvResend');
    if (btn) busy(btn, true, 'Sending\\u2026');
    try {""",
     """  async function sendOtp() {
    if (otpInFlight) return;                       // v113b - one send in flight, ever
    const btn = $('#shvPhoneBtn') || $('#shvResend');
    otpInFlight = true;
    if (btn) busy(btn, true, 'Sending\\u2026');
    try {""",
     'sendOtp is serialised')

edit('auth.js',
     """      pendingNew = d.hasAccount === false;
      busy(btn, false);
      go('otp');""",
     """      pendingNew = d.hasAccount === false;
      otpSentFor = otpPhone;                       // v113b - this number has a live code
      busy(btn, false);
      go('otp');""",
     'sendOtp records the number it sent to')

edit('auth.js',
     """      startResend();
    } catch (e) { busy(btn, false); showErr('No connection — please check your internet and retry'); }
  }""",
     """      startResend();
    } catch (e) { busy(btn, false); showErr('No connection — please check your internet and retry'); }
    finally { otpInFlight = false; }        // v113b - released on success, error and early return
  }""",
     'sendOtp releases the in-flight flag')

# ─────────────────────────────────────────────────────────────────────────────
# 4 · broken-image net (one capture listener for every <img> on every page)
# ─────────────────────────────────────────────────────────────────────────────
edit('app.js',
     """/* ─────────── 3D + motion helpers ─────────── */""",
     """/* ── v113b · the broken-image net ─────────────────────────────────────────
   Any <img> whose file is missing — a category photo that was never shot, a
   product image pulled from the CDN, a stale cached URL — used to show the
   browser's torn-page icon in the middle of the collection grid. Now it
   degrades to the house monogram. One capture listener covers every image on
   every page, including ones rendered later, so no render path can forget it.
   Images that carry their own inline onerror (the product cards, which swap in
   the logo) are left to their own handler. */
(function brokenImageNet() {
  const FB = 'data:image/svg+xml,' + encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180' viewBox='0 0 180 180'>" +
    "<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>" +
    "<stop offset='0' stop-color='#4a1220'/><stop offset='1' stop-color='#26070d'/></linearGradient></defs>" +
    "<rect width='180' height='180' fill='url(#g)'/>" +
    "<path d='M90 52l11 15-11 15-11-15z' fill='#d4af5a' fill-opacity='.9'/>" +
    "<path d='M62 106h56' stroke='#d4af5a' stroke-opacity='.34' stroke-width='2'/>" +
    "<path d='M74 118h32' stroke='#d4af5a' stroke-opacity='.18' stroke-width='2'/></svg>");
  window.addEventListener('error', (e) => {
    const t = e.target;
    if (!t || t.tagName !== 'IMG' || t.dataset.imgFb || t.hasAttribute('onerror')) return;
    t.dataset.imgFb = '1';
    t.src = FB;
  }, true);
})();

/* ─────────── 3D + motion helpers ─────────── */""",
     'broken-image net installed')

for path, old, new, label in EDITS:
    full = ROOT + path
    s = io.open(full, encoding='utf-8').read()
    if new in s:
        print('SKIP  %-46s %s (already applied)' % (label, path))
        continue
    n = s.count(old)
    if n != 1:
        print('FAIL  %-46s %s — anchor found %d times' % (label, path, n))
        sys.exit(1)
    io.open(full, 'w', encoding='utf-8').write(s.replace(old, new, 1))
    print('OK    %-46s %s' % (label, path))
print('\nall v113b edits applied')
