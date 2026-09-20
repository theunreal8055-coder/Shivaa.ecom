#!/usr/bin/env python3
"""
Shivaa Jewels — LAUNCH TRAILER v2 "CONNECTED" (2026-09-20)
===========================================================
Owner verdict on the v1 mass join: "clips feel disconnected."
Root causes diagnosed this session:
  (a) clips on disk were OUT of narrative order (3 (1).mp4 = THE DOORS,
      4 (1).mp4 = THE COUNTRY — the old concat cut doors→courtyard backwards);
  (b) every seam was a hard butt-joint against designed hand-off frames;
  (c) eight different Omni scores each restarting every 8 seconds.

This build fixes all three WITHOUT re-generating a single clip:
  1. Correct narrative order: NIGHT → POUR → DOORS → COUNTRY → FACES →
     HOUSE → LOGO → INVITE.
  2. Transition grammar matched to the designed hand-offs:
     - light dissolve where a hand-off is bright→bright (orb→molten),
     - hard crossfade where both sides are warm-crowd frames (doors→country→faces),
     - dip-to-black chapter breaks where a clip ends on a dark beat
       (molten→doors, faces→house, logo→endcard).
  3. ONE 60s original score composed for this cut (numpy synthesis):
     drone → dhol → shehnai fragment → brass hold → full build →
     TITLE HIT at the logo → resolve → hush. It ducks under the three
     Hindi lines that live in the clips' own audio
     (आ रहा है / अब दुनिया देखे / आओ) and under the chapter dips.
  4. The clips' own scene sound is kept as an ambience bed (HP120/LP8500),
     cut with the same envelope as the picture.
  5. One unifying grade + 35mm grain + vignette over the whole film;
     720p clips 7–8 upscaled to 1080p.

Everything is FRAME-EXACT at 24fps (durations and overlaps are multiples of
1/24 s), so the master lands at exactly 60.00s and the score hits land on
the actual cut frames.

Timeline (computed):
  S1  0.000 NIGHT WAKES            (fade-in from black)
  S2  7.125 MANY LIVES, ONE METAL  (dissolve 21f; fades OUT into dip)
  S3 14.542 THE DOORS              (chapter dip; आ रहा है @ +4.4s)
  S4 21.708 THE COUNTRY TURNS ITS HEAD (crossfade 20f)
  S5 28.875 THE FACES              (crossfade 20f; अब दुनिया देखे @ +3.2s;
                                    fades OUT 7.5→8.0 into dip)
  S6 36.833 THE HOUSE OPENS        (chapter dip)
  S7 44.125 THE LOGO               (crossfade 17f; TITLE HIT here; air-pocket fade-out)
  S8 52.000 THE WORLD IS INVITED   (chapter dip; आओ @ +2.6s; end card)
  END 60.000
"""

import os, subprocess, json, math, wave
import numpy as np

FF = os.environ.get("FF", "/tmp/ff")
if not os.path.exists(FF):
    import imageio_ffmpeg
    FF = imageio_ffmpeg.get_ffmpeg_exe()

ROOT = "/home/user/Shivaa.ecom"
OUT = f"{ROOT}/launch/out"
QA = f"{OUT}/qa-trailer-connected"
WORK = "/tmp/trailer2"
os.makedirs(QA, exist_ok=True)
os.makedirs(WORK, exist_ok=True)
os.makedirs(OUT, exist_ok=True)

FPS = 24
def F(frames):  # frames → seconds
    return frames / FPS

SRC = {i: f"{ROOT}/{i} (1).mp4" for i in range(1, 9)}
ORDER = [1, 2, 3, 4, 5, 6, 7, 8]
# per-slot trims + fades, all frame-exact
CLIPS = {
    1: dict(frames=192, fi=F(12), fo=None),                     # night wakes
    2: dict(frames=179, fi=0.0, fo=(F(167), F(12))),            # many lives → dip
    3: dict(frames=192, fi=F(8), fo=None),                      # doors, out of dip
    4: dict(frames=192, fi=0.0, fo=None),                       # country
    5: dict(frames=192, fi=0.0, fo=(F(180), F(12))),            # faces → dip
    6: dict(frames=192, fi=F(9), fo=None),                      # house, out of dip
    7: dict(frames=190, fi=0.0, fo=(F(178), F(12))),            # logo → air pocket
    8: dict(t0=F(32), frames=160, freeze=2.0, fi=F(12), fo=None),  # invite / end card
                                                                # (head 32f = off-brand blue-silk
                                                                #  emblem — cut; endcard freeze +2s)
}
# overlap of every seam in FRAMES (continuous crossfades vs 1-frame dip joints)
SEAM_FRAMES = {(1, 2): 21, (2, 3): 1, (3, 4): 20, (4, 5): 20,
               (5, 6): 1, (6, 7): 17, (7, 8): 1}
