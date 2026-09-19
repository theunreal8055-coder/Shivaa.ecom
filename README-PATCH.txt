shivaa-update-v149.zip — md5 7b4b08912fe874ea6b153b8323b9361d
4 files (root layout): api.php · index.html · sw.js · js/app.js   (cms/js/admin.js untouched, loader stays ?v=147)

EXTRACT INTO public_html ROOT over the live v148 site. Rollback = re-extract shivaa-update-v148.zip
(md5 221a807059a121f919f35415f28db617) over the same 4 files.

v149 = INSTANT ONE-TAP + SELF-HEALING PROFILE READ, per the owner's live test:
· the "reading the number hiccuped" failure (live doctor: "profile had no Indian mobile number")
  is fixed by a deep recursive profile reader + a body fallback + a server-side refetch that
  retries OUR read with the same Truecaller token before the customer ever sees an error;
  the doctor now logs the profile KEY NAMES for any future shape gap.
· Make It Yours / cart Checkout on Android+Truecaller no longer open the Express page at all:
  the deep link fires in place (floating pill), the verified number places the order silently,
  and the FIRST real page is Cashfree. Declines/timeouts/iPhone/desktop hand off to the Express
  page (fallback) with the same nonce still pending — typing stays the last resort.
· a reclaimed Android tab resumes the exact instant flow at boot (pending marker carries mode:'instant').
Stamps 149/149/149/149. Full proofs: v149-check 31/31 · v149-php-run 12/12 · v149-tc-instant
20/20 · all 19 legacy suites + patience 16/16 + autobuy 14/14 + pay-audit invariants 10/10 on
the stacked overlay (main + v147 + v148 + v149).
