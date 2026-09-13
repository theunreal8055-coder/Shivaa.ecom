/* ═══════════════════════════════════════════════════════════════
   SHIVAA · OTP auto-fill (v33)
   ─────────────────────────────────────────────────────────────
   Android Chrome (and derivatives): the SMS ends with
   “@shivaa.in #123456”, so this module asks the browser
   (WebOTP API) to read it and fills the boxes by itself —
   the customer just taps Verify.
   iOS Safari / others: no API available, but the inputs carry
   autocomplete="one-time-code", so the keyboard itself suggests
   the code above the letters — one tap fills it.

   Usage:  ShivaaOtp.watch(elementOrId [, onCode])   — start listening
           ShivaaOtp.stop()                         — stop (modal closed)
   Works with a 6-box group (.otp-boxes) or a single input.
   Silently does nothing where the API is unsupported.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var ctl = null;

  function fill(target, code) {
    var el = typeof target === 'string' ? document.getElementById(target) : target;
    if (!el || !code) return false;
    if (el.classList && (el.classList.contains('otp-boxes') || el.classList.contains('shv-otp'))) {
      var boxes = el.querySelectorAll('input'), i = 0;
      boxes.forEach(function (b) { b.value = code[i++] || ''; });
      if (boxes.length) { boxes[Math.min(code.length, boxes.length) - 1].focus(); }
      boxes.forEach(function (b) { b.dispatchEvent(new Event('input', { bubbles: true })); });
    } else {
      el.value = code;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
    return true;
  }

  async function watch(target, onCode) {
    stop();
    if (!('OTPCredential' in window) || !navigator.credentials || !navigator.credentials.get) return; // unsupported → keyboard suggestion still helps
    ctl = new AbortController();
    try {
      var cred = await navigator.credentials.get({ otp: { transport: 'sms' }, signal: ctl.signal });
      if (!cred || !cred.code) return;
      var raw = String(cred.code).replace(/\D/g, '');
      var boxes = target && target.querySelectorAll ? target.querySelectorAll('input') : [];
      var want = boxes.length || 4;
      var code = raw.slice(-Math.min(raw.length, want === 6 ? 6 : 4));
      if (![4, 6].includes(code.length) || !fill(target, code)) return;
      if (typeof onCode === 'function') onCode(code);
    } catch (e) { /* dismissed or aborted — silent */ }
  }

  function stop() {
    if (ctl) { try { ctl.abort(); } catch (e) { /* noop */ } ctl = null; }
  }

  window.ShivaaOtp = { watch: watch, stop: stop, fill: fill };
})();
