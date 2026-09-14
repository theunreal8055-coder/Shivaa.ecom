# Feature 2 — Why Trust Shivaa

Updated: 6 September 2026 · Introduced in UI asset version **40**.
Amended: 13 September 2026 · UI asset version **105** — the owner supplied the
company GSTIN, so it is now published alongside CIN/UDYAM/address (validated,
still never presented as a government-registry result).

**Released and live:** [PR #6](https://github.com/theunreal8055-coder/Shivaa.ecom/pull/6),
merge `fad5aca`, after the separate Feature 1 release. On 6 September 2026,
`https://shivaa.in/api/trust?release=fad5aca` returned the existing CIN, UDYAM and
address with `gstin: null`, `certificates: []` and
`registryVerification: { performed: false, checkedAt: null }`.
`/js/trust.js?v=40` and `/css/trust.css?v=40` were served with the new feature
code/styles. The live HUID status retained its explicit disconnected/unverified
contract. These were public read-only deployment checks, not government
verification or production data-entry tests.

## Owner-approved scope

> Feature 2 — Why Trust Shivaa. Use existing verified CIN, UDYAM, address.
> Leave GSTIN/certificates empty until you provide real files/details.

**v105 amendment (13 September 2026).** The owner provided the GSTIN
`08AAICE5666R1ZP` and asked for it to be shown prominently, so the "leave GSTIN
empty" instruction is now satisfied and superseded: the GSTIN is published from
`settings.gstin`. Certificate files remain empty — no real files were supplied.

This is a separate release after Feature 1, not an implementation of the
remaining roadmap. The owner's confirmation is the provenance for using the
existing business details; **no government-registry verification is performed
or claimed by this feature**.

Owner-confirmed values already in the repository at implementation:

- CIN: `U32111RJ2025PTC099173`
- UDYAM: `UDYAM-RJ-25-0086081`
- Address: Shop No. 01, Main Road, Sadar Bazaar, Jayal, Nagaur, Rajasthan — 341023
- GSTIN: `08AAICE5666R1ZP` (supplied by the owner on 13 September 2026; state
  code 08 = Rajasthan, PAN `AAICE5666R`, mod-36 checksum valid)

These are a record of the supplied baseline, **not runtime fallbacks**. Runtime
values are read from the current store settings. Missing/malformed fields remain
missing; a failed request never substitutes these documented values.

## What ships

- A dedicated **Why Trust Shivaa** page at `#/trust`, linked from main/mobile
  navigation, the homepage trust links, About, product pages and the footer.
- Business identity: current CIN and UDYAM, with explicit copy actions and
  separate links to official sources. Copying or opening a link is not a check.
- Current store address, with a Google Maps **address search** using only that
  supplied text. No guessed coordinates, location verification, hours or courier
  serviceability are added to the profile.
- **GSTIN: published (v105). Certificate files: still not provided.** The GSTIN
  comes from `settings.gstin` and is published only when it passes the same
  15-character shape + mod-36 checksum the KYC gate uses; anything else stays
  `null`. It appears in the hero plaque (with a copy action), the identity card
  and the documents card, each labelled *owner-provided* and each repeating that
  this page performs no registry lookup. Certificates remain `[]`; no dummy IDs,
  generated files, seals or disabled fake downloads. Existing privacy/catalogue
  PDFs are not repurposed as certificates.
- Clear separation of provided details, missing fields and unavailable service.
  None of those states is a finding about business registration or legal status.
- Footer CIN/UDYAM/address use the same allowlisted API, with no hard-coded
  identifier/address fallbacks. Unsupported footer registration seals/counters
  and the old About registration cards were replaced with evidence-page links.
- No supplier, payment, courier, notification or analytics integration added.
  No legal entity name, incorporation date, MSME classification, DIPP recognition
  or registry status is inferred from an identifier.

The page uses neutral **“Provided by Shivaa”** labelling, not “government
verified”, “certified”, or a numeric trust score. Jewellery hallmarking remains
separate and links to the existing Feature 1 BIS Care handoff.

## Source links

Links checked on 6 September 2026:

- MCA's official homepage: https://www.mca.gov.in/ (redirects to its current
  homepage). This is a website handoff, not an automatic company-data lookup.
