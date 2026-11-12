# NEXT-CHAT-HEAD — paste this first in every new chat

**Written 12 Nov 2026 (Asia/Calcutta), after v245 was packaged.**
**Site: v244 (applied — and it broke the phone). Newest release: v245 “Scroll back”** — packaged, awaiting
the owner's yes; it contains v237–v244. **Next release: v246.** Session branch:
`arena/95be65a4-shivaa-ecom`.

**Branches (read this once):** this session works on `arena/95be65a4-shivaa-ecom`. The ledger's stored
`release_branch` field still says `arena/e8a470c6-shivaa-ecom` — that is the name an earlier session wrote
into `docs/release-ledger.json` and `qa/check-handoff.py` pins it, so it stays; it is **not** a branch to
switch to. Never switch, create or push a branch other than the session branch.

**Live package (v244, broken):** `shivaa-update-v244.zip` · 686 files · 43,657,910 B · sha256
`5b3bfdb3fa490fc32071bb17339ecfbc30ca634cfd5f9439f56a487c784453d8`.

**v245 package:** `shivaa-update-v245.zip` · **688 files** · **43,663,243 B** · sha256
`68c2e0b3d9b951aab4d96fcd3a031f0e0d5e0dcc0dea5de861aba7d0386c8552` — one css layer (`css/v245.css`,
appended to the bundle) and one js layer (`js/v245.js`).

**Why v245 exists (the most important paragraph in this repo):** the owner installed v244 and wrote
*“i cant even scroll anything on mobile now, everything has just stopped”*. The cause was
**`content-visibility: auto`**, not the blur: a skipped subtree is not laid out, so it reports the
placeholder height from `contain-intrinsic-size` instead of its real height (document shorter than its
content → the page stops scrolling) and the lazy images inside it never start (blank cards). It had been
spread across `.p-grid`, `.pillars`, `.ugc-wall`, `.catbar-outer`, `.p-card`, `.ds-card`, `#view > section`
and the footer, and v244 added two more. **Never add it again.** v245 deleted every occurrence from the
bundle and added a universal `content-visibility: visible !important` guard. It also removed v244's
`html, body { overflow-x: hidden }` (an iOS scroll stopper) in favour of `clip`, gave the decoration parking
a 400 ms watchdog plus `hashchange`/`pageshow`/`visibilitychange` release, added **`?nofx=1`** as a kill
switch and **`?perfdiag=1`** for a report, made decode-ahead 240 px on a coarse pointer (never forcing
`eager` on a phone), and made `js/v245.js` wake any on-screen image that never started.

> ⚠ **No per-release gate script exists.** `node --check` (v244, v245, sw, app), `t-v245-scroll`
> (**39/39**), `t-v244-butter` (53/53), `t-v243-header` (36/36), `t-v242-taps` (37/37), `t-v241-perf`
> (43/43), `t-v240-rip` (16/16) and `check-handoff.py` are green. **jsdom has no scroll engine and no
> compositor** — the v244 bug was found by reasoning about layout containment, not by measuring it here.
> That is exactly why `?nofx=1` and `?perfdiag=1` exist.

---

## 0 · The 30-second paste block

Paste this at the top of a new chat, whatever branch it opens on:

```
Read docs/NEXT-CHAT-HEAD.md first. Work only on arena/95be65a4-shivaa-ecom.
Before anything else run: bash qa/where-am-i.sh
  exit 0 → forward, work here.   exit 3 → this tree is BEHIND: stop and run the
  three commands it prints; never work, build a zip or write docs on an old tree.
Then: git fetch origin arena/95be65a4-shivaa-ecom && git reset --hard FETCH_HEAD
The site is on v244 (installed and it broke the phone's scroll). Newest release is v245
"Scroll back" (packaged, awaiting the owner's yes; it contains v237-v244).
Next release is v246. Never rebuild, renumber or re-ship v245 or older.
Never use content-visibility on this site: it froze the phone's scroll in v244.
Machine truth: docs/release-ledger.json. After any doc edit: python3 qa/check-handoff.py
```

That block is the whole contract. Everything below is the detail behind it.

