<?php
declare(strict_types=1);
/**
 * Shivaa auto-sync worker — v3 (2026-09-05)
 * Cron:  php /home/<USER>/domains/<DOMAIN>/auto_sync.php  (every 5 min)
 *
 * v3 = v2 (tested core) + six upgrades:
 *  1. SELF-HEALING DEPLOY: after copying code, verifies critical files and
 *     smoke-tests the live API; on failure ROLLS BACK from backup automatically.
 *  2. MULTI-BATCH: auto-discovers ANY batch folder (<root>/<batch>/work/designs.json
 *     + <batch>/media/) — future PDF batches need zero worker changes.
 *  3. RETRIES: transient network failures retried (GitHub calls ×3, tarball ×2,
 *     per-design media once) instead of instant defeat.
 *  4. SAFE DOWNLOAD: tarball written to .part first, renamed only on HTTP 200 —
 *     a half-dead download can never poison the next run.
 *  5. DEACTIVATE SUPPORT: a design flagged "active": false in designs.json is
 *     taken offline automatically (PUT active=false, once).
 *  6. HOUSEKEEPING: log rotation at ~400 KB, config permissions auto-fixed to
 *     0600, run separators in the log.
 * Kept from v2: streaming constant-memory tar.gz reader (pax/gnu/ustar tested),
 * HEAD-change-only downloads, User-Agent on all GitHub calls, zero banned
 * functions (no exec/shell_exec), phase loglines everywhere, ledger per design,
 * cap 12 uploads/run, code deploy excludes data/ + uploads/ with 1-gen backup.
 *
 * Config: <dir of this file>/.shivaa-sync.json  (0600)
 *   { email, password, pat, repo, branch, repo_dir, deploy_code }
 * Logs:   shivaa-sync.log (+ .1 rotated) · shivaa-sync-last.json · ledger json
 */
error_reporting(E_ALL);
@ini_set('display_errors', '0');
@set_time_limit(0);
@ini_set('memory_limit', '384M');

$HOME = dirname(__FILE__);
$CFG  = "$HOME/.shivaa-sync.json";
$LOG  = "$HOME/shivaa-sync.log";
$LOCK = "$HOME/shivaa-sync.lock";
$LEDG = "$HOME/shivaa-sync-ledger.json";
$SRC  = "$HOME/shivaa-sync-src";
$HEAD = "$HOME/.shivaa-sync-head";

function logline(string $m): void {
    global $LOG;
    if (is_file($LOG) && (int)@filesize($LOG) > 400000) { @rename($LOG, "$LOG.1"); }   // v3: rotation
    file_put_contents($LOG, date('Y-m-d H:i:s') . "  $m\n", FILE_APPEND);
    if (php_sapi_name() !== 'cli') echo '<pre>' . htmlspecialchars($m) . "</pre>\n";
}
function finish(int $code, string $msg): void {
    global $HOME;
    file_put_contents("$HOME/shivaa-sync-last.json", json_encode(['ts' => time(), 'code' => $code, 'msg' => $msg]));
    logline($msg);
    exit($code);
}

$fp = fopen($LOCK, 'c');
if (!flock($fp, LOCK_EX | LOCK_NB)) finish(0, 'another sync is running — skipping');
if (!is_file($CFG)) finish(1, 'no config — create .shivaa-sync.json next to this file');
@chmod($CFG, 0600);                                              // v3: auto-fix perms
$cfg = json_decode((string)file_get_contents($CFG), true) ?: [];
if (empty($cfg['email']) || empty($cfg['password'])) finish(1, 'config missing admin credentials');
logline('=== run start (worker v3) ===');

/* ── helpers ────────────────────────────────────────────────────────── */

function api(string $route, string $method = 'GET', ?string $tok = null, $json = null, ?array $files = null): array {
    $ch = curl_init('https://shivaa.in' . $route);
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => 1, CURLOPT_TIMEOUT => 300, CURLOPT_CUSTOMREQUEST => $method]);
    $hdr = [];
    if ($tok) $hdr[] = "Authorization: Bearer $tok";
    if ($files) curl_setopt($ch, CURLOPT_POSTFIELDS, $files);
    elseif ($json !== null) { curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($json)); $hdr[] = 'Content-Type: application/json'; }
    if ($hdr) curl_setopt($ch, CURLOPT_HTTPHEADER, $hdr);
    $r = curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $err = curl_error($ch);
    curl_close($ch);
    if ($r === false) return [0, ['error' => $err]];
    return [$code, json_decode((string)$r, true) ?? []];
}

