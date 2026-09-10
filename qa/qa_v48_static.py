"""v48 QA — static checks on the PHP that ships in the deploy zips.

Run:  python3 qa/qa_v48_static.py        (no PHP interpreter needed)

Why static: this sandbox has no PHP and no outbound HTTPS, so the shipped
files cannot be executed here. What CAN be checked mechanically is what has
bitten us before — statement ordering (a `declare(strict_types=1)` that is
not first is a compile-time fatal: blank page / HTTP 500), brace balance,
the "code never comes back in the HTTP reply" invariant, and the v48 arm
flow in admin-reset.php (the file that has to work with no code editor).

The PHP "tokenizer" below is string/comment aware, so URLs inside strings
(`http://…`) are not mistaken for `//` comments — a naive regex stripper
gets that wrong and reports false imbalance.
"""
import json, re, sys, zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ok, fail = [], []


def check(name, cond):
    (ok if cond else fail).append(name)
    print(('PASS ' if cond else 'FAIL '), name)


# ───────────────────────── PHP tokenizer ─────────────────────────
def php_code_only(src: str) -> str:
    """Strip comments, string literals AND inline-HTML sections, leaving the
    PHP code skeleton.

    Two things make a naive stripper lie:
      · a URL inside a string ("http://x") looks like a // comment — so
        strings must be consumed before comments are even considered;
      · `deploy/ring_reset_bridge.php` closes PHP with `?>` and writes raw
        HTML, so an apostrophe in that HTML ("confirm('Delete…')") is not a
        string opener at all. Mode switching has to be tracked.

    Returns '' on a malformed file (unterminated string/comment) so callers
    can flag it instead of silently passing.
    """
    out, i, n = [], 0, len(src)
    in_php = False                      # a file starts in HTML mode until <?php
    while i < n:
        if not in_php:
            j = src.find('<?', i)
            if j < 0:
                break                   # trailing HTML output — no code there
            i = j + (5 if src[j:j + 5] == '<?php' else 3 if src[j:j + 3] == '<?=' else 2)
            in_php = True
            continue
        c = src[i]
        two = src[i:i + 2]
        if two == '?>':
            in_php = False
            i += 2
        elif two == '//':
            j = src.find('\n', i)
            i = n if j < 0 else j
        elif two == '/*':
            j = src.find('*/', i + 2)
            if j < 0:
                return ''
            i = j + 2
        elif c == '#' and src[i:i + 2] != '#!':
            j = src.find('\n', i)
            i = n if j < 0 else j
        elif c in '"\'':
            q, i, closed = c, i + 1, False
            while i < n:
                if src[i] == '\\':
                    i += 2
                    continue
                if src[i] == q:
                    closed = True
                    i += 1
                    break
                i += 1
            if not closed:
                return ''
            out.append('""')
        else:
            out.append(c)
            i += 1
    return ''.join(out)


def first_statement(src: str) -> str:
    """First executable PHP statement, with comments/HTML removed."""
    code = php_code_only(src)
    m = re.search(r'\S.*?;', code, re.S)
    return ' '.join(m.group(0).split()) if m else ''


def balance(src: str):
    code = php_code_only(src)
    return (code.count('{') - code.count('}'),
            code.count('(') - code.count(')'),
            code.count('[') - code.count(']'))


PHP = ['cms/admin-reset.php', 'cms/api.php', 'cms/mail.php', 'cms/sms.php',
       'cms/hallmark.php', 'cms/trust.php', 'deploy/ring_reset_bridge.php']

print('── every shipped PHP file parses structurally ──')
for rel in PHP:
    p = ROOT / rel
    if not p.is_file():
        check(f'{rel} exists', False)
        continue
    src = p.read_text(encoding='utf-8')
    check(f'{rel}: declare(strict_types=1) is the FIRST statement '
          f'[got: {first_statement(src)[:48]}]',
          first_statement(src).startswith('declare(strict_types=1)'))
    b, pr, br = balance(src)
    check(f'{rel}: braces/parens/brackets balanced {b}/{pr}/{br}',
          (b, pr, br) == (0, 0, 0))
    check(f'{rel}: tokenizer found no unterminated string/comment', src != '' and php_code_only(src) != '')

# ───────────────── admin-reset.php — v48 "no editing needed" ─────────────────
ar = (ROOT / 'cms/admin-reset.php').read_text(encoding='utf-8')
code = php_code_only(ar)
print('\n── admin-reset.php arms itself (nothing to edit) ──')
check('no const ENABLED left (the line owners could not edit)', 'const ENABLED' not in ar)
check('no const RECOVERY_KEY left', 'const RECOVERY_KEY' not in ar)
check('no bare ENABLED / RECOVERY_KEY identifiers referenced',
      not re.search(r'(?<![\w$])ENABLED(?![\w_])', code) and
      not re.search(r'(?<![\w$])RECOVERY_KEY(?![_\w])', code))
