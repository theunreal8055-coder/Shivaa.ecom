# Capturing the phone screenshots

Play will not accept a listing with fewer than **2** phone screenshots, and they
must show the app's real UI. This repository deliberately does not invent them:
`make-graphics.py` refuses to fabricate app screens, so you capture them on a
real phone and the script frames them.

## Capture (5 minutes, on your own Android phone)

1. Open **https://shivaa.in** in Chrome on the phone.
2. For each screen below: scroll to the right place, then take a screenshot
   (Power + Volume down on most phones; on Samsung, palm-swipe also works).
3. Keep the phone in **portrait**. Do not crop, do not add anything — the
   framing script does that.

Capture these six, in this order:

| # | Screen | What to show |
|---|---|---|
| 1 | Home | the opening screen with the hero and a couple of category tiles |
| 2 | A product page | the price breakdown — metal, making charges, stones, GST |
| 3 | Live rates | the rates board |
| 4 | Ring size guide | the true-scale circles |
| 5 | Cart or checkout | the total with the fee lines visible |
| 6 | My orders | an order with its timeline |

If you would rather show the app itself: install the internal-testing build
first (see `CHECKLIST.md` step D/G) and screenshot *that*. Identical UI, and it
is literally what Play's reviewer will see.

## Frame them

Drop the raw captures into `playstore/screenshots/raw/`, then:

```bash
python3 playstore/graphics/make-graphics.py
```

The script writes 1080x1920 PNGs into `playstore/graphics/out/screenshots/`,
each with a caption taken from `captions.json` (edit that file to change the
words) and a quiet Shivaa band top and bottom.

## Upload

Play Console → Store listing → Phone screenshots → upload the framed PNGs
(2 to 8; the order you upload is the order shoppers see).

## If Play rejects a screenshot

The usual reasons, in order: the image is not 16:9 or 9:16; it is under 320px;
it contains a device frame that hides the UI; or the caption claims something
the screen does not show. Re-crop, don't re-write the caption.
