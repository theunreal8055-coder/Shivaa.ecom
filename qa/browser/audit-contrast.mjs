/* ═══════════════════════════════════════════════════════════════════════════
   SHIVAA · v207 deep readability audit (jsdom + custom cascade)
   ───────────────────────────────────────────────────────────────────────────
   Boots every route of the real app (preview shim on :8090) and walks every
   piece of visible text. For each text element it resolves the EFFECTIVE
   colour (with inheritance and -webkit-text-fill-color) and the EFFECTIVE
   background (own layer, then ancestors, alpha-composited; gradient stops
   averaged), then computes the WCAG contrast ratio.

   Flags:
     · contrast below 4.5:1 (3:1 for large text: ≥24px, or ≥18.66px bold)
     · INVISIBLE text: transparent fill with no gradient clipped to its own
       glyphs (the background-clip:text failure mode)
   Run:  python3 qa/preview_shim.py --port 8090   (first)
         node qa/browser/audit-contrast.mjs [mobile]
   ═══════════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import path from 'node:path';
import { boot, wait } from './harness.mjs';

const CMS = path.resolve(import.meta.dirname, '..', '..', 'cms');
const MOBILE = process.argv.includes('mobile');

/* ── 1. CSS source → rules, in load order ─────────────────────────────── */
function cssFiles() {
  const idx = fs.readFileSync(path.join(CMS, 'index.html'), 'utf8');
  const names = [];
  for (const m of idx.matchAll(/href="\/css\/([\w.-]+\.css)/g)) if (!names.includes(m[1])) names.push(m[1]);
  return names;
}
function parseCss(src, file, inheritedMedia = null) {
  src = src.replace(/\/\*[\s\S]*?\*\//g, '');
  const rules = [];
  let i = 0;
  while (i < src.length) {
    const brace = src.indexOf('{', i);
    if (brace === -1) break;
    const head = src.slice(i, brace).trim();
    let depth = 1, j = brace + 1;
    while (j < src.length && depth > 0) {
      if (src[j] === '{') depth++; else if (src[j] === '}') depth--;
      j++;
    }
    const body = src.slice(brace + 1, j - 1);
    if (head.startsWith('@media')) {
      const cond = head.slice(6).trim();
      for (const r of parseCss(body, file, inheritedMedia ? inheritedMedia + ' and ' + cond : cond)) rules.push(r);
    } else if (head.startsWith('@supports') || head.startsWith('@container')) {
      for (const r of parseCss(body, file, inheritedMedia)) rules.push(r);
    } else if (head.startsWith('@')) {
      /* @keyframes / @font-face / @property / @import — skip */
    } else {
      rules.push({ sel: head, body, media: inheritedMedia, file });
    }
    i = j;
  }
  return rules;
}
function loadRules() {
  const rules = [];
  for (const f of cssFiles()) {
    const p = path.join(CMS, 'css', f);
    if (!fs.existsSync(p)) continue;
    rules.push(...parseCss(fs.readFileSync(p, 'utf8'), f));
  }
  return rules;
}

/* ── 2. value helpers ─────────────────────────────────────────────────── */
const DECL = /([a-zA-Z-][\w-]*)\s*:\s*([^;{}]+)/g;
function declsOf(body) {
  const d = {};
  for (const m of body.matchAll(DECL)) d[m[1].toLowerCase()] = m[2].trim();
  return d;
}
function specificity(sel) {
  const s = sel.replace(/::(before|after|placeholder|marker|selection)/g, '§');
  const a = (s.match(/#[\w-]+/g) || []).length;
  const b = (s.match(/\.[\w-]+|\[[^\]]*\]|:(?!hover|focus|active|visited|focus-visible|focus-within|target)[\w-]+(\([^)]*\))?/g) || []).length;
  const bare = (s.match(/(^|[\s>+~])([a-z][\w-]*)/gi) || []).length;
  return [a, b, Math.max(0, bare)];
}
function resolveVars(v, vars) {
  let out = v, guard = 0;
  while (out.includes('var(') && guard++ < 8) {
    out = out.replace(/var\(\s*(--[\w-]+)\s*(?:,\s*([^)]*))?\)/g, (m, name, fb) => vars[name] !== undefined ? vars[name] : (fb !== undefined ? fb : ''));
  }
  return out;
}
function parseColor(v, vars) {
  if (!v) return null;
  v = resolveVars(v, vars).trim().toLowerCase();
  if (v === 'inherit') return { special: 'inherit' };
  if (v === 'currentcolor') return { special: 'currentcolor' };
  if (v === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
  let m = v.match(/^#([0-9a-f]{3,8})$/);
  if (m) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = [...h].map(c => c + c).join('');
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1 };
  }
  m = v.match(/^rgba?\(([^)]+)\)$/);
  if (m) {
    const p = m[1].split(/[,/]+/).map(s => s.trim());
    return { r: +p[0], g: +p[1], b: +p[2], a: p[3] === undefined || p[3] === '' ? 1 : parseFloat(p[3]) };
  }
  if (v === 'white') return { r: 255, g: 255, b: 255, a: 1 };
  if (v === 'black') return { r: 0, g: 0, b: 0, a: 1 };
  return null;
}
function gradientStops(v, vars) {
  const cols = [];
  for (const m of resolveVars(v, vars).matchAll(/(#[0-9a-f]{3,8}|rgba?\([^)]+\))/gi)) {
    const c = parseColor(m[1], vars);
    if (c && !c.special && c.a > 0) cols.push(c);
  }
  return cols;
}
const over = (fg, bg) => ({
  r: fg.r * fg.a + bg.r * (1 - fg.a),
  g: fg.g * fg.a + bg.g * (1 - fg.a),
  b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1,
});
function luminance(c) {
  const f = x => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
}
const contrast = (a, b) => {
  const l1 = luminance(a), l2 = luminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
};

/* ── 3. cascade matching per element (selector index → only plausible rules) ── */
function ruleKeys(sel) {
  const keys = [];
  for (const sel0 of sel.split(',')) {
    const s = sel0.trim().replace(/:root/g, 'html');
    if (!s || s.includes('::')) continue;
    const m = s.match(/([#.]?[\w-]+)\s*$/) || s.match(/([#.]?[\w-]+)/);
    keys.push(m ? m[1].toLowerCase() : '*');
  }
  return keys;
}
function buildIndex(rules) {
  const idx = new Map();
  rules.forEach((r, order) => {
    for (const k of ruleKeys(r.sel)) {
      if (!idx.has(k)) idx.set(k, []);
      idx.get(k).push({ r, order });
    }
  });
  return idx;
}
function matchedDecls(el, rules, index, mediaTest, cache) {
  if (cache.has(el)) return cache.get(el);
  const cand = new Map(); // order -> rule
  const keys = [el.tagName.toLowerCase()];
  if (el.id) keys.push('#' + el.id.toLowerCase());
  if (el.className && typeof el.className === 'string') {
    for (const c of el.className.trim().split(/\s+/)) if (c) keys.push('.' + c.toLowerCase());
  }
  for (const k of keys) {
    for (const { r, order } of index.get(k) || []) if (!cand.has(order)) cand.set(order, r);
  }
  for (const { r, order } of index.get('*') || []) if (!cand.has(order)) cand.set(order, r);
  const out = [];
  for (const [order, r] of [...cand.entries()].sort((a, b) => a[0] - b[0])) {
    if (r.media && !mediaTest(r.media)) continue;
    for (const sel0 of r.sel.split(',')) {
      const sel = sel0.trim();
      if (!sel || sel.includes('::')) continue;
      try {
        if (el.matches(sel)) {
          out.push({ decls: declsOf(r.body), spec: specificity(sel), order, sel, file: r.file });
          break;
        }
      } catch (e) { /* selector engine limitation — skip */ }
    }
  }
  cache.set(el, out);
  return out;
}
function paintOf(el, matched, vars) {
  let color = null, fill = null, bgc = null, bgi = null, img = false, opacity = 1, clipText = false, pos = null, inset = null;
  for (const m of matched) {
    const d = m.decls;
    if (d.color) { const c = parseColor(d.color, vars); if (c) color = c; }
    if (d['-webkit-text-fill-color']) { const c = parseColor(d['-webkit-text-fill-color'], vars); if (c) fill = c; }
    if (d['background-color']) { const c = parseColor(d['background-color'], vars); if (c) bgc = c; }
    if (d.background) {
      const solid = parseColor(d.background, vars);
      if (solid && !solid.special) { bgc = solid; bgi = null; img = false; }
      if (/gradient\(/.test(d.background)) { bgi = d.background; img = false; if (!bgc || bgc.a < 1) bgc = null; }
      else if (/url\(/.test(d.background)) { img = true; bgi = null; if (!bgc || bgc.a < 1) bgc = null; }
    }
    if (d['background-image']) {
      if (/gradient\(/.test(d['background-image'])) { bgi = d['background-image']; img = false; }
      else if (/url\(/.test(d['background-image'])) { img = true; bgi = null; }
    }
    if ((d['-webkit-background-clip'] || d['background-clip']) === 'text') clipText = true;
    if (d.position) pos = d.position;
    if (d.inset) inset = d.inset;
    if (d.opacity) opacity *= Math.max(0, Math.min(1, parseFloat(d.opacity) || 1));
  }
  return { color, fill, bgc, bgi, img, opacity, clipText, pos, inset };
}
/* text colour with inheritance (color and -webkit-text-fill-color both inherit) */
function effectiveTextColor(el, resolveFor) {
  let node = el, fill = null, clip = false;
  while (node && node.nodeType === 1) {
    const p = resolveFor(node);
    if (!fill && p.fill && !p.fill.special) fill = p.fill;
    if (p.fill && p.fill.special === 'transparent') fill = { r: 0, g: 0, b: 0, a: 0 };
    if (p.clipText) clip = true;
    if (p.color && !p.color.special && p.color.special !== 'currentcolor') return { fill: fill || p.color, clip };
    if (p.fill && p.fill.a === 0) return { fill, clip };
    node = node.parentElement;
  }
  return { fill: fill || { r: 43, g: 33, b: 24, a: 1 }, clip };
}
/* background candidates: the first ancestor layer that paints provides the
   palette; multi-gradient surfaces contribute EVERY stop (alpha composited over
   the bottom opaque stop) so contrast can be judged against the WORST case. */
function bgCandidates(el, resolveFor, vars) {
  const pending = [];   // translucent layers above the first opaque surface
  let node = el;
  while (node && node.nodeType === 1) {
    const p = resolveFor(node);
    if (p.img) return { imageBacked: true, cands: [] };
    // a child that covers (absolute inset:0, or a filling media element) is a
    // backdrop layer (photo <img>, or a sibling stage like .hero-img / .hero-fade).
    // The real underlay is below it and out of reach of this walk — classify unknown.
    if (node.children) {
      for (const c of node.children) {
        const mp = resolveFor(c);
        const ins = String(mp.inset || '').trim();
        const absCover = mp.pos === 'absolute' && /^(0|0px|0%)(\s+(0|0px|0%)){0,3}$/.test(ins);
        const media = ['IMG', 'VIDEO', 'CANVAS', 'PICTURE'].includes(c.tagName);
        const mediaFill = media
          && /^(100%|100px)$/.test(String(mp.w || '')) && /^(100%|100px)$/.test(String(mp.h || ''));
        if (!(absCover || mediaFill)) continue;
        // a media element IS an image backdrop even without its own paint rules
        if (mp.img || mp.bgc || mp.bgi || media) return { imageBacked: true, cands: [] };
      }
    }
    // gather this layer's colours
    const layerCols = [];
    if (p.bgc && p.bgc.a > 0) layerCols.push(p.bgc);
    if (p.bgi) {
      const stops = gradientStops(p.bgi, vars).filter(c => c.a > .05);
      const opaque = stops.filter(c => c.a >= 1);
      const base = opaque.length ? opaque[opaque.length - 1] : { r: 255, g: 255, b: 255, a: 1 };
      for (const c of stops) layerCols.push(c.a >= 1 ? c : over(c, base));
    }
    const opaqueCols = layerCols.filter(c => c.a >= 1);
    const transCols = layerCols.filter(c => c.a < 1);
    if (opaqueCols.length) {
      // composite every translucent layer above onto each opaque region
      const flat = [];
      for (const base of opaqueCols) {
        let acc = base;
        for (let i = pending.length - 1; i >= 0; i--) acc = over(pending[i], acc);
        for (const t of transCols) flat.push(over(t, acc));
        flat.push(acc);
      }
      return { imageBacked: false, cands: flat };
    }
    for (const t of transCols) pending.push(t);
    node = node.parentElement;
  }
  let acc = { r: 255, g: 255, b: 255, a: 1 };
  for (let i = pending.length - 1; i >= 0; i--) acc = over(pending[i], acc);
  return { imageBacked: false, cands: [acc] };
}

/* ── 4. route list ────────────────────────────────────────────────────── */
const PAGES = [
  ['#/', 'home'], ['#/shop', 'shop'], ['#/product/ring-classic-01', 'product'],
  ['#/compare', 'compare'], ['#/cart', 'cart'], ['#/checkout', 'checkout'],
  ['#/order/nope', 'order(empty)'], ['#/account', 'account'], ['#/wishlist', 'wishlist'],
  ['#/giftlist', 'giftlist'], ['#/sizer', 'sizer'], ['#/care', 'care'], ['#/quote', 'quote'],
  ['#/rates', 'rates'], ['#/catalogues', 'catalogues'], ['#/b2b', 'b2b'], ['#/services', 'services'],
  ['#/about', 'about'], ['#/contact', 'contact'], ['#/invoice/nope', 'invoice(empty)'],
  ['#/certificates', 'certificates'], ['#/certificate/nope', 'certificate(empty)'],
  ['#/p/ring-classic-01', 'p(slug)'], ['#/buyback', 'buyback'], ['#/savings', 'savings'],
  ['#/metal', 'metal'], ['#/deadstock', 'deadstock'], ['#/track', 'track'], ['#/faq', 'faq'],
  ['#/scheme', 'scheme'], ['#/finale', 'finale'], ['#/gold-biscuit', 'gold-biscuit'],
  ['#/login', 'login'], ['#/privacy', 'privacy'], ['#/terms', 'terms'], ['#/refund', 'refund'],
  ['#/shipping', 'shipping'], ['#/bundle', 'bundle'], ['#/giftcard', 'giftcard'], ['#/refer', 'refer'],
  ['#/videoconsult', 'videoconsult'], ['#/pickup', 'pickup'], ['#/black-card', 'black-card'],
  ['#/black-card/delivery', 'black-card/delivery'], ['#/amrita', 'amrita'],
];

/* ── 5. audit every page ──────────────────────────────────────────────── */
const rules = loadRules();
const ruleIndex = buildIndex(rules);
console.log(`CSS rules parsed: ${rules.length} from ${cssFiles().length} files`);
console.log(`viewport: ${MOBILE ? '390×780 (phone)' : '1280×900 (desktop)'}\n`);

const findings = [];
for (const [hash, name] of PAGES) {
  let window, doc;
  try {
    ({ window, doc } = await boot(hash, { mobile: MOBILE }));
  } catch (e) { console.log(`SKIP ${name}: boot failed (${e.message})`); continue; }
  await wait(350);

  const mediaTest = q => { try { return window.matchMedia(q).matches; } catch (e) { return false; } };
  const cache = new Map();
  // custom properties drive every var() resolution — collect :root/html/body
  // declarations directly from the source of truth (not via matches(':root'))
  const vars = {};
  for (const r of rules) {
    if (r.media && !mediaTest(r.media)) continue;
    if (/(^|[,\s])(:root|html|body)\s*$/.test(r.sel.replace(/\s+/g, ' '))) {
      for (const [k, v] of Object.entries(declsOf(r.body))) if (k.startsWith('--')) vars[k] = v;
    }
  }
  for (const el of [doc.documentElement, doc.body]) {
    if (!el) continue;
    for (const m of matchedDecls(el, rules, ruleIndex, mediaTest, cache)) {
      for (const [k, v] of Object.entries(m.decls)) if (k.startsWith('--')) vars[k] = v;
    }
  }
  const resolveFor = el => paintOf(el, matchedDecls(el, rules, ruleIndex, mediaTest, cache), vars);

  const out = [];
  const walk = el => {
    for (const node of el.childNodes) {
      if (node.nodeType === 3 && node.textContent.trim().length > 1) {
        const cs = window.getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') continue;
        let op = 1, anc = el;
        while (anc && anc.nodeType === 1) { op *= resolveFor(anc).opacity; anc = anc.parentElement; }
        if (op < 0.15) continue;
        const fsPx = parseFloat(cs.fontSize) || 16;
        const fw = parseInt(cs.fontWeight) || 400;
        const large = fsPx >= 24 || (fsPx >= 18.66 && fw >= 700);
        const { fill, clip: ownOrInheritedClip } = effectiveTextColor(el, resolveFor);
        const sample = node.textContent.trim().slice(0, 60);
        const where = el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : '');
        const transparent = fill && (fill.a === 0 || fill.a < 0.2);
        if (transparent) {
          if (!ownOrInheritedClip) out.push({ kind: 'INVISIBLE', where, sample, note: 'transparent text, no gradient clipped to its glyphs' });
          continue;
        }
        const bgs = bgCandidates(el, resolveFor, vars);
        if (bgs.imageBacked) continue;   // photo-backed text (scrim unknown) — manual review
        // worst case over every background region the text may sit on
        let worst = null;
        for (const bg of bgs.cands) {
          const fg = fill.a < 1 ? over(fill, bg) : fill;
          const ratio = contrast(fg, bg);
          if (!worst || ratio < worst.ratio) worst = { ratio, fg, bg };
        }
        const need = large ? 3 : 4.5;
        if (worst.ratio < need) {
          out.push({
            kind: 'LOW', where, sample, ratio: +worst.ratio.toFixed(2), need,
            fg: `rgb(${Math.round(worst.fg.r)},${Math.round(worst.fg.g)},${Math.round(worst.fg.b)})`,
            bg: `rgb(${Math.round(worst.bg.r)},${Math.round(worst.bg.g)},${Math.round(worst.bg.b)})`,
            fs: fsPx, note: (ownOrInheritedClip ? 'gradient-text' : '') + (bgs.cands.length > 3 ? ' +multi-gradient-worst-case' : ''),
          });
        }
      } else if (node.nodeType === 1 && !['SCRIPT', 'STYLE', 'NOSCRIPT', 'SVG', 'HEAD', 'META', 'LINK'].includes(node.tagName)) walk(node);
    }
  };
  walk(doc.body);

  const seen = new Set();
  const uniq = out.filter(f => { const k = f.kind + f.where + f.sample; if (seen.has(k)) return false; seen.add(k); return true; });
  if (uniq.length) findings.push({ page: name, hash, items: uniq });
  console.log(`${name.padEnd(22)} ${uniq.length ? `${uniq.length} finding(s)` : 'clean'}`);
}

console.log('\n══════════════ REPORT ══════════════');
for (const f of findings) {
  console.log(`\n▶ ${f.page} (${f.hash})`);
  for (const it of f.items) {
    if (it.kind === 'INVISIBLE') console.log(`  ✖ INVISIBLE  ${it.where}  "${it.sample}" — ${it.note}`);
    else console.log(`  ▽ ${it.ratio} < ${it.need}  ${it.where}  "${it.sample}"  ${it.fg} on ${it.bg} @${it.fs}px${it.note ? ' — ' + it.note : ''}`);
  }
}
console.log(`\nTotal pages with findings: ${findings.length}/${PAGES.length}`);
