"""v50 fresh-install QA — static verification of shivaa-FRESH-v50-full.zip.

Run: python3 qa/qa_v50_fresh.py   (no PHP/browser needed)

Owner's acceptance criteria, checked mechanically:
  · only the 65 rings, every other category empty, no sample products
  · one admin, everything user-generated empty
  · the Saathi chatbot is wired and present
  · the security shields (htaccess, rate limits, headers) are in the zip
  · the fabricated-testimonials removal is real
  · every code file in the zip is byte-identical to cms/
"""
import json, re, sys, zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ok, fail = [], []
def check(name, cond):
    (ok if cond else fail).append(name)
    print(('PASS ' if cond else 'FAIL '), name)

import sys as _sys
ZIP = ROOT / (_sys.argv[1] if len(_sys.argv) > 1 else next((ROOT / f for f in ('shivaa-FINAL-full.zip', 'shivaa-FRESH-v52-full.zip', 'shivaa-FRESH-v51-full.zip', 'shivaa-FRESH-v50-full.zip') if (ROOT / f).is_file()), ROOT / 'shivaa-FINAL-full.zip'))
if not ZIP.is_file():
    check('fresh zip exists', False)
    print(f'\n{len(ok)} passed · {len(fail)} failed'); sys.exit(1)

z = zipfile.ZipFile(ZIP)
names = set(n for n in z.namelist() if not n.endswith('/'))

# ── contents ──
EXPECT = {
    'index.html', 'api.php', 'mail.php', 'sms.php', 'hallmark.php', 'trust.php',
    'admin-reset.php', '.htaccess',
    'uploads/.htaccess', 'data/.htaccess', 'data/db.json',
    'js/app.js', 'js/admin.js', 'js/auth.js', 'js/bot.js', 'js/qr.js',
    'js/otp-autofill.js', 'js/hallmark.js', 'js/trust.js', 'js/three-d.js',
    'css/styles.css', 'css/fonts.css', 'css/hallmark.css', 'css/trust.css',
    'css/finale.css', 'css/bot.css',
}
for _d in ('INSTALL-FINAL.md', 'INSTALL-FRESH-v52.md', 'INSTALL-FRESH-v51.md', 'INSTALL-FRESH-v50.md'):
    if _d in names: EXPECT.add(_d); break
FINAL = 'INSTALL-FINAL.md' in names
if 'INSTALL-FRESH-v52.md' in names or FINAL:
    EXPECT |= {'robots.txt', 'sitemap.xml', 'manifest.webmanifest', 'sw.js', 'images/icons/icon-512.png'}
if FINAL:
    EXPECT |= {'HANDOFF.md', 'CLICK-BY-CLICK-STEPS.md'}
missing = EXPECT - names
check(f'zip has all {len(EXPECT)} expected files (missing {len(missing)}: {sorted(missing)[:4]})', not missing)
extra = names - EXPECT
if FINAL:
    extra = {e for e in extra if not e.startswith(('images/', 'docs/', 'uploads/', 'demo65/', 'qa/', 'deploy/', '.github/')) and e not in ('migrate-repair.php', 'samples-payload.json')}
check(f'no unexpected files slipped in ({sorted(extra) if extra else "none"})', not extra)

# code files byte-identical to cms/
bad = [n for n in sorted(EXPECT)
       if not n.startswith('data/') and n not in ('INSTALL-FRESH-v50.md',)
       and (ROOT / 'cms' / n).is_file() and (ROOT / 'cms' / n).read_bytes() != z.read(n)]
check(f'every code file byte-identical to cms/ ({len(bad)} differ: {bad[:3]})', not bad)
check('data/db.json in zip == deploy/fresh/db.json',
      z.read('data/db.json') == (ROOT / 'deploy' / 'fresh' / 'db.json').read_bytes())

# ── the fresh database: owner's "no samples" rule ──
db = json.loads(z.read('data/db.json'))
prods = db['products']
pgs = [p for p in prods if str(p.get('sku', '')).startswith('PGS')]
check(f'exactly 65 products and all are PGS rings ({len(prods)} products, {len(pgs)} PGS)',
      len(prods) == 65 and len(pgs) == 65)
