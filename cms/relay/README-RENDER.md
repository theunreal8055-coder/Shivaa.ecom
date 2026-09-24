# Shivaa MCX relay v2 — Render deployment (v179)

This folder is a complete, **zero-dependency** Node service: one file
(`relay.js`) + this `package.json`. It replaces the v78 relay that broke
with *"signal is aborted without reason"*. Same public contract the site
already speaks (`/tick`, `/stream?key=…`, now also `/healthz`), built only
on the Angel SmartAPI REST endpoints the site itself uses daily, with an
explicit self-heal for every failure mode (abort → backoff+retry, daily
3:30 AM session expiry → auto re-login, contract rollover → auto
re-resolution, 429 → polite backoff, 90 s no-frame watchdog).

## Deploy (two minutes)

1. Render → **New → Web Service** → point at this folder (push it to a
   repo, or drag-drop). Build: none. Start: `npm start` (or
   `node relay.js`). Node version: 18 or newer.
2. Environment variables (the relay reads env first):

   | Variable | Value |
   |---|---|
   | `ANGEL_API_KEY` | Angel One API key |
   | `ANGEL_CLIENT`  | client code |
   | `ANGEL_MPIN`    | MPIN |
   | `ANGEL_TOTP_SECRET` | TOTP base32 secret |
   | `RELAY_TICK_KEY` | any random string — **the site** sends it as `X-Relay-Key` |
   | `RELAY_STREAM_KEY` | any random string — goes into the public `?key=…` |
   | `ANGEL_GOLD_TOKEN` / `ANGEL_SILVER_TOKEN` | optional manual contract tokens (otherwise auto-resolved) |

3. Copy the web-service URL (e.g. `https://your-relay.onrender.com`).
4. In the site admin → Live Rates: **Relay server URL** = that URL,
   **Relay stream key** = `RELAY_TICK_KEY`, **Browser push URL** =
   `https://your-relay.onrender.com/stream?key=<RELAY_STREAM_KEY>`.

## Health

`GET /healthz` → `{ok, state, frames, lastFrameAgeMs, lastError, …}`.
`state` is one of `live · backoff · error`. The site's admin **Live
Rates** tab shows the same thing as the "relay" row of the health strip.

## Free-tier note (honest)

A free Render instance sleeps after ~15 min of **zero** traffic. While
the site has viewers its 1-second `/tick` poll keeps the relay warm; after
a true idle period the first poll wakes it (up to ~50 s). **That no longer
matters for correctness:** since v179 the site prices from its own Angel
feed + the calibrated spot-premium fallback when the relay is absent, so
a sleeping relay degrades the board's freshness, never the prices. A paid
instance (or any always-on box) removes even that.

## Replacing the old relay

The old v78 relay can stay running until you switch the site's
*Relay server URL* to the new one — then delete the old service.
