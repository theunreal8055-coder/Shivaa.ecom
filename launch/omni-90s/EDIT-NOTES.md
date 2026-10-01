# Shivaa Inc. — 90 second Hindi explainer (Omni 1.1 Flash renders → final cut)

## Deliverables (`launch/out/`)

| File | Format | Length | Use |
|---|---|---|---|
| `Shivaa-Explainer-90s-Hindi.mp4` | 1920×1080, 24 fps, AAC 192k | **exactly 90.00 s** | YouTube, website hero, WhatsApp Business, showroom screen |
| `Shivaa-Explainer-90s-Hindi-9x16.mp4` | 1080×1920 | **exactly 90.00 s** | Instagram Reel, YouTube Shorts, WhatsApp Status |
| `Shivaa-Explainer-90s-poster-16x9.jpg` | 1920×1080 | — | YouTube thumbnail / og:image |
| `Shivaa-Explainer-90s-poster-9x16.jpg` | 1080×1920 | — | Reel cover |

Audio is loudness-normalised to **−14 LUFS / −1.5 dBTP** (YouTube + Instagram target),
with a 1 s fade at the tail.

## Chapter order (Omni filenames are NOT in order — mapped by frame content)

| # | Source clip (repo root) | On-screen chapter |
|---|---|---|
| 1 | `Woman_presenting_gold_explainer_…` | GOLD, MADE SIMPLE (jeweller + customer split) |
| 2 | `Host_presenting_jewellery_catalo…` | FOR JEWELLERS · ONE CATALOGUE · 2,00,000+ DESIGNS |
| 3 | `Woman_presenting_custom_jewelry_…` | CUSTOM ORDERS, HANDLED (sketch → CAD → cast → polish → delivered) |
| 4 | `Woman_presenting_jewellery_stock…` | WE BUY YOUR DEAD STOCK → FRESH STOCK |
| 5 | `Woman_presenting_bullion_investm…` | BULLION · INVESTMENT · LEDGER |
| 6 | `Host_presenting_customer_pricing…` | FOR CUSTOMERS · OPEN PRICING |
| 7 | `Woman_presenting_gold_buyback_ex…` | 22K HALLMARK · 100% BUYBACK |
| 8 | `Woman_presenting_animated_explai…` | SAVE · DESIGN · DELIVERED |
| 9 | `Animated_video_outro_with_logo…` | Logo outro · shivaa.in |

Each source clip is 10.01 s / 1280×720. Joined with 0.16 s dissolves
(9 × 10.01 − 8 × 0.16 = 88.81 s), the last outro frame is held and the audio
padded so the master lands on exactly 90.00 s.

## Chapter 6 fix — the fake prices are covered

Omni burned invented rupee figures into the bill cards
(METAL ₹73,000 / MAKING ₹1,94,900 / GST ₹33,500 — making charges larger than
the metal value, i.e. not publishable, and legally risky as an advertised price).
The cards also drift across the frame, so a blur box was not reliable.

`fix/make_pricing_panel.py` renders a clean **METAL / MAKING / GST** panel with
proportional gold bars and **no numbers**, composited over the card stack from
t = 2.6 s to the end of the chapter. The message ("full break-up on your bill")
survives; the invented amounts are gone.

If you would rather have a native render, re-generate chapter 6 in Omni with:
*"price break-up card shows only labels METAL, MAKING, GST with bar lengths —
absolutely no currency symbols, no numbers, no percentages anywhere in frame."*

## Vertical version

All nine sources are 16:9, so the Reel is **not** a crop (cropping would cut off
either the motion-graphic panel on the left or the presenter on the right).
Instead the 16:9 frame sits in a designed brand frame — logo + headline above,
proof points and `shivaa.in` below, dark blurred backdrop
(`fix/make_vertical_frame.py`). Nothing on screen is ever clipped.

For a true full-bleed vertical, re-run the nine Reel prompts from
`shivaa-90s-REEL-9x16.zip` in Omni at 9:16 and re-run this script against those.

## Rebuild

```bash
bash launch/omni-90s/assemble.sh      # needs the 9 clips at the repo root
```

The script copies the nine chapters into `launch/omni-90s/raw/` (git-ignored),
applies the chapter-6 fix, joins pairwise (memory-safe on a 2-core box),
upscales to 1080p, normalises audio, then builds the vertical cut and posters.
