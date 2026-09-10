# -*- coding: utf-8 -*-
"""v54 feature upgrades in cms/js/app.js (all additive):
   1. global UX: scroll-progress bar, back-to-top, view fade-in hook
   2. home: Trending now + Recently viewed strips
   3. product: recently-viewed recording, mobile sticky buy bar, tap-to-zoom
   4. finale: live prize-worth tracker (10 g × live 24K rate)
"""
p = 'cms/js/app.js'
s = open(p, encoding='utf-8').read()
o = s

def rep(old, new, label):
    global s
    c = s.count(old)
    assert c == 1, f'{label}: count={c}'
    s = s.replace(old, new, 1)
    print('ok:', label)

# ── 1) global UX module after pdQty (top-level, runs once) ──
rep("window.Shivaa.pdQty = d => { window._pd.qty = Math.max(1, Math.min(9, window._pd.qty + d)); $('#pdQtyN').textContent = window._pd.qty; };",
"""window.Shivaa.pdQty = d => { window._pd.qty = Math.max(1, Math.min(9, window._pd.qty + d)); $('#pdQtyN').textContent = window._pd.qty; };

/* ─────────── v54 GLOBAL UX: scroll progress · back-to-top · buy-bar routing ─────────── */
(function () {
  const bar = document.createElement('div'); bar.id = 'scrollProg'; bar.setAttribute('aria-hidden', 'true');
  const top = document.createElement('button'); top.id = 'backTop'; top.type = 'button';
  top.setAttribute('aria-label', 'Back to top'); top.innerHTML = '↑';
  document.body.appendChild(bar); document.body.appendChild(top);
  const onScroll = () => {
    const h = document.documentElement;
    const p = h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight);
    bar.style.transform = 'scaleX(' + Math.min(1, Math.max(0, p)) + ')';
    top.classList.toggle('show', h.scrollTop > 640);
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  top.onclick = () => scrollTo({ top: 0, behavior: 'smooth' });
  const bbRoute = () => document.body.classList.toggle('pdp-on', (location.hash || '').startsWith('#/product/'));
  addEventListener('hashchange', bbRoute); bbRoute();
})();

/* v54: recently viewed rings (local, private, never uploaded) */
window.Shivaa.recentAdd = (p) => {
  try {
    const l = JSON.parse(localStorage.getItem('sh_recent') || '[]').filter(x => x && x.id !== p.id);
    l.unshift({ id: p.id, name: p.name, img: (p.images || [])[0] || '/images/logo.png',
                price: (p.price && p.price.total) || p.price || 0, category: p.category });
    localStorage.setItem('sh_recent', JSON.stringify(l.slice(0, 8)));
  } catch (e) {}
};""", 'global UX module')

# ── 2) trending + recently-viewed renderers, defined before initCarousel ──
rep("\nfunction initCarousel() {",
"""
/* ─────────── v54 HOME STRIPS: trending + recently viewed ─────────── */
const tvCard = (x) => `<a class="tv-card" href="#/product/${esc(x.id)}">
  <div class="tv-ph"><img src="${esc(x.img || ((x.images || [])[0]) || '/images/logo.png')}" alt="" loading="lazy" onerror="this.onerror=null;this.src='/images/logo.png'"></div>
  <div class="tv-b"><b>${esc(x.name)}</b><small>${esc(x.category || '')}${x.rating ? ' · ★' + x.rating : ''}</small><span>${'₹' + Math.round(x.price || 0).toLocaleString('en-IN')}</span></div></a>`;
function tvSection(id, label, sub, items) {
  if (!items.length) return null;
  const sec = document.createElement('section');
  sec.className = 'sec container'; sec.id = id;
  sec.innerHTML = `<div class="tv-head"><div><span class="label">${label}</span><h2 class="tv-h">${sub}</h2></div></div><div class="tv-row">${items.map(tvCard).join('')}</div>`;
  return sec;
}
function renderTrending() {
  const prods = (state.productsCache || []).slice();
  if (!prods.length) return;
  const top = prods.map(x => ({ x, s: (x.rating || 0) * Math.max(1, x.reviews || 1) }))
    .sort((a, b) => b.s - a.s).slice(0, 6).map(y => y.x);
  const sec = tvSection('trendSec', 'Most loved right now', 'Trending with <span class="disp-italic">customers</span>', top);
  const nl = document.querySelector('#view .newsletter');
  if (sec && nl && nl.closest('section')) nl.closest('section').insertAdjacentElement('beforebegin', sec);
}
function renderRecentViewed() {
  let items = [];
  try { items = JSON.parse(localStorage.getItem('sh_recent') || '[]'); } catch (e) {}
  if (!items.length) return;
  const sec = tvSection('recentSec', 'Pick up where you left off', 'Recently <span class="disp-italic">viewed</span>', items.slice(0, 6));
  const anchor = document.querySelector('#trendSec') || document.querySelector('#view .newsletter');
  if (sec && anchor) (anchor.closest('section') || anchor).insertAdjacentElement('beforebegin', sec);
}

function initCarousel() {""", 'trending + recent renderers')