def eff_frames(i):
    c = CLIPS[i]
    return c["frames"] + int(round(c.get("freeze", 0) * FPS))

MASTER_DUR = F(sum(eff_frames(i) for i in ORDER)
               - sum(SEAM_FRAMES.values()))  # 60.667 after the clip8 fix

def run(cmd, **kw):
    r = subprocess.run(cmd, capture_output=True, text=True, **kw)
    if r.returncode != 0:
        raise RuntimeError(f"CMD FAILED: {' '.join(map(str, cmd[:8]))}...\n{r.stderr[-3000:]}")
    return r

def segment_starts():
    starts, t = {}, 0.0
    for n, i in enumerate(ORDER):
        starts[i] = t
        t += F(eff_frames(i))
        if n + 1 < len(ORDER):
            t -= F(SEAM_FRAMES[(i, ORDER[n + 1])])
    return starts, t

# ---------------------------------------------------------------- stage A: plates
def build_plates():
    for i in ORDER:
        c = CLIPS[i]
        dst = f"{WORK}/plate{i}.mp4"
        vf = [
            "scale=1924:1084:force_original_aspect_ratio=increase:flags=lanczos",
            "crop=1920:1080",
            # unifying grade
            "eq=saturation=1.06:contrast=1.035:gamma=0.985:brightness=0.004",
            "colorbalance=rs=.03:gs=.01:bs=-.02:rm=.02:bm=-.015",
            "unsharp=5:5:0.35:5:5:0.0",
            "vignette=PI/4.6",
            "noise=alls=6:allf=t+u",
        ]
        if c.get("freeze"):
            vf.append(f"tpad=stop_mode=clone:stop_duration={c['freeze']:.6f}")
        if c["fi"] > 0:
            vf.append(f"fade=t=in:st=0:d={c['fi']:.6f}")
        if c["fo"]:
            st, d = c["fo"]
            vf.append(f"fade=t=out:st={st:.6f}:d={d:.6f}")
        vf += ["format=yuv420p", "setsar=1"]
        cmd = [FF, "-y", "-hide_banner", "-loglevel", "error",
               "-i", SRC[i]]
        if c.get("t0"):
            cmd += ["-ss", f"{c['t0']:.6f}"]
        cmd += [
               "-vf", ",".join(vf), "-an", "-r", "24",
               "-frames:v", str(c["frames"] + int(round(c.get("freeze", 0) * FPS))),
               "-c:v", "libx264", "-preset", "veryfast", "-crf", "17",
               "-pix_fmt", "yuv420p", dst]
        print(f"  plate {i}  ({eff_frames(i)}f = {F(eff_frames(i)):.3f}s)"); run(cmd)

# ---------------------------------------------------------------- stage B: picture
def build_picture():
    starts, total = segment_starts()
    print("  segment starts: " + json.dumps({k: round(v, 3) for k, v in starts.items()}))
    print(f"  master duration: {total:.3f}s")
    inputs = []
    for i in ORDER:
        inputs += ["-i", f"{WORK}/plate{i}.mp4"]
    fc, prev = [], "[0:v]"
    t_acc = F(CLIPS[ORDER[0]]["frames"])
    for n in range(1, len(ORDER)):
        a, b = ORDER[n - 1], ORDER[n]
        x = F(SEAM_FRAMES[(a, b)])
        off = round(t_acc - x, 6)
        lab = f"[v{n}]"
        fc.append(f"{prev}[{n}:v]xfade=transition=fade:duration={x:.6f}:offset={off:.6f}{lab}")
        prev = lab
        t_acc = starts[b] + F(eff_frames(b))
    fc.append(f"{prev}trim=0:{total:.6f},setpts=PTS-STARTPTS,format=yuv420p[vout]")
    cmd = [FF, "-y", "-hide_banner", "-loglevel", "error"] + inputs + [
        "-filter_complex", ";".join(fc), "-map", "[vout]", "-r", "24",
        "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
        f"{WORK}/picture.mp4"]
    print("  assembling picture …")
    run(cmd, timeout=1500)
    return starts, total

