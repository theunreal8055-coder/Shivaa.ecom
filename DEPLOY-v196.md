# v196 — films autoplay again, gold button contrast fixed

Release stamp: **196** (index.html, js/app.js APP_REL, sw.js SHELL/REL, api.php version).
Update file: `shivaa-update-v196.zip` (built by `tools/mega/make-v196-zip.py`, 131 files).

## The home films (the Revolving Case with 4 films in a circle, and the Gold Thread)
Why they stopped (found in `js/v125.js`):
- Any phone or laptop with 4 or fewer CPU cores, or 2 GB of RAM or less, was put in
  "lite" mode. In lite mode the films never play, only still images show. Now only the
  visitor's own Data Saver setting does that.
- A film only started once 35% of it was on screen. It now starts at 15%.
- Muted and inline are now HTML attributes too, which iOS Safari needs for autoplay.
- The Gold Thread lights a chapter only when you scroll past it. The first chapter is
  now always lit, so its film is ready on open.

## Colour and contrast (WCAG 2.x, measured)
- Gold buttons: the text was cream on gold, 2.95:1 (fails). It is now dark ink,
  #2b1a05, 5.38:1 (passes).
- Gold text on the cream background, used for labels: 2.89:1 (fails). The new gold text
  shade, #7a5614, is 6.15:1 on cream and 6.52:1 on white.
- Ghost-button hover text: now the same darker gold.
- Primary (maroon with cream text, 9.54:1), outline (10.36:1), and ghost (7.49:1)
  buttons already pass; unchanged.
- Visible keyboard focus rings on every button and link.

## Not done in this release (be aware)
- Gold text is used in about 130 places across the site. Many sit on dark sections,
  where gold is correct. Changing them blind could break the design. They need a
  visual pass on a real device, page by page.
- Reduced-motion users still see the films as still images. This is deliberate
  (accessibility). Tell me if you want them to play for everyone.
- There is no pause button on the films yet (accessibility rule for moving content
  longer than 5 seconds).
- I could not open the site in a browser here (the browser download is blocked), so the
  films and colours have not been seen on a real device. Please check the home page on
  a phone and a laptop.
- "Check every page, every button": the static check confirms every button's click
  handler points at a real function (all pass). It cannot confirm each button behaves
  correctly on screen.

## Checks
- `v196-check.js`: 12/12. Stamps, load order, the film fixes, the contrast pairs,
  focus rings, and the syntax of the changed files.
- Full `npm test` chain: 238 PASS, exit 0.
