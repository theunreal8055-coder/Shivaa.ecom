# Shivaa Jewels · Omni 1.1 Flash — 56-SECOND FEATURE TRAILER
## 7 clips × 8.00s = **56.00s** · Hindi · ek hi khoobsurat female model sab bolti hai

Yeh naya pack hai. **Purani script (20-clip presenter / 8-clip mass film) mat mila dena.**
Yeh trailer **Shivaa Jewels ke saare features** batata hai — live bhaav se lekar same-day
insured delivery tak — ek hi aurat ki awaaz mein, headline cards ke saath, ek hi
continuous film jaisa.

**Copy-paste ready prompts:** `launch/omni-56s/clip-01.txt` … `clip-07.txt`
(har file standalone hai — character lock + film lock + shot + dialogue + sound + continuity).
**Source of truth:** `launch/omni-56s/script.json` → regenerate with
`python3 launch/omni-56s/build_prompts.py`.
**Jodne ke liye:** `bash launch/omni-56s/concat.sh` (renders ko `launch/omni-56s/raw/01.mp4 … 07.mp4` rakho).

---

## Omni settings (har clip)

| Field | Value |
|---|---|
| Model | Gemini Omni 1.1 Flash |
| Duration | **exactly 8.00 seconds** (speed-warp mana) |
| Aspect / Res / FPS | 16:9 · 1920×1080 · 24fps |
| Audio | Omni khud banaye: **uski Hindi awaaz + score + scene sound** |
| Chaining | Clip N ka **last frame** = Clip N+1 ka **first frame** |
| Text on screen | Sirf **1 headline card** per clip. Subtitles/captions **band** |

---

## 56 seconds ka naksha

| # | Time | Feature (headline) | Hindi line | ~speech |
|---|---|---|---|---|
| 1 | 00:00–00:08 | आज का लाइव भाव · LIVE GOLD RATE | आज का सोना, आज के भाव पर। शिवा ज्वेल्स — हर सेकंड लाइव रेट, स्क्रीन पर। | 5.6s |
| 2 | 00:08–00:16 | हॉलमार्क 22K · HUID · खुला हिसाब | हर पीस हॉलमार्क बाइस कैरेट। दाम का पूरा हिसाब — मेटल, मेकिंग, जीएसटी, सब साफ़। | 5.2s |
| 3 | 00:16–00:24 | रेट लॉक · लेटेस्ट डिज़ाइन | भाव ऊपर जाए तो भी आपका दाम वही — एक टैप में रेट लॉक। और हज़ारों नए डिज़ाइन। | 6.3s |
| 4 | 00:24–00:32 | स्वर्ण निधि 11+1 · बायबैक | स्वर्ण निधि — ग्यारह जमा, एक हमारा। गोल्ड वैल्यू पर सौ प्रतिशत बायबैक, डिजिटल सर्टिफिकेट के साथ। | 5.9s |
| 5 | 00:32–00:40 | बुलियन डेस्क · B2B · डेड स्टॉक | व्यापारियों के लिए — बुलियन डेस्क, बी-टू-बी पोर्टल, कारीगर, और आपका डेड स्टॉक भी हम खरीदेंगे। | 5.6s |
| 6 | 00:40–00:48 | बेस्पोक · वीडियो कॉल · लाइफटाइम केयर | अपनी डिज़ाइन बनवाइए। रिंग साइज़, वीडियो कॉल पर लाइव चेक, गिफ्ट कार्ड और लाइफटाइम केयर। | 5.6s |
| 7 | 00:48–00:56 | सेम-डे · इंश्योर्ड डिलीवरी → END CARD | पसंद आया? एक टैप — सेम डे, इंश्योर्ड डिलीवरी। शिवा ज्वेल्स। शिवा डॉट इन। | 4.8s |

Har line **6.5 second** ke andar khatam — bache hue seconds headline card aur saans ke liye.
Isliye 56s mein sab features aa jaate hain aur kuch bhi jaldbaazi mein nahi lagta.

---

## CHARACTER LOCK — har prompt ke start pe (already inside the .txt files)

