# SHIVAA v142 — Automatic Guest Checkout (One-Tap Buy)

**Built on arena branch `arena/01a0b3ff-shivaa-ecom`, commit `6e8200d` → next.**

---

## What this does

Tapping **“Make It Yours”** (on a product page, for a visitor who is **not signed in**) now
places the order and opens Cashfree immediately — **no account, no address form, no shivaa.in OTP**.

- **Name, number, address and the saved payment method are verified on Cashfree’s own page.**
- The **only** thing the customer types there is their **UPI PIN** or **net-banking password**
  (or their card’s OTP, where their bank sends one). Nothing is charged by shivaa.in.
- No money → no “purchase”: shivaa.in places the order, Cashfree confirms the payment, and only
  then is the order marked Paid. That *is* the automatic checkout.

### The one honest limit (Cashfree’s rule, not ours)

A **first-time** number is verified **once** by Cashfree on its payment page — this is Cashfree’s
own security requirement and no website can switch it off. From the customer’s **second**
purchase onward, Cashfree already knows the number and even the number screen disappears.
(Truecaller works the same way: verify once, remember forever.)

**Returning customers** = literally tap → type UPI PIN → done.

---

## How it works (plain)

1. Visitor taps **Make It Yours** → the order is placed instantly (one item, the chosen size).
2. The browser hands straight to Cashfree’s One Click Checkout page.
3. Cashfree verifies the number, pre-fills name + address from its own 100M+ saved profiles,
   and shows the cart summary. The customer types their UPI PIN / net-banking password.
4. Cashfree confirms payment; shivaa.in reads the **verified** name, number and address back
   and stores them on the order (`cfCheckout`) — shown to the owner **alongside** what was typed,
   never over it, before dispatch.
5. The order page shows the receipt automatically.

---

## Switch ON / instant rollback

**Admin → Settings → Payments → “⚡ Automatic Guest Checkout (One-Tap Buy)”.**

- It **only takes effect** when **all three** are true:
  1. the switch is ticked,
  2. Cashfree is connected (App ID + Secret in the same panel, provider = Cashfree),
  3. **“Cashfree One Click Checkout”** (the switch above it) is ticked — and the product is
     actually activated in the **Cashfree Merchant Dashboard → Payment Gateway → PG Products → One Click Checkout**.
- **Rollback / safety net:** untick the box → the site behaves exactly like v141 (member checkout
  with login + address). There is no migration and nothing to undo in the data.

**Signed-in members are untouched** — they keep the normal checkout with their saved address.
The one-tap path is only for visitors who have not made an account.

---

## Files in this update (site-root layout, no `cms/` prefix)

| file         | what changed |
|--------------|--------------|
| `api.php`    | guest order gate (off by default), guest access PIN, per-order gateway-session cap, `pay/config` combined flag, Cashfree return carries the PIN |
| `js/app.js`  | express buyer + “One-Tap Buy” page, guest order page (fetch/pay/poll with PIN), member path untouched |
| `js/admin.js`| the new admin switch (+ dispatch/invoice prefer Cashfree’s verified address) |
| `index.html` | script stamps 141 → 142 |
| `sw.js`      | service-worker cache 141 → 142 |

`data/db.json` and `.htaccess` are **never** in the zip — your products, customers, orders,
photos and settings are not touched by this update.

---

## Install

1. Download `shivaa-update-v142.zip`.
2. Back up the 5 files above from the live site (or take your usual full backup first).
3. Upload/unzip into the **site root** (`public_html` / `www`), overwriting the same 5 files.
4. Open the site once with the dev-tools console? No — just **hard-refresh** (Ctrl/Cmd+Shift+R)
   — the version stamp forces the fresh files anyway.
5. **Admin → Settings → Payments**: confirm Cashfree is connected and One Click Checkout is on,
   then tick **Automatic Guest Checkout**. Test with one real ₹1 sandbox payment before going live.

## Verify

- Logged **out**, open any product → **Make It Yours** → the **One-Tap Buy** page appears →
  **Pay ₹…** opens Cashfree → pay with UPI/card/net-banking → the order page shows the receipt.
- As **admin**, open that order: the delivery address is marked **Cashfree-verified** (`cfCheckout`).
- Untick the switch → the old checkout returns for logged-out visitors (login prompt).

---

*Nothing in this update stores, logs or prints your Cashfree Secret Key — it stays in the
site’s admin settings and server-side calls only.*
