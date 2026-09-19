#!/usr/bin/env python3
"""v156 · structural edits to cms/js/app.js (bug fixes + the 24K premium card)."""
import io, sys

P = 'cms/js/app.js'
s = io.open(P, encoding='utf-8').read()
orig = s

def rep(old, new, n=1):
    global s
    c = s.count(old)
    if c != n:
        print("MISMATCH: expected %d of %r, found %d" % (n, old[:90], c)); sys.exit(1)
    s = s.replace(old, new)

# ── release stamp ───────────────────────────────────────────────────────────
rep("const APP_REL = 155;", "const APP_REL = 156;")

# ── BUG 1 · the phantom rise: history stamps are premium-FREE, headlines are not
rep("""/* ─────────── live rates ─────────── */
let _lastRatesAt = 0;
async function loadRates() {
  try {
    const r = await api('/api/rates');
    state.rates = { ...r, ...(r.shivaa || r.jaipur || {}) };  // storefront prices = Shivaa's own retail rates
    _lastRatesAt = Date.now();
    renderTicker(); renderRateStrip(); document.dispatchEvent(new CustomEvent('rates'));
  } catch (e) {}
}""",
"""/* ─────────── live rates ─────────── */
let _lastRatesAt = 0;
/* ═══ v156 · BUG FIX — THE PHANTOM RISE ═══════════════════════════════════
   Every headline this shop prints is the RETAIL rate: the market anchor plus
   Shivaa's own premium (22K +₹398/g · 24K +₹398/g · 18K +₹299/g · silver
   +₹3/g). The `history` stamps the server persists — and therefore publishes —
   are the RAW anchor with no premium in them, and must stay that way: the B2B
   desk's day low/high bands are computed from those raw stamps.
   The ticker, the home rate strip, the rates-page chart and the rate lab all
   compared the two bases at once, so on a live shop:
     • every cell carried a permanent phantom RISE — a flat market read
       "▲ 398 ₹/g vs prev" forever, and a FALLING market still read green,
       because a real ±₹40 move can never outweigh a ₹398 basis gap;
     • the 12-hour chart ended exactly ₹398 below the card printed above it,
       and the rate lab's "then vs now" was inflated by the same gap.
   No test ever caught it because every smoke fixture built its `history` out
   of the premium-INCLUSIVE block — a fixture that repeats the production
   payload's shape would have. v156-rates.js is that fixture.
   Fix: lift the published series onto the retail basis ONCE, here, using the
   premium block /api/rates already publishes. The raw stamps stay readable as
   `historySpot`. When a payload publishes no premiums (an older cached
   response) or the owner has PINNED an override (those rates are absolute, so
   no premium is inside them) the series passes through untouched — the shape
   of the curve never changes, only its basis. B2B never reads this. */
function ratePremiums(r) {
  const p = (r && r.premium) || null;
  if (!p || p.pinned) return null;
  const num = (v, fb) => (typeof v === 'number' && isFinite(v)) ? v : fb;
  const g24 = num(p.gold24, num(p.gold, 0));
  if (!g24 && !num(p.gold22, 0) && !num(p.silver, 0)) return null;   // nothing published to lift by
  return { gold24: g24, gold22: num(p.gold22, g24), gold18: num(p.gold18, Math.round(g24 * 0.75)), silver: num(p.silver, 0) };
}
function retailHistory(hist, prem) {
  if (!Array.isArray(hist)) return [];
  if (!prem) return hist;
  return hist.map(h => (h && typeof h === 'object') ? {
    ...h,
    gold24: Number(h.gold24 || 0) + prem.gold24,
    gold22: Number(h.gold22 || 0) + prem.gold22,
    gold18: Number(h.gold18 || 0) + prem.gold18,
    silver: Math.round((Number(h.silver || 0) + prem.silver) * 10) / 10,
  } : h);
}
async function loadRates() {
  try {
    const r = await api('/api/rates');
    const merged = { ...r, ...(r.shivaa || r.jaipur || {}) };   // storefront prices = Shivaa's own retail rates
    merged.historySpot = Array.isArray(r.history) ? r.history : [];   // raw anchor stamps, as published
    merged.history = retailHistory(merged.historySpot, ratePremiums(r));
    state.rates = merged;
    _lastRatesAt = Date.now();
    renderTicker(); renderRateStrip(); document.dispatchEvent(new CustomEvent('rates'));
  } catch (e) {}
}
/* v156 — the premium block read ONE way, shared by the rates-page render and
   by the in-place poll patch (they each carried their own fallback chain, so a
   payload without `premium.gold22` could print two different numbers). */
function ratePrem(R) {
  const p = (R && R.premium) || {};
  const num = (v, fb) => (typeof v === 'number' && isFinite(v)) ? v : fb;
  const g24 = num(p.gold24, num(p.gold, 398));
  return { g22: num(p.gold22, g24), g24: g24, g18: num(p.gold18, Math.round(g24 * 0.75)),
           sil: num(p.silver, 3), pinned: !!p.pinned };
}
/* an admin-pinned override is an absolute counter rate: no premium sits inside
   it, and saying "+₹398/g" next to it would be a lie. */
const premTxt = (v, pinned) => pinned ? 'pinned · none added' : '+₹' + v + '/g';""")

