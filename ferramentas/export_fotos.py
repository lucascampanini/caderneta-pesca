"""Final photo assets -> DOCS/fotos:
  <id>.webp       cutout with alpha, 1200 px wide (detail)
  <id>-card.webp  cutout with alpha, 640 px wide (cards, chips)
  <id>.jpg        original photo cropped around the fish, 1400 px wide, <300 KB (context photo)
  creditos.json   {"<id>": {"txt": "Foto: Autor, Licença, Fonte", "link": "...", "fonte": "..."}}
usage: export_fotos.py SCRATCH DOCS"""
import sys, io, json, pathlib
import numpy as np
from PIL import Image

S, DOCS = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
OUT = DOCS / 'fotos'; OUT.mkdir(exist_ok=True)
meta = json.loads((S / 'src/meta.json').read_text(encoding='utf-8'))
prompts = json.loads((S / 'prompts.json').read_text())
# underwater / aquarium shots with a strong colour cast: partial grey-world white balance
WB = {'piraputanga': .55, 'pacupeva': .5, 'jurupensem': .45, 'dourado': .3}

def balance(rgba, k):
    a = np.asarray(rgba).astype(np.float32)
    m = a[..., 3] > 128
    means = a[..., :3][m].mean(0)
    gain = 1 + k * (means.mean() / means - 1)
    a[..., :3] = np.clip(a[..., :3] * gain, 0, 255)
    return Image.fromarray(a.astype(np.uint8), 'RGBA')

def save_jpg(im, path, limit=300_000):
    for q in range(88, 50, -4):
        b = io.BytesIO(); im.save(b, 'JPEG', quality=q, optimize=True, progressive=True)
        if b.tell() < limit: break
    path.write_bytes(b.getvalue())

cred = {}
for sid, p in prompts.items():
    src = p.get('src', sid)
    cut = Image.open(S / 'cut' / f'{sid}.png').convert('RGBA')
    if sid in WB: cut = balance(cut, WB[sid])
    for w, suf, q in ((1200, '', 86), (640, '-card', 84)):
        im = cut.copy()
        if im.width > w: im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
        im.save(OUT / f'{sid}{suf}.webp', 'WEBP', quality=q, method=6)
    # context photo: crop around the prompt box with margin, keep >= 4:3-ish
    ph = Image.open(S / 'src' / f'{src}.jpg').convert('RGB')
    W, H = ph.size
    x0, y0, x1, y1 = p['box']
    mx, my = 0.06, 0.10
    box = (max(0, (x0 - mx) * W), max(0, (y0 - my) * H), min(W, (x1 + mx) * W), min(H, (y1 + my) * H))
    if p.get('rot'): box = (0, 0, W, H)
    ph = ph.crop(tuple(int(v) for v in box))
    if ph.width > 1400: ph = ph.resize((1400, round(ph.height * 1400 / ph.width)), Image.LANCZOS)
    save_jpg(ph, OUT / f'{sid}.jpg')
    m = meta[src]
    cred[sid] = {'txt': f"Foto: {m['autor']}, {m['licenca']}, {m['fonte']}", 'link': m['link'], 'fonte': m['fonte']}
    sizes = [f"{(OUT / n).stat().st_size // 1024}KB" for n in (f'{sid}.webp', f'{sid}-card.webp', f'{sid}.jpg')]
    print(sid, *sizes, '|', cred[sid]['txt'])

(OUT / 'creditos.json').write_text(json.dumps(cred, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