```
SAME WOMAN IN ALL SEVEN CLIPS — do not change her face, hair, jewellery or clothes:
Shivaa Jewels brand presenter and model. Indian, 27, North-Indian Rajasthani features, 5'8", luminous fair-wheatish skin, oval face, high cheekbones, deep almond dark-brown eyes, thick natural brows, soft nude-rose lips, a small gold nose pin, long straight black hair with a soft centre parting tucked behind one ear, one delicate 22K chain, small gold jhumkas.
WARDROBE LOCKED: deep-maroon silk saree with a thin gold zari border, black silk blouse, one gold kada on the right wrist.
Editorially beautiful but a REAL human — visible skin texture and pores, no plastic AI face, no celebrity lookalike, no beauty-ad over-retouch, no changing age between clips.
POISE: film-trailer narrator — calm authority, a small knowing smile, she owns the house she walks through. She is inside the film, never a news anchor at a desk.
VOICE: invent ONE original female Hindi voice — warm low alto, cinematic trailer gravitas, clean Khadi Boli Hindi, unhurried but urgent. Do not imitate any real person or any uploaded voice. No English narration, no jingle, no shopping-channel pitch, no whisper-ASMR.
LIP-SYNC: her mouth must match the exact Hindi line written in this clip. No extra words, no ad-libs, no humming, no repeated lines.
```

## FILM LOCK — character lock ke baad

```
Photoreal CINEMATIC BRAND TRAILER, 16:9, EXACTLY 8.00 seconds, 24fps, 1920x1080, ARRI Alexa 35, 35mm and 50mm, shallow depth of field, anamorphic flares, fine film grain, warm 3200K tungsten with gold bounce, black marble, brass and dark walnut luxury jewellery maison, India 2026.
This is ONE CONTINUOUS 56-second film cut into 7 shots — same woman, same maison, same lighting, same colour grade, same music. Begin EXACTLY on the previous clip's last frame and keep her walking the same journey through the house.
ON-SCREEN TEXT: ONLY the single headline card described in this clip — gold type on black/negative space, Devanagari large with small English under it, in for 1.5s, dissolve out. NO subtitles, NO karaoke captions, NO lower thirds, NO watermark, NO city names, NO readable rupee figures, NO readable gold-rate digits, NO logos except SHIVAA JEWELS where specified.
GENERATE: video + her Hindi speech + instrumental score + scene sound. The score is ONE continuous cue across all 7 clips — santoor, cello, low strings and a soft dhol pulse that keeps rising; instrumental only, no lyrics, no sung words, no choir words; always UNDER her voice.
```

---

# CLIP 01 · 00:00–00:08 · THE HOUSE OPENS · LIVE RATE

**Headline card:** आज का लाइव भाव / LIVE GOLD RATE · EVERY SECOND
**SHE SAYS:** आज का सोना, आज के भाव पर। शिवा ज्वेल्स — हर सेकंड लाइव रेट, स्क्रीन पर।

COLD OPEN. Night. Tall bronze doors of a dark jewellery maison split open and gold light blows
out. She walks straight at camera out of that light in the maroon saree, a Steadicam retreating
ahead of her at chest height — the film starts on HER. Centre aisle between lit vitrines of 22K
bridal gold. She turns her head to a full-height LIVE RATE wall of warm amber tickers — digits
beautiful but **defocused and unreadable**, ticking, alive. She lifts a hand towards the moving
numbers without stopping.
**SCORE:** one santoor note in silence, then cello, then a slow dhol heartbeat.
**LAST FRAME:** her half-turned to camera at the rate wall, ticker bokeh over her right shoulder.

---

# CLIP 02 · 00:08–00:16 · HALLMARK 22K + HUID + OPEN BILL

**Headline card:** हॉलमार्क 22K · HUID · खुला हिसाब / BIS HALLMARK · HUID · TRANSPARENT BILL
**SHE SAYS:** हर पीस हॉलमार्क बाइस कैरेट। दाम का पूरा हिसाब — मेटल, मेकिंग, जीएसटी, सब साफ़।

