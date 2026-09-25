# Ab video kaise banani hai — 56s trailer, step by step

Sab material tayyar hai. Ab sirf Omni pe render karna aur jodna baaki hai.

---

## STEP 0 — Omni settings (ek baar set karo, saaton clips ke liye same)

| Setting | Value |
|---|---|
| Model | Omni 1.1 Flash (video + audio) |
| Duration | **8 seconds** |
| Aspect | **16:9** |
| Resolution | 1080p |
| Audio | **ON** — Omni hi awaaz + music + sound banayega |
| Seed | Agar option hai to **ek hi seed** saaton clips mein (face lock behtar hota hai) |

---

## STEP 1 — Clip 1 banao

1. `clip-01.txt` **poora** copy karke Omni ke prompt box mein paste karo (kuch kaato mat — character lock aur film lock zaroori hai).
2. Agar Omni **reference image** leta hai → `reference-presenter.jpg` attach karo (isse chehra + maroon saree lock hoti hai).
3. Generate.

### Har clip pe ye 6 cheezein check karo (30 second ka QC)
- [ ] Length **8 second** hai (7.6 ya 8.4 nahi)
- [ ] Wahi aurat, wahi maroon saree, wahi jhumke
- [ ] Hindi line **bilkul wahi** boli, honth match kar rahe hain
- [ ] Screen pe sirf **ek headline card** — koi subtitle/caption nahi
- [ ] Koi **padha jaane wala rate/rupee number nahi** (ticker blur rahe)
- [ ] Music awaaz ke **neeche** hai, koi gaana/lyrics nahi

Koi bhi point fail → **wahi prompt dobara generate karo** (2–4 try normal hai).
Story/line mat badlo, aur video ko speed-up/slow karke 8s mat banao.

---

## STEP 2 — Chain: clip N ka aakhri frame → clip N+1 ka pehla frame

1. Approved clip ka **last frame** nikalo (Omni ka "extend / use last frame" option, ya frame export).
2. Wo image clip N+1 mein **first frame / reference** ki tarah do.
3. Phir `clip-02.txt` paste karo. Aise hi 03 → 04 → 05 → 06 → 07.

> Last frame nikalna na aaye to clip mujhe yahin bhej do — main us clip ka last-frame PNG
> nikaal kar wapas de dunga, aap use agle clip mein laga dena.

Har prompt ke **section 7 (CONTINUITY)** mein pehle se likha hai ki pichhla frame kya tha —
Omni ko wahi continue karna hai.

---

## STEP 3 — Files ka naam

Downloads ko exactly aise naam do aur `launch/omni-56s/raw/` mein rakho:

```
raw/01.mp4  raw/02.mp4  raw/03.mp4  raw/04.mp4
raw/05.mp4  raw/06.mp4  raw/07.mp4
```

---

## STEP 4 — Jodna (56.00s master)

**Aapke computer pe (ffmpeg install ho to):**
```bash
bash launch/omni-56s/concat.sh
# -> launch/out/Shivaa-Jewels-56s-FEATURES-Hindi.mp4
```

**Ya**: saaton clips yahin chat mein bhej do — main jod dunga, duration exactly 56.00s
verify karunga, aur master + 9:16 (Reels/Shorts) + 1:1 version bhi bana dunga.

Crossfade **mat** lagana — film ek continuous take ki tarah likhi gayi hai, hard cut hi sahi hai.

---

## STEP 5 — Publish se pehle aakhri check

- [ ] Total **56.00 second**
- [ ] Saaton clips mein ek hi chehra + ek hi awaaz
- [ ] Logo spelling **SHIVAA JEWELS** (double A) aur `shivaa.in` — galat ho to sirf clip 07 dobara
- [ ] Koi jhootha daawa nahi: buyback "**गोल्ड वैल्यू पर 100%**", "BIS verified" badge kahin nahi
- [ ] Audio level: awaaz saaf, music -12 dB ke aas-paas neeche

---

## Agar Omni ki Hindi awaaz theek na aaye (plan B)

1. Saaton clips **bina bol** (sirf video + music) generate karo — prompt ke section 5 ko
   "no speech, music and scene sound only" se badal do.
2. `VO-HINDI.txt` ki 7 lines se alag se female Hindi voice-over banwa lo.
3. Mujhe clips + VO bhej do — main sync karke 56s master bana dunga.

Plan B mein lip-sync nahi dikhega, isliye us case mein clips ko presenter ke **close-up kam**
aur product/hand shots zyada rakhna behtar rahega.
