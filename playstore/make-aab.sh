#!/usr/bin/env bash
# playstore/make-aab.sh — build the Play bundle (AAB) from this repo's kit.
#
#   bash playstore/make-aab.sh --check        # verify what is ready, build nothing
#   bash playstore/make-aab.sh --init-key     # create ~/shivaa-upload-key.keystore once
#   bash playstore/make-aab.sh                # build app-release-bundle.aab
#
# Where things go
#   build dir : playstore/twa/                 (git-ignored, safe to delete)
#   keystore  : $KEYSTORE, default ~/shivaa-upload-key.keystore   (BACK THIS UP)
#   output    : playstore/twa/app-release-bundle.aab
#
# The manifest is copied fresh from playstore/twa-manifest.json on every run, so
# `node playstore/version-bump.mjs` is the only place a version code changes.
# Bubblewrap is interactive (keystore passwords, first-run SDK/JDK download) —
# that is why this script hands the terminal to it instead of piping answers.

set -u
cd "$(dirname "$0")/.." || exit 1
ROOT="$PWD"
BUILD="$ROOT/playstore/twa"
KEYSTORE="${KEYSTORE:-$HOME/shivaa-upload-key.keystore}"
MODE="${1:-build}"

say() { printf '%s\n' "$*"; }
die() { printf '\n[stopped] %s\n' "$*" >&2; exit 1; }

# ── 0 · --check ────────────────────────────────────────────────────────────
if [ "$MODE" = "--check" ]; then
  say "make-aab.sh · check only"
  say "  repo      $ROOT"
  say "  build dir $BUILD$([ -d "$BUILD" ] && echo ' (exists)')"
  say "  keystore  $KEYSTORE$([ -f "$KEYSTORE" ] && echo ' (found)' || echo ' (MISSING)')"
  command -v node >/dev/null 2>&1 && say "  node      $(node -v)" || say "  node      MISSING (need 18+)"
  if command -v bubblewrap >/dev/null 2>&1; then say "  bubblewrap $(bubblewrap --version 2>/dev/null | head -1)";
  else say "  bubblewrap MISSING -> npm install -g @bubblewrap/cli@^1.26"; fi
  command -v keytool >/dev/null 2>&1 && say "  keytool   present" || say "  keytool   not found (bubblewrap can download a JDK)"
  [ -f playstore/twa-manifest.json ] && say "  manifest  playstore/twa-manifest.json" || die "manifest missing"
  CODE=$(node -p "JSON.parse(require('fs').readFileSync('playstore/twa-manifest.json','utf8')).appVersionCode" 2>/dev/null || echo '?')
  say "  next versionCode $CODE"
  MISS=0
  if [ ! -f "$KEYSTORE" ]; then
    say ''
    say '  Missing the keystore. Create it once with:'
    say '    bash playstore/make-aab.sh --init-key'
    say '  (then back it up twice, offline — losing it makes every future update impossible)'
    MISS=1
  fi
  if ! command -v bubblewrap >/dev/null 2>&1; then
    say ''
    say '  Missing bubblewrap:  npm install -g @bubblewrap/cli@^1.26'
    MISS=1
  fi
  say ''
  [ "$MISS" -eq 0 ] && say '  ready to build: bash playstore/make-aab.sh' || exit 2
  exit 0
fi

# ── 0b · --init-key ────────────────────────────────────────────────────────
if [ "$MODE" = "--init-key" ]; then
  if [ -f "$KEYSTORE" ]; then die "$KEYSTORE already exists — do NOT overwrite it. Move it away only if you are certain it was never uploaded to Play."; fi
  command -v keytool >/dev/null 2>&1 || die "keytool not found. Install a JDK 17 (bubblewrap can also download one: run 'bubblewrap build' once)."
  say "About to create: $KEYSTORE"
  say "Play will ask for two passwords (store + key). Write them down with the file."
  say "If you lose this file, this app can NEVER be updated again. Back it up twice, offline."
  say ""
  keytool -genkeypair -v -keystore "$KEYSTORE" -alias shivaa -keyalg RSA -keysize 2048 -validity 10000 || die "keytool failed"
  say ""
  say "Created. Now, and only now, copy it somewhere safe (USB + encrypted copy):"
  say "  cp \"$KEYSTORE\" /media/<usb>/shivaa-upload-key.keystore"
  say ""
  say "Next: bash playstore/make-aab.sh"
  exit 0
