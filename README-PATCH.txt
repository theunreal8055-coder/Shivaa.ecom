SHIVAA.JEWELS — v154 PATCH · FIELDLESS (tap → Cashfree. Nothing else.)

UNZIP INTO:  public_html/cms/        (Hostinger → File manager → overwrite all 5)
FILES (5):  api.php  index.html  sw.js  js/app.js  js/admin.js
NO DB CHANGE · includes v152+v153 fully — if you never deployed those, THIS zip
alone is the complete story.

YOUR RULE, LITERALLY: "completely remove the one tap page … redirect customers
directly to the cashfree payment portal once they click on buy now check out or
make it yours."

WHAT A CUSTOMER SEES BETWEEN THE TAP AND CASHFREE NOW:
  one line of status — "Opening your Cashfree payment…" — then Cashfree.
  No page. No card. No field. No account. No OTP from us.
  Their real mobile + name + address are collected and verified BY CASHFREE on
  its own page (One Click Checkout, as you accepted), and the moment payment
  confirms, the verified contact is written BACK onto the order — Admin never
  has to ship to a placeholder. Unpaid placeholder orders are simply
  "Awaiting payment" rows that expire out of relevance.

SAFETY LINES KEPT (all tested on the real PHP engine):
  · The server accepts the placeholder ONLY on the exact canonical signature
    AND only while your Express switch + Cashfree are both live. One letter
    off = the old real-phone rule bites. Empty phone = still dead in the
    v84 address loop.
  · Flip the switch OFF → guests instantly return to the classic checkout —
    and the guest order LANE itself closes (401). Zero residual exposure.
  · Members, typed flows, invoices, loyalty points: untouched, byte-for-byte.
  · A tab Android killed mid-payment RESUMES THE PAYMENT (same order id) —
    it can never double-place an order.
  · Old cached phone apps sending obsolete fields: silently ignored, orders
    place normally.

VERIFY (one URL):  https://www.shivaa.in/api/version
  expect "rel":154, "shell":"shivaa-shell-v154", stamps {"index":154,"app":154}.

QA: 24/24 static · 17/17 real-DOM (8 scenarios; a tripwire FAILS any future
    release that re-adds a field to the lane) · 11/11 executed PHP. Source AND
    production-shaped overlay all green.
Rollback: v153 e6948a2b… (card kept) · v152 542fa9e1… (page kept) · v150 94c59286…
