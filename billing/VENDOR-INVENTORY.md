# Billing vendor triage — 2026-09-25T06:47:00Z

Release tag: `billing-vendor-drop-1` · runner: Linux · ref: arena/01a0d70e-shivaa-ecom

## Download the release asset

RESULT: ok

```
+ mkdir -p /tmp/vendor
+ gh release download billing-vendor-drop-1 -D /tmp/vendor --clobber
+ ls -la /tmp/vendor
total 227212
drwxr-xr-x  2 runner runner      4096 Sep 25 06:47 .
drwxrwxrwt 14 root   root        4096 Sep 25 06:47 ..
-rw-r--r--  1 runner runner 232656032 Sep 25 06:47 lavenderblush-locust-296462.hostingersite.com.1.zip
+ sha256sum /tmp/vendor/lavenderblush-locust-296462.hostingersite.com.1.zip
4153c950d7e6357d4f322f3059bec98af001702eb3b7bcd4235367bcf414c40a  /tmp/vendor/lavenderblush-locust-296462.hostingersite.com.1.zip
```

## Extract

RESULT: ok

```
+ mkdir -p /tmp/x
++ ls /tmp/vendor/lavenderblush-locust-296462.hostingersite.com.1.zip
++ head -1
+ ZIP=/tmp/vendor/lavenderblush-locust-296462.hostingersite.com.1.zip
+ unzip -q -o /tmp/vendor/lavenderblush-locust-296462.hostingersite.com.1.zip -d /tmp/x
++ find /tmp/x -type f
++ wc -l
+ echo 'extracted files: 4255'
extracted files: 4255
+ ls -la /tmp/x
total 16
drwxr-xr-x  4 runner runner 4096 Sep 25 06:47 .
drwxrwxrwt 15 root   root   4096 Sep 25 06:47 ..
-rw-r--r--  1 runner runner    0 Aug 18 07:22 DO_NOT_UPLOAD_HERE
drwxr-xr-x  7 runner runner 4096 Aug 18 07:36 hbuilds
drwxr-xr-x  2 runner runner 4096 Aug 18 07:36 public_html
```

## Totals

RESULT: ok

```
files: 4255
bytes: 231130364
dirs:  893
```

## Top-level entries

RESULT: ok

```
total 16
drwxr-xr-x  4 runner runner 4096 Sep 25 06:47 .
drwxrwxrwt 15 root   root   4096 Sep 25 06:47 ..
-rw-r--r--  1 runner runner    0 Aug 18 07:22 DO_NOT_UPLOAD_HERE
drwxr-xr-x  7 runner runner 4096 Aug 18 07:36 hbuilds
drwxr-xr-x  2 runner runner 4096 Aug 18 07:36 public_html
```

## Directory tree (depth 3)

RESULT: ok

```
.
./hbuilds
./hbuilds/config
./hbuilds/current
./hbuilds/current/nodejs
./hbuilds/current/public_html
./hbuilds/last-source
./hbuilds/last-source/.cursor
./hbuilds/last-source/.next
./hbuilds/last-source/app
./hbuilds/last-source/components
./hbuilds/last-source/lib
./hbuilds/logs
./hbuilds/logs/01a013c8-36d6-7176-8a9d-964014b16550
./hbuilds/logs/01a013cb-b9f6-721a-b983-f56b5fd0d0cb
./hbuilds/versions
./hbuilds/versions/01a013cb-b9f6-721a-b983-f56b5fd0d0cb
./public_html
```

## By extension (count)

RESULT: ok

```
   3700 js
    401 json
     35 tsx
     30 ts
     22 cjs
     13 gz
      6 log
      6 html
      6 css
      4 node
      4 3
      3 htaccess
      3 env
      2 txt
      2 rsc
      2 old
      2 next/BUILD_ID
      2 meta
      1 rscinfo
      1 next/trace
      1 mjs
      1 md
      1 gitignore
      1 /hbuilds/versions/01a013cb-b9f6-721a-b983-f56b5fd0d0cb/nodejs/node_modules/next/dist/compiled/@vercel/nft/LICENSE
      1 /hbuilds/versions/01a013cb-b9f6-721a-b983-f56b5fd0d0cb/nodejs/node_modules/@img/sharp-linuxmusl-x64/LICENSE
      1 /hbuilds/versions/01a013cb-b9f6-721a-b983-f56b5fd0d0cb/nodejs/node_modules/@img/sharp-linux-x64/LICENSE
      1 /hbuilds/current/nodejs/node_modules/next/dist/compiled/@vercel/nft/LICENSE
      1 /hbuilds/current/nodejs/node_modules/@img/sharp-linuxmusl-x64/LICENSE
      1 /hbuilds/current/nodejs/node_modules/@img/sharp-linux-x64/LICENSE
      1 /DO_NOT_UPLOAD_HERE
```

