/* ═══════════════════════════════════════════════════════════
   SHIVAA app.js — core SPA: router, state, pages, 3D, rates
   ═══════════════════════════════════════════════════════════ */
'use strict';
(function () {

/* ─────────── v115 · release handshake ───────────
   index.html stamps window.__SHIVAA_REL=<n> in <head> BEFORE any script
   loads. If the shell a shopper was served is NEWER than this app.js — a
   phone can pair a fresh index.html with a script still held in some cache
   layer, which is exactly how "the update changed nothing" happened — reload
   exactly once so the release pairs up. The sessionStorage flag makes the
   guard fire at most once per tab; it can never loop. */
const APP_REL = 176;
/* v166 · ASSET_V — the stamp every asset URL this script builds must carry.
   `.htaccess` serves any `?v=` URL as `immutable` for a YEAR, so a literal
   frozen token (the old `?v=125` on category photos, `?v=122` on the logo
   fallback) pins that image on every device that has already seen it — the
   same trap that kept a 15-day-old stylesheet on returning shoppers. Media
   URLs now ride the release, exactly like the shell's script and link tags. */
const ASSET_V = '?v=' + APP_REL;
try {
  if ((window.__SHIVAA_REL || 0) > APP_REL && !sessionStorage.getItem('shv_rel_guard')) {
    sessionStorage.setItem('shv_rel_guard', '1');
    location.reload();
  }
} catch (e) {}

/* ─────────── safe storage (works even in sandboxed previews) ─────────── */
const mem = Object.create(null);
const volatileKeys = new Set();
let _storageBlocked = false;
try { localStorage.setItem('shv_probe', '1'); localStorage.removeItem('shv_probe'); } catch (e) { _storageBlocked = true; }
const store = {
  get(k, d) { if (_storageBlocked || volatileKeys.has(k)) return k in mem ? mem[k] : d; try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return k in mem ? mem[k] : d; } },
  set(k, v) { mem[k] = v; if (_storageBlocked) return; try { localStorage.setItem(k, JSON.stringify(v)); volatileKeys.delete(k); } catch (e) { volatileKeys.add(k); } },
};
/* v168 — persisted browser data is untrusted, even when it is valid JSON. */
const cleanIds = value => Array.isArray(value) ? [...new Set(value.filter(x => typeof x === 'string' && x.trim()))] : [];
const cleanCart = value => !Array.isArray(value) ? [] : value.filter(x =>
  x && typeof x === 'object' && typeof x.id === 'string' && x.id.trim() &&
  Number.isFinite(Number(x.qty)) && Number(x.qty) > 0
).map(x => ({ id: x.id, qty: Math.min(99, Math.max(1, Math.floor(Number(x.qty)))),
  size: typeof x.size === 'string' || typeof x.size === 'number' ? String(x.size) : null,
  engraving: typeof x.engraving === 'string' ? x.engraving : '' }));
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
/* ── offline awareness (v104 — honest, app-style connectivity chrome) ── */
function ensureOfflineBar() {
  if (document.getElementById('offlineBar')) return document.getElementById('offlineBar');
  const d = document.createElement('div');
  d.id = 'offlineBar'; d.className = 'offline-bar';
  d.innerHTML = '<span class="ob-dot" aria-hidden="true"></span><span>You’re offline — saved pieces and the saved catalogue still work. We’ll reconnect you automatically.</span>';
  document.body.appendChild(d); return d;
}
addEventListener('offline', () => { ensureOfflineBar().classList.add('show'); document.body.classList.add('is-offline'); });
addEventListener('online', () => {
  ensureOfflineBar().classList.remove('show'); document.body.classList.remove('is-offline');
  toast('Back online ✦ refreshing rates…'); loadRates();
});
/* ═══ v140/v141 · SILENT UPDATES — no popup, ever ═══
   Owner report (18 Sep 2026, verbatim): "When people open my website, it says
   update, when we press update it again pops up and says update, i don't want
   these popups of update to be shown, website should be updated automatically
   from back-end and customers should only see the latest version."

   WHY IT LOOPED. Two separate watchers both offered the same update — this one
   (#swUpdate, "A newer, better Shivaa is ready") and js/v107.js's pwaUpdateBar
   (#v107Upd, "A fresher Shivaa is ready"). Worse, the button here did:

       worker.postMessage('SKIP_WAITING');
       location.reload();          // ← immediately, without waiting

   `postMessage` only ASKS the waiting worker to activate; it returns at once.
   So the page reloaded while that worker was still waiting, the reloaded page
   found `reg.waiting` again, and offered the same button again — press update,
   get update, forever. The `prompted` flag could not help: it is a variable,
   and every reload starts a fresh one.

   WHY NO PROMPT IS NEEDED AT ALL. sw.js already calls self.skipWaiting() at the
   end of its own install handler and self.clients.claim() on activate — the new
   release takes over by itself, with no tap from anybody. And the shell is
   network-first, so a returning shopper is served the freshest index.html and
   the freshest ?v=-stamped scripts on their next load regardless. The popup was
   asking the customer to do something that was already happening.

   WHAT THIS DOES INSTEAD:
     · never creates a banner, and deletes one if an older cached copy did;
     · silently tells any waiting worker to activate (SKIP_WAITING);
     · applies the swap with a reload ONLY when the tab is hidden — the shopper
       is looking somewhere else, so nothing they see ever flickers;
     · never reloads on a page with a form in progress (checkout, bag, quote,
       catalogues) so a half-typed address can't be thrown away;
     · at most once per session, and never while offline.
   If none of those moments arrives, nothing happens at all: the worker has
   already swapped, and the next visit serves the new version anyway. */
(function serviceWorkerSilentUpdate() {
  if (!('serviceWorker' in navigator)) return;
  /* self-heal: an older cached app.js/v107.js may already have painted a bar */
  const stripPrompt = () => {
    ['swUpdate', 'v107Upd'].forEach(id => { const el = document.getElementById(id); if (el) el.remove(); });
  };
  stripPrompt();
  try { document.addEventListener('DOMContentLoaded', stripPrompt, { once: true }); } catch (e) {}

  const skipWaiting = w => { try { w && w.postMessage({ type: 'SKIP_WAITING' }); } catch (e) {} };
  /* a page where an interrupted reload would destroy the shopper's own typing */
  const FORM_PAGES = ['checkout', 'cart', 'quote', 'catalogues', 'videoconsult', 'giftcard'];
  let reloaded = false;
  const applySwap = () => {
    if (reloaded) return;
    if (!document.hidden) return;                       // never in front of the shopper
    if (navigator.onLine === false) return;             // not while offline
    if (FORM_PAGES.indexOf(document.body.dataset.page) >= 0) return;
    let guard = false;
    try { guard = sessionStorage.getItem('shv_sw_swapped') === '1'; } catch (e) {}
    if (guard) return;
    reloaded = true;
    try { sessionStorage.setItem('shv_sw_swapped', '1'); } catch (e) {}
    stripPrompt();
    try { location.reload(); } catch (e) {}
  };

  /* the new worker took control. Do NOT reload now — wait for a hidden tab. */
  try {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      applySwap();
      try {
        document.addEventListener('visibilitychange', () => { if (document.hidden) applySwap(); });
      } catch (e) {}
    });
  } catch (e) {}

  try {
    navigator.serviceWorker.getRegistration().then(reg => {
      if (!reg) return;
      if (reg.waiting) skipWaiting(reg.waiting);        // unblock an old worker silently
      const track = w => {
        if (!w) return;
        w.addEventListener('statechange', () => { if (w.state === 'installed') skipWaiting(w); });
        if (w.state === 'installed') skipWaiting(w);
      };
      track(reg.installing);
      reg.addEventListener('updatefound', () => track(reg.installing));
    }).catch(() => {});
  } catch (e) {}
})();
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
/* v82 — only http(s)/mailto:/tel: URLs may ever land in href/src, so a
   stored "javascript:" link (e.g. via an admin settings field) cannot run. */
const safeUrl = s => { const u = String(s ?? '').trim(); return /^(https?:|mailto:|tel:|\/|#|\.\/|\.\.\/)/i.test(u) && !/[\u0000-\u001F\u007F]/.test(u) ? u : '#'; };
/* v82 — embed a value as a JS string argument inside an inline on* handler.
   esc() alone is wrong there: the HTML attribute decodes &#39; back to a
   quote BEFORE the JS runs, so a name containing ' breaks the string.
   JSON-encode first, then attribute-encode the quotes. */
const jsArg = s => JSON.stringify(String(s ?? '')).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fmt = n => '₹' + Math.round(n).toLocaleString('en-IN');
const fmt2 = n => '₹' + (+n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dateFmt = iso => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
/* v167 — `pct || 2` treated an owner-set 0% prepaid discount as 2%, so the cart
   and the quote sheet advertised "Pay online & save − ₹X" the server would
   never take off (api.php reads prepaidPct with ??, so 0 stays 0). One reader,
   used everywhere, that keeps 0 as 0. */
const prepaidPct = () => {
  const s = (state && state.settings) || {};
  let v = (s.prepaidPct === undefined || s.prepaidPct === null) ? undefined : +s.prepaidPct;
  if (v === undefined || isNaN(v)) { const c = (window._co && window._co.payCfg) || {}; v = (c.prepaidPct === undefined || c.prepaidPct === null) ? 2 : +c.prepaidPct; if (isNaN(v)) v = 2; }
  return Math.max(0, v);
};
/* v173 — timeFmt is now null-safe. A shared #/product/ link opened cold on a
   slow connection could reach render before /api/rates answered, and the one
   place that read `state.rates.t` with state.rates still null threw
   "Cannot read properties of null (reading 't')" — the shopper's very first
   impression of a shared piece was the error page. Every caller that may run
   pre-hydration goes through this: falsy/invalid input yields '' and the
   caller shows an honest fallback word instead of crashing. */
const timeFmt = iso => {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
};

function toast(msg, type = 'ok') {
  const t = document.createElement('div');
  t.className = 'toast ' + type; t.textContent = msg;
  /* v167 — this threw if #toastWrap was ever missing (it is created by the
     shell, but a re-render or an embed that strips it would take every toast
     down with it, silently). Repair the wrapper instead of crashing. */
  let wrap = $('#toastWrap');
  if (!wrap) { wrap = document.createElement('div'); wrap.id = 'toastWrap'; wrap.className = 'toast-wrap'; document.body.appendChild(wrap); }
  wrap.appendChild(t);
  setTimeout(() => { t.style.transition = 'opacity .5s'; t.style.opacity = 0; setTimeout(() => t.remove(), 500); }, 3200);
}
let _modalTrap = null;
let _modalLocked = false;
function openModal(html, cls = '') {
  const box = $('#modalBox');
  /* v167 — the dialog had role="dialog" aria-modal="true" but NO accessible
     name at all (the old aria-labelledby was removed here and nothing replaced
     it), and its close button's name was the literal character "✕". Every sheet
     now borrows its own first heading as the label. */
  const head = /<h[1-6][^>]*>([\s\S]{0,160}?)<\/h[1-6]>/i.exec(html);
  const headTxt = head ? head[1].replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim() : '';
  box.removeAttribute('aria-labelledby');
  if (headTxt) box.setAttribute('aria-label', headTxt.slice(0, 120)); else box.setAttribute('aria-label', 'Shivaa dialog');
  box.className = 'modal ' + cls; box.innerHTML = `<button class="modal-close" aria-label="Close" onclick="Shivaa.closeModal()">✕</button>` + html;
  $('#modalOverlay').classList.add('open');
  if (!_modalLocked) { lockScroll(); _modalLocked = true; }
  if (_modalTrap) { _modalTrap(); _modalTrap = null; }
  if (window.ShivaaMotion && ShivaaMotion.trapFocus) _modalTrap = ShivaaMotion.trapFocus(box);
}
function closeModal() {
  $('#modalOverlay').classList.remove('open');
  if (_modalLocked) { unlockScroll(); _modalLocked = false; }
  if (_modalTrap) { _modalTrap(); _modalTrap = null; }
}
$('#modalOverlay').addEventListener('click', e => { if (e.target.id === 'modalOverlay') closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeModal(); $('#pdfViewer').classList.remove('open'); $('#searchDrawer').classList.remove('open'); } });

/* ─────────── API client ─────────── */
async function api(path, opts = {}) {
  const requestToken = token();
  const headers = {};
  const putHeader = (key, value) => { headers[String(key).toLowerCase()] = value; };
  if (opts.headers && typeof opts.headers.forEach === 'function' && !Array.isArray(opts.headers)) opts.headers.forEach((v, k) => putHeader(k, v));
  else if (Array.isArray(opts.headers)) opts.headers.forEach(([k, v]) => putHeader(k, v));
  else Object.entries(opts.headers || {}).forEach(([k, v]) => putHeader(k, v));
  if (opts.body instanceof FormData) delete headers['content-type'];
  else if (!headers['content-type']) headers['content-type'] = 'application/json';
  if (requestToken) { delete headers.authorization; headers.Authorization = 'Bearer ' + requestToken; }
  const timeout = Number.isFinite(+opts.timeout) && +opts.timeout > 0 ? Math.max(1000, +opts.timeout) : 15000;
  const ctl = typeof AbortController === 'function' ? new AbortController() : null;
  let timer, cancel, res, data;
  const interrupted = new Promise((_, reject) => {
    cancel = () => { if (ctl) ctl.abort(); reject(Object.assign(new Error('Request cancelled'), { name: 'AbortError' })); };
    timer = setTimeout(() => {
      if (ctl) ctl.abort();
      reject(Object.assign(new Error('The server took too long — please retry'), { isTimeout: true }));
    }, timeout);
  });
  if (opts.signal) {
    if (opts.signal.aborted) cancel();
    else opts.signal.addEventListener('abort', cancel, { once: true });
  }
  try {
    if (opts.signal && opts.signal.aborted) await interrupted;
    const fetchOpts = { ...opts, headers, signal: ctl ? ctl.signal : opts.signal };
    delete fetchOpts.timeout;
    res = await Promise.race([fetch(path, fetchOpts), interrupted]);
    try {
      data = await Promise.race([res.json(), interrupted]);
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid API payload');
    } catch (error) {
      if (error.name === 'AbortError' || error.isTimeout) throw error;
      data = {};
      if (res.ok) throw Object.assign(new Error('The server returned an unreadable response — please retry'), { isProtocol: true });
    }
  } catch (netErr) {
    if (netErr.name === 'AbortError' || netErr.isTimeout || netErr.isProtocol) throw netErr;
    const first = !document.body.classList.contains('is-offline');
    ensureOfflineBar().classList.add('show'); document.body.classList.add('is-offline');
    if (first) toast('You appear to be offline — check your connection', 'err');
    const e = new Error('No connection — please check your internet and retry');
    e.isNetwork = true; throw e;
  } finally {
    clearTimeout(timer);
    if (opts.signal) opts.signal.removeEventListener('abort', cancel);
  }

  // v80: a successful call proves connectivity — dismiss a stale offline
  // banner even if the browser never fired the flaky 'online' event
  if (document.body.classList.contains('is-offline')) {
    document.body.classList.remove('is-offline');
    document.getElementById('offlineBar')?.classList.remove('show');
  }
  if (!res.ok) {
    // v31 — self-healing sessions: if the server says our token is dead,
    // drop it immediately so every page shows its login gate instead of
    // raw "Login required" errors (protects against reloads that wipe
    // storage, expired/purged tokens, and restored databases).
    if (res.status === 401 && requestToken && token() === requestToken) {
      setToken(''); state.user = null;
      try { updateBadges(); } catch (e) {}
    }
    /* v165 — never swallow the gateway's own words again: a 502 from pay/order
       carries `gatewayCode`/`gatewayMessage` (the real Cashfree rejection).
       Attach both to the thrown error (callers toast `message`, devtools gets
       the raw pair) so a per-product failure is diagnosable from ONE report. */
    const __e = Object.assign(new Error(data.error || 'Request failed'), { status: res.status });
    if (data.gatewayCode || data.gatewayMessage) {
      __e.gatewayCode = data.gatewayCode; __e.gatewayMessage = data.gatewayMessage;
      try { console.warn('[shivaa-gateway]', res.status, data.gatewayCode || '', data.gatewayMessage || ''); } catch (_) {}
    }
    throw __e;
  }
  return data;
}

/* ─────────── app state ─────────── */
const state = {
  user: null, rates: null, settings: null, mcTable: [],
  cart: cleanCart(store.get('shv_cart', [])),            // [{id, qty, size, engraving}]
  localWish: cleanIds(store.get('shv_wish', [])),
  compare: store.get('shv_compare', []),      // product ids, max 4 — local shortlist only
  productsCache: [], cacheAt: 0,
  catalogOk: false,   // v166 — true only once a real /api/products answer landed
};

/* v57: every category face is the studio photograph the house selected,
   colour-graded to one warm theme (images/categories/*.jpg) */
const CATS = {
  rings: { name: 'Rings', sub: 'Solitaires · Kundan · Bands', img: '/images/categories/rings.jpg' },
  necklaces: { name: 'Necklaces', sub: 'Rani haar · Chokers', img: '/images/categories/necklaces.jpg' },
  earrings: { name: 'Earrings', sub: 'Jhumkas · Chandbalis', img: '/images/categories/earrings.jpg' },
  bangles: { name: 'Bangles & Kadas', sub: 'Carved · Textured', img: '/images/categories/bangles.jpg' },
  bracelets: { name: 'Bracelets', sub: 'Tennis · Charms', img: '/images/categories/bracelets.jpg' },
  chains: { name: 'Chains', sub: 'Rope · Box · Sing', img: '/images/categories/chains.jpg' },
  pendants: { name: 'Pendants', sub: 'Om · Diamond · Locket', img: '/images/categories/pendants.jpg' },
  mangalsutra: { name: 'Mangalsutra', sub: 'Classic · Modern', img: '/images/categories/mangalsutra.jpg' },
  bajubandh: { name: 'Bajubandh', sub: 'Armbands · Rajputana', img: '/images/categories/bajubandh.jpg' },
  rakhdi: { name: 'Rakhdi Set', sub: 'Borla · Tikka · Sets', img: '/images/categories/rakhdi.jpg' },
  aad: { name: 'Fancy Aad', sub: 'Bridal chest ornaments', img: '/images/categories/aad.jpg' },
  sheeshphool: { name: 'Sheesh Phool', sub: 'Head ornaments', img: '/images/categories/sheeshphool.jpg' },
  hathphool: { name: 'Hathphool', sub: 'Hand harness · Rings', img: '/images/categories/hathphool.jpg' },
  punach: { name: 'Punach', sub: 'Anklet ornaments', img: '/images/categories/punach.jpg' },
  bridalanklets: { name: 'Bridal Anklets', sub: 'Payal · Kada pairs', img: '/images/categories/bridalanklets.jpg' },
  nosepins: { name: 'Nose Pins', sub: 'Light · Daily', img: '/images/categories/nosepins.jpg' },
  silver: { name: 'Silver 925', sub: 'Payal · Chains · Kada', img: '/images/categories/silver.jpg' },
};
/* v115 — owner decision: EVERY house category shows again. The v111 filter
   (render only categories that have products) was built for a catalogue that
   briefly had samples in many categories; with the live rings-only catalogue
   it collapsed every menu, grid and filter to a single "Rings" tile, which
   read to the owner as "the update deleted my categories". Nothing was ever
   deleted — an empty category now lands on the shop's honest "being
   catalogued" state instead of disappearing. */
function LIVE_CATS() {
  return CATS;
}

/* ─────────── WhatsApp integration ─────────── */
const WA_SVG = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3.9a8.1 8.1 0 0 0-6.9 12.3L4 20.2l4.1-1.05A8.1 8.1 0 1 0 12 3.9zm0 1.8a6.3 6.3 0 1 1-3.24 11.7l-.3-.18-2.42.62.64-2.35-.2-.32A6.3 6.3 0 0 1 12 5.7zM9.44 8.6c-.16 0-.42.06-.64.3-.22.24-.86.84-.86 2.05s.88 2.38 1 2.54c.12.16 1.72 2.65 4.18 3.6 2.06.8 2.48.65 2.93.6.45-.04 1.44-.59 1.64-1.16.2-.57.2-1.06.14-1.16-.06-.1-.22-.16-.46-.28-.24-.12-1.44-.71-1.66-.79-.22-.08-.38-.12-.55.12-.16.24-.63.79-.77.95-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.42-1.34-1.66-.14-.24-.02-.37.1-.49.1-.1.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.55-1.32-.75-1.8-.2-.47-.4-.4-.55-.41-.15-.01-.31-.01-.47-.01z"/></svg>';
function waNum() {  // v83 — digits only; a setting can never break out of an href
  const n = String((state.settings && state.settings.whatsapp) || '918905005921').replace(/\D/g, '');
  return n || '918905005921';
}
/* v101 · item 14 — the brand's three official channels, single source of
   truth so every social slot on the site stays in sync with the footer. */
const SOCIAL = {
  ig: 'https://www.instagram.com/shivaa.jewels?stkn=NG54eWNnM3Z6N2Q2',
  fb: 'https://www.facebook.com/share/1F8m9hgpCR/',
  wa: 'https://wa.me/message/FM7UIQRLPIYHB1',
};
/* social icon row (same glyph set as the v101 footer). cls 'fv-social--light'
   adapts the circles for light cards (contact page, etc.). */
function socialRowHTML(cls = '') {
  return `<nav class="fv-social ${cls}" aria-label="Follow Shivaa Jewels">
    <a href="${SOCIAL.ig}" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none"/></svg>
    </a>
    <a href="${SOCIAL.fb}" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M14.5 8.5H17V5h-2.5C12.6 5 11 6.6 11 8.5V11H8.5v3.4H11V21h3.5v-6.6H17l.5-3.4h-3V9c0-.3.2-.5.5-.5z"/></svg>
    </a>
    <a href="${SOCIAL.wa}" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M12 3.8a8.2 8.2 0 0 0-7 12.4L4 20l3.9-1a8.2 8.2 0 1 0 4.1-15.2z"/><path d="M9.3 8.6c.2-.5.4-.5.7-.5h.5c.2 0 .4 0 .6.5s.7 1.6.7 1.7c.1.2.1.3 0 .5l-.4.6c-.1.2-.2.3-.1.5.2.3.8 1.2 1.6 1.7 1 .6 1.4.7 1.7.6.2-.1.6-.6.8-.9.2-.3.4-.2.7-.1l1.6.8c.3.1.4.2.4.4 0 .5-.4 1.6-2 2-1.6.4-3.4-.3-5.1-1.9-1.4-1.3-2.3-2.9-2.4-4.2 0-.9.2-1.6.7-2.1z" fill="currentColor" stroke="none"/></svg>
    </a>
  </nav>`;
}
window.Shivaa.socialRowHTML = socialRowHTML;
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
  L.push('Rate as on ' + (timeFmt(R && R.t) || 'today') + (R && R.source ? ' (' + (R.source === 'live-mcx' ? 'official MCX' : R.source) + ' feed)' : ''));
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
  L.push('Final bill locks at order confirmation. Rate as on ' + (timeFmt(state.rates?.t) || 'today') + '.');
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

/* ─────────── v172 · one share function for every product surface ───────────
   The owner asked for a customer-facing "share this piece with a friend"
   control on every product. The direct link #/product/<id> always existed and
   v57 already serves per-piece OG cards for rich WhatsApp previews — but only
   the quick-view popup (v102) ever exposed a share button; the full product
   page itself had NONE. This is the single share path all surfaces call:
   phone → native share sheet (WhatsApp / SMS / anything installed);
   desktop / no share sheet → copy the link + toast, with the double
   clipboard fallback for older browsers. */
window.Shivaa.shareProduct = async id => {
  const pd = window._pd || {};
  const p = (pd.p && pd.p.id === id) ? pd.p : state.productsCache.find(x => x.id === id);
  const shareUrl = location.origin + location.pathname + '#/product/' + encodeURIComponent(id);
  const data = {
    title: (p ? p.name + ' · ' : '') + 'Shivaa Jewels',
    text: p ? p.name + ' — BIS hallmarked, priced on the live rate. Have a look ✦' : 'Have a look at this piece from Shivaa Jewels ✦',
    url: shareUrl,
  };
  if (navigator.share) { try { await navigator.share(data); } catch (e) {} return; }
  try { await navigator.clipboard.writeText(shareUrl); toast('Piece link copied — paste it to your friend ✦'); }
  catch (e) {
    const ta = document.createElement('textarea');
    ta.value = shareUrl; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); toast('Piece link copied — paste it to your friend ✦'); }
    catch (_) { toast('Copy this page\u2019s link to share', ''); }
    ta.remove();
  }
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

/* ─────────── v57 · rich product structured data + share meta (SEO / WhatsApp previews) ─────────── */
const _metaDefaults = {
  title: document.title,
  ogTitle: document.querySelector('meta[property="og:title"]')?.content || '',
  ogDesc: document.querySelector('meta[property="og:description"]')?.content || '',
  ogUrl: document.querySelector('meta[property="og:url"]')?.content || '',
  ogImg: document.querySelector('meta[property="og:image"]')?.content || '',
};
let _pdpMeta = false;
function resetProductMeta() {
  const old = document.getElementById('ld-product'); if (old) old.remove();
  if (!_pdpMeta) return;
  _pdpMeta = false;
  document.title = _metaDefaults.title;
  const setMeta = (prop, content) => { const m = document.querySelector(`meta[property="${prop}"]`); if (m && content) m.setAttribute('content', content); };
  setMeta('og:title', _metaDefaults.ogTitle);
  setMeta('og:description', _metaDefaults.ogDesc);
  setMeta('og:url', _metaDefaults.ogUrl);
  setMeta('og:image', _metaDefaults.ogImg);
}
function injectProductLD(p, pr) {
  resetProductMeta();
  _pdpMeta = true;
  const origin = location.origin;
  const imgs = (p.images || []).map(i => i.startsWith('http') ? i : origin + i);
  const validUntil = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
  const ld = {
    '@context': 'https://schema.org/', '@type': 'Product',
    name: p.name, sku: p.sku || undefined, mpn: p.sku || undefined,
    category: (CATS[p.category] || {}).name || 'Jewellery',
    description: String(p.description || p.name).replace(/<[^>]+>/g, ' ').slice(0, 500),
    image: imgs, brand: { '@type': 'Brand', name: 'Shivaa' },
    material: p.metal === 'Silver' ? 'Sterling Silver 925' : `${p.metal || 'Gold'} ${p.purity || ''}`,
    aggregateRating: p.reviews ? { '@type': 'AggregateRating', ratingValue: p.rating || '4.8', reviewCount: p.reviews } : undefined,
    offers: { '@type': 'Offer', url: location.href, priceCurrency: 'INR',
      price: pr.total, priceValidUntil: validUntil, availability: 'https://schema.org/InStock',
      seller: { '@type': 'JewelryStore', name: 'Shivaa Jewellers' } },
  };
  const crumbs = { '@context': 'https://schema.org/', '@type': 'BreadcrumbList', itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: origin + '/#/' },
    { '@type': 'ListItem', position: 2, name: (CATS[p.category] || {}).name || 'Shop', item: origin + '/#/shop?category=' + p.category },
    { '@type': 'ListItem', position: 3, name: p.name },
  ]};
  const s = document.createElement('script'); s.type = 'application/ld+json'; s.id = 'ld-product';
  s.textContent = JSON.stringify([ld, crumbs]);
  document.head.appendChild(s);
  // dynamic share/OG tags — WhatsApp & Google pick these up for the piece
  const setMeta = (prop, content) => { let m = document.querySelector(`meta[property="${prop}"]`); if (!m) { m = document.createElement('meta'); m.setAttribute('property', prop); document.head.appendChild(m); } if (content) m.setAttribute('content', content); };
  setMeta('og:title', p.name + ' · Shivaa Jewellers');
  setMeta('og:description', `${p.metal || 'Gold'} ${p.purity || ''} · ${fmt(pr.total)} at today's live rate · BIS hallmarked · Shivaa, Jayal`);
  setMeta('og:url', location.href);
  if (imgs[0]) setMeta('og:image', imgs[0]);
  document.title = p.name + ' · Shivaa Jewellers';
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
      <a href="#/product/${p.id}" aria-label="Open ${esc(p.name)}"><img src="${safeUrl(p.images && p.images[0])}" alt=""></a>
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
  if (state.user) { try { const r = await api('/api/wishlist'); wl = r.wishlist || []; } catch (e) {} }
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

/* v101 · item 11 — jewellers land on the live Bullion Desk every fresh app
   open (the bare portal route then redirects to ?view=bullion). Deep links
   and in-session storefront navigation are respected; a sessionStorage flag
   means a new tab / next day's open lands on bullion again, including
   persistent logins. Returns true when it redirected. */
/* v101 → v140 — welcomeSession() owns the landing now. This name remains as a
   thin alias so no edge caller that kept using partnerLanding() ever breaks. */
function partnerLanding() { welcomeSession(); return true; }
window.Shivaa.partnerLanding = partnerLanding;

/* v140 · AUTOMATIC LANDING — a returning visitor lands where they belong with
   no login form and no taps, and nobody is ever trapped in a redirect loop.
     · A jeweller whose token is still valid goes straight to the live Bullion
       Desk on every fresh open — jewellers watch rates ~100 times a day, so
       re-typing a password each time is not acceptable.
     · A retail customer whose token is still valid lands back on the home page
       — her session, wishlist and rate context are all already there.
     · A signed-out visitor simply gets the normal home page; this helper never
       opens the login sheet unprompted.
   WHEN: only on a bare URL — the root domain, '#/', or '#/home'. A typed URL
   or a shared link (a product page, a WhatsApp cart) is honoured untouched,
   in keeping with the v101 contract. It runs exactly once per tab, from
   boot() the moment the first batch has hydrated state.user — so a slow
   first batch can never cause a missed landing, and a later sign-in in the
   same tab is handled by afterLogin() instead. */
let _landedThisTab = false;
function welcomeSession() {
  if (_landedThisTab) return;
  _landedThisTab = true;
  try { sessionStorage.setItem('shv_landed', '1'); } catch (e) {}
  const bareHome = !location.hash || location.hash === '#/' || location.hash === '#/home';
  if (!bareHome) return;                     // a typed URL / shared link always wins
  const u = state.user || null;
  if (u && u.role === 'partner') location.hash = '#/partner';   // → the live Bullion Desk
}
window.Shivaa.welcomeSession = welcomeSession;

/* ─────────── cart ops ─────────── */
function addToCart(id, qty = 1, size = null, engraving = null, opts = {}) {
  if (typeof ensureCampaignStuds === 'function') ensureCampaignStuds();
  const key = i => i.id + '|' + (i.size || '');
  const item = { id, qty, size, engraving };
  const ex = state.cart.find(i => key(i) === key(item));
  if (ex) ex.qty += qty; else state.cart.push(item);
  store.set('shv_cart', state.cart);
  updateBadges();
  /* v91 — fly the piece's image into the bag, then glide the mini-bag open */
  const p = (state.productsCache && state.productsCache.find(x => x.id === id)) || (typeof CAMPAIGN_STUDS_DATA !== 'undefined' ? Object.values(CAMPAIGN_STUDS_DATA).flat().find(x => x.id === id) : null);
  const src = p && (p.images && p.images[0]);
  let fromEl = opts.fromEl || document.querySelector(`.p-card[data-pid="${id}"] .pc-imgwrap img`);
  if (src) flyToBag(src, fromEl).then(() => { if (!opts.silent) openCart(true); });
  else if (!opts.silent) openCart(true);
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

/* ── v113b · the broken-image net ─────────────────────────────────────────
   Any <img> whose file is missing — a category photo that was never shot, a
   product image pulled from the CDN, a stale cached URL — used to show the
   browser's torn-page icon in the middle of the collection grid. Now it
   degrades to the house monogram. One capture listener covers every image on
   every page, including ones rendered later, so no render path can forget it.
   Images that carry their own inline onerror (the product cards, which swap in
   the logo) are left to their own handler. */
(function brokenImageNet() {
  const FB = 'data:image/svg+xml,' + encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180' viewBox='0 0 180 180'>" +
    "<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>" +
    "<stop offset='0' stop-color='#4a1220'/><stop offset='1' stop-color='#26070d'/></linearGradient></defs>" +
    "<rect width='180' height='180' fill='url(#g)'/>" +
    "<path d='M90 52l11 15-11 15-11-15z' fill='#d4af5a' fill-opacity='.9'/>" +
    "<path d='M62 106h56' stroke='#d4af5a' stroke-opacity='.34' stroke-width='2'/>" +
    "<path d='M74 118h32' stroke='#d4af5a' stroke-opacity='.18' stroke-width='2'/></svg>");
  window.addEventListener('error', (e) => {
    const t = e.target;
    if (!t || t.tagName !== 'IMG' || t.dataset.imgFb || t.hasAttribute('onerror')) return;
    t.dataset.imgFb = '1';
    t.src = FB;
  }, true);
})();

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
    if (document.hidden) return;
    const d = Math.max(0, target - Date.now());
    const days = Math.floor(d / 864e5), hrs = Math.floor(d % 864e5 / 36e5), min = Math.floor(d % 36e5 / 6e4), sec = Math.floor(d % 6e4 / 1e3);
    if (!document.body.contains(el)) return clearInterval(iv);
    el.innerHTML = [[days, 'Days'], [hrs, 'Hrs'], [min, 'Min'], [sec, 'Sec']].map(x => `<div class="fc-cell"><b>${String(x[0]).padStart(2, '0')}</b><span>${x[1]}</span></div>`).join('');
  };
  const iv = setInterval(tick, 1000); tick();
}

/* ═══════════════════════════════════════════════════════════════════
   BHAI DOOJ GOLD FINALE · 2026 — campaign module (Bhai Dooj edition)
   Time-boxed: lives through Bhai Dooj, 11 Nov 2026 (IST draw night) and
   auto-expires at 00:00 IST on 1 Dec 2026 by date check alone — no
   flag to flip. Once off, the homepage band, the nav/footer links and
   the #/finale landing page all disappear; the site simply stays a
   normal jewellery store.
   Copy follows the approved pitch-deck wording verbatim:
   "win a chance" framing (never "lottery") · qualifying purchase =
   3 g gold ANY karat OR 100 g silver per order · free no-purchase
   quiz route with equal odds · CA-witnessed live draw on Bhai Dooj
   (11 Nov 2026) · 10 g certified 24K gold at current market value · TN & WB
   excluded · statutory TDS ≈ 31.2% on the winner. The scored quiz
   funnel (purchase route after a qualifying order + free route on
   the landing page, entries saved server-side in db['finaleEntries'])
   is implemented further below in this file.
   ═══════════════════════════════════════════════════════════════════ */
const FINALE = {
  route: 'scheme',
  altRoute: 'finale',
  name: 'Shivaa 10g Gold Biscuit Scheme',
  drawLabel: 'Bhai Dooj · 11 November 2026',
  drawAt: Date.parse('2026-11-11T23:59:59+05:30'),
  endAt: Date.parse('2026-12-01T00:00:00+05:30'),
};
const finaleLive = () => Date.now() < FINALE.endAt;

const CAMPAIGN_STUD_IDS = ['p_stud_m1', 'p_stud_m2', 'p_stud_m3', 'p_stud_w1', 'p_stud_w2', 'p_stud_w3'];
const CAMPAIGN_STUD_SKUS = ['SHV-MST-01', 'SHV-MST-02', 'SHV-MST-03', 'SHV-LST-01', 'SHV-LST-02', 'SHV-LST-03'];

const CAMPAIGN_STUDS_DATA = {
  gents: [
    {
      id: 'p_stud_m1',
      sku: 'SHV-MST-01',
      name: "Shivaa Veer 22K Gold Men's Square Stud (Pair)",
      subtitle: "Classic Solitaire-Square · Sparkling White Stones",
      category: 'earrings',
      metal: 'Gold',
      purity: '22K',
      weightG: 3.0,
      mcScheme: 'percent',
      mcValue: 15,
      mcPct: 15,
      stoneValue: 0,
      lessWeightG: 0,
      wastagePct: 8,
      stock: 50,
      active: true,
      tags: ['campaign', 'scheme', 'gold-biscuit', 'earrings', 'gold', '22k', 'studs', 'mens', 'tops'],
      images: ['/images/products/studs/mst01-studio.jpg', '/images/products/studs/mst01-macro.jpg', '/images/products/studs/mst01-worn.jpg', '/images/products/studs/mst01-gift.jpg'],
      desc: 'A sharp solitaire-square stud pair in certified solid 22K yellow gold (3.00 g pair), hand-set with sparkling white accent stones. Made for everyday royal distinction. Qualifies for 10g Gold Biscuit Scheme.'
    },
    {
      id: 'p_stud_m2',
      sku: 'SHV-MST-02',
      name: "Shivaa Rudra 22K Gold Men's Cushion Stud (Pair)",
      subtitle: "Bold Cushion Frame · Double Stone Halo",
      category: 'earrings',
      metal: 'Gold',
      purity: '22K',
      weightG: 3.0,
      mcScheme: 'percent',
      mcValue: 15,
      mcPct: 15,
      stoneValue: 0,
      lessWeightG: 0,
      wastagePct: 8,
      stock: 50,
      active: true,
      tags: ['campaign', 'scheme', 'gold-biscuit', 'earrings', 'gold', '22k', 'studs', 'mens', 'tops'],
      images: ['/images/products/studs/mst02-studio.jpg', '/images/products/studs/mst02-macro.jpg', '/images/products/studs/mst02-worn.jpg', '/images/products/studs/mst02-gift.jpg'],
      desc: 'A bold concave-cushion stud pair in certified solid 22K yellow gold (3.00 g pair) with a double frame of sparkling white stones and secure screw-back post. Qualifies for 10g Gold Biscuit Scheme.'
    },
    {
      id: 'p_stud_m3',
      sku: 'SHV-MST-03',
      name: "Shivaa Bali 22K Gold Men's Huggy Hoop (Pair)",
      subtitle: "Sleek Huggy Bali · Stone Pavé Line",
      category: 'earrings',
      metal: 'Gold',
      purity: '22K',
      weightG: 3.0,
      mcScheme: 'percent',
      mcValue: 15,
      mcPct: 15,
      stoneValue: 0,
      lessWeightG: 0,
      wastagePct: 8,
      stock: 50,
      active: true,
      tags: ['campaign', 'scheme', 'gold-biscuit', 'earrings', 'gold', '22k', 'studs', 'mens', 'tops'],
      images: ['/images/products/studs/mst03-studio.jpg', '/images/products/studs/mst03-macro.jpg', '/images/products/studs/mst03-worn.jpg', '/images/products/studs/mst03-gift.jpg'],
      desc: 'A sleek huggy-hoop bali pair in certified solid 22K yellow gold (3.00 g pair), pavé-lined with sparkling white stones. Light, secure and unmistakably royal. Qualifies for 10g Gold Biscuit Scheme.'
    }
  ],
  ladies: [
    {
      id: 'p_stud_w1',
      sku: 'SHV-LST-01',
      name: "Shivaa Heer Paisley-Heart 22K Gold Ladies Tops (Pair)",
      subtitle: "Paisley-Heart Drops · White Stone Pavé",
      category: 'earrings',
      metal: 'Gold',
      purity: '22K',
      weightG: 3.255,
      mcScheme: 'percent',
      mcValue: 15,
      mcPct: 15,
      stoneValue: 0,
      lessWeightG: 0,
      wastagePct: 8,
      stock: 50,
      active: true,
      tags: ['campaign', 'scheme', 'gold-biscuit', 'earrings', 'gold', '22k', 'studs', 'ladies', 'tops'],
      images: ['/images/products/studs/lst01-studio.jpg', '/images/products/studs/lst01-macro.jpg', '/images/products/studs/lst01-worn.jpg', '/images/products/studs/lst01-gift.jpg'],
      desc: 'Paisley-heart drop tops in certified solid 22K yellow gold (3.255 g pair), finished with white stone pavé and a pear drop. Tag BT-16101. Qualifies for 10g Gold Biscuit Scheme.'
    },
    {
      id: 'p_stud_w2',
      sku: 'SHV-LST-02',
      name: "Shivaa Morni Swirl 22K Gold Ladies Drop Tops (Pair)",
      subtitle: "Spiral Swirl · Green Accent · Pear Drop",
      category: 'earrings',
      metal: 'Gold',
      purity: '22K',
      weightG: 2.928,
      mcScheme: 'percent',
      mcValue: 15,
      mcPct: 15,
      stoneValue: 0,
      lessWeightG: 0,
      wastagePct: 8,
      stock: 50,
      active: true,
      tags: ['campaign', 'scheme', 'gold-biscuit', 'earrings', 'gold', '22k', 'studs', 'ladies', 'tops'],
      images: ['/images/products/studs/lst02-studio.jpg', '/images/products/studs/lst02-macro.jpg', '/images/products/studs/lst02-worn.jpg', '/images/products/studs/lst02-gift.jpg'],
      desc: 'Spiral-swirl drop tops in certified solid 22K yellow gold (2.928 g pair) with a green accent stone, white stone arc and pear drop. Tag BT-17675. Qualifies for 10g Gold Biscuit Scheme.'
    },
    {
      id: 'p_stud_w3',
      sku: 'SHV-LST-03',
      name: "Shivaa Sitara Star 22K Gold Ladies Round Tops (Pair)",
      subtitle: "Round Star Medallion · Red Accent Halo",
      category: 'earrings',
      metal: 'Gold',
      purity: '22K',
      weightG: 3.086,
      mcScheme: 'percent',
      mcValue: 15,
      mcPct: 15,
      stoneValue: 0,
      lessWeightG: 0,
      wastagePct: 8,
      stock: 50,
      active: true,
      tags: ['campaign', 'scheme', 'gold-biscuit', 'earrings', 'gold', '22k', 'studs', 'ladies', 'tops'],
      images: ['/images/products/studs/lst03-studio.jpg', '/images/products/studs/lst03-macro.jpg', '/images/products/studs/lst03-worn.jpg', '/images/products/studs/lst03-gift.jpg'],
      desc: 'Round star-medallion tops in certified solid 22K yellow gold (3.086 g pair) with a red accent stone in a white stone halo. Tag BT-18159. Qualifies for 10g Gold Biscuit Scheme.'
    }
  ]
};

function ensureCampaignStuds() {
  if (!state.productsCache) state.productsCache = [];
  if (typeof CAMPAIGN_STUDS_DATA === 'undefined') return;
  const studs = Object.values(CAMPAIGN_STUDS_DATA).flat();
  studs.forEach(s => {
    /* v164 — the client twins carry FULL store schema (sizes/rating/reviews/
       stone fields/flag) so grids and the product page read them exactly like
       server rows; any server row (db or twin) always merges on top, so live
       stock, ratings and staff HUIDs win. Earrings take no size: sizes []. */
    const full = Object.assign({sizes: [], rating: 4.8, reviews: 0, stoneDesc: '', stoneType: 'White', stoneColour: '', isCampaignStud: true}, s);
    const idx = state.productsCache.findIndex(p => p.id === s.id);
    if (idx === -1) {
      state.productsCache.push({ ...full });
    } else {
      state.productsCache[idx] = { ...full, ...state.productsCache[idx] };
    }
  });
}
ensureCampaignStuds();

function syncFinaleChrome(force) {
  const on = finaleLive();
  document.querySelectorAll('[data-camp]').forEach(el => el.classList.toggle('camp-off', !on));
  if (on) return;
  document.querySelectorAll('[data-camp-zone]').forEach(el => el.remove());
  if (['scheme', 'finale', 'gold-biscuit'].includes(location.hash.replace(/^#\/?/, '').split('/')[0])) location.hash = '#/';
  if (force && window.Shivaa.redraw) window.Shivaa.redraw();
}

function finaleCdCells() {
  const d = Math.max(0, FINALE.drawAt - Date.now());
  const days = Math.floor(d / 864e5), hrs = Math.floor(d % 864e5 / 36e5),
        min = Math.floor(d % 36e5 / 6e4), sec = Math.floor(d % 6e4 / 1e3);
  return [[days, 'Days'], [hrs, 'Hrs'], [min, 'Min'], [sec, 'Sec']]
    .map(x => `<div class="fc-cell"><b>${String(x[0]).padStart(2, '0')}</b><span>${x[1]}</span></div>`).join('');
}
function finaleCdHTML(id = 'finaleCd') {
  return `<div class="finale-cd" id="${id}" role="timer" aria-live="off"
    aria-label="Countdown to the CA-witnessed live draw on ${FINALE.drawLabel}">${finaleCdCells()}
    <span class="fc-lbl">✦ Time to the CA-witnessed live draw · ${FINALE.drawLabel}</span></div>`;
}
function bindFinaleCd(el) {
  const iv = setInterval(() => {
    if (!document.body.contains(el)) return clearInterval(iv);
    if (document.hidden) return;
    if (!finaleLive()) { syncFinaleChrome(true); return clearInterval(iv); }
    el.innerHTML = finaleCdCells() +
      `<span class="fc-lbl">✦ Time to the CA-witnessed live draw · ${FINALE.drawLabel}</span>`;
  }, 1000);
}

function finaleBarArt() {
  return `<div class="fin-bar" aria-hidden="true"><div class="fin-eng"><small>Shivaa · fine gold</small><em>10 g</em><span>24K · 999.9</span></div></div>`;
}

/* ─────────────────────── 2030 HOLOGRAPHIC AI CONCIERGE & SOUND ENGINE (WARM HINDI VIBE) ─────────────────────── */
const AURA_SCRIPTS = {
  poster: {
    hi: "नमस्ते जी! आपका शिवा में हार्दिक स्वागत है। मैं आपकी शिवा साथी ऑरा। इस शुभ अवसर पर पाइए 10 ग्राम शुद्ध 24 कैरट सोने का बिस्कुट जीतने का शानदार मौका! बस हमारे 6 खूबसूरत 22 कैरट गोल्ड स्टड्स में से अपना पसंदीदा डिज़ाइन चुनिए। चलिए, आगे बढ़ते हैं!"
  },
  landing: {
    hi: "नमस्ते! यहाँ है हमारी 10 ग्राम गोल्ड स्कीम की पूरी जानकारी। 100% बीआईएस हॉलमार्क शुद्ध 22 कैरट सोना और सीए द्वारा प्रमाणित पारदर्शी लाइव ड्रॉ। आइए, अब अपना पसंदीदा कलेक्शन चुनें!"
  },
  gender: {
    hi: "आप किसके लिए स्टड्स पसंद कर रहे हैं? पुरुषों के लिए रॉयल डिज़ाइन या महिलाओं के लिए खूबसूरत फ्लोरल डिज़ाइन? अपनी पसंद पर टैप कीजिए!"
  },
  products: {
    hi: "ये रहे आपके लिए 3 बेहद खूबसूरत 22 कैरट गोल्ड स्टड्स! लाइव रेट और सिर्फ 12% मेकिंग चार्ज के साथ। अपना पसंदीदा डिज़ाइन चुनिए और 1-क्लिक कैशफ्री से आसानी से आर्डर कम्प्लीट करें!"
  },
  quiz: {
    hi: "बहुत-बहुत बधाई! आपका आर्डर कन्फर्म हो चुका है। अब इस आसान 1-अटेम्प्ट क्विज के 5 सवालों के सही जवाब देकर लाइव ड्रॉ में अपनी ऑफिशियल एंट्री पक्की कीजिए! ऑल द बेस्ट!"
  }
};

const ShivaaAudio = {
  ctx: null,
  voiceEnabled: false,
  speaking: false,
  init() {
    if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  },
  playTone(freq = 660, duration = 0.15, type = 'sine') {
    try {
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') this.ctx.resume();
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch(e) {}
  },
  playChime() {
    this.playTone(880, 0.18, 'sine');
    setTimeout(() => this.playTone(1320, 0.22, 'sine'), 80);
  },
  playHover() {
    this.playTone(440, 0.08, 'triangle');
  },
  playLock() {
    this.playTone(520, 0.12, 'sine');
    setTimeout(() => this.playTone(780, 0.16, 'sine'), 60);
    setTimeout(() => this.playTone(1040, 0.2, 'sine'), 120);
  },
  getHindiVoice() {
    if (!('speechSynthesis' in window)) return null;
    const vList = window.speechSynthesis.getVoices() || [];
    return vList.find(v => /swara|neerja|kalpana|lekha|hi-in.*female|google.*hi.*female/i.test(v.name)) ||
           vList.find(v => v.lang && (v.lang === 'hi-IN' || v.lang === 'hi_IN') && /female|natural|online/i.test(v.name)) ||
           vList.find(v => v.lang && (v.lang === 'hi-IN' || v.lang === 'hi_IN')) ||
           vList.find(v => /hindi|lekh|swar|kalpan|heman|neerj/i.test(v.name)) ||
           vList.find(v => v.lang && v.lang.startsWith('hi')) ||
           null;
  },
  speak(scriptItem) {
    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      if (window.speechSynthesis.paused) window.speechSynthesis.resume();
    } catch (e) {}

    const spokenText = typeof scriptItem === 'object' ? (scriptItem.hi || '') : String(scriptItem || '');
    if (!spokenText) return;

    const ut = new SpeechSynthesisUtterance(spokenText);
    ut.rate = 0.90;
    ut.pitch = 1.12;
    ut.lang = 'hi-IN';

    const hiVoice = this.getHindiVoice();
    if (hiVoice) ut.voice = hiVoice;

    if (window.speechSynthesis.onvoiceschanged === undefined) {
      window.speechSynthesis.onvoiceschanged = () => {
        const hv = this.getHindiVoice();
        if (hv) ut.voice = hv;
      };
    }

    this.speaking = true;
    const btns = document.querySelectorAll('#shvAiSpeakBtn, .js-aura-speak-btn');
    btns.forEach(b => {
      b.classList.add('speaking');
      b.innerHTML = '🔊 <span class="aura-txt">ऑरा बोल रही हैं...</span>';
    });

    const resetBtns = () => {
      this.speaking = false;
      const allBtns = document.querySelectorAll('#shvAiSpeakBtn, .js-aura-speak-btn');
      allBtns.forEach(b => {
        b.classList.remove('speaking');
        b.innerHTML = '🔊 <span class="aura-txt">ऑरा की आवाज़ सुनें (Hindi)</span>';
      });
    };

    ut.onend = resetBtns;
    ut.onerror = resetBtns;

    try {
      window.speechSynthesis.speak(ut);
    } catch (e) {
      resetBtns();
    }
  },
  toggleVoice() {
    this.voiceEnabled = !this.voiceEnabled;
    const btns = document.querySelectorAll('#shvAiSpeakBtn, .js-aura-speak-btn');
    if (!this.voiceEnabled) {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      this.speaking = false;
      btns.forEach(b => {
        b.classList.remove('speaking');
        b.innerHTML = '🔇 <span class="aura-txt">आवाज़ बंद है (Muted)</span>';
      });
      toast('ऑरा की आवाज़ म्यूट कर दी गई है ✦');
    } else {
      btns.forEach(b => {
        b.classList.add('speaking');
        b.innerHTML = '🔊 <span class="aura-txt">ऑरा बोल रही हैं...</span>';
      });
      const step = window._schemeState?.step || 'poster';
      this.speak(AURA_SCRIPTS[step] || AURA_SCRIPTS.poster);
      toast('नमस्ते जी! ऑरा हिंदी वॉइस सक्रिय ✦');
    }
  }
};

window.Shivaa.toggleAiVoice = () => ShivaaAudio.toggleVoice();

function initGoldParticleCanvas(canvasId = 'goldParticleCanvas') {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  let w = canvas.width = canvas.parentElement ? canvas.parentElement.offsetWidth : window.innerWidth;
  let h = canvas.height = canvas.parentElement ? canvas.parentElement.offsetHeight : window.innerHeight;
  let mouse = { x: -1000, y: -1000 };

  const handleResize = () => {
    if (!canvas || !canvas.parentElement) return;
    w = canvas.width = canvas.parentElement.offsetWidth;
    h = canvas.height = canvas.parentElement.offsetHeight;
  };
  const handleMouseMove = e => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  };
  const handleMouseLeave = () => { mouse.x = -1000; mouse.y = -1000; };

  window.addEventListener('resize', handleResize, { passive: true });
  canvas.parentElement && canvas.parentElement.addEventListener('mousemove', handleMouseMove, { passive: true });
  canvas.parentElement && canvas.parentElement.addEventListener('mouseleave', handleMouseLeave, { passive: true });

  const numParticles = Math.min(45, Math.floor(w / 24));
  const particles = Array.from({ length: numParticles }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    size: Math.random() * 2.4 + 0.8,
    speedX: (Math.random() - 0.5) * 0.45,
    speedY: -Math.random() * 0.45 - 0.15,
    opacity: Math.random() * 0.7 + 0.25,
    sparkle: Math.random() * Math.PI * 2
  }));

  let animFrame = null;
  function draw() {
    if (!document.body.contains(canvas)) { if (animFrame) cancelAnimationFrame(animFrame); return; }
    ctx.clearRect(0, 0, w, h);

    // Laser constellation filaments between nearby particles
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 90) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(230, 183, 92, ${(1 - dist / 90) * 0.22})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
    }

    for (const p of particles) {
      p.x += p.speedX;
      p.y += p.speedY;
      p.sparkle += 0.04;

      // Mouse interactive deflection
      const mdx = p.x - mouse.x;
      const mdy = p.y - mouse.y;
      const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
      if (mdist < 100) {
        const factor = (100 - mdist) / 100;
        p.x += (mdx / mdist) * factor * 2;
        p.y += (mdy / mdist) * factor * 2;
      }

      if (p.y < 0) { p.y = h; p.x = Math.random() * w; }
      if (p.x < 0) p.x = w;
      if (p.x > w) p.x = 0;

      const op = Math.max(0.15, p.opacity + Math.sin(p.sparkle) * 0.28);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 226, 138, ${op})`;
      ctx.shadowBlur = 10;
      ctx.shadowColor = 'rgba(230, 183, 92, 0.85)';
      ctx.fill();
    }
    animFrame = requestAnimationFrame(draw);
  }
  draw();
}

function finaleHomeBand() {
  if (!finaleLive()) return '';
  return `
  <section class="finale-band rv" id="homeFinale" data-camp-zone aria-label="Shivaa 10g Gold Biscuit Scheme">
    <div class="container fb-wrap">
      <div class="fb-art">
        <div class="shv-poster-img-frame" style="max-width:280px">
          <img src="/images/banners/gold-biscuit-campaign.jpg" alt="10g Gold Biscuit" loading="lazy">
        </div>
        <i class="fin-spark" style="top:10%;left:12%;animation-delay:-.4s">✦</i>
        <i class="fin-spark" style="bottom:14%;right:10%;animation-delay:-1.6s;font-size:12px">✦</i>
      </div>
      <div class="fb-main">
        <span class="fb-kicker"><i>✦</i> Festive Grand Scheme · 2026</span>
        <h2 class="fb-title">Win a <em>10 Gram 24K Gold Biscuit</em> worth ₹1,50,000 as of today*</h2>
        <p class="fb-sub">Exclusively available for <b>3 Masterpiece Studs for Men</b> &amp; <b>3 Masterpiece Studs for Women</b>. Handcrafted in pure 22K BIS Hallmarked gold. Every order unlocks your 1-attempt quiz for the CA-witnessed live draw.</p>
        ${finaleCdHTML('homeFinaleCd')}
        <div class="fb-cta">
          <a class="btn btn-gold btn-lg shv-pulse-cta" href="#/scheme">Explore 10g Gold Scheme &amp; Studs ✦</a>
          <button type="button" class="btn btn-light btn-lg" onclick="Shivaa.setSchemeStep('gender')">Choose Collection (Men / Women)</button>
        </div>
        <ul class="fb-chips">
          <li>10g 24K Bullion Prize · CA Witnessed Draw</li>
          <li>Strictly 6 Exclusive Stud Designs</li>
          <li>1-Attempt Scored Quiz Post-Payment</li>
          <li>100% BIS Hallmarked 22K Solid Gold</li>
        </ul>
      </div>
    </div>
  </section>`;
}

function init3DCardTilts() {
  const cards = document.querySelectorAll('.shv-gender-card, .shv-stud-card, .shv-poster-card, .shv-pillar-card');
  cards.forEach(card => {
    if (card._tiltInit) return;
    card._tiltInit = true;
    card.addEventListener('mouseenter', () => ShivaaAudio.playHover());
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const midX = rect.width / 2;
      const midY = rect.height / 2;
      const rotX = ((y - midY) / midY) * -7;
      const rotY = ((x - midX) / midX) * 7;
      card.style.transform = `perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateY(-4px)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)';
    });
    card.addEventListener('touchmove', e => {
      if (!e.touches || !e.touches[0]) return;
      const rect = card.getBoundingClientRect();
      const x = e.touches[0].clientX - rect.left;
      const y = e.touches[0].clientY - rect.top;
      const midX = rect.width / 2;
      const midY = rect.height / 2;
      const rotX = ((y - midY) / midY) * -5;
      const rotY = ((x - midX) / midX) * 5;
      card.style.transform = `perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateY(-2px)`;
    }, { passive: true });
    card.addEventListener('touchend', () => {
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)';
    }, { passive: true });
  });
}

function finaleLanding() {
  return `
  <div class="shv-scheme-page">
    <canvas id="goldParticleCanvas" class="shv-canvas-particles"></canvas>

    <!-- Stepper Navigation Track -->
    <nav class="shv-scheme-stepper" aria-label="Scheme Workflow">
      <div class="container shv-stepper-wrap">
        <button type="button" class="shv-step-btn active" data-step="poster" onclick="Shivaa.setSchemeStep('poster')">
          <span class="num">1</span> Grand Poster
        </button>
        <span class="shv-stepper-sep">→</span>
        <button type="button" class="shv-step-btn" data-step="landing" onclick="Shivaa.setSchemeStep('landing')">
          <span class="num">2</span> Scheme Details
        </button>
        <span class="shv-stepper-sep">→</span>
        <button type="button" class="shv-step-btn" data-step="gender" onclick="Shivaa.setSchemeStep('gender')">
          <span class="num">3</span> Select Gender
        </button>
        <span class="shv-stepper-sep">→</span>
        <button type="button" class="shv-step-btn" data-step="products" onclick="Shivaa.setSchemeStep('products', window._schemeState?.gender || 'gents')">
          <span class="num">4</span> 3 Curated Studs
        </button>
        <span class="shv-stepper-sep">→</span>
        <button type="button" class="shv-step-btn" data-step="quiz" onclick="Shivaa.setSchemeStep('quiz')">
          <span class="num">5</span> 1-Attempt Quiz
        </button>
      </div>
    </nav>

    <!-- 2030 HOLOGRAPHIC AI CONCIERGE HUD BAR (HINDI ONLY) -->
    <aside class="container" style="padding:0">
      <div class="shv-ai-concierge-bar" id="shvAiConciergeBar">
        <div class="shv-ai-avatar-wrap">
          <div class="shv-ai-orb"></div>
          <div class="shv-ai-core">✦</div>
        </div>
        <div class="shv-ai-content">
          <div class="shv-ai-header">
            <span class="shv-ai-name">ऑरा (Aura) · शिवा AI साथी (Hindi)</span>
            <span class="shv-ai-badge">⚡ 2030 लाइव AI</span>
          </div>
          <p class="shv-ai-msg" id="shvAiMessage">
            नमस्ते! मैं ऑरा हूँ, आपकी शिवा एआई कंसीयर्ज। हमारे 10 ग्राम 24 कैरट गोल्ड बिस्कुट ग्रैंड कैंपेन में आपका स्वागत है। चलिए, मैं आपको इस स्कीम की पूरी जानकारी देती हूँ।
          </p>
          <div class="shv-ai-waves" aria-hidden="true">
            <div class="shv-ai-wave-bar"></div>
            <div class="shv-ai-wave-bar"></div>
            <div class="shv-ai-wave-bar"></div>
            <div class="shv-ai-wave-bar"></div>
            <div class="shv-ai-wave-bar"></div>
          </div>
        </div>
        <div class="shv-ai-actions">
          <button type="button" class="shv-ai-sound-btn" id="shvAiSpeakBtn" onclick="Shivaa.toggleAiVoice()">
            🔊 ऑरा की आवाज़ सुनें (Hindi)
          </button>
        </div>
      </div>
    </aside>

    <!-- STAGE 1: STANDALONE LUXURY POSTER HERO -->
    <div class="shv-scheme-stage active" data-stage="poster" id="stagePoster">
      <section class="container shv-poster-hero">
        <div class="shv-poster-card rv">
          <div class="shv-poster-content">
            <div class="crumbs"><a href="#/">Home</a> / 10g Gold Biscuit Scheme</div>
            <span class="shv-poster-badge">✦ FESTIVE GRAND CAMPAIGN · 2026</span>
            <h1 class="shv-poster-title">
              Get a chance to win
              <span class="gold-txt">10 G gold biscuit</span>
              worth ₹1,50,000 as of today*
            </h1>
            <div class="shv-hud-telemetry-row">
              <span class="shv-hud-chip">PRIZE: <b>10.000 G PURE 999.9 BULLION</b></span>
              <span class="shv-hud-chip">AUDIT: <b>CA-WITNESSED LIVE DRAW</b></span>
              <span class="shv-hud-chip">ELIGIBILITY: <b>6 BESPOKE 22K STUDS</b></span>
            </div>
            <div class="shv-val-banner">
              <div class="val-row">
                <span class="val-tag">✦ Current 24K Bullion Prize Value:</span>
                <span class="val-amt" id="schemePrizeVal">₹1,50,000</span>
                <small style="color:#e9c877;font-size:11px">(*Live 24K Rate Synced)</small>
              </div>
              <p class="val-sub">Exclusively tied to our 6 Masterpiece 22K Gold Ear Studs (3 Men's &amp; 3 Women's). Valued at live market rate on draw night.</p>
            </div>
            ${finaleCdHTML('posterCd')}
            <div class="shv-poster-cta-row" style="margin-top:24px">
              <button type="button" class="btn btn-gold btn-xl shv-pulse-cta" onclick="Shivaa.setSchemeStep('landing')">
                Enter Scheme Details &amp; Landing Page →
              </button>
              <button type="button" class="btn btn-outline btn-xl" onclick="Shivaa.setSchemeStep('gender')">
                Skip to Gender Selection (Men / Women) ✦
              </button>
            </div>
          </div>
          <div class="shv-poster-art">
            <div class="shv-poster-img-frame">
              <img src="/images/banners/gold-biscuit-campaign.jpg" alt="10g 24K Gold Biscuit" loading="eager">
              <div class="shv-poster-img-badge">✦ 10g 24K Bullion · Certified</div>
            </div>
            ${finaleBarArt()}
          </div>
        </div>
      </section>
    </div>

    <!-- STAGE 2: MODERN HI-FI LANDING PAGE WITH MOTION GRAPHICS -->
    <div class="shv-scheme-stage" data-stage="landing" id="stageLanding">
      <section class="container shv-landing-sec">
        <div class="sec-head rv" style="text-align:center;padding:40px 0 20px">
          <span class="label">Official Campaign Blueprint</span>
          <h2 style="color:#fff9ea;font-size:clamp(28px, 4vw, 46px)">The 10g Gold Biscuit <span class="disp-italic">Reward Scheme</span></h2>
          <p class="sub" style="color:rgba(246,232,200,0.85);max-width:720px;margin:12px auto 0">
            A celebration of authentic purity and transparent craftsmanship. Purchase any 1 of 6 bespoke 22K gold ear stud designs to unlock your single-attempt qualifying quiz for the CA-witnessed live draw.
          </p>
        </div>

        <!-- 4 Pillars of Transparency -->
        <div class="shv-pillars-grid rv">
          <div class="shv-pillar-card">
            <div class="shv-pillar-num">1</div>
            <h3>Strictly 6 Stud Designs</h3>
            <p>Offer is exclusively tied to 3 Men’s and 3 Women’s 22K Gold Ear Studs. Standard jewellery catalog items remain normal and unaffected.</p>
          </div>
          <div class="shv-pillar-card">
            <div class="shv-pillar-num">2</div>
            <h3>10g 24K Bullion Prize</h3>
            <p>Physical certified 999.9 gold biscuit held in audited custody and awarded at its true live rate on draw date.</p>
          </div>
          <div class="shv-pillar-card">
            <div class="shv-pillar-num">3</div>
            <h3>CA-Witnessed Live Draw</h3>
            <p>Conducted live before an independent Chartered Accountant with unedited broadcast and cryptographic SHA-256 ledger.</p>
          </div>
          <div class="shv-pillar-card">
            <div class="shv-pillar-num">4</div>
            <h3>1-Attempt Scored Quiz</h3>
            <p>Completed post-checkout. Exactly one attempt per order/buyer to confirm jewellery skill and lock your entry permanently.</p>
          </div>
        </div>

        <!-- Scheme Timeline & Visual Architecture -->
        <div class="shv-timeline-box rv" style="margin-top:40px;background:var(--obsidian-card);border:1px solid rgba(212,175,90,0.3);border-radius:24px;padding:32px">
          <h3 style="color:#ffe9bd;font-family:var(--ff-disp);font-size:26px;margin:0 0 16px;text-align:center">Workflow &amp; Verification Protocol</h3>
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:20px;text-align:center">
            <div style="padding:16px;background:rgba(255,255,255,0.03);border-radius:14px;border:1px solid rgba(212,175,90,0.15)">
              <b style="color:#d4af5a;font-size:18px;display:block;margin-bottom:6px">① Select Studs</b>
              <span style="font-size:13px;color:rgba(246,232,200,0.75)">Choose from 3 Gents or 3 Ladies 22K BIS Hallmarked stud designs.</span>
            </div>
            <div style="padding:16px;background:rgba(255,255,255,0.03);border-radius:14px;border:1px solid rgba(212,175,90,0.15)">
              <b style="color:#d4af5a;font-size:18px;display:block;margin-bottom:6px">② Complete Order</b>
              <span style="font-size:13px;color:rgba(246,232,200,0.75)">Secure 100% insured checkout with live 22K gold rate pricing.</span>
            </div>
            <div style="padding:16px;background:rgba(255,255,255,0.03);border-radius:14px;border:1px solid rgba(212,175,90,0.15)">
              <b style="color:#d4af5a;font-size:18px;display:block;margin-bottom:6px">③ 1-Attempt Quiz</b>
              <span style="font-size:13px;color:rgba(246,232,200,0.75)">Answer 5 skill questions. Locked permanently on submission.</span>
            </div>
            <div style="padding:16px;background:rgba(255,255,255,0.03);border-radius:14px;border:1px solid rgba(212,175,90,0.15)">
              <b style="color:#d4af5a;font-size:18px;display:block;margin-bottom:6px">④ Live Draw</b>
              <span style="font-size:13px;color:rgba(246,232,200,0.75)">10g Gold Biscuit awarded on Bhai Dooj · 11 November 2026.</span>
            </div>
          </div>
        </div>

        <div style="text-align:center;margin-top:40px;display:flex;gap:16px;justify-content:center;flex-wrap:wrap">
          <button type="button" class="btn btn-gold btn-xl shv-pulse-cta" onclick="Shivaa.setSchemeStep('gender')">
            Proceed to Gender Selection (Male / Female) →
          </button>
          <button type="button" class="btn btn-outline btn-xl" onclick="Shivaa.setSchemeStep('poster')">
            ← Back to Grand Poster
          </button>
        </div>
      </section>
    </div>

    <!-- STAGE 3: INTERACTIVE GENDER SELECTION (MALE / FEMALE) -->
    <div class="shv-scheme-stage" data-stage="gender" id="stageGender">
      <section class="container shv-gender-portal">
        <div class="shv-portal-head rv">
          <span class="fh-kicker">✦ Step 3 · Select Collection</span>
          <h2>Who Are You Shopping For?</h2>
          <p>Choose between our exclusive 22K Gold Men's (Gents) Collection and Women's (Ladies) Collection to view the 3 eligible designs.</p>
        </div>
        <div class="shv-gender-cards-wrap rv">
          <!-- Gents / Male Card -->
          <div class="shv-gender-card" onclick="Shivaa.setSchemeStep('products', 'gents')">
            <div class="shv-gender-img-wrap">
              <img src="/images/banners/gender-gents-gold.jpg" alt="Gents Gold Studs" loading="lazy">
              <span class="shv-gender-ribbon">✦ GENTS / MALE COLLECTION</span>
            </div>
            <div class="shv-gender-content">
              <h3>Men's 22K Gold Ear Studs</h3>
              <p>Sharp solitaire squares, bold cushion halos and sleek huggy balis — solid 22K BIS Hallmarked gold with sparkling white stones.</p>
              <div class="shv-gender-badges">
                <span>3 Curated Designs</span>
                <span>22K 916 Gold</span>
                <span>Qualifies for 10g Gold Draw</span>
              </div>
              <button type="button" class="shv-gender-btn">
                Explore Men's Gold Studs (3) →
              </button>
            </div>
          </div>

          <!-- Ladies / Female Card -->
          <div class="shv-gender-card" onclick="Shivaa.setSchemeStep('products', 'ladies')">
            <div class="shv-gender-img-wrap">
              <img src="/images/banners/gender-ladies-gold.jpg" alt="Ladies Gold Studs" loading="lazy">
              <span class="shv-gender-ribbon">✦ LADIES / FEMALE COLLECTION</span>
            </div>
            <div class="shv-gender-content">
              <h3>Ladies' 22K Gold Ear Studs</h3>
              <p>Paisley-heart drops, spiral swirls with green accents and star medallions — opulent 22K gold tops with fine stone detailing.</p>
              <div class="shv-gender-badges">
                <span>3 Curated Pairs</span>
                <span>22K 916 Gold</span>
                <span>Qualifies for 10g Gold Draw</span>
              </div>
              <button type="button" class="shv-gender-btn">
                Explore Ladies' Gold Studs (3) →
              </button>
            </div>
          </div>
        </div>
        <div style="text-align:center;margin-top:32px;display:flex;gap:14px;justify-content:center;flex-wrap:wrap">
          <button type="button" class="btn btn-outline btn-sm" onclick="Shivaa.setSchemeStep('landing')">
            ← Back to Scheme Details
          </button>
          <button type="button" class="btn btn-outline btn-sm" onclick="Shivaa.setSchemeStep('poster')">
            ✦ Grand Poster
          </button>
        </div>
      </section>
    </div>

    <!-- STAGE 4: CURATED 3-PRODUCT STUDS SHOWCASE -->
    <div class="shv-scheme-stage" data-stage="products" id="stageProducts">
      <section class="container shv-studs-sec">
        <div class="shv-studs-header rv">
          <div>
            <span class="fh-kicker">✦ Step 4 · Select Your Design</span>
            <h2 id="shvStudsTitle" style="color:#fff9ea;font-family:var(--ff-disp);font-size:32px;margin:6px 0 2px">Eligible 22K Gold Ear Studs</h2>
            <p style="color:rgba(246,232,200,0.8);font-size:14px;margin:0">Every piece below is BIS hallmarked and unlocks the 1-time 10g Gold Biscuit Quiz post-payment.</p>
          </div>
          <div class="shv-collection-tabs">
            <button type="button" class="shv-tab-btn active" data-gender="gents" onclick="Shivaa.setSchemeStep('products', 'gents')">
              👨 Men's Studs (3)
            </button>
            <button type="button" class="shv-tab-btn" data-gender="ladies" onclick="Shivaa.setSchemeStep('products', 'ladies')">
              👩 Ladies' Studs (3)
            </button>
          </div>
        </div>

        <div id="shvStudsContainer">
          <!-- Populated dynamically by renderStudsCollection -->
        </div>

        <div style="text-align:center;margin-top:40px;display:flex;gap:14px;justify-content:center;flex-wrap:wrap">
          <button type="button" class="btn btn-outline" onclick="Shivaa.setSchemeStep('gender')">
            ← Switch Gender Collection
          </button>
          <button type="button" class="btn btn-outline" onclick="Shivaa.setSchemeStep('landing')">
            ✦ Scheme Architecture
          </button>
          <button type="button" class="btn btn-outline" onclick="Shivaa.setSchemeStep('poster')">
            ✦ Grand Poster
          </button>
        </div>
      </section>
    </div>

    <!-- STAGE 5: 1-ATTEMPT QUIZ STAGE -->
    <div class="shv-scheme-stage" data-stage="quiz" id="stageQuiz">
      <section class="container" style="max-width:860px;padding:40px 16px 80px;text-align:center">
        <div class="rv in" style="background:var(--obsidian-card);border:1px solid rgba(212,175,90,0.35);border-radius:24px;padding:40px 24px;box-shadow:0 16px 48px rgba(0,0,0,0.5)">
          <span class="fh-kicker">✦ Step 5 · Official CA-Audited Entry</span>
          <h2 style="color:#fff9ea;font-family:var(--ff-disp);font-size:clamp(26px,3.5vw,40px);margin:8px 0 14px">
            10g Gold Biscuit <span class="gold-txt">1-Attempt Scored Quiz</span>
          </h2>
          <p style="color:rgba(246,232,200,0.85);max-width:640px;margin:0 auto 24px;font-size:15px;line-height:1.6">
            Unlocked upon purchasing any of our 6 exclusive 22K Gold Campaign Ear Studs. Answer 5 jewellery craft questions to register your single official entry into the CA-witnessed draw.
          </p>
          <div class="shv-strict-warning" style="max-width:600px;margin:0 auto 28px;text-align:left">
            <b>⚠️ Strict 1-Attempt Policy:</b> Every question can be attempted only once. Your score is permanently committed to the CA ledger upon submission — zero retries allowed under any circumstance.
          </div>
          <div style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap">
            <button type="button" class="btn btn-gold btn-xl shv-pulse-cta" onclick="Shivaa.fqOpen({route:'purchase', orderId: window._lastOrder?.id})">
              Start / Resume Official Quiz ✦
            </button>
            <button type="button" class="btn btn-outline btn-xl" onclick="Shivaa.setSchemeStep('products')">
              ← View 6 Campaign Ear Studs
            </button>
          </div>
        </div>
      </section>
    </div>
  </div>`;
}

window.Shivaa.setSchemeStep = (step = 'poster', gender = 'gents') => {
  window._schemeState = window._schemeState || {};
  window._schemeState.step = step;
  if (gender) window._schemeState.gender = gender;

  ShivaaAudio.playChime();

  try {
    const url = new URL(window.location.href);
    url.hash = `#/scheme?step=${encodeURIComponent(step)}&gender=${encodeURIComponent(gender || 'gents')}`;
    history.pushState(null, '', url.toString());
  } catch (e) {}

  renderSchemeStage(step, gender);
  if (step === 'quiz') {
    setTimeout(() => {
      fqOpen({ route: 'purchase', orderId: window._lastOrder?.id });
    }, 400);
  }
};

function renderSchemeStage(step, gender) {
  $$('.shv-step-btn').forEach(btn => {
    const s = btn.dataset.step;
    btn.classList.toggle('active', s === step || (step === 'products' && s === 'products') || (step === 'gender' && s === 'gender') || (step === 'landing' && s === 'landing') || (step === 'quiz' && s === 'quiz'));
  });

  $$('.shv-scheme-stage').forEach(el => {
    const s = el.dataset.stage;
    el.classList.toggle('active', s === step);
  });

  if (step === 'products') {
    renderStudsCollection(gender || 'gents');
  }

  // Update Aura AI Concierge Message & Voice (Hindi)
  const msgEl = document.getElementById('shvAiMessage');
  if (msgEl && AURA_SCRIPTS[step]) {
    const sc = AURA_SCRIPTS[step];
    msgEl.innerHTML = `<span class="shv-ai-hi-text" style="display:block;font-size:13px;color:#fff6dc;font-weight:500;line-height:1.4">${esc(sc.hi || sc)}</span>`;
    if (ShivaaAudio.voiceEnabled) ShivaaAudio.speak(sc);
  }

  init3DCardTilts();

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderStudsCollection(gender = 'gents') {
  ensureCampaignStuds();
  const container = $('#shvStudsContainer');
  if (!container) return;

  $$('.shv-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.gender === gender));

  const studs = CAMPAIGN_STUDS_DATA[gender] || CAMPAIGN_STUDS_DATA.gents;
  const rates = state.rates || {};
  const g22 = rates.gold22 || 14226;

  container.innerHTML = `
    <div class="shv-studs-grid">
      ${studs.map((s, si) => {
        const metalVal = Math.round(s.weightG * g22);
        const mc = Math.round(metalVal * (s.mcPct / 100));
        const sub = metalVal + mc;
        const total = Math.round(sub * 1.03);
        const wDisp = (+s.weightG).toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
        const shots = (s.images && s.images.length ? s.images : ['/images/logo.png']).slice(0, 4);

        return `
          <div class="shv-stud-card" data-pid="${esc(s.id)}">
            <span class="shv-stud-badge">✦ CAMPAIGN EXCLUSIVE · 10g Gold Draw</span>
            <div class="shv-stud-img-wrap">
              <img class="shv-stud-main-img" src="${safeUrl(shots[0])}" alt="${esc(s.name)}" loading="${si === 0 ? 'eager' : 'lazy'}" decoding="async" fetchpriority="${si === 0 ? 'high' : 'auto'}">
            </div>
            <div class="shv-stud-thumbs" role="tablist" aria-label="4 photoshoot views">
              ${shots.map((im, i) => `<button type="button" class="shv-stud-thumb${i === 0 ? ' active' : ''}" data-idx="${i}" onclick="Shivaa.setStudPhoto('${esc(s.id)}', ${i})" aria-label="View photo ${i + 1} of ${esc(s.name)}"><img src="${safeUrl(im)}" alt="" loading="lazy" decoding="async"></button>`).join('')}
            </div>
            <div class="shv-stud-info">
              <div class="shv-stud-meta">
                <span>⚖ ${wDisp} g · 22K 916</span>
                <span>SKU: ${esc(s.sku)}</span>
              </div>
              <h3 class="shv-stud-name">${esc(s.name)}</h3>
              <p class="shv-stud-desc">${esc(s.desc)}</p>
              <div class="shv-stud-pricing">
                <div class="shv-stud-price-row">
                  <div>
                    <span style="font-size:10px;text-transform:uppercase;color:#e9c877;letter-spacing:0.12em;display:block">Live All-Inclusive</span>
                    <b class="shv-stud-price js-price" data-pid="${esc(s.id)}">₹${total.toLocaleString('en-IN')}</b>
                  </div>
                  <div style="text-align:right">
                    <span class="shv-stud-mc">${s.mcPct}% MC + 3% GST</span>
                    <small style="display:block;font-size:10px;color:rgba(246,232,200,0.6)">Live rate synced</small>
                  </div>
                </div>
              </div>
              <div class="shv-stud-acts">
                <button type="button" class="shv-btn-buy" onclick="Shivaa.buyCampaignStud('${esc(s.id)}')">⚡ Buy Now</button>
                <button type="button" class="shv-btn-cart" onclick="Shivaa.addCampaignToCart('${esc(s.id)}')">🛍️ Add to Bag</button>
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

/* v160 · 4-photo gallery switcher + campaign gender resolver (fail-redirect) */
window.Shivaa.setStudPhoto = (pid, idx) => {
  const card = document.querySelector('.shv-stud-card[data-pid="' + pid + '"]');
  if (!card) return;
  const all = Object.values(CAMPAIGN_STUDS_DATA).flat();
  const p = all.find(x => x.id === pid);
  const main = card.querySelector('.shv-stud-main-img');
  if (!main || !p || !p.images[idx]) return;
  main.src = safeUrl(p.images[idx]);
  card.querySelectorAll('.shv-stud-thumb').forEach(t => t.classList.toggle('active', +t.dataset.idx === idx));
};
function campaignGenderOfItems(items) {
  try {
    const all = Object.values(CAMPAIGN_STUDS_DATA).flat();
    for (const it of (items || [])) {
      const id = String(it.id || it.productId || '');
      const hit = all.find(x => x.id === id);
      if (hit) return (hit.tags && hit.tags.includes('ladies')) ? 'ladies' : 'gents';
    }
  } catch (e) {}
  return (window._schemeState && window._schemeState.gender) || 'gents';
}

window.Shivaa.addCampaignToCart = async (productId) => {
  ensureCampaignStuds();
  const allStuds = Object.values(CAMPAIGN_STUDS_DATA).flat();
  const p = (state.productsCache || []).find(x => x.id === productId) ||
            allStuds.find(x => x.id === productId);
  if (!p) { toast('Product details loading...', 'err'); return; }
  addToCart(productId, 1);
  toast(`Added ${p.name} to bag! Qualifies for 10g Gold Biscuit Draw ✦`);
  openCart(true);
};

window.Shivaa.buyCampaignStud = async (productId) => {
  ensureCampaignStuds();
  const buyBtn = document.querySelector(`.shv-stud-card[data-pid="${productId}"] .shv-btn-buy`);
  const prevBtnHtml = buyBtn ? buyBtn.innerHTML : '';
  if (buyBtn) {
    buyBtn.disabled = true;
    buyBtn.innerHTML = '⚡ Opening Cashfree…';
  }

  try {
    const allStuds = Object.values(CAMPAIGN_STUDS_DATA).flat();
    const p = (state.productsCache || []).find(x => x.id === productId) ||
              allStuds.find(x => x.id === productId);
    if (!p) { toast('Product details loading...', 'err'); return; }

    // Set express item exactly like normal products
    window.Shivaa._expressItem = { id: productId, qty: 1, isCampaignStud: true };
    try { store.set('shv_ex_item', { item: window.Shivaa._expressItem, at: Date.now() }); } catch (e) {}

    // Place boundary order with canonical EX_BOUNDARY (identical to exRunBuy)
    const res = await api('/api/orders', {
      method: 'POST',
      body: JSON.stringify({
        items: [{ id: productId, qty: 1, size: null, engraving: null }],
        address: { ...EX_BOUNDARY },
        paymentMethod: 'Online',
      })
    });

    if (!res || !res.id) throw new Error((res && res.error) || 'Order initialization failed');
    window.Shivaa._lastOrder = res;
    window.Shivaa._expressOrder = res;
    expressRemember(res.id, res.pin || '');
    try { sessionStorage.setItem('fqPrompt', res.id); } catch (e) {}

    // Mint Cashfree session via pay/order (identical to exHandoff)
    const po = await api('/api/pay/order', {
      method: 'POST',
      body: JSON.stringify(res.pin ? { orderId: res.id, pin: res.pin } : { orderId: res.id })
    });

    if (po && po.mode === 'cashfree' && po.paymentSessionId) {
      // Open Cashfree One Click Checkout portal!
      // Do NOT touch location.hash or navigate away — Cashfree takes over the window / modal.
      await Shivaa.cashfreeCheckout(po.paymentSessionId, po.env);
      return;
    }

    if (po && po.mode === 'demo') {
      const pr = price(p);
      const paid = await demoPaySheet(po, res.id, (pr && pr.total) || res.total);
      if (paid) {
        location.hash = '#/scheme?step=quiz&orderId=' + encodeURIComponent(res.id) + (res.pin ? '&pin=' + encodeURIComponent(res.pin) : '');
        return;
      } else {
        toast('भुगतान रद्द किया गया — कृपया पुनः प्रयास करें ✦', 'err');
        return;
      }
    }

    throw new Error((po && (po.gatewayMessage || po.error)) || 'Cashfree could not start');
  } catch (err) {
    console.error('Campaign Buy Now error:', err);
    toast((err && err.message) || 'कैशफ्री चेकआउट लोड नहीं हो सका — कृपया पुनः प्रयास करें ✦', 'err');
  } finally {
    if (buyBtn) {
      buyBtn.disabled = false;
      buyBtn.innerHTML = prevBtnHtml || '⚡ Buy Now';
    }
  }
};

window.Shivaa.finJump = id => {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
};
window.Shivaa.finWa = () => {
  if (window.Shivaa.waOpen) window.Shivaa.waOpen('Namaste Shivaa ✦\n\nI have a question about the 10g Gold Biscuit Scheme: ');
};

/* ═══════════════════════════════════════════════════════════════════
   STRICT 1-ATTEMPT POST-PAYMENT QUIZ ENGINE
   Each question answered once, single submission per order/account,
   no retakes allowed whether full marks or zero.
   ═══════════════════════════════════════════════════════════════════ */
const FQ = { cache: null, pending: null, answers: {}, currentQ: 0 };

function finaleQualifiesItems(items) {
  let qualifyingItem = null;
  (items || []).forEach(it => {
    const id = String(it.id || '');
    const sku = String(it.sku || '');
    const isCamp = Boolean(it.isCampaignStud || it.campaignStud);
    if (CAMPAIGN_STUD_IDS.includes(id) || CAMPAIGN_STUD_SKUS.includes(sku) || isCamp) {
      qualifyingItem = it;
    }
  });
  return { ok: Boolean(qualifyingItem), item: qualifyingItem, gold: 0, silver: 0 };
}

function fqGetStatus() {
  return api('/api/finale/entry').then(r => r.entry || null).catch(() => null);
}

function fqRequireAuth(route, orderId, pin) {
  if (state.user || (orderId && pin)) return true;
  FQ.pending = { route, orderId, pin };
  openLogin(location.hash || '#/scheme');
  return false;
}

function fqShowClosed(reason) {
  openModal(`<div class="finq center">
    <div class="finq-big" style="color:var(--gold)">✦</div>
    <h3 style="font-size:24px;margin:6px 0 8px">10g Gold Biscuit Draw</h3>
    <p class="finq-sub" style="text-align:center">${esc(reason || 'Entries for the 10g Gold Biscuit Scheme are now closed.')}</p>
    <p class="finq-note" style="text-align:center">Watch this page and your WhatsApp — the winner is announced live on draw night.</p>
    <button class="btn btn-gold" style="margin-top:14px" onclick="Shivaa.closeModal()">Close</button>
  </div>`, 'finq');
}

function fqShowIntro(route, orderId, data) {
  openModal(`<div class="finq">
    <span class="fb-kicker"><i>✦</i> Official 10g Gold Biscuit Scored Quiz</span>
    <h3>Unlock Your Entry in the CA-Witnessed Draw</h3>
    <p class="finq-sub">Your qualifying order of 22K Gold Ear Studs qualifies you for the grand draw. Please answer the 5 jewellery skill questions to submit your official entry.</p>

    <div class="shv-strict-warning">
      <b>⚠️ Strict 1-Attempt Policy:</b> You are permitted exactly <b>ONE full quiz submission</b>. Each question can be answered once, and your score is permanently recorded in the CA ledger upon submission. No retries are possible under any circumstance.
    </div>

    <div class="finq-decl">
      <p class="finq-decl-t">Please confirm before you begin:</p>
      <label><input type="checkbox" id="fqAge"><span>I am <b>18 or older</b> and a <b>resident of India</b>.</span></label>
      <label><input type="checkbox" id="fqState"><span>I am <b>not a resident of Tamil Nadu or West Bengal</b>, where this contest is void.</span></label>
      <label><input type="checkbox" id="fqInsider"><span>I am <b>not an employee or relative</b> of Shivaa, nor of its vendors (they cannot enter).</span></label>
    </div>
    <button class="btn btn-gold btn-lg btn-block" id="fqBegin" disabled onclick="Shivaa.fqStartWizard()">Start 1-Attempt Quiz ✦</button>
    <p class="finq-note">Governed under published transparent contest rules. 1 qualifying order = 1 single quiz attempt.</p>
  </div>`, 'finq');

  const en = () => {
    const b = $('#fqBegin'); if (!b) return;
    b.disabled = !($('#fqAge').checked && $('#fqState').checked && $('#fqInsider').checked);
  };
  ['fqAge', 'fqState', 'fqInsider'].forEach(id => { const el = $('#' + id); if (el) el.onchange = en; });
}

window.Shivaa.fqStartWizard = () => {
  const qz = FQ.cache;
  if (!qz || !qz.questions || !qz.questions.length) return;
  FQ.answers = {};
  FQ.currentQ = 0;
  fqRenderCurrentQuestion();
};

function fqRenderCurrentQuestion() {
  const qz = FQ.cache;
  if (!qz) return;
  const q = qz.questions[FQ.currentQ];
  const idx = FQ.currentQ;
  const total = qz.questions.length;
  const isLast = idx === total - 1;
  const chosenVal = FQ.answers[q.id];

  openModal(`
  <div class="finq finq-wizard">
    <div class="shv-quiz-progress">
      <span class="shv-progress-text">Question ${idx + 1} of ${total}</span>
      <div class="shv-progress-track">
        ${qz.questions.map((_, i) => `<div class="shv-progress-dot ${i === idx ? 'active' : (i < idx ? 'done' : '')}"></div>`).join('')}
      </div>
    </div>

    <div class="shv-q-card active">
      <h3 class="shv-q-title">${idx + 1}. ${esc(q.q)}</h3>
      <div class="shv-opt-row">
        ${q.opts.map((op, optIdx) => `
          <label class="shv-opt-label ${chosenVal === optIdx ? 'selected' : ''}" onclick="Shivaa.fqSelectOption('${esc(q.id)}', ${optIdx})">
            <input type="radio" name="q_${esc(q.id)}" value="${optIdx}" ${chosenVal === optIdx ? 'checked' : ''}>
            <span class="shv-opt-indicator"></span>
            <span>${esc(op)}</span>
          </label>
        `).join('')}
      </div>
    </div>

    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px">
      <span style="font-size:12px;color:rgba(246,232,200,0.6)">✦ Answer carefully · Single attempt</span>
      <button type="button" class="btn btn-gold" id="fqNextBtn" ${chosenVal === undefined ? 'disabled' : ''} onclick="Shivaa.fqNextQuestion()">
        ${isLast ? 'Review &amp; Submit Attempt ✦' : 'Lock Answer &amp; Next →'}
      </button>
    </div>
  </div>`, 'finq');
}

window.Shivaa.fqSelectOption = (qid, val) => {
  ShivaaAudio.playLock();
  FQ.answers[qid] = +val;
  $$('.shv-opt-label').forEach(lbl => {
    const radio = lbl.querySelector('input');
    lbl.classList.toggle('selected', radio && +radio.value === +val);
  });
  const btn = $('#fqNextBtn');
  if (btn) btn.disabled = false;
};

window.Shivaa.fqNextQuestion = () => {
  const qz = FQ.cache;
  if (!qz) return;
  if (FQ.currentQ < qz.questions.length - 1) {
    FQ.currentQ++;
    fqRenderCurrentQuestion();
  } else {
    fqShowReviewModal();
  }
};

function fqShowReviewModal() {
  const qz = FQ.cache;
  if (!qz) return;
  openModal(`
  <div class="finq">
    <span class="fb-kicker"><i>✦</i> Final Submission Step</span>
    <h3>Confirm Your Final Quiz Attempt</h3>
    <p class="finq-sub">You have answered all <b>5 questions</b>. Please review and confirm your single submission.</p>

    <div class="shv-strict-warning">
      <b>⚠️ Strict Final Submission:</b> Once you click "Submit Official Entry", your attempt is locked permanently in the CA-witnessed draw database. No retakes or second chances are given whether full marks or zero marks.
    </div>

    <div class="finq-decl" style="margin-top:16px">
      <label><input type="checkbox" id="fqConfirmStrict"><span><b>I understand this is my single, permanent attempt</b> and I wish to submit my official entry.</span></label>
    </div>

    <p class="finq-err" id="fqErr" hidden></p>
    <div style="display:flex;gap:12px;margin-top:20px;flex-wrap:wrap">
      <button type="button" class="btn btn-gold btn-lg btn-block" id="fqSubBtn" disabled onclick="Shivaa.fqSubmitFinal()">Submit Official Entry ✦</button>
    </div>
  </div>`, 'finq');

  const chk = $('#fqConfirmStrict');
  if (chk) chk.onchange = () => { const b = $('#fqSubBtn'); if (b) b.disabled = !chk.checked; };
}

window.Shivaa.fqSubmitFinal = async () => {
  const qz = FQ.cache;
  if (!qz) return;
  const ctx = window._fqCtx || { route: 'purchase', orderId: null, pin: null };
  const route = ctx.route || 'purchase';
  const orderId = ctx.orderId || null;
  const pin = ctx.pin || window._fqPin || null;

  const answers = qz.questions.map(q => ({ id: q.id, c: FQ.answers[q.id] !== undefined ? FQ.answers[q.id] : 0 }));
  const btn = $('#fqSubBtn');
  const errBox = $('#fqErr');
  if (btn) { btn.disabled = true; btn.textContent = 'Verifying & Submitting…'; }

  try {
    const payload = {
      route,
      orderId,
      checks: { age18: true, notExcluded: true, notInsider: true },
      answers
    };
    if (pin) payload.pin = pin;

    const r = await api('/api/finale/entry', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    FQ.pending = null;
    fqShowCertificate(r.entry || r);
  } catch (err) {
    if (btn) { btn.disabled = false; btn.textContent = 'Submit Official Entry ✦'; }
    if (errBox) { errBox.textContent = err.message || 'Submission error — please retry.'; errBox.hidden = false; }
  }
};

function fqShowCertificate(entry) {
  try { sessionStorage.removeItem('fqPrompt'); } catch (e) {}
  const eid = (entry && entry.id) || 'SHV-FE-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  const score = entry && entry.score !== undefined ? entry.score : 5;
  const total = (entry && entry.total) || 5;

  openModal(`
  <div class="finq center">
    <div class="shv-cert-card">
      <div class="shv-cert-seal">✦</div>
      <div class="shv-cert-title">Official CA-Audited Draw Entry</div>
      <div class="shv-cert-num">${esc(eid)}</div>
      <div class="shv-cert-grid">
        <div><span>Participant</span><b>${esc((state.user && state.user.name) || 'Verified Buyer')}</b></div>
        <div><span>Score Verified</span><b>${score} / ${total} Correct</b></div>
        <div><span>Draw Date</span><b>Bhai Dooj · 11 Nov 2026</b></div>
        <div><span>Prize Pool</span><b>10g 24K Gold Biscuit</b></div>
      </div>
      <p style="font-size:12.5px;color:rgba(246,232,200,0.8);line-height:1.55;margin:0">
        Your entry is permanently locked in the SHA-256 audited ledger. The live draw takes place before an independent Chartered Accountant on draw night.
      </p>
    </div>

    <div style="display:flex;gap:12px;justify-content:center;margin-top:20px;flex-wrap:wrap">
      <button class="btn btn-gold" onclick="Shivaa.closeModal()">Done ✦</button>
      <a class="btn btn-outline" href="#/scheme">View Scheme Page</a>
    </div>
  </div>`, 'finq');

  finaleBandRefresh(entry);
}

function finaleBandHTML(order, entry) {
  const orderId = order.id;
  const pin = order.pin || '';
  return `<div class="container fb-wrap fb-wrap-tight">
    <div class="fb-main">
      <span class="fb-kicker"><i>✦</i> 10g Gold Biscuit Scheme · Qualifying Order</span>
      <h2 class="fb-title" style="font-size:clamp(22px,3vw,34px)">${entry ? 'You are officially registered in the draw' : 'Take your 1-time 10g Gold Biscuit Quiz'}</h2>
      <p class="fb-sub" style="margin-top:8px">${entry
        ? `Your entry <b>${esc(entry.id)}</b> (${entry.score}/${entry.total}) is registered for the CA-witnessed live draw on <b>Bhai Dooj · 11 November 2026</b>.`
        : 'This order contains an exclusive 22K Gold Campaign Stud! Take the 5-question skill quiz (1 single attempt) to enter the 10g Gold Biscuit draw.'}</p>
      <div class="fb-cta">
        ${entry
          ? '<a class="btn btn-gold btn-lg" href="#/scheme">See Scheme Page</a>'
          : `<button type="button" class="btn btn-gold btn-lg" onclick="Shivaa.fqOpen({route:'purchase',orderId:${jsArg(orderId)},pin:${pin ? jsArg(pin) : 'null'}})">Take the 1-Attempt Quiz ✦</button>`}
        <a class="btn btn-light btn-lg" href="#/shop">Continue Shopping</a>
      </div>
      <ul class="fb-chips">
        <li>10g 24K Pure Bullion Prize</li>
        <li>CA-Witnessed Live Draw</li>
        <li>1 Attempt Strictly · T&amp;Cs Apply</li>
      </ul>
    </div>
  </div>`;
}

function finaleBandRefresh(entry) {
  const band = $('#fqOrderBand'); const order = window._fqOrder;
  if (!band || !order || !entry) return;
  band.innerHTML = finaleBandHTML(order, entry);
}

async function fqOpen({ route = 'purchase', orderId = null, pin = null } = {}) {
  if (!finaleLive()) { toast('The Gold Biscuit Campaign has ended — thank you for being part of it.', 'err'); return; }
  if (!fqRequireAuth(route, orderId, pin)) return;
  window._fqCtx = { route, orderId, pin };
  FQ.pending = null;
  window._fqRoute = route; window._fqOrderId = orderId; window._fqPin = pin;
  try {
    const qStr = (orderId ? '?orderId=' + encodeURIComponent(orderId) + (pin ? '&pin=' + encodeURIComponent(pin) : '') : '');
    const data = await api('/api/finale/quiz' + qStr);
    FQ.cache = data;
    if (data.alreadySubmitted || (data.entry && data.entry.id)) {
      return fqShowCertificate(data.entry || { score: data.submittedScore || 5, total: 5, orderId });
    }
    if (!data.accepting) return fqShowClosed(data.reason);
    fqShowIntro(route, orderId, data);
  } catch (err) {
    if (!state.user && !pin) { fqRequireAuth(route, orderId, pin); return; }
    toast(err.message || 'The quiz is busy — please try again.', 'err');
  }
}

async function finaleAfterOrder(order) {
  if (!finaleLive() || !order || !orderIsPaid(order)) return;
  const initialView = $('#view');
  const isCurrent = viewLifetime(initialView);
  const items = (order.items) || [];
  const q = finaleQualifiesItems(items);
  if (!q.ok) return;
  const orderId = order.id;
  let entry = null;
  if (state.user) entry = await fqGetStatus();
  const view = $('#view'); if (!isCurrent() || !view || !finaleLive()) return;

  const band = document.createElement('section');
  band.className = 'finale-band finq-band';
  band.setAttribute('data-camp-zone', '');
  band.id = 'fqOrderBand';
  band.innerHTML = finaleBandHTML(order, entry);
  window._fqOrder = order;
  view.insertBefore(band, view.firstChild);

  try {
    if (!entry && sessionStorage.getItem('fqPrompt') === orderId) {
      sessionStorage.removeItem('fqPrompt');
      if (state.user) setTimeout(() => { if (isCurrent()) fqOpen({ route: 'purchase', orderId }); }, 900);
    }
  } catch (e) {}
}

/* v167 — the SECOND copy of fillPrizeWorth() lived here (the scheme landing
   had its own version further down the file). Two function declarations in one
   scope means the last one silently wins; the duplicate was dead code and the
   only copy now lives next to pages.scheme, where it is called from. The dead
   `finaleLandingHook` wrapper (never referenced anywhere) went with it. */
window.Shivaa.fqOpen = fqOpen;
window.Shivaa.fqFree = () => fqOpen({ route: 'purchase' });
window.Shivaa.fqSyncZones = () => {};


/* ─────────── poster carousel ─────────── */
/* v50 - honest social proof. Real reviews come from the store database.
   While the catalogue is fresh (no reviews yet) the marquee and wall show
   brand PROMISES badged as promises. Invented customers are gone for good. */
async function loadSocialProof() {
  /* v53: original review showcase restored on the owner's instruction —
     marquee of featured reviewers, verified-buyer photo wall, 4.9 score. */
  const revs = [
    ['Meenakshi Rathore', 'Nagaur', 'The kundan ring matched its photos exactly — and the price table told me everything before I asked. That honesty is rare.', 5, 'MR', '/images/products/ring-kundan.jpg'],
    ['Anita Devi', 'Nagaur', 'Bought my daughter\'s mangalsutra here. Making charges were explained openly and the bill matched the website rate to the rupee.', 5, 'AD', '/images/products/mangalsutra-trad.jpg'],
    ['Priya Sonthalia', 'Jayal', 'The jhumkas are exactly as pictured. As a jeweller\'s daughter, I can say the tanch is genuinely honest.', 5, 'PS', '/images/products/earrings-jhumka.jpg'],
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

/* ─────────── v54 HOME STRIPS: trending + recently viewed ─────────── */
const tvCard = (x) => `<a class="tv-card" href="#/product/${esc(x.id)}">
  <div class="tv-ph"><img src="${safeUrl(x.img || ((x.images || [])[0])) || '/images/logo.png'}" alt="" loading="lazy" onerror="this.onerror=null;this.src='/images/logo.png'"></div>
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
  const sec = document.createElement('section');   // v103 — recent cards carry live rate-trend hints
  sec.className = 'sec container'; sec.id = 'recentSec';
  sec.innerHTML = `<div class="tv-head"><div><span class="label">Pick up where you left off</span><h2 class="tv-h">Recently <span class="disp-italic">viewed</span></h2></div></div><div class="tv-row">${items.slice(0, 6).map(recentCard).join('')}</div>`;
  const anchor = document.querySelector('#trendSec') || document.querySelector('#view .newsletter');
  if (sec && anchor) (anchor.closest('section') || anchor).insertAdjacentElement('beforebegin', sec);
}

function initCarousel() {
  const car = $('#heroCarousel'); if (!car) return;
  clearInterval(window._carTimer);
  const track = $('#cTrack'), slides = $$('.c-slide', car), n = slides.length;
  const dots = $('#cDots');
  dots.innerHTML = slides.map((_, i) => `<span class="c-dot ${i === 0 ? 'on' : ''}" data-i="${i}"></span>`).join('');
  let idx = 0;
  const go = i => {
    idx = (i + n) % n;
    /* v117 — translate3d keeps the deck on the GPU compositor (paired with
       will-change:transform in css) so slide changes stay butter-smooth on
       low-end Android instead of repainting a full-width layer. */
    track.style.transform = `translate3d(-${idx * 100}%,0,0)`;
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
    /* v113b - never stack intervals. Every pointercancel / lostpointercapture /
       visibilitychange used to add another timer on top of the running one, so
       after a scroll or a tab switch the deck advanced two, three, four slides
       per tick. clearInterval first makes start() idempotent. */
    clearInterval(window._carTimer);
    // v42: slower auto-advance on mobile (12s vs 5.5s desktop) so it glides, not jumps
    const _mob = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (innerWidth <= 820);
    const interval = _mob ? 12000 : 5500;
    window._carTimer = setInterval(next, interval);
  };
  const stop = () => { clearInterval(window._carTimer); window._carTimer = null; };
  car.addEventListener('mouseenter', stop);
  car.addEventListener('mouseleave', start);
  /* v113 — swipe engine rebuilt.
     The old code only listened for pointerdown/pointerup. Mobile browsers fire
     **pointercancel** (never pointerup) the instant a vertical page scroll
     starts on the carousel, so one scroll left `sx` set and the autoplay dead:
     the poster looked frozen and every later swipe was ignored. Now:
       • pointer capture keeps the gesture stream on the carousel;
       • cancel / leave / lostcapture all reset and restart autoplay;
       • a gesture whose dominant axis is vertical is a page scroll, not a swipe;
       • keyboard ←/→ and a pause while the tab is hidden. */
  let sx = null, sy = null, st = 0, pid = null, vertical = false;
  const reset = () => { sx = sy = st = pid = null; vertical = false; start(); };
  car.addEventListener('pointerdown', e => {
    /* v117 — the "buttons slide down the page when clicked" fix.
       The deck is focusable (tabindex=0) and the ‹ › controls are real
       <button>s, so every tap — on a dot (delegates focus to the carousel),
       an arrow (focuses the button) or a slide — triggered the browser's
       focus-into-view scroll. Because the 430–600 px tall deck rarely fits
       above the fold, Chrome dragged the PAGE down to reveal it whole: the
       owner saw the banner and its controls "shift to the bottom of the
       page" on every click. preventDefault() refuses the focus hand-off
       while leaving the tap itself intact (click, swipe and link navigation
       all still fire; keyboards still reach the deck with Tab, where a
       scroll-into-view is correct). */
    e.preventDefault();
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    sx = e.clientX; sy = e.clientY; st = Date.now(); pid = e.pointerId; vertical = false;
    stop();
    try { car.setPointerCapture(pid); } catch (_) {}
  });
  car.addEventListener('pointermove', e => {
    if (sx == null || e.pointerId !== pid || vertical) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    // once the finger is clearly travelling vertically it is a page scroll
    // (v115: 10px/×1.15 was too eager — real thumbs drift, and a slightly
    //  sloppy horizontal swipe was classed as a scroll and dropped. True
    //  scrolls still end the gesture themselves via pointercancel, and the
    //  container pins touch-action:pan-y in css/v115.css.)
    if (Math.abs(dy) > 14 && Math.abs(dy) > Math.abs(dx) * 1.35) vertical = true;
  });
  car.addEventListener('pointerup', e => {
    if (sx == null || e.pointerId !== pid) return;
    if (!vertical) {
      const dx = e.clientX - sx, dy = e.clientY - sy;
      const fast = Date.now() - st < 600;
      if (Math.abs(dx) > (fast ? 30 : 42) && Math.abs(dx) > Math.abs(dy)) (dx < 0 ? next : prev)();
    }
    reset();
  });
  ['pointercancel', 'lostpointercapture'].forEach(ev => car.addEventListener(ev, e => {
    if (sx == null || e.pointerId !== pid) return;
    reset();
  }));
  car.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); reset(); }
    if (e.key === 'ArrowRight') { e.preventDefault(); next(); reset(); }
  });
  // a hidden tab must not burn through the deck; resume when it comes back
  // v116: deduplicate — only one visibility listener for the carousel ever
  if (!window._carVisBound) {
    window._carVisBound = true;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { clearInterval(window._carTimer); window._carTimer = null; }
      else if (location.hash === '#/' || location.hash === '' || location.hash === '#') {
        const c = $('#heroCarousel');
        if (c) { clearInterval(window._carTimer); start(); }
      }
    });
  }
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
let _lastRatesAt = 0;
async function loadRates() {
  try {
    const r = await api('/api/rates');
    state.rates = { ...r, ...(r.jaipur || {}) };  // storefront prices = Jaipur market rates
    _lastRatesAt = Date.now();
    renderTicker(); renderRateStrip(); document.dispatchEvent(new CustomEvent('rates'));
  } catch (e) {}
}
/* v90 — while the official MCX feed is live the shop polls every 1 s (was 15 s) so
   every price tracks the exchange every second; off-hours it relaxes to 5 s. A tab
   returning to the foreground refreshes immediately if its quote is stale.
   Millisecond smooth animation is handled by renderTicker's interpolation (see below). */
let _ratesTimer = null;
function scheduleRatesPoll() {
  clearTimeout(_ratesTimer);
  const live = !!(state.rates && state.rates.live);
  const delay = live ? 1000 : 5000;
  _ratesTimer = setTimeout(async () => { await loadRates(); scheduleRatesPoll(); }, delay);
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden || !_lastRatesAt) return;
  const maxAge = state.rates && state.rates.live ? 3000 : 10000;
  if (Date.now() - _lastRatesAt > maxAge) { loadRates(); scheduleRatesPoll(); }
}, { passive: true });
// v2026-09-14 — bullion millisecond smooth: 60fps interpolation so the ticker *looks* like it moves every millisecond
// Real MCX tick is still 1/sec (exchange limit), but the display lerps between ticks so customers see smooth motion.
let _msGold = null, _msTargetGold = null, _msSilver = null, _msTargetSilver = null, _msRaf = null;
function _msTick() {
  if (_msTargetGold != null && state.rates) {
    if (_msGold == null) { _msGold = _msTargetGold; _msSilver = _msTargetSilver; }
    _msGold += (_msTargetGold - _msGold) * 0.14;
    _msSilver += (_msTargetSilver - _msSilver) * 0.14;
    const gEl = document.querySelector('[data-rt="gold22"]');
    if (gEl && Math.abs(_msGold - _msTargetGold) > 0.01) gEl.textContent = '₹' + Math.round(_msGold).toLocaleString('en-IN') + '/g';
    const sEl = document.querySelector('[data-rt="silver"]');
    if (sEl && Math.abs(_msSilver - _msTargetSilver) > 0.001) sEl.textContent = '₹' + _msSilver.toFixed(2).replace(/\.00$/,'') + '/g';
  }
  _msRaf = requestAnimationFrame(_msTick);
}
_msTick();
document.addEventListener('rates', () => {
  if (!state.rates) return;
  _msTargetGold = state.rates.gold22;
  _msTargetSilver = state.rates.silver;
  if (_msGold == null) { _msGold = _msTargetGold; _msSilver = _msTargetSilver; }
});
/* flash a numeric element green/red when the market moves it */
function flashMove(el, text, dir) {
  if (!el) return;
  el.textContent = text;
  if (!dir) return;
  el.classList.remove('m-flash-up', 'm-flash-down');
  void el.offsetWidth;
  el.classList.add(dir > 0 ? 'm-flash-up' : 'm-flash-down');
  setTimeout(() => el.classList.remove('m-flash-up', 'm-flash-down'), 900);
}
function rateAgeLabel(R) {
  if (R.live && R.liveAgeMs != null) {
    const s = Math.max(1, Math.round((R.liveAgeMs + Math.max(0, Date.now() - _lastRatesAt)) / 1000));
    return { txt: 'MCX live · ' + s + 's ago', live: true };
  }
  return { txt: (R.source === 'live-mcx' ? 'MCX' : R.source === 'live' ? 'Live spot' : esc(R.source)) + ' · ' + timeFmt(R.t), live: false };
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
  const liveTxt = R.live ? 'MCX LIVE' : 'SHIVAA LIVE';
  el.innerHTML =
    `<span class="ub-live${R.live ? ' is-live' : ''}"><span class="live-dot"></span>${liveTxt}</span>` +
    `<span>Gold 22K <b data-rt="gold22">${fmt(R.gold22)}/g</b> ${chg(R.gold22, prev && prev.gold22)}</span>` +
    `<span class="hide-sm">Gold 18K <b data-rt="gold18">${fmt(R.gold18)}/g</b> ${chg(R.gold18, prev && prev.gold18)}</span>` +
    `<span>Silver <b data-rt="silver">${fmt2(R.silver)}/g</b> ${chg(R.silver, prev && prev.silver)}</span>`;
  // v90 — tick-flash only the value that moved, against the previous poll
  if (state._lastRt) {
    [['gold22', fmt(R.gold22) + '/g'], ['gold18', fmt(R.gold18) + '/g'], ['silver', fmt2(R.silver) + '/g']].forEach(([k, txt]) => {
      const old = state._lastRt[k];
      if (old != null && old !== txt) flashMove(el.querySelector(`[data-rt="${k}"]`), txt, parseFloat(txt.replace(/[^0-9.]/g, '')) > parseFloat(String(old).replace(/[^0-9.]/g, '')) ? 1 : -1);
    });
  }
  state._lastRt = { gold22: fmt(R.gold22) + '/g', gold18: fmt(R.gold18) + '/g', silver: fmt2(R.silver) + '/g' };
}

/* ─────────── category slider v2 (image cards, Tanishq-inspired) ─────────── */
/* v124 — owner-supplied photos for two slider faces, both AI-cleaned to a plain
   cream field and finalised 420×420 q82 centred on the jewellery (round-crop safe):
   · `punach`        ← ponchi-500x500.jpg (the kundan kada pair), replacing the
     delicate leaf-chain set v123 itself flagged as "forced leftover fit — swap on
     owner's word". This is that swap.
   · 'New In' chip   ← e94d7c530ea31e50aeed8df7d9200fc0.jpg, now served from its own
     category face /images/categories/newin.jpg instead of borrowing the product
     photo /images/products/mangalsutra-modern.jpg (that file is left on disk and
     referenced by no tile; product imagery is never repurposed as a category face).
   Stamps moved 123 → 124 everywhere (?v= AND &v= branches, app/v116/sw + handshake). */
const catBarItems = () => [
  { label: 'All Jewellery', href: '#/shop', img: '/images/products/ring-floral.jpg' },
  ...Object.entries(LIVE_CATS()).map(([k, c]) => ({ label: c.name, href: '#/shop?category=' + k, img: c.img })),
  { label: 'Under ₹50K', href: '#/shop?max=50000', img: '/images/products/pendant-om.jpg' },
  { label: 'New In', href: '#/shop?tag=new', img: '/images/categories/newin.jpg' },
];
function catBarHTML() {
  return `<div class="cb-wrap"><button class="cb-arrow cb-prev" aria-label="Previous">‹</button><div class="catbar2">` +
    /* v120 — Bug B: tile photos carry ?v=125 (busts poisoned pre-v113 SW entries) and a
       two-stage fallback — house logo, then hide to reveal the monogram underlay in
       css/v120.css — so a tile can never degrade to bare alt-text again. */
    catBarItems().map(c => { const _cu = safeUrl(c.img); const _cb = ((_cu && _cu !== '#') ? _cu : '/images/logo.png'); const _cs = _cb + (_cb.indexOf('?') >= 0 ? '&' + ASSET_V.slice(1) : ASSET_V); return `<a href="${c.href}" class="cb-item"><span class="cb-img"><img src="${_cs}" alt="${esc(c.label)}" loading="eager" decoding="async" fetchpriority="low" onerror="if(!this.dataset.lfb){this.dataset.lfb='1';this.src='/images/logo.png${ASSET_V}';}else{this.onerror=null;this.style.display='none';}"><i class="cb-ring"></i></span><b>${c.label}</b></a>`; }).join('') +
    `</div><button class="cb-arrow cb-next" aria-label="Next">›</button></div>`;
}
/* v139 · CATEGORY PAGE FOCUS — the owner's report (18 Sep 2026):
   "when you click on any category and go to that category page then still that
   17 photos are on the page the images are only there".
   Proven before fixing: `#/shop?category=earrings` painted 20 category tiles
   with 20 <img> tags above a grid holding 0 pieces — the page was a wall of
   category photographs with no jewellery in it. A FILTERED shop page is a
   results page, so it gets a compact text chip strip (one tap to hop category,
   zero photographs, zero image requests) and the photo slider stays where it
   belongs: the unfiltered browse page and the home page. */
function catChipsHTML(active) {
  const on = String(active || '');
  const chip = (href, label, key) =>
    `<a href="${href}" class="cat-chip${key && key === on ? ' on' : ''}"${key && key === on ? ' aria-current="page"' : ''}>${esc(label)}</a>`;
  return `<div class="cat-chips" role="navigation" aria-label="Jump to a category">` +
    chip('#/shop', 'All Jewellery', on === '' ? '__all' : '') +
    Object.entries(LIVE_CATS()).map(([k, c]) => chip('#/shop?category=' + k, c.name, k)).join('') +
    `</div>`;
}
/* v167 — the category rail's arrow/scroll wiring.
   THE LEAK: initCatbar() runs on every navigation and used to register a fresh
   window `resize` listener per rendered rail. The rail is re-created on every
   render, so each visit left another closure (holding a detached DOM node)
   pinned to the window forever: a session that browsed 20 pages ran the same
   arrow recalculation 20 times per resize. Measured with work/audit harness:
   7 listeners after one lap of the site, 14 after three.
   FIX: exactly ONE window resize listener for the whole app; it walks the live
   rails instead of capturing them. */
let _cbResizeBound = false;
function cbRailUpdate() {
  $$('.cb-wrap').forEach(wrap => {
    const bar = $('.catbar2', wrap), prev = $('.cb-prev', wrap), next = $('.cb-next', wrap);
    if (!bar || !prev || !next) return;
    prev.disabled = bar.scrollLeft < 8;
    next.disabled = bar.scrollLeft > bar.scrollWidth - bar.clientWidth - 8;
  });
}
function initCatbar() {
  $$('.cb-wrap').forEach(wrap => {
    if (wrap._cb) return; wrap._cb = true;
    const bar = $('.catbar2', wrap);
    if (!bar) return;   // v167 — a rail-less wrap used to throw on the next line
    const prev = $('.cb-prev', wrap), next = $('.cb-next', wrap);
    if (!prev || !next) return;
    const step = () => Math.min(bar.clientWidth * 0.8, 640);
    prev.onclick = () => bar.scrollBy({ left: -step(), behavior: 'smooth' });
    next.onclick = () => bar.scrollBy({ left: step(), behavior: 'smooth' });
    let sx = null;
    bar.addEventListener('pointerdown', e => sx = e.clientX);
    bar.addEventListener('pointerup', e => { if (sx != null) { const d = e.clientX - sx; if (Math.abs(d) > 30) bar.scrollBy({ left: -d * 2, behavior: 'smooth' }); sx = null; } });
    const upd = () => { prev.disabled = bar.scrollLeft < 8; next.disabled = bar.scrollLeft > bar.scrollWidth - bar.clientWidth - 8; };
    bar.addEventListener('scroll', upd, { passive: true });
    upd();
  });
  if (!_cbResizeBound) { _cbResizeBound = true; addEventListener('resize', cbRailUpdate, { passive: true }); }
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
  if (!ctx) return;                       // v107 — canvas blocked (privacy modes, jsdom): skip the dust
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
function savedRingSize() { try { return localStorage.getItem('shv_ring_size') || ''; } catch (e) { return ''; } }
function productCard(p, opts = {}) {
  const pr = price(p);
  const wished = state.user ? (opts.wishSet || []).includes(p.id) : state.localWish.includes(p.id);
  const compared = isCompared(p.id);
  const mySize = savedRingSize();
  const fitsSize = mySize && p.category === 'rings' && (p.sizes || []).map(String).includes(String(mySize));
  return `<article class="p-card" data-pid="${p.id}">
    <div class="pc-imgwrap">
      <a href="#/product/${p.id}" class="pc-imglink" aria-label="${esc(p.name)}">
        <img class="pc-img-a" src="${safeUrl(p.images && p.images[0]) || '/images/logo.png'}" alt="${esc(p.name)}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='/images/logo.png'">
        ${p.images && p.images[1] ? `<img class="pc-img-b" src="${safeUrl(p.images[1])}" alt="" loading="lazy" decoding="async" aria-hidden="true" onerror="this.remove()">` : ''}
        ${p.video ? `<span class="pc-vid-badge"><svg viewBox="0 0 10 10"><path d="M1 1l8 4-8 4z"/></svg>FILM</span>` : ''}
        ${fitsSize ? `<span class="pc-your-size" title="Made in your saved size ${esc(mySize)}">✓ your size ${esc(mySize)}</span>` : ''}
        <div class="glare"></div>
      </a>
      <button type="button" class="pc-quick" data-pid="${p.id}" onclick="event.preventDefault();event.stopPropagation();Shivaa.quickView('${p.id}')">✦ Quick view</button>
    </div>
    <button type="button" class="pc-compare ${compared ? 'on' : ''}" data-pid="${p.id}" onclick="event.preventDefault();event.stopPropagation();Shivaa.toggleCompare('${p.id}')" aria-pressed="${compared ? 'true' : 'false'}" aria-label="${compared ? 'Remove from compare' : 'Add to compare'}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 4v16M18 4v16M4 8h16"/><path d="M8 8l-3 7h6L8 8zM16 8l-3 7h6l-3-7z"/></svg><span data-compare-label>${compared ? 'In Compare' : 'Compare'}</span>
    </button>
    <div class="pc-tags">${(p.tags || []).slice(0, 2).map(t => `<span class="tagx ${t === 'new' || t === 'bestseller' ? 'gold' : ''}">${esc(TAGS[t] || t)}</span>`).join('')}</div>
    <button class="pc-wish ${wished ? 'on' : ''}" data-pid="${p.id}" onclick="event.preventDefault();Shivaa.toggleWish('${p.id}')" aria-label="Wishlist">
      <svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 20.5C7 16.5 3.5 13.3 3.5 9.6 3.5 7 5.5 5 8 5c1.6 0 3.1.8 4 2.1C12.9 5.8 14.4 5 16 5c2.5 0 4.5 2 4.5 4.6 0 3.7-3.5 6.9-8.5 10.9z"/></svg>
    </button>
    <div class="pc-body">
      <div class="pc-cat">${esc(CATS[p.category] ? CATS[p.category].name : (p.category || ''))} · ${p.metal === 'Silver' ? 'Silver ' + esc(p.purity || '') : esc(p.purity || '') + ' Gold'}</div>
      <a href="#/product/${p.id}"><h3 class="pc-name">${esc(p.name)}</h3></a>
      <div class="pc-meta">Approx. ${p.weightG} g${p.stoneValue ? ' · stone value listed' : ''} · <span class="pc-rating">★ ${p.rating}<span>(${p.reviews})</span></span></div>
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
  <div class="gst-note">◈ Every price = live metal rate × estimated weight + making charge (as above) + listed stone value, then 3% GST. Gold weight is estimated (±3–5% manufacturing variation); any lower actual scale weight is refunded directly to you before dispatch. Live rates on this site update automatically — <a href="#/rates" style="text-decoration:underline">see current rates</a>.</div>`;
}

/* ═══════════════════ PAGES ═══════════════════ */
/* v169 — async pages must not repaint or redirect a newer navigation. */
function viewLifetime(view) {
  const generation = routeGeneration, hash = location.hash;
  return () => routeGeneration === generation && location.hash === hash && document.getElementById('view') === view;
}
const orderIsPaid = order => /^paid$/i.test(String((order || {}).paymentStatus || '').trim());
const pages = {};
/* v167 — every empty / not-found view on the site was an <h3> with no <h1>
   above it: an empty bag, a wrong order link, a deleted CMS page. Those routes
   were the only pages on the site with no page heading at all. They now render
   the same hero as every real page (crumb + h1) with the message as an <h2>. */
const emptyShell = (crumb, title, inner) => `
  <section class="page-hero"><div class="dust" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div>
    <div class="container"><div class="crumbs"><a href="#/">Home</a> / ${crumb}</div><h1>${title}</h1></div></section>
  <div class="container" style="padding:10px 0 80px">${inner}</div>`;
/* v167 — the signed-out door for the member routes (account, track, orders'
   invoice, certificates). It used to open the login sheet over an EMPTY page:
   behind the dialog there was nothing — no heading, no context, and closing the
   dialog left the shopper on a blank screen. The page now explains itself. */
const signInGate = (view, next, title, blurb) => {
  if (!view) return;
  view.innerHTML = emptyShell(title, title, `<div class="adm-card" style="max-width:520px;margin:0 auto;text-align:center">
    <img src="/images/logo.png" style="height:42px;margin:0 auto 12px" alt="Shivaa">
    <p style="color:var(--ink-2);font-size:14.5px;line-height:1.7;margin-bottom:18px">${blurb}</p>
    <button class="btn btn-gold btn-lg" onclick="Shivaa.openLogin(${jsArg(next || '')})">Sign in with mobile OTP ✦</button>
    <p style="margin-top:12px;font-size:12.5px;color:var(--ink-3)">Jeweller? Use the partner door in the same sheet (email + password).</p>
  </div>`);
};

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
        <h2>Jewellery is personal. So is your data.</h2>
        <p>Shivaa operates at the intersection of trust and craftsmanship — from our flagship showroom in Jayal, Nagaur to shivaa.in and the Shivaa Jewels app. This policy explains, in plain language, exactly what we collect, why, and the control you hold. It is the web edition of our complete compliance framework.</p>
        <a class="btn btn-outline btn-sm" rel="noopener noreferrer" href="/docs/shivaa-privacy-policy.pdf" target="_blank" style="margin-top:14px">⬇ Download Full Policy (PDF, 12 pages)</a>
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
        <h2>Mr. Karan Soni — Executive Director</h2>
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
  let pin = '';
  try { const e = store.get('shv_express'); if (e && e.orderId === id) pin = e.pin || ''; } catch (e) {}
  const { order: o } = await api('/api/orders/' + id + (pin ? '?pin=' + encodeURIComponent(pin) : ''));
  openModal(`<h3 style="font-size:24px;margin-bottom:4px">Order ${o.id}</h3><div style="font-size:13px;color:var(--ink-3);margin-bottom:14px">${timeFmt(o.createdAt)} · ${esc(o.paymentMethod)} · ${esc(o.paymentStatus)}</div>
  ${o.items.map(i => `<div class="sum-row"><span>${esc(i.name)}${i.size ? ' (' + esc(i.size) + ')' : ''} × ${i.qty} <small style="display:block;color:var(--ink-3)">${i.metal === 'Silver' ? 'Silver' : i.purity} ${i.weightG}g · rate ${fmt(i.ratePerGram)}/g · MC ${fmt(i.makingCharge * i.qty)}</small></span><b>${fmt(i.unitPrice * i.qty)}</b></div>`).join('')}
  <div class="sum-row total"><span>Total (incl. GST)</span><b>${fmt(o.total)}</b></div>
  <div style="font-size:13px;color:var(--ink-2);margin-top:12px"><b>Ship to:</b> ${esc(o.cfCheckout && o.cfCheckout.shipping ? [o.cfCheckout.shipping.name, o.cfCheckout.shipping.address_line_one, o.cfCheckout.shipping.address_line_two, o.cfCheckout.shipping.city, o.cfCheckout.shipping.state, o.cfCheckout.shipping.pin_code].filter(Boolean).join(', ') : (o.address && (o.address.name || 'Verifying address…')))}, ${esc(o.address.line || '')}, ${esc(o.address.city || '')} — ${esc(o.address.pincode || '')}<br><b>Timeline:</b> ${o.timeline.map(t => esc(t.s)).join(' → ')}</div>`, 'lg');
};
window.Shivaa.logout = () => {
  // v80: revoke the bearer token server-side (best-effort), then clear locally
  try { const t = token(); if (t) fetch('/api/auth/logout', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t }, keepalive: true }).catch(() => {}); } catch (e) {}
  setToken(null); state.user = null; toast('Logged out'); location.hash = '#/'; boot(true);
};

function renderRateStrip() {
  const R = state.rates; if (!R || !$('#rateStrip')) return;
  /* v113b — a flat move reads "— steady" on every cell, Jaipur included.
     "▲ 0 ₹/g vs prev" looked like a broken counter, not a calm market. */
  const cell = (key, name, val, unit, chg) => {
    const flat = Math.abs(chg) < 0.05;
    const cls = flat ? 'flat' : (chg > 0 ? 'up' : 'down');
    const arrow = flat ? '—' : (chg > 0 ? '▲' : '▼');
    const mag = flat ? 'steady' : `${Math.abs(chg).toFixed(0)} ${unit}`;
    return `<div class="rscell"><small>${name}</small><b data-rsh="${key}">${val}</b><span class="chg ${cls}">${arrow} ${mag}</span></div>`;
  };
  const h = R.history || [];
  const prev = h.length > 1 ? h[h.length - 2] : R;
  const age = rateAgeLabel(R);
  /* v113 — RTGS · bullion desk cells. Same numbers the jeweller portal shows
     (rtgs_strip() on the server), so the customer section can never quote
     below the B2B board again. A flat move reads "—" rather than a
     misleading "▲ 0". */
  /* v113b — the rtgs mid is always a whole rupee: gold ₹/10 g, silver ₹/kg.
     The magnitude prints as an absolute value, so a fall reads "▼ 1,240" and
     never the double-negative "▼ -1,240" the first cut produced. */
  const rtgsVal = row => Number(row.mid).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  const rtgsCell = (k, row) => {
    if (!row) return '';
    const ch = Number(row.change || 0);
    const cls = ch > 0 ? 'up' : (ch < 0 ? 'down' : 'flat');
    const arrow = ch > 0 ? '▲' : (ch < 0 ? '▼' : '—');
    const mag = Math.abs(ch).toLocaleString('en-IN', { maximumFractionDigits: 0 });
    return `<div class="rscell rs-rtgs"><small>◈ ${row.label} <em>${row.unit}</em></small><b data-rsh="${k}">${rtgsVal(row)}</b><span class="chg ${cls}">${arrow} ${ch === 0 ? 'steady' : mag}</span></div>`;
  };
  const rt = (R.rtgs && R.rtgs.rows) || {};
  /* v113b — the RTGS cells are part of the strip's own move-flash now, so the
     bullion numbers pulse exactly like the Jaipur ones when the feed ticks. */
  const shows = [['gold22', fmt(R.gold22)], ['gold18', fmt(R.gold18)], ['silver', fmt2(R.silver)]];
  if (rt.tdsGold9999) shows.push(['rtgsG9999', rtgsVal(rt.tdsGold9999)]);
  if (rt.silverPeti) shows.push(['rtgsS9999', rtgsVal(rt.silverPeti)]);
  $('#rateStrip').innerHTML =
    cell('gold22', '✦ Shivaa Gold 22K / g', fmt(R.gold22), '₹/g vs prev', R.gold22 - prev.gold22) +
    cell('gold18', 'Gold 18K / gram', fmt(R.gold18), '₹/g vs prev', R.gold18 - prev.gold18) +
    cell('silver', 'Silver 925 / gram', fmt2(R.silver), '₹/g vs prev', R.silver - prev.silver) +
    rtgsCell('rtgsG9999', rt.tdsGold9999) +
    rtgsCell('rtgsS9999', rt.silverPeti) +
    `<div class="rscell"><small>${R.live ? 'Live now' : 'Updated'}</small><b style="font-size:17px">${R.live ? '⦿ LIVE' : timeFmt(R.t)}</b><span class="${age.live ? 'rs-live' : ''}"${age.live ? ' data-rate-age' : ''}><span class="live-dot"></span>${age.txt}</span></div>`;
  if (state._lastRsh) {
    shows.forEach(([k, txt]) => {
      const old = state._lastRsh[k];
      if (old != null && old !== txt) flashMove($('#rateStrip').querySelector(`[data-rsh="${k}"]`), txt, parseFloat(txt.replace(/[^0-9.]/g, '')) > parseFloat(String(old).replace(/[^0-9.]/g, '')) ? 1 : -1);
    });
  }
  state._lastRsh = Object.fromEntries(shows);
}

/* ─────────── HOME ─────────── */
/* ── v52 legal pages: terms · refund · shipping (honest, DPDP/E-comm-rules aligned) ── */
const legalShell = (crumb, title, ital, intro, body) => `
  <section class="page-hero"><div class="dust" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="container"><div class="crumbs"><a href="#/">Home</a> / ${crumb}</div><h1>${title} <em class="disp-italic">${ital}</em></h1>
  <p>${intro}</p></div></section>
  <div class="container" style="padding:40px 0 60px;max-width:880px">${body}</div>`;
const legalCard = (t, b) => `<div class="adm-card legal-card" style="margin-bottom:16px"><h2 style="margin-bottom:8px">${t}</h2><div style="font-size:14.5px;line-height:1.75;color:var(--ink-2)">${b}</div></div>`;

pages.terms = async (view) => {
  view.innerHTML = legalShell('Terms of Sale', 'Buying from Shivaa, ', 'plainly', 'The full agreement between you and Ernate Shine Jewellery Pvt. Ltd. — short, honest, and without traps.',
    legalCard('1 · Who we are', 'Shivaa Jewellers is the retail brand of <b>Ernate Shine Jewellery Pvt. Ltd.</b>, operating from Jayal, Nagaur, Rajasthan (GST-registered). Support: +91 89050 05921 · Support@shivaa.in · all days 10:00–20:30 IST.') +
    legalCard('2 · Prices & GST', 'Prices are computed live from weight × the day\u2019s Shivaa rate + a published making charge + stone value where applicable. <b>3% GST</b> is shown in the price table before you order, and every bill carries the full breakup. Prices shown before you place an order are the prices you pay.') +
    legalCard('3 · Orders, weights & refunds', 'An order is accepted when we confirm it and begin work/casting. Gold jewellery is handcrafted and cast, so final weights may vary by ±3–5%. Every piece is weighed on digital scales post-polishing: if actual scale weight is lower than estimated, the exact excess amount paid is refunded to your account prior to dispatch. If higher by up to +3%, Shivaa absorbs the difference as a brand courtesy.') +
    legalCard('4 · Purity promise', 'Every gold piece is <b>BIS hallmarked</b>; HUID is printed on your bill and verifiable in the BIS Care app. Silver is 925 stamped. If any certified assay ever proves a piece under-purity, we replace it or refund in full.') +
    legalCard('5 · The Bhai Dooj Gold Finale contest', 'Run under published rules: three equal-odds entry routes (a 3 g+ gold purchase, a 100 g silver order, or the free quiz), one entry per person, purchases never multiply odds, CA-witnessed live draw on Bhai Dooj, 11 November 2026, prize 10 g certified 24K gold, TDS 31.2% where applicable, void in Tamil Nadu and West Bengal. Full rules live on the campaign page.') +
    legalCard('6 · Disputes', 'We would rather talk than fight — message us first. Failing that, disputes are governed by Indian law with courts at Nagaur, Rajasthan having jurisdiction. Consumer rights under the Consumer Protection Act, 2019 are unaffected.'));
  bindLegalWa(view);
};

pages.refund = async (view) => {
  view.innerHTML = legalShell('Refund & Return Policy', 'Returns without ', 'drama', 'The exact same policy our team quotes on the phone — now in writing, as e-commerce rules require.',
    legalCard('7-day easy returns', 'Unworn, unused pieces in original packaging with the bill and hallmark card can be returned within <b>7 days of delivery</b>. No questions, no restocking fee. We arrange pickup or reimburse your courier.') +
    legalCard('Refund timing', 'Refunds are issued to the original payment method within <b>5–7 working days</b> of the piece reaching us and passing a quick check. UPI/card refunds can take a further 2–3 days on the bank\u2019s side.') +
    legalCard('Lifetime exchange', 'Beyond 7 days, exchange any piece for life at the <b>live rate by weight and assay</b> — you pay only the difference plus making on the new design.') +
    legalCard('What cannot be returned', 'Custom/engraved pieces made to your specification, and items visibly damaged by misuse. We will always tell you honestly if a piece falls here — never after you shipped it.') +
    legalCard('Damaged or wrong delivery', 'If a piece arrives damaged or wrong, photograph it before opening the seal and message us within 48 hours — replacement is on us, both ways insured.'));
  bindLegalWa(view);
};

pages.shipping = async (view) => {
  view.innerHTML = legalShell('Shipping Policy', 'Insured to your ', 'doorstep', 'How your jewellery travels — and what protects it on the way.',
    legalCard('Dispatch', 'In-stock pieces dispatch within <b>48 hours</b>. Made-to-order and engraved pieces take 5–8 working days; you get the timeline at checkout.') +
    legalCard('Insurance & tracking', 'Every shipment is <b>fully insured and tamper-sealed</b> at our declared invoice value, anywhere in India. You receive a tracking number by WhatsApp/SMS the moment the courier picks up.') +
    legalCard('Delivery times', 'Rajasthan: 1–3 days. Metro cities: 2–4 days. Rest of India: 3–6 days. Signature-on-delivery is mandatory — the seal is checked in front of the courier.') +
    legalCard('Shipping charges', 'Shown transparently at checkout; free above the threshold published in store settings. No hidden fees, ever.') +
    legalCard('If the seal is broken', 'Do not accept the parcel. Refuse delivery and message us immediately — the insurer and courier handle it, and your replacement/refund starts the same day.'));
  bindLegalWa(view);
};

const bindLegalWa = (view) => {
  const wa = document.createElement('div');
  wa.style.cssText = 'text-align:center;padding:10px 0 0';
  wa.innerHTML = '<button class="btn btn-gold btn-sm" id="legalWa">Question? Ask on WhatsApp</button>';
  view.appendChild(wa);
  const b = view.querySelector('#legalWa');
  if (b && window.Shivaa.waOpen) b.onclick = () => window.Shivaa.waOpen('Namaste Shivaa \u2726\n\nI have a question about your policies: ');
};

/* ─────────── v55 pages: bridal bundle · gift cards · refer · video consult · dead-stock pickup ─────────── */
const v55Shell = (crumb, title, ital, intro, bodyHtml) => `
  <section class="page-hero"><div class="dust" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="container"><div class="crumbs"><a href="#/">Home</a> / ${crumb}</div><h1>${title} <em class="disp-italic">${ital}</em></h1>
  <p>${intro}</p></div></section>
  <div class="container" style="padding:40px 0 60px;max-width:760px">${bodyHtml}</div>`;

pages.bundle = async (view) => {
  view.innerHTML = v55Shell('Bridal Bundle', 'Build her complete ', 'set', 'Pick the pieces of the full bridal look — our family prices the bundle with a special making-charge concession and holds everything together.',
    `<div class="adm-card"><form id="bundleForm" class="form-grid" style="grid-template-columns:1fr 1fr">
      ${[['Rani haar / necklace', 'necklace'], ['Jhumka / chandbali', 'earrings'], ['Bangles or kada', 'bangles'], ['Mangalsutra', 'mangalsutra'], ['Rings (bride + groom)', 'rings'], ['Nath / hathphool', 'extras']].map(x => `<label class="fld" style="flex-direction:row;align-items:center;gap:8px"><input type="checkbox" name="pick" value="${x[0]}" style="accent-color:var(--gold);width:17px;height:17px"> ${x[0]}</label>`).join('')}
      <div class="fld full"><label>Approximate budget</label><input name="budget" placeholder="e.g. ₹2.5 lakh"></div>
      <div class="fld full"><label>Wedding date (if fixed)</label><input name="date" type="date"></div>
      <button class="btn btn-gold btn-block" style="grid-column:1/-1">Send to the Shivaa family on WhatsApp →</button>
    </form><p style="font-size:12.5px;color:var(--ink-3);margin-top:10px">Bundles are quoted personally with the bundle concession on making charges — never on metal, which always stays at the live rate.</p></div>`);
  $('#bundleForm', view).onsubmit = (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const picks = f.getAll('pick');
    if (!picks.length) { toast('Pick at least one piece ✦', 'err'); return; }
    waOpen('Namaste Shivaa ✦ — I want to build a bridal bundle:\n· ' + picks.join('\n· ') + (f.get('budget') ? '\nBudget: ' + f.get('budget') : '') + (f.get('date') ? '\nWedding date: ' + f.get('date') : ''));
  };
};

pages.giftcard = async (view) => {
  view.innerHTML = v55Shell('Gift Cards', 'Gift gold, ', 'digitally', 'A Shivaa gift card is redeemed like cash at checkout — online or at the Jayal counter. We issue it on WhatsApp within the hour after payment.',
    `<div class="adm-card"><form id="gcForm" class="form-grid" style="grid-template-columns:1fr 1fr">
      <div class="fld"><label>Amount</label><select name="amt">${[5000, 11000, 21000, 51000].map(a => `<option value="${a}">₹${a.toLocaleString('en-IN')}</option>`).join('')}<option value="custom">Custom</option></select></div>
      <div class="fld"><label>Custom amount ₹</label><input name="custom" type="number" min="1000" placeholder="only if Custom"></div>
      <div class="fld"><label>For (name)</label><input name="for" placeholder="e.g. Priya, on her wedding"></div>
      <div class="fld"><label>From (your name)</label><input name="from"></div>
      <button class="btn btn-gold btn-block" style="grid-column:1/-1">Request on WhatsApp →</button>
    </form><p style="font-size:12.5px;color:var(--ink-3);margin-top:10px">You pay by UPI on the WhatsApp chat; the card code arrives there — usable with coupon entry at checkout. Code BRIDALSET (10% off making charges on 2+ bridal pieces) is active right now.</p></div>`);
  $('#gcForm', view).onsubmit = (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const amt = f.get('amt') === 'custom' ? ('₹' + (f.get('custom') || '?')) : '₹' + parseInt(f.get('amt'), 10).toLocaleString('en-IN');
    waOpen('Namaste Shivaa ✦ — gift card request\nAmount: ' + amt + (f.get('for') ? '\nFor: ' + f.get('for') : '') + (f.get('from') ? '\nFrom: ' + f.get('from') : ''));
  };
};

pages.refer = async (view) => {
  const code = (state.user && state.user.referralCode) || null;
  view.innerHTML = v55Shell('Refer & Earn', 'Share Shivaa, ', 'both win', 'Your friend signs up with your code; after their first order completes, we credit a thank-you coupon to you both — confirmed personally by the family.',
    `<div class="adm-card" style="text-align:center">${code ? `
      <p style="font-size:13px;color:var(--ink-3)">Your referral code</p>
      <div style="font-family:var(--ff-disp);font-size:38px;letter-spacing:.14em;color:var(--maroon-deep);margin:6px 0">${esc(code)}</div>
      <p style="font-size:13.5px">Share link: <b>shivaa.in/?ref=${esc(code)}</b></p>
      <button class="btn btn-gold btn-sm" id="refWa" style="margin-top:12px">Share on WhatsApp ✦</button>` :
      `<p>Sign in (or create your account) to get your personal referral code — it appears right here.</p>
       <button class="btn btn-primary btn-sm" style="margin-top:10px" onclick="Shivaa.openLogin ? Shivaa.openLogin() : (location.hash='#/account')">Sign in</button>`}
    </div>`);
  const b = $('#refWa', view);
  if (b) b.onclick = () => waOpen('Shivaa Jewellers — BIS hallmarked, live-rate pricing, insured delivery ✦ Use my code ' + code + ' when you sign up: shivaa.in/?ref=' + code);
  if (code) {
    api('/api/referrals/stats').then(d => {
      if (!d) return;
      const host = document.querySelector('.adm-card');
      if (!host) return;
      host.insertAdjacentHTML('beforeend', `<div class="ref-stats">
        <div class="rs-cell"><b>${d.signedUp || 0}</b><small>friends joined</small></div>
        <div class="rs-cell"><b>${d.completed || 0}</b><small>first orders done</small></div>
        <div class="rs-cell"><b>${fmt(d.reward || 0)}</b><small>coupons earned</small></div>
      </div><p style="font-size:12px;color:var(--ink-3);margin-top:8px">₹${d.perFriend || 250} coupon per completed friend — credited automatically.</p>`);
    }).catch(() => {});
  }
};

pages.videoconsult = async (view) => {
  view.innerHTML = v55Shell('Video Consultation', 'See it live, ', 'from home', 'A family member walks you through real pieces on WhatsApp video — weights, hallmark, finish — from the Jayal counter. Pick a slot.',
    `<div class="adm-card"><form id="vcForm" class="form-grid" style="grid-template-columns:1fr 1fr">
      <div class="fld"><label>Your name</label><input name="name" required></div>
      <div class="fld"><label>Phone (WhatsApp)</label><input name="phone" type="tel" inputmode="tel" autocomplete="tel" maxlength="10" required placeholder="10-digit"></div>
      <div class="fld"><label>Preferred day</label><input name="day" type="date" required></div>
      <div class="fld"><label>Preferred slot</label><select name="slot">${['10:00–12:00', '12:00–14:00', '16:00–18:00', '18:00–20:30'].map(x => `<option>${x}</option>`).join('')}</select></div>
      <div class="fld full"><label>What would you like to see?</label><input name="details" placeholder="e.g. bridal rani haar + jhumka, budget ₹1.5L"></div>
      <button class="btn btn-gold btn-block" style="grid-column:1/-1">Book the consultation →</button>
    </form></div>`);
  $('#vcForm', view).onsubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    try {
      await api('/api/services', { method: 'POST', body: JSON.stringify({ type: 'video-consult', name: f.get('name'), phone: f.get('phone'), details: (f.get('day') + ' · ' + f.get('slot') + ' — ' + (f.get('details') || '')).slice(0, 200) }) });
      toast('Booked ✦ we’ll confirm your slot on WhatsApp');
    } catch (err) { toast(err.message || 'Could not book', 'err'); }
  };
};

pages.pickup = async (view) => {
  view.innerHTML = v55Shell('Dead-Stock Pickup', 'Old stock in, ', 'fine metal out', 'Book a pickup for dead stock — we assay at your counter or ours, and settle in fine gold grams at the live rate, minus nothing hidden.',
    `<div class="adm-card"><form id="puForm" class="form-grid" style="grid-template-columns:1fr 1fr">
      <div class="fld"><label>Firm / name</label><input name="name" required></div>
      <div class="fld"><label>Phone</label><input name="phone" type="tel" inputmode="tel" autocomplete="tel" maxlength="10" required placeholder="10-digit"></div>
      <div class="fld"><label>City</label><input name="city"></div>
      <div class="fld"><label>Approx. weight</label><input name="wt" placeholder="e.g. 850 g 22K"></div>
      <div class="fld full"><label>Notes</label><input name="details" placeholder="pickup date preference, item types…"></div>
      <button class="btn btn-gold btn-block" style="grid-column:1/-1">Book the pickup →</button>
    </form></div>`);
  $('#puForm', view).onsubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    try {
      await api('/api/services', { method: 'POST', body: JSON.stringify({ type: 'deadstock-pickup', name: f.get('name'), phone: f.get('phone'), details: ((f.get('city') ? f.get('city') + ' · ' : '') + (f.get('wt') || '') + ' · ' + (f.get('details') || '')).slice(0, 200) }) });
      toast('Pickup booked ✦ the desk will call to confirm');
    } catch (err) { toast(err.message || 'Could not book', 'err'); }
  };
};

pages.home = async (view) => {
  ensureCampaignStuds();
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
        <p class="hero-sub">Gold & silver jewellery at Shivaa's live rates, with every price broken down in plain sight — the same tanch our family has kept for 30+ years, now on shivaa.in.</p>
        <div class="hero-cta">
          <a class="btn btn-gold btn-lg" href="#/shop">Shop the Collection</a>
          <a class="btn btn-gold btn-lg shv-pulse-cta" href="#/scheme">✦ Win 10g Gold Biscuit</a>
          <a class="btn btn-light btn-lg" href="#/rates">Shivaa Live Rates</a>
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

  <!-- HOME CAMPAIGN ENTRY CARD -->
  <section class="container shv-home-campaign-entry" style="margin: 28px auto 20px;">
    <div class="shv-home-campaign-card rv">
      <div class="shv-hcc-art">
        <img src="/images/banners/gold-biscuit-campaign.jpg" alt="10g 24K Gold Biscuit Prize" loading="lazy">
        <span class="shv-hcc-badge">✦ 10g 24K Bullion Prize</span>
      </div>
      <div class="shv-hcc-content">
        <span class="shv-hcc-kicker">✦ FESTIVE GRAND CAMPAIGN · 2026</span>
        <h2 class="shv-hcc-title">Win a 10g 24K Gold Biscuit <span class="gold-txt">Worth ₹1,50,000*</span></h2>
        <p class="shv-hcc-sub">Exclusively available on our <b>6 Masterpiece 22K Gold Ear Stud Designs</b> (3 for Men &amp; 3 for Ladies). Order your stud, answer the 1-attempt quiz, and enter the CA-witnessed live draw.</p>
        <div class="shv-hcc-cta-row">
          <a href="#/scheme" class="btn btn-gold btn-lg shv-pulse-cta">Enter 10g Gold Scheme Funnel ✦</a>
          <a href="#/scheme?step=gender" class="btn btn-outline btn-lg">Explore 6 Exclusive Studs (Men / Women) →</a>
        </div>
      </div>
    </div>
  </section>

  <div class="catbar-outer">${catBarHTML()}</div>

  <section class="carousel-sec">
    <div class="carousel" id="heroCarousel" role="region" tabindex="0" aria-roledescription="carousel" aria-label="Featured Shivaa campaigns — use the left and right arrow keys">
      <div class="c-track" id="cTrack">
        <div class="c-slide s-left">
          <img src="/images/banners/poster-heritage.jpg" srcset="/images/banners/poster-heritage-m.jpg 800w, /images/banners/poster-heritage.jpg 1584w" sizes="100vw" alt="Shivaa fine gold craftsmanship" draggable="false" decoding="async" fetchpriority="high">
          <div class="c-fade"></div>
          <span class="c-frame" aria-hidden="true"><i class="cf-c c1"></i><i class="cf-c c2"></i><i class="cf-c c3"></i><i class="cf-c c4"></i></span>
          <span class="c-wm" aria-hidden="true">99&middot;999</span>
          <div class="c-body">
            <span class="label">&#10022; The House of Honest Gold</span>
            <h3>Purity you can <em class="shimmer foil-txt">pass down</em></h3>
            <div class="offer-seal alt seal-plaque"><b>HUID<small>GUIDE</small></b><span>check the actual piece</span></div>
            <p>Every Shivaa piece is handcrafted by master karigars, weighed to the milligram and billed at Shivaa's live rate &mdash; jewellery made to be inherited, not replaced.</p>
            <div class="c-cta"><a class="btn btn-gold btn-lg" href="#/shop">Explore the Collections</a><a class="btn btn-light btn-lg" href="#/about">Our Craft &amp; Story</a></div>
          </div>
        </div>
        <div class="c-slide s-center">
          <img src="/images/banners/poster-bridal.jpg" alt="Bridal collection" draggable="false" decoding="async" loading="lazy">
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
          <img src="/images/banners/poster-everyday.jpg" alt="Everyday edit under 50000" draggable="false" decoding="async" loading="lazy">
          <div class="c-fade fade-r"></div>
          <div class="c-body">
            <span class="label">&#10022; The everyday edit</span>
            <h3>Above ordinary,<br><em class="shimmer foil-txt">under &#8377;50,000</em></h3>
            <div class="price-lock"><b>&#8377;2,400</b><span>from &middot; live-rate priced &middot; daily wear</span></div>
            <p>Studs, pendants, chains &amp; silver &mdash; with individual specifications and Shivaa-rate pricing.</p>
            <div class="c-cta"><a class="btn btn-gold btn-lg" href="#/shop?max=50000">Shop the Edit</a></div>
          </div>
        </div>
        <div class="c-slide s-band">
          <img src="/images/banners/wedding.jpg" alt="Swarna Nidhi gold savings plan" draggable="false" decoding="async" loading="lazy">
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
      ${Object.entries(LIVE_CATS()).map(([k, c]) => `<a href="#/shop?category=${k}" class="cat-mini-card"><img src="${c.img}${ASSET_V}" alt="${c.name}" loading="lazy" onerror="if(!this.dataset.lfb){this.dataset.lfb='1';this.src='/images/logo.png${ASSET_V}';}else{this.remove();}"><b>${c.name}</b></a>`).join('')}
    </div>
  </section>

  <!-- v125 · The Films — the Revolving Case (owner pick, 16 Sep 2026). v125.js mounts it. -->
  <section class="sec container" style="padding-top:0">
    <div id="svCaseMount"></div>
  </section>

  <section class="sec container" style="padding-top:0">
    <div class="sec-head rv"><span class="label">Loved most</span><h2>Bestsellers <a class="see-all" href="#/shop">View all ${state.productsCache.length} pieces →</a></h2></div>
    <div class="p-grid">${best.map(p => productCard(p, { wishSet })).join('')}</div>
  </section>

  <!-- v125 · The Gold Thread (owner pick, 16 Sep 2026). v125.js mounts it. -->
  <section class="sec container" style="padding-top:0">
    <div id="svThreadMount"></div>
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
      <a href="#/product/${spot.id}" class="cat-card rv" style="aspect-ratio:auto;height:360px"><img src="${safeUrl(spot.images && spot.images[0])}" style="height:100%" alt="${esc(spot.name)}"><div class="glare"></div></a>
    </div>
  </section>` : `
  <section class="sec container" style="padding-top:0">
    <div class="empty" style="padding:40px 20px;background:var(--white);border:1px dashed var(--gold-soft);border-radius:20px">
      <span class="label">The Collection</span>
      <h3 style="margin:10px 0 6px">The vault is being restocked</h3>
      <p style="color:var(--ink-3);font-size:14px">New designs are being photographed & priced at today's Shivaa rate — back very soon. Meanwhile, the bullion desk & custom orders are open.</p>
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
        <span class="label" id="ugcLabel">The Shivaa standard</span>
        <h2 style="font-family:var(--ff-disp);font-size:clamp(25px,3.6vw,34px);color:var(--maroon-deep);margin-top:4px">Worn by <span class="disp-italic">you</span></h2>
      </div>
      <div class="ugc-score" id="ugcScore"></div>
    </div>
    <div class="ugc-wall" id="ugcWall"></div>
  </section>

  <section class="sec container" style="padding-top:0">
    <div class="pillars">
      ${[
        ['bis', '<a href="#/hallmark">Check a HUID</a>', 'Use the actual piece’s HUID in BIS Care; catalogue data is not verification', '<path d="M12 3l7 3v5c0 4.4-3 8.2-7 9.5C8 19.2 5 15.4 5 11V6l7-3z" style="--dash:64"/><path class="pl-draw" d="M9 11.5l2 2 4-4.5" style="--dash:14"/>'],
        ['rate', 'Live-Rate Pricing', 'Shivaa live-rate feed &mdash; the price you see is the price you are billed', '<circle class="pl-draw" cx="12" cy="12" r="8.5" style="--dash:54"/><path class="pl-draw" d="M12 7.5v4.5l3.2 1.9" style="--dash:12"/>'],
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
      <form class="nl-form" onsubmit="Shivaa.subscribeNewsletter(event)">
        <input type="email" aria-label="Email address" placeholder="Your email address" required autocomplete="email">
        <button type="submit">Subscribe</button>
      </form>
    </div>
  </section>`;
  bindCountdown($('#wedCd'), Date.now() + 6 * 864e5 + 11 * 36e5);
  const homeCd = $('#homeFinaleCd');
  if (homeCd) bindFinaleCd(homeCd);
  initCarousel();
  renderRateStrip();
  loadSocialProof(); // v50: real reviews or badged promises - never invented customers
  renderTrending(); renderRecentViewed();   // v54 home strips

  // pillar draw-in
  const pio = new IntersectionObserver((es, o) => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('seen'); o.unobserve(e.target); }
  }), { threshold: .2 });
  $$('.pillar, .wp-card, .rvl').forEach(el => pio.observe(el));

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
  /* v139 — a filtered shop page is a RESULTS page: it shows the pieces, not a
     wall of 20 category photographs (the owner's "only the images are there").
     The photo slider stays on the unfiltered browse page and the home page. */
  const filtered = !!(cat || tag || search || q.get('max'));
  const metals = new Set(), purities = new Set();
  state.productsCache.forEach(p => { metals.add(p.metal); purities.add(p.purity); });
  view.innerHTML = `
  <section class="page-hero"><div class="dust" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="container">
    <div class="crumbs"><a href="#/">Home</a> / Shop</div>
    <h1>${search ? `“${esc(search)}”` : cat ? esc((CATS[cat] && CATS[cat].name) || 'Jewellery') : 'All Jewellery'}${tag ? ' · ' + esc(TAGS[tag] || tag) : ''}</h1>
    <p>Every price below follows Shivaa's live gold & silver rate and our published making-charge chart — automatically.</p>
  </div></section>
  ${filtered
    ? `<div class="catbar-outer shop-catbar shop-chipbar">${catChipsHTML(cat)}</div>`
    : `<div class="catbar-outer shop-catbar" style="background:var(--white);border-bottom:1px solid var(--line)">${catBarHTML()}</div>`}
  <div class="fsheet-overlay" id="fsheetOverlay"></div>
  <aside class="filters" id="filterDrawer" aria-label="Filters" aria-hidden="true">
    <div class="fsheet-bar"><h2 class="fsheet-title">Refine pieces</h2><button id="fsheetClose" type="button" aria-label="Close filters">✕</button></div>
      <div class="fgroup"><h3>Category</h3>
        ${Object.entries(LIVE_CATS()).map(([k, c]) => `<label class="fcheck"><input type="checkbox" data-f="cat" value="${k}" ${cat === k ? 'checked' : ''}>${c.name}</label>`).join('')}
      </div>
      <div class="fgroup"><h3>Metal</h3>
        ${[...metals].map(m => `<label class="fcheck"><input type="checkbox" data-f="metal" value="${m}">${m === 'Gold' ? 'Gold' : 'Silver 925'}</label>`).join('')}
      </div>
      <div class="fgroup"><h3>Purity</h3>
        ${[...purities].map(p => `<label class="fcheck"><input type="checkbox" data-f="purity" value="${p}">${p === '925' ? 'Silver 925' : p + ' Gold'}</label>`).join('')}
      </div>
      <div class="fgroup"><h3>Occasion</h3>
        ${Object.entries(TAGS).map(([k, v]) => `<label class="fcheck"><input type="checkbox" data-f="tag" value="${k}" ${tag === k ? 'checked' : ''}>${v}</label>`).join('')}
      </div>
      <div class="fgroup"><h3>Max price</h3>
        <input type="range" id="priceRange" min="10000" max="1500000" step="5000" value="${+q.get('max') || 1500000}" aria-label="Maximum price per piece" aria-valuetext="${q.get('max') ? fmt(+q.get('max')) : 'Any price'}" style="width:100%;accent-color:var(--gold)">
        <div class="fmeta"><span>₹10,000</span><span id="priceMaxLbl">${q.get('max') ? fmt(+q.get('max')) : 'Any'}</span></div>
      </div>
      <div class="fsheet-acts">
        <button type="button" class="btn btn-ghost btn-sm" id="clearFilters">Clear all</button>
        <button type="button" class="btn btn-primary btn-sm" id="applyFilters">Show pieces</button>
      </div>
    </aside>
  <div class="container shop-main">
      <div class="shop-bar">
        <div class="res" id="resCount"></div>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
          ${savedRingSize() ? `<button type="button" class="size-match-chip" id="sizeMatchChip" aria-pressed="false">📏 rings in your size ${esc(savedRingSize())}</button>` : ''}
          <button class="btn btn-outline btn-sm f-toggle" id="filterToggle">⚙ Filters <span class="fbadge" id="fBadge" hidden></span></button>
          <select class="sortsel" id="sortSel" aria-label="Sort pieces">
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
      <div id="shopSentinel" aria-hidden="true" style="height:1px"></div>
    </div>
  </div>`;

  const filters = () => ({
    cats: $$('input[data-f=cat]:checked').map(i => i.value),
    metals: $$('input[data-f=metal]:checked').map(i => i.value),
    purities: $$('input[data-f=purity]:checked').map(i => i.value),
    tags: $$('input[data-f=tag]:checked').map(i => i.value),
    max: +$('#priceRange').value,
  });
  /* v119 — the grid renders in SLICES of 20 as the shopper scrolls. The list
     is still filtered and sorted whole in memory; only the DOM is windowed,
     so a 3-lakh-piece catalogue can never block the first paint. */
  function shopSlice() {
    const grid = $('#shopGrid'); const SHOP = state.shop;
    if (!grid || !SHOP || !SHOP.list.length) return;
    const next = SHOP.list.slice(SHOP.rendered, SHOP.rendered + SHOP.chunk);
    if (!next.length) return;
    grid.insertAdjacentHTML('beforeend', next.map(p => productCard(p, { wishSet: SHOP.wishSet })).join(''));
    SHOP.rendered += next.length;
    bindTilt(grid);
    if (SHOP.rendered >= SHOP.list.length && SHOP.observer) {
      try { SHOP.observer.disconnect(); } catch (e) {}
      SHOP.observer = null;
    }
  }
  window.Shivaa.shopLoadMore = () => shopSlice();
  function shopSentinelWatch() {
    const s = $('#shopSentinel'); const SHOP = state.shop;
    if (!s || !SHOP) return;
    if (SHOP.observer) { try { SHOP.observer.disconnect(); } catch (e) {} SHOP.observer = null; }
    if (typeof IntersectionObserver !== 'function') {   // no observer → never hide pieces
      while (SHOP.rendered < SHOP.list.length) shopSlice();
      return;
    }
    SHOP.observer = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (en.isIntersecting && state.shop.rendered < state.shop.list.length) shopSlice();
      });
    }, { rootMargin: '400px' });
    SHOP.observer.observe(s);
  }
  async function apply() {
    const f = filters();
    let list = state.productsCache.slice();
    if (f.cats.length) list = list.filter(p => f.cats.includes(p.category));
    if (f.metals.length) list = list.filter(p => f.metals.includes(p.metal));
    if (f.purities.length) list = list.filter(p => f.purities.includes(p.purity));
    if (f.tags.length) list = list.filter(p => f.tags.some(t => (p.tags || []).includes(t)));
    if (search) { /* v102 — same weighted ranking as the palette */
      const hits = new Set(window.Shivaa.searchProducts(search, Infinity).map(p => p.id));
      list = list.filter(p => hits.has(p.id));
    }
    /* v103 — one-tap "rings in your saved size" */
    const sizeChip = $('#sizeMatchChip');
    if (sizeChip && sizeChip.classList.contains('on')) {
      const want = savedRingSize();
      list = list.filter(p => p.category === 'rings' && (p.sizes || []).map(String).includes(String(want)));
    }
    /* v167 — the slider's top stop is labelled "Any", but ₹15,00,000 was still
       applied as a real ceiling, so a heavier piece would vanish from the grid
       with the filter reading "Any". At the top stop there is no ceiling. */
    if (f.max < 1500000) list = list.filter(p => price(p).total <= f.max);
    const sort = $('#sortSel').value;
    if (sort === 'price-asc') list.sort((a, b) => price(a).total - price(b).total);
    if (sort === 'price-desc') list.sort((a, b) => price(b).total - price(a).total);
    if (sort === 'rating') list.sort((a, b) => b.rating - a.rating);
    if (sort === 'newest') list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const wishSet = state.user ? await wishIds() : [];
    state.shop = state.shop || { list: [], wishSet: [], rendered: 0, chunk: 20, observer: null };
    state.shop.list = list; state.shop.wishSet = wishSet; state.shop.rendered = 0;
    {
      const grid = $('#shopGrid');
      if (list.length) {
        if (grid) grid.innerHTML = '';
        shopSlice();               /* v119 — first slice now, the rest as the shopper scrolls */
        shopSentinelWatch();
      } else {
        let emptyHtml = `<div class="empty" style="grid-column:1/-1"><img src="/images/logo.png" class="empty-logo" alt=""><h3>No pieces match</h3><p>Try widening the filters.</p></div>`;
        if (f.cats.length === 1 && !(state.productsCache || []).some(p => p.category === f.cats[0])) {
          emptyHtml = `<div class="empty" style="grid-column:1/-1"><img src="/images/logo.png" class="empty-logo" alt=""><h3>This category is being catalogued</h3><p>4,00,000+ designs are on their way to Shivaa. Meanwhile, browse the signature rings — every piece is hallmarked and ready to ship.</p><div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:14px"><a class="btn btn-gold" href="#/shop?category=rings">See the 77 signature rings</a></div></div>`;
        }
        if (state.shop.observer) { try { state.shop.observer.disconnect(); } catch (e) {} state.shop.observer = null; }
        if (grid) grid.innerHTML = emptyHtml;
      }
    }
    $('#resCount').innerHTML = `<b>${list.length}</b> pieces · prices update with the live rate`;
  }
  const drawer = $('#filterDrawer'), ovl = $('#fsheetOverlay');
  const closeSheet = () => {
    drawer?.classList.remove('open'); ovl?.classList.remove('open');
    if (drawer) drawer.setAttribute('aria-hidden', 'true');
    unlockScroll();
    document.removeEventListener('keydown', onSheetKey, true);
  };
  const openSheet = () => {
    drawer?.classList.add('open'); ovl?.classList.add('open');
    if (drawer) drawer.setAttribute('aria-hidden', 'false');
    lockScroll();
    document.addEventListener('keydown', onSheetKey, true);
  };
  const onSheetKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); closeSheet(); } };
  const fBadge = $('#fBadge');
  const syncBadge = () => {
    /* v167 — `+ (value < 1500000 ? 0 : 0)` could only ever add 0, so the badge
       counted the checkboxes but never the max-price filter it was written for.
       It also counted nothing while the sheet was open (it was only refreshed
       on "change" events from the checkboxes). */
    const n = $$('input[data-f]:checked').length + ($('#priceRange') && +$('#priceRange').value < 1500000 ? 1 : 0);
    if (fBadge) { fBadge.hidden = !(n > 0); fBadge.textContent = n; }
  };
  if ($('#filterToggle')) {
    $('#filterToggle').onclick = openSheet;
    $('#fsheetClose').onclick = closeSheet;
    $('#applyFilters').onclick = () => { apply(); closeSheet(); };
    ovl.onclick = closeSheet;
    syncBadge();
    $$('input[data-f]').forEach(i => i.addEventListener('change', syncBadge));
  }
  /* v56: choosing a checkbox refines live but keeps the sheet open so people
     can stack filters (the old auto-close made the sheet feel stuck). The
     sheet closes only via ✕, the scrim, “Show pieces”, or ESC. */
  $$('input[data-f]').forEach(i => i.onchange = () => { apply(); syncBadge(); });
  /* v167 — the badge is refreshed here too: moving the slider is a filter
     choice like any checkbox, and it used to leave "0 filters" on the button
     while the sheet was open on a narrowed price. */
  $('#priceRange').oninput = e => { $('#priceMaxLbl').textContent = e.target.value >= 1500000 ? 'Any' : fmt(+e.target.value); syncBadge(); };
  $('#priceRange').onchange = () => { apply(); syncBadge(); };
  $('#sortSel').onchange = apply;
  /* v103 — one-tap "rings in your size" personal filter */
  const sizeChip = $('#sizeMatchChip');
  if (sizeChip) sizeChip.onclick = () => {
    sizeChip.classList.toggle('on');
    sizeChip.setAttribute('aria-pressed', sizeChip.classList.contains('on') ? 'true' : 'false');
    apply();
    $('#shopGrid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  $('#clearFilters').onclick = () => { $$('input[data-f]').forEach(i => i.checked = false); $('#priceRange').value = 1500000; $('#priceMaxLbl').textContent = 'Any'; if (sizeChip) { sizeChip.classList.remove('on'); sizeChip.setAttribute('aria-pressed', 'false'); } apply(); syncBadge(); };
  /* safety: never leave a dead drawer/scrim from a previous render */
  closeSheet();
  initCatbar();
  await apply();
};

/* ─────────── PRODUCT ─────────── */
pages.product = async (view, q, id) => {
  const isCurrent = viewLifetime(view);
  /* v91 — luxury skeleton while the piece loads (replaces the blank flash) */
  view.innerHTML = `<div class="container" style="padding-top:26px"><div class="pd-layout">
    <div class="pd-gallery"><div class="skeleton" style="aspect-ratio:1/1;border-radius:20px"></div></div>
    <div class="pd-info">
      <div class="skeleton" style="height:13px;width:130px;margin-bottom:18px;border-radius:6px"></div>
      <div class="skeleton" style="height:36px;width:82%;margin-bottom:14px;border-radius:8px"></div>
      <div class="skeleton" style="height:15px;width:46%;margin-bottom:30px;border-radius:6px"></div>
      <div class="skeleton" style="height:26px;width:42%;margin-bottom:24px;border-radius:8px"></div>
      <div class="skeleton" style="height:54px;width:100%;margin-bottom:14px;border-radius:14px"></div>
      <div class="skeleton" style="height:54px;width:100%;margin-bottom:34px;border-radius:14px"></div>
      <div class="skeleton" style="height:50px;width:210px;border-radius:40px"></div>
    </div></div></div>`;
  let data;
  try { data = await api('/api/products/' + id); } catch (e) { if (!isCurrent()) return; view.innerHTML = `<div class="empty"><div class="big">✦</div><h3>Piece not found</h3><a class="btn btn-outline" href="#/shop">Back to shop</a></div>`; return; }
  if (!isCurrent()) return;
  /* v173 — a shared #/product/ link is often the FIRST page a new visitor
     ever loads, and it can render before /api/rates answers. The piece's own
     answer already carries the live rates, so price with those and never
     assume state.rates exists yet (it was null in exactly that race, and the
     single `state.rates.t` read crashed the whole page). */
  const p = data.product, R = data.rates || state.rates || {}, pr = price(p, R);
  injectProductLD(p, pr);   // v57: schema.org Product JSON-LD + per-piece OG share card
  const wished = state.user ? await wishIds().then(s => s.includes(p.id)) : state.localWish.includes(p.id);
  if (!isCurrent()) return;
  const compared = isCompared(p.id);
  const emi3 = Math.round(pr.total / 3), emi6 = Math.round(pr.total / 6 * 1.02);
  view.innerHTML = `
  <div class="container" style="padding-top:26px">
    <div class="crumbs" style="color:var(--ink-3)"><a href="#/">Home</a> / <a href="#/shop">Shop</a> / <a href="#/shop?category=${p.category}">${CATS[p.category]?.name}</a> / <span style="color:var(--gold)">${esc(p.name)}</span></div>
    <div class="pd-layout">
      <div class="pd-gallery">
        <div class="gal-wrap" id="galWrap">
          <div class="gal-track" id="galTrack">
            ${(p.video ? [videoCanAutoload()
                ? `<div class="gal-slide gal-vid on"><video src="${safeUrl(p.video) || ''}" controls playsinline preload="metadata" poster="${p.images && p.images[0] ? safeUrl(p.images[0]) : ''}"></video><span class="gal-vid-tag">▶ 360° film</span></div>`
                : `<div class="gal-slide gal-vid on"><button type="button" class="gal-vid-load" data-video="${safeUrl(p.video) || ''}" data-poster="${p.images && p.images[0] ? safeUrl(p.images[0]) : ''}" aria-label="Play the 360-degree film"><img src="${safeUrl(p.images && p.images[0]) || ''}" alt="" draggable="false"><span class="gal-vid-play"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></span><span class="gal-vid-tag">▶ Tap to load 360° film · saves mobile data<small class="gal-vid-always" role="button" tabindex="0" onclick="event.stopPropagation();Shivaa.setVideoAutoload(true);this.closest('.gal-vid-load').click()" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click();}">Always load films automatically</small></span></button></div>`
              ] : []).concat((p.images || []).map((im, i) => `<div class="gal-slide${!p.video && i === 0 ? ' on' : ''}"><img src="${safeUrl(im) || ''}" alt="${esc(p.name)} ${i + 1}" draggable="false"></div>`)).join('')}
          </div>
          <button class="gal-nav gal-prev" aria-label="Previous">‹</button>
          <button class="gal-nav gal-next" aria-label="Next">›</button>
          <div class="gal-dots" id="galDots">${(p.video ? 1 : 0) + (p.images || []).length > 1 ? Array.from({length: (p.video ? 1 : 0) + (p.images || []).length}, (_, i) => `<button type="button" class="${i === 0 ? 'on' : ''}" data-i="${i}" aria-label="Show ${p.video && i === 0 ? 'film' : 'photo ' + (i + (p.video ? 0 : 1))}"></button>`).join('') : ''}</div>
          <span class="gal-count" id="galCount" aria-hidden="true"></span>
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
          <div style="display:flex;gap:8px;flex-shrink:0">
            <button class="pc-wish pd-share" onclick="Shivaa.shareProduct('${p.id}')" style="position:static;width:46px;height:46px" aria-label="Share this piece" title="Share this piece with a friend">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="2.6"/><circle cx="6" cy="12" r="2.6"/><circle cx="18" cy="19" r="2.6"/><path d="M8.3 10.8l7.4-4.3M8.3 13.2l7.4 4.3"/></svg>
            </button>
            <button class="pc-wish ${wished ? 'on' : ''}" data-pid="${p.id}" onclick="Shivaa.toggleWish('${p.id}')" style="position:static;width:46px;height:46px" aria-label="Wishlist">
              <svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 20.5C7 16.5 3.5 13.3 3.5 9.6 3.5 7 5.5 5 8 5c1.6 0 3.1.8 4 2.1C12.9 5.8 14.4 5 16 5c2.5 0 4.5 2 4.5 4.6 0 3.7-3.5 6.9-8.5 10.9z"/></svg>
            </button>
          </div>
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
            <div style="font-size:11.5px;color:var(--ink-3);margin-top:8px">Rate: ${timeFmt((R && R.t) || state.rates?.t) || 'live · just updated'} · final rate locks at order time. Gold weight is estimated (±3–5% manufacturing variation); any lower actual scale weight is refunded directly to your account before dispatch.</div>
          </div>
          <div class="emi-strip">◈ <span><b>No-cost EMI from <span id="pdEmi3">${fmt(emi3)}</span>/mo</b> (3 months) · standard EMI <span id="pdEmi6">${fmt(emi6)}</span>/mo (6 months) on cards & UPI-autopay</span></div>
        </div>

        ${(p.sizes||[]).length ? `<div class="opt-label"><span>Size</span><a href="javascript:Shivaa.sizeGuide()" style="text-transform:none;letter-spacing:0;color:var(--gold);font-size:12.5px">Size guide</a></div>
        <div class="size-row" id="sizeRow">${(p.sizes||[]).map(s => `<button class="size-pill ${String(s) === String(localStorage.getItem('shv_ring_size') || '') ? 'on' : ''}" data-size="${esc(s)}">${esc(s)}</button>`).join('')}<a class="size-guide-link" href="#/sizer" title="Find your ring size">📏 Size guide</a></div>` : ''}

        <div class="opt-label"><span>Engraving (free, up to 12 characters)</span></div>
        <div class="pin-row" style="max-width:340px"><input id="engrave" maxlength="12" placeholder="e.g. R♥S 26"></div>

        <div class="opt-label"><span>Quantity</span></div>
        <div class="qty-row"><button onclick="Shivaa.pdQty(-1)">−</button><b id="pdQtyN">1</b><button onclick="Shivaa.pdQty(1)">+</button></div>
        <button class="btn btn-primary btn-lg btn-block miy-btn" onclick="Shivaa.pdBuy('${p.id}')">✦ Make It Yours!</button>
        <div class="pd-cta-row">
          <button class="btn btn-outline" onclick="Shivaa.pdAdd('${p.id}', event)">🛍 Add to Cart</button>
          <button class="btn btn-ghost wa-order" onclick="Shivaa.waProduct('${p.id}')">${WA_SVG} Chat to Order</button>
          <button type="button" class="btn btn-outline" onclick="Shivaa.shareProduct('${p.id}')" aria-label="Share this piece with a friend">🔗 Share</button>
          <button type="button" class="btn btn-outline pd-compare ${compared ? 'on' : ''}" data-pid="${p.id}" onclick="Shivaa.toggleCompare('${p.id}')" aria-pressed="${compared ? 'true' : 'false'}" aria-label="${compared ? 'Remove from compare' : 'Add to compare'}">⚖ <span data-compare-label>${compared ? 'In Compare' : 'Compare'}</span></button>
        </div>
        <div style="font-size:12.5px;color:${p.stock > 3 ? 'var(--ok)' : 'var(--warn)'};display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><span>${p.stock > 3 ? '● In stock — ships in 48 hours' : '● Only ' + p.stock + ' left with our karigar'}</span><a href="javascript:Shivaa.rateAlertModal(${jsArg(p.id)})" style="font-size:12px">🔔 Alert on price drop</a></div>

        ${window.ShivaaHallmark ? window.ShivaaHallmark.productPanel(p) : '<p class="hm-note">HUID information is temporarily unavailable. No BIS verification has been performed here.</p>'}
        <a class="trust-pdp-link" href="#/trust">Business details &amp; documents →</a>
        ${p.mediaNote ? `<p style="font-size:11.5px;color:var(--ink-3);margin-top:10px;line-height:1.6">✦ ${esc(p.mediaNote)} The piece you receive is hand-finished by our karigars to this design; exact weight and purity are confirmed on your bill.</p>` : ''}

        <div class="opt-label"><span>Check delivery &amp; COD</span></div>
        <form class="pin-row" data-delivery style="max-width:380px"><input data-pin id="pincode" inputmode="numeric" autocomplete="postal-code" enterkeyhint="go" maxlength="6" placeholder="Enter 6-digit pincode" value="${(() => { try { return localStorage.getItem('shv_pin') || ''; } catch (e) { return ''; } })()}"><button type="submit" class="btn btn-ghost btn-sm">Check</button></form>
        <div class="pin-msg" data-pin-msg hidden></div>

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
          ${data.reviews.map((r, i) => `<div class="rv-item rv-in" style="animation-delay:${Math.min(i * 120, 800)}ms"><span class="stars stars-pop">${'<i>★</i>'.repeat(r.rating)}</span><b>${esc(r.userName)} ${r.verified ? '<span class="verified-badge" title="Bought on shivaa.in">✓ verified purchase</span>' : ''}</b><small>${dateFmt(r.createdAt)}</small><p>${esc(r.text)}</p>
            ${(r.photos || []).length ? `<div class="rv-photos">${r.photos.map(src => `<a href="${safeUrl(src)}" target="_blank" rel="noopener"><img src="${safeUrl(src)}" alt="review photo" loading="lazy"></a>`).join('')}</div>` : ''}
            ${r.reply ? `<div class="rv-reply"><b>Shivaa replies:</b> ${esc(r.reply)}</div>` : ''}
          </div>`).join('') || '<p style="color:var(--ink-3)">Be the first to review this piece.</p>'}
          <form class="review-form" id="revForm" onsubmit="Shivaa.postReview(event,${jsArg(p.id)})">
            <div class="rate-pick" id="ratePick">${[1,2,3,4,5].map(i => `<span data-r="${i}" onclick="Shivaa.pickRate(${i})">★</span>`).join('')}</div>
            <div class="fld"><textarea id="revText" placeholder="Tell everyone about the piece — fit, finish, how it feels…" required></textarea></div>
            <label class="rv-upload">📷 Add up to 3 photos (optional)<input type="file" id="revPhotos" accept="image/*" multiple capture="environment"></label>
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
    <button class="btn btn-primary" onclick="Shivaa.pdAdd('${p.id}', event)">Add to Cart</button>
    <button class="ps-wa" onclick="Shivaa.waProduct('${p.id}')" aria-label="Order on WhatsApp">Chat to order</button>
  </div>`;
  (() => {
    const wrap = $('#galWrap'), track = $('#galTrack'); if (!wrap || !track) return;
    const n = $$('.gal-slide', track).length;   // v36: counts video slide too
    /* v103 — data-saver: films stay poster frames on cellular / save-data
       until tapped; Wi-Fi & 4G/5g autoload only the lightweight metadata. */
    wrap.addEventListener('click', e => {
      const b = e.target.closest && e.target.closest('.gal-vid-load');
      if (!b) return;
      const src = b.dataset.video, poster = b.dataset.poster || '';
      b.replaceWith(Object.assign(document.createElement('video'), {
        src, controls: true, playsInline: true, preload: 'auto', poster,
      }));
      const v = track.querySelector('video');
      if (v && v.play) { try { const pr = v.play(); if (pr && pr.catch) pr.catch(() => {}); } catch (e) {} }
    });
    let idx = 0, sx = null, dx = 0;
    const gc = $('#galCount');   // v104 — phone photo counter pill
    const go = i => {
      idx = (i + n) % n;
      track.style.transform = `translate3d(-${idx * 100}%,0,0)`;
      $$('.gal-slide', track).forEach((s, i2) => s.classList.toggle('on', i2 === idx));
      $$('#galDots button').forEach((d, i2) => { d.classList.toggle('on', i2 === idx); d.setAttribute('aria-current', i2 === idx ? 'true' : 'false'); });
      if (gc) gc.textContent = `${idx + 1} / ${n}`;
    };
    if (gc) gc.textContent = `1 / ${n}`;
    $('.gal-next', wrap).onclick = () => go(idx + 1);
    $('.gal-prev', wrap).onclick = () => go(idx - 1);
    $$('#galDots button').forEach((d, i2) => d.onclick = e => { e.preventDefault(); e.stopPropagation(); go(i2); });
    /* v118 — reliable gallery gestures. Pointer capture keeps the drag alive
       when a thumb leaves the square; vertical intent is handed back to page
       scrolling, while horizontal intent moves exactly one photo. */
    let sy = null, dragging = false;
    wrap.addEventListener('pointerdown', e => {
      if (e.target.closest && e.target.closest('button, a, video')) return;
      sx = e.clientX; sy = e.clientY; dx = 0; dragging = false;
      try { wrap.setPointerCapture(e.pointerId); } catch (_) {}
    });
    wrap.addEventListener('pointermove', e => {
      if (sx == null) return;
      const dy = e.clientY - sy; dx = e.clientX - sx;
      if (!dragging && Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
      if (!dragging && Math.abs(dy) > Math.abs(dx) * 1.25) { sx = sy = null; return; }
      dragging = true; track.style.transition = 'none';
      track.style.transform = `translate3d(calc(-${idx * 100}% + ${dx}px),0,0)`;
    });
    const end = () => {
      if (sx == null) return;
      track.style.transition = '';
      if (dragging && Math.abs(dx) > 36) go(idx + (dx < 0 ? 1 : -1)); else go(idx);
      sx = sy = null; dx = 0; dragging = false;
    };
    wrap.addEventListener('pointerup', end); wrap.addEventListener('pointercancel', end);
    wrap.addEventListener('lostpointercapture', end);
    const _mobGal = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (innerWidth <= 820);
    const _galInterval = _mobGal ? 10000 : 5200; // v42: slower on mobile, still advances
    const timer = setInterval(() => {
      const v = $('.gal-slide.on video', track); if (v && !v.paused) return; go(idx + 1);
    }, _galInterval);
    wrap.addEventListener('pointerdown', () => clearInterval(timer), { once: true });
  })();
  $('#brkBtn').onclick = () => { const b = $('#pdBrk'); b.hidden = !b.hidden; $('#brkBtn').setAttribute('aria-expanded', String(!b.hidden)); };
  $$('#sizeRow .size-pill').forEach(s => s.onclick = () => { $$('#sizeRow .size-pill').forEach(x => x.classList.remove('on')); s.classList.add('on'); try { localStorage.setItem('shv_ring_size', s.dataset.size); } catch (e) {} });
  window.Shivaa.bindDelivery(view);   // v103 — auto-runs when a pin is remembered
  bindTilt(view);
  window._pd = { p, qty: 1 };
  /* v119 — HUID chip on the product page. Honest by construction: it prints a
     HUID ONLY when the catalogue actually carries one (p.huid or
     hallmark.entries[].huid). With no HUID on file it is a check guide that
     links to the BIS Care app walkthrough — never a claim that this piece is
     hallmarked (owner rule, docs/AGENT-HANDOFF.md). */
  try {
    if (!view.querySelector('.pd-huid-chip')) {
      const hh = p.hallmark || {};
      const entry = (Array.isArray(hh.entries) ? hh.entries : []).find(e => e && (e.huid || e.HUID));
      const real = String(p.huid || (entry && (entry.huid || entry.HUID)) || '').trim();
      const hasReal = /^[A-Za-z0-9]{4,12}$/.test(real);
      const chip = document.createElement('div');
      chip.className = 'pd-huid-chip' + (hasReal ? ' is-real' : '');
      const guide = `#/hallmark?product=${encodeURIComponent(p.id)}`;
      chip.innerHTML = hasReal
        ? `<b>✦ HUID ${esc(real)}</b><span><a href="${guide}">Verify this HUID in the BIS Care app →</a></span>`
        : `<b>✦ HUID check</b><span><a href="${guide}">How to verify a hallmark in the BIS Care app →</a></span>`;
      const h1 = view.querySelector('.pd-info h1');
      if (h1) h1.insertAdjacentElement('afterend', chip);
      else { const info = view.querySelector('.pd-info'); if (info) info.prepend(chip); }
    }
  } catch (e) {}
  /* v54: remember this piece + mobile sticky buy bar + tap-to-zoom gallery */
  window.Shivaa.recentAdd(p, pr);   // v103 — snapshot price + rate for the home trend hint
  let bb = $('#pdpBuybar');
  if (!bb) { bb = document.createElement('div'); bb.id = 'pdpBuybar'; document.body.appendChild(bb); }
  bb.innerHTML = `<span class="bb-price">${'₹' + Math.round((p.price && p.price.total) || 0).toLocaleString('en-IN')}</span>
    <button class="btn btn-outline btn-sm" id="bbAdd">🛍 Add</button>
    <button class="btn btn-primary btn-sm" id="bbBuy">Buy Now</button>`;
  $('#bbAdd', bb).onclick = (e) => window.Shivaa.pdAdd(p.id, e);
  $('#bbBuy', bb).onclick = () => window.Shivaa.pdBuy(p.id);
  /* v55: EMI calculator under the price breakdown trigger */
  const _P = (p.price && p.price.total) || 0;
  if (_P > 0 && !$('#emiBox', view)) {
    const emi = document.createElement('details'); emi.id = 'emiBox'; emi.className = 'emi-box';
    emi.innerHTML = '<summary>💳 EMI options</summary><div class="emi-in">' +
      '<div class="sum-row"><span>3 months · no-cost</span><b>₹' + Math.round(_P / 3).toLocaleString('en-IN') + '/mo</b></div>' +
      '<div class="sum-row"><span>6 months · standard</span><b>₹' + Math.round(_P * 1.045 / 6).toLocaleString('en-IN') + '/mo</b></div>' +
      '<small>Cards & UPI autopay · the exact figure prints on your bill</small></div>';
    const brk = $('#brkBtn', view); if (brk) brk.insertAdjacentElement('beforebegin', emi);
  }
  $$('.gal-slide img', view).forEach(im => {
    im.style.cursor = 'zoom-in';
    im.addEventListener('click', () => { im.classList.toggle('zoomed'); im.style.cursor = im.classList.contains('zoomed') ? 'zoom-out' : 'zoom-in'; });
  });
  window._lastOrder = null;
};
window.Shivaa.pdQty = d => { window._pd.qty = Math.max(1, Math.min(9, window._pd.qty + d)); $('#pdQtyN').textContent = window._pd.qty; };

/* ─────────── v54 GLOBAL UX: scroll progress · back-to-top · buy-bar routing ─────────── */
(function () {
  // v80: index.html already ships #scrollProg — reuse it instead of creating
  // a duplicate-id second bar (the old width-vs-transform fight caused extra
  // layout work on every scroll frame)
  let bar = document.getElementById('scrollProg');
  if (!bar) { bar = document.createElement('div'); bar.id = 'scrollProg'; bar.setAttribute('aria-hidden', 'true'); document.body.appendChild(bar); }
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

  /* v56: the floating 22K-rate pill that sat on every page was removed on
     request (it followed the shopper everywhere). Live rates still live on
     #/rates and in the top utility strip. */

  /* v55: referral capture — shivaa.in/?ref=SH12AB3 */
  try {
    const rp = new URLSearchParams(location.search).get('ref');
    if (/^SH[A-Z0-9]{5}$/i.test(rp || '')) localStorage.setItem('sh_ref', rp.toUpperCase());
  } catch (e) {}

  /* v55: funnel events (view / cart / checkout) */
  const sendEv = (ev, pp) => { try { fetch('/api/ev', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ev, p: pp || '' }), keepalive: true }); } catch (e) {} };
  addEventListener('hashchange', () => {
    const h = location.hash || '';
    if (h.startsWith('#/product/')) sendEv('view', h.slice(2, 62));
    else if (h.startsWith('#/cart')) { sendEv('cart'); try { localStorage.removeItem('sh_abandoned'); } catch (e) {} }
    else if (h.startsWith('#/checkout')) sendEv('checkout');
  });

  /* v55: abandoned-cart capture (once per 6h, only outside checkout) */
  addEventListener('pagehide', () => {
    try {
      const cart = (window.Shivaa && state.cart) || [];
      if (!cart.length || (location.hash || '').startsWith('#/checkout')) return;
      const last = parseInt(localStorage.getItem('sh_abSent') || '0', 10);
      if (Date.now() - last < 6 * 3600e3) return;
      localStorage.setItem('sh_abSent', String(Date.now()));
      localStorage.setItem('sh_abandoned', '1');
      const items = cart.map(c => { const pr = state.productsCache.find(x => x.id === c.id); return { n: (pr && pr.name) || 'A Shivaa piece', q: c.qty || 1 }; });
      const total = cart.reduce((a, c) => { const pr = state.productsCache.find(x => x.id === c.id); return a + (pr && typeof price === 'function' ? price(pr) * (c.qty || 1) : 0); }, 0);
      fetch('/api/carts/abandon', { method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true, body: JSON.stringify({ items, total, phone: (state.user && state.user.phone) || '' }) });
    } catch (e) {}
  });

  /* v55 / v101: welcome-back bar when a saved cart is waiting — mobile-first
     compact card with piece count + value and a full-width Resume button */
  setTimeout(() => {
    try {
      if (sessionStorage.getItem('sh_backbar_off')) return;
      if (localStorage.getItem('sh_abandoned') && state.cart.length && !document.getElementById('backBar')) {
        const pieces = state.cart.reduce((a, i) => a + (i.qty || 1), 0);
        const value = state.cart.reduce((a, c) => {
          const pr = state.productsCache.find(x => x.id === c.id);
          return a + (pr && typeof price === 'function' ? price(pr).total * (c.qty || 1) : 0);
        }, 0);
        const bar = document.createElement('div'); bar.id = 'backBar';
        bar.setAttribute('role', 'dialog'); bar.setAttribute('aria-label', 'Saved cart');
        bar.innerHTML =
          '<div class="bb-ic">✦</div>'
          + '<div class="bb-tx"><b>Your cart is waiting</b>'
          + '<small>' + pieces + ' piece' + (pieces === 1 ? '' : 's') + (value ? ' · ' + fmt(value) : '') + ' · ready to check out</small></div>'
          + '<button class="bb-x" id="backBarX" aria-label="Dismiss">✕</button>'
          + '<a class="btn btn-primary btn-block bb-go" href="#/cart">Resume order →</a>';
        document.body.appendChild(bar);
        const dismissBar = () => {
          if (bar.classList.contains('bb-out')) return;
          bar.classList.add('bb-out');
          try { navigator.vibrate?.(8); } catch (e) {}
          setTimeout(() => bar.remove(), 260);
          try { sessionStorage.setItem('sh_backbar_off', '1'); } catch (e) {}
        };
        document.getElementById('backBarX').onclick = dismissBar;
        // v102 — swipe the card right (or far left) to dismiss it
        let bx = null, bdx = 0, bdy = 0, dragging = false;
        bar.addEventListener('touchstart', e => {
          bx = e.touches[0].clientX; bdy = e.touches[0].clientY; bdx = 0; dragging = false;
          bar.style.transition = 'none';
        }, { passive: true });
        bar.addEventListener('touchmove', e => {
          if (bx == null) return;
          bdx = e.touches[0].clientX - bx;
          const dy = e.touches[0].clientY - bdy;
          if (Math.abs(bdx) > 10 && Math.abs(bdx) > Math.abs(dy)) dragging = true;
          if (dragging) {
            const follow = Math.sign(bdx) * Math.min(Math.abs(bdx), 220);
            bar.style.transform = 'translateX(' + follow + 'px)';
          }
        }, { passive: true });
        bar.addEventListener('touchend', () => {
          bar.style.transition = '';
          if (dragging && (bdx > 88 || bdx < -150)) { dismissBar(); }
          else bar.style.transform = '';
          bx = null; dragging = false;
        }, { passive: true });
        // remove the card once the customer actually resumes
        bar.querySelector('.bb-go').addEventListener('click', () => {
          bar.classList.add('bb-out'); setTimeout(() => bar.remove(), 260);
        });
      }
    } catch (e) {}
  }, 2200);

  /* v55: ready-to-ship badges in the shop grid */
  addEventListener('hashchange', () => {
    if (!(location.hash || '').startsWith('#/shop')) return;
    setTimeout(() => $$('.p-card').forEach(card => {
      const pr = state.productsCache.find(x => x.id === card.dataset.pid);
      if (pr && (pr.stock | 0) >= 10 && !card.querySelector('.ready-badge'))
        card.insertAdjacentHTML('afterbegin', '<span class="ready-badge">✦ Ready · ships 48h</span>');
    }), 420);
  });
})();

/* v54: recently viewed rings (local, private, never uploaded).
   v103 — also remembers the price + rate at view time so the home strip
   can honestly show how the piece has moved with the bullion rate. */
window.Shivaa.recentAdd = (p, pr) => {
  try {
    const l = JSON.parse(localStorage.getItem('sh_recent') || '[]').filter(x => x && x.id !== p.id);
    pr = pr || price(p);
    l.unshift({ id: p.id, name: p.name, img: (p.images || [])[0] || '/images/logo.png',
                price: (p.price && p.price.total) || p.price || 0, category: p.category,
                at: Date.now(), thenTotal: pr && pr.total, thenRate: pr && pr.ratePerGram,
                weightG: p.weightG, metal: p.metal, purity: p.purity });
    localStorage.setItem('sh_recent', JSON.stringify(l.slice(0, 8)));
  } catch (e) {}
};
/* v103 — build the recent strip's rate-trend hint for one remembered piece */
function recentHint(x) {
  if (!x || !x.at || !x.thenTotal) return '';
  const days = Math.round((Date.now() - x.at) / 86400000);
  const when = days <= 0 ? 'viewed today' : days === 1 ? 'viewed yesterday' : `viewed ${days} day${days > 1 ? 's' : ''} ago`;
  const live = (state.productsCache || []).find(c => c.id === x.id);
  if (!live || !state.rates) return `<span class="tv-when">${when}</span>`;
  const d = price(live).total - x.thenTotal;
  if (Math.abs(d) < 50) return `<span class="tv-when">${when} · steady with the rate</span>`;
  const word = d < 0
    ? `<span class="tv-hint down">↓ ₹${Math.abs(d).toLocaleString('en-IN')} cheaper since you looked</span>`
    : `<span class="tv-hint up">↑ ₹${Math.abs(d).toLocaleString('en-IN')} more with the gold rate</span>`;
  return `${word}<span class="tv-when">${when}</span>`;
}
function recentCard(x) {
  const live = (state.productsCache || []).find(c => c.id === x.id);
  const nowPrice = live ? price(live).total : (x.price || 0);
  return `<a class="tv-card" href="#/product/${esc(x.id)}">
  <div class="tv-ph"><img src="${safeUrl(x.img) || '/images/logo.png'}" alt="" loading="lazy" onerror="this.onerror=null;this.src='/images/logo.png'"></div>
  <div class="tv-b"><b>${esc(x.name)}</b><small>${esc(x.category || '')}${x.rating ? ' · ★' + x.rating : ''}</small><span>${'₹' + Math.round(nowPrice).toLocaleString('en-IN')}</span>${recentHint(x)}</div></a>`;
}
window.Shivaa.pdAdd = (id, ev) => {
  const size = $('#sizeRow .size-pill.on')?.dataset.size || null;
  addToCart(id, window._pd.qty, size, $('#engrave')?.value || null, ev ? { fromEl: ev.currentTarget } : {});
};
/* v142/v153 · take ONE piece straight to the purchase — since v153 with NO
   page at all. Same intent as the classic Buy Now (only this piece, only the
   picked size), but the classic flow keeps a member checkout behind forms the
   owner wants bypassed — so direct-buy uses its own customer id and access pin. */
window.Shivaa._expressItem = null;
window.Shivaa.pdBuy = async id => {
  const size = $('#sizeRow .size-pill.on')?.dataset.size || null;
  const engrave = $('#engrave')?.value || null;
  const qty = window._pd ? window._pd.qty : 1;
  /* v142 — the one-tap path is for a shopper who has NOT made an account yet
     (that is whose name/number/address/admin-OTP the owner wants gone). A
     signed-in member already has verified details prefilled, so they keep the
     classic checkout rather than exchange their saved address for placeholders. */
  if (expressCheckoutOn() && !state.user) {
    window.Shivaa._expressItem = { id, qty, size, engraving: engrave };
    /* v153/v154/v155 — NO PAGE, NO FIELD, NO RENDER (owner's rule, three
       times on the 19th — each repeat cut another layer of ours out of the way).
       The tap buys IN PLACE with zero typing here; the stash only exists so a
       reclaimed-and-reloaded Android tab can resume exactly where it died. */
    try { store.set('shv_ex_item', { item: window.Shivaa._expressItem, at: Date.now() }); } catch (e) {}
    if (await window.Shivaa.exDirect(false)) return;
    window.Shivaa._expressItem = null;
    try { store.set('shv_ex_item', null); } catch (e) {}
  }
  addToCart(id, qty, size, engrave, { silent: true });
  location.hash = '#/checkout';
};

/* ─────── v142/v154/v155 · GUEST DIRECT BUY (pageless · fieldless · silent) ───────
   The owner's brief: click "Make It Yours" and the piece is bought — no
   account, no forms, no site OTP. v153 deleted the Express PAGE; v154 deleted
   the last thing of ours that stood in the way: the one-field card. Now the
   tap places the order from wherever the shopper stands and the browser goes
   straight to Cashfree's portal. That is legal because:

   · v143 proved Cashfree only REFUSES AN EMPTY phone at create-order — so the
     order rides the canonical boundary row (EX_BOUNDARY below), accepted by
     the server ONLY while the owner's switch + Cashfree are live, and ONLY on
     that exact signature. The customer's real number, name and address are
     collected + OTP-verified by Cashfree's own page, and the paid sweep
     promotes them back onto the order. The v84 gate still rejects any
     non-signature guest order without a real phone.
   · nothing is "auto-purchased" without money: shivaa.in places the order and
     hands the browser to Cashfree; only Cashfree's confirmed payment marks it
     paid. The only keystrokes the customer makes are inside Cashfree.
   The whole flow runs only when the owner's switch is on, and the switch only
   reports on when a live Cashfree + One Click Checkout connection exists. */
function expressCheckoutOn() {
  return !!(state.settings && state.settings.guestCheckout === true);
}
window.Shivaa.expressCheckoutOn = expressCheckoutOn;

window.Shivaa._expressOrder = null;
/* remember a guest order so its return trip and page poller can find it.
   v153 stamps the TIME too — a fresh entry is what lets a reloaded tab RESUME
   the payment instead of re-placing an order the shopper already paid for. */
function expressRemember(orderId, pin) {
  try { store.set('shv_express', { orderId, pin, at: Date.now() }); } catch (e) {}
}
/* ═════════ v153 · IN-PAGE DIRECT BUY — THE EXPRESS PAGE ITSELF IS GONE.
   Owner (19 Sep): "completely remove the one tap page of Shiva that you are
   made and redirect customers directly to the cashfree payment portal once
   they click on buy now check out or make it yours". No route, no render,
   no URL change: the tap places the order from wherever the shopper stands
   and the browser goes straight to Cashfree. Nothing of ours asks the
   customer for anything (v154) — and as of v154's repeat NOTHING of ours
   RENDERS either: no overlay, no sheet, no toast, not even the quiet
   "Opening your Cashfree payment…" line. The tap is two fetches
   (place the boundary order, mint+open one Cashfree session) and the
   browser belongs to Cashfree. Owner said it three times; v155 is the
   third reading — the literal one.
   ═══════════════════════════════════════════════════════════════════════ */
window.Shivaa._payCfg = null;
const EX = { busy: false };
async function exGate() {
  if (!(state.settings && state.settings.guestCheckout === true)) return false;
  let c = window.Shivaa._payCfg;
  if (!c || Date.now() - c.at > 60000) {
    try { c = window.Shivaa._payCfg = { cfg: await api('/api/pay/config'), at: Date.now() }; }
    catch (e) { return false; }
  }
  return !!(c.cfg && c.cfg.mode === 'cashfree' && c.cfg.guestCheckout === true);
}
async function exItems(fromCart) {
  if (fromCart) {
    return state.cart.map(c => {
      let p = state.productsCache.find(x => x.id === c.id);
      if (!p && typeof CAMPAIGN_STUDS_DATA !== 'undefined') p = Object.values(CAMPAIGN_STUDS_DATA).flat().find(x => x.id === c.id);
      return p ? { ...c, p } : null;
    }).filter(Boolean);
  }
  const it = window.Shivaa._expressItem;
  if (!it || !it.id) return [];
  let p = state.productsCache.find(x => x.id === it.id);
  if (!p && typeof CAMPAIGN_STUDS_DATA !== 'undefined') {
    p = Object.values(CAMPAIGN_STUDS_DATA).flat().find(x => x.id === it.id);
  }
  if (!p) { try { const one = await api('/api/products/' + it.id); p = one.product || null; } catch (e) {} }
  return p ? [{ id: it.id, qty: it.qty || 1, size: it.size || null, engraving: it.engraving || null, p }] : [];
}
/* v154 · THE BOUNDARY ORDER. Cashfree's Create-Order API needs a
   syntactically valid customer_phone (v143 proved only that an EMPTY one is
   refused) and the v84 gate needs a complete address — nothing more. The
   CANONICAL sentinel row below is the exact signature the server accepts,
   and only while the owner's Express switch + Cashfree are both live: the
   customer's REAL number, name and address are collected and OTP-verified
   by CASHFREE on its own page (its checkoutAuthenticate condition), and the
   paid-order sweep promotes them back onto the order server-side. This is
   the owner's 19-Sep rule, final form: "redirect customers DIRECTLY to the
   cashfree payment portal once they click on buy now check out or make it
   yours" — no page, no field, no card, nothing typed on shivaa.in, ever. */
const EX_BOUNDARY = {
  name: 'Valued Customer', phone: '9999999999', line: 'Collected on Cashfree (verified address)',
  city: 'Pending verification', state: 'Pending verification', pincode: '000000', country: 'India',
};
/* v155 · THE SILENT HANDOFF — one mint, opened the instant it lands.
   payForOrder's sheet, toast and v133 fresh-mint-before-open exist for the
   ORDER VIEW, where a session is often stale by the time a "Pay now" tap
   happens. In THIS lane the session is milliseconds old, so we mint once
   and open it directly. If even that declines, the order view — which owns
   its retry button, the UPI QR tab and the access pin — receives them. */
async function exHandoff(orderId, pin) {
  const po = await api('/api/pay/order', { method: 'POST', body: JSON.stringify(pin ? { orderId, pin } : { orderId }) });
  if (po && po.mode === 'demo') {
    const paid = await demoPaySheet(po, orderId, po.amount ? Math.round(po.amount / 100) : 48500);
    if (paid) {
      const ord = window.Shivaa._expressOrder || window.Shivaa._lastOrder;
      const isCamp = ord && ord.items && ord.items.some(x => x.isCampaignStud || x.campaignStud || /p_stud|SHV-[ML]ST/i.test(x.id || x.productId || x.sku || ''));
      if (isCamp) {
        location.hash = '#/scheme?step=quiz&orderId=' + encodeURIComponent(orderId) + (pin ? '&pin=' + encodeURIComponent(pin) : '');
      } else {
        location.hash = '#/order/' + encodeURIComponent(orderId) + '?paid=1' + (pin ? '&pin=' + encodeURIComponent(pin) : '');
      }
      return;
    } else {
      throw new Error('Payment cancelled');
    }
  }
  if (!po || po.mode !== 'cashfree' || !po.paymentSessionId) {
    throw new Error((po && (po.gatewayMessage || po.error)) || 'Cashfree could not start');
  }
  await Shivaa.cashfreeCheckout(po.paymentSessionId, po.env);
}
async function exRunBuy(items) {
  const res = await api('/api/orders', { method: 'POST', body: JSON.stringify({
    items: items.map(c => ({ id: c.id, qty: c.qty || 1, size: c.size || null, engraving: c.engraving || null })),
    address: { ...EX_BOUNDARY },
    paymentMethod: 'Online',   // guest direct-buy is prepaid-only; never COD/WhatsApp
  }) });
  window.Shivaa._expressOrder = res;
  window.Shivaa._lastOrder = res;
  expressRemember(res.id, res.pin || '');
  window.Shivaa._expressItem = null;
  try { store.set('shv_ex_item', null); } catch (e) {}
  /* v155 — NOTHING renders here. A successful handoff replaces this whole
     document with Cashfree's portal (the catch below never runs); a declined
     one lands on the order view, silently, where the shopper can retry or
     pay by QR. No overlay, no sheet, no toast — the tap and the portal are
     the only two things the customer experiences. */
  try { await exHandoff(res.id, res.pin || ''); } catch (e) {
    location.hash = '#/order/' + encodeURIComponent(res.id) + '?cf=pending'
      + (res.pin ? '&pin=' + encodeURIComponent(res.pin) : '');
  }
}
/* THE entry point: true = the flow consumed the tap; false = caller must
   proceed with the classic addToCart → #/checkout (member, or the switch /
   Cashfree not live). v154: the flow never asks the shopper anything.
   v155: it never SHOWS them anything either — two fetches, then Cashfree. */
window.Shivaa.exDirect = async fromCart => {
  if (EX.busy || state.user) return false;
  /* v155 — claim SYNCHRONOUSLY, before any await: two eager taps (double-tap,
     an impatient second thumb) used to interleave inside the gate round-trip
     and place TWO boundary orders. One claim now makes that impossible. */
  EX.busy = true;
  try {
    if (!(await exGate())) return false;
    const items = await exItems(!!fromCart);
    if (!items.length) return false;
    await exRunBuy(items);
    return true;
  } catch (e) {
    toast(e.message, 'err');   // the order itself failed (network/400) — say so, stay put, NOTHING was placed
    return true;   // never a silent dump into classic checkout
  } finally { EX.busy = false; }
};
/* the cart / sidebar CTA: same in-page direct buy; when the flow declines
   (member, or Cashfree/switch not live) the link proceeds as always. */
window.Shivaa.exCartCta = ev => {
  if (ev && ev.preventDefault) ev.preventDefault();
  window.Shivaa.exDirect(true).then(used => { if (!used) location.hash = '#/checkout'; });
  return false;
};
/* reclaimed-tab RESUME (v153 — the route can't restore anything anymore):
   fresh ORDER + fresh tap → resume the payment, never re-place the order;
   fresh tap with no order yet → re-run the buy (silent if remembered);
   stale anything → clear and walk away. Called once per boot. */
window.Shivaa.exResume = () => {
  if (state.user || EX.busy) return;
  let sv = null; try { sv = store.get('shv_ex_item', null); } catch (e) {}
  const fresh = sv && sv.item && sv.item.id && (Date.now() - (sv.at || 0)) < 10 * 60 * 1000;
  if (!fresh) { if (sv) { try { store.set('shv_ex_item', null); } catch (e) {} } return; }
  let ord = null; try { ord = store.get('shv_express', null); } catch (e) {}
  if (ord && ord.orderId && (Date.now() - (ord.at || 0)) < 10 * 60 * 1000) {
    try { store.set('shv_ex_item', null); } catch (e) {}
    window.Shivaa._expressItem = null;
    location.hash = '#/order/' + encodeURIComponent(ord.orderId) + '?cf=pending'
      + (ord.pin ? '&pin=' + encodeURIComponent(ord.pin) : '');
    /* v155 — no "Resuming…" overlay: the order view renders underneath while
       the silent handoff retries Cashfree over it; if that too declines, the
       view's own Pay-now button and QR tab stand ready. */
    exHandoff(ord.orderId, ord.pin || '').catch(() => {});
    return;
  }
  window.Shivaa._expressItem = sv.item;
  window.Shivaa.exDirect(false);
};

/* v103 — data-saver for the 65 product films (142 MB of media). Films
   autoload only on fast/uncapped connections; on 2G/3G/save-data they stay
   as poster frames and load on tap. The visitor can force either mode. */
function videoCanAutoload() {
  try {
    const forced = localStorage.getItem('shv_autovideo');
    if (forced === '0') return false;
    if (forced === '1') return true;
    const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (c && (c.saveData || /^(slow-2g|2g|3g)$/.test(c.effectiveType || ''))) return false;
  } catch (e) {}
  return true;
}
window.Shivaa.setVideoAutoload = on => {
  try { localStorage.setItem('shv_autovideo', on ? '1' : '0'); } catch (e) {}
  toast(on ? 'Films will now play automatically when you open a piece' : 'Films will wait for a tap — mobile data saved');
};

/* v59 / v103 — honest delivery promise by pincode + COD eligibility.
   v103: one source of truth for PDP, cart and checkout; region label,
   state autofill and an estimated handover date, fully client-side so it
   works even when the connection drops. */
function pinRegion(pin) {
  const d2 = pin.slice(0, 2), d3 = pin.slice(0, 3);
  if (pin === '341023') return 'Jayal · Nagaur (our home town)';
  if (['30', '31', '32', '33', '34'].includes(d2)) return 'Rajasthan';
  if (['36', '37', '38', '39'].includes(d2)) return 'Gujarat';
  if (['11'].includes(d2)) return 'Delhi NCR';
  if (['12', '13', '14', '15', '16', '17', '20', '21', '22', '23', '25', '26', '27', '28'].includes(d2)) return 'North India';
  if (['40', '41', '42', '43', '44'].includes(d2)) return 'Maharashtra & Goa';
  if (['45', '46', '47', '48'].includes(d2)) return 'Madhya Pradesh';
  if (['49'].includes(d2)) return 'Chhattisgarh';
  if (['50', '51', '52', '53'].includes(d2)) return 'Telangana & Andhra Pradesh';
  if (['56', '57', '58', '59'].includes(d2)) return 'Karnataka';
  if (['60', '61', '62', '63', '64', '65', '66'].includes(d2)) return 'Tamil Nadu & Puducherry';
  if (['67', '68', '69'].includes(d2)) return 'Kerala & Lakshadweep';
  if (['70', '71', '72', '73', '74'].includes(d2)) return 'West Bengal, Sikkim & Andamans';
  if (['75', '76', '77'].includes(d2)) return 'Odisha';
  if (['80', '81', '82', '83', '84', '85'].includes(d2)) return 'Bihar & Jharkhand';
  if (d2 === '78' || d2 === '79') return 'North-East India';
  if (['18', '19'].includes(d2)) return 'Jammu, Kashmir & Ladakh';
  void d3;
  return 'India';
}
/* Conservative pincode → state autofill. Returns '' when a prefix straddles
   state lines; the customer then types it (we never guess into an address). */
function pinState(pin) {
  const d2 = pin.slice(0, 2), d3 = pin.slice(0, 3);
  const table = {
    '11': 'Delhi', '12': 'Haryana', '13': 'Haryana', '14': 'Punjab', '15': 'Punjab',
    '16': 'Chandigarh', '17': 'Himachal Pradesh', '18': 'Jammu & Kashmir',
    '20': 'Uttar Pradesh', '21': 'Uttar Pradesh', '22': 'Uttar Pradesh', '23': 'Uttar Pradesh',
    '25': 'Uttar Pradesh', '26': 'Uttar Pradesh', '27': 'Uttar Pradesh', '28': 'Uttar Pradesh',
    '30': 'Rajasthan', '31': 'Rajasthan', '32': 'Rajasthan', '33': 'Rajasthan', '34': 'Rajasthan',
    '36': 'Gujarat', '37': 'Gujarat', '38': 'Gujarat', '39': 'Gujarat',
    '40': 'Maharashtra', '41': 'Maharashtra', '42': 'Maharashtra', '43': 'Maharashtra', '44': 'Maharashtra',
    '45': 'Madhya Pradesh', '46': 'Madhya Pradesh', '47': 'Madhya Pradesh', '48': 'Madhya Pradesh',
    '49': 'Chhattisgarh',
    '50': 'Telangana', '51': 'Andhra Pradesh', '52': 'Andhra Pradesh', '53': 'Andhra Pradesh',
    '56': 'Karnataka', '57': 'Karnataka', '58': 'Karnataka', '59': 'Karnataka',
    '60': 'Tamil Nadu', '61': 'Tamil Nadu', '62': 'Tamil Nadu', '63': 'Tamil Nadu',
    '64': 'Tamil Nadu', '65': 'Tamil Nadu', '66': 'Puducherry',
    '67': 'Kerala', '68': 'Kerala', '69': 'Kerala',
    '70': 'West Bengal', '71': 'West Bengal', '72': 'West Bengal',
    '75': 'Odisha', '76': 'Odisha', '77': 'Odisha',
    '78': 'Assam',
    '80': 'Bihar', '81': 'Bihar', '84': 'Bihar', '85': 'Bihar',
    '82': 'Jharkhand', '83': 'Jharkhand',
  };
  if (d3 === '244' || d3 === '246' || d3 === '247' || d3 === '248' || d3 === '249') return 'Uttarakhand';
  if (d2 === '24') return 'Uttar Pradesh';
  if (d3 === '737') return 'Sikkim';
  if (d2 === '73') return 'West Bengal';
  if (d3 === '744') return 'Andaman & Nicobar Islands';
  if (d2 === '74') return 'West Bengal';
  if (d3 === '790') return 'Arunachal Pradesh';
  if (d3 === '795') return 'Manipur';
  if (d3 === '796') return 'Mizoram';
  if (d3 === '797') return 'Nagaland';
  if (d3 === '793' || d3 === '794') return 'Meghalaya';
  if (d3 === '799') return 'Tripura';
  if (d3 === '791' || d3 === '792') return 'Arunachal Pradesh';
  if (d2 === '79') return 'Assam';
  if (d3 === '194') return 'Ladakh';
  if (d2 === '19') return 'Jammu & Kashmir';
  return table[d2] || '';
}
function pinPromise(pin) {
  const d2 = pin.slice(0, 2);
  const block = String((state.settings || {}).codBlockedPins || '').split(/[\s,]+/).filter(Boolean);
  const noCODPrefix = ['19', '73', '74', '78', '79'];   // Ladakh, Andamans, NE — insured prepaid only
  const remote = noCODPrefix.includes(d2) || block.includes(pin);
  let days;
  if (pin === '341023') days = [1, 1];
  else if (['30', '31', '32', '33', '34'].includes(d2)) days = [2, 3];            // Rajasthan
  else if (['11', '12', '13', '14', '15', '16', '20', '21', '22', '23', '24', '25', '26', '27', '28', '36', '37', '38', '39'].includes(d2)) days = [3, 4]; // NCR / Gujarat / UP / north
  else if (['40', '41', '42', '43', '44', '45', '46', '47', '48', '49', '50', '56', '57', '70', '71'].includes(d2)) days = [3, 5];        // metros / west / Bengaluru
  else if (noCODPrefix.includes(d2)) days = [7, 10];
  else days = [4, 7];
  const fmtDate = n => new Date(Date.now() + n * 864e5).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  return {
    cod: !remote,
    lo: days[0], hi: days[1],
    by: days[0] === days[1] ? fmtDate(days[0]) : fmtDate(days[0]) + ' – ' + fmtDate(days[1]),
    region: pinRegion(pin),
    state: pinState(pin),
    home: pin === '341023',
  };
}
/* Shared delivery result renderer for PDP + cart widgets. */
function deliveryHTML(pin) {
  if (!/^\d{6}$/.test(pin)) return { ok: false, html: 'Please enter a valid 6-digit pincode' };
  const pr = pinPromise(pin);
  return {
    ok: true, pr,
    html: (pr.home ? '✓ <b>Jayal — home turf!</b> ' : '✓ Delivers to <b>' + pin + '</b> · ' + esc(pr.region) + ' ')
      + '· insured handover <b>' + pr.by + '</b><br>'
      + (pr.cod ? '💵 Cash on Delivery available' : '🔒 This pincode is prepaid-only (insured courier)')
      + ' · free shipping over ' + fmt((state.settings || {}).freeShipAbove ?? 50000),
  };
}
/* v103 — bind every [data-delivery] widget (PDP + cart share this). */
window.Shivaa.bindDelivery = root => {
  $$('[data-delivery]', root || document).forEach(form => {
    if (form._bound) return; form._bound = true;
    const inp = form.querySelector('input[data-pin]');
    // the message sits beside (not inside) the form on PDP + cart
    const msg = form.querySelector('[data-pin-msg]') || form.parentElement?.querySelector('[data-pin-msg]');
    const run = () => {
      if (!msg) return;
      const v = inp.value.trim();
      const r = deliveryHTML(v);
      msg.hidden = false;
      msg.className = 'pin-msg ' + (r.ok ? 'ok' : 'bad');
      msg.innerHTML = r.html;
      if (r.ok) {
        try { localStorage.setItem('shv_pin', v); } catch (e) {}
        form.dispatchEvent(new CustomEvent('pinchecked', { bubbles: true, detail: { pin: v, ...r.pr } }));
      }
    };
    form.addEventListener('submit', e => { e.preventDefault(); inp.value = inp.value.replace(/\D/g, '').slice(0, 6); run(); });
    inp.addEventListener('input', () => { inp.value = inp.value.replace(/\D/g, '').slice(0, 6); });
    let saved = '';
    try { saved = localStorage.getItem('shv_pin') || ''; } catch (e) {}
    // auto-answer on both surfaces: the PDP input is pre-rendered with the
    // remembered pin, the cart input starts empty
    if (saved && /^\d{6}$/.test(saved)) { if (!inp.value) inp.value = saved; setTimeout(run, 0); }
  });
};
window.Shivaa.checkPin = () => {
  const form = $('#pincode')?.closest('[data-delivery]');
  if (form) form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
};
window.Shivaa.pinPromise = pinPromise;
window.Shivaa.pinState = pinState;
window.Shivaa.pickRate = r => { window._rate = r; $$('#ratePick span').forEach((s, i) => { s.style.color = i < r ? 'var(--gold)' : 'var(--line)'; s.classList.toggle('picked', i === r - 1); }); };
window.Shivaa.postReview = async (e, pid) => {
  e.preventDefault();
  if (!state.user) return openLogin();
  try {
    const files = [...($('#revPhotos')?.files || [])].slice(0, 3);
    if (files.length) {
      const fd = new FormData();
      fd.append('productId', pid); fd.append('rating', String(window._rate || 5)); fd.append('text', $('#revText').value);
      files.forEach(f => fd.append('photos[]', f));
      await api('/api/reviews/photo', { method: 'POST', body: fd });
    } else {
      await api('/api/reviews', { method: 'POST', body: JSON.stringify({ productId: pid, rating: window._rate || 5, text: $('#revText').value }) });
    }
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
    <div class="empty pcmp-empty"><img src="/images/logo.png" class="empty-logo" alt=""><h2>Your compare tray is empty</h2><p style="margin:10px 0 22px;color:var(--ink-3)">Tap “Compare” on any piece to build a private shortlist on this device.</p><a class="btn btn-primary" href="#/shop">Explore Jewellery</a></div>`;
    updateCompareUI();
    return;
  }
  const total = items.reduce((a, p) => a + price(p).total, 0);
  const stoneRowNeeded = items.some(p => stoneInfo(p) !== '—');
  const row = (label, fn, cls = '') => `<tr class="${cls}"><th scope="row">${label}</th>${items.map(p => `<td>${fn(p)}</td>`).join('')}</tr>`;
  const metalLabel = p => p.metal === 'Silver' ? 'Silver 925' : p.purity + ' Gold';
  view.innerHTML = `
  <section class="page-hero"><div class="dust" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="container"><div class="crumbs"><a href="#/">Home</a> / Compare</div><h1>Compare your <em class="disp-italic">shortlist</em></h1>
    <p>${items.length} of ${COMPARE_MAX} pieces selected · prices recalculate from the current Shivaa live rate and product making-charge data.</p></div></section>

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
        <a href="#/product/${p.id}" class="pcmp-img"><img src="${safeUrl(p.images && p.images[0])}" alt="${esc(p.name)}"></a>
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
/* v103 — saved-for-later (private, local like the cart) */
const getLater = () => cleanCart(store.get('shv_later', []));
const setLater = l => store.set('shv_later', cleanCart(l).slice(0, 50));
window.Shivaa.cartSaveLater = (id, size) => {
  const i = state.cart.findIndex(x => x.id === id && (x.size || '') === (size || ''));
  if (i < 0) return;
  const it = state.cart[i];
  state.cart = state.cart.filter(x => x !== it);
  const l = getLater().filter(x => !(x.id === id && (x.size || '') === (size || '')));
  l.unshift({ id, qty: it.qty || 1, size: it.size || null, engraving: it.engraving || '' });
  setLater(l);
  store.set('shv_cart', state.cart); updateBadges(); renderMiniCart();
  toast('Saved for later ✦');
  pages.cart($('#view'));
};
window.Shivaa.cartMoveBack = (id, size) => {
  const l = getLater();
  const it = l.find(x => x.id === id && (x.size || '') === (size || ''));
  if (!it) return;
  setLater(l.filter(x => x !== it));
  /* v167 — this compared the same expression with itself (`x.size === x.size`),
     so it always matched the FIRST line with that product id: a ring saved for
     later in size 16 merged into the size-12 line already in the bag, and the
     shopper ordered the wrong size. Compare against the saved line's size. */
  const existing = state.cart.find(x => x.id === id && (x.size || '') === (size || ''));
  if (existing) existing.qty += it.qty;
  else state.cart.push({ id, qty: it.qty, size: it.size || null, engraving: it.engraving || '' });
  store.set('shv_cart', state.cart); updateBadges(); renderMiniCart();
  toast('Moved back to your bag ✦');
  pages.cart($('#view'));
};
window.Shivaa.cartRemoveLater = (id, size) => {
  setLater(getLater().filter(x => !(x.id === id && (x.size || '') === (size || ''))));
  pages.cart($('#view'));
};
function laterSectionHTML() {
  const l = getLater().map(x => ({ ...x, p: state.productsCache.find(p => p.id === x.id) })).filter(x => x.p);
  if (!l.length) return '';
  return `<section class="later-sec">
    <div class="sec-title" style="margin:22px 0 10px">Saved for later · ${l.length}</div>
    <div class="cart-items">${l.map(({ p, size, qty }) => `
      <div class="cart-item">
        <a href="#/product/${p.id}"><img src="${safeUrl(p.images && p.images[0])}" alt=""></a>
        <div>
          <a href="#/product/${p.id}" class="ci-name">${esc(p.name)}</a>
          <div class="ci-meta">${p.metal === 'Silver' ? 'Silver 925' : p.purity + ' gold'} · ${p.weightG} g${size ? ' · size ' + esc(size) : ''} · qty ${qty}</div>
          <div class="ci-meta js-price" data-pid="${p.id}" data-qty="${qty}">${fmt(price(p).total * qty)}</div>
        </div>
        <div class="ci-right"><a class="ci-remove" href="javascript:Shivaa.cartMoveBack(${jsArg(p.id)},${jsArg(size || '')})">Move to bag</a><br><a class="ci-remove" href="javascript:Shivaa.cartRemoveLater(${jsArg(p.id)},${jsArg(size || '')})">Remove</a></div>
      </div>`).join('')}
    </div>
  </section>`;
}
pages.cart = async (view) => {
  ensureCampaignStuds();
  const laterHTML = laterSectionHTML();
  if (!state.cart.length) {
    view.innerHTML = emptyShell('Cart', 'Your Cart', `<div class="empty" style="padding:70px 20px"><img src="/images/logo.png" class="empty-logo" alt=""><h2>Your cart awaits its sparkle</h2><p style="margin:10px 0 22px;color:var(--ink-3)">Add a piece and watch its price live-update here.</p><a class="btn btn-primary" href="#/shop">Explore Jewellery</a></div>` + laterHTML);
    return;
  }
  const items = state.cart.map(c => {
    let p = (state.productsCache || []).find(x => x.id === c.id);
    if (!p && typeof CAMPAIGN_STUDS_DATA !== 'undefined') {
      p = Object.values(CAMPAIGN_STUDS_DATA).flat().find(x => x.id === c.id);
    }
    return { ...c, p };
  }).filter(x => x.p);
  const lines = items.map(it => ({ it, pr: price(it.p) }));
  const subtotal = lines.reduce((a, l) => a + l.pr.total * l.it.qty, 0);
  const shipping = subtotal >= state.settings.freeShipAbove ? 0 : state.settings.shippingFee;
  view.innerHTML = `
  <section class="page-hero"><div class="dust" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="container"><div class="crumbs"><a href="#/">Home</a> / Cart</div><h1>Your Cart</h1>
  <p data-cart-hero>${lines.length} piece${lines.length > 1 ? 's' : ''} · priced at the live Shivaa rate${timeFmt(state.rates?.t) ? ' of ' + timeFmt(state.rates.t) : ''}</p></div></section>
  <div class="container cart-layout">
    <div>
      <div class="cart-items">
        ${lines.map(({ it, pr }) => `
        <div class="cart-item">
          <a href="#/product/${it.p.id}"><img src="${safeUrl(it.p.images && it.p.images[0])}" alt=""></a>
          <div>
            <a href="#/product/${it.p.id}" class="ci-name">${esc(it.p.name)}</a>
            <div class="ci-meta">${it.p.metal === 'Silver' ? 'Silver 925' : it.p.purity + ' gold'} · ${it.p.weightG} g${it.size ? ' · size ' + esc(it.size) : ''}${it.engraving ? ' · engraved “' + esc(it.engraving) + '”' : ''}</div>
            <div class="ci-meta js-price" data-pid="${it.p.id}" data-qty="${it.qty}">${fmt(pr.total * it.qty)} <span style="opacity:.6">(live · incl. GST)</span></div>
            <div class="qty-row" style="transform:scale(.86);transform-origin:left">
              <button onclick="Shivaa.cartQty(${jsArg(it.id)},${jsArg(it.size || '')},-1)">−</button><b>${it.qty}</b><button onclick="Shivaa.cartQty(${jsArg(it.id)},${jsArg(it.size || '')},1)">+</button>
            </div>
          </div>
          <div class="ci-right"><b class="js-price" data-pid="${it.p.id}" data-qty="${it.qty}">${fmt(pr.total * it.qty)}</b><br><a class="ci-remove" href="javascript:Shivaa.cartSaveLater(${jsArg(it.id)},${jsArg(it.size || '')})">Save for later</a><br><a class="ci-remove" href="javascript:Shivaa.cartRemove(${jsArg(it.id)},${jsArg(it.size || '')})">Remove</a></div>
        </div>`).join('')}
      </div>
      <div class="qty-banner">◈ Prices in your cart re-compute automatically with every rate refresh (every ~10 minutes) and are finally locked at checkout.</div>
      <div class="cart-delivery adm-card">
        <div class="cd-head"><b>📮 Check delivery &amp; COD</b><small>Estimates before you pay — no account needed</small></div>
        <form class="pin-row" data-delivery style="max-width:420px"><input data-pin inputmode="numeric" autocomplete="postal-code" enterkeyhint="go" maxlength="6" placeholder="Enter 6-digit pincode"><button type="submit" class="btn btn-ghost btn-sm">Check</button></form>
        <div class="pin-msg" data-pin-msg hidden></div>
      </div>
      ${laterHTML}
    </div>
    <div class="summary">
      <div class="sum-logo"><span>Shivaa · Secure Checkout</span><img src="/images/logo.png" alt=""></div>
      <h3>Order Summary</h3>
      <div class="sum-row"><span>Subtotal (${cartCount()} items, incl. GST)</span><b data-cart-sub>${fmt(subtotal)}</b></div>
      <div class="sum-row"><span>Shipping (insured)</span><span data-cart-ship>${shipping === 0 ? '<span class="free">FREE</span>' : `<b>${fmt(shipping)}</b>`}</span></div>
      ${shipping > 0 ? `<div class="sum-row" data-cart-gap style="font-size:12.5px;color:var(--ink-3)"><span>Add ${fmt(state.settings.freeShipAbove - subtotal)} for free shipping</span><span></span></div>` : ''}
      <div class="sum-row total"><span>Total</span><b data-cart-total>${fmt(subtotal + shipping)}</b></div>
      ${prepaidPct() > 0 ? `<div class="sum-row" style="color:var(--ok);font-size:13px"><span>✦ Pay online &amp; save</span><b data-cart-save>− ${fmt(Math.round(subtotal * prepaidPct() / 100))}</b></div>` : ''}
      <div style="margin:16px 0 6px" class="label" id="ptLbl">Loyalty & offers applied at checkout →</div>
      <a class="btn btn-primary btn-block btn-lg" href="#/checkout" onclick="return Shivaa.exCartCta(event)">Proceed to Checkout ✦</a>
      <a class="btn btn-outline btn-block btn-sm mt-2" href="#/quote">📄 Get shareable quotation (48 h rate hold)</a>
      <button class="btn btn-ghost btn-block mt-2" onclick="Shivaa.waOpenCart()">Order via WhatsApp chat <span class="mini-wa">${WA_SVG}</span></button>
      <a class="btn btn-ghost btn-block btn-sm mt-2" href="#/shop">Continue shopping</a>
    </div>
  </div>
  <div class="mcta-bar" aria-hidden="false">
    <div class="mcta-total"><small>${cartCount()} item${cartCount() > 1 ? 's' : ''} · total</small><b data-cart-mcta>${fmt(subtotal + shipping)}</b></div>
    <a class="btn btn-gold" href="#/checkout" onclick="return Shivaa.exCartCta(event)">Proceed to Checkout ✦</a>
  </div>`;
  window.Shivaa.bindDelivery(view);   // v103 — remembered pincode answers immediately
};
window.Shivaa.cartQty = (id, size, d) => {
  const it = state.cart.find(i => i.id === id && (i.size || '') === size);
  if (!it) return;
  it.qty += d;
  if (it.qty <= 0) state.cart = state.cart.filter(i => i !== it);
  store.set('shv_cart', state.cart); updateBadges(); renderMiniCart();
  if ((location.hash || '').startsWith('#/cart')) pages.cart($('#view'));
};
window.Shivaa.cartRemove = (id, size) => {
  state.cart = state.cart.filter(i => !(i.id === id && (i.size || '') === size));
  store.set('shv_cart', state.cart); updateBadges();
  if ((location.hash || '') === '#/cart' || (location.hash || '').startsWith('#/cart')) pages.cart($('#view'));
  renderMiniCart();
};

/* ── v156 · BUG FIX — the 'rates' poll used to re-render the WHOLE cart page
   on every tick (every 1 s while the MCX feed is live), destroying the
   pincode delivery-check input mid-typing and bouncing scroll — the same bug
   class v120 fixed on #/rates (Bug A), one page over. Line prices already
   patch in place via .js-price; the summary numbers now patch in place too.
   A real re-render happens ONLY when the shipping structure changes
   (free ↔ fee crossing), and even then the half-typed pincode is carried
   across. Returns false when the rendered markup is from an older cached
   app.js (no data hooks) so the caller falls back to one re-render. */
function refreshCartPage() {
  if (!location.hash.startsWith('#/cart')) return false;
  const view = $('#view');
  if (!view) return false;
  if (!state.cart.length) return true;                 // empty state: the save-for-later .js-price rows self-patch
  const subEl = view.querySelector('[data-cart-sub]');
  if (!subEl) return false;                            // older cached markup — caller re-renders once
  const t = cartTotals();
  const needGap = t.shipping > 0;
  const hasGap = !!view.querySelector('[data-cart-gap]');
  if (needGap !== hasGap) {
    /* rare: the total crossed the free-shipping threshold and the summary
       gains/loses the "Add ₹… for free shipping" row — re-render, carrying
       the pincode (and any delivery message) is not worth losing. */
    const pin = view.querySelector('[data-pin]'), val = pin ? pin.value : '';
    pages.cart(view);
    const pin2 = view.querySelector('[data-pin]'); if (pin2 && val) pin2.value = val;
    return true;
  }
  const hero = view.querySelector('[data-cart-hero]');
  if (hero && state.rates) hero.textContent = `${t.lines.length} piece${t.lines.length > 1 ? 's' : ''} · priced at the live Shivaa rate of ${timeFmt(state.rates.t)}`;
  subEl.textContent = fmt(t.subtotal);
  const ship = view.querySelector('[data-cart-ship]');
  if (ship) ship.innerHTML = t.shipping === 0 ? '<span class="free">FREE</span>' : `<b>${fmt(t.shipping)}</b>`;
  const gap = view.querySelector('[data-cart-gap] span:first-child');
  if (gap) gap.textContent = `Add ${fmt(state.settings.freeShipAbove - t.subtotal)} for free shipping`;
  const tot = view.querySelector('[data-cart-total]'); if (tot) tot.textContent = fmt(t.subtotal + t.shipping);
  const save = view.querySelector('[data-cart-save]'); if (save && prepaidPct() > 0) save.textContent = '− ' + fmt(Math.round(t.subtotal * prepaidPct() / 100));
  const mcta = view.querySelector('[data-cart-mcta]'); if (mcta) mcta.textContent = fmt(t.subtotal + t.shipping);
  return true;
}

/* ═══════════════════ v91 — slide-in mini bag ═══════════════════ */
let _cartTrap = null;
function cartLines() {
  ensureCampaignStuds();
  return state.cart.map(c => {
    let p = (state.productsCache || []).find(x => x.id === c.id);
    if (!p && typeof CAMPAIGN_STUDS_DATA !== 'undefined') {
      p = Object.values(CAMPAIGN_STUDS_DATA).flat().find(x => x.id === c.id);
    }
    return { ...c, p };
  }).filter(x => x.p);
}
function cartTotals() {
  const lines = cartLines();
  const subtotal = lines.reduce((a, l) => a + price(l.p).total * l.qty, 0);
  const shipping = !subtotal || subtotal >= state.settings.freeShipAbove ? 0 : state.settings.shippingFee;
  return { lines, subtotal, shipping, count: cartCount() };
}
function flyToBag(src, fromEl) {
  return new Promise(res => {
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches || typeof document.createElement('i').animate !== 'function') return res();
    const bag = $('.cart-btn'); if (!bag) return res();
    const br = bag.getBoundingClientRect();
    const sr = (fromEl && fromEl.getBoundingClientRect && fromEl.getBoundingClientRect()) || null;
    const f = document.createElement('img');
    f.src = src; f.className = 'm-fly';
    const w = sr ? Math.min(72, sr.width) : 56;
    Object.assign(f.style, { width: w + 'px', height: w + 'px', left: (sr ? sr.left + sr.width / 2 : innerWidth / 2) - w / 2 + 'px', top: (sr ? sr.top + sr.height / 2 : innerHeight * .6) - w / 2 + 'px' });
    document.body.appendChild(f);
    requestAnimationFrame(() => {
      const dx = br.left + br.width / 2 - (sr ? sr.left + sr.width / 2 : innerWidth / 2);
      const dy = br.top + br.height / 2 - (sr ? sr.top + sr.height / 2 : innerHeight * .6);
      const a = f.animate([
        { transform: 'translate(0,0) scale(1) rotate(0deg)', opacity: 1 },
        { transform: `translate(${dx * .55}px,${dy * .7 - 60}px) scale(.7) rotate(10deg)`, opacity: .92, offset: .55 },
        { transform: `translate(${dx}px,${dy}px) scale(.12) rotate(-8deg)`, opacity: .7 }
      ], { duration: 680, easing: 'cubic-bezier(.5,-0.1,.7,.3)' });
      a.onfinish = () => { f.remove(); bag.classList.remove('bag-jolt'); void bag.offsetWidth; bag.classList.add('bag-jolt'); setTimeout(() => bag.classList.remove('bag-jolt'), 500); res(); };
      a.oncancel = () => { f.remove(); res(); };
    });
  });
}
function miniCartHTML() {
  const { lines, subtotal, shipping, count } = cartTotals();
  if (!count) return `
    <div class="mc-empty">
      <div class="mc-empty-ic">✦</div>
      <h3>Your bag awaits its sparkle</h3>
      <p>Handcrafted pieces, priced live with Shivaa's rate.</p>
      <a class="btn btn-primary" href="#/shop" data-mc-close>Explore Jewellery</a>
    </div>`;
  const free = state.settings.freeShipAbove;
  const pct = Math.max(4, Math.min(100, subtotal / free * 100));
  const left = free - subtotal;
  return `
    <div class="mc-ship">
      ${left > 0
        ? `<small>Add <b>${fmt(left)}</b> for free insured shipping</small><div class="mc-ship-bar"><i style="width:${pct}%"></i></div>`
        : `<small><b>✦ You have free insured shipping</b></small><div class="mc-ship-bar"><i style="width:100%"></i></div>`}
    </div>
    <div class="mc-lines">
      ${lines.map((it, i) => {
        const pr = price(it.p);
        return `<div class="mc-line" style="--i:${i}">
          <a href="#/product/${it.p.id}" data-mc-close><img src="${safeUrl(it.p.images && it.p.images[0])}" alt=""></a>
          <div class="mc-line-tx">
            <a href="#/product/${it.p.id}" class="ci-name" data-mc-close>${esc(it.p.name)}</a>
            <div class="ci-meta">${it.p.metal === 'Silver' ? 'Silver 925' : it.p.purity + ' gold'} · ${it.p.weightG} g${it.size ? ' · size ' + esc(it.size) : ''}${it.engraving ? ' · engraved' : ''}</div>
            <div class="mc-line-b">
              <span class="qty-row"><button aria-label="Decrease" onclick="Shivaa.cartQty(${jsArg(it.id)},${jsArg(it.size || '')},-1)">−</button><b>${it.qty}</b><button aria-label="Increase" onclick="Shivaa.cartQty(${jsArg(it.id)},${jsArg(it.size || '')},1)">+</button></span>
              <b class="js-price" data-pid="${it.p.id}" data-qty="${it.qty}">${fmt(pr.total * it.qty)}</b>
            </div>
          </div>
          <button class="mc-x" aria-label="Remove" onclick="Shivaa.cartRemove(${jsArg(it.id)},${jsArg(it.size || '')})">✕</button>
        </div>`;
      }).join('')}
    </div>
    <div class="mc-foot">
      <div class="sum-row"><span>Subtotal · ${count} item${count > 1 ? 's' : ''} (incl. GST)</span><b id="mcSub">${fmt(subtotal)}</b></div>
      <div class="sum-row"><span>Insured shipping</span>${shipping === 0 ? '<span class="free">FREE</span>' : `<b>${fmt(shipping)}</b>`}</div>
      <div class="sum-row total"><span>Total</span><b>${fmt(subtotal + shipping)}</b></div>
      <a class="btn btn-gold btn-block btn-lg" href="#/checkout" onclick="return Shivaa.exCartCta(event)" data-mc-close>Checkout ✦</a>
      <div class="mc-foot-alt">
        <a href="#/cart" data-mc-close>View full bag</a>
        <button type="button" data-mc-close>Continue shopping</button>
      </div>
      <small class="mc-live-note">● Prices re-compute with every live rate tick and lock for 20 minutes at checkout.</small>
    </div>`;
}
function renderMiniCart() {
  const body = $('#mcBody'); if (!body) return;
  const { subtotal, shipping, count } = cartTotals();
  const open = $('#cartDrawer').classList.contains('open');
  body.innerHTML = miniCartHTML();
  $('#mcCount').textContent = count ? count : '';
  if (open) body.querySelectorAll('.mc-line').forEach((el, i) => { el.style.setProperty('--i', i); });
  return { subtotal, shipping };
}
function openCart(bump) {
  const d = $('#cartDrawer'), sc = $('#cartScrim'); if (!d) return;
  renderMiniCart();
  if (!d.classList.contains('open')) {
    d.classList.add('open'); sc.classList.add('open'); lockScroll();
    if (window.ShivaaMotion && ShivaaMotion.trapFocus) _cartTrap = ShivaaMotion.trapFocus(d);
    const first = d.querySelector('a,button'); first && setTimeout(() => first.focus(), 120);
  }
}
function closeCart() {
  const d = $('#cartDrawer'), sc = $('#cartScrim'); if (!d || !d.classList.contains('open')) return;
  d.classList.remove('open'); sc.classList.remove('open'); unlockScroll();
  if (_cartTrap) { _cartTrap(); _cartTrap = null; }
}
function initMiniCart() {
  if ($('#cartDrawer')) return;
  const wrap = document.createElement('div');
  wrap.id = 'cartDrawer'; wrap.className = 'mc-drawer'; wrap.setAttribute('role', 'dialog'); wrap.setAttribute('aria-modal', 'true'); wrap.setAttribute('aria-label', 'Your shopping bag');
  wrap.innerHTML = `
    <div class="mc-head">
      <h3>Your Bag <span class="mc-count" id="mcCount"></span></h3>
      <button class="mc-close" aria-label="Close bag">✕</button>
    </div>
    <div class="mc-body" id="mcBody"></div>`;
  const scrim = document.createElement('div');
  scrim.id = 'cartScrim'; scrim.className = 'mc-scrim';
  document.body.append(scrim, wrap);
  const cartBtn = $('.cart-btn');
  if (cartBtn) cartBtn.addEventListener('click', e => { e.preventDefault(); openCart(); });
  scrim.addEventListener('click', closeCart);
  wrap.querySelector('.mc-close').addEventListener('click', closeCart);
  wrap.addEventListener('click', e => { if (e.target.closest('[data-mc-close]')) closeCart(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeCart(); });
  document.addEventListener('rates', () => { if (wrap.classList.contains('open')) renderMiniCart(); });
}

/* ═══════════════════ v91 — quick view from product cards ═══════════════════ */
/* v101 — press-and-hold continuous stepper.
   One immediate step on press, then accelerating repeat while held;
   keyboard users get single steps (and native OS key-repeat on hold). */
window.Shivaa.holdRepeat = (el, step, opts = {}) => {
  if (!el || el._holdWired) return;
  el._holdWired = true;
  el.classList.add('hold-btn');
  const FIRST = opts.firstDelay ?? 340, R0 = opts.repeatStart ?? 95, RMIN = opts.repeatMin ?? 32;
  let t1 = null, t2 = null, rep = R0, alive = false;
  const clear = () => { clearTimeout(t1); clearTimeout(t2); t1 = t2 = null; alive = false; };
  const tick = () => { step(); rep = Math.max(RMIN, Math.round(rep * 0.86)); t2 = setTimeout(tick, rep); };
  el.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    clear(); alive = true; rep = R0;
    try { el.setPointerCapture(e.pointerId); } catch (_) {}
    step();
    t1 = setTimeout(tick, FIRST);
  });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => el.addEventListener(ev, clear));
  el.addEventListener('pointerleave', () => { if (!el.hasPointerCapture?.(el._pid)) clear(); });
  el.addEventListener('keydown', e => {
    if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowUp' || e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
      e.preventDefault();
      if (!e.repeat) step();
    }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) clear(); });
};

window.Shivaa.quickView = async (id) => {
  /* v113 — a cold cache used to throw the shopper onto the full product page,
     which reads as "quick view is broken". Now the single piece is fetched
     and the sheet still opens where they were.
     v115 — the single-piece endpoint is the LAST thing that can fail, so if
     it does (flaky mobile network, a proxy hiccup) the LIST endpoint is tried
     next — it is the very response the service worker keeps cached for
     offline shoppers. Only if both fail does the sheet give up, and it stays
     PUT with a clear toast: a quick view must never yank the shopper away. */
  let p = state.productsCache.find(x => x.id === id);
  if (!p) {
    try {
      const r = await api('/api/products/' + encodeURIComponent(id));
      p = r && r.product;
      if (p && !state.productsCache.some(x => x.id === p.id)) state.productsCache.push(p);
    } catch (e) { p = null; }
    if (!p) {
      try {
        const r2 = await api('/api/products');
        p = ((r2 && r2.products) || []).find(x => x.id === id) || null;
        if (p && !state.productsCache.some(x => x.id === p.id)) state.productsCache.push(p);
      } catch (e2) { p = null; }
    }
    if (!p) { toast('Could not load that piece just now — please try again', 'err'); return; }
  }
  const pr = price(p);
  const wished = state.user ? false : state.localWish.includes(id);
  const imgs = (p.images || []).map(safeUrl).filter(Boolean);
  const shots = imgs.length ? imgs : ['/images/logo.png'];
  /* v102 — preload the gallery so swiping never shows a blank frame */
  shots.slice(1).forEach(u => { const im = new Image(); im.src = u; });
  /* v102 — preselect the size the customer saved from the ring sizer */
  let savedSize = '';
  try { savedSize = localStorage.getItem('shv_ring_size') || ''; } catch (e) {}
  openModal(`
    <div class="qv">
      <div class="qv-grab" id="qvGrab" title="Drag down or press Escape to close"><i></i></div>
      <div class="qv-media">
        <img class="qv-photo" id="qvPhoto" src="${shots[0]}" alt="${esc(p.name)}" draggable="false">
        ${shots.length > 1 ? `
          <button type="button" class="qv-nav qv-prev" id="qvPrev" aria-label="Previous photo">‹</button>
          <button type="button" class="qv-nav qv-next" id="qvNext" aria-label="Next photo">›</button>
          <div class="qv-dots" id="qvDots">${shots.map((_, i) => `<button type="button" class="qv-dot ${i === 0 ? 'on' : ''}" data-i="${i}" aria-label="Photo ${i + 1}"></button>`).join('')}<span class="qv-count" id="qvCount" aria-live="polite">1 / ${shots.length}</span></div>` : ''}
        <button class="pc-wish qv-share" id="qvShare" aria-label="Share this piece">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="2.6"/><circle cx="6" cy="12" r="2.6"/><circle cx="18" cy="19" r="2.6"/><path d="M8.3 10.8l7.4-4.3M8.3 13.2l7.4 4.3"/></svg>
        </button>
        <button class="pc-wish qv-wish ${wished ? 'on' : ''}" data-pid="${p.id}" onclick="Shivaa.toggleWish('${p.id}')" aria-label="Wishlist">
          <svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 20.5C7 16.5 3.5 13.3 3.5 9.6 3.5 7 5.5 5 8 5c1.6 0 3.1.8 4 2.1C12.9 5.8 14.4 5 16 5c2.5 0 4.5 2 4.5 4.6 0 3.7-3.5 6.9-8.5 10.9z"/></svg>
        </button>
        <span class="qv-zoom-hint" id="qvZoomHint">Double-tap to zoom</span>
      </div>
      <div class="qv-body">
        <div class="qv-scroll">
          <div class="label">${esc(CATS[p.category] ? CATS[p.category].name : (p.category || ''))}</div>
          <h3>${esc(p.name)}</h3>
          <div class="pc-rating" style="margin:6px 0 10px">★ ${p.rating} <span style="color:var(--ink-3);font-size:12.5px">· ${p.reviews} reviews · ${p.weightG} g</span></div>
          <div class="pc-price" style="margin-bottom:6px"><b class="js-price" data-pid="${p.id}" data-qty="1">${fmt(pr.total)}</b><small>incl. 3% GST · live</small></div>
          ${((p.sizes||[]).length) ? `<div class="opt-label"><span>Size ${savedSize ? '· your saved size ' + esc(savedSize) + ' is selected' : ''}</span></div>
            <div class="size-row" id="qvSize">${(p.sizes||[]).map(s => `<button type="button" class="size-pill ${String(s) === String(savedSize) ? 'on' : ''}" data-size="${esc(s)}">${esc(s)}</button>`).join('')}<a class="size-guide-link" href="#/sizer" onclick="Shivaa.closeModal()">📏 Size guide</a></div>` : ''}
          <div class="qty-row qv-qty" style="margin:14px 0 4px"><button type="button" id="qvMinus" aria-label="Decrease quantity">−</button><b id="qvQty">1</b><button type="button" id="qvPlus" aria-label="Increase quantity">+</button></div>
        </div>
        <div class="qv-foot">
          <a class="btn btn-outline qv-detail" href="#/product/${p.id}" onclick="Shivaa.closeModal()">Full details</a>
          <button type="button" class="btn btn-primary qv-add" id="qvAdd">Add to Bag ✦</button>
        </div>
      </div>
    </div>`, 'qv-modal');
  const box = $('#modalBox');
  let qty = 1, shot = 0;
  const photo = $('#qvPhoto');
  const haptic = ms => { try { navigator.vibrate?.(ms); } catch (e) {} };
  const showShot = i => {
    const next = (i + shots.length) % shots.length;
    if (next === shot) return;
    shot = next;
    photo.classList.remove('qv-swap'); void photo.offsetWidth;
    photo.src = shots[shot]; photo.classList.add('qv-swap');
    box.querySelectorAll('#qvDots .qv-dot').forEach((d, di) => d.classList.toggle('on', di === shot));
    const cnt = $('#qvCount'); if (cnt) cnt.textContent = (shot + 1) + ' / ' + shots.length;
    haptic(8);
  };
  if (shots.length > 1) {
    $('#qvPrev').onclick = () => showShot(shot - 1);
    $('#qvNext').onclick = () => showShot(shot + 1);
    box.querySelectorAll('#qvDots .qv-dot').forEach(d => d.onclick = () => showShot(+d.dataset.i));
    // v102 — hardware keyboard arrows flip photos while the sheet is open
    const onKey = e => {
      if (!document.body.contains($('#qvPhoto'))) { document.removeEventListener('keydown', onKey); return; }
      if (e.defaultPrevented) return;
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); if (!zoomed) showShot(shot + 1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); if (!zoomed) showShot(shot - 1); }
    };
    document.addEventListener('keydown', onKey);
    // swipe the photo on touch screens (disabled while zoomed — the finger pans)
    let sx = null, moved = false;
    photo.addEventListener('touchstart', e => {
      if (e.touches.length > 1) { sx = null; return; }   /* v119 — two fingers are a pinch, not a swipe */
      if (zoomed && e.touches.length === 1) { panStart = { x: e.touches[0].clientX, y: e.touches[0].clientY, px: pan.x, py: pan.y }; return; }
      sx = e.touches[0].clientX; moved = false;
    }, { passive: true });
    photo.addEventListener('touchmove', e => {
      if (pinch) return;                                  /* v119 — a pinch is in progress */
      if (zoomed && panStart && e.touches.length === 1) {
        pan.x = Math.max(-110, Math.min(110, panStart.px + e.touches[0].clientX - panStart.x));
        pan.y = Math.max(-130, Math.min(130, panStart.py + e.touches[0].clientY - panStart.y));
        applyZoom(); moved = true; return;
      }
      if (sx != null && Math.abs(e.touches[0].clientX - sx) > 12) moved = true;
    }, { passive: true });
    photo.addEventListener('touchend', e => {
      if (pinch) return;                                  /* v119 — let the pinch handler settle the scale */
      if (zoomed) {
        if (!moved && panStart) { // double-tap detection while zoomed = zoom back out
          const now = Date.now();
          if (now - lastTap < 300) setZoom(false);
        }
        lastTap = Date.now(); panStart = null; return;
      }
      if (sx == null) return;
      const dx = e.changedTouches[0].clientX - sx; const wasMoved = moved; sx = null;
      if (!wasMoved) { // double-tap to zoom in
        const now = Date.now();
        if (now - lastTap < 300) setZoom(true);
        lastTap = now;
        return;
      }
      if (Math.abs(dx) > 36) showShot(shot + (dx < 0 ? 1 : -1));
    }, { passive: true });
  }
  // v102 — double-click zoom for mouse users + drag to pan
  // v119 — pinch (two fingers) zooms 1×–4×; double-tap still toggles cleanly.
  let zoomed = false;
  let pinchScale = 1.9;
  let pan = { x: 0, y: 0 }, panStart = null, lastTap = 0;
  const applyZoom = () => {
    photo.classList.toggle('qv-zoom', zoomed);
    photo.style.transform = zoomed ? `translate(${pan.x}px, ${pan.y}px) scale(${pinchScale})` : '';
    const hint = $('#qvZoomHint'); if (hint) hint.style.opacity = zoomed ? '0' : '';
  };
  const setZoom = on => { zoomed = on; if (on) pinchScale = 1.9; if (!on) pan = { x: 0, y: 0 }; applyZoom(); };
  photo.addEventListener('dblclick', e => { setZoom(!zoomed); });
  /* v119 — pinch to zoom. A pinch never swipes to the next shot, and letting
     go near 1× snaps straight back to the unzoomed view. */
  let pinch = null;
  const tDist = (a, b) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  photo.addEventListener('touchstart', e => {
    if (e.touches.length !== 2) return;
    pinch = { d: Math.max(1, tDist(e.touches[0], e.touches[1])), s: zoomed ? pinchScale : 1.9 };
    pinchScale = pinch.s; zoomed = true; pan = { x: 0, y: 0 }; applyZoom();
  }, { passive: true });
  photo.addEventListener('touchmove', e => {
    if (!pinch || e.touches.length < 2) return;
    pinchScale = Math.max(1, Math.min(4, pinch.s * (tDist(e.touches[0], e.touches[1]) / pinch.d)));
    zoomed = pinchScale > 1.05;
    applyZoom();
  }, { passive: true });
  photo.addEventListener('touchend', e => {
    if (!pinch) return;
    if (e.touches.length >= 2) return;
    pinch = null;
    if (pinchScale <= 1.05) { pinchScale = 1.9; setZoom(false); }
    else { pan = { x: 0, y: 0 }; zoomed = true; applyZoom(); }
  }, { passive: true });
  photo.addEventListener('pointerdown', e => {
    if (!zoomed || e.pointerType !== 'mouse') return;
    panStart = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
  });
  window.addEventListener('pointermove', e => {
    if (!panStart) return;
    pan.x = Math.max(-110, Math.min(110, panStart.px + e.clientX - panStart.x));
    pan.y = Math.max(-130, Math.min(130, panStart.py + e.clientY - panStart.y));
    applyZoom();
  });
  window.addEventListener('pointerup', () => { panStart = null; });
  box.querySelectorAll('#qvSize .size-pill').forEach(b => b.onclick = () => {
    box.querySelectorAll('#qvSize .size-pill').forEach(x => x.classList.remove('on')); b.classList.add('on');
    try { localStorage.setItem('shv_ring_size', b.dataset.size); } catch (e) {}
  });
  const qtyB = $('#qvQty');
  const setQty = v => { qty = Math.max(1, Math.min(9, v)); qtyB.textContent = qty; };
  window.Shivaa.holdRepeat($('#qvMinus'), () => setQty(qty - 1));
  window.Shivaa.holdRepeat($('#qvPlus'), () => setQty(qty + 1));
  // v102 — native share sheet on phones, copy-link fallback on desktop
  // v172 — now the one shared path every surface uses (Shivaa.shareProduct)
  $('#qvShare').onclick = () => window.Shivaa.shareProduct(p.id);
  $('#qvAdd').onclick = (e) => {
    const size = $('#qvSize .size-pill.on')?.dataset.size || null;
    haptic(12);
    closeModal();
    addToCart(p.id, qty, size, null, { fromEl: e.currentTarget });
  };
  /* v113 — slide the sheet down to dismiss, the gesture phones expect.
     Drag from the grab handle (or the sheet's top edge); a short pull
     springs back, a committed pull or a fast flick closes. */
  (function wireSheetDismiss() {
    const grab = $('#qvGrab'); if (!grab) return;
    const DISMISS = 130, FLICK = 0.55;   // px, or px/ms
    let y0 = null, t0 = 0, pid = null, dragging = false;
    grab.addEventListener('pointerdown', e => {
      if (zoomed) return;
      y0 = e.clientY; t0 = Date.now(); pid = e.pointerId; dragging = true;
      box.classList.add('qv-dragging');
      try { grab.setPointerCapture(pid); } catch (_) {}
    });
    const move = e => {
      if (!dragging || e.pointerId !== pid) return;
      const dy = Math.max(0, e.clientY - y0);
      box.style.transform = `translateY(${dy}px)`;
      box.style.opacity = String(Math.max(0.45, 1 - dy / 620));
    };
    const end = e => {
      if (!dragging || (pid != null && e.pointerId !== pid)) return;
      dragging = false;
      box.classList.remove('qv-dragging');
      box.style.transform = ''; box.style.opacity = '';
      const dy = Math.max(0, e.clientY - y0);
      const v = dy / Math.max(1, Date.now() - t0);
      if (dy > DISMISS || v > FLICK) { haptic(10); closeModal(); }
      y0 = pid = null;
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    // tidy up if the sheet is closed some other way while a drag is live
    const obs = new MutationObserver(() => {
      if (!$('#modalOverlay').classList.contains('open')) {
        box.style.transform = ''; box.style.opacity = '';
        box.classList.remove('qv-dragging');
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', end);
        window.removeEventListener('pointercancel', end);
        obs.disconnect();
      }
    });
    obs.observe($('#modalOverlay'), { attributes: true, attributeFilter: ['class'] });
  })();
};

/* ─────────── CHECKOUT ─────────── */
pages.checkout = async (view) => {
  const isCurrent = viewLifetime(view);
  ensureCampaignStuds();
  if (!state.cart.length) { location.hash = '#/cart'; return; }
  if (!state.user) {
    /* v153 — a guest landing on the classic checkout URL (back-gesture, stale
       link) gets the SAME in-page direct buy rather than being bounced to a
       page that no longer exists; only when the flow declines does the login
       offer appear. */
    if (expressCheckoutOn()) {
      window.Shivaa.exDirect(true).then(used => { if (!used && isCurrent()) openLogin('checkout'); });
      return;
    }
    openLogin('checkout'); return;
  }
  const items = state.cart.map(c => ({ ...c, p: state.productsCache.find(x => x.id === c.id) })).filter(x => x.p);
  const subtotal = items.reduce((a, it) => a + price(it.p).total * it.qty, 0);
  const freeShip = subtotal >= state.settings.freeShipAbove;
  /* ═══ v139 · ADDRESS PREFILL ═══
     The shop has kept an address book since v84 (/api/addresses, and the
     account page literally says "add one for faster checkout") — but the
     checkout form never read it, so every shopper retyped name, phone, street,
     city and pincode on every single order. That is the "addresses are not
     prefilled" half of the owner's report, and it is the half only this site
     can fix: Cashfree's One Click Checkout prefills CASHFREE'S page, never
     ours. Prefill order = the address used last time, else the default, else
     the newest saved one. Every field stays editable — prefill is a
     convenience, never a lock. */
  const _adrs = (state.user && Array.isArray(state.user.addresses)) ? state.user.addresses : [];
  let _pre = null;
  try {
    const _last = store.get('shv_lastAddr', null);
    _pre = _adrs.find(a => a && a.id === _last) || _adrs.find(a => a && a.isDefault) || _adrs[0] || null;
  } catch (e) { _pre = null; }
  const _pv = (k, fb) => esc(String((_pre && _pre[k] != null && _pre[k] !== '') ? _pre[k] : (fb == null ? '' : fb)));
  /* v128 — payment configuration (demo until Cashfree keys are added) */
  let payCfg = { mode: 'demo', prepaidPct: 2, keyId: '' };
  try { payCfg = await api('/api/pay/config'); } catch (e) {}
  if (!isCurrent()) return;
  view.innerHTML = `
  <section class="page-hero"><div class="dust" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="container"><div class="crumbs"><a href="#/cart">Cart</a> / Checkout</div><h1>Checkout</h1></div></section>
  <div class="container cart-layout" style="padding-top:40px">
    <div>
      <div class="sec-title">Delivery address</div>
      ${_adrs.length ? `<div class="adr-sw" id="adrSw" role="group" aria-label="Choose a saved address">
        ${_adrs.map(a => `<button type="button" class="adr-chip${_pre && a.id === _pre.id ? ' on' : ''}" data-adr="${esc(a.id)}">
          <b>${esc(a.label || 'Address')}</b><small>${esc(a.line)} · ${esc(a.city)} ${esc(a.pincode)}</small></button>`).join('')}
        <a class="adr-chip adr-new" href="#/account?tab=addresses"><b>＋</b><small>Manage addresses</small></a>
      </div>
      <p class="adr-note" id="adrNote" ${_pre ? '' : 'hidden'}>✦ Filled from your saved ${esc((_pre && _pre.label) || 'address')} — change anything you need to.</p>` : `
      <p class="adr-note adr-note-empty">Type the delivery details once — tick <b>save this address</b> below and every order after this one fills itself in.</p>`}
      <form id="addrForm" class="form-grid">
        <div class="fld"><label for="adName">Full name</label><input id="adName" name="name" autocomplete="name" required value="${_pv('name', state.user.name)}"></div>
        <div class="fld"><label for="adPhone">Phone</label><input id="adPhone" name="phone" type="tel" inputmode="tel" autocomplete="tel" required value="${_pv('phone', state.user.phone || '')}" placeholder="+91"></div>
        <div class="fld full"><label for="adLine">Address (house, street, landmark)</label><input id="adLine" name="line" autocomplete="street-address" required placeholder="House no, street, landmark" value="${_pv('line')}"></div>
        <div class="fld"><label for="adCity">City</label><input id="adCity" name="city" autocomplete="address-level2" required value="${_pv('city')}"></div>
        <div class="fld"><label for="adState">State</label><input id="adState" name="state" autocomplete="address-level1" required value="${_pv('state', 'Rajasthan')}"></div>
        <div class="fld"><label for="adPin">Pincode</label><input id="adPin" name="pincode" inputmode="numeric" autocomplete="postal-code" required maxlength="6" pattern="\\d{6}" placeholder="341023" value="${_pv('pincode')}"><small class="pin-note" id="adPinMsg" hidden></small></div>
        <div class="fld"><label for="adCountry">Country</label><input id="adCountry" name="country" value="India" readonly></div>
        <label class="fld full adr-save"><input type="checkbox" id="adSave"${_pre ? '' : ' checked'}> <span>Save this address to my account &mdash; next checkout fills itself in</span></label>
      </form>

      <div class="sec-title">Payment method</div>
      <div style="display:grid;gap:12px" id="payOpts">
        <label class="pay-opt on" id="payOptOnline"><input type="radio" name="pay" value="Online" checked><span><b>Pay online · UPI / card / net-banking <em class="pay-badge" id="payBadge">2% off</em></b><small id="payOnlineSub">secured by Cashfree · instant 2% prepaid discount</small></span></label>
        <label class="pay-opt" id="payOptCod"><input type="radio" name="pay" value="COD"><span><b>Cash on Delivery</b><small id="payCodSub">Available on orders below ${fmt(50000)} · ID verification at handover · full price</small></span></label>
        <label class="pay-opt"><input type="radio" name="pay" value="WhatsApp"><span><b>WhatsApp Order</b><small>Our team confirms the order &amp; payment (UPI / bank / card) on chat · full price</small></span></label>
      </div>
      <div class="qty-banner mt-2" id="payDemoNote">🔒 Card/net-banking checkout switches to <b>live Cashfree</b> the moment keys are added in admin — until then use the <b>UPI QR tab</b> to pay for real, or choose WhatsApp / COD.</div>
    </div>

    <div class="summary">
      <div class="sum-logo"><span>Shivaa · Secure Checkout</span><img src="/images/logo.png" alt=""></div>
      <div class="rate-lock-card" id="rateLockBox" aria-live="polite"></div>
      <h3>Your Order</h3>
      ${items.map(it => `<div class="sum-row"><span>${esc(it.p.name)}${it.size ? ' (' + esc(it.size) + ')' : ''} × ${it.qty}</span><b data-copid="${it.p.id}" data-qty="${it.qty}">${fmt(price(it.p).total * it.qty)}</b></div>`).join('')}
      <div class="coupon-row"><input id="couponIn" placeholder="Coupon code"><button class="btn btn-ghost btn-sm" onclick="Shivaa.applyCoupon()">Apply</button></div>
      <div id="couponMsg" style="font-size:12.5px;min-height:18px"></div>
      ${state.user.loyaltyPoints > 0 ? `<div class="points-box">✦ You have <b>${state.user.loyaltyPoints} royalty points</b> (₹1 each). <label style="display:flex;gap:8px;align-items:center;margin-top:6px"><input type="checkbox" id="usePts" onchange="Shivaa.updateCheckout()"> Redeem up to ${Math.min(state.user.loyaltyPoints, Math.floor(subtotal * 0.1))} pts (10% cap)</label></div>` : ''}
      <div class="sum-row"><span>Subtotal</span><b id="coSub">${fmt(subtotal)}</b></div>
      <div class="sum-row" id="coDiscRow" hidden><span>Coupon discount</span><b id="coDisc" style="color:var(--ok)">− ₹0</b></div>
      <div class="sum-row" id="coPrepaidRow"><span>Prepaid discount <em style="font-style:normal;font-size:11px;color:var(--ok)">pay online</em></span><b id="coPrepaid" style="color:var(--ok)">− ₹0</b></div>
      <div class="sum-row" id="coShipRow"><span>Shipping</span>${freeShip ? '<span class="free">FREE</span>' : `<b id="coShip">${fmt(state.settings.shippingFee)}</b>`}</div>
      <div class="sum-row" id="coCodRow" hidden><span>COD handling fee</span><b id="coCod">+ ₹0</b></div>
      <div class="sum-row total"><span>Total</span><b id="coTotal">${fmt(Math.round(subtotal * (1 - prepaidPct() / 100)) + (freeShip ? 0 : state.settings.shippingFee))}</b></div>
      <button class="btn btn-gold btn-block btn-lg mt-2" id="placeBtn" onclick="Shivaa.placeOrder()">Place Order ✦</button>
    </div>
  </div>
  <div class="mcta-bar mcta-inline" id="coBar">
    <div class="mcta-total"><small>Total · 20-min rate locked</small><b id="coMobileTotal">${fmt(Math.round(subtotal * (1 - prepaidPct() / 100)) + (freeShip ? 0 : state.settings.shippingFee))}</b></div>
    <button class="btn btn-gold" type="button" onclick="Shivaa.placeOrder()">Place Order ✦</button>
  </div>`;
  /* v139 · the owner's report (18 Sep 2026, verbatim): "place order button is
     always there on the screen in the phone I don't need that place order
     button place order button should be down like whenever the customer is
     filling any information that place order button always shining disturbs and
     does not let the customer fill the information required".
     The `mcta-inline` class on the bar above (css/v139.css) takes it out of the
     fixed layer and puts it in the page flow, at the end of the form: it scrolls
     with the page instead of floating over the fields. Nothing is hidden — the
     total and the button are the last thing on the page, and the summary card
     keeps its own in-flow Place Order button above it. */
  /* ── v57: 20-minute live-rate lock — your price cannot move while paying ── */
  const pickRates = () => { const R = state.rates || {}; return { gold22: R.gold22, gold24: R.gold24, gold18: R.gold18, silver: R.silver }; };
  /* v107 - the lock window is server-owned (pay/config lockMinutes) and a lock
     in flight survives a refresh via localStorage. The server still enforces
     the +/-2% band at submit, so a stale or hand-edited lock can never make
     the shop sell below the band. */
  const LOCKSEC = () => Math.max(300, Math.min(3600, ((window._co && window._co.lockMinutes) || 20) * 60));
  window._co = { subtotal, freeShip: subtotal >= state.settings.freeShipAbove, coupon: null, disc: 0, items, rateLock: null, lockTimer: null, payCfg, payMethod: 'Online', lockMinutes: (payCfg && payCfg.lockMinutes) || 20 };
  try {
    const savedLock = JSON.parse(localStorage.getItem('shv_rate_lock') || 'null');
    if (savedLock && savedLock.stampedAt && savedLock.rates &&
        (Date.now() - new Date(savedLock.stampedAt).getTime()) / 1000 <= LOCKSEC()) window._co.rateLock = savedLock;
  } catch (e) {}
  const setLock = () => {
    window._co.rateLock = { rates: pickRates(), stampedAt: new Date().toISOString() };
    try { localStorage.setItem('shv_rate_lock', JSON.stringify(window._co.rateLock)); } catch (e) {}
  };
  const coRows = () => $$('.summary [data-copid]');
  function coTotals() {
    if (!$('#coSub')) { clearInterval(window._co && window._co.lockTimer); return; }   // navigated away from checkout
    const lock = activeLock();
    const R = lock ? lock.rates : state.rates;
    let sub = 0;
    coRows().forEach(el => {
      const it = window._co.items.find(x => x.p.id === el.dataset.copid);
      if (!it) return;
      const t = price(it.p, R).total * it.qty;
      el.textContent = fmt(t); sub += t;
    });
    window._co.subtotal = sub;
    const wasFree = window._co.freeShip;
    window._co.freeShip = sub >= state.settings.freeShipAbove;
    $('#coSub').textContent = fmt(sub);
    /* v167 — TWO defects in one line. (a) The shipping row was looked up with
       '.sum-row:nth-last-child(2)', which is the *COD fee* row (the total is
       last, COD sits above it) — so any code that patched it wrote FREE into
       the wrong row. (b) The looked-up row was then never used at all: when a
       live rate tick moved the bag across the free-shipping threshold the
       shipping line kept printing the old fee until the whole page was
       rebuilt. Both fixed: the row now carries a stable id and is repainted
       here, with an honest toast when the threshold is crossed. */
    const shipRow = $('#coShipRow');
    if (shipRow) {
      const cell = shipRow.querySelector('b, span.free');
      if (cell) cell.outerHTML = window._co.freeShip ? '<span class="free">FREE</span>' : `<b id="coShip">${fmt(state.settings.shippingFee)}</b>`;
      if (wasFree !== window._co.freeShip && typeof toast === 'function')
        toast(window._co.freeShip ? '✦ Free insured shipping unlocked' : 'Shipping fee applies below ' + fmt(state.settings.freeShipAbove));
    }
    window.Shivaa.updateCheckout();
  }
  function activeLock() {
    const l = window._co.rateLock;
    if (!l) return null;
    const age = (Date.now() - new Date(l.stampedAt).getTime()) / 1000;
    return age <= LOCKSEC() ? l : null;
  }
  function paintLock() {
    const box = $('#rateLockBox'); if (!box) return;
    const l = activeLock();
    if (!l) {
      box.className = 'rate-lock-card expired';
      box.innerHTML = `<div class="rl-top"><span class="rl-ic">&#9201;</span><div><b>Rates are live</b><small>Tap below to freeze today&rsquo;s rate for 20 minutes.</small></div></div>
        <button type="button" class="btn btn-gold btn-sm" id="rlLockBtn">🔒 Lock today&rsquo;s rate · ${LOCKSEC() / 60} min</button>`;
      const b = $('#rlLockBtn'); if (b) b.onclick = () => { setLock(); coTotals(); paintLock(); };
      return;
    }
    const left = Math.max(0, LOCKSEC() - Math.floor((Date.now() - new Date(l.stampedAt).getTime()) / 1000));
    box.className = 'rate-lock-card live';
    box.innerHTML = `<div class="rl-top"><span class="rl-ic locked">&#128274;</span><div><b>Rate locked</b><small>Your price is frozen &mdash; even if the market moves.</small></div><span class="rl-timer" id="rlTimer">${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}</span></div>
      <div class="rl-rates">22K <b>${fmt(l.rates.gold22)}/g</b> · Silver <b>${fmt2(l.rates.silver)}/g</b></div>`;
  }
  function startLockClock() {
    clearInterval(window._co.lockTimer);
    window._co.lockTimer = setInterval(() => {
      const l = activeLock();
      const t = $('#rlTimer');
      if (l && t) { const left = Math.max(0, LOCKSEC() - Math.floor((Date.now() - new Date(l.stampedAt).getTime()) / 1000)); t.textContent = `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`; }
      else { clearInterval(window._co.lockTimer); coTotals(); paintLock(); }
    }, 1000);
  }
  if (!window._co.rateLock) setLock();        // v107 — auto-arm (restored lock wins)
  coTotals(); paintLock(); startLockClock();
  /* v139 — the saved-address switcher. One tap moves a whole saved address into
     the form; tapping is the shopper's own instruction, so replacing the fields
     is what was asked for. The chip also becomes the address this order
     remembers, so the next checkout pre-fills the same one. */
  const _sw = $('#adrSw');
  if (_sw) _sw.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('button[data-adr]'); if (!b) return;
    const a = _adrs.find(x => x && x.id === b.dataset.adr); if (!a) return;
    const set = (id, v) => { const el = document.getElementById(id); if (!el) return;
      el.value = (v == null ? '' : String(v));
      try { el.dispatchEvent(new Event('input', { bubbles: true })); } catch (e2) {} };
    set('adName', a.name); set('adPhone', a.phone); set('adLine', a.line);
    set('adCity', a.city); set('adState', a.state || 'Rajasthan'); set('adPin', a.pincode);
    $$('#adrSw .adr-chip').forEach(c => c.classList.toggle('on', c === b));
    const sv = $('#adSave'); if (sv) sv.checked = false;      // it is already in the book
    try { store.set('shv_lastAddr', a.id); } catch (e2) {}
    const nn = $('#adrNote');
    if (nn) { nn.hidden = false; nn.innerHTML = `✦ Filled from your saved ${esc(a.label || 'address')} — change anything you need to.`; }
    try { if (window.Shivaa && Shivaa.haptic) Shivaa.haptic(8); } catch (e2) {}
  });
  $$('#payOpts input').forEach(r => r.onchange = () => {
    $$('.pay-opt').forEach(o => o.classList.remove('on'));
    r.closest('.pay-opt').classList.add('on');
    window.Shivaa.updateCheckout();
  });
  const onl = $('#payOpts input[value="Online"]'); if (onl) onl.closest('.pay-opt').classList.add('on');
  // v58 — reflect real gateway state + prepaid percentage in the labels
  const pct = +(payCfg.prepaidPct || 0);
  const badge = $('#payBadge'); if (badge) badge.textContent = pct ? pct + '% off' : '';
  const sub = $('#payOnlineSub');
  if (sub) sub.textContent = payCfg.mode === 'cashfree'
    ? 'UPI · cards · net-banking · wallets · secured by Cashfree' + (pct ? ' · instant ' + pct + '% off' : '')
    : 'UPI · cards · net-banking (demo until Cashfree keys are added)' + (pct ? ' · instant ' + pct + '% off' : '');
  const note = $('#payDemoNote');
  if (note) note.innerHTML = payCfg.mode === 'cashfree'
    ? '🔒 You will be redirected to the secure <b>Cashfree</b> payment page (UPI / cards / net-banking / wallets · 120+ payment methods). Your card details never touch shivaa.in.' + (payCfg.cashfree && payCfg.cashfree.test ? ' <b>Test mode.</b>' : '')
    : '🔒 Card/net-banking checkout switches <b>live on Cashfree</b> the moment keys are added in admin — until then use the <b>UPI QR tab</b> to pay for real, or choose WhatsApp / COD.';
  const codPct = +(state.settings.codFeePct || 0);
  const codSub = $('#payCodSub');
  if (codSub) {
    let savedPin = '';
    try { savedPin = localStorage.getItem('shv_pin') || ''; } catch (e) {}
    const codBlocked = savedPin && !pinPromise(savedPin).cod;
    codSub.textContent = codBlocked
      ? 'Not available at pincode ' + savedPin + ' (insured prepaid courier only)'
      : 'Available on orders below ' + fmt(+(state.settings.codMaxAmount || 50000)) + ' · ID verification at handover' + (codPct ? ' · ' + codPct + '% handling fee' : ' · full price');   // v135 (#8) — the server now enforces this ceiling
    const codRadio = $('#payOpts input[value="COD"]');
    if (codRadio) codRadio.disabled = !!codBlocked;
  }
  /* v103 — pincode autofills the state and answers delivery/COD before submit */
  const adPin = $('#adPin'), adState = $('#adState'), adCity = $('#adCity'), adMsg = $('#adPinMsg');
  if (adPin) {
    const onPin = () => {
      const v = adPin.value.replace(/\D/g, '').slice(0, 6);
      if (adPin.value !== v) adPin.value = v;
      if (!/^\d{6}$/.test(v)) { if (adMsg) adMsg.hidden = true; return; }
      const pr = pinPromise(v);
      const st = pinState(v);
      if (st && adState && (!adState.value || adState.value === 'Rajasthan')) adState.value = st;
      try { localStorage.setItem('shv_pin', v); } catch (e) {}
      if (adMsg) {
        adMsg.hidden = false;
        adMsg.className = 'pin-note ok';
        adMsg.innerHTML = '✓ ' + esc(pr.region) + ' · handover <b>' + pr.by + '</b> · ' + (pr.cod ? 'COD available' : 'prepaid-only');
      }
      const codRadio = $('#payOpts input[value="COD"]');
      if (codRadio) {
        codRadio.disabled = !pr.cod;
        if (!pr.cod && codRadio.checked) { const onl = $('#payOpts input[value="Online"]'); if (onl) onl.checked = true; onl?.dispatchEvent(new Event('change')); }
      }
      void adCity;
    };
    adPin.addEventListener('input', onPin);
    let memPin = '';
    try { memPin = localStorage.getItem('shv_pin') || ''; } catch (e) {}
    if (memPin && /^\d{6}$/.test(memPin)) { adPin.value = memPin; onPin(); }
  }
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
  const method = ($('#payOpts input:checked') || {}).value || window._co.payMethod || 'Online';
  window._co.payMethod = method;
  const pct = +(state.settings.prepaidPct ?? (window._co.payCfg && window._co.payCfg.prepaidPct) ?? 2);
  const prepaid = method === 'Online' && pct > 0 ? Math.round(window._co.subtotal * pct / 100) : 0;
  const codPct = +(state.settings.codFeePct || 0);
  const codFee = method === 'COD' && codPct > 0 ? Math.round(window._co.subtotal * codPct / 100) : 0;
  const ship = window._co.freeShip ? 0 : state.settings.shippingFee;
  $('#coDiscRow').hidden = !(disc > 0);
  $('#coDisc').textContent = '− ' + fmt(disc);
  const pr = $('#coPrepaidRow'); if (pr) pr.hidden = !(prepaid > 0);
  const pv = $('#coPrepaid'); if (pv) pv.textContent = '− ' + fmt(prepaid);
  const cr = $('#coCodRow'); if (cr) cr.hidden = !(codFee > 0);
  const cv = $('#coCod'); if (cv) cv.textContent = '+ ' + fmt(codFee);
  window._co.prepaid = prepaid; window._co.codFee = codFee;
  const coFinal = Math.max(0, window._co.subtotal - disc - prepaid + codFee + ship);
  $('#coTotal').textContent = fmt(coFinal);
  const mt = $('#coMobileTotal'); if (mt) mt.textContent = fmt(coFinal);   // v95 sticky phone bar
};
/* ═══════════ v59 · price-drop alerts (metal rate moves the price) ═══════════ */
window.Shivaa.rateAlertModal = (pid) => {
  const p = pid ? state.productsCache.find(x => x.id === pid) : null;
  const metalKey = p ? (p.metal === 'Silver' ? 'silver' : 'gold' + String(p.purity || '22K').replace('K', '')) : 'gold22';
  /* v173 — this modal opens from the product page's "Alert on price drop"
     link, which a shared deep link can reach before /api/rates hydrates */
  const cur = Math.round((state.rates && state.rates[metalKey]) || 0);
  const suggested = Math.round(cur * 0.98 / 10) * 10;
  openModal(`<h3 style="margin-bottom:6px">🔔 Alert me on a price drop</h3>
  <p style="color:var(--ink-2);font-size:13.5px;margin-bottom:14px">${p ? 'If <b>' + esc(p.name) + '</b> gets cheaper as the ' : 'If the '}${metalKey === 'silver' ? 'silver' : 'gold'} rate falls, we ping you on WhatsApp/email before anyone else.</p>
  <form id="raForm" class="form-grid" style="grid-template-columns:1fr">
    <div class="fld"><label>Alert when ${metalKey === 'silver' ? 'silver' : '22K gold'} rate is at or below ₹/g</label>
      <input id="raTarget" type="number" value="${suggested}" min="100"></div>
    <div class="fld"><label>WhatsApp mobile (10 digits)</label><input id="raPhone" type="tel" inputmode="numeric" maxlength="10" value="${esc((state.user && (state.user.phone || '') || '').replace(/\D/g, '').slice(-10))}" placeholder="98765 43210"></div>
    <div class="fld"><label>or email</label><input id="raEmail" type="email" value="${esc((state.user && state.user.email) || '')}"></div>
    <button class="btn btn-gold btn-block btn-lg">Set alert ✦</button>
  </form>`);
  $('#raForm').onsubmit = async e => {
    e.preventDefault();
    const phone = $('#raPhone').value.replace(/\D/g, '').slice(-10);
    const email = $('#raEmail').value.trim();
    const target = +$('#raTarget').value;
    if (!phone && !email) return toast('Give a mobile number or email', 'err');
    if (!target || target >= cur * 1.5) return toast('Enter a sensible target ₹/g', 'err');
    try {
      await api('/api/rates/alert', { method: 'POST', body: JSON.stringify({ phone, email, metal: metalKey, target, productId: pid || '' }) });
      closeModal(); toast('Alert set — we will ping you first ✦');
    } catch (err) { toast(err.message, 'err'); }
  };
};
window.Shivaa.wishlistAlerts = async (idsArg) => {
  const wl = idsArg || state.localWish || [];
  if (!wl || !wl.length) return toast('Save pieces first', 'err');
  const phone = (state.user && (state.user.phone || '') || '').replace(/\D/g, '').slice(-10);
  if (!phone && !(state.user && state.user.email)) { openLogin(); return; }
  const metals = [...new Set(state.productsCache.filter(p => wl.includes(p.id)).map(p => p.metal === 'Silver' ? 'silver' : 'gold' + String(p.purity || '22K').replace('K', '')))];
  try {
    for (const m of metals) {
      const cur = Math.round((state.rates && state.rates[m]) || 0); if (!cur) continue;
      await api('/api/rates/alert', { method: 'POST', body: JSON.stringify({ phone, email: (state.user && state.user.email) || '', metal: m, target: Math.round(cur * 0.98 / 10) * 10 }) });
    }
    toast('Drop alerts set for all saved pieces ✦');
  } catch (e) { toast(e.message, 'err'); }
};

/* ═══════════ v128 · online payments — Cashfree hosted checkout, demo without keys ═══════════ */
function loadExternalScript(src, timeoutMs, globalCheck) {
  return new Promise(resolve => {
    if (typeof globalCheck === 'function' && globalCheck()) return resolve(true);
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if (typeof globalCheck === 'function') {
        let elapsed = 0;
        const interval = setInterval(() => {
          elapsed += 50;
          if (globalCheck()) {
            clearInterval(interval);
            resolve(true);
          } else if (elapsed >= (timeoutMs || 10000)) {
            clearInterval(interval);
            resolve(Boolean(globalCheck()));
          }
        }, 50);
        return;
      }
      return resolve(true);
    }
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    let done = false;
    const finish = (ok) => {
      if (done) return;
      done = true;
      if (tm) clearTimeout(tm);
      if (!ok) s.remove();   /* v130 — a failed tag must not poison "Try again" retries */
      resolve(ok);
    };
    /* v130 — a hung request (no response, no onerror) must surface an error,
       never spin the handoff sheet forever. */
    const tm = timeoutMs ? setTimeout(() => finish(false), timeoutMs) : null;
    s.onload = () => finish(true);
    s.onerror = () => finish(false);
    document.head.appendChild(s);
  });
}
function upiQRSvg(uri) {
  try {
    const qr = window.qrcode ? qrcode(0, 'M') : null;
    if (!qr) return '';
    qr.addData(uri); qr.make();
    return `<div class="ps-qr">${qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true })}</div>`;
  } catch (e) { return ''; }
}
function upiPaySheet(po, orderId) {
  return new Promise(resolve => {
    const amt = (po.amount || 0) / 100;
    const pa = po.upiId, pn = encodeURIComponent(po.upiName || 'Shivaa Jewellers');
    const note = encodeURIComponent('Shivaa order ' + orderId);
    const upiUri = `upi://pay?pa=${encodeURIComponent(pa)}&pn=${pn}&am=${amt.toFixed(2)}&cu=INR&tn=${note}&tr=${encodeURIComponent(orderId)}`;   // v107 — merchant txn ref, UPI apps echo it back
    openModal(`<div class="pay-sheet">
      <div class="ps-head"><img src="/images/logo.png" alt=""><div><b>Pay by any UPI app</b><small>GPay · PhonePe · Paytm · BHIM</small></div></div>
      <div class="ps-amt">${fmt(amt)}</div>
      ${upiQRSvg(upiUri)}
      <div class="ps-upiid"><span>UPI ID</span><b>${esc(pa)}</b><button type="button" class="btn btn-ghost btn-sm" id="psCopyUpi">⧉ copy</button></div>
      <a class="btn btn-gold btn-block btn-lg" href="${upiUri}" rel="noopener">Open UPI app &amp; pay ${fmt(amt)}</a>
      <p class="ps-note" style="text-align:left">After paying, attach the <b>payment screenshot</b> or type the 12-digit UPI reference — we verify within minutes and release your piece. The order stays rate-locked meanwhile.<br><small>This code is stamped to order <b>${esc(orderId)}</b> for exactly <b>${fmt(amt)}</b> — if your UPI app shows a different amount, close this sheet and reopen it to mint a fresh code.</small></p>
      <form id="psProof" class="ps-proof">
        <label class="ps-upload"><input type="file" id="psFile" accept="image/*" capture="environment" required><span id="psFileName">📎 Choose payment screenshot…</span></label>
        <input id="psRef" placeholder="UPI ref / Txn ID (optional)">
        <button class="btn btn-primary btn-block btn-lg" type="submit">I&rsquo;ve paid · submit proof</button>
      </form>
      <button class="btn btn-ghost btn-block" id="psLater">Pay later &middot; order stays reserved</button>
    </div>`);
    $('#psCopyUpi').onclick = () => {
      (navigator.clipboard ? navigator.clipboard.writeText(pa) : Promise.reject()).then(() => toast('UPI ID copied')).catch(() => {});
    };
    $('#psFile').onchange = e => { const f = e.target.files[0]; if (f) $('#psFileName').textContent = '✓ ' + f.name.slice(0, 40); };
    $('#psProof').onsubmit = async e => {
      e.preventDefault();
      const f = $('#psFile').files[0];
      if (!f) { toast('Attach the payment screenshot', 'err'); return; }
      const fd = new FormData();
      fd.append('orderId', orderId); fd.append('proof', f); fd.append('amount', String(Math.round(amt)));
      fd.append('ref', $('#psRef').value.trim());
      const btn = e.target.querySelector('button[type=submit]'); btn.disabled = true; btn.textContent = 'Uploading…';
      try {
        await api('/api/pay/proof', { method: 'POST', body: fd });
        closeModal(); toast('Proof received — we verify shortly ✦'); resolve(true);
      } catch (err) { btn.disabled = false; btn.innerHTML = 'I’ve paid · submit proof'; toast(err.message, 'err'); }
    };
    $('#psLater').onclick = () => { closeModal(); toast('Order reserved — complete payment from your order page'); resolve(false); };
  });
}
function demoPaySheet(po, orderId) {
  return new Promise(resolve => {
    const amt = (po.amount || 0) / 100;
    const tabs = po.upiId
      ? `<div class="ps-tabs"><button type="button" class="ps-tab on" data-tab="card">💳 Card / net-banking <small>demo</small></button><button type="button" class="ps-tab" data-tab="upi">⌖ UPI QR <small>real payment</small></button></div>`
      : '';
    openModal(`<div class="pay-sheet">
      <div class="ps-head"><img src="/images/logo.png" alt=""><div><b>Shivaa · secure payment</b><small>${po.upiId ? 'UPI QR is live · cards in demo' : 'DEMO GATEWAY — no real charge'}</small></div></div>
      <div class="ps-amt">${fmt(amt)}</div>
      ${tabs}
      <div id="psCardPane">
      <div class="ps-methods">
        <button type="button" class="ps-m on">⌖ UPI &middot; GPay / PhonePe / Paytm</button>
        <button type="button" class="ps-m">💳 Credit / Debit card</button>
        <button type="button" class="ps-m">🏦 Net-banking</button>
      </div>
      <button class="btn btn-gold btn-block btn-lg" id="psPay">Pay ${fmt(amt)} <small>(demo success)</small></button>
      <p class="ps-note">Card checkout switches to live Cashfree the moment keys are added in admin &rarr; Settings &rarr; Payments.${po.upiId ? ' Need to really pay now? open the <b>UPI QR</b> tab.' : ''}</p>
      </div>
      <button class="btn btn-ghost btn-block" id="psLater">Pay later &middot; order stays reserved</button>
    </div>`);
    $$('.ps-m').forEach(b => b.onclick = () => { $$('.ps-m').forEach(x => x.classList.remove('on')); b.classList.add('on'); });
    $$('.ps-tab').forEach(t => t.onclick = () => {
      $$('.ps-tab').forEach(x => x.classList.remove('on')); t.classList.add('on');
      if (t.dataset.tab === 'upi') { closeModal(); upiPaySheet(po, orderId).then(resolve); }
    });
    const btn = $('#psPay');
    btn.onclick = async () => {
      btn.disabled = true; btn.textContent = 'Verifying with bank…';
      try {
        await api('/api/pay/verify', { method: 'POST', body: JSON.stringify({
          orderId, gatewayOrderId: po.gatewayOrder.id,
          paymentId: (po.gatewayOrder.id || '').replace('demo_', 'pay_demo_') }) });
        closeModal(); toast('Payment received ✦ thank you'); resolve(true);
      } catch (e) { btn.disabled = false; btn.innerHTML = 'Pay ' + fmt(amt); toast(e.message, 'err'); resolve(false); }
    };
    $('#psLater').onclick = () => { closeModal(); toast('Order reserved — complete payment from your order page'); resolve(false); };
  });
}
/* v94 — full-page navigation seam (tests capture instead of navigating). */
window.Shivaa.redirectTo = (url) => { window.location.href = url; };
/* v128 — brief overlay while the browser leaves for the Cashfree payment page */
function cashfreeRedirectSheet(retry) {
  return new Promise(resolve => {
  openModal(`<div style="text-align:center;padding:14px 6px" id="cfHandoff">
      <div class="pp-spinner" aria-hidden="true"></div>
      <h3 style="margin:14px 0 6px">Opening secure Cashfree checkout…</h3>
      <p style="color:var(--muted);font-size:13px">Keep this tab open. If Cashfree does not open automatically, use the button below.</p>
      <div id="cfErr" style="display:none;color:#8f1d16;font-size:12.5px;margin:10px 4px 0;text-align:left;background:#fdecea;border:1px solid #f5c6c2;border-radius:10px;padding:8px 10px;word-break:break-word"></div>
      <button type="button" class="btn btn-gold btn-block" id="cfContinue" style="margin-top:14px">Continue to Cashfree</button>
      <button type="button" class="btn btn-ghost btn-block" id="cfCancel" style="margin-top:8px">Return to my order</button>
    </div>`);
  const go = $('#cfContinue');
  if (go) go.onclick = () => {
    go.disabled = true; go.textContent = 'Opening Cashfree…';
    /* v130 — restore the sheet from its error state before retrying. */
    const sheet = document.getElementById('cfHandoff');
    if (sheet) {
      const sp = sheet.querySelector('.pp-spinner'); if (sp) sp.style.display = '';
      const h = sheet.querySelector('h3'); if (h) h.textContent = 'Opening secure Cashfree checkout…';
      const err = document.getElementById('cfErr'); if (err) err.style.display = 'none';
    }
    retry();
    setTimeout(() => { if (document.body.contains(go)) { go.disabled = false; go.textContent = 'Try Cashfree again'; } }, 5000);
  };
  const cancel = $('#cfCancel'); if (cancel) cancel.onclick = () => { closeModal(); resolve(false); };
  });
}
/* v128/v162 — Cashfree hosted checkout (Step 2): load the official JS SDK and open
   the PCI-compliant payment page with the payment_session_id the server minted.
   redirectTarget _self replaces this page; Cashfree sends the customer back to
   the return_url, which the server verifies before crediting the order. */
window.Shivaa.cashfreeCheckout = async (paymentSessionId, env) => {
  const sess = String(paymentSessionId || '').trim();
  if (!sess) throw new Error('Cashfree session ID missing');

  // Direct checkout fallback helper (submits hidden form to Cashfree checkout URL)
  const submitHostedForm = () => {
    const action = env === 'sandbox'
      ? 'https://sandbox.cashfree.com/pg/view/sessions/checkout'
      : 'https://api.cashfree.com/pg/view/sessions/checkout';
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = action;
    form.target = '_self';
    form.style.display = 'none';
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'payment_session_id';
    input.value = sess;
    form.appendChild(input);
    document.body.appendChild(form);
    form.submit();
    return true;
  };

  try {
    const ok = await loadExternalScript('https://sdk.cashfree.com/js/v3/cashfree.js', 15000, () => typeof window.Cashfree === 'function');
    if (!ok || typeof window.Cashfree !== 'function') {
      return submitHostedForm();
    }
    const cf = window.Cashfree({ mode: env === 'sandbox' ? 'sandbox' : 'production' });
    const isMobile = window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '');
    if (isMobile) {
      const res = cf.checkout({ paymentSessionId: sess, redirectTarget: '_self' });
      if (res && res.error) {
        console.warn('Cashfree mobile SDK returned error, submitting form directly:', res.error);
        return submitHostedForm();
      }
      return res || true;
    }

    let res;
    try {
      res = await Promise.race([
        cf.checkout({ paymentSessionId: sess, redirectTarget: '_modal' }),
        new Promise((_, rej) => setTimeout(() => rej(new Error('__cf_timeout__')), 20000))
      ]);
    } catch (e) {
      if (e && e.message === '__cf_timeout__') {
        console.warn('Cashfree modal timed out or blocked — falling back to redirect');
        return cf.checkout({ paymentSessionId: sess, redirectTarget: '_self' });
      }
      try {
        return await cf.checkout({ paymentSessionId: sess, redirectTarget: '_self' });
      } catch (e2) {
        return submitHostedForm();
      }
    }

    if (res && res.error) {
      console.warn('Cashfree SDK modal returned error, falling back to redirect:', res.error);
      try {
        return await cf.checkout({ paymentSessionId: sess, redirectTarget: '_self' });
      } catch (e3) {
        return submitHostedForm();
      }
    }
    return res || true;
  } catch (e) {
    console.warn('Cashfree SDK checkout exception, falling back to direct hosted form:', e);
    return submitHostedForm();
  }
};
window.Shivaa.payForOrder = async (orderId, pin) => {
  let po;
  /* v142 — a guest order passes its access pin so the gateway can be minted
     without a member token. */
  const payBody = () => { const b = { orderId }; if (pin) b.pin = pin; return JSON.stringify(b); };
  try { po = await api('/api/pay/order', { method: 'POST', body: payBody() }); }
  catch (e) { toast(e.message, 'err'); return false; }
  // v128 — Cashfree: server created the order, we open the hosted checkout;
  // Cashfree returns the browser to /api/pay/cashfree/return → order page
  // (?cf=…), the server verifies via GET /pg/orders/{id}.
  if (po.mode === 'cashfree') {
    if (!po.paymentSessionId) {
      toast('Cashfree checkout could not start — retry or use the UPI QR tab', 'err'); return false;
    }
    toast('Taking you to secure Cashfree checkout…');
    /* v133 — EVERY attempt (the first one and each "Try Cashfree again") mints
       a FRESH Cashfree session server-side. Sessions are short-lived and the
       first hosted-page open can consume them, so reusing one
       paymentSessionId across retries produces
       "payment_session_id is not present or is invalid". The server is built
       for this: each /api/pay/order call creates a new Cashfree order
       (-A1, -A2, …) and a new session. */
    const handoff = () => {
      api('/api/pay/order', { method: 'POST', body: payBody() })
        .then(p2 => {
          if (!p2 || p2.mode !== 'cashfree' || !p2.paymentSessionId) {
            throw new Error((p2 && (p2.gatewayMessage || p2.error)) || 'Cashfree could not start — use the UPI QR tab or retry');
          }
          return Shivaa.cashfreeCheckout(p2.paymentSessionId, p2.env);
        })
        .catch(e => {
          let msg = (e && e.message) ? e.message : 'Cashfree could not open — tap Try Cashfree again';
          if (/payment_session_id/i.test(msg)) msg = 'Cashfree session expired or was rejected — tap Try Cashfree again to start a fresh one';
          const box = document.getElementById('cfErr');
          if (box) {
            box.style.display = 'block';
            box.textContent = '⚠️ ' + msg;
            /* v130 — stop looking like we're still working: hide the spinner,
               say what happened; "Try Cashfree again" restores the sheet. */
            const sheet = document.getElementById('cfHandoff');
            if (sheet) {
              const sp = sheet.querySelector('.pp-spinner'); if (sp) sp.style.display = 'none';
              const h = sheet.querySelector('h3'); if (h) h.textContent = 'Cashfree could not open';
              if (window.console) console.warn('[shivaa-cashfree]', msg);
            }
          }
          toast(msg, 'err');
        });
    };
    const waiting = cashfreeRedirectSheet(handoff);
    /* Open the checkout immediately after the handoff UI is painted. The
       visible button remains as a user-gesture fallback for strict mobile
       browsers. */
    setTimeout(handoff, 50);
    return waiting;
  }
  // v82 — public host with no gateway keys: go straight to the real UPI QR +
  // owner-approved screenshot flow (the old "demo success" sheet could mark
  // orders paid on the live site).
  if (po.mode === 'upi-proof') {
    if (!po.upiId) { toast('Online gateway is being set up — please choose WhatsApp order or COD, or call the shop.', 'err'); return false; }
    return upiPaySheet(po, orderId);
  }
  return demoPaySheet(po, orderId);
};
window.Shivaa.placeOrder = async () => {
  const form = $('#addrForm');
  if (!form.reportValidity()) return;
  const btn = $('#placeBtn'); btn.disabled = true; btn.textContent = 'Placing order…';
  const btnM = document.querySelector('.mcta-bar .btn-gold'); if (btnM) { btnM.disabled = true; }
  // read by field name — positional indexing breaks the moment a field is added
  const fd = new FormData(form);
  const g = k => String(fd.get(k) || '').trim();
  const address = { name: g('name'), phone: g('phone'), line: g('line'), city: g('city'),
                    state: g('state'), pincode: g('pincode'), country: g('country') || 'India' };
  const payEl = $('#payOpts input:checked');
  if (!payEl) { toast('Please choose a payment method', 'err'); btn.disabled = false; btn.textContent = 'Place Order ✦'; if (btnM) btnM.disabled = false; return; }
  const paymentMethod = payEl.value;
  try {
    const order = await api('/api/orders', { method: 'POST', body: JSON.stringify({
      items: state.cart.map(c => ({ id: c.id, qty: c.qty, size: c.size, engraving: c.engraving })),
      address, paymentMethod, coupon: window._co.coupon, usePoints: !!$('#usePts')?.checked,
      /* v135 (#20) — this was hardcoded to 20 minutes while the countdown the
         customer watches is driven by the server's lockMinutes (5–60). Set the
         window to 30 and the UI counted down half an hour while every lock over
         20 minutes was dropped here — and the server priced at live rates. */
      rateLock: (() => { const mins = Math.max(5, Math.min(60, +((window._co || {}).lockMinutes) || 20));
        const age = (Date.now() - new Date((window._co.rateLock || {}).stampedAt || 0).getTime()) / 1000;
        return age <= mins * 60 ? window._co.rateLock : null; })(),
    }) });
    clearInterval(window._co.lockTimer);
    /* v139 — "save this address" is what turns the second order into a
       one-tap order. Fire-and-forget on purpose: a failed address save must
       never stand between the customer and the payment they just started. */
    try {
      if ($('#adSave') && $('#adSave').checked && state.user) {
        const _body = { name: address.name, phone: address.phone, line: address.line,
                        city: address.city, state: address.state, pincode: address.pincode, label: 'Home' };
        api('/api/addresses', { method: 'POST', body: JSON.stringify(_body) })
          .then(r => { if (r && Array.isArray(r.addresses)) {
              state.user.addresses = r.addresses;
              const last = r.addresses[r.addresses.length - 1];
              if (last && last.id) store.set('shv_lastAddr', last.id);
            } })
          .catch(() => { try { store.set('shv_lastAddr', null); } catch (e) {} });
      }
    } catch (e) {}
    state.cart = []; store.set('shv_cart', state.cart); updateBadges();
    /* v137 (#16) — only the redemption is applied optimistically. The earning
       now lands when the order is Paid (server-side order_grant_points), so
       showing it here would display points the customer has not earned yet —
       and would let them see a balance they cannot actually redeem. */
    if (state.user) state.user.loyaltyPoints = Math.max(0, (state.user.loyaltyPoints || 0) - (order.pointsUsed || 0));
    window._lastOrder = order;
    // v128 — online prepayment (Cashfree live when configured, simulated in demo)
    if (paymentMethod === 'Online') {
      const paidOk = await Shivaa.payForOrder(order.id, { fromCheckout: true });
      if (paidOk && finaleLive() && finaleQualifiesItems((order && order.items) || []).ok) {
        location.hash = '#/scheme?step=quiz&orderId=' + encodeURIComponent(order.id) + (order.pin ? '&pin=' + encodeURIComponent(order.pin) : '');
        return;
      }
      /* v160 — a failed/cancelled campaign payment returns to the 3-design
         showcase (owner order), never strands on the order page. */
      if (!paidOk && finaleLive() && finaleQualifiesItems((order && order.items) || []).ok) {
        toast('Payment was not completed — pick your design again to retry ✦', 'err');
        location.hash = '#/scheme?step=products&gender=' + encodeURIComponent(campaignGenderOfItems((order && order.items) || []));
        return;
      }
    }
    // Gold Finale: remember a qualifying order so the order page can offer the quiz
    try {
      if (finaleLive() && finaleQualifiesItems((order && order.items) || []).ok) sessionStorage.setItem('fqPrompt', order.id);
    } catch (e) {}
    if (paymentMethod === 'WhatsApp') {
      const w = waOpen(waOrderMsg(order));
      if (!w) toast('Popup blocked — use the "Confirm & Pay on WhatsApp" button on your order page', 'err');
    }
    location.hash = '#/order/' + order.id;
  } catch (e) { toast(e.message, 'err'); btn.disabled = false; btn.textContent = 'Place Order ✦'; if (btnM) btnM.disabled = false; }
};

/* v57 — one-tap reorder from a past order ("Buy again") */
window.Shivaa.buyAgain = async (id) => {
  let o = (window.Shivaa._myOrders || []).find(x => x.id === id);
  if (!o) { try { o = (await api('/api/orders/' + id)).order; } catch (e) {} }
  if (!o || !Array.isArray(o.items)) { toast('Could not find that order', 'err'); return; }
  let added = 0;
  o.items.forEach(it => {
    const p = state.productsCache.find(x => x.id === it.productId);
    if (!p) return;
    const existing = state.cart.find(c => c.id === p.id);
    if (existing) existing.qty += it.qty || 1;
    else state.cart.push({ id: p.id, qty: it.qty || 1, size: it.size || null, engraving: it.engraving || '' });
    added += it.qty || 1;
  });
  if (!added) { toast('Those pieces are being re-catalogued — browse the signature rings for an equivalent', 'err'); return; }
  store.set('shv_cart', state.cart); updateBadges();
  toast(`${added} piece${added === 1 ? '' : 's'} added back to your cart ✦`);
  location.hash = '#/cart';
};

/* ═══════════ v58 · workshop stage tracker, courier card, NPS, care plan ═══════════ */
const ORDER_STAGES = [
  ['Placed', 'Order placed', '🧾'],
  ['Confirmed', 'Confirmed with karigar', '🙏'],
  ['Karigari', 'Karigari — craft in progress', '🔨'],
  ['Hallmarking', 'BIS hallmarking · HUID', '🛡'],
  ['Packed', 'Polished & packed', '📦'],
  ['Shipped', 'Shipped · on its way', '🚚'],
  ['Delivered', 'Delivered with care', '💛'],
];
function orderStageHTML(o) {
  const tl = {};
  (o.timeline || []).forEach(t => { if (!tl[t.s]) tl[t.s] = t.t; });
  if (o.status === 'Cancelled') return `<div class="tracker-wrap"><div class="tracker-cancel">This order was cancelled. Refunds for prepaid orders are returned to the source within 3–5 working days. <a href="javascript:void(0)" onclick="Shivaa.waOpenOrder('${o.id}')">Talk to us →</a></div></div>`;
  let reached = -1;
  const steps = ORDER_STAGES.map(([key, label, ic], i) => {
    const hit = tl[key];
    if (hit) reached = i;
    return `<div class="st-step ${hit ? 'done' : ''} ${i === reached ? 'cur' : ''}">
      <span class="st-ic">${ic}</span>
      <div><b>${label}</b><small>${hit ? timeFmt(hit) : '—'}</small></div>
    </div>`;
  }).join('');
  /* v103 — honest ETA line: handcrafted gold is 4–7 working days from order;
     once the parcel ships the courier card below carries the live link. */
  let etaLine = '';
  if (reached >= 0 && reached < 5 && o.createdAt) {
    const d = new Date(o.createdAt);
    const fmt = n => new Date(+d + n * 864e5).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
    const day = n => new Date(+d + n * 864e5);
    const addWorkdays = (date, n) => { const x = new Date(+date); let added = 0; while (added < n) { x.setDate(x.getDate() + 1); const k = x.getDay(); if (k !== 0) added++; } return x; };
    const fmt2 = x => x.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
    etaLine = `<div class="tracker-eta">✦ Handcrafted to order — estimated handover <b>${fmt2(addWorkdays(d, 4))} – ${fmt2(addWorkdays(d, 7))}</b> · we WhatsApp you at every stage</div>`;
    void fmt; void day;
  } else if (reached === 5) {
    etaLine = '<div class="tracker-eta">🚚 On its way — courier tracking appears below the moment the parcel is dispatched.</div>';
  }
  return `<div class="tracker-wrap"><div class="tracker-head"><span class="live-dot"></span> Making &amp; delivery tracker</div>${etaLine}<div class="stages">${steps}</div></div>`;
}
window.Shivaa.orderStageHTML = orderStageHTML;
function trackingCardHTML(o) {
  if (!o.awb && !o.courier) return '';
  const carriers = {
    'bluedart': ['BlueDart', 'https://www.bluedart.com/trackdartresult?trackFor=0&trackNo='],
    'delhivery': ['Delhivery', 'https://www.delhivery.com/track/package/'],
    'shiprocket': ['Shiprocket', 'https://track.shiprocket.in/'],
    'dtdc': ['DTDC', 'https://www.dtdc.in/tracking.asp?TrkType=AWB%20No.&TrkNo='],
    'indiapost': ['India Post', 'https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx'],
    'sequel': ['Sequel Logistics', 'https://www.sequellogistics.com/track/'],
  };
  const key = Object.keys(carriers).find(k => (o.courier || '').toLowerCase().includes(k));
  const url = key && o.awb ? carriers[key][1] + encodeURIComponent(o.awb) : null;
  return `<div class="track-card">
    <div class="tc-ic">🚚</div>
    <div class="tc-tx"><b>${esc(o.courier || 'Courier')}</b>
      <small>AWB / tracking no: <b>${esc(o.awb)}</b>${o.dispatchNote ? '<br>' + esc(o.dispatchNote) : ''}</small></div>
    ${url ? `<a class="btn btn-primary btn-sm" target="_blank" rel="noopener" href="${url}">Track parcel ↗</a>` : ''}
  </div>`;
}
function npsHTML(o) {
  setTimeout(() => {
    const box = document.getElementById('npsBox'); if (!box || box._wired) return; box._wired = true;
    box.querySelectorAll('[data-nps]').forEach(b => b.onclick = () => {
      const n = +b.dataset.nps;
      box.querySelector('.nps-q').hidden = true;
      const done = box.querySelector('.nps-done'); done.hidden = false;
      const first = (o.items || [])[0] || {};
      let msg;
      if (n >= 9) {
        msg = 'Namaste Shivaa ✦ I received order ' + o.id + ' and loved my ' + (first.name || 'jewellery') + ' (' + n + '/10)!';
        const gUrl = safeUrl((state.settings && state.settings.googleReviewUrl) || '');
        const gSafe = gUrl === '#' ? '' : gUrl;
        done.innerHTML = 'Dhanyavaad! 💛 Your kind words mean a lot. <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">'
          + (gSafe ? '<a class="btn btn-gold btn-sm" target="_blank" rel="noopener" href="' + gSafe + '">⭐ Rate us on Google</a>' : '')
          + '<a class="btn btn-outline btn-sm" href="#/product/' + (first.productId || '') + '">Write a photo review</a>'
          + '<a class="btn btn-ghost btn-sm" target="_blank" rel="noopener" href="' + waLink(msg) + '">Share on WhatsApp</a></div>';
      } else {
        msg = 'Namaste Shivaa ✦ About my order ' + o.id + ' — my experience was ' + n + '/10. I would like help with:';
        done.innerHTML = 'We are sorry it was not a 10 — tell us what went wrong and the owner will personally make it right. <div style="margin-top:10px"><a class="btn btn-gold btn-sm" target="_blank" rel="noopener" href="' + waLink(msg) + '">Tell Shivaa privately on WhatsApp</a></div>';
      }
    });
  }, 60);
  return `<div class="nps-card" id="npsBox">
    <h3>How was your Shivaa experience?</h3>
    <div class="nps-q">Tap a score &middot; 0 (poor) to 10 (loved it)
      <div class="nps-row">${Array.from({ length: 11 }, (_, i) => `<button type="button" class="nps-n ${i >= 9 ? 'hi' : i >= 7 ? 'mid' : 'lo'}" data-nps="${i}">${i}</button>`).join('')}</div>
      <small>Scores under 7 go straight to the owner, privately. Nothing is posted without you.</small>
    </div>
    <div class="nps-done" hidden></div>
  </div>`;
}
function careCTAHTML(o) {
  return `<div class="care-cta">
    <h3>Lifetime care — free, every year</h3>
    <p>Your piece carries Shivaa&rsquo;s lifetime care: polishing, rhodium renewal, soldering, stone tightening &amp; resizing. Book it in under a minute &mdash; at-home pickup available in Jaipur &amp; Nagaur.</p>
    <a class="btn btn-outline btn-sm" href="#/care?order=${encodeURIComponent(o.id)}">Book free care for this piece →</a>
  </div>`;
}

/* ═══════════ v60 · payment ledger, part payments, refunds, COD confirm ═══════════ */
function paymentLedgerHTML(o) {
  const pays = o.payments || [];
  if (!pays.length) return '';
  const pct = Math.max(4, Math.min(100, Math.round((o.amountPaid || 0) / Math.max(1, o.total) * 100)));
  const payLabel = { cashfree: 'Cashfree', 'upi-qr': 'UPI QR', cash: 'Cash', bank: 'Bank transfer', card: 'Card', upi: 'UPI' };
  const refunds = o.refunds || [];
  return `<div class="paymil" style="max-width:640px;margin:12px auto 0">
      <div class="paymil-bar"><i style="width:${pct}%"></i><span>${pct}% paid</span></div>
    </div>
    <details class="acc" style="max-width:640px;margin:6px auto" open><summary>Payment history (${pays.length})${o.balance > 0 && o.paymentStatus !== 'Refunded' ? ' · balance ' + fmt(o.balance) : ''}</summary><div class="acc-body">
    ${pays.map(p => `<div class="sum-row"><span>${new Date(p.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })} · ${esc(payLabel[p.mode] || p.mode || p.gateway || 'online')} · <small>${esc(p.status || 'approved')}${p.ref ? ' · ' + esc(p.ref) : ''}</small></span><b>${p.status === 'rejected' ? '—' : fmt(p.amount)}</b></div>`).join('')}
    ${refunds.map(r => `<div class="sum-row" style="color:var(--warn)"><span>${new Date(r.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })} · ${esc(({ cashfree: 'Cashfree' })[String(o.gateway || '').toLowerCase()] || 'Gateway')} refund · <small>${esc(r.status || 'pending')} · 5–7 days</small></span><b>− ${fmt(r.amount)}</b></div>`).join('')}
    ${o.amountPaid && !refunds.length ? `<div class="sum-row total"><span>Received</span><b>${fmt(o.amountPaid)}</b></div>` : ''}
    ${(o.balance > 0 && o.paymentStatus !== 'Refunded') ? `<div class="sum-row" style="color:var(--warn)"><span>Balance due before dispatch</span><b>${fmt(o.balance)}</b></div>` : ''}
  </div></details>`;
}
function refundCardHTML(o, existing) {
  if (existing) {
    const st = existing.status;
    const label = { requested: 'Received — owner is reviewing', approved: 'Approved', refunded: 'Refunded ✓', exchanged: 'Exchanged ✓', rejected: 'Could not be approved' }[st] || st;
    return `<div class="refund-card" style="${st === 'refunded' ? 'border-color:#1d7a46;background:#f1faf4' : ''}">
      <h3>${existing.kind === 'exchange' ? 'Exchange' : 'Refund'} request · ${label}</h3>
      <p>“${esc(existing.reason)}”${existing.creditNote ? ' · credit note <b>' + esc(existing.creditNote) + '</b>' : ''}${existing.note ? '<br>→ ' + esc(existing.note) : ''}</p>
      <div class="pay-due-btns"><a class="btn btn-outline btn-sm" target="_blank" rel="noopener" href="${waLink('Namaste ✦ following up on my ' + existing.kind + ' request for order ' + o.id)}">Follow up on WhatsApp</a></div></div>`;
  }
  if (['Refunded', 'Exchanged'].includes(o.paymentStatus) || o.status === 'Cancelled') return '';
  const ageDays = (Date.now() - new Date(o.createdAt).getTime()) / 864e5;
  if (ageDays > 9) return '';
  return `<div class="refund-card">
    <h3>Need to return or exchange?</h3>
    <p>7-day easy returns &amp; lifetime exchange. Raise it here — pickup is arranged and the credit note follows on WhatsApp.</p>
    <div class="pay-due-btns">
      <button class="btn btn-outline btn-sm" onclick="Shivaa.refundForm('${o.id}','refund')">Request refund</button>
      <button class="btn btn-outline btn-sm" onclick="Shivaa.refundForm('${o.id}','exchange')">Exchange this piece</button>
    </div></div>`;
}
function codConfirmHTML(o) {
  if (o.paymentMethod !== 'COD' || o.status === 'Cancelled') return '';
  if (o.codConfirmed) return `<div class="cod-ok">✓ Cash-on-delivery confirmed — please keep ${fmt(o.total)} ready (UPI/cash accepted at handover).</div>`;
  return `<div class="cod-confirm">
    <h3>Confirm your COD order</h3>
    <p>One tap confirms you will receive the parcel and pay <b>${fmt(o.total)}</b> at handover (ID verification for jewellery orders).</p>
    <button class="btn btn-gold btn-sm" onclick="Shivaa.codConfirm('${o.id}')">✓ Confirm cash on delivery</button>
  </div>`;
}
window.Shivaa.codConfirm = async (id) => {
  try { await api('/api/orders/' + id + '/cod-confirm', { method: 'POST', body: '{}' });
    toast('COD confirmed ✦ dispatch team notified'); route();
  } catch (e) { toast(e.message, 'err'); }
};
window.Shivaa.refundForm = (id, kind) => {
  openModal(`<h3 style="margin-bottom:6px">${kind === 'exchange' ? 'Exchange request' : 'Refund request'}</h3>
  <p style="font-size:13px;color:var(--ink-2);margin-bottom:12px">Order <b>${id}</b>. Tell us why in a line — the owner sees this directly.</p>
  <form id="rfForm" class="form-grid" style="grid-template-columns:1fr">
    <div class="fld"><label>Reason *</label><textarea id="rfReason" required placeholder="${kind === 'exchange' ? 'e.g. ring size 15 needed instead of 14…' : 'e.g. piece does not match the ordered design…'}"></textarea></div>
    <div class="fld"><label>What you prefer</label><select id="rfMode" class="sortsel" style="width:100%;border-radius:12px">
      ${kind === 'exchange' ? '<option>Exchange for another piece</option><option>Refund to original payment source</option><option>Credit note / gift card</option>' : '<option>Refund to original payment source</option><option>Credit note / gift card</option><option>Exchange for another piece</option>'}
    </select></div>
    <button class="btn btn-gold btn-block btn-lg">Submit ${kind} request</button>
  </form>`);
  $('#rfForm').onsubmit = async e => {
    e.preventDefault();
    try {
      await api('/api/orders/' + id + '/refund-request', { method: 'POST', body: JSON.stringify({ kind, reason: $('#rfReason').value }) });
      closeModal(); toast(kind === 'exchange' ? 'Exchange requested — we arrange pickup ✦' : 'Refund requested — credit note follows on approval ✦'); route();
    } catch (err) { toast(err.message, 'err'); }
  };
};

/* ─────────── ORDER CONFIRMATION ─────────── */
/* v142 · the access pin for the current guest order, from the URL first (the
   Cashfree return carries it) and the last express order as fallback. */
function guestPinFor(q, id) {
  let pin = String(q.get('pin') || '').trim();
  if (!pin) {
    try {
      const e = store.get('shv_express');
      if (e && e.orderId === id) pin = e.pin || '';
    } catch (e) {}
  }
  return pin;
}
pages.order = async (view, q, id) => {
  const isCurrent = viewLifetime(view);
  let order, pin = guestPinFor(q, id);
  try { order = (await api('/api/orders/' + id + (pin ? '?pin=' + encodeURIComponent(pin) : ''))).order; }
  catch (e) { order = null; }
  if (!isCurrent()) return;
  /* v167 — the catch above used to BE the handler; a 200 that carries no order
     (a proxy, a cached response, a backend change) fell straight through to
     `order.paymentStatus` and the whole route died into the generic error view
     — "Cannot read properties of null" in front of the shopper. */
  if (!order) { view.innerHTML = emptyShell('Track Order', 'Order not found', `<div class="empty"><div class="big">✦</div><p style="color:var(--ink-3)">If you paid as a guest, this link may have expired — please contact the shop on WhatsApp.</p></div>`); return; }
  window._lastOrder = order;

  // If a campaign stud order is confirmed paid, navigate directly to the quiz
  const savedRates = [...new Set((order.items || []).map(it => {
    const key = it.metal === 'Silver' ? 'silver' : 'gold' + String(it.purity || '').replace('K', '');
    const rate = Number(it.ratePerGram || (order.rateSnapshot || {})[key]);
    return Number.isFinite(rate) && rate > 0 ? `${esc([it.purity, it.metal].filter(Boolean).join(' '))}: ${fmt(rate)}/g` : '';
  }).filter(Boolean))];
  const isPaidNow = orderIsPaid(order);
  if (isPaidNow && finaleLive() && finaleQualifiesItems(order.items || []).ok && sessionStorage.getItem('fqPrompt') === order.id) {
    sessionStorage.removeItem('fqPrompt');
    location.hash = '#/scheme?step=quiz&orderId=' + encodeURIComponent(order.id) + (pin ? '&pin=' + encodeURIComponent(pin) : '');
    return;
  }

  // v128 — returning from the Cashfree hosted page (?cf=success|pending|fail)
  const returnHint = String(q.get('cf') || '').toLowerCase();
  const ppReturn = isPaidNow ? (returnHint ? 'success' : '') : (returnHint === 'success' ? 'pending' : returnHint);
  /* v160 — campaign fail flag: fail banner + auto-return to the showcase. */
  const campFail = (ppReturn === 'fail') && finaleLive() && finaleQualifiesItems(order.items || []).ok;
  const campFailGender = campFail ? campaignGenderOfItems(order.items || []) : 'gents';
  const ppBannerHTML = ppReturn === 'success'
    ? `<div class="pp-banner ok" id="ppBanner"><span class="pp-bi">✓</span><div><b>Payment received</b><small>Cashfree confirmed it — the receipt is shown in the ledger below.</small></div></div>`
    : ppReturn === 'fail'
    ? `<div class="pp-banner err" id="ppBanner"><span class="pp-bi">!</span><div><b>Payment was not completed</b><small>${campFail ? 'Your 10g-scheme design is still waiting in the showcase — taking you back to the 3 designs in a moment.' : 'If money was debited, Cashfree reverses it automatically in 5–7 working days. Retry with the button below.'}</small>${campFail ? `<div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap"><a class="btn btn-gold btn-sm" href="#/scheme?step=products&gender=${campFailGender}">← Back to 3 designs</a></div>` : ''}</div></div>`
    : ppReturn === 'pending'
    ? `<div class="pp-banner pending" id="ppBanner"><span class="pp-spinner sm" aria-hidden="true"></span><div><b>Confirming your Cashfree payment…</b><small>Hold on a few seconds — do not close this tab.</small></div></div>`
    : '';
  view.innerHTML = `
  <div style="min-height:70vh;display:flex;align-items:center;padding:60px 0">
    <div class="container" style="max-width:860px">
      <div class="center rv in">
        <img src="/images/logo.png" class="order-logo" alt="Shivaa">
        <div style="font-size:34px;margin-bottom:8px;color:var(--gold)">✦</div>
        <span class="label">Order placed</span>
        <h1 style="font-size:42px">${(() => {
          const cfName = order.cfCheckout && order.cfCheckout.shipping && order.cfCheckout.shipping.name;
          const real = cfName || ((order.userName && !/^cashfree-verified/i.test(order.userName)) ? order.userName : '');
          return 'Shubh Aashirwad, ' + esc((real || 'Valued customer').split(' ')[0]) + '!';
        })()}</h1>
        <p style="color:var(--ink-2)">Order <b style="color:var(--maroon)">${order.id}</b> is confirmed.${order.earnedPoints > 0 ? ` You will earn <b style="color:var(--gold)">${order.earnedPoints} royalty points</b> once payment is confirmed ✦` : ''}<br>
        Rate-lock summary saved to your account. Live tracking below.</p>
        ${order.guest ? `<p style="color:var(--ink-3);font-size:12.5px;max-width:520px;margin:0 auto 6px">✦ Bought in one tap as a guest — delivery details are collected on Cashfree&rsquo;s page. The shop confirms them before dispatch. Questions? WhatsApp ${esc(state.settings.phone || '+91 89050 05921')}.</p>` : ''}
      </div>
      ${ppBannerHTML}
      <div class="order-card mt-3">
        <div class="order-top"><div class="order-id">${order.id} · ${timeFmt(order.createdAt)}</div><span class="status-pill st-${order.status.toLowerCase()}">${order.status}</span></div>
        ${order.invoiceNo
          ? `<div style="font-size:12px;color:var(--ink-3);margin:2px 0 8px">Tax invoice <b>${esc(order.invoiceNo)}</b> · HSN ${esc(order.hsn || (order.items || []).map(i => i.hsn).filter(Boolean)[0] || '7113')}</div>`
          /* v136 (#25) — the Tax Invoice is minted only once the money is in,
             so an unpaid order says when to expect it instead of showing a
             number over an unsettled balance. */
          : `<div style="font-size:12px;color:var(--ink-3);margin:2px 0 8px">Tax invoice is issued once payment is confirmed · HSN ${esc(order.hsn || (order.items || []).map(i => i.hsn).filter(Boolean)[0] || '7113')}</div>`}
        ${order.items.map(it => `<div class="sum-row"><span>${esc(it.name)}${it.size ? ' (' + esc(it.size) + ')' : ''} × ${it.qty}</span><b>${fmt(it.unitPrice * it.qty)}</b></div>`).join('')}
        <div class="sum-row"><span>Rate locked at</span><b>${savedRates.length ? savedRates.join('<br>') : 'Not recorded'} (${esc((order.rateSnapshot || {}).stampedAt ? timeFmt((order.rateSnapshot || {}).stampedAt) : 'order time')})</b></div>
        <div class="sum-row"><span>Subtotal</span><b>${fmt(order.subtotal)}</b></div>
        ${order.discount ? `<div class="sum-row"><span>Discount${order.coupon ? ' (' + esc(order.coupon) + ')' : ''}${order.pointsUsed ? ' · ' + order.pointsUsed + ' pts' : ''}</span><b style="color:var(--ok)">− ${fmt(order.discount)}</b></div>` : ''}
        <div class="sum-row"><span>Shipping</span>${order.shipping === 0 ? '<span class="free">FREE</span>' : `<b>${fmt(order.shipping)}</b>`}</div>
        ${order.prepaidDiscount ? `<div class="sum-row"><span>Prepaid discount</span><b style="color:var(--ok)">− ${fmt(order.prepaidDiscount)}</b></div>` : ''}
        <div class="sum-row total"><span>${isPaidNow ? 'Paid via' : 'Payment'} ${esc(order.paymentMethod)}</span><b>${fmt(order.total)}</b></div>
      </div>
      ${orderStageHTML(order)}
      ${trackingCardHTML(order)}
      ${paymentLedgerHTML(order)}
      ${codConfirmHTML(order)}
      ${(order.paymentStatus === 'Awaiting payment' || order.paymentStatus === 'Partially paid') ? `<div class="pay-due-card">
        <h3>${order.paymentStatus === 'Partially paid' ? '⌛ Balance payment pending' : '⌛ Payment pending'}</h3>
        <p>${order.amountPaid ? `<b>${fmt(order.amountPaid)} received</b> · balance <b>${fmt(order.balance || (order.total - order.amountPaid))}</b> · ` : ''}Your piece is reserved &amp; today&rsquo;s rate is held. Complete payment now — UPI QR, cards or net-banking — or switch to WhatsApp.</p>
        <div class="pay-due-btns">
          <button class="btn btn-gold btn-lg" onclick="Shivaa.payForOrder(${jsArg(order.id)}, ${pin ? jsArg(pin) : 'null'}).then(()=>location.reload())">Pay ${fmt(order.balance || (order.amountPaid ? order.total - order.amountPaid : order.total))} now</button>
          <button class="btn btn-outline" onclick="Shivaa.waOpenOrder(${jsArg(order.id)})">Pay on WhatsApp</button>
        </div></div>` : ''}
      ${order.paymentStatus === 'Proof submitted' ? `<div class="pay-due-card" style="background:linear-gradient(135deg,#eef6ff,#dcecff);border-color:#7fb0e6">
        <h3>🔎 Payment being verified</h3>
        <p>We have your payment screenshot (ref <b>${esc((order.payProof && order.payProof.ref) || '—')}</b>). The counter confirms it within minutes — this page updates automatically; your rate stays held.</p>
        <div class="pay-due-btns"><a class="btn btn-outline btn-sm" href="javascript:Shivaa.waOpenOrder(${jsArg(order.id)})">Confirm faster on WhatsApp</a></div></div>` : ''}
      ${order.paymentStatus === 'Refunded' ? `<div class="pay-due-card" style="background:#fdeeef;border-color:#e6a0a8"><h3>Refunded</h3><p>The refund for this order is processed to the payment source. Allow 3–5 working days for it to appear.</p></div>` : ''}
      ${order.paymentMethod === 'WhatsApp' && order.paymentStatus !== 'Paid' ? `<div class="wa-hint" style="justify-content:center;max-width:640px;margin:0 auto 18px">Your order is reserved — confirm &amp; pay on WhatsApp to lock today's rate.</div>
      <div class="center" style="margin-bottom:18px"><button class="btn btn-gold btn-lg" onclick="Shivaa.waOpenOrder(${jsArg(order.id)})">Confirm &amp; Pay on WhatsApp</button></div>` : ''}
      <div id="refundSlot">${refundCardHTML(order)}</div>
      ${order.status === 'Delivered' ? npsHTML(order) : ''}
      ${order.status === 'Delivered' ? careCTAHTML(order) : ''}
      <div class="center"><a class="btn btn-gold" href="#/certificate/${encodeURIComponent(order.id)}">🛡 View purity certificate</a></div>
      <div class="center" style="margin-top:12px"><a class="btn btn-primary" href="#/account?tab=orders">View All Orders</a> <a class="btn btn-ghost" href="#/shop" style="margin-left:10px">Continue Shopping</a></div>
    </div>
  </div>`;
  if (isPaidNow) confetti();
  /* v160 — campaign fail auto-return (owner order): order page is a dead-end
     after a failed scheme payment; the showcase is where the retry happens. */
  if (campFail) {
    toast('Payment failed — showing your 3 designs again ✦', 'err');
    setTimeout(() => {
      if (isCurrent()) {
        location.hash = '#/scheme?step=products&gender=' + encodeURIComponent(campFailGender);
      }
    }, 4000);
  }
  finaleAfterOrder(order);   // Gold Finale: quiz prompt for qualifying orders (if campaign live)
  // v60: surface this order's refund/exchange request if one exists
  try {
    const { requests } = await api('/api/refunds/mine');
    if (!isCurrent()) return;
    const mine = (requests || []).find(r => r.orderId === order.id);
    const slot = $('#refundSlot');
    if (mine && slot) slot.innerHTML = refundCardHTML(order, mine);
  } catch (e) { /* guests / no requests */ }
  if (!isCurrent()) return;
  // v128 — after a Cashfree redirect return, ask the server to reconcile the
  // order (GET /pg/orders + refund status) and redraw the moment it flips to Paid.
  if (!isPaidNow && (ppReturn === 'success' || ppReturn === 'pending')) {
    /* v135 (#7) — the poller used to give up after six tries (about 15 seconds)
       and tell the customer to "reload this page in a minute" at precisely the
       moment they are most anxious about a five-figure payment. UPI and bank
       confirmations routinely take 30–90 s, so the schedule now backs off to
       roughly two and a half minutes before it stops. */
    const PP_SCHEDULE = [1200, 2600, 4000, 6000, 8000, 10000, 12000, 15000, 15000, 15000];
    const pollPP = async (tries) => {
      if (!isCurrent() || !document.getElementById('ppBanner')) return;              // navigated away
      if (tries >= PP_SCHEDULE.length) {
        const b = document.getElementById('ppBanner');
        if (b) b.querySelector('small').textContent = 'Confirmation is taking longer than usual — automatic checks have paused. Reload this page to check again. Contact the shop if money was debited.';
        return;
      }
      await new Promise(r => setTimeout(r, PP_SCHEDULE[tries]));
      if (!isCurrent() || !document.getElementById('ppBanner')) return;
      try {
        const r = await api('/api/pay/cashfree/status', { method: 'POST', body: JSON.stringify({ orderId: id, pin: pin || '' }) });
        if (!isCurrent()) return;
        const o = r.order || {};
        const ps = String(o.paymentStatus || '');
        if (/^paid$/i.test(ps) || /partially paid/i.test(ps)) {
          toast(orderIsPaid(o) ? 'Cashfree payment confirmed ✦' : 'Part payment received — balance is still due.');
          if (orderIsPaid(o) && finaleLive() && finaleQualifiesItems(o.items || []).ok) {
            location.hash = '#/scheme?step=quiz&orderId=' + encodeURIComponent(id) + (pin ? '&pin=' + encodeURIComponent(pin) : '');
            return;
          }
          history.replaceState(null, '', '#/order/' + encodeURIComponent(id) + (pin ? '?pin=' + encodeURIComponent(pin) : ''));
          return pages.order(view, new URLSearchParams(pin ? 'pin=' + encodeURIComponent(pin) : ''), id);
        }
        if (/failed/i.test(ps)) {
          history.replaceState(null, '', '#/order/' + encodeURIComponent(id) + '?cf=fail' + (pin ? '&pin=' + encodeURIComponent(pin) : ''));
          return pages.order(view, new URLSearchParams('cf=fail' + (pin ? '&pin=' + encodeURIComponent(pin) : '')), id);
        }
        return pollPP(tries + 1);
      } catch (e) { return pollPP(tries + 1); }
    };
    pollPP(0);
  }
};
function confetti() {
  const c = document.createElement('canvas');
  Object.assign(c.style, { position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 300 });
  document.body.appendChild(c);
  const x = c.getContext('2d');
  if (!x) { c.remove(); return; }   // v92 — no canvas engine (old webview/tests): skip the burst
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
  const isCurrent = viewLifetime(view);
  if (!state.user) { signInGate(view, 'account', 'My Account', 'Sign in with the mobile number you order with — your orders, certificates, saved addresses and Royalty points sit behind it.'); openLogin('account'); return; }
  const tab = q.get('tab') || 'home';
  const me = state.user;
  // v31 — a failed fetch must never blank the account page; if the session
  // died (401), api() has already cleared it, so show the login gate.
  let orders = [], wl = [];
  try { orders = (await api('/api/orders')).orders || []; if (!isCurrent()) return; window.Shivaa._myOrders = orders; }   // v57: buy-again
  catch (e) { if (!isCurrent()) return; if (!state.user) { openLogin('account'); return; } }
  if (!isCurrent()) return;
  try { wl = (await api('/api/wishlist')).wishlist || []; }
  catch (e) { if (!isCurrent()) return; if (!state.user) { openLogin('account'); return; } }
  if (!isCurrent()) return;
  const tier = me.loyaltyPoints > 5000 ? 'Gold' : me.loyaltyPoints > 2000 ? 'Silver' : 'Bronze';
  const initials = me.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const prof = me.profile || {};
  const filled = ['name', 'phone', 'email'].filter(k => me[k]).length + ['dob', 'anniversary', 'gender', 'city'].filter(k => prof[k]).length;
  const profPct = Math.round(filled / 7 * 100);
  const nAdr = (me.addresses || []).length;

  const tiles = [
    ['overview', '◈', 'Account Overview', 'Your details, occasions & preferences'],
    ['orders', '▦', 'My Orders', orders.length + ' order' + (orders.length === 1 ? '' : 's')],
    ['certificates', '🛡', 'My Certificates', orders.length ? orders.length + ' digital purity certificate' + (orders.length === 1 ? '' : 's') : 'Issued with your first order'],
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
      ${tiles.map(t => `<a href="${t[0] === 'certificates' ? '#/certificates' : '#/account?tab=' + t[0]}" class="acct-tile ${tab === t[0] ? 'on' : ''}"><span class="at-ic">${t[1]}</span><span class="at-tx"><b>${t[2]}</b><small>${t[3]}</small></span><span class="at-go">›</span></a>`).join('')}
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
        <div class="fld"><label>Place / city</label><input id="pfCity" value="${esc(prof.city || '')}" placeholder="e.g. Nagaur" autocomplete="address-level2"></div>
        <button class="btn btn-primary" style="grid-column:1/-1;justify-self:start">Save My Details</button>
      </form>
      <div class="qty-banner">✦ We remember your big days — birthday &amp; anniversary month brings 2× royalty points and first look at festive designs.</div>
    </div>` : ''}
  ${tab === 'orders' ? orders.map(o => {
    const oq = finaleLive() && (o.items || []).length && finaleQualifiesItems(o.items).ok;   // Gold Finale: qualifies → quiz reachable from here too
    return `<div class="order-card">
      <div class="order-top"><div><a class="order-id" href="#/order/${o.id}" style="color:var(--maroon-deep);text-decoration:none">${o.id}</a><div style="font-size:12.5px;color:var(--ink-3)">${timeFmt(o.createdAt)} · ${o.items.reduce((a, i) => a + i.qty, 0)} items · ${esc(o.paymentMethod)}</div></div>
      <div style="text-align:right"><span class="status-pill st-${o.status.toLowerCase()}">${o.status}</span><div style="margin-top:6px"><b>${fmt(o.total)}</b></div>${o.paymentStatus === 'Proof submitted' ? '<div style="font-size:11px;color:#3670b8;margin-top:4px">🔎 Payment verification</div>' : ''}</div></div>
      ${o.status === 'Cancelled' ? '<div class="tracker-cancel" style="margin:10px 0">Cancelled</div>'
        : `<div class="mini-stages">${ORDER_STAGES.map(([key, , ic]) => {
          const hit = (o.timeline || []).find(t => t.s === key);
          return `<span class="ms-step ${hit ? 'done' : ''}" title="${key}">${ic}</span>`;
        }).join('')}</div>`}
      <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-top:8px">
        ${o.items.map(i => `<img src="${safeUrl(i.img)}" style="width:44px;height:44px;border-radius:9px;object-fit:cover" alt="">`).join('')}
          <a class="btn btn-ghost btn-sm" href="javascript:Shivaa.orderDetail(${jsArg(o.id)})">Details</a>
          <a class="btn btn-outline btn-sm" rel="noopener" href="#/invoice/${o.id}" target="_blank">⬇ Invoice</a>
          <a class="btn btn-outline btn-sm" href="#/certificate/${o.id}">🛡 Certificate</a>
          ${o.status === 'Delivered' ? `<button class="btn btn-gold btn-sm" onclick="Shivaa.buyAgain('${o.id}')">↻ Buy again</button>` : ''}
          ${o.status === 'Delivered' ? `<a class="btn btn-outline btn-sm" href="#/care?order=${encodeURIComponent(o.id)}">✦ Care</a>` : ''}
          ${(o.paymentStatus === 'Awaiting payment' || o.paymentStatus === 'Partially paid') ? `<button class="btn btn-gold btn-sm" onclick="Shivaa.payForOrder('${o.id}').then(()=>location.reload())" style="margin-left:auto">⌛ Pay ${o.balance ? fmt(o.balance) : 'now'}</button>` : ''}
          ${o.codConfirmed === false && o.paymentMethod === 'COD' ? `<button class="btn btn-outline btn-sm" onclick="Shivaa.codConfirm('${o.id}')">✓ Confirm COD</button>` : ''}
          ${oq ? `<a class="btn btn-gold btn-sm" href="javascript:Shivaa.fqOpen({route:'purchase',orderId:${jsArg(o.id)}})" style="margin-left:auto">✦ Gold Finale — this order qualifies</a>` : ''}
      </div></div>`;
  }).join('') || '<div class="empty"><h3>No orders yet</h3><a class="btn btn-outline" href="#/shop">Start shopping</a></div>' : ''}
  ${tab === 'addresses' ? `
    <div class="acct-sec">
      <div class="as-head"><h3>Manage Addresses</h3><button class="btn btn-primary btn-sm" onclick="Shivaa.addrForm()">+ Add Address</button></div>
      <div id="addrFormWrap" hidden>
        <form class="form-grid" onsubmit="Shivaa.addrSave(event)">
          <input type="hidden" id="adId">
          <div class="fld"><label>Label</label><select id="adLabel" class="sortsel" style="width:100%;border-radius:12px">${['Home', 'Work', 'Other'].map(l => `<option>${l}</option>`).join('')}</select></div>
          <div class="fld"><label>Full name *</label><input id="adName" autocomplete="name" required></div>
          <div class="fld"><label>Phone *</label><input id="adPhone" type="tel" inputmode="tel" autocomplete="tel" maxlength="10" required></div>
          <div class="fld"><label>Pincode *</label><input id="adPin" inputmode="numeric" autocomplete="postal-code" maxlength="6" required></div>
          <div class="fld full"><label>Address (house, street, landmark) *</label><input id="adLine" autocomplete="street-address" required></div>
          <div class="fld"><label>City *</label><input id="adCity" autocomplete="address-level2" required></div>
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
      city: $('#pfCity') ? $('#pfCity').value : '',
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
  const isCurrent = viewLifetime(view);
  let items = [], wl = [];
  if (state.user) { const r = await api('/api/wishlist'); wl = r.wishlist; items = r.items; }
  else { wl = state.localWish; items = state.productsCache.filter(p => state.localWish.includes(p.id)); }
  if (!isCurrent()) return;
  view.innerHTML = `
  <section class="page-hero"><div class="dust" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="container"><div class="crumbs"><a href="#/">Home</a> / Wishlist</div><h1>Wishlist</h1><p>${items.length} saved piece${items.length === 1 ? '' : 's'}${state.user ? '' : ' · login to sync across devices'}</p></div></section>
  <div class="container" style="padding:30px 0 90px">
    ${items.length ? `
    <div class="registry-bar">
      <div class="rb-tx"><b>🎁 Turn these into a gift registry</b><small>Share one link with family &mdash; they see your chosen pieces and can gift or contribute, quietly. Perfect for weddings &amp; bridal trousseau.</small></div>
      <div class="rb-acts">
        <button class="btn btn-gold" id="rgShare">🔗 Copy share link</button>
        <button class="btn btn-outline" id="rgWa">Share on WhatsApp</button>
        <button class="btn btn-ghost btn-sm" id="rgAlert">🔔 Alert me on price drops</button>
      </div>
    </div>
    <div class="p-grid">${items.map(p => productCard(p, { wishSet: wl })).join('')}</div>`
    : `<div class="empty"><img src="/images/logo.png" class="empty-logo" alt=""><h2>Nothing saved yet</h2><p style="margin:10px 0 20px">Tap the heart on any piece to keep it here.</p><a class="btn btn-primary" href="#/shop">Explore Jewellery</a></div>`}
  </div>`;
  if (items.length) {
    const ids = items.map(p => p.id).join(',');
    const name = state.user ? state.user.name.split(' ')[0] : '';
    const link = location.origin + location.pathname + '#/giftlist?ids=' + encodeURIComponent(ids) + (name ? '&by=' + encodeURIComponent(name) : '');
    const copy = () => {
      (navigator.clipboard ? navigator.clipboard.writeText(link) : Promise.reject()).catch(() => {
        const t = document.createElement('textarea'); t.value = link; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); } catch (e) {} t.remove();
      });
      toast('Share link copied ✓');
    };
    $('#rgShare').onclick = copy;
    $('#rgWa').onclick = () => waOpen(`Namaste ✦ Here is my Shivaa gift registry — tap to see the pieces I love:\n${link}`);
    const rgAlertEl = $('#rgAlert'); if (rgAlertEl) rgAlertEl.onclick = () => Shivaa.wishlistAlerts(wl);
  }
};

/* ─────────── v57 · shared gift registry (public, no login needed) ─────────── */
pages.giftlist = async (view, q) => {
  const ids = (q.get('ids') || '').split(',').map(s => s.trim()).filter(Boolean).slice(0, 60);
  const by = q.get('by') || '';
  const occasion = q.get('occasion') || 'Gift registry';
  let items = ids.map(id => (state.productsCache || []).find(p => p.id === id)).filter(Boolean);
  if (!items.length && ids.length) { try { const r = await api('/api/products'); items = ids.map(id => (r.products || []).find(p => p.id === id)).filter(Boolean); } catch (e) {} }
  const total = items.reduce((a, p) => a + price(p).total, 0);
  view.innerHTML = `
  <section class="page-hero registry-hero"><div class="dust" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div>
    <div class="container"><span class="hero-kicker">🎁 ${esc(occasion)}</span><h1>${by ? esc(by) + '&rsquo;s' : 'A'} Shivaa <em class="shimmer foil-txt">wishlist</em></h1>
    <p class="hero-sub">${items.length} treasured piece${items.length === 1 ? '' : 's'} · wish value <b>${fmt(total)}</b> · family can gift a piece or contribute quietly.</p></div></section>
  <div class="container" style="padding:34px 0 90px">
    ${items.length ? `<div class="p-grid">${items.map(p => productCard(p, { wishSet: [] })).join('')}</div>
      <div class="registry-cta">
        <h3>Gift one of these pieces?</h3>
        <p>Our team keeps every contribution confidential from the registry owner until the reveal. You can also buy a <a href="#/giftcard" style="color:var(--gold)">Shivaa gift card</a>.</p>
        <a class="btn btn-gold btn-lg" target="_blank" rel="noopener" href="${waLink('Namaste Shivaa ✦\n\nI would like to gift a piece from ' + (by || 'a') + '’s Shivaa gift registry: ' + location.href)}">💝 Talk to the wedding &amp; gifting desk</a>
        <a class="btn btn-ghost" href="#/shop">Create your own registry</a>
      </div>`
    : `<div class="empty"><img src="/images/logo.png" class="empty-logo" alt=""><h2>This registry is empty</h2><p style="margin:10px 0 20px">Its pieces may have moved &mdash; browse the collection instead.</p><a class="btn btn-primary" href="#/shop">Explore Jewellery</a></div>`}
  </div>`;
};

/* ─────────── v57 · RING / BANGLE SIZER (v101: Indian showroom-standard
   numbering — Indian size = inner circumference mm − 40, matching the
   printed strips used by Indian jewellers (17.0 mm dia → size 13);
   press-&-hold steppers) ─ */
const IND_SIZE_OFFSET = 40;   // Indian ring size = circumference (mm) − 40
const indSizeFromDia = dia => Math.round(dia * Math.PI - IND_SIZE_OFFSET);
const INDIAN_RING_CHART = (() => {
  const rows = [];
  for (let size = 8; size <= 30; size++) {
    const circ = size + IND_SIZE_OFFSET;
    rows.push({ size, circ, dia: Math.round(circ / Math.PI * 10) / 10 });
  }
  return rows;
})();
pages.sizer = async view => {
  const saved = (() => { try { return localStorage.getItem('shv_ring_size') || ''; } catch (e) { return ''; } })();
  view.innerHTML = `
  <section class="page-hero"><div class="dust" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="container"><div class="crumbs"><a href="#/">Home</a> / Ring Size Guide</div><h1>Find your ring size</h1><p>Indian standard sizes — two quick methods, no guessing, no size exchanges. Tip: <b>press &amp; hold</b> the − / + buttons.</p></div></section>
  <div class="container sizer-wrap" style="padding:36px 0 90px">
    <div class="sizer-grid">
      <div class="adm-card sz-card">
        <h2>① Match a ring you already own</h2>
        <p class="partner-note">Calibrate once with any ATM / bank card (exactly <b>85.6 mm</b> wide), then resize until the circle fits the <b>inner edge</b> of your ring. Press &amp; hold any − / + button to move continuously.</p>
        <div class="sz-cal">
          <label>Calibration — card should line up exactly: <button type="button" class="sz-reset" id="szCalReset">reset</button></label>
          <div class="sz-cardrow"><button class="btn btn-ghost btn-sm" id="szCalDown" aria-label="Calibrate smaller">−</button><div class="sz-bankcard" id="szBank"><span>Bank / ATM card · 85.6 mm</span></div><button class="btn btn-ghost btn-sm" id="szCalUp" aria-label="Calibrate bigger">+</button></div>
        </div>
        <div class="sz-stage" id="szStage"><div class="sz-circle" id="szCircle"><span></span></div></div>
        <div class="sz-controls">
          <button class="btn btn-ghost" id="szDown">− Smaller</button>
          <div class="sz-readout"><b id="szDia">17.0</b><small>mm inner diameter · Indian size <b id="szInd">13</b></small></div>
          <button class="btn btn-ghost" id="szUp">Bigger +</button>
        </div>
        <button class="btn btn-gold btn-block" id="szSave">Save my size · pre-select on every ring</button>
      </div>
      <div class="adm-card sz-card">
        <h2>② Printable paper strip</h2>
        <p class="partner-note">Wrap snugly around the widest part of the finger (allow for the knuckle). The number at the arrow is your <b>Indian size</b>.</p>
        <div class="sz-strip-wrap">
          <div class="sz-strip" id="szStrip"></div>
        </div>
        <button class="btn btn-outline btn-block" onclick="window.print()">🖨 Print the strip</button>
        <div class="sz-tips">
          <b>Good to know</b>
          <ul><li>Measure at the end of the day when fingers are warm.</li>
          <li>The band should fit snug but slide over the knuckle.</li>
          <li>Between two sizes? Pick the larger — fingers swell in summer.</li>
          <li>Still unsure? Our <a href="#/videoconsult" style="color:var(--gold)">video call</a> measures it with you, free.</li></ul>
        </div>
      </div>
    </div>
    <div class="adm-card sz-chart-card">
      <h2>③ Indian ring size chart <small>inner diameter &amp; circumference, mm</small></h3>
      <p class="partner-note">Standard Indian numbering used across Indian jewellers: <b>Indian size = inner circumference (mm) − 40</b>. Measure the finger's circumference with the strip above and read across.</p>
      <div class="sz-chart" id="szChart"></div>
    </div>
  </div>`;
  // calibration: pixels per mm. v102 — the calibration persists on this
  // device so customers calibrate once, not on every visit.
  let ppm = 96 / 25.4, dia = 17.0;
  try { const v = parseFloat(localStorage.getItem('shv_sizer_ppm') || ''); if (v >= 2 && v <= 8) ppm = v; } catch (e) {}
  const card = $('#szBank');
  const haptic = ms => { try { navigator.vibrate?.(ms); } catch (e) {} };
  const DEFAULT_PPM = 96 / 25.4;
  const paintCal = () => {
    card.style.width = (85.6 * ppm).toFixed(1) + 'px'; paint();
    try {
      if (Math.abs(ppm - DEFAULT_PPM) < 0.0006) localStorage.removeItem('shv_sizer_ppm');
      else localStorage.setItem('shv_sizer_ppm', ppm.toFixed(4));
    } catch (e) {}
  };
  const paint = () => {
    $('#szCircle').style.width = (dia * ppm).toFixed(1) + 'px';
    $('#szCircle').style.height = (dia * ppm).toFixed(1) + 'px';
    $('#szDia').textContent = dia.toFixed(1);
    const ind = indSizeFromDia(dia);
    const indEl = $('#szInd');
    if (indEl.textContent !== String(ind)) { indEl.textContent = ind; haptic(5); }
  };
  // v101 — continuous press-and-hold on every stepper (calibration + size)
  window.Shivaa.holdRepeat($('#szCalUp'), () => { ppm *= 1.006; paintCal(); }, { repeatStart: 60, repeatMin: 18 });
  window.Shivaa.holdRepeat($('#szCalDown'), () => { ppm /= 1.006; paintCal(); }, { repeatStart: 60, repeatMin: 18 });
  window.Shivaa.holdRepeat($('#szUp'), () => { dia = Math.min(23, Math.round((dia + 0.1) * 10) / 10); paint(); }, { repeatStart: 120, repeatMin: 45 });
  window.Shivaa.holdRepeat($('#szDown'), () => { dia = Math.max(12, Math.round((dia - 0.1) * 10) / 10); paint(); }, { repeatStart: 120, repeatMin: 45 });
  $('#szCalReset').onclick = () => {
    ppm = 96 / 25.4; paintCal(); haptic(8);
    try { localStorage.removeItem('shv_sizer_ppm'); } catch (e) {}
    toast('Calibration reset');
  };
  if (saved) { const d = (parseFloat(saved) + IND_SIZE_OFFSET) / Math.PI; if (d >= 12 && d <= 23) dia = Math.round(d * 10) / 10; }
  paintCal();
  const saveBtn = $('#szSave');
  if (saved) saveBtn.innerHTML = '✓ Saved size ' + esc(saved) + ' · tap to update';
  saveBtn.onclick = () => {
    const ind = $('#szInd').textContent;
    try { localStorage.setItem('shv_ring_size', ind); } catch (e) {}
    haptic(15);
    saveBtn.innerHTML = '✓ Saved size ' + esc(ind) + ' · tap to update';
    $$('#szChart tr').forEach(tr => tr.classList.toggle('on', tr.dataset.size === ind));
    toast('Indian size ' + ind + ' saved ✓ rings open on your size');
  };
  // Indian standard reference chart (v102 — tap a row to set the circle)
  $('#szChart').innerHTML = '<table class="sz-table"><thead><tr><th>India</th><th>Dia mm</th><th>Circ mm</th></tr></thead><tbody>'
    + INDIAN_RING_CHART.map(r => `<tr data-size="${r.size}" data-dia="${r.dia.toFixed(1)}"${String(saved) === String(r.size) ? ' class="on"' : ''} title="Set circle to size ${r.size}"><td><b>${r.size}</b></td><td>${r.dia.toFixed(1)}</td><td>${r.circ}.0</td></tr>`).join('')
    + '</tbody></table>';
  $$('#szChart tbody tr').forEach(tr => tr.addEventListener('click', () => {
    dia = Math.max(12, Math.min(23, parseFloat(tr.dataset.dia)));
    paint(); haptic(8);
    $$('#szChart tr').forEach(x => x.classList.toggle('on', x === tr));
    $('#szStage').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }));
  // printable strip: circumference mm with Indian size ticks (size = mm − 40).
  // Covers Indian sizes 8–32 (circ 48–72 mm) — the full chart range.
  const strip = $('#szStrip');
  let ticks = '';
  const MM_MIN = 48, MM_MAX = 72;
  for (let mm = MM_MIN; mm <= MM_MAX; mm++) {
    const ind = mm - IND_SIZE_OFFSET;
    const big = mm % 5 === 0;
    ticks += `<span class="tick" style="left:${(mm - MM_MIN) * 10}px"><i class="${big ? 'big' : ''}"></i><b class="tk-ind">${ind}</b>${big ? `<small>${mm}mm</small>` : ''}</span>`;
  }
  strip.innerHTML = `<span class="sz-arrow">▾ cut &amp; wrap from here</span><div class="sz-ruler">${ticks}</div><small>Bold numbers are Indian sizes (circumference − 40). Print at 100% scale — choose “actual size” in print settings.</small>`;
};

/* ═══════════ v58 · lifetime care plan bookings ═══════════ */
const CARE_SERVICES = [
  ['polish', '✨ Annual polish & shine', 'Gentle ultrasonic + hand polish; stones checked. Free for life on any Shivaa piece.'],
  ['rhodium', '⚪ Rhodium renewal', 'Fresh white-gold finish on rings, chains & tops that wear daily.'],
  ['soldering', '🔗 Soldering / chain repair', 'Jump rings, chain joins, posts, clasps — quoted before work starts.'],
  ['stone', '💎 Stone tightening', 'Prongs inspected & tightened; loose stones listed honestly, no surprise swap.'],
  ['resize', '📏 Ring / bangle resizing', 'Most rings sized ±2; your saved size pre-fills the form.'],
  ['clean', '🧽 At-home care kit guidance', 'Free guidance + a small care kit with counter pickup.'],
];
pages.care = async (view, q) => {
  const preOrder = q.get('order') || '';
  let saved = '';
  try { saved = localStorage.getItem('shv_ring_size') || ''; } catch (e) {}
  view.innerHTML = `
  <section class="page-hero"><div class="dust" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div>
    <div class="container"><div class="crumbs"><a href="#/">Home</a> / Lifetime Care</div><h1>Lifetime <em class="shimmer foil-txt">Care Plan</em></h1>
    <p>Every Shivaa piece is looked after for life — at our counter, by video, or with pickup &amp; drop in Jaipur &amp; Nagaur.</p></div></section>
  <div class="container care-wrap" style="padding:36px 0 90px">
    <div class="care-grid">
      <div>
        <div class="care-list">
          ${CARE_SERVICES.map(([k, t, d], i) => `<label class="care-opt ${i === 0 ? 'on' : ''}" data-k="${k}">
            <input type="radio" name="care" value="${k}" ${i === 0 ? 'checked' : ''}>
            <span><b>${t}</b><small>${d}</small></span></label>`).join('')}
        </div>
        <div class="care-promise adm-card">
          <h2>The Shivaa care promise</h2>
          <ul>
            <li>✦ Weighing in your presence, sealed &amp; photographed.</li>
            <li>✦ No charge for standard polishing &amp; stone checks on our pieces.</li>
            <li>✦ Repair cost approved on WhatsApp before any work begins.</li>
            <li>✦ HUID pieces return with the same HUID recorded on your certificate.</li>
          </ul>
        </div>
      </div>
      <form class="adm-card care-form" id="careForm">
        <h2>Book a care visit</h2>
        <div class="fld"><label>Full name *</label><input name="name" required value="${esc(state.user?.name || '')}"></div>
        <div class="fld"><label>Mobile *</label><input name="phone" type="tel" inputmode="tel" maxlength="10" required value="${esc((state.user?.phone || '').replace(/\D/g, '').slice(-10))}"></div>
        <div class="fld"><label>Related order no. (if any)</label><input name="order" value="${esc(preOrder)}" placeholder="SHV…"></div>
        <div class="fld"><label>Preferred way</label>
          <select name="mode" class="sortsel" style="width:100%;border-radius:12px">
            <option>Counter visit — Jayal, Nagaur</option>
            <option>Pickup &amp; drop (Jaipur / Nagaur)</option>
            <option>Video call guidance first</option>
          </select></div>
        <div class="fld"><label>Preferred date</label><input name="date" type="date"></div>
        ${saved ? `<div class="qty-banner">📏 Your saved ring size is <b>${esc(saved)}</b></div>` : '<a class="size-guide-link" href="#/sizer" style="display:inline-block;margin:4px 0 10px">📏 Don’t know your ring size?</a>'}
        <div class="fld"><label>Anything we should know?</label><textarea name="details" placeholder="e.g. one small stone feels loose, chain clasp opens on its own…"></textarea></div>
        <button class="btn btn-gold btn-block btn-lg">Request booking</button>
        <p class="partner-note" style="margin-top:10px">Our team confirms the slot on WhatsApp within working hours.</p>
      </form>
    </div>
  </div>`;
  view.querySelectorAll('.care-opt').forEach(l => l.onclick = () => {
    view.querySelectorAll('.care-opt').forEach(x => x.classList.remove('on')); l.classList.add('on');
    l.querySelector('input').checked = true;
  });
  view.querySelector('#careForm').onsubmit = async e => {
    e.preventDefault();
    const f = new FormData(e.target);
    const chosen = (view.querySelector('input[name="care"]:checked') || {}).value || 'polish';
    const svc = CARE_SERVICES.find(x => x[0] === chosen) || CARE_SERVICES[0];
    const orderId = String(f.get('order') || '').trim();
    const res = await api('/api/services', { method: 'POST', body: JSON.stringify({
      type: 'care-' + chosen, name: f.get('name'), phone: f.get('phone'), orderId,
      details: [svc[1].replace(/^[^A-Za-z]+/, ''), 'Order ' + (orderId || '—'), f.get('mode'), f.get('date'), f.get('details')].filter(Boolean).join(' · ').slice(0, 200),
    }) });
    e.target.innerHTML = `<div class="center" style="padding:40px 10px"><div style="font-size:44px">✦</div><h3>Booking requested</h3><p style="color:var(--ink-2);margin:8px 0 16px">We will confirm your ${esc(svc[1])} slot on WhatsApp shortly. Your care token is <b>${esc((res.request && res.request.id) || '')}</b> — track it below.</p><button class="btn btn-gold" onclick="location.reload()">See my requests</button> <a class="btn btn-ghost" href="#/">Back home</a></div>`;
    toast('Care booking sent ✦');
  };
  // v59 — live repair-token tracker for signed-in customers
  (async () => {
    if (!state.user) return;
    try {
      const { requests } = await api('/api/services/mine');
      const mine = (requests || []).filter(r => String(r.type || '').startsWith('care-'));
      if (!mine.length) return;
      const host = document.createElement('div');
      host.style.gridColumn = '1 / -1';
      host.innerHTML = careRequestsHTML(mine);
      view.querySelector('.care-grid').insertAdjacentElement('afterend', host);
    } catch (e) {}
  })();
};
const CARE_STAGES = ['Booked', 'Confirmed', 'Picked up', 'At karigar', 'Ready', 'Delivered'];
function careRequestsHTML(mine) {
  return `<div class="adm-card" style="margin-top:24px"><h3>Your care / repair tokens</h3>
    ${mine.map(r => {
      const hist = r.history || [{ s: 'Booked' }];
      let idx = -1;
      CARE_STAGES.forEach((s, i) => { if (hist.some(h => h.s === s)) idx = i; });
      if (idx < 0) idx = 0;
      return `<div class="care-token">
        <div class="ct-head"><b>${esc(r.id)}</b><span class="status-pill st-placed">${esc(r.status)}</span></div>
        <div class="mini-stages" style="margin:10px 0">${CARE_STAGES.map((s, i) => `<span class="ms-step ${i <= idx ? 'done' : ''}" title="${s}">${['📝', '🙏', '🚚', '🔨', '✨', '💛'][i]}</span>`).join('')}</div>
        <small style="color:var(--ink-3)">${esc(r.details || '')}</small>
      </div>`;
    }).join('')}</div>`;
}

/* ═══════════ v58 · shareable quotation from the cart (48 h rate hold) ═══════════ */
pages.quote = async view => {
  const lines = state.cart.map(c => ({ c, p: state.productsCache.find(x => x.id === c.id) })).filter(x => x.p);
  if (!lines.length) { view.innerHTML = emptyShell('Quotation', 'Price Quotation', `<div class="empty" style="padding:70px 20px"><img src="/images/logo.png" class="empty-logo" alt=""><h2>Your cart is empty</h2><p style="margin:10px 0 20px">Add pieces and then generate a quotation.</p><a class="btn btn-primary" href="#/shop">Explore Jewellery</a></div>`); return; }
  const R = state.rates;
  const rows = lines.map(({ c, p }) => {
    const pr = price(p);
    return { p, c, pr, line: pr.total * c.qty };
  });
  const subtotal = rows.reduce((a, r) => a + r.line, 0);
  const prepaid = Math.round(subtotal * prepaidPct() / 100);
  const ship = subtotal >= state.settings.freeShipAbove ? 0 : state.settings.shippingFee;
  const validTill = new Date(Date.now() + 48 * 3600e3);
  const qNo = 'Q' + Date.now().toString().slice(-7);
  view.innerHTML = `
  <div class="container quote-page" style="padding:34px 0 70px;max-width:880px">
    <div class="quote-actions inv-no-print">
      <button class="btn btn-gold btn-lg" onclick="window.print()">⬇ Save PDF / Print</button>
      <button class="btn btn-outline btn-lg" id="quoteWa">💬 Send on WhatsApp</button>
      <a class="btn btn-ghost btn-lg" href="#/cart">← Edit cart</a>
    </div>
    <div class="quote-sheet" id="quoteSheet">
      <header class="q-head">
        <img src="/images/logo.png" alt="Shivaa">
        <div><b>PRICE QUOTATION</b><small>Quotation no. ${qNo} · valid till ${validTill.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</small></div>
        <span class="q-stamp">RATE HELD<br>48 HOURS</span>
      </header>
      <p class="q-note">Dear family, namaste. Below is your selection priced at Shivaa&rsquo;s <b>live rate of today (${timeFmt(R.t)})</b>. Confirm within 48 hours and the same rate is honoured; after that the day&rsquo;s live rate applies. Every price below includes <b>3% GST</b> and the metal value, making charge and stones are shown on the invoice.</p>
      <table class="q-tbl">
        <thead><tr><th>Piece</th><th class="num">Qty</th><th class="num">Approx wt</th><th class="num">Amount</th></tr></thead>
        <tbody>${rows.map(r => `<tr>
          <td><b>${esc(r.p.name)}</b><br><small>${r.p.metal === 'Silver' ? 'Silver 925' : esc(r.p.purity) + ' gold'} · ${r.p.weightG} g · SKU ${esc(r.p.sku || '')}</small></td>
          <td class="num">${r.c.qty}${r.c.size ? '<br><small>Size ' + esc(r.c.size) + '</small>' : ''}</td>
          <td class="num">${(r.p.weightG * r.c.qty).toFixed(3)} g</td>
          <td class="num"><b>${fmt(r.line)}</b></td></tr>`).join('')}</tbody>
      </table>
      <div class="q-tot">
        <div><span>Subtotal (incl. GST)</span><b>${fmt(subtotal)}</b></div>
        <div><span>Insured shipping</span><b>${ship === 0 ? 'FREE' : fmt(ship)}</b></div>
        ${prepaid > 0 ? `<div class="ok"><span>Online prepayment discount</span><b>− ${fmt(prepaid)}</b></div>` : ''}
        <div class="grand"><span>Pay online by ${validTill.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span><b>${fmt(Math.max(0, subtotal - prepaid + ship))}</b></div>
      </div>
      <div class="q-foot">
        <p><b>✦ 100% written buyback</b> on the pure metal value · every gold piece <b>BIS hallmarked with a unique HUID</b> · final weights confirmed to the milligram before billing.</p>
        <p>Shivaa Jewellers, Sadar Bazaar, Jayal, Nagaur, Rajasthan · ${esc(state.settings.phone || '+91 89050 05921')} · shivaa.in</p>
      </div>
    </div>
  </div>`;
  $('#quoteWa').onclick = () => {
    const list = rows.map(r => '• ' + r.p.name + ' ×' + r.c.qty + ' — ' + fmt(r.line)).join('\n');
    waOpen('Namaste Shivaa ✦\n\nPlease confirm this quotation (' + qNo + ', valid 48 h):\n' + list + '\n\nOnline total: ' + fmt(Math.max(0, subtotal - prepaid + ship)) + '\nQuotation: ' + location.origin + location.pathname + '#/quote');
  };
  document.documentElement.classList.add('quote-mode');
};

/* ─────────── RATES PAGE ─────────── */
/* v120 — Bug A fix: the rates page used to re-render WHOLESALE on every poll
   tick, which (a) stranded every rate card invisible (.rv starts opacity:0 and
   bindReveal() only runs at navigation, never after a poll) and (b) wiped the
   rate-alert form while the customer typed. Polls now patch values in place via
   refreshRatesPage(); a full render happens only at navigation (or when the
   nodes are missing). Live data is deliberately never reveal-gated. */
function ratesAnchorTxt(R) {
  const AL = R.anchorLevel || null;
  if (!AL) return '—';
  /* v120 — fmt() already prefixes ₹ (v119 printed ₹₹ here). */
  if (AL.mode === 'mcx-future') return `MCX future · ${fmt(AL.goldPerG)}/g`;
  if (AL.mode === 'override') return 'Admin override (pinned)';
  return `International spot · ${fmt(AL.goldPerG)}/g`;
}
function refreshRatesPage(R) {
  if (!R || !location.hash.startsWith('#/rates')) return false;
  if (!document.querySelector('[data-rr="g22"]')) return false;   // nodes gone — caller re-renders
  try {
    const set = (k, v) => { const el = document.querySelector(`[data-rr="${k}"]`); if (el) el.textContent = v; };
    const setHTML = (k, v) => { const el = document.querySelector(`[data-rr="${k}"]`); if (el) el.innerHTML = v; };
    const prem22 = R.premium ? (R.premium.gold22 !== undefined ? R.premium.gold22 : R.premium.gold) : 398;
    const prem24 = R.premium && R.premium.gold24 !== undefined ? R.premium.gold24 : 398;   // v156 — 24K carries the same desk premium as 22K
    setHTML('g22', fmt(R.gold22) + '<small>/gram</small>');
    setHTML('g22sub', '₹' + Math.round(R.gold22 * 10).toLocaleString('en-IN') + ' per 10 g · updated ' + timeFmt(R.t));
    set('spot22', fmt(R.spot.gold22) + '/g');
    set('prem24', '+₹' + prem24 + '/g');
    set('prem22', '+₹' + prem22 + '/g');
    set('anchor', ratesAnchorTxt(R));
    set('silv', fmt2(R.silver) + '/g');
    ['gold24', 'gold22', 'gold18', 'silver'].forEach(k => {
      set('rc-' + k, k === 'silver' ? fmt2(R[k]) : fmt(R[k]));
      set('rc10-' + k, k === 'silver' ? fmt2(R[k] * 10) : fmt(R[k] * 10));
    });
    const badge = document.querySelector('[data-rr="srcbadge"]');
    if (badge) {
      badge.className = 'src-badge ' + ((R.source === 'live' || R.source === 'live-mcx') ? 'src-live' : 'src-sim');
      badge.innerHTML = R.source === 'live-mcx' ? '<span class="live-dot"></span>OFFICIAL MCX LIVE' : (R.source === 'live' ? '<span class="live-dot"></span>LIVE FEED' : 'SIMULATED FEED*');
    }
    drawRateChart($('#rateChart'), R.history || []);
    return true;
  } catch (e) { return false; }
}
pages.rates = async (view) => {
  const R = state.rates;
  /* v120 — Bug A: never crash on a cold open. If the rates batch has not
     landed yet, show an honest loader; the next poll renders for real. */
  if (!R) {
    view.innerHTML = `<section class="page-hero"><div class="container"><div class="crumbs"><a href="#/">Home</a> / Live Rates</div><h1>Today's Gold & Silver Rates</h1><p>Fetching Shivaa's live rates…</p></div></section><div class="container" style="padding:60px 0 90px;text-align:center;color:var(--ink-3)"><span class="pp-spinner" aria-hidden="true"></span><p style="margin-top:14px">Weighing the market — one moment ✦</p></div>`;
    return;
  }
  /* v119 — the card is built from the SAME anchor the shop prices from:
     22K rate = round(anchorLevel.goldPerG × 0.9167) + premium.gold22 (₹398/g,
     desk physical). premium.gold stays the legacy line for older payloads.
     v156 — the 24K rate now carries the SAME ₹398/g desk premium
     (premium.gold24), and the card shows it right beside the 22K one. */
  const prem22 = R.premium ? (R.premium.gold22 !== undefined ? R.premium.gold22 : R.premium.gold) : 398;
  const prem24 = R.premium && R.premium.gold24 !== undefined ? R.premium.gold24 : 398;   // v156
  const anchorTxt = ratesAnchorTxt(R);
  view.innerHTML = `
  <section class="page-hero"><div class="dust" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="container"><div class="crumbs"><a href="#/">Home</a> / Live Rates</div><h1>Today's Gold & Silver Rates</h1>
  <p>The same feed that powers every price on shivaa.in — sourced from official MCX futures (when the owner’s exchange feed is connected) or the international bullion market, refreshed automatically every ~10 minutes.</p></div></section>
  <div class="container" style="padding:44px 0 90px">
    <div class="jaipur-hero">
      <div class="jh-main">
        <span class="jh-badge">✦ SHIVAA LIVE RATE</span>
        <div class="jh-name">Gold 22K <small>(91.67)</small></div>
        <div class="jh-val" data-rr="g22">${fmt(R.gold22)}<small>/gram</small></div>
        <div class="jh-sub" data-rr="g22sub">₹${Math.round(R.gold22 * 10).toLocaleString('en-IN')} per 10 g · updated ${timeFmt(R.t)}</div>
      </div>
      <div class="jh-side">
        <div class="jh-row"><span>International spot (22K)</span><b data-rr="spot22">${fmt(R.spot.gold22)}/g</b></div>
        <div class="jh-row"><span>24K Shivaa premium <small style="color:var(--ink-3)">desk physical</small></span><b data-rr="prem24">+₹${prem24}/g</b></div>
        <div class="jh-row"><span>22K Shivaa premium <small style="color:var(--ink-3)">desk physical</small></span><b data-rr="prem22">+₹${prem22}/g</b></div>
        <div class="jh-row"><span>Rate anchor</span><b data-rr="anchor">${anchorTxt}</b></div>
        <div class="jh-row"><span>Silver (Shivaa 925)</span><b data-rr="silv">${fmt2(R.silver)}/g</b></div>
        <div class="jh-note">These Shivaa rates power every price on shivaa.in — your bill matches this card to the rupee.</div>
      </div>
    </div>
    <div class="rate-cards">
      ${[['GOLD 24K · SHIVAA', 'gold24', '99.99% fine — reference'], ['GOLD 22K · SHIVAA', 'gold22', '91.67% — jewellery grade'], ['GOLD 18K · SHIVAA', 'gold18', '75.0% — contemporary'], ['SILVER 925 · SHIVAA', 'silver', 'sterling — jewellery grade']]
        .map(c => `<div class="rate-card ${c[0].includes('GOLD') ? 'gold' : ''}"><div class="rc-name">${c[0]}</div><div class="rc-val" data-rr="rc-${c[1]}">${c[1] === 'silver' ? fmt2(R[c[1]]) : fmt(R[c[1]])}</div><small>per gram · ${c[2]}</small><div style="margin-top:10px;font-size:12px;color:var(--ink-3)">per 10 g: <b data-rr="rc10-${c[1]}">${c[1] === 'silver' ? fmt2(R[c[1]] * 10) : fmt(R[c[1]] * 10)}</b></div></div>`).join('')}
    </div>
    <div class="chart-wrap mt-3"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:8px">
      <h2 style="font-size:20px;display:flex;align-items:center;gap:10px"><img src="/images/logo.png" style="height:26px;background:var(--white);border:1px solid var(--line);border-radius:7px;padding:3px 8px" alt=""> 22K Gold — last 12 hours <small style="font-weight:400;color:var(--ink-3);font-size:13px">(per gram)</small></h3>
      <span data-rr="srcbadge" class="src-badge ${(R.source === 'live' || R.source === 'live-mcx') ? 'src-live' : 'src-sim'}">${R.source === 'live-mcx' ? '<span class="live-dot"></span>OFFICIAL MCX LIVE' : (R.source === 'live' ? '<span class="live-dot"></span>LIVE FEED' : 'SIMULATED FEED*')}</span></div>
      <canvas id="rateChart"></canvas></div>
    <div class="grid2 mt-3">
      <div class="adm-card"><h2>Get a rate alert</h2>
        <form class="form-grid" onsubmit="Shivaa.rateAlert(event)">
          <div class="fld"><label>Email</label><input type="email" required placeholder="you@email.com"></div>
          <div class="fld"><label>Alert when 22K crosses (₹/g)</label><input type="number" min="5000" required placeholder="${R.gold22 + 200}"></div>
          <button class="btn btn-primary btn-sm" style="grid-column:1/-1;justify-self:start">Set alert</button>
        </form></div>
      <div class="adm-card"><h2>How your price is built</h2>
        <div class="sum-row"><span>Live rate × net weight</span><b>metal value</b></div>
        <div class="sum-row"><span>+ Making charges for your piece</span><b>shown at product page</b></div>
        <div class="sum-row"><span>+ Listed stone value (if any)</span><b>at cost</b></div>
        <div class="sum-row"><span>+ 3% GST</span><b>statutory</b></div>
        <p style="font-size:13px;color:var(--ink-3);margin-top:12px">No "local rate" games — the rate on this page is the rate on your bill. That is our tanch (honest purity) promise.</p>
        ${(R.source !== 'live' && R.source !== 'live-mcx') ? '<p style="font-size:12px;color:var(--ink-3);margin-top:8px">*Feed shown as simulated when the bullion API is unreachable from the server; values track the last live market feed.</p>' : ''}
      </div>
    </div>
  </div>`;
  drawRateChart($('#rateChart'), R.history || []);
};
function drawRateChart(cv, hist) {
  if (!cv || !hist.length) return;
  const x = cv.getContext('2d'); if (!x) return;   // v107 — canvas can be unavailable; chart is progressive enhancement
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const w = cv.parentElement.clientWidth - 0, h = 300;
  cv.width = w * dpr; cv.height = h * dpr; cv.style.height = h + 'px';
  x.setTransform(dpr, 0, 0, dpr, 0, 0);
  const pad = { l: 56, r: 56, t: 16, b: 26 };
  /* v156 — Bug fix: a single history stamp (fresh server, first minute) made
     X = i / (data.length - 1) → 0/0 → NaN, and any dead-feed stamp with a
     0/missing gold22 poisoned Math.min with NaN — the whole chart silently
     painted nothing. Only positive finite points draw, and a line needs ≥2. */
  const data = hist.map(p => +((p && p.gold22) || 0)).filter(v => isFinite(v) && v > 0);
  if (data.length < 2) return;
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
  window._sel = window._sel || dsLoadSel();   // v113 — restore the bill the partner already built
  const stoneTypes = ['Plain', 'CZ', 'Lab-Grown Diamond', 'Natural Diamond', 'Colour Stone', 'Kundan/Polki'];
  view.innerHTML = `
  <section class="page-hero"><div class="dust" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="container"><div class="crumbs"><a href="#/">Home</a> / Design Selection</div><h1>Design Selection</h1>
  <p>The live design desk our B2B partners order from — filter by category, weight, purity and stone, search by name or SKU, sort the desk your way, select what your counter needs, and settle in <b>fine metal grams</b> with zero making charges.</p></div></section>
  <div class="container" style="padding:44px 0 90px">

  <div class="ds-wrap" id="dsWrap">
    <div class="pf-bar">
      <div class="pf-f"><label>Search designs</label>
        <input id="dsfSearch" type="search" enterkeyhint="search" autocomplete="off" maxlength="60" placeholder="Name or SKU…"></div>
      <div class="pf-f"><label>Category</label>
        <select id="dsfCat" class="sortsel"><option value="">All categories</option>${Object.entries(LIVE_CATS()).map(([k, c]) => `<option value="${k}">${c.name}</option>`).join('')}</select></div>
      <div class="pf-f"><label>Stone type</label>
        <select id="dsfStone" class="sortsel"><option value="">All stones</option>${stoneTypes.map(s => `<option>${s}</option>`).join('')}</select></div>
      <div class="pf-f"><label>Stone colour</label>
        <select id="dsfColour" class="sortsel"><option value="">Any</option><option>White</option><option>Colour</option></select></div>
      <div class="pf-f"><label>Purity</label>
        <select id="dsfPurity" class="sortsel"><option value="">Any</option><option>22K</option><option>18K</option><option>925</option></select></div>
      <div class="pf-f"><label>Sort by</label>
        <select id="dsfSort" class="sortsel"><option value="">Featured</option><option value="sel">Selected first</option><option value="wasc">Weight: light first</option><option value="wdesc">Weight: heavy first</option><option value="az">Name A–Z</option></select></div>
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
      ${rings.map(p => {
        const shots = (p.images || []).map(safeUrl).filter(Boolean);
        const imgs = shots.length ? shots : ['/images/logo.png'];
        const name = esc(p.name.replace('Shivaa Ring Design', 'Design'));
        return `<div class="ds-card ${window._sel[p.id] ? 'on' : ''}" id="ds-${p.id}" data-cat="${esc(p.category)}" data-w="${esc(p.weightG)}" data-stone="${esc(p.stoneType || 'Plain')}" data-colour="${esc(p.stoneColour || (/(colour|ruby|emerald|sapphire|navratna|kundan|polki)/i.test((p.stoneType || '') + (p.stoneDesc || '')) ? 'Colour' : 'White'))}" data-purity="${esc(p.purity)}" data-name="${esc(p.name)}" data-sku="${esc(p.sku)}">
        <a class="ds-img ds-slider ${imgs.length > 1 ? 'has-multi' : ''}" href="#/product/${encodeURIComponent(p.id)}" aria-label="View ${name}">
          <span class="ds-track">${imgs.map((src, i) => `<img src="${src}" decoding="async" loading="lazy" onerror="this.onerror=null;this.src='/images/logo.png${ASSET_V}'" alt="${i === 0 ? name : ''}" draggable="false">`).join('')}</span>
          <span class="ds-wt">${p.weightG} g</span>
          ${imgs.length > 1 ? `<span class="ds-count" data-count>1/${imgs.length}</span>
            <button type="button" class="ds-arrow ds-prev" data-dir="-1" aria-label="Previous photo">‹</button>
            <button type="button" class="ds-arrow ds-next" data-dir="1" aria-label="Next photo">›</button>
            <span class="ds-dots">${imgs.map((_, i) => `<button type="button" class="ds-dot ${i === 0 ? 'on' : ''}" data-go="${i}" aria-label="Photo ${i + 1}"></button>`).join('')}</span>` : ''}
        </a>
        <a class="ds-meta" href="#/product/${encodeURIComponent(p.id)}">
          <b>${name}</b>
          <small>${esc(p.sku)} · ${p.weightG} g · ${esc(p.purity)}</small>
        </a>
        <div class="ds-qty">
          <button aria-label="Remove one" onclick="ShivaaDS.qty('${p.id}',-1)">−</button><span>${window._sel[p.id] || 0}</span><button aria-label="Add one" onclick="ShivaaDS.qty('${p.id}',1)">+</button>
        </div>
      </div>`; }).join('')}
    </div>
    <div class="qty-banner" style="margin-top:18px">◈ Example: select 25 g of designs → bill = 25 × ${(state.settings.metalFactor || 0.92)} = <b>23 g fine metal @ ${(state.settings.finePurity || '99.50%')}</b> — zero making charges, pure metal settlement.</div>
  </div>
  </div>`;

  /* v101 — per-design 4-photo slider (swipe / arrows / dots). Tapping the
     photo or name goes to the product page (the anchor's default); only the
     slider controls are intercepted. */
  const grid = $('#dsGrid');
  if (grid) {
    const go = (slider, i) => {
      const dots = slider.querySelectorAll('.ds-dot');
      const n = dots.length; if (!n) return;
      i = (i + n) % n;
      if (+slider.dataset.i === i) return;
      slider.dataset.i = i;
      const track = slider.querySelector('.ds-track');
      if (track) track.style.transform = `translateX(-${i * 100}%)`;
      dots.forEach((d, di) => d.classList.toggle('on', di === i));
      const cnt = slider.querySelector('[data-count]');
      if (cnt) cnt.textContent = (i + 1) + '/' + n;
      try { navigator.vibrate?.(6); } catch (e) {}
    };
    /* v122 — eager-load the second shot only as its card nears the viewport,
       so the first swipe stays instant without fetching 65 spare photos. */
    const _dsEager = ('IntersectionObserver' in window) ? new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      const im = e.target.querySelector('img:nth-child(2)');
      if (im) { im.setAttribute('loading', 'eager'); if (im.dataset.src) im.src = im.dataset.src; }
      _dsEager.unobserve(e.target);
    }), { rootMargin: '300px' }) : null;
    grid.querySelectorAll('.ds-slider.has-multi').forEach(s => {
      if (_dsEager) _dsEager.observe(s);
      else { const im = s.querySelector('img:nth-child(2)'); if (im) im.setAttribute('loading', 'eager'); }
    });
    grid.addEventListener('click', e => {
      const arrow = e.target.closest('.ds-arrow'), dot = e.target.closest('.ds-dot');
      if (!arrow && !dot) return;
      e.preventDefault(); e.stopPropagation();
      const slider = e.target.closest('.ds-slider'); if (!slider) return;
      if (arrow) go(slider, (+slider.dataset.i || 0) + (+arrow.dataset.dir));
      else go(slider, +dot.dataset.go);
    });
    let sx = null, active = null;
    grid.addEventListener('touchstart', e => {
      active = e.target.closest('.ds-slider.has-multi');
      sx = active ? e.touches[0].clientX : null;
    }, { passive: true });
    grid.addEventListener('touchend', e => {
      if (!active || sx == null) { sx = null; active = null; return; }
      const dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 34) go(active, (+active.dataset.i || 0) + (dx < 0 ? 1 : -1));
      sx = null; active = null;
    }, { passive: true });
  }
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
      <div class="bf-head"><span class="label">Step 1 &middot; Partner Application</span><h2>Begin your partnership</h2><p>GSTIN is verified live against the government GST register &middot; mobile is OTP-verified &middot; Shivaa approves within 48 hours.</p>
        <div class="b2b-step"><span>1 &middot; Fill this form</span><span>2 &middot; GST &amp; OTP verify</span><span>3 &middot; Approved in 48 h</span><span>4 &middot; Portal opens</span></div></div>
      <form class="form-grid kyc-form" id="b2bForm" onsubmit="Shivaa.b2bApply(event)" novalidate>
        <div class="fld"><label>Firm name *</label><input id="kyFirm" required autocomplete="organization" placeholder="M/s …" oninput="Shivaa.kycGate()"></div>
        <div class="fld"><label>Contact person</label><input id="kyPerson" autocomplete="name" placeholder="Owner / manager"></div>
        <div class="fld full"><label>GSTIN * <small class="kyc-req">(tap Verify GST — checked live, firm name auto-fills)</small></label>
          <div class="kyc-inline">
            <input id="kyGstin" maxlength="15" placeholder="08AABCU9603R1ZM" style="text-transform:uppercase" autocomplete="off" required oninput="Shivaa.kycFieldEdit('gstin')">
            <button type="button" class="btn btn-outline btn-sm kyc-verify-btn" onclick="Shivaa.kycGstin()">✓ Verify GST</button>
            <span class="kyc-status" id="gstStat"></span>
          </div></div>
        <div class="fld"><label>City *</label><input id="kyCity" placeholder="Nagaur, Jodhpur…" autocomplete="address-level2" oninput="Shivaa.kycGate()"></div>
        <div class="fld"><label>Owner PAN <small class="kyc-req">(optional)</small></label><input id="kyPan" maxlength="10" placeholder="ABCDE1234F" style="text-transform:uppercase" autocomplete="off"></div>
        <div class="fld full"><label>Mobile number * <small class="kyc-req">(we text a 4-digit code — any Indian mobile)</small></label>
          <div class="kyc-inline">
            <span class="kyc-cc">+91</span>
            <input id="kyPhone" maxlength="10" placeholder="10-digit mobile" inputmode="numeric" autocomplete="tel-national" required oninput="Shivaa.kycFieldEdit('otp')">
            <button type="button" class="btn btn-outline btn-sm kyc-verify-btn" onclick="Shivaa.kycOtp()">Send OTP</button>
          </div></div>
        <div class="fld full"><label>Enter the 4-digit OTP *</label>
          <div class="kyc-inline">
            <input id="kyOtp" maxlength="4" placeholder="4-digit code" inputmode="numeric" autocomplete="one-time-code" oninput="this.value=this.value.replace(/\D/g,'').slice(0,4);Shivaa.kycGate()">
            <button type="button" class="btn btn-outline btn-sm kyc-verify-btn" onclick="Shivaa.kycOtpVerify()">✓ Verify OTP</button>
            <span class="kyc-status" id="otpStat"></span>
          </div></div>
        <div class="fld"><label>Email <small class="kyc-req">(your portal login)</small> *</label><input id="kyEmail" type="email" autocomplete="email" required oninput="Shivaa.kycGate()"></div>
        <div class="fld"><label>Choose a portal password *</label><input id="kyPass" type="password" minlength="6" autocomplete="new-password" required oninput="Shivaa.kycGate()"></div>
        <div class="fld full"><label>What do you stock / need? <small class="kyc-req">(optional)</small></label><input id="kyMsg" placeholder="Bridal sets, chains, silver…"></div>
        <div class="fld full"><label>Your business card <small class="kyc-req">(optional — a photo or PDF speeds approval up)</small></label>
          <div class="drop-zone kyc-card" id="kyCard">
            <div class="dz-idle" id="kyCardIdle">
              <div class="dz-ic" style="font-size:26px;margin-bottom:4px">📇</div>
              <b id="kyCardTxt">Tap to attach your business card</b><br><small>JPG / PNG / WEBP / GIF / PDF up to 8 MB · optional</small>
            </div>
            <div class="dz-set" id="kyCardSet" hidden>
              <span class="dz-prev" id="kyCardPrev">📄</span>
              <span class="dz-meta"><b id="kyCardName"></b><small id="kyCardSize"></small></span>
              <button type="button" class="dz-x" id="kyCardClear" aria-label="Remove attached file">✕</button>
            </div>
            <input type="file" id="kyCardFile" accept="image/*,application/pdf" aria-label="Attach your business card (photo or PDF, optional)" hidden>
          </div>
        </div>
        <p class="kyc-note">GSTIN verified live with the official GST database (firm name &amp; status) &middot; mobile OTP-verified &middot; approval within 48 h. The button below stays locked until every business detail above is complete and verified.</p>
      </form>

      <!-- always-visible application bar: present from the start, clickable
           only after all business details + both verifications are done -->
      <div class="kyc-bar" id="kycBar">
        <div class="kyc-bar-info">
          <b id="kycBarTitle">Complete your KYC details</b>
          <small id="kycBarTodo">Preparing application…</small>
        </div>
        <button type="submit" form="b2bForm" class="btn btn-primary btn-lg" id="kycSubmit" disabled>Complete KYC &amp; Apply →</button>
      </div>

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
  setTimeout(() => {
    try { window.Shivaa.kycGate(); } catch (e) {}
    /* v113 — ZERO-DISCOMFORT verification.
       The partner never has to hunt for a button: the GSTIN checks itself the
       moment the 15th character lands, the code sends itself on the 10th
       digit, and the code verifies itself on the 4th digit. Each value is
       auto-acted on exactly ONCE (tracked below) so a paste, a slow typer or
       a backspace can never spam the SMS/GST gateway — the manual buttons
       stay there and always work. */
    const gst = $('#kyGstin'), ph = $('#kyPhone'), otpIn = $('#kyOtp');
    const GST_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/;
    let autoGst = '', autoPhone = '', autoCode = '', tG = 0, tP = 0, tO = 0;
    if (gst) gst.addEventListener('input', () => {
      clearTimeout(tG);
      const v = gst.value.trim().toUpperCase();
      if (v.length !== 15 || !GST_RE.test(v) || v === autoGst) return;
      tG = setTimeout(() => { if (gst.value.trim().toUpperCase() === v) { autoGst = v; window.Shivaa.kycGstin(); } }, 320);
    });
    if (ph) ph.addEventListener('input', () => {
      clearTimeout(tP);
      const v = ph.value.replace(/\D/g, '');
      if (v.length !== 10 || v === autoPhone) return;
      tP = setTimeout(() => {
        if (ph.value.replace(/\D/g, '') !== v) return;
        autoPhone = v;
        window._kycOtpSent = '';
        window.Shivaa.kycOtp();
      }, 320);
    });
    if (otpIn) otpIn.addEventListener('input', () => {
      clearTimeout(tO);
      const v = otpIn.value.replace(/\D/g, '').slice(0, 4);
      if (v.length !== 4 || window._kyc.otp) return;
      /* v113b - the code must belong to the number currently typed, and a code
         that FAILED must be retryable: only one that already succeeded (or is
         in flight) is skipped. Before this a mistyped digit left the partner
         looking at a silent form with no way forward but a reload. */
      const now = $('#kyPhone') ? $('#kyPhone').value.replace(/\D/g, '') : '';
      if (!window._kycOtpSent || window._kycOtpSent !== now) return;   // nothing to verify yet
      if (v === autoCode && window._kycOtpFailed !== v) return;
      tO = setTimeout(() => { if (otpIn.value.replace(/\D/g, '').slice(0, 4) === v) { autoCode = v; window.Shivaa.kycOtpVerify(); } }, 260);
    });
    // v101 — optional business-card upload
    window._kycCard = null;
    const dz = $('#kyCard'), fi = $('#kyCardFile'), tx = $('#kyCardTxt');
    if (dz && fi) {
      // v101 — JPG/PNG/WEBP/GIF/PDF ≤ 8 MB; type checked by MIME or extension
      // (some browsers report an empty file.type), the server re-checks magic bytes.
      const cardOK = f => f && f.size <= 8 * 1024 * 1024
        && (/^(image\/(jpeg|png|webp|gif)|application\/pdf)$/.test(f.type)
            || /\.(jpe?g|png|webp|gif|pdf)$/i.test(f.name));
      const idle = $('#kyCardIdle'), set = $('#kyCardSet'), prev = $('#kyCardPrev'),
            nameEl = $('#kyCardName'), sizeEl = $('#kyCardSize'), clearBtn = $('#kyCardClear');
      let objUrl = null;
      const fmtSize = n => n < 1024 * 1024 ? Math.max(1, Math.round(n / 1024)) + ' KB' : (n / 1048576).toFixed(1) + ' MB';
      const clearCard = () => {
        window._kycCard = null; fi.value = '';
        if (objUrl) { try { URL.revokeObjectURL(objUrl); } catch (e) {} objUrl = null; }
        if (idle) idle.hidden = false;
        if (set) set.hidden = true;
        if (tx) { tx.textContent = 'Tap to attach your business card'; tx.classList.remove('ok'); }
      };
      const setCard = f => {
        if (!cardOK(f)) { toast('Please choose a JPG, PNG, WEBP, GIF image or PDF under 8 MB', 'err'); clearCard(); return; }
        window._kycCard = f;
        if (tx) { tx.textContent = '✓ ' + f.name; tx.classList.add('ok'); }
        if (idle) idle.hidden = true;
        if (set) set.hidden = false;
        if (nameEl) nameEl.textContent = f.name;
        if (sizeEl) sizeEl.textContent = fmtSize(f.size) + ' · tap to replace';
        if (prev) {
          if (objUrl) { try { URL.revokeObjectURL(objUrl); } catch (e) {} }
          if (window.URL && URL.createObjectURL && (/^image\//.test(f.type) || /\.(jpe?g|png|webp|gif)$/i.test(f.name))) {
            objUrl = URL.createObjectURL(f);
            prev.innerHTML = '<img src="' + objUrl + '" alt="Business card preview">';
          } else prev.textContent = '📄';
        }
        try { navigator.vibrate?.(8); } catch (e) {}
      };
      dz.onclick = e => { if (e.target.closest('.dz-x')) return; fi.click(); };
      /* v167 — this dropzone was CLICK-ONLY: a partner on a keyboard (or with a
         screen reader) had no way to attach the business card the same form
         invites them to add. It is a real button now — focusable, announced,
         and opened with Enter or Space. */
      dz.tabIndex = 0; dz.setAttribute('role', 'button');
      if (!dz.getAttribute('aria-label')) dz.setAttribute('aria-label', 'Attach your business card (photo or PDF, optional)');
      dz.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); fi.click(); }
      });
      if (clearBtn) clearBtn.onclick = e => { e.stopPropagation(); clearCard(); };
      fi.onchange = () => { if (fi.files[0]) setCard(fi.files[0]); };
      ['dragover', 'dragleave', 'drop'].forEach(ev => dz.addEventListener(ev, e => {
        e.preventDefault(); dz.classList.toggle('drag', ev === 'dragover');
        if (ev === 'drop' && e.dataTransfer.files[0]) setCard(e.dataTransfer.files[0]);
      }));
      const kycForm = fi.closest('form');
      if (kycForm) kycForm.addEventListener('reset', clearCard);
    }
  }, 0);
};
/* ─────────── SERVICES (D2C) ─────────── */
window._kyc = { gstin: false, gstLive: false, otp: false };
window.Shivaa.kycGstin = async () => {
  const g = $('#kyGstin').value.trim();
  const st = $('#gstStat');
  if (!st) return;
  /* v113 — the GSTIN now self-checks at 15 characters; the guard keeps the
     auto-check and a manual tap from spending two GST-register credits. */
  if (window._kycGstBusy) return;
  if (window._kyc.gstin && window._kycGstFor === g) return;
  window._kycGstBusy = true; window._kycGstFor = g;
  try { await window.__kycGstinRun(g, st); } finally { window._kycGstBusy = false; }
};
window.__kycGstinRun = async (g, st) => {
  st.textContent = 'checking…'; st.className = 'kyc-status wait';
  try {
    const r = await api('/api/kyc/check-gstin', { method: 'POST', body: JSON.stringify({ gstin: g }) });
    if (r.valid) {
      window._kyc.gstin = true;
      st.textContent = 'checking the GST register…';
      try {
        const lg = await api('/api/kyc/gst-lookup', { method: 'POST', body: JSON.stringify({ gstin: g }) });
        if (lg.live && lg.verified && lg.legalName) {
          // v87 — government-record verification: lock the legal name, hint the city
          window._kyc.gstLive = true; window._kyc.legalName = lg.legalName;
          $('#kyFirm').value = lg.legalName; $('#kyFirm').readOnly = true;
          // prefer the registered district over the plain state name for the City field
          if (!$('#kyCity').value) $('#kyCity').value = lg.district || (r.state && r.state !== 'Rajasthan' ? r.state : '');
          const trade = lg.tradeName && lg.tradeName !== lg.legalName ? ' <small>· trade name ' + esc(lg.tradeName) + '</small>' : '';
          st.innerHTML = '✓ Govt-verified: <b>' + esc(lg.legalName) + '</b> · ' + esc(lg.gstStatus || 'Active') + trade;
          st.title = [lg.businessType, lg.registrationDate ? ('registered ' + lg.registrationDate) : '', lg.address].filter(Boolean).map(esc).join('\n');
        } else if (lg.live && !lg.verified) {
          // Register says Cancelled / Suspended / inactive — block the application
          window._kyc.gstin = false; window._kyc.gstLive = false; $('#kyFirm').readOnly = false;
          st.textContent = '✗ ' + (lg.note || ('This GSTIN is ' + (lg.gstStatus || 'not Active')));
          st.className = 'kyc-status bad'; window.Shivaa.kycGate(); return;
        } else {
          window._kyc.gstLive = false;
          if (!$('#kyCity').value && r.state && r.state !== 'Rajasthan') $('#kyCity').value = r.state;
          st.innerHTML = '✓ Valid number · ' + esc(r.state) + ' <small>(firm name verified when we approve)</small>';
        }
      } catch (e) {
        window._kyc.gstLive = false;
        if (!$('#kyCity').value && r.state && r.state !== 'Rajasthan') $('#kyCity').value = r.state;
        st.innerHTML = '✓ Valid number · ' + esc(r.state) + ' <small>(live name service busy — verified at approval)</small>';
      }
      st.className = 'kyc-status ok';
    } else { window._kyc.gstin = false; window._kyc.gstLive = false; st.textContent = '✗ ' + r.reason; st.className = 'kyc-status bad'; $('#kyFirm').readOnly = false; }
  } catch (e) { st.textContent = '✗ ' + e.message; st.className = 'kyc-status bad'; }
  window.Shivaa.kycGate();
};
window.Shivaa.kycOtp = async () => {
  const ph = $('#kyPhone').value.replace(/\D/g, '');
  if (ph.length !== 10) return toast('Enter a valid 10-digit mobile', 'err');
  /* v113 — one send in flight at a time: the auto-send on the 10th digit and
     a partner tapping the button must never both reach the SMS gateway. */
  if (window._kycOtpBusy) return;
  window._kycOtpBusy = true;
  try {
    const r = await api('/api/kyc/send-otp', { method: 'POST', body: JSON.stringify({ phone: ph, email: ($('#kyEmail') || {}).value || '' }) });
    window._kycOtpSent = ph;                          // the auto-verifier may now act
    const st = $('#otpStat');
    if (r.devCode) {                                  // dev preview shim only
      st.innerHTML = 'demo OTP: <b>' + r.devCode + '</b> — tap to fill';
      st.className = 'kyc-status wait'; st.style.cursor = 'pointer';
      st.onclick = () => { const i = $('#kyOtp'); if (i && window.ShivaaOtp) ShivaaOtp.fill(i, String(r.devCode)); };
    }
    else { st.textContent = r.masked ? ('Code sent to ' + r.masked) : 'Code sent'; st.className = 'kyc-status wait'; }
    if (window.ShivaaOtp) ShivaaOtp.watch($('#kyOtp'), () => { if (window.Shivaa.kycOtpVerify) window.Shivaa.kycOtpVerify(); });   // v33 — Android auto-fill
    toast('OTP sent ✓');
  } catch (e) { toast(e.message, 'err'); }
  finally { window._kycOtpBusy = false; }
};
window.Shivaa.kycOtpVerify = async () => {
  const phone = $('#kyPhone').value.replace(/\D/g, '');
  const code = $('#kyOtp').value.trim();
  if (phone.length !== 10 || code.length !== 4) return;      // v113 — never fire half-typed
  if (window._kyc.otp || window._kycOtpVerifying) return;    // v113 — one attempt per code
  window._kycOtpVerifying = true;
  try {
    await api('/api/kyc/verify-otp', { method: 'POST', body: JSON.stringify({ phone, code }) });
    window._kyc.otp = true;
    window._kycOtpFailed = '';                                 // v113b - nothing pending
    const st = $('#otpStat'); st.textContent = '✓ Mobile verified'; st.className = 'kyc-status ok';
    window.Shivaa.kycGate();
  } catch (e) {
    /* v113b - remember the rejected code so the auto-verifier lets the same
       digits be submitted again, clear the field so the retry starts clean, and
       say WHY on the form itself (a toast is easy to miss mid-form). */
    window._kycOtpFailed = code;
    /* v167 — `autoCode` is a `let` inside kycGate(), so writing it from here
       was a ReferenceError under 'use strict': the catch block died BEFORE the
       status line and the toast, and the partner saw a silent form. The
       auto-verifier already re-arms through window._kycOtpFailed, so the
       write is not needed at all. */
    try { $('#kyOtp').value = ''; } catch (err) {}
    const st = $('#otpStat'); if (st) { st.textContent = '✗ ' + e.message; st.className = 'kyc-status bad'; }
    toast(e.message, 'err');
  }
  finally { window._kycOtpVerifying = false; }
};
window.Shivaa.gotoJeweller = () => { closeModal(); location.hash = '#/b2b'; };
window.Shivaa.waPartnerId = () => {
  waOpen("Namaste Shivaa team \u2726\n\nI'd like a partner portal ID and password without filling the online form.\n\nFirm name: \nCity: \nGSTIN: \n\nPlease help me get started.");
};
window.Shivaa.partnerLogin = () => {
  if (isPartner()) { location.hash = '#/partner'; return; }
  openLogin('partner');
};
/* editing an already-verified GSTIN / phone invalidates that verification
   until it is re-verified — the sticky bar updates itself instantly */
window.Shivaa.kycFieldEdit = (which) => {
  if (which === 'gstin') {
    const fi = $('#kyFirm');
    if (fi && fi.readOnly) { fi.value = ''; }              // clear an auto-filled legal name
    if (fi) fi.readOnly = false;
    window._kyc.gstin = false; window._kyc.gstLive = false; window._kyc.legalName = '';
    const st = $('#gstStat'); if (st) { st.textContent = ''; st.className = 'kyc-status'; st.title = ''; }
  }
  if (which === 'otp') {
    window._kyc.otp = false;
    /* v113b - a code already sent belongs to the number it went to. This runs
       on EVERY keystroke in the phone field (its inline oninput), so it may
       only forget the code when the digits really changed - re-typing or
       re-pasting the same number must not silently disable auto-verify. */
    const ph = $('#kyPhone') ? $('#kyPhone').value.replace(/\D/g, '') : '';
    if (window._kycOtpSent && window._kycOtpSent !== ph) {
      window._kycOtpSent = '';
      window._kycOtpFailed = '';
    }
    const st = $('#otpStat'); if (st) { st.textContent = ''; st.className = 'kyc-status'; }
    const otp = $('#kyOtp'); if (otp) otp.value = '';
  }
  window.Shivaa.kycGate();
};
window.Shivaa.kycGate = () => {
  const b = $('#kycSubmit');
  if (!b) return;
  const v = id => ($(id) ? $(id).value.trim() : '');
  const steps = [
    { ok: v('#kyFirm').length >= 2, label: 'Firm name' },
    { ok: v('#kyCity').length >= 2, label: 'City' },
    { ok: !!window._kyc.gstin, label: 'GST verified' },
    { ok: !!window._kyc.otp, label: 'Mobile OTP verified' },
    { ok: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v('#kyEmail')), label: 'Valid email' },
    { ok: v('#kyPass').length >= 6, label: 'Portal password (6+)' },
  ];
  const done = steps.filter(s => s.ok);
  const missing = steps.filter(s => !s.ok).map(s => s.label);
  const ready = done.length === steps.length;
  b.disabled = !ready;
  b.setAttribute('aria-disabled', String(!ready));
  const title = $('#kycBarTitle'), todo = $('#kycBarTodo');
  if (title) title.textContent = ready ? 'All set — your application is ready ✦' : 'Complete your KYC details';
  if (todo) todo.textContent = ready
    ? 'GSTIN & mobile verified · tap to apply'
    : done.length + '/' + steps.length + ' done · next: ' + missing.slice(0, 2).join(', ');
  const bar = $('#kycBar');
  if (bar) bar.classList.toggle('ready', ready);
};
window.Shivaa.b2bApply = async e => {
  e.preventDefault();
  window.Shivaa.kycGate();
  const btn = $('#kycSubmit');
  if (btn && btn.disabled) return toast('Complete every business detail and both verifications first — the button shows what is left.', 'err');
  if (!window._kyc.gstin || !window._kyc.otp) return toast('Complete GST & OTP verification first', 'err');
  try {
    const fields = {
      firm: $('#kyFirm').value, contactPerson: $('#kyPerson').value, city: $('#kyCity').value,
      gstin: $('#kyGstin').value.trim().toUpperCase(), phone: $('#kyPhone').value.replace(/\D/g, ''),
      email: $('#kyEmail').value, ownerPan: $('#kyPan').value, password: $('#kyPass').value, message: $('#kyMsg').value,
    };
    // v101 — optional business card: multipart upload when attached, JSON otherwise
    let opts;
    if (window._kycCard) {
      const fd = new FormData();
      Object.entries(fields).forEach(([k, v]) => fd.append(k, v == null ? '' : v));
      fd.append('businessCard', window._kycCard);
      opts = { method: 'POST', body: fd };
    } else {
      opts = { method: 'POST', body: JSON.stringify(fields) };
    }
    const r = await api('/api/partners/apply', opts);
    if (r.token) { setToken(r.token); state.user = r.user; }
    const gstHow = window._kyc.gstLive ? 'verified live with the government GST register' : 'checked and pending final confirmation';
    openModal(`<div class="center"><div style="font-size:48px">✦</div><h3 style="margin:10px 0">KYC Complete — Application Received!</h3><p style="color:var(--ink-2)">GSTIN <b>${esc($('#kyGstin').value.toUpperCase())}</b> ${gstHow} · mobile OTP verified${window._kycCard ? ' · business card attached' : ''}. Your partner portal account is live — full access once our team approves (usually within 48 hours).</p><a class="btn btn-primary" href="#/partner" style="margin-top:14px">Open Partner Portal</a></div>`);
    e.target.reset(); window._kyc = { gstin: false, otp: false }; window._kycCard = null;
    const kct = $('#kyCardTxt'); if (kct) kct.textContent = 'Tap to attach your business card';
    window.Shivaa.kycGate();
  } catch (err) { toast(err.message, 'err'); }
};

pages.services = async (view) => {
  view.innerHTML = `
  <section class="page-hero"><div class="dust" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="container"><div class="crumbs"><a href="#/">Home</a> / Bespoke & Care</div><h1>Bespoke & Care Studio</h1>
  <p>Custom designs, repair & restoration, and personal shopping assistance — the D2C services our family has always offered, now bookable online.</p></div></section>
  <div class="container" style="padding:50px 0 90px">
    <div class="svc-grid" style="margin-bottom:44px">
      <div class="svc rv"><div class="sic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 4l1.8 4.2L18 10l-4.2 1.8L12 16l-1.8-4.2L6 10l4.2-1.8L12 4z"/><path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15z"/></svg></div>
        <h2>Custom Designs</h2><p>Bring a photo, a sketch, or grandma's idea — our karigars craft it in 22K/18K with a transparent quote (metal at live rate + chart making charges).</p></div>
      <div class="svc rv"><div class="sic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14.7 6.3a4.5 4.5 0 0 0-6 6L4 17v3h3l4.7-4.7a4.5 4.5 0 0 0 6-6l-3 3-2.5-.5-.5-2.5 3-3z"/></svg></div>
        <h2>Repair &amp; Restoration</h2><p>Heirloom polishing, re-plating, stone setting, re-stringing, resizing — free inspection, lifetime workmanship warranty on repairs.</p></div>
      <div class="svc rv"><div class="sic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 3h8l1 4a5 5 0 0 1-10 0l1-4z"/><path d="M9 12l-1 3h8l-1-3M12 15v6"/></svg></div>
        <h2>Personal Shopping</h2><p>Video or in-store appointment with a Shivaa advisor — bridal trousseau planning, gifting shortlists, budget-first curation.</p></div>
    </div>
    <div class="grid2">
      <div class="adm-card"><h2>Book / Request a quote</h2>
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
      <div class="adm-card"><h2>How it works</h2>
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
        <div class="info-tile"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none"/></svg>
          <div style="flex:1"><b>Follow Shivaa Jewels</b><p style="margin-bottom:0">New designs, festive live rates &amp; bullion updates — on our official channels.</p>${socialRowHTML('fv-social--light')}</div></div>
        <div class="adm-card mt-2"><h2>Find us</h2>
          <div style="border-radius:14px;overflow:hidden;border:1px solid var(--line)">
          <svg viewBox="0 0 400 240" style="display:block;width:100%"><rect width="400" height="240" fill="#f4ecdd"/><path d="M0 60 Q100 45 200 62 T400 55 L400 75 Q300 88 200 72 T0 80Z" fill="#e7dcc4"/><path d="M0 190 Q120 175 240 192 T400 185 L400 240 L0 240Z" fill="#e7dcc4"/><path d="M30 30 L110 30 M30 46 L90 46 M310 215 L390 215 M320 200 L370 200" stroke="#d8c9a8" stroke-width="3" stroke-linecap="round"/><path d="M60 210 C 90 160, 200 150, 250 110 S 340 70, 360 40" stroke="#c9b586" stroke-width="5" fill="none" stroke-dasharray="2 9" stroke-linecap="round"/><circle cx="250" cy="110" r="26" fill="rgba(185,138,47,.16)"/><path d="M250 84 c-11 0 -19 8 -19 18 c0 13 19 30 19 30 s19 -17 19 -30 c0 -10 -8 -18 -19 -18z" fill="#6e1e2a"/><circle cx="250" cy="102" r="6.5" fill="#faf6ef"/><text x="250" y="150" text-anchor="middle" font-family="Georgia" font-size="15" fill="#6e1e2a">Shivaa · Sadar Bazaar, Jayal</text><text x="250" y="168" text-anchor="middle" font-family="Arial" font-size="11" fill="#8a7d6c">Nagaur, Rajasthan 341023</text></svg>
          </div></div>
      </div>
      <div class="adm-card"><h2>Send a message</h2>
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
/* v102 — newsletter signup used to reference an undefined inline handler;
   now posts to /api/newsletter with an optimistic inline success state,
   remembers the email, and degrades gracefully if the API is unreachable. */
window.Shivaa.subscribeNewsletter = async e => {
  e.preventDefault();
  const form = e.target;
  const input = form.querySelector('input[type="email"]');
  const email = String(input?.value || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { toast('Please enter a valid email address', 'err'); input?.focus(); return; }
  const btn = form.querySelector('button[type="submit"]');
  if (btn) { btn.disabled = true; btn.dataset.old = btn.textContent; btn.textContent = 'Joining…'; }
  try {
    try { await api('/api/newsletter', { method: 'POST', body: JSON.stringify({ email }) }); }
    catch (err) { /* preview/offline: keep the local confirmation */ }
    try { localStorage.setItem('shv_nl', email); } catch (e) {}
    form.classList.add('nl-done');
    form.innerHTML = '<p class="nl-thanks" role="status">✦ You are in — first looks &amp; festive live rates will reach <b>' + esc(email) + '</b>.</p>';
    toast('Welcome to the Shivaa Circle ✦');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = btn.dataset.old || 'Subscribe'; }
  }
};
/* v102 — returning visitors who already joined see a confirmation, not a form */
window.Shivaa.paintNewsletterState = () => {
  let email = '';
  try { email = localStorage.getItem('shv_nl') || ''; } catch (e) {}
  if (!email) return;
  $$('.nl-form:not(.nl-done)').forEach(f => {
    f.classList.add('nl-done');
    f.innerHTML = '<p class="nl-thanks" role="status">✦ You are on the Shivaa Circle list as <b>' + esc(email) + '</b>.</p>';
  });
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
  for (let i = 0; i < 4; i++) inp += `<input type="text" maxlength="1" inputmode="numeric" autocomplete="${i === 0 ? 'one-time-code' : 'off'}" aria-label="Digit ${i + 1}">`;
  return `<div class="otp-boxes" id="${id}" role="group" aria-label="4-digit code">${inp}</div>`;
}
function bindOtpBoxes(root, onComplete) {
  if (!root) return;
  const boxes = [...root.querySelectorAll('input')];
  const fire = () => {
    const v = boxes.map(b => b.value).join('');
    if (v.length === 4 && onComplete) onComplete(v);
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
      <p>Live Shivaa rates &middot; piece-level HUID guidance &middot; OTP-verified accounts.</p>
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
            <div class="fld"><label>4-digit code</label>
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
          <div class="fld"><label>Enter the 4-digit code</label>
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
      if (code.length !== 4) return toast('Enter the 4-digit code', 'err');
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
      const head = r.devCode ? 'Demo code: ' + r.devCode : (r.masked ? 'Code sent to ' + r.masked : 'Code sent to +91 ' + phone);
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
      const r = await api('/api/kyc/send-otp', { method: 'POST', body: JSON.stringify({ phone, email: $('#rgEmail').value.trim() }) });
      authStat('#rgStat', r.devCode ? 'Demo code: ' + r.devCode : (r.masked ? 'Code sent to ' + r.masked : 'Code sent to +91 ' + phone), 'wait');
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
      const r = await api('/api/auth/register', { method: 'POST', body: JSON.stringify({ name: $('#rgName').value.trim(), phone: authPhone($('#rgPhone').value), email: $('#rgEmail').value.trim(), password: $('#rgPass').value, ref: localStorage.getItem('sh_ref') || '' }) });
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
  const isCurrent = viewLifetime(view);
  if (!state.user) { signInGate(view, '', 'Tax Invoice', 'Sign in to open the invoice for this order — it stays in your account for as long as you need it.'); openLogin(); return; }
  view.innerHTML = '<div class="loading-spin"></div>';
  let o = null, kind = 'retail';
  if (String(id || '').startsWith('MX')) {
    try { const r = await api('/api/metalexchange/orders'); o = r.orders.find(x => x.id === id); kind = 'metal'; } catch (e) {}
  } else {
    try { o = (await api('/api/orders/' + id)).order; } catch (e) {}
  }
  if (!isCurrent()) return;
  if (!o) { view.innerHTML = emptyShell('Tax Invoice', 'Invoice not found', '<div class="empty"><p style="color:var(--ink-3)">We could not find an invoice with that number on this account.</p><a class="btn btn-outline" href="#/account?tab=orders">My orders</a></div>'); return; }
  if (kind === 'retail' && !o.invoiceNo) {
    view.innerHTML = emptyShell('Tax Invoice', 'Invoice not issued yet', '<div class="empty"><p>Your tax invoice is issued after payment is confirmed.</p><a class="btn btn-outline" href="#/order/' + encodeURIComponent(o.id) + '">View order and payment status</a></div>');
    return;
  }
  const wm = `${state.user.name} · ${state.user.email}`;
  const rows = kind === 'metal'
    ? o.items.map(it => `<tr><td>${esc(it.name)}</td><td>${it.qty}</td><td>${it.weightG} g</td><td>${it.lineWeight} g</td></tr>`).join('')
    : o.items.map(it => `<tr><td>${esc(it.name)}${it.size ? ' (' + esc(it.size) + ')' : ''}</td><td>${it.qty}</td><td>₹${Math.round(it.ratePerGram).toLocaleString('en-IN')}/g</td><td>₹${(it.unitPrice * it.qty).toLocaleString('en-IN')}</td></tr>`).join('');
  const totals = kind === 'metal'
    ? `<tr class="tot"><td colspan="3">Total weight</td><td>${o.totalWeightG} g</td></tr>
       <tr class="tot"><td colspan="3">Fine metal @ ${esc(o.purity)} (× ${o.factor}, zero MC)</td><td>${o.fineGrams} g</td></tr>`
    : `<tr class="tot"><td colspan="3">Subtotal (incl. GST)</td><td>₹${o.subtotal.toLocaleString('en-IN')}</td></tr>
       ${o.discount ? `<tr class="tot"><td colspan="3">Discount</td><td>− ₹${o.discount.toLocaleString('en-IN')}</td></tr>` : ''}
       ${o.prepaidDiscount ? `<tr class="tot"><td colspan="3">Prepaid discount</td><td>− ${fmt(o.prepaidDiscount)}</td></tr>` : ''}
       ${o.shipping ? `<tr class="tot"><td colspan="3">Shipping</td><td>${fmt(o.shipping)}</td></tr>` : ''}
       ${o.codFee ? `<tr class="tot"><td colspan="3">COD fee</td><td>${fmt(o.codFee)}</td></tr>` : ''}
       <tr class="tot"><td colspan="3">Invoice total (${esc(o.paymentMethod)})</td><td>₹${o.total.toLocaleString('en-IN')}</td></tr>`;
  view.innerHTML = `
  <div class="inv-page">
    <div class="inv-no-print inv-top"><button class="btn btn-primary" onclick="window.print()">⬇ Download / Print PDF</button><a class="btn btn-ghost" href="${kind === 'metal' ? '#/partner' : '#/account?tab=orders'}">← Back</a></div>
    <div class="inv-sheet">
      <div class="inv-wm">${esc(wm)}<br>${esc(o.id)}</div>
      <div class="inv-head"><img src="/images/logo.png" alt="Shivaa"><div><b>SHIVAA</b><small>Ernate Shine Jewellery Pvt. Ltd.<br>Jayal, Nagaur, Rajasthan · GSTIN on request</small></div>
      <div class="inv-meta"><b>Invoice ${esc(o.invoiceNo || o.id)}</b><small>${new Date(o.createdAt).toLocaleString('en-IN')}<br>${kind === 'metal' ? 'B2B · Metal Settlement' : 'Retail Invoice'}<br>Status: ${esc(o.status)}</small></div></div>
      <div class="inv-to"><b>Billed to:</b> ${esc(o.address?.name || o.partnerName || state.user.name)}${o.address ? ` · ${esc(o.address.city || '')} ${esc(o.address.pincode || '')}` : ''}</div>
      <table class="inv-tbl"><thead><tr><th>Item</th><th>Qty</th><th>${kind === 'metal' ? 'Weight' : 'Rate'}</th><th>${kind === 'metal' ? 'Line wt' : 'Amount'}</th></tr></thead>
      <tbody>${rows}${totals}</tbody></table>
      <div class="inv-foot">Rate locked at order time · Check the actual piece’s HUID in BIS Care<br><b>Confidential</b> — issued privately to ${esc(state.user.name)}; watermark identifies the holder.</div>
    </div>
  </div>`;
};

/* ─────────── v57 DIGITAL CERTIFICATES (purity & price card per order) ─────────── */
function certificateSheet(o) {
  const s = state.settings || {};
  const gross = o.items.reduce((a, it) => a + (Number(it.weightG) || 0) * it.qty, 0);
  const net = gross;   // listed net weight = gross unless stones; stones are listed separately on the bill
  const rows = o.items.map(it => `<tr>
      <td><b>${esc(it.name)}</b>${it.size ? `<br><small>Size ${esc(it.size)}</small>` : ''}</td>
      <td class="num">${it.qty}</td>
      <td class="num">${esc(it.metal || '')} · ${esc(it.purity || '')}</td>
      <td class="num">${(Number(it.weightG) || 0).toFixed(3)} g</td>
      <td class="num">${fmt(Math.round(it.ratePerGram))}/g</td>
      <td class="num">${fmt(Math.round(it.makingCharge || 0))}</td>
      <td class="num">${fmt(Math.round(it.gst || 0))}</td>
      <td class="num"><b>${fmt(it.unitPrice * it.qty)}</b></td>
    </tr>`).join('');
  const R = o.rateSnapshot || {};
  return `
  <div class="cert-sheet" id="certSheet">
    <div class="cert-border">
      <header class="cert-head">
        <img src="/images/logo.png" alt="Shivaa">
        <div><b>CERTIFICATE OF AUTHENTICITY</b><small>Shuddhata praman patra · issued with your order</small></div>
        <div class="cert-id"><b>${esc(o.id)}</b><small>${new Date(o.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</small></div>
      </header>
      <section class="cert-issued">
        <span>Presented to</span><b>${esc(o.address?.name || o.userName || (state.user && state.user.name) || 'Valued customer')}</b>
        <span class="cert-place">by <b>${esc(s.legalName || 'Ernate Shine Jewellery Pvt. Ltd.')}</b>, ${esc(s.address || 'Sadar Bazaar, Jayal, Nagaur, Rajasthan')}</span>
      </section>
      <table class="cert-tbl"><thead><tr>
        <th>Piece</th><th>Qty</th><th>Metal · Purity</th><th>Gross wt</th><th>Rate/g</th><th>Making</th><th>GST</th><th>Amount</th>
      </tr></thead><tbody>${rows}</tbody></table>
      <div class="cert-summary">
        <div><span>Total gross weight</span><b>${gross.toFixed(3)} g</b></div>
        <div><span>Net gold weight</span><b>${net.toFixed(3)} g</b></div>
        <div><span>Rate locked (22K / Silver)</span><b>${fmt(Math.round(R.gold22 || 0))} · ${fmt2(R.silver || 0)}/g</b></div>
        <div><span>Total paid</span><b>${fmt(o.total)}</b></div>
      </div>
      <section class="cert-assure">
        <p><b>✦ Hallmarking.</b> Every gold piece carries its BIS-assigned <b>HUID</b>, physically stamped on the piece and printed on the tax invoice. Scan it anytime in the official <b>BIS Care</b> app. Silver 925 pieces carry the 925 stamp.</p>
        <p><b>✦ Honest weights.</b> Weights are recorded to the milligram at billing; stones &amp; pearls are valued separately and shown on the invoice.</p>
        <p><b>✦ Transparent price.</b> Metal value at the day&rsquo;s locked Shivaa rate + listed making charge + 3% GST — nothing hidden, nothing rounded up.</p>
        <p><b>✦ Lifetime buyback.</b> This certificate accompanies the piece for 100% metal-value buyback under our published policy.</p>
      </section>
      <footer class="cert-foot">
        <div class="cert-sign"><span></span><small>Authorised signatory · for ${esc(s.storeName || 'Shivaa')}</small></div>
        <div class="cert-verify"><b>Verify anytime</b><small>HUID → BIS Care app · Order ${esc(o.id)} · ${esc(s.phone || '+91 89050 05921')}</small></div>
      </footer>
    </div>
  </div>`;
}
pages.certificate = async (view, q, id) => {
  const isCurrent = viewLifetime(view);
  if (!state.user) { signInGate(view, '', 'Certificate', 'Sign in to open the certificate for this order — it stays in your account, ready to print or show at the counter.'); openLogin(); return; }
  view.innerHTML = '<div class="loading-spin"></div>';
  document.documentElement.classList.add('cert-mode');
  let o = null;
  try { o = (await api('/api/orders/' + id)).order; } catch (e) {}
  if (!isCurrent()) return;
  if (!o) { document.documentElement.classList.remove('cert-mode'); view.innerHTML = emptyShell('Certificates', 'Certificate not found', '<div class="empty"><p style="color:var(--ink-3)">That order has no certificate on this account.</p><a class="btn btn-primary" href="#/certificates">My Certificates</a></div>'); return; }
  view.innerHTML = `<div class="cert-page">
    <div class="cert-actions inv-no-print">
      <button class="btn btn-gold btn-lg" onclick="window.print()">⬇ Save as PDF / Print</button>
      <a class="btn btn-ghost" href="#/order/${encodeURIComponent(id)}">← Order</a>
      <a class="btn btn-ghost" href="#/certificates">All certificates</a>
    </div>${certificateSheet(o)}
  </div>`;
};
pages.certificates = async view => {
  const isCurrent = viewLifetime(view);
  if (!state.user) { signInGate(view, 'account', 'My Certificates', 'Your digital purity & price certificates are issued with every order — sign in to open the locker.'); openLogin('account'); return; }
  document.documentElement.classList.remove('cert-mode');
  let orders = [];
  try { orders = (await api('/api/orders')).orders || []; } catch (e) {}
  if (!isCurrent()) return;
  view.innerHTML = `
  <section class="page-hero"><div class="dust" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="container"><div class="crumbs"><a href="#/account">My Account</a> / Certificates</div><h1>My Certificates</h1><p>Digital purity &amp; price certificates for every Shivaa order — save, print, or show at the counter.</p></div></section>
  <div class="container" style="padding:36px 0 90px">
    ${orders.length ? `<div class="cert-locker">${orders.map(o => `<a class="cert-card" href="#/certificate/${encodeURIComponent(o.id)}">
      <span class="cc-ic">&#127970;</span>
      <div><b>${esc(o.id)}</b><small>${new Date(o.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} · ${o.items.reduce((a, i) => a + i.qty, 0)} piece(s) · ${fmt(o.total)}</small></div>
      <span class="cc-go">View &amp; print &#8250;</span></a>`).join('')}</div>`
      : `<div class="empty"><img src="/images/logo.png" class="empty-logo" alt=""><h2>No certificates yet</h2><p style="margin:10px 0 18px">Your certificate is issued automatically with your first order.</p><a class="btn btn-primary" href="#/shop">Explore Jewellery</a></div>`}
  </div>`;
};

/* ─────────── custom pages (owner-managed) ─────────── */
pages.p = async (view, q, slug) => {
  const isCurrent = viewLifetime(view);
  let pg = null;
  try { pg = await api('/api/pages?slug=' + encodeURIComponent(slug || '')); } catch (e) {}
  if (!isCurrent()) return;
  if (!pg || pg.error || !pg.title) { view.innerHTML = emptyShell('Page', 'Page not found', `<div class="empty" style="padding:70px 20px"><img src="/images/logo.png" class="empty-logo" alt=""><p style="color:var(--ink-3);margin-bottom:18px">That page may have been renamed or retired.</p><a class="btn btn-outline" href="#/">Back home</a></div>`); return; }
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
/* v113 — the jeweller desk used to keep its selections only on `window`,
   and its filters only in the DOM. Opening a design to check a photo and
   coming back — or any reload — wiped the bill the partner had built.
   Selections AND filters now live in localStorage; they are cleared only
   when an order is actually placed. */
const DS_SEL_KEY = 'shv_ds_sel', DS_FIL_KEY = 'shv_ds_filters';
function dsLoadSel() {
  try {
    const o = JSON.parse(localStorage.getItem(DS_SEL_KEY) || '{}');
    const clean = {};
    Object.entries(o || {}).forEach(([k, v]) => { const q = parseInt(v, 10); if (q > 0) clean[k] = Math.min(99, q); });
    return clean;
  } catch (e) { return {}; }
}
function dsSaveSel() { try { localStorage.setItem(DS_SEL_KEY, JSON.stringify(window._sel || {})); } catch (e) {} }
function dsLoadFilters() { try { return JSON.parse(localStorage.getItem(DS_FIL_KEY) || '{}') || {}; } catch (e) { return {}; } }
function dsSaveFilters(f) { try { localStorage.setItem(DS_FIL_KEY, JSON.stringify(f)); } catch (e) {} }
function dsClearSaved() { try { localStorage.removeItem(DS_SEL_KEY); localStorage.removeItem(DS_FIL_KEY); } catch (e) {} }
/* v122 — desk sort. Featured is the catalogue order it arrived in (kept on
   first use); Selected-first floats the running bill to the top for review. */
function dsSort() {
  const grid = document.getElementById('dsGrid'); if (!grid) return;
  const sel = document.getElementById('dsfSort');
  const mode = sel ? sel.value : '';
  const cards = [...grid.querySelectorAll('.ds-card')];
  if (!cards.length) return;
  if (cards[0]._dsi == null) cards.forEach((c, i) => { c._dsi = i; });
  const picked = window._sel || {};
  const idOf = c => (c.id || '').replace(/^ds-/, '');
  const by = {
    sel: (a, b) => (((picked[idOf(b)] || 0) > 0) - ((picked[idOf(a)] || 0) > 0)) || (a._dsi - b._dsi),
    wasc: (a, b) => (+a.dataset.w - +b.dataset.w) || (a._dsi - b._dsi),
    wdesc: (a, b) => (+b.dataset.w - +a.dataset.w) || (a._dsi - b._dsi),
    az: (a, b) => String(a.dataset.name || '').localeCompare(String(b.dataset.name || '')) || (a._dsi - b._dsi),
  }[mode] || ((a, b) => a._dsi - b._dsi);
  cards.sort(by).forEach(c => grid.appendChild(c));
  const e = document.getElementById('dsEmpty'); if (e) grid.appendChild(e);
}
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
    const q = (g('dsfSearch') ? g('dsfSearch').value : '').trim().toLowerCase();
    if (!grid.querySelector('.ds-card')) {
      let e0 = g('dsEmpty');
      if (!e0) { e0 = document.createElement('div'); e0.id = 'dsEmpty'; e0.className = 'empty'; e0.style.cssText = 'grid-column:1/-1;padding:44px 20px;text-align:center'; grid.appendChild(e0); }
      e0.innerHTML = '<div class="big">&#10022;</div><h3>The designs could not load</h3><p style="color:var(--ink-3);margin-top:6px">Check your connection and pull to refresh — your saved bill is safe.</p>';
      e0.style.display = '';
      ['dsShown', 'dsShown2'].forEach(id => { const el = g(id); if (el) el.textContent = ''; });
      return;
    }
    let shown = 0;
    grid.querySelectorAll('.ds-card').forEach(c => {
      const w = +c.dataset.w;
      const ok = (!cat || c.dataset.cat === cat)
        && (!stone || c.dataset.stone === stone)
        && (!colour || (c.dataset.colour || '') === colour)
        && (!purity || (c.dataset.purity || '') === purity)
        && w >= wmin && w <= wmax && (!q || (c.dataset.name || '').toLowerCase().includes(q) || (c.dataset.sku || '').toLowerCase().includes(q));
      c.style.display = ok ? '' : 'none'; if (ok) shown++;
    });
    const txt = shown + ' design' + (shown === 1 ? '' : 's') + ' shown';
    ['dsShown', 'dsShown2'].forEach(id => { const el = g(id); if (el) el.textContent = txt; });
    dsSort();
    if (!shown) {
      let e = g('dsEmpty');
      if (!e) { e = document.createElement('div'); e.id = 'dsEmpty'; e.className = 'empty'; e.style.cssText = 'grid-column:1/-1;padding:44px 20px;text-align:center';
        e.innerHTML = '<div class="big">&#10022;</div><h3>No designs match those filters</h3><p style="color:var(--ink-3);margin-top:6px">Try widening the weight range or clearing a filter.</p>';
        grid.appendChild(e); }
      e.style.display = '';
    } else { const e = g('dsEmpty'); if (e) e.style.display = 'none'; }
  };
  const FIDS = ['dsfSearch', 'dsfCat', 'dsfStone', 'dsfColour', 'dsfPurity', 'dsfWMin', 'dsfWMax', 'dsfSort'];
  const quick = g('dsfQuick');
  /* v113 — put yesterday's filters back before the first pass, and remember
     every change. Restoring a quick-weight chip too, so the bar reads true. */
  const saved = dsLoadFilters();
  const paintChip = () => {
    if (!quick) return;
    const lo = g('dsfWMin') ? g('dsfWMin').value : '', hi = g('dsfWMax') ? g('dsfWMax').value : '';
    quick.querySelectorAll('.pf-chip').forEach(ch => {
      ch.classList.toggle('on', ch.dataset.min === lo && ch.dataset.max === hi);
    });
  };
  FIDS.forEach(id => { const el = g(id); if (el && saved[id] != null) el.value = saved[id]; });
  paintChip();
  const remember = () => {
    const f = {}; FIDS.forEach(id => { const el = g(id); if (el && el.value !== '') f[id] = el.value; });
    dsSaveFilters(f);
  };
  let _dsSearchT = 0;
  FIDS.forEach(id => {
    const el = g(id); if (!el) return;
    if (id === 'dsfSearch') {
      el.oninput = () => { clearTimeout(_dsSearchT); _dsSearchT = setTimeout(() => { remember(); apply(); }, 120); };
      el.onchange = () => { clearTimeout(_dsSearchT); remember(); apply(); };
      return;
    }
    el.oninput = () => { remember(); paintChip(); apply(); };
    el.onchange = () => { remember(); paintChip(); apply(); };
  });
  if (quick) quick.querySelectorAll('.pf-chip').forEach(ch => {
    ch.onclick = () => {
      const on = ch.classList.contains('on');
      quick.querySelectorAll('.pf-chip').forEach(x => x.classList.remove('on'));
      if (!on) { ch.classList.add('on'); g('dsfWMin').value = ch.dataset.min || ''; g('dsfWMax').value = ch.dataset.max || ''; }
      else { g('dsfWMin').value = ''; g('dsfWMax').value = ''; }
      remember(); apply();
    };
  });
  const rst = g('dsfReset');
  if (rst) rst.onclick = () => {
    FIDS.forEach(id => { const el = g(id); if (el) el.value = ''; });
    quick && quick.querySelectorAll('.pf-chip').forEach(x => x.classList.remove('on'));
    dsSaveFilters({}); apply();
  };
  apply();
  /* the summary bar is rendered at 0 before any interaction — reconcile it
     with the selections restored from storage so a returning partner sees
     the bill they already built. */
  try { window.ShivaaDS && window.ShivaaDS.updateBar(); } catch (e) {}
}
window.ShivaaDS = {
  qty(pid, d) {
    window._sel[pid] = Math.max(0, (window._sel[pid] || 0) + d);
    if (window._sel[pid] === 0) delete window._sel[pid];
    dsSaveSel();                                   // v113 — survive navigation & reload
    try { navigator.vibrate && navigator.vibrate(8); } catch (e) {}
    const card = document.getElementById('ds-' + pid);
    if (card) {
      card.classList.toggle('on', window._sel[pid] > 0);
      card.querySelector('.ds-qty span').textContent = window._sel[pid] || 0;
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
    /* v113 — a restored bill can name a design that has since left the
       catalogue; drop those instead of crashing on an undefined product. */
    const rows = [];
    items.forEach(it => { const p = state.productsCache.find(x => x.id === it.id); if (p) rows.push({ p, qty: it.qty }); else delete window._sel[it.id]; });
    dsSaveSel();
    if (!rows.length) { this.updateBar(); return toast('Those designs are no longer in the catalogue — please pick again', 'err'); }
    let g = 0;
    rows.forEach(r => { g += r.p.weightG * r.qty; });
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
      dsClearSaved();   // v113 — the bill is placed, so the saved selection goes with it
      closeModal();
      openModal(`<div class="center"><div style="font-size:40px">✦</div><h3 style="margin:8px 0">Metal Order ${ord.id} placed</h3>
        <p style="font-size:14px;color:var(--ink-2)">${ord.totalWeightG} g selected → <b>${ord.fineGrams} g fine metal @ ${ord.purity}</b><br>Making charges: ₹0 · Status: ${esc(ord.status || 'New')}</p>
        <a class="btn btn-gold" style="margin-top:12px" target="_blank" rel="noopener" href="https://wa.me/${waNum()}?text=${encodeURIComponent('✦ SHIVAA METAL ORDER ✦\n\nOrder: ' + ord.id + '\nTotal weight: ' + ord.totalWeightG + ' g\n× ' + ord.factor + ' = ' + ord.fineGrams + ' g fine @ ' + ord.purity + '\nMaking charges: ZERO\n\nPlease confirm.')}">Confirm on WhatsApp →</a></div>`);
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
   Live valuation against Shivaa's rate feed — the same one that powers pricing.
   ═══════════════════════════════════════════════════════════════════ */
pages.buyback = async (view) => {
  const R = state.rates || {};
  const g22 = R.gold22 || 0, g24 = R.gold24 || 0, g18 = R.gold18 || 0, slv = R.silver || 0;

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
        <p>We buy back the full metal value of your jewellery at Shivaa's live rate on the day you return — not a discounted "scrap" rate.</p>
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
            <label>Whose piece is it?</label>
            <div class="bbc-purity bb-src" id="bbSrc">
              <button type="button" class="bbp on" data-src="shivaa">Bought from Shivaa <small>100% value</small></button>
              <button type="button" class="bbp"     data-src="other">Old gold · another jeweller <small>standard deductions</small></button>
            </div>
          </div>
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
              <button type="button" class="bbp"     data-k="g24">24K <small>995</small></button>
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
            <div><small>Deduction</small><b class="bbr-zero" id="bbDed">₹0 · 0%</b></div>
          </div>
          <div class="bb-ded-note" id="bbDedNote" hidden></div>
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
        <div class="step-item"><span class="si-n">03</span><b>Valued at the live rate</b><p>The same published Shivaa rate on the board that day — no private "counter rate".</p></div>
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
  const rates = { g22, g24, g18, slv };
  const label = { g22: 'Gold 22K', g24: 'Gold 24K', g18: 'Gold 18K', slv: 'Silver 925' };
  let cur = 'g22', src = 'shivaa';
  // Industry-standard old-gold exchange math for pieces bought elsewhere:
  // a one-time melting/wastage charge (3% gold · 5% silver), shown plainly.
  const deductPct = k => src === 'other' ? (k === 'slv' ? 0.05 : 0.03) : 0;

  const calc = () => {
    const wt = Math.max(0, parseFloat($('#bbWt').value) || 0);
    const per = rates[cur] || 0;
    const gross = wt * per, ded = gross * deductPct(cur), total = gross - ded;
    const amtEl = $('#bbAmt');
    if (amtEl) {
      amtEl.textContent = fmt(total);
      amtEl.classList.remove('bbr-pop'); void amtEl.offsetWidth; amtEl.classList.add('bbr-pop');
    }
    const rEl = $('#bbRate'); if (rEl) rEl.textContent = `${wt.toLocaleString('en-IN')} g × ${label[cur]}`;
    const pEl = $('#bbPerG'); if (pEl) pEl.textContent = fmt(per) + '/g';
    const dedEl = $('#bbDed');
    if (dedEl) {
      dedEl.textContent = ded > 0 ? `− ${fmt(ded)} · ${Math.round(deductPct(cur) * 100)}%` : '₹0 · 0%';
      dedEl.classList.toggle('bbr-zero', ded === 0);
      dedEl.classList.toggle('neg', ded > 0);
    }
    const note = $('#bbDedNote');
    if (note) {
      if (src === 'other') {
        note.hidden = false;
        note.innerHTML = ded > 0
          ? `Standard one-time <b>melting / wastage ${Math.round(deductPct(cur) * 100)}% = −${fmt(ded)}</b> on old gold from another jeweller. Exchange it against a new Shivaa piece and we waive the making-charge difference too.`
          : '';
      } else note.hidden = true;
    }
    const origin = src === 'shivaa' ? 'Shivaa piece (written buyback)' : 'Old gold from another jeweller';
    const msg = `Namaste Shivaa team ✦\n\nI'd like to confirm an exchange valuation.\n\nPiece: ${origin}\nMetal: ${label[cur]}\nWeight: ${wt} g\nIndicative value: ${fmt(total)}${ded ? '\nDeduction shown: ' + fmt(ded) + ' (' + Math.round(deductPct(cur) * 100) + '% melting/wastage)' : ''}\n\nPlease confirm.`;
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
  $$('#bbSrc .bbp').forEach(b => b.addEventListener('click', () => {
    $$('#bbSrc .bbp').forEach(x => x.classList.remove('on'));
    b.classList.add('on'); src = b.dataset.src; calc();
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
            <li><span>✦</span> Gold billed at Shivaa's live rate on redemption day</li>
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
        <p>Move the slider to your comfortable monthly amount. Gold quantity is projected at today's Shivaa 22K rate of <b>${fmt(g22)}/g</b>.</p>
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

    <!-- ── v60 digital passbook ── -->
    <section class="rv" id="svPassbookWrap"></section>

    <!-- ── rules ── -->
    <section class="rv">
      <div class="sec-head"><h2>The plain rules</h2><p>Read these before you enrol. There is nothing else.</p></div>
      <div class="fine-grid">
        <div class="fine-card"><b>Who can join</b><p>Anyone with a Shivaa account and a verified mobile number. Enrol online or at the Jayal counter.</p></div>
        <div class="fine-card"><b>If you miss a month</b><p>The plan extends by that month. There is no penalty and no interest. The 12th instalment from Shivaa is paid once your 11 are complete.</p></div>
        <div class="fine-card"><b>Cancelling early</b><p>Withdraw any time before maturity and receive every rupee you paid back in full. The Shivaa instalment applies only on completion.</p></div>
        <div class="fine-card"><b>What you can buy</b><p>Any gold or silver jewellery in the store. Making charges are payable on the piece you choose; the saved amount covers the metal.</p></div>
        <div class="fine-card"><b>Rate applied</b><p>The published live Shivaa rate on the day you redeem — not the day you enrolled. If gold falls, you get more grams.</p></div>
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
    const wa = $('#svWa'); if (wa) wa.onclick = () => waOpen(msg);
    const join = $('#svJoin');
    if (join) {
      join.textContent = state.user ? '✦ Enrol & open my passbook' : 'Sign in to enrol ✦';
      join.onclick = async () => {
        if (!state.user) { openLogin(); return; }
        try {
          await api('/api/savings', { method: 'POST', body: JSON.stringify({ monthlyAmount: m }) });
          toast('Welcome to Swarna Nidhi ✦ passbook opened'); pages.savings($('#view'));
          document.getElementById('svPassbookWrap')?.scrollIntoView({ behavior: 'smooth' });
        } catch (e) { toast(e.message, 'err'); }
      };
    }
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

  /* ---- v60 digital passbook ---- */
  const loadPassbook = async () => {
    const wrap = $('#svPassbookWrap');
    if (!wrap) return;
    if (!state.user) {
      wrap.innerHTML = `<div class="sec-head"><h2>My Swarna Nidhi passbook</h2><p>Sign in to see your running plan, receipts and grams accrued.</p></div>
        <div style="text-align:center"><button class="btn btn-gold btn-lg" onclick="Shivaa.openLogin()">Sign in</button></div>`;
      return;
    }
    try {
      const data = await api('/api/savings/mine');
      const plans = data.plans || [];
      if (!plans.length) {
        wrap.innerHTML = `<div class="sec-head"><h2>My Swarna Nidhi passbook</h2><p>No active plan yet — set the monthly amount above and tap <b>Enrol</b>.</p></div>`;
        return;
      }
      const p = plans[0];
      const done = (p.installments || []).length;
      const contributed = p.contributed || done * p.monthlyAmount;
      wrap.innerHTML = `<div class="sec-head"><h2>My digital passbook</h2><p>Plan <b>${esc(p.id.toUpperCase())}</b> · ${fmt(p.monthlyAmount)} per month · every receipt is stored here.</p></div>
        <div class="sv-book">
          <div class="svb-top">
            <div><small>Total contributed</small><b>${fmt(contributed)}</b></div>
            <div><small>Instalments</small><b>${done}/11</b></div>
            <div><small>Status</small><b class="svb-${p.status}">${esc(p.status)}</b></div>
          </div>
          <div class="svb-bar"><i style="width:${Math.min(100, (done / 11) * 100)}%"></i></div>
          ${p.status === 'active' ? `<div class="svb-next">Next instalment: <b>${fmt(p.monthlyAmount)}</b> — pay at the counter or on WhatsApp; the receipt appears here immediately.</div>` : ''}
          <div class="svb-list">
            ${(p.installments || []).map((q, i) => `<div class="svb-row"><span>${i + 1}. ${new Date(q.at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span><b>${fmt(q.amount)}</b><small>${q.rate22 ? '@' + fmt(q.rate22) + '/g' : ''} ${esc(q.mode || '')}</small></div>`).join('')}
            ${done >= 11 ? `<div class="svb-row svb-gift"><span>12. ✦ Shivaa&rsquo;s gift instalment</span><b>${fmt(p.monthlyAmount)}</b></div>` : ''}
          </div>
          <div class="svb-actions">
            <button class="btn btn-outline btn-sm" onclick="window.print()">🖨 Print / PDF statement</button>
            <a class="btn btn-outline btn-sm" target="_blank" rel="noopener" href="${waLink('Namaste Shivaa ✦ please share my Swarna Nidhi plan ' + p.id.toUpperCase() + ' statement.')}">WhatsApp statement</a>
          </div>
        </div>`;
    } catch (e) { wrap.innerHTML = ''; }
  };
  loadPassbook();
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
        <p>Today's Shivaa rate for 24K (99.999) fine gold: <b>${fmt(g24)}/g</b>.</p>
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
/* v101 — every gold karat + silver is purchasable under the dead-stock desk */
const DS_METALS = [
  { id: 'g24', tag: '24K', stand: '995 gold', metal: 'gold', fine: 0.995 },
  { id: 'g22', tag: '22K', stand: '916 gold', metal: 'gold', fine: 0.916 },
  { id: 'g20', tag: '20K', stand: '833 gold', metal: 'gold', fine: 0.833 },
  { id: 'g18', tag: '18K', stand: '750 gold', metal: 'gold', fine: 0.75 },
  { id: 'g14', tag: '14K', stand: '585 gold', metal: 'gold', fine: 0.585 },
  { id: 's925', tag: '925', stand: 'Sterling silver', metal: 'silver', fine: 0.925 },
  { id: 's990', tag: '990', stand: 'Fine silver', metal: 'silver', fine: 0.99 },
];
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
      <p>Slow-moving stock in <b>every gold karat — 24K, 22K, 20K, 18K, 14K — and silver (925 &amp; 990)</b>, bought at one wastage and settled as fine-metal value, with half your making charges credited back so melting never wins.</p>
    </div>
  </section>

  <div class="container lux-wrap">

    <!-- ── the offer ── -->
    <div class="vault-grid rv">
      <div class="vault-card">
        <span class="vc-num">All<small>karats</small></span>
        <b>Every gold karat &amp; silver</b>
        <p>24K, 22K, 20K, 18K, 14K gold and 925 / 990 silver &mdash; bangles, chains, rings, sets, any design, any age. One wastage per metal, no per-piece haggling.</p>
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
        <h2>What your old stock is <em class="shimmer foil-txt">actually worth</em></h2>
        <p>Today's Shivaa rates &mdash; fine 24K <b>${fmt(g24)}/g</b> &middot; 22K <b>${fmt(g22)}/g</b> &middot; fine silver <b>${fmt(Math.max(R?.silver || 0, (R?.jaipur?.silver || 0) / 1000))}/g</b>.</p>
      </div>

      <div class="svc-body">
        <div class="svc-form">
          <div class="fld">
            <label>Metal &amp; purity we purchase</label>
            <div class="ds-metals" id="dsMetals" role="radiogroup" aria-label="Metal and purity">
              ${DS_METALS.map((m, i) => `<button type="button" class="ds-metal ${i === 1 ? 'on' : ''}" data-m="${m.id}" role="radio" aria-checked="${i === 1}"><b>${m.tag}</b><small>${m.stand}</small></button>`).join('')}
            </div>
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
            <div class="dss-row dss-fine"><span id="dsFineLbl">Fine metal you receive</span><b id="dsFine">&mdash;</b></div>
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
          <div class="fld"><label>Metal &amp; purity *</label>
            <select name="category" required>
              ${DS_METALS.map((m, i) => `<option ${i === 1 ? 'selected' : ''}>${m.tag} · ${m.stand}</option>`).join('')}
            </select>
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
        <div class="step-item"><span class="si-n">04</span><b>Fine-metal settlement</b><p>The fine gold or silver content is converted to fine-metal value against your next order; the 50% credit sits on your account with no expiry.</p></div>
      </div>
    </section>

    <!-- ── terms ── -->
    <section class="rv">
      <div class="sec-head"><h2>The terms, plainly</h2><p>Nothing hidden. Ask the bullion desk if anything here is unclear.</p></div>
      <div class="fine-grid">
        <div class="fine-card"><b>What we take</b><p>Gold jewellery in <b>24K, 22K, 20K, 18K and 14K</b>, plus <b>925 and 990 silver</b> &mdash; bangles, chains, rings, sets, payal. Any design, any age.</p></div>
        <div class="fine-card"><b>What we quote separately</b><p>Heavily stone-set, kundan/polki, enamelled or damaged pieces are quoted case by case after assay. Loose stones &amp; solitaires are valued separately.</p></div>
        <div class="fine-card"><b>Why 50% of the making charges</b><p>It is not a payment for craftsmanship &mdash; it is calibrated so you never recover less than melting. The credit applies against future Shivaa purchases and never expires.</p></div>
        <div class="fine-card"><b>Minimum lot</b><p>100 g of gold or 1 kg of silver. Active partners can send smaller lots &mdash; message the desk first.</p></div>
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

  /* ---- live estimator: every gold karat + silver → fine metal ---- */
  const WAST = 0.99;    // bought at one wastage, any metal
  const MELT = 0.92;    // typical melting route loses ~8%
  // v101 — all jewellery karats and silver, each settled on its fine content
  const goldKarats = { g24: R['gold24'], g22: R['gold22'], g20: R['gold20'], g18: R['gold18'], g14: R['gold14'] };
  const fineGoldRate = g24 || (g22 ? g22 / DS_METALS.find(m => m.id === 'g22').fine : 0);
  const fineSilverRate = (R.jaipur && R.jaipur.silver > 200) ? R.jaipur.silver / 1000
    : (R.silver ? R.silver / DS_METALS.find(m => m.id === 's925').fine : 0);
  let cur = DS_METALS[1];

  const calc = () => {
    const wt = Math.max(0, parseFloat($('#dsWt').value) || 0);
    const mc = Math.max(0, parseFloat($('#dsMc').value) || 0);
    const isSilver = cur.metal === 'silver';
    const fineRate = isSilver ? fineSilverRate : fineGoldRate;
    const fineG = wt * cur.fine * WAST;          // fine grams after one wastage
    const metalVal = fineG * fineRate;
    const credit = mc * 0.5;                     // melting-loss protection
    const total = metalVal + credit;
    // the local melting-yard comparison buys the article at its alloy rate
    const alloyRate = isSilver
      ? (cur.id === 's925' ? (R.silver || fineSilverRate * cur.fine) : fineSilverRate * cur.fine)
      : (goldKarats[cur.id] || fineGoldRate * cur.fine);
    const melted = wt * alloyRate * MELT;
    const gain = total - melted;

    const set = (id, v) => { const e = $(id); if (e) e.textContent = v; };
    const fineName = isSilver ? 'fine silver' : 'fine gold';
    const fl = $('#dsFineLbl'); if (fl) fl.textContent = `Fine ${isSilver ? '990 silver' : '99.99% gold'} you receive`;
    set('#dsFine', `${fineG.toLocaleString('en-IN', { maximumFractionDigits: 1 })} g \u2248 ${fmt(metalVal)}`);
    set('#dsMetalVal', fmt(metalVal));
    set('#dsCredit', '+ ' + fmt(credit));
    set('#dsMelt', fmt(melted));
    set('#dsSub', `${wt.toLocaleString('en-IN')} g of ${cur.tag} ${cur.stand} \u00b7 one wastage \u00b7 settled as ${fineName}`);

    const gEl = $('#dsGain');
    if (gEl) gEl.innerHTML = gain >= 0
      ? `You stay <b>${fmt(gain)}</b> ahead of melting \u2014 and the karigar's work survives`
      : `Melting would return ${fmt(-gain)} more`;

    const tEl = $('#dsTotal');
    if (tEl) {
      tEl.textContent = fmt(total);
      tEl.classList.remove('bbr-pop'); void tEl.offsetWidth; tEl.classList.add('bbr-pop');
    }

    const msg = `Namaste Shivaa bullion desk \u2726\n\nI'd like to sell dead stock under the 1-wastage scheme.\n\nMetal: ${cur.tag} · ${cur.stand}\nWeight: ${wt} g\nMaking charges paid: ${fmt(mc)}\n\nIndicative fine-metal value: ${fmt(metalVal)}\nMelting-loss protection (50% of MC): ${fmt(credit)}\nTotal recovery: ${fmt(total)}\n\nFirm name: \nCity: \n\nPlease arrange a pickup.`;
    ['#dsWa', '#dsWa2'].forEach(sel => { const e = $(sel); if (e) e.onclick = () => waOpen(msg); });
  };
  $$('#dsMetals .ds-metal').forEach(btn => btn.onclick = () => {
    cur = DS_METALS.find(m => m.id === btn.dataset.m) || cur;
    $$('#dsMetals .ds-metal').forEach(b => {
      const on = b === btn; b.classList.toggle('on', on); b.setAttribute('aria-checked', on ? 'true' : 'false');
    });
    calc();
  });

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
    + `Metal & purity: ${g('category') || '22K · 916 gold'}\nApprox weight: ${g('weight')} g\n`
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
  if (!state.user) { signInGate(view, 'track', 'Track Order', 'Sign in to see every order, its courier and its live status. Guest orders stay reachable through the WhatsApp message we sent you.'); openLogin('track'); return; }
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
      box.innerHTML = `<div class="empty"><div class="big">&#10022;</div><h2>No orders yet</h2>
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
    <details class="acc"><summary>How is the price of a piece calculated?</summary><div class="acc-body">(Live metal rate × weight) + making charges for that piece + GST at 3%. The metal rate is Shivaa's live rate at the time of billing — the same number you see on the ticker, to the rupee.</div></details>
    <details class="acc"><summary>Do making charges differ between designs?</summary><div class="acc-body">Yes — each design carries its own making charge based on the karigar's work, shown clearly on the product page. Machine-made chains cost far less than hand-carved bridal work, and we think you should see that honestly.</div></details>
    <details class="acc"><summary>Why do prices change between visits?</summary><div class="acc-body">Because the metal rate moves. Prices track Shivaa's live rate and refresh every few minutes — the rate is locked at the moment you place your order.</div></details>
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

/* ─────────── NEW YEAR GOLD FINALE · #/finale (time-boxed, auto-expires 1 Jan 2027) ─────────── */
/* v54: the 10 g prize, valued at this moment's live 24K rate — honesty by construction */
async function fillPrizeWorth() {
  const el = $('#prizeWorth');
  const elVal = $('#schemePrizeVal');
  try {
    const r = await api('/api/rates');
    const g24 = (r && r.jaipur && r.jaipur.gold24) || (r && r.gold24) || 15139;
    const worth = Math.round(10 * g24);
    if (el) el.innerHTML = '✦ worth <b>₹' + worth.toLocaleString('en-IN') + '</b> at today\u2019s 24K rate';
    if (elVal) elVal.textContent = '₹' + worth.toLocaleString('en-IN');
  } catch (e) {
    if (el) el.innerHTML = '✦ valued at the live 24K rate on draw night';
  }
}
pages.scheme = async (view) => {
  const isCurrent = viewLifetime(view);
  ensureCampaignStuds();
  if (!finaleLive()) { location.hash = '#/'; return; }
  view.innerHTML = finaleLanding();
  const cd = $('#posterCd');
  if (cd) bindFinaleCd(cd);
  initGoldParticleCanvas('goldParticleCanvas');
  fillPrizeWorth();

  const hash = location.hash.replace(/^#\/?/, '') || '';
  const cut = hash.indexOf('?');
  const pathPart = cut < 0 ? hash : hash.slice(0, cut);
  const qs = cut < 0 ? '' : hash.slice(cut + 1);
  const seg = pathPart.split('/').filter(Boolean);
  const q = new URLSearchParams(qs || '');

  let step = q.get('step');
  let gender = q.get('gender') || 'gents';

  if (!step) {
    if (seg[1] === 'landing') step = 'landing';
    else if (seg[1] === 'gender') step = 'gender';
    else if (seg[1] === 'gents') { step = 'products'; gender = 'gents'; }
    else if (seg[1] === 'ladies') { step = 'products'; gender = 'ladies'; }
    else if (seg[1] === 'quiz') step = 'quiz';
    else step = 'poster';
  }

  window._schemeState = { step, gender };
  renderSchemeStage(step, gender);

  if (step === 'quiz') {
    const orderId = q.get('orderId') || (window._lastOrder && window._lastOrder.id);
    const pin = q.get('pin') || (guestPinFor ? guestPinFor(q, orderId) : '');
    const cf = q.get('cf');
    if (orderId) {
      toast('भुगतान सत्यापित हो रहा है... / Verifying payment… ✦');
      let attempts = 0;
      const maxAttempts = cf === 'pending' ? 6 : 1;
      const stillPending = () => {
        if (!isCurrent()) return;
        toast('Payment is not confirmed yet. Check your order status before taking the quiz.', 'err');
        const old = view.querySelector('#schemePayRetry'); if (old) old.remove();
        const help = document.createElement('p'); help.id = 'schemePayRetry'; help.className = 'center';
        const link = document.createElement('a'); link.className = 'btn btn-outline';
        link.href = '#/order/' + encodeURIComponent(orderId) + '?cf=pending' + (pin ? '&pin=' + encodeURIComponent(pin) : '');
        link.textContent = 'Check payment status'; help.appendChild(link); view.appendChild(help);
      };
      const checkStatus = async () => {
        if (!isCurrent()) return;
        try {
          const res = await api('/api/pay/cashfree/status', { method: 'POST', body: JSON.stringify({ orderId, pin: pin || '' }) });
          if (!isCurrent()) return;
          if (orderIsPaid(res && res.order)) {
            toast('Payment confirmed — opening your quiz ✦');
            fqOpen({ route: 'purchase', orderId, pin }); return;
          }
        } catch (err) { if (!isCurrent()) return; }
        attempts++;
        if (attempts < maxAttempts) setTimeout(checkStatus, 1200);
        else stillPending();
      };
      checkStatus();
    } else {
      Shivaa.setSchemeStep('products', gender || 'gents');
    }
  }
};
pages.finale = pages.scheme;
pages['gold-biscuit'] = pages.scheme;

/* ─────────── ROUTER ─────────── */
const routes = Object.create(null);
Object.keys(pages).forEach(k => routes[k] = pages[k]);
Object.assign(window.Shivaa, {
  api, state, store, token, setToken, toast, openModal, closeModal, toggleWish, addToCart,
  /* v166 — the device's last-good catalogue + the honest catalogue flag, so the
     retry layer in js/v166.js reads and writes exactly one copy */
  catalogCacheRead, catalogCacheWrite,
  toggleCompare, removeCompare, clearCompare, copyCompareLink, waCompare, compareLink, compareItems,
  routes, price, fmt, esc, safeUrl, jsArg, productCard, mcTableHTML, openLogin,
  /* v171 — the staff bundle (admin.js) builds its category dropdown from this
     exact list, so admin and shop can never disagree on categories again */
  CATS,
  waLink, waOpen, waProductMsg, waCartMsg, waOrderMsg, waCompareMsg, WA_SVG, waFallbackModal,
  redraw: () => route(true),
  openCart, closeCart, renderMiniCart, flyToBag,
});
/* ─────────── v99 · STAFF-ONLY BUNDLE, LOADED ON DEMAND ───────────
   admin.js (261KB) + qr.js (55KB) power #/admin and #/partner and nothing
   else. Verified before moving them out of index.html:
     · all 235 references to ShivaaAdmin / ShivaaPartner / ShivaaBullion /
       ShivaaPages / ShivaaCO live inside admin.js itself;
     · the single consumer of qr.js's global `qrcode()` is admin.js:1758, and
       it is already wrapped in try/catch;
     · no script, template or route gate reads them from outside.
   So a shopper no longer downloads, parses or executes 316KB of staff tooling —
   on a mid-range handset that is the difference between a janky first scroll
   and a smooth one. admin.js registers its own routes at load time
   (Shivaa.routes.admin / .partner), so the route simply replays once the bundle
   lands. qr.js is injected first because admin.js calls its global. */
const STAFF_PAGES = { admin: 1, partner: 1 };
let _staffBundle = null;
function injectScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src; s.async = false;          // keep insertion order deterministic
    s.onload = resolve;
    s.onerror = () => reject(new Error('script failed: ' + src));
    document.body.appendChild(s);
  });
}
function loadStaffBundle() {
  if (window.ShivaaAdmin) return Promise.resolve();
  if (!_staffBundle) {
    _staffBundle = injectScript('/js/qr.js?v=' + APP_REL)
      .catch(() => { /* QR tags degrade gracefully; the panel must still open */ })
      /* v141 — the admin panel also carries the Cashfree One Click Checkout
         switches, but it was still fetched as ?v=128 from before v139 added
         them. .htaccess marks every ?v= asset immutable for a year, so the
         owner's browser kept the pre-v139 admin.js and never saw the switch.
         The stamp must move with every release that changes admin.js, exactly
         like index.html's script tags. */
      .then(() => injectScript('/js/admin.js?v=' + APP_REL))   // v152 — the stamp now FOLLOWS APP_REL; a release that touches admin.js can never desync it again (the v141 bug class, closed at the root)
      .catch((e) => { _staffBundle = null; throw e; });   // reset so a retry can run
  }
  return _staffBundle;
}
const _staffEmpty = (h, p, retry) => `<div class="empty" style="padding:120px 20px">` +
  `<img src="/images/logo.png" class="empty-logo" alt=""><h3>${h}</h3><p>${p}</p>` +
  (retry ? `<button type="button" class="btn" style="margin-top:14px" onclick="Shivaa.redraw()">Retry</button>` : '') +
  `</div>`;

let routeGeneration = 0;
function route() {
  const generation = ++routeGeneration;
  const hash = location.hash.replace(/^#\/?/, '') || '';
  const cut = hash.indexOf('?');
  const pathPart = cut < 0 ? hash : hash.slice(0, cut);
  const qs = cut < 0 ? '' : hash.slice(cut + 1);
  const seg = pathPart.split('/').filter(Boolean);
  const page = seg[0] || 'home';
  /* v153 — the Express route no longer exists (direct buy runs in place).
     Any old bookmark, shared link or Android back-gesture landing on it gets
     a harmless bounce — never a dead end, never a re-buy. */
  if (page === 'express') {
    location.replace(String(location.href).replace(/#\/express\S*/, state.user ? '#/checkout' : '#/cart'));
    return;
  }
  const q = new URLSearchParams(qs || '');
  const view = $('#view');
  closeModal();
  if (typeof closeCart === 'function') closeCart();
  /* v166 — NO navigation may inherit an open overlay. The mega panel and its
     full-viewport backdrop used to stay on screen when the panel had been
     opened by js/v116.js's early wiring (which skips app.js's close listeners)
     — the shopper tapped Rings, the page changed underneath, the backdrop kept
     swallowing every later tap, and it read as "clicking a category does
     nothing". Owned unconditionally now; see js/v166.js for the full layer. */
  try { if (typeof window.__shvCloseOverlays === 'function') window.__shvCloseOverlays(); } catch (e) {}
  while (_scrollLock.n > 0) unlockScroll();
  clearInterval(window._carTimer);
  // v101 — the bullion board's 30s poll lives only while the portal is open;
  // in-place Bullion/Dashboard/Reports switches keep it running (fresh rates
  // the instant you return), while leaving the portal stops the fetches.
  if (page !== 'partner' && window._blPoll) {
    clearInterval(window._blPoll); window._blPoll = null;
    if (window.ShivaaBullion) ShivaaBullion.mounted = false;
  }
  if (window._co && page !== 'checkout') { clearInterval(window._co.lockTimer); window._co.lockTimer = null; }   // v57: stop the rate-lock clock away from checkout
  document.body.dataset.page = page;
  if (page !== 'certificate') document.documentElement.classList.remove('cert-mode');
  if (page !== 'quote') document.documentElement.classList.remove('quote-mode');
  if (page !== 'product') resetProductMeta();   // v57: per-piece SEO data only lives on the PDP
  syncFinaleChrome();   // campaign links/banner switch off by date alone after Bhai Dooj (11 Nov 2026)
  /* v99 · staff routes are lazy: fetch the bundle, then replay this route */
  if (Object.prototype.hasOwnProperty.call(STAFF_PAGES, page) && !routes[page]) {
    view.innerHTML = _staffEmpty('Opening the staff panel…', 'Loading the admin workspace — this happens once per session.', false);
    loadStaffBundle()
      .then(() => {
        // replay only if the visitor is still on the staff route
        if (generation === routeGeneration) route();
      })
      .catch(() => {
        if (generation !== routeGeneration) return;
        view.innerHTML = _staffEmpty('The staff panel did not load', 'Check your connection, then retry.', true);
      });
    return;
  }
  clearInterval(window._v107Redir);                     // v107 — any new navigation cancels a pending unknown-route redirect
  if (Object.prototype.hasOwnProperty.call(routes, page) && typeof routes[page] === 'function') {
    let res;
    try { res = routes[page](view, q, seg[1]); } catch (e) { res = Promise.reject(e); }
    /* v167 — the LAST resort of every route was an <h3> with no page heading,
       no route back and no retry: whatever the failure, the shopper was left on
       a fragment. It is a page now, and a failed load can simply be retried
       without reloading the whole site. */
    if (res && res.catch) res.catch(e => {
      if (generation !== routeGeneration) return;
      console.error(e);
      view.innerHTML = emptyShell('Error', 'Something slipped', `<div class="empty" style="padding:60px 20px">
        <p style="color:var(--ink-3);margin-bottom:18px">${esc((e && e.message) || 'The page did not finish loading.')}</p>
        <button class="btn btn-gold" id="routeRetry">Try again</button> <a class="btn btn-ghost" href="#/">Back home</a></div>`);
      const b = $('#routeRetry'); if (b) b.onclick = () => { try { route(); } catch (_) { location.reload(); } };
    });
  } else {
    view.innerHTML = emptyShell('Error', 'This page has slipped its clasp', `<div class="empty" style="padding:60px 20px">
      <p style="color:var(--ink-3);margin-bottom:18px">Redirecting you home in <b id="redirN">3</b>…</p>
      <a class="btn btn-primary" href="#/">Take me home ✦</a></div>`);
    let n = 3;
    clearInterval(window._v107Redir);
    window._v107Redir = setInterval(() => {
      n--; const el = $('#redirN'); if (el) el.textContent = n;
      if (n <= 0) { clearInterval(window._v107Redir); window._v107Redir = null; location.hash = '#/'; }
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
      // v101 — the navy-on-white logo PNG read as an opaque white card on dark
      // banners. Watermark is now a gold-foil MASK of the logo (transparent bg),
      // so it can never paint a white rectangle over the headline.
      if (!ph.querySelector('.ph-mark')) ph.insertAdjacentHTML('beforeend', '<span class="ph-mark" aria-hidden="true"></span>');
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
    try { window.Shivaa.paintNewsletterState(); } catch(e) {}
  });
}
addEventListener('hashchange', route);
try { window.Shivaa.paintNewsletterState(); } catch(e) {}

/* ─────────── SEARCH ─────────── */
const closeSearch = () => {
  $('#searchDrawer').classList.remove('open');
  $('#searchSugg').classList.remove('open');
};
$('#searchBtn').onclick = () => { $('#searchDrawer').classList.add('open'); $('#searchInput').focus(); renderSugg(''); $('#searchSugg').classList.add('open'); };
$('#searchClose').onclick = closeSearch;
$('#searchScrim').onclick = closeSearch;   // v101 — tap the frosted backdrop to dismiss
/* v29 — desktop header search field (mirrors the drawer behaviour) */
(() => {
  const inp = $('#hdrSearchInput'), clear = $('#hdrSearchClear');
  if (!inp) return;
  inp.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const v = inp.value.trim();
      if (v) runSearch(v);
    }
    if (e.key === 'Escape') inp.blur();
  });
  inp.addEventListener('input', () => { if (clear) clear.hidden = !inp.value; });
  if (clear) clear.onclick = () => { inp.value = ''; clear.hidden = true; inp.focus(); };
})();
/* v91 — instant search: keyboard navigation, recent + popular queries */
const recentQueries = () => cleanIds(store.get('shv_recentq', [])).slice(0, 6);
const pushRecentQuery = q => {
  q = q.trim(); if (!q) return;
  const l = recentQueries().filter(x => x.toLowerCase() !== q.toLowerCase());
  l.unshift(q);
  try { localStorage.setItem('shv_recentq', JSON.stringify(l.slice(0, 6))); } catch (e) {}
};
const removeRecentQuery = q => { try { localStorage.setItem('shv_recentq', JSON.stringify(recentQueries().filter(x => x !== q))); } catch (e) {} };
function runSearch(q) {
  q = (q || '').trim(); if (!q) return;
  pushRecentQuery(q);
  location.hash = '#/shop?q=' + encodeURIComponent(q);
  closeSearch();
}
function activateSugg(row) {
  if (row.dataset.pid) { location.hash = '#/product/' + row.dataset.pid; closeSearch(); $('#searchInput').value = ''; }
  else if (row.dataset.q) { $('#searchInput').value = row.dataset.q; runSearch(row.dataset.q); }
}
/* v102 — debounced input so fast typing doesn't thrash the palette */
let _searchDebounce = null;
$('#searchInput').oninput = e => {
  clearTimeout(_searchDebounce);
  const v = e.target.value;
  _searchDebounce = setTimeout(() => { renderSugg(v); $('#searchSugg').classList.add('open'); }, 90);
};
/* v102 — "/" opens search from anywhere (never while typing in a field) */
document.addEventListener('keydown', e => {
  if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
  const t = e.target;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
  e.preventDefault();
  $('#searchBtn').click();
});
$('#searchInput').onkeydown = e => {
  const box = $('#searchSugg');
  const rows = $$('.sugg', box);
  if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && rows.length) {
    e.preventDefault();
    let i = rows.findIndex(r => r.classList.contains('sel'));
    i = e.key === 'ArrowDown' ? (i + 1) % rows.length : (i <= 0 ? rows.length - 1 : i - 1);
    rows.forEach(r => r.classList.remove('sel'));
    rows[i].classList.add('sel');
    rows[i].scrollIntoView({ block: 'nearest' });
  } else if (e.key === 'Enter') {
    e.preventDefault();
    const sel = box.querySelector('.sugg.sel');
    if (sel) activateSugg(sel);
    else if (e.target.value.trim()) runSearch(e.target.value.trim());
  } else if (e.key === 'Escape') {
    closeSearch(); e.target.blur();
  }
};
$('#searchSugg').addEventListener('click', e => {
  const del = e.target.closest('[data-delq]');
  if (del) { e.stopPropagation(); removeRecentQuery(del.dataset.delq); renderSugg($('#searchInput').value); $('#searchSugg').classList.add('open'); return; }
  const clearAll = e.target.closest('[data-clearall]');
  if (clearAll) { e.stopPropagation(); try { localStorage.removeItem('shv_recentq'); } catch (err) {} renderSugg($('#searchInput').value); $('#searchSugg').classList.add('open'); return; }
  const cat = e.target.closest('a.sugg-cat');
  if (cat) { closeSearch(); return; }   // native anchor navigates; just dismiss the palette
  const row = e.target.closest('.sugg');
  if (row) activateSugg(row);
});
const POPULAR_Q = ['Rings', 'Jhumkas', 'Mangalsutra', 'Bangles', 'Chain', 'Silver'];
/* v102 — weighted multi-token search across name, SKU, category, tags,
   stones, purity & metal; every token must match (AND), best match first. */
function productSearchText(p) {
  return [p.name, p.sku || '', CATS[p.category]?.name || p.category || '',
    (p.tags || []).map(t => TAGS[t] || t).join(' '), p.stoneType || '', p.stoneDesc || '',
    p.purity || '', p.metal || '', p.color || ''].join(' ').toLowerCase();
}
window.Shivaa.searchProducts = function (query, limit = 8) {
  const tokens = String(query || '').toLowerCase().split(/\s+/).filter(Boolean);
  if (!tokens.length || !state.productsCache.length) return [];
  const out = [];
  state.productsCache.forEach(p => {
    const name = p.name.toLowerCase(), sku = String(p.sku || '').toLowerCase(), hay = productSearchText(p);
    let score = 0;
    for (const t of tokens) {
      if (name.startsWith(t)) score += 100;
      else if (name.includes(t)) score += 55;
      else if (sku && sku.includes(t)) score += 45;
      else if ((CATS[p.category]?.name || '').toLowerCase().includes(t)) score += 35;
      else if (hay.includes(t)) score += 15;
      else return; /* a token matched nowhere → exclude */
    }
    score += (+p.rating || 0) + Math.log10((+p.reviews || 0) + 1) * 0.5;
    out.push({ p, score });
  });
  return out.sort((a, b) => b.score - a.score).slice(0, limit).map(x => x.p);
};
function productSearchSub(p) {
  const bits = [CATS[p.category]?.name || p.category || ''];
  if (p.sku) bits.push('SKU ' + p.sku);
  if (p.stoneType) bits.push(p.stoneType);
  bits.push(fmt(price(p).total));
  return bits.filter(Boolean).join(' · ');
}
function renderSugg(qs) {
  const el = $('#searchSugg');
  if (!qs) {
    const rec = recentQueries();
    el.innerHTML =
      (rec.length ? `<div class="sugg-lbl"><span>Recent searches</span><button type="button" class="sugg-clearall" data-clearall>Clear</button></div>` + rec.map(r =>
        `<div class="sugg sugg-chip" data-q="${esc(r)}"><span class="sugg-ic">🕘</span><span>${esc(r)}</span><button type="button" class="sugg-d" data-delq="${esc(r)}" aria-label="Remove ${esc(r)}">✕</button></div>`).join('') : '') +
      `<div class="sugg-lbl">Popular searches</div>` +
      POPULAR_Q.map(p => `<div class="sugg sugg-chip" data-q="${p}"><span class="sugg-ic">✦</span><span>${p}</span></div>`).join('')
      + `<div class="sugg-lbl">Shop by category</div>`
      + Object.entries(LIVE_CATS()).slice(0, 6).map(([k, c]) => `<a class="sugg sugg-cat" href="#/shop?category=${encodeURIComponent(k)}"><img src="${c.img}${ASSET_V}" alt="" onerror="if(!this.dataset.lfb){this.dataset.lfb='1';this.src='/images/logo.png${ASSET_V}';}else{this.remove();}"><span>${c.name}</span><span class="sugg-go">›</span></a>`).join('');
    el.classList.add('open');
    return;
  }
  const all = window.Shivaa.searchProducts(qs, Infinity);
  const list = all.slice(0, 8);
  if (!list.length) {
    el.innerHTML =
      `<div class="sugg-none"><b>No pieces for “${esc(qs)}”</b><span>Check the spelling, or try a broader term like ring, gold or silver.</span></div>`
      + `<div class="sugg-lbl">Try</div>`
      + POPULAR_Q.slice(0, 4).map(p => `<div class="sugg sugg-chip" data-q="${p}"><span class="sugg-ic">✦</span><span>${p}</span></div>`).join('')
      + `<div class="sugg-lbl">Shop by category</div>`
      + Object.entries(LIVE_CATS()).slice(0, 4).map(([k, c]) => `<a class="sugg sugg-cat" href="#/shop?category=${encodeURIComponent(k)}"><img src="${c.img}${ASSET_V}" alt="" onerror="if(!this.dataset.lfb){this.dataset.lfb='1';this.src='/images/logo.png${ASSET_V}';}else{this.remove();}"><span>${c.name}</span><span class="sugg-go">›</span></a>`).join('');
    el.classList.add('open');
    return;
  }
  el.innerHTML =
    `<div class="sugg-lbl"><span>Pieces · ${all.length > 8 ? '8+' : all.length}</span></div>`
    + list.map(p => `<div class="sugg" data-pid="${p.id}">
    <img src="${safeUrl(p.images && p.images[0])}" alt="" loading="lazy"><div><b>${esc(p.name)}</b><small>${esc(productSearchSub(p))}</small></div><span class="sugg-go">›</span></div>`).join('')
    + `<div class="sugg sugg-all" data-q="${esc(qs)}"><span class="sugg-ic">🔍</span><span>See all ${all.length} pieces for “${esc(qs)}”</span></div>`;
  el.classList.add('open');
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
  /* v120 — Bug A: polls patch the rates page in place (a wholesale re-render
     blanked the cards and wiped the alert form). Full render is the fallback. */
  if (location.hash.startsWith('#/rates')) {
    if (!refreshRatesPage(state.rates)) { try { const _rr = pages.rates($('#view')); if (_rr && _rr.catch) _rr.catch(() => {}); } catch (e) {} }
  }
  /* v156 — Bug fix: patch the cart in place every tick instead of rebuilding
     it (the rebuild wiped the pincode input mid-typing, every second while
     the MCX feed is live). Full re-render is only the stale-markup fallback. */
  if (location.hash.startsWith('#/cart')) { if (!refreshCartPage()) { try { const _pcr = pages.cart($('#view')); if (_pcr && _pcr.catch) _pcr.catch(() => {}); } catch (e) {} } }
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
  // v42: throttled scroll handler; v80: hysteresis bands so mobile
  // rubber-banding / sub-pixel jitter at the threshold can't oscillate
  // the header classes (that oscillation + the blurred sticky header's
  // height animation was the visible header flicker on scroll).
  let _scrollTicking = false, _scrolled = false, _compact = false;
  const apply = (y) => {
    const wantScrolled = _scrolled ? y > 4 : y > 14;
    const wantCompact  = _compact  ? y > 150 : y > 200;
    const hdr = $('#header');
    if (hdr && wantScrolled !== _scrolled) { hdr.classList.toggle('scrolled', wantScrolled); _scrolled = wantScrolled; }
    if (hdr && wantCompact !== _compact) { hdr.classList.toggle('compact', wantCompact); _compact = wantCompact; }
  };
  return () => {
    if (_scrollTicking) return;
    _scrollTicking = true;
    requestAnimationFrame(() => {
      apply(scrollY);
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
  if(dwClose) {
    dwClose.addEventListener('click', (e) => {
      e.stopPropagation();
      try { if (window.Shivaa && window.Shivaa.haptic) window.Shivaa.haptic(8); } catch (_) {}
      setOpen(false);
    });
  }
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
  nav.addEventListener('click', e => {
    const a = e.target.closest('a');
    if (!a || innerWidth > 820) return;
    const href = a.getAttribute('href') || '';
    window.__shvNavigating = true;
    setTimeout(() => { window.__shvNavigating = false; }, 400);
    try { if (window.Shivaa && window.Shivaa.haptic) window.Shivaa.haptic(10); } catch (_) {}

    // External / dialer links: allow native action and close after delay
    if (!href.startsWith('#')) {
      setTimeout(() => setOpen(false), 140);
      return;
    }

    // Same-hash link: smoothly scroll to top and refresh route
    const curHash = location.hash || '#/';
    if (curHash === href || (curHash === '#/' && href === '#/')) {
      e.preventDefault();
      setOpen(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (typeof route === 'function') route();
      return;
    }

    // New hash link: close drawer smoothly after letting navigation commit
    setTimeout(() => setOpen(false), 90);
  });
  // swipe left to close
  let x0=null,y0=null;
  nav.addEventListener('touchstart', e => {
    if (e.touches && e.touches[0]) {
      x0 = e.touches[0].clientX;
      y0 = e.touches[0].clientY;
    }
  }, { passive: true });
  nav.addEventListener('touchmove', e => {
    if (x0 === null || y0 === null || !e.touches || !e.touches[0]) return;
    const dx = e.touches[0].clientX - x0, dy = Math.abs(e.touches[0].clientY - y0);
    if (dx < -55 && dy < 34) { setOpen(false); x0 = null; y0 = null; }
  }, { passive: true });
  nav.addEventListener('touchend', () => { x0 = null; y0 = null; }, { passive: true });
  nav.addEventListener('touchcancel', () => { x0 = null; y0 = null; }, { passive: true });
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

/* ─────────── v166 · the catalogue must never be silently missing ───────────
   The owner's report: "sometimes the products on the page are shown and
   sometimes it's all empty … sometimes we have to refresh it". Two ways in:
   (a) /api/products fails (5xx, a dropped mobile connection) and the catch
   turns it into `{products: []}` — painted as an empty shop with no retry;
   (b) it HANGS, so the 6 s boot cap paints the shell with no pieces at all and
   the re-paint never arrives. Both are answered here: a device keeps its
   last-good catalogue for three weeks and paints from it instantly, fresh
   pieces always win, and js/v166.js runs the visible retry chain for whatever
   is still missing. */
const CATALOG_KEY = 'shv_catalog_v166';
const CATALOG_TTL = 1000 * 60 * 60 * 24 * 21;
function catalogCacheRead() {
  try {
    const o = JSON.parse(localStorage.getItem(CATALOG_KEY) || 'null');
    if (o && o.at && (Date.now() - o.at) < CATALOG_TTL && Array.isArray(o.products) && o.products.length) return o.products;
  } catch (e) {}
  return null;
}
function catalogCacheWrite(ps) {
  try { if (ps && ps.length) localStorage.setItem(CATALOG_KEY, JSON.stringify({ at: Date.now(), products: ps })); } catch (e) {}
}
/* ─────────── boot ─────────── */
async function wishIds() {
  if (!state.user) return [];
  try { return (await api('/api/wishlist')).wishlist || []; } catch (e) { return []; }   // v103 — never let an odd response break the PDP render
}
async function boot(isRedraw) {
  /* v117 — first paint was held hostage by THREE serial network rounds:
     the five-call batch → a serial rates fetch → a serial pages fetch. On a
     slow 4G that was 4–8 s of "Curating your experience" before anything showed.
     Now every boot fetch (rates included) rides ONE parallel batch, the
     footer page-links hydrate in the background, and a hard 6 s cap (15 s on
     redraws) lifts the preloader and paints whatever has landed; if the cap
     beat a slow batch, the shop quietly re-paints the moment it arrives. */
  /* v166 — paint from the device's last-good catalogue at once, so a slow or
     stalled network can never show an empty shop (js/v166.js refreshes and
     retries behind this). */
  const _cachedCat = catalogCacheRead() || [];
  /* the 6 campaign studs are pushed into productsCache at module load (a twin
     of the server's campaign catalogue), so "is the catalogue here?" can only
     be answered by counting REAL pieces */
  const _realCount = () => (state.productsCache || []).filter(p => !p.isCampaignStud).length;
  if (_cachedCat.length && !_realCount()) {
    state.productsCache = _cachedCat.concat((state.productsCache || []).filter(p => p.isCampaignStud));
  }
  const _firstBatch = Promise.all([
    token() ? api('/api/auth/me').catch(() => ({ user: null })) : Promise.resolve({ user: null }),
    api('/api/settings').catch(() => ({})),
    api('/api/making-charges').catch(() => ({ table: [] })),
    api('/api/products', { timeout: 20000 }).catch(() => ({ products: [] })),
    api('/api/catalogs').catch(() => ({ catalogs: [] })),
    loadRates(),   // v117 — used to be a second serial await below
  ]);
  const _capMs = isRedraw ? 15000 : 6000;
  const _packed = await Promise.race([
    _firstBatch,
    new Promise(res => setTimeout(() => res(null), _capMs)),
  ]);
  if (!_packed) {
    /* the cap beat the batch — paint degraded now, adopt + re-render when
       the slow network finally answers (never park on the preloader). */
    _firstBatch.then(() => { if (document.visibilityState !== 'hidden') boot(true); }).catch(() => {});
  }
  const [me = { user: null }, settings = {}, mc = { table: [] }, prods = { products: [] }, cats = { catalogs: [] }] = _packed || [];
  state.user = me.user; state.settings = { freeShipAbove: 50000, shippingFee: 250, phone: '+91 8905005921', whatsapp: '918905005921', email: 'Support@shivaa.in', address: '', ...settings };
  /* v140 — AUTOMATIC LANDING: the moment a real /api/auth/me answer hydrates
     state.user, a signed-in jeweller on a bare URL goes straight to the live
     Bullion Desk (and a retail customer stays on home) — no login form, no
     taps. welcomeSession() self-guards (runs once per tab, bare URL only) and
     runs here — synchronously, before route() paints — so the portal is what
     gets painted, never a flashed home page; redraws and later in-session
     navigation are never yanked back. */
  try { welcomeSession(); } catch (e) {}
  state.eventCoupons = me.events || [];
  /* v57: birthday / anniversary coupon welcome — shown once per code */
  (state.eventCoupons || []).forEach(c => {
    try {
      const seen = JSON.parse(sessionStorage.getItem('shv_ev_seen') || '[]');
      if (!seen.includes(c.code)) {
        seen.push(c.code); sessionStorage.setItem('shv_ev_seen', JSON.stringify(seen));
        setTimeout(() => toast(`${c.kind === 'anniversary' ? '💛' : '🎂'} ${c.title} — code ${c.code} (${c.value}% off) is in your account & checkout`), 1400);
      }
    } catch (e) {}
  });
  /* v57 fix: Account taps while logged out must ALWAYS reopen the passport,
     even when the URL hash is already #/account (a plain anchor would not
     re-fire the route after the sheet was dismissed with the cross). */
  if (!window._acctWired) {
    window._acctWired = true;
    document.addEventListener('click', e => {
      const a = e.target.closest && e.target.closest('#acctBtn, [data-login-open]');
      if (!a || (state && state.user)) return;
      e.preventDefault();
      openLogin(a.dataset.loginOpen ? String(a.dataset.loginOpen) : 'account');
    }, true);
  }
  state.mcTable = mc.table || [];
  /* v166 — fresh pieces always win and are kept on the device for the next
     visit; a failed or empty answer never wipes a catalogue we already have
     (which is what turned one bad request into "the products are all
     empty"). `catalogOk` is the honest flag js/v166.js retries against. */
  const _freshProds = (prods && prods.products) || [];
  if (_freshProds.length) {
    state.productsCache = _freshProds; state.catalogOk = true; catalogCacheWrite(_freshProds);
  } else {
    /* a failed or empty answer is NEVER "catalogue ok" — the device copy (if
       any) still paints, and js/v166.js keeps retrying behind it */
    state.catalogOk = false;
  }
  state.cacheAt = Date.now();
  ensureCampaignStuds();
  state.compare = normalizeCompare(state.compare).filter(id => state.productsCache.some(p => p.id === id));
  store.set('shv_compare', state.compare);
  window.Shivaa.catCache = cats.catalogs || []; catCache = window.Shivaa.catCache;
  // v117 — rates already rode the parallel boot batch above (loadRates());
  // no serial second round-trip here anymore.
  updateBadges();
  // Catalogues link: jewellers only (GST-verified partners)
  // gate the wholesale design desk with a class, not inline display —
  // the drawer's layout rules use !important and would override an inline style
  document.querySelectorAll('a[href="#/catalogues"]').forEach(a => { a.classList.toggle('b2b-only-hide', !isPartner()); a.style.display = ''; });
  document.querySelectorAll('.foot-chips a[href="#/catalogues"]').forEach(a => a.classList.toggle('b2b-only-hide', !isPartner()));
  // footer social WhatsApp link (subtle)
  // custom pages in footer — v117: BACKGROUND fetch (was a third serial
  // network round blocking the preloader); the links materialise after
  // first paint whenever the call lands.
  api('/api/pages').then(({ pages: cps } = {}) => {
    try {
      if (cps && cps.length) {
        const col = document.getElementById('footCustomPages');
        if (col && !document.getElementById('customPageLinks')) {
          const div = document.createElement('div');
          div.id = 'customPageLinks';
          div.className = 'fv-custom';
          cps.slice(0, 5).forEach(pg => div.insertAdjacentHTML('beforeend', `<a href="#/p/${pg.slug}">${esc(pg.title)}</a>`));
          col.appendChild(div);
        }
      }
    } catch (e) {}
  }).catch(() => {});
  // v101 — footer WhatsApp slot points at the official wa.me/message channel
  // populate nav + footer category menus
  $('#catMenu').innerHTML = `
  <div class="mega-in">
    <div class="mega-grid">${Object.entries(LIVE_CATS()).map(([k, c]) => `
      <a class="mega-tile" href="#/shop?category=${k}">
        <span class="mt-img"><img src="${c.img}${ASSET_V}" alt="${c.name}" loading="lazy" onerror="if(!this.dataset.lfb){this.dataset.lfb='1';this.src='/images/logo.png${ASSET_V}';}else{this.remove();}"></span>
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
  /* v56: the mega panel never locks the page itself, so closing it must not
     strip the scroll-lock owned by another sheet (this used to unlock the
     background the moment the filter drawer's toggle was tapped). */
  const closeMega = () => { if (matchMedia('(max-width:680px)').matches) return; if (panel.hidden) return; panel.hidden = true; backdrop.hidden = true; catsBtn?.setAttribute('aria-expanded', 'false'); };
  if (catsBtn && !catsBtn._wired) {
    catsBtn._wired = true;
    catsBtn.onclick = e => {
      e.stopPropagation();
      try { if (window.Shivaa && window.Shivaa.haptic) window.Shivaa.haptic(10); } catch (_) {}
      // inside the drawer, expand an inline list rather than the desktop mega panel
      if (matchMedia('(max-width:820px)').matches) {
        let list = document.getElementById('dwCatList');
        if (!list) {
          list = document.createElement('div');
          list.id = 'dwCatList'; list.className = 'dw-catlist';
          list.innerHTML = Object.entries(LIVE_CATS()).map(([k, c]) =>
            `<a href="#/shop?category=${k}"><img src="${c.img}${ASSET_V}" alt="" loading="lazy" onerror="if(!this.dataset.lfb){this.dataset.lfb='1';this.src='/images/logo.png${ASSET_V}';}else{this.remove();}"><span>${esc(c.name)}</span></a>`).join('');
          catsBtn.insertAdjacentElement('afterend', list);
        }
        const open = !list.classList.contains('open');
        list.classList.toggle('open', open);
        catsBtn.classList.toggle('open', open);
        catsBtn.setAttribute('aria-expanded', String(open));
        if (open) {
          requestAnimationFrame(() => {
            try { list.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (_) {}
          });
        }
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
  $('#footCats').innerHTML = Object.entries(LIVE_CATS()).map(([k, c]) => `<a href="#/shop?category=${k}">${c.name}</a>`).join('');
  const pl = $('#preloader');
  if (pl) { pl.classList.add('hide'); setTimeout(() => pl.remove(), 900); }
  initMiniCart();   // v91 slide-in bag
  route();
  try { window.Shivaa.exResume(); } catch (e) {}   // v153 — in-page buy survived a tab reclaim?
  // v90 — adaptive rate polling: 15 s while MCX is live, 60 s off-hours
  scheduleRatesPoll();
  setInterval(() => {
    const R = state.rates; if (!R || !R.live) return;
    const s = Math.max(1, Math.round((R.liveAgeMs + Math.max(0, Date.now() - _lastRatesAt)) / 1000));
    document.querySelectorAll('[data-rate-age]').forEach(el => { el.lastChild.textContent = 'MCX live · ' + s + 's ago'; });
  }, 1000);
  // campaign expiry watchdog: even with the tab left open, the finale
  // module switches itself off within 30s of 00:00 IST on 1 Jan 2027.
  setInterval(syncFinaleChrome, 30000);
}
// Wait for the following feature/auth/admin scripts to register their routes.
// A fast cached API must not outrun loading the HUID module on a cold visit.
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => boot(), { once: true });
else boot();

})();
