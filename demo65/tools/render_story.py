#!/usr/bin/env python3
"""STORY FILM — "a man tries the ring on and feels great about it".

Instead of panning over the 4 catalogue stills (old kenburns slideshow), this cuts
a 6-beat narrative shot in `media/{SKU}/story/`:

    f1_reach   he picks it up out of the box
    f2_slide   he slides it onto his finger        <- the try-on beat
    f3_fit     he flexes his hand, feeling the fit
    f4_admire  he turns his hand, admiring it
    f5_smile   his reaction: quiet satisfaction
    f6_hero    hero macro on the fist

Each beat gets its own camera move (slow push-in / drift), beats are cut at a
storytelling rhythm (the try-on and the reaction hold longest), joined with short
dissolves, and the Shivaa logo rides bottom-right throughout.

Output: media/{SKU}/video.mp4   (the old film is kept as video_kenburns.mp4)
Run:    python3 tools/render_story.py --only PGS5041
"""
from __future__ import annotations
import argparse, json, shutil, subprocess, sys, tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools"))
from brand_logo import video_logo_png  # noqa: E402

SIZE = (720, 900)          # 4:5 portrait — the PDP gallery aspect
FPS = 30
XF = 0.45                  # dissolve between beats

# beat -> (seconds on screen, camera move)
BEATS = [
    ("f1_reach",  1.9, "push-in"),
    ("f2_slide",  2.6, "push-in-slow"),   # the try-on: hold it
    ("f3_fit",    2.0, "drift-left"),
    ("f4_admire", 2.2, "push-out"),
    ("f5_smile",  2.6, "push-in-slow"),   # the feeling: hold it
    ("f6_hero",   2.0, "push-in"),
]


def _ffmpeg() -> str:
    exe = shutil.which("ffmpeg")
    if exe:
        return exe
    import imageio_ffmpeg
    return imageio_ffmpeg.get_ffmpeg_exe()


def _clip(ff: str, src: Path, dst: Path, secs: float, move: str) -> None:
    w, h = SIZE
    d = int(round(secs * FPS)) + 1
    if move == "push-in":       z0, z1 = 1.00, 1.10
    elif move == "push-in-slow": z0, z1 = 1.02, 1.08
    elif move == "push-out":    z0, z1 = 1.10, 1.00
    else:                       z0, z1 = 1.06, 1.06     # drift, no zoom
    step = abs(z1 - z0) / d
    z = (f"min(zoom+{step:.6f},{z1})" if z1 > z0
         else (f"max(zoom-{step:.6f},{z1})" if z1 < z0 else f"{z0}"))
    if move == "drift-left":
        x = f"(iw-iw/zoom)*(1-on/{d})"
    else:
        x = "(iw-iw/zoom)/2"
    y = "(ih-ih/zoom)/2"
    vf = (f"scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h},setsar=1,"
          f"zoompan=z='{z}':x='{x}':y='{y}':d={d}:s={w}x{h}:fps={FPS},"
          f"trim=duration={secs:.4f},setpts=PTS-STARTPTS,format=yuv420p")
    r = subprocess.run([ff, "-y", "-loglevel", "error", "-loop", "1",
                        "-t", f"{secs:.4f}", "-i", str(src), "-vf", vf,
                        "-c:v", "libx264", "-crf", "20", "-preset", "fast",
                        "-pix_fmt", "yuv420p", "-an", str(dst)],
                       capture_output=True, text=True, timeout=600)
    if r.returncode:
        raise RuntimeError(f"{src.name}: {r.stderr[-300:]}")


def render(sku: str, media: Path) -> int:
    story = media / sku / "story"
    beats = [(story / f"{k}.jpg", s, m) for k, s, m in BEATS]
    beats = [b for b in beats if b[0].exists()]
    if len(beats) < 3:
        raise FileNotFoundError(f"{sku}: only {len(beats)} story frames — run the "
                                f"story photoshoot first")
    ff = _ffmpeg()
    tmp = Path(tempfile.mkdtemp(prefix=f"story_{sku}_"))
    try:
        clips = []
        for i, (src, secs, move) in enumerate(beats):
            c = tmp / f"c{i}.mp4"
            _clip(ff, src, c, secs, move)
            clips.append(c)
        inputs, filters = [], []
        for i, c in enumerate(clips):
            inputs += ["-i", str(c)]
        # xfade chain; each dissolve overlaps XF seconds
        offset = 0.0
        label = "0:v"
        for i in range(1, len(clips)):
            offset += beats[i - 1][1] - XF
            nxt = f"x{i}"
            filters.append(f"[{label}][{i}:v]xfade=transition=fade:"
                           f"duration={XF:.3f}:offset={offset:.3f}[{nxt}]")
            label = nxt
        total = sum(b[1] for b in beats) - XF * (len(beats) - 1)
        png = video_logo_png(SIZE[0], SIZE[1], tmp / "logo.png", width_pct=0.24)
        inputs += ["-loop", "1", "-t", f"{total:.3f}", "-i", str(png)]
        li = len(clips)
        filters.append(f"[{label}][{li}:v]overlay=0:0:format=auto,format=yuv420p[v]")
        mp4 = media / sku / "video.mp4"
        old = media / sku / "video_kenburns.mp4"
        if mp4.exists() and not old.exists():
            shutil.copy2(mp4, old)
        r = subprocess.run([ff, "-y", "-hide_banner", "-loglevel", "error", *inputs,
                            "-filter_complex", ";".join(filters), "-map", "[v]",
                            "-c:v", "libx264", "-crf", "22", "-preset", "medium",
                            "-movflags", "+faststart", "-pix_fmt", "yuv420p",
                            "-t", f"{total:.3f}", str(mp4)],
                           capture_output=True, text=True, timeout=900)
        if r.returncode:
            raise RuntimeError(r.stderr[-500:])
        return mp4.stat().st_size
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", default="", help="comma-separated SKUs")
    a = ap.parse_args()
    media = ROOT / "media"
    skus = [s.strip() for s in a.only.split(",") if s.strip()]
    if not skus:
        skus = sorted(d.name for d in media.glob("PGS*") if (d / "story").is_dir())
    ok = 0
    for sku in skus:
        try:
            n = render(sku, media)
            print(f"OK   {sku}  story film {n/1e6:.1f} MB")
            ok += 1
        except Exception as e:
            print(f"FAIL {sku}: {str(e)[:200]}")
    print(f"\n{ok}/{len(skus)} story films rendered")


if __name__ == "__main__":
    main()
