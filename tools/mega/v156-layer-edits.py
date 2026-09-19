#!/usr/bin/env python3
"""v156 · v107.js (the footer basis line double-counted the premium)
        · v120.js (an empty location.hash made the Back button need N presses)"""
import io, sys

def rep(s, old, new, n=1):
    c = s.count(old)
    if c != n:
        print("MISMATCH: expected %d of %r, found %d" % (n, old[:90], c)); sys.exit(1)
    return s.replace(old, new)

# ══════════════════════════════ v107.js ══════════════════════════════════════
P = 'cms/js/v107.js'
s = io.open(P, encoding='utf-8').read()
s = rep(s, """    /* v119 — the 22K premium (₹398/g, desk physical) is its own setting.
       v156 — the 24K line carries the SAME premium (owner's order) and the
       legacy jaipurPremium is only a last-resort fallback for an old payload. */
    const premG = Number(set.gold22Premium !== undefined ? set.gold22Premium : set.jaipurPremium), premS = Number(set.jaipurSilverPremium);
    const basis = (isFinite(premG) && isFinite(premS))
      ? `How this price is built: live bullion spot <b>${fmt2(r.gold22)}/g (22K)</b> + <b>${fmt2(premG)}/g</b> 22K Shivaa premium — desk physical (silver +${fmt2(premS)}/g) · GST extra at checkout · rates re-checked every 10 minutes${r.t ? ' · last update ' + inrTime(r.t) : ''}.`
      : `Rates re-checked every 10 minutes${r.t ? ' · last update ' + inrTime(r.t) : ''} · GST extra at checkout.`;""",
"""    /* v119 — the 22K premium (₹398/g, desk physical) is its own setting.
       v156 — the 24K line carries the SAME premium (owner's order) and the
       legacy jaipurPremium is only a last-resort fallback for an old payload.

       ═══ v156 · BUG FIX — THE FOOTER DOUBLE-COUNTED SHIVAA'S PREMIUM ═══
       This is the shop's own "how this price is built" line, so it is the one
       place the arithmetic must be visibly true — and it was not. It printed
       `r.gold22`, which is the RETAIL rate with the premium ALREADY inside it,
       and labelled it "live bullion spot", then added the premium again:
       "spot ₹14,699.00/g + ₹398.00/g premium" reads as ₹15,097/g for metal the
       shop sells at ₹14,699/g. It also disagreed with the rates page, which
       shows the true spot and the premium as two separate rows that DO add up.
       Now: the premium comes from the rates payload first (it is the authority
       and it knows when the owner has pinned an absolute counter rate), the
       spot is re-derived from the SAME anchor the server derived the retail
       rate from (`anchorLevel.goldPerG × 0.9167`), so the three numbers add up
       EXACTLY — spot + premium = the rate every price on the site is built
       from — and a pinned override says so instead of inventing a premium. */
    const PM = r.premium || {};
    const isNum = v => (typeof v === 'number' && isFinite(v));
    const premG = isNum(PM.gold22) ? PM.gold22
      : Number(set.gold22Premium !== undefined ? set.gold22Premium : set.jaipurPremium);
    const prem24 = isNum(PM.gold24) ? PM.gold24 : (isNum(PM.gold) ? PM.gold : premG);
    const premS = isNum(PM.silver) ? PM.silver : Number(set.jaipurSilverPremium);
    const AL = r.anchorLevel || null;
    const anchor22 = (AL && isNum(Number(AL.goldPerG)) && Number(AL.goldPerG) > 0)
      ? Math.round(Number(AL.goldPerG) * 0.9167) : NaN;            // the server's own 22K derivation
    const pubSpot = (r.spot && isNum(Number(r.spot.gold22))) ? Number(r.spot.gold22) : NaN;
    const spot22 = isFinite(anchor22) ? anchor22
      : (isFinite(pubSpot) ? pubSpot : Math.max(0, Number(r.gold22) - premG));
    const pinned = !!PM.pinned;
    const basis = (isFinite(premG) && isFinite(premS) && isFinite(spot22))
      ? (pinned
        ? `How this price is built: the shop has <b>pinned its own counter rate</b> — <b>${fmt2(r.gold22)}/g (22K)</b> is absolute, with no premium added on top · GST extra at checkout${r.t ? ' · last update ' + inrTime(r.t) : ''}.`
        : `How this price is built: live bullion spot <b>${fmt2(spot22)}/g (22K)</b> + <b>${fmt2(premG)}/g</b> Shivaa premium = <b>${fmt2(spot22 + premG)}/g</b>, the rate every price on this site is built from · 24K carries the same <b>${fmt2(prem24)}/g</b> premium (silver +${fmt2(premS)}/g) · GST extra at checkout · rates re-checked every 10 minutes${r.t ? ' · last update ' + inrTime(r.t) : ''}.`)
      : `Rates re-checked every 10 minutes${r.t ? ' · last update ' + inrTime(r.t) : ''} · GST extra at checkout.`;""")
io.open(P, 'w', encoding='utf-8').write(s)
print('ok v107.js')

# ══════════════════════════════ v120.js ══════════════════════════════════════
P = 'cms/js/v120.js'
s = io.open(P, encoding='utf-8').read()
s = rep(s, """      var openHash = {};   // overlay id -> location.hash it opened on (false = closed)""",
"""      /* ═══ v156 · BUG FIX — THE BACK BUTTON NEEDED *N* PRESSES ON HOME ═══
         A bare shivaa.in/ visit has an EMPTY location.hash, and the empty
         string is falsy. `openHash[o.id] = location.hash` therefore recorded
         NOTHING on the home page, so:
           (a) `if (is && !openHash[o.id])` stayed true on EVERY class mutation
               anywhere in the document while a sheet was open, and pushed
               ANOTHER history entry each time (instrumented in the v127
               session: 2+ pushStates for a single drawer open), and
           (b) the close branch `else if (!is && openHash[o.id])` never ran, so
               not one of those entries was ever released — a shopper who
               opened the menu on the home page had to press Back once per
               mutation to get out of the shop.
         Found and instrumented during the v127 navigation repair and left
         alone on purpose (that brief said do not touch this file); the owner's
         19 Sep 2026 order — "find some bugs in the app and solve" — is the
         ask that opens it. The hash is now normalised on BOTH sides of the
         comparison, so `sameHash` means exactly what it always meant and the
         navigation guard v127 relies on is untouched; only the empty-hash
         (home page) case changes. */
      var curHash = function () { return location.hash || '#/'; };
      var openHash = {};   // overlay id -> hash it opened on ('#/' when the URL carries none); false = closed""")
s = rep(s, """          if (fromPop) { openHash[o.id] = is ? location.hash : false; continue; }
          if (is && !openHash[o.id]) { pushEntry(o.id); openHash[o.id] = location.hash; }
          else if (!is && openHash[o.id]) {
            var sameHash = (openHash[o.id] === location.hash);""",
"""          if (fromPop) { openHash[o.id] = is ? curHash() : false; continue; }
          if (is && !openHash[o.id]) { pushEntry(o.id); openHash[o.id] = curHash(); }
          else if (!is && openHash[o.id]) {
            var sameHash = (openHash[o.id] === curHash());""")
io.open(P, 'w', encoding='utf-8').write(s)
print('ok v120.js')
