# DEPLOY — v155 (SILENT LANE: tap, two fetches, Cashfree owns the screen)

**Zip:** `shivaa-update-v155.zip` · md5 `1c79556e77fc7277d6e56fb849422784` ·
sha256 `c0276acd87b6fab3643ba4549b8353302834ade2905484fb4602588167ef582b`
· **5 files:** `api.php`, `index.html`, `sw.js`, `js/app.js`, `js/admin.js`
→ unzip into `public_html/cms/`, **overwrite all five**.

> Contains the ENTIRE v152 → v153 → v154 → v155 arc. Whatever state the server
> is in, **this one zip is the whole story**. Older zips are rollback rungs only.

## Third time you said it — this time we removed OURSELVES from the wait

*"…completely remove the one tap page… redirect customers directly to the
cashfree payment portal once they click on buy now check out or make it yours."*

v153 deleted the **page**. v154 deleted the **field**. But the lane still
RENDERED things of ours (a status overlay, a toast, a handoff sheet) and still
burned three round-trips — because the shared payment helper was built for the
order-view **retry** button, where a stale session must be re-minted. Your
first tap never waits on a human, so v155 gives the guest lane its own silent
handoff:

**Tap → POST the boundary order → ONE fresh Cashfree session → opened the
instant it lands.** Nothing typed. Nothing rendered. No spinner of ours, no
sheet, no toast on the success path. Between the finger and Cashfree's portal
there are now exactly two network calls and zero Shivaa pixels.

## What the shopper sees

Buy Now / Make It Yours / cart or sidebar Checkout → **Cashfree's payment
page.** Their real mobile, name and address are collected and OTP-verified
**by Cashfree on its own page** (One Click Checkout — the design you accepted),
and the moment payment confirms our server **writes the verified contact back
onto the order**, so dispatch never ships to a placeholder.

## Failure paths stay honest — silently

- Handoff declines → the customer lands on the **order view** (its Retry
  button, UPI QR tab and access pin all live there). No error sheet from us.
- The ORDER is refused (switch off mid-click, network) → one toast, they stay
  on the page they tapped. Nothing half-placed, nothing ever double-placed.
- **v155 also kills an old race:** since v153, two taps within the gate
  round-trip could interleave and place TWO boundary orders. The lane now
  claims its busy-flag synchronously — the storm test (3 concurrent taps)
  proves: one order, one mint.
- A tab Android killed mid-payment reloads → order view FIRST, silent resume
  mint on top. It can re-PAY, never re-PLACE.

## The server rules you're deploying (v154 physics, byte-identical — api.php changed only its stamp)

- Guest orders are accepted with the placeholder phone ONLY on the exact
  canonical boundary signature, and ONLY while **your Express switch is on
  AND Cashfree is the live provider**. One letter off → the real-phone rule
  bites. Empty phone → dead in the v84 loop.
- Your switch is the kill-switch: flip off → guests instantly get the classic
  checkout, and the API's guest lane closes (401).
- Members, typed guest flows, invoices, loyalty: untouched, byte-for-byte.

## Deploy + verify (2 minutes)

1. Extract into `public_html/cms/` (overwrite 5).
2. `curl -s https://www.shivaa.in/api/version` → `"rel":155`,
   `"shell":"shivaa-shell-v155"`, stamps `{"index":155,"app":155}`.
3. Phone, logged out, product → **Make It Yours**: the ONLY visible step is
   the browser arriving on Cashfree.
4. Pay one order → Admin shows the customer's REAL swept number/address, not
   the sentinel. (Unpaid boundary rows saying "Awaiting payment" are the
   design's normal litter.)

## QA behind this

`v155-check` **37/37** static (server pins re-ridden from v154 verbatim) ·
`v155-direct` **24/24** in a real DOM across nine scenarios — including an
**id-scoped tripwire that fails any future build where an overlay of ours
reappears in the lane** — and `v154-php-run` **11/11** executed against real
PHP (its version pin made forward-tolerant, stamps must be self-consistent).
Everything re-verified on a production-shaped overlay (v150 tree → v154 → v155).
Legacy v139–v142 green (v142 learned `exHandoff` in its pin-pairing assert);
v146–v154 suites era-guard-SKIP on this tree and still full-run on older ones.

Rollback ladder: v154 `b8eb964953e6647a3b068b748696dc8c` · v153
`e6948a2b38628359683601cccb139d63` · v152 `542fa9e199db9f6be15889032a985538`
· v150 `94c592867c2373519d9ea640f7f6713f`. No DB changes anywhere in it.
