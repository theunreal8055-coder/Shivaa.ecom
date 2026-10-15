# DEPLOY-v223.md — release 223 · "THE SMOOTH RELEASE" · the page stops loading media you have not reached

Status: **READY — owner approval required before anything is taken live.**
A push, a green test run, or a finished zip is **not** approval. Live today is
**v205** (WWW + Netlify). If anything higher than 223 is live, stop.

**Read `DEPLOY-v205.md` first.** Drop-in replace root with `cms/` (same shape),
then `purge` before `activate`. This package carries v206 → v223 and includes
the film files (`images/films/`) and the offer artwork (`images/offers/`).

---

## 1 · What the owner asked

> "Make it even more smoother and lag free any kind of likaning issues or any
> kind of bugs should be removed and it should be functioning like Zomato also
> ki applications like how do they function smoothly, give me the new update file"

Zomato-class apps feel smooth for one reason above all others: **they never
download or decode anything you have not reached yet, and they throw things
away once you have moved past.** So that is what was measured here first.

## 2 · The finding — the home page downloaded all five films before you scrolled

The film thread ("Everything begins as one thread of gold") mounts five
`<video>` elements. Because of the v210 change, **each one set `preload="auto"`
AND its `src` at mount time**. Five thread films is **4.5 MB**, and all of it was
requested the moment the home page rendered — before the shopper had scrolled
anywhere near the films. Every one of those films then also kept decoding
off-screen frames while the reader scrolled past.

That is the hitching this release removes. It is the same class of mistake as
the 58 stylesheets: work requested up front that the opening screen never uses.

| On the home page | v222 (live shape) | v223 |
|---|---|---|
| Video bytes requested at render | **4.5 MB** (5 films) | **0 bytes** |
| Video files downloaded as you reach them | all 5 at once | **1**, the one you are looking at |
| Films decoding while you scroll past | all 5 | **none** |
| What shows before the film loads | black frame | **the poster** (as before) |
| Reduced-motion visitors | 4.5 MB downloaded, nothing plays | **0 bytes** |

## 3 · The fix

The films are now **poster-first with deferred media**:

- at mount the `<video>` has **no `src`** and `preload="none"` — nothing is
  fetched; the poster image already sits underneath it (the v211 guarantee), so
  nothing can ever show a dead black card;
- one `IntersectionObserver` with a **1200px margin** (about a screen and a
  half) does all three jobs:
  - **on screen** (≥15% visible) → `wake()`: request the file, then play it if
    its gate allows;
  - **near, but not being watched** → pause, **keep** the buffer;
  - **well past** → `rest()`: pause and **release** the buffer
    (`removeAttribute('src')` + `load()`), handing the memory and the decoder back;
- `wake()` is idempotent, so scrolling back and forth never re-downloads;
- a released film is **not** treated as a broken film — the v211 error handler
  now returns early when there is no `src`, otherwise scrolling past a film
  would have permanently marked it poster-only;
- visitors with **reduced motion** never fetch a film at all (`if (!REDUCED) wake()`).

Everything the earlier releases added around the films is untouched: the poster
under every film (v211), the broken-file still frame (v211), the films mounting
on save-data too (v213), `playsinline` for iOS, and the full-screen reel.

## 4 · What was checked and found already correct (no change made)

The owner asked for "any kind of bugs should be removed", so this release also
audited the rest of the smoothness surface. These came back clean, and the new
QA suite now **locks them** so a future release cannot quietly regress them:

| Checked | Result |
|---|---|
| Scroll / wheel / touch listeners | **23 of 25 already passive.** The only blocking one is the product gallery's horizontal drag, which must call `preventDefault()` while a shopper drags photos sideways. The new test parses all 25 properly and **fails if a second blocking listener ever appears.** |
| Layout shift while images load | Product cards already reserve their space (`aspect-ratio` on `.pc-imgwrap`), so photos cannot push the layout around. |
| Broken links / missing assets | **264 local references checked — zero 404s.** (Ten looked missing at first; all ten are JS template paths built at runtime.) |
| DOM leak / re-render loop | The home page settles at **1,897 nodes and stops growing.** Verified stable over 12 seconds; the suite now asserts it stays flat. |
| Console errors across every route | `t7-audit` walks all internal routes and clicks every control: **0 uncaught errors.** |

## 5 · What was deliberately NOT done, and why

**JavaScript was not bundled.** The shop loads 21 deferred scripts (1,027 KB raw,
313 KB gzipped) and **`app.js` alone is 760 KB — 72 % of it**, with 308
top-level declarations. Two facts make bundling a bad trade here:

1. Deferred scripts **download in parallel and do not block first paint**, so the
   payoff is far smaller than the CSS bundle was (that was 58 *render-blocking*
   files). The 57 fewer round trips are worth chasing; bundling deferred files is not.
2. Wrapping 21 files into one bundle changes `'use strict'` scope and removes
   those 308 globals. If any file reads another's global, it breaks — and that is
   not a thing this sandbox can prove, because there is no real browser here.
   Breaking one payment path to save a few round trips is a bad trade.

