/* ═══════════════════════════════════════════════════════════════════════
   v217-case.js — "THE CASE, REINSTALLED" · 2026-10-14
   The Shivaa Films case, rebuilt from scratch.

   Why a rebuild (the owner: "the page keeps refreshing and jumps to the top
   when I scroll; reinstall the turn-the-case feature completely"):
   · the old case re-measured itself from a resize-observer, a window resize
     listener, a global scroll tick and a MutationObserver on #view — every
     scroll could re-enter its layout;
   · its drag could call preventDefault / pointer capture on the page's own
     scroll gesture;
   · it played and paused four <video> elements from several competing code
     paths.

   This module has NONE of that:
   · ONE pointer path (pointer events + touch-action: pan-y — vertical
     scrolling always belongs to the page, sideways belongs to the case);
   · no scroll listeners, no resize-observer, and no focus or page-scroll calls;
   · ONE window resize listener (debounced) that only re-reads the width;
   · ONE play-state function (playState) that only calls play()/pause()
     when a video's state actually has to change;
   · phones (pointer: coarse) play only the front film; laptops play all four.

   It keeps the same DOM hooks (#svCaseMount, #svCaseStage, #svCaseRing,
   .sv-case-card, #svCasePrev/#svCaseNext, #svCaseCount, #svCaseRail,
   .sv-case-thumb) so the existing styling and test surface still apply.
   The full-screen reel is still v125's (ShivaaV125.openCase).
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var win = window, doc = document;

  var FILMS = [
    { f: '/images/films/film-01.mp4', p: '/images/films/film-01.jpg', no: '01', title: 'The Unboxing', cap: 'The box opens, and the room goes quiet.' },
    { f: '/images/films/film-02.mp4', p: '/images/films/film-02.jpg', no: '02', title: 'The Blessing', cap: 'A mother\u2019s hands. A promise in gold.' },
    { f: '/images/films/film-03.mp4', p: '/images/films/film-03.jpg', no: '03', title: 'The Muse',     cap: 'Some gold waits its whole life for her.' },
    { f: '/images/films/film-04.mp4', p: '/images/films/film-04.jpg', no: '04', title: 'The Wearing',  cap: 'Then one day, it is simply hers.' }
  ];
  var N = FILMS.length;

  function coarse() {
    try { return !!(win.matchMedia && win.matchMedia('(pointer: coarse)').matches); } catch (e) { return false; }
  }
  function reduced() {
    try { return !!(win.matchMedia && win.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; }
  }
  function reelOn() {
    try { return !!(win.ShivaaV125 && win.ShivaaV125.isOpen && win.ShivaaV125.isOpen()); } catch (e) { return false; }
  }
  /* wrap any float offset into [-2, 2) — the four films sit on a loop */
  function wrap(x) { return ((((x + N / 2) % N) + N) % N) - N / 2; }
  function mod(i) { return ((i % N) + N) % N; }

  var hosts = [];            /* live cases (for the one resize listener) */
  var resizeBound = false;

  function bindResize() {
    if (resizeBound) return;
    resizeBound = true;
    var t = 0;
    win.addEventListener('resize', function () {
      clearTimeout(t);
      t = setTimeout(function () {
        hosts = hosts.filter(function (h) { return h.isConnected; });
        hosts.forEach(function (h) { if (h.__case) h.__case.measure(); });
      }, 160);
    }, { passive: true });
  }

  function mount(host) {
    if (!host || host.dataset.mnt) return;
    host.dataset.mnt = '217';
    var hint = coarse()
      ? 'DRAG TO SPIN · THE FRONT FILM PLAYS · TAP A FILM TO BRING IT FRONT'
      : 'DRAG TO SPIN · ALL FOUR FILMS PLAY · TAP THE FRONT FILM FOR FULL SCREEN';
    host.innerHTML =
      '<div class="sv-case" data-case="217">' +
        '<div class="sv-case-head">' +
          '<span class="label" style="color:var(--gold-2,#d4af5a)">Now showing</span>' +
          '<h3>Shivaa Films — turn the <em style="font-style:italic">case</em></h3>' +
          '<p>' + (coarse() ? 'Drag the case to spin it. Tap a film to bring it to the front.' : 'Drag the case to spin it — it settles on your film. Tap the front film for full screen.') + '</p>' +
        '</div>' +
        '<div class="sv-case-stage" id="svCaseStage" tabindex="0" aria-roledescription="carousel" aria-label="Shivaa films. Drag, or use the arrow keys.">' +
          '<div class="sv-case-ring" id="svCaseRing"></div><div class="sv-case-glow"></div>' +
        '</div>' +
        '<div class="sv-case-ui">' +
          '<button class="sv-case-arrow" id="svCasePrev" type="button" aria-label="Previous film">\u2039</button>' +
          '<div class="sv-case-count" id="svCaseCount" aria-live="polite"></div>' +
          '<button class="sv-case-arrow" id="svCaseNext" type="button" aria-label="Next film">\u203A</button>' +
        '</div>' +
        '<div class="sv-case-rail" id="svCaseRail" aria-label="All four films"></div>' +
        '<div class="sv-case-hint">' + hint + '</div>' +
      '</div>';

    var stage = host.querySelector('#svCaseStage');
    var ring = host.querySelector('#svCaseRing');
    var rail = host.querySelector('#svCaseRail');
    var countEl = host.querySelector('#svCaseCount');
    var cards = [], thumbs = [];

    FILMS.forEach(function (fl, i) {
      var c = doc.createElement('button');
      c.type = 'button';
      c.className = 'sv-case-card';
      c.setAttribute('aria-label', 'Play ' + fl.title);
      c.style.position = 'absolute';
      c.style.left = '50%';
      c.style.top = '50%';

      var wrapEl = doc.createElement('div');
      wrapEl.className = 'sv-film-wrap';
      wrapEl.style.cssText = 'position:absolute;inset:0;overflow:hidden';

      var img = doc.createElement('img');
      img.className = 'sv-film-poster';
      img.src = fl.p; img.alt = ''; img.decoding = 'async';
      img.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block';
      wrapEl.appendChild(img);

      var v = doc.createElement('video');
      v.muted = true; v.loop = true; v.defaultMuted = true;
      v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('webkit-playsinline', '');
      v.playsInline = true;
      v.preload = coarse() ? 'metadata' : 'auto';
      /* laptops: the films autoplay (muted) as soon as the case is on screen;
         phones: no autoplay attribute — playState() plays the front film only */
      if (!coarse()) v.setAttribute('autoplay', '');
      v.setAttribute('poster', fl.p);
      v.setAttribute('aria-hidden', 'true');
      v.src = fl.f;
      v.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block';
      v.addEventListener('error', function () {
        v.style.display = 'none';
        wrapEl.classList.add('sv-film-poster-only');
      });
      wrapEl.appendChild(v);

      c.appendChild(wrapEl);
      c.insertAdjacentHTML('beforeend', '<span class="sv-case-no">FILM ' + fl.no + '</span><span class="sv-case-name">' + fl.title + '</span>');
      ring.appendChild(c);
      cards.push(c);

      /* the thumb rail: all four films, always visible */
      var b = doc.createElement('button');
      b.type = 'button';
      b.className = 'sv-case-thumb' + (i === 0 ? ' is-front' : '');
      b.setAttribute('aria-label', 'Show ' + fl.title);
      b.innerHTML = '<img src="' + fl.p + '" alt="" loading="lazy" decoding="async"><span>FILM ' + fl.no + '</span>';
      rail.appendChild(b);
      thumbs.push(b);
    });

    /* ── state ─────────────────────────────────────────────────────── */
    var pos = 0;              /* float index of the spin (front = round(pos)) */
    var target = null;        /* integer the spin is settling on */
    var dragging = false, sx = 0, spos = 0, moved = 0, lastX = 0, lastT = 0, vel = 0;
    var raf = 0, R = 230, spacing = 160;
    var visible = true, lastFront = -1, pausedUntil = 0, autoT = 0, alive = true;

    function front() { return mod(Math.round(pos)); }

    function measure() {
      if (!stage.isConnected) return;
      var w = cards[0].offsetWidth;
      R = w > 0 ? w : 230;
      spacing = Math.max(60, R * 0.7);
      layout();
    }

    /* every card: a flat 2D transform from its offset — no 3D, no ring */
    function layout() {
      for (var i = 0; i < N; i++) {
        var o = wrap(i - pos), a = Math.abs(o);
        var shrink = 1 - Math.pow(a / 2, 6);
        var x = Math.sin(o * 1.15) * R * 0.62 * shrink;
        var y = (1 - Math.cos(o * 1.1)) * 14;
        var sc = 0.62 + 0.38 * Math.cos(o * 1.1);
        var op = Math.max(0.36, 1 - a * 0.28);
        var t = 'translate(-50%,-50%) translate3d(' + x.toFixed(2) + 'px,' + y.toFixed(2) + 'px,0) scale(' + sc.toFixed(4) + ')';
        var c = cards[i];
        c.style.transform = t;
        c.style.webkitTransform = t;
        c.style.opacity = op.toFixed(3);
        c.style.zIndex = String(40 - Math.round(a * 10));
        c.style.visibility = shrink < 0.02 ? 'hidden' : 'visible';
      }
    }

    function setFrontUI() {
      var f = front();
      countEl.textContent = '0' + (f + 1) + '/0' + N + ' · ' + FILMS[f].title.toUpperCase();
      for (var i = 0; i < N; i++) {
        thumbs[i].classList.toggle('is-front', i === f);
        cards[i].classList.toggle('is-front', i === f);
        cards[i].setAttribute('aria-current', i === f ? 'true' : 'false');
      }
    }

    /* the ONE place play/pause happens. Calls play()/pause() only when a
       video is not already in the wanted state. */
    function playState() {
      if (!alive) return;
      var f = front();
      var on = visible && !reelOn();
      var phone = coarse();
      for (var i = 0; i < N; i++) {
        var v = cards[i].querySelector('video');
        if (!v) continue;
        var want = on && (!phone || i === f);
        if (want && v.paused) {
          var p = v.play();
          if (p && p.catch) p.catch(function () {});
        } else if (!want && !v.paused) {
          v.pause();
        }
      }
    }

    function frame() {
      raf = 0;
      if (!stage.isConnected) { alive = false; return; }
      if (!dragging && target !== null) {
        var d = target - pos;
        if (Math.abs(d) < 0.002) { pos = target; target = null; }
        else pos += d * 0.2;
      }
      layout();
      var f = front();
      if (f !== lastFront) { lastFront = f; setFrontUI(); playState(); }
      if (dragging || target !== null) raf = requestAnimationFrame(frame);
    }
    function kick() { if (!raf) raf = requestAnimationFrame(frame); }

    function pauseAuto(ms) { pausedUntil = Date.now() + (ms || 10000); }

    function step(d) {
      var base = target !== null ? target : Math.round(pos);
      target = base + d;
      pauseAuto(12000);
      kick();
    }
    function goTo(i) {
      var base = target !== null ? target : Math.round(pos);
      target = base + wrap(i - mod(base));
      pauseAuto(12000);
      kick();
    }

    /* ── pointer drag: one path for mouse, pen and touch ───────────── */
    stage.addEventListener('pointerdown', function (e) {
      if (e.button !== undefined && e.button !== 0) return;
      dragging = true;
      sx = e.clientX; spos = pos; moved = 0;
      lastX = e.clientX; lastT = Date.now(); vel = 0;
      target = null;
      stage.classList.add('is-dragging');
      pauseAuto(14000);
      try { stage.setPointerCapture(e.pointerId); } catch (err) {}
    });
    stage.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var dx = e.clientX - sx;
      moved = Math.max(moved, Math.abs(dx));
      pos = spos - dx / spacing;
      var now = Date.now(), dt = Math.max(1, now - lastT);
      vel = (e.clientX - lastX) / dt;
      lastX = e.clientX; lastT = now;
      layout();
      kick();
    });
    function endDrag() {
      if (!dragging) return;
      dragging = false;
      stage.classList.remove('is-dragging');
      /* a quick flick carries on for a moment before it settles */
      target = Math.round(pos - (vel * 150) / spacing);
      kick();
    }
    stage.addEventListener('pointerup', endDrag);
    stage.addEventListener('pointercancel', endDrag);
    stage.addEventListener('lostpointercapture', endDrag);

    stage.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    });

    /* clicks: the front film opens full screen; any other film comes round */
    cards.forEach(function (c, i) {
      c.addEventListener('click', function () {
        if (moved > 6) return;
        pauseAuto(14000);
        if (i === front() && target === null) {
          if (win.ShivaaV125 && win.ShivaaV125.openCase) win.ShivaaV125.openCase(i, c);
        } else {
          goTo(i);
        }
      });
    });
    thumbs.forEach(function (b, i) {
      b.addEventListener('click', function () {
        pauseAuto(14000);
        if (i === front() && target === null) {
          if (win.ShivaaV125 && win.ShivaaV125.openCase) win.ShivaaV125.openCase(i, cards[i]);
        } else {
          goTo(i);
        }
      });
    });
    host.querySelector('#svCasePrev').addEventListener('click', function () { step(-1); });
    host.querySelector('#svCaseNext').addEventListener('click', function () { step(1); });

    /* ── the case is alive: a gentle tour while nobody touches it ───── */
    function scheduleAuto() {
      clearTimeout(autoT);
      if (reduced() || !alive) return;
      autoT = setTimeout(function () {
        if (visible && !dragging && target === null && !reelOn() && Date.now() > pausedUntil) step(1);
        scheduleAuto();
      }, 6000);
    }

    /* pause everything the moment the case leaves the screen */
    if ('IntersectionObserver' in win) {
      new IntersectionObserver(function (es) {
        visible = es[0].intersectionRatio > 0.15;
        playState();
      }, { threshold: [0, 0.15, 0.5] }).observe(stage);
    }
    /* the reel closes without telling us — a slow check keeps the films honest */
    var ticker = setInterval(function () {
      if (!stage.isConnected) { clearInterval(ticker); alive = false; clearTimeout(autoT); return; }
      playState();
    }, 800);

    host.__case = { measure: measure };
    hosts.push(host);
    bindResize();

    setFrontUI();
    layout();
    playState();
    scheduleAuto();
    /* first real measure once the browser has laid the stage out */
    setTimeout(measure, 0);
    if (win.requestAnimationFrame) requestAnimationFrame(measure);
  }

  win.ShivaaCase217 = { mount: mount, films: FILMS.length };
})();
