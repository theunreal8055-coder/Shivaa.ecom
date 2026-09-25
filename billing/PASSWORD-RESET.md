# Billing password reset — 2026-09-25T07:26:38Z

Hash applied: `$2b$10$…` (bcrypt, cost 10). The plaintext
password is NOT recorded here and NOT in this file's history.

## 1. Fetch DATABASE_URL from the vendor drop

downloaded ok
using .env at /hbuilds/current/nodejs/.env
DATABASE_URL length: 150 chars · scheme: postgresql
host: ep-wispy-credit-avlkoqmk-pooler.c-11.us-east-1.aws.neon.tech

## 2. Apply

RESULT: FAILED (exit 1)

```
node:internal/modules/package_json_reader:314
  throw new ERR_MODULE_NOT_FOUND(packageName, fileURLToPath(base), null);
        ^

Error [ERR_MODULE_NOT_FOUND]: Cannot find package '@neondatabase/serverless' imported from /tmp/reset.mjs
    at Object.getPackageJSONURL (node:internal/modules/package_json_reader:314:9)
    at packageResolve (node:internal/modules/esm/resolve:768:81)
    at moduleResolve (node:internal/modules/esm/resolve:855:18)
    at defaultResolve (node:internal/modules/esm/resolve:985:11)
    at #cachedDefaultResolve (node:internal/modules/esm/loader:747:20)
    at ModuleLoader.resolve (node:internal/modules/esm/loader:724:38)
    at ModuleLoader.getModuleJobForImport (node:internal/modules/esm/loader:320:38)
    at onImport.tracePromise.__proto__ (node:internal/modules/esm/loader:680:36)
    at TracingChannel.tracePromise (node:diagnostics_channel:350:14)
    at ModuleLoader.import (node:internal/modules/esm/loader:679:21) {
  code: 'ERR_MODULE_NOT_FOUND'
}

Node.js v22.23.2
```
