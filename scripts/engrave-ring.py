"""Grave « au·ne » sur la bague de l'image fixe du hero (public/demo/hero-main/poster.jpg).

Le logo est tourné à 90°, plaqué sur la face extérieure visible de l'anneau en
suivant sa courbure (décalage ligne par ligne), puis rendu comme une gravure :
creux sombre en produit (multiply) et liseré clair décalé vers le bas.

    python -I scripts/engrave-ring.py
"""
from pathlib import Path

from PIL import Image, ImageChops, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "public/demo/hero-main/frame2.jpg"
OUT = ROOT / "public/demo/hero-main/poster.jpg"
LOGO = ROOT / "public/brand/logo-bordeaux.png"

# Zone de la bague dans l'image source (1920 × 1084), travaillée à ×4.
BOX = (880, 380, 1040, 540)
K = 4

img = Image.open(SRC).convert("RGB")
crop = img.crop(BOX).resize(((BOX[2] - BOX[0]) * K, (BOX[3] - BOX[1]) * K), Image.LANCZOS)

# Logo : alpha seul, tourné pour se lire de haut en bas le long de l'anneau.
alpha = Image.open(LOGO).convert("RGBA").split()[3]
alpha = alpha.rotate(-90, expand=True)
h = 180
w = round(alpha.width * h / alpha.height)
alpha = alpha.resize((w, h), Image.LANCZOS)

# Ligne centrale de la face extérieure gauche (repère ×4), y → x.
top = 242
pts = [(top, 190), (top + h / 2, 173), (top + h, 180)]


def center_x(y: float) -> float:
    (y0, x0), (y1, x1), (y2, x2) = pts
    t = (y - y0) / (y2 - y0)
    return (1 - t) ** 2 * x0 + 2 * (1 - t) * t * x1 + t**2 * x2


mask = Image.new("L", crop.size, 0)
for row in range(h):
    y = top + row
    # Raccourci de perspective : la face s'amincit vers le haut et le bas de l'anneau.
    t = row / (h - 1)
    squash = 0.72 + 0.28 * (1 - (2 * t - 1) ** 2)
    line = alpha.crop((0, row, w, row + 1))
    sw = max(1, round(w * squash))
    line = line.resize((sw, 1), Image.LANCZOS)
    mask.paste(line, (round(center_x(y) - sw / 2), y))

mask = mask.filter(ImageFilter.GaussianBlur(0.8))
groove = Image.eval(mask, lambda v: int(v * 0.55))
light = ImageChops.offset(mask, 1, 3).filter(ImageFilter.GaussianBlur(1.2))
light = Image.eval(light, lambda v: int(v * 0.35))

shade = Image.new("RGB", crop.size, (70, 32, 18))
engraved = Image.composite(ImageChops.multiply(crop, shade.point(lambda v: min(255, v + 120))), crop, groove)
glint = Image.new("RGB", crop.size, (255, 226, 196))
engraved = Image.composite(glint, engraved, ImageChops.subtract(light, groove))

img.paste(engraved.resize((BOX[2] - BOX[0], BOX[3] - BOX[1]), Image.LANCZOS), BOX[:2])
img.save(OUT, quality=88, optimize=True, progressive=True)
engraved.save(ROOT / "public/demo/hero-main/ring-detail.png")
print(OUT)
