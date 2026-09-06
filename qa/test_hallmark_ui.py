#!/usr/bin/env python3
"""Feature 1 browser regressions + existing compare/shareable-shortlist smoke.
Uses the actual PHP API with an isolated DB. TST… codes and session tokens are
SYNTHETIC QA FIXTURES, never published or presented as genuine BIS records.

Run: python3 qa/test_hallmark_ui.py
Requires playwright + Chromium. Optional PHP_BIN, PHP, BROWSER_BIN environment.
"""
import asyncio
import json
import os
from playwright.async_api import async_playwright, expect
from hallmark_test_support import IsolatedCMS, ROOT, ADMIN_TOKEN, ENTRY

checks = 0


def check(condition, name):
    global checks
    assert condition, name
    checks += 1
    print('PASS:', name)


async def run(server):
    async with async_playwright() as pw:
        options = {'args': ['--no-sandbox', '--disable-dev-shm-usage']}
        if os.environ.get('BROWSER_BIN'):
            options['executable_path'] = os.environ['BROWSER_BIN']
        browser = await pw.chromium.launch(**options)
        context = await browser.new_context(viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce')
        page = await context.new_page()
        errors, lookups = [], []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('request', lambda req: lookups.append(req) if '/api/hallmark/lookup' in req.url else None)
        await page.goto(server.url + '/#/hallmark?huid=TST0A1', wait_until='networkidle')
        await expect(page.locator('#hmForm')).to_be_visible()
        check(await page.locator('#hmHuid').input_value() == '', 'URL codes are not trusted or auto-submitted')
        check(len(lookups) == 0 and await page.locator('#hmResult').is_hidden(), 'no automatic lookup or manufactured initial result')
        check('not connected' in await page.locator('.hm-connection').inner_text(), 'availability limit visible before entry')
        for link in await page.locator('.hm-page a[target="_blank"]').all():
            href, rel = await link.get_attribute('href'), await link.get_attribute('rel')
            check(href.startswith(('https://www.bis.gov.in/', 'https://play.google.com/', 'https://apps.apple.com/')) and 'noreferrer' in rel and 'TST0A1' not in href, 'official handoff without code or referrer')
        for code in ('', 'TST01', 'TST0A12', 'TST 01', 'TST-01', '<svg/>', 'ＴST0A1', 'TSTß1'):
            await page.locator('#hmHuid').fill(code)
            await page.locator('#hmSubmit').click()
            await expect(page.locator('#hmInputError')).to_be_visible()
            check(await page.locator('#hmHuid').get_attribute('aria-invalid') == 'true', 'invalid format remains an input error: ' + repr(code))
        check(len(lookups) == 0, 'invalid input never calls BIS or the lookup API')

        await page.locator('#hmHuid').fill(' tst0a1 ')
        await page.locator('#hmSubmit').click()
        await expect(page.locator('#hmResultTitle')).to_have_text('Format accepted · NOT verified')
        check(await page.locator('#hmHuid').input_value() == 'TST0A1', 'ASCII normalisation is explicit, never silent repair')
        check(json.loads(lookups[-1].post_data) == {'huid': 'TST0A1'} and lookups[-1].method == 'POST', 'only the entered code goes in a POST body')
        check('TST0A1' not in lookups[-1].url, 'no HUID in API URLs')
        await page.evaluate("Object.defineProperty(navigator, 'clipboard', {configurable:true, value:{writeText:async text => {window.qaCopied = text;}}})")
        await page.locator('#hmCopy').click()
        await expect(page.locator('#hmCopyStatus')).to_contain_text('HUID copied')
        check(await page.evaluate('window.qaCopied') == 'TST0A1', 'copy contains only the code, no certification text')
        await page.evaluate("Object.defineProperty(navigator, 'clipboard', {configurable:true, value:{writeText:async () => {throw Error('denied');}}})")
        await page.locator('#hmCopy').click()
        await expect(page.locator('#hmCopyStatus')).to_contain_text('copy it manually')
        check('copied' not in (await page.locator('#hmCopyStatus').inner_text()).lower(), 'clipboard failure never claims success')
        await page.locator('#hmHuid').fill('TST0A2')
        check(await page.locator('#hmResult').is_hidden() and await page.locator('#hmCopy').is_hidden(), 'editing clears old result and old copy target immediately')
        await page.locator('#hmClear').click()
        check(await page.locator('#hmHuid').input_value() == '' and await page.locator('#hmCopyStatus').inner_text() == '', 'clear resets all entry state')
        check('TST0A1' not in await page.evaluate('JSON.stringify({...localStorage,...sessionStorage})'), 'no lookup history stored')

        # Deliberately forged/malformed/upstream-failure responses must fail closed.
        fake_responses = [
            (200, 'text/html', '<html>not JSON</html>'),
            (200, 'application/json', json.dumps({'verified': True, 'record': {'purity': 'FAKE'}})),
            (503, 'application/json', json.dumps({'status': 'unavailable', 'reason': 'not_connected', 'huid': 'TST0A1', 'formatValid': True, 'verified': True, 'record': None, 'checkedAt': None})),
            (404, 'application/json', json.dumps({'error': 'Not found'})),
        ]
        for status, content_type, body in fake_responses:
            async def fake(route, request, *, s=status, t=content_type, b=body):
                await route.fulfill(status=s, content_type=t, body=b)
            await page.route('**/api/hallmark/lookup', fake)
            await page.locator('#hmHuid').fill('TST0A1')
            await page.locator('#hmSubmit').click()
            await expect(page.locator('#hmResultTitle')).to_have_text('Verification unavailable · no result')
            check(await page.locator('#hmCopy').is_hidden() and 'FAKE' not in await page.locator('#view').inner_text(), 'malformed/forged response cannot become proof: ' + str(status))
            await page.unroute('**/api/hallmark/lookup', fake)

        async def offline(route):
            await route.abort('internetdisconnected')
        await page.route('**/api/hallmark/lookup', offline)
        await page.locator('#hmSubmit').click()
        await expect(page.locator('#hmResultTitle')).to_have_text('Verification unavailable · no result')
        check(await page.locator('#hmSubmit').is_enabled(), 'network error is recoverable and never a not-found result')
        await page.unroute('**/api/hallmark/lookup', offline)

        # Hold a real response, change the input and complete a newer request.
        entered, release = asyncio.Event(), asyncio.Event()
        async def delayed(route):
            if json.loads(route.request.post_data)['huid'] == 'TST0A1':
                response = await route.fetch()
                entered.set()
                await release.wait()
                try:
                    await route.fulfill(response=response)
                except Exception:  # expected when AbortController cancelled it
                    pass
            else:
                await route.continue_()
        await page.route('**/api/hallmark/lookup', delayed)
        await page.locator('#hmHuid').fill('TST0A1')
        await page.locator('#hmSubmit').click()
        await asyncio.wait_for(entered.wait(), 10)
        await page.locator('#hmHuid').fill('TST0A2')
        await page.locator('#hmSubmit').click()
        await expect(page.locator('#hmResultTitle')).to_have_text('Format accepted · NOT verified')
        release.set()
        await expect(page.locator('#hmResultText')).to_contain_text('TST0A2')
        check('TST0A1' not in await page.locator('#hmResultText').inner_text(), 'stale response cannot overwrite a newer code')
        await page.unroute('**/api/hallmark/lookup', delayed)

        # A hung service must time out, not leave a permanent busy/verified UI.
        hung_started, hung_release = asyncio.Event(), asyncio.Event()
        async def hung(route):
            hung_started.set()
            await hung_release.wait()
            try:
                await route.abort()
            except Exception:
                pass
        await page.route('**/api/hallmark/lookup', hung)
        await page.locator('#hmHuid').fill('TST0A1')
        await page.locator('#hmSubmit').click()
        await asyncio.wait_for(hung_started.wait(), 5)
        await expect(page.locator('#hmResultTitle')).to_have_text('Verification unavailable · no result', timeout=10000)
        check(await page.locator('#hmSubmit').is_enabled(), 'eight-second timeout releases the form without a verification result')
        hung_release.set()
        await page.unroute('**/api/hallmark/lookup', hung)

        # Leaving the route aborts a pending check and must not overwrite another page.
        entered, release = asyncio.Event(), asyncio.Event()
        await page.route('**/api/hallmark/lookup', delayed)
        await page.locator('#hmSubmit').click()
        await asyncio.wait_for(entered.wait(), 5)
        await page.goto(server.url + '/#/compare', wait_until='domcontentloaded')
        release.set()
        await expect(page.locator('.pcmp-empty')).to_be_visible()
        check(await page.locator('#hmResult').count() == 0, 'late lookup result cannot render after navigation')
        await page.unroute('**/api/hallmark/lookup', delayed)
        await page.goto(server.url + '/#/hallmark', wait_until='networkidle')
        check(await page.locator('#hmHuid').input_value() == '', 'navigation does not retain the previous HUID')

        for width in (320, 390, 820, 1440):
            await page.set_viewport_size({'width': width, 'height': 900})
            check(not await page.evaluate('document.documentElement.scrollWidth > innerWidth'), f'no horizontal overflow at {width}px')

        pid, other = server.ids[:2]
        await page.goto(server.url + '/#/product/' + pid, wait_until='networkidle')
        await expect(page.locator('.hm-product .hm-badge')).to_have_text('HUID not provided')
        check('BIS Hallmarked' not in await page.locator('.pd-perks').inner_text(), 'PDP does not claim unprovided hallmark verification')
        check('huid check guide' in (await page.locator('.pd-stamp').inner_text()).lower(), 'gallery stamp is a guide link, not a certification seal')
        check('Certified stones' not in await page.locator('.pd-perks').inner_text(), 'PDP does not fabricate stone certification')

        # Real admin save flow, on the temporary QA DB only.
        await page.evaluate('(token) => localStorage.setItem("shv_token", JSON.stringify(token))', ADMIN_TOKEN)
        await page.goto(server.url + '/#/admin?tab=products', wait_until='networkidle')
        await page.reload(wait_until='networkidle')
        async def bad_admin_read(route):
            await route.fulfill(status=200, content_type='application/json', body='{}')
        await page.route('**/api/admin/products/*/hallmark', bad_admin_read)
        await page.get_by_role('button', name='HUIDs', exact=True).first.click()
        await expect(page.locator('.toast-wrap')).to_contain_text('No changes were made')
        check(await page.locator('#hmEditor').count() == 0, 'malformed admin data does not create an editable empty replacement')
        await page.unroute('**/api/admin/products/*/hallmark', bad_admin_read)
        await page.get_by_role('button', name='HUIDs', exact=True).first.click()
        await expect(page.locator('#hmEditor')).to_be_visible()
        check(await page.locator('.hm-editor-row').count() == 0, 'staff editor starts with no invented HUID rows')
        await page.locator('#hmAddRow').click()
        await page.get_by_role('button', name='Save staff records').click()
        await expect(page.locator('#hmEditorError')).to_be_visible()
        await page.locator('#hmEditor [name=huid]').fill('TST0A1')
        await page.locator('#hmEditor [name=pieceLabel]').fill('QA <img src=x onerror=alert(1)> piece')
        await page.locator('#hmEditor [name=sourceNote]').fill(ENTRY['sourceNote'])
        async def bad_admin_save(route):
            await route.fulfill(status=200, content_type='application/json', body='{}')
        await page.route('**/api/admin/products/*/hallmark', bad_admin_save)
        await page.get_by_role('button', name='Save staff records').click()
        await expect(page.locator('#hmEditorError')).to_contain_text('save response could not be confirmed')
        check(await page.locator('#hmEditor [name=huid]').input_value() == 'TST0A1', 'unconfirmed save keeps the staff entry and does not claim success')
        await page.unroute('**/api/admin/products/*/hallmark', bad_admin_save)
        await page.get_by_role('button', name='Save staff records').click()
        await expect(page.locator('#modalOverlay')).not_to_have_class('modal-overlay open')
        check(any(e['huid'] == 'TST0A1' for e in server.request(f'admin/products/{pid}/hallmark', token=ADMIN_TOKEN)[1]['hallmark']['entries']), 'staff form persists only the explicit reference')
        await page.goto(server.url + '/#/hallmark?product=' + pid, wait_until='networkidle')
        await expect(page.locator('.hm-product .hm-badge')).to_have_text('Recorded · not verified')
        check(ENTRY['sourceNote'] not in await page.locator('#view').inner_text(), 'private source note not shown to shoppers')
        check(await page.locator('.hm-records img').count() == 0 and '<img src=x' in await page.locator('.hm-records').inner_text(), 'piece labels are escaped, not executable markup')
        before = len(lookups)
        await page.locator('[data-hm-use]').click()
        check(await page.locator('#hmHuid').input_value() == 'TST0A1' and len(lookups) == before, 'choosing a staff reference only fills the form')
        await page.locator('#hmSubmit').click()
        await expect(page.locator('#hmResultTitle')).to_have_text('Format accepted · NOT verified')
        check('No BIS record has been retrieved here' in await page.locator('#hmResultText').inner_text(), 'even a catalogue match cannot become a BIS result')

        # Preserve Feature 13: selection, comparison, share URL and reload.
        await page.evaluate('ids => {Shivaa.clearCompare(); ids.forEach(id => Shivaa.toggleCompare(id));}', [pid, other])
        await page.goto(server.url + '/#/compare', wait_until='networkidle')
        await expect(page.locator('.pcmp-table')).to_be_visible()
        check(await page.locator('.pcmp-card').count() == 2, 'existing compare displays both selected products')
        shared = await page.evaluate('Shivaa.compareLink(Shivaa.state.compare)')
        check('?ids=' in shared and pid in shared and other in shared and 'TST0A1' not in shared, 'shortlist link still shares product IDs, not private HUID data')
        await page.evaluate('localStorage.removeItem("shv_compare")')
        await page.goto(shared, wait_until='networkidle')
        await page.reload(wait_until='networkidle')
        await expect(page.locator('.pcmp-card')).to_have_count(2)
        check(True, 'shareable shortlist restores after reload')
        check(errors == [], 'no uncaught browser errors: ' + repr(errors))
        await browser.close()


if __name__ == '__main__':
    original = (ROOT / 'cms/data/db.json').read_bytes()
    with IsolatedCMS() as server:
        asyncio.run(run(server))
    assert original == (ROOT / 'cms/data/db.json').read_bytes(), 'Repository DB changed!'
    print(f'\n{checks} browser checks passed. Repository DB unchanged.')
