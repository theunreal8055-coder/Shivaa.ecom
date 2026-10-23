# RELEASE LEDGER — Shivaa Ecom

**The highest release number here is the only truth.** Every other tree, branch, zip or note
that quotes a lower number is history. This file and `docs/release-ledger.json` are the same
facts: the `.md` is for humans, the `.json` is what the scripts read.

Machine checks (run both before touching anything):

```
bash qa/where-am-i.sh        # any branch, any clone: forward or behind?
python3 qa/check-handoff.py  # ledger == shipped tree == zips on disk == the docs
```

---

## 1 · Where the site is right now

| | |
|---|---|
| **Newest release** | **v235 — “The Millisecond Desk”** (packaged 23 Oct 2026, **awaiting the owner's yes**) |
| Package | `shivaa-update-v235.zip` · 367 files · 37,424,830 B · `f5b14e8a274a1911ed87875992de43a144402e48930f4702553e8ad09b26ec35` |
| **Applied on the site** | **v234 — “The Desk App”**, applied **23 Oct 2026** |
| Applied package | `shivaa-update-v234.zip` · 366 files · 37,416,420 B · `16adae14b9745f5d0560145775221d329ab304c1c688d64244885726585e1b84` |
| **Next release** | **v236** |
| Work branch | `arena/e8a470c6-shivaa-ecom` (the Arena session is hard-wired to it) |
| Twin branch | `arena/09f3c79f-shivaa-ecom` — frozen at its v220 tip `4a9e239`, PR #106 open, untouched |
| Release chain | v228 (17 Oct) → v232 (21 Oct) → v233 (23 Oct) → **v234 (23 Oct, applied)** → **v235 (23 Oct, packaged)** |

---

## 2 · The ledger

| Release | Commit | Title | Files | Zip bytes | sha256 (first 16 / last 8) | Status |
|---|---|---|---|---|---|---|
| v221 | `5bf57a2` | The Clean-Up Release | 349 | 37,044,662 | `0a1a8e0a620c73ac…eb6850eb` | shipped |
| v222 | `1da18c0` | The Load Release | 350 | 37,218,811 | `e05e08dd1bd550a4…d9f77643` | shipped |
| v223 | `1f6eca7` | The Smooth Release | 350 | 37,221,175 | `82c26f8a3261685d…3aec0218` | shipped |
| v224 | `52313d1` | The Every-Corner Release | 351 | 37,227,019 | `abd3f873bd552052…cf3fc304` | shipped |
| v225 | `e4cf8b4` | The App-Feel Release | 353 | 37,238,134 | `3c943a937f8f6d52…c83b01ae0` | shipped |
| v226 | `136af8f` | The Butter Release | 355 | 37,250,664 | `602a519266efa2e5…a89ef463` | shipped |
| v227 | `4fddcdb` | The Reading Layer | 357 | 37,266,250 | `c4cbf83d6efb06fc…2769ccc0f` | shipped |
| v228 | `f6f5a7b` | The Play Store Gate | 357 | 37,271,610 | `c9975a92f6498acf…a2fedbab9` | applied 17 Oct |
| v229 | `a6103b6` | The Paperwork Release | 358 | 37,317,163 | `c9c54cf09476be53…1a8a62d23` | applied 21 Oct |
| v230 | `f7b2c1d` | The Legibility Release | 359 | 37,326,620 | `371084903c4359ce…342a4dfe` | applied 21 Oct |
| v231 | `036e616` | The Engraved Layer | 360 | 37,333,506 | `114394131d4033ca…47fb937c` | applied 21 Oct |
| v232 | `b9f74bc` | The Idle Release | 361 | 37,349,816 | `14b9e9ca24571b05…5a5a4b4023` | applied 21 Oct |
| **v233** | **`a5cd382`** | **The Passbook Release** | **362** | **37,381,263** | **`e5a9b9ffa410b5ea…b117984c`** | **applied 23 Oct** |
| **v234** | **`5337f26`** | **The Desk App** | **366** | **37,416,420** | **`16adae14b9745f5d…585e1b84`** | **applied 23 Oct** |
| **v235** | **`PENDING`** | **The Millisecond Desk** | **367** | **37,424,830** | **`f5b14e8a274a1911e…8ad09b26ec35`** | **packaged 23 Oct — awaiting the owner's yes** |

Full 64-character hashes, byte counts and status live in `docs/release-ledger.json`.
v205 and everything before v221 are in the older `DEPLOY-v*.md` notes; they are not needed to
place this tree, because v221's zip already contains every file they shipped.

---

## 3 · What “forward only” means mechanically

1. **A number is spent the moment it is in this ledger.** Never renumber it, never rebuild it
   with different bytes, never ship it twice, never “restore” an old zip over a newer site.
2. **Never work on a tree below the newest row.** If `bash qa/where-am-i.sh` exits 3, that tree
   is behind: stop, fetch the release branch it names, reset to it, and only then work.
3. **A new release is always `next_release`.** Today that is **v236**. When it ships, append it
   here, move `live`, and set `next_release` to 237 — in the same commit as the zip.
4. **Rollback is the previous row, never an arbitrary older one.** From v235 that is v234;
   a full rollback past v229 also has to account for the private bills folder (`DEPLOY-v229.md` §2).
5. **The owner deploys, and only after his explicit yes.** A push, a merge, a green gate or a
   finished zip is not approval. Nothing in this repo goes live by itself.

`qa/make-update-zip.py` enforces rule 1: if the number it is asked to build is already in the
ledger, it rebuilds it to a temporary file and compares the sha256 — a faithful reproduction
of a shipped package is reported as such; different bytes are refused and deleted.

---

## 4 · Adding the next release (the ritual, in order)

1. `bash qa/where-am-i.sh` → must exit 0 on `arena/e8a470c6-shivaa-ecom`.
2. Work, then commit after every coherent stage. A sandbox reset once wiped hours of
   uncommitted work.
3. `bash qa/vNNN-gate.sh` (copy the previous gate, roll its suite list) → all checks green.
4. Roll the stamps **and** the suites' own pinned literals in the same commit.
5. Update the two shipped countdown docs (`cms/docs/HANDOFF-unreal8055.md`,
   `cms/docs/shivaa-website-facts-for-grok.md`) **before** building the zip — they travel
   inside it.
6. `python3 qa/make-update-zip.py NNN` → record files, bytes and sha256.
7. Append the row here **and** in `docs/release-ledger.json`; set `live` and `next_release`.
8. Write `DEPLOY-vNNN.md`, update `docs/NEXT-CHAT-HEAD.md`, `MEMORY.md`, `AGENTS.md`,
   `ARENA-STATE.md`, `docs/AGENT-HANDOFF.md`.
9. `python3 qa/check-handoff.py` → green, then commit and push to
   `arena/e8a470c6-shivaa-ecom` only.
