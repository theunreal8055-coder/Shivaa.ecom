# Shivaa update v206: The Black Card turns — working 3D flip + live motion

File: `shivaa-update-v206.zip`. Unzip into the site root, as for earlier updates.
Sha256: `985c45adbb31ce235d070f44ed75701b1f3e0d669505cdd5f1d0714e4eb988cd`.

## 1. Why "Tap the card to see the reverse" never worked
Three causes, all fixed here:

1. **The hover filter flattened the 3D scene (the main bug).** v184 styled
   `.bc-card:hover { filter: brightness(1.04) }`. A non-none `filter` on a
   `transform-style: preserve-3d` element forces `transform-style: flat` — so the
   moment you pointed at the card to click or tap it, the flip collapsed and a
   mirrored *front* appeared instead of the reverse. The hover light now comes
   from the wrap (the existing pointer light); the card itself never carries a
   filter.
2. **The card was a `<button>`.** WebKit flattens 3D transforms inside form
   controls, so iOS/Safari could never show the flip. The card is now a
   `div[role="button"][tabindex="0"]` with the same classes, so every existing
   style (foil, seals, print) still applies.
3. **The hint was a span.** "Tap the card to see the reverse" is now a real
   `<button>` that turns the card over too — with a gold hover on the dark hero
   where it used to sit dim.

## 2. The animation (v206.css, motion graphics)
- One confident 850 ms turn (`cubic-bezier(.32,.72,.19,1)`), with a lift and
  settle: the card rises 12 px and scales 1.035 mid-turn (`translate`/`scale`
  independent properties, so the v186 pointer tilt keeps owning `transform`).
- The floor reflection under the card breathes with the lift.
- One glint sweeps the face that lands (a `.bc-flip-glint` layer inside the card).
- The ↻ icon in the hint spins 180° per turn and the hint text rolls over.
- Re-entry is locked mid-flight (no double-toggle stutter).
- Calm mode (`prefers-reduced-motion`): same states, no flight. Print: front
  face up, no motion furniture.
- Gold gradients (v200), foil/sweep layers (v203) and seal positions (v186) are
  untouched.

## 3. Behaviour and accessibility
- Click anywhere on the card, press the hint button, or focus the card and press
  Enter/Space (Space is prevented from scrolling the page).
- `aria-pressed`, `aria-label` and the two faces' `aria-hidden` still track the
  state; the hint is `aria-live="polite"`.
- The flip handlers are delegated and live inside the app IIFE (v204 lesson).

## Verification
- jsdom harness (`qa/browser/t-v206-flip.mjs`, new), run against the preview
  shim on the real app: Black Card page and home hero — click, hint button,
  Space, Enter, mid-flight lock, glint pass, aria state. **All pass, no page
  errors.**
- `node --check` on `app.js` and `sw.js`.
- Not run here: the PHP backend, the full smoke suite, and a real phone/browser
  animation pass (no browser binaries in this sandbox). **Owner: please eyeball
  the flip on a phone and on desktop before approving deploy.**

## Version stamp (all 206)
`index.html` (`__SHIVAA_REL=206`, every `?v=206`), `sw.js` (`REL=206`,
`shivaa-shell-v206`, pre-caches `/css/v206.css?v=206`), `app.js` (`APP_REL=206`),
`api.php` (`'rel' => 206`).

## Deploy
Owner approval required. Nothing has been deployed. After upload, hard-refresh
and open `#/black-card` (and the home hero): tap the card and the "Tap the card
to see the reverse" button — the card should turn over in 3D and land with a
glint.
