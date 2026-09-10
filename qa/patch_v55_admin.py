# -*- coding: utf-8 -*-
"""v55 admin.js batch: Khata tab, order tools (WA update, review ask, HUID/dispatch
meta modal, GSTR-1 CSV), overview funnel + abandoned carts + referrals,
settings fields (draw stream URL, winner note, tier premiums)."""
p = 'cms/js/admin.js'
s = open(p, encoding='utf-8').read()
o = s

def rep(old, new, label):
    global s
    c = s.count(old)
    assert c == 1, f'{label}: count={c}'
    s = s.replace(old, new, 1)
    print('ok:', label)

rep("['pages','📄','Pages'],['settings','⚙','Settings']]",
    "['pages','📄','Pages'],['khata','📒','Khata'],['settings','⚙','Settings']]", 'nav khata')
rep("pages:'Pages',settings:'Settings'})[tab]",
    "pages:'Pages',khata:'Khata — partner ledger',settings:'Settings'})[tab]", 'heading khata')

rep("  if (tab === 'finale') { try { const fe = await api('/api/finale/entries'); finaleEntries = fe.entries || []; } catch (e) {} }",
"""  if (tab === 'finale') { try { const fe = await api('/api/finale/entries'); finaleEntries = fe.entries || []; } catch (e) {} }
  let khataData = { partners: [], khata: [] };
  if (tab === 'khata') { try { khataData = await api('/api/admin/khata'); } catch (e) {} }
  let carts = [];
  if (tab === 'overview') { try { carts = (await api('/api/admin/carts')).carts; } catch (e) {} }""", 'fetch khata + carts')

rep("""      <div class="adm-card"><h3>Daily revenue (last ${days.length || 0} days)</h3>""",
"""      <div class="grid2">
        <div class="adm-card"><h3>📈 This week's funnel</h3>
          <div class="sum-row"><span>Product views</span><b>${(stats.funnel && stats.funnel.view) || 0}</b></div>
          <div class="sum-row"><span>Added to cart</span><b>${(stats.funnel && stats.funnel.cart) || 0}</b></div>
          <div class="sum-row"><span>Reached checkout</span><b>${(stats.funnel && stats.funnel.checkout) || 0}</b></div>
          <div class="sum-row"><span>Orders (all time)</span><b>${stats.orders || 0}</b></div>
          <div class="sum-row"><span>Referred sign-ups</span><b>${stats.referrals || 0}</b></div>
        </div>
        <div class="adm-card"><h3>🛒 Abandoned carts (${carts.length})</h3>
          ${carts.length ? carts.slice(0, 5).map(c => `<div class="sum-row"><span><b>${esc((c.items || []).map(i => i.n).slice(0, 2).join(', '))}${(c.items || []).length > 2 ? '…' : ''}</b><br><small style="color:var(--ink-3)">${esc(String(c.at || '').slice(0, 16).replace('T', ' '))}${c.phone ? ' · ' + esc(c.phone) : ''}</small></span><span><b>${fmt(c.total || 0)}</b>${c.phone ? ` <button class="btn btn-ghost btn-sm" onclick="ShivaaAdmin.nudgeCart('${esc(c.phone)}','${esc((c.items || []).map(i => i.n).slice(0, 2).join(', '))}')">Nudge</button>` : ''}</span></div>`).join('') : '<p style="color:var(--ink-3);font-size:13.5px">None yet — carts left behind appear here for a gentle nudge.</p>'}
        </div>
      </div>
      <div class="adm-card"><h3>Daily revenue (last ${days.length || 0} days)</h3>""", 'overview cards')

# orders: GSTR button + per-row action buttons
rep("""    body.innerHTML = `<div class="adm-card"><h3>${orders.length} orders</h3>""",
"""    window._adminOrders = orders;
    body.innerHTML = `<div class="adm-card"><h3>${orders.length} orders <button class="btn btn-ghost btn-sm" style="margin-left:10px" onclick="ShivaaAdmin.gstrCSV()">⬇ GSTR-1 CSV</button></h3>""", 'orders gstr button')

rep("""          <td><button class="icon-e" onclick="Shivaa.orderDetail('${o.id}')">👁</button></td>""",
"""          <td style="white-space:nowrap"><button class="icon-e" onclick="Shivaa.orderDetail('${o.id}')" title="View">👁</button>
            <button class="icon-e" onclick="ShivaaAdmin.waOrder('${o.id}')" title="Send WhatsApp update">📱</button>
            <button class="icon-e" onclick="ShivaaAdmin.reviewAsk('${o.id}')" title="Ask for review">⭐</button>
            <button class="icon-e" onclick="ShivaaAdmin.orderMeta('${o.id}')" title="HUID / dispatch / e-way">📋</button></td>""", 'order row tools')

