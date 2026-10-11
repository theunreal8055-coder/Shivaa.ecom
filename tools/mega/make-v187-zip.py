#!/usr/bin/env python3
"""Build shivaa-update-v187-amrita.zip from cms/ (release 187).

Same exclusions as .github/workflows/hostinger-deploy.yml, so the ZIP can never
carry live data, uploads, credentials, host rules or the one-time installers.
One deliberate exception: uploads/kyc/.htaccess is INCLUDED because it is the
v187 KYC lockdown (business cards served only through the admin API). The
workflow's uploads/** rule would otherwise skip it; apply it by hand if you
deploy by the workflow.

Media (images, fonts, video, audio) is packed ONLY when this branch added or
changed it relative to main (BASE below). The 238 MB of live product photos are
unchanged, and shipping them would make the update useless and oversize.

Usage:  python3 tools/mega/make-v187-zip.py [output.zip]
"""
import fnmatch
import hashlib
import os
import re
import subprocess
import sys
import zipfile

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
CMS = os.path.join(ROOT, 'cms')
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'shivaa-update-v187-amrita.zip')

# Mirrors the workflow's exclude list (paths relative to cms/).
EXCLUDE = [
    '.git*', '**/.git*', '**/node_modules/**', 'data/**', 'uploads/**', '.htaccess',
    'config.php', 'setup-mysql.php', 'upgrade-sql.php', '.env', '.env.*', 'backups/**',
    '*.zip', '*.rar', '*.pdf', '*.mp4', '*.psd', 'config.local.php',
]
# The one exception to uploads/**: the v187 KYC lockdown.
FORCE_INCLUDE = {'uploads/kyc/.htaccess'}

# Media is packed only if this branch added or changed it since BASE (main).
BASE = 'origin/main'
MEDIA_EXT = ('.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.ico', '.woff', '.woff2',
             '.ttf', '.otf', '.mp4', '.webm', '.mp3', '.m4a', '.pdf')


def changed_media():
    out = subprocess.run(['git', 'diff', '--name-only', '--diff-filter=AM', BASE, '--', 'cms'],
                         cwd=ROOT, capture_output=True, text=True, check=True).stdout
    return {line[len('cms/'):] for line in out.splitlines() if line.lower().endswith(MEDIA_EXT)}


def excluded(rel):
    if rel in FORCE_INCLUDE:
        return False
    if '/' not in rel and rel.endswith('.htaccess'):
        return True
    for pat in EXCLUDE:
        if fnmatch.fnmatch(rel, pat) or (pat.endswith('/**') and rel.startswith(pat[:-3] + '/')):
            return True
    return False


def main():
    media_here = changed_media()
    files, skipped_media = [], 0
    for dp, dn, fn in os.walk(CMS):
        dn[:] = [d for d in dn if d not in ('.git', 'node_modules')]
        for f in fn:
            full = os.path.join(dp, f)
            rel = os.path.relpath(full, CMS).replace(os.sep, '/')
            if excluded(rel):
                continue
            if rel.lower().endswith(MEDIA_EXT) and rel not in media_here:
                skipped_media += 1
                continue
            files.append(rel)
    files.sort()
    print(f'media changed on this branch vs {BASE}: {len(media_here)}; unchanged media left out: {skipped_media}')

    # Sanity: the release stamp must be 187 everywhere it is written.
    idx = open(os.path.join(CMS, 'index.html'), encoding='utf-8').read()
    m = re.search(r'__SHIVAA_REL\s*=\s*(\d+)', idx)
    assert m and m.group(1) == '187', 'index.html stamp is not 187'
    assert 'const APP_REL = 187;' in open(os.path.join(CMS, 'js/app.js'), encoding='utf-8').read()

    with zipfile.ZipFile(OUT, 'w', zipfile.ZIP_DEFLATED) as z:
        for rel in files:
            z.write(os.path.join(CMS, rel), rel)

    h = hashlib.sha256(open(OUT, 'rb').read()).hexdigest()
    print(f'wrote {OUT}')
    print(f'files: {len(files)}  bytes: {os.path.getsize(OUT)}  sha256: {h}')
    for rel in files:
        if rel.startswith('uploads/') or rel.endswith('.htaccess'):
            print('  note:', rel)


if __name__ == '__main__':
    main()
