# Shivaa Jewels · Omni 1.1 Flash — 56s ONE-TAKE TRAILER **v2**
## 7 chapters × 8.00s = 56.00s · ek hi non-stop Steadicam shot · Hindi hard-sell VO

**v1 kyun toota tha:** har clip apna naya establishing shot le raha tha — nayi jagah, naya wide,
nayi light. Isliye 7 alag ad lagte the.
**v2 ka fix:** poori film **ek hi building ka ek hi chalta hua shot** hai. Camera kabhi rukta nahi,
har chapter pichhle chapter ke **exact frame** se shuru hota hai, aurat hamesha **mid-stride**
rehti hai, aur music ek hi cue hai jo kabhi reset nahi hota.

**Copy-paste prompts:** `launch/omni-56s-v2/clip-01.txt` … `clip-07.txt`
**Face reference (har clip ke saath attach karo):** `launch/omni-56s-v2/reference-presenter.jpg`

---

## Building ka naksha (ek hi raasta, camera peeche-peeche)

```
बाहर रात → कांसे के दरवाज़े → ENTRANCE HALL (लाइव रेट वॉल)
   → मेहराब → GALLERY (लाखों डिज़ाइन की दो मंज़िला दीवार)
      → ATELIER (20 कारीगर, CAD, तराज़ू)
         → BULLION VAULT (24K बार, डेड स्टॉक, इन्वेस्टमेंट)
            → RETAIL SALON (हॉलमार्क मैक्रो, खुला बिल, रेट लॉक)
               → LOUNGE (स्वर्ण निधि, बायबैक, वीडियो कॉल, बेस्पोक)
                  → वापस कांसे के दरवाज़े → रात का courtyard → डिलीवरी → LOGO PLATE
```

Har chapter is raaste ka agla hissa hai — isliye cut pe jagah nahi badalti, bas kamra aage badhta hai.

---

## 56 second · kya bolti hai

| # | Time | On-screen (English) | Hindi VO | ~speech |
|---|---|---|---|---|
| 1 | 00:00–08 | LIVE GOLD RATE | सोने की पूरी दुनिया, अब एक ही छत के नीचे। शिवा ज्वेल्स — हर सेकंड लाइव भाव। | 5.9s |
| 2 | 00:08–16 | LAKHS OF DESIGNS | दो-तीन लाख डिज़ाइन, हर स्टाइल, हर बजट — जो सोचोगे वो यहीं। सिलेक्शन की टेंशन खत्म। | 5.6s |
| 3 | 00:16–24 | ZERO WASTAGE WORRY | वेस्टेज की टेंशन नहीं, कारीगर ढूँढने की ज़रूरत नहीं। कस्टम डिज़ाइन? पूरा काम हम संभालेंगे। | 5.6s |
| 4 | 00:24–32 | WE BUY YOUR DEAD STOCK | डेड स्टॉक पड़ा है? हम खरीदेंगे। मेटल में इन्वेस्ट करना है — सही भाव, बेहतरीन रिटर्न। | 5.6s |
| 5 | 00:32–40 | 22K HALLMARK · OPEN BILL | हर पीस हॉलमार्क बाइस कैरेट। मेकिंग, जीएसटी — सब खुला। एक टैप में रेट लॉक। | 5.2s |
| 6 | 00:40–48 | SAVE · BUY BACK · BESPOKE | स्वर्ण निधि से बचत, गोल्ड वैल्यू पर सौ प्रतिशत बायबैक, और अपनी डिज़ाइन वीडियो कॉल पर लाइव। | 6.3s |
| 7 | 00:48–56 | SAME-DAY INSURED DELIVERY | चाहे दुकान हो या घर — एक टैप, सेम-डे इंश्योर्ड डिलीवरी। शिवा ज्वेल्स। | 4.4s |

Chapter 1–4 **व्यापारी** ke liye (variety, wastage, karigar, custom, dead stock, metal investment),
5–7 **retail grahak** ke liye (hallmark, khula bill, rate lock, bachat, buyback, bespoke, delivery).

---

## v2 mein jo badla (aur kyun)

| v1 ki dikkat | v2 ka fix (prompt ke andar likha hai) |
|---|---|
| Har clip alag jagah, film tooti hui lagi | Ek hi building ka **oner** — har prompt ka section 3 = pichhle clip ka exact last frame |
| Clip start pe camera ruk jata tha | "Camera already moving at 0.00s, still moving at 8.00s, she is mid-stride" |
| Devanagari headline bigad gayi thi | On-screen text ab **sirf chhota English headline** (AI Latin theek likhta hai) + "galat likh sakte ho to text mat likho" |
| Chehra badalta tha | Face lock + **reference image har clip ke saath attach** karne ka instruction |
| Scene saste lagte the | Camera/lens/light/art-direction ka poora spec — 35mm anamorphic, T2.0, haze, brass chandelier, black marble, real metal |
| Logo/end card AI ne likha (typo risk) | Chapter 7 ka aakhri 2.5s **jaan-boojh kar khaali gold-black plate** hai — logo aap/main post mein chipkayenge |

---

## Kaise generate karna hai (ye tarika continuity banata hai)

1. **Chapter 1** banao: `clip-01.txt` paste + `reference-presenter.jpg` attach. 8s, 16:9, 1080p, audio ON.
2. Approve hone ke baad us clip ka **aakhri frame** nikaalo (Omni ka "extend / use last frame", ya
   frame export). Wo image **chapter 2 ke saath attach** karo — phir `clip-02.txt` paste karo.
3. Aise hi 3 → 4 → 5 → 6 → 7. Har prompt ke **section 3** mein likha hai ki frame kaisa dikhna chahiye,
   isliye Omni ko match karne mein aasani hogi.
4. Agar koi chapter "naya scene" jaisa lage (camera ruk gaya, ya nayi jagah se shuru hua) → **sirf wahi
   chapter dobara**, aur prompt ke top pe ye line add kar do:
   `CONTINUE THE SAME SHOT — the camera never stopped, do not restart, do not re-establish.`
5. Saat clips `01.mp4 … 07.mp4` naam se mujhe bhej do — main jodunga, 56.00s verify karunga,
   **aapka logo end plate pe lagaunga**, aur 16:9 + 9:16 + 1:1 bana dunga.

> **Logo:** chat mein bhej dijiye (PNG, transparent background sabse acha). Chapter 7 ka end plate
> khaali rakha gaya hai isi liye — logo crisp aur sahi spelling ke saath baithega, AI ke likhe
> letters ka risk khatam.

---

## Do line jinpe aapki "haan" chahiye (legal safety)

Maine aapke hisaab se aggressive copy likhi hai, par ye do daawe aise hain jinpe baad mein sawaal
aa sakta hai — aap confirm kar dijiye ya safe version use kar lete hain:

1. **"दो-तीन लाख डिज़ाइन"** — agar catalogue itna hai/hoga to theek. Safe version:
   *"हर स्टाइल, हर बजट — पूरी वैरायटी एक ही जगह।"*
2. **"बेहतरीन रिटर्न"** (metal investment) — return ka vaada financial claim ban jaata hai.
   Safe version: *"मेटल इन्वेस्टमेंट भी यहीं — सही भाव, पूरी पारदर्शिता।"*

Baaki sab already safe hai: buyback line **"गोल्ड वैल्यू पर सौ प्रतिशत"** hai, "BIS verified"
kahin nahi, aur screen pe koi rate/₹ number nahi.

Badalna ho to `launch/omni-56s-v2/script.json` mein line edit karke
`python3 launch/omni-56s-v2/build_prompts.py` chala dena — saat prompts dobara ban jaayenge.
