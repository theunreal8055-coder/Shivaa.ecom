#!/usr/bin/env python3
"""Generate the Shivaa PWA icons (pure Python — no PIL in the sandbox).

Renders a 512x512 emblem: deep-maroon radial field, a gold ring band and a
brilliant-cut diamond with facet lines, using signed-distance blending so the
edges are smooth without supersampling. Writes:
  images/icons/icon-512.png          (manifest "any")
  images/icons/icon-maskable-512.png (safe-zone inset for adaptive icons)
  images/icons/icon-192.png
  images/icons/apple-touch-icon.png  (180)
  images/icons/favicon-32.png
"""
import math
import os
import struct
import zlib

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "images", "icons")

MAROON_HI = (0x5A, 0x16, 0x20)
MAROON_LO = (0x1B, 0x04, 0x08)
GOLD_HI = (0xF6, 0xE3, 0xB4)
GOLD = (0xD9, 0xAF, 0x63)
GOLD_LO = (0xA9, 0x7C, 0x33)
WHITE = (255, 255, 255)


def lerp(a, b, t):
    t = 0.0 if t < 0 else (1.0 if t > 1 else t)
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))


def smooth(e0, e1, x):
    if e0 == e1:
        return 0.0 if x < e0 else 1.0
    t = (x - e0) / (e1 - e0)
    t = 0.0 if t < 0 else (1.0 if t > 1 else t)
    return t * t * (3 - 2 * t)


def seg_dist(px, py, ax, ay, bx, by):
    dx, dy = bx - ax, by - ay
    if dx == 0 and dy == 0:
        return math.hypot(px - ax, py - ay)
    t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)
    t = 0.0 if t < 0 else (1.0 if t > 1 else t)
    return math.hypot(px - (ax + t * dx), py - (ay + t * dy))


def diamond_sdf(x, y, w, h):
    """Signed distance (approx) to the rhombus |x|/w + |y|/h <= 1."""
    v = abs(x) / w + abs(y) / h - 1.0
    scale = min(w, h) / (math.hypot(h, w) or 1.0)
    return v * scale


def poly_sdf(px, py, pts):
    """Signed distance to a polygon (negative inside)."""
    inside = False
    d = 1e9
    n = len(pts)
    for i in range(n):
        ax, ay = pts[i]
        bx, by = pts[(i + 1) % n]
        if (ay > py) != (by > py):
            t = (py - ay) / (by - ay)
            if px < ax + t * (bx - ax):
                inside = not inside
        d = min(d, seg_dist(px, py, ax, ay, bx, by))
    return -d if inside else d


