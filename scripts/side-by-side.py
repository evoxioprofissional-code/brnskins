"""Gera recortes lado a lado (referência x atual) para inspeção visual.
Uso: python scripts/side-by-side.py [x0 y0 x1 y1 escala]"""
import sys
from PIL import Image

ref = Image.open("references/redesign-desktop-1648x928.png").convert("RGB")
cur = Image.open("visual-output/current.png").convert("RGB")
box = tuple(int(v) for v in sys.argv[1:5]) if len(sys.argv) >= 5 else (0, 0, 1648, 928)
scale = float(sys.argv[5]) if len(sys.argv) >= 6 else 1.0
a, b = ref.crop(box), cur.crop(box)
w, h = a.size
out = Image.new("RGB", (w, h * 2 + 6), (255, 0, 255))
out.paste(a, (0, 0))
out.paste(b, (0, h + 6))
if scale != 1:
    out = out.resize((int(out.width * scale), int(out.height * scale)), Image.LANCZOS)
name = sys.argv[6] if len(sys.argv) >= 7 else "sbs.png"
out.save("visual-output/" + name)
print("visual-output/" + name, out.size)