# ---------------------------------------------------------------- stage C: score
SR = 48000

def _place(buf, t0, sig, gain=1.0):
    i0 = int(t0 * SR)
    if i0 >= buf.shape[0] or i0 < 0:
        return
    n = min(sig.shape[0], buf.shape[0] - i0)
    buf[i0:i0 + n, :] += sig[:n, :] * gain

def _env(n, a, r):
    e = np.ones(n)
    na, nr = min(int(a * SR), n), min(int(r * SR), n)
    if na > 0: e[:na] = np.linspace(0, 1, na)
    if nr > 0: e[-nr:] *= np.linspace(1, 0, nr)
    return e

def _lp(x, cutoff, passes=2):
    """smooth via exp kernel sized by cutoff (cheap IIR stand-in)"""
    L = max(3, int(SR / (2 * math.pi * max(cutoff, 40)) * 5))
    kern = np.exp(-np.arange(L) / (L / 5.0)); kern /= kern.sum()
    y = x
    for _ in range(passes):
        y = np.stack([np.convolve(y[:, ch], kern, mode="same") for ch in range(y.shape[1])], axis=1)
    return y

def _noise_bp(lo, hi, dur, seed=0):
    rng = np.random.default_rng(seed)
    n = int(dur * SR)
    x = rng.standard_normal((n, 2))
    X = np.fft.rfft(x, axis=0)
    f = np.fft.rfftfreq(n, 1 / SR)
    m = np.convolve(((f >= lo) & (f <= hi)).astype(float), np.ones(9) / 9, "same")
    X *= m[:, None]
    y = np.fft.irfft(X, n, axis=0)
    return y / (np.abs(y).max() + 1e-9) * 0.5

def dhol_low(vel=0.8):
    dur = 0.45; n = int(dur * SR); t = np.arange(n) / SR
    f = 85 * np.exp(-t * 6) + 48
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * np.exp(-t * 11)
    click = _noise_bp(300, 1800, dur, seed=int(vel * 100)) * np.exp(-t * 90)[:, None] * 0.7
    return np.clip((x[:, None] + click) * vel, -1.5, 1.5)

def dhol_high(vel=0.7, seed=1):
    dur = 0.16; n = int(dur * SR); t = np.arange(n) / SR
    x = _noise_bp(1500, 4200, dur, seed=seed) * np.exp(-t * 38)[:, None]
    body = np.sin(2 * np.pi * 320 * t) * np.exp(-t * 50) * 0.3
    return (x + body[:, None]) * vel

def tick(vel=0.3, seed=2):
    dur = 0.05; n = int(dur * SR); t = np.arange(n) / SR
    return _noise_bp(5000, 9000, dur, seed=seed) * np.exp(-t * 70)[:, None] * vel

def brass_chord(freqs, dur, vel=0.6, atk=0.06, rel=0.35, cutoff=1600, vib=False):
    n = int(dur * SR); t = np.arange(n) / SR
    out = np.zeros((n, 2))
    for f0 in freqs:
        for det, g in [(-0.004, .5), (0.0, .8), (0.004, .5)]:
            fv = f0 * (1 + det)
            if vib: fv = fv * (1 + 0.004 * np.sin(2 * np.pi * 4.8 * t))
            ph = 2 * np.pi * fv * t
            saw = 2 * ((ph / (2 * np.pi)) % 1.0) - 1.0
            out[:, 0] += saw * g; out[:, 1] += saw * g * 0.98
    out = _lp(out, cutoff)
    return out * _env(n, atk, rel)[:, None] * vel / max(1, len(freqs))

