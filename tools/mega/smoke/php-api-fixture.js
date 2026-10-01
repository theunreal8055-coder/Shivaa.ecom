/* Isolated PHP 8.3 API fixture: never mounts, reads, or writes the repository DB.
   Every identity, product, setting, and rate below is synthetic QA-only data.
   External gateways are not configured; no provider request is made. */
const fs = require('fs'), path = require('path');
const { PHP } = require('@php-wasm/universal');
const { loadNodeRuntime } = require('@php-wasm/node');
const Engine = require('php-parser');
const CMS = process.env.SMOKE_CMS || path.resolve(__dirname, '../../../cms');
const source = fs.readFileSync(path.join(CMS, 'api.php'), 'utf8');
const functions = new Map();
(function walk(node) {
  if (!node || typeof node !== 'object') return;
  if (node.kind === 'function' && node.name?.name) functions.set(node.name.name, source.slice(node.loc.start.offset, node.loc.end.offset));
  for (const [k,v] of Object.entries(node)) if (k !== 'loc') { if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === 'object') walk(v); }
})(new Engine({ ast:{ withPositions:true } }).parseCode(source));
const b64 = v => Buffer.from(typeof v === 'string' ? v : JSON.stringify(v)).toString('base64');
const ADMIN = 'qa169admin', MEMBER = 'qa169member';
const qaProduct = (id, sku, name, stock = 3) => ({
  id, sku, name, category: 'rings', metal: 'Gold', purity: '22K',
  desc: 'Synthetic QA-only catalogue record.', weightG: 1, lessWeightG: 0,
  wastagePct: 0, mcScheme: 'fixed', mcValue: 0, stoneValue: 0,
  stoneDesc: '', images: ['/images/logo.png'], video: '', tags: ['qa'],
  stock, active: true, status: 'live', rating: 5, reviews: 0,
});
function seed() {
  const expires = Math.floor(Date.now() / 1000) + 86400;
  return {
    // Root keys are intentionally local, minimal synthetic test state. No
    // values are copied from cms/data/db.json or from a production export.
    angelSession: {}, angelTokens: {}, auditLog: [], billingMovements: [],
    bullion: [], bullionAlerts: [], bullionOrders: [], carts: [], cashbook: [],
    catalogBatches: [], catalogs: [], contactMsgs: [], coupons: [], customOrders: [],
    events: [], finaleAttempts: [], finaleEntries: [], goldPurchases: [], gstCache: {},
    jobWork: [], karigars: [], khata: [], lastHousekeep: '', loginfails: {}, mail: {},
    mailRate: {}, makingCharges: [], metalOrders: [], newsletter: [], orders: [],
    otps: [], pages: [], partners: [], pubRate: {}, rateAlerts: [], rateLimit: {},
    refundRequests: [], resetRate: {}, reviews: [], savingsPlans: [], securityLog: [],
    serviceRequests: [], settlements: [], sms: {}, tokens: {
      [ADMIN]: { userId: 'qaAdmin', exp: expires },
      [MEMBER]: { userId: 'qaMember', exp: expires },
    },
    users: [
      { id: 'qaAdmin', role: 'admin', name: 'QA Admin', phone: '9876500001',
        email: 'admin@qa.invalid', addresses: [], wishlist: [], loyaltyPoints: 0 },
      { id: 'qaMember', role: 'customer', name: 'QA Member', phone: '9876500002',
        email: 'member@qa.invalid', addresses: [], wishlist: [], loyaltyPoints: 0,
        profile: { city: 'QA City' }, referralCode: 'SHQA001' },
    ],
    products: [qaProduct('qa-ring-001', 'QA-RING-001', 'Synthetic QA Gold Ring', 3),
      qaProduct('qa-ring-002', 'QA-RING-002', 'Synthetic QA Gold Band', 2)],
    settings: {
      guestCheckout: true, payProvider: 'demo', allowDemoPayments: false,
      prepaidPct: 0, shippingFee: 250, freeShipAbove: 50000,
      rateLockMinutes: 20, gold22Premium: 398, gold24Premium: 398,
      jaipurPremium: 55, jaipurSilverPremium: 3, loyaltyPointsPerRupee: 0,
      referralProgram: { enabled: true, reward: 0 },
    },
    rates: {
      last: { t: '2026-10-01T12:00:00+05:30', source: 'QA synthetic fixture',
        gold24: 15000, gold22: 14000, gold18: 11000, silver: 200 },
      history: [],
      override: { gold24: 15000, gold22: 14000, gold18: 11000, silver: 200 },
    },
  };
}
async function fixture() {
  const php = new PHP(await loadNodeRuntime('8.3', { emscriptenOptions:{ processId:169 } }));
  php.mkdirTree('/qa/data'); php.mkdirTree('/qa/js');
  for (const name of ['api.php','hallmark.php','trust.php','sms.php','mail.php','index.html','sw.js','js/app.js']) php.writeFile('/qa/'+name, fs.readFileSync(path.join(CMS,name), 'utf8'));
  const setDb = db => php.writeFile('/qa/data/db.json', JSON.stringify(db));
  const run = async code => {
    const out = await php.run({ code: `<?php ini_set('display_errors','0'); date_default_timezone_set('Asia/Kolkata');
register_shutdown_function(function(){ echo "\\n@@HTTP " . (http_response_code() ?: 200); });
${code}` });
    const text = Buffer.from(out.bytes).toString();
    const m = text.match(/\n@@HTTP (\d+)/);
    const body = text.split('\n@@HTTP')[0]; let json; try { json=JSON.parse(body); } catch (_) {}
    return { status:m ? +m[1] : 0, json, body, errors:out.errors || '' };
  };
  const req = (method, route, body={}, token='', query={}, ip='203.0.113.10') => run(`
$GLOBALS['QA_BODY'] = base64_decode('${b64(body)}');
class QaInput { public $context; private $p=0;
  function stream_open($u,$m,$o,&$x){ return true; }
  function stream_read($n){$r=substr($GLOBALS['QA_BODY'],$this->p,$n); $this->p+=strlen($r); return $r;}
  function stream_eof(){return $this->p>=strlen($GLOBALS['QA_BODY']);}
  function stream_stat(){return ['size'=>strlen($GLOBALS['QA_BODY'])];}
}
stream_wrapper_unregister('php'); stream_wrapper_register('php','QaInput');
$_SERVER=['REQUEST_METHOD'=>'${method}','REMOTE_ADDR'=>'${ip}','HTTP_HOST'=>'qa.invalid','HTTP_AUTHORIZATION'=>'${token ? 'Bearer '+token : ''}','CONTENT_TYPE'=>'application/json','CONTENT_LENGTH'=>(string)strlen($GLOBALS['QA_BODY'])];
$_GET=array_merge(['__route'=>'${route}'],json_decode(base64_decode('${b64(query)}'),true)); $_POST=[];
include '/qa/api.php';`);
  return { php, run, req, setDb, async db(){ const r=await run("echo file_get_contents('/qa/data/db.json');"); return r.json; } };
}
module.exports={ fixture,seed,ADMIN,MEMBER,source, fn:n=>{ if(!functions.has(n)) throw Error('Missing function '+n); return functions.get(n); },b64 };
