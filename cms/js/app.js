/* ═══════════════════════════════════════════════════════════
   SHIVAA app.js — core SPA: router, state, pages, 3D, rates
   ═══════════════════════════════════════════════════════════ */
'use strict';
(function () {

/* ─────────── safe storage (works even in sandboxed previews) ─────────── */
const mem = {};
let _storageBlocked = false;
try { localStorage.setItem('shv_probe', '1'); localStorage.removeItem('shv_probe'); } catch (e) { _storageBlocked = true; }
const store = {
  get(k, d) { if (_storageBlocked) return k in mem ? mem[k] : d; try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return k in mem ? mem[k] : d; } },
  set(k, v) { mem[k] = v; if (_storageBlocked) return; try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
};
const token = () => store.get('shv_token', null);
const setToken = t => store.set('shv_token', t);

/* ─────────── helpers ─────────── */
window.Shivaa = { routes: {}, catCache: [], get storageBlocked() { return _storageBlocked; } };   // early shell — extended at the end of this file
/* ── scroll-lock (sheets/modals lock background — iOS safe) ── */
const _scrollLock = { n: 0, save: '' };
function lockScroll() {
  if (_scrollLock.n === 0) { _scrollLock.save = document.documentElement.style.overflow || ''; document.documentElement.classList.add('no-scroll'); }
  _scrollLock.n++;
}
function unlockScroll() {
  _scrollLock.n = Math.max(0, _scrollLock.n - 1);
  if (_scrollLock.n === 0) document.documentElement.classList.remove('no-scroll');
}
/* ── offline awareness ── */
function ensureOfflineBar() {
  if (document.getElementById('offlineBar')) return document.getElementById('offlineBar');
  const d = document.createElement('div');
  d.id = 'offlineBar'; d.className = 'offline-bar';
  d.textContent = '⚠ You are offline — browsing paused. Reconnecting automatically…';
  document.body.appendChild(d); return d;
}
addEventListener('offline', () => { ensureOfflineBar().classList.add('show'); document.body.classList.add('is-offline'); });
addEventListener('online', () => {
  ensureOfflineBar().classList.remove('show'); document.body.classList.remove('is-offline');
  toast('Back online ✦ refreshing rates…'); loadRates();
});
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => '₹' + Math.round(n).toLocaleString('en-IN');
const fmt2 = n => '₹' + (+n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dateFmt = iso => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const timeFmt = iso => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

function toast(msg, type = 'ok') {
  const t = document.createElement('div');
  t.className = 'toast ' + type; t.textContent = msg;
  $('#toastWrap').appendChild(t);
  setTimeout(() => { t.style.transition = 'opacity .5s'; t.style.opacity = 0; setTimeout(() => t.remove(), 500); }, 3200);
}
function openModal(html, cls = '') {
  const box = $('#modalBox');
  box.removeAttribute('aria-labelledby');
  box.className = 'modal ' + cls; box.innerHTML = `<button class="modal-close" onclick="Shivaa.closeModal()">✕</button>` + html;
  $('#modalOverlay').classList.add('open'); lockScroll();
}
function closeModal() { $('#modalOverlay').classList.remove('open'); unlockScroll(); }
$('#modalOverlay').addEventListener('click', e => { if (e.target.id === 'modalOverlay') closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeModal(); $('#pdfViewer').classList.remove('open'); $('#searchDrawer').classList.remove('open'); } });

/* ─────────── API client ─────────── */
async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token()) headers['Authorization'] = 'Bearer ' + token();
  let res;
  try {
    res = await fetch(path, { ...opts, headers: opts.body instanceof FormData ? (token() ? { Authorization: 'Bearer ' + token() } : {}) : headers });
  } catch (netErr) {
    const first = !document.body.classList.contains('is-offline');
    ensureOfflineBar().classList.add('show'); document.body.classList.add('is-offline');
    if (first) toast('You appear to be offline — check your connection', 'err');
    const e = new Error('No connection — please check your internet and retry');
    e.isNetwork = true; throw e;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // v31 — self-healing sessions: if the server says our token is dead,
    // drop it immediately so every page shows its login gate instead of
    // raw "Login required" errors (protects against reloads that wipe
    // storage, expired/purged tokens, and restored databases).
    if (res.status === 401 && token()) {
      setToken(''); state.user = null;
      try { updateBadges(); } catch (e) {}
    }
    throw Object.assign(new Error(data.error || 'Request failed'), { status: res.status });
  }
  return data;
}

/* ─────────── app state ─────────── */
const state = {
  user: null, rates: null, settings: null, mcTable: [],
  cart: store.get('shv_cart', []),            // [{id, qty, size, engraving}]
  localWish: store.get('shv_wish', []),
  compare: store.get('shv_compare', []),      // product ids, max 4 — local shortlist only
  productsCache: [], cacheAt: 0,
};

const CATS = {
  rings: { name: 'Rings', sub: 'Solitaires · Kundan · Bands', img: '/images/products/ring-floral.jpg' },
  necklaces: { name: 'Necklaces', sub: 'Rani haar · Chokers', img: '/images/products/necklace-rani.jpg' },
  earrings: { name: 'Earrings', sub: 'Jhumkas · Chandbalis', img: '/images/products/earrings-jhumka.jpg' },
  bangles: { name: 'Bangles & Kadas', sub: 'Carved · Textured', img: '/images/products/bangle-kada.jpg' },
  bracelets: { name: 'Bracelets', sub: 'Tennis · Charms', img: '/images/products/bracelet-tennis.jpg' },
  chains: { name: 'Chains', sub: 'Rope · Box · Sing', img: '/images/products/chain-gold.jpg' },
  pendants: { name: 'Pendants', sub: 'Om · Diamond · Locket', img: '/images/products/pendant-om.jpg' },
  mangalsutra: { name: 'Mangalsutra', sub: 'Classic · Modern', img: '/images/products/mangalsutra-trad.jpg' },
  bajubandh: { name: 'Bajubandh', sub: 'Armbands · Rajputana', img: '/images/products/bangle-kada.jpg' },
  rakhdi: { name: 'Rakhdi Set', sub: 'Borla · Tikka · Sets', img: '/images/products/earrings-chandbali.jpg' },
  aad: { name: 'Fancy Aad', sub: 'Hair ornaments · Bridal', img: '/images/products/necklace-choker.jpg' },
  sheeshphool: { name: 'Sheesh Phool', sub: 'Head ornaments', img: '/images/products/earrings-chandbali.jpg' },
  hathphool: { name: 'Hathphool', sub: 'Hand harness · Rings', img: '/images/products/ring-couple.jpg' },
  punach: { name: 'Punach', sub: 'Anklet ornaments', img: '/images/products/silver-anklet.jpg' },
  bridalanklets: { name: 'Bridal Anklets', sub: 'Payal · Kada pairs', img: '/images/products/silver-anklet.jpg' },
  nosepins: { name: 'Nose Pins', sub: 'Light · Daily', img: '/images/products/nosepin.jpg' },
  silver: { name: 'Silver 925', sub: 'Payal · Chains · Kada', img: '/images/products/silver-anklet.jpg' },
};

/* ─────────── WhatsApp integration ─────────── */
const WA_SVG = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3.9a8.1 8.1 0 0 0-6.9 12.3L4 20.2l4.1-1.05A8.1 8.1 0 1 0 12 3.9zm0 1.8a6.3 6.3 0 1 1-3.24 11.7l-.3-.18-2.42.62.64-2.35-.2-.32A6.3 6.3 0 0 1 12 5.7zM9.44 8.6c-.16 0-.42.06-.64.3-.22.24-.86.84-.86 2.05s.88 2.38 1 2.54c.12.16 1.72 2.65 4.18 3.6 2.06.8 2.48.65 2.93.6.45-.04 1.44-.59 1.64-1.16.2-.57.2-1.06.14-1.16-.06-.1-.22-.16-.46-.28-.24-.12-1.44-.71-1.66-.79-.22-.08-.38-.12-.55.12-.16.24-.63.79-.77.95-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.42-1.34-1.66-.14-.24-.02-.37.1-.49.1-.1.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.55-1.32-.75-1.8-.2-.47-.4-.4-.55-.41-.15-.01-.31-.01-.47-.01z"/></svg>';
function waNum() { return (state.settings && state.settings.whatsapp) || '918905005921'; }
function waLink(text) { return 'https://wa.me/' + waNum() + '?text=' + encodeURIComponent(String(text).slice(0, 1800)); }
function waOpen(text) {
  const url = waLink(text);
  const w = window.open(url, '_blank', 'noopener');
  if (w) return w;                       // opened directly — done
  return waFallbackModal(text, url);     // popups blocked (e.g. sandboxed preview) → QR modal
}
function waFallbackModal(text, url) {
  let qrTag = '';
  try {
    const target = url.length <= 2600 ? url : 'https://wa.me/' + waNum(); // long carts: QR the chat, copy the msg
    const qr = window.qrcode ? qrcode(0, 'L') : null;
    if (qr) { qr.addData(target); qr.make(); qrTag = qr.createSvgTag({ cellSize: 3.4, margin: 0, scalable: true }); }
  } catch (e) {}
  openModal(`
  <div class="wa-modal">
    <h3>${WA_SVG} Continue on WhatsApp</h3>
    <p class="sub">Your order message is ready — pick how you'd like to send it${url.length > 2600 ? ' (message copied to clipboard on send)' : ''}:</p>
    ${qrTag ? `<div class="wa-qr">${qrTag}<small>scan to open chat</small></div>` : ''}
    <a class="btn btn-primary btn-lg" style="margin-top:16px" target="_blank" rel="noopener" href="${url}">${WA_SVG} Open WhatsApp Chat</a>
    <div class="wa-msg">${esc(text)}</div>
    <div class="wa-alt">
      <button onclick="Shivaa.waCopy('msg')">⧉ Copy message</button>
      <button onclick="Shivaa.waCopy('num')">⧉ Copy number</button>
    </div>
  </div>`);
  window._waMsg = text;
}
window.Shivaa.waCopy = what => {
  const v = what === 'num' ? '+' + waNum() : (window._waMsg || '');
  (navigator.clipboard ? navigator.clipboard.writeText(v) : Promise.reject()).catch(() => {
    const t = document.createElement('textarea'); t.value = v; document.body.appendChild(t); t.select();
    try { document.execCommand('copy'); } catch (e) {} t.remove();
  });
  toast('Copied — paste it in the WhatsApp chat ✓');
};
function waProductMsg(p, qty, size, engraving) {
  const pr = price(p), R = state.rates;
  const L = ['✦ SHIVAA — ORDER ENQUIRY ✦', ''];
  L.push(p.name);
  L.push('SKU ' + p.sku + ' · ' + (p.metal === 'Silver' ? 'Silver 925' : p.purity + ' Gold') + ' · ' + p.weightG + ' g');
  if (size) L.push('Size: ' + size);
  if (qty > 1) L.push('Qty: ' + qty);
  if (engraving) L.push('Engraving: ' + engraving);
  L.push('');
  L.push('Live price: ' + fmt(pr.total) + ' (incl. 3% GST)');
  L.push('• Metal @ ' + fmt(pr.ratePerGram) + '/g × ' + p.weightG + 'g = ' + fmt(pr.metalValue));
  L.push('• Making charges = ' + fmt(pr.makingCharge));
  if (pr.stoneValue) L.push('• Listed stone value = ' + fmt(pr.stoneValue));
  L.push('• GST 3% = ' + fmt(pr.gst));
  L.push('');
  L.push('Rate as on ' + timeFmt(R.t) + ' (' + R.source + ' feed)');
  L.push(location.origin + '/#/product/' + p.id);
  L.push('');
  L.push('Namaste Shivaa ✦ I would like to order this piece.');
  return L.join('\n');
}
function waCartMsg() {
  const items = state.cart.map(c => ({ ...c, p: state.productsCache.find(x => x.id === c.id) })).filter(x => x.p);
  const L = ['✦ SHIVAA — CART ORDER ✦', ''];
  let sub = 0;
  items.forEach((it, i) => {
    const t = price(it.p).total * it.qty; sub += t;
    L.push((i + 1) + '. ' + it.p.name + ' × ' + it.qty + (it.size ? ' (size ' + it.size + ')' : '') + ' — ' + fmt(t));
  });
  const shipping = sub >= state.settings.freeShipAbove ? 0 : state.settings.shippingFee;
  L.push('');
  L.push('Subtotal: ' + fmt(sub) + ' (incl. GST, live rates)');
  L.push('Shipping: ' + (shipping ? fmt(shipping) : 'FREE insured'));
  L.push('Total: ' + fmt(sub + shipping));
  L.push('');
  L.push('Final bill locks at order confirmation. Rate as on ' + timeFmt(state.rates.t) + '.');
  L.push('');
  L.push('Namaste! I would like to place this order.');
  return L.join('\n');
}
function waOrderMsg(o) {
  const L = ['✦ SHIVAA — ORDER ' + o.id + ' ✦', ''];
  o.items.forEach(it => L.push('• ' + it.name + ' × ' + it.qty + (it.size ? ' (' + it.size + ')' : '') + ' — ' + fmt(it.unitPrice * it.qty)));
  L.push('');
  L.push('Subtotal: ' + fmt(o.subtotal));
  if (o.discount) L.push('Discount' + (o.coupon ? ' (' + o.coupon + ')' : '') + ': −' + fmt(o.discount));
  L.push('Shipping: ' + (o.shipping ? fmt(o.shipping) : 'FREE insured'));
  L.push('Total: ' + fmt(o.total));
  L.push('');
  L.push('Payment: to be confirmed on WhatsApp');
  L.push('Name: ' + (o.address && o.address.name || ''));
  L.push('Phone: ' + (o.address && o.address.phone || ''));
  L.push('Address: ' + (o.address && o.address.line || '') + ', ' + (o.address && o.address.city || '') + ' — ' + (o.address && o.address.pincode || ''));
  L.push('');
  L.push('Namaste Shivaa ✦ please confirm my order ' + o.id + ' and share payment details.');
  return L.join('\n');
}
window.Shivaa.waOpenCart = () => waOpen(waCartMsg());
window.Shivaa.waOpenOrder = async id => {
  let o = window._lastOrder && window._lastOrder.id === id ? window._lastOrder : null;
  if (!o) { try { o = (await api('/api/orders/' + id)).order; } catch (e) {} }
  if (o) waOpen(waOrderMsg(o));
};
window.Shivaa.waProduct = id => {
  const pd = window._pd || {};
  const p = pd.p && pd.p.id === id ? pd.p : state.productsCache.find(x => x.id === id);
  if (!p) return;
  const onPdp = !!(pd.p && pd.p.id === id);
  const size = onPdp ? ($('#sizeRow .size-pill.on')?.dataset.size || null) : null;
  waOpen(waProductMsg(p, onPdp ? (pd.qty || 1) : 1, size, onPdp ? ($('#engrave')?.value || null) : null));
};

/* ─────────── page component registry ─────────── */
const TAGS = { wedding: 'Wedding', festive: 'Festive', daily: 'Everyday', gifting: 'Gifting', mens: "Men's", heritage: 'Heritage', luxe: 'Luxe', new: 'New In', bestseller: 'Bestsellers' };

/* price computation — mirrors the server exactly */
function price(p, R) {
  R = R || state.rates || {};
  const rate = p.metal === 'Silver' ? R.silver : R['gold' + p.purity.replace('K', '')];
  const metalValue = Math.round(rate * p.weightG);
  const makingCharge = Math.round(p.mcScheme === 'percent' ? metalValue * p.mcValue / 100 : p.mcScheme === 'perGram' ? p.mcValue * p.weightG : p.mcValue);
  const stoneValue = Math.round(p.stoneValue || 0);
  const subtotal = metalValue + makingCharge + stoneValue;
  const gst = Math.round(subtotal * 0.03);
  return { ratePerGram: Math.round(rate * 100) / 100, metalValue, makingCharge, stoneValue, subtotal, gst, total: subtotal + gst };
}

/* ─────────── Feature 13: product compare + shareable shortlist ─────────── */
const COMPARE_MAX = 4;
function normalizeCompare(ids = state.compare) {
  const seen = new Set();
  return (Array.isArray(ids) ? ids : [])
    .map(id => String(id || '').trim())
    .filter(id => id && !seen.has(id) && (seen.add(id), true))
    .slice(0, COMPARE_MAX);
}
function compareItems(ids = state.compare) {
  const clean = normalizeCompare(ids);
  return clean.map(id => state.productsCache.find(p => p.id === id)).filter(Boolean);
}
function saveCompare(ids) {
  state.compare = normalizeCompare(ids);
  store.set('shv_compare', state.compare);
  updateCompareUI();
}
function isCompared(id) { return normalizeCompare(state.compare).includes(String(id)); }
function compareCountLabel(n) { return n + ' piece' + (n === 1 ? '' : 's') + ' in compare'; }
function compareLink(ids = state.compare) {
  const clean = normalizeCompare(ids);
  return location.origin + '/#/compare' + (clean.length ? '?ids=' + encodeURIComponent(clean.join(',')) : '');
}
function copyText(text) {
  return (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).catch(() => {
    const t = document.createElement('textarea');
    t.value = text; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.left = '-999px';
    document.body.appendChild(t); t.select();
    try { document.execCommand('copy'); } catch (e) {}
    t.remove();
  });
}
function stoneInfo(p) {
  const desc = String(p.stoneDesc || '').trim();
  const type = String(p.stoneType || '').trim();
  const colour = String(p.stoneColour || '').trim();
  const val = +(p.stoneValue || 0);
  if (desc) return desc + (val ? ' · ' + fmt(val) : '');
  if (val) return 'Stone value ' + fmt(val);
  if (type && type.toLowerCase() !== 'plain') return type + (colour ? ' · ' + colour : '');
  return '—';
}
function updateCompareButtons() {
  $$('.pc-compare[data-pid], .pd-compare[data-pid]').forEach(btn => {
    const on = isCompared(btn.dataset.pid);
    btn.classList.toggle('on', on);
    btn.setAttribute('aria-pressed', String(on));
    btn.setAttribute('aria-label', on ? 'Remove from compare' : 'Add to compare');
    const lbl = $('[data-compare-label]', btn);
    if (lbl) lbl.textContent = on ? 'In Compare' : 'Compare';
  });
}
function ensureCompareTray() {
  let tray = $('#compareTray');
  if (!tray) {
    tray = document.createElement('aside');
    tray.id = 'compareTray';
    tray.className = 'compare-tray';
    tray.setAttribute('role', 'region');
    tray.setAttribute('aria-label', 'Product compare shortlist');
    tray.setAttribute('aria-live', 'polite');
    document.body.appendChild(tray);
  }
  return tray;
}
function updateCompareUI() {
  state.compare = normalizeCompare(state.compare);
  if (state.productsCache.length) {
    const valid = state.compare.filter(id => state.productsCache.some(p => p.id === id));
    if (valid.length !== state.compare.length) { state.compare = valid; store.set('shv_compare', state.compare); }
  }
  const items = compareItems();
  const n = state.compare.length;
  const badge = $('#cmpCount');
  if (badge) { badge.textContent = n; badge.hidden = !n; }
  const cmpBtn = $('#cmpBtn');
  if (cmpBtn) {
    cmpBtn.classList.toggle('on', n > 0);
    cmpBtn.setAttribute('aria-label', n ? 'Open compare shortlist — ' + compareCountLabel(n) : 'Compare shortlist');
  }
  updateCompareButtons();
  const tray = ensureCompareTray();
  if (!n || document.body.dataset.page === 'compare') { tray.hidden = true; return; }
  const thumbs = items.map(p => `
    <span class="ct-thumb">
      <a href="#/product/${p.id}" aria-label="Open ${esc(p.name)}"><img src="${p.images[0]}" alt=""></a>
      <button type="button" onclick="Shivaa.removeCompare('${p.id}')" aria-label="Remove ${esc(p.name)} from compare">×</button>
    </span>`).join('');
  tray.innerHTML = `
    <div class="compare-tray-in">
      <div class="compare-tray-copy"><b>Compare shortlist</b><small>${compareCountLabel(n)} · max ${COMPARE_MAX}</small></div>
      <div class="compare-tray-thumbs">${thumbs}</div>
      <div class="compare-tray-actions">
        <a class="btn btn-primary btn-sm" href="#/compare">Compare</a>
        <button type="button" class="btn btn-ghost btn-sm" onclick="Shivaa.clearCompare()">Clear</button>
      </div>
    </div>`;
  tray.hidden = false;
}
function rerenderComparePage() {
  if (location.hash.startsWith('#/compare')) pages.compare($('#view'), new URLSearchParams());
}
function toggleCompare(id) {
  const pid = String(id || '');
  const p = state.productsCache.find(x => x.id === pid);
  if (!p) return;
  const list = normalizeCompare(state.compare);
  if (list.includes(pid)) {
    saveCompare(list.filter(x => x !== pid));
    toast('Removed from compare');
  } else {
    if (list.length >= COMPARE_MAX) { toast('Compare holds 4 pieces — remove one to add another', 'err'); return; }
    saveCompare([...list, pid]);
    toast('Added to compare ✦');
  }
  rerenderComparePage();
}
function removeCompare(id) {
  const p = state.productsCache.find(x => x.id === id);
  saveCompare(normalizeCompare(state.compare).filter(x => x !== id));
  toast(p ? 'Removed ' + p.name + ' from compare' : 'Removed from compare');
  rerenderComparePage();
}
function clearCompare() {
  saveCompare([]);
  toast('Compare shortlist cleared');
  rerenderComparePage();
}
function copyCompareLink() {
  const items = compareItems();
  if (!items.length) return toast('Add a piece to compare first', 'err');
  copyText(compareLink(items.map(p => p.id))).then(() => toast('Shortlist link copied ✦'));
}
function waCompareMsg() {
  const items = compareItems();
  if (!items.length) { toast('Add a piece to compare first', 'err'); return ''; }
  const L = ['✦ SHIVAA — PRODUCT SHORTLIST ✦', '', 'Please help me compare these shortlisted pieces:', ''];
  let total = 0;
  items.forEach((p, i) => {
    const pr = price(p); total += pr.total;
    L.push((i + 1) + '. ' + p.name);
    L.push('SKU ' + (p.sku || p.id) + ' · ' + (p.metal === 'Silver' ? 'Silver 925' : p.purity + ' Gold') + ' · ' + p.weightG + ' g');
    L.push('Live price: ' + fmt(pr.total) + ' (incl. 3% GST)');
    L.push(location.origin + '/#/product/' + p.id);
    L.push('');
  });
  L.push('Current combined shortlist value: ' + fmt(total) + ' (incl. 3% GST; final bill locks at order confirmation).');
  L.push('Shortlist link: ' + compareLink(items.map(p => p.id)));
  L.push('');
  L.push('Namaste Shivaa ✦ please guide me on these pieces.');
  return L.join('\n');
}
function waCompare() { const msg = waCompareMsg(); if (msg) waOpen(msg); }

/* ─────────── header widgets ─────────── */
function updateBadges() {
  const n = state.cart.reduce((a, i) => a + i.qty, 0);
  const cc = $('#cartCount'); if (cc) { cc.textContent = n; cc.hidden = !n; }
  refreshWishBadge();
  updateCompareUI();
}
async function refreshWishBadge() {
  let wl = state.localWish;
  if (state.user) { try { const r = await api('/api/wishlist'); wl = r.wishlist; } catch (e) {} }
  const wc = $('#wishCount'); if (wc) { wc.textContent = wl.length; wc.hidden = !wl.length; }
}
function cartCount() { return state.cart.reduce((a, i) => a + i.qty, 0); }
const isPartner = () => !!(state.user && (state.user.role === 'partner' || state.user.role === 'admin'));

/* ── v35 — partner portal always reachable ──
   Once a jeweller is signed in, the portal is one tap away from EVERY page:
   emerald pill in the header, the drawer & utility-bar links transform into
   "Partner Portal", and the account page grows a portal tile. Logged out →
   everything reverts to the public "For Jewellers" wording. */
function updatePartnerUI() {
  const p = isPartner();
  const pill = $('#portalPill'); if (pill) pill.hidden = !p;
  const row = $('#mainNav .nav-jwl');
  if (row) {
    const b = row.querySelector('b'), small = row.querySelector('small');
    row.setAttribute('href', p ? '#/partner' : '#/b2b');
    if (b) b.textContent = p ? 'Partner Portal' : 'For Jewellers';
    if (small) small.textContent = p ? 'Bullion desk · design selection · schemes' : 'GST partnership · bullion desk · schemes';
  }
  const ub = $('.ub-jwl');
  if (ub) { ub.setAttribute('href', p ? '#/partner' : '#/b2b'); ub.innerHTML = p ? 'B2B Portal <span>✦</span>' : 'For Jewellers <span>✦</span>'; }
}
window.Shivaa.updatePartnerUI = updatePartnerUI;

/* ─────────── cart ops ─────────── */
function addToCart(id, qty = 1, size = null, engraving = null) {
  const key = i => i.id + '|' + (i.size || '');
  const item = { id, qty, size, engraving };
  const ex = state.cart.find(i => key(i) === key(item));
  if (ex) ex.qty += qty; else state.cart.push(item);
  store.set('shv_cart', state.cart);
  updateBadges(); toast('Added to cart');
}
async function toggleWish(id) {
  if (!state.user) {
    state.localWish = state.localWish.includes(id) ? state.localWish.filter(x => x !== id) : [...state.localWish, id];
    store.set('shv_wish', state.localWish); refreshWishBadge();
    $$('.pc-wish[data-pid="' + id + '"]').forEach(b => b.classList.toggle('on'));
    return;
  }
  const on = $$(`.pc-wish[data-pid="${id}"]`)[0]?.classList.contains('on');
  await api('/api/wishlist', { method: 'POST', body: JSON.stringify({ id, add: !on }) });
  $$(`.pc-wish[data-pid="${id}"]`).forEach(b => b.classList.toggle('on', !on));
  refreshWishBadge(); toast(!on ? 'Saved to wishlist' : 'Removed from wishlist');
}
const isWished = id => state.user ? null : state.localWish.includes(id); // null = unknown(server), handled in card

/* ─────────── 3D + motion helpers ─────────── */
function bindTilt(scope = document) {
  // v42: skip tilt on mobile/touch — causes vibration, flicker, scroll-jank
  if (('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (innerWidth <= 820)) return;
  $$('.p-card, .cat-card, .poster, .testi', scope).forEach(card => {
    if (card._tilt) return; card._tilt = true;
    card.addEventListener('mousemove', e => {
      const r = card.getBoundingClientRect();
      const TI = +card.dataset.tilt || 1;
      const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      card.style.transform = `perspective(900px) rotateX(${(0.5 - py) * 7 * TI}deg) rotateY(${(px - 0.5) * 9 * TI}deg) translateY(-4px)`;
      const g = card.querySelector('.glare');
      if (g) { g.style.setProperty('--gx', px * 100 + '%'); g.style.setProperty('--gy', py * 100 + '%'); }
    });
    card.addEventListener('mouseleave', () => { card.style.transform = ''; });
  });
}
function bindReveal(scope = document) {
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.12 });
  $$('.rv', scope).forEach(el => io.observe(el));
}
function bindCountdown(el, target) {
  const tick = () => {
    const d = Math.max(0, target - Date.now());
    const days = Math.floor(d / 864e5), hrs = Math.floor(d % 864e5 / 36e5), min = Math.floor(d % 36e5 / 6e4), sec = Math.floor(d % 6e4 / 1e3);
    if (!document.body.contains(el)) return clearInterval(iv);
    el.innerHTML = [[days, 'Days'], [hrs, 'Hrs'], [min, 'Min'], [sec, 'Sec']].map(x => `<div class="fc-cell"><b>${String(x[0]).padStart(2, '0')}</b><span>${x[1]}</span></div>`).join('');
  };
  const iv = setInterval(tick, 1000); tick();
}

/* ─────────── poster carousel ─────────── */
function initCarousel() {
  const car = $('#heroCarousel'); if (!car) return;
  clearInterval(window._carTimer);
  const track = $('#cTrack'), slides = $$('.c-slide', car), n = slides.length;
  const dots = $('#cDots');
  dots.innerHTML = slides.map((_, i) => `<span class="c-dot ${i === 0 ? 'on' : ''}" data-i="${i}"></span>`).join('');
  let idx = 0;
  const go = i => {
    idx = (i + n) % n;
    track.style.transform = `translateX(-${idx * 100}%)`;
    $$('.c-dot', dots).forEach((d, j) => d.classList.toggle('on', j === idx));
    // mark the visible slide so its Ken-Burns zoom + copy reveal run only there
    slides.forEach((sl, j) => {
      sl.classList.toggle('on', j === idx);
      sl.setAttribute('aria-hidden', j === idx ? 'false' : 'true');
    });
  };
  go(0);
  const next = () => go(idx + 1), prev = () => go(idx - 1);
  $('.c-next', car).onclick = next; $('.c-prev', car).onclick = prev;
  $$('.c-dot', dots).forEach(d => d.onclick = () => go(+d.dataset.i));
  const start = () => {
    // v42: slower auto-advance on mobile (12s vs 5.5s desktop) so it glides, not jumps
    const _mob = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (innerWidth <= 820);
    const interval = _mob ? 12000 : 5500;
    window._carTimer = setInterval(next, interval);
  };
  const stop = () => clearInterval(window._carTimer);
  car.addEventListener('mouseenter', stop);
  car.addEventListener('mouseleave', start);
  let sx = null;
  car.addEventListener('pointerdown', e => { sx = e.clientX; stop(); });
  car.addEventListener('pointerup', e => {
    if (sx == null) return;
    const dx = e.clientX - sx;
    if (Math.abs(dx) > 42) (dx < 0 ? next : prev)();
    sx = null; start();
  });
  start();
}

/* ─────────── 3D gold ring (hero canvas) ─────────── */
function startRing3D(canvas) {
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, dpr = Math.min(devicePixelRatio || 1, 2);
  function size() {
    const r = canvas.parentElement.getBoundingClientRect();
    W = r.width; H = r.height;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  size(); addEventListener('resize', size);

  // torus band points
  const pts = [];
  const N1 = 120, N2 = 16, R = 1, r = 0.16;
  for (let i = 0; i < N1; i++) for (let j = 0; j < N2; j++) {
    const a = i / N1 * Math.PI * 2, b = j / N2 * Math.PI * 2;
    pts.push({
      x: (R + r * Math.cos(b)) * Math.cos(a),
      y: r * Math.sin(b),
      z: (R + r * Math.cos(b)) * Math.sin(a),
      band: true, sz: 1.6, tw: Math.random() * Math.PI * 2,
    });
  }
  // prong-set diamond on top of band
  const gem = [];
  for (let i = 0; i < 130; i++) {
    const a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random());
    gem.push({ x: rr * 0.24 * Math.cos(a), y: 1.02 + Math.random() * 0.3 - 0.15, z: rr * 0.24 * Math.sin(a), band: false, sz: 2.1, tw: Math.random() * Math.PI * 2 });
  }
  // float sparkles around
  const sparks = [];
  for (let i = 0; i < 90; i++) sparks.push({ x: (Math.random() - .5) * 4, y: (Math.random() - .5) * 3.4, z: (Math.random() - .5) * 3, p: Math.random() * Math.PI * 2 });

  let ax = -0.45, ay = 0, vx = 0, vy = 0.004, drag = null, t = 0;
  canvas.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, ax, ay }; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', e => {
    if (!drag) return;
    ay = drag.ay + (e.clientX - drag.x) * 0.011;
    ax = Math.max(-1.4, Math.min(1.4, drag.ax + (e.clientY - drag.y) * 0.011));
  });
  addEventListener('pointerup', () => drag = null);

  function rot(p) {
    let { x, y, z } = p;
    let x1 = x * Math.cos(ay) + z * Math.sin(ay), z1 = -x * Math.sin(ay) + z * Math.cos(ay);
    let y1 = y * Math.cos(ax) - z1 * Math.sin(ax), z2 = y * Math.sin(ax) + z1 * Math.cos(ax);
    return { x: x1, y: y1, z: z2 };
  }
  function frame() {
    t += 0.016;
    if (!drag) ay += vy;
    ctx.clearRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2 + 6, scale = Math.min(W, H) * 0.185;
    const bob = Math.sin(t * 0.9) * 8;
    const all = [...pts.map(p => ({ ...p, ...rot(p) })), ...gem.map(p => ({ ...p, ...rot(p) }))];
    // sparkles
    for (const s of sparks) {
      const q = rot(s);
      const pr = 2.6 / (3.2 - q.z);
      const a = 0.25 + 0.55 * Math.abs(Math.sin(t * 2 + s.p));
      ctx.fillStyle = `rgba(240,214,150,${a * 0.7})`;
      ctx.beginPath(); ctx.arc(cx + q.x * scale, cy + q.y * scale + bob, pr * 1.7, 0, 7); ctx.fill();
    }
    all.sort((a, b) => a.z - b.z);
    for (const p of all) {
      const pr = 2.9 / (3.4 - p.z);
      const X = cx + p.x * scale, Y = cy + p.y * scale + bob;
      const depth = (p.z + 1.15) / 2.3;
      if (p.band) {
        const tw = 0.5 + 0.5 * Math.sin(t * 5 + p.tw);
        const rr = Math.round(158 + 60 * depth + 70 * tw * depth), gg = Math.round(108 + 55 * depth + 60 * tw * depth), bb = Math.round(38 + 30 * depth + 45 * tw * depth);
        ctx.fillStyle = `rgba(${rr},${gg},${bb},${0.32 + 0.6 * depth})`;
        ctx.beginPath(); ctx.arc(X, Y, Math.max(0.5, p.sz * pr * 0.52), 0, 7); ctx.fill();
      } else {
        const tw = Math.sin(t * 7 + p.tw);
        const w = Math.abs(tw) > 0.86 ? p.sz * pr * 2.4 : p.sz * pr * 0.85;
        ctx.fillStyle = tw > 0 ? `rgba(255,250,235,${0.5 + 0.5 * depth})` : `rgba(212,175,90,${0.35 + 0.55 * depth})`;
        ctx.beginPath(); ctx.arc(X, Y, Math.max(0.4, w), 0, 7); ctx.fill();
      }
    }
    requestAnimationFrame(frame);
  }
  frame();
}

/* ─────────── live rates ─────────── */
async function loadRates() {
  try {
    const r = await api('/api/rates');
    state.rates = { ...r, ...(r.jaipur || {}) };  // storefront prices = Jaipur market rates
    renderTicker(); document.dispatchEvent(new CustomEvent('rates'));
  } catch (e) {}
}
function renderTicker() {
  const R = state.rates; if (!R) return;
  const el = $('#utilRates'); if (!el) return;
  const h = R.history || [];
  const prev = h.length > 1 ? h[h.length - 2] : null;
  const chg = (a, b) => {
    if (prev == null) return '';
    const d = a - b;
    return `<i class="${d >= 0 ? 'up' : 'down'}">${d >= 0 ? '▲' : '▼'}${Math.abs(d) >= 10 ? Math.round(Math.abs(d)) : Math.abs(d).toFixed(1)}</i>`;
  };
  el.innerHTML =
    `<span class="ub-live"><span class="live-dot"></span>JAIPUR LIVE</span>` +
    `<span>Gold 22K <b>${fmt(R.gold22)}/g</b> ${chg(R.gold22, prev && prev.gold22)}</span>` +
    `<span class="hide-sm">Gold 18K <b>${fmt(R.gold18)}/g</b> ${chg(R.gold18, prev && prev.gold18)}</span>` +
    `<span>Silver <b>${fmt2(R.silver)}/g</b> ${chg(R.silver, prev && prev.silver)}</span>`;
}

