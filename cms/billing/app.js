/* Shivaa Jewels — Billing
   One file, no build step, no dependencies. Hash-routed SPA over api.php. */
(function () {
  "use strict";

  var S = { user: null, csrf: "", meta: null, settings: null, route: "", q: {} };
  var root = document.getElementById("app");

  /* ── plumbing ────────────────────────────────────────────────────────── */
  function api(route, opts) {
    opts = opts || {};
    var init = { method: opts.method || "GET", headers: {}, credentials: "same-origin" };
    if (S.csrf) init.headers["X-Billing-Csrf"] = S.csrf;
    if (opts.body) {
      init.headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(opts.body);
    }
    return fetch("api.php?r=" + encodeURIComponent(route), init).then(function (r) {
      return r.json().then(function (j) {
        if (!r.ok || j.ok === false) { var e = new Error(j.error || ("HTTP " + r.status)); e.status = r.status; throw e; }
        return j;
      });
    });
  }
  function h(tag, attrs) {
    var el = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (k) {
      if (k === "html") el.innerHTML = attrs[k];
      else if (k === "text") el.textContent = attrs[k];
      else if (k.slice(0, 2) === "on") el.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] !== null && attrs[k] !== undefined && attrs[k] !== false) el.setAttribute(k, attrs[k]);
    });
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i];
      if (c === null || c === undefined || c === false) continue;
      if (Array.isArray(c)) c.forEach(function (x) { if (x) el.appendChild(x); });
      else el.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    }
    return el;
  }
  function money(n, d) { return Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: d === undefined ? 2 : d, maximumFractionDigits: d === undefined ? 2 : d }); }
  function grams(n) { var v = Number(n || 0); return v.toLocaleString("en-IN", { maximumFractionDigits: 3 }); }
  function fdate(s) { if (!s) return "—"; var p = String(s).slice(0, 10).split("-"); return p.length === 3 ? p[2] + "/" + p[1] + "/" + p[0] : s; }
  function esc(s) { return String(s === null || s === undefined ? "" : s).replace(/[&<>"']/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]; }); }
  function toast(msg, bad) {
    var old = document.getElementById("toast"); if (old) old.remove();
    var t = h("div", { id: "toast", class: "msg " + (bad ? "err" : "ok"), style: "position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:99;box-shadow:0 6px 24px rgba(0,0,0,.16)" }, msg);
    document.body.appendChild(t); setTimeout(function () { t.remove(); }, 4200);
  }
  function chipFor(s) {
    var k = String(s || "").toLowerCase();
    var cls = k === "paid" || k === "in stock" || k === "completed" ? "green"
      : k === "partial" || k === "in progress" ? "amber"
      : k === "unpaid" || k === "pending" ? "red" : "grey";
    return h("span", { class: "chip " + cls, text: s });
  }
  function chanChip(c) {
    var m = { b2c_online: "gold", b2c_offline: "grey", b2b: "green" };
    var lbl = { b2c_online: "Online retail", b2c_offline: "Counter retail", b2b: "Wholesale" };
    return h("span", { class: "chip " + (m[c] || "grey"), text: lbl[c] || c });
  }

  /* ── shell ───────────────────────────────────────────────────────────── */
  var NAV = [
    ["", "Dashboard", "▦"], ["bills", "Bills", "▤"], ["new", "New Bill", "✚"],
    ["stock", "Stock", "⚖"], ["parties", "Parties", "☺"], ["khata", "Khata", "≡"],
    ["expenses", "Expenses", "₹"], ["reports", "Reports", "◔"], ["settings", "Settings", "⚙"]
  ];

  function shell(active, content) {
    root.innerHTML = "";
    var nav = h("nav", { class: "nav" }, NAV.map(function (n) {
      return h("a", { href: "#/" + n[0], class: active === n[0] ? "on" : "" },
        h("span", { class: "ic", text: n[2] }), n[1]);
    }));
    var side = h("aside", { class: "side" },
      h("div", { class: "brand" }, h("span", { class: "gem", text: "◈" }),
        h("div", {}, h("b", { text: S.settings && S.settings.shop_name ? S.settings.shop_name : "Shivaa" }), h("small", { text: "Billing" }))),
      nav, h("div", { class: "spacer" }),
      h("div", { class: "who" }, "Signed in as " + (S.user ? S.user.email : ""),
        h("button", { onclick: logout, text: "Sign out" })));
    root.appendChild(h("div", { class: "layout" }, side, h("main", { class: "main" }, content)));
  }
  function head(title, sub, actions) {
    return h("div", { class: "top" }, h("div", {}, h("h1", { text: title }), sub ? h("p", { text: sub }) : null),
      h("div", { class: "bar" }, actions || []));
  }

  /* ── login ───────────────────────────────────────────────────────────── */
  function loginView(errMsg) {
    root.innerHTML = "";
    var email = h("input", { type: "email", autocomplete: "username", required: true });
    var pass = h("input", { type: "password", autocomplete: "current-password", required: true });
    var err = errMsg ? h("div", { class: "msg err", text: errMsg }) : null;
    function submit(e) {
      e.preventDefault();
      api("login", { method: "POST", body: { email: email.value.trim(), password: pass.value } })
        .then(function (j) { S.csrf = j.csrf; boot(true); })
        .catch(function (x) { loginView(x.message); });
    }
    var form = h("form", { onsubmit: submit },
      h("label", { class: "f", text: "Email" }), email,
      h("label", { class: "f", style: "margin-top:12px", text: "Password" }), pass,
      h("button", { class: "btn pri", style: "width:100%;margin-top:18px", text: "Sign in" }));
    root.appendChild(h("div", { class: "auth" },
      h("div", { class: "card" },
        h("div", { class: "brand", style: "padding:0 0 14px" }, h("span", { class: "gem", text: "◈" }),
          h("div", {}, h("b", { text: "Shivaa Billing" }))),
        h("h1", { text: "Sign in" }), h("p", { class: "sub", text: "Showroom billing & stock" }),
        err, form)));
    setTimeout(function () { email.focus(); }, 50);
  }
  function logout() {
    api("logout", { method: "POST" }).catch(function () {}).then(function () { S.user = null; loginView(); });
  }

  /* ── dashboard ───────────────────────────────────────────────────────── */
  function dashboard() {
    var box = h("div", {}, head("Dashboard", "Everything the shop has taken, online and over the counter"), h("div", { class: "grid g4" }, h("div", { class: "card", text: "Loading…" })));
    api("dashboard").then(function (d) {
      var c = d.channels;
      var kpis = h("div", { class: "grid g4" },
        h("div", { class: "card kpi gold big" }, h("div", { class: "lbl", text: "Cumulative revenue" }),
          h("div", { class: "val", text: "₹" + money(d.cumulative, 0) }),
          h("div", { class: "sub", text: "billing + website orders" })),
        h("div", { class: "card kpi" }, h("div", { class: "lbl", text: "Billing total" }),
          h("div", { class: "val", text: "₹" + money(d.billingTotal, 0) }),
          h("div", { class: "sub", text: d.billingBills + " bills" })),
        h("div", { class: "card kpi" }, h("div", { class: "lbl", text: "Website orders" }),
          h("div", { class: "val", text: "₹" + money(d.shopOnline && d.shopOnline.total || 0, 0) }),
          h("div", { class: "sub", text: d.shopOnline && d.shopOnline.available ? (d.shopOnline.count + " paid orders") : "not readable" })),
        h("div", { class: "card kpi" }, h("div", { class: "lbl", text: "Outstanding" }),
          h("div", { class: "val", text: "₹" + money(d.billingDue, 0) }),
          h("div", { class: "sub", text: d.openDues + " unpaid bills" })));

      var chanCard = h("div", { class: "card" }, h("h2", { text: "By channel" }),
        h("div", { class: "tw", style: "margin-top:10px" },
          h("table", { class: "t" },
            h("thead", {}, h("tr", {}, h("th", { text: "Channel" }), h("th", { class: "num", text: "Bills" }),
              h("th", { class: "num", text: "Revenue" }), h("th", { class: "num", text: "Due" }))),
            h("tbody", {}, Object.keys(c).map(function (k) {
              return h("tr", {}, h("td", {}, chanChip(k)), h("td", { class: "num mono", text: c[k].bills }),
                h("td", { class: "num mono", text: "₹" + money(c[k].total) }),
                h("td", { class: "num mono", text: "₹" + money(c[k].due) }));
            })))));

      var st = d.stock;
      var stockCard = h("div", { class: "card" }, h("h2", { text: "Stock" }),
        h("div", { class: "grid g3", style: "margin-top:10px" },
          h("div", {}, h("div", { class: "lbl", style: "font-size:12px;color:var(--ink-3);text-transform:uppercase;font-weight:600", text: "In the shop" }),
            h("div", { style: "font-size:20px;font-weight:650", text: st.pcs + " pcs" }),
            h("div", { class: "mut", style: "font-size:13px", text: grams(st.grams) + " g fine" })),
          h("div", {}, h("div", { style: "font-size:12px;color:var(--ink-3);text-transform:uppercase;font-weight:600", text: "On the website" }),
            h("div", { style: "font-size:20px;font-weight:650", text: st.online + " pcs" }),
            h("div", { class: "mut", style: "font-size:13px", text: "available to order" })),
          h("div", {}, h("div", { style: "font-size:12px;color:var(--ink-3);text-transform:uppercase;font-weight:600", text: "Designs tracked" }),
            h("div", { style: "font-size:20px;font-weight:650", text: st.items }),
            h("div", { class: "mut", style: "font-size:13px", text: "in the ledger" }))));

      box.innerHTML = "";
      box.appendChild(head("Dashboard", "Everything the shop has taken, online and over the counter",
        [h("a", { class: "btn pri", href: "#/new", text: "✚ New bill" })]));
      box.appendChild(kpis);
      box.appendChild(h("div", { class: "grid g2", style: "margin-top:14px" }, chanCard, stockCard));
    }).catch(function (e) { box.innerHTML = ""; box.appendChild(head("Dashboard")); box.appendChild(h("div", { class: "msg err", text: e.message })); });
    return box;
  }

  /* ── bills list ──────────────────────────────────────────────────────── */
  function bills() {
    var box = h("div", {});
    var filter = "all";
    function load() {
      box.innerHTML = "";
      box.appendChild(head("Bills", "Counter sales, website orders and wholesale — all in one book",
        [h("a", { class: "btn pri", href: "#/new", text: "✚ New bill" })]));
      var seg = h("div", { class: "seg" }, [["all", "All"], ["b2c_offline", "Counter"], ["b2c_online", "Online"], ["b2b", "Wholesale"]].map(function (o) {
        return h("button", { class: filter === o[0] ? "on" : "", text: o[1], onclick: function () { filter = o[0]; load(); } });
      }));
      var holder = h("div", { class: "card", text: "Loading…" });
      box.appendChild(h("div", { class: "bar", style: "margin-bottom:12px" }, seg));
      box.appendChild(holder);
      api("bills" + (filter === "all" ? "" : "&channel=" + filter)).then(function (d) {
        holder.innerHTML = "";
        if (!d.bills.length) { holder.appendChild(h("p", { class: "mut", text: "No bills yet." })); return; }
        holder.appendChild(h("div", { class: "tw" }, h("table", { class: "t" },
          h("thead", {}, h("tr", {}, h("th", { text: "Bill" }), h("th", { text: "Date" }), h("th", { text: "Party" }),
            h("th", { text: "Channel" }), h("th", { class: "num", text: "Total" }),
            h("th", { class: "num", text: "Due" }), h("th", { text: "Status" }))),
          h("tbody", {}, d.bills.map(function (b) {
            return h("tr", { style: "cursor:pointer", onclick: function () { location.hash = "#/bill/" + b.id; } },
              h("td", { class: "mono", text: b.bill_no }), h("td", { class: "mut", text: fdate(b.bill_date) }),
              h("td", { text: b.party_name }), h("td", {}, chanChip(b.channel)),
              h("td", { class: "num mono", text: "₹" + money(b.grand_total) }),
              h("td", { class: "num mono", text: "₹" + money(b.balance_due) }),
              h("td", {}, chipFor(b.status)));
          })))));
      }).catch(function (e) { holder.innerHTML = ""; holder.appendChild(h("div", { class: "msg err", text: e.message })); });
    }
    load(); return box;
  }

  /* ── new bill ────────────────────────────────────────────────────────── */
  function newBill() {
    var box = h("div", {}, head("New bill", "Weights in grams, GST on the taxable value, old metal deducted"));
    box.appendChild(h("div", { class: "card", text: "Loading…" }));

    Promise.all([api("parties"), api("items"), api("settings")]).then(function (res) {
      var parties = res[0].parties, items = res[1].items;
      S.settings = res[2].settings || S.settings;
      var gstPct = Number(S.settings && S.settings.gst_percent || 3);
      var rows = [], oldRows = [], payRows = [];

      var partySel = h("select", {}, [h("option", { value: "", text: "— select —" })].concat(
        parties.map(function (p) { return h("option", { value: p.id, text: p.name + (p.kind === "jeweller" ? " (jeweller)" : "") + (p.phone ? " · " + p.phone : "") }); })));
      var chanSel = h("select", {}, Object.keys(S.meta.channels).map(function (k) { return h("option", { value: k, text: S.meta.channels[k] }); }));
      chanSel.value = "b2c_offline";
      var typeSel = h("select", {}, [h("option", { value: "GST", text: "GST invoice" }), h("option", { value: "Estimate", text: "Estimate (no GST)" })]);
      var discType = h("select", {}, [h("option", { value: "%", text: "%" }), h("option", { value: "Rs", text: "₹" })]);
      var discVal = h("input", { type: "number", step: "0.01", value: "0" });
      var roundOff = h("input", { type: "number", step: "0.01", value: "0" });
      var notes = h("textarea", { placeholder: "Optional note on the bill" });

      function lineTotal(r) {
        var t = Number(r.total && r.total.value || 0);
        if (t > 0) return t;
        var net = Number(r.netWt.value || 0), rate = Number(r.rate.value || 0),
            making = Number(r.making.value || 0), pcs = Math.max(1, Number(r.pieces.value || 1));
        return Math.round((net * rate + making) * pcs * 100) / 100;
      }
      function totals() {
        var sub = rows.reduce(function (s, r) { return s + lineTotal(r); }, 0);
        var dt = discType.value, dv = Number(discVal.value || 0);
        var disc = dt === "Rs" ? dv : sub * (dv / 100);
        var taxable = sub - disc;
        var gst = typeSel.value === "GST" ? taxable * (gstPct / 100) : 0;
        var old = oldRows.reduce(function (s, r) { return s + Number(r.total.value || 0); }, 0);
        var ro = Number(roundOff.value || 0);
        var gt = Math.round(taxable + gst - old + ro);
        var paid = payRows.reduce(function (s, r) { return s + Number(r.amount.value || 0); }, 0);
        return { sub: sub, disc: disc, taxable: taxable, gst: gst, cgst: gst / 2, sgst: gst / 2, old: old, gt: gt, paid: paid, due: Math.max(0, gt - paid) };
      }
      var out = {};
      function paint() {
        var t = totals();
        [["sub", t.sub], ["disc", -t.disc], ["taxable", t.taxable], ["gst", t.gst], ["old", -t.old], ["gt", t.gt], ["due", t.due]].forEach(function (p) {
          if (out[p[0]]) out[p[0]].textContent = "₹" + money(p[1]);
        });
        if (out.cgst) out.cgst.textContent = "₹" + money(t.cgst) + " + ₹" + money(t.sgst);
        if (out.gstRow) out.gstRow.style.display = typeSel.value === "GST" ? "flex" : "none";
      }
      function itemRow(seed) {
        var r = {};
        r.itemId = h("select", {}, [h("option", { value: "0", text: "— free entry —" })].concat(items.map(function (i) {
          return h("option", { value: i.id, text: i.name + " · " + grams(i.net_wt) + "g" + (i.physical_pcs > 0 ? " · " + i.physical_pcs + " in shop" : "") });
        })));
        r.name = h("input", { placeholder: "Item name" });
        r.netWt = h("input", { type: "number", step: "0.001", value: "0" });
        r.pieces = h("input", { type: "number", step: "1", value: "1" });
        r.rate = h("input", { type: "number", step: "0.01", value: String(S.settings && S.settings.gold_rate || 0) });
        r.making = h("input", { type: "number", step: "0.01", value: "0" });
        r.total = h("input", { type: "number", step: "0.01", placeholder: "auto" });
        r.itemId.addEventListener("change", function () {
          var it = items.filter(function (x) { return String(x.id) === r.itemId.value; })[0];
          if (!it) return;
          r.name.value = it.name; r.netWt.value = Number(it.net_wt || 0);
          r.rate.value = Number(S.settings && S.settings.gold_rate || 0);
          r._meta = { huid: it.huid, metal: it.metal, purity: it.purity };
          paint();
        });
        [r.netWt, r.pieces, r.rate, r.making, r.total].forEach(function (el) { el.addEventListener("input", paint); });
        if (seed) { r.itemId.value = String(seed.id); r.itemId.dispatchEvent(new Event("change")); }
        var tr = h("tr", {}, h("td", {}, r.itemId), h("td", {}, r.name), h("td", {}, r.netWt),
          h("td", {}, r.pieces), h("td", {}, r.rate), h("td", {}, r.making), h("td", {}, r.total),
          h("td", {}, h("button", { class: "del", text: "✕", onclick: function () {
            rows = rows.filter(function (x) { return x !== r; }); tr.remove(); paint();
          } })));
        r.tr = tr; rows.push(r); tbody.appendChild(tr); paint();
      }
      function oldRow() {
        var r = {};
        r.metal = h("select", {}, [h("option", { text: "Gold" }), h("option", { text: "Silver" })]);
        r.netWt = h("input", { type: "number", step: "0.001", value: "0" });
        r.rate = h("input", { type: "number", step: "0.01", value: "0" });
        r.total = h("input", { type: "number", step: "0.01", value: "0" });
        r.total.addEventListener("input", paint);
        var tr = h("tr", {}, h("td", {}, r.metal), h("td", {}, r.netWt), h("td", {}, r.rate), h("td", {}, r.total),
          h("td", {}, h("button", { class: "del", text: "✕", onclick: function () {
            oldRows = oldRows.filter(function (x) { return x !== r; }); tr.remove(); paint();
          } })));
        oldRows.push(r); oldBody.appendChild(tr); paint();
      }
      function payRow() {
        var r = {};
        r.amount = h("input", { type: "number", step: "0.01", value: "0" });
        r.mode = h("select", {}, S.meta.modes.map(function (m) { return h("option", { text: m }); }));
        r.amount.addEventListener("input", paint);
        var tr = h("tr", {}, h("td", {}, r.amount), h("td", {}, r.mode),
          h("td", {}, h("button", { class: "del", text: "✕", onclick: function () {
            payRows = payRows.filter(function (x) { return x !== r; }); tr.remove(); paint();
          } })));
        payRows.push(r); payBody.appendChild(tr); paint();
      }

      var tbody = h("tbody", {}), oldBody = h("tbody", {}), payBody = h("tbody", {});
      ["sub", "disc", "taxable", "gst", "old", "gt", "due"].forEach(function (k) { out[k] = h("span", { class: "mono" }); });
      out.cgst = h("span", { class: "mono mut", style: "font-size:12px" });
      out.gstRow = h("div", {}, h("span", { class: "mut", text: "GST " + gstPct + "%" }), out.cgst);

      var totalsBox = h("div", { class: "totals" },
        h("div", {}, h("span", { text: "Subtotal" }), out.sub),
        h("div", {}, h("span", { text: "Discount" }), out.disc),
        h("div", {}, h("span", { class: "mut", text: "Taxable" }), out.taxable),
        out.gstRow,
        h("div", {}, h("span", { class: "mut", text: "Old metal" }), out.old),
        h("div", { class: "gt" }, h("span", { text: "Grand total" }), out.gt),
        h("div", {}, h("span", { class: "mut", text: "Balance due" }), out.due));

      var itemsCard = h("div", { class: "card" }, h("h2", { text: "Items" }),
        h("div", { class: "items", style: "margin-top:10px" },
          h("table", {}, h("thead", {}, h("tr", {},
            h("th", { text: "From stock" }), h("th", { text: "Name" }), h("th", { text: "Net g" }),
            h("th", { text: "Pcs" }), h("th", { text: "Rate ₹/g" }), h("th", { text: "Making ₹" }),
            h("th", { text: "Total ₹" }), h("th", {}))), tbody)),
        h("button", { class: "btn sm", style: "margin-top:10px", text: "+ Add item", onclick: function () { itemRow(); } }));

      var oldCard = h("div", { class: "card" }, h("h2", { text: "Old metal received" }),
        h("p", { class: "mut", style: "font-size:13px;margin:4px 0 10px", text: "Deducted from the bill total." }),
        h("div", { class: "items" }, h("table", {}, h("thead", {}, h("tr", {},
          h("th", { text: "Metal" }), h("th", { text: "Net g" }), h("th", { text: "Rate ₹/g" }), h("th", { text: "Value ₹" }), h("th", {}))), oldBody)),
        h("button", { class: "btn sm", style: "margin-top:10px", text: "+ Add old metal", onclick: oldRow }));

      var payCard = h("div", { class: "card" }, h("h2", { text: "Payment received" }),
        h("div", { class: "items", style: "margin-top:10px" }, h("table", {}, h("thead", {}, h("tr", {},
          h("th", { text: "Amount ₹" }), h("th", { text: "Mode" }), h("th", {}))), payBody)),
        h("button", { class: "btn sm", style: "margin-top:10px", text: "+ Add payment", onclick: payRow }));

      var save = h("button", { class: "btn pri", text: "Save bill", onclick: function () {
        if (!partySel.value) return toast("Select a customer or jeweller first.", true);
        if (!rows.length) return toast("Add at least one item.", true);
        save.disabled = true; save.textContent = "Saving…";
        api("bills", { method: "POST", body: {
          partyId: Number(partySel.value), channel: chanSel.value, docType: typeSel.value,
          discountType: discType.value, discountValue: Number(discVal.value || 0),
          roundOff: Number(roundOff.value || 0), notes: notes.value,
          items: rows.map(function (r) {
            var m = r._meta || {};
            return { itemId: Number(r.itemId.value || 0), name: r.name.value, huid: m.huid || "",
              metal: m.metal || "Gold", purity: m.purity || "", netWt: Number(r.netWt.value || 0),
              pieces: Number(r.pieces.value || 1), rate: Number(r.rate.value || 0),
              making: Number(r.making.value || 0), totalCost: lineTotal(r) };
          }),
          oldMetals: oldRows.map(function (r) { return { metal: r.metal.value, netWt: Number(r.netWt.value || 0), rate: Number(r.rate.value || 0), totalCost: Number(r.total.value || 0) }; }),
          payments: payRows.filter(function (r) { return Number(r.amount.value || 0) > 0; })
            .map(function (r) { return { amount: Number(r.amount.value), mode: r.mode.value }; })
        } }).then(function (j) { toast("Saved " + j.billNo); location.hash = "#/bill/" + j.id; })
          .catch(function (e) { save.disabled = false; save.textContent = "Save bill"; toast(e.message, true); });
      } });

      box.innerHTML = "";
      box.appendChild(head("New bill", "Weights in grams, GST on the taxable value, old metal deducted"));
      box.appendChild(h("div", { class: "card" },
        h("div", { class: "row r4" },
          h("div", { class: "fld" }, h("label", { class: "f", text: "Customer / jeweller" }), partySel),
          h("div", { class: "fld" }, h("label", { class: "f", text: "Channel" }), chanSel),
          h("div", { class: "fld" }, h("label", { class: "f", text: "Document" }), typeSel),
          h("div", { class: "fld" }, h("label", { class: "f", text: "Date" }),
            h("input", { type: "date", value: new Date().toISOString().slice(0, 10), id: "billDate" })))));
      box.appendChild(itemsCard);
      box.appendChild(h("div", { class: "grid g2" }, oldCard, payCard));
      box.appendChild(h("div", { class: "grid g2" },
        h("div", { class: "card" }, h("h2", { text: "Discount & rounding" }),
          h("div", { class: "row r3", style: "margin-top:10px" },
            h("div", { class: "fld" }, h("label", { class: "f", text: "Type" }), discType),
            h("div", { class: "fld" }, h("label", { class: "f", text: "Value" }), discVal),
            h("div", { class: "fld" }, h("label", { class: "f", text: "Round off" }), roundOff)),
          h("label", { class: "f", text: "Note" }), notes),
        h("div", { class: "card" }, h("h2", { text: "Totals" }), h("div", { style: "margin-top:10px" }, totalsBox),
          h("div", { class: "bar", style: "margin-top:14px" }, save))));
      [discVal, roundOff].forEach(function (el) { el.addEventListener("input", paint); });
      discType.addEventListener("change", paint); typeSel.addEventListener("change", paint);
      itemRow(); payRow(); paint();
    }).catch(function (e) { box.innerHTML = ""; box.appendChild(head("New bill")); box.appendChild(h("div", { class: "msg err", text: e.message })); });
    return box;
  }

  /* ── bill detail ─────────────────────────────────────────────────────── */
  function billView(id) {
    var box = h("div", {});
    api("bills/" + id).then(function (d) {
      var b = d.bill, sh = d.shop || {};
      var itemRows = (b.items || []).map(function (i) {
        return h("tr", {}, h("td", { text: i.name + (i.huid ? " · " + i.huid : "") }),
          h("td", { text: i.metal + " " + i.purity }), h("td", { class: "num mono", text: grams(i.netWt) }),
          h("td", { class: "num mono", text: i.pieces }), h("td", { class: "num mono", text: money(i.rate) }),
          h("td", { class: "num mono", text: money(i.totalCost) }));
      });
      var doc = h("div", { class: "doc" },
        h("div", { class: "hd" },
          h("div", {}, h("h1", { text: sh.shop_name || "Shivaa Jewellers" }),
            h("p", { class: "mut", style: "font-size:13px", text: (sh.address || "") + (sh.phone ? " · " + sh.phone : "") }),
            sh.gstin ? h("p", { class: "mut", style: "font-size:13px", text: "GSTIN " + sh.gstin }) : null),
          h("div", { style: "text-align:right" },
            h("h2", { text: b.doc_type === "GST" ? "TAX INVOICE" : "ESTIMATE" }),
            h("p", { class: "mono", text: b.bill_no }),
            h("p", { class: "mut", style: "font-size:13px", text: fdate(b.bill_date) }),
            h("div", { style: "margin-top:6px" }, chanChip(b.channel)))),
        h("div", { style: "margin-bottom:12px" }, h("b", { text: b.party_name }),
          b.party_phone ? h("span", { class: "mut", text: " · " + b.party_phone }) : null),
        h("table", {}, h("thead", {}, h("tr", {}, h("th", { text: "Item" }), h("th", { text: "Metal" }),
          h("th", { class: "num", text: "Net g" }), h("th", { class: "num", text: "Pcs" }),
          h("th", { class: "num", text: "Rate" }), h("th", { class: "num", text: "Amount" }))),
          h("tbody", {}, itemRows)),
        h("div", { style: "display:flex;justify-content:flex-end;margin-top:12px" },
          h("div", { class: "totals" },
            h("div", {}, h("span", { text: "Subtotal" }), h("span", { class: "mono", text: "₹" + money(b.subtotal) })),
            Number(b.discount_amount) ? h("div", {}, h("span", { text: "Discount" }), h("span", { class: "mono", text: "−₹" + money(b.discount_amount) })) : null,
            h("div", {}, h("span", { class: "mut", text: "Taxable" }), h("span", { class: "mono", text: "₹" + money(b.taxable) })),
            b.doc_type === "GST" ? h("div", {}, h("span", { class: "mut", text: "CGST + SGST" }),
              h("span", { class: "mono", text: "₹" + money(b.gst_amount / 2) + " + ₹" + money(b.gst_amount / 2) })) : null,
            Number(b.old_metal_deduction) ? h("div", {}, h("span", { class: "mut", text: "Old metal" }), h("span", { class: "mono", text: "−₹" + money(b.old_metal_deduction) })) : null,
            h("div", { class: "gt" }, h("span", { text: "Grand total" }), h("span", { class: "mono", text: "₹" + money(b.grand_total) })),
            h("div", {}, h("span", { class: "mut", text: "Paid" }), h("span", { class: "mono", text: "₹" + money(b.amount_paid) })),
            h("div", {}, h("span", { class: "mut", text: "Balance" }), h("span", { class: "mono", text: "₹" + money(b.balance_due) })))),
        h("p", { class: "words", text: d.inWords }));

      var amt = h("input", { type: "number", step: "0.01", placeholder: "0.00" });
      var mode = h("select", {}, S.meta.modes.map(function (m) { return h("option", { text: m }); }));
      box.appendChild(head(b.bill_no, fdate(b.bill_date) + " · " + b.party_name,
        [h("button", { class: "btn", text: "Print", onclick: function () { window.print(); } }),
         h("a", { class: "btn", href: "#/bills", text: "Back" })]));
      box.appendChild(h("div", { class: "bar no-print", style: "margin-bottom:12px" },
        h("span", { text: "Receive payment:" }), amt, mode,
        h("button", { class: "btn pri sm", text: "Record", onclick: function () {
          api("bills/" + id + "/payment", { method: "POST", body: { amount: Number(amt.value || 0), mode: mode.value } })
            .then(function () { toast("Payment recorded"); billView(id).replaceWith(box = box); location.reload(); })
            .catch(function (e) { toast(e.message, true); });
        } }), chipFor(b.status)));
      box.appendChild(doc);
    }).catch(function (e) { box.appendChild(head("Bill")); box.appendChild(h("div", { class: "msg err", text: e.message })); });
    return box;
  }

  /* ── stock ───────────────────────────────────────────────────────────── */
  function stock() {
    var box = h("div", {});
    function load() {
      box.innerHTML = "";
      box.appendChild(head("Stock", "Pieces and grams side by side — online and in the shop",
        [h("button", { class: "btn pri", text: "+ Add item", onclick: form })]));
      var holder = h("div", { class: "card", text: "Loading…" });
      box.appendChild(holder);
      api("items").then(function (d) {
        holder.innerHTML = "";
        if (!d.items.length) { holder.appendChild(h("p", { class: "mut", text: "No stock yet. Add your first piece." })); return; }
        holder.appendChild(h("div", { class: "tw" }, h("table", { class: "t" },
          h("thead", {}, h("tr", {}, h("th", { text: "Item" }), h("th", { text: "Metal" }),
            h("th", { class: "num", text: "Net g / pc" }), h("th", { class: "num", text: "Shop pcs" }),
            h("th", { class: "num", text: "Shop grams" }), h("th", { class: "num", text: "Online" }),
            h("th", { text: "Fulfilment" }), h("th", {}))),
          h("tbody", {}, d.items.map(function (i) {
            return h("tr", {}, h("td", {}, h("b", { text: i.name }), i.sku ? h("div", { class: "mut", style: "font-size:12px", text: i.sku }) : null),
              h("td", { class: "mut", text: i.metal + " " + i.purity }),
              h("td", { class: "num mono", text: grams(i.net_wt) }),
              h("td", { class: "num mono", text: i.physical_pcs }),
              h("td", { class: "num mono", text: grams(i.physical_grams) }),
              h("td", { class: "num mono", text: i.online_stock }),
              h("td", {}, h("span", { class: "chip " + (i.fulfilment === "ready" ? "green" : "amber"), text: i.fulfilment === "ready" ? "Ready" : "Made to order" })),
              h("td", {}, h("button", { class: "btn sm", text: "Adjust", onclick: function () { move(i); } })));
          })))));
      }).catch(function (e) { holder.innerHTML = ""; holder.appendChild(h("div", { class: "msg err", text: e.message })); });
    }
    function form() {
      var f = {};
      f.name = h("input", { placeholder: "e.g. Antique gold ring" });
      f.category = h("select", {}, S.meta.categories.map(function (c) { return h("option", { text: c }); }));
      f.metal = h("select", {}, [h("option", { text: "Gold" }), h("option", { text: "Silver" })]);
      f.purity = h("select", {}, S.meta.purities.map(function (p) { return h("option", { text: p }); }));
      f.purity.value = "22K (916)";
      f.grossWt = h("input", { type: "number", step: "0.001", value: "0" });
      f.lessWt = h("input", { type: "number", step: "0.001", value: "0" });
      f.stoneWt = h("input", { type: "number", step: "0.001", value: "0" });
      f.netWt = h("input", { type: "number", step: "0.001", placeholder: "auto" });
      f.physicalPcs = h("input", { type: "number", step: "1", value: "0" });
      f.onlineStock = h("input", { type: "number", step: "1", value: "0" });
      f.fulfilment = h("select", {}, [h("option", { value: "ready", text: "Ready stock — in the tray" }),
        h("option", { value: "made_to_order", text: "Made to order — produced after sale" })]);
      f.sku = h("input", {}); f.huid = h("input", {}); f.makingPerG = h("input", { type: "number", step: "0.01", value: "0" });
      var save = h("button", { class: "btn pri", text: "Save item", onclick: function () {
        if (!f.name.value.trim()) return toast("Give the item a name.", true);
        save.disabled = true;
        api("items", { method: "POST", body: {
          name: f.name.value.trim(), category: f.category.value, metal: f.metal.value, purity: f.purity.value,
          grossWt: Number(f.grossWt.value || 0), lessWt: Number(f.lessWt.value || 0), stoneWt: Number(f.stoneWt.value || 0),
          netWt: Number(f.netWt.value || 0), physicalPcs: Number(f.physicalPcs.value || 0),
          onlineStock: Number(f.onlineStock.value || 0), fulfilment: f.fulfilment.value,
          sku: f.sku.value.trim(), huid: f.huid.value.trim(), makingPerG: Number(f.makingPerG.value || 0)
        } }).then(function () { toast("Item added"); load(); })
          .catch(function (e) { save.disabled = false; toast(e.message, true); });
      } });
      box.innerHTML = "";
      box.appendChild(head("Add item", "Net weight is derived from gross less stones if you leave it blank",
        [h("button", { class: "btn", text: "Back", onclick: load })]));
      box.appendChild(h("div", { class: "card" },
        h("div", { class: "row r2" },
          h("div", { class: "fld" }, h("label", { class: "f", text: "Name" }), f.name),
          h("div", { class: "fld" }, h("label", { class: "f", text: "Category" }), f.category)),
        h("div", { class: "row r4" },
          h("div", { class: "fld" }, h("label", { class: "f", text: "Metal" }), f.metal),
          h("div", { class: "fld" }, h("label", { class: "f", text: "Purity" }), f.purity),
          h("div", { class: "fld" }, h("label", { class: "f", text: "SKU" }), f.sku),
          h("div", { class: "fld" }, h("label", { class: "f", text: "HUID" }), f.huid)),
        h("div", { class: "row r4" },
          h("div", { class: "fld" }, h("label", { class: "f", text: "Gross g" }), f.grossWt),
          h("div", { class: "fld" }, h("label", { class: "f", text: "Less g" }), f.lessWt),
          h("div", { class: "fld" }, h("label", { class: "f", text: "Stone g" }), f.stoneWt),
          h("div", { class: "fld" }, h("label", { class: "f", text: "Net g" }), f.netWt)),
        h("div", { class: "row r3" },
          h("div", { class: "fld" }, h("label", { class: "f", text: "Pieces in the shop" }), f.physicalPcs),
          h("div", { class: "fld" }, h("label", { class: "f", text: "Pieces on the website" }), f.onlineStock),
          h("div", { class: "fld" }, h("label", { class: "f", text: "Making ₹/g" }), f.makingPerG)),
        h("div", { class: "row" }, h("div", { class: "fld" }, h("label", { class: "f", text: "Fulfilment" }), f.fulfilment,
          h("div", { class: "hint", text: "A made-to-order sale never reduces the tray, because the piece does not exist yet." }))),
        h("div", { class: "bar", style: "margin-top:14px" }, save)));
    }
    function move(i) {
      var pcs = h("input", { type: "number", step: "1", value: "0" });
      var g = h("input", { type: "number", step: "0.001", value: "0" });
      var ch = h("select", {}, ["correction", "purchase", "karigar", "offline_b2c", "online_b2c", "offline_b2b"].map(function (c) { return h("option", { value: c, text: c }); }));
      var note = h("input", { placeholder: "Why?" });
      box.innerHTML = "";
      box.appendChild(head("Adjust " + i.name, "Now " + i.physical_pcs + " pcs · " + grams(i.physical_grams) + " g",
        [h("button", { class: "btn", text: "Back", onclick: load })]));
      box.appendChild(h("div", { class: "card" },
        h("div", { class: "row r4" },
          h("div", { class: "fld" }, h("label", { class: "f", text: "Change in pieces (±)" }), pcs),
          h("div", { class: "fld" }, h("label", { class: "f", text: "Change in grams (±)" }), g),
          h("div", { class: "fld" }, h("label", { class: "f", text: "Channel" }), ch),
          h("div", { class: "fld" }, h("label", { class: "f", text: "Note" }), note)),
        h("div", { class: "bar" }, h("button", { class: "btn pri", text: "Record movement", onclick: function () {
          api("stock", { method: "POST", body: { itemId: i.id, deltaPcs: Number(pcs.value || 0), deltaGrams: Number(g.value || 0), channel: ch.value, note: note.value } })
            .then(function () { toast("Recorded"); load(); }).catch(function (e) { toast(e.message, true); });
        } }))));
    }
    load(); return box;
  }

  /* ── parties ─────────────────────────────────────────────────────────── */
  function parties() {
    var box = h("div", {});
    function load() {
      box.innerHTML = "";
      box.appendChild(head("Parties", "Retail customers, wholesale jewellers, suppliers and karigars",
        [h("button", { class: "btn pri", text: "+ Add party", onclick: form })]));
      var holder = h("div", { class: "card", text: "Loading…" });
      box.appendChild(holder);
      api("parties").then(function (d) {
        holder.innerHTML = "";
        if (!d.parties.length) { holder.appendChild(h("p", { class: "mut", text: "No parties yet." })); return; }
        holder.appendChild(h("div", { class: "tw" }, h("table", { class: "t" },
          h("thead", {}, h("tr", {}, h("th", { text: "Name" }), h("th", { text: "Kind" }), h("th", { text: "Phone" }),
            h("th", { text: "City" }), h("th", { text: "GSTIN / PAN" }), h("th", { class: "num", text: "Credit days" }))),
          h("tbody", {}, d.parties.map(function (p) {
            return h("tr", {}, h("td", { text: p.name }),
              h("td", {}, h("span", { class: "chip " + (p.kind === "jeweller" ? "green" : "grey"), text: p.kind })),
              h("td", { class: "mut", text: p.phone || "—" }), h("td", { class: "mut", text: p.city || "—" }),
              h("td", { class: "mut mono", text: p.gstin || p.pan || "—" }),
              h("td", { class: "num mono", text: p.credit_days || "—" }));
          })))));
      }).catch(function (e) { holder.innerHTML = ""; holder.appendChild(h("div", { class: "msg err", text: e.message })); });
    }
    function form() {
      var f = {};
      f.kind = h("select", {}, [["customer", "Retail customer"], ["jeweller", "Wholesale jeweller"], ["supplier", "Supplier"], ["karigar", "Karigar"]].map(function (o) { return h("option", { value: o[0], text: o[1] }); }));
      f.name = h("input", {}); f.phone = h("input", { type: "tel" }); f.email = h("input", { type: "email" });
      f.address = h("input", {}); f.city = h("input", {}); f.stateCode = h("input", { value: "08" });
      f.pan = h("input", {}); f.gstin = h("input", {}); f.partnerId = h("input", { placeholder: "shop partner id" });
      f.creditDays = h("input", { type: "number", value: "0" }); f.creditLimit = h("input", { type: "number", value: "0" });
      var save = h("button", { class: "btn pri", text: "Save party", onclick: function () {
        if (!f.name.value.trim()) return toast("Name is required.", true);
        save.disabled = true;
        var body = {}; Object.keys(f).forEach(function (k) { body[k] = f[k].value; });
        api("parties", { method: "POST", body: body }).then(function () { toast("Party added"); load(); })
          .catch(function (e) { save.disabled = false; toast(e.message, true); });
      } });
      box.innerHTML = "";
      box.appendChild(head("Add party", null, [h("button", { class: "btn", text: "Back", onclick: load })]));
      box.appendChild(h("div", { class: "card" },
        h("div", { class: "row r2" }, h("div", { class: "fld" }, h("label", { class: "f", text: "Name" }), f.name),
          h("div", { class: "fld" }, h("label", { class: "f", text: "Kind" }), f.kind)),
        h("div", { class: "row r3" }, h("div", { class: "fld" }, h("label", { class: "f", text: "Phone" }), f.phone),
          h("div", { class: "fld" }, h("label", { class: "f", text: "Email" }), f.email),
          h("div", { class: "fld" }, h("label", { class: "f", text: "City" }), f.city)),
        h("div", { class: "row r2" }, h("div", { class: "fld" }, h("label", { class: "f", text: "Address" }), f.address),
          h("div", { class: "fld" }, h("label", { class: "f", text: "State code" }), f.stateCode)),
        h("div", { class: "row r3" }, h("div", { class: "fld" }, h("label", { class: "f", text: "PAN" }), f.pan),
          h("div", { class: "fld" }, h("label", { class: "f", text: "GSTIN" }), f.gstin),
          h("div", { class: "fld" }, h("label", { class: "f", text: "Shop partner id" }), f.partnerId)),
        h("div", { class: "row r2" }, h("div", { class: "fld" }, h("label", { class: "f", text: "Credit days" }), f.creditDays),
          h("div", { class: "fld" }, h("label", { class: "f", text: "Credit limit ₹" }), f.creditLimit)),
        h("div", { class: "bar", style: "margin-top:14px" }, save)));
    }
    load(); return box;
  }

  /* ── khata / expenses / reports / settings ───────────────────────────── */
  function khata() {
    var box = h("div", {}, head("Khata", "Who owes what, net of payments received"), h("div", { class: "card", text: "Loading…" }));
    api("khata").then(function (d) {
      var card = h("div", { class: "card" });
      card.appendChild(h("div", { class: "kpi", style: "margin-bottom:12px" },
        h("div", { class: "lbl", text: "Total outstanding" }),
        h("div", { class: "val", text: "₹" + money(d.totalDue, 0) })));
      if (!d.accounts.length) card.appendChild(h("p", { class: "mut", text: "Nothing outstanding." }));
      else card.appendChild(h("div", { class: "tw" }, h("table", { class: "t" },
        h("thead", {}, h("tr", {}, h("th", { text: "Party" }), h("th", { text: "Phone" }), h("th", { class: "num", text: "Balance" }))),
        h("tbody", {}, d.accounts.map(function (a) {
          return h("tr", {}, h("td", { text: a.name }), h("td", { class: "mut", text: a.phone || "—" }),
            h("td", { class: "num mono", text: "₹" + money(a.balance) }));
        })))));
      box.innerHTML = ""; box.appendChild(head("Khata", "Who owes what, net of payments received")); box.appendChild(card);
    }).catch(function (e) { box.innerHTML = ""; box.appendChild(head("Khata")); box.appendChild(h("div", { class: "msg err", text: e.message })); });
    return box;
  }
  function expenses() {
    var box = h("div", {});
    function load() {
      box.innerHTML = "";
      var cat = h("select", {}, S.meta.expenseCategories.map(function (c) { return h("option", { text: c }); }));
      var amt = h("input", { type: "number", step: "0.01", placeholder: "0.00" });
      var desc = h("input", { placeholder: "What for?" });
      var mode = h("select", {}, S.meta.modes.map(function (m) { return h("option", { text: m }); }));
      box.appendChild(head("Expenses", "Deducted from gross in the report"));
      box.appendChild(h("div", { class: "card" },
        h("div", { class: "row r4" },
          h("div", { class: "fld" }, h("label", { class: "f", text: "Amount ₹" }), amt),
          h("div", { class: "fld" }, h("label", { class: "f", text: "Category" }), cat),
          h("div", { class: "fld" }, h("label", { class: "f", text: "Description" }), desc),
          h("div", { class: "fld" }, h("label", { class: "f", text: "Mode" }), mode)),
        h("button", { class: "btn pri", text: "Add expense", onclick: function () {
          api("expenses", { method: "POST", body: { amount: Number(amt.value || 0), category: cat.value, description: desc.value, paymentMode: mode.value } })
            .then(function () { toast("Expense added"); load(); }).catch(function (e) { toast(e.message, true); });
        } })));
      var holder = h("div", { class: "card", text: "Loading…" }); box.appendChild(holder);
      api("expenses").then(function (d) {
        holder.innerHTML = "";
        holder.appendChild(h("div", { class: "kpi", style: "margin-bottom:12px" },
          h("div", { class: "lbl", text: "Total expenses" }), h("div", { class: "val", text: "₹" + money(d.total, 0) })));
        if (!d.expenses.length) holder.appendChild(h("p", { class: "mut", text: "No expenses recorded." }));
        else holder.appendChild(h("div", { class: "tw" }, h("table", { class: "t" },
          h("thead", {}, h("tr", {}, h("th", { text: "Date" }), h("th", { text: "Category" }), h("th", { text: "Description" }),
            h("th", { text: "Mode" }), h("th", { class: "num", text: "Amount" }))),
          h("tbody", {}, d.expenses.map(function (x) {
            return h("tr", {}, h("td", { class: "mut", text: fdate(x.exp_date) }), h("td", { text: x.category }),
              h("td", { class: "mut", text: x.description || "—" }), h("td", { class: "mut", text: x.payment_mode }),
              h("td", { class: "num mono", text: "₹" + money(x.amount) }));
          })))));
      });
    }
    load(); return box;
  }
  function reports() {
    var box = h("div", {}, head("Reports"), h("div", { class: "card", text: "Loading…" }));
    api("reports").then(function (d) {
      box.innerHTML = "";
      box.appendChild(head("Reports", "Billing plus the website, side by side"));
      box.appendChild(h("div", { class: "grid g4" },
        h("div", { class: "card kpi gold" }, h("div", { class: "lbl", text: "Cumulative" }), h("div", { class: "val", text: "₹" + money(d.cumulative, 0) })),
        h("div", { class: "card kpi" }, h("div", { class: "lbl", text: "Billing gross" }), h("div", { class: "val", text: "₹" + money(d.gross, 0) })),
        h("div", { class: "card kpi" }, h("div", { class: "lbl", text: "Website orders" }), h("div", { class: "val", text: "₹" + money(d.shopOnline.total || 0, 0) })),
        h("div", { class: "card kpi" }, h("div", { class: "lbl", text: "Net of expenses" }), h("div", { class: "val", text: "₹" + money(d.net, 0) }))));
      box.appendChild(h("div", { class: "card", style: "margin-top:14px" }, h("h2", { text: "Billing by channel" }),
        h("div", { class: "tw", style: "margin-top:10px" }, h("table", { class: "t" },
          h("thead", {}, h("tr", {}, h("th", { text: "Channel" }), h("th", { class: "num", text: "Bills" }),
            h("th", { class: "num", text: "Revenue" }), h("th", { class: "num", text: "GST" }))),
          h("tbody", {}, d.byChannel.map(function (r) {
            return h("tr", {}, h("td", {}, chanChip(r.channel)), h("td", { class: "num mono", text: r.n }),
              h("td", { class: "num mono", text: "₹" + money(r.total) }), h("td", { class: "num mono", text: "₹" + money(r.gst) }));
          }))))));
      box.appendChild(h("div", { class: "card" }, h("h2", { text: "GST collected" }),
        h("p", { style: "font-size:22px;font-weight:650;margin-top:6px", text: "₹" + money(d.gstCollected) })));
    }).catch(function (e) { box.innerHTML = ""; box.appendChild(head("Reports")); box.appendChild(h("div", { class: "msg err", text: e.message })); });
    return box;
  }
  function settingsView() {
    var box = h("div", {}, head("Settings"));
    var f = {};
    ["shopName", "tagline", "address", "phone", "gstin", "invoicePrefix", "stateCode"].forEach(function (k) { f[k] = h("input", {}); });
    ["gstPercent", "goldRate", "silverRate"].forEach(function (k) { f[k] = h("input", { type: "number", step: "0.01" }); });
    api("settings").then(function (d) {
      var s = d.settings || {};
      S.settings = s;
      f.shopName.value = s.shop_name || ""; f.tagline.value = s.tagline || "";
      f.address.value = s.address || ""; f.phone.value = s.phone || ""; f.gstin.value = s.gstin || "";
      f.invoicePrefix.value = s.invoice_prefix || "SHV"; f.stateCode.value = s.state_code || "08";
      f.gstPercent.value = Number(s.gst_percent || 3); f.goldRate.value = Number(s.gold_rate || 0);
      f.silverRate.value = Number(s.silver_rate || 0);
    }).catch(function () {});
    box.appendChild(h("div", { class: "card" },
      h("div", { class: "row r2" }, h("div", { class: "fld" }, h("label", { class: "f", text: "Shop name" }), f.shopName),
        h("div", { class: "fld" }, h("label", { class: "f", text: "Tagline" }), f.tagline)),
      h("div", { class: "row" }, h("div", { class: "fld" }, h("label", { class: "f", text: "Address" }), f.address)),
      h("div", { class: "row r3" }, h("div", { class: "fld" }, h("label", { class: "f", text: "Phone" }), f.phone),
        h("div", { class: "fld" }, h("label", { class: "f", text: "GSTIN" }), f.gstin),
        h("div", { class: "fld" }, h("label", { class: "f", text: "State code" }), f.stateCode)),
      h("div", { class: "row r4" },
        h("div", { class: "fld" }, h("label", { class: "f", text: "Bill prefix" }), f.invoicePrefix),
        h("div", { class: "fld" }, h("label", { class: "f", text: "GST %" }), f.gstPercent),
        h("div", { class: "fld" }, h("label", { class: "f", text: "Gold ₹/g" }), f.goldRate),
        h("div", { class: "fld" }, h("label", { class: "f", text: "Silver ₹/g" }), f.silverRate)),
      h("button", { class: "btn pri", style: "margin-top:14px", text: "Save settings", onclick: function () {
        var body = {}; Object.keys(f).forEach(function (k) { body[k] = f[k].value; });
        api("settings", { method: "POST", body: body }).then(function () { toast("Settings saved"); })
          .catch(function (e) { toast(e.message, true); });
      } })));
    return box;
  }

  /* ── router ──────────────────────────────────────────────────────────── */
  function render() {
    var hash = (location.hash || "#/").replace(/^#\//, "");
    var parts = hash.split("/");
    var r = parts[0] || "";
    if (!S.user) return loginView();
    var view;
    if (r === "") view = dashboard();
    else if (r === "bills") view = bills();
    else if (r === "new") view = newBill();
    else if (r === "bill") view = billView(parts[1]);
    else if (r === "stock") view = stock();
    else if (r === "parties") view = parties();
    else if (r === "khata") view = khata();
    else if (r === "expenses") view = expenses();
    else if (r === "reports") view = reports();
    else if (r === "settings") view = settingsView();
    else view = dashboard();
    var active = r === "bill" ? "bills" : r;
    shell(active, view);
    window.scrollTo(0, 0);
  }

  function boot(afterLogin) {
    api("me").then(function (j) {
      S.user = j.user; S.csrf = j.csrf;
      if (!S.user) return loginView();
      api("meta").then(function (m) {
        S.meta = m;
        return api("settings").then(function (s) { S.settings = s.settings; });
      }).then(render).catch(function (e) { root.innerHTML = ""; root.appendChild(h("div", { class: "auth" }, h("div", { class: "card" }, h("div", { class: "msg err", text: e.message })), h("p", { class: "mut", style: "margin-top:10px", html: 'Run <a href="install.php">install.php</a> first.' }))); });
    }).catch(function (e) {
      root.innerHTML = "";
      root.appendChild(h("div", { class: "auth" }, h("div", { class: "card" },
        h("h1", { text: "Billing not installed yet" }),
        h("p", { class: "sub", text: e.message }),
        h("p", { style: "margin-top:12px", html: '<a class="btn pri" href="install.php">Open the installer</a>' }))));
    });
  }

  window.addEventListener("hashchange", render);
  boot();
})();
