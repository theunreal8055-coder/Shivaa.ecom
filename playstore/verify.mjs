#!/usr/bin/env node
/* Shivaa Play Store kit - offline verifier.
 *
 * Everything in this kit that a machine CAN check is checked here, with no
 * network: the web manifest a Trusted Web Activity is built from, the Digital
 * Asset Links file Google fetches, the Bubblewrap TWA manifest, the Play
 * graphics' dimensions, and the things that must NEVER be committed (a signing
 * keystore, a password, a service-account key).
 *
 *   node playstore/verify.mjs
 *
 * Exit 0 = the kit is internally consistent. Exit 1 = something below must be
 * fixed before an AAB is built. It deliberately does NOT claim the app is
 * playable, that Google has verified the link, or that the listing is approved
 * - those are human steps recorded in CHECKLIST.md.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CMS = path.join(ROOT, 'cms');
const GRAPHICS = path.join(HERE, 'graphics', 'out');
const SHA256_RE = /^[0-9A-F]{64}$/;
const FINGERPRINT_RE = /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/;

/* Something that is not WRONG, merely not doable yet without the owner: a
   keystore, a phone in his hand. Reported separately so the kit can ship
   complete-and-honest instead of pretending the last mile is code. */
class Pending extends Error {}
const pending = [];

let pass = 0, fail = 0, warn = 0;
const ok = (id, name) => { pass++; console.log('PASS ' + id + '  ' + name); };
const no = (id, name, why) => { fail++; console.log('FAIL ' + id + '  ' + name + (why ? ' - ' + why : '')); };
const hmm = (id, name, why) => { warn++; console.log('WARN ' + id + '  ' + name + (why ? ' - ' + why : '')); };
const t = (id, name, fn) => {
  try { const r = fn(); if (r === false) no(id, name); else ok(id, name); }
  catch (e) {
    if (e instanceof Pending) { pending.push(id + ' - ' + e.message); hmm(id, name, e.message); }
    else no(id, name, e.message);
  }
};
const rd = p => fs.readFileSync(p, 'utf8');
const j = p => JSON.parse(rd(p));