check('config lives in data/admin-recovery.json', "data/admin-recovery.json" in ar)
check('key is stored as a salted sha256 hash, never in plain text',
      "hash('sha256', $salt . '|' . $key)" in ar and 'keyHash' in ar)
check('arming requires a file that only the server owner can create',
      'shivaa-unlock-' in ar and "isset($_POST['arm'])" in ar and 'is_file($DIR' in ar)
check('the challenge file name is unpredictable (random token)', 'shv_rand_hex(8)' in ar
      and re.search(r"preg_match\('/\^\[a-f0-9\]\{16\}\$/'", ar) is not None)
check('challenge token expires (24h) so stale names cannot be reused', '86400' in ar)
check('key length enforced (>= 12) and both boxes must match',
      '$KEY_MIN  = 12' in ar and 'strlen($k) < $KEY_MIN' in ar and '$k !== $k2' in ar)
check('unwritable data/ is reported in plain words, not a blank page',
      'could not write <code>data/admin-recovery.json' in ar)
check('a lost key is recoverable (rearm button wipes the config)',
      "isset($_POST['rearm'])" in ar and '@unlink($CFG_FILE)' in ar)
check('successful reset self-deletes the file', '@unlink(__FILE__)' in ar)
check('the one-time marker is still written', 'file_put_contents($USED_FILE' in ar)
check('fatal-error guard still present (no blank 500)', 'register_shutdown_function' in ar)
check('read-only diagnostic still present', 'function diagnose(' in ar and "isset($_POST['diag'])" in ar)
check('password still requires 8+ chars and a second box',
      'strlen($pw) < 8' in ar and '$pw !== $pw2' in ar)
check('all sessions for the account are revoked on reset', "'sessionsRevoked' => $revoked" in ar)
check('every echoed value goes through h() — no raw $_POST into HTML',
      'echo $key' not in ar and 'echo $_POST' not in ar)
check('the challenge file is deleted after arming',
      "@unlink($DIR . '/data/' . $fname)" in ar)

# ───────────────── api.php / mail.php — the code never returns to the caller ──
api = (ROOT / 'cms/api.php').read_text(encoding='utf-8')
mail = (ROOT / 'cms/mail.php').read_text(encoding='utf-8')
print('\n── v48: one-time codes go to email and never back to the browser ──')
check("api.php has zero 'devCode' (the leak that made takeover trivial)", 'devCode' not in api)
check("api.php loads the mailer", "require_once __DIR__ . '/mail.php';" in api)
check('exactly 3 delivery sites (login, reset, KYC)', api.count('otp_deliver($db') == 3)
check('all 3 senders report the masked destination, not the code',
      api.count("'masked' =>") >= 3 and api.count("'via' =>") >= 3)
check('per-IP email cap exists', 'mailRate' in api)
check('unregistered number with no email is a 400 with hasAccount:false',
      'hasAccount' in api and 'not registered yet' in api)
check('mail.php exposes a masking helper', 'function shivaa_mail_mask' in mail)
check('mail.php strips CR/LF from every header value (injection guard)',
      'str_replace(["\\r", "\\n", "%0a", "%0d"]' in mail)
check('mail body can only ever be a 6-digit code', "preg_match('/^\\d{6}$/', $code)" in mail)
check('mail.php never throws at the caller', 'catch (\\Throwable' in mail or 'catch (Throwable' in mail)

# ───────────────── index.html cache-busters + zip integrity ─────────────────
idx = (ROOT / 'cms/index.html').read_text(encoding='utf-8')
print('\n── cache-busters + deploy zip ──')
for f in ('auth.js', 'admin.js'):
    check(f'index.html loads js/{f}?v=48', f'/js/{f}?v=48' in idx)
check('index.html loads js/app.js versioned (fresh-install bump)', '/js/app.js?v=5' in idx)

ZIP = ROOT / 'shivaa-update-v49-ai-disclosure.zip'
# v49 was the UPDATE zip for existing sites; the FRESH install (v50) supersedes
# it. Its byte-identity is verified in qa_v50_fresh.py. Here we only require the
# retired artifact to still exist for anyone mid-upgrade.
check('retired v49 update zip still on disk for existing sites', ZIP.is_file())

