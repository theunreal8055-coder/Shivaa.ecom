#!/usr/bin/env python3
"""ONE-COMMAND live upload of the finished photoshoot batch to shivaa.in.

Run from anywhere:   python3 deploy/upload_live.py
It asks for the admin password privately (not stored, not in history),
then uploads every design that has a complete media set (4 shots + film):
media -> POST /api/media, product -> create-or-update by SKU
(category rings + tag mens = the site's Men's section). Resumable: re-run
anytime as more designs finish; already-uploaded SKUs are updated, never duped.
"""
import getpass, subprocess, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
DEMO = HERE.parent / "demo65"

def main():
    email = input("Admin email [admin@shivaa.in]: ").strip() or "admin@shivaa.in"
    pw = getpass.getpass("Admin password for shivaa.in (hidden, not stored): ")
    if not pw:
        sys.exit("no password given")
    print("\nUploading to https://shivaa.in … (Ctrl-C pauses safely; re-run to resume)\n")
    rc = subprocess.call([sys.executable, str(DEMO / ".." / "pipeline" / "06_upload.py"),
                          "--config", str(DEMO / "config.json"),
                          "--email", email, "--password", pw, "--live"],
                         cwd=str(DEMO))
    print("\nDONE. Verify: https://shivaa.in/api/products?q=PGS  ·  homepage → Men's chip")
    print("Rotate the admin password now (hPanel → CMS admin).")
    sys.exit(rc)

if __name__ == "__main__":
    main()
