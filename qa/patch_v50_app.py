"""One-shot v50 patch for cms/js/app.js (idempotent: skips if markers exist)."""
import sys
p = 'cms/js/app.js'
s = open(p, encoding='utf-8').read()
o = s

if 'loadSocialProof' in s:
    print('already patched'); sys.exit(0)

# A. fake static score box -> live placeholder
old = """      <div class="ugc-score">
        <div class="big">4.9</div>
        <div>
          <div class="stars-lg">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
          <small>767 verified reviews &middot; 96% five star</small>
        </div>
      </div>"""
assert s.count(old) == 1, 'score box'
s = s.replace(old, '      <div class="ugc-score" id="ugcScore"></div>', 1)

old = '<span class="label">Real customers &middot; real photos</span>'
assert s.count(old) == 1, 'ugc label'
s = s.replace(old, '<span class="label" id="ugcLabel">The Shivaa standard</span>', 1)

# B. drop the fabricated arrays; call the honest loader
i0 = s.index('  // animated reviews marquee')
i1 = s.index('  // pillar draw-in')
s = s[:i0] + '  loadSocialProof(); // v50: real reviews or badged promises - never invented customers\n\n' + s[i1:]
j0 = s.index("  const track = $('#revTrack');  if (track) {")
j1 = s.index('  initHeroStage(); initCatbar();')
s = s[:j0] + s[j1:]

# C. the honest loader
loader = r'''/* v50 - honest social proof. Real reviews come from the store database.
   While the catalogue is fresh (no reviews yet) the marquee and wall show
   brand PROMISES badged as promises. Invented customers are gone for good. */
async function loadSocialProof() {
  const P = (id) => (state.productsCache || []).find(x => x.id === id) || null;
  const promises = [
    ['Shivaa', 'BIS hallmark', 'Every piece is hallmarked - check any HUID in BIS Care before you buy.', 5, '/images/products/ring-kundan.jpg'],
    ['Shivaa', 'Live pricing', 'The rate on every page is the live Jaipur bullion rate; the bill matches the site to the rupee.', 5, '/images/products/mangalsutra-trad.jpg'],
    ['Shivaa', 'Insured delivery', 'Tamper-sealed, fully insured shipping anywhere in India, with 7-day easy returns.', 5, '/images/products/earrings-jhumka.jpg'],
    ['Shivaa', 'Honest tanq', 'Weight, making charges and stone value shown before you ask. Lifetime exchange at the live rate.', 5, '/images/products/necklace-rani.jpg'],
    ['Shivaa', 'Human on WhatsApp', 'OTP login and live rates online, and a real person on WhatsApp when you want one.', 5, '/images/products/chain-gold.jpg'],
  ];
  let items = promises.map(x => ({ name: x[0], city: x[1], text: x[2], rating: x[3], img: x[4], prod: null, promise: true }));
  let real = [];
  try {
    const rr = await api('/api/reviews');
    real = (rr.reviews || []).slice(0, 8).map(r => ({
      name: r.userName, city: 'Customer review', text: r.text, rating: r.rating | 0,
      img: ((P(r.productId) || {}).images || [])[0] || '/images/logo.png',
      prod: (P(r.productId) || {}).name || 'Shivaa piece', promise: false }));
  } catch (e) {}
  if (real.length) items = real;
  const lbl = $('#ugcLabel'); if (lbl) lbl.innerHTML = real.length ? 'Real customers &middot; real reviews' : 'The Shivaa standard &middot; our promises to you';
  const track = $('#revTrack');
  if (track) {
    const card = r => `<div class="rev-card">
      <div class="rev-head"><span class="rev-av">${(esc(r.name).split(' ').map(w => w[0]).slice(0, 2).join('')) || '✦'}</span><div><b>${esc(r.name)}</b><small>${esc(r.city)}</small></div><span class="rev-ver">${r.promise ? '✦ Promise' : '✓ Review'}</span></div>
      <div class="rev-stars">${'<i>★</i>'.repeat(Math.max(1, Math.min(5, r.rating)))}</div>
      <p>“${esc(r.text)}”</p>
      <img class="rev-photo" src="${r.img}" alt="" loading="lazy" onerror="this.onerror=null;this.src='/images/logo.png'">
      <span class="rev-qr">✦</span></div>`;
    const half = items.map(card).join('');
    track.innerHTML = half + half;
  }
  const wall = $('#ugcWall');
  if (wall) {
    wall.innerHTML = items.slice(0, 5).map(r => `<figure class="ugc-card" tabindex="0">
      <div class="ugc-ph">
        <img src="${r.img}" alt="${esc(r.prod || 'Shivaa jewellery')}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='/images/logo.png'">
        <span class="ugc-badge"><i>${r.promise ? '✦' : '&#10003;'}</i> ${r.promise ? 'Our promise' : 'Customer review'}</span>
        <figcaption class="ugc-cap">
          <div class="st">${'&#9733;'.repeat(Math.max(1, Math.min(5, r.rating)))}</div>
          <b>${esc(r.name)}</b><small>${esc(r.city)}</small>
        </figcaption>
      </div>
      <div class="ugc-body">
        <p>&ldquo;${esc(r.text)}&rdquo;</p>
        ${r.prod ? `<div class="ugc-prod"><img src="${r.img}" alt="" loading="lazy"><span>Purchased<b>${esc(r.prod)}</b></span></div>` : ''}
      </div>
    </figure>`).join('');
    const io = new IntersectionObserver((es, ob) => es.forEach((e, i) => {
      if (e.isIntersecting) { setTimeout(() => e.target.classList.add('seen'), i * 90); ob.unobserve(e.target); }
    }), { threshold: .12, rootMargin: '0px 0px -40px' });
    $$('.ugc-card', wall).forEach(c => io.observe(c));
  }
  const box = $('#ugcScore');
  if (box) {
    const prods = state.productsCache || [];
    const total = prods.reduce((a, q) => a + (q.reviews | 0), 0);
    if (total > 0) {
      const avg = prods.reduce((a, q) => a + (q.rating || 0) * (q.reviews | 0), 0) / Math.max(1, total);
      box.innerHTML = `<div class="big">${avg.toFixed(1)}</div><div><div class="stars-lg">${'&#9733;'.repeat(Math.round(avg))}</div><small>${total} customer review${total === 1 ? '' : 's'} · live from the store</small></div>`;
    } else {
      box.innerHTML = `<div class="big">✦</div><div><div class="stars-lg">&#9733;&#9733;&#9733;&#9733;&#9733;</div><small>fresh catalogue — real reviews appear here after your first orders</small></div>`;
    }
  }
}

'''
k = s.index('function initCarousel() {')
s = s[:k] + loader + s[k:]

