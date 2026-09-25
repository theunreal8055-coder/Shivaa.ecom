# Shivaa Enterprise Vault

A jewellery-shop ERP rebuilt as a **Next.js 15** app with a **Neon Postgres** database, ready to deploy on **Vercel**. Replaces the old single-file localStorage app — same billing maths, but with real multi-device data, login, and printable bills.

---

## What's inside

| Module | What it does |
|---|---|
| **Dashboard** | Live gold/silver rates, stock valuation, month sales, outstanding udhaar, expenses, recent bills |
| **Inventory** | HUID, SKU, category, metal, purity, gross/less/stone/net weight, pieces, status (In Stock / Sold / Issued), search + filters |
| **Billing** | GST invoices and Estimates. Pick items from stock or add custom rows, old-metal exchange at tunch, multiple payments, discount (₹ or %), round-off, printable A4 bill with amount in words |
| **Khata / Udhaar** ⭐ | Per-customer credit ledger with running balance. Invoices and payments post automatically; manual udhaar and receipts can be added. Credit-limit warnings |
| **WhatsApp sharing** ⭐ | One tap to send an invoice summary or a payment reminder to the customer's WhatsApp |
| **Metal Billing** | Tunch/wastage fine-weight bills. Fine out = net + wastage%, fine in = gross × tunch%, per-metal balance. Printable |
| **Karigar Jobs** | Issue metal to artisans, track wastage, labour, due dates and overdue jobs |
| **Parties** | Customers (PAN, Aadhar, credit limit/days), suppliers (GSTIN, bank details), karigars |
| **Expenses** | Monthly expense book with category breakdown |
| **Reports** | Date-ranged sales, GST collected, expenses, dues, valuation + CSV exports of every table |
| **Secure Vault** | Full JSON backup download, import (also reads backups from the **old** localStorage app), activity log |
| **Settings** | Shop name/address/GSTIN/invoice prefix/GST %, live rates, password change |

⭐ = the two extra features you picked.

### Billing maths (unchanged from your original app)

```
item total   = net wt × rate + making
subtotal     = Σ item totals
discount     = flat ₹ or % of subtotal
taxable      = subtotal − discount
GST          = taxable × 3%   → split CGST 1.5% + SGST 1.5%   (GST bills only)
old metal    = given wt × tunch% → net wt × rate  (deducted)
grand total  = round(taxable + GST − old metal + round-off)
balance      = grand total − payments
```

Totals are re-computed on the server when the invoice is saved, so a tampered browser can't change a bill.

---

## Deploy (about 10 minutes)

### 1. Create the database

1. Go to **[neon.com](https://neon.com)** → sign up (free tier is plenty) → **Create project**.
2. Pick a region close to India (e.g. `AWS ap-southeast-1 Singapore`).
3. On the project dashboard, copy the **connection string**. It looks like:
   ```
   postgresql://user:password@ep-something-123456.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```

### 2. Push the code to GitHub

```bash
cd shivaa-erp
git init
git add .
git commit -m "Shivaa Enterprise Vault"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/shivaa-erp.git
git push -u origin main
```

### 3. Deploy on Vercel

1. Go to **[vercel.com](https://vercel.com)** → **Add New → Project** → import the repo.
2. Before clicking Deploy, open **Environment Variables** and add:

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | the Neon connection string from step 1 |
   | `AUTH_SECRET` | any long random string (see below) |

   Generate a secret:
   ```bash
   openssl rand -base64 32
   ```
   (Or use any random 32+ character string.)

3. Click **Deploy**. The build script runs `drizzle-kit push` first, so **all 12 tables are created automatically** — no manual SQL needed.

### 4. First run

1. Open your new URL (e.g. `shivaa-erp.vercel.app`).
2. You'll land on **/setup** — create the owner account (shop name, your name, email, password).
3. Log in and go to **Settings** to fill in address, GSTIN and invoice prefix.
4. Set today's **gold and silver rates** on the dashboard.

### 5. Bring across your old data (optional)

1. Open the old app, go to Secure Vault, download the JSON backup.
2. In the new app: **Secure Vault → Restore / Import** → choose that file.
3. Inventory, customers, suppliers, karigar jobs, expenses and rates are imported. (Old invoices were stored as summary rows only, so import them for reference and raise fresh bills going forward.)

---

## Running locally

```bash
npm install
cp .env.example .env.local     # then fill in DATABASE_URL and AUTH_SECRET
npm run db:push                # creates the tables
npm run dev                    # http://localhost:3000
```

Scripts:

| Command | Purpose |
|---|---|
| `npm run dev` | local dev server |
| `npm run build` | production build |
| `npm run db:push` | sync schema to the database |
| `npm run vercel-build` | what Vercel runs (push + build) |

---

## Notes

- **Mobile.** Every page is built mobile-first: a bottom tab bar (Dashboard, Inventory, Billing, Khata, More), full-width sheet modals, and tables that fold into cards on small screens. Add it to your phone's home screen and it behaves like an app.
- **Printing.** The print button on an invoice, metal bill or khata page prints just the document (A4, 12 mm margins) — the app chrome is hidden.
- **Login.** Single owner account, email + password, 7-day session cookie. Change the password any time in Settings. To add staff accounts later, add rows to the `users` table.
- **Backups.** Neon keeps its own point-in-time backups, but download a JSON backup from the Vault every so often too.
- **Free tier.** Neon's free database sleeps when idle, so the first page load after a quiet spell can take a couple of seconds. Upgrading Neon removes this.

---

## Tech

Next.js 15 (App Router, React 19, Server Actions) · Drizzle ORM · Neon serverless Postgres · Tailwind CSS v4 · jose (JWT sessions) · bcryptjs · lucide-react
