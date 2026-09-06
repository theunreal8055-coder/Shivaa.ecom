# Owner feature roadmap — one feature at a time

Updated 6 September 2026.

## Standing instruction

Do not fabricate supplier, payment, courier, notification, legal, BIS, HUID,
GSTIN, certificate or analytics data. Missing, disconnected, unverified and
unavailable are real states, not reasons to manufacture a successful result.
Do not advance to another feature in the same implementation pass.

## Confirmed scope / progress

| Owner number | Feature | Status |
| --- | --- | --- |
| **1** | **Live BIS hallmark / HUID lookup** | Safe real-data-only guide, format check, official BIS Care handoff and staff reference editor implemented and tested on this branch. **Automatic live BIS verification remains blocked: no documented authorised integration is connected. Release approved by the owner; publication and live confirmation pending.** See [Feature 1 details](FEATURE-01-HUID.md). |
| **13** | **Product Compare + Shareable Shortlist** | Live per owner; present at base commit `cc6d88b`. Preserved and regression-tested during Feature 1. |
| **2** | **Why Trust Shivaa** | Owner specification received: use the existing owner-confirmed CIN, UDYAM and address. Leave GSTIN and certificates empty until real details/files are provided. Build and release separately after Feature 1. |
| 3–12, 14–21 | Original owner wording not present in this checkout | Not implemented in this pass. Obtain the original specification before starting another numbered feature; do not invent the missing list or treat old UI placeholders as completed integrations. |

## Next handoff

1. Review/release the Feature 1 safe workflow through the normal deployment path.
   Do not call automatic live verification complete merely because the guide is
   visible or a six-character code passes validation.
2. Actual automatic verification requires documented authorised BIS access,
   verified response semantics and a separate reviewed adapter. Never request
   credentials in chat; secrets belong in protected server configuration.
3. Release Feature 1 first. The owner has now authorised Feature 2, **Why Trust
   Shivaa**, using only the existing CIN, UDYAM and address. Keep GSTIN and
   certificates empty pending real details/files. Release Feature 2 separately.
   Do not proceed to Feature 3 without its original specification.
