/* v164 gate — the 6 Gold Biscuit Scheme studs become REAL store pieces:
   db.json rows (83 total) + full-schema campaign twins + list dedupe by
   id-or-sku + hallmark/similar fallback + PDP sizes guard + member
   wishlist/review parity + catalogue-deploy PGS+SHV + stamps 164.
   Usage: node tools/mega/smoke/v164-check.js [CMSROOT]  (SMOKE_CMS supported) */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ROOT = path.join(__dirname, '..', '..', '..');
const CMS = process.env.SMOKE_CMS || process.argv[2] || path.join(ROOT, 'cms');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('FAIL:', m); } };

const app = fs.readFileSync(path.join(CMS, 'js/app.js'), 'utf8');
const idx = fs.readFileSync(path.join(CMS, 'index.html'), 'utf8');
const sw = fs.readFileSync(path.join(CMS, 'sw.js'), 'utf8');
const api = fs.readFileSync(path.join(CMS, 'api.php'), 'utf8');
const dbRaw = fs.readFileSync(path.join(CMS, 'data/db.json'));   // bytes: style pins need the raw file
const db = JSON.parse(dbRaw.toString('utf8'));

// §1 stamps 164 lockstep
ok(idx.includes('window.__SHIVAA_REL=164;'), 'index triple 164');
ok(app.includes('const APP_REL = 164;'), 'APP_REL 164');
ok(sw.includes("SHELL = 'shivaa-shell-v164'"), 'sw shell 164');
ok(api.includes("'rel'   => 164,"), 'api rel 164');
ok(idx.includes('/js/app.js?v=164'), 'index app loader 164');
ok(sw.includes('/js/app.js?v=164'), 'sw app precache 164');
const finIdx = (idx.match(/\/css\/finale\.css\?v=(\d+)/) || [])[1];
const finSw = (sw.match(/\/css\/finale\.css\?v=(\d+)/) || [])[1];
ok(finIdx && finIdx === finSw, 'finale.css stamp agrees index+sw (v' + finIdx + ', file untouched this rel)');

// §2 the 6 real store records in master db.json
ok(db.products.length === 83, 'db.json holds 83 products (77 PGS + 6 SHV), got ' + db.products.length);
const rings = db.products.filter(p => String(p.sku || '').startsWith('PGS'));
ok(rings.length === 77, 'all 77 PGS rings untouched in place');
const studs = db.products.filter(p => String(p.sku || '').startsWith('SHV'));
ok(studs.length === 6, '6 SHV stud rows present');
const spec = { p_stud_m1: ['SHV-MST-01', 3.0, 'mst01', 'mens'], p_stud_m2: ['SHV-MST-02', 3.0, 'mst02', 'mens'],
  p_stud_m3: ['SHV-MST-03', 3.0, 'mst03', 'mens'], p_stud_w1: ['SHV-LST-01', 3.255, 'lst01', 'ladies'],
  p_stud_w2: ['SHV-LST-02', 2.928, 'lst02', 'ladies'], p_stud_w3: ['SHV-LST-03', 3.086, 'lst03', 'ladies'] };