It stays on the list as a future option in `docs/NEXT-CHAT-HEAD.md`, with the
risk written down next to it.

## 6 · Version stamps (all moved to 223)

`index.html` (`?v=223` ×29 + `window.__SHIVAA_REL=223`), `sw.js`
(`shivaa-shell-v223`, `const REL = 223;`, SHELL_FILES re-stamped),
`app.js` (`APP_REL = 223`), `api.php` (`'rel' => 223,`), and both shipped
countdown docs. The shell name changed, so every phone picks the new files up
on activate.

## 7 · QA run before packaging (headless jsdom + static, no real browser)

| Check | Result |
|---|---|
| `node qa/browser/t-v223-smooth.mjs` (**new** — 39 assertions) | **39 / 0** |
| `node qa/browser/t-v222-bundle.mjs` (rollback guard: still one stylesheet) | **36 / 0** |
| `node qa/browser/t-v221-cleanup.mjs` | **34 / 0** |
| `node qa/browser/t-v220-billing-gone.mjs` | **13 / 0** |
| `node qa/browser/t-v209-alive.mjs` (alive suite) | **96 / 0** |
| `node qa/browser/t-v206-flip.mjs` (flip guard) | **ALL PASS** |
| `node qa/browser/t7-audit.mjs` (routes + buttons + errors) | **4 / 0** |
| `node qa/browser/t-v218-sidebar.mjs` | **13 / 0** |
| `node qa/browser/t-v219-depth.mjs` | **22 / 0** |
| `node --check` on `v125.js`, `app.js`, `sw.js` and every edited suite | clean |

The new suite proves the claim **from both sides**, which is the only way this is
worth anything:

1. **With observers silent** (nothing on screen yet) it boots the real home page
   and asserts that **not one film has a `src`**, that none carries `autoplay`,
   and that none is `preload="auto"` — so a fresh home page requests zero video bytes.
2. **With observers live** it asserts the films still mount, still attach their
   file, still show all five FILM badges, and that the full-screen reel still
   opens and closes.
3. It also asserts the page does not grow while idle, and that only the one
   deliberate listener blocks scrolling.

`qa/browser/harness.mjs` gained one opt-in flag for this (`noObservers`) that
models "nothing has come into view yet". It changes nothing for the other suites.

**Not run:** `php -l` on `api.php` (PHP is not installed in this sandbox). The
v223 `api.php` change is a single number. Please run one `api.php` request
(e.g. `GET /api/settings`) after upload.

**Not verified in a browser:** the numbers above are byte counts and DOM
assertions, not a stopwatch on a real phone. The owner checklist in section 9 is
how the feel gets confirmed.

## 8 · Package

- `shivaa-update-v223.zip` — **350 files · 37,221,175 bytes · sha256
  `82c26f8a3261685d2a21223957abf19f00948131b58ed0176397ae633aec0218`**
- Same file list as v222 (this release only edits existing files).
- Includes `images/films/` (18 files) and `images/offers/` (4 files).
- `cms/data/db.json` is **not** in the zip (gitignored, local fixture only).
- Verified after building: the archive was extracted and **all 350 packaged
  files compare byte-identical to `cms/`** (0 differing); inside the archive the
  film fix is present, `index.html` carries exactly **one** stylesheet link and
  `__SHIVAA_REL=223`, `sw.js` carries `shivaa-shell-v223`, and there is no
  `data/db.json` entry.
- Link: `https://github.com/theunreal8055-coder/Shivaa.ecom/raw/arena/e8a470c6-shivaa-ecom/shivaa-update-v223.zip`
- Rollback rung: `shivaa-update-v222.zip` — the last live release is still **v205**.

## 9 · Deploy steps (after the owner's explicit yes only)

1. Download `shivaa-update-v223.zip`; check the sha256 above.
2. Replace the site root with the zip's contents (same shape as `cms/`).
3. Purge the CDN cache **before** activating.
4. Check `GET /api/settings` answers and `GET /api/version` reports rel 223.
5. **Owner visual check — this is the release, so watch the films:**
   - Open the home page **on a phone, on mobile data** (not wifi).
   - Scroll down **without stopping**. The film thread should feel steady —
     no stutter as you pass the films. That stutter was five videos decoding at once.
   - Stop at the film thread: the **posters** should be there instantly, and the
     film you are looking at should start playing a moment later.
   - Scroll far past the thread, then come back: the films must come back and
     play again (that proves the release/re-wake cycle is clean).
   - Tap a film: the full-screen reel must still open, and close again.
6. Useful check in Chrome DevTools → Network, filter **Media**: on a fresh load
   of the home page you should see **no .mp4 requests at all** until you scroll
   down to the film thread.

## 10 · Suggested rollback

If the film thread misbehaves after upload, restore `shivaa-update-v222.zip`.
Forward-only still applies: never re-number, never reuse 223.