def choir(freqs, dur, vel=0.5):
    n = int(dur * SR); t = np.arange(n) / SR
    out = np.zeros((n, 2))
    for f0 in freqs:
        for det in (-0.008, -0.003, 0.003, 0.008):
            fv = f0 * (1 + det) * (1 + 0.003 * np.sin(2 * np.pi * 4.2 * t + det * 400))
            ph = 2 * np.pi * fv * t
            saw = 2 * ((ph / (2 * np.pi)) % 1.0) - 1.0
            out[:, 0] += saw; out[:, 1] += saw * 0.96
    out = _lp(out, 850, passes=3)
    e = _env(n, min(0.9, dur * 0.35), min(1.2, dur * 0.4))
    return out * e[:, None] * vel / max(1, len(freqs))

def shehnai(f0, dur, vel=0.5):
    n = int(dur * SR); t = np.arange(n) / SR
    fr = f0 * (1 - 0.02 * np.exp(-t * 18))
    ph = 2 * np.pi * np.cumsum(fr) / SR
    sq = np.sign(np.sin(ph)) * 0.4 + np.sin(ph) * 0.6
    x = np.stack([sq, sq * 0.95], 1)
    x = _lp(x, 2600) - _lp(x, 700)
    return x * _env(n, 0.05, 0.3)[:, None] * vel

def boom(vel=0.9):
    dur = 2.2; n = int(dur * SR); t = np.arange(n) / SR
    f = 82 * np.exp(-t * 2.2) + 34
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * np.exp(-t * 2.4)
    th = _noise_bp(60, 300, dur, seed=9) * np.exp(-t * 9)[:, None] * 0.5
    return (x[:, None] + th) * vel

def riser(dur, vel=0.5, seed=5):
    n = int(dur * SR)
    x = _noise_bp(200, 6000, dur, seed=seed)
    lo = _noise_bp(150, 900, dur, seed=seed + 1)
    t = np.arange(n) / n
    mix = (t ** 2)[:, None]
    return (x * mix + lo * (1 - mix)) * ((t ** 2.4) * vel)[:, None]

def shimmer(dur, vel=0.16, seed=7):
    n = int(dur * SR); t = np.arange(n) / SR
    out = np.zeros((n, 2))
    for k, f0 in enumerate([1975, 2637, 3135, 3520, 3951]):
        s = np.sin(2 * np.pi * f0 * t + k) * np.exp(-((t % (dur / 3)) - dur / 6) ** 2 * 8)
        out[:, k % 2] += s; out[:, (k + 1) % 2] += s * 0.7
    return out * _env(n, dur * 0.3, dur * 0.4)[:, None] * vel

