<?php
/**
 * Feature 1: real-data-only HUID handling.
 *
 * There is NO authorised BIS lookup adapter in this installation. A format
 * check, a staff record, or following a BIS link must NEVER become verification.
 * See docs/FEATURE-01-HUID.md before adding an integration.
 */
declare(strict_types=1);

final class HallmarkProblem extends RuntimeException {
  public int $httpStatus;
  public function __construct(int $status, string $message) {
    parent::__construct($message);
    $this->httpStatus = $status;
  }
}

function hallmark_links(): array {
  // App-store destinations published by BIS itself, reviewed 2026-09-06.
  return [
    'bisCare' => 'https://www.bis.gov.in/bis-apps/?lang=en',
    'android' => 'https://play.google.com/store/apps/details?id=com.bis.bisapp',
    'ios' => 'https://apps.apple.com/in/app/bis-care-app/id6443724891',
    'guidance' => 'https://www.bis.gov.in/hallmarking-overview/hallmarking-faqs/hallmarking-faq/?lang=en',
  ];
}

function hallmark_status(): array {
  return [
    'mode' => 'official_handoff',
    'automaticLookupAvailable' => false,
    'reason' => 'not_connected',
    'verified' => false,
    'record' => null,
    'source' => null,
    'checkedAt' => null,
    'message' => 'Automatic BIS verification is not connected. Complete the lookup in the official BIS Care app using Verify HUID. Shivaa does not receive that result.',
    'officialLinks' => hallmark_links(),
  ];
}

function hallmark_huid($value): ?string {
  if (!is_string($value) || strlen($value) > 64) return null;
  // Only case and surrounding ASCII whitespace are normalised. Never repair
  // punctuation, embedded spaces, ambiguous characters, or Unicode lookalikes.
  $value = trim($value, " \t\r\n");
  return preg_match('/\A[A-Za-z0-9]{6}\z/D', $value) === 1 ? strtoupper($value) : null;
}

function hallmark_json(string $raw, int $limit): array {
  if (strlen($raw) > $limit) throw new HallmarkProblem(413, 'Request is too large.');
  try { $body = json_decode($raw, false, 32, JSON_THROW_ON_ERROR); }
  catch (JsonException $e) { throw new HallmarkProblem(400, 'Send a JSON object.'); }
  if (!is_object($body)) throw new HallmarkProblem(400, 'Send a JSON object.');
  return (array)$body;
}

function hallmark_request_body(int $limit): array {
  $type = strtolower(trim(explode(';', $_SERVER['CONTENT_TYPE'] ?? '')[0]));
  if ($type !== 'application/json') throw new HallmarkProblem(415, 'Use application/json.');
  return hallmark_json((string)file_get_contents('php://input', false, null, 0, $limit + 1), $limit);
}

function hallmark_lookup(array $body): array {
  if (array_keys($body) !== ['huid']) throw new HallmarkProblem(400, 'Send only the huid field as text.');
  $huid = hallmark_huid($body['huid']);
  if ($huid === null) throw new HallmarkProblem(422, 'Enter exactly six letters (A–Z) or numbers (0–9), with no spaces or punctuation inside the HUID. This checks format only.');
  return array_merge(hallmark_status(), [
    'status' => 'unavailable',
    'huid' => $huid,
    'formatValid' => true,
    'error' => 'The format is accepted, but this HUID has NOT been verified by BIS here.',
  ]);
}

/** Runs BEFORE db_load: public checks never read/write the shop DB or rates. */
function hallmark_public_route(string $route, string $method): void {
  if (!in_array($route, ['hallmark/status', 'hallmark/lookup'], true)) return;
  $allowed = $route === 'hallmark/status' ? 'GET' : 'POST';
  if ($method !== $allowed) {
    header('Allow: ' . $allowed);
    jout(405, ['error' => 'Method not allowed.', 'verified' => false]);
  }
  try {
    if ($route === 'hallmark/status') jout(200, hallmark_status());
    // No guessing at undocumented BIS endpoints, scraping, demo results, or
    // fallback to catalogue purity/jeweller details. HTTP 503 is intentional.
    jout(503, hallmark_lookup(hallmark_request_body(1024)));
  } catch (HallmarkProblem $e) {
    jout($e->httpStatus, ['status' => 'invalid_request', 'error' => $e->getMessage(), 'verified' => false, 'record' => null, 'checkedAt' => null]);
  }
}

function hallmark_text($value, int $max, string $name): string {
  if (!is_string($value)) throw new HallmarkProblem(422, $name . ' must be text.');
  $value = trim($value);
  if (preg_match('/\A[^\x00-\x1F\x7F]{1,' . $max . '}\z/u', $value) !== 1) {
    throw new HallmarkProblem(422, $name . ' is required (plain text, at most ' . $max . ' characters).');
  }
  return $value;
}

/** Staff references only, one row per actual piece/part, never per design. */
function hallmark_entries($entries): array {
  if (!is_array($entries) || ($entries !== [] && array_keys($entries) !== range(0, count($entries) - 1)) || count($entries) > 50) {
    throw new HallmarkProblem(422, 'Provide a list of at most 50 piece HUID records.');
  }
  $out = []; $seen = [];
  foreach ($entries as $entry) {
    if (is_object($entry)) $entry = (array)$entry;
    if (!is_array($entry) || count($entry) !== 3 || array_diff(array_keys($entry), ['huid', 'pieceLabel', 'sourceNote'])) {
      throw new HallmarkProblem(422, 'Each record needs only huid, pieceLabel and sourceNote. Verification fields cannot be supplied.');
    }
    $huid = hallmark_huid($entry['huid']);
    if ($huid === null) throw new HallmarkProblem(422, 'Every recorded HUID must contain exactly six letters or numbers. Do not guess an unreadable stamp.');
    if (isset($seen[$huid])) throw new HallmarkProblem(409, 'The same HUID cannot be assigned to two pieces.');
    $seen[$huid] = true;
    $out[] = [
      'huid' => $huid,
      'pieceLabel' => hallmark_text($entry['pieceLabel'], 80, 'Piece / part label'),
      'sourceNote' => hallmark_text($entry['sourceNote'], 300, 'Source note'),
    ];
  }
  return $out;
}

