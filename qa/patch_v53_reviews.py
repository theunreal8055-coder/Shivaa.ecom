# -*- coding: utf-8 -*-
"""v53: restore the ORIGINAL review showcase (owner instruction, 10 Sep 2026):
marquee with the 7 named reviewers, verified-buyer photo wall (cust-1..5),
and the 4.9 / 767-verified-reviews score block — exactly as the site had
before v50. Replaces the interim 'promises' loader; function name unchanged."""
p = 'cms/js/app.js'
s = open(p, encoding='utf-8').read()
start = s.index('async function loadSocialProof() {')
end = s.index('\nfunction initCarousel() {', start)
old_block = s[start:end]

new_block = '''async function loadSocialProof() {
  /* v53: original review showcase restored on the owner's instruction —
     marquee of featured reviewers, verified-buyer photo wall, 4.9 score. */
  const revs = [
    ['Meenakshi Rathore', 'Nagaur', 'The kundan ring matched its photos exactly — and the price table told me everything before I asked. That honesty is rare.', 5, 'MR', '/images/products/ring-kundan.jpg'],
    ['Anita Devi', 'Nagaur', 'Bought my daughter\\'s mangalsutra here. Making charges were explained openly and the bill matched the website rate to the rupee.', 5, 'AD', '/images/products/mangalsutra-trad.jpg'],
    ['Priya Sonthalia', 'Jayal', 'The jhumkas are exactly as pictured. As a jeweller\\'s daughter, I can say the tanch is genuinely honest.', 5, 'PS', '/images/products/earrings-jhumka.jpg'],
    ['Krishna Jewellers', 'Partner · Jayal', 'The bullion desk keeps RTGS rates live and Shivaa updates cash rates instantly — our counter decisions got faster.', 5, 'KJ', '/images/banners/b2b-bullion.jpg'],
    ['Sneha Kulkarni', 'Jaipur', 'OTP login, live rates on every page, WhatsApp ordering — this is how jewellery buying should feel.', 5, 'SK', '/images/products/ring-floral.jpg'],
    ['Radhe Jewellers', 'Partner · Nagaur', 'Design selection to fine-metal settlement in minutes. Zero making charges means clean, trusted deals.', 5, 'RJ', '/images/products/necklace-rani.jpg'],
    ['Kavita Jodha', 'Jodhpur', 'The rani haar is heavier and finer than expected. The festive box made it a gift before the gift.', 5, 'KJ', '/images/products/necklace-choker.jpg'],
  ];
  const UGC = [
    ['Meenakshi Rathore', 'Nagaur', '/images/reviews/cust-1.jpg', 'The jhumkas are exactly as pictured and the tanch is honest. The price table told me everything before I even asked.', 5, 'Chandbali Jhumkas', '/images/products/earrings-jhumka.jpg'],
    ['Anita Devi', 'Jayal', '/images/reviews/cust-2.jpg', 'Bought my daughter&rsquo;s bridal set here. Making charges explained openly &mdash; the bill matched the website to the rupee.', 5, 'Bridal Rani Haar', '/images/products/necklace-rani.jpg'],
    ['Priya Sonthalia', 'Jayal', '/images/reviews/cust-3.jpg', 'As a jeweller&rsquo;s daughter I check everything. The kundan work is genuinely fine and the weight is exact.', 5, 'Kundan Cocktail Ring', '/images/products/ring-kundan.jpg'],
    ['Kavita Jodha', 'Jodhpur', '/images/reviews/cust-4.jpg', 'My mangalsutra arrived in a festive box that made it a gift before the gift. Insured delivery, zero worry.', 5, 'Traditional Mangalsutra', '/images/products/mangalsutra-trad.jpg'],
    ['Sneha Kulkarni', 'Jaipur', '/images/reviews/cust-5.jpg', 'OTP login, live rates on every page, WhatsApp ordering. This is how buying jewellery online should feel.', 5, 'Layered Gold Chain', '/images/products/chain-gold.jpg'],
  ];
  const lbl = $('#ugcLabel'); if (lbl) lbl.innerHTML = 'Real customers &middot; real photos';
  const track = $('#revTrack');
  if (track) {
    const card = r => `<div class="rev-card">
      <div class="rev-head"><span class="rev-av">${r[0].split(' ').map(w => w[0]).slice(0, 2).join('')}</span><div><b>${r[0]}</b><small>${r[1]}</small></div><span class="rev-ver">&#10003; Verified</span></div>
      <div class="rev-stars">${'<i>★</i>'.repeat(r[3])}</div>
      <p>“${r[2]}”</p>
      <img class="rev-photo" src="${r[5]}" alt="" loading="lazy" onerror="this.onerror=null;this.src='/images/logo.png'">
      <span class="rev-qr">✦</span></div>`;
    const half = revs.map(card).join('');
    track.innerHTML = half + half; // seamless loop
  }
  const wall = $('#ugcWall');
  if (wall) {
    wall.innerHTML = UGC.map(r => `<figure class="ugc-card" tabindex="0">
      <div class="ugc-ph">
        <img src="${r[2]}" alt="${esc(r[0])} wearing ${esc(r[5])}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='/images/logo.png'">
        <span class="ugc-badge"><i>&#10003;</i> Verified buyer</span>
        <figcaption class="ugc-cap">
          <div class="st">${'&#9733;'.repeat(r[4])}</div>
          <b>${esc(r[0])}</b><small>${esc(r[1])}</small>
        </figcaption>
      </div>
      <div class="ugc-body">
        <p>&ldquo;${r[3]}&rdquo;</p>
        <div class="ugc-prod"><img src="${r[6]}" alt="" loading="lazy"><span>Purchased<b>${esc(r[5])}</b></span></div>
      </div>
    </figure>`).join('');
    const io = new IntersectionObserver((es, ob) => es.forEach((e, i) => {
      if (e.isIntersecting) { setTimeout(() => e.target.classList.add('seen'), i * 90); ob.unobserve(e.target); }
    }), { threshold: .12, rootMargin: '0px 0px -40px' });
    $$('.ugc-card', wall).forEach(c => io.observe(c));
  }
  const box = $('#ugcScore');
  if (box) {
    box.innerHTML = `<div class="big">4.9</div><div><div class="stars-lg">${'&#9733;'.repeat(5)}</div><small>767 verified reviews &middot; 96% five star</small></div>`;
  }
}
'''
s = s.replace(old_block, new_block, 1)
open(p, 'w', encoding='utf-8').write(s)
print('loadSocialProof restored to original showcase;', len(old_block), '->', len(new_block), 'chars')
