/* ═══════════════════════════════════════════════════════════════════════
   t10 · v107 acceptance audit (jsdom, real index.html + real js + shim API)
   ───────────────────────────────────────────────────────────────────────
   A · every shopper route boots with ZERO uncaught errors
   B · a full click sweep per route (buttons, chips, pay-opts) stays clean
   C · v107 feature asserts: footer ticker, size guide, QV guards,
       redirect-guard regression, OTP honesty line, detail-sheet buttons
   Run:  node qa/browser/t10-v107.mjs
   ═══════════════════════════════════════════════════════════════════════ */
import { boot, click, wait, until, BASE } from './harness.mjs';

let pass = 0, fail = 0;
const ok = (cond, label) => { if (cond) { pass++; console.log('  ✓ ' + label); } else { fail++; console.log('  ✗ ' + label); } };

const ROUTES = ['/', 'shop', 'rates', 'hallmark', 'trust', 'about', 'contact', 'faq',
  'sizer', 'size-guide', 'b2b', 'savings', 'giftcard', 'refer', 'finale', 'account',
  'checkout', 'privacy', 'terms', 'shipping', 'refund', 'care', 'videoconsult',
  'bundle', 'giftlist', 'order/TST107', 'invoice/TST107', 'compare'];

const noisy = e => /ResizeObserver|Not implemented: navigation|Could not parse CSS|unescape/i.test(e);

/* ── A · route walk ─────────────────────────────────────────────────────── */
console.log('\n── A · route walk (zero uncaught errors) ──');
for (const r of ROUTES) {
  const { window, doc, errors } = await boot('#/' + r);
  await wait(500);
  const bad = errors.filter(e => !noisy(e));
  ok(bad.length === 0, '#/' + r + ' boots clean' + (bad.length ? ' :: ' + bad[0].slice(0, 160) : ''));
  window.close();
}

/* ── B · click sweep on the money routes ────────────────────────────────── */
console.log('\n── B · click sweep ──');
for (const r of ['/', 'shop', 'rates', 'size-guide', 'sizer', 'checkout', 'account', 'finale']) {
  const { window, doc, errors } = await boot('#/' + r);
  await wait(700);
  const els = [...doc.querySelectorAll('#view button, #view a[href^="#/"], #view .pay-opt, #view [onclick], footer a[href^="#/"]')].slice(0, 40);
  let clicked = 0;
  for (const el of els) {
    if (!doc.body.contains(el)) continue;
    click(window, el);
    clicked++;
    await wait(90);
  }
  await wait(400);
  const bad = errors.filter(e => !noisy(e));
  ok(bad.length === 0, `#/${r}: ${clicked} clicks, zero errors` + (bad.length ? ' :: ' + bad[0].slice(0, 200) : ''));
  window.close();
}

/* ── C · v107 feature asserts ───────────────────────────────────────────── */
console.log('\n── C · v107 features ──');
{
  const { window, doc, errors } = await boot('#/');
  await wait(900);
  const tick = doc.getElementById('v107FootTicker');
  ok(!!tick, 'footer ticker host exists');
  ok([...doc.styleSheets].some(s => (s.href || '').includes('v107.css')), 'v107.css loaded');
  ok(!!doc.querySelector('link[rel="apple-touch-icon"]'), 'apple-touch-icon linked');
  ok(doc.querySelectorAll('footer .v107-tabglow').length > 0, 'footer chips armed for tap-glow');
  ok(window.document.documentElement.classList.contains('js-motion'), 'motion.js initialised (js-motion)');
  ok(window.document.documentElement.classList.contains('js-aurum'), 'aurum graphics layer initialised (js-aurum)');
  /* detail-sheet door appears on any ds-card that shows up */
  const pid = (window.Shivaa.state.productsCache[0] || {}).id;
  const card = doc.createElement('div');
  card.className = 'ds-card'; card.id = 'ds-' + pid;
  doc.getElementById('view').appendChild(card);
  await wait(300);
  ok(!!card.querySelector('.v107-dds-btn'), 'design cards get the ⓘ full-details door');
  if (card.querySelector('.v107-dds-btn')) {
    click(window, card.querySelector('.v107-dds-btn'));
    await wait(300);
    ok(!!doc.querySelector('.v107-dds'), 'detail sheet opens with the breakdown');
    ok(/Fine metal content/i.test(doc.body.textContent), 'detail sheet shows fine-metal settlement');
  }
  window.close();
}
{
  const { window, doc } = await boot('#/hallmark');
  await wait(700);
  ok(!!doc.getElementById('v107hmFaq'), 'hallmark page carries the honesty FAQ accordion');
  ok((doc.getElementById('v107hmFaq') || { textContent: '' }).textContent.includes('BIS'), 'FAQ names BIS guidance + privacy note');
  window.close();
}
{
  const { window, doc } = await boot('#/size-guide');
  await wait(600);
  const picks = doc.querySelectorAll('.v107-sg-pick');
  ok(picks.length >= 15, 'size guide lists the full Indian range (' + picks.length + ')');
  const target = [...picks].find(p => p.dataset.size === '14');
  click(window, target);
  await wait(200);
  ok(window.localStorage.getItem('shv_ring_size') === '14', 'picking a size persists shv_ring_size');
  ok(target.classList.contains('on'), 'picked size is highlighted');
  ok(/50 mm/.test(doc.body.textContent), 'true-scale ruler check is present');
  window.close();
}
{
  /* redirect-guard regression: navigating away must cancel the 3s bounce */
  const { window, doc } = await boot('#/definitely-not-a-page');
  await wait(400);
  ok(/slipped its clasp/.test(doc.body.textContent), 'unknown route shows the clasp page');
  window.location.hash = '#/rates';
  await wait(3600);
  ok(window.location.hash === '#/rates', 'stale redirect no longer yanks the shopper home');
  window.close();
}
{
  const { window, doc } = await boot('#/shop');
  await until(() => (window.Shivaa.state.productsCache || []).length > 0);
  const pid = window.Shivaa.state.productsCache[0].id;
  window.Shivaa.quickView(pid);
  await wait(500);
  const qv = doc.querySelector('.qv');
  ok(!!qv, 'Quick View opens');
  ok(!!(qv && qv.querySelector('.v107-skip')), 'Quick View has the skip-to-buy link');
  window.close();
}
{
  const { window, doc } = await boot('#/');
  await wait(3000);
  const tick = doc.getElementById('v107FootTicker');
  ok(tick && tick.querySelectorAll('.v107-cell').length === 4, 'ticker fills once rates land');
  ok(tick && /Jaipur|premium/i.test(tick.textContent), 'ticker basis line names the Jaipur premium');
  window.Shivaa.openLogin('account');
  await until(() => doc.getElementById('shvPhoneIn'), 6000);
  await wait(500);
  const chan1 = doc.querySelector('#shvStartForm .v107-chan');
  ok(!!chan1, 'passport phone step shows the delivery-channel line');
  ok(chan1 && /email/i.test(chan1.textContent), 'channel line is honest about email fallback');
  const pin = doc.getElementById('shvPhoneIn');
  pin.value = '9876543210';
  click(window, doc.getElementById('shvPhoneBtn'));
  await until(() => doc.getElementById('shvOtp'), 6000);
  await wait(900);
  ok(!!doc.querySelector('.shv-body .v107-chan'), 'code step carries the channel line too');
  window.close();
}

console.log(`\n══ t10: ${pass} passed, ${fail} failed ══`);
process.exit(fail ? 1 : 0);
