/* v195 — Shivaa Black: the membership card as the MAIN home hero highlight, and the
   claim page: 1 your details → 2 delivery address → 3 review & claim.
   This file only draws. The server decides every rule: 20% off the making charges,
   six months of benefit, and the physical card delivered FREE. */
(function () {
  if (window.ShivaaBlack) return;

  let mem = { uid: null, at: 0, p: null, val: null };

  function memberNow() {
    const uid = state.user ? state.user.id : null;
    if (!uid) return Promise.resolve(null);
    if (mem.uid !== uid || !mem.p || Date.now() - mem.at > 60000) {
      mem = { uid, at: Date.now(), val: null, p: null };
      mem.p = api('/api/black-card')
        .then(r => { mem.val = (r && r.membership) || null; })
        .catch(() => { mem.val = null; });
    }
    return mem.p.then(() => mem.val);
  }

  const dateTxt = iso => {
    const d = new Date(iso);
    return isNaN(d) ? '' : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };
  const groupNo = n => String(n || '').replace(/\s+/g, '').match(/.{1,4}/g)?.join(' ') || '';
  const maskNo = n => {
    const d = String(n || '').replace(/\s+/g, '');
    return d ? '•••• •••• •••• ' + d.slice(-4) : '2020 •••• •••• ••••';
  };
  const maskPhone = p => {
    const d = String(p || '').replace(/\D/g, '').slice(-10);
    return d ? '••••••' + d.slice(-4) : '';
  };
  const holder = m => esc(((m && m.holderName) || (state.user && state.user.name) || 'Shivaa Member').toUpperCase().slice(0, 26));

  /* The card itself: pure CSS, no image to load. */
  function cardArt(m, full) {
    const num = full && m ? esc(groupNo(m.cardNumber)) : esc(m ? maskNo(m.cardNumber) : '2020 •••• •••• ••••');
    const till = m ? esc(dateTxt(m.expiresAt)) : 'SIX MONTHS';
    return `<div class="v195-card${m && !m.benefitActive ? ' is-off' : ''}" aria-hidden="true">
      <span class="v195-card-sheen"></span>
      <span class="v195-card-top"><span class="v195-card-brand">SHIVAA <b>BLACK</b></span><span class="v195-card-tag">20% · MAKING</span></span>
      <span class="v195-card-chip"></span>
      <span class="v195-card-num">${num}</span>
      <span class="v195-card-foot"><span><small>MEMBER</small>${holder(m)}</span><span><small>VALID TILL</small>${till}</span></span>
    </div>`;
  }

  /* ── home hero ─────────────────────────────────────────────── */
  function heroHTML(m) {
    const active = !!(m && m.benefitActive);
    const cta = m
      ? `<a class="v195-btn v195-btn-gold" href="#/black-card">${active ? 'View my Shivaa Black card' : 'View my card'} &rarr;</a>`
      : `<a class="v195-btn v195-btn-gold" href="#/black-card">Claim your free card &rarr;</a>`;
    const status = m
      ? (active ? `<span class="v195-live"><i></i>Your card is active &middot; valid till ${esc(dateTxt(m.expiresAt))}</span>`
                : `<span class="v195-live is-off"><i></i>Your card has expired</span>`)
      : '';
    return `
      <div class="v195-bh" role="region" aria-label="Shivaa Black membership">
        <span class="v195-bh-glow" aria-hidden="true"></span>
        <div class="v195-bh-copy">
          <span class="v195-kick">✦ Shivaa Black &middot; Members' privilege</span>
          <h2>Your making charges, <em>20% off</em>, for six months.</h2>
          <p>Claim the Shivaa Black card and every piece you buy takes 20% off its making charges. Metal and stones stay at today's live rate. Your physical card is delivered to your door, free.</p>
          <ul class="v195-points">
            <li>Physical card, <b>delivered free</b></li>
            <li>Six months of benefit</li>
            <li>Works at checkout with your card number</li>
          </ul>
          ${status}
          <div class="v195-cta">${cta}<a class="v195-link" href="#/black-card">How it works</a></div>
        </div>
        <div class="v195-bh-art">${cardArt(m, false)}</div>
      </div>`;
  }

  async function fill(root) {
    const slots = (root || document).querySelectorAll('[data-black-hero]');
    if (!slots.length) return;
    const m = await memberNow();
    slots.forEach(s => { s.innerHTML = heroHTML(m); s.hidden = false; });
  }

  /* ── the claim page ───────────────────────────────────────── */
  const STEPS = ['Your details', 'Delivery address', 'Review & claim'];

  function header(kick, title, lead) {
    return `<header class="v195-ph">
      <span class="v195-kick">${esc(kick)}</span>
      <h1>${esc(title)}</h1>
      <p>${esc(lead)}</p>
    </header>`;
  }

  function signedOutPage(view) {
    view.innerHTML = `<section class="v195-page container">
      ${header('✦ Shivaa Black', 'Your free membership card', 'Sign in with your registered mobile to claim your card. We deliver the physical card to your door, free.')}
      <div class="v195-preview">${cardArt(null, false)}</div>
      <div class="v195-cta v195-cta-row">
        <a class="v195-btn v195-btn-gold" href="#/login">Sign in &rarr;</a>
        <a class="v195-btn v195-btn-ghost" href="#/shop">Continue shopping</a>
      </div>
    </section>`;
  }

  function memberPage(view, m) {
    const active = !!m.benefitActive;
    const d = m.delivery && m.delivery.address;
    const delivery = d
      ? `Free &middot; to ${esc(d.line1)}, ${esc(d.city)} ${esc(d.pincode)}`
      : `Not yet added &middot; <button type="button" class="v195-linkbtn" data-bk-addaddr>Add my delivery address</button>`;
    view.innerHTML = `<section class="v195-page container">
      ${header('✦ Shivaa Black', 'Your membership card', '20% off making charges, six months, physical card delivered free.')}
      <div class="v195-member">
        ${cardArt(m, true)}
        <dl class="v195-facts">
          <div><dt>Status</dt><dd class="${active ? 'ok' : 'off'}">${active ? 'Active' : 'Expired'}</dd></div>
          <div><dt>Valid till</dt><dd>${esc(dateTxt(m.expiresAt))}</dd></div>
          <div><dt>Member ID</dt><dd>${esc(m.memberId || '')}</dd></div>
          <div><dt>Certificate</dt><dd>${esc(m.certificateNo || '')}</dd></div>
          <div class="v195-full"><dt>Card delivery</dt><dd>${delivery}</dd></div>
        </dl>
        <div class="v195-how">
          <h2>How to use it</h2>
          <ol>
            <li>Add jewellery to your bag as usual.</li>
            <li>At checkout, enter your card number <b>${esc(groupNo(m.cardNumber))}</b> in the coupon box.</li>
            <li>20% comes off the making charges only. Metal and stones stay at today's rate.</li>
          </ol>
          <button type="button" class="v195-btn v195-btn-gold" data-bk-copy>Copy my card number</button>
          <a class="v195-btn v195-btn-ghost" href="#/shop">Shop with my card &rarr;</a>
        </div>
      </div>
    </section>`;
    const copy = view.querySelector('[data-bk-copy]');
    if (copy) copy.onclick = async () => {
      try { await navigator.clipboard.writeText(String(m.cardNumber || '').replace(/\s+/g, '')); toast('Card number copied'); }
      catch (e) { toast('Copy it by hand: ' + groupNo(m.cardNumber), 'warn'); }
    };
    const addr = view.querySelector('[data-bk-addaddr]');
    if (addr) addr.onclick = () => wizard(view, { step: 2, repair: true, draft: draftFrom(null) });
  }

  function draftFrom(d) {
    const u = state.user || {};
    return Object.assign({
      name: u.name || '', phone: String(u.phone || '').replace(/\D/g, '').slice(-10),
      line1: '', line2: '', city: '', state: 'Rajasthan', pincode: '',
    }, d || {});
  }

  function fieldsFor(step, d) {
    if (step === 1) return `
      <div class="v195-fields">
        <label class="v195-field v195-full"><span>Name on the card</span>
          <input id="bkName" value="${esc(d.name)}" maxlength="80" autocomplete="name"></label>
        <div class="v195-field v195-full"><span>Registered mobile</span>
          <div class="v195-ro">+91 ${esc(maskPhone(d.phone))}</div>
          <small>Your card is tied to the mobile you signed in with.</small></div>
      </div>`;
    if (step === 2) return `
      <div class="v195-fields">
        <label class="v195-field v195-full"><span>House no. and street</span>
          <input id="bkLine1" value="${esc(d.line1)}" maxlength="120" autocomplete="address-line1"></label>
        <label class="v195-field v195-full"><span>Area or landmark <i>(optional)</i></span>
          <input id="bkLine2" value="${esc(d.line2)}" maxlength="120" autocomplete="address-line2"></label>
        <label class="v195-field"><span>City</span>
          <input id="bkCity" value="${esc(d.city)}" maxlength="60" autocomplete="address-level2"></label>
        <label class="v195-field"><span>State</span>
          <input id="bkState" value="${esc(d.state)}" maxlength="60" autocomplete="address-level1"></label>
        <label class="v195-field"><span>PIN code</span>
          <input id="bkPin" value="${esc(d.pincode)}" maxlength="6" inputmode="numeric" autocomplete="postal-code"></label>
        <label class="v195-field"><span>Mobile for delivery</span>
          <input id="bkPhone" value="${esc(d.phone)}" maxlength="10" inputmode="tel" autocomplete="tel-national"></label>
      </div>`;
    return `
      <div class="v195-review">
        <div><small>Card issued to</small><b>${esc(d.name)}</b></div>
        <div><small>Ships to</small><b>${esc([d.line1, d.line2, d.city, d.state].filter(Boolean).join(', '))} &middot; ${esc(d.pincode)}</b></div>
        <div><small>Delivery phone</small><b>+91 ${esc(d.phone)}</b></div>
        <div><small>Physical card</small><b class="v195-free">Delivered free &middot; ₹0</b></div>
        <div><small>Benefit</small><b>20% off making charges &middot; six months</b></div>
      </div>
      <label class="v195-agree"><input type="checkbox" id="bkAgree"> <span>I understand the benefit is 20% off the making charges only, is tied to my mobile, and lasts six months from the day I claim.</span></label>`;
  }

  function readStep(view, st) {
    const v = id => { const el = view.querySelector('#' + id); return el ? el.value : null; };
    const d = st.draft;
    if (st.step === 1) { const n = v('bkName'); if (n !== null) d.name = n.trim(); }
    if (st.step === 2) {
      d.line1 = (v('bkLine1') || '').trim(); d.line2 = (v('bkLine2') || '').trim();
      d.city = (v('bkCity') || '').trim(); d.state = (v('bkState') || '').trim();
      d.pincode = (v('bkPin') || '').replace(/\D/g, ''); d.phone = (v('bkPhone') || '').replace(/\D/g, '').slice(-10);
    }
  }

  function checkStep(st) {
    const d = st.draft;
    if (st.step === 1 && d.name.length < 2) return 'Please enter the name the card should be issued to.';
    if (st.step === 2) {
      if (d.line1.length < 5) return 'Please enter your house number and street.';
      if (d.city.length < 2 || d.state.length < 2) return 'Please enter your city and state.';
      if (!/^[1-9]\d{5}$/.test(d.pincode)) return 'Please enter a valid 6-digit PIN code.';
      if (!/^[6-9]\d{9}$/.test(d.phone)) return 'Please enter a valid 10-digit mobile for delivery.';
    }
    if (st.step === 3 && !(document.getElementById('bkAgree') || {}).checked) return 'Please tick the box to confirm you understand the benefit.';
    return '';
  }

  function wizard(view, st) {
    const d = st.draft;
    const first = st.repair ? 2 : 1;
    const bar = `<ol class="v195-steps" aria-label="Claim steps">${STEPS.map((t, i) => {
      const n = i + 1;
      const cls = n < st.step ? 'done' : (n === st.step ? 'on' : '');
      return `<li class="${cls}"${n < first ? ' hidden' : ''}><span>${n < st.step ? '✓' : n}</span>${esc(t)}</li>`;
    }).join('')}</ol>`;
    view.innerHTML = `<section class="v195-page container">
      ${header('✦ Shivaa Black', st.repair ? 'Add your delivery address' : 'Claim your free card', 'Three short steps. We deliver the physical card to your door, free.')}
      <div class="v195-wiz">
        ${bar}
        <form class="v195-form" novalidate>
          ${fieldsFor(st.step, d)}
          <p class="v195-msg" role="alert" aria-live="assertive"></p>
          <div class="v195-nav">
            ${st.step > first ? '<button type="button" class="v195-btn v195-btn-ghost" data-bk-back>&larr; Back</button>' : '<span></span>'}
            ${st.step < 3
              ? '<button type="submit" class="v195-btn v195-btn-gold" data-bk-next>Continue &rarr;</button>'
              : '<button type="submit" class="v195-btn v195-btn-gold" data-bk-claim>Claim my free card</button>'}
          </div>
        </form>
      </div>
    </section>`;

    const form = view.querySelector('form');
    const msg = view.querySelector('.v195-msg');
    const back = view.querySelector('[data-bk-back]');
    if (back) back.onclick = () => { readStep(view, st); st.step = Math.max(first, st.step - 1); wizard(view, st); };
    form.onsubmit = async (ev) => {
      ev.preventDefault();
      readStep(view, st);
      const err = checkStep(st);
      if (err) { msg.textContent = err; msg.classList.add('bad'); return; }
      msg.textContent = ''; msg.classList.remove('bad');
      if (st.step < 3) { st.step += 1; wizard(view, st); return; }
      await submitClaim(view, st, msg);
    };
    const first_input = view.querySelector('input');
    if (first_input && st.step > 1) first_input.focus({ preventScroll: true });
  }

  async function submitClaim(view, st, msg) {
    const btn = view.querySelector('[data-bk-claim]');
    const d = st.draft;
    btn.disabled = true; btn.textContent = 'Claiming…';
    try {
      const r = await api('/api/black-card/claim', {
        method: 'POST',
        body: JSON.stringify({ address: { name: d.name, phone: d.phone, line1: d.line1, line2: d.line2,
          city: d.city, state: d.state, pincode: d.pincode } }),
      });
      if (r && r.user) state.user = Object.assign({}, state.user, r.user);
      mem = { uid: state.user ? state.user.id : null, at: Date.now(), p: Promise.resolve(), val: r.membership || null };
      toast(r.created ? 'Shivaa Black card claimed. Your free card is on its way.' : 'Your Shivaa Black card is up to date.');
      memberPage(view, r.membership);
    } catch (e) {
      btn.disabled = false; btn.textContent = 'Claim my free card';
      msg.textContent = (e && e.message) || 'Could not claim the card. Please try again.';
      msg.classList.add('bad');
    }
  }

  async function page(view) {
    if (!state.user) return signedOutPage(view);
    view.innerHTML = '<section class="v195-page container"><p class="v195-loading">Opening your Shivaa Black card…</p></section>';
    const m = await memberNow();
    if (m) return memberPage(view, m);
    wizard(view, { step: 1, draft: draftFrom(null) });
  }

  window.ShivaaBlack = { fill, page, heroHTML, cardArt };
  // The home hero may draw before this file loads; fill it again once it is ready.
  (document.readyState === 'loading'
    ? document.addEventListener.bind(document, 'DOMContentLoaded')
    : (f => f()))(() => fill(document));
})();