# ── BUG 4 · the 12-hour chart: one point (or a NaN stamp) used to draw nothing
rep("""function drawRateChart(cv, hist) {
  if (!cv || !hist.length) return;
  const x = cv.getContext('2d'); if (!x) return;   // v107 — canvas can be unavailable; chart is progressive enhancement
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const w = cv.parentElement.clientWidth - 0, h = 300;
  cv.width = w * dpr; cv.height = h * dpr; cv.style.height = h + 'px';
  x.setTransform(dpr, 0, 0, dpr, 0, 0);
  const pad = { l: 56, r: 56, t: 16, b: 26 };
  const data = hist.map(p => p.gold22);""",
"""function drawRateChart(cv, hist) {
  /* v156 — a single stamp (a fresh install, or a history reset) used to run
     every X through `i / (data.length - 1)` = 0/0 = NaN, and one non-numeric
     stamp poisoned min/max for the whole curve: the canvas silently drew
     nothing under a heading that promised 12 hours. Two usable points are now
     the floor, and a bad stamp is dropped instead of flattening the chart. */
  if (!cv || !Array.isArray(hist)) return;
  const data = hist.map(p => Number(p && p.gold22)).filter(v => isFinite(v) && v > 0);
  if (data.length < 2) return;
  const x = cv.getContext('2d'); if (!x) return;   // v107 — canvas can be unavailable; chart is progressive enhancement
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const w = cv.parentElement.clientWidth - 0, h = 300;
  cv.width = w * dpr; cv.height = h * dpr; cv.style.height = h + 'px';
  x.setTransform(dpr, 0, 0, dpr, 0, 0);
  const pad = { l: 56, r: 56, t: 16, b: 26 };""")
rep("""  const X = i => pad.l + i / (data.length - 1) * (w - pad.l - pad.r);
  const Y = v => pad.t + (1 - (v - min) / (max - min)) * (h - pad.t - pad.b);""",
"""  const X = i => pad.l + i / Math.max(1, data.length - 1) * (w - pad.l - pad.r);
  const Y = v => pad.t + (1 - (v - min) / ((max - min) || 1)) * (h - pad.t - pad.b);""")

# ── the rate card: 24K premium becomes a published, visible line ─────────────
rep("""  /* v119 — the card is built from the SAME anchor the shop prices from:
     22K rate = round(anchorLevel.goldPerG × 0.9167) + premium.gold22 (₹398/g,
     desk physical). premium.gold stays the 24K line for older payloads. */
  const prem22 = R.premium ? (R.premium.gold22 !== undefined ? R.premium.gold22 : R.premium.gold) : 398;
  const anchorTxt = ratesAnchorTxt(R);""",
"""  /* v119 — the card is built from the SAME anchor the shop prices from:
     22K rate = round(anchorLevel.goldPerG × 0.9167) + premium.gold22 (₹398/g,
     desk physical).
     v156 — the owner's order: the 24K line now carries the SAME premium, so
     the card publishes both and every karat tile shows the premium inside its
     own price. premium.gold stays the 24K key for older payloads. */
  const PM = ratePrem(R);
  const SPOT = R.spot || {};
  const anchorTxt = ratesAnchorTxt(R);""")

rep("""        <div class="jh-row"><span>International spot (22K)</span><b data-rr="spot22">${fmt(R.spot.gold22)}/g</b></div>
        <div class="jh-row"><span>22K Shivaa premium <small style="color:var(--ink-3)">desk physical</small></span><b data-rr="prem22">+₹${prem22}/g</b></div>
        <div class="jh-row"><span>Rate anchor</span><b data-rr="anchor">${anchorTxt}</b></div>""",
"""        <div class="jh-row"><span>International spot (22K)</span><b data-rr="spot22">${fmt(SPOT.gold22 || 0)}/g</b></div>
        <div class="jh-row"><span>22K Shivaa premium <small style="color:var(--ink-3)">desk physical</small></span><b data-rr="prem22">${premTxt(PM.g22, PM.pinned)}</b></div>
        <div class="jh-row"><span>24K Shivaa premium <small style="color:var(--ink-3)">same as 22K</small></span><b data-rr="prem24">${premTxt(PM.g24, PM.pinned)}</b></div>
        <div class="jh-row"><span>Rate anchor</span><b data-rr="anchor">${anchorTxt}</b></div>""")

