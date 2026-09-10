# -*- coding: utf-8 -*-
"""v54 Saathi v3 intents (additive): order tracking, rate-alert setup,
   share-results on WhatsApp, compare-from-chat."""
p = 'cms/js/bot.js'
s = open(p, encoding='utf-8').read()
o = s

def rep(old, new, label):
    global s
    c = s.count(old)
    assert c == 1, f'{label}: count={c}'
    s = s.replace(old, new, 1)
    print('ok:', label)

# ── flow handler: rate-alert sub-flow (inserted at top of flow block) ──
rep("""    if (flow) {
      if (flow.stage === 'occasion') {""",
"""    if (flow) {
      if (flow.stage === 'ratealert') {
        const em = t.match(/[\\w.+-]+@[\\w-]+\\.[\\w.]+/);
        const tg = flow.target || parseInt(t.replace(/\\D+/g, '').slice(0, 7), 10) || null;
        if (em && tg && tg > 100) {
          try {
            await fetch('/api/rates/alert', { method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: em[0], metal: flow.metal, target: tg }) });
            push('bot', 'Done ✦ I’ll email <b class="g">' + esc(em[0]) + '</b> the moment ' + (flow.metal === 'silver' ? 'silver' : '22K gold') + ' touches <b class="g">' + inr(tg) + '/g</b>.');
          } catch (e) { push('bot', 'That alert didn’t register — try once more, or ask a human to note it.'); }
          flow = null; return;
        }
        push('bot', !em ? 'Which email should the alert go to?' : 'And the target price per gram? (e.g. “9500”)');
        return;
      }
      if (flow.stage === 'occasion') {""", 'ratealert flow')

# ── new intents before the policy loop ──
rep("""    for (const [key, rx] of [['ship', /(ship|deliver|courier|tracking)/],""",
"""    /* v54: order tracking — real data, real account */
    if (/(track my order|where is my order|order status|my order|track order)/.test(t)) {
      const A = S().api;
      if (!A) { push('bot', 'Sign in on the site first, then ask me again — I’ll pull your live order status right here.'); return; }
      try {
        const r = await A('/api/orders');
        const os = (r && r.orders) || [];
        if (!os.length) { push('bot', 'No orders on your account yet. When you order, just ask <b class="g">“where is my order?”</b> — I’ll fetch the live status.'); chips(['Choose for me', 'Show the signature rings']); return; }
        const oo = os[0];
        push('bot', 'Your latest order <b class="g">' + esc(oo.id || '') + '</b> — status: <b class="g">' + esc(oo.status || 'placed') + '</b>' + (oo.total ? ' · ' + inr(oo.total) : '') + '. Everything ships tamper-sealed and insured; the tracking number reaches you on WhatsApp/SMS the moment the courier picks up.' + moreBtn('#/track', 'Open the full tracker →'));
      } catch (e) { push('bot', 'I couldn’t reach your orders — are you signed in? The tracker page works too.' + moreBtn('#/track', 'Open the tracker →')); }
      return;
    }
    /* v54: rate alerts — "alert me when 22k drops below 9500" */
    if (/(alert|notify|remind).*(rate|gold|silver|22k|24k)|(rate|gold|silver).*(alert|drop|fall)/.test(t)) {
      const digits = parseInt(t.replace(/\\D+/g, '').slice(0, 7), 10);
      flow = { stage: 'ratealert', metal: /silver/.test(t) ? 'silver' : 'gold22', target: (digits > 100 ? digits : null) };
      push('bot', 'Smart move ✦ I’ll watch the Jaipur feed for you. ' + (flow.target ? 'Target <b class="g">' + inr(flow.target) + '/g</b> — ' : '') + 'which email should the alert go to?');
      return;
    }
    /* v54: compare straight from chat — "compare 1 and 2" */
    if (/compare/.test(t) && ctx.last.length >= 2) {
      const TC = S().toggleCompare;
      if (TC) { TC(ctx.last[0]); TC(ctx.last[1]); location.hash = '#/compare'; if (innerWidth < 1024) close(); }
      else push('bot', 'Open the two pieces and use ⇄ — the compare tray is in the menu.');
      return;
    }
    for (const [key, rx] of [['ship', /(ship|deliver|courier|tracking)/],""", 'new v54 intents')

# ── share button under recommendations ──
rep("""    push('bot', '', cardRow(top.map((x) => x.p), true) + feedback());
    chips(['Cheaper', 'More like this', 'Talk to a human', "Today's gold rate"]);""",
"""    push('bot', '', cardRow(top.map((x) => x.p), true) + moreBtn('#shareResults', '📤 Share these picks on WhatsApp') + feedback());
    chips(['Cheaper', 'More like this', 'Compare 1 and 2', "Today's gold rate"]);""", 'share button on recommendations')

# ── share handler in bind() ──
rep("""    $$('.sa-more[data-h]').forEach((b) => { if (b.dataset.bound) return; b.dataset.bound = 1; b.onclick = () => { location.hash = b.dataset.h; if (innerWidth < 1024) close(); }; });""",
"""    $$('.sa-more[data-h]').forEach((b) => {
      if (b.dataset.bound) return; b.dataset.bound = 1;
      b.onclick = () => {
        if (b.dataset.h === '#shareResults') {
          const picks = ctx.last.slice(0, 3).map((id) => { const pr = products.find((x) => x.id === id); return pr ? '✦ ' + pr.name + ' — ' + inr(priceOf(pr)) : null; }).filter(Boolean).join('\\n');
          window.open((S().waLink ? S().waLink('Look what Saathi at Shivaa picked for me 💛\\n' + picks + '\\n\\nshivaa.in') : 'https://wa.me/918905005921'), '_blank');
          return;
        }
        location.hash = b.dataset.h; if (innerWidth < 1024) close();
      };
    });""", 'share handler')

# ── expose order/alert intents to the test hooks ──
rep("window.Saathi = { open, close, _test: { budgetOf, findCat, findOcc, tokens, scoreSearch, isHi, HI_WORD } };",
    "window.Saathi = { open, close, _test: { budgetOf, findCat, findOcc, tokens, scoreSearch, isHi, HI_WORD, priceOf } };", 'test hook + priceOf')

open(p, 'w', encoding='utf-8').write(s)
print('bot.js v54 patched:', s != o)
