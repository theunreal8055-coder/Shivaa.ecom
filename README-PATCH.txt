SHIVAA.JEWELS — v155 PATCH · THE SILENT LANE (tap, two fetches, Cashfree)

UNZIP INTO:  public_html/cms/        (Hostinger → File manager → overwrite all 5)
FILES (5):  api.php  index.html  sw.js  js/app.js  js/admin.js
NO DB CHANGE · contains v152+v153+v154 fully — ONE zip is the whole story.

YOUR RULE, THIRD TIME, LITERAL: "completely remove the one tap page … redirect
customers directly to the cashfree payment portal once they click on buy now
check out or make it yours."

BETWEEN THE TAP AND CASHFREE THERE IS NOW: nothing of ours — not a page (v153),
not a field (v154), not even a status overlay, toast or spinner (v155).
The app makes exactly TWO calls (place the boundary order, mint ONE fresh
Cashfree session) and opens Cashfree the instant the session lands. Zero Shivaa
pixels render while it waits. The customer's real mobile + name + address are
collected and OTP-verified BY CASHFREE on its own page (One Click Checkout, as
you accepted); when payment confirms, the server writes the verified contact
BACK onto the order — Admin never ships to a placeholder.

WHAT CHANGED VS v154:
  · The lane stopped riding the shared pay-helper (built for the order-view
    RETRY, where re-minting a stale session matters) — it burns one mint.
  · Declined handoff → lands silently on the order view (Retry + UPI QR + pin
    live there). Refused ORDER → one honest toast, stay put, nothing placed.
  · FIXED A RACE THAT EXISTED SINCE v153: two rapid taps used to be able to
    interleave and place TWO orders. The lane now claims its busy-flag before
    any await — the 3-tap storm test proves: one order, one mint.
  · Reclaim resume (tab killed by Android mid-payment): order view FIRST,
    silent resume-mint on top. It can re-PAY, never re-PLACE.
  · server: api.php's order rules are BYTE-IDENTICAL to v154 (stamp only).

SAFETY LINES (all executed against real PHP + a real DOM):
  · Placeholder order accepted ONLY on the exact canonical signature AND only
    while YOUR switch + Cashfree are both live; one letter off → the
    real-phone rule bites; empty phone → dead in the v84 loop.
  · Switch off ⇒ guests get the classic checkout instantly and the API's guest
    lane closes (401). Members/typed flows untouched.
  · A permanent tripwire in QA FAILS any future build that re-adds an overlay
    to the lane. Forever fieldless. Forever silent.

VERIFY (one URL):  https://www.shivaa.in/api/version
  expect "rel":155, "shell":"shivaa-shell-v155", stamps {"index":155,"app":155}.

QA: 37/37 static · 24/24 jsdom×9 scenarios · 11/11 executed PHP · all green on
    a production-shaped overlay (v150 tree → v154 → v155).
Rollback: v154 b8eb9649… · v153 e6948a2b… · v152 542fa9e1… · v150 94c59286…
(same 5-file shape, no DB changes anywhere).