# D. empty-category state with Saathi CTA
old = """$('#shopGrid').innerHTML = list.length ? list.map(p => productCard(p, { wishSet })).join('') : `<div class="empty" style="grid-column:1/-1"><img src="/images/logo.png" class="empty-logo" alt=""><h3>No pieces match</h3><p>Try widening the filters.</p></div>`;"""
new = """{
      let emptyHtml = `<div class="empty" style="grid-column:1/-1"><img src="/images/logo.png" class="empty-logo" alt=""><h3>No pieces match</h3><p>Try widening the filters.</p></div>`;
      if (!list.length && f.cats.length === 1 && !(state.productsCache || []).some(p => p.category === f.cats[0])) {
        emptyHtml = `<div class="empty" style="grid-column:1/-1"><img src="/images/logo.png" class="empty-logo" alt=""><h3>This category is being catalogued</h3><p>4,00,000+ designs are on their way to Shivaa. Meanwhile ask <b>Saathi ✦</b> — the store assistant — to choose for you, or browse the signature rings.</p><div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:14px"><button class="btn btn-gold" onclick="Shivaa.saathiOpen('suggest a piece for me')">✦ Ask Saathi to choose for me</button><a class="btn btn-outline" href="#/shop?category=rings">See the 65 signature rings</a></div></div>`;
      }
      $('#shopGrid').innerHTML = list.length ? list.map(p => productCard(p, { wishSet })).join('') : emptyHtml;
    }"""
assert s.count(old) == 1, 'shop empty state'
s = s.replace(old, new, 1)

# E. card image fallback
old = '<img src="${p.images[0]}" alt="${esc(p.name)}" loading="lazy">'
new = '<img src="${(p.images && p.images[0]) || \'/images/logo.png\'}" alt="${esc(p.name)}" loading="lazy" onerror="this.onerror=null;this.src=\'/images/logo.png\'">'
assert s.count(old) == 1, 'card img'
s = s.replace(old, new, 1)

open(p, 'w', encoding='utf-8').write(s)
print('app.js v50 patched:', len(s) - len(o), 'bytes delta')
