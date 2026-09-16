/* ══════════════════════════════════════════════════════════════════════════
   SHIVAA v125 — the four films, owner-selected showcases (16 Sep 2026):
     · THE REVOLVING CASE (preview Way 17) — draggable 3D ring, inertia +
       magnetic snap, rapid clicks queue, only the front film plays.
     · THE GOLD THREAD (preview Way 12) — a scroll-drawn gold thread weaving
       through four chapters; each film ignites as the tip passes it.
     · THE REEL — full-screen player (sound, swipe, auto-advance) with a
       zoom-from-origin transition.
   House rules honoured:
     · poster-first, muted, playsinline; films play ONLY while on screen
     · au-lite / Save-Data: films never autoplay and never even mount a
       <video> — posters only, the reel still loads on an explicit tap
       (the same tap-to-load contract as the PDP 360° films)
     · prefers-reduced-motion: no autoplay, no zoom transition
     · self-guarding + additive: any failure here cannot take the page down
     · v125 SUPERSEDES the v46 boost films row ("The house in motion") on
       the homepage — the owner's four films replace it (removal is
       display-layer only; boost.js itself is untouched and reversible)
   ══════════════════════════════════════════════════════════════════════════ */
'use strict';
(function () {
  var doc = document;
  var win = window;

  /* ── the films — ALL NINE are the owner's real footage now (uploaded
        16 Sep 2026, compressed to ~1–1.7 MB each at 720×1280, 10 s each).
        The Case: the bride's journey, unboxing to everyday wear. The
        Thread: the gold's journey, fire to forever. ── */
  var CASE_FILMS = [
    { f: '/images/films/film-01.mp4', p: '/images/films/film-01.jpg', no: '01', title: 'The Unboxing', cap: 'The box opens, and the room goes quiet.' },
    { f: '/images/films/film-02.mp4', p: '/images/films/film-02.jpg', no: '02', title: 'The Blessing', cap: 'A mother\u2019s hands. A promise in gold.' },
    { f: '/images/films/film-03.mp4', p: '/images/films/film-03.jpg', no: '03', title: 'The Muse',     cap: 'Some gold waits its whole life for her.' },
    { f: '/images/films/film-04.mp4', p: '/images/films/film-04.jpg', no: '04', title: 'The Wearing',  cap: 'Then one day, it is simply hers.' }
  ];
  /* the thread story — traditional values, modern methods; fire to forever */
  var THREAD_FILMS = [
    { f: '/images/films/thread-01.mp4', p: '/images/films/thread-01.jpg', no: '01', title: 'The Beginning',       cap: 'Where every thread of gold begins — in fire.' },
    { f: '/images/films/thread-02.mp4', p: '/images/films/thread-02.jpg', no: '02', title: 'From Paper to Gold',  cap: 'Sketched by hand. Made real in metal.' },
    { f: '/images/films/thread-03.mp4', p: '/images/films/thread-03.jpg', no: '03', title: 'The Pieces',          cap: 'Old-world engraving. New-world light.' },
    { f: '/images/films/thread-04.mp4', p: '/images/films/thread-04.jpg', no: '04', title: 'The Modern Bride',    cap: "Her grandmother's kada, worn her way." },
    { f: '/images/films/thread-05.mp4', p: '/images/films/thread-05.jpg', no: '05', title: 'Forever, Reimagined', cap: 'Two generations of gold. One thread.' }
  ];
  var STEP = 90;

  var REDUCED = (typeof matchMedia === 'function') && matchMedia('(prefers-reduced-motion: reduce)').matches;
  /* au-lite is set by aurum.js (save-data / low-core) — re-checked at every
     mount because it can land after this file first ran. */
  function lite() {
    try {
      return doc.documentElement.classList.contains('au-lite') ||
        (navigator.connection && navigator.connection.saveData);
    } catch (e) { return false; }
  }
  function splay(v) {
    try { var p = v.play(); if (p && p.catch) p.catch(function () {}); } catch (e) {}
  }
  function shut(v) {
    try { v.pause(); } catch (e) {}
  }
  var $ = function (s, r) { return (r || doc).querySelector(s); };

  /* ═══ 1 · THE REEL (built once, lives on <body>) ═══════════════════ */
  var reel = { el: null, vid: null, bars: [], i: 0, tx: null, ty: null, swiped: false, list: null, builtList: null };
  var SND_ON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5 6 9H3v6h3l5 4V5z" fill="currentColor" stroke="none"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12"/></svg>';
  var SND_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5 6 9H3v6h3l5 4V5z" fill="currentColor" stroke="none"/><path d="M16 9l5 5M21 9l-5 5"/></svg>';
  var PLAY = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';

  function reelBuildBars() {
    var box = $('#svReelBars');
    box.innerHTML = reel.list.map(function (fl, i) {
      return '<button class="sv-reel-bar" data-i="' + i + '" aria-label="Film ' + fl.no + '"><i></i></button>';
    }).join('');
    Array.prototype.forEach.call(box.querySelectorAll('.sv-reel-bar'), function (b) {
      b.addEventListener('click', function () { var i = +b.getAttribute('data-i'); if (i === reel.i) reelPlay(); else { reel.i = i; reelLoad(); } });
    });
    reel.bars = Array.prototype.slice.call(box.querySelectorAll('.sv-reel-bar i'));
  }
  function ensureReel() {
    if (reel.el) return;
    var w = doc.createElement('div');
    w.className = 'sv-reel'; w.id = 'svReel'; w.hidden = true;
    w.setAttribute('role', 'dialog'); w.setAttribute('aria-modal', 'true'); w.setAttribute('aria-label', 'Shivaa film player');
    w.innerHTML =
      '<button class="sv-reel-bg" data-sv-close aria-label="Close"></button>' +
      '<div class="sv-reel-stage" id="svReelStage">' +
        '<div class="sv-reel-bars" id="svReelBars"></div>' +
        '<div class="sv-reel-tools"><button id="svReelSnd" aria-label="Toggle sound"></button></div>' +
        '<button class="sv-reel-close" data-sv-close aria-label="Close">✕</button>' +
        '<video id="svReelVid" playsinline preload="auto"></video>' +
        '<div class="sv-reel-paused" id="svReelPaused"><span>' + PLAY + '</span></div>' +
        '<div class="sv-reel-hint" id="svReelHint">🔊 Tap the speaker for sound</div>' +
        '<button class="sv-reel-nav sv-reel-prev" id="svReelPrev" aria-label="Previous film">‹</button>' +
        '<button class="sv-reel-nav sv-reel-next" id="svReelNext" aria-label="Next film">›</button>' +
        '<div class="sv-reel-meta"><div><div class="sv-reel-count" id="svReelCount"></div><div class="sv-reel-title" id="svReelTitle"></div></div></div>' +
      '</div>';
    doc.body.appendChild(w);
    reel.el = w; reel.vid = $('#svReelVid'); reel.stage = $('#svReelStage');

    $('#svReelSnd').innerHTML = SND_ON;
    $('#svReelSnd').addEventListener('click', reelSnd);
    $('#svReelPrev').addEventListener('click', function () { reelGo(-1); });
    $('#svReelNext').addEventListener('click', function () { reelGo(1); });
    Array.prototype.forEach.call(w.querySelectorAll('[data-sv-close]'), function (b) {
      b.addEventListener('click', reelClose);
    });
    reel.vid.addEventListener('timeupdate', function () {
      var d = reel.vid.duration || 8;
      reel.bars[reel.i].style.width = Math.min(100, reel.vid.currentTime / d * 100) + '%';
    });
    reel.vid.addEventListener('ended', function () { reelGo(1); });
    reel.vid.addEventListener('play', function () { $('#svReelPaused').classList.remove('sv-show'); });
    reel.vid.addEventListener('pause', function () { if (!reel.el.hidden) $('#svReelPaused').classList.add('sv-show'); });
    reel.vid.addEventListener('click', function () { if (reel.swiped) { reel.swiped = false; return; } if (reel.vid.paused) reelPlay(); else reel.vid.pause(); });
    reel.stage.addEventListener('touchstart', function (e) { reel.tx = e.touches[0].clientX; reel.ty = e.touches[0].clientY; reel.swiped = false; }, { passive: true });
    reel.stage.addEventListener('touchend', function (e) {
      if (reel.tx == null) return;
      var dx = e.changedTouches[0].clientX - reel.tx, dy = e.changedTouches[0].clientY - reel.ty;
      if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy)) { reelGo(dx < 0 ? 1 : -1); reel.swiped = true; }
    }, { passive: true });
    doc.addEventListener('keydown', function (e) {
      if (reel.el.hidden) return;
      if (e.key === 'Escape') reelClose();
      if (e.key === 'ArrowRight') reelGo(1);
      if (e.key === 'ArrowLeft') reelGo(-1);
    });
    /* leaving the page/route while the reel is open must never trap the scroll */
    win.addEventListener('hashchange', reelClose);
    win.addEventListener('pagehide', reelClose);
  }
  function reelOpen() { return reel.el && !reel.el.hidden; }
  function reelPaintBars() { reel.bars.forEach(function (b, i) { b.style.width = i < reel.i ? '100%' : '0%'; }); }
  function reelPlay() {
    try {
      var p = reel.vid.play();
      if (p && p.catch) p.catch(function () {
        reel.vid.muted = true; reelSnd(); splay(reel.vid);
        var h = $('#svReelHint'); h.classList.add('sv-show'); setTimeout(function () { h.classList.remove('sv-show'); }, 2600);
      });
    } catch (e) {}
  }
  function reelLoad(fromEl) {
    var fl = reel.list[reel.i];
    reel.vid.src = fl.f; reel.vid.muted = false;
    $('#svReelSnd').innerHTML = SND_ON;
    $('#svReelCount').textContent = fl.no + ' / 0' + reel.list.length;
    $('#svReelTitle').textContent = fl.title;
    $('#svReelPaused').classList.remove('sv-show');
    reelPaintBars(); reelPlay();
    if (fromEl && !REDUCED && reel.stage.getBoundingClientRect().width > 0 && fromEl.getBoundingClientRect().width > 0) {
      var fr = fromEl.getBoundingClientRect(), tr = reel.stage.getBoundingClientRect();
      var s = Math.max(fr.width / tr.width, fr.height / tr.height);
      var dx = fr.left + fr.width / 2 - (tr.left + tr.width / 2);
      var dy = fr.top + fr.height / 2 - (tr.top + tr.height / 2);
      reel.stage.style.transition = 'none';
      reel.stage.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(' + s + ')';
      reel.stage.style.opacity = '.25';
      requestAnimationFrame(function () { requestAnimationFrame(function () {
        reel.stage.style.transition = 'transform .55s cubic-bezier(.22,1,.36,1), opacity .4s';
        reel.stage.style.transform = 'none'; reel.stage.style.opacity = '1';
        setTimeout(function () { reel.stage.style.transition = ''; reel.stage.style.transform = ''; reel.stage.style.opacity = ''; }, 620);
      }); });
    }
  }
  function openReel(i, fromEl, list) {
    ensureReel();
    reel.list = list || CASE_FILMS;
    reel.i = ((i % reel.list.length) + reel.list.length) % reel.list.length;
    if (reel.builtList !== reel.list) { reelBuildBars(); reel.builtList = reel.list; }
    reel.el.hidden = false;
    doc.documentElement.classList.add('sv-reel-open');
    pauseAllFilms();
    reelLoad(fromEl);
  }
  function reelClose() {
    if (!reel.el || reel.el.hidden) return;
    reel.el.hidden = true;
    doc.documentElement.classList.remove('sv-reel-open');
    try { reel.vid.pause(); reel.vid.removeAttribute('src'); reel.vid.load(); } catch (e) {}
    resumeVisibleFilms();
  }
  function reelGo(d) { reel.i = (reel.i + d + reel.list.length) % reel.list.length; reelLoad(); }
  function reelSnd() { reel.vid.muted = !reel.vid.muted; $('#svReelSnd').innerHTML = reel.vid.muted ? SND_OFF : SND_ON; }

  /* pause/resume every mounted film around the reel (data discipline) */
  var mountedFilms = [];
  function pauseAllFilms() { mountedFilms = mountedFilms.filter(function (v) { return v.isConnected; }); mountedFilms.forEach(shut); }
  function resumeVisibleFilms() {
    mountedFilms = mountedFilms.filter(function (v) { return v.isConnected; });
    if (REDUCED) return;
    mountedFilms.forEach(function (v) { if (v.dataset.svVis === '1' && v.getAttribute('src')) splay(v); });
  }

  /* ═══ 2 · film elements (poster-first, LITE never mounts a <video>) ═ */
  function filmMedia(fl, liteMode, playGate) {
    /* playGate: a function that returns true when this film may play */
    var wrap = doc.createElement('div');
    wrap.style.cssText = 'position:absolute;inset:0;overflow:hidden';
    if (liteMode) {
      wrap.innerHTML = '<img src="' + fl.p + '" alt="' + fl.title + '" loading="lazy" decoding="async" style="width:100%;height:100%;object-fit:cover">';
      return wrap;
    }
    var v = doc.createElement('video');
    v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'metadata';
    v.setAttribute('poster', fl.p);
    v.setAttribute('aria-label', fl.title);
    v.src = fl.f;
    v.style.cssText = 'width:100%;height:100%;object-fit:cover';
    v.dataset.svVis = '0';
    wrap.appendChild(v);
    mountedFilms.push(v);
    if ('IntersectionObserver' in win) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          v.dataset.svVis = e.intersectionRatio >= .35 ? '1' : '0';
          if (e.intersectionRatio >= .35) { if (playGate()) splay(v); }
          else { shut(v); }
        });
      }, { threshold: [0, .35, .6] }).observe(v);
    }
    return wrap;
  }

  /* ═══ 3 · THE REVOLVING CASE ═══════════════════════════════════════ */
  var caseApi = null;
  function mountCase(mount) {
    mount.dataset.mnt = '1';
    var liteMode = lite();
    mount.innerHTML =
      '<div class="sv-case">' +
        '<div class="sv-case-head">' +
          '<span class="label" style="color:var(--gold-2,#d4af5a)">Now showing</span>' +
          '<h3>Shivaa Films — turn the <em style="font-style:italic">case</em></h3>' +
          '<p>' + (liteMode ? 'Tap a film to play it with sound.' : 'Drag the case to spin it — it settles on your film. Tap the front film for full screen.') + '</p>' +
        '</div>' +
        '<div class="sv-case-stage" id="svCaseStage"><div class="sv-case-ring" id="svCaseRing"></div><div class="sv-case-glow"></div></div>' +
        '<div class="sv-case-ui">' +
          '<button class="sv-case-arrow" id="svCasePrev" aria-label="Previous film">‹</button>' +
          '<div class="sv-case-count" id="svCaseCount"></div>' +
          '<button class="sv-case-arrow" id="svCaseNext" aria-label="Next film">›</button>' +
        '</div>' +
        '<div class="sv-case-hint">' + (liteMode ? 'SAVE-DATA MODE · FILMS LOAD ONLY WHEN TAPPED' : 'DRAG TO SPIN · ONLY THE FRONT FILM PLAYS') + '</div>' +
      '</div>';
    var stage = $('#svCaseStage'), ring = $('#svCaseRing');
    var cards = [];
    CASE_FILMS.forEach(function (fl, i) {
      var c = doc.createElement('button');
      c.className = 'sv-case-card'; c.type = 'button';
      c.setAttribute('aria-label', 'Play ' + fl.title);
      c.innerHTML = '<span class="sv-case-no">FILM ' + fl.no + '</span><span class="sv-case-name">' + fl.title + '</span>';
      c.insertBefore(filmMedia(fl, liteMode, function () { return !REDUCED && caseVisible() && !reelOpen() && front() === i; }), c.firstChild.nextSibling);
      ring.appendChild(c); cards.push(c);
    });
    var rot = 0, vel = 0, R = 200, dragging = false, lastX = 0, movedPx = 0, snapTo = null, raf = null, visible = false, lastFront = -1, lastMoveT = 0;
    function place() {
      if (!stage.isConnected) return;
      var cw = cards[0] ? cards[0].offsetWidth : 230;
      R = Math.max(120, Math.round(cw * .95));
      cards.forEach(function (c, i) { c.style.transform = 'translate(-50%,-50%) rotateY(' + (i * STEP) + 'deg) translateZ(' + R + 'px)'; });
    }
    function front() { return ((Math.round(-rot / STEP) % CASE_FILMS.length) + CASE_FILMS.length) % CASE_FILMS.length; }
    function caseVisible() { return visible && stage.isConnected; }
    function setCount() { $('#svCaseCount').textContent = CASE_FILMS[front()].no + ' / 0' + CASE_FILMS.length + ' · ' + CASE_FILMS[front()].title.toUpperCase(); }
    function loop() {
      if (!stage.isConnected) { raf = null; return; }
      if (!dragging) {
        if (Math.abs(vel) > .06) { rot += vel; vel *= .94; }
        else if (snapTo != null) {
          rot += (snapTo - rot) * .14;
          if (Math.abs(snapTo - rot) < .12) { rot = snapTo; snapTo = null; }
        } else { vel = 0; }
      }
      ring.style.transform = 'rotateY(' + rot + 'deg)';
      cards.forEach(function (c, i) {
        var ang = ((i * STEP + rot) % 360 + 360) % 360;
        var d = Math.min(ang, 360 - ang);
        var f = Math.max(0, 1 - d / 180);
        c.style.opacity = (.32 + .68 * f).toFixed(3);
        c.style.filter = 'brightness(' + (.42 + .58 * f).toFixed(3) + ')';
      });
      var fi = front();
      if (fi !== lastFront) {
        lastFront = fi; setCount();
        cards.forEach(function (c, i) {
          var v = c.querySelector('video');
          if (!v) return;
          if (i === fi) { if (caseVisible() && !reelOpen()) splay(v); } else { shut(v); }
        });
      }
      /* settle: stop the frame loop once nothing is in flight */
      if (!dragging && snapTo == null && Math.abs(vel) <= .06) { raf = null; return; }
      raf = requestAnimationFrame(loop);
    }
    function kick() { if (!raf && stage.isConnected) raf = requestAnimationFrame(loop); }
    function stepBy(d) {
      var base = (snapTo != null) ? snapTo : Math.round(rot / STEP) * STEP;   /* queue rapid clicks */
      snapTo = base - d * STEP; vel = 0; kick();   /* front = −rot/STEP, so 'next' spins the ring minus-wise */
    }
    stage.addEventListener('pointerdown', function (e) {
      dragging = true; lastX = e.clientX; movedPx = 0; vel = 0; snapTo = null;
      try { stage.setPointerCapture(e.pointerId); } catch (err) {}
    });
    stage.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var dx = e.clientX - lastX; lastX = e.clientX;
      movedPx += Math.abs(dx); lastMoveT = Date.now();
      rot += dx * .32; vel = dx * .32; kick();
    });
    function endDrag() {
      if (!dragging) return;
      dragging = false;
      if (movedPx > 7) snapTo = Math.round(rot / STEP) * STEP;
      kick();
    }
    stage.addEventListener('pointerup', endDrag);
    stage.addEventListener('pointercancel', endDrag);
    cards.forEach(function (c, i) {
      c.addEventListener('click', function () {
        if (Date.now() - lastMoveT < 240) return;
        if (i === front()) openReel(i, c, CASE_FILMS);
        else {
          var cur = (snapTo != null) ? snapTo : rot;
          var delta = (((-i * STEP - cur) % 360) + 360) % 360; if (delta > 180) delta -= 360;
          snapTo = cur + delta; vel = 0; kick();
        }
      });
    });
    $('#svCasePrev').addEventListener('click', function () { stepBy(-1); });
    $('#svCaseNext').addEventListener('click', function () { stepBy(1); });
    if ('IntersectionObserver' in win) {
      new IntersectionObserver(function (es) {
        visible = es[0].intersectionRatio > .15;
        if (!visible) cards.forEach(function (c) { var v = c.querySelector('video'); if (v) shut(v); });
        else kick();
      }, { threshold: [0, .15, .5] }).observe(stage);
    } else { visible = true; }
    place();
    if ('ResizeObserver' in win) new ResizeObserver(place).observe(stage);
    win.addEventListener('resize', place);
    setCount();
    caseApi = {
      next: function () { stepBy(1); },
      prev: function () { stepBy(-1); },
      front: front,
      rot: function () { return Math.round(rot); },
      count: function () { return cards.length; }
    };
  }

  /* ═══ 4 · THE GOLD THREAD ══════════════════════════════════════════ */
  var thread = null;
  function mountThread(mount) {
    mount.dataset.mnt = '1';
    var liteMode = lite();
    mount.innerHTML =
      '<div class="sv-thread" id="svThreadBox">' +
        '<svg class="sv-thread-svg" viewBox="0 0 400 1700" preserveAspectRatio="none" aria-hidden="true">' +
          '<defs><linearGradient id="svGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a6a24"/><stop offset=".5" stop-color="#e8c877"/><stop offset="1" stop-color="#8a6a24"/></linearGradient></defs>' +
          '<path class="sv-ghost" d="M200,0 C345,120 55,220 200,340 C345,460 55,560 200,680 C345,800 55,900 200,1020 C345,1140 55,1240 200,1360 C345,1480 55,1580 200,1700"/>' +
          '<path class="sv-draw" id="svThreadPath" d="M200,0 C345,120 55,220 200,340 C345,460 55,560 200,680 C345,800 55,900 200,1020 C345,1140 55,1240 200,1360 C345,1480 55,1580 200,1700"/>' +
        '</svg>' +
        '<div class="sv-thread-intro">' +
          '<span class="label">Follow the thread</span>' +
          '<h3>Everything begins as <span class="disp-italic">one thread of gold</span></h3>' +
          '<p>Scroll slowly — the thread draws itself and the films wake as it passes. Five chapters, fire to forever.</p>' +
        '</div>' +
        '<div class="sv-thread-items" id="svThreadItems"></div>' +
      '</div>';
    var items = [];
    THREAD_FILMS.forEach(function (fl, i) {
      var it = doc.createElement('div');
      it.className = 'sv-thread-item' + (i % 2 ? ' sv-right' : '');
      it.innerHTML =
        '<button class="sv-thread-film" type="button" aria-label="Play ' + fl.title + '"><span class="sv-case-no" style="top:10px;left:10px">FILM ' + fl.no + '</span></button>' +
        '<div class="sv-thread-cap"><small>CHAPTER ' + fl.no + '</small><b>' + fl.title + '</b><p>' + fl.cap + '</p></div>';
      var filmBtn = it.querySelector('.sv-thread-film');
      filmBtn.insertBefore(filmMedia(fl, liteMode, function () { return !REDUCED && it.classList.contains('sv-lit') && threadVisible() && !reelOpen(); }), filmBtn.firstChild);
      filmBtn.addEventListener('click', function () { openReel(i, filmBtn, THREAD_FILMS); });
      $('#svThreadItems').appendChild(it); items.push(it);
    });
    var path = $('#svThreadPath'), box = $('#svThreadBox');
    var L = 2400;
    try { if (path && typeof path.getTotalLength === 'function') L = path.getTotalLength(); } catch (e) {}
    if (path) { path.style.strokeDasharray = L; path.style.strokeDashoffset = L; }
    var visible = false, ticking = false;
    function threadVisible() { return visible && box.isConnected; }
    function drive() {
      ticking = false;
      if (!box.isConnected) { thread = null; return; }
      var r = box.getBoundingClientRect();
      var tipY = win.innerHeight * .72 - r.top;
      var p = Math.min(1, Math.max(0, r.height > 0 ? tipY / r.height : 0));
      if (path) path.style.strokeDashoffset = L * (1 - p);
      items.forEach(function (it) {
        var ir = it.getBoundingClientRect();
        var cy = ir.top - r.top + ir.height / 2;
        var lit = cy <= tipY;
        if (lit !== it.classList.contains('sv-lit')) {
          it.classList.toggle('sv-lit', lit);
          var v = it.querySelector('video');
          if (v) { if (lit && threadVisible() && !reelOpen()) splay(v); else shut(v); }
        }
      });
    }
    thread = {
      drive: drive,
      connected: function () { return box.isConnected; }
    };
    if ('IntersectionObserver' in win) {
      new IntersectionObserver(function (es) {
        visible = es[0].intersectionRatio > .05;
        if (visible) drive();
      }, { threshold: [0, .05, .3] }).observe(box);
    } else { visible = true; drive(); }
    drive();
  }
  /* one global scroll listener drives whichever thread is alive */
  win.addEventListener('scroll', function () {
    if (!thread || !thread.connected()) return;
    if (!tickingThread) { tickingThread = true; requestAnimationFrame(function () { tickingThread = false; if (thread) thread.drive(); }); }
  }, { passive: true });
  var tickingThread = false;

  /* ═══ 5 · mount watcher + boost-films supersede ════════════════════ */
  /* v125 supersedes the v46 boost films row: the owner's four films are
     THE films now. Display-layer removal only — boost.js is untouched and
     removing this block restores the old row. */
  function supersedeBoostFilms(view) {
    var bf = view.querySelector('[data-boost="films"]');
    if (bf) bf.remove();
  }
  function mountAll() {
    var view = doc.getElementById('view');
    if (!view) return;
    supersedeBoostFilms(view);
    var c = doc.getElementById('svCaseMount');
    if (c && !c.dataset.mnt) { try { mountCase(c); } catch (e) { c.dataset.mnt = 'err'; } }
    var t = doc.getElementById('svThreadMount');
    if (t && !t.dataset.mnt) { try { mountThread(t); } catch (e) { t.dataset.mnt = 'err'; } }
  }
  win.addEventListener('DOMContentLoaded', mountAll);
  mountAll();
  if (typeof MutationObserver === 'function') {
    var view = doc.getElementById('view');
    if (view) {
      var mo = new MutationObserver(function () { mountAll(); });
      try { mo.observe(view, { childList: true, subtree: true }); } catch (e) {}
    }
  }
  win.addEventListener('hashchange', function () { setTimeout(mountAll, 0); });

  /* tiny test surface for the smoke gates (never used by the page itself) */
  win.ShivaaV125 = {
    open: function (i, el) { openReel(i, el); },
    close: reelClose,
    isOpen: reelOpen,
    caseNext: function () { if (caseApi) caseApi.next(); },
    caseFront: function () { return caseApi ? caseApi.front() : -1; },
    caseCount: function () { return caseApi ? caseApi.count() : 0; },
    films: CASE_FILMS.length + THREAD_FILMS.length,
    caseFilms: CASE_FILMS.length,
    threadFilms: THREAD_FILMS.length,
    openThread: function (i, el) { openReel(i, el, THREAD_FILMS); },
    lite: lite
  };

})();