/** v3: GitHub REST GET with User-Agent + up to 3 attempts on transient failure. */
function gh(string $path, string $pat): array {
    $c = 0; $b = [];
    for ($try = 1; $try <= 3; $try++) {
        $ch = curl_init("https://api.github.com$path");
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => 1, CURLOPT_TIMEOUT => 60, CURLOPT_FOLLOWLOCATION => 1,
            CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $pat, 'Accept: application/vnd.github+json', 'User-Agent: shivaa-sync/3.0'],
        ]);
        $raw = curl_exec($ch);
        $err = curl_error($ch);
        $c = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        curl_close($ch);
        $b = json_decode((string)$raw, true) ?? [];
        if ($raw !== false && $c >= 200 && $c < 500) return [$c, $b];   // definitive answer
        logline("gh retry $try for $path (" . ($err ?: "http $c") . ')');
        sleep(2);
    }
    return [$c, $b];
}

function rrmdir(string $d): void {
    if (!is_dir($d)) return;
    foreach (scandir($d) ?: [] as $e) {
        if ($e === '.' || $e === '..') continue;
        $p = "$d/$e";
        if (is_dir($p) && !is_link($p)) rrmdir($p); else @unlink($p);
    }
    @rmdir($d);
}

function find_root(string $dir): ?string {
    foreach (glob("$dir/*") ?: [] as $d) {
        if (is_dir($d) && (is_file("$d/demo65/config.json") || count(glob("$d/*/work/designs.json") ?: []) > 0)) return $d;
    }
    return null;
}

/**
 * Pure-PHP streaming .tar.gz extractor (constant memory).
 * Handles ustar prefix, GNU longnames ('L') and pax headers ('x'/'g').
 * (Byte-exact tested vs pax/gnu/ustar archives.)
 */
function tar_extract_gz(string $gz, string $dest): void {
    $fp = gzopen($gz, 'rb');
    if (!$fp) throw new RuntimeException('gzopen failed');
    $buf = ''; $eof = false;
    $read = function (int $n) use (&$buf, $fp, &$eof): string {
        while (strlen($buf) < $n && !$eof) {
            $chunk = gzread($fp, 131072);
            if ($chunk === false || $chunk === '') { $eof = true; break; }
            $buf .= $chunk;
        }
        if (strlen($buf) <= $n) { $out = $buf; $buf = ''; return $out; }
        $out = substr($buf, 0, $n); $buf = substr($buf, $n); return $out;
    };
    $longname = null; $paxpath = null; $paxsize = null;
    while (true) {
        $hdr = $read(512);
        if (strlen($hdr) < 512 || rtrim($hdr, "\0") === '') break;
        $name  = rtrim(substr($hdr, 0, 100), "\0");
        $size  = (int)octdec(trim(substr($hdr, 124, 12)));
        $type  = substr($hdr, 156, 1);
        $prefix = rtrim(substr($hdr, 345, 155), "\0");
        $pad   = (512 - ($size % 512)) % 512;
        if ($type === 'L') {                       // GNU long name (payload is NUL-terminated!)
            $longname = rtrim($read($size), "\0"); if ($pad) $read($pad); continue;
        }
        if ($type === 'x' || $type === 'X') {      // pax extended header
            $pax = $read($size); if ($pad) $read($pad);
            if (preg_match('/\d+ path=(.*)\n/', $pax, $m)) $paxpath = rtrim($m[1], "\n");
            if (preg_match('/\d+ size=(.*)\n/', $pax, $m)) $paxsize = (int)$m[1];
            continue;
        }
        if ($type === 'g') { $read($size); if ($pad) $read($pad); continue; }
        if ($type === '5') {                       // directory
            $n = ($prefix !== '' ? $prefix . '/' : '') . $name;
            @mkdir($dest . '/' . trim($n, '/'), 0777, true);
            continue;
        }
        if ($type === '0' || $type === "\0" || $type === '7') {   // regular file
            $n = $paxpath ?? $longname ?? (($prefix !== '' ? $prefix . '/' : '') . $name);
            $sz = $paxsize ?? $size;
            $longname = null; $paxpath = null; $paxsize = null;
            $target = $dest . '/' . ltrim($n, '/');
            @mkdir(dirname($target), 0777, true);
            $out = fopen($target, 'wb');
            if (!$out) throw new RuntimeException("cannot write $target");
            $rem = $sz;
            while ($rem > 0) {
                $data = $read(min($rem, 131072));
                if ($data === '') break;
                fwrite($out, $data);
                $rem -= strlen($data);
            }
            fclose($out);
            if ($pad) $read($pad);
            continue;
        }
        // symlink/hardlink/other: skip payload
        $longname = null; $paxpath = null; $paxsize = null;
        if ($size || $pad) $read($size + $pad);
    }
    gzclose($fp);
}

