/* v183 — FY 2026–27 Growth Mission deck (Admin → FY Mission), checked
   statically. Runtime behaviour is executed by v183-php-run under PHP 8.3.

   SUPERSEDED-PROBE v183 — stamp-exact suite for release 183: on a NEWER tree
   it SKIPs (the regression content re-executes inside the current chain
   php-run); on its own release, or on an overlay of its own zip, it runs. */
{
  const fs0 = require('fs'), path0 = require('path');
  const cms0 = process.env.SMOKE_CMS || path0.resolve(__dirname, '../../../cms');
  const m0 = /__SHIVAA_REL\s*=\s*(\d+)/.exec(fs0.readFileSync(path0.join(cms0, 'index.html'), 'utf8'));
  const rel0 = m0 ? +m0[1] : 0;
  if (rel0 > 183) {
    console.log('SKIP v183-check superseded by release ' + rel0 + ' (stamp-exact; its regression content runs in the current chain php-run)');
    process.exit(0);
  }
}

const fs = require('fs'), path = require('path'), assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const CMS = process.env.SMOKE_CMS || path.resolve(__dirname, '../../../cms');
const rd = n => fs.readFileSync(path.join(CMS, n), 'utf8');
const index = rd('index.html'), sw = rd('sw.js'), app = rd('js/app.js'), admin = rd('js/admin.js');
const api = rd('api.php'), css = rd('css/v183.css');
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
let pass = 0, fail = 0;
setTimeout(() => { console.error('v183 harness deadline exceeded'); process.exit(1); }, 60000);
async function test(id, name, f) { try { await f(); pass++; console.log(`PASS ${id} ${name}`); } catch (e) { fail++; console.log(`FAIL ${id} ${name}: ${e.message}`); } }

/* the deck block inside admin.js — everything the FY tab renders */
const deckStart = admin.indexOf('v183 · FY GROWTH MISSION DECK');
const deckEnd = admin.indexOf('/* ════════════════ ADMIN ════════════════ */');
const deckBlock = admin.slice(deckStart, deckEnd);

