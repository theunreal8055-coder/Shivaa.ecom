"""Clean, number-free price break-up panel used to cover the fake rupee
figures Omni burned into chapter 6. Bars are proportional, no currency values."""
from PIL import Image, ImageDraw, ImageFont
W, H = 540, 410
img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
d = ImageDraw.Draw(img)

def f(sz, bold=True):
    p = "/usr/share/fonts/truetype/dejavu/DejaVuSans%s.ttf" % ("-Bold" if bold else "")
    return ImageFont.truetype(p, sz)

d.rounded_rectangle([0, 0, W-1, H-1], 22, fill=(17, 17, 22, 255), outline=(198, 163, 92, 90), width=2)
rows = [("METAL", 0.86), ("MAKING", 0.34), ("GST", 0.14)]
y = 30
for label, frac in rows:
    d.rounded_rectangle([22, y, W-22, y+82], 14, fill=(26, 26, 33, 255), outline=(198, 163, 92, 70), width=1)
    d.text((40, y+14), label, font=f(26), fill=(238, 238, 242, 255))
    bx0, bx1 = 40, W-58
    d.rounded_rectangle([bx0, y+52, bx1, y+68], 8, fill=(45, 45, 54, 255))
    d.rounded_rectangle([bx0, y+52, bx0+int((bx1-bx0)*frac), y+68], 8, fill=(212, 175, 96, 255))
    y += 96
d.text((26, H-40), "FULL BREAK-UP ON YOUR BILL", font=f(17), fill=(198, 163, 92, 255))
img.save("launch/omni-90s/fix/pricing-panel.png")
print("wrote", img.size)
