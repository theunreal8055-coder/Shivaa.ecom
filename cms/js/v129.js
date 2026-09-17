/* ══════════════════════════════════════════════════════════════════════
   SHIVAA v129 — SHOW THE REASON CASHFREE REFUSES.

   THE BUG (real, in our own code — cms/js/app.js:4142-4149):

       window.Shivaa.cashfreeCheckout = async (paymentSessionId, env) => {
         const ok = await loadExternalScript('…/v3/cashfree.js');
         if (!ok || typeof window.Cashfree !== 'function') throw new Error(…);
         const cf = window.Cashfree({ mode: … });
         cf.checkout({ paymentSessionId: …, redirectTarget: '_self' });   // ← return value DISCARDED
         return true;                                                      // ← always "success"
       };

   Cashfree's official Web Element SDK documents checkout() as returning a
   Promise that resolves with EITHER `result.error` (with a human-readable
   `result.error.message`) OR `result.redirect`. Our line called it as if it
   were fire-and-forget: the promise was dropped on the floor, the function
   returned `true` unconditionally, and `payForOrder` therefore believed the
   hand-off had worked. When Cashfree actually refused — wrong mode, a session
   minted against the other environment, a domain still not live, an expired
   payment_session_id, an account restriction — the reason existed, in the
   browser, for a few milliseconds, and nothing ever read it. The shopper was
   left on "Opening secure Cashfree checkout…" forever. That spinner is the
   symptom; the discarded promise is the cause.

   WHAT THIS LAYER DOES — and nothing else:
     · re-implements Shivaa.cashfreeCheckout so it AWAITS checkout() and reads
       result.error.message;
     · paints that exact message into the hand-off sheet as a red box that
       STAYS on screen (a toast auto-dismisses after 3.2 s and was being
       missed), together with the environment, the session-id prefix and the
       error code/type — the things that identify which of the candidate
       causes it actually is;
     · still throws, so app.js's existing `.catch(e => toast(e.message…))`
       keeps working exactly as before;
     · adds a watchdog: if the SDK neither errors nor redirects, it says so
       plainly instead of pretending. It does NOT invent an error.

   It does NOT touch a design, a colour, a route, a price, a rate, an API, the
   service worker, or the release stamps. It overrides ONE function on the
   window.Shivaa object, which app.js resolves at call time — so `payForOrder`
   picks this version up with no edit to app.js's 553 KB.

   HOUSE RULES HONOURED (see MEMORY.md / HANDOFF.md):
     #3  a repair never swaps sw.js  → sw.js is NOT in this patch.
         This file is brand new, so no cache can be holding an old copy of it,
         and index.html is served `access plus 0 seconds`. A worker swap would
         make every device wipe and re-fetch its whole cache — the v126/v125-fix
         failure mode — to solve a problem a new filename already solves.
     · no stamp bump: __SHIVAA_REL / APP_REL / SHELL stay exactly as found.
   ══════════════════════════════════════════════════════════════════════ */