She steps to a black glass counter, bridal haar on velvet. MACRO 1.2s: a BIS hallmark punch
stamping 22K into warm gold, dust sparks, the six-character HUID mark blooming into focus — real
punched metal, not graphics. Back to her: she turns the piece and a gold-line hologram rises and
**splits into three floating bars — metal, making, GST** — pure light, **no readable numbers**.
Eyes to camera on "सब साफ़".
**SCORE:** metallic 'ting' on the punch, cello holds, dhol continues.
**LAST FRAME:** her fingertips on the haar, breakdown bars fading, her eyes on camera.

---

# CLIP 03 · 00:16–00:24 · RATE LOCK + LATEST DESIGNS

**Headline card:** रेट लॉक · लेटेस्ट डिज़ाइन / TAP TO LOCK YOUR RATE · NEW CATALOGUE
**SHE SAYS:** भाव ऊपर जाए तो भी आपका दाम वही — एक टैप में रेट लॉक। और हज़ारों नए डिज़ाइन।

She presses one fingertip to the moving rate glass — the ticker **freezes** under her finger, a
gold ripple with a small forged padlock spreads while the rest keeps running behind (still
unreadable). A small smile. She keeps walking; the wall becomes a long dark design wall — rings,
kundan sets, bangles, mangalsutras flying past in gold frames, **no prices**. Her hand trails it.
**SCORE:** dhol doubles, santoor climbs — first real lift.
**LAST FRAME:** her mid-stride against the flowing design wall, lock glow on her fingertips.

---

# CLIP 04 · 00:24–00:32 · SWARNA NIDHI + BUYBACK + CERTIFICATE

**Headline card:** स्वर्ण निधि 11+1 · बायबैक / SAVINGS PLAN · BUYBACK · DIGITAL CERTIFICATE
**SHE SAYS:** स्वर्ण निधि — ग्यारह जमा, एक हमारा। गोल्ड वैल्यू पर सौ प्रतिशत बायबैक, डिजिटल सर्टिफिकेट के साथ।

Walnut consultation table, a mother and grown daughter seated (real, calm faces). 1s: a
brass-cornered Swarna Nidhi passbook opening, eleven gold coins in velvet and a **twelfth** placed
by her own hand. 0.8s: an old family bangle on a certified scale (display defocused), a clean coin
sliding back. 0.8s: the daughter's phone showing a gold-sealed digital certificate, text
unreadable. She stands behind them, last clause to camera.
**SCORE:** theme turns warm and major, strings widen.
**LAST FRAME:** the twelfth coin settling in velvet, her face soft-focus behind.

---

# CLIP 05 · 00:32–00:40 · B2B · BULLION · DEAD STOCK · KARIGAR

**Headline card:** बुलियन डेस्क · B2B · डेड स्टॉक / BULLION · PARTNER PORTAL · WE BUY YOUR DEAD STOCK
**SHE SAYS:** व्यापारियों के लिए — बुलियन डेस्क, बी-टू-बी पोर्टल, कारीगर, और आपका डेड स्टॉक भी हम खरीदेंगे।

Brass door into the trade side. **A)** Bullion desk — stacked 24K biscuits under a spot, a partner
jeweller signing, an amber board of defocused rates. **B)** Partner-portal screen, a grams ledger
drawing itself in gold lines, no readable figures. **C)** Karigar bench — a 70-year-old master,
white beard, gold dust on his fingers, torch on kundan; she rests a respectful hand on his
shoulder as she passes. **D)** A visiting jeweller sets down a dusty tray of unsold stock; she
receives it with respect, not pity, and nods once.
**SCORE:** percussion turns industrial and confident, brass enters.
**LAST FRAME:** her handshake over the now-empty clean tray, torch glow behind.

---

# CLIP 06 · 00:40–00:48 · BESPOKE · SIZE · VIDEO CALL · CARE

**Headline card:** बेस्पोक · वीडियो कॉल · लाइफटाइम केयर / CUSTOM DESIGN · RING SIZER · VIDEO CONSULT · LIFETIME CARE
**SHE SAYS:** अपनी डिज़ाइन बनवाइए। रिंग साइज़, वीडियो कॉल पर लाइव चेक, गिफ्ट कार्ड और लाइफटाइम केयर।

