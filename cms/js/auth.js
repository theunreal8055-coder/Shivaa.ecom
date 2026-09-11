/* ═══════════════════════════════════════════════════════════════════════
   SHIVAA PASSPORT · v57
   ─────────────────────────────────────────────────────────────────────
   Two clear doors, like the old two-column sheet, rebuilt:
   · RETAIL CUSTOMERS — mobile + short 4-digit OTP only. New numbers are
     welcomed: after the code checks out we collect name / DOB / place once.
   · JEWELLERS (B2B)  — partner email + password door, straight into the
     wholesale portal and its bullion desk.
   "Remember me" exists on BOTH doors (retail saves the number for a
   one-tap OTP; jeweller saves the partner ID/email for one-tap prefill).
   The sheet re-opens reliably every time Account is tapped, even after
   closing it with the cross or the back button.
   API: auth/send-otp · auth/otp-login · auth/register · auth/login ·
        auth/reset/* and the matching kyc/* routes.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.ShivaaAuth) return;                       // idempotent

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $  = sel => document.querySelector(sel);
  const $$ = sel => [...document.querySelectorAll(sel)];
  const digits = s => String(s || '').replace(/\D/g, '');

  /* v57: retail codes are short 4-digit PINs */
  const OTP_LEN = 4;

  let wrap = null, card = null, step = 'start';
  let otpPhone = '', otpTimer = null, resendLeft = 0, verifiedPhone = '';
  let intent = '', pendingNew = false, explicitNext = '';

  /* remember-me stores (retail number / jeweller partner ID) */
  const SAVE_KEY = 'shv_saved_login';
  const SAVE_JWL = 'shv_saved_jwl';
  const getSaved  = () => { try { return JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) { return null; } };
  const saveLogin = u => { try { if (u && u.phone) localStorage.setItem(SAVE_KEY, JSON.stringify({ name: u.name || '', phone: digits(u.phone).slice(-10) })); } catch (e) {} };
  const clearSaved = () => { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} };
  const getJwl = () => { try { return localStorage.getItem(SAVE_JWL) || ''; } catch (e) { return ''; } };
  const saveJwl = em => { try { em ? localStorage.setItem(SAVE_JWL, em) : localStorage.removeItem(SAVE_JWL); } catch (e) {} };

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

  /* open() always re-renders the landing tabs fresh — this fixes the bug
     where closing the sheet once left Account taps doing nothing. */
  function open(next) {
    intent = String(next || window._loginNext || '');
    explicitNext = intent;
    const startTab = (intent === 'partner' || intent === 'jwl') ? 'jwl' : 'retail';
    ensureShell();
    wrap.hidden = false;
    document.body.style.overflow = 'hidden';
    go('start', startTab);
  }
  function close() {
    if (!wrap) return;
    wrap.hidden = true; document.body.style.overflow = '';
    if (window.ShivaaOtp) ShivaaOtp.stop();
    if (otpTimer) { clearInterval(otpTimer); otpTimer = null; }
    step = 'start';
  }
  function isOpen() { return !!wrap && !wrap.hidden; }

  function help() {
    const msg = 'Namaste Shivaa \u2726\n\nI need help signing in to my account.\n(My email / registered mobile: )';
    if (window.Shivaa && window.Shivaa.waOpen) { close(); window.Shivaa.waOpen(msg); }
    else window.open('https://wa.me/918905005921?text=' + encodeURIComponent(msg), '_blank');
  }

  /* ─────────────────────── step machine ─────────────────────── */
  let resetEmail = '';
  const HEADS = {
    start:    ['Welcome to Shivaa', 'Pick how you would like to continue'],
    otp:      ['Enter the 4-digit code', function () { return 'Sent by SMS to +91 ' + esc(digits(otpPhone).slice(-10)); }],
    jwl:      ['Jeweller \u00b7 Partner sign-in', 'For approved B2B partners \u2014 bullion, designs & schemes'],
    register: ['Your details', 'Takes under a minute \u00b7 you earn 120 welcome points \u2726'],
    details:  ['Tell us about you', 'One-time details after your mobile is verified'],
    reset:    ['Reset your password', 'We text a 4-digit code to the mobile registered on your account'],
    resetNew: ['Choose a new password', function () { return 'Code verified for ' + esc(resetEmail || 'your account'); }],
  };
  function setHead([a, b]) {
    $('#shvHeadSub').innerHTML = typeof b === 'function' ? b() : (b || 'One account for everything');
    card.querySelector('.shv-head-tx b').textContent = a;
  }
  function go(s, tab) {
    step = s;
    if (window.ShivaaOtp && s !== 'otp') ShivaaOtp.stop();
    const body = $('#shvBody');
    setHead(HEADS[s] || HEADS.start);
    body.className = 'shv-body' + (s === 'start' ? (' aud-' + (tab || 'retail')) : (s === 'jwl' ? ' aud-jwl' : ' aud-retail'));
    ({ start, otp, jwl, register, details, reset, resetNew }[s] || start)(body, tab);
    const f = body.querySelector('input:not([type=hidden])'); if (f) setTimeout(() => f.focus(), 60);
  }
  const backTo = s => `<button type="button" class="shv-back" id="shvBack" aria-label="Back">&#8249;</button>`;
  const bindBack = (s, tab) => { const b = $('#shvBack'); if (b) b.onclick = () => go(s, tab); };
  const errBox = () => `<div class="shv-err" id="shvErr" hidden></div>`;
  function showErr(msg) {
    const b = $('#shvErr'); if (!b) return;
    b.innerHTML = msg; b.hidden = false;
    b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake');
  }
  const previewNote = () => (window.Shivaa && window.Shivaa.storageBlocked)
    ? `<p class="shv-preview">&#9432; Preview mode: this sandbox blocks browser storage, so sign-ins reset when the page reloads. On shivaa.in you stay signed in.</p>` : '';
  const busy = (btn, on, label) => {
    if (!btn) return;
    if (on) { btn.dataset.label = btn.dataset.label || btn.innerHTML; btn.disabled = true; btn.innerHTML = `<span class="shv-spin"></span>${esc(label || 'One moment\u2026')}`; }
    else { btn.disabled = false; btn.innerHTML = btn.dataset.label || btn.innerHTML; }
  };

  /* ════════════════════ STEP · start — two audience doors ════════════════════ */
  function start(body, tab0) {
    const saved = getSaved();
    const jwlEmail = getJwl();
    body.className = 'shv-body aud-' + (tab0 || 'retail');
    body.innerHTML = `
      <div class="shv-aud" role="tablist" aria-label="Choose your account type">
        <button type="button" class="shv-aud-btn" data-aud="retail" role="tab" aria-selected="true">
          <span class="au-ic" aria-hidden="true">&#128141;</span>
          <span class="au-tx"><b>Retail Customer</b><small>Mobile OTP &middot; orders &amp; wishlist</small></span>
        </button>
        <button type="button" class="shv-aud-btn" data-aud="jwl" role="tab" aria-selected="false">
          <span class="au-ic" aria-hidden="true">&#10022;</span>
          <span class="au-tx"><b>Jeweller &middot; B2B</b><small>Partner ID &amp; password &middot; bullion desk</small></span>
        </button>
      </div>

      <!-- ─── RETAIL: 4-digit mobile OTP door ─── -->
      <div class="shv-pane" id="paneRetail">
        ${saved ? `
        <button type="button" class="shv-saved" id="shvSavedGo" title="Send a code to this number">
          <span class="sv-ic">&#128100;</span>
          <span><b>${esc(saved.name || 'My saved number')}</b><small>+91 ${esc(digits(saved.phone).replace(/(\d{2})(\d{4})(\d{4})/, '$1 $2 $3'))} &middot; tap to get an OTP</small></span>
          <span class="sv-go">&#8250;</span>
          <span class="shv-saved-x" id="shvSavedX" role="button" aria-label="Remove saved number" title="Remove">&#10005;</span>
        </button>` : ''}
        ${errBox()}
        <form id="shvStartForm" novalidate>
          <label class="shv-lbl" for="shvPhoneIn">Mobile number</label>
          <div class="shv-phone-row">
            <span class="shv-cc">+91</span>
            <input id="shvPhoneIn" inputmode="numeric" autocomplete="tel-national" maxlength="10" placeholder="10-digit mobile" required>
          </div>
          <label class="shv-save" style="margin:10px 0 12px"><input type="checkbox" id="shvStartRemember" checked><span>Remember me on this device &middot; one-tap OTP next time</span></label>
          <button type="submit" class="shv-cta" id="shvPhoneBtn" data-label="&#10148;&nbsp; Send 4-digit OTP">&#10148;&nbsp; Send 4-digit OTP</button>
        </form>
        <p class="shv-fine" style="text-align:center;margin-top:12px">
          <b>New here?</b> Enter any mobile number &mdash; we text the code anyway, then ask your name, date of birth and place once.<br>
          Creating an account earns <b>120 royalty points</b>.
        </p>
      </div>

      <!-- ─── JEWELLER: partner email + password door ─── -->
      <div class="shv-pane" id="paneJwl" hidden>
        ${errBox()}
        <form id="shvJwForm" novalidate>
          <label class="shv-lbl" for="shvJwEm">Partner email / ID <small>(the one used in your KYC)</small></label>
          <input id="shvJwEm" type="email" autocomplete="username" placeholder="you@yourfirm.in" required value="${esc(jwlEmail)}">
          <label class="shv-lbl" for="shvJwPw">Password</label>
          <div class="shv-pw"><input id="shvJwPw" type="password" autocomplete="current-password" placeholder="Your portal password" required>
            <button type="button" class="shv-eye" id="shvEye3" aria-label="Show password">&#128065;&#65039;</button></div>
          <label class="shv-save" style="margin:8px 0 12px"><input type="checkbox" id="shvJwRemember" ${jwlEmail ? 'checked' : ''}><span>Remember my partner ID on this device</span></label>
          <button type="submit" class="shv-cta shv-cta-jwl" id="shvJwBtn" data-label="&#10022;&nbsp; Enter the wholesale portal">&#10022;&nbsp; Enter the wholesale portal</button>
        </form>
        <div class="shv-otp-acts">
          <button type="button" class="shv-link" id="shvJwApply">New jeweller? Apply for partnership &#8594;</button>
          <button type="button" class="shv-link" id="shvJwForgot">Forgot portal password?</button>
        </div>
        <p class="shv-fine" style="text-align:center">The bullion desk, wholesale design selection and partner schemes open only after GST KYC approval (within 48 h).</p>
      </div>
      ${previewNote()}`;

    const switchTab = aud => {
      body.className = 'shv-body aud-' + aud;
      $$('.shv-aud-btn', body).forEach(b => { const on = b.dataset.aud === aud; b.classList.toggle('on', on); b.setAttribute('aria-selected', String(on)); });
      $('#paneRetail').hidden = aud !== 'retail';
      $('#paneJwl').hidden = aud !== 'jwl';
      // landing routing follows the chosen door
      window._loginNext = aud === 'jwl' ? 'partner' : (explicitNext && explicitNext !== 'partner' ? explicitNext : '');
      const f = body.querySelector(aud === 'jwl' ? '#shvJwPw' : '#shvPhoneIn');
      if (f && aud === 'jwl' && !f.value) $('#shvJwEm').focus(); else if (f) f.focus();
      const e = $('#shvErr'); if (e) e.hidden = true;
    };
    $$('.shv-aud-btn', body).forEach(b => b.onclick = () => switchTab(b.dataset.aud));
    switchTab(tab0 || 'retail');

    /* retail */
    const inp = $('#shvPhoneIn');
    inp.addEventListener('input', () => { inp.value = digits(inp.value).slice(0, 10); });
    $('#shvStartForm').addEventListener('submit', async e => {
      e.preventDefault();
      const ph = digits(inp.value);
      if (!/^[6-9]\d{9}$/.test(ph)) return showErr('Enter a valid 10-digit Indian mobile number');
      otpPhone = ph;
      await sendOtp();
    });
    if (saved) {
      $('#shvSavedGo').onclick = e => {
        if (e.target.closest('#shvSavedX')) return;
        otpPhone = digits(saved.phone); inp.value = otpPhone;
        sendOtp();
      };
      $('#shvSavedX').onclick = e => { e.stopPropagation(); clearSaved(); go('start', 'retail'); };
    }

    /* jeweller */
    $('#shvEye3').onclick = () => { const p = $('#shvJwPw'); p.type = p.type === 'password' ? 'text' : 'password'; };
    $('#shvJwApply').onclick = applyForPartnership;
    $('#shvJwForgot').onclick = () => go('reset');
    $('#shvJwForm').addEventListener('submit', async e => {
      e.preventDefault();
      const em = $('#shvJwEm').value.trim(), pw = $('#shvJwPw').value;
      if (!em || !pw) return showErr('Enter your partner email and password');
      saveJwl($('#shvJwRemember').checked ? em : '');
      window._loginNext = 'partner';
      await pwLogin(em, pw, $('#shvJwBtn'), 'Opening wholesale portal\u2026', true);
    });
  }

  function applyForPartnership() {
    close();
    location.hash = '#/b2b';
  }

  async function sendOtp() {
    const btn = $('#shvPhoneBtn') || $('#shvResend');
    if (btn) busy(btn, true, 'Sending\u2026');
    try {
      const r = await fetch('/api/auth/send-otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: otpPhone }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { busy(btn, false); return showErr(esc(d.error || 'Could not send the code — try again')); }
      pendingNew = d.hasAccount === false;
      busy(btn, false);
      go('otp');
      const chip = $('#shvDemo');
      if (chip) {
        if (d.devCode) {
          chip.hidden = false; chip.innerHTML = `Sandbox demo code: <b>${esc(d.devCode)}</b> — tap to fill`;
          chip.style.cursor = 'pointer';
          chip.onclick = () => { if (window.ShivaaOtp) ShivaaOtp.fill(document.getElementById('shvOtp'), String(d.devCode)); };
        } else if (d.masked) {
          chip.hidden = false;
          chip.innerHTML = `Code sent to <b>${esc(d.masked)}</b>${d.via === 'sms' ? '' : ' — check the inbox and the spam folder'}`;
        }
      }
      startResend();
    } catch (e) { busy(btn, false); showErr('No connection — please check your internet and retry'); }
  }

  function startResend() {
    resendLeft = 30;
    const paint = () => { const r = $('#shvResend'); if (r) { r.disabled = resendLeft > 0; r.textContent = resendLeft > 0 ? `Resend code in ${resendLeft}s` : 'Resend code'; } };
    paint();
    if (otpTimer) clearInterval(otpTimer);
    otpTimer = setInterval(() => { resendLeft--; paint(); if (resendLeft <= 0) clearInterval(otpTimer); }, 1000);
  }

  /* ════════════════════ STEP · otp — four boxes ════════════════════ */
  function otp(body) {
    body.innerHTML = `${backTo('start')}
      ${errBox()}
      ${pendingNew ? '<p class="shv-new-hi">&#128241; New number detected &#183; the 4-digit code is on its way. Once it checks out, tell us your name, date of birth and city &#183; no password needed.</p>' : ''}
      <p class="shv-otp-hint">Enter the <b>4-digit</b> code sent to <b>+91 ${esc(digits(otpPhone).slice(-10))}</b></p>
      <div class="shv-otp shv-otp4" id="shvOtp">${Array.from({ length: OTP_LEN }, (_, i) => `<input inputmode="numeric" maxlength="1" autocomplete="${i === 0 ? 'one-time-code' : 'off'}" aria-label="digit ${i + 1}">`).join('')}</div>
      <div class="shv-demo" id="shvDemo" hidden></div>
      <button type="button" class="shv-cta" id="shvOtpBtn" data-label="&#10003;&nbsp; Verify &amp; continue">&#10003;&nbsp; Verify &amp; continue</button>
      <label class="shv-save"><input type="checkbox" id="shvRemember" checked><span>Remember me on this device &#183; next time, one tap gets you a code</span></label>
      <div class="shv-otp-acts"><button type="button" class="shv-link" id="shvResend">Resend code</button><button type="button" class="shv-link" id="shvChangeNum">Change number</button></div>
      ${previewNote()}`;
    bindBack('start', 'retail');
    const boxes = $$('#shvOtp input');
    boxes[0].focus();
    let verifying = false;
    boxes.forEach((b, i) => {
      b.addEventListener('input', () => {
        b.value = digits(b.value).slice(0, 1);
        if (b.value && i < OTP_LEN - 1) boxes[i + 1].focus();
        if (i === OTP_LEN - 1 && boxes.every(x => x.value)) verifyOtp();
      });
      b.addEventListener('keydown', e => {
        if (e.key === 'Backspace' && !b.value && i > 0) boxes[i - 1].focus();
        if (e.key === 'ArrowLeft' && i > 0) boxes[i - 1].focus();
        if (e.key === 'ArrowRight' && i < OTP_LEN - 1) boxes[i + 1].focus();
      });
      b.addEventListener('paste', e => {
        e.preventDefault();
        const t = digits((e.clipboardData || window.clipboardData).getData('text')).slice(0, OTP_LEN);
        [...t].forEach((c, j) => { if (boxes[j]) boxes[j].value = c; });
        boxes[Math.min(t.length, OTP_LEN - 1)].focus();
        if (t.length === OTP_LEN) verifyOtp();
      });
    });
    $('#shvResend').onclick = () => { if (resendLeft <= 0) sendOtp(); };
    $('#shvChangeNum').onclick = () => go('start', 'retail');
    $('#shvOtpBtn').onclick = () => verifyOtp();
    if (window.ShivaaOtp) ShivaaOtp.watch(document.getElementById('shvOtp'), () => { if (boxes.every(x => x.value)) verifyOtp(); });

    async function verifyOtp() {
      if (verifying) return;
      const code = boxes.map(b => b.value).join('');
      if (code.length !== OTP_LEN) return showErr('Enter all four digits of the code');
      verifying = true;
      const btn = $('#shvOtpBtn'); busy(btn, true, 'Verifying\u2026');
      try {
        const r = await fetch('/api/auth/otp-login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: otpPhone, code }) });
        const d = await r.json().catch(() => ({}));
        if (r.ok && d.token) {
          if ($('#shvRemember')?.checked || $('#shvStartRemember')?.checked) saveLogin({ name: d.user && d.user.name, phone: otpPhone });
          else clearSaved();
          land(d); return;
        }
        if (r.status === 404) { verifiedPhone = otpPhone; busy(btn, false); go('details'); return; }
        busy(btn, false); verifying = false;
        showErr(esc(d.error || 'Incorrect or expired code'));
        boxes.forEach(b => { b.value = ''; }); boxes[0].focus();
      } catch (e) { busy(btn, false); verifying = false; showErr('No connection — please check your internet and retry'); }
    }
  }

  /* ───────────── STEP · details (new mobile, one-time personal form) ───────────── */
  function details(body) {
    const ph = digits(verifiedPhone || otpPhone).slice(-10);
    body.innerHTML = `${backTo('start')}
      ${errBox()}
      <p class="shv-new-hi">&#127881; Your mobile <b>+91 ${esc(ph)}</b> is verified. A few one-time details and your account is ready &#183; future logins need only the OTP.</p>
      <form id="shvDetForm" novalidate>
        <label class="shv-lbl" for="shvDetName">Full name *</label>
        <input id="shvDetName" autocomplete="name" placeholder="e.g. Ravi Sharma" required>
        <div class="shv-grid2">
          <div>
            <label class="shv-lbl" for="shvDetDob">Date of birth *</label>
            <input id="shvDetDob" type="date" autocomplete="bday" required>
          </div>
          <div>
            <label class="shv-lbl" for="shvDetCity">Place / city *</label>
            <input id="shvDetCity" autocomplete="address-level2" placeholder="e.g. Nagaur" required>
          </div>
          <div>
            <label class="shv-lbl" for="shvDetGender">Gender</label>
            <select id="shvDetGender" autocomplete="sex">
              <option value="">Prefer not to say</option>
              <option>Male</option><option>Female</option><option>Other</option>
            </select>
          </div>
          <div>
            <label class="shv-lbl" for="shvDetAnn">Anniversary <small>(optional)</small></label>
            <input id="shvDetAnn" type="date" autocomplete="anniversary">
          </div>
        </div>
        <label class="shv-lbl" for="shvDetEmail">Email <small>(optional &#183; for receipts &amp; email sign-in)</small></label>
        <input id="shvDetEmail" type="email" autocomplete="email" placeholder="you@example.com">
        <label class="shv-lbl" for="shvDetPw">Password <small>(optional &#183; OTP login works without one)</small></label>
        <div class="shv-pw"><input id="shvDetPw" type="password" autocomplete="new-password" placeholder="only if you want email sign-in">
          <button type="button" class="shv-eye" id="shvDetEye" aria-label="Show password">&#128065;&#65039;</button></div>
        <div class="shv-meter"><i id="shvDetMeter"></i></div>
        <label class="shv-save"><input type="checkbox" id="shvDetSave" checked><span>Save my details on this device so signing in next time is one tap</span></label>
        <button type="submit" class="shv-cta" id="shvDetBtn" data-label="Create my account &#10022;">Create my account &#10022;</button>
      </form>
      ${previewNote()}`;
    bindBack('start', 'retail');
    const pw = $('#shvDetPw');
    $('#shvDetEye').onclick = () => { pw.type = pw.type === 'password' ? 'text' : 'password'; };
    pw.addEventListener('input', () => {
      const v = pw.value; let s = 0;
      if (v.length >= 8) s++; if (/[A-Z]/.test(v) && /[a-z]/.test(v)) s++; if (/\d/.test(v)) s++; if (/[^A-Za-z0-9]/.test(v)) s++;
      const m = $('#shvDetMeter'); m.style.width = (s * 25) + '%'; m.className = s <= 1 ? 'weak' : s === 2 ? 'ok' : s === 3 ? 'good' : 'strong';
    });
    setTimeout(() => $('#shvDetName').focus(), 80);
    $('#shvDetForm').addEventListener('submit', async e => {
      e.preventDefault();
      const name = $('#shvDetName').value.trim();
      const dob = $('#shvDetDob').value, city = $('#shvDetCity').value.trim();
      const gender = $('#shvDetGender').value, ann = $('#shvDetAnn').value;
      const email = $('#shvDetEmail').value.trim(), pass = pw.value;
      if (name.length < 2) return showErr('Please tell us your full name');
      if (!dob) return showErr('Your date of birth helps us personalise offers &#183; pick a date');
      if (city.length < 2) return showErr('Please tell us your place / city');
      if (email && !/^\S+@\S+\.\S+$/.test(email)) return showErr('That email does not look right &#183; or leave it blank');
      if (pass && pass.length < 8) return showErr('Password must be at least 8 characters &#183; or leave it blank and use OTP forever');
      const btn = $('#shvDetBtn'); busy(btn, true, 'Creating\u2026');
      const profile = {};
      if (dob) profile.dob = dob;
      if (ann) profile.anniversary = ann;
      if (gender) profile.gender = gender;
      if (city) profile.city = city;
      const b = { name, phone: ph, profile };
      if (email) b.email = email;
      if (pass) b.password = pass;
      try {
        const r = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) });
        const d = await r.json().catch(() => ({}));
        if (r.ok && d.token) {
          if ($('#shvDetSave').checked) saveLogin({ name, phone: ph }); else clearSaved();
          land(d); return;
        }
        busy(btn, false);
        if (r.status === 409) showErr('That email already has an account. <a href="javascript:void(0)" id="shvToEmail">Sign in with email instead</a>');
        else if (/phone/i.test(d.error || '')) showErr(esc(d.error) + ' &#183; go back and verify the number again.');
        else showErr(esc(d.error || 'Could not create the account'));
        const t = $('#shvToEmail'); if (t) t.onclick = () => go('jwl');
      } catch (err) { busy(btn, false); showErr('No connection &#183; please check your internet and retry'); }
    });
  }

  /* legacy email/password door (kept for password-recovery finish) */
  function register(body) {
    const phLocked = !!verifiedPhone;
    body.innerHTML = `${backTo('start')}
      ${errBox()}
      <p class="shv-new-hi">&#127881; Your mobile <b>+91 ${esc(digits(verifiedPhone || '').slice(-10) || '\u2026')}</b> is verified! Just a few details and you're in.</p>
      <form id="shvRgForm" novalidate>
        <label class="shv-lbl" for="shvRgName">Full name</label>
        <input id="shvRgName" autocomplete="name" placeholder="e.g. Ravi Sharma" required>
        <label class="shv-lbl" for="shvRgEmail">Email</label>
        <input id="shvRgEmail" type="email" autocomplete="email" placeholder="you@example.com" required>
        <label class="shv-lbl" for="shvRgPhone">Mobile ${phLocked ? '<small class="shv-vfy">&#10003; verified</small>' : ''}</label>
        <input id="shvRgPhone" inputmode="numeric" maxlength="10" value="${esc(verifiedPhone)}" ${phLocked ? 'readonly class="shv-ro"' : ''} required>
        <label class="shv-lbl" for="shvRgPass">Create a password <small>(8+ characters)</small></label>
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
    $('#shvRgForm').addEventListener('submit', async e => {
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
        const t = $('#shvToEmail'); if (t) t.onclick = () => go('jwl');
      } catch (e) { busy(btn, false); showErr('No connection — please check your internet and retry'); }
    });
  }

  /* ───────────── STEP · jwl standalone (reset-flow re-entry) ───────────── */
  function jwl(body) {
    const jwlEmail = getJwl();
    body.innerHTML = `${backTo('start')}
      ${errBox()}
      <form id="shvJwForm" novalidate>
        <label class="shv-lbl" for="shvJwEm">Partner email / ID <small>(the one used in your KYC)</small></label>
        <input id="shvJwEm" type="email" autocomplete="username" placeholder="you@yourfirm.in" required value="${esc(jwlEmail)}">
        <label class="shv-lbl" for="shvJwPw">Password</label>
        <div class="shv-pw"><input id="shvJwPw" type="password" autocomplete="current-password" placeholder="Your portal password" required>
          <button type="button" class="shv-eye" id="shvEye3" aria-label="Show password">&#128065;&#65039;</button></div>
        <label class="shv-save" style="margin:8px 0 12px"><input type="checkbox" id="shvJwRemember" ${jwlEmail ? 'checked' : ''}><span>Remember my partner ID on this device</span></label>
        <button type="submit" class="shv-cta shv-cta-jwl" id="shvJwBtn" data-label="&#10022;&nbsp; Enter the wholesale portal">&#10022;&nbsp; Enter the wholesale portal</button>
      </form>
      <div class="shv-otp-acts">
        <button type="button" class="shv-link" id="shvJwApply">New jeweller? Apply for partnership &#8594;</button>
        <button type="button" class="shv-link" id="shvJwForgot">Forgot portal password?</button>
      </div>
      <p class="shv-fine" style="text-align:center">Approvals take up to 48 h after KYC. If your password stopped working, the B2B desk can reset it on WhatsApp in minutes.</p>
      ${previewNote()}`;
    bindBack('start', 'jwl');
    $('#shvEye3').onclick = () => { const p = $('#shvJwPw'); p.type = p.type === 'password' ? 'text' : 'password'; };
    $('#shvJwApply').onclick = applyForPartnership;
    $('#shvJwForgot').onclick = () => go('reset');
    $('#shvJwForm').addEventListener('submit', async e => {
      e.preventDefault();
      const em = $('#shvJwEm').value.trim(), pw = $('#shvJwPw').value;
      if (!em || !pw) return showErr('Enter your partner email and password');
      saveJwl($('#shvJwRemember').checked ? em : '');
      window._loginNext = 'partner';
      await pwLogin(em, pw, $('#shvJwBtn'), 'Opening wholesale portal\u2026', true);
    });
  }

  /* ───────── password reset (email → 4-digit code on file mobile) ───────── */
  function reset(body) {
    body.innerHTML = `${backTo('jwl')}
      ${errBox()}
      <p class="shv-fine" style="margin-bottom:14px">Enter the email on your Shivaa account. We text a <b>4-digit</b> code to the mobile registered with it.</p>
      <form id="shvResetForm" novalidate>
        <label class="shv-lbl" for="shvRstEmail">Account email</label>
        <input id="shvRstEmail" type="email" autocomplete="username" placeholder="you@example.com" value="${esc(resetEmail)}" required>
        <button type="submit" class="shv-cta" id="shvRstBtn" data-label="&#128241;&nbsp; Send the code">&#128241;&nbsp; Send the code</button>
      </form>
      <div class="shv-demo" id="shvDemo" hidden></div>
      <div class="shv-otp-acts">
        <button type="button" class="shv-link" id="shvRstToJwl">Back to partner sign in</button>
        <button type="button" class="shv-link" id="shvRstHelp">Still stuck? WhatsApp us</button>
      </div>
      <p class="shv-fine">No mobile on the account, or no SMS arriving? The owner can use the one-time <b>admin-reset.php</b> recovery file in the hosting panel.</p>
      ${previewNote()}`;
    bindBack('jwl');
    $('#shvRstToJwl').onclick = () => go('jwl');
    $('#shvRstHelp').onclick = help;
    $('#shvResetForm').addEventListener('submit', async e => {
      e.preventDefault();
      const em = $('#shvRstEmail').value.trim();
      if (!/^\S+@\S+\.\S+$/.test(em)) return showErr('That email does not look right');
      resetEmail = em;
      const btn = $('#shvRstBtn'); busy(btn, true, 'Sending\u2026');
      try {
        const r = await fetch('/api/auth/reset/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: em }) });
        const d = await r.json().catch(() => ({}));
        busy(btn, false);
        if (!r.ok) return showErr(esc(d.error || 'Could not start the reset — try again'));
        if (d.noPhone) showErr('That account has no mobile on file — use the admin-reset.php file or WhatsApp us.');
        if (d.devCode) { const c = $('#shvDemo'); c.hidden = false; c.innerHTML = `Sandbox demo code: <b>${esc(d.devCode)}</b>`; }
        go('resetNew');
      } catch (err) { busy(btn, false); showErr('No connection — please check your internet and retry'); }
    });
  }

  function resetNew(body) {
    body.innerHTML = `${backTo('reset')}
      ${errBox()}
      <p class="shv-fine" style="margin-bottom:10px">Enter the <b>4-digit</b> code texted to the mobile on <b>${esc(resetEmail)}</b>, then choose a new password.</p>
      <form id="shvRstNewForm" novalidate>
        <div class="shv-otp shv-otp4" id="shvRstOtp">${Array.from({ length: OTP_LEN }, (_, i) => `<input inputmode="numeric" maxlength="1" autocomplete="${i === 0 ? 'one-time-code' : 'off'}" aria-label="digit ${i + 1}">`).join('')}</div>
        <label class="shv-lbl" for="shvRstPw" style="margin-top:14px">New password</label>
        <div class="shv-pw"><input id="shvRstPw" type="password" autocomplete="new-password" minlength="8" placeholder="8+ characters" required>
          <button type="button" class="shv-eye" id="shvRstEye" aria-label="Show password">&#128065;&#65039;</button></div>
        <div class="shv-meter"><i id="shvRstMeter"></i></div>
        <button type="submit" class="shv-cta" id="shvRstNewBtn" data-label="Update password">Update password</button>
      </form>
      <div class="shv-demo" id="shvDemo" hidden></div>
      <div class="shv-otp-acts"><button type="button" class="shv-link" id="shvRstResend">Resend code</button></div>
      ${previewNote()}`;
    bindBack('reset');
    const boxes = $$('#shvRstOtp input');
    boxes.forEach((b, i) => {
      b.addEventListener('input', () => { b.value = digits(b.value).slice(0, 1); if (b.value && i < OTP_LEN - 1) boxes[i + 1].focus(); });
      b.addEventListener('keydown', e => { if (e.key === 'Backspace' && !b.value && i > 0) boxes[i - 1].focus(); });
      b.addEventListener('paste', e => { e.preventDefault(); const t = digits((e.clipboardData || window.clipboardData).getData('text')).slice(0, OTP_LEN); [...t].forEach((c, j) => { if (boxes[j]) boxes[j].value = c; }); });
    });
    $('#shvRstEye').onclick = () => { const p = $('#shvRstPw'); p.type = p.type === 'password' ? 'text' : 'password'; };
    $('#shvRstPw').addEventListener('input', () => {
      const v = $('#shvRstPw').value; let s = 0;
      if (v.length >= 8) s++; if (/[A-Z]/.test(v) && /[a-z]/.test(v)) s++; if (/\d/.test(v)) s++; if (/[^A-Za-z0-9]/.test(v)) s++;
      const m = $('#shvRstMeter'); m.style.width = (s * 25) + '%'; m.className = s <= 1 ? 'weak' : s === 2 ? 'ok' : s === 3 ? 'good' : 'strong';
    });
    $('#shvRstResend').onclick = () => go('reset');
    $('#shvRstNewForm').addEventListener('submit', async e => {
      e.preventDefault();
      const code = boxes.map(b => b.value).join('');
      if (code.length !== OTP_LEN) return showErr('Enter all four digits of the code');
      const pw = $('#shvRstPw').value;
      if (pw.length < 8) return showErr('Password must be at least 8 characters');
      const btn = $('#shvRstNewBtn'); busy(btn, true, 'Updating\u2026');
      try {
        const r = await fetch('/api/auth/reset/confirm', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: resetEmail, code, password: pw }) });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) { busy(btn, false); return showErr(esc(d.error || 'Could not verify that code')); }
        body.innerHTML = `${errBox()}
          <div style="text-align:center;padding:8px 0 4px"><div style="font-size:40px">&#10022;</div></div>
          <h3 style="text-align:center;margin:6px 0 8px;font-family:Georgia,serif">Password updated</h3>
          <p class="shv-fine" style="text-align:center">Sign in with <b>${esc(d.email || resetEmail)}</b> and your new password now.</p>
          <button type="button" class="shv-cta" id="shvRstDone">&#10095;&nbsp; Partner sign in</button>`;
        $('#shvRstDone').onclick = () => go('jwl');
      } catch (err) { busy(btn, false); showErr('No connection — please check your internet and retry'); }
    });
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

  window.ShivaaAuth = { open, close, isOpen, get step() { return step; }, get OTP_LEN() { return OTP_LEN; } };
})();
