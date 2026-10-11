/* v206 — Black card flip behaviour test (jsdom harness).
   Boots the real app against the preview shim and proves that:
   1. the card is a focusable div[role=button] with data-flip-card,
   2. clicking the card flips it (is-flipped + aria + hint text),
   3. the hint is a real button that flips the card too,
   4. Enter/Space on the card flips it,
   5. re-entry is locked while a flip is in flight,
   6. the delegated handlers live inside the app scope (no console errors).
   jsdom runs no CSS transitions, so the 1150ms safety timer ends each flip. */
import { boot, click, wait, until } from './harness.mjs';

const fails = [];
const ok = (cond, msg) => { if (cond) console.log('  ok ·', msg); else { fails.push(msg); console.log('  FAIL ·', msg); } };

async function checkCard(page, hash) {
  console.log(`\n== ${page} (${hash}) ==`);
  const { window, doc, errors } = await boot(hash);
  await wait(400);

  const card = doc.querySelector('[data-flip-card]');
  ok(!!card, 'card [data-flip-card] found');
  if (!card) return errors;
  ok(card.tagName === 'DIV', 'card is a div (a <button> flattens preserve-3d in WebKit)');
  ok(card.getAttribute('role') === 'button', 'card has role=button');
  ok(card.getAttribute('tabindex') === '0', 'card is keyboard focusable');
  ok(card.className.includes('bc-card'), 'card keeps .bc-card styling hook');

  const hint = doc.querySelector('[data-flip-hint]');
  ok(!!hint && hint.tagName === 'BUTTON', 'hint is a real <button data-flip-hint>');

  const wrap = card.closest('.bc-card-wrap');
  ok(!!wrap, 'card sits in .bc-card-wrap');
  ok(!!card.querySelector('.bc-flip-glint'), 'glint layer present inside the card');

  // 1. click the card → flips to reverse
  click(window, card);
  await wait(120);
  ok(card.classList.contains('is-flipped'), 'click flips the card (is-flipped)');
  ok(card.getAttribute('aria-pressed') === 'true', 'aria-pressed=true after flip');
  ok(/see the front/.test(hint.textContent), 'hint now offers the front');
  ok(card.querySelector('[data-bc-face="back"]').getAttribute('aria-hidden') === 'false', 'back face exposed to AT');
  ok(wrap.classList.contains('is-flipping'), 'wrap runs the lift pass (is-flipping)');

  // 2. lock: a second click inside the flight must not toggle back
  click(window, card);
  await wait(120);
  ok(card.classList.contains('is-flipped'), 're-entry locked during the flip');

  // let the flight finish (jsdom: the 1150ms safety timer)
  await wait(1350);
  ok(!card.classList.contains('is-flipping') || !card.dataset.flipping, 'flip flight completes');
  ok(wrap.classList.contains('is-landed'), 'glint pass runs after landing');

  // 3. the hint button flips it back
  click(window, hint);
  await wait(120);
  ok(!card.classList.contains('is-flipped'), 'hint button flips back to front');
  ok(/see the reverse/.test(hint.textContent), 'hint offers the reverse again');
  ok(card.getAttribute('aria-pressed') === 'false', 'aria-pressed=false after flip back');

  await wait(1350);

  // 4. keyboard: Space then Enter
  const key = (el, k) => el.dispatchEvent(new window.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
  key(card, ' ');
  await wait(120);
  ok(card.classList.contains('is-flipped'), 'Space flips the card');
  await wait(1350);
  key(card, 'Enter');
  await wait(120);
  ok(!card.classList.contains('is-flipped'), 'Enter flips the card back');

  await wait(300);
  const envNoise = /Could not parse CSS|Not implemented: HTMLCanvas|sdk\.cashfree\.com|HTMLMediaElement's (pause|play)/;
  const pageErrors = errors.filter(e => !envNoise.test(e));
  ok(pageErrors.length === 0, 'no page errors' + (pageErrors.length ? ' — ' + pageErrors.slice(0, 3).join(' | ') : ''));
  return errors;
}

console.log('v206 — Black card flip');
await checkCard('Black card page', '#/black-card');
await checkCard('Home hero', '#/');
console.log('\n' + (fails.length ? `FAILURES: ${fails.length}` : 'ALL PASS'));
process.exit(fails.length ? 1 : 0);