/* ── 1 · source: reuse, or fetch only when HEAD changed ──────────────── */

$root = null;
if (!empty($cfg['repo_dir']) && is_file($cfg['repo_dir'] . '/demo65/config.json')) {
    $root = $cfg['repo_dir'];
    logline("phase: source — using pinned checkout $root");
} elseif (!empty($cfg['pat']) && !empty($cfg['repo'])) {
    logline('phase: source — checking GitHub HEAD');
    $branch = (string)($cfg['branch'] ?? '');
    if ($branch === '') {
        [$c, $r] = gh('/repos/' . $cfg['repo'], $cfg['pat']);
        if ($c !== 200) finish(1, "github repo check failed ($c)");
        $branch = (string)($r['default_branch'] ?? 'main');
    }
    [$c, $r] = gh('/repos/' . $cfg['repo'] . '/commits/' . rawurlencode($branch), $cfg['pat']);
    if ($c !== 200) finish(1, "github head check failed ($c)");
    $sha = (string)($r['sha'] ?? '');
    if ($sha === '') finish(1, 'github head check returned no sha');
    $have = is_file($HEAD) ? trim((string)file_get_contents($HEAD)) : '';
    $existing = find_root($SRC);
    if ($have === $sha && $existing) {
        $root = $existing;
        logline("head unchanged @$sha — reusing unpacked source (no download)");
    } else {
        logline("new head @$sha (was " . ($have ?: 'none') . ') — phase: download');
        $tmp = "$SRC.tar.gz";
        $part = "$tmp.part";                                   // v3: safe download
        $code = 0;
        for ($try = 1; $try <= 2; $try++) {
            $ch = curl_init("https://api.github.com/repos/{$cfg['repo']}/tarball/" . rawurlencode($branch));
            $fh = fopen($part, 'w');
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => 1, CURLOPT_TIMEOUT => 600, CURLOPT_FOLLOWLOCATION => 1,
                CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $cfg['pat'], 'Accept: application/vnd.github+json', 'User-Agent: shivaa-sync/3.0'],
                CURLOPT_FILE => $fh,
            ]);
            curl_exec($ch);
            $code = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
            fclose($fh); curl_close($ch);
            if ($code === 200) break;
            logline("tarball retry $try (http $code)");
            sleep(3);
        }
        if ($code !== 200) { @unlink($part); finish(1, "github tarball fetch failed ($code)"); }
        rename($part, $tmp);
        logline('phase: extract (streaming, constant memory)');
        rrmdir($SRC);
        @mkdir($SRC, 0777, true);
        try { tar_extract_gz($tmp, $SRC); } catch (Throwable $e) { finish(1, 'extract failed: ' . $e->getMessage()); }
        @unlink($tmp);
        $root = find_root($SRC);
        if (!$root) finish(1, 'tarball had no batch (work/designs.json) inside');
        file_put_contents($HEAD, $sha);
        logline("extracted @$sha -> $root");
    }
} else {
    finish(1, 'config has neither repo_dir nor pat — cannot fetch source');
}

/* ── 1b · deploy cms CODE with self-verify + auto-rollback (v3) ──────── */

