/* ══════════════════════════════════════════════════════════════════════
   v234 · THE DESK APP SHELL
   ──────────────────────────────────────────────────────────────────────
   Loaded by /desk.html ONLY — never by index.html, so a shopper never pays
   for a byte of it. It does the things only an installed app needs:

     · install: capture `beforeinstallprompt`, offer it once, remember a
       dismissal; on iOS (no prompt API) teach the Share → Add to Home Screen
       route instead of showing a button that cannot work;
     · standalone: mark the document when the browser chrome is gone, so the
       layer can reclaim the notch and drop the install chip;
     · wake lock: a counter screen must not sleep mid-quote — opt-in, re-taken
       when the tab comes back, released when it goes;
     · pull-to-refresh: at the top of the board, a downward drag refreshes the
       rates (the gesture every Android trader already knows);
     · connectivity: one class on <html> plus a sentence in the toolbar, and a
       refresh the moment the network returns;
     · share: a quote or the day book through the phone's own share sheet.

   Everything is feature-detected. If any of it is missing, the desk still
   works — this file may never be the reason a jeweller cannot trade.
   ══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (!window.__SHIVAA_DESK) return;          /* belt and braces */
  const html = document.documentElement;
  const $ = s => document.querySelector(s);
  const on = (el, ev, fn, opt) => { if (el) el.addEventListener(ev, fn, opt); };
  const toast = m => { try { window.Shivaa && window.Shivaa.toast(m); } catch (e) {} };

  /* ── standalone ─────────────────────────────────────────────────────── */
  const standalone = () => {
    try {
      return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)
        || window.navigator.standalone === true
        || document.referrer.startsWith('android-app://');
    } catch (e) { return false; }
  };
  const markStandalone = () => html.classList.toggle('is-standalone', standalone());
  markStandalone();
  try {
    const mq = window.matchMedia('(display-mode: standalone)');
    if (mq && mq.addEventListener) mq.addEventListener('change', markStandalone);
  } catch (e) {}

  /* ── install ────────────────────────────────────────────────────────── */
  let deferred = null;
  const chip = () => $('[data-desk-install]');
  const showChip = () => { const c = chip(); if (c) c.hidden = false; };
  const hideChip = () => { const c = chip(); if (c) c.hidden = true; };

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e;
    if (!standalone() && localStorage.getItem('shv_desk_install_off') !== '1') showChip();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    hideChip();
    localStorage.setItem('shv_desk_install_off', '1');
    toast('Desk installed ✦ it now opens from your home screen');
  });

  /* one handler for the chip, wherever it is rendered */
  document.addEventListener('click', async (e) => {
    const btn = e.target && e.target.closest && e.target.closest('[data-desk-install]');
    if (!btn) return;
    e.preventDefault();
    if (deferred) {
      try {
        deferred.prompt();
        const res = await deferred.userChoice;
        if (res && res.outcome === 'accepted') toast('Installing the desk ✦');
        else localStorage.setItem('shv_desk_install_off', '1');
      } catch (err) { toast('Your browser blocked the install sheet — use its menu', 'err'); }
      deferred = null;
      hideChip();
      return;
    }
    /* no prompt API: say what actually works on this device */
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    window.Shivaa.openModal(`<h3>${ios ? 'Add to Home Screen' : 'Install the desk'}</h3>
      <p style="font-size:13.5px;line-height:1.8;color:var(--ink-2)">${ios
        ? 'Tap the <b>Share</b> button in Safari, then <b>Add to Home Screen</b>. The desk then opens full-screen, with its own icon.'
        : 'Open this page in <b>Chrome</b> or <b>Edge</b> and choose <b>Install app</b> (or the ⊕ in the address bar). Chrome only offers it on https:// — this desk is installed from <b>shivaa.in/desk.html</b>.'}</p>
      <p style="font-size:12.5px;color:var(--ink-3)">On a counter PC the same page is already the app: press <b>F11</b> for full screen and use the keyboard map (<b>?</b>).</p>`);
  });

  /* ── wake lock (keep the counter screen awake) ──────────────────────── */
  let wake = null;
  async function takeWake() {
    if (!('wakeLock' in navigator)) { toast('This browser cannot keep the screen on', 'err'); return; }
    try {
      wake = await navigator.wakeLock.request('screen');
      document.documentElement.classList.add('shv-awake');
      toast('Screen stays on while the desk is open ✦');
      wake.addEventListener('release', () => document.documentElement.classList.remove('shv-awake'));
    } catch (e) { toast('Could not keep the screen on — check battery saver', 'err'); }
  }
  document.addEventListener('click', (e) => {
    const b = e.target && e.target.closest && e.target.closest('[data-desk="wake"]');
    if (!b) return;
    if (wake) { try { wake.release(); } catch (err) {} wake = null; b.classList.remove('is-on'); toast('Screen sleep back to normal'); }
    else { takeWake(); b.classList.add('is-on'); }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && wake === null && html.classList.contains('shv-awake')) takeWake();
  });

  /* ── pull to refresh ────────────────────────────────────────────────── */
  (function ptr() {
    let startY = 0, pulling = false, armed = false;
    const bar = () => {
      let el = document.getElementById('deskPull');
      if (!el) {
        el = document.createElement('div');
        el.id = 'deskPull';
        el.style.cssText = 'position:fixed;left:50%;top:6px;transform:translateX(-50%) translateY(-40px);'
          + 'z-index:95;padding:6px 14px;border-radius:999px;font:600 11.5px/1 system-ui;'
          + 'letter-spacing:.1em;text-transform:uppercase;color:#1a1208;background:#e9c77a;'
          + 'opacity:0;transition:opacity .18s,transform .18s;pointer-events:none';
        el.textContent = 'pull to refresh';
        document.body.appendChild(el);
      }
      return el;
    };
    const setPull = (px) => {
      const el = bar();
      el.style.opacity = px > 8 ? '1' : '0';
      el.style.transform = 'translateX(-50%) translateY(' + Math.min(40, px) + 'px)';
      el.textContent = px > 64 ? 'release to refresh' : 'pull to refresh';
    };
    on(document, 'touchstart', (e) => {
      if (e.touches.length !== 1) return;
      if ((window.scrollY || window.pageYOffset || 0) > 0) return;
      if (e.target.closest && e.target.closest('input,select,textarea,.bd-tabs')) return;
      startY = e.touches[0].clientY; pulling = true; armed = false;
    }, { passive: true });
    on(document, 'touchmove', (e) => {
      if (!pulling) return;
      const dy = e.touches[0].clientY - startY;
      if (dy <= 0) { setPull(0); return; }
      armed = dy > 64;
      setPull(dy * 0.6);
    }, { passive: true });
    on(document, 'touchend', () => {
      if (!pulling) return;
      pulling = false;
      const el = bar();
      el.style.opacity = '0'; el.style.transform = 'translateX(-50%) translateY(-40px)';
      if (armed && window.ShivaaBullion && window.ShivaaBullion.refresh) {
        armed = false;
        el.textContent = 'refreshing…';
        window.ShivaaBullion.refresh(true);
        toast('Rates refreshed ✦');
      }
      armed = false;
    });
  })();

  /* ── connectivity ───────────────────────────────────────────────────── */
  const net = () => {
    const off = navigator.onLine === false;
    html.classList.toggle('shv-offline', off);
    const lbl = $('[data-desk-net]');
    if (lbl) lbl.textContent = off ? 'offline · saved board' : 'live';
    if (!off && window.ShivaaBullion && window.ShivaaBullion.refresh && !net._was) {
      net._was = true;
      setTimeout(() => window.ShivaaBullion.refresh(true), 400);
    }
    net._was = !off ? true : false;
  };
  window.addEventListener('online', () => { net(); toast('Back online ✦ refreshing the board'); });
  window.addEventListener('offline', () => { net(); toast('No network — showing the last saved board', 'err'); });
  net();

  /* ── share ──────────────────────────────────────────────────────────── */
  window.ShivaaDeskShare = async function (text, title) {
    const payload = { title: title || 'Shivaa Bullion Desk', text: String(text || '') };
    try {
      if (navigator.share) { await navigator.share(payload); return true; }
    } catch (e) { if (e && e.name === 'AbortError') return false; }
    try {
      await navigator.clipboard.writeText(payload.text);
      toast('Copied ✦ paste it into WhatsApp');
      return true;
    } catch (e) {
      window.Shivaa.openModal(`<h3>${payload.title}</h3><textarea readonly style="width:100%;height:170px">${window.Shivaa.esc(payload.text)}</textarea>`);
      return false;
    }
  };

  /* the desk is ready — say so once, quietly */
  window.addEventListener('load', () => {
    setTimeout(() => {
      if (!standalone() && deferred && localStorage.getItem('shv_desk_install_off') !== '1') showChip();
      else if (!standalone()) showChip();
    }, 2500);
  });
})();
