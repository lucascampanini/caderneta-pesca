"""SAM2 cutouts: SRC/<id>.jpg + prompts -> OUT/<id>.png (RGBA, cropped) and a review sheet."""
import sys, json, pathlib
import numpy as np, torch, cv2
from PIL import Image, ImageDraw
sys.path.insert(0, 'D:/AI/sam2')
from sam2.build_sam import build_sam2
from sam2.sam2_image_predictor import SAM2ImagePredictor

SRC, OUT = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2]); OUT.mkdir(exist_ok=True)
PROMPTS = json.loads(pathlib.Path(sys.argv[3]).read_text())
only = sys.argv[4].split(',') if len(sys.argv) > 4 else None

model = build_sam2('configs/sam2.1/sam2.1_hiera_l.yaml', 'D:/AI/sam2/checkpoints/sam2.1_hiera_large.pt', device='cuda')
pred = SAM2ImagePredictor(model)

tiles = []
for sid, p in PROMPTS.items():
    if only and sid not in only: continue
    im = np.array(Image.open(SRC / f'{p.get("src", sid)}.jpg').convert('RGB'))
    H, W = im.shape[:2]
    box = np.array(p['box']) * [W, H, W, H]
    pts = [(x * W, y * H, 1) for x, y in p['pos']] + [(x * W, y * H, 0) for x, y in p.get('neg', [])]
    with torch.inference_mode(), torch.autocast('cuda', dtype=torch.bfloat16):
        pred.set_image(im)
        masks, scores, _ = pred.predict(point_coords=np.array([q[:2] for q in pts]), point_labels=np.array([q[2] for q in pts]),
                                        box=box, multimask_output=True)
    m = masks[int(np.argmax(scores))].astype(np.uint8)
    # keep the largest component, fill holes, smooth edge
    n, lab, st, _ = cv2.connectedComponentsWithStats(m, 8)
    if n > 1: m = (lab == 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA]))).astype(np.uint8)
    cnts, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    filled = np.zeros_like(m); cv2.drawContours(filled, cnts, -1, 1, -1)
    alpha = cv2.GaussianBlur(filled.astype(np.float32), (0, 0), max(1.0, W / 1400))
    alpha = np.clip((alpha - 0.5) * 2.2 + 0.5, 0, 1)
    ys, xs = np.where(alpha > 0.05)
    pad = int(0.01 * W)
    x0, x1, y0, y1 = max(0, xs.min() - pad), min(W, xs.max() + pad), max(0, ys.min() - pad), min(H, ys.max() + pad)
    rgba = np.dstack([im, (alpha * 255).astype(np.uint8)])[y0:y1, x0:x1]
    out = Image.fromarray(rgba, 'RGBA')
    if p.get('rot'):
        out = out.rotate(p['rot'], resample=Image.BICUBIC, expand=True)
        out = out.crop(out.getchannel('A').point(lambda v: 255 if v > 12 else 0).getbbox())
    out.save(OUT / f'{sid}.png')
    print(sid, f'score={scores.max():.3f}', out.size, flush=True)
    t = Image.new('RGB', (400, 220), (205, 205, 200)); th = out.copy(); th.thumbnail((390, 196))
    t.paste(th, ((400 - th.width) // 2, 20), th); ImageDraw.Draw(t).text((4, 4), sid, fill='black'); tiles.append(t)

cols = 4; rows = (len(tiles) + cols - 1) // cols
sh = Image.new('RGB', (cols * 400, rows * 220), 'white')
for i, t in enumerate(tiles): sh.paste(t, ((i % cols) * 400, (i // cols) * 220))
sh.save(OUT.parent / 'cutouts_review.jpg', quality=88)