fi

# ── 1 · gates ──────────────────────────────────────────────────────────────
[ -f playstore/twa-manifest.json ] || die "playstore/twa-manifest.json missing"
command -v bubblewrap >/dev/null 2>&1 || die "bubblewrap missing — npm install -g @bubblewrap/cli@^1.26"
[ -f "$KEYSTORE" ] || die "keystore missing at $KEYSTORE — create it once: bash playstore/make-aab.sh --init-key"

# a reused code is rejected by Play AFTER the 40 MB upload — catch it first
if [ -f playstore/version-bump.mjs ]; then
  node playstore/version-bump.mjs --status >/dev/null 2>&1
  VS=$?
  if [ "$VS" -eq 2 ]; then
    say "Version-code check failed:"
    node playstore/version-bump.mjs --status
    die "bump the version code before building (see the lines above)"
  fi
fi

CODE=$(node -p "JSON.parse(require('fs').readFileSync('playstore/twa-manifest.json','utf8')).appVersionCode")
VER=$(node -p "JSON.parse(require('fs').readFileSync('playstore/twa-manifest.json','utf8')).appVersion")

# ── 2 · stage the project ──────────────────────────────────────────────────
say "Staging $BUILD (manifest versionCode $CODE · $VER)"
mkdir -p "$BUILD" || die "could not create $BUILD"
cp playstore/twa-manifest.json "$BUILD/twa-manifest.json" || die "copy failed"
cp "$KEYSTORE" "$BUILD/$(basename "$KEYSTORE")" || die "could not copy the keystore into the build dir"
chmod 600 "$BUILD/$(basename "$KEYSTORE")" 2>/dev/null || true

# ── 3 · build ──────────────────────────────────────────────────────────────
say ""
say "Running bubblewrap build (interactive: keystore password, and on the first"
say "run it offers to download the JDK + Android SDK). Nothing is signed anywhere"
say "else — this is the only step that produces the file Play accepts."
say ""
cd "$BUILD" || die "cannot enter $BUILD"
bubblewrap build
BUILD_CODE=$?
cd "$ROOT" || exit 1
if [ "$BUILD_CODE" -ne 0 ]; then
  die "bubblewrap build failed (exit $BUILD_CODE). The message above is the real cause — usually a wrong keystore password, a missing Android SDK, or no network to dl.google.com."
fi

AAB="$BUILD/app-release-bundle.aab"
[ -f "$AAB" ] || AAB=$(find "$BUILD" -name '*.aab' -maxdepth 3 2>/dev/null | head -1)
[ -n "${AAB:-}" ] && [ -f "${AAB:-}" ] || die "build finished but no .aab was produced — check the bubblewrap output above"

# ── 4 · report ─────────────────────────────────────────────────────────────
say ""
say "Built:"
say "  file     $AAB"
say "  size     $(wc -c < "$AAB" | tr -d ' ') bytes"
if command -v sha256sum >/dev/null 2>&1; then say "  sha256   $(sha256sum "$AAB" | cut -d' ' -f1)";
elif command -v shasum >/dev/null 2>&1; then say "  sha256   $(shasum -a 256 "$AAB" | cut -d' ' -f1)"; fi
say "  versionCode $CODE · version $VER"
say ""
if command -v keytool >/dev/null 2>&1; then
  say "Upload-key fingerprint (paste with the Play signing one):"
  keytool -list -v -keystore "$KEYSTORE" -alias shivaa 2>/dev/null | grep -E 'SHA256:' | head -1 | sed 's/^[[:space:]]*/  /'
fi
say ""
say "Next, in this order:"
say "  1. Play Console -> Testing -> Internal testing -> upload the .aab"
say "  2. after it is accepted: node playstore/version-bump.mjs uploaded internal \"first upload\""
say "  3. paste BOTH fingerprints: node playstore/set-fingerprint.mjs \"<upload>\" \"<play-signing>\""
say "  4. deploy the web tree (shivaa-update-v228.zip) so the app opens v228"
say ""
say "Never delete $BUILD or the keystore until the Play upload is confirmed."
