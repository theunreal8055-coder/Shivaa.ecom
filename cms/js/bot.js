/* ─── SAATHI ✦ v2 — the Shivaa store assistant ────────────────────────────
   v2: more beautiful (live-rate header, action tiles, starred cards,
   in-bubble actions), more intelligent (synonyms, token-scoring search,
   "50 thousand"/"half lakh" numbers, context memory + follow-ups like
   "cheaper", "more like this", "add the first one"), more interactive
   (Add-to-cart / Compare / WhatsApp straight from the chat, feedback
   chips, share results).

   Fully client-side: no AI subscription, no key, works offline, instant.
   Free-text discovery goes through the store API (?q=) so it scales with
   the 4,00,000-design catalogue. Every render is esc()-escaped.          */
(function () {
  'use strict';
  if (window.Saathi) return;

  const $ = (q) => document.querySelector(q);
  const $$ = (q) => [...document.querySelectorAll(q)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const inr = (n) => '₹' + Math.round(+n || 0).toLocaleString('en-IN');
  const api = (r) => fetch('/api/' + r).then((x) => { if (!x.ok) throw 0; return x.json(); });
  const S = () => window.Shivaa || {};

  /* ── knowledge ── */
  const FACTS = {
    ship: 'Every order ships <b class="g">tamper-sealed and fully insured</b>, anywhere in India — dispatch within 48 hours.',
    ret: '<b class="g">7-day easy returns</b>, no questions — plus <b class="g">lifetime exchange at the live rate</b>.',
    hallmark: 'Every piece is <b class="g">BIS hallmarked</b>. Check any HUID yourself in the BIS Care app — the guide is under “Hallmark” in the menu.',
    emi: '<b class="g">No-cost EMI for 3 months</b>, standard EMI for 6 months on cards & UPI autopay — the monthly figure is on every product page.',
    gst: 'Bills carry <b class="g">3% GST</b> with the full weight + making-charge breakup, shown before you order.',
    buyback: 'Buyback & exchange settle at the <b class="g">live rate</b> by weight and assay at our Jayal counter.',
    address: 'Shivaa Jewellers — Ernate Shine Jewellery Pvt. Ltd., <b class="g">Jayal, Nagaur, Rajasthan</b>. Documents on the Trust page.',
    engrave: 'Free <b class="g">engraving up to 12 characters</b> — add it on the product page (R♥S 26 works).',
    size: 'Rings come in sizes 12–18; the <b class="g">size guide</b> on any ring page shows the paper-strip method.',
    finale: 'Our <b class="g">Bhai Dooj Gold Finale</b>: one customer wins <b class="g">10 g of certified 24K gold</b> in the CA-witnessed live draw on <b class="g">Bhai Dooj, 11 November 2026</b>. Three equal-odds routes — any gold piece of 3 g+, a 100 g silver order, or the free quiz. One entry per person; buying never multiplies odds.',
    catalog: 'Our full catalogue of <b class="g">4,00,000+ designs</b> is being photographed right now. Today you can order the 65 signature rings — and I can search or choose for you.',
    coupons: 'Offers run on the <b class="g">Bhai Dooj finale</b>, no-cost EMI and the <b class="g">Swarna Nidhi</b> savings plan. Coupon codes appear in your account and at checkout — tap “Talk to a human” and the desk will share today’s active offer for what you want.',
    giftcard: 'Shivaa gift cards are digital and never lose metal value — they are honoured at the <b class="g">live gold rate</b>. Ask the desk on WhatsApp to issue one for any amount.',
    refer: 'Refer & Earn: share your code from the account page, and royalty points are added to both you and the friend you bring. Your code is in <b class="g">My Account</b>.',
    video: 'Book a <b class="g">free video consultation</b> — we show pieces on camera from every angle, weigh them live and walk through the price breakup before you decide. Ask me to “talk to a human” and it gets arranged.',
    savings: '<b class="g">Swarna Nidhi</b> is our 11 + 1 monthly gold plan: save for 11 months and the 12th instalment is on us, settled in jewellery at the live rate.',
    bespoke: 'The <b class="g">Bespoke & Care studio</b> does custom designs, resizing, polishing, repair and lifetime exchange — share a photo on WhatsApp and the karigars quote.',
    designsel: '<b class="g">Design Selection</b> lets you order catalogue designs in fine metal — retail pieces ship finished, jeweller partners settle in fine grams with zero making charges.',
    making: 'Every price is <b class="g">metal weight × live rate + a fixed making charge per design</b> (+ stone value if any), with 3% GST — the full breakup prints on the product page and the bill.',
    payment: 'We accept <b class="g">UPI, Google Pay, PhonePe, cards, net-banking, WhatsApp Pay and COD</b>. Cards & UPI autopay get 3-month no-cost EMI.',
    hours: 'Jayal counter is open <b class="g">all days, 10:00 – 20:30 IST</b>. On WhatsApp the desk replies through the day.',
    account: 'Signing in takes only your <b class="g">mobile number</b> — we SMS a one-time code, no password. New numbers get an OTP too, then a quick details form.',
  };
  const SYN = { jhumki: 'jhumka', jhumka: 'jhumka', chandbali: 'chandbali', bali: 'jhumka', haar: 'necklace', kanthi: 'necklace', choker: 'choker', kada: 'bangle', bangal: 'bangle', angoothi: 'ring', mudrika: 'ring', mangalsutra: 'mangalsutra', locket: 'pendant', om: 'om', kundan: 'kundan', polki: 'polki', meenakari: 'minakari', minakari: 'minakari', jadau: 'jadau', thewa: 'thewa', temple: 'temple', floral: 'floral', solitaire: 'solitaire', antique: 'antique', simple: 'simple', heavy: 'heavy' };
  const CATS = [
    ['rings', ['ring', 'rings', 'mudrika', 'angoothi']],
    ['bangles', ['bangle', 'kada', 'bangles']],
    ['necklaces', ['necklace', 'haar', 'choker', 'kanthi']],
    ['earrings', ['earring', 'jhumka', 'jhumki', 'chandbali', 'tops', 'bali']],
    ['mangalsutra', ['mangalsutra']],
    ['chains', ['chain']],
    ['pendants', ['pendant', 'locket']],
    ['bracelets', ['bracelet']],
    ['nosepins', ['nose', 'nath']],
  ];
  const OCC = {
    wedding: { w: ['wedding', 'bridal', 'shaadi', 'bride'], boost: ['kundan', 'rani', 'bridal', 'polki', 'jadau'], cat: ['necklaces', 'earrings', 'bangles', 'mangalsutra'] },
    festive: { w: ['festive', 'diwali', 'bhai dooj', 'bhai dooj', 'teej', 'gangaur', 'festival'], boost: ['jhumka', 'chandbali', 'minakari', 'festive'], cat: ['earrings', 'pendants', 'rings'] },
    daily: { w: ['daily', 'office', 'everyday', 'casual', 'simple'], boost: ['simple', 'daily', 'chain', 'floral'], cat: ['rings', 'chains', 'pendants'] },
    gift: { w: ['gift', 'present', 'anniversary', 'birthday', 'sister', 'brother', 'rakhi'], boost: ['gift', 'floral', 'om'], cat: ['pendants', 'rings', 'chains'] },
  };

  /* ── v52: Hindi/Hinglish engine ── */
  const HI_WORD = { 'अंगूठी': 'ring', 'झुमका': 'jhumka', 'झुमकी': 'jhumka', 'हार': 'necklace', 'कंगन': 'bangle', 'चूड़ी': 'bangle', 'मंगलसूत्र': 'mangalsutra', 'बाली': 'earring', 'चेन': 'chain', 'सोना': 'gold', 'चांदी': 'silver', 'लॉकेट': 'pendant', 'नेकलेस': 'necklace', 'रिंग': 'ring' };
  const isHi = (t) => /[\u0900-\u097F]/.test(t) || /\b(kitna|kitni|kya|kaisa|kaisi|dikhao|dikhaiye|sasta|sasti|mehnga|mehngi|chahiye|batao|bataiye|kaise|kab|kahan|mujhe|mera|meri|bhai|dooj|shaadi|tohfa|karo|hain|hai)\b/.test(t);
  const FACTS_HI = {
    ship: 'हर ऑर्डर <b class="g">टैंपर-सील और पूरी तरह बीमित</b> होकर भेजा जाता है, पूरे भारत में — 48 घंटे में डिस्पैच।',
    ret: '<b class="g">7 दिन में आसान रिटर्न</b>, कोई सवाल नहीं — साथ में <b class="g">लाइफटाइम एक्सचेंज</b> लाइव रेट पर।',
    hallmark: 'हर पीस <b class="g">BIS हॉलमार्क</b> है। HUID खुद जाँचिए — BIS Care ऐप में; गाइड मेन्यू के “Hallmark” सेक्शन में है।',
    emi: '<b class="g">3 महीने नो-कॉस्ट EMI</b>, 6 महीने स्टैंडर्ड EMI — कार्ड और UPI ऑटोपे पर; मंथली आंकड़ा हर प्रोडक्ट पेज पर।',
    gst: 'बिल में <b class="g">3% GST</b> के साथ पूरा वज़न + मेकिंग चार्ज का ब्रेकअप — ऑर्डर करने से पहले दिखता है।',
    buyback: 'बायबैक और एक्सचेंज <b class="g">लाइव रेट</b> पर — वज़न और असे के हिसाब से, जयल काउंटर पर।',
    finale: 'हमारा <b class="g">भाई दूज गोल्ड फिनाले</b>: एक ग्राहक जीतेगा <b class="g">10 ग्राम सर्टिफाइड 24K सोना</b> — CA की मौजूदगी में लाइव ड्रॉ, <b class="g">भाई दूज, 11 नवंबर 2026</b> को। तीन बराबर-मौके वाले रास्ते — 3 ग्राम+ सोने की खरीद, 100 ग्राम चांदी का ऑर्डर, या फ्री क्विज़। एक व्यक्ति = एक एंट्री; खरीदारी से मौके कभी नहीं बढ़ते।',
    catalog: 'हमारा पूरा <b class="g">4,00,000+ डिज़ाइन</b> का कैटलॉग अभी फोटोग्राफ हो रहा है। आज 65 सिग्नेचर रिंग्स ऑर्डर हो सकते हैं — और मैं ढूँढने/चुनने में मदद कर सकती हूँ।',
    coupons: 'ऑफर चलती हैं <b class="g">भाई दूज फिनाले</b>, नो-कॉस्ट EMI और <b class="g">स्वर्ण निधि</b> सेविंग प्लान पर। कूपन कोड अकाउंट और चेकआउट पर मिलते हैं — “इंसान से बात” कहिए, डेस्क आज की ऑफर बता देगा।',
    savings: '<b class="g">स्वर्ण निधि</b> हमारा 11+1 मंथली गोल्ड प्लान है — 11 महीने जमा कीजिए, 12वीं किस्त हमारी तरफ से, लाइव रेट पर ज्वैलरी में सेटलमेंट।',
    bespoke: '<b class="g">बिस्पोक एंड केयर स्टूडियो</b> कस्टम डिज़ाइन, साइज़िंग, पॉलिश, रिपेयर और लाइफटाइम एक्सचेंज करता है — WhatsApp पर फोटो भेजिए, कारीगर कोटेशन देंगे।',
    payment: 'हम लेते हैं <b class="g">UPI, Google Pay, PhonePe, कार्ड, नेट-बैंकिंग, WhatsApp Pay और COD</b>। कार्ड व UPI ऑटोपे पर 3 महीने नो-कॉस्ट EMI।',
    hours: 'जयल काउंटर <b class="g">हर दिन सुबह 10 से रात 8:30</b> तक खुला रहता है। WhatsApp पर दिनभर जवाब मिलता है।',
    account: 'साइन-इन सिर्फ आपके <b class="g">मोबाइल नंबर</b> से होता है — एक OTP आता है, पासवर्ड नहीं चाहिए। नए नंबर पर भी OTP आता है, फिर एक छोटा फॉर्म भरें।',
  };
  const F = (k) => (ctx.lang === 'hi' && FACTS_HI[k]) ? FACTS_HI[k] : FACTS[k];
  const L = (en, hi) => (ctx.lang === 'hi' ? hi : en);

  /* ── state ── */
  let products = null, rates = null, flow = null;
  const ctx = { cat: null, budget: null, occ: null, last: [], lang: 'en' };
  const hist = JSON.parse(localStorage.getItem('saathi_hist2') || '[]');

  /* ── scaffold ──
     v56: Saathi lives in the sidebar menu (and quiet in-page links), not as
     a pulsing floating button. The panel gets a scrim, an always-visible
     tool dock and Esc / click-outside closing. */
  const TOOLS = [
    ['🛍', 'Designs', 'show rings'],
    ['₹', 'Live rate', "today's gold rate"],
    ['✦', 'Choose for me', 'choose for me'],
    ['📦', 'My order', 'track my order'],
    ['🔔', 'Rate alert', 'alert me when gold drops'],
    ['☎', 'Human', 'talk to a human'],
  ];
  function mount() {
    if ($('#saathiPanel')) return;
    const scrim = document.createElement('div');
    scrim.id = 'saathiScrim';
    scrim.setAttribute('aria-hidden', 'true');
    scrim.onclick = close;
    const panel = document.createElement('div');
    panel.id = 'saathiPanel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Saathi store assistant');
    panel.innerHTML =
      '<div class="sa-head"><div class="sa-ava"><span>✦</span></div>' +
      '<div><b>Saathi <span class="sa-badge">AI guide</span></b><small id="saathiTick">your Shivaa guide · designs · rates · policies</small></div>' +
      '<span class="sp"></span><button class="sa-ico" id="saathiClear" title="Start over" aria-label="Start over">↺</button>' +
      '<button class="sa-ico" id="saathiClose" title="Close" aria-label="Close">✕</button></div>' +
      '<div class="sa-tools">' + TOOLS.map((t) =>
        '<button class="sa-tool" data-q="' + esc(t[2]) + '"><span>' + t[0] + '</span><b>' + esc(t[1]) + '</b></button>').join('') + '</div>' +
      '<div class="sa-msgs" id="saathiMsgs"></div>' +
      '<div class="sa-chips" id="saathiChips"></div>' +
      '<div class="sa-in"><button id="saathiMic" title="Speak" aria-label="Speak to Saathi">🎤</button><input id="saathiIn" placeholder="Try “jhumka under 50k”, “cheaper”, “add the first one”…" autocomplete="off" enterkeyhint="send">' +
      '<button id="saathiSend" aria-label="Send">➤</button></div>' +
      '<div class="sa-foot">Saathi suggests; billing & assay follow the Jayal counter. Prices move with the live rate.</div>';
    document.body.appendChild(scrim);
    document.body.appendChild(panel);
    $('#saathiClose').onclick = close;
    $('#saathiClear').onclick = () => { localStorage.removeItem('saathi_hist2'); $('#saathiMsgs').innerHTML = ''; greet(); };
    $('#saathiSend').onclick = send;
    $('#saathiIn').addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); if (e.key === 'Escape') close(); });
    $$('.sa-tool').forEach((b) => (b.onclick = () => userSay(b.dataset.q)));
    bindMic();
    tickRates();
    setInterval(tickRates, 120000);
  }
  /* any sidebar / footer / in-page element marked data-saathi opens Saathi;
     #navSaathi is the dedicated sidebar row. One delegated listener covers
     markup that lives in index.html AND markup rendered later. */
  document.addEventListener('click', (e) => {
    const t = e.target.closest && e.target.closest('#navSaathi,[data-saathi]');
    if (!t) return;
    e.preventDefault();
    if (window._closeDrawer) { try { window._closeDrawer(); } catch (err) {} }
    open(t.getAttribute('data-saathi') || '');
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.body.classList.contains('saathi-open')) close();
  });
  /* v52: free on-device voice input — nothing is recorded server-side */
  function bindMic() {
    const mic = $('#saathiMic'); if (!mic) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { mic.style.display = 'none'; return; }
    mic.onclick = () => {
      if (mic.dataset.on) return;
      const r = new SR();
      r.lang = ctx.lang === 'hi' ? 'hi-IN' : 'en-IN';
      r.interimResults = false; r.maxAlternatives = 1;
      mic.dataset.on = '1'; mic.classList.add('live');
      push('bot', L('Listening… go ahead 🎤', 'बोलिए… मैं सुन रही हूँ 🎤'), null, false);
      r.onresult = (e) => { const txt = e.results[0][0].transcript; $('#saathiIn').value = ''; userSay(txt); };
      r.onerror = () => push('bot', L('The mic did not work on this device — typing works as always 🙏', 'माइक नहीं चला — टाइप कर दीजिए 🙏'), null, false);
      r.onend = () => { delete mic.dataset.on; mic.classList.remove('live'); };
      try { r.start(); } catch (e) { delete mic.dataset.on; mic.classList.remove('live'); }
    };
  }
  function tickRates() {
    api('rates').then((r) => { rates = r; const el = $('#saathiTick'); if (el && r?.gold22) el.innerHTML = '22K <b class="g">' + inr(r.gold22) + '/g</b> live · designs · policies'; }).catch(() => {});
  }
  function open(q) {
    mount();
    document.body.classList.add('saathi-open');
    if (!$('#saathiMsgs').children.length) {
      hist.forEach((h) => push(h.who, h.html, h.row, false, true));
      if (!hist.length) greet();
    }
    if (q) setTimeout(() => userSay(q), 260);
    setTimeout(() => $('#saathiIn').focus(), 380);
  }
  function close() { document.body.classList.remove('saathi-open'); }
  function toggle(q) { document.body.classList.contains('saathi-open') ? close() : open(q); }

  /* ── messaging ── */
  function push(who, html, row, save = true, silent) {
    const wrap = document.createElement('div');
    wrap.className = 'sa-m ' + who;
    wrap.innerHTML = html;
    $('#saathiMsgs').appendChild(wrap);
    if (row) { const w2 = document.createElement('div'); w2.innerHTML = row; $('#saathiMsgs').appendChild(w2.firstElementChild); }
    $('#saathiMsgs').scrollTop = 1e9;
    bind();
    if (save && !silent) { hist.push({ who, html, row: row || null }); if (hist.length > 80) hist.shift(); localStorage.setItem('saathi_hist2', JSON.stringify(hist)); }
  }
  const typing = () => { const m = document.createElement('div'); m.className = 'sa-m bot typing'; m.innerHTML = '<span></span><span></span><span></span>'; $('#saathiMsgs').appendChild(m); $('#saathiMsgs').scrollTop = 1e9; return m; };
  function chips(list) {
    $('#saathiChips').innerHTML = list.map((c) => '<button class="sa-chip">' + esc(c) + '</button>').join('');
    $$('#saathiChips .sa-chip').forEach((b) => (b.onclick = () => userSay(b.textContent)));
  }
  /* v56: personal + page-aware greeting */
  function pageContext() {
    const h = (location.hash || '').replace(/^#\/?/, '').split('?')[0];
    const seg = h.split('/');
    if (seg[0] === 'product') return { kind: 'product', id: seg[1] };
    if (seg[0] === 'shop') { const cat = new URLSearchParams(location.hash.split('?')[1] || '').get('category'); return { kind: 'shop', cat }; }
    if (seg[0] === 'cart' || seg[0] === 'checkout') return { kind: 'cart' };
    if (seg[0] === 'b2b' || seg[0] === 'partner') return { kind: 'b2b' };
    return { kind: seg[0] || 'home' };
  }
  function greet() {
    const me = S().state && S().state.user;
    const name = me ? String(me.name || '').split(' ')[0] : '';
    const pc = pageContext();
    push('bot', ctx.lang === 'hi'
      ? 'नमस्ते' + (name ? ' ' + esc(name) : '') + ' 🙏 मैं <b class="g">साथी</b> — आपकी शिवा गाइड। मुझे हर डिज़ाइन, आज का भाव, ऑर्डर स्टेटस और हॉलमार्क से बायबैक तक हर पॉलिसी पता है।<br><br>समझ नहीं आ रहा? कहिए <b class="g">“मेरे लिए चुनो”</b>।'
      : 'Namaste' + (name ? ', ' + esc(name) : '') + ' 🙏 I’m <b class="g">Saathi</b> — your Shivaa guide. I know every design we sell, the live gold rate, your orders, and every policy from hallmark to buyback.<br><br>Confused? Say <b class="g">“choose for me”</b> and I’ll decide with you.');
    const hiTiles = ctx.lang === 'hi';
    push('bot', '', '<div class="sa-tiles">' +
      [['✦', hiTiles ? 'डिज़ाइन दिखाओ' : 'Show designs', 'show rings'], ['↻', hiTiles ? 'आज का भाव' : 'Gold rate', "today's gold rate"], ['🎁', hiTiles ? 'मेरे लिए चुनो' : 'Choose for me', 'choose for me'], ['☎', hiTiles ? 'इंसान से बात' : 'Talk to a human', 'talk to a human']]
        .map((t) => '<button class="sa-tile" data-q="' + esc(t[2]) + '"><span>' + t[0] + '</span><b>' + esc(t[1]) + '</b></button>').join('') + '</div>');
    const c = {
      product: ['About this piece', 'Is hallmarked?', 'Returns & exchange', "Today's gold rate"],
      cart: ['How do I checkout?', 'EMI options', 'Shipping & returns', 'Talk to a human'],
      shop: ['Choose for me here', 'Rings under ₹40K', 'Sort by rating', "Today's gold rate"],
      b2b: ['Fine-metal billing', 'Live bullion desk', 'Talk to partnership desk', 'Apply for partnership'],
    }[pc.kind] || ['Jhumka under ₹50K', 'Track my order', 'Bhai Dooj gift ideas', 'Hallmark & purity'];
    chips(c);
  }
  function userSay(q) { push('user', esc(q)); const t = typing(); setTimeout(() => { t.remove(); respond(q); }, 380 + Math.random() * 360); }
  function send() { const i = $('#saathiIn'); const q = i.value.trim(); if (!q) return; i.value = ''; userSay(q); }

  /* ── data & parsing ── */
  async function boot() {
    // v59 fix: a failed first fetch used to cache an empty catalogue for the
    // whole session ("no recommendations"). Retry, and fall back to the app cache.
    for (let attempt = 0; attempt < 2 && !(products && products.length); attempt++) {
      const r = await api('products').catch(() => null);
      if (r && Array.isArray(r.products) && r.products.length) { products = r.products; break; }
      await new Promise((res) => setTimeout(res, 350));
    }
    if (!(products && products.length)) products = ((S().state || {}).productsCache || []).filter((p) => p.active !== false);
    return products || [];
  }
  const priceOf = (p) => p.price?.total ?? p.price ?? (S().price ? S().price(p).total : 0) ?? 0;
  const hay = (p) => ((p.name || '') + ' ' + (p.tags || []).join(' ') + ' ' + (p.desc || '')).toLowerCase();

  function budgetOf(tIn) {
    // v59 fix: chips read "Under ₹30K" (previously parsed as ₹30) and bare
    // amounts like "under 60000" were not understood at all.
    const t = String(tIn || '').toLowerCase();
    let m = t.match(/([\d][\d.,]*)\s*(lakh|lac|k|thousand|hazar)\b/);
    if (!m) m = t.match(/(?:₹|rs\.?\s?)([\d][\d.,]*)\s*(lakh|lac|k|thousand|hazar)?/);
    if (!m) m = t.match(/\b(half|one|two|three|four|five)\s*(lakh|lac|k|thousand)\b/);
    if (!m) {
      // bare 4+ digit figure ("60000", "1,20,000") reads as rupees
      const bare = t.match(/\b(\d{1,3}(?:,\d{2,3})+|\d{4,7})\b/);
      if (bare) m = [bare[0], bare[1].replace(/,/g, ''), ''];
    }
    if (!m) return null;
    const wordN = { half: 0.5, one: 1, two: 2, three: 3, four: 4, five: 5 };
    let n = parseFloat(String(m[1]).replace(/,/g, ''));
    if (isNaN(n)) n = wordN[(m[1] || '').toLowerCase()] ?? NaN;
    const u = (m[2] || '').toLowerCase();
    if (u === 'lakh' || u === 'lac') n *= 100000;
    if (u === 'k' || u === 'thousand' || u === 'hazar') n *= 1000;
    return n >= 100 ? n : null;   // reject implausible fragments like ₹30
  }
  function tokens(t) {
    return t.split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !['the', 'and', 'for', 'with', 'under', 'show', 'please', 'some', 'me', 'you', 'want', 'looking', 'gold', 'silver'].includes(w));
  }
  function scoreSearch(p, toks) {
    const h = hay(p); let s = 0;
    for (const w of toks) { const sw = SYN[w] || w; if (h.includes(sw)) s += 2; else if ([...h.split(/\W+/)].some((x) => x.startsWith(sw.slice(0, 4)))) s += 1; }
    return s;
  }

  /* ── rendering ── */
  function cardRow(list, withActions) {
    ctx.last = list.slice(0, 8).map((p) => p.id);
    return '<div class="sa-row">' + list.slice(0, 6).map((p, i) =>
      '<div class="sa-cardwrap"><button class="sa-card" data-pid="' + esc(p.id) + '"><img src="' + esc((p.images || [])[0] || '/images/logo.png') + '" alt="" loading="lazy" onerror="this.onerror=null;this.src=\'/images/logo.png\'">' +
      '<div class="b"><div class="t">' + esc(p.category) + ' · ' + esc(p.purity || '') + '</div><div class="n">' + esc(p.name) + '</div>' +
      '<div class="p">' + inr(priceOf(p)) + ' <span class="st">★' + (p.rating || '4.6') + '</span></div></div></button>' +
      (withActions ? '<div class="sa-acts"><button class="sa-act" data-add="' + esc(p.id) + '" title="Add to cart">🛍</button><button class="sa-act" data-cmp="' + esc(p.id) + '" title="Compare">⇄</button><span class="sa-idx">' + (i + 1) + '</span></div>' : '') +
      '</div>').join('') + '</div>';
  }
  const moreBtn = (href, label) => '<button class="sa-more" data-h="' + esc(href) + '">' + esc(label) + '</button>';

  function bind() {
    $$('.sa-card').forEach((c) => { if (c.dataset.bound) return; c.dataset.bound = 1; c.onclick = () => { location.hash = '#/product/' + c.dataset.pid; if (innerWidth < 1024) close(); }; });
    $$('.sa-more[data-h]').forEach((b) => {
      if (b.dataset.bound) return; b.dataset.bound = 1;
      b.onclick = () => {
        if (b.dataset.h === '#shareResults') {
          const picks = ctx.last.slice(0, 3).map((id) => { const pr = products.find((x) => x.id === id); return pr ? '✦ ' + pr.name + ' — ' + inr(priceOf(pr)) : null; }).filter(Boolean).join('\n');
          window.open((S().waLink ? S().waLink('Look what Saathi at Shivaa picked for me 💛\n' + picks + '\n\nshivaa.in') : 'https://wa.me/918905005921'), '_blank');
          return;
        }
        location.hash = b.dataset.h; if (innerWidth < 1024) close();
      };
    });
    $$('.sa-tile').forEach((b) => { if (b.dataset.bound) return; b.dataset.bound = 1; b.onclick = () => userSay(b.dataset.q); });
    $$('.sa-act[data-add]').forEach((b) => { if (b.dataset.bound) return; b.dataset.bound = 1; b.onclick = () => { const fn = S().pdAdd; if (fn) { fn(b.dataset.add); push('bot', 'Added to your cart 🛍 — the cart keeps live prices until checkout.'); } else push('bot', 'Open the piece and use “Add to Cart” — I couldn’t reach the cart from here.'); }; });
    $$('.sa-act[data-cmp]').forEach((b) => { if (b.dataset.bound) return; b.dataset.bound = 1; b.onclick = () => { const fn = S().toggleCompare; if (fn) fn(b.dataset.cmp); push('bot', 'Toggled in your compare tray ⚖ — open “Compare” from the menu to see them side by side.'); }; });
    $$('.sa-fb[data-v]').forEach((b) => { if (b.dataset.bound) return; b.dataset.bound = 1; b.onclick = () => push('bot', b.dataset.v === 'up' ? 'Noted with love ✦ I’ll remember what worked.' : 'Thank you — I’ll aim better next time.'); });
  }
  const feedback = () => '<div class="sa-fbrow"><span>Was this helpful?</span><button class="sa-fb" data-v="up"></button><button class="sa-fb" data-v="down">👎</button></div>';

  /* ── intents ── */
  const findCat = (t) => { for (const [k, ws] of CATS) if (ws.some((w) => t.includes(w))) return k; return null; };
  const findOcc = (t) => { for (const [k, o] of Object.entries(OCC)) if (o.w.some((w) => t.includes(w))) return k; return null; };

  async function respond(raw) {
    let t = raw.toLowerCase().replace(/\s+/g, ' ').trim();
    t = t.replace(/[\u0966-\u096F]/g, (d) => String('०१२३४५६७८९'.indexOf(d)));   // Devanagari digits → ASCII
    ctx.lang = isHi(t) ? 'hi' : 'en';
    for (const [hi, en] of Object.entries(HI_WORD)) if (t.includes(hi)) t += ' ' + en;
    await boot();

    /* follow-ups on the last recommendation */
    if (/^(cheaper|sasta|lower|less expensive)\b/.test(t) && ctx.last.length) { ctx.budget = Math.round((ctx.budget || 60000) * 0.75); return recommend(ctx.occ || 'gift', ctx.budget, 'lighter on the wallet'); }
    if (/(more like this|similar|like the first|like #1|aur aisa)/.test(t) && ctx.last.length) { const base = products.find((p) => p.id === ctx.last[0]); if (base) return similar(base); }
    if (/(show more|next|more options|aur dikhao)/.test(t) && ctx.last.length) {
      const catOk = ctx.cat && products.some((p) => p.category === ctx.cat);
      const rest = products.filter((p) => (catOk ? p.category === ctx.cat : true) && !ctx.last.includes(p.id)).sort((a, b) => (b.rating || 0) - (a.rating || 0));
      if (!rest.length) { push('bot', 'That is everything ready to order today — the full 4-lakh catalogue is being photographed. Ask a human on WhatsApp for a specific design 💛'); chips(['Talk to a human', 'Choose for me']); return; }
      push('bot', 'Here are more:'); push('bot', '', cardRow(rest, true) + feedback()); return;
    }
    if (/^(add|put) (the )?(first|second|third|1st|2nd|3rd|one|it)\b/.test(t) && ctx.last.length) {
      const n = { first: 0, '1st': 0, one: 0, it: 0, second: 1, '2nd': 1, third: 2, '3rd': 2 }[t.match(/(first|second|third|1st|2nd|3rd|one|it)/)[1]] ?? 0;
      const id = ctx.last[n]; if (id && S().pdAdd) { S().pdAdd(id); return push('bot', 'Done — added to your cart 🛍. Prices stay live until checkout.'); }
    }
    if (flow) {
      if (flow.stage === 'ratealert') {
        const em = t.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
        const tg = flow.target || parseInt(t.replace(/\D+/g, '').slice(0, 7), 10) || null;
        if (em && tg && tg > 100) {
          try {
            await fetch('/api/rates/alert', { method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: em[0], metal: flow.metal, target: tg }) });
            push('bot', 'Done ✦ I’ll email <b class="g">' + esc(em[0]) + '</b> the moment ' + (flow.metal === 'silver' ? 'silver' : '22K gold') + ' touches <b class="g">' + inr(tg) + '/g</b>.');
          } catch (e) { push('bot', 'That alert didn’t register — try once more, or ask a human to note it.'); }
          flow = null; return;
        }
        push('bot', !em ? 'Which email should the alert go to?' : 'And the target price per gram? (e.g. “9500”)');
        return;
      }
      if (flow.stage === 'occasion') { const o = findOcc(t) || (/(any|no idea|don)/.test(t) ? 'gift' : null); if (o) { flow.stage = 'budget'; flow.occ = o; push('bot', 'Lovely. What budget should I respect? Type it — “under 60k”, “1 lakh” — or tap one.'); chips(['Under ₹30K', 'Under ₹60K', 'Under ₹1L', 'No limit']); return; } }
      if (flow.stage === 'budget') { const b = budgetOf(t) || (t.includes('no limit') ? 1e9 : null); if (b) { const o = flow.occ; flow = null; return recommend(o, b); } }
      flow = null;
    }

    if (/^(hi|hello|hey|namaste|namaskar|good (morning|evening|afternoon))\b/.test(t)) { push('bot', 'Namaste 🙏 Ask for designs, the live rate, or say <b class="g">“choose for me”</b>.'); chips(['Show the signature rings', "Today's gold rate", 'Choose for me', 'Bhai Dooj offer']); return; }
    if (/(bhai ?dooj|bhaiya ?dooj|scheme|offer|contest|draw|finale|quiz|win)/.test(t)) { push('bot', F('finale')); chips(['Enter the free route', 'Choose for me', 'Is it lawful?']); return; }
    if (t.includes('lawful') || t.includes('legal')) { push('bot', 'Yes — it is run as a <b class="g">skill-based, equal-odds contest</b>: a genuine free route, one entry per person, published rules and odds, CA-witnessed draw. Purchases never multiply entries — that is the point that keeps it lawful.'); return; }
    if (/(rate|bhav|gold price|silver price|today.*price)/.test(t)) {
      const r = rates || (await api('rates').catch(() => null)) || {};
      push('bot', 'Right now at the Jaipur feed:<div class="rate-line"><span>22K gold</span><b class="g">' + inr(r.gold22 || 0) + '/g</b></div><div class="rate-line"><span>24K gold</span><b class="g">' + inr(r.gold24 || 0) + '/g</b></div><div class="rate-line"><span>Silver</span><b class="g">' + inr(r.silver || 0) + '/g</b></div>Every product price already uses this rate; your bill locks it at order time.');
      chips(['Rings under ₹50K', 'What moves the price?', 'Choose for me']); return;
    }
    if (t.includes('moves the price')) { push('bot', 'Three honest dials: <b class="g">weight × live rate</b>, a fixed <b class="g">making charge</b> per design, and any <b class="g">stone value</b> — all printed in the price table on every page, with 3% GST shown.'); return; }
    /* v54: order tracking — real data, real account */
    if (/(track my order|where is my order|order status|my order|track order)/.test(t)) {
      const A = S().api;
      if (!A) { push('bot', 'Sign in on the site first, then ask me again — I’ll pull your live order status right here.'); return; }
      try {
        const r = await A('/api/orders');
        const os = (r && r.orders) || [];
        if (!os.length) { push('bot', 'No orders on your account yet. When you order, just ask <b class="g">“where is my order?”</b> — I’ll fetch the live status.'); chips(['Choose for me', 'Show the signature rings']); return; }
        const oo = os[0];
        push('bot', 'Your latest order <b class="g">' + esc(oo.id || '') + '</b> — status: <b class="g">' + esc(oo.status || 'placed') + '</b>' + (oo.total ? ' · ' + inr(oo.total) : '') + '. Everything ships tamper-sealed and insured; the tracking number reaches you on WhatsApp/SMS the moment the courier picks up.' + moreBtn('#/track', 'Open the full tracker →'));
      } catch (e) { push('bot', 'I couldn’t reach your orders — are you signed in? The tracker page works too.' + moreBtn('#/track', 'Open the tracker →')); }
      return;
    }
    /* v54: rate alerts — "alert me when 22k drops below 9500" */
    if (/(alert|notify|remind).*(rate|gold|silver|22k|24k)|(rate|gold|silver).*(alert|drop|fall)/.test(t)) {
      const digits = parseInt(t.replace(/\D+/g, '').slice(0, 7), 10);
      flow = { stage: 'ratealert', metal: /silver/.test(t) ? 'silver' : 'gold22', target: (digits > 100 ? digits : null) };
      push('bot', 'Smart move ✦ I’ll watch the Jaipur feed for you. ' + (flow.target ? 'Target <b class="g">' + inr(flow.target) + '/g</b> — ' : '') + 'which email should the alert go to?');
      return;
    }
    /* v54: compare straight from chat — "compare 1 and 2" */
    if (/compare/.test(t) && ctx.last.length >= 2) {
      const TC = S().toggleCompare;
      if (TC) { TC(ctx.last[0]); TC(ctx.last[1]); location.hash = '#/compare'; if (innerWidth < 1024) close(); }
      else push('bot', 'Open the two pieces and use ⇄ — the compare tray is in the menu.');
      return;
    }
    /* ── v56: account, payments & shopping help ── */
    if (/(log\s?in|sign\s?in|sign\s?up|create account|my account|password|otp not|register)\b/.test(t)) {
      push('bot', F('account') + '<br>' + moreBtn('#/account', 'Open sign in / account →'));
      chips(['Talk to a human', "Today's gold rate", 'Show the signature rings']); return;
    }
    if (/(coupon|discount code|promo|offer code|voucher code)/.test(t)) {
      push('bot', F('coupons') + feedback()); chips(['Bhai Dooj offer', 'Talk to a human', 'Choose for me']); return;
    }
    if (/(gift ?card|e-?gift)/.test(t)) {
      push('bot', F('giftcard') + '<br>' + moreBtn('#/giftcard', 'Gift cards →') + feedback());
      chips(['Talk to a human', 'Choose a gift', "Today's gold rate"]); return;
    }
    if (/(refer|invite|referral|earn points)/.test(t)) {
      push('bot', F('refer') + '<br>' + moreBtn('#/refer', 'Refer & Earn →') + feedback());
      chips(['Royalty points', 'Talk to a human']); return;
    }
    if (/(video consult|video call|see on camera|appointment|book a slot)/.test(t)) {
      push('bot', F('video') + feedback()); chips(['Talk to a human', 'Choose for me']); return;
    }
    if (/(savings|swarna nidhi|swarn|nidhi|monthly plan|11 ?\+ ?1|gold plan|sip)/.test(t)) {
      push('bot', F('savings') + '<br>' + moreBtn('#/savings', 'See Swarna Nidhi →') + feedback());
      chips(["Today's gold rate", 'Talk to a human']); return;
    }
    if (/(bespoke|custom|repair|polish|restore|resize|ring size|services)/.test(t)) {
      push('bot', F('bespoke') + '<br>' + moreBtn('#/services', 'Bespoke & Care →') + feedback());
      chips(['Ring sizes', 'Talk to a human']); return;
    }
    if (/(design selection|catalogue|catalog|fine metal|order designs|pdf)/.test(t)) {
      push('bot', F('designsel') + '<br>' + moreBtn('#/catalogues', 'Design Selection →') + feedback());
      chips(['Show the signature rings', 'B2B partnership']); return;
    }
    if (/(making charge|mc |waste|how.*price|price.*work|price breakup|why.*cost)/.test(t)) {
      push('bot', F('making') + '<br>' + moreBtn('#/rates', 'See the rate & price breakup →') + feedback());
      chips(["Today's gold rate", 'EMI options']); return;
    }
    if (/(\bcod\b|cash on delivery|payment|upi|gpay|phonepe|netbanking|pay later)/.test(t)) {
      push('bot', F('payment') + feedback()); chips(['EMI options', 'Shipping & returns']); return;
    }
    if (/(timing|hours|opening time|what time|when.*open|when do|kab khulte|kab tak|kitne baje)/.test(t) && !/order|courier|deliver/.test(t)) {
      push('bot', F('hours') + '<br>' + F('address') + feedback()); chips(['Talk to a human', 'Get directions']); return;
    }
    if (/(partnership|become.*partner|jeweller|jeweler|b2b|bullion|wholesale|gst number)/.test(t)) {
      push('bot', 'The <b class="g">GST partnership</b> opens the live bullion desk, daily digital catalogues, fine-metal billing and Friday settlements. Apply with your GSTIN + OTP — approval in 48 h.' +
        '<br>' + moreBtn('#/b2b', 'Open the GST partnership form →') + feedback());
      chips(['Fine-metal billing', 'Talk to partnership desk']); return;
    }

    /* ── v56: quick navigation ── */
    const navMap = [
      [/^cart\b|my cart|go to cart|open cart|bag\b/, '#/cart', 'Your cart'],
      [/wishlist|saved pieces|favourites|favorites/, '#/wishlist', 'Your wishlist'],
      [/checkout|pay now|place order/, '#/cart', 'Checkout starts from your cart'],
      [/gift cards?/, '#/giftcard', 'Gift cards'],
      [/bridal bundle|bridal set/, '#/bundle', 'Bridal bundle'],
      [/faq|frequently asked/, '#/faq', 'FAQs'],
    ];
    for (const [rx, href, label] of navMap) {
      if (rx.test(t)) { push('bot', 'Opening <b class="g">' + esc(label) + '</b> for you now.'); chips(['Choose for me', 'Talk to a human']); location.hash = href; if (innerWidth < 1024) close(); return; }
    }
    const pc0 = pageContext();
    if (pc0.kind === 'product' && /(this piece|this ring|this one|this design|about it|good buy|worth|tell me about)/.test(t)) {
      const id = pc0.id;
      try {
        const d = await api('products/' + id);
        const p = d.product;
        push('bot', '<b class="g">' + esc(p.name) + '</b> · ' + esc(p.category) + ' · ' + esc(p.purity || p.metal) + ' · ' + (p.weightG || '?') + ' g<br>' +
          'Price right now: <b class="g">' + inr(priceOf(p)) + '</b> (live rate · ' + (p.mcValue ? 'making ' + esc(p.mcValue) + (p.mcScheme === 'percent' ? '%' : '/g') : 'fixed making') + ').<br>' +
          esc((p.desc || '').slice(0, 180)) + '<br>BIS hallmarked, 7-day returns, lifetime exchange at the live rate.' +
          moreBtn('#/product/' + id, 'Open the piece →') + feedback());
      } catch (e) { push('bot', 'Open the piece and I can discuss it — or ask “cheaper” / “more like this”.'); }
      chips(['Similar pieces', 'Cheaper', 'Add the first one']); return;
    }
    for (const [key, rx] of [['ship', /(ship|deliver|courier|tracking)/], ['ret', /(return|exchange|refund|cancel)/], ['hallmark', /(hallmark|huid|bis|purity|pure|tanq|assay)/],
      ['emi', /\bemi\b|installment|monthl/], ['gst', /(gst|invoice|bill\b|tax)/], ['buyback', /(buyback|buy back|sell back|old gold)/],
      ['address', /(address|store|shop\b|visit|location|timing|open|direction|reach|map)/], ['engrave', /(engrav|initials)/], ['size', /(size\b|measure|fit)/]]) {
      if (rx.test(t)) { push('bot', F(key) + feedback()); chips(['Choose for me', 'Show the signature rings', 'Talk to a human']); return; }
    }
    if (/(human|whatsapp|talk to|call\b)/.test(t)) {
      push('bot', 'Of course — a human at the Jayal counter takes over, with our chat attached so you never repeat yourself.<br>' + moreBtn('#wa', 'Open WhatsApp with my chat summary →'));
      setTimeout(() => { const b = $$('.sa-more[data-h="#wa"]')[0]; if (b) b.onclick = () => window.open((S().waLink ? S().waLink('Namaste Shivaa ✦ — my Saathi chat:\n' + hist.slice(-6).map((h) => (h.who === 'user' ? 'Me: ' : 'Saathi: ') + String(h.html).replace(/<[^>]+>/g, ' ')).join('\n')) : 'https://wa.me/918905005921'), '_blank'); }, 0);
      return;
    }
    if (/(choose|suggest|recommend|confused|decide|which one|what should|gift for|best (ring|piece)|pick)/.test(t)) {
      const occ = findOcc(t), bud = budgetOf(t);
      if (occ && bud) return recommend(occ, bud);
      if (occ) { flow = { stage: 'budget', occ }; push('bot', 'Great direction. What budget should I stay within?'); chips(['Under ₹30K', 'Under ₹60K', 'Under ₹1L', 'No limit']); return; }
      if (bud) { flow = { stage: 'occasion', bud }; push('bot', 'Happy to decide with you. What’s the occasion?'); chips(['Wedding / bridal', 'Festive / Bhai Dooj', 'Daily wear', 'A gift']); return; }
      flow = { stage: 'occasion' }; push('bot', L('Happy to choose with you. First — the occasion?', 'खुशी से चुनूँगी। पहले बताइए — मौका क्या है?')); chips(['Wedding / bridal', 'Festive / Bhai Dooj', 'Daily wear', 'A gift']); return;
    }

    /* discovery: category + budget + style in any order */
    const cat = findCat(t); if (cat) ctx.cat = cat;
    const bud = budgetOf(t); if (bud) ctx.budget = bud;
    const toks = tokens(t).filter((w) => !['show', 'rings', 'ring', 'piece', 'pieces'].includes(w));
    const catExists = cat ? products.some((p) => p.category === cat) : false;
    let list = products.slice();
    if (ctx.cat && catExists) list = list.filter((p) => p.category === ctx.cat);
    if (ctx.budget) list = list.filter((p) => priceOf(p) <= ctx.budget * 1.08);
    if (toks.length) { list = list.map((p) => ({ p, s: scoreSearch(p, toks) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).map((x) => x.p); }
    // v59: category not photographed yet (e.g. earrings) → search the whole
    // catalogue by style word, never a dead-end
    if (!list.length && cat && !catExists) {
      const synToks = [...new Set([...toks, ...(SYN[Object.keys(SYN).find((k) => t.includes(k))] ? [SYN[Object.keys(SYN).find((k) => t.includes(k))]] : [])])];
      const hit = products.map((p) => ({ p, s: scoreSearch(p, synToks) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).map((x) => x.p);
      if (hit.length) {
        push('bot', 'Our <b class="g">' + cat + '</b> are being photographed for the site — meanwhile these are the closest matches in the workshop catalogue:');
        push('bot', '', cardRow(hit, true) + moreBtn('#/shop', 'See the full shop →') + feedback());
        chips(['Choose for me', 'Talk to a human', 'Show the signature rings']); return;
      }
      const fav = [...products].sort((a, b) => (b.rating || 0) - (a.rating || 0));
      push('bot', FACTS.catalog + '<br>These are today’s most-loved pieces you can order right now:');
      push('bot', '', cardRow(fav, true) + moreBtn('#/shop', 'See the full shop →') + feedback());
      chips(['Choose for me', 'Talk to a human']); return;
    }
    if ((cat || bud || toks.length) && list.length) {
      list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      push('bot', 'Found <b class="g">' + list.length + '</b> piece' + (list.length === 1 ? '' : 's') + (cat && catExists ? ' in <b class="g">' + cat + '</b>' : '') + (bud ? ' within <b class="g">' + inr(bud) + '</b>' : '') + '. Tap to view — 🛍 adds straight to cart:');
      push('bot', '', cardRow(list, true) + moreBtn('#/shop' + (cat && catExists ? '?category=' + cat : ''), 'See all in the shop →') + feedback());
      chips(['Cheaper', 'Show more', 'Choose for me']); return;
    }
    if ((cat || toks.length) && !list.length) {
      // asked for a category/style + budget nothing matched → cheapest within category honestly
      const within = (cat && catExists ? products.filter((p) => p.category === cat) : products).sort((a, b) => priceOf(a) - priceOf(b));
      if (within.length) {
        push('bot', 'Nothing sits inside ' + inr(ctx.budget || bud || 0) + ' at the live rate right now — the lightest ' + (cat || 'pieces') + ' start around <b class="g">' + inr(priceOf(within[0])) + '</b>. Here are the closest:');
        push('bot', '', cardRow(within, true) + feedback());
        chips(['Cheaper', 'Choose for me', 'Talk to a human']); return;
      }
      push('bot', FACTS.catalog + '<br>Shall I pick from the signature rings instead?'); chips(['Choose for me', 'Show the signature rings']); return;
    }
    if (/signature|all rings/.test(t)) {
      const rings = products.filter((p) => p.category === 'rings');
      push('bot', 'Our <b class="g">65 signature rings</b> — 22K, hallmarked, four photographs each:');
      push('bot', '', cardRow(rings, true) + moreBtn('#/shop?category=rings', 'Open the ring shop →'));
      chips(['Choose for me', 'Rings under ₹40K', "Today's gold rate"]); return;
    }

    /* free-text via API (scales to the 4-lakh catalogue) */
    if (t.length > 3) {
      try {
        const r = await api('products?q=' + encodeURIComponent(raw.slice(0, 40)));
        const l = r.products || [];
        if (l.length) { push('bot', 'Closest to “' + esc(raw) + '”:'); push('bot', '', cardRow(l, true) + moreBtn('#/shop?q=' + encodeURIComponent(raw), 'Search the shop →') + feedback()); return; }
      } catch (e) {}
    }
    push('bot', L('I’d rather get it right than guess. Try <b class="g">“jhumka under 50k”</b>, <b class="g">“cheaper”</b>, <b class="g">“choose for me”</b> — or I’ll hand you to a human.',
      'मैं अंदाज़ा लगाने के बजाय सही जवाब देना चाहूँगी। ट्राई कीजिए <b class="g">“50 हजार से कम झुमका”</b>, <b class="g">“सस्ता दिखाओ”</b>, <b class="g">“मेरे लिए चुनो”</b> — या इंसान से बात करा दूँ।'));
    chips(['Choose for me', 'Show the signature rings', 'Talk to a human']);
  }

  function similar(base) {
    const bt = (base.tags || []).slice(0, 4);
    let list = products.filter((p) => p.id !== base.id && (p.category === base.category || (p.tags || []).some((x) => bt.includes(x))));
    if (!list.length) list = products.filter((p) => p.id !== base.id).sort((a, b) => (b.rating || 0) - (a.rating || 0));
    if (!list.length) { push('bot', 'The rest of the workshop catalogue is being photographed — say <b class="g">“choose for me”</b> and I’ll pick from today’s ready pieces.'); return; }
    push('bot', 'In the same family as <b class="g">' + esc(base.name) + '</b>:');
    push('bot', '', cardRow(list, true) + feedback());
  }

  function pickTop(scored, n) {
    // diversify: never show the same design twice in one recommendation row
    const seenName = new Set(); const out = [];
    for (const x of scored) {
      const key = String(x.p.name || '').toLowerCase().replace(/\s+/g, ' ').slice(0, 24);
      if (seenName.has(key)) continue;
      seenName.add(key); out.push(x);
      if (out.length >= n) break;
    }
    return out;
  }
  async function recommend(occ, budget, note) {
    await boot();
    ctx.occ = occ; ctx.budget = budget;
    const O = OCC[occ] || OCC.gift;
    const inStock = products.filter((p) => (p.stock ?? 1) > 0);
    const pool = inStock.length ? inStock : products;
    const scored = pool.map((p) => {
      const pr = priceOf(p); let s = (p.rating || 4.5) + Math.random() * 0.05;
      if (budget < 1e9) { if (pr > budget * 1.08) s -= 50; else s += 2 * (1 - pr / (budget * 1.08)); }
      if (O.cat.includes(p.category)) s += 2;
      const h = hay(p); s += O.boost.filter((w) => h.includes(w)).length * 1.5;
      return { p, pr, s };
    }).sort((a, b) => b.s - a.s);
    let top = pickTop(budget < 1e9 ? scored.filter((x) => x.pr <= budget * 1.08) : scored, 3);
    let honest = '';
    if (!top.length) {
      // nothing within budget: show the three closest (cheapest), say so honestly
      const byPrice = [...scored].sort((a, b) => a.pr - b.pr);
      top = pickTop(byPrice, 3);
      honest = '<br><span class="sa-honest">Most pieces today run a little above ' + inr(budget) + ' at the live rate — these are the closest. Say <b class="g">“cheaper”</b> and I’ll look at lighter weights.</span>';
    }
    if (!top.length) { push('bot', FACTS.catalog + ' ' + feedback()); chips(['Show the signature rings', 'Talk to a human']); flow = null; return; }
    push('bot', 'For a <b class="g">' + occ + '</b> within <b class="g">' + (budget >= 1e9 ? 'any budget' : inr(budget)) + '</b>' + (note ? ' (' + note + ')' : '') + ', I would choose:' +
      top.map((x, i) => '<br><b class="g">' + (i + 1) + '.</b> ' + esc(x.p.name) + ' — ' + inr(x.pr) + ' · ' + reason(x, occ, budget)).join('') + honest +
      '<br><br>🛍 adds to cart, ⇄ compares — or tell me <b class="g">“cheaper”</b> / <b class="g">“more like this”</b>.');
    push('bot', '', cardRow(top.map((x) => x.p), true) + moreBtn('#shareResults', '📤 Share these picks on WhatsApp') + feedback());
    chips(['Cheaper', 'More like this', 'Compare 1 and 2', "Today's gold rate"]);
    flow = null;
  }
  function reason(x, occ, budget) {
    const bits = [x.p.purity + ' ' + x.p.metal];
    if (budget < 1e9 && x.pr <= budget) bits.push(inr(budget - x.pr) + ' under budget');
    if (OCC[occ].cat.includes(x.p.category)) bits.push('classic ' + occ + ' pick');
    bits.push('★' + (x.p.rating || '4.6'));
    return bits.join(' · ');
  }

  window.Saathi = { open, close, toggle, _test: { budgetOf, findCat, findOcc, tokens, scoreSearch, isHi, HI_WORD, priceOf } };
  window.Shivaa = window.Shivaa || {};
  window.Shivaa.saathiOpen = (q) => open(q || '');
  mount();
})();
