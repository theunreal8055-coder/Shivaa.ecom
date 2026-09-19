SHIVAA.JEWELS — v152 PATCH · THE DELETION (Truecaller gone; tap → Cashfree direct)

UNZIP INTO:  public_html/cms/        (Hostinger → File manager → overwrite all 5)
FILES (5):  api.php  index.html  sw.js  js/app.js  js/admin.js
NO DB CHANGE · data/ folder untouched (you MAY delete data/tc-verify/ — nothing reads it)
⚠ SKIP the v151 zip — it is obsolete; v152 replaces it directly.

WHAT YOU ASKED FOR, EXACTLY AS YOU ASKED IT:
  "completely remove the Truecaller button and Truecaller feature and Truecaller
   from the back end front end everywhere from the file and when the customer
   presses buy now or make it yours or check out from the side bar also then you
   should directly take them to the cashfree payment portal"

WHAT CUSTOMERS NOW SEE:
  · First purchase on a phone → Buy Now / Make It Yours / cart Checkout →
    ONE field: their 10-digit mobile. Tap → Cashfree's payment page.
    (Cashfree's own API REQUIRES that number to even create the order — the
    number field is the minimum the payment giant legally accepts; there is
    nothing else in the way. Cashfree OTP-verifies the number on ITS page.)
  · Every later purchase on that phone → tap → Cashfree opens BY ITSELF.
    The number is remembered on the device only (180 days), never on a server.
  · Signed-in members → the normal checkout with their saved address — untouched.
  · After payment, delivery details are collected by Cashfree's One Click page
    exactly as before (your v143 rule; the address gate on the server stays).

OLD CACHED PHONES: an outdated app copy that still sends the old verification
  token gets IGNORED gracefully — order places as normal. No errors, no lost sale.

ADMIN: Settings → Payments loses the phone-verification fieldset and doctor.
  The "Express guest checkout" SWITCH STAYS — it is what turns this flow on.

VERIFY DEPLOYMENT (one URL):  https://www.shivaa.in/api/version
  expect "rel":152, "shell":"shivaa-shell-v152", stamps 152 — and NO "tc" key.

QA: 21/21 zero-residue · 14/14 browser-behaviour · 11/11 executed PHP — all on
    source AND production-shaped overlay. Rollback = v150 zip (94c592867c…).