rep("""      ${[['GOLD 24K · SHIVAA', 'gold24', '99.99% fine — reference'], ['GOLD 22K · SHIVAA', 'gold22', '91.67% — jewellery grade'], ['GOLD 18K · SHIVAA', 'gold18', '75.0% — contemporary'], ['SILVER 925 · SHIVAA', 'silver', 'sterling — jewellery grade']]
        .map(c => `<div class="rate-card ${c[0].includes('GOLD') ? 'gold' : ''}"><div class="rc-name">${c[0]}</div><div class="rc-val" data-rr="rc-${c[1]}">${c[1] === 'silver' ? fmt2(R[c[1]]) : fmt(R[c[1]])}</div><small>per gram · ${c[2]}</small><div style="margin-top:10px;font-size:12px;color:var(--ink-3)">per 10 g: <b data-rr="rc10-${c[1]}">${c[1] === 'silver' ? fmt2(R[c[1]] * 10) : fmt(R[c[1]] * 10)}</b></div></div>`).join('')}""",
"""      ${[['GOLD 24K · SHIVAA', 'gold24', '99.99% fine — reference'], ['GOLD 22K · SHIVAA', 'gold22', '91.67% — jewellery grade'], ['GOLD 18K · SHIVAA', 'gold18', '75.0% — contemporary'], ['SILVER 925 · SHIVAA', 'silver', 'sterling — jewellery grade']]
        .map(c => {
          /* v156 — each tile now states the Shivaa premium sitting inside its
             price, so a customer comparing this card with an exchange feed can
             see exactly what the shop adds and why. */
          const pv = c[1] === 'gold24' ? PM.g24 : c[1] === 'gold22' ? PM.g22 : c[1] === 'gold18' ? PM.g18 : PM.sil;
          return `<div class="rate-card ${c[0].includes('GOLD') ? 'gold' : ''}"><div class="rc-name">${c[0]}</div><div class="rc-val" data-rr="rc-${c[1]}">${c[1] === 'silver' ? fmt2(R[c[1]]) : fmt(R[c[1]])}</div><small>per gram · ${c[2]}</small><div style="margin-top:10px;font-size:12px;color:var(--ink-3)">per 10 g: <b data-rr="rc10-${c[1]}">${c[1] === 'silver' ? fmt2(R[c[1]] * 10) : fmt(R[c[1]] * 10)}</b></div><div style="margin-top:6px;font-size:11.5px;color:var(--ink-3)" data-rr="premc-${c[1]}">${PM.pinned ? 'admin-pinned counter rate' : 'incl. ' + (c[1] === 'silver' ? fmt2(pv) : '₹' + pv) + '/g Shivaa premium'}</div></div>`;
        }).join('')}""")

# ── the in-place poll patch must carry the new lines too ─────────────────────
rep("""    const prem22 = R.premium ? (R.premium.gold22 !== undefined ? R.premium.gold22 : R.premium.gold) : 398;
    setHTML('g22', fmt(R.gold22) + '<small>/gram</small>');
    setHTML('g22sub', '₹' + Math.round(R.gold22 * 10).toLocaleString('en-IN') + ' per 10 g · updated ' + timeFmt(R.t));
    set('spot22', fmt(R.spot.gold22) + '/g');
    set('prem22', '+₹' + prem22 + '/g');
    set('anchor', ratesAnchorTxt(R));""",
"""    const PM = ratePrem(R);
    setHTML('g22', fmt(R.gold22) + '<small>/gram</small>');
    setHTML('g22sub', '₹' + Math.round(R.gold22 * 10).toLocaleString('en-IN') + ' per 10 g · updated ' + timeFmt(R.t));
    set('spot22', fmt((R.spot || {}).gold22 || 0) + '/g');
    set('prem22', premTxt(PM.g22, PM.pinned));
    set('prem24', premTxt(PM.g24, PM.pinned));          // v156 — the 24K line
    set('anchor', ratesAnchorTxt(R));
    [['gold24', PM.g24], ['gold22', PM.g22], ['gold18', PM.g18], ['silver', PM.sil]].forEach(([k, v]) =>
      set('premc-' + k, PM.pinned ? 'admin-pinned counter rate' : 'incl. ' + (k === 'silver' ? fmt2(v) : '₹' + v) + '/g Shivaa premium'));""")

# ── catalogue copy: the live database still says "the live Jaipur bullion rate"
rep("""function price(p, R) {""",
"""/* v156 — brand filter for CATALOGUE COPY. The 77 live product descriptions
   were written when the shop priced off "the live Jaipur bullion rate"; the
   shop's own name is Shivaa and that is what a customer must read on the
   product page. Deliberately narrow: only the RATE phrase is rewritten — never
   a product name, a city, a review, a spec or anything else. The repo master
   db.json is corrected too, but the LIVE database belongs to the server (a
   deploy zip never overwrites data/), which is exactly why the filter lives at
   render time: every device reads Shivaa the moment this file ships, with no
   data migration and no admin click. */
const brandRate = s => String(s == null ? '' : s)
  .replace(/Jaipur(\\s*[-–—]\\s*|\\s+)(bullion\\s+)?rate/gi, (m, gap, bullion) => 'Shivaa' + (gap || ' ') + (bullion || '') + 'rate');

function price(p, R) {""")

rep("""<p style="color:var(--ink-2);margin:12px 0 8px">${esc(spot.desc.split('.')[0])}.</p>""",
    """<p style="color:var(--ink-2);margin:12px 0 8px">${esc(brandRate(spot.desc).split('.')[0])}.</p>""")
rep("""<div class="acc-body">${esc(p.desc)}${""",
    """<div class="acc-body">${esc(brandRate(p.desc))}${""")

io.open(P, 'w', encoding='utf-8').write(s)
print("app.js: %d -> %d bytes" % (len(orig), len(s)))
