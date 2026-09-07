#!/usr/bin/env python3
"""Build clean (green-tag-removed) reference crops for PGS ring SKUs.

Two flavours per SKU: standard (28% margin) and tight (12% margin, 1400px).
Output: /home/user/work_shots/refs/{SKU}_ref.jpg and {SKU}_ref_tight.jpg
"""
import sys
from pathlib import Path
from PIL import Image, ImageFilter
import numpy as np

RINGS = Path('/home/user/Shivaa.ecom/cms/images/designs/rings')
OUT = Path('/home/user/work_shots/refs')


def build(sku: str):
    OUT.mkdir(parents=True, exist_ok=True)
    for margin, suffix in ((0.28, ''), (0.12, '_tight')):
        im = Image.open(RINGS / f'{sku}.jpg').convert('RGB')
        a = np.asarray(im).astype(int)
        R, G, B = a[:, :, 0], a[:, :, 1], a[:, :, 2]
        gold = (R > 130) & (G > 90) & (R > B + 45) & (G > B + 10)
        ys, xs = np.where(gold)
        x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
        mx, my = int((x1 - x0) * margin), int((y1 - y0) * margin)
        c = im.crop((max(0, x0 - mx), max(0, y0 - my), min(im.size[0], x1 + mx), min(im.size[1], y1 + my)))
        target = 1300 if suffix == '' else 1400
        if max(c.size) < target:
            f = target / max(c.size)
            c = c.resize((int(c.size[0] * f), int(c.size[1] * f)), Image.LANCZOS)
        ca = np.asarray(c).astype(int)
        R, G, B = ca[:, :, 0], ca[:, :, 1], ca[:, :, 2]
        green = (G > R + 18) & (G > B + 18) & (G > 110)
        gm = Image.fromarray((green * 255).astype('uint8')).filter(ImageFilter.MaxFilter(7))
        gmask = np.asarray(gm) > 0
        out = ca.copy()
        for r in range(ca.shape[0]):
            m = gmask[r]
            if m.any():
                nm = ~m
                fill = ca[r][nm].mean(axis=0) if nm.sum() > 20 else np.array([235, 235, 235])
                out[r][m] = fill
        res = Image.fromarray(out.astype('uint8'))
        soft = res.filter(ImageFilter.GaussianBlur(6))
        sm = Image.fromarray((gmask * 255).astype('uint8')).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(4))
        res = Image.composite(soft, res, sm)
        res.save(OUT / f'{sku}_ref{suffix}.jpg', quality=94 if suffix == '' else 95)
    return 'ok'


if __name__ == '__main__':
    for sku in sys.argv[1:]:
        build(sku)
        print(sku, 'refs ok')