function hallmark_staff_record(array $product): array {
  $stored = $product['hallmark'] ?? null;
  $legacyKeys = array_filter(array_keys($product), fn($k) => preg_match('/\A(?:hallmark|huid|bis)/i', (string)$k));
  $empty = ['revision' => 0, 'entries' => [], 'needsReview' => (bool)$legacyKeys];
  if (!is_array($stored) || ($stored['schemaVersion'] ?? null) !== 1 || ($stored['provenance'] ?? null) !== 'staff_entered' || !is_int($stored['revision'] ?? null) || $stored['revision'] < 1) return $empty;
  try { $entries = hallmark_entries($stored['entries'] ?? null); }
  catch (HallmarkProblem $e) { return $empty; }
  return ['revision' => $stored['revision'], 'entries' => $entries, 'needsReview' => false];
}

function hallmark_product(array $product): array {
  $entries = hallmark_staff_record($product)['entries'];
  // Discard any legacy verification flags. Private provenance notes and staff
  // IDs must not leak via list/detail/similar/wishlist product responses.
  foreach (array_keys($product) as $key) {
    if (preg_match('/\A(?:hallmark|huid|bis)/i', (string)$key)) unset($product[$key]);
  }
  $product['hallmark'] = [
    'status' => $entries ? 'recorded_unverified' : 'not_provided',
    'verified' => false,
    'source' => $entries ? 'staff_entered' : null,
    'checkedAt' => null,
    'entries' => array_map(fn($e) => ['huid' => $e['huid'], 'pieceLabel' => $e['pieceLabel']], $entries),
  ];
  return $product;
}

function hallmark_guard_product_write(array $body): void {
  foreach (array_keys($body) as $key) {
    if (preg_match('/\A(?:hallmark|huid|bis)/i', (string)$key)) {
      throw new HallmarkProblem(422, 'Use the dedicated staff HUID editor. Product edits cannot set hallmark data or BIS verification flags.');
    }
  }
}

/** Pure update logic, also tested without touching the catalogue DB. */
function hallmark_apply_update(array &$db, string $id, array $body, string $actor): array {
  if (count($body) !== 2 || array_diff(array_keys($body), ['entries', 'expectedRevision']) || !is_int($body['expectedRevision'] ?? null) || $body['expectedRevision'] < 0) {
    throw new HallmarkProblem(422, 'Supply entries and the expectedRevision from the staff editor.');
  }
  $idx = null;
  foreach ($db['products'] as $i => $p) if (($p['id'] ?? null) === $id) { $idx = $i; break; }
  if ($idx === null) throw new HallmarkProblem(404, 'Product not found.');
  $current = hallmark_staff_record($db['products'][$idx]);
  if ($current['revision'] !== $body['expectedRevision']) throw new HallmarkProblem(409, 'These records changed. Close and reopen the HUID editor before saving again.');
  $entries = hallmark_entries($body['entries']);
  $codes = array_column($entries, 'huid');
  foreach ($db['products'] as $i => $p) {
    if ($i !== $idx && array_intersect($codes, array_column(hallmark_staff_record($p)['entries'], 'huid'))) {
      throw new HallmarkProblem(409, 'A HUID is already recorded against another product. Check the physical piece and correct the existing record first.');
    }
  }
  $db['products'][$idx]['hallmark'] = [
    'schemaVersion' => 1,
    'provenance' => 'staff_entered',
    'revision' => $current['revision'] + 1,
    'entries' => $entries,
    // Administrative metadata, NOT a BIS check timestamp or BIS identity.
    'updatedAt' => gmdate('c'),
    'updatedBy' => $actor,
  ];
  return $db['products'][$idx];
}

/** Serialise HUID edits and re-check authentication against the fresh DB. */
function hallmark_save(string $dbFile, string $id, array $body): array {
  $lock = fopen($dbFile . '.lock', 'c');
  if (!$lock) throw new RuntimeException('Cannot lock database.');
  $temporary = null;
  try {
    if (!flock($lock, LOCK_EX)) throw new RuntimeException('Cannot lock database.');
    $fresh = json_decode((string)file_get_contents($dbFile), true, 512, JSON_THROW_ON_ERROR);
    $user = req_user($fresh);
    if (!$user || $user['role'] !== 'admin') throw new HallmarkProblem(403, 'Admin access required.');
    $product = hallmark_apply_update($fresh, $id, $body, $user['id']);
    $json = json_encode($fresh, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    // Replace atomically under the CMS lock so a short/failed write cannot
    // truncate the original DB. The temporary name is denied by .htaccess.
    $temporary = tempnam(dirname($dbFile), 'db.json.huid.');
    if ($temporary === false || file_put_contents($temporary, $json) !== strlen($json)) throw new RuntimeException('Cannot save database.');
    if (!chmod($temporary, fileperms($dbFile) & 0777) || !rename($temporary, $dbFile)) throw new RuntimeException('Cannot replace database.');
    $temporary = null;
    return $product;
  } finally {
    if ($temporary && is_file($temporary)) unlink($temporary);
    flock($lock, LOCK_UN); fclose($lock);
  }
}
