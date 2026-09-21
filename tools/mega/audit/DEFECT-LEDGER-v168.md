# Shivaa specialist audit — continuation, v168

**Date:** 21 September 2026  
**Branch:** `arena/01a0c31d-shivaa-ecom`  
**Starting commit:** `5b0c3808dc87e0aa6772c5dab213586d9db192d7` (merged v167)  
**Status:** fixed in this branch; **not deployed or live-verified**.

## Count and evidence

The previous ledger records **64 fixed defects in v167**. This continuation adds
**40 fixes**, for **104 cumulatively recorded fixes**. This is **not a claim of
100 newly discovered bugs in this session**, or that the website is now bug-free.
The 12 old “OPEN” rows are NOT automatically counted as fixes.

The new gate executes production functions and the production worker using
isolated DOM, network, storage and cache fixtures. On the original v167 files,
**all 39 N01–N39 checks fail**; on v168 **39/39 pass**. These are 39 defect checks,
not 39 independent full-browser journeys. Configuration/font/manifest checks
are source/file checks, not native Apache, visual or installed-PWA tests.
N40 executes the actual PHP signature-validation block: **9/12 cases pass before,
12/12 after**. Its three failing inputs represent **one format-validation defect**,
not three bugs.

No live order, payment, message, supplier record, image, credential, database or
customer data was created/edited by this audit. Payment tests use labelled QA
fixtures, never a real gateway. Existing design and owner-approved films remain.

## New fixed findings

Each ID maps to a named test in `tools/mega/smoke/v168-check.js`; N40 maps to
`v168-php-run.js`. “Before” below is also the regression input.

