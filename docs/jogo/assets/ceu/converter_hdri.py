# Roda no Blender: converte os HDRIs (metade de cima) em WebP com codificação Reinhard reversível:
#   v = x/(1+x), guardado como v^(1/2.2). No jogo: v = s^2.2, x = v/(1-v)  (radiância linear de volta).
# A noite é gerada a partir do céu limpo kloppenheim_02 (sem sol, escurecido, azulado) + estrelas.
import bpy, numpy as np, json
P = "D:/AI/pesca_assets/hdri/"
OUT = "D:/AI/pesca_assets/ceu_agente/out/"
import os; os.makedirs(OUT, exist_ok=True)
LUM = np.array([0.2126, 0.7152, 0.0722])
# nome de saída, HDR, mediana-alvo de luminância
CEUS = [
    ("dia", "kloofendal_48d_partly_cloudy_puresky", 0.40),
    ("amanhecer", "qwantani_dawn_puresky", 0.30),
    ("entardecer", "kloppenheim_06_puresky", 0.26),
    ("noite", "kloppenheim_02_puresky", 0.010),
]
W_OUT = 4096
def load(n):
    img = bpy.data.images.load(P + n + "_4k.hdr"); w, h = img.size
    px = np.empty(w * h * 4, dtype=np.float32); img.pixels.foreach_get(px)
    return px.reshape(h, w, 4)[h // 2:, :, :3].copy()  # linha 0 = horizonte

def blur1(a, r, axis):
    c = np.cumsum(np.pad(a, [(r + 1, r) if i == axis else (0, 0) for i in range(a.ndim)], mode="wrap" if axis == 1 else "edge"), axis=axis)
    n = a.shape[axis]
    return (np.take(c, range(2 * r + 1, 2 * r + 1 + n), axis=axis) - np.take(c, range(0, n), axis=axis)) / (2 * r + 1)

def noite(top):
    h, w, _ = top.shape
    L = top @ LUM
    L = np.repeat(np.median(L, axis=1, keepdims=True), w, axis=1)  # só o degradê vertical (sem o halo do sol)
    L = blur1(blur1(L, 6, 0), 6, 1)
    rng = np.random.default_rng(7)
    lat = (np.arange(h) + 0.5) / h * (np.pi / 2)
    # céu noturno: azul profundo, um pouco mais claro e esverdeado perto do horizonte (luz difusa)
    t = (lat / (np.pi / 2))[:, None, None]
    base = L[..., None] * (np.array([0.22, 0.34, 0.75])[None, None, :] * t + np.array([0.42, 0.50, 0.70])[None, None, :] * (1 - t))
    # Via Láctea: faixa num grande círculo inclinado, com ruído de baixa frequência
    u = (np.arange(w) + 0.5) / w * 2 * np.pi
    U, LA = np.meshgrid(u, lat)
    d = np.stack([np.cos(LA) * np.cos(U), np.sin(LA), np.cos(LA) * np.sin(U)], -1)
    nrm = np.array([0.35, 0.55, -0.76]); nrm /= np.linalg.norm(nrm)
    band = np.exp(-(d @ nrm) ** 2 / 0.018)
    nz = rng.random((h // 8 + 1, w // 8 + 1)).astype(np.float32)
    nz = blur1(blur1(nz, 3, 0), 3, 1)
    nz = np.kron(nz, np.ones((8, 8)))[:h, :w]
    nz = (nz - nz.min()) / (nz.max() - nz.min())
    mw = band * (0.35 + 1.3 * nz ** 2)
    base += mw[..., None] * np.array([0.55, 0.55, 0.62]) * 0.9 * np.median(L)
    # estrelas: distribuição uniforme na esfera, brilho em lei de potência; achatadas por cos(lat) no equirretangular
    stars = np.zeros((h, w), np.float32)
    N = 9000
    sl = np.arcsin(rng.random(N) * 0.995 + 0.004)
    su = rng.random(N) * 2 * np.pi
    mag = rng.random(N) ** 6 * 1.0 + 0.02
    mag[rng.random(N) < 0.012] *= 6
    for la_, u_, m in zip(sl, su, mag):
        r = la_ / (np.pi / 2) * h; c = u_ / (2 * np.pi) * w
        sx = 0.7 / max(np.cos(la_), 0.08); sy = 0.7
        x0, x1 = int(c - 3 * sx), int(c + 3 * sx) + 2; y0, y1 = int(r - 3), int(r + 3) + 2
        ys = np.arange(max(y0, 0), min(y1, h)); xs = np.arange(x0, x1)
        if len(ys) == 0: continue
        g = np.exp(-(((xs[None, :] + 0.5 - c) / sx) ** 2 + ((ys[:, None] + 0.5 - r) / sy) ** 2) / 2)
        stars[np.ix_(ys, xs % w)] += g * m
    ext = np.clip(lat / 0.25, 0.15, 1.0)[:, None]      # extinção perto do horizonte
    tint = np.ones((h, w, 3)) * np.array([0.9, 0.95, 1.05])
    base = base + (stars * ext)[..., None] * tint * np.median(L) * 14
    return base

vs = bpy.context.scene.view_settings; vs.view_transform = "Standard"; vs.look = "None"; vs.exposure = 0; vs.gamma = 1
GRADE = {"amanhecer": ([1.45, 0.98, 0.78], [0.80, 0.86, 1.10], 1.35), "entardecer": ([1.55, 0.88, 0.66], [0.88, 0.88, 1.05], 1.2)}
def gradua(top, sc, quente, frio, sat):
    # tom de nascer/pôr do sol: horizonte quente (mais forte do lado do sol), alto do céu mais azul, mais saturação
    h, w, _ = top.shape
    t = ((np.arange(h) + 0.5) / h)[:, None, None]
    u = (np.arange(w) + 0.5) / w
    lado = (0.5 + 0.5 * np.cos((u - (sc + 0.5) / w) * 2 * np.pi))[None, :, None]
    k = np.exp(-t / 0.28) * (0.45 + 0.55 * lado)
    q = np.array(quente)[None, None, :]; f = np.array(frio)[None, None, :]
    mult = q * k + f * (1 - k) * np.clip(t * 2.5, 0, 1) + (1 - k) * (1 - np.clip(t * 2.5, 0, 1))
    x = top * mult
    L = (x @ LUM)[..., None]
    return np.maximum(L + (x - L) * sat, 0)
meta = {}
for nome, n, alvo in CEUS:
    top = load(n)
    Lsrc = top @ LUM
    sr, sc = np.unravel_index(np.argmax(blur1(blur1(Lsrc, 4, 0), 4, 1)), Lsrc.shape)
    if nome == "noite": top = noite(top)
    if nome in GRADE: top = gradua(top, sc, *GRADE[nome])
    L = top @ LUM
    g = alvo / float(np.median(L))
    x = top * g
    h, w, _ = x.shape
    if w != W_OUT:
        pass
    v = x / (1 + x)
    s = np.clip(v, 0, 1) ** (1 / 2.2)
    out = np.ones((h, w, 4), np.float32); out[..., :3] = s
    o = bpy.data.images.new("c_" + nome, w, h, alpha=False)
    o.pixels.foreach_set(out.ravel())
    for fmt, ext, q in (("WEBP", "webp", 92), ("JPEG", "jpg", 85)):
        sc_ = bpy.context.scene.render.image_settings
        sc_.file_format = fmt; sc_.quality = q; sc_.color_mode = "RGB"
        o.save_render(OUT + f"ceu_{nome}.{ext}", scene=bpy.context.scene)
    # preview com ACES simples para eu olhar
    def aces(y): return np.clip((y * (2.51 * y + 0.03)) / (y * (2.43 * y + 0.59) + 0.14), 0, 1)
    pv = out.copy(); pv[..., :3] = aces(x * {"dia": 1.2, "amanhecer": 1.2, "entardecer": 1.2, "noite": 1.2}[nome]) ** (1 / 2.2)
    p = bpy.data.images.new("p_" + nome, w, h, alpha=False); p.pixels.foreach_set(pv.ravel())
    sc_.file_format = "JPEG"; sc_.quality = 80
    p.save_render(OUT + f"preview_{nome}.jpg", scene=bpy.context.scene)
    hor = (x[2:60].reshape(-1, 3).mean(0)).tolist()
    meta[nome] = {"sol_u": (sc + 0.5) / w, "sol_elev": float((sr + 0.5) / h * 90), "horizonte": hor, "mediana": float(np.median(x @ LUM)), "max": float((x @ LUM).max())}
    print("CV", nome, meta[nome])
json.dump(meta, open(OUT + "meta.json", "w"), indent=1)
