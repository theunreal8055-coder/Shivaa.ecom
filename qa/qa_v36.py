"""v42 QA — product gallery is 4 IMAGES and nothing else (Playwright).

Product videos were retired in v42: no <video> slide, no FILM badge, no `video`
key in the product API. This suite locks that in and still checks gallery math.

Run: python3 qa_v36.py  (dev server / preview shim must be on :4010)
"""
import asyncio, sys
from playwright.async_api import async_playwright

URL = 'http://127.0.0.1:4010/'
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

        # 0 · API: no product carries a `video` key, and designs ship exactly 4 images
        await pg.goto(URL, wait_until='domcontentloaded')
        products = await pg.evaluate("""async () =>
            (await (await fetch('/api/products')).json()).products""")
        check(f'products fetched — got {len(products)}', len(products) > 0)
        with_video = [p.get('sku') for p in products if p.get('video')]
        check(f'no product has a `video` key — offenders {with_video}', not with_video)
        designs = [p for p in products if (p.get('images') or [''])[0].startswith('/uploads/designs/')]
        check(f'pipeline designs found — got {len(designs)}', len(designs) > 0)
        bad = [(p.get('sku'), len(p.get('images') or [])) for p in designs if len(p.get('images') or []) != 4]
        check(f'every pipeline design has exactly 4 images — offenders {bad}', not bad)

        # 1 · PDP gallery — 4 image slides, zero video elements
        target = (designs or products)[0]
        print(f'   target PDP: {target.get("sku")} / {target.get("name")}')
        await pg.goto(URL + f'#/product/{target["id"]}', wait_until='domcontentloaded')
        await pg.wait_for_selector('.gal-wrap', timeout=15000)
        await pg.evaluate("document.querySelector('.gal-wrap').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}))")
        await pg.wait_for_timeout(1200)

        slides = pg.locator('.gal-track .gal-slide')
        n = await slides.count()
        check(f'gallery has exactly 4 slides — got {n}', n == 4)
        check('zero <video> elements in the gallery',
              await pg.locator('.gal-track video').count() == 0)
        check('no .gal-vid slide left over',
              await pg.locator('.gal-slide.gal-vid').count() == 0)
        check('every slide is an <img> slide',
              await pg.locator('.gal-slide > img').count() == n)
        first = await slides.nth(0).get_attribute('class')
        check('first image slide is active', 'on' in (first or ''))
        dots = await pg.locator('#galDots span').count()
        check(f'dots = 4 — got {dots}', dots == 4)
        check('no FILM tag in the gallery', await pg.locator('.gal-vid-tag').count() == 0)

        # 2 · nav math still wraps over 4 slides
        await pg.click('.gal-next'); await pg.wait_for_timeout(700)
        check('next → slide 2 active',
              'on' in (await slides.nth(1).get_attribute('class') or ''))
        await pg.click('.gal-prev'); await pg.wait_for_timeout(700)
        check('prev → slide 1 active again',
              'on' in (await slides.nth(0).get_attribute('class') or ''))
        await pg.click('#galDots span:nth-child(4)'); await pg.wait_for_timeout(700)
        check('dot 4 → slide 4 active',
              'on' in (await slides.nth(3).get_attribute('class') or ''))
        await pg.click('.gal-next'); await pg.wait_for_timeout(700)
        check('next on last slide wraps to slide 1',
              'on' in (await slides.nth(0).get_attribute('class') or ''))

        # 3 · shop grid — no FILM badges anywhere
        await pg.goto(URL + '#/shop', wait_until='networkidle'); await pg.wait_for_timeout(1200)
        cards = await pg.evaluate("""() => {
          const cards = [...document.querySelectorAll('.p-card')];
          return {n: cards.length, badged: cards.filter(c => c.querySelector('.pc-vid-badge')).length};
        }""")
        check(f'shop grid rendered — got {cards["n"]} cards', cards['n'] > 0)
        check(f'zero FILM badges on the grid — got {cards["badged"]}', cards['badged'] == 0)

        real_errs = [e for e in errs if 'favicon' not in e.lower()]
        check(f'zero console/page errors ({len(real_errs)})', len(real_errs) == 0)
        for e in real_errs[:6]: print('   console:', e[:140])
        await b.close()
    print(f'\n{len(ok)} passed · {len(fail)} failed')
    sys.exit(1 if fail else 0)

asyncio.run(main())
