#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Fetch owner-uploaded video parts from GitHub and reassemble the source video.

    python3 fetch_video_drop.py [BRANCH] [FOLDER] [OUT.mp4]
    defaults: BRANCH=video-drop  FOLDER=video-drop  OUT=.cache/media/assembled-source.mp4

Parts are ordinary repo files (uploaded via GitHub web UI, <=25 MB each).
They are fetched through the GitHub blobs API (reachable from this sandbox),
sorted by filename, and concatenated losslessly with ffmpeg's concat demuxer.
"""
import base64, json, os, shutil, subprocess, sys, urllib.request

REPO = "theunreal8055-coder/Shivaa.ecom"
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))

def api(path):
    gh = shutil.which("gh")
    if gh:
        out = subprocess.run([gh, "api", path], capture_output=True, text=True)
        if out.returncode == 0:
            return json.loads(out.stdout)
        raise SystemExit("gh api failed: " + out.stderr[:300])
    req = urllib.request.Request("https://api.github.com/" + path,
                                 headers={"User-Agent": "arena", "Accept": "application/vnd.github+json"})
    return json.load(urllib.request.urlopen(req, timeout=120))

def ffmpeg():
    p = shutil.which("ffmpeg")
    if p:
        return p
    import imageio_ffmpeg
    return imageio_ffmpeg.get_ffmpeg_exe()

def main():
    branch = sys.argv[1] if len(sys.argv) > 1 else "video-drop"
    folder = sys.argv[2] if len(sys.argv) > 2 else "video-drop"
    out = sys.argv[3] if len(sys.argv) > 3 else os.path.join(ROOT, ".cache", "media", "assembled-source.mp4")
    listing = api("repos/%s/contents/%s?ref=%s" % (REPO, folder, branch))
    if folder in ("", ".", "/"):
        ok = lambda n: n.lower().startswith(("part-", "part_", "video-part", "segment"))
    else:
        ok = lambda n: True
    parts = sorted([e for e in listing if e["type"] == "file" and ok(e["name"]) and
                    e["name"].lower().endswith((".mp4", ".m4v", ".mov", ".mkv"))],
                   key=lambda e: e["name"])
    if not parts:
        raise SystemExit("no video parts found in %s@%s/%s" % (REPO, branch, folder))
    work = os.path.dirname(out) or "."
    os.makedirs(work, exist_ok=True)
    files = []
    for e in parts:
        dest = os.path.join(work, "part-" + e["name"])
        blob = api("repos/%s/git/blobs/%s" % (REPO, e["sha"]))
        open(dest, "wb").write(base64.b64decode(blob["content"]))
        files.append(dest)
        print("fetched %-28s %8.1f MB" % (e["name"], e["size"] / 1e6))
    lst = os.path.join(work, "concat-list.txt")
    open(lst, "w").write("\n".join("file '%s'" % f for f in files))
    subprocess.run([ffmpeg(), "-hide_banner", "-loglevel", "error", "-y",
                    "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", out], check=True)
    d = subprocess.run([ffmpeg(), "-hide_banner", "-i", out], capture_output=True, text=True).stderr
    print("ASSEMBLED:", out)
    print([l for l in d.splitlines() if "Duration" in l or "Video:" in l][:2])

if __name__ == "__main__":
    main()