Bespoke studio, soft lamp, a pencil sketch of a peacock band on glass. The sketch **lifts off the
paper** as a slow gold wireframe and resolves into the real finished ring in a velvet tray
(in-camera magic, not cartoon VFX). 0.7s: brass ring-sizer fan opening across a finger. 1s: a
tablet on a stand on a live video call, the customer small and warm, she tilts a necklace to the
lens before dispatch. 0.7s: a slim gold gift card; a cloth polishing an old Shivaa ring back to new.
**SCORE:** intimate — solo santoor and one cello line, space around her voice.
**LAST FRAME:** the finished bespoke ring in velvet, her face behind it in soft focus.

---

# CLIP 07 · 00:48–00:56 · SAME-DAY INSURED DELIVERY + END CARD

**Headline card:** सेम-डे · इंश्योर्ड डिलीवरी / SAME-DAY INSURED DELIVERY
**SHE SAYS (inside the first 6.5s):** पसंद आया? एक टैप — सेम डे, इंश्योर्ड डिलीवरी। शिवा ज्वेल्स। शिवा डॉट इन।

One tap on a dark phone — no readable app UI, only a gold pulse. LIVE: a maroon Shivaa box sealed
with a gold ribbon and an insurance hologram, a night car, and she personally places it in a
customer's hands at a lit doorway. She walks back through the bronze doors, turns once to camera
under the brass lettering, camera cranes up and off her. **Cut to black at 6.5s.** Then, formed in
molten gold on black, in camera:

```
SHIVAA JEWELS
shivaa.in
```

Hold clean to exactly 8.00s. Last 1.5s: no speech, end card + music only.
**SCORE:** theme resolves at the doorway, logo hit, decay into near-silence.
**LAST FRAME:** SHIVAA JEWELS / shivaa.in in gold on black.

---

## Omni rules (inhe tod diya to film toot jaayegi)

1. Har clip **8.00s** exact. Chhota/bada aaye to **dubara generate** karo — speed-warp mat karo.
2. **01 → 07 order mein** banao. Clip N ka last frame Clip N+1 ka first frame (upar diya hai).
3. Har clip mein **sirf SHE SAYS wali Hindi**. Extra dialogue, English VO, jingle — mana.
4. **Ek hi chehra, ek hi saree, ek hi awaaz** saaton clips mein. Face badle to character lock
   dobara paste karke us clip ko akela re-generate karo.
5. **Koi padha jaane wala rate / rupee number nahi.** Tickers hamesha defocused.
6. Screen par sirf **ek headline card** per clip. Subtitles/captions band.
7. Logo spelling lock: **S-H-I-V-A-A  J-E-W-E-L-S** (double A). "Shiva Jewels" nikle to sirf
   clip 07 dubara.
8. Concat 01–07 = **56.00s**. Upar se koi purani owner-voice mp3 **mat** chadhana — awaaz Omni
   ki hi rahegi, warna lip-sync toot jaayega.

## Claim honesty note (script isi liye aise likha gaya hai)

- Buyback line **"गोल्ड वैल्यू पर सौ प्रतिशत"** hai — 100% *gold value*, making charges nahi.
  Site ki published policy yahi hai; ise "100% paisa wapas" mat banao.
- HUID sirf **hallmark + HUID guide/record** ke taur pe dikhaya gaya hai — on-screen "BIS verified"
  badge mat dalwana, automatic BIS verification abhi connected nahi hai.
- Rate lock ka **duration screen par nahi** bola/likha gaya (checkout lock aur quote validity alag
  hain) — isliye koi ginti wala daawa video mein nahi hai.
- Same-day insured delivery, Swarna Nidhi 11+1, dead-stock kharid, bullion/B2B desk, bespoke,
  video consult, ring sizer, gift card, lifetime care — sab site ke live features hain.

## Generate karne ke baad

```bash
mkdir -p launch/omni-56s/raw          # Omni se download karke 01.mp4 ... 07.mp4 naam do
bash launch/omni-56s/concat.sh        # -> launch/out/Shivaa-Jewels-56s-FEATURES-Hindi.mp4
```

Script badalna ho to `launch/omni-56s/script.json` edit karo aur
`python3 launch/omni-56s/build_prompts.py` chalao — clip-01..07.txt, VO-HINDI.txt aur timing
check dobara ban jaayenge.
