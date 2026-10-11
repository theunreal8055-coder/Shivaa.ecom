# v191 — Premium card (free home delivery for life), audit fixes, mobile pass

Release stamp: **191** (index.html, js/app.js APP_REL, sw.js SHELL/REL, api.php version).

## New
- **Premium card** on the home banner, for everyone. Signed-in customers claim it
  with one tap (`POST /api/premium/claim`). Guests see "Sign in to claim".
  Once claimed, every order is delivered free (order route and checkout), for life.
  The claim is idempotent and rate-limited. The profile carries `premium`.
- The 20% making-charges card (MAKING20) and the FREE home delivery card (FREEDEL)
  from v190 stay on the home banner, footer and side menu, for every customer.

## Security and data
- **Live data file removed from git.** `cms/data/db.json` (3 test users, 767 reviews)
  was tracked in the public repo. It is now untracked and listed in `.gitignore`.
  The file stays on the server and on disk. Its URL is blocked by `.htaccess`.
  Note: the repo's history still contains the file from earlier commits.
  If it held real data, rotate it or rewrite history.

## Found, not changed in this release (for the owner to decide)
- **Content Security Policy allows inline scripts** (`script-src 'unsafe-inline'`).
  This weakens protection against script injection. Removing it means moving inline
  scripts to files; that is a larger change.
- **Coupons only apply to signed-in orders** on the server. Guests see the offers but
  the discount and free delivery apply after sign-in. Changing this touches payments.
- **Mobile fit:** the viewport is set correctly. A full phone-by-phone visual check was
  NOT run here (no browser). Please test the home page, the cart and checkout on a phone.

## Update file
`shivaa-update-v191.zip` (123 files), built by `tools/mega/make-v191-zip.py`.

## Checks
- `tools/mega/smoke/v191-check.js`: 13/13.
- `php-parse-check.js`: `api.php` parses.
- Full `npm test` chain: 219 PASS, exit 0.
- Not run live: claiming the card and placing an order with it (no PHP runtime or browser here).
