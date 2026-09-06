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
| **1** | **Live BIS hallmark / HUID lookup** | Released through [PR #5](https://github.com/theunreal8055-coder/Shivaa.ecom/pull/5), merge `77d5069`. Live API, entrypoint and HUID JS confirmed on 6 Sep 2026. **Automatic live BIS verification remains disconnected**; the live feature is the safe official handoff/recording workflow. See [Feature 1 details](FEATURE-01-HUID.md). |
| **13** | **Product Compare + Shareable Shortlist** | Live per owner; present at base commit `cc6d88b`. Preserved and regression-tested during Feature 1. |
| **2** | **Why Trust Shivaa** | Released separately through [PR #6](https://github.com/theunreal8055-coder/Shivaa.ecom/pull/6), merge `fad5aca`. **Live API and v40 JS/CSS confirmed on 6 Sep 2026.** Existing CIN, UDYAM and address only; GSTIN remains `null`, certificates `[]`, registry verification not performed. See [Feature 2 details](FEATURE-02-TRUST.md). |
| 3–12, 14–21 | Original owner wording not present in this checkout | Not implemented in this pass. Obtain the original specification before starting another numbered feature; do not invent the missing list or treat old UI placeholders as completed integrations. |

## Next handoff

1. Feature 1's safe workflow is live. Do not call automatic BIS verification
   connected merely because a guide or an accepted six-character format exists.
2. Feature 2 is live. Its profile is provided business information, not
   government verification. No GSTIN, certificates, corporate
   classification, DIPP recognition, registration status or trust score may be
   inferred from the supplied identifiers.
3. Stop after Feature 2. Ask for the owner's exact Feature 3 specification before
   doing further roadmap implementation. The rest of the list is still unknown.