check('every ring has the AI disclosure', all(p.get('mediaNote') for p in prods))
check('every ring orderable (stock>=10) with images list', all(p['stock'] >= 10 and isinstance(p.get('images'), list) and len(p['images']) == 4 for p in prods))
cats = sorted(set(p['category'] for p in prods))
check(f'only the rings category carries stock; categories present = {cats}', cats == ['rings'])
users = db['users']
check(f'one admin and nothing else ({[u["email"] + ":" + u["role"] for u in users]})',
      len(users) == 1 and users[0]['role'] == 'admin')
check('admin password is a bcrypt hash, not plaintext',
      str(users[0].get('passHash', '')).startswith(('$2b$', '$2y$')))
_empty_keys = ['orders', 'reviews', 'tokens', 'contactMsgs', 'newsletter',
               'partners', 'coupons', 'finaleEntries', 'securityLog']
if FINAL:
    _empty_keys.remove('reviews')   # v53: owner restored the original 767 reviews
    _empty_keys.remove('coupons')   # v55: BRIDALSET coupon intentionally pre-seeded
    check('only the seeded BRIDALSET coupon exists', [c.get('code') for c in db.get('coupons', [])] == ['BRIDALSET'])
empties = [k for k in _empty_keys if db.get(k)]
check(f'user-generated collections all empty ({empties or "yes"})', not empties)

# ── wiring ──
idx = z.read('index.html').decode()
check('index wires bot.css and bot.js (versioned)', '/css/bot.css?v=5' in idx and '/js/bot.js?v=5' in idx)
check('index bumps app.js (versioned)', '/js/app.js?v=5' in idx)

app = z.read('js/app.js').decode()
if FINAL:
    check('v53: original review showcase restored (owner instruction)',
          '767 verified' in app and 'Meenakshi' in app and 'Verified buyer' in app)
else:
    check('fabricated review count removed', '767 verified' not in app)
    check('fictional customer names removed', 'Meenakshi' not in app and 'Sneha Kulkarni' not in app)
check('honest social-proof loader present', 'loadSocialProof' in app)
check('empty categories point to Saathi (cataloguing state)', 'being catalogued' in app and 'saathiOpen' in app)

bot = z.read('js/bot.js').decode()
check('bot knows rates, policies and can decide', all(k in bot for k in ['gold22', 'hallmark', 'buyback', 'recommend', 'occasion']))
check('bot shows designs and deep-links product pages', 'sa-card' in bot and '#/product/' in bot)
unesc = re.findall(r"\$\{(?![^}]*\besc\()([^}]*\b(?:\.name|\.text|\.city|\.prod|\.userName)\b[^}]*)\}", bot)
check('bot escapes every name/text/city it renders (no raw interpolation: %s)' % (unesc[:2] or 'none'), not unesc)
check('bot has no popups and no third-party calls', 'alert(' not in bot and 'http' not in re.sub(r"'[^']*'", '', bot).replace('https', ''))

# ── security shields ──
h_root = z.read('.htaccess').decode()
check('root htaccess: CSP + HSTS + json denial', all(k in h_root for k in ['Content-Security-Policy', 'Strict-Transport-Security', 'Require all denied']))
h_up = z.read('uploads/.htaccess').decode()
check('uploads cannot execute php', 'php' in h_up and 'denied' in h_up)
h_data = z.read('data/.htaccess').decode()
check('data folder fully denied', 'Require all denied' in h_data)
api = z.read('api.php').decode()
check('anonymous forms rate-limited (pub_rate on contact+newsletter)',
      api.count('pub_rate($db') >= 2)
check('reviews readable for the proof wall & bot', "route === 'reviews' && $method === 'GET'" in api)

