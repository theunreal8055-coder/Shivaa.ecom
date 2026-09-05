# FULL AUTOMATION — how the loop runs itself (from 5 Sep 2026)

**You (owner) do once (~5 min):** bridge setup form + one cron line (below).
**You (owner) do per batch:** attach the supplier PDF / photos / product info in
the Arena chat + say which category/section it belongs to.
**The agent does everything else:** ingest → tag/weight ground truth → AI
photoshoot (men's styling, 4 shots/design) → Ken-Burns film → SEO metadata →
commit + push to GitHub.
**Your server does the rest:** cron worker `auto_sync.php` (every 5 min) pulls
the latest branch from GitHub and uploads every finished design to shivaa.in
(media + product upsert, category rings + tag mens = Men's section). Ledger
makes it resumable; nothing is ever duplicated.

## One-time setup
1. File Manager: upload repo ZIP (branch `arena/01a07082-shivaa-ecom`) to home
   dir → Extract.
2. File Manager: `public_html/` → new secret folder (e.g. `pub-k9x2m`) → copy
   `deploy/upload_bridge.php` into it.
3. Browser: `https://shivaa.in/pub-k9x2m/upload_bridge.php`
   → section **🤖 Auto-sync**: enter admin password (+ PAT or checkout path)
   → **Save auto-sync settings**.
   - PAT (optional, only if no git checkout on server): GitHub → Settings →
     Developer settings → Fine-grained tokens → new token → repo
     `Shivaa.ecom` → Contents: Read-only.
4. hPanel → **Cron Jobs** → Custom, every 5 minutes:
   `php /home/<USER>/auto_sync.php >/dev/null 2>&1`   (exact line shown on page)
5. Tap **▶ Run sync now** once to verify; then **💣 SELF-DESTRUCT** the bridge
   and delete its folder. Auto-sync keeps running (config + worker live in your
   home dir, not in the bridge folder).
6. Rotate the admin password any time: update it via a fresh bridge setup save
   (or edit `~/.shivaa-sync.json`, 0600).

## Files on the server (home dir)
- `.shivaa-sync.json` (0600): admin email+password, PAT, repo/branch
- `auto_sync.php`: the cron worker
- `shivaa-sync.log`, `shivaa-sync-last.json`, `shivaa-sync-ledger.json`
- `shivaa-sync-src/`: latest branch tarball extract (auto-managed)

## Per-batch intake (what to send in chat)
- Supplier PDF (one design per page photo) and/or loose photos
- Any product facts you have (names, stones, sections); category + section
  ("rings / men's", "necklaces / bridal", …)
- Weights/purity are read from the supplier tags in the PDF (visual OCR) —
  never invented; designs without readable tags are quarantined for you to fill.

## Cadence & limits
- AI photoshoot: 10 images per message (platform cap) — the agent burns these
  automatically each turn until the batch is complete.
- Sync lag: ≤5 min after push. Cron caps 12 designs per run (burst-safe).
