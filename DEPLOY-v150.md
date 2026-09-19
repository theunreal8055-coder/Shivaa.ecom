# DEPLOY — v150 (the Truecaller-hiccup fix)

**Zip:** `shivaa-update-v150.zip` · md5 `94c592867c2373519d9ea640f7f6713f` · 4 files:
`api.php`, `index.html`, `sw.js`, `js/app.js` → extract into `public_html/cms/`, **overwrite all four**.

## What v150 is

Your live test proved the one-tap flow works (tap → Truecaller sheet, no page in between).
The number read still hiccuped — and the v149 doctor told us exactly why: the fetch answered
**HTTP 200 with valid JSON containing no phone at all**. That is the signature of calling
Truecaller's profile **host root** instead of its `/v1/default` endpoint: when the callback
reports `"https://profile4-…truecaller.com"` (no path), v148 accepted the host but fetched it
as-is. v150 fixes exactly that, **server-side only — the page code is byte-identical to v149
apart from the version stamps**, so the instant-tap behaviour you verified cannot regress.

1. **Endpoint normalisation** — a bare or root-shaped profile URL now gets `/v1/default`
   appended before anything else touches it; real paths and queries are untouched; fragments
   die. Junk stays junk (still refused by the allowlist).
2. **The profile GET behaves like a real client now** — sends a compatible User-Agent and
   follows up to 2 redirects (bare-path profile hosts 301 to `/v1/default`; CDNs 200-error a
   bare curl), and a failed fetch's body snippet is captured for the doctor.
3. **Privacy-safe failure evidence** — any failure stores in the public doctor:
   `lastEp` (the exact URL fetched) and a body snippet with **every digit → `#` and every
   token-length blob masked**. If a mystery ever remains, ONE customer tap hands us the whole
   shape — nothing to ssh into.
4. **JSON-inside-a-string** payloads (a known Truecaller quirk) are now parsed too.
5. **Doctor honesty** — the after-payment refetch writes its own `lastRefetchError` line;
   the consent attempt's evidence is no longer overwritten (v149 erased the proof the
   refetch was supposed to explain).

## Proof it's live

```
curl -s https://www.shivaa.in/api/auth/truecaller/config
```
Expect JSON including `"enabled":true` and (v150 only) `lastEp`/`lastRefetchError` keys.
Then `curl -sI https://www.shivaa.in/cms/js/app.js | grep -i etag` is fine, but the real check:
fetch `https://www.shivaa.in/api/health` and confirm `"release":150`.
Then one real Buy Now tap on Android: Truecaller sheet → **the phone arrives prefilled and the
Cashfree button lights up**. If anything still fails, send me the config JSON — the masked
snippet + `lastEp` tell me the fix immediately.

## Rollback

Extract `shivaa-update-v149.zip` (md5 `7b4b08912fe874ea6b153b8323b9361d`) over the same four
paths — that is the live-known-good one-tap release.
