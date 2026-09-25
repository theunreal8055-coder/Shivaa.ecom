# Billing vendor triage — 2026-09-25T06:43:11Z

Release tag: `billing-vendor-drop-1` · runner: Linux · ref: arena/01a0d70e-shivaa-ecom

## Download the release asset

RESULT: ok

```
+ mkdir -p /tmp/vendor
+ gh release download billing-vendor-drop-1 -D /tmp/vendor --clobber
+ ls -la /tmp/vendor
total 227212
drwxr-xr-x  2 runner runner      4096 Sep 25 06:43 .
drwxrwxrwt 14 root   root        4096 Sep 25 06:43 ..
-rw-r--r--  1 runner runner 232656032 Sep 25 06:43 lavenderblush-locust-296462.hostingersite.com.1.zip
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
drwxr-xr-x  4 runner runner 4096 Sep 25 06:43 .
drwxrwxrwt 15 root   root   4096 Sep 25 06:43 ..
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
drwxr-xr-x  4 runner runner 4096 Sep 25 06:43 .
drwxrwxrwt 15 root   root   4096 Sep 25 06:43 ..
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

## Stage the code-only subset

RESULT: ok

```
+ rm -rf /tmp/dest
+ mkdir -p /tmp/dest
+ cd /tmp/x
+ find . -type f -size -1M '(' -name '*.php' -o -name '*.js' -o -name '*.mjs' -o -name '*.css' -o -name '*.scss' -o -name '*.html' -o -name '*.htm' -o -name '*.json' -o -name '*.sql' -o -name '*.md' -o -name '*.yml' -o -name '*.yaml' -o -name '*.xml' -o -name '*.ini' -o -name '*.twig' -o -name '*.sh' -o -name .htaccess ')' -not -path '*/node_modules/*' -not -path '*/vendor/*' -not -path '*/.git/*' -not -path '*/uploads/*' -not -path '*/images/*' -not -path '*/fonts/*' -not -path '*/cache/*'
+ sort
+ head -4000
+ grep -viE '(^|/)(config\.php|\.env[^/]*|wp-config[^/]*\.php|database\.php)$' /tmp/keep.txt
+ grep -viE 'credential|secret|\.pem$|\.key$'
+ true
++ wc -l
++ wc -l
+ echo 'candidates: 0  after secret filter: 0'
candidates: 0  after secret filter: 0
+ tar -cf - -T /tmp/keep2.txt
+ tar -xf - -C /tmp/dest
++ find /tmp/dest -type f
++ wc -l
+ echo 'staged files: 0'
staged files: 0
++ find /tmp/dest -type f -printf '%s\n'
++ awk '{s+=$1} END {print s+0}'
+ echo 'staged bytes: 0'
staged bytes: 0
```
