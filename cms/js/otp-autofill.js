/* ═══════════════════════════════════════════════════════════════
   SHIVAA · OTP auto-fill (v33)
   ─────────────────────────────────────────────────────────────
   Android Chrome (and derivatives): the SMS ends with
   “@shivaa.in #1234”, so this module asks the browser
   (WebOTP API) to read it and fills the boxes by itself —
   the customer just taps Verify.
   iOS Safari / others: no API available, but the inputs carry
   autocomplete="one-time-code", so the keyboard itself suggests
   the code above the letters — one tap fills it.

   v105 adds ShivaaOtp.enhance(group, { onComplete }) — the shared box
   behaviour used by every OTP field on the site: paste auto-splits across
   the boxes, autofill of a whole code lands correctly, typing auto-advances,
   backspace walks back, and a complete code fires once (so the server's
   5-try limit is never burned by duplicate events).

   Usage:  ShivaaOtp.watch(elementOrId [, onCode])   — start listening
           ShivaaOtp.stop()                         — stop (modal closed)
           ShivaaOtp.enhance(elementOrId, opts)     — wire a box group
   Works with a 6-box group (.otp-boxes / .shv-otp), a 4-box group, or a
   single input.
   Silently does nothing where the API is unsupported.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var ctl = null;

  /* v106 — how many digits this field expects: the group's own box count,
     its data-otp-len, or a single input's maxlength. Never hardcoded. */
  function otpLenOf(target) {
    var el = typeof target === 'string' ? document.getElementById(target) : target;
    if (!el) return 4;
    if (el.dataset && el.dataset.otpLen) return +el.dataset.otpLen || 4;
    var boxes = el.querySelectorAll ? el.querySelectorAll('input') : [];
    if (boxes.length) return boxes.length;
    var ml = +(el.maxLength || 0);
    return ml > 1 ? ml : 4;
  }

  function fill(target, code) {
    var el = typeof target === 'string' ? document.getElementById(target) : target;
    if (!el || !code) return false;
    if (el._otp && el._otp.set) { el._otp.set(code); return true; }
    if (el.classList && el.classList.contains('otp-boxes')) {
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
      var len = otpLenOf(target);
      var code = String(cred.code).replace(/\D/g, '').slice(-len);
      if (code.length !== len || !fill(target, code)) return;
      if (typeof onCode === 'function') onCode(code);
    } catch (e) { /* dismissed or aborted — silent */ }
  }

  /* ─────────── v105 · shared OTP box behaviour ─────────── */
  function enhance(target, opts) {
    opts = opts || {};
    var el = typeof target === 'string' ? document.getElementById(target) : target;
    if (!el) return null;
    var boxes = Array.prototype.slice.call(el.querySelectorAll('input'));
    if (!boxes.length) return null;
    var n = boxes.length;
    if (el._otpEnh) { if (opts.onComplete) el._otpOnComplete = opts.onComplete; return el; }
    el._otpEnh = true;
    el.dataset.otpLen = String(n);

    var lastFired = '';
    var value = function () { return boxes.map(function (b) { return b.value.replace(/\D/g, ''); }).join(''); };
    var fire = function () {
      var v = value();
      if (v.length === n) {
        el.classList.add('filled');
        if (v === lastFired) return;
        lastFired = v;
        el.dispatchEvent(new CustomEvent('otpcomplete', { detail: { code: v }, bubbles: true }));
        var cb = opts.onComplete || el._otpOnComplete;
        if (typeof cb === 'function') { try { cb(v); } catch (e) { /* a handler error must not strand the boxes */ } }
      } else {
        el.classList.remove('filled');
      }
    };
    var distribute = function (from, str) {
      var i = from;
      for (var k = 0; k < str.length && i < n; k++, i++) boxes[i].value = str[k];
      return Math.min(i, n - 1);
    };

    boxes.forEach(function (inp, i) {
      inp.setAttribute('maxlength', '1');
      inp.addEventListener('focus', function () { try { inp.select(); } catch (e) {} el.classList.add('typing'); });
      inp.addEventListener('blur', function () { el.classList.remove('typing'); fire(); });
      inp.addEventListener('input', function () {
        var raw = inp.value.replace(/\D/g, '');
        if (!raw) { inp.value = ''; fire(); return; }
        if (raw.length > 1) {                       // browser/SMS autofill dumped the whole code here
          var last = distribute(i, raw);
          boxes[last].focus();
        } else {
          inp.value = raw;
          if (i < n - 1) boxes[i + 1].focus();
        }
        fire();
      });
      inp.addEventListener('keydown', function (e) {
        if (e.key === 'Backspace') {
          e.preventDefault();
          if (inp.value) { inp.value = ''; }
          else if (i > 0) { boxes[i - 1].value = ''; boxes[i - 1].focus(); }
          fire();
        } else if (e.key === 'ArrowLeft' && i > 0) { e.preventDefault(); boxes[i - 1].focus(); }
        else if (e.key === 'ArrowRight' && i < n - 1) { e.preventDefault(); boxes[i + 1].focus(); }
        else if (e.key === 'Home') { e.preventDefault(); boxes[0].focus(); }
        else if (e.key === 'End') { e.preventDefault(); boxes[n - 1].focus(); }
        else if (e.key === 'Delete') { inp.value = ''; fire(); }
      });
      inp.addEventListener('paste', function (e) {
        e.preventDefault();
        var txt = ((e.clipboardData || window.clipboardData) || {}).getData;
        var raw = txt ? (txt.call(e.clipboardData || window.clipboardData, 'text') || '') : '';
        var d = (raw.match(/\d/g) || []).join('').slice(0, n);
        if (!d) return;
        var last = distribute(i, d);
        boxes[last].focus();
        el.classList.add('pasted'); setTimeout(function () { el.classList.remove('pasted'); }, 760);
        fire();
      });
    });

    el._otp = {
      length: n,
      value: value,
      isComplete: function () { return value().length === n; },
      set: function (code) {
        var d = String(code || '').replace(/\D/g, '').slice(0, n);
        boxes.forEach(function (b, i) { b.value = d[i] || ''; });
        if (d.length) boxes[Math.min(d.length, n) - 1].focus();
        fire();
      },
      reset: function () {
        boxes.forEach(function (b) { b.value = ''; });
        lastFired = '';
        el.classList.remove('filled', 'verified', 'bad');
        if (boxes[0]) boxes[0].focus();
      },
      verified: function (on) { el.classList.toggle('verified', on !== false); el.classList.remove('bad'); },
      fail: function () { el.classList.add('bad'); setTimeout(function () { el.classList.remove('bad'); }, 900); },
      focus: function () { if (boxes[0]) boxes[0].focus(); },
    };
    return el;
  }

  function stop() {
    if (ctl) { try { ctl.abort(); } catch (e) { /* noop */ } ctl = null; }
  }

  window.ShivaaOtp = { watch: watch, stop: stop, fill: fill, enhance: enhance };
})();
