"""Uni, FG, Albright, Laço (Rapala) and Palomar definitions (imported by knots_def)."""
import math
import numpy as np
from knotsim import Path, helix, spheres_along, resample, catmull


def L(a, b, t):
    if isinstance(a, (int, float)): return a + (b - a) * t
    return [tuple(x + (y - x) * t for x, y in zip(p, q)) for p, q in zip(a, b)]

def P3(*a): return tuple(float(v) for v in a)

def leader_obstacles(polys, r):
    Os, Rs = [], []
    for pl in polys:
        o, rr = spheres_along(np.asarray(pl, float), r, 0.04)
        Os.append(o); Rs.append(rr)
    return np.vstack(Os), np.concatenate(Rs)

def cut_after_x(xc):
    """keep the tag up to the last point (walking back from its end) with x <= xc."""
    def fn(T):
        T = np.asarray(T)
        for i in range(len(T) - 1, -1, -1):
            if T[i, 0] <= xc: return i
        return len(T) - 1
    return fn

def cut_near(center, dist):
    """walking back from the tag end, keep up to the first point within `dist` of `center`."""
    c = np.asarray(center, float)
    def fn(T):
        T = np.asarray(T); d = np.linalg.norm(T - c, axis=1)
        for i in range(len(T) - 1, -1, -1):
            if d[i] <= dist: return i
        return len(T) - 1
    return fn

RL = 0.085   # leader radius


def uni(hook_obstacles):
    def geom(t):
        lift = 0.14
        wx0, wx1 = L(1.0, 0.36, t), L(2.6, 1.08, t)
        rw = L(0.27, 0.2, t)
        px1 = L(3.2, 1.3, t)
        p = Path()
        p.ctrl(L([(8.0, 0, 0), (5.0, 0, 0), (2.0, 0, 0), (0.55, 0, 0.04)], [(8.0, 0, 0), (5.0, 0, 0), (2.0, 0, 0), (0.5, 0.08, 0.0)], t), 10)
        p.mark('tag')
        ep = L([(0.55, 0, 0.04), (0.0, 0, 0.1), (-0.5, 0, 0.1), (-0.85, 0.28, 0.1), (-0.45, 0.62, lift), (0.25, 0.42, lift)],
               [(0.5, 0.08, 0.0), (0.0, 0.26, 0.0), (-0.16, 0.36, 0.05), (-0.15, 0.5, 0.1), (0.02, 0.5, lift), (0.22, 0.25, lift)], t)
        p.ctrl(ep + [P3(L(0.7, 0.32, t), 0.0, lift), P3(px1, 0.0, lift)], 18)
        p.mark('alca')
        loop = L([(3.55, 0, 0.45), (3.1, 0, 1.15), (1.6, 0, 1.2), (0.85, 0.0, 0.85), (0.75, 0.25, 0.3), (0.95, 0.3, -0.05)],
                 [(1.42, 0, 0.3), (1.3, 0, 0.5), (0.7, 0, 0.52), (0.3, 0.0, 0.45), (0.25, 0.22, 0.2), (0.32, 0.24, 0.0)], t)
        p.ctrl([P3(px1, 0.0, lift)] + loop, 18)
        p.mark('voltas')
        h = helix(wx0, wx1, 5, rw, 0.0, 0.0, lift / 2)
        p.poly(h)
        p.mark('sai')
        p.ctrl([tuple(h[-1])] + L([(2.85, 0.45, 0.2), (3.2, 0.5, 0.6), (3.6, 0.5, 1.1)], [(1.2, 0.3, 0.2), (1.45, 0.38, 0.55), (1.85, 0.45, 0.95)], t), 18)
        return p.build()
    obst, meta = hook_obstacles()
    steps = [('tag', 'alca', 'Passe a ponta pelo olho e deite-a ao lado da linha principal.'),
             ('alca', 'voltas', 'Volte a ponta por cima, formando uma alça.'),
             ('voltas', 'sai', 'Enrole a ponta 5 a 6 vezes por dentro da alça, abraçando as duas linhas.'),
             ('sai', 'end', 'Puxe a ponta para fechar as voltas.'),
             ('aperto', None, 'Molhe e puxe a linha principal: o nó desliza até o olho.'),
             ('corte', None, 'Corte a sobra rente.')]
    return dict(geom=geom, cut_fn=cut_near((0.75, 0.1, 0.1), 0.62), obst=obst, meta=meta, steps=steps,
                view=dict(target=(1.2, 0.1, 0.3), dist=8.8))


