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
| **Newest release** | **v242 — “Responsive”** (packaged 12 Nov 2026, **awaiting the owner's yes**; contains v237–v241) |
| Package | `shivaa-update-v242.zip` · 683 files · 43,644,946 B · `ceaa75c99a516f0157037557aaa82a6c7ee7f84943dc374438bc443a3aecfa0c` |
| **On the site** | **v241** — applied by the owner 12 Nov 2026: smooth, but *“clicks are not working now and buttons are unresponsive”*. v242 is the fix. |
| Package on the site | `shivaa-update-v241.zip` · 682 files · 43,636,784 B · `6987184a07398433c59cb4304f3f0b0e2a27583fed97d13787a0bcf90c7c8cdf` |
| **Next release** | **v243** |
| Work branch | `arena/95be65a4-shivaa-ecom` (cut from `a9445dc`, the v236 tip of `arena/800194ed-shivaa-ecom`) |
| Twin branch | `arena/09f3c79f-shivaa-ecom` — frozen at its v220 tip `4a9e239`, PR #106 open, untouched |
| Release chain | v232 → … → v239 → v240 (applied 12 Nov, ripple fix) → v241 (applied 12 Nov, smooth — broke taps) → **v242 (packaged 12 Nov, the responsive fix)** |

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
| v235 | `67e48a1` | The Millisecond Desk | 367 | 37,424,830 | `f5b14e8a274a1911e…8ad09b26ec35` | packaged 23 Oct — superseded by v236 before the owner applied it |
| v236 | `c64a771` | The Counter Book | 368 | 37,445,481 | `b6483f250bc1600b…d129d6655` | **on the site** (owner's `/api/version` reads 236) |
| v237 | `80a6d42` | The Weight Release | 369 | 37,448,114 | `10752b0ad94f1173…be8cbd77` | packaged 12 Nov — never applied, v238 contains it |
| v238 | (packaged) | The Drawer Guard | 370 | 37,450,998 | `234f7b01326f58aa…de48f556` | applied 12 Nov — did not fix the sidebar, superseded by v239 |
| v239 | (packaged) | The Sidebar Guard | 371 | 37,454,324 | `c4d66d64f1e40e08…4535db4a` | applied 12 Nov — did not fix it, superseded |
| v240 | (applied 12 Nov) | The Ripple Fix | 372 | 37,457,438 | `33f2916da9215d37…112371d8` | **applied — “Issue fix hogya”** |
| v241 | (applied 12 Nov) | Smooth | 682 | 43,636,784 | `6987184a07398433…0c7c8cdf` | **applied — smooth, but taps died** (rebuilt `trimMedia`, instant repaint, ₹0 fast paint, soft PDP photo) |
| v242 | (packaged) | Responsive | 683 | 43,644,946 | `ceaa75c99a516f01…aecfa0c` | packaged 12 Nov — taps land again, hover photo off touch, gallery photo is the original |
<!-- The Weight Release | 369 | 37,448,114 | `10752b0ad94f1173…be8cbd77` | packaged 12 Nov — awaiting the owner's yes |
| **v236** | **`c64a771`** | **The Counter Book** | **368** | **37,445,481** | **`b6483f250bc1600b…d09d129d6655`** | **packaged 23 Oct — awaiting the owner's yes** |

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
4. **Rollback is the previous row, never an arbitrary older one.** From v236 that is v235,
   which supersedes v234 (the last build the owner applied);
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
