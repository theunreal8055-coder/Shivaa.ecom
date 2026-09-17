/* ═══════════════════════════════════════════════════════════
   SHIVAA v45-MEGA — boost.js (2030 enhancement engine)
   Loaded AFTER app.js. Idempotent, degrades gracefully.

   01 page-hero banners on every page   02 light/noir/gold themes
   03 ShivAI concierge (product-aware)  04 voice search
   05 try-on mirror page                06 3D ring showcase
   07 live market-pulse chart           08 recently viewed + recommendations
   09 gallery lightbox w/ wheel zoom    10 cross-tab cart sync
   11 flash sale · gold band · films · lookbook · features · CTA · insta
   12 confetti · tilt · reveals · sparkles · back-to-top · page transitions
   13 PWA registration
   ═══════════════════════════════════════════════════════════ */
'use strict';
(function () {
  if (window.__SHIVAA_BOOST__) return; window.__SHIVAA_BOOST__ = true;

  const S = () => (window.Shivaa && window.Shivaa.state) || {};
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const onHome = () => !location.hash || location.hash === '#' || /^#\/?$/.test(location.hash);
  const pageName = () => (document.body.dataset.page || '');
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  let BOOST = null;
  fetch('/js/boost-data.json').then(r => r.ok ? r.json() : null).then(d => {
    BOOST = d || null;
    if (!onHome()) ensurePageHero();   // add video layer once the manifest lands
  }).catch(() => {});

  const CINEMA = {
    pageVideos: { rates: 'gold-flow', metal: 'gold-flow', about: 'heritage', services: 'heritage',
      hallmark: 'heritage', trust: 'heritage', savings: 'bridal-lux', catalogues: 'bridal-lux',
      b2b: 'b2b-dark', partner: 'b2b-dark', buyback: 'b2b-dark', contact: 'b2b-dark',
      deadstock: 'b2b-dark', track: 'b2b-dark' },
    carousel: { 's-left': 'heritage', 's-center': 'bridal-lux', 's-right': 'rings-worn', 's-band': 'gold-flow' },
  };

  const RING_SHOTS = [
    '/images/designs/rings/PGS5001_shot_studio.jpg',
    '/images/designs/rings/PGS5002_shot_editorial.jpg',
    '/images/designs/rings/PGS5003_shot_studio.jpg',
    '/images/designs/rings/PGS5004_shot_worn.jpg',
    '/images/designs/rings/PGS5005_shot_editorial.jpg',
    '/images/designs/rings/PGS5006_shot_studio.jpg',
  ];
  const POSTERS = {
    'rings-studio': '/images/designs/rings/PGS5001_shot_studio.jpg',
    'rings-worn': '/images/designs/rings/PGS5002_shot_worn.jpg',
    'rings-editorial': '/images/designs/rings/PGS5003_shot_editorial.jpg',
    bridal: '/images/banners/poster-bridal.jpg',
  };
  const FILM_DEFAULT = [
    ['rings-studio', 'The Ring Atelier — Studio', 'real pieces · studio light'],
    ['rings-worn', 'Worn on You', 'real hands · real shine'],
    ['rings-editorial', 'The Editorial Film', 'the catalogue look'],
    ['bridal', 'The Bridal Film', 'trousseau in motion'],
  ];
  const LOOK_DEFAULT = [
    ['/images/designs/rings/PGS5001_shot_editorial.jpg', 'Rings', 'The PGS Edit'],
    ['/images/designs/rings/PGS5002_shot_worn.jpg', 'Rings', 'Worn Today'],
    ['/images/banners/poster-bridal.jpg', 'Bridal', 'The Complete Trousseau'],
    ['/images/designs/rings/PGS5003_shot_studio.jpg', 'Rings', 'Studio Light'],
    ['/images/banners/poster-heritage.jpg', 'Karigari', 'Hands of the House'],
    ['/images/designs/rings/PGS5004_shot_gift.jpg', 'Rings', 'Gift Ready'],
    ['/images/banners/gen-hero-2030.jpg', '2026 Edit', 'Modern Classic'],
    ['/images/designs/rings/PGS5005_shot_editorial.jpg', 'Rings', 'Editorial'],
    ['/images/banners/poster-heritage.jpg', 'Heritage', 'Since the Family'],
    ['/images/banners/wedding.jpg', 'Wedding 2026', 'Book the Bridal Desk'],
  ];

  const FEATURES = [
    ['📈', 'Live Rates', 'Jaipur gold & silver feed — updated automatically.', '#/rates'],
    ['💍', '17 Categories', 'Rings, rani haar, jhumkas, payals — live-rate priced.', '#/shop'],
    ['🪞', 'Try-On Mirror', 'See pieces on you with your camera, live.', '#/tryon'],
    ['🤖', 'ShivAI Concierge', 'Ask prices, find pieces, get answers — instantly.', '#chat'],
    ['🎙️', 'Voice Search', 'Speak a design and find it across the house.', '#voice'],
    ['⚖️', 'Gold Buyback', 'Sell old gold at 100% value — zero deduction.', '#/buyback'],
    ['🏦', 'Swarna Nidhi', 'Pay 11 monthly instalments, own 12.', '#/savings'],
    ['✨', 'Bespoke Studio', 'Custom orders, engraving, polish & exchange.', '#/services'],
    ['📖', 'Design Catalogues', '24 digital catalogues — select & settle.', '#/catalogues'],
    ['🛡️', 'Why Trust Shivaa', 'CIN, UDYAM, address — in the open.', '#/trust'],
    ['✅', 'HUID Check', 'Verify any BIS-hallmarked piece in BIS Care.', '#/hallmark'],
    ['🤝', 'B2B Portal', 'GST billing, bullion desk, Friday settlements.', '#/partner'],
  ];

  /* ═══════════ 01 PAGE-HERO BANNERS ═══════════ */
  const PAGE_HERO = {
    rates: ['/images/banners/gen-page-rates.jpg', 'Jaipur Market Feed', 'Live Rates', '24K · 22K · 18K gold and silver — refreshed automatically, every hour.'],
    buyback: ['/images/banners/gen-page-buyback.jpg', '100% Value · Zero Deduction', 'Gold Buyback', 'Old gold weighed in front of you, valued at today\u2019s live rate.'],
    savings: ['/images/banners/gen-page-savings.jpg', 'Pay Eleven · Own Twelve', 'Swarna Nidhi', 'Save monthly at that day\u2019s live gold rate — the 12th instalment is on us.'],
    services: ['/images/banners/gen-page-services.jpg', 'Bespoke & Care', 'Services', 'Custom orders, engraving, polishing, exchange — by the same karigars.'],
    catalogues: ['/images/banners/gen-page-catalogues.jpg', 'Design Selection', 'Digital Catalogues', 'Browse 24 catalogues, pick designs, settle in fine metal.'],
    b2b: ['/images/banners/gen-page-b2b.jpg', 'For Jewellers', 'B2B Partner Portal', 'GST billing, live bullion desk, weekly stock & Friday settlements.'],
    partner: ['/images/banners/gen-page-b2b.jpg', 'For Jewellers', 'B2B Partner Portal', 'GST billing, live bullion desk, weekly stock & Friday settlements.'],
    about: ['/images/banners/gen-page-about.jpg', 'Jayal · Nagaur · Since 2025', 'The House of Shivaa', 'Thirty years of family karigari, now one honest click away.'],
    contact: ['/images/banners/gen-page-contact.jpg', 'Visit Us', 'Contact & Store', 'Main Road, Sadar Bazar, Jayal — or ring us on +91 89050 05921.'],
    hallmark: ['/images/banners/gen-page-hallmark.jpg', 'BIS Care · Check a Piece', 'HUID Guide', 'How to verify any BIS-hallmarked piece with its HUID.'],
    trust: ['/images/banners/gen-page-about.jpg', 'In the Open', 'Why Trust Shivaa', 'CIN, UDYAM, address and business profile — nothing hidden.'],
    metal: ['/images/banners/gen-page-rates.jpg', 'Bullion Desk', 'Metal & Bullion', 'RTGS-rate gold & silver stock for jewellers and investors.'],
    deadstock: ['/images/banners/gen-page-b2b.jpg', 'Insider Deals', 'Dead Stock', 'Curated slow-moving pieces at cleared prices — quality intact.'],
    track: ['/images/banners/gen-page-contact.jpg', 'Every Order, Visible', 'Track Order', 'Insured, tamper-sealed delivery with live milestones.'],
  };
  const NO_HERO = new Set(['home', 'cart', 'checkout', 'account', 'admin', 'product', 'order', 'wishlist', 'compare', 'tryon', 'shop']);

  function pageHeroHTML(cfg) {
    return `<div class="boost-pghero" data-boost="pghero">
      <div class="ph-bg" style="background-image:url('${cfg[0]}')"></div>
      <div class="ph-veil"></div><div class="ph-shine"></div>
      <svg class="ph-orn" viewBox="0 0 200 200" aria-hidden="true"><g fill="none" stroke="#d4af5a" stroke-width="1.2" opacity=".8"><circle cx="100" cy="100" r="88"/><circle cx="100" cy="100" r="66"/><circle cx="100" cy="100" r="44"/><circle cx="100" cy="100" r="22" fill="rgba(212,175,90,.12)"/><g stroke-dasharray="3 5">${Array.from({ length: 12 }, (_, i) => { const a = i * 30 * Math.PI / 180; return `<path d="M${100 + Math.cos(a) * 90} ${100 + Math.sin(a) * 90} L${100 + Math.cos(a) * 78} ${100 + Math.sin(a) * 78}"/>`; }).join('')}</g><g fill="#d4af5a">${Array.from({ length: 8 }, (_, i) => { const a = i * 45 * Math.PI / 180; return `<circle cx="${100 + Math.cos(a) * 66}" cy="${100 + Math.sin(a) * 66}" r="3"/>`; }).join('')}</g></g></svg>
      <div class="container ph-in">
        <span class="ph-crumb">✦ ${esc(cfg[1])} ✦</span>
        <h1>${esc(cfg[2])}</h1>
        <p class="ph-sub">${esc(cfg[3])}</p>
      </div>
    </div>`;
  }
  function ensurePageHero() {
    const page = pageName();
    if (!PAGE_HERO[page] || NO_HERO.has(page)) return;
    const view = $('#view');
    if (!view || view.querySelector('[data-boost="pghero"]') || !view.firstElementChild) return;
    view.insertAdjacentHTML('afterbegin', pageHeroHTML(PAGE_HERO[page]));
    // ── cinematic video background (text floats on the film) ──
    const pv = (BOOST && BOOST.pageVideos) || CINEMA.pageVideos;
    if (!pv[page]) return;
    const ph = view.querySelector('[data-boost="pghero"]');
    if (!ph) return;
    /* v128 · the page film mounts COLD: the governor (js/v128.js) builds the
       <video> only once real frames are decoded, so the static hero image
       holds (no dark buffering gap) and no film bytes flow at page load.
       Without the governor (partial extract / exotic browser) the old eager
       behaviour returns unchanged — this layer degrades, never breaks. */
    if (window.ShivaaV128 && ShivaaV128.pghero) {
      try { ShivaaV128.pghero(ph, pv[page]); } catch (e) {}
      return;
    }
    const v = document.createElement('video');
    v.className = 'ph-vid';
    v.src = '/images/films/' + pv[page] + '.mp4';
    v.muted = true; v.loop = true; v.playsInline = true; v.autoplay = true;
    v.setAttribute('aria-hidden', 'true');
    v.onerror = () => { v.remove(); const bg = ph && ph.querySelector('.ph-bg'); if (bg) bg.style.opacity = ''; };
    ph.insertBefore(v, ph.firstChild);
  }

  /* ═══════════ 02 THEMES ═══════════ */
  const THEMES = ['light', 'noir', 'gold'];
  const THEME_GLYPH = { light: '☀', noir: '☾', gold: '✦' };
  function applyTheme(t) {
    document.documentElement.dataset.theme = t === 'light' ? '' : t;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = t === 'noir' ? '#12100c' : (t === 'gold' ? '#f8efdb' : '#1d0509');
    const app = window.Shivaa;
    if (app && app.store) app.store.set('shv_theme', t);
    const btn = $('#boostTheme');
    if (btn) { btn.textContent = THEME_GLYPH[t]; btn.title = 'Theme: ' + t + ' — tap to switch'; }
  }
  function initTheme() {
    if ($('#boostTheme')) return;
    const saved = (window.Shivaa && window.Shivaa.store && window.Shivaa.store.get('shv_theme', 'light')) || 'light';
    applyTheme(saved);
    const btn = document.createElement('button');
    btn.id = 'boostTheme'; btn.className = 'boost-theme'; btn.setAttribute('aria-label', 'Switch theme');
    btn.onclick = () => { const cur = document.documentElement.dataset.theme || 'light'; applyTheme(THEMES[(THEMES.indexOf(cur) + 1) % THEMES.length]); };
    document.body.appendChild(btn);
  }

  /* ═══════════ 03 SHIVAI CONCIERGE ═══════════ */
  const CHIPS = ['Show rings', 'Live rates', 'HUID help', 'Delivery info', 'Talk to human'];
  let chatOpen = false;
  const conv = [];
  function chatEnsure() {
    if ($('#boostChat')) return;
    const d = document.createElement('div');
    d.innerHTML = `
      <button class="boost-chat-fab" id="boostChatFab" aria-label="Open ShivAI concierge">
        <span class="cf-orb">✦</span><span>ShivAI Concierge</span>
      </button>
      <div class="boost-chat" id="boostChat" role="dialog" aria-label="ShivAI concierge">
        <div class="bc-head"><img src="/images/logo.png" alt=""><div><b>ShivAI Concierge</b><small>answers in seconds · live rates aware</small></div>
        <button class="bc-x" id="bcX" aria-label="Close">✕</button></div>
        <div class="bc-body" id="bcBody"></div>
        <div class="bc-chips" id="bcChips">${CHIPS.map(c => `<button data-chip="${esc(c)}">${esc(c)}</button>`).join('')}</div>
        <form class="bc-form" id="bcForm"><input id="bcInput" placeholder="Ask about prices, designs, HUID…" autocomplete="off"><button aria-label="Send">➤</button></form>
      </div>`;
    document.body.appendChild(d);
    const fab = $('#boostChatFab'), box = $('#boostChat');
    const setOpen = o => { chatOpen = o; box.classList.toggle('open', o); };
    fab.onclick = () => setOpen(!chatOpen);
    $('#bcX').onclick = () => setOpen(false);
    $('#bcChips').onclick = e => { const b = e.target.closest('button'); if (b) { sendMsg(b.dataset.chip); } };
    $('#bcForm').onsubmit = e => { e.preventDefault(); const v = $('#bcInput').value.trim(); if (v) { sendMsg(v); $('#bcInput').value = ''; } };
    botSay('Namaste ✦ I\u2019m ShivAI — your jewellery concierge. Ask me for live prices, designs, HUID help, delivery or anything else.');
  }
  function bubble(text, who) {
    const body = $('#bcBody');
    if (!body) return;
    const m = document.createElement('div');
    m.className = 'msg ' + who;
    m.innerHTML = text;
    body.appendChild(m); body.scrollTop = body.scrollHeight;
  }
  async function products() {
    const st = S();
    if (st.productsCache && st.productsCache.length) return st.productsCache;
    try { const r = await window.Shivaa.api('/api/products'); return (r && r.products) || []; } catch (e) { return []; }
  }
  function findIn(prods, word) {
    const w = String(word).toLowerCase();
    return prods.find(p => (p.name + ' ' + (p.sku || '') + ' ' + p.category).toLowerCase().includes(w));
  }
  function miniCards(list) {
    return list.map(p => {
      const pr = window.Shivaa.price ? window.Shivaa.price(p) : null;
      return `<div class="m-card"><img src="${p.images && p.images[0] ? p.images[0] : '/images/logo.png'}" alt="">
        <div><b>${esc(p.name)}</b><small>${pr ? '₹' + window.Shivaa.fmt(pr.total) : 'live-rate priced'} · <a href="#/product/${p.id}">view →</a></small></div></div>`;
    }).join('');
  }
  async function brain(raw) {
    const t = raw.toLowerCase().trim();
    const prods = await products();
    const cat = k => prods.filter(p => p.category === k).slice(0, 3);
    const st = S();
    const R = st.rates || null;
    if (/^(hi|hii|hey|hello|namaste|namaskar|good (morning|afternoon|evening|night))/.test(t))
      return { text: 'Namaste ✦ Great to see you at the house. I can show you designs, quote live prices, explain HUID checks and delivery — what would you like?' };
    if (/rate|price|bhav|gold price|silver price|aaj ka/.test(t)) {
      if (!R) return { text: 'Rates are loading — one moment, or open the <a href="#/rates">Live Rates page</a>.' };
      const rows = [['24K Gold', R.gold24], ['22K Gold', R.gold22], ['18K Gold', R.gold18], ['Silver (g)', R.silver]]
        .map(([k, v]) => `• ${k}: ₹${typeof v === 'number' ? window.Shivaa.fmt ? window.Shivaa.fmt(v) : v : v}`).join('\n');
      return { text: 'Today\u2019s Jaipur live rates (incl. premium):\n' + rows + '\n\nEvery piece on the site is billed at these rates. <a href="#/rates">Open the full rate card →</a>' };
    }
    if (/huid|hallmark|bis|916/.test(t))
      return { text: 'HUID is the 6-character code on every BIS-hallmarked piece. Steps: 1) find the HUID stamped on the jewellery, 2) open the BIS Care app, 3) verify — it shows the jeweller and purity. Our full guide lives at <a href="#/hallmark">#/hallmark</a>.' };
    if (/deliver|shipping|ship|pincode|courier/.test(t)) {
      const free = st.settings && st.settings.freeShipAbove;
      return { text: `Every order ships insured and tamper-sealed across India${free ? ', free above ₹' + Number(free).toLocaleString('en-IN') : ''}. Tracking appears in <a href="#/account?tab=orders">My Orders</a> the moment it ships.` };
    }
    if (/return|exchange|refund/.test(t))
      return { text: '7-day no-questions returns on ready stock, and lifetime exchange at the live rate. Making charges on exchanged pieces stay with you. <a href="#/services">Services →</a>' };
    if (/savings|swarna|nidhi|installment|emi|scheme/.test(t))
      return { text: 'Swarna Nidhi: pay 11 monthly instalments at that day\u2019s live gold rate and the 12th is ours — a 9.09% benefit in pure gold. <a href="#/savings">Start the plan →</a>' };
    if (/buyback|sell|purana|old gold|bech/.test(t))
      return { text: 'Gold Buyback gives 100% of the live rate with zero deduction — the weight is verified in front of you. <a href="#/buyback">Sell gold →</a>' };
    if (/b2b|wholesale|jeweller|partner|gst|bulk|bullion/.test(t))
      return { text: 'For jewellers: GST billing, live bullion desk, weekly stock reports and Friday settlements — trusted by 300+ partners. <a href="#/partner">B2B portal →</a>' };
    if (/custom|bespoke|engrav|made to order/.test(t))
      return { text: 'Bespoke Studio: share a photo or idea on WhatsApp and our karigars design it — with engraving and lifetime polish. <a href="#/services">Bespoke →</a>' };
    if (/human|call|phone|contact|whatsapp|support|agent/.test(t)) {
      const ph = (st.settings && st.settings.phone) || '+91 89050 05921';
      const wa = (st.settings && st.settings.whatsapp) || '918905005921';
      return { text: `A human is one tap away — call ${ph} or <a href="https://wa.me/${wa}" target="_blank" rel="noopener">chat on WhatsApp</a>. We\u2019re at Sadar Bazar, Jayal, Nagaur.` };
    }
    if (/thank|dhanyavad|shukriya/.test(t)) return { text: 'Always a pleasure ✦ May the metal be kind to you today.' };
    if (/bye|goodbye|see you/.test(t)) return { text: 'Alvida ✦ The house is open anytime — I\u2019ll be right here.' };
    if (/try ?on|mirror|camera/.test(t)) return { text: 'You can try pieces on camera — open the <a href="#/tryon">Try-On Mirror</a> and let your camera do the fitting.' };
    // design intent
    const cats = [['rings', /ring|ring\.|rings/], ['necklaces', /necklace|haar|rani/], ['earrings', /earring|jhumka|chandbali/], ['bangles', /bangle|kada/], ['chains', /chain/], ['pendants', /pendant|om|locket/], ['mangalsutra', /mangalsutra/], ['silver', /silver|payal|anklet/], ['nosepins', /nosepin|nath/]];
    for (const [k, re] of cats) {
      if (re.test(t)) {
        const list = cat(k);
        if (list.length) return { text: 'Here are pieces from the house in that direction — tap any to open it:\n' + miniCards(list), cards: true };
      }
    }
    if (prods.length) {
      const word = t.split(/\s+/).find(w => w.length > 3 && findIn(prods, w));
      if (word) { const p = findIn(prods, word); if (p) return { text: 'I found this piece:\n' + miniCards([p]), cards: true }; }
    }
    return { text: 'I\u2019m still learning the deepest shelves ✦ Try “show rings”, “live rates”, “HUID help”, “delivery info”, or ask about a design by name.' };
  }
  function botSay(text) { bubble(text, 'bot'); }
  function typing(on) {
    const body = $('#bcBody');
    if (!body) return;
    let el = body.querySelector('.typing');
    if (on && !el) { el = document.createElement('div'); el.className = 'msg bot typing'; el.innerHTML = '<i></i><i></i><i></i>'; body.appendChild(el); body.scrollTop = body.scrollHeight; }
    if (!on && el) el.remove();
  }
  async function sendMsg(text) {
    bubble(esc(text), 'me'); typing(true);
    const r = await brain(text);
    await new Promise(res => setTimeout(res, 400 + Math.random() * 500));
    typing(false); botSay(r.text);
  }

  /* ═══════════ 04 VOICE SEARCH ═══════════ */
  function initVoice() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR || $('#boostMic')) return;
    const mk = (target) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'boost-mic'; b.setAttribute('aria-label', 'Voice search');
      b.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>';
      b.onclick = () => {
        const rec = new SR(); rec.lang = 'en-IN'; rec.interimResults = false;
        b.classList.add('listening');
        rec.onresult = e => {
          const text = e.results[0][0].transcript;
          if (target.value !== undefined) target.value = text;
          location.hash = '#/shop?q=' + encodeURIComponent(text);
          const dr = $('#searchDrawer'); if (dr) dr.classList.remove('open');
        };
        rec.onend = () => b.classList.remove('listening');
        rec.onerror = () => { b.classList.remove('listening'); (window.Shivaa.toast || (() => {}))('Voice search needs a mic + Chrome/Safari', 'err'); };
        try { rec.start(); } catch (err) {}
      };
      if (target.parentNode) target.parentNode.insertBefore(b, target);
      return b;
    };
    const hi = $('#hdrSearchInput'); if (hi) mk(hi);
    const si = $('#searchInput'); if (si) mk(si);
    const dr = $('#searchDrawer'); if (dr && si) dr.classList.add('has-mic');
  }

  /* ═══════════ 05 TRY-ON MIRROR ═══════════ */
  function tryonPage(view, q) {
    const ring = q.get('ring') || RING_SHOTS[0];
    view.innerHTML = `
    <section class="sec container boost-tryon">
      <div class="sec-head" style="text-align:left"><span class="label">2030 fitting room</span><h2>The <span class="disp-italic">mirror</span></h2><p class="sub" style="margin:10px 0 0">Allow camera access, pick a piece and drag it onto your hand. Nothing is uploaded — it all stays on your device.</p></div>
      <div class="to-stage">
        <div class="to-cam" id="toCam">
          <video id="toVideo" autoplay playsinline muted></video>
          <img class="to-ov" id="toOv" src="${ring}" alt="Try-on ring" draggable="false">
          <span class="to-hint">drag the piece · buttons to resize & rotate</span>
          <button class="to-shot" id="toShot">📸 Snapshot</button>
          <div class="to-no-cam" id="toNoCam" hidden>
            <img src="/images/banners/gen-hero-2030.jpg" alt="">
            <p>Camera unavailable in this browser.<br>You can still browse the full collection in the <a href="#/shop" style="color:var(--gold-2);text-decoration:underline">shop</a>.</p>
          </div>
        </div>
        <div class="to-side">
          <div><span class="label">Choose a piece</span></div>
          <div class="to-picks" id="toPicks">${RING_SHOTS.map((s, i) => `<button class="${s === ring ? 'on' : ''}" data-src="${s}"><img src="${s}" alt=""></button>`).join('')}</div>
          <div><span class="label">Adjust</span></div>
          <div class="to-ctl">
            <button id="toMinus">− smaller</button><button id="toPlus">+ bigger</button>
            <button id="toRot">⟳ rotate</button><button id="toReset">reset</button>
          </div>
          <p class="to-note">✦ Tip: natural light works best. The overlay is a preview — final piece details, weight and price are on each product page.</p>
          <a class="btn btn-gold btn-lg" href="#/shop?category=rings">Shop the real pieces →</a>
        </div>
      </div>
    </section>`;
    let scale = 1, rot = 0;
    const ov = $('#toOv'), cam = $('#toCam');
    if (ov) {
      const apply = () => ov.style.transform = `translate(-50%,-50%) scale(${scale}) rotate(${rot}deg)`;
      const set = (k) => { if (k === 'scale') scale = Math.min(3, Math.max(.4, scale)); apply(); };
      const setr = () => apply();
      let dragging = false, sx = 0, sy = 0;
      ov.addEventListener('pointerdown', e => { dragging = true; sx = e.clientX - ov.offsetLeft; sy = e.clientY - ov.offsetTop; ov.setPointerCapture(e.pointerId); });
      ov.addEventListener('pointermove', e => { if (!dragging) return; ov.style.left = (e.clientX - sx) + 'px'; ov.style.top = (e.clientY - sy) + 'px'; ov.style.transform = `scale(${scale}) rotate(${rot}deg)`; });
      ov.addEventListener('pointerup', () => dragging = false);
      $('#toPicks').onclick = e => { const b = e.target.closest('button'); if (!b) return; ov.src = b.dataset.src; $$('#toPicks button').forEach(x => x.classList.toggle('on', x === b)); };
      $('#toPlus').onclick = () => { scale *= 1.15; set('scale'); };
      $('#toMinus').onclick = () => { scale /= 1.15; set('scale'); };
      $('#toRot').onclick = () => { rot = (rot + 22.5) % 360; setr(); };
      $('#toReset').onclick = () => { scale = 1; rot = 0; ov.style.left = '50%'; ov.style.top = '58%'; apply(); };
      $('#toShot').onclick = () => {
        const v = $('#toVideo'); if (!v || !v.videoWidth) return;
        const c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight;
        const ctx = c.getContext('2d');
        ctx.translate(c.width, 0); ctx.scale(-1, 1);
        ctx.drawImage(v, 0, 0, c.width, c.height);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        const r = cam.getBoundingClientRect();
        const kx = c.width / r.width, ky = c.height / r.height;
        const ox = (ov.offsetLeft + ov.offsetWidth / 2) * kx, oy = (ov.offsetTop + ov.offsetHeight / 2) * ky;
        const w = ov.offsetWidth * kx * scale;
        ctx.save(); ctx.translate(ox, oy); ctx.rotate(rot * Math.PI / 180);
        ctx.drawImage(ov, -w / 2, -w / 2, w, w);
        ctx.restore();
        const a = document.createElement('a'); a.download = 'shivaa-tryon.jpg'; a.href = c.toDataURL('image/jpeg', .92); a.click();
      };
    }
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 } } })
        .then(stream => { const v = $('#toVideo'); if (v) v.srcObject = stream; })
        .catch(() => { const n = $('#toNoCam'); if (n) n.hidden = false; });
    } else { const n = $('#toNoCam'); if (n) n.hidden = false; }
  }

  /* ═══════════ 06 3D RING SHOWCASE ═══════════ */
  const secShow3d = () => `<section class="sec boost-show3d" data-boost="show3d">
    <div class="container">
      <div class="sec-head" data-reveal><span class="label">Spin the vault</span><h2>The <span class="disp-italic">ring</span> carousel</h2><p class="sub">Real pieces from the PGS edit — hover to pause.</p></div>
      <div class="show3d-stage">
        <div class="ring3d">${RING_SHOTS.map((s, i) => `<a class="r3d-item" href="#/shop?category=rings" style="transform:rotateY(${i * 60}deg) translateZ(clamp(180px,30vw,250px))" aria-label="Ring design"><img src="${s}" alt="Ring ${i + 1}" loading="lazy"></a>`).join('')}</div>
      </div>
      <div class="show3d-ped"></div>
    </div>
  </section>`;

  /* ═══════════ 07 MARKET PULSE CHART ═══════════ */
  function drawPulse(cv, series, key) {
    const ctx = cv.getContext && cv.getContext('2d');
    if (!ctx) return;
    const W = cv.width = cv.clientWidth * 2, H = cv.height = cv.clientHeight * 2;
    const pts = series.filter(p => p[key] != null).slice(-90);
    if (pts.length < 2) return;
    const min = Math.min(...pts.map(p => p[key])), max = Math.max(...pts.map(p => p[key]));
    const pad = 14, w = W - pad * 2, h = H - pad * 2;
    const x = i => pad + (i / (pts.length - 1)) * w;
    const y = v => pad + h - ((v - min) / (max - min || 1)) * h;
    ctx.clearRect(0, 0, W, H);
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, 'rgba(212,175,90,.34)'); grad.addColorStop(1, 'rgba(212,175,90,0)');
    ctx.beginPath(); ctx.moveTo(x(0), y(pts[0][key]));
    pts.forEach((p, i) => ctx.lineTo(x(i), y(p[key])));
    ctx.lineTo(x(pts.length - 1), H); ctx.lineTo(x(0), H); ctx.closePath();
    ctx.fillStyle = grad; ctx.fill();
    ctx.beginPath(); ctx.moveTo(x(0), y(pts[0][key]));
    pts.forEach((p, i) => ctx.lineTo(x(i), y(p[key])));
    ctx.strokeStyle = '#e6c778'; ctx.lineWidth = 2.4; ctx.lineJoin = 'round'; ctx.stroke();
    const last = pts[pts.length - 1];
    ctx.beginPath(); ctx.arc(x(pts.length - 1), y(last[key]), 5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffe9bd'; ctx.fill();
    ctx.beginPath(); ctx.arc(x(pts.length - 1), y(last[key]), 11, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,233,189,.4)'; ctx.stroke();
  }
  function secPulse() {
    return `<section class="sec container" data-boost="pulse" style="padding-top:6px">
      <div class="boost-pulse" data-reveal>
        <div class="bp-meta"><span class="label">Market pulse</span><b id="bpVal">—</b><small>Jaipur rate · last 3 days</small>
          <div class="bp-chips" id="bpChips"><span data-k="gold24" class="on">24K</span><span data-k="gold22">22K</span><span data-k="gold18">18K</span><span data-k="silver">Silver</span></div>
        </div>
        <canvas id="bpCanvas"></canvas>
      </div>
    </section>`;
  }
  function bindPulse(root) {
    const cv = $('#bpCanvas', root); if (!cv) return;
    const st = S(); const hist = (st.rates && st.rates.history) || [];
    if (!hist.length) { const el = cv.closest('.boost-pulse'); if (el) el.style.display = 'none'; return; }
    const labels = { gold24: '24K Gold', gold22: '22K Gold', gold18: '18K Gold', silver: 'Silver' };
    let key = 'gold24';
    const render = () => {
      drawPulse(cv, hist, key);
      const last = hist[hist.length - 1];
      const v = last[key];
      const el = $('#bpVal', root);
      if (el) el.textContent = '₹' + (key === 'silver' ? Number(v).toFixed(1) : Number(v).toLocaleString('en-IN')) + ' · ' + labels[key];
    };
    $('#bpChips', root).onclick = e => { const b = e.target.closest('span'); if (!b) return; key = b.dataset.k; $$('#bpChips span', root).forEach(x => x.classList.toggle('on', x === b)); render(); };
    render();
    addEventListener('resize', render);
  }

  /* ═══════════ 08 RECENTLY VIEWED + RECOMMENDATIONS ═══════════ */
  function pushViewed(id) {
    const app = window.Shivaa; if (!app || !app.store) return;
    let list = app.store.get('shv_viewed', []).filter(x => x && x.id !== id);
    list.unshift({ id, at: Date.now() });
    app.store.set('shv_viewed', list.slice(0, 10));
  }
  async function injectRecs() {
    const page = pageName();
    const view = $('#view');
    if (page === 'product' && view) {
      const wrap = view.querySelector('.pd-layout');
      if (wrap && !view.querySelector('[data-boost="recs"]')) {
        const id = (location.hash.split('/').pop() || '').split('?')[0];
        pushViewed(id);
        const prods = await products();
        const p = prods.find(x => x.id === id);
        if (p) {
          const alike = prods.filter(x => x.category === p.category && x.id !== p.id).slice(0, 4);
          if (alike.length) {
            const sec = document.createElement('section');
            sec.className = 'sec container'; sec.dataset.boost = 'recs'; sec.style.paddingBottom = '30px';
            sec.innerHTML = `<div class="sec-head" style="text-align:left"><span class="label">Same shelf</span><h2>You may also <span class="disp-italic">love</span></h2></div>
              <div class="p-grid">${alike.map(x => window.Shivaa.productCard(x)).join('')}</div>`;
            view.appendChild(sec);
            reveal(view);
          }
        }
        const cta = view.querySelector('.pd-cta-row');
        if (cta && !view.querySelector('#boostTryonBtn')) {
          const img = p && p.images && p.images[0] ? p.images[0] : RING_SHOTS[0];
          const a = document.createElement('a');
          a.id = 'boostTryonBtn'; a.className = 'btn btn-ghost btn-sheen'; a.href = '#/tryon?ring=' + encodeURIComponent(img);
          a.innerHTML = '🪞 Try-On Mirror';
          cta.appendChild(a);
        }
      }
    }
    if (page === 'home' && view && !view.querySelector('[data-boost="viewed"]')) {
      const app = window.Shivaa;
      const list = (app.store.get('shv_viewed', []) || []).slice(0, 5);
      const prods = await products();
      const items = list.map(x => prods.find(p => p.id === x.id)).filter(Boolean);
      if (items.length >= 2) {
        const sec = document.createElement('section');
        sec.className = 'sec container boost-viewed'; sec.dataset.boost = 'viewed'; sec.style.paddingTop = '10px';
        sec.innerHTML = `<div class="sec-head" style="text-align:left"><span class="label">Picked up again</span><h2>Recently <span class="disp-italic">viewed</span></h2></div>
          <div class="viewed-row">${items.map(p => `<a class="viewed-chip" data-reveal href="#/product/${p.id}"><img src="${p.images[0]}" alt=""><div><b>${esc(p.name)}</b><small>${window.Shivaa.fmt(window.Shivaa.price(p).total)}</small></div></a>`).join('')}</div>`;
        const insta = view.querySelector('[data-boost="insta"]');
        if (insta) insta.insertAdjacentElement('afterend', sec); else view.appendChild(sec);
        reveal(view);
      }
    }
  }

  /* ═══════════ 09 GALLERY LIGHTBOX + WHEEL ZOOM ═══════════ */
  function bindLightbox(root) {
    (root || document).addEventListener('dblclick', e => {
      const img = e.target.closest('.pd-gallery img');
      if (!img) return;
      openLightbox(img.src);
    });
    (root || document).addEventListener('click', e => {
      if (e.target.closest('#boostZoom')) openLightbox($('#boostZoom').dataset.src);
    });
  }
  function openLightbox(src) {
    let el = $('#boostLb');
    if (!el) {
      el = document.createElement('div');
      el.id = 'boostLb';
      el.innerHTML = `<div class="lb-bg"></div><div class="lb-frame"><img id="lbImg" src="" alt=""><button class="lb-x" aria-label="Close">✕</button><span class="lb-hint">scroll to zoom · drag to pan · esc to close</span></div>`;
      document.body.appendChild(el);
      const img = $('#lbImg');
      let scale = 1, tx = 0, ty = 0, drag = null;
      const apply = () => img.style.transform = `translate(${tx}px,${ty}px) scale(${scale})`;
      el.querySelector('.lb-frame').addEventListener('wheel', e => {
        e.preventDefault();
        scale = Math.min(5, Math.max(1, scale - e.deltaY * 0.0018)); apply();
      }, { passive: false });
      img.addEventListener('pointerdown', e => { drag = { x: e.clientX - tx, y: e.clientY - ty }; img.setPointerCapture(e.pointerId); });
      img.addEventListener('pointermove', e => { if (!drag) return; tx = e.clientX - drag.x; ty = e.clientY - drag.y; apply(); });
      img.addEventListener('pointerup', () => drag = null);
      el.querySelector('.lb-x').onclick = () => el.classList.remove('open');
      el.querySelector('.lb-bg').onclick = () => el.classList.remove('open');
      const reset = () => { scale = 1; tx = 0; ty = 0; apply(); };
      el.addEventListener('dblclick', reset);
      addEventListener('keydown', e => { if (e.key === 'Escape') el.classList.remove('open'); });
    }
    $('#lbImg').src = src;
    $('#lbImg').style.transform = 'none';
    el.classList.add('open');
  }

  /* ═══════════ 10 CROSS-TAB SYNC ═══════════ */
  addEventListener('storage', e => {
    if (['shv_cart', 'shv_wish', 'shv_compare', 'shv_viewed'].includes(e.key) && window.Shivaa && window.Shivaa.redraw) {
      window.Shivaa.redraw();
    }
  });

  /* ═══════════ 11 HOME SECTIONS ═══════════ */
  const secFlash = () => {
    const ends = Date.now() + 2 * 864e5 + 14 * 36e5;
    return `<section class="boost-flash" data-boost="flash">
      <div class="container boost-flash-in">
        <span class="f-label">✦ Festive Countdown ✦</span>
        <span class="f-name">Flat ₹2,400 off every bridal order</span>
        <span class="f-cd" data-ts="${ends}"><b data-h>00<span>hrs</span></b><i>:</i><b data-m>00<span>min</span></b><i>:</i><b data-s>00<span>sec</span></b></span>
        <a class="btn btn-gold btn-sm btn-sheen" href="#/shop?tag=wedding">Claim the Offer</a>
      </div>
    </section>`;
  };
  const secBand = () => `<div class="boost-band" data-boost="band" aria-hidden="true"><div class="band-track">
      <span>BIS Hallmarked <i>✦</i></span><span>Live Jaipur Rates <i>✦</i></span><span>Transparent Making Charges <i>✦</i></span><span>Insured Delivery <i>✦</i></span><span>Lifetime Exchange <i>✦</i></span><span>7-Day Easy Returns <i>✦</i></span><span>300+ Jeweller Partners <i>✦</i></span><span>Since 2025 — Jayal, Nagaur <i>✦</i></span>
      <span>BIS Hallmarked <i>✦</i></span><span>Live Jaipur Rates <i>✦</i></span><span>Transparent Making Charges <i>✦</i></span><span>Insured Delivery <i>✦</i></span><span>Lifetime Exchange <i>✦</i></span><span>7-Day Easy Returns <i>✦</i></span><span>300+ Jeweller Partners <i>✦</i></span><span>Since 2025 — Jayal, Nagaur <i>✦</i></span>
    </div></div>`;
  function filmCard(f) {
    return `<a class="film-card rv" data-reveal href="#/shop" aria-label="${esc(f[1])}">
      <video data-film="/images/films/${f[0]}.mp4" poster="${POSTERS[f[0]] || ''}" muted loop playsinline preload="none" onerror="this.remove()"></video>
      <span class="f-veil"></span><span class="f-frame"></span>
      <span class="f-ribbon">✦ FILM</span>
      <span class="f-play"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></span>
      <span class="f-meta"><b>${esc(f[1])}</b><small>${esc(f[2])}</small></span>
    </a>`;
  }
  const secFilms = () => {
    const films = (BOOST && BOOST.films && BOOST.films.length ? BOOST.films : FILM_DEFAULT);
    return `<section class="sec boost-films" data-boost="films">
      <div class="container">
        <div class="sec-head" data-reveal><span class="label">360° craft films</span><h2>The house in <span class="disp-italic">motion</span></h2><p class="sub">Real pieces, filmed in the workshop light — hover to play.</p></div>
        <div class="film-grid">${films.map(filmCard).join('')}</div>
      </div>
    </section>`;
  };
  const secLook = () => {
    const items = (BOOST && BOOST.lookbook && BOOST.lookbook.length ? BOOST.lookbook : LOOK_DEFAULT);
    return `<section class="sec container boost-look" data-boost="look">
      <div class="sec-head" data-reveal><span class="label">The lookbook</span><h2>Styled for <span class="disp-italic">you</span></h2></div>
      <div class="look-grid">${items.map((it, i) => `<a href="#/shop" class="look-item rv" data-reveal style="transition-delay:${(i % 4) * 70}ms">
        <img src="${it[0]}" alt="${esc(it[1])}" loading="lazy">
        <span class="look-tag">${esc(it[1])}</span>
        <span class="look-cap"><b>${esc(it[2])}</b><span>Explore the collection</span></span>
      </a>`).join('')}</div>
    </section>`;
  };
  const secFeatures = () => `<section class="sec container boost-features" data-boost="features">
    <div class="sec-head" data-reveal><span class="label">Everything in one house</span><h2>Every feature, <span class="disp-italic">one store</span></h2></div>
    <div class="feat-grid">${FEATURES.map((f, i) => `<a class="feat-tile rv" data-reveal style="transition-delay:${(i % 4) * 60}ms" href="${f[3]}" data-fid="${f[3].slice(1)}">
      <span class="ft-ic">${f[0]}</span><b>${f[1]}</b><p>${f[2]}</p><span class="ft-go">Open →</span>
    </a>`).join('')}</div>
  </section>`;
  const secCta = () => `<section class="sec container boost-cta" data-boost="cta">
    <div class="cta-in" data-reveal="zoom">
      <div class="cta-img"><img src="/images/banners/poster-bridal.jpg" alt="The Bridal House" loading="lazy"><video class="cta-vid" data-film="/images/films/bridal-lux.mp4" muted loop playsinline preload="none" aria-hidden="true" onerror="this.remove()"></video></div>
      <div class="cta-body">
        <span class="label">✦ The Bridal House</span>
        <h2>The complete <em style="color:var(--gold-2)">trousseau</em>, made to inherit</h2>
        <p>Polki kundan sets, rani haar, aad, rakhdi &amp; payals — weighed to the milligram, billed at the live rate, with making charges waived on full bridal sets.</p>
        <a class="btn btn-gold btn-lg btn-sheen" href="#/shop?tag=wedding">Explore Bridal →</a>
      </div>
    </div>
  </section>`;
  const secInsta = () => {
    const shots = (BOOST && BOOST.insta && BOOST.insta.length ? BOOST.insta : RING_SHOTS.slice(0, 6));
    return `<section class="sec container boost-inst" data-boost="insta" style="padding-top:0">
    <div class="sec-head" data-reveal><span class="label">@shivaa.jewels</span><h2>Fresh from the <span class="disp-italic">atelier</span></h2></div>
    <div class="inst-row">${shots.map((im, i) => `<a class="inst-cell rv" data-reveal style="transition-delay:${i * 60}ms" href="#/shop" aria-label="Shivaa gallery"><img src="${im}" alt="" loading="lazy"></a>`).join('')}</div>
  </section>`;
  };

  function enhanceHome() {
    const view = $('#view');
    if (!view || view.dataset.boost === '1') return;
    const hero = view.querySelector('.hero');
    if (!hero) return;
    if (!hero.querySelector('.boost-hero-film')) {
      const wrap = document.createElement('div');
      wrap.className = 'boost-hero-film';
      /* v128 · the hero film mounts COLD — poster up, URL parked in
         data-film, zero bytes. The governor arms it only after the page
         has settled (load + 2.2 s) and plays it at ≥ 22% visibility. */
      wrap.innerHTML = `<video data-film="/images/films/hero.mp4" poster="/images/banners/gen-hero-2030.jpg" muted loop playsinline preload="none" aria-hidden="true" onerror="this.remove()"></video><div class="film-vignette"></div>`;
      hero.prepend(wrap);
      const hv = wrap.querySelector('video');
      if (window.ShivaaV128 && hv) {
        try { ShivaaV128.film(hv, { auto: true }); } catch (e) {}
      } else if (hv) {
        hv.autoplay = true; hv.src = '/images/films/hero.mp4';   /* eager fallback — no governor present */
      }
    }

    // ── cinematic: carousel slides become live video backgrounds (text floats on film) ──
    const cMap = (BOOST && BOOST.carousel) || CINEMA.carousel;
    Object.entries(cMap).forEach(([cls, film]) => {
      const slide = view.querySelector('.c-slide.' + cls);
      if (!slide || slide.querySelector('video.c-vid')) return;
      const v = document.createElement('video');
      v.className = 'c-vid';
      /* v128 · cold: the slide's own banner image shows until the governor
         arms + plays this film (≥ 22% visible — only the on-screen slide) */
      v.setAttribute('data-film', '/images/films/' + film + '.mp4');
      v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'none';
      v.setAttribute('aria-hidden', 'true');
      v.onerror = () => v.remove();
      const fade = slide.querySelector('.c-fade');
      slide.insertBefore(v, fade || slide.firstChild);
      if (window.ShivaaV128) {
        try { ShivaaV128.film(v, { auto: true }); } catch (e) {}
      } else {
        v.autoplay = true; v.src = '/images/films/' + film + '.mp4';   /* eager fallback */
      }
    });

    // (bridal CTA film lives inside secCta itself — nothing to patch here)
    const after = (sel, html) => {
      const anchor = view.querySelector(sel);
      if (!anchor) return;
      const key = html.match(/data-boost="([^"]+)"/)?.[1];
      if (!key || view.querySelector(`[data-boost="${key}"]`)) return;
      anchor.insertAdjacentHTML('afterend', html);
    };
    after('.carousel-sec', secFlash());
    after('.rate-strip', secBand());
    after('.rate-strip', secPulse());
    after('.catbar-outer', secShow3d());
    const newArr = [...view.querySelectorAll('.sec-head h2')].find(h => /New Arrivals/i.test(h.textContent));
    if (newArr && !newArr.closest('section').nextElementSibling?.matches('[data-boost="films"]')) {
      newArr.closest('section').insertAdjacentHTML('afterend', secFilms());
    }
    const b2b = view.querySelector('a[href="#/b2b"]')?.closest('section') || view.querySelector('.banner');
    if (b2b) {
      if (!b2b.nextElementSibling?.matches('[data-boost="look"]')) b2b.insertAdjacentHTML('afterend', secLook());
      if (!b2b.nextElementSibling?.matches('[data-boost="features"]')) b2b.insertAdjacentHTML('afterend', secFeatures());
    }
    const pillars = view.querySelector('.pillars');
    if (pillars && !pillars.closest('section').nextElementSibling?.matches('[data-boost="cta"]')) pillars.closest('section').insertAdjacentHTML('afterend', secCta());
    const nl = view.querySelector('.newsletter');
    if (nl && !nl.closest('section').nextElementSibling?.matches('[data-boost="insta"]')) nl.closest('section').insertAdjacentHTML('afterend', secInsta());

    /* v128 · the bridal CTA film (cold in its template above) registers
       with the governor — the static bridal poster shows until the film
       is near enough to arm and visible enough to play. */
    if (window.ShivaaV128) {
      try { $$('video.cta-vid', view).forEach(cv => ShivaaV128.film(cv, { auto: true })); } catch (e) {}
    } else {
      $$('video.cta-vid', view).forEach(cv => { cv.autoplay = true; cv.src = cv.getAttribute('data-film') || ''; });   /* eager fallback */
    }

    tickCd(view); bindPulse(view); reveal(view); initFilmCards(view); countUp(view);
    bindLightbox(view);
    view.dataset.boost = '1';
  }

  function initFilmCards(root) {
    $$('.film-card', root).forEach(card => {
      const v = card.querySelector('video');
      if (!v || card.dataset.filmbound) return;
      card.dataset.filmbound = '1';
      /* v128 · hover-play goes through the film governor's want-door —
         a cold card arms + plays on demand instead of autoplaying. */
      card.addEventListener('mouseenter', () => {
        if (window.__shvWant) { try { window.__shvWant(v); } catch (e) {} }
        else v.play().catch(() => {});
      });
      card.addEventListener('mouseleave', () => v.pause());
    });
  }

  function tickCd(root) {
    $$('.f-cd', root).forEach(cd => {
      if (cd.dataset.bound) return; cd.dataset.bound = '1';
      const ts = Number(cd.dataset.ts), pad = n => String(Math.max(0, n)).padStart(2, '0');
      const go = () => {
        const d = Math.max(0, ts - Date.now());
        const H = Math.floor(d / 36e5), M = Math.floor(d % 36e5 / 6e4), Sec = Math.floor(d % 6e4 / 1e3);
        const h = cd.querySelector('[data-h]'), m = cd.querySelector('[data-m]'), s = cd.querySelector('[data-s]');
        if (h) h.firstChild.textContent = pad(H);
        if (m) m.firstChild.textContent = pad(M);
        if (s) s.firstChild.textContent = pad(Sec);
        if (d <= 0) cd.closest('.boost-flash')?.remove();
      };
      go(); setInterval(go, 1000);
    });
  }

  function countUp(root) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    $$('.hstat b, .ugc-score .big', root).forEach(el => {
      if (el.dataset.counted) return; el.dataset.counted = '1';
      const m = el.textContent.match(/(\d+(?:\.\d+)?)/);
      if (!m) return;
      const target = parseFloat(m[1]), dec = m[1].includes('.') ? 1 : 0;
      const t0 = performance.now(), dur = 1400;
      const step = t => {
        const k = Math.min(1, (t - t0) / dur), ease = 1 - Math.pow(1 - k, 3);
        el.textContent = el.textContent.replace(/\d+(?:\.\d+)?/, (target * ease).toFixed(dec));
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }

  /* ═══════════ 12 MOTION PRIMITIVES ═══════════ */
  const CFX = ['#b98a2f', '#d4af5a', '#6e1e2a', '#0f5b46', '#f3dfae', '#8a2b3b'];
  let lastClick = { x: innerWidth / 2, y: innerHeight / 2 };
  addEventListener('pointerdown', e => { lastClick = { x: e.clientX, y: e.clientY }; }, true);
  function confettiAt(x, y, n = 26) {
    for (let i = 0; i < n; i++) {
      const el = document.createElement('i');
      el.className = 'cfx';
      const size = 5 + Math.random() * 7;
      el.style.cssText = `left:${x + (Math.random() * 90 - 45)}px;top:${y - 20 + (Math.random() * 20 - 10)}px;width:${size}px;height:${size * (0.5 + Math.random())}px;background:${CFX[i % CFX.length]};--d:${(1.2 + Math.random() * 1.4).toFixed(2)}s;--r:${Math.floor(Math.random() * 900) - 450}deg;border-radius:${Math.random() > 0.5 ? '50%' : '2px'}`;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 2800);
    }
  }
  const patchCart = () => {
    const app = window.Shivaa;
    if (!app || !app.addToCart || app.addToCart.__boosted) return;
    const orig = app.addToCart;
    app.addToCart = function (...args) {
      const r = orig.apply(this, args);
      confettiAt(lastClick.x, lastClick.y);
      return r;
    };
    app.addToCart.__boosted = true;
  };
  if (matchMedia('(pointer:fine)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    let last = 0;
    addEventListener('pointermove', e => {
      const now = performance.now();
      if (now - last < 90) return; last = now;
      const s = document.createElement('i');
      s.className = 'spark';
      const size = 3 + Math.random() * 5;
      s.style.cssText = `left:${e.clientX}px;top:${e.clientY}px;width:${size}px;height:${size}px;background:radial-gradient(circle,#ffe9bd,transparent 70%)`;
      document.body.appendChild(s);
      setTimeout(() => s.remove(), 900);
    }, { passive: true });
  }
  const mkTop = () => {
    if (document.getElementById('boostTop')) return;
    const b = document.createElement('button');
    b.id = 'boostTop'; b.className = 'boost-top'; b.setAttribute('aria-label', 'Back to top');
    b.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 14l6-6 6 6"/></svg>';
    b.onclick = () => scrollTo({ top: 0, behavior: 'smooth' });
    document.body.appendChild(b);
    addEventListener('scroll', () => b.classList.toggle('show', scrollY > 600), { passive: true });
  };
  let rvObs = null;
  function reveal(root) {
    if (!('IntersectionObserver' in window)) return;
    if (!rvObs) rvObs = new IntersectionObserver(es => es.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add('rv-in'); rvObs.unobserve(en.target); }
    }), { threshold: 0.12 });
    (root || document).querySelectorAll('[data-reveal]:not(.rv-in)').forEach(el => rvObs.observe(el));
  }
  document.addEventListener('pointermove', e => {
    if (!e.target.closest || matchMedia('(pointer:coarse)').matches) return;
    const card = e.target.closest('.p-card');
    if (!card) return;
    const r = card.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    card.style.transform = `perspective(900px) rotateY(${px * 7}deg) rotateX(${py * -7}deg) translateY(-4px)`;
    card.classList.add('tiltable');
    card.style.boxShadow = '0 30px 60px rgba(61,14,21,.25)';
  }, { passive: true });
  document.addEventListener('pointerout', e => {
    const card = e.target.closest && e.target.closest('.p-card');
    if (card) { card.style.transform = ''; card.style.boxShadow = ''; }
  }, true);

  /* ═══════════ 13 PWA ═══════════ */
  function initPWA() {
    if (!('serviceWorker' in navigator)) return;
    if (!/^https?:$/.test(location.protocol)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }

  /* ═══════════ ROUTER-AWARE TICK ═══════════ */
  let lastPage = null;
  function tick() {
    patchCart(); mkTop(); initTheme(); chatEnsure();
    // register the try-on route FIRST — nothing may block it
    const app = window.Shivaa;
    if (app && app.routes && !app.routes.tryon) app.routes.tryon = tryonPage;
    try { initVoice(); initPWA(); } catch (e) {}
    const view = $('#view');
    if (!view) return;
    const page = pageName();
    if (page !== lastPage) {
      lastPage = page;
      view.classList.remove('pg-anim'); void view.offsetWidth; view.classList.add('pg-anim');
    }
    try {
      if (onHome()) {
        if (view.querySelector('.hero')) enhanceHome();
        else {
          const mo = new MutationObserver(() => {
            if ($('#view')?.querySelector('.hero')) { mo.disconnect(); enhanceHome(); injectRecs(); }
          });
          mo.observe(view, { childList: true, subtree: true });
          setTimeout(() => mo.disconnect(), 12000);
        }
        injectRecs();
      } else {
        view.dataset.boost = '';
        ensurePageHero();
        injectRecs();
      }
    } catch (e) { /* an enhancement must never break routing */ }
  }
  addEventListener('hashchange', () => setTimeout(tick, 70));

  const bootIv = setInterval(() => {
    if (window.Shivaa && window.Shivaa.state && $('#view')) { clearInterval(bootIv); tick(); }
  }, 250);
  setTimeout(() => clearInterval(bootIv), 20000);

  /* extra: feature-tile shortcuts (#chat / #voice) */
  document.addEventListener('click', e => {
    const tile = e.target.closest('.feat-tile');
    if (!tile) return;
    const fid = tile.dataset.fid;
    if (fid === 'chat') { e.preventDefault(); chatEnsure(); $('#boostChat').classList.add('open'); chatOpen = true; }
    if (fid === 'voice') { e.preventDefault(); const mic = document.querySelector('.boost-mic'); if (mic) mic.click(); else location.hash = '#/shop'; }
  });

  /* extra: lightbox trigger button inside gallery */
  const lbIv = setInterval(() => {
    const gal = document.querySelector('.pd-gallery');
    if (gal && window.Shivaa) {
      clearInterval(lbIv);
      if (!document.getElementById('boostZoom')) {
        const b = document.createElement('button');
        b.id = 'boostZoom'; b.type = 'button'; b.className = 'boost-zoom';
        b.setAttribute('aria-label', 'Zoom image'); b.innerHTML = '⤢';
        b.dataset.src = (gal.querySelector('.gal-slide img') || {}).src || '';
        gal.appendChild(b);
        bindLightbox();
      }
    }
  }, 500);
  setTimeout(() => clearInterval(lbIv), 30000);
})();
