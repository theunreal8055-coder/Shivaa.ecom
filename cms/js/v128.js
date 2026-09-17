/* ══════════════════════════════════════════════════════════════════════════
   SHIVAA v128 — SBIePay (State Bank of India) hosted checkout.

   What this file does, and nothing else:

   1 · HANDOFF. app.js's payForOrder() understands 'payu' / 'upi-proof' /
       'demo'. SBIePay's hosted page is a server-signed form POST exactly like
       PayU's, so the shop's `/api/pay/order` now answers `mode:'sbiepay'`
       with `{action, fields:{EncryptTrans, merchIdVal}}`. This layer wraps
       Shivaa.payForOrder: when the server says the live mode is sbiepay it
       paints the same "opening your bank" sheet and auto-submits that form;
       every other mode is passed straight through to the untouched app.js
       implementation.

   2 · COPY. The checkout/pending banner strings in app.js say "PayU". When —
       and only when — the server reports SBIePay as the live gateway, they
       are re-labelled, so a customer is never told the wrong bank name.

   Safety: the POST target must be an https SBI host. The fields are produced
   server-side (the seller key that encrypts EncryptTrans never reaches the
   browser), and the money is only ever credited by the server after SBI's own
   status API confirms it — this file cannot mark anything paid.

   Nothing here runs while Payments → provider is Demo / PayU.
   ══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (!window.Shivaa || typeof window.Shivaa.payForOrder !== 'function') return;

  /* SBI's own domains: sbiepay.sbi (live), test.sbiepay.sbi (UAT),
     *.sbi.bank.in (their older host shape). Anything else is refused. */
  const SBI_HOST = /\.sbi(\.bank\.in)?$/i;

  let liveMode = null;
  const cfgReady = (async () => {
    try {
      const c = await window.Shivaa.api('/api/pay/config');
      liveMode = c && c.mode ? String(c.mode) : null;
    } catch (e) { /* offline: fall through to app.js behaviour */ }
  })();

  /* ── the form POST to the bank (mirrors Shivaa.payuSubmit) ── */
  window.Shivaa.sbiSubmit = (action, fields) => {
    let u;
    try { u = new URL(action, location.href); } catch (_) { throw new Error('Invalid SBIePay payment address'); }
    if (!/^https:$/.test(u.protocol) || !SBI_HOST.test(u.hostname)) throw new Error('Unsafe SBIePay payment address');
    const f = document.createElement('form');
    f.method = 'POST'; f.action = u.href; f.style.display = 'none'; f.target = '_self';
    for (const [k, v] of Object.entries(fields || {})) {
      const i = document.createElement('input');
      i.type = 'hidden'; i.name = k; i.value = String(v == null ? '' : v);
      f.appendChild(i);
    }
    document.body.appendChild(f);
    HTMLFormElement.prototype.submit.call(f);   // immune to fields named "submit"
    return true;
  };

  function sbiRedirectSheet(retry) {
    return new Promise(resolve => {
      window.Shivaa.openModal(`<div style="text-align:center;padding:14px 6px" id="sbiHandoff">
        <div class="pp-spinner" aria-hidden="true"></div>
        <h3 style="margin:14px 0 6px">Opening SBIePay…</h3>
        <p style="color:var(--muted);font-size:13px">Keep this tab open. If the bank page does not open automatically, use the button below.</p>
        <button type="button" class="btn btn-gold btn-block" id="sbiContinue" style="margin-top:14px">Continue to SBIePay</button>
        <button type="button" class="btn btn-ghost btn-block" id="sbiCancel" style="margin-top:8px">Return to my order</button>
      </div>`);
      const go = document.getElementById('sbiContinue');
      if (go) go.onclick = () => { go.disabled = true; go.textContent = 'Opening SBIePay…'; retry(); setTimeout(() => { if (document.body.contains(go)) { go.disabled = false; go.textContent = 'Try SBIePay again'; } }, 5000); };
      const cancel = document.getElementById('sbiCancel');
      if (cancel) cancel.onclick = () => { window.Shivaa.closeModal(); resolve(false); };
    });
  }

  /* Returns true/false when it handled the order, or null to let app.js own it
     (server says the active gateway is not SBIePay any more). */
  async function sbiPay(orderId) {
    let po;
    try { po = await window.Shivaa.api('/api/pay/order', { method: 'POST', body: JSON.stringify({ orderId }) }); }
    catch (e) { window.Shivaa.toast(e.message, 'err'); return false; }
    if (!po || po.mode !== 'sbiepay') return null;
    if (!po.action || !po.fields || !po.fields.EncryptTrans) {
      window.Shivaa.toast('SBIePay checkout could not start — retry or use the UPI QR tab', 'err');
      return false;
    }
    window.Shivaa.toast('Taking you to SBIePay…');
    const handoff = () => {
      try { window.Shivaa.sbiSubmit(po.action, po.fields); }
      catch (e) { window.Shivaa.toast(e.message || 'SBIePay could not open — tap Try SBIePay again', 'err'); }
    };
    const waiting = sbiRedirectSheet(handoff);
    setTimeout(handoff, 50);   // let the sheet paint first (mobile-safe)
    return waiting;
  }

  const originalPayForOrder = window.Shivaa.payForOrder;
  window.Shivaa.payForOrder = async function (orderId, opts) {
    await cfgReady;
    if (liveMode === 'sbiepay') {
      const handled = await sbiPay(orderId);
      if (handled !== null) return handled;
    }
    return originalPayForOrder.call(this, orderId, opts);
  };

  /* ── only when SBIePay is the live gateway: relabel PayU wording ── */
  function patchCopy() {
    if (liveMode !== 'sbiepay') return;
    ['payOnlineSub', 'payDemoNote', 'ppBanner'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      if (!/payu/i.test(el.innerHTML)) return;
      el.innerHTML = el.innerHTML.replace(/PayU/g, 'SBIePay');
    });
  }
  /* toasts fired by app.js after a return ("PayU payment confirmed ✦") */
  const originalToast = window.Shivaa.toast;
  window.Shivaa.toast = function (msg) {
    if (liveMode === 'sbiepay' && typeof msg === 'string' && /payu/i.test(msg))
      msg = msg.replace(/PayU/g, 'SBIePay');
    return originalToast.apply(this, arguments);
  };
  /* ── SBIePay onboarding requires the refund policy to be accepted by the
     customer BEFORE they land on the bank page (their published merchant
     prerequisites). Only injected while SBIePay is the live gateway. ── */
  let consentWired = false;
  function injectPolicyConsent() {
    if (liveMode !== 'sbiepay') return;
    const summary = document.querySelector('.summary');
    if (!summary || document.getElementById('sbiPolicyBox')) return;
    const anchor = document.getElementById('placeBtn');
    const box = document.createElement('label');
    box.id = 'sbiPolicyBox';
    box.style.cssText = 'display:flex;gap:8px;align-items:flex-start;font-size:12.5px;color:var(--ink-2);margin:10px 0';
    box.innerHTML = '<input type="checkbox" id="sbiPolicyOk" style="margin-top:2px">' +
      '<span>I have read and accept the <a href="#/refund" target="_blank" rel="noopener">Returns &amp; Refund Policy</a> and the <a href="#/terms" target="_blank" rel="noopener">Terms of Sale</a>.</span>';
    const host = anchor && anchor.parentNode ? anchor.parentNode : summary;
    host.insertBefore(box, anchor && anchor.parentNode === host ? anchor : null);
    if (!consentWired) {
      consentWired = true;
      document.addEventListener('click', (e) => {
        const ok = document.getElementById('sbiPolicyOk');
        if (!ok || ok.checked) return;
        const cta = e.target.closest ? e.target.closest('#placeBtn, .mcta-bar .btn-gold') : null;
        if (!cta) return;
        e.preventDefault(); e.stopImmediatePropagation();
        window.Shivaa.toast('Please accept the Returns & Refund Policy first', 'err');
      }, true);
    }
  }
  const patchSoon = () => {
    setTimeout(() => { patchCopy(); injectPolicyConsent(); }, 120);
    setTimeout(() => { patchCopy(); injectPolicyConsent(); }, 900);
  };
  const originalRedraw = window.Shivaa.redraw;
  window.Shivaa.redraw = function () {
    const r = originalRedraw.apply(this, arguments);
    patchSoon();
    return r;
  };
  addEventListener('hashchange', patchSoon);
  cfgReady.then(patchSoon);
})();
