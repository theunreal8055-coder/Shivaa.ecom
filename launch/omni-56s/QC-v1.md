# QC — 56s trailer, cut v1 (25 Sep 2026)

**Master:** `launch/out/Shivaa-Jewels-56s-FEATURES-Hindi.mp4` — 56.0s · 1280×720 · 24fps · AAC 48 kHz
Bhi bana: `-9x16.mp4` (Reels/Shorts/Status) aur `-1x1.mp4` (feed).

## Clip order (jaise joda gaya)

| # | Time | Omni file | Scene |
|---|---|---|---|
| 01 | 00:00–00:08 | Woman_presenting_jewelry_store_t… | लाइव भाव |
| 02 | 00:08–00:16 | Woman_presenting_jewelry_in_trailer | हॉलमार्क 22K · HUID · खुला हिसाब |
| 03 | 00:16–00:24 | Woman_walking_past_design_wall | रेट लॉक · लेटेस्ट डिज़ाइन |
| 04 | 00:24–00:32 | Woman_speaking_about_gold_saving… | स्वर्ण निधि · बायबैक |
| 05 | 00:32–00:40 | Woman_presenting_jewellery_in_tr… | बुलियन · B2B · डेड स्टॉक |
| 06 | 00:40–00:48 | Woman_presenting_bespoke_jewelry… | बेस्पोक · वीडियो कॉल · केयर |
| 07 | 00:48–00:56 | Woman_delivering_package_with_phone | सेम-डे डिलीवरी + end card |

## PASS

- Saat ke saat clips **exactly 8.00s** — koi speed-warp nahi, total **56.0s**.
- Audio saaton clips mein hai, level barabar (mean −16.7 to −20.2 dB, peak −1.5 dB, koi clipping nahi).
  Master ko −14 LUFS pe normalise kar diya gaya hai (social-ready).
- End card sahi hai: **SHIVAA JEWELS** (double A) + **shivaa.in** — spelling clean.
- Koi rupee/₹ figure ya gold-rate number nahi dikhaya gaya; koi subtitle/caption nahi.
- Wardrobe consistent: maroon saree + black blouse saaton clips mein.

## FIX karne layak (ghatte hue kram mein)

1. **Devanagari headline typos (clips 02, 03, 06)** — Omni ne text galat likh diya:
   - 02: बड़ी line "हॉलमार्क - येदभवर" (bakwaas) — chhoti line sahi hai.
   - 03: "रेट लोक · लेटेस्ट देज़ाइन" → hona chahiye "रेट लॉक · लेटेस्ट डिज़ाइन".
   - 06: headline **do baar** overlap hokar chhapa hai (ghost line), aur "लाइफटाइम कैवर/कयर".
   Clip 01, 05, 07 ke cards theek hain.
2. **Chehra clip-dar-clip badal raha hai** — 01/02/03 ek jaisi, **04 kaafi badi umar ki**, 06 alag
   ladki. Trailer mein dikh jata hai.
3. **Clip 01 ka ticker wall padha ja sakta hai** (stock-market jaise numbers). Gold rate nahi hai,
   phir bhi behtar hai blur ho.
4. **Continuity chain nahi hai** — har clip alag se bana hai, isliye cut pe jagah badal jaati hai.
   Trailer ke liye chalta hai, lekin "one continuous take" wala feel abhi nahi hai.

## Dobara banate waqt prompt mein ye 3 line add karo

```
TEXT RENDER LOCK: Render the on-screen headline EXACTLY, letter for letter, correct Devanagari
spelling, ONE single instance only — no duplicate line, no ghost second copy, no invented words.
If accurate Devanagari cannot be rendered, render NO text at all (we will add the card in edit).

FACE LOCK: Use the attached reference image as the woman's face and build. Same age (27), same
face shape, same hair. Do not age her, do not change her to another actress.

NO READABLE NUMBERS: every rate ticker / scale display stays out of focus and unreadable.
```

Aur har re-generate mein **`launch/omni-56s/reference-presenter.jpg`** (face lock) plus
**`launch/omni-56s/lastframes/NN-last.jpg`** (pichhle clip ka aakhri frame, chaining ke liye)
attach karo.

## Agar text Omni se theek na ho (safe rasta)

Clips ko **bilkul bina on-screen text** ke generate karo, aur headline cards baad mein edit mein
daalo (CapCut / Premiere / Canva) — wahan font hamare control mein rahega aur spelling kabhi
nahi bigdegi. Cards ka exact text `launch/OMNI-56s-FEATURES-TRAILER.md` ki table mein hai.
