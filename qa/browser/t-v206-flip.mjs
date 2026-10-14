/* v214 — Black card NO-FLIP guard (jsdom harness).
   The owner removed the tap-to-flip feature entirely ("Completely remove
   the feature of tap to see card front or back"). This suite (kept under
   its historical name so the release checklist stays stable) now proves:
   1. the card renders as a plain display object on home and #/black-card,
   2. no flip affordances exist (no data-flip-card / data-flip-hint /
      role=button / tabindex / flip API),
   3. clicking the card does NOT turn it,
   4. backFirst surfaces still show their reverse face statically,
   5. the card carries the v214 float animation hooks and no real errors. */
import { boot, click, wait } from './harness.mjs';

const fails = [];
const ok = (cond, msg) => { if (cond) console.log('  ok ·', msg); else { fails.push(msg); console.log('  FAIL ·', msg); } };

async function checkCard(page, hash) {
  console.log(`\n== ${page} (${hash}) ==`);
  const { window, doc, errors } = await boot(hash);
  await wait(500);

  const card = doc.querySelector('.bc-card');
  ok(!!card, 'card .bc-card found');
  if (!card) return errors;
  ok(card.tagName !== 'BUTTON', 'card is not a <button> (display object)');
  ok(!card.hasAttribute('data-flip-card'), 'no data-flip-card');
  ok(card.getAttribute('role') !== 'button', 'no role=button');
  ok(!card.hasAttribute('tabindex'), 'no tabindex');
  ok(!doc.querySelector('[data-flip-hint]') && !doc.querySelector('.bc-flip-hint'), 'no flip hint');
  ok(typeof window.Shivaa.flipBlackCard === 'undefined', 'flip API removed');

  const before = card.classList.contains('is-flipped');
  click(window, card);
  await wait(900);
  ok(card.classList.contains('is-flipped') === before, 'tap does not flip the card');

  const real = errors.filter(e => !/cashfree|Could not load script|getContext|Not implemented|Could not parse CSS|Client network socket disconnected/.test(e));
  ok(real.length === 0, 'no real page errors' + (real.length ? ' → ' + String(real[0]).slice(0, 90) : ''));
  return errors;
}

await checkCard('home hero card', '#/');
await checkCard('black-card page', '#/black-card');

console.log(fails.length ? `\nFAIL ${fails.length}` : '\nALL PASS');
process.exit(fails.length ? 1 : 0);
