/* ═══════════════════════════════════════════════════════════════════════
   AURUM · v96 — premium motion engine for Shivaa
   Self-contained, defensive: works with JS errors elsewhere, never blocks
   rendering. Transform/opacity/filter only · passive listeners · full
   reduced-motion + low-power fallbacks. Zero dependencies on app.js.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.__shvAurum) return;
  window.__shvAurum = true;

  var root = document.documentElement;
  var reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  var reduced = reduceMQ.matches;
  var coarse = window.matchMedia('(pointer: coarse)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* low-power detection: save-data, ≤4 logical cores or ≤2GB RAM */
  (function lowPower() {
    var lite = false;
    try {
      var c = navigator.connection || navigator.mozConnection;
      if (c && c.saveData) lite = true;
    } catch (e) {}
    if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) lite = true;
    if (navigator.deviceMemory && navigator.deviceMemory <= 2) lite = true;
    root.classList.add('js-aurum');
    if (lite) root.classList.add('au-lite');
    root.classList.add(fine ? 'au-fine' : 'au-touch');
  })();
  var lite = root.classList.contains('au-lite');
  var waapi = typeof Element !== 'undefined' && !!Element.prototype.animate;

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function onMM(mm, fn) {
    try {
      if (mm.addEventListener) mm.addEventListener('change', fn);
      else if (mm.addListener) mm.addListener(fn);
    } catch (e) {}
  }
  onMM(reduceMQ, function (e) { reduced = e.matches; });
  function haptic(p) {
    if (coarse && !reduced && navigator.vibrate) {
      try { navigator.vibrate(p); } catch (e) {}
    }
  }
  var rAF = window.requestAnimationFrame || function (f) { return setTimeout(f, 16); };

  /* ── 1 · Page transitions around #view.innerHTML swaps ────────────────
     Snapshot clone crossfade: the live DOM is swapped SYNCHRONOUSLY (so
     app.js's immediate $('#…') binding never breaks), and a frozen clone
     of the outgoing view is animated away on top. */
  (function pageTransitions() {
    if (reduced || !waapi || !document.body) return;
    var view = $('#view');
    if (!view) return;
    /* innerHTML's accessor lives on Element.prototype — walk the chain */
    var desc = null, proto = Object.getPrototypeOf(view);
    while (proto && !desc) {
      desc = Object.getOwnPropertyDescriptor(proto, 'innerHTML');
      if (!desc || !desc.set) { proto = Object.getPrototypeOf(proto); }
    }
    if (!desc || !desc.set) return;

    var navTs = -Infinity; // -Infinity = no navigation pending
    function arm() { navTs = performance.now(); }
    /* capture phase: fires BEFORE app.js's bubble-phase router, covering
       anchor clicks, back/forward AND programmatic location.hash sets
       (checkout, order success, search) */
    window.addEventListener('hashchange', arm, true);
    window.addEventListener('popstate', arm, true);
    document.addEventListener('click', function (e) {
      var t = e.target;
      if (t && t.closest && t.closest('a[href^="#"], [data-route], [data-mc-close]')) arm();
    }, true);

    var busy = false;
    Object.defineProperty(view, 'innerHTML', {
      configurable: true,
      get: function () { return desc.get.call(this); },
      set: function (html) {
        var str = String(html);
        var recent = performance.now() - navTs < 5200;
        var ov = null, outAnim = null;
        /* loading skeletons must NOT consume the pending transition —
           stay armed so the real content swap gets the crossfade */
        var isSkel = str.indexOf('class="skeleton') !== -1;
        /* one transition per navigation; ignore tiny swaps and background
           re-renders (rate ticks, cart refreshes) */
        if (recent && !busy && !isSkel && str.length > 160 && view.children.length) {
          navTs = -Infinity;
          busy = true;
          try {
            var sy = window.scrollY;
            var snap = view.cloneNode(true);
            var inner = document.createElement('div');
            inner.className = 'au-vt-in';
            inner.appendChild(snap);
            ov = document.createElement('div');
            ov.className = 'au-vt';
            ov.setAttribute('aria-hidden', 'true');
            ov.appendChild(inner);
            document.body.appendChild(ov);

            window.scrollTo(0, 0);
            desc.set.call(view, str);
            /* motion.js (#view.pg mPage) animates the incoming view;
               only the frozen snapshot is animated here, so the two
               systems never fight over #view's transform. */
            var mobile = coarse || window.innerWidth <= 768;
            outAnim = inner.animate(
              mobile
                ? [{ opacity: 1, transform: 'translate3d(0,' + (-sy) + 'px,0) translateX(0) scale(1)', filter: 'blur(0)' },
                   { opacity: 0, transform: 'translate3d(0,' + (-sy) + 'px,0) translateX(-5%) scale(.985)', filter: 'blur(2px)' }]
                : [{ opacity: 1, transform: 'translate3d(0,' + (-sy) + 'px,0) scale(1)', filter: 'blur(0)' },
                   { opacity: 0, transform: 'translate3d(0,' + (-sy - 12) + 'px,0) scale(1.015)', filter: 'blur(4px)' }],
              { duration: mobile ? 240 : 260, easing: 'cubic-bezier(.4,0,.7,.4)', fill: 'forwards' }
            );
            var finish = function () {
              if (ov && ov.parentNode) ov.parentNode.removeChild(ov);
              busy = false;
            };
            Promise.resolve(outAnim.finished).catch(function () {}).then(finish, finish);
            setTimeout(finish, 900);
          } catch (err) {
            busy = false;
            if (ov && ov.parentNode) ov.parentNode.removeChild(ov);
            desc.set.call(view, str);
          }
        } else {
          desc.set.call(this, str);
        }
      }
    });
  })();

  /* ── 2 · micro-ripple on small controls ────────────────────────────── */
  (function ripples() {
    if (reduced) return;
    /* compact controls only — never card/label rows whose selected
       box-shadow or focus ring overflow:hidden would clip */
    var SEL = '.chip,.size-pill,.cb-arrow,.gal-nav,.c-arrow,.mnav a,.pc-quick,' +
      '.svc-chips button,.qty-row button,.c-dot,.pf-chip,' +
      '.am2,.ps-tab,.finq-chip,.fp-chip,.mp-chip';
    document.addEventListener('pointerdown', function (e) {
      var el = e.target.closest && e.target.closest(SEL);
      if (!el || el.querySelector(':scope > .au-rip')) return;
      el.classList.add('au-rip-host');
      var r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      var size = Math.max(r.width, r.height) * 1.25;
      var sp = document.createElement('span');
      sp.className = 'au-rip';
      sp.style.left = (e.clientX - r.left) + 'px';
      sp.style.top = (e.clientY - r.top) + 'px';
      sp.style.width = sp.style.height = size + 'px';
      el.appendChild(sp);
      setTimeout(function () { if (sp.parentNode) sp.parentNode.removeChild(sp); }, 650);
    }, { passive: true });
  })();

  /* ── 3 · pointer-tracked sheen on product cards (fine pointers) ─────── */
  (function cardSheen() {
    if (reduced || !fine) return;
    var raf = 0, cur = null, x = 0, y = 0;
    document.addEventListener('pointermove', function (e) {
      var c = e.target.closest && e.target.closest('.p-card');
      if (!c) return;
      var r = c.getBoundingClientRect();
      if (!r.width || !r.height) return;
      x = ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%';
      y = ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%';
      cur = c;
      if (!raf) raf = rAF(function () {
        raf = 0;
        if (cur) { cur.style.setProperty('--mx', x); cur.style.setProperty('--my', y); }
      });
    }, { passive: true });
  })();

  /* cursor glow swells over hot elements (fine pointers) */
  (function cursorHot() {
    if (!fine) return;
    var HOT = 'a,button,.p-card,.cat-card,.cb-item,.cat-mini-card,.chip,.size-pill,input,select,label,summary,.tv-card,[role="button"]';
    var hot = false;
    document.addEventListener('pointermove', function (e) {
      var on = !!(e.target && e.target.closest && e.target.closest(HOT));
      if (on !== hot) { hot = on; document.body.classList.toggle('cursor-hot', on); }
    }, { passive: true });
  })();

  /* bottom-nav tab-change haptic (touch) */
  document.addEventListener('click', function (e) {
    if (!coarse || reduced) return;
    var t = e.target;
    if (t && t.closest && t.closest('.mnav a')) haptic(6);
  });

  /* ── 4 · scroll hub: mnav autohide + back-top ring + parallax ──────── */
  var mnav = { el: null, ind: null };
  (function bottomNav() {
    var nav = $('.mnav');
    if (!nav) return;
    mnav.el = nav;
    var ind = document.createElement('span');
    ind.className = 'mnav-ind';
    nav.appendChild(ind);
    mnav.ind = ind;

    var lastOn = null;
    function move() {
      var on = $('.mnav a.on');
      var cs = getComputedStyle(nav);
      var visible = on && cs.display !== 'none' && cs.visibility !== 'hidden';
      if (!visible) {
        /* strictly idempotent toggles — no mutation, no observer feedback */
        if (nav.classList.contains('has-ind')) nav.classList.remove('has-ind');
        return;
      }
      var nr = nav.getBoundingClientRect(), r = on.getBoundingClientRect();
      if (!nr.width) return;
      var ix = (r.left - nr.left) + 'px', iw = r.width + 'px';
      if (nav.style.getPropertyValue('--au-ix') !== ix) nav.style.setProperty('--au-ix', ix);
      if (nav.style.getPropertyValue('--au-iw') !== iw) nav.style.setProperty('--au-iw', iw);
      if (!nav.classList.contains('has-ind')) nav.classList.add('has-ind');
      /* spring-pop the newly active tab once */
      if (on !== lastOn) {
        if (lastOn) {
          on.classList.remove('au-tab');
          void on.offsetWidth;
          on.classList.add('au-tab');
          setTimeout(function () { on.classList.remove('au-tab'); }, 520);
        }
        lastOn = on;
      }
    }
    mnav.move = move;

    ['resize', 'orientationchange'].forEach(function (ev) {
      window.addEventListener(ev, function () { rAF(move); }, { passive: true });
    });
    new MutationObserver(move).observe(nav, { subtree: true, attributes: true, attributeFilter: ['class'] });
    new MutationObserver(move).observe(document.body, { attributes: true, attributeFilter: ['class', 'data-page'] });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(move).catch(function () {});
    [300, 1200, 2600].forEach(function (t) { setTimeout(move, t); });

    var lastY = window.scrollY, hidden = false, q = false;
    window.addEventListener('scroll', function () {
      if (q) return;
      q = true;
      rAF(function () {
        q = false;
        var y = window.scrollY;
        var blocked = document.body.classList.contains('drawer-open') ||
          document.body.classList.contains('cart-open') ||
          !!$('.modal-overlay.open') || !!$('.filters.open');
        if (y > 340 && y > lastY + 5 && !blocked) {
          if (!hidden) { hidden = true; document.body.classList.add('nav-hide'); }
        } else if (y < lastY - 6 || y < 260) {
          if (hidden) { hidden = false; document.body.classList.remove('nav-hide'); }
        }
        lastY = y;
      });
    }, { passive: true });
    window.addEventListener('hashchange', function () {
      hidden = false;
      document.body.classList.remove('nav-hide');
      lastY = window.scrollY;
      setTimeout(move, 350);
    });
  })();

  /* parallax media (desktop fine pointers, not low-power) */
  var pxImgs = [], pxOn = !(reduced || lite || !fine || window.innerWidth <= 1023), pxIO = null;
  function tagParallax() {
    if (!pxOn) return;
    if (!pxIO) {
      pxIO = new IntersectionObserver(function (ents) {
        ents.forEach(function (en) { en.target._auV = en.isIntersecting; });
      }, { rootMargin: '80px' });
    }
    var added = false;
    $$('.banner img, .poster img').forEach(function (im) {
      if (im._auPx) return;
      im._auPx = 1;
      im.classList.add('au-px');
      pxIO.observe(im);
      added = true;
    });
    if (added) pxImgs = $$('.au-px');
  }
  (function parallax() {
    if (!pxOn) return;
    setTimeout(tagParallax, 600);
  })();

  (function scrollHub() {
    var bt = $('#backTop'), q = false;   /* app.js injects #backTop; resolve lazily */
    function frame() {
      q = false;
      if (!bt) bt = $('#backTop');
      var doc = document.documentElement;
      var max = Math.max(1, doc.scrollHeight - window.innerHeight);
      var p = Math.min(1, Math.max(0, window.scrollY / max));
      if (bt) bt.style.setProperty('--au-p', p.toFixed(3));
      if (pxImgs.length) {
        var vh = window.innerHeight;
        for (var i = 0; i < pxImgs.length; i++) {
          var im = pxImgs[i];
          if (!im._auV) continue;
          var r = im.getBoundingClientRect();
          var prog = ((r.top + r.height / 2) - vh / 2) / vh;
          var ty = Math.max(-30, Math.min(30, -prog * 26));
          im.style.setProperty('--au-py', ty.toFixed(1) + 'px');
        }
      }
    }
    window.addEventListener('scroll', function () {
      if (!q) { q = true; rAF(frame); }
    }, { passive: true });
    window.addEventListener('resize', function () {
      if (!q) { q = true; rAF(frame); }
    }, { passive: true });
    setTimeout(frame, 800);
  })();

  /* ── 5 · scroll reveal tagging ─────────────────────────────────────── */
  var RISE_SEL = '.hstat,.cb-item,.tv-card,.cert-card,.step-item,.fin-tl,.pay-opt,' +
    '.cmp-card,.vault-card,.ms-card,.fine-card,.rte-card,' +
    '.cat-mini-card,.priv-sec,.mth-cell,.pfact,.acc,.addr-card,' +
    '.trust-note,.empty,.mc-empty';
  var RISE_CAP = 14;
  var riseIO = null, headIO = null;
  try {
    riseIO = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        riseIO.unobserve(el);
        el.classList.add('in');
        var d = 700 + (parseInt(el.style.getPropertyValue('--i'), 10) || 0) * 60;
        setTimeout(function () {
          el.classList.remove('au-rise');
          el.classList.add('au-done');
        }, d);
      });
    }, { threshold: .1, rootMargin: '0px 0px -8% 0px' });
    headIO = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) {
        if (en.isIntersecting) { headIO.unobserve(en.target); en.target.classList.add('au-hl'); }
      });
    }, { threshold: .4 });
  } catch (e) {}

  function tagRises(scope) {
    if (reduced || !riseIO) return;
    var n = {};
    $$(RISE_SEL, scope).forEach(function (el) {
      if (el.classList.contains('au-rise') || el.classList.contains('au-done')) return;
      var p = el.parentElement;
      if (!p) return;
      var key = p;
      n[key] = (n[key] || 0);
      if (n[key] >= RISE_CAP) { el.classList.add('au-done'); return; }
      el.classList.add('au-rise');
      el.style.setProperty('--i', n[key]);
      n[key]++;
      riseIO.observe(el);
      /* hard fallback: never leave content hidden */
      setTimeout(function () {
        if (el.classList.contains('au-rise')) {
          el.classList.add('in');
          setTimeout(function () {
            el.classList.remove('au-rise');
            el.classList.add('au-done');
          }, 900);
        }
      }, 3500);
    });
    $$('.sec-head:not(.rv):not(.au-hl)', scope).forEach(function (h) {
      if (headIO) headIO.observe(h);
    });
  }

  /* ── 6 · hero heading word split ───────────────────────────────────── */
  function heroSplit() {
    if (reduced) return;
    var h = $('#view .hero h1');
    if (!h || h.dataset.auSplit) return;
    h.dataset.auSplit = '1';
    (function wrap(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          if (!n.nodeValue.trim()) return;
          var parts = n.nodeValue.split(/(\s+)/);
          var frag = document.createDocumentFragment();
          parts.forEach(function (p) {
            if (!p) return;
            if (/^\s+$/.test(p)) frag.appendChild(document.createTextNode(p));
            else {
              var s = document.createElement('span');
              s.className = 'au-w';
              s.textContent = p;
              frag.appendChild(s);
            }
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1 && n.tagName !== 'SCRIPT' && n.tagName !== 'BR') {
          wrap(n);
        }
      });
    })(h);
    $$('.au-w', h).forEach(function (w, i) { w.style.setProperty('--i', i); });
  }

  /* ── 7 · count-up for hero stats ───────────────────────────────────── */
  var countIO = null;
  try {
    countIO = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        countIO.unobserve(el);
        if (reduced) return;
        var m = (el.textContent || '').trim().match(/^([^\d.]*)([\d,]+)(.*?)$/);
        if (!m) return;
        var target = parseInt(m[2].replace(/,/g, ''), 10);
        if (isNaN(target)) return;
        var pre = m[1], suf = m[3];
        el.classList.add('au-num');
        var t0 = null, DUR = 1150;
        function step(ts) {
          if (!t0) t0 = ts;
          var k = Math.min(1, (ts - t0) / DUR);
          var v = Math.round(target * (1 - Math.pow(1 - k, 3)));
          el.textContent = pre + v.toLocaleString('en-IN') + suf;
          if (k < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      });
    }, { threshold: .5 });
  } catch (e) {}
  function tagCounts() {
    if (!countIO) return;
    $$('#view .hstat b, [data-au-count]').forEach(function (el) {
      if (!el.dataset.auCounted) { el.dataset.auCounted = '1'; countIO.observe(el); }
    });
  }

  /* ── 8 · badge bumps for wishlist / compare counters ───────────────── */
  ['wishCount', 'cmpCount', 'mc-count', 'cartCount'].forEach(function (id) {
    var el = document.getElementById(id);
    if (!el) return;
    new MutationObserver(function () {
      el.classList.remove('au-bump');
      void el.offsetWidth;
      el.classList.add('au-bump');
    }).observe(el, { childList: true, characterData: true, subtree: true });
  });

  /* ── 9 · particle bursts + order confetti ──────────────────────────── */
  function burst(x, y, o) {
    if (reduced || !waapi || x == null || y == null) return;
    o = o || {};
    var n = o.n || 8;
    var colors = o.colors || ['#d4af5a', '#ffe9bd', '#b98a2f'];
    var glyphs = o.glyphs || ['✦', '✧', '◆', '•'];
    var up = !!o.up;
    for (var i = 0; i < n; i++) {
      (function () {
        var p = document.createElement('span');
        p.className = 'au-p';
        var ang;
        if (up) ang = -Math.PI * .85 + Math.random() * Math.PI * .7;
        else if (o.ang0 != null && o.ang1 != null) ang = o.ang0 + Math.random() * (o.ang1 - o.ang0);
        else ang = Math.random() * Math.PI * 2;
        var dist = (o.dist || 52) * (.5 + Math.random() * .8);
        var dx = Math.cos(ang) * dist * (o.dirX || 1);
        var dy = Math.sin(ang) * dist + (up ? 30 : 0);
        var rot = Math.random() * 240 - 120;
        var size = (o.size || 12) * (.8 + Math.random() * .6);
        p.style.left = x + 'px';
        p.style.top = y + 'px';
        p.style.setProperty('--au-s', size.toFixed(0) + 'px');
        p.style.color = colors[i % colors.length];
        p.textContent = glyphs[Math.floor(Math.random() * glyphs.length)];
        document.body.appendChild(p);
        var dur = (o.dur || 750) + Math.random() * 300;
        var a = p.animate([
          { transform: 'translate(-50%,-50%) translate(0,0) scale(.4) rotate(0deg)', opacity: 0 },
          { transform: 'translate(-50%,-50%) translate(' + (dx * .55) + 'px,' + (dy * .45) + 'px) scale(1.15) rotate(' + (rot * .4) + 'deg)', opacity: 1, offset: .35 },
          { transform: 'translate(-50%,-50%) translate(' + dx + 'px,' + dy + 'px) scale(.2) rotate(' + rot + 'deg)', opacity: 0 }
        ], { duration: dur, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' });
        a.onfinish = function () { if (p.parentNode) p.parentNode.removeChild(p); };
        a.oncancel = function () { if (p.parentNode) p.parentNode.removeChild(p); };
      })();
    }
  }

  function sealBurst() {
    var logo = $('#view .order-logo');
    var r = logo ? logo.getBoundingClientRect() : null;
    var cx = r ? r.left + r.width / 2 : window.innerWidth / 2;
    var cy = r ? r.top + r.height / 2 : window.innerHeight * .36;
    burst(cx, cy, { n: lite ? 12 : 30, dist: 170, dur: 1150, size: 15,
      glyphs: ['✦', '✧', '★', '◆', '♥'],
      colors: ['#d4af5a', '#ffe9bd', '#b98a2f', '#fff'] });
  }
  function confetti() {
    if (reduced || !waapi) return;
    /* app.js already rains a canvas confetti on the order page — then only
       layer the golden seal burst on top instead of a second rain */
    var appRain = !!document.querySelector('canvas[style*="position: fixed"],canvas[style*="position:fixed"]');
    if (!appRain) {
      var colors = ['#d4af5a', '#f7e6b4', '#b98a2f', '#3d0e15', '#fdf3dd', '#1f9d5c', '#e3395f'];
      var n = lite ? 26 : (coarse ? 60 : 110);
      var w = window.innerWidth, h = window.innerHeight;
      for (var i = 0; i < n; i++) {
        (function () {
          var c = document.createElement('span');
          c.className = 'au-confetti';
          c.style.left = (Math.random() * w) + 'px';
          c.style.background = colors[i % colors.length];
          if (Math.random() < .35) { c.style.borderRadius = '50%'; c.style.width = c.style.height = (6 + Math.random() * 6) + 'px'; }
          else { c.style.width = (6 + Math.random() * 5) + 'px'; c.style.height = (10 + Math.random() * 8) + 'px'; }
          document.body.appendChild(c);
          var sway = (Math.random() * 2 - 1) * w * .12;
          var dur = 1900 + Math.random() * 1300;
          var delay = Math.random() * 650;
          var rot = Math.random() * 720 - 360;
          var a = c.animate([
            { transform: 'translate3d(0,-6vh,0) rotate(0deg)', opacity: 1 },
            { transform: 'translate3d(' + sway * .5 + 'px,42vh,0) rotate(' + (rot * .5) + 'deg)', opacity: 1, offset: .55 },
            { transform: 'translate3d(' + sway + 'px,' + (h * 1.12) + 'px,0) rotate(' + rot + 'deg)', opacity: .95 }
          ], { duration: dur, delay: delay, easing: 'cubic-bezier(.25,.6,.5,1)', fill: 'forwards' });
          a.onfinish = function () { if (c.parentNode) c.parentNode.removeChild(c); };
        })();
      }
    }
    setTimeout(sealBurst, appRain ? 120 : 480);
    haptic([30, 50, 30]);
  }
  function checkConfetti() {
    var logo = $('#view .order-logo');
    if (logo && !logo.dataset.auConfetti) {
      logo.dataset.auConfetti = '1';
      setTimeout(confetti, 380);
    }
  }

  /* clicks: heart burst + add-to-cart sparkle */
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    var w = t.closest('.pc-wish');
    if (w) {
      if (w.classList.contains('on')) {
        var wr = w.getBoundingClientRect();
        burst(wr.left + wr.width / 2, wr.top + wr.height / 2, {
          n: lite ? 3 : 7, up: true, dist: 34, dur: 620, size: 13,
          glyphs: ['♥', '✦'], colors: ['#e3395f', '#f06a91', '#d4af5a']
        });
      }
      haptic(8);
    }
    var b = t.closest('.btn, button');
    if (b) {
      var oc = b.getAttribute('onclick') || '';
      var inSticky = !!b.closest('#pdpBuybar,.pd-stickybar,.mcta-bar');
      if (/addToCart|pdAdd/.test(oc) || b.id === 'bbAdd' || inSticky) {
        var x = e.clientX, y = e.clientY;
        if (x == null || x === 0) { var rr = b.getBoundingClientRect(); x = rr.left + rr.width / 2; y = rr.top + rr.height / 2; }
        burst(x, y, { n: lite ? 4 : 8, dist: 46, dur: 680, size: 11,
          glyphs: ['✦', '✧', '◆'], colors: ['#d4af5a', '#ffe9bd', '#b98a2f'] });
        haptic(15);
      }
    }
  });

  /* ── 10 · toasts: countdown bar + swipe-to-dismiss ─────────────────── */
  (function toasts() {
    var wrap = $('#toastWrap');
    if (!wrap) return;
    function wire(t) {
      if (t._au) return;
      t._au = 1;
      var bar = document.createElement('span');
      bar.className = 'au-tbar';
      t.appendChild(bar);
      var sx = 0, sy = 0, dx = 0, dy = 0, active = false, locked = null, pid = null;
      t.addEventListener('pointerdown', function (e) {
        sx = e.clientX; sy = e.clientY; active = true; dx = dy = 0; locked = null;
        t.style.transition = 'none';
        try { pid = e.pointerId; t.setPointerCapture(pid); } catch (err) { pid = null; }
      });
      t.addEventListener('pointermove', function (e) {
        if (!active) return;
        dx = e.clientX - sx; dy = e.clientY - sy;
        if (locked === null && (Math.abs(dx) > 9 || Math.abs(dy) > 9)) {
          locked = Math.abs(dx) > Math.abs(dy);
        }
        if (locked) {
          t.style.transform = 'translate(' + dx + 'px,' + Math.max(-8, dy * .3) + 'px)';
          t.style.opacity = String(Math.max(.35, 1 - Math.abs(dx) / 240));
        }
      });
      function rel() {
        if (!active) return;
        active = false;
        if (pid != null) { try { t.releasePointerCapture(pid); } catch (e) {} }
        t.style.transition = '';
        if (locked && Math.abs(dx) > 88) {
          t.style.transition = 'opacity .25s, transform .3s var(--au-soft)';
          t.style.transform = 'translateX(' + (dx > 0 ? '120%' : '-120%') + ')';
          t.style.opacity = '0';
          setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 320);
        } else {
          t.style.transform = '';
          t.style.opacity = '';
        }
      }
      t.addEventListener('pointerup', rel);
      t.addEventListener('pointercancel', rel);
    }
    new MutationObserver(function () { $$('.toast', wrap).forEach(wire); })
      .observe(wrap, { childList: true });
  })();

  /* ── 11 · drag-to-dismiss sheets (touch) ───────────────────────────── */
  function dragSheet(cfg) {
    /* cfg: sheet, overlay(optional, alpha var), axis:'y'|'x',
       edge(optional px from start side), handle selector, close fn */
    var sheet = cfg.sheet, start = 0, start2 = 0, d = 0, d2 = 0, active = false, locked = null, pid = null;
    var lastT = 0, lastD = 0, vel = 0;

    function reset(snap) {
      sheet.classList.remove('au-drag');
      if (cfg.overlay) cfg.overlay.style.removeProperty('--au-o');
      if (!snap) {
        sheet.style.transform = '';
        sheet.style.transition = '';
      } else {
        sheet.classList.add('modal-au-snap');
        sheet.style.transform = '';
        setTimeout(function () {
          sheet.classList.remove('modal-au-snap');
          sheet.style.transition = '';
        }, 520);
      }
      sheet.style.animation = sheet._auAnim || '';
    }
    function dismiss(fly) {
      sheet.style.transition = 'transform .3s ease-in, opacity .3s';
      sheet.style.transform = fly;
      sheet.style.opacity = '0';
      if (cfg.overlay) cfg.overlay.style.setProperty('--au-o', '0');
      setTimeout(function () {
        /* close first (hides the sheet), then reset styles on a frame
           so nothing snaps back visibly */
        cfg.close();
        requestAnimationFrame(function () {
          sheet.style.opacity = '';
          reset(false);
        });
      }, 290);
    }
    sheet._auDragReset = reset;

    sheet.addEventListener('pointerdown', function (e) {
      /* never hijack taps on real controls */
      if (e.target.closest && e.target.closest('button,a,input,select,textarea,label,summary,video,[contenteditable="true"]')) return;
      if (cfg.handle) {
        /* a dedicated .au-grab element swallows the touch entirely; a
           selector-based handle (sheet header bar) only needs a hit test */
        var h = e.target.closest(cfg.handle);
        if (cfg.grabEl) { if (e.target !== cfg.grabEl && !h) return; }
        else if (!h) return;
      }
      var r = sheet.getBoundingClientRect();
      if (cfg.zoneTop != null && (e.clientY - r.top) > cfg.zoneTop) return;
      if (cfg.edge != null) {
        var fromEdge = cfg.axis === 'x' ? (e.clientX - r.left) : (e.clientY - r.top);
        if (fromEdge > cfg.edge) return;
      }
      active = true; locked = null; d = d2 = 0; vel = 0;
      start = cfg.axis === 'x' ? e.clientX : e.clientY;
      start2 = cfg.axis === 'x' ? e.clientY : e.clientX;
      try { pid = e.pointerId; sheet.setPointerCapture(pid); } catch (err) { pid = null; }
    });
    sheet.addEventListener('pointermove', function (e) {
      if (!active) return;
      var main = (cfg.axis === 'x' ? e.clientX : e.clientY) - start;
      var cross = (cfg.axis === 'x' ? e.clientY : e.clientX) - start2;
      if (locked === null && (Math.abs(main) > 8 || Math.abs(cross) > 8)) {
        locked = Math.abs(main) > Math.abs(cross);
        if (locked) {
          sheet.classList.add('au-drag');
          if (sheet.style.animation !== 'none') { sheet._auAnim = sheet.style.animation; sheet.style.animation = 'none'; }
        }
      }
      if (!locked) return;
      /* only positive direction dismisses (down / right) */
      d = main > 0 ? main : main * .28;
      d2 = cross;
      var now = performance.now();
      if (now - lastT) vel = (main - lastD) / (now - lastT);
      lastT = now; lastD = main;
      sheet.style.transform = cfg.axis === 'x'
        ? 'translateX(' + d + 'px)'
        : 'translateY(' + d + 'px)';
      if (cfg.overlay) {
        var o = Math.max(0, 1 - Math.abs(d) / 680);
        cfg.overlay.style.setProperty('--au-o', o.toFixed(3));
      }
    });
    function up() {
      if (!active) return;
      active = false;
      if (pid != null) { try { sheet.releasePointerCapture(pid); } catch (e) {} }
      var threshold = cfg.axis === 'x' ? 120 : 150;
      if (locked && (d > threshold || vel > .55)) {
        dismiss(cfg.axis === 'x' ? 'translateX(110%)' : 'translateY(110%)');
      } else if (locked) {
        reset(true);
      }
    }
    sheet.addEventListener('pointerup', up);
    sheet.addEventListener('pointercancel', up);
  }

  /* modals (bottom sheets ≤768) */
  (function modalDrag() {
    var ov = $('#modalOverlay');
    if (!ov) return;
    var sheetMQ = window.matchMedia('(max-width: 768px)');
    var bound = false;
    function ensureGrab(m) {
      var g = $('.au-grab', m);
      if (!g) {
        g = document.createElement('div');
        g.className = 'au-grab';
        g.setAttribute('aria-hidden', 'true');
        m.insertBefore(g, m.firstChild);
      }
      return g;
    }
    var mo = new MutationObserver(function () {
      var m = $('#modalBox') || $('.modal', ov);
      if (!m) return;
      if (ov.classList.contains('open')) {
        if (sheetMQ.matches) {
          var g = ensureGrab(m);
          if (!bound) {
            bound = true;
            dragSheet({ sheet: m, overlay: ov, axis: 'y', handle: '.au-grab', grabEl: g,
              close: function () {
                if (window.Shivaa && typeof window.Shivaa.closeModal === 'function') window.Shivaa.closeModal();
                else { var b = $('.modal-close', m); if (b) b.click(); }
              } });
          }
        }
      } else if (m._auDragReset) {
        m.style.transform = ''; m.style.opacity = '';
        m._auDragReset(false);
      }
    });
    mo.observe(ov, { attributes: true, attributeFilter: ['class'] });
  })();

  /* filters bottom sheet — handle drag (armed only at phone widths) */
  (function filterDrag() {
    var f = $('#filterDrawer');
    if (!f) return;
    var arm = function () {
      if (f._auDragSheet || !window.matchMedia('(max-width: 768px)').matches) return;
      f._auDragSheet = 1;
      dragSheet({ sheet: f, axis: 'y', handle: '.fsheet-bar',
        close: function () { var b = $('#fsheetClose'); if (b) b.click(); } });
    };
    new MutationObserver(function () {
      if (f.classList.contains('open')) arm();
      else if (f._auDragReset) f._auDragReset(false);
    }).observe(f, { attributes: true, attributeFilter: ['class'] });
  })();

  /* mini-cart — drag from the left screen edge on touch devices */
  (function cartDrag() {
    if (!coarse) return;
    new MutationObserver(function () {
      var d = $('#cartDrawer');
      if (d && !d._auDragSheet) {
        d._auDragSheet = 1;
        dragSheet({
          sheet: d, axis: 'x', edge: 20, overlay: $('#cartScrim') || null,
          close: function () { if (window.Shivaa && typeof window.Shivaa.closeCart === 'function') window.Shivaa.closeCart(); else { var b = $('.mc-close', d); if (b) b.click(); } }
        });
      }
    }).observe(document.body, { childList: true });
  })();

  /* lightbox — vertical swipe to close on touch */
  (function lightboxDrag() {
    if (!coarse || reduced) return;
    var lb = null, img = null, sx = 0, sxx = 0, dy = 0, dx = 0;
    var active = false, locked = null, pid = null, pointers = 0;
    function move(ev) {
      if (!active || ev.pointerId !== pid) return;
      dy = ev.clientY - sx; dx = ev.clientX - sxx;
      if (locked === null && (Math.abs(dy) > 10 || Math.abs(dx) > 10)) {
        locked = Math.abs(dy) > Math.abs(dx);
      }
      if (!locked) return;
      var ad = Math.abs(dy);
      img.style.transition = 'none';
      img.style.transform = 'translate(' + (dx * .4) + 'px,' + dy + 'px) scale(' + Math.max(.82, 1 - ad / 900) + ')';
      lb.style.background = 'rgba(8,4,8,' + Math.max(0, 1 - ad / 340) + ')';
    }
    function up(ev) {
      if (ev && ev.pointerId != null && pid != null && ev.pointerId !== pid) return;
      pointers = Math.max(0, pointers - 1);
      if (!active) return;
      if (pointers > 0) return;                 /* a second finger (pinch) is down */
      active = false;
      if (pid != null) { try { img.releasePointerCapture(pid); } catch (e) {} }
      var dragged = locked;
      img.style.transition = '';
      if (dragged && Math.abs(dy) > 110) {
        var x = $('.m-lightbox-x', lb);
        if (x) x.click();
        setTimeout(function () { img.style.transform = ''; lb.style.background = ''; }, 60);
      } else {
        img.style.transform = '';
        lb.style.background = '';
      }
      locked = null; pid = null;
    }
    document.addEventListener('pointerdown', function (e) {
      lb = $('#mLightbox');
      if (!lb || !lb.classList.contains('open')) return;
      if (!(e.target.tagName === 'IMG' && e.target.parentNode === lb)) return;
      pointers++;
      if (active) return;                        /* ignore extra fingers entirely */
      img = e.target;
      sx = e.clientY; sxx = e.clientX; dy = dx = 0; active = true; locked = null;
      pid = e.pointerId;
      try { img.setPointerCapture(pid); } catch (err) { pid = null; }
    }, { passive: true, capture: true });
    document.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('pointerup', up);
    document.addEventListener('pointercancel', up);
  })();

  /* ── 12 · range slider fill + shipping meter ───────────────────────── */
  function paintRange(r) {
    var min = +r.min || 0, max = +r.max || 100, v = +r.value;
    var pct = max > min ? ((v - min) / (max - min) * 100) : 100;
    r.style.setProperty('--fill', pct.toFixed(1) + '%');
  }
  document.addEventListener('input', function (e) {
    if (e.target && e.target.type === 'range') paintRange(e.target);
  }, { passive: true });

  function sweepShip() {
    $$('.mc-ship').forEach(function (ship) {
      var i = $('.mc-ship-bar i', ship);
      if (!i) return;
      var full = /100%/.test(i.style.width || '');
      ship.classList.toggle('is-full', full);
    });
  }

  /* ── 13 · main drawer staggered rows ───────────────────────────────── */
  (function navStagger() {
    var nav = $('#mainNav');
    if (!nav) return;
    new MutationObserver(function () {
      if (!nav.classList.contains('open')) return;
      var els = $$('.dw-head,.dw-sec,.dw-row,.dw-tile,.dw-saathi,.nav-jwl,.dw-foot, .dw-foot a', nav);
      els.forEach(function (el, i) {
        el.setAttribute('data-au-nav', '');
        el.style.setProperty('--i', i);
      });
    }).observe(nav, { attributes: true, attributeFilter: ['class'] });
  })();

  /* ── 14 · per-route sweep ──────────────────────────────────────────── */
  var view = $('#view');
  function sweep() {
    tagRises(view);
    tagCounts();
    heroSplit();
    checkConfetti();
    tagParallax();
    $$('input[type=range]', view).forEach(paintRange);
    sweepShip();
    if (mnav.move) mnav.move();
  }
  if (view) {
    new MutationObserver(function () {
      rAF(sweep);
      setTimeout(sweep, 350);
      setTimeout(sweep, 1200);
      setTimeout(sweep, 2600);
    }).observe(view, { childList: true, subtree: false });
  }
  new MutationObserver(sweepShip).observe(document.body, { childList: true, subtree: true });
  setTimeout(sweep, 200);
  setTimeout(sweep, 1000);
  setTimeout(sweep, 3000);
  /* idle catch-ups (like motion.js) */
  var idleN = 0;
  var idle = setInterval(function () {
    sweep();
    if (++idleN > 20) clearInterval(idle);
  }, 8000);

  /* expose for admin/debug */
  window.ShivaaAurum = { confetti: confetti, burst: burst, haptic: haptic, sweep: sweep };
})();