def fg(hook_obstacles=None):
    leader = [(-8.0, 0, 0), (3.1, 0, 0)]
    def geom(t):
        rw = L(0.24, RL + 0.065, t)
        x0, x1 = L(2.7, 2.6, t), L(-0.2, 1.25, t)
        n_turns = 9
        p = Path()
        p.ctrl(L([(8.0, 0, 0.0), (5.5, 0, 0.0), (3.6, 0, 0.0), (3.0, 0.0, 0.24)], [(8.0, 0, 0.0), (5.5, 0, 0.0), (3.6, 0, 0.0), (2.85, 0.0, RL + 0.065)], t), 10)
        p.mark('tag')
        h = helix(x0, x1, n_turns, rw, math.pi / 2)
        wob = 0.35 * (x0 - x1) / n_turns
        h[:, 0] += wob * np.sin(np.linspace(0, n_turns * 2 * math.pi, len(h)) * 0.5) * (1 - t * 0.6)
        p.ctrl([L((3.0, 0.0, 0.24), (2.85, 0.0, RL + 0.065), t)[0] if False else (L(3.0, 2.85, t), 0.0, rw), tuple(h[0])], 8)
        p.poly(h)
        p.mark('trava')
        last = h[-1]
        hh = helix(x1, x1 - L(0.6, 0.22, t), 2, rw + 0.07, math.atan2(last[2], last[1]))
        p.ctrl([tuple(last), tuple(hh[0])], 6)
        p.poly(hh)
        p.mark('fim')
        e = hh[-1]
        p.ctrl([tuple(e)] + L([(x1 - 1.0, 0.35, 0.5), (x1 - 1.5, 0.45, 1.0)], [(x1 - 0.45, 0.3, 0.35), (x1 - 0.8, 0.4, 0.75)], t), 12)
        return p.build()
    obst = leader_obstacles([leader], RL)
    steps = [('tag', 'trava', 'Com o multi esticado, enrole-o no líder, 15 a 20 cruzamentos.'),
             ('trava', 'fim', 'Trave com meio-nós no líder.'),
             ('fim', 'end', 'Finalize com meio-nós só no multi.'),
             ('aperto', None, 'Molhe e aperte forte: as voltas fecham e o nó fica fino.'),
             ('corte', None, 'Corte as sobras rente.')]
    return dict(geom=geom, obst=obst, meta={'type': 'none'}, steps=steps, cut_fn=cut_near((1.2, 0, 0), 0.5),
                leaders=[{'pts': leader, 'r': RL}], view=dict(target=(1.6, 0.0, 0.1), dist=7.4))


def albright(hook_obstacles=None):
    sep = 0.17
    bend = [(sep * math.sin(a), sep * math.cos(a), 0.0) for a in np.linspace(0.0, math.pi, 9)]
    leader = [(-8.0, sep, 0.0), (-1.0, sep, 0.0)] + bend + [(-1.0, -sep, 0.0), (-2.9, -sep, 0.0)]
    leader_dense = catmull(leader, 8)
    def geom(t):
        rw = L(0.36, sep + RL + 0.065, t)
        hx0, hx1 = L(-2.3, -1.45, t), L(-0.75, -0.42, t)
        h = helix(hx0, hx1, 10, rw, -math.pi / 2)
        p = Path()
        p.ctrl(L([(8.0, 0, 0.5), (3.0, 0, 0.5), (1.0, 0, 0.45), (-0.2, 0, 0.32), (-0.55, 0, 0.0)],
                 [(8.0, 0, 0.3), (3.0, 0, 0.3), (0.8, 0, 0.25), (0.0, 0, 0.18), (-0.34, 0, 0.0)], t), 10)
        p.mark('tag')
        p.ctrl(L([(-0.55, 0, 0.0), (-0.9, 0, -0.12), (-1.8, 0, -0.1)],
                 [(-0.34, 0, 0.0), (-0.6, 0, -0.05), (-1.2, 0, -0.04)], t) + [tuple(h[0])], 14)
        p.mark('voltas')
        p.poly(h)
        p.mark('sai')
        p.ctrl([tuple(h[-1])] + L([(-0.5, 0.0, -0.45), (-0.32, 0, 0.0), (-0.25, -0.05, 0.45), (-0.1, -0.15, 1.2)],
                                  [(-0.3, 0.0, -0.3), (-0.2, 0, 0.0), (-0.12, -0.05, 0.4), (0.15, -0.15, 1.0)], t), 14)
        return p.build()
    obst = leader_obstacles([leader_dense], RL)
    steps = [('tag', 'voltas', 'Dobre o líder em alça e passe o multi por dentro dela.'),
             ('voltas', 'sai', 'Enrole o multi 10 a 12 vezes sobre ele e as duas pernas da alça, rumo à curva.'),
             ('sai', 'end', 'Saia pela mesma alça por onde entrou.'),
             ('aperto', None, 'Molhe e aperte puxando as quatro pontas.'),
             ('corte', None, 'Corte as sobras rente.')]
    return dict(geom=geom, obst=obst, meta={'type': 'none'}, steps=steps, cut_fn=cut_near((-0.25, 0, 0.0), 0.45),
                leaders=[{'pts': [list(map(float, q)) for q in leader_dense], 'r': RL}],
                view=dict(target=(-0.6, 0.0, 0.1), dist=7.6, az=-55))


