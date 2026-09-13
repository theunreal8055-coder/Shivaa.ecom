<?php
/**
 * Feature 2 â Why Trust Shivaa: a read-only, allowlisted business profile.
 *
 * The owner confirmed the existing CIN, UDYAM and address for this feature.
 * Values come from the current store settings, never constants/demo fallbacks.
 * Format checks do NOT authenticate a government registration. No registry
 * request, verification timestamp, trust score or certificate is manufactured.
 */
declare(strict_types=1);

// v81 direct-access guard — this file is an include library, never a URL entry point.
if (!defined('SHV_RUN')) { http_response_code(403); header('Content-Type: text/plain; charset=utf-8'); echo '403 Forbidden'; exit; }

function trust_identifier($value, string $pattern): ?string {
  if (!is_string($value)) return null;
  $value = trim($value, " \t\r\n");
  return preg_match($pattern, $value) === 1 ? $value : null;
}

function trust_address($value): ?string {
  if (!is_string($value)) return null;
  $value = trim($value, " \t\r\n");
  if (preg_match('/\A[\s\p{Z}\x{FEFF}]*\z/u', $value) === 1) return null;
  // Preserve legitimate address punctuation and line breaks. The browser
  // renders this as text, never HTML. Invalid types/encoding/control bytes and
  // excessive text become missing data, not a guessed replacement address.
  return preg_match('/\A[^\x00-\x08\x0B\x0C\x0E-\x1F\x7F]{1,500}\z/u', $value) === 1 ? $value : null;
}

// v101 — owner-supplied GSTIN. Format grammar only; this is NOT a government
// verification (the customer completes that themselves in the BIS/GST portals).
function trust_gstin($value): ?string {
  if (!is_string($value)) return null;
  $value = strtoupper(trim($value));
  return preg_match('/\A[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]\z/D', $value) === 1 ? $value : null;
}

// v101 — registered company name and public brand name. Rendered as text;
// restrict to ordinary business-name characters, length-bounded.
function trust_name($value, int $max = 160): ?string {
  if (!is_string($value)) return null;
  $value = trim(preg_replace('/\s+/u', ' ', $value));
  if ($value === '' || mb_strlen($value) > $max) return null;
  return preg_match('/\A[\p{L}\p{N}&.,()’\'\-\/ ]{2,}\z/u', $value) === 1 ? $value : null;
}

// v103 — the one document the Trust page can publish: the owner-uploaded GST
// registration certificate, stored under uploads/trust. Format/path grammar
// only — it remains a self-supplied business document, not a live registry
// result. Anything else (other types, URLs, legacy fields) is dropped.
function trust_certificate($value): ?array {
  if (!is_array($value)) return null;
  if (($value['type'] ?? '') !== 'gst-registration') return null;
  $file = (string)($value['file'] ?? '');
  if (!preg_match('#\A/uploads/trust/[A-Za-z0-9._-]{1,90}\z#', $file)) return null;
  if (!preg_match('#\.(pdf|jpe?g|png|webp)\z#i', $file)) return null;
  $at = (string)($value['at'] ?? '');
  if (!preg_match('/\A20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}/', $at)) return null;
  return [
    'type' => 'gst-registration',
    'label' => 'GST registration certificate',
    'file' => $file,
    'uploadedAt' => $at,
  ];
}

function trust_profile(array $db): array {
  $settings = is_array($db['settings'] ?? null) ? $db['settings'] : [];
  // v103 — at most one allowlisted certificate is ever published.
  $gstCert = trust_certificate($settings['gstCert'] ?? null);
  return [
    'schemaVersion' => 1,
    'source' => 'store_settings',
    'business' => [
      'legalName' => trust_name($settings['legalName'] ?? null),
      'brand' => trust_name($settings['brand'] ?? null, 80),
      'cin' => trust_identifier($settings['cin'] ?? null, '/\A[LU][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}\z/D'),
      'udyam' => trust_identifier($settings['udyam'] ?? null, '/\AUDYAM-[A-Z]{2}-[0-9]{2}-[0-9]{7}\z/D'),
      'address' => trust_address($settings['address'] ?? null),
    ],
    // v101 — the owner supplied the store's GSTIN; still a self-declared
    // business detail, never presented as a live registry result. v103 adds
    // the owner-uploaded GST certificate through a strict allowlist.
    'gstin' => trust_gstin($settings['gstin'] ?? null),
    'certificates' => $gstCert ? [$gstCert] : [],
    'registryVerification' => ['performed' => false, 'checkedAt' => null],
  ];
}
