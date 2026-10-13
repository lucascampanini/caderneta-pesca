"""Crop rendered tackle sprites to their alpha, save WebP into DOCS/montagem and write manifest.json:
{name: {w, h (px), u (px per unit), ax, ay (attach point in px, = world origin)}}
usage: export_sprites.py RENDER_DIR DOCS"""
import sys, json, pathlib
from PIL import Image

R, DOCS = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
OUT = DOCS / 'montagem'; OUT.mkdir(parents=True, exist_ok=True)
mf = json.loads((R / 'manifest.json').read_text())
res = {}
tot = 0
for name, m in sorted(mf.items()):
    f = R / f'{name}.png'
    if not f.exists(): continue
    im = Image.open(f).convert('RGBA')
    bb = im.getchannel('A').point(lambda v: 255 if v > 6 else 0).getbbox()
    if not bb: continue
    pad = 3
    bb = (max(0, bb[0] - pad), max(0, bb[1] - pad), min(im.width, bb[2] + pad), min(im.height, bb[3] + pad))
    c = im.crop(bb)
    ppu = m['ppu']
    ax = (0 - m['x0']) * ppu - bb[0]
    ay = (m['z1'] - 0) * ppu - bb[1]
    c.save(OUT / f'{name}.webp', 'WEBP', quality=88, method=6)
    tot += (OUT / f'{name}.webp').stat().st_size
    res[name] = {'w': c.width, 'h': c.height, 'u': round(ppu, 2), 'ax': round(ax, 1), 'ay': round(ay, 1)}
(OUT / 'manifest.json').write_text(json.dumps(res, separators=(',', ':')), encoding='utf-8')
print(len(res), 'sprites', tot // 1024, 'KB')
