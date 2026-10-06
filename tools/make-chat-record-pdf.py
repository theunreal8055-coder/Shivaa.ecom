#!/usr/bin/env python3
"""Builds marketing/CHAT-RECORD-instagram-ads-session-2026-10-05.pdf — the
resume-from-here chat record for the Shivaa Jewels Instagram-ads session."""
import re
from fpdf import FPDF

DEV = "/usr/share/fonts/truetype/dejavu/"

def clean(t: str) -> str:
    t = t.replace("₹", "Rs.").replace("–", "-").replace("—", "-").replace("·", "-").replace("→", "->")
    t = re.sub(r"[↑✅🎯📋📱🎬📦🔁⚠️🙏💍📞💬💲✨📍📌😊🎉]", "", t)
    t = re.sub(r"[\U0001F300-\U0001FAFF\uFE0F\u200d]", "", t)
    return t

class PDF(FPDF):
    def multi_cell(self, *a, **k):
        k.setdefault("new_x", "LMARGIN"); k.setdefault("new_y", "NEXT")
        return super().multi_cell(*a, **k)
    def header(self):
        if self.page_no() == 1: return
        self.set_font("dj", "B", 8); self.set_text_color(120)
        self.cell(0, 6, clean("Shivaa Jewels - Instagram Ads Session - Chat Record (5-6 Oct 2026)"), align="C", new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(200); self.line(15, self.get_y(), 195, self.get_y()); self.ln(2)
    def footer(self):
        self.set_y(-12); self.set_font("dj", "", 8); self.set_text_color(150)
        self.cell(0, 8, f"Page {self.page_no()} / {{nb}}", align="C")

pdf = PDF(orientation="P", unit="mm", format="A4")
pdf.set_auto_page_break(True, margin=18)
pdf.set_margins(15, 14, 15)
pdf.add_font("dj", "", DEV + "DejaVuSans.ttf")
pdf.add_font("dj", "B", DEV + "DejaVuSans-Bold.ttf")
pdf.add_font("djm", "", DEV + "DejaVuSansMono.ttf")
pdf.alias_nb_pages = "{nb}"
pdf.add_page()

def H1(t):
    pdf.set_font("dj", "B", 15); pdf.set_text_color(110, 20, 20)
    pdf.multi_cell(0, 7.5, clean(t)); pdf.set_text_color(0); pdf.ln(1)
def H2(t):
    pdf.ln(1.5); pdf.set_font("dj", "B", 12); pdf.set_text_color(160, 110, 10)
    pdf.multi_cell(0, 6.5, clean(t)); pdf.set_text_color(0)
def P(t, size=10, sp=1.2):
    pdf.set_font("dj", "", size); pdf.multi_cell(0, 4.9, clean(t)); pdf.ln(sp)
def BOLD(t, size=10):
    pdf.set_font("dj", "B", size); pdf.multi_cell(0, 4.9, clean(t)); pdf.ln(0.6)
def MONO(t):
    pdf.set_font("djm", "", 8.6); pdf.set_text_color(40, 40, 40)
    pdf.multi_cell(0, 4.4, clean(t)); pdf.set_text_color(0); pdf.ln(1)
def OWNER(t):
    pdf.set_fill_color(240, 235, 205); pdf.set_font("dj", "B", 9.5)
    pdf.multi_cell(0, 5, clean("OWNER: " + t), fill=True); pdf.ln(0.8)
def AGENT(t):
    pdf.set_fill_color(228, 236, 246); pdf.set_font("dj", "", 9.5)
    pdf.multi_cell(0, 5, clean("AGENT: " + t), fill=True); pdf.ln(0.8)
def LINE(t=""):
    pdf.set_font("dj", "", 10); pdf.multi_cell(0, 4.9, clean(t))

# ---------------- Title ----------------
pdf.set_font("dj", "B", 20); pdf.set_text_color(110, 20, 20)
pdf.multi_cell(0, 9, "SHIVAA JEWELS")
pdf.set_font("dj", "B", 13); pdf.set_text_color(160, 110, 10)
pdf.multi_cell(0, 7, "Instagram (Meta) Ads - Session Chat Record & Resume-From-Here Document")
pdf.set_text_color(0); pdf.ln(2)
P("Date: 5-6 Oct 2026  -  Session branch: arena/01a10c1a-shivaa-ecom  -  Repo: theunreal8055-coder/Shivaa.ecom\n"
  "Shop: SHIVAA JEWELS JAYAL, Main Road, Jayal, Rajasthan 341023 (Nagaur)  -  WhatsApp +91 89050 05921  -  IG @shivaa.jewels  -  shivaa.in\n"
  "Purpose: full record of the Rs.5,000 bridal Instagram-ads planning discussion, so a NEW chat can continue from exactly this point.")

# ---------------- Section 0 ----------------
H1("0. HOW TO RESUME IN A NEW CHAT (read me first)")
P("This PDF is merged into main - every new Arena chat on this repo has it LOCALLY in the fresh checkout. In the new chat, just say:\n"
  "\"Read ARENA-STATE.md, HANDOFF.md and marketing/CHAT-RECORD-instagram-ads-session-2026-10-05.pdf (local, on main), then continue.\"\n"
  "The repo is PRIVATE, so raw.githubusercontent.com links give 404 unauthenticated - do not rely on them. To view it in a browser (logged in as theunreal8055-coder): "
  "github.com/theunreal8055-coder/Shivaa.ecom/blob/main/marketing/CHAT-RECORD-instagram-ads-session-2026-10-05.pdf\n"
  "Offline fallback - download with the authenticated GitHub CLI:")
MONO("gh api repos/theunreal8055-coder/Shivaa.ecom/contents/marketing/CHAT-RECORD-instagram-ads-session-2026-10-05.pdf?ref=main \\\n     -H \"Accept: application/vnd.github.raw\" > /tmp/chat.pdf")
P("Companion files from this session (read these too):")
MONO("marketing/INSTAGRAM-ADS-JAYAL-PLAN.md      <- the campaign plan (budget, blueprint, checklist)\n"
     "marketing/ads/shivaa-bridal-reel-A-bridal-story.mp4   <- 19s ready ad reel\n"
     "marketing/ads/shivaa-bridal-reel-B-gold-look.mp4       <- 10s ready ad reel\n"
     "marketing/ads/AD-CAPTIONS.md                          <- captions A/B/C + WhatsApp pre-fill\n"
     "marketing/ads/OWNER-REEL-SCRIPT-MARWARI.md            <- owner's talking-reel script (Reel C)\n"
     "marketing/ads/tracking-sheet.csv                      <- daily results tracker")

# ---------------- Section 1 ----------------
H1("1. STATUS SNAPSHOT (where we stand right now)")
BOLD("Decisions locked by the owner:")
P("- Budget: Rs.5,000 total. Platform: Instagram via Meta Ads Manager (owner HAS an ad account; billing/payment already set up).\n"
  "- Goal: WhatsApp messages + calls from bridal customers; invite them to the shop.\n"
  "- Targeting: approx. 30 km radius pin on Jayal (district level).\n"
  "- Hook: FREE bridal design consultation + trial at the shop (no discount claim, no margin cost).\n"
  "- Replies: mixed - WhatsApp messages and calls. Timing: agent's two-phase advice accepted.")
BOLD("Built and committed this session:")
P("- Two ad reels cut from the owner's own 16 Sep bridal films (Reel A 19s bridal story; Reel B 10s gold look) - upload-ready 1080x1920.\n"
  "- Full plan document + captions + tracking sheet in marketing/.\n"
  "- Reel C 'Owner's Invite' - the owner will FILM HIMSELF speaking Marwari; script finalised (verbatim in Section 3 transcript and in marketing/ads/OWNER-REEL-SCRIPT-MARWARI.md).\n"
  "- Live site untouched (planning-only session): live stays v181, repo build v182.")
BOLD("Next actions (in order):")
P("1. Owner: 4 setup checks - link IG @shivaa.jewels to the FB Page + ad account; connect WhatsApp Business to the Page; add GSTIN in Billing (18% GST becomes input credit); fix the Google listing which wrongly says \"Open 24 hours\".\n"
  "2. Owner: film the Marwari talking reel (3 takes, ~22s) + 4-5 short b-rolls; send to the agent as DOCUMENTS (no WhatsApp compression).\n"
  "3. Agent: analyse the footage and produce a deep, long, paste-ready 'Flow' prompt (owner edits video in Flow) - real voice/face stays, Flow does b-roll/transitions/text/logo end-card.\n"
  "4. Owner: launch the 3-day Rs.1,500 learning sprint per the plan blueprint (Reel C as Ad 1 if filmed, else Reel A; Reel A always Ad 2).\n"
  "5. Owner reports sprint numbers -> agent picks the winner -> Rs.3,500 burst runs 26 Oct - 6 Nov (bridal-shopping + Dhanteras window).")
BOLD("Guardrails (never break):")
P("- No 'free gold', lucky-draw or prize words anywhere - the Rs.9-lakh biscuit campaign stays parked pending CA/lawyer sign-off.\n"
  "- Honest claims only (BIS hallmark, fix vazan, 100% old-gold value, live rate on app - all real Shivaa policies). Say \"ekmatra (only) bridal showroom in Jayal\" ONLY if literally true.\n"
  "- Kill-switch: pause any ad set costing more than Rs.100 per WhatsApp conversation after about Rs.500 spent.")

# ---------------- Section 2 ----------------
H1("2. FULL CHAT TRANSCRIPT (condensed, in order)")

H2("2.1 The brief")
OWNER("Read agent handoff and memory doc... we have a 5000 budget in rupees now, everyone uses Instagram - I want to target Instagram. We discussed the bridal jewellery, to invite the customers to my shop. I don't know anything about Meta ads - let's start a full discussion meeting.")
AGENT("Read HANDOFF.md, MEMORY.md, docs/AGENT-HANDOFF.md, ARENA-STATE.md and the parked Rs.9-lakh campaign doc. Confirmed this is a marketing task (no site release). Ran the meeting: taught Meta Ads basics (Ads Manager = FB+IG one tool; 3 levels Campaign/AdSet/Ad; budget ceiling can never be exceeded; 18% GST on bills, GSTIN = input credit; 'Boost' post is the toy version), gave honest Rs.5,000 expectations (reach 25k-60k; roughly 15-40 WhatsApp conversations; first 3-4 days are Meta's learning phase), and asked 4 structured questions.")
P("Owner's answers: (1) Ads Manager EXISTS (ad account present, maybe boosted once) (2) Goal = WHATSAPP messages/calls (3) District-level radius ~25-40 km (4) Timing = 'you advise me'.", 9.5)

H2("2.2 The plan")
AGENT("Advised the two-phase split: Rs.1,500 learning sprint (3 days, Rs.500/day - two ad sets: A women 20-38 bridal/wedding interests, B all genders 25-48 parents) -> pause + review together -> Rs.3,500 burst 26 Oct - 6 Nov through Dhanteras week (~Rs.290/day, winning audience only, widen to 40 km so Nagaur city joins). Campaign = Engagement -> Messaging apps -> WhatsApp. CTA 'Send WhatsApp Message' with pre-filled text. Kill-switch >Rs.100/conversation. Drafted captions. Asked 4 more questions.")
P("Owner's answers: (1) Shop pin = Google Maps link -> resolved to SHIVAA JEWELS JAYAL, Main Road, Jayal, Rajasthan 341023 (2) Replies = MIXED (WhatsApp + calls) (3) Hook = FREE design trial/consultation (4) Billing = already set up.", 9.5)
AGENT("Built everything: marketing/INSTAGRAM-ADS-JAYAL-PLAN.md (blueprint, calendar, WhatsApp reply script, 4-point setup checklist - incl. fixing the Google listing's wrong 'Open 24 hours'), captions A & B, tracking CSV; cut Reel A (19s: bride unboxes Shivaa bridal set -> crossfade -> mother & bride closer) and Reel B (10s: model in gold set) from the owner's own 1080x1920 bridal films; verified frames visually; committed + pushed.")

H2("2.3 The owner's Marwari reel")
OWNER("What should be the reel? Kya bolu usme, Marwadi main bolta hun - \"ram ram sa thanke jayal main ekmatra bridal jewellery showroom aaigo hai sa, ab aapne mile la best hun best collection shivaa ki personal website or fix vazan or hallmarking sona ke saathe, ek baar aao or khudko selection kro, ek baar whatsapp button par click kro or ek baat karke dekho ki shivaa jewels thanki madad kiyan kr ske, aapne mile la personal bridal collection, gold rate booking shivaa ke khud ke app par, purana sona ki 100% value, lifetime care plan, aaj hi baat kre\"")
AGENT("Strongly endorsed the instinct (owner's face + Marwari = trust; beats polished films in a 30 km radius) and refined his draft into a timed ~22s script, keeping his exact lines and flavour:")
MONO("0-3s   Ram Ram sa! Thanke Jayal mein - ekmatra bridal jewellery showroom aa gayo sa!\n"
     "3-12s  Best of the best bridal collection - fix vazan aur hallmark suddha sona re saathe,\n"
     "       purana sona ri 100% value, aur live gold rate - Shivaa re khud re app par!\n"
     "12-18s Ek baar aao - khud selection karo, pehen kar dekho. Free bridal design trial -\n"
     "       kharidne ri koi majboori nahi.\n"
     "18-25s Niche WhatsApp button par ek click karo - ek baar baat karke dekho, Shivaa Jewels\n"
     "       thanki kyian madad kar sake sa. Aaj hi baat karo sa! Ram Ram sa!")
P("(Alternate opening if 'only showroom' is not literally true: \"Ram Ram sa! Jayal ri apni bridal jewellery shop - Shivaa Jewels!\") Filming rules: vertical phone at eye level, waist-up at the counter, bridal trays + shop name behind, light ON the face, 3 takes, send as WhatsApp Document. Caption C written (\"Ram Ram sa, Jayal! Marwadi shaadi ho ya saagan - dulhan ka set ab ghar re paas hi...\"). Reel C becomes the lead sprint creative once filmed.", 9.5)

H2("2.4 The Flow workflow")
OWNER("Main video ko Flow se edit karwaunga. Tum ek kaam kr skte ho - main tumhe bolkar video bhejunga or tum use analyse krke deep or long PROMPT dena jo main Flow main paste karun.")
AGENT("Agreed the split: owner shoots + owns Flow; agent analyses every clip frame-by-frame (lighting, framing, shake, best take) and returns a deep, long, paste-ready Flow prompt: shot-by-shot scene description with timings, camera moves, lighting/colour in Shivaa gold-maroon tones, the Marwari lines keyed to timestamps, subtitle/text-overlay + logo end-card + WhatsApp CTA frame instructions, and negative prompts. Key advisory: keep the owner's REAL face and REAL Marwari voice - Flow is for cinematic b-roll, transitions, text/logo cards, polish; AI-regenerating local-dialect speech looks fake and breaks the trust that sells gold. If Flow cannot do exact subtitles, the agent finishes them here with ffmpeg.")

H2("2.5 This document")
OWNER("Give me the full chat pdf direct GitHub link so that if I paste that in a new chat we can start from there only.")
AGENT("This PDF. Generated from the session record, committed to GitHub with the marketing/ folder, PR #103 merged to main; resume instructions (local read first - repo is private; gh api fallback; browser link for the logged-in owner) are in Section 0.")

# ---------------- Section 3 ----------------
H1("3. KEY NUMBERS TO REMEMBER")
P("- Budget: Rs.1,500 sprint + Rs.3,500 burst = Rs.5,000 (Meta cannot exceed; 18% GST extra on bills).\n"
  "- Sprint ad sets: Rs.250/day each (Dulhan & Family: women 20-38; Parents & Gifters: all 25-48), 30 km pin on Jayal 341023.\n"
  "- Burst window: 26 Oct - 6 Nov 2026 (Dhanteras ~5-6 Nov; wedding muhurats open ~21 Nov; families shop 3-6 weeks ahead).\n"
  "- Success bar: >= 20 WhatsApp conversations in the sprint at <= Rs.60 each; kill-switch Rs.100.\n"
  "- Campaign name: SJ-Bridal-Jayal-Oct26  -  creatives: Reel C (owner) vs Reel A (bridal story); Reel B = burst refresh.")
P("Exact Hindi/Devanagari caption text lives in marketing/ads/AD-CAPTIONS.md (transliterated here only because this sandbox lacks a Devanagari font).")
P("END OF RECORD - continue the new chat from Section 0.")
pdf.output("marketing/CHAT-RECORD-instagram-ads-session-2026-10-05.pdf")
print("PDF built")
