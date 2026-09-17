/* ══════════════════════════════════════════════════════════════════════════
   SHIVAA v128 — THE FILM BUDGET · the "velocity" release (17 Sep 2026)

   The owner's brief: "make it load fast and the smoothest in the world."
   The measured disease (v125 live, grep-verified, not guessed): the page
   mounted its films EAGERLY — boost.js handed five autoplay films a `src`
   the moment the home template existed (hero 16.7 MB + four carousel films
   ≈ 32 MB), mounted another four film cards that v125 removed a beat later
   (~26 MB started for nothing), plus the bridal CTA film (6 MB), plus nine
   preload=metadata films fighting ≈4 phone decoders (the Gold Thread 05
   starvation bug), plus a 6–11.8 MB autoplay film at the top of EVERY inner
   page. Roughly 47 MB+ of film bytes started flowing while the first paint,
   its images and the worker precache were still on the wire.

   The cure is a budget, not a queue:
     · every film on the site now mounts COLD — poster visible, URL parked
       in data-film, preload="none", no autoplay. Zero bytes at mount.
     · THIS FILE is the only thing that hands out film bytes.
     · budget: 4 armed films on a desktop · 3 on a phone · 0 under
       Save-Data or au-lite (posters only — exactly what v125 already
       promised its own films). prefers-reduced-motion: nothing autoplays.
     · a film WARMS when it comes within 75% of a viewport of the viewport
       (src set, preload=metadata → the moov box only, 137–249 KB for the
       big ambients, 3.6 KB for the owner's nine).
     · a film PLAYS when its own gate says so:
         – boost films (hero, carousel slides, bridal CTA): ≥ 22% visible;
         – v125 films (Revolving Case, Gold Thread): the layer's own
           splay()/shut() doors, which now stamp data-sv-want and call
           back into this governor (window.__shvWant / __shvShut).
     · arming beyond the budget EVICTS the armed film furthest from the
       viewport (pause → src removed → poster). A visible, playing film is
       evicted last.
     · nothing arms before the page has SETTLED (load + 2.2 s, hard cap
       8 s): the first paint, its images and the precache get the wire
       first. Films are ambience — they must never compete with the shop.
     · a film that errors twice parks on its poster for good; a 2.2 s
       watchdog re-arms any film that wants to play but has no bytes —
       the "fifth film of the Gold Thread never loads" phone bug cannot
       recur by construction.
     · page-hero films (rates · about · b2b · …) never even exist as a
       <video> until their first frame is decoded: the section carries
       data-boost-pgfilm and this layer builds the element only then, so
       the static hero image holds (no dark gap) until real frames exist.
     · the tab going hidden pauses every film; coming back resumes the
       ones that still want to play.

   Degradation contract (house rule): if this file is absent — a partial
   extract, an exotic browser — boost.js and v125.js fall back to their
   old eager behaviour. The release degrades, it never breaks.
   ══════════════════════════════════════════════════════════════════════════ */
