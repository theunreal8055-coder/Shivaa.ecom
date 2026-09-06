#!/usr/bin/env python3
"""STAGE 4 · VIDEO — one cinematic clip per design from its 4 shots.

Mode A "kenburns" (DEFAULT, ₹0): ffmpeg slow-zoom/pan over each shot with crossfades,
optional watermark. Works offline, no API keys, batch-safe.
Mode B "kling"/"runway"/"veo": AI generative video from the studio shot (only for
hero designs — costs ~₹40-90 each).

Output: out/{sku}/video.mp4 (H.264, yuv420p, faststart, <10 MB)
Run: python 04_render_video.py --limit 20 [--only SKU] [--mode kenburns|kling]
"""
import argparse, json, os, subprocess, sys, time
from pathlib import Path
from lib_common import setup_logging, load_json, Ledger, LOG

_FFMPEG_FILTERS = None

def _ffmpeg_has(name: str) -> bool:
    global _FFMPEG_FILTERS
    if _FFMPEG_FILTERS is None:
        try:
            r = subprocess.run(["ffmpeg", "-hide_banner", "-filters"],
                               capture_output=True, text=True, timeout=60)
            _FFMPEG_FILTERS = r.stdout
        except Exception:
            _FFMPEG_FILTERS = ""
    return f" {name} " in _FFMPEG_FILTERS

def _watermark_png(text: str, font: str, tmp: Path, w: int, h: int) -> Path | None:
    """Video-sized black PNG with 50%-grey text bottom-right (for blend=screen)."""
    try:
        from PIL import Image, ImageDraw, ImageFont
    except ImportError:
        return None
    try:
        f = ImageFont.truetype(font, 32) if font else ImageFont.load_default()
    except Exception:
        f = ImageFont.load_default()
    img = Image.new("RGB", (w, h), (0, 0, 0))
    tmp_img = Image.new("RGB", (w + 200, 80), (0, 0, 0))
    ImageDraw.Draw(tmp_img).text((4, 4), text, font=f, fill=(128, 128, 128))
    box = tmp_img.getbbox()
    if not box:
        return None
    t = tmp_img.crop(box)
    img.paste(t, (w - 40 - t.width, h - 50 - t.height))
    out = tmp / "watermark.png"
    img.save(out)
    return out

