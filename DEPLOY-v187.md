# v187 — visual polish for Amrita ji's thank-you page

**Release 187 · built 10 Oct 2026 · NOT deployed — the owner's yes is required.**

## ⚠️ Read first: the baseline is NOT live v186

The owner reports the live site is **v186**. The v185 and v186 source is **not in
this repository** (no commit, branch or ZIP was found). v187 is therefore built on
`main` at **184**. Deploying this tree over live v186 would roll back whatever
v185/v186 changed. Do not deploy until the v185/v186 changes are merged into this
tree, and the belt is re-run on the merged result.

## What changed (visual only)

- `cms/css/v187.css` — **new**, loaded last and precached:
  - readable secondary text on the dark gold ground;
  - keyboard focus rings on the stars, dishes and home card;
  - 44px+ tap targets;
  - a finer coupon card;
  - a small-phone tweak.
- Stamps 184 → 187 in lockstep: `index.html`, `js/app.js` (`APP_REL`), `sw.js`
  (`SHELL`, `REL`, precache list, changelog), `api.php` (`rel`).

## What did NOT change

Copy, the five-step flow, the owner's kill switch, the coupon, the card route and
every money path. `v187-check` B06 and B07 assert this.

## Tests

- `v187-check.js` — 8/8.
- `v184-check.js` — superseded (stamp-exact, skips on 187).
- `v184-php-run.js` — 18/18.
- Belt (`npm test` chain): deploy gate 20/20, v183–v180 php suites all pass,
  v179-php 25/25, v169 pages 25/25, v169 PHP 28/28, v168 check 39/39, v168 php 12/12.
- `v179-relay.js` — 0/7, **pre-existing** (documented in AGENTS.md; fails
  identically on pristine HEAD in the sandbox).
