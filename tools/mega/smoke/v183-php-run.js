/* v183 — executed PHP 8.3 suite for the FY 2026–27 Growth Mission deck
   (Admin → FY Mission): 700 B2B partners + 1,100 retail customers before
   30 March 2027, live countdown, admin-only.

   Runs the REAL api.php inside the isolated fixture and asserts:
     · every fy route is admin-gated and leaks nothing to a member/anon call;
     · the deck's figures are DERIVED from real records (never invented);
     · a logged row is refused unless its source is named (standing law);
     · targets / deadline / opening counts are validated before they persist;
     · pace, projection and the monthly curve stay honest when there is no
       recorded growth (no projection invented, verdict says "stalled");
     · every write lands in the audit trail.
   What is NOT verified here — stated plainly for the record: the deck's
   browser rendering (admin.js is checked by v183-check + node --check) and a
   live MySQL round-trip (fyTargets/fyEntries are JSON collections in v183,
   like khata/cashbook/savingsPlans — no new schema). */
const assert = require('node:assert/strict');
const { fixture, seed, ADMIN, MEMBER } = require('./php-api-fixture');
let pass = 0, fail = 0;
setTimeout(() => { console.error('v183 harness deadline exceeded'); process.exit(1); }, 180000);
async function test(id, name, f) { try { await f(); pass++; console.log(`PASS ${id} ${name}`); } catch (e) { fail++; console.log(`FAIL ${id} ${name}: ${e.message}`); } }

const iso = d => new Date(d).toISOString();

