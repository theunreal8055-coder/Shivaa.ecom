/* Shivaa Jewels — Billing
   One file, no build step, no dependencies. Hash-routed SPA over api.php. */
(function () {
  "use strict";

  var S = { user: null, csrf: "", meta: null, settings: null, version: null, route: "", q: {}, cache: {} };
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


  /* ── lucide-style line icons (inline SVG, no build step) ─────────────── */
  var ICONS = {
    activity: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
    fileText: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    package: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>',
    coins: '<circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18"/><path d="M7 6h1v4"/><path d="m16.71 13.88.7.71-2.82 2.82"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    userCheck: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/>',
    listChecks: '<line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><polyline points="3 6 4 7 6 5"/><polyline points="3 12 4 13 6 11"/><polyline points="3 18 4 19 6 17"/>',
    trendingUp: '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
    building: '<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/>',
    shoppingBag: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>',
    spreadsheet: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M8 13h2"/><path d="M14 13h2"/><path d="M8 17h2"/><path d="M14 17h2"/>',
    dollar: '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
    upload: '<polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    dot: '<circle cx="12" cy="12" r="9"/>'
  };
  function icon(name, size) {
    var s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    var n = size || 17;
    s.setAttribute("width", n); s.setAttribute("height", n);
    s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("fill", "none");
    s.setAttribute("stroke", "currentColor"); s.setAttribute("stroke-width", "2");
    s.setAttribute("stroke-linecap", "round"); s.setAttribute("stroke-linejoin", "round");
    s.setAttribute("aria-hidden", "true");
    s.innerHTML = ICONS[name] || ICONS.dot;
    return s;
  }

  /* ── shell ───────────────────────────────────────────────────────────── */
  var NAV = [
    ["", "Hub", "activity"], ["bills", "Bills", "fileText"], ["new", "New Bill", "plus"],
    ["stock", "Stock", "package"], ["metal", "Metal", "coins"], ["karigar", "Karigar", "users"],
    ["suppliers", "Suppliers", "building"], ["orders", "Ledger", "listChecks"],
    ["parties", "Parties", "userCheck"], ["khata", "Khata", "fileText"],
    ["expenses", "Expenses", "trendingUp"], ["reports", "Reports", "spreadsheet"],
    ["revenue", "Revenue", "dollar"], ["import", "Import", "upload"],
    ["audit", "Audit", "fileText"], ["settings", "Settings", "settings"]
  ];

  function shell(active, content) {
    root.innerHTML = "";
    var nav = h("nav", { class: "nav" }, NAV.map(function (n) {
      return h("a", { href: "#/" + n[0], class: active === n[0] ? "on" : "" },
        h("span", { class: "ic" }, icon(n[2])), n[1]);
    }));
    var side = h("aside", { class: "side" },
      h("div", { class: "brand" }, h("span", { class: "gem" }, icon("coins", 16)),
        h("div", {}, h("b", { text: S.settings && S.settings.shop_name ? S.settings.shop_name : "Shivaa" }), h("small", { text: "Billing" }))),
      nav, h("div", { class: "spacer" }),
      h("div", { class: "who" }, "Signed in as " + (S.user ? S.user.email : ""),
        h("div", { style: "margin-top:4px;opacity:.7", text: "Billing v" + (S.version || "?") }),
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
        h("div", { class: "brand", style: "padding:0 0 14px" }, h("span", { class: "gem" }, icon("coins", 16)),
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
        [h("a", { class: "btn pri", href: "#/new" }, icon("plus", 15), "New bill")]));
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
        [h("a", { class: "btn pri", href: "#/new" }, icon("plus", 15), "New bill"), exportBtn("bills")]));
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
      /* v2 fix: the date field was rendered but never sent, so every bill was
         silently stamped with today's date no matter what was chosen. */
      var dateIn = h("input", { type: "date", value: new Date().toISOString().slice(0, 10) });
      var placeIn = h("input", { placeholder: "e.g. Rajasthan" });

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
          date: dateIn.value, placeOfSupply: placeIn.value,
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
          h("div", { class: "fld" }, h("label", { class: "f", text: "Date" }), dateIn)),
        h("div", { class: "row r2" },
          h("div", { class: "fld" }, h("label", { class: "f", text: "Place of supply" }), placeIn))));
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
          /* v2 fix: this used to call billView() again and then location.reload(),
             which threw away the new node and hard-reloaded the page. */
          api("bills/" + id + "/payment", { method: "POST", body: { amount: Number(amt.value || 0), mode: mode.value } })
            .then(function (j) { toast("Payment recorded · balance now ₹" + money(j.balanceDue) + " · " + j.status); render(); })
            .catch(function (e) { toast(e.message, true); });
        } }), chipFor(b.status),
        h("button", { class: "btn sm", text: "WhatsApp", onclick: function () {
          api("wa/bill/" + id).then(function (j) { window.open(j.url, "_blank", "noopener"); })
            .catch(function (e) { toast(e.message, true); });
        } }),
        h("button", { class: "btn dgr sm", text: "Delete", onclick: function () {
          if (!window.confirm("Delete " + b.bill_no + "? Stock is put back and the khata entries are removed.")) return;
          api("bills/" + id, { method: "DELETE" }).then(function () { toast("Bill deleted"); location.hash = "#/bills"; })
            .catch(function (e) { toast(e.message, true); });
        } })));
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
        [h("button", { class: "btn pri", text: "+ Add item", onclick: form }), exportBtn("items")]));
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
              h("td", {}, h("div", { class: "bar", style: "gap:4px" },
                h("button", { class: "btn sm", text: "Adjust", onclick: function () { move(i); } }),
                h("button", { class: "btn sm", text: "Edit", onclick: function () { edit(i); } }),
                h("button", { class: "btn sm", text: "Log", onclick: function () { log(i); } }),
                h("button", { class: "btn dgr sm", text: "✕", onclick: function () {
                  if (!window.confirm("Delete " + i.name + "? Its stock history goes too.")) return;
                  api("items/" + i.id, { method: "DELETE" }).then(function () { toast("Item deleted"); load(); })
                    .catch(function (e) { toast(e.message, true); });
                } }))));
          })))));
      }).catch(function (e) { holder.innerHTML = ""; holder.appendChild(h("div", { class: "msg err", text: e.message })); });
    }
    function form() {
      var f = {};
      f.name = h("input", { placeholder: "e.g. Antique gold ring" });
      f.category = h("select", {}, S.meta.categories.map(function (c) { return h("option", { text: c }); }));
      f.metal = h("select", {}, [h("option", { text: "Gold" }), h("option", { text: "Silver" })]);
      f.purity = h("select", {}, S.meta.purities.map(function (p) { return h("option", { text: p }); }));
      f.purity.value = "22K";
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
    function edit(i) {
      var f = {};
      f.name = h("input", { value: i.name });
      f.category = h("select", {}, S.meta.categories.map(function (c) { return h("option", { text: c }); }));
      f.category.value = i.category;
      f.metal = h("select", {}, [h("option", { text: "Gold" }), h("option", { text: "Silver" })]);
      f.metal.value = i.metal;
      f.purity = h("select", {}, S.meta.purities.map(function (p) { return h("option", { text: p }); }));
      f.purity.value = i.purity;
      f.sku = h("input", { value: i.sku }); f.huid = h("input", { value: i.huid });
      f.grossWt = h("input", { type: "number", step: "0.001", value: i.gross_wt });
      f.lessWt = h("input", { type: "number", step: "0.001", value: i.less_wt });
      f.stoneWt = h("input", { type: "number", step: "0.001", value: i.stone_wt });
      f.netWt = h("input", { type: "number", step: "0.001", value: i.net_wt });
      f.onlineStock = h("input", { type: "number", step: "1", value: i.online_stock });
      f.makingPerG = h("input", { type: "number", step: "0.01", value: i.making_per_g });
      f.fulfilment = h("select", {}, [h("option", { value: "ready", text: "Ready stock — in the tray" }),
        h("option", { value: "made_to_order", text: "Made to order — produced after sale" })]);
      f.fulfilment.value = i.fulfilment;
      f.status = h("select", {}, ["In Stock", "Sold", "Issued", "Damaged"].map(function (s) { return h("option", { text: s }); }));
      f.status.value = i.status;
      f.notes = h("input", { value: i.notes || "" });
      box.innerHTML = "";
      box.appendChild(head("Edit " + i.name, "Physical stock is changed under Adjust, so the ledger stays honest",
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
        h("div", { class: "row r4" },
          h("div", { class: "fld" }, h("label", { class: "f", text: "Online pcs" }), f.onlineStock),
          h("div", { class: "fld" }, h("label", { class: "f", text: "Making ₹/g" }), f.makingPerG),
          h("div", { class: "fld" }, h("label", { class: "f", text: "Fulfilment" }), f.fulfilment),
          h("div", { class: "fld" }, h("label", { class: "f", text: "Status" }), f.status)),
        h("div", { class: "row" }, h("div", { class: "fld" }, h("label", { class: "f", text: "Notes" }), f.notes)),
        h("div", { class: "bar", style: "margin-top:14px" },
          h("button", { class: "btn pri", text: "Save changes", onclick: function () {
            var body = {}; Object.keys(f).forEach(function (k) { body[k] = f[k].value; });
            api("items/" + i.id, { method: "POST", body: body }).then(function () { toast("Item updated"); load(); })
              .catch(function (e) { toast(e.message, true); });
          } }))));
    }
    function log(i) {
      box.innerHTML = "";
      box.appendChild(head("Stock history · " + i.name, "Every movement, newest first",
        [h("button", { class: "btn", text: "Back", onclick: load })]));
      var holder = h("div", { class: "card", text: "Loading…" });
      box.appendChild(holder);
      api("stock/ledger&itemId=" + i.id).then(function (d) {
        var card = tableCard([{ t: "When" }, { t: "Channel" }, { t: "Pcs", num: 1 }, { t: "Grams", num: 1 }, { t: "Why" }],
          d.ledger.map(function (l) {
            return h("tr", {}, h("td", { class: "mut", text: String(l.created_at || "").replace("T", " ").slice(0, 19) }),
              h("td", {}, h("span", { class: "chip grey", text: l.channel })),
              h("td", { class: "num mono", text: (l.delta_pcs > 0 ? "+" : "") + l.delta_pcs }),
              h("td", { class: "num mono", text: (Number(l.delta_grams) > 0 ? "+" : "") + grams(l.delta_grams) }),
              h("td", { class: "mut", text: l.note || l.ref_type }));
          }), "No movements recorded for this item yet.");
        holder.replaceWith(card);
      }).catch(function (e) { holder.innerHTML = ""; holder.appendChild(h("div", { class: "msg err", text: e.message })); });
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
        [h("button", { class: "btn pri", text: "+ Add party", onclick: form }), exportBtn("parties")]));
      var holder = h("div", { class: "card", text: "Loading…" });
      box.appendChild(holder);
      api("parties").then(function (d) {
        holder.innerHTML = "";
        if (!d.parties.length) { holder.appendChild(h("p", { class: "mut", text: "No parties yet." })); return; }
        holder.appendChild(h("div", { class: "tw" }, h("table", { class: "t" },
          h("thead", {}, h("tr", {}, h("th", { text: "Name" }), h("th", { text: "Kind" }), h("th", { text: "Phone" }),
            h("th", { text: "City" }), h("th", { text: "GSTIN / PAN" }), h("th", { class: "num", text: "Credit days" }), h("th", {}))),
          h("tbody", {}, d.parties.map(function (p) {
            return h("tr", {}, h("td", { text: p.name }),
              h("td", {}, h("span", { class: "chip " + (p.kind === "jeweller" ? "green" : "grey"), text: p.kind })),
              h("td", { class: "mut", text: p.phone || "—" }), h("td", { class: "mut", text: p.city || "—" }),
              h("td", { class: "mut mono", text: p.gstin || p.pan || "—" }),
              h("td", { class: "num mono", text: p.credit_days || "—" }),
              h("td", {}, h("button", { class: "btn dgr sm", text: "✕", onclick: function () {
                if (!window.confirm("Delete " + p.name + "?")) return;
                api("parties/" + p.id, { method: "DELETE" }).then(function () { toast("Party deleted"); load(); })
                  .catch(function (e) { toast(e.message, true); });
              } })));
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
        h("thead", {}, h("tr", {}, h("th", { text: "Party" }), h("th", { text: "Phone" }), h("th", { class: "num", text: "Balance" }), h("th", {}))),
        h("tbody", {}, d.accounts.map(function (a) {
          return h("tr", {}, h("td", { text: a.name }), h("td", { class: "mut", text: a.phone || "—" }),
            h("td", { class: "num mono", text: "₹" + money(a.balance) }),
            h("td", {}, a.balance > 0 && a.phone ? h("button", { class: "btn sm", text: "Remind", onclick: function () {
              api("wa/khata/" + a.id).then(function (j) { window.open(j.url, "_blank", "noopener"); })
                .catch(function (e) { toast(e.message, true); });
            } }) : null));
        })))));
      box.innerHTML = ""; box.appendChild(head("Khata", "Who owes what, net of payments received", [exportBtn("khata")])); box.appendChild(card);
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
            h("th", { text: "Mode" }), h("th", { class: "num", text: "Amount" }), h("th", {}))),
          h("tbody", {}, d.expenses.map(function (x) {
            return h("tr", {}, h("td", { class: "mut", text: fdate(x.exp_date) }), h("td", { text: x.category }),
              h("td", { class: "mut", text: x.description || "—" }), h("td", { class: "mut", text: x.payment_mode }),
              h("td", { class: "num mono", text: "₹" + money(x.amount) }),
              h("td", {}, h("button", { class: "btn dgr sm", text: "✕", onclick: function () {
                if (!window.confirm("Delete this expense?")) return;
                api("expenses/" + x.id, { method: "DELETE" }).then(function () { toast("Deleted"); load(); })
                  .catch(function (e) { toast(e.message, true); });
              } })));
          })))));
      });
    }
    load(); return box;
  }
  function revenueView() {
    var box = h("div", {}, head("Revenue"), h("div", { class: "card", text: "Loading…" }));
    api("reports").then(function (d) {
      box.innerHTML = "";
      box.appendChild(head("Revenue", "Billing plus the website, side by side"));
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

    /* Arena bridge — the switch that lets chat write straight in. */
    var bState = h("span", { class: "chip grey", text: "checking…" });
    var bBtn = h("button", { class: "btn", text: "…" });
    var bNote = h("p", { class: "hint" });
    function bDraw(on, calls) {
      bState.className = "chip " + (on ? "green" : "grey");
      bState.textContent = on ? "On — Arena can write" : "Off — Arena refused";
      bBtn.className = "btn " + (on ? "" : "pri");
      bBtn.textContent = on ? "Switch off" : "Switch on";
      bNote.textContent = on
        ? "Arena may create bills, parties, suppliers, rate cards and orders in this database. "
          + calls + " calls so far. Every call is listed in Audit. Turn this off to stop it instantly."
        : "Arena can read nothing and write nothing. Turn this on only when you want chat entries to land here automatically.";
    }
    bBtn.addEventListener("click", function () {
      var turningOn = bBtn.textContent === "Switch on";
      if (turningOn && !confirm("This lets Arena write bills and supplier data straight into your live database. Continue?")) return;
      api("bridge", { method: "POST", body: { enabled: turningOn ? 1 : 0 } })
        .then(function (d) { bDraw(d.enabled, 0); toast(d.enabled ? "Bridge is on" : "Bridge is off"); })
        .catch(function (e) { toast(e.message, true); });
    });
    api("bridge").then(function (d) { bDraw(d.enabled, d.calls); }).catch(function () { bState.textContent = "unknown"; });
    box.appendChild(h("div", { class: "card" },
      h("h2", { text: "Arena bridge" }),
      h("div", { class: "row" }, h("div", {}, bState, bNote), bBtn)));

    var cur = h("input", { type: "password", autocomplete: "current-password" });
    var next = h("input", { type: "password", autocomplete: "new-password" });
    var next2 = h("input", { type: "password", autocomplete: "new-password" });
    box.appendChild(h("div", { class: "card" },
      h("h2", { text: "Change password" }),
      h("div", { class: "row r3", style: "margin-top:10px" },
        h("div", { class: "fld" }, h("label", { class: "f", text: "Current" }), cur),
        h("div", { class: "fld" }, h("label", { class: "f", text: "New (min 10 characters)" }), next),
        h("div", { class: "fld" }, h("label", { class: "f", text: "Repeat new" }), next2)),
      h("button", { class: "btn", text: "Update password", onclick: function () {
        if (next.value !== next2.value) return toast("The two new passwords do not match.", true);
        api("password", { method: "POST", body: { current: cur.value, next: next.value } })
          .then(function () { cur.value = next.value = next2.value = ""; toast("Password changed"); })
          .catch(function (e) { toast(e.message, true); });
      } })));
    return box;
  }

  /* ── shared bits ─────────────────────────────────────────────────────── */
  function exportBtn(entity, label) {
    return h("a", { class: "btn sm", href: "api.php?r=export/" + entity, text: (label || "CSV") });
  }
  function tableCard(headers, rows, emptyMsg) {
    if (!rows.length) return h("div", { class: "card" }, h("p", { class: "mut", text: emptyMsg || "Nothing here yet." }));
    return h("div", { class: "card" }, h("div", { class: "tw" }, h("table", { class: "t" },
      h("thead", {}, h("tr", {}, headers.map(function (x) {
        return h("th", { class: x.num ? "num" : null, text: x.t });
      }))),
      h("tbody", {}, rows))));
  }

  /* ── metal exchange ──────────────────────────────────────────────────── */
  function metal() {
    var box = h("div", {});
    function load() {
      box.innerHTML = "";
      box.appendChild(head("Metal exchange", "Fine gold and silver given out against old metal received",
        [h("button", { class: "btn pri", text: "+ New metal bill", onclick: form }), exportBtn("parties")]));
      var holder = h("div", { class: "card", text: "Loading…" });
      box.appendChild(holder);
      api("metal").then(function (d) {
        var net = h("div", { class: "grid g2", style: "margin-bottom:14px" },
          h("div", { class: "card kpi gold" }, h("div", { class: "lbl", text: "Net gold balance" }),
            h("div", { class: "val", text: grams(d.netGold) + " g" }),
            h("div", { class: "sub", text: d.netGold >= 0 ? "owed to you" : "you owe" })),
          h("div", { class: "card kpi" }, h("div", { class: "lbl", text: "Net silver balance" }),
            h("div", { class: "val", text: grams(d.netSilver) + " g" }),
            h("div", { class: "sub", text: d.netSilver >= 0 ? "owed to you" : "you owe" })));
        holder = tableCard([{ t: "Bill" }, { t: "Date" }, { t: "Party" }, { t: "num", num: 1 }, { t: "Silver g", num: 1 }, { t: "Labour ₹", num: 1 }],
          d.bills.map(function (b) {
            return h("tr", {}, h("td", { class: "mono", text: b.bill_no }), h("td", { class: "mut", text: fdate(b.bill_date) }),
              h("td", { text: b.party_name }), h("td", { class: "num mono", text: grams(b.balance_gold) }),
              h("td", { class: "num mono", text: grams(b.balance_silver) }),
              h("td", { class: "num mono", text: money(b.labour_total) }));
          }), "No metal bills yet.");
        box.innerHTML = "";
        box.appendChild(head("Metal exchange", "Fine gold and silver given out against old metal received",
          [h("button", { class: "btn pri", text: "+ New metal bill", onclick: form }), exportBtn("parties")]));
        box.appendChild(net); box.appendChild(holder);
      }).catch(function (e) { box.innerHTML = ""; box.appendChild(head("Metal exchange")); box.appendChild(h("div", { class: "msg err", text: e.message })); });
    }
    function form() {
      api("parties").then(function (d) {
        var partySel = h("select", {}, [h("option", { value: "", text: "— select —" })].concat(
          d.parties.map(function (p) { return h("option", { value: p.id, text: p.name + " · " + p.kind }); })));
        var outRows = [], inRows = [];
        var outBody = h("tbody", {}), inBody = h("tbody", {});
        function addOut() {
          var r = {};
          r.name = h("input", { placeholder: "What was given" });
          r.metal = h("select", {}, [h("option", { text: "Gold" }), h("option", { text: "Silver" })]);
          r.purity = h("select", {}, S.meta.purities.map(function (p) { return h("option", { text: p }); }));
          r.netWt = h("input", { type: "number", step: "0.001", value: "0" });
          r.wastage = h("input", { type: "number", step: "0.1", value: "0" });
          r.labour = h("input", { type: "number", step: "0.01", value: "0" });
          var tr = h("tr", {}, h("td", {}, r.name), h("td", {}, r.metal), h("td", {}, r.purity),
            h("td", {}, r.netWt), h("td", {}, r.wastage), h("td", {}, r.labour),
            h("td", {}, h("button", { class: "del", text: "✕", onclick: function () {
              outRows = outRows.filter(function (x) { return x !== r; }); tr.remove(); } })));
          outRows.push(r); outBody.appendChild(tr);
        }
        function addIn() {
          var r = {};
          r.name = h("input", { placeholder: "What was received" });
          r.metal = h("select", {}, [h("option", { text: "Gold" }), h("option", { text: "Silver" })]);
          r.gross = h("input", { type: "number", step: "0.001", value: "0" });
          r.tunch = h("input", { type: "number", step: "0.1", value: "0", placeholder: "impurity %" });
          var tr = h("tr", {}, h("td", {}, r.name), h("td", {}, r.metal), h("td", {}, r.gross), h("td", {}, r.tunch),
            h("td", {}, h("button", { class: "del", text: "✕", onclick: function () {
              inRows = inRows.filter(function (x) { return x !== r; }); tr.remove(); } })));
          inRows.push(r); inBody.appendChild(tr);
        }
        var notes = h("textarea", {});
        var save = h("button", { class: "btn pri", text: "Save metal bill", onclick: function () {
          if (!partySel.value) return toast("Select a party first.", true);
          save.disabled = true;
          api("metal", { method: "POST", body: {
            partyId: Number(partySel.value), notes: notes.value,
            outItems: outRows.map(function (r) { return { name: r.name.value, metal: r.metal.value, purity: r.purity.value, netWt: Number(r.netWt.value || 0), wastage: Number(r.wastage.value || 0), labour: Number(r.labour.value || 0) }; }),
            inMetals: inRows.map(function (r) { return { name: r.name.value, metal: r.metal.value, gross: Number(r.gross.value || 0), tunch: Number(r.tunch.value || 0) }; })
          } }).then(function (j) { toast("Saved " + j.billNo); load(); })
            .catch(function (e) { save.disabled = false; toast(e.message, true); });
        } });
        box.innerHTML = "";
        box.appendChild(head("New metal bill", "Fine weight is net of wastage on what goes out and tunch on what comes in",
          [h("button", { class: "btn", text: "Back", onclick: load })]));
        box.appendChild(h("div", { class: "card" },
          h("div", { class: "row r2" },
            h("div", { class: "fld" }, h("label", { class: "f", text: "Party" }), partySel),
            h("div", { class: "fld" }, h("label", { class: "f", text: "Note" }), notes))));
        box.appendChild(h("div", { class: "card" }, h("h2", { text: "Given out" }),
          h("div", { class: "items", style: "margin-top:10px" }, h("table", {}, h("thead", {}, h("tr", {},
            h("th", { text: "Item" }), h("th", { text: "Metal" }), h("th", { text: "Purity" }),
            h("th", { text: "Net g" }), h("th", { text: "Wastage %" }), h("th", { text: "Labour ₹" }), h("th", {}))), outBody)),
          h("button", { class: "btn sm", style: "margin-top:10px", text: "+ Add", onclick: addOut })));
        box.appendChild(h("div", { class: "card" }, h("h2", { text: "Received" }),
          h("div", { class: "items", style: "margin-top:10px" }, h("table", {}, h("thead", {}, h("tr", {},
            h("th", { text: "Item" }), h("th", { text: "Metal" }), h("th", { text: "Gross g" }),
            h("th", { text: "Tunch %" }), h("th", {}))), inBody)),
          h("button", { class: "btn sm", style: "margin-top:10px", text: "+ Add", onclick: addIn }),
          h("div", { class: "bar", style: "margin-top:14px" }, save)));
        addOut(); addIn();
      });
    }
    load(); return box;
  }

  /* ── karigar ─────────────────────────────────────────────────────────── */
  function karigar() {
    var box = h("div", {});
    function load() {
      box.innerHTML = "";
      box.appendChild(head("Karigar", "Metal out with artisans, and what has come back",
        [h("button", { class: "btn pri", text: "+ Issue job", onclick: form })]));
      var holder = h("div", { class: "card", text: "Loading…" });
      box.appendChild(holder);
      api("karigar").then(function (d) {
        var kpi = h("div", { class: "grid g3", style: "margin-bottom:14px" },
          h("div", { class: "card kpi" }, h("div", { class: "lbl", text: "Metal still out" }), h("div", { class: "val", text: grams(d.metalOut) + " g" })),
          h("div", { class: "card kpi" }, h("div", { class: "lbl", text: "Received back" }), h("div", { class: "val", text: grams(d.metalBack) + " g" })),
          h("div", { class: "card kpi" }, h("div", { class: "lbl", text: "Labour outstanding" }), h("div", { class: "val", text: "₹" + money(d.labourDue, 0) })));
        var tbl = tableCard([{ t: "Job" }, { t: "Karigar" }, { t: "Metal" }, { t: "Out g", num: 1 }, { t: "Back g", num: 1 }, { t: "Due" }, { t: "Labour ₹", num: 1 }, { t: "Status" }, { t: "" }],
          d.jobs.map(function (j) {
            return h("tr", {}, h("td", { class: "mono", text: "#" + j.id }), h("td", { text: j.artisan_name }),
              h("td", { class: "mut", text: j.metal + " " + j.category }),
              h("td", { class: "num mono", text: grams(j.issued_wt) }),
              h("td", { class: "num mono", text: grams(j.received_wt) }),
              h("td", { class: "mut", text: fdate(j.due_date) }),
              h("td", { class: "num mono", text: money(j.labour_charges) }),
              h("td", {}, chipFor(j.status)),
              h("td", {}, j.status === "Completed" ? null : h("button", { class: "btn sm", text: "Complete", onclick: function () { complete(j); } })));
          }), "No jobs issued yet.");
        box.innerHTML = "";
        box.appendChild(head("Karigar", "Metal out with artisans, and what has come back",
          [h("button", { class: "btn pri", text: "+ Issue job", onclick: form })]));
        box.appendChild(kpi); box.appendChild(tbl);
      }).catch(function (e) { box.innerHTML = ""; box.appendChild(head("Karigar")); box.appendChild(h("div", { class: "msg err", text: e.message })); });
    }
    function form() {
      api("parties").then(function (d) {
        var artisans = d.parties.filter(function (p) { return p.kind === "karigar"; });
        var sel = h("select", {}, [h("option", { value: "", text: "— select —" })].concat(
          artisans.map(function (p) { return h("option", { value: p.id, text: p.name + (p.specialization ? " · " + p.specialization : "") }); })));
        var f = {
          metal: h("select", {}, [h("option", { text: "Gold" }), h("option", { text: "Silver" })]),
          category: h("select", {}, S.meta.categories.map(function (c) { return h("option", { text: c }); })),
          purity: h("select", {}, S.meta.purities.map(function (p) { return h("option", { text: p }); })),
          issuedWt: h("input", { type: "number", step: "0.001", value: "0" }),
          lessWt: h("input", { type: "number", step: "0.001", value: "0" }),
          wastagePct: h("input", { type: "number", step: "0.1", value: "0" }),
          labourCharges: h("input", { type: "number", step: "0.01", value: "0" }),
          durationDays: h("input", { type: "number", step: "1", value: "15" }),
          notes: h("input", {})
        };
        f.purity.value = "22K";
        var save = h("button", { class: "btn pri", text: "Issue job", onclick: function () {
          if (!sel.value) return toast("Select a karigar first.", true);
          save.disabled = true;
          var body = { partyId: Number(sel.value) };
          Object.keys(f).forEach(function (k) { body[k] = f[k].value; });
          api("karigar", { method: "POST", body: body }).then(function () { toast("Job issued"); load(); })
            .catch(function (e) { save.disabled = false; toast(e.message, true); });
        } });
        box.innerHTML = "";
        box.appendChild(head("Issue job", artisans.length ? null : "No karigars yet — add one under Parties first",
          [h("button", { class: "btn", text: "Back", onclick: load })]));
        box.appendChild(h("div", { class: "card" },
          h("div", { class: "row r2" },
            h("div", { class: "fld" }, h("label", { class: "f", text: "Karigar" }), sel),
            h("div", { class: "fld" }, h("label", { class: "f", text: "Days allowed" }), f.durationDays)),
          h("div", { class: "row r3" },
            h("div", { class: "fld" }, h("label", { class: "f", text: "Metal" }), f.metal),
            h("div", { class: "fld" }, h("label", { class: "f", text: "Category" }), f.category),
            h("div", { class: "fld" }, h("label", { class: "f", text: "Purity" }), f.purity)),
          h("div", { class: "row r4" },
            h("div", { class: "fld" }, h("label", { class: "f", text: "Issued g" }), f.issuedWt),
            h("div", { class: "fld" }, h("label", { class: "f", text: "Less g" }), f.lessWt),
            h("div", { class: "fld" }, h("label", { class: "f", text: "Wastage %" }), f.wastagePct),
            h("div", { class: "fld" }, h("label", { class: "f", text: "Labour ₹" }), f.labourCharges)),
          h("div", { class: "row" }, h("div", { class: "fld" }, h("label", { class: "f", text: "Note" }), f.notes)),
          h("div", { class: "bar", style: "margin-top:14px" }, save)));
      });
    }
    function complete(j) {
      var recv = h("input", { type: "number", step: "0.001", value: String(j.issued_wt || 0) });
      var lab = h("input", { type: "number", step: "0.01", value: String(j.labour_charges || 0) });
      box.innerHTML = "";
      box.appendChild(head("Complete job #" + j.id, j.artisan_name + " · issued " + grams(j.issued_wt) + " g",
        [h("button", { class: "btn", text: "Back", onclick: load })]));
      box.appendChild(h("div", { class: "card" },
        h("div", { class: "row r2" },
          h("div", { class: "fld" }, h("label", { class: "f", text: "Received back (g)" }), recv),
          h("div", { class: "fld" }, h("label", { class: "f", text: "Labour to pay ₹" }), lab)),
        h("button", { class: "btn pri", text: "Mark complete", onclick: function () {
          api("karigar/" + j.id + "/complete", { method: "POST", body: { receivedWt: Number(recv.value || 0), labourCharges: Number(lab.value || 0) } })
            .then(function (r) { toast("Completed · " + grams(r.fineBack) + " g fine back"); load(); })
            .catch(function (e) { toast(e.message, true); });
        } })));
    }
    load(); return box;
  }

  /* ── audit trail ─────────────────────────────────────────────────────── */
  function audit() {
    var box = h("div", {}, head("Audit trail", "Every change, newest first"), h("div", { class: "card", text: "Loading…" }));
    api("audit").then(function (d) {
      box.innerHTML = "";
      box.appendChild(head("Audit trail", "Every change, newest first"));
      box.appendChild(tableCard([{ t: "When" }, { t: "Action" }, { t: "Thing" }, { t: "Detail" }],
        d.log.map(function (a) {
          return h("tr", {}, h("td", { class: "mut", text: String(a.created_at || "").replace("T", " ").slice(0, 19) }),
            h("td", { text: a.action }), h("td", { class: "mut", text: a.entity + (a.entity_id ? " #" + a.entity_id : "") }),
            h("td", { class: "mut", text: a.detail || "—" }));
        }), "Nothing recorded yet."));
    }).catch(function (e) { box.innerHTML = ""; box.appendChild(head("Audit trail")); box.appendChild(h("div", { class: "msg err", text: e.message })); });
    return box;
  }

  /* ── bulk import ─────────────────────────────────────────────────────── */
  function vault() {
    var box = h("div", {});
    box.appendChild(head("Bulk import", "Paste a JSON array of items — the shop's own export works as-is"));
    var ta = h("textarea", { style: "min-height:220px;font-family:ui-monospace,monospace;font-size:13px",
      placeholder: '[{"name":"Gold ring","sku":"R-1","weightG":8.4,"stock":1}]' });
    var out = h("div", {});
    box.appendChild(h("div", { class: "card" },
      h("label", { class: "f", text: "JSON array" }), ta,
      h("div", { class: "hint", text: "Accepts name, sku, huid, category, metal, purity, grossWt or weightG, lessWt, stoneWt, netWt, stock, physicalPcs, onlineStock, fulfilment, productId." }),
      h("div", { class: "bar", style: "margin-top:12px" },
        h("button", { class: "btn pri", text: "Import", onclick: function () {
          var rows;
          try { rows = JSON.parse(ta.value); } catch (e) { return toast("That is not valid JSON.", true); }
          if (!Array.isArray(rows)) return toast("It must be a JSON array.", true);
          api("import", { method: "POST", body: { rows: rows } }).then(function (j) {
            out.innerHTML = "";
            out.appendChild(h("div", { class: "msg ok", text: j.made + " added, " + j.skipped + " skipped." +
              (j.errors.length ? " First problems: " + j.errors.join("; ") : "") }));
          }).catch(function (e) { out.innerHTML = ""; out.appendChild(h("div", { class: "msg err", text: e.message })); });
        } })),
      out));
    return box;
  }

  /* ── router ──────────────────────────────────────────────────────────── */

  /* ── sourcing: suppliers, rate cards, orders, report library ─────────── */
  var SUP_TYPES = ["Manufacturer", "Wholesaler", "Distributor", "Importer"];
  var QUALITY = ["Budget-friendly", "Mid-range", "Premium"];
  var SUP_STATUS = ["New", "Contacted", "Active", "On Hold", "Blacklisted", "Top Wholesaler"];
  var METALS = ["Gold", "Silver", "Platinum", "Both"];
  var PRIORITIES = ["Normal", "Urgent", "Low Priority", "High Priority", "Important", "High Quality Needed"];
  var ORDER_STATUS = ["New", "Processing", "Confirmed", "On Hold", "Dispatched", "Delivered", "Cancelled", "Delayed"];
  var MAKING = ["Plain", "Antique", "Paper Casting", "Kundan", "Meenakari", "Polki", "Stone Studded"];
  var CATS = ["Rings", "Bangles", "Necklaces", "Earrings", "Chains", "Mangalsutra", "Pendants",
    "Bracelets", "Coins", "Bars", "Stone", "CZ", "Paper Casting", "Regular Casting"];
  var PURITIES = ["24K", "22K", "20K", "18K", "14K", "9K", "92.5 Silver"];
  var STATES = ["Rajasthan", "Maharashtra", "Delhi", "Gujarat", "Uttar Pradesh", "Karnataka", "Tamil Nadu",
    "West Bengal", "Madhya Pradesh", "Punjab", "Haryana", "Kerala", "Telangana", "Bihar", "Other"];

  function opt(list, sel) {
    return list.map(function (v) {
      var o = h("option", { value: v, text: v });
      if (String(sel || "") === String(v)) o.setAttribute("selected", "selected");
      return o;
    });
  }
  function fld(label, input) {
    return h("label", { class: "f" }, h("span", { text: label }), input);
  }
  function inp(v, attrs) {
    var a = { type: "text" };
    Object.keys(attrs || {}).forEach(function (k) { a[k] = attrs[k]; });
    var e = h("input", a);
    if (v !== null && v !== undefined && v !== "") e.value = v;
    return e;
  }
  function sel(list, v) { var e = h("select", {}, opt(list, v)); return e; }
  function sheet(title, body, saveLabel, onSave) {
    var ov = h("div", { class: "sheet" });
    var card = h("div", { class: "sheetCard" },
      h("div", { class: "sheetTop" }, h("h2", { text: title }),
        h("button", { class: "x", text: "✕", onclick: function () { ov.remove(); } })),
      h("form", { onsubmit: function (e) { e.preventDefault(); onSave(function () { ov.remove(); }); } },
        body,
        h("div", { class: "bar", style: "margin-top:14px;justify-content:flex-end" },
          h("button", { type: "button", class: "btn", text: "Cancel", onclick: function () { ov.remove(); } }),
          h("button", { type: "submit", class: "btn pri", text: saveLabel }))));
    ov.appendChild(card);
    ov.addEventListener("click", function (e) { if (e.target === ov) ov.remove(); });
    document.body.appendChild(ov);
    return ov;
  }
  function readForm(root, names) {
    var o = {};
    names.forEach(function (n) {
      var el = root.querySelector('[data-f="' + n + '"]');
      o[n] = el ? el.value : "";
    });
    return o;
  }
  function tag(name, el) { el.setAttribute("data-f", name); return el; }

  /* ── suppliers ───────────────────────────────────────────────────────── */
  function supplierForm(id) {
    var s = id ? S.cache.suppliers.filter(function (x) { return x.id === id; })[0] || {} : {};
    var f = {};
    ["company", "contact", "phone", "city", "pin", "metal", "gst", "accName", "accNumber",
      "ifsc", "branch", "supplierType", "quality", "status", "notes"].forEach(function (n) {
        var key = { accName: "acc_name", accNumber: "acc_number", supplierType: "supplier_type" }[n] || n;
        f[n] = id ? (s[key] || "") : "";
      });
    if (!id) { f.supplierType = "Manufacturer"; f.quality = "Premium"; f.status = "New"; f.metal = "Gold"; }

    var body = h("div", { class: "grid g2" },
      fld("Company *", tag("company", inp(f.company, { required: true, placeholder: "Raj Bullion" }))),
      fld("Contact person", tag("contact", inp(f.contact))),
      fld("Phone", tag("phone", inp(f.phone, { type: "tel" }))),
      fld("City", tag("city", inp(f.city, { placeholder: "Jaipur" }))),
      fld("PIN", tag("pin", inp(f.pin, { maxlength: 10 }))),
      fld("Metal", tag("metal", sel(METALS, f.metal || "Gold"))),
      fld("GSTIN", tag("gst", inp(f.gst, { placeholder: "08AABCU9603R1ZM" }))),
      fld("Supplier type", tag("supplierType", sel(SUP_TYPES, f.supplierType))),
      fld("Quality tier", tag("quality", sel(QUALITY, f.quality))),
      fld("Status", tag("status", sel(SUP_STATUS, f.status))),
      fld("Bank", tag("branch", inp(f.branch, { placeholder: "HDFC, MI Road" }))),
      fld("Account name", tag("accName", inp(f.accName))),
      fld("Account number", tag("accNumber", inp(f.accNumber))),
      fld("IFSC", tag("ifsc", inp(f.ifsc, { maxlength: 11 }))),
      fld("Notes", tag("notes", inp(f.notes))));

    sheet(id ? "Edit supplier" : "New supplier", body, id ? "Save" : "Add supplier",
      function (close) {
        var data = readForm(document.querySelector(".sheetCard"),
          ["company", "contact", "phone", "city", "pin", "metal", "gst", "accName", "accNumber",
            "ifsc", "branch", "supplierType", "quality", "status", "notes"]);
        api(id ? "suppliers/" + id : "suppliers", { method: "POST", body: data })
          .then(function () { close(); toast(id ? "Supplier updated" : "Supplier added"); render(); })
          .catch(function (e) { toast(e.message, true); });
      });
  }

  function rateCardSheet(entityType, entityId, label) {
    var box = h("div", {});
    var ov = h("div", { class: "sheet" });
    function draw(cards) {
      box.innerHTML = "";
      box.appendChild(h("p", { class: "mut", text: "Agreed wastage and other cost, per category and purity. One row per combination." }));
      box.appendChild(h("div", { class: "grid g2", style: "margin-top:10px" },
        tag("category", sel(CATS, CATS[0])),
        tag("purity", sel(PURITIES, "22K")),
        tag("makingType", sel(MAKING, "Plain")),
        tag("productName", inp("", { placeholder: "Product name (optional)" })),
        tag("otherCostWrap", inp("", { type: "hidden" })),
        tag("wastage", inp("0", { type: "number", step: "0.01", placeholder: "Wastage %" })),
        tag("otherCost", inp("0", { type: "number", step: "0.01", placeholder: "Other cost ₹" }))));
      box.appendChild(h("button", { class: "btn pri sm", style: "margin-top:10px", text: "+ Save this row",
        onclick: function () {
          var d = readForm(box, ["category", "purity", "makingType", "productName", "wastage", "otherCost"]);
          d.entityType = entityType; d.entityId = entityId;
          api("rate-cards", { method: "POST", body: d })
            .then(function () { toast("Rate saved"); load(); })
            .catch(function (e) { toast(e.message, true); });
        } }));
      box.appendChild(cards.length ? tableCard(
        [{ t: "Category" }, { t: "Purity" }, { t: "Making" }, { t: "Product" }, { t: "Wastage %", num: true },
          { t: "Other ₹", num: true }, { t: "" }],
        cards.map(function (r) {
          return h("tr", {}, h("td", { text: r.category }), h("td", { text: r.purity }),
            h("td", { text: r.making_type }), h("td", { text: r.product_name || "—" }),
            h("td", { class: "num mono", text: r.wastage_pct }),
            h("td", { class: "num mono", text: money(r.other_cost) }),
            h("td", { class: "num" }, h("button", { class: "btn xs", text: "✕",
              onclick: function () {
                api("rate-cards/" + r.id, { method: "DELETE" }).then(function () { toast("Row removed"); load(); });
              } })));
        })) : h("p", { class: "mut", style: "margin-top:10px", text: "No rates saved for " + label + " yet." }));
    }
    function load() {
      api("rate-cards?entity=" + entityType + "&id=" + entityId).then(function (d) { draw(d.rateCards || []); });
    }
    ov.appendChild(h("div", { class: "sheetCard" },
      h("div", { class: "sheetTop" }, h("h2", { text: "Rate card — " + label }),
        h("button", { class: "x", text: "✕", onclick: function () { ov.remove(); } })),
      box,
      h("div", { class: "bar", style: "margin-top:14px;justify-content:flex-end" },
        h("button", { class: "btn", text: "Done", onclick: function () { ov.remove(); } }))));
    ov.addEventListener("click", function (e) { if (e.target === ov) ov.remove(); });
    document.body.appendChild(ov);
    load();
  }

  function suppliers() {
    var box = h("div", {});
    function load(q) {
      box.innerHTML = "";
      var search = inp(q || "", { placeholder: "Search company, city or phone" });
      search.addEventListener("keydown", function (e) { if (e.key === "Enter") load(search.value); });
      box.appendChild(head("Suppliers", "Bullion houses, manufacturers and karigar vendors you buy from",
        [search, h("button", { class: "btn", text: "Search", onclick: function () { load(search.value); } }),
          h("button", { class: "btn pri", onclick: function () { supplierForm(0); } }, icon("plus", 15), "New supplier"),
          exportBtn("suppliers")]));
      var holder = h("div", { class: "card", text: "Loading…" });
      box.appendChild(holder);
      api("suppliers" + (q ? "?q=" + encodeURIComponent(q) : "")).then(function (d) {
        S.cache.suppliers = d.suppliers || [];
        box.removeChild(holder);
        box.appendChild(tableCard(
          [{ t: "Company" }, { t: "Contact" }, { t: "City" }, { t: "Type" }, { t: "Quality" },
            { t: "Status" }, { t: "Orders", num: true }, { t: "Net g", num: true },
            { t: "Rates", num: true }, { t: "" }],
          (d.suppliers || []).map(function (s) {
            return h("tr", {},
              h("td", { class: "b", text: s.company }),
              h("td", { text: s.contact || "—" }),
              h("td", { text: s.city || "—" }),
              h("td", {}, h("span", { class: "chip grey", text: s.supplier_type })),
              h("td", { text: s.quality }),
              h("td", {}, chipFor(s.status === "Active" ? "Completed" : s.status === "Blacklisted" ? "Unpaid" : "Pending")),
              h("td", { class: "num mono", text: s.orders }),
              h("td", { class: "num mono", text: grams(s.net_wt) }),
              h("td", { class: "num" }, h("button", { class: "btn xs", text: s.rate_rows,
                onclick: function () { rateCardSheet("supplier", s.id, s.company); } })),
              h("td", { class: "num" },
                h("button", { class: "btn xs", text: "Edit", onclick: function () { supplierForm(s.id); } }),
                " ",
                h("button", { class: "btn xs", text: "✕", onclick: function () {
                  if (!confirm("Delete " + s.company + "?")) return;
                  api("suppliers/" + s.id, { method: "DELETE" })
                    .then(function () { toast("Supplier deleted"); render(); })
                    .catch(function (e) { toast(e.message, true); });
                } })));
          }), "No suppliers yet. Add the bullion houses and manufacturers you buy from."));
      }).catch(function (e) { box.removeChild(holder); box.appendChild(h("div", { class: "msg err", text: e.message })); });
    }
    load("");
    return box;
  }

  /* ── orders (the deal ledger) ────────────────────────────────────────── */
  function orderForm(id, rows) {
    var o = {};
    if (id) { rows.forEach(function (x) { if (x.id === id) o = x; }); }
    var v = function (k, d) { return o[k] === undefined || o[k] === null ? (d === undefined ? "" : d) : o[k]; };
    if (!id) { o.orderType = "Purchase"; o.metal = "Gold"; o.purity = "22K";
      o.priority = "Normal"; o.status = "New"; o.category = CATS[0];
      o.orderDate = new Date().toISOString().slice(0, 10); }

    var supSel = sel((S.cache.suppliers || []).map(function (s) { return s.company; }), o.entity_name);
    var partySel = sel((S.cache.parties || []).map(function (p) { return p.name; }), o.entity_name);
    supSel.setAttribute("data-f", "entityName");
    partySel.setAttribute("data-f", "entityName");
    var whoWrap = h("div", {}, supSel, partySel);
    function syncWho() {
      var type = typeSel.value;
      supSel.style.display = type === "Purchase" ? "" : "none";
      partySel.style.display = type === "Sale" ? "" : "none";
    }
    var typeSel = sel(["Purchase", "Sale"], v("orderType", "Purchase"));
    typeSel.addEventListener("change", syncWho);

    var gross = tag("grossWt", inp(v("gross_wt", 0), { type: "number", step: "0.001" }));
    var stone = tag("stoneWt", inp(v("stone_wt", 0), { type: "number", step: "0.001" }));
    var netOut = h("b", { class: "mono", text: "0" });
    function calc() {
      var n = Math.max(0, (Number(gross.value) || 0) - (Number(stone.value) || 0));
      netOut.textContent = n.toLocaleString("en-IN", { maximumFractionDigits: 3 }) + " g";
    }
    gross.addEventListener("input", calc); stone.addEventListener("input", calc);

    var body = h("div", { class: "grid g2" },
      fld("Order name *", tag("orderName", inp(v("order_name"), { required: true, placeholder: "Diwali stock — bangles" }))),
      fld("Type", typeSel),
      fld("Party", whoWrap),
      fld("Category", tag("category", sel(CATS, v("category", CATS[0])))),
      fld("Metal", tag("metal", sel(METALS, v("metal", "Gold")))),
      fld("Purity", tag("purity", sel(PURITIES, v("purity", "22K")))),
      fld("Pieces", tag("pieces", inp(v("pieces", 0), { type: "number", step: "1" }))),
      fld("Priority", tag("priority", sel(PRIORITIES, v("priority", "Normal")))),
      fld("Status", tag("status", sel(ORDER_STATUS, v("status", "New")))),
      fld("Place of supply", tag("placeOfSupply", sel(STATES, v("place_of_supply", "Rajasthan")))),
      fld("Order date", tag("orderDate", inp(v("orderDate"), { type: "date" }))),
      fld("Delivery date", tag("deliveryDate", inp(v("delivery_date"), { type: "date" }))),
      fld("Gross weight (g)", gross),
      fld("Stone weight (g)", stone),
      fld("Net weight", netOut),
      fld("Wastage decided (%)", tag("wastageDecided", inp(v("wastage_decided", 0), { type: "number", step: "0.01" }))),
      fld("Rate ₹/g", tag("rate", inp(v("rate", 0), { type: "number", step: "0.01" }))),
      fld("Making charges ₹", tag("makingCharges", inp(v("making_charges", 0), { type: "number", step: "0.01" }))),
      fld("Advance metal (g)", tag("advanceMetal", inp(v("advance_metal", 0), { type: "number", step: "0.001" }))),
      fld("Advance cash ₹", tag("advanceCash", inp(v("advance_cash", 0), { type: "number", step: "0.01" }))),
      fld("Notes", tag("notes", inp(v("notes")))));

    var NAMES = ["orderName", "orderType", "entityName", "category", "metal", "purity", "pieces",
      "priority", "status", "placeOfSupply", "orderDate", "deliveryDate", "grossWt", "stoneWt",
      "wastageDecided", "rate", "makingCharges", "advanceMetal", "advanceCash", "notes"];
    sheet(id ? "Edit order" : "New order", body, id ? "Save" : "Add order", function (close) {
      var data = readForm(document.querySelector(".sheetCard"), NAMES);
      var sup = (S.cache.suppliers || []).filter(function (s) { return s.company === data.entityName; })[0];
      var par = (S.cache.parties || []).filter(function (p) { return p.name === data.entityName; })[0];
      data.entityId = (sup ? sup.id : (par ? par.id : 0));
      api(id ? "orders/" + id : "orders", { method: "POST", body: data })
        .then(function () { close(); toast(id ? "Order updated" : "Order added"); render(); })
        .catch(function (e) { toast(e.message, true); });
    });
    syncWho(); calc();
  }

  function orders() {
    var box = h("div", {});
    var fType = "All", fStatus = "All";
    function load() {
      box.innerHTML = "";
      var ts = sel(["All", "Purchase", "Sale"], fType);
      var ss = sel(["All"].concat(ORDER_STATUS), fStatus);
      ts.addEventListener("change", function () { fType = ts.value; load(); });
      ss.addEventListener("change", function () { fStatus = ss.value; load(); });
      box.appendChild(head("Orders", "Purchases in and sales out — the deal ledger",
        [ts, ss, h("button", { class: "btn pri", onclick: function () { orderForm(0, []); } }, icon("plus", 15), "New order"),
          exportBtn("orders")]));
      var holder = h("div", { class: "card", text: "Loading…" });
      box.appendChild(holder);
      Promise.all([api("suppliers"), api("parties")]).then(function (r) {
        S.cache.suppliers = r[0].suppliers || [];
        S.cache.parties = (r[1].parties || []).filter(function (p) { return p.kind !== "karigar"; });
        return api("orders?type=" + fType + "&status=" + fStatus);
      }).then(function (d) {
        var rows = d.orders || [];
        var buy = 0, sale = 0, pcs = 0, g = 0;
        rows.forEach(function (o) {
          if (o.order_type === "Purchase") buy += o.value; else sale += o.value;
          pcs += o.pieces; g += o.net_wt;
        });
        box.removeChild(holder);
        box.appendChild(h("div", { class: "grid g4" },
          h("div", { class: "card kpi" }, h("div", { class: "lbl", text: "Purchases" }), h("div", { class: "val", text: "₹" + money(buy, 0) })),
          h("div", { class: "card kpi gold" }, h("div", { class: "lbl", text: "Sales" }), h("div", { class: "val", text: "₹" + money(sale, 0) })),
          h("div", { class: "card kpi" }, h("div", { class: "lbl", text: "Pieces" }), h("div", { class: "val", text: String(pcs) })),
          h("div", { class: "card kpi" }, h("div", { class: "lbl", text: "Net metal" }), h("div", { class: "val", text: grams(g) + " g" }))));
        box.appendChild(tableCard(
          [{ t: "Date" }, { t: "Type" }, { t: "Order" }, { t: "Party" }, { t: "Category" },
            { t: "Pcs", num: true }, { t: "Net g", num: true }, { t: "Value ₹", num: true },
            { t: "Priority" }, { t: "Status" }, { t: "Due" }, { t: "" }],
          rows.map(function (o) {
            var late = o.delivery_date && o.status !== "Delivered" && o.status !== "Cancelled"
              && o.delivery_date < new Date().toISOString().slice(0, 10);
            return h("tr", {},
              h("td", { class: "mono", text: fdate(o.order_date) }),
              h("td", {}, h("span", { class: "chip " + (o.order_type === "Sale" ? "green" : "amber"), text: o.order_type })),
              h("td", { class: "b", text: o.order_name }),
              h("td", { text: o.entity_name || "—" }),
              h("td", { text: o.category }),
              h("td", { class: "num mono", text: o.pieces }),
              h("td", { class: "num mono", text: grams(o.net_wt) }),
              h("td", { class: "num mono", text: money(o.value, 0) }),
              h("td", { text: o.priority }),
              h("td", {}, chipFor(o.status === "Delivered" ? "Completed"
                : (o.status === "Cancelled" ? "Unpaid" : "In Progress"))),
              h("td", { class: "mono" + (late ? " red" : ""), text: fdate(o.delivery_date) }),
              h("td", { class: "num" },
                h("button", { class: "btn xs", text: "Edit", onclick: function () { orderForm(o.id, rows); } }),
                " ",
                h("button", { class: "btn xs", text: "✕", onclick: function () {
                  if (!confirm("Delete this order?")) return;
                  api("orders/" + o.id, { method: "DELETE" }).then(function () { toast("Order deleted"); render(); });
                } })));
          }), "No orders yet."));
      }).catch(function (e) { box.removeChild(holder); box.appendChild(h("div", { class: "msg err", text: e.message })); });
    }
    load();
    return box;
  }

  /* ── the 51-report library ───────────────────────────────────────────── */
  function analytics() {
    var box = h("div", {});
    box.appendChild(head("Reports", "Loading the report library…"));
    var holder = h("div", { class: "card", text: "Loading…" });
    box.appendChild(holder);
    api("reports/catalogue").then(function (cat) {
      box.innerHTML = "";
      box.appendChild(head("Reports",
        cat.total + " reports from the sourcing module — " + cat.live +
        " are computed from your live data right now",
        [exportBtn("orders", "Orders CSV")]));
      var out = h("div", { id: "reportOut" });
      var nav = h("div", {});
      cat.categories.forEach(function (c) {
        var live = c.reports.filter(function (r) { return r.live; }).length;
        nav.appendChild(h("div", { class: "card", style: "margin-bottom:10px" },
          h("h2", { text: c.title }),
          h("p", { class: "mut", text: live + " of " + c.reports.length + " available" }),
          h("div", { class: "rlist" }, c.reports.map(function (r) {
            return h("button", {
              class: "rbtn" + (r.live ? "" : " off"),
              title: r.live ? r.desc : "Not available yet: " + r.why,
              onclick: function () { if (r.live) runReport(r.id, out); else toast("Not available yet — " + r.why, true); }
            }, h("span", { text: r.title }),
              r.live ? null : h("small", { text: " · " + r.why }));
          }))));
      });
      box.appendChild(h("div", { class: "grid g2" }, nav, h("div", {}, out)));
    }).catch(function (e) {
      box.innerHTML = ""; box.appendChild(head("Reports"));
      box.appendChild(h("div", { class: "msg err", text: e.message }));
    });

    function runReport(id, out) {
      out.innerHTML = "";
      out.appendChild(h("div", { class: "card", text: "Running…" }));
      api("report/" + id).then(function (d) {
        out.innerHTML = "";
        out.appendChild(h("div", { class: "card" },
          h("h2", { text: d.title }),
          h("p", { class: "mut", text: d.desc }),
          d.note ? h("p", { class: "msg ok", style: "margin-top:8px", text: d.note }) : null,
          h("div", { style: "margin-top:10px" },
            tableCard(d.columns.map(function (c) { return { t: c }; }),
              d.rows.map(function (row) {
                return h("tr", {}, row.map(function (cell) {
                  var isNum = typeof cell === "number";
                  return h("td", { class: isNum ? "num mono" : null,
                    text: isNum ? cell.toLocaleString("en-IN") : String(cell === null ? "—" : cell) });
                }));
              }), "No data yet for this report."))));
        out.appendChild(h("div", { class: "bar", style: "margin-top:10px" },
          h("button", { class: "btn sm", text: "⬇ Download CSV",
            onclick: function () { downloadCsv(d.title, d.columns, d.rows); } })));
      }).catch(function (e) {
        out.innerHTML = ""; out.appendChild(h("div", { class: "msg err", text: e.message }));
      });
    }
    return box;
  }

  function downloadCsv(title, columns, rows) {
    var q = function (v) { return '"' + String(v === null || v === undefined ? "" : v).replace(/"/g, '""') + '"'; };
    var lines = [columns.map(q).join(",")];
    rows.forEach(function (r) { lines.push(r.map(q).join(",")); });
    var blob = new Blob(["\ufeff" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    var a = h("a", { href: URL.createObjectURL(blob),
      download: title.replace(/[^a-z0-9]+/gi, "-").toLowerCase() + ".csv" });
    document.body.appendChild(a); a.click(); a.remove();
  }

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
    else if (r === "metal") view = metal();
    else if (r === "karigar") view = karigar();
    else if (r === "parties") view = parties();
    else if (r === "khata") view = khata();
    else if (r === "expenses") view = expenses();
    else if (r === "suppliers") view = suppliers();
    else if (r === "orders") view = orders();
    else if (r === "reports") view = analytics();
    else if (r === "revenue") view = revenueView();
    else if (r === "import") view = vault();
    else if (r === "audit") view = audit();
    else if (r === "settings") view = settingsView();
    else view = dashboard();
    var active = r === "bill" ? "bills" : r;
    shell(active, view);
    window.scrollTo(0, 0);
  }

  function boot(afterLogin) {
    api("me").then(function (j) {
      S.user = j.user; S.csrf = j.csrf; S.version = j.version;
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
