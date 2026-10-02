'use strict';
/* Synthetic jsdom probes for the admin KYC UI. No network, real partner data,
   production token, uploaded document, or browser/device is used. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const CMS = process.env.SMOKE_CMS || path.resolve(__dirname, '../../../cms');
const adminSource = fs.readFileSync(path.join(CMS, 'js/admin.js'), 'utf8');
const privateRef = 'private-kyc:card_0123456789abcdef0123456789abcdef.pdf';
let apiCalls = [], fetchCalls = [], toastCalls = [], modalHtml = '';
let legacyStillPresent = true;
const partners = () => [
  { id: 'qaPrivate', firm: 'Synthetic Private QA', contactPerson: 'QA Contact', city: 'QA City', phone: '9876500044', email: 'private@qa.invalid',
    appliedAt: '2026-10-02T08:00:00+05:30', status: 'pending', kyc: { gstin: '08QATST1234A1Z5', gstinLiveVerified: false, otpVerified: true, businessCard: privateRef } },
  ...(legacyStillPresent ? [{ id: 'qaLegacy', firm: 'Synthetic Legacy QA', contactPerson: 'QA Contact', city: 'QA City', phone: '9876500045', email: 'legacy@qa.invalid',
    appliedAt: '2026-10-02T08:00:00+05:30', status: 'pending', kyc: { businessCard: '/uploads/kyc/card_0123456789.pdf' } }] : []),
];
const dom = new JSDOM('<!doctype html><html><body><div id="view"></div></body></html>', {
  url: 'https://qa.invalid/#/admin', runScripts: 'outside-only', pretendToBeVisual: true,
});
const { window } = dom;
window.confirm = () => true;
window.prompt = () => null;
window.URL.createObjectURL = () => 'blob:https://qa.invalid/synthetic-kyc-document';
window.URL.revokeObjectURL = () => {};
window.fetch = async (url, options={}) => {
  fetchCalls.push({ url: String(url), headers: options.headers || {} });
  return { ok: true, status: 200, headers: { get: () => 'application/pdf' },
    blob: async () => new window.Blob(['%PDF-1.4 synthetic QA only'], { type: 'application/pdf' }) };
};
window.Shivaa = {
  state: { user: { id: 'qaAdmin', role: 'admin', name: 'Synthetic QA Admin' } }, routes: {},
  api: async (url, options={}) => {
    apiCalls.push({ url, method: options.method || 'GET' });
    if (url === '/api/partners') return { partners: partners() };
    if (url === '/api/admin/kyc/migrate-business-cards') { legacyStillPresent = false; return { migrated: 1, missing: 0, invalid: 0, failed: 0, cleanupPending: 0 }; }
    return {};
  },
  toast: (message, type) => toastCalls.push({ message, type }),
  fmt: value => String(value || ''),
  esc: value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
  safeUrl: value => String(value || ''),
  jsArg: value => JSON.stringify(String(value || '')),
  openModal: html => { modalHtml = String(html); },
  closeModal: () => {},
  token: () => 'synthetic-admin-token',
};
window.Shivaa.token = window.Shivaa.token;
window.eval(adminSource);
const pass = (id, name, condition, details='') => {
  console.log(`${condition ? 'PASS' : 'FAIL'} ${id} ${name}${condition ? '' : ': ' + details}`);
  if (!condition) throw new Error(`${id} ${name} ${details}`);
};
(async () => {
  const view = window.document.getElementById('view');
  await window.Shivaa.routes.admin(view, new window.URLSearchParams('tab=partners'));
  pass('V187-A01', 'legacy records expose a migration action while direct KYC URLs are absent from admin markup',
    view.innerHTML.includes('Secure existing cards') && !view.innerHTML.includes('/uploads/kyc/') &&
    !view.querySelector('a[href*="/uploads/kyc/"]') && !view.querySelector('img[src*="/uploads/kyc/"]'), view.innerHTML.slice(0, 500));
  pass('V187-A02', 'partner row exposes a button, not a raw public-file anchor',
    !!view.querySelector('button[data-pid="qaPrivate"][onclick*="viewBusinessCard"]') &&
    !view.querySelector('a[href*="private-kyc:"]'));

  window.ShivaaAdmin.gstKycModal('qaPrivate');
  pass('V187-A03', 'KYC detail modal uses the secure-view action and does not render the private reference as a URL',
    modalHtml.includes('View securely') && !modalHtml.includes(privateRef) && !modalHtml.includes('/uploads/kyc/'), modalHtml.slice(0, 500));

  await window.ShivaaAdmin.viewBusinessCard({
    getAttribute: name => name === 'data-pid' ? 'qaPrivate' : null,
    textContent: 'View securely', disabled: false,
  });
  pass('V187-A04', 'document fetch carries the admin bearer token and opens only a synthetic blob URL',
    fetchCalls.length === 1 && fetchCalls[0].url === '/api/admin/partners/qaPrivate/business-card' &&
    fetchCalls[0].headers.Authorization === 'Bearer synthetic-admin-token' &&
    modalHtml.includes('blob:https://qa.invalid/synthetic-kyc-document') && !modalHtml.includes('/uploads/kyc/'),
    JSON.stringify(fetchCalls));

  await window.ShivaaAdmin.migrateKycCards({ textContent: 'Secure existing cards', disabled: false });
  pass('V187-A05', 'migration action posts through the admin API and refreshes away the legacy button',
    apiCalls.some(x => x.url === '/api/admin/kyc/migrate-business-cards' && x.method === 'POST') &&
    apiCalls.some(x => x.url === '/api/partners') && !view.innerHTML.includes('Secure existing cards'), JSON.stringify(apiCalls));
  pass('V187-A06', 'successful migration reports the synthetic result without changing existing styles',
    toastCalls.some(x => /1 business card/.test(x.message)) && view.innerHTML.includes('btn btn-ghost btn-sm'));

  console.log('\nv187 admin KYC DOM probes: 6 passed, 0 failed');
  dom.window.close();
})().catch(error => { console.error(error); dom.window.close(); process.exit(1); });