| ID | Area / before | Repair |
|---|---|---|
| N01 | `.htaccess` contained `<!-- ... -->` HTML comments, invalid Apache configuration syntax when `mod_headers` is active. | Convert only those comments to Apache `#` comments; leave host rules unchanged. Native Hostinger validation still required. |
| N02 | A failed localStorage write updated memory, but the next read returned the OLD disk value; cart/session changes could appear undone. | Mark failed-write keys as volatile; read the latest in-memory value until persistence succeeds. |
| N03 | Valid JSON such as `null`, an object, or arrays with null cart lines crashed array/row operations during boot. | Validate cart container and each line, preserving valid lines. |
| N04 | Stored quantities such as `"2"`, negatives, fractions and values over 99 produced concatenated counts or totals differing from server limits. | Normalize finite positive integer quantities to the backend's 1–99 bound. |
| N05 | Null/non-array wishlist data broke badges and `.includes`; duplicates inflated counts. | Read a deduplicated string-ID list. |
| N06 | Saved-for-later read unchecked rows and bypassed the safe store; with storage blocked, moving a piece out of the bag could lose the saved copy. | Validate rows and use the same memory-backed storage for reads/writes. |
| N07 | Null/non-string recent searches crashed `.filter`/`.toLowerCase` when reopening search. | Validate and limit the search history list. |
| N08 | HTTP 200 HTML, null or non-object API bodies were accepted as success; null error bodies threw before preserving HTTP status. | Reject malformed success payloads with retry guidance; normalize error bodies while retaining status. |
| N09 | API timeout was cleared as soon as headers arrived; a hanging JSON body could leave checkout/boot pending forever. | Keep a bounded deadline through body parsing, even when a transport ignores abort. |
| N10 | API replaced the caller's AbortSignal, so cancelled requests still ran; cancellations could be mislabeled “offline”. | Link caller abort to the internal controller, clean listeners, distinguish cancellation from network loss. |
| N11 | `api()` overwrote caller headers, silently dropping custom request metadata. | Merge object/tuple/Headers inputs; retain authentication and let the browser set multipart boundaries. |
| N12 | A late 401 from an old session cleared a NEW login token and user. | Clear a rejected session only if the current token equals the request's captured token. |
| N13 | Calling `openModal()` twice took two scroll locks; one close left the page stuck. | Modal owns at most one lock, including content replacement. |
| N14 | `closeModal()` on an already-closed modal consumed a cart/other sheet's scroll lock. | Unlock only when this modal acquired the lock. |
| N15 | Heading-free modal content still removed the dialog's accessible name. | Keep a generic fallback name when there is no heading. |
| N16 | Synchronous route errors bypassed the promise-only recovery UI. | Feed synchronous failures through the same retry/error renderer. |
| N17 | A rejected old route request painted its error OVER a newer page. | Guard error rendering with the current navigation generation. This does not purport to cancel every asynchronous page success. |
| N18 | Lazy staff load checked `admin?tab=orders` against `admin`, so query-bearing links remained on “Opening the staff panel”. | Replay the still-current navigation, including its query. |
| N19 | Failed staff-bundle loading painted “did not load” after the visitor had left the staff route. | Discard stale staff-load failures. |
| N20 | Splitting a route on every `?` truncated queries such as `q=why?gold`. | Split only on the first question mark. |
| N21 | `#/toString` and other inherited object-property names were treated as registered routes. | Null-prototype route table and own-property checks for route/staff dispatch. |
| N22 | The label-repair pass gave a SECOND already-labelled field its neighbour's `aria-label`, overriding the correct name. | Respect native `control.labels` before adding any name. |
| N23 | A block with an existing `for=` label skipped the entire repair, leaving its companion range slider unnamed. | Process unnamed companion controls even when the primary pairing exists. |
| N24 | Placeholder-only controls were deliberately skipped; their prompt disappeared when populated and was not a stable accessible label. | Preserve their existing prompt as an explicit accessible name. |
| N25 | Worker activate/purge and the page's cache purge deleted ALL origin caches, including unrelated applications. | Delete only Shivaa shell/media cache namespaces. |
| N26 | Worker image branch cached KYC/payment-proof uploads; general GET branch also cached PHP utility pages. | Cache only known public assets; private uploads and PHP utilities bypass offline storage. This is NOT a server-side access-control fix. |
| N27 | Every successful same-origin GET/query variant could grow the shell cache without a bound. | Allowlist shell assets and normalize root navigation cache keys. |
| N28 | An image URL answered with the SPA's HTTP 200 HTML was stored as an image. | Require an image MIME type before caching media. |
| N29 | Media TTL was checked only after cache writes; an expired image was still immediately returned, especially offline. | Check MIME/age BEFORE serving a hit; use insertion timestamps and reject expired/undated entries. |
| N30 | Background media writes had no FetchEvent lifetime extension; the browser could terminate the worker after a cache hit. | Register refresh/write promises with `waitUntil` during dispatch. |
| N31 | A CacheStorage read/open error prevented even an online image from loading; failed writes could reject without handling. | Storage is optional; network responses survive cache failures/quota limits. |
| N32 | Cold offline navigation with no cached shell resolved `respondWith` to `undefined`. | Always return a real fallback document or explicit HTTP 503 Response. |
| N33 | Cached rates/catalogue API bodies were replayed as successful API responses, including authenticated requests; the client could mistake stale answers for live connectivity. | Keep API traffic network-only. Preserve the application's existing explicitly-labelled last-good catalogue fallback. |
| N34 | `--font-serif` and `--sans` were used but never declared, dropping fonts/shorthands to unintended defaults. | Alias them to the existing display/body font tokens. No redesign. |
| N35 | Installed-PWA metadata still advertised retired Jaipur rate branding; legacy manifest disagreed and had obsolete icon configuration. | Use current Shivaa branding and align both manifests with the existing icon set. |
| N36 | Printable invoice omitted coupon discount and COD fee even though saved grand totals included both. | Show the stored adjustments; never recalculate the grand total or mutate the order. |
| N37 | Printable invoice interpolated GST text, invoice identifiers and order IDs into HTML without escaping. | Escape these values before writing the print document. |
| N38 | A blocked invoice popup returned null, then crashed on `w.document`. | Show “Allow pop-ups to print the invoice” and return safely. |
| N39 | Invoice footer claimed GST applied only to making charges, contrary to the backend's saved taxable calculation. | Remove the incorrect blanket claim; retain stored tax figures and require place-of-supply confirmation. No tax-law/compliance certification is claimed. |
| N40 | Upload endpoint advertised WebM but required MP4 `ftyp`; it also accepted JPEG bytes under a PNG extension. | Match each accepted extension to its advertised file signature, including WebM/EBML. Header checking alone is NOT full media decoding. |

