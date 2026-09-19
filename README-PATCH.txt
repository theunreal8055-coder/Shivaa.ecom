SHIVAA.JEWELS — v153 PATCH · THE PAGE IS GONE TOO (tap → Cashfree, no screens)

UNZIP INTO:  public_html/cms/        (Hostinger → File manager → overwrite all 5)
FILES (5):  api.php  index.html  sw.js  js/app.js  js/admin.js
NO DB CHANGE · includes everything v152 did (vendor deletion) — deploy THIS one.

YOUR WORDS, DONE: "completely remove the one tap page of Shiva that you are
made and redirect customers directly to the cashfree payment portal once they
click on buy now check out or make it yours."

WHAT CUSTOMERS NOW DO:
  · Buy Now / Make It Yours / cart or sidebar Checkout — the order is placed
    ON THE SPOT (no page opens, the URL never visits a checkout step) and the
    browser lands on CASHFREE's payment portal.
  · Returning device: NOTHING to type, nothing to press — the number lives in
    that phone's browser (180 days) and the tap speaks for itself.
  · Brand-new device: ONE small card over the very page they're on asks the
    10-digit mobile — the single thing no code can remove (Cashfree refuses
    to create an order without it; your address gate demands it too).
    Cancel works cleanly: nothing is bought, nothing lingers.
  · Members: classic checkout untouched.
  · Android killed the tab mid-payment? Reload RESUMES THE PAYMENT on the same
    order — it can never double-place (proven by the QA suite).

VERIFY (one URL):  https://www.shivaa.in/api/version
  expect "rel":153, "shell":"shivaa-shell-v153", stamps {"index":153,"app":153}.

QA: 27/27 static · 23/23 real-DOM (9 scenarios) · legacy v139–v142 green ·
    all on source AND production-shaped overlay.
Rollback: v152 zip 542fa9e199db9f6be15889032a985538, or v150 zip 94c592867c…
