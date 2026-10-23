/* t-v220 — the billing software is removed from the website (static checks on shipped files). */
import fs from 'node:fs';

const ok = [], bad = [];
const T = (n, c, x = '') => (c ? ok : bad).push(n + (x ? ' → ' + x : ''));
const api = fs.readFileSync('cms/api.php', 'utf8');
const admin = fs.readFileSync('cms/js/admin.js', 'utf8');
const index = fs.readFileSync('cms/index.html', 'utf8');
const sw = fs.readFileSync('cms/sw.js', 'utf8');
const app = fs.readFileSync('cms/js/app.js', 'utf8');

T('api: stock bridge routes gone', !api.includes("route === 'billing/stock'") && !api.includes("route === 'billing/stock-movement'"));
T('api: signing helpers gone', !api.includes('function shv_billing_sync_auth') && !api.includes('function shv_billing_sync_raw'));
T('api: sync key no longer accepted by settings', !api.includes("array_key_exists('billingSyncSecret'"));
T('api: movement store no longer initialised', !api.includes('billingMovements'));
T('api: billing-sync rate limit gone', !api.includes("'billing-sync'"));
T('admin: Billing Software card gone', !admin.includes('Billing Software') && !admin.includes('/billing/'));
T('admin: sync key form and handler gone', !admin.includes('saveBillingSync') && !admin.includes('billingSyncSecret'));
T('admin: Store settings section still renders', admin.includes('<h3>Store settings</h3>'));
T('docs: billing sync contract removed', !fs.existsSync('docs/BILLING-SYNC-CONTRACT.md'));
T('stamps: index at 227', index.includes('__SHIVAA_REL=235') && !index.includes('?v=226'));
T('stamps: sw.js shell v226', sw.includes('shivaa-shell-v235') && sw.includes('const REL = 235;'));
T('stamps: app.js APP_REL 227', app.includes('const APP_REL = 235;'));
T('stamps: api rel 226', api.includes("'rel' => 235,"));

console.log('PASS ' + ok.length + ' / FAIL ' + bad.length);
ok.forEach(o => console.log('  ✓ ' + o));
bad.forEach(b => console.log('  ✗ ' + b));
process.exit(bad.length ? 1 : 0);
