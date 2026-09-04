#!/usr/bin/env python3
"""One-command orchestrator: python run_all.py --stage 3 --limit 10
Stages: 1 ingest · 2 normalise · 3 photoshoot · 4 video · 5 metadata · 6 upload
Every stage is idempotent (ledgers in work/) so any run can be interrupted and resumed.
"""
import argparse, subprocess, sys, json
from pathlib import Path

HERE = Path(__file__).parent
STAGES = {
    1: ["01_ingest_pdf.py"],
    2: ["02_normalize_data.py"],
    3: ["03_photoshoot.py"],
    4: ["04_render_video.py"],
    5: ["05_metadata.py"],
    6: ["06_upload.py"],
}

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--stage", type=int, default=3)
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--only", default="")
    ap.add_argument("--config", default="config.json")
    ap.add_argument("--extra", nargs="*", default=[], help="extra args appended (e.g. --pdf x.pdf:rings --dry-run)")
    a = ap.parse_args()
    base = [sys.executable, str(HERE / STAGES[a.stage][0]), "--config", a.config]
    if a.limit: base += ["--limit", str(a.limit)]
    if a.only: base += ["--only", a.only]
    cmd = base + a.extra
    print("$", " ".join(cmd))
    sys.exit(subprocess.call(cmd, cwd=HERE.parent))

if __name__ == "__main__":
    main()
