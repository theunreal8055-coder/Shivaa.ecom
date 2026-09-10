# SHIVAA — FRESH INSTALL v50  (everything included)

One zip, one upload, fully operational: **65 signature rings with full data,
every other category empty, zero sample products**, the Saathi ✦ chatbot,
email-delivered one-time codes, the self-arming recovery file, the AI-disclosure
line on every ring page, and the hardened `.htaccess` shields.

## FIRST LOGIN (change it immediately after)

| | |
|---|---|
| Admin sign-in page | `https://shivaa.in/#/admin` |
| Email | `admin@shivaa.in` |
| One-time first password | `Shivaa#2r8nz7qg` |

This password exists only in this document and in the zip. Change it at
**⚙ Settings → My sign-in password** the moment you are in.

## 1 · Wipe and upload (10 minutes)

1. hPanel → **Files → File Manager** → open `public_html`.
2. Select everything inside `public_html` → **Delete**. (Keep nothing of the old site.)
3. Click **Upload** → choose **`shivaa-FRESH-v50-full.zip`** → wait → close.
4. **Right-click the zip → Extract** → destination `/public_html` → **Extract**.
5. Confirm these are present: `index.html`, `api.php`, `mail.php`, the `js/` and
   `css/` folders, the `data/` folder, and — important — three dot-files:
   `.htaccess` (root), `data/.htaccess`, `uploads/.htaccess`. If your File Manager
   hides dot-files, switch on "show hidden files" and check they landed. **These are
   your security shields; do not delete them.**
6. Permissions: `data/` folder **755**, `uploads/` folder **755**.

## 2 · First sign-in (2 minutes)

7. Open `https://shivaa.in` on your phone. You should see the black-and-gold home
   page, the 65 rings under Shop → Rings, and a gold **✦ Ask Saathi** button at the
   bottom right.
8. Open `/#/admin` → sign in with the email + first password above.
9. **Settings → My sign-in password** → set your own. Done — the first password is dead.

## 3 · Give the rings their photographs (10 minutes)

The zip carries all data but not the 72 MB of photographs (upload limits). The bridge
fetches them from your GitHub repo and attaches them:

10. Follow **Part 4 of `CLICK-BY-CLICK-STEPS.md`** (secret folder →
    `ring_reset_bridge.php` → the steps). It finds the 65 rings already present and
    attaches 4 photographs each. Until then, cards show the Shivaa monogram
    placeholder — never a broken image.
11. If Step 2 warns there is nothing to delete on a fresh site, that is expected —
    Step 3 publishes/updates the 65 rings either way.

## 4 · Meet Saathi ✦ (your new salesperson)

- Bottom-right on mobile, right sidebar on laptop.
- It knows: every design, today's gold rate, hallmark/HUID, EMI, GST, shipping,
  returns, buyback, sizes, engraving, the Gold Finale, your address.
- It shows designs when asked — "jhumka under 50k", "show rings", "kundan".
- It DECIDES: "choose for me" → it asks occasion + budget → recommends 3 real pieces
  with reasons. Built for your 4,00,000-design future: searches go through the store API.
- "Talk to a human" hands the whole chat summary to your WhatsApp.

## 5 · What is protecting you (deep-scan results, applied)

- `data/` is fully private (the database can never be downloaded); `uploads/` can
  never execute code; backup/editor leftovers (`.bak`, `.zip`, `.log`…) are not served.
- Security headers on every response: CSP, HSTS, X-Frame-Options, nosniff, COOP/CORP.
- Login: 5 wrong tries → 15-minute lockout. Sessions: 192-bit random tokens, revoked
  on password change/reset. One-time codes go to EMAIL and are never shown on screen.
- Anonymous forms (contact/newsletter) capped at 10/hour per connection.
- Passwords stored as bcrypt; the recovery file stays disarmed until you arm it and
  deletes itself after one use.
- Removed: the invented "767 verified reviews" and fictional customer photos from the
  old home page. The site now shows only real reviews from your database — or clearly
  badged brand promises while the catalogue is new. Invented testimonials are the kind
  of thing that gets a jeweller in trouble; never put them back.

- After setup, delete `INSTALL-FRESH-v50.md` from the server (your `.htaccess`
  already refuses to serve it, but deleting it removes even that temptation).

## Honest notes

- Every file is byte-verified and 100+ static checks pass, but this sandbox has no
  browser and no PHP: your first open of the site is the real smoke test.
- Other categories (bangles, jhumkas…) intentionally show "being catalogued" with a
  Saathi button — that is the design, not a bug.