rep("  loadSocialProof(); // v50: real reviews or badged promises - never invented customers",
"""  loadSocialProof(); // v50: real reviews or badged promises - never invented customers
  renderTrending(); renderRecentViewed();   // v54 home strips""", 'home hook')

# ── 3) product page: record view + sticky buy bar + tap zoom ──
rep("  window._pd = { p, qty: 1 };",
"""  window._pd = { p, qty: 1 };
  /* v54: remember this piece + mobile sticky buy bar + tap-to-zoom gallery */
  window.Shivaa.recentAdd(p);
  let bb = $('#pdpBuybar');
  if (!bb) { bb = document.createElement('div'); bb.id = 'pdpBuybar'; document.body.appendChild(bb); }
  bb.innerHTML = `<span class="bb-price">${'₹' + Math.round((p.price && p.price.total) || 0).toLocaleString('en-IN')}</span>
    <button class="btn btn-outline btn-sm" id="bbAdd">🛍 Add</button>
    <button class="btn btn-primary btn-sm" id="bbBuy">Buy Now</button>`;
  $('#bbAdd', bb).onclick = () => window.Shivaa.pdAdd(p.id);
  $('#bbBuy', bb).onclick = () => window.Shivaa.pdBuy(p.id);
  $$('.gal-slide img', view).forEach(im => {
    im.style.cursor = 'zoom-in';
    im.addEventListener('click', () => { im.classList.toggle('zoomed'); im.style.cursor = im.classList.contains('zoomed') ? 'zoom-out' : 'zoom-in'; });
  });""", 'product v54 upgrades')

# ── 4) finale: live prize-worth tracker ──
rep("""            <span class="fp-chip">✦ market value at draw date · TDS ≈ 31.2% · TN &amp; WB excluded</span>""",
"""            <span class="fp-chip">✦ market value at draw date · TDS ≈ 31.2% · TN &amp; WB excluded</span>
            <span class="fp-chip" id="prizeWorth">✦ prize worth — checking the live 24K rate…</span>""", 'prize worth chip')

rep("pages.finale = async (view) => {",
"""/* v54: the 10 g prize, valued at this moment's live 24K rate — honesty by construction */
async function fillPrizeWorth() {
  const el = $('#prizeWorth'); if (!el) return;
  try {
    const r = await api('/api/rates');
    if (r && r.gold24) el.innerHTML = '✦ worth <b>₹' + Math.round(10 * r.gold24).toLocaleString('en-IN') + '</b> at today\\u2019s 24K rate';
    else el.innerHTML = '✦ valued at the live 24K rate on draw night';
  } catch (e) { el.innerHTML = '✦ valued at the live 24K rate on draw night'; }
}
pages.finale = async (view) => {""", 'fillPrizeWorth fn')

rep("  const cd = $('#finaleCd');\n  if (cd) bindFinaleCd(cd);",
    "  const cd = $('#finaleCd');\n  if (cd) bindFinaleCd(cd);\n  fillPrizeWorth();   // v54 live prize value", 'finale hook')

open(p, 'w', encoding='utf-8').write(s)
print('app.js v54 patched:', s != o)
