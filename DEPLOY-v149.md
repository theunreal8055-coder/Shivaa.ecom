# DEPLOY — shivaa-update-v149.zip  (extract over the live site, then done)

**Zip:** `shivaa-update-v149.zip` · **md5 `7b4b08912fe874ea6b153b8323b9361d`** · 4 files, root layout
(`api.php`, `index.html`, `sw.js`, `js/app.js`) — same drill as v147/v148: extract into the
**public_html ROOT** (File Manager → Extract, or unzip via SSH). `cms/js/admin.js` is NOT in
this zip — the admin screen keeps `?v=147` and needs nothing from you.

**Rollback:** extract `shivaa-update-v148.zip` (md5 `221a807059a121f919f35415f28db617`) over the
same 4 files. Nothing else in the DB changes; the Truecaller store keeps working unchanged.

## What v149 fixes (your two points, both addressed)

**1 · “Truecaller confirmed you, but reading the number hiccuped — and it just stays there.”**
Your live doctor gave the exact cause: `"lastOk":0, "lastError":"profile had no Indian mobile
number"` — Truecaller answered, our server fetched the profile fine, and the number was simply
hid under a JSON key the old reader never checked. Now:
- The profile is read by a **deep recursive extractor** (every Truecaller shape: nested `data:{}`,
  `phones[]`, `phoneNumbers[]`, `msisdn`, `+91 098765 43210`-style prefixes), plus a check of the
  callback body itself.
- If the read still fails, **the server quietly retries its own fetch with the same token**
  (new `/api/auth/truecaller/refetch`, one try per 12 s) — a transient hiccup no longer costs the
  customer a re-tap.
- The “Try again” state only appears if BOTH reads fail, and the doctor now logs the profile’s
  **key names** — so the next live test tells us everything in one look.

**2 · “Why do you even open this page — they should directly go to Cashfree.”**
Honest constraint first: the Cashfree page is hosted by Cashfree — no third-party script
(including Truecaller) can run on it. So instead of putting the tap on their page, **the
waiting page is gone**: tap **Make It Yours** or cart **Proceed to Checkout** → the Truecaller
sheet opens right there (small pill, no navigation) → the verified number arrives at our server
→ the order is placed silently → **the first page the customer loads is Cashfree**. If anything
declines (Not now / no app / iPhone / desktop / timeout), the Express page takes over with the
same verification still in flight, and typing remains the fallback — exactly the v148 page,
now fallback-only.

## After extracting — 60-second test
1. Open the site on your Android, **pull-to-refresh once** (the new shell installs:
   `sw.js` → `shivaa-shell-v149`).
2. Product page → **Make It Yours**: you should NOT see any checkout page — a small dark pill
   at the bottom says “Opening Truecaller…”. Confirm in the Truecaller app (take your time —
   the watch runs ~9 minutes). The pill itself should place the order and land you on Cashfree.
3. If the number lands late, it should still buy. If the server read ever fails again, watch the
   pill/Express card for **“our second read of the number came through”** — that’s v149 rescuing
   it by itself.
4. Admin → Payments → Truecaller: the doctor now also records `lastKind:"refetch"` attempts.

**Live stamps when deployed:** index `__SHIVAA_REL=149` · `sw.js` `SHELL='shivaa-shell-v149'`
+ precache `'/js/app.js?v=149'` · `js/app.js` `APP_REL = 149`.
`/api/auth/truecaller/config` additionally answers the same as before — and after a tap you may
see `lastKind:"refetch"`, which exists only in v149.
