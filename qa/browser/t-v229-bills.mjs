/* t-v229-bills — the in-store purchase bills, both halves of the contract.
   ─────────────────────────────────────────────────────────────────────────
   The owner's words: "customers offline purchase krte hain toh unke bills mere
   paas hote hain, owner ki side se hi bills upload hone chahiye or customer ko
   sirf view and download your in store purchases, itna hi dikhna chahiye."

   So this suite asserts the two halves separately, and the negative as hard as
   the positive:

     OWNER SIDE — a real multipart upload, the type decided by the file's own
       bytes and not by its filename, the private note kept, auto-linking by the
       mobile written on the paper, edit / attach / drop-a-page / delete, and
       403 for anybody who is not the owner.
     CUSTOMER SIDE — a page whose entire vocabulary is View and Download. No
       upload, no edit, no delete, no dispute, and never the owner's note: the
       API does not send it, and the DOM is checked for it too, because a
       serialiser that leaks one field is how a private note ends up on a
       customer's screen.

   STATE: the suite uploads a bill and deletes it again at the end, so it leaves
   the shim clean — but if it fails half way, restart the shim before re-running:
       python3 qa/build-test-db.py --with-staff && python3 qa/preview_shim.py --port 8090

   Whitespace-tolerant; never asserts text that only lives in a comment. */
import fs from 'node:fs';
import { boot, click, wait, until, BASE, pageFaults } from './harness.mjs';

const WATCHDOG = setTimeout(() => {
  console.log('FAIL watchdog: the suite did not finish in 300 s');
  process.exit(1);
}, 300000);
if (WATCHDOG.unref) WATCHDOG.unref();

const ok = [], bad = [];
const T = (n, c, x = '') => (c ? ok : bad).push(n + (x ? ' → ' + x : ''));
const read = p => fs.readFileSync(p, 'utf8');
const stripJs = s => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:\w])\/\/[^\n]*/g, '$1');
const WS = s => String(s || '').replace(/\s+/g, ' ').trim();
const NOISE = /cashfree|Could not load script|getContext|Not implemented|jsdomError|Could not parse CSS|Client network socket disconnected|Not implemented: navigation/i;
const faults = () => pageFaults.filter(f => !NOISE.test(f));

const API = read('cms/api.php');
const APP = read('cms/js/app.js');
const APP_J = stripJs(APP);
const ADMIN = read('cms/js/admin.js');
const LAYER = read('cms/css/v229.css');
const SHIM = read('qa/preview_shim.py');

const jget = async (p, tok) => {
  const r = await fetch(BASE + p, tok ? { headers: { Authorization: 'Bearer ' + tok } } : {});
  let j = null; try { j = await r.json(); } catch (e) {}
  return { status: r.status, headers: r.headers, body: j };
};
const jpost = async (p, body, tok) => {
  const r = await fetch(BASE + p, {
    method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, tok ? { Authorization: 'Bearer ' + tok } : {}),
    body: JSON.stringify(body || {}),
  });
  let j = null; try { j = await r.json(); } catch (e) {}
  return { status: r.status, body: j };
};
const jdel = async (p, tok) => {
  const r = await fetch(BASE + p, { method: 'DELETE', headers: tok ? { Authorization: 'Bearer ' + tok } : {} });
  let j = null; try { j = await r.json(); } catch (e) {}
  return { status: r.status, body: j };
};

/* a real PNG, a second real PNG, and a text file wearing a .png filename */
const PNG = Buffer.from('89504e470d0a1a0a0000000d494844520000000100000001080600000' +
  '01f15c4890000000a49444154789c6300010000050001' + '0d0a2db40000000049454e44ae426082', 'hex');
const NOT_AN_IMAGE = Buffer.from('this is a text file wearing a .png filename\n', 'utf8');
const NOTE = 'paid by UPI, old chain exchanged — PRIVATE';

/* ── 1 · the vault: where the paper lives, and who can reach it ────────── */
T('api: bills live in a private folder BESIDE the document root',
  /function shv_bill_private_dir\(\)[\s\S]{0,700}?dirname\(\$docRoot\) \. DIRECTORY_SEPARATOR \. '\.shivaa-private-bills'/.test(API));
