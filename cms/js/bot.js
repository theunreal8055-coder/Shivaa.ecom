/* ─── SAATHI ✦ — the Shivaa store assistant (v50) ─────────────────────────
   A sidebar chatbot that knows the store: designs, live rates, policies,
   sizes, EMI, hallmark, buyback — and can *decide*: when a customer is
   confused it asks occasion + budget and recommends real pieces with reasons.

   Runs fully client-side (no external AI key needed, works offline, instant).
   Design search uses the store API (?q=) so it scales with the catalogue.
   All product cards deep-link into the existing shop & product pages.       */
(function () {
  'use strict';
  if (window.Saathi) return;

  const $ = (q) => document.querySelector(q);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const inr = (n) => '₹' + Math.round(+n || 0).toLocaleString('en-IN');
  const api = (r) => fetch('/api/' + r).then((x) => { if (!x.ok) throw 0; return x.json(); });

  /* ── store knowledge (mirrors the live pages; edit in one place) ── */
  const FACTS = {
    ship: 'Every order ships <b class="g">tamper-sealed and fully insured</b>, anywhere in India. Dispatch within 48 hours of confirmation.',
    ret: '<b class="g">7-day easy returns</b>, no questions — and <b class="g">lifetime exchange at the live rate</b>. Your gold never loses its gold value here.',
    hallmark: 'Every piece is <b class="g">BIS hallmarked</b>. You can check any piece’s HUID yourself in the BIS Care app — the guide is under “Hallmark” in the menu. Catalogue data is never a substitute for that check.',
    emi: '<b class="g">No-cost EMI for 3 months</b>, standard EMI for 6 months on cards & UPI autopay — you’ll see the monthly figure on every product page.',
    gst: 'Bills carry <b class="g">3% GST</b> with full weight and making-charge breakup — the price table on each page shows it before you order.',
    buyback: 'Buyback & lifetime exchange settle at the <b class="g">live rate</b>, by weight and assay at our Jayal counter. Indicative values online, firm value at assay.',
    address: 'Shivaa Jewellers — Ernate Shine Jewellery Pvt. Ltd., <b class="g">Jayal, Nagaur, Rajasthan</b>. Business details & documents are on the Trust page.',
    engrave: 'Free <b class="g">engraving up to 12 characters</b> on any piece — add it on the product page (R♥S 26 works too).',
    size: 'Rings come in sizes 12–18. The <b class="g">size guide</b> on any ring page shows how to measure at home with a paper strip.',
    finale: 'The <b class="g">Gold Finale</b> is our festive draw — one entry per person, a free route as well as a purchase route, equal odds, CA-witnessed draw on 31 December 2026.',
    catalog: 'Our full catalogue of <b class="g">4,00,000+ designs</b> is being photographed and catalogued right now. Today you can browse and order the 65 signature rings — and I can search or choose for you.',
  };
  const CAT_WORDS = [
    ['rings', ['ring', 'rings', 'mudrika', 'angoothi']],
    ['bangles', ['bangle', 'kada', 'kada', 'bangal']],
    ['necklaces', ['necklace', 'haar', 'rani haar', 'choker', 'kanthi', 'set']],
    ['earrings', ['earring', 'jhumka', 'jhumki', 'chandbali', 'tops', 'bali']],
    ['mangalsutra', ['mangalsutra']],
    ['chains', ['chain', 'chains']],
    ['pendants', ['pendant', 'locket']],
    ['bracelets', ['bracelet']],
    ['nosepins', ['nose', 'nath', 'nosepin']],
  ];
  const OCCASIONS = {
    wedding: { w: ['wedding', 'bridal', 'shaadi', 'bride'], boost: ['kundan', 'rani', 'bridal', 'heavy', 'polki', 'jadau'], cat: ['necklaces', 'earrings', 'bangles', 'mangalsutra'] },
    festive: { w: ['festive', 'diwali', 'teej', 'festival', 'gangaur'], boost: ['jhumka', 'chandbali', 'festive', 'minakari'], cat: ['earrings', 'pendants', 'rings'] },
    daily: { w: ['daily', 'office', 'everyday', 'casual', 'simple'], boost: ['minimal', 'daily', 'simple', 'chain'], cat: ['rings', 'chains', 'pendants'] },
    gift: { w: ['gift', 'present', 'anniversary', 'birthday', 'return gift'], boost: ['gift', 'floral', 'om'], cat: ['pendants', 'rings', 'chains'] },
  };

  /* ── state ── */
  let products = null, rates = null, flow = null; // flow = {stage:'occasion'|'budget', occ}
  const hist = JSON.parse(localStorage.getItem('saathi_hist') || '[]');

  /* ── DOM scaffold ── */
  function mount() {
    if ($('#saathiPanel')) return;
    const fab = document.createElement('button');
    fab.id = 'saathiFab';
    fab.setAttribute('aria-label', 'Ask Saathi, the store assistant');
    fab.innerHTML = '<span class="fab-star">✦</span> Ask Saathi<span class="fab-dot" id="saathiDot"></span>';
    fab.onclick = () => open();
    const panel = document.createElement('div');
    panel.id = 'saathiPanel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Saathi store assistant');
    panel.innerHTML =
      '<div class="sa-head"><div class="sa-ava">✦</div><div><b>Saathi</b><small>knows this store · live rates · designs · policies</small></div>' +
      '<span class="sp"></span>' +
      '<button class="sa-ico" id="saathiClear" title="Start over" aria-label="Start over">↺</button>' +
      '<button class="sa-ico" id="saathiClose" title="Close" aria-label="Close">✕</button></div>' +
      '<div class="sa-msgs" id="saathiMsgs"></div>' +
      '<div class="sa-chips" id="saathiChips"></div>' +
      '<div class="sa-in"><input id="saathiIn" placeholder="Ask anything — “gold rate”, “jhumka under 50k”, “choose for me”…" autocomplete="off" enterkeyhint="send">' +
      '<button id="saathiSend" aria-label="Send">➤</button></div>' +
      '<div class="sa-foot">Saathi suggests; billing & assay follow the Jayal counter. Prices move with the live rate.</div>';
    document.body.appendChild(fab);
    document.body.appendChild(panel);
    $('#saathiClose').onclick = close;
    $('#saathiClear').onclick = () => { localStorage.removeItem('saathi_hist'); $('#saathiMsgs').innerHTML = ''; greet(true); };
    $('#saathiSend').onclick = () => send();
    $('#saathiIn').addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });
  }

  function open(q) {
    mount();
    document.body.classList.add('saathi-open');
    if (!$('#saathiMsgs').children.length) {
      hist.forEach((h) => push(h.who, h.html, h.row, false));
      if (!hist.length) greet(false);
    }
    if (q) { setTimeout(() => userSay(q), 250); }
    setTimeout(() => $('#saathiIn').focus(), 380);
  }
  function close() { document.body.classList.remove('saathi-open'); }

  /* ── message plumbing ── */
  function push(who, html, rowHtml, save = true) {
    const m = document.createElement('div');
    m.className = 'sa-m ' + who;
    m.innerHTML = html;
    $('#saathiMsgs').appendChild(m);
    if (rowHtml) {
      const wrap = document.createElement('div');
      wrap.innerHTML = rowHtml;
      $('#saathiMsgs').appendChild(wrap.firstElementChild);
    }
    $('#saathiMsgs').scrollTop = 1e9;
    if (save) {
      hist.push({ who, html, row: rowHtml || null });
      if (hist.length > 60) hist.shift();
      localStorage.setItem('saathi_hist', JSON.stringify(hist));
    }
  }
  function typing() {
    const m = document.createElement('div');
    m.className = 'sa-m bot typing';
    m.innerHTML = '<span></span><span></span><span></span>';
    $('#saathiMsgs').appendChild(m);
    $('#saathiMsgs').scrollTop = 1e9;
    return m;
  }
  function chips(list) {
    $('#saathiChips').innerHTML = list.map((c) => '<button class="sa-chip" data-q="' + esc(c) + '">' + esc(c) + '</button>').join('');
    $$('#saathiChips .sa-chip').forEach((b) => (b.onclick = () => userSay(b.dataset.q)));
  }
  const $$ = (q) => [...document.querySelectorAll(q)];

  function greet(fresh) {
    push('bot', 'Namaste 🙏 I’m <b class="g">Saathi</b> — your Shivaa guide. I know every design we sell, today’s gold rate, and every policy from hallmark to buyback.<br><br>Confused? Just say <b class="g">“choose for me”</b> and I’ll decide with you.');
    chips(['Show the signature rings', 'Today’s gold rate', 'Choose for me', 'Jhumka under ₹50K', 'Hallmark & purity', 'Shipping & returns']);
  }

  function userSay(q) {
    push('user', esc(q));
    const t = typing();
    setTimeout(() => { t.remove(); respond(q); }, 420 + Math.random() * 380);
  }
  function send() {
    const i = $('#saathiIn');
    const q = i.value.trim();
    if (!q) return;
    i.value = '';
    userSay(q);
  }

  /* ── data ── */
  async function boot() {
    if (!products) products = (await api('products').catch(() => ({ products: [] }))).products || [];
    if (!rates) rates = await api('rates').catch(() => null);
    return products;
  }
  const priceOf = (p) => p.price?.total ?? p.price ?? 0;

  function cardRow(list) {
    return '<div class="sa-row">' + list.map((p) =>
      '<button class="sa-card" data-pid="' + esc(p.id) + '"><img src="' + esc(((p.images || [])[0]) || '/images/logo.png') + '" alt="" loading="lazy" onerror="this.onerror=null;this.src=\'/images/logo.png\'">' +
      '<div class="b"><div class="t">' + esc(p.category) + '</div><div class="n">' + esc(p.name) + '</div><div class="p">' + inr(priceOf(p)) + '</div></div></button>').join('') + '</div>';
  }
  function bindCards(root) {
    $$('.sa-card').forEach((c) => {
      if (c.dataset.bound) return;
      c.dataset.bound = '1';
      c.onclick = () => { location.hash = '#/product/' + c.dataset.pid; if (window.innerWidth < 1024) close(); };
    });
    $$('.sa-more[data-h]').forEach((b) => {
      if (b.dataset.bound) return;
      b.dataset.bound = '1';
      b.onclick = () => { location.hash = b.dataset.h; if (window.innerWidth < 1024) close(); };
    });
  }
  function showList(list, moreHref, moreLabel) {
    const row = cardRow(list.slice(0, 6)) + (moreHref ? '<button class="sa-more" data-h="' + esc(moreHref) + '">' + esc(moreLabel || ('See all ' + list.length + ' in the shop →')) + '</button>' : '');
    return row;
  }

  /* ── intents ── */
  function findCat(t) {
    for (const [k, ws] of CAT_WORDS) if (ws.some((w) => t.includes(w))) return k;
    return null;
  }
  function findBudget(t) {
    let m = t.match(/(?:under|below|upto|up to|max|budget|within|around)?\s*₹\s*([\d,.]+)\s*(k|lakh|lac|l)?/);
    if (!m) m = t.match(/([\d,.]+)\s*(k|lakh|lac)\b/);
    if (!m) return null;
    let n = parseFloat(m[1].replace(/,/g, ''));
    const u = (m[2] || '').toLowerCase();
    if (u === 'k') n *= 1000;
    if (u === 'lakh' || u === 'lac' || u === 'l') n *= 100000;
    return n > 0 ? n : null;
  }
  function findOcc(t) {
    for (const [k, o] of Object.entries(OCCASIONS)) if (o.w.some((w) => t.includes(w))) return k;
    return null;
  }

  async function respond(raw) {
    const t = raw.toLowerCase().replace(/\s+/g, ' ').trim();
    await boot();

    /* guided decision flow continues */
    if (flow) {
      if (flow.stage === 'occasion') {
        const o = findOcc(t) || (t.includes('don') || t.includes('no idea') || t.includes('any') ? 'gift' : null);
        if (o) { flow.occ = o; flow.stage = 'budget'; push('bot', 'Lovely. What budget should I respect? You can type it — “under 60k”, “1 lakh” — or tap one.'); chips(['Under ₹30K', 'Under ₹60K', 'Under ₹1L', 'No limit']); return; }
      }
      if (flow.stage === 'budget') {
        const b = findBudget(t) || (t.includes('no limit') ? 1e9 : null);
        if (b) { const occ = flow.occ; flow = null; return recommend(occ, b); }
      }
      flow = null; // fall through to normal parsing
    }

    if (/^(hi|hello|hey|namaste|namaskar|good (morning|evening|afternoon))\b/.test(t)) {
      push('bot', 'Namaste 🙏 Ask me for designs, today’s rate, or “choose for me” and I’ll pick with you.');
      chips(['Show the signature rings', 'Today’s gold rate', 'Choose for me']); return;
    }
    if (t.includes('help') || t.includes('what can you')) {
      push('bot', 'I can:<br>✦ <b class="g">show designs</b> — “show jhumkas”, “rings under 40k”, “kundan”<br>✦ <b class="g">tell rates & policies</b> — gold rate, hallmark, EMI, returns, buyback, shipping<br>✦ <b class="g">decide with you</b> — “choose for me” and I’ll ask two questions and pick real pieces<br>✦ <b class="g">hand you to a human</b> on WhatsApp whenever you like.');
      chips(['Choose for me', 'Today’s gold rate', 'EMI', 'Buyback']); return;
    }
    if (/(rate|bhav|bhaw|gold price|silver price|today.*price|price of gold)/.test(t)) {
      const r = rates || {};
      const g22 = r.gold22 ?? null, g24 = r.gold24 ?? null;
      push('bot', 'Today at the Jaipur feed:<div class="rate-line"><span>22K gold</span><b class="g">' + (g22 ? inr(g22) + '/g' : 'live on the home page') + '</b></div>' +
        '<div class="rate-line"><span>24K gold</span><b class="g">' + (g24 ? inr(g24) + '/g' : '—') + '</b></div>' +
        'Every product price on the site already uses this rate, and your final bill locks it at order time.');
      chips(['Rings under ₹50K', 'What moves the price?', 'Choose for me']); return;
    }
    for (const [key, rx] of [['ship', /(ship|deliver|courier|tracking)/], ['ret', /(return|exchange|refund|cancel)/], ['hallmark', /(hallmark|huid|bis|purity|pure|asay|assay|tanq)/],
      ['emi', /\bemi\b|installment|monthl/], ['gst', /(gst|invoice|bill\b|tax)/], ['buyback', /(buyback|buy back|sell back|old gold)/],
      ['address', /(address|store|shop|visit|location|timing|open)/], ['engrave', /(engrav|name on|initials)/], ['size', /(size\b|measure|fit)/],
      ['finale', /(finale|quiz|draw|contest|lottery|win)/]]) {
      if (rx.test(t)) { push('bot', FACTS[key]); chips(['Choose for me', 'Show the signature rings', 'Talk to a human']); return; }
    }
    if (t.includes('human') || t.includes('whatsapp') || t.includes('talk to')) {
      push('bot', 'Of course — a human at the Jayal counter will take over. I’ll pre-fill our conversation so you don’t repeat yourself. <br><button class="sa-more" id="saathiWa">Open WhatsApp with my chat summary →</button>');
      setTimeout(() => { const b = $('#saathiWa'); if (b) b.onclick = () => window.open((window.Shivaa?.waLink ? Shivaa.waLink('Namaste Shivaa ✦ — I was chatting with Saathi:\n' + hist.slice(-6).map((h) => (h.who === 'user' ? 'Me: ' : 'Saathi: ') + h.html.replace(/<[^>]+>/g, ' ')).join('\n')) : 'https://wa.me/918905005921'), '_blank'); }, 0);
      return;
    }
    if (/(choose|suggest|recommend|confused|decide|which one|what should|gift for|best ring|best piece)/.test(t)) {
      const occ = findOcc(t);
      const bud = findBudget(t);
      if (occ && bud) return recommend(occ, bud);
      if (occ) { flow = { stage: 'budget', occ }; push('bot', 'Great taste-direction. What budget should I stay within?'); chips(['Under ₹30K', 'Under ₹60K', 'Under ₹1L', 'No limit']); return; }
      if (bud) { flow = { stage: 'occasion', bud }; return askOcc(bud); }
      flow = { stage: 'occasion', bud: null };
      return askOcc(null);
    }

    /* design discovery */
    const cat = findCat(t);
    const bud = findBudget(t);
    const word = (t.match(/(kundan|polki|meenakari|minakari|jadau|thewa|temple|vintage|floral|solitaire|naksha|lac|filigree|antique|modern|simple|heavy)/) || [])[0];
    let list = products.slice();
    if (cat) list = list.filter((p) => p.category === cat);
    if (bud) list = list.filter((p) => priceOf(p) <= bud * 1.08);
    if (word) list = list.filter((p) => ((p.name || '') + ' ' + (p.tags || []).join(' ') + ' ' + (p.desc || '')).toLowerCase().includes(word));
    if ((cat || bud || word) && list.length) {
      list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      push('bot', 'I found <b class="g">' + list.length + '</b> piece' + (list.length === 1 ? '' : 's') + (cat ? ' in <b class="g">' + cat + '</b>' : '') + (bud ? ' within <b class="g">' + inr(bud) + '</b>' : '') + (word ? ' with <b class="g">' + word + '</b> work' : '') + '. Tap any to see it live:');
      push('bot', '', showList(list, '#/shop' + (cat ? '?category=' + cat : '')));
      bindCards($('#saathiMsgs'));
      chips(['Choose for me', 'Today’s gold rate', cat !== 'rings' ? 'Show rings' : 'Show necklaces']); return;
    }
    if ((cat || word) && !list.length) {
      push('bot', FACTS.catalog + '<br>Meanwhile — shall I pick from the signature rings for you?');
      chips(['Choose for me', 'Show the signature rings']); return;
    }
    if (t.includes('signature') || t.includes('rings') && !cat) {
      const rings = products.filter((p) => p.category === 'rings');
      push('bot', 'Our <b class="g">65 signature rings</b> — 22K, hallmarked, four photographs each:');
      push('bot', '', showList(rings, '#/shop?category=rings'));
      bindCards($('#saathiMsgs'));
      chips(['Choose for me', 'Rings under ₹40K', 'Today’s gold rate']); return;
    }

    /* free-text search via the API (scales with the catalogue) */
    if (t.length > 3) {
      try {
        const r = await api('products?q=' + encodeURIComponent(raw.slice(0, 40)));
        const l = (r.products || []).slice(0, 6);
        if (l.length) {
          push('bot', 'From the catalogue, closest to “' + esc(raw) + '”:');
          push('bot', '', showList(l, '#/shop?q=' + encodeURIComponent(raw)));
          bindCards($('#saathiMsgs'));
          chips(['Choose for me', 'Talk to a human']); return;
        }
      } catch (e) {}
    }
    push('bot', 'I want to get this exactly right rather than guess. Try me with: <b class="g">“jhumka under 50k”</b>, <b class="g">“today’s rate”</b>, <b class="g">“choose for me”</b> — or I’ll hand you to a human.');
    chips(['Choose for me', 'Show the signature rings', 'Talk to a human', 'Hallmark & purity']);
  }

  function askOcc(bud) {
    flow = { stage: 'occasion', bud };
    push('bot', 'Happy to decide with you. First — what’s the occasion?');
    chips(['Wedding / bridal', 'Festive', 'Daily wear', 'A gift']);
  }

  async function recommend(occ, budget) {
    const O = OCCASIONS[occ] || OCCASIONS.gift;
    let list = products.slice();
    if (!list.length) { push('bot', FACTS.catalog); return; }
    const scored = list.map((p) => {
      const pr = priceOf(p);
      let s = (p.rating || 4.5);
      if (budget < 1e9) {
        if (pr > budget * 1.08) s -= 50;
        else s += 2 * (1 - pr / (budget * 1.08));
      }
      if (O.cat.includes(p.category)) s += 2;
      const hay = ((p.name || '') + ' ' + (p.tags || []).join(' ')).toLowerCase();
      s += O.boost.filter((w) => hay.includes(w)).length * 1.5;
      return { p, pr, s };
    }).sort((a, b) => b.s - a.s);
    const top = scored.slice(0, 3);
    push('bot', 'For a <b class="g">' + occ + '</b> within <b class="g">' + (budget >= 1e9 ? 'any budget' : inr(budget)) + '</b>, here is what I would choose — and why:' +
      top.map((x, i) => '<br><b class="g">' + (i + 1) + '.</b> ' + esc(x.p.name) + ' — ' + inr(x.pr) + '. ' + reason(x, occ, budget)).join('') +
      '<br><br>Tap a card to see it; or say “more” and I’ll show the next three.');
    push('bot', '', cardRow(top.map((x) => x.p)) + '<button class="sa-more" id="saathiMore">Show me three more →</button>');
    bindCards($('#saathiMsgs'));
    let nxt = 3;
    setTimeout(() => {
      const b = $('#saathiMore');
      if (b) b.onclick = () => {
        b.remove();
        push('bot', '', cardRow(scored.slice(nxt, nxt + 3).map((x) => x.p)));
        bindCards($('#saathiMsgs'));
        nxt += 3;
      };
    }, 0);
    flow = null;
    chips(['Talk to a human', 'Today’s gold rate', 'Start over']);
  }
  function reason(x, occ, budget) {
    const bits = [];
    bits.push(x.p.purity + ' ' + x.p.metal);
    if (budget < 1e9 && x.pr <= budget) bits.push('fits your budget with ' + inr(budget - x.pr) + ' to spare');
    if (OCCASIONS[occ].cat.includes(x.p.category)) bits.push('a classic ' + occ + ' choice');
    bits.push('★ ' + (x.p.rating || '4.6'));
    return bits.join(' · ');
  }

  /* ── public hooks ── */
  window.Saathi = { open, close };
  window.Shivaa = window.Shivaa || {};
  window.Shivaa.saathiOpen = (q) => open(q || '');

  mount();
  /* a gentle first nudge on mobile after 4s, once per session */
  if (!sessionStorage.getItem('saathi_nudged')) {
    setTimeout(() => {
      if (!document.body.classList.contains('saathi-open')) {
        sessionStorage.setItem('saathi_nudged', '1');
        const f = $('#saathiFab');
        if (f) f.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.08)' }, { transform: 'scale(1)' }], { duration: 700, iterations: 2 });
      }
    }, 4000);
  }
})();