/* ─────────── category slider v2 (image cards, Tanishq-inspired) ─────────── */
const CATBAR = [
  { label: 'All Jewellery', href: '#/shop', img: '/images/products/ring-floral.jpg' },
  ...Object.entries(CATS).map(([k, c]) => ({ label: c.name, href: '#/shop?category=' + k, img: c.img })),
  { label: 'Under ₹50K', href: '#/shop?max=50000', img: '/images/products/pendant-om.jpg' },
  { label: 'New In', href: '#/shop?tag=new', img: '/images/products/mangalsutra-modern.jpg' },
];
function catBarHTML() {
  return `<div class="cb-wrap"><button class="cb-arrow cb-prev" aria-label="Previous">‹</button><div class="catbar2">` +
    CATBAR.map(c => `<a href="${c.href}" class="cb-item"><span class="cb-img"><img src="${c.img}" alt="${c.label}" loading="lazy"><i class="cb-ring"></i></span><b>${c.label}</b></a>`).join('') +
    `</div><button class="cb-arrow cb-next" aria-label="Next">›</button></div>`;
}
function initCatbar() {
  $$('.cb-wrap').forEach(wrap => {
    if (wrap._cb) return; wrap._cb = true;
    const bar = $('.catbar2', wrap);
    const prev = $('.cb-prev', wrap), next = $('.cb-next', wrap);
    const step = () => Math.min(bar.clientWidth * 0.8, 640);
    prev.onclick = () => bar.scrollBy({ left: -step(), behavior: 'smooth' });
    next.onclick = () => bar.scrollBy({ left: step(), behavior: 'smooth' });
    let sx = null;
    bar.addEventListener('pointerdown', e => sx = e.clientX);
    bar.addEventListener('pointerup', e => { if (sx != null) { const d = e.clientX - sx; if (Math.abs(d) > 30) bar.scrollBy({ left: -d * 2, behavior: 'smooth' }); sx = null; } });
    const upd = () => { prev.disabled = bar.scrollLeft < 8; next.disabled = bar.scrollLeft > bar.scrollWidth - bar.clientWidth - 8; };
    bar.addEventListener('scroll', upd, { passive: true });
    addEventListener('resize', upd); upd();
  });
}

