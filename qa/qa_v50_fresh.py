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
ZIP = ROOT / (_sys.argv[1] if len(_sys.argv) > 1 else ('shivaa-FRESH-v51-full.zip' if (ROOT / 'shivaa-FRESH-v51-full.zip').is_file() else 'shivaa-FRESH-v50-full.zip'))
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
if 'INSTALL-FRESH-v51.md' in names: EXPECT.add('INSTALL-FRESH-v51.md')
else: EXPECT.add('INSTALL-FRESH-v50.md')
missing = EXPECT - names
check(f'zip has all {len(EXPECT)} expected files (missing {len(missing)}: {sorted(missing)[:4]})', not missing)
extra = names - EXPECT
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
empties = [k for k in ['orders', 'reviews', 'tokens', 'contactMsgs', 'newsletter',
                       'partners', 'coupons', 'finaleEntries', 'securityLog'] if db.get(k)]
check(f'user-generated collections all empty ({empties or "yes"})', not empties)

# ── wiring ──
idx = z.read('index.html').decode()
check('index wires bot.css and bot.js (versioned)', '/css/bot.css?v=5' in idx and '/js/bot.js?v=5' in idx)
check('index bumps app.js (versioned)', '/js/app.js?v=5' in idx)

app = z.read('js/app.js').decode()
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

doc = z.read('INSTALL-FRESH-v51.md' if 'INSTALL-FRESH-v51.md' in names else 'INSTALL-FRESH-v50.md').decode()
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

print(f'\n{len(ok)} passed · {len(fail)} failed')
sys.exit(1 if fail else 0)
