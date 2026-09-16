/* ══════════════════════════════════════════════════════════════════════════
   SHIVAA v126 — FILM BUDGET · THE GLOW · THE DESKTOP LAYER  (17 Sep 2026)

   Owner's report, one laptop screenshot and one phone:

     · "on the laptop it loads very slowly"
     · "more than 70 percent of the screen is empty"
     · "the gold thread that goes down with us doesn't glow"
     · "in mobile it is perfect — only the FIFTH film of the Gold Thread
        doesn't load"

   1 · THE FILM BUDGET (all devices) — every film on the site now ships cold:
      poster, preload=none, and its URL parked in data-film. This file is the
      only thing that hands a film its bytes, and it does it under a budget —
      a phone exposes ~4 hardware decoders and the v125 homepage had NINE
      films plus a 16 MB hero film all asking at once, so the last element in
      the queue (thread 05 — "Forever, Reimagined") was the one that quietly
      never got a decoder. It now warms on approach, evicts the film furthest
      away when it needs the slot, retries a film that errors or stalls, and
      re-arms any film that wants to play but is sitting at readyState 0.
      Net effect on the laptop: the first screen stops queuing ~48 MB of
      eager video behind the hero photograph.

   2 · THE GLOW (all devices) — the thread draws as light: a blurred halo
      stacked under the stroke, a drop-shadow bloom on the stroke itself, and
      a molten ember that rides the tip of the thread as it draws (positioned
      from getPointAtLength, so it sits exactly on the line). Each chapter
      gains a halo as it ignites.

   3 · THE DESKTOP LAYER (≥1024px, mouse pointers) — mobile is untouched.
      · gutter rails: a hairline gold thread down each empty margin with
        quarter motifs and an ember that tracks the scroll (≥1280px)
      · the Revolving Case gains spotlight cones, a lit floor and a
        clickable chapter rail under it
      · the Gold Thread gains a chapter medallion and filigree between
        chapters, with wider rows and bigger films

   Self-guarding: no network of its own, every block try/caught, every film
   degrades to its poster, and the page is identical if this file 404s.
   ══════════════════════════════════════════════════════════════════════════ */