if (($cfg['deploy_code'] ?? true) !== false) {
    $src = "$root/cms";
    if (!is_dir($src)) { logline('deploy: no cms/ in source — skipped'); }
    else {
        $pub = '';
        foreach (array_merge([$HOME . '/public_html'], glob("$HOME/domains/*/public_html") ?: [], glob(dirname($HOME) . '/*/public_html') ?: []) as $cc) {
            if (is_file("$cc/api.php") && is_file("$cc/index.html")) { $pub = $cc; break; }
        }
        if (!$pub) { logline('deploy: public_html not found — skipped'); }
        else {
            $files = [];
            $it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($src, FilesystemIterator::SKIP_DOTS));
            foreach ($it as $f) {
                if (!$f->isFile()) continue;
                $rel = substr($f->getPathname(), strlen($src) + 1);
                if (str_starts_with($rel, 'data/') || str_starts_with($rel, 'uploads/')) continue;
                $files[$rel] = $f->getPathname();
            }
            ksort($files);
            $h = '';
            foreach ($files as $rel => $p) $h .= $rel . sha1_file($p);
            $hash = sha1($h);
            $marker = "$HOME/.shivaa-deploy-hash";
            if (is_file($marker) && trim((string)file_get_contents($marker)) === $hash) {
                logline('deploy: code unchanged (hash match) — skipped');
            } else {
                logline('phase: deploy — copying ' . count($files) . ' code file(s)');
                $bk = "$HOME/shivaa-deploy-backup";
                rrmdir($bk);
                $n = 0;
                foreach ($files as $rel => $p) {
                    $dst = "$pub/$rel";
                    if (is_file($dst)) { @mkdir(dirname("$bk/$rel"), 0777, true); @copy($dst, "$bk/$rel"); }
                    @mkdir(dirname($dst), 0777, true);
                    if (copy($p, $dst)) $n++; else logline("deploy COPY FAIL $rel");
                }
                /* v3: verify critical files byte-identical, then smoke-test live API */
                $bad = false;
                foreach (['api.php', 'index.html'] as $crit) {
                    if (!is_file("$pub/$crit") || sha1_file("$pub/$crit") !== sha1_file("$src/$crit")) { $bad = true; logline("deploy VERIFY FAIL: $crit differs"); }
                }
                if (!$bad) {
                    [$sc] = api('/api/products', 'GET');
                    if ($sc !== 200) { $bad = true; logline("deploy SMOKE FAIL: live API returned $sc"); }
                }
                if ($bad) {
                    logline('phase: deploy — ROLLING BACK from backup');
                    foreach ($files as $rel => $p) {
                        $dst = "$pub/$rel"; $bkf = "$bk/$rel";
                        if (is_file($bkf)) { @copy($bkf, $dst); } else { @unlink($dst); }
                    }
                    file_put_contents($marker, $hash);   // don't retry the same broken hash every run
                    finish(1, 'deploy rolled back — live site restored from backup');
                }
                file_put_contents($marker, $hash);
                logline("DEPLOYED $n cms code file(s) -> $pub (verified + smoke-tested; data/ + uploads/ untouched; backup: $bk)");
            }
        }
    }
} else {
    logline('deploy: disabled by config (deploy_code=false) — skipped');
}

/* ── 2 · login ───────────────────────────────────────────────────────── */

logline('phase: login');
[$st, $r] = api('/api/auth/login', 'POST', null, ['email' => $cfg['email'], 'password' => $cfg['password']]);
if ($st !== 200 || empty($r['token'])) finish(1, "login failed ($st)");
$tok = $r['token'];

[$st0, $r0] = api('/api/products', 'GET', $tok);
$skumap = [];
if ($st0 === 200) foreach ($r0['products'] ?? [] as $p) if (!empty($p['sku'])) $skumap[$p['sku']] = $p['id'];

/* ── 3 · v3 multi-batch discovery + deactivate support ───────────────── */