## 40 largest files

RESULT: ok

```
16972992 ./hbuilds/versions/01a013cb-b9f6-721a-b983-f56b5fd0d0cb/nodejs/node_modules/@img/sharp-libvips-linuxmusl-x64/lib/libvips-cpp.so.8.17.3
16972992 ./hbuilds/current/nodejs/node_modules/@img/sharp-libvips-linuxmusl-x64/lib/libvips-cpp.so.8.17.3
16645008 ./hbuilds/versions/01a013cb-b9f6-721a-b983-f56b5fd0d0cb/nodejs/node_modules/@img/sharp-libvips-linux-x64/lib/libvips-cpp.so.8.17.3
16645008 ./hbuilds/current/nodejs/node_modules/@img/sharp-libvips-linux-x64/lib/libvips-cpp.so.8.17.3
14542131 ./hbuilds/last-source/.next/cache/webpack/client-development/1.pack.gz
10513463 ./hbuilds/last-source/.next/cache/webpack/server-development/2.pack.gz
9770054 ./hbuilds/last-source/.next/cache/webpack/server-development/0.pack.gz
9112572 ./hbuilds/versions/01a013cb-b9f6-721a-b983-f56b5fd0d0cb/nodejs/node_modules/typescript/lib/typescript.js
9112572 ./hbuilds/current/nodejs/node_modules/typescript/lib/typescript.js
8979324 ./hbuilds/last-source/.next/server/vendor-chunks/next.js
7611349 ./hbuilds/last-source/.next/static/chunks/main-app.js
4301622 ./hbuilds/versions/01a013cb-b9f6-721a-b983-f56b5fd0d0cb/nodejs/node_modules/next/dist/server/capsize-font-metrics.json
4301622 ./hbuilds/current/nodejs/node_modules/next/dist/server/capsize-font-metrics.json
4012235 ./hbuilds/versions/01a013cb-b9f6-721a-b983-f56b5fd0d0cb/nodejs/node_modules/next/dist/compiled/amphtml-validator/validator_wasm.js
4012235 ./hbuilds/current/nodejs/node_modules/next/dist/compiled/amphtml-validator/validator_wasm.js
2663046 ./hbuilds/last-source/.next/server/vendor-chunks/drizzle-orm.js
1863839 ./hbuilds/last-source/.next/cache/webpack/edge-server-development/0.pack.gz
1840418 ./hbuilds/last-source/.next/cache/webpack/client-development/4.pack.gz
1762905 ./hbuilds/last-source/.next/static/chunks/app/(app)/parties/page.js
1722223 ./hbuilds/last-source/.next/cache/webpack/client-development/2.pack.gz
1676905 ./hbuilds/last-source/.next/static/chunks/app/(app)/page.js
1590223 ./hbuilds/last-source/.next/static/chunks/app/(app)/inventory/page.js
1538674 ./hbuilds/versions/01a013cb-b9f6-721a-b983-f56b5fd0d0cb/nodejs/node_modules/next/dist/compiled/babel-packages/packages-bundle.js
1538674 ./hbuilds/current/nodejs/node_modules/next/dist/compiled/babel-packages/packages-bundle.js
1536561 ./hbuilds/last-source/.next/cache/webpack/server-development/1.pack.gz
1359783 ./hbuilds/versions/01a013cb-b9f6-721a-b983-f56b5fd0d0cb/nodejs/node_modules/next/dist/compiled/babel/bundle.js
1359783 ./hbuilds/current/nodejs/node_modules/next/dist/compiled/babel/bundle.js
1263014 ./hbuilds/last-source/.next/server/middleware.js
1198587 ./hbuilds/last-source/.next/server/vendor-chunks/@neondatabase.js
847979 ./hbuilds/last-source/.next/cache/webpack/server-development/3.pack.gz
822498 ./hbuilds/versions/01a013cb-b9f6-721a-b983-f56b5fd0d0cb/nodejs/node_modules/next/dist/compiled/next-devtools/index.js
822498 ./hbuilds/current/nodejs/node_modules/next/dist/compiled/next-devtools/index.js
815117 ./hbuilds/versions/01a013cb-b9f6-721a-b983-f56b5fd0d0cb/nodejs/node_modules/next/dist/compiled/@next/font/dist/fontkit/index.js
815117 ./hbuilds/current/nodejs/node_modules/next/dist/compiled/@next/font/dist/fontkit/index.js
804573 ./hbuilds/last-source/.next/server/app/(app)/parties/page.js
800754 ./hbuilds/versions/01a013cb-b9f6-721a-b983-f56b5fd0d0cb/nodejs/node_modules/next/dist/compiled/@edge-runtime/primitives/load.js
800754 ./hbuilds/current/nodejs/node_modules/next/dist/compiled/@edge-runtime/primitives/load.js
741554 ./hbuilds/last-source/.next/server/app/(app)/inventory/page.js
704748 ./hbuilds/last-source/.next/server/app/(app)/page.js
617664 ./hbuilds/last-source/.next/server/app/(app)/reports/page.js
sort: write failed: 'standard output': Broken pipe
sort: write error
```

