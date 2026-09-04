/* ═══════════════════════════════════════════════════════════════
   SHIVAA 3D — hand-built 3D engine (no libraries)
   1) Hero scene: faceted brilliant-cut diamond + gold ring + dust
   2) 3D Atelier: drag-to-rotate shaded jewellery viewer
   Flat-shaded meshes · lambert + specular · painter's algorithm
   ═══════════════════════════════════════════════════════════════ */
'use strict';
window.Shivaa3D = (function () {

  /* ───────── math ───────── */
  const NORM = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const ROT = (p, ax, ay) => {
    const x1 = p[0] * Math.cos(ay) + p[2] * Math.sin(ay);
    const z1 = -p[0] * Math.sin(ay) + p[2] * Math.cos(ay);
    const y1 = p[1] * Math.cos(ax) - z1 * Math.sin(ax);
    const z2 = p[1] * Math.sin(ax) + z1 * Math.cos(ax);
    return [x1, y1, z2];
  };
  const L = NORM([-0.42, -0.8, 0.5]);           // key light (top-left-front)
  const H = NORM([L[0], L[1], L[2] + 1]);        // half vector for specular
  const shade = (n, base, hi, specPow) => {
    const d = Math.max(0, n[0] * L[0] + n[1] * L[1] + n[2] * L[2]);
    const s = Math.pow(Math.max(0, n[0] * H[0] + n[1] * H[1] + n[2] * H[2]), specPow || 22);
    const amb = 0.3;
    return [base[0] * (amb + 0.75 * d) + 235 * s, base[1] * (amb + 0.75 * d) + 225 * s, base[2] * (amb + 0.75 * d) + 190 * s];
  };
  const GOLD = [196, 148, 62], GEM = [214, 200, 178];

  /* ───────── mesh builders ───────── */
  function diamondMesh(N = 16, T = 8) {  // returns triangles [[p,p,p],...]
    const gir = [], tab = [], f = [];
    for (let i = 0; i < N; i++) gir.push([Math.cos(i / N * 6.2832), 0, Math.sin(i / N * 6.2832)]);
    for (let i = 0; i < T; i++) { const a = i / T * 6.2832 + 0.3927; tab.push([Math.cos(a) * 0.52, -0.66, Math.sin(a) * 0.52]); }
    const cul = [0, 1.38, 0], tc = [0, -0.66, 0];
    for (let i = 0; i < T; i++) f.push([tc, tab[(i + 1) % T], tab[i]]);                 // table
    for (let i = 0; i < T; i++) {                                                        // crown + pavilion
      const g0 = i * 2, g1 = i * 2 + 1, g2 = (i * 2 + 2) % N;
      f.push([tab[i], gir[g1], gir[g0]]);
      f.push([tab[i], tab[(i + 1) % T], gir[g1]]);
      f.push([tab[(i + 1) % T], gir[g2], gir[g1]]);
      f.push([gir[g0], gir[g1], cul]);
    }
    return f;
  }
  function torusMesh(R, r, U = 34, V = 12) { // returns quads {p:[4 pts], n:[..]}
    const q = [];
    for (let i = 0; i < U; i++) for (let j = 0; j < V; j++) {
      const pts = [], nrm = [];
      for (const [a, b] of [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]]) {
        const u = a / U * 6.2832, v = b / V * 6.2832, cv = Math.cos(v);
        pts.push([(R + r * cv) * Math.cos(u), r * Math.sin(v), (R + r * cv) * Math.sin(u)]);
        nrm.push([cv * Math.cos(u), Math.sin(v), cv * Math.sin(u)]);
      }
      q.push({ p: pts, n: nrm });
    }
    return q;
  }
  const DIAMOND = diamondMesh();
  const TORI = { ring: torusMesh(1, 0.15), bangle: torusMesh(1, 0.27) };
  function beadsMesh(nB = 20, R = 1.25) { // sphere centers on a circle (xy-plane), pendant bead at bottom
    const c = [];
    for (let i = 0; i < nB; i++) { const a = i / nB * 6.2832; c.push({ p: [Math.cos(a) * R, Math.sin(a) * R, 0], r: i % 5 === 0 ? 0.19 : 0.14 }); }
    c.push({ p: [0, -R - 0.32, 0], r: 0.3 });
    return c;
  }
  const BEADS = beadsMesh();

  /* ───────── canvas plumbing ───────── */
  function fit(cv, dprCap = 2) {
    const dpr = Math.min(devicePixelRatio || 1, dprCap);
    const r = cv.parentElement.getBoundingClientRect();
    cv.width = Math.max(10, r.width * dpr); cv.height = Math.max(10, r.height * dpr);
    const x = cv.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0);
    return [x, r.width, r.height];
  }
  function dragControl(cv, state) {
    let sx = null, sy = null;
    cv.addEventListener('pointerdown', e => { sx = e.clientX; sy = e.clientY; try { cv.setPointerCapture(e.pointerId); } catch (err) {} state.hold = true; });
    cv.addEventListener('pointermove', e => {
      if (sx == null) return;
      state.vy = (e.clientX - sx) * 0.012; state.vx = (e.clientY - sy) * 0.012;
      state.ay += state.vy; state.ax = Math.max(-1.35, Math.min(1.35, state.ax + state.vx));
      sx = e.clientX; sy = e.clientY;
    });
    const end = () => { sx = null; state.hold = false; };
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
    cv.addEventListener('pointerleave', () => { if (!cv.hasPointerCapture) end(); });
  }

  /* ───────── renderers (shared drawing) ───────── */
  function drawFacets(x, cx, cy, sc, mesh, ax, ay, off, base, specPow) {
    const tris = [];
    for (const t of mesh) {
      const a = ROT(t[0], ax, ay), b = ROT(t[1], ax, ay), c = ROT(t[2], ax, ay);
      const cxm = (a[0] + b[0] + c[0]) / 3, cym = (a[1] + b[1] + c[1]) / 3, czm = (a[2] + b[2] + c[2]) / 3;
      const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
      let n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
      n = NORM(n);
      if (n[0] * cxm + n[1] * cym + n[2] * czm < 0) n = [-n[0], -n[1], -n[2]];   // outward
      if (n[2] < -0.25) continue;                                                // cull back
      const rn = ROT(n, ax, ay);
      tris.push({ z: czm, a, b, c, n: rn, cxm, cym, czm });
    }
    tris.sort((p, q) => p.z - q.z);
    for (const t of tris) {
      const col = shade(t.n, base, 0, specPow || 26);
      x.fillStyle = `rgb(${Math.min(255, col[0]) | 0},${Math.min(255, col[1]) | 0},${Math.min(255, col[2]) | 0})`;
      x.beginPath();
      x.moveTo(cx + (t.a[0] + off[0]) * sc, cy + (t.a[1] + off[1]) * sc);
      x.lineTo(cx + (t.b[0] + off[0]) * sc, cy + (t.b[1] + off[1]) * sc);
      x.lineTo(cx + (t.c[0] + off[0]) * sc, cy + (t.c[1] + off[1]) * sc);
      x.closePath(); x.fill();
      x.strokeStyle = 'rgba(255,250,235,.16)'; x.lineWidth = 0.6; x.stroke();
      const sp = t.n[0] * H[0] + t.n[1] * H[1] + t.n[2] * H[2];
      if (sp > 0.965) {   // glint
        const gx = cx + (t.cxm + off[0]) * sc, gy = cy + (t.cym + off[1]) * sc;
        x.save(); x.translate(gx, gy); x.rotate(Math.atan2(t.n[1], t.n[0]));
        x.strokeStyle = 'rgba(255,255,250,.9)'; x.lineWidth = 1.2;
        x.beginPath(); x.moveTo(-7, 0); x.lineTo(7, 0); x.moveTo(0, -7); x.lineTo(0, 7); x.stroke(); x.restore();
      }
    }
  }
  function drawTorus(x, cx, cy, sc, mesh, ax, ay, off, bob) {
    const quads = [];
    for (const qd of mesh) {
      const P = []; let Z = 0;
      for (let i = 0; i < 4; i++) { const p = ROT(qd.p[i], ax, ay); P.push(p); Z += p[2]; }
      quads.push({ P, z: Z / 4, n: ROT(qd.n[0], ax, ay) });
    }
    quads.sort((a, b) => a.z - b.z);
    for (const qd of quads) {
      const n = qd.n;
      if (n[2] < -0.2) continue;
      const col = shade(n, GOLD, 0, 26);
      x.fillStyle = `rgb(${Math.min(255, col[0]) | 0},${Math.min(255, col[1]) | 0},${Math.min(255, col[2]) | 0})`;
      x.beginPath();
      x.moveTo(cx + (qd.P[0][0] + off[0]) * sc, cy + (qd.P[0][1] + off[1]) * sc + bob);
      for (let i = 1; i < 4; i++) x.lineTo(cx + (qd.P[i][0] + off[0]) * sc, cy + (qd.P[i][1] + off[1]) * sc + bob);
      x.closePath(); x.fill();
      x.strokeStyle = 'rgba(80,45,10,.25)'; x.lineWidth = 0.5; x.stroke();
    }
  }
  function drawBeads(x, cx, cy, sc, ax, ay) {
    const list = BEADS.map(b => ({ ...b, r3: ROT(b.p, ax, ay) })).sort((a, b2) => a.r3[2] - b2.r3[2]);
    for (const b of list) {
      const bx = cx + b.r3[0] * sc, by = cy + b.r3[1] * sc;
      const rr = b.r * sc * (0.88 + 0.24 * (b.r3[2] + 1.5) / 3);
      const lx = bx - rr * 0.35, ly = by - rr * 0.4;
      const g = x.createRadialGradient(lx, ly, rr * 0.1, bx, by, rr);
      g.addColorStop(0, '#f4dfa4'); g.addColorStop(0.45, '#c99b3f'); g.addColorStop(1, '#5d3c0f');
      x.fillStyle = g; x.beginPath(); x.arc(bx, by, rr, 0, 7); x.fill();
      x.fillStyle = 'rgba(255,252,240,.85)'; x.beginPath(); x.arc(lx, ly, rr * 0.16, 0, 7); x.fill();
    }
  }

  /* ═══════════ SCENE 1 · HERO ═══════════ */
  function startHero(canvasId) {
    const cv = document.getElementById(canvasId);
    if (!cv || cv._s3d) return; cv._s3d = true;
    const st = { ax: -0.42, ay: 0, hold: false, mx: 0.5, my: 0.5 };
    let W, H2, x;
    const size = () => { [x, W, H2] = fit(cv); };
    size(); addEventListener('resize', size);
    dragControl(cv, st);
    cv.parentElement.addEventListener('pointermove', e => {
      if (st.hold) return;
      const r = cv.getBoundingClientRect();
      st.mx = (e.clientX - r.left) / r.width; st.my = (e.clientY - r.top) / r.height;
    }, { passive: true });
    const dust = Array.from({ length: 110 }, () => ({ x: (Math.random() - .5) * 4.6, y: (Math.random() - .5) * 3.6, z: (Math.random() - .5) * 3, p: Math.random() * 6.28, s: 0.5 + Math.random() }));
    let t = 0;
    (function frame() {
      t += 0.016;
      if (!document.body.contains(cv)) return;                 // stop when routed away
      if (!st.hold) st.ay += 0.0045;
      const parX = (st.my - 0.5) * 0.22, parY = (st.mx - 0.5) * 0.3;
      const ax = st.ax + parX, ay = st.ay + parY;
      x.clearRect(0, 0, W, H2);
      const cx = W / 2, cy = H2 / 2, sc = Math.min(W, H2) * 0.155;
      // dust
      for (const d of dust) {
        const q = ROT([d.x, d.y + Math.sin(t * 0.7 + d.p) * 0.12, d.z], ax * 0.5, ay * 0.5);
        const a = 0.14 + 0.3 * Math.abs(Math.sin(t * 1.6 + d.p));
        x.fillStyle = `rgba(238,214,150,${a})`;
        x.beginPath(); x.arc(cx + q[0] * sc, cy + q[1] * sc, 1.1 * d.s * (1 + q[2] * 0.3), 0, 7); x.fill();
      }
      // main diamond — right, gently bobbing
      const bob = Math.sin(t * 0.9) * 8;
      drawFacets(x, cx + W * 0.16, cy - H2 * 0.08 + bob, sc * 1.5, DIAMOND, ax, ay, [0, 0, 0], GEM, 30);
      // orbiting small diamond
      const oa = t * 0.7;
      drawFacets(x, cx + Math.cos(oa) * W * 0.3, cy + Math.sin(oa) * H2 * 0.26 + Math.sin(t * 1.3) * 6, sc * 0.5, DIAMOND, ax + 0.5, ay * 1.4, [0, 0, 0], GEM, 30);
      // gold ring — left, tilted behind
      drawTorus(x, cx - W * 0.22, cy + H2 * 0.16 + Math.sin(t * 0.8 + 1) * 6, sc * 1.15, TORI.ring, ax + 0.42, ay + 0.5, [0, 0, 0], 0);
      // solitaire on the ring
      drawFacets(x, cx - W * 0.22, cy + H2 * 0.16 - sc * 1.12 + Math.sin(t * 0.8 + 1) * 6, sc * 0.42, DIAMOND, ax + 0.42, ay + 0.5, [0, 0, 0], GEM, 30);
      // floor glow
      const g = x.createRadialGradient(cx, cy + H2 * 0.34, 4, cx, cy + H2 * 0.34, W * 0.32);
      g.addColorStop(0, 'rgba(212,175,90,.12)'); g.addColorStop(1, 'rgba(212,175,90,0)');
      x.fillStyle = g; x.fillRect(0, 0, W, H2);
      requestAnimationFrame(frame);
    })();
  }

  /* ═══════════ SCENE 2 · ATELIER ═══════════ */
  function startAtelier(canvasId, chipsId) {
    const cv = document.getElementById(canvasId);
    const chips = document.getElementById(chipsId);
    if (!cv || cv._s3d) return; cv._s3d = true;
    const st = { ax: -0.3, ay: 0.4, hold: false };
    let W, H2, x, mode = 'ring', fade = 1, visible = false;
    const size = () => { [x, W, H2] = fit(cv); };
    size(); addEventListener('resize', size);
    dragControl(cv, st);
    new IntersectionObserver(es => es.forEach(e => visible = e.isIntersecting), { threshold: 0.05 }).observe(cv);
    if (chips) chips.addEventListener('click', e => {
      const b = e.target.closest('button[data-o]'); if (!b) return;
      mode = b.dataset.o; fade = 0;
      [...chips.querySelectorAll('button')].forEach(x2 => x2.classList.toggle('on', x2 === b));
    });
    let t = 0;
    (function frame() {
      t += 0.016;
      if (!document.body.contains(cv)) return;
      if (visible) {
        if (!st.hold) st.ay += 0.006;
        fade = Math.min(1, fade + 0.06);
        const ease = 1 - Math.pow(1 - fade, 3);
        x.clearRect(0, 0, W, H2);
        const cx = W / 2, cy = H2 / 2, sc = Math.min(W, H2) * 0.3 * ease;
        // pedestal glow
        const g = x.createRadialGradient(cx, cy + H2 * 0.26, 2, cx, cy + H2 * 0.26, W * 0.26);
        g.addColorStop(0, 'rgba(212,175,90,.16)'); g.addColorStop(1, 'rgba(212,175,90,0)');
        x.fillStyle = g; x.fillRect(0, 0, W, H2);
        const bob = Math.sin(t * 0.85) * 5;
        if (mode === 'ring') {
          drawTorus(x, cx, cy + sc * 0.28 + bob, sc, TORI.ring, st.ax, st.ay, [0, 0, 0], 0);
          drawFacets(x, cx, cy + sc * 0.28 - sc * 1.1 + bob, sc * 0.4, DIAMOND, st.ax + 0.3, st.ay, [0, 0, 0], GEM, 30);
        } else if (mode === 'bangle') {
          drawTorus(x, cx, cy + bob, sc * 0.96, TORI.bangle, st.ax, st.ay, [0, 0, 0], 0);
        } else if (mode === 'diamond') {
          drawFacets(x, cx, cy + bob, sc * 1.5, DIAMOND, st.ax, st.ay, [0, 0, 0], GEM, 30);
        } else {
          drawBeads(x, cx, cy, sc * 0.82, st.ax, st.ay);
        }
      }
      requestAnimationFrame(frame);
    })();
  }

  return { startHero, startAtelier };
})();
