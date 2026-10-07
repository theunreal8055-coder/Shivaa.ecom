#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Shivaa Jewels — one-command final reel render.

    python3 render.py INPUT.mp4 [OUT.mp4]

Pipeline (handoff §11 export spec):
  1. probe input (rotation / size / audio)
  2. normalise to 1080x1920 @30fps, centre-cover crop, yuv420p
  3. overlay schedule from graphics/overlays.json  (caption backing panels,
     offer card, gold frame accent) with fade-in/out + gentle upward reveal
  4. burn captions/shivaa-jewels-captions.ass with the bundled font
  5. loudnorm voice to -14 LUFS (Reels target), AAC 192k
  6. H.264 crf 18, +faststart  ->  shivaa-jewels-final.mp4

The original video and the owner's voice are never altered beyond level
normalisation; no logo is added here (logo lives only in the 10s outro).
"""
import json, os, shlex, subprocess, sys

KIT = os.path.dirname(os.path.abspath(__file__))
OV = json.load(open(os.path.join(KIT, "graphics", "overlays.json"), encoding="utf-8"))

def ffmpeg():
    import shutil
    p = shutil.which("ffmpeg")
    if p: return p
    import imageio_ffmpeg
    return imageio_ffmpeg.get_ffmpeg_exe()

def ffprobe():
    import shutil
    p = shutil.which("ffprobe")
    if p: return p
    return None

def probe(ff, src):
    pr = ffprobe()
    if pr:
        out = subprocess.run([pr, "-v", "error", "-show_entries",
                              "stream=codec_type,width,height:format=duration",
                              "-of", "json", src], capture_output=True, text=True).stdout
        j = json.loads(out)
        vid = [s for s in j.get("streams", []) if s.get("codec_type") == "video"]
        aud = [s for s in j.get("streams", []) if s.get("codec_type") == "audio"]
        return {"w": vid[0].get("width") if vid else None,
                "h": vid[0].get("height") if vid else None,
                "dur": float(j.get("format", {}).get("duration", 0) or 0),
                "audio": bool(aud)}
    import re
    err = subprocess.run([ff, "-hide_banner", "-i", src], capture_output=True, text=True).stderr
    m = re.search(r"Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)", err)
    dur = sum(float(x) * m for x, m in zip(m.groups(), (3600, 60, 1))) if m else 0.0
    vid = re.search(r"Stream #\d+:\d+[^\n]*: Video:\s*[^\s,]+,\s*[^\s,]*\s*(\d+)x(\d+)", err)
    return {"w": int(vid.group(1)) if vid else None,
            "h": int(vid.group(2)) if vid else None,
            "dur": dur,
            "audio": bool(re.search(r"Stream #\d+:\d+[^\n]*: Audio:", err))}

def main():
    if len(sys.argv) < 2:
        sys.exit("usage: python3 render.py INPUT.mp4 [OUT.mp4]")
    src, out = sys.argv[1], (sys.argv[2] if len(sys.argv) > 2 else os.path.join(KIT, "shivaa-jewels-final.mp4"))
    ff = ffmpeg()
    info = probe(ff, src)
    dur = info["dur"] or 60.0
    print("[probe] %s  %sx%s  %.1fs  audio=%s" % (os.path.basename(src), info["w"], info["h"], dur, info["audio"]))

    parts = ["[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,"
             "fps=30,setsar=1,format=yuv420p[base]"]
    prev, n = "base", 0
    inputs = []
    for o in OV:
        s, e = o["start"], min(o["end"], dur)
        if e <= s:
            continue
        n += 1
        inputs += ["-loop", "1", "-t", "%.3f" % (e - s), "-i", os.path.join(KIT, o["file"])]
        fade = "format=rgba,fade=t=in:st=0:d=%.2f:alpha=1" % o["fin"]
        if o["fout"]:
            fade += ",fade=t=out:st=%.3f:d=%.2f:alpha=1" % (max(0, (e - s) - o["fout"]), o["fout"])
        parts.append("[%d:v]%s,setpts=PTS+%.3f[o%d]" % (n, fade, s, n))
        yexpr = ("%d" % o["y"]) if not o["rise"] else \
                "%d+%d*(1-min(1,max(0,(t-%.3f)/0.34)))" % (o["y"], o["rise"], s)
        parts.append("[%s][o%d]overlay=x=%d:y='%s':enable='between(t,%.3f,%.3f)'[v%d]"
                     % (prev, n, o["x"], yexpr, s, e, n))
        prev = "v%d" % n
    parts.append("[%s]ass=%s:fontsdir=%s[vout]" %
                 (prev, shlex.quote(os.path.join(KIT, "captions", "shivaa-jewels-captions.ass")),
                  shlex.quote(os.path.join(KIT, "fonts"))))

    cmd = [ff, "-hide_banner", "-loglevel", "warning", "-y", "-i", src] + inputs + \
          ["-filter_complex", ";".join(parts), "-map", "[vout]"]
    if info["audio"]:
        cmd += ["-map", "0:a?", "-af", "loudnorm=I=-14:TP=-1:LRA=11",
                "-c:a", "aac", "-b:a", "192k", "-ar", "48000"]
    cmd += ["-c:v", "libx264", "-profile:v", "high", "-crf", "18", "-preset", "slow",
            "-pix_fmt", "yuv420p", "-r", "30", "-movflags", "+faststart", out]
    print("[render] %s" % " ".join(cmd[:6]) + " ...")
    r = subprocess.run(cmd)
    if r.returncode:
        sys.exit("render failed (%d)" % r.returncode)
    print("[done] %s" % out)

if __name__ == "__main__":
    main()