def ffmpeg_kenburns(shots: list, mp4: Path, vcfg: dict):
    """Two-pass slow-zoom/pan cinematic from the 4 shots, crossfaded.
    Pass 1: each still -> own CFR zoompan clip (mp4)   Pass 2: xfade chain -> final.
    Exact offsets: offset_k = k*(seg-xf), seg = (dur + (n-1)*xf)/n  →  final = dur."""
    import tempfile
    dur = float(vcfg.get("duration_s", 10)); fps = int(vcfg.get("fps", 30))
    size = vcfg.get("size", "1080x1080")
    xf = float(vcfg.get("crossfade_s", 0.7))
    n = len(shots); seg = (dur + (n - 1) * xf) / n
    D = int(round(seg * fps)) + 1
    moves = vcfg.get("moves", ["zoom-in", "pan-left", "zoom-out", "pan-right"])
    w, h = size.split("x")
    tmp = Path(tempfile.mkdtemp(prefix="kb_"))
    clips = []
    for i, s in enumerate(shots):
        z0, z1 = (1.0, 1.13) if i % 2 == 0 else (1.13, 1.0)
        step = abs(z1 - z0) / D
        z = f"min(zoom+{step:.6f},{z1})" if z1 > z0 else f"max(zoom-{step:.6f},{z1})"
        move = moves[i % len(moves)]
        if move == "pan-left":    x, y = "if(eq(on,0),0,(iw-iw/zoom)/2)", "(ih-ih/zoom)/2"
        elif move == "pan-right": x, y = "if(eq(on,0),(iw-iw/zoom),(iw-iw/zoom)/2)", "(ih-ih/zoom)/2"
        elif move == "pan-up":    x, y = "(iw-iw/zoom)/2", "if(eq(on,0),(ih-ih/zoom),0)"
        else:                     x, y = "(iw-iw/zoom)/2", "(ih-ih/zoom)/2"
        clip = tmp / f"c{i}.mp4"
        r = subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-loop", "1", "-t", f"{seg:.4f}", "-i", str(s),
                            "-vf", (f"scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h},setsar=1,"
                                    f"zoompan=z='{z}':x='{x}':y='{y}':d={D}:s={size}:fps={fps},"
                                    f"trim=duration={seg:.4f},setpts=PTS-STARTPTS,format=yuv420p"),
                            "-c:v", "libx264", "-crf", str(vcfg.get("crf", 20)), "-preset", "fast", "-pix_fmt", "yuv420p",
                            "-an", str(clip)], capture_output=True, text=True, timeout=600)
        if r.returncode != 0:
            raise RuntimeError(f"pass1 clip {i}: " + r.stderr[-400:])
        clips.append(str(clip))
    # pass 2 — crossfade chain over the CFR clips (+ optional watermark)
    inputs, filters = [], []
    for i, c in enumerate(clips):
        inputs += ["-i", c]
        if i:
            prev = "0:v" if i == 1 else f"x{i - 1}"
            filters.append(f"[{prev}][{i}:v]xfade=transition=fade:duration={xf:.4f}:"
                           f"offset={i * (seg - xf):.4f}[x{i}]")
    out_label = "0:v" if n == 1 else f"x{n - 1}"
    logo_cfg = vcfg.get("logo", "")
    wm = "" if logo_cfg else vcfg.get("watermark", "")
    if n == 1 and not wm and not logo_cfg:  # nothing to crossfade/brand — clip IS the video
        import shutil; shutil.copy2(clips[0], mp4); shutil.rmtree(tmp, ignore_errors=True)
        return mp4.stat().st_size
    if wm:
        font = vcfg.get("font", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf")
        if not Path(font).exists():
            import glob as _g
            cands = (_g.glob("/usr/share/fonts/**/*Bold*.ttf", recursive=True) +
                     _g.glob("/usr/share/fonts/**/*bold*.ttf", recursive=True) +
                     _g.glob("/System/Library/Fonts/*.ttf", recursive=True) +
                     _g.glob("C:/Windows/Fonts/*.ttf"))
            font = cands[0] if cands else ""
        if font and _ffmpeg_has("drawtext"):
            filters.append(f"[{out_label}]drawtext=fontfile={font}:text='{wm}':fontcolor=white@0.5:"
                           f"fontsize=32:x=w-40-tw:y=h-50-th,format=yuv420p[vout]")
            out_label = "vout"
        else:
            # static ffmpeg builds without libfreetype lack drawtext — and this build's
            # overlay drops per-pixel PNG alpha, so bake a same-size black-background
            # PNG with 50%-grey text and additive-blend it (visually = white@0.5 mark).
            png = _watermark_png(wm, font, Path(tmp), int(w), int(h))
            if png and _ffmpeg_has("blend"):
                inputs += ["-loop", "1", "-t", f"{dur:.3f}", "-i", str(png)]
                wi = n  # clips occupy inputs 0..n-1, so the PNG is input n
                filters.append(f"[{out_label}]format=gbrp[mw];[{wi}:v]format=gbrp[ww];"
                               f"[mw][ww]blend=all_mode=screen,format=yuv420p[vout]")
                out_label = "vout"
            else:
                LOG.warning("no font/blend for watermark — skipping")
    if logo_cfg:
        # Brand mark: the Shivaa logo composited into the bottom-right corner.
        try:
            sys.path.insert(0, str(Path(__file__).resolve().parent))
            sys.path.insert(0, str(Path("tools").resolve()))
            from brand_logo import video_logo_png
            png = video_logo_png(int(w), int(h), Path(tmp) / "logo_overlay.png",
                                 width_pct=float(vcfg.get("logo_width_pct", 0.24)))
            inputs += ["-loop", "1", "-t", f"{dur:.3f}", "-i", str(png)]
            li = inputs.count("-i") - 1  # index of the just-added input
            filters.append(f"[{out_label}][{li}:v]overlay=0:0:format=auto,"
                           f"format=yuv420p[vlogo]")
            out_label = "vlogo"
        except Exception as e:  # never fail a render because of branding
            LOG.warning("logo overlay skipped: %s", str(e)[:160])
    mp4.parent.mkdir(parents=True, exist_ok=True)
    r = subprocess.run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", *inputs,
                        "-filter_complex", ";".join(filters), "-map", f"[{out_label}]",
                        "-c:v", "libx264", "-crf", "23", "-preset", "medium",
                        "-movflags", "+faststart", "-pix_fmt", "yuv420p",
                        "-t", f"{dur:.3f}", str(mp4)], capture_output=True, text=True, timeout=600)
    import shutil; shutil.rmtree(tmp, ignore_errors=True)
    if r.returncode != 0:
        raise RuntimeError(r.stderr[-600:])
    return mp4.stat().st_size

