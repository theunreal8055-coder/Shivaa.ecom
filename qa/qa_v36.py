"""v36 QA — product video gallery + media route (Playwright).
Run: python3 qa_v36.py  (dev server must be on :4010)
"""
import asyncio, sys
from playwright.async_api import async_playwright

URL = 'http://127.0.0.1:4010/'
PDP = URL + '#/product/p_d0bb10b0c4eb'
ok, fail = [], []
def check(name, cond):
    (ok if cond else fail).append(name)
    print(('PASS ' if cond else 'FAIL '), name)

async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        pg = await b.new_page(viewport={'width': 1360, 'height': 900})
        errs = []
        pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(PDP, wait_until='domcontentloaded')
        # wait for gallery, then cancel the 5.2s auto-advance timer (pointerdown, once)
        await pg.wait_for_selector('.gal-wrap', timeout=15000)
        await pg.evaluate("document.querySelector('.gal-wrap').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}))")
        await pg.wait_for_timeout(1200)

        # 1 · video slide present & first
        slides = pg.locator('.gal-track .gal-slide')
        n = await slides.count()
        check(f'gallery has 5 slides (4 imgs + 1 video) — got {n}', n == 5)
        has_video = await pg.locator('.gal-slide.gal-vid video').count() == 1
        check('video element present', has_video)
        if has_video:
            v = pg.locator('.gal-slide.gal-vid video')
            src = await v.get_attribute('src')
            check('video src = /uploads/videos/rings/…', bool(src) and '/uploads/videos/rings/' in src)
            poster = await v.get_attribute('poster')
            check('poster = first image', bool(poster) and '/uploads/designs/rings/' in poster)
            check('video slide has .on (active) first', 'on' in (await pg.locator('.gal-slide.gal-vid').get_attribute('class')))
            tag = await pg.locator('.gal-vid-tag').text_content()
            check('FILM tag visible', 'film' in tag.lower())
        dots = await pg.locator('#galDots span').count()
        check(f'dots = 5 — got {dots}', dots == 5)
        img_slide_1 = await pg.locator('.gal-slide').nth(1).get_attribute('class')
        check('image slide 1 NOT active initially', 'on' not in (img_slide_1 or ''))

        # 2 · nav to image 2, then to last (video) — slide math holds
        await pg.click('.gal-next'); await pg.wait_for_timeout(700)
        cls = await pg.locator('.gal-slide').nth(1).get_attribute('class')
        check('next → image 1 active', 'on' in (cls or ''))
        await pg.click('.gal-prev'); await pg.wait_for_timeout(700)
        cls = await pg.locator('.gal-slide').nth(0).get_attribute('class')
        check('prev → video slide active again', 'on' in (cls or ''))

        # 3 · product card badge on shop
        await pg.goto(URL + '#/shop', wait_until='networkidle'); await pg.wait_for_timeout(1200)
        await pg.evaluate("document.getElementById('searchInput') && (window.locateProduct = true)")
        found = await pg.evaluate("""() => {
          const cards = [...document.querySelectorAll('.p-card')];
          return cards.map(c => ({t: c.textContent, b: !!c.querySelector('.pc-vid-badge')}));
        }""")
        qa = [c for c in found if 'Heritage Polki' in c['t']]
        check(f'QA product visible in shop grid video-badged — {qa}', len(qa) == 1 and qa[0]['b'])

        real_errs = [e for e in errs if 'favicon' not in e.lower()]
        check(f'zero console/page errors ({len(real_errs)})', len(real_errs) == 0)
        for e in real_errs[:6]: print('   console:', e[:140])
        await b.close()
    print(f'\n{len(ok)} passed · {len(fail)} failed')
    sys.exit(1 if fail else 0)

asyncio.run(main())
