# AGENT HANDOFF — read this first, every new chat (updated 19 Sep 2026 — **v150 TRUECALLER ENDPOINT FIX + SELF-REPORTING DOCTOR (zip 94c5928…, UNDEPLOYED until owner extracts; prior v149 INSTANT ONE-TAP + SELF-HEALING PROFILE READ — built + 100% green + zip ready (UNDEPLOYED until the owner extracts; v148 underneath it is ✅ LIVE)** (zip `shivaa-update-v148.zip` md5 `221a807059a121f919f35415f28db617`, 4 files: api.php/index.html/sw.js/js/app.js — admin.js untouched keeps its 147 stamp). It exists because the owner's LIVE test of v147 showed the Truecaller consent REACHING THE SERVER (doctor recorded lastKind=consent minutes after the tap) while the page had already stopped listening at 40 s — v148 waits up to 9 minutes, re-attaches, and fails LOUD. Underneath it, **v147 TRUECALLER ONE TAP → CASHFREE (zero typing)** is **✅ LIVE: owner extracted 19 Sep; agent verified the stamps on the site and a REAL Truecaller consent callback was recorded by the deployed doctor** (console Callback URL IS set — apex `https://shivaa.in/api/auth/truecaller/callback`); zip `shivaa-update-v147.zip` md5 `5e8e5af76d31aac5bcea7eed761aad4c`, 5 files; PR #74 OPEN, unmerged until the owner instructs. **PHP EXECUTION GATE NOW EXISTS** — `@php-wasm/node` runs real api.php in-sandbox; "no PHP binary" is obsolete. Previous 19 Sep 2026 — **v146** cart-checkout crash + Truecaller rebuilt (LIVE). Live was v144. Zip `shivaa-update-v146.zip` md5 `a78fbe885808a4e8cdc9a66210a50674`, 5 files. Previous 18 Sep 2026 — ✅ v142 AUTOMATIC GUEST CHECKOUT **MERGED TO `main` AS PR #71** on the owner's instruction. "Make It Yours" is now a one-tap purchase: order placed instantly, Cashfree auto-verifies name/number/address + saved payment method, the customer types only their UPI PIN / net-banking password. Ships **OFF by default** — switch at Admin → Settings → Payments → "⚡ Automatic Guest Checkout (One-Tap Buy)". Deliverable `shivaa-update-v142.zip`, md5 `87f56fb46b63af6a4b793ca95abad6a9`, 6 files. **⚠ A live Cashfree sandbox ₹1 order is STILL OWED.** Previous: ✅ v139 SHOP-EXPERIENCE PASS MERGED as PR #70 (five owner reports; whether it auto-deployed is unconfirmed — `gh secret list` 403, ask the owner). Previous: ✅ PAYMENT CORRECTNESS PASS MERGED to `main` as PR #69: v135 → v138.)

**Owner:** Shivaa Jewellers (shivaa.in), non-technical. Talk plainly, no jargon
dumps. **Repo = single source of truth.** Live site = PHP CMS in `cms/`
(v37) + JSON db on Hostinger; batch automation in `pipeline/`; current batch
workspace pattern `demo65/` (one folder per supplier batch).

## ✅ NEWEST — v150 TRUECALLER ENDPOINT NORMALISATION + SELF-REPORTING DOCTOR (19 Sep 2026, branch `arena/01a0b86b-shivaa-ecom`, **UNDEPLOYED — owner extracts `shivaa-update-v150.zip`, md5 `94c592867c2373519d9ea640f7f6713f`, into `public_html/cms/`**)
The owner confirmed v149's one-tap works live (tap → Truecaller sheet, no page) but the number read still hiccuped. The LIVE DOCTOR found the root: HTTP 200 + valid JSON with zero digits = the fetch hit the BARE PROFILE HOST; the documented endpoint is that host + `/v1/default`. v150 = cms/api.php ONLY (page byte-identical to v149 — the verified flow cannot regress): tc_norm_endpoint normalises bare/root URLs to `/v1/default` BEFORE allowlist+fetch (real paths/queries untouched, junk still refused); the GET sends a compatible UA and follows ≤2 redirects; failures log lastEp + a digit-masked, token-masked body snippet in the PUBLIC doctor (one tap = the whole story, no ssh); JSON-inside-a-string payloads parse; the refetch keeps its own lastRefetchError so consent evidence survives. QA: 16/16 static + 11/11 EXECUTED via php-wasm (it caught a real #-delimiter bug every static gate accepted — shipped regexes now require run-cases); legacy suites v117–v124/v140–v142 stamp pins converted to numeric FLOORS — the last release any stamp bump can break them; 19 legacy + patience + instant + autobuy + php-run all green on source and on a fresh main+v147..v150-zip overlay incl. v125 owner-lock. Verify live: api/health "release":150, config shows lastEp; rollback = v149 zip 7b4b089…

**Status at session close (19 Sep):** commits `be2c57c` → `3c0cf59` → `589c34a` pushed on the branch; every suite green on source and on the rebuilt overlay (122/122 static + 11/11 executed, incl. v125 owner-lock); owner handed the root cause, the deploy plan and the standing deal that ONE `api/auth/truecaller/config` fetch explains any residual hiccup (lastEp + [keys:] + masked snippet). PR #74 OPEN, unmerged, on the owner's word. **If you are the next agent: read the ▶ NEXT-CHAT PLAYBOOK in ARENA-STATE.md §1 first — it encodes the deploy-confirmed path, the residual-hiccup diagnosis path, and the full release ritual (stamps, suites, overlay rebuild, zip-from-HEAD).**

