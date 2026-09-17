# SHIVAA v128 — MANUAL UPLOAD (Cashfree gateway, no auto-deploy needed)

This ZIP is the complete v128 payment update. Upload it yourself through
**Hostinger → hPanel → File Manager** (or FTP). It touches ONLY these files —
nothing else on the site changes.

## What is inside

```
cms/api.php                        ← backend: Cashfree order creation / verification /
                                     webhook / refunds  (PayU+PhonePe+Razorpay REMOVED)
cms/index.html                     ← release stamp v128
cms/sw.js                          ← service-worker cache v128
cms/js/app.js                      ← storefront: Cashfree checkout handoff
cms/js/admin.js                    ← admin: Cashfree settings card
cms/js/bot.js                      ← chatbot wording
cms/css/v118.css                   ← checkout overlay styling
cms/docs/CASHFREE-SETUP-GUIDE.md   ← YOUR setup manual (keys, webhook, testing)
CASHFREE-INTEGRATION.md            ← technical documentation
```

⚠️ **NEVER overwrite or delete your `data/` folder (db.json = orders, users,
rates) or `uploads/` folder. This ZIP does not contain them.**

## Step-by-step upload (Hostinger File Manager)

1. hPanel → **Files → File Manager** → open **public_html**
   (this is the folder that contains your live api.php, index.html, data/ …)
2. Upload & **replace** these 3 files in public_html:
   - `api.php`
   - `index.html`
   - `sw.js`
3. Open **public_html/js** → upload & replace:
   - `app.js`
   - `admin.js`
   - `bot.js`
4. Open **public_html/css** → upload & replace:
   - `v118.css`
5. Optional but recommended — open **public_html/docs** → upload:
   - `CASHFREE-SETUP-GUIDE.md`
6. **Delete these 2 old PayU files** (they are dead code now):
   - `public_html/payu.gateway.fixed.php`
   - `public_html/PAYU_BUGFIX_REPORT.md`
     (right-click each → Delete. If a file is not there, skip it.)
7. Do NOT touch: `.htaccess`, `data/`, `uploads/`, `images/`, anything else.

## Verify the upload worked

1. Open your website → press **Ctrl+Shift+R** (hard refresh — clears old cache).
2. Sign in as owner → admin panel → **Settings → Payments & gateway**.
3. You should now see the **🟣 Cashfree payment gateway** card with
   *App ID*, *Secret Key* and *Sandbox/Production* fields.
   If you still see the old orange PayU card, the files were not replaced —
   repeat steps 2–4 and hard-refresh again.

## Then configure Cashfree (you already have the keys)

Continue with `cms/docs/CASHFREE-SETUP-GUIDE.md` — Part C onward:
provider = Cashfree → paste App ID + Secret Key → choose environment →
Save → **Test Cashfree credentials** → add the webhook URL in the Cashfree
dashboard → test payment → go live.

**Do not paste your Secret Key into any chat or email — only into the admin
Settings page above.**