'use strict';
(function () {
  if (window.ShivaaV128) return;
  var doc = document;
  var win = window;

  /* ── environment ─────────────────────────────────────────────────── */
  function saveData() {
    try { return !!(navigator.connection && navigator.connection.saveData); } catch (e) { return false; }
  }
  function lite() {
    try { return doc.documentElement.classList.contains('au-lite'); } catch (e) { return false; }
  }
  var REDUCED = (typeof matchMedia === 'function') && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function phone() {
    try { return matchMedia('(pointer: coarse)').matches || (win.innerWidth || 0) < 820; } catch (e) { return false; }
  }
  function budget() { return (saveData() || lite()) ? 0 : (phone() ? 3 : 4); }

  /* ── the settle gate: no film bytes until the page has settled ────── */
  var settled = false;
  var settleQueue = [];
  function settle() {
    if (settled) return;
    settled = true;
    var q = settleQueue; settleQueue = [];
    q.forEach(function (fn) { try { fn(); } catch (e) {} });
  }
  if (doc.readyState === 'complete') win.setTimeout(settle, 2200);
  else win.addEventListener('load', function () { win.setTimeout(settle, 2200); });
  win.setTimeout(settle, 8000);   /* a hung subresource can never starve ambience forever */
  function whenSettled(fn) { if (settled) { fn(); } else settleQueue.push(fn); }

  /* ── the registry ────────────────────────────────────────────────── */
  /* rec = { v, auto, near, ratio, want, armed, retries, dead, hung }   */
  var films = [];
  function byEl(v) {
    for (var i = 0; i < films.length; i++) if (films[i].v === v) return films[i];
    return null;
  }
  function armedCount() {
    var n = 0;
    films.forEach(function (r) { if (r.armed && r.v.isConnected) n++; });
    return n;
  }

  /* distance of a film from the viewport, in px (0 = on screen).
     A detached film is infinitely far. Ties: a film that is currently
     playing on screen is protected — eviction takes it last. */
  function dist(rec) {
    var v = rec.v;
    if (!v || !v.isConnected) return 1e9;
    try {
      var r = v.getBoundingClientRect();
      var vh = win.innerHeight || 800, vw = win.innerWidth || 400;
      var cy = r.top + r.height / 2, cx = r.left + r.width / 2;
      var dy = cy > vh ? cy - vh : (cy < 0 ? -cy : 0);
      var dx = cx > vw ? cx - vw : (cx < 0 ? -cx : 0);
      var d = dy + dx;
      /* a film that is playing and wanted is protected — the furthest
         idle film always goes first; a playing one only when nothing
         else can go (v125 films carry want, boost films carry ratio) */
      var alive = v.readyState >= 2 && !v.paused;
      var wanting = rec.want || (rec.auto && rec.ratio >= .22) || rec.pendPlay;
      var playing = alive && ((wanting && rec.ratio > 0) || rec.want);
      return playing ? d - 1e6 : d;   /* on-screen playing films sort last */
    } catch (e) { return 1e9; }
  }

  /* ── park / arm / evict ──────────────────────────────────────────── */
  function park(rec) {
    var v = rec.v;
    try { v.pause(); } catch (e) {}
    try { v.removeAttribute('src'); } catch (e) {}
    try { v.load(); } catch (e) {}          /* aborts the fetch, brings the poster back */
    rec.armed = false;
  }
  function evictOne(exclude) {
    var armed = films.filter(function (r) { return r.armed && r !== exclude; });
    if (!armed.length) return false;
    armed.sort(function (a, b) { return dist(b) - dist(a); });   /* furthest (or protected-last) first */
    park(armed[0]);
    return true;
  }
  function arm(rec) {
    if (rec.dead || rec.armed || !rec.v.isConnected) return rec.armed;
    if (budget() === 0) return false;
    var go = function () {
      if (rec.dead || rec.armed) return;
      while (armedCount() >= budget()) { if (!evictOne(rec)) return; }
      var url = rec.v.getAttribute('data-film');
      if (!url) return;
      try {
        rec.v.preload = 'metadata';          /* the moov box only — bytes stay tiny until play() */
        rec.v.src = url;
        rec.armed = true;
      } catch (e) {}
    };
    whenSettled(go);                          /* the paint eats first; ambience waits */
    return rec.armed;
  }
  function play(rec) {
    if (rec.dead || REDUCED || budget() === 0) return;
    if (!rec.armed) arm(rec);                 /* arms now, or on settle via the queue */
    var v = rec.v;
    if (!v.getAttribute('src')) {             /* budget-blocked or still settling: the poster holds the frame */
      rec.pendPlay = true;
      return;
    }
    rec.pendPlay = false;
    try { var p = v.play(); if (p && p.catch) p.catch(function () {}); } catch (e) {}
  }

  /* settle flush: films that wanted to play while cold get their bytes now */
  win.addEventListener('load', function () {
    win.setTimeout(function () {
      films.forEach(function (r) { if (r.pendPlay) play(r); });
    }, 2300);
  });

  /* ── registration ────────────────────────────────────────────────── */
  function film(v, opts) {
    if (!v || !v.getAttribute || !v.getAttribute('data-film')) return null;
    var rec = byEl(v);
    if (rec) return rec;
    rec = { v: v, auto: !!(opts && opts.auto), near: false, ratio: 0, want: 0, armed: false, retries: 0, dead: false, hung: 0, pendPlay: false };
    films.push(rec);
    try { if (v.dataset.svWant === '1') rec.want = 1; } catch (e) {}

    /* a film that fails twice keeps its poster for good */
    v.addEventListener('error', function () {
      if (rec.dead) return;
      rec.retries++;
      if (rec.retries > 2) { park(rec); rec.dead = true; return; }
      park(rec);
      win.setTimeout(function () { if (!rec.dead) { arm(rec); if (rec.pendPlay || rec.want || (rec.auto && rec.ratio >= .22)) play(rec); } }, 500);
    });

    if ('IntersectionObserver' in win) {
      /* warm: within 75% of a viewport of the viewport */
      new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          rec.near = e.isIntersecting;
          if (rec.near) arm(rec);
          else if (rec.armed && !rec.want && !(rec.auto && rec.ratio >= .22) && !rec.pendPlay) park(rec);
        });
      }, { rootMargin: '75% 0px' }).observe(v);
      /* the play gate for governor-driven (boost) films: ≥ 22% visible */
      if (rec.auto) {
        new IntersectionObserver(function (es) {
          es.forEach(function (e) {
            rec.ratio = e.intersectionRatio;
            if (e.intersectionRatio >= .22) play(rec);
            else if (!rec.want) { try { v.pause(); } catch (er) {} }
          });
        }, { threshold: [0, .22, .5, 1] }).observe(v);
      }
    } else {
      /* no observer support: a managed film behaves like the old build */
      rec.near = true; rec.ratio = 1; arm(rec); if (rec.auto) play(rec);
    }
    return rec;
  }

  /* ── the v125 doors: splay()/shut() call back into here ──────────── */
  win.__shvWant = function (v) {
    if (!v || !v.getAttribute) return;
    var rec = byEl(v) || (v.getAttribute('data-film') ? film(v, { auto: false }) : null);
    if (!rec) return;
    rec.want = 1;
    play(rec);
  };
  win.__shvShut = function (v) {
    var rec = v ? byEl(v) : null;
    if (!rec) return;
    rec.want = 0;
    try { v.pause(); } catch (e) {}
  };

  /* ── page-hero films: the <video> is BUILT only when frames exist ── */
  /* The section keeps its static hero image (no dark buffering gap); the
     moment the film can show a real frame, it takes over exactly like the
     old build did. save-data / au-lite / reduced-motion: it never builds. */
  var pgPending = [];   /* test surface: detached page-hero films awaiting their first frame */
  function pghero(ph, name) {
    if (!ph || !name) return;
    ph.setAttribute('data-boost-pgfilm', name);
    var made = false;
    function make() {
      if (made || budget() === 0 || REDUCED) return;
      made = true;
      var v = doc.createElement('video');
      v.className = 'ph-vid';
      v.setAttribute('data-film', '/images/films/' + name + '.mp4');
      v.muted = true; v.loop = true; v.playsInline = true;
      v.setAttribute('aria-hidden', 'true');
      var inserted = false;
      var rec = null;
      function insert() {
        if (inserted || !ph.isConnected) return;
        inserted = true;
        pgPending = pgPending.filter(function (p) { return p.v !== v; });
        try { ph.insertBefore(v, ph.firstChild); } catch (e) { return; }
        rec = film(v, { auto: true });
        if (rec) play(rec);
      }
      /* fetch detached; insert when a frame is decoded (8 s fallback = the
         old behaviour: film takes over while still buffering) */
      v.preload = 'auto';
      v.src = '/images/films/' + name + '.mp4';
      v.addEventListener('loadeddata', insert, { once: true });
      v.addEventListener('error', function () { /* the static hero stays — the onerror of the old build */ });
      pgPending.push({ v: v, ph: ph, insert: insert });
      win.setTimeout(insert, 8000);
    }
    if ('IntersectionObserver' in win) {
      new IntersectionObserver(function (es, obs) {
        if (es[0] && es[0].isIntersecting) { obs.disconnect(); whenSettled(make); }
      }, { rootMargin: '50% 0px' }).observe(ph);
    } else whenSettled(make);
  }

  /* ── the watchdog: no wanting film may sit without bytes ─────────── */
  /* This is the permanent fix for the phone bug where Gold Thread 05
     starved behind four decoders: any film that wants to play but has no
     data is re-armed every 2.2 s, budget permitting. */
  win.setInterval(function () {
    if (doc.hidden) return;
    /* prune records whose elements left the DOM (SPA re-renders), and
       page-hero builds whose section is gone */
    films = films.filter(function (r) { return r.v && r.v.isConnected; });
    pgPending = pgPending.filter(function (p) { return p.ph.isConnected; });
    films.forEach(function (rec) {
      var wants = rec.want || rec.pendPlay || (rec.auto && rec.ratio >= .22);
      if (!wants || rec.dead) return;
      if (!rec.armed) { arm(rec); if (rec.armed) play(rec); return; }
      if (rec.v.readyState === 0 && !rec.v.error) {
        rec.hung++;
        if (rec.hung >= 2) { park(rec); rec.hung = 0; arm(rec); if (rec.armed) play(rec); }
      } else rec.hung = 0;
    });
  }, 2200);

  /* ── the tab: hidden pauses every film, returning resumes the wanting ── */
  doc.addEventListener('visibilitychange', function () {
    films.forEach(function (r) {
      if (!r.v.isConnected) return;
      if (doc.hidden) { try { r.v.pause(); } catch (e) {} }
      else if ((r.want || (r.auto && r.ratio >= .22)) && r.armed) { try { var p = r.v.play(); if (p && p.catch) p.catch(function () {}); } catch (e) {} }
    });
  });

  /* ── the tiny test surface for the smoke gates ───────────────────── */
  win.ShivaaV128 = {
    film: film,
    pghero: pghero,
    want: function (v) { win.__shvWant(v); },
    shut: function (v) { win.__shvShut(v); },
    budget: budget,
    armed: armedCount,
    settled: function () { return settled; },
    records: function () { return films.slice(); },
    /* test-only levers (never used by the page itself) */
    __test: { settle: settle, pgPending: function () { return pgPending.slice(); } }
  };
})();