def overhand(cx, s, z=0.13):
    """open overhand (trefoil) for a line running towards -X, centred near (cx,0,0), scale s."""
    pts = [(1.2, 0, 0), (0.6, 0.0, 0.0), (0.0, 0.05, 0.0), (-0.35, 0.35, 0.0), (-0.05, 0.65, 0.0), (0.4, 0.5, 0.0),
           (0.55, 0.1, z), (0.45, -0.25, 0.0), (0.2, -0.0, -z), (0.05, 0.3, 0.0), (-0.2, 0.52, z), (-0.6, 0.6, 0.0)]
    return [(cx + x * s, y * s, zz) for x, y, zz in pts]


def loop(hook_obstacles):
    def geom(t):
        cx, sc = L(2.1, 1.05, t), L(1.0, 0.62, t)
        oh = overhand(cx, sc)
        hx0, hx1 = L(3.45, 1.95, t), L(4.0, 2.35, t)
        h = helix(hx0, hx1, 3, L(0.155, 0.125, t), 0.0)
        p = Path()
        p.ctrl([(8.0, 0, 0), (5.5, 0, 0), (cx + 1.6 * sc + 0.2, 0, 0), oh[0]], 10)
        p.ctrl(oh, 14)
        p.ctrl([oh[-1]] + L([(1.1, 0.3, 0.0), (0.55, 0.0, 0.04)], [(0.55, 0.25, 0.0), (0.5, 0.06, 0.0)], t), 14)
        p.mark('tag')
        ep = L([(0.55, 0, 0.04), (0.0, 0, 0.1), (-0.5, 0, 0.1), (-0.85, 0.28, 0.02), (-0.45, 0.66, 0.0), (0.3, 0.66, -0.1)],
               [(0.5, 0.06, 0.0), (0.0, 0.26, 0.0), (-0.16, 0.36, 0.0), (-0.15, 0.5, 0.0), (0.02, 0.6, -0.02), (0.22, 0.5, -0.08)], t)
        mid = (cx + 0.05 * sc, 0.3 * sc, 0.0)
        p.ctrl(ep + [(cx - 0.6 * sc, 0.32 * sc, -0.3 * sc), mid, (cx + 0.15 * sc, 0.28 * sc, 0.3 * sc), (hx0 - 0.3, 0.2, 0.25), tuple(h[0])], 16)
        p.mark('voltas')
        p.poly(h)
        p.mark('volta')
        mid2 = (cx - 0.08 * sc, 0.45 * sc, 0.0)
        p.ctrl([tuple(h[-1]), (hx1 + 0.25, 0.3, 0.3), (cx + 0.5 * sc, 0.5 * sc, 0.45 * sc), (cx - 0.05 * sc, 0.45 * sc, 0.35 * sc), mid2,
                (cx - 0.1 * sc, 0.5 * sc, -0.35 * sc)] + L([(cx + 0.2, 0.75, -0.8), (cx + 0.6, 0.85, -1.3)], [(cx + 0.1, 0.55, -0.55), (cx + 0.35, 0.65, -0.95)], t), 16)
        return p.build()
    obst, meta = hook_obstacles()
    steps = [('tag', 'voltas', 'Com um nó simples frouxo na linha, passe a ponta pelo olho e volte por dentro do nó simples.'),
             ('voltas', 'volta', 'Enrole a ponta 3 a 4 vezes na linha principal.'),
             ('volta', 'end', 'Volte a ponta por dentro do nó simples, pelo mesmo lado de onde saiu.'),
             ('aperto', None, 'Molhe e aperte: fica um laço que deixa a isca nadar solta.'),
             ('corte', None, 'Corte a sobra rente.')]
    return dict(geom=geom, obst=obst, meta=meta, steps=steps, cut_fn=cut_near((1.1, 0.2, 0.0), 0.55),
                view=dict(target=(1.4, 0.2, 0.0), dist=9.0))