for (const [id, [sku, wt, shot, gender]] of Object.entries(spec)) {
  const p = db.products.find(x => x.id === id);
  ok(!!p, id + ' row present');
  if (!p) continue;
  ok(p.sku === sku && p.category === 'earrings' && p.metal === 'Gold' && p.purity === '22K', id + ' identity (sku/category/metal/purity)');
  ok(p.weightG === wt && p.mcScheme === 'percent' && p.mcValue === 15 && p.wastagePct === 8, id + ' commercial spec (wt/MC/wastage)');
  ok(Array.isArray(p.sizes) && p.sizes.length === 0, id + ' sizes [] (earrings take no size)');
  ok(p.rating === 4.8 && p.reviews === 0 && p.stock === 50 && p.active === true, id + ' rating/reviews/stock/active');
  ok(Array.isArray(p.tags) && p.tags.includes('campaign') && p.tags.includes('scheme') && p.tags.includes(gender), id + ' tags');
  ok(Array.isArray(p.images) && p.images.length === 4 && p.images.every(im => im.includes('/images/products/studs/' + shot)), id + ' 4 photoshoot images');
  ok(typeof p.desc === 'string' && p.desc.includes('Gold Biscuit Scheme') && typeof p.subtitle === 'string', id + ' desc+subtitle');
  ok(!('isCampaignStud' in p), id + ' carries NO isCampaignStud flag (real row; the flag means fallback twin)');
}
// byte style: the master file is json.dumps(indent=2, ensure_ascii=True), no trailing newline
try {
  execSync('python3 -c "import json,sys; raw=open(sys.argv[1],\'rb\').read(); assert json.dumps(json.loads(raw.decode()),indent=2,ensure_ascii=True).encode()==raw, \'byte drift\'" ' + JSON.stringify(path.join(CMS, 'data/db.json')), { stdio: 'pipe' });
  ok(true, 'db.json byte-faithful (indent=2, ensure_ascii, no trailing newline)');
} catch (e) { ok(false, 'db.json byte-faithful (python round-trip): ' + String((e.stderr || e.message || '')).slice(0, 160)); }
for (const s of studs) for (const im of s.images) ok(fs.existsSync(path.join(CMS, im.replace(/^\//, ''))), 'stud shot on disk: ' + im);

// §3 api.php — full-schema twins, dedupe, fallback, member parity
const catStart = api.indexOf('function campaign_studs_catalog()');
const catFn = api.slice(catStart, api.indexOf('function finale_qualifies', catStart));
ok(catFn.includes("'sizes' => []") && catFn.includes("'rating' => 4.8") && catFn.includes("'reviews' => 0"), 'twin rows carry sizes/rating/reviews');
ok(catFn.includes("'stock' => 50") && catFn.includes('gold-biscuit'), 'twin rows carry stock/tags');
ok((catFn.match(/\/images\/products\/studs\//g) || []).length === 24, 'twin rows carry all 24 photoshoot images (4 each)');
ok(api.includes('$haveIds[$lx') || api.includes('$haveSkus[$cp'), 'products list dedupes twins by id-or-SKU');
ok(api.includes('hallmark_product($camps[$m[1]])'), 'single-GET fallback runs the hallmark pass');
ok(api.includes('foreach ($camps as $sid => $sp)'), 'single-GET fallback serves priced sibling studs as similar');
ok(api.includes('array_key_exists($wid, campaign_studs_catalog())'), 'wishlist POST accepts stud ids');
ok(api.includes('$seenW[$it[') || api.includes('$seenW'), 'wishlist GET resolves stud twins into items');
ok((api.match(/array_key_exists\(\$pid, campaign_studs_catalog\(\)\)/g) || []).length === 2, 'both review POST doors accept stud ids');
// §3b api.php still parses (with a negative control, per php-parse-check.js)
try {
  const Engine = require('php-parser');
  const eng = new Engine({ parser: { extractDoc: false }, ast: { withPositions: false } });
  eng.parseCode(api, 'api.php');
  let caught = false;
  try { eng.parseCode(api.replace('function campaign_studs_catalog(', 'function campaign_studs_catalog( {{{ '), 'x.php'); } catch (e) { caught = true; }
  ok(caught, 'api.php parses AND the parser catches a deliberately broken copy (control behaved)');
} catch (e) { ok(false, 'api.php php-parser parse: ' + e.message.slice(0, 160)); }

// §4 app.js — the PDP crash is closed at the root
ok(!/p\.sizes\.(length|map)\b/.test(app.replace(/\(p\.sizes\|\|\[\]\)\./g, '')), 'no bare p.sizes.length/map left anywhere');
ok((app.match(/\(p\.sizes\|\|\[\]\)\.(length|map)/g) || []).length === 4, 'PDP + quickView size rows/pills all guarded (p.sizes||[]) ×4');
ok(app.includes("Object.assign({sizes: [], rating: 4.8, reviews: 0, stoneDesc: '', stoneType: 'White', stoneColour: '', isCampaignStud: true}, s)"), 'ensureCampaignStuds merges full store schema under every server row');
ok(app.includes("earrings: { name: 'Earrings'"), 'Earrings stays a first-class shop category');
ok(app.includes('address: { ...EX_BOUNDARY }') && app.includes('_expressItem = { id: productId, qty: 1, isCampaignStud: true }'), 'campaign express-buy path untouched (canonical boundary + flag)');
try {
  execSync('node --check ' + JSON.stringify(path.join(CMS, 'js/app.js')), { stdio: 'pipe' });
  ok(true, 'app.js node --check clean');
} catch (e) { ok(false, 'app.js node --check: ' + String((e.stderr || e.message || '')).slice(0, 160)); }

// §5 catalogue deploy carries PGS + SHV (repo-root files; skipped on zip overlays)
const depPy = path.join(ROOT, 'deploy/catalogue_deploy.py');
const wfYml = path.join(ROOT, '.github/workflows/catalogue-deploy.yml');
if (fs.existsSync(depPy) && fs.existsSync(wfYml)) {
  const dep = fs.readFileSync(depPy, 'utf8');
  const wf = fs.readFileSync(wfYml, 'utf8');
  ok(dep.includes("MASTER_PREFIXES = ('PGS', 'SHV')") && dep.includes('def is_master_sku'), 'deploy: master set is PGS + SHV');
  ok(dep.includes('SHV-MST-0') && dep.includes('p_stud_m') && dep.includes('p_stud_w'), 'deploy: fixed stud SKU/id set asserted');
  ok(dep.includes("existing.get('isCampaignStud')") && dep.includes('st == 404') && dep.includes('existing = None'), 'deploy: twins + PUT-404 fall through to POST, exactly once');
  ok(dep.includes('studs_real == 6'), 'deploy: verify requires all 6 studs as REAL rows (no twins)');
  ok(wf.includes("startswith(('PGS', 'SHV'))"), 'workflow: preflight + verify accept the SHV set');
  ok(wf.includes("p['sku'].startswith('PGS') and int(p['sku'][3:])"), 'workflow: zoom gate skips SHV (no int() crash)');
  ok(wf.includes('studs_real') && wf.includes('strays'), 'workflow: independent verify counts strays + real stud rows');
  ok(wf.includes('pull_request') && wf.includes('login failed') && wf.includes('stale SHIVAA_ADMIN_PASSWORD'), 'workflow: PR dry-run downgrades a dead-credential 401 to a warning (live runs still fail hard)');
  try { execSync('python3 -m py_compile ' + JSON.stringify(depPy), { stdio: 'pipe' }); ok(true, 'deploy: py_compile clean'); }
  catch (e) { ok(false, 'deploy: py_compile: ' + String((e.stderr || e.message || '')).slice(0, 120)); }
} else {
  console.log('SKIP §5 (deploy/workflow files not in this overlay)');
}

console.log(`\nv164: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
