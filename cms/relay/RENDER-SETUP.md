# Free host setup — Render.com, click by click

You need: your Shivaa GitHub repo connected to Render, and the **four Angel
SmartAPI values** already saved in Shivaa Admin → Rate feed (API key, client
code, MPIN, TOTP secret). Keep that admin tab open — you'll copy from it.
Render's free Node service needs **no credit card**.

## Part 1 — Deploy the relay (~6 minutes)

1. Open **https://dashboard.render.com** → **Get Started** → **Sign in with
   GitHub** (authorize Render if asked).
2. Click the **New +** button (top right) → **Blueprint**.
3. Under "Connect a repository" find **Shivaa.ecom** → click **Connect**.
   (If it is not listed: click *Configure account* / *Configure GitHub App*,
   grant the Shivaa.ecom repo, come back.) If asked which **branch**, choose
   **arena/01a08ce6-shivaa-ecom** — that is where `render.yaml` lives.
4. Render finds **render.yaml** and shows service **shivaa-bullion-relay**.
   It asks for the secret values. Copy each from Shivaa Admin → Rate feed:
   * `SHIVAA_ANGEL_APIKEY` → your **SmartAPI key (X-PrivateKey)**
   * `SHIVAA_ANGEL_CLIENT` → **Angel client code** (e.g. AB1234)
   * `SHIVAA_ANGEL_MPIN` → **MPIN / login password**
   * `SHIVAA_ANGEL_TOTP` → **TOTP secret (Base32)**
   * `SHIVAA_PUBLIC_URL` → leave **blank** for now
   → click **Apply** / **Create Resources**.
5. Wait 2–3 minutes for the build. In **Logs** you should see, in order:
   `logged in as …`, `contracts: GOLD… / SILVER…`, `smart-stream open`,
   `relay HTTP on http://0.0.0.0:…`.
6. Copy your service URL from the top of the page, e.g.
   **https://shivaa-bullion-relay.onrender.com**.
7. Open that URL + **/healthz** in a browser:
   `https://shivaa-bullion-relay.onrender.com/healthz`
   During Indian market hours it should show `"connected":true,"open":true`.
   After hours `connected:true,"stale":true` is normal. First hit after an
   idle night can take ~40 s while the free instance wakes — refresh once.
8. **(Recommended) Stop it sleeping at night:** Render dashboard → your
   service → **Environment** → set `SHIVAA_PUBLIC_URL` to your service URL,
   save. (The relay then pings itself every 10 minutes. The open bullion
   desk already keeps it awake during use.)

## Part 2 — Connect the Shivaa board (~1 minute)

9. In Render: **Environment** → copy the value of **SHIVAA_RELAY_KEY**
   (Render generated it automatically; use the eye icon to reveal it).
10. Shivaa Admin → **Rate feed** → scroll to **⚡ Tick-push relay**:
    * **Relay server URL** = `https://shivaa-bullion-relay.onrender.com`
    * **Relay stream key** = the `SHIVAA_RELAY_KEY` value
    * **Browser push URL** =
      `https://shivaa-bullion-relay.onrender.com/stream?key=THE_KEY`
      (replace `THE_KEY` with the same value)
    → **Save feed settings**.
11. Open the Bullion Desk. The top heartbeat should change from
    `live <1 s` to **`live ⚡ push`** and the MCX rows now move the instant
    the exchange ticks — the same flicker as the big bullion apps. The
    dollar gold/silver/INR cards keep their ~1-second feed.

## Troubleshooting

* **Log says "login failed"** → re-check the 4 Angel secrets; the TOTP value
  is the *secret* (Base32), not a 6-digit code.
* **smart-stream never opens** → Render Logs show the HTTP code; 401/403
  means the Angel session was rejected — restart the service (Manual Deploy
  → Restart); it re-logins automatically every reconnect anyway.
* **Heartbeat still says `live <1 s`** → open the Browser push URL directly;
  you should see lines beginning `event: tick` updating. If you get
  `unauthorized`, the key in the URL is wrong. If it never connects, the
  service is asleep — open /healthz once to wake it.
* **"render.yaml not found" / it builds the website** → wrong branch:
  service → **Settings → Build & Deploy → Branch** =
  `arena/01a08ce6-shivaa-ecom`, then **Manual Deploy → Clear build cache**.
* **Render free hours** → one free service is fine within the monthly free
  quota with the self-wake above.
* Nothing depends on the relay being up — if Render is ever down, the board
  automatically falls back to its own 1-second polling.
