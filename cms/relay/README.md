# Shivaa Bullion Tick Relay (v78)

Turns the bullion desk from 1‑request/second **polling** into official
**push** streaming: ticks arrive the instant the exchange matches a trade
(often several per second), exactly like the big bullion apps.

The relay connects to **Angel One SmartAPI SmartStream v2** (the same free
demat account already configured in Admin → Rate feed), subscribes to the
near‑month MCX GOLD + SILVER contracts in SnapQuote mode (LTP, OHLC, best
bid/ask, OI, ATP, volume), and:

* on the **same server** as the site it atomically rewrites
  `cms/data/.angel-tick.json` (~10×/sec) — `api.php` serves it with no
  outbound call at all;
* anywhere else it exposes `GET /tick` (JSON, polled by `api.php`) and
  `GET /stream` (Server‑Sent Events, pushed straight to jewellers'
  browsers). Both require the stream key.

If the relay stops, the board silently falls back to its built‑in REST
polling — nothing ever goes blank.

> Legal note: broker streaming is licensed for your own/jeweller‑desk use.
> Public redistribution of real‑time MCX data on an open website requires an
> MCX data‑feed agreement (the desk here is jeweller‑gated); see
> mcxindia.com/technology/datafeed.

---

## Option A — same box (a VPS, recommended; ~₹400–500/month)

1. Install Node 18+ (`node -v`), upload this `relay/` folder.
2. `cd relay && npm install`
3. `cp relay.config.example.json relay.config.json` and fill the **same 4
   credentials** used in Admin → Rate feed (API key, client code, MPIN,
   TOTP secret). Set `"cacheDir": "../data"` and a long random
   `"streamKey"`. Leave tokens blank — contracts auto‑resolve and roll over.
4. Test: `node shivaa-relay.mjs` → expect `logged in`, `smart-stream open`,
   `relay HTTP on …`, and `data/.angel-tick.json` updating while the market
   is open. `curl` http://127.0.0.1:8944/healthz
5. Make it always‑on: copy `shivaa-relay.service` into
   `/etc/systemd/system/` (edit paths/user), then
   `sudo systemctl daemon-reload && sudo systemctl enable --now shivaa-relay`
   (logs: `journalctl -u shivaa-relay -f`).
6. Nothing to fill in the admin relay boxes for a same‑box install —
   PHP finds the shared cache file automatically.

## Option B — free/cheap Node cloud host (when the site is on shared hosting)

1. Deploy this folder to Render / Railway / any Node host (start command
   `npm start`). Set the config via environment variables instead of a
   config file:
   `SHIVAA_ANGEL_APIKEY`, `SHIVAA_ANGEL_CLIENT`, `SHIVAA_ANGEL_MPIN`,
   `SHIVAA_ANGEL_TOTP`, `SHIVAA_RELAY_PORT` (host‑provided),
   `SHIVAA_RELAY_HOST=0.0.0.0`, `SHIVAA_RELAY_KEY=<long random>`,
   `SHIVAA_WRITE_CACHE=0`.
2. Note the public URL, e.g. `https://shivaa-relay.onrender.com`.
3. Admin → Rate feed → relay section:
   * **Relay server URL** = public URL (server‑side pull)
   * **Relay stream key** = the same `SHIVAA_RELAY_KEY`
   * **Browser push URL** = `https://…/stream?key=<SHIVAA_RELAY_KEY>`
4. `https://…/healthz` must show `"connected": true` during market hours.

## Operations

* Sessions self‑heal at the daily 03:30 IST expiry (auto re‑login);
  contracts re‑resolve every 6 h and on rollover‑silence detection.
* Heartbeat every 10 s; stale after 30 s without ticks (market closed);
  reconnect with back‑off is automatic.
* Unit‑tested packet parser: `node --test`‑style checks live in the build
  harness; no runtime dependencies beyond `ws`.