/* PNG size, straight from the IHDR chunk - no image library needed. */
function pngSize(file) {
  const b = fs.readFileSync(file).subarray(0, 24);
  if (b.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG');
  return {w: b.readUInt32BE(16), h: b.readUInt32BE(20)};
}

const manifest = j(path.join(CMS, 'manifest.webmanifest'));
const twa = j(path.join(HERE, 'twa-manifest.json'));
const links = j(path.join(HERE, 'assetlinks.json'));

/* --- 1 - the web manifest a TWA is built from --- */
t('W01', 'manifest.json and manifest.webmanifest are identical (one source of truth)', () => {
  const a = rd(path.join(CMS, 'manifest.json')), b = rd(path.join(CMS, 'manifest.webmanifest'));
  if (a.trim() !== b.trim()) throw new Error('the two copies have drifted apart');
});
t('W02', 'web manifest carries every field Bubblewrap reads', () => {
  for (const k of ['name', 'short_name', 'start_url', 'scope', 'display', 'theme_color', 'icons'])
    if (!manifest[k]) throw new Error('missing ' + k);
  if (manifest.display !== 'standalone') throw new Error('display is ' + manifest.display + ', TWA needs standalone');
  if (!manifest.scope.startsWith('/')) throw new Error('scope must be absolute');
  if (manifest.start_url !== manifest.scope &&
      !manifest.start_url.startsWith(manifest.scope.replace(/\/$/, '') + '/'))
    throw new Error('start_url ' + manifest.start_url + ' is outside scope ' + manifest.scope);
});
t('W03', 'web manifest declares a stable id, a 512 any icon and a maskable icon', () => {
  if (!manifest.id) throw new Error('no "id" - the installed PWA and the Play app would be two identities');
  const any = manifest.icons.filter(i => i.sizes.includes('512') && (i.purpose || 'any').includes('any'));
  const mask = manifest.icons.filter(i => i.purpose && i.purpose.includes('maskable') && i.sizes.includes('512'));
  if (!any.length) throw new Error('no 512x512 purpose:any icon (the Play app icon)');
  if (!mask.length) throw new Error('no 512x512 maskable icon (Android adaptive launcher icon)');
  for (const i of [...any, ...mask]) {
    const p = path.join(CMS, i.src.replace(/^\//, ''));
    if (!fs.existsSync(p)) throw new Error('icon file missing on disk: ' + i.src);
    const s = pngSize(p);
    if (s.w < 512 || s.h < 512) throw new Error(i.src + ' is ' + s.w + 'x' + s.h + ', need 512');
  }
});
t('W04', 'every manifest shortcut has an absolute url and an icon (Bubblewrap needs both)', () => {
  for (const s of manifest.shortcuts || []) {
    if (!s.url.startsWith('/')) throw new Error(s.name + ': url must be absolute');
    if (!s.icons || !s.icons.length) throw new Error(s.name + ': no icon');
  }
  if ((manifest.shortcuts || []).length > 4) throw new Error('Bubblewrap allows at most 4 shortcuts');
});

/* --- 2 - Digital Asset Links: the file Google actually fetches --- */
t('A01', 'assetlinks.json is an array with exactly one delegation entry', () => {
  if (!Array.isArray(links) || links.length !== 1) throw new Error('expected a 1-element array');
  const l = links[0];
  if (!l.relation || !l.relation.includes('delegate_permission/common.handle_all_urls'))
    throw new Error('relation must delegate handle_all_urls');
  if (!l.target || l.target.namespace !== 'android_app') throw new Error('target.namespace must be android_app');
});
t('A02', 'assetlinks package name matches the TWA manifest package id', () => {
  if (links[0].target.package_name !== twa.packageId)
    throw new Error(links[0].target.package_name + ' != ' + twa.packageId + ' - verification would fail');
});
t('A03', 'both signing fingerprints are present, formatted, and not left as placeholders', () => {
  const fps = links[0].target.sha256_cert_fingerprints || [];
  if (fps.length < 2) throw new Error('need the upload key AND the Play App Signing key');
  let pending = 0;
  for (const f of fps) {
    if (/REPLACE|PASTE|TODO|XXX/i.test(f)) { pending++; continue; }
    if (!SHA256_RE.test(f.replace(/:/g, ''))) throw new Error('not 32 bytes of hex: ' + f);
    if (!FINGERPRINT_RE.test(f))
      hmm('A03', 'fingerprint is not colon-grouped', 'Bubblewrap accepts it; Play Console shows it grouped');
  }
  if (pending)
    throw new Pending('both fingerprints are still placeholders - run `bubblewrap fingerprint` and paste them into playstore/assetlinks.json AND cms/.well-known/assetlinks.json');
});
t('A04', 'the shipped .well-known copy is identical to the kit copy', () => {
  const shipped = path.join(CMS, '.well-known', 'assetlinks.json');
  if (!fs.existsSync(shipped)) throw new Error('cms/.well-known/assetlinks.json does not exist - it must ship in the release ZIP');
  if (rd(shipped).trim() !== rd(path.join(HERE, 'assetlinks.json')).trim())
    throw new Error('the two files differ - paste the fingerprints in BOTH');
});
t('A05', 'a .htaccess in .well-known/ re-grants the JSON the parent .htaccess denies', () => {
  const p = path.join(CMS, '.well-known', '.htaccess');
  if (!fs.existsSync(p)) throw new Error('cms/.well-known/.htaccess is missing - Google would get a 403');
  const h = rd(p);
  if (!/Require\s+all\s+granted/i.test(h)) throw new Error('no "Require all granted"');
  if (!/json/.test(rd(path.join(CMS, '.htaccess'))))
    hmm('A05', 'parent .htaccess no longer denies *.json', 'the guard is still harmless, keep it');
});

/* --- 3 - the Bubblewrap TWA manifest --- */
t('T01', 'TWA manifest has every field Bubblewrap validates', () => {
  for (const k of ['packageId', 'host', 'name', 'startUrl', 'iconUrl', 'backgroundColor',
                   'themeColor', 'navigationColor', 'signingKey', 'appVersionCode', 'appVersion'])
    if (twa[k] === undefined || twa[k] === null || twa[k] === '') throw new Error('missing ' + k);
  if (!twa.host.includes('.')) throw new Error('host must be a bare domain');
  if (!twa.iconUrl.startsWith('https://')) throw new Error('iconUrl must be absolute https');
  if (!Number.isInteger(twa.appVersionCode) || twa.appVersionCode < 1) throw new Error('appVersionCode must be a positive integer');
  if (!twa.signingKey.path || !twa.signingKey.alias) throw new Error('signingKey needs path + alias');
});
t('T02', 'no credential material anywhere in the TWA manifest', () => {
  const raw = rd(path.join(HERE, 'twa-manifest.json'));
  for (const bad of ['keystorePassword', 'keyPassword', 'storePassword', 'BEGIN PRIVATE KEY', 'service_account'])
    if (raw.toLowerCase().includes(bad.toLowerCase()))
      throw new Error('found "' + bad + '" - passwords and keys are never committed');
  if (!twa.signingKey.path.endsWith('.keystore')) throw new Error('signingKey.path should be the keystore file');
});
t('T03', 'web push stays off until a push backend exists', () => {
  if (twa.enableNotifications !== false)
    throw new Error('enableNotifications must be false - no VAPID backend ships yet');
});

/* --- 4 - Play Store graphics --- */
t('G01', 'app icon is a 512x512 truecolour PNG', () => {
  const f = path.join(GRAPHICS, 'icon-512.png');
  if (!fs.existsSync(f)) throw new Error('run: python3 playstore/graphics/make-graphics.py');
  const s = pngSize(f);
  if (s.w !== 512 || s.h !== 512) throw new Error(s.w + 'x' + s.h);
});
t('G02', 'feature graphic is exactly 1024x500', () => {
  const f = path.join(GRAPHICS, 'feature-graphic-1024x500.png');
  if (!fs.existsSync(f)) throw new Error('run: python3 playstore/graphics/make-graphics.py');
  const s = pngSize(f);
  if (s.w !== 1024 || s.h !== 500) throw new Error(s.w + 'x' + s.h + ', Play needs 1024x500');
});
t('G03', 'at least 2 framed phone screenshots exist (Play will not accept fewer)', () => {
  const d = path.join(GRAPHICS, 'screenshots');
  const n = fs.existsSync(d) ? fs.readdirSync(d).filter(f => f.endsWith('.png')) : [];
  if (n.length < 2)
    throw new Pending('only ' + n.length + ' framed screenshot(s) - capture on a phone, see playstore/screenshots/CAPTURE.md');
  for (const f of n) {
    const s = pngSize(path.join(d, f));
    if (s.w < 320 || s.h < 320) throw new Error(f + ' is too small');
    if (s.w > 3840 || s.h > 3840) throw new Error(f + ' is over Play\'s 3840px cap');
  }
});

/* --- 5 - secrets hygiene --- */
t('S01', 'no keystore, service account or password file sits in the kit', () => {
  const walk = d => fs.readdirSync(d, {withFileTypes: true}).flatMap(e => {
    const p = path.join(d, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
  const bad = walk(HERE).filter(f => /\.(keystore|jks|p12|pfx)$/i.test(f) ||
    /service[-_]?account|upload-key|keystore\.properties/i.test(f));
  if (bad.length) throw new Error('committed secret material: ' + bad.map(f => path.basename(f)).join(', '));
});
t('S02', 'the generated Android project and the keystore are git-ignored', () => {
  const gi = fs.existsSync(path.join(ROOT, '.gitignore')) ? rd(path.join(ROOT, '.gitignore')) : '';
  for (const pat of ['*.keystore', '*.jks', 'playstore/twa/'])
    if (!gi.includes(pat))
      hmm('S02', '.gitignore has no "' + pat + '" rule', 'a keystore could be committed by accident');
});

console.log('');
console.log(pass + ' passed, ' + fail + ' failed, ' + warn + ' warning(s).');
if (fail) {
  console.log('');
  console.log('Fix the FAIL lines above before building an AAB.');
  process.exit(1);
}
if (pending.length) {
  console.log('');
  console.log('The kit is consistent, but NOT ready to ship yet. Waiting on:');
  for (const p of pending) console.log('  - ' + p);
  process.exit(2);
}
console.log('The kit is internally consistent AND complete. The human steps in CHECKLIST.md still stand.');
process.exit(0);