(async () => {
  await test('S01', 'release 183 in lockstep across all four stamp sites', async () => {
    assert.ok(index.includes('window.__SHIVAA_REL=183;'), 'index stamp');
    assert.ok(app.includes('const APP_REL = 183;'), 'app stamp');
    assert.ok(sw.includes("const SHELL = 'shivaa-shell-v183';") && sw.includes('const REL = 183;'), 'worker stamps');
    assert.ok(api.includes("'rel'   => 183,"), 'api version endpoint');
  });

  await test('S02', 'every asset re-stamped to 183, the new sheet is last and precached, media untouched', async () => {
    assert.ok((index.match(/\?v=183/g) || []).length >= 58, 'index carries the full asset sheet, got ' + (index.match(/\?v=183/g) || []).length);
    assert.equal((sw.match(/\?v=183/g) || []).length, 52, 'worker precache list (51 + v183.css)');
    for (const [name, src] of [['index.html', index], ['js/app.js', app], ['js/admin.js', admin], ['sw.js', sw]])
      assert.ok(!src.includes('?v=182'), name + ' still pins a v182 asset URL');
    assert.ok(!app.includes('APP_REL = 182') && !index.includes('__SHIVAA_REL=182'), 'no old release stamps');
    assert.ok(sw.includes("const MEDIA = 'shivaa-media-v168';"), 'media generation deliberately unchanged at v168');
    const links = [...index.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="(\/css\/[^"]+)"/g)].map(m => m[1]);
    assert.ok(links.length && links[links.length - 1] === '/css/v183.css?v=183', 'v183.css is the last sheet, got ' + links[links.length - 1]);
    // an admin-only sheet must not sit in a shopper's blocking paint path
    assert.ok(index.includes('<link rel="preload" as="style" href="/css/v183.css?v=183" onload="this.onload=null;this.rel=\'stylesheet\'">'),
      'v183.css loads with the v117 non-blocking preload-swap pattern');
    assert.ok(index.includes('<noscript><link rel="stylesheet" href="/css/v183.css?v=183"></noscript>'), 'noscript fallback kept');
    assert.ok(index.indexOf('/css/v178.css?v=183') < index.indexOf('/css/v183.css?v=183'), 'v183.css sits after v178.css');
    assert.ok(sw.includes("'/css/v183.css?v=183'"), 'worker precaches the new sheet (offline parity)');
    // precache parity: every css the shell links is in the worker list
    for (const l of links) assert.ok(sw.includes("'" + l + "'"), 'precache is missing ' + l);
  });

  await test('S03', 'the shipped JavaScript parses cleanly', async () => {
    for (const f of ['js/app.js', 'js/admin.js', 'js/v178.js', 'sw.js'])
      execFileSync(process.execPath, ['--check', path.join(CMS, f)], { stdio: 'pipe' });
  });

  await test('S04', 'api.php carries the FY mission machinery behind admin gates', async () => {
    for (const needle of [
      'function shv_fy_defaults(): array',
      'function shv_fy_config(array $db): array',
      'function shv_fy_records(array $db, string $lane): array',
      'function shv_fy_lane(array $db, array $cfg, string $lane, int $now): array',
      'function shv_fy_history(array $db, array $cfg, string $lane, int $now): array',
      'function shv_fy_view(array $db): array',
      "if ($route === 'admin/fy-targets' && $method === 'GET')",
      "if ($route === 'admin/fy-targets' && $method === 'POST')",
      "if ($route === 'admin/fy-targets/entry' && $method === 'POST')",
      "if ($route === 'admin/fy-targets/entry-undo' && $method === 'POST')",
    ]) assert.ok(api.includes(needle), 'missing in api.php: ' + needle);

    const start = api.indexOf('v183 · FY 2026–27 Growth Mission deck — ADMIN ONLY');
    const end = api.indexOf('/* ── making charges ── */', start);
    assert.ok(start > 0 && end > start, 'v183 route block located');
    const block = api.slice(start, end);
    // four routes, four gates — the deck has no anonymous door
    assert.equal((block.match(/need_admin\(\$db\)/g) || []).length, 4, 'every FY route is admin-gated');
    assert.equal((block.match(/if \(\$route ===/g) || []).length, 4, 'exactly four FY routes');
    // standing law + honesty guards
    assert.ok(block.includes('counts are NEVER invented'), 'a logged count without a source is refused');
    assert.ok(block.includes("rate_block($db, 'fy-entry'"), 'the ledger write is rate-limited');
    assert.ok((block.match(/audit_log\(\$db, 'fy\./g) || []).length === 3, 'every FY write is audited');
    assert.ok(block.includes("'The finish line must be in the future'"), 'a past finish line is refused');
    assert.ok(block.includes('whole number between 1 and 1,000,000'), 'targets are range-checked');
    // the owner's brief is the shipped default, and it is the ONLY place it lives
    const dStart = api.indexOf('function shv_fy_defaults(): array');
    const defaults = api.slice(dStart, api.indexOf('\n}', dStart));
    assert.ok(defaults.includes("'target' => 700"), 'B2B partner target defaults to 700');
    assert.ok(defaults.includes("'target' => 1100"), 'retail customer target defaults to 1100');
    assert.ok(defaults.includes("'2027-03-30T23:59:59+05:30'"), 'finish line defaults to 30 March 2027 IST');
    assert.ok(defaults.includes("'2026-04-01T00:00:00+05:30'"), 'FY 2026-27 start defaults to 1 April 2026');
    // the ledger is capped and the collections are auto-healed
    assert.ok(api.includes("'fyEntries'") && api.includes("$db['fyEntries'][] = $e;"), 'ledger collection wired');
    assert.ok(api.includes('count($db[\'fyEntries\']) > 2000'), 'ledger cannot grow without bound');
  });

  await test('S05', 'the deck exists ONLY in the admin portal — no shopper-facing surface', async () => {
    // no storefront file knows the deck exists
    assert.ok(!app.includes('fy-targets'), 'app.js never calls the deck API');
    assert.ok(!app.includes('tab=fy'), 'app.js has no FY route');
    assert.ok(!index.includes('fy-targets'), 'index.html never calls the deck API');
    assert.ok(!api.includes("'fy-targets' &&"), 'there is no non-admin fy-targets route');
    // the tab lives inside renderAdmin, behind the admin gate
    const gate = admin.indexOf("state.user.role !== 'admin'");
    const nav = admin.indexOf("['fy','👑','FY Mission']");
    assert.ok(gate > 0 && nav > gate, 'the FY tab is rendered only after the admin gate');
    assert.ok(admin.includes("if (tab === 'fy') {"), 'the tab body is wired');
    assert.ok(admin.includes("/api/admin/fy-targets"), 'the tab reads the admin route');
    // the styles only apply where the deck class exists
    assert.ok(css.includes('.fy-deck{'), 'the deck styles hang off one scoped root class');
  });

  await test('S06', 'the countdown is live, server-pinned and self-clearing', async () => {
    assert.ok(deckBlock.includes('setInterval(paint, 1000)'), 'ticks every second');
    assert.ok(deckBlock.includes('deck.countdown.serverNow'), 'pinned to the server clock, not the device clock');
    assert.ok(deckBlock.includes('deck.countdown.deadlineTs'), 'counts down to the API deadline');
    assert.ok(/if \(!box\) \{[\s\S]{0,120}clearInterval\(window\._fyTick\)/.test(deckBlock), 'the ticker stops when the deck leaves the DOM');
    assert.ok(deckBlock.includes('clearInterval(window._fyTick); window._fyTick = null;'), 're-entry never leaves two tickers running');
    assert.ok(deckBlock.includes("id=\"fyD\"") && deckBlock.includes("id=\"fyS\""), 'days and seconds are rendered');
    assert.ok(api.includes("'serverNow' => $now * 1000"), 'the API publishes epoch-ms for the pin');
  });

  await test('S07', 'the UI draws what the API returns — the targets are never hard-coded in the view', async () => {
    assert.ok(!/\b(700|1100)\b/.test(deckBlock), 'no hard-coded target numbers in the deck markup');
    for (const needle of ['deck.lanes', 'L1.target', 'L2.target', 'CD.deadline', 'deck.mission', 'deck.history'])
      assert.ok(deckBlock.includes(needle), 'the deck renders from the API payload: ' + needle);
    assert.ok(deckBlock.includes('deck.error'), 'an unreadable deck says so instead of showing zeros');
    assert.ok(api.includes("'sources' =>"), 'the API names where every figure comes from');
    assert.ok(deckBlock.includes('src.b2b') && deckBlock.includes('src.retail'), 'the provenance is printed on the deck');
  });

  await test('S08', 'the stylesheet is namespaced to the deck and respects motion + print', async () => {
    const src = css.replace(/\/\*[\s\S]*?\*\//g, '');
    // walk the braces: every selector (and at-rule prelude) in the file
    const sels = [];
    let buf = '';
    for (const ch of src) {
      if (ch === '{') { if (buf.trim()) sels.push(buf.trim()); buf = ''; }
      else if (ch === '}') { buf = ''; }
      else buf += ch;
    }
    // at-rule preludes and @keyframes step keywords (0%, 55%,100%, from, to)
    // are not selectors — everything else must live inside the .fy- namespace
    const real = sels.filter(s => !s.startsWith('@') && !/^([\d.,\s%]+|from|to)$/.test(s));
    assert.ok(real.length > 40, 'the sheet actually carries the deck design, got ' + real.length + ' rules');
    for (const sel of real) {
      for (const part of sel.split(',')) {
        const t = part.trim();
        assert.ok(/^\.fy-/.test(t), 'a rule escapes the .fy- namespace: ' + t);
      }
    }
    assert.ok(!/(^|[,\s])(body|html|:root)[\s{]/.test(src), 'no global element rule');
    assert.ok(!/\.adm-/.test(src), 'the admin shell is left alone');
    assert.ok(src.includes('@media (prefers-reduced-motion:reduce)'), 'reduced-motion honoured');
    assert.ok(src.includes('@media print'), 'the deck prints on paper, not obsidian');
    assert.ok(src.includes('@media (max-width:620px)'), 'phone layout handled');
  });

  await test('S09', 'the belt cannot silently drop the v183 suites', async () => {
    assert.ok(pkg.scripts.test.includes('node v183-check.js'), 'v183-check is in npm test');
    assert.ok(pkg.scripts.test.includes('node v183-php-run.js'), 'v183-php-run is in npm test');
    assert.ok(pkg.scripts.test.indexOf('v183-check.js') < pkg.scripts.test.indexOf('v182-check.js'), 'the newest suite runs first');
  });

  /* ── executed render: the shipped admin.js in jsdom, not a re-implementation ── */
  const { JSDOM } = require('jsdom');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const deckPayload = () => ({
    config: { label: 'FY 2026–27 Growth Mission', fyStart: '2026-04-01T00:00:00+05:30',
      deadline: '2027-03-30T23:59:59+05:30',
      lanes: { b2b: { label: 'B2B Jeweller Partners', target: 700, baseline: 40 },
               retail: { label: 'Retail Customers', target: 1100, baseline: 120 } } },
    lanes: {
      b2b: { key: 'b2b', label: 'B2B Jeweller Partners', target: 700, achieved: 63, remaining: 637, pct: 9.0,
        baseline: 40, fromDb: 23, manual: 0, pending: 4, buyers: 0, fyGrowth: 23, requiredPerDay: 3.58,
        requiredPerWeek: 25.1, actualPerDay: 0.12, actualPerWeek: 0.9, elapsedDays: 185, daysLeft: 178,
        projectedAt: '2041-06-01T00:00:00+05:30', projectedInDays: 5355, slackDays: -5177, verdict: 'behind' },
      retail: { key: 'retail', label: 'Retail Customers', target: 1100, achieved: 320, remaining: 780, pct: 29.1,
        baseline: 120, fromDb: 180, manual: 20, pending: 0, buyers: 41, fyGrowth: 200, requiredPerDay: 4.38,
        requiredPerWeek: 30.7, actualPerDay: 1.08, actualPerWeek: 7.6, elapsedDays: 185, daysLeft: 178,
        projectedAt: '2028-01-19T00:00:00+05:30', projectedInDays: 474, slackDays: -296, verdict: 'behind' },
    },
    mission: { target: 1800, achieved: 383, remaining: 1417, pct: 21.3 },
    countdown: { deadline: '2027-03-30T23:59:59+05:30', deadlineTs: Date.parse('2027-03-30T23:59:59+05:30'),
      fyStart: '2026-04-01T00:00:00+05:30', fyStartTs: Date.parse('2026-04-01T00:00:00+05:30'),
      serverNow: Date.now(), nowIso: new Date().toISOString(), ended: false, daysLeft: 178, totalDays: 363, daysElapsed: 185 },
    history: { b2b: { opening: 40, months: [{ m: '2026-04', new: 2, cum: 42 }, { m: '2026-05', new: 5, cum: 47 }, { m: '2026-06', new: 16, cum: 63 }] },
      retail: { opening: 120, months: [{ m: '2026-04', new: 40, cum: 160 }, { m: '2026-05', new: 60, cum: 220 }, { m: '2026-06', new: 100, cum: 320 }] } },
    entries: [{ id: 'fy_abc123', lane: 'retail', count: 20, source: 'Counter register p.4 · Jayal showroom',
      note: 'Week 40 walk-ins', at: '2026-10-01T10:12:00+05:30', by: 'Karan Soni' }],
    sources: { b2b: 'partners collection — rows with status=approved', retail: 'users collection — rows with role=customer',
      manual: 'owner-logged ledger rows below' },
    limits: { maxTarget: 1000000, maxEntry: 1000 },
  });
  const bootAdmin = async (role, payload) => {
    const dom = new JSDOM('<!doctype html><html><body><div id="view"></div></body></html>',
      { runScripts: 'outside-only', pretendToBeVisual: true });
    const w = dom.window;
    w.Shivaa = {
      api: async (url, opts) => {
        if (url.startsWith('/api/admin/fy-targets')) {
          if (role !== 'admin') { const e = new Error('Admin access required'); throw e; }
          if (opts && opts.method === 'POST') return { ok: true, deck: payload };
          return payload;
        }
        return {};
      },
      state: { user: role === 'admin' ? { role: 'admin', name: 'Karan Soni' } : null, settings: {}, productsCache: [], rates: { source: 'live-mcx', gold22: 14300 } },
      toast: () => {}, fmt: n => '₹' + Number(n || 0).toLocaleString('en-IN'), esc,
      safeUrl: u => u, jsArg: v => JSON.stringify(String(v)), openModal: () => {}, closeModal: () => {},
      routes: {}, CATS: { rings: { name: 'Rings' } },
    };
    w.eval(fs.readFileSync(path.join(CMS, 'js/admin.js'), 'utf8'));
    const view = w.document.getElementById('view');
    await w.Shivaa.routes.admin(view, new w.URLSearchParams('tab=fy'));
    return { w, dom, view };
  };

  await test('S10', 'executed: the deck renders — countdown, both lanes, ledger, mission settings', async () => {
    const { w, dom, view } = await bootAdmin('admin', deckPayload());
    try {
      const $ = s => view.querySelector(s);
      assert.ok($('#fyDeck'), 'the deck root rendered');
      assert.ok($('.fy-title').textContent.includes('FY 2026–27 Growth Mission'), 'mission title from the API');
      // both lanes with the owner's numbers
      const lanes = [...view.querySelectorAll('.fy-lane')];
      assert.equal(lanes.length, 2, 'two mission lanes');
      assert.ok(lanes[0].textContent.includes('700') && lanes[0].textContent.includes('B2B Jeweller Partners'));
      assert.ok(lanes[1].textContent.includes('1,100') && lanes[1].textContent.includes('Retail Customers'));
      assert.ok(view.textContent.includes('63') && view.textContent.includes('320'), 'achieved figures drawn');
      assert.equal(view.querySelectorAll('.fy-ring .pr').length, 2, 'a progress ring per lane');
      assert.equal(parseFloat($('.fy-bar i').dataset.w), 9, 'the rail knows its percentage');
      assert.equal($('.fy-ring .pr').getAttribute('data-off'), (326.7256 * (1 - 0.09)).toFixed(1), 'the ring offset matches the lane percentage');
      // countdown cells exist and are ticking
      for (const id of ['fyD', 'fyH', 'fyM', 'fyS']) assert.ok($('#' + id), id + ' cell rendered');
      const before = $('#fyS').textContent;
      assert.ok(/^\d\d$/.test(before), 'seconds shown as two digits, got ' + before);
      await new Promise(r => setTimeout(r, 1150));
      assert.notEqual($('#fyS').textContent, before, 'the countdown is live (seconds moved)');
      assert.ok(/^[0-9,]+$/.test($('#fyD').textContent), 'days left rendered');
      // ledger + its source, and the settings form carries the real targets
      assert.ok(view.textContent.includes('Counter register p.4'), 'the ledger prints the source of every logged count');
      assert.equal(view.querySelector('input[name="b2bTarget"]').value, '700');
      assert.equal(view.querySelector('input[name="retailTarget"]').value, '1100');
      assert.equal(view.querySelector('input[name="deadline"]').value, '2027-03-30');
      // provenance + the growth curve
      assert.ok(view.textContent.includes('partners collection'), 'provenance printed on the deck');
      assert.ok($('.fy-chart'), 'the growth curve rendered');
      assert.ok(view.querySelectorAll('.fy-v').length >= 3, 'verdict chips drawn');
      // handlers are wired for the forms
      assert.ok(w.ShivaaAdmin.fyAddEntry && w.ShivaaAdmin.fyUndoEntry && w.ShivaaAdmin.fySaveTargets);
      assert.ok(view.innerHTML.includes('onsubmit="ShivaaAdmin.fyAddEntry(event)"'), 'the ledger form posts through the handler');
    } finally { dom.window.close(); }
  });

  await test('S11', 'executed: a non-admin session gets the sign-in card, never the deck', async () => {
    const { dom, view } = await bootAdmin('nobody', deckPayload());
    try {
      assert.ok(!view.querySelector('#fyDeck'), 'no deck for a signed-out visitor');
      assert.ok(view.textContent.includes('Authorised staff only'), 'the admin gate is what renders instead');
      assert.ok(!view.textContent.includes('700'), 'and it leaks none of the mission figures');
    } finally { dom.window.close(); }
  });

  console.log(`\nv183 checks: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
