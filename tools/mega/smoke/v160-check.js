/* v160 gate — 6 new tops (gents 3.00g / ladies tag-wt, 22K, 15% MC) + 4-photo
   gallery + mobile mastery + pay-fail auto-return to the showcase + stamps 160.
   Usage: node tools/mega/smoke/v160-check.js [CMSROOT]  (SMOKE_CMS supported) */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const CMS = process.env.SMOKE_CMS || process.argv[2] || path.join(__dirname, '..', '..', '..', 'cms');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('FAIL:', m); } };

const app = fs.readFileSync(path.join(CMS, 'js/app.js'), 'utf8');
const css = fs.readFileSync(path.join(CMS, 'css/finale.css'), 'utf8');
const idx = fs.readFileSync(path.join(CMS, 'index.html'), 'utf8');
const sw = fs.readFileSync(path.join(CMS, 'sw.js'), 'utf8');
const api = fs.readFileSync(path.join(CMS, 'api.php'), 'utf8');

// §1 stamps 160 lockstep
ok(idx.includes('window.__SHIVAA_REL=160;'), 'index triple 160');
ok(app.includes('const APP_REL = 160;'), 'APP_REL 160');
ok(sw.includes("SHELL = 'shivaa-shell-v160'"), 'sw shell 160');
ok(api.includes("'rel'   => 160,"), 'api rel 160');
ok(idx.includes('/js/app.js?v=160'), 'index app loader 160');
ok(sw.includes('/js/app.js?v=160'), 'sw app precache 160');
ok(idx.includes('/css/finale.css?v=160') && sw.includes('/css/finale.css?v=160'), 'finale.css stamp moved with edit (index+sw)');

// §2 product specs — 6 tops, exact weights, 22K, 15% MC
for (const [id, wt] of [['p_stud_m1', '3.0'], ['p_stud_m2', '3.0'], ['p_stud_m3', '3.0'],
                        ['p_stud_w1', '3.255'], ['p_stud_w2', '2.928'], ['p_stud_w3', '3.086']]) {
  const i = app.indexOf(`id: '${id}'`);
  ok(i > -1, id + ' present');
  const blk = app.slice(i, app.indexOf('\n    }', i));
  ok(blk.includes(`weightG: ${wt}`), `${id} weight ${wt}`);
  ok(blk.includes("purity: '22K'"), `${id} 22K`);
  ok(blk.includes('mcPct: 15') && blk.includes('mcValue: 15'), `${id} MC 15%`);
  ok((blk.match(/\/images\/products\/studs\//g) || []).length === 4, `${id} 4 photos`);
}
ok(!app.includes('mcPct: 12'), 'no 12% MC left in campaign data');
ok(!app.includes('12% MC + 3% GST'), 'no 12% label left');
for (const old of ['Mayura', 'Chandrika', 'octagonal', 'sunburst', 'stud-mens-', 'stud-ladies-']) {
  ok(!app.includes(old), 'old design ref gone: ' + old);
}

// §3 gallery machinery
ok(app.includes('window.Shivaa.setStudPhoto'), 'setStudPhoto exists');
ok(app.includes('shv-stud-thumbs') && app.includes('shv-stud-main-img'), 'gallery markup in renderer');
ok(css.includes('.shv-stud-thumb') && css.includes('.shv-stud-thumb.active'), 'gallery CSS present');

// §4 fail-redirect: all three fail surfaces return to the showcase
ok(app.includes('campaignGenderOfItems'), 'gender resolver exists');
ok(app.includes("Payment was not completed — pick your design again"), 'placeOrder fail → showcase');
ok(app.includes('campFail') && app.includes('Back to 3 designs'), 'order fail banner for campaign');
ok(app.includes("Payment failed — showing your 3 designs again"), 'order auto-return toast');
ok(app.includes("#/scheme?step=products&gender=' + encodeURIComponent(campFailGender)"), 'auto-return target = showcase');

// §5 mobile mastery CSS
for (const pin of ['v160 · MOBILE MASTERY', 'top: calc(58px + env(safe-area-inset-top',
  'max-width: calc(100% - 20px)', '#shvStudsTitle', '@media (max-width: 380px)']) {
  ok(css.includes(pin), 'css pin: ' + pin.slice(0, 42));
}
ok((css.match(/{/g) || []).length === (css.match(/}/g) || []).length, 'css braces balanced');

// §6 the 24 photos: present, square, >=800px, sane bytes
const shots = [];
for (const p of ['mst01', 'mst02', 'mst03', 'lst01', 'lst02', 'lst03'])
  for (const v of ['studio', 'macro', 'worn', 'gift']) shots.push(`${p}-${v}.jpg`);
ok(shots.length === 24, '24 shots listed');
let imgFail = 0;
for (const f of shots) {
  const fp = path.join(CMS, 'images/products/studs', f);
  if (!fs.existsSync(fp)) { imgFail++; console.log('FAIL: missing', f); continue; }
  try {
    const out = execSync(`identify -format "%w %h %b" "${fp}"`, { encoding: 'utf8' }).trim().split(' ');
    const w = +out[0], h = +out[1];
    if (w !== h || w < 800) { imgFail++; console.log(`FAIL: ${f} geometry ${w}x${h}`); }
    if (+fs.statSync(fp).size < 20000) { imgFail++; console.log('FAIL: tiny file', f); }
  } catch (e) { imgFail++; console.log('FAIL: identify', f); }
}
if (imgFail === 0) pass++; else fail += imgFail;
for (const b of ['gender-gents-gold.jpg', 'gender-ladies-gold.jpg']) {
  ok(fs.existsSync(path.join(CMS, 'images/banners', b)), 'banner rebuilt: ' + b);
}

console.log(`\nv160: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
