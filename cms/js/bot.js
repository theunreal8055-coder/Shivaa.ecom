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
  };
  const F = (k) => (ctx.lang === 'hi' && FACTS_HI[k]) ? FACTS_HI[k] : FACTS[k];
  const L = (en, hi) => (ctx.lang === 'hi' ? hi : en);

  /* ── state ── */
  let products = null, rates = null, flow = null;
  const ctx = { cat: null, budget: null, occ: null, last: [], lang: 'en' };
  const hist = JSON.parse(localStorage.getItem('saathi_hist2') || '[]');

  /* ── scaffold ── */
  function mount() {
    if ($('#saathiPanel')) return;
    const fab = document.createElement('button');
    fab.id = 'saathiFab';
    fab.setAttribute('aria-label', 'Ask Saathi, the store assistant');
    fab.innerHTML = '<span class="fab-star">✦</span> Ask Saathi<span class="fab-dot"></span>';
    fab.onclick = open;
    const panel = document.createElement('div');
    panel.id = 'saathiPanel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Saathi store assistant');
    panel.innerHTML =
      '<div class="sa-head"><div class="sa-ava"><span>✦</span></div>' +
      '<div><b>Saathi</b><small id="saathiTick">your Shivaa guide · designs · rates · policies</small></div>' +
      '<span class="sp"></span><button class="sa-ico" id="saathiClear" title="Start over" aria-label="Start over">↺</button>' +
      '<button class="sa-ico" id="saathiClose" title="Close" aria-label="Close">✕</button></div>' +
      '<div class="sa-msgs" id="saathiMsgs"></div>' +
      '<div class="sa-chips" id="saathiChips"></div>' +
      '<div class="sa-in"><button id="saathiMic" title="Speak" aria-label="Speak to Saathi">🎤</button><input id="saathiIn" placeholder="Try “jhumka under 50k”, “cheaper”, “add the first one”…" autocomplete="off" enterkeyhint="send">' +
      '<button id="saathiSend" aria-label="Send">➤</button></div>' +
      '<div class="sa-foot">Saathi suggests; billing & assay follow the Jayal counter. Prices move with the live rate.</div>';
    document.body.appendChild(fab);
    document.body.appendChild(panel);
    $('#saathiClose').onclick = close;
    $('#saathiClear').onclick = () => { localStorage.removeItem('saathi_hist2'); $('#saathiMsgs').innerHTML = ''; greet(); };
    $('#saathiSend').onclick = send;
    $('#saathiIn').addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });
    bindMic();
    tickRates();
    setInterval(tickRates, 120000);
  }
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
  function greet() {
    push('bot', ctx.lang === 'hi'
      ? 'नमस्ते 🙏 मैं <b class="g">साथी</b> — आपकी शिवा गाइड। मुझे हर डिज़ाइन, आज का भाव और हॉलमार्क से बायबैक तक हर पॉलिसी पता है।<br><br>समझ नहीं आ रहा? कहिए <b class="g">“मेरे लिए चुनो”</b>।'
      : 'Namaste 🙏 I’m <b class="g">Saathi</b> — your Shivaa guide. I know every design we sell, the live gold rate, and every policy from hallmark to buyback.<br><br>Confused? Say <b class="g">“choose for me”</b> and I’ll decide with you.');
    const hiTiles = ctx.lang === 'hi';
    push('bot', '', '<div class="sa-tiles">' +
      [['✦', hiTiles ? 'डिज़ाइन दिखाओ' : 'Show designs', 'show rings'], ['↻', hiTiles ? 'आज का भाव' : 'Gold rate', "today's gold rate"], ['🎁', hiTiles ? 'मेरे लिए चुनो' : 'Choose for me', 'choose for me'], ['☎', hiTiles ? 'इंसान से बात' : 'Talk to a human', 'talk to a human']]
        .map((t) => '<button class="sa-tile" data-q="' + esc(t[2]) + '"><span>' + t[0] + '</span><b>' + esc(t[1]) + '</b></button>').join('') + '</div>');
    chips(['Jhumka under ₹50K', 'Bhai Dooj gift ideas', 'Hallmark & purity', 'Shipping & returns']);
  }
  function userSay(q) { push('user', esc(q)); const t = typing(); setTimeout(() => { t.remove(); respond(q); }, 380 + Math.random() * 360); }
  function send() { const i = $('#saathiIn'); const q = i.value.trim(); if (!q) return; i.value = ''; userSay(q); }

  /* ── data & parsing ── */
  async function boot() { if (!products) products = (await api('products').catch(() => ({ products: [] }))).products || []; return products; }
  const priceOf = (p) => p.price?.total ?? p.price ?? 0;
  const hay = (p) => ((p.name || '') + ' ' + (p.tags || []).join(' ') + ' ' + (p.desc || '')).toLowerCase();

  function budgetOf(t) {
    let m = t.match(/([\d.,]+)\s*(lakh|lac|k|thousand|hazar)/);
    if (!m) m = t.match(/(?:₹|rs\.?\s)([\d.,]+)/);
    if (!m) m = t.match(/\b(half|1|one|2|two|3|three|4|four|5|five)\s*(lakh|lac|k|thousand)\b/);
    if (!m) return null;
    const wordN = { half: 0.5, one: 1, 1: 1, two: 2, 2: 2, three: 3, 3: 3, four: 4, 4: 4, five: 5, 5: 5 };
    let n = parseFloat(m[1]); if (isNaN(n)) n = wordN[m[1].toLowerCase()] ?? NaN;
    const u = (m[2] || '').toLowerCase();
    if (u === 'lakh' || u === 'lac') n *= 100000;
    if (u === 'k' || u === 'thousand' || u === 'hazar') n *= 1000;
    return n > 0 ? n : null;
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
    if (/(show more|next|more options|aur dikhao)/.test(t) && ctx.last.length) { const rest = products.filter((p) => (ctx.cat ? p.category === ctx.cat : true) && !ctx.last.includes(p.id)); push('bot', 'Here are more:'); push('bot', '', cardRow(rest, true) + feedback()); return; }
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
    for (const [key, rx] of [['ship', /(ship|deliver|courier|tracking)/], ['ret', /(return|exchange|refund|cancel)/], ['hallmark', /(hallmark|huid|bis|purity|pure|tanq|assay)/],
      ['emi', /\bemi\b|installment|monthl/], ['gst', /(gst|invoice|bill\b|tax)/], ['buyback', /(buyback|buy back|sell back|old gold)/],
      ['address', /(address|store|shop\b|visit|location|timing|open)/], ['engrave', /(engrav|initials)/], ['size', /(size\b|measure|fit)/]]) {
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
    const toks = tokens(t).filter((w) => !['show', 'rings', 'ring'].includes(w));
    let list = products.slice();
    if (ctx.cat) list = list.filter((p) => p.category === ctx.cat);
    if (ctx.budget) list = list.filter((p) => priceOf(p) <= ctx.budget * 1.08);
    if (toks.length) { list = list.map((p) => ({ p, s: scoreSearch(p, toks) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).map((x) => x.p); }
    if ((cat || bud || toks.length) && list.length) {
      list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      push('bot', 'Found <b class="g">' + list.length + '</b> piece' + (list.length === 1 ? '' : 's') + (cat ? ' in <b class="g">' + cat + '</b>' : '') + (bud ? ' within <b class="g">' + inr(bud) + '</b>' : '') + '. Tap to view — 🛍 adds straight to cart:');
      push('bot', '', cardRow(list, true) + moreBtn('#/shop' + (cat ? '?category=' + cat : ''), 'See all in the shop →') + feedback());
      chips(['Cheaper', 'Show more', 'Choose for me']); return;
    }
    if ((cat || toks.length) && !list.length) { push('bot', FACTS.catalog + '<br>Shall I pick from the signature rings instead?'); chips(['Choose for me', 'Show the signature rings']); return; }
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
    const list = products.filter((p) => p.id !== base.id && (p.category === base.category || (p.tags || []).some((x) => bt.includes(x))));
    push('bot', 'In the same family as <b class="g">' + esc(base.name) + '</b>:');
    push('bot', '', cardRow(list, true) + feedback());
  }

  async function recommend(occ, budget, note) {
    ctx.occ = occ; ctx.budget = budget;
    const O = OCC[occ] || OCC.gift;
    const scored = products.map((p) => {
      const pr = priceOf(p); let s = (p.rating || 4.5);
      if (budget < 1e9) { if (pr > budget * 1.08) s -= 50; else s += 2 * (1 - pr / (budget * 1.08)); }
      if (O.cat.includes(p.category)) s += 2;
      const h = hay(p); s += O.boost.filter((w) => h.includes(w)).length * 1.5;
      return { p, pr, s };
    }).sort((a, b) => b.s - a.s);
    const top = scored.slice(0, 3);
    push('bot', 'For a <b class="g">' + occ + '</b> within <b class="g">' + (budget >= 1e9 ? 'any budget' : inr(budget)) + '</b>' + (note ? ' (' + note + ')' : '') + ', I would choose:' +
      top.map((x, i) => '<br><b class="g">' + (i + 1) + '.</b> ' + esc(x.p.name) + ' — ' + inr(x.pr) + ' · ' + reason(x, occ, budget)).join('') +
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

  window.Saathi = { open, close, _test: { budgetOf, findCat, findOcc, tokens, scoreSearch, isHi, HI_WORD, priceOf } };
  window.Shivaa = window.Shivaa || {};
  window.Shivaa.saathiOpen = (q) => open(q || '');
  mount();
  if (!sessionStorage.getItem('saathi_nudged')) setTimeout(() => {
    if (!document.body.classList.contains('saathi-open')) { sessionStorage.setItem('saathi_nudged', '1'); $('#saathiFab')?.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.1)' }, { transform: 'scale(1)' }], { duration: 700, iterations: 2 }); }
  }, 4000);
})();
