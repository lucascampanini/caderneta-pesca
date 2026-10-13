"""Knot definitions: loose path in tying order + obstacles + pulls. Run: knots_def.py OUTDIR [names]"""
import sys, math, json, pathlib
import numpy as np
from knotsim import Path, helix, torus_spheres, spheres_along, simulate, dump, resample, R_LINE, morph_frames

EYE_R, EYE_W = 0.45, 0.065

def hook_centerline():
    """Eye ring (normal X, at origin) + shank towards -X + bend + point. Returns (eye ring, shank polyline)."""
    shank = [(0.0, 0, -EYE_R), (-0.25, 0, -EYE_R - 0.06), (-0.8, 0, -EYE_R - 0.08), (-3.6, 0, -EYE_R - 0.08),
             (-4.25, 0, -0.85), (-4.45, 0, -1.6), (-4.0, 0, -2.25), (-3.25, 0, -2.3), (-2.75, 0, -1.85), (-2.6, 0, -1.25)]
    return shank

def hook_obstacles():
    from knotsim import catmull
    ring = torus_spheres(EYE_R, EYE_W, normal='x', n=90)
    sh = catmull(hook_centerline(), 16)
    shs = spheres_along(sh, EYE_W, 0.04)
    O = np.vstack([ring[0], shs[0]]); OR = np.concatenate([ring[1], shs[1]])
    return (O, OR), {'type': 'hook', 'eye_r': EYE_R, 'wire': EYE_W, 'shank': [list(p) for p in hook_centerline()]}

def L(a, b, t):
    """lerp lists of points (or scalars)."""
    if isinstance(a, (int, float)): return a + (b - a) * t
    return [tuple(x + (y - x) * t for x, y in zip(p, q)) for p, q in zip(a, b)]

# ---------------- Clinch melhorado ----------------
def clinch():
    def geom(t):
        rho = L(0.155, 0.125, t)
        hx0, hx1 = L(1.1, 0.42, t), L(3.25, 1.30, t)
        p = Path()
        p.ctrl(L([(8.0, 0, 0), (5.0, 0, 0), (3.4, 0, 0), (1.2, 0, 0), (0.55, 0, 0.04)],
                 [(8.0, 0, 0), (5.0, 0, 0), (3.0, 0, 0), (1.4, 0, 0), (0.5, 0.08, 0.0)], t), 10)
        p.mark('tag')
        p.ctrl(L([(0.55, 0, 0.04), (0.0, 0, 0.1), (-0.5, 0, 0.1), (-0.85, 0.28, 0.02), (-0.45, 0.66, 0.0), (0.3, 0.66, 0.0), (0.85, 0.42, 0.0), (1.1, 0.155, 0.0)],
                 [(0.5, 0.08, 0.0), (0.0, 0.26, 0.0), (-0.16, 0.36, 0.0), (-0.15, 0.5, 0.0), (0.02, 0.63, 0.0), (0.22, 0.52, 0.03), (0.36, 0.27, 0.04), (0.42, 0.125, 0.0)], t), 18)
        p.mark('voltas')
        p.poly(helix(hx0, hx1, 6, rho, 0.0))
        p.mark('volta_alca')
        p.ctrl(L([(3.25, 0.155, 0.0), (3.55, 0.36, 0.22), (3.1, 0.56, 0.55), (1.6, 0.6, 0.55), (0.75, 0.4, 0.42), (0.58, 0.3, 0.2), (0.52, 0.3, -0.35)],
                 [(1.30, 0.125, 0.0), (1.44, 0.22, 0.16), (1.25, 0.27, 0.26), (0.8, 0.31, 0.28), (0.26, 0.42, 0.22), (0.14, 0.43, 0.1), (0.13, 0.43, -0.2)], t), 18)
        p.mark('alca_grande')
        p.ctrl(L([(0.52, 0.3, -0.35), (1.25, 0.62, -0.25), (2.0, 0.64, 0.0), (2.1, 0.32, 0.3), (2.2, 0.02, 0.66), (2.5, -0.15, 1.1), (2.8, -0.25, 1.5)],
                 [(0.13, 0.43, -0.2), (0.42, 0.52, -0.13), (0.68, 0.44, 0.0), (0.79, 0.25, 0.14), (0.88, 0.06, 0.42), (1.12, -0.1, 0.72), (1.65, -0.22, 1.15)], t), 18)
        return p.build()
    obst, meta = hook_obstacles()
    steps = [('tag', 'voltas', 'Passe a ponta pelo olho do anzol e volte ao lado da linha.'),
             ('voltas', 'volta_alca', 'Enrole a ponta 5 a 7 voltas na linha principal.'),
             ('volta_alca', 'alca_grande', 'Volte a ponta pela primeira alça, junto ao olho.'),
             ('alca_grande', 'end', 'Passe a ponta pela alça grande que se formou (o "melhorado").'),
             ('aperto', None, 'Molhe e puxe a linha principal: as voltas deslizam até o olho.'),
             ('corte', None, 'Corte a sobra deixando uns 3 mm.')]
    return dict(geom=geom, stub=0.3, tail=1.05, obst=obst, meta=meta, steps=steps, view=dict(target=(1.0, 0.1, 0.1), dist=8.5))

import knots_more as KM
KNOTS = {'clinch': clinch,
         'uni': lambda: KM.uni(hook_obstacles), 'fg': KM.fg, 'albright': KM.albright,
         'loop': lambda: KM.loop(hook_obstacles), 'palomar': lambda: KM.palomar(hook_obstacles)}

if __name__ == '__main__':
    out = pathlib.Path(sys.argv[1]); out.mkdir(exist_ok=True)
    names = sys.argv[2:] or list(KNOTS)
    for n in names:
        k = KNOTS[n]()
        log = lambda m: print(n, m, flush=True)
        if 'geom' in k:
            frames, marks = morph_frames(k['geom'], frames=k.get('frames', 40), obstacles=k['obst'], log=log, stub=k.get('stub', 0.35), tail=k.get('tail', 1.0))
            split = [marks['tag']]
            if 'cut_fn' in k:
                marks.pop('_corte', None)
                F = frames[-1][0]; si = int(round(split[0] * (len(F) - 1)))
                marks['corte'] = (si + k['cut_fn'](F[si:])) / (len(F) - 1)
            else:
                marks['corte'] = marks.pop('_corte')
        else:
            frames = simulate(k['lines'], k['obst'], k['pulls'], frames=k.get('frames', 60), log=log)
            marks, split = k['marks'], k['split']
        dump(out / f'{n}.json', n, frames, k['meta'], marks,
             {'split': split, 'steps': k['steps'], 'leaders': k.get('leaders'), 'view': k.get('view', {}), 'mode': k.get('mode', 'tag')})
        print(n, 'particles', [len(l) for l in frames[0]], 'marks', {a: round(b, 3) for a, b in marks.items()})
