# HANDOFF NEXT — v187 KYC privacy candidate (2 Oct 2026)

## Current state

- Work remains on fixed branch `arena/01a0f602-shivaa-ecom`, HEAD `b2c05f3` at handoff time. v187 source/tests/docs/package are **uncommitted**. No branch switch, commit, push, staging or production deployment was performed.
- A safe public GET of `https://shivaa.in/api/version` on 2 Oct 2026 confirmed live v186: `rel:186`, shell `shivaa-shell-v186`, `builtAt:2026-10-02T08:02:12+05:30`, matched index/app/SW stamps, MySQL mode, 78 SQL/JSON rows, `mirrorBehind:false`. That is only a release handshake; no KYC document, live auth, or owner data was probed.
- Selected highest-priority confirmed local audit issue: **S12 KYC business-card privacy**, provisional **Medium**. Pre-fix source/config showed card documents stored below the public document root, passive file extensions not blocked by the KYC rules, and direct admin links/images. This was not a demonstrated live leak.
- Candidate remediation: private sibling storage, strict 0700/0600 permissions and fail-closed path validation; proof/size/signature checks before persistence; blanket web denial for the legacy KYC directory; record-bound admin-token-only stream; admin UI blob viewer; verified legacy copy → DB save → old-file deletion migration. No malware scanner is included.
- Campaign, brand, logo, theme, color, font, layout, and button styling are protected/unchanged.

## Package and inventory

- `shivaa-update-v187.zip`: six-entry incremental overlay on v186 for the `public_html` root; **459,919 bytes**, SHA-256 `50a1df1247006c71b51c523d41037c9e12f0abd665773041e9b49668359054ab`.
- Contents: `api.php`, `index.html`, `js/app.js`, `js/admin.js`, `sw.js`, `uploads/kyc/.htaccess`.
- Excludes database, credentials/config, customer/KYC uploads, campaign/media, CSS, tests and docs. Builder/allowlist: `tools/mega/build-v187-package.py`. Full runbook: `DEPLOY-v187.md`.
- Tests, fixtures and the broad issue log are in `tools/mega/smoke/v187-{check,dom-check,admin-check,php-run}.js` and `docs/PRELAUNCH-AUDIT-TRACKER-2026-10-01.md`.

## Verified local evidence

- Full `npm test --prefix tools/mega/smoke`: **exit 0**, run after adding the forward-compatible v186 gate.
- `npm run test:regression --prefix tools/mega/smoke`: **47 suites passed, 26 retired-feature suites skipped, 0 failed**. Stabilized the legacy v156 RTGS isolation assertion by excluding its per-response `updatedAt` metadata; B2B quote/config fields remain compared.
- Focused gates: v187 source **9/9**, PHP-WASM **11/11**, admin jsdom **6/6**, storefront synthetic DOM **15/15**, forward-compatible v186 source **8/8**.
- Clean extracted-overlay test: v187 source **9/9**, v186 source **8/8**, storefront DOM **15/15**, admin DOM **6/6**, PHP-WASM **11/11**. This was rerun with overwrite-enabled extraction over a clean local CMS archive of v186 source commit `7a9b0f9`.
- ZIP builder re-run: six members, CRC/allowlist/stamp/security/campaign checks passed; checksum above.
- Test data is synthetic; no production database, customer uploads, credentials, staging or live file route was accessed.

## Audit scope and limitations

- The broad pre-launch tracker remains **0/111 complete visible bullets fully verified**. Partial local evidence only is marked for selected S01–S04/S12 and earlier releases; all unchecked/direct requirements remain open.
- Round 4 text is truncated at “Persistent bottom navi…”. Do not invent its missing destinations or behavior.
- Apache/LiteSpeed `.htaccess` behavior, Hostinger `open_basedir` and private-directory permissions, real legacy records, live authenticated streaming, native PHP-FPM/MySQL, malware scanning, real browser/device/in-app-browser, accessibility scanners, staging, and production behavior are **not tested**.
- `DEPLOY-v187.md` has the issue → provisional severity → source reproduction → remediation → retest summary, file inventory, before/after notes, install caveats, and staging acceptance steps.

## Next steps — no deployment implied

1. Await explicit authorization before any staging upload. Before testing, confirm the private directory resolves outside `public_html` and PHP can create/write it with no group/world permissions.
2. On authorized staging, use only synthetic cards: direct legacy URL must return denied; non-admin stream 403; admin stream the selected synthetic bytes; migration must preserve DB/original on simulated failures; confirm v187 release/cache stamps and service-worker update. Test the actual host rules and permissions.
3. Report each remaining broad audit check as pass/fail/not tested; do not claim completion from the local suites.
4. Ask separately for explicit production deployment approval only after staging acceptance. The legacy-record migration is a separate data-changing action and requires separate explicit consent; do not click it against real records without that consent.

Production remains v186 until a later safe version check proves otherwise. No production deployment date exists for v187.
