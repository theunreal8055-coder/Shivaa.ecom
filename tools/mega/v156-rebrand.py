#!/usr/bin/env python3
"""v156 · Jaipur -> Shivaa rebrand of the RATE BRAND (never the city).

Rule this script lives by:
  • "Jaipur" as the name of the RATE / market feed / premium  -> Shivaa
  • "Jaipur" as a real CITY (service area, pickup radius, a customer's town in
    a review, the GST state list)                           -> UNTOUCHED
Every replacement is exact and must apply exactly the number of times asserted,
so a silent miss is impossible.
"""
import sys, io

def apply(path, pairs):
    s = io.open(path, encoding='utf-8').read()
    for old, new, n in pairs:
        c = s.count(old)
        if c != n:
            print("MISMATCH in %s: expected %d of %r, found %d" % (path, n, old[:70], c))
            sys.exit(1)
        s = s.replace(old, new)
    io.open(path, 'w', encoding='utf-8').write(s)
    print("ok  %s  (%d replacements)" % (path, len(pairs)))

APP = [
 # ── live rates engine (comments + the ticker label) ──────────────────────
 ("state.rates = { ...r, ...(r.jaipur || {}) };  // storefront prices = Jaipur market rates",
  "state.rates = { ...r, ...(r.shivaa || r.jaipur || {}) };  // storefront prices = Shivaa's own retail rates", 1),
 ("const liveTxt = R.live ? 'MCX LIVE' : 'JAIPUR LIVE';",
  "const liveTxt = R.live ? 'MCX LIVE' : 'SHIVAA LIVE';", 1),
 ("/* v113b — a flat move reads \"— steady\" on every cell, Jaipur included.",
  "/* v113b — a flat move reads \"— steady\" on every cell, Shivaa's own included.", 1),
 ("bullion numbers pulse exactly like the Jaipur ones when the feed ticks. */",
  "bullion numbers pulse exactly like the Shivaa ones when the feed ticks. */", 1),
 ("cell('gold22', '✦ Jaipur Gold 22K / g'", "cell('gold22', '✦ Shivaa Gold 22K / g'", 1),
 # ── legal / terms ────────────────────────────────────────────────────────
 ("weight × the day\\u2019s Jaipur rate + a published making charge",
  "weight × the day\\u2019s Shivaa rate + a published making charge", 1),
 # ── home ─────────────────────────────────────────────────────────────────
 ("Gold & silver jewellery at live Jaipur rates, with every price broken down",
  "Gold & silver jewellery at live Shivaa rates, with every price broken down", 1),
 ('<a class="btn btn-light btn-lg" href="#/rates">Jaipur Live Rates</a>',
  '<a class="btn btn-light btn-lg" href="#/rates">Shivaa Live Rates</a>', 1),
 ("weighed to the milligram and billed at Jaipur's live rate &mdash;",
  "weighed to the milligram and billed at Shivaa's live rate &mdash;", 1),
 ("with individual specifications and Jaipur-rate pricing.",
  "with individual specifications and Shivaa-rate pricing.", 1),
 ("New designs are being photographed & priced at today's Jaipur rate",
  "New designs are being photographed & priced at today's Shivaa rate", 1),
 ("['rate', 'Live-Rate Pricing', 'Jaipur market feed &mdash;",
  "['rate', 'Live-Rate Pricing', 'Shivaa market feed &mdash;", 1),
 ("Every price below follows the live Jaipur gold & silver rate",
  "Every price below follows the live Shivaa gold & silver rate", 1),
 # ── compare / cart / quote ───────────────────────────────────────────────
 ("prices recalculate from the current Jaipur live rate and product making-charge data.",
  "prices recalculate from the current Shivaa live rate and product making-charge data.", 1),
 ("priced at the live Jaipur rate of ${timeFmt(state.rates.t)}",
  "priced at the live Shivaa rate of ${timeFmt(state.rates.t)}", 1),
 ("<p>Handcrafted pieces, priced live with the Jaipur rate.</p>",
  "<p>Handcrafted pieces, priced live with the Shivaa rate.</p>", 1),
 ("Below is your selection priced at Jaipur&rsquo;s <b>live rate of today",
  "Below is your selection priced at Shivaa&rsquo;s <b>live rate of today", 1),
 # ── rates page ───────────────────────────────────────────────────────────
 ("<p>Fetching the live Jaipur feed…</p>", "<p>Fetching the live Shivaa feed…</p>", 1),
 ('<span class="jh-badge">✦ JAIPUR MARKET RATE</span>',
  '<span class="jh-badge">✦ SHIVAA MARKET RATE</span>', 1),
 ("<span>22K Jaipur premium <small", "<span>22K Shivaa premium <small", 1),
 ("<span>Silver (Jaipur 925)</span>", "<span>Silver (Shivaa 925)</span>", 1),
 ("<div class=\"jh-note\">These Jaipur rates power every price on shivaa.in",
  "<div class=\"jh-note\">These Shivaa rates power every price on shivaa.in", 1),
 ("${[['GOLD 24K · JAIPUR', 'gold24', '99.99% fine — reference'], ['GOLD 22K · JAIPUR', 'gold22', '91.67% — jewellery grade'], ['GOLD 18K · JAIPUR', 'gold18', '75.0% — contemporary'], ['SILVER 925 · JAIPUR', 'silver', 'sterling — jewellery grade']]",
  "${[['GOLD 24K · SHIVAA', 'gold24', '99.99% fine — reference'], ['GOLD 22K · SHIVAA', 'gold22', '91.67% — jewellery grade'], ['GOLD 18K · SHIVAA', 'gold18', '75.0% — contemporary'], ['SILVER 925 · SHIVAA', 'silver', 'sterling — jewellery grade']]", 1),
 # ── about / footer / invoice ─────────────────────────────────────────────
 ("<p>Live Jaipur rates &middot; piece-level HUID guidance",
  "<p>Live Shivaa rates &middot; piece-level HUID guidance", 1),
 ("Metal value at the day&rsquo;s locked Jaipur rate + listed making charge",
  "Metal value at the day&rsquo;s locked Shivaa rate + listed making charge", 1),
 # ── buyback (B2C) ────────────────────────────────────────────────────────
 ("Live valuation against the same Jaipur rate feed that powers pricing.",
  "Live valuation against the same Shivaa rate feed that powers pricing.", 1),
 ("of your jewellery at the live Jaipur rate on the day you return",
  "of your jewellery at the live Shivaa rate on the day you return", 1),
 ('<span class="bbc-live"><i></i> LIVE JAIPUR RATE</span>',
  '<span class="bbc-live"><i></i> LIVE SHIVAA RATE</span>', 1),
 ("The same published Jaipur rate on the board that day",
  "The same published Shivaa rate on the board that day", 1),
 # ── Swarna Nidhi savings (B2C) ───────────────────────────────────────────
 ("<li><span>✦</span> Gold billed at the live Jaipur rate on redemption day</li>",
  "<li><span>✦</span> Gold billed at the live Shivaa rate on redemption day</li>", 1),
 ("Gold quantity is projected at today's Jaipur 22K rate of",
  "Gold quantity is projected at today's Shivaa 22K rate of", 1),
 ("The published live Jaipur rate on the day you redeem",
  "The published live Shivaa rate on the day you redeem", 1),
 # ── partner desk copy (TEXT ONLY — owner approved; zero logic/price change)
 ("<p>Today's Jaipur rate for 24K (99.999) fine gold:",
  "<p>Today's Shivaa rate for 24K (99.999) fine gold:", 1),
 ("<p>Today's Jaipur rates &mdash; fine 24K",
  "<p>Today's Shivaa rates &mdash; fine 24K", 1),
 # ── FAQ ──────────────────────────────────────────────────────────────────
 ("The metal rate is Jaipur's live rate at the time of billing",
  "The metal rate is Shivaa's live rate at the time of billing", 1),
 ("Prices track the live Jaipur rate and refresh every few minutes",
  "Prices track the live Shivaa rate and refresh every few minutes", 1),
]

