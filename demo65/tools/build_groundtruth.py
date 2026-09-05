#!/usr/bin/env python3
"""Rebuild demo65 ground truth from visual tag readings of the 65-page supplier PDF.
Reads: page -> (tag code, tag weight g) — transcribed from work/sheets (visual OCR).
Outputs: work/page_map.csv, suppliers/tags.csv, moves crops media/rings/SHV-RIN-00NN.jpg
-> media/designs/{SKU}.jpg. PGR5001 tag = supplier typo for PGS5001 (weight matches db)."""
import csv, shutil
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
READINGS = [  # (page, tag as printed, weight g)
 (1,"PGS5065",1.650),(2,"PGS5064",3.200),(3,"PGS5063",3.280),(4,"PGS5062",4.870),
 (5,"PGS5061",3.880),(6,"PGS5026",1.760),(7,"PGS5015",1.660),(8,"PGS5002",1.800),
 (9,"PGS5050",3.690),(10,"PGS5029",1.930),(11,"PGS5004",3.830),(12,"PGS5032",1.770),
 (13,"PGS5014",1.810),(14,"PGS5025",1.770),(15,"PGS5022",1.910),(16,"PGS5047",1.880),
 (17,"PGS5035",1.920),(18,"PGS5049",1.930),(19,"PGS5036",3.060),(20,"PGS5003",1.840),
 (21,"PGS5060",3.980),(22,"PGR5001",1.870),(23,"PGS5057",4.280),(24,"PGS5051",3.610),
 (25,"PGS5006",2.070),(26,"PGS5007",1.680),(27,"PGS5005",1.170),(28,"PGS5046",1.750),
 (29,"PGS5024",1.760),(30,"PGS5018",1.590),(31,"PGS5016",2.020),(32,"PGS5017",1.700),
 (33,"PGS5058",3.800),(34,"PGS5045",1.750),(35,"PGS5033",1.890),(36,"PGS5044",1.780),
 (37,"PGS5043",2.010),(38,"PGS5023",4.130),(39,"PGS5027",1.840),(40,"PGS5040",1.750),
 (41,"PGS5020",2.040),(42,"PGS5019",1.830),(43,"PGS5028",1.690),(44,"PGS5041",3.370),
 (45,"PGS5059",2.990),(46,"PGS5042",1.950),(47,"PGS5030",1.720),(48,"PGS5037",1.930),
 (49,"PGS5013",1.900),(50,"PGS5034",1.890),(51,"PGS5009",3.340),(52,"PGS5008",1.710),
 (53,"PGS5021",1.940),(54,"PGS5054",4.020),(55,"PGS5011",4.960),(56,"PGS5031",3.400),
 (57,"PGS5012",1.920),(58,"PGS5039",2.670),(59,"PGS5010",3.530),(60,"PGS5038",1.700),
 (61,"PGS5055",3.510),(62,"PGS5048",4.190),(63,"PGS5056",4.330),(64,"PGS5053",3.410),
 (65,"PGS5052",4.270),
]
# creative heritage names (copy, not specs); live names kept for the 2 exemplars
NAMES = {
 5001:"Rajkumari", 5002:"Suraj Kiran", 5003:"Chandni", 5004:"Mughal Moti", 5005:"Pichola",
 5006:"Amber", 5007:"Kesariya", 5008:"Mehndi", 5009:"Jharokha", 5010:"Marudhara",
 5011:"Sheesh Mahal", 5012:"Hawa Mahal", 5013:"City Palace", 5014:"Chandra", 5015:"Surya",
 5016:"Tara", 5017:"Kiran", 5018:"Moti", 5019:"Heera", 5020:"Panna",
 5021:"Manik", 5022:"Pushkar", 5023:"Marwar", 5024:"Mewar", 5025:"Dhola",
 5026:"Gulab", 5027:"Chambal", 5028:"Banas", 5029:"Aravalli", 5030:"Thar",
 5031:"Shekhawati", 5032:"Bikaner", 5033:"Jodhpur", 5034:"Udaipur", 5035:"Jaisalmer",
 5036:"Chittor", 5037:"Kumbhal", 5038:"Ranakpur", 5039:"Dilwara", 5040:"Nahargarh",
 5041:"Baori", 5042:"Sindoor", 5043:"Kajal", 5044:"Payal", 5045:"Kangana",
 5046:"Borla", 5047:"Genda", 5048:"Kesar", 5049:"Zafra", 5050:"Itr",
 5051:"Meenakari", 5052:"Kundan", 5053:"Jadau", 5054:"Thewa", 5055:"Minakari",
 5056:"Rani Padmini", 5057:"Noor Jahan", 5058:"Meher", 5059:"Kanchan", 5060:"Rajshri",
 5061:"Swarna", 5062:"Ratna", 5063:"Vasanta", 5064:"Sharad", 5065:"Megh",
}
norm = lambda code: code.replace("PGR", "PGS")  # supplier prefix typo, verified by weight vs db

rows = []
skus = []
for page, code, wt in READINGS:
    sku = norm(code)
    skus.append(sku)
    rows.append({"page": page, "shv_sku": f"SHV-RIN-{page:04d}", "tag_code": code,
                 "sku": sku, "weight_g": f"{wt:.3f}"})

# contiguity check — handoff rule
expected = {f"PGS{n}" for n in range(5001, 5066)}
assert len(skus) == 65 and set(skus) == expected, f"SKU set mismatch: {expected ^ set(skus)}"

with open(HERE / "work" / "page_map.csv", "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=["page", "shv_sku", "tag_code", "sku", "weight_g"])
    w.writeheader(); w.writerows(rows)

DES = HERE / "media" / "designs"
DES.mkdir(parents=True, exist_ok=True)
with open(HERE / "suppliers" / "tags.csv", "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=["sku", "name", "category", "metal", "purity", "weightG",
                                      "mcValue", "sizes", "stoneDesc", "tags", "img"])
    w.writeheader()
    for r in rows:
        n = int(r["sku"][3:])
        src = HERE / "media" / "rings" / f"{r['shv_sku']}.jpg"
        dst = DES / f"{r['sku']}.jpg"
        if src.exists() and not dst.exists():
            shutil.move(str(src), str(dst))
        w.writerow({"sku": r["sku"], "name": f"{NAMES[n]} Ring {r['sku']}", "category": "rings",
                    "metal": "Gold", "purity": "22K", "weightG": r["weight_g"], "mcValue": "12",
                    "sizes": "12, 14, 16, 18", "stoneDesc": "", "tags": "ring, gold, 22k, handcrafted",
                    "img": f"media/designs/{r['sku']}.jpg"})
print(f"page_map.csv + tags.csv written · {len(list(DES.glob('*.jpg')))} crops in media/designs · contiguous PGS5001-5065 ✓")
