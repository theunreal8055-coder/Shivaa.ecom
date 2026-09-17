#!/usr/bin/env python3
"""RUN-FREE · ₹0 END-TO-END ORCHESTRATOR — inbox PDFs in, live products out. No employees, no AI bills.

Chain: scan catalogue-inbox/ → 1 ingest → 1b OCR (free Tesseract, if present)
       → 2 normalize → 3f free studio → 4 kenburns films (ffmpeg) → 5f free metadata
       → 6 upload to shivaa.in (only with --upload + admin creds)
Every stage is ledger-idempotent; PDFs that finished ingest move to catalogue-inbox/_done/.

Run:  python pipeline/run_free.py --config pipeline/config.free.json [--max-pdfs 5] [--upload] [--dry-run]
"""
import argparse, os, shutil, subprocess, sys, time
from pathlib import Path

HERE = Path(__file__).parent          # pipeline/
ROOT = HERE.parent                    # repo root
CATS = ["rings", "bangles", "bracelets", "necklaces", "earrings", "pendants",
        "mangalsutra", "nosepins", "chains", "silver", "bajubandh", "rakhdi",
        "aad", "sheeshphool", "hathphool", "punach", "bridalanklets"]


def sh(cmd, env=None):
    print("$", " ".join(str(c) for c in cmd), flush=True)
    r = subprocess.run([str(c) for c in cmd], cwd=ROOT, env=env)
    if r.returncode != 0:
        raise SystemExit(f"stage failed ({r.returncode}): {cmd}")
    return r


def category_for(pdf: Path) -> str:
    stem = pdf.stem.lower()
    for c in CATS:
        if stem.startswith(c) or f"-{c}" in stem or f"_{c}" in stem:
            return c
    return "rings"   # safe default; override by naming the file rings-... bangles-... etc.


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--config", default="pipeline/config.free.json")
    ap.add_argument("--max-pdfs", type=int, default=5)
    ap.add_argument("--upload", action="store_true",
                    help="actually push to shivaa.in (needs SHIVAA_ADMIN_EMAIL + SHIVAA_ADMIN_PASSWORD)")
    ap.add_argument("--dry-run", action="store_true", help="upload stage prints payloads, sends nothing")
    ap.add_argument("--led-ocr", action="store_true",
                    help="EXPERIMENTAL: read weights off scale LEDs (hints only unless trust_led_ocr=true)")
    a = ap.parse_args()

    inbox = ROOT / "catalogue-inbox"
    done = inbox / "_done"
    done.mkdir(parents=True, exist_ok=True)
    pdfs = sorted(p for p in inbox.glob("*.pdf") if p.is_file())[: a.max_pdfs]
    env = dict(os.environ)
    env["PATH"] = env.get("PATH", "")

    import json
    cfg = json.loads((ROOT / a.config).read_text(encoding="utf-8"))
    work = ROOT / cfg["paths"]["work_dir"]
    work.mkdir(parents=True, exist_ok=True)

    report = ["# Free-tier nightly report", f"_{time.strftime('%Y-%m-%d %H:%M IST')}_", ""]

    if not pdfs:
        report += ["No new PDFs in catalogue-inbox/ — nothing to do.", ""]
    for pdf in pdfs:
        cat = category_for(pdf)
        report += [f"## {pdf.name} → category **{cat}**"]
        sh([sys.executable, HERE / "01_ingest_pdf.py", "--config", a.config,
            "--pdf", pdf, "--category", cat])
        if shutil.which("tesseract"):
            sheets = ROOT / cfg["paths"]["supplier_sheets"]
            sheets.mkdir(parents=True, exist_ok=True)
            sh([sys.executable, HERE / "01b_ocr_tags.py",
                "--pdf", pdf, "--category", cat,
                "--out", sheets / f"tags-{pdf.stem}.csv",
                "--work", ROOT / cfg["paths"]["work_dir"]])
        else:
            report += ["- ⚠️ tesseract not found — weights unknown, designs will quarantine"]
        # ingest (and its crops) are durable -> archive the source PDF
        shutil.move(str(pdf), done / pdf.name)
        report += [f"- ingested + archived to `_done/{pdf.name}`", ""]

    if a.led_ocr:
        sh([sys.executable, HERE / "03b_led_weights.py", "--config", a.config])
    sh([sys.executable, HERE / "02b_free_normalize.py", "--config", a.config])

    sh([sys.executable, HERE / "03_free_studio.py", "--config", a.config])

    vlim = cfg.get("free_tier", {}).get("videos_per_run", 12)
    sh([sys.executable, HERE / "04_render_video.py", "--config", a.config,
        "--mode", "kenburns", "--limit", str(vlim)])

    sh([sys.executable, HERE / "05_free_metadata.py", "--config", a.config])

    uploaded = "skipped (no --upload)"
    if a.upload:
        if a.dry_run:
            sh([sys.executable, HERE / "06_upload.py", "--config", a.config,
                "--email", env.get("SHIVAA_ADMIN_EMAIL", ""), "--dry-run"])
            uploaded = "DRY-RUN (no live write)"
        else:
            sh([sys.executable, HERE / "06_upload.py", "--config", a.config,
                "--email", env.get("SHIVAA_ADMIN_EMAIL", ""),
                "--password", env.get("SHIVAA_ADMIN_PASSWORD", ""), "--live"])
            uploaded = "LIVE ✅"

    def count(p):
        try:
            import csv as _c
            with open(p, newline="", encoding="utf-8") as f:
                rows = list(_c.DictReader(f))
            return sum(1 for r in rows if r.get("status") == "done")
        except Exception:
            return 0

    meta_p = work / "designs_meta.json"
    ready = len(json.loads(meta_p.read_text(encoding="utf-8"))) if meta_p.exists() else 0
    quar_p = work / "quarantine_free.json"
    quar = len(json.loads(quar_p.read_text(encoding="utf-8"))) if quar_p.exists() else 0
    report += [
        "## Totals",
        f"- films rendered (this run cap {vlim}): **{count(work / 'ledger_video.csv')}**",
        f"- studio heroes total: **{count(work / 'ledger_free_studio.csv')}**",
        f"- ready to upload: **{ready}** · quarantined (fill weight in admin): **{quar}**",
        f"- upload: **{uploaded}**",
        "",
        "_Photos/films live on Hostinger via API — never in Git. Ledgers make every run resumable._",
    ]
    (work / "report-free.md").write_text("\n".join(report) + "\n", encoding="utf-8")
    print("\n".join(report))


if __name__ == "__main__":
    main()
