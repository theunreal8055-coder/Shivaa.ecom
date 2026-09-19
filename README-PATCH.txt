SHIVAA.JEWELS — v150 PATCH · the Truecaller-hiccup fix (server-side only)

UNZIP INTO:  public_html/cms/        (Hostinger → File manager → overwrite)
FILES (4):  api.php  index.html  sw.js  js/app.js
NO DB CHANGE · NO RE-UPLOAD OF PRODUCTS/IMAGES · NOTHING ELSE TO TOUCH

WHAT YOU GET
  · The one-tap flow from v149 is UNCHANGED on the page (byte-identical app.js apart from
    the version stamp) — Buy Now → Truecaller sheet, no waiting page.
  · THE HICCUP FIX: when Truecaller hands us the profile host without /v1/default
    (that's what your live doctor proved was happening — 200 OK, valid JSON, no phone in
    it), the server now appends /v1/default itself before fetching. Proper User-Agent +
    up to 2 redirects too.
  · SELF-REPORTING DOCTOR: any failure records the exact URL fetched (lastEp) and a body
    snippet with ALL digits masked. If one tap on the live site still hiccups, the
    admin-doctor JSON alone tells me what to fix — no ssh needed.

VERIFY (2 min)
  1) curl -s https://www.shivaa.in/api/health          →  "release":150
  2) curl -s https://www.shivaa.in/api/auth/truecaller/config
                                                       →  JSON with "lastEp" key present
  3) Android + www.shivaa.in: Buy Now on an instant item → Truecaller sheet →
     number arrives in the field, Pay via Cashfree lights up. Zero typing.

ROLLBACK
  extract shivaa-update-v149.zip (md5 7b4b08912fe874ea6b153b8323b9361d) over the same 4 paths