/* ─────────── hero gold dust (ambience only — no 3D models) ─────────── */
function heroDust(canvasId) {
  const cv = document.getElementById(canvasId);
  if (!cv || cv._dust) return;
  // v42: skip heavy canvas animation on mobile — major scroll-jank source
  if (('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (innerWidth <= 820)) {
    cv.style.display = 'none';
    return;
  }
  cv._dust = true;
  const ctx = cv.getContext('2d');
  let W, H;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const size = () => { const r = cv.parentElement.getBoundingClientRect(); W = r.width; H = r.height; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
  size(); addEventListener('resize', size);
  const P = Array.from({ length: 55 }, () => ({ x: Math.random(), y: Math.random(), r: .6 + Math.random() * 1.9, p: Math.random() * 6.28, v: .00016 + Math.random() * .0004 }));
  let t = 0;
  (function f() {
    t += .016;
    if (!document.body.contains(cv)) return;
    ctx.clearRect(0, 0, W, H);
    for (const d of P) {
      d.y -= d.v * 60; if (d.y < -.05) d.y = 1.05;
      const a = .1 + .34 * Math.abs(Math.sin(t * 1.4 + d.p));
      const x = d.x * W + Math.sin(t * .6 + d.p) * 8;
      ctx.fillStyle = `rgba(240,216,150,${a})`;
      ctx.beginPath(); ctx.arc(x, d.y * H, d.r, 0, 7); ctx.fill();
    }
    requestAnimationFrame(f);
  })();
}
/* layered 3D hero stage — image cards at different depths with mouse parallax */
function initHeroStage() {
  const stage = $('.hero-stage'); if (!stage || stage._hs) return; stage._hs = true;
  heroDust('heroDust');
  // v42: disable mouse parallax on mobile — causes card vibration at one spot
  if (('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (innerWidth <= 820)) return;
  const layers = $$('[data-depth]', stage);
  addEventListener('mousemove', e => {
    const r = stage.getBoundingClientRect();
    const dx = (e.clientX - r.left) / r.width - .5, dy = (e.clientY - r.top) / r.height - .5;
    layers.forEach(el => {
      const d = +el.dataset.depth;
      el.style.setProperty('--px', (dx * -18 * d).toFixed(1) + 'px');
      el.style.setProperty('--py', (dy * -12 * d).toFixed(1) + 'px');
    });
  }, { passive: true });
}

/* ─────────── page components ─────────── */
function productCard(p, opts = {}) {
  const pr = price(p);
  const wished = state.user ? (opts.wishSet || []).includes(p.id) : state.localWish.includes(p.id);
  const compared = isCompared(p.id);
  return `<article class="p-card" data-pid="${p.id}">
    <a href="#/product/${p.id}" class="pc-imgwrap">
      <img src="${p.images[0]}" alt="${esc(p.name)}" loading="lazy">
      ${p.video ? `<span class="pc-vid-badge"><svg viewBox="0 0 10 10"><path d="M1 1l8 4-8 4z"/></svg>FILM</span>` : ''}
      <div class="glare"></div>
    </a>
    <button type="button" class="pc-compare ${compared ? 'on' : ''}" data-pid="${p.id}" onclick="event.preventDefault();event.stopPropagation();Shivaa.toggleCompare('${p.id}')" aria-pressed="${compared ? 'true' : 'false'}" aria-label="${compared ? 'Remove from compare' : 'Add to compare'}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 4v16M18 4v16M4 8h16"/><path d="M8 8l-3 7h6L8 8zM16 8l-3 7h6l-3-7z"/></svg><span data-compare-label>${compared ? 'In Compare' : 'Compare'}</span>
    </button>
    <div class="pc-tags">${(p.tags || []).slice(0, 2).map(t => `<span class="tagx ${t === 'new' || t === 'bestseller' ? 'gold' : ''}">${TAGS[t] || t}</span>`).join('')}</div>
    <button class="pc-wish ${wished ? 'on' : ''}" data-pid="${p.id}" onclick="event.preventDefault();Shivaa.toggleWish('${p.id}')" aria-label="Wishlist">
      <svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 20.5C7 16.5 3.5 13.3 3.5 9.6 3.5 7 5.5 5 8 5c1.6 0 3.1.8 4 2.1C12.9 5.8 14.4 5 16 5c2.5 0 4.5 2 4.5 4.6 0 3.7-3.5 6.9-8.5 10.9z"/></svg>
    </button>
    <div class="pc-body">
      <div class="pc-cat">${CATS[p.category] ? CATS[p.category].name : p.category} · ${p.metal === 'Silver' ? 'Silver ' + p.purity : p.purity + ' Gold'}</div>
      <a href="#/product/${p.id}"><h3 class="pc-name">${esc(p.name)}</h3></a>
      <div class="pc-meta">${p.weightG} g${p.stoneValue ? ' · stone value listed' : ''} · <span class="pc-rating">★ ${p.rating}<span>(${p.reviews})</span></span></div>
      <div class="pc-price"><b class="js-price" data-pid="${p.id}" data-qty="1">${fmt(pr.total)}</b><small>incl. 3% GST</small></div>
      <div class="pc-live"><span class="live-dot"></span>live price · ${pr.ratePerGram % 1 ? fmt2(pr.ratePerGram) : fmt(pr.ratePerGram)}/g today</div>
    </div>
  </article>`;
}
function mcTableHTML(rows, editable = false) {
  return `<div class="mc-table-wrap"><table class="mc-table">
    <thead><tr><th>Category</th><th>Purity</th><th>Making Charge</th><th class="num">Minimum</th><th>Notes</th></tr></thead>
    <tbody>${rows.map(r => `<tr>
      <td class="cat-cell"><b>${esc(r.category)}</b><small>${r.mode === 'perGram' ? 'Charged per gram on net weight' : 'Flat — independent of weight'}</small></td>
      <td><span class="pill pm">${esc(r.purity)}</span></td>
      <td><b>${r.mode === 'perGram' ? '₹' + r.value + ' / gram' : 'Flat ₹' + r.value.toLocaleString('en-IN')}</b></td>
      <td class="num">${fmt(r.min)}</td>
      <td style="color:var(--ink-3);font-size:13px">${esc(r.note || '')}</td>
    </tr>`).join('')}</tbody>
  </table></div>
  <div class="gst-note">◈ Every price = live metal rate × weight + making charge (as above) + listed stone value, then 3% GST. No hidden charges, ever. Live rates on this site update automatically — <a href="#/rates" style="text-decoration:underline">see current rates</a>.</div>`;
}

/* ═══════════════════ PAGES ═══════════════════ */
const pages = {};

/* ─────────── HOME ─────────── */
pages.login = async () => { openLogin(); };
pages.privacy = async (view) => {
  view.innerHTML = `
  <section class="page-hero"><div class="dust" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="container"><div class="crumbs"><a href="#/">Home</a> / Privacy Policy</div><h1>Your Data, Our <em class="disp-italic">Aman</em></h1>
  <p>The complete privacy & data-protection framework of Shivaa — Ernate Shine Jewellery Pvt. Ltd. — crafted under the Digital Personal Data Protection Act, 2023.</p></div></section>

  <div class="container" style="padding:40px 0 20px;max-width:1000px">
    <div class="priv-facts">
      <div class="pfact"><span>🛡️</span><b>DPDPA 2023</b><small>fully compliant framework</small></div>
      <div class="pfact"><span>⏱️</span><b>30 Days</b><small>statutory response window</small></div>
      <div class="pfact"><span>🇮🇳</span><b>Data in India</b><small>stored on Indian servers</small></div>
      <div class="pfact"><span>✉️</span><b>DPO Reply</b><small>within 7 working days</small></div>
    </div>

    <div class="priv-hero-card">
      <img src="/images/logo.png" class="priv-logo" alt="Shivaa">
      <div>
        <span class="label">The promise</span>
        <h3>Jewellery is personal. So is your data.</h3>
        <p>Shivaa operates at the intersection of trust and craftsmanship — from our flagship showroom in Jayal, Nagaur to shivaa.in and the Shivaa Jewels app. This policy explains, in plain language, exactly what we collect, why, and the control you hold. It is the web edition of our complete compliance framework.</p>
        <a class="btn btn-outline btn-sm" href="/docs/shivaa-privacy-policy.pdf" target="_blank" style="margin-top:14px">⬇ Download Full Policy (PDF, 12 pages)</a>
      </div>
    </div>

    <details class="priv-sec" open><summary>1 · Who we are & what this covers</summary>
      <div class="ps-body"><p><b>Ernate Shine Jewellery Private Limited</b> (trade name "Shivaa"), CIN U32111RJ2025PTC099173, Shop No. 1, Main Road, Sadar Bazaar, Jayal, Nagaur, Rajasthan — 341023, is the <b>Data Fiduciary</b> under the DPDPA 2023: we determine how your personal data is processed across our website, mobile app, B2B partner portal and showroom.</p>
      <p>This framework intersects with our obligations under the <b>Prevention of Money Laundering Act 2002</b> and the <b>Income Tax Act 1961</b>, given the high-value nature of precious metals.</p></div></details>

    <details class="priv-sec"><summary>2 · What we collect & why</summary>
      <div class="ps-body">
        <table class="mc-table priv-table"><thead><tr><th>Data</th><th>Example</th><th>Purpose</th></tr></thead><tbody>
        <tr><td><b>Identity & contact</b></td><td>Name, email, mobile (OTP-verified)</td><td>Accounts, orders, support</td></tr>
        <tr><td><b>Occasions</b> (optional)</td><td>Date of birth, anniversary</td><td>Royalty benefits, festive offers</td></tr>
        <tr><td><b>Orders & addresses</b></td><td>Purchases, delivery addresses</td><td>Fulfilment & insured delivery</td></tr>
        <tr><td><b>B2B KYC</b></td><td>GSTIN (checksum-verified), owner PAN</td><td>Partner onboarding, PMLA compliance</td></tr>
        <tr><td><b>App interactions</b></td><td>Pages viewed, session data</td><td>Improving the store experience</td></tr>
        </tbody></table>
        <p>Our OTP-verification (login & KYC) exists to prevent fraud — codes expire in minutes and are stored only as salted hashes.</p></div></details>

    <details class="priv-sec"><summary>3 · Consent — layered & withdrawable</summary>
      <div class="ps-body"><p>Where DPDPA requires consent, we ask for it <b>before</b> processing, in clear language, and keep it purpose-limited. Marketing messages are opt-in. You may <b>withdraw consent anytime</b> with the same ease as granting it — via your account, the unsubscribe link, or our Grievance Officer. Withdrawal never affects services that run on other lawful bases (like fulfilling orders or statutory KYC).</p></div></details>

    <details class="priv-sec"><summary>4 · Cookies & tracking</summary>
      <div class="ps-body"><p>We use only what the platform needs: <b>essential cookies/local storage</b> for your cart, login session and preferences; <b>anonymized analytics</b> for aggregate usage. No third-party advertising trackers, no cross-site profiling, no sale of behavioural data — ever.</p></div></details>

    <details class="priv-sec"><summary>5 · Security & incident response</summary>
      <div class="ps-body"><p>Encryption in transit (TLS/HTTPS), hashed credentials, access-controlled servers in India with our hosting provider under contract, and an internal incident-response protocol. In the unlikely event of a data breach affecting you, we will notify affected users and the Data Protection Board as required by law.</p></div></details>

    <details class="priv-sec"><summary>6 · Retention & erasure</summary>
      <div class="ps-body"><p>Order and KYC records are retained as long as tax and PMLA law requires. Everything else lives only while it serves the purpose you gave it for. When you ask, we erase or anonymize — and tell third-party processors to do the same.</p></div></details>

    <details class="priv-sec"><summary>7 · Your rights (Data Principal)</summary>
      <div class="ps-body">
        <div class="priv-rights">
          <div><b>① Access</b><small>Full summary of your data, purposes & processors — within 30 days</small></div>
          <div><b>② Correction</b><small>Fix inaccurate or outdated details, including via your Account page</small></div>
          <div><b>③ Erasure</b><small>Delete your data when retention law permits</small></div>
          <div><b>④ Grievance</b><small>Escalate to our DPO; then to the Data Protection Board of India</small></div>
          <div><b>⑤ Nominate</b><small>Appoint someone to exercise rights if you cannot</small></div>
          <div><b>⑥ Withdraw</b><small>Revoke consent as easily as you granted it</small></div>
        </div>
        <p style="margin-top:14px">Exercise any right by writing to our Grievance Officer below — no forms, no fees.</p></div></details>

    <details class="priv-sec"><summary>8 · Sharing & cross-border transfers</summary>
      <div class="ps-body"><p>We share data only with processors needed to serve you — hosting, logistics, payment & communication partners — under contractual protection, never for sale. Our primary infrastructure is in <b>India</b>; where a tool processes data abroad, we transfer only what is necessary under DPDPA-approved safeguards.</p></div></details>

    <details class="priv-sec"><summary>9 · Children</summary>
      <div class="ps-body"><p>Shivaa services are meant for adults. We do not knowingly collect data from children under 18; if we learn we have, it is deleted on discovery. Parents may contact the Grievance Officer directly.</p></div></details>

    <details class="priv-sec"><summary>10 · Policy changes</summary>
      <div class="ps-body"><p>Material changes are announced on this page (and in-app) before they take effect. The dated PDF above is the current complete edition; this page is its readable web summary.</p></div></details>

    <div class="priv-dpo">
      <div class="dpo-card">
        <span class="label">Grievance Officer · Data Protection Officer</span>
        <h3>Mr. Karan Soni — Executive Director</h3>
        <div class="dpo-row"><span>🏢</span><p>Ernate Shine Jewellery Pvt. Ltd. ("Shivaa")<br>Shop No. 1, Main Road, Sadar Bazaar, Jayal, Nagaur, Rajasthan — 341023</p></div>
        <div class="dpo-row"><span>✉️</span><p><a href="mailto:Support@shivaa.in">Support@shivaa.in</a> (subject: "Data Grievance")</p></div>
        <div class="dpo-row"><span>☎</span><p><a href="tel:+918905005921">+91 89050 05921</a></p></div>
        <div class="dpo-note">Unresolved? You may escalate to the <b>Data Protection Board of India</b> under the DPDPA 2023.</div>
      </div>
    </div>
    <p style="text-align:center;font-size:12px;color:var(--ink-3);padding:20px 0 40px">Web edition · Last updated ${new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })} · The PDF edition prevails in detail.</p>
  </div>`;
};

window.Shivaa.orderDetail = async id => {
  const { order: o } = await api('/api/orders/' + id);
  openModal(`<h3 style="font-size:24px;margin-bottom:4px">Order ${o.id}</h3><div style="font-size:13px;color:var(--ink-3);margin-bottom:14px">${timeFmt(o.createdAt)} · ${esc(o.paymentMethod)} · ${esc(o.paymentStatus)}</div>
  ${o.items.map(i => `<div class="sum-row"><span>${esc(i.name)}${i.size ? ' (' + esc(i.size) + ')' : ''} × ${i.qty} <small style="display:block;color:var(--ink-3)">${i.metal === 'Silver' ? 'Silver' : i.purity} ${i.weightG}g · rate ${fmt(i.ratePerGram)}/g · MC ${fmt(i.makingCharge * i.qty)}</small></span><b>${fmt(i.unitPrice * i.qty)}</b></div>`).join('')}
  <div class="sum-row total"><span>Total (incl. GST)</span><b>${fmt(o.total)}</b></div>
  <div style="font-size:13px;color:var(--ink-2);margin-top:12px"><b>Ship to:</b> ${esc(o.address.name || '')}, ${esc(o.address.line || '')}, ${esc(o.address.city || '')} — ${esc(o.address.pincode || '')}<br><b>Timeline:</b> ${o.timeline.map(t => t.s).join(' → ')}</div>`, 'lg');
};
window.Shivaa.logout = () => { setToken(null); state.user = null; toast('Logged out'); location.hash = '#/'; boot(true); };

function renderRateStrip() {
  const R = state.rates; if (!R || !$('#rateStrip')) return;
  const cell = (name, val, unit, chg) => `<div class="rscell"><small>${name}</small><b>${val}</b><span class="chg ${chg >= 0 ? 'up' : 'down'}">${chg >= 0 ? '▲' : '▼'} ${Math.abs(chg).toFixed(0)} ${unit}</span></div>`;
  const h = R.history || [];
  const prev = h.length > 1 ? h[h.length - 2] : R;
  $('#rateStrip').innerHTML =
    cell('✦ Jaipur Gold 22K / g', fmt(R.gold22), '₹/g vs prev', R.gold22 - prev.gold22) +
    cell('Gold 18K / gram', fmt(R.gold18), '₹/g vs prev', R.gold18 - prev.gold18) +
    cell('Silver 925 / gram', fmt2(R.silver), '₹/g vs prev', R.silver - prev.silver) +
    `<div class="rscell"><small>Updated</small><b style="font-size:19px">${timeFmt(R.t)}</b><span><span class="live-dot"></span>${esc(R.source)} · every 10 min</span></div>`;
}

/* ─────────── HOME ─────────── */
pages.home = async (view) => {
  const best0 = state.productsCache.filter(p => p.tags && p.tags.includes('bestseller'));
  const best = [...best0, ...state.productsCache.filter(p => !best0.includes(p))].slice(0, 12);
  const news = state.productsCache.filter(p => p.tags && p.tags.includes('new')).slice(0, 8);
  const spot = state.productsCache.find(p => p.id === 'p_aara') || state.productsCache[0];
  const spotPr = spot ? price(spot) : null;
  const wishSet = state.user ? await wishIds() : [];
  view.innerHTML = `
  <section class="hero">
    <div class="hero-img"></div><div class="hero-fade"></div>
    <div class="dust" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div>
    <div class="hero-orbs">
      <div class="orb" style="width:130px;height:130px;left:6%;top:16%;background:radial-gradient(circle at 35% 35%,#f3dfae,#b98a2f 68%,transparent 72%);animation-delay:-2s"></div>
      <div class="orb" style="width:70px;height:70px;left:44%;bottom:14%;background:radial-gradient(circle at 35% 35%,#fff6dd,#d4af5a 66%,transparent 72%);animation-delay:-5s"></div>
      <div class="orb" style="width:46px;height:46px;left:12%;bottom:30%;background:radial-gradient(circle at 35% 35%,#ffe9bd,#b98a2f 64%,transparent 72%);animation-delay:-7s"></div>
    </div>
    <div class="container hero-in">
      <div>
        <span class="hero-kicker">✦ &nbsp;Jayal · Nagaur · Since 2025 &nbsp;✦</span>
        <h1>Jewellery as honest as your <em class="shimmer foil-txt">love</em></h1>
        <p class="hero-sub">Gold & silver jewellery at live Jaipur rates, with every price broken down in plain sight — the same tanch our family has kept for 30+ years, now on shivaa.in.</p>
        <div class="hero-cta">
          <a class="btn btn-gold btn-lg" href="#/shop">Shop the Collection</a>
          <a class="btn btn-light btn-lg" href="#/rates">Jaipur Live Rates</a>
        </div>
        <div class="hero-trust"><a href="#/hallmark">✦ HUID check guide</a><a href="#/trust">✦ Why Trust Shivaa</a><span>✦ Live-Rate Pricing</span><span>✦ Insured Delivery</span></div>
        <div class="hero-stats">
          <div class="hstat"><b>30+</b><span>Years of karigari</span></div>
          <div class="hstat"><b>17</b><span>Categories</span></div>
          <div class="hstat"><b>24</b><span>Digital catalogues</span></div>
        </div>
      </div>
      <div class="hero-stage">
          <canvas id="heroDust"></canvas>
          <div class="hs-card hs-main" data-depth="1"><img src="/images/banners/poster-bridal.jpg" alt="Shivaa bridal couture jewellery"><span class="hs-frame"></span><span class="hs-tag">✦ The Bridal House</span></div>
          <div class="hs-card hs-a" data-depth="2.2"><img src="/images/products/necklace-rani.jpg" alt="Rani haar"><span class="hs-frame"></span></div>
          <div class="hs-card hs-b" data-depth="3.2"><img src="/images/products/earrings-chandbali.jpg" alt="Chandbali earrings"><span class="hs-frame"></span></div>
          <div class="hs-badge" data-depth="4"><img src="/images/logo.png" alt="Shivaa"><small>HUID check<br>Guide</small></div>
        </div>
    </div>
    <div class="hero-cue"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 9l6 6 6-6"/></svg>scroll</div>
  </section>

  <div class="catbar-outer">${catBarHTML()}</div>

  <section class="carousel-sec">
    <div class="carousel" id="heroCarousel" aria-roledescription="carousel">
      <div class="c-track" id="cTrack">
        <div class="c-slide s-left">
          <img src="/images/banners/poster-heritage.jpg" alt="Shivaa fine gold craftsmanship" fetchpriority="high">
          <div class="c-fade"></div>
          <span class="c-frame" aria-hidden="true"><i class="cf-c c1"></i><i class="cf-c c2"></i><i class="cf-c c3"></i><i class="cf-c c4"></i></span>
          <span class="c-wm" aria-hidden="true">99&middot;999</span>
          <div class="c-body">
            <span class="label">&#10022; The House of Honest Gold</span>
            <h3>Purity you can <em class="shimmer foil-txt">pass down</em></h3>
            <div class="offer-seal alt seal-plaque"><b>HUID<small>GUIDE</small></b><span>check the actual piece</span></div>
            <p>Every Shivaa piece is handcrafted by master karigars, weighed to the milligram and billed at Jaipur's live rate &mdash; jewellery made to be inherited, not replaced.</p>
            <div class="c-cta"><a class="btn btn-gold btn-lg" href="#/shop">Explore the Collections</a><a class="btn btn-light btn-lg" href="#/about">Our Craft &amp; Story</a></div>
          </div>
        </div>
        <div class="c-slide s-center">
          <img src="/images/banners/poster-bridal.jpg" alt="Bridal collection" loading="lazy">
          <div class="c-fade fade-c"></div>
          <div class="c-body">
            <span class="label">&#10022; The bridal edit &middot; Jayal to your city</span>
            <h3>The Complete <em class="shimmer foil-txt">Trousseau</em></h3>
            <div class="offer-seal alt seal-medallion"><b>MC<small>WAIVED</small></b><span>on full bridal sets</span></div>
            <div class="flash-countdown" id="wedCd"></div>
            <div class="c-cta"><a class="btn btn-gold btn-lg" href="#/shop?tag=wedding">Explore Bridal</a></div>
          </div>
        </div>
        <div class="c-slide s-right">
          <img src="/images/banners/poster-everyday.jpg" alt="Everyday edit under 50000" loading="lazy">
          <div class="c-fade fade-r"></div>
          <div class="c-body">
            <span class="label">&#10022; The everyday edit</span>
            <h3>Above ordinary,<br><em class="shimmer foil-txt">under &#8377;50,000</em></h3>
            <div class="price-lock"><b>&#8377;2,400</b><span>from &middot; live-rate priced &middot; daily wear</span></div>
            <p>Studs, pendants, chains &amp; silver &mdash; with individual specifications and Jaipur-rate pricing.</p>
            <div class="c-cta"><a class="btn btn-gold btn-lg" href="#/shop?max=50000">Shop the Edit</a></div>
          </div>
        </div>
        <div class="c-slide s-band">
          <img src="/images/banners/wedding.jpg" alt="Swarna Nidhi gold savings plan" loading="lazy">
          <div class="c-fade"></div>
          <div class="c-panel">
            <span class="label">&#10022; Swarna Nidhi &middot; the gold savings plan</span>
            <div class="sn-num">11<span>+</span>1</div>
            <h3>Pay eleven, own twelve</h3>
            <p>Save every month at that day's live gold rate &mdash; the 12th instalment is on us. A 9.09% benefit, in pure gold.</p>
            <div class="c-cta"><a class="btn btn-gold btn-lg" href="#/savings">Start Saving</a><a class="btn btn-light btn-lg" href="#/contact">Visit the Store</a></div>
          </div>
        </div>
      </div>
      <button class="c-arrow c-prev" aria-label="Previous poster">‹</button>
      <button class="c-arrow c-next" aria-label="Next poster">›</button>
      <div class="c-dots" id="cDots"></div>
    </div>
  </section>

  <section class="rate-strip"><div class="container rate-strip-in" id="rateStrip"></div></section>

  <section class="sec container" style="padding-bottom:26px">
    <div class="sec-head rv" style="margin-bottom:22px"><span class="label">Shop by category</span><h2>Find your <span class="disp-italic">forever</span></h2></div>
    <div class="cat-mini">
      ${Object.entries(CATS).map(([k, c]) => `<a href="#/shop?category=${k}" class="cat-mini-card"><img src="${c.img}" alt="${c.name}" loading="lazy"><b>${c.name}</b></a>`).join('')}
    </div>
  </section>

  <section class="sec container" style="padding-top:0">
    <div class="sec-head rv"><span class="label">Loved most</span><h2>Bestsellers <a class="see-all" href="#/shop">View all ${state.productsCache.length} pieces →</a></h2></div>
    <div class="p-grid">${best.map(p => productCard(p, { wishSet })).join('')}</div>
  </section>

  ${spot ? `
  <section class="sec container" style="padding-top:0">
    <div class="grid2" style="align-items:stretch">
      <div class="rv">
        <span class="label">Product of the month</span>
        <h2 style="font-size:34px;margin-top:8px">${esc(spot.name)}</h2>
        <p style="color:var(--ink-2);margin:12px 0 8px">${esc(spot.desc.split('.')[0])}.</p>
        <div style="display:flex;align-items:baseline;gap:14px;margin:14px 0 22px">
          <b style="font-family:var(--ff-disp);font-size:34px;color:var(--maroon-deep)" class="js-price" data-pid="${spot.id}" data-qty="1">${fmt(spotPr.total)}</b>
          <small style="color:var(--ink-3)">live price · incl. GST · 18K ${spot.weightG}g + listed stone value</small>
        </div>
        <a class="btn btn-primary" href="#/product/${spot.id}">View the Piece</a>
      </div>
      <a href="#/product/${spot.id}" class="cat-card rv" style="aspect-ratio:auto;height:360px"><img src="${spot.images[0]}" style="height:100%" alt="${esc(spot.name)}"><div class="glare"></div></a>
    </div>
  </section>` : `
  <section class="sec container" style="padding-top:0">
    <div class="empty" style="padding:40px 20px;background:var(--white);border:1px dashed var(--gold-soft);border-radius:20px">
      <span class="label">The Collection</span>
      <h3 style="margin:10px 0 6px">The vault is being restocked</h3>
      <p style="color:var(--ink-3);font-size:14px">New designs are being photographed & priced at today's Jaipur rate — back very soon. Meanwhile, the bullion desk & custom orders are open.</p>
      <a class="btn btn-primary" style="margin-top:16px" href="#/b2b">For Jewellers → B2B</a>
    </div>
  </section>`}

  <section class="sec container" style="padding-top:0">
    <div class="sec-head rv"><span class="label">Fresh from the karigar</span><h2>New Arrivals <a class="see-all" href="#/shop?tag=new">View all →</a></h2></div>
    <div class="p-grid">${news.map(p => productCard(p, { wishSet })).join('')}</div>
  </section>

  <section class="container" style="padding-bottom:70px">
    <div class="banner rv" style="min-height:280px">
      <img src="/images/banners/b2b-bullion.jpg" alt="B2B" loading="lazy">
      <div class="b-fade"></div>
      <div class="b-body">
        <span class="label">For jewellers</span>
        <h3>Your counter, our supply chain</h3>
        <p>Honest-purity gold &amp; silver stock, daily digital catalogues, insured logistics, weekly stock reports and Friday settlements — trusted by 300+ jewellers across Rajasthan.</p>
        <a class="btn btn-gold" href="#/b2b">Become a Partner</a>
      </div>
    </div>
  </section>

  <section class="sec container" style="padding-top:0">
    <div class="sec-head rv"><span class="label">Words from the house</span><h2>Loved &amp; <span class="disp-italic">worn</span></h2></div>
    <div class="rev-marquee" id="revMarquee">
      <div class="rev-track" id="revTrack"></div>
      <div class="rev-glow left"></div><div class="rev-glow right"></div>
    </div>

    <div class="ugc-head rvl" style="margin-top:38px">
      <div>
        <span class="label">Real customers &middot; real photos</span>
        <h2 style="font-family:var(--ff-disp);font-size:clamp(25px,3.6vw,34px);color:var(--maroon-deep);margin-top:4px">Worn by <span class="disp-italic">you</span></h2>
      </div>
      <div class="ugc-score">
        <div class="big">4.9</div>
        <div>
          <div class="stars-lg">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
          <small>767 verified reviews &middot; 96% five star</small>
        </div>
      </div>
    </div>
    <div class="ugc-wall" id="ugcWall"></div>
  </section>

  <section class="sec container" style="padding-top:0">
    <div class="pillars">
      ${[
        ['bis', '<a href="#/hallmark">Check a HUID</a>', 'Use the actual piece’s HUID in BIS Care; catalogue data is not verification', '<path d="M12 3l7 3v5c0 4.4-3 8.2-7 9.5C8 19.2 5 15.4 5 11V6l7-3z" style="--dash:64"/><path class="pl-draw" d="M9 11.5l2 2 4-4.5" style="--dash:14"/>'],
        ['rate', 'Live-Rate Pricing', 'Jaipur market feed &mdash; the price you see is the price you are billed', '<circle class="pl-draw" cx="12" cy="12" r="8.5" style="--dash:54"/><path class="pl-draw" d="M12 7.5v4.5l3.2 1.9" style="--dash:12"/>'],
        ['ship', 'Insured Shipping', 'Tamper-sealed and fully insured, delivered anywhere in India', '<path class="pl-draw" d="M4 8l8-4 8 4v8l-8 4-8-4V8z" style="--dash:56"/><path class="pl-draw" d="M4 8l8 4 8-4M12 12v8" style="--dash:34"/>'],
        ['ret', '7-Day Easy Returns', 'No-questions returns &middot; lifetime exchange at the live rate', '<path class="pl-draw" d="M4.5 12a7.5 7.5 0 1 1 2.2 5.3" style="--dash:44"/><path class="pl-draw" d="M4.5 12V7.5M4.5 12H9" style="--dash:14"/>'],
      ].map((x, i) => `<div class="pillar rv rv-d${i}" data-tilt="0.6">
        <div class="pl-orb"></div>
        <div class="pl-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${x[3]}</svg></div>
        <b>${x[1]}</b>
        <small>${x[2]}</small>
        <span class="pl-shine"></span>
      </div>`).join('')}
    </div>
  </section>

  <section class="sec container" style="padding-top:0">
    <div class="newsletter rv">
      <img src="/images/logo.png" class="news-logo" alt="Shivaa">
      <h3>First look at new designs</h3>
      <p>Join the Shivaa circle — new collections, festive rate alerts and partner offers.</p>
      <form class="nl-form" onsubmit="ShivaiNL(event)">
        <input type="email" placeholder="Your email address" required>
        <button type="submit">Subscribe</button>
      </form>
    </div>
  </section>`;
  bindCountdown($('#wedCd'), Date.now() + 6 * 864e5 + 11 * 36e5);
  initCarousel();
  renderRateStrip();
  // animated reviews marquee
  const revs = [
    ['Meenakshi Rathore', 'Nagaur', 'The kundan ring matched its photos exactly — and the price table told me everything before I asked. That honesty is rare.', 5, 'MR', '/images/products/ring-kundan.jpg'],
    ['Anita Devi', 'Nagaur', 'Bought my daughter\'s mangalsutra here. Making charges were explained openly and the bill matched the website rate to the rupee.', 5, 'AD', '/images/products/mangalsutra-trad.jpg'],
    ['Priya Sonthalia', 'Jayal', 'The jhumkas are exactly as pictured. As a jeweller\'s daughter, I can say the tanch is genuinely honest.', 5, 'PS', '/images/products/earrings-jhumka.jpg'],
    ['Krishna Jewellers', 'Partner · Jayal', 'The bullion desk keeps RTGS rates live and Shivaa updates cash rates instantly — our counter decisions got faster.', 5, 'KJ', '/images/banners/b2b-bullion.jpg'],
    ['Sneha Kulkarni', 'Jaipur', 'OTP login, live rates on every page, WhatsApp ordering — this is how jewellery buying should feel.', 5, 'SK', '/images/products/ring-floral.jpg'],
    ['Radhe Jewellers', 'Partner · Nagaur', 'Design selection to fine-metal settlement in minutes. Zero making charges means clean, trusted deals.', 5, 'RJ', '/images/products/necklace-rani.jpg'],
    ['Kavita Jodha', 'Jodhpur', 'The rani haar is heavier and finer than expected. The festive box made it a gift before the gift.', 5, 'KJ', '/images/products/necklace-choker.jpg'],
  ];
  // ── photo review wall (real customers) ──
  const UGC = [
    ['Meenakshi Rathore','Nagaur','/images/reviews/cust-1.jpg','The jhumkas are exactly as pictured and the tanch is honest. The price table told me everything before I even asked.',5,'Chandbali Jhumkas','/images/products/earrings-jhumka.jpg'],
    ['Anita Devi','Jayal','/images/reviews/cust-2.jpg','Bought my daughter&rsquo;s bridal set here. Making charges explained openly &mdash; the bill matched the website to the rupee.',5,'Bridal Rani Haar','/images/products/necklace-rani.jpg'],
    ['Priya Sonthalia','Jayal','/images/reviews/cust-3.jpg','As a jeweller&rsquo;s daughter I check everything. The kundan work is genuinely fine and the weight is exact.',5,'Kundan Cocktail Ring','/images/products/ring-kundan.jpg'],
    ['Kavita Jodha','Jodhpur','/images/reviews/cust-4.jpg','My mangalsutra arrived in a festive box that made it a gift before the gift. Insured delivery, zero worry.',5,'Traditional Mangalsutra','/images/products/mangalsutra-trad.jpg'],
    ['Sneha Kulkarni','Jaipur','/images/reviews/cust-5.jpg','OTP login, live rates on every page, WhatsApp ordering. This is how buying jewellery online should feel.',5,'Layered Gold Chain','/images/products/chain-gold.jpg'],
  ];
  const wall = $('#ugcWall');
  if (wall) {
    wall.innerHTML = UGC.map(r => `<figure class="ugc-card" tabindex="0">
      <div class="ugc-ph">
        <img src="${r[2]}" alt="${esc(r[0])} wearing ${esc(r[5])}" loading="lazy" decoding="async">
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
    const io = new IntersectionObserver((es, o) => es.forEach((e, i) => {
      if (e.isIntersecting) { setTimeout(() => e.target.classList.add('seen'), i * 90); o.unobserve(e.target); }
    }), { threshold: .12, rootMargin: '0px 0px -40px' });
    $$('.ugc-card', wall).forEach(c => io.observe(c));
  }
  // pillar draw-in
  const pio = new IntersectionObserver((es, o) => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('seen'); o.unobserve(e.target); }
  }), { threshold: .2 });
  $$('.pillar, .wp-card, .rvl').forEach(el => pio.observe(el));

  const track = $('#revTrack');  if (track) {
    const card = r => `<div class="rev-card">
      <div class="rev-head"><span class="rev-av">${r[0].split(' ').map(w => w[0]).slice(0, 2).join('')}</span><div><b>${r[0]}</b><small>${r[1]}</small></div><span class="rev-ver">✓ Verified</span></div>
      <div class="rev-stars">${'<i>★</i>'.repeat(r[3])}</div>
      <p>“${r[2]}”</p>
      <img class="rev-photo" src="${r[5]}" alt="" loading="lazy">
      <span class="rev-qr">✦</span></div>`;
    const half = revs.map(card).join('');
    track.innerHTML = half + half; // seamless loop
  }
  initHeroStage(); initCatbar();
  // stat count-up
  $$('.hstat b').forEach(el => {
    const m = el.textContent.match(/^([\d.,]+)(.*)$/); if (!m) return;
    const target = parseFloat(m[1].replace(/,/g, '')), suffix = m[2] || '';
    const dec = m[1].includes('.') ? 1 : 0, t0 = performance.now();
    (function up(t) {
      const k = Math.min(1, (t - t0) / 1200), e = 1 - Math.pow(1 - k, 3);
      el.textContent = (target * e).toFixed(dec).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + suffix;
      if (k < 1) requestAnimationFrame(up);
    })(t0);
  });
  // hero orb parallax — v42: disabled on mobile (flicker/vibration source)
  const orbs = $('.hero-orbs');
  const _isMob = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (innerWidth <= 820);
  if (orbs && !_isMob) addEventListener('mousemove', e => {
    const dx = (e.clientX / innerWidth - .5), dy = (e.clientY / innerHeight - .5);
    orbs.style.transform = `translate(${dx * -18}px, ${dy * -12}px)`;
  }, { passive: true });
};

/* ─────────── SHOP ─────────── */
pages.shop = async (view, q) => {
  const cat = q.get('category') || '', tag = q.get('tag') || '', search = q.get('q') || '';
  const metals = new Set(), purities = new Set();
  state.productsCache.forEach(p => { metals.add(p.metal); purities.add(p.purity); });
  view.innerHTML = `
  <section class="page-hero"><div class="dust" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="container">
    <div class="crumbs"><a href="#/">Home</a> / Shop</div>
    <h1>${search ? `“${esc(search)}”` : cat ? CATS[cat].name : 'All Jewellery'}${tag ? ' · ' + (TAGS[tag] || tag) : ''}</h1>
    <p>Every price below follows the live Jaipur gold & silver rate and our published making-charge chart — automatically.</p>
  </div></section>
  <div class="catbar-outer shop-catbar" style="background:var(--white);border-bottom:1px solid var(--line)">${catBarHTML()}</div>
  <div class="fsheet-overlay" id="fsheetOverlay"></div>
  <aside class="filters" id="filterDrawer" aria-label="Filters">
    <div class="fsheet-bar"><b>Refine pieces</b><button id="fsheetClose" aria-label="Close filters">✕</button></div>
      <div class="fgroup"><h4>Category</h4>
        ${Object.entries(CATS).map(([k, c]) => `<label class="fcheck"><input type="checkbox" data-f="cat" value="${k}" ${cat === k ? 'checked' : ''}>${c.name}</label>`).join('')}
      </div>
      <div class="fgroup"><h4>Metal</h4>
        ${[...metals].map(m => `<label class="fcheck"><input type="checkbox" data-f="metal" value="${m}">${m === 'Gold' ? 'Gold' : 'Silver 925'}</label>`).join('')}
      </div>
      <div class="fgroup"><h4>Purity</h4>
        ${[...purities].map(p => `<label class="fcheck"><input type="checkbox" data-f="purity" value="${p}">${p === '925' ? 'Silver 925' : p + ' Gold'}</label>`).join('')}
      </div>
      <div class="fgroup"><h4>Occasion</h4>
        ${Object.entries(TAGS).map(([k, v]) => `<label class="fcheck"><input type="checkbox" data-f="tag" value="${k}" ${tag === k ? 'checked' : ''}>${v}</label>`).join('')}
      </div>
      <div class="fgroup"><h4>Max price</h4>
        <input type="range" id="priceRange" min="10000" max="1500000" step="5000" value="${+q.get('max') || 1500000}" style="width:100%;accent-color:var(--gold)">
        <div class="fmeta"><span>₹10,000</span><span id="priceMaxLbl">${q.get('max') ? fmt(+q.get('max')) : 'Any'}</span></div>
      </div>
      <button class="btn btn-ghost btn-sm btn-block" id="clearFilters" style="margin-top:14px">Clear all filters</button>
    </aside>
  <div class="container shop-main">
      <div class="shop-bar">
        <div class="res" id="resCount"></div>
        <div style="display:flex;gap:10px;align-items:center">
          <button class="btn btn-outline btn-sm f-toggle" id="filterToggle">⚙ Filters <span class="fbadge" id="fBadge" hidden></span></button>
          <select class="sortsel" id="sortSel">
            <option value="featured">Sort · Featured</option>
            <option value="price-asc">Price · Low to High</option>
            <option value="price-desc">Price · High to Low</option>
            <option value="rating">Top Rated</option>
            <option value="newest">Newest</option>
          </select>
        </div>
      </div>
      <div class="chipbar" id="chipbar"></div>
      <div id="shopGrid" class="p-grid"></div>
    </div>
  </div>`;

  const filters = () => ({
    cats: $$('input[data-f=cat]:checked').map(i => i.value),
    metals: $$('input[data-f=metal]:checked').map(i => i.value),
    purities: $$('input[data-f=purity]:checked').map(i => i.value),
    tags: $$('input[data-f=tag]:checked').map(i => i.value),
    max: +$('#priceRange').value,
  });
  async function apply() {
    const f = filters();
    let list = state.productsCache.slice();
    if (f.cats.length) list = list.filter(p => f.cats.includes(p.category));
    if (f.metals.length) list = list.filter(p => f.metals.includes(p.metal));
    if (f.purities.length) list = list.filter(p => f.purities.includes(p.purity));
    if (f.tags.length) list = list.filter(p => f.tags.some(t => (p.tags || []).includes(t)));
    if (search) list = list.filter(p => (p.name + p.category + (p.desc || '')).toLowerCase().includes(search.toLowerCase()));
    list = list.filter(p => price(p).total <= f.max);
    const sort = $('#sortSel').value;
    if (sort === 'price-asc') list.sort((a, b) => price(a).total - price(b).total);
    if (sort === 'price-desc') list.sort((a, b) => price(b).total - price(a).total);
    if (sort === 'rating') list.sort((a, b) => b.rating - a.rating);
    if (sort === 'newest') list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const wishSet = state.user ? await wishIds() : [];
    $('#shopGrid').innerHTML = list.length ? list.map(p => productCard(p, { wishSet })).join('') : `<div class="empty" style="grid-column:1/-1"><img src="/images/logo.png" class="empty-logo" alt=""><h3>No pieces match</h3><p>Try widening the filters.</p></div>`;
    $('#resCount').innerHTML = `<b>${list.length}</b> pieces · prices update with the live rate`;
    bindTilt($('#shopGrid'));
  }
  const closeSheet = () => { $('#filterDrawer')?.classList.remove('open'); $('#fsheetOverlay')?.classList.remove('open'); unlockScroll(); };
  const fBadge = $('#fBadge');
  const syncBadge = () => {
    const n = $$('input[data-f]:checked').length + ($('#priceRange').value < 1500000 ? 0 : 0);
    if (fBadge) { fBadge.hidden = !(n > 0); fBadge.textContent = n; }
  };
  if ($('#filterToggle')) {
    $('#filterToggle').onclick = () => { $('#filterDrawer').classList.add('open'); $('#fsheetOverlay').classList.add('open'); lockScroll(); };
    $('#fsheetClose').onclick = closeSheet;
    $('#fsheetOverlay').onclick = closeSheet;
    syncBadge();
    $$('input[data-f]').forEach(i => i.addEventListener('change', syncBadge));
  }
  $$('input[data-f]').forEach(i => i.onchange = () => { apply(); if (matchMedia('(max-width:768px)').matches) closeSheet(); });
  $('#priceRange').oninput = e => { $('#priceMaxLbl').textContent = e.target.value >= 1500000 ? 'Any' : fmt(+e.target.value); };
  $('#priceRange').onchange = apply;
  $('#sortSel').onchange = apply;
  $('#clearFilters').onclick = () => { $$('input[data-f]').forEach(i => i.checked = false); $('#priceRange').value = 1500000; $('#priceMaxLbl').textContent = 'Any'; apply(); };
  initCatbar();
  await apply();
};

/* ─────────── PRODUCT ─────────── */
pages.product = async (view, q, id) => {
  let data;
  try { data = await api('/api/products/' + id); } catch (e) { view.innerHTML = `<div class="empty"><div class="big">✦</div><h3>Piece not found</h3><a class="btn btn-outline" href="#/shop">Back to shop</a></div>`; return; }
  const p = data.product, pr = price(p), R = data.rates || state.rates;
  const wished = state.user ? await wishIds().then(s => s.includes(p.id)) : state.localWish.includes(p.id);
  const compared = isCompared(p.id);
  const emi3 = Math.round(pr.total / 3), emi6 = Math.round(pr.total / 6 * 1.02);
  view.innerHTML = `
  <div class="container" style="padding-top:26px">
    <div class="crumbs" style="color:var(--ink-3)"><a href="#/">Home</a> / <a href="#/shop">Shop</a> / <a href="#/shop?category=${p.category}">${CATS[p.category]?.name}</a> / <span style="color:var(--gold)">${esc(p.name)}</span></div>
    <div class="pd-layout">
      <div class="pd-gallery">
        <div class="gal-wrap" id="galWrap">
          <div class="gal-track" id="galTrack">
            ${(p.video ? [`<div class="gal-slide gal-vid on"><video src="${esc(p.video)}" controls playsinline preload="metadata" poster="${p.images && p.images[0] ? p.images[0] : ''}"></video><span class="gal-vid-tag">▶ 360° film</span></div>`] : []).concat((p.images || []).map((im, i) => `<div class="gal-slide${!p.video && i === 0 ? ' on' : ''}"><img src="${im}" alt="${esc(p.name)} ${i + 1}" draggable="false"></div>`)).join('')}
          </div>
          <button class="gal-nav gal-prev" aria-label="Previous">‹</button>
          <button class="gal-nav gal-next" aria-label="Next">›</button>
          <div class="gal-dots" id="galDots">${(p.video ? 1 : 0) + (p.images || []).length > 1 ? Array.from({length: (p.video ? 1 : 0) + (p.images || []).length}, (_, i) => `<span class="${i === 0 ? 'on' : ''}"></span>`).join('') : ''}</div>
          <a class="pd-stamp" href="#/hallmark?product=${encodeURIComponent(p.id)}">HUID check guide →</a>
          <span class="gal-hint">swipe / drag</span>
        </div>
      </div>
      <div class="pd-info">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
          <div>
            <div class="label">${CATS[p.category]?.name || p.category}</div>
            <h1>${esc(p.name)}</h1>
            <div class="pc-rating" style="font-size:15px">★ ${p.rating} <span style="color:var(--ink-3);font-size:13px">· ${p.reviews} reviews · SKU ${p.sku}</span></div>
          </div>
          <button class="pc-wish ${wished ? 'on' : ''}" data-pid="${p.id}" onclick="Shivaa.toggleWish('${p.id}')" style="position:static;width:46px;height:46px" aria-label="Wishlist">
            <svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 20.5C7 16.5 3.5 13.3 3.5 9.6 3.5 7 5.5 5 8 5c1.6 0 3.1.8 4 2.1C12.9 5.8 14.4 5 16 5c2.5 0 4.5 2 4.5 4.6 0 3.7-3.5 6.9-8.5 10.9z"/></svg>
          </button>
        </div>

        <div class="pd-pricebox">
          <div class="pd-total">
            <div><b id="pdTotal">${fmt(pr.total)}</b>
              <div class="pd-live"><span class="live-dot"></span>live price · updates with the ${p.metal === 'Silver' ? 'silver' : p.purity + ' gold'} rate · incl. GST</div>
            </div>
            <button class="brk-btn-lg" id="brkBtn">💰 Price Details <b>⌄</b></button>
          </div>
          ${isPartner() ? `<div class="wholesale-box"><span class="label">B2B · Wholesale</span>
            <table class="tanq-table">
              <tr><td>Gross weight</td><td>${p.weightG} g</td><td></td></tr>
              <tr><td>Less weight</td><td>− ${p.lessWeightG || 0} g</td><td></td></tr>
              <tr><td>Wastage</td><td>${p.wastagePct ?? 8}% on net</td><td></td></tr>
              <tr class="total"><td>Fine metal 995</td><td>settlement</td><td>${((p.weightG - (p.lessWeightG || 0)) * (1 - (p.wastagePct ?? 8) / 100)).toFixed(2)} g</td></tr>
            </table>
            <a class="btn btn-gold btn-sm" style="margin-top:10px" href="#/catalogues">Order in fine metal →</a></div>` : ''}
          <div class="pd-brk" id="pdBrk" hidden>
            <table class="tanq-table">
              <tr><td>Metal weight</td><td>${p.weightG} g × ₹<span id="pdRate">${fmt(pr.ratePerGram)}</span>/g</td><td id="pdMetal">${fmt(pr.metalValue)}</td></tr>
              <tr><td>Making charges</td><td>for this design</td><td id="pdMC">${fmt(pr.makingCharge)}</td></tr>
              ${p.stoneValue ? `<tr><td>Stone details</td><td>${esc(p.stoneDesc || 'Stone details not provided')}</td><td>${fmt(pr.stoneValue)}</td></tr>` : ''}
              <tr><td>GST</td><td>3%</td><td id="pdGst">${fmt(pr.gst)}</td></tr>
              <tr class="total"><td>Total payable</td><td></td><td id="pdBrkTot">${fmt(pr.total)}</td></tr>
            </table>
            <div style="font-size:11.5px;color:var(--ink-3);margin-top:8px">Rate: ${timeFmt(R.t || state.rates.t)} · final bill locks at order time.</div>
          </div>
          <div class="emi-strip">◈ <span><b>No-cost EMI from <span id="pdEmi3">${fmt(emi3)}</span>/mo</b> (3 months) · standard EMI <span id="pdEmi6">${fmt(emi6)}</span>/mo (6 months) on cards & UPI-autopay</span></div>
        </div>

        ${p.sizes.length ? `<div class="opt-label"><span>Size</span><a href="javascript:Shivaa.sizeGuide()" style="text-transform:none;letter-spacing:0;color:var(--gold);font-size:12.5px">Size guide</a></div>
        <div class="size-row" id="sizeRow">${p.sizes.map((s, i) => `<button class="size-pill ${i === Math.floor(p.sizes.length / 2) ? 'on' : ''}" data-size="${esc(s)}">${esc(s)}</button>`).join('')}</div>` : ''}

        <div class="opt-label"><span>Engraving (free, up to 12 characters)</span></div>
        <div class="pin-row" style="max-width:340px"><input id="engrave" maxlength="12" placeholder="e.g. R♥S 26"></div>

        <div class="opt-label"><span>Quantity</span></div>
        <div class="qty-row"><button onclick="Shivaa.pdQty(-1)">−</button><b id="pdQtyN">1</b><button onclick="Shivaa.pdQty(1)">+</button></div>
        <button class="btn btn-primary btn-lg btn-block miy-btn" onclick="Shivaa.pdBuy('${p.id}')">✦ Make It Yours!</button>
        <div class="pd-cta-row">
          <button class="btn btn-outline" onclick="Shivaa.pdAdd('${p.id}')">🛍 Add to Cart</button>
          <button class="btn btn-ghost wa-order" onclick="Shivaa.waProduct('${p.id}')">${WA_SVG} Chat to Order</button>
          <button type="button" class="btn btn-outline pd-compare ${compared ? 'on' : ''}" data-pid="${p.id}" onclick="Shivaa.toggleCompare('${p.id}')" aria-pressed="${compared ? 'true' : 'false'}" aria-label="${compared ? 'Remove from compare' : 'Add to compare'}">⚖ <span data-compare-label>${compared ? 'In Compare' : 'Compare'}</span></button>
        </div>
        <div style="font-size:12.5px;color:${p.stock > 3 ? 'var(--ok)' : 'var(--warn)'}">${p.stock > 3 ? '● In stock — ships in 48 hours' : '● Only ' + p.stock + ' left with our karigar'}</div>

        ${window.ShivaaHallmark ? window.ShivaaHallmark.productPanel(p) : '<p class="hm-note">HUID information is temporarily unavailable. No BIS verification has been performed here.</p>'}
        <a class="trust-pdp-link" href="#/trust">Business details &amp; documents →</a>

        <div class="opt-label"><span>Check delivery</span></div>
        <div class="pin-row" style="max-width:340px"><input id="pincode" maxlength="6" placeholder="Enter 6-digit pincode"><button class="btn btn-ghost btn-sm" onclick="Shivaa.checkPin()">Check</button></div>
        <div class="pin-msg" id="pinMsg" hidden></div>

        <div class="pd-perks">
          ${[['<a href="#/hallmark">HUID check guide</a>', '<path d="M12 3l7 3v5c0 4.4-3 8.2-7 9.5C8 19.2 5 15.4 5 11V6l7-3z"/>'],
             ['Ask about stone documents', '<path d="M6 4h12l2 5-8 11L4 9l2-5z"/>'],
             ['Free engraving', '<path d="M4 20l4-1L20 7l-3-3L5 16l-1 4z"/>'],
             ['Insured shipping', '<path d="M4 8l8-4 8 4v8l-8 4-8-4V8z"/>'],
             ['Lifetime exchange', '<path d="M4 12a8 8 0 1 1 2.3 5.6M4 12V7m0 5h5" fill="none"/>'],
             ['7-day returns', '<circle cx="12" cy="12" r="8.5" fill="none"/>']]
            .map(x => `<div class="perk"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round">${x[1]}</svg>${x[0]}</div>`).join('')}
        </div>

        <details class="acc" open><summary>Catalogue description</summary><div class="acc-body">${esc(p.desc)}${/(hallmark|certif|\bbis\b)/i.test(p.desc || '') ? '<p class="hm-note">Catalogue claims are not an official BIS record or certificate. Check the piece-level information above.</p>' : ''}</div></details>
        <details class="acc"><summary>Purity &amp; hallmark evidence</summary><div class="acc-body">Listed specification: ${esc(p.purity)} ${esc(p.metal)}, ${esc(p.weightG)} g. These catalogue values are not a BIS lookup or an assay result. Use the piece HUID information above and compare the actual stamp with the official BIS Care result. No BIS verification or stone certificate is issued by this website feature.</div></details>
        <details class="acc"><summary>Making Charges & Exchange</summary><div class="acc-body">Making charges for this design are shown in the price table above — nothing hidden, nothing category-averaged. Lifetime exchange at the day's live rate with making charges waived on exchanges within 6 months; 90% buy-back of metal value thereafter.</div></details>
        <details class="acc"><summary>Shipping & Returns</summary><div class="acc-body">Free insured shipping above ${fmt(state.settings.freeShipAbove)}; tamper-sealed packaging with signature & OTP delivery. 7-day no-question returns (uncustomised pieces). Engraved pieces are exchangeable, not returnable.</div></details>
        <details class="acc"><summary>Reviews (${data.reviews.length})</summary><div class="acc-body">
          ${data.reviews.map((r, i) => `<div class="rv-item rv-in" style="animation-delay:${Math.min(i * 120, 800)}ms"><span class="stars stars-pop">${'<i>★</i>'.repeat(r.rating)}</span><b>${esc(r.userName)}</b><small>${dateFmt(r.createdAt)}</small><p>${esc(r.text)}</p></div>`).join('') || '<p style="color:var(--ink-3)">Be the first to review this piece.</p>'}
          <form class="review-form" onsubmit="Shivaa.postReview(event,'${p.id}')">
            <div class="rate-pick" id="ratePick">${[1,2,3,4,5].map(i => `<span data-r="${i}" onclick="Shivaa.pickRate(${i})">★</span>`).join('')}</div>
            <div class="fld"><textarea id="revText" placeholder="Tell everyone about the piece…" required></textarea></div>
            <button class="btn btn-outline btn-sm" style="justify-self:start">Submit review</button>
          </form>
        </div></details>
      </div>
    </div>

    <div class="sec-head" style="margin-top:20px"><span class="label">You may also love</span><h2>Similar pieces</h2></div>
    <div class="p-grid">${data.similar.map(s => productCard(s)).join('')}</div>
    <div style="height:80px"></div>
  </div>
  <div class="pd-stickybar">
    <div class="ps-name">${esc(p.name)}<small class="js-price" data-pid="${p.id}" data-qty="1" data-suffix=" · live">${fmt(pr.total)} · live</small></div>
    <button class="btn btn-primary" onclick="Shivaa.pdAdd('${p.id}')">Add to Cart</button>
    <button class="ps-wa" onclick="Shivaa.waProduct('${p.id}')" aria-label="Order on WhatsApp">Chat to order</button>
  </div>`;
  (() => {
    const wrap = $('#galWrap'), track = $('#galTrack'); if (!wrap || !track) return;
    const n = $$('.gal-slide', track).length;   // v36: counts video slide too
    let idx = 0, sx = null, dx = 0;
    const go = i => {
      idx = (i + n) % n;
      track.style.transform = `translateX(-${idx * 100}%)`;
      $$('.gal-slide', track).forEach((s, i2) => s.classList.toggle('on', i2 === idx));
      $$('#galDots span').forEach((d, i2) => d.classList.toggle('on', i2 === idx));
    };
    $('.gal-next', wrap).onclick = () => go(idx + 1);
    $('.gal-prev', wrap).onclick = () => go(idx - 1);
    $$('#galDots span').forEach((d, i2) => d.onclick = () => go(i2));
    wrap.addEventListener('pointerdown', e => { sx = e.clientX; dx = 0; track.style.transition = 'none'; });
    wrap.addEventListener('pointermove', e => { if (sx == null) return; dx = e.clientX - sx; track.style.transform = `translateX(calc(-${idx * 100}% + ${dx}px))`; });
    const end = () => { if (sx == null) return; track.style.transition = ''; if (Math.abs(dx) > 42) go(idx + (dx < 0 ? 1 : -1)); else go(idx); sx = null; };
    wrap.addEventListener('pointerup', end); wrap.addEventListener('pointercancel', end);
    const _mobGal = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (innerWidth <= 820);
    const _galInterval = _mobGal ? 10000 : 5200; // v42: slower on mobile, still advances
    const timer = setInterval(() => {
      const v = $('.gal-slide.on video', track); if (v && !v.paused) return; go(idx + 1);
    }, _galInterval);
    wrap.addEventListener('pointerdown', () => clearInterval(timer), { once: true });
  })();
  $('#brkBtn').onclick = () => { const b = $('#pdBrk'); b.hidden = !b.hidden; $('#brkBtn').setAttribute('aria-expanded', String(!b.hidden)); };
  $$('#sizeRow .size-pill').forEach(s => s.onclick = () => { $$('#sizeRow .size-pill').forEach(x => x.classList.remove('on')); s.classList.add('on'); });
  bindTilt(view);
  window._pd = { p, qty: 1 };
  window._lastOrder = null;
};
window.Shivaa.pdQty = d => { window._pd.qty = Math.max(1, Math.min(9, window._pd.qty + d)); $('#pdQtyN').textContent = window._pd.qty; };
window.Shivaa.pdAdd = id => {
  const size = $('#sizeRow .size-pill.on')?.dataset.size || null;
  addToCart(id, window._pd.qty, size, $('#engrave')?.value || null);
};
window.Shivaa.pdBuy = async id => { window.Shivaa.pdAdd(id); location.hash = '#/checkout'; };
window.Shivaa.checkPin = () => {
  const v = $('#pincode').value.trim(); const m = $('#pinMsg');
  if (!/^\d{6}$/.test(v)) { m.hidden = false; m.style.color = 'var(--bad)'; m.textContent = 'Please enter a valid 6-digit pincode'; return; }
  m.hidden = false; m.style.color = 'var(--ok)';
  if (v === '341023') m.textContent = '✓ Jayal (home turf!) — delivery in 24 hours, free';
  else if (v.startsWith('34')) m.textContent = '✓ Rajasthan — insured delivery in 2–3 days';
  else m.textContent = '✓ Rest of India — insured delivery in 4–7 days';
};
window.Shivaa.pickRate = r => { window._rate = r; $$('#ratePick span').forEach((s, i) => { s.style.color = i < r ? 'var(--gold)' : 'var(--line)'; s.classList.toggle('picked', i === r - 1); }); };
window.Shivaa.postReview = async (e, pid) => {
  e.preventDefault();
  if (!state.user) return openLogin();
  try {
    await api('/api/reviews', { method: 'POST', body: JSON.stringify({ productId: pid, rating: window._rate || 5, text: $('#revText').value }) });
    toast('Thank you! Review posted ✦'); pages.product($('#view'), new URLSearchParams(), pid);
  } catch (err) { toast(err.message, 'err'); }
};
window.Shivaa.sizeGuide = () => openModal(`
  <h3 style="font-size:24px;margin-bottom:10px">Ring size guide</h3>
  <p style="color:var(--ink-2);font-size:14px;margin-bottom:14px">Cut a strip of paper, wrap it around the finger, mark the overlap and measure in mm:</p>
  <div class="mc-table-wrap"><table class="mc-table"><thead><tr><th>Indian size</th><th>Diameter (mm)</th><th>Circumference (mm)</th></tr></thead><tbody>
  ${[['10', 14.0, 44.0], ['12', 14.9, 46.8], ['14', 15.7, 49.3], ['16', 16.5, 51.9], ['18', 17.3, 54.4], ['20', 18.1, 56.9], ['22', 19.0, 59.7]].map(r => `<tr><td><b>${r[0]}</b></td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('')}
  </tbody></table></div>
  <p style="font-size:12.5px;color:var(--ink-3);margin-top:12px">Between sizes? Take the larger — we resize free within 30 days. Bangles: size 2.4 ≈ 2¼" internal diameter.</p>`);

/* ─────────── COMPARE / SHORTLIST ─────────── */
pages.compare = async (view, q) => {
  const shared = (q.get('ids') || '').split(',').map(x => x.trim()).filter(Boolean);
  if (shared.length) {
    const valid = normalizeCompare(shared).filter(id => state.productsCache.some(p => p.id === id));
    saveCompare(valid);
    history.replaceState(null, '', '#/compare');
  }
  const items = compareItems();
  if (!items.length) {
    view.innerHTML = `
    <section class="page-hero"><div class="dust" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="container"><div class="crumbs"><a href="#/">Home</a> / Compare</div><h1>Compare your <em class="disp-italic">shortlist</em></h1>
      <p>Add up to four pieces from product cards or product pages. The comparison uses only live prices and product details already shown on Shivaa.</p></div></section>
    <div class="empty pcmp-empty"><img src="/images/logo.png" class="empty-logo" alt=""><h3>Your compare tray is empty</h3><p style="margin:10px 0 22px;color:var(--ink-3)">Tap “Compare” on any piece to build a private shortlist on this device.</p><a class="btn btn-primary" href="#/shop">Explore Jewellery</a></div>`;
    updateCompareUI();
    return;
  }
  const total = items.reduce((a, p) => a + price(p).total, 0);
  const stoneRowNeeded = items.some(p => stoneInfo(p) !== '—');
  const row = (label, fn, cls = '') => `<tr class="${cls}"><th scope="row">${label}</th>${items.map(p => `<td>${fn(p)}</td>`).join('')}</tr>`;
  const metalLabel = p => p.metal === 'Silver' ? 'Silver 925' : p.purity + ' Gold';
  view.innerHTML = `
  <section class="page-hero"><div class="dust" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="container"><div class="crumbs"><a href="#/">Home</a> / Compare</div><h1>Compare your <em class="disp-italic">shortlist</em></h1>
    <p>${items.length} of ${COMPARE_MAX} pieces selected · prices recalculate from the current Jaipur live rate and product making-charge data.</p></div></section>

  <section class="sec container pcmp-page">
    <div class="pcmp-toolbar" aria-label="Compare shortlist actions">
      <div><span class="label">Compare</span><h2>Side-by-side clarity</h2><p>Use this before checkout or send the shortlist to Shivaa for guidance.</p></div>
      <div class="pcmp-tools">
        <a class="btn btn-ghost btn-sm" href="#/shop">Add more</a>
        <button type="button" class="btn btn-outline btn-sm" onclick="Shivaa.copyCompareLink()">Copy link</button>
        <button type="button" class="btn btn-primary btn-sm" onclick="Shivaa.waCompare()">${WA_SVG} Send shortlist</button>
        <button type="button" class="btn btn-ghost btn-sm" onclick="Shivaa.clearCompare()">Clear</button>
      </div>
    </div>

    <div class="pcmp-note">Current combined shortlist value: <b>${fmt(total)}</b> · indicative until order confirmation.</div>
    ${items.length < 2 ? '<div class="qty-banner pcmp-tip">Add one more piece to unlock a true side-by-side comparison.</div>' : ''}

    <div class="pcmp-grid" role="list">
      ${items.map(p => { const pr = price(p); return `<article class="pcmp-card" role="listitem">
        <button type="button" class="pcmp-remove" onclick="Shivaa.removeCompare('${p.id}')" aria-label="Remove ${esc(p.name)} from compare">×</button>
        <a href="#/product/${p.id}" class="pcmp-img"><img src="${p.images[0]}" alt="${esc(p.name)}"></a>
        <div class="pcmp-card-body">
          <span class="label">${esc(CATS[p.category]?.name || p.category)}</span>
          <h3><a href="#/product/${p.id}">${esc(p.name)}</a></h3>
          <p>${esc(metalLabel(p))} · ${p.weightG} g · SKU ${esc(p.sku || p.id)}</p>
          <b class="pcmp-price js-price" data-pid="${p.id}" data-qty="1">${fmt(pr.total)}</b><small> incl. GST</small>
          <div class="pcmp-card-actions"><button type="button" class="btn btn-outline btn-sm" onclick="Shivaa.addToCart('${p.id}')">Add to Cart</button><button type="button" class="btn btn-ghost btn-sm" onclick="Shivaa.waProduct('${p.id}')">${WA_SVG} Chat</button></div>
        </div>
      </article>`; }).join('')}
    </div>

    <div class="pcmp-table-wrap" tabindex="0" aria-label="Scrollable product comparison table">
      <table class="pcmp-table">
        <caption class="sr-only">Side-by-side product comparison using current product data</caption>
        <thead><tr><th scope="col">Detail</th>${items.map(p => `<th scope="col"><a href="#/product/${p.id}">${esc(p.name)}</a></th>`).join('')}</tr></thead>
        <tbody>
          ${row('Live price', p => { const pr = price(p); return `<b class="js-price" data-pid="${p.id}" data-qty="1">${fmt(pr.total)}</b><small> incl. 3% GST</small>`; }, 'pcmp-total-row')}
          ${row('Metal value', p => fmt(price(p).metalValue))}
          ${row('Making charges', p => fmt(price(p).makingCharge))}
          ${row('GST', p => fmt(price(p).gst))}
          ${row('Rate basis', p => { const pr = price(p); return `${esc(metalLabel(p))} · ${pr.ratePerGram % 1 ? fmt2(pr.ratePerGram) : fmt(pr.ratePerGram)}/g`; })}
          ${row('Net weight', p => `${p.weightG} g`)}
          ${row('Category', p => esc(CATS[p.category]?.name || p.category))}
          ${row('SKU', p => esc(p.sku || p.id))}
          ${stoneRowNeeded ? row('Stone details', p => esc(stoneInfo(p))) : ''}
          ${items.some(p => (p.sizes || []).length) ? row('Available sizes', p => (p.sizes || []).length ? esc((p.sizes || []).join(', ')) : '—') : ''}
        </tbody>
      </table>
    </div>

    <div class="pcmp-foot-cta">
      <div><b>Need help choosing?</b><p>Send this exact shortlist to Shivaa; we will guide you using only the product details shown here.</p></div>
      <button type="button" class="btn btn-gold" onclick="Shivaa.waCompare()">${WA_SVG} Share on WhatsApp</button>
    </div>
  </section>`;
  updateCompareUI();
  bindTilt(view);
};

/* ─────────── CART ─────────── */
pages.cart = async (view) => {
  if (!state.cart.length) {
    view.innerHTML = `<div class="empty" style="padding:110px 20px"><img src="/images/logo.png" class="empty-logo" alt=""><h3>Your cart awaits its sparkle</h3><p style="margin:10px 0 22px;color:var(--ink-3)">Add a piece and watch its price live-update here.</p><a class="btn btn-primary" href="#/shop">Explore Jewellery</a></div>`;
    return;
  }
  const items = state.cart.map(c => ({ ...c, p: state.productsCache.find(x => x.id === c.id) })).filter(x => x.p);
  const lines = items.map(it => ({ it, pr: price(it.p) }));
  const subtotal = lines.reduce((a, l) => a + l.pr.total * l.it.qty, 0);
  const shipping = subtotal >= state.settings.freeShipAbove ? 0 : state.settings.shippingFee;
  view.innerHTML = `
  <section class="page-hero"><div class="dust" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="container"><div class="crumbs"><a href="#/">Home</a> / Cart</div><h1>Your Cart</h1>
  <p>${lines.length} piece${lines.length > 1 ? 's' : ''} · priced at the live Jaipur rate of ${timeFmt(state.rates.t)}</p></div></section>
  <div class="container cart-layout">
    <div>
      <div class="cart-items">
        ${lines.map(({ it, pr }) => `
        <div class="cart-item">
          <a href="#/product/${it.p.id}"><img src="${it.p.images[0]}" alt=""></a>
          <div>
            <a href="#/product/${it.p.id}" class="ci-name">${esc(it.p.name)}</a>
            <div class="ci-meta">${it.p.metal === 'Silver' ? 'Silver 925' : it.p.purity + ' gold'} · ${it.p.weightG} g${it.size ? ' · size ' + esc(it.size) : ''}${it.engraving ? ' · engraved “' + esc(it.engraving) + '”' : ''}</div>
            <div class="ci-meta js-price" data-pid="${it.p.id}" data-qty="${it.qty}">${fmt(pr.total * it.qty)} <span style="opacity:.6">(live · incl. GST)</span></div>
            <div class="qty-row" style="transform:scale(.86);transform-origin:left">
              <button onclick="Shivaa.cartQty('${it.id}','${it.size || ''}',-1)">−</button><b>${it.qty}</b><button onclick="Shivaa.cartQty('${it.id}','${it.size || ''}',1)">+</button>
            </div>
          </div>
          <div class="ci-right"><b>${fmt(pr.total * it.qty)}</b><br><a class="ci-remove" href="javascript:Shivaa.cartRemove('${it.id}','${it.size || ''}')">Remove</a></div>
        </div>`).join('')}
      </div>
      <div class="qty-banner">◈ Prices in your cart re-compute automatically with every rate refresh (every ~10 minutes) and are finally locked at checkout.</div>
    </div>
    <div class="summary">
      <div class="sum-logo"><span>Shivaa · Secure Checkout</span><img src="/images/logo.png" alt=""></div>
      <h3>Order Summary</h3>
      <div class="sum-row"><span>Subtotal (${cartCount()} items, incl. GST)</span><b>${fmt(subtotal)}</b></div>
      <div class="sum-row"><span>Shipping (insured)</span>${shipping === 0 ? '<span class="free">FREE</span>' : `<b>${fmt(shipping)}</b>`}</div>
      ${shipping > 0 ? `<div class="sum-row" style="font-size:12.5px;color:var(--ink-3)"><span>Add ${fmt(state.settings.freeShipAbove - subtotal)} for free shipping</span><span></span></div>` : ''}
      <div class="sum-row total"><span>Total</span><b>${fmt(subtotal + shipping)}</b></div>
      <div style="margin:16px 0 6px" class="label" id="ptLbl">Loyalty & offers applied at checkout →</div>
      <a class="btn btn-primary btn-block btn-lg" href="#/checkout">Proceed to Checkout</a>
      <button class="btn btn-ghost btn-block mt-2" onclick="Shivaa.waOpenCart()">Order via WhatsApp chat <span class="mini-wa">${WA_SVG}</span></button>
      <a class="btn btn-ghost btn-block btn-sm mt-2" href="#/shop">Continue shopping</a>
    </div>
  </div>`;
};
window.Shivaa.cartQty = (id, size, d) => {
  const it = state.cart.find(i => i.id === id && (i.size || '') === size);
  if (!it) return;
  it.qty += d;
  if (it.qty <= 0) state.cart = state.cart.filter(i => i !== it);
  store.set('shv_cart', state.cart); updateBadges(); pages.cart($('#view'));
};
window.Shivaa.cartRemove = (id, size) => {
  state.cart = state.cart.filter(i => !(i.id === id && (i.size || '') === size));
  store.set('shv_cart', state.cart); updateBadges(); pages.cart($('#view'));
};

/* ─────────── CHECKOUT ─────────── */
pages.checkout = async (view) => {
  if (!state.cart.length) { location.hash = '#/cart'; return; }
  if (!state.user) { openLogin('checkout'); return; }
  const items = state.cart.map(c => ({ ...c, p: state.productsCache.find(x => x.id === c.id) })).filter(x => x.p);
  const subtotal = items.reduce((a, it) => a + price(it.p).total * it.qty, 0);
  const freeShip = subtotal >= state.settings.freeShipAbove;
  view.innerHTML = `
  <section class="page-hero"><div class="dust" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="container"><div class="crumbs"><a href="#/cart">Cart</a> / Checkout</div><h1>Checkout</h1></div></section>
  <div class="container cart-layout" style="padding-top:40px">
    <div>
      <div class="sec-title">Delivery address</div>
      <form id="addrForm" class="form-grid">
        <div class="fld"><label for="adName">Full name</label><input id="adName" name="name" autocomplete="name" required value="${esc(state.user.name)}"></div>
        <div class="fld"><label for="adPhone">Phone</label><input id="adPhone" name="phone" type="tel" inputmode="tel" autocomplete="tel" required value="${esc(state.user.phone || '')}" placeholder="+91"></div>
        <div class="fld full"><label for="adLine">Address (house, street, landmark)</label><input id="adLine" name="line" autocomplete="street-address" required placeholder="House no, street, landmark"></div>
        <div class="fld"><label for="adCity">City</label><input id="adCity" name="city" autocomplete="address-level2" required></div>
        <div class="fld"><label for="adState">State</label><input id="adState" name="state" autocomplete="address-level1" required value="Rajasthan"></div>
        <div class="fld"><label for="adPin">Pincode</label><input id="adPin" name="pincode" inputmode="numeric" autocomplete="postal-code" required maxlength="6" pattern="\\d{6}" placeholder="341023"></div>
        <div class="fld"><label for="adCountry">Country</label><input id="adCountry" name="country" value="India" readonly></div>
      </form>

      <div class="sec-title">Payment method</div>
      <div style="display:grid;gap:12px" id="payOpts">
        <label class="pay-opt on"><input type="radio" name="pay" value="UPI" checked><span><b>UPI — GPay / PhonePe / Paytm</b><small>Instant & secure · earn 2× loyalty points this week</small></span></label>
        <label class="pay-opt"><input type="radio" name="pay" value="Card"><span><b>Credit / Debit Card</b><small>No-cost EMI available on 3-month tenures</small></span></label>
        <label class="pay-opt"><input type="radio" name="pay" value="Netbanking"><span><b>Netbanking</b><small>All major banks</small></span></label>
        <label class="pay-opt"><input type="radio" name="pay" value="COD"><span><b>Cash on Delivery</b><small>Available on orders below ${fmt(50000)} · ID verification at handover</small></span></label>
        <label class="pay-opt"><input type="radio" name="pay" value="WhatsApp"><span><b>WhatsApp Order</b><small>Our team confirms the order & payment (UPI / bank / card) on chat</small></span></label>
      </div>
      <div class="qty-banner mt-2">🔒 Demo checkout — no real payment is processed. Orders, invoices & inventory are fully functional in this system.</div>
    </div>

    <div class="summary">
      <div class="sum-logo"><span>Shivaa · Secure Checkout</span><img src="/images/logo.png" alt=""></div>
      <h3>Your Order</h3>
      ${items.map(it => `<div class="sum-row"><span>${esc(it.p.name)}${it.size ? ' (' + esc(it.size) + ')' : ''} × ${it.qty}</span><b data-copid="${it.p.id}" data-qty="${it.qty}">${fmt(price(it.p).total * it.qty)}</b></div>`).join('')}
      <div class="coupon-row"><input id="couponIn" placeholder="Coupon code"><button class="btn btn-ghost btn-sm" onclick="Shivaa.applyCoupon()">Apply</button></div>
      <div id="couponMsg" style="font-size:12.5px;min-height:18px"></div>
      ${state.user.loyaltyPoints > 0 ? `<div class="points-box">✦ You have <b>${state.user.loyaltyPoints} royalty points</b> (₹1 each). <label style="display:flex;gap:8px;align-items:center;margin-top:6px"><input type="checkbox" id="usePts" onchange="Shivaa.updateCheckout()"> Redeem up to ${Math.min(state.user.loyaltyPoints, Math.floor(subtotal * 0.1))} pts (10% cap)</label></div>` : ''}
      <div class="sum-row"><span>Subtotal</span><b id="coSub">${fmt(subtotal)}</b></div>
      <div class="sum-row" id="coDiscRow" hidden><span>Coupon discount</span><b id="coDisc" style="color:var(--ok)">− ₹0</b></div>
      <div class="sum-row"><span>Shipping</span>${freeShip ? '<span class="free">FREE</span>' : `<b id="coShip">${fmt(state.settings.shippingFee)}</b>`}</div>
      <div class="sum-row total"><span>Total</span><b id="coTotal">${fmt(subtotal + (freeShip ? 0 : state.settings.shippingFee))}</b></div>
      <button class="btn btn-gold btn-block btn-lg mt-2" id="placeBtn" onclick="Shivaa.placeOrder()">Place Order ✦</button>
    </div>
  </div>`;
  window._co = { subtotal, freeShip, coupon: null, disc: 0 };
  $$('#payOpts input').forEach(r => r.onchange = () => { $$('.pay-opt').forEach(o => o.classList.remove('on')); r.closest('.pay-opt').classList.add('on'); });
};
window.Shivaa.applyCoupon = async () => {
  const code = $('#couponIn').value.trim();
  const msg = $('#couponMsg');
  if (!code) return;
  try {
    const c = await api('/api/coupons/validate', { method: 'POST', body: JSON.stringify({ code, amount: window._co.subtotal }) });
    window._co.coupon = c.code;
    window._co.disc = c.type === 'percent' ? Math.round(window._co.subtotal * c.value / 100) : c.value;
    msg.style.color = 'var(--ok)'; msg.textContent = `✓ ${esc(c.code)} applied — you save ${fmt(window._co.disc)}`;
  } catch (e) { window._co.coupon = null; window._co.disc = 0; msg.style.color = 'var(--bad)'; msg.textContent = e.message; }
  window.Shivaa.updateCheckout();
};
window.Shivaa.updateCheckout = () => {
  if (!window._co) return;
  let disc = window._co.disc;
  if ($('#usePts')?.checked) disc += Math.min(state.user.loyaltyPoints, Math.floor(window._co.subtotal * 0.1));
  const ship = window._co.freeShip ? 0 : state.settings.shippingFee;
  $('#coDiscRow').hidden = !(disc > 0);
  $('#coDisc').textContent = '− ' + fmt(disc);
  $('#coTotal').textContent = fmt(Math.max(0, window._co.subtotal - disc + ship));
};
window.Shivaa.placeOrder = async () => {
  const form = $('#addrForm');
  if (!form.reportValidity()) return;
  const btn = $('#placeBtn'); btn.disabled = true; btn.textContent = 'Placing order…';
  // read by field name — positional indexing breaks the moment a field is added
  const fd = new FormData(form);
  const g = k => String(fd.get(k) || '').trim();
  const address = { name: g('name'), phone: g('phone'), line: g('line'), city: g('city'),
                    state: g('state'), pincode: g('pincode'), country: g('country') || 'India' };
  const payEl = $('#payOpts input:checked');
  if (!payEl) { toast('Please choose a payment method', 'err'); btn.disabled = false; btn.textContent = 'Place Order \u2726'; return; }
  const paymentMethod = payEl.value;
  try {
    const order = await api('/api/orders', { method: 'POST', body: JSON.stringify({
      items: state.cart.map(c => ({ id: c.id, qty: c.qty, size: c.size, engraving: c.engraving })),
      address, paymentMethod, coupon: window._co.coupon, usePoints: !!$('#usePts')?.checked,
    }) });
    state.cart = []; store.set('shv_cart', state.cart); updateBadges();
    if (state.user) state.user.loyaltyPoints = Math.max(0, (state.user.loyaltyPoints || 0) - (order.pointsUsed || 0)) + order.earnedPoints;
    window._lastOrder = order;
    if (paymentMethod === 'WhatsApp') {
      const w = waOpen(waOrderMsg(order));
      if (!w) toast('Popup blocked — use the "Confirm & Pay on WhatsApp" button on your order page', 'err');
    }
    location.hash = '#/order/' + order.id;
  } catch (e) { toast(e.message, 'err'); btn.disabled = false; btn.textContent = 'Place Order ✦'; }
};

/* ─────────── ORDER CONFIRMATION ─────────── */
pages.order = async (view, q, id) => {
  let order;
  try { order = (await api('/api/orders/' + id)).order; } catch (e) { view.innerHTML = `<div class="empty"><h3>Order not found</h3></div>`; return; }
  window._lastOrder = order;
  view.innerHTML = `
  <div style="min-height:70vh;display:flex;align-items:center;padding:60px 0">
    <div class="container" style="max-width:860px">
      <div class="center rv in">
        <img src="/images/logo.png" class="order-logo" alt="Shivaa">
        <div style="font-size:34px;margin-bottom:8px;color:var(--gold)">✦</div>
        <span class="label">Order placed</span>
        <h1 style="font-size:42px">Shubh Aashirwad, ${esc(order.userName.split(' ')[0])}!</h1>
        <p style="color:var(--ink-2)">Order <b style="color:var(--maroon)">${order.id}</b> is confirmed. You earned <b style="color:var(--gold)">${order.earnedPoints} royalty points</b> ✦<br>
        Invoice & rate-lock summary sent to your account. Live tracking below.</p>
      </div>
      <div class="order-card mt-3">
        <div class="order-top"><div class="order-id">${order.id} · ${timeFmt(order.createdAt)}</div><span class="status-pill st-${order.status.toLowerCase()}">${order.status}</span></div>
        ${order.items.map(it => `<div class="sum-row"><span>${esc(it.name)}${it.size ? ' (' + esc(it.size) + ')' : ''} × ${it.qty}</span><b>${fmt(it.unitPrice * it.qty)}</b></div>`).join('')}
        <div class="sum-row"><span>Rate locked at</span><b>${fmt(order.rateSnapshot.gold22 || order.rateSnapshot.silver)}/g (${esc(order.rateSnapshot.stampedAt ? timeFmt(order.rateSnapshot.stampedAt) : 'order time')})</b></div>
        <div class="sum-row"><span>Subtotal</span><b>${fmt(order.subtotal)}</b></div>
        ${order.discount ? `<div class="sum-row"><span>Discount${order.coupon ? ' (' + esc(order.coupon) + ')' : ''}${order.pointsUsed ? ' · ' + order.pointsUsed + ' pts' : ''}</span><b style="color:var(--ok)">− ${fmt(order.discount)}</b></div>` : ''}
        <div class="sum-row"><span>Shipping</span>${order.shipping === 0 ? '<span class="free">FREE</span>' : `<b>${fmt(order.shipping)}</b>`}</div>
        <div class="sum-row total"><span>Paid via ${esc(order.paymentMethod)}</span><b>${fmt(order.total)}</b></div>
        <div class="timeline mt-2">${['Placed', 'Packed', 'Shipped', 'Delivered'].map(s => `<div class="tl-step ${order.timeline.find(t => t.s === s) ? 'done' : ''}">${s}</div>`).join('')}</div>
      </div>
      ${order.paymentMethod === 'WhatsApp' ? `<div class="wa-hint" style="justify-content:center;max-width:640px;margin:0 auto 18px">Your order is reserved — confirm &amp; pay on WhatsApp to lock today's rate.</div>
      <div class="center" style="margin-bottom:18px"><button class="btn btn-gold btn-lg" onclick="Shivaa.waOpenOrder('${order.id}')">Confirm &amp; Pay on WhatsApp</button></div>` : ''}
      <div class="center"><a class="btn btn-primary" href="#/account?tab=orders">View All Orders</a> <a class="btn btn-ghost" href="#/shop" style="margin-left:10px">Continue Shopping</a></div>
    </div>
  </div>`;
  confetti();
};
function confetti() {
  const c = document.createElement('canvas');
  Object.assign(c.style, { position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 300 });
  document.body.appendChild(c);
  const x = c.getContext('2d');
  c.width = innerWidth; c.height = innerHeight;
  const ps = Array.from({ length: 130 }, () => ({ x: Math.random() * c.width, y: -20 - Math.random() * c.height * 0.5, v: 2 + Math.random() * 3, s: 4 + Math.random() * 5, r: Math.random() * 7, vr: (Math.random() - .5) * .3, col: ['#b98a2f', '#d4af5a', '#6e1e2a', '#f3dfae'][Math.floor(Math.random() * 4)] }));
  let n = 0;
  (function f() {
    n++; x.clearRect(0, 0, c.width, c.height);
    ps.forEach(p => { p.y += p.v; p.r += p.vr; x.save(); x.translate(p.x, p.y); x.rotate(p.r); x.fillStyle = p.col; x.globalAlpha = Math.max(0, 1 - n / 260); x.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * .6); x.restore(); });
    if (n < 260) requestAnimationFrame(f); else c.remove();
  })();
}

/* ─────────── WISHLIST ─────────── */
pages.account = async (view, q) => {
  if (!state.user) { openLogin('account'); return; }
  const tab = q.get('tab') || 'home';
  const me = state.user;
  // v31 — a failed fetch must never blank the account page; if the session
  // died (401), api() has already cleared it, so show the login gate.
  let orders = [], wl = [];
  try { orders = (await api('/api/orders')).orders || []; }
  catch (e) { if (!state.user) { openLogin('account'); return; } }
  try { wl = (await api('/api/wishlist')).wishlist || []; }
  catch (e) { if (!state.user) { openLogin('account'); return; } }
  const tier = me.loyaltyPoints > 5000 ? 'Gold' : me.loyaltyPoints > 2000 ? 'Silver' : 'Bronze';
  const initials = me.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const prof = me.profile || {};
  const filled = ['name', 'phone', 'email'].filter(k => me[k]).length + ['dob', 'anniversary', 'gender'].filter(k => prof[k]).length;
  const profPct = Math.round(filled / 6 * 100);
  const nAdr = (me.addresses || []).length;

  const tiles = [
    ['overview', '◈', 'Account Overview', 'Your details, occasions & preferences'],
    ['orders', '▦', 'My Orders', orders.length + ' order' + (orders.length === 1 ? '' : 's')],
    ['addresses', '⌖', 'Manage Addresses', nAdr ? nAdr + ' saved · deliveries & billing' : 'Add delivery addresses'],
    ['loyalty', '✦', 'Royalty Points', me.loyaltyPoints + ' pts · ' + tier + ' tier'],
    ['wishlist', '♡', 'My Wishlist', wl.length + ' saved piece' + (wl.length === 1 ? '' : 's')],
  ];

  view.innerHTML = `
  <section class="page-hero"><div class="dust" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="container"><div class="crumbs"><a href="#/">Home</a> / My Account</div><h1>Namaste, ${esc(me.name.split(' ')[0])}</h1>
  <p>Your Shivaa world — orders, occasions, addresses and royalty, in one place.</p></div></section>
  <div class="container acct-wrap">
    <div class="acct-hero">
      <div class="ah-id">
        <span class="ah-av">${esc(initials)}</span>
        <div><b>${esc(me.name)}</b><small>${esc(me.email)} · member since ${dateFmt(me.createdAt)}</small>
        <span class="ah-tier ${tier.toLowerCase()}">✦ ${tier} Royalty · ${me.loyaltyPoints} pts</span></div>
      </div>
      <button class="btn btn-outline btn-sm" onclick="location.hash='#/account?tab=overview'">Edit Profile</button>
    </div>

    <div class="acct-tiles">
      ${isPartner() ? `<a href="#/partner" class="acct-tile portal"><span class="at-ic">✦</span><span class="at-tx"><b>Partner Portal</b><small>bullion desk · design selection · schemes · reports</small></span><span class="at-go">›</span></a>` : ''}
      ${tiles.map(t => `<a href="#/account?tab=${t[0]}" class="acct-tile ${tab === t[0] ? 'on' : ''}"><span class="at-ic">${t[1]}</span><span class="at-tx"><b>${t[2]}</b><small>${t[3]}</small></span><span class="at-go">›</span></a>`).join('')}
      <a href="javascript:Shivaa.logout()" class="acct-tile danger"><span class="at-ic">↩</span><span class="at-tx"><b>Logout</b><small>sign out safely</small></span><span class="at-go">›</span></a>
    </div>

    <div id="acctBody" class="acct-body">
  ${tab === 'overview' ? `
    <div class="acct-sec">
      <div class="as-head"><h3>Account Overview</h3><span class="as-note">Complete your profile for personalised offers</span></div>
      <div class="prof-meter"><div class="pm-bar"><i style="width:${profPct}%"></i></div><b>${profPct}% complete</b></div>
      <form class="form-grid prof-form" onsubmit="Shivaa.saveProfile(event)">
        <div class="fld"><label>Full name</label><input id="pfName" value="${esc(me.name)}" required></div>
        <div class="fld"><label>Mobile (OTP verified ✓)</label><input value="${esc(me.phone || '')}" readonly class="locked"></div>
        <div class="fld"><label>Email</label><input value="${esc(me.email)}" readonly class="locked"></div>
        <div class="fld"><label>Date of Birth 🎂</label><input id="pfDob" type="date" value="${esc(prof.dob || '')}"></div>
        <div class="fld"><label>Anniversary 💛</label><input id="pfAnn" type="date" value="${esc(prof.anniversary || '')}"></div>
        <div class="fld"><label>Gender</label><select id="pfGender" class="sortsel" style="width:100%;border-radius:12px">
          <option value="">Select…</option>
          ${['Male', 'Female', 'Other'].map(g => `<option ${prof.gender === g ? 'selected' : ''}>${g}</option>`).join('')}
        </select></div>
        <button class="btn btn-primary" style="grid-column:1/-1;justify-self:start">Save My Details</button>
      </form>
      <div class="qty-banner">✦ We remember your big days — birthday &amp; anniversary month brings 2× royalty points and first look at festive designs.</div>
    </div>` : ''}
  ${tab === 'orders' ? orders.map(o => `<div class="order-card">
      <div class="order-top"><div><div class="order-id">${o.id}</div><div style="font-size:12.5px;color:var(--ink-3)">${timeFmt(o.createdAt)} · ${o.items.reduce((a, i) => a + i.qty, 0)} items · ${esc(o.paymentMethod)}</div></div>
      <div style="text-align:right"><span class="status-pill st-${o.status.toLowerCase()}">${o.status}</span><div style="margin-top:6px"><b>${fmt(o.total)}</b></div></div></div>
      <div class="timeline">${['Placed', 'Packed', 'Shipped', 'Delivered'].map(s => `<div class="tl-step ${o.timeline.find(t => t.s === s) ? 'done' : ''}">${s}</div>`).join('')}</div>
      <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-top:8px">
        ${o.items.map(i => `<img src="${i.img}" style="width:44px;height:44px;border-radius:9px;object-fit:cover" alt="">`).join('')}
        <a class="btn btn-ghost btn-sm" href="javascript:Shivaa.orderDetail('${o.id}')">Details</a>
          <a class="btn btn-outline btn-sm" href="#/invoice/${o.id}" target="_blank">⬇ Invoice</a>
      </div></div>`).join('') || '<div class="empty"><h3>No orders yet</h3><a class="btn btn-outline" href="#/shop">Start shopping</a></div>' : ''}
  ${tab === 'addresses' ? `
    <div class="acct-sec">
      <div class="as-head"><h3>Manage Addresses</h3><button class="btn btn-primary btn-sm" onclick="Shivaa.addrForm()">+ Add Address</button></div>
      <div id="addrFormWrap" hidden>
        <form class="form-grid" onsubmit="Shivaa.addrSave(event)">
          <input type="hidden" id="adId">
          <div class="fld"><label>Label</label><select id="adLabel" class="sortsel" style="width:100%;border-radius:12px">${['Home', 'Work', 'Other'].map(l => `<option>${l}</option>`).join('')}</select></div>
          <div class="fld"><label>Full name *</label><input id="adName" required></div>
          <div class="fld"><label>Phone *</label><input id="adPhone" maxlength="10" inputmode="numeric" required></div>
          <div class="fld"><label>Pincode *</label><input id="adPin" maxlength="6" inputmode="numeric" required></div>
          <div class="fld full"><label>Address (house, street, landmark) *</label><input id="adLine" required></div>
          <div class="fld"><label>City *</label><input id="adCity" required></div>
          <div class="fld"><label>State</label><input id="adState" value="Rajasthan"></div>
          <div class="fld full" style="display:flex;gap:10px;align-items:center"><input type="checkbox" id="adDef" style="accent-color:var(--gold);width:17px;height:17px"><label style="margin:0" for="adDef">Make this my default address</label></div>
          <div style="display:flex;gap:10px;grid-column:1/-1">
            <button class="btn btn-primary btn-sm">Save Address</button>
            <button type="button" class="btn btn-ghost btn-sm" onclick="Shivaa.addrForm(false)">Cancel</button>
          </div>
        </form>
      </div>
      <div class="addr-list">
        ${(me.addresses || []).map(a => `
        <div class="addr-card ${a.isDefault ? 'def' : ''}">
          <div class="ac-top"><span class="ac-label">${esc(a.label)}</span>${a.isDefault ? '<span class="ac-def">✓ Default</span>' : ''}</div>
          <b>${esc(a.name)} · ${esc(a.phone)}</b>
          <p>${esc(a.line)}, ${esc(a.city)}, ${esc(a.state)} — ${esc(a.pincode)}</p>
          <div class="ac-actions">
            ${a.isDefault ? '' : `<button class="btn btn-ghost btn-sm" onclick="Shivaa.addrDefault('${a.id}')">Make Default</button>`}
            <button class="btn btn-ghost btn-sm" onclick="Shivaa.addrEdit('${a.id}')">Edit</button>
            <button class="btn btn-ghost btn-sm" onclick="Shivaa.addrDel('${a.id}')">Delete</button>
          </div>
        </div>`).join('') || '<div class="qty-banner">No addresses saved yet — add one for faster checkout.</div>'}
      </div>
    </div>` : ''}
  ${tab === 'loyalty' ? `
    <div class="acct-sec">
      <div class="as-head"><h3>Shivaa Royalty</h3></div>
      <div class="loyalty-card mb-2">
        <small style="letter-spacing:.2em;text-transform:uppercase;color:rgba(246,232,200,.7)">Royalty Balance</small>
        <b>${me.loyaltyPoints}</b> <span style="font-size:15px">points</span>
        <div class="tier-row">${['Bronze', 'Silver', 'Gold'].map(t => `<span class="tier ${t === tier ? 'on' : ''}">${t}</span>`).join('')}</div>
        <p style="font-size:13px;margin-top:14px;color:rgba(246,232,200,.8)">1 point per ₹100 spent · 1 point = ₹1 on future orders (up to 10%) · birthday &amp; anniversary month 2× points</p>
      </div>
      <div class="order-card"><h3 style="margin-bottom:12px">How Royalty works</h3>
        <div class="benefit"><div class="bic">✦</div><div><b>Earn on every order</b><p>Points post instantly at checkout.</p></div></div>
        <div class="benefit"><div class="bic">◈</div><div><b>Redeem at checkout</b><p>Tick "redeem points" on the payment page.</p></div></div>
        <div class="benefit"><div class="bic">❖</div><div><b>Never expire</b><p>Your points wait for the next auspicious occasion.</p></div></div>
      </div>
    </div>` : ''}
    </div>
  </div>
  <div style="height:40px"></div>`;
};
window.Shivaa.saveProfile = async e => {
  e.preventDefault();
  try {
    const r = await api('/api/auth/profile', { method: 'PUT', body: JSON.stringify({
      name: $('#pfName').value, dob: $('#pfDob').value, anniversary: $('#pfAnn').value, gender: $('#pfGender').value,
    }) });
    state.user = r.user;
    toast('Profile saved ✦'); location.hash = '#/account?tab=overview';
  } catch (err) { toast(err.message, 'err'); }
};
window.Shivaa.addrForm = (open = true) => { const w = $('#addrFormWrap'); if (w) { w.hidden = !open; if (open) w.scrollIntoView({ behavior: 'smooth', block: 'center' }); } };
window.Shivaa.addrEdit = id => {
  const a = (state.user.addresses || []).find(x => x.id === id); if (!a) return;
  Shivaa.addrForm(true);
  $('#adId').value = a.id; $('#adLabel').value = a.label; $('#adName').value = a.name; $('#adPhone').value = a.phone;
  $('#adPin').value = a.pincode; $('#adLine').value = a.line; $('#adCity').value = a.city; $('#adState').value = a.state; $('#adDef').checked = !!a.isDefault;
};
window.Shivaa.addrSave = async e => {
  e.preventDefault();
  const body = { label: $('#adLabel').value, name: $('#adName').value, phone: $('#adPhone').value, pincode: $('#adPin').value,
                 line: $('#adLine').value, city: $('#adCity').value, state: $('#adState').value, isDefault: $('#adDef').checked };
  try {
    const id = $('#adId').value;
    const r = await api(id ? '/api/addresses/' + id : '/api/addresses', { method: id ? 'PUT' : 'POST', body: JSON.stringify(body) });
    state.user.addresses = r.addresses;
    toast(id ? 'Address updated ✦' : 'Address saved ✦'); pages.account($('#view'), new URLSearchParams('tab=addresses'));
  } catch (err) { toast(err.message, 'err'); }
};
window.Shivaa.addrDefault = async id => {
  try { const r = await api('/api/addresses/' + id, { method: 'PUT', body: JSON.stringify({ setDefault: true }) });
    state.user.addresses = r.addresses; toast('Default address set ✦'); pages.account($('#view'), new URLSearchParams('tab=addresses')); }
  catch (e) { toast(e.message, 'err'); }
};
window.Shivaa.addrDel = async id => {
  if (!confirm('Delete this address?')) return;
  try { const r = await api('/api/addresses/' + id, { method: 'DELETE' });
    state.user.addresses = r.addresses; toast('Address deleted'); pages.account($('#view'), new URLSearchParams('tab=addresses')); }
  catch (e) { toast(e.message, 'err'); }
};
pages.wishlist = async (view) => {
  let items = [], wl = [];
  if (state.user) { const r = await api('/api/wishlist'); wl = r.wishlist; items = r.items; }
  else { wl = state.localWish; items = state.productsCache.filter(p => state.localWish.includes(p.id)); }
  view.innerHTML = `
  <section class="page-hero"><div class="dust" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="container"><div class="crumbs"><a href="#/">Home</a> / Wishlist</div><h1>Wishlist</h1><p>${items.length} saved piece${items.length === 1 ? '' : 's'}${state.user ? '' : ' · login to sync across devices'}</p></div></section>
  <div class="container" style="padding:44px 0 90px">
    ${items.length ? `<div class="p-grid">${items.map(p => productCard(p, { wishSet: wl })).join('')}</div>`
    : `<div class="empty"><img src="/images/logo.png" class="empty-logo" alt=""><h3>Nothing saved yet</h3><p style="margin:10px 0 20px">Tap the heart on any piece to keep it here.</p><a class="btn btn-primary" href="#/shop">Explore Jewellery</a></div>`}
  </div>`;
};

/* ─────────── RATES PAGE ─────────── */
pages.rates = async (view) => {
  const R = state.rates;
  view.innerHTML = `
  <section class="page-hero"><div class="dust" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="container"><div class="crumbs"><a href="#/">Home</a> / Live Rates</div><h1>Today's Gold & Silver Rates</h1>
  <p>The same feed that powers every price on shivaa.in — sourced from the international bullion market, refreshed automatically every ~10 minutes.</p></div></section>
  <div class="container" style="padding:44px 0 90px">
    <div class="jaipur-hero rv">
      <div class="jh-main">
        <span class="jh-badge">✦ JAIPUR MARKET RATE</span>
        <div class="jh-name">Gold 22K <small>(91.67)</small></div>
        <div class="jh-val">${fmt(R.gold22)}<small>/gram</small></div>
        <div class="jh-sub">₹${Math.round(R.gold22 * 10).toLocaleString('en-IN')} per 10 g · updated ${timeFmt(R.t)}</div>
      </div>
      <div class="jh-side">
        <div class="jh-row"><span>International spot (22K)</span><b>${fmt(R.spot.gold22)}/g</b></div>
        <div class="jh-row"><span>Jaipur market premium</span><b>+₹${R.premium.gold}/g</b></div>
        <div class="jh-row"><span>Silver (Jaipur 925)</span><b>${fmt2(R.silver)}/g</b></div>
        <div class="jh-note">These Jaipur rates power every price on shivaa.in — your bill matches this card to the rupee.</div>
      </div>
    </div>
    <div class="rate-cards">
      ${[['GOLD 24K · JAIPUR', 'gold24', '99.99% fine — reference'], ['GOLD 22K · JAIPUR', 'gold22', '91.67% — jewellery grade'], ['GOLD 18K · JAIPUR', 'gold18', '75.0% — contemporary'], ['SILVER 925 · JAIPUR', 'silver', 'sterling — jewellery grade']]
        .map(c => `<div class="rate-card ${c[0].includes('GOLD') ? 'gold' : ''} rv"><div class="rc-name">${c[0]}</div><div class="rc-val">${c[1] === 'silver' ? fmt2(R[c[1]]) : fmt(R[c[1]])}</div><small>per gram · ${c[2]}</small><div style="margin-top:10px;font-size:12px;color:var(--ink-3)">per 10 g: <b>${c[1] === 'silver' ? fmt2(R[c[1]] * 10) : fmt(R[c[1]] * 10)}</b></div></div>`).join('')}
    </div>
    <div class="chart-wrap mt-3 rv"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:8px">
      <h3 style="font-size:20px;display:flex;align-items:center;gap:10px"><img src="/images/logo.png" style="height:26px;background:var(--white);border:1px solid var(--line);border-radius:7px;padding:3px 8px" alt=""> 22K Gold — last 12 hours <small style="font-weight:400;color:var(--ink-3);font-size:13px">(per gram)</small></h3>
      <span class="src-badge ${R.source === 'live' ? 'src-live' : 'src-sim'}">${R.source === 'live' ? '<span class="live-dot"></span>LIVE FEED' : 'SIMULATED FEED*'}</span></div>
      <canvas id="rateChart"></canvas></div>
    <div class="grid2 mt-3">
      <div class="adm-card"><h3>Get a rate alert</h3>
        <form class="form-grid" onsubmit="Shivaa.rateAlert(event)">
          <div class="fld"><label>Email</label><input type="email" required placeholder="you@email.com"></div>
          <div class="fld"><label>Alert when 22K crosses (₹/g)</label><input type="number" min="5000" required placeholder="${R.gold22 + 200}"></div>
          <button class="btn btn-primary btn-sm" style="grid-column:1/-1;justify-self:start">Set alert</button>
        </form></div>
      <div class="adm-card"><h3>How your price is built</h3>
        <div class="sum-row"><span>Live rate × net weight</span><b>metal value</b></div>
        <div class="sum-row"><span>+ Making charges for your piece</span><b>shown at product page</b></div>
        <div class="sum-row"><span>+ Listed stone value (if any)</span><b>at cost</b></div>
        <div class="sum-row"><span>+ 3% GST</span><b>statutory</b></div>
        <p style="font-size:13px;color:var(--ink-3);margin-top:12px">No "local rate" games — the rate on this page is the rate on your bill. That is our tanch (honest purity) promise.</p>
        ${R.source !== 'live' ? '<p style="font-size:12px;color:var(--ink-3);margin-top:8px">*Feed shown as simulated when the bullion API is unreachable from the server; values track the last live market feed.</p>' : ''}
      </div>
    </div>
  </div>`;
  drawRateChart($('#rateChart'), R.history || []);
};
function drawRateChart(cv, hist) {
  if (!cv || !hist.length) return;
  const x = cv.getContext('2d'), dpr = Math.min(devicePixelRatio || 1, 2);
  const w = cv.parentElement.clientWidth - 0, h = 300;
  cv.width = w * dpr; cv.height = h * dpr; cv.style.height = h + 'px';
  x.setTransform(dpr, 0, 0, dpr, 0, 0);
  const pad = { l: 56, r: 56, t: 16, b: 26 };
  const data = hist.map(p => p.gold22);
  const min = Math.min(...data) * 0.999, max = Math.max(...data) * 1.001;
  const X = i => pad.l + i / (data.length - 1) * (w - pad.l - pad.r);
  const Y = v => pad.t + (1 - (v - min) / (max - min)) * (h - pad.t - pad.b);
  x.strokeStyle = '#eee3cd'; x.fillStyle = '#8a7d6c'; x.font = '11px Jost'; x.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const v = min + (max - min) * i / 4, y = Y(v);
    x.beginPath(); x.moveTo(pad.l, y); x.lineTo(w - pad.r, y); x.stroke();
    x.fillText(Math.round(v / 10) * 10, 8, y + 4); x.textAlign = 'left';
  }
  const grad = x.createLinearGradient(0, pad.t, 0, h - pad.b);
  grad.addColorStop(0, 'rgba(185,138,47,.28)'); grad.addColorStop(1, 'rgba(185,138,47,0)');
  x.beginPath(); data.forEach((v, i) => i ? x.lineTo(X(i), Y(v)) : x.moveTo(X(i), Y(v)));
  x.lineTo(X(data.length - 1), h - pad.b); x.lineTo(X(0), h - pad.b); x.closePath(); x.fillStyle = grad; x.fill();
  x.beginPath(); data.forEach((v, i) => i ? x.lineTo(X(i), Y(v)) : x.moveTo(X(i), Y(v)));
  x.strokeStyle = '#b98a2f'; x.lineWidth = 2.2; x.stroke();
  const lx = X(data.length - 1), ly = Y(data[data.length - 1]);
  x.beginPath(); x.arc(lx, ly, 4.5, 0, 7); x.fillStyle = '#6e1e2a'; x.fill();
  x.beginPath(); x.arc(lx, ly, 8, 0, 7); x.strokeStyle = 'rgba(185,138,47,.5)'; x.lineWidth = 2; x.stroke();
  x.fillStyle = '#6e1e2a'; x.font = '600 12px Jost'; x.textAlign = 'right';
  x.fillText(fmt(data[data.length - 1]) + '/g', w - pad.r + 52, ly + 4);
}
window.Shivaa.rateAlert = async e => {
  e.preventDefault();
  try { await api('/api/rates/alert', { method: 'POST', body: JSON.stringify({ email: e.target[0].value, metal: 'gold22', target: +e.target[1].value }) }); toast('Alert set — we will write to you ✦'); e.target.reset(); }
  catch (err) { toast(err.message, 'err'); }
};

/* ─────────── MAKING CHARGES PAGE ─────────── */
/* ─────────── CATALOGUES PAGE ─────────── */
pages.catalogues = async (view) => {
  if (!isPartner()) {
    view.innerHTML = `
    <section class="page-hero"><div class="dust" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="container"><div class="crumbs"><a href="#/">Home</a> / B2B Catalogues</div><h1>Jeweller Catalogues</h1>
    <p>This desk is exclusively for verified jeweller partners — GST-verified access only.</p></div></section>
    <div class="container" style="padding:44px 0 90px;max-width:760px">
      <div class="b2b-gate aurora">
        <div class="bg-orn">✦</div>
        <h2>Verified Jewellers Only</h2>
        <p>Digital catalogues, design-selection billing (fine-metal settlement), the bullion desk and custom orders are reserved for partners verified through GST KYC.</p>
        <div class="bg-steps"><span>1 · Apply with GSTIN</span><span>2 · OTP verify</span><span>3 · Shivaa approves</span></div>
        <div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center;margin-top:22px">
          ${state.user ? '' : '<button class="btn btn-outline" onclick="Shivaa.openLogin()">Login</button>'}
          <a class="btn btn-primary" href="#/b2b">Start GST Verification →</a>
        </div>
      </div>
    </div>`;
    return;
  }
  const rings = state.productsCache;  // every design selectable for fine-metal billing
  window._sel = window._sel || {};
  const stoneTypes = ['Plain', 'CZ', 'Lab-Grown Diamond', 'Natural Diamond', 'Colour Stone', 'Kundan/Polki'];
  view.innerHTML = `
  <section class="page-hero"><div class="dust" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="container"><div class="crumbs"><a href="#/">Home</a> / Design Selection</div><h1>Design Selection</h1>
  <p>The live design desk our B2B partners order from — filter by category, weight, purity and stone, select what your counter needs, and settle in <b>fine metal grams</b> with zero making charges.</p></div></section>
  <div class="container" style="padding:44px 0 90px">

  <div class="ds-wrap" id="dsWrap">
    <div class="pf-bar">
      <div class="pf-f"><label>Category</label>
        <select id="dsfCat" class="sortsel"><option value="">All categories</option>${Object.entries(CATS).map(([k, c]) => `<option value="${k}">${c.name}</option>`).join('')}</select></div>
      <div class="pf-f"><label>Stone type</label>
        <select id="dsfStone" class="sortsel"><option value="">All stones</option>${stoneTypes.map(s => `<option>${s}</option>`).join('')}</select></div>
      <div class="pf-f"><label>Stone colour</label>
        <select id="dsfColour" class="sortsel"><option value="">Any</option><option>White</option><option>Colour</option></select></div>
      <div class="pf-f"><label>Purity</label>
        <select id="dsfPurity" class="sortsel"><option value="">Any</option><option>22K</option><option>18K</option><option>925</option></select></div>
      <div class="pf-f"><label>Weight range (g)</label>
        <div class="pf-w"><input id="dsfWMin" type="number" step="0.1" min="0" placeholder="min" inputmode="decimal"><span>&ndash;</span><input id="dsfWMax" type="number" step="0.1" min="0" placeholder="max" inputmode="decimal"></div></div>
      <div class="pf-f" style="flex:1 1 100%">
        <label>Quick weight</label>
        <div class="pf-chips" id="dsfQuick">
          <button type="button" class="pf-chip" data-min="0" data-max="5">Under 5 g</button>
          <button type="button" class="pf-chip" data-min="5" data-max="10">5 &ndash; 10 g</button>
          <button type="button" class="pf-chip" data-min="10" data-max="20">10 &ndash; 20 g</button>
          <button type="button" class="pf-chip" data-min="20" data-max="50">20 &ndash; 50 g</button>
          <button type="button" class="pf-chip" data-min="50" data-max="">50 g +</button>
          <button type="button" class="pf-reset" id="dsfReset">Reset all</button>
          <span class="pf-count" id="dsShown2"></span>
        </div>
      </div>
    </div>
    <div class="ds-head">
      <div><span class="label">Jeweller Desk</span><h2 style="font-size:30px;margin:6px 0 4px">Design Selection &amp; Billing</h2>
      <p style="font-size:13px;color:var(--ink-3)">Select designs → proceed → your bill is in <b>fine gold grams</b> (weight × ${(state.settings.metalFactor || 0.92)}) · <b>ZERO making charges</b> · ${(state.settings.finePurity || '99.50%')} fine metal settlement${state.user ? '' : ' · <a href="javascript:Shivaa.openLogin()" style="color:var(--gold);text-decoration:underline">login to place the order</a>'}</p></div>
      <div class="ds-total">
        <small id="dsCount">0 designs · 0.00 g</small><small id="dsShown" style="color:#ffe9bd"></small>
        <b id="dsFine">0.00 g fine</b>
        <button class="btn btn-primary" id="dsProceed" onclick="ShivaaDS.proceed()">Proceed → Bill</button>
      </div>
    </div>
    <div class="ds-grid" id="dsGrid">
      ${rings.map(p => `<div class="ds-card" id="ds-${p.id}" data-cat="${p.category}" data-w="${p.weightG}" data-stone="${(p.stoneType || 'Plain')}" data-colour="${(p.stoneColour || (/(colour|ruby|emerald|sapphire|navratna|kundan|polki)/i.test((p.stoneType || '') + (p.stoneDesc || '')) ? 'Colour' : 'White'))}" data-purity="${p.purity}">
        <div class="ds-img"><img src="${p.images[0]}" loading="lazy" alt="${esc(p.name)}"><span class="ds-wt">${p.weightG} g</span></div>
        <b>${esc(p.name.replace('Shivaa Ring Design', 'Design'))}</b>
        <small>${p.sku} · ${p.weightG} g · ${p.purity}</small>
        <div class="ds-qty">
          <button onclick="ShivaaDS.qty('${p.id}',-1)">−</button><span>${window._sel[p.id] || 0}</span><button onclick="ShivaaDS.qty('${p.id}',1)">+</button>
        </div>
      </div>`).join('')}
    </div>
    <div class="qty-banner" style="margin-top:18px">◈ Example: select 25 g of designs → bill = 25 × ${(state.settings.metalFactor || 0.92)} = <b>23 g fine metal @ ${(state.settings.finePurity || '99.50%')}</b> — zero making charges, pure metal settlement.</div>
  </div>
  </div>`;
};
let catCache = [];
document.addEventListener('catalogs:change', () => { if (location.hash.startsWith('#/catalogues')) pages.catalogues($('#view')); });
window.Shivaa.viewPdf = (id, title) => {
  const c = catCache.find(x => x.id === id);
  if (!c) return;
  $('#pdfTitle').textContent = title;
  $('#pdfFrame').src = c.file + '#view=FitH';
  $('#pdfDownload').href = c.file;
  $('#pdfViewer').classList.add('open'); lockScroll();
};
$('#pdfClose').onclick = () => { $('#pdfViewer').classList.remove('open'); $('#pdfFrame').src = 'about:blank'; unlockScroll(); };

/* ─────────── B2B PAGE ─────────── */
pages.b2b = async (view) => {
  view.innerHTML = `
  <section class="page-hero"><div class="dust" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="container"><div class="crumbs"><a href="#/">Home</a> / For Jewellers</div><h1>Shivaa for Jewellers</h1>
  <p>Start with your details below &mdash; approval typically within 48 hours. Everything the partnership opens up is explained underneath the form.</p></div></section>
  <div class="container" style="padding:40px 0 80px;max-width:1140px">

    <div class="b2b-form-card aurora">
      <div class="bf-head"><span class="label">Step 1 &middot; Partner Application</span><h2>Begin your partnership</h2><p>GSTIN is checksum-verified instantly &middot; mobile is OTP-verified &middot; Shivaa approves within 48 hours.</p>
        <div class="b2b-step"><span>1 &middot; Fill this form</span><span>2 &middot; GST &amp; OTP verify</span><span>3 &middot; Approved in 48 h</span><span>4 &middot; Portal opens</span></div></div>
      <form class="form-grid kyc-form" onsubmit="Shivaa.b2bApply(event)">
        <div class="fld"><label>Firm name *</label><input id="kyFirm" required placeholder="M/s …"></div>
        <div class="fld"><label>Contact person</label><input id="kyPerson" placeholder="Owner / manager"></div>
        <div class="fld full"><label>GSTIN *</label>
          <div class="kyc-inline">
            <input id="kyGstin" maxlength="15" placeholder="08AABCU9603R1ZM" style="text-transform:uppercase" required>
            <button type="button" class="btn btn-ghost btn-sm" onclick="Shivaa.kycGstin()">Verify GST</button>
            <span class="kyc-status" id="gstStat"></span>
          </div></div>
        <div class="fld"><label>City</label><input id="kyCity" placeholder="Nagaur, Jodhpur…"></div>
        <div class="fld"><label>Mobile (OTP verified) *</label>
          <div class="kyc-inline">
            <input id="kyPhone" maxlength="10" placeholder="10-digit" inputmode="numeric" required>
            <button type="button" class="btn btn-ghost btn-sm" onclick="Shivaa.kycOtp()">Send OTP</button>
          </div></div>
        <div class="fld full"><label>Enter OTP *</label>
          <div class="kyc-inline">
            <input id="kyOtp" maxlength="6" placeholder="6-digit code" inputmode="numeric" autocomplete="one-time-code">
            <button type="button" class="btn btn-ghost btn-sm" onclick="Shivaa.kycOtpVerify()">Verify OTP</button>
            <span class="kyc-status" id="otpStat"></span>
          </div></div>
        <div class="fld"><label>Email (portal login) *</label><input id="kyEmail" type="email" required></div>
        <div class="fld"><label>Owner PAN</label><input id="kyPan" maxlength="10" placeholder="ABCDE1234F" style="text-transform:uppercase"></div>
        <div class="fld full"><label>Choose portal password *</label><input id="kyPass" type="password" minlength="6" required></div>
        <div class="fld full"><label>What do you stock / need?</label><input id="kyMsg" placeholder="Bridal sets, chains, silver…"></div>
        <button class="btn btn-primary btn-block" id="kycSubmit" style="grid-column:1/-1" disabled>Complete KYC &amp; Apply →</button>
        <p class="kyc-note">GSTIN checksum-verified · mobile OTP-verified · admin approval within 48 h</p>
      </form>

      <div class="alt-actions">
        <span class="alt-div"><i></i><b>or</b><i></i></span>
        <div class="alt-grid">
          <button type="button" class="alt-btn alt-wa" onclick="Shivaa.waPartnerId()">
            <span class="alt-ic" aria-hidden="true">
              <svg viewBox="0 0 32 32" fill="currentColor"><path d="M16 3C8.8 3 3 8.8 3 16c0 2.3.6 4.5 1.7 6.4L3 29l6.8-1.8c1.9 1 4 1.6 6.2 1.6 7.2 0 13-5.8 13-13S23.2 3 16 3zm0 23.6c-2 0-3.9-.5-5.5-1.5l-.4-.2-4 1.1 1.1-3.9-.3-.4a10.5 10.5 0 1 1 9.1 4.9zm5.8-7.9c-.3-.2-1.9-.9-2.2-1s-.5-.2-.7.2-.8 1-1 1.2-.4.2-.7 0a8.6 8.6 0 0 1-2.5-1.6 9.5 9.5 0 0 1-1.8-2.2c-.2-.3 0-.5.1-.7l.5-.6c.2-.2.2-.4.3-.6a.6.6 0 0 0 0-.6l-1-2.3c-.2-.6-.5-.5-.7-.5h-.6a1.2 1.2 0 0 0-.9.4 3.6 3.6 0 0 0-1.1 2.7 6.3 6.3 0 0 0 1.3 3.3 14.3 14.3 0 0 0 5.5 4.9 18.6 18.6 0 0 0 1.9.7 4.4 4.4 0 0 0 2 .1 3.3 3.3 0 0 0 2.1-1.5 2.7 2.7 0 0 0 .2-1.5c-.1-.2-.3-.3-.6-.4z"/></svg>
            </span>
            <span class="alt-tx"><b>Get my ID on WhatsApp</b><small>Don&rsquo;t want to fill the form? We&rsquo;ll create your portal login and send it to you.</small></span>
            <span class="alt-go" aria-hidden="true">&rarr;</span>
          </button>
          <button type="button" class="alt-btn alt-login" onclick="Shivaa.partnerLogin()">
            <span class="alt-ic" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/></svg>
            </span>
            <span class="alt-tx"><b>Already a partner? Log in</b><small>Go straight to your portal &mdash; design selection, bullion desk &amp; billing.</small></span>
            <span class="alt-go" aria-hidden="true">&rarr;</span>
          </button>
        </div>

      </div>
    </div>

    <div class="why-prime">
      <div class="wp-head rvl"><span class="label">Step 2 &middot; What your partnership unlocks</span><h2>Built for your counter</h2>
        <p style="font-size:13.5px;color:var(--ink-2);max-width:660px;margin-top:8px">Eight reasons 300+ jewellers across Rajasthan settle their counter through Shivaa.</p></div>
      <div class="wp-grid">
        ${[
          ['✦', 'Honest Purity (Tanch)', 'Assay-verified purity on every lot — in writing. A mismatch is refunded, plus 110% of the difference.'],
          ['❒', 'Product Labelling & Premium Packaging', 'Every piece arrives purity-tagged, weight-stamped and packed showcase-ready.'],
          ['◈', 'Daily Digital Catalogues', 'Fresh designs pushed to your portal every morning — the same feed as shivaa.in.'],
          ['₹', 'Friday Settlements', 'Sales reports with every payment · stock analytics on your dashboard · no chasing.'],
          ['🥇', 'Live Bullion Desk', 'TDS Gold 995 & silver RTGS from the market feed · cash rates you set yourself, partners notified instantly.'],
          ['⚖', 'Fine-Metal Billing', 'Design selection → weight × 0.92 = fine 995 gold. Zero making charges, pure settlement.'],
          ['☸', 'Premium Wedding-Gold Specialist', 'Deep bridal inventory — the category that walks your counter first every season.'],
          ['☎', 'A Manager Who Answers', 'Dedicated store manager · mobile sales team for follow-ups · the family on call.'],
        ].map((x, i) => `<div class="wp-card"><span class="wp-num">${String(i + 1).padStart(2, '0')}</span><span class="wp-ic">${x[0]}</span><b>${x[1]}</b><p>${x[2]}</p><span class="wp-shine"></span></div>`).join('')}
      </div>
      <div class="b2b-stats">
        <div class="b2b-stat rv"><b>300+</b><span>partner jewellers</span></div>
        <div class="b2b-stat rv"><b>70–80 kg</b><span>stock capacity</span></div>
        <div class="b2b-stat rv"><b>Every Fri</b><span>settlement day</span></div>
      </div>
      <div style="margin-top:26px">
        <span class="label">Where our partners are</span>
        <div class="city-chips">${['Jayal', 'Nagaur', 'Jodhpur', 'Jaipur', 'Ajmer', 'Sujangarh', 'Didwana', 'Merta', 'Ladnun'].map(c => `<span>${c}</span>`).join('')}</div>
      </div>
    </div>

  </div>`;
};
/* ─────────── SERVICES (D2C) ─────────── */
window._kyc = { gstin: false, otp: false };
window.Shivaa.kycGstin = async () => {
  const g = $('#kyGstin').value.trim();
  const st = $('#gstStat');
  if (!st) return;
  st.textContent = 'checking…'; st.className = 'kyc-status wait';
  try {
    const r = await api('/api/kyc/check-gstin', { method: 'POST', body: JSON.stringify({ gstin: g }) });
    if (r.valid) {
      window._kyc.gstin = true;
      if (!$('#kyCity').value) $('#kyCity').value = r.state === 'Rajasthan' ? '' : r.state;
      st.textContent = 'checking firm name…'; 
      try {
        const lg = await api('/api/kyc/gst-lookup', { method: 'POST', body: JSON.stringify({ gstin: g }) });
        if (lg.configured && lg.verified && lg.legalName) { window._kyc.legalName = lg.legalName; $('#kyFirm').value = lg.legalName; $('#kyFirm').readOnly = true; st.innerHTML = '✓ Firm verified: ' + esc(lg.legalName); }
        else st.innerHTML = '✓ Valid · ' + esc(r.state) + ' <small>(name verified at approval)</small>';
      } catch (e) { st.innerHTML = '✓ Valid · ' + esc(r.state); }
      st.className = 'kyc-status ok';
    } else { window._kyc.gstin = false; st.textContent = '✗ ' + r.reason; st.className = 'kyc-status bad'; $('#kyFirm').readOnly = false; }
  } catch (e) { st.textContent = '✗ ' + e.message; st.className = 'kyc-status bad'; }
  window.Shivaa.kycGate();
};
window.Shivaa.kycOtp = async () => {
  const ph = $('#kyPhone').value.replace(/\D/g, '');
  if (ph.length !== 10) return toast('Enter a valid 10-digit mobile', 'err');
  try {
    const r = await api('/api/kyc/send-otp', { method: 'POST', body: JSON.stringify({ phone: ph }) });
    const st = $('#otpStat');
    if (r.devCode) {
      st.innerHTML = 'demo OTP: <b>' + r.devCode + '</b> — tap to fill (live SMS once the gateway is configured)';
      st.className = 'kyc-status wait'; st.style.cursor = 'pointer';
      st.onclick = () => { const i = $('#kyOtp'); if (i && window.ShivaaOtp) ShivaaOtp.fill(i, String(r.devCode)); };
    }
    else { st.textContent = 'OTP sent to your mobile'; st.className = 'kyc-status wait'; }
    if (window.ShivaaOtp) ShivaaOtp.watch($('#kyOtp'), () => { if (window.Shivaa.kycOtpVerify) window.Shivaa.kycOtpVerify(); });   // v33 — Android auto-fill
    toast('OTP sent ✓');
  } catch (e) { toast(e.message, 'err'); }
};
window.Shivaa.kycOtpVerify = async () => {
  try {
    await api('/api/kyc/verify-otp', { method: 'POST', body: JSON.stringify({ phone: $('#kyPhone').value.replace(/\D/g, ''), code: $('#kyOtp').value.trim() }) });
    window._kyc.otp = true;
    const st = $('#otpStat'); st.textContent = '✓ Mobile verified'; st.className = 'kyc-status ok';
    window.Shivaa.kycGate();
  } catch (e) { toast(e.message, 'err'); }
};
window.Shivaa.gotoJeweller = () => { closeModal(); location.hash = '#/b2b'; };
window.Shivaa.waPartnerId = () => {
  waOpen("Namaste Shivaa team \u2726\n\nI'd like a partner portal ID and password without filling the online form.\n\nFirm name: \nCity: \nGSTIN: \n\nPlease help me get started.");
};
window.Shivaa.partnerLogin = () => {
  if (isPartner()) { location.hash = '#/partner'; return; }
  openLogin('partner');
};
window.Shivaa.kycGate = () => { const b = $('#kycSubmit'); if (b) b.disabled = !(window._kyc.gstin && window._kyc.otp); };
window.Shivaa.b2bApply = async e => {
  e.preventDefault();
  if (!window._kyc.gstin || !window._kyc.otp) return toast('Complete GST & OTP verification first', 'err');
  try {
    const r = await api('/api/partners/apply', { method: 'POST', body: JSON.stringify({
      firm: $('#kyFirm').value, contactPerson: $('#kyPerson').value, city: $('#kyCity').value,
      gstin: $('#kyGstin').value.trim().toUpperCase(), phone: $('#kyPhone').value.replace(/\D/g, ''),
      email: $('#kyEmail').value, ownerPan: $('#kyPan').value, password: $('#kyPass').value, message: $('#kyMsg').value,
    }) });
    if (r.token) { setToken(r.token); state.user = r.user; }
    openModal(`<div class="center"><div style="font-size:48px">✦</div><h3 style="margin:10px 0">KYC Complete — Application Received!</h3><p style="color:var(--ink-2)">GSTIN <b>${esc($('#kyGstin').value.toUpperCase())}</b> verified · mobile OTP verified. Your partner portal account is live — full access once our team approves (usually within 48 hours).</p><a class="btn btn-primary" href="#/partner" style="margin-top:14px">Open Partner Portal</a></div>`);
    e.target.reset(); window._kyc = { gstin: false, otp: false };
  } catch (err) { toast(err.message, 'err'); }
};

pages.services = async (view) => {
  view.innerHTML = `
  <section class="page-hero"><div class="dust" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="container"><div class="crumbs"><a href="#/">Home</a> / Bespoke & Care</div><h1>Bespoke & Care Studio</h1>
  <p>Custom designs, repair & restoration, and personal shopping assistance — the D2C services our family has always offered, now bookable online.</p></div></section>
  <div class="container" style="padding:50px 0 90px">
    <div class="svc-grid" style="margin-bottom:44px">
      <div class="svc rv"><div class="sic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 4l1.8 4.2L18 10l-4.2 1.8L12 16l-1.8-4.2L6 10l4.2-1.8L12 4z"/><path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15z"/></svg></div>
        <h4>Custom Designs</h4><p>Bring a photo, a sketch, or grandma's idea — our karigars craft it in 22K/18K with a transparent quote (metal at live rate + chart making charges).</p></div>
      <div class="svc rv"><div class="sic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14.7 6.3a4.5 4.5 0 0 0-6 6L4 17v3h3l4.7-4.7a4.5 4.5 0 0 0 6-6l-3 3-2.5-.5-.5-2.5 3-3z"/></svg></div>
        <h4>Repair & Restoration</h4><p>Heirloom polishing, re-plating, stone setting, re-stringing, resizing — free inspection, lifetime workmanship warranty on repairs.</p></div>
      <div class="svc rv"><div class="sic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 3h8l1 4a5 5 0 0 1-10 0l1-4z"/><path d="M9 12l-1 3h8l-1-3M12 15v6"/></svg></div>
        <h4>Personal Shopping</h4><p>Video or in-store appointment with a Shivaa advisor — bridal trousseau planning, gifting shortlists, budget-first curation.</p></div>
    </div>
    <div class="grid2">
      <div class="adm-card"><h3>Book / Request a quote</h3>
        <form class="form-grid" onsubmit="Shivaa.svcForm(event)">
          <div class="fld"><label>Service *</label><select id="svcType" class="sortsel" style="width:100%;border-radius:12px">
            <option value="custom">Custom Design</option><option value="repair">Repair & Restoration</option><option value="shopping">Personal Shopping Appointment</option></select></div>
          <div class="fld"><label>Preferred date (appointments)</label><input type="date"></div>
          <div class="fld"><label>Your name *</label><input required></div>
          <div class="fld"><label>Phone *</label><input required placeholder="+91"></div>
          <div class="fld full"><label>Email</label><input type="email"></div>
          <div class="fld full"><label>Tell us about the piece / issue / occasion</label><textarea required placeholder="e.g. Resize a 22K kada from 2.4 to 2.6 / design a engagement ring like photo…"></textarea></div>
          <div class="fld full"><label>Approx. budget (optional)</label><input placeholder="₹"></div>
          <button class="btn btn-primary btn-block" style="grid-column:1/-1">Send Request</button>
        </form></div>
      <div class="adm-card"><h3>How it works</h3>
        <div class="benefit"><div class="bic">1</div><div><b>Share your idea or piece</b><p>Photos, sketches or the piece itself — free assessment either way.</p></div></div>
        <div class="benefit"><div class="bic">2</div><div><b>Transparent quote</b><p>Live metal rate + chart making charges + the stated stone value. Nothing else.</p></div></div>
        <div class="benefit"><div class="bic">3</div><div><b>Craft & deliver</b><p>Typical custom work: 10–21 days. Repairs: 2–7 days. Fully insured both ways.</p></div></div>
        <div class="qty-banner">✦ Family heirlooms are photographed and documented before any work begins — restoration reports shared on WhatsApp.</div></div>
    </div>
  </div>`;
};
window.Shivaa.svcForm = async e => {
  e.preventDefault();
  const f = e.target;
  try {
    await api('/api/services', { method: 'POST', body: JSON.stringify({
      type: $('#svcType').value, date: f[1].value, name: f[2].value, phone: f[3].value, email: f[4].value, details: f[5].value, budget: f[6].value,
    }) });
    toast('Request received — we will call you within a working day ✦'); f.reset();
  } catch (err) { toast(err.message, 'err'); }
};

/* ─────────── ABOUT ─────────── */
pages.about = async (view) => {
  view.innerHTML = `
  <section class="page-hero"><div class="dust" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="container"><div class="crumbs"><a href="#/">Home</a> / About</div><h1>The House of Shivaa</h1>
  <p>From Sadar Bazaar, Jayal — 30 years of karigari, one promise: honest purity and honest prices, now on shivaa.in.</p></div></section>
  <div class="container" style="padding:54px 0 90px">
    <div class="story-grid">
      <div class="rv"><span class="label">Our story</span>
        <h2 style="font-size:36px;margin:10px 0 16px">Tradition, engineered <span class="disp-italic">transparently</span></h2>
        <p style="color:var(--ink-2)">Shivaa is the house brand of <b>Ernate Shine Jewellery Private Limited</b> (incorporated January 2025), built on three decades of jewellery craft by the Soni family of Jayal, Nagaur — the heart of Rajasthan's gold country.</p>
        <p style="color:var(--ink-2);margin-top:12px">We serve two families: the <b>300+ jewellers</b> who stock their counters with our honest-purity gold and silver across Rajasthan's cities — and the <b>families who mark life's biggest moments</b> with a piece from shivaa.in. Both get the same thing: published making charges, live-rate pricing, and a bill that matches the website to the rupee.</p>
        <div class="trust-about-callout">
          <h3>Business details, in plain sight</h3>
          <p>See the CIN, UDYAM number and store address on record, with clear empty states for documents that have not been provided. These are not automatic government-verification results.</p>
          <a class="btn btn-outline btn-sm" href="#/trust">Why Trust Shivaa →</a>
        </div>
      </div>
      <div class="rv"><div class="banner" style="min-height:460px"><img src="/images/banners/wedding.jpg" alt=""><div class="b-fade"></div>
        <div class="b-body"><span class="label">Vision 2030</span><h3>Rajasthan's most trusted jewellery platform</h3>
        <p style="margin-bottom:14px">◦ B2B network across every tier-2/3 town<br>◦ Self-owned stores in big cities<br>◦ Indian jewellery exported worldwide</p></div></div></div>
    </div>
    <div class="sec-head mt-3"><span class="label">The family</span><h2>Led by experience & youth</h2></div>
    <div class="team-grid">
      <div class="team-card rv"><div class="tav">SS</div><b>Sanjay Soni</b><small>Founder · Craft</small><p>30+ years in the jewellery industry — the tanch (honest purity) our B2B partners bank on, and the karigar relationships behind every finish.</p></div>
      <div class="team-card rv"><div class="tav">KS</div><b>Karan Soni</b><small>Executive Director</small><p>Strategy, digital & operations — the shivaa.in platform, live-rate transparency and the partner portal you see today.</p></div>
      <div class="team-card rv"><div class="tav">✦</div><b>The Growing Team</b><small>Karigars · Advisors · Support</small><p>Dedicated store managers, a mobile sales team, and a feedback desk for every customer and partner — scaling as we grow.</p></div>
    </div>
  </div>`;
};

/* ─────────── CONTACT ─────────── */
pages.contact = async (view) => {
  view.innerHTML = `
  <section class="page-hero"><div class="dust" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="container"><div class="crumbs"><a href="#/">Home</a> / Contact</div><h1>Talk to the Family</h1></div></section>
  <div class="container" style="padding:50px 0 90px">
    <div class="contact-grid">
      <div>
        <div class="info-tile"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>
          <div><b>Visit the store</b><p>${esc(state.settings.address)}</p></div></div>
        <div class="info-tile"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 4h4l2 5-2.5 1.5a12 12 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/></svg>
          <div><b>Call / WhatsApp</b><a href="tel:${esc(state.settings.phone)}">${esc(state.settings.phone)}</a><br><a class="wa-inline" href="javascript:void(0)" onclick="Shivaa.waOpen('Namaste Shivaa ✦ I have a question.')">${'' + WA_SVG + ''} Chat with us on WhatsApp</a></div></div>
        <div class="info-tile"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="M4 7l8 6 8-6"/></svg>
          <div><b>Write to us</b><a href="mailto:${esc(state.settings.email)}">${esc(state.settings.email)}</a></div></div>
        <div class="info-tile"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.5 2"/></svg>
          <div><b>Store hours</b><p>All days · 10:00 – 20:30 IST<br>Online support: 9:00 – 21:00</p></div></div>
        <div class="adm-card mt-2"><h3>Find us</h3>
          <div style="border-radius:14px;overflow:hidden;border:1px solid var(--line)">
          <svg viewBox="0 0 400 240" style="display:block;width:100%"><rect width="400" height="240" fill="#f4ecdd"/><path d="M0 60 Q100 45 200 62 T400 55 L400 75 Q300 88 200 72 T0 80Z" fill="#e7dcc4"/><path d="M0 190 Q120 175 240 192 T400 185 L400 240 L0 240Z" fill="#e7dcc4"/><path d="M30 30 L110 30 M30 46 L90 46 M310 215 L390 215 M320 200 L370 200" stroke="#d8c9a8" stroke-width="3" stroke-linecap="round"/><path d="M60 210 C 90 160, 200 150, 250 110 S 340 70, 360 40" stroke="#c9b586" stroke-width="5" fill="none" stroke-dasharray="2 9" stroke-linecap="round"/><circle cx="250" cy="110" r="26" fill="rgba(185,138,47,.16)"/><path d="M250 84 c-11 0 -19 8 -19 18 c0 13 19 30 19 30 s19 -17 19 -30 c0 -10 -8 -18 -19 -18z" fill="#6e1e2a"/><circle cx="250" cy="102" r="6.5" fill="#faf6ef"/><text x="250" y="150" text-anchor="middle" font-family="Georgia" font-size="15" fill="#6e1e2a">Shivaa · Sadar Bazaar, Jayal</text><text x="250" y="168" text-anchor="middle" font-family="Arial" font-size="11" fill="#8a7d6c">Nagaur, Rajasthan 341023</text></svg>
          </div></div>
      </div>
      <div class="adm-card"><h3>Send a message</h3>
        <form class="form-grid" onsubmit="Shivaa.contactForm(event)">
          <div class="fld"><label>Name *</label><input name="name" autocomplete="name" required></div>
          <div class="fld"><label>Phone</label><input name="phone" type="tel" inputmode="tel" autocomplete="tel"></div>
          <div class="fld full"><label>Email</label><input name="email" type="email" autocomplete="email"></div>
          <div class="fld full"><label>Message *</label><textarea name="message" required placeholder="Question about a piece, an order, B2B…"></textarea></div>
          <button class="btn btn-primary" style="grid-column:1/-1;justify-self:start">Send Message</button>
        </form>
        <div class="qty-banner">For order help, keep your order ID handy (starts with SHV). We reply within one working day.</div>
      </div>
    </div>
  </div>`;
};
window.Shivaa.contactForm = async e => {
  e.preventDefault();
  const fd = new FormData(e.target); const g = k => String(fd.get(k) || '');
  try { await api('/api/contact', { method: 'POST', body: JSON.stringify({ name: g('name'), phone: g('phone'), email: g('email'), message: g('message') }) }); toast('Message sent ✦ we will reach out soon'); e.target.reset(); }
  catch (err) { toast(err.message, 'err'); }
};

/* ─────────── LOGIN ─────────── */
/* ─────────── AUTH SESSION: post-login routing ───────────
 * Intent model:
 *   openLogin('checkout')  → after login go straight to checkout
 *   openLogin('account')   → after login go to the account page
 *   openLogin()            → no intent. If the shopper was reading a product
 *                            when the gate appeared, send them to checkout
 *                            (they were mid-purchase); otherwise go home.
 * Never bounce a shopper back to the login route itself.
 */
function loginIntent() {
  const explicit = window._loginNext || '';
  if (explicit) return explicit;
  const h = (window._loginFromHash || location.hash || '').replace(/^#/, '');
  if (h.startsWith('/product/')) return 'checkout';   // mid-purchase
  return 'home';
}

function afterLogin(r, opts = {}) {
  if (!r || !r.token) { toast('Login failed — please try again', 'err'); return; }
  const next = loginIntent();
  setToken(r.token);
  state.user = r.user || null;
  window._loginNext = '';
  window._loginFromHash = '';
  closeModal();
  updateBadges();
  try { updatePartnerUI(); } catch (e) {}   // v35 — portal pill appears the moment a partner signs in

  const dest =
    next === 'checkout' ? (state.cart && state.cart.length ? '#/checkout' : '#/cart')
    : next === 'account'  ? '#/account'
    : next === 'home'     ? '#/'
    // "Already a partner?" — approved partners go to the portal, everyone else
    // lands back on the application page rather than a 403 dead end —
    // and is told exactly why (v30: no more silent dead ends).
    : next === 'partner'  ? (isPartner() ? '#/partner' : '#/b2b')
    : next.startsWith('#') ? next
    : '#/' + String(next).replace(/^\/+/, '');

  // staff go to their own consoles rather than the storefront checkout
  const role = (state.user && state.user.role) || 'customer';
  const staffDest = role === 'admin' ? '#/admin' : role === 'partner' ? '#/partner' : null;
  const finalDest = (staffDest && (next === 'home')) ? staffDest : dest;

  // v30 — if someone used the jeweller door without a partner account, say so plainly
  if (next === 'partner' && !isPartner()) {
    setTimeout(() => toast('Your partner application is with our team \u2014 for now you are signed in as a retail customer.', 'err'), 900);
  }
  // re-hydrate caches for the new session, then land the shopper
  boot(true).catch(() => {}).finally(() => {
    if (location.hash === finalDest) route(); else location.hash = finalDest;
  });
  if (!opts.silent) toast('Welcome back \u2726');
}

async function doLogin(creds, btn) {
  const old = btn ? btn.textContent : '';
  if (btn) { btn.disabled = true; btn.textContent = 'Signing in\u2026'; }
  const showAuthErr = msg => {
    let box = $(creds._errBox || '#authErr');
    if (!box) box = $('#authErr');
    if (box) {
      // jeweller door: a 401 usually means "not a partner yet", say so kindly
      if (creds._errBox === '#authErrJ' && /invalid|incorrect|not found/i.test(msg))
        msg += ' If you have applied, our team may still be approving your account (within 48 h) — or apply below.';
      box.textContent = msg; box.hidden = false; box.classList.remove('shake'); void box.offsetWidth; box.classList.add('shake');
    }
  };
  try {
    const r = await api('/api/auth/login', { method: 'POST', body: JSON.stringify(creds) });
    afterLogin(r, { silent: true });
    toast('Welcome back \u2726');
  } catch (err) {
    const msg = err.message || 'Invalid email or password';
    showAuthErr(msg + '. ');
    toast(msg, 'err');
    if (btn) { btn.disabled = false; btn.textContent = old || 'Login'; }
  }
}

/* ─────────── v28 AUTH — audience-aware, modern sign-in ───────────
   Two clearly separated experiences:
   · Retail customers — password or phone-OTP sign-in, self-serve account
     creation with OTP-verified mobile and a live strength meter.
   · Jewellers — business sign-in that routes straight to the partner
     portal, with the GST partnership application one tap away.
   Endpoints unchanged (/api/auth/*, /api/kyc/*); this is a UX layer. */
const authPhone = v => String(v || '').replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '').slice(-10);
const authPhoneOk = v => /^[6-9]\d{9}$/.test(v);

const EYE_ON = '<svg class="eye-on" viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.7"/></svg>';
const EYE_OFF = '<svg class="eye-off" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4l16 16"/><path d="M9.9 5.6A9.9 9.9 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17.6 17.6 0 0 1-3 3.6M6.1 6.9A16.4 16.4 0 0 0 2.5 12S6 18.5 12 18.5a9.3 9.3 0 0 0 3.2-.55"/><path d="M9.8 9.8a2.7 2.7 0 0 0 3.8 3.8"/></svg>';

function pwFieldHTML({ id, label = 'Password', ph = '', auto = 'new-password', meter = false }) {
  return `<div class="fld"><label>${label}</label>
    <div class="pw-wrap"><input id="${id}" name="${id}" type="password" placeholder="${ph}" autocomplete="${auto}" required minlength="8">
    <button type="button" class="pw-eye" data-eye="${id}" aria-label="Show or hide password">${EYE_ON}${EYE_OFF}</button></div>
    ${meter ? `<div class="pw-meter" id="${id}Meter" data-s="0"><i></i><span>Use 8+ characters with a mix of letters, numbers &amp; symbols</span></div>` : ''}</div>`;
}
function otpBoxesHTML(id) {
  let inp = '';
  for (let i = 0; i < 6; i++) inp += `<input type="text" maxlength="1" inputmode="numeric" autocomplete="${i === 0 ? 'one-time-code' : 'off'}" aria-label="Digit ${i + 1}">`;
  return `<div class="otp-boxes" id="${id}" role="group" aria-label="6-digit code">${inp}</div>`;
}
function bindOtpBoxes(root, onComplete) {
  if (!root) return;
  const boxes = [...root.querySelectorAll('input')];
  const fire = () => {
    const v = boxes.map(b => b.value).join('');
    if (v.length === 6 && onComplete) onComplete(v);
  };
  boxes.forEach((inp, i) => {
    inp.addEventListener('input', () => {
      inp.value = inp.value.replace(/\D/g, '').slice(-1);
      if (inp.value && i < 5) boxes[i + 1].focus();
      fire();
    });
    inp.addEventListener('keydown', e => {
      if (e.key === 'Backspace' && !inp.value && i > 0) { boxes[i - 1].focus(); boxes[i - 1].value = ''; }
      if (e.key === 'ArrowLeft' && i > 0) boxes[i - 1].focus();
      if (e.key === 'ArrowRight' && i < 5) boxes[i + 1].focus();
    });
    inp.addEventListener('paste', e => {
      e.preventDefault();
      const digits = ((e.clipboardData || window.clipboardData).getData('text').match(/\d/g) || []).slice(0, 6);
      digits.forEach((d, j) => { if (boxes[j]) boxes[j].value = d; });
      boxes[Math.min(digits.length, 5)].focus();
      fire();
    });
  });
}
const otpVal = id => { const r = document.getElementById(id); return r ? [...r.querySelectorAll('input')].map(i => i.value).join('') : ''; };
function bindEyes(scope = document) {
  scope.querySelectorAll('.pw-eye').forEach(eye => {
    eye.onclick = () => {
      const inp = document.getElementById(eye.dataset.eye);
      if (!inp) return;
      const show = inp.type === 'password';
      inp.type = show ? 'text' : 'password';
      eye.classList.toggle('on', show);
    };
  });
}
function pwScore(v) {
  let s = 0;
  if (String(v).length >= 8) s++;
  if (/[a-z]/.test(v) && /[A-Z]/.test(v)) s++;
  if (/\d/.test(v)) s++;
  if (/[^A-Za-z0-9]/.test(v)) s++;
  return s; // 0..4
}
function bindMeter(id) {
  const inp = document.getElementById(id), meter = document.getElementById(id + 'Meter');
  if (!inp || !meter) return;
  const words = ['Too weak', 'Weak — add more characters', 'Fair — add numbers & symbols', 'Strong', 'Excellent'];
  inp.addEventListener('input', () => {
    const s = pwScore(inp.value);
    meter.dataset.s = s;
    meter.querySelector('i').style.width = (s * 25) + '%';
    meter.querySelector('span').textContent = inp.value ? words[s] : words[0];
  });
}
function busyBtn(btn, on, label) {
  if (!btn) return;
  if (on) { btn.dataset.old = btn.textContent; btn.disabled = true; btn.textContent = label || 'Please wait\u2026'; }
  else { btn.disabled = false; if (btn.dataset.old) btn.textContent = btn.dataset.old; }
}
function authStat(sel, msg, cls = 'ok') {
  const el = $(sel);
  if (!el) return;
  el.textContent = msg || '';
  el.className = 'auth-stat ' + cls;
}

function openLogin(next = '') {
  window._loginNext = next;
  window._loginFromHash = location.hash || '';
  // v32 — the new Shivaa Passport auth sheet owns sign-in when present
  if (window.ShivaaAuth && window.ShivaaAuth.open) { window.ShivaaAuth.open(next); return; }
  const R = state.rates || {};
  openModal(`
  <div class="auth-shell">
    <aside class="auth-brand" aria-hidden="true">
      <img src="/images/logo.png" alt="" class="ab-logo">
      <b>The House of<br>Honest Gold</b>
      <p>Live Jaipur rates &middot; piece-level HUID guidance &middot; OTP-verified accounts.</p>
      <ul class="ab-list">
        <li>Rate-locked billing, honest to the rupee</li>
        <li>100% buyback on every Shivaa piece</li>
        <li>GST partner portal &amp; metal schemes</li>
      </ul>
      <div class="ab-rates">${R.gold24 ? `<span>24K <b>${fmt(R.gold24)}</b>/g</span><span>22K <b>${fmt(R.gold22)}</b>/g</span><span>Silver <b>${fmt(R.silver)}</b>/g</span>` : ''}</div>
    </aside>

    <div class="auth-panel">
      <div class="auth-aud" role="tablist" aria-label="Choose your account type">
        <button type="button" class="au-btn on" data-aud="retail" role="tab" aria-selected="true">
          <span class="au-ic" aria-hidden="true">&#128141;</span>
          <span class="au-tx"><b>Retail Customer</b><small>Buy &middot; orders &middot; wishlist</small></span>
        </button>
        <button type="button" class="au-btn" data-aud="jwl" role="tab" aria-selected="false">
          <span class="au-ic" aria-hidden="true">&#10022;</span>
          <span class="au-tx"><b>Jeweller &middot; B2B</b><small>Bullion &middot; designs &middot; schemes</small></span>
        </button>
      </div>

      <!-- ═══ RETAIL CUSTOMER ═══ -->
      <div id="audRetail">
        <div class="auth-tabs" role="tablist" aria-label="Sign in or create account">
          <button type="button" class="at-btn on" data-t="in">Sign in</button>
          <button type="button" class="at-btn" data-t="up">Create account</button>
        </div>

        <form id="rtIn" novalidate>
          <div class="am-pills" id="rtModes">
            <button type="button" class="am2 on" data-m="pw">&#128273; Password</button>
            <button type="button" class="am2" data-m="otp">&#128241; Phone OTP</button>
          </div>

          <div id="rtPw">
            <div class="fld"><label>Email</label><input name="email" type="email" autocomplete="email" placeholder="you@example.com" required></div>
            ${pwFieldHTML({ id: 'rtPwIn', label: 'Password', auto: 'current-password' })}
            <p class="auth-err" id="authErr" hidden></p>
            <button class="btn btn-primary btn-block" id="rtPwBtn" type="submit">Sign in</button>
            <a class="auth-help" href="javascript:Shivaa.authHelp('retail')">\u2691 Trouble signing in? Get help on WhatsApp</a>
          </div>

          <div id="rtOtp" hidden>
            <div class="fld"><label>Mobile number</label>
              <div class="kyc-inline"><input id="rtOtpPhone" maxlength="10" inputmode="numeric" placeholder="10-digit mobile" autocomplete="tel-national" style="flex:1">
              <button type="button" class="btn btn-ghost btn-sm" id="rtOtpSend">Send code</button></div>
              <span class="auth-stat" id="rtOtpStat"></span></div>
            <div class="fld"><label>6-digit code</label>
              ${otpBoxesHTML('rtOtpBoxes')}
            </div>
            <button class="btn btn-primary btn-block" id="rtOtpBtn" type="submit">Verify &amp; sign in</button>
          </div>
          <p class="auth-fine">New to Shivaa? Switch to <b>Create account</b> and get <b>120 royalty points</b> to start.</p>
        </form>

        <form id="rtUp" hidden novalidate>
          <div class="fld"><label>Full name</label><input id="rgName" autocomplete="name" placeholder="Your full name" required></div>
          <div class="fld"><label>Mobile (OTP verified)</label>
            <div class="kyc-inline"><input id="rgPhone" maxlength="10" inputmode="numeric" placeholder="10-digit mobile" autocomplete="tel-national" style="flex:1">
            <button type="button" class="btn btn-ghost btn-sm" id="rgSend">Send code</button></div>
            <span class="auth-stat" id="rgStat"></span></div>
          <div class="fld"><label>Enter the 6-digit code</label>
            ${otpBoxesHTML('rgBoxes')}
          </div>
          <div class="fld"><label>Email</label><input id="rgEmail" type="email" autocomplete="email" placeholder="you@example.com" required></div>
          ${pwFieldHTML({ id: 'rgPass', label: 'Create password', meter: true })}
          <button class="btn btn-primary btn-block" id="regBtn" type="submit" disabled>Create account &middot; 120 royalty points</button>
        </form>
      </div>

      <!-- ═══ JEWELLER · B2B ═══ -->
      <div id="audJwl" hidden>
        <div class="jwl-badge">&#9670; GST-VERIFIED PARTNERS</div>
        <form id="jwIn" novalidate>
          <div class="fld"><label>Business email</label><input id="jwEmail" type="email" autocomplete="email" placeholder="owner@yourfirm.com" required></div>
          ${pwFieldHTML({ id: 'jwPass', label: 'Password', auto: 'current-password' })}
          <p class="auth-err" id="authErrJ" hidden></p>
          <button class="btn btn-gold btn-block" id="jwBtn" type="submit">Sign in to the portal</button>
          <a class="auth-help" href="javascript:Shivaa.authHelp('jeweller')">\u2691 Trouble signing in? Get help on WhatsApp</a>
        </form>
        <div class="jwl-apply">
          <b>Not a partner yet?</b>
          <p>Apply with your GSTIN &mdash; the bullion desk, daily design catalogue, metal investment scheme &amp; dead-stock purchase are waiting.</p>
          <button type="button" class="btn btn-outline btn-block" id="jwApply">Apply for partnership &rarr;</button>
          <small>GST &amp; OTP verification &middot; approval within 48 hours</small>
        </div>
      </div>

      <p class="auth-legal">&#128274; Passwords are bcrypt-hashed and never stored in plain text. Sign-in by OTP expires in minutes.</p>
      ${Shivaa.storageBlocked ? '<p class="auth-preview-note">&#9432; Preview mode: this sandbox blocks browser storage, so sign-ins reset when the page reloads. On shivaa.in you stay signed in.</p>' : ''}
    </div>
  </div>`, 'auth-modal');

  /* ---- audience switch ---- */
  const setAud = aud => {
    $$('.auth-aud .au-btn').forEach(b => { const on = b.dataset.aud === aud; b.classList.toggle('on', on); b.setAttribute('aria-selected', String(on)); });
    $('#audRetail').hidden = aud !== 'retail';
    $('#audJwl').hidden = aud !== 'jwl';
  };
  $$('.auth-aud .au-btn').forEach(b => b.onclick = () => setAud(b.dataset.aud));

  /* ---- retail: sign-in / create tabs ---- */
  const setRt = t => {
    $$('#audRetail .at-btn').forEach(b => b.classList.toggle('on', b.dataset.t === t));
    $('#rtIn').hidden = t !== 'in';
    $('#rtUp').hidden = t !== 'up';
  };
  $$('#audRetail .at-btn').forEach(b => b.onclick = () => setRt(b.dataset.t));

  /* ---- retail: password vs OTP method ---- */
  $$('#rtModes .am2').forEach(b => b.onclick = () => {
    $$('#rtModes .am2').forEach(x => x.classList.toggle('on', x === b));
    const otp = b.dataset.m === 'otp';
    $('#rtPw').hidden = otp;
    $('#rtOtp').hidden = !otp;
  });

  window._regOtp = false;
  bindOtpBoxes($('#rtOtpBoxes'));
  bindOtpBoxes($('#rgBoxes'), code => { if (!window._regOtp) Shivaa._rgVerify(code); });
  bindEyes($('#modalBox'));
  bindMeter('rgPass');

  /* ---- retail password sign-in / OTP sign-in (one form, two modes) ---- */
  $('#rtIn').onsubmit = e => {
    e.preventDefault();
    if ($('#rtPw').hidden) {
      const phone = authPhone($('#rtOtpPhone').value);
      const code = otpVal('rtOtpBoxes');
      if (!authPhoneOk(phone)) return toast('Enter a valid 10-digit mobile number', 'err');
      if (code.length !== 6) return toast('Enter the 6-digit code', 'err');
      Shivaa.rtOtpLogin(phone, code, $('#rtOtpBtn'));
    } else {
      $('#authErr').hidden = true; if ($('#authErrJ')) $('#authErrJ').hidden = true;
      doLogin({ email: String(new FormData(e.target).get('email') || '').trim(), password: $('#rtPwIn').value, _errBox: '#authErr' }, $('#rtPwBtn'));
    }
  };

  $('#rtOtpSend').onclick = async () => {
    const phone = authPhone($('#rtOtpPhone').value);
    if (!authPhoneOk(phone)) return toast('Enter a valid 10-digit mobile number', 'err');
    busyBtn($('#rtOtpSend'), true, 'Sending\u2026');
    try {
      const r = await api('/api/auth/send-otp', { method: 'POST', body: JSON.stringify({ phone }) });
      const head = r.devCode ? 'Demo code: ' + r.devCode : 'Code sent to +91 ' + phone;
      authStat('#rtOtpStat', r.hasAccount === false ? head + ' \u00b7 no account yet \u2014 create one below' : head, 'wait');
      const first = $('#rtOtpBoxes input'); first && first.focus();
    } catch (e) { toast(e.message, 'err'); }
    busyBtn($('#rtOtpSend'), false);
  };

  /* ---- retail registration with OTP-verified mobile ---- */
  $('#rgSend').onclick = async () => {
    const phone = authPhone($('#rgPhone').value);
    if (!authPhoneOk(phone)) return toast('Enter a valid 10-digit mobile number', 'err');
    window._regOtp = false;
    $('#regBtn').disabled = true;
    busyBtn($('#rgSend'), true, 'Sending\u2026');
    try {
      const r = await api('/api/kyc/send-otp', { method: 'POST', body: JSON.stringify({ phone }) });
      authStat('#rgStat', r.devCode ? 'Demo code: ' + r.devCode : 'Code sent to +91 ' + phone, 'wait');
      const first = $('#rgBoxes input'); first && first.focus();
    } catch (e) { toast(e.message, 'err'); }
    busyBtn($('#rgSend'), false);
  };
  Shivaa._rgVerify = async code => {
    const phone = authPhone($('#rgPhone').value);
    if (!authPhoneOk(phone)) return;
    try {
      await api('/api/kyc/verify-otp', { method: 'POST', body: JSON.stringify({ phone, code }) });
      window._regOtp = true;
      authStat('#rgStat', '\u2713 Mobile verified', 'ok');
      $('#regBtn').disabled = false;
    } catch (e) {
      window._regOtp = false;
      authStat('#rgStat', e.message || 'That code did not match', 'err');
    }
  };
  $('#rtUp').onsubmit = async e => {
    e.preventDefault();
    if (!window._regOtp) return toast('Verify your mobile with the code first', 'err');
    const btn = $('#regBtn');
    busyBtn(btn, true, 'Creating\u2026');
    try {
      const r = await api('/api/auth/register', { method: 'POST', body: JSON.stringify({ name: $('#rgName').value.trim(), phone: authPhone($('#rgPhone').value), email: $('#rgEmail').value.trim(), password: $('#rgPass').value }) });
      afterLogin(r, { silent: true });
      toast('Account created \u2014 120 royalty points added \u2726');
    } catch (err) { toast(err.message, 'err'); busyBtn(btn, false); }
  };

  /* ---- jeweller sign-in & partnership CTA ---- */
  $('#jwIn').onsubmit = e => {
    e.preventDefault();
    $('#authErr').hidden = true; $('#authErrJ').hidden = true;
    doLogin({ email: $('#jwEmail').value.trim(), password: $('#jwPass').value, _errBox: '#authErrJ' }, $('#jwBtn'));
  };
  $('#jwApply').onclick = () => Shivaa.gotoJeweller();
}
window.Shivaa.authHelp = (aud) => {
  const who = aud === 'jeweller' ? 'a jeweller / B2B partner account' : 'my retail customer account';
  waOpen(`Namaste Shivaa \u2726\n\nI need help signing in with ${who}.\n\nMy email/mobile: \nWhat happened: `);
};
window.Shivaa.rtOtpLogin = async (phone, code, btn) => {
  busyBtn(btn, true, 'Verifying\u2026');
  try {
    const r = await api('/api/auth/otp-login', { method: 'POST', body: JSON.stringify({ phone, code }) });
    afterLogin(r);
  } catch (e) { toast(e.message, 'err'); busyBtn(btn, false); }
};
window.Shivaa.openLogin = openLogin;
window.Shivaa.afterLogin = afterLogin;   // v32 — used by the new auth.js sheet
window.Shivaa.updateBadges = updateBadges;
window.Shivaa.toast = toast;

/* ─────────── invoices (owner-only, watermarked) ─────────── */
pages.invoice = async (view, q, id) => {
  if (!state.user) { openLogin(); return; }
  view.innerHTML = '<div class="loading-spin"></div>';
  let o = null, kind = 'retail';
  if (id.startsWith('MX')) {
    try { const r = await api('/api/metalexchange/orders'); o = r.orders.find(x => x.id === id); kind = 'metal'; } catch (e) {}
  } else {
    try { o = (await api('/api/orders/' + id)).order; } catch (e) {}
  }
  if (!o) { view.innerHTML = '<div class="empty"><h3>Invoice not found</h3></div>'; return; }
  const wm = `${state.user.name} · ${state.user.email}`;
  const rows = kind === 'metal'
    ? o.items.map(it => `<tr><td>${esc(it.name)}</td><td>${it.qty}</td><td>${it.weightG} g</td><td>${it.lineWeight} g</td></tr>`).join('')
    : o.items.map(it => `<tr><td>${esc(it.name)}${it.size ? ' (' + esc(it.size) + ')' : ''}</td><td>${it.qty}</td><td>₹${Math.round(it.ratePerGram).toLocaleString('en-IN')}/g</td><td>₹${(it.unitPrice * it.qty).toLocaleString('en-IN')}</td></tr>`).join('');
  const totals = kind === 'metal'
    ? `<tr class="tot"><td colspan="3">Total weight</td><td>${o.totalWeightG} g</td></tr>
       <tr class="tot"><td colspan="3">Fine metal @ ${esc(o.purity)} (× ${o.factor}, zero MC)</td><td>${o.fineGrams} g</td></tr>`
    : `<tr class="tot"><td colspan="3">Subtotal (incl. GST)</td><td>₹${o.subtotal.toLocaleString('en-IN')}</td></tr>
       ${o.discount ? `<tr class="tot"><td colspan="3">Discount</td><td>− ₹${o.discount.toLocaleString('en-IN')}</td></tr>` : ''}
       <tr class="tot"><td colspan="3">Total paid (${esc(o.paymentMethod)})</td><td>₹${o.total.toLocaleString('en-IN')}</td></tr>`;
  view.innerHTML = `
  <div class="inv-page">
    <div class="inv-no-print inv-top"><button class="btn btn-primary" onclick="window.print()">⬇ Download / Print PDF</button><a class="btn btn-ghost" href="${kind === 'metal' ? '#/partner' : '#/account?tab=orders'}">← Back</a></div>
    <div class="inv-sheet">
      <div class="inv-wm">${esc(wm)}<br>${o.id}</div>
      <div class="inv-head"><img src="/images/logo.png" alt="Shivaa"><div><b>SHIVAA</b><small>Ernate Shine Jewellery Pvt. Ltd.<br>Jayal, Nagaur, Rajasthan · GSTIN on request</small></div>
      <div class="inv-meta"><b>Invoice ${o.id}</b><small>${new Date(o.createdAt).toLocaleString('en-IN')}<br>${kind === 'metal' ? 'B2B · Metal Settlement' : 'Retail Invoice'}<br>Status: ${esc(o.status)}</small></div></div>
      <div class="inv-to"><b>Billed to:</b> ${esc(o.address?.name || o.partnerName || state.user.name)}${o.address ? ` · ${esc(o.address.city || '')} ${esc(o.address.pincode || '')}` : ''}</div>
      <table class="inv-tbl"><thead><tr><th>Item</th><th>Qty</th><th>${kind === 'metal' ? 'Weight' : 'Rate'}</th><th>${kind === 'metal' ? 'Line wt' : 'Amount'}</th></tr></thead>
      <tbody>${rows}${totals}</tbody></table>
      <div class="inv-foot">Rate locked at order time · Check the actual piece’s HUID in BIS Care<br><b>Confidential</b> — issued privately to ${esc(state.user.name)}; watermark identifies the holder.</div>
    </div>
  </div>`;
};

/* ─────────── custom pages (owner-managed) ─────────── */
pages.p = async (view, q, slug) => {
  let pg = null;
  try { pg = await api('/api/pages?slug=' + encodeURIComponent(slug || '')); } catch (e) {}
  if (!pg || pg.error || !pg.title) { view.innerHTML = `<div class="empty" style="padding:100px 20px"><img src="/images/logo.png" class="empty-logo" alt=""><h3>Page not found</h3><a class="btn btn-outline" href="#/">Back home</a></div>`; return; }
  const safe = esc(pg.body || '')
    .split(/\n\s*\n/)                                   // blank line → paragraph
    .map(par => '<p>' + par.replace(/\n/g, '<br>') + '</p>')
    .join('');
  view.innerHTML = `
  <section class="page-hero"><div class="dust" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="container"><div class="crumbs"><a href="#/">Home</a> / ${esc(pg.title)}</div><h1>${esc(pg.title)}</h1>
  <p>Updated ${dateFmt(pg.updatedAt)}</p></div></section>
  <div class="container" style="padding:44px 0 90px;max-width:820px">
    <div class="adm-card custom-page">${safe}</div>
  </div>`;
};

/* ─────────── design selection (jeweller metal exchange) ─────────── */
function initDsfilters(attempt = 0) {
  const grid = document.getElementById('dsGrid');
  if (!grid) { if (attempt < 20) setTimeout(() => initDsfilters(attempt + 1), 300); return; }
  if (grid._dsf) return; grid._dsf = true;
  const g = id => document.getElementById(id);
  const apply = () => {
    const cat = g('dsfCat') ? g('dsfCat').value : '';
    const stone = g('dsfStone') ? g('dsfStone').value : '';
    const colour = g('dsfColour') ? g('dsfColour').value : '';
    const purity = g('dsfPurity') ? g('dsfPurity').value : '';
    const wmin = parseFloat(g('dsfWMin') && g('dsfWMin').value) || 0;
    const wmax = parseFloat(g('dsfWMax') && g('dsfWMax').value) || Infinity;
    let shown = 0;
    grid.querySelectorAll('.ds-card').forEach(c => {
      const w = +c.dataset.w;
      const ok = (!cat || c.dataset.cat === cat)
        && (!stone || c.dataset.stone === stone)
        && (!colour || (c.dataset.colour || '') === colour)
        && (!purity || (c.dataset.purity || '') === purity)
        && w >= wmin && w <= wmax;
      c.style.display = ok ? '' : 'none'; if (ok) shown++;
    });
    const txt = shown + ' design' + (shown === 1 ? '' : 's') + ' shown';
    ['dsShown', 'dsShown2'].forEach(id => { const el = g(id); if (el) el.textContent = txt; });
    if (!shown) {
      let e = g('dsEmpty');
      if (!e) { e = document.createElement('div'); e.id = 'dsEmpty'; e.className = 'empty'; e.style.cssText = 'grid-column:1/-1;padding:44px 20px;text-align:center';
        e.innerHTML = '<div class="big">&#10022;</div><h3>No designs match those filters</h3><p style="color:var(--ink-3);margin-top:6px">Try widening the weight range or clearing a filter.</p>';
        grid.appendChild(e); }
      e.style.display = '';
    } else { const e = g('dsEmpty'); if (e) e.style.display = 'none'; }
  };
  ['dsfCat', 'dsfStone', 'dsfColour', 'dsfPurity', 'dsfWMin', 'dsfWMax'].forEach(id => {
    const el = g(id); if (!el) return; el.oninput = apply; el.onchange = apply;
  });
  const quick = g('dsfQuick');
  if (quick) quick.querySelectorAll('.pf-chip').forEach(ch => {
    ch.onclick = () => {
      const on = ch.classList.contains('on');
      quick.querySelectorAll('.pf-chip').forEach(x => x.classList.remove('on'));
      if (!on) { ch.classList.add('on'); g('dsfWMin').value = ch.dataset.min || ''; g('dsfWMax').value = ch.dataset.max || ''; }
      else { g('dsfWMin').value = ''; g('dsfWMax').value = ''; }
      apply();
    };
  });
  const rst = g('dsfReset');
  if (rst) rst.onclick = () => {
    ['dsfCat', 'dsfStone', 'dsfColour', 'dsfPurity', 'dsfWMin', 'dsfWMax'].forEach(id => { const el = g(id); if (el) el.value = ''; });
    quick && quick.querySelectorAll('.pf-chip').forEach(x => x.classList.remove('on'));
    apply();
  };
  apply();
}
window.ShivaaDS = {
  qty(pid, d) {
    window._sel[pid] = Math.max(0, (window._sel[pid] || 0) + d);
    const card = document.getElementById('ds-' + pid);
    if (card) {
      card.classList.toggle('on', window._sel[pid] > 0);
      card.querySelector('.ds-qty span').textContent = window._sel[pid];
    }
    this.updateBar();
  },
  updateBar() {
    let g = 0, n = 0;
    Object.entries(window._sel).forEach(([id, q]) => {
      if (q > 0) { n++; const p = state.productsCache.find(x => x.id === id); if (p) g += p.weightG * q; }
    });
    const f = (g * (+state.settings.metalFactor || 0.92)).toFixed(2);
    const c = document.getElementById('dsCount'), fb = document.getElementById('dsFine');
    if (c) c.textContent = `${n} design${n === 1 ? '' : 's'} · ${g.toFixed(2)} g`;
    if (fb) fb.textContent = `${f} g fine`;
  },
  selected() {
    return Object.entries(window._sel).filter(([, q]) => q > 0).map(([id, qty]) => ({ id, qty }));
  },
  async proceed() {
    if (!state.user) { openLogin(); return toast('Login as a jeweller to place the billing order', 'err'); }
    const items = this.selected();
    if (!items.length) return toast('Select designs first (tap +)', 'err');
    let g = 0;
    const rows = items.map(it => { const p = state.productsCache.find(x => x.id === it.id); g += p.weightG * it.qty; return { p, qty: it.qty }; });
    const factor = +state.settings.metalFactor || 0.92;
    const fine = (g * factor).toFixed(2);
    openModal(`
      <h3 style="font-size:24px;margin-bottom:2px">Metal Settlement Bill</h3>
      <div style="font-size:12px;color:var(--ink-3);margin-bottom:14px">ZERO making charges · fine metal @ ${(state.settings.finePurity || '99.50%')}</div>
      <table class="tanq-table">${rows.map(r => `<tr><td>${esc(r.p.name.replace('Shivaa Ring Design', 'Design'))}</td><td>× ${r.qty}</td><td>${(r.p.weightG * r.qty).toFixed(3)} g</td></tr>`).join('')}
      <tr><td>Total selected weight</td><td></td><td>${g.toFixed(3)} g</td></tr>
      <tr><td>Purity conversion</td><td>× ${factor}</td><td>−</td></tr>
      <tr class="total"><td>Fine metal payable</td><td>${(state.settings.finePurity || '99.50%')}</td><td>${fine} g</td></tr></table>
      <div style="font-size:11.5px;color:var(--ink-3);margin:8px 0 14px">Making charges: <b>₹0 (waived for partners)</b> · settlement in pure metal.</div>
      <button class="btn btn-primary btn-block" onclick="ShivaaDS.place()">Place Metal Order (${fine} g fine)</button>
    `);
  },
  async place() {
    try {
      const ord = await api('/api/metalexchange/order', { method: 'POST', body: JSON.stringify({ items: this.selected() }) });
      window._sel = {};
      closeModal();
      openModal(`<div class="center"><div style="font-size:40px">✦</div><h3 style="margin:8px 0">Metal Order ${ord.id} placed</h3>
        <p style="font-size:14px;color:var(--ink-2)">${ord.totalWeightG} g selected → <b>${ord.fineGrams} g fine metal @ ${ord.purity}</b><br>Making charges: ₹0 · Status: ${ord.status}</p>
        <a class="btn btn-gold" style="margin-top:12px" target="_blank" rel="noopener" href="https://wa.me/918905005921?text=${encodeURIComponent('✦ SHIVAA METAL ORDER ✦\n\nOrder: ' + ord.id + '\nTotal weight: ' + ord.totalWeightG + ' g\n× ' + ord.factor + ' = ' + ord.fineGrams + ' g fine @ ' + ord.purity + '\nMaking charges: ZERO\n\nPlease confirm.')}">Confirm on WhatsApp →</a></div>`);
      toast('Metal order ' + ord.id + ' placed ✦');
    } catch (e) { toast(e.message, 'err'); }
  },
};

/* ── v23: universal reveal for pillars / wp-cards / .rvl ── */
/* if anything goes wrong with observers, never leave content invisible */
setTimeout(() => {
  document.querySelectorAll('.pillar,.wp-card,.ugc-card,.rvl,.rv').forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.top < innerHeight * 1.2) { el.classList.add('seen'); el.classList.add('in'); }
  });
}, 2600);

window.bindV23Reveal = function bindV23Reveal() {
  const els = document.querySelectorAll('.pillar:not(.seen),.wp-card:not(.seen),.rvl:not(.seen),.ugc-card:not(.seen)');
  if (!els.length) return;
  if (!('IntersectionObserver' in window)) { els.forEach(e => e.classList.add('seen')); return; }
  const io = new IntersectionObserver((es, o) => es.forEach((e, i) => {
    if (e.isIntersecting) { setTimeout(() => e.target.classList.add('seen'), Math.min(i * 80, 400)); o.unobserve(e.target); }
  }), { threshold: .14, rootMargin: '0px 0px -30px' });
  els.forEach(e => io.observe(e));
}


/* Shared partner-only gate. Used by the two B2B-restricted desks so a
   non-partner never sees the commercial terms of either scheme. */
function partnerGateHTML(title, sub) {
  return `
  <section class="page-hero"><div class="dust" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div>
    <div class="container"><div class="crumbs"><a href="#/">Home</a> / <a href="#/b2b">For Jewellers</a> / ${esc(title)}</div>
    <h1>${esc(title)}</h1><p>${esc(sub)}</p></div></section>
  <div class="container" style="padding:44px 0 90px;max-width:760px">
    <div class="b2b-gate aurora">
      <div class="bg-orn">&#9670;</div>
      <h2>Verified Jewellers Only</h2>
      <p>This desk is reserved for jeweller partners verified through GST KYC. Commercial terms, rates and forms are not shown publicly.</p>
      <div class="bg-steps"><span>1 &middot; Apply with GSTIN</span><span>2 &middot; OTP verify</span><span>3 &middot; Shivaa approves</span></div>
      <div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center;margin-top:22px">
        ${state.user ? '' : '<button class="btn btn-outline" onclick="Shivaa.openLogin(\'partner\')">Partner Login</button>'}
        <a class="btn btn-primary" href="#/b2b">Start GST Verification &rarr;</a>
      </div>
    </div>
  </div>`;
}

/* ═══════════════════════════════════════════════════════════════════
   PAGE · 100% GOLD BUYBACK GUARANTEE            (deck B2C #10 + #15)
   Live valuation against the same Jaipur rate feed that powers pricing.
   ═══════════════════════════════════════════════════════════════════ */
pages.buyback = async (view) => {
  const R = state.rates || {};
  const g22 = R.gold22 || 0, g18 = R.gold18 || 0, slv = R.silver || 0;

  view.innerHTML = `
  <section class="page-hero lux-hero"><div class="dust" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div>
    <div class="container">
      <div class="crumbs"><a href="#/">Home</a> / Gold Buyback</div>
      <h1 class="ink-reveal">100% Gold <em class="shimmer foil-txt">Buyback</em></h1>
      <p>Zero deduction on the pure gold value of any Shivaa piece — the promise in writing on every invoice we issue.</p>
    </div>
  </section>

  <div class="container lux-wrap">

    <!-- ── the promise, as three vault cards ── -->
    <div class="vault-grid rv">
      <div class="vault-card">
        <span class="vc-num">100<small>%</small></span>
        <b>Pure gold value returned</b>
        <p>We buy back the full metal value of your jewellery at the live Jaipur rate on the day you return — not a discounted "scrap" rate.</p>
      </div>
      <div class="vault-card vc-emerald">
        <span class="vc-num">0<small>%</small></span>
        <b>Deduction on metal</b>
        <p>No melting loss, no handling charge, no hidden cut on the gold itself. What the rate says, you receive.</p>
      </div>
      <div class="vault-card">
        <span class="vc-num">∞</span>
        <b>No expiry</b>
        <p>The guarantee holds for the life of the piece. Bring it back in one year or in twenty — the promise does not lapse.</p>
      </div>
    </div>

    <!-- ── LIVE VALUATION ENGINE ── -->
    <section class="bb-calc rv" id="bbCalc">
      <div class="bbc-head">
        <span class="bbc-live"><i></i> LIVE JAIPUR RATE</span>
        <h2>What is your jewellery worth <em class="shimmer foil-txt">today</em>?</h2>
        <p>Enter the weight and purity stamped on your piece. This is the same feed that prices every product on shivaa.in, refreshed roughly every 10 minutes.</p>
      </div>

      <div class="bbc-body">
        <div class="bbc-form">
          <div class="fld">
            <label>Weight of your piece</label>
            <div class="bbc-wt">
              <input type="number" id="bbWt" value="10" min="0.1" step="0.1" inputmode="decimal">
              <span class="bbc-unit">grams</span>
            </div>
            <input type="range" id="bbRange" class="bbc-range" min="1" max="100" value="10" step="0.5">
          </div>

          <div class="fld">
            <label>Purity stamped on the piece</label>
            <div class="bbc-purity" id="bbPurity">
              <button type="button" class="bbp on"  data-k="g22">22K <small>916</small></button>
              <button type="button" class="bbp"     data-k="g18">18K <small>750</small></button>
              <button type="button" class="bbp"     data-k="slv">Silver <small>925</small></button>
            </div>
          </div>

          <div class="bbc-note">
            <span>✦</span>
            <p>Stones, pearls and enamel are valued separately by our karigars. This estimate covers the precious metal only.</p>
          </div>
        </div>

        <div class="bbc-result">
          <div class="bbr-shine" aria-hidden="true"></div>
          <span class="bbr-label">WE WILL PAY YOU</span>
          <div class="bbr-amt" id="bbAmt">₹0</div>
          <div class="bbr-rate" id="bbRate">—</div>
          <div class="bbr-split">
            <div><small>Rate applied</small><b id="bbPerG">—</b></div>
            <div><small>Deduction</small><b class="bbr-zero">₹0 · 0%</b></div>
          </div>
          <a class="btn btn-gold btn-block btn-lg" id="bbWa">Get this valuation confirmed</a>
          <p class="bbr-fine">Indicative estimate at the current live rate. Final value is confirmed by weight and assay at our Jayal counter.</p>
        </div>
      </div>
    </section>

    <!-- ── comparison: us vs the usual ── -->
    <section class="rv">
      <div class="sec-head"><h2>Why this matters</h2>
        <p>Most counters quote a "buyback" that quietly deducts 8–15% before you see a rupee. Here is the same 10 g piece, both ways.</p></div>
      <div class="cmp-grid">
        <div class="cmp-card cmp-bad">
          <span class="cmp-tag">TYPICAL COUNTER</span>
          <ul>
            <li><span>Gold value</span><b>${fmt(g22 * 10)}</b></li>
            <li><span>Melting / handling loss</span><b class="neg">− ${fmt(g22 * 10 * 0.08)}</b></li>
            <li><span>"Assay" deduction</span><b class="neg">− ${fmt(g22 * 10 * 0.04)}</b></li>
            <li class="cmp-tot"><span>You receive</span><b>${fmt(g22 * 10 * 0.88)}</b></li>
          </ul>
        </div>
        <div class="cmp-card cmp-good">
          <span class="cmp-tag">SHIVAA BUYBACK</span>
          <ul>
            <li><span>Gold value</span><b>${fmt(g22 * 10)}</b></li>
            <li><span>Melting / handling loss</span><b class="zero">₹0</b></li>
            <li><span>"Assay" deduction</span><b class="zero">₹0</b></li>
            <li class="cmp-tot"><span>You receive</span><b>${fmt(g22 * 10)}</b></li>
          </ul>
          <div class="cmp-save">You keep <b>${fmt(g22 * 10 * 0.12)}</b> more</div>
        </div>
      </div>
    </section>

    <!-- ── how it works ── -->
    <section class="rv">
      <div class="sec-head"><h2>How the buyback works</h2><p>Four steps, usually finished inside a single visit.</p></div>
      <div class="step-rail">
        <div class="step-item"><span class="si-n">01</span><b>Bring the piece &amp; the invoice</b><p>Bring the invoice and the actual piece. Check any hallmark reference against the stamp; a catalogue listing or invoice is not a BIS lookup result.</p></div>
        <div class="step-item"><span class="si-n">02</span><b>Weighed in front of you</b><p>On a calibrated counter scale. You watch the number, we both agree on it before anything else happens.</p></div>
        <div class="step-item"><span class="si-n">03</span><b>Valued at the live rate</b><p>The same published Jaipur rate on the board that day — no private "counter rate".</p></div>
        <div class="step-item"><span class="si-n">04</span><b>Paid or exchanged</b><p>Take it as bank transfer, or put the full value against a new piece with nothing deducted.</p></div>
      </div>
    </section>

    <!-- ── terms, stated plainly ── -->
    <section class="rv">
      <div class="sec-head"><h2>The honest fine print</h2><p>Written plainly, because a guarantee with hidden conditions is not a guarantee.</p></div>
      <div class="fine-grid">
        <div class="fine-card"><b>What is covered</b><p>The pure precious-metal content of any jewellery purchased from Shivaa, at 100% of the live rate on the day of return.</p></div>
        <div class="fine-card"><b>Making charges</b><p>Making charges are the karigar's labour and are not returned on a buyback. On an <em>exchange</em> against a new piece, we waive the difference in making on the new item.</p></div>
        <div class="fine-card"><b>Stones &amp; pearls</b><p>Valued separately at fair assessed value, since their resale market differs from bullion. We show you that number before you decide.</p></div>
        <div class="fine-card"><b>Proof of purchase</b><p>The original Shivaa invoice. Lost it? We can retrieve it from your account history — every order is stored against your profile.</p></div>
      </div>
    </section>

    <div class="lux-cta rv">
      <h3>Bring it in, or ask us first</h3>
      <p>Send a photo and the weight on WhatsApp and we will give you an indicative value before you travel.</p>
      <div class="lux-cta-btns">
        <a class="btn btn-gold btn-lg" id="bbWa2">Ask on WhatsApp</a>
        <a class="btn btn-light btn-lg" href="#/contact">Visit the store</a>
      </div>
    </div>
  </div>`;

  /* ---- live calculator ---- */
  const rates = { g22, g18, slv };
  const label = { g22: 'Gold 22K', g18: 'Gold 18K', slv: 'Silver 925' };
  let cur = 'g22';

  const calc = () => {
    const wt = Math.max(0, parseFloat($('#bbWt').value) || 0);
    const per = rates[cur] || 0;
    const total = wt * per;
    const amtEl = $('#bbAmt');
    if (amtEl) {
      amtEl.textContent = fmt(total);
      amtEl.classList.remove('bbr-pop'); void amtEl.offsetWidth; amtEl.classList.add('bbr-pop');
    }
    const rEl = $('#bbRate'); if (rEl) rEl.textContent = `${wt.toLocaleString('en-IN')} g × ${label[cur]}`;
    const pEl = $('#bbPerG'); if (pEl) pEl.textContent = fmt(per) + '/g';
    const msg = `Namaste Shivaa team ✦\n\nI'd like to confirm a buyback valuation.\n\nMetal: ${label[cur]}\nWeight: ${wt} g\nIndicative value: ${fmt(total)}\n\nPlease confirm.`;
    const wa1 = $('#bbWa'), wa2 = $('#bbWa2');
    if (wa1) wa1.onclick = () => waOpen(msg);
    if (wa2) wa2.onclick = () => waOpen(msg);
  };

  const wt = $('#bbWt'), rng = $('#bbRange');
  if (wt) wt.addEventListener('input', () => { if (rng) rng.value = Math.min(100, Math.max(1, parseFloat(wt.value) || 1)); calc(); });
  if (rng) rng.addEventListener('input', () => { if (wt) wt.value = rng.value; calc(); });
  $$('#bbPurity .bbp').forEach(b => b.addEventListener('click', () => {
    $$('#bbPurity .bbp').forEach(x => x.classList.remove('on'));
    b.classList.add('on'); cur = b.dataset.k; calc();
  }));
  calc();
};

/* ═══════════════════════════════════════════════════════════════════
   PAGE · SHIVAA SWARNA NIDHI — 11 + 1 GOLD SAVINGS PLAN  (deck B2C #24)
   Customer pays 11 monthly instalments, Shivaa funds the 12th.
   ═══════════════════════════════════════════════════════════════════ */
pages.savings = async (view) => {
  const R = state.rates || {};
  const g22 = R.gold22 || 0;

  view.innerHTML = `
  <section class="page-hero lux-hero"><div class="dust" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div>
    <div class="container">
      <div class="crumbs"><a href="#/">Home</a> / Gold Savings Plan</div>
      <h1 class="ink-reveal">Swarna <em class="shimmer foil-txt">Nidhi</em></h1>
      <p>Save a fixed amount for eleven months. We pay the twelfth. Then take it in gold, at the rate of the day you buy.</p>
    </div>
  </section>

  <div class="container lux-wrap">

    <!-- ── the 11+1 idea, told visually ── -->
    <section class="rv">
      <div class="plan-hero">
        <div class="ph-left">
          <span class="ph-kicker">✦ THE 11 + 1 SCHEME</span>
          <h2>Eleven from you.<br><em class="shimmer foil-txt">One from us.</em></h2>
          <p>Choose a monthly amount. Pay it for eleven months. In the twelfth month Shivaa adds a full instalment of its own — then you choose any piece in the store and pay only the making charges on it.</p>
          <ul class="ph-points">
            <li><span>✦</span> No lock on design — pick anything, in-store or online</li>
            <li><span>✦</span> Gold billed at the live Jaipur rate on redemption day</li>
            <li><span>✦</span> Miss a month? The plan simply extends, nothing is forfeited</li>
            <li><span>✦</span> Fully refundable in cash before maturity, minus nothing</li>
          </ul>
        </div>
        <div class="ph-right">
          <div class="nidhi-dial" aria-hidden="true">
            <svg class="nd-svg" viewBox="0 0 200 200" role="presentation">
              <defs>
                <linearGradient id="ndGold" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stop-color="#a87a26"/><stop offset=".5" stop-color="#dcbc7a"/><stop offset="1" stop-color="#a87a26"/>
                </linearGradient>
                <linearGradient id="ndEm" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stop-color="#1e8a69"/><stop offset="1" stop-color="#0f5b46"/>
                </linearGradient>
                <filter id="ndGlow" x="-60%" y="-60%" width="220%" height="220%">
                  <feGaussianBlur stdDeviation="3.4" result="b"/>
                  <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
              </defs>
              <circle class="nd-track" cx="100" cy="100" r="86"/>
              ${Array.from({ length: 12 }, (_, i) => {
                const C = 540.354, seg = C / 12, gap = 18;
                const gift = i === 11;
                return `<circle class="nd-seg${gift ? ' nd-gift' : ''}" cx="100" cy="100" r="86" style="--i:${i}"
                  stroke-dasharray="${(seg - gap).toFixed(2)} ${(C - seg + gap).toFixed(2)}"
                  stroke-dashoffset="${(-i * seg).toFixed(2)}"${gift ? ' filter="url(#ndGlow)"' : ''}/>`;
              }).join('')}
            </svg>
            <div class="nd-core">
              <span class="nd-num">11<em>+1</em></span>
              <span class="nd-lbl">months</span>
            </div>
          </div>
          <div class="cs-cap"><b>12<sup>th</sup> instalment</b><small>paid by Shivaa</small></div>
        </div>
      </div>
    </section>

    <!-- ── LIVE PROJECTION ENGINE ── -->
    <section class="sv-calc rv" id="svCalc">
      <div class="bbc-head">
        <span class="bbc-live"><i></i> LIVE PROJECTION</span>
        <h2>See exactly what you will <em class="shimmer foil-txt">walk away with</em></h2>
        <p>Move the slider to your comfortable monthly amount. Gold quantity is projected at today's Jaipur 22K rate of <b>${fmt(g22)}/g</b>.</p>
      </div>

      <div class="svc-body">
        <div class="svc-form">
          <div class="fld">
            <label>Your monthly instalment</label>
            <div class="svc-amt-row">
              <span class="svc-rs">₹</span>
              <input type="number" id="svAmt" value="5000" min="500" step="500" inputmode="numeric">
            </div>
            <input type="range" id="svRange" class="bbc-range" min="500" max="50000" step="500" value="5000">
            <div class="svc-chips" id="svChips">
              <button type="button" data-v="2000">₹2,000</button>
              <button type="button" data-v="5000" class="on">₹5,000</button>
              <button type="button" data-v="10000">₹10,000</button>
              <button type="button" data-v="25000">₹25,000</button>
            </div>
          </div>

          <div class="svc-ledger">
            <div class="svl-row"><span>You pay · 11 months</span><b id="svPaid">—</b></div>
            <div class="svl-row svl-gift"><span>Shivaa adds · month 12</span><b id="svGift">—</b></div>
            <div class="svl-row svl-tot"><span>Total buying power</span><b id="svTotal">—</b></div>
          </div>
        </div>

        <div class="svc-result">
          <div class="bbr-shine" aria-hidden="true"></div>
          <span class="bbr-label">YOU RECEIVE, IN GOLD</span>
          <div class="svr-gold" id="svGrams">0 g</div>
          <div class="bbr-rate">approx. 22K gold at ${fmt(g22)}/g</div>

          <div class="svr-bonus">
            <div class="svrb-ring" id="svRing"><span id="svPct">9%</span></div>
            <div><b>That is a <span id="svBonusRs">₹0</span> gift</b><small>an effective <span id="svPct2">9.09</span>% return on what you paid in</small></div>
          </div>

          <a class="btn btn-gold btn-block btn-lg" id="svJoin">Start my Swarna Nidhi</a>
          <p class="bbr-fine">Gold quantity is indicative and will be billed at the live rate on your redemption day — it may be more or less than shown.</p>
        </div>
      </div>
    </section>

    <!-- ── why it beats saving alone ── -->
    <section class="rv">
      <div class="sec-head"><h2>Three ways to buy the same chain</h2><p>Same target, same day. Only the route is different.</p></div>
      <div class="rte-grid">
        <div class="rte-card">
          <span class="rte-tag">Route 1</span>
          <b>Pay in full, one day</b>
          <div class="rte-fig" id="rteA">₹60,000</div>
          <p>You wait until the whole amount is saved, then buy at whatever the rate is that morning. All the timing risk sits with you.</p>
          <ul><li>No discipline built in</li><li>One large outflow</li><li>Nothing added</li></ul>
        </div>
        <div class="rte-card rte-win">
          <span class="rte-tag">Route 2 · Swarna Nidhi</span>
          <b>Eleven instalments</b>
          <div class="rte-fig"><span id="rteB">₹55,000</span> <s id="rteBs">₹60,000</s></div>
          <p>You pay eleven months of <b id="rteM">₹5,000</b>. Shivaa adds the twelfth. You still walk out with ₹60,000 of buying power.</p>
          <ul><li><span id="rteG">₹5,000</span> added by Shivaa</li><li>Effective 9.09% gain</li><li>Refundable any time</li></ul>
          <span class="rte-badge">✦ Best value</span>
        </div>
        <div class="rte-card">
          <span class="rte-tag">Route 3</span>
          <b>Ordinary monthly saving</b>
          <div class="rte-fig" id="rteC">₹60,000</div>
          <p>Twelve months of <b id="rteM2">₹5,000</b> set aside yourself. It works — it simply does not come with a twelfth instalment on the house.</p>
          <ul><li>Twelve payments, not eleven</li><li>Easy to break the habit</li><li>Nothing added</li></ul>
        </div>
      </div>
    </section>

    <!-- ── month-by-month ── -->
    <section class="rv">
      <div class="sec-head"><h2>Your twelve months</h2><p>Nothing hidden — this is the whole schedule.</p></div>
      <div class="mth-legend">
        <span><i class="ml-you"></i> Your instalment</span>
        <span><i class="ml-us"></i> Paid by Shivaa</span>
      </div>
      <div class="mth-rail" id="svMonths"></div>
    </section>

    <!-- ── rules ── -->
    <section class="rv">
      <div class="sec-head"><h2>The plain rules</h2><p>Read these before you enrol. There is nothing else.</p></div>
      <div class="fine-grid">
        <div class="fine-card"><b>Who can join</b><p>Anyone with a Shivaa account and a verified mobile number. Enrol online or at the Jayal counter.</p></div>
        <div class="fine-card"><b>If you miss a month</b><p>The plan extends by that month. There is no penalty and no interest. The 12th instalment from Shivaa is paid once your 11 are complete.</p></div>
        <div class="fine-card"><b>Cancelling early</b><p>Withdraw any time before maturity and receive every rupee you paid back in full. The Shivaa instalment applies only on completion.</p></div>
        <div class="fine-card"><b>What you can buy</b><p>Any gold or silver jewellery in the store. Making charges are payable on the piece you choose; the saved amount covers the metal.</p></div>
        <div class="fine-card"><b>Rate applied</b><p>The published live Jaipur rate on the day you redeem — not the day you enrolled. If gold falls, you get more grams.</p></div>
        <div class="fine-card"><b>Transferable</b><p>The plan can be redeemed by an immediate family member with your written consent and ID.</p></div>
      </div>
    </section>

    <div class="lux-cta rv">
      <h3>Begin with a single month</h3>
      <p>Tell us your amount on WhatsApp and we will set the plan up and send your first receipt the same day.</p>
      <div class="lux-cta-btns">
        <a class="btn btn-gold btn-lg" id="svWa">Enrol on WhatsApp</a>
        <a class="btn btn-light btn-lg" href="#/contact">Ask a question</a>
      </div>
    </div>
  </div>`;

  /* ---- live projection ---- */
  const calc = () => {
    const m = Math.max(0, parseFloat($('#svAmt').value) || 0);
    const paid = m * 11, gift = m, total = paid + gift;
    const grams = g22 > 0 ? total / g22 : 0;
    const pct = paid > 0 ? (gift / paid) * 100 : 0;

    const set = (id, v) => { const e = $(id); if (e) e.textContent = v; };
    set('#svPaid', fmt(paid)); set('#svGift', fmt(gift)); set('#svTotal', fmt(total));
    set('#svBonusRs', fmt(gift));
    // keep the three-routes comparison in step with the slider
    set('#rteA', fmt(total)); set('#rteB', fmt(paid)); set('#rteBs', fmt(total));
    set('#rteC', fmt(m * 12)); set('#rteG', fmt(gift));
    set('#rteM', fmt(m)); set('#rteM2', fmt(m));
    set('#svPct', Math.round(pct) + '%'); set('#svPct2', pct.toFixed(2));

    const gEl = $('#svGrams');
    if (gEl) {
      gEl.textContent = grams.toFixed(2) + ' g';
      gEl.classList.remove('bbr-pop'); void gEl.offsetWidth; gEl.classList.add('bbr-pop');
    }
    const ring = $('#svRing');
    if (ring) ring.style.setProperty('--p', Math.min(100, pct * 4) + '%');

    const rail = $('#svMonths');
    if (rail) rail.innerHTML = Array.from({ length: 12 }, (_, i) => {
      const last = i === 11;
      return `<div class="mth-cell${last ? ' mth-gift' : ''}">
        <span class="mc-n">${last ? '12' : String(i + 1).padStart(2, '0')}</span>
        <b>${fmt(m)}</b>
        <small>${last ? 'paid by Shivaa ✦' : 'your instalment'}</small></div>`;
    }).join('');

    const msg = `Namaste Shivaa team ✦\n\nI'd like to enrol in the Swarna Nidhi 11+1 gold savings plan.\n\nMonthly instalment: ${fmt(m)}\nI pay 11 months: ${fmt(paid)}\nShivaa adds: ${fmt(gift)}\nTotal buying power: ${fmt(total)}\n\nPlease set this up for me.`;
    ['#svJoin', '#svWa'].forEach(s => { const e = $(s); if (e) e.onclick = () => waOpen(msg); });
  };

  const amt = $('#svAmt'), rng = $('#svRange');
  if (amt) amt.addEventListener('input', () => { if (rng) rng.value = Math.min(50000, Math.max(500, parseFloat(amt.value) || 500)); calc(); });
  if (rng) rng.addEventListener('input', () => { if (amt) amt.value = rng.value; calc(); });
  $$('#svChips button').forEach(b => b.addEventListener('click', () => {
    $$('#svChips button').forEach(x => x.classList.remove('on'));
    b.classList.add('on');
    if (amt) amt.value = b.dataset.v; if (rng) rng.value = b.dataset.v;
    calc();
  }));
  calc();
};

/* ═══════════════════════════════════════════════════════════════════
   PAGE · METAL INVESTMENT SCHEME                  (deck B2B #09 / #10)
   1% per month · 12% per year, paid on metal deposited with Shivaa.
   B2B-facing. Carries an explicit regulatory disclaimer.
   ═══════════════════════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════════════════
   PAGE · METAL INVESTMENT SCHEME                              (v28)
   PARTNER-ONLY. 24K 99.999 fine gold is the only metal accepted.
   Returns engine: fixed Shivaa interest of 12%/yr (1%/month) plus
   gold value growth modelled at 12%/yr on the ₹/gram rate.
   ═══════════════════════════════════════════════════════════════════ */
pages.metal = async (view) => {
  if (!isPartner()) { view.innerHTML = partnerGateHTML('Metal Investment Scheme',
    'A private facility for GST-verified jeweller partners. Terms are shared after verification.'); return; }
  const R = state.rates || {};
  const g24 = R.gold24 || 0;

  view.innerHTML = `
  <section class="page-hero lux-hero mtl-hero"><div class="dust" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div>
    <div class="container">
      <div class="crumbs"><a href="#/">Home</a> / <a href="#/b2b">For Jewellers</a> / Metal Scheme</div>
      <h1 class="ink-reveal">Metal Investment <em class="shimmer foil-txt">Scheme</em></h1>
      <p>Deposit pure 24K &mdash; 99.999 &mdash; fine gold. Earn a fixed 12% a year in interest while your gold itself grows, modelled at 12% a year in the calculator below.</p>
    </div>
  </section>

  <div class="container lux-wrap">

    <!-- ── headline numbers ── -->
    <div class="mtl-stats rv">
      <div class="ms-card ms-hero-card">
        <span class="ms-big">24<small>K</small></span>
        <b>99.999 fine gold only</b>
        <p>The only metal this scheme accepts &mdash; assay-verified 99.999 pure gold, the same grade we bill on the bullion desk.</p>
      </div>
      <div class="ms-card">
        <span class="ms-big">12<small>%</small></span>
        <b>interest per year, fixed</b>
        <p>Credited as 1% every month on the metal value you deposit &mdash; taken in metal weight or in cash, your choice.</p>
      </div>
      <div class="ms-card">
        <span class="ms-big">+12<small>%</small></span>
        <b>gold value growth / yr</b>
        <p>Modelled at 12% a year on the rupee-per-gram rate in our calculator &mdash; so you see both engines of your return.</p>
      </div>
    </div>

    <!-- ── purity statement ── -->
    <div class="mtl-pure rv">
      <div class="mp-num"><b>999.9</b><span>fineness</span></div>
      <div class="mp-tx"><b>Only the purest metal enters this scheme</b>
        <p>Ask the team about weighing, assaying and the documentation available for your deposit. 22K or 18K jewellery? That belongs on our <a href="#/deadstock">Dead Stock Purchase</a> desk, where it is converted to fine metal for you.</p></div>
      <div class="mp-chip" aria-hidden="true"><span>ASSAY</span>VERIFIED</div>
    </div>

    <!-- ── LIVE RETURNS ENGINE ── -->
    <section class="sv-calc rv" id="mtCalc">
      <div class="bbc-head">
        <span class="bbc-live"><i></i> LIVE CALCULATION</span>
        <h2>What your fine gold <em class="shimmer foil-txt">could become</em></h2>
        <p>Today's Jaipur rate for 24K (99.999) fine gold: <b>${fmt(g24)}/g</b>.</p>
      </div>

      <div class="svc-body">
        <div class="svc-form">
          <div class="fld">
            <label>Metal accepted</label>
            <div class="purity-lock"><span class="pl-k">24K</span>
              <span class="pl-tx"><b>Gold &middot; 99.999 fine</b>the only grade in this scheme</span></div>
          </div>

          <div class="fld">
            <label>Weight you would deposit</label>
            <div class="bbc-wt">
              <input type="number" id="mtWt" value="100" min="1" step="1" inputmode="decimal">
              <span class="bbc-unit">grams</span>
            </div>
            <input type="range" id="mtRange" class="bbc-range" min="10" max="2000" step="10" value="100">
          </div>

          <div class="fld">
            <label>Term</label>
            <div class="svc-chips" id="mtTerm">
              <button type="button" data-v="6">6 months</button>
              <button type="button" data-v="12" class="on">12 months</button>
              <button type="button" data-v="24">24 months</button>
              <button type="button" data-v="36">36 months</button>
            </div>
          </div>

          <div class="svc-ledger">
            <div class="svl-row"><span>Value of your gold today</span><b id="mtPrin">&mdash;</b></div>
            <div class="svl-row svl-int"><span>Shivaa interest &middot; 12%/yr fixed</span><b id="mtInt">&mdash;</b></div>
            <div class="svl-row svl-app"><span>Gold value growth &middot; 12%/yr modelled</span><b id="mtApp">&mdash;</b></div>
            <div class="svl-row svl-tot"><span>Value at maturity</span><b id="mtTot">&mdash;</b></div>
          </div>
        </div>

        <div class="svc-result">
          <div class="bbr-shine" aria-hidden="true"></div>
          <span class="bbr-label">YOU EARN, OVER THE TERM</span>
          <div class="svr-gold" id="mtEarn">&#8377;0</div>
          <div class="bbr-rate" id="mtSub">&mdash;</div>

          <div class="mtl-split" aria-hidden="true"><i id="mtSpI" style="width:50%"></i><i id="mtSpA" style="width:50%"></i></div>
          <div class="mts-leg" aria-hidden="true"><span class="l1">Interest 12%</span><span class="l2">Value growth 12%</span></div>
          <div class="mt-grams" id="mtGrams">&mdash;</div>

          <div class="mt-bars" id="mtBars"></div>

          <a class="btn btn-gold btn-block btn-lg" id="mtWa">Discuss this deposit</a>
          <p class="bbr-fine">Gold value growth is a market assumption shown for illustration &mdash; actual prices vary, and the past never guarantees the future. The 12% interest is fixed in your signed deposit agreement and depends on metal weight, purity and term.</p>
        </div>
      </div>
    </section>

    <!-- ── how it works ── -->
    <section class="rv">
      <div class="sec-head"><h2>How the scheme works</h2><p>Built for jewellers and bullion holders sitting on fine gold that is not moving.</p></div>
      <div class="step-rail">
        <div class="step-item"><span class="si-n">01</span><b>Assay &amp; deposit</b><p>Your 24K fine gold is weighed and assayed in your presence. Weight and fineness are recorded on a signed receipt.</p></div>
        <div class="step-item"><span class="si-n">02</span><b>Agreement signed</b><p>A written deposit agreement fixes the 12% annual interest, the term and the withdrawal terms before anything is handed over.</p></div>
        <div class="step-item"><span class="si-n">03</span><b>Monthly credit</b><p>1% of the deposited value is credited every month &mdash; taken as fine metal weight or transferred in cash.</p></div>
        <div class="step-item"><span class="si-n">04</span><b>Maturity or rollover</b><p>At term end, take your gold back in full, take the cash equivalent, or roll it into a fresh term.</p></div>
      </div>
    </section>

    <!-- ── eligibility ── -->
    <section class="rv">
      <div class="sec-head"><h2>Who this is for</h2><p>This is a B2B facility, not a retail savings product.</p></div>
      <div class="fine-grid">
        <div class="fine-card"><b>Registered jewellers</b><p>GST-registered retail or wholesale jewellers with a verified firm and a Shivaa partner account.</p></div>
        <div class="fine-card"><b>Fine-gold holders</b><p>Holders of 24K investment-grade bars, coins and assayed fine metal looking for a yield on gold that would otherwise sit in a locker.</p></div>
        <div class="fine-card"><b>Minimum deposit</b><p>100 g of 24K (99.999) fine gold. Smaller weights are considered case by case for active partners.</p></div>
        <div class="fine-card"><b>Withdrawal</b><p>Full withdrawal at maturity. Early withdrawal is permitted with 30 days' notice at a pro-rated rate.</p></div>
      </div>
    </section>

    <!-- ── REGULATORY NOTICE ── -->
    <section class="rv">
      <div class="mtl-legal">
        <span class="ml-ic">&#9888;</span>
        <div>
          <b>Important notice</b>
          <p>This scheme is offered to registered business partners under a bilateral written agreement and is <b>not</b> a public deposit, a bank product, or a security. It is not covered by deposit insurance. Interest is a contractual obligation of Shivaa and is subject to the terms of your signed agreement. Gold value growth shown in the calculator is an assumption, not a promise. Prospective participants should take independent financial and legal advice before depositing metal. Nothing on this page is an offer to the general public.</p>
        </div>
      </div>
    </section>

    <div class="lux-cta rv">
      <h3>Speak to the bullion desk</h3>
      <p>Every deposit is structured individually. Tell us the weight and term you have in mind and we will send the agreement draft.</p>
      <div class="lux-cta-btns">
        <a class="btn btn-gold btn-lg" id="mtWa2">Talk to the bullion desk</a>
        <a class="btn btn-light btn-lg" href="#/b2b">Become a partner</a>
      </div>
    </div>
  </div>`;

  /* ---- live returns: 12% interest + 12% modelled appreciation ---- */
  let term = 12;

  const calc = () => {
    const wt = Math.max(0, parseFloat($('#mtWt').value) || 0);
    const months = term;
    const prin = wt * g24;                          // value today
    const interest = prin * 0.01 * months;          // fixed 1%/month
    const appr = prin * 0.12 * (months / 12);       // 12%/yr on ₹/gram, simple
    const total = prin + interest + appr;
    const earn = interest + appr;

    const set = (id, v) => { const e = $(id); if (e) e.textContent = v; };
    set('#mtPrin', fmt(prin)); set('#mtInt', '+ ' + fmt(interest));
    set('#mtApp', '+ ' + fmt(appr)); set('#mtTot', fmt(total));
    set('#mtSub', `${wt.toLocaleString('en-IN')} g 24K fine gold \u00b7 ${months} months \u00b7 12% + 12%`);

    const eEl = $('#mtEarn');
    if (eEl) {
      eEl.textContent = fmt(earn);
      eEl.classList.remove('bbr-pop'); void eEl.offsetWidth; eEl.classList.add('bbr-pop');
    }

    // contribution split between the two engines
    const share = earn > 0 ? (interest / earn) * 100 : 50;
    const spI = $('#mtSpI'), spA = $('#mtSpA');
    if (spI) spI.style.width = share.toFixed(1) + '%';
    if (spA) spA.style.width = (100 - share).toFixed(1) + '%';

    const gr = $('#mtGrams');
    if (gr) gr.textContent = g24 > 0 ? `\u2248 +${(earn / g24).toFixed(2)} g of fine gold if you take the earnings in metal` : '\u2014';

    // growth bars — cumulative value per quarter (interest + growth)
    const bars = $('#mtBars');
    if (bars) {
      const q = Math.max(1, Math.round(months / 3));
      const vAt = m => prin * (1 + 0.01 * m + 0.12 * (m / 12));
      const vFinal = vAt(months) || 1;
      bars.innerHTML = Array.from({ length: q }, (_, i) => {
        const m = (i + 1) * (months / q);
        const h = (vAt(m) / vFinal) * 100;
        return `<i style="--h:${h.toFixed(1)}%;--d:${i * 70}ms"><span>${Math.round(m)}m</span></i>`;
      }).join('');
    }

    const msg = `Namaste Shivaa bullion desk \u2726\n\nI'd like to discuss the metal investment scheme.\n\nMetal: 24K (99.999) fine gold\nWeight: ${wt} g\nTerm: ${months} months\nIndicative value today: ${fmt(prin)}\nIndicative interest (12%/yr): ${fmt(interest)}\nModelled value growth (12%/yr): ${fmt(appr)}\n\nFirm name: \nGSTIN: \n\nPlease send me the agreement details.`;
    ['#mtWa', '#mtWa2'].forEach(s => { const e = $(s); if (e) e.onclick = () => waOpen(msg); });
  };

  const wt = $('#mtWt'), rng = $('#mtRange');
  if (wt) wt.addEventListener('input', () => { if (rng) rng.value = Math.min(2000, Math.max(10, parseFloat(wt.value) || 10)); calc(); });
  if (rng) rng.addEventListener('input', () => { if (wt) wt.value = rng.value; calc(); });
  $$('#mtTerm button').forEach(b => b.addEventListener('click', () => {
    $$('#mtTerm button').forEach(x => x.classList.remove('on'));
    b.classList.add('on'); term = +b.dataset.v; calc();
  }));
  calc();
};

/* ═══════════════════════════════════════════════════════════════════
   PAGE · DEAD STOCK PURCHASE                        (deck B2B #11)
   PARTNER-ONLY. Shivaa buys slow-moving plain stock at 1 wastage and
   credits 50% of the making charges back against the jeweller's bill,
   so the piece never has to be melted.
   ═══════════════════════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════════════════
   PAGE · DEAD STOCK PURCHASE                                  (v28)
   PARTNER-ONLY. We buy plain 22K gold jewellery only, at one wastage,
   and settle in fine 99.999 metal value. The 50% making-charge credit
   is melting-loss protection — it exists so melting never wins — not
   a payment for the making charges themselves.
   ═══════════════════════════════════════════════════════════════════ */
pages.deadstock = async (view) => {
  if (!isPartner()) { view.innerHTML = partnerGateHTML('Dead Stock Purchase',
    'Turn slow-moving counter stock into fine metal. A private facility for GST-verified jeweller partners.'); return; }

  const R = state.rates || {};
  const g22 = R.gold22 || 0, g24 = R.gold24 || 0;

  view.innerHTML = `
  <section class="page-hero lux-hero ds-hero-bg"><div class="dust" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div>
    <div class="container">
      <div class="crumbs"><a href="#/">Home</a> / <a href="#/partner">Partner Portal</a> / Dead Stock</div>
      <span class="lux-badge">&#9670; PARTNERS ONLY</span>
      <h1 class="ink-reveal">Dead Stock <em class="shimmer foil-txt">Purchase</em></h1>
      <p>Your slow-moving 22K jewellery, bought at one wastage and settled as fine 99.999 metal value &mdash; with half your making charges credited back so melting never wins.</p>
    </div>
  </section>

  <div class="container lux-wrap">

    <!-- ── the offer ── -->
    <div class="vault-grid rv">
      <div class="vault-card">
        <span class="vc-num">22<small>K</small></span>
        <b>Plain 22K jewellery only</b>
        <p>Bangles, chains, rings, plain sets &mdash; any design, any age. One wastage, no grading arguments, no per-piece haggling.</p>
      </div>
      <div class="vault-card vc-emerald">
        <span class="vc-num">50<small>%</small></span>
        <b>Melting-loss protection</b>
        <p>Not a payment for making charges &mdash; a protection. Half of what you paid is credited against your next Shivaa bill so selling to us always beats melting.</p>
      </div>
      <div class="vault-card">
        <span class="vc-num">999.9</span>
        <b>Settled in fine metal</b>
        <p>We convert the 22K gold content of your stock to fine-metal value at the live rate. You restock with fresh designs &mdash; nothing of yours is destroyed.</p>
      </div>
    </div>

    <!-- ── LIVE RECOVERY ESTIMATOR ── -->
    <section class="sv-calc rv" id="dsCalc">
      <div class="bbc-head">
        <span class="bbc-live"><i></i> LIVE ESTIMATE</span>
        <h2>What your 22K stock is <em class="shimmer foil-txt">actually worth</em></h2>
        <p>Today's Jaipur rates &mdash; 22K gold <b>${fmt(g22)}/g</b> &middot; fine 24K <b>${fmt(g24)}/g</b>.</p>
      </div>

      <div class="svc-body">
        <div class="svc-form">
          <div class="fld">
            <label>Category we purchase</label>
            <div class="purity-lock emerald"><span class="pl-k">22K</span>
              <span class="pl-tx"><b>Plain gold jewellery</b>the only category on this desk</span></div>
          </div>

          <div class="fld">
            <label>Total weight of dead stock</label>
            <div class="bbc-wt">
              <input type="number" id="dsWt" value="250" min="1" step="1" inputmode="decimal">
              <span class="bbc-unit">grams</span>
            </div>
            <input type="range" id="dsRange" class="bbc-range" min="10" max="5000" step="10" value="250">
          </div>

          <div class="fld">
            <label>Making charges you originally paid</label>
            <div class="bbc-wt">
              <span class="svc-rs">&#8377;</span>
              <input type="number" id="dsMc" value="60000" min="0" step="1000" inputmode="numeric">
            </div>
            <div class="ds-mc-hint">Roughly what the karigar charged on this lot. This is only used to size your melting-loss protection.</div>
          </div>
        </div>

        <div class="svc-result">
          <div class="bbr-shine" aria-hidden="true"></div>
          <span class="bbr-label">TOTAL YOU RECOVER</span>
          <div class="svr-gold" id="dsTotal">&#8377;0</div>
          <div class="bbr-rate" id="dsSub">&mdash;</div>

          <div class="ds-split">
            <div class="dss-row dss-fine"><span>Fine 99.999 metal you receive</span><b id="dsFine">&mdash;</b></div>
            <div class="dss-row"><span>Metal value at one wastage</span><b id="dsMetalVal">&mdash;</b></div>
            <div class="dss-row dss-credit"><span>Melting-loss protection &middot; 50% of MC</span><b id="dsCredit">&mdash;</b></div>
            <div class="dss-row dss-vs"><span>If you melted it instead</span><b id="dsMelt">&mdash;</b></div>
            <div class="dss-gain" id="dsGain">&mdash;</div>
          </div>

          <a class="btn btn-gold btn-block btn-lg" id="dsWa">Send this lot for pickup</a>
          <p class="bbr-fine">Indicative. Final settlement follows physical assay and weight at our Jayal counter. The 50% credit applies against Shivaa purchases only, never as cash.</p>
        </div>
      </div>
    </section>

    <!-- ── ENQUIRY FORM ── -->
    <section class="rv">
      <div class="sec-head"><h2>Send us the lot</h2><p>Tell us what you are holding. We confirm a firm figure within 48 hours and arrange insured pickup.</p></div>
      <div class="ds-form-card">
        <form id="dsForm" class="form-grid" onsubmit="Shivaa.dsSubmit(event)">
          <div class="fld"><label>Firm name *</label><input name="firm" required placeholder="e.g. Krishna Jewellers"></div>
          <div class="fld"><label>Contact person *</label><input name="person" required placeholder="Your name"></div>
          <div class="fld"><label>Mobile *</label><input name="phone" required pattern="[6-9][0-9]{9}" maxlength="10" inputmode="numeric" placeholder="10-digit mobile"></div>
          <div class="fld"><label>City *</label><input name="city" required placeholder="e.g. Nagaur"></div>
          <div class="fld"><label>Category</label>
            <div class="purity-lock emerald ds-lock-sm"><span class="pl-k">22K</span>
              <span class="pl-tx"><b>Plain gold jewellery</b>22 karat only</span></div>
          </div>
          <div class="fld"><label>Approx. total weight (g) *</label><input name="weight" type="number" step="0.1" min="1" required placeholder="e.g. 250"></div>
          <div class="fld"><label>Approx. making charges paid (&#8377;)</label><input name="mc" type="number" min="0" step="500" placeholder="e.g. 60000"></div>
          <div class="fld"><label>Roughly how old is this stock?</label>
            <select name="age"><option>6 – 12 months</option><option>1 – 2 years</option><option>2 – 5 years</option><option>Over 5 years</option></select>
          </div>
          <div class="fld full"><label>What is in the lot?</label>
            <input name="items" placeholder="e.g. 40 plain bangles, 12 chains, assorted rings">
          </div>
          <div class="fld full"><label>Anything else we should know?</label>
            <input name="note" placeholder="Hallmarked? Original bills available? Preferred pickup week?">
          </div>
          <button class="btn btn-gold btn-block btn-lg">Request a firm quote &rarr;</button>
        </form>
        <p class="ds-form-note">&#9670; Verified partners only &middot; insured pickup arranged by Shivaa &middot; firm figure within 48 hours</p>
      </div>
    </section>

    <!-- ── how it works ── -->
    <section class="rv">
      <div class="sec-head"><h2>How it works</h2><p>Four steps from a dusty tray to fresh designs on your counter.</p></div>
      <div class="step-rail">
        <div class="step-item"><span class="si-n">01</span><b>Send the list</b><p>Fill the form above or send photos on WhatsApp. Approximate weights are fine at this stage.</p></div>
        <div class="step-item"><span class="si-n">02</span><b>Firm quote in 48 h</b><p>We confirm the one-wastage metal value and your melting-loss credit in writing before anything moves.</p></div>
        <div class="step-item"><span class="si-n">03</span><b>Insured pickup</b><p>Our carrier collects from your counter, fully insured in transit. You keep the signed receipt.</p></div>
        <div class="step-item"><span class="si-n">04</span><b>Fine-metal settlement</b><p>The 22K content is converted to fine-metal value against your next order; the 50% credit sits on your account with no expiry.</p></div>
      </div>
    </section>

    <!-- ── terms ── -->
    <section class="rv">
      <div class="sec-head"><h2>The terms, plainly</h2><p>Nothing hidden. Ask the bullion desk if anything here is unclear.</p></div>
      <div class="fine-grid">
        <div class="fine-card"><b>What we take</b><p>Plain 22K gold jewellery in sellable condition &mdash; bangles, chains, rings, plain sets. Any design, any age.</p></div>
        <div class="fine-card"><b>What we cannot take here</b><p>Heavily stone-set, enamelled or damaged pieces are quoted case by case. 18K and silver are handled separately by the bullion desk.</p></div>
        <div class="fine-card"><b>Why 50% of the making charges</b><p>It is not a payment for craftsmanship &mdash; it is calibrated so you never recover less than melting. The credit applies against future Shivaa purchases and never expires.</p></div>
        <div class="fine-card"><b>Minimum lot</b><p>100 g of 22K gold. Active partners can send smaller lots &mdash; message the desk first.</p></div>
      </div>
    </section>

    <div class="lux-cta rv">
      <h3>Still holding stock from three seasons ago?</h3>
      <p>Send a photo of the tray. We will tell you what it is worth before you commit to anything.</p>
      <div class="lux-cta-btns">
        <a class="btn btn-gold btn-lg" id="dsWa2">Message the bullion desk</a>
        <a class="btn btn-light btn-lg" href="#/metal">Metal Investment Scheme &rarr;</a>
      </div>
    </div>
  </div>`;

  /* ---- live estimator: 22K → fine metal + melting-loss protection ---- */
  const FINE = 0.916;   // 22K = 91.6% fine content
  const WAST = 0.99;    // bought at one wastage
  const MELT = 0.92;    // typical melting route loses ~8%

  const calc = () => {
    const wt = Math.max(0, parseFloat($('#dsWt').value) || 0);
    const mc = Math.max(0, parseFloat($('#dsMc').value) || 0);
    const fineG = wt * FINE * WAST;          // fine grams after one wastage
    const metalVal = g24 > 0 ? fineG * g24 : wt * g22 * WAST;
    const credit = mc * 0.5;                 // melting-loss protection
    const total = metalVal + credit;
    const melted = wt * g22 * MELT;          // melting: 8% loss, MC gone
    const gain = total - melted;

    const set = (id, v) => { const e = $(id); if (e) e.textContent = v; };
    set('#dsFine', `${fineG.toLocaleString('en-IN', { maximumFractionDigits: 1 })} g \u2248 ${fmt(metalVal)}`);
    set('#dsMetalVal', fmt(metalVal));
    set('#dsCredit', '+ ' + fmt(credit));
    set('#dsMelt', fmt(melted));
    set('#dsSub', `${wt.toLocaleString('en-IN')} g of 22K jewellery \u00b7 one wastage \u00b7 settled as fine metal`);

    const gEl = $('#dsGain');
    if (gEl) gEl.innerHTML = gain >= 0
      ? `You stay <b>${fmt(gain)}</b> ahead of melting \u2014 and the karigar's work survives`
      : `Melting would return ${fmt(-gain)} more`;

    const tEl = $('#dsTotal');
    if (tEl) {
      tEl.textContent = fmt(total);
      tEl.classList.remove('bbr-pop'); void tEl.offsetWidth; tEl.classList.add('bbr-pop');
    }

    const msg = `Namaste Shivaa bullion desk \u2726\n\nI'd like to sell dead stock under the 1-wastage scheme.\n\nCategory: 22K plain gold jewellery\nWeight: ${wt} g\nMaking charges paid: ${fmt(mc)}\n\nIndicative fine-metal value: ${fmt(metalVal)}\nMelting-loss protection (50% of MC): ${fmt(credit)}\nTotal recovery: ${fmt(total)}\n\nFirm name: \nCity: \n\nPlease arrange a pickup.`;
    ['#dsWa', '#dsWa2'].forEach(sel => { const e = $(sel); if (e) e.onclick = () => waOpen(msg); });
  };

  const wt = $('#dsWt'), rng = $('#dsRange'), mc = $('#dsMc');
  if (wt) wt.addEventListener('input', () => { if (rng) rng.value = Math.min(5000, Math.max(10, parseFloat(wt.value) || 10)); calc(); });
  if (rng) rng.addEventListener('input', () => { if (wt) wt.value = rng.value; calc(); });
  if (mc) mc.addEventListener('input', calc);
  calc();
};

/* Dead-stock enquiry — read by NAME (never by index) and sent to WhatsApp,
   so the lot is logged in a channel the bullion desk already watches. */
window.Shivaa.dsSubmit = (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  const g = k => String(f.get(k) || '').trim();
  const phone = g('phone');
  if (!/^[6-9][0-9]{9}$/.test(phone)) { toast('Please enter a valid 10-digit mobile number'); return; }
  const msg = `Namaste Shivaa bullion desk \u2726\n\nDEAD STOCK PURCHASE ENQUIRY\n\n`
    + `Firm: ${g('firm')}\nContact: ${g('person')}\nMobile: ${phone}\nCity: ${g('city')}\n\n`
    + `Category: 22K plain gold jewellery\nApprox weight: ${g('weight')} g\n`
    + `Making charges paid: ${g('mc') ? '\u20b9' + g('mc') : 'not stated'}\n`
    + `Age of stock: ${g('age')}\n`
    + `Lot contains: ${g('items') || 'not stated'}\n`
    + `Note: ${g('note') || '\u2014'}\n\n`
    + `Please confirm the wastage and my melting-loss protection credit (50% of making charges).`;
  waOpen(msg);
  toast('Opening WhatsApp with your enquiry \u2726');
  e.target.reset();
};

/* ═══════════════════════════════════════════════════════════════════
   PAGES · TRACK ORDER + FAQ                                      (v31)
   ═══════════════════════════════════════════════════════════════════ */
pages.track = async (view) => {
  if (!state.user) { openLogin('track'); return; }
  view.innerHTML = `
  <section class="page-hero"><div class="dust" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div>
    <div class="container"><div class="crumbs"><a href="#/">Home</a> / Track Order</div>
    <h1 class="ink-reveal">Track Your <em class="shimmer foil-txt">Order</em></h1>
    <p>Every shipment is insured, tamper-sealed and signature + OTP verified on delivery.</p></div>
  </section>
  <div class="container" style="padding:44px 0 90px;max-width:900px">
    <div id="trackList"><div class="loading-spin"></div></div>
    <div class="adm-card" style="margin-top:26px">
      <h3>Where is my tracking link?</h3>
      <p style="font-size:13.5px;color:var(--ink-2);line-height:1.7">The moment your order ships, we WhatsApp and email you the courier name and tracking number. You can also open any order below for its invoice and full history — or just message us on <a href="javascript:Shivaa.waOpen('Namaste Shivaa \\u2726\\n\\nPlease share the delivery status for my order.\\n\\nOrder ID: ')" style="color:var(--maroon);font-weight:500">WhatsApp</a> and we will reply with the live status.</p>
    </div>
  </div>`;
  const box = $('#trackList');
  try {
    const { orders } = await api('/api/orders');
    if (!orders.length) {
      box.innerHTML = `<div class="empty"><div class="big">&#10022;</div><h3>No orders yet</h3>
        <p style="color:var(--ink-3);margin:8px 0 18px">Your orders will appear here the moment you place one.</p>
        <a class="btn btn-primary" href="#/shop">Explore the collections</a></div>`;
      return;
    }
    const pill = s => `<span class="status-pill ${s === 'delivered' ? 'st-delivered' : s === 'cancelled' ? 'st-cancelled' : 'st-placed'}">${esc(s)}</span>`;
    box.innerHTML = orders.map(o => `
      <div class="adm-card" style="margin-bottom:16px;display:flex;gap:18px;align-items:center;flex-wrap:wrap">
        <div style="flex:1;min-width:220px">
          <b style="font-family:var(--ff-disp);font-size:19px;color:var(--maroon-deep)">${esc(o.id)}</b>
          <small style="display:block;color:var(--ink-3);margin-top:3px">${new Date(o.createdAt).toLocaleString('en-IN')} · ${o.items.length} item${o.items.length > 1 ? 's' : ''} · ${esc(o.paymentMethod)}</small>
        </div>
        <div style="text-align:right">${pill(o.status)}
          <b style="display:block;margin-top:5px">${fmt(o.total)}</b></div>
        <a class="btn btn-ghost btn-sm" href="#/invoice/${o.id}">Invoice</a>
      </div>`).join('');
  } catch (e) {
    if (!state.user) { openLogin('track'); return; }
    box.innerHTML = `<div class="empty"><h3>${esc(e.message)}</h3></div>`;
  }
};

pages.faq = async (view) => {
  view.innerHTML = `
  <section class="page-hero"><div class="dust" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div>
    <div class="container"><div class="crumbs"><a href="#/">Home</a> / FAQ</div>
    <h1 class="ink-reveal">Questions, <em class="shimmer foil-txt">answered</em></h1>
    <p>The things families ask us most — purity, pricing, delivery and buyback. Anything else, we are one WhatsApp away.</p></div>
  </section>
  <div class="container" style="padding:44px 0 90px;max-width:860px">
    <h2 class="label" style="margin-bottom:16px">Purity &amp; pricing</h2>
    <details class="acc" open><summary>How do I check BIS hallmark details?</summary><div class="acc-body">Use the HUID stamped on the actual piece in the official BIS Care app’s “Verify HUID” feature. Staff-entered HUIDs, catalogue descriptions and listed purity are not BIS verification. Our <a class="hm-text-link" href="#/hallmark">HUID check guide</a> explains the process and clearly shows when no piece-level HUID has been provided. Automatic BIS verification is not connected here.</div></details>
    <details class="acc"><summary>How is the price of a piece calculated?</summary><div class="acc-body">(Live metal rate × weight) + making charges for that piece + GST at 3%. The metal rate is Jaipur's live rate at the time of billing — the same number you see on the ticker, to the rupee.</div></details>
    <details class="acc"><summary>Do making charges differ between designs?</summary><div class="acc-body">Yes — each design carries its own making charge based on the karigar's work, shown clearly on the product page. Machine-made chains cost far less than hand-carved bridal work, and we think you should see that honestly.</div></details>
    <details class="acc"><summary>Why do prices change between visits?</summary><div class="acc-body">Because the metal rate moves. Prices track the live Jaipur rate and refresh every few minutes — the rate is locked at the moment you place your order.</div></details>
    <h2 class="label" style="margin:34px 0 16px">Orders &amp; delivery</h2>
    <details class="acc"><summary>How fast is delivery, and is it insured?</summary><div class="acc-body">Dispatched in 24–48 hours, delivered in 2–6 days across India depending on your city. Every shipment is fully insured, tamper-sealed, and delivered against signature and OTP verification.</div></details>
    <details class="acc"><summary>Can I track my order?</summary><div class="acc-body">Yes — we WhatsApp and email the courier tracking number as soon as it ships, and you can see every order under <a href="#/track" style="color:var(--maroon);font-weight:500">Track Your Order</a>.</div></details>
    <details class="acc"><summary>What is your return policy?</summary><div class="acc-body">7-day no-question returns on uncustomised pieces, in original tamper-sealed condition with the invoice. Engraved and custom-made pieces are exchangeable rather than returnable — we will always explain this before you order.</div></details>
    <h2 class="label" style="margin:34px 0 16px">Buyback &amp; exchange</h2>
    <details class="acc"><summary>What is the Shivaa buyback promise?</summary><div class="acc-body">Any Shivaa gold piece comes back to us at <b>100% of the prevailing metal value</b> on the day of return — no deduction, no "scrap" discount. See the <a href="#/buyback" style="color:var(--maroon);font-weight:500">Gold Buyback</a> page for the live value of your pieces.</div></details>
    <details class="acc"><summary>Can I exchange my old gold from other shops?</summary><div class="acc-body">Yes — old gold is assayed on our karat meter and valued at the live rate for exchange against any new purchase. Visit us in Jayal, or message us for a doorstep assessment in partner cities.</div></details>
    <h2 class="label" style="margin:34px 0 16px">Custom work</h2>
    <details class="acc"><summary>Can you make a design I have in mind?</summary><div class="acc-body">That is our favourite kind of order. Share a photo or sketch on WhatsApp — you get a transparent quote (metal at live rate + making charges + stones), typically crafted in 10–21 days with progress photos. See <a href="#/services" style="color:var(--maroon);font-weight:500">Bespoke &amp; Care</a>.</div></details>
    <details class="acc"><summary>Do you make pieces for jewellers and resellers?</summary><div class="acc-body">Yes — our B2B desk serves 300+ partner jewellers with wholesale designs, bullion and schemes. Apply on the <a href="#/b2b" style="color:var(--maroon);font-weight:500">For Jewellers</a> page with your GSTIN.</div></details>
    <div class="lux-cta" style="margin-top:44px">
      <h3>Still have a question?</h3>
      <p>Our family replies personally — usually within the hour, all days 10:00–20:30.</p>
      <div class="lux-cta-btns">
        <a class="btn btn-gold btn-lg" id="faqWa">Ask on WhatsApp</a>
        <a class="btn btn-light btn-lg" href="#/contact">Contact page</a>
      </div>
    </div>
  </div>`;
  const wa = $('#faqWa');
  if (wa) wa.onclick = () => waOpen('Namaste Shivaa \u2726\n\nI have a question: ');
};

/* ─────────── ROUTER ─────────── */
const routes = {};
Object.keys(pages).forEach(k => routes[k] = pages[k]);
Object.assign(window.Shivaa, {
  api, state, store, token, setToken, toast, openModal, closeModal, toggleWish, addToCart,
  toggleCompare, removeCompare, clearCompare, copyCompareLink, waCompare, compareLink, compareItems,
  routes, price, fmt, esc, productCard, mcTableHTML, openLogin,
  waLink, waOpen, waProductMsg, waCartMsg, waOrderMsg, waCompareMsg, WA_SVG, waFallbackModal,
  redraw: () => route(true),
});
function route() {
  const hash = location.hash.replace(/^#\/?/, '') || '';
  const [pathPart, qs] = hash.split('?');
  const seg = pathPart.split('/').filter(Boolean);
  const page = seg[0] || 'home';
  const q = new URLSearchParams(qs || '');
  const view = $('#view');
  closeModal();
  while (_scrollLock.n > 0) unlockScroll();
  clearInterval(window._carTimer);
  document.body.dataset.page = page;
  if (routes[page]) {
    const res = routes[page](view, q, seg[1]);
    if (res && res.catch) res.catch(e => { console.error(e); view.innerHTML = `<div class="empty"><div class="big">✦</div><h3>Something slipped</h3><p>${esc(e.message)}</p></div>`; });
  } else {
    view.innerHTML = `<div class="empty" style="padding:120px 20px"><img src="/images/logo.png" class="empty-logo" alt=""><h3>This page has slipped its clasp</h3><p style="color:var(--ink-3);margin:10px 0 20px">Redirecting you home in <b id="redirN">3</b>…</p><a class="btn btn-primary" href="#/">Take me home ✦</a></div>`;
    let n = 3;
    const iv = setInterval(() => {
      n--; const el = $('#redirN'); if (el) el.textContent = n;
      if (n <= 0) { clearInterval(iv); location.hash = '#/'; }
    }, 1000);
  }
  window.scrollTo({ top: 0 });
  // performance: lazy-load everything below the fold (runs right after paint)
  const lazySweep = () => document.querySelectorAll('img:not([loading])').forEach(img => {
    if (img.getBoundingClientRect().top > innerHeight + 40) { img.loading = 'lazy'; img.decoding = 'async'; }
  });
  setTimeout(lazySweep, 0); setTimeout(lazySweep, 900);
  // branded page banners + advanced category slider
  initCatbar();
  setTimeout(() => {
    try {
    $$('.page-hero:not(.lg-done)').forEach(ph => {
      ph.classList.add('lg-done');
      if (!ph.querySelector('.ph-mark')) ph.insertAdjacentHTML('beforeend', '<img src="/images/logo.png" class="ph-mark" alt="">');
      if (!ph.querySelector('.ph-trust')) ph.insertAdjacentHTML('beforeend', '<div class="ph-trust"><a href="#/hallmark">✦ HUID check guide</a><a href="#/trust">✦ Why Trust Shivaa</a><span>✦ Live-Rate Pricing</span><span>✦ Insured Delivery</span></div>');
    });
    const heroEl = $('#view .hero');
    if (heroEl && !heroEl.querySelector('.hero-logo')) {
      heroEl.insertAdjacentHTML('beforeend', '<img src="/images/logo.png" class="hero-logo" alt="">');
      if (!heroEl.querySelector('.hero-cue')) heroEl.insertAdjacentHTML('beforeend', '<div class="hero-cue"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 9l6 6 6-6"/></svg>scroll</div>');
    }
    } catch(e) { /* v42: prevent crash on pages with unusual DOM (e.g. hallmark) */ }
  }, 0);
  // nav active
  $$('.nav a').forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#/' + page || (page === '' && a.getAttribute('href') === '#/')));
  $$('.mnav a').forEach(a => {
    const m = a.dataset.m;
    a.classList.toggle('on', m === page || (m === 'home' && (page === '' || page === 'home')));
  });
  if(window._closeDrawer) window._closeDrawer(); else { $('#navToggle')?.classList.remove('open'); $('#mainNav')?.classList.remove('open'); }
  requestAnimationFrame(() => {
    try { bindReveal(); } catch(e) {}
    try { bindTilt(); } catch(e) {}
    try { bindMagnetic(); } catch(e) {}
    try { decorate5D(); } catch(e) {}
    try { setHeaderH(); } catch(e) {}
    try { initDsfilters(); } catch(e) {}
    try { bindV23Reveal(); } catch(e) {}
    try { updateCompareUI(); } catch(e) {}
    try { updatePartnerUI(); } catch(e) {}
  });
}
addEventListener('hashchange', route);

/* ─────────── SEARCH ─────────── */
$('#searchBtn').onclick = () => { $('#searchDrawer').classList.add('open'); $('#searchInput').focus(); renderSugg(''); };
$('#searchClose').onclick = () => $('#searchDrawer').classList.remove('open');
/* v29 — desktop header search field (mirrors the drawer behaviour) */
(() => {
  const inp = $('#hdrSearchInput'), clear = $('#hdrSearchClear');
  if (!inp) return;
  inp.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const v = inp.value.trim();
      if (v) location.hash = '#/shop?q=' + encodeURIComponent(v);
    }
    if (e.key === 'Escape') inp.blur();
  });
  inp.addEventListener('input', () => { if (clear) clear.hidden = !inp.value; });
  if (clear) clear.onclick = () => { inp.value = ''; clear.hidden = true; inp.focus(); };
})();
$('#searchInput').oninput = e => renderSugg(e.target.value);
$('#searchInput').onkeydown = e => {
  if (e.key === 'Enter' && e.target.value.trim()) { location.hash = '#/shop?q=' + encodeURIComponent(e.target.value.trim()); $('#searchDrawer').classList.remove('open'); }
};
function renderSugg(qs) {
  const s = qs.toLowerCase();
  const list = state.productsCache.filter(p => (p.name + p.category).toLowerCase().includes(s)).slice(0, 6);
  const el = $('#searchSugg');
  el.classList.toggle('open', list.length > 0);
  el.innerHTML = list.map(p => `<div class="sugg" onclick="location.hash='#/product/${p.id}';document.getElementById('searchDrawer').classList.remove('open')">
    <img src="${p.images[0]}" alt=""><div><b>${esc(p.name)}</b><small>${CATS[p.category]?.name} · ${fmt(price(p).total)}</small></div></div>`).join('');
}

/* ─────────── live price refresh (targeted DOM updates) ─────────── */
document.addEventListener('rates', () => {
  if (typeof renderRateStrip === 'function') renderRateStrip();
  $$('.js-price').forEach(el => {
    const p = state.productsCache.find(x => x.id === el.dataset.pid);
    if (!p) return;
    const val = Math.round(price(p).total * (+el.dataset.qty || 1));
    const html = fmt(val) + (el.dataset.suffix ? esc(el.dataset.suffix) : '');
    if (el.dataset.last === undefined) { el.dataset.last = val; el.innerHTML = html; return; }
    if (+el.dataset.last !== val) {
      el.dataset.last = val; el.innerHTML = html;
      el.classList.remove('flash-price'); void el.offsetWidth; el.classList.add('flash-price');
    }
  });
  refreshPdLive();
  refreshCheckoutTotals();
  if (location.hash.startsWith('#/rates')) pages.rates($('#view'));
  if (location.hash.startsWith('#/cart')) pages.cart($('#view'));
  if (location.hash.startsWith('#/compare')) pages.compare($('#view'), new URLSearchParams());
});
function refreshPdLive() {
  const pd = window._pd;
  if (!pd || !pd.p || !$('#pdTotal')) return;
  const pr = price(pd.p);
  const set = (sel, v) => { const el = $(sel); if (el) el.textContent = v; };
  set('#pdTotal', fmt(pr.total));
  set('#pdRate', fmt(pr.ratePerGram));
  set('#pdMetal', fmt(pr.metalValue));
  set('#pdMC', fmt(pr.makingCharge));
  set('#pdGst', fmt(pr.gst));
  set('#pdBrkTot', fmt(pr.total));
  set('#pdEmi3', fmt(Math.round(pr.total / 3)));
  set('#pdEmi6', fmt(Math.round(pr.total / 6 * 1.02)));
}
function refreshCheckoutTotals() {
  if (!$('#coSub') || !window._co) return;
  const items = state.cart.map(c => ({ ...c, p: state.productsCache.find(x => x.id === c.id) })).filter(x => x.p);
  const subtotal = items.reduce((a, it) => a + price(it.p).total * it.qty, 0);
  window._co.subtotal = subtotal;
  window._co.freeShip = subtotal >= state.settings.freeShipAbove;
  $$('.summary [data-copid]').forEach(el => {
    const it = items.find(x => x.p.id === el.dataset.copid && +x.qty === +el.dataset.qty);
    if (it) { const v = price(it.p).total * it.qty; if (el.dataset.last !== String(v)) { el.dataset.last = v; el.textContent = fmt(v); el.classList.remove('flash-price'); void el.offsetWidth; el.classList.add('flash-price'); } }
  });
  let disc = window._co.disc || 0;
  if ($('#usePts')?.checked) disc += Math.min(state.user?.loyaltyPoints || 0, Math.floor(subtotal * 0.1));
  const ship = window._co.freeShip ? 0 : state.settings.shippingFee;
  $('#coSub').textContent = fmt(subtotal);
  $('#coDiscRow').hidden = !(disc > 0);
  $('#coDisc').textContent = '− ' + fmt(disc);
  if ($('#coShip')) $('#coShip').textContent = fmt(ship);
  $('#coTotal').textContent = fmt(Math.max(0, subtotal - disc + ship));
}

/* ─────────── header behaviours + premium chrome ─────────── */
addEventListener('scroll', (() => {
  // v42: throttled scroll handler — prevents jank on Android Chrome
  let _scrollTicking = false;
  return () => {
    if (_scrollTicking) return;
    _scrollTicking = true;
    requestAnimationFrame(() => {
      const hdr = $('#header');
      if (hdr) hdr.classList.toggle('scrolled', scrollY > 8);
      hdr && hdr.classList.toggle('compact', scrollY > 170);
      const d = document.documentElement;
      const pct = scrollY / Math.max(1, d.scrollHeight - innerHeight) * 100;
      const sp = $('#scrollProg'); if (sp) sp.style.width = pct + '%';
      _scrollTicking = false;
    });
  };
})(), { passive: true });
/* ── drawer: scrim, body-lock, ESC, focus-trap, swipe-to-close ── */
(function initDrawer(){
  const tgl=$('#navToggle'), nav=$('#mainNav'), scrim=$('#drawerScrim');
  if(!tgl||!nav) return;
  const isOpen=()=>nav.classList.contains('open');
  const setOpen=(on)=>{
    nav.classList.toggle('open',on); tgl.classList.toggle('open',on);
    scrim&&scrim.classList.toggle('on',on);
    document.body.classList.toggle('drawer-open',on);
    tgl.setAttribute('aria-expanded',on?'true':'false');
    if(on){ const f=nav.querySelector('a,button'); f&&setTimeout(()=>f.focus({preventScroll:true}),320); }
  };
  window._closeDrawer=()=>setOpen(false);
  const dwClose=$('#dwClose');
  if(dwClose) dwClose.addEventListener('click',()=>setOpen(false));
  tgl.setAttribute('aria-controls','mainNav'); tgl.setAttribute('aria-expanded','false');
  tgl.onclick=e=>{e.stopPropagation();setOpen(!isOpen());};
  scrim&&(scrim.onclick=()=>setOpen(false));
  addEventListener('keydown',e=>{
    if(e.key==='Escape'&&isOpen()) setOpen(false);
    if(e.key==='Tab'&&isOpen()&&innerWidth<=820){
      const f=[...nav.querySelectorAll('a,button')].filter(x=>x.offsetParent!==null);
      if(!f.length) return;
      const first=f[0], last=f[f.length-1];
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
    }
  });
  nav.addEventListener('click',e=>{ if(e.target.closest('a')&&innerWidth<=820) setOpen(false); });
  // swipe left to close
  let x0=null,y0=null;
  nav.addEventListener('touchstart',e=>{x0=e.touches[0].clientX;y0=e.touches[0].clientY;},{passive:true});
  nav.addEventListener('touchmove',e=>{
    if(x0===null) return;
    const dx=e.touches[0].clientX-x0, dy=Math.abs(e.touches[0].clientY-y0);
    if(dx<-58&&dy<44){ setOpen(false); x0=null; }
  },{passive:true});
  addEventListener('resize',()=>{ if(innerWidth>820&&isOpen()) setOpen(false); });
})();
// mobile: tap "Categories" to open the dropdown (no hover on touch)
$$('.nav-drop > a').forEach(a => {
  a.addEventListener('click', e => {
    if (matchMedia('(max-width:680px)').matches) {
      if (!a.parentElement.classList.contains('open')) { e.preventDefault(); a.parentElement.classList.add('open'); }
      else a.parentElement.classList.remove('open');
    }
  });
});
// header height var (mega panel positioning)
const setHeaderH = () => { const h = document.getElementById('header'); if (h) document.documentElement.style.setProperty('--headerH', Math.round(h.getBoundingClientRect().bottom) + 'px'); };
addEventListener('resize', setHeaderH, { passive: true });
// magnetic buttons + glare-follow on extra cards (5D layer)
function bindMagnetic(scope = document) {
  // v42: disabled entirely on mobile/touch — major source of scroll-jank & flicker
  const _mob = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (innerWidth <= 820);
  if (_mob) return;
  // binds everywhere; motion only matters on fine pointers
  $$('.btn-primary,.btn-gold,.btn-outline', scope).forEach(b => {
    if (b._mag) return; b._mag = true; b.classList.add('magnetic');
    b.addEventListener('mousemove', e => { const r = b.getBoundingClientRect(); const dx = (e.clientX - r.left - r.width / 2) / r.width, dy = (e.clientY - r.top - r.height / 2) / r.height; b.style.transform = `translate(${dx * 7}px, ${dy * 5}px)`; });
    b.addEventListener('mouseleave', () => { b.style.transform = ''; });
  });
  $$('.catlog,.testi,.acct-tile,.addr-card', scope).forEach(c => {
    if (c._glare) return; c._glare = true;
    c.addEventListener('mousemove', e => { const r = c.getBoundingClientRect(); c.style.setProperty('--gx', ((e.clientX - r.left) / r.width * 100) + '%'); c.style.setProperty('--gy', ((e.clientY - r.top) / r.height * 100) + '%'); });
  });
}
// Pause heavy banner motion whenever the banner is off screen.
// Keeps long pages at 60fps without giving up the motion-poster feel.
window._kenIO = null;
function initBannerMotion() {
  const targets = $$('.hero, .page-hero, .carousel');
  if (!targets.length) return;
  if (!window._kenIO) {
    if (!('IntersectionObserver' in window)) { targets.forEach(t => t.classList.add('ken-on')); return; }
    window._kenIO = new IntersectionObserver(entries => {
      entries.forEach(en => en.target.classList.toggle('ken-on', en.isIntersecting));
    }, { rootMargin: '80px 0px', threshold: 0.01 });
  }
  targets.forEach(t => window._kenIO.observe(t));
}

// 5D ambience: aurora + ink-reveal on page heroes
function decorate5D() {
  // .hero and .page-hero now carry their own cinematic backdrops (photo + fade,
  // gradient + light shaft), so the blurred aurora layer underneath is invisible
  // yet still costs a full-viewport 26px blur every frame. Keep it off them.
  $$('.pillars,.ugc-sec').forEach(el => el.classList.add('aurora'));

  // Cinematic motion only runs on banners that are actually on screen.
  // A full-viewport Ken-Burns layer costs a frame even when scrolled past,
  // so gate every heavy banner animation behind .ken-on.
  initBannerMotion();
  $$('.page-hero h1').forEach(el => { if (!el.closest('.order-card')) el.classList.add('ink-reveal'); });
}
// cursor glow — positioned always, shown only on fine pointers (CSS media gate)
// v42: disabled on mobile/touch to prevent scroll-jank and page unresponsiveness
(() => {
  const cg = $('#cursorGlow'); if (!cg) return;
  const _isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (innerWidth <= 820);
  if (_isTouchDevice) return;  // skip entirely on mobile — prevents flicker + lag
  cg.classList.add('on');
  let mx = innerWidth / 2, my = innerHeight / 2, gx = mx, gy = my;
  addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; }, { passive: true });
  (function glow() { gx += (mx - gx) * 0.12; gy += (my - gy) * 0.12; cg.style.left = gx + 'px'; cg.style.top = gy + 'px'; requestAnimationFrame(glow); })();
})();

