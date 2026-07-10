"""Generate an artsy 'glitch art' cover for the simplified MATHLIB5 paper."""
import os, random, math
from PIL import Image, ImageDraw, ImageFilter, ImageFont

random.seed(0x5A17)
HERE = os.path.dirname(os.path.abspath(__file__))
FONT_DIR = r"C:\Users\jessi\AppData\Local\Programs\Python\Python312\Lib\site-packages\reportlab\fonts"
REG = os.path.join(FONT_DIR, "Vera.ttf")
BOLD = os.path.join(FONT_DIR, "VeraBd.ttf")

W, H = 1700, 2200
SK_DARK = (26, 26, 46)
SK_MID = (22, 33, 62)
SK_ACCENT = (233, 69, 96)
SK_MINT = (64, 200, 180)
SK_BLUE = (15, 52, 96)

img = Image.new("RGB", (W, H), SK_DARK)
px = img.load()

# 1. Diagonal navy gradient
for y in range(H):
    t = y / H
    r = int(SK_DARK[0] + (SK_BLUE[0] - SK_DARK[0]) * t)
    g = int(SK_DARK[1] + (SK_BLUE[1] - SK_DARK[1]) * t)
    b = int(SK_DARK[2] + (SK_BLUE[2] - SK_DARK[2]) * t)
    for x in range(W):
        px[x, y] = (r, g, b)

# 2. Chromatic-aberration title (RGB split)
def draw_text_split(draw, xy, text, font, color, shift=10):
    x, y = xy
    # red
    draw.text((x - shift, y), text, font=font, fill=(color[0], 0, 0))
    # green
    draw.text((x + shift, y), text, font=font, fill=(0, color[1], 0))
    # blue
    draw.text((x, y + shift // 2), text, font=font, fill=(0, 0, color[2]))

title_font = ImageFont.truetype(BOLD, 230)
sub_font = ImageFont.truetype(REG, 46)
small_font = ImageFont.truetype(REG, 34)

d = ImageDraw.Draw(img)
title = "MATHLIB5"
tw = d.textlength(title, font=title_font)
tx = (W - tw) // 2
draw_text_split(d, (tx, 540), title, title_font, SK_ACCENT, shift=14)

sub = "An Immutable System of Safety Boundaries"
sw = d.textlength(sub, font=sub_font)
d.text(((W - sw) // 2, 820), sub, font=sub_font, fill=(235, 235, 245))
sub2 = "for Verified Symbolic Compute"
sw2 = d.textlength(sub2, font=sub_font)
d.text(((W - sw2) // 2, 884), sub2, font=sub_font, fill=(235, 235, 245))

# 3. Glitch slice displacement (horizontal bands shifted)
src = img.copy()
bands = 26
for _ in range(bands):
    by = random.randint(0, H - 120)
    bh = random.randint(20, 110)
    shift = random.randint(-90, 90)
    crop = src.crop((0, by, W, by + bh))
    img.paste(crop, (shift, by))

# 4. Data-mosh color blocks
for _ in range(40):
    bx = random.randint(0, W - 200)
    by = random.randint(0, H - 60)
    bw = random.randint(40, 320)
    bh = random.randint(8, 40)
    col = random.choice([SK_ACCENT, SK_MINT, SK_BLUE, (240, 240, 250)])
    alpha = random.randint(40, 150)
    overlay = Image.new("RGB", (bw, bh), col)
    img.paste(Image.blend(img.crop((bx, by, bx + bw, by + bh)), overlay, alpha / 255.0),
              (bx, by))

# 5. Scattered APL-ish glyph marks (drawn as accented ticks/blocks)
glyph_font = ImageFont.truetype(BOLD, 60)
for _ in range(18):
    gx = random.randint(60, W - 120)
    gy = random.randint(1000, H - 200)
    ch = random.choice(["+", "/", "x", "=", "#", "O", "*"])
    d.text((gx, gy), ch, font=glyph_font, fill=random.choice([SK_MINT, SK_ACCENT]))

# 6. Scanlines
scan = Image.new("RGB", (W, H), (0, 0, 0))
sd = ImageDraw.Draw(scan)
for y in range(0, H, 4):
    sd.line([(0, y), (W, y)], fill=(0, 0, 0))
img = Image.blend(img, scan, 0.10)

# 7. Fine grain noise
noise = Image.effect_noise((W, H), 22).convert("L")
img = Image.blend(img, Image.merge("RGB", (noise, noise, noise)), 0.05)

# 8. Footer meta
d = ImageDraw.Draw(img)
footer = "Simplified Edition  -  Ahmad Ali Parr  -  SnapKitty Collective"
fw = d.textlength(footer, font=small_font)
d.text(((W - fw) // 2, H - 120), footer, font=small_font, fill=(180, 180, 200))
fp = "SHA-256 88313c7c...a03491   -   Bitcoin OP_RETURN MATH5:88313c7c...a03491"
fpw = d.textlength(fp, font=small_font)
d.text(((W - fpw) // 2, H - 70), fp, font=small_font, fill=(150, 150, 175))

out = os.path.join(HERE, "cover.png")
img.save(out)
print("wrote", out, img.size)
