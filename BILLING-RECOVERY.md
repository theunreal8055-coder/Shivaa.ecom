# Shivaa Billing — Login ID & Password Recovery (Billing v13)

**Package:** `billing/dist/shivaa-billing-setup-13.zip` (9 files · 72,123 bytes · SHA-256 `0b72962b51eaf6f316431453294c3cac6af28d6888ec557ec64ecb4cee083f65`)

---

## 1. Your likely Billing ID on file right now

Your Billing Software (`https://shivaa.in/billing/`) uses an **email address** as its login ID (stored in the `billing_users` table in your Hostinger MySQL database `u486999505_Shivaa`):

- **Primary email on record:** `karan@shivaa.in` (recorded in the earlier billing reset report)
- **Shop admin email:** `admin@shivaa.in`

Passwords are stored as one-way `bcrypt` hashes (`$2y$...`), so an old password cannot be read back — it must be replaced with a new one.

---

## 2. Why recovery was blocked before (and what v13 fixes)

In Billing v1–v12:
1. The sign-in page (`https://shivaa.in/billing/`) had **no "Forgot ID or password?"** button.
2. Opening `https://shivaa.in/billing/install.php` and entering your Shop Admin Password checked `SELECT COUNT(*) FROM billing_users` — and because 1 account already existed, it refused to update the login (*"A billing login already existed, so it was left alone"*).

**Billing v13 fixes both:**
- **`https://shivaa.in/billing/` Sign-In screen** now has a **"Forgot ID or password?"** button right below **Sign in**:
  - Immediately displays a masked hint of the current email ID on file (e.g. `k***n@shivaa.in`).
  - **Option A — With your Shop Admin Password:** Enter your `shivaa.in` shop admin password to **Reveal your full Billing Email ID** or set a **new Billing Email ID & new Password** (10+ characters) and sign straight in.
  - **Option B — If you also forgot your Shop Admin Password (File Manager 1-file unlock):** The screen gives you a one-time filename (`billing-unlock-XXXXXXXXXXXX.txt`). Create that empty file inside `public_html/billing/` in Hostinger File Manager, then click **Reset ID & Password & Sign In** — no old password needed.
- **`https://shivaa.in/billing/install.php`** now also displays the current login ID hint and **updates** your existing billing login ID and password instead of skipping it.
- **Settings → Change login ID or password** now lets you change your login email ID as well as your password once signed in.
- None of your bills, parties, suppliers, rate cards, khata, or stock are touched.

---

## 3. How to apply Billing v13 (2 minutes on tablet or phone)

1. Download **`billing/dist/shivaa-billing-setup-13.zip`** from this repository.
2. Open **Hostinger hPanel → File Manager → `public_html/`**.
3. Upload `shivaa-billing-setup-13.zip` into `public_html/` and **Extract** it there (allow overwrite of the 9 files inside `public_html/billing/`).
4. Open **`https://shivaa.in/billing/`** and tap **"Forgot ID or password?"** (or open **`https://shivaa.in/billing/install.php`**):
   - Enter your **Shop admin password** (or create the empty `billing-unlock-….txt` file shown on the page in `public_html/billing/`),
   - Enter the **Billing login email (ID)** you want (or leave blank on the recovery screen to keep your current email ID),
   - Enter your **New billing password** (at least 10 characters) twice,
   - Tap **Reset ID & Password & Sign In**.
