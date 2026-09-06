<?php
/**
 * Feature 2 — Why Trust Shivaa: a read-only, allowlisted business profile.
 *
 * The owner confirmed the existing CIN, UDYAM and address for this feature.
 * Values come from the current store settings, never constants/demo fallbacks.
 * Format checks do NOT authenticate a government registration. No registry
 * request, verification timestamp, trust score or certificate is manufactured.
 */
declare(strict_types=1);

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

function trust_profile(array $db): array {
  $settings = is_array($db['settings'] ?? null) ? $db['settings'] : [];
  return [
    'schemaVersion' => 1,
    'source' => 'store_settings',
    'business' => [
      'cin' => trust_identifier($settings['cin'] ?? null, '/\A[LU][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}\z/D'),
      'udyam' => trust_identifier($settings['udyam'] ?? null, '/\AUDYAM-[A-Z]{2}-[0-9]{2}-[0-9]{7}\z/D'),
      'address' => trust_address($settings['address'] ?? null),
    ],
    // Intentionally empty until the owner provides real details/files and
    // their publication is reviewed. Ignore legacy GSTIN/certificate fields,
    // arbitrary document URLs, PDFs in uploads, API keys and verification flags.
    'gstin' => null,
    'certificates' => [],
    'registryVerification' => ['performed' => false, 'checkedAt' => null],
  ];
}