## Historical open-row triage (not additional fixed defects)

- **v167 #65:** re-reading `printInvoice` does NOT establish a wrong grand total.
  It already renders `o.total`; the unused accumulators were dead code. Removed
  during N36–N39, but **not counted as another bug**. The actual omissions are N36.
- **#66 / #68 / #69:** lint warnings/dead code are not automatically observable
  bugs. No claim they were reproduced or fixed here.
- **#67:** the shown aurum loop callbacks are inside immediate IIFEs; a loop
  closure lint warning alone does not demonstrate wrong particle ownership.
- **#70:** font issue now fixed as N34 (it was not in the previous FIXED count).
- **#71:** empty category tiles are the owner's explicit v115 design; do NOT
  hide approved categories merely because they currently have no inventory.
- **#72:** a write-only data attribute is not by itself a customer defect.
- **#73:** v167 already scans the document globally; there is no admin exclusion.
  N22/N23 fix specific label errors. No claim to have manually audited 94 admin fields.
- **#74:** static sitemap is stale, but `.htaccess` routes `/sitemap.xml` to the
  generator. Do not claim the obsolete static route is served by production.
- **#75:** metadata consistency handled under N35.
- **#76:** old broad `smoke.js` still assumes the retired try-on feature. It is
  not part of this release belt; modern feature-specific gates are used instead.

## Verification and reproducibility

```bash
cd tools/mega/smoke
npm ci --no-audit --no-fund
npm test                 # N01–N39 + executed PHP N40
npm run test:regression   # active and retired-era suites, explicit PASS/SKIP/FAIL
cd ../../..
node tools/mega/php-sweep/sweep.mjs
```

- Full regression belt: **36 active suites PASS, 16 retired-feature suites SKIP,
  0 FAIL** (including the mandatory v113b gate). Skips are not counted as passes.
- New boundaries: **39/39**, real PHP upload signatures: **12/12**.
- v167 compatibility: **36/36**; v166 recovery/update controls: **32/32**.
- v155 checkout: **24/24** after fixing its test-only boot race. The identical
  updated harness also passes **24/24 on the original v167 code**. Previously it
  waited only for catalogue length; campaign studs exist before settings arrive.
  It now waits for settings AND a real fixture product, and closes each jsdom.
- Four old suites pinned MEDIA=v120. Their checks now accept a forward generation;
  v168's intentional media purge removes formerly cached private/poisoned entries.
  The new gate directly checks the cache-privacy behavior these pins could not test.
- PHP static inventory: **209 routes / 0 targeted TypeError findings**. This is
  not a claim of executing all 209 routes. PHP parser and existing executed PHP
  payment/catalogue gates are separate checks.
- Source DB unchanged: **77 PGS-prefixed rows, all with four images**. Historical
  “exactly 65 catalogue rows” is stale. `demo65/status.py` reports **65/65 crops,
  260/260 shots, 65/65 metadata, 0/65 videos** in this checkout; do not invent a
  completed film count or start media generation as part of this audit.
- Negative control: set `SMOKE_CMS` to an isolated v167 `cms` tree and run the new
  gates. Expect 0/39 boundary checks, 9/12 signature cases. On that intentionally
  broken worker, Node may additionally report the old unhandled cache rejection.
- Logs are regenerable under ignored `work/audit168/`; all actual test programs
  and this evidence ledger are tracked. No handoff depends on scratch files.

## Still requires owner/production confirmation

1. Hostinger Apache/LiteSpeed parsing and the currently installed release.
2. Android/iOS installed-PWA update and real browser worker eviction behavior.
3. A genuine paid Cashfree journey and the MID transaction-limit setting. None
   of these fixes can raise the merchant's gateway limit.
4. Printed tax layout and interstate/intrastate tax presentation with the CA.
5. Broad visual/device/accessibility testing; jsdom is not a rendering engine.
6. Individual async page-success handlers can still require cancellation guards;
   this release specifically prevents stale route/staff ERROR replacements.

No PR merge, production upload, credential change or live payment was performed.
