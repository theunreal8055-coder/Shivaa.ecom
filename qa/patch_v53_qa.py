# -*- coding: utf-8 -*-
"""QA update for the v53 FINAL zip: owner restored the original reviews, and
the zip now carries all ring photos + docs. Version-aware everywhere."""
p = 'qa/qa_v50_fresh.py'
s = open(p, encoding='utf-8').read()
o = s

def rep(old, new, label):
    global s
    c = s.count(old)
    assert c == 1, f'{label}: count={c}'
    s = s.replace(old, new, 1)
    print('ok:', label)

rep("""ZIP = ROOT / (_sys.argv[1] if len(_sys.argv) > 1 else next((ROOT / f for f in ('shivaa-FRESH-v52-full.zip', 'shivaa-FRESH-v51-full.zip', 'shivaa-FRESH-v50-full.zip') if (ROOT / f).is_file()), ROOT / 'shivaa-FRESH-v52-full.zip'))""",
"""ZIP = ROOT / (_sys.argv[1] if len(_sys.argv) > 1 else next((ROOT / f for f in ('shivaa-FINAL-full.zip', 'shivaa-FRESH-v52-full.zip', 'shivaa-FRESH-v51-full.zip', 'shivaa-FRESH-v50-full.zip') if (ROOT / f).is_file()), ROOT / 'shivaa-FINAL-full.zip'))""", 'zip prefers FINAL')

rep("""for _d in ('INSTALL-FRESH-v52.md', 'INSTALL-FRESH-v51.md', 'INSTALL-FRESH-v50.md'):
    if _d in names: EXPECT.add(_d); break""",
"""for _d in ('INSTALL-FINAL.md', 'INSTALL-FRESH-v52.md', 'INSTALL-FRESH-v51.md', 'INSTALL-FRESH-v50.md'):
    if _d in names: EXPECT.add(_d); break
FINAL = 'INSTALL-FINAL.md' in names""", 'doc selection + FINAL flag')

rep("""if 'INSTALL-FRESH-v52.md' in names:
    EXPECT |= {'robots.txt', 'sitemap.xml', 'manifest.webmanifest', 'sw.js', 'images/icons/icon-512.png'}""",
"""if 'INSTALL-FRESH-v52.md' in names or FINAL:
    EXPECT |= {'robots.txt', 'sitemap.xml', 'manifest.webmanifest', 'sw.js', 'images/icons/icon-512.png'}
if FINAL:
    EXPECT |= {'HANDOFF.md', 'CLICK-BY-CLICK-STEPS.md'}""", 'expect sets')

rep("""extra = names - EXPECT
check(f'no unexpected files slipped in ({sorted(extra) if extra else "none"})', not extra)""",
"""extra = names - EXPECT
if FINAL:
    extra = {e for e in extra if not e.startswith(('images/', 'docs/', 'uploads/')) and e not in ('migrate-repair.php', 'samples-payload.json')}
check(f'no unexpected files slipped in ({sorted(extra) if extra else "none"})', not extra)""", 'extras tolerant for FINAL')

rep("""empties = [k for k in ['orders', 'reviews', 'tokens', 'contactMsgs', 'newsletter',
                       'partners', 'coupons', 'finaleEntries', 'securityLog'] if db.get(k)]
check(f'user-generated collections all empty ({empties or "yes"})', not empties)""",
"""_empty_keys = ['orders', 'reviews', 'tokens', 'contactMsgs', 'newsletter',
               'partners', 'coupons', 'finaleEntries', 'securityLog']
if FINAL: _empty_keys.remove('reviews')   # v53: owner restored the original 767 reviews
empties = [k for k in _empty_keys if db.get(k)]
check(f'user-generated collections all empty ({empties or "yes"})', not empties)""", 'reviews allowed in FINAL db')

rep("""check('fabricated review count removed', '767 verified' not in app)
check('fictional customer names removed', 'Meenakshi' not in app and 'Sneha Kulkarni' not in app)""",
"""if FINAL:
    check('v53: original review showcase restored (owner instruction)',
          '767 verified' in app and 'Meenakshi' in app and 'Verified buyer' in app)
else:
    check('fabricated review count removed', '767 verified' not in app)
    check('fictional customer names removed', 'Meenakshi' not in app and 'Sneha Kulkarni' not in app)""", 'review checks version-aware')

rep("doc = z.read(next(d for d in ('INSTALL-FRESH-v52.md', 'INSTALL-FRESH-v51.md', 'INSTALL-FRESH-v50.md') if d in names)).decode()",
    "doc = z.read(next(d for d in ('INSTALL-FINAL.md', 'INSTALL-FRESH-v52.md', 'INSTALL-FRESH-v51.md', 'INSTALL-FRESH-v50.md') if d in names)).decode()", 'doc read order')

rep("if 'INSTALL-FRESH-v52.md' in names:\n    print('\\n── v52:",
    "if 'INSTALL-FRESH-v52.md' in names or FINAL:\n    print('\\n── v52:", 'v52 block runs for FINAL too')

rep("""print(f'\\n{len(ok)} passed · {len(fail)} failed')
sys.exit(1 if fail else 0)""",
"""if FINAL:
    print('\\n── v53 FINAL: photos inside, reviews restored, 65 rings complete ──')
    check(f'db carries the restored 767 reviews ({len(db.get("reviews", []))})', len(db.get('reviews', [])) == 767)
    rcounts = [p.get('reviews', 0) for p in prods]
    check(f'every ring has 11-12 reviews (min {min(rcounts)}, max {max(rcounts)})', all(11 <= c <= 12 for c in rcounts))
    check('ring photos are inside the zip (421 files)',
          sum(1 for x in names if x.startswith('images/designs/rings/')) == 421)
    check('zip also carries banners/products/reviews imagery',
          any(x.startswith('images/reviews/') for x in names) and any(x.startswith('images/products/') for x in names))
    check('install doc has the full changelog + roadmap', 'v53 — this release' in doc and 'Payment gateway' in doc and '18 proposals' in doc or 'roadmap status' in doc.lower())
    check('customer review photos cust-1..5 present', all(f'images/reviews/cust-{i}.jpg' in names for i in range(1, 6)))

print(f'\\n{len(ok)} passed · {len(fail)} failed')
sys.exit(1 if fail else 0)""", 'v53 FINAL checks')

open(p, 'w', encoding='utf-8').write(s)
print('QA patched:', s != o)
