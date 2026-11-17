/* =====================================================================
   Shivaa Jewels — SHIVAA.IN E-COMMERCE TWO-WAY SYNC (sj-ecom.js · v253)
   Connects your Shivaa Jewels billing software directly to shivaa.in
   through shivaa-connector.php (+ shivaa-hooks.php):
   • Har naya Pakka GST sale bill save hote hi uska asli Signature/Royal
     A4 PDF customer ke shivaa.in → My Bills profile mein apne-aap jata hai
   • Kisi bhi purane bill / estimate ki window mein "🌐 Shivaa.in par bhejo"
     button — ek tap mein bhejein ya update karein
   • Bill delete hone par shivaa.in se bhi apne-aap hat jata hai (void)
   • shivaa.in ke naye Customers (Retail + B2B Wholesale), Leads (CRM) aur
     Online Orders apne-aap Parties / CRM mein aate hain (60s auto-sync)
   • shivaa.in ka live Gold 24K (₹/10g) aur Silver 999 (₹/kg) bhav ek tap mein
   • Practice mode mein kabhi bhi asli website par kuch nahi bhejta
   ===================================================================== */
(function () {
  'use strict';
  if (typeof VIEWDEF === 'undefined' || typeof S === 'undefined') return;

  const ENDPOINT = 'shivaa-connector.php';
  const SYNC_MS = 60000;
  const MAX_PDF_BYTES = 5500000; // stays comfortably under 8 MB PDF & Hostinger post_max_size caps
  const COL = 'ecomBills';
  const ORD_COL = 'ecomOrders';
  const LS_CFG = 'sj-ecom-cfg';
  const LS_SEEN = 'sj-ecom-seen';

  /* Register synced-bill & online-order collections across all phones/PCs (AES-256 via sj-api.php). */
  [COL, ORD_COL].forEach(c => {
    if (typeof COLS !== 'undefined' && Array.isArray(COLS) && !COLS.includes(c)) COLS.push(c);
    if (!Array.isArray(S[c])) S[c] = [];
    if (typeof AUDIT_SKIP !== 'undefined' && AUDIT_SKIP && typeof AUDIT_SKIP.add === 'function') {
      AUDIT_SKIP.add(c);
    }
  });

  /* ---------------- safe helpers ---------------- */
  const isPractice = () => !!window.SJ_PRACTICE;
  const me = () => window.SJ_USER || (window.SJ_AI ? null : { id: 'owner', name: 'Owner', uname: 'owner', role: 'owner' });
  const role = () => (me() && me().role) || 'viewer';
  const authed = () => !window.SJ_AI || !!(window.SJ_USER && (window.SJ_USER.id || window.SJ_USER.uname));
  const canWrite = () => authed() && !isPractice() && role() !== 'viewer';
  const canAdmin = () => authed() && !isPractice() && (role() === 'owner' || role() === 'manager');
  const q$ = (sel, root) => (root || document).querySelector(sel);
  const escH = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
  const n = v => { const x = typeof num === 'function' ? num(v) : parseFloat(v); return Number.isFinite(x) ? x : 0; };
  const fmtInr = v => {
    try { if (typeof inr === 'function') return inr(n(v)); } catch (e) { /* fallback */ }
    return '₹' + Math.round(n(v)).toLocaleString('en-IN');
  };
  const today = () => {
    try { if (typeof todayStr === 'function') return todayStr(); } catch (e) { /* fallback */ }
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };
  const notify = (msg, kind) => {
    try { if (typeof toast === 'function') { toast(msg, kind); return; } } catch (e) { /* fallback */ }
    console.log('[shivaa.in]', msg);
  };
  const normPhone = raw => {
    const d = String(raw || '').replace(/\D/g, '');
    const p = d.length >= 10 ? d.slice(-10) : '';
    return /^[6-9]\d{9}$/.test(p) ? p : '';
  };
  const cleanId = s => String(s || '').replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 48);
  const firmPatch = col => {
    try {
      if (typeof FIRM_COLS !== 'undefined' && Array.isArray(FIRM_COLS) && FIRM_COLS.includes(col) && typeof activeFirm === 'function') {
        const f = activeFirm();
        if (f) return { firmId: f };
      }
    } catch (e) { /* ignore */ }
    return {};
  };
  const allRows = col => {
    try {
      if (typeof RAW !== 'undefined' && RAW && Array.isArray(RAW[col])) return RAW[col];
    } catch (e) { /* ignore */ }
    return Array.isArray(S[col]) ? S[col] : [];
  };
  const getSettings = () => {
    try { if (typeof settings === 'function') return settings() || {}; } catch (e) { /* ignore */ }
    return S.settings || {};
  };
  const lsRead = (k, fb) => { try { return JSON.parse(localStorage.getItem(k) || 'null') || fb; } catch (e) { return fb; } };
  const lsWrite = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } };

  function cfg() {
    const local = lsRead(LS_CFG, {});
    const shared = (S.settings && S.settings.ecom) || {};
    return {
      autoBills: true,      // Pakka GST sale bills -> shivaa.in/#/my-bills automatically
      autoKacha: false,     // Kacha / estimate bills -> only when enabled or sent manually
      autoStock: true,      // Deduct matching SKU stock on shivaa.in for new sale bills
      autoCustomers: true,  // Import shivaa.in customers into S.customers automatically
      autoLeads: true,      // Import shivaa.in enquiries/leads into S.leads (CRM) automatically
      ...local,
      ...shared,
    };
  }

  async function updateCfg(patch) {
    const next = { ...cfg(), ...patch };
    lsWrite(LS_CFG, next);
    if (canAdmin() && typeof saveSettings === 'function') {
      try { await saveSettings({ ...S.settings, ecom: next }); } catch (e) { console.warn('[shivaa.in] saveSettings', e); }
    }
    paintCard();
  }

  /* ---------------- connector HTTP helper ---------------- */
  async function api(action, opts) {
    opts = opts || {};
    const method = opts.method || (opts.body || opts.form ? 'POST' : 'GET');
    const qs = new URLSearchParams({ action, ...(opts.query || {}) }).toString();
    const ctl = new AbortController();
    const tm = setTimeout(() => ctl.abort(), opts.timeout || 25000);
    try {
      const init = {
        method,
        credentials: 'same-origin',
        cache: 'no-store',
        signal: ctl.signal,
        headers: { Accept: 'application/json' },
      };
      if (opts.form) {
        init.body = opts.form;
      } else if (opts.body !== undefined && method !== 'GET') {
        init.headers['Content-Type'] = 'application/json';
        init.body = JSON.stringify(opts.body);
      }
      const res = await fetch(ENDPOINT + '?' + qs, init);
      const txt = await res.text();
      let j = null;
      try { j = JSON.parse(txt); } catch (e) { /* non-json */ }
      if (!res.ok || !j || j.ok === false) {
        const msg = (j && (j.error || (j.data && j.data.error))) || ('HTTP ' + res.status);
        const err = new Error(msg);
        err.status = res.status;
        err.data = j;
        throw err;
      }
      return j;
    } finally {
      clearTimeout(tm);
    }
  }

  /* ---------------- state ---------------- */
  const STATE = {
    tab: 'overview',
    ping: null,
    pingErr: '',
    rates: null,
    customers: [],
    leads: [],
    orders: [],
    lastSyncAt: 0,
    syncing: false,
    importedCust: 0,
    importedLeads: 0,
    caughtUp: false,
  };
  const inflightBills = new Set();

  function billRec(invId) {
    return allRows(COL).find(x => x && (x.invId === invId || x.id === 'eb_' + invId)) || null;
  }

  async function saveBillRec(invId, patch) {
    const prev = billRec(invId) || { id: 'eb_' + invId, invId };
    const row = { ...prev, ...patch, id: 'eb_' + invId, invId, updatedAt: Date.now() };
    if (typeof save === 'function' && !isPractice()) {
      try { await save(COL, row, { quiet: true }); return row; } catch (e) { console.warn('[shivaa.in] save ecomBills', e); }
    }
    const i = S[COL].findIndex(x => x && x.id === row.id);
    if (i >= 0) S[COL][i] = row; else S[COL].push(row);
    return row;
  }

  /* =================================================================
     1. PUSH SALE BILL PDF -> shivaa.in/#/my-bills (+ SKU stock)
     ================================================================= */
  function partyFor(inv) {
    if (!inv || !inv.partyId) return null;
    try { if (typeof custById === 'function') { const c = custById(inv.partyId); if (c) return c; } } catch (e) { /* ignore */ }
    return allRows('customers').find(c => c && c.id === inv.partyId) || null;
  }

  function billAmount(inv) {
    try { if (typeof invPayable === 'function') { const a = n(invPayable(inv)); if (a > 0) return Math.round(a * 100) / 100; } } catch (e) { /* ignore */ }
    const t = (inv && inv.totals) || {};
    return Math.round(n(t.payable || t.grand || t.itemsTotal || inv.amount) * 100) / 100;
  }

  function billItems(inv) {
    return (Array.isArray(inv && inv.items) ? inv.items : [])
      .filter(it => it && (it.name || it.item || it.category || it.sku || n(it.amount) > 0))
      .map(it => {
        const prod = it.productId ? allRows('products').find(p => p && p.id === it.productId) : null;
        const sku = String(it.sku || (prod && prod.sku) || '').trim();
        const label = [it.name || it.item || it.category || (prod && prod.name) || 'Jewellery', it.purity || '']
          .filter(Boolean).join(' ').trim();
        return {
          sku,
          name: label.slice(0, 120),
          purity: String(it.purity || ''),
          huid: String(it.huid || ''),
          weightG: Math.round((n(it.net) || n(it.gross)) * 1000) / 1000,
          qty: Math.max(1, Math.round(n(it.pcs || it.qty) || 1)),
          amount: Math.round(n(it.amount) * 100) / 100,
        };
      });
  }

  function shouldAutoPush(inv) {
    if (!inv || inv.deleted || !canWrite()) return false;
    try { if (typeof isBuy === 'function' && isBuy(inv.type)) return false; } catch (e) { /* ignore */ }
    const c = cfg();
    const isKacha = inv.type === 'estimate' || inv.quality === 'kacha';
    if (inv.type === 'sale' && !isKacha) return c.autoBills !== false;
    if (isKacha && (inv.type === 'sale' || inv.type === 'estimate')) return !!c.autoKacha;
    return false;
  }

  async function buildInvoicePdfBlob(inv) {
    if (typeof invoicePdf !== 'function') throw new Error('invoicePdf function nahi mila');
    let blob = await invoicePdf(inv);
    if (blob && blob.size > MAX_PDF_BYTES && window.SJ_BILLX && typeof window.SJ_BILLX.signatureInvoicePdf === 'function') {
      try {
        const lite = await window.SJ_BILLX.signatureInvoicePdf(inv, { lite: true });
        if (lite && lite.size > 0 && lite.size < blob.size) blob = lite;
      } catch (e) { console.warn('[shivaa.in] lite pdf fallback', e); }
    }
    if (!blob || !blob.size) throw new Error('Bill PDF khali bana');
    return blob;
  }

  async function pushInvoicePdf(inv, opts) {
    opts = opts || {};
    if (!inv || !inv.id) return { ok: false, error: 'Bill nahi mila' };
    if (isPractice()) {
      if (!opts.auto) notify('Practice mode mein bill shivaa.in par nahi jaata', 'err');
      return { ok: false, error: 'practice' };
    }
    if (!canWrite()) {
      if (!opts.auto) notify('Sirf Owner / Manager / Staff bill bhej sakte hain', 'err');
      return { ok: false, error: 'forbidden' };
    }
    if (inflightBills.has(inv.id)) return { ok: false, error: 'busy' };

    const party = partyFor(inv);
    const phone = normPhone(inv.partyPhone || (party && party.phone));
    if (!phone) {
      if (!opts.auto) notify('Customer ka 10-digit mobile number zaroori hai shivaa.in profile se jodne ke liye', 'err');
      return { ok: false, error: 'missing_phone' };
    }

    inflightBills.add(inv.id);
    try {
      const blob = await buildInvoicePdfBlob(inv);
      const s = getSettings();
      const storeName = s.city ? ((s.firm || 'Shivaa Jewels') + ' · ' + s.city) : (s.firm || 'Shivaa Jewels');
      const billNo = String(inv.no || inv.id).trim();
      const custName = String(inv.partyName || (party && party.name) || 'Customer').trim();
      const email = String(inv.partyEmail || (party && party.email) || '').trim();
      const items = billItems(inv);
      const safeFile = (billNo + '_' + custName).replace(/[^A-Za-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60) || 'Shivaa_Bill';

      const fd = new FormData();
      fd.append('externalId', String(inv.id));
      fd.append('billNo', billNo);
      fd.append('billDate', String(inv.date || today()).slice(0, 10));
      fd.append('store', storeName);
      fd.append('customerName', custName);
      fd.append('phone', phone);
      if (email) fd.append('email', email);
      fd.append('amount', String(billAmount(inv)));
      fd.append('items', JSON.stringify(items));
      if (inv.notes) fd.append('notes', String(inv.notes).slice(0, 400));
      if (opts.adjustStock && items.some(it => it.sku)) fd.append('adjustStock', '1');
      fd.append('file', blob, safeFile + '.pdf');

      const res = await api('push_bill', { method: 'POST', form: fd, timeout: 45000 });
      const data = res.data || res;
      const bill = data.bill || {};
      await saveBillRec(inv.id, {
        invNo: billNo,
        billId: bill.id || data.id || '',
        phone,
        customerName: custName,
        amount: billAmount(inv),
        matchedUser: !!(data.matchedUser || bill.userId),
        syncedAt: Date.now(),
        voidedAt: 0,
        by: (me() && me().name) || '',
      });
      refreshOpenBillButton(inv.id);
      paintCard();
      notify(
        data.matchedUser
          ? '✓ Bill ' + billNo + ' customer ke shivaa.in My Bills mein chala gaya'
          : '✓ Bill ' + billNo + ' shivaa.in par save — ' + phone + ' login karte hi My Bills mein dikhega'
      );
      return { ok: true, data };
    } catch (err) {
      console.error('[shivaa.in] push_bill failed:', err);
      notify('⚠ Shivaa.in bill sync ruka (' + (inv.no || '') + '): ' + (err.message || 'error'), 'err');
      return { ok: false, error: err.message || 'error' };
    } finally {
      inflightBills.delete(inv.id);
    }
  }

  async function voidSyncedBill(invId, invNo) {
    if (!invId || !canWrite()) return;
    const rec = billRec(invId);
    if (!rec || !rec.syncedAt || rec.voidedAt) return;
    try {
      await api('void_bill', {
        method: 'POST',
        body: { externalId: String(invId), reason: 'Cancelled/deleted in Shivaa Jewels billing software' },
      });
      await saveBillRec(invId, { voidedAt: Date.now() });
      paintCard();
      notify('✓ Bill ' + (invNo || rec.invNo || '') + ' shivaa.in My Bills se bhi hata diya');
    } catch (err) {
      if (err && err.status === 404) {
        await saveBillRec(invId, { voidedAt: Date.now() });
        return;
      }
      console.warn('[shivaa.in] void_bill failed:', err);
    }
  }

  /* Hook persistInvoice -> auto-send PDF on save. */
  if (typeof persistInvoice === 'function') {
    const origPersist = persistInvoice;
    // eslint-disable-next-line no-global-assign
    persistInvoice = async function (st) {
      const isEdit = !!(st && st.orig && st.orig.id);
      const r = await origPersist.apply(this, arguments);
      try {
        const inv = r && r.inv ? r.inv : null;
        if (inv && !r.error && shouldAutoPush(inv)) {
          const adjustStock = !isEdit && cfg().autoStock !== false;
          setTimeout(() => { pushInvoicePdf(inv, { auto: true, adjustStock }); }, 300);
        }
      } catch (e) { console.error('[shivaa.in] persistInvoice hook', e); }
      return r;
    };
  }

  /* Hook deleteInvoice / removeDoc / save -> auto-void cancelled/deleted bills on shivaa.in. */
  if (typeof removeDoc === 'function') {
    const origRemoveDoc = removeDoc;
    // eslint-disable-next-line no-global-assign
    removeDoc = async function (col, id) {
      const prev = col === 'invoices' ? allRows('invoices').find(x => x && x.id === id) : null;
      const r = await origRemoveDoc.apply(this, arguments);
      try {
        if (r !== false && col === 'invoices' && id) {
          setTimeout(() => { voidSyncedBill(id, prev && prev.no); }, 200);
        }
      } catch (e) { console.error('[shivaa.in] removeDoc hook', e); }
      return r;
    };
  }
  if (typeof save === 'function') {
    const origSave = save;
    // eslint-disable-next-line no-global-assign
    save = async function (col, obj, o) {
      const r = await origSave.apply(this, arguments);
      try {
        if (r && col === 'invoices' && obj && obj.deleted && obj.id) {
          setTimeout(() => { voidSyncedBill(obj.id, obj.no); }, 200);
        }
      } catch (e) { console.error('[shivaa.in] save void hook', e); }
      return r;
    };
  }

  /* Hook openInvoiceView -> add "🌐 Shivaa.in par bhejo" button in every bill modal. */
  function billBtnLabel(invId) {
    const rec = billRec(invId);
    return rec && rec.syncedAt && !rec.voidedAt ? '✓ Shivaa.in · Update' : '🌐 Shivaa.in par bhejo';
  }
  function refreshOpenBillButton(invId) {
    const raw = String(invId);
    const idSel = (typeof CSS !== 'undefined' && CSS.escape) ? CSS.escape(raw) : raw.replace(/[^A-Za-z0-9_-]/g, '\\$&');
    const btn = q$('[data-act="sje-push-bill"][data-id="' + idSel + '"]');
    if (!btn) return;
    const rec = billRec(invId);
    btn.textContent = billBtnLabel(invId);
    btn.classList.toggle('sje-sent', !!(rec && rec.syncedAt && !rec.voidedAt));
  }
  if (typeof openInvoiceView === 'function') {
    const origView = openInvoiceView;
    // eslint-disable-next-line no-global-assign
    openInvoiceView = function (id) {
      const r = origView.apply(this, arguments);
      try {
        if (!canWrite()) return r;
        const v = allRows('invoices').find(x => x && x.id === id);
        if (!v || v.type === 'oldgold' || (typeof isBuy === 'function' && isBuy(v.type))) return r;
        const root = q$('#modal-root');
        const el = root && root.lastElementChild;
        const anchor = el && (q$('.m-foot [data-act="inv-pdf"]', el) || q$('.m-foot button', el));
        if (anchor && !q$('[data-act="sje-push-bill"]', el)) {
          const rec = billRec(v.id);
          const cls = 'btn sje-bill-btn' + (rec && rec.syncedAt && !rec.voidedAt ? ' sje-sent' : '');
          anchor.insertAdjacentHTML(
            'beforebegin',
            '<button type="button" class="' + cls + '" data-act="sje-push-bill" data-id="' + escH(v.id) + '" title="Customer ke shivaa.in → My Bills profile mein PDF bhejein">' + escH(billBtnLabel(v.id)) + '</button>'
          );
        }
      } catch (e) { console.error('[shivaa.in] openInvoiceView hook', e); }
      return r;
    };
  }

  /* =================================================================
     2. PULL CUSTOMERS, LEADS & ORDERS FROM SHIVAA.IN INTO S.*
     ================================================================= */
  function fullAddress(c) {
    const d = (c && c.defaultAddress) || {};
    return [c.address || d.line || d.address || '', c.city || d.city || '', c.state || d.state || '', c.pincode || d.pincode || '']
      .map(s => String(s || '').trim())
      .filter(Boolean)
      .filter((v, i, a) => a.indexOf(v) === i)
      .join(', ');
  }

  async function importCustomerRecord(c, opts) {
    if (!c || typeof save !== 'function' || !canWrite()) return false;
    const phone = normPhone(c.phone);
    const ecomId = String(c.id || '').trim();
    if (!phone && !ecomId) return false;
    const name = String(c.name || c.firm || c.contactPerson || (phone ? 'Shivaa.in ' + phone : '')).trim();
    if (!name) return false;

    const list = allRows('customers');
    const detId = 'ec_' + cleanId(ecomId || phone);
    const existing = list.find(x => x && (
      x.id === detId ||
      (ecomId && x.ecomId === ecomId) ||
      (phone && normPhone(x.phone) === phone)
    ));

    const pin = String(c.pincode || (c.defaultAddress && c.defaultAddress.pincode) || '').replace(/\D/g, '').slice(0, 6);
    const city = String(c.city || (c.defaultAddress && c.defaultAddress.city) || '').trim();
    const state = String(c.state || (c.defaultAddress && c.defaultAddress.state) || '').trim();
    const addr = fullAddress(c);
    const email = String(c.email || '').trim();
    const gstin = String(c.gstin || '').trim().toUpperCase();
    const pan = String(c.pan || '').trim().toUpperCase();
    const dob = String(c.dob || '').slice(0, 10);
    const anniv = String(c.anniversary || '').slice(0, 10);
    const isB2B = c.role === 'partner' || !!c.firm || !!gstin;
    const tagBits = [
      'shivaa.in customer',
      c.blackMember ? ('Shivaa Black ' + (c.blackCardNo || '')).trim() : '',
      c.firm && c.contactPerson ? ('Contact: ' + c.contactPerson) : '',
    ].filter(Boolean).join(' · ');

    if (!existing) {
      const now = Date.now();
      const firm = String(c.firm || '').trim();
      const person = String(c.contactPerson || c.name || '').trim();
      const doc = {
        id: detId,
        ...firmPatch('customers'),
        name: firm || name,
        phone,
        phones: phone ? [phone] : [],
        contact: firm && person ? person : '',
        email,
        address: addr,
        city,
        state,
        pin,
        gstin,
        pan,
        dob,
        anniv,
        ptype: isB2B ? 'B2B' : 'Retail',
        creditLimit: isB2B ? 500000 : 0,
        creditDays: 0,
        margins: [],
        wastage: [],
        source: 'shivaa.in',
        notes: tagBits,
        ecomId: ecomId || detId,
        createdAt: Date.parse(c.createdAt || '') || now,
        updatedAt: now,
      };
      const ok = await save('customers', doc, { quiet: true });
      if (ok && opts && opts.toastOne) notify('✓ ' + doc.name + ' Parties mein jud gaya');
      return !!ok;
    }

    /* Enrich only empty fields on existing showroom customer — never overwrite staff edits. */
    const patch = {};
    if (ecomId && !existing.ecomId) patch.ecomId = ecomId;
    if (email && !existing.email) patch.email = email;
    if (addr && !existing.address) patch.address = addr;
    if (city && !existing.city) patch.city = city;
    if (state && !existing.state) patch.state = state;
    if (pin && !existing.pin) patch.pin = pin;
    if (gstin && !existing.gstin) patch.gstin = gstin;
    if (pan && !existing.pan) patch.pan = pan;
    if (dob && !existing.dob) patch.dob = dob;
    if (anniv && !existing.anniv && !existing.anniversary) { patch.anniv = anniv; patch.anniversary = anniv; }
    if (!Object.keys(patch).length) return false;
    await save('customers', { ...existing, ...patch, updatedAt: Date.now() }, { quiet: true });
    return true;
  }

  async function importLeadRecord(ld) {
    if (!ld || typeof save !== 'function' || !canWrite()) return false;
    if (typeof COLS === 'undefined' || !Array.isArray(COLS) || !COLS.includes('leads') || !Array.isArray(S.leads)) return false;
    const leadId = String(ld.leadId || '').trim();
    if (!leadId) return false;
    const detId = 'ecl_' + cleanId(leadId);
    const list = allRows('leads');
    if (list.some(x => x && (x.id === detId || x.ecomLeadId === leadId))) return false;

    const phone = normPhone(ld.phone);
    const name = String(ld.name || (phone ? 'Website Enquiry ' + phone : ld.email || 'shivaa.in Lead')).trim();
    const createdMs = Date.parse(ld.createdAt || '') || Date.now();
    const noteParts = [
      ld.summary || '',
      ld.message && String(ld.summary || '').indexOf(ld.message) < 0 ? ld.message : '',
      ld.budget ? 'Budget: ' + ld.budget : '',
      ld.gstin ? 'GSTIN: ' + ld.gstin : '',
    ].filter(Boolean).join(' · ');

    const meta = (ld && ld.meta) || {};
    const firm = String(meta.firm || '').trim();
    const isB2B = ld.channel === 'partner_application' || ld.channel === 'metal_exchange' || !!firm || !!ld.gstin;
    const createdYmd = String(ld.createdAt || '').slice(0, 10) || today();
    const nextYmd = (() => {
      try { if (typeof addDays === 'function') return addDays(today(), 1); } catch (e) { /* ignore */ }
      const d = new Date(Date.now() + 86400000);
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    })();
    const leadNo = (() => {
      try { if (typeof nextNo === 'function') return nextNo('leads', 'LD-'); } catch (e) { /* ignore */ }
      return 'LD-W' + cleanId(leadId).slice(-5).toUpperCase();
    })();
    const doc = {
      id: detId,
      ...firmPatch('leads'),
      no: leadNo,
      name,
      firm,
      phone,
      whatsapp: phone,
      email: String(ld.email || '').trim(),
      city: String(ld.city || '').trim(),
      address: String(meta.address || '').trim(),
      gstin: String(ld.gstin || '').trim().toUpperCase(),
      ptype: isB2B ? 'B2B' : 'Retail',
      stage: 'new',
      source: 'Website',
      value: n(ld.amount) > 0 ? n(ld.amount) : '',
      nextDate: nextYmd,
      nextAction: 'Call',
      notes: noteParts.slice(0, 650),
      activities: [{
        id: 'la_' + cleanId(leadId).slice(-8),
        type: 'note',
        date: createdYmd,
        note: ('[shivaa.in · ' + String(ld.channel || 'website').replace(/_/g, ' ') + '] ' + (ld.summary || ld.message || 'New website enquiry')).slice(0, 300),
        by: 'shivaa.in',
      }],
      ecomLeadId: leadId,
      ecomChannel: String(ld.channel || 'website'),
      createdAt: createdMs,
      updatedAt: Date.now(),
    };
    return !!(await save('leads', doc, { quiet: true }));
  }

  function announceNewActivity(orders, leads, firstLoad) {
    const seen = lsRead(LS_SEEN, { orders: [], leads: [], primed: false });
    const ordSet = new Set(seen.orders || []);
    const leadSet = new Set(seen.leads || []);
    let newOrd = 0, newLead = 0;
    orders.forEach(o => {
      const k = String(o && o.id || '');
      if (!k || ordSet.has(k)) return;
      ordSet.add(k);
      newOrd++;
    });
    leads.forEach(l => {
      const k = String(l && l.leadId || '');
      if (!k || leadSet.has(k)) return;
      leadSet.add(k);
      newLead++;
    });
    lsWrite(LS_SEEN, {
      primed: true,
      orders: [...ordSet].slice(-500),
      leads: [...leadSet].slice(-500),
    });
    if (!seen.primed || firstLoad) return;
    if (newOrd > 0) notify('🛍 shivaa.in par ' + newOrd + ' naya online order aaya!');
    else if (newLead > 0) notify('📩 shivaa.in se ' + newLead + ' nayi customer enquiry aayi!');
  }

  async function syncAll(opts) {
    opts = opts || {};
    if (!authed() || STATE.syncing) return;
    if (document.hidden && !opts.manual) return;
    STATE.syncing = true;
    paintCard();
    try {
      /* Catch up any missed webhook events from shivaa.in on first open or manual Sync Now. */
      if ((opts.manual || !STATE.caughtUp) && canWrite()) {
        try { await api('catchup', { method: 'POST', query: { limit: 200 }, timeout: 25000 }); STATE.caughtUp = true; }
        catch (e) { console.warn('[shivaa.in] catchup:', e.message); }
      }

      const [cRes, lRes, oRes] = await Promise.all([
        api('synced_customers', { query: { limit: 1000 } }),
        api('synced_leads', { query: { limit: 500 } }),
        api('synced_orders', { query: { limit: 500 } }),
      ]);
      STATE.customers = Array.isArray(cRes.rows) ? cRes.rows : [];
      STATE.leads = Array.isArray(lRes.rows) ? lRes.rows : [];
      STATE.orders = Array.isArray(oRes.rows) ? oRes.rows : [];
      STATE.pingErr = '';

      if (opts.manual || !STATE.ping) {
        try {
          const p = await api('ping');
          STATE.ping = p.data || p;
        } catch (e) { STATE.pingErr = e.message || 'Ping failed'; }
      }
      if (opts.manual || !STATE.rates) {
        try {
          const r = await api('live_rates');
          STATE.rates = r.data || r;
        } catch (e) { /* non-fatal */ }
      }

      /* Auto-import customers + leads into billing DB (owner/manager/staff, never in practice mode). */
      let addC = 0, addL = 0;
      const c = cfg();
      if (canWrite() && c.autoCustomers !== false) {
        for (const row of STATE.customers) {
          if (await importCustomerRecord(row)) addC++;
        }
        /* Also ensure online order buyers exist in S.customers. */
        for (const ord of STATE.orders) {
          if (ord && normPhone(ord.phone)) {
            const ship = ord.shippingAddress || {};
            if (await importCustomerRecord({
              id: ord.userId || ('ord_' + normPhone(ord.phone)),
              name: ord.customerName || ship.name || '',
              phone: ord.phone,
              email: ord.email || '',
              address: ship.line || ship.address || '',
              city: ship.city || '',
              state: ship.state || '',
              pincode: ship.pincode || '',
              role: ord.channel === 'b2b' ? 'partner' : 'customer',
              createdAt: ord.createdAt,
            })) addC++;
          }
        }
      }
      if (canWrite() && c.autoLeads !== false) {
        for (const ld of STATE.leads) {
          if (await importLeadRecord(ld)) addL++;
        }
      }

      const wasFirst = STATE.lastSyncAt === 0;
      STATE.importedCust += addC;
      STATE.importedLeads += addL;
      STATE.lastSyncAt = Date.now();
      announceNewActivity(STATE.orders, STATE.leads, wasFirst);

      if ((addC > 0 || addL > 0) && typeof scheduleRender === 'function') scheduleRender();
      if (opts.manual) {
        const msg = (addC || addL)
          ? ('✓ Shivaa.in sync poora — ' + addC + ' naye customer, ' + addL + ' nayi lead judi')
          : ('✓ Shivaa.in bilkul up-to-date (' + STATE.customers.length + ' customers · ' + STATE.leads.length + ' leads · ' + STATE.orders.length + ' orders)');
        notify(msg);
      } else if (addC > 0) {
        notify('✓ Shivaa.in se ' + addC + ' naye customer Parties mein jude');
      }
    } catch (err) {
      STATE.pingErr = err && err.message ? err.message : 'Connection failed';
      if (opts.manual) notify('⚠ Shivaa.in sync: ' + STATE.pingErr, 'err');
    } finally {
      STATE.syncing = false;
      paintCard();
    }
  }

  /* =================================================================
     3. LIVE GOLD 24K (₹/10g) & SILVER 999 (₹/kg) RATE SYNC
     ================================================================= */
  function extractRates() {
    const d = STATE.rates || {};
    const rates = d.rates || {};
    const retail = d.retail || {};
    const jaipur = rates.jaipur || retail;
    const spot = rates.spot || retail;
    const to10g = g => (n(g) > 0 ? Math.round(n(g) * 10) : 0);
    const toKg = g => (n(g) > 0 ? Math.round(n(g) * 1000) : 0);
    return {
      jaipurGold10g: to10g(jaipur.gold24 || retail.gold24),
      jaipurSilverKg: toKg(jaipur.silver || retail.silver),
      spotGold10g: to10g(spot.gold24 || retail.gold24),
      spotSilverKg: toKg(spot.silver || retail.silver),
      asOf: rates.quotedAt || d.asOf || '',
    };
  }

  async function applyWebsiteRates(kind) {
    if (!canAdmin()) { notify('Sirf Owner / Manager bhav badal sakte hain', 'err'); return; }
    try {
      const fresh = await api('live_rates');
      STATE.rates = fresh.data || fresh;
    } catch (err) {
      notify('⚠ Shivaa.in se bhav nahi aaya: ' + err.message, 'err');
      return;
    }
    const r = extractRates();
    const g24 = kind === 'spot' ? r.spotGold10g : r.jaipurGold10g;
    const s999 = kind === 'spot' ? r.spotSilverKg : r.jaipurSilverKg;
    if (!(g24 > 0) || !(s999 > 0)) { notify('Bhav abhi uplabdh nahi hai', 'err'); return; }
    if (typeof saveSettings !== 'function') { notify('saveSettings uplabdh nahi hai', 'err'); return; }
    const ok = await saveSettings({
      ...S.settings,
      gold24: g24,
      silver999: s999,
      ratesUpdated: today(),
      ratesSource: 'shivaa.in (' + kind + ')',
      ratesAt: Date.now(),
    });
    if (ok !== false) {
      if (Array.isArray(S.rateHistory) && typeof save === 'function') {
        const d = today();
        const ex = allRows('rateHistory').find(x => x && x.date === d);
        try {
          await save('rateHistory', { ...(ex || { id: 'rh_' + d, date: d }), gold24: g24, silver999: s999, source: 'shivaa.in', updatedAt: Date.now() }, { quiet: true });
        } catch (e) { /* optional */ }
      }
      if (typeof scheduleRender === 'function') scheduleRender();
      notify('✓ Aaj ka bhav update: Gold 24K ' + fmtInr(g24) + '/10g · Silver ' + fmtInr(s999) + '/kg');
      paintCard();
    }
  }

  /* =================================================================
     4. SETUP SCREEN CARD ("🌐 Shivaa.in Website Sync") + ACTIONS
     ================================================================= */
  const CSS_TEXT = `
  #sje-card{border:1px solid var(--gold-line,rgba(212,175,55,.35));border-radius:18px;padding:16px;margin-bottom:14px;background:var(--card,#131A2A)}
  #sje-card .sje-top{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px}
  #sje-card .sje-title{display:flex;align-items:center;gap:10px}
  #sje-card .sje-title h3{margin:0;font-size:16px}
  .sje-dot{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;font-size:11.5px;font-weight:700;background:rgba(34,197,94,.14);color:#4ade80;border:1px solid rgba(34,197,94,.32)}
  .sje-dot.warn{background:rgba(245,158,11,.14);color:#fbbf24;border-color:rgba(245,158,11,.35)}
  .sje-dot.err{background:rgba(244,63,94,.14);color:#fb7185;border-color:rgba(244,63,94,.35)}
  .sje-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin-bottom:12px}
  .sje-kpi{padding:10px 12px;border-radius:12px;background:var(--card2,#0E1422);border:1px solid var(--line2,#27344F)}
  .sje-kpi small{display:block;font-size:11px;color:var(--muted,#8a95ab);margin-bottom:2px}
  .sje-kpi b{font-size:17px;color:var(--head,#fff)}
  .sje-tabs{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px}
  .sje-tab{padding:6px 12px;border-radius:10px;border:1px solid var(--line2,#27344F);background:transparent;color:var(--ink,#E8ECF4);font:600 12.5px inherit;cursor:pointer}
  .sje-tab.on{background:var(--gold-soft,rgba(212,175,55,.16));border-color:var(--gold,#D4AF37);color:var(--gold,#D4AF37)}
  .sje-toggles{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:8px;margin-bottom:12px}
  .sje-chk{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:10px;background:var(--card2,#0E1422);border:1px solid var(--line2,#27344F);font-size:12.5px;cursor:pointer}
  .sje-rates{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;border-radius:12px;background:var(--gold-soft,rgba(212,175,55,.08));border:1px dashed var(--gold-line,rgba(212,175,55,.4))}
  .sje-list{display:flex;flex-direction:column;gap:8px;max-height:360px;overflow-y:auto}
  .sje-row{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px;padding:10px 12px;border-radius:12px;background:var(--card2,#0E1422);border:1px solid var(--line2,#27344F);font-size:12.5px}
  .sje-row .sje-sub{color:var(--muted,#8a95ab);font-size:11.5px;margin-top:2px}
  .sje-acts{display:flex;flex-wrap:wrap;gap:6px}
  .sje-bill-btn.sje-sent{border-color:rgba(34,197,94,.5)!important;color:#4ade80!important}
  `;
  if (!document.getElementById('sje-css')) {
    const st = document.createElement('style');
    st.id = 'sje-css';
    st.textContent = CSS_TEXT;
    document.head.appendChild(st);
  }

  const fmtTime = ms => ms ? new Date(ms).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—';
  const waHref = (ph, text) => {
    const p = normPhone(ph);
    return p ? 'https://wa.me/91' + p + (text ? '?text=' + encodeURIComponent(text) : '') : '';
  };

  function mergedOrders() {
    const byId = new Map();
    allRows(ORD_COL).forEach(o => { if (o && (o.orderId || o.id)) byId.set(String(o.orderId || o.id), o); });
    STATE.orders.forEach(o => { if (o && o.id) byId.set(String(o.id), { ...(byId.get(String(o.id)) || {}), ...o }); });
    return [...byId.values()].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  }

  function unsyncedSaleBills() {
    return allRows('invoices').filter(v => {
      if (!v || v.deleted || v.type !== 'sale') return false;
      if (v.quality === 'kacha' && !cfg().autoKacha) return false;
      const p = partyFor(v);
      if (!normPhone(v.partyPhone || (p && p.phone))) return false;
      const rec = billRec(v.id);
      return !(rec && rec.syncedAt && !rec.voidedAt);
    });
  }

  async function pushAllUnsyncedBills(btn) {
    if (!canWrite()) { notify('Sirf Owner / Manager / Staff bill bhej sakte hain', 'err'); return; }
    const list = unsyncedSaleBills();
    if (!list.length) { notify('✓ Saare Pakka sale bills pehle se shivaa.in par bheje ja chuke hain'); return; }
    if (btn) { btn.disabled = true; btn.textContent = '⏳ 0/' + list.length + ' bhej rahe…'; }
    let okN = 0, failN = 0;
    try {
      for (let i = 0; i < list.length; i++) {
        if (btn) btn.textContent = '⏳ ' + (i + 1) + '/' + list.length + ' (' + (list[i].no || '') + ')…';
        const r = await pushInvoicePdf(list[i], { auto: true, adjustStock: false });
        if (r && r.ok) okN++; else failN++;
      }
    } finally {
      if (btn) btn.disabled = false;
      paintCard();
    }
    notify(
      failN
        ? ('⚠ ' + okN + ' bill bheje, ' + failN + ' ruke — shivaa.in Admin settings check kijiye')
        : ('✓ ' + okN + ' ke ' + okN + ' bill PDF shivaa.in My Bills par chale gaye!'),
      failN ? 'err' : undefined
    );
  }

  function cardHtml() {
    const c = cfg();
    const ordersList = mergedOrders();
    const sentCount = allRows(COL).filter(x => x && x.syncedAt && !x.voidedAt).length;
    const pendingBills = canWrite() ? unsyncedSaleBills().length : 0;
    const statusCls = isPractice() ? 'warn' : STATE.pingErr ? 'err' : STATE.lastSyncAt ? '' : 'warn';
    const statusTxt = isPractice()
      ? 'Practice mode (sync paused)'
      : STATE.syncing
        ? 'Sync ho raha hai…'
        : STATE.pingErr
          ? ('Ruka: ' + STATE.pingErr.slice(0, 48))
          : STATE.lastSyncAt
            ? ('Connected · www.shivaa.in · ' + fmtTime(STATE.lastSyncAt))
            : 'Jod rahe hain…';

    const r = extractRates();
    let body = '';
    if (STATE.tab === 'orders') {
      body = !ordersList.length
        ? '<div class="sje-sub">Abhi tak koi online order nahi aaya. shivaa.in par order aate hi yahan turant dikhega.</div>'
        : '<div class="sje-list">' + ordersList.slice(0, 50).map(o => {
          const oid = o.orderId || o.id || '';
          const items = (o.items || []).map(i => (i.name || 'Item') + ' ×' + (i.qty || 1)).join(', ');
          const wa = waHref(o.phone, 'Namaste ' + (o.customerName || '') + ' ji, Shivaa Jewels se aapke order ' + oid + ' ke baare mein.');
          return '<div class="sje-row"><div><b>' + escH(oid || o.invoiceNo || 'Order') + '</b> · ' + escH(o.customerName || 'Customer') +
            (o.phone ? ' · ' + escH(o.phone) : '') + ' · <b>' + escH(fmtInr(o.total)) + '</b>' +
            '<div class="sje-sub">' + escH([String(o.createdAt || '').slice(0, 10), o.status || '', o.paymentMethod || '', items].filter(Boolean).join(' · ')) + '</div></div>' +
            '<div class="sje-acts">' +
            (canWrite() ? '<button type="button" class="btn" data-act="sje-order-bill" data-id="' + escH(oid) + '">🧾 Pakka Bill</button>' : '') +
            (wa ? '<a class="btn" href="' + escH(wa) + '" target="_blank" rel="noopener">💬 WhatsApp</a>' : '') +
            '</div></div>';
        }).join('') + '</div>';
    } else if (STATE.tab === 'leads') {
      body = !STATE.leads.length
        ? '<div class="sje-sub">Abhi tak koi website enquiry nahi aayi. Contact, Appointment, Custom Order, Swarna Nidhi & B2B KYC leads yahan aayengi.</div>'
        : '<div class="sje-list">' + STATE.leads.slice(0, 60).map(l => {
          const wa = waHref(l.phone, 'Namaste ' + (l.name || '') + ' ji, Shivaa Jewels se aapki shivaa.in enquiry ke baare mein.');
          return '<div class="sje-row"><div><b>' + escH(l.name || l.phone || l.email || 'Lead') + '</b>' +
            (l.phone ? ' · ' + escH(l.phone) : '') + ' <span class="sje-sub">[' + escH(String(l.channel || 'web').replace(/_/g, ' ')) + ']</span>' +
            '<div class="sje-sub">' + escH([String(l.createdAt || '').slice(0, 10), l.summary || l.message || '', l.city || ''].filter(Boolean).join(' · ')) + '</div></div>' +
            '<div class="sje-acts">' +
            (canWrite() && normPhone(l.phone) ? '<button type="button" class="btn" data-act="sje-lead-party" data-id="' + escH(l.leadId || '') + '">+ Party</button>' : '') +
            (wa ? '<a class="btn" href="' + escH(wa) + '" target="_blank" rel="noopener">💬 WhatsApp</a>' : '') +
            '</div></div>';
        }).join('') + '</div>';
    } else if (STATE.tab === 'customers') {
      body = !STATE.customers.length
        ? '<div class="sje-sub">Abhi tak koi website customer sync nahi hua. shivaa.in Admin → Settings → Backfill dabane par saare customers yahan aur Parties mein aa jayenge.</div>'
        : '<div class="sje-list">' + STATE.customers.slice(0, 60).map(u => {
          const wa = waHref(u.phone, '');
          return '<div class="sje-row"><div><b>' + escH(u.firm || u.name || 'Customer') + '</b>' +
            (u.phone ? ' · ' + escH(u.phone) : '') + (u.role === 'partner' ? ' · <b>B2B</b>' : '') +
            (u.blackMember ? ' · ⭐ Shivaa Black' : '') +
            '<div class="sje-sub">' + escH([u.email || '', u.city || '', u.gstin ? 'GSTIN ' + u.gstin : ''].filter(Boolean).join(' · ')) + '</div></div>' +
            '<div class="sje-acts">' +
            (wa ? '<a class="btn" href="' + escH(wa) + '" target="_blank" rel="noopener">💬 WhatsApp</a>' : '') +
            '</div></div>';
        }).join('') + '</div>';
    } else {
      const dis = canAdmin() ? '' : ' disabled';
      body =
        '<div class="sje-toggles">' +
        '<label class="sje-chk"><input type="checkbox" data-sje-cfg="autoBills"' + (c.autoBills !== false ? ' checked' : '') + dis + '><span>Pakka GST bill PDF apne-aap shivaa.in My Bills par bhejo</span></label>' +
        '<label class="sje-chk"><input type="checkbox" data-sje-cfg="autoKacha"' + (c.autoKacha ? ' checked' : '') + dis + '><span>Kacha / Estimate bill bhi apne-aap bhejo</span></label>' +
        '<label class="sje-chk"><input type="checkbox" data-sje-cfg="autoStock"' + (c.autoStock !== false ? ' checked' : '') + dis + '><span>Naye bill par matching SKU stock shivaa.in se ghatao</span></label>' +
        '<label class="sje-chk"><input type="checkbox" data-sje-cfg="autoCustomers"' + (c.autoCustomers !== false ? ' checked' : '') + dis + '><span>Website customers & leads apne-aap Parties / CRM mein jodo</span></label>' +
        '</div>' +
        '<div class="sje-rates"><div><b>📈 shivaa.in Live Bhav</b>' +
        '<div class="sje-sub">' +
        (r.jaipurGold10g
          ? ('Jaipur: Gold 24K ' + escH(fmtInr(r.jaipurGold10g)) + '/10g · Silver ' + escH(fmtInr(r.jaipurSilverKg)) + '/kg' +
            (r.spotGold10g ? '  |  MCX Spot: ' + escH(fmtInr(r.spotGold10g)) + '/10g · ' + escH(fmtInr(r.spotSilverKg)) + '/kg' : ''))
          : 'Sync Now dabaiye live Gold 24K & Silver 999 bhav dekhne ke liye') +
        '</div></div>' +
        (canAdmin()
          ? '<div class="sje-acts">' +
            '<button type="button" class="btn" data-act="sje-rate-jaipur">Jaipur Bhav lagao</button>' +
            '<button type="button" class="btn" data-act="sje-rate-spot">MCX Spot lagao</button>' +
            '</div>'
          : '') +
        '</div>';
    }

    return (
      '<div id="sje-card">' +
      '<div class="sje-top">' +
      '<div class="sje-title"><h3>🌐 Shivaa.in Website Sync</h3><span class="sje-dot ' + statusCls + '">' + escH(statusTxt) + '</span></div>' +
      '<div class="sje-acts">' +
      (pendingBills > 0 ? '<button type="button" class="btn gold" data-act="sje-push-all">📤 Purane ' + pendingBills + ' Bill bhejo</button>' : '') +
      '<button type="button" class="btn" data-act="sje-sync"' + (STATE.syncing ? ' disabled' : '') + '>' + (STATE.syncing ? '⏳ Syncing…' : '🔄 Sync Now') + '</button>' +
      '</div></div>' +
      '<div class="sje-kpis">' +
      '<div class="sje-kpi"><small>Website Customers</small><b>' + STATE.customers.length + '</b></div>' +
      '<div class="sje-kpi"><small>Website Leads</small><b>' + STATE.leads.length + '</b></div>' +
      '<div class="sje-kpi"><small>Online Orders</small><b>' + ordersList.length + '</b></div>' +
      '<div class="sje-kpi"><small>Bills -> My Bills</small><b>' + sentCount + '</b></div>' +
      '</div>' +
      '<div class="sje-tabs">' +
      [['overview', 'Settings & Bhav'], ['orders', 'Online Orders (' + ordersList.length + ')'], ['leads', 'Leads (' + STATE.leads.length + ')'], ['customers', 'Customers (' + STATE.customers.length + ')']]
        .map(([k, l]) => '<button type="button" class="sje-tab' + (STATE.tab === k ? ' on' : '') + '" data-act="sje-tab" data-tab="' + k + '">' + escH(l) + '</button>').join('') +
      '</div>' + body + '</div>'
    );
  }

  function paintCard() {
    const el = document.getElementById('sje-card');
    if (el) el.outerHTML = cardHtml();
  }

  if (VIEWDEF.setup) {
    const prevSetup = VIEWDEF.setup;
    VIEWDEF.setup = {
      ...prevSetup,
      body() { return cardHtml() + prevSetup.body.call(prevSetup); },
    };
  }

  /* Delegated clicks & toggles */
  document.addEventListener('change', e => {
    const t = e.target;
    if (!t || !t.dataset || !t.dataset.sjeCfg) return;
    const k = t.dataset.sjeCfg;
    const patch = { [k]: !!t.checked };
    if (k === 'autoCustomers') patch.autoLeads = !!t.checked;
    updateCfg(patch);
  });

  document.addEventListener('click', async e => {
    const btn = e.target && e.target.closest && e.target.closest('[data-act^="sje-"]');
    if (!btn) return;
    const act = btn.dataset.act;
    e.preventDefault();
    e.stopPropagation();
    if (btn.disabled) return;

    if (act === 'sje-sync') { await syncAll({ manual: true }); return; }
    if (act === 'sje-push-all') { await pushAllUnsyncedBills(btn); return; }
    if (act === 'sje-tab') { STATE.tab = btn.dataset.tab || 'overview'; paintCard(); return; }
    if (act === 'sje-rate-jaipur') { await applyWebsiteRates('jaipur'); return; }
    if (act === 'sje-rate-spot') { await applyWebsiteRates('spot'); return; }

    if (act === 'sje-push-bill') {
      const inv = allRows('invoices').find(x => x && x.id === btn.dataset.id);
      if (!inv) return;
      btn.disabled = true;
      btn.textContent = '⏳ Bhej rahe hain…';
      try {
        await pushInvoicePdf(inv, { auto: false, adjustStock: false });
      } finally {
        btn.disabled = false;
        btn.textContent = billBtnLabel(inv.id);
        refreshOpenBillButton(inv.id);
      }
      return;
    }

    if (act === 'sje-lead-party') {
      const ld = STATE.leads.find(x => x && String(x.leadId) === btn.dataset.id);
      if (!ld) return;
      await importCustomerRecord({
        id: 'lead_' + cleanId(ld.leadId),
        name: ld.name || ('Shivaa.in ' + normPhone(ld.phone)),
        phone: ld.phone,
        email: ld.email,
        city: ld.city,
        gstin: ld.gstin,
        role: ld.channel === 'partner_application' ? 'partner' : 'customer',
        createdAt: ld.createdAt,
      }, { toastOne: true });
      if (typeof scheduleRender === 'function') scheduleRender();
      return;
    }

    if (act === 'sje-order-bill') {
      const o = mergedOrders().find(x => x && String(x.orderId || x.id) === btn.dataset.id);
      if (!o || typeof openInvoice !== 'function') return;
      const oid = o.orderId || o.id || '';
      const ph = normPhone(o.phone);
      let cust = ph ? allRows('customers').find(c => c && normPhone(c.phone) === ph) : null;
      if (!cust && ph) {
        const ship = o.shippingAddress || {};
        await importCustomerRecord({
          id: o.userId || ('ord_' + ph),
          name: o.customerName || ship.name || ('Order ' + oid),
          phone: ph,
          email: o.email || '',
          address: ship.line || ship.address || '',
          city: ship.city || '',
          state: ship.state || '',
          pincode: ship.pincode || '',
          role: o.channel === 'b2b' ? 'partner' : 'customer',
        });
        cust = allRows('customers').find(c => c && normPhone(c.phone) === ph) || null;
      }
      const itemSummary = (o.items || []).map(i => (i.name || 'Item') + (i.sku ? ' [' + i.sku + ']' : '') + ' ×' + (i.qty || 1)).join(', ');
      openInvoice('sale', {
        preset: {
          channel: o.channel === 'b2b' ? 'wholesale' : 'retail',
          partyId: cust ? cust.id : '',
          notes: ('shivaa.in Order ' + oid + (itemSummary ? ' · ' + itemSummary : '')).slice(0, 300),
        },
      });
    }
  }, true);

  /* Also sync immediately when the top-bar "Sync" button is tapped. */
  document.addEventListener('click', e => {
    const b = e.target && e.target.closest && e.target.closest('button');
    if (b && !b.dataset.act && /^sync$/i.test((b.textContent || '').trim())) {
      setTimeout(() => { syncAll({ manual: false }); }, 800);
    }
  });

  /* Boot: wait until staff logs in via sj-api.php, then sync now + every 60s. */
  let booted = false;
  function tryBoot() {
    if (booted || !authed()) return;
    booted = true;
    setTimeout(() => { syncAll({ manual: false }); }, 2500);
    setInterval(() => { syncAll({ manual: false }); }, SYNC_MS);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && Date.now() - STATE.lastSyncAt > SYNC_MS) syncAll({ manual: false });
    });
  }
  setInterval(tryBoot, 1500);
  setTimeout(tryBoot, 1500);

  window.SJ_ECOM = {
    version: 253,
    sync: () => syncAll({ manual: true }),
    pushBill: invOrId => {
      const inv = typeof invOrId === 'string' ? allRows('invoices').find(x => x && x.id === invOrId) : invOrId;
      return pushInvoicePdf(inv, { auto: false, adjustStock: false });
    },
    voidBill: (invId, invNo) => voidSyncedBill(invId, invNo),
    applyRates: kind => applyWebsiteRates(kind || 'jaipur'),
    state: () => ({ ...STATE }),
  };
})();