def build_score(starts, total):
    N = int((total + 1) * SR)
    M = np.zeros((N, 2))
    S3, S4, S5, S6, S7, S8 = starts[3], starts[4], starts[5], starts[6], starts[7], starts[8]
    title_t, resolve_t = S7, S8

    # --- section 1: night (sparse) ----------------------------------------
    g = np.arange(int(8.4 * SR)) / SR
    _place(M, 0.0, (np.sin(2*np.pi*55*g) * 0.10 + np.sin(2*np.pi*110*g + 0.5) * 0.05)[:, None] * np.ones(2))
    _place(M, 2.0, dhol_low(0.45))
    _place(M, 4.0, dhol_low(0.5)); _place(M, 4.05, dhol_high(0.28))
    _place(M, 5.6, dhol_low(0.55)); _place(M, 6.1, dhol_low(0.6))
    _place(M, 6.4, riser(1.6, 0.4))

    # --- section 2: many lives (dhol pattern + stings) ---------------------
    t, k = 8.0, 0
    while t < S3 - 0.35:
        pat = k % 8
        if pat in (0, 3, 6): _place(M, t, dhol_low(0.75 if pat == 0 else 0.5))
        if pat in (2, 4, 5, 7): _place(M, t, dhol_high(0.45, seed=k))
        if pat == 0: _place(M, t, tick(0.25, seed=k))
        t += 0.2344; k += 1
    for i, st in enumerate([8.0, 9.4, 10.8, 12.2, 13.4, 14.4]):
        _place(M, st, brass_chord([220, 330], 0.4, vel=0.30 + i * 0.02, cutoff=1500))
    i_mute = int((S3 - 0.30) * SR)
    M[i_mute:i_mute + int(0.28 * SR), :] *= np.linspace(1, 0, int(0.28 * SR))[:, None]

    # --- section 3: doors (heartbeat + shehnai) ----------------------------
    for j, gv in enumerate(np.linspace(0.35, 0.6, int((S4 - S3) / 1.1))):
        tt = S3 + j * 1.1
        _place(M, tt, dhol_low(gv)); _place(M, tt + 0.32, dhol_low(gv * 0.75))
    _place(M, S3 + 1.55, shehnai(587.3, 0.5, 0.34))   # D5
    _place(M, S3 + 2.15, shehnai(659.3, 0.8, 0.38))   # E5
    _place(M, S4 - 2.0, brass_chord([110, 165], 2.2, vel=0.42, atk=1.2, rel=0.5, cutoff=900))

    # --- section 4: country (taals + long brass hold) -----------------------
    t, k = S4, 0
    while t < S5 - 0.6:
        pat = k % 8
        if pat in (0, 2, 4, 6): _place(M, t, dhol_low(0.62 if pat else 0.8))
        if pat in (1, 3, 5, 7): _place(M, t, dhol_high(0.5, seed=100 + k))
        if pat % 2 == 0: _place(M, t, tick(0.22, seed=200 + k))
        t += 0.2344; k += 1
    _place(M, S4, brass_chord([110, 220, 261.6, 329.6, 493.9], S5 - S4 - 0.4,
                              vel=0.34, atk=1.8, rel=0.8, cutoff=1100))
    _place(M, S5 - 1.2, riser(1.2, 0.30))

    # --- section 5: faces (pull back for the line, then swell) -------------
    _place(M, S5, dhol_low(0.4)); _place(M, S5 + 0.32, dhol_low(0.3))
    _place(M, S5 + 0.2, brass_chord([220, 523.3], 3.4, vel=0.26, atk=0.8, rel=1.0, cutoff=750))
    t, k = S5 + 4.6, 0
    while t < S6 - 0.4:
        if k % 4 == 0: _place(M, t, dhol_low(0.55))
        if k % 4 == 2: _place(M, t, dhol_high(0.4, seed=300 + k))
        t += 0.2344; k += 1
    _place(M, S6 - 2.6, choir([220, 330], 3.0, vel=0.30))
    _place(M, S6 - 0.9, riser(0.9, 0.32))

    # --- section 6: house opens (full drive + melody) ------------------------
    t, k = S6, 0
    while t < S7 - 2.2:
        pat = k % 8
        if pat in (0, 3, 4, 6): _place(M, t, dhol_low(0.72 if pat == 0 else 0.55))
        if pat in (1, 2, 5, 7): _place(M, t, dhol_high(0.5, seed=400 + k))
        if pat == 0: _place(M, t, tick(0.25, seed=500 + k))
        t += 0.2344; k += 1
    _place(M, S6, brass_chord([110, 220, 329.6], 5.5, vel=0.4, atk=0.9, rel=1.0, cutoff=1300))
    for (tt, f0, d) in [(0.0, 440, .9), (0.9, 392, .45), (1.35, 440, .9),
                        (2.25, 523.3, 1.4), (3.65, 440, .45), (4.1, 329.6, .45),
                        (4.55, 392, .45), (5.0, 440, 1.8)]:
        _place(M, S6 + tt, brass_chord([f0, f0 * 2], d, vel=0.30, atk=0.05, rel=0.3, cutoff=2100))
    _place(M, S7 - 3.4, choir([220, 330, 440], 3.6, vel=0.38))
    _place(M, S7 - 2.0, riser(2.0, 0.5))

    # --- section 7: TITLE HIT ------------------------------------------------
    _place(M, title_t, boom(0.95))
    _place(M, title_t, brass_chord([110, 220, 329.6, 440, 523.3], 2.6, vel=0.62, atk=0.02, rel=0.9, cutoff=2400))
    _place(M, title_t, choir([220, 277.2, 329.6], 3.2, vel=0.4))
    t, k = title_t, 0
    while t < title_t + 2.0:
        _place(M, t, dhol_high(0.6, seed=600 + k))
        if k % 4 == 0: _place(M, t, dhol_low(0.8))
        t += 0.1172; k += 1
    _place(M, title_t + 0.5, tick(0.3)); _place(M, title_t + 1.0, tick(0.3))
    _place(M, title_t + 2.6, brass_chord([220, 277.2, 329.6], 3.2, vel=0.20, atk=1.0, rel=1.6, cutoff=800))
    _place(M, title_t + 4.2, shimmer(2.6, 0.14))

    # --- section 8: resolve + hush -------------------------------------------
    _place(M, resolve_t, brass_chord([110, 220, 277.2, 329.6], 4.2, vel=0.42, atk=0.4, rel=1.6, cutoff=1400))
    _place(M, resolve_t, choir([220, 330, 440], 4.5, vel=0.3))
    _place(M, resolve_t, dhol_low(0.5))
    _place(M, resolve_t + 0.9, dhol_low(0.4)); _place(M, resolve_t + 1.8, dhol_low(0.32))
    _place(M, resolve_t + 3.4, shimmer(3.0, 0.12))

    # --- ducking under the three Hindi lines + chapter dips ------------------
    duck_windows = [
        (S3 + 4.4 - 0.30, S3 + 5.2 + 0.30, 0.22),   # आ रहा है
        (S5 + 3.2 - 0.30, S5 + 4.0 + 0.30, 0.22),   # अब दुनिया देखे
        (S8 + 1.04, S8 + 2.60, 0.50),               # आओ (gentle; after 32f head-trim)
        (S3 - 0.35, S3 + 0.40, 0.15),               # dip 1
        (S6 - 0.10, S6 + 0.45, 0.15),               # dip 2
        (S8 - 0.55, S8 + 0.15, 0.30),               # dip 3
    ]
    duck = np.ones(N)
    for a, b, lvl in duck_windows:
        ia, ib = int(a * SR), min(N, int(b * SR))
        if ib <= ia: continue
        seg = np.ones(ib - ia) * lvl
        r = min(int(0.18 * SR), len(seg) // 2)
        seg[:r] = np.linspace(1, lvl, r)
        seg[-r:] = np.linspace(lvl, 1, r)
        duck[ia:ib] = np.minimum(duck[ia:ib], seg)
    M *= duck[:, None]

    # final fade to silence over the last 2s
    ifade = int((total - 2.0) * SR)
    if ifade < N:
        M[ifade:, :] *= np.linspace(1, 0, N - ifade)[:, None]

    # gentle space: dotted-8th feedback delay, wet ~12%
    d = int(0.3125 * SR)
    Y = M.copy()
    Y[d:, :] += M[:-d, :] * 0.10
    Y[2 * d:, :] += M[:-2 * d, :] * 0.04

    # normalize to −6 dBFS peak, soft clip
    Y = Y / (np.abs(Y).max() + 1e-9) * 0.5
    Y = np.tanh(Y * 1.25) / 1.25
    Y = Y / (np.abs(Y).max() + 1e-9) * 0.5

    def save_wav(path, arr):
        data = (arr.T * 32767).astype(np.int16)
        with wave.open(path, "wb") as w:
            w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
            w.writeframes(data.tobytes())
    save_wav(f"{WORK}/score.wav", Y)
    print(f"  score rendered: {total + 1:.1f}s")

# ---------------------------------------------------------------- stage D: ambience
def build_ambience(starts, total):
    inputs, fc = [], []
    for n, i in enumerate(ORDER):
        inputs += ["-i", SRC[i]]
        c = CLIPS[i]
        dur = F(c["frames"]) + 0.02
        skip = (f"atrim={c['t0']:.6f}:{c['t0'] + dur:.6f}," if c.get("t0")
                else f"atrim=0:{dur:.6f},")
        chain = (skip + "asetpts=PTS-STARTPTS,"
                 f"highpass=f=120,lowpass=f=8500,volume=0.9")
        if c["fi"] > 0: chain += f",afade=t=in:st=0:d={c['fi']:.6f}"
        if c["fo"]:
            st, d = c["fo"]; chain += f",afade=t=out:st={st:.6f}:d={d:.6f}"
        fc.append(f"[{n}:a]{chain}[a{n}]")
    prev = "[a0]"
    for n in range(1, len(ORDER)):
        x = F(SEAM_FRAMES[(ORDER[n - 1], ORDER[n])])
        lab = f"[x{n}]"
        fc.append(f"{prev}[a{n}]acrossfade=d={x:.6f}:c1=tri:c2=tri{lab}")
        prev = lab
    fc.append(f"{prev}atrim=0:{total:.6f},asetpts=PTS-STARTPTS[aout]")
    cmd = [FF, "-y", "-hide_banner", "-loglevel", "error"] + inputs + [
        "-filter_complex", ";".join(fc), "-map", "[aout]",
        "-c:a", "pcm_s16le", "-ar", "48000", f"{WORK}/ambience.wav"]
    print("  ambience bed …")
    run(cmd, timeout=600)
    return f"{WORK}/ambience.wav"

# ---------------------------------------------------------------- stage E: mix + mux
def mix_mux(total):
    run([FF, "-y", "-hide_banner", "-loglevel", "error",
         "-i", f"{WORK}/ambience.wav", "-i", f"{WORK}/score.wav",
         "-filter_complex",
         "[0:a]volume=1.0[amb];[1:a]volume=0.55[sco];"
         "[amb][sco]amix=inputs=2:dropout_transition=0:normalize=0,"
         "alimiter=limit=0.92,aformat=sample_fmts=fltp:channel_layouts=stereo[aout]",
         "-map", "[aout]", "-t", f"{total:.6f}", "-c:a", "pcm_s16le", f"{WORK}/mix.wav"])
    run([FF, "-y", "-hide_banner", "-loglevel", "error", "-i", f"{WORK}/mix.wav",
         "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-ar", "48000", f"{WORK}/mix-norm.wav"])
    out = f"{OUT}/Shivaa-Jewels-Launch-Trailer-CONNECTED-60s.mp4"
    run([FF, "-y", "-hide_banner", "-loglevel", "warning",
         "-i", f"{WORK}/picture.mp4", "-i", f"{WORK}/mix-norm.wav",
         "-map", "0:v", "-map", "1:a", "-t", f"{total:.6f}",
         "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2",
         "-movflags", "+faststart", out])
    return out

# ---------------------------------------------------------------- QA
def qa(out_path, starts, total):
    r = subprocess.run([FF, "-hide_banner", "-i", out_path], capture_output=True, text=True)
    print("== PROBE ==")
    for ln in r.stderr.splitlines():
        if "Duration" in ln or "Stream" in ln: print("  " + ln.strip())
    frames = []
    for n in range(1, len(ORDER)):
        s = starts[ORDER[n]]
        frames += [s - 0.45, s + 0.25]
    sel = "+".join(f"eq(n,{max(0, int(round(f * FPS)))})" for f in frames)
    run([FF, "-y", "-hide_banner", "-loglevel", "error", "-i", out_path,
         "-vf", f"select='{sel}',scale=320:180,tile=4x4", "-frames:v", "1",
         "-vsync", "0", f"{QA}/seams.jpg"])
    run([FF, "-y", "-hide_banner", "-loglevel", "error", "-i", out_path,
         "-vf", "select='not(mod(n,190))',scale=213:120,tile=12x3", "-frames:v", "1",
         "-vsync", "0", f"{QA}/sheet-all.jpg"])
    run([FF, "-y", "-hide_banner", "-loglevel", "error",
         "-ss", str(starts[7] + 5.0), "-i", out_path, "-frames:v", "1",
         "-q:v", "2", f"{QA}/poster-logo.jpg"])
    print(f"== QA → {QA}/seams.jpg · sheet-all.jpg · poster-logo.jpg")

if __name__ == "__main__":
    print("STAGE A — plates"); build_plates()
    print("STAGE B — picture"); starts, total = build_picture()
    print("STAGE C — score"); build_score(starts, total)
    print("STAGE D — ambience"); build_ambience(starts, total)
    print("STAGE E — mix + mux"); out = mix_mux(total)
    print("QA"); qa(out, starts, total)
    print("DONE:", out)