# khata tab body before settings tab
rep("  if (tab === 'settings') {",
"""  if (tab === 'khata') {
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

  if (tab === 'settings') {""", 'khata tab')

# settings fields for campaign + tiers
rep("""        <div class="fld full"><label>Announcement ticker (one per line)</label>""",
"""        <div class="fld"><label>Bhai Dooj draw — live stream URL (YouTube/Instagram)</label><input name="drawStreamUrl" value="${esc(S.drawStreamUrl || '')}" placeholder="https://youtube.com/live/…"></div>
        <div class="fld"><label>Winner announcement note (shown after the draw)</label><input name="winnerNote" value="${esc(S.winnerNote || '')}" placeholder="Winner: …, verified by CA …"></div>
        <div class="fld"><label>Tier premium ₹/g — Silver</label><input name="tierSilver" type="number" value="${S.tierSilver ?? 0}"></div>
        <div class="fld"><label>Tier premium ₹/g — Gold</label><input name="tierGold" type="number" value="${S.tierGold ?? 0}"></div>
        <div class="fld"><label>Tier premium ₹/g — Diamond</label><input name="tierDiamond" type="number" value="${S.tierDiamond ?? 0}"></div>
        <div class="fld full"><label>Announcement ticker (one per line)</label>""", 'settings new fields')

# functions
rep("window.ShivaaAdmin.backup = async () => {",
"""/* ── v55 order & khata tools ── */
window.ShivaaAdmin.nudgeCart = (phone, names) => {
  if (!phone) return;
  window.open('https://wa.me/91' + String(phone).slice(-10) + '?text=' + encodeURIComponent('Namaste ✦ Shivaa here — the ' + names + ' you picked are still in your cart, and today\u2019s rate is live. Complete anytime: shivaa.in/#/cart'), '_blank');
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
  try { await api('/api/admin/order-meta', { method: 'POST', body: JSON.stringify(patch) }); toast('Saved ✦'); document.getElementById('omModal').remove(); }
  catch (err) { toast(err.message || 'Could not save', 'err'); }
};
window.ShivaaAdmin.gstrCSV = () => {
  const os = window._adminOrders || [];
  const rows = [['Invoice', 'Date', 'Buyer', 'Taxable value', 'CGST 1.5%', 'SGST 1.5%', 'Invoice total']];
  os.filter(o => o.status !== 'Cancelled').forEach(o => {
    const taxable = Math.round((o.total || 0) / 1.03);
    rows.push([o.id, String(o.createdAt || '').slice(0, 10), (o.userName || '').replace(/,/g, ' '), taxable, Math.round((o.total - taxable) / 2), Math.round((o.total - taxable) / 2), o.total || 0]);
  });
  const blob = new Blob([rows.map(r => r.join(',')).join('\\n')], { type: 'text/csv' });
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
  w.document.write('<h2>Shivaa Jewellers — Khata Statement</h2><p>Partner: ' + pid + ' · Generated ' + new Date().toLocaleString('en-IN') + '</p><table border="1" cellpadding="6" style="border-collapse:collapse;font:13px sans-serif"><tr><th>Date</th><th>Type</th><th>Note</th><th>Amount</th></tr>' +
    K.map(k => '<tr><td>' + String(k.at || '').slice(0, 16).replace('T', ' ') + '</td><td>' + k.type + '</td><td>' + (k.note || '') + '</td><td>' + (k.amt ? (k.unit === 'g' ? k.amt + ' g' : '₹' + k.amt) : '—') + '</td></tr>').join('') +
    '</table><script>window.print()</' + 'script>');
  w.document.close();
};
window.ShivaaAdmin.backup = async () => {""", 'v55 tool functions')

# cache khata for print
rep("  if (tab === 'khata') { try { khataData = await api('/api/admin/khata'); } catch (e) {} }",
    "  if (tab === 'khata') { try { khataData = await api('/api/admin/khata'); window._khataCache = khataData.khata || []; } catch (e) {} }", 'khata print cache')

open(p, 'w', encoding='utf-8').write(s)
print('admin.js v55 batch applied:', s != o)