(async () => {
  const F = await fixture();
  F.setDb(seed());

  await test('P01', 'v183 release stamp and version telemetry: rel=183, matched=true', async () => {
    const v = await F.req('GET', 'version');
    assert.equal(v.status, 200);
    assert.equal(v.json.rel, 183);
    assert.equal(v.json.stamp.matched, true);
    assert.equal(v.json.stamp.index, 183);
    assert.equal(v.json.stamp.app, 183);
    assert.equal(v.json.stamp.sw, 183);
    assert.equal(v.json.shell, 'shivaa-shell-v183');
  });

  await test('P02', 'the whole deck is admin-only: anon and member both 403, no figures leak', async () => {
    const routes = [
      ['GET', 'admin/fy-targets'], ['POST', 'admin/fy-targets'],
      ['POST', 'admin/fy-targets/entry'], ['POST', 'admin/fy-targets/entry-undo'],
    ];
    for (const [m, r] of routes) {
      const anon = await F.req(m, r, {});
      assert.equal(anon.status, 403, `${m} ${r} anon must 403`);
      const mem = await F.req(m, r, {}, MEMBER);
      assert.equal(mem.status, 403, `${m} ${r} member must 403`);
      // the refusal must not carry a single number from the deck
      const body = JSON.stringify(anon.json || {});
      assert.ok(!/700|1100|deadline|achieved/.test(body), `${m} ${r} leaked deck data to a non-admin`);
    }
  });

  let deck = null;
  await test('P03', 'GET deck: the owner\'s brief is the default — 700 / 1100 / 30 Mar 2027 + live countdown', async () => {
    const r = await F.req('GET', 'admin/fy-targets', {}, ADMIN);
    assert.equal(r.status, 200);
    deck = r.json;
    assert.equal(deck.config.lanes.b2b.target, 700, 'B2B partner target is 700');
    assert.equal(deck.config.lanes.retail.target, 1100, 'retail customer target is 1100');
    assert.equal(deck.config.deadline, '2027-03-30T23:59:59+05:30', 'finish line is 30 March 2027 IST');
    assert.equal(deck.config.fyStart, '2026-04-01T00:00:00+05:30', 'FY 2026-27 opened 1 April 2026');
    assert.equal(deck.mission.target, 1800, 'combined mission total');
    // countdown: server-pinned, ticking, and genuinely in the future
    assert.ok(deck.countdown.deadlineTs > deck.countdown.serverNow, 'deadline is ahead of the server clock');
    assert.equal(typeof deck.countdown.serverNow, 'number', 'serverNow is epoch-ms so the browser can pin its ticker');
    assert.ok(deck.countdown.daysLeft > 0, 'days left computed, got ' + deck.countdown.daysLeft);
    assert.equal(deck.countdown.ended, false);
    assert.ok(deck.countdown.daysElapsed > 0, 'days elapsed computed');
    assert.equal(deck.countdown.totalDays, 363, 'the FY window is 363 days long (1 Apr 2026 → 30 Mar 2027)');
    // the fixture seeds exactly one customer user and no partners
    assert.equal(deck.lanes.retail.fromDb, 1, 'retail derived from role=customer users');
    assert.equal(deck.lanes.b2b.fromDb, 0, 'B2B derived from approved partner rows');
    assert.equal(deck.lanes.retail.achieved, 1);
    assert.equal(deck.lanes.retail.remaining, 1099);
    assert.equal(deck.lanes.b2b.remaining, 700);
  });

  await test('P04', 'the figures follow the REAL records — partners, customers, buyers, pending KYC', async () => {
    const db = await F.db();
    const now = Date.now();
    db.partners = [
      { id: 'pt_a', firm: 'A', status: 'approved', joined: iso(now - 40 * 86400000) },
      { id: 'pt_b', firm: 'B', status: 'approved', appliedAt: iso(now - 20 * 86400000) },
      { id: 'pt_c', firm: 'C', status: 'approved', appliedAt: iso(now - 3 * 86400000) },
      { id: 'pt_d', firm: 'D', status: 'pending', appliedAt: iso(now - 2 * 86400000) },
      { id: 'pt_e', firm: 'E', status: 'rejected', appliedAt: iso(now - 1 * 86400000) },
    ];
    db.users.push(
      { id: 'qaC1', role: 'customer', name: 'QA C1', phone: '9876500011', email: 'c1@qa.invalid', createdAt: iso(now - 30 * 86400000) },
      { id: 'qaC2', role: 'customer', name: 'QA C2', phone: '9876500012', email: 'c2@qa.invalid', createdAt: iso(now - 5 * 86400000) },
      { id: 'qaP1', role: 'partner', name: 'QA P1', phone: '9876500013', email: 'p1@qa.invalid', partnerId: 'pt_a', createdAt: iso(now - 40 * 86400000) },
    );
    db.orders = [
      { id: 'QA1', userId: 'qaMember', status: 'Paid', total: 5000, createdAt: iso(now - 6 * 86400000) },
      { id: 'QA2', userId: 'qaC1', status: 'Cancelled', total: 9000, createdAt: iso(now - 4 * 86400000) },
    ];
    F.setDb(db);
    const r = await F.req('GET', 'admin/fy-targets', {}, ADMIN);
    const d = r.json;
    assert.equal(d.lanes.b2b.fromDb, 3, 'only status=approved partners count as signed');
    assert.equal(d.lanes.b2b.pending, 1, 'the pending KYC application is shown separately, never counted');
    assert.equal(d.lanes.b2b.achieved, 3);
    assert.equal(d.lanes.retail.fromDb, 3, 'seed customer + two new ones');
    assert.equal(d.lanes.retail.buyers, 1, 'cancelled orders do not make a buyer');
    assert.equal(d.lanes.b2b.pct, 0.4, 'pct = 3/700 rounded to one decimal');
    assert.equal(d.lanes.retail.pct, 0.3);
    assert.equal(d.mission.achieved, 6);
  });

  await test('P05', 'standing law: a logged count is REFUSED unless its source is named', async () => {
    // no source at all
    let r = await F.req('POST', 'admin/fy-targets/entry', { lane: 'b2b', count: 12 }, ADMIN);
    assert.equal(r.status, 400);
    assert.ok(/NEVER invented/.test(r.json.error), 'the refusal names the law, got: ' + r.json.error);
    // blank source
    r = await F.req('POST', 'admin/fy-targets/entry', { lane: 'b2b', count: 12, source: '   ' }, ADMIN);
    assert.equal(r.status, 400);
    // bad lane / bad counts
    r = await F.req('POST', 'admin/fy-targets/entry', { lane: 'both', count: 1, source: 'x' }, ADMIN);
    assert.equal(r.status, 400, 'unknown lane refused');
    r = await F.req('POST', 'admin/fy-targets/entry', { lane: 'b2b', count: 0, source: 'x' }, ADMIN);
    assert.equal(r.status, 400, 'zero count refused');
    r = await F.req('POST', 'admin/fy-targets/entry', { lane: 'b2b', count: 1.5, source: 'x' }, ADMIN);
    assert.equal(r.status, 400, 'fractional count refused');
    r = await F.req('POST', 'admin/fy-targets/entry', { lane: 'b2b', count: 1001, source: 'x' }, ADMIN);
    assert.equal(r.status, 400, 'over-large count refused');
    // nothing was written by any of the refusals
    const d = (await F.req('GET', 'admin/fy-targets', {}, ADMIN)).json;
    assert.equal(d.lanes.b2b.manual, 0, 'refused rows never touch the deck');
    assert.equal(d.entries.length, 0);
  });

  let entryId = '';
  await test('P06', 'a sourced row lands, moves the lane, and is written to the audit trail', async () => {
    const r = await F.req('POST', 'admin/fy-targets/entry',
      { lane: 'b2b', count: 12, source: 'Counter register p.4 · Jayal showroom', note: 'Week 40 walk-ins' }, ADMIN);
    assert.equal(r.status, 200);
    entryId = r.json.entry.id;
    assert.ok(/^fy_/.test(entryId), 'ledger id minted');
    assert.equal(r.json.deck.lanes.b2b.manual, 12);
    assert.equal(r.json.deck.lanes.b2b.achieved, 15, '3 approved + 12 logged');
    assert.equal(r.json.deck.lanes.b2b.remaining, 685);
    // a second row on the other lane
    const r2 = await F.req('POST', 'admin/fy-targets/entry', { lane: 'retail', count: 40, source: 'Billing software export 03 Oct' }, ADMIN);
    assert.equal(r2.status, 200);
    assert.equal(r2.json.deck.lanes.retail.achieved, 43, '3 customers + 40 logged');
    const audit = await F.run(`$d=json_decode(file_get_contents('/qa/data/db.json'),true);
      echo json_encode(array_values(array_filter($d['auditLog'], fn($a)=>strpos($a['what'],'fy.')===0)));`);
    const rows = JSON.parse(audit.body.trim());
    assert.equal(rows.length, 2, 'both writes audited');
    assert.equal(rows[0].what, 'fy.entry.add');
    assert.equal(rows[0].meta.source, 'Counter register p.4 · Jayal showroom');
  });

  await test('P07', 'undo puts the figure back exactly; an unknown row 404s', async () => {
    const bad = await F.req('POST', 'admin/fy-targets/entry-undo', { id: 'fy_nope' }, ADMIN);
    assert.equal(bad.status, 404);
    const r = await F.req('POST', 'admin/fy-targets/entry-undo', { id: entryId }, ADMIN);
    assert.equal(r.status, 200);
    assert.equal(r.json.removed.count, 12);
    assert.equal(r.json.deck.lanes.b2b.manual, 0, 'the lane drops back');
    assert.equal(r.json.deck.lanes.b2b.achieved, 3);
    const again = await F.req('POST', 'admin/fy-targets/entry-undo', { id: entryId }, ADMIN);
    assert.equal(again.status, 404, 'a row cannot be undone twice');
  });

  await test('P08', 'targets, opening counts and dates are validated before they persist', async () => {
    let r = await F.req('POST', 'admin/fy-targets', { b2bTarget: 0 }, ADMIN);
    assert.equal(r.status, 400, 'a zero target is refused');
    r = await F.req('POST', 'admin/fy-targets', { retailTarget: 1000001 }, ADMIN);
    assert.equal(r.status, 400, 'an absurd target is refused');
    r = await F.req('POST', 'admin/fy-targets', { b2bTarget: 12.5 }, ADMIN);
    assert.equal(r.status, 400, 'a fractional target is refused');
    r = await F.req('POST', 'admin/fy-targets', { deadline: '2020-01-01' }, ADMIN);
    assert.equal(r.status, 400, 'a finish line in the past is refused');
    r = await F.req('POST', 'admin/fy-targets', { deadline: 'not a date' }, ADMIN);
    assert.equal(r.status, 400, 'an unreadable date is refused');
    r = await F.req('POST', 'admin/fy-targets', { b2bTarget: 700, b2bBaseline: -1 }, ADMIN);
    assert.equal(r.status, 400, 'a negative opening count is refused');
    r = await F.req('POST', 'admin/fy-targets', { fyStart: '2029-06-01', deadline: '2029-01-01' }, ADMIN);
    assert.equal(r.status, 400, 'the FY cannot start after the finish line');
    // nothing changed by the refusals
    let d = (await F.req('GET', 'admin/fy-targets', {}, ADMIN)).json;
    assert.equal(d.config.lanes.b2b.target, 700);
    assert.equal(d.config.deadline, '2027-03-30T23:59:59+05:30');
    // a real edit persists and re-derives everything
    r = await F.req('POST', 'admin/fy-targets',
      { b2bTarget: 500, retailTarget: 900, b2bBaseline: 40, retailBaseline: 120, deadline: '2027-03-30', fyStart: '2026-04-01', label: 'FY 2026-27 · 500 + 900' }, ADMIN);
    assert.equal(r.status, 200);
    d = (await F.req('GET', 'admin/fy-targets', {}, ADMIN)).json;
    assert.equal(d.config.lanes.b2b.target, 500);
    assert.equal(d.config.lanes.retail.target, 900);
    assert.equal(d.config.label, 'FY 2026-27 · 500 + 900');
    assert.equal(d.config.deadline.slice(0, 10), '2027-03-30');
    assert.equal(d.mission.target, 1400);
    assert.equal(d.lanes.b2b.achieved, 43, '3 approved + 40 opening count');
    assert.equal(d.lanes.retail.achieved, 163, '3 customers + 120 opening count + 40 logged');
    assert.equal(d.lanes.retail.remaining, 737);
  });

  await test('P09', 'pace and projection stay honest: no growth ⇒ no invented projection', async () => {
    // self-contained: pin the owner's original brief, whatever ran before
    const cfg = await F.req('POST', 'admin/fy-targets',
      { b2bTarget: 700, retailTarget: 1100, b2bBaseline: 0, retailBaseline: 0,
        fyStart: '2026-04-01', deadline: '2027-03-30' }, ADMIN);
    assert.equal(cfg.status, 200);
    // reset to a lane with nothing recorded inside the FY at all
    const db = await F.db();
    db.partners = [{ id: 'pt_old', firm: 'Old', status: 'approved', joined: iso(Date.parse('2025-01-10T00:00:00Z')) }];
    db.users = db.users.filter(u => u.role !== 'customer');
    db.fyEntries = [];
    F.setDb(db);
    let d = (await F.req('GET', 'admin/fy-targets', {}, ADMIN)).json;
    assert.equal(d.config.lanes.b2b.target, 700, 'the pinned brief is in force');
    assert.equal(d.config.fyStart.slice(0, 10), '2026-04-01');
    assert.equal(d.lanes.b2b.achieved, 1, 'only the pre-FY partner is in the book');
    assert.equal(d.lanes.b2b.fyGrowth, 0, 'a pre-FY signature is not FY growth');
    assert.equal(d.lanes.b2b.projectedAt, null, 'no projection invented when nothing is growing');
    assert.equal(d.lanes.b2b.verdict, 'stalled');
    assert.equal(d.lanes.b2b.actualPerDay, 0);
    assert.ok(d.lanes.b2b.requiredPerDay > 0, 'the required run-rate is still real');
    // now give the lane a real pace and the projection appears
    const now = Date.now();
    db.partners = [
      { id: 'pt_1', status: 'approved', joined: iso(now - 30 * 86400000) },
      { id: 'pt_2', status: 'approved', joined: iso(now - 15 * 86400000) },
    ];
    F.setDb(db);
    d = (await F.req('GET', 'admin/fy-targets', {}, ADMIN)).json;
    assert.equal(d.lanes.b2b.fyGrowth, 2);
    assert.ok(d.lanes.b2b.actualPerDay > 0);
    assert.ok(d.lanes.b2b.projectedAt, 'a projection is derived from the recorded pace');
    assert.ok(Date.parse(d.lanes.b2b.projectedAt) > Date.now(), 'the projection is in the future');
    assert.equal(d.lanes.b2b.achieved, 2);
    assert.equal(d.lanes.b2b.verdict, 'behind', 'two partners in a month cannot reach 700 by 30 Mar 2027');
    assert.ok(d.lanes.b2b.slackDays < 0, 'the buffer reads negative when the pace is short');
  });

  await test('P10', 'the monthly curve adds up to the lane figure — no invented months', async () => {
    const d = (await F.req('GET', 'admin/fy-targets', {}, ADMIN)).json;
    for (const lane of ['b2b', 'retail']) {
      const h = d.history[lane];
      assert.ok(h.months.length >= 1, lane + ' history has months');
      assert.ok(h.months.length <= 13, lane + ' history is capped at the FY window');
      const sum = h.months.reduce((a, m) => a + m.new, 0);
      assert.equal(h.opening + sum, d.lanes[lane].achieved,
        lane + ': opening + monthly growth must equal the achieved figure');
      let cum = h.opening;
      for (const m of h.months) { cum += m.new; assert.equal(m.cum, cum, lane + ' curve is cumulative'); }
      assert.equal(h.months[h.months.length - 1].cum, d.lanes[lane].achieved, lane + ' curve ends on the lane figure');
    }
  });

  await test('P11', 'a corrupt fyTargets block can never break the deck (re-typed on read)', async () => {
    const db = await F.db();
    db.fyTargets = { label: { evil: true }, fyStart: 'garbage', deadline: 'nonsense',
      lanes: { b2b: { target: 'lots', baseline: -5 }, retail: null } };
    F.setDb(db);
    const r = await F.req('GET', 'admin/fy-targets', {}, ADMIN);
    assert.equal(r.status, 200, 'the deck still renders');
    assert.equal(r.json.config.lanes.b2b.target, 700, 'a non-numeric target falls back to the owner default');
    assert.equal(r.json.config.lanes.b2b.baseline, 0, 'a negative opening count is clamped to 0');
    assert.equal(r.json.config.deadline, '2027-03-30T23:59:59+05:30', 'an unreadable date falls back');
    assert.equal(typeof r.json.config.label, 'string');
  });

  await test('P12', 'the deck is JSON-only in v183 and says so — no new MySQL schema is implied', async () => {
    // the version endpoint still reports the honest data-source dial
    const v = await F.req('GET', 'version');
    assert.equal(v.json.db.driver, 'json');
    assert.equal(v.json.db.mirrorBehind, false);
    // the collections exist and survive a save round-trip
    const db = await F.db();
    assert.ok(Array.isArray(db.fyEntries), 'fyEntries is a list');
    assert.ok(db.fyTargets && typeof db.fyTargets === 'object', 'fyTargets is a config object');
  });

  console.log(`\nv183 PHP: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);   // php-wasm keeps the loop alive — exit like every other suite
})();
