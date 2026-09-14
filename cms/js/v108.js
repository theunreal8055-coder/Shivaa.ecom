/* ═══════════════════════════════════════════════════════════════════════
   SHIVAA v108 · SHOPPER POLISH                                        (v108)
   Loaded last, after v107.js. Removable — delete the <link>/<script>
   tags in index.html and the shop is v107 again.

     1  WhatsApp enquire button (context-aware; the old .wa-fab is hidden)
     2  Second photo on product cards (hover desktop · flip chip on phone)
     3  Image fade-in
     4  Skip-to-jewellery already in index.html; this file keeps it wired
     5  Share on the product page
     6  Category counts on the home grid
     7  Horizontal bestsellers on the phone

   Never throw. Never invent weights/prices. Never write to db.json.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.__SHV_V108__) return;
  window.__SHV_V108__ = 1;

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));
  const SH = () => window.Shivaa || {};
  const safe = (name, fn) => { try { fn(); } catch (e) { console.warn('[v108] ' + name + ':', e && e.message); } };
  const reduced = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function wrapRoute(name, enhance) {
    const R = SH().routes;
    if (!R || typeof R[name] !== 'function' || R[name].__v108) return;
    const orig = R[name];
    const wrapped = function (view) {
      const out = orig.apply(this, arguments);
      Promise.resolve(out).then(() => {
        const hash = location.hash || '#/';
        const on = name === 'home' ? (hash === '#/' || hash === '' || hash.indexOf('#/?') === 0)
          : (name === 'product' ? hash.indexOf('#/product/') === 0 : hash.indexOf('#/' + name) === 0);
        if (!on) return;
        try { enhance(view); } catch (e) { console.warn('[v108] ' + name + ':', e && e.message); }
      }).catch(() => {});
      return out;
    };
    wrapped.__v108 = 1;
    R[name] = wrapped;
  }

  function currentProduct() {
    const m = (location.hash || '').match(/^#\/product\/([\w-]+)/);
    if (!m) return null;
    const list = (SH().state && SH().state.productsCache) || [];
    return list.find(p => p.id === m[1]) || null;
  }
  function waHref() {
    const S = SH();
    const p = currentProduct();
    let msg = 'Namaste Shivaa ✦ I would like help choosing a piece.';
    if (p && S.waProductMsg) msg = S.waProductMsg(p, 1);
    else {
      const cat = ((location.hash || '').match(/category=([a-z]+)/) || [])[1];
      if (cat) msg = 'Namaste Shivaa ✦ I am browsing ' + cat + ' and would like a recommendation.';
    }
    if (S.waLink) return S.waLink(msg);
    return 'https://wa.me/918905005921?text=' + encodeURIComponent(msg);
  }

  function waFab() {
    if ($('#v108Wa')) { $('#v108Wa').href = waHref(); return; }
    const a = document.createElement('a');
    a.id = 'v108Wa';
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.setAttribute('aria-label', 'Chat with Shivaa on WhatsApp');
    a.innerHTML = (SH().WA_SVG || '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3.9a8.1 8.1 0 0 0-6.9 12.3L4 20.2l4.1-1.05A8.1 8.1 0 1 0 12 3.9z"/></svg>')
      + '<span class="v108-wa-tip">Chat with Shivaa</span>';
    a.href = waHref();
    document.body.appendChild(a);
  }

  function armCards(root) {
    $$('.p-card', root || document).forEach(card => {
      const wrap = card.querySelector('.pc-imgwrap');
      const b = wrap && wrap.querySelector('.pc-img-b');
      if (wrap && b && !wrap.querySelector('.v108-flip')) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'v108-flip';
        btn.setAttribute('aria-label', 'See the other photo');
        btn.textContent = '2';
        btn.addEventListener('click', e => {
          e.preventDefault(); e.stopPropagation();
          card.classList.toggle('show-b');
          btn.textContent = card.classList.contains('show-b') ? '1' : '2';
        });
        wrap.appendChild(btn);
      }
      $$('img', card).forEach(img => {
        if (img.complete) img.classList.add('v108-ready');
        else img.addEventListener('load', () => img.classList.add('v108-ready'), { once: true });
      });
    });
  }

  function pdpShare(view) {
    if (!view || $('#v108Share', view)) return;
    const wish = view.querySelector('.pd-info .pc-wish');
    if (!wish || !wish.parentElement) return;
    const p = currentProduct();
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'v108Share';
    btn.className = 'v108-share';
    btn.setAttribute('aria-label', 'Share this piece');
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="2.6"/><circle cx="6" cy="12" r="2.6"/><circle cx="18" cy="19" r="2.6"/><path d="M8.3 10.8l7.4-4.3M8.3 13.2l7.4 4.3"/></svg>';
    btn.onclick = async () => {
      const url = location.origin + '/#/product/' + (p && p.id || '');
      const data = { title: p ? p.name : 'Shivaa', text: p ? (p.name + ' · live-rate priced at Shivaa') : 'Shivaa Jewellers', url };
      if (navigator.share) {
        try { await navigator.share(data); return; } catch (e) { if (e && e.name === 'AbortError') return; }
      }
      try {
        await navigator.clipboard.writeText(url);
        if (SH().toast) SH().toast('Link copied');
      } catch (e) { if (SH().toast) SH().toast('Copy this link: ' + url); }
    };
    wish.insertAdjacentElement('afterend', btn);
  }

  function homePolish(view) {
    if (!view) return;
    const cache = (SH().state && SH().state.productsCache) || [];
    $$('.cat-mini-card', view).forEach(a => {
      if ($('.v108-n', a)) return;
      const href = a.getAttribute('href') || '';
      const cat = (href.match(/category=([a-z]+)/) || [])[1];
      if (!cat) return;
      const n = cache.filter(p => p.category === cat).length;
      if (!n) return;
      const s = document.createElement('span');
      s.className = 'v108-n';
      s.textContent = n;
      a.appendChild(s);
    });
    if (matchMedia('(max-width:680px)').matches && !reduced()) {
      const grids = $$('.p-grid', view);
      if (grids[0]) grids[0].classList.add('v108-hscroll');
      if (grids[1]) grids[1].classList.add('v108-hscroll');
    }
    armCards(view);
  }

  function init() {
    safe('wa', waFab);
    safe('cards', () => armCards(document));
    wrapRoute('home', homePolish);
    wrapRoute('shop', armCards);
    wrapRoute('wishlist', armCards);
    wrapRoute('product', pdpShare);
    window.addEventListener('hashchange', () => {
      safe('wa-href', () => { const a = $('#v108Wa'); if (a) a.href = waHref(); });
      setTimeout(() => {
        safe('cards', () => armCards(document));
        const hash = location.hash || '#/';
        if (hash === '#/' || hash === '' || hash.indexOf('#/?') === 0) safe('home', () => homePolish($('#view')));
      }, 80);
    });
    const view = $('#view') || document.body;
    new MutationObserver(() => setTimeout(() => safe('cards', () => armCards(document)), 80))
      .observe(view, { childList: true, subtree: true });
    /* boot() paints home before this file's wrapRoute is installed */
    setTimeout(() => {
      safe('home0', () => homePolish($('#view')));
      safe('wa2', waFab);
    }, 250);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