def render(size, maskable=False):
    """Deep-maroon field, gold band, brilliant-cut diamond, one sparkle."""
    px = bytearray()
    pad = 0.17 if maskable else 0.0
    s = size * (1.0 - 2 * pad)
    cx = cy = size / 2.0
    P = lambda x, y: (cx + x * s, cy + y * s)          # relative -> absolute
    ring_r, ring_w = 0.415, 0.020
    tw, ty = 0.105, -0.155                              # table half-width / y
    w, gy = 0.195, -0.045                               # girdle
    culet = 0.215
    crown = [P(-tw, ty), P(tw, ty), P(w, gy), P(-w, gy)]
    pav = [P(-w, gy), P(w, gy), P(0, culet)]
    table_edge = (P(-tw, ty), P(tw, ty))
    facets = [
        (P(-tw, ty), P(-w, gy)), (P(tw, ty), P(w, gy)),
        (P(-tw * 0.45, ty), P(-w * 0.52, gy)), (P(tw * 0.45, ty), P(w * 0.52, gy)),
        (P(0, ty), P(0, gy)),
        (P(-w * 0.52, gy), P(0, culet)), (P(w * 0.52, gy), P(0, culet)),
        (P(-w, gy), P(w, gy)),
    ]
    spx, spy = P(0.135, -0.135)
    for j in range(size):
        y = j + 0.5
        for i in range(size):
            x = i + 0.5
            dx, dy = x - cx, y - cy
            r = math.hypot(dx, dy)
            t = smooth(0.0, s * 0.80, r)
            col = lerp(MAROON_HI, MAROON_LO, t)
            sheen = max(0.0, 1.0 - math.hypot(dx + s * 0.24, dy + s * 0.28) / (s * 0.62))
            col = lerp(col, (0x74, 0x21, 0x2C), sheen * 0.5)
            halo = 1.0 - smooth(s * 0.16, s * 0.40, math.hypot(dx, dy + s * 0.02))
            col = lerp(col, (0x8A, 0x5A, 0x2A), halo * 0.30)
            # ring band with a directional sheen
            band = abs(r - ring_r * s)
            a_band = 1.0 - smooth(ring_w * s * 0.5, ring_w * s * 1.4, band)
            if a_band > 0:
                lit = 0.5 + 0.5 * math.cos(math.atan2(dy, dx) - math.radians(125))
                col = lerp(col, lerp(GOLD_LO, GOLD_HI, 0.22 + 0.78 * lit), a_band)
            # pavilion then crown (crown on top so its shading wins)
            for pts, hi, lo in ((pav, GOLD, GOLD_LO), (crown, GOLD_HI, GOLD)):
                d = poly_sdf(x, y, pts)
                a = 1.0 - smooth(-1.1, 1.1, d)
                if a > 0:
                    shade = smooth(P(0, ty)[1], P(0, gy)[1], y)
                    base = lerp(hi, lo, 0.25 + 0.6 * shade)
                    fx = abs(x - cx) / (w * s)
                    base = lerp(base, GOLD_HI if pts is crown else GOLD_LO,
                                 (0.5 + 0.5 * math.cos(fx * math.pi * 2.2)) * 0.30)
                    col = lerp(col, base, a)
            for k, ((ax, ay), (bx, by)) in enumerate(facets):
                ld = seg_dist(x, y, ax, ay, bx, by)
                a_ln = 1.0 - smooth(0.30, 1.35, ld)
                if a_ln > 0:
                    col = lerp(col, (0x77, 0x52, 0x1E), a_ln * 0.50)
            (tax, tay), (tbx, tby) = table_edge
            ld = seg_dist(x, y, tax, tay, tbx, tby)
            a_ln = 1.0 - smooth(0.30, 1.35, ld)
            if a_ln > 0:
                col = lerp(col, GOLD_HI, a_ln * 0.75)
            # 4-point sparkle
            sd = max(abs(x - spx), abs(y - spy))
            md = min(abs(x - spx), abs(y - spy))
            a_sp = (1.0 - smooth(0.0, s * 0.055, sd)) * (1.0 - smooth(s * 0.006, s * 0.02, md) * 0.72)
            core = 1.0 - smooth(0.0, s * 0.016, math.hypot(x - spx, y - spy))
            if a_sp > 0 or core > 0:
                col = lerp(col, WHITE, min(1.0, a_sp * 0.8 + core))
            col = lerp(col, (0x14, 0x03, 0x06), smooth(s * 0.47, s * 0.60, r) * 0.5)
            # posterize to 5 bits/channel — halves the PNG size, invisible here
            col = tuple((c >> 3) << 3 for c in col)
            px += bytes(col) + b"\xff"
    return bytes(px), size


def write_png(path, rgba, size):
    raw = bytearray()
    stride = size * 4
    for j in range(size):
        raw.append(0)                                   # filter: none
        raw += rgba[j * stride:(j + 1) * stride]
    comp = zlib.compress(bytes(raw), 9)

    def chunk(tag, data):
        c = struct.pack(">I", len(data)) + tag + data
        return c + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    with open(path, "wb") as f:
        f.write(b"\x89PNG\r\n\x1a\n")
        f.write(chunk(b"IHDR", ihdr))
        f.write(chunk(b"IDAT", comp))
        f.write(chunk(b"IEND", b""))


def downscale(rgba, src, dst):
    """Box-filter downscale (nearest-neighbour average over the source block)."""
    out = bytearray()
    ratio = src / dst
    for j in range(dst):
        for i in range(dst):
            r = g = b = a = 0
            n = 0
            for jj in range(int(ratio)):
                for ii in range(int(ratio)):
                    sx = min(src - 1, int(i * ratio) + ii)
                    sy = min(src - 1, int(j * ratio) + jj)
                    o = (sy * src + sx) * 4
                    r += rgba[o]; g += rgba[o + 1]; b += rgba[o + 2]; a += rgba[o + 3]
                    n += 1
            out += bytes((r // n, g // n, b // n, a // n))
    return bytes(out), dst


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    big, n = render(512)
    write_png(os.path.join(OUT, "icon-512.png"), big, 512)
    msk, _ = render(512, maskable=True)
    write_png(os.path.join(OUT, "icon-maskable-512.png"), msk, 512)
    for size, name in ((192, "icon-192.png"), (180, "apple-touch-icon.png"), (32, "favicon-32.png")):
        data, s = downscale(big, 512, size)
        write_png(os.path.join(OUT, name), data, s)
    for f in sorted(os.listdir(OUT)):
        print("  %-26s %7d B" % (f, os.path.getsize(os.path.join(OUT, f))))
