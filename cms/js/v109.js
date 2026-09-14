/* ═══════════════════════════════════════════════════════════════════════
   SHIVAA v109 · 100-FEATURE PACK                                    (v109)
   ONE drop-in file. Does NOT edit app.js / db.json / v107 / v108.
   Enable:  <script src="/js/v109.js?v=109" defer></script>  (after v108)
   Remove that tag and the shop is v108 again.

   No invented weights, prices, view-counts, or queue numbers.
   Anything that needs the server opens WhatsApp instead of faking it.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.__SHV_V109__) return;
  window.__SHV_V109__ = 1;

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));
  const SH = () => window.Shivaa || {};
  const safe = (n, fn) => { try { fn(); } catch (e) { console.warn('[v109] ' + n + ':', e && e.message); } };
  const LS = 'shv109';
  const WA_NO = '918905005921';
  const reduced = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function load() { try { return JSON.parse(localStorage.getItem(LS) || '{}'); } catch (e) { return {}; } }
  function save(p) { try { localStorage.setItem(LS, JSON.stringify(p)); } catch (e) {} }
  function prefs() { return Object.assign({ hi: 0, lg: 0, hc: 0, quiet: 0, family: [], bridal: {}, later: [], views: {}, sizes: [], recentQ: [], filters: {}, watch: 0, wedding: '', bday: '', anni: '', people: [] }, load()); }
  function put(k, v) { const p = prefs(); p[k] = v; save(p); applyPrefs(); }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function products() { return (SH().state && SH().state.productsCache) || []; }
  function byId(id) { return products().find(p => p.id === id) || null; }
  function price(p) { try { return SH().price ? SH().price(p) : { total: 0, metalValue: 0, makingCharge: 0, ratePerGram: 0 }; } catch (e) { return { total: 0, metalValue: 0, makingCharge: 0, ratePerGram: 0 }; } }
  function fmt(n) { try { return SH().fmt ? SH().fmt(n) : ('₹' + Math.round(+n || 0).toLocaleString('en-IN')); } catch (e) { return '₹' + Math.round(+n || 0); } }
  function card(p) { try { return SH().productCard ? SH().productCard(p, { wishSet: [] }) : ''; } catch (e) { return ''; } }
  function wa(text) {
    const S = SH();
    if (S.waLink) return S.waLink(text);
    return 'https://wa.me/' + WA_NO + '?text=' + encodeURIComponent(String(text).slice(0, 1800));
  }
  function toast(m) { if (SH().toast) SH().toast(m); }
  function rates() { return (SH().state && SH().state.rates) || {}; }
  function quietNow() {
    if (!prefs().quiet) return false;
    try {
      const h = +new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', hour12: false }).format(new Date());
      return h >= 21 || h < 9;
    } catch (e) { const h = new Date().getHours(); return h >= 21 || h < 9; }
  }

  /* ── 100 features (hub source of truth) ─────────────────────────────── */
  const CATALOG = [
    { n: 1, g: 'Find', t: 'Voice search (Hindi + English)', go: '#voice' },
    { n: 2, g: 'Find', t: 'WhatsApp a photo to match a piece', go: 'wa:Namaste Shivaa ✦ I am sending a photo — please match the nearest design in your catalogue.' },
    { n: 3, g: 'Find', t: 'Shop by weight', go: '#/shop?v109=weight' },
    { n: 4, g: 'Find', t: 'Shop by live budget', go: '#/shop?v109=budget' },
    { n: 5, g: 'Find', t: 'Shop by occasion', go: '#/shop?v109=occasion' },
    { n: 6, g: 'Find', t: 'Who is it for', go: '#/shop?v109=who' },
    { n: 7, g: 'Find', t: 'Saved filter presets', go: '#/shop?v109=presets' },
    { n: 8, g: 'Find', t: 'Recently searched', go: '#recent' },
    { n: 9, g: 'Find', t: 'New this season', go: '#/shop?v109=new' },
    { n: 10, g: 'Find', t: 'Few left with the karigar', go: '#/shop?v109=low' },
    { n: 11, g: 'Find', t: 'Similar pieces on the product page', go: 'pdp' },
    { n: 12, g: 'Find', t: 'Complete the set', go: 'pdp' },
    { n: 13, g: 'Piece', t: 'Spin through photos (360 from existing shots)', go: 'pdp' },
    { n: 14, g: 'Piece', t: 'Tap-to-zoom lightbox', go: 'pdp' },
    { n: 15, g: 'Piece', t: 'Hallmark close-up hint', go: 'pdp' },
    { n: 16, g: 'Piece', t: 'Karigar / making-time note', go: 'pdp' },
    { n: 17, g: 'Piece', t: 'Net vs gross weight', go: 'pdp' },
    { n: 18, g: 'Piece', t: 'Stone note when listed', go: 'pdp' },
    { n: 19, g: 'Piece', t: 'Size from your saved ring size', go: 'pdp' },
    { n: 20, g: 'Piece', t: 'Sits-with-mangalsutra hint', go: 'pdp' },
    { n: 21, g: 'Piece', t: 'Price if gold moves ±₹50/g', go: 'pdp' },
    { n: 22, g: 'Piece', t: 'Printable product sheet', go: 'pdp' },
    { n: 23, g: 'Piece', t: 'WhatsApp this size + engraving', go: 'pdp' },
    { n: 24, g: 'Piece', t: 'Ask a karigar', go: 'pdp' },
    { n: 25, g: 'Piece', t: 'Low-stock line (only when stock is low)', go: 'pdp' },
    { n: 26, g: 'Piece', t: 'Notify me — WhatsApp the shop', go: 'pdp' },
    { n: 27, g: 'Piece', t: 'Your view count (only yours, never faked)', go: 'pdp' },
    { n: 28, g: 'Piece', t: 'Care icons', go: 'pdp' },
    { n: 29, g: 'Bag', t: 'Save for later', go: '#/later' },
    { n: 30, g: 'Bag', t: 'Wishlist → bag with size', go: '#/wishlist' },
    { n: 31, g: 'Bag', t: 'Gift wrap + card note', go: '#/checkout' },
    { n: 32, g: 'Bag', t: '50/50 split via WhatsApp', go: 'wa:Namaste Shivaa ✦ I would like to pay 50% now and 50% before dispatch.' },
    { n: 33, g: 'Bag', t: 'Pay at the Jayal store', go: 'wa:Namaste Shivaa ✦ I will pay at Shop No. 01, Sadar Bazaar, Jayal. Please keep the piece aside.' },
    { n: 34, g: 'Bag', t: 'EMI schedule to print', go: '#/emi-sheet' },
    { n: 35, g: 'Bag', t: 'Clearer coupon failure line', go: '#/checkout' },
    { n: 36, g: 'Bag', t: 'Honest coupon hint (never silent-apply)', go: '#/checkout' },
    { n: 37, g: 'Bag', t: 'Insurance reminder on pincode', go: '#/checkout' },
    { n: 38, g: 'Bag', t: 'Guest order via WhatsApp', go: '#/checkout' },
    { n: 39, g: 'Bag', t: 'Saved addresses (hostel / kothi)', go: '#/family' },
    { n: 40, g: 'Bag', t: '30-minute rate-lock reminder', go: '#/checkout' },
    { n: 41, g: 'Bag', t: 'Partial COD via WhatsApp', go: 'wa:Namaste Shivaa ✦ I would like to pay making charges online and metal on delivery.' },
    { n: 42, g: 'Bag', t: 'Hindi labels on the invoice page', go: '#/invoice' },
    { n: 43, g: 'Gold', t: 'Rate watch (on this phone)', go: '#/rate-lab' },
    { n: 44, g: 'Gold', t: '22K sparkline from stored history', go: '#/rate-lab' },
    { n: 45, g: 'Gold', t: '10 g then vs now (from our history)', go: '#/rate-lab' },
    { n: 46, g: 'Gold', t: 'Making-charge explainer', go: '#/making' },
    { n: 47, g: 'Gold', t: 'HUID guide with SKU prefills', go: '#/hallmark' },
    { n: 48, g: 'Gold', t: 'Melt vs making pie', go: 'pdp' },
    { n: 49, g: 'Gold', t: 'Silver 925 rail', go: '#/shop?category=silver' },
    { n: 50, g: 'Gold', t: 'Old-gold exchange estimator', go: '#/old-gold' },
    { n: 51, g: 'Gold', t: 'Buyback preview on the product page', go: 'pdp' },
    { n: 52, g: 'Gold', t: 'What the hallmark looks like', go: '#/why-rate' },
    { n: 53, g: 'Gold', t: 'Copy GSTIN / CIN / UDYAM', go: '#/trust' },
    { n: 54, g: 'Gold', t: 'Why live-rate, not MRP', go: '#/why-rate' },
    { n: 55, g: 'Occasion', t: 'Bridal checklist', go: '#/bridal' },
    { n: 56, g: 'Occasion', t: 'Couple ring sizes', go: '#/family' },
    { n: 57, g: 'Occasion', t: 'Gift finder', go: '#/gift-finder' },
    { n: 58, g: 'Occasion', t: 'E-gift via WhatsApp (photo of the piece)', go: 'pdp' },
    { n: 59, g: 'Occasion', t: 'Wedding-date countdown', go: '#/bridal' },
    { n: 60, g: 'Occasion', t: 'Festive calendar 2026', go: '#/festive' },
    { n: 61, g: 'Occasion', t: 'Group gift message', go: '#/group-gift' },
    { n: 62, g: 'Occasion', t: 'Corporate gifting (GST invoice)', go: '#/corporate' },
    { n: 63, g: 'Occasion', t: 'Baby’s first gold (≤ 4 g)', go: '#/baby-gold' },
    { n: 64, g: 'Occasion', t: 'NRI packing / customs note', go: '#/nri' },
    { n: 65, g: 'Account', t: 'Sizes you have used', go: '#/family' },
    { n: 66, g: 'Account', t: 'Family profiles', go: '#/family' },
    { n: 67, g: 'Account', t: 'Reorder in a new size', go: '#/account?tab=orders' },
    { n: 68, g: 'Account', t: 'Royalty points bar', go: '#/account' },
    { n: 69, g: 'Account', t: 'Birthday gold reminder', go: '#/family' },
    { n: 70, g: 'Account', t: 'Anniversary WhatsApp', go: '#/family' },
    { n: 71, g: 'Account', t: 'Send an unboxing photo', go: 'wa:Namaste Shivaa ✦ Here is an unboxing / hallmark photo of my piece.' },
    { n: 72, g: 'Account', t: 'Hostel / kothi address label', go: '#/family' },
    { n: 73, g: 'Account', t: 'Phone-first login tip', go: '#/login' },
    { n: 74, g: 'Account', t: 'Add to Home Screen', go: '#a2hs' },
    { n: 75, g: 'Account', t: 'Download my data (this browser)', go: '#/my-data' },
    { n: 76, g: 'Account', t: 'Quiet hours (no v109 promos after 9 pm IST)', go: '#quiet' },
    { n: 77, g: 'Access', t: 'Hindi UI toggle', go: '#hi' },
    { n: 78, g: 'Access', t: 'Hinglish search (jhumka, kangan, nathni…)', go: '#hinglish' },
    { n: 79, g: 'Access', t: 'Large type', go: '#lg' },
    { n: 80, g: 'Access', t: 'One-thumb shop', go: '#thumb' },
    { n: 81, g: 'Access', t: 'Add-to-home coach (Hindi)', go: '#a2hs' },
    { n: 82, g: 'Access', t: 'Last-viewed tray (this phone)', go: '#/offline-tray' },
    { n: 83, g: 'Access', t: 'High contrast', go: '#hc' },
    { n: 84, g: 'Access', t: 'Screen-reader weight/purity on cards', go: 'pdp' },
    { n: 85, g: 'Care', t: 'Book a Jayal visit', go: '#/visit' },
    { n: 86, g: 'Care', t: 'Call the counter (no fake queue)', go: 'tel:+918905005921' },
    { n: 87, g: 'Care', t: 'Free resize request', go: '#/care-book' },
    { n: 88, g: 'Care', t: 'Polish / rhodium booking', go: '#/care-book' },
    { n: 89, g: 'Care', t: 'Insurance / vault enquiry', go: 'wa:Namaste Shivaa ✦ I would like to ask about insurance / vault for a heavy piece.' },
    { n: 90, g: 'Care', t: 'Repair status via WhatsApp', go: 'wa:Namaste Shivaa ✦ Please share the status of my repair / polish.' },
    { n: 91, g: 'Care', t: 'Return slip to print', go: '#/care-book' },
    { n: 92, g: 'Care', t: 'Weigh at home vs our scale', go: '#/weigh' },
    { n: 93, g: 'B2B', t: 'Forward a SKU on WhatsApp', go: 'pdp' },
    { n: 94, g: 'B2B', t: 'Fine-metal draft (this phone)', go: '#/metal-draft' },
    { n: 95, g: 'B2B', t: 'Timestamped price list to print', go: '#/partner-list' },
    { n: 96, g: 'B2B', t: 'Dead-stock pickup slot', go: 'wa:Namaste Shivaa ✦ I would like to book a dead-stock pickup in Nagaur district.' },
    { n: 97, g: 'House', t: 'Karigar note (no invented names)', go: '#/karigar' },
    { n: 98, g: 'House', t: 'Piece of the day on the utilbar', go: '#potm' },
    { n: 99, g: 'House', t: 'Honest empty states', go: '#/shop?q=__none__' },
    { n: 100, g: 'House', t: 'Why this making % on cards', go: '#/shop' }
  ];

  /* ── CSS (injected — no extra stylesheet, so this stays one file) ───── */
  const CSS = `
  html.v109-lg{font-size:18px}
  html.v109-hc{--maroon:#3a0008;--gold:#8a5a00;--ink:#140000;--cream:#fff8e8}
  html.v109-hc body{background:#fff8e8;color:#140000}
  html.v109-thumb .btn,html.v109-thumb .pc-wish,html.v109-thumb .icon-btn{min-height:46px;min-width:46px}
  html.v109-thumb .p-card .pc-price b,html.v109-thumb .pd-total b{font-size:1.15em}
  #v109Bar{position:fixed;right:16px;bottom:92px;z-index:94;display:flex;flex-direction:column;gap:8px;align-items:flex-end}
  @media(max-width:768px){#v109Bar{right:12px;bottom:calc(128px + env(safe-area-inset-bottom,0px))}}
  body[data-page=admin] #v109Bar,body[data-page=partner] #v109Bar{display:none}
  .v109-fab{width:44px;height:44px;border-radius:50%;border:1px solid rgba(185,138,47,.45);
    background:linear-gradient(180deg,#2a0a10,#1d0509);color:#f3dfae;font:700 12px/1 var(--ff-body,inherit);
    box-shadow:0 10px 24px rgba(29,5,9,.28);cursor:pointer}
  .v109-fab:focus-visible{outline:2px solid #d4af5a;outline-offset:3px}
  .v109-chip{border:0;border-radius:999px;padding:8px 12px;background:#1d0509;color:#f3dfae;
    font:700 11px/1 var(--ff-body,inherit);letter-spacing:.06em;cursor:pointer}
  .v109-page{padding:28px 0 80px}
  .v109-page h1{font-family:var(--ff-display,serif);font-weight:500;font-size:clamp(28px,4vw,44px);margin:0 0 8px}
  .v109-page .lead{color:var(--ink-3,#7a6550);margin:0 0 22px;max-width:62ch}
  .v109-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px}
  .v109-card{display:block;text-align:left;border:1px solid var(--line,#e6d9c0);background:var(--white,#fff);
    border-radius:16px;padding:14px 16px;color:inherit;text-decoration:none;cursor:pointer}
  .v109-card:hover{border-color:var(--gold,#b98a2f)}
  .v109-card b{display:block;font-size:14px;margin-bottom:4px}
  .v109-card small{color:var(--ink-3,#7a6550);font-size:11px;letter-spacing:.08em;text-transform:uppercase}
  .v109-tools{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0 18px}
  .v109-tools button,.v109-tools a{border:1px solid var(--line,#e6d9c0);background:#fff;border-radius:999px;
    padding:8px 12px;font-size:13px;cursor:pointer;color:inherit;text-decoration:none}
  .v109-tools button.on,.v109-tools a.on{background:#1d0509;color:#f3dfae;border-color:#1d0509}
  .v109-form{display:grid;gap:10px;max-width:420px}
  .v109-form input,.v109-form select,.v109-form textarea{padding:10px 12px;border-radius:10px;border:1px solid var(--line,#e6d9c0);font:inherit}
  .v109-note{font-size:13px;color:var(--ink-3,#7a6550);margin-top:10px}
  .v109-shop{margin:8px 0 14px;padding:10px 12px;border:1px dashed var(--line,#e6d9c0);border-radius:14px;background:rgba(253,248,239,.7)}
  .v109-shop h4{margin:0 0 8px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:var(--maroon,#6e1e2a)}
  .v109-pie{width:120px;height:120px;border-radius:50%;flex:0 0 120px}
  .v109-row{display:flex;gap:16px;align-items:center;flex-wrap:wrap}
  .v109-zoom{position:fixed;inset:0;z-index:4000;background:rgba(20,4,8,.92);display:grid;place-items:center;cursor:zoom-out}
  .v109-zoom img{max-width:96vw;max-height:96vh;object-fit:contain}
  .v109-tip{display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;margin-left:6px;
    border-radius:50%;border:1px solid var(--gold,#b98a2f);font-size:10px;color:var(--maroon,#6e1e2a);cursor:help}
  .v109-potm{display:inline-flex;align-items:center;gap:8px;margin-left:10px;color:#f3dfae;text-decoration:none;font-size:12px;white-space:nowrap}
  .v109-empty{grid-column:1/-1;padding:40px 16px;text-align:center;color:var(--ink-3,#7a6550)}
  .v109-lock{font-size:12px;color:var(--maroon,#6e1e2a);margin:8px 0}
  .v109-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}
  @media print {.v109-fab,#v109Bar,#v108Wa,.mnav,.header,.utilbar,.footer{display:none!important} .v109-page{padding:0}}
  `;

  function injectCss() {
    if ($('#v109css')) return;
    const s = document.createElement('style');
    s.id = 'v109css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  /* ── Hinglish ───────────────────────────────────────────────────────── */
  const HINGLISH = {
    jhumka: 'earrings', jhumkas: 'earrings', chandbali: 'earrings',
    kangan: 'bangles', kada: 'bangles', kade: 'bangles',
    haar: 'necklaces', ranihaar: 'necklaces', choker: 'necklaces',
    nath: 'nosepins', nathni: 'nosepins', nathiya: 'nosepins',
    payal: 'bridalanklets', pajeb: 'bridalanklets',
    mangalsutra: 'mangalsutra', tanmaniya: 'mangalsutra',
    hathphool: 'hathphool', rakhdi: 'rakhdi', borla: 'rakhdi', tikka: 'rakhdi',
    aad: 'aad', sheeshphool: 'sheeshphool', punach: 'punach',
    bajubandh: 'bajubandh', anguthi: 'rings', anguthiya: 'rings',
    chandi: 'silver', sona: 'gold', shaadi: 'wedding',
    kantha: 'necklaces', mala: 'necklaces', bali: 'earrings'
  };
  function expandHinglish(q) {
    const raw = String(q || '').trim();
    if (!raw) return raw;
    const bits = raw.toLowerCase().split(/\s+/).map(w => HINGLISH[w] || w);
    return bits.join(' ');
  }
  function wrapSearch() {
    const orig = SH().searchProducts;
    if (!orig || orig.__v109) return;
    const wrapped = function (query, limit) {
      const q = expandHinglish(query);
      rememberQuery(query);
      return orig.call(this, q, limit);
    };
    wrapped.__v109 = 1;
    SH().searchProducts = wrapped;
  }
  function rememberQuery(q) {
    q = String(q || '').trim();
    if (q.length < 2) return;
    const p = prefs();
    p.recentQ = [q].concat((p.recentQ || []).filter(x => x !== q)).slice(0, 8);
    save(p);
  }

  /* ── prefs chrome ───────────────────────────────────────────────────── */
  function applyPrefs() {
    const p = prefs();
    document.documentElement.classList.toggle('v109-lg', !!p.lg);
    document.documentElement.classList.toggle('v109-hc', !!p.hc);
    document.documentElement.classList.toggle('v109-thumb', !!p.thumb);
    document.documentElement.lang = p.hi ? 'hi' : 'en';
    document.documentElement.classList.toggle('v109-hi', !!p.hi);
    hindiChrome(!!p.hi);
  }
  const HI_CHROME = {
    Home: 'होम', Shop: 'दुकान', Rates: 'रेट', Wishlist: 'इच्छा', Account: 'खाता',
    Search: 'खोज', Cart: 'बैग', Menu: 'मेनू', 'Live Rates': 'लाइव रेट',
    'All Jewellery': 'सभी आभूषण', 'Track Order': 'ऑर्डर ट्रैक', 'Our Store': 'हमारी दुकान'
  };
  function hindiChrome(on) {
    $$('#mnav a span, .ub-right a, .search-btn, [aria-label="Search"]').forEach(el => {
      const en = el.getAttribute('data-v109en') || el.textContent.trim();
      if (!el.getAttribute('data-v109en')) el.setAttribute('data-v109en', en);
      if (on && HI_CHROME[en]) el.textContent = HI_CHROME[en];
      else if (!on) el.textContent = el.getAttribute('data-v109en') || en;
    });
  }

  function bar() {
    if ($('#v109Bar')) return;
    const d = document.createElement('div');
    d.id = 'v109Bar';
    d.innerHTML = `
      <button type="button" class="v109-chip" data-act="tools" aria-label="Jewellery tools">Tools · 100</button>
      <button type="button" class="v109-fab" data-act="hi" aria-label="Hindi">अ</button>
      <button type="button" class="v109-fab" data-act="lg" aria-label="Large type">Aa</button>
      <button type="button" class="v109-fab" data-act="hc" aria-label="High contrast">◎</button>`;
    d.addEventListener('click', e => {
      const act = e.target.getAttribute('data-act');
      if (!act) return;
      if (act === 'tools') location.hash = '#/tools';
      if (act === 'hi') put('hi', prefs().hi ? 0 : 1);
      if (act === 'lg') put('lg', prefs().lg ? 0 : 1);
      if (act === 'hc') put('hc', prefs().hc ? 0 : 1);
    });
    document.body.appendChild(d);
  }

  /* ── voice ──────────────────────────────────────────────────────────── */
  function voiceSearch() {
    const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
    const inp = $('#hdrSearchInput') || $('#searchInput');
    if (!Rec) { toast('Voice search needs Chrome or Safari'); if (inp) inp.focus(); return; }
    const r = new Rec();
    r.lang = prefs().hi ? 'hi-IN' : 'en-IN';
    r.interimResults = false;
    r.onresult = e => {
      const t = (e.results[0] && e.results[0][0] && e.results[0][0].transcript) || '';
      if (inp) {
        inp.value = t;
        inp.dispatchEvent(new Event('input', { bubbles: true }));
      }
      rememberQuery(t);
      toast(t || 'Listening ended');
    };
    r.onerror = () => toast('Could not hear that — try typing jhumka / kangan');
    r.start();
    toast(prefs().hi ? 'बोलिए…' : 'Speak now…');
  }

  /* ── shop extras ────────────────────────────────────────────────────── */
  function shopExtras(view) {
    const host = $('#shopGrid', view) ? $('#shopGrid', view).parentElement : view;
    if (!host || $('#v109Shop', view)) return;
    const box = document.createElement('div');
    box.id = 'v109Shop';
    box.className = 'v109-shop';
    const p = prefs();
    const f = p.filters || {};
    box.innerHTML = `<h4>${prefs().hi ? 'और छँटाई' : 'More ways to narrow'}</h4>
      <div class="v109-tools" id="v109ShopTools">
        <button type="button" data-k="weight" data-v="lt5" class="${f.weight === 'lt5' ? 'on' : ''}">&lt; 5 g</button>
        <button type="button" data-k="weight" data-v="5to10" class="${f.weight === '5to10' ? 'on' : ''}">5–10 g</button>
        <button type="button" data-k="weight" data-v="10to20" class="${f.weight === '10to20' ? 'on' : ''}">10–20 g</button>
        <button type="button" data-k="weight" data-v="20p" class="${f.weight === '20p' ? 'on' : ''}">20 g+</button>
        <button type="button" data-k="budget" data-v="25" class="${f.budget === '25' ? 'on' : ''}">Under ₹25k</button>
        <button type="button" data-k="budget" data-v="50" class="${f.budget === '50' ? 'on' : ''}">₹25–50k</button>
        <button type="button" data-k="budget" data-v="100" class="${f.budget === '100' ? 'on' : ''}">₹50–100k</button>
        <button type="button" data-k="budget" data-v="100p" class="${f.budget === '100p' ? 'on' : ''}">₹1L+</button>
        <button type="button" data-k="tag" data-v="daily" class="${f.tag === 'daily' ? 'on' : ''}">Daily</button>
        <button type="button" data-k="tag" data-v="wedding" class="${f.tag === 'wedding' ? 'on' : ''}">Wedding</button>
        <button type="button" data-k="tag" data-v="festive" class="${f.tag === 'festive' ? 'on' : ''}">Festive</button>
        <button type="button" data-k="tag" data-v="gifting" class="${f.tag === 'gifting' ? 'on' : ''}">Gifting</button>
        <button type="button" data-k="tag" data-v="heritage" class="${f.tag === 'heritage' ? 'on' : ''}">Heritage</button>
        <button type="button" data-k="who" data-v="mens" class="${f.who === 'mens' ? 'on' : ''}">For him</button>
        <button type="button" data-k="who" data-v="bridal" class="${f.who === 'bridal' ? 'on' : ''}">Bridal set</button>
        <button type="button" data-k="new" data-v="1" class="${f.new === '1' ? 'on' : ''}">New</button>
        <button type="button" data-k="low" data-v="1" class="${f.low === '1' ? 'on' : ''}">Few left</button>
        <button type="button" data-k="preset" data-v="save">Save this</button>
        <button type="button" data-k="preset" data-v="clear">Clear</button>
      </div>
      <div class="v109-note" id="v109ShopNote"></div>`;
    const grid = $('#shopGrid', view);
    if (grid) grid.parentElement.insertBefore(box, grid);
    else host.insertBefore(box, host.firstChild);
    box.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      const k = b.getAttribute('data-k'), v = b.getAttribute('data-v');
      const pr = prefs(); pr.filters = pr.filters || {};
      if (k === 'preset' && v === 'clear') pr.filters = {};
      else if (k === 'preset' && v === 'save') { toast('Preset saved on this phone'); }
      else if (pr.filters[k] === v) delete pr.filters[k];
      else pr.filters[k] = v;
      save(pr);
      applyShopFilter(view);
      shopExtrasRedraw(box);
    });
    applyShopFilter(view);
    const q = new URLSearchParams((location.hash.split('?')[1] || ''));
    const seed = q.get('v109');
    if (seed && !f[seed === 'occasion' ? 'tag' : seed]) {
      /* open the matching group — filter already painted */
    }
    recentChips(box);
  }
  function shopExtrasRedraw(box) {
    const f = prefs().filters || {};
    $$('button[data-k]', box).forEach(b => {
      const k = b.getAttribute('data-k'), v = b.getAttribute('data-v');
      if (k === 'preset') return;
      b.classList.toggle('on', f[k] === v);
    });
  }
  function matchFilter(p, f) {
    if (!p) return false;
    if (f.weight === 'lt5' && !(p.weightG < 5)) return false;
    if (f.weight === '5to10' && !(p.weightG >= 5 && p.weightG < 10)) return false;
    if (f.weight === '10to20' && !(p.weightG >= 10 && p.weightG < 20)) return false;
    if (f.weight === '20p' && !(p.weightG >= 20)) return false;
    if (f.budget) {
      const t = price(p).total || 0;
      if (f.budget === '25' && t >= 25000) return false;
      if (f.budget === '50' && (t < 25000 || t >= 50000)) return false;
      if (f.budget === '100' && (t < 50000 || t >= 100000)) return false;
      if (f.budget === '100p' && t < 100000) return false;
    }
    if (f.tag && !(p.tags || []).includes(f.tag)) return false;
    if (f.who === 'mens' && !(p.tags || []).includes('mens')) return false;
    if (f.who === 'bridal') {
      const bridal = /mangalsutra|rakhdi|aad|sheeshphool|hathphool|bridalanklets|punach|bajubandh/.test(p.category) || (p.tags || []).includes('wedding');
      if (!bridal) return false;
    }
    if (f.new === '1' && !(p.tags || []).includes('new')) return false;
    if (f.low === '1' && !((p.stock || 99) <= 6)) return false;
    return true;
  }
  function applyShopFilter(view) {
    const f = prefs().filters || {};
    const cards = $$('.p-card', view || document);
    let shown = 0;
    cards.forEach(card => {
      const a = card.querySelector('a[href*="#/product/"]');
      const id = a && (a.getAttribute('href') || '').split('/product/')[1];
      const p = byId(id);
      const ok = matchFilter(p, f);
      card.style.display = ok ? '' : 'none';
      if (ok) shown++;
      makingTip(card, p);
      srMeta(card, p);
    });
    const note = $('#v109ShopNote', view || document);
    const active = Object.keys(f).length;
    if (note) {
      note.textContent = active
        ? (shown + ' piece' + (shown === 1 ? '' : 's') + ' match these extra filters · live prices · nothing hidden from the 405')
        : 'Extra filters sit on top of the shop’s own filters. Clear to see everything again.';
    }
    let empty = $('#v109Empty', view || document);
    const grid = $('#shopGrid', view || document);
    if (grid && shown === 0 && cards.length) {
      if (!empty) {
        empty = document.createElement('div');
        empty.id = 'v109Empty';
        empty.className = 'v109-empty';
        grid.appendChild(empty);
      }
      empty.hidden = false;
      empty.innerHTML = '<p>Nothing in this slice — the catalogue still has 405 pieces.</p><p>Clear the extra filters, or WhatsApp us a budget and a weight.</p>';
    } else if (empty) empty.hidden = true;
  }
  function recentChips(box) {
    const q = prefs().recentQ || [];
    if (!q.length) return;
    const row = document.createElement('div');
    row.className = 'v109-tools';
    row.innerHTML = '<span class="v109-note">Recent · </span>' + q.map(s => `<button type="button" data-q="${esc(s)}">${esc(s)}</button>`).join('');
    box.appendChild(row);
    row.addEventListener('click', e => {
      const b = e.target.closest('button[data-q]'); if (!b) return;
      const inp = $('#hdrSearchInput') || $('#searchInput');
      if (inp) { inp.value = b.getAttribute('data-q'); inp.dispatchEvent(new Event('input', { bubbles: true })); }
      location.hash = '#/shop?q=' + encodeURIComponent(b.getAttribute('data-q'));
    });
  }
  function makingTip(card, p) {
    if (!card || !p || card.querySelector('.v109-tip')) return;
    const priceEl = card.querySelector('.pc-price') || card.querySelector('.pc-meta');
    if (!priceEl) return;
    const tip = document.createElement('span');
    tip.className = 'v109-tip';
    tip.textContent = '%';
    const mc = p.mcScheme === 'percent' ? (p.mcValue + '% making') : (p.mcValue ? ('making ' + fmt(p.mcValue)) : 'making as listed on the piece');
    tip.title = mc + ' · live metal extra · GST extra. We do not invent a “typical Jaipur %”.';
    priceEl.appendChild(tip);
  }
  function srMeta(card, p) {
    if (!card || !p || card.querySelector('.v109-sr')) return;
    const s = document.createElement('span');
    s.className = 'v109-sr';
    const metal = p.metal === 'Silver' ? 'silver 925' : ((p.purity || '') + ' gold');
    s.textContent = (p.name || '') + ', ' + metal + ', ' + p.weightG + ' grams';
    card.appendChild(s);
  }

  /* ── PDP extras ─────────────────────────────────────────────────────── */
  function currentProduct() {
    const m = (location.hash || '').match(/^#\/product\/([\w-]+)/);
    return m ? byId(m[1]) : null;
  }
  function pdpExtras(view) {
    const p = currentProduct();
    if (!p || !view || $('#v109Pdp', view)) return;
    const pr = price(p);
    const box = document.createElement('div');
    box.id = 'v109Pdp';
    box.className = 'v109-shop';
    const net = Math.max(0, (+p.weightG || 0) - (+p.lessWeightG || 0));
    const melt = pr.metalValue || 0;
    const make = pr.makingCharge || 0;
    const sum = melt + make || 1;
    const deg = Math.round(360 * melt / sum);
    const saved = (function () { try { return localStorage.getItem('shv_ring_size') || ''; } catch (e) { return ''; } })();
    const views = bumpView(p.id);
    const low = (p.stock || 99) <= 6;
    const mangal = p.category === 'mangalsutra' || (p.tags || []).includes('wedding');
    box.innerHTML = `
      <h4>${esc(p.name)}</h4>
      <div class="v109-row">
        <div class="v109-pie" style="background:conic-gradient(#b98a2f 0 ${deg}deg,#6e1e2a ${deg}deg 360deg)" aria-hidden="true"></div>
        <div>
          <div><b>Metal (melt value)</b> ${fmt(melt)}</div>
          <div><b>Making</b> ${fmt(make)} ${p.mcScheme === 'percent' ? '(' + esc(p.mcValue) + '%)' : ''}</div>
          <div class="v109-note">Pie is metal vs making on today’s live rate. GST and listed stone value sit outside this pie.</div>
        </div>
      </div>
      <div class="v109-tools" style="margin-top:12px">
        <button type="button" data-act="print">Print sheet</button>
        <a href="${wa(pdpWaMsg(p))}" target="_blank" rel="noopener">WhatsApp this size</a>
        <a href="${wa('Namaste Shivaa ✦ I have a question for the karigar about ' + (p.name || '') + ' (SKU ' + (p.sku || '') + ').')}" target="_blank" rel="noopener">Ask a karigar</a>
        <a href="${wa('Namaste Shivaa ✦ Please tell me when ' + (p.name || '') + ' (SKU ' + (p.sku || '') + ') is available.')}" target="_blank" rel="noopener">Notify me</a>
        <a href="${wa('Namaste Shivaa ✦ I would like to gift ' + (p.name || '') + ' (SKU ' + (p.sku || '') + '). Please send a photo e-gift on WhatsApp.')}" target="_blank" rel="noopener">E-gift this</a>
        <button type="button" data-act="later">Save for later</button>
        <button type="button" data-act="spin">Spin photos</button>
      </div>
      <ul class="v109-note">
        <li>Gross ${p.weightG} g${p.lessWeightG ? ' · less ' + p.lessWeightG + ' g · net ≈ ' + net.toFixed(3) + ' g' : ''}</li>
        <li>If 22K moves ±₹50/g: ${fmt(shiftPrice(p, -50))} ← today ${fmt(pr.total)} → ${fmt(shiftPrice(p, 50))}</li>
        <li>Buyback preview (metal only, 100% gold buyback policy): ${fmt(melt)} · making is not bought back</li>
        ${p.stoneType && p.stoneType !== 'Plain' ? '<li>Stone listed: ' + esc(p.stoneType) + (p.stoneColour ? ' · ' + esc(p.stoneColour) : '') + (p.stoneDesc ? ' · ' + esc(p.stoneDesc) : '') + '</li>' : ''}
        ${saved && (p.sizes || []).length ? '<li>Your saved ring size is ' + esc(saved) + ((p.sizes || []).map(String).includes(String(saved)) ? ' — this piece offers it' : ' — this piece lists ' + (p.sizes || []).join(', ')) + '</li>' : ''}
        ${mangal || p.category === 'chains' || p.category === 'necklaces' ? '<li>Mangalsutra / chain: sit it with a nath or bangles from the bridal checklist if you are building a set.</li>' : ''}
        ${low ? '<li>Only ' + p.stock + ' with the karigar — we do not invent “12 people are looking”.</li>' : ''}
        <li>You have opened this piece ${views} time${views === 1 ? '' : 's'} on this phone.</li>
        <li>Care: keep perfume and ultrasonic cleaners off unsealed stones · resize via the care book · ships in 48 hours when in stock.</li>
        <li>Karigar note: hand-finished in Jayal · typical dispatch 48 hours when stock is on the card.</li>
      </ul>`;
    const info = $('.pd-info', view) || view;
    info.appendChild(box);
    box.addEventListener('click', e => {
      const act = e.target.getAttribute('data-act');
      if (act === 'print') printSheet(p);
      if (act === 'later') saveLater(p.id);
      if (act === 'spin') spinPhotos(view);
    });
    similarRow(view, p);
    completeSet(view, p);
    zoomGallery(view);
    hallmarkHint(view, p);
  }
  function bumpView(id) {
    const p = prefs();
    p.views = p.views || {};
    p.views[id] = (p.views[id] || 0) + 1;
    const tray = p.tray || [];
    p.tray = [id].concat(tray.filter(x => x !== id)).slice(0, 20);
    save(p);
    return p.views[id];
  }
  function shiftPrice(p, deltaPerGram) {
    const pr = price(p);
    const g = +p.weightG || 0;
    return Math.max(0, (pr.total || 0) + deltaPerGram * g * 1.03);
  }
  function pdpWaMsg(p) {
    const sizeEl = $('#sizeSel') || $('select[name=size]') || $$('button.on[data-size]')[0];
    const size = sizeEl ? (sizeEl.value || sizeEl.getAttribute('data-size') || sizeEl.textContent) : '';
    const eng = (($('#engraving') || $('input[name=engraving]') || {}).value) || '';
    if (SH().waProductMsg) {
      try { return SH().waProductMsg(p, 1, size || null, eng || null); } catch (e) {}
    }
    return 'Namaste Shivaa ✦ ' + (p.name || '') + (p.sku ? ' SKU ' + p.sku : '') + (size ? ' · size ' + size : '') + (eng ? ' · engraving ' + eng : '');
  }
  function saveLater(id) {
    const p = prefs();
    p.later = p.later || [];
    if (!p.later.includes(id)) p.later.unshift(id);
    p.later = p.later.slice(0, 40);
    save(p);
    toast('Saved on this phone · open Tools → Save for later');
  }
  function similarRow(view, p) {
    const list = products().filter(x => x.id !== p.id && x.category === p.category)
      .map(x => ({ x, d: Math.abs((x.weightG || 0) - (p.weightG || 0)) }))
      .sort((a, b) => a.d - b.d).slice(0, 4).map(o => o.x);
    if (!list.length) return;
    const sec = document.createElement('section');
    sec.className = 'sec container';
    sec.innerHTML = '<div class="sec-head"><span class="label">Close in weight</span><h2>Similar pieces</h2></div><div class="p-grid">' + list.map(card).join('') + '</div>';
    view.appendChild(sec);
  }
  function completeSet(view, p) {
    const map = {
      rings: ['earrings', 'bangles', 'mangalsutra'],
      earrings: ['necklaces', 'rings'],
      necklaces: ['earrings', 'bangles'],
      mangalsutra: ['bangles', 'nosepins', 'earrings'],
      bangles: ['rings', 'mangalsutra']
    };
    const cats = map[p.category];
    if (!cats) return;
    const list = [];
    cats.forEach(c => {
      const hit = products().filter(x => x.category === c && x.purity === p.purity).slice(0, 2);
      list.push.apply(list, hit);
    });
    if (!list.length) return;
    const sec = document.createElement('section');
    sec.className = 'sec container';
    sec.innerHTML = '<div class="sec-head"><span class="label">Wear together</span><h2>Complete the set</h2></div><div class="p-grid">' + list.slice(0, 4).map(card).join('') + '</div>';
    view.appendChild(sec);
  }
  function zoomGallery(view) {
    $$('#galTrack img, .gal-slide img', view).forEach(img => {
      if (img.__v109z) return;
      img.__v109z = 1;
      img.style.cursor = 'zoom-in';
      img.addEventListener('click', e => {
        if (e.metaKey || e.ctrlKey) return;
        const ov = document.createElement('div');
        ov.className = 'v109-zoom';
        ov.innerHTML = '<img alt="" src="' + esc(img.src) + '">';
        ov.addEventListener('click', () => ov.remove());
        document.body.appendChild(ov);
      });
    });
  }
  function spinPhotos(view) {
    const imgs = $$('#galTrack img, .gal-slide img', view);
    if (imgs.length < 2) { toast('This piece has one photo — spin needs two'); return; }
    let i = 0;
    const tick = () => {
      imgs.forEach((im, n) => { const slide = im.closest('.gal-slide'); if (slide) slide.classList.toggle('on', n === i); });
      i = (i + 1) % imgs.length;
    };
    tick();
    if (reduced()) return;
    let n = 0;
    const t = setInterval(() => { tick(); if (++n > 12) clearInterval(t); }, 220);
  }
  function hallmarkHint(view, p) {
    const gal = $('#galWrap', view);
    if (!gal || gal.querySelector('.v109-hall')) return;
    const b = document.createElement('a');
    b.className = 'v109-chip';
    b.style.position = 'absolute'; b.style.left = '10px'; b.style.bottom = '10px'; b.style.zIndex = '5';
    b.href = '#/hallmark?product=' + encodeURIComponent(p.id);
    b.textContent = 'HUID guide';
    gal.style.position = gal.style.position || 'relative';
    gal.appendChild(b);
  }
  function printSheet(p) {
    const pr = price(p);
    const w = window.open('', '_blank');
    if (!w) { toast('Allow pop-ups to print'); return; }
    w.document.write(`<!doctype html><title>${esc(p.name)}</title>
      <body style="font-family:Georgia,serif;padding:32px;color:#1d0509">
      <h1>${esc(p.name)}</h1>
      <p>SKU ${esc(p.sku)} · ${esc(p.purity)} ${esc(p.metal)} · ${p.weightG} g</p>
      <p>Live total ${fmt(pr.total)} · metal ${fmt(pr.metalValue)} · making ${fmt(pr.makingCharge)} · GST in total</p>
      <p>Rate timestamp ${esc((rates().t || ''))} · final bill locks at order time.</p>
      <p>Shivaa · Shop No. 01, Sadar Bazaar, Jayal, Nagaur · +91 89050 05921</p>
      <p>HUID / BIS: follow the HUID check guide on shivaa.in — this sheet is not a certificate.</p>
      </body>`);
    w.document.close();
    w.focus();
    w.print();
  }

  /* ── checkout extras ────────────────────────────────────────────────── */
  function checkoutExtras(view) {
    if (!view || $('#v109Co', view)) return;
    const box = document.createElement('div');
    box.className = 'v109-shop';
    box.id = 'v109Co';
    const lock = rateLock();
    box.innerHTML = `
      <h4>Checkout extras</h4>
      <label><input type="checkbox" id="v109Wrap"> Gift wrap + handwritten card (tell us the message on WhatsApp)</label>
      <p class="v109-lock">${lock}</p>
      <p class="v109-note">Coupons: SHIVAA10 needs ₹20,000+ · FIRST2000 needs ₹25,000 first order · WEDDING5 is 5% · we never silent-apply a code.
        Insured courier on every prepaid order. Guest checkout: send the bag on WhatsApp if you would rather not create an account.</p>
      <div class="v109-tools">
        <a class="btn btn-outline btn-sm" href="${wa('Namaste Shivaa ✦ Guest order from the website bag. Please confirm live total and address.')}" target="_blank" rel="noopener">Guest order on WhatsApp</a>
        <a class="btn btn-outline btn-sm" href="${wa('Namaste Shivaa ✦ I will pay at the Jayal store.')}" target="_blank" rel="noopener">Pay at store</a>
      </div>`;
    view.appendChild(box);
    wrapCoupon();
  }
  function rateLock() {
    const p = prefs();
    if (!p.lockT) { p.lockT = Date.now(); save(p); }
    const left = 30 * 60 * 1000 - (Date.now() - p.lockT);
    if (left <= 0) { p.lockT = Date.now(); save(p); return 'Rate-lock window restarted (30 min on this phone — the bill still locks at order time on the server).'; }
    const m = Math.max(1, Math.round(left / 60000));
    return 'This phone will remind you for ~' + m + ' min. The live bill still locks when the order is placed.';
  }
  function wrapCoupon() {
    const orig = SH().applyCoupon;
    if (!orig || orig.__v109) return;
    const wrapped = async function () {
      const msg = $('#couponMsg');
      const code = ($('#couponIn') || {}).value || '';
      try {
        await orig.apply(this, arguments);
      } catch (e) {
        if (msg) {
          msg.style.color = 'var(--bad)';
          msg.textContent = (e && e.message) || 'That code did not apply';
        }
      }
      if (msg && /min|minimum|not/i.test(msg.textContent || '')) {
        msg.textContent += ' · SHIVAA10 needs ₹20,000+ · FIRST2000 needs ₹25,000 first order.';
      }
      if (!code.trim() && msg) msg.textContent = 'Enter a code first. We will not invent a discount.';
    };
    wrapped.__v109 = 1;
    SH().applyCoupon = wrapped;
  }

  function wishlistExtras(view) {
    if (!view || $('#v109Wish', view)) return;
    const bar = document.createElement('div');
    bar.className = 'v109-tools';
    bar.id = 'v109Wish';
    bar.innerHTML = '<span class="v109-note">Add from wishlist using the piece page so the size is yours — we do not dump unsized rings into the bag.</span>';
    view.insertBefore(bar, view.firstChild);
  }

  function accountExtras(view) {
    if (!view || $('#v109Acc', view)) return;
    const u = SH().state && SH().state.user;
    const pts = u && u.loyaltyPoints || 0;
    const d = document.createElement('div');
    d.id = 'v109Acc';
    d.className = 'v109-shop';
    d.innerHTML = `<h4>Royalty</h4>
      <p>You have <b>${pts}</b> royalty points (₹1 each, 10% cap at checkout — the house rule, not a new one).</p>
      <div style="height:8px;background:#efe4cf;border-radius:99px;overflow:hidden"><i style="display:block;height:8px;width:${Math.min(100, pts / 10)}%;background:#b98a2f"></i></div>
      <p class="v109-note">Reorder in a new size from Orders — open the piece, pick the size, add again.</p>`;
    view.insertBefore(d, view.firstChild);
  }

  function invoiceHi(view) {
    if (!prefs().hi || !view) return;
    view.querySelectorAll('h1,h2,h3,th,td,label').forEach(el => {
      const m = { Invoice: 'बिल', Total: 'कुल', GSTIN: 'GSTIN', Qty: 'मात्रा', Amount: 'राशि' };
      const t = el.textContent.trim();
      if (m[t]) el.textContent = m[t];
    });
  }

  /* ── pages ──────────────────────────────────────────────────────────── */
  function paint(view, html) {
    if (!view) view = $('#view');
    if (!view) return;
    view.innerHTML = '<div class="v109-page container">' + html + '</div>';
  }
  function gridOf(list) {
    if (!list.length) return '<div class="v109-empty">Nothing in this slice. 405 pieces remain in the catalogue.</div>';
    return '<div class="p-grid">' + list.map(card).join('') + '</div>';
  }

  function pageTools(view) {
    const groups = [];
    CATALOG.forEach(f => {
      let g = groups.find(x => x.g === f.g);
      if (!g) { g = { g: f.g, items: [] }; groups.push(g); }
      g.items.push(f);
    });
    paint(view, `<span class="label">v109 · drop-in pack</span>
      <h1>100 extra ways to choose</h1>
      <p class="lead">This pack does not touch app.js or the 405-piece catalogue. Features that need the shop’s phone open WhatsApp. We never invent a queue, a view-count, or a weight.</p>
      ${groups.map(g => `<h2 style="margin:28px 0 10px;font-size:20px">${esc(g.g)}</h2>
        <div class="v109-grid">${g.items.map(f => `<a class="v109-card" data-go="${esc(f.go)}" href="${f.go.charAt(0) === '#' && f.go.charAt(1) === '/' ? f.go : '#'}">
          <small>${String(f.n).padStart(3, '0')} · ${esc(f.g)}</small><b>${esc(f.t)}</b></a>`).join('')}</div>`).join('')}`);
    view.addEventListener('click', onCatalogClick);
  }
  function onCatalogClick(e) {
    const a = e.target.closest('a.v109-card'); if (!a) return;
    const go = a.getAttribute('data-go') || '';
    if (go === 'pdp') { e.preventDefault(); toast('Open any piece — the extra panel is at the bottom of the page'); location.hash = '#/shop'; return; }
    if (go === '#voice') { e.preventDefault(); voiceSearch(); return; }
    if (go === '#recent') { e.preventDefault(); location.hash = '#/shop?v109=presets'; return; }
    if (go === '#hi') { e.preventDefault(); put('hi', prefs().hi ? 0 : 1); return; }
    if (go === '#lg') { e.preventDefault(); put('lg', prefs().lg ? 0 : 1); return; }
    if (go === '#hc') { e.preventDefault(); put('hc', prefs().hc ? 0 : 1); return; }
    if (go === '#thumb') { e.preventDefault(); put('thumb', prefs().thumb ? 0 : 1); toast('One-thumb targets are larger'); return; }
    if (go === '#quiet') { e.preventDefault(); put('quiet', prefs().quiet ? 0 : 1); toast(prefs().quiet ? 'Quiet hours on (9 pm–9 am IST)' : 'Quiet hours off'); return; }
    if (go === '#a2hs') { e.preventDefault(); a2hs(); return; }
    if (go === '#hinglish') { e.preventDefault(); toast('Try typing jhumka, kangan, nathni, payal, anguthi, chandi'); return; }
    if (go === '#potm') { e.preventDefault(); const el = $('#v109Potm'); if (el) el.focus(); return; }
    if (go.slice(0, 3) === 'wa:') { e.preventDefault(); window.open(wa(go.slice(3)), '_blank', 'noopener'); return; }
    if (go.slice(0, 4) === 'tel:') { /* let the browser */ return; }
  }

  function pageGift(view) {
    paint(view, `<span class="label">Gift finder</span><h1>Six pieces, live-priced</h1>
      <form class="v109-form" id="v109Gf">
        <select name="rel"><option value="her">For her</option><option value="him">For him</option><option value="maa">For mother</option><option value="baby">Baby’s first gold</option></select>
        <select name="metal"><option value="Gold">Gold</option><option value="Silver">Silver</option></select>
        <select name="cap"><option value="25000">Under ₹25,000</option><option value="50000">Under ₹50,000</option><option value="100000">Under ₹1,00,000</option><option value="9999999">Any live total</option></select>
        <button class="btn btn-gold" type="submit">Show six</button>
      </form><div id="v109GfOut"></div>`);
    $('#v109Gf', view).onsubmit = e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const rel = fd.get('rel'), metal = fd.get('metal'), cap = +fd.get('cap');
      let list = products().filter(p => p.metal === metal && price(p).total <= cap);
      if (rel === 'him') list = list.filter(p => (p.tags || []).includes('mens') || p.category === 'chains');
      if (rel === 'maa') list = list.filter(p => /mangalsutra|bangles|necklaces|chains/.test(p.category));
      if (rel === 'baby') list = list.filter(p => p.weightG <= 4);
      list = list.sort((a, b) => price(a).total - price(b).total).slice(0, 6);
      $('#v109GfOut', view).innerHTML = gridOf(list);
    };
  }
  function pageBridal(view) {
    const p = prefs();
    const checks = [
      ['mangalsutra', 'Mangalsutra'], ['bangles', 'Bangles / kadas'], ['nosepins', 'Nath / nose pin'],
      ['rakhdi', 'Rakhdi / borla'], ['aad', 'Aad'], ['hathphool', 'Hathphool'],
      ['bridalanklets', 'Payal / anklets'], ['earrings', 'Earrings'], ['necklaces', 'Necklace / haar']
    ];
    const done = p.bridal || {};
    const wed = p.wedding || '';
    let count = '';
    if (wed) {
      const days = Math.ceil((new Date(wed + 'T00:00:00+05:30') - new Date()) / 86400000);
      count = days > 0 ? days + ' days to the date you saved. Order-by is yours to confirm with the shop (48h dispatch when in stock).'
        : 'That date is today or past — still happy to help on WhatsApp.';
    }
    paint(view, `<span class="label">Bridal</span><h1>Checklist</h1>
      <p class="lead">${esc(count) || 'Save a wedding date on this phone. We do not invent an “order by” factory date.'}</p>
      <form class="v109-form"><label>Wedding date <input type="date" id="v109Wed" value="${esc(wed)}"></label></form>
      <div class="v109-grid" id="v109Br">${checks.map(([id, name]) => {
        const n = products().filter(x => x.category === id).length;
        return `<a class="v109-card" href="#/shop?category=${id}"><small>${done[id] ? 'saved' : 'open'}</small><b>${esc(name)}</b><span class="v109-note">${n} in catalogue</span></a>`;
      }).join('')}</div>`);
    $('#v109Wed', view).onchange = e => put('wedding', e.target.value);
  }
  function pageRate(view) {
    const r = rates();
    const hist = (SH().state && SH().state.rates && (SH().state.rates.history || (SH().state.rates.last && []))) || [];
    /* history may live on db only — try state.ratesHistory or last */
    const H = (window.__SHV_RATES_HIST || hist || []);
    const series = H.map(x => x.gold22).filter(Boolean).slice(-40);
    const w = 320, h = 80;
    let path = '';
    if (series.length > 1) {
      const min = Math.min.apply(null, series), max = Math.max.apply(null, series);
      path = series.map((v, i) => {
        const x = (i / (series.length - 1)) * w;
        const y = h - ((v - min) / (max - min || 1)) * (h - 8) - 4;
        return (i ? 'L' : 'M') + x.toFixed(1) + ',' + y.toFixed(1);
      }).join(' ');
    }
    const g22 = r.gold22 || (r.last && r.last.gold22) || 0;
    const watch = prefs().watch || 0;
    paint(view, `<span class="label">Rate lab</span><h1>22K on this shop</h1>
      <p class="lead">Sparkline uses rate history already on the shop when the API sends it. If the line is empty, we still have today’s live gram rate.</p>
      <svg viewBox="0 0 ${w} ${h}" width="100%" style="max-width:420px;background:#fffdf8;border-radius:12px"><path d="${path}" fill="none" stroke="#b98a2f" stroke-width="2"/></svg>
      <p>Live 22K ${fmt(g22)} / g</p>
      <form class="v109-form"><label>Watch 22K below ₹/g <input type="number" id="v109Watch" value="${watch || ''}" placeholder="e.g. 14000"></label>
      <button type="button" class="btn btn-outline" id="v109WatchBtn">Save watch on this phone</button></form>
      <p class="v109-note">Browsers cannot send you a WhatsApp by themselves. When the live rate is at or under your number, we toast here. Ask the shop to watch it for you:</p>
      <a class="btn btn-gold" href="${wa('Namaste Shivaa ✦ Please watch 22K for me around ₹' + (watch || g22) + '/g and WhatsApp me.')}" target="_blank" rel="noopener">Ask the shop to watch</a>
      <div id="v109ThenNow"></div>`);
    $('#v109WatchBtn', view).onclick = () => { put('watch', +$('#v109Watch', view).value || 0); toast('Saved on this phone'); };
    thenNow(view, g22);
    if (watch && g22 && g22 <= watch) toast('22K is at or under your watch (' + fmt(g22) + '/g)');
  }
  function thenNow(view, g22) {
    const H = window.__SHV_RATES_HIST || [];
    const first = H[0];
    const el = $('#v109ThenNow', view);
    if (!el) return;
    if (first && first.gold22 && g22) {
      el.innerHTML = `<p>10 g of 22K at the earliest stored rate (${esc(String(first.t || '').slice(0, 10))}): <b>${fmt(first.gold22 * 10)}</b> · today: <b>${fmt(g22 * 10)}</b>. Making and GST extra. We do not have last-Diwali on file if it is not in this history.</p>`;
    } else el.innerHTML = '<p class="v109-note">No extra history in memory this session — 10 g today is ' + fmt((g22 || 0) * 10) + ' of metal, making extra.</p>';
  }
  function pageOldGold(view) {
    paint(view, `<span class="label">Old gold</span><h1>Exchange estimator</h1>
      <p class="lead">Uses today’s live gram rate × weight × purity factor. The house buyback is 100% of gold value — making and stones are not bought back. Final purity is tested at the counter.</p>
      <form class="v109-form" id="v109Og">
        <label>Weight (g) <input name="g" type="number" step="0.001" required></label>
        <label>Stated purity <select name="k"><option value="0.995">24K / 995</option><option value="0.916" selected>22K / 916</option><option value="0.750">18K / 750</option></select></label>
        <button class="btn btn-gold" type="submit">Estimate</button>
      </form><div id="v109OgOut"></div>`);
    $('#v109Og', view).onsubmit = e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const g = +fd.get('g') || 0, k = +fd.get('k') || 0;
      const r = rates();
      const g24 = r.gold24 || (r.last && r.last.gold24) || 0;
      const metal = g * k * g24;
      $('#v109OgOut', view).innerHTML = `<p>Metal estimate <b>${fmt(metal)}</b> at 24K ${fmt(g24)}/g × ${g} g × ${k}. This is not an offer. Stones and making are excluded. Tested at Jayal.</p>
        <a class="btn btn-outline" href="${wa('Namaste Shivaa ✦ Old-gold estimate from the site: ' + g + ' g × ' + k + ' ≈ ' + fmt(metal) + '. I would like it tested.')}" target="_blank" rel="noopener">Take this to WhatsApp</a>`;
    };
  }
  function pageFamily(view) {
    const p = prefs();
    paint(view, `<span class="label">Family</span><h1>Profiles on this phone</h1>
      <p class="lead">Sizes and dates stay in this browser. We do not upload them until you WhatsApp the shop.</p>
      <form class="v109-form" id="v109Fa">
        <input name="name" placeholder="Name" required>
        <select name="rel"><option>Self</option><option>Mother</option><option>Partner</option><option>Child</option></select>
        <input name="size" placeholder="Ring size (Indian)">
        <input name="kind" placeholder="Address note (hostel / kothi)">
        <input name="bday" type="date" aria-label="Birthday">
        <input name="anni" type="date" aria-label="Anniversary">
        <button class="btn btn-gold" type="submit">Save person</button>
      </form>
      <div id="v109FaList"></div>
      <p class="v109-note">Couple sizes: save two people with ring sizes. Anniversary WhatsApp uses the date you typed.</p>`);
    function render() {
      const list = prefs().people || [];
      $('#v109FaList', view).innerHTML = list.map((x, i) => `<div class="v109-card"><b>${esc(x.name)}</b><span class="v109-note">${esc(x.rel)} · size ${esc(x.size || '—')} · ${esc(x.kind || '')}</span>
        <div class="v109-tools"><a href="${wa('Namaste Shivaa ✦ Anniversary / birthday coming for ' + x.name + ' on ' + (x.anni || x.bday || '') + '.')}" target="_blank" rel="noopener">WhatsApp the shop</a>
        <button type="button" data-i="${i}">Remove</button></div></div>`).join('') || '<p class="v109-note">No people saved yet.</p>';
    }
    render();
    $('#v109Fa', view).onsubmit = e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const pr = prefs();
      pr.people = pr.people || [];
      pr.people.push({ name: fd.get('name'), rel: fd.get('rel'), size: fd.get('size'), kind: fd.get('kind'), bday: fd.get('bday'), anni: fd.get('anni') });
      save(pr);
      e.target.reset();
      render();
    };
    $('#v109FaList', view).onclick = e => {
      const b = e.target.closest('button[data-i]'); if (!b) return;
      const pr = prefs(); pr.people.splice(+b.getAttribute('data-i'), 1); save(pr); render();
    };
  }
  function pageFestive(view) {
    const rows = [
      ['20 Oct 2026', 'Dussehra'],
      ['29 Oct 2026', 'Karva Chauth'],
      ['6 Nov 2026', 'Dhanteras'],
      ['8 Nov 2026', 'Diwali'],
      ['11 Nov 2026', 'Bhai Dooj · Gold Finale draw (house date)']
    ];
    if (quietNow()) {
      paint(view, '<h1>Quiet hours</h1><p class="lead">Promos sleep between 9 pm and 9 am IST. The calendar is still here in the morning.</p>');
      return;
    }
    paint(view, `<span class="label">2026</span><h1>Festive calendar</h1>
      <p class="lead">Dates from the public Hindu calendar (Diwali Sunday 8 Nov 2026). Bhai Dooj on this shop is 11 Nov 2026 — the Gold Finale date already on the site.</p>
      <div class="v109-grid">${rows.map(r => `<div class="v109-card"><small>${esc(r[0])}</small><b>${esc(r[1])}</b></div>`).join('')}</div>
      <a class="btn btn-outline" style="margin-top:16px" href="#/shop?tag=festive">Festive-tagged pieces</a>`);
  }
  function pageVisit(view) {
    paint(view, `<span class="label">Jayal</span><h1>Book a store visit</h1>
      <p class="lead">Shop No. 01, Main Road, Sadar Bazaar, Jayal, Nagaur, Rajasthan 341023 · 10:00–20:30 IST. We do not invent a live queue — call if you want to know if the counter is free.</p>
      <form class="v109-form" id="v109Vi">
        <input type="date" name="d" required>
        <input type="time" name="t" value="11:00">
        <input name="piece" placeholder="Piece / SKU you want to see">
        <button class="btn btn-gold" type="submit">WhatsApp the slot</button>
      </form>
      <p><a href="tel:+918905005921">Call +91 89050 05921</a></p>`);
    $('#v109Vi', view).onsubmit = e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      location.href = wa('Namaste Shivaa ✦ Store visit ' + fd.get('d') + ' ' + fd.get('t') + ' IST. Piece: ' + fd.get('piece'));
    };
  }
  function pageNri(view) {
    paint(view, `<span class="label">NRI</span><h1>Packing &amp; customs</h1>
      <p class="lead">Jewellery going abroad needs a commercial invoice, HS code, and insured courier. We do not invent a HS code here — the shop will put the right one on the invoice.</p>
      <a class="btn btn-gold" href="${wa('Namaste Shivaa ✦ NRI / overseas packing. Please share invoice + insured courier options.')}" target="_blank" rel="noopener">Ask for an NRI pack</a>`);
  }
  function pageCare(view) {
    paint(view, `<span class="label">After-sales</span><h1>Resize, polish, return slip</h1>
      <div class="v109-grid">
        <a class="v109-card" href="${wa('Namaste Shivaa ✦ Free resize request. Order / SKU: ')}" target="_blank" rel="noopener"><b>Free resize</b><span class="v109-note">After delivery · WhatsApp the SKU</span></a>
        <a class="v109-card" href="${wa('Namaste Shivaa ✦ Polish / rhodium booking. I can send a photo.')}" target="_blank" rel="noopener"><b>Polish / rhodium</b><span class="v109-note">Photo upload on WhatsApp</span></a>
        <button class="v109-card" type="button" id="v109Slip"><b>Return slip</b><span class="v109-note">Print a blank slip — fill your order id</span></button>
      </div>`);
    $('#v109Slip', view).onclick = () => {
      const w = window.open('', '_blank');
      if (!w) return;
      w.document.write('<!doctype html><body style="font-family:Georgia,serif;padding:32px"><h1>Shivaa · return slip</h1><p>Order id: __________</p><p>SKU: __________</p><p>Reason: __________</p><p>Jayal counter / insured courier. This is a slip, not an approval.</p></body>');
      w.document.close(); w.print();
    };
  }
  function pageWeigh(view) {
    paint(view, `<span class="label">Honesty</span><h1>Home scale vs ours</h1>
      <p class="lead">Kitchen scales skip the last milligram. Our counter scale is what the bill uses. A 0.05 g swing on 22K is a few tens of rupees of metal — not a conspiracy. If a piece is hallmarked, the stamped weight is the reference.</p>
      <a class="btn btn-outline" href="#/hallmark">HUID / BIS guide</a>`);
  }
  function pageKarigar(view) {
    paint(view, `<span class="label">The house</span><h1>Karigars of Jayal</h1>
      <p class="lead">Pieces are hand-finished in Jayal, Nagaur. The house does not publish individual karigar names on the site, so this page does not invent any. If you meet someone at the counter, that is the real introduction.</p>
      <a class="btn btn-outline" href="#/about">Our story</a>`);
  }
  function pageWhy(view) {
    paint(view, `<span class="label">Trust</span><h1>Why live-rate, not MRP</h1>
      <p class="lead">Gold moves. An MRP printed last month is either stale or padded. Shivaa prices metal at the live Jaipur rate, adds the making on the card, then GST. The hallmark is a laser mark + HUID — see the HUID guide for what to look for. We do not show a stock photo of “a typical stamp” and pretend it is yours.</p>
      <p>GSTIN 08AAICE5666R1ZP · CIN U32111RJ2025PTC099173 · UDYAM UDYAM-RJ-25-0086081
        <button type="button" class="btn btn-ghost btn-sm" id="v109CopyGst">Copy GSTIN</button></p>
      <a class="btn btn-outline" href="#/trust">Trust page</a>`);
    const b = $('#v109CopyGst', view);
    if (b) b.onclick = async () => {
      try { await navigator.clipboard.writeText('08AAICE5666R1ZP'); toast('GSTIN copied'); } catch (e) { toast('08AAICE5666R1ZP'); }
    };
  }
  function pageMaking(view) {
    paint(view, `<span class="label">Making</span><h1>Why this making %</h1>
      <p class="lead">Each SKU already carries its making scheme (percent or flat) from the catalogue. The % on a card is that SKU’s figure — not a “typical Jaipur rate” we made up. Open any piece for the rupee amount at today’s metal rate.</p>
      <a class="btn btn-outline" href="#/shop">See it on cards</a>`);
  }
  function pageBaby(view) {
    const list = products().filter(p => p.weightG <= 4 && p.metal === 'Gold').sort((a, b) => a.weightG - b.weightG).slice(0, 12);
    paint(view, `<span class="label">Light gold</span><h1>Baby’s first gold</h1>
      <p class="lead">Gold pieces at or under 4 g, live-priced. We do not relabel them as “kids’ jewellery” if the catalogue does not.</p>${gridOf(list)}`);
  }
  function pageCorp(view) {
    paint(view, `<span class="label">B2B / HR</span><h1>Corporate gifting</h1>
      <form class="v109-form" id="v109CoF">
        <input name="co" placeholder="Company" required>
        <input name="gst" placeholder="GSTIN">
        <input name="n" type="number" placeholder="How many pieces" min="1">
        <textarea name="note" placeholder="Budget / occasion"></textarea>
        <button class="btn btn-gold" type="submit">WhatsApp with GST invoice request</button>
      </form>`);
    $('#v109CoF', view).onsubmit = e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      location.href = wa('Namaste Shivaa ✦ Corporate gifting. Company ' + fd.get('co') + ' GSTIN ' + fd.get('gst') + ' qty ' + fd.get('n') + '. ' + fd.get('note') + ' Please GST-invoice.');
    };
  }
  function pageGroup(view) {
    paint(view, `<span class="label">Group gift</span><h1>Three UPI chips</h1>
      <p class="lead">We cannot split a UPI QR three ways in the browser. This writes a message your family can forward, each paying their share to the shop’s UPI with the same SKU in the note.</p>
      <form class="v109-form" id="v109Gr">
        <input name="sku" placeholder="SKU" required>
        <input name="n" type="number" value="3" min="2" max="8">
        <button class="btn btn-gold" type="submit">Build the message</button>
      </form><pre id="v109GrOut" style="white-space:pre-wrap"></pre>`);
    $('#v109Gr', view).onsubmit = e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const msg = 'Shivaa group gift · SKU ' + fd.get('sku') + ' · ' + fd.get('n') + ' people. Each pays their share to the shop UPI with this SKU in the remark. Live total is on shivaa.in — we will not invent a split amount.';
      $('#v109GrOut', view).textContent = msg;
    };
  }
  function pageLater(view) {
    const ids = prefs().later || [];
    const list = ids.map(byId).filter(Boolean);
    paint(view, `<span class="label">This phone</span><h1>Saved for later</h1>
      <p class="lead">Not a wishlist account — just this browser. Add to bag from the piece so size is chosen.</p>${gridOf(list)}`);
  }
  function pageTray(view) {
    const ids = prefs().tray || [];
    const list = ids.map(byId).filter(Boolean);
    paint(view, `<span class="label">This phone</span><h1>Last viewed</h1>
      <p class="lead">Up to 20 pieces you opened here. The service worker already caches photos; this list is the index.</p>${gridOf(list)}`);
  }
  function pageData(view) {
    const blob = {
      prefs: prefs(),
      user: (SH().state && SH().state.user && { name: SH().state.user.name, email: SH().state.user.email, phone: SH().state.user.phone, loyaltyPoints: SH().state.user.loyaltyPoints }) || null,
      cart: (SH().state && SH().state.cart) || [],
      when: new Date().toISOString()
    };
    paint(view, `<span class="label">DPDP-style</span><h1>Download my data</h1>
      <p class="lead">What this browser knows. Server-side orders stay on the shop’s account page.</p>
      <pre style="white-space:pre-wrap;background:#fff;border-radius:12px;padding:16px">${esc(JSON.stringify(blob, null, 2))}</pre>
      <button class="btn btn-outline" type="button" id="v109Dl">Download JSON</button>`);
    $('#v109Dl', view).onclick = () => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify(blob, null, 2)], { type: 'application/json' }));
      a.download = 'shivaa-my-data.json';
      a.click();
    };
  }
  function pageEmi(view) {
    paint(view, `<span class="label">EMI</span><h1>Print a 3 / 6 month sketch</h1>
      <p class="lead">Uses the same split the product page already shows (3 months no-cost sketch, 6 months +2%). Not a lender sanction.</p>
      <form class="v109-form" id="v109Emi"><input name="amt" type="number" placeholder="Amount (₹)" required><button class="btn btn-gold" type="submit">Print</button></form>`);
    $('#v109Emi', view).onsubmit = e => {
      e.preventDefault();
      const amt = +new FormData(e.target).get('amt') || 0;
      const w = window.open('', '_blank'); if (!w) return;
      w.document.write(`<!doctype html><body style="font-family:Georgia,serif;padding:32px"><h1>Shivaa EMI sketch</h1>
        <p>Amount ${fmt(amt)}</p><p>3 months (no-cost sketch): ${fmt(Math.round(amt / 3))}/mo</p>
        <p>6 months (×1.02 sketch): ${fmt(Math.round(amt / 6 * 1.02))}/mo</p>
        <p>Not a loan offer. Cards &amp; UPI-autopay as on the product page.</p></body>`);
      w.document.close(); w.print();
    };
  }
  function pageMetal(view) {
    const draft = prefs().metalDraft || '';
    paint(view, `<span class="label">B2B</span><h1>Fine-metal draft</h1>
      <p class="lead">Stays on this phone if the partner portal refresh would lose a scribble. Not an order until you send it.</p>
      <textarea id="v109Md" style="width:100%;min-height:180px;border-radius:12px;padding:12px">${esc(draft)}</textarea>
      <p><button class="btn btn-gold" type="button" id="v109MdSave">Save on this phone</button>
         <a class="btn btn-outline" href="${wa('Namaste Shivaa ✦ Fine-metal draft:\\n' + draft)}" target="_blank" rel="noopener">WhatsApp draft</a></p>`);
    $('#v109MdSave', view).onclick = () => { put('metalDraft', $('#v109Md', view).value); toast('Saved'); };
  }
  function pagePartnerList(view) {
    const r = rates();
    const list = products().slice().sort((a, b) => a.sku.localeCompare(b.sku));
    const rows = list.map(p => {
      const pr = price(p);
      return `<tr><td>${esc(p.sku)}</td><td>${esc(p.name)}</td><td>${esc(p.purity)}</td><td>${p.weightG}</td><td>${fmt(pr.total)}</td></tr>`;
    }).join('');
    paint(view, `<span class="label">B2B</span><h1>Price list</h1>
      <p class="lead">Live totals at ${esc(String(r.t || 'this session'))}. Partners still settle in fine metal on the portal. Print from the browser.</p>
      <p><button class="btn btn-outline" type="button" onclick="window.print()">Print</button></p>
      <table class="tanq-table"><thead><tr><th>SKU</th><th>Name</th><th>Purity</th><th>g</th><th>Live</th></tr></thead><tbody>${rows}</tbody></table>`);
  }

  const PAGES = {
    tools: pageTools, more: pageTools, studio: pageTools,
    'gift-finder': pageGift, bridal: pageBridal, 'rate-lab': pageRate,
    'old-gold': pageOldGold, family: pageFamily, festive: pageFestive,
    visit: pageVisit, nri: pageNri, 'care-book': pageCare, weigh: pageWeigh,
    karigar: pageKarigar, 'why-rate': pageWhy, making: pageMaking,
    'baby-gold': pageBaby, corporate: pageCorp, 'group-gift': pageGroup,
    later: pageLater, 'offline-tray': pageTray, 'my-data': pageData,
    'emi-sheet': pageEmi, 'metal-draft': pageMetal, 'partner-list': pagePartnerList
  };

  function registerRoutes() {
    const R = SH().routes;
    if (!R) return false;
    Object.keys(PAGES).forEach(k => {
      if (!R[k]) R[k] = function (view) { PAGES[k](view); };
    });
    return true;
  }

  function wrapRoute(name, enhance) {
    const R = SH().routes;
    if (!R || typeof R[name] !== 'function' || R[name].__v109) return;
    const orig = R[name];
    const wrapped = function (view) {
      const out = orig.apply(this, arguments);
      Promise.resolve(out).then(() => {
        try { enhance(view); } catch (e) { console.warn('[v109] ' + name, e && e.message); }
      }).catch(() => {});
      return out;
    };
    wrapped.__v109 = 1;
    R[name] = wrapped;
  }

  /* ── POTM utilbar ───────────────────────────────────────────────────── */
  function potm() {
    if (quietNow() || $('#v109Potm')) return;
    const host = $('.ub-rates') || $('.utilbar-in');
    if (!host) return;
    const p = products().filter(x => (x.tags || []).includes('bestseller'))[0] || products()[0];
    if (!p) return;
    const a = document.createElement('a');
    a.id = 'v109Potm';
    a.className = 'v109-potm';
    a.href = '#/product/' + p.id;
    a.textContent = '✦ ' + (p.name || 'Piece of the day');
    a.title = 'A bestseller already in the catalogue — not a fake drop';
    host.appendChild(a);
  }

  function a2hs() {
    toast(prefs().hi
      ? 'मेनू → होम स्क्रीन पर जोड़ें · Add to Home Screen'
      : 'Browser menu → Add to Home Screen. We cannot force the prompt.');
  }

  function footerLink() {
    const col = $('.fv-col') || $('.footer');
    if (!col || $('#v109Foot')) return;
    const a = document.createElement('a');
    a.id = 'v109Foot';
    a.href = '#/tools';
    a.textContent = 'Jewellery tools (100)';
    col.appendChild(a);
  }

  function hookTrustCopy() {
    if ((location.hash || '').indexOf('#/trust') !== 0) return;
    const view = $('#view');
    if (!view || view.querySelector('#v109CopyGst')) return;
    pageWhy(view); /* if they are on trust, still add copy on our page via hash why-rate */
  }

  function bootRoutes() {
    if (!registerRoutes()) return;
    wrapRoute('shop', shopExtras);
    wrapRoute('product', pdpExtras);
    wrapRoute('checkout', checkoutExtras);
    wrapRoute('wishlist', wishlistExtras);
    wrapRoute('account', accountExtras);
    wrapRoute('invoice', invoiceHi);
    wrapRoute('home', () => { potm(); });
  }

  function init() {
    injectCss();
    applyPrefs();
    bar();
    wrapSearch();
    bootRoutes();
    footerLink();
    setTimeout(() => { bootRoutes(); potm(); footerLink(); }, 400);
    window.addEventListener('hashchange', () => {
      setTimeout(() => {
        safe('shop', () => { if ((location.hash || '').indexOf('#/shop') === 0) shopExtras($('#view')); });
        safe('pdp', () => { if ((location.hash || '').indexOf('#/product/') === 0) pdpExtras($('#view')); });
        const page = (location.hash.replace(/^#\/?/, '').split('?')[0].split('/')[0] || '');
        if (PAGES[page]) {
          if (window._v107Redir) { clearInterval(window._v107Redir); window._v107Redir = null; }
          if ($('#view') && !$('.v109-page')) safe('page', () => PAGES[page]($('#view')));
        }
      }, 120);
    });
    /* first paint may already be shop/home */
    setTimeout(() => {
      const h = location.hash || '#/';
      if (h.indexOf('#/shop') === 0) shopExtras($('#view'));
      if (h.indexOf('#/product/') === 0) pdpExtras($('#view'));
      const page = h.replace(/^#\/?/, '').split('?')[0].split('/')[0] || '';
      if (PAGES[page]) PAGES[page]($('#view'));
      potm();
    }, 500);
  }

  /* Register new hash pages at parse time so boot()'s first route() sees them
     (DOMContentLoaded would be too late — unknown routes bounce home in 3s). */
  registerRoutes();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
