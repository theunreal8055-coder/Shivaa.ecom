SHIVAA.JEWELS — v151 PATCH · the "whose profile?" doctor upgrade (server-side only)

UNZIP INTO:  public_html/cms/        (Hostinger → File manager → overwrite)
FILES (4):  api.php  index.html  sw.js  js/app.js
NO DB CHANGE · NOTHING ELSE TO TOUCH · YOUR PAGE CODE IS UNCHANGED (byte-identical except stamps)

WHERE THINGS REALLY STAND (from YOUR live server's doctor — v150 worked):
  The fetch now hits the right endpoint and Truecaller ANSWERS WITH A REAL PROFILE.
  The profile it read is the SHIVAA JEWELS BUSINESS account itself (that is the Truecaller
  login on the phone you test with). A business profile carries a landline, not a mobile —
  and the checkout legitimately needs a 10-digit mobile, so the card falls back to typing.
  For a CUSTOMER's phone, Truecaller returns the CUSTOMER's profile with THEIR mobile —
  that path very likely already works. One test proves it in 30 seconds:

  → Grab any second Android phone with a normal personal Truecaller. Tap Buy Now.
    Number arrives + Cashfree lights up  =  DONE, it works for customers.
    Still fails  →  run:  curl -s https://www.shivaa.in/api/auth/truecaller/config
    and send me  "tc":{"who":"…"}  from curl -s https://www.shivaa.in/api/version  (or lastProfile from /api/auth/truecaller/config).
    Same who= again on the second tester  =  Truecaller console in TEST MODE serving one
    fixed profile — flip it LIVE / whitelist numbers in the console. No code fix needed.

VERIFY v151 IS ON (new honest endpoint, ships with it):
  curl -s https://www.shivaa.in/api/version   →  {"ok":true,"rel":151,"shell":"shivaa-shell-v151",…,"tc":{"who":"…"}}
  (ignore any earlier doc mentioning /api/health — that route never existed; /api/version replaces it)
ROLLBACK: shivaa-update-v150.zip (md5 94c592867c2373519d9ea640f7f6713f) over the same 4 paths
