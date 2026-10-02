# Shivaa v187 — staging-only private KYC document update

**Built:** 2 Oct 2026
**Release:** 187
**Branch:** `arena/01a0f602-shivaa-ecom`
**Production baseline:** safe GET of `https://shivaa.in/api/version` independently returned v186 with matching release stamps, MySQL mode, 78 SQL/JSON rows and `mirrorBehind:false`.
**Deployment state:** not uploaded to staging or production. This document and ZIP are not deployment approval.

## Package

- **Archive:** `shivaa-update-v187.zip`
- **Target:** extract the archive contents into the existing `public_html` document root. This is an incremental overlay for the verified v186 baseline, not a full-site backup.
- **Entries:** 6
- **Size:** 459,919 bytes
- **SHA-256:** `50a1df1247006c71b51c523d41037c9e12f0abd665773041e9b49668359054ab`
- **Builder:** `python3 tools/mega/build-v187-package.py`

### Included files

| Archive path | Repository source | Purpose |
|---|---|---|
| `api.php` | `cms/api.php` | Private KYC storage, authenticated stream, migration, and v187 API stamp |
| `index.html` | `cms/index.html` | Release/cache URL bump to 187 |
| `js/app.js` | `cms/js/app.js` | Release handshake bump to 187; lazy admin bundle follows the release |
| `js/admin.js` | `cms/js/admin.js` | Secure admin document viewer and legacy-card migration action |
| `sw.js` | `cms/sw.js` | New shell/cache namespace and v187 asset URLs |
| `uploads/kyc/.htaccess` | `cms/uploads/kyc/.htaccess` | Deny all direct web requests to legacy KYC files |

The package excludes databases, configuration/credentials, KYC/customer uploads, campaign or catalogue media, CSS, tests and documentation. No CSS change was needed; existing button styles are reused. `uploads/kyc/.htaccess` is intentionally included even though other uploaded files are excluded.

## Issue → severity → reproduction → fix

| Issue | Severity | Reproduction/evidence before the fix | v187 change and retest |
|---|---|---|---|
| Partner business-card images/PDFs were written under the public upload tree and stored as `/uploads/kyc/...`. The KYC directory rules blocked active/executable extensions but did not deny passive images/PDFs; root rules serve existing files, and the admin interface emitted direct file links. | **Medium (provisional).** KYC documents can contain sensitive business/contact details, but the observed source required knowledge of the URL; this agent did not enumerate, leak, or fetch a live document. | Source/config review confirmed the public destination, passive extensions outside the deny pattern, existing-file static serving, and direct admin `href`/`img` sinks. A local source assertion reproduced those conditions. This is not a live HTTP or real-upload probe. | New uploads go to a restrictive private sibling of the app document root and use internal opaque references. Direct access to `/uploads/kyc/` is denied. An admin-token-only API streams a record-bound document with no-store/security headers. The Partners UI no longer embeds raw paths; legacy files have an explicit verified-copy migration action. See tests and limitations below. |

## v187 changes and before/after notes

| Area/component | Before | v187 candidate behavior | Evidence/limit |
|---|---|---|---|
| New business-card upload — `cms/api.php` | File was moved into `cms/uploads/kyc/` before OTP, GST, duplicate checks and partner creation. Its URL used only 40 random filename bits. | Enforces request-size and 8 MB file caps, checks actual magic bytes, derives the extension from the signature, and delays persistence until OTP/GST/duplicate checks pass. Stores at a default private sibling directory (`.shivaa-private-kyc`) with directory mode 0700/file mode 0600. Refuses relative paths, symlinks and resolved paths inside the app document root; storage failure returns 503 and does not save the application. | PHP-WASM tests cover an unverified upload not being moved, invalid magic/oversize rejection, fail-closed in-document-root storage, synthetic private storage, permissions, and an owner-supplied `.png` filename containing a PDF signature. This is not a native FPM filesystem/permission test. |
| Existing KYC files — `cms/uploads/kyc/.htaccess` | JPEG/PNG/WEBP/GIF/PDF requests were not explicitly denied. | Denies all direct requests in the KYC directory (Apache 2.4 and legacy authorization syntax). API/PHP server reads remain possible. | Static rule check passes; actual Apache/LiteSpeed handling is not verified until staging. |
| Admin access — `cms/api.php` | Admin UI linked to the public path. | `GET /api/admin/partners/{partnerId}/business-card` requires `need_admin`, resolves only the stored partner reference, permits strict opaque/private or constrained legacy references, checks signature and size, and streams with private no-store, nosniff and restrictive CSP headers. The API is not cached by the service worker. | PHP-WASM synthetic admin succeeds; anonymous/customer requests return 403; missing records return 404. Live header/proxy behavior is untested. |
| Existing-card migration — `cms/api.php`, `cms/js/admin.js` | Existing database rows may still point to old public-tree files. | Admin can request a migration. The server copies to private storage, verifies the copied bytes, updates the DB, and only then unlinks the old copy. Missing/invalid/failed rows remain referenced for follow-up; a cleanup failure is reported. The UI calls out remaining legacy references. | Synthetic migration, path-traversal rejection, copy verification, public-file removal and idempotent second run pass. No real records were read or migrated. The migration button is a data-changing operation and must not be run on production without separate explicit owner approval. |
| Admin UI — `cms/js/admin.js` | Raw KYC URL was used as an anchor/image source. | Uses a button to fetch the authenticated stream with the existing bearer token, then displays an in-memory blob URL. Existing brand/button styles and layout structure are retained. | jsdom checks confirm no direct KYC URL is emitted, bearer authorization is sent, the synthetic blob is displayed, and the migration action refreshes the partner list. Actual browser/PDF-viewer behavior is untested. |
| Release/cache — index/app/worker/API | Release 186 stamps. | Release 187 is aligned across `index.html`, app.js, service worker, API version response and asset query keys. Existing CSS/image files are re-keyed; no new stylesheet or visual restyle is introduced. | v187/v186 forward source checks and extracted-overlay checks pass. CDN, service-worker update behavior on real devices, and staging cache headers remain untested. |

