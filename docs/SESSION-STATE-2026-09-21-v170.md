# v170 final state — desktop categories, 21 September 2026

This is the current continuation record. Read before older v169/historical notes.
Work forward; do not restore old releases or repeat completed repairs.

## Source, package and branch

- Active session branch: `arena/01a0c384-shivaa-ecom`.
- Source/test/builder commit: `0b0a7e8a95be970f023c530099234a1acac6e83c`.
- Package/guide commit: `b601c237433ac207e2489cac9d7e6b560864b9d1`.
- **Published and remotely verified:** GitHub contents API matches size/blob;
  authenticated raw download matches the local ZIP byte-for-byte and SHA-256.
- Archive: **shivaa-update-v170.zip**, 19 files, 545,711 bytes.
- SHA-256: `4ec884c4d5f8634a47f3b4112f2d36ff26010cf4b033b3fea48b21920310c60e`.
- Git blob: `b11b77133c99b2e5e3853244d8d5dbcb989b04c7`.
- Permanent download: https://github.com/theunreal8055-coder/Shivaa.ecom/raw/b601c237433ac207e2489cac9d7e6b560864b9d1/shivaa-update-v170.zip
- Installation guide: https://github.com/theunreal8055-coder/Shivaa.ecom/blob/b601c237433ac207e2489cac9d7e6b560864b9d1/DEPLOY-v170.md
- Release **170** across index/app/API/worker/shell URLs; media cache **168**
  deliberately unchanged. No new media or catalogue edits.
- **Not live-deployed or owner-confirmed installed.** GitHub publication is not
  production acceptance. No main merge, hosting workflow or live payment.
- Requires full v165+; cumulative v166–v170 code files. Back up first. Extract
  beside existing index.html/api.php, no extra cms directory. Never install just
  sw.js. No data/uploads/credentials/media/host-managed .htaccess in the ZIP.
- Published v169 ZIP is unchanged (SHA-256 still
  `9ff5aad3856c2efcdf52ec3eddb4b6d7bc04503436017eb39673413dbb0088fb`).

## Actual category findings and repairs

The owner again reported desktop Categories showing tiles but not correctly
opening the selected category; mobile was reported working. Clean v169 Chromium
could navigate the first tile. Do not claim every previous click was broken.
Real browser testing found failures omitted by earlier DOM-only checks:

- Page-animation snapshots clone old checked category/metal controls at body
  level. Shop's document-wide selectors included those controls and retained
  prior products or returned empty results after a new category. Shop-local
  selectors now read/bind only the live view. Animation/design is preserved.
- Desktop fixed menu was inside the sticky backdrop-filter header's containing
  block, extending beyond shorter viewports (bottom 858px on a 768px screen).
  Move menu/backdrop outside the header, constrain height to the available
  viewport, update positioning with header resize/scroll, and scroll internally.
- Both controllers closed on window scroll. Focus/scroll while reaching a tile
  could hide its target before click. Remove scroll-dismiss, preserving outside
  click/backdrop/Escape/navigation/breakpoint dismissal.
- Plain desktop clicks explicitly commit their route before closing. Repeated
  selection has one redraw owner; modifiers/native new tabs are preserved in
  both early-wired and boot-wired paths. Mobile list repeat selection also avoids
  duplicate redraw. Resize clears obsolete menu/drawer states and body locks.
- Labelled category navigation and aria-controls replace incomplete menu-role
  semantics; Escape restores desktop trigger focus. No design replacement.

Changed app files: api.php (release only), index.html, sw.js, css/v116.css,
js/app.js, js/v116.js, js/v117.js (release fallback), js/v118.js, js/v166.js.
The package also retains the previous v169 cumulative files. This is not a new
mass audit or a recount of the historical 140 recorded repairs.

## Verification and limits

- **97/97 real Chromium checks pass on source.** Same final tests on unchanged
  v169: **19 pass / 78 fail**. Actual v170 ZIP extracted over isolated v169 code:
  **97/97 pass**. Cases are not bug counts.
- Browser suite: `tools/mega/smoke/v170-browser.js`; run `npm run test:categories`
  after npm ci and Playwright Chromium installation. Optional
  CHROMIUM_EXECUTABLE_PATH / SMOKE_CMS. Playwright is pinned as a dev dependency.
- Three desktop viewports (1366×768, 1024×600 delayed API, 1920×1080), all 17
  categories, image/text mouse targets, exact result-category lists, old metal
  filter isolation, same route, Enter/Escape, backdrop, back, scroll, resizing,
  Ctrl/middle-click tabs and all three featured menu links. Touch-emulated
  390/768/820px widths check categories, repeated selection and drawer cleanup.
- All browser APIs are generated isolated fixtures. External requests blocked,
  service worker disabled for these interaction tests. Browser suite never reads
  the repository DB. No real gateway/SMS/vendor calls or customer writes.
- Sandbox browser: npm-provided Chromium **153.0.8010.0**, unpacked in scratch
  because the browser CDN was unreachable. Binary/libs/logs stay untracked.
- Existing regression belt: initial run **38 PASS / 16 retired SKIP / 0 FAIL**.
  After final menu refinements, the last full run was **37 PASS / 16 SKIP / 1
  FAIL**: v156-php-run's whole RTGS-object equality differed between two requests.
  Its immediate isolated rerun passed **14/14** without source/test changes.
  Thus all 38 active suites have passing evidence, but do not mislabel the last
  full run as zero-failure. An earlier high-load run also hit v125/cart readiness
  failures; both passed in the last full run. No unrelated tests were weakened.
- Last full run includes v166 **32/32**, v167 **36/36**, v168 boundaries **39/39**,
  PHP signatures **12/12**, v169 pages **25/25**, v169 PHP **28/28**, direct
  checkout **24/24**, v164 PHP **17/17**. No payment flow code changed here.
- ZIP allowlist/integrity, committed-source byte equality, release assertions,
  JS syntax and whitespace pass. Static PHP sweep: **209 routes, 0 exceptions**,
  not 209 executed endpoints.
- Scratch evidence: work/category170/{browser-final.log,baseline-final.log,
  zip-overlay.log,regression-final.log,v156-php-rerun.log}. These are transient;
  reusable browser suite and builder are committed.

## Remaining acceptance

Owner must install the complete update and verify /api/version =170 with matched
stamps, then check the previously affected laptop, shorter/zoomed windows,
category switching after metal filtering, and an older cached tab. Physical
phones, Windows/macOS, Firefox/WebKit and Hostinger were not certified here.
No further redesign, catalogue edits, rollbacks, main merges or live deployment
are authorized by these continuity notes. Retired Truecaller/rejected v126 work
must remain retired. Preserve the approved films and direct Cashfree checkout.