doc = z.read(next(d for d in ('INSTALL-FINAL.md', 'INSTALL-FRESH-v52.md', 'INSTALL-FRESH-v51.md', 'INSTALL-FRESH-v50.md') if d in names)).decode()
check('install doc names the one-time password + change-it step', 'One-time first password' in doc and 'My sign-in password' in doc)
check('install doc checks the dot-file shields landed', 'show hidden files' in doc)
check('install doc points at the ring bridge for photos', 'Part 4' in doc)

print('\n── v51: Bhai Dooj scheme, Saathi v2, hardening ──')
check('campaign renamed to Bhai Dooj', 'Bhai Dooj Gold Finale' in app)
check('prize is 10 g, no 100 g prize copy left', '10 g' in app and '100 g of certified' not in app and 'New Year Gold Finale' not in app)
check('draw is Bhai Dooj 11 Nov 2026, no 31 Dec left', '11 November 2026' in app and '31 December 2026' not in app and '31 Dec 2026' not in app)
check('silver qualifying route untouched (100 g silver stays)', '100 g of silver' in app)
check('Saathi v2: action tiles + in-chat add/compare', 'sa-tiles' in bot and 'data-add' in bot and 'data-cmp' in bot)
check('Saathi v2: spoken numbers + follow-ups', 'thousand' in bot and 'cheaper' in bot and 'more like' in bot)
check('Saathi knows the Bhai Dooj scheme & lawfulness', 'Bhai Dooj' in bot and 'lawful' in bot)
check('Saathi live-rate ticker in header', 'saathiTick' in bot)
check('admin logins audited in securityLog', 'admin-login' in api)
check('lockouts audited too', 'login-lockout' in api)
check('two extra hardening headers', 'X-Permitted-Cross-Domain-Policy' in h_root and 'X-DNS-Prefetch-Control' in h_root)

if 'INSTALL-FRESH-v52.md' in names or FINAL:
    print('\n── v52: SEO/PWA, legal pages, Hindi+voice Saathi, backup, brain tests ──')
    idx2 = z.read('index.html').decode()
    check('SEO: canonical + OG + JSON-LD present', all(k in idx2 for k in ['rel="canonical"', 'og:title', 'application/ld+json']))
    check('PWA: manifest + SW registration wired', 'manifest.webmanifest' in idx2 and "register('/sw.js')" in idx2)
    check('footer campaign link says Bhai Dooj, no New Year anywhere in index', 'Bhai Dooj Gold Finale' in idx2 and 'New Year' not in idx2)
    check('legal pages terms/refund/shipping in app.js + footer links', all(('pages.' + k) in app for k in ('terms', 'refund', 'shipping')) and '#/terms' in idx2 and '#/refund' in idx2 and '#/shipping' in idx2)
    check('Saathi v52: Hindi engine + voice mic + test hooks', 'FACTS_HI' in bot and 'saathiMic' in bot and '_test' in bot)
    check('Saathi Hindi facts cover the scheme', 'भाई दूज' in bot and '10 ग्राम' in bot)
    check('admin backup endpoint + button', "admin/backup" in api and 'ShivaaAdmin.backup' in z.read('js/admin.js').decode())
    check('dashboard shows recent sign-ins', 'signIns' in api and 'Security · recent events' in z.read('js/admin.js').decode())
    check('sitemap + robots present and consistent', 'sitemap.xml' in z.read('robots.txt').decode() and 'shivaa.in' in z.read('sitemap.xml').decode())
    check('SW is network-first and skips api/data/uploads', 'fetch(r)' in z.read('sw.js').decode() and "/api/" in z.read('sw.js').decode())

if FINAL:
    print('\n── v53 FINAL: photos inside, reviews restored, 65 rings complete ──')
    check(f'db carries the restored 767 reviews ({len(db.get("reviews", []))})', len(db.get('reviews', [])) == 767)
    rcounts = [p.get('reviews', 0) for p in prods]
    check(f'every ring has 11-12 reviews (min {min(rcounts)}, max {max(rcounts)})', all(11 <= c <= 12 for c in rcounts))
    check('ring photos are inside the zip (421 files)',
          sum(1 for x in names if x.startswith('images/designs/rings/')) == 421)
    check('zip also carries banners/products/reviews imagery',
          any(x.startswith('images/reviews/') for x in names) and any(x.startswith('images/products/') for x in names))
    check('install doc has the full changelog + roadmap', 'v53 — this release' in doc and 'Payment gateway' in doc and '18 proposals' in doc or 'roadmap status' in doc.lower())
    check('customer review photos cust-1..5 present', all(f'images/reviews/cust-{i}.jpg' in names for i in range(1, 6)))