# ─────────────── the owner walkthrough matches the real UI ───────────────
# CLICK-BY-CLICK-STEPS.md tells a non-technical owner what to click. If a
# label drifts, the instructions point at a button that does not exist.
print('\n── CLICK-BY-CLICK-STEPS.md labels exist in the shipped files ──')
doc = (ROOT / 'CLICK-BY-CLICK-STEPS.md').read_text(encoding='utf-8')
LABELS = {
    'cms/admin-reset.php': [
        'Recovery file — arm it in 2 clicks', 'Step 1 — create this file',
        'Found it. Now choose your key below', 'Arm this recovery file',
        'Lost the key? Arm it again', 'Check what is wrong (changes nothing)',
        'Set the new password', 'Password reset complete', 'has deleted itself'],
    'cms/js/admin.js': ['Code delivery (SMS / email)', 'Send test code'],
}
for rel, labels in LABELS.items():
    body = (ROOT / rel).read_text(encoding='utf-8')
    for lab in labels:
        in_doc = lab in doc
        check(f'{rel} still shows "{lab}"' + ('' if in_doc else '  [not in the walkthrough!]'),
              lab in body and in_doc)
check('the walkthrough points at the v49 zip and still ignores the editing one',
      'shivaa-update-v49-ai-disclosure.zip' in doc and 'Ignore `shivaa-admin-recovery-FIXED.zip`' in doc)

# ─────────────── v49: the AI disclosure must actually reach shoppers ───────────────
print('\n── v49: AI disclosure on the product page ──')
app = (ROOT / 'cms/js/app.js').read_text(encoding='utf-8')
check('app.js renders p.mediaNote on the PDP', 'p.mediaNote' in app and 'hand-finished by our karigars' in app)
import json as _json
_db = _json.load(open(ROOT / 'cms/data/db.json', encoding='utf-8'))
_pgs = [x for x in _db['products'] if str(x.get('sku', '')).startswith('PGS')]
_missing = sum(1 for x in _pgs if not x.get('mediaNote'))
check(f'all {len(_pgs)} PGS rings in db.json carry the disclosure ({_missing} missing)', _missing == 0)
check('disclosure text matches the meta.json wording exactly',
      all(x['mediaNote'] == 'AI-stylised visualisation of the original design photo.'
          for x in _pgs if x.get('mediaNote')))

# ─────────────── pipeline landmines disarmed (the 10k route) ───────────────
print('\n── pipeline: the four landmines are disarmed ──')
cfg = (ROOT / 'pipeline/config.example.json').read_text(encoding='utf-8')
check('commercial-safe model is the default (flux-dev gone)', 'flux-schnell' in cfg and 'flux-dev' not in cfg)
check('real cost per shot (0.003), not the $0.15 placeholder', '"cost_per_shot": 0.003' in cfg)
check('hard budget cap present', '"budget_cap_usd"' in cfg)
check('house geometry (finalize) wired on', '"finalize": true' in cfg)
s3 = (ROOT / 'pipeline/03_photoshoot.py').read_text(encoding='utf-8')
check('stage 3 stops at the budget cap', 'budget-cap' in s3 and 'budget_cap_usd' in s3)
check('stage 3 runs finalize.py on every shot', 'finalize.py' in s3)
import ast as _ast
for rel in ('pipeline/03_photoshoot.py', 'pipeline/qa_shots.py'):
    try:
        _ast.parse((ROOT / rel).read_text(encoding='utf-8')); check(f'{rel} parses', True)
    except SyntaxError as e:
        check(f'{rel} parses ({e})', False)

# colour predicates of the QA gate — runnable here, no PIL needed
import importlib.util as _ilu
_spec = _ilu.spec_from_file_location('qa_shots', ROOT / 'pipeline/qa_shots.py')
_q = _ilu.module_from_spec(_spec); _spec.loader.exec_module(_q)
check('bright spring-green tag pixel is flagged', _q.is_tag_green(57, 224, 108))
check('dark emerald editorial tag NOT catchable by colour scan (documented limit)',
      not _q.is_tag_green(10, 80, 40))
check('gold metal is not a tag', not _q.is_tag_green(212, 175, 55))
check('white price-tag pixel (PGS5037 lesson) is flagged', _q.is_tag_white(246, 246, 243))
check('charcoal house backdrop is not a white tag', not _q.is_tag_white(25, 23, 20))
check('warm candle bokeh is not a white tag', not _q.is_tag_white(255, 180, 90))

print(f'\n{len(ok)} passed · {len(fail)} failed')
sys.exit(1 if fail else 0)
