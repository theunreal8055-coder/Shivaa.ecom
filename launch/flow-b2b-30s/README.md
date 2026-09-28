# SHIVAA — B2B partner-invite reel · 30 s · Google Flow (Veo 3.1)

3 prompts x 10 s + a 3 s logo outro. High-energy, motion-graphics led, Hindi female VO,
one locked host, one locked visual world. Aimed at jewellers: **verify GST → dashboard opens.**

## Copy-paste prompts (one file each)

| # | Beat | File |
|---|---|---|
| 1 | 0-10 s · hook + 2,00,000+ designs grid wall | `prompts/shot1-hook-catalogue.txt` |
| 2 | 10-20 s · bullion · custom order · wastage · dead stock · RTGS/cash | `prompts/shot2-desk-services.txt` |
| 3 | 20-30 s · GST verify → tick → dashboard unlock → CTA | `prompts/shot3-gst-cta.txt` |
| + | 3 s logo plate | `prompts/outro-logo-plate.txt` |

Each file already contains, stacked in the right order: **PREFIX → CHARACTER LOCK "AARYA" →
PLATFORM LOCK → the shot body → NEGATIVE PROMPT → 9:16 framing line.** Nothing to assemble by hand.

**Flow:** Ingredients to Video · Veo 3.1 Quality · 9:16 · 1080p · 3 refs (host face, a catalogue
screenshot, a dark-gold studio still). Shot 1 → best take → its **last frame** becomes the first
frame of shot 2 → and so on. Each: generate 8 s, press **Extend** once, trim to 10 s.

## Voice-over (already recorded — `vo/`)

| Line | Hindi | Over |
|---|---|---|
| 1 | जौहरी साहब, अब डिज़ाइन ढूँढना बंद। दो लाख से ज़्यादा डिज़ाइन — एक ही स्क्रीन पर, एक ही जगह। | shot 1 |
| 2 | बुलियन खरीदिए, कस्टम डिज़ाइन ऑर्डर कीजिए, वेस्टेज पर लीजिए। आर टी जी एस हो या कैश, डेड स्टॉक हो या नया — हम तैयार हैं। | shot 2 |
| 3 | बस अपना जी एस टी नंबर वेरिफाई कीजिए, और आपका डैशबोर्ड खुल जाएगा। शिवा। **You name it, we have it.** | shot 3 |

## On-screen supers (burned in by the assembler — Veo cannot spell)

1. **2,00,000+ DESIGNS** · ONE SCREEN · ONE PLATFORM
2. **BULLION · CUSTOM · WASTAGE** · DEAD STOCK OR NEW · RTGS OR CASH
3. **VERIFY YOUR GST** · DASHBOARD OPENS · shivaa.in
4. **YOU NAME IT, WE HAVE IT.** · SHIVAA · shivaa.in  *(the English pay-off line, last)*

## Assemble after rendering

```bash
mkdir -p launch/flow-b2b-30s/raw    # shot1.mp4 shot2.mp4 shot3.mp4 outro.mp4
bash launch/flow-b2b-30s/assemble.sh                # 9:16 reel
ASPECT=16x9 bash launch/flow-b2b-30s/assemble.sh    # wide version
```
Trims to exactly 30.00 s, 0.2 s dissolves, **logo watermark bottom-right on every frame**,
supers burned in, VO mixed with side-chain ducking, dark-plate logo outro, −14 LUFS.