V107 = [
 ("/* v119 — the 22K premium (₹398/g, desk physical) is its own setting; the\n       24K jaipurPremium is only a fallback for an older payload. */",
  "/* v119 — the 22K premium (₹398/g, desk physical) is its own setting.\n       v156 — the 24K line carries the SAME premium (owner's order) and the\n       legacy jaipurPremium is only a last-resort fallback for an old payload. */", 1),
 ("22K Jaipur premium — desk physical", "22K Shivaa premium — desk physical", 1),
 ("'payment verified · packing at the Jaipur atelier'", "'payment verified · packing at the Shivaa atelier'", 1),
]

V109 = [
 ('We do not invent a “typical Jaipur %”.', 'We do not invent a “typical market %”.'),
 ("Shivaa prices metal at the live Jaipur rate, adds the making on the card",
  "Shivaa prices metal at the live Shivaa rate, adds the making on the card", 1),
 ("not a “typical Jaipur rate” we made up", "not a “typical market rate” we made up", 1),
]
V109[0] = (V109[0][0], V109[0][1], 1)

BOT = [
 ("'Right now at the Jaipur feed:", "'Right now at the Shivaa feed:", 1),
 ("I’ll watch the Jaipur feed for you. ", "I’ll watch the Shivaa feed for you. ", 1),
]

apply('cms/js/app.js', APP)
apply('cms/js/v107.js', V107)
apply('cms/js/v109.js', V109)
apply('cms/js/bot.js', BOT)
print("done")