T('api: a host with its own private mount can override it',
  /getenv\('SHIVAA_PRIVATE_BILLS_DIR'\)/.test(API));
T('api: it refuses a symlink and anything inside the web root',
  /shv_bill_private_dir[\s\S]{0,900}?if \(is_link\(\$dir\)\) return null;[\s\S]{0,400}?str_starts_with\(\$real, \$docRoot/.test(API));
T('api: the folder is 0700 and group/other bits are refused',
  /@chmod\(\$real, 0700\);[\s\S]{0,200}?\(\$mode & 0077\) !== 0/.test(API));
T('api: a stored file is 0600, and is deleted if it is not',
  /@chmod\(\$dest, 0600\);[\s\S]{0,300}?@unlink\(\$dest\);/.test(API));
T('api: the type comes from the bytes on the way in',
  /function shv_bill_detect_ext[\s\S]{0,500}?x89PNG/.test(API) &&
  /shv_bill_store_upload[\s\S]{0,700}?\$kind = shv_bill_detect_ext\(\$head\);/.test(API));
T('api: and it is re-checked on the way out',
  /shv_bill_resolve_ref[\s\S]{0,900}?re-checked on the way out|shv_bill_resolve_ref[\s\S]{0,900}?\$ext = shv_bill_detect_ext\(\$head\);[\s\S]{0,120}?if \(\$ext === null \|\| \$ext !== \$pathExt\) return null;/.test(API));
T('api: a reference is a fixed shape, never a path a caller supplies',
  /preg_match\('#\\\\Aprivate-bills:\(bill_\[a-f0-9\]\{32\}/.test(API) ||
  /private-bills:\(bill_\[a-f0-9\]\{32\}/.test(API));
T('api: six files of 8 MB, and no more',
  /8388608/.test(API) && /int \$cap = 6/.test(API));
T('api: over the cap the upload is refused, not truncated',
  /if \(count\(\$rows\) >= \$cap\) return null;/.test(API));
T('api: one serialiser, and $admin decides what leaves the server',
  /function bill_public\(array \$b, bool \$admin = false\)[\s\S]{0,1400}?if \(\$admin\) \{[\s\S]{0,300}?\$out\['notes'\]/.test(API));
T('api: the customer payload carries no stored reference',
  !/function bill_public[\s\S]{0,900}?'ref' =>/.test(API));
T('api: ownership is by account id or by the mobile on the paper, compared safely',
  /function bills_for_user[\s\S]{0,800}?hash_equals\(\$mobile, \$bp\)/.test(API));
T('api: a bill is linked to an account by that mobile',
  /function bill_link_user[\s\S]{0,700}?hash_equals/.test(API));
T('api: files are addressed by index, so a path cannot be injected',
  /\$idx = \(int\)\$mBF\[2\];[\s\S]{0,300}?if \(\$idx < 0 \|\| \$idx >= count\(\$files\)\)/.test(API));
T('api: the stream is private, uncacheable and unsniffable',
  /Cache-Control: private, no-store[\s\S]{0,400}?X-Content-Type-Options: nosniff/.test(API));
T('api: inline for viewing, attachment for downloading',
  /\(\$wantDl \? 'attachment' : 'inline'\)/.test(API));
T('api: an unavailable vault is a 503 that says nothing was saved',
  /Private bill storage is unavailable — nothing was saved/.test(API));
T('api: the edit route accepts POST and DELETE, so neither is a 405',
  /preg_match\('#\^admin\/store-bills\/\(\[\\\\w-\]\+\)\$#'[\s\S]{0,120}?in_array\(\$method, \['POST', 'DELETE'\], true\)/.test(API) ||
  /admin\/store-bills\/\(\[\\w-\]\+\)\$#', \$route, \$mBA\) && in_array\(\$method, \['POST', 'DELETE'\], true\)/.test(API));
T('api: every write route is behind the one origin guard',
  API.indexOf('shv_guard_write_origin($route, $method);') > 0 &&
  API.indexOf('shv_guard_write_origin($route, $method);') < API.indexOf("if ($route === 'store-bills'"));
T('api: erasure anonymizes bills at BOTH routes, because a bill is a tax record',
  (API.match(/bills_anonymize\(\$db,/g) || []).length === 2,
  (API.match(/bills_anonymize\(\$db,/g) || []).length + ' call sites');
T('api: the paper survives erasure — only the person leaves it',
  /function bills_anonymize[\s\S]{0,900}?'Deleted customer'[\s\S]{0,400}?\$db\['storeBills'\]\[\$i\]\['phone'\] = '';/.test(API) &&
  !/function bills_anonymize[\s\S]{0,900}?unset\(\$db\['storeBills'\]/.test(API));
/* The docstring says "never by the filename", so a negative grep for that word
   fails on the sentence that states the rule. Comments come out first. */
{
  const fnStart = SHIM.indexOf('def dev_file_kind(data):');
  const fnEnd = SHIM.indexOf('\ndef ', fnStart + 10);
  /* Cut the span BETWEEN the delimiters: splitting on the quotes alone deletes
     the delimiters and keeps the words, so the sentence "never by the filename"
     survived and this check failed on the rule it was proving. */
  const DQ3 = String.fromCharCode(34, 34, 34);
  let fn = SHIM.slice(fnStart, fnEnd > 0 ? fnEnd : fnStart + 1200);
  const d1 = fn.indexOf(DQ3);
  if (d1 >= 0) {
    const d2 = fn.indexOf(DQ3, d1 + 3);
    if (d2 > d1) fn = fn.slice(0, d1) + ' ' + fn.slice(d2 + 3);
  }
  fn = fn.split('\n').filter(l => !l.trim().startsWith('#')).join('\n');
  T('shim: the dev mirror decides on bytes alone, with no filename fallback',
    fnStart > 0 && /return None/.test(fn) && !/filename/.test(fn) && /def dev_file_kind\(data\):/.test(SHIM),
    fn.slice(0, 90));
}
T('shim: and it has one serialiser with the same admin flag',
  /def dev_bill_public\(b, admin=False\):/.test(SHIM));

/* ── 2 · the customer page: two verbs, and no third ────────────────────── */
/* The bill markup is spread over the block: the viewer and the row renderer are
   defined ABOVE pages['my-bills'], so slicing from the page alone asserts about
   text that is not in the slice. BLOCK is the whole feature, PAGE is the page -
   and the slice itself is checked first, because an empty slice once made five
   assertions pass on nothing at all. */
const BLOCK = (() => {
  const start = APP.indexOf('const BILL_EXT = {');
  const end = APP.indexOf("pages['erase-account']");
  return start > 0 && end > start ? APP.slice(start, end) : '';
})();
const PAGE = (() => {
  const start = APP.indexOf("pages['my-bills']");
  const end = APP.indexOf("pages['erase-account']");
  return start > 0 && end > start ? APP.slice(start, end) : '';
})();
{
  T('app: the slice really contains the feature',
    BLOCK.length > 4000 && BLOCK.includes('openBillFile') && BLOCK.includes('billFileRowHTML') &&
    BLOCK.includes("pages['my-bills']") && PAGE.length > 1200 && !PAGE.includes('openBillFile ='),
    BLOCK.length + ' / ' + PAGE.length + ' chars');
  T('app: the page is registered as a route',
    /Object\.keys\(pages\)\.forEach\(k => routes\[k\] = pages\[k\]\)/.test(APP_J));
  T('app: the heading is exactly what the owner asked the customer to see',
    /<h1>Your in-store purchases<\/h1>/.test(PAGE) &&
    /View and download your in-store purchases/.test(PAGE));
  T('app: the only two verbs are View and Download',
    (BLOCK.match(/,'view'\)/g) || []).length === 1 && (BLOCK.match(/,'download'\)/g) || []).length === 1 &&
    /Shivaa\.openBillFile\(this,/.test(BLOCK) &&
    /class="btn btn-outline btn-sm" onclick="Shivaa\.openBillFile\(this,[^"]*,'view'\)">View<\/button>/.test(BLOCK) &&
    /class="btn btn-gold btn-sm" onclick="Shivaa\.openBillFile\(this,[^"]*,'download'\)">Download<\/button>/.test(BLOCK));
  /* Prose is not a control: the guest copy says "the bills the shop uploaded",
     and matching /Upload/i there proves nothing. What is asserted is that no
     button says it and no onclick reaches it. */
  T('app: the page has no upload, edit, delete or dispute control',
    !/type="file"/i.test(BLOCK) &&
    !/<button[^>]*>[^<]*(Delete|Remove|Dispute|Upload|Edit)/i.test(BLOCK) &&
    !/onclick="[^"]*(billDelete|billEdit|billSave|billDrop|upload|dispute)/i.test(BLOCK),
    (BLOCK.match(/<button[^>]*>[^<]*(Delete|Remove|Dispute|Upload|Edit)/gi) || []).join(','));
  T('app: the empty state is honest, not an error',
    /No in-store purchases linked yet/.test(PAGE));
  T('app: a guest is asked for the mobile and sent to the OTP sheet',
    /Sign in to see your in-store purchases/.test(PAGE) && /openLogin\('my-bills'\)/.test(PAGE));
  T('app: the guest input is a tel field with a 16px floor in the stylesheet',
    /id="billMobile" type="tel" inputmode="tel"/.test(PAGE) &&
    /\.bill-empty input\[type="tel"\] \{[\s\S]{0,200}?font-size:16px/.test(LAYER));
  T('app: a failed load offers Retry through an exposed global, not a closure',
    /onclick="Shivaa\.reloadView\(\)">Retry</.test(PAGE) &&
    /window\.Shivaa\.reloadView = \(\) => route\(\);/.test(APP_J));
  T('app: the error state reuses the empty state, so it is never a blank page',
    (PAGE.match(/class="bill-empty"/g) || []).length >= 3,
    (PAGE.match(/class="bill-empty"/g) || []).length + ' uses');
  T('app: the file buttons sit inside the file row, where the 44px rule reaches them',
    /<span class="bill-file">[\s\S]{0,900}?<span class="bill-file-act">/.test(BLOCK) &&
    /\.bill-file \.btn \{ min-height:44px; padding-inline:14px; font-size:16px; \}/.test(LAYER));
  T('app: the account page offers the same page as a tile',
    /\['my-bills', '🧾', 'In-store Purchases', 'view and download your in-store purchases'\]/.test(APP) &&
    /t\[0\] === 'my-bills' \? '#\/my-bills'/.test(APP));
}

/* ── 3 · the viewer: one blob alive at a time ──────────────────────────── */
T('app: the viewer asks with the account token, never with a public URL',
  /window\.Shivaa\.openBillFile[\s\S]{0,900}?Authorization: 'Bearer ' \+ token\(\)/.test(APP_J));
T('app: an unauthenticated tap goes to the OTP sheet instead of failing',
  /window\.Shivaa\.openBillFile = async \(btn, billId, index, mode\) => \{\s*if \(!token\(\)\) \{ openLogin\('my-bills'\); return; \}/.test(APP_J));
T('app: only four kinds of document can be opened',
  /jpg: \['JPG photo'[\s\S]{0,200}?pdf: \['PDF document'/.test(APP_J));
T('app: the previous object URL is revoked before a new one is made',
  /if \(_billObjectUrl\) \{ URL\.revokeObjectURL\(_billObjectUrl\); _billObjectUrl = ''; \}\s*_billObjectUrl = URL\.createObjectURL\(blob\);/.test(APP_J));
T('app: a PDF opens in a tab, an image in a modal with real alt text',
  /ctype\.indexOf\('pdf'\) >= 0[\s\S]{0,200}?window\.open\(url, '_blank', 'noopener'\)/.test(APP_J) &&
  /alt="Your Shivaa in-store purchase bill"/.test(APP));
T('app: a blocked pop-up is explained, not swallowed',
  /if \(!w\) toast\('Allow pop-ups to open the PDF/.test(APP_J));
T('app: download uses the server filename when it offers one',
  /function billFileName\(disposition, billId, index, ctype\) \{[\s\S]{0,300}?filename="\?\(\[\^";\]\+\)"\?/.test(APP_J));
T('app: the button is re-armed only if it is still in the document',
  /finally \{[\s\S]{0,400}?if \(btn && document\.body\.contains\(btn\)\)/.test(APP_J));
T('app: a refused file reports the server words',
  /try \{ const j = await res\.json\(\); if \(j && j\.error\) msg = String\(j\.error\); \}/.test(APP_J));
T('admin: the owner-side viewer reuses the same authenticated stream',
  /window\.ShivaaAdmin\.billOpen[\s\S]{0,400}?window\.Shivaa\.openBillFile\(null, id, i, mode \|\| 'view'\)/.test(stripJs(ADMIN)));

/* ── 4 · the owner's desk ──────────────────────────────────────────────── */
T('admin: the desk says whose note it is',
  /Private note[\s\S]{0,200}?owner-side only — the customer never sees this/.test(ADMIN));
T('admin: the form refuses a bill with no paper attached',
  /Attach the bill itself — a photo or a PDF/.test(ADMIN));
T('admin: the file input is limited to the four real types',
  /accept="\.jpg,\.jpeg,\.png,\.webp,\.pdf,image\/jpeg,image\/png,image\/webp,application\/pdf"/.test(ADMIN));
T('admin: a missing vault is explained with both fixes, and the button is off',
  /\.shivaa-private-bills/.test(ADMIN) && /SHIVAA_PRIVATE_BILLS_DIR/.test(ADMIN) &&
  /\$\{billsStorage \? '' : 'disabled'\}>⬆ Upload bill/.test(ADMIN));
T('admin: delete warns that the stored pages go with it',
  /Every stored page is deleted with it\. This cannot be undone\./.test(ADMIN));
T('admin: the queue badge counts free cards still to post',
  /blackQ\.toShip/.test(ADMIN) && /GET admin\/black-card\/queue|admin\/black-card\/queue/.test(ADMIN));
T('css: the owner tiles and the warning card exist',
  /\.bk-tiles \{/.test(LAYER) && /\.bk-warn \{/.test(LAYER));

/* ── 5 · live: the owner uploads, the customer views ───────────────────── */
const ownerLogin = await jpost('/api/auth/login', { email: 'owner@shivaa.in', password: 'shivaa123' });
const ADMIN_TOK = (ownerLogin.body || {}).token;
T('live: the owner signs in', !!ADMIN_TOK, ownerLogin.status);

const pre = await jget('/api/admin/store-bills', ADMIN_TOK);
T('live: the desk starts empty and reports its storage', pre.status === 200 && pre.body.count === 0 && pre.body.storage === true,
  JSON.stringify({ s: pre.status, c: pre.body && pre.body.count, st: pre.body && pre.body.storage }));

const upload = async (files, fields) => {
  const fd = new FormData();
  Object.entries(Object.assign({
    customerName: 'Aarti Sharma', phone: '9308956260', billNo: 'SJ/26/0417',
    billDate: '2026-10-02', store: 'Shivaa Jewels · Jaipur', amount: '52400',
    items: '22K gold bangle pair · 18.40 g', notes: NOTE,
  }, fields || {})).forEach(([k, v]) => fd.append(k, v));
  files.forEach(([name, buf], i) => fd.append('files[]', new Blob([buf], { type: 'application/octet-stream' }), name));
  const r = await fetch(BASE + '/api/admin/store-bills', {
    method: 'POST', headers: { Authorization: 'Bearer ' + ADMIN_TOK }, body: fd,
  });
  let j = null; try { j = await r.json(); } catch (e) {}
  return { status: r.status, body: j };
};

const up1 = await upload([['bill-page-1.png', PNG], ['bill-page-2.png', PNG]]);
T('live: the owner uploads a bill with two pages', up1.status === 200 && up1.body.ok === true, JSON.stringify(up1.body).slice(0, 140));
T('live: it auto-linked to her account by the mobile on the paper', up1.body.linked === true, up1.body.linked);
const BILL = (up1.body.bill || {});
const BID = BILL.id;
T('live: the owner-side record keeps his private note', BILL.notes === NOTE, BILL.notes);
T('live: two files, both recognised by their bytes',
  (BILL.files || []).length === 2 && (BILL.files || []).every(f => f.ext === 'png' && f.size === PNG.length),
  JSON.stringify(BILL.files));
T('live: the stored reference is not in the payload at all',
  !JSON.stringify(BILL.files).includes('private-bills:'), JSON.stringify(BILL.files).slice(0, 120));

const lie = await upload([['lie.png', NOT_AN_IMAGE]], { billNo: 'SJ/26/0418' });
T('live: a text file named .png is refused on its bytes', lie.status === 400, JSON.stringify(lie.body).slice(0, 120));
const future = await upload([['b.png', PNG]], { billNo: 'SJ/26/0419', billDate: '2031-01-01' });
T('live: a bill dated in the future is refused', future.status === 400, JSON.stringify(future.body).slice(0, 120));

/* The shim's OTP has a 30-second cooldown, as the real API does: signing in by
   OTP here would make the suite un-runnable twice inside a minute, and run 2
   would fail eleven checks in a cascade that looks like a broken page. The OTP
   path is covered by t-v229-black and qa/v229-routes.py; this suite uses the
   preview password so it can be re-run as often as it is edited. */
const login = await jpost('/api/auth/login', { email: 'aarti@example.com', password: 'shivaa123' });
const MEM = (login.body || {}).token;
T('live: the customer signs in', !!MEM, JSON.stringify(login.body).slice(0, 120));

const memList = await jget('/api/store-bills', MEM);
T('live: she sees exactly her one bill', memList.status === 200 && memList.body.count === 1, memList.body.count);
const row = (memList.body.bills || [])[0] || {};
T('live: it carries bill no, date, store, items and the amount',
  row.billNo === 'SJ/26/0417' && row.billDate === '2026-10-02' && row.store === 'Shivaa Jewels · Jaipur' &&
  /bangle pair/.test(row.items) && Number(row.amount) === 52400, JSON.stringify(row).slice(0, 150));
T('live: the owner note is NOT in her payload', !('notes' in row), Object.keys(row).join(','));
T('live: nor is her mobile, nor who created it', !('phone' in row) && !('createdBy' in row), Object.keys(row).join(','));
T('live: her file object is index, type, size, label and when',
  row.files && row.files[0] && row.files[0].i === 0 && row.files[0].ext === 'png' && row.files[0].size === PNG.length &&
  !('ref' in row.files[0]), JSON.stringify(row.files && row.files[0]));

const stream = await fetch(BASE + '/api/store-bills/' + BID + '/file/0', { headers: { Authorization: 'Bearer ' + MEM } });
const streamBytes = Buffer.from(await stream.arrayBuffer());
T('live: she can open the document', stream.status === 200, stream.status);
T('live: the bytes are identical to what the owner uploaded', streamBytes.equals(PNG), streamBytes.length + ' bytes');
T('live: served inline, as an image, never sniffed, never cached',
  stream.headers.get('content-type') === 'image/png' &&
  String(stream.headers.get('content-disposition') || '').startsWith('inline') &&
  stream.headers.get('x-content-type-options') === 'nosniff' &&
  /no-store/.test(String(stream.headers.get('cache-control') || '')),
  [stream.headers.get('content-type'), stream.headers.get('content-disposition')].join(' | '));
const dl = await fetch(BASE + '/api/store-bills/' + BID + '/file/1?download=1', { headers: { Authorization: 'Bearer ' + MEM } });
const dlBytes = Buffer.from(await dl.arrayBuffer());
T('live: ?download=1 switches to attachment, same bytes',
  dl.status === 200 && String(dl.headers.get('content-disposition') || '').startsWith('attachment') && dlBytes.equals(PNG),
  dl.headers.get('content-disposition'));
const anon = await fetch(BASE + '/api/store-bills/' + BID + '/file/0');
T('live: no token, no document', anon.status === 401, anon.status);
const oob = await fetch(BASE + '/api/store-bills/' + BID + '/file/9', { headers: { Authorization: 'Bearer ' + MEM } });
T('live: a page that does not exist is a 404, not a document', oob.status === 404, oob.status);

const login2 = await jpost('/api/auth/login', { email: 'rohit@example.com', password: 'shivaa123' });
const OTHER = (login2.body || {}).token;
T('live: a second customer can sign in', !!OTHER, JSON.stringify(login2.body).slice(0, 120));
const theirs = await jget('/api/store-bills', OTHER);
T('live: their own list is empty', theirs.status === 200 && theirs.body.count === 0, theirs.body.count);
const steal = await fetch(BASE + '/api/store-bills/' + BID + '/file/0', { headers: { Authorization: 'Bearer ' + OTHER } });
T('live: 403 on somebody else\'s bill', steal.status === 403, steal.status);
const memUpload = await fetch(BASE + '/api/admin/store-bills', {
  method: 'POST', headers: { Authorization: 'Bearer ' + MEM }, body: new FormData(),
});
T('live: a member cannot upload', memUpload.status === 403, memUpload.status);

/* ── 6 · live: the page itself ─────────────────────────────────────────── */
const seedMem = w => { try { w.localStorage.setItem('shv_token', JSON.stringify(MEM)); } catch (e) {} };
const m = await boot('#/my-bills', { seed: seedMem });
const $ = s => m.doc.querySelector(s);
const $$ = s => [...m.doc.querySelectorAll(s)];
await until(() => $('.bill-card') || $('.bill-empty'), 15000);
await wait(300);

T('live: the heading is the one the owner wrote', WS(($('h1') || {}).textContent) === 'Your in-store purchases',
  WS(($('h1') || {}).textContent));
T('live: the subtitle promises only view and download',
  /View and download your in-store purchases/.test(WS($('.bill-hero p') && $('.bill-hero p').textContent)));
T('live: the bill card shows number, date, store, items and amount',
  /Bill SJ\/26\/0417/.test(WS(($('.bill-head') || {}).textContent)) &&
  /\d{1,2} \w{3} \d{4}/.test(WS(($('.bill-date') || {}).textContent)) &&
  /Shivaa Jewels/.test(WS(($('.bill-store') || {}).textContent)) &&
  /bangle pair/.test(WS(($('.bill-items') || {}).textContent)) &&
  /52,400/.test(WS(($('.bill-amount') || {}).textContent)),
  WS(($('.bill-card') || {}).textContent).slice(0, 150));
const fileRows = $$('.bill-file');
T('live: two file rows, one per page', fileRows.length === 2, fileRows.length);
T('live: each row has exactly two buttons — View and Download',
  fileRows.every(r => [...r.querySelectorAll('.btn')].length === 2 &&
    WS(r.querySelectorAll('.btn')[0].textContent) === 'View' &&
    WS(r.querySelectorAll('.btn')[1].textContent) === 'Download'),
  fileRows.map(r => [...r.querySelectorAll('.btn')].map(b => WS(b.textContent)).join('/')).join(' | '));
const pageText = WS(($('#view') || {}).textContent);
T('live: the owner private note appears nowhere on the page', !pageText.includes('PRIVATE') && !/paid by UPI/i.test(pageText),
  pageText.slice(0, 90));
const viewHtml = ($('#view') || {}).innerHTML || '';
T('live: the page offers no upload, edit, delete or dispute control',
  !/type="file"/i.test(viewHtml) && !/\b(Delete|Remove|Dispute|Upload)\b/i.test(viewHtml),
  (viewHtml.match(/\b(Delete|Remove|Dispute|Upload)\b/gi) || []).join(','));
T('live: no page fault and no console error', faults().length === 0 &&
  m.errors.filter(e => !NOISE.test(e)).length === 0,
  faults().concat(m.errors.filter(e => !NOISE.test(e))).slice(0, 2).join(' | '));

/* View opens the image in a modal, through an object URL this suite can count */
const viewBtn = $('.bill-file .btn');
T('live: the viewer starts with no blobs alive', m.window.__blobStore.size === 0, m.window.__blobStore.size);
click(m.window, viewBtn);
await until(() => $('.bill-view-img') || m.window.__blobStore.size > 0, 12000);
await wait(260);
const img = $('.bill-view-img');
T('live: View opened a modal image', !!img, $('.modal') ? 'modal but no image' : 'no modal');
T('live: it is an object URL, not a public link', !!img && /^blob:/.test(img.getAttribute('src') || ''), img && img.getAttribute('src'));
T('live: it has alt text a screen reader can use',
  !!img && img.getAttribute('alt') === 'Your Shivaa in-store purchase bill', img && img.getAttribute('alt'));
T('live: exactly one blob is alive', m.window.__blobStore.size === 1, m.window.__blobStore.size);

/* opening the second page must revoke the first */
if (typeof m.window.Shivaa.closeModal === 'function') m.window.Shivaa.closeModal();
const second = $$('.bill-file .btn')[2];
click(m.window, second);
await until(() => m.window.__blobStore.size === 1 && ($$('.bill-view-img').length >= 1), 12000);
await wait(300);
T('live: opening the second page revoked the first — still one blob alive',
  m.window.__blobStore.size === 1, m.window.__blobStore.size);
const dlBtn = $$('.bill-file .btn')[1];
T('live: the buttons are re-armed after viewing', dlBtn && dlBtn.disabled === false && WS(dlBtn.textContent) === 'Download',
  dlBtn && WS(dlBtn.textContent));

/* ── 7 · live: a guest, and a stranger ─────────────────────────────────── */
const g = await boot('#/my-bills');
await until(() => g.doc.querySelector('.bill-empty'), 15000);
await wait(240);
const gText = WS((g.doc.querySelector('.bill-empty') || {}).textContent);
T('live: a guest is told to sign in, not shown an empty list',
  /Sign in to see your in-store purchases/.test(gText), gText.slice(0, 90));
T('live: the guest form asks for the mobile', !!g.doc.querySelector('#billMobile[type="tel"]'));
T('live: and offers the OTP sheet, returning here afterwards',
  /Sign in with OTP/.test(gText) && /openLogin\('my-bills'\)/.test((g.doc.querySelector('.bill-empty') || {}).innerHTML || ''));

const seedOther = w => { try { w.localStorage.setItem('shv_token', JSON.stringify(OTHER)); } catch (e) {} };
const o = await boot('#/my-bills', { seed: seedOther });
await until(() => o.doc.querySelector('.bill-empty'), 15000);
await wait(240);
T('live: another customer sees the empty state, not somebody else bill',
  /No in-store purchases linked yet/.test(WS((o.doc.querySelector('.bill-empty') || {}).textContent)),
  WS((o.doc.querySelector('.bill-empty') || {}).textContent).slice(0, 80));
T('live: and no bill card leaked into their page', !o.doc.querySelector('.bill-card'));

/* ── 8 · the desk cleans up after itself ───────────────────────────────── */
const del = await jdel('/api/admin/store-bills/' + BID, ADMIN_TOK);
T('live: the owner can delete the bill, and both pages go with it',
  del.status === 200 && del.body.filesUnlinked === 2, JSON.stringify(del.body));
const after = await jget('/api/store-bills', MEM);
T('live: her list is empty again', after.body.count === 0, after.body.count);
const gone = await fetch(BASE + '/api/store-bills/' + BID + '/file/0', { headers: { Authorization: 'Bearer ' + MEM } });
T('live: the document is really gone', gone.status === 404, gone.status);
const desk = await jget('/api/admin/store-bills', ADMIN_TOK);
T('live: the desk is clean for whoever runs this next', desk.body.count === 0, desk.body.count);

clearTimeout(WATCHDOG);
console.log('\n%d PASS · %d FAIL', ok.length, bad.length);
bad.forEach(b => console.log('  FAIL ' + b));
process.exit(bad.length ? 1 : 0);