def ai_video(cfg, key, prompt, shot_path, mp4: Path):
    import replicate
    client = replicate.Client(api_token=key)
    model = cfg["video"]["model_video"]
    out = client.run(model, input={"prompt": prompt, "image": shot_path, "duration": 5})
    for item in out:
        url = item if isinstance(item, str) else item.get("url", "")
        if url:
            import urllib.request
            urllib.request.urlretrieve(url, mp4)
            return mp4.stat().st_size
    raise RuntimeError("no video returned")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--config", default="config.json")
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--only", default="")
    ap.add_argument("--mode", default="", help="kenburns|kling|runway|veo (default: config)")
    a = ap.parse_args()
    cfg = load_json(a.config)
    work = Path(cfg["paths"]["work_dir"]); out = Path(cfg["paths"]["out_dir"])
    LOG = setup_logging(work)
    vcfg = cfg["video"]
    mode = a.mode or vcfg.get("mode", "kenburns")
    designs = load_json(work / "designs.json")
    if a.only: designs = [d for d in designs if d["sku"] in a.only.split(",")]
    if a.limit: designs = designs[:a.limit]
    ledger = Ledger(work / "ledger_video.csv", ["id", "sku", "mode", "status", "bytes", "ts"])
    shots_order = [s["key"] for s in cfg["photoshoot"]["shots"]]
    for d in designs:
        mp4 = out / d["sku"] / "video.mp4"
        if ledger.done(d["sku"]):
            LOG.info("skip (done) %s", d["sku"]); continue
        shots = []
        for k in shots_order:
            s = out / d["sku"] / f"shot_{k}.jpg"
            master = s.parent / ".orig" / s.name   # unbranded master, if any
            if master.exists():
                shots.append(master)
            elif s.exists():
                shots.append(s)
        if not shots:
            LOG.warning("no shots for %s", d["sku"]); continue
        try:
            if mode == "kenburns":
                n = ffmpeg_kenburns([str(s) for s in shots], mp4, vcfg["kenburns"])
            else:
                key = os.environ.get(vcfg.get("api_key_env", "REPLICATE_API_TOKEN"), "")
                n = ai_video(cfg, key, vcfg["ai_prompt"], str(shots[0]), mp4)
            ledger.set(d["sku"], sku=d["sku"], mode=mode, status="done", bytes=n, ts=time.time())
            LOG.info("OK %s (%s, %.1f MB)", d["sku"], mode, n / 1e6)
        except Exception as e:
            ledger.set(d["sku"], sku=d["sku"], mode=mode, status="fail", bytes=0, ts=time.time())
            LOG.error("FAIL %s: %s", d["sku"], str(e)[:200])
            LOG.debug(str(e), exc_info=True)
    print(f"\nVIDEO done — {work/'ledger_video.csv'}")

if __name__ == "__main__":
    main()
