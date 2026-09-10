"""v51: scheme change — 100 g New-Year prize -> 10 g on Bhai Dooj (11 Nov 2026).
Owner instruction (10 Sep 2026): 'we are not giving 100 g gold we are just
giving 10 g gold and on this Bhai dooj'. Silver QUALIFYING routes (100 g) stay.
"""
import sys
p = 'cms/js/app.js'
s = open(p, encoding='utf-8').read()
o = s

def rep(old, new, n=1, label=''):
    global s
    c = s.count(old)
    if n == 'all':
        assert c >= 1, f'NOT FOUND ({label or old[:40]}) count={c}'
        s = s.replace(old, new)
        print('ok x%d:' % c, label or old[:48]); return
    assert c >= n, f'NOT FOUND ({label or old[:40]}) count={c}'
    s = s.replace(old, new, n)
    print('ok:', label or old[:48])

# header comment
rep("   NEW YEAR GOLD FINALE · 2026 — campaign module", "   BHAI DOOJ GOLD FINALE · 2026 — campaign module (Bhai Dooj edition)")
rep("   Time-boxed: lives through 31 Dec 2026 (IST draw day) and\n   auto-expires at 00:00 IST on 1 Jan 2027 by date check alone — no\n   flag to flip.", "   Time-boxed: lives through Bhai Dooj, 11 Nov 2026 (IST draw night) and\n   auto-expires at 00:00 IST on 1 Dec 2026 by date check alone — no\n   flag to flip.")
rep("   quiz route with equal odds · CA-witnessed live draw 31 Dec 2026 ·\n   100 g certified 24K bullion at current market value · TN & WB", "   quiz route with equal odds · CA-witnessed live draw on Bhai Dooj\n   (11 Nov 2026) · 10 g certified 24K gold at current market value · TN & WB")

# FINALE config
rep("  name: 'The New Year Gold Finale',", "  name: 'The Bhai Dooj Gold Finale',")
rep("  drawLabel: '31 December 2026',", "  drawLabel: 'Bhai Dooj · 11 November 2026',")
rep("  drawAt: new Date(2026, 11, 31, 23, 59, 59).getTime(),", "  drawAt: new Date(2026, 10, 11, 23, 59, 59).getTime(),")
rep("  endAt: new Date(2027, 0, 1, 0, 0, 0).getTime(),", "  endAt: new Date(2026, 11, 1, 0, 0, 0).getTime(),")
rep("  // the module switches itself off from the first moment of 1 Jan 2027", "  // the module switches itself off from the first moment of 1 Dec 2026")
rep("/* countdown chips to the 31 Dec draw (same .fc-cell visual language) */", "/* countdown chips to the Bhai Dooj draw (same .fc-cell visual language) */")

# prize amount
rep("<small>Shivaa · fine gold</small><em>100 g</em>", "<small>Shivaa · fine gold</small><em>10 g</em>")
rep("one customer wins 100 g of certified 24K gold bullion", "one customer wins 10 g of certified 24K gold")
rep("New Year Gold Finale", "Bhai Dooj Gold Finale", 'all')
rep("<b>31 December 2026</b>", "<b>Bhai Dooj night — 11 November 2026</b>", 'all')
rep("CA-witnessed draw · 31 Dec 2026", "CA-witnessed draw · Bhai Dooj · 11 Nov 2026", 'all')
rep("CA-witnessed live draw · 31 Dec 2026", "CA-witnessed live draw · Bhai Dooj · 11 Nov 2026", 'all')

# prize section copy
rep("<h2>One hundred grams. <span class=\"disp-italic\">Certified.</span></h2>", "<h2>Ten grams. <span class=\"disp-italic\">Certified.</span></h2>")
rep("✦ 100 g · 24K gold bullion biscuit", "✦ 10 g · 24K gold bullion biscuit")
rep("the winner takes delivery of a 100&nbsp;g certified 24K gold biscuit — worth ≈ ₹15 lakh when the campaign was announced at its ≈ ₹15,000/g planning rate, and worth whatever 100&nbsp;g of 24K gold commands on 31 December 2026. Bought early, insured, and held under two-person custody until the draw.",
    "the winner takes delivery of a 10&nbsp;g certified 24K gold biscuit — a Bhai Dooj gift from Shivaa worth ≈ ₹1.5 lakh at the ≈ ₹15,000/g planning rate, and worth whatever 10&nbsp;g of 24K gold commands on Bhai Dooj, 11 November 2026. Bought early, insured, and held under two-person custody until the draw.")

# dates / timeline
rep("<b>Entry opens early October 2026.</b>", "<b>Entry opens early October 2026.</b>")  # unchanged, sanity
rep("Entries close ≈ 18–20 Dec 2026", "Entries close ≈ 7–8 Nov 2026", 'all')
rep("<span class=\"tl-date\">≈ 18–20 Dec</span><b>Entries close</b>", "<span class=\"tl-date\">≈ 7–8 Nov</span><b>Entries close</b>")
rep("<span class=\"tl-date\">31 Dec</span><b>LIVE draw</b>", "<span class=\"tl-date\">11 Nov</span><b>LIVE draw · Bhai Dooj</b>")
rep("<span class=\"tl-date\">Jan 2027</span><b>Handover</b>", "<span class=\"tl-date\">Nov–Dec 2026</span><b>Handover</b>")

open(p, 'w', encoding='utf-8').write(s)
leftover = [l for l in s.splitlines() if '31 Dec' in l or '100 g of certified' in l or 'New Year' in l]
print('leftover 31Dec/100g-prize/NewYear lines:', leftover or 'NONE')
print('delta bytes:', len(s) - len(o))
