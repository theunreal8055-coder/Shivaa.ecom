<?php
/* ═══════════════════════════════════════════════════════════════════════
   SHIVAA · sitemap.xml generator                                     v107
   robots.txt has advertised https://shivaa.in/sitemap.xml since v8x but no
   file, rewrite or route ever produced it — search engines were being
   pointed at a 404. This builds the map straight from data/db.json so it
   can never drift from the catalogue: every live product, every category
   that has at least one active piece, and every static page the SPA
   serves.

   Served at /sitemap.xml via the .htaccess rewrite. Read-only: it never
   writes anything, and it sends cache headers because regenerating on
   every crawler hit would hammer db.json.
   ═══════════════════════════════════════════════════════════════════════ */
header('Content-Type: application/xml; charset=utf-8');
header('Cache-Control: public, max-age=3600');
header('X-Robots-Tag: noindex');   // the sitemap itself must not be indexed

$DB = __DIR__ . '/data/db.json';
$db = is_file($DB) ? json_decode((string)file_get_contents($DB), true) : null;
if (!is_array($db)) { http_response_code(500); exit("<error>catalogue unavailable</error>\n"); }

$host = 'https://' . (preg_match('#^(shivaa\.in|www\.shivaa\.in)$#', (string)($_SERVER['HTTP_HOST'] ?? ''))
    ? 'shivaa.in' : 'shivaa.in');          // never echo an arbitrary Host header
$mtime = gmdate('Y-m-d', (int)@filemtime($DB));

/* The SPA is hash-routed, so a crawler-visible URL is the fragment form.
   Fragments are what a shopper copies and what the canonical/OG tags on
   each product page point back to. */
$urls = [];
$add = function (string $path, string $lastmod, string $freq, string $prio) use (&$urls) {
    $urls[] = ['loc' => $path, 'lastmod' => $lastmod, 'freq' => $freq, 'prio' => $prio];
};

$add('/', $mtime, 'daily', '1.0');
foreach ([
    '/#/shop'        => ['daily',  '0.9'],
    '/#/rates'       => ['daily',  '0.8'],
    '/#/hallmark'    => ['monthly','0.6'],
    '/#/trust'       => ['monthly','0.7'],
    '/#/about'       => ['monthly','0.5'],
    '/#/contact'     => ['monthly','0.5'],
    '/#/faq'         => ['monthly','0.5'],
    '/#/privacy'     => ['yearly', '0.3'],
    '/#/delete-account' => ['yearly', '0.3'],   // v183 — Play's account-deletion URL
    '/#/terms'       => ['yearly', '0.3'],
    '/#/shipping'    => ['yearly', '0.4'],
    '/#/refund'      => ['yearly', '0.4'],
    '/#/care'        => ['yearly', '0.4'],
    '/#/sizer'       => ['monthly','0.6'],
    '/#/size-guide'  => ['monthly','0.6'],
    '/#/b2b'         => ['monthly','0.6'],
    '/#/catalogues'  => ['weekly', '0.6'],
    '/#/savings'     => ['monthly','0.5'],
    '/#/giftcard'    => ['monthly','0.4'],
    '/#/giftlist'    => ['monthly','0.4'],
    '/#/bundle'      => ['monthly','0.4'],
    '/#/refer'       => ['monthly','0.4'],
    '/#/videoconsult'=> ['monthly','0.4'],
] as $p => $m) $add($p, $mtime, $m[0], $m[1]);

/* the Gold Finale only exists while the campaign window is open —
   same instant the client uses (Bhai Dooj 2026, module retires 1 Dec). */
if (time() < strtotime('2026-12-01 00:00:00 +05:30')) {
    $add('/#/finale', $mtime, 'daily', '0.7');
}

/* categories with at least one active piece */
$cats = [];
foreach ((array)($db['products'] ?? []) as $p) {
    if (!is_array($p) || empty($p['active'])) continue;
    $c = (string)($p['category'] ?? '');
    if ($c !== '') $cats[$c] = true;
}
foreach (array_keys($cats) as $c) {
    $add('/#/shop?category=' . rawurlencode($c), $mtime, 'daily', '0.8');
}

/* every active product, newest first; the product page injects its own
   canonical + OG card (v57), so these are real landing pages. */
$prods = array_values(array_filter((array)($db['products'] ?? []), fn($p) => is_array($p) && !empty($p['active'])));
usort($prods, fn($a, $b) => strcmp((string)($b['createdAt'] ?? ''), (string)($a['createdAt'] ?? '')));
foreach ($prods as $p) {
    $lm = substr((string)($p['createdAt'] ?? $mtime), 0, 10);
    if (!preg_match('#^\d{4}-\d{2}-\d{2}$#', $lm)) $lm = $mtime;
    $add('/#/product/' . rawurlencode((string)$p['id']), $lm, 'weekly', '0.7');
}

echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";
foreach ($urls as $u) {
    echo '  <url><loc>' . htmlspecialchars($host . $u['loc'], ENT_XML1) . '</loc>'
       . '<lastmod>' . $u['lastmod'] . '</lastmod>'
       . '<changefreq>' . $u['freq'] . '</changefreq>'
       . '<priority>' . $u['prio'] . '</priority></url>' . "\n";
}
echo '</urlset>' . "\n";