## v149 INSTANT ONE-TAP + SELF-HEALING PROFILE READ (19 Sep 2026, branch `arena/01a0b86b-shivaa-ecom`, **UNDEPLOYED — owner extracts `shivaa-update-v149.zip` (md5 `7b4b08912fe874ea6b153b8323b9361d`, 4 files) when he says so**)
The owner's live test of v148 said two things and both are answered here. **(1) The hiccup:** "Truecaller confirmed you, but reading the number hiccuped" — and the LIVE doctor caught the exact cause: `lastOk:0, lastError:"profile had no Indian mobile number"`. Truecaller HAD confirmed; our server fetched a 200 profile whose number sat under a shape v148's reader never checked. v149 replaces the two-key lookup with `tc_profile_extract` — a bounded deep walk (nesting, `data:{}`, `phoneNumbers[]`, `msisdn`, `+91 0…`, `00-91`…) plus a callback-BODY fallback, and adds a **server-side second look**: failed entries keep the still-valid token (`tk`/`ep`, file 0600) and a new public `auth/truecaller/refetch` (12 s throttle) re-reads OUR side BEFORE the customer is ever asked to re-tap. The doctor's `lastError` now also logs the profile's key names, so any future gap is diagnosed by one live tap. **(2) The flow:** "why do you even open this page … they should directly go to cashfree … only on that page". Hard truth: Cashfree's checkout page belongs to Cashfree — no third-party script can run on it, so Truecaller cannot live there; what v149 does instead is REMOVE every intermediate page: tapping **Make It Yours** or the cart's **Proceed to Checkout** (data-tcinstant ×3, upgraded only on Android+Truecaller with a warm config cache) fires the deep link IN PLACE behind a floating pill; the verified number answers from OUR server, the guest order is placed silently (boundary address + tcNonce) and the first page the customer loads is Cashfree. Rejected/failed/timeout hands off to the Express page with the SAME nonce re-attached (v148's card + typed fallback untouched), and an Android tab reclaimed mid-round-trip RESUMES at boot. QA: `v149-check.js` 31/31, `v149-php-run.js` 12/12 (the reader EXECUTED on eight real-world shapes — it caught a 14-digit `0091` prefix off-by-one, fixed), `v149-tc-instant.js` 20/20 (in-place buy · refetch rescue buys WITHOUT a re-tap · named desktop control = v148 behaviour · resume completes on the same nonce); ALL 19 legacy suites + patience 16/16 + autobuy 14/14 + pay-audit 10/10 green on source and on the stacked overlay main+v147+v148+v149. Stamps 149×4; admin loader stays ?v=147 (admin.js untouched). **v148 suite maintenance:** the clock-compression hook is now `/g` (two engines) and the stamp/terminal-state pins are numeric/shape-insensitive — keep new gates fix-forward like this.

## v148 TRUECALLER PATIENCE (19 Sep 2026, branch `arena/01a0b86b-shivaa-ecom`, **✅ LIVE — owner extracted the zip; agent live-verified the sw.js v148 stamp on www.shivaa.in**)

**Owner's live-test report, verbatim (19 Sep, after extracting v147):** *"…when I click verify with Truecaller then it is shows my number and when I click on that number … it tells me that Truecaller is open tap continue on your number this page does the rest and nothing happens … when I manually enter my number and click on make it yours then the cash free payment gateway opens that means Truecaller is not still working."*

**Diagnosis (not a guess — the live doctor proved it):** Truecaller's consent POST reached `shivaa.in` and was stored (`lastKind=consent`, 13:48:40 IST — minutes after the tap). The page had stopped polling at ~40 s (v147's hard `polls >= 55 → fallback`). Consent arriving late = silently wasted. The order/Cashfree path was never at fault.

