#!/usr/bin/env python3
"""Assert the v119 rate contract on a real /api/rates + /api/products payload.

Reads the JSON the probe prints on stdin (tolerating PHP notice noise) and
checks, in order:

  premium.gold22 == 398                                     (Task-2 owner decision)
  anchorLevel.mode in {mcx-future, spot, override}
  jaipur.gold22 == php_round(anchorLevel.goldPerG * 0.9167) + 398
  24K line untouched: jaipur.gold24 == php_round(goldPerG) + 55
  products: the first product's ratePerGram matches jaipur.gold22

Exit code 0 = contract holds, 1 = a number moved (prints exactly what).
"""
import json
import math
import sys

GOLD22_PREMIUM = 398
JAIPUR_PREMIUM_24K = 55
PURITY_22 = 0.9167


def php_round(x: float) -> int:
    """PHP's round() rounds half AWAY FROM ZERO (Python rounds half to even)."""
    return int(math.floor(abs(x) + 0.5)) * (1 if x >= 0 else -1)


def load(raw: str) -> dict:
    i = raw.find("{")
    if i < 0:
        raise SystemExit("no JSON in probe output:\n" + raw[:400])
    return json.loads(raw[i:])


def main() -> int:
    src = open(sys.argv[1]).read() if len(sys.argv) > 1 else sys.stdin.read()
    d = load(src)
    fails = []

    prem = d.get("premium") or {}
    if prem.get("gold22") != GOLD22_PREMIUM:
        fails.append(f"premium.gold22 is {prem.get('gold22')!r}, expected {GOLD22_PREMIUM}")

    anc = d.get("anchorLevel") or {}
    mode, gold_per_g = anc.get("mode"), anc.get("goldPerG")
    if mode not in ("mcx-future", "spot", "override"):
        fails.append(f"anchorLevel.mode is {mode!r}")
    if not gold_per_g:
        fails.append("anchorLevel.goldPerG missing/zero")

    if gold_per_g:
        want = php_round(gold_per_g * PURITY_22) + GOLD22_PREMIUM
        got = (d.get("jaipur") or {}).get("gold22")
        if got != want:
            fails.append(f"jaipur.gold22 is {got!r}, expected {want} "
                         f"(round({gold_per_g} x {PURITY_22}) + {GOLD22_PREMIUM})")
        want24 = php_round(gold_per_g) + JAIPUR_PREMIUM_24K
        got24 = (d.get("jaipur") or {}).get("gold24")
        if mode != "override" and got24 != want24:
            fails.append(f"jaipur.gold24 is {got24!r}, expected {want24} (24K line must stay on the 55 premium)")

    print(f"  premium.gold22 : {prem.get('gold22')}")
    print(f"  anchorLevel    : mode={mode} goldPerG={gold_per_g} silverPerG={anc.get('silverPerG')}")
    print(f"  jaipur.gold22  : {(d.get('jaipur') or {}).get('gold22')}  "
          f"(formula check vs {php_round((gold_per_g or 0) * PURITY_22) + GOLD22_PREMIUM})")
    print(f"  jaipur.gold24  : {(d.get('jaipur') or {}).get('gold24')}  (v118 24K line unchanged)")
    # the anchor must also reach a real product price
    if len(sys.argv) > 2:
        prods = load(open(sys.argv[2]).read()).get("products") or []
        if prods:
            pr = prods[0].get("price") or {}
            jaipur22 = (d.get("jaipur") or {}).get("gold22")
            print(f"  first piece    : {prods[0].get('sku')} · {prods[0].get('weightG')} g · "
                  f"rate ₹{pr.get('ratePerGram')}/g · total ₹{pr.get('total')}")
            if mode != "override" and pr.get("ratePerGram") != jaipur22:
                fails.append(f"{prods[0].get('sku')} prices at ₹{pr.get('ratePerGram')}/g but jaipur.gold22 is ₹{jaipur22}/g")

    if fails:
        print("\nCONTRACT FAILED:")
        for f in fails:
            print("  ✗ " + f)
        return 1
    print("\n  ✓ v119 rate contract holds")
    return 0


if __name__ == "__main__":
    sys.exit(main())
