/* ═══════════════════════════════════════════════════════════════════════
   SHIVAA PASSPORT · the completely-new v32 login system
   ─────────────────────────────────────────────────────────────────────
   One module, own overlay, zero dependence on the old auth modal.
   · Passwordless-first: mobile OTP is the primary door (no password to
     forget — the #1 real-world login failure).
   · New number? The same OTP door flows straight into account creation.
   · Email + password door, jeweller (B2B) door, WhatsApp help.
   · Self-healing aware: explains the preview sandbox, never blames you.
   API used (all pre-existing): auth/send-otp · auth/otp-login ·
   auth/register · auth/login. Landing uses Shivaa.afterLogin().
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.ShivaaAuth) return;                       // idempotent

  /* ── tiny local helpers (no closures shared with app.js) ── */
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $  = sel => document.querySelector(sel);
  const $$ = sel => [...document.querySelectorAll(sel)];
  const digits = s => String(s || '').replace(/\D/g, '');

  let wrap = null, card = null, step = 'start', aud = 'retail';
  let otpPhone = '', otpTimer = null, resendLeft = 0, verifiedPhone = '';
  let intent = '';

  /* ─────────────────────────── shell ─────────────────────────── */
  function ensureShell() {
    if (wrap) return;
    wrap = document.createElement('div');
    wrap.id = 'shvAuthWrap';
    wrap.hidden = true;
    wrap.innerHTML = `
      <div class="shv-backdrop" data-close="1"></div>
      <div class="shv-card" role="dialog" aria-modal="true" aria-label="Sign in to Shivaa">
        <div class="shv-head">
          <span class="shv-emblem" aria-hidden="true"><i></i><i></i><img src="/images/logo.png" alt=""></span>
          <div class="shv-head-tx"><b>Shivaa Passport</b><small id="shvHeadSub">One account for everything</small></div>
          <button type="button" class="shv-x" id="shvX" aria-label="Close">&#10005;</button>
        </div>
        <div class="shv-body" id="shvBody"></div>
        <div class="shv-foot">
          <span>&#128274; Protected sign-in &middot; Shivaa Jewellers, Jayal</span>
          <a href="javascript:void(0)" id="shvHelp">Need help?</a>
        </div>
      </div>`;
    document.body.appendChild(wrap);
    card = wrap.querySelector('.shv-card');
    wrap.addEventListener('click', e => { if (e.target.dataset && e.target.dataset.close) close(); });
    wrap.querySelector('#shvX').addEventListener('click', close);
    wrap.querySelector('#shvHelp').addEventListener('click', help);
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !wrap.hidden) close(); });
  }

  function open(next) {
    intent = String(next || window._loginNext || '');
    if (intent === 'partner' || intent === 'jwl') aud = 'jwl';
    ensureShell();
    wrap.hidden = false;
    document.body.style.overflow = 'hidden';
    go(intent === 'partner' ? 'jwl' : 'start');
  }
  function close() {
    if (!wrap) return;
    wrap.hidden = true; document.body.style.overflow = '';
    if (window.ShivaaOtp) ShivaaOtp.stop();              // v33 — stop SMS listening
    if (otpTimer) { clearInterval(otpTimer); otpTimer = null; }
  }

  function help() {
    const msg = 'Namaste Shivaa \u2726\n\nI need help signing in to my account.\n(My email / registered mobile: )';
    if (window.Shivaa && window.Shivaa.waOpen) { close(); window.Shivaa.waOpen(msg); }
    else window.open('https://wa.me/918905005921?text=' + encodeURIComponent(msg), '_blank');
  }

  /* ─────────────────────── step machine ─────────────────────── */
  let resetEmail = '', resetHint = '';
  const HEADS = {
    start:    ['Welcome to Shivaa', 'Sign in or create your account'],
    phone:    ['Sign in with your mobile', 'No password needed \u2014 we text you a 6-digit code'],
    otp:      ['Enter the 6-digit code', function () { return 'Sent by SMS to +91 ' + esc(digits(otpPhone).slice(-10)); }],
    email:    ['Welcome back', 'Sign in with your email and password'],
    jwl:      ['Jeweller \u00b7 Partner sign-in', 'For approved B2B partners \u2014 bullion, designs & schemes'],
    register: ['Create your account', 'Takes under a minute \u00b7 you earn 120 welcome points \u2726'],
    reset:    ['Reset your password', 'We text a 6-digit code to the mobile registered on your account'],
    resetNew: ['Choose a new password', function () { return 'Code sent to the mobile on ' + esc(resetEmail || 'your account'); }],
  };
  function setHead([a, b]) {
    $('#shvHeadSub').innerHTML = typeof b === 'function' ? b() : (b || 'One account for everything');
    card.querySelector('.shv-head-tx b').textContent = a;
  }

  function go(s) {
    step = s;
    if (window.ShivaaOtp && s !== 'otp') ShivaaOtp.stop(); // v33 — leaving the OTP step stops the SMS listener
    const body = $('#shvBody');
    setHead(HEADS[s] || HEADS.start);
    body.className = 'shv-body aud-' + (aud === 'jwl' && (s === 'start' || s === 'email' || s === 'jwl') ? 'jwl' : 'retail');
    ({ start, phone, otp, email, jwl, register, reset, resetNew }[s] || start)(body);
    const f = body.querySelector('input'); if (f) setTimeout(() => f.focus(), 60);
  }
  const backTo = s => `<button type="button" class="shv-back" id="shvBack" aria-label="Back">&#8249;</button>`;
  const bindBack = s => { const b = $('#shvBack'); if (b) b.onclick = () => go(s); };
  const errBox = () => `<div class="shv-err" id="shvErr" hidden></div>`;
  function showErr(msg) {
    const b = $('#shvErr'); if (!b) return;
    b.innerHTML = msg; b.hidden = false;
    b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake');
  }
  const previewNote = () => (window.Shivaa && window.Shivaa.storageBlocked)
    ? `<p class="shv-preview">&#9432; Preview mode: this sandbox blocks browser storage, so sign-ins reset when the page reloads. On shivaa.in you stay signed in.</p>` : '';
  const busy = (btn, on, label) => { if (!btn) return; btn.disabled = on; btn.innerHTML = on ? `<span class="shv-spin"></span>${esc(label || 'One moment\u2026')}` : btn.dataset.label; };

  /* ─────────────────────── STEP · start ─────────────────────── */
  function start(body) {
    body.innerHTML = `
      <div class="shv-seg" role="tablist">
        <button type="button" class="shv-seg-btn ${aud !== 'jwl' ? 'on' : ''}" data-aud="retail">&#128717;&#65039; Shopping</button>
        <button type="button" class="shv-seg-btn ${aud === 'jwl' ? 'on' : ''}" data-aud="jwl">&#10022; Jeweller &middot; B2B</button>
      </div>
      ${aud === 'jwl' ? `
        <button type="button" class="shv-door" id="shvGoJwl">
          <span class="sd-ic">&#10022;</span>
          <span class="sd-tx"><b>Partner sign-in</b><small>Bullion desk &middot; design selection &middot; schemes</small></span>
          <span class="sd-arrow">&#8250;</span>
        </button>
        <button type="button" class="shv-door shv-door-soft" id="shvGoApply">
          <span class="sd-ic">&#9998;</span>
          <span class="sd-tx"><b>Apply for partnership</b><small>Free GSTIN-based KYC &middot; approved within 48 h</small></span>
          <span class="sd-arrow">&#8250;</span>
        </button>
        <p class="shv-fine">Approved partners sign in with the email used in the KYC application. Trouble? <a href="javascript:void(0)" id="shvJwlHelp">WhatsApp the B2B desk</a>.</p>
      ` : `
        <button type="button" class="shv-door shv-door-gold" id="shvGoPhone">
          <span class="sd-ic">&#128241;</span>
          <span class="sd-tx"><b>Continue with mobile</b><small>One-tap code sign-in &middot; no password <em class="shv-rec">Recommended</em></small></span>
          <span class="sd-arrow">&#8250;</span>
        </button>
        <button type="button" class="shv-door" id="shvGoEmail">
          <span class="sd-ic">&#9993;&#65039;</span>
          <span class="sd-tx"><b>Continue with email</b><small>Email &amp; password</small></span>
          <span class="sd-arrow">&#8250;</span>
        </button>
        <p class="shv-fine">New to Shivaa? Creating an account takes a minute and earns <b>120 royalty points</b>.</p>
      `}
      ${previewNote()}`;
    $$('.shv-seg-btn').forEach(b => b.onclick = () => { aud = b.dataset.aud; go('start'); });
    const gp = $('#shvGoPhone'); if (gp) gp.onclick = () => go('phone');
    const ge = $('#shvGoEmail'); if (ge) ge.onclick = () => go('email');
    const gj = $('#shvGoJwl');   if (gj) gj.onclick = () => go('jwl');
    const ga = $('#shvGoApply'); if (ga) ga.onclick = applyForPartnership;
    const jh = $('#shvJwlHelp'); if (jh) jh.onclick = () => { if (window.Shivaa && window.Shivaa.waPartnerId) window.Shivaa.waPartnerId(); };
  }

  function applyForPartnership() {
    close();
    if (window.Shivaa && window.Shivaa.state) { location.hash = '#/b2b'; }
    else location.hash = '#/b2b';
  }

  /* ─────────────────────── STEP · phone ─────────────────────── */
  function phone(body) {
    body.innerHTML = `${backTo('start')}
      ${errBox()}
      <form id="shvPhoneForm" novalidate>
        <label class="shv-lbl" for="shvPhoneIn">Mobile number</label>
        <div class="shv-phone-row">
          <span class="shv-cc">+91</span>
          <input id="shvPhoneIn" inputmode="numeric" autocomplete="tel-national" maxlength="10" placeholder="10-digit mobile" required>
        </div>
        <button type="submit" class="shv-cta" id="shvPhoneBtn" data-label="&#10148;&nbsp; Send my code">&#10148;&nbsp; Send my code</button>
      </form>
      <p class="shv-fine">We text a 6-digit code by SMS. New number? We'll create your account after the code &mdash; nothing extra to do.</p>
      ${previewNote()}`;
    bindBack('start');
    const inp = $('#shvPhoneIn');
    inp.addEventListener('input', () => { inp.value = digits(inp.value).slice(0, 10); });
    $('#shvPhoneForm').addEventListener('submit', async e => {
      e.preventDefault();
      const ph = digits(inp.value);
      if (!/^[6-9]\d{9}$/.test(ph)) return showErr('Enter a valid 10-digit Indian mobile number');
      otpPhone = ph;
      await sendOtp();
    });
  }

  async function sendOtp() {
    const btn = $('#shvPhoneBtn') || $('#shvResend');
    if (btn) busy(btn, true, 'Sending\u2026');
    try {
      const r = await fetch('/api/auth/send-otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: otpPhone }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { busy(btn, false); if (btn) btn.dataset.label = btn.innerHTML; return showErr(esc(d.error || 'Could not send the code — try again')); }
      if (btn) { btn.disabled = false; btn.dataset && (btn.dataset.label = btn.dataset.label || btn.innerHTML); }
      go('otp');
      if (d.devCode) {
        const chip = $('#shvDemo');
        if (chip) {
          chip.hidden = false; chip.innerHTML = `Sandbox demo code: <b>${esc(d.devCode)}</b> — tap to fill`;
          chip.style.cursor = 'pointer';
          chip.onclick = () => { if (window.ShivaaOtp) ShivaaOtp.fill(document.getElementById('shvOtp'), String(d.devCode)); };
        }
      }
      startResend();
    } catch (e) { busy(btn, false); showErr('No connection — please check your internet and retry'); }
  }

  function startResend() {
    resendLeft = 30;
    const paint = () => {
      const r = $('#shvResend');
      if (r) { r.disabled = resendLeft > 0; r.textContent = resendLeft > 0 ? `Resend code in ${resendLeft}s` : 'Resend code'; }
    };
    paint();
    if (otpTimer) clearInterval(otpTimer);
    otpTimer = setInterval(() => { resendLeft--; paint(); if (resendLeft <= 0) clearInterval(otpTimer); }, 1000);
  }

  /* ─────────────────────── STEP · otp ─────────────────────── */
  function otp(body) {
    body.innerHTML = `${backTo('phone')}
      ${errBox()}
      <div class="shv-otp" id="shvOtp">${Array.from({ length: 6 }, (_, i) => `<input inputmode="numeric" maxlength="1" autocomplete="${i === 0 ? 'one-time-code' : 'off'}" aria-label=" digit ${i + 1}">`).join('')}</div>
      <div class="shv-demo" id="shvDemo" hidden></div>
      <button type="button" class="shv-cta" id="shvOtpBtn" data-label="&#10003;&nbsp; Verify &amp; continue">&#10003;&nbsp; Verify &amp; continue</button>
      <div class="shv-otp-acts"><button type="button" class="shv-link" id="shvResend">Resend code</button><button type="button" class="shv-link" id="shvChangeNum">Change number</button></div>
      ${previewNote()}`;
    bindBack('phone');
    const boxes = $$('#shvOtp input');
    boxes[0].focus();
    let verifying = false;                    // v32 fix: one verify per complete code —
                                              // multiple triggers used to burn the server's
                                              // 5-try limit and lock the OTP
    boxes.forEach((b, i) => {
      b.addEventListener('input', () => {
        b.value = digits(b.value).slice(0, 1);
        if (b.value && i < 5) boxes[i + 1].focus();
        if (i === 5 && boxes.every(x => x.value)) verifyOtp();
      });
      b.addEventListener('keydown', e => { if (e.key === 'Backspace' && !b.value && i > 0) boxes[i - 1].focus(); });
      b.addEventListener('paste', e => {
        e.preventDefault();
        const t = digits((e.clipboardData || window.clipboardData).getData('text')).slice(0, 6);
        [...t].forEach((c, j) => { if (boxes[j]) boxes[j].value = c; });
        if (t.length === 6) verifyOtp();
      });
    });
    $('#shvResend').onclick = () => { if (resendLeft <= 0) sendOtp(); };
    $('#shvChangeNum').onclick = () => go('phone');
    $('#shvOtpBtn').onclick = () => verifyOtp();
    // v33 — auto-fill: Android reads the “@shivaa.in #code” SMS line by itself
    if (window.ShivaaOtp) ShivaaOtp.watch(document.getElementById('shvOtp'), () => { if (boxes.every(x => x.value)) verifyOtp(); });

    async function verifyOtp() {
      if (verifying) return;
      const code = boxes.map(b => b.value).join('');
      if (code.length !== 6) return showErr('Enter all six digits of the code');
      verifying = true;
      const btn = $('#shvOtpBtn'); busy(btn, true, 'Verifying\u2026');
      try {
        const r = await fetch('/api/auth/otp-login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: otpPhone, code }) });
        const d = await r.json().catch(() => ({}));
        if (r.ok && d.token) { land(d); return; }
        if (r.status === 404) {                       // fresh number → account creation
          verifiedPhone = otpPhone;
          busy(btn, false); go('register'); return;
        }
        busy(btn, false); verifying = false;
        showErr(esc(d.error || 'Incorrect or expired code'));
        boxes.forEach(b => b.value = ''); boxes[0].focus();
      } catch (e) { busy(btn, false); showErr('No connection — please check your internet and retry'); }
    }
  }

  /* ─────────────────────── STEP · register ─────────────────────── */
  function register(body) {
    const phLocked = !!verifiedPhone;
    body.innerHTML = `${backTo(phLocked ? 'start' : 'start')}
      ${errBox()}
      <p class="shv-new-hi">&#127881; Your mobile <b>+91 ${esc(digits(verifiedPhone || '').slice(-10) || '\u2026')}</b> is verified! Just a few details and you're in.</p>
      <form id="shvRegForm" novalidate>
        <label class="shv-lbl" for="shvRgName">Full name</label>
        <input id="shvRgName" autocomplete="name" placeholder="e.g. Ravi Sharma" required>
        <label class="shv-lbl" for="shvRgEmail">Email</label>
        <input id="shvRgEmail" type="email" autocomplete="email" placeholder="you@example.com" required>
        <label class="shv-lbl" for="shvRgPhone">Mobile ${phLocked ? '<small class="shv-vfy">&#10003; verified</small>' : ''}</label>
        <input id="shvRgPhone" inputmode="numeric" maxlength="10" value="${esc(verifiedPhone)}" ${phLocked ? 'readonly class="shv-ro"' : ''} required>
        <label class="shv-lbl" for="shvRgPass">Create a password <small>(8+ characters &middot; for the email door)</small></label>
        <div class="shv-pw"><input id="shvRgPass" type="password" autocomplete="new-password" placeholder="8+ characters" required>
          <button type="button" class="shv-eye" id="shvEye" aria-label="Show password">&#128065;&#65039;</button></div>
        <div class="shv-meter"><i id="shvMeter"></i></div>
        <button type="submit" class="shv-cta" id="shvRgBtn" data-label="Create my account &#10022;">Create my account &#10022;</button>
      </form>
      ${previewNote()}`;
    const pass = $('#shvRgPass');
    $('#shvEye').onclick = () => { pass.type = pass.type === 'password' ? 'text' : 'password'; };
    pass.addEventListener('input', () => {
      const v = pass.value; let s = 0;
      if (v.length >= 8) s++; if (/[A-Z]/.test(v) && /[a-z]/.test(v)) s++; if (/\d/.test(v)) s++; if (/[^A-Za-z0-9]/.test(v)) s++;
      const m = $('#shvMeter'); m.style.width = (s * 25) + '%'; m.className = s <= 1 ? 'weak' : s === 2 ? 'ok' : s === 3 ? 'good' : 'strong';
    });
    $('#shvRegForm').addEventListener('submit', async e => {
      e.preventDefault();
      const name = $('#shvRgName').value.trim(), email = $('#shvRgEmail').value.trim(),
            ph = digits($('#shvRgPhone').value), pw = pass.value;
      if (!name) return showErr('Please tell us your name');
      if (!/^\S+@\S+\.\S+$/.test(email)) return showErr('That email does not look right');
      if (!/^[6-9]\d{9}$/.test(ph)) return showErr('Enter a valid 10-digit Indian mobile number');
      if (pw.length < 8) return showErr('Password must be at least 8 characters');
      const btn = $('#shvRgBtn'); busy(btn, true, 'Creating\u2026');
      try {
        const r = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, phone: ph, password: pw }) });
        const d = await r.json().catch(() => ({}));
        if (r.ok && d.token) { land(d); return; }
        busy(btn, false);
        if (r.status === 409) showErr('This email already has an account. <a href="javascript:void(0)" id="shvToEmail">Sign in with email instead</a>');
        else if (/phone/i.test(d.error || '')) showErr(esc(d.error) + ' — tap back and verify the new number by OTP.');
        else showErr(esc(d.error || 'Could not create the account'));
        const t = $('#shvToEmail'); if (t) t.onclick = () => go('email');
      } catch (e) { busy(btn, false); showErr('No connection — please check your internet and retry'); }
    });
  }

  /* ─────────────────────── STEP · email (retail + shared) ─────────────────────── */
  function email(body) {
    body.innerHTML = `${backTo('start')}
      ${errBox()}
      <form id="shvEmForm" novalidate>
        <label class="shv-lbl" for="shvEmIn">Email</label>
        <input id="shvEmIn" type="email" autocomplete="username" placeholder="you@example.com" required>
        <label class="shv-lbl" for="shvEmPw">Password</label>
        <div class="shv-pw"><input id="shvEmPw" type="password" autocomplete="current-password" placeholder="Your password" required>
          <button type="button" class="shv-eye" id="shvEye2" aria-label="Show password">&#128065;&#65039;</button></div>
        <button type="submit" class="shv-cta" id="shvEmBtn" data-label="Sign in">&#10095;&nbsp; Sign in</button>
      </form>
      <div class="shv-otp-acts">
        <button type="button" class="shv-link" id="shvToPhone">Sign in with mobile OTP instead</button>
        <button type="button" class="shv-link" id="shvForgot">Forgot password?</button>
      </div>
      ${previewNote()}`;
    bindBack('start');
    $('#shvEye2').onclick = () => { const p = $('#shvEmPw'); p.type = p.type === 'password' ? 'text' : 'password'; };
    $('#shvToPhone').onclick = () => go('phone');
    $('#shvForgot').onclick = () => go('reset');
    $('#shvEmForm').addEventListener('submit', async e => {
      e.preventDefault();
      const em = $('#shvEmIn').value.trim(), pw = $('#shvEmPw').value;
      if (!em || !pw) return showErr('Enter your email and password');
      await pwLogin(em, pw, $('#shvEmBtn'), 'Signing in\u2026', false);
    });
  }

  /* ─────────────────────── STEP · jwl (partner door) ─────────────────────── */
  function jwl(body) {
    body.innerHTML = `${backTo('start')}
      ${errBox()}
      <form id="shvJwForm" novalidate>
        <label class="shv-lbl" for="shvJwEm">Partner email <small>(the one used in your KYC)</small></label>
        <input id="shvJwEm" type="email" autocomplete="username" placeholder="you@yourfirm.in" required>
        <label class="shv-lbl" for="shvJwPw">Password</label>
        <div class="shv-pw"><input id="shvJwPw" type="password" autocomplete="current-password" placeholder="Your portal password" required>
          <button type="button" class="shv-eye" id="shvEye3" aria-label="Show password">&#128065;&#65039;</button></div>
        <button type="submit" class="shv-cta" id="shvJwBtn" data-label="&#10022;&nbsp; Enter partner portal">&#10022;&nbsp; Enter partner portal</button>
      </form>
      <div class="shv-otp-acts">
        <button type="button" class="shv-link" id="shvJwApply">New here? Apply for partnership &#8594;</button>
        <button type="button" class="shv-link" id="shvJwForgot">Forgot portal password?</button>
      </div>
      <p class="shv-fine">Approvals take up to 48 h after KYC. If your password stopped working, the B2B desk can reset it on WhatsApp in minutes.</p>
      ${previewNote()}`;
    bindBack('start');
    $('#shvEye3').onclick = () => { const p = $('#shvJwPw'); p.type = p.type === 'password' ? 'text' : 'password'; };
    $('#shvJwApply').onclick = applyForPartnership;
    $('#shvJwForgot').onclick = () => go('reset');
    $('#shvJwForm').addEventListener('submit', async e => {
      e.preventDefault();
      const em = $('#shvJwEm').value.trim(), pw = $('#shvJwPw').value;
      if (!em || !pw) return showErr('Enter your partner email and password');
      await pwLogin(em, pw, $('#shvJwBtn'), 'Opening portal\u2026', true);
    });
  }

  /* ═══════════════ STEP · reset (forgot password) ═══════════════
     Nobody should ever be locked out of their own shop. This is the
     self-serve door: email → 6-digit code to the REGISTERED MOBILE →
     new password. Works for the admin account too. The server answers
     identically whether or not the email exists, so this step can never
     be used to discover who has an account. */
  function reset(body) {
    body.innerHTML = `${backTo('email')}
      ${errBox()}
      <p class="shv-fine" style="margin-bottom:14px">Enter the email on your Shivaa account. We text a 6-digit code to the mobile registered with it.</p>
      <form id="shvResetForm" novalidate>
        <label class="shv-lbl" for="shvRstEmail">Account email</label>
        <input id="shvRstEmail" type="email" autocomplete="username" placeholder="you@example.com" value="${esc(resetEmail)}" required>
        <button type="submit" class="shv-cta" id="shvRstBtn" data-label="&#128241;&nbsp; Send the code">&#128241;&nbsp; Send the code</button>
      </form>
      <div class="shv-demo" id="shvDemo" hidden></div>
      <div class="shv-otp-acts">
        <button type="button" class="shv-link" id="shvRstToEmail">Back to sign in</button>
        <button type="button" class="shv-link" id="shvRstHelp">Still stuck? WhatsApp us</button>
      </div>
      <p class="shv-fine">No mobile on the account, or no SMS arriving? The owner can use the one-time <b>admin-reset.php</b> recovery file in the hosting panel.</p>
      ${previewNote()}`;
    bindBack('email');
    $('#shvRstToEmail').onclick = () => go('email');
    $('#shvRstHelp').onclick = help;
    $('#shvResetForm').addEventListener('submit', async e => {
      e.preventDefault();
      const em = $('#shvRstEmail').value.trim();
      if (!/^\S+@\S+\.\S+$/.test(em)) return showErr('That email does not look right');
      const btn = $('#shvRstBtn'); busy(btn, true, 'Sending\u2026');
      try {
        const r = await fetch('/api/auth/reset/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: em }) });
        const d = await r.json().catch(() => ({}));
        busy(btn, false);
        if (!r.ok) return showErr(esc(d.error || 'Could not send the code \u2014 please try again'));
        resetEmail = em; resetHint = d.masked ? ('the mobile ending ' + esc(d.masked)) : 'the mobile on your account';
        if (d.noPhone) {
          return showErr('That account has no mobile number on file, so an SMS code cannot be sent. Please WhatsApp our desk on <b>+91 89050 05921</b>, or use <b>admin-reset.php</b> in the hosting panel.');
        }
        go('resetNew');
        if (d.devCode) {
          const chip = $('#shvDemo');
          if (chip) { chip.hidden = false; chip.innerHTML = `Sandbox demo code: <b>${esc(d.devCode)}</b> \u2014 tap to fill`; chip.style.cursor = 'pointer';
            chip.onclick = () => { if (window.ShivaaOtp) ShivaaOtp.fill(document.getElementById('shvRstOtp'), String(d.devCode)); }; }
        }
      } catch (err) { busy(btn, false); showErr('No connection \u2014 please check your internet and retry'); }
    });
  }

  function resetNew(body) {
    body.innerHTML = `${backTo('reset')}
      ${errBox()}
      <p class="shv-fine" style="margin-bottom:12px">If <b>${esc(resetEmail)}</b> has an account, a 6-digit code is on its way to ${resetHint}. Enter it below with your new password.</p>
      <div class="shv-otp" id="shvRstOtp">${Array.from({ length: 6 }, (_, i) => `<input inputmode="numeric" maxlength="1" autocomplete="${i === 0 ? 'one-time-code' : 'off'}" aria-label="digit ${i + 1}">`).join('')}</div>
      <label class="shv-lbl" for="shvRstPw">New password</label>
      <div class="shv-pw"><input id="shvRstPw" type="password" autocomplete="new-password" placeholder="8+ characters" required>
        <button type="button" class="shv-eye" id="shvRstEye" aria-label="Show password">&#128065;&#65039;</button></div>
      <div class="shv-meter"><i id="shvRstMeter"></i></div>
      <label class="shv-lbl" for="shvRstPw2">Type it again</label>
      <input id="shvRstPw2" type="password" autocomplete="new-password" placeholder="repeat the new password" required>
      <button type="button" class="shv-cta" id="shvRstGo" data-label="&#10003;&nbsp; Set my new password">&#10003;&nbsp; Set my new password</button>
      <div class="shv-otp-acts"><button type="button" class="shv-link" id="shvRstAgain">Send a new code</button><button type="button" class="shv-link" id="shvRstHelp2">Need help?</button></div>
      ${previewNote()}`;
    bindBack('reset');
    const boxes = $$('#shvRstOtp input'); boxes[0].focus();
    boxes.forEach((b, i) => {
      b.addEventListener('input', () => { b.value = digits(b.value).slice(0, 1); if (b.value && i < 5) boxes[i + 1].focus(); });
      b.addEventListener('keydown', e => { if (e.key === 'Backspace' && !b.value && i > 0) boxes[i - 1].focus(); });
      b.addEventListener('paste', e => { e.preventDefault(); const t = digits((e.clipboardData || window.clipboardData).getData('text')).slice(0, 6); [...t].forEach((c, j) => { if (boxes[j]) boxes[j].value = c; }); });
    });
    $('#shvRstEye').onclick = () => { const p = $('#shvRstPw'); p.type = p.type === 'password' ? 'text' : 'password'; };
    $('#shvRstPw').addEventListener('input', () => {
      const v = $('#shvRstPw').value; let s = 0;
      if (v.length >= 8) s++; if (/[A-Z]/.test(v) && /[a-z]/.test(v)) s++; if (/\d/.test(v)) s++; if (/[^A-Za-z0-9]/.test(v)) s++;
      const m = $('#shvRstMeter'); m.style.width = (s * 25) + '%'; m.className = s <= 1 ? 'weak' : s === 2 ? 'ok' : s === 3 ? 'good' : 'strong';
    });
    $('#shvRstAgain').onclick = () => go('reset');
    $('#shvRstHelp2').onclick = help;
    if (window.ShivaaOtp) ShivaaOtp.watch(document.getElementById('shvRstOtp'));
    $('#shvRstGo').onclick = async () => {
      const code = boxes.map(b => b.value).join('');
      const pw = $('#shvRstPw').value, pw2 = $('#shvRstPw2').value;
      if (code.length !== 6) return showErr('Enter all six digits of the code');
      if (pw.length < 8) return showErr('New password must be at least 8 characters');
      if (pw !== pw2) return showErr('The two passwords do not match');
      const btn = $('#shvRstGo'); busy(btn, true, 'Saving\u2026');
      try {
        const r = await fetch('/api/auth/reset/confirm', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: resetEmail, code, password: pw }) });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) { busy(btn, false); return showErr(esc(d.error || 'Could not save the new password')); }
        body.innerHTML = `${errBox()}
          <div style="text-align:center;padding:8px 0 4px"><div style="font-size:40px">&#10022;</div></div>
          <h3 style="text-align:center;margin:6px 0 8px;font-family:Georgia,serif">Password updated</h3>
          <p class="shv-fine" style="text-align:center">Sign in with <b>${esc(d.email || resetEmail)}</b> and your new password now.${d.sessionsRevoked ? ` ${d.sessionsRevoked} older session${d.sessionsRevoked === 1 ? '' : 's'} were signed out.` : ''}</p>
          <button type="button" class="shv-cta" id="shvRstDone">&#10095;&nbsp; Sign in</button>`;
        $('#shvRstDone').onclick = () => { const em = resetEmail; go('email'); const f = $('#shvEmIn'); if (f) { f.value = em; $('#shvEmPw').focus(); } };
      } catch (err) { busy(btn, false); showErr('No connection \u2014 please check your internet and retry'); }
    };
  }

  /* ─────────────────────── shared password login + landing ─────────────────────── */
  async function pwLogin(emailAddr, pw, btn, busyLabel, isJwl) {
    busy(btn, true, busyLabel);
    try {
      const r = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailAddr, password: pw }) });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.token) { land(d); return; }
      busy(btn, false);
      let msg = esc(d.error || 'Invalid email or password');
      if (isJwl && /invalid|incorrect|not found/i.test(d.error || ''))
        msg += '<br><small>If you applied recently, our team may still be approving your account (within 48 h) — or <a href="javascript:void(0)" id="shvJwApply2">apply for partnership</a>.</small>';
      showErr(msg);
      const a = $('#shvJwApply2'); if (a) a.onclick = applyForPartnership;
    } catch (e) { busy(btn, false); showErr('No connection — please check your internet and retry'); }
  }

  function land(r) {
    close();
    if (window.Shivaa && window.Shivaa.afterLogin) window.Shivaa.afterLogin(r);
    else { toastFallback('Signed in'); location.hash = '#/'; }
  }
  function toastFallback(m) { try { window.Shivaa && window.Shivaa.toast ? window.Shivaa.toast(m) : console.info(m); } catch (e) {} }

  window.ShivaaAuth = { open, close, get step() { return step; } };
})();