- Official UDYAM verification portal: [2](https://www.udyamregistration.gov.in/Udyam_Verify.aspx).
  A user completes any verification there; this site does not fill its CAPTCHA
  or import a result.
- Maps searches use the standard `https://www.google.com/maps/search/` URL with
  `api=1` and the URL-encoded address. No map request is made automatically.

No registry was queried with Shivaa's identifiers and no third-party result was
stored. A link-review date is not a business verification date.

## Read-only API

`GET /api/trust` returns only:

- `schemaVersion: 1`
- `source: store_settings`
- `business`: `cin`, `udyam`, `address` (each a string or `null`)
- `gstin`: the owner-confirmed GSTIN as a string, or `null` when settings carry
  no shape- and checksum-valid value
- `certificates: []`
- `registryVerification: { performed: false, checkedAt: null }`

The endpoint loads current settings **before** legacy schema/rate defaults,
without changing the database, refreshing rates or making external requests.
Wrong methods return 405 with `Allow: GET`; query parameters cannot override
values. Responses use the CMS's `Cache-Control: no-store` and JSON security
headers. Database failures return an error, not a fabricated profile.

`cms/trust.php` implements the projection. Only surrounding ASCII whitespace is
trimmed from identifiers; unsupported type/format is omitted, not repaired.
Identifier shapes are sanity checks only. Addresses preserve punctuation and
line breaks, reject control bytes/invalid encoding/overlong/all-blank text, and
are rendered as escaped text. The address limit is 500 Unicode characters.

Private configuration, API keys, arbitrary URLs, legacy certificate fields,
verification flags, dates, ratings and scores are never copied into the response.
The only GSTIN source is `settings.gstin`, filtered through `trust_gstin()`; an
unapproved GSTIN string anywhere else in settings is ignored.

## Browser handling

`cms/js/trust.js` accepts only the expected profile contract. Unexpected schemas,
a GSTIN that fails the 15-character shape, nonempty certificates, forged
verification flags, HTML responses,
network errors and an eight-second timeout all produce an **unavailable** state.
The footer clears previously displayed identifiers after a failed fetch.

Concurrent initial requests share a promise, but there is no persisted profile
cache, stale-data fallback, lookup history or analytics event. Route changes
prevent a late response replacing a different page. Retrying requests fresh data.

Copy operations write exactly the supplied value. Clipboard failure offers
manual copying rather than claiming success. External links are fixed to the
known official domains (Maps has an encoded text query), use `noopener
noreferrer` / `no-referrer`, and do not submit a CIN or UDYAM automatically.

## Adding certificate files later (the GSTIN shipped in v105)

The GSTIN is live: `settings.gstin` → `trust_gstin()` → `/api/trust` → hero
plaque, identity row and documents card, plus the shared footer plaque
(`#footGstin`). Changing it is a settings edit; an invalid value renders the
honest "Not provided" state instead of guessing.

Certificates still have no publication toggle, generic document-URL setting or
placeholder uploader. Keep that field empty until the owner supplies actual
files and explicitly approves publication.

A later reviewed change must establish provenance, confirm the exact identifier
and document purpose, protect private data, validate file types/storage/URLs,
and describe the evidence without claiming a live government check. Merely
finding a PDF in `uploads/`, a legacy GST setting or a `verified: true` flag is
not sufficient. Do not invent or generate legal/certification documents.

## Testing and release

```sh
php -l cms/trust.php
php -l cms/api.php
node --check cms/js/trust.js
node --check cms/js/app.js
php qa/test_trust.php
python3 qa/test_trust_api.py
python3 qa/test_trust_ui.py
# Preserve the already released HUID and compare/shortlist behaviour:
php qa/test_hallmark.php
python3 qa/test_hallmark_api.py
python3 qa/test_hallmark_ui.py
```

Tests run actual PHP code in isolated temporary databases. Positive legal-data
fixtures are read from the existing owner-confirmed repository values. Malformed
and malicious rejection fixtures are QA-only and never deployed.

Local results: **41 trust unit checks, 7 HTTP test groups and 61 trust browser
checks** pass, including empty/error states, sensitive-field filtering, copy
failures, timeout, text escaping, 320–1440px layouts, HUID and shareable shortlist
regressions. The full Feature 1 suite is also re-run before publication. Tracked
catalogue, supplier data and media remain unchanged.

The optional local read-only preview uses `qa/php_router.php` with an isolated
CMS copy, `SHIVAA_PREVIEW_READ_ONLY=1` and `SHIVAA_PREVIEW_PAGE=trust`. Its snapshot
prices are explicitly not live. Never deploy the QA router or scratch files.

Ship the new `cms/trust.php`, `cms/js/trust.js`, `cms/css/trust.css` together with
the modified API/app/index. All **11** JS/CSS cache references are version **40**.
The normal release path is a separate PR from the fixed session branch into
main, followed by the existing Hostinger auto-sync, which excludes live `data/`
and `uploads/`. If copying manually, install helpers/assets before entrypoints.

Before declaring this release live, confirm `/api/trust` returns the actual
business details with the owner's `gstin` (or `null` when settings lack a valid
one), `certificates: []` and no registry check;
confirm the new JS/CSS assets are served; and retain the Feature 1 availability
limits. Production rollout confirmation is recorded in the release PR and
roadmap ledger, not inferred from merging alone.