**The repair (v148, all gated):**
* patient watch: 40 s at 700 ms, then 3.5 s polls to a 9-min deadline (Truecaller's own TTL is 10); the typed-number hint appears mid-wait **without** killing the auto-continue — a minute-8 number still fills itself, places the order and opens Cashfree by itself;
* leaving One-Tap Buy mid-wait stops the poll (no hijack) and coming back RE-ARMS from the still-fresh pending nonce (window 3→9 min, item restore matches);
* a server-side profile-read failure now stores a terminal `failed` state and the page SAYS SO with a fresh-nonce "Try Truecaller again" instead of spinning;
* api.php: profile-endpoint allowlist accepts real reply shapes (`?query`, bare `truecaller.com`) with identical strictness otherwise; config doctor exposes `lastOk` + sanitized `lastError`;
* every poll respects `placed` — no double-buy races.
* QA: NEW `v148-tc-patience.js` **16/16** jsdom (incl. NAMED CONTROL reproducing v147's give-up → places NOTHING) · `v147-php-run.js` **20/20** real PHP (4 new cases) · all 18 historical suites green on source AND on the v147-live+v148-zip overlay · **historical stamp pins converted to numeric/range — never re-pin**.
* Deploy = `DEPLOY-v148.md` (4 files, back up v147 copies first; test = the SAME tap flow the owner tried, now with minutes of slack). Rollback = restore the four v147 files.

## ✅ v147 TRUECALLER ONE TAP → STRAIGHT TO CASHFREE (19 Sep 2026, branch `arena/01a0b86b-shivaa-ecom`, tip `3e8d8b9`, **✅ LIVE — owner extracted 19 Sep; verified on-site; PR #74 still OPEN**)

**Owner ask, verbatim:** *"now the only issue is after Verify with Truecaller and Continue in the Truecaller app it is still asking the customer to type the 10 digit number … automatically truecaller take the customer to the cashfree page with prefill address in one click of Truecaller."*

**How it works after v147:** tap *Continue in the Truecaller app* → approve in the app → back in the browser the phone field **fills itself** (Truecaller's servers POST the verified number to our callback) and the order + Cashfree checkout **open by themselves**, address pre-filled. **Zero typing.** Typing survives only as fallback (no app installed / "Not now" / a host that swallows the POST).

| Piece | Where |
|---|---|
| Callback honours all 3 Truecaller messages (`flow_invoked` / consent / `user_rejected`); answers 2xx BEFORE the profile fetch; atomic per-nonce store + diagnostics | `cms/api.php` (`shv_tc_entry_*`, `auth/truecaller/callback`) |
| Verified phone **overrides** typed phone server-side; order tagged `truecaller:verified`; SSRF allowlist on the profile endpoint | `cms/api.php` (`POST /api/orders` tcNonce block) |
| One shared `doBuy()`; auto-wait poll + auto-fire; nonce/item survive tab-reload (localStorage); per-device phone memory | `cms/js/app.js` (`pages.express` + Truecaller widget) |
| Callback URL printed for the console + "Check Truecaller connection" doctor (`dataWritable`, `lastCallbackAt/lastKind`) | `cms/js/admin.js` (Payments → Truecaller) |
| Stamps 147/147/147 in lockstep; sw.js deliberately in the zip (same-version pair); v116.js stays `?v=142` | `cms/index.html`, `cms/sw.js`, `cms/js/app.js` |

**QA — the big one:** `@php-wasm/node` now **EXECUTES the real api.php** in this sandbox (`tools/mega/smoke/v147-php-run.js`, 16/16 — it was never just parsed before; the old "no PHP binary" wall was a usage bug: set `emscriptenOptions.processId` when creating the PHP instance). Plus `v147-tc-autobuy.js` (14/14): a jsdom boot of the real storefront shell proving one tap → order placed with NOTHING typed → Cashfree hand-off, with a named regression control. All historical suites green on source AND on the **zip overlay**.

**Deploy:** `DEPLOY-v147.md`. Step 0 backup, 5 files into `public_html` ROOT, then **set the Truecaller console Callback URL** — without it the number never arrives and the page falls back to typing (today's behaviour). After deploy: phone test + admin doctor check. Rollback: restore v146 backups (`shivaa-update-v146.zip`).

**Things the next agent must not get wrong**
- **The Callback URL lives in Truecaller's console, not in our code.** Admin → Payments prints the exact string; developer.truecaller.com must match it.
- `lastCallbackAt` empty after a live tap = Truecaller's POST never reached the host (server-side block) — typed fallback still works; this is diagnostic, not a code bug.
- First-time numbers may still quick-verify **on Cashfree's own page** — Cashfree's rule, never promise around it.
- Desktop = web-popup flow = no push-back by design; typed entry stays there.
- `cms/data/tc-verify/` must stay writable (admin doctor shows `dataWritable`); callback route is lockless — **never add db_save() there**.

## ✅ NEWEST — v142 AUTOMATIC GUEST CHECKOUT (18 Sep 2026, branch `arena/01a0b3ff-shivaa-ecom`, **MERGED TO `main` AS PR #71** on the owner's instruction "update memory doc handoff and agent doc and merge the PR". Ships v140 → v141 → v142.)

**Owner brief, verbatim:** *"Make the most advanced and Fully automatic checkout, without even otp, still verifying the name number address and payment methods automatically — once a person clicks make it yours then it's automatically purchased, just the customer needs to fill their UPI pin or NetBanking password, everything else is automated."*

**How it works (switch ON, signed-out visitor):** tap **Make It Yours** → order placed instantly → browser goes **straight to Cashfree's page** → Cashfree auto-verifies name / number / address from its One Click Checkout registry and shows the saved payment method → the customer types **only** their UPI PIN / net-banking password → done. **Ships OFF by default** (Admin → Settings → Payments → "⚡ Automatic Guest Checkout (One-Tap Buy)"); untick = instant rollback, no migration.

### What shipped (all gated OFF until the owner switches it on)
| Piece | Where |
|---|---|
| one-tap buy page + hand-off to Cashfree | `cms/js/app.js` (`pdBuy` → `pages.express` → `payForOrder`), signed-out only |
| guest order gate + one-way access PIN | `cms/api.php` (id always `'guest'`; PIN = `substr(sha256(id\|createdAt\|entropy),0,16)`, never persisted, constant-time) |
| **prepaid-only, server-enforced** | `cms/api.php` — `if (!$u && $pm !== 'Online') jout(400,…)` kills crafted COD/WhatsApp |
| per-order gateway-session cap (3 guest / 12 member) | `cms/api.php` (`shv_cap_cf_create`) |
| admin switch + Cashfree-verified address on dispatch/invoice | `cms/js/admin.js` (prefers `o.cfCheckout.shipping`, badged) |
| release triple re-stamp 141→142 (v116/v117 lockstep) + admin bundle `?v=142` | `cms/index.html`, `cms/js/app.js`, `cms/sw.js` |

### Verification (all run before the PR opened)
13 gate suites (v113b 32/32 … **v142 13/13**) · php-sweep **208 routes · 0 exceptions** · `api.php` parse-clean vs a **proven broken negative control** · pay-audit **10/10 invariants** (2/18 pre-existing findings unchanged) · jsdom end-to-end (PDP → Make It Yours → One-Tap Buy → guest order → poller) **zero errors**.

### Deploy → rollback
`shivaa-update-v142.zip` (md5 `87f56fb46b63af6a4b793ca95abad6a9`, 6 files) into `public_html` ROOT. Rollback = untick the switch (or redeploy the prior `shivaa-update-v141.zip`). Supersedes v140/v141 zips.

### Things the next agent must not get wrong
- **A live Cashfree sandbox ₹1 order is STILL OWED** — no PHP binary in the sandbox; the path is parse-checked + jsdom-exercised only. `cfOcc` ships OFF.
- **A brand-new number must verify ONCE on Cashfree's own page** — that is Cashfree's security rule, not a site limitation. Do not promise "zero OTP for every number ever".
- **Never print the Cashfree secret** — it belongs only in the admin settings.
- Guests can NEVER use member coupons / loyalty points / rate lock, and no account is created (id stays `'guest'`).

## ✅ NEWEST — v139 SHOP-EXPERIENCE PASS (18 Sep 2026, branch `arena/01a0b366-shivaa-ecom`, **MERGED TO `main` AS PR #70** — the owner's hold *"don't merge the PR until you are told to do so"* was **lifted** at session close with *"perge this PR to main"*, so the merge is authorised and spent. Merged forward-only as a merge commit per owner law.)

**Owner's five reports, verbatim:** *"the check out button doesn't work and
doesn't take us to the payment page"* · *"when you click on any category and go
to that category page then still that 17 photos are on the page the images are
only there"* · *"place order button is always there on the screen in the phone
… place order button should be down"* · *"I have selected the one tab quick
check out button from the cash free but I cannot see … that the information is
pre filled or the addresses are prefilled or the numbers are automatically
verified"* · *"the update popup that keeps coming on the page is not needed"*.

**The fifth one was two popups, not one** — `app.js`'s "New version available ·
Update now" toast with its `confirm()`, and `js/v107.js`'s "Update available ·
Reload / Dismiss" prompt that came back **every 30 minutes**. Both **deleted**,
not restyled: a service-worker update now installs silently, waits for
`visibilitychange` → *hidden*, and swaps then — and a form-safety check means a
filled checkout/payment/login form is **never** reloaded over. `js/v107.js`
therefore ships in the zip **even though the release number did not move**,
because its bytes changed and its `?v=139` had never been served to anybody yet.
**That exception is valid only for an undeployed release** — on a deployed one
the immutable-`?v=` rule wins and every changed file's stamp must be bumped.

**Every one was reproduced and measured before it was fixed** — the probes are
kept in the repo: `tools/mega/smoke/probe-owner-issues.js` and
`probe-control-timing.js`.

### The lesson this release adds to the standing list

**A tap that looks dead is usually a tap being out-raced — and the same defect
can live in every overlay, not just the two you fixed.** v127 removed the
dismiss-first `history.back()` race from `#mainNav` and `#searchSugg` and was
recorded as complete. The bag drawer (`#cartDrawer`) had the identical wiring
and was never in scope, so the shop's **most important button** stayed broken
for two releases. Measured event order before the fix:

```
history.back() @hash=#/      ← queued while the URL is still the page you came from
popstate @hash=#/checkout
hashchange -> #/checkout     backs=1
```

**Standing review question #2 for this codebase** (alongside *"what happens to
it if the purchase never completes?"*): **every** overlay that pushes a history
entry — modal, bag, search, menu, PDF — must be asked *"who owns a tap on a link
inside me?"*. If the answer is "the browser's default action", it is a bug
waiting for the traversal to win.

### What shipped

| Fix | Where |
|---|---|
| the bag drawer owns its own taps (navigate → arm `__shvNavigating` → close) | **new `cms/js/v139.js`**, capture phase, loaded last |
| a filtered category page renders a text chip strip, not 20 photographs | `catChipsHTML()` + the `filtered` branch in `pages.shop` |
| the drawer's 17-category list folds shut on navigation | `foldCatList()` in `js/v139.js` |
| the payment page's Place Order bar joins the page flow | `mcta-inline` + `css/v139.css` (`position: static`) |
| Cashfree One Click Checkout: `products.one_click_checkout` + `cart_details` + Get Order Extended | `cashfree_occ_block()` / `cashfree_fetch_order_extended()` / `cashfree_occ_capture()` in `cms/api.php`, switches in `cms/js/admin.js` |
| the shop's own address prefill (the half Cashfree can never do) | `pages.checkout` reads the v84 address book, chips, `shv_lastAddr`, "save this address" |

### 5 · the endless "update" popup (the owner's follow-up message)

*"it says update, when we press update it again pops up and says update, i don't
want these popups of update to be shown, website should be updated automatically
from back-end."* There were **two** popups — `js/app.js`'s `#swUpdate` (*"A newer,
better Shivaa is ready"*) and `js/v107.js`'s `#v107Upd` (*"A fresher Shivaa is
ready"*). The loop's exact cause: the button ran `postMessage('SKIP_WAITING')`
and then `location.reload()` **immediately** — `postMessage` only *asks*, so the
reloaded page found the worker still waiting and offered the same button again.
The `prompted` flag could not help: it is a variable, and every reload starts a
fresh one. Both popups are **deleted**. `sw.js` already self-activates
(`skipWaiting()` in its own install handler + `clients.claim()` on activate) and
the shell is network-first, so **no prompt was ever necessary** — it was asking
the customer to do something that had already happened. A waiting worker is now
activated silently and the swap reloads only while the tab is hidden, never over
a form, once per session, never offline.

**Standing review question #3 for this codebase:** *before adding any "please
update" prompt, check whether the thing already updates itself.* This one did.

### ⚠ Five things the next agent must not get wrong

1. **An OCC refusal must never block a payment.** The create-order call retries
   ONCE without `products`/`cart_details` and audit-logs
   `payment.cashfree-occ-fallback`. Do not "simplify" that away — it is the only
   thing standing between a rejected optional feature and a customer who cannot
   pay. `cfCheckout` is stored **alongside** the typed address, never over it.
2. **`cfOcc` defaults to OFF and must stay that way** until the owner confirms
   PG Products → One Click Checkout reads *Active* on the account. Ticking the
   box without an activated product just produces fallbacks.
3. **The forward-compat sweep has three shapes, and a stamp bump breaks all of
   them.** v139 broke 15 assertions across 9 gates until alternation `|138)`
   (47), quoted `'138'` (9) **and** bounded class `13[0-8]` (25) were all swept.
   A single regex sweep misses the third — this is the second time.
4. **A changed stamped file MUST move its `?v=`.** `.htaccess` serves `?v=`
   assets `immutable` for a year (line 53). v139 changed `js/v107.js`, so its
   stamp moved `?v=107 → ?v=139` in **both** `index.html` and the `sw.js`
   precache. Forget either half and returning phones keep the old file — and the
   old popup — forever. `v117-check.js` enforces precache == requested.
5. **v118's rail guarantee was re-pointed, not deleted.** Its "category rail
   photos eager-load on a phone" assertion now measures the *unfiltered* shop
   page, because a filtered page no longer has a rail. If that check ever fails
   again, the rail is gone from `#/shop` — that is a real regression.

### Verification

`v139-check.js` **56/56** (19 static · 33 live · 4 control) — including the
named regression control: strip `/js/v139.js` and the same tap **does** queue
`history.back()` at `hash=#/`. Full suite re-run **against the zip's own
extracted bytes**: v113b 32/32 · v117 27/27 · v118 19/19 · v119 27/27 · v120
24/24 · v121 14/14 · v122 22/22 · v123 14/14 · v124 20/20 · v125 25/27 · v127
26/27 · pay-audit 2/18 present · 10/10 invariants · php-sweep **207 routes · 0
exceptions**.

**Honest limit, stated twice because it matters:** jsdom performs no real
cross-document navigation, so the *visible* bounce on a phone is inferred from
the identical v127 mechanism (which the owner live-verified), **not measured
here** — the measured quantity is the queued traversal. And there is **still no
PHP binary in the sandbox**, so the Cashfree path was never executed: `api.php`
got a `php-parser` parse check (128 top-level nodes) proven against a
deliberately broken negative control, which is a parse check and **not** a run.

**Deliverable:** `shivaa-update-v139.zip` — md5 `cfd64d3ba65641a39140ec0c53533be7`,
8 files, root layout, all 16 fix markers grepped inside the built zip.
`DEPLOY-v139.md` carries the owner's install steps **and** the four dashboard
actions One Click Checkout needs from him.

### Forward baseline from here

**v125 + v127 + v135/v136/v137/v138 + v139.** Preserve all of it. v127 owns
`#mainNav` + `#searchSugg`; **v139 owns `#cartDrawer`** — two layers, two
overlays, never the same tap.

---

## ✅ NEWEST — v135 → v138 PAYMENT CORRECTNESS PASS — MERGED to `main` (18 Sep 2026, PR #69, branch `arena/01a0b25e-shivaa-ecom`)

**Owner's report that started it:** *"even if someone does not pay and comes back
silently then Shiva automatically issues invoices against but the right thing to be
done is when a customer pace then only we should issue invoice."* It had **not** been
fixed and was in **no** prior audit — it became finding **#25**. Chasing it found the
same defect class twice more: **loyalty points (#16)** and **reserved stock (#26)**.

**The unifying lesson — now a standing review question for this codebase:** whenever
anything is granted, deducted or reserved, ask *"what happens to it if the purchase
never completes?"*

### What shipped

| Release | Commit | Fix |
|---|---|---|
| v135 | `b95ec74` | 13 payment findings from the Part-2 audit |
| v136 | `b1a47e9` | GST Tax Invoice issued on `Paid`, not at checkout |
| v137 | `4eefb91` | Points earned on `Paid`, clawed back on full refund, restored on cancel |
| v137.1 | `73df782` | **Fix to v137** — double-earn hazard on pre-existing orders |
| v138 | `abae753` | Reserved stock returned on cancellation |

Plus `c61498b` (the shell pointed at `/js/app.js?v=133`, a file that does not exist in
`cms/js`, so `cms/` could not boot), `4b1624d` + `74c8cc1` (the audit and its gate),
and `a3d4c0c` / `13fa83e` / `fec5e9c` (audit notes).

### 🔴 The lesson that matters most

**Deferring a side effect creates a migration hazard on the rows that already exist.**
Moving point-*earning* from creation to `Paid` meant every order already in the
database — which had banked its points at creation and carried no marker — could be
credited **a second time** when later marked Paid. Guarding on the *new* flag alone is
not enough. The fix: **stamp an explicit marker at creation (`pointsDeferred`) and make
the new helper refuse to act without it.** Found in self-review, shipped as v137.1
before the owner ever saw v137.

Second: **a rebuilt fix invalidates the zip you already handed over.** The first v137
zip predated that fix and would have deployed the bug. After any post-build edit,
**grep inside the zip for the fix marker and re-publish the md5.**

### Deploy

**`shivaa-update-v138.zip` — md5 `e3e48f6ad116b7bbaaaffc381f32c948`, 5 files, stamps
138/138/138**, root layout into `public_html` ROOT. Verified a **strict superset** of
v135+v136+v137 by diffing every fix marker across all four zips. **Deploy v138 only and
delete the other three.** `boost.js` deliberately stays `?v=134`.

### ⚠ Four things the next agent must not get wrong

1. **No PHP binary exists in the sandbox — nothing was executed.** The `php-parser`
   check is clean (125 top-level nodes, proven against a broken negative control) but a
   parse check is **not** a run. No `php -l`, no 211-route php-sweep, **no payment path
   exercised.** Do not retry obtaining PHP — apt unreachable, asset hosts blocked,
   `@php-wasm/node` throws `PHPLoader.processId must be set before init`. **A live
   Cashfree sandbox test is still owed before this is trusted with real money.**
2. **`.htaccess` is EXCLUDED from the Hostinger auto-sync.** This release tightens the
   CSP there (drops the PayU hosts v128 deleted and a stale `*.onrender.com` relay), so
   **that fix ships only via the zip, never via auto-deploy.** Safe to drop: nothing in
   `cms/` calls PayU any more and `angelRelayUrl` is unset.
3. **The Hostinger FTP secrets are STILL not set** — all 4 historical runs of
   `hostinger-deploy.yml` failed at preflight with *"Nothing was deployed."* Merging
   PR #69 therefore deployed nothing. **If those secrets are ever added, merging any PR
   touching `cms/**` becomes an unconfirmed live deploy** — the v126 failure mode, one
   secret away.
4. **Finding #27 must not be fixed the easy way.** A lazy expiry sweep cannot run on the
   read path: `shv_wants_write_lock()` returns `false` for `GET`/`HEAD`/`OPTIONS`, so the
   `orders` GET holds no lock and a `db_save()` there writes a stale snapshot back over
   the whole database — reintroducing finding #10. Any sweep must live on a lock-taking
   POST or acquire the lock explicitly and re-read under it. There is no `cron` route and
   no scheduler. **No expiry window has been chosen — do not invent one.**

### Still open — all blocked on the owner, not on code

**#14** settlement reconciliation (live settlement data) · **#27** abandoned-order points
(expiry window) · **#2** receipt email · **#4** EMI · **#5** unpaid-order recovery ·
**#6** Payment Links.

**#2 is NOT blocked on credentials.** `cms/mail.php` is a real working `mail()` mailer —
`shivaa_mail_send()` at :90, `-f<from>` envelope attempt then plain-`mail()` fallback,
header-injection guard, per-IP relay cap; required at `api.php:25`. The blockers are its
**OTP-only `/^\d{4,6}$/` guard at :96** and the owner's wording. **Do not repeat the old
"blocked on mail credentials" claim without opening the file — it was wrong once already.**

### Traps re-confirmed this session

- **Sandbox reset** wipes `/tmp` and `node_modules` **and rewinds local git history to the
  branch point** while leaving the tree intact. Recovery: `git fetch origin <branch>`
  (the default refspec covers only `main`, so the branch has no local tracking ref),
  confirm the tree already equals the remote tip, then `git reset --mixed <remote-tip>`.
  **Never force-push. Always verify a push landed** via `git ls-remote`.
- **Gate allow-lists come in three shapes** — regex alternation `|137)`, quoted array
  `'137']`, **and bounded character class `13[0-7]`**. Bumping to 138 broke 15 assertions
  until all three were found; a single regex sweep misses the third.
- **`\+` in a BRE grep pattern is a quantifier, not a literal `+`** — it made a
  "stock is never restored" scan match the decrement and nearly produced a false finding.
  Verify with python fixed-string matching.
- **A fixed-width `sed` window over a function body lies** — brace-match with python.
- **`grep -c` returning 0 breaks a `&&` chain** and silently truncates the rest of a script.
- **Never build a directory symlink and write through it** — that writes into the real repo.
- **Zip recipe: build from `git diff --name-only <branch-point> -- cms/`, never `HEAD`**,
  else files committed in a prior release silently drop out.
- **`shivaa.in` is unreachable from the sandbox** — no live behaviour is verifiable here.

### Standing owner rules, unchanged

Owner is **non-technical** — talk plainly. **Never fabricate** supplier, payment, courier,
notification, legal, BIS, HUID, GSTIN, certificate or analytics data; no mock success
fallbacks. **Backup before deploy; nothing ships until the owner says so; a repair must
not swap `sw.js`** (rule #3). Rates are **owner-locked** (`premium.gold22 = 398`, anchor
formula). Never hand-edit live `db.json`; products only via API/upsert. Every release
bumps every `?v=` in `cms/index.html` together. **Forward-only history: merge commits,
never squash or rebase onto `main`.**

### Forward baseline from here

**v125 + v127 + v135/v136/v137/v138.** Preserve all of it. The v127 layer still owns the
sidebar and search-palette taps.

---

## ✅ NEWEST — v127 NAVIGATION REPAIR — LIVE + OWNER-VERIFIED (17 Sep 2026, branch `arena/01a0ad8d-shivaa-ecom`)

**Owner's word (17 Sep 2026, verbatim):** *"The version 127 update is working very fine and I
installed it and extracted in public HTML folder and its working fine now."* → **v127 is the
live, owner-confirmed state of shivaa.in.** He extracted `shivaa-update-v127.zip` into the
`public_html` ROOT himself; the auto-sync cron was not involved in that install.

**Independently re-checked from the sandbox:** `fetch_page` on `https://shivaa.in/js/v127.js`
returned **HTTP 200 with the full, correct file**. The `<script src="/js/v127.js?v=127">` tag
in the live shell was **not** directly read — the fetch tool strips `<script>` elements — so
that half is inferred from the owner's working buttons, not observed.

**⚠ HOW TO CONFIRM IT IS LIVE — the old trick no longer works.** Reading
`https://shivaa.in/sw.js` will still show `SHELL = 'shivaa-shell-v125'` **and that is
correct, not a failed deploy** — v127 is a repair and deliberately left `sw.js` and the
version triple alone. The live proof is `https://shivaa.in/js/v127.js` returning real
JavaScript, and `<script src="/js/v127.js?v=127" defer>` in the view-source of
`https://shivaa.in/`.

**Forward baseline from here: v125 + v127.** Preserve both. The v127 layer owns the sidebar
and search-palette taps, so anything editing drawer or palette markup must keep `#mainNav`,
`#searchSugg`, `a.sugg-cat` and the `href="#/…"` contract intact, and must re-run
`v127-check.js` (27) alongside the other gates.

### The repair itself

The owner asked for exactly two things and nothing else: the **search-bar category chips**
and **every sidebar row** were landing on the home page instead of their own page. Cause:
`app.js` dismissed the sheet *inside* the click and let the anchor's default action navigate,
while `js/v120.js`'s back-button helper answered a sheet closing with `history.back()` — the
traversal out-raced the navigation (search bar); and the drawer rows never performed a
navigation at all, leaning entirely on the native anchor action (sidebar). Fix: **new
`cms/js/v127.js` + one `<script defer>` line in `cms/index.html`**, loaded last, taking those
taps in the capture phase — `preventDefault()` → arm `window.__shvNavigating` (the flag
`v120.js` already honours) → navigate through the hash itself → *then* close the sheet.
**It is a REPAIR, not a release: `__SHIVAA_REL`/`APP_REL`/`SHELL` all stay 125 and `sw.js` is
NOT in the zip (owner rule #3).** `v117-check.js` carries a documented `NETWORK_ONLY`
allow-list for the one deliberately-unpreached file. Deliverable `shivaa-update-v127.zip`
(2 files, 11 KB) + `DEPLOY-v127.md`. Gates 252/252 on source and on the zip overlay,
php-sweep 211/0. **Owner live-verification pending — do not record it until he reports it.**
Full detail: `HANDOFF.md` → § v127, `MEMORY.md` → Session 2026-09-17 #2.

**v126 contamination check (the owner asked directly; answered with reads, 17 Sep 2026): NO.**
The zip holds 2 files; the string `126` occurs **0 times** in either; no `v126` file exists
under `cms/js/` or `cms/css/`; `git ls-tree -r --name-only origin/main | grep -i 126` is
**empty**, and so is the same command on this branch. The branch changes exactly 2 files
inside `cms/`. `sw.js` / `app.js` / `boost.js` / `boost.css` / `.htaccess` / `api.php` /
`db.json` are untouched and the triple stays **125**. The only "126" left in `cms/` is colour
values (`rgba(228,201,126,…)`) and QR tables in `js/qr.js` — neither is a version reference.

### ✅ STATE — v127 is MERGED to `main` (17 Sep 2026, 05:15 UTC, merge commit `5ed09a5`)

**`main` tip = `5ed09a5`. A new chat branching from `main` sees v127 as the newest, live,
owner-verified state — no recovery step is needed.** The owner was asked directly and chose
to merge; it was a fast-forward from `4be9a54`, so no conflicts were possible.

The PR had been held back earlier because merging fires the Hostinger auto-sync cron within
~5 min and would have deployed `cms/` before the owner took his `public_html` backup (owner
rules #1 and #4 — the v126 failure mode). That reason expired when he took his own path:
extracted the zip himself and live-verified it. By merge time `main`'s `cms/` was
byte-identical to what was already live, so the cron re-deploys the same two files — a no-op
for the shopper. It excludes `data/` and `uploads/`, so the live DB and media are untouched.
(The cron has failed silently once before, v119/PR #45; if it does not fire, nothing is lost.)

Verified after the merge by reading `origin/main`, not assumed: `cms/js/v127.js` present
(8465 bytes) · `cms/index.html` references `/js/v127.js?v=127` (1×) ·
`shivaa-update-v127.zip` present (10896 bytes, md5 `a3bc6214eaff1b19f43a6da9465966c0`) ·
`git diff origin/main HEAD -- cms/` **empty** · `git ls-tree -r --name-only origin/main |
grep -i 126` still **empty**.

Gates, re-run on the shipped zip's own contents: **252/252** (v113b 32 · v117 27 · v118 18 ·
v119 27 · v120 24 · v121 14 · v122 22 · v123 14 · v124 20 · v125 27 · v127 27) + php-sweep
**211 routes · 0 exceptions**.

**Still open, deliberately untouched:** `js/v120.js` stores `openHash[id] = location.hash`,
which is the empty string on a bare `shivaa.in/` visit — falsy — so on the home page the
close branch never runs and *every* class mutation while a sheet is open pushes another
history entry (instrumented: 2 pushStates for one drawer open). It pollutes the Back button;
it does not bounce navigation. Fixing it means editing `v120.js` — **ask the owner first.**

## CURRENT FORWARD BASELINE — v124 (16 Sep 2026)

The storefront baseline is **v124** — the v119 baseline plus the v120 bug-fix/mobile pack, the v121 smoothness pack, the v122 B2B design desk, the v123 category-photo refresh and the v124 slider faces (Punach + New In). **v123's provenance (restored this session after its own doc commits were lost):** merged as PR **#48**, merge commit **`bfc3908`** on `main`, and **owner live-verified on 16 Sep 2026 — `https://shivaa.in/sw.js` → `SHELL = 'shivaa-shell-v123'`** (owner-reported; the sandbox has no route to shivaa.in). Deliverables: `shivaa-update-v123.zip` (22 files) + `DEPLOY-v123.md`, then `shivaa-update-v124.zip` (7 files) + `DEPLOY-v124.md`. v124's merge/live record is the newest entry in `HANDOFF.md`'s session step log. **Everything v119 and v118 guarantee still stands** (see the lists below) and must not be reverted.

- **Slider faces (v124):** 18 faces live in `cms/images/categories/` — the 17 `CATS` keys plus `newin.jpg`, which the New In chip now uses instead of borrowing `/images/products/mangalsutra-modern.jpg` (product imagery is never category art). `punach.jpg` is the owner's kundan-kada photo (`ponchi-500x500.jpg`), which retired the v123 "forced leftover fit" tile. Every face is 420×420 q82, cropped centred on the trimmed content box so the round tile crop cannot clip a piece. **A bump must sweep BOTH `?v=` and the `&v=` branch** of the tile URL builder — a `?v=`-only sweep silently leaves half the tiles on the old stamp.

- **Category tiles (v123):** all 17 homepage/shop category-slider tiles are the owner's own photographs, AI-cleaned (third-party watermarks / ad text removed — NAKODA, MAHAKALI, nakodapayal, chhatralajewels, "Kada Payal"), 420×420, centred circle-crop-safe, in `cms/images/categories/`. Never re-publish the v113b placeholder art. Owner-source jpgs for every tile live at the repo root and map 1:1 onto the `CATS` keys (see `MEMORY.md` → *Mapping (for swaps)*); `punach` currently carries the delicate leaf-chain set, the one forced fit the owner may swap on a word.
- **Version triple:** `__SHIVAA_REL` / `APP_REL` / SW `SHELL` are all **124**, all six category-photo render sites + the pre-boot `v116` list carry `?v=124` (and `&v=124` in the already-queried branch), and the SW precache pins `app.js?v=124` + `v116.js?v=124`. The media cache intentionally stays `shivaa-media-v120`. Any new release bumps **all of them together** and makes the older suites forward-compatible (house pattern) rather than editing them down.
- **v120 pack:** rates page patches values in place (no more blank-white page, alert typing survives a poll tick); every category photo has the logo→hide fallback plus the monogram underlay, so a tile can never render as bare text; tap haptics; back button owns search/modals/drawers; safe-area + `dvh` + 16 px inputs mobile CSS. Suite `tools/mega/smoke/v120-check.js` (24).
- **v121 pack:** phone-sized hero banner (`poster-heritage-m.jpg`, srcset + matching head preload), cards drop permanent GPU layers + `content-visibility` on phones, banner shine repaints only on the visible slide, tickers rest while the tab is hidden. Media cache deliberately stays `shivaa-media-v120` (no gratuitous purge). Suite (14).
- **v122 pack:** B2B design desk `#/catalogues` — name/SKU search (debounced, persisted) + 5-way sort incl. selected-first; sticky bill bar gated on the top total; second gallery shots load near-view only; card-photo logo fallback; wishlist crash guard; honest empty-catalogue note. Billing math verified byte-identical. Suite (22).
- **Rates:** untouched since v119 — `premium.gold22 = 398` and the anchor formula are **owner-locked**; `api.php`, `.htaccess` and `db.json` shipped in **none** of the v120–v123 zips.
- **Catalogue:** master PGS set is **77** rings (the 65 signature rings + Ladies-67 tranche 1, PGS5066–5077, via PR #46); each still carries four images.
- **Gates required before any later release:** `v113b-check.js` (32) · `v117-check.js` (27) · `v118-check.js` (18) · `v119-check.js` (27) · `v120-check.js` (24) · `v121-check.js` (14) · `v122-check.js` (22) · `v123-check.js` (14) · **`v124-check.js` (20)** · php-sweep (211/0) · catalogue 77 with four images each — all re-run on the built zip overlay, plus a real-PHP probe of the shipped `api.php` whenever it changes.
- **Deploy caution:** the auto-sync cron did **not** fire for PR #45; never trust push-to-deploy until a merge is seen reaching shivaa.in on its own. The zip extracted into `public_html` ROOT is the fast path; `main` is the durable one.

## Earlier baseline — v123 (16 Sep 2026)

The baseline was **v123** — 17 real AI-cleaned owner tiles + `?v=123`; merged as **PR #48 (`bfc3908`)**, owner live-verified 16 Sep (`sw.js` = `shivaa-shell-v123`). Nothing in v124 reverts it: v124 only retook the `punach` face and gave the New In chip its own.

## Earlier baseline — v119 (15 Sep 2026)

The baseline was **v119** — the v118 baseline plus the owner-locked rate decision and the first-paint/mobile pack. Deliverable `shivaa-update-v119.zip` (10 files, root layout). **Everything v118 guarantees still stands** (see the v118 list below) and must not be reverted.

- **Rates (owner-locked, do not change the numbers):** the 22K retail premium is **₹398/g, desk physical** (`settings.gold22Premium`, default 398, admin-editable). `/api/rates` publishes `premium.gold22` **and** `anchorLevel {mode, goldPerG, silverPerG, …}`, and `jaipur.gold22` is derived from that one anchor: `round(anchorLevel.goldPerG × 0.9167) + 398`. The 24K/18K lines keep `jaipurPremium` (55) and an admin override still wins. Every 22K piece is ₹343/g dearer than v118.
- **First paint:** `index.html` ships a skeleton inside `<main id="view">` and `skeleton → body.shv-ready` retires it.
- **Shop slices:** the grid renders 20 cards at a time and grows through `#shopSentinel` (IntersectionObserver) — the filtered list is still computed whole.
- **HUID chip (honesty rule applies):** the PDP chip prints a HUID **only** when the catalogue carries one (`p.huid` or `hallmark.entries[].huid`); otherwise it is a labelled *HUID check* guide linking to the BIS Care walkthrough. Never invent a HUID.
- **Install chip:** appears from the **second visit** onward, only when the browser fires `beforeinstallprompt`; Close is remembered per device.
- **Pinch zoom:** Quick View photo zooms 1×–4× with two fingers without swiping shots; double-tap/pan unchanged.
- **.htaccess:** brotli (guarded) + `immutable` caching for `?v=` assets; deflate kept. **Merge, never blind-overwrite** if panel rules exist.
- **Gates required before any later release:** `v113b-check.js` (32) · `v117-check.js` (27) · `v118-check.js` (18) · **`v119-check.js` (27)** · php-sweep (211/0) · catalogue 65 with four images each — all re-run on the built zip overlay, plus a real-PHP probe of the shipped `api.php`.

## Earlier baseline — v118 (15 Sep 2026)

The baseline was **v118**, branch `arena/01a0a48d-shivaa-ecom`, commit `0f699f8`, PR #41, deliverable `shivaa-update-v118.zip`. The owner installed/tested it and reported all fixes working. Preserve it in every future change.

- Product pages reliably navigate all four photos by arrows, button dots and horizontal swipe/drag; pointer capture and vertical-intent handling must remain.
- Quick View opens on captured final `click`, never `pointerup`, and must stay in its modal rather than navigate.
- Category links are key-guarded, same-hash taps redraw, empty categories show the honest cataloguing page, and phone category thumbnails eagerly load with fallback.
- PayU submits only to HTTPS `*.payu.in` through the native form prototype and always retains visible Continue/Try again/Return recovery controls.
- Release handshake and SW shell are 118. Catalogue remains exactly 65 PGS rings with four images each; v118 changed no DB/API/payment keys/orders/customer data.
- Required gates before any later UI release: `v113b-check.js` (32), `v117-check.js` (27), `v118-check.js` (18), PHP sweep (211/0), catalogue 65 + four images each.

**Forward-only law:** do not revert any v118 mechanism, overwrite it with an older ZIP/file, or branch future work from pre-v118 code. Check `ARENA-STATE.md`, `HANDOFF.md`, and `MEMORY.md` for the detailed ledger before starting.

## Current feature work (6 Sep 2026)

Feature 13 **Compare + Shareable Shortlist** is live per owner and must be
preserved. The current task is the owner's 1–21 roadmap, **one feature at a
time**, starting with Feature 1 (BIS hallmark / HUID lookup).

Read [`FEATURE-ROADMAP.md`](FEATURE-ROADMAP.md),
[`FEATURE-01-HUID.md`](FEATURE-01-HUID.md) and
[`FEATURE-02-TRUST.md`](FEATURE-02-TRUST.md).

- **Feature 1 is live**, released via PR #5 (`77d5069`); public status, entrypoint
  and HUID JS confirmed on 6 Sep 2026. Automatic BIS verification is still **not
  connected**. Accepted format and staff references never mean BIS verified.
- **Feature 2 is live**, released via PR #6 (`fad5aca`), with the live API and
  v40 JS/CSS confirmed on 6 Sep 2026. Why Trust Shivaa uses only the existing
  owner-confirmed CIN, UDYAM, address and GSTIN (published in v105).
  Certificates stay empty pending real files. The profile is not a government registry result or product
  certificate.
- Stop after Feature 2. The rest of the original owner list
  is not in this checkout; ask for the exact Feature 3 specification.

Owner rule: **never fabricate supplier, payment, courier, notification, legal,
BIS, HUID, GSTIN, certificate or analytics data.** Existing legacy placeholders
are not evidence that any such integration is live. Do not add mock success
fallbacks. New HUID tests use only labelled temporary QA fixtures and leave the
repository DB untouched.

## FIRST MESSAGE for a new chat (paste this)
> Repo connected. Read `docs/AGENT-HANDOFF.md` fully, run `demo65/status.py`
> (or the current batch folder's), verify state against
> `work/designs.json` + git log, then continue where the ledger stops.
> Admin password for shivaa.in: I'll give when needed (never stored in repo).

## The automation architecture (already live — do not rebuild)
1. **You (agent)**: intake (PDF/photos/info from owner in chat) →
   `pipeline/01_ingest_pdf.py` (crops) → read supplier tags VISUALLY
   (green tags; contact sheets via `demo65/tools/`) → `suppliers/tags.csv`
   (real codes+weights; NEVER invent) → `02_normalize` → shots via
   `generate_image` (10/message cap; reference `media/designs/{SKU}.jpg`;
   **men's styling: worn shots on a man's hand** — owner directive) →
   `04_render_video.py` (720², CRF27, SHIVAA.IN mark) → `05_metadata.py`
   (provider `template`, spec-lock) → **commit + push**.
2. **Owner's Hostinger server (cron, every 5 min)**: `~/auto_sync.php`
   pulls the latest **default branch (main)** from GitHub (PAT tarball),
   then: (a) **auto-deploys `cms/` code** to public_html — excluding `data/`
   and `uploads/`, php -l gate, 1-gen backup in `~/shivaa-deploy-backup/`;
   (b) **auto-uploads** every design with 4 shots + film + meta that isn't in
   `~/shivaa-sync-ledger.json` (media POST /api/media, product upsert by SKU;
   category + `mens`-style tag per owner's section). Config: `~/.shivaa-sync.json`
   (0600). Logs: `~/shivaa-sync.log`. Owner set this up once via
   `deploy/upload_bridge.php` (self-destructed afterwards).
3. Therefore: **push to main (via PR) = goes live within ~5 min.** New chats
   branch from main → see everything; finish work → PR into main → live.

## Branch/PR rules (Arena)
Work on your session branch (`arena/…`); commit+push there every turn
(**media is TRACKED in git — snapshots respect .gitignore, untracked media
dies on sandbox restarts**); open a PR `arena/… → main` and merge at milestones
/ session end so future chats and the sync worker (main) pick it up.

## Sandbox survival kit (restarts happen between turns!)
- Workspace may reset to the branch base: `git fetch origin <branch> &&
  git reset --hard FETCH_HEAD` recovers everything pushed.
- pip + /home/user/tools vanish: `pip3 install --break-system-packages
  imageio-ffmpeg pymupdf`; `mkdir -p /home/user/tools/bin &&
  ln -sf $(python3 -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())") /home/user/tools/bin/ffmpeg`
- apt is BROKEN (egress); RAR5 via npm `node-unrar-js`; shivaa.in UNREACHABLE
  from sandbox (uploads happen on the server, never from here).
- **PHP CAN run in the sandbox since v147** (replaces the old "no PHP binary"
  law everywhere): `cd tools/mega/smoke && npm i @php-wasm/node@3.1.54
  jsdom@30` (node_modules never survives a restart — reinstall, npm works).
  `new PHP(await loadNodeRuntime('8.3',{emscriptenOptions:{processId:1}}))`;
  result has `bytes` (NOT stdoutText in v3); `php.mkdirTree()` before
  writeFile; unregister the `php://` stream wrapper to fake `php_sapi_name()`.
  Pattern: `tools/mega/smoke/v147-php-run.js`. jsdom: `resources:'usable'`
  does NOT use a custom fetch — serve the shell over a localhost HTTP server
  (pattern: `tools/mega/smoke/v147-tc-autobuy.js`).
- `generate_image` paths are repo-root-relative.
- ffmpeg-7 quirks already patched in `04_render_video.py` (no drawtext →
  blend-screen watermark; `[0:v]` pad labels).

## Ground-truth rules (owner's law)
Never fabricate weight/purity/price/stones. Weights come only from supplier
tags (visual read; page order is ARBITRARY — verify contiguity, cf.
`demo65/work/page_map.csv`). Unreadable tags → quarantine, ask owner.
Names/SEO copy may be creative. Exemplar live names stay: PGS5001
"Rajkumari", PGS5004 "Mughal Moti".

## Current batch state (demo65, men's rings, 65 SKUs PGS5001–5065)
On branch `arena/01a0768e-shivaa-ecom` (6 Sep 2026): COMPLETE 39/65
(shots+films+meta), SHOTS 156/260, VIDEOS 39/65, META 65/65, CROPS 65/65.
**Rule: never merge a PR containing a shot that failed visual QA** — the
Hostinger auto-uploader reads `main` and would publish it. (First case:
PGS5036 — all 4 shots failed first pass: "AU 750" 18K engraving / pink
stones / brand on box / supplier tag. Reshoot 2nd pass PASSED 4/4, film
re-rendered + frame-verified 6 Sep 2026.)
Queue order = `work/designs.json` order; `status.py` prints next batch
(now: PGS5040, PGS5020, PGS5019 … 26 designs / 104 shots).
Work per turn: ≤10 shots → visual QA each (read back; regenerate failures
within the same 10) → films for completers → commit → push. At 65/65: verify
via owner screenshots (sandbox can't reach site); build
`shivaa-batch65-media.zip` in `deploy/` only if owner asks.

### Shot QA protocol (6 Sep 2026 — from the PGS5036 failures)
Guarded prompts in `demo65/config.json` (no tag / no text / no branding /
stones-as-reference) are MANDATORY for every new shot. After generation, READ
BACK each shot (10/turn) and check: supplier tag · any engraving or text
(purity must be 22K — "AU 750" = 18K is a fail) · brand names/monograms on
boxes · stone colour vs the reference crop. `demo65/tools/tag_scan.py` is a
bright-tag first pass ONLY (misses dark-scene tags — documented failure).
The other 30 completed designs were not re-QA'd; if the owner reports odd
shots on the live site, reshoot that SKU + re-render + re-upload.

### Catalog batch (10–15k images/hr target) — PLANNED, not started
Owner wants the full 3-lakh-design catalogue at 10,000–15,000 images/hr.
Agreed in chat (6 Sep 2026): in-chat `generate_image` (10/turn) can't do that
— it needs a batch job on a VPS calling Replicate directly with parallel
workers + a hard budget cap. Decisions: provider = Replicate; A/B test models
= FLUX.1 schnell (Apache-2.0, ~$0.003/img) vs FLUX.2 pro (~$0.03/img) —
FLUX.1/2 [dev] are EXCLUDED (non-commercial licence; this is a commercial
site); test-first gate = paid A/B on 20 designs before any full run. Owner to
provide: Replicate token (pay-as-you-go), a VPS (or confirm their Hostinger
plan is a VPS), and per supplier drop: weights CSV + photos zip. NOTHING is
built yet (that chat was interrupted); owner's priority = finish demo65 first.

## Site-change requests (features/fixes)
Edit `cms/` on your branch; bump every `?v=` in `cms/index.html` (currently 11 refs) whenever
js/css change; PR → main → cron auto-deploys. NEVER edit live db.json by
hand; products only via API/upsert. Warn owner: hand-edits in hPanel File
Manager get overwritten by the next auto-deploy — changes go through chat.

## Key files
`pipeline/*` stages · `demo65/{config.json,status.py,tools/}` ·
`deploy/{upload_bridge.php,auto_sync.php,UPLOAD-RUNBOOK.md,AUTOMATION.md}` ·
`qa/php_router.php` (isolated PHP QA/read-only preview; never deploy) ·
`qa/preview_shim.py` (older read-only Python shim; does not implement Feature 1) ·
`docs/SESSION-STATE-2026-09-05.md` (history + lessons).
