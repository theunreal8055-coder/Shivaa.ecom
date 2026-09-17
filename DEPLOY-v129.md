# DEPLOY v129 — make the payment page tell you WHY it refuses

**Date:** 17 Sep 2026 · **Branch:** `arena/01a0af76-shivaa-ecom`
**Zip:** `shivaa-update-v129.zip` — **2 files** (`index.html`, `js/v129.js`)
**This is a REPAIR, not a release.** Stamps stay exactly as they are:
`__SHIVAA_REL` 128, `APP_REL` 128, `SHELL = 'shivaa-shell-v128'`.
**`sw.js` is deliberately NOT in the zip** — owner rule #3 after v126.
No design, colour, route, price, rate, API, `.htaccess` or `db.json` is touched.

---

## 0 · BEFORE ANYTHING (owner, 2 minutes)

1. Hostinger → **Files → File Manager → `public_html`** → right-click → **Compress → ZIP**
   → download that backup. **Do this first, every time.**
2. Recovery path is unchanged: extract the backup over the top and you are back.

---

## 1 · Install (2 minutes)

1. File Manager → open **`public_html`** (the ROOT — not a `cms/` sub-folder).
2. **Upload** `shivaa-update-v129.zip` there.
3. Right-click → **Extract** → target `public_html` → confirm **overwrite**.
4. Delete the zip from the server.
5. Open an **Incognito** window → `www.shivaa.in` → hard refresh (**Ctrl+Shift+R**).

Two files land: `public_html/index.html` and `public_html/js/v129.js`.
`js/v129.js` is a **brand-new filename**, so no browser or CDN cache can be
holding an older copy of it — that is what makes this safe *without* swapping
the service worker.

---

## 2 · What was actually wrong (plain words)

When you pressed **Pay online**, the site asked Cashfree to open its payment
page. Cashfree answers that request — and when it refuses, the answer contains
the exact reason in plain English.

**Our code never opened the envelope.** In `js/app.js` the call was written as
fire-and-forget:

```js
cf.checkout({ paymentSessionId: …, redirectTarget: '_self' });   // answer discarded
return true;                                                      // "worked!" — always
```

Cashfree's official Web Element SDK documents `checkout()` as returning a
Promise that resolves with either `result.error` (carrying
`result.error.message`) or `result.redirect`. Because we threw that Promise
away and then returned `true` unconditionally, the app believed the hand-off
had succeeded no matter what happened. The refusal existed, in your browser,
for a few milliseconds — and nothing ever read it. You got a spinner that never
ended.

**The fix** is one new file, `js/v129.js`, which replaces that one launcher
function at runtime. It *awaits* `checkout()`, reads `result.error.message`,
and paints it into the waiting popup as a **red box that stays on screen**
(a toast disappears after 3.2 seconds — that is why you never saw one). With
the message it prints the mode (production/sandbox), the first 12 characters of
the session id, and the error code — the facts that identify the cause in one
shot. It never invents a message it was not given.

**`js/app.js` itself is not edited.** The launcher lives on the shared
`window.Shivaa` object and is looked up when it is called, so the new file
takes over cleanly — which is why this patch is 2 small files instead of a
553 KB script swap.

---

## 3 · What to do after installing

1. Add a small item → checkout → **Pay online** → Place Order.
2. One of two things now happens:
   - 🎉 The Cashfree payment page opens → pay normally.
   - A **red box appears inside the popup** naming the exact reason Cashfree
     refused → **screenshot it and send it**. That text pinpoints the fix.
3. If instead you see a cream-coloured "Still waiting for Cashfree" box after
   ~9 seconds, that is also new and also useful: it means the SDK loaded and
   accepted the request but the hosted page never opened. Send that too.

Your orders, customers, prices, rates and photos are untouched — this patch
swaps two files and changes nothing else.

---

## 4 · Honest note on the gates

The repo's older suites are **not all green, and were not green before this
patch either.** They currently read:

`v113b 32/32 · v117 24/27 · v118 16/18 · v119 25/27 · v120 24/24 · v121 13/14 ·
v122 21/22 · v123 12/14 · v124 18/20 · v125 24/27 · v127 26/27` · **v129 29/29**

Those pre-existing failures are all the *same* complaint: the tree is stamped
**128** while suites written for v117–v127 assert their own era's stamp
(e.g. v123 expects `123/123/123` and reads `128 / 128 / 128`), and `sw.js`
still precaches `app.js?v=125` while the shell requests `?v=128`. **That
`sw.js` ↔ `index.html` desync is a real, pre-existing bug in the v128 work —
it is not caused by v129, and v129 deliberately does not fix it**, because
fixing it means swapping `sw.js`, which owner rule #3 forbids in a repair.
It is written up as the open item below.

**Verified: v129 adds no new failure.** Every suite returns exactly the same
count as it did before the patch, and the failing check names are identical.
The v129 suite itself is 29/29 and carries a **named control check** proving
the bug was real: it asserts the shipped `app.js` launcher really does discard
the Promise. Removing the fix makes 11 checks fail and the run crash — proof
the gate has teeth.

---

## 5 · Open item for the owner (needs a decision, not silent action)

`cms/sw.js` precaches `/js/app.js?v=125`, but `cms/index.html` requests
`/js/app.js?v=128`. On a returning phone the worker can serve the **v125**
script against the **v128** shell. `app.js`'s own handshake guard catches the
mismatch and force-reloads once, so it self-heals — but it costs every
returning visitor a reload, and it means the v128 Cashfree code may not be what
runs on the first paint.

Fixing it is a one-line change to `sw.js` — **and swapping `sw.js` is exactly
what made the site "ugly, scattered, blurred" after v126.** So it is not in
this patch. Say the word and it ships as its own small, separately verified
release with the stamps re-aligned properly.