**Unchanged:** theme, colors, layout structure, fonts, button styles, logo artwork, Gold Biscuit campaign card/banner, catalogue media and other business flows. The campaign markup/image hash gate remains green.

## Verification

- `npm test --prefix tools/mega/smoke`: **PASS, exit 0** — full retained smoke chain plus v187 gates.
- `npm run test:regression --prefix tools/mega/smoke`: **47 suites passed, 26 retired-feature suites skipped, 0 failed**. The legacy v156 RTGS check now compares quote/config fields without the per-response `updatedAt` timestamp, so it tests retail-premium isolation rather than elapsed wall-clock time.
- Focused v187 gates: source **9/9**; isolated PHP-WASM security slice **11/11**; admin jsdom **6/6**; carried-forward synthetic storefront DOM **15/15**. Forward-compatible v186 source gate **8/8**.
- Extracted-overlay retest: package applied to a clean local CMS archive of v186 commit `7a9b0f9`; v187 source **9/9**, v186 source **8/8**, storefront DOM **15/15**, admin DOM **6/6**, PHP-WASM **11/11**.
- ZIP builder validates the exact six-member allowlist, CRC/source-byte equality, current release/cache stamps, KYC deny rule, exclusions, and protected campaign hashes.
- All fixture users, partners, files, tokens and addresses are synthetic `qa.invalid` data. No repository DB, customer file, production credential, provider request or staging server was used.

## Not verified / staging and deployment controls

- No staging or production upload, cache purge, live KYC-file request, real PHP-FPM run, or real authenticated document stream was performed.
- Hostinger `open_basedir`, parent-directory write permission, Apache/LiteSpeed `.htaccess` enforcement, real legacy records, browser/PDF viewer behavior, malware/antivirus scanning, real-device/in-app-browser behavior and accessibility scanners remain untested.
- No malware scanning is implemented by this change. Magic-byte/size checks are not malware clearance. S12 remains partial; S03/S04 also remain partial. The broad audit remains **0/111 fully verified**, and the Round 4 persistent-navigation request is still truncated.
- The default private directory is a sibling of the directory containing `api.php`, outside that document root. If the host cannot create/write it, KYC file uploads fail closed with 503 rather than falling back to public storage. An absolute `SHIVAA_PRIVATE_KYC_DIR` override is supported for an owner-configured private mount; do not point it inside `public_html`.
- If an owner authorizes staging, first confirm the target is v186 or newer, back up staging, extract the overlay, confirm the private directory is outside the docroot and mode 0700, then test a synthetic document: direct `/uploads/kyc/...` must be denied, non-admin stream must return 403, admin stream must return the synthetic bytes, and migration must preserve the DB/file on any simulated failure. Verify `/api/version` reports 187 with matched stamps and exercise service-worker refresh.
- Do not stage or deploy without the required explicit owner authorization. Do not deploy to production without a separate explicit approval after staging. Any production migration of existing KYC documents requires its own explicit approval; the UI action is not automatic. Do not loosen the KYC deny rule to make an old link work.

**No production deployment date:** none occurred.
