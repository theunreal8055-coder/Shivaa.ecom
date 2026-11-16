# DEPLOY — Shivaa v249 "Steady"

**Zip:** `shivaa-update-v249.zip` — 767 files · 45,302,852 B
**sha256:** `b165432761e840e7b9d4e76dfcb56e0d2a76b983c9923ef67905efdb0cb6a365`
**Isme kya hai:** v237 se v248 tak sab kuch + naya v249. **Ek hi upload se poora shop update.**
**Branch:** `arena/95be65a4-shivaa-ecom`

---

## 1 · Do complaint, do alag karan

Aapne likha: *"Screen blinks and still slow loading."*

**Blink** aur **slow loading** ka koi rishta nahi tha. Dono ka ilaaj **cheez hatana** tha, tez karna nahi.

### A · Screen blink kyun hoti thi

**1. Content `opacity: 0` se fade-in hota tha.** Route change par naya page **invisible** shuru hota tha
(0 % opacity) aur 240 ms mein fade hota tha. `.rv` blocks observer ka intezaar karte the — jab tak observer na
bole, wo **khaali** the. Photos bhi 0 se aati thi. Har ek = **khaali frame** = blink.
→ Ab entrance motion **6 px travel** karti hai, opacity kabhi 0 nahi hoti. Motion hai, gayab hona nahi.

**2. Page do baar banta tha (sabse bada blink).** Splash 260 ms par hat jata tha, phir data aane par
`calmBoot()` poora `#view` **dobara** likh deta tha — saari photos phir se download, decode, layout, scroll
reset. Aapko wahi "blink" dikhta tha, aur data bhi **do baar** download hota tha.
→ Ab jab pehle paint mein asli products hain, late data **chup-chaap adopt** hota hai (state + price slots patch),
page ko chhua hi nahi jata. Background catalogue repair bhi ab repaint nahi karta.

**3. Splash har reload par.** Full-screen maroon curtain har baar paint hota tha, phir fade — sabse literal blink.
→ Jo device pehle se catalogue rakhta hai (har reload), uske liye curtain **paint hi nahi hota**
(`html.shv-warm`, first frame se pehle set). Pehli baar wale visit par brand splash bana rahega.

**4. Chhoti si cheez:** warm paint cap **700 ms → 250 ms**. Jo data phone mein hai, uska intezaar kyun.

### B · Slow loading kyun thi

Phone **12.8 lakh bytes** JavaScript download aur parse kar raha tha — bade comments ke saath (jo developer ke
liye hain, customer ke liye nahi).

| file | pehle | ab |
|---|---|---|
| app.js | 828,622 B | **582,378 B** |
| rel.js | 420,842 B | **204,889 B** |
| **total** | **1,282,512 B** | **787,267 B (−39 %)** |
| gzip ke baad | 383 KB | **243 KB (−41 %)** |

Comments source files mein poore hain (zip mein bhi) — sirf jo phone download karta hai wo chhota hai.
Har minified file ke upar uska **fingerprint** likha hai; agar source badla aur min dobara nahi bana, to
handover check **red** ho jata hai — purana code naye stamp ke neeche ship nahi ho sakta.

## 2 · 3 minute ka check (order mein)

1. **Site reload** kijiye (jo device pehle khol chuka hai) — maroon splash **nahi** aana chahiye, seedha page.
2. Kisi category par tap — page badle, content **turant** dikhe, fade-in ke liye khaali nahi rahe.
3. 8–10 second rukiye — page **khud se dobara na bane** (photos phir se load na hon).
4. Neeche scroll — kuch gayab hokar wapas na aaye.
5. Naya phone/incognito (pehli baar) — splash aayega, phir skeleton, phir page. Ek hi baar.
6. PC par bhi 2 minute.

## 3 · Agar phir bhi lagे

Console mein do line:
```
Shivaa.v249.report()
Shivaa.v248.report()
```
Pehli line: page kitni baar **khud** redraw hua (+ kab). Doosri: tap kitna slow tha (+ koi lamba task).
Screenshot ya copy karke bhej dijiye — main andaza nahi lagaunga.

**Ek cheez aap check kar sakte hain (host):** browser devtools → Network → `app.min.js` → Headers. Agar
`Content-Encoding: gzip` nahi hai, to aapka server files compress nahi kar raha — wahan bhi 3× farq padta hai.
`.htaccess` main ship nahi karta, isliye yeh setting aapke host par hai.

## 4 · Rollback

Purana zip (v247 ya v248) sambhal ke rakhiye. Purana zip upload = purani site. Naya code purani files delete
nahi karta.

## 5 · Honest baat

Main **prove** kar sakta hoon: koi content opacity 0 se start nahi hota, warm device par `#view` **ek hi baar**
banta hai (maine device-catalogue seed karke, API ko jaan-boojh kar 1.2 s slow karke naapa), curtain warm
boot par paint hi nahi hota, aur JS 39 % chhota hai. Main **nahi** keh sakta "ab bilkul smooth hai" — wo
aapke phone par hi pata chalega. Isi liye dono report() diye hain.
