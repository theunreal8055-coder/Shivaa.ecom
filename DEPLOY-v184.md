# DEPLOY v184 — Ring/product photo gallery swipe & control repair

**Built:** 28 Sep 2026 · **Source commit:** `81f1198f3da3b8563e2a8215b22fa7bc6e49fe55`
**Status:** update file ready; **NOT deployed**. Last verified live release in the handoff was **181 on 25 Sep**; a fresh live `/api/version` probe from this sandbox failed at TLS, so the current Hostinger release is **unknown**. Check before extracting. **No deployment without the owner's explicit yes.**

**File:** `shivaa-update-v184.zip` · **457,479 bytes** · SHA-256 `92434c8a3830ba3e64cc7df827cdfa66694076a19bdd03968a07db5f9215818f`.

## What changed

- Product photo gallery now keeps a single gesture owner, releases pointer capture on vertical intent, snaps back when a swipe is cancelled, and resets its drag state before capture-loss notifications. A touch-only fallback handles older iOS/WebViews without PointerEvent. Repeated swipes cycle through all four ring photos; arrows and dots continue working. Auto-advance remains available until the first manual interaction; playback video still pauses auto-advance.
- Dot **button hitboxes stay fixed**; only the visual dot expands. The arrow `:active` feedback keeps its `translateY(-50%)` centring, so pressing an arrow cannot move it down. The new `css/v184.css` loads last and is included in the service-worker shell.
- A gallery interval stops after its product page is left, instead of keeping a timer attached to an old page. The release handshake (index, app, API, SW) moves together to **184**. Media cache deliberately stays v168.

This is **cumulative from v181+**: it carries v182 catalogue/SQL + billing bridge and v183 safety repairs, as well as the v184 gallery fix. **Do not install older v182 or v183 ZIPs afterward.** If already on v182 or v183, v184 moves forward. If still on v181, v184 alone is the correct new ZIP; run its SQL reconciler as below.

## Seven files in the root-layout ZIP

`api.php` · `css/v184.css` · `index.html` · `js/app.js` · `js/admin.js` · `sw.js` · `upgrade-sql.php`

No `data/`, `uploads/`, `config.php`, `.htaccess`, billing-software folder, credentials or photo assets are packaged. This update does not alter product records, customer data or payments.

## Owner-controlled installation

1. Open `https://shivaa.in/api/version` and note `rel` and `stamp.matched`. **Stop if live `rel` is greater than 184**, or if you cannot check it. Take a full `public_html` backup in hPanel.
2. In hPanel File Manager, upload `shivaa-update-v184.zip` into **`public_html/`** and extract there, allowing overwrite of the seven named files. Do **not** extract an older update afterwards.
3. **If upgrading from v181**, open `https://shivaa.in/upgrade-sql.php` and run it with the CMS admin password on the site itself; inspect every reconciler tick. If already upgraded via v182/v183 it is idempotent; verify the existing MySQL health. Never send passwords in chat.
4. Open `/api/version` again: expect `rel:184`, `stamp.matched:true`, index/app/sw all 184. If using MySQL, `db.mode:"mysql"`, `mirrorBehind:false`. On a phone, close/reopen the site once so its service worker can activate.
5. Test an actual four-photo **ring**: swipe forward 8–12 times (it must keep cycling), then use Next, Previous and every dot. The controls must stay in place. Test vertical scrolling and another swipe afterward. Also check a one-photo product still renders.

If a check fails, stop and send the product URL, phone/browser and a short screen recording. Use the backup and JSON fallback plan under owner supervision; **never blindly overwrite a newer release with an older ZIP**.

## QA evidence and limitations

- `npm test`: green, including v184 real-page jsdom ring gallery **8/8**, v183 executed PHP **4/4**, v182 executed PHP **9/9**, deployment gate **20/20**, and older PHP/JS checks.
- `v118-check.js` **19/19** and `v164-pdp.js` **15/15** pass. New gallery test passed on both source and an extracted v184 ZIP over the v182 repository baseline; it repeats 20 pointer swipes, then tests cancellation, vertical scroll, arrows/dots and legacy touch-only mode.
- This sandbox could not connect to live Hostinger, and jsdom is not a real phone browser. The owner's device test is still required. No live deployment or SQL reconciliation was performed here.
