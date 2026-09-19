# DEPLOY — v151 (the profile-audit release: "who did Truecaller actually verify?")

**Zip:** `shivaa-update-v151.zip` · md5 `8f827df579540391088b86616b265ec9` · 4 files:
`api.php`, `index.html`, `sw.js`, `js/app.js` → extract into `public_html/cms/`, **overwrite all four**.

## What happened, in one paragraph

v150 FIXED the fetch — your live doctor proves it: the server now calls
`…/v1/default` and Truecaller answers 200 with a **real profile**. The profile it
returned is the **SHIVAA JEWELS business profile itself** (`"name":{"first":"SHIVAA
JEWELS","last":"Pvt Ltd"}`, companyName/badges/history present, and `phoneNumbers`
holds one landline-shaped number — no mobile for our checkout to accept, correctly:
the whole site requires a 10-digit [6-9] mobile). Your test phone's Truecaller app is
signed in **as the business account**, so the verification reads the business — and
finds no mobile. Real customers sign in with their own number, and THEIR profile carries
THEIR mobile — for them v150 may already work end to end.

## The 30-second test (no code needed)

Take ANY second phone (family, staff) whose Truecaller app is a normal personal account,
log out of the business one, and tap Buy Now on www.shivaa.in.
- Number arrives + Pay via Cashfree lights up → **the flow works for customers today**;
  only business-account devices can't be served (nothing to fix in code).
- Still fails → immediately run
  `curl -s https://www.shivaa.in/api/auth/truecaller/config`
  and read the NEW v151 key **`lastProfile`**:
  · `who=SP p=landline:1 business` AGAIN with the second tester → the Truecaller console
    is serving the DEVELOPER profile to every consent (test mode / app-level token).
    Fix is then in the Truecaller console: flip the app LIVE and whitelist real numbers —
    not in our code.
  · `who=<their initials> p=mobile:1` → the customer path is proven from the doctor itself.

## What v151 changes

Server-side only (page code untouched except stamps). Every Truecaller read — consent or
after-payment re-read, success or failure — now records WHOSE profile it was, in 40
privacy-safe characters: name INITIALS + phone CLASSES (`mobile/landline/short/odd`) + a
`business` flag. No digits of any number are ever stored; the public
`/api/auth/truecaller/config` JSON gains one key: `lastProfile`. That single fetch now
answers the only remaining question instead of "still no number".

## Proof it's live — ONE honest URL now

`curl -s https://www.shivaa.in/api/version` → `{"ok":true,"rel":151,"shell":"shivaa-shell-v151","stamp":{"index":151,"app":151},"tc":{…}}`
(v151 SHIPS that endpoint. Earlier DEPLOY docs cited `/api/health` — that route **never existed**;
it answered `{"error":"Unknown API"}`. My mistake, now fixed at the source: the server itself
reads sw.js/index/app stamps beside api.php and tells you, plus the last Truecaller verdict —
`kind`, `ok`, and v151's `who` line — in the same JSON.)

## Rollback

v150 zip `94c592867c2373519d9ea640f7f6713f` (or v149 `7b4b08912fe874ea6b153b8323b9361d`) over the same four paths.
