#!/usr/bin/env python3
"""Render the 10s 720x720@25 ken-burns video for one SKU (house spec, no watermark)."""
import subprocess, sys, tempfile
from pathlib import Path

FF = '/home/user/.local/bin/ffmpeg'
DUR, FPS, W, H, XF = 10.0, 25, 720, 720, 0.7
MOVES = ['zoom-in', 'pan-left', 'zoom-out', 'pan-right']


def kenburns(shots, mp4: Path):
    n = len(shots)
    seg = (DUR + (n - 1) * XF) / n
    D = int(round(seg * FPS)) + 1
    tmp = Path(tempfile.mkdtemp(prefix='kb_'))
    clips = []
    for i, s in enumerate(shots):
        z0, z1 = (1.0, 1.13) if i % 2 == 0 else (1.13, 1.0)
        step = abs(z1 - z0) / D
        z = f"min(zoom+{step:.6f},{z1})" if z1 > z0 else f"max(zoom-{step:.6f},{z1})"
        move = MOVES[i % len(MOVES)]
        if move == 'pan-left':
            x, y = "if(eq(on,0),0,(iw-iw/zoom)/2)", "(ih-ih/zoom)/2"
        elif move == 'pan-right':
            x, y = "if(eq(on,0),(iw-iw/zoom),(iw-iw/zoom)/2)", "(ih-ih/zoom)/2"
        else:
            x, y = "(iw-iw/zoom)/2", "(ih-ih/zoom)/2"
        clip = tmp / f"c{i}.mp4"
        r = subprocess.run([FF, "-y", "-loglevel", "error", "-loop", "1", "-t", f"{seg:.4f}", "-i", s,
                            "-vf", (f"scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},setsar=1,"
                                    f"zoompan=z='{z}':x='{x}':y='{y}':d={D}:s={W}x{H}:fps={FPS},"
                                    f"trim=duration={seg:.4f},setpts=PTS-STARTPTS,format=yuv420p"),
                            "-c:v", "libx264", "-crf", "23", "-preset", "fast", "-pix_fmt", "yuv420p",
                            "-an", str(clip)], capture_output=True, text=True, timeout=600)
        if r.returncode != 0:
            raise RuntimeError(f"pass1 clip {i}: " + r.stderr[-400:])
        clips.append(str(clip))
    inputs, filters = [], []
    for i, c in enumerate(clips):
        inputs += ["-i", c]
        if i:
            prev = "0:v" if i == 1 else f"x{i - 1}"
            filters.append(f"[{prev}][{i}:v]xfade=transition=fade:duration={XF:.4f}:"
                           f"offset={i * (seg - XF):.4f}[x{i}]")
    out_label = f"x{n - 1}"
    mp4.parent.mkdir(parents=True, exist_ok=True)
    r = subprocess.run([FF, "-y", "-hide_banner", "-loglevel", "error", *inputs,
                        "-filter_complex", ";".join(filters), "-map", f"[{out_label}]",
                        "-c:v", "libx264", "-crf", "23", "-preset", "medium",
                        "-movflags", "+faststart", "-pix_fmt", "yuv420p",
                        "-t", f"{DUR:.3f}", str(mp4)], capture_output=True, text=True, timeout=900)
    import shutil; shutil.rmtree(tmp, ignore_errors=True)
    if r.returncode != 0:
        raise RuntimeError(r.stderr[-600:])
    return mp4.stat().st_size


if __name__ == '__main__':
    sku = sys.argv[1]
    base = Path('/home/user/Shivaa.ecom/cms/images/designs/rings')
    shots = [str(base / f"{sku}_shot_{k}.jpg") for k in ('studio', 'editorial', 'worn', 'gift')]
    missing = [s for s in shots if not Path(s).exists()]
    if missing:
        sys.exit(f"missing shots: {missing}")
    out = base / f"{sku}_video.mp4"
    n = kenburns(shots, out)
    print(f"video OK {sku}: {n/1e6:.2f} MB")
