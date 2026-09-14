# qa/v106-src — the v105/v106 work, parked for the v107 port

These are byte-copies of the `cms/` files as they stood at commit `dab3dec`
(v106, built on the repo's OLD base line) plus the same files as shipped in
`shivaa-update-v106.zip`.

They are **development references, never deployed**. `cms/` has since been
synced to the owner's live v104 package, which is ~15,000 lines larger
(payments, Gold Finale, PWA/service worker, Saathi, 8 extra admin desks,
55 extra API endpoints, 15 extra pages).

During the v107 port, only the genuinely-new v105/v106 work is lifted out of
this folder and re-applied to the v104 base:

  * footer rate ticker + the "spot + Jaipur premium" basis line
  * tap-reactive rates glow (tab-ahead / applyTabGlow / .tab-press / hidden-tab pause)
  * Quick View scroll reset + focus + reachable buy row
  * B2B design full-detail sheet (gross/less/net, stones, fine-metal maths)
  * route-scoped redirect timer (a dead link's countdown can no longer hijack a good page)
  * design selection survives a catalogue grid re-render
  * .cd-rowctl (remove button out of .cd-qty)
  * hardenHandlers() passthrough set + targeted null guards
  * css/v105.css §12.1-§12.11 (reconciled against mobile.css / aurum.css / motion.css)

Everything else in here (4-digit OTP, 20-min rate lock, mini-cart fly-to-bag,
filter drawer, search, size guide, partner bullion default, design photo
slider, dead-stock categories) ALREADY EXISTS in the live v104 line and must
not be duplicated — the v104 implementation wins unless a diff shows mine is
strictly better.
