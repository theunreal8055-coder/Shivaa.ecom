# Billing password reset — 2026-09-25T07:28:35Z

Hash applied: `$2b$10$…` (bcrypt, cost 10). The plaintext
password is NOT recorded here and NOT in this file's history.

## 1. Fetch DATABASE_URL from the vendor drop

downloaded ok
using .env at /hbuilds/current/nodejs/.env
DATABASE_URL length: 150 chars · scheme: postgresql
host: ep-wispy-credit-avlkoqmk-pooler.c-11.us-east-1.aws.neon.tech

## 2. Apply

npm install:

```

added 1 package in 2s
```
RESULT: ok

```
TABLES: artisans, audit_logs, b2b_deals, customers, deals, expenses, inventory_items, invoices, karigar_jobs, ledger_entries, metal_invoices, settings, suppliers, users
USERS BEFORE (1): [{"id":1,"email":"karan@shivaa.in","name":"Karan"}]
ROWS UPDATED: 1
USERS AFTER: [{"id":1,"email":"karan@shivaa.in","prefix":"$2b$10$","len":60}]
```
