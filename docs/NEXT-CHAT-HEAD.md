# NEXT-CHAT-HEAD — paste this first in every new chat

**Written 12 Nov 2026 (Asia/Calcutta), after v244 was packaged.**
**Site: v241 (applied — smooth, but taps stopped working). Newest release: v243 “Header bar”** — packaged,
awaiting the owner's yes; it contains v237–v242. **Next release: v244.** Session branch:
`arena/95be65a4-shivaa-ecom`.

**Written 12 Nov 2026 (Asia/Calcutta), after v244 was packaged.**
**Site: v241 (applied — smooth, but taps stopped working). Newest release: v244 “Butter”** — packaged,
awaiting the owner's yes; it contains v237–v243. **Next release: v245.** Session branch:
`arena/95be65a4-shivaa-ecom`.

**Branches (read this once):** this session works on `arena/95be65a4-shivaa-ecom`. The ledger's stored
`release_branch` field still says `arena/e8a470c6-shivaa-ecom` — that is the name an earlier session wrote
into `docs/release-ledger.json` and `qa/check-handoff.py` pins it, so it stays; it is **not** a branch to
switch to. Never switch, create or push a branch other than the session branch.

**Live package (v241):** `shivaa-update-v241.zip` · 682 files · 43,636,784 B · sha256
`6987184a07398433c59cb4304f3f0b0e2a27583fed97d13787a0bcf90c7c8cdf`.

**v244 package:** `shivaa-update-v244.zip` · **686 files** · **43,657,910 B** · sha256
`5b3bfdb3fa490fc32071bb17339ecfbc30ca634cfd5f9439f56a487c784453d8` — one css layer (`css/v244.css`,
appended to the bundle) and one js layer (`js/v244.js`). **v242 (683 files) and v243 (684 files) were
packaged and never installed; v244 contains all of both.**

**Why v244 exists:** the owner: *“buttery smooth, easy to navigate, every button like butter, fast loading
of EVERY page without stutter, the page shouldn't feel stuck.”* The frame cost was still in four places:
the **sticky header re-blurred the page every scroll frame** (`backdrop-filter:blur(20px)` in
`.header.scrolled`; v241 removed it on phones only), **every card held a GPU layer for its life**
(`will-change:transform`, touch-only fix in v241), **long grids built every card on every render**, and
**~180 infinite shimmers repainted forever**. All four closed: opaque sticky bars, hover-only promotion,
`content-visibility` from the 7th card, decoration parked during a gesture (`html.shv-scrolling`). Plus
decode-ahead, hover-intent product photo, **Back remembers the scroll**, and **`?perfdiag=1`** (fps / long
tasks / LCP / CLS + Copy report) so the next stutter is diagnosed, not guessed.

> ⚠ **v244 was packaged without a per-release gate script.** `node --check` (v244, sw, app),
> `t-v244-butter` (**51/51**), `t-v243-header` (36/36), `t-v242-taps` (37/37), `t-v241-perf` (43/43),
> `t-v240-rip` (16/16) and `check-handoff.py` (**211 checks, 0 red**) are green. jsdom has no layout or
> compositor: the frame work is proven by reading the shipped rules plus class assertions, never by a
> screenshot. `qa/v24x-gate.sh` still has to be created from the v236 gate with the pins rolled.

---

## 0 · The 30-second paste block

Paste this at the top of a new chat, whatever branch it opens on:

```
Read docs/NEXT-CHAT-HEAD.md first. Work only on arena/95be65a4-shivaa-ecom.
Before anything else run: bash qa/where-am-i.sh
  exit 0 → forward, work here.   exit 3 → this tree is BEHIND: stop and run the
  three commands it prints; never work, build a zip or write docs on an old tree.
Then: git fetch origin arena/95be65a4-shivaa-ecom && git reset --hard FETCH_HEAD
The site is on v241. Newest release is v244 “Butter” (packaged, awaiting the owner's yes; it
contains all of v242 and v243). Next release is v245. Never rebuild, renumber or re-ship v244 or older.
Machine truth: docs/release-ledger.json. After any doc edit: python3 qa/check-handoff.py
```

That block is the whole contract. Everything below is the detail behind it.

