#!/usr/bin/env python3
"""Feature 2 browser checks against isolated PHP + the unchanged store settings.
Positive legal identifiers are only the owner's existing values. Any malformed
or malicious payloads are QA rejection fixtures, never deployed legal data.
Run: python3 qa/test_trust_ui.py (optional PHP_BIN, PHP, BROWSER_BIN).
"""
import asyncio
import copy
import json
import os
from urllib.parse import urlparse, parse_qs
from playwright.async_api import async_playwright, expect
from hallmark_test_support import IsolatedCMS, ROOT

checks = 0


def check(condition, name):
    global checks
    assert condition, name
    checks += 1
    print('PASS:', name)


async def run(server):
    # v105 — the owner confirmed the GSTIN, so it is published like the other
    # identifiers (validated by shape + mod-36 checksum in cms/trust.php).
    expected = {key: server.fixture['settings'][key] for key in ('cin', 'udyam', 'address', 'gstin')}
    async with async_playwright() as pw:
        opts = {'args': ['--no-sandbox', '--disable-dev-shm-usage']}
        if os.environ.get('BROWSER_BIN'):
            opts['executable_path'] = os.environ['BROWSER_BIN']
        browser = await pw.chromium.launch(**opts)
        context = await browser.new_context(viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce')
        page = await context.new_page()
        errors, requests = [], []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('request', lambda request: requests.append(request))
        await page.goto(server.url + '/#/trust?cin=UNCONFIRMED_QA_ONLY', wait_until='networkidle')
        await expect(page.locator('#trustProfile')).to_have_attribute('data-state', 'ready')
        check('Why trust' in await page.locator('.trust-hero h1').inner_text(), 'dedicated Why Trust Shivaa page renders')
        for key, value in expected.items():
            check(await page.locator('#trustValue-' + key).inner_text() == value, 'only the existing ' + key + ' is displayed')
        check('UNCONFIRMED_QA_ONLY' not in await page.locator('#view').inner_text(), 'URL parameters cannot inject business details')
        await expect(page.locator('[data-trust-gstin]')).to_contain_text(expected['gstin'])
        await expect(page.locator('[data-trust-gstin]')).to_contain_text('On record')
        await expect(page.locator('[data-trust-certificates]')).to_contain_text('Not provided')
        check(await page.locator('.trust-documents input, .trust-documents img, .trust-documents [download]').count() == 0, 'no invented certificate image, upload field or placeholder download')
        doc_links = await page.locator('.trust-documents a[target="_blank"]').all()
        check(all(urlparse(await link.get_attribute('href')).netloc == 'services.gst.gov.in' for link in doc_links), 'the only external document link is the official GST portal search')
        check(await page.locator('#trustHeroGstin code').inner_text() == expected['gstin'], 'GSTIN is published prominently in the hero')
        check('not a live government-registry verification' in await page.locator('#trustHeroGstin').inner_text(), 'the hero GSTIN keeps the owner-provided disclosure')
        check(await page.locator('#footGstin code').inner_text() == expected['gstin'], 'the same GSTIN reaches the shared footer')
        check('Owner-provided' in await page.locator('[data-trust-gstin]').inner_text(), 'the GSTIN is labelled owner-provided, not registry-verified')
        check('not live government verification results' in await page.locator('.trust-identity').inner_text(), 'provided identifiers are not labelled government-verified')
        check(await page.locator('.footer .f-stats').count() == 0, 'shared footer no longer presents hard-coded trust counters')
        check('Startup India' not in await page.locator('.footer').inner_text(), 'unprovided registration seal is absent from footer')
        check(expected['cin'] in await page.locator('#trustFooterIdentity').inner_text() and expected['udyam'] in await page.locator('#trustFooterIdentity').inner_text(), 'footer uses the same fetched identifiers')
        check(await page.locator('#trustFooterAddress').inner_text() == expected['address'], 'footer address comes from current settings, not a fallback')
        map_link = await page.locator('.trust-location a[target="_blank"]').get_attribute('href')
        check(urlparse(map_link).netloc == 'www.google.com' and parse_qs(urlparse(map_link).query)['query'] == [expected['address']], 'Maps receives only the recorded address, no invented coordinates')
        for link in await page.locator('.trust-page a[target="_blank"]').all():
            rel = await link.get_attribute('rel')
            check('noopener' in rel and 'noreferrer' in rel and await link.get_attribute('referrerpolicy') == 'no-referrer', 'safe external handoff without referrer')
        trust_requests = [r for r in requests if urlparse(r.url).path == '/api/trust']
        check(trust_requests and all(r.method == 'GET' and r.post_data is None for r in trust_requests), 'profile loading is strictly read-only')
        check(all(urlparse(r.url).netloc == urlparse(server.url).netloc for r in requests), 'no automatic government, Maps or certificate requests')
        check(expected['cin'] not in await page.evaluate('JSON.stringify({...localStorage,...sessionStorage})'), 'business profile is not stored in browser history/cache storage')

        await page.evaluate("Object.defineProperty(navigator, 'clipboard', {configurable:true,value:{writeText:async text=>{window.qaCopied=text;}}})")
        for key, value in expected.items():
            await page.locator(f'[data-trust-copy={key}]').click()
            await expect(page.locator('#trustCopyStatus')).to_contain_text('copied')
            check(await page.evaluate('window.qaCopied') == value, 'copy uses exact ' + key + ', not a verification claim')
        await page.evaluate("Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('denied');}}})")
        await page.locator('[data-trust-copy=cin]').click()
        await expect(page.locator('#trustCopyStatus')).to_contain_text('manually')
        check('copied' not in await page.locator('#trustCopyStatus').inner_text(), 'clipboard failure never claims success')
        for width in (320, 390, 820, 1440):
            await page.set_viewport_size({'width': width, 'height': 900})
            check(not await page.evaluate('document.documentElement.scrollWidth > innerWidth'), f'no horizontal overflow at {width}px')
        (ROOT / 'work').mkdir(exist_ok=True)
        await page.evaluate("window.getSelection().removeAllRanges(); document.activeElement.blur(); window.scrollTo({top:0,behavior:'instant'})")
        await page.evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))')
        await page.screenshot(path=str(ROOT / 'work/trust-desktop.png'), full_page=True)
        await page.set_viewport_size({'width': 390, 'height': 844})
        await page.evaluate("window.scrollTo({top:0,behavior:'instant'})")
        await page.evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))')
        await page.screenshot(path=str(ROOT / 'work/trust-mobile.png'), full_page=True)
        await page.locator('#navToggle').click()
        check(await page.locator('#mainNav a[data-nav=trust]').is_visible(), 'Why Trust Shivaa is reachable from mobile navigation')
        await page.locator('#dwClose').click()
        await page.set_viewport_size({'width': 1440, 'height': 1000})

        # Missing/partial settings have explicit empty states, never fallback IDs.
        db = copy.deepcopy(server.fixture)
        db['settings'].pop('udyam')
        db['settings'].pop('address')
        db['settings'].pop('gstin')
        server.db_file.write_text(json.dumps(db))
        await page.reload(wait_until='networkidle')
        await expect(page.locator('#trustProfile')).to_have_attribute('data-state', 'ready')
        check(await page.locator('#trustValue-cin').inner_text() == expected['cin'] and await page.locator('[data-trust-copy]').count() == 1, 'partial data remains partial without invented completion')
        check(expected['udyam'] not in await page.locator('.footer').inner_text() and expected['address'] not in await page.locator('.footer').inner_text(), 'footer drops details missing from current settings')
        check(expected['gstin'] not in await page.locator('.footer').inner_text() and await page.locator('#footGstin').inner_text() == '', 'footer drops the GSTIN when settings no longer carry it')
        check(await page.locator('[data-trust-gstin]').inner_text().count('Not provided') == 1, 'a missing GSTIN shows the honest empty state')
        db['settings'].pop('cin')
        server.db_file.write_text(json.dumps(db))
        await page.reload(wait_until='networkidle')
        await expect(page.locator('#trustProfile')).to_have_attribute('data-state', 'ready')
        check(await page.locator('[data-trust-copy]').count() == 0 and await page.locator('.trust-location a').count() == 0, 'missing details do not create copy actions or map pins')
        check(expected['cin'] not in await page.locator('#view').inner_text() and expected['cin'] not in await page.locator('.footer').inner_text(), 'missing CIN is not restored from source code or stale browser data')
        server.reset()
        await page.reload(wait_until='networkidle')
        await expect(page.locator('#trustProfile')).to_have_attribute('data-state', 'ready')

        # Corrupt/unapproved data must not be presented as business proof.
        valid = server.request('trust')[1]
        bad_payloads = [
            (200, 'text/html', '<html>unavailable</html>'),
            (200, 'application/json', '{}'),
            (200, 'application/json', json.dumps({**valid, 'registryVerification': {'performed': True, 'checkedAt': 'QA_NOT_REAL'}})),
            (200, 'application/json', json.dumps({**valid, 'gstin': 'UNCONFIRMED_QA_ONLY'})),
            (200, 'application/json', json.dumps({**valid, 'certificates': [{'url': 'https://example.invalid/qa-only.pdf', 'verified': True}]})),
            (503, 'application/json', json.dumps(valid)),
        ]
        for status, content_type, body in bad_payloads:
            async def bad_response(route, request, *, s=status, t=content_type, b=body):
                await route.fulfill(status=s, content_type=t, body=b)
            await page.route('**/api/trust', bad_response)
            await page.reload(wait_until='networkidle')
            await expect(page.locator('#trustProfile')).to_have_attribute('data-state', 'unavailable')
            check(await page.locator('#trustProfile code, #trustProfile [download]').count() == 0, 'malformed/unapproved response cannot become proof: ' + str(status))
            check(expected['cin'] not in await page.locator('#trustFooterIdentity').inner_text(), 'error removes stale footer identifiers')
            check('UNCONFIRMED_QA_ONLY' not in await page.locator('#trustProfile').inner_text(), 'unapproved GSTIN/metadata not exposed by the error state')
            await page.unroute('**/api/trust', bad_response)
        await page.locator('#trustRetry').click()
        await expect(page.locator('#trustProfile')).to_have_attribute('data-state', 'ready')
        check(True, 'retry recovers only when the real profile response returns')

        async def offline(route):
            await route.abort('internetdisconnected')
        await page.route('**/api/trust', offline)
        await page.reload(wait_until='networkidle')
        await expect(page.locator('#trustProfile')).to_have_attribute('data-state', 'unavailable')
        check('temporarily unavailable' in await page.locator('#trustFooterAddress').inner_text(), 'network failure is unavailable, not missing/verified data')
        await page.unroute('**/api/trust', offline)
        await page.locator('#trustRetry').click()
        await expect(page.locator('#trustProfile')).to_have_attribute('data-state', 'ready')

        # A hung request has a bounded timeout and an honest error, not stale data.
        await page.goto(server.url + '/#/compare', wait_until='networkidle')
        hung_entered, hung_release = asyncio.Event(), asyncio.Event()
        async def hung(route):
            hung_entered.set()
            await hung_release.wait()
            try:
                await route.abort()
            except Exception:
                pass
        await page.route('**/api/trust', hung)
        await page.goto(server.url + '/#/trust', wait_until='domcontentloaded')
        await asyncio.wait_for(hung_entered.wait(), 5)
        await expect(page.locator('#trustProfile')).to_have_attribute('data-state', 'unavailable', timeout=10000)
        check(await page.locator('#trustRetry').is_enabled() and expected['cin'] not in await page.locator('#trustFooterIdentity').inner_text(), 'eight-second timeout clears stale footer data and permits retry')
        hung_release.set()
        await page.unroute('**/api/trust', hung)
        await page.locator('#trustRetry').click()
        await expect(page.locator('#trustProfile')).to_have_attribute('data-state', 'ready')

        # Hold a route request, then navigate away: a late response must not
        # replace another page with legal details from the old render.
        await page.goto(server.url + '/#/compare', wait_until='networkidle')
        entered, release = asyncio.Event(), asyncio.Event()
        async def delayed(route):
            response = await route.fetch()
            entered.set()
            await release.wait()
            await route.fulfill(response=response)
        await page.route('**/api/trust', delayed)
        await page.goto(server.url + '/#/trust', wait_until='domcontentloaded')
        await asyncio.wait_for(entered.wait(), 5)
        await page.goto(server.url + '/#/compare', wait_until='domcontentloaded')
        release.set()
        await expect(page.locator('.pcmp-empty')).to_be_visible()
        check(await page.locator('#trustProfile').count() == 0, 'late trust response cannot overwrite a different route')
        await page.unroute('**/api/trust', delayed)

        # Stored text is escaped, including when converted into a Maps query.
        db = copy.deepcopy(server.fixture)
        attack = '<img src=x onerror=alert(1)>'  # malicious QA text, never a real address
        db['settings']['address'] = attack
        server.db_file.write_text(json.dumps(db))
        await page.goto(server.url + '/#/trust', wait_until='networkidle')
        await expect(page.locator('#trustProfile')).to_have_attribute('data-state', 'ready')
        check(await page.locator('#trustValue-address').inner_text() == attack and await page.locator('#trustValue-address img, #trustFooterAddress img').count() == 0, 'untrusted address text is escaped in page and footer')
        href = await page.locator('.trust-location a').get_attribute('href')
        check(urlparse(href).netloc == 'www.google.com' and parse_qs(urlparse(href).query)['query'] == [attack], 'address text cannot change the Maps URL origin')
        server.reset()

        # Related trust entry points and previous features remain usable.
        await page.goto(server.url + '/#/about', wait_until='networkidle')
        check(await page.locator('.trust-about-callout a[href="#/trust"]').count() == 1, 'About links to the evidence-only profile')
        check('Startup India Recognised' not in await page.locator('#view').inner_text(), 'old unprovided registration card removed from About')
        await page.goto(server.url + '/#/product/' + server.ids[0], wait_until='networkidle')
        await expect(page.locator('.trust-pdp-link[href="#/trust"]')).to_be_visible()
        check(True, 'product page exposes business details without claiming certification')
        await expect(page.locator('.hm-product .hm-badge')).to_have_text('HUID not provided')
        await page.goto(server.url + '/#/hallmark', wait_until='networkidle')
        check(await page.locator('#hmForm').count() == 1 and 'not connected' in await page.locator('.hm-connection').inner_text(), 'Feature 1 still correctly reports its connection limit')
        await page.evaluate('ids=>{Shivaa.clearCompare();ids.forEach(id=>Shivaa.toggleCompare(id));}', server.ids[:2])
        shared = await page.evaluate('Shivaa.compareLink(Shivaa.state.compare)')
        await page.goto(shared, wait_until='networkidle')
        await page.reload(wait_until='networkidle')
        await expect(page.locator('.pcmp-card')).to_have_count(2)
        check(True, 'Compare + Shareable Shortlist still restores the same two products')
        check(errors == [], 'no uncaught browser errors: ' + repr(errors))
        await browser.close()


if __name__ == '__main__':
    original = (ROOT / 'cms/data/db.json').read_bytes()
    with IsolatedCMS() as server:
        asyncio.run(run(server))
    assert (ROOT / 'cms/data/db.json').read_bytes() == original, 'Repository DB changed!'
    print(f'\n{checks} trust browser checks passed. Repository DB unchanged.')