/* ─────────── boot ─────────── */
async function wishIds() {
  if (!state.user) return [];
  try { return (await api('/api/wishlist')).wishlist; } catch (e) { return []; }
}
async function boot(isRedraw) {
  // parallel initial fetches
  const [me, settings, mc, prods, cats] = await Promise.all([
    token() ? api('/api/auth/me').catch(() => ({ user: null })) : Promise.resolve({ user: null }),
    api('/api/settings').catch(() => ({})),
    api('/api/making-charges').catch(() => ({ table: [] })),
    api('/api/products').catch(() => ({ products: [] })),
    api('/api/catalogs').catch(() => ({ catalogs: [] })),
  ]);
  state.user = me.user; state.settings = { freeShipAbove: 50000, shippingFee: 250, phone: '+91 8905005921', whatsapp: '918905005921', email: 'Support@shivaa.in', address: '', ...settings };
  state.mcTable = mc.table || [];
  state.productsCache = prods.products || []; state.cacheAt = Date.now();
  state.compare = normalizeCompare(state.compare).filter(id => state.productsCache.some(p => p.id === id));
  store.set('shv_compare', state.compare);
  window.Shivaa.catCache = cats.catalogs || []; catCache = window.Shivaa.catCache;
  await loadRates();
  updateBadges();
  // Catalogues link: jewellers only (GST-verified partners)
  // gate the wholesale design desk with a class, not inline display —
  // the drawer's layout rules use !important and would override an inline style
  document.querySelectorAll('a[href="#/catalogues"]').forEach(a => { a.classList.toggle('b2b-only-hide', !isPartner()); a.style.display = ''; });
  document.querySelectorAll('.foot-chips a[href="#/catalogues"]').forEach(a => a.classList.toggle('b2b-only-hide', !isPartner()));
  // footer social WhatsApp link (subtle)
  // custom pages in footer
  try {
    const { pages: cps } = await api('/api/pages');
    if (cps && cps.length) {
      const col = document.querySelector('.footer .foot-col:nth-child(2)');
      if (col && !document.getElementById('customPageLinks')) {
        const div = document.createElement('div');
        div.id = 'customPageLinks';
        cps.slice(0, 5).forEach(pg => div.insertAdjacentHTML('beforeend', `<a href="#/p/${pg.slug}">${esc(pg.title)}</a>`));
        col.appendChild(div);
      }
    }
  } catch (e) {}
  const fw = $('#footWa');
  if (fw) { fw.target = '_blank'; fw.rel = 'noopener'; fw.href = waLink('Namaste Shivaa ✦'); }
  // populate nav + footer category menus
  $('#catMenu').innerHTML = `
  <div class="mega-in">
    <div class="mega-grid">${Object.entries(CATS).map(([k, c]) => `
      <a class="mega-tile" href="#/shop?category=${k}">
        <span class="mt-img"><img src="${c.img}" alt="${c.name}" loading="lazy"></span>
        <span class="mt-tx"><b>${c.name}</b><small>${c.sub}</small></span>
      </a>`).join('')}
    </div>
    <div class="mega-rail">
      <a class="mega-feat" href="#/shop?tag=heritage">
        <img src="/images/banners/poster-heritage.jpg" alt="The Heritage Edit">
        <div><span class="mega-k">The Heritage Edit</span><b>HANDCRAFTED<br>CLASSICS</b><small>Explore the edit →</small></div>
      </a>
      <a class="mega-cta" href="#/shop?max=50000">The Under ₹50,000 Edit <span>→</span></a>
      <a class="mega-cta alt" href="#/b2b">For Jewellers · B2B Portal <span>→</span></a>
    </div>
  </div>`;
  // open/close behaviour (desktop: full-width panel under header; mobile: inside menu)
  const panel = $('#catMenu'), backdrop = $('#megaBackdrop'), catsBtn = $('#navCats');
  const closeMega = () => { if (matchMedia('(max-width:680px)').matches) return; panel.hidden = true; backdrop.hidden = true; catsBtn?.setAttribute('aria-expanded', 'false'); document.documentElement.classList.remove('no-scroll'); };
  if (catsBtn && !catsBtn._wired) {
    catsBtn._wired = true;
    catsBtn.onclick = e => {
      e.stopPropagation();
      // inside the drawer, expand an inline list rather than the desktop mega panel
      if (matchMedia('(max-width:820px)').matches) {
        let list = document.getElementById('dwCatList');
        if (!list) {
          list = document.createElement('div');
          list.id = 'dwCatList'; list.className = 'dw-catlist';
          list.innerHTML = Object.entries(CATS).map(([k, c]) =>
            `<a href="#/shop?category=${k}"><img src="${c.img}" alt="" loading="lazy"><span>${esc(c.name)}</span></a>`).join('');
          catsBtn.insertAdjacentElement('afterend', list);
        }
        const open = !list.classList.contains('open');
        list.classList.toggle('open', open);
        catsBtn.classList.toggle('open', open);
        catsBtn.setAttribute('aria-expanded', String(open));
        if (open) requestAnimationFrame(() => list.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
        return;
      }
      const open = panel.hidden;
      panel.hidden = !open; backdrop.hidden = !open;
      catsBtn.setAttribute('aria-expanded', String(open));
    };
    panel.addEventListener('click', e => { if (e.target.closest('a')) closeMega(); });
    backdrop.addEventListener('click', closeMega);
    document.addEventListener('click', e => { if (!e.target.closest('#catMenu') && !e.target.closest('#navCats')) closeMega(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMega(); });
    addEventListener('scroll', closeMega, { passive: true });
  }
  // The drawer's own tile grid + "All 17 categories" pill replace the old
  // stacked mm-grid / mm-feats / mcat-list blocks (they duplicated the same
  // destinations three times and made the drawer ~860px taller than the phone).
  $('#footCats').innerHTML = Object.entries(CATS).map(([k, c]) => `<a href="#/shop?category=${k}">${c.name}</a>`).join('');
  const pl = $('#preloader');
  if (pl) { pl.classList.add('hide'); setTimeout(() => pl.remove(), 900); }
  route();
  // poll rates every 60s (server caches 10-min; ticker + prices refresh)
  setInterval(loadRates, 60000);
}
// Wait for the following feature/auth/admin scripts to register their routes.
// A fast cached API must not outrun loading the HUID module on a cold visit.
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => boot(), { once: true });
else boot();

})();