'use strict';
(function () {
  var doc = document;
  var win = window;
  var $ = function (s, r) { return (r || doc).querySelector(s); };

  function mq(q) {
    try { return win.matchMedia ? win.matchMedia(q) : { matches: false, addEventListener: function () {}, addListener: function () {} }; }
    catch (e) { return { matches: false, addEventListener: function () {}, addListener: function () {} }; }
  }
  var REDUCED = mq('(prefers-reduced-motion: reduce)').matches;
  var DESK = mq('(min-width: 1024px)');
  var RAIL = mq('(min-width: 1280px) and (hover: hover) and (pointer: fine)');

  /* au-lite is set by aurum.js — re-read every time; it can land late */
  function lite() {
    try {
      return doc.documentElement.classList.contains('au-lite') ||
        (navigator.connection && navigator.connection.saveData);
    } catch (e) { return false; }
  }
  function play(v) { try { var p = v.play(); if (p && p.catch) p.catch(function () {}); } catch (e) {} }
  function stop(v) { try { v.pause(); } catch (e) {} }

  /* ═══ 1 · THE FILM BUDGET ════════════════════════════════════════════
     live = films currently holding bytes. reg = every cold film we know of. */
  var reg = [];
  var live = [];
  var idleOpen = false;

  function budget() {
    if (lite()) return 0;
    try { if (win.matchMedia && win.matchMedia('(pointer: coarse)').matches) return 3; } catch (e) {}
    return 4;
  }
  function isAuto(v) { return v.getAttribute('data-film-auto') === '1'; }
  function isIdle(v) { return v.getAttribute('data-film-idle') === '1'; }
  function mayPlay(v) { return !REDUCED && !lite() && !doc.hidden; }
  function dist(v) {
    try {
      var r = v.getBoundingClientRect();
      if (!r.height && !r.width) return 1e9;
      return Math.abs(r.top + r.height / 2 - win.innerHeight / 2);
    } catch (e) { return 1e9; }
  }

  function release(v) {
    var i = live.indexOf(v);
    if (i >= 0) live.splice(i, 1);
    try { v.dataset.svWant = '0'; } catch (e) {}
    stop(v);
    try { v.removeAttribute('src'); v.load(); } catch (e) {}
  }

  /* hand a film its bytes — evicting the furthest cold candidate if the
     budget is full. Returns true when the film has (or just got) a src. */
  function acquire(v) {
    if (v.getAttribute('src')) return true;
    var url = v.getAttribute('data-film');
    if (!url) return false;
    if (budget() < 1) return false;
    if (isIdle(v) && !idleOpen) return false;
    if (live.length >= budget()) {
      /* evict the live film furthest from the viewport — never the one being
         asked for, never one currently on screen */
      var far = null, farD = -1;
      for (var i = 0; i < live.length; i++) {
        var c = live[i];
        if (c === v || !c.isConnected) continue;
        if (c.__svNear) continue;                 /* on/near screen: keep */
        var d = dist(c);
        if (d > farD) { farD = d; far = c; }
      }
      if (far) release(far);
    }
    if (live.length >= budget()) return false;
    v.setAttribute('src', url);
    v.__svAt = Date.now();
    live.push(v);
    if ((isAuto(v) || v.dataset.svWant === '1') && v.__svVis && mayPlay(v)) play(v);
    return true;
  }

  function onNear(v, near) {
    v.__svNear = near;
    if (near) acquire(v);
    else if (!v.__svVis && live.indexOf(v) >= 0 && live.length > budget() - 1) release(v);
  }
  function onVis(v, ratio) {
    var vis = ratio >= .22;
    v.__svVis = vis;
    if (vis) {
      acquire(v);
      if (mayPlay(v) && (isAuto(v) || v.dataset.svWant === '1')) play(v);
    } else if (isAuto(v)) {
      stop(v);
    }
  }

  function register(v) {
    if (v.__sv126) return;
    v.__sv126 = 1;
    v.setAttribute('data-sv126', '1');   /* keeps the periodic scan O(new) */
    reg.push(v);
    if (v.dataset.svTries == null) v.dataset.svTries = '0';
    v.addEventListener('error', function () {
      if (!v.getAttribute('src')) return;         /* we detached it: expected */
      var n = +v.dataset.svTries || 0;
      if (n >= 2) { release(v); return; }         /* give up: the poster stays */
      v.dataset.svTries = String(n + 1);
      setTimeout(function () {
        if (!v.isConnected || !v.getAttribute('src')) return;
        v.__svAt = Date.now();
        try { v.load(); } catch (e) {}
        if (v.__svVis && mayPlay(v) && (isAuto(v) || v.dataset.svWant === '1')) play(v);
      }, 800 * (n + 1));
    });
    v.addEventListener('stalled', function () {
      if (!v.getAttribute('src')) return;
      var n = +v.dataset.svTries || 0;
      if (n >= 2) return;
      v.dataset.svTries = String(n + 1);
      try { v.load(); } catch (e) {}
    });
    v.addEventListener('loadeddata', function () { v.dataset.svTries = '0'; });
    if ('IntersectionObserver' in win) {
      try {
        new IntersectionObserver(function (es) {
          es.forEach(function (e) { onNear(v, e.isIntersecting); });
        }, { rootMargin: '75% 0px 75% 0px', threshold: 0 }).observe(v);
        new IntersectionObserver(function (es) {
          es.forEach(function (e) { onVis(v, e.intersectionRatio); });
        }, { threshold: [0, .22, .55] }).observe(v);
      } catch (e) { v.__svNear = true; v.__svVis = true; }
    } else { v.__svNear = true; v.__svVis = true; acquire(v); }
  }

  function scan() {
    if (lite()) return;
    try {
      /* only NEW films: the rate strip rewrites text every second, so this
         runs often — never pay for films we already govern */
      var vs = doc.querySelectorAll('video[data-film]:not([data-sv126])');
      for (var i = 0; i < vs.length; i++) {
        if (vs[i].id === 'svReelVid') continue;   /* the reel is user-driven */
        register(vs[i]);
      }
    } catch (e) {}
  }

  /* the "never leave a chapter dark" net — a film that wants to play but has
     no frames after five seconds is re-armed (this is the belt for the
     reported fifth-film brace) */
  setInterval(function () {
    if (doc.hidden || lite()) return;
    for (var i = 0; i < reg.length; i++) {
      var v = reg[i];
      if (!v.isConnected) continue;
      var wanted = v.dataset.svWant === '1' || isAuto(v);
      if (!wanted || !v.__svVis) continue;
      if (!v.getAttribute('src')) { acquire(v); continue; }
      if (v.readyState === 0 && Date.now() - (v.__svAt || 0) > 5000 && (+v.dataset.svTries || 0) < 3) {
        v.dataset.svTries = String((+v.dataset.svTries || 0) + 1);
        v.__svAt = Date.now();
        try { v.load(); } catch (e) {}
        if (mayPlay(v)) play(v);
      }
    }
  }, 2200);

  /* the hero film is 16 MB: it must never compete with the first paint */
  win.addEventListener('load', function () { setTimeout(function () { idleOpen = true; scan(); }, 2200); });
  setTimeout(function () { idleOpen = true; scan(); }, 9000);

  doc.addEventListener('visibilitychange', function () {
    if (!doc.hidden) return;
    for (var i = 0; i < reg.length; i++) { if (isAuto(reg[i])) stop(reg[i]); }
  });

  /* ═══ 2 · THE GLOW ═══════════════════════════════════════════════════ */
  var thread = null;

  function enhanceThread(box) {
    if (box.dataset.sv126) return;
    box.dataset.sv126 = '1';
    var svg = box.querySelector('.sv-thread-svg');
    var draw = svg && svg.querySelector('.sv-draw');
    if (!draw) return;
    var defs = svg.querySelector('defs');
    if (defs && !svg.querySelector('#svGlowF')) {
      defs.insertAdjacentHTML('beforeend',
        '<filter id="svGlowF" x="-70%" y="-20%" width="240%" height="140%">' +
        '<feGaussianBlur stdDeviation="5"/></filter>');
    }
    /* two halo strokes under the drawn one (blurred where SVG blur is safe,
       plain otherwise) — v126.js mirrors v125's dash geometry onto them */
    var haloO = svg.querySelector('.sv-halo-o');
    var halo = svg.querySelector('.sv-halo');
    if (!haloO) { haloO = clone(draw, 'sv-halo-o'); svg.insertBefore(haloO, draw); }
    if (!halo) { halo = clone(draw, 'sv-halo'); svg.insertBefore(halo, draw); }
    var ember = box.querySelector('.sv-ember');
    if (!ember) {
      ember = doc.createElement('span');
      ember.className = 'sv-ember';
      ember.setAttribute('aria-hidden', 'true');
      ember.innerHTML = '<i class="sv-ember-ring"></i><i class="sv-ember-core"></i>';
      box.appendChild(ember);
    }
    var vb = (svg.getAttribute('viewBox') || '0 0 400 1700').split(/[\s,]+/);
    thread = {
      box: box, svg: svg, draw: draw, halo: halo, haloO: haloO, ember: ember,
      vw: parseFloat(vb[2]) || 400, vh: parseFloat(vb[3]) || 1700
      };
    paint();
  }
  function clone(path, cls) {
    var p = path.cloneNode(false);
    p.setAttribute('class', cls);
    p.removeAttribute('id');
    return p;
  }

  /* ═══ 3 · THE DESKTOP LAYER ══════════════════════════════════════════ */
  var rails = null;
  function buildRails() {
    if (rails || !RAIL.matches || lite() || REDUCED) return;
    var wrap = doc.createElement('div');
    wrap.className = 'sv-rails';
    wrap.setAttribute('aria-hidden', 'true');
    ['l', 'r'].forEach(function (side) {
      var r = doc.createElement('div');
      r.className = 'sv-rail sv-rail-' + side + ' sv-rail-side-' + side;
      r.innerHTML =
        '<span class="sv-rail-line"></span><span class="sv-rail-run"></span>' +
        '<span class="sv-rail-ember"></span>' +
        '<span class="sv-rail-motif" style="top:25%"></span>' +
        '<span class="sv-rail-motif" style="top:50%"></span>' +
        '<span class="sv-rail-motif" style="top:75%"></span>' +
        '<span class="sv-rail-cap" style="top:12%"></span><span class="sv-rail-cap" style="top:88%"></span>';
      wrap.appendChild(r);
    });
    doc.body.appendChild(wrap);
    rails = wrap;
    setTimeout(function () { if (rails) rails.classList.add('sv-on'); }, 400);
    paint();
  }
  function dropRails() {
    if (!rails) return;
    try { rails.remove(); } catch (e) {}
    rails = null;
  }

  var caseRail = null;
  function enhanceCase(root) {
    if (!DESK.matches || lite()) return;
    if (root.querySelector('.sv-case-chapters')) return;
    var stage = root.querySelector('.sv-case-stage');
    var cards = root.querySelectorAll('.sv-case-card');
    if (!cards.length) return;
    if (stage && !stage.querySelector('.sv-case-spots')) {
      var spots = doc.createElement('div');
      spots.className = 'sv-case-spots';
      spots.setAttribute('aria-hidden', 'true');
      spots.innerHTML = '<i></i><i></i>';
      stage.insertBefore(spots, stage.firstChild);
      var floor = doc.createElement('div');
      floor.className = 'sv-case-floor';
      floor.setAttribute('aria-hidden', 'true');
      stage.appendChild(floor);
    }
    var rail = doc.createElement('div');
    rail.className = 'sv-case-chapters';
    rail.setAttribute('role', 'tablist');
    rail.setAttribute('aria-label', 'Shivaa films');
    Array.prototype.forEach.call(cards, function (c, i) {
      var name = c.querySelector('.sv-case-name'), no = c.querySelector('.sv-case-no');
      var b = doc.createElement('button');
      b.className = 'sv-case-chapter';
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.innerHTML = '<small>' + ((no && no.textContent) || ('FILM 0' + (i + 1))) + '</small>' +
        '<b>' + ((name && name.textContent) || ('Film ' + (i + 1))) + '</b>' +
        '<span>Tap to bring this film to the front</span>';
      b.addEventListener('click', function () {
        try {
          var api = win.ShivaaV125;
          var front = api && api.caseFront ? api.caseFront() : -1;
          if (front === i && api && api.open) api.open(i, c);
          else c.click();
        } catch (e) { try { c.click(); } catch (e2) {} }
        setTimeout(syncCaseRail, 60);
      });
      rail.appendChild(b);
    });
    var ui = root.querySelector('.sv-case-ui');
    if (ui && ui.parentNode) ui.parentNode.insertBefore(rail, ui.nextSibling);
    else root.appendChild(rail);
    caseRail = { rail: rail, cards: cards };
    syncCaseRail();
  }
  function syncCaseRail() {
    if (!caseRail || !caseRail.rail.isConnected) return;
    var front = -1;
    try { if (win.ShivaaV125 && win.ShivaaV125.caseFront) front = win.ShivaaV125.caseFront(); } catch (e) {}
    var bs = caseRail.rail.querySelectorAll('.sv-case-chapter');
    for (var i = 0; i < bs.length; i++) {
      if (i === front) bs[i].setAttribute('aria-current', 'true');
      else bs[i].removeAttribute('aria-current');
    }
  }

  function enhanceThreadDesktop(box) {
    if (!DESK.matches) return;
    if (box.querySelector('.sv-medallion')) return;
    var items = box.querySelectorAll('.sv-thread-item');
    Array.prototype.forEach.call(items, function (it, i) {
      var cap = it.querySelector('.sv-thread-cap');
      if (cap && !cap.querySelector('.sv-medallion')) {
        var m = doc.createElement('span');
        m.className = 'sv-medallion';
        m.setAttribute('aria-hidden', 'true');
        m.textContent = '0' + (i + 1);
        cap.insertBefore(m, cap.firstChild);
      }
      var nx = it.nextElementSibling;
      if (nx && !(nx.className && /sv-filigree/.test(nx.className))) {
        var f = doc.createElement('span');
        f.className = 'sv-filigree';
        f.setAttribute('aria-hidden', 'true');
        f.innerHTML = '<svg viewBox="0 0 190 22" fill="none" stroke="#b98a2f" stroke-width="1">' +
          '<path d="M4 11h62"/><path d="M124 11h62"/><path d="M95 3l8 8-8 8-8-8z"/>' +
          '<circle cx="78" cy="11" r="2"/><circle cx="112" cy="11" r="2"/></svg>';
        it.parentNode.insertBefore(f, nx);
      }
    });
  }

  /* ═══ 4 · ONE PAINTER — the thread ember and the rails ═══════════════ */
  var ticking = false;
  function paint() {
    /* ── the thread: mirror v125's dash geometry and ride the tip ── */
    if (thread && thread.box.isConnected) {
      try {
        var L = parseFloat(thread.draw.style.strokeDasharray);
        var off = parseFloat(thread.draw.style.strokeDashoffset);
        if (L > 0) {
          var p = isNaN(off) ? 0 : Math.max(0, Math.min(1, 1 - off / L));
          thread.halo.style.strokeDasharray = L;
          thread.halo.style.strokeDashoffset = off;
          thread.haloO.style.strokeDasharray = L;
          thread.haloO.style.strokeDashoffset = off;
          var r = thread.box.getBoundingClientRect();
          if (typeof thread.draw.getPointAtLength === 'function' && r.width > 0) {
            var pt = thread.draw.getPointAtLength(Math.max(0, Math.min(L, p * L)));
            var x = pt.x / thread.vw * r.width;
            var y = pt.y / thread.vh * r.height;
            thread.ember.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)';
          }
          thread.ember.classList.toggle('sv-on', p > .004 && p < .996);
          thread.box.classList.toggle('sv-threading', p > .01 && p < .99);
        }
      } catch (e) {}
    }
    /* ── the rails: scroll progress down the margin ── */
    if (rails) {
      try {
        var docH = Math.max(1, doc.documentElement.scrollHeight - win.innerHeight);
        var sp = Math.max(0, Math.min(1, (win.pageYOffset || doc.documentElement.scrollTop || 0) / docH));
        Array.prototype.forEach.call(rails.querySelectorAll('.sv-rail'), function (r) {
          var run = r.querySelector('.sv-rail-run');
          var em = r.querySelector('.sv-rail-ember');
          var h = r.clientHeight || win.innerHeight;
          var top = .06 * h, span = .88 * h;
          if (run) run.style.transform = 'scaleY(' + sp.toFixed(4) + ')';
          if (em) em.style.transform = 'translate3d(0,' + (top + span * sp).toFixed(1) + 'px,0)';
        });
      } catch (e) {}
    }
  }
  function kick() {
    if (ticking) return;
    ticking = true;
    (win.requestAnimationFrame || function (f) { setTimeout(f, 16); })(function () { ticking = false; paint(); });
  }
  win.addEventListener('scroll', kick, { passive: true });

  /* a laptop window dragged narrow (or a tablet rotating) must never leave
     desktop-only ornament on a small screen — take it all back out */
  function undesk() {
    if (DESK.matches) return;
    dropRails();
    var cls = ['sv-case-chapters', 'sv-case-spots', 'sv-case-floor', 'sv-filigree', 'sv-medallion'];
    for (var c = 0; c < cls.length; c++) {
      var els = doc.querySelectorAll('.' + cls[c]);
      for (var i = 0; i < els.length; i++) { try { els[i].parentNode.removeChild(els[i]); } catch (e) {} }
    }
    caseRail = null;
  }
  var rzT = null;
  win.addEventListener('resize', function () {
    if (rzT) clearTimeout(rzT);
    rzT = setTimeout(function () {
      if (!DESK.matches) undesk();
      else mountAll();
      if (RAIL.matches) buildRails(); else dropRails();
      kick();
    }, 180);
  });

  /* ═══ 5 · MOUNT WATCHER ══════════════════════════════════════════════ */
  var railTimer = null;
  function mountAll() {
    scan();
    if (!DESK.matches) undesk();
    var view = doc.getElementById('view');
    var box = view && view.querySelector('#svThreadMount .sv-thread');
    if (box) {
      try { enhanceThread(box); } catch (e) {}
      try { enhanceThreadDesktop(box); } catch (e) {}
    }
    var cs = view && view.querySelector('#svCaseMount .sv-case');
    if (cs) { try { enhanceCase(cs); } catch (e) {} syncCaseRail(); }
    if (RAIL.matches) buildRails(); else dropRails();
    if (!railTimer) {
      railTimer = setInterval(function () { syncCaseRail(); }, 700);
    }
  }

  win.addEventListener('DOMContentLoaded', mountAll);
  win.addEventListener('load', function () { mountAll(); kick(); });
  if (typeof MutationObserver === 'function') {
    var pending = false;
    var mo = new MutationObserver(function () {
      if (pending) return;
      pending = true;
      setTimeout(function () { pending = false; mountAll(); }, 120);
    });
    var start = function () {
      var view = doc.getElementById('view');
      if (!view) return false;
      try { mo.observe(view, { childList: true, subtree: true }); } catch (e) {}
      return true;
    };
    if (!start()) win.addEventListener('DOMContentLoaded', function () { setTimeout(start, 0); });
  }
  win.addEventListener('hashchange', function () { setTimeout(function () { thread = thread && thread.box.isConnected ? thread : null; mountAll(); kick(); }, 60); });
  mountAll();

  /* tiny test surface for the smoke gates (never used by the page) */
  win.ShivaaV126 = {
    scan: scan,
    acquire: acquire,
    release: release,
    budget: budget,
    liveCount: function () { return live.length; },
    registered: function () { return reg.length; },
    hasRails: function () { return !!rails; },
    hasCaseChapters: function () { return !!doc.querySelector('.sv-case-chapters .sv-case-chapter'); },
    hasThreadGlow: function () { return !!doc.querySelector('.sv-thread-svg .sv-halo'); },
    hasEmber: function () { return !!doc.querySelector('.sv-ember'); },
    hasMedallions: function () { return doc.querySelectorAll('.sv-thread-item .sv-medallion').length; },
    paint: paint,
    openIdle: function () { idleOpen = true; scan(); }
  };
})();