'use strict';
(function () {

  var SDK = 'https://sdk.cashfree.com/js/v3/cashfree.js';
  /* How long to wait before telling the shopper "nothing came back". The
     hosted page normally takes the browser away well inside this. */
  var WATCHDOG_MS = 9000;

  /* ── the sheet app.js paints while handing off (id="cfHandoff") ───────── */
  function sheet() { return document.getElementById('cfHandoff'); }

  function clearBox() {
    var old = document.getElementById('cfWhy');
    if (old && old.parentNode) old.parentNode.removeChild(old);
  }

  /* Paint a persistent panel inside the hand-off sheet. `tone` is 'err' for a
     real refusal from Cashfree, 'wait' for the honest "no answer yet" note.
     Styles are inline on purpose: this patch ships no CSS file. */
  function box(tone, title, message, facts) {
    var host = sheet();
    if (!host) return false;
    clearBox();
    var err = tone === 'err';
    var el = document.createElement('div');
    el.id = 'cfWhy';
    el.setAttribute('role', err ? 'alert' : 'status');
    el.style.cssText = [
      'margin:14px 0 2px', 'padding:12px 14px', 'border-radius:14px',
      'border:1px solid ' + (err ? '#f0c7c0' : '#e8dcc0'),
      'background:' + (err ? '#fdf2f0' : '#fbf7ec'),
      'text-align:left', 'font-size:13px', 'line-height:1.5',
      'word-break:break-word',
    ].join(';');

    var h = document.createElement('b');
    h.style.cssText = 'display:block;font-size:13.5px;margin-bottom:4px;color:' + (err ? '#b3261e' : '#7a5c12');
    h.textContent = title;
    el.appendChild(h);

    var p = document.createElement('div');
    p.style.cssText = 'color:#2a2a2a';
    p.textContent = message;
    el.appendChild(p);

    if (facts) {
      var s = document.createElement('small');
      s.style.cssText = 'display:block;margin-top:7px;color:#6b6b6b;font-size:11.5px';
      s.textContent = facts;
      el.appendChild(s);
    }

    var tip = document.createElement('small');
    tip.style.cssText = 'display:block;margin-top:7px;color:#6b6b6b;font-size:11.5px';
    tip.textContent = 'Screenshot this box and send it — it names the exact cause.';
    el.appendChild(tip);

    /* above the buttons, below the explanatory copy */
    var btn = document.getElementById('cfContinue');
    if (btn && btn.parentNode === host) host.insertBefore(el, btn);
    else host.appendChild(el);
    return true;
  }

  /* Identify the attempt without ever printing the whole session id (it is a
     payment credential — a prefix is enough to tell two attempts apart). */
  function facts(sessionId, env, extra) {
    var sid = String(sessionId || '');
    var bits = [
      'mode: ' + (env === 'sandbox' ? 'sandbox' : 'production'),
      'session: ' + (sid ? sid.slice(0, 12) + '… (' + sid.length + ' chars)' : 'MISSING'),
      'origin: ' + (location.host || '—'),
    ];
    if (extra) bits.push(extra);
    return bits.join('  ·  ');
  }

  /* Pull a message out of whatever shape the SDK hands back. Cashfree
     documents result.error.message; be tolerant of the rest. */
  function readError(e) {
    if (!e) return '';
    if (typeof e === 'string') return e;
    return String(e.message || e.description || e.reason || e.error_description || '') || '';
  }
  function readCode(e) {
    if (!e || typeof e === 'string') return '';
    var code = e.code || e.error_code || e.status || '';
    var type = e.type || e.error_type || '';
    var out = [];
    if (type) out.push('type: ' + type);
    if (code) out.push('code: ' + code);
    return out.join('  ·  ');
  }

  function loadSdk() {
    return new Promise(function (resolve) {
      if (typeof window.Cashfree === 'function') return resolve(true);
      var existing = document.querySelector('script[src="' + SDK + '"]');
      if (existing) {
        /* app.js may already have injected it; wait for that same tag */
        existing.addEventListener('load', function () { resolve(true); }, { once: true });
        existing.addEventListener('error', function () { resolve(false); }, { once: true });
        /* if it finished before we attached, the global is already there */
        if (typeof window.Cashfree === 'function') resolve(true);
        return;
      }
      var s = document.createElement('script');
      s.src = SDK;
      s.onload = function () { resolve(true); };
      s.onerror = function () { resolve(false); };
      document.head.appendChild(s);
    });
  }

  /* ── the replacement ──────────────────────────────────────────────────── */
  function install() {
    if (!window.Shivaa) return false;
    if (window.Shivaa.__v129) return true;
    window.Shivaa.__v129 = true;

    window.Shivaa.cashfreeCheckout = async function (paymentSessionId, env) {
      clearBox();

      /* A session id the server never minted can only ever spin. Say so. */
      if (!paymentSessionId) {
        var m0 = 'No payment session was created, so there is nothing for Cashfree to open. This is a server-side failure of /api/pay/order, not a browser problem.';
        box('err', 'Cashfree could not be opened', m0, facts(paymentSessionId, env));
        throw new Error(m0);
      }

      var loaded = await loadSdk();
      if (!loaded || typeof window.Cashfree !== 'function') {
        var m1 = 'The Cashfree SDK script could not be downloaded from sdk.cashfree.com. Check the connection, or an ad-blocker / privacy extension blocking it.';
        box('err', 'Cashfree could not load', m1, facts(paymentSessionId, env));
        throw new Error(m1);
      }

      var cf;
      try {
        cf = window.Cashfree({ mode: env === 'sandbox' ? 'sandbox' : 'production' });
      } catch (e) {
        var m2 = readError(e) || 'The Cashfree SDK refused to initialise.';
        box('err', 'Cashfree refused to initialise', m2, facts(paymentSessionId, env, readCode(e)));
        throw new Error(m2);
      }

      /* THE FIX: checkout() returns a Promise. Await it and read it. */
      var result;
      var settled = false;
      var watchdog = setTimeout(function () {
        if (settled) return;
        box('wait',
          'Still waiting for Cashfree',
          'The SDK loaded and the payment page was requested, but Cashfree has not answered and has not redirected this tab. Use "Continue to Cashfree" once; if this note stays, the session was accepted but the hosted page is not opening.',
          facts(paymentSessionId, env));
      }, WATCHDOG_MS);

      try {
        result = await Promise.resolve(cf.checkout({
          paymentSessionId: String(paymentSessionId),
          redirectTarget: '_self',
        }));
      } catch (e) {
        settled = true; clearTimeout(watchdog);
        var m3 = readError(e) || 'Cashfree rejected the payment session.';
        box('err', 'Cashfree refused this payment', m3, facts(paymentSessionId, env, readCode(e)));
        throw new Error(m3);
      }
      settled = true; clearTimeout(watchdog);

      if (result && result.error) {
        var m4 = readError(result.error) || 'Cashfree refused this payment session but gave no message.';
        box('err', 'Cashfree refused this payment', m4,
          facts(paymentSessionId, env, readCode(result.error)));
        throw new Error(m4);
      }

      /* result.redirect — the browser is leaving; nothing to paint. */
      return true;
    };
    return true;
  }

  if (!install()) {
    /* app.js is deferred like this file but order is not worth betting on */
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', install, { once: true });
    }
    try { window.addEventListener('load', install, { once: true }); } catch (e) {}
    try { setTimeout(install, 800); } catch (e) {}
  }

})();
