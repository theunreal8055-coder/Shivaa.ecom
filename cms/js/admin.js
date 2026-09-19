/* ═══════════════════════════════════════════════════════════
   SHIVAA admin.js — Admin Dashboard + B2B Partner Portal
   ═══════════════════════════════════════════════════════════ */
'use strict';
(function () {
const { api, state, toast, fmt, esc, safeUrl, jsArg, openModal, closeModal, token } = window.Shivaa;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

const CATS = window.Shivaa ? {
  rings: 'Rings', necklaces: 'Necklaces', earrings: 'Earrings', bangles: 'Bangles & Kadas', bracelets: 'Bracelets',
  pendants: 'Pendants & Chains', mangalsutra: 'Mangalsutra', nosepins: 'Nose Pins', silver: 'Silver 925',
} : {};
const IMG_FILES = ['ring-floral.jpg','ring-kundan.jpg','ring-signet.jpg','ring-couple.jpg','necklace-rani.jpg','necklace-choker.jpg','necklace-satlada.jpg','earrings-jhumka.jpg','earrings-chandbali.jpg','earrings-studs.jpg','earrings-drops.jpg','bangle-kada.jpg','bangle-pair.jpg','bracelet-tennis.jpg','bracelet-charm.jpg','pendant-om.jpg','pendant-infinity.jpg','chain-gold.jpg','mangalsutra-trad.jpg','mangalsutra-modern.jpg','nosepin.jpg','silver-anklet.jpg','silver-chain.jpg','silver-kada.jpg'];

/* ════════════════ ADMIN ════════════════ */
async function renderAdmin(view, q) {
  const tab = q.get('tab') || 'overview';
  if (!state.user || state.user.role !== 'admin') {
    view.innerHTML = `<div style="min-height:80vh;display:flex;align-items:center;justify-content:center;padding:30px">
      <div class="adm-card" style="max-width:430px;width:100%">
        <div class="center"><img src="/images/logo.png" style="height:44px;margin:0 auto 12px"><h3 style="margin-bottom:4px">Admin Dashboard</h3><p style="font-size:13px;color:var(--ink-3)">Authorised staff only</p></div>
        <form class="form-grid" style="grid-template-columns:1fr;margin-top:16px" onsubmit="ShivaaAdmin.login(event)">
          <div class="fld"><label>Email</label><input name="email" type="email" autocomplete="username" required></div>
          <div class="fld"><label>Password</label><input name="password" type="password" autocomplete="current-password" required></div>
          <button class="btn btn-primary btn-block">Sign in</button>
        </form>
      </div></div>`;
    return;
  }
  let stats = {};
  if (tab === 'overview') { try { stats = await api('/api/admin/stats'); } catch (e) {} }
  let partnersData = { partners: [] };
  if (tab === 'partners') { try { partnersData = await api('/api/partners'); } catch (e) {} }
  let orders = [];
  if (tab === 'orders') { try { orders = (await api('/api/orders')).orders; window.ShivaaAdmin._orderMap = Object.fromEntries(orders.map(o => [o.id, o])); } catch (e) {} }
  let catalogs = [];
  if (tab === 'catalogs') { try { catalogs = (await api('/api/catalogs')).catalogs; } catch (e) {} }
  let users = [];
  if (tab === 'customers') { try { users = (await api('/api/admin/users')).users; } catch (e) {} }
  let leads = { requests: [] };
  if (tab === 'leads') { try { leads = await api('/api/services'); } catch (e) {} }
  let rateAlerts = [];
  if (tab === 'leads') { try { rateAlerts = (await api('/api/admin/rate-alerts')).alerts || []; } catch (e) {} }
  let coupons = [];
  if (tab === 'coupons') { try { coupons = (await api('/api/coupons')).coupons; } catch (e) {} }
  let finaleEntries = [];
  if (tab === 'finale') { try { const fe = await api('/api/finale/entries'); finaleEntries = fe.entries || []; } catch (e) {} }
  let khataData = { partners: [], khata: [] };
  if (tab === 'khata') { try { khataData = await api('/api/admin/khata'); window._khataCache = khataData.khata || []; } catch (e) {} }
  let goldBuys = [];
  if (tab === 'gold') { try { goldBuys = (await api('/api/admin/gold-purchases')).purchases || []; } catch (e) {} }
  let karigarData = { karigars: [], jobs: [] };
  if (tab === 'karigar') { try { karigarData = await api('/api/admin/karigars'); } catch (e) {} }
  let cashData = null;
  if (tab === 'cash') { try { cashData = await api('/api/admin/cashbook?date=' + new Date().toLocaleDateString('en-CA')); } catch (e) {} }
  let payProofs = [];
  if (tab === 'orders') { try { payProofs = (await api('/api/admin/pay-proofs')).orders || []; } catch (e) {} }
  const proofPending = payProofs.filter(o => o.paymentStatus === 'Proof submitted').length;
  let refundsData = { requests: [] };
  if (tab === 'refunds') { try { refundsData = await api('/api/admin/refunds'); } catch (e) {} }
  let savingsData = { plans: [] };
  if (tab === 'nidhi') { try { savingsData = await api('/api/admin/savings'); } catch (e) {} }
  let reviewAsks = [];
  if (tab === 'orders') { try { reviewAsks = (await api('/api/admin/review-asks')).asks || []; } catch (e) {} }
  let carts = [];
  if (tab === 'overview') { try { carts = (await api('/api/admin/carts')).carts; } catch (e) {} }
  const P = partnersData.partners || [];
  const pendingPartners = P.filter(x => x.status === 'pending').length;
  const newLeads = (leads.requests || []).length;

  view.innerHTML = `
  <div class="admin-shell">
    <aside class="adm-side">
      <div class="adm-logo"><img src="/images/logo.png" alt=""><div><b style="font-family:var(--ff-disp);font-size:17px">Shivaa</b><br><small style="font-size:10px;letter-spacing:.2em;opacity:.7">CONTROL ROOM</small></div></div>
      <nav class="adm-nav">
        ${[['overview','◈','Overview'],['reports','📊','Reports'],['finale','🎯','Gold Finale'],['products','✦','Products'],['orders','▦','Orders'],['refunds','↩','Refunds'],['nidhi','🪙','Swarna Nidhi'],['bullion','🥇','Bullion Rates'],['weights','⚖','Ring Weights'],['rates','↻','Live Rates'],['catalogs','❒','Catalogues'],['partners','◈','B2B Partners'],['customers','♡','Customers'],['leads','✉','Leads'],['coupons','%','Coupons'],['pages','📄','Pages'],['khata','📒','Khata'],['gold','🪙','Old Gold'],['karigar','🔨','Karigar'],['cash','💵','Cash Book'],['settings','⚙','Settings']].map(n => `<a href="#/admin?tab=${n[0]}" class="${tab === n[0] ? 'on' : ''}">${n[1]} ${n[2]}${n[0] === 'finale' && finaleEntries.length ? ` <span class="cnt">${finaleEntries.length}</span>` : ''}${n[0] === 'partners' && pendingPartners ? ` <span class="cnt">${pendingPartners}</span>` : ''}${n[0] === 'leads' && newLeads ? ` <span class="cnt">${newLeads}</span>` : ''}${n[0] === 'refunds' && refundsData.requests.filter(r => r.status === 'requested').length ? ` <span class="cnt">${refundsData.requests.filter(r => r.status === 'requested').length}</span>` : ''}</a>`).join('')}
        <a href="#/" style="margin-top:14px">← Back to store</a>
      </nav>
    </aside>
    <main class="adm-main">
      <div class="adm-head"><h2>${({overview:'Overview',finale:'Gold Finale Entries',products:'Products',orders:'Orders',bullion:'Bullion Rates',weights:'Ring Weights',rates:'Live Rates',mc:'Making Charges',catalogs:'Catalogues',partners:'B2B Partners',customers:'Customers',leads:'Leads',coupons:'Coupons',pages:'Pages',khata:'Khata — partner ledger',gold:'Old Gold Purchase Register',karigar:'Karigar Job-Work Book',cash:'Daily Cash Book & Day Close',reports:'Reports · GST · CA pack',refunds:'Refunds & Exchanges',nidhi:'Swarna Nidhi Plans',settings:'Settings'})[tab] || esc(String(tab).slice(0, 40))}</h2>
        <div style="display:flex;gap:10px;align-items:center"><span class="src-badge ${(state.rates?.source === 'live' || state.rates?.source === 'live-mcx') ? 'src-live' : 'src-sim'}"><span class="live-dot"></span>${state.rates?.source === 'live-mcx' ? 'official MCX' : esc(state.rates?.source || '')} · Gold 22K ${fmt(state.rates?.gold22 || 0)}/g</span></div></div>
      <div id="admBody"></div>
    </main>
  </div>`;
  const body = $('#admBody');

  /* ── OVERVIEW ── */
  if (tab === 'overview') {
    const days = Object.entries(stats.byDay || {}).slice(-14);
    body.innerHTML = `
      <div class="stat-grid">
        <div class="stat"><small>Revenue</small><b>${fmt(stats.revenue || 0)}</b><span>${stats.orders || 0} orders</span></div>
        <div class="stat"><small>Avg order value</small><b>${fmt(stats.aov || 0)}</b><span>incl. GST</span></div>
        <div class="stat"><small>Customers</small><b>${stats.customers || 0}</b><span>${stats.newsletter || 0} newsletter</span></div>
        <div class="stat"><small>B2B partners</small><b>${stats.partners || 0}</b><span style="${stats.pendingPartners ? 'color:var(--warn)' : ''}">${stats.pendingPartners || 0} pending</span></div>
      </div>
      <div class="grid2">
        <div class="adm-card"><h3>📈 This week's funnel</h3>
          <div class="sum-row"><span>Product views</span><b>${(stats.funnel && stats.funnel.view) || 0}</b></div>
          <div class="sum-row"><span>Added to cart</span><b>${(stats.funnel && stats.funnel.cart) || 0}</b></div>
          <div class="sum-row"><span>Reached checkout</span><b>${(stats.funnel && stats.funnel.checkout) || 0}</b></div>
          <div class="sum-row"><span>Orders (all time)</span><b>${stats.orders || 0}</b></div>
          <div class="sum-row"><span>Referred sign-ups</span><b>${stats.referrals || 0}</b></div>
        </div>
        <div class="adm-card"><h3>🛒 Abandoned carts (${carts.length})</h3>
          ${carts.length ? carts.slice(0, 5).map(c => `<div class="sum-row"><span><b>${esc((c.items || []).map(i => i.n).slice(0, 2).join(', '))}${(c.items || []).length > 2 ? '…' : ''}</b><br><small style="color:var(--ink-3)">${esc(String(c.at || '').slice(0, 16).replace('T', ' '))}${c.phone ? ' · ' + esc(c.phone) : ''}</small></span><span><b>${fmt(c.total || 0)}</b>${c.phone ? ` <button class="btn btn-ghost btn-sm" onclick="ShivaaAdmin.nudgeCart(${jsArg(c.phone)},${jsArg((c.items || []).map(i => i.n).slice(0, 2).join(', '))})">Nudge</button>` : ''}</span></div>`).join('') : '<p style="color:var(--ink-3);font-size:13.5px">None yet — carts left behind appear here for a gentle nudge.</p>'}
        </div>
      </div>
      <div class="adm-card"><h3>Daily revenue (last ${days.length || 0} days)</h3><canvas id="admChart"></canvas></div>
      <div class="grid2">
        <div class="adm-card"><h3>Low stock <a class="btn btn-ghost btn-sm" href="#/admin?tab=products">Manage →</a></h3>
          ${stats.lowStock && stats.lowStock.length ? `<div style="display:grid;gap:8px">${stats.lowStock.map(l => `<div class="sum-row"><span>${esc(l.name)}</span><b style="color:${l.stock === 0 ? 'var(--bad)' : 'var(--warn)'}">${l.stock} left</b></div>`).join('')}</div>` : '<p style="color:var(--ink-3);font-size:13.5px">All pieces healthy (stock > 3).</p>'}</div>
        <div class="adm-card"><h3>Pending service requests <a class="btn btn-ghost btn-sm" href="#/admin?tab=leads">Open →</a></h3>
          <p style="font-size:42px;font-family:var(--ff-disp);color:var(--maroon)">${stats.serviceRequests || 0}</p><span style="font-size:13px;color:var(--ink-3)">bespoke / repair / appointments awaiting first response</span></div>
        <div class="adm-card"><h3>🛡 Security · recent events</h3>
          ${(stats.signIns && stats.signIns.length) ? `<div style="display:grid;gap:6px">${stats.signIns.map(e => `<div class="sum-row"><span>${e.event === 'admin-login' ? '✅ Admin sign-in' : e.event === 'login-lockout' ? '🔒 Lockout — 5 failed tries' : esc(e.event)}${e.email ? ' · ' + esc(e.email) : ''}</span><b style="font-weight:500;font-size:12px;color:var(--ink-3)">${esc(String(e.at || '').slice(0,16).replace('T',' '))}</b></div>`).join('')}</div>` : '<p style="color:var(--ink-3);font-size:13.5px">No events yet — admin sign-ins and lockouts appear here automatically.</p>'}
        </div>
      </div>
      <div class="grid2">
        <div class="adm-card"><h3>🔐 My sign-in password</h3>
          <form class="form-grid" onsubmit="ShivaaAdmin.changePw(event)">
            <div class="fld full"><label>Current password</label><input id="admPwCur" type="password" autocomplete="current-password" required></div>
            <div class="fld"><label>New password (8+ characters)</label><input id="admPwNew" type="password" autocomplete="new-password" minlength="8" required></div>
            <div class="fld"><label>Type it again</label><input id="admPwNew2" type="password" autocomplete="new-password" minlength="8" required></div>
            <p class="partner-note" style="grid-column:1/-1;font-size:12.5px">Changing it signs your <b>other</b> devices out and keeps this one. Locked out completely? Use <b>“Forgot password?”</b> on the sign-in screen — the code goes to the account's registered mobile — or the one-time <b>admin-reset.php</b> recovery file in your hosting panel.</p>
            <button class="btn btn-primary" style="justify-self:start">Update my password</button>
          </form></div>
        <div class="adm-card"><h3>Recent security events <span id="admOtpState" style="font-size:12px;font-weight:400;color:var(--ink-3)"></span></h3>
          <div id="admSecLog"><div class="loading-spin"></div></div></div>
      </div>`;
    drawBarChart($('#admChart'), days);
    (async () => {
      const box = document.getElementById('admSecLog'); if (!box) return;
      try {
        const r = await api('/api/admin/security-log');
        const st = document.getElementById('admOtpState');
        if (st) st.textContent = r.otpResetEnabled ? '· SMS reset ON' : '· SMS reset OFF';
        const L = r.log || [];
        box.innerHTML = L.length ? `<div style="display:grid;gap:8px">${L.slice(0, 8).map(e => `<div class="sum-row"><span><b>${esc(String(e.event || '').replace(/-/g, ' '))}</b><br><small style="color:var(--ink-3)">${esc(e.email || '—')} · ${esc(e.role || '')}${e.via ? ' · ' + esc(e.via) : ''}${e.sessionsRevoked ? ' · ' + e.sessionsRevoked + ' session(s) signed out' : ''}</small></span><b style="font-size:12px;font-weight:500;white-space:nowrap">${e.at ? new Date(e.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : ''}</b></div>`).join('')}</div>`
          : '<p class="partner-note">No password or reset activity yet.</p>';
      } catch (e) { box.innerHTML = '<p class="partner-note">' + e.message + '</p>'; }
    })();
  }

  if (tab === 'products') {
    body.innerHTML = `
      <div class="adm-card"><h3>${state.productsCache.length} products <button class="btn btn-primary btn-sm" onclick="ShivaaAdmin.editProduct()">+ Add product</button></h3>
        <div class="adm-table-wrap"><table class="adm-table">
          <thead><tr><th></th><th>Name</th><th>Category</th><th>Metal</th><th class="num">Weight</th><th>Making</th><th class="num">Stock</th><th class="num">Price (live)</th><th></th></tr></thead>
          <tbody>${state.productsCache.map(p => `<tr>
            <td><img src="${safeUrl(p.images && p.images[0])}" alt=""></td>
            <td><b>${esc(p.name)}</b><br><small style="color:var(--ink-3)">${p.sku} · ★${p.rating}</small></td>
            <td>${CATS[p.category] || p.category}</td>
            <td>${p.metal === 'Silver' ? 'Silver 925' : p.purity}</td>
            <td class="num">${p.weightG} g</td>
            <td>${p.mcScheme === 'percent' ? p.mcValue + '%' : p.mcScheme === 'perGram' ? '₹' + p.mcValue + '/g' : 'flat ' + fmt(p.mcValue)}</td>
            <td class="num"><b style="color:${p.stock <= 3 ? 'var(--warn)' : 'inherit'}">${p.stock}</b></td>
            <td class="num"><b>${fmt(window.Shivaa.price(p).total)}</b></td>
            <td style="white-space:nowrap"><button type="button" class="btn btn-ghost btn-sm" data-product-id="${esc(p.id)}" onclick="ShivaaHallmark.editRecords(this.dataset.productId)">HUIDs</button> <button class="icon-e" onclick="ShivaaAdmin.printLabelTag('${p.id}')" title="Print tag / barcode label">🏷</button> <button class="icon-e" onclick="ShivaaAdmin.productPoster('${p.id}')" title="Shareable product poster (WhatsApp)">🖼</button> <button class="icon-e" onclick="ShivaaAdmin.editProduct('${p.id}')">✎</button> <button class="icon-x" onclick="ShivaaAdmin.delProduct('${p.id}')">✕</button></td>
          </tr>`).join('')}</tbody>
        </table></div></div>`;
  }

  /* ── ORDERS ── */
  if (tab === 'orders') {
    window._adminOrders = orders;
    const proofBanner = proofPending ? `<div class="proof-banner">🔔 <b>${proofPending}</b> UPI payment screenshot${proofPending > 1 ? 's' : ''} awaiting verification
      <div style="margin-top:8px;display:grid;gap:8px">${payProofs.filter(o => o.paymentStatus === 'Proof submitted').map(o => `<div class="proof-row">
        <div><b>${esc(o.id)}</b> · ${esc(o.userName || '')} · <b>${fmt(o.total)}</b>${o.payProof && o.payProof.ref ? ' · ref ' + esc(o.payProof.ref) : ''}
          <a href="${safeUrl(o.payProof ? o.payProof.file : '')}" target="_blank" rel="noopener" class="btn btn-outline btn-sm" style="margin-left:8px">📎 View screenshot</a></div>
        <div><button class="btn btn-gold btn-sm" onclick="ShivaaAdmin.proofDecide('${o.id}','approve')">✓ Confirm paid</button>
        <button class="btn btn-ghost btn-sm" onclick="ShivaaAdmin.proofDecide('${o.id}','reject')">Reject</button></div></div>`).join('')}</div></div>` : '';
    const asksBanner = reviewAsks.length ? `<div class="proof-banner" style="background:linear-gradient(135deg,#fff8e6,#f5e9c8);border-color:var(--gold)">⭐ <b>${reviewAsks.length}</b> delivered piece${reviewAsks.length > 1 ? 's' : ''} waiting on a photo review
      <div style="margin-top:8px;display:grid;gap:6px">${reviewAsks.slice(0, 12).map(a => `<div class="proof-row"><div><b>${esc(a.name)}</b> · ${esc(a.userName)} · <small>${esc(a.phone)}</small><br><small style="color:var(--ink-3)">Delivered ${new Date(a.deliveredAt).toLocaleDateString('en-IN')} · order ${esc(a.orderId)}</small></div>
      <div><a class="btn btn-outline btn-sm" target="_blank" rel="noopener" href="${Shivaa.waLink('Namaste ✦ hope you are loving your ' + a.name + ' from Shivaa. A quick photo review helps other brides & families — takes 30 seconds: ' + location.origin + '/#/product/' + a.productId)}">📱 Ask review</a></div></div>`).join('')}</div></div>` : '';
    body.innerHTML = `${proofBanner}${asksBanner}<div class="adm-card"><h3>${orders.length} orders <button class="btn btn-ghost btn-sm" style="margin-left:10px" onclick="ShivaaAdmin.gstrCSV()">⬇ GSTR-1 CSV</button> <button class="btn btn-ghost btn-sm" onclick="ShivaaAdmin.catalogCSV()">⬇ Catalogue CSV</button></h3>
      <div class="adm-table-wrap"><table class="adm-table">
        <thead><tr><th>Order / Invoice</th><th>Customer</th><th>Items</th><th class="num">Total</th><th>Payment</th><th>Status</th><th></th></tr></thead>
        <tbody>${orders.map(o => `<tr>
          <td><b>${o.id}</b>${o.invoiceNo ? `<br><small style="color:var(--maroon-deep)">${esc(o.invoiceNo)}</small>` : ''}<br><small style="color:var(--ink-3)">${new Date(o.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</small></td>
          <td>${esc(o.userName)}</td>
          <td>${o.items.reduce((a, i) => a + i.qty, 0)}</td>
          <td class="num"><b>${fmt(o.total)}</b>${o.amountPaid ? `<br><small style="color:var(--ok,#1d7a46)">paid ${fmt(o.amountPaid)}</small>${o.balance > 0 ? `<br><small style="color:var(--warn)">bal ${fmt(o.balance)}</small>` : ''}` : ''}${o.prepaidDiscount ? `<br><small style="color:var(--ok)">−${fmt(o.prepaidDiscount)} online</small>` : ''}</td>
          <td>${esc(o.paymentMethod)}<br><small style="color:${o.paymentStatus === 'Paid' ? 'var(--ok,#1d7a46)' : 'var(--warn)'}">${o.paymentStatus === 'Paid' ? '✓ ' : '⌛ '}${esc(o.paymentStatus || '—')}${o.codConfirmed ? ' · ✓COD' : ''}${o.gatewayOrderId ? '<br>GW: ' + esc(String(o.gatewayOrderId).slice(0, 16)) : ''}</small></td>
          <td><select onchange="ShivaaAdmin.setStatus('${o.id}', this.value)">
            ${['Placed', 'Confirmed', 'Karigari', 'Hallmarking', 'Packed', 'Shipped', 'Delivered', 'Cancelled'].map(s => `<option ${o.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></td>
          <td style="white-space:nowrap"><button class="icon-e" onclick="Shivaa.orderDetail('${o.id}')" title="View">👁</button>
            <button class="icon-e" onclick="ShivaaAdmin.waOrder('${o.id}')" title="Send WhatsApp update">📱</button>
            <button class="icon-e" onclick="ShivaaAdmin.manualPay('${o.id}')" title="Record manual / advance payment">💰</button>
            ${o.gateway === 'cashfree' && +o.amountPaid > 0 && !/^refunded$/i.test(o.paymentStatus || '') ? `<button class="icon-e" onclick="ShivaaAdmin.gatewayRefund('${o.id}', ${+o.amountPaid}, 'cashfree')" title="Cashfree gateway refund">↩️</button>` : ''}
            ${o.invoiceNo ? `<button class="icon-e" onclick="ShivaaAdmin.printInvoice('${o.id}')" title="Print GST invoice">🧾</button>` : ''}
            <button class="icon-e" onclick="ShivaaAdmin.reviewAsk('${o.id}')" title="Ask for review">⭐</button>
            <button class="icon-e" onclick="ShivaaAdmin.orderMeta('${o.id}')" title="HUID / dispatch / e-way">📋</button>
            <button class="icon-e" onclick="ShivaaAdmin.printSlip('${o.id}')" title="Packing slip">📦</button>
            <button class="icon-e" onclick="ShivaaAdmin.printReceipt('${o.id}')" title="Thermal receipt (58/80mm)">🖨</button>
            <button class="icon-e" onclick="ShivaaAdmin.printLabel('${o.id}')" title="Shipping label">🏷</button></td>
        </tr>`).join('')}</tbody>
      </table></div></div>`;
  }

  /* ── v60 REPORTS · GST/CA pack ── */
  if (tab === 'reports') {
    const today = new Date(); const monAgo = new Date(Date.now() - 29 * 864e5);
    const iso = d => d.toLocaleDateString('en-CA');
    body.innerHTML = `<div class="adm-card">
      <h3>Reports</h3>
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:end;margin:10px 0">
        <div class="fld" style="margin:0"><label>From</label><input type="date" id="rpFrom" value="${iso(monAgo)}"></div>
        <div class="fld" style="margin:0"><label>To</label><input type="date" id="rpTo" value="${iso(today)}"></div>
        <button class="btn btn-gold btn-sm" id="rpGo">Run report</button>
        <button class="btn btn-outline btn-sm" id="rpCsv">⬇ Sales CSV (for CA)</button>
        <button class="btn btn-ghost btn-sm" id="rpAudit">Audit log</button>
      </div>
      <div id="rpBody"><p class="partner-note">Choose a range and run — revenue split, GST (CGST+SGST), metal vs making, bestsellers, dead stock, karigar metal out, and payment proofs pending.</p></div>
    </div>
    <div class="adm-card" id="auditCard" style="display:none;max-height:70vh;overflow:auto"><h3>Audit log (last 300)</h3><div id="auditBody"></div></div>`;
    $('#rpGo').onclick = ShivaaAdmin.runReport;
    $('#rpCsv').onclick = ShivaaAdmin.reportCSV;
    $('#rpAudit').onclick = ShivaaAdmin.openAudit;
    ShivaaAdmin.runReport();
  }

  /* ── v60 REFUNDS / EXCHANGES ── */
  if (tab === 'refunds') {
    const reqs = (refundsData.requests || []).slice().reverse();
    body.innerHTML = `<div class="adm-card"><h3>${reqs.length} refund / exchange requests</h3>
      ${reqs.length ? `<div style="display:grid;gap:12px;margin-top:10px">${reqs.map(r => `<div class="ref-row">
        <div class="rr-main"><b>${esc(r.id.toUpperCase())}</b> · <span class="status-pill st-${String(r.status).toLowerCase()}">${esc(r.status)}</span> · ${esc(r.kind || 'refund')}
          <br><small>${esc(r.userName)} · order <b>${esc(r.orderId)}</b> · ${new Date(r.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</small>
          <p style="margin:6px 0">“${esc(r.reason)}”</p>
          ${r.note ? `<small class="rr-note">→ ${esc(r.note)}</small>` : ''}
          ${r.creditNote ? `<br><small style="color:var(--maroon-deep)"><b>Credit note ${esc(r.creditNote)}</b></small>` : ''}</div>
        ${r.status === 'requested' ? `<div class="rr-acts">
          <button class="btn btn-gold btn-sm" onclick="ShivaaAdmin.refundDecide('${r.id}','approve')">✓ Approve</button>
          <button class="btn btn-ghost btn-sm" onclick="ShivaaAdmin.refundDecide('${r.id}','reject')">Reject</button>
          <a class="btn btn-outline btn-sm" target="_blank" rel="noopener" href="${Shivaa.waLink('Namaste ✦ about your ' + r.kind + ' request for order ' + r.orderId + ':')}">📱 WhatsApp</a>
        </div>` : ''}
      </div>`).join('')}</div>` : '<p class="partner-note">No refund or exchange requests. Customers raise these from their order page within 7 days of delivery.</p>'}
    </div>`;
  }

  /* ── v60 SWARNA NIDHI admin ── */
  if (tab === 'nidhi') {
    const plans = (savingsData.plans || []).slice().reverse();
    body.innerHTML = `<div class="adm-card"><h3>${plans.length} Swarna Nidhi plans</h3>
      <p class="partner-note">Record each counter/UPI instalment here — the customer&rsquo;s digital passbook and indicative grams update instantly. Shivaa&rsquo;s 12th instalment unlocks after 11 paid months.</p>
      ${plans.length ? `<div class="adm-table-wrap" style="margin-top:10px"><table class="adm-table">
        <thead><tr><th>Plan</th><th>Customer</th><th class="num">Monthly</th><th class="num">Paid months</th><th class="num">Contributed</th><th class="num">~22K grams</th><th>Status</th><th></th></tr></thead>
        <tbody>${plans.map(p => `<tr>
          <td><b>${esc(p.id.toUpperCase())}</b><br><small>${new Date(p.createdAt).toLocaleDateString('en-IN')}</small></td>
          <td>${esc(p.userName)}<br><small style="color:var(--ink-3)">${esc(p.phone || '')}</small></td>
          <td class="num">${fmt(p.monthlyAmount)}</td>
          <td class="num">${p.paidMonths}/11</td>
          <td class="num"><b>${fmt(p.contributed)}</b></td>
          <td class="num">${(p.indicativeGrams22 || 0).toFixed(2)} g</td>
          <td><span class="status-pill st-${p.status === 'active' ? 'placed' : 'delivered'}">${esc(p.status)}</span></td>
          <td style="white-space:nowrap">${p.status === 'active' ? `
            <button class="btn btn-gold btn-sm" onclick="ShivaaAdmin.nidhiPay('${p.id}')">+ Instalment</button>
            <button class="btn btn-outline btn-sm" onclick="ShivaaAdmin.nidhiAct('${p.id}','redeem')">Redeem</button>
            <button class="btn btn-ghost btn-sm" onclick="ShivaaAdmin.nidhiAct('${p.id}','close')">Close/refund</button>` : ''}</td>
        </tr>`).join('')}</tbody></table></div>` : '<p class="partner-note">No plans yet. Customers enrol from the Swarna Nidhi page.</p>'}
    </div>`;
  }

  /* ── GOLD FINALE — entry ledger for the CA-witnessed draw ── */
  if (tab === 'finale') {
    const enteredN = finaleEntries.filter(e => e.status === 'Entered').length;
    const freeN = finaleEntries.filter(e => e.route === 'free').length;
    body.innerHTML = `<div class="adm-card"><h3>${finaleEntries.length} Gold Finale entries · ${enteredN} entered · ${freeN} free-route</h3>
      <p class="partner-note" style="font-size:12.5px">One entry per person (purchase + free routes combined). Before the draw: confirm every purchase entry's order is <b>paid / not cancelled</b>, then export this list and hand it to the CA witness along with the SHA-256 ledger freeze.</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin:12px 0 4px">
        <button class="btn btn-primary btn-sm" onclick="ShivaaAdmin.finaleCSV()">⬇ Download CSV</button>
        <a class="btn btn-ghost btn-sm" href="#/finale" target="_blank" rel="noopener">View campaign page ↗</a>
      </div>
      ${finaleEntries.length ? `<div class="adm-table-wrap"><table class="adm-table">
        <thead><tr><th>Entry</th><th>Customer</th><th>Route</th><th>Order</th><th class="num">Score</th><th>Status</th><th>Date</th></tr></thead>
        <tbody>${finaleEntries.map(e => `<tr>
          <td><b>${esc(e.id)}</b></td>
          <td>${esc(e.name)}<br><small style="color:var(--ink-3)">${esc(e.phone)}</small></td>
          <td><span class="status-pill ${e.route === 'free' ? 'st-placed' : 'st-packed'}">${e.route === 'free' ? 'free' : 'purchase'}</span></td>
          <td>${e.orderId ? '<b>' + esc(e.orderId) + '</b>' : '—'}</td>
          <td class="num"><b>${e.score}/${e.total}</b></td>
          <td><span class="status-pill ${e.status === 'Entered' ? 'st-placed' : 'st-packed'}">${esc(e.status)}</span></td>
          <td style="white-space:nowrap">${new Date(e.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</td>
        </tr>`).join('')}</tbody>
      </table></div>` : '<p class="partner-note">No entries yet — entries are created when a customer passes the scored quiz after a qualifying order, or through the free route on the campaign page.</p>'}</div>`;
  }

  /* ── RING WEIGHTS quick-entry desk ── */
  if (tab === 'weights') {
    const rings = state.productsCache.filter(p => p.id.startsWith('p_ringpdf_'));
    const assumed = rings.filter(p => p.weightAssumed).length;
    body.innerHTML = `
    <div class="adm-card"><h3>⚖ Ring Weights — read from the tags
      <span style="font-size:12px;color:var(--ink-3);font-weight:400">${assumed} assumed · type the real tag weight & press Enter</span></h3>
      <div class="wt-grid">
        ${rings.map(p => `<div class="wt-card ${p.weightAssumed ? 'assumed' : ''}">
          <img src="${safeUrl(p.images && p.images[0])}" loading="lazy" alt="${esc(p.sku || '')}">
          <div class="wt-tx"><b>${p.sku}</b>
            <input type="number" step="0.001" min="0.5" value="${p.weightG}" data-id="${p.id}"
              placeholder="tag weight (g)" onchange="ShivaaAdmin.setWt('${p.id}', this.value)">
            <small class="wt-flag">${p.weightAssumed ? '⚠ assumed — verify' : '✓ set'}</small>
          </div>
        </div>`).join('')}
      </div></div>`;
  }

  /* ── BULLION ── */
  if (tab === 'bullion') {
    body.innerHTML = `<div class="adm-card"><h3>🥇 Bullion — CASH rates <span style="font-size:12px;color:var(--ink-3);font-weight:400">— RTGS rows auto-compute from the live feed; only CASH rates need you</span></h3>
      <div id="admBullion"><div class="loading-spin"></div></div>
      <p class="partner-note" style="margin-top:12px">Saving instantly notifies every logged-in jeweller portal ("📈 Bullion CASH rates updated"). RTGS (TDS Gold 995, Silver Chorsa/Peti) update automatically every few minutes straight from the MCX feed — no action needed.</p>
    </div>
    <div class="adm-card"><h3>🎛 RTGS board calibration <span style="font-size:12px;color:var(--ink-3);font-weight:400">— match your reference screen once; rows then auto-track the exchange future</span></h3>
      <div id="admRtgs"><div class="loading-spin"></div></div>
    </div>
    <div class="adm-card"><h3>All bullion orders</h3><div id="admBlOrders"></div></div>`;
    (async () => {
      try {
        const B = await api('/api/bullion');
        const cash = B.rows.filter(r => r.editable);
        const rtgs = B.rows.filter(r => !r.editable);
        document.getElementById('admBullion').innerHTML = `
          <div class="mc-table-wrap"><table class="mc-table"><thead><tr><th>RTGS (auto · live feed)</th><th>Purity</th><th class="num">Buy ₹/g</th><th class="num">Sell ₹/g</th></tr></thead>
          <tbody>${rtgs.map(r => `<tr><td><b>${r.label}</b></td><td>${r.purity}</td><td class="num">${r.buy.toLocaleString('en-IN')}</td><td class="num">${r.sell.toLocaleString('en-IN')}</td></tr>`).join('')}</tbody></table></div>
          <div class="sec-title" style="margin-top:20px">CASH rates — you control these</div>
          <form id="blCashForm" class="form-grid" onsubmit="ShivaaAdmin.saveBullion(event)">
            ${cash.map(r => `<div class="fld full bl-edit-row"><label><b>${r.label}</b> · ${r.purity}</label>
              <div style="display:flex;gap:10px"><input type="number" data-k="${r.key}" data-f="buy" value="${r.buy}" placeholder="Buy ₹/g" style="flex:1"><input type="number" data-k="${r.key}" data-f="sell" value="${r.sell}" placeholder="Sell ₹/g" style="flex:1"></div></div>`).join('')}
            <button class="btn btn-primary btn-block" style="grid-column:1/-1">💾 Save Cash Rates (notifies jewellers)</button>
          </form>`;
        /* v68 — RTGS factor / premium / spread calibration */
        (() => {
          const cfg = B.rtgsConfig || {};
          const fut = (B.board && B.board.future) || {};
          const duty = (B.board && B.board.duty) || {};
          const gA = (fut.gold && fut.gold.ltp) || 0, sA = (fut.silver && fut.silver.ltp) || 0;
          const meta = [
            ['tdsGold9999', 'TDS GOLD 9999 RTGS', 'g'], ['tdsGold995', 'TDS GOLD 995 IND', 'g'],
            ['silverChorsa', 'TDS SIL CHORSA', 's'], ['silverPeti', 'TDS SIL PETI 999.9', 's'],
            ['silverKachcha', 'REF SIL KACHCHA DHEPA', 's'], ['silverPetiBulk', 'REF SIL CHORSA 98.00', 's'],
            ['silverGrn999', 'REF SIL GRN 999', 's']];
          const inp = (name, val, step, extra = '') => `<input name="${name}" type="number" value="${val}" step="${step}" ${extra} style="width:84px;padding:6px">`;
          const rows = meta.map(([key, label, m]) => {
            const c = cfg[key] || { factor: 1, prem: 0, spread: 0, side: 'both' };
            const anchor = m === 'g' ? gA : sA;
            const unit = m === 'g' ? '₹/10 g' : '₹/kg';
            const sides = ['both', 'buy', 'sell', 'off'].map(s => `<option value="${s}" ${c.side === s ? 'selected' : ''}>${{ both: 'Buy & sell', buy: 'Buy only', sell: 'Sell only', off: 'Hidden' }[s]}</option>`).join('');
            return `<tr data-key="${key}" data-anchor="${anchor}" data-metal="${m}">
              <td><b>${esc(label)}</b><br><small>future ${Number(anchor).toLocaleString('en-IN')} · ${unit}</small></td>
              <td>${inp('factor', c.factor, '0.0001', 'min="0.5" max="1.2"')}</td>
              <td>${inp('prem', c.prem, m === 'g' ? '10' : '100')}</td>
              <td>${inp('spread', c.spread, m === 'g' ? '10' : '100')}</td>
              <td><select name="side" style="padding:6px">${sides}</select></td>
              <td class="num"><b class="js-buy" style="color:#1d8a4d">--</b><br><b class="js-sell" style="color:#c0392b">--</b></td>
              <td><input name="tb" type="number" placeholder="ref BUY" style="width:96px;padding:6px"></td>
              <td><input name="ts" type="number" placeholder="ref SELL" style="width:96px;padding:6px"></td>
            </tr>`;
          }).join('');
          window.ShivaaAdmin._dutyParity = { gold: duty.goldParity || 0, silver: duty.silverParity || 0 };
          document.getElementById('admRtgs').innerHTML = `
            <p class="partner-note">Each RTGS row = <b>live future × factor + premium ± spread</b>. Open your reference bullion app (Liverate/Pride Gold), type its BUY/SELL for a row in the two right-hand boxes, and premium &amp; spread are calculated automatically — then Save. The row follows the future forever after. Leave reference boxes empty to edit premium/spread by hand. Factor is purity (0.98 = 98% silver etc.).</p>
            <form id="rtgsForm" onsubmit="ShivaaAdmin.saveRtgs(event)" oninput="ShivaaAdmin.rtgsSync(event)">
              <div class="mc-table-wrap"><table class="mc-table"><thead><tr>
                <th>Row</th><th>Factor</th><th>Premium</th><th>Spread</th><th>Shown</th><th class="num">Now BUY / SELL</th><th>Ref BUY →</th><th>Ref SELL →</th>
              </tr></thead><tbody>${rows}</tbody></table></div>
              <div class="form-grid" style="grid-template-columns:1fr 1fr;margin-top:14px">
                <div class="fld"><label>Gold customs multiplier <small>(landed duty ÷ import parity · gold card ₹/100 g)</small></label>
                  <input name="gm" type="number" step="0.001" min="0.8" max="3" value="${duty.goldMult || 1.553}" oninput="ShivaaAdmin.rtgsSync()"><small>Customs card now: <b id="dutyGoldPrev">--</b> (parity ${Number(duty.goldParity || 0).toLocaleString('en-IN')})</small></div>
                <div class="fld"><label>Silver customs multiplier <small>(silver card ₹/kg)</small></label>
                  <input name="sm" type="number" step="0.001" min="0.8" max="3" value="${duty.silverMult || 1.62}" oninput="ShivaaAdmin.rtgsSync()"><small>Customs card now: <b id="dutySilverPrev">--</b> (parity ${Number(duty.silverParity || 0).toLocaleString('en-IN')})</small></div>
              </div>
              <button class="btn btn-primary btn-block" style="margin-top:12px">💾 Save RTGS calibration</button>
            </form>`;
          ShivaaAdmin.rtgsSync();
        })();
        const { orders } = await api('/api/bullion/orders');
        document.getElementById('admBlOrders').innerHTML = orders.length ? `<div class="adm-table-wrap"><table class="adm-table"><thead><tr><th>ID</th><th>Partner</th><th>Side</th><th>Metal</th><th class="num">Qty</th><th class="num">Value</th><th>When</th><th>Status</th></tr></thead><tbody>${orders.map(o => `<tr><td><b>${esc(o.id || '')}</b></td><td>${esc(o.partnerName || '')}</td><td>${esc(o.side || '')}</td><td>${esc(String(o.metal || '').split('—')[0])}</td><td class="num">${Number(o.qty) || 0}${esc(o.unit || '')}</td><td class="num"><b>₹${o.amount.toLocaleString('en-IN')}</b></td><td>${new Date(o.createdAt).toLocaleDateString('en-IN')}</td><td><select onchange="ShivaaAdmin.blStatus('${o.id}',this.value)">${['New','Confirmed','Delivered','Cancelled'].map(s2 => `<option ${o.status === s2 ? 'selected' : ''}>${s2}</option>`).join('')}</select></td></tr>`).join('')}</tbody></table></div>` : '<p class="partner-note">No bullion orders yet.</p>';
      } catch (e) { document.getElementById('admBullion').innerHTML = '<p class="partner-note">' + e.message + '</p>'; }
    })();
  }

  /* ── RATES ── */
  if (tab === 'rates') {
    const R = state.rates;
    body.innerHTML = `
      <div class="stat-grid">
        ${[['Gold 24K', R.gold24, '/g'], ['Gold 22K', R.gold22, '/g'], ['Gold 18K', R.gold18, '/g'], ['Silver 925', R.silver, '/g']]
          .map(c => `<div class="stat"><small>${c[0]}</small><b>${fmt(c[1])}${c[2]}</b><span>per 10g: ${fmt(c[1] * 10)}</span></div>`).join('')}
      </div>
      <div class="adm-card"><h3>Feed control <span class="src-badge ${R.source === 'live' ? 'src-live' : 'src-sim'}"><span class="live-dot"></span>${esc(R.source)}</span></h3>
        <p style="font-size:13.5px;color:var(--ink-2);margin-bottom:14px">Server polls the bullion market every 10 minutes (XAU/XAG USD→INR). "Refresh now" forces an immediate poll; override pins the counter rate (e.g., for in-store boards) until cleared.</p>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn btn-primary btn-sm" onclick="ShivaaAdmin.refreshRates()">↻ Refresh now</button>
          <span style="font-size:12px;color:var(--ink-3);align-self:center">Last updated ${new Date(R.t).toLocaleTimeString('en-IN')}</span>
        </div>
        <div class="sec-title" style="margin-top:22px">Manual override</div>
        <form class="form-grid" onsubmit="ShivaaAdmin.setOverride(event)" style="max-width:560px">
          <div class="fld"><label>Gold 24K (₹/g)</label><input type="number" step="0.01" value="${R.gold24}" required></div>
          <div class="fld"><label>Silver (₹/g)</label><input type="number" step="0.01" value="${R.silver}" required></div>
          <div class="fld full" style="display:flex;gap:10px"><button class="btn btn-gold btn-sm">Set override</button>
          <button type="button" class="btn btn-ghost btn-sm" onclick="ShivaaAdmin.clearOverride()">Clear override</button>
          ${R.override ? '<span style="font-size:12.5px;color:var(--warn);align-self:center">⚠ override is ACTIVE — storefront prices use these values</span>' : ''}</div>
        </form>
      </div>
      <div class="adm-card poster-card">
        <h3>📱 Daily rate poster <span style="font-size:12px;color:var(--ink-3);font-weight:400">— one tap to make the WhatsApp status image for today's rates</span></h3>
        <p style="font-size:13.5px;color:var(--ink-2)">Renders a 1080×1920 (9:16) branded poster using the live rates above. Download it and post on the store's WhatsApp status / groups. The date and time are stamped automatically.</p>
        <div class="poster-preview"><canvas id="ratePosterCv" width="540" height="960"></canvas></div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px">
          <button class="btn btn-gold btn-sm" onclick="ShivaaAdmin.ratePoster()">↻ Regenerate with live rates</button>
          <button class="btn btn-primary btn-sm" onclick="ShivaaAdmin.downloadPoster()">⬇ Download poster (PNG)</button>
        </div>
      </div>
      <div class="adm-card"><h3>22K gold — recent history</h3><canvas id="admRateChart"></canvas></div>`;
    window.Shivaa._chart && window.Shivaa._chart();
    const cv = $('#admRateChart');
    // reuse the store's chart renderer
    const hist = R.history || [];
    if (cv && hist.length) {
      const x = cv.getContext('2d'), dpr = Math.min(devicePixelRatio || 1, 2);
      const w = cv.parentElement.clientWidth, h = 260;
      cv.width = w * dpr; cv.height = h * dpr; cv.style.height = h + 'px'; x.setTransform(dpr, 0, 0, dpr, 0, 0);
      const data = hist.map(p => p.gold22), pad = { l: 56, r: 20, t: 10, b: 22 };
      const min = Math.min(...data), max = Math.max(...data);
      const X = i => pad.l + i / (data.length - 1) * (w - pad.l - pad.r);
      const Y = v => pad.t + (1 - (v - min) / (max - min || 1)) * (h - pad.t - pad.b);
      x.strokeStyle = '#eee3cd'; x.fillStyle = '#8a7d6c'; x.font = '11px Jost';
      for (let i = 0; i <= 4; i++) { const v = min + (max - min) * i / 4, y = Y(v); x.beginPath(); x.moveTo(pad.l, y); x.lineTo(w - pad.r, y); x.stroke(); x.fillText(Math.round(v), 8, y + 4); }
      x.beginPath(); data.forEach((v, i) => i ? x.lineTo(X(i), Y(v)) : x.moveTo(X(i), Y(v)));
      x.strokeStyle = '#6e1e2a'; x.lineWidth = 2; x.stroke();
    }
    window.ShivaaAdmin.ratePoster();
  }

  /* ── MAKING CHARGES (now per-product) ── */
  if (tab === 'mc') {
    body.innerHTML = `<div class="adm-card"><h3>Making charges are set per product</h3>
      <p style="font-size:14px;color:var(--ink-2);line-height:1.8">We no longer fix making charges by category. Every piece carries its own percentage, exactly like the Tanishq model — customers see it only on that product's page.</p>
      <p style="font-size:13.5px;color:var(--ink-3);margin-top:8px">To price a piece: <b>Products → Edit/Add</b> → “MC % of metal value” field. The bullion desk handles partner metal rates separately.</p>
      <a class="btn btn-primary" style="margin-top:14px" href="#/admin?tab=products">Go to Products →</a></div>`;
  }

  /* ── CATALOGS ── */
  if (tab === 'catalogs') {
    body.innerHTML = `
      <div class="adm-card"><h3>Upload catalogue PDF <span style="font-size:12px;color:var(--ink-3);font-weight:400">— rings, earrings, festive specials… appears on the storefront Catalogues page instantly</span></h3>
        <form id="catUpload" class="form-grid">
          <div class="fld"><label>Title *</label><input name="title" required placeholder="e.g. Diwali Collection 2026"></div>
          <div class="fld"><label>Category</label><input name="category" placeholder="Rings / Bridal / Silver…"></div>
          <div class="fld full"><label>Description</label><input name="desc" placeholder="What's inside this catalogue"></div>
          <div class="fld full" style="display:flex;gap:20px;align-items:center"><label style="margin:0"><input type="checkbox" name="featured" style="accent-color:var(--gold)"> Feature on storefront</label></div>
          <div class="fld full">
            <div class="drop-zone" id="dropZone">
              <div style="font-size:34px;margin-bottom:6px">❒</div>
              <b>Drop PDF here or click to browse</b><br><small>PDF catalogues only · up to ~25 MB</small>
              <input type="file" id="catFile" name="file" accept="application/pdf,.pdf" hidden>
            </div>
          </div>
          <button class="btn btn-primary" style="grid-column:1/-1;justify-self:start" type="submit">Upload Catalogue</button>
        </form></div>
      <div class="adm-card"><h3>${catalogs.length} catalogues</h3>
        <div class="adm-table-wrap"><table class="adm-table">
          <thead><tr><th>Title</th><th>Category</th><th class="num">Size</th><th class="num">Downloads</th><th>Added</th><th>Featured</th><th></th></tr></thead>
          <tbody>${catalogs.map(c => `<tr>
            <td><b>${esc(c.title)}</b><br><small style="color:var(--ink-3)">${esc(c.desc || '')}</small></td>
            <td>${esc(c.category)}</td><td class="num">${(c.size / 1048576).toFixed(1)} MB</td><td class="num">${c.downloads}</td>
            <td>${new Date(c.addedAt).toLocaleDateString('en-IN')}</td>
            <td><input type="checkbox" ${c.featured ? 'checked' : ''} onchange="ShivaaAdmin.featCat('${c.id}', this.checked)" style="accent-color:var(--gold)"></td>
            <td style="white-space:nowrap"><a class="icon-e" href="${safeUrl(c.file)}" target="_blank" rel="noopener" title="view">👁</a> <button class="icon-x" onclick="ShivaaAdmin.delCat('${c.id}')">✕</button></td>
          </tr>`).join('')}</tbody>
        </table></div></div>`;
    const dz = $('#dropZone'), fi = $('#catFile');
    dz.onclick = () => fi.click();
    dz.ondragover = e => { e.preventDefault(); dz.classList.add('drag'); };
    dz.ondragleave = () => dz.classList.remove('drag');
    dz.ondrop = e => { e.preventDefault(); dz.classList.remove('drag'); if (e.dataTransfer.files[0]) fi.files = e.dataTransfer.files; };
    fi.onchange = () => { if (fi.files[0]) dz.querySelector('b').textContent = fi.files[0].name; };
    $('#catUpload').onsubmit = async e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      if (!fi.files[0]) return toast('Choose a PDF file first', 'err');
      fd.append('file', fi.files[0]);
      const btn = e.target.querySelector('button[type=submit]'); btn.disabled = true; btn.textContent = 'Uploading…';
      try {
        const res = await fetch('/api/catalogs', { method: 'POST', headers: token() ? { Authorization: 'Bearer ' + token() } : {}, body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Upload failed');
        toast('Catalogue published ✦'); renderAdmin($('#view'), new URLSearchParams('tab=catalogs'));
      } catch (err) { toast(err.message, 'err'); btn.disabled = false; btn.textContent = 'Upload Catalogue'; }
    };
  }

  /* ── PARTNERS ── */
  if (tab === 'partners') {
    const P = partnersData.partners || [];
    window.__partnersList = P;   // v88 — KYC detail modal reads the full records
    body.innerHTML = `
      <div class="stat-grid">
        <div class="stat"><small>Total partners</small><b>${P.length}</b></div>
        <div class="stat"><small>Approved</small><b>${P.filter(p => p.status === 'approved').length}</b></div>
        <div class="stat"><small>Pending</small><b>${P.filter(p => p.status === 'pending').length}</b><span>needs review</span></div>
        <div class="stat"><small>Cities</small><b>${new Set(P.map(p => p.city).filter(Boolean)).size}</b></div>
      </div>
      <div class="adm-card"><h3>Partner applications & network</h3>
        <div class="adm-table-wrap"><table class="adm-table">
          <thead><tr><th>Firm</th><th>KYC</th><th>City</th><th>Phone / Email</th><th>Applied</th><th>Status</th><th></th></tr></thead>
          <tbody>${P.map(p => `<tr>
            <td><b>${esc(p.firm)}</b>${p.kyc ? `<br><small style="color:var(--ink-3)">${esc(p.kyc.gstin)}</small>${p.kyc.legalName ? `<br><small style="color:var(--ink-3)">Reg: ${esc(p.kyc.legalName)}</small>` : ''}` : ''}</td>
            <td>${p.kyc ? (p.kyc.gstinLiveVerified
                ? `<span class="pill pm" title="${esc('GST register: ' + (p.kyc.gstStatus || 'Active') + (p.kyc.businessType ? ' · ' + p.kyc.businessType : ''))}">GST ✓ live</span><br><span class="pill pm" style="margin-top:4px">OTP ✓</span>`
                : `<span class="pill" style="background:#fff3cd;color:#7a5c00" title="Checksum valid; government register could not be reached — verify before approving">GST ? check</span><br><span class="pill pm" style="margin-top:4px">OTP ✓</span>`)
                : '<span class="pill pf">no kyc</span>'}</td>
            <td>${esc(p.contactPerson || '—')}</td><td>${esc(p.city || '—')}</td>
            <td>${esc(p.phone)}<br><small style="color:var(--ink-3)">${esc(p.email)}</small></td>
            <td>${new Date(p.appliedAt).toLocaleDateString('en-IN')}</td>
            <td><span class="status-pill ${p.status === 'approved' ? 'st-delivered' : p.status === 'pending' ? 'st-placed' : 'st-cancelled'}">${esc(p.status || '—')}</span></td>
            <td style="white-space:nowrap">${p.status === 'pending' ? `<button class="btn btn-primary btn-sm" onclick="ShivaaAdmin.setPartner('${p.id}','approved')">Approve</button> <button class="btn btn-ghost btn-sm" onclick="ShivaaAdmin.setPartner('${p.id}','rejected')">Reject</button>` : ''}
              ${p.kyc && p.kyc.gstin ? `<button class="btn btn-ghost btn-sm" onclick="ShivaaAdmin.gstKycModal('${p.id}')" title="Full GST register details and certificate">KYC details</button>` : ''}
              ${p.kyc && p.kyc.businessCard ? `<a class="btn btn-ghost btn-sm" href="${safeUrl(p.kyc.businessCard)}" target="_blank" rel="noopener" title="Business card uploaded with the application">Business card</a>` : ''}
              <button class="btn btn-ghost btn-sm" data-em="${esc(p.email)}" onclick="ShivaaAdmin.setUserPassword(this)" title="Set a new portal password for this partner">Portal password</button></td>
          </tr>`).join('')}</tbody>
        </table></div></div>`;
  }

  /* ── CUSTOMERS ── */
  if (tab === 'customers') {
    body.innerHTML = `<div class="adm-card"><h3>${users.length} registered users</h3>
      <div class="adm-table-wrap"><table class="adm-table">
        <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th class="num">Royalty pts</th><th>Joined</th><th></th></tr></thead>
        <tbody>${users.map(u => `<tr>
          <td><b>${esc(u.name)}</b></td><td>${esc(u.email)}</td><td>${esc(u.phone || '—')}</td>
          <td><span class="pill ${u.role === 'admin' ? 'pf' : 'pm'}">${u.role}</span></td>
          <td class="num">${u.loyaltyPoints || 0}</td><td>${new Date(u.createdAt).toLocaleDateString('en-IN')}</td>
          <td style="white-space:nowrap">${(u.role !== 'admin' || (state.user && u.id === state.user.id)) ? `<button class="btn btn-ghost btn-sm" data-uid="${u.id}" data-em="${esc(u.email)}" ${u.role === 'admin' ? 'data-admin="1"' : ''} onclick="ShivaaAdmin.setUserPassword(this)" title="Set a new sign-in password">Password</button>` : ''}
            <button class="btn btn-ghost btn-sm" onclick="ShivaaAdmin.userData('${u.id}')" title="DPDP data export">📂</button>
            ${u.role !== 'admin' ? `<button class="btn btn-ghost btn-sm" onclick="ShivaaAdmin.anonymize('${u.id}')" title="Erase personal data (DPDP)">🪦</button>` : ''}</td>
        </tr>`).join('')}</tbody>
      </table></div>
      <div class="adm-card" style="margin-top:14px"><h3>Customer reviews — replies &amp; photos</h3><div id="rvAdmin"><p class="partner-note">Loading…</p></div></div>
    </div>`;
    ShivaaAdmin.loadReviews();
  }

  /* ── LEADS ── */
  if (tab === 'leads') {
    const R = leads.requests || [];
    const reachedAlerts = rateAlerts.filter(a => a.reached);
    const alertsCard = `<div class="adm-card"><h3>🔔 Rate-drop alerts (${rateAlerts.length})${reachedAlerts.length ? ` · <span style="color:var(--ok)">${reachedAlerts.length} ready to ping now</span>` : ''}</h3>
      ${rateAlerts.length ? `<div class="adm-table-wrap"><table class="adm-table"><thead><tr><th>Metal</th><th class="num">Target ₹/g</th><th class="num">Now</th><th>Contact</th><th>Watching</th><th></th></tr></thead>
      <tbody>${rateAlerts.slice(0, 60).map(a => {
        const contact = a.phone ? 'wa.me/91' + a.phone : a.email;
        return `<tr style="${a.reached ? 'background:#f2faf4' : ''}"><td>${esc(a.metal)}</td><td class="num"><b>${fmt(a.target)}</b></td><td class="num">${fmt(a.currentRate)}</td>
        <td>${esc(contact)}</td><td>${a.productId ? '<a href="#/product/' + esc(a.productId) + '">a saved piece</a>' : 'the rate'}</td>
        <td>${a.phone ? `<a class="btn btn-outline btn-sm" target="_blank" rel="noopener" href="https://wa.me/91${esc(a.phone)}?text=${encodeURIComponent('Namaste ✦ your Shivaa rate alert: ' + a.metal + ' is at ₹' + Math.round(a.currentRate) + '/g, near your target of ₹' + Math.round(a.target) + '/g — reply to hold the rate or order.')}">Ping</a>` : ''}</td></tr>`;
      }).join('')}</tbody></table></div>` : '<p class="partner-note">No alerts yet — customers set these from wishlists & product pages.</p>'}</div>`;
    body.innerHTML = alertsCard + `<div class="adm-card"><h3>Service &amp; care requests (${R.length})</h3>
      ${R.length ? `<div class="adm-table-wrap"><table class="adm-table">
        <thead><tr><th>Type</th><th>Name</th><th>Phone</th><th>Email</th><th>Details</th><th>Budget</th><th>When</th><th>Status</th><th></th></tr></thead>
        <tbody>${R.map(r => {
          const isCare = String(r.type || '').startsWith('care-');
          const statuses = isCare ? ['new', 'Confirmed', 'Picked up', 'At karigar', 'Ready', 'Delivered', 'closed'] : ['new', 'contacted', 'quoted', 'won', 'closed'];
          const stNow = isCare && r.status === 'new' ? 'new' : r.status;
          return `<tr${isCare ? ' style="background:#fffdf5"' : ''}>
          <td><span class="pill pm">${esc(r.type)}</span>${r.orderId ? '<br><small>order ' + esc(r.orderId) + '</small>' : ''}</td><td><b>${esc(r.name)}</b></td><td>${esc(r.phone)}</td><td>${esc(r.email || '—')}</td>
          <td style="max-width:280px"><small>${esc(r.details || '')}</small></td><td>${esc(r.budget || '—')}</td>
          <td>${new Date(r.createdAt).toLocaleDateString('en-IN')}</td>
          <td><select onchange="ShivaaAdmin.srStatus('${r.id}', this.value)" style="border:1px solid var(--line);border-radius:8px;padding:6px 9px;font-size:12.5px">${statuses.map(s => `<option ${stNow === s ? 'selected' : ''}>${s}</option>`).join('')}</select></td>
          <td><button class="icon-e" title="WhatsApp update" onclick="window.open('https://wa.me/91'+String(${jsArg(r.phone)}).replace(/\\D/g,'').slice(-10)+'?text='+encodeURIComponent('Namaste '+${jsArg((r.name || '').split(' ')[0])}+' ✦ update on your Shivaa care token ${r.id}: status is now '+this.closest('tr').querySelector('select').value+'. Thank you — Shivaa Jewellers.'),'_blank')">📱</button></td>
        </tr>`; }).join('')}</tbody></table></div>` : '<p style="color:var(--ink-3)">No service requests yet — they land here from Bespoke &amp; Care, B2B forms and contact page.</p>'}
    </div>`;
  }

  /* ── COUPONS ── */
  if (tab === 'coupons') {
    body.innerHTML = `<div class="adm-card"><h3>Active coupons</h3>
      <div class="adm-table-wrap"><table class="adm-table">
        <thead><tr><th>Code</th><th>Discount</th><th class="num">Min order</th><th>Note</th><th>Active</th></tr></thead>
        <tbody>${coupons.map(c => `<tr>
          <td><b style="letter-spacing:.08em">${esc(c.code)}</b></td>
          <td>${c.type === 'percent' ? c.value + '%' : fmt(c.value)}</td>
          <td class="num">${fmt(c.minOrder)}</td><td>${esc(c.note || '')}</td>
          <td><input type="checkbox" checked style="accent-color:var(--gold)"></td>
        </tr>`).join('')}</tbody></table></div></div>
      <div class="adm-card"><h3>Create coupon</h3>
        <form class="form-grid" onsubmit="ShivaaAdmin.addCoupon(event)" style="max-width:640px">
          <div class="fld"><label>Code</label><input name="code" required placeholder="AKSHAYA3"></div>
          <div class="fld"><label>Type</label><select name="type" id="cpType" class="sortsel" style="width:100%;border-radius:12px"><option value="percent">Percent %</option><option value="flat">Flat ₹</option></select></div>
          <div class="fld"><label>Value</label><input name="value" type="number" required min="1"></div>
          <div class="fld"><label>Min order ₹</label><input name="minOrder" type="number" min="0" value="0"></div>
          <div class="fld full"><label>Note</label><input name="note" placeholder="shown to customers"></div>
          <button class="btn btn-primary btn-sm" style="justify-self:start">Create</button>
        </form></div>`;
  }

  /* ── PAGES ── */
  if (tab === 'pages') {
    body.innerHTML = `<div class="adm-card"><h3>📄 Pages <button class="btn btn-primary btn-sm" onclick="ShivaaPages.edit()">+ New Page</button></h3>
      <p class="partner-note" style="margin-bottom:14px">Create any page yourself — Terms, About, Offers, Store Policies… It appears instantly at <b>shivaa.in/#/p/your-address</b> and in the footer. No code needed.</p>
      <div id="pgList"><div class="loading-spin"></div></div></div>`;
    ShivaaPages.load();
  }

  /* ── SETTINGS ── */
  if (tab === 'khata') {
    const KP = (khataData.partners || []).filter(x => x.status === 'approved');
    const K = khataData.khata || [];
    const bal = pid => K.filter(k => k.partnerId === pid).reduce((a, k) => a + (k.type === 'credit' ? -k.amt : k.type === 'debit' ? k.amt : 0), 0);
    body.innerHTML = `<div class="adm-card"><h3>📒 Khata — partner credit ledger</h3>
      <p class="partner-note" style="font-size:12.5px">Debit = the partner owes you. Credit = payment received or metal deposited. Keep one unit (₹ or fine grams) per partner for clean statements; the Print button produces the statement.</p>
      ${KP.length ? KP.map(pt => `<div style="border:1px solid var(--line);border-radius:12px;padding:12px 14px;margin:12px 0">
        <div class="sum-row"><span><b>${esc(pt.firmName || pt.name || pt.id)}</b><br><small style="color:var(--ink-3)">${esc(pt.gstin || pt.phone || '')}</small></span><b style="color:${bal(pt.id) > 0 ? 'var(--warn)' : 'var(--ink-2)'}">${bal(pt.id) > 0 ? 'Owes ' + fmt(bal(pt.id)) : bal(pt.id) < 0 ? 'Advance ' + fmt(-bal(pt.id)) : 'Square ✓'}</b></div>
        <form class="form-grid" style="grid-template-columns:2.2fr 1fr 1fr .7fr auto;margin-top:8px" onsubmit="ShivaaAdmin.khataAdd(event,'${pt.id}')">
          <input name="note" placeholder="Entry note (order SHV-…, cash, metal lot…)" required>
          <select name="type"><option value="debit">Debit (owed)</option><option value="credit">Credit (paid)</option><option value="note">Note only</option></select>
          <input name="amt" type="number" step="0.01" placeholder="Amount">
          <select name="unit"><option value="rs">₹</option><option value="g">g</option></select>
          <button class="btn btn-primary btn-sm">Add</button>
        </form>
        <div style="display:grid;gap:4px;margin-top:8px">${K.filter(k => k.partnerId === pt.id).slice(-8).reverse().map(k => `<div class="sum-row"><span><small style="color:var(--ink-3)">${esc(String(k.at || '').slice(0, 16).replace('T', ' '))} · ${k.type}</small><br>${esc(k.note || '')}</span><b>${k.amt ? (k.unit === 'g' ? k.amt + ' g' : fmt(k.amt)) : '—'}</b></div>`).join('') || '<small style="color:var(--ink-3)">No entries yet.</small>'}</div>
        <button class="btn btn-ghost btn-sm" style="margin-top:8px" onclick="ShivaaAdmin.khataPrint('${pt.id}')">🖨 Print statement</button>
      </div>`).join('') : '<p style="color:var(--ink-3)">No approved partners yet.</p>'}
    </div>`;
  }

  /* ── v58 · OLD GOLD PURCHASE REGISTER ── */
  if (tab === 'gold') {
    const totW = goldBuys.reduce((a, r) => a + (r.purity === '925' ? 0 : r.weightG), 0);
    const totAmt = goldBuys.reduce((a, r) => a + r.amount, 0);
    body.innerHTML = `<div class="adm-card"><h3>🪙 Old Gold / Silver purchase register</h3>
      <p class="partner-note" style="font-size:12.5px">Every old-gold buy is logged with the seller&rsquo;s identity, purity, weight, rate and settlement — the paper trail your GST officer asks for. Heavily stone-set pieces are weighed &amp; quoted case by case at the counter.</p>
      <form class="form-grid" style="grid-template-columns:1.2fr 1fr 1fr;align-items:end" onsubmit="ShivaaAdmin.goldBuySave(event)">
        <div class="fld"><label>Seller name *</label><input name="sellerName" required></div>
        <div class="fld"><label>Mobile / Aadhaar-last4 / ID doc</label><input name="sellerPhone" placeholder="10-digit phone (ID verified in person)"></div>
        <div class="fld"><label>ID document seen</label><select name="idDoc" class="sortsel" style="width:100%;border-radius:12px"><option>Aadhaar</option><option>PAN</option><option>Voter ID</option><option>Driving licence</option><option>Other</option></select></div>
        <div class="fld"><label>Gross weight (g) *</label><input name="weightG" type="number" step="0.001" min="0" required></div>
        <div class="fld"><label>Purity</label><select name="purity" class="sortsel" style="width:100%;border-radius:12px">${['22K','24K','18K','14K','925','other'].map(p => `<option ${p === '22K' ? 'selected' : ''}>${p}</option>`).join('')}</select></div>
        <div class="fld"><label>Rate paid ₹/g *</label><input name="ratePerG" type="number" step="1" min="0" required></div>
        <div class="fld"><label>Deductions ₹ (wastage/stone/dirt)</label><input name="deductions" type="number" step="1" min="0" value="0"></div>
        <div class="fld"><label>Settled as</label><select name="settledAs" class="sortsel" style="width:100%;border-radius:12px"><option value="cash">Cash</option><option value="bank">Bank / UPI</option><option value="exchange">Exchange for new jewellery</option><option value="credit">Khata / credit note</option></select></div>
        <div class="fld"><label>Note</label><input name="note" placeholder="melting batch, witness, stones removed…"></div>
        <button class="btn btn-primary btn-sm" style="justify-self:start">Add to register</button>
      </form></div>
      <div class="adm-card"><h3>${goldBuys.length} purchases · ${totW.toFixed(3)} g gold · ₹${totAmt.toLocaleString('en-IN')} paid out</h3>
      ${goldBuys.length ? `<div class="adm-table-wrap"><table class="adm-table"><thead><tr><th>Ref</th><th>Date</th><th>Seller</th><th>ID</th><th>Purity</th><th class="num">Weight g</th><th class="num">₹/g</th><th class="num">Ded.</th><th class="num">Amount</th><th>Settled</th><th>Note</th></tr></thead>
        <tbody>${goldBuys.map(r => `<tr><td><b>${esc(r.id)}</b></td><td>${new Date(r.createdAt).toLocaleDateString('en-IN')}</td><td>${esc(r.sellerName)}<br><small style="color:var(--ink-3)">${esc(r.sellerPhone || '')}</small></td><td>${esc(r.idDoc || '')}</td><td>${esc(r.purity)}</td><td class="num">${r.weightG.toFixed(3)}</td><td class="num">${Math.round(r.ratePerG).toLocaleString('en-IN')}</td><td class="num">${Math.round(r.deductions).toLocaleString('en-IN')}</td><td class="num"><b>${fmt(r.amount)}</b></td><td>${esc(r.settledAs)}</td><td><small>${esc(r.note || '')}</small></td></tr>`).join('')}</tbody></table></div>`
        : '<p class="partner-note">No purchases logged yet.</p>'}</div>`;
  }

  /* ── v59 · KARIGAR JOB-WORK BOOK ── */
  if (tab === 'karigar') {
    const K = karigarData.karigars || [], jobs = karigarData.jobs || [];
    window._jobCache = jobs;
    const openJobs = jobs.filter(j => j.status !== 'returned' && j.status !== 'cancelled');
    const kgBal = id => openJobs.filter(j => j.karigarId === id).reduce((a, j) => a + (j.weightOut - (j.weightBack || 0)), 0);
    const jobDue = id => openJobs.filter(j => j.karigarId === id).reduce((a, j) => a + Math.max(0, (j.jobCharge || 0) + (j.extraCharge || 0) - (j.advance || 0)), 0);
    body.innerHTML = `<div class="adm-card"><h3>🔨 ${K.length} karigars on the book</h3>
      <p class="partner-note" style="font-size:12.5px">Metal issued is reconciled by weight on return; job charges and advances form each karigar&rsquo;s running balance. Print a job slip for the workshop.</p>
      <form class="form-grid" style="grid-template-columns:1.2fr 1fr 1.4fr auto;align-items:end" onsubmit="ShivaaAdmin.kgSave(event)">
        <div class="fld"><label>Karigar name *</label><input name="name" required></div>
        <div class="fld"><label>Phone</label><input name="phone" inputmode="numeric" maxlength="10"></div>
        <div class="fld"><label>Speciality</label><input name="speciality" placeholder="Kundan · meenakari · casting…"></div>
        <button class="btn btn-primary btn-sm">Add karigar</button>
      </form>
      ${K.length ? `<div class="adm-table-wrap" style="margin-top:12px"><table class="adm-table"><thead><tr><th>Karigar</th><th>Speciality</th><th class="num">Metal out (g)</th><th class="num">Job dues ₹</th></tr></thead>
        <tbody>${K.map(k => `<tr><td><b>${esc(k.name)}</b><br><small style="color:var(--ink-3)">${esc(k.phone || '')}</small></td><td>${esc(k.speciality || '—')}</td>
        <td class="num"><b style="color:${kgBal(k.id) > 0 ? 'var(--warn)' : 'inherit'}">${kgBal(k.id).toFixed(3)}</b></td>
        <td class="num">${jobDue(k.id) ? fmt(jobDue(k.id)) : '—'}</td></tr>`).join('')}</tbody></table></div>`
        : '<p class="partner-note" style="margin-top:10px">Add your karigars first.</p>'}</div>

      <div class="adm-card"><h3>Issue a job ${K.length ? '' : '(add the karigar first)'}</h3>
      <form class="form-grid" style="grid-template-columns:1fr 1.6fr 1fr 1fr 1fr 1fr 1fr 1.2fr" onsubmit="ShivaaAdmin.jobSave(event)">
        <div class="fld"><label>Karigar</label><select name="karigarId" required>${K.map(k => `<option value="${esc(k.id)}">${esc(k.name)}</option>`).join('')}</select></div>
        <div class="fld"><label>Piece / description</label><input name="itemDesc" required placeholder="Rani haar, 5 pcs set…"></div>
        <div class="fld"><label>Order link</label><input name="orderId" placeholder="SHV…"></div>
        <div class="fld"><label>Metal wt out (g)</label><input name="weightOut" type="number" step="0.001" required></div>
        <div class="fld"><label>Purity</label><select name="purity">${['22K','18K','24K','14K','925'].map(p => `<option ${p==='22K'?'selected':''}>${p}</option>`).join('')}</select></div>
        <div class="fld"><label>Wastage %</label><input name="wastagePct" type="number" step="0.1" value="8"></div>
        <div class="fld"><label>Job charge ₹</label><input name="jobCharge" type="number" step="1" value="0"></div>
        <div class="fld"><label>Advance ₹ / due date</label><div style="display:flex;gap:6px"><input name="advance" type="number" placeholder="0"><input name="dueDate" type="date"></div></div>
        <button class="btn btn-primary btn-sm" style="grid-column:1/-1;justify-self:start">Issue metal &amp; create job slip</button>
      </form></div>

      <div class="adm-card"><h3>${jobs.length} job records · ${openJobs.length} open</h3>
      ${jobs.length ? `<div class="adm-table-wrap"><table class="adm-table"><thead><tr><th>Job</th><th>Karigar</th><th>Piece</th><th>Purity</th><th class="num">Wt out g</th><th class="num">Wt back g</th><th class="num">Charge ₹</th><th class="num">Paid ₹</th><th>Status</th><th>Due</th><th></th></tr></thead>
        <tbody>${jobs.map(j => `<tr>
          <td><b>${esc(j.id)}</b>${j.orderId ? '<br><small><a href="#/order/' + esc(j.orderId) + '">' + esc(j.orderId) + '</a></small>' : ''}</td>
          <td>${esc(j.karigarName)}</td><td>${esc(j.itemDesc)}</td><td>${esc(j.purity)}</td>
          <td class="num">${(j.weightOut||0).toFixed(3)}</td>
          <td class="num">${j.weightBack ? j.weightBack.toFixed(3) : '—'}</td>
          <td class="num">${fmt((j.jobCharge||0)+(j.extraCharge||0))}</td>
          <td class="num">${fmt(j.advance||0)}</td>
          <td><span class="status-pill ${j.status==='with karigar'?'st-placed':'st-packed'}">${esc(j.status)}</span></td>
          <td>${j.dueDate || '—'}</td>
          <td style="white-space:nowrap"><button class="icon-e" onclick="ShivaaAdmin.printJobSlip('${j.id}')" title="Print job slip">🧾</button>
          <button class="btn btn-outline btn-sm" onclick="ShivaaAdmin.jobReceive('${j.id}')">Receive</button>
          <button class="btn btn-ghost btn-sm" onclick="ShivaaAdmin.jobPay('${j.id}')">₹ Pay</button></td>
        </tr>`).join('')}</tbody></table></div>` : '<p class="partner-note">No jobs issued yet.</p>'}</div>`;
  }

  /* ── v59 · DAILY CASH BOOK ── */
  if (tab === 'cash') {
    const today = new Date().toLocaleDateString('en-CA');
    const rows = cashData.rows || [];
    const cashIn = rows.filter(r => r.kind === 'in' && r.mode === 'cash').reduce((a, r) => a + r.amount, 0);
    const cashOut = rows.filter(r => r.kind === 'out' && r.mode === 'cash').reduce((a, r) => a + r.amount, 0);
    const manualNet = cashIn - cashOut;
    const closed = rows.find(r => r.kind === 'day-close');
    body.innerHTML = `<div class="adm-card"><h3>💵 Cash book — ${new Date(cashData.date).toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</h3>
      <div class="cb-grid">
        <div class="cb-tile"><small>Online / prepaid sales</small><b>${fmt(cashData.onlineSales||0)}</b></div>
        <div class="cb-tile"><small>WhatsApp confirmed</small><b>${fmt(cashData.waSales||0)}</b></div>
        <div class="cb-tile"><small>COD booked</small><b>${fmt(cashData.codSales||0)}</b></div>
        <div class="cb-tile out"><small>Old-gold paid out</small><b>−${fmt(cashData.oldGoldOut||0)}</b></div>
      </div>
      <form class="form-grid" style="grid-template-columns:.8fr 2fr 1fr 1fr auto;align-items:end;margin-top:14px" onsubmit="ShivaaAdmin.cbAdd(event,${jsArg(cashData.date)})">
        <div class="fld"><label>Type</label><select name="kind"><option value="in">Cash in</option><option value="out">Cash out</option></select></div>
        <div class="fld"><label>Note (head)</label><input name="head" required placeholder="UPI settlement · expense · advance…"></div>
        <div class="fld"><label>Amount ₹</label><input name="amount" type="number" step="0.01" required></div>
        <div class="fld"><label>Mode</label><select name="mode"><option value="cash">Cash</option><option value="upi">UPI</option><option value="bank">Bank</option></select></div>
        <button class="btn btn-primary btn-sm">Add entry</button>
      </form>
      <div class="adm-table-wrap" style="margin-top:12px"><table class="adm-table"><thead><tr><th>Time</th><th>Head</th><th>Mode</th><th class="num">In</th><th class="num">Out</th><th>By</th></tr></thead>
      <tbody>${rows.filter(r => r.kind !== 'day-close').map(r => `<tr><td>${String(r.at||'').slice(11,16)}</td><td>${esc(r.head)}</td><td>${esc(r.mode)}</td>
        <td class="num" style="color:var(--ok)">${r.kind==='in'?fmt(r.amount):''}</td><td class="num" style="color:var(--warn,#b04a4a)">${r.kind==='out'?fmt(r.amount):''}</td><td><small>${esc(r.by||'')}</small></td></tr>`).join('')
        || '<tr><td colspan="6" class="partner-note">No manual entries yet — sales figures above are derived automatically from today’s orders.</td></tr>'}</tbody></table></div>
      <div class="cb-close">
        <div><b>Manual cash net: </b>${manualNet >= 0 ? '+' : '−'}₹${Math.abs(manualNet).toLocaleString('en-IN')}</div>
        <form class="form-grid" style="grid-template-columns:1fr 1fr 2fr auto;align-items:end" onsubmit="ShivaaAdmin.dayClose(event,${jsArg(cashData.date)})">
          <div class="fld"><label>Opening cash ₹</label><input name="openingCash" type="number" value="${closed ? closed.openingCash : ''}"></div>
          <div class="fld"><label>Closing cash counted ₹</label><input name="closingCash" type="number" value="${closed ? closed.closingCash : ''}"></div>
          <div class="fld"><label>Note</label><input name="note" value="${esc(closed ? closed.note||'' : '')}"></div>
          <button class="btn btn-gold btn-sm">${closed ? 'Update' : 'Lock'} day close</button>
        </form>
      </div>
      <div style="display:flex;gap:10px;margin-top:12px;flex-wrap:wrap">
        <button class="btn btn-outline btn-sm" onclick="ShivaaAdmin.cbPrint(${jsArg(cashData.date)})">🖨 Print day report</button>
        <button class="btn btn-ghost btn-sm" onclick="ShivaaAdmin.cbCSV(${jsArg(cashData.date)})">⬇ Day CSV</button>
      </div></div>`;
  }

  if (tab === 'settings') {
    const S = state.settings;
    body.innerHTML = `<div class="adm-card"><h3>Store settings</h3>
      <form class="form-grid" onsubmit="ShivaaAdmin.saveSettings(event)">
        <div class="fld"><label>Phone</label><input name="phone" value="${esc(S.phone || '')}"></div>
        <div class="fld"><label>WhatsApp number (with 91, no +)</label><input name="whatsapp" value="${esc(S.whatsapp || '918905005921')}" placeholder="918905005921"></div>
        <div class="fld"><label>Email</label><input name="email" type="email" value="${esc(S.email || '')}"></div>
        <div class="fld full"><label>Address</label><input name="address" value="${esc(S.address || '')}"></div>
        <div class="fld"><label>Free shipping above ₹</label><input name="freeShipAbove" type="number" value="${S.freeShipAbove}"></div>
        <div class="fld"><label>Shipping fee ₹</label><input name="shippingFee" type="number" value="${S.shippingFee}"></div>
        <div class="fld"><label>Jaipur gold premium ₹/g <span style="font-size:11px;color:var(--ink-3)">(24K line)</span></label><input name="jaipurPremium" type="number" value="${S.jaipurPremium ?? 55}"></div>
        <div class="fld"><label>22K gold premium ₹/g <span style="font-size:11px;color:var(--ink-3)">(desk physical — what the shop sells at)</span></label><input name="gold22Premium" type="number" value="${S.gold22Premium ?? 398}"></div>
        <div class="fld"><label>Jaipur silver premium ₹/g</label><input name="jaipurSilverPremium" type="number" step="0.5" value="${S.jaipurSilverPremium ?? 3}"></div>
        <div class="fld full"><label>GST verification API key (optional)</label><input name="gstKey" placeholder="leave blank — the APITxT SMS key already verifies GST automatically; use only for a different provider"></div>
        <div class="fld"><label>Bhai Dooj draw — live stream URL (YouTube/Instagram)</label><input name="drawStreamUrl" value="${esc(S.drawStreamUrl || '')}" placeholder="https://youtube.com/live/…"></div>
        <div class="fld"><label>Winner announcement note (shown after the draw)</label><input name="winnerNote" value="${esc(S.winnerNote || '')}" placeholder="Winner: …, verified by CA …"></div>
        <div class="fld"><label>Tier premium ₹/g — Silver</label><input name="tierSilver" type="number" value="${S.tierSilver ?? 0}"></div>
        <div class="fld"><label>Tier premium ₹/g — Gold</label><input name="tierGold" type="number" value="${S.tierGold ?? 0}"></div>
        <div class="fld"><label>Tier premium ₹/g — Diamond</label><input name="tierDiamond" type="number" value="${S.tierDiamond ?? 0}"></div>
        <div class="fld full"><label>Announcement ticker (one per line)</label><textarea name="announcements">${esc((S.announcements || []).join('\n'))}</textarea></div>
        <button class="btn btn-primary btn-sm" style="justify-self:start">Save settings</button>
      </form></div>
      <div class="adm-card"><h3>💳 Payments &amp; gateway <span style="font-size:11px;color:var(--ink-3);font-weight:400">runs in demo until live keys are pasted — customers cannot tell the flow is incomplete</span></h3>
        <form class="form-grid" id="payForm" onsubmit="ShivaaAdmin.savePay(event)">
          <div class="fld"><label>Payment provider</label>
            <select name="payProvider" class="sortsel" style="width:100%;border-radius:12px">
              <option value="demo" ${(S.payProvider || 'demo') === 'demo' ? 'selected' : ''}>Demo / no gateway (no real charge)</option>
              <option value="cashfree" ${S.payProvider === 'cashfree' ? 'selected' : ''}>Cashfree (UPI · cards · net-banking · wallets · 120+ methods)</option>
            </select></div>
          <div class="fld"><label>Site base URL <small>(public https address used for the Cashfree return &amp; webhook URLs)</small></label><input name="siteBaseUrl" value="${esc(S.siteBaseUrl || '')}" placeholder="https://www.shivaa.in"></div>
          <div class="fld"><label>Prepaid discount % <small>(pay online)</small></label><input name="prepaidPct" type="number" step="0.5" min="0" max="10" value="${S.prepaidPct ?? 2}"></div>
          <div class="fld"><label>COD handling fee % <small>(0 = free)</small></label><input name="codFeePct" type="number" step="0.5" min="0" max="10" value="${S.codFeePct ?? 0}"></div>

          <fieldset class="fld full cf-keys" style="border:1px solid var(--line);border-radius:14px;padding:12px 14px;margin:0">
            <legend style="padding:0 6px;font-weight:700;font-size:13px">🟣 Cashfree payment gateway <small>(Merchant Dashboard → API Keys)</small></legend>
            <div class="form-grid" style="grid-template-columns:1fr 1fr">
              <div class="fld"><label>App ID <small>(x-client-id)</small></label><input name="cfAppId" value="${esc(S.cfAppId || '')}" placeholder="e.g. 123456789abc…def0" autocomplete="off"></div>
              <div class="fld"><label>Secret Key <small>(x-client-secret · never shown once saved)</small></label><input name="cfSecretKey" type="password" placeholder="${S.cfSecretKey ? '•••• saved — leave blank to keep' : 'paste secret key from API Keys'}" autocomplete="new-password"></div>
              <div class="fld"><label>Environment</label>
                <select name="cfEnv" class="sortsel" style="width:100%;border-radius:12px">
                  <option value="sandbox" ${(S.cfEnv || 'sandbox') === 'sandbox' ? 'selected' : ''}>Sandbox (sandbox.cashfree.com — test keys)</option>
                  <option value="production" ${S.cfEnv === 'production' ? 'selected' : ''}>Production (api.cashfree.com — live keys)</option>
                </select></div>
              <div class="fld"><label>Verification</label>
                <button type="button" class="btn btn-outline btn-sm" style="width:100%" onclick="ShivaaAdmin.testPay('cashfree')">Test Cashfree credentials</button></div>
              <div class="fld full" style="font-size:12px;color:var(--ink-3);border-top:1px dashed var(--line);padding-top:8px">
                In the Cashfree dashboard: <b>whitelist your website domain</b>, then set the <b>Webhook URL</b> to
                <code id="cfWebhookUrl"></code> (signatures are verified with your secret key). Customers are sent back to
                <code id="cfReturnUrl"></code> after paying — both URLs are also sent automatically with every order.
                Payments are re-verified server-to-server with <code>GET /pg/orders/&lbrace;order_id&rbrace;</code> before the order is marked paid.
              </div>
              <div class="fld full"><span id="cfTestOut" style="font-size:12.5px"></span></div>

              <div class="fld full" style="border-top:1px dashed var(--line);padding-top:10px">
                <label style="display:flex;gap:9px;align-items:flex-start;font-size:13px">
                  <input type="checkbox" name="cfOcc" style="width:18px;height:18px;accent-color:var(--gold);margin-top:2px" ${S.cfOcc ? 'checked' : ''}>
                  <span><b>⚡ Cashfree One Click Checkout</b><br>
                  <small style="color:var(--ink-3)">Verified WhatsApp-OTP login, the customer's address pre-filled on Cashfree's page from their 100M+ saved profiles, and your cart shown as a summary. Needs the product switched on at <b>Merchant Dashboard &rarr; Payment Gateway &rarr; PG Products &rarr; One Click Checkout</b> — ticking this box alone does nothing until Cashfree has activated it on the account.</small></span>
                </label>
              </div>
              <div class="fld"><label style="display:flex;gap:8px;align-items:center;font-size:12.5px">
                <input type="checkbox" name="cfOccAddress" style="width:17px;height:17px;accent-color:var(--gold)" ${(S.cfOccAddress === undefined ? true : !!S.cfOccAddress) ? 'checked' : ''}> Pre-fill the delivery address</label></div>
              <div class="fld"><label style="display:flex;gap:8px;align-items:center;font-size:12.5px">
                <input type="checkbox" name="cfOccAuth" style="width:17px;height:17px;accent-color:var(--gold)" ${(S.cfOccAuth === undefined ? true : !!S.cfOccAuth) ? 'checked' : ''}> Verify the phone number (OTP login)</label></div>
              <div class="fld full" style="border-top:1px dashed var(--line);padding-top:10px">
                <label style="display:flex;gap:9px;align-items:flex-start;font-size:13px">
                  <input type="checkbox" name="guestCheckout" style="width:18px;height:18px;accent-color:var(--gold);margin-top:2px" ${S.guestCheckout ? 'checked' : ''}>
                  <span><b>⚡ Automatic Guest Checkout (One-Tap Buy)</b><br>
                  <small style="color:var(--ink-3)">Tapping <b>Make It Yours</b> places the order and hands the customer straight to Cashfree — <b>no account, no address form, no shivaa.in OTP</b>. Cashfree verifies the name, number and address on its own page and the only thing typed there is the customer&rsquo;s UPI PIN / net-banking password (a first-time number is verified once by Cashfree, then remembered). Needs <b>One Click Checkout</b> above to already be on, and the switch only takes effect once Cashfree is connected live. Turn off for instant rollback to the previous checkout.</small></span>
                </label>
              </div>
              <div class="fld full" style="font-size:12px;color:var(--ink-3)">
                If Cashfree refuses the One Click Checkout payload (product not active, a rejected field, a version mismatch) the payment is
                <b>retried automatically as a standard Cashfree checkout</b> — nobody is ever unable to pay — and the refusal is written to the audit log
                as <code>payment.cashfree-occ-fallback</code>. Whatever address the customer confirms on Cashfree's page is stored on the order as
                <code>cfCheckout</code>, <b>alongside</b> the address they typed here, so a difference is visible before dispatch.
              </div>
            </div>
          </fieldset>

          <fieldset style="border:1px solid rgba(212,175,55,0.2);border-radius:10px;padding:14px 16px;margin:12px 0">
            <legend style="font-weight:600;color:var(--gold);padding:0 8px">📱 Truecaller One-Tap Verification</legend>
            <div class="fld full">
              <label>Truecaller Partner Key <small>(from <a href="https://verification-sdk-console.truecaller.com" target="_blank" style="color:var(--gold)">Truecaller Developer Console</a>)</small></label>
              <input name="tcAppKey" value="${esc(S.tcAppKey || '')}" placeholder="Paste your Truecaller Partner Key here">
              <small style="color:var(--ink-3)">Enables automatic phone number detection on Android phones — the customer sees "Continue with +91 XXXXX" and taps once. No OTP, no typing. Works only on Android mobile web with the Truecaller app installed; falls back to manual input on iPhone/desktop.</small>
            </div>
          </fieldset>

          <div class="fld"><label>Counter UPI ID <small>(QR fallback — works without any gateway)</small></label><input name="upiId" value="${esc(S.upiId || '')}" placeholder="yourshop@okhdfcbank"></div>
          <div class="fld"><label>UPI payee name</label><input name="upiName" value="${esc(S.upiName || 'Shivaa Jewellers')}"></div>
          <div class="fld full"><label>Prepaid-only pincodes (comma-separated; NE &amp; Ladakh prepaid by default)</label><input name="codBlockedPins" value="${esc(S.codBlockedPins || '')}" placeholder="110001, 744101"></div>
          <div class="fld"><label>Shop GSTIN <small>(printed on tax invoices)</small></label><input name="gstin" value="${esc(S.gstin || '')}" placeholder="08ABCDE1234F1Z5" style="text-transform:uppercase"></div>
          <div class="fld"><label>Google review link <small>(10/10 reviewers are sent here)</small></label><input name="googleReviewUrl" value="${esc(S.googleReviewUrl || '')}" placeholder="https://maps.app.goo.gl/…"></div>
          <div class="fld full" style="font-size:12.5px;color:var(--ink-3)">No Cashfree keys yet? Leave provider on <b>Demo</b> and fill only the <b>UPI ID</b> — customers scan the QR and upload a payment screenshot; you verify each one under Orders (banner at top). With the Cashfree App ID + Secret Key, UPI, cards, net-banking and wallets go fully automatic.</div>
          <button class="btn btn-primary btn-sm" style="justify-self:start">Save payments</button>
        </form></div>
      <div class="adm-card"><h3>📡 Official MCX rate feed <span style="font-size:11px;color:var(--ink-3);font-weight:400">Angel One SmartAPI · free demat · fully automatic TOTP login</span></h3>
        <form id="feedForm" onsubmit="ShivaaAdmin.saveFeed(event)">
          <p style="font-size:12.5px;color:var(--ink-2);margin-bottom:10px">When enabled, the Bullion Desk and shop rates come from <b>live MCX Gold &amp; Silver futures</b> (official exchange ticks), not the international spot feed. You only need <b>4 values</b> from a free Angel One SmartAPI account (<b>smartapi.angelbroking.com</b>, requires an Angel One demat): client code, MPIN, API key (create an app) and the external TOTP secret. The near-month <b>GOLD (1 kg, 995) &amp; SILVER</b> contract tokens are picked automatically and roll over on expiry &mdash; the two token boxes below are optional overrides only. Unticked = today&rsquo;s automatic international feed continues.</p>
          <div class="form-grid" style="grid-template-columns:1fr 1fr">
            <label class="fld full" style="flex-direction:row;align-items:center;gap:8px;display:flex"><input type="checkbox" name="angelEnabled" style="width:auto" ${S.angelEnabled ? 'checked' : ''}> <span><b>Enable official MCX feed</b> <small style="color:var(--ink-3)">— international spot stays as automatic fallback</small></span></label>
            <div class="fld"><label>Angel client code</label><input name="angelClient" value="${esc(S.angelClient || '')}" placeholder="AB1234" autocomplete="off"></div>
            <div class="fld"><label>MPIN / login password</label><input name="angelMpin" type="password" value="${esc(S.angelMpin || '')}" autocomplete="new-password" placeholder="••••"></div>
            <div class="fld"><label>SmartAPI key (X-PrivateKey)</label><input name="angelApiKey" value="${esc(S.angelApiKey || '')}" placeholder="from your SmartAPI app" autocomplete="off"></div>
            <div class="fld"><label>TOTP secret (Base32)</label><input name="angelTotpSecret" value="${esc(S.angelTotpSecret || '')}" placeholder="JBSWY3DPEHPK3PXP" autocomplete="off"></div>
            <div class="fld"><label>MCX GOLD token — optional override</label><input name="angelGoldToken" value="${esc(S.angelGoldToken || '')}" placeholder="auto near-month if blank"></div>
            <div class="fld"><label>MCX SILVER token — optional override</label><input name="angelSilverToken" value="${esc(S.angelSilverToken || '')}" placeholder="auto near-month if blank"></div>
            <div class="fld"><label>Manual USD/INR fallback <small>(used only if every live FX source is blocked)</small></label><input name="manualUsdInr" type="number" step="0.01" min="60" max="120" value="${S.manualUsdInr || ''}" placeholder="e.g. 95.59"></div>
            <div class="fld"><label>Manual GOLD $/oz fallback <small>(international spot)</small></label><input name="manualXauUsd" type="number" step="0.01" min="100" max="20000" value="${S.manualXauUsd || ''}" placeholder="e.g. 4394"></div>
            <div class="fld"><label>Manual SILVER $/oz fallback</label><input name="manualXagUsd" type="number" step="0.001" min="1" max="1000" value="${S.manualXagUsd || ''}" placeholder="e.g. 65.06"></div>
            <div class="fld"><label>Live spot fine-tune GOLD <small>(± $/oz, nudge to match your ref feed)</small></label><input name="spotXauAdj" type="number" step="0.1" value="${S.spotXauAdj || ''}" placeholder="0"></div>
            <div class="fld"><label>Live spot fine-tune SILVER <small>(± $/oz)</small></label><input name="spotXagAdj" type="number" step="0.01" value="${S.spotXagAdj || ''}" placeholder="0"></div>
            <div class="fld"><label>Live spot fine-tune USD/INR <small>(± ₹)</small></label><input name="spotInrAdj" type="number" step="0.01" value="${S.spotInrAdj || ''}" placeholder="0"></div>
            <div class="fld full" style="border-top:1px dashed var(--line);padding-top:10px"><label><b>⚡ Tick-push relay (optional, sub-second)</b> <small style="color:var(--ink-3)">— run cms/relay for official exchange push; the desk then ticks instantly instead of polling. Fill only if the relay runs on another host; same-box installs need nothing here.</small></label></div>
            <div class="fld"><label>Relay server URL <small>(server-side, e.g. https://relay.host)</small></label><input name="angelRelayUrl" value="${esc(S.angelRelayUrl || '')}" placeholder="leave blank when relay runs on this box" autocomplete="off"></div>
            <div class="fld"><label>Relay stream key</label><input name="angelRelayKey" value="${esc(S.angelRelayKey || '')}" placeholder="from relay.config.json streamKey" autocomplete="off"></div>
            <div class="fld full"><label>Browser push URL <small>(public SSE incl. ?key=…, shown to jewellers' screens)</small></label><input name="angelRelayStreamUrl" value="${esc(S.angelRelayStreamUrl || '')}" placeholder="https://relay.host/stream?key=…" autocomplete="off"></div>
            <div class="fld full" id="feedStatus" style="font-size:12.5px;color:var(--ink-3)">Feed status: checking…</div>
            <div class="fld full" id="netStatus" style="font-size:12.5px"></div>
            <div class="fld full" style="display:flex;gap:10px;flex-wrap:wrap">
              <button class="btn btn-primary btn-sm" style="justify-self:start">Save feed settings</button>
              <button type="button" class="btn btn-outline btn-sm" onclick="ShivaaAdmin.testFeed()">Test MCX connection</button>
              <button type="button" class="btn btn-outline btn-sm" onclick="ShivaaAdmin.testNet()">Test dollar/FX sources</button>
            </div>
          </div>
        </form></div>
      <div class="adm-card"><h3>📜 Trust page — GST certificate <span style="font-size:11px;color:var(--ink-3);font-weight:400">public document upload</span></h3>
        <p style="font-size:12.5px;color:var(--ink-3);margin-bottom:10px">Shown on the public <a href="#/trust">Why Trust Shivaa</a> page next to the GSTIN. Use the official GST registration certificate (PDF or a clear photo, ≤8 MB). It is labelled as supplied by Shivaa — it is never presented as a live government verification.</p>
        <div id="gstCertBox" class="gst-cert-admin">
          ${S.gstCert && S.gstCert.file ? `<div class="gst-cert-current"><span>📎</span><div><b>Certificate published</b><small>${esc(S.gstCert.file)} · ${S.gstCert.at ? new Date(S.gstCert.at).toLocaleDateString('en-IN') : ''}</small></div>
              <a class="btn btn-outline btn-sm" href="${esc(S.gstCert.file)}" target="_blank" rel="noopener">View</a>
              <button type="button" class="btn btn-ghost btn-sm" id="gstCertRemove">Remove</button></div>`
            : '<p class="partner-note">No certificate published yet — the Trust page honestly shows “Not provided” until you upload one.</p>'}
        </div>
        <label class="ps-upload gst-cert-pick"><input type="file" id="gstCertFile" accept="application/pdf,image/png,image/jpeg,image/webp" hidden><span>📎 Choose GST certificate (PDF / JPG / PNG / WEBP · max 8 MB)</span></label>
        <div id="gstCertMsg" style="font-size:12.5px;margin-top:8px"></div>
      </div>
      <div class="adm-card"><h3>💾 Data backup <span style="font-size:11px;color:var(--ink-3);font-weight:400">one tap, saves the whole database (orders, customers, products) to your device</span></h3>
        <p style="font-size:13px;color:var(--ink-3);margin-bottom:10px">Download a copy after big days. To restore, the file goes back into <code>data/db.json</code> via File Manager (ask us if unsure — never overwrite blindly).</p>
        <button class="btn btn-primary btn-sm" onclick="ShivaaAdmin.backup()">Download backup now</button>
      </div>
      <div class="adm-card"><h3>Code delivery (SMS / email) <span style="font-size:11px;color:var(--ink-3);font-weight:400">codes for sign-in, sign-up, KYC &amp; password reset</span></h3><div id="admSmsCard">Loading gateway status…</div></div>
      <div class="adm-card"><h3>Legal & registrations (read-only)</h3>
        <div class="sum-row"><span>Legal entity</span><b>${esc(S.legalName || 'Ernate Shine Jewellery Private Limited')}</b></div>
        <div class="sum-row"><span>CIN</span><b>${esc(S.cin || '')}</b></div>
        <div class="sum-row"><span>UDYAM</span><b>${esc(S.udyam || '')}</b></div>
        <div class="sum-row"><span>Startup India (DIPP)</span><b>${esc(S.dipp || '')}</b></div>
      </div>`;
    setTimeout(() => window.ShivaaAdmin && window.ShivaaAdmin.bindGstCert && window.ShivaaAdmin.bindGstCert(), 0);   // v103 — GST certificate
    setTimeout(() => window.ShivaaAdmin && window.ShivaaAdmin.smsCard && window.ShivaaAdmin.smsCard(), 0);   // v33 — SMS status card
    setTimeout(() => window.ShivaaAdmin && window.ShivaaAdmin.testFeed && window.ShivaaAdmin.testFeed(), 300);   // v61 — MCX feed status
    setTimeout(() => window.ShivaaAdmin && window.ShivaaAdmin.wirePayUrls && window.ShivaaAdmin.wirePayUrls(S.siteBaseUrl || ''), 0);   // v128 — Cashfree return + webhook URLs
  }
}
window.ShivaaAdmin = {};

/* ── v107 · SMS gateway configuration wizard (Settings → Code delivery) ──
   Writes data/sms-config.json through the API (admin-only, keys never
   echoed back in full). Replaces the "create the file in File Manager"
   instruction that made OTP look broken for anyone without FTP access. */
window.ShivaaAdmin.v107WizHTML = s => {
  const c = (window._v107sms && window._v107sms.config) || {};
  const providers = (window._v107sms && window._v107sms.providers) || ['msg91', 'fast2sms', 'apitxt', 'textlocal', 'custom'];
  return `
  <div class="v107-wiz">
    <h4>Gateway setup wizard ${window._v107sms && window._v107sms.exists ? '· <span style="color:#1a7f37">config file present</span>' : '· <span style="color:#b45309">no config file yet</span>'}</h4>
    <div class="grid">
      <div><label>Provider</label><select id="wizProvider">${providers.map(p => `<option value="${p}" ${c.provider === p ? 'selected' : ''}>${p}</option>`).join('')}<option value="">— switch off (email only) —</option></select></div>
      <div><label>API key / auth key</label><input id="wizKey" type="password" autocomplete="off" placeholder="${c.key ? 'saved: ' + c.key : 'paste from gateway dashboard'}"></div>
      <div><label>Sender ID / SID</label><input id="wizSender" value="${esc(c.sender || '')}" placeholder="SHIVAA"></div>
      <div><label>DLT entity ID (optional)</label><input id="wizEntity" value="${esc(c.entityId || '')}"></div>
      <div><label>DLT template ID (optional)</label><input id="wizTemplate" value="${esc(c.templateId || '')}"></div>
      <div><label>WebOTP domain</label><input id="wizDomain" value="${esc(c.domain || 'shivaa.in')}"></div>
    </div>
    <div style="margin-top:8px"><label>Message text ({code} is replaced)</label><input id="wizMsg" value="${esc(c.message || '')}" placeholder="{code} is your Shivaa Jewellers verification code…"></div>
    <div class="grid" style="margin-top:8px">
      <div><label>Custom gateway URL (provider = custom)</label><input id="wizUrl" value="${esc(c.url || '')}" placeholder="https://gateway/send?to={phone}&text={msg}"></div>
      <div><label>Custom method</label><select id="wizMethod"><option ${c.method === 'GET' ? 'selected' : ''}>GET</option><option ${c.method !== 'GET' ? 'selected' : ''}>POST</option></select></div>
    </div>
    <label style="display:flex;gap:8px;align-items:center;margin-top:10px;font-size:12px"><input type="checkbox" id="wizAutofill" ${c.autofill === false ? '' : 'checked'} style="width:auto"> Android auto-fill footer (“@shivaa.in #CODE”)</label>
    <div class="kyc-inline" style="margin-top:10px">
      <button class="btn btn-primary btn-sm" onclick="ShivaaAdmin.smsSave(event)">Save gateway config</button>
      <button class="btn btn-ghost btn-sm" onclick="ShivaaAdmin.smsReload(event)">Reload saved values</button>
    </div>
    <div id="wizRaw" class="raw" hidden></div>
    <p class="hint">Keys are stored in <b>data/sms-config.json</b> (0600, web-denied by .htaccess). Saving never prints the full key back — only the last four characters. After saving, send yourself a test SMS above: the gateway's raw reply is printed here so a DLT or balance problem is visible in one click.</p>
  </div>`;
};
window.ShivaaAdmin.smsReload = async e => {
  if (e) e.preventDefault();
  try { window._v107sms = await api('/api/sms/config'); window.ShivaaAdmin.smsCard(); toast('Gateway config reloaded'); }
  catch (err) { toast(err.message, 'err'); }
};
window.ShivaaAdmin.smsSave = async e => {
  if (e) e.preventDefault();
  const g = id => (document.getElementById(id) || {}).value || '';
  const body = {
    provider: g('wizProvider'), key: g('wizKey'), sender: g('wizSender'),
    entityId: g('wizEntity'), templateId: g('wizTemplate'), domain: g('wizDomain'),
    message: g('wizMsg'), url: g('wizUrl'), method: g('wizMethod'),
    autofill: !!((document.getElementById('wizAutofill') || {}).checked),
  };
  if (body.key && body.key.indexOf('•') >= 0) delete body.key;   // untouched masked value
  try {
    const r = await api('/api/sms/config', { method: 'PUT', body: JSON.stringify(body) });
    toast(r.note || 'Saved');
    await window.ShivaaAdmin.smsReload();
  } catch (err) { toast(err.message, 'err'); }
};

/* ── v33 · SMS gateway status + test sender (Settings tab) ── */
window.ShivaaAdmin.smsCard = async () => {
  const card = document.getElementById('admSmsCard');
  if (!card) return;
  try {
    const s = await api('/api/sms/status');
    const st = s.stats || {}, live = !!s.configured;
    // v107 — feed the wizard (masked values only)
    try { window._v107sms = await api('/api/sms/config'); } catch (e2) { window._v107sms = null; }
    card.innerHTML = `
      <div class="sum-row"><span>Mode</span><b style="color:${live ? '#1a7f37' : '#b45309'}">${live ? '● LIVE — real SMS via ' + esc(String(s.provider).toUpperCase()) : '● EMAIL — codes are emailed to the account address'}</b></div>
      ${s.gst ? `<div class="sum-row"><span>GST verification</span><b style="color:${s.gst.ready ? '#1a7f37' : '#b45309'}">${s.gst.ready ? '● LIVE — ' + esc(String(s.gst.provider).toUpperCase()) + ' reuses this key' + (s.gst.cached ? ' · ' + s.gst.cached + ' cached' : '') : '● not available — checked manually at approval'}</b></div>` : ''}
      <div class="sum-row"><span>Email channel</span><b>${esc(String((s.email && s.email.from) || 'no-reply@your-domain'))}${s.email && s.email.file ? ' · data/mail-config.json' : ' · default settings'}</b></div>
      ${s.email && s.email.stats ? `<div class="sum-row"><span>Emails</span><b>${s.email.stats.ok}/${s.email.stats.sent} accepted${s.email.stats.lastErr ? ' · last error below' : ''}</b></div>` : ''}
      ${s.email && s.email.stats && s.email.stats.lastErr ? `<div class="sum-row"><span>Email error</span><b style="color:#b42318;font-size:12px">${esc(s.email.stats.lastErr)}</b></div>` : ''}
      <div class="sum-row"><span>Auto-fill</span><b>${s.autofill ? '“@shivaa.in #CODE” — Android auto-fills' : 'off'}</b></div>
      ${st.sent ? `<div class="sum-row"><span>Delivered</span><b>${st.ok}/${st.sent} OK${st.lastAt ? ' · last ' + esc(String(st.lastAt).replace('T', ' ').slice(0, 16)) : ''}</b></div>` : ''}
      ${st.lastErr ? `<div class="sum-row"><span>Last error</span><b style="color:#b42318;font-size:12px">${esc(st.lastErr)}</b></div>` : ''}
      <div class="kyc-inline" style="margin-top:10px">
        <input id="admSmsPhone" maxlength="10" inputmode="numeric" placeholder="10-digit mobile" style="flex:1">
        <button class="btn btn-primary btn-sm" onclick="ShivaaAdmin.smsTest(event)">Send test SMS</button>
      </div>
      <div class="kyc-inline" style="margin-top:8px">
        <input id="admMailTo" type="email" placeholder="your email — to test code delivery" style="flex:1">
        <button class="btn btn-ghost btn-sm" onclick="ShivaaAdmin.mailTest(event)">Send test code</button>
      </div>
      <p style="font-size:12px;color:var(--ink-3);margin:8px 0 0">${live
        ? 'Send a test to your own mobile first — errors appear above after every send.'
        : 'No SMS gateway yet, so every one-time code is <b>emailed</b> to the account\'s own address. Use <b>Send test code</b> above to confirm email delivery works; to switch on real SMS later, create <b>data/sms-config.json</b> (see <b>OTP-SETUP-GUIDE.md</b>).'}</p>` + window.ShivaaAdmin.v107WizHTML(s);
  } catch (e) { card.innerHTML = `<p style="color:var(--ink-3);font-size:13px">SMS status unavailable (${esc(e.message)})</p>`; }
};
window.ShivaaAdmin.smsTest = async e => {
  const btn = e && e.target;
  const ph = (document.getElementById('admSmsPhone') || {}).value || '';
  if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
  try {
    const r = await api('/api/sms/test', { method: 'POST', body: JSON.stringify({ phone: ph }) });
    if (r.ok) toast('Test SMS sent ✓ — check the phone');
    else toast(r.note || ('Not sent: ' + (r.error || 'no SMS gateway configured')), 'err');
    // v107 — surface the gateway's RAW reply so DLT/balance/key faults are visible
    const raw = document.getElementById('wizRaw');
    if (raw) {
      raw.hidden = false;
      raw.textContent = 'gateway reply (' + (r.provider || 'none') + '): ' +
        (r.response ? String(r.response).slice(0, 600) : (r.error || r.note || 'no reply — check keys & DLT template')) +
        (r.hint ? '\nhint: ' + r.hint : '');
    }
  } catch (err) { toast(err.message, 'err'); }
  window.ShivaaAdmin.smsCard();
};
window.ShivaaAdmin.mailTest = async e => {
  const btn = e && e.target;
  const to = ((document.getElementById('admMailTo') || {}).value || '').trim();
  if (!/^\S+@\S+\.\S+$/.test(to)) return toast('Enter an email address to test', 'err');
  if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
  try {
    const r = await api('/api/mail/test', { method: 'POST', body: JSON.stringify({ email: to }) });
    toast(r.ok ? ('Test code emailed to ' + r.sentTo + ' ✓ — check inbox and spam') : ('Not sent: ' + (r.error || 'unknown')), r.ok ? '' : 'err');
  } catch (err) { toast(err.message, 'err'); }
  if (btn) { btn.disabled = false; btn.textContent = 'Send test code'; }
  window.ShivaaAdmin.smsCard();
};

/* admin actions */
window.ShivaaAdmin.login = async e => {
  e.preventDefault();
  try {
    const fd = new FormData(e.target);
    const r = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: String(fd.get('email') || '').trim(), password: String(fd.get('password') || '') }) });
    window.Shivaa.setToken(r.token); state.user = r.user;
    toast('Welcome, ' + r.user.name); renderAdmin($('#view'), new URLSearchParams());
  } catch (err) { toast(err.message, 'err'); }
};
window.ShivaaAdmin.refreshRates = async () => {
  try { const r = await api('/api/rates/refresh', { method: 'POST' }); toast('Rates refreshed · source: ' + r.source); await window.Shivaa.state; location.reload(); }
  catch (e) { toast(e.message, 'err'); }
};
/* ── v55 order & khata tools ── */
window.ShivaaAdmin.nudgeCart = (phone, names) => {
  if (!phone) return;
  window.open('https://wa.me/91' + String(phone).slice(-10) + '?text=' + encodeURIComponent('Namaste ✦ Shivaa here — the ' + names + ' you picked are still in your cart, and today’s rate is live. Complete anytime: shivaa.in/#/cart'), '_blank');
};
window.ShivaaAdmin.waOrder = (id) => {
  const o = (window._adminOrders || []).find(x => x.id === id); if (!o) return;
  const msg = 'Namaste ' + (o.userName || '') + ' ✦ — your Shivaa order ' + o.id + ' is now: ' + (o.status || 'Placed') + '.' + (o.status === 'Shipped' ? ' Fully insured + tamper-sealed; tracking follows shortly.' : '') + ' Track live: shivaa.in/#/track';
  window.open('https://wa.me/91' + String(o.phone || '8905005921').slice(-10) + '?text=' + encodeURIComponent(msg), '_blank');
};
window.ShivaaAdmin.reviewAsk = (id) => {
  const o = (window._adminOrders || []).find(x => x.id === id); if (!o) return;
  const first = (o.items || [])[0] || {};
  const msg = 'Namaste ' + (o.userName || '') + ' ✦ — thank you for choosing Shivaa! If you loved your ' + (first.name || 'piece') + ', a photo + 2 lines on its page would make our day (and help other families): shivaa.in/#/product/' + (first.productId || '');
  window.open('https://wa.me/91' + String(o.phone || '8905005921').slice(-10) + '?text=' + encodeURIComponent(msg), '_blank');
};
window.ShivaaAdmin.orderMeta = (id) => {
  const o = (window._adminOrders || []).find(x => x.id === id); if (!o) return;
  const old = document.getElementById('omModal'); if (old) old.remove();
  const m = document.createElement('div'); m.id = 'omModal';
  m.style.cssText = 'position:fixed;inset:0;background:rgba(29,5,9,.55);z-index:6000;display:flex;align-items:center;justify-content:center;padding:18px';
  m.innerHTML = `<div class="adm-card" style="max-width:430px;width:100%;background:var(--white)">
    <h3>📋 ${id} — compliance & dispatch</h3>
    <form class="form-grid" style="grid-template-columns:1fr 1fr" onsubmit="ShivaaAdmin.orderMetaSave(event,'${id}')">
      <div class="fld"><label>HUID(s), comma-separated</label><input name="huid" value="${esc(o.huid || '')}"></div>
      <div class="fld"><label>Insured value ₹</label><input name="insuredValue" type="number" value="${esc(o.insuredValue || '')}" placeholder="${Math.round(o.total || 0)}"></div>
      <div class="fld"><label>Courier</label><input name="courier" value="${esc(o.courier || '')}" placeholder="BlueDart / Sequel…"></div>
      <div class="fld"><label>AWB / tracking no.</label><input name="awb" value="${esc(o.awb || '')}"></div>
      <div class="fld full"><label>e-Way bill no. (mandatory above ₹50K)</label><input name="ewaybill" value="${esc(o.ewaybill || '')}"></div>
      <div class="fld full"><label>Dispatch note</label><input name="dispatchNote" value="${esc(o.dispatchNote || '')}"></div>
      <div class="fld full"><label>Payment status (customer-facing)</label>
        <select name="paymentStatus" class="sortsel" style="width:100%;border-radius:12px">
          ${['Awaiting payment', 'Paid', 'Refunded'].map(ps => `<option ${(o.paymentStatus || 'Awaiting payment') === ps ? 'selected' : ''}>${ps}</option>`).join('')}
        </select></div>
      <button class="btn btn-primary btn-sm" style="grid-column:1/-1">Save</button>
    </form>
    <button class="btn btn-ghost btn-sm" style="margin-top:8px" onclick="document.getElementById('omModal').remove()">Close</button>
  </div>`;
  document.body.appendChild(m);
};
window.ShivaaAdmin.orderMetaSave = async (e, id) => {
  e.preventDefault();
  const f = new FormData(e.target), patch = { orderId: id };
  for (const [k, v] of f.entries()) patch[k] = String(v);
  const paymentStatus = patch.paymentStatus; delete patch.paymentStatus;
  try {
    await api('/api/admin/order-meta', { method: 'POST', body: JSON.stringify(patch) });
    if (paymentStatus) await api('/api/orders/' + id, { method: 'PUT', body: JSON.stringify({ paymentStatus }) });
    toast('Saved ✦'); document.getElementById('omModal').remove();
    const here = (window._adminOrders || []).find(x => x.id === id); if (here) { Object.assign(here, patch, { paymentStatus }); }
    if (window.ShivaaAdmin._orderMap && window.ShivaaAdmin._orderMap[id]) Object.assign(window.ShivaaAdmin._orderMap[id], patch, { paymentStatus });
  }
  catch (err) { toast(err.message || 'Could not save', 'err'); }
};
window.ShivaaAdmin.gstrCSV = () => {
  const os = window._adminOrders || [];
  const rows = [['Invoice', 'Date', 'Buyer', 'Taxable value', 'CGST 1.5%', 'SGST 1.5%', 'Invoice total']];
  os.filter(o => o.status !== 'Cancelled').forEach(o => {
    const taxable = Math.round((o.total || 0) / 1.03);
    rows.push([o.id, String(o.createdAt || '').slice(0, 10), (o.userName || '').replace(/,/g, ' '), taxable, Math.round((o.total - taxable) / 2), Math.round((o.total - taxable) / 2), o.total || 0]);
  });
  const blob = new Blob(['﻿' + csvRows(rows)], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = 'gstr1-' + new Date().toISOString().slice(0, 7) + '.csv';
  document.body.appendChild(a); a.click(); a.remove();
  toast('GSTR-1 CSV downloaded — hand it to your CA');
};
window.ShivaaAdmin.khataAdd = async (e, pid) => {
  e.preventDefault();
  const f = new FormData(e.target);
  try {
    await api('/api/admin/khata', { method: 'POST', body: JSON.stringify({ partnerId: pid, note: f.get('note'), type: f.get('type'), amt: parseFloat(f.get('amt')) || 0, unit: f.get('unit') }) });
    toast('Khata entry saved ✦'); renderAdmin($('#view'), new URLSearchParams('tab=khata'));
  } catch (err) { toast(err.message || 'Could not save', 'err'); }
};
window.ShivaaAdmin.khataPrint = (pid) => {
  const K = (window._khataCache || []).filter(k => k.partnerId === pid);
  const w = window.open('', '_blank');
  w.document.write('<h2>Shivaa Jewellers — Khata Statement</h2><p>Partner: ' + esc(pid) + ' · Generated ' + new Date().toLocaleString('en-IN') + '</p><table border="1" cellpadding="6" style="border-collapse:collapse;font:13px sans-serif"><tr><th>Date</th><th>Type</th><th>Note</th><th>Amount</th></tr>' +
    K.map(k => '<tr><td>' + esc(String(k.at || '').slice(0, 16).replace('T', ' ')) + '</td><td>' + esc(k.type || '') + '</td><td>' + esc(k.note || '') + '</td><td>' + (k.amt ? (k.unit === 'g' ? k.amt + ' g' : '₹' + k.amt) : '—') + '</td></tr>').join('') +
    '</table><script>window.print()</' + 'script>');
  w.document.close();
};
window.ShivaaAdmin.backup = async () => {
  try {
    const r = await fetch('/api/admin/backup', { headers: { 'Authorization': 'Bearer ' + token() } });
    if (!r.ok) throw new Error('backup failed');
    const j = await r.json();
    const blob = new Blob([JSON.stringify(j, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'shivaa-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    toast('Backup downloaded — keep it somewhere safe', 'ok');
  } catch (e) { toast(e.message || 'Could not make the backup', 'err'); }
};
window.ShivaaAdmin.setOverride = async e => {
  e.preventDefault();
  try {
    await api('/api/rates/override', { method: 'POST', body: JSON.stringify({ gold24: +e.target[0].value, silver: +e.target[1].value }) });
    toast('Override set — storefront now uses these rates'); location.reload();
  } catch (err) { toast(err.message, 'err'); }
};
window.ShivaaAdmin.clearOverride = async () => {
  try { await api('/api/rates/override', { method: 'POST', body: JSON.stringify({ clear: true }) }); toast('Override cleared — live feed restored'); location.reload(); }
  catch (err) { toast(err.message, 'err'); }
};
/* ── v57 daily WhatsApp rate poster (1080×1920, luxury maroon/gold) ── */
window.ShivaaAdmin._posterCanvas = null;
window.ShivaaAdmin._drawPoster = (target, scale) => {
  const cv = target, x = cv.getContext('2d'); const S = scale;
  const W = 1080 * S, H = 1920 * S;
  x.clearRect(0, 0, cv.width, cv.height);
  // backdrop
  const g = x.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#3a0c14'); g.addColorStop(0.55, '#5a1420'); g.addColorStop(1, '#2c080f');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  // soft radial glow
  const rg = x.createRadialGradient(W / 2, 520 * S, 60 * S, W / 2, 560 * S, 760 * S);
  rg.addColorStop(0, 'rgba(212,175,92,0.20)'); rg.addColorStop(1, 'rgba(212,175,92,0)');
  x.fillStyle = rg; x.fillRect(0, 0, W, H);
  // gold frame
  x.strokeStyle = '#c9a24b'; x.lineWidth = 6 * S; x.strokeRect(34 * S, 34 * S, W - 68 * S, H - 68 * S);
  x.strokeStyle = 'rgba(212,175,92,0.55)'; x.lineWidth = 2 * S; x.strokeRect(52 * S, 52 * S, W - 104 * S, H - 104 * S);
  // crest
  x.beginPath(); x.arc(W / 2, 196 * S, 86 * S, 0, 7); x.fillStyle = '#c9a24b'; x.fill();
  x.beginPath(); x.arc(W / 2, 196 * S, 74 * S, 0, 7); x.strokeStyle = '#5a1420'; x.lineWidth = 3 * S; x.stroke();
  x.fillStyle = '#3a0c14'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = `bold ${58 * S}px "Noto Serif Devanagari", Georgia, serif`; x.fillText('शिवा', W / 2, 198 * S);
  x.fillStyle = '#e9c77a'; x.font = `600 ${56 * S}px Jost, Arial, sans-serif`; x.fillText('SHIVAA JEWELLERS', W / 2, 340 * S);
  x.fillStyle = 'rgba(233,199,122,0.85)'; x.font = `${26 * S}px Jost, Arial`;
  x.fillText('BIS HALLMARKED · JAIPUR', W / 2, 386 * S);
  // date strip
  const now = new Date();
  const ds = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  x.fillStyle = 'rgba(0,0,0,0.28)'; x.fillRect(150 * S, 438 * S, W - 300 * S, 70 * S);
  x.strokeStyle = 'rgba(201,162,75,0.7)'; x.lineWidth = 2 * S; x.strokeRect(150 * S, 438 * S, W - 300 * S, 70 * S);
  x.fillStyle = '#f1dba4'; x.font = `600 ${32 * S}px Jost, Arial`;
  x.fillText('TODAY\u2019S RATES · ' + ds.toUpperCase(), W / 2, 474 * S);
  // rate pills
  const R = state.rates || {};
  const cards = [
    ['GOLD 24K', '995', R.gold24], ['GOLD 22K', '916', R.gold22],
    ['GOLD 18K', '750', R.gold18], ['SILVER', '925', R.silver],
  ];
  const cw = 390 * S, ch = 236 * S, gx = 40 * S, x0 = (W - (cw * 2 + gx)) / 2, y0 = 580 * S;
  cards.forEach((c, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const px = x0 + col * (cw + gx), py = y0 + row * (ch + 36 * S);
    x.fillStyle = 'rgba(255,244,219,0.06)'; x.fillRect(px, py, cw, ch);
    x.strokeStyle = '#c9a24b'; x.lineWidth = 2.5 * S; x.strokeRect(px, py, cw, ch);
    x.fillStyle = '#e9c77a'; x.font = `600 ${30 * S}px Jost, Arial`; x.textAlign = 'center';
    x.fillText(c[0], px + cw / 2, py + 50 * S);
    x.fillStyle = 'rgba(233,199,122,0.7)'; x.font = `${22 * S}px Jost, Arial`;
    x.fillText(c[1] + ' purity', px + cw / 2, py + 84 * S);
    x.fillStyle = '#fff6df'; x.font = `700 ${58 * S}px Jost, Arial`;
    x.fillText('₹' + Math.round(c[2] || 0).toLocaleString('en-IN'), px + cw / 2, py + 150 * S);
    x.fillStyle = 'rgba(233,199,122,0.75)'; x.font = `${22 * S}px Jost, Arial`;
    x.fillText('per gram', px + cw / 2, py + 196 * S);
  });
  // promise block
  const py2 = y0 + 2 * ch + 36 * S + 60 * S;
  x.strokeStyle = 'rgba(201,162,75,0.55)'; x.beginPath();
  x.moveTo(180 * S, py2); x.lineTo(W - 180 * S, py2); x.stroke();
  x.fillStyle = '#f1dba4'; x.font = `600 ${34 * S}px Jost, Arial`;
  x.fillText('✦  100% written buyback on every piece', W / 2, py2 + 64 * S);
  x.fillText('✦  HUID-tagged, BIS-hallmarked gold', W / 2, py2 + 122 * S);
  x.fillText('✦  Transparent making · no hidden charges', W / 2, py2 + 180 * S);
  // footer
  x.fillStyle = '#c9a24b'; x.fillRect(110 * S, H - 232 * S, W - 220 * S, 3 * S);
  x.fillStyle = '#f1dba4'; x.font = `600 ${40 * S}px Jost, Arial`;
  x.fillText('Shivaa Jewellers, Jayal, Nagaur · Jaipur', W / 2, H - 166 * S);
  x.font = `500 ${30 * S}px Jost, Arial`; x.fillStyle = 'rgba(241,219,164,0.85)';
  x.fillText('WhatsApp your order · shivaa.in', W / 2, H - 112 * S);
  x.font = `${20 * S}px Jost, Arial`; x.fillStyle = 'rgba(233,199,122,0.6)';
  x.fillText('Indicative live rates as of ' + now.toLocaleTimeString('en-IN') + ' · final at invoice', W / 2, H - 70 * S);
};
window.ShivaaAdmin.ratePoster = () => {
  const cv = document.getElementById('ratePosterCv'); if (!cv) return;
  window.ShivaaAdmin._posterCanvas = cv;
  window.ShivaaAdmin._drawPoster(cv, 0.5);
};
window.ShivaaAdmin.downloadPoster = () => {
  const full = document.createElement('canvas'); full.width = 1080; full.height = 1920;
  window.ShivaaAdmin._drawPoster(full, 1);
  const a = document.createElement('a');
  a.download = 'shivaa-rate-poster-' + new Date().toISOString().slice(0, 10) + '.png';
  a.href = full.toDataURL('image/png');
  document.body.appendChild(a); a.click(); a.remove();
  toast('Poster downloaded — post it on WhatsApp status ✦');
};
window.ShivaaAdmin.setWt = async (id, val) => {
  const w = parseFloat(val);
  if (!w || w <= 0 || w > 100) return toast('Enter a sensible weight (0–100 g)', 'err');
  try {
    const r = await api('/api/products/' + id, { method: 'PUT', body: JSON.stringify({ weightG: w, weightAssumed: false }) });
    const p = state.productsCache.find(x => x.id === id);
    if (p) { p.weightG = w; p.weightAssumed = false; }
    const card = document.querySelector(`.wt-card input[data-id="${id}"]`)?.closest('.wt-card');
    if (card) { card.classList.remove('assumed'); card.querySelector('.wt-flag').textContent = '✓ saved'; }
    toast(r.sku + ' → ' + w + ' g ✓');
  } catch (e) { toast(e.message, 'err'); }
};
window.ShivaaAdmin.saveBullion = async e => {
  e.preventDefault();
  const cash = {};
  $$('#blCashForm input[data-k]').forEach(i => { cash[i.dataset.k] = cash[i.dataset.k] || {}; cash[i.dataset.k][i.dataset.f] = +i.value; });
  try { await api('/api/bullion/cash', { method: 'PUT', body: JSON.stringify({ cash }) }); toast('Cash rates saved — jewellers notified 📈'); renderAdmin($('#view'), new URLSearchParams('tab=bullion')); }
  catch (err) { toast(err.message, 'err'); }
};
/* v68 — RTGS calibration: live preview + reference-screen auto-derive */
window.ShivaaAdmin.rtgsSync = (e) => {
  const form = document.getElementById('rtgsForm');
  if (!form) return;
  form.querySelectorAll('tr[data-key]').forEach(tr => {
    const anchor = +tr.dataset.anchor || 0;
    const factor = +tr.querySelector('[name=factor]').value || 0;
    let prem = +tr.querySelector('[name=prem]').value || 0;
    let spread = +tr.querySelector('[name=spread]').value || 0;
    const side = tr.querySelector('[name=side]').value;
    const tbEl = tr.querySelector('[name=tb]'), tsEl = tr.querySelector('[name=ts]');
    if (e && (e.target === tbEl || e.target === tsEl) && (tbEl.value || tsEl.value)) {
      const base = anchor * factor;
      const tb = parseFloat(tbEl.value), ts = parseFloat(tsEl.value);
      if (tb > 0 && ts > 0) { spread = Math.max(0, (ts - tb) / 2); prem = (tb + ts) / 2 - base; }
      else if (tb > 0) { prem = tb - base + spread; }
      else if (ts > 0) { prem = ts - base - spread; }
      tr.querySelector('[name=prem]').value = Math.round(prem * 10) / 10;
      tr.querySelector('[name=spread]').value = Math.round(spread * 10) / 10;
    }
    const base = anchor * factor, mid = base + prem, n = v => Math.round(v).toLocaleString('en-IN');
    const bEl = tr.querySelector('.js-buy'), sEl = tr.querySelector('.js-sell');
    if (bEl) bEl.textContent = (side === 'sell' || side === 'off') ? '--' : n(mid - spread);
    if (sEl) sEl.textContent = (side === 'buy' || side === 'off') ? '--' : n(mid + spread);
  });
  const dp = document.getElementById('dutyGoldPrev'), ds = document.getElementById('dutySilverPrev');
  if (dp) {
    const f = form.querySelector('[name=gm]');
    const metaParity = (window.ShivaaAdmin._dutyParity || {}).gold || 0;
    dp.textContent = '₹' + Math.round(metaParity * +f.value).toLocaleString('en-IN') + ' /100 g';
  }
  if (ds) {
    const f = form.querySelector('[name=sm]');
    const metaParity = (window.ShivaaAdmin._dutyParity || {}).silver || 0;
    ds.textContent = '₹' + Math.round(metaParity * +f.value).toLocaleString('en-IN') + ' /kg';
  }
};
window.ShivaaAdmin.saveRtgs = async ev => {
  ev.preventDefault();
  const form = ev.target;
  const rows = {};
  form.querySelectorAll('tr[data-key]').forEach(tr => {
    rows[tr.dataset.key] = {
      factor: +tr.querySelector('[name=factor]').value || 1,
      prem: +tr.querySelector('[name=prem]').value || 0,
      spread: +tr.querySelector('[name=spread]').value || 0,
      side: tr.querySelector('[name=side]').value,
    };
  });
  const payload = { rows, bullionGoldDutyMult: +form.querySelector('[name=gm]').value,
    bullionSilverDutyMult: +form.querySelector('[name=sm]').value };
  try {
    await api('/api/bullion/rtgs', { method: 'PUT', body: JSON.stringify(payload) });
    toast('RTGS calibration saved — the board auto-tracks these levels 📈');
    renderAdmin($('#view'), new URLSearchParams('tab=bullion'));
  } catch (err) { toast(err.message, 'err'); }
};
window.ShivaaAdmin.blStatus = async (id, status) => {
  try { await api('/api/bullion/orders/' + id, { method: 'PUT', body: JSON.stringify({ status }) }); toast('Order ' + id + ' → ' + status); } catch (e) { toast(e.message, 'err'); }
};
window.ShivaaAdmin.setOrderStatus = null;
window.ShivaaAdmin.setStatus = async (id, status) => {
  try {
    await api('/api/orders/' + id, { method: 'PUT', body: JSON.stringify({ status }) });
    toast(`Order ${id} → ${status}`);
    // v57 — one-tap WhatsApp status update to the customer (full automation arrives with the gateway key)
    const o = (window.ShivaaAdmin._orderMap || {})[id];
    const ph = (o && ((o.address && o.address.phone) || o.phone) || '').replace(/\D/g, '').replace(/^0/, '').replace(/^91(?=[1-9])/, '');
    if (ph) {
      const awbLine = o && o.awb ? `\n\n*Courier:* ${o.courier || ''}\n*AWB / tracking no.:* ${o.awb}\nTrack on shivaa.in → My Orders → ${id}` : '';
      const msgs = {
        Confirmed: `Namaste from Shivaa Jewellers ✦\n\nYour order ${id} is *confirmed*. Our karigars are at work — we will share progress photos and dispatch details next.\n\nThank you for choosing Shivaa.`,
        Karigari: `Namaste from Shivaa Jewellers ✦\n\nYour order ${id} has entered *karigari* — our craftsmen are shaping your piece by hand. We will update you after hallmarking. You can watch every stage in your account: shivaa.in/#/order/${id}`,
        Hallmarking: `Namaste from Shivaa Jewellers ✦\n\nYour order ${id} is at *BIS hallmarking* — each piece receives its unique HUID before it is polished and packed. Its digital certificate will sit in your Shivaa locker.`,
        Packed: `Namaste from Shivaa Jewellers ✦\n\nYour order ${id} has been *polished, checked and packed* with the HUID-tagged purity certificate, fully insured and tamper-sealed. Dispatch is next.`,
        Shipped: `Namaste from Shivaa Jewellers ✦\n\nYour order ${id} has been *shipped* and is on its way.${awbLine}\n\nPlease keep someone available at the address for the insured handover.`,
        Delivered: `Namaste from Shivaa Jewellers ✦\n\nYour order ${id} has been *delivered*. Thank you for choosing Shivaa.\n\nA gentle reminder: every piece carries our written 100% buyback promise, a digital HUID certificate in your account, and free lifetime care (polishing, stone checks, resizing): shivaa.in/#/care`,
        Cancelled: `Namaste from Shivaa Jewellers ✦\n\nYour order ${id} has been *cancelled* as requested. If this was unexpected, please reply here and we will sort it immediately.`
      };
      const msg = msgs[status] || `Namaste from Shivaa Jewellers ✦\n\nUpdate on your order ${id}: its status is now *${status}*. Reply here if you have any questions.`;
      setTimeout(() => { if (confirm('Open WhatsApp to send this status update to the customer?')) window.open('https://wa.me/91' + ph + '?text=' + encodeURIComponent(msg), '_blank', 'noopener'); }, 250);
    }
  }
  catch (err) { toast(err.message, 'err'); }
};
window.ShivaaAdmin.changePw = async (e) => {
  e.preventDefault();
  const cur = document.getElementById('admPwCur').value;
  const nw = document.getElementById('admPwNew').value;
  const nw2 = document.getElementById('admPwNew2').value;
  if (nw.length < 8) return toast('New password must be at least 8 characters', 'err');
  if (nw !== nw2) return toast('The two new passwords do not match', 'err');
  try {
    const r = await api('/api/auth/change-password', { method: 'POST', body: JSON.stringify({ current: cur, password: nw }) });
    toast('Password updated ✦' + (r.sessionsRevoked ? ' ' + r.sessionsRevoked + ' other device(s) signed out' : ''));
    e.target.reset();
  } catch (err) { toast(err.message, 'err'); }
};
window.ShivaaAdmin.finaleCSV = async () => {
  try {
    const { entries } = await window.Shivaa.api('/api/finale/entries');
    if (!entries || !entries.length) { window.Shivaa.toast('No entries to export yet', 'err'); return; }
    const head = ['Entry ID', 'Name', 'Phone', 'Email', 'Route', 'Order', 'Score', 'Total', 'Status', 'Date (IST)'];
    const rows = entries.map(e => [e.id, e.name, e.phone, e.email, e.route, e.orderId || '', e.score, e.total, e.status,
      new Date(e.createdAt).toLocaleString('en-IN')]);
    const csv = '\uFEFF' + csvRows([head, ...rows]);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = 'shivaa-finale-entries-' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(a); a.click(); a.remove();
    window.Shivaa.toast('CSV downloaded — keep it for the draw file ✦');
  } catch (e) { window.Shivaa.toast(e.message || 'Could not export', 'err'); }
};
window.ShivaaAdmin.editProduct = id => {
  const p = id ? state.productsCache.find(x => x.id === id) : { name: '', category: 'rings', metal: 'Gold', purity: '22K', weightG: 5, mcScheme: 'percent', mcValue: '', stoneValue: 0, images: ['/images/products/ring-floral.jpg'], desc: '', tags: [], sizes: [], stock: 10 };
  openModal(`
    <h3 style="font-size:24px;margin-bottom:16px">${id ? 'Edit product' : 'Add product'}</h3>
    <form class="form-grid" onsubmit="ShivaaAdmin.saveProduct(event,'${id || ''}')">
      <div class="fld full"><label>Name</label><input required value="${esc(p.name)}" name="name"></div>
      <div class="fld"><label>Category</label><select class="sortsel" style="width:100%;border-radius:12px" name="category">${Object.entries(CATS).map(([k, v]) => `<option value="${k}" ${p.category === k ? 'selected' : ''}>${v.name}</option>`).join('')}</select></div>
      <div class="fld"><label>Metal</label><select class="sortsel" style="width:100%;border-radius:12px" name="metal"><option ${p.metal === 'Gold' ? 'selected' : ''}>Gold</option><option ${p.metal === 'Silver' ? 'selected' : ''}>Silver</option></select></div>
      <div class="fld"><label>Purity</label><select class="sortsel" style="width:100%;border-radius:12px" name="purity">${['22K', '18K', '925'].map(x => `<option ${p.purity === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
      <div class="fld"><label>Weight (g)</label><input type="number" step="0.1" required value="${p.weightG}" name="weightG"></div>
      <div class="fld"><label>MC scheme</label><select class="sortsel" style="width:100%;border-radius:12px" name="mcScheme"><option value="percent" ${p.mcScheme === 'percent' ? 'selected' : ''}>% of metal value</option><option value="perGram" ${p.mcScheme === 'perGram' ? 'selected' : ''}>per gram</option><option value="flat" ${p.mcScheme === 'flat' ? 'selected' : ''}>flat</option></select></div>
      <div class="fld"><label>MC ${p.mcScheme === 'percent' ? '% (blank = you decide)' : 'value'}</label><input type="number" step="0.5" ${p.mcScheme === 'percent' ? 'placeholder="e.g. 12"' : ''} value="${p.mcScheme === 'percent' && !p._keep ? '' : p.mcValue}" ${p.mcScheme === 'percent' ? '' : 'required'} name="mcValue"></div>
      <div class="fld"><label>Stone value ₹ (0 if none)</label><input type="number" value="${p.stoneValue || 0}" name="stoneValue"></div>
      <div class="fld"><label>Stone type (B2B filter)</label><select class="sortsel" style="width:100%;border-radius:12px" name="stoneType">${['Plain','CZ','Lab-Grown Diamond','Natural Diamond','Colour Stone','Kundan/Polki'].map(s => `<option ${((p.stoneType || 'Plain') === s) ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
      <div class="fld"><label>Stone colour (B2B filter)</label><select class="sortsel" style="width:100%;border-radius:12px" name="stoneColour">${['White','Colour'].map(s => `<option ${((p.stoneColour || 'White') === s) ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
      <div class="fld full" style="grid-column:1/-1;background:var(--gold-faint);border:1px dashed var(--gold-soft);border-radius:12px;padding:10px 12px">
        <small style="display:block;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#7a5c17;margin-bottom:6px">B2B wholesale settlement</small>
        <div style="display:flex;gap:10px"><div style="flex:1"><label style="font-size:11px;color:var(--ink-3)">Less weight (g)</label><input type="number" step="0.01" value="${p.lessWeightG ?? 0}" name="lessWeightG"></div>
        <div style="flex:1"><label style="font-size:11px;color:var(--ink-3)">Wastage %</label><input type="number" step="0.1" value="${p.wastagePct ?? 8}" name="wastagePct"></div></div>
        <small style="font-size:10.5px;color:var(--ink-3)">Fine metal = (gross − less) × (1 − wastage%) — jewellers only</small>
      </div>
      <div class="fld"><label>Stock</label><input type="number" value="${p.stock}" name="stock"></div>
      <div class="fld full"><label>Product pictures ${id ? '· tap the ★ to choose which picture is shown in the list (primary)' : '· pick a picture'}</label>
        <div class="apg-grid" id="apgGrid"></div>
        <div class="kyc-inline" style="margin-top:6px">
          <select class="sortsel" id="apgStock" style="flex:1;min-width:180px;border-radius:12px">${IMG_FILES.map(f => `<option value="/images/products/${f}">${f}</option>`).join('')}</select>
          <button type="button" class="btn btn-ghost btn-sm" id="apgAdd">+ Add this picture</button>
        </div>
        <p class="apg-hint">The picture with the solid gold ★ is the primary picture — it is what shoppers see in the list, the cart and shared links.</p>
      </div>
      <div class="fld full"><label>Sizes (comma separated)</label><input value="${esc((p.sizes || []).join(', '))}" name="sizes"></div>
      <div class="fld full"><label>Tags (comma: wedding, festive, daily, gifting, mens, new, bestseller)</label><input value="${esc((p.tags || []).join(', '))}" name="tags"></div>
      <div class="fld full"><label>Description</label><textarea name="desc">${esc(p.desc)}</textarea></div>
      <button class="btn btn-primary btn-block">${id ? 'Save changes' : 'Add product'}</button>
    </form>`, 'lg');
  window._ep = p;

  /* v56 primary-image picker — images[0] is the list/primary picture */
  window._epImages = (p.images || []).slice();
  const renderImgGrid = () => {
    const grid = document.getElementById('apgGrid');
    if (!grid) return;
    grid.innerHTML = window._epImages.map((src, i) => `
      <div class="apg-thumb ${i === 0 ? 'primary' : ''}" title="${i === 0 ? 'Primary picture' : 'Tap ★ to make this the primary picture'}">
        <button type="button" class="apg-star" data-i="${i}" title="Set as primary picture">${i === 0 ? '★' : '☆'}</button>
        <button type="button" class="apg-x" data-i="${i}" title="Remove this picture">✕</button>
        <img src="${safeUrl(src) || '/images/logo.png'}" alt="product picture ${i + 1}" loading="lazy" onerror="this.onerror=null;this.src='/images/logo.png'">
        ${i === 0 ? '<span class="apg-tag">Primary</span>' : ''}
      </div>`).join('');
    grid.querySelectorAll('.apg-star').forEach(b => b.onclick = () => {
      const i = +b.dataset.i;
      const [cur] = window._epImages.splice(i, 1);
      window._epImages.unshift(cur);
      renderImgGrid();
    });
    grid.querySelectorAll('.apg-x').forEach(b => b.onclick = () => {
      const i = +b.dataset.i;
      if (window._epImages.length <= 1) { window.Shivaa.toast('Keep at least one picture, or add one below', 'err'); return; }
      window._epImages.splice(i, 1);
      renderImgGrid();
    });
  };
  renderImgGrid();
  const addBtn = document.getElementById('apgAdd');
  if (addBtn) addBtn.onclick = () => {
    const sel = document.getElementById('apgStock');
    const src = sel.value;
    if (window._epImages.includes(src)) {
      window._epImages = window._epImages.filter(x => x !== src);
      window._epImages.unshift(src);
    } else {
      window._epImages.push(src);
    }
    renderImgGrid();
    window.Shivaa.toast('Picture added — tap its ★ to make it primary');
  };
};
window.ShivaaAdmin.saveProduct = async (e, id) => {
  e.preventDefault();
  const f = e.target;
  const g = n => { const el = f.querySelector(`[name="${n}"]`); return el ? el.value : ''; };
  if (g('mcScheme') === 'percent' && (!g('mcValue') || +g('mcValue') <= 0 || +g('mcValue') > 60)) return toast('Enter making charges % (0-60)', 'err');
  if (!(+g('weightG') > 0)) return toast('Weight must be greater than 0', 'err');
  /* v56: preserve the full picture set with the admin-chosen primary first */
  let images = (window._epImages || []).slice();
  if (!images.length) { const sel = document.getElementById('apgStock'); if (sel && sel.value) images = [sel.value]; }
  if (!images.length) return toast('Add at least one product picture', 'err');
  const body = {
    name: g('name').trim(), category: g('category'), metal: g('metal'), purity: g('purity'),
    weightG: +g('weightG'), mcScheme: g('mcScheme'), mcValue: +g('mcValue') || 0,
    stoneValue: +g('stoneValue') || 0, stoneType: g('stoneType'), stoneColour: g('stoneColour'),
    stock: +g('stock') || 0, lessWeightG: +g('lessWeightG') || 0, wastagePct: +g('wastagePct') || 0,
    images,
    sizes: g('sizes').split(',').map(s => s.trim()).filter(Boolean),
    tags: g('tags').split(',').map(s => s.trim().toLowerCase()).filter(Boolean),
    desc: g('desc'),
  };
  try {
    if (id) await api('/api/products/' + id, { method: 'PUT', body: JSON.stringify(body) });
    else await api('/api/products', { method: 'POST', body: JSON.stringify(body) });
    toast(id ? 'Product updated' : 'Product added'); closeModal();
    await reloadProducts(); renderAdmin($('#view'), new URLSearchParams('tab=products'));
  } catch (err) { toast(err.message, 'err'); }
};
window.ShivaaAdmin.delProduct = async id => {
  if (!confirm('Delete this product permanently?')) return;
  try { await api('/api/products/' + id, { method: 'DELETE' }); toast('Product deleted'); await reloadProducts(); renderAdmin($('#view'), new URLSearchParams('tab=products')); }
  catch (err) { toast(err.message, 'err'); }
};
async function reloadProducts() {
  const r = await api('/api/products');
  state.productsCache = r.products; state.rates = { ...state.rates, ...r.rates };
}
window.ShivaaAdmin.saveMC = async () => {
  const table = state.mcTable.map((r, i) => {
    const row = { ...r };
    $$(`[data-i="${i}"]`).forEach(el => { row[el.dataset.f] = el.value; });
    row.value = +row.value; row.min = +row.min;
    return row;
  });
  try { await api('/api/making-charges', { method: 'PUT', body: JSON.stringify({ table }) }); state.mcTable = table; toast('Making-charges chart published ✦'); }
  catch (err) { toast(err.message, 'err'); }
};
window.ShivaaAdmin.addMCRow = () => { state.mcTable.push({ id: 'mc' + Date.now(), category: 'New Category', purity: '22K', mode: 'perGram', value: 500, min: 400, note: '' }); renderAdmin($('#view'), new URLSearchParams('tab=mc')); };
window.ShivaaAdmin.featCat = async (id, on) => {
  try { await api('/api/catalogs/' + id, { method: 'PUT', body: JSON.stringify({ featured: on }) }); toast(on ? 'Featured' : 'Unfeatured'); }
  catch (e) { toast(e.message, 'err'); }
};
window.ShivaaAdmin.delCat = async id => {
  if (!confirm('Delete this catalogue?')) return;
  try { await api('/api/catalogs/' + id, { method: 'DELETE' }); toast('Catalogue deleted'); renderAdmin($('#view'), new URLSearchParams('tab=catalogs')); document.dispatchEvent(new CustomEvent('catalogs:change')); }
  catch (e) { toast(e.message, 'err'); }
};
window.ShivaaAdmin.setPartner = async (id, status) => {
  try { await api('/api/partners/' + id, { method: 'PUT', body: JSON.stringify({ status }) }); toast(status === 'approved' ? 'Partner approved — portal access granted ✦' : 'Application rejected'); renderAdmin($('#view'), new URLSearchParams('tab=partners')); }
  catch (e) { toast(e.message, 'err'); }
};

/* ───────── v88 · partner GST KYC detail card + official certificate ───────── */
window.ShivaaAdmin._partnersCache = () => {
  // partnersData is the tab-scoped cache; the modal reads live data passed by the row
  return window.__partnersList || [];
};
const gstRow = (label, val) => val ? `<div class="sum-row"><span>${label}</span><b style="font-weight:600;text-align:right;max-width:62%">${esc(String(val))}</b></div>` : '';
window.ShivaaAdmin.gstKycHtml = (p) => {
  const k = p.kyc || {};
  const live = !!k.gstinLiveVerified;
  const statusPill = live
    ? `<span class="pill pm" title="Confirmed against the official GST register">✓ ${esc(k.gstStatus || 'Active')} · govt-verified</span>`
    : `<span class="pill" style="background:#fff3cd;color:#7a5c00" title="Checksum valid, but the register could not be reached when they applied">? checksum only — verify below</span>`;
  // every register-sourced string is escaped before entering innerHTML
  const addr = [k.gstAddress, [k.gstDistrict, k.gstState].filter(Boolean).join(', '), k.gstPincode]
    .filter(Boolean).map(esc).join('<br>');
  return `
  <div style="max-width:560px">
    <h3 style="margin:0 0 4px">${esc(p.firm || 'Partner')}</h3>
    <div class="muted" style="margin-bottom:10px">${esc(p.city || '')}${k.gstin ? ' · GSTIN ' + esc(k.gstin) : ''}</div>
    <div style="margin:6px 0 12px">${statusPill}
      <span class="pill pm" style="margin-left:4px">${k.otpVerified ? 'Mobile OTP ✓' : 'OTP ?'}</span></div>
    ${live ? `
    <div class="adm-card" style="padding:12px 14px;margin-bottom:12px">
      ${gstRow('Registered name', k.legalName)}
      ${gstRow('Trade name', k.tradeName && k.tradeName !== k.legalName ? k.tradeName : '')}
      ${gstRow('Constitution', k.businessType)}
      ${gstRow('Registered on', k.registrationDate)}
      ${addr ? `<div class="sum-row"><span>Registered address</span><b style="font-weight:600;text-align:right;max-width:62%">${addr}</b></div>` : ''}
      ${gstRow('PAN (from GSTIN)', k.pan)}
      ${gstRow('Owner PAN', k.ownerPan)}
      ${gstRow('State (from number)', k.gstinState)}
      ${gstRow('Verified by us at', k.gstVerifiedAt ? new Date(k.gstVerifiedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '')}
    </div>` : `
    <div class="adm-card" style="padding:12px 14px;margin-bottom:12px;border-left:3px solid #d99700">
      <p style="margin:0 0 8px">Only the GSTIN format and state were checked at application time. Re-verify live now (costs 1 APITxT credit) before approving, or open the certificate to inspect it manually.</p>
      ${gstRow('State (from number)', k.gstinState)}
      ${gstRow('PAN (from GSTIN)', k.pan)}
      ${gstRow('Owner PAN', k.ownerPan)}
    </div>`}
    ${k.businessCard ? `<div class="adm-card" style="padding:12px 14px;margin-bottom:12px">
      <b style="display:block;margin-bottom:8px">Business card uploaded with the application</b>
      ${/\.(jpe?g|png|webp|gif)$/i.test(k.businessCard)
        ? `<a href="${safeUrl(k.businessCard)}" target="_blank" rel="noopener"><img src="${safeUrl(k.businessCard)}" alt="Business card" style="display:block;max-height:230px;max-width:100%;border-radius:10px;border:1px solid var(--line,#ead9c0)"></a>`
        : `<a class="btn btn-outline btn-sm" href="${safeUrl(k.businessCard)}" target="_blank" rel="noopener">📇 Open the business card (PDF) ↗</a>`}
    </div>` : ''}
    <div class="kyc-inline" style="gap:8px;flex-wrap:wrap">
      <button class="btn btn-primary btn-sm" data-g="${esc(k.gstin || '')}" onclick="ShivaaAdmin.viewGstCert(this)">📄 View GST certificate (REG-06)</button>
      <button class="btn btn-outline btn-sm" data-g="${esc(k.gstin || '')}" data-pid="${esc(p.id)}" onclick="ShivaaAdmin.gstReverify(this)">↻ Re-verify live</button>
    </div>
    <p style="font-size:12px;color:var(--ink-3);margin:10px 0 0">The certificate is fetched from the GST register via APITxT (1 credit each, cached 30 days). Re-verify refreshes this card with the latest register data.</p>
    <div id="gstKycExtra" style="margin-top:10px"></div>
  </div>`;
};
window.ShivaaAdmin.gstKycModal = (id) => {
  const p = (window.__partnersList || []).find(x => x.id === id);
  if (!p) return toast('Partner data not loaded — reopen the Partners tab', 'err');
  openModal(window.ShivaaAdmin.gstKycHtml(p), 'gst-kyc-modal');
};
window.ShivaaAdmin.gstReverify = async (btn) => {
  const gstin = btn.getAttribute('data-g');
  const pid = btn.getAttribute('data-pid');
  if (!gstin) return;
  const old = btn.textContent; btn.disabled = true; btn.textContent = 'Checking register…';
  try {
    const r = await api('/api/admin/gst-reverify', { method: 'POST', body: JSON.stringify({ gstin }) });
    if (!r.ok) { toast(r.note || ('GSTIN is ' + (r.gstStatus || 'not Active')), 'err'); btn.disabled = false; btn.textContent = old; return; }
    // refresh the cached partner record then re-render the open card
    const list = window.__partnersList || [];
    list.forEach((p, i) => {
      if (String((p.kyc && p.kyc.gstin) || '').toUpperCase() === gstin) {
        p.kyc = Object.assign({}, p.kyc, r.snapshot);
        if (r.snapshot.gstAddress) p.address = [r.snapshot.gstAddress, r.snapshot.gstDistrict, r.snapshot.gstState, r.snapshot.gstPincode].filter(Boolean).join(', ');
        if (r.snapshot.gstPincode) p.pincode = r.snapshot.gstPincode;
      }
    });
    window.__partnersList = list;
    toast('GST register refreshed ✓');
    const p = list.find(x => x.id === pid);
    if (p) openModal(window.ShivaaAdmin.gstKycHtml(p), 'gst-kyc-modal');
    renderAdmin($('#view'), new URLSearchParams('tab=partners'));
  } catch (e) { toast(e.message, 'err'); btn.disabled = false; btn.textContent = old; }
};
window.ShivaaAdmin.viewGstCert = async (btn) => {
  const gstin = btn.getAttribute('data-g');
  if (!gstin) return;
  const old = btn.textContent; btn.disabled = true; btn.textContent = 'Fetching certificate…';
  try {
    const res = await fetch('/api/admin/gst-certificate?gstin=' + encodeURIComponent(gstin),
      { headers: token() ? { Authorization: 'Bearer ' + token() } : {} });
    const ct = res.headers.get('content-type') || '';
    if (!res.ok || ct.indexOf('pdf') === -1) {
      let msg = 'Certificate unavailable';
      try { const j = await res.json(); msg = j.error || msg; } catch (e) {}
      throw new Error(msg);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const extra = document.getElementById('gstKycExtra');
    if (extra) {
      extra.innerHTML = `<div class="adm-card" style="padding:10px">
        <div class="kyc-inline" style="margin-bottom:8px"><b>GST certificate · ${esc(gstin)}</b>
          <a class="btn btn-outline btn-sm" href="${url}" download="GST-REG-06-${esc(gstin)}.pdf">⬇ Download PDF</a></div>
        <iframe src="${url}" title="GST certificate ${esc(gstin)}" style="width:100%;height:62vh;border:1px solid var(--line,#ddd);border-radius:10px;background:#fff"></iframe>
      </div>`;
      extra.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      const a = document.createElement('a');
      a.href = url; a.download = 'GST-REG-06-' + gstin + '.pdf'; document.body.appendChild(a); a.click(); a.remove();
    }
  } catch (e) { toast(e.message, 'err'); }
  finally { btn.disabled = false; btn.textContent = old; }
};

/* ── v30: set/reset any portal password (partners & customers) · v34: admin's own row too ── */
window.ShivaaAdmin.setUserPassword = async (btn) => {
  const uid = btn.dataset.uid || '', em = btn.dataset.em || '';
  const self = btn.dataset.admin === '1';
  openModal(`<div class="center"><h3 style="margin-bottom:6px">${self ? 'Set a new admin password' : 'Set portal password'}</h3>
    <p style="color:var(--ink-3);font-size:13px;margin-bottom:14px">${self
      ? `For <b>${esc(em)}</b> — your account. You will be signed out everywhere; sign back in with the new password.`
      : `For <b>${esc(em)}</b>. Share it privately on WhatsApp &mdash; their old sessions end immediately.`}</p>
    <form id="setPwF" class="form-grid" style="grid-template-columns:1fr">
      <div class="fld"><label>New password (min 8 characters)</label><input name="pw" type="${self ? 'password' : 'text'}" required minlength="8" autocomplete="off" placeholder="e.g. Gold@2026Safe"></div>
      ${self ? `<div class="fld"><label>Repeat the new password</label><input name="pw2" type="password" required minlength="8" autocomplete="off" placeholder="type it again — protects against a typo lockout"></div>` : ''}
      <button class="btn btn-primary btn-block">Save new password</button>
    </form></div>`);
  $('#setPwF').onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const pw = String(fd.get('pw') || ''), pw2 = String(fd.get('pw2') || '');
    if (self && pw !== pw2) return toast('The two passwords do not match — try again', 'err');
    try {
      let id = uid;
      if (!id) {
        const { users } = await api('/api/admin/users');
        const u = users.find(x => String(x.email).toLowerCase() === em.toLowerCase());
        if (!u) throw new Error('No user account exists with that email');
        id = u.id;
      }
      const r = await api('/api/users/' + id + '/password', { method: 'POST', body: JSON.stringify({ password: pw }) });
      toast('Password set for ' + r.email + ' ✦ — share it privately');
      closeModal();
    } catch (err) { toast(err.message, 'err'); }
  };
};
window.ShivaaAdmin.addCoupon = async e => {
  e.preventDefault();
  const fd = new FormData(e.target); const g = k => String(fd.get(k) || '');
  try { await api('/api/coupons', { method: 'POST', body: JSON.stringify({ code: g('code').toUpperCase(), type: g('type'), value: +g('value'), minOrder: +g('minOrder'), note: g('note') }) }); toast('Coupon created'); renderAdmin($('#view'), new URLSearchParams('tab=coupons')); }
  catch (err) { toast(err.message, 'err'); }
};
/* v103 — GST registration certificate for the public Trust page */
window.ShivaaAdmin.bindGstCert = () => {
  const fi = document.getElementById('gstCertFile');
  if (!fi || fi._bound) return; fi._bound = true;
  const msg = document.getElementById('gstCertMsg');
  const say = (t, bad) => { if (msg) { msg.textContent = t; msg.style.color = bad ? 'var(--bad)' : 'var(--ok)'; } };
  fi.onchange = async () => {
    const f = fi.files && fi.files[0]; if (!f) return;
    if (f.size > 8 * 1024 * 1024) { say('File is over 8 MB', true); fi.value = ''; return; }
    const okType = /^(application\/pdf|image\/(jpeg|png|webp))$/.test(f.type) || /\.(pdf|jpe?g|png|webp)$/i.test(f.name);
    if (!okType) { say('Use a PDF, JPG, PNG or WEBP file', true); fi.value = ''; return; }
    say('Uploading…', false);
    const fd = new FormData(); fd.append('file', f);
    try {
      const r = await api('/api/admin/trust-certificate', { method: 'POST', body: fd });
      state.settings.gstCert = r.cert;
      say('✓ Certificate published to the Trust page');
      renderAdmin(document.getElementById("view"), new URLSearchParams("tab=settings"));
    } catch (e) { say(e.message || 'Upload failed', true); }
  };
  const rm = document.getElementById('gstCertRemove');
  if (rm) rm.onclick = async () => {
    if (!confirm('Remove the GST certificate from the public Trust page?')) return;
    try {
      await api('/api/admin/trust-certificate', { method: 'DELETE' });
      delete state.settings.gstCert;
      renderAdmin(document.getElementById("view"), new URLSearchParams("tab=settings"));
    } catch (e) { say(e.message, true); }
  };
};

window.ShivaaAdmin.saveSettings = async e => {
  e.preventDefault();
  // read by name — positional indexing silently corrupts settings if a field moves
  const fd = new FormData(e.target); const g = k => String(fd.get(k) || '');
  try {
    const s = await api('/api/settings', { method: 'PUT', body: JSON.stringify({ phone: g('phone'), whatsapp: g('whatsapp').replace(/\D/g, ''), email: g('email'), address: g('address'), freeShipAbove: +g('freeShipAbove'), shippingFee: +g('shippingFee'), jaipurPremium: +g('jaipurPremium'), gold22Premium: +g('gold22Premium'), jaipurSilverPremium: +g('jaipurSilverPremium'), gstApi: { key: g('gstKey').trim() }, announcements: g('announcements').split('\n').filter(Boolean) }) });
    Object.assign(state.settings, s); toast('Settings saved');
  } catch (err) { toast(err.message, 'err'); }
};
/* ── v128 · payments settings (Cashfree hosted checkout) ── */
window.ShivaaAdmin.savePay = async e => {
  e.preventDefault();
  const fd = new FormData(e.target); const g = k => String(fd.get(k) || '');
  const body = { payProvider: g('payProvider'),
                 prepaidPct: Math.max(0, +g('prepaidPct') || 0), codFeePct: Math.max(0, +g('codFeePct') || 0),
                 upiId: g('upiId').trim(), upiName: g('upiName').trim() || 'Shivaa Jewellers',
                 codBlockedPins: g('codBlockedPins').replace(/[^\d,\s]/g, '').trim(),
                 gstin: g('gstin').trim().toUpperCase(), googleReviewUrl: g('googleReviewUrl').trim(),
                 // v128 — Cashfree hosted checkout
                 siteBaseUrl: g('siteBaseUrl').trim().replace(/\/+$/, ''),
                 cfAppId: g('cfAppId').trim(),
                 cfEnv: g('cfEnv') === 'production' ? 'production' : 'sandbox',
                 // v139 — Cashfree One Click Checkout
                 cfOcc: !!document.querySelector('[name="cfOcc"]')?.checked,
                 cfOccAddress: !!document.querySelector('[name="cfOccAddress"]')?.checked,
                 cfOccAuth: !!document.querySelector('[name="cfOccAuth"]')?.checked,
                 // v142 — automatic guest checkout (One-Tap Buy)
                 guestCheckout: !!document.querySelector('[name="guestCheckout"]')?.checked,
                 tcAppKey: document.querySelector('[name="tcAppKey"]')?.value?.trim() || '' };
  // secret key is write-only: only sent when retyped (server strips it from GETs)
  if (g('cfSecretKey')) body.cfSecretKey = g('cfSecretKey').trim();
  try {
    const s = await api('/api/settings', { method: 'PUT', body: JSON.stringify(body) });
    Object.assign(state.settings, s);
    ShivaaAdmin.wirePayUrls(s.siteBaseUrl || '');
    const liveMsg = body.payProvider === 'cashfree' && body.cfAppId && body.cfSecretKey
      ? (body.cfEnv === 'sandbox' ? 'Cashfree connected in SANDBOX mode 🧪' : 'Payments LIVE via Cashfree 🟣')
      : 'Payment settings saved (demo / UPI-QR mode)';
    toast(liveMsg);
    if (body.payProvider === 'cashfree') setTimeout(() => ShivaaAdmin.testPay('cashfree'), 500);
  } catch (err) { toast(err.message, 'err'); }
};
/* v128 — show the exact return + webhook URLs to configure in the Cashfree dashboard */
window.ShivaaAdmin.wirePayUrls = (base) => {
  const b = (base || '').replace(/\/+$/, '') || ('https://' + (location.hostname || 'www.shivaa.in'));
  const r = document.getElementById('cfReturnUrl');
  if (r) r.textContent = b + '/api/pay/cashfree/return';
  const w = document.getElementById('cfWebhookUrl');
  if (w) w.textContent = b + '/api/pay/cashfree/webhook';
};
window.ShivaaAdmin.testPay = async (provider) => {
  const out = document.getElementById('cfTestOut');
  if (out) out.innerHTML = '<span class="live-dot" style="display:inline-block;margin-right:6px"></span> Checking credentials with Cashfree…';
  try {
    const r = await api('/api/admin/pay-test', { method: 'POST', body: JSON.stringify({ provider }) });
    if (out) {
      if (r.ok) {
        const tail = r.env ? ' <small>(' + esc(r.env) + (r.code ? ', ' + esc(String(r.code)) : '') + ')</small>' : '';
        out.innerHTML = '✅ <b style="color:var(--ok,#1d7a46)">' + esc(r.detail || 'Credentials accepted') + '</b>' + tail;
      } else {
        out.innerHTML = '❌ <b style="color:var(--danger,#b3261e)">' + esc(r.detail || r.error || 'Rejected') + '</b>';
      }
    }
  } catch (err) { if (out) out.innerHTML = '❌ <b style="color:var(--danger,#b3261e)">' + esc(err.message) + '</b>'; }
};
/* ── v61 · official MCX (Angel One) feed settings ── */
window.ShivaaAdmin.saveFeed = async e => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const body = {
    angelEnabled: fd.get('angelEnabled') === 'on',
    angelClient: String(fd.get('angelClient') || '').trim(),
    angelMpin: String(fd.get('angelMpin') || ''),
    angelApiKey: String(fd.get('angelApiKey') || '').trim(),
    angelTotpSecret: String(fd.get('angelTotpSecret') || '').replace(/\s/g, '').toUpperCase(),
    angelGoldToken: String(fd.get('angelGoldToken') || '').trim(),
    angelSilverToken: String(fd.get('angelSilverToken') || '').trim(),
    manualUsdInr: parseFloat(fd.get('manualUsdInr')) || 0,
    manualXauUsd: parseFloat(fd.get('manualXauUsd')) || 0,
    manualXagUsd: parseFloat(fd.get('manualXagUsd')) || 0,
    spotXauAdj: parseFloat(fd.get('spotXauAdj')) || 0,
    spotXagAdj: parseFloat(fd.get('spotXagAdj')) || 0,
    spotInrAdj: parseFloat(fd.get('spotInrAdj')) || 0,
    angelRelayUrl: String(fd.get('angelRelayUrl') || '').trim().replace(/\/+$/, ''),
    angelRelayKey: String(fd.get('angelRelayKey') || '').trim(),
    angelRelayStreamUrl: String(fd.get('angelRelayStreamUrl') || '').trim(),
  };
  // keep already-saved secrets when the owner saves without retyping them
  ['angelMpin', 'angelApiKey', 'angelTotpSecret'].forEach(k => { if (!body[k]) delete body[k]; });
  try {
    const s = await api('/api/settings', { method: 'PUT', body: JSON.stringify(body) });
    Object.assign(state.settings, s);
    toast('MCX feed settings saved ✦ testing connection…');
    setTimeout(() => ShivaaAdmin.testFeed(), 600);
  } catch (err) { toast(err.message, 'err'); }
};
window.ShivaaAdmin.testFeed = async () => {
  const el = document.getElementById('feedStatus');
  if (el) el.innerHTML = '<span class="live-dot" style="display:inline-block;margin-right:6px"></span> Logging in & fetching MCX LTP…';
  try {
    const r = await api('/api/admin/feed-test');
    if (r.ok) {
      const cGold = r.mcx.goldSymbol && r.mcx.goldSymbol !== 'manual GOLD' ? esc(String(r.mcx.goldSymbol)) : 'GOLD';
      const cSil = r.mcx.silverSymbol && r.mcx.silverSymbol !== 'manual SILVER' ? esc(String(r.mcx.silverSymbol)) : 'SILVER';
      if (el) el.innerHTML = `✅ <b style="color:var(--ok,#1d7a46)">Live MCX connected</b> — ${cGold} ₹${Number(r.mcx.goldLtp).toLocaleString('en-IN')}/10 g · ${cSil} ₹${Number(r.mcx.silverLtp).toLocaleString('en-IN')}/kg at ${new Date(r.mcx.at).toLocaleTimeString('en-IN')}${r.mcx.autoTokens ? ' <small style="color:var(--ink-3)">(near-month auto-selected)</small>' : ''}`;
      toast('MCX feed live ✦');
    } else {
      let d = '';
      if (r.debug) {
        const g = (r.debug.goldCandidates || []).slice(0, 3).join(', ');
        const s = (r.debug.silverCandidates || []).slice(0, 3).join(', ');
        const rej = [];
        (r.debug.attempts || []).forEach(a => (a.rejected || []).forEach(x => x && rej.push(x)));
        d = `<br><small style="color:var(--ink-3);display:block;margin-top:4px;line-height:1.5">`
          + (g ? `Gold candidates: ${esc(g)}<br>` : '') + (s ? `Silver candidates: ${esc(s)}<br>` : '')
          + (rej.length ? `Exchange replies: ${esc([...new Set(rej)].slice(0, 3).join(' · '))}` : '')
          + `</small>`;
      }
      if (el) el.innerHTML = '⚠ Feed not connected (' + esc(r.reason || 'unknown') + '). International spot remains active.' + d;
    }
  } catch (err) { if (el) el.innerHTML = '⚠ ' + esc(err.message); }
};
/* v73 — server-side external-source diagnostic (dollars / FX reachability) */
window.ShivaaAdmin.testNet = async () => {
  const el = document.getElementById('netStatus');
  if (el) el.innerHTML = '<span class="live-dot" style="display:inline-block;margin-right:6px"></span> Probing every dollar/FX source from your server (takes ~2 s)…';
  try {
    const r = await api('/api/admin/net-test');
    const names = {
      jsd: 'jsDelivr CDN (gold+silver+FX)', jsdFast: 'jsDelivr Fastly mirror',
      gxau: 'gold-api GOLD', gxag: 'gold-api SILVER', er: 'exchangerate API (FX)',
      yGold: 'Yahoo GOLD', ySilver: 'Yahoo SILVER', yInr: 'Yahoo USD/INR',
      ffDev: 'Frankfurter/ECB (.dev)', ffApp: 'Frankfurter/ECB (.app)' };
    const rows = Object.entries(r.providers || {}).map(([k, p]) =>
      `<tr><td>${esc(names[k] || k)}</td><td class="${p.ok ? '' : 'rtgs-bad'}" style="color:${p.ok ? '#1d8a4d' : '#c0392b'}">${p.ok ? '✓ HTTP ' + p.code : '✗ ' + (p.code || 'blocked') + (p.err ? ' · ' + esc(p.err).slice(0, 40) : '')}</td><td class="num">${p.ms} ms</td><td style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--ink-3)">${esc(p.sample || '')}</td></tr>`).join('');
    const v = r.resolved || {};
    const cell = (label, val, src) => `<div class="bd-kar" style="margin:4px"><small>${label} · ${esc(src || 'none')}</small><b>${val ? Number(val).toLocaleString('en-IN') : '--'}</b></div>`;
    if (el) el.innerHTML = `
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin:6px 0">
        ${cell('GOLD $/oz', v.goldUsd, v.goldSrc)}${cell('SILVER $/oz', v.silverUsd, v.silverSrc)}${cell('USD/INR', v.usdInr, v.inrSrc)}
      </div>
      <details open><summary style="cursor:pointer;font-weight:700;margin:6px 0">Provider reachability from this server${r.curlMulti ? '' : ' ⚠ curl_multi disabled'}</summary>
      <div class="mc-table-wrap"><table class="mc-table"><thead><tr><th>Source</th><th>Status</th><th class="num">Latency</th><th>Sample reply</th></tr></thead><tbody>${rows}</tbody></table></div>
      <p class="partner-note" style="margin-top:6px">Outbound IP: <b>${esc(r.outboundIp || 'not detected')}</b> · PHP ${esc(r.php || '?')} · last rate stamp: ${esc(r.lastStamp || 'none')} (${esc(r.stampSource || '?')}) · stamp USD/INR: ${esc(String(r.stampInr ?? '--'))}. Send a screenshot of this table if the dollar cards are blank.</p></details>`;
    toast(v.goldUsd && v.usdInr ? 'Dollar/FX sources OK ✦' : 'Some sources unreachable — table shows which');
  } catch (err) { if (el) el.innerHTML = '⚠ ' + esc(err.message); }
};

/* ── v58 · old gold register entry ── */
window.ShivaaAdmin.goldBuySave = async e => {
  e.preventDefault();
  const fd = new FormData(e.target); const g = k => String(fd.get(k) || '').trim();
  try {
    await api('/api/admin/gold-purchases', { method: 'POST', body: JSON.stringify({
      sellerName: g('sellerName'), sellerPhone: g('sellerPhone'), idDoc: g('idDoc'),
      weightG: +g('weightG'), purity: g('purity'), ratePerG: +g('ratePerG'),
      deductions: +g('deductions') || 0, settledAs: g('settledAs'), note: g('note'),
    }) });
    toast('Purchase entered in register ✦');
    renderAdmin($('#view'), new URLSearchParams('tab=gold'));
  } catch (err) { toast(err.message, 'err'); }
};
/* ── v59 · UPI payment proof approvals ── */
window.ShivaaAdmin.proofDecide = async (id, decision) => {
  let note = '';
  if (decision === 'reject') note = prompt('Reason for rejecting (sent internally / on WhatsApp):') || '';
  try {
    await api('/api/admin/pay-proof', { method: 'POST', body: JSON.stringify({ orderId: id, decision, note }) });
    toast(decision === 'approve' ? 'Order ' + id + ' marked PAID ✓' : 'Proof rejected — order back to awaiting payment');
    renderAdmin($('#view'), new URLSearchParams('tab=orders'));
  } catch (e) { toast(e.message, 'err'); }
};
/* ── v59 · karigar job-work ── */
window.ShivaaAdmin.kgSave = async e => {
  e.preventDefault(); const fd = new FormData(e.target); const g = k => String(fd.get(k) || '').trim();
  try { await api('/api/admin/karigars', { method: 'POST', body: JSON.stringify({ name: g('name'), phone: g('phone'), speciality: g('speciality') }) });
    toast('Karigar added ✦'); renderAdmin($('#view'), new URLSearchParams('tab=karigar')); }
  catch (err) { toast(err.message, 'err'); }
};
window.ShivaaAdmin.jobSave = async e => {
  e.preventDefault(); const fd = new FormData(e.target); const g = k => String(fd.get(k) || '').trim();
  try { const r = await api('/api/admin/job-work', { method: 'POST', body: JSON.stringify(Object.fromEntries(fd)) });
    toast('Job issued & slip ready ✦'); renderAdmin($('#view'), new URLSearchParams('tab=karigar'));
    setTimeout(() => ShivaaAdmin.printJobSlip((r.job || {}).id), 300);
  } catch (err) { toast(err.message, 'err'); }
};
window.ShivaaAdmin.jobReceive = async id => {
  const wb = prompt('Weight returned by karigar (grams):'); if (wb === null) return;
  const extra = prompt('Extra charges ₹ (or 0):', '0') || 0;
  try { await api('/api/admin/job-work/' + id, { method: 'PUT', body: JSON.stringify({ weightBack: +wb, extraCharge: +extra || 0, status: 'returned' }) });
    toast('Piece received — weight reconciled ✦'); renderAdmin($('#view'), new URLSearchParams('tab=karigar')); }
  catch (e) { toast(e.message, 'err'); }
};
window.ShivaaAdmin.jobPay = async id => {
  const amt = prompt('Pay karigar ₹ now:', '0'); if (!amt || +amt <= 0) return;
  try { await api('/api/admin/job-work/' + id, { method: 'PUT', body: JSON.stringify({ paid: +amt }) });
    toast('Payment recorded ✦'); renderAdmin($('#view'), new URLSearchParams('tab=karigar')); }
  catch (e) { toast(e.message, 'err'); }
};
window.ShivaaAdmin.srStatus = async (id, status) => {
  try { await api('/api/services/' + id + '/status', { method: 'PUT', body: JSON.stringify({ status }) });
    toast('Token ' + id + ' → ' + status); renderAdmin($('#view'), new URLSearchParams('tab=leads')); }
  catch (e) { toast(e.message, 'err'); }
};
/* ── v59 · cash book ── */
window.ShivaaAdmin.cbAdd = async (e, date) => {
  e.preventDefault(); const fd = new FormData(e.target);
  try { await api('/api/admin/cashbook', { method: 'POST', body: JSON.stringify(Object.fromEntries(fd)) });
    toast('Entry added ✦'); renderAdmin($('#view'), new URLSearchParams('tab=cash')); }
  catch (err) { toast(err.message, 'err'); }
};
window.ShivaaAdmin.dayClose = async (e, date) => {
  e.preventDefault(); const fd = new FormData(e.target);
  try { await api('/api/admin/cashbook/day-close', { method: 'POST', body: JSON.stringify({ date, openingCash: +fd.get('openingCash') || 0, closingCash: +fd.get('closingCash') || 0, note: fd.get('note') }) });
    toast('Day close locked ✦'); renderAdmin($('#view'), new URLSearchParams('tab=cash')); }
  catch (err) { toast(err.message, 'err'); }
};
window.ShivaaAdmin.cbCSV = (date) => {
  const rows = [['Time', 'Head', 'Mode', 'In', 'Out', 'By']];
  document.querySelectorAll('.adm-table tbody tr').forEach(tr => {
    rows.push([...tr.children].map(td => td.textContent.trim()));
  });
  const blob = new Blob(['\uFEFF' + csvRows(rows)], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'cashbook-' + date + '.csv';
  document.body.appendChild(a); a.click(); a.remove();
};
window.ShivaaAdmin.cbPrint = (date) => {
  const w = window.open('', '_blank', 'width=820,height=1000');
  if (!w) return toast('Allow pop-ups to print', 'err');
  const cards = [...document.querySelectorAll('.cb-tile')].map(t => t.textContent.trim()).join(' · ');
  const tbl = document.querySelector('.adm-table-wrap .adm-table')?.outerHTML || '';
  w.document.write(`<!doctype html><meta charset="utf-8"><title>Cash book ${date}</title><style>body{font:13px Arial;padding:24px}h1{font-size:20px;color:#6b1020}table{width:100%;border-collapse:collapse;margin-top:14px}th,td{border:1px solid #999;padding:7px;text-align:left;font-size:12px}th{background:#f3e9d2}.sum{margin:12px 0;padding:10px;background:#faf6ec}</style>
  <h1>Shivaa Jewellers — Cash Book · ${date}</h1><div class="sum">${esc(cards)}</div>${tbl}<p style="margin-top:30px">Signature of owner: ____________________</p>`);
  w.document.close(); setTimeout(() => w.focus(), 200);
};
/* ── v59 · printable product tag / barcode labels ── */
window.ShivaaAdmin.printLabelTag = (pid) => {
  const p = window.Shivaa.state.productsCache.find(x => x.id === pid);
  if (!p) return;
  const pr = window.Shivaa.price(p).total;
  let qrTag = '';
  try { const qr = qrcode(0, 'M'); qr.addData(location.origin + '/#/product/' + p.id); qr.make(); qrTag = qr.createSvgTag({ cellSize: 3, margin: 1, scalable: true }); } catch (e) {}
  const w = window.open('', '_blank', 'width=520,height=360');
  if (!w) return toast('Allow pop-ups to print', 'err');
  const labels = Array.from({ length: 1 }).join('') + `<div class="tag">
    <div class="tag-brand">SHIVAA ✦ JEWELLERS</div><div class="tag-qr">${qrTag}</div>
    <div class="tag-name">${esc(p.name)}</div>
    <div class="tag-meta">${esc(p.purity)} ${esc(p.metal)} · ${p.weightG} g · SKU ${esc(p.sku || p.id)}</div>
    <div class="tag-price">₹${pr.toLocaleString('en-IN')}</div>
    <div class="tag-note">Price tracks the live rate · BIS hallmarked</div></div>`;
  w.document.write(`<!doctype html><meta charset="utf-8"><title>Tag ${p.sku || p.id}</title><style>
  body{font-family:Arial,sans-serif;margin:0;padding:14px}.tag{width:340px;border:2px dashed #6b1020;border-radius:12px;padding:14px;text-align:center;page-break-inside:avoid;display:inline-block;margin:6px}
  .tag-brand{font-weight:800;letter-spacing:2px;color:#6b1020;font-size:13px}.tag-qr svg{width:120px;height:120px;margin:8px auto;display:block}
  .tag-name{font-weight:700;font-size:13px;min-height:32px}.tag-meta{font-size:11px;color:#555;margin:4px 0}.tag-price{font-size:22px;font-weight:800;color:#6b1020}.tag-note{font-size:9.5px;color:#777;margin-top:5px}
  @media print{button{display:none}}</style><button onclick="window.print()" style="padding:8px 20px;margin:8px;font-size:14px;background:#6b1020;color:#fff;border:0;border-radius:8px">🖨 Print tag</button><br>${labels}`);
  w.document.close(); setTimeout(() => w.focus(), 200);
};
/* ── v59 · karigar job slip print ── */
window.ShivaaAdmin.printJobSlip = (id) => {
  const j = (window._jobCache || []).find(x => x.id === id);
  if (!j) { api('/api/admin/karigars').then(r => { window._jobCache = r.jobs; ShivaaAdmin.printJobSlip(id); }); return; }
  const w = window.open('', '_blank', 'width=760,height=960');
  if (!w) return toast('Allow pop-ups to print', 'err');
  w.document.write(`<!doctype html><meta charset="utf-8"><title>Job ${j.id}</title><style>
  body{font-family:Arial,sans-serif;padding:26px;font-size:13px}h1{color:#6b1020;font-size:20px;letter-spacing:2px}table{width:100%;border-collapse:collapse;margin-top:14px}th,td{border:1px solid #999;padding:8px;text-align:left}th{background:#f3e9d2;width:38%}.box{border:2px solid #111;padding:12px;margin:14px 0}.sig{margin-top:60px;display:flex;justify-content:space-between}.sig div{border-top:1px solid #333;width:30%;text-align:center;padding-top:6px;font-size:11px}</style>
  <h1>SHIVAA ✦ KARIGAR JOB SLIP</h1>
  <table>
  <tr><th>Job no.</th><td><b>${esc(j.id)}</b></td><th>Date</th><td>${new Date(j.createdAt).toLocaleDateString('en-IN')}</td></tr>
  <tr><th>Karigar</th><td colspan="3"><b>${esc(j.karigarName)}</b>${j.orderId ? ' · Order ' + esc(j.orderId) : ''}</td></tr>
  <tr><th>Piece</th><td colspan="3">${esc(j.itemDesc)}<br><small>${esc(j.note || '')}</small></td></tr>
  <tr><th>Purity</th><td>${esc(j.purity)}</td><th>Agreed wastage</th><td>${j.wastagePct}%</td></tr>
  <tr><th>Metal issued</th><td><b>${(j.weightOut||0).toFixed(3)} g</b></td><th>Due date</th><td>${esc(j.dueDate || '—')}</td></tr>
  <tr><th>Job charge</th><td>₹${(j.jobCharge||0).toLocaleString('en-IN')}</td><th>Advance paid</th><td>₹${(j.advance||0).toLocaleString('en-IN')}</td></tr></table>
  <div class="box">Weight returned: __________ g · Received by: __________ · QC notes: __________________________</div>
  <div class="sig"><div>Issued by</div><div>Karigar signature</div><div>Received back</div></div>
  <p style="margin-top:30px"><button onclick="window.print()" style="padding:9px 24px;background:#6b1020;color:#fff;border:0;border-radius:8px">🖨 Print</button></p>`);
  w.document.close(); setTimeout(() => w.focus(), 200);
};
/* ── v58 · packing slip & shipping label printing ── */
function admPrintDoc(o, kind) {
  if (!o) return;
  const S = (window.Shivaa.state && window.Shivaa.state.settings) || {};
  /* v142 — a guest express order ships to the address Cashfree verified, not
     the placeholder the shop created while Cashfree collected it. */
  const cf = (o.cfCheckout && o.cfCheckout.shipping) || null;
  const addr = cf
    ? { name: cf.name || cf.phone || o.userName || '', line: [cf.address_line_one, cf.address_line_two].filter(Boolean).join(', '),
        city: cf.city || '', state: cf.state || '', pincode: cf.pin_code || '', phone: cf.phone || (o.cfCheckout.phone) || '' }
    : (o.address || {});
  const addrLine = [addr.name, addr.line, addr.city, addr.state, addr.pincode].filter(Boolean).join(', ');
  const totW = (o.items || []).reduce((a, i) => a + (i.weightG || 0) * (i.qty || 1), 0).toFixed(3);
  const when = new Date(o.createdAt || Date.now()).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const css = `body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a1a;margin:0;padding:24px;font-size:13px}h1,h2,h3{margin:0}table{width:100%;border-collapse:collapse;margin-top:10px}th,td{border:1px solid #999;padding:7px 9px;text-align:left;font-size:12.5px}th{background:#f3e9d2}.hdr{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #6b1020;padding-bottom:10px}.brand{font-size:22px;font-weight:800;color:#6b1020;letter-spacing:2px}.sub{color:#555;font-size:11.5px;margin-top:3px}.box{border:2px solid #111;padding:12px;margin:14px 0}.big{font-size:30px;font-weight:800;letter-spacing:3px;font-family:'Courier New',monospace}.label-to{font-size:16px;line-height:1.5}.grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}.sig{margin-top:40px;display:flex;justify-content:space-between}.sig div{border-top:1px solid #333;padding-top:6px;width:30%;text-align:center;font-size:11px}.chk{font-size:12px}.chk li{margin:4px 0}.muted{color:#666;font-size:11px}@media print{.noprt{display:none}}`;
  let body;
  if (kind === 'label') {
    body = `<div class="hdr"><div><div class="brand">SHIVAA JEWELLERS</div><div class="sub">${escP(S.address || 'Sadar Bazaar, Jayal, Nagaur, Rajasthan')} · ${escP(S.phone || '')}</div></div>
      <div style="text-align:right"><b>INSURED PARCEL</b><div class="muted">Handle with care · jewellery</div></div></div>
      <div class="grid2">
        <div><div class="muted">FROM</div><b>Shivaa Jewellers</b><div>${escP(S.address || 'Sadar Bazaar, Jayal, Nagaur (Raj.)')}</div><div>${escP(S.phone || '')}</div></div>
        <div class="box"><div class="muted">DELIVER TO${cf ? ' · CASHFREE-VERIFIED' : ''}</div><div class="label-to"><b>${escP((addr.name || o.userName || '').toUpperCase())}</b><br>${escP(addrLine || '')}<br>📞 ${escP((cf && o.cfCheckout && o.cfCheckout.phone) || addr.phone || o.phone || '')}</div></div>
      </div>
      <div class="box" style="text-align:center"><div class="muted">${escP(o.courier || 'COURIER')} · AWB / TRACKING</div><div class="big">${escP(o.awb || 'AWAITING AWB')}</div></div>
      <div class="grid2">
        <table><tr><th>Order</th><td><b>${o.id}</b> · ${when}</td></tr>
        <tr><th>Pieces</th><td>${(o.items || []).reduce((a, i) => a + (i.qty || 1), 0)} · approx ${totW} g</td></tr>
        <tr><th>Insured value</th><td><b>₹${(o.insuredValue || o.total || 0).toLocaleString('en-IN')}</b></td></tr>
        <tr><th>e-Way bill</th><td>${escP(o.ewaybill || '—')}</td></tr></table>
        <div style="border:2px dashed #6b1020;padding:12px"><b>⚠ Valuables — tamper-evident sealed</b><ul class="chk"><li>Check seal before accepting</li><li>Do not leave with neighbours</li><li>ID may be requested at handover</li><li>Open & record video while unboxing</li></ul></div>
      </div>
      <div class="muted" style="margin-top:14px">Customer live tracking: shivaa.in/#/order/${o.id} · HUID certificate in the customer's digital locker</div>`;
  } else {
    body = `<div class="hdr"><div><div class="brand">SHIVAA JEWELLERS</div><div class="sub">${escP(S.address || 'Sadar Bazaar, Jayal, Nagaur, Rajasthan')} · ${escP(S.phone || '')}</div></div>
      <div style="text-align:right"><h2>PACKING SLIP</h2><div><b>${o.id}</b> · ${when}</div></div></div>
      <div class="box"><b>Ship to:</b> ${escP(addr.name || o.userName || '')} · ${escP(addrLine || '')} · 📞 ${escP(addr.phone || o.phone || '')}${o.dispatchNote ? '<br><b>Note:</b> ' + escP(o.dispatchNote) : ''}</div>
      <table><thead><tr><th>#</th><th>Piece</th><th>Purity</th><th class="num">Wt (g)</th><th class="num">Qty</th><th>HUID / remark</th></tr></thead><tbody>
      ${(o.items || []).map((it, n) => `<tr><td>${n + 1}</td><td><b>${escP(it.name || '')}</b>${it.size ? '<br><span class="muted">Size ' + escP(it.size) + '</span>' : ''}${it.engraving ? '<br><span class="muted">Engraved</span>' : ''}</td><td>${it.metal === 'Silver' ? '925 Ag' : escP(it.purity || '')}</td><td class="num">${(it.weightG || 0).toFixed(3)}</td><td class="num">${it.qty}</td><td>${n === 0 ? escP(o.huid || '') : ''}</td></tr>`).join('')}
      </tbody></table>
      <div class="grid2" style="margin-top:14px">
        <table><tr><th>Total pieces</th><td>${(o.items || []).reduce((a, i) => a + (i.qty || 1), 0)}</td></tr>
        <tr><th>Approx gross weight</th><td>${totW} g</td></tr>
        <tr><th>Courier / AWB</th><td>${escP(o.courier || '—')} ${escP(o.awb || '')}</td></tr>
        <tr><th>Payment</th><td>${escP(o.paymentMethod || '')} · ${escP(o.paymentStatus || '')}</td></tr></table>
        <div><ul class="chk"><li>☐ Visual QC passed</li><li>☐ HUID tag + digital certificate checked</li><li>☐ Polishing cloth / care card inside</li><li>☐ Tamper seal number photographed</li><li>☐ Insured for ₹${(o.insuredValue || o.total || 0).toLocaleString('en-IN')}</li></ul></div>
      </div>
      <div class="sig"><div>Packed by</div><div>QC checked by</div><div>Dispatched by</div></div>
      <div class="muted" style="margin-top:10px">This slip carries no price. Invoice &amp; HUID certificate are delivered digitally. Buyback: written 100% on pure metal value.</div>`;
  }
  const w = window.open('', '_blank', 'width=820,height=1000');
  if (!w) { toast('Allow pop-ups to print', 'err'); return; }
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${kind === 'label' ? 'Label' : 'Slip'} ${o.id}</title><style>${css}</style></head><body>${body}<div class="noprt" style="text-align:center;margin-top:24px"><button onclick="window.print()" style="padding:10px 26px;background:#6b1020;color:#fff;border:0;border-radius:8px;font-size:15px">🖨 Print</button></div></body></html>`);
  w.document.close();
  setTimeout(() => { try { w.focus(); } catch (e) {} }, 300);
}
function escP(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
/* v82 — CSV formula-injection guard: a customer-controlled field starting
   with = + - @ tab or CR can execute formulas when a CSV opens in Excel/Sheets.
   Quote every cell and force such values to text with a leading apostrophe. */
function csvCell(v) {
  let s = String(v == null ? '' : v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
}
function csvRows(rows) { return rows.map(r => r.map(csvCell).join(',')).join('\r\n'); }
window.ShivaaAdmin.printSlip = id => admPrintDoc((window._adminOrders || []).find(x => x.id === id), 'slip');
window.ShivaaAdmin.printLabel = id => admPrintDoc((window._adminOrders || []).find(x => x.id === id), 'label');
/* v60 — thermal receipt 58/80mm */
window.ShivaaAdmin.printReceipt = id => {
  const o = (window._adminOrders || []).find(x => x.id === id);
  if (!o) return;
  const S = (state.settings) || {};
  const paid = o.amountPaid || (o.paymentStatus === 'Paid' ? o.total : 0);
  const bal = Math.max(0, (o.total || 0) - paid);
  const w = window.open('', '_blank', 'width=380,height=700');
  w.document.write(`<!doctype html><html><head><title>Receipt ${o.id}</title><style>
    @page{size:80mm auto;margin:2mm}
    body{font-family:'Courier New',monospace;width:76mm;margin:0 auto;color:#000;font-size:11px}
    h2{text-align:center;font-size:14px;margin:2px 0}.c{text-align:center}.m{font-size:10px;color:#333}
    table{width:100%;border-collapse:collapse}td{padding:2px 0;vertical-align:top}
    .ln{border-top:1px dashed #000;margin:6px 0}.r{text-align:right}
    @media(max-width:60mm){body{width:54mm;font-size:10px}}
  </style></head><body>
  <h2>SHIVAA JEWELLERS</h2>
  <div class="c m">Sadar Bazaar, Jayal, Nagaur (Raj.)<br>+91 89050 05921 · shivaa.in<br>${S.gstin ? 'GSTIN: ' + S.gstin : ''}</div>
  <div class="ln"></div>
  <table><tr><td>Receipt</td><td class="r"><b>${o.invoiceNo || o.id}</b></td></tr>
  <tr><td>Date</td><td class="r">${new Date(o.createdAt).toLocaleString('en-IN')}</td></tr>
  <tr><td>Customer</td><td class="r">${esc(o.userName || '')}</td></tr></table>
  <div class="ln"></div>
  <table>${(o.items || []).map(it => `<tr><td>${Number(it.qty) || 0} x ${escP(it.name || '')}${it.size ? ' (' + escP(it.size) + ')' : ''}</td><td class="r">${(Number(it.unitPrice) || 0).toLocaleString('en-IN')}</td></tr>`).join('')}
  ${o.shipping ? `<tr><td>Shipping</td><td class="r">${o.shipping.toLocaleString('en-IN')}</td></tr>` : ''}
  ${o.prepaidDiscount ? `<tr><td>Prepaid discount</td><td class="r">-${o.prepaidDiscount.toLocaleString('en-IN')}</td></tr>` : ''}
  </table>
  <div class="ln"></div>
  <table><tr><td><b>TOTAL</b></td><td class="r"><b>Rs.${(o.total || 0).toLocaleString('en-IN')}</b></td></tr>
  <tr><td>Received</td><td class="r">${paid.toLocaleString('en-IN')}</td></tr>
  ${bal ? `<tr><td><b>Balance</b></td><td class="r"><b>${bal.toLocaleString('en-IN')}</b></td></tr>` : ''}</table>
  <div class="ln"></div>
  <div class="c m">BIS hallmarked · HUID on every gold piece<br>7-day return · lifetime exchange & care<br>Thank you ✦</div>
  <div class="c" style="margin-top:10px"><button onclick="window.print()" class="noprt" style="padding:6px 18px">🖨 Print</button></div>
  <script>window.onload=()=>{try{window.print()}catch(e){}}</script>
  </body></html>`);
  w.document.close();
};

function drawBarChart(cv, days) {
  if (!cv || !days.length) { if (cv) cv.parentElement.innerHTML += '<p style="color:var(--ink-3);font-size:13px">Revenue chart appears once orders come in.</p>'; return; }
  const x = cv.getContext && cv.getContext('2d');
  if (!x) return;   // no canvas 2D support (or jsdom) — the table still renders
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const w = cv.parentElement.clientWidth || 320, h = 260;
  cv.width = w * dpr; cv.height = h * dpr; cv.style.height = h + 'px'; x.setTransform(dpr, 0, 0, dpr, 0, 0);
  const pad = { l: 60, r: 10, t: 10, b: 40 };
  const max = Math.max(...days.map(d => d[1])) * 1.15 || 1;
  const bw = Math.min(48, (w - pad.l - pad.r) / days.length * 0.62);
  days.forEach((d, i) => {
    const bx = pad.l + (i + 0.5) * (w - pad.l - pad.r) / days.length;
    const bh = d[1] / max * (h - pad.t - pad.b);
    const g = x.createLinearGradient(0, h - pad.b - bh, 0, h - pad.b);
    g.addColorStop(0, '#d4af5a'); g.addColorStop(1, '#6e1e2a');
    x.fillStyle = g;
    x.beginPath(); x.roundRect(bx - bw / 2, h - pad.b - bh, bw, bh, 5); x.fill();
    x.fillStyle = '#8a7d6c'; x.font = '10px Jost'; x.textAlign = 'center';
    x.fillText(d[0].slice(5), bx, h - pad.b + 16);
  });
  x.strokeStyle = '#eee3cd'; x.fillStyle = '#8a7d6c'; x.font = '10.5px Jost'; x.textAlign = 'right';
  for (let i = 0; i <= 3; i++) {
    const val = max * i / 3, y = h - pad.b - (i / 3) * (h - pad.t - pad.b);
    x.beginPath(); x.moveTo(pad.l, y); x.lineTo(w - pad.r, y); x.stroke();
    x.fillText(val >= 100000 ? (val / 100000).toFixed(1) + 'L' : Math.round(val / 1000) + 'k', pad.l - 8, y + 4);
  }
}

/* ════════════════ PARTNER PORTAL ════════════════ */
async function renderPartner(view) {
  if (!state.user) {
    view.innerHTML = `<div style="min-height:80vh;display:flex;align-items:center;justify-content:center;padding:30px">
      <div class="adm-card" style="max-width:460px;width:100%">
        <div class="center"><img src="/images/logo.png" style="height:44px;margin:0 auto 12px"><h3 style="margin-bottom:4px">Partner Portal</h3><p style="font-size:13px;color:var(--ink-3)">For approved B2B partner jewellers</p></div>
        <form class="form-grid" style="grid-template-columns:1fr;margin-top:16px" onsubmit="ShivaaAdmin.partnerLogin(event)">
          <div class="fld"><label>Email</label><input name="email" type="email" autocomplete="username" required placeholder="you@yourfirm.in"></div>
          <div class="fld"><label>Password</label><input name="password" type="password" autocomplete="current-password" required></div>
          <button class="btn btn-primary btn-block">Sign in</button>
        </form>
        <p style="font-size:12.5px;color:var(--ink-3);margin-top:12px;text-align:center">New here? <a href="#/b2b" style="color:var(--gold)">Apply for partnership →</a></p>
      </div></div>`;
    window._partnerShell = null;   // v101 — next sign-in rebuilds the shell
    return;
  }
  // v101 — switching Bullion / Dashboard / Reports must NOT rebuild the
  // portal: the live board keeps polling, and scroll, form and deal state
  // survive. A genuine departure (other routes, logout) drops the shell
  // from the DOM, so the next visit is a fresh bullion-first build.
  const wantView = (new URLSearchParams(location.hash.split('?')[1] || '')).get('view') || 'bullion';
  if (window._partnerShell && document.body.contains(window._partnerShell) && window.ShivaaAdmin._partnerSwitch) {
    if (location.hash === '#/partner') history.replaceState(null, '', '#/partner?view=bullion');
    window.ShivaaAdmin._partnerSwitch(location.hash === '#/partner' ? 'bullion' : wantView);
    return;
  }
  let data;
  try { data = await api('/api/partners/me'); }
  catch (e) {
    // v31 — if the session died (reload wiped storage, token expired, db
    // restored), show the portal sign-in — never a bare API error.
    if (!state.user) { renderPartner(view); return; }
    view.innerHTML = `<div class="empty"><h3>${esc(e.message)}</h3><a class="btn btn-primary" href="#/b2b" style="margin-top:14px">Go to the B2B page</a></div>`;
    return;
  }
  /* v107 port (v106 hardening): a 200 response with no partner record (retail
     login opened the portal, KYC removed, db restored) must never destructure
     into a crash — show the jeweller a recoverable door instead. */
  if (!data || !data.partner) {
    view.innerHTML = `<div class="empty"><h3>Your partner record could not be loaded</h3>
      <p style="color:var(--ink-3);margin:8px 0 16px">Sign in again with the email from your KYC application, or message the B2B desk on WhatsApp +91 89050 05921.</p>
      <a class="btn btn-primary" href="#/b2b">Go to the B2B page</a></div>`;
    return;
  }
  const { partner, settlements = [] } = data;
  const sales = settlements.map(s => s.sales);
  const totals = {
    lifetime: sales.reduce((a, b) => a + b, 0),
    last: sales[sales.length - 1] || 0,
    nextPayout: settlements.find(s => s.status.includes('Processing'))?.payout || settlements[settlements.length - 1]?.payout || 0,
  };
  view.innerHTML = `
  <div class="admin-shell">
    <aside class="adm-side">
      <div class="adm-logo"><img src="/images/logo.png" alt=""><div><b style="font-family:var(--ff-disp);font-size:17px">${esc(partner?.firm || 'Partner')}</b><br><small style="font-size:10px;letter-spacing:.2em;opacity:.7">PARTNER PORTAL</small></div></div>
      <nav class="adm-nav">
        <a href="#/partner?view=bullion" class="on" data-bd-nav="bullion">&#129351; Bullion Desk</a>
        <a href="#/partner?view=dash" data-bd-nav="dash">&#9672; Dashboard</a>
        <a href="#/metal" class="nav-mtl">&#9670; Metal Investment</a>
        <a href="#/catalogues" class="nav-ds">&#10022; Design Selection</a>
        <a href="#/deadstock">&#9634; Dead Stock Purchase</a>
        <a href="#/partner?view=reports" data-bd-nav="reports">&#9646; Reports</a>
        <a href="#/" style="margin-top:14px">&larr; Storefront</a>
      </nav>
    </aside>
    <main class="adm-main">
      <div class="adm-head"><h2>Namaste, ${esc(partner?.contactPerson || partner?.firm || 'Partner')}</h2>
        <span class="src-badge src-live"><span class="live-dot"></span>Gold 22K ${fmt(state.rates?.gold22 || 0)}/g</span></div>
      <!-- ══ PRIMARY HIGHLIGHT · METAL INVESTMENT SCHEME ══ -->
      <a class="mtl-prime" href="#/metal" data-sec="dash">
        <div class="mp-glow" aria-hidden="true"></div>
        <div class="mp-dust" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div>
        <div class="mp-inner">
          <div class="mp-left">
            <span class="mp-kicker">&#9670; PARTNERS ONLY &middot; FLAGSHIP FACILITY</span>
            <h3>Metal Investment <em>Scheme</em></h3>
            <p>Your idle gold is earning nothing in the locker. Deposit it with Shivaa and earn a fixed <b>1% every month</b> &mdash; taken in metal or in cash, entirely your choice.</p>
            <div class="mp-pills">
              <span class="mp-pill mp-pill-hero"><b>1%</b> per month</span>
              <span class="mp-pill"><b>12%</b> per year</span>
              <span class="mp-pill">100% insured custody</span>
            </div>
            <span class="mp-cta">Open the investment desk <i>&rarr;</i></span>
          </div>
          <div class="mp-right">
            <div class="mp-ring" aria-hidden="true">
              <svg viewBox="0 0 120 120">
                <circle class="mpr-bg" cx="60" cy="60" r="52"></circle>
                <circle class="mpr-fg" cx="60" cy="60" r="52"></circle>
              </svg>
              <div class="mp-ring-tx"><b>12<small>%</small></b><small>a year</small></div>
            </div>
            <div class="mp-bars" aria-hidden="true">
              <i style="--h:34%;--d:0ms"></i><i style="--h:52%;--d:90ms"></i>
              <i style="--h:70%;--d:180ms"></i><i style="--h:100%;--d:270ms"></i>
            </div>
          </div>
        </div>
      </a>

      <div class="ds-hero" data-sec="dash">
        <span class="k">Your order desk</span>
        <h3>&#10022; Design Selection &amp; Billing</h3>
        <p>Browse today&rsquo;s designs, select what your counter needs, and settle in <b>fine gold grams</b> &mdash; zero making charges. This is where your orders begin.</p>
        <div class="ds-hero-row">
          <a class="btn btn-gold btn-lg" href="#/catalogues">Open Design Selection &rarr;</a>
          <span class="ds-pill">&#10022; ${state.productsCache.length}+ live designs</span>
          <span class="ds-pill">&#9878; Fine-metal settlement</span>
          <span class="ds-pill">&#8377; Zero making charges</span>
        </div>
      </div>
      <a class="ds-second" href="#/deadstock" data-sec="dash">
        <span class="dsx-ic" aria-hidden="true">&#9634;</span>
        <span class="dsx-tx">
          <b>Dead Stock Purchase &mdash; all karats &amp; silver</b>
          <small>Hand over slow-moving gold (24K&ndash;14K) or silver at one wastage; half your making charges come back as melting-loss protection.</small>
        </span>
        <span class="dsx-go" aria-hidden="true">&rarr;</span>
      </a>

      <div class="stat-grid" data-sec="dash">
        <div class="stat"><small>Lifetime sales</small><b>${fmt(totals.lifetime)}</b><span>${settlements.length} weeks</span></div>
        <div class="stat"><small>Last week sales</small><b>${fmt(totals.last)}</b><span>${settlements[settlements.length - 1]?.orders || 0} orders</span></div>
        <div class="stat"><small>Next payout</small><b>${fmt(totals.nextPayout)}</b><span>settles Friday ✓</span></div>
        <div class="stat"><small>Partner since</small><b style="font-size:22px">${partner?.joined ? new Date(partner.joined).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '—'}</b><span>${esc(partner?.city || '')}</span></div>
      </div>
      <!-- v57: the trading board lives behind its own door, never on the dashboard -->
      <a class="bullion-door" href="#/partner?view=bullion" data-sec="bullion-entry">
        <div class="bd-glow" aria-hidden="true"></div>
        <div class="bd-door-ic">🥇</div>
        <div class="bd-door-tx">
          <span class="bd-kicker">PARTNERS ONLY · LIVE BULLION DESK</span>
          <h3>We deal in <em>gold &amp; silver bullion</em></h3>
          <p>Live TDS / refined rates, spot · MCX futures · customs values, with unfix (rate-lock) on request. Tap to open the trading board.</p>
          <span class="bd-door-cta">Enter the bullion desk <i>&rarr;</i></span>
        </div>
        <div class="bd-door-rate"><span class="live-dot"></span><b id="bdDoorRate">—</b><small>22K /g · live</small></div>
      </a>

      <div class="bullion-board-wrap" data-sec="bullion">
        <!-- Pride-Gold style live board rendered by ShivaaBullion.renderBoard -->
        <div id="bullionBoard" class="bd-board"><div class="loading-spin"></div></div>
      </div>

      <div class="pco-prime aurora pco-collapsed" data-sec="dash" id="pcoPrime">
        <button type="button" class="pco-head pco-toggle" id="pcoToggle" aria-expanded="false" aria-controls="coFormWrap">
          <div><span class="pco-kicker">Signature Desk</span><h3>✦ Place Customer Order</h3>
          <p class="pco-sub-collapsed">Bespoke piece for a walk-in customer — design photo, melting &amp; advance in one form. <u>Tap to expand</u>.</p>
          <p class="pco-sub-open">Order a bespoke piece for your walk-in customer — design photo, melting &amp; advance in one privileged form.</p></div>
          <span class="pco-chevron" aria-hidden="true">▾</span>
        </button>
        <div class="pco-body" id="coFormWrap">
        <form id="coForm" class="form-grid" onsubmit="ShivaaCO.place(event)">
          <div class="fld"><label>Product name *</label><input id="coName" required placeholder="e.g. Kundan cocktail ring"></div>
          <div class="fld"><label>Weight wanted (grams) *</label><input id="coWeight" type="number" step="0.01" min="0.5" required placeholder="e.g. 6.5"></div>
          <div class="fld"><label>Melting wanted (grams)</label><input id="coMelt" type="number" step="0.01" min="0" placeholder="e.g. 0.15"></div>
          <div class="fld"><label>Advance willing to give (₹)</label><input id="coAdv" type="number" min="0" placeholder="e.g. 25000"></div>
          <div class="fld"><label>Size</label><input id="coSize" placeholder="e.g. 16 / 2.4"></div>
          <div class="fld full"><label>Note (optional)</label><input id="coNote" placeholder="delivery date, finish, reference…"></div>
          <div class="fld full">
            <label>Design image (from your phone/gallery)</label>
            <div class="drop-zone" id="coDrop" style="padding:22px">
              <div style="font-size:26px;margin-bottom:4px">📷</div>
              <b id="coDropTxt">Tap to choose design photo</b><br><small>JPG/PNG up to 8 MB</small>
              <input type="file" id="coFile" accept="image/*" hidden>
            </div>
          </div>
          <div class="pco-actions">
            <button class="btn btn-primary">Place Custom Order</button>
            <button type="button" class="btn btn-ghost" id="pcoHide">▴ Hide form</button>
          </div>
        </form>
        </div>
      </div>
      <div class="adm-card" data-sec="dash"><h3>My metal orders (design selection)</h3><div id="mxOrders"><div class="loading-spin"></div></div></div>
      <div class="grid2" data-sec="dash">
        <div class="adm-card"><h3>Stock request</h3>
          <form class="form-grid" onsubmit="ShivaaPartner.stockReq(event)">
            <div class="fld full"><label>What do you need this month?</label><textarea required placeholder="e.g. 2kg 22K chains, 15 bridal sets, silver payal 40 pairs…"></textarea></div>
            <button class="btn btn-primary btn-sm" style="grid-column:1/-1;justify-self:start">Send request</button>
          </form><p style="font-size:12px;color:var(--ink-3);margin-top:8px">Monthly stock meetings: last Saturday, 5 PM at Jayal or on call.</p></div>
        <div class="adm-card"><h3>Your manager</h3>
          <div class="benefit"><div class="bic">☎</div><div><b>Karan Soni — Executive Director</b><p>Direct line for stock, rates & settlements: <b>${esc(state.settings.phone)}</b></p></div></div>
          <div class="benefit"><div class="bic">&#10022;</div><div><b>Daily designs on WhatsApp</b><p>New designs every morning &mdash; then select and bill them in <a href="#/catalogues" style="color:var(--gold)">Design Selection</a>.</p></div></div>
        </div>
      </div>
      <!-- v101 — reports view renders in-place into this host -->
      <div id="ptReports" data-sec="reports" hidden></div>
    </main>
  </div>`;
  // ── v101 view switching: bullion is the jeweller's home EVERY open;
  // Bullion / Dashboard / Reports swap IN PLACE so the live MCX board keeps
  // ticking and scroll + form state survive every tab change ──
  const head = $('.adm-head h2');
  const headDash = 'Namaste, ' + esc(partner?.contactPerson || partner?.firm || 'Partner');
  // DIRECT children of .adm-main only — the bullion board's own tabs reuse
  // data-sec names (rates/deals/…) and must never be hidden by view switches.
  const show = sel => $$('.adm-main > [data-sec]').forEach(el => { el.style.display = sel.includes(el.dataset.sec) ? '' : 'none'; });
  let reportsBuilt = false;
  const buildReports = () => {
    if (reportsBuilt) return;
    reportsBuilt = true;
    $('#ptReports').hidden = false;
    $('#ptReports').innerHTML = `
      <div class="adm-card"><h3>&#9646; Weekly Sales</h3><canvas id="ptChart"></canvas></div>
      <div class="adm-card"><h3>Payment settlements <span style="font-size:12px;color:var(--ink-3);font-weight:400">— every Friday with the sales report</span></h3>
        <div class="adm-table-wrap"><table class="adm-table settle-table">
          <thead><tr><th>Week ending</th><th class="num">Orders</th><th class="num">Sales</th><th class="num">Payout</th><th>Status</th></tr></thead>
          <tbody>${settlements.slice().reverse().map(s => `<tr>
            <td>${s.weekEnding}</td><td class="num">${s.orders}</td>
            <td class="num"><b>${fmt(s.sales)}</b></td><td class="num">${fmt(s.payout)}</td>
            <td><span class="status-pill ${s.status === 'Paid' ? 'st-delivered' : 'st-packed'}">${esc(s.status)}</span></td>
          </tr>`).join('')}</tbody>
        </table></div></div>`;
    drawBarChart($('#ptChart'), settlements.map(s => [s.weekEnding.slice(5), s.sales]));
  };
  const switchView = vw => {
    if (vw === 'bullion')      { show(['bullion']); }
    else if (vw === 'reports') { show(['reports']); buildReports(); }
    else                       { show(['dash', 'bullion-entry']); }
    $('#ptReports').hidden = vw !== 'reports';
    $$('.adm-nav a').forEach(x => {
      const h = x.getAttribute('href');
      // #/metal and #/deadstock are their own routes — never lit from ?view=
      if (h && h.indexOf('#/partner') !== 0) { x.classList.remove('on'); return; }
      x.classList.toggle('on', h === '#/partner?view=' + vw);
    });
    head.innerHTML = vw === 'bullion'
      ? 'Bullion Desk <a href="#/partner?view=dash" class="btn btn-ghost btn-sm" style="margin-left:10px">← Dashboard</a>'
      : headDash;
    if (vw === 'bullion' && window.ShivaaBullion) ShivaaBullion.startPolling();
  };
  window.ShivaaAdmin._partnerSwitch = switchView;
  window._partnerShell = view.querySelector('.admin-shell');
  // bare "#/partner" (portal pill, fresh login) ALWAYS lands on bullion —
  // including repeat opens and new sessions.
  const barePartner = location.hash === '#/partner';
  const q = new URLSearchParams(location.hash.split('?')[1] || '');
  let vw = q.get('view') || 'bullion';
  if (barePartner) {
    vw = 'bullion';
    history.replaceState(null, '', '#/partner?view=bullion');
  }
  switchView(vw);
  if (window.ShivaaBullion) ShivaaBullion.startPolling();
  if (window.ShivaaCO) { ShivaaCO.init(); ShivaaCO.loadMine(); }
  // v101 — custom-order form stays collapsed to its title until requested
  const pco = view.querySelector('#pcoPrime');
  if (pco && !pco._wired) {
    pco._wired = true;
    const tog = pco.querySelector('#pcoToggle');
    const setOpen = open => {
      pco.classList.toggle('pco-collapsed', !open);
      pco.classList.toggle('pco-open', open);
      if (tog) tog.setAttribute('aria-expanded', open ? 'true' : 'false');
    };
    tog?.addEventListener('click', () => setOpen(pco.classList.contains('pco-collapsed')));
    pco.querySelector('#pcoHide')?.addEventListener('click', () => { setOpen(false); pco.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); });
    window.ShivaaCO._setCollapsed = () => setOpen(false);
  }
}
window.ShivaaAdmin.partnerLogin = async e => {
  e.preventDefault();
  try {
    const fd = new FormData(e.target);
    const r = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: String(fd.get('email') || '').trim(), password: String(fd.get('password') || '') }) });
    window.Shivaa.setToken(r.token); state.user = r.user;
    toast('Welcome, ' + r.user.name);
    // v101 — jewellers land on live bullion rates EVERY time they sign in
    if (location.hash === '#/partner?view=bullion') renderPartner($('#view'));
    else location.hash = '#/partner?view=bullion';
  } catch (err) { toast(err.message, 'err'); }
};
window.ShivaaPartner = {
  stockReq: async e => {
    e.preventDefault();
    try {
      await api('/api/contact', { method: 'POST', body: JSON.stringify({ name: state.user.name, phone: state.user.phone || '', message: '[STOCK REQUEST] ' + e.target[0].value }) });
      toast('Stock request sent — your manager will confirm ✦'); e.target.reset();
    } catch (err) { toast(err.message, 'err'); }
  },
};

/* ───── owner page manager ───── */
window.ShivaaPages = {
  cache: [],
  async load() {
    const el = document.getElementById('pgList'); if (!el) return;
    try {
      const admin = state.user.role === 'admin';
      let list = this.cache;
      if (admin) {
        // admin needs drafts too — fetch via list + individual is overkill; server returns published only. We keep our own cache of created ones.
      }
      el.innerHTML = list.length ? list.map(pg => `
        <div class="pg-row">
          <div><b>${esc(pg.title)}</b><small>shivaa.in/#/p/${pg.slug} · updated ${new Date(pg.updatedAt).toLocaleDateString('en-IN')}${pg.published === false ? ' · <span style="color:var(--warn)">draft</span>' : ''}</small></div>
          <div class="pg-actions">
            <a class="btn btn-ghost btn-sm" href="#/p/${pg.slug}" target="_blank">View</a>
            <button class="btn btn-outline btn-sm" onclick='ShivaaPages.edit(${JSON.stringify(pg).replace(/'/g, "&#39;")})'>Edit</button>
            <button class="btn btn-ghost btn-sm" style="color:var(--bad)" onclick="ShivaaPages.del('${pg.slug}')">Delete</button>
          </div>
        </div>`).join('') : '<p class="partner-note">No pages yet — create your first one (e.g. "Terms of Use", "Return Policy", "Our Story").</p>';
    } catch (e) { el.innerHTML = '<p class="partner-note">' + e.message + '</p>'; }
  },
  edit(pg) {
    pg = pg || { title: '', slug: '', body: '', published: true };
    openModal(`
      <h3 style="font-size:22px;margin-bottom:14px">${pg.slug ? 'Edit' : 'New'} Page</h3>
      <form class="form-grid" onsubmit="ShivaaPages.save(event,'${pg.slug || ''}')">
        <div class="fld full"><label>Page title *</label><input id="pgTitle" required value="${esc(pg.title)}" placeholder="e.g. Return & Exchange Policy"></div>
        <div class="fld full"><label>Web address (myshop.in/#/p/<b>this</b>) *</label><input id="pgSlug" required value="${esc(pg.slug)}" placeholder="e.g. return-policy" ${pg.slug ? 'readonly' : ''}></div>
        <div class="fld full"><label>Content — blank line = new paragraph, single Enter = line break (HTML is shown as text, kept safe)</label>
          <textarea id="pgBody" rows="12" style="min-height:220px" placeholder="Write your page here…">${esc(pg.body || '')}</textarea></div>
        <div class="fld full" style="display:flex;gap:10px;align-items:center"><input type="checkbox" id="pgPub" ${pg.published !== false ? 'checked' : ''} style="accent-color:var(--gold);width:17px;height:17px"><label for="pgPub" style="margin:0">Published (visible to visitors)</label></div>
        <button class="btn btn-primary btn-block">💾 Save Page</button>
      </form>`, 'lg');
  },
  async save(e, origSlug) {
    e.preventDefault();
    const body = {
      title: document.getElementById('pgTitle').value,
      slug: origSlug || document.getElementById('pgSlug').value,
      body: document.getElementById('pgBody').value,
      published: document.getElementById('pgPub').checked,
    };
    try {
      const r = origSlug
        ? await api('/api/pages/' + origSlug, { method: 'PUT', body: JSON.stringify(body) })
        : await api('/api/pages', { method: 'POST', body: JSON.stringify(body) });
      this.cache = this.cache.filter(x => x.slug !== r.slug);
      if (r.published !== false || origSlug) this.cache.push(r);
      closeModal(); toast('Page saved ✦ live at #/p/' + r.slug);
      this.load();
    } catch (err) { toast(err.message, 'err'); }
  },
  async del(slug) {
    if (!confirm('Delete this page?')) return;
    try { await api('/api/pages/' + slug, { method: 'DELETE' }); this.cache = this.cache.filter(x => x.slug !== slug); toast('Page deleted'); this.load(); }
    catch (e) { toast(e.message, 'err'); }
  },
};

/* ───── custom design orders (partner) ───── */
window.ShivaaCO = {
  file: null,
  init() {
    const drop = document.getElementById('coDrop'), input = document.getElementById('coFile');
    if (!drop || drop._wired) return; drop._wired = true;
    drop.onclick = () => input.click();
    input.onchange = () => { if (input.files[0]) { this.file = input.files[0]; document.getElementById('coDropTxt').textContent = '✓ ' + this.file.name; } };
    ['dragover', 'dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => {
      e.preventDefault();
      drop.classList.toggle('drag', ev === 'dragover');
      if (ev === 'drop' && e.dataTransfer.files[0]) { this.file = e.dataTransfer.files[0]; document.getElementById('coDropTxt').textContent = '✓ ' + this.file.name; }
    }));
  },
  async place(e) {
    e.preventDefault();
    const fd = new FormData();
    fd.append('name', document.getElementById('coName').value);
    fd.append('weight', document.getElementById('coWeight').value);
    fd.append('melting', document.getElementById('coMelt').value || 0);
    fd.append('advance', document.getElementById('coAdv').value || 0);
    fd.append('size', document.getElementById('coSize').value);
    fd.append('note', document.getElementById('coNote').value);
    if (this.file) fd.append('design', this.file);
    try {
      const res = await fetch('/api/customorder', { method: 'POST', headers: token() ? { Authorization: 'Bearer ' + token() } : {}, body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      toast('Custom order ' + data.id + ' placed ✦');
      e.target.reset(); this.file = null; document.getElementById('coDropTxt').textContent = 'Tap to choose design photo';
      if (typeof this._setCollapsed === 'function') this._setCollapsed();   // v101 re-collapse on success
      this.loadMine();
    } catch (err) { toast(err.message, 'err'); }
  },
  async loadMine() {
    const el = document.getElementById('mxOrders'); if (!el) return;
    try {
      const [mx, co] = await Promise.all([api('/api/metalexchange/orders'), api('/api/customorder')]);
      el.innerHTML =
        (mx.orders.length ? `<div class="adm-table-wrap"><table class="adm-table"><thead><tr><th>ID</th><th>Designs</th><th class="num">Weight</th><th class="num">Fine @99.50</th><th>MC</th><th>Status</th></tr></thead><tbody>${mx.orders.map(o => `<tr><td><b>${esc(o.id)}</b><br><small style="color:var(--ink-3)">${new Date(o.createdAt).toLocaleDateString('en-IN')}</small></td><td>${o.items.length}</td><td class="num">${Number(o.totalWeightG) || 0} g</td><td class="num"><b>${Number(o.fineGrams) || 0} g</b></td><td>₹0</td><td>${esc(o.status || '')}</td></tr>`).join('')}</tbody></table></div>` : '<p class="partner-note">No metal orders — select designs from Catalogues → Design Selection.</p>')
        + (co.orders.length ? `<div class="sec-title" style="margin-top:16px">Custom orders</div><div class="adm-table-wrap"><table class="adm-table"><thead><tr><th>ID</th><th>Design</th><th class="num">Weight</th><th class="num">Advance</th><th>Size</th><th>Status</th></tr></thead><tbody>${co.orders.map(o => `<tr><td><b>${esc(o.id)}</b></td><td>${esc(o.name)}${o.designImg ? ` <a href="${safeUrl(o.designImg)}" target="_blank" rel="noopener">🖼</a>` : ''}</td><td class="num">${Number(o.weightG) || 0} g</td><td class="num">${o.advance ? fmt(o.advance) : '—'}</td><td>${esc(o.size || '—')}</td><td>${esc(o.status || '')}</td></tr>`).join('')}</tbody></table></div>` : '');
    } catch (e) { el.innerHTML = '<p class="partner-note">' + esc(e.message || 'Could not load') + '</p>'; }
  },
};

/* ─────────────────────────────────────────────
   BULLION mini-app (partner portal + admin)
   ───────────────────────────────────────────── */
window.ShivaaBullion = {
  B: null,
  section: 'rates',
  chartSeries: 'liveG',
  liveBuf: null,
  lastSeen: null,
  async refresh(/* silent */) {
    try {
      const B = await window.Shivaa.api('/api/bullion');
      const first = !this.B;
      const board = document.getElementById('bullionBoard');
      const mounted = this.mounted && board && board.querySelector('.bd-tabs');
      this.B = B;
      /* v102 — keep the last good board so the desk opens on flaky mobile
         networks showing saved rates with an OFFLINE flag instead of an error */
      try { localStorage.setItem('shv_bullion_last', JSON.stringify({ B, at: Date.now() })); } catch (e) {}
      if (!first && B.updatedAt !== this.lastSeen && mounted) {
        window.Shivaa.toast('📈 Bullion rates updated — fresh prices on screen');
      }
      this.lastSeen = B.updatedAt;
      if (!mounted) { this.mounted = true; this.render(B); }
      else if (this.section === 'rates' || this.section === 'history' || this.section === 'alerts') {
        this.renderSection();   // live repaint without resetting the tab
      }
      this.startTick();   // no-ops while the 1 s loop is already alive; revives after navigation
      this.startRelay(this.B);
      const reached = (B.alerts || []).filter(a => a.reached && !a._pinged);
      if (!first && reached.length) { reached.forEach(a => a._pinged = true); window.Shivaa.toast('🔔 ' + reached[0].label + ' hit your target ' + this.num(reached[0].target)); }
    } catch (e) {
      /* v102 — offline fallback: paint the last saved board, clearly flagged */
      const el = document.getElementById('bullionBoard');
      let snap = null;
      try { snap = JSON.parse(localStorage.getItem('shv_bullion_last') || 'null'); } catch (err) {}
      if (el && !this.mounted && snap && snap.B) {
        this.B = snap.B; this.mounted = true; this.render(snap.B);
        const ago = Math.max(0, Math.round((Date.now() - snap.at) / 1000));
        const when = new Date(snap.at).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' });
        this.setTickState('offline · saved rates from ' + when + ' (' + (ago < 60 ? ago + 's ago' : Math.round(ago / 60) + 'm ago') + ') — reconnecting…', false);
      } else if (el && !this.mounted) {
        el.innerHTML = '<p class="partner-note">' + (e.message || 'Could not load the bullion desk') + '<br><small>Pull to retry once your connection is back.</small></p>';
      }
    }
  },
  render(B) {
    const el = document.getElementById('bullionBoard');
    if (!el) return;
    this.renderShell(B);
    this.renderSection();
  },
  num(v) { return (Math.round(v) || 0).toLocaleString('en-IN'); },
  dash(v) { return v ? this.num(v) : '--'; },
  /* v79 — Pride-style bracket: plain [382] / [--], no percent clutter */
  chgBracket(c) {
    const disp = Math.round(c || 0);
    if (!disp) return '<span class="bd-flat">[--]</span>';
    const cls = disp > 0 ? 'bd-up' : 'bd-down';
    return `<span class="${cls}">[${Math.abs(disp).toLocaleString('en-IN')}]</span>`;
  },
  chgTxt(c, nowDisp) { return this.chgBracket(c); },
  /* v61 — Laxmi-style summary hero for the two headline rates */
  summaryHTML(B) {
    /* v64 — headline the physical 9999 refined-bar RTGS rate when the desk has it */
    const g = B.rows.find(r => r.key === 'tdsGold9999') || B.rows.find(r => r.key === 'tdsGold995');
    const gName = g && g.key === 'tdsGold9999' ? 'GOLD 9999 RTGS' : 'GOLD 995 TDS';
    const s = B.rows.find(r => r.key === 'silverChorsa');
    const cell = (dot, name, unit, buy, sell, chg, cls) => {
      const pct = chg ? (Math.abs(chg) / Math.max(1, buy - chg) * 100) : 0;
      const up = chg >= 0;
      const tag = cls === 'gold' ? 'g' : 's';
      return `<div class="bd-sum ${cls}">
        <div class="bd-sum-h"><i style="background:${dot}"></i>${name} <small>per ${unit}</small></div>
        <div class="bd-sum-buy" data-sum="${tag}Buy">${buy ? this.num(buy) : '--'}</div>
        <div class="bd-sum-b"><span>SELL <b data-sum="${tag}Sell">${sell ? this.num(sell) : '--'}</b></span>
          <em class="${up ? 'bd-hitxt' : 'bd-lowtxt'}" data-sum="${tag}Arrow">${up ? '▲' : '▼'} ${pct ? pct.toFixed(2) + '%' : '—'}</em></div>
      </div>`;
    };
    const sc = 10, ss = 1000;
    return `<div class="bd-summary">
      ${cell('#e9c77a', gName, '10 g', g ? Math.round(g.buy * sc) : 0, g ? Math.round(g.sell * sc) : 0, g ? g.change * sc : 0, 'gold')}
      ${cell('#d9d9d9', 'SILVER CHORSA', 'kg', s ? Math.round(s.buy * ss) : 0, s ? Math.round(s.sell * ss) : 0, s ? s.change * ss : 0, 'silver')}
    </div>`;
  },
  karatHTML(B) {
    const k = (B.board && B.board.karat) || {};
    const box = (t, v, tag) => `<div class="bd-kar"><small>${t}</small><b data-kar="${tag}">${v ? this.num(v) : '--'}</b></div>`;
    return `<div class="bd-karstrip">
      ${box('24K · 999 /10g', k.k24, 'k24')}${box('22K · 916 /10g', k.k22, 'k22')}${box('20K · 833 /10g', k.k20, 'k20')}${box('18K · 750 /10g', k.k18, 'k18')}${box('Silver /kg', k.silverKg, 'silverKg')}
    </div>`;
  },
  intlHTML(B) {
    const i = (B.board && B.board.intl) || {};
    const it = (t, v, sub) => `<div class="bd-intl-it"><small>${t}</small><b>${v || v === 0 ? v : '--'}</b>${sub ? '<em>' + sub + '</em>' : ''}</div>`;
    return `<div class="bd-intl">
      ${it('GOLD $/oz', i.xauUsd ? '$' + Number(i.xauUsd).toLocaleString('en-US') : '', 'LBMA spot')}
      ${it('GOLD $/g', i.xauUsdPerG ? '$' + i.xauUsdPerG : '', '')}
      ${it('SILVER $/oz', i.xagUsd ? '$' + Number(i.xagUsd).toLocaleString('en-US') : '', 'LBMA spot')}
      ${it('USD/INR', i.inr ? '₹' + i.inr : '', 'RBI ref')}
    </div>`;
  },
  isSil(r) { return /sil|silver/i.test(r.label || r); },
  sc(r) { return this.isSil(r) ? 1000 : 10; },

  /* ───────── shell: top bar, marquee, section host, bottom nav ───────── */
  renderShell(B) {
    const el = document.getElementById('bullionBoard');
    const bd = B.board || {};
    const ticker = bd.ticker || '✦ Unfix (rate-lock) facility available on gold & silver ✦';
    const feedBadge = bd.feedSource === 'live-mcx' && bd.mcx
      ? `<span class="bd-feed bd-feed-mcx" id="bdFeedBadge" data-gsym="${esc(bd.mcx.goldSymbol || 'GOLD')}" data-ssym="${esc(bd.mcx.silverSymbol || 'SILVER')}" title="Official MCX futures via Angel One SmartAPI — ${esc(bd.mcx.goldSymbol || 'GOLD')} / ${esc(bd.mcx.silverSymbol || 'SILVER')}${bd.mcx.autoTokens ? ' (near-month auto-selected)' : ''}">📡 <span data-badge="txt">${/^GOLD/i.test(bd.mcx.goldSymbol || '') ? esc(String(bd.mcx.goldSymbol).replace(/^GOLD/i, 'GOLD ')) : 'MCX'} LIVE · ₹${Number(bd.mcx.goldLtp).toLocaleString('en-IN')}/10g · ₹${Number(bd.mcx.silverLtp).toLocaleString('en-IN')}/kg</span></span>`
      : `<span class="bd-feed" title="International LBMA spot × USD/INR">🌐 SPOT FX</span>`;
    /* v79 — 5-slot Pride-style nav (Liverate · Deals · center refresh ·
       History · Menu); alerts & news now live inside Menu */
    const alertCnt = (B.alerts || []).length;
    const navOn = (...ids) => ids.includes(this.section) ? 'on' : '';
    el.innerHTML = `
      <div class="bd-topbar bd-topbar-v79">
        <img src="/images/logo.png" alt="Shivaa">
        <b class="bd-brand">SHIVAA BULLION DESK</b>
        <span class="bd-live v79"><span class="live-dot" data-heart></span><span data-clock-state>LIVE</span>
          <b data-clock>${esc(B.date || '')} ${bd.time || ''}</b></span>
        <small class="bd-tickstate" data-tickstate>connecting…</small>
        ${feedBadge}
      </div>
      <div class="bd-marquee"><div class="bd-marq-in">★ ${esc(ticker)} &nbsp;&nbsp;&nbsp;★ ${esc(ticker)} &nbsp;&nbsp;&nbsp;★ ${esc(ticker)} </div></div>
      <div id="bdSection" class="bd-section"></div>
      <a class="bd-call-fab" href="${window.Shivaa.waLink('Namaste Shivaa bullion desk ✦ I want an unfix / firm quote.')}" target="_blank" rel="noopener" title="Call the bullion desk">📞</a>
      <nav class="bd-tabs bd-tabs-v79">
        <a href="#" data-sec="rates" class="${navOn('rates')}"><i class="bd-ic">📈</i><span>Liverate</span></a>
        <a href="#" data-sec="deals" class="${navOn('deals')}"><i class="bd-ic">🤝</i><span>Deals</span></a>
        <button type="button" class="bd-centerbtn" id="bdCenterBtn" title="Refresh rates" aria-label="Refresh rates">▾</button>
        <a href="#" data-sec="history" class="${navOn('history')}"><i class="bd-ic">🕘</i><span>History</span></a>
        <a href="#" data-sec="menu" class="${navOn('menu', 'alerts', 'news')}"><i class="bd-ic">▦</i><span>Menu${alertCnt ? `<em class="bd-navcnt">${alertCnt}</em>` : ''}</span></a>
      </nav>`;
    el.querySelectorAll('.bd-tabs a').forEach(a => a.onclick = e => {
      e.preventDefault();
      this.section = a.dataset.sec;
      this.renderShell(B); this.renderSection();
      document.getElementById('bullionBoard')?.scrollIntoView({ block: 'start' });
    });
    const center = document.getElementById('bdCenterBtn');
    if (center) center.onclick = () => {
      center.classList.add('spin'); setTimeout(() => center.classList.remove('spin'), 700);
      this.refresh(true);
      window.Shivaa.toast('✦ Rates refreshed');
    };
  },

  /* ───────── sparkline (pure SVG, no libraries) ───────── */
  sparkline(seriesKey, height = 132) {
    const ch = (this.B && this.B.chart) || null;
    const vals = ch && ch[seriesKey] ? ch[seriesKey] : [];
    if (vals.length < 2) return '<div class="bd-chart-empty">Chart builds as live ticks arrive…</div>';
    const w = 640, h = height, pad = 8;
    const min = Math.min(...vals), max = Math.max(...vals);
    const span = (max - min) || 1;
    const x = i => pad + (i / (vals.length - 1)) * (w - pad * 2);
    const y = v => h - pad - ((v - min) / span) * (h - pad * 2);
    const pts = vals.map((v, i) => x(i).toFixed(1) + ',' + y(v).toFixed(1));
    const line = pts.join(' ');
    const area = `${pad},${h - pad} ${line} ${x(vals.length - 1).toFixed(1)},${h - pad}`;
    const last = vals[vals.length - 1], first = vals[0];
    const up = last >= first;
    const hi = vals.indexOf(max), lo = vals.indexOf(min);
    return `<svg class="bd-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img">
      <defs><linearGradient id="bdg" x0="0" y0="0" x1="0" y1="1">
        <stop offset="0%" stop-color="${up ? '#39d98a' : '#ff6b6b'}" stop-opacity=".35"/>
        <stop offset="100%" stop-color="${up ? '#39d98a' : '#ff6b6b'}" stop-opacity="0"/>
      </linearGradient></defs>
      <polygon points="${area}" fill="url(#bdg)"/>
      <polyline points="${line}" fill="none" stroke="${up ? '#39d98a' : '#ff6b6b'}" stroke-width="2.2" vector-effect="non-scaling-stroke"/>
      <circle cx="${x(hi)}" cy="${y(max)}" r="3.2" fill="#39d98a" vector-effect="non-scaling-stroke"/>
      <circle cx="${x(lo)}" cy="${y(min)}" r="3.2" fill="#ff6b6b" vector-effect="non-scaling-stroke"/>
      <circle cx="${x(vals.length - 1)}" cy="${y(last)}" r="3.4" fill="#f3d27a" vector-effect="non-scaling-stroke"/>
    </svg>
    <div class="bd-chart-lims"><span class="bd-hitxt">H ${this.num(max)}</span><span class="bd-lowtxt">L ${this.num(min)}</span><span class="${up ? 'bd-hitxt' : 'bd-lowtxt'}">${up ? '▲' : '▼'} ${this.num(Math.abs(last - first))}</span></div>`;
  },

  /* v74–v77 — repaint the international spot cards from the ~1 s live spot tick (polled every 800 ms) */
  applySpotTick(sp, B) {
    if (this.section !== 'rates') return;
    const flashTxt = (sel, txt, numeric) => {
      const el = document.querySelector(sel);
      if (!el || el.textContent === txt) return;
      const oldN = parseFloat(String(el.textContent).replace(/[^0-9.\-]/g, ''));
      const newN = parseFloat(String(txt).replace(/[^0-9.\-]/g, ''));
      el.textContent = txt;
      if (numeric && isFinite(oldN) && isFinite(newN) && newN !== oldN) {
        el.classList.remove('bd-flash-up', 'bd-flash-down');
        void el.offsetWidth;
        el.classList.add(newN > oldN ? 'bd-flash-up' : 'bd-flash-down');
        setTimeout(() => el.classList.remove('bd-flash-up', 'bd-flash-down'), 600);
      }
    };
    const usdFmt = (v, d) => v ? Number(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }) : '--';
    const inrFmt = v => v ? Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '--';
    const chip = p => (!p && p !== 0) ? '' : `<em class="bd-pctchip ${p >= 0 ? 'bd-hitxt' : 'bd-lowtxt'}">${p >= 0 ? '▲' : '▼'} ${Math.abs(p).toFixed(2)}%</em>`;
    const leg = (tag, l, d, fmt) => {
      if (!l || !(l.price > 0)) return;
      flashTxt(`[data-spot="${tag}V"]`, fmt(l.price, d));
      flashTxt(`[data-spot="${tag}Lo"]`, l.low > 0 ? fmt(l.low, d) : '--');
      flashTxt(`[data-spot="${tag}Hi"]`, l.high > 0 ? fmt(l.high, d) : '--');
      const pc = document.querySelector(`[data-spot="${tag}Pct"]`);
      if (pc) pc.innerHTML = ' ' + (chip(l.pct));
      const sr = document.querySelector(`[data-spot="${tag}Src"]`);
      if (sr && l.src) sr.textContent = l.src + ' · live';
    };
    leg('g', sp.gold, 2, usdFmt);
    leg('s', sp.silver, 2, usdFmt);
    leg('i', sp.inr, 2, v => inrFmt(v));
    if (sp.ratio) { const r = document.querySelector('[data-ratio]'); if (r) r.textContent = Number(sp.ratio).toFixed(1); }
    const xp = document.querySelector('[data-xauperg]'), spg = document.querySelector('[data-xagperg]');
    if (xp && sp.gold && sp.gold.price > 0) xp.textContent = '$' + (sp.gold.price / 31.1034768).toFixed(2);
    if (spg && sp.silver && sp.silver.price > 0) spg.textContent = '$' + (sp.silver.price / 31.1034768).toFixed(2);
    /* v75 — customs duty cards track the live dollars + FX in real time */
    if (B?.board?.duty && sp.gold?.price > 0 && sp.inr?.price > 0) {
      const OZ = 31.1034768, inrFmt2 = v => Math.round(v).toLocaleString('en-IN');
      const gParity = sp.gold.price * sp.inr.price / OZ * 100;
      const sParity = sp.silver.price * sp.inr.price / OZ * 1000;
      const gm = +(B.board.duty.goldMult || 1.553), sm = +(B.board.duty.silverMult || 1.62);
      flashTxt('[data-duty="gV"]', inrFmt2(gParity * gm), true);
      flashTxt('[data-duty="gP"]', inrFmt2(gParity), true);
      flashTxt('[data-duty="sV"]', inrFmt2(sParity * sm), true);
      flashTxt('[data-duty="sP"]', inrFmt2(sParity), true);
      /* v90 — keep the import-parity basis chips moving with $ spot + FX */
      const basis = (tag, ltp, usd) => {
        const el = document.querySelector(`[data-basis="${tag}"]`);
        if (!el || !(ltp > 0) || !(usd > 0)) return;
        const parity = tag === 'g' ? usd * sp.inr.price / OZ * 10 : usd * sp.inr.price / OZ * 1000;
        if (!(parity > 0)) return;
        const b = (ltp / parity - 1) * 100;
        el.textContent = 'vs import parity ' + (b >= 0 ? '+' : '') + b.toFixed(2) + '%';
        el.classList.toggle('bd-basis-hi', b >= 0);
      };
      basis('g', B?.board?.future?.gold?.ltp, sp.gold?.price);
      basis('s', B?.board?.future?.silver?.ltp, sp.silver?.price);
    }
    if (B) {
      B.board.spot = Object.assign(B.board.spot || {}, {
        goldUsd: sp.gold?.price || 0, silverUsd: sp.silver?.price || 0, inr: sp.inr?.price || 0,
        goldUsdLow: sp.gold?.low || 0, goldUsdHigh: sp.gold?.high || 0,
        silverUsdLow: sp.silver?.low || 0, silverUsdHigh: sp.silver?.high || 0,
        inrLow: sp.inr?.low || 0, inrHigh: sp.inr?.high || 0,
        goldUsdPct: sp.gold?.pct || 0, silverUsdPct: sp.silver?.pct || 0, inrPct: sp.inr?.pct || 0,
        ratio: sp.ratio || 0,
        goldSrc: sp.gold?.src || '', silverSrc: sp.silver?.src || '', inrSrc: sp.inr?.src || '',
      });
    }
  },

  /* v72 — live per-second tick chart from the in-memory tick buffer */
  seedLiveBuf() {
    if (this.liveBuf || !this.B) return;
    const f = (this.B.board && this.B.board.future) || {};
    const g = f.gold && (f.gold.ltp || f.gold.bid), s = f.silver && (f.silver.ltp || f.silver.bid);
    this.liveBuf = { g: g ? Array(24).fill(g) : [], s: s ? Array(24).fill(s) : [] };
  },
  liveSpark(metal, height = 132) {
    this.seedLiveBuf();
    const vals = (this.liveBuf && this.liveBuf[metal]) || [];
    if (vals.length < 2) return '<div class="bd-chart-empty">Live tick chart builds within seconds…</div>';
    const w = 640, h = height, pad = 8;
    const min = Math.min(...vals), max = Math.max(...vals);
    const span = (max - min) || Math.max(1, max * 0.0005);
    const x = i => pad + (i / (vals.length - 1)) * (w - pad * 2);
    const y = v => h - pad - ((v - min) / span) * (h - pad * 2);
    const pts = vals.map((v, i) => x(i).toFixed(1) + ',' + y(v).toFixed(1));
    const area = `${pad},${h - pad} ${pts.join(' ')} ${x(vals.length - 1).toFixed(1)},${h - pad}`;
    const last = vals[vals.length - 1], first = vals[0];
    const up = last >= first;
    return `<svg class="bd-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img">
      <defs><linearGradient id="bdgl" x0="0" y0="0" x1="0" y1="1">
        <stop offset="0%" stop-color="${up ? '#39d98a' : '#ff6b6b'}" stop-opacity=".35"/>
        <stop offset="100%" stop-color="${up ? '#39d98a' : '#ff6b6b'}" stop-opacity="0"/>
      </linearGradient></defs>
      <polygon points="${area}" fill="url(#bdgl)"/>
      <polyline points="${pts.join(' ')}" fill="none" stroke="${up ? '#39d98a' : '#ff6b6b'}" stroke-width="2.2" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
      <circle cx="${x(vals.length - 1)}" cy="${y(last)}" r="3.6" fill="#f3d27a" vector-effect="non-scaling-stroke"/>
    </svg>
    <div class="bd-chart-lims"><span class="bd-lowtxt">L ${this.num(min)}</span><span class="bd-hitxt">H ${this.num(max)}</span><span class="${up ? 'bd-hitxt' : 'bd-lowtxt'}">${up ? '▲' : '▼'} ${this.num(Math.abs(last - first))}</span><span class="bd-live-tag">● 1 s</span></div>`;
  },

  /* ───────── sections ───────── */
  renderSection() {
    const host = document.getElementById('bdSection');
    if (!host) return;
    ({ rates: this.secRates, deals: this.secDeals, history: this.secHistory, alerts: this.secAlerts, news: this.secNews, menu: this.secMenu }[this.section] || this.secRates).call(this, host);
  },

  secNews(host) {
    const news = (this.B && this.B.news) || [];
    const dot = c => ({ Gold: '#e9c77a', Silver: '#d9d9d9', FX: '#9ec9ff' }[c] || '#e9c77a');
    host.innerHTML = `<h4 class="bd-sech">Bullion market news</h4>
      <p class="partner-note">Live bullion/MCX headlines, refreshed every 45 minutes from market feeds. Tap any headline for the full story.</p>
      ${news.length ? news.map(n => `<a class="bd-news" href="${safeUrl(n.url)}" target="_blank" rel="noopener">
        <span class="bd-news-dot" style="background:${dot(n.cat)}"></span>
        <div><b>${esc(n.title)}</b><small>${esc(n.source || '')}${n.ago ? ' · ' + esc(n.ago) : ''} · ${esc(n.cat || '')}</small></div>
        <span>›</span></a>`).join('') : '<p class="partner-note">Headlines are loading on the next poll…</p>'}
      <div class="bd-deal-acts" style="margin-top:12px">
        <a class="btn btn-outline btn-sm" target="_blank" rel="noopener" href="https://www.mcxindia.com/market-data/spot-market-price">MCX spot data ↗</a>
        <a class="btn btn-outline btn-sm" target="_blank" rel="noopener" href="https://ibja.in/">IBJA daily rates ↗</a>
        <a class="btn btn-outline btn-sm" target="_blank" rel="noopener" href="https://www.rbi.org.in/scripts/ReferenceRateArchive.aspx">RBI USD/INR ↗</a>
      </div>`;
  },

  secMenu(host) {
    const B = this.B || {};
    const alertCnt = (B.alerts || []).length;
    const item = (ic, label, sub, act, badge) => `<button type="button" class="bd-menu-it" onclick='${act}'>
      <i class="bd-menu-ic">${ic}</i><span><b>${label}${badge ? `<em class="bd-navcnt">${badge}</em>` : ''}</b><small>${sub}</small></span><i class="bd-menu-go">›</i></button>`;
    const wa = window.Shivaa.waLink('Namaste Shivaa bullion desk ✦ I want an unfix / firm quote.');
    host.innerHTML = `<h4 class="bd-sech">Menu</h4><div class="bd-menu">
      ${item('🔔', 'Rate alerts', 'Ping when a quote crosses your target', "ShivaaBullion.menuGo('alerts')", alertCnt)}
      ${item('🔒', 'Request UNFIX', 'Rate-lock for a planned purchase', "ShivaaBullion.alertForm({kind:'unfix'})")}
      ${item('📰', 'Bullion news', 'Live MCX / bullion headlines', "ShivaaBullion.menuGo('news')")}
      ${item('📞', 'Call &amp; book', 'Talk to the Shivaa bullion desk', "window.open('tel:+918905005921','_self')")}
      ${item('💬', 'WhatsApp desk', 'Confirm deals and unfix on WhatsApp', `window.open(${JSON.stringify(wa)},'_blank','noopener')`)}
      ${item('◈', 'Partner dashboard', 'Back to your partner portal', "location.hash='#/partner?view=dash'")}
    </div>
    <p class="bd-note" style="text-align:center">Official MCX push via Angel SmartAPI, international spot in USD. Rates per <b>10 g</b> gold / <b>kg</b> silver. If the push relay is ever offline the board falls back to polling automatically.</p>`;
  },
  menuGo(sec) { this.section = sec; this.renderShell(this.B); this.renderSection(); },

  /* v79 — Pride-style simple live board: plain white quotes, L (red) /
     H (green), bracketed T-change, spot strip, future strip, duty strip.
     All live data hooks (data-pill / data-lo / data-hi / data-chg /
     data-fut / data-spot / data-duty) are preserved for push ticks. */
  secRates(host) {
    const B = this.B, bd = B.board || {};
    const isSil = r => this.isSil(r);
    const sc = r => this.sc(r);
    const numCell = (r, side) => {
      const raw = r[side], v = raw ? Math.round(raw * sc(r)) : 0;
      const fk = r.key + '-' + side;
      let flash = '';
      if (this.prevVals && this.prevVals[fk] != null && v && this.prevVals[fk] !== v) flash = v > this.prevVals[fk] ? ' bd-flash-up' : ' bd-flash-down';
      if (this.prevVals || (this.prevVals = {})) this.prevVals[fk] = v;
      const quote = JSON.stringify({ key: r.key, label: r.label, mode: r.mode, side, rate: raw, purity: r.purity });
      const bandSide = side === 'buy' ? 'lo' : 'hi';
      const band = v ? (side === 'buy' ? r.low : r.high) : 0;
      const bandTxt = band ? this.num(Math.round(band * sc(r))) : '--';
      return `<div class="bd-cell">
        <button class="bd-num${flash}" data-pill="${r.key}:${side}" ${v ? `onclick='ShivaaBullion.orderForm(${quote})'` : 'disabled'}>${v ? this.num(v) : '--'}</button>
        <small class="bd-band ${side === 'buy' ? 'bd-lowtxt' : 'bd-hitxt'}">${side === 'buy' ? 'L' : 'H'} : <span data-${bandSide}="${r.key}">${bandTxt}</span></small>
      </div>`;
    };
    /* Pride layout order; 9999 stays an optional Shivaa row right under 995 */
    const order = ['tdsGold995', 'tdsGold9999', 'silverChorsa', 'silverPeti', 'goldIndian',
      'goldRef9930', 'silverKachcha', 'silverPetiBulk', 'silverGrn999', 'goldImport995'];
    const rows = B.rows.slice().sort((a, b) => {
      const ia = order.indexOf(a.key), ib = order.indexOf(b.key);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    }).map(r => `
      <div class="bd-row ${r.mode.toLowerCase()}">
        <div class="bd-desc">
          <b>${esc(r.label)}</b>
          <small>${esc(r.purity)}${r.mode === 'CASH' ? ' <em class="bd-nfp">(NFP)</em>' : ''}</small>
          <em class="bd-time">Time: ${esc(bd.time || '')}</em>
        </div>
        ${numCell(r, 'buy')}
        ${numCell(r, 'sell')}
        <div class="bd-chg" data-chg="${r.key}">${this.chgBracket(r.mode === 'CASH' ? 0 : (r.change || 0) * sc(r))}</div>
      </div>`).join('');
    const spot = bd.spot || {}, fut = bd.future || {}, duty = bd.duty || {};
    const usd = (v, d = 2) => v ? Number(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }) : '--';
    const fx = (v, d = 2) => v ? Number(v).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d }) : '--';
    const spotCard = (tag, title, val, lo, hi, fmt) => `<div class="bd-card bd-pcard">
      <div class="bd-pcard-h">${title}</div>
      <b class="bd-pcard-v" data-spot="${tag}V">${fmt(val)}</b>
      <div class="bd-pcard-lh"><span class="bd-lowtxt" data-spot="${tag}Lo">${lo ? fmt(lo) : '--'}</span><i>|</i><span class="bd-hitxt" data-spot="${tag}Hi">${hi ? fmt(hi) : '--'}</span></div>
    </div>`;
    const futCard = (tag, title, f, lo, hi, unit) => `<div class="bd-card bd-pcard">
      <div class="bd-pcard-h">${title}<em class="bd-basis" data-basis="${tag}">—</em></div>
      <div class="bd-fba">
        <div><small>BID</small><b data-fut="${tag}Bid">${this.dash(f && f.bid)}</b></div>
        <div><small>ASK</small><b data-fut="${tag}Ask">${this.dash(f && f.ask)}</b></div>
      </div>
      <div class="bd-pcard-lh"><span class="bd-lowtxt" data-fut="${tag}Lo">L : ${this.num(lo)}</span><i>|</i><span class="bd-hitxt" data-fut="${tag}Hi">H : ${this.num(hi)}</span></div>
      <small class="bd-futunit">${unit}</small>
    </div>`;
    /* v90 — import-parity basis: MCX future premium over landed $ spot parity
       (gold: ₹/10 g, silver: ₹/kg). The desk can see domestic strength vs the
       world price at a glance; it ticks live with the spot feed. */
    const OZ = 31.1034768;
    const paintBasis = (tag, ltp, spotGold, spotSil, fx) => {
      const el = host.querySelector(`[data-basis="${tag}"]`);
      if (!el || !(ltp > 0)) return;
      const dParity = tag === 'g' ? ((duty.goldParity || 0) / 10) : (duty.silverParity || 0);
      const parity = (fx > 0 && ((tag === 'g' && spotGold > 0) || (tag === 's' && spotSil > 0)))
        ? (tag === 'g' ? spotGold * fx / OZ * 10 : spotSil * fx / OZ * 1000)
        : dParity;   // before the live $ tick arrives, use the server's customs parity
      if (!(parity > 0)) { el.textContent = 'parity —'; return; }
      const b = (ltp / parity - 1) * 100;
      el.textContent = 'vs import parity ' + (b >= 0 ? '+' : '') + b.toFixed(2) + '%';
      el.classList.toggle('bd-basis-hi', b >= 0);
    };
    const dutyCard = (tag, title, unit) => `<div class="bd-card bd-pcard">
      <div class="bd-pcard-h">${title}</div>
      <b class="bd-duty-v" data-duty="${tag}V">${this.num((duty || {})[tag === 'g' ? 'gold' : 'silver'])}</b>
      <small class="bd-futunit">${unit}</small>
    </div>`;
    host.innerHTML = `
      ${this.summaryHTML(B)}
      ${this.karatHTML(B)}
      <div class="bd-gridhead">
        <span>DESCRIPTION</span><span>BUY</span><span>SELL</span><span>T-CHANGE</span>
      </div>
      <div class="bd-rows">${rows}</div>
      <div class="bd-pgrid bd-pgrid-3">
        ${spotCard('g', 'GOLD SPOT', spot.goldUsd, spot.goldUsdLow, spot.goldUsdHigh, v => usd(v, 2))}
        ${spotCard('s', 'SILVER SPOT', spot.silverUsd, spot.silverUsdLow, spot.silverUsdHigh, v => usd(v, 2))}
        ${spotCard('i', 'INR SPOT', spot.inr, spot.inrLow, spot.inrHigh, v => fx(v))}
      </div>
      <div class="bd-pgrid bd-pgrid-2">
        ${futCard('g', 'GOLD FUTURE', fut.gold, fut.goldLow, fut.goldHigh, '/10 g · MCX')}
        ${futCard('s', 'SILVER FUTURE', fut.silver, fut.silverLow, fut.silverHigh, '/kg · MCX')}
      </div>
      <div class="bd-pgrid bd-pgrid-2">
        ${dutyCard('g', 'GOLD CUSTOM DUTY', 'landed ₹/100 g')}
        ${dutyCard('s', 'SILVER CUSTOM DUTY', 'landed ₹/kg')}
      </div>`;
    paintBasis('g', fut.gold && fut.gold.ltp, (spot.goldUsd || 0), 0, (spot.inr || 0));
    paintBasis('s', fut.silver && fut.silver.ltp, 0, (spot.silverUsd || 0), (spot.inr || 0));
  },
  paintChart() {
    const el = document.getElementById('bdChart');
    if (el) el.innerHTML = (this.chartSeries === 'liveG' || this.chartSeries === 'liveS')
      ? this.liveSpark(this.chartSeries === 'liveG' ? 'g' : 's') : this.sparkline(this.chartSeries);
  },

  secDeals(host) {
    host.innerHTML = '<div class="loading-spin"></div>';
    window.Shivaa.api('/api/bullion/orders').then(({ orders }) => {
      const steps = ['New', 'Confirmed', 'Delivered'];
      host.innerHTML = `<h4 class="bd-sech">My bullion deals</h4>
        ${orders.length ? orders.map(o => {
          const stepIdx = o.status === 'Cancelled' ? -1 : steps.indexOf(o.status);
          return `<div class="bd-deal ${o.status === 'Cancelled' ? 'cancelled' : ''}">
            <div class="bd-deal-top">
              <div><b>${o.side === 'buy' ? 'BUY' : 'SELL'} · ${esc(o.metal)}</b> <span class="bd-dealid">${esc(o.id)}</span></div>
              <span class="status-pill st-${String(o.status).toLowerCase()}">${esc(o.status)}</span>
            </div>
            <div class="bd-deal-grid">
              <div><small>Qty</small><b>${o.qty} ${o.unit}</b></div>
              <div><small>Rate ₹/g</small><b>${this.num(o.rate)}</b></div>
              <div><small>Value</small><b>₹${this.num(o.amount)}</b></div>
              <div><small>Date</small><b>${new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</b></div>
            </div>
            ${stepIdx >= 0 ? `<div class="bd-track">${steps.map((s, i) => `<span class="${i <= stepIdx ? 'done' : ''}">${s}</span>${i < steps.length - 1 ? '<i></i>' : ''}`).join('')}</div>` : '<div class="bd-cancelled">This deal was cancelled.</div>'}
            ${o.note ? `<small class="bd-dealnote">Note: ${esc(o.note)}</small>` : ''}
            <div class="bd-deal-acts">
              <a class="btn btn-outline btn-sm" target="_blank" rel="noopener" href="${window.Shivaa.waLink('About bullion deal ' + o.id + ' (' + o.metal + ', ' + o.qty + o.unit + '):')}">📱 Desk on WhatsApp</a>
              <button class="btn btn-ghost btn-sm" onclick="ShivaaBullion.receipt('${o.id}')">🧾 Receipt</button>
            </div>
          </div>`;
        }).join('') : '<p class="partner-note">No deals yet — tap BUY/SELL on the Rates tab. Quotes here are firm while the board is live.</p>'}`;
      window._blOrders = orders;
    }).catch(e => host.innerHTML = '<p class="partner-note">' + e.message + '</p>');
  },

  secHistory(host) {
    const B = this.B;
    const seriesChips = [['gold995', 'TDS Gold 995 /10 g'], ['silverChorsa', 'TDS Silver /kg'], ['goldSpot', 'Gold Spot /10 g'], ['silverSpot', 'Silver Spot /kg']];
    const stat = (label, arr) => {
      const v = arr && arr.length ? arr : [0];
      const open = v[0], close = v[v.length - 1];
      return `<div class="bd-hstat"><small>${label}</small>
        <div><span>Open <b>${this.num(open)}</b></span><span>Now <b>${this.num(close)}</b></span>
        <span class="bd-hitxt">H ${this.num(Math.max(...v))}</span> <span class="bd-lowtxt">L ${this.num(Math.min(...v))}</span></div>`;
    };
    host.innerHTML = `
      <h4 class="bd-sech">Intraday history</h4>
      <div class="bd-chips" style="margin-bottom:8px">${seriesChips.map(([k, l]) => `<button class="bd-chip ${this.chartSeries === k ? 'on' : ''}" data-series="${k}">${l}</button>`).join('')}</div>
      <div class="bd-chartcard bd-bigchart">${this.sparkline(this.chartSeries, 220)}</div>
      <div class="bd-hstats">
        ${stat('TDS Gold 995', B.chart.gold995)}
        ${stat('TDS Silver Chorsa', B.chart.silverChorsa)}
      </div>
      <p class="bd-note">Ticks are retained across the trading day (up to 180 points); L/H bands on every rate card use the same intraday feed. For previous-day settlement sheets ask the desk on WhatsApp.</p>`;
    host.querySelectorAll('.bd-chip').forEach(c => c.onclick = () => {
      this.chartSeries = c.dataset.series;
      host.querySelectorAll('.bd-chip').forEach(x => x.classList.toggle('on', x === c));
      host.querySelector('.bd-bigchart').innerHTML = this.sparkline(this.chartSeries, 220);
    });
  },

  secAlerts(host) {
    const alerts = this.B.alerts || [];
    const unfix = alerts.filter(a => a.kind === 'unfix');
    const rates = alerts.filter(a => a.kind !== 'unfix');
    const item = a => `<div class="bd-alert ${a.reached ? 'reached' : ''}">
      <div><b>${esc(a.label || 'Unfix request')}</b>${a.kind !== 'unfix' ? ` <small>${a.side} · ${a.dir} ₹${this.num(a.target)}</small>` : ''}
        <br><small>${new Date(a.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })} · now <b class="${a.reached ? 'bd-hitxt' : ''}">${a.rateNow ? this.num(a.rateNow) : '—'}</b></small>
        ${a.note ? `<br><small>“${esc(a.note)}”</small>` : ''}
        ${a.reached ? '<div class="bd-alert-flag">🔔 TARGET HIT — tap to trade</div>' : ''}</div>
      <div class="bd-alert-acts">
        ${a.reached ? `<button class="btn btn-gold btn-sm" onclick="ShivaaBullion.jumpRate('${a.key}')">Trade →</button>` : ''}
        <button class="btn btn-ghost btn-sm" onclick="ShivaaBullion.removeAlert('${a.id}')">✕</button>
      </div></div>`;
    host.innerHTML = `
      <h4 class="bd-sech">Rate alerts &amp; unfix requests</h4>
      <p class="partner-note">Get pinged the moment a firm quote crosses your target, or request an unfix (rate-lock) for a planned purchase.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin:8px 0 14px">
        <button class="btn btn-gold btn-sm" onclick='ShivaaBullion.alertForm()'>＋ Rate alert</button>
        <button class="btn btn-outline btn-sm" onclick='ShivaaBullion.alertForm({kind:"unfix"})'>🔒 Request UNFIX</button>
      </div>
      ${unfix.length ? '<h5 style="color:var(--gold);margin:8px 0">Unfix requests</h5>' + unfix.map(item).join('') : ''}
      ${rates.length ? '<h5 style="color:var(--gold);margin:8px 0">Rate alerts</h5>' + rates.map(item).join('') : '<p class="partner-note">No alerts set.</p>'}`;
  },

  jumpRate(key) { this.section = 'rates'; this.renderShell(this.B); this.renderSection(); },

  /* ───────── forms ───────── */
  alertForm(preset) {
    const rows = (this.B && this.B.rows) || [];
    const p = preset || {};
    if (p.kind === 'unfix' || (preset && preset.kind === 'unfix')) {
      window.Shivaa.openModal(`<h3>Request UNFIX (rate-lock)</h3>
        <p style="font-size:13px;color:var(--ink-3)">Tell us the metal, quantity and settlement day — the desk confirms the unfix on WhatsApp.</p>
        <form class="form-grid" onsubmit="ShivaaBullion.placeAlert(event,'unfix')">
          <div class="fld full"><label>Metal / purity</label><input name="label" required placeholder="e.g. TDS Gold 995, 100 g"></div>
          <div class="fld"><label>Qty</label><input name="qty" placeholder="e.g. 100 g / 5 kg"></div>
          <div class="fld"><label>Settlement day</label><input name="note" placeholder="e.g. 20th, evening"></div>
          <button class="btn btn-gold btn-block">Send unfix request</button>
        </form>`);
      return;
    }
    const opts = rows.map(r => {
      const cur = r[p.side || 'buy'] ? Math.round(r[p.side || 'buy'] * this.sc(r)) : 0;
      return `<option value="${r.key}" data-side="${p.side || 'buy'}" ${p.key === r.key ? 'selected' : ''}>${r.label} (now ${cur ? this.num(cur) : '--'})</option>`;
    }).join('');
    window.Shivaa.openModal(`<h3>Set a rate alert</h3>
      <form class="form-grid" onsubmit="ShivaaBullion.placeAlert(event,'rate')">
        <div class="fld full"><label>Metal</label><select name="key" id="alKey" class="sortsel" style="width:100%;border-radius:12px">${opts}</select></div>
        <div class="fld"><label>Side</label><select name="side" class="sortsel" style="width:100%;border-radius:12px"><option value="buy" ${p.side === 'buy' ? 'selected' : ''}>BUY rate</option><option value="sell" ${p.side === 'sell' ? 'selected' : ''}>SELL rate</option></select></div>
        <div class="fld"><label>When rate goes</label><select name="dir" class="sortsel" style="width:100%;border-radius:12px"><option value="below">Below</option><option value="above">Above</option></select></div>
        <div class="fld full"><label>Target ₹ (display unit — /10 g gold, /kg silver)</label><input name="target" type="number" step="1" required placeholder="e.g. 72500"></div>
        <button class="btn btn-gold btn-block">Set alert 🔔</button>
      </form>`);
    if (p.label) { const k = document.getElementById('alKey'); if (k) [...k.options].forEach(o => { if (o.textContent.includes(p.label.split('–')[0].trim().slice(0, 10))) k.value = o.value; }); }
  },
  async placeAlert(e, kind) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const key = fd.get('key') || 'unfix';
    const row = (this.B.rows || []).find(r => r.key === key) || { label: fd.get('label') || 'Unfix' };
    try {
      await window.Shivaa.api('/api/bullion/alert', { method: 'POST', body: JSON.stringify(kind === 'unfix'
        ? { kind: 'unfix', key: 'unfix', label: fd.get('label'), note: [fd.get('qty'), fd.get('note')].filter(Boolean).join(' · ') }
        : { kind: 'rate', key, label: row.label, side: fd.get('side'), dir: fd.get('dir'), target: +fd.get('target') }) });
      window.Shivaa.closeModal();
      window.Shivaa.toast(kind === 'unfix' ? 'Unfix request sent ✦ desk will WhatsApp you' : 'Alert set 🔔');
      this.section = 'alerts';
      await this.refresh(true);
    } catch (err) { window.Shivaa.toast(err.message, 'err'); }
  },
  async removeAlert(id) {
    try { await window.Shivaa.api('/api/bullion/alert/' + id + '/remove', { method: 'POST', body: '{}' });
      window.Shivaa.toast('Alert removed'); this.refresh(true);
    } catch (e) { window.Shivaa.toast(e.message, 'err'); }
  },

  /* ───────── trade ticket: quantity / amount calculator with TCS ───────── */
  orderForm(o) {
    const sil = /sil/i.test(o.label);
    const defUnit = sil ? 'kg' : 'g';
    window.Shivaa.openModal(`
      <h3 style="font-size:22px;margin-bottom:2px">${o.side === 'buy' ? 'Buy' : 'Sell'} — ${o.label}</h3>
      <div style="font-size:12px;color:var(--ink-3);margin-bottom:14px">${o.purity} · ${o.mode} · firm rate <b>₹${o.rate.toLocaleString('en-IN')}/g</b></div>
      <form class="form-grid" onsubmit="ShivaaBullion.place(event)">
        <input type="hidden" id="boKey" value="${o.key}"><input type="hidden" id="boSide" value="${o.side}">
        <input type="hidden" id="boMetal" value="${o.label}"><input type="hidden" id="boRate" value="${o.rate}">
        <div class="fld"><label>Trade by</label><select id="boMode" class="sortsel" style="width:100%;border-radius:12px"><option value="qty">Quantity</option><option value="amt">Amount (₹)</option></select></div>
        <div class="fld"><label>Unit</label><select id="boUnit" class="sortsel" style="width:100%;border-radius:12px"><option value="g" ${defUnit === 'g' ? 'selected' : ''}>Grams</option><option value="kg" ${defUnit === 'kg' ? 'selected' : ''}>Kg</option></select></div>
        <div class="fld full" id="qtyFld"><label>Quantity *</label><input id="boQty" type="number" step="0.001" min="0.001" placeholder="${sil ? 'e.g. 1 (kg)' : 'e.g. 100 (g)'}"></div>
        <div class="fld full" id="amtFld" style="display:none"><label>Amount ₹ *</label><input id="boAmt" type="number" step="1" placeholder="e.g. 500000"></div>
        <div class="fld"><label>TCS (0.1%) on buy</label><select id="boTcs" class="sortsel" style="width:100%;border-radius:12px"><option value="0">Not applicable</option><option value="0.001" ${o.side === 'buy' ? 'selected' : ''}>Add 0.1%</option></select></div>
        <div class="fld"><label>Note</label><input id="boNote" placeholder="settlement day, ref…"></div>
        <div class="fld full" style="background:var(--gold-faint);border-radius:12px;padding:12px 14px;font-size:13px;line-height:1.8">
          Metal value: <b id="boVal">—</b><br>
          <span id="boTcsLine" style="display:none">TCS: <b id="boTcsAmt">—</b><br></span>
          <span style="font-size:15px">Total payable: <b id="boTot" style="color:var(--maroon)">—</b></span>
          <small id="boQtyEcho" style="display:block;color:var(--ink-3)"></small>
        </div>
        <button class="btn btn-primary btn-block">Place ${o.side === 'buy' ? 'Buy' : 'Sell'} Order</button>
      </form>`);
    const calc = () => {
      const mode = document.getElementById('boMode').value;
      const unit = document.getElementById('boUnit').value;
      const mult = unit === 'kg' ? 1000 : 1;
      let qty = 0, amt = 0;
      if (mode === 'qty') { qty = +document.getElementById('boQty').value || 0; amt = qty * o.rate * mult; }
      else { amt = +document.getElementById('boAmt').value || 0; qty = o.rate ? amt / (o.rate * mult) : 0; }
      const tcsPct = +document.getElementById('boTcs').value;
      const tcs = o.side === 'buy' ? Math.round(amt * tcsPct) : 0;
      document.getElementById('boVal').textContent = '₹' + Math.round(amt).toLocaleString('en-IN');
      document.getElementById('boTcsLine').style.display = tcs ? '' : 'none';
      document.getElementById('boTcsAmt').textContent = '₹' + tcs.toLocaleString('en-IN');
      document.getElementById('boTot').textContent = '₹' + Math.round(amt + tcs).toLocaleString('en-IN');
      document.getElementById('boQtyEcho').textContent = qty ? qty.toFixed(3) + ' ' + unit + ' × ₹' + o.rate.toLocaleString('en-IN') + '/g' : '';
      window._boQty = qty;
    };
    ['boMode', 'boUnit', 'boQty', 'boAmt', 'boTcs'].forEach(id => {
      const e = document.getElementById(id);
      e.addEventListener('input', calc); e.addEventListener('change', calc);
    });
    document.getElementById('boMode').addEventListener('change', () => {
      const qf = document.getElementById('qtyFld'), af = document.getElementById('amtFld');
      if (document.getElementById('boMode').value === 'qty') { qf.style.display = ''; af.style.display = 'none'; } else { qf.style.display = 'none'; af.style.display = ''; }
    });
  },
  async place(e) {
    e.preventDefault();
    const qty = window._boQty || 0;
    if (qty <= 0) { window.Shivaa.toast('Enter a quantity or amount', 'err'); return; }
    const unit = document.getElementById('boUnit').value;
    const note = document.getElementById('boNote').value;
    try {
      const ord = await window.Shivaa.api('/api/bullion/order', { method: 'POST', body: JSON.stringify({
        side: document.getElementById('boSide').value, metKey: document.getElementById('boKey').value,
        metal: document.getElementById('boMetal').value, qty: +qty.toFixed(3), unit, note,
      }) });
      window.Shivaa.closeModal();
      window.Shivaa.toast('Order ' + ord.id + ' placed ✦ desk confirms on WhatsApp');
      const msg = encodeURIComponent('✦ SHIVAA BULLION ORDER ✦\n\n' + (ord.side === 'buy' ? 'BUY' : 'SELL') + ' — ' + ord.metal + '\nQty: ' + ord.qty + ' ' + ord.unit + ' @ ₹' + ord.rate.toLocaleString('en-IN') + '/g\nEst. value: ₹' + ord.amount.toLocaleString('en-IN') + '\nOrder: ' + ord.id + (ord.note ? '\nNote: ' + ord.note : '') + '\n\nPlease confirm.');
      window.Shivaa.openModal(`<div class="center"><div style="font-size:40px">✦</div><h3 style="margin:8px 0">Order ${ord.id} placed!</h3><p style="font-size:13.5px;color:var(--ink-2)">${ord.side === 'buy' ? 'Buying' : 'Selling'} ${ord.qty} ${ord.unit} ${ord.metal} @ ₹${ord.rate.toLocaleString('en-IN')}/g<br>Est. ₹${ord.amount.toLocaleString('en-IN')}</p><a class="btn btn-gold" style="margin-top:14px" target="_blank" rel="noopener" href="${window.Shivaa.waLink(decodeURIComponent(msg))}">Confirm on WhatsApp →</a></div>`);
      this.section = 'deals'; this.refresh(true);
    } catch (err) { window.Shivaa.toast(err.message, 'err'); }
  },

  receipt(id) {
    const o = (window._blOrders || []).find(x => x.id === id);
    if (!o) return;
    const w = window.open('', '_blank');
    w.document.write(`<!doctype html><html><head><title>Bullion ${o.id}</title><style>
      body{font-family:Arial,sans-serif;max-width:340px;margin:12px auto;padding:0 10px;font-size:12px;color:#111}
      h2{font-size:15px;margin:0 0 2px}.r{text-align:right}table{width:100%;border-collapse:collapse;margin-top:8px}
      td{padding:3px 0;border-bottom:1px dashed #bbb}@media print{@page{size:80mm auto;margin:4mm}}
    </style></head><body>
      <h2>Shivaa Bullion Desk</h2><small>Jayal, Nagaur · +91 89050 05921</small>
      <table>
      <tr><td><b>${esc(o.id || '')}</b></td><td class="r">${new Date(o.createdAt).toLocaleString('en-IN')}</td></tr>
      <tr><td>${esc(String(o.side || '').toUpperCase())} ${esc(o.metal || '')}</td><td class="r">${esc(o.status || '')}</td></tr>
      <tr><td>Qty</td><td class="r">${Number(o.qty) || 0} ${esc(o.unit || '')}</td></tr>
      <tr><td>Rate ₹/g</td><td class="r">${o.rate.toLocaleString('en-IN')}</td></tr>
      <tr><td><b>Value ₹</b></td><td class="r"><b>${o.amount.toLocaleString('en-IN')}</b></td></tr>
      <tr><td colspan="2">${o.note ? 'Note: ' + esc(o.note) : ''}</td></tr>
      </table>
      <small style="color:#555">Firm quote confirmed by the Shivaa bullion desk. Settlement via RTGS / unfix as agreed.</small>
      <script>window.onload=()=>window.print()</script></body></html>`);
    w.document.close();
  },

  /* v69 — per-second tick engine. The server micro-caches one FULL exchange
     quote per second for ALL viewers, so this polls /bullion/tick every 1s
     while MCX is open (10 s while closed) and paints only the moving numbers.
     Dollars/customs/news still arrive on the 30 s full refresh. */
  istTime(iso) {
    // Angel sends exchangeFeedTime as epoch milliseconds; ISO otherwise
    const d = typeof iso === 'number' ? new Date(iso) : new Date(iso);
    if (typeof iso === 'number' && iso > 0 && iso < 1e11) d.setTime(iso * 1000); // epoch seconds
    if (isNaN(+d)) return '';
    const ist = new Date(+d + 5.5 * 3600 * 1000);   // force IST regardless of the viewer's timezone
    const p = n => String(n).padStart(2, '0');
    return `${p(ist.getUTCHours() % 12 || 12)}:${p(ist.getUTCMinutes())}:${p(ist.getUTCSeconds())} ${ist.getUTCHours() >= 12 ? 'PM' : 'AM'}`;
  },
  startTick() {
    if (this._tickTimer) return;
    const loop = async () => {
      const board = document.getElementById('bullionBoard');
      if (!board || !board.querySelector('.bd-tabs') || !this.B) { this._tickTimer = null; this.stopRelay(); return; }
      let delay = 800, failed = false;
      if (!document.hidden) {
        try { delay = await this.tick(); }
        catch (e) {
          this.tickFails = (this.tickFails || 0) + 1; failed = true;
          this.setTickState('tick error: ' + (e.message || 'network'), false);
        }
      }
      if (failed || (this.tickFails || 0) > 2) delay = Math.max(+delay || 0, 8000);
      if (this.relayLive) delay = Math.max(+delay || 0, 2500);   // push carries MCX; REST now feeds spot/duty
      this._tickTimer = setTimeout(loop, delay);
    };
    this._tickTimer = setTimeout(loop, 600);
  },
  stopTick() { if (this._tickTimer) { clearTimeout(this._tickTimer); this._tickTimer = null; } this.stopRelay(); },
  /* v78 — official push relay over Server-Sent Events. When live, MCX rows
     repaint the instant the exchange tick arrives (no 0.8 s poll wait); the
     REST loop drops to 2.5 s just to refresh the dollar spot + customs. */
  startRelay(B) {
    const url = B?.board?.relayStream || '';
    if (!url || typeof EventSource === 'undefined') return;
    if (this._relayUrl === url && this._relayES && this._relayES.readyState <= 1) return;
    this.stopRelay();
    let es;
    try { es = new EventSource(url); } catch (e) { return; }
    this._relayUrl = url; this._relayES = es; this._relayLive = 0;
    es.addEventListener('tick', ev => {
      try {
        const t = JSON.parse(ev.data);
        if (!t || !t.gold || !t.silver || !(t.gold.ltp > 0)) return;
        this._relayLive = Date.now();
        this.tickFails = 0;
        this.tickOpen = !!t.open && !t.stale;
        this.applyTick(t);
        const clock = this.istTime(t.at);
        if (t.stale) this.setTickState((t.error || 'market closed') + ' · ' + clock, false);
        else this.setTickState('live ⚡ push · ' + clock, true);
      } catch { /* ignore malformed frame */ }
    });
    es.onerror = () => { this._relayLive = 0; };
  },
  stopRelay() { if (this._relayES) { try { this._relayES.close(); } catch { /* ignore */ } } this._relayES = null; this._relayUrl = ''; this._relayLive = 0; },
  get relayLive() { return this._relayLive && Date.now() - this._relayLive < 8000; },
  setTickState(txt, ok) {
    const el = document.querySelector('[data-tickstate]');
    if (!el) return;
    el.textContent = txt;
    el.classList.toggle('bad', !ok);
    const heart = document.querySelector('[data-heart]');
    if (heart) heart.classList.toggle('beat', !!ok);
  },
  async tick() {
    const t = await window.Shivaa.api('/api/bullion/tick?_=' + Date.now());
    if (!t || !t.gold || !t.silver || !(t.gold.ltp > 0)) {
      this.tickFails = (this.tickFails || 0) + 1;
      this.setTickState(t && t.error ? 'feed: ' + t.error : 'waiting for quote…', false);
      return (t && t.delayMs) || 8000;
    }
    this.tickFails = 0;
    this.tickOpen = !!t.open && !t.stale;
    this.applyTick(t);
    const clock = this.istTime(t.at);
    if (t.stale) { this.setTickState((t.error ? 'feed: ' + t.error : 'market closed') + ' · ' + clock, false); return t.delayMs || 8000; }
    const ageTxt = t.ageMs != null ? (t.ageMs / 1000).toFixed(1) + 's' : '<1s';   // v90 real feed latency
    this.setTickState((this.tickOpen ? 'live · ' + ageTxt : 'market closed · 10 s') + ' · ' + clock, true);
    return t.delayMs || (this.tickOpen ? 800 : 10000);
  },
  applyTick(t) {
    const B = this.B; if (!B) return;
    B.board = B.board || {};
    const g = t.gold, s = t.silver;
    const num = v => this.num(Math.round(v || 0));
    /* model: future cards + mcx + karat */
    B.board.future = Object.assign(B.board.future || {}, {
      real: true,
      gold: { ltp: g.ltp, bid: g.bid || g.ltp, ask: g.ask || g.ltp },
      silver: { ltp: s.ltp, bid: s.bid || s.ltp, ask: s.ask || s.ltp },
      goldLow: g.low, goldHigh: g.high, silverLow: s.low, silverHigh: s.high,
      goldChg: g.chg, goldChgPct: g.chgPct, silverChg: s.chg, silverChgPct: s.chgPct,
      goldOi: g.oi || 0, silverOi: s.oi || 0, goldAtp: g.atp || 0, silverAtp: s.atp || 0,
      goldVol: g.vol || 0, silverVol: s.vol || 0, goldFeedTime: g.feedTime || '', silverFeedTime: s.feedTime || '',
    });
    /* v72 — live per-second tick chart buffer */
    this.seedLiveBuf();
    if (this.liveBuf) {
      this.liveBuf.g.push(Math.round(g.ltp)); this.liveBuf.s.push(Math.round(s.ltp));
      if (this.liveBuf.g.length > 180) { this.liveBuf.g.shift(); this.liveBuf.s.shift(); }
    }
    B.board.mcx = Object.assign(B.board.mcx || {}, {
      goldLtp: g.ltp, silverLtp: s.ltp, goldSymbol: g.symbol, silverSymbol: s.symbol });
    const k24 = Math.round(g.ltp);
    B.board.karat = { k24, k22: Math.round(g.ltp * 0.9167), k20: Math.round(g.ltp * 20 / 24),
      k18: Math.round(g.ltp * 0.75), silverKg: Math.round(s.ltp) };
    B.board.time = this.istTime(t.at);
    const flash = (el, v) => {
      if (!el) return;
      const old = el.textContent;
      const oldN = parseInt(String(old).replace(/[^0-9-]/g, ''), 10) || 0;
      const newN = parseInt(String(v).replace(/[^0-9-]/g, ''), 10) || 0;
      el.textContent = v;
      if (old !== v && old !== '--' && old !== '' && newN !== oldN) {
        el.classList.remove('bd-flash-up', 'bd-flash-down');
        void el.offsetWidth;
        el.classList.add(newN > oldN ? 'bd-flash-up' : 'bd-flash-down');
        setTimeout(() => el.classList.remove('bd-flash-up', 'bd-flash-down'), 600);
      }
    };
    /* rows: RTGS rows re-derive from anchor × factor + premium ± spread
       (display units: gold ₹/10 g, silver ₹/kg); CASH rows are owner-held. */
    const cfgAll = B.rtgsConfig || {};
    const quote = (r, side, rate) => JSON.stringify({ key: r.key, label: r.label, mode: r.mode, side, rate, purity: r.purity });
    B.rows.forEach((r, i) => {
      if (r.mode === 'CASH') return;
      const cfg = cfgAll[r.key];
      const isG = this.isSil(r) ? false : true;
      const q = isG ? g : s;
      if (!cfg) return;
      const f = +cfg.factor || 1, prem = +cfg.prem || 0, sp = +cfg.spread || 0, side = cfg.side || 'both';
      const mid = q.ltp * f + prem;
      const dB = side === 'sell' ? 0 : Math.round(mid - sp);
      const dS = side === 'buy' ? 0 : Math.round(mid + sp);
      const dLo = side === 'sell' ? 0 : Math.round(q.low * f + prem);
      const dHi = side === 'buy' ? 0 : Math.round(q.high * f + prem);
      const dChg = q.chg * f;
      // persist per-gram model values used by order forms / full re-renders
      if (isG) { r.buy = Math.round(dB / 10); r.sell = Math.round(dS / 10); r.low = Math.round(dLo / 10); r.high = Math.round(dHi / 10); }
      else { r.buy = +(dB / 1000).toFixed(3); r.sell = +(dS / 1000).toFixed(3); r.low = +(dLo / 1000).toFixed(3); r.high = +(dHi / 1000).toFixed(3); }
      r.change = isG ? Math.round(dChg / 10) : +(dChg / 1000).toFixed(3);
      if (this.section !== 'rates') return;
      const bPill = document.querySelector(`[data-pill="${r.key}:buy"]`);
      const sPill = document.querySelector(`[data-pill="${r.key}:sell"]`);
      if (bPill) { bPill.disabled = dB <= 0; flash(bPill, dB ? num(dB) : '--'); if (dB > 0) bPill.setAttribute('onclick', `ShivaaBullion.orderForm(${quote(r, 'buy', r.buy)})`); }
      if (sPill) { sPill.disabled = dS <= 0; flash(sPill, dS ? num(dS) : '--'); if (dS > 0) sPill.setAttribute('onclick', `ShivaaBullion.orderForm(${quote(r, 'sell', r.sell)})`); }
      const loEl = document.querySelector(`[data-lo="${r.key}"]`), hiEl = document.querySelector(`[data-hi="${r.key}"]`);
      if (loEl) loEl.textContent = dLo ? num(dLo) : '--';
      if (hiEl) hiEl.textContent = dHi ? num(dHi) : '--';
      const chgEl = document.querySelector(`[data-chg="${r.key}"]`);
      if (chgEl) chgEl.innerHTML = this.chgTxt(isG ? dChg : dChg, dB);
    });
    if (this.section === 'rates') {
      const set = (sel, v) => { const el = document.querySelector(sel); if (el) el.textContent = v; };
      set('[data-fut="gBid"]', num(g.bid || g.ltp)); set('[data-fut="gAsk"]', num(g.ask || g.ltp));
      set('[data-fut="gLo"]', num(g.low)); set('[data-fut="gHi"]', num(g.high));
      set('[data-fut="sBid"]', num(s.bid || s.ltp)); set('[data-fut="sAsk"]', num(s.ask || s.ltp));
      set('[data-fut="sLo"]', num(s.low)); set('[data-fut="sHi"]', num(s.high));
      const fc = (tag, c, p) => {
        const el = document.querySelector(`[data-futchg="${tag}"]`);
        if (el && c) { const up = c >= 0; el.innerHTML = `<span class="${up ? 'bd-hitxt' : 'bd-lowtxt'}">${up ? '▲' : '▼'} ${num(Math.abs(c))}${p ? ' (' + Math.abs(p).toFixed(2) + '%)' : ''}</span>`; }
      };
      fc('gChg', g.chg, g.chgPct); fc('sChg', s.chg, s.chgPct);
      [['k24', k24], ['k22', B.board.karat.k22], ['k20', B.board.karat.k20], ['k18', B.board.karat.k18], ['silverKg', B.board.karat.silverKg]]
        .forEach(([tag, v]) => set(`[data-kar="${tag}"]`, num(v)));
      /* v90 — the two hero rates now tick with every exchange frame (they
         used to freeze until the 30 s full refresh) */
      const hero = (key, tags, mult) => {
        const r = B.rows.find(x => x.key === key); if (!r) return;
        const bv = r.buy ? Math.round(r.buy * mult) : 0, sv = r.sell ? Math.round(r.sell * mult) : 0;
        flash(document.querySelector(`[data-sum="${tags[0]}"]`), bv ? num(bv) : '--');
        flash(document.querySelector(`[data-sum="${tags[1]}"]`), sv ? num(sv) : '--');
        const ar = document.querySelector(`[data-sum="${tags[2]}"]`);
        if (ar) {
          const c = (r.change || 0) * mult, base = tags[2][0] === 'g' ? bv : sv;
          const pct = c ? Math.abs(c) / Math.max(1, base - c) * 100 : 0;
          ar.className = c >= 0 ? 'bd-hitxt' : 'bd-lowtxt';
          ar.textContent = (c >= 0 ? '▲' : '▼') + ' ' + (pct ? pct.toFixed(2) + '%' : '—');
        }
      };
      hero('tdsGold9999', ['gBuy', 'gSell', 'gArrow'], 10);
      hero('silverChorsa', ['sBuy', 'sSell', 'sArrow'], 1000);
      /* v72 exchange stats: ATP · OI · VOL + feed timestamp */
      const cq = v => {
        v = +v || 0;
        if (v >= 1e7) return (v / 1e7).toFixed(2).replace(/\.00$/, '') + 'Cr';
        if (v >= 1e5) return (v / 1e5).toFixed(2).replace(/\.00$/, '') + 'L';
        if (v >= 1e3) return (v / 1e3).toFixed(1).replace(/\.0$/, '') + 'k';
        return num(v);
      };
      [['g', g], ['s', s]].forEach(([tag, q]) => {
        const st = document.querySelector(`[data-fut="${tag}Stats"]`);
        if (st) st.innerHTML = `${q.atp ? `<small>ATP ${num(q.atp)}</small>` : ''}${q.oi ? `<small>OI ${cq(q.oi)}</small>` : ''}${q.vol ? `<small>VOL ${cq(q.vol)}</small>` : ''}`;
        const ft = document.querySelector(`[data-fut="${tag}FT"]`);
        if (ft && q.feedTime) ft.textContent = this.istTime(+q.feedTime || q.feedTime);
      });
      if (this.chartSeries === 'liveG' || this.chartSeries === 'liveS') this.paintChart();
      /* v74 — live international spot cards (gold/silver $/oz, USD/INR, H/L, %) */
      if (t.spot) this.applySpotTick(t.spot, B);
      /* gold/silver ratio: prefer live spot, else futures-implied */
      const ratioEl = document.querySelector('[data-ratio]');
      if (ratioEl && s.ltp > 0 && !(t.spot && t.spot.ratio)) ratioEl.textContent = ((g.ltp / 10) / (s.ltp / 1000)).toFixed(1);
      document.querySelectorAll('.bd-time').forEach(el => el.textContent = 'Time: ' + B.board.time);
      const clk = document.querySelector('[data-clock]'); if (clk) clk.textContent = (B.date || '') + ' ' + B.board.time;
      const stateEl = document.querySelector('[data-clock-state]');
      if (stateEl) stateEl.textContent = this.tickOpen ? 'LIVE' : 'CLOSED';
      const badge = document.getElementById('bdFeedBadge');
      if (badge) {
        const gs = g.symbol || badge.dataset.gsym || 'GOLD', ss = s.symbol || badge.dataset.ssym || 'SILVER';
        const pg = /^GOLD/i.test(gs) ? String(gs).replace(/^GOLD/i, 'GOLD ') : gs;
        const txt = badge.querySelector('[data-badge="txt"]');
        if (txt) txt.textContent = `${this.tickOpen ? 'LIVE' : 'CLOSED'} · ${pg} ₹${num(g.ltp)}/10g · ${ss} ₹${num(s.ltp)}/kg`;
        badge.classList.toggle('bd-feed-closed', !this.tickOpen);
      }
    }
  },

  startPolling() {
    clearInterval(window._blPoll);
    this.refresh(false);
    window._blPoll = setInterval(() => this.refresh(true), 30000);
    // v101 — re-sync the INSTANT the jeweller comes back to the tab or the
    // network returns (mobile browsers starve timers while backgrounded), so
    // the desk always shows market-fresh rates, not a stale throttled quote.
    if (!this._resyncWired) {
      this._resyncWired = true;
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden && document.getElementById('bullionBoard')) {
          this.tickFails = 0; this.refresh(true);
        }
      });
      window.addEventListener('online', () => {
        if (document.getElementById('bullionBoard')) { this.tickFails = 0; this.refresh(true); }
      });
    }
  },
};

/* ═══════════ v60 admin methods ═══════════ */
window.ShivaaAdmin.manualPay = (id) => {
  const o = (window._adminOrders || []).find(x => x.id === id);
  const due = o ? (o.balance != null ? o.balance : o.total) : 0;
  const amt = prompt('Amount received ₹ (advance or instalment):', String(due || ''));
  if (amt === null || +amt <= 0) return;
  const mode = prompt('Mode: cash / upi / bank / card', 'cash'); if (mode === null) return;
  const ref = prompt('UTR / receipt / note (optional):', '') || '';
  (async () => {
    try { await window.Shivaa.api('/api/admin/pay-proof', { method: 'POST', body: JSON.stringify({ orderId: id, decision: 'approve', amount: +amt, mode, ref }) });
      window.Shivaa.toast('Payment of ₹' + (+amt).toLocaleString('en-IN') + ' recorded ✦ ledger updated');
      renderAdmin($('#view'), new URLSearchParams('tab=orders'));
    } catch (e) { window.Shivaa.toast(e.message, 'err'); }
  })();
};

/* v128 — Cashfree gateway refund. Full or partial; settlement is
   asynchronous — the order flips to Refunded only once Cashfree reports
   the refund completed. */
window.ShivaaAdmin.gatewayRefund = (id, maxAmt, gw) => {
  const name = 'Cashfree';
  const rows = window._adminOrders.find(x => x.id === id)?.refunds || [];
  const already = rows.reduce((a, r) => a + ((r.state === 'FAILED' || r.status === 'failed') ? 0 : +r.amount), 0);
  if (rows.some(r => ['PENDING', 'CONFIRMED', 'pending'].includes(r.state || r.status))) {
    window.Shivaa.toast('A ' + name + ' refund for this order is still processing — wait for it to complete.', 'err');
    return;
  }
  const refundable = Math.max(0, +maxAmt - already);
  const amt = prompt(name + ' refund amount ₹ (captured balance ₹' + refundable + '):', String(refundable || ''));
  if (amt === null || +amt <= 0 || +amt > refundable) { if (amt !== null) window.Shivaa.toast('Amount must be between ₹1 and ₹' + refundable, 'err'); return; }
  const reason = prompt('Reason for the refund:', 'Customer request') || 'Customer refund';
  if (!confirm('Send ₹' + (+amt).toLocaleString('en-IN') + ' back through ' + name + ' for ' + id + '? ' + name + ' settles it in 5–7 working days.')) return;
  (async () => {
    try {
      await window.Shivaa.api('/api/admin/refund', { method: 'POST', body: JSON.stringify({ orderId: id, amount: +amt, reason }) });
      window.Shivaa.toast('Refund of ₹' + (+amt).toLocaleString('en-IN') + ' accepted by ' + name + ' ✦ settles in 5–7 days');
      renderAdmin($('#view'), new URLSearchParams('tab=orders'));
    } catch (e) { window.Shivaa.toast(e.message, 'err'); }
  })();
};
window.ShivaaAdmin.refundDecide = async (id, decision) => {
  let note = '', amount = 0, mode = 'upi';
  if (decision === 'approve') {
    mode = prompt('Settlement mode: cash / upi / bank / exchange', 'upi'); if (mode === null) return;
    note = prompt('Note to customer (credit note / exchange details):', 'Approved — credit note issued') || '';
  } else {
    note = prompt('Reason for rejecting:', '') || '';
  }
  try {
    await window.Shivaa.api('/api/admin/refund/' + id, { method: 'POST', body: JSON.stringify({ decision, note, amount, mode }) });
    window.Shivaa.toast(decision === 'approve' ? 'Approved ✦ credit note + cash book entry created' : 'Request rejected');
    renderAdmin($('#view'), new URLSearchParams('tab=refunds'));
  } catch (e) { window.Shivaa.toast(e.message, 'err'); }
};

window.ShivaaAdmin.nidhiPay = (id) => {
  const amt = prompt('Instalment received ₹:', '5000'); if (amt === null || +amt <= 0) return;
  const mode = prompt('Mode: cash / upi / bank', 'cash'); if (mode === null) return;
  (async () => {
    try { await window.Shivaa.api('/api/admin/savings/' + id + '/installment', { method: 'POST', body: JSON.stringify({ amount: +amt, mode }) });
      window.Shivaa.toast('Instalment recorded ✦ passbook updated'); renderAdmin($('#view'), new URLSearchParams('tab=nidhi'));
    } catch (e) { window.Shivaa.toast(e.message, 'err'); }
  })();
};
window.ShivaaAdmin.nidhiAct = async (id, act) => {
  const note = prompt(act === 'redeem' ? 'Redeem against which piece / order? (note)' : 'Close / refund note:', '') || '';
  if (!confirm(act === 'redeem' ? 'Mark plan redeemed into jewellery?' : 'Close this plan and refund contributions?')) return;
  try { await window.Shivaa.api('/api/admin/savings/' + id + '/' + act, { method: 'POST', body: JSON.stringify({ note }) });
    window.Shivaa.toast('Plan ' + act + ' ✦'); renderAdmin($('#view'), new URLSearchParams('tab=nidhi'));
  } catch (e) { window.Shivaa.toast(e.message, 'err'); }
};

window.ShivaaAdmin.runReport = async () => {
  const from = document.getElementById('rpFrom')?.value;
  const to = document.getElementById('rpTo')?.value;
  const host = document.getElementById('rpBody'); if (!host || !from) return;
  host.innerHTML = '<p class="partner-note">Running…</p>';
  try {
    const r = await window.Shivaa.api('/api/admin/reports?from=' + from + '&to=' + to);
    window._lastReport = r;
    const kpi = (l, v, sub) => `<div class="rp-kpi"><small>${l}</small><b>${v}</b>${sub ? '<em>' + sub + '</em>' : ''}</div>`;
    host.innerHTML = `
      <div class="rp-grid">
        ${kpi('Orders', r.orders, '')}
        ${kpi('Net revenue', '₹' + (r.revenue || 0).toLocaleString('en-IN'), '')}
        ${kpi('GST collected', '₹' + (r.tax || 0).toLocaleString('en-IN'), 'CGST ₹' + (r.cgst || 0).toLocaleString('en-IN') + ' · SGST ₹' + (r.sgst || 0).toLocaleString('en-IN'))}
        ${kpi('Metal value', '₹' + (r.metalValue || 0).toLocaleString('en-IN'), '')}
        ${kpi('Making revenue', '₹' + (r.makingRevenue || 0).toLocaleString('en-IN'), '')}
        ${kpi('Stone / add-on', '₹' + (r.stoneValue || 0).toLocaleString('en-IN'), '')}
        ${kpi('Old gold bought', (r.oldGold?.count || 0) + ' buys', '₹' + (r.oldGold?.amount || 0).toLocaleString('en-IN'))}
        ${kpi('Refunds', (r.refunds?.count || 0), '₹' + (r.refunds?.amount || 0).toLocaleString('en-IN'))}
        ${kpi('Proofs pending', r.proofPending || 0, '')}
        ${kpi('Tags with assumed weight', r.assumedWeights || 0, 're-weigh before dispatch')}
      </div>
      <h4 style="margin:16px 0 6px">Payment methods</h4>
      <div class="adm-table-wrap"><table class="adm-table"><thead><tr><th>Method</th><th class="num">Orders</th><th class="num">Value</th></tr></thead><tbody>
        ${Object.entries(r.byMethod || {}).map(([m, v]) => `<tr><td>${m}</td><td class="num">${v.n}</td><td class="num">₹${(v.value || 0).toLocaleString('en-IN')}</td></tr>`).join('')}
      </tbody></table></div>
      <h4 style="margin:16px 0 6px">Bestsellers (top 12)</h4>
      <div class="adm-table-wrap"><table class="adm-table"><thead><tr><th>Piece</th><th class="num">Qty</th><th class="num">Value</th></tr></thead><tbody>
        ${(r.bestsellers || []).map(b => `<tr><td>${esc(b.name)}</td><td class="num">${Number(b.qty) || 0}</td><td class="num">₹${Number(b.value || 0).toLocaleString('en-IN')}</td></tr>`).join('') || '<tr><td colspan="3" class="partner-note">No sales in range.</td></tr>'}
      </tbody></table></div>
      <h4 style="margin:16px 0 6px">Low stock (≤3) &amp; tag mismatches</h4>
      <div class="adm-table-wrap"><table class="adm-table"><thead><tr><th>Piece</th><th class="num">Stock</th><th>Weight</th></tr></thead><tbody>
        ${(r.lowStock || []).map(p => `<tr><td>${esc(p.name)}</td><td class="num">${Number(p.stock) || 0}</td><td class="num">${p.weight ? Number(p.weight) + ' g' : '<span style="color:var(--warn)">assumed — re-weigh</span>'}</td></tr>`).join('') || '<tr><td colspan="3">All healthy ✦</td></tr>'}
      </tbody></table></div>
      <h4 style="margin:16px 0 6px">Metal out with karigars (job-work open)</h4>
      <div class="adm-table-wrap"><table class="adm-table"><thead><tr><th>Karigar</th><th class="num">Open jobs</th><th class="num">Grams out</th></tr></thead><tbody>
        ${Object.entries(r.metalOutWithKarigars || {}).map(([k, v]) => `<tr><td>${k}</td><td class="num">${v.jobs}</td><td class="num">${(v.grams || 0).toFixed(2)} g</td></tr>`).join('') || '<tr><td colspan="3">Nothing outstanding ✦</td></tr>'}
      </tbody></table></div>`;
  } catch (e) { host.innerHTML = '<p class="partner-note">' + e.message + '</p>'; }
};
window.ShivaaAdmin.reportCSV = () => {
  const from = document.getElementById('rpFrom')?.value, to = document.getElementById('rpTo')?.value;
  if (!from) return;
  window.Shivaa.api('/api/admin/reports?from=' + from + '&to=' + to).then(r => {
    const rows = [
      ['Shivaa Jewellers — sales register', from, 'to', to],
      [],
      ['Metric', 'Value'],
      ['Orders', r.orders], ['Net revenue', r.revenue], ['CGST', r.cgst], ['SGST', r.sgst],
      ['Metal value', r.metalValue], ['Making revenue', r.makingRevenue], ['Stone/add-on', r.stoneValue],
      ['Shipping', r.shipping], ['Prepaid discounts', r.prepaidDiscount],
      ['Refunds count', r.refunds?.count || 0], ['Refunds amount', r.refunds?.amount || 0],
      ['Old gold buys', r.oldGold?.count || 0], ['Old gold value', r.oldGold?.amount || 0],
      [], ['Payment method', 'Orders', 'Value'],
      ...Object.entries(r.byMethod || {}).map(([m, v]) => [m, v.n, v.value || 0]),
      [], ['Bestseller', 'Qty', 'Value'],
      ...(r.bestsellers || []).map(b => [b.name, b.qty, b.value || 0]),
      [], ['Low stock piece', 'Stock', 'Weight g'],
      ...(r.lowStock || []).map(p => [p.name, p.stock, p.weight || 'assumed']),
    ];
    ShivaaAdmin._dl(rows, 'shivaa-sales-' + from + '_' + to + '.csv');
  }).catch(e => window.Shivaa.toast(e.message, 'err'));
};
window.ShivaaAdmin.catalogCSV = () => {
  const rows = [['SKU', 'Name', 'Category', 'Metal', 'Purity', 'Weight g', 'Gross ₹', 'Stock', 'URL']];
  (state.productsCache || []).forEach(p => {
    const pr = window.Shivaa.price(p);
    rows.push([p.sku || p.id, p.name, p.category, p.metal || (p.category === 'silver' ? 'Silver' : 'Gold'), p.purity || (p.category === 'silver' ? '92.5' : '22K'), p.weight || '', pr ? pr.gross : '', p.stock ?? '', location.origin + '/#/product/' + p.id]);
  });
  ShivaaAdmin._dl(rows, 'shivaa-catalogue.csv');
};
window.ShivaaAdmin.productPoster = (id) => {
  const p = (state.productsCache || []).find(x => x.id === id);
  if (!p) return;
  const pr = window.Shivaa.price(p);
  const S = state.settings || {};
  const img = (p.images && p.images[0]) || '/images/logo.png';
  const w = window.open('', '_blank', 'width=520,height=860');
  w.document.write(`<!doctype html><html><head><title>Poster ${esc(p.name || '')}</title><style>
    @page{size:A4;margin:0}
    body{margin:0;font-family:Georgia,'Times New Roman',serif;background:#2b0a12;color:#f3d27a;display:grid;place-items:center;min-height:100vh}
    .poster{width:460px;padding:34px 30px;text-align:center;background:linear-gradient(165deg,#3a0c14,#22070d)}
    .poster img{width:100%;height:430px;object-fit:cover;border-radius:14px;border:1.5px solid rgba(243,210,122,.6)}
    h1{font-size:25px;margin:18px 0 4px;color:#f7e3ac;line-height:1.25}
    .sub{font-size:12.5px;letter-spacing:2px;text-transform:uppercase;opacity:.8;font-family:Jost,sans-serif}
    .price{font-size:38px;color:#fff;margin:14px 0 4px;font-family:'Times New Roman',serif}
    .small{font-size:12px;opacity:.75;font-family:Jost,sans-serif;line-height:1.7}
    .br{border-top:1px solid rgba(243,210,122,.4);margin:16px 0 10px;padding-top:12px}
    .url{font-size:15px;color:#fff;font-family:Jost,sans-serif;letter-spacing:.5px}
  </style></head><body><div class="poster">
    <div class="sub">✦ Shivaa Jewellers · Jaipur rates ✦</div>
    <img src="${location.origin}${safeUrl(img)}" onerror="this.src='${location.origin}/images/logo.png'">
    <h1>${esc(p.name || '')}</h1>
    <div class="sub">${esc(p.purity || '')} · BIS hallmarked · lifetime exchange</div>
    <div class="price">₹${pr.gross.toLocaleString('en-IN')}</div>
    <div class="small">${p.weightG ? 'Approx ' + Number(p.weightG) + ' g · ' : ''}transparent metal + making breakdown<br>Insured doorstep delivery · video call on request</div>
    <div class="br"></div>
    <div class="url">shivaa.in/#/product/${encodeURIComponent(p.id || '')}</div>
    <div class="small" style="margin-top:8px">${esc(S.phone || '+91 89050 05921')} · Sadar Bazaar, Jayal, Nagaur</div>
    <div style="margin-top:18px"><button onclick="window.print()" style="padding:10px 26px;background:#f3d27a;color:#2b0a12;border:0;border-radius:8px;font-weight:700">🖨 Save / share PDF</button></div>
  </div><script>window.onload=()=>setTimeout(()=>window.print(),400)</script></body></html>`);
  w.document.close();
};
ShivaaAdmin._dl = (rows, name) => {
  const csv = '\uFEFF' + csvRows(rows);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
};
window.ShivaaAdmin.openAudit = async () => {
  const card = document.getElementById('auditCard');
  if (!card) return;
  card.style.display = card.style.display === 'none' ? '' : 'none';
  const host = document.getElementById('auditBody');
  if (card.style.display && host.dataset.loaded) return;
  try {
    const d = await window.Shivaa.api('/api/admin/audit');
    host.innerHTML = (d.log || []).map(l => `<div style="display:flex;gap:10px;padding:6px 0;border-bottom:1px dashed var(--line);font-size:12.5px">
      <span style="color:var(--ink-3);white-space:nowrap">${new Date(l.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</span>
      <b style="min-width:150px">${esc(l.what)}</b><span>${esc((l.meta && (l.meta.order || l.meta.user || '')))}</span><small style="margin-left:auto;color:var(--ink-3)">${esc(l.by || '')}</small></div>`).join('');
    host.dataset.loaded = '1';
  } catch (e) { host.textContent = e.message; }
};

/* ── v60 printable GST invoice (thermal/A4) ── */
window.ShivaaAdmin.printInvoice = (id) => {
  const o = (window._adminOrders || []).find(x => x.id === id);
  if (!o) return;
  /* v142 — bill a guest express order to Cashfree's verified address/name. */
  const cf2 = (o.cfCheckout && o.cfCheckout.shipping) || null;
  const pAddr = cf2
    ? { name: cf2.name || o.userName || '', line: [cf2.address_line_one, cf2.address_line_two].filter(Boolean).join(', '),
        city: cf2.city || '', state: cf2.state || '', pincode: cf2.pin_code || '', phone: cf2.phone || (o.cfCheckout && o.cfCheckout.phone) || '' }
    : (o.address || {});
  const s = state.settings || {};
  const gstin = s.gstin || 'GSTIN on file';
  const w = window.open('', '_blank');
  let subTotal = 0, taxTotal = 0;
  const rows = (o.items || []).map(it => {
    const qty = it.qty || 1;
    const gst = Math.round((it.gst || 0) * qty);
    const taxable = Math.max(0, Math.round((it.unitPrice || 0) * qty - gst));
    subTotal += taxable; taxTotal += gst;
    return `<tr><td>${esc(it.name || '')}${it.size ? ' · ' + esc(it.size) : ''}<br><small>HSN ${esc(it.hsn || '71131910')}</small></td><td>${esc(it.purity || '')}</td><td class="r">${it.weightG ? Number(it.weightG).toFixed(2) : ''}</td><td class="r">${qty}</td><td class="r">${taxable.toLocaleString('en-IN')}</td><td class="r">${Math.round(gst / 2).toLocaleString('en-IN')}</td><td class="r">${(gst - Math.round(gst / 2)).toLocaleString('en-IN')}</td><td class="r">${(taxable + gst).toLocaleString('en-IN')}</td></tr>`;
  }).join('');
  w.document.write(`<!doctype html><html><head><title>Invoice ${o.invoiceNo || o.id}</title>
  <style>
    body{font-family:'Segoe UI',Arial,sans-serif;color:#111;max-width:800px;margin:20px auto;padding:0 14px;font-size:12px}
    h1{font-size:18px;margin:0}.muted{color:#555;font-size:11px}
    table{width:100%;border-collapse:collapse;margin-top:10px}th,td{border:1px solid #999;padding:5px 7px;text-align:left;vertical-align:top}
    .r{text-align:right}.tot td{font-weight:bold;background:#f6efe0}
    .flx{display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap}
    @media print{@page{margin:8mm}}
    @media (max-width:64mm){body{font-size:9px;max-width:58mm;margin:0 auto;padding:2mm}th:nth-child(2),td:nth-child(2),th:nth-child(3),td:nth-child(3){display:none}}
  </style></head><body>
  <div class="flx"><div><h1>Shivaa Jewellers</h1><div class="muted">Jayal, Nagaur, Rajasthan · ${gstin}<br>Ph. +91 89050 05921 · shivaa.in</div></div>
  <div style="text-align:right"><b>TAX INVOICE</b><br>${o.invoiceNo || ''}<br><span class="muted">${new Date(o.createdAt).toLocaleDateString('en-IN')}</span></div></div>
  <div class="flx" style="margin-top:8px"><div><b>Bill to:${cf2 ? ' <span class="muted">(Cashfree-verified)</span>' : ''}</b><br>${esc(cf2 ? (pAddr.name || pAddr.phone || '') : (o.userName || ''))}<br><span class="muted">${esc(pAddr.line || pAddr.address || '')}<br>${esc([pAddr.city, pAddr.state, pAddr.pincode].filter(Boolean).join(', '))}</span><br>${esc(pAddr.phone || o.phone || '')}</div>
  <div style="text-align:right"><b>Order:</b> ${o.id}<br><b>Payment:</b> ${esc(o.paymentStatus || '')} (${esc(o.paymentMethod || '')})</div></div>
  <table><thead><tr><th>Description</th><th>Purity</th><th class="r">Wt g</th><th class="r">Qty</th><th class="r">Taxable</th><th class="r">CGST</th><th class="r">SGST</th><th class="r">Total</th></tr></thead>
  <tbody>${rows}
  ${o.shipping ? `<tr><td colspan="4">Insured shipping</td><td class="r">${o.shipping.toLocaleString('en-IN')}</td><td colspan="3"></td></tr>` : ''}
  ${o.prepaidDiscount ? `<tr><td colspan="4">Prepaid discount</td><td class="r">−${o.prepaidDiscount.toLocaleString('en-IN')}</td><td colspan="3"></td></tr>` : ''}
  <tr class="tot"><td colspan="4">Grand total</td><td colspan="3"></td><td class="r">₹${(o.total || 0).toLocaleString('en-IN')}</td></tr>
  </tbody></table>
  <p class="muted" style="margin-top:10px">HSN 71131910 (gold jewellery) / 71131110 (silver). GST 1.5% CGST + 1.5% SGST on making charges. Every gold piece is BIS hallmarked with a unique 6-digit HUID. 7-day return · lifetime exchange · lifetime care.</p>
  <script>window.onload=()=>{window.print()}</script></body></html>`);
  w.document.close();
};

/* ── v60 DPDP: export / anonymize from customers tab ── */
window.ShivaaAdmin.userData = async (q) => {
  try {
    const d = await window.Shivaa.api('/api/admin/user-data/' + encodeURIComponent(q));
    const w = window.open('', '_blank');
    w.document.write('<pre style="font:12px monospace;padding:16px;white-space:pre-wrap">' + esc(JSON.stringify(d, null, 2)) + '</pre>');
    w.document.close();
  } catch (e) { window.Shivaa.toast(e.message, 'err'); }
};
window.ShivaaAdmin.anonymize = async (q) => {
  if (!confirm('Permanently erase this customer’s personal data (DPDP right to erasure)? Orders are retained with anonymized name. This cannot be undone.')) return;
  try { await window.Shivaa.api('/api/admin/user-data/' + encodeURIComponent(q) + '/anonymize', { method: 'POST', body: '{}' });
    window.Shivaa.toast('Personal data erased ✦'); renderAdmin($('#view'), new URLSearchParams('tab=customers'));
  } catch (e) { window.Shivaa.toast(e.message, 'err'); }
};

/* ── v60 review replies ── */
window.ShivaaAdmin.replyReview = async (id) => {
  const reply = prompt('Your public reply:'); if (reply === null) return;
  try { await window.Shivaa.api('/api/admin/reviews/' + id + '/reply', { method: 'POST', body: JSON.stringify({ reply }) });
    window.Shivaa.toast('Reply posted ✦'); ShivaaAdmin.loadReviews();
  } catch (e) { window.Shivaa.toast(e.message, 'err'); }
};
window.ShivaaAdmin.loadReviews = async () => {
  const host = document.getElementById('rvAdmin'); if (!host) return;
  try {
    const d = await window.Shivaa.api('/api/admin/reviews');
    const list = (d.reviews || []).slice(0, 30);
    host.innerHTML = list.length ? `<div class="adm-table-wrap"><table class="adm-table"><thead><tr><th>Review</th><th>Piece</th><th></th></tr></thead><tbody>
      ${list.map(r => `<tr><td><b>${esc(r.userName)}</b> ${r.verified ? '<span class="verified-badge">✓ verified</span>' : ''} · ${'★'.repeat(r.rating)}<br>${esc(r.text)}<br>${(r.photos || []).map(p => `<a href="${safeUrl(p)}" target="_blank" rel="noopener"><img src="${safeUrl(p)}" style="width:44px;height:44px;object-fit:cover;border-radius:6px;margin:3px"></a>`).join('')}${r.reply ? '<div class="rv-reply"><b>Reply:</b> ' + esc(r.reply) + '</div>' : ''}</td>
      <td>${esc(r.productName || r.productId)}</td>
      <td>${r.reply ? '' : `<button class="btn btn-outline btn-sm" onclick="ShivaaAdmin.replyReview('${r.id}')">Reply</button>`}</td></tr>`).join('')}
    </tbody></table></div>` : '<p class="partner-note">No reviews yet.</p>';
  } catch (e) { host.textContent = e.message; }
};

/* register routes */
window.Shivaa.routes.admin = renderAdmin;
window.Shivaa.routes.partner = renderPartner;
})();