if FINAL and 'demo65/media' in ''.join(names):
    print('\n── v54: UX upgrades + chat superpowers + full provenance inside ──')
    cssx = z.read('css/styles.css').decode()
    idx3 = z.read('index.html').decode()
    check('global UX: scroll progress + back-to-top + view fade', all(k in app for k in ['scrollProg', 'backTop']) and '#scrollProg' in cssx and 'viewIn' in cssx)
    check('home strips: trending + recently viewed', 'renderTrending' in app and 'renderRecentViewed' in app and 'recentAdd' in app)
    check('mobile sticky buy bar + tap zoom', 'pdpBuybar' in app and '#pdpBuybar' in cssx and 'zoomed' in cssx)
    check('finale live prize-worth tracker', 'prizeWorth' in app and 'fillPrizeWorth' in app)
    check('Saathi v54: order tracking + rate alerts + share + compare-in-chat', all(k in bot for k in ['track my order', 'ratealert', 'shareResults', 'compare']))
    check('assets versioned (v5x wiring)', '/css/styles.css?v=4' in idx3 and '/js/app.js?v=5' in idx3 and '/js/bot.js?v=5' in idx3)
    n65 = sum(1 for x in names if x.startswith('demo65/media/') and not x.endswith('/'))
    import subprocess
    real = int(subprocess.run(['bash', '-c', 'find demo65/media -type f | wc -l'], capture_output=True, text=True).stdout.strip())
    check(f'zip carries ALL AI media provenance ({n65} files == {real} on disk)', n65 == real and real > 300)
    check('zip carries the QA suites + deploy scripts', 'qa/qa_v50_fresh.py' in names and 'deploy/add_legacy_reviews.py' in names)

    print('\n── v55: the big feature drop ──')
    admx = z.read('js/admin.js').decode()
    check('API: finale counter + events + carts + order-meta + khata + referral codes',
          all(k in api for k in ['finale/count', "route === 'ev'", 'carts/abandon', 'admin/order-meta', 'admin/khata', 'referralCode']))
    check('Admin: Khata tab + order tools + GSTR CSV + nudge + settings fields',
          all(k in admx for k in ['Khata', 'gstrCSV', 'orderMeta', 'nudgeCart', 'khataPrint', 'drawStreamUrl', 'tierSilver']))
    check('Storefront: rate pill + ready badges + welcome-back bar + EMI box',
          all(k in app for k in ['ratePill', 'ready-badge', 'backBar', 'emi-box']))
    check('Five new pages: bundle, giftcard, refer, videoconsult, pickup',
          all(('pages.' + k) in app for k in ['bundle', 'giftcard', 'refer', 'videoconsult', 'pickup']))
    check('Finale: entry counter + draw-night stream + winner announcement',
          all(k in app for k in ['entryCount', 'drawStreamBtn', 'winnerNote']))
    check('Funnel analytics + referral capture + abandon capture client-side',
          all(k in app for k in ['sendEv', 'sh_ref', 'carts/abandon']))
    check('Offline catalogue in service worker', 'offlineApi' in z.read('sw.js').decode())
    check('BRIDALSET coupon seeded in fresh db', any(c.get('code') == 'BRIDALSET' for c in db.get('coupons', [])))
    check('CI quality gate workflow present', '.github/workflows/qa.yml' in names)
    check('v55 asset wiring', '/js/app.js?v=55' in idx3 and '#/bundle' in idx3 and '#/giftcard' in idx3)

print(f'\n{len(ok)} passed · {len(fail)} failed')
sys.exit(1 if fail else 0)
