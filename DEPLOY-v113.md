# SHIVAA v113 — deploy note

Upload the contents of this zip into your `public_html` web root (the same folder that
currently holds `index.html` and `api.php`). Overwrite when asked.

## What changed
| Path | Change |
|---|---|
| `api.php` | Retail Jaipur rates now anchor to the same MCX future as the B2B bullion desk (they can never diverge / read below B2B). `/api/rates` now also returns an `rtgs` block. |
| `js/app.js` | Carousel pointer/scroll rebuild; quick-view modal (cold-cache fetch + slide-down dismiss); rate-strip RTGS cells; design-selection persistence; zero-discomfort KYC auto-verify. |
| `js/auth.js` | Login auto-sends the OTP on the 10th digit. |
| `css/v113.css` | New "2030" layer + calculator white-line fix. |
| `index.html` | Loads `v113.css`; bumps cache versions. |
| `images/banners/*.jpg` | Four new campaign posters (same filenames). |

## After upload
1. Hard-refresh the site (Ctrl/Cmd + Shift + R). The `?v=113` cache busters do the rest.
2. Server-side: `api.php` takes effect on the next request — no restart needed.