## PHP files (first 400 by path)

RESULT: ok

```
<no output>
```

## SQL dumps

RESULT: ok

```
<no output>
```

## Stack markers

RESULT: ok

```
763 ./hbuilds/config/package.json
362 ./hbuilds/current/nodejs/.env
763 ./hbuilds/current/nodejs/package.json
362 ./hbuilds/last-source/.env
20 ./hbuilds/last-source/.next/package.json
5911 ./hbuilds/last-source/README.md
763 ./hbuilds/last-source/package.json
```

## Credential-bearing files (LISTED ONLY — never committed)

RESULT: ok

```
362 ./hbuilds/current/nodejs/.env
408 ./hbuilds/current/nodejs/node_modules/caniuse-lite/data/features/credential-management.js
362 ./hbuilds/last-source/.env
362 ./hbuilds/versions/01a013cb-b9f6-721a-b983-f56b5fd0d0cb/nodejs/.env
408 ./hbuilds/versions/01a013cb-b9f6-721a-b983-f56b5fd0d0cb/nodejs/node_modules/caniuse-lite/data/features/credential-management.js
```

## App source tree (hbuilds/last-source, minus build output)

RESULT: ok

```
197 ./.cursor/hooks/state/continual-learning.json
362 ./.env
63 ./.gitignore
5911 ./README.md
2723 ./app/(app)/expenses/expense-form.tsx
3268 ./app/(app)/expenses/page.tsx
4552 ./app/(app)/inventory/item-form.tsx
5548 ./app/(app)/inventory/page.tsx
10772 ./app/(app)/invoices/[id]/page.tsx
1569 ./app/(app)/invoices/[id]/payment-form.tsx
1568 ./app/(app)/invoices/new/page.tsx
4801 ./app/(app)/invoices/page.tsx
4467 ./app/(app)/karigar/job-form.tsx
3978 ./app/(app)/karigar/page.tsx
2208 ./app/(app)/khata/[id]/entry-form.tsx
6959 ./app/(app)/khata/[id]/page.tsx
3849 ./app/(app)/khata/page.tsx
726 ./app/(app)/layout.tsx
7194 ./app/(app)/metal/[id]/page.tsx
1116 ./app/(app)/metal/new/page.tsx
2644 ./app/(app)/metal/page.tsx
5915 ./app/(app)/page.tsx
7932 ./app/(app)/parties/forms.tsx
5888 ./app/(app)/parties/page.tsx
6310 ./app/(app)/reports/page.tsx
2465 ./app/(app)/settings/forms.tsx
1571 ./app/(app)/settings/page.tsx
1682 ./app/(app)/vault/import-form.tsx
3546 ./app/(app)/vault/page.tsx
1595 ./app/api/backup/route.ts
4431 ./app/api/export/[entity]/route.ts
1508 ./app/globals.css
917 ./app/layout.tsx
802 ./app/login/form.tsx
537 ./app/login/page.tsx
1047 ./app/setup/form.tsx
566 ./app/setup/page.tsx
19537 ./components/invoice-builder.tsx
13661 ./components/metal-builder.tsx
1025 ./components/rates-form.tsx
6732 ./components/shell.tsx
9914 ./components/ui.tsx
189 ./drizzle.config.ts
2694 ./lib/actions/auth.ts
1484 ./lib/actions/expenses.ts
451 ./lib/actions/helpers.ts
1830 ./lib/actions/inventory.ts
6312 ./lib/actions/invoices.ts
2127 ./lib/actions/karigar.ts
1569 ./lib/actions/khata.ts
3185 ./lib/actions/metal.ts
4015 ./lib/actions/parties.ts
1541 ./lib/actions/settings.ts
6437 ./lib/actions/vault.ts
1589 ./lib/auth.ts
521 ./lib/db/index.ts
8229 ./lib/db/schema.ts
6543 ./lib/utils.ts
1032 ./middleware.ts
262 ./next-env.d.ts
104 ./next.config.ts
106465 ./package-lock.json
763 ./package.json
83 ./postcss.config.mjs
562 ./tsconfig.json
```