def offset_pair(C, o_fn, tip_from=0.82):
    """Two legs of a doubled line around centre curve C. Offset direction follows a rotation-minimising
    (parallel-transport) frame, then turns horizontal near the bight so the legs straddle the hook shank."""
    C = np.asarray(C, float); n = len(C)
    T = np.gradient(C, axis=0); T /= np.linalg.norm(T, axis=1, keepdims=True) + 1e-12
    N = np.zeros_like(C)
    n0 = np.array([0, 1.0, 0]); n0 -= np.dot(n0, T[0]) * T[0]; N[0] = n0 / np.linalg.norm(n0)
    for i in range(1, n):
        v = N[i - 1] - np.dot(N[i - 1], T[i]) * T[i]
        N[i] = v / (np.linalg.norm(v) + 1e-12)
    for i in range(n):
        u = i / (n - 1)
        if u > tip_from:
            hd = np.cross(T[i], [0, 0, 1.0]); hn = np.linalg.norm(hd)
            if hn < 1e-6: continue
            hd /= hn
            if np.dot(hd, N[i]) < 0: hd = -hd
            w = min(1.0, (u - tip_from) / (1 - tip_from) * 1.6)
            v = (1 - w) * N[i] + w * hd; v -= np.dot(v, T[i]) * T[i]
            N[i] = v / (np.linalg.norm(v) + 1e-12)
    o = np.array([o_fn(i / (n - 1)) for i in range(n)])[:, None]
    return C + N * o, C - N * o


def palomar(hook_obstacles):
    PER = 22
    def geom(t):
        ctrl = L([(8.0, 0, 0), (3.0, 0, 0), (0.8, 0, 0), (0.0, 0, 0), (-0.6, 0, 0.05), (-1.0, 0, 0.5), (-0.6, 0, 0.95), (0.4, 0, 1.05), (1.2, 0, 0.75),
                  (1.5, -0.55, 0.25), (1.35, 0, -0.45), (1.2, 0.55, 0.1), (0.8, 0.45, 0.4), (0.5, 0, 0.45), (0.2, -0.45, 0.4),
                  (0.0, -0.9, 0.3), (-0.8, -0.75, -0.2), (-1.6, -0.3, -0.53), (-2.0, 0, -0.53), (-2.3, 0, -0.53)],
                 [(8.0, 0, 0), (3.0, 0, 0), (0.8, 0, 0), (0.0, 0, 0), (-0.22, 0, 0.05), (-0.34, 0, 0.32), (-0.12, 0, 0.52), (0.3, 0, 0.5), (0.55, 0, 0.38),
                  (0.62, -0.34, 0.15), (0.55, 0, -0.3), (0.45, 0.34, 0.1), (0.3, 0.3, 0.3), (0.16, 0, 0.3), (0.05, -0.3, 0.32),
                  (-0.05, -0.68, 0.15), (-0.3, -0.55, -0.3), (-0.4, -0.25, -0.53), (-0.5, 0, -0.53), (-0.6, 0, -0.53)], t)
        C = catmull(ctrl, PER)
        n = len(C)
        o_tip = 0.21
        A, B = offset_pair(C, lambda u: 0.066 + (o_tip - 0.066) * max(0.0, (u - 0.86) / 0.14) ** 1.5)
        tip = C[-1]
        th = np.linspace(0, math.pi, 24)
        half = (A[-1] - B[-1]) / 2; rad = np.linalg.norm(half); nh = half / rad
        down = np.array([0, 0, -1.0]); down -= np.dot(down, nh) * nh; down /= np.linalg.norm(down)
        U = np.array([tip + nh * rad * math.cos(a) + down * rad * math.sin(a) for a in th])
        full = np.vstack([A, U[1:-1], B[::-1]])
        res, _ = resample(full)
        sA = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(A, axis=0), axis=1))])
        sF = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(full, axis=0), axis=1))])
        at = lambda k: float(sA[min(n - 1, k * PER)] / sF[-1])
        tipf = float((sA[-1] + np.linalg.norm(np.diff(U, axis=0), axis=1).sum() / 2) / sF[-1])
        return res, {'inicio': at(2), 'olho': at(4), 'no': at(14), 'tag': tipf}
    obst, meta = hook_obstacles()
    steps = [('inicio', 'olho', 'Dobre 15 cm de linha e passe a dobra pelo olho do anzol.'),
             ('olho', 'no', 'Dê um nó simples com a linha dupla, sem apertar.'),
             ('no', 'tag', 'Passe a alça por cima do anzol.'),
             ('aperto', None, 'Molhe e aperte puxando as duas pontas.'),
             ('corte', None, 'Corte a sobra rente.')]
    return dict(geom=geom, obst=obst, meta=meta, steps=steps, mode='double', cut_fn=cut_after_x(0.55),
                view=dict(target=(-0.3, 0.0, 0.0), dist=9.2, az=-58))
