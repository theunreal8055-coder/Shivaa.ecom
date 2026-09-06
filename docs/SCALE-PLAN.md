# Scale plan — answering "how much space?" and "is Flow free?" (6 Sep 2026)

## 1. Your Hostinger space — the real limit is NOT disk

From the hPanel screenshot (Business Web Hosting):

| resource | used | total | free |
|---|---|---|---|
| Disk | 0.59 GB | 200 GB | **199.4 GB** |
| **Inodes (file count)** | 4.57 K | **600 K** | **595,430** |
| Websites | 4 | 100 | 96 |
| CPU / Memory | 1 % / 17 MB | — | plenty |

**The binding constraint is inodes, not gigabytes.** Every image is one inode.

| | designs supported |
|---|---|
| Disk @150 KB/img | ~348,000 |
| **Inodes @4 img/design** | **~148,000 ← the real ceiling** |
| Leaving room for code/DB/backups | **~100,000 safe** |

**400,000 designs = 1.6 M image files = 2.7× over the inode limit.** It cannot be
done on this plan by storing images as files on Hostinger, at any file size.

### Compression still matters
Measured on our real catalogue plate (1200 px, 171 KB):

| size | KB/img | 1.6 M images |
|---|---|---|
| 1000 px q82 | 74 KB | 113 GB |
| **800 px q80** | **51 KB** | **77 GB** |
| 700 px q78 | 41 KB | 62 GB |

800 px q80 is the sweet spot for a product tile — but it fixes *disk*, not *inodes*.

### Verdict
* **Up to ~100 k designs:** current Hostinger plan is fine (with 800 px images).
* **Beyond that:** images must move to **object storage + CDN** — Cloudflare R2,
  Bunny.net or S3. R2 at ~77 GB costs roughly **$1.20/month** and has no inode
  limit. Hostinger then serves only HTML/PHP/DB. This is the standard pattern and
  it is cheap.

## 2. Is Google Flow really free / unlimited?

**Your screenshot is genuine — "0 credits" is real.** But three catches decide it:

1. **It is not unlimited.** Users report rate limiting after roughly 100 images
   in 24 h, and Google publishes no image count. "0 credits" means *not billed
   against your plan credits*, not *no ceiling*.
2. **Flow is tied to a paid Google AI plan.** It is included with your
   subscription, not a separate free tier.
3. **It is a web UI with no API.** This is the killer: I cannot drive it from a
   script. Every image needs a human clicking.

### The arithmetic that settles it
| route | throughput | time / cost for 1.6 M images |
|---|---|---|
| **Flow by hand** | ~100–200 img/day | **22–44 YEARS of clicking** |
| Gemini API `gemini-3-pro-image` standard | scripted | **$214,400** |
| Gemini API Batch/Flex | scripted | **$107,200** |
| Nano Banana 2 (cheaper model) | scripted | **~$62,400** |

**So: Flow is free but unautomatable; the API is automatable but costs a fortune
at 400 k.** There is no route where 400,000 designs × 4 AI images is both free
and fast. That is a fact about the market, not a limitation of this project.

## 3. The recommended plan

**Stop treating 400 k as one batch. Phase it, and change what "4 photos" means.**

### Phase 1 — now, free (≤ 200 designs)
Use **Flow by hand** for the highest-value designs. ~100 images/day = 25
designs/day. You generate; I brand, normalise, write copy and upload. This proves
the catalogue and costs nothing.

### Phase 2 — the multiplier that makes 400 k affordable
**Do not AI-generate all four images.** For a real supplier catalogue you already
own the product photo. Per design:

| image | source | cost |
|---|---|---|
| 1. catalogue plate | **your supplier photo, auto-processed** (`normalize_plate.py`: cut out, centre, white bg, shadow) | **₹0, ~0.2 s** |
| 2. angle | supplier's 2nd photo, or AI | ₹0 if you have it |
| 3. macro | **auto-crop of photo 1** | **₹0** |
| 4. model shot | AI — reusable across similar designs | small |

This is how real jewellery e-commerce works, and it drops AI cost by ~75–100 %.
`normalize_plate.py` already does the hard part and runs at thousands/hour.

### Phase 3 — infrastructure (blocking, and I can start today)
1. **MySQL migration** — `cms/data/db.json` is a single file PHP loads into
   memory *per request*. It will die around **5,000 products**, long before
   100 k. Hostinger already gives you MySQL (Databases tab in your screenshot).
   **This is the #1 blocker and needs no API key or network.**
2. **Paginated APIs + search index** — `/api/products?page=&limit=` instead of
   returning everything.
3. **Object storage** for images once past ~100 k designs.

## 4. Answer in one line

Your space is fine for ~100 k designs (inodes, not GB, are the limit); Flow is
genuinely free but has no API so it can never do 1.6 M images; the real unlock is
**using your own supplier photos for 3 of the 4 images** and **moving off
db.json to MySQL** — which I can start right now.
