# SHIVAA — "दो दुकानें" · split-screen comparison reel · 30 s (Google Flow / Veo 3.1)

एक ही शहर, दो जौहरी, एक ही ग्राहक — और नतीजा अलग। 3 प्रॉम्प्ट × 10 सेकंड + 3 सेकंड लोगो आउट्रो.
हर फ़ाइल में PREFIX + CHARACTER LOCKS (SURESH / MOHIT / ग्राहक) + SPLIT-SCREEN LOCK + शॉट बॉडी + NEGATIVE + 9:16 — सीधा कॉपी-पेस्ट.

## स्क्रिप्ट (हिंदी VO)
| समय | लाइन |
|---|---|
| 0:00–0:10 | "एक ही शहर। दो जौहरी। और एक ही ग्राहक की फ़रमाइश।" |
| 0:10–0:20 | "बाईं ओर कैटलॉग पलटते रहिए… ग्राहक कुर्सी छोड़ चुका। दाईं ओर स्क्रीन खुली, डिज़ाइन सामने, सौदा तय।" |
| 0:20–0:30 | "फ़र्क़ हुनर का नहीं… रफ़्तार का है। जी.एस.टी. डालिए, आप भी दाईं तरफ़ आ जाइए। शिवा। **You name it, we have it.**" |

## प्रॉम्प्ट (मुख्य सेट — असली split-screen)
| # | समय | बीट | लिंक |
|---|---|---|---|
| 1 | 0–10 s | फ़्रेम बँटता है · दोनों दुकानों में वही ग्राहक | [shot1-same-city.txt](https://github.com/theunreal8055-coder/Shivaa.ecom/raw/arena/01a0d958-shivaa-ecom/launch/flow-reel-do-dukane/prompts/split/shot1-same-city.txt) |
| 2 | 10–20 s | बाएँ कैटलॉग और खाली कुर्सी · दाएँ सौदा तय | [shot2-the-gap.txt](https://github.com/theunreal8055-coder/Shivaa.ecom/raw/arena/01a0d958-shivaa-ecom/launch/flow-reel-do-dukane/prompts/split/shot2-the-gap.txt) |
| 3 | 20–30 s | पर्दा मिलता है · सुरेश भी पार्टनर · GST टिक | [shot3-merge-cta.txt](https://github.com/theunreal8055-coder/Shivaa.ecom/raw/arena/01a0d958-shivaa-ecom/launch/flow-reel-do-dukane/prompts/split/shot3-merge-cta.txt) |
| + | 3 s | लोगो प्लेट | [outro-logo-plate.txt](https://github.com/theunreal8055-coder/Shivaa.ecom/raw/arena/01a0d958-shivaa-ecom/launch/flow-reel-do-dukane/prompts/split/outro-logo-plate.txt) |

## फ़ॉलबैक सेट (अगर Veo का split-screen डगमगाए — दोनों हिस्से अलग रेंडर करके एडिट में जोड़ें)
[H1 बायाँ हिस्सा · सुरेश](https://github.com/theunreal8055-coder/Shivaa.ecom/raw/arena/01a0d958-shivaa-ecom/launch/flow-reel-do-dukane/prompts/halves/H1-left-suresh.txt) · [H2 दायाँ हिस्सा · मोहित](https://github.com/theunreal8055-coder/Shivaa.ecom/raw/arena/01a0d958-shivaa-ecom/launch/flow-reel-do-dukane/prompts/halves/H2-right-mohit.txt) · [H3 मर्ज + CTA](https://github.com/theunreal8055-coder/Shivaa.ecom/raw/arena/01a0d958-shivaa-ecom/launch/flow-reel-do-dukane/prompts/halves/H3-merge-cta.txt)

## VO
[vo1](https://github.com/theunreal8055-coder/Shivaa.ecom/raw/arena/01a0d958-shivaa-ecom/launch/flow-reel-do-dukane/vo/vo1.mp3) · [vo2](https://github.com/theunreal8055-coder/Shivaa.ecom/raw/arena/01a0d958-shivaa-ecom/launch/flow-reel-do-dukane/vo/vo2.mp3) · [vo3](https://github.com/theunreal8055-coder/Shivaa.ecom/raw/arena/01a0d958-shivaa-ecom/launch/flow-reel-do-dukane/vo/vo3.mp3) · [पूरी 30 s टाइमिंग ट्रैक](https://github.com/theunreal8055-coder/Shivaa.ecom/raw/arena/01a0d958-shivaa-ecom/launch/flow-reel-do-dukane/vo/vo-timing-30s.mp3)  (क्यू: 0.9 s / 10.4 s / 20.3 s)

## एडिट में जलने वाले सुपर
`SAME CITY. TWO JEWELLERS.` → `WHO CLOSES THE DEAL?` → `STILL FLIPPING CATALOGUES` → `FOUND IN SECONDS` → `DEAL CLOSED` → `IT'S NOT SKILL. IT'S SPEED.` → `VERIFY YOUR GST` → **`YOU NAME IT, WE HAVE IT.`**

## असेंबल
```bash
mkdir -p launch/flow-reel-do-dukane/raw    # shot1.mp4 shot2.mp4 shot3.mp4 outro.mp4
bash launch/flow-reel-do-dukane/assemble.sh              # 9:16
ASPECT=16x9 bash launch/flow-reel-do-dukane/assemble.sh  # wide
```
ठीक 30.00 s · 0.2 s डिज़ॉल्व · bottom-right लोगो · सुपर बर्न · VO ducking · −14 LUFS.