$ledger = is_file($LEDG) ? (json_decode((string)file_get_contents($LEDG), true) ?: []) : [];
$todo = [];
foreach (glob("$root/*/work/designs.json") ?: [] as $dj) {          // demo65, batch2, …
    $bdir = dirname(dirname($dj));
    $bname = basename($bdir);
    $designs = json_decode((string)file_get_contents($dj), true) ?: [];
    foreach ($designs as $d) {
        $sku = $d['sku'];
        $dir = "$bdir/media/$sku";
        /* v3: deactivate flag takes a live product offline, once */
        if (($d['active'] ?? true) === false) {
            if (isset($ledger[$sku]['pid']) && empty($ledger[$sku]['off'])) {
                [$st, $r] = api('/api/products/' . $ledger[$sku]['pid'], 'PUT', $tok, ['active' => false]);
                if ($st === 200) { $ledger[$sku]['off'] = true; file_put_contents($LEDG, json_encode($ledger, JSON_PRETTY_PRINT)); logline("OFFLINE $sku (deactivated by batch)"); }
                else logline("OFFLINE FAIL $sku ($st)");
            }
            continue;
        }
        /* v3.1: media_revision forces a deliberate re-upload without touching
         * cms/data/db.json. Existing ledger rows predate this revision and are
         * therefore re-synced once; subsequent cron runs remain idempotent. */
        $media_revision = (int)($d['mediaRevision'] ?? 2);
        if (isset($ledger[$sku]) && empty($ledger[$sku]['off'])
            && (int)($ledger[$sku]['media_revision'] ?? 0) === $media_revision) continue;
        $ok = is_file("$dir/video.mp4") && is_file("$dir/meta.json");
        foreach (['studio', 'worn', 'gift', 'editorial'] as $k) $ok = $ok && is_file("$dir/shot_$k.jpg");
        if ($ok) $todo[] = ['sku' => $sku, 'dir' => $dir, 'batch' => $bname, 'media_revision' => $media_revision];
    }
}
if (!$todo) finish(0, 'nothing new to sync (' . count($ledger) . ' in ledger)');
logline('phase: upload — ' . count($todo) . ' pending across batch(es), taking up to 12');

$done = 0;
foreach (array_slice($todo, 0, 12) as $t) {
    $sku = $t['sku']; $dir = $t['dir']; $media_revision = (int)($t['media_revision'] ?? 2);
    $imgs = []; $fail = false;
    foreach (['studio', 'worn', 'gift', 'editorial'] as $k) {
        $okfile = false;
        for ($try = 1; $try <= 2 && !$okfile; $try++) {              // v3: one retry
            [$st, $r] = api('/api/media', 'POST', $tok, null, ['file' => new CURLFile("$dir/shot_$k.jpg"), 'category' => 'rings']);
            $okfile = ($st === 200 && !empty($r['url']));
            if (!$okfile && $try === 1) { logline("media retry $sku/$k ($st)"); usleep(800000); }
        }
        if ($okfile) $imgs[] = $r['url'];
        else { logline("MEDIA FAIL $sku/$k ($st)"); $fail = true; break; }
    }
    if ($fail) continue;
    [$st, $r] = api('/api/media', 'POST', $tok, null, ['file' => new CURLFile("$dir/video.mp4"), 'category' => 'rings']);
    if ($st !== 200 || empty($r['url'])) { logline("VIDEO FAIL $sku ($st)"); continue; }
    $vid = $r['url'];
    $rec = json_decode((string)file_get_contents("$dir/meta.json"), true);
    $rec['sku'] = $sku; $rec['images'] = $imgs; $rec['video'] = $vid;
    $cat = $rec['category'] ?? 'rings';
    if (isset($skumap[$sku])) [$st, $r] = api('/api/products/' . $skumap[$sku], 'PUT', $tok, $rec);
    else [$st, $r] = api('/api/products', 'POST', $tok, $rec);
    if ($st === 200) {
        $ledger[$sku] = ['ts' => time(), 'pid' => $r['id'] ?? $skumap[$sku] ?? '', 'batch' => $t['batch'], 'media_revision' => $media_revision];
        file_put_contents($LEDG, json_encode($ledger, JSON_PRETTY_PRINT));
        logline("LIVE $sku [" . $t['batch'] . "/$cat] (" . (isset($skumap[$sku]) ? 'updated' : 'created') . ')');
        $done++;
    } else logline("PRODUCT FAIL $sku ($st) " . json_encode($r));
    usleep(600000);
}
flock($fp, LOCK_UN);
finish(0, "synced $done design(s); " . count($todo) . " were pending");