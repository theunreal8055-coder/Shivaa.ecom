<?php
/**
 * Feature 2 — Why Trust Shivaa: a read-only, allowlisted business profile.
 *
 * The owner confirmed the existing CIN, UDYAM, address and GSTIN for this
 * feature (v105: the GSTIN 08AAICE5666R1ZP was supplied by the owner and is
 * published as an owner-provided identifier).
 * Values come from the current store settings, never constants/demo fallbacks.
 * Format and checksum checks do NOT authenticate a government registration. No
 * registry request, verification timestamp, trust score or certificate file is
 * manufactured.
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

/**
 * Validates a GSTIN the same way the KYC gate does (shape + mod-36 checksum).
 * A value that fails either test is treated as missing — never corrected,
 * never completed from another field. Publishing it is not a registry lookup.
 */
function trust_gstin($value): ?string {
  if (!is_string($value)) return null;
  $g = strtoupper(trim($value, " \t\r\n"));
  if (preg_match('/\A[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]\z/D', $g) !== 1) return null;
  $chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  $sum = 0;
  for ($i = 0; $i < 14; $i++) {
    $n = strpos($chars, $g[$i]);
    if ($n === false) return null;
    $n *= ($i % 2 === 0) ? 1 : 2;
    $sum += intdiv($n, 36) + ($n % 36);
  }
  return $g[14] === $chars[(36 - ($sum % 36)) % 36] ? $g : null;
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
    // v105 — the owner-supplied GSTIN, published only when it is a complete,
    // checksum-valid 15-character number. Certificate files stay empty until
    // real files are provided and their publication is reviewed. Arbitrary
    // document URLs, PDFs in uploads, API keys and verification flags are
    // still ignored.
    'gstin' => trust_gstin($settings['gstin'] ?? null),
    'certificates' => [],
    'registryVerification' => ['performed' => false, 'checkedAt' => null],
  ];
}