## public_html contents

RESULT: ok

```
559 ./.htaccess
```

## Stage the code-only subset

RESULT: ok

```
+ rm -rf /tmp/dest
+ mkdir -p /tmp/dest
+ cd /tmp/x
+ find . -type f -size -1048576c '(' -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.jsx' -o -name '*.mjs' -o -name '*.cjs' -o -name '*.json' -o -name '*.css' -o -name '*.scss' -o -name '*.html' -o -name '*.md' -o -name '*.yml' -o -name '*.yaml' -o -name '*.prisma' -o -name '*.sql' -o -name '*.txt' -o -name .htaccess -o -name .gitignore ')' -not -path '*/node_modules/*' -not -path '*/.next/*' -not -path '*/hbuilds/current/*' -not -path '*/hbuilds/versions/*' -not -path '*/.git/*'
+ sort
+ head -4000
+ grep -viE '(^|/)(config\.php|\.env[^/]*|wp-config[^/]*\.php|database\.php)$' /tmp/keep.txt
+ grep -viE 'credential|secret|\.pem$|\.key$'
++ wc -l
++ wc -l
+ echo 'candidates: 68  after secret filter: 68'
candidates: 68  after secret filter: 68
+ tar -cf - -T /tmp/keep2.txt
+ tar -xf - -C /tmp/dest
++ find /tmp/dest -type f
++ wc -l
+ echo 'staged files: 68'
staged files: 68
++ find /tmp/dest -type f -printf '%s\n'
++ awk '{s+=$1} END {print s+0}'
+ echo 'staged bytes: 439420'
staged bytes: 439420
+ find /tmp/dest -type f
+ sort
+ head -80
/tmp/dest/hbuilds/config/package-lock.json
/tmp/dest/hbuilds/config/package.json
/tmp/dest/hbuilds/config/preload-timestamp.js
/tmp/dest/hbuilds/last-source/.cursor/hooks/state/continual-learning.json
/tmp/dest/hbuilds/last-source/.gitignore
/tmp/dest/hbuilds/last-source/README.md
/tmp/dest/hbuilds/last-source/app/(app)/expenses/expense-form.tsx
/tmp/dest/hbuilds/last-source/app/(app)/expenses/page.tsx
/tmp/dest/hbuilds/last-source/app/(app)/inventory/item-form.tsx
/tmp/dest/hbuilds/last-source/app/(app)/inventory/page.tsx
/tmp/dest/hbuilds/last-source/app/(app)/invoices/[id]/page.tsx
/tmp/dest/hbuilds/last-source/app/(app)/invoices/[id]/payment-form.tsx
/tmp/dest/hbuilds/last-source/app/(app)/invoices/new/page.tsx
/tmp/dest/hbuilds/last-source/app/(app)/invoices/page.tsx
/tmp/dest/hbuilds/last-source/app/(app)/karigar/job-form.tsx
/tmp/dest/hbuilds/last-source/app/(app)/karigar/page.tsx
/tmp/dest/hbuilds/last-source/app/(app)/khata/[id]/entry-form.tsx
/tmp/dest/hbuilds/last-source/app/(app)/khata/[id]/page.tsx
/tmp/dest/hbuilds/last-source/app/(app)/khata/page.tsx
/tmp/dest/hbuilds/last-source/app/(app)/layout.tsx
/tmp/dest/hbuilds/last-source/app/(app)/metal/[id]/page.tsx
/tmp/dest/hbuilds/last-source/app/(app)/metal/new/page.tsx
/tmp/dest/hbuilds/last-source/app/(app)/metal/page.tsx
/tmp/dest/hbuilds/last-source/app/(app)/page.tsx
/tmp/dest/hbuilds/last-source/app/(app)/parties/forms.tsx
/tmp/dest/hbuilds/last-source/app/(app)/parties/page.tsx
/tmp/dest/hbuilds/last-source/app/(app)/reports/page.tsx
/tmp/dest/hbuilds/last-source/app/(app)/settings/forms.tsx
/tmp/dest/hbuilds/last-source/app/(app)/settings/page.tsx
/tmp/dest/hbuilds/last-source/app/(app)/vault/import-form.tsx
/tmp/dest/hbuilds/last-source/app/(app)/vault/page.tsx
/tmp/dest/hbuilds/last-source/app/api/backup/route.ts
/tmp/dest/hbuilds/last-source/app/api/export/[entity]/route.ts
/tmp/dest/hbuilds/last-source/app/globals.css
/tmp/dest/hbuilds/last-source/app/layout.tsx
/tmp/dest/hbuilds/last-source/app/login/form.tsx
/tmp/dest/hbuilds/last-source/app/login/page.tsx
/tmp/dest/hbuilds/last-source/app/setup/form.tsx
/tmp/dest/hbuilds/last-source/app/setup/page.tsx
/tmp/dest/hbuilds/last-source/components/invoice-builder.tsx
/tmp/dest/hbuilds/last-source/components/metal-builder.tsx
/tmp/dest/hbuilds/last-source/components/rates-form.tsx
/tmp/dest/hbuilds/last-source/components/shell.tsx
/tmp/dest/hbuilds/last-source/components/ui.tsx
/tmp/dest/hbuilds/last-source/drizzle.config.ts
/tmp/dest/hbuilds/last-source/lib/actions/auth.ts
/tmp/dest/hbuilds/last-source/lib/actions/expenses.ts
/tmp/dest/hbuilds/last-source/lib/actions/helpers.ts
/tmp/dest/hbuilds/last-source/lib/actions/inventory.ts
/tmp/dest/hbuilds/last-source/lib/actions/invoices.ts
/tmp/dest/hbuilds/last-source/lib/actions/karigar.ts
/tmp/dest/hbuilds/last-source/lib/actions/khata.ts
/tmp/dest/hbuilds/last-source/lib/actions/metal.ts
/tmp/dest/hbuilds/last-source/lib/actions/parties.ts
/tmp/dest/hbuilds/last-source/lib/actions/settings.ts
/tmp/dest/hbuilds/last-source/lib/actions/vault.ts
/tmp/dest/hbuilds/last-source/lib/auth.ts
/tmp/dest/hbuilds/last-source/lib/db/index.ts
/tmp/dest/hbuilds/last-source/lib/db/schema.ts
/tmp/dest/hbuilds/last-source/lib/utils.ts
/tmp/dest/hbuilds/last-source/middleware.ts
/tmp/dest/hbuilds/last-source/next-env.d.ts
/tmp/dest/hbuilds/last-source/next.config.ts
/tmp/dest/hbuilds/last-source/package-lock.json
/tmp/dest/hbuilds/last-source/package.json
/tmp/dest/hbuilds/last-source/postcss.config.mjs
/tmp/dest/hbuilds/last-source/tsconfig.json
/tmp/dest/public_html/.htaccess
```
