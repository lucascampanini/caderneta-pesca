"""Rope geometry + position-based-dynamics tightening for fishing knots.

Each knot is described as a loose, collision-free path (control points + helices), in tying order:
standing line (from the rod) -> ... -> tag end. The simulation then pins/pulls the ends and records
frames while the knot tightens. Output: JSON with per-frame particle positions for the line(s),
the static obstacles (hook / leader) and the chapter boundaries along the path.
"""
import json, math, sys
import numpy as np

R_LINE = 0.06          # line radius
SPACING = 0.03         # particle spacing along the rope

# ---------- path building ----------
def catmull(points, per=24):
    P = np.asarray(points, float)
    P = np.vstack([2 * P[0] - P[1], P, 2 * P[-1] - P[-2]])
    out = []
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        # centripetal-ish tension via chord lengths keeps loops from overshooting
        for t in np.linspace(0, 1, per, endpoint=False):
            t2, t3 = t * t, t * t * t
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3))
    out.append(P[-2])
    return np.array(out)

def helix(x0, x1, turns, rho, theta0=0.0, axis_y=0.0, axis_z=0.0, n_per_turn=40, rho1=None):
    n = max(8, int(turns * n_per_turn))
    t = np.linspace(0, 1, n)
    th = theta0 + 2 * math.pi * turns * t
    rr = rho if rho1 is None else rho + (rho1 - rho) * t
    return np.stack([x0 + (x1 - x0) * t, axis_y + rr * np.cos(th), axis_z + rr * np.sin(th)], 1)

def resample(poly, spacing=SPACING):
    poly = np.asarray(poly, float)
    seg = np.linalg.norm(np.diff(poly, axis=0), axis=1)
    s = np.concatenate([[0], np.cumsum(seg)])
    n = max(2, int(round(s[-1] / spacing)) + 1)
    u = np.linspace(0, s[-1], n)
    return np.stack([np.interp(u, s, poly[:, k]) for k in range(3)], 1), s[-1]

class Path:
    """Accumulates pieces; each piece is smoothed control points or an explicit polyline."""
    def __init__(self):
        self.pieces, self.marks = [], {}
    def ctrl(self, pts, per=24):
        self.pieces.append(('c', pts, per)); return self
    def poly(self, pts):
        self.pieces.append(('p', np.asarray(pts, float), 0)); return self
    def mark(self, name):
        self.pieces.append(('m', name, 0)); return self
    def build(self):
        pts, marks = [], {}
        for kind, data, per in self.pieces:
            if kind == 'm':
                marks[data] = len(pts) and len(np.vstack(pts)); continue
            seg = catmull(data, per) if kind == 'c' else data
            if pts:
                last = np.vstack(pts)[-1]
                if np.linalg.norm(seg[0] - last) < 1e-6: seg = seg[1:]
            pts.append(seg)
        dense = np.vstack(pts)
        # convert marks (dense indices) into arc-length fractions, then resample uniformly
        seg = np.linalg.norm(np.diff(dense, axis=0), axis=1)
        s = np.concatenate([[0], np.cumsum(seg)])
        res, L = resample(dense)
        fr = {k: float(s[min(v, len(s) - 1)] / L) for k, v in marks.items()}
        return res, fr

# ---------- obstacles ----------
def spheres_along(poly, radius, spacing=None):
    pts, _ = resample(poly, spacing or radius * 0.6)
    return pts, np.full(len(pts), radius)

def torus_spheres(R, w, center=(0, 0, 0), normal='x', n=72):
    th = np.linspace(0, 2 * math.pi, n, endpoint=False)
    c = np.array(center, float)
    if normal == 'x': pts = np.stack([np.zeros(n), R * np.cos(th), R * np.sin(th)], 1)
    elif normal == 'y': pts = np.stack([R * np.cos(th), np.zeros(n), R * np.sin(th)], 1)
    else: pts = np.stack([R * np.cos(th), R * np.sin(th), np.zeros(n)], 1)
    return pts + c, np.full(n, w)

# ---------- simulation ----------
def simulate(lines, obstacles, pulls, frames=60, iters=80, settle=60, max_stretch=0.03, bend=0.02, log=print):
    """lines: list of (N,3) arrays (one rope per line, collide with each other and themselves).
    obstacles: (M,3) centres + (M,) radii (static).
    pulls: list of dicts {line, index (0 or -1), dir (3,), dist} - pinned ends moved along dir.
    Returns list of frames, each a list of arrays (one per line)."""
    sizes = [len(l) for l in lines]
    off = np.cumsum([0] + sizes)
    X = np.vstack(lines).astype(float)
    N = len(X)
    lid = np.concatenate([np.full(n, k) for k, n in enumerate(sizes)])
    idx = np.arange(N)
    # rest lengths along each line
    nb_i = np.concatenate([np.arange(off[k], off[k + 1] - 1) for k in range(len(lines))])
    rest = np.linalg.norm(X[nb_i + 1] - X[nb_i], axis=1)
    b_i = np.concatenate([np.arange(off[k], off[k + 1] - 2) for k in range(len(lines))])
    rest2 = rest[np.searchsorted(nb_i, b_i)] * 2
    skip = int(math.ceil(2 * R_LINE / SPACING)) + 2
    # pair mask: same line & close in index -> ignore
    same = lid[:, None] == lid[None, :]
    near = np.abs(idx[:, None] - idx[None, :]) <= skip
    pair_ok = ~(same & near)
    np.fill_diagonal(pair_ok, False)
    I, J = np.where(np.triu(pair_ok, 1))
    O, OR = obstacles
    pins = {}
    for p in pulls:
        gi = off[p['line']] + (p['index'] if p['index'] >= 0 else sizes[p['line']] + p['index'])
        p['gi'] = gi; p['start'] = X[gi].copy(); p['moved'] = 0.0
        p['dir'] = np.asarray(p['dir'], float) / np.linalg.norm(p['dir'])
        pins[gi] = p
    pin_idx = np.array(sorted(pins)) if pins else np.array([], int)
    inv_mass = np.ones(N); inv_mass[pin_idx] = 0

    from solver_nb import project as _proj
    I = I.astype(np.int64); J = J.astype(np.int64); nb_i = nb_i.astype(np.int64); b_i = b_i.astype(np.int64)
    Oa = np.ascontiguousarray(O, dtype=np.float64) if len(O) else np.zeros((0, 3)); ORa = np.asarray(OR, dtype=np.float64) if len(O) else np.zeros(0)

    def project(n_it):
        _proj(X, inv_mass, nb_i, rest, b_i, rest2, I, J, Oa, ORa, R_LINE, n_it, bend)

    def stretch():
        L = np.linalg.norm(X[nb_i + 1] - X[nb_i], axis=1)
        return float(np.max(L / rest - 1))

    project(settle)
    base = stretch()
    out = [[X[off[k]:off[k + 1]].copy() for k in range(len(lines))]]
    for f in range(frames):
        stepped = {}
        for gi, p in pins.items():
            if p['moved'] < p['dist'] and not p.get('done'):
                step = min(p['dist'] / frames * 1.6, p['dist'] - p['moved'])
                p['moved'] += step; stepped[gi] = step
            X[gi] = p['start'] + p['dir'] * p['moved']
        snap = X.copy()
        project(iters)
        st = stretch()
        if st > base + max_stretch and stepped:
            # the knot locked: undo this pull step and stop pulling (like a hand feeling it bite)
            X[:] = snap
            for gi, step in stepped.items():
                p = pins[gi]; p['moved'] -= step; p['done'] = True; X[gi] = p['start'] + p['dir'] * p['moved']
            project(iters * 2)
            st = stretch()
        out.append([X[off[k]:off[k + 1]].copy() for k in range(len(lines))])
        if f % 10 == 0 or stepped and any(pins[g].get('done') for g in stepped):
            log(f'frame {f} stretch {st:.4f} moved {[round(p["moved"], 2) for p in pins.values()]} done {[bool(p.get("done")) for p in pins.values()]}')
    return out

def dump(path, name, lines_frames, obstacles_meta, marks, extra):
    data = {
        'name': name, 'r_line': R_LINE,
        'frames': [[np.round(l, 4).tolist() for l in fr] for fr in lines_frames],
        'obstacles': obstacles_meta, 'marks': marks, **extra,
    }
    with open(path, 'w') as f: json.dump(data, f)


# ---------- morph-based tightening (designed loose -> designed tight, collision-relaxed) ----------
def _extend_to(pts, L_target):
    pts = np.asarray(pts, float)
    L = np.linalg.norm(np.diff(pts, axis=0), axis=1).sum()
    if L_target > L + 1e-9:
        d = pts[-1] - pts[-2]; d /= np.linalg.norm(d)
        pts = np.vstack([pts, pts[-1] + d * (L_target - L)])
    return pts

def morph_frames(geom, frames=40, relax_iters=40, obstacles=None, log=print, extra_lines=None, stub=0.35, tail=1.3):
    """geom(t) -> (dense_pts, marks) for t in [0,1] with identical structure. Returns frames [[line]], marks(t=0)."""
    from solver_nb import project as _proj
    loose, marks = geom(0.0)
    tight, _ = geom(1.0)
    L0 = np.linalg.norm(np.diff(loose, axis=0), axis=1).sum()
    L1 = np.linalg.norm(np.diff(tight, axis=0), axis=1).sum()
    L = max(L0, L1)
    N = int(round(L / SPACING)) + 1
    O, OR = obstacles if obstacles is not None else (np.zeros((0, 3)), np.zeros(0))
    O = np.ascontiguousarray(O, dtype=np.float64); OR = np.asarray(OR, dtype=np.float64)
    out = []
    prev = prev_target = None
    skip = int(math.ceil(2 * R_LINE / SPACING)) + 2
    idx = np.arange(N)
    I, J = np.where(np.triu(np.abs(idx[:, None] - idx[None, :]) > skip, 1))
    I = I.astype(np.int64); J = J.astype(np.int64)
    nb_i = np.arange(N - 1, dtype=np.int64); b_i = np.arange(N - 2, dtype=np.int64)
    for fi in range(frames + 1):
        t = fi / frames
        t = t * t * (3 - 2 * t)                       # ease in-out
        pts, _ = geom(t)
        pts = _extend_to(pts, L)
        X, _ = resample(pts, L / (N - 1))
        X = X[:N] if len(X) >= N else np.vstack([X, np.repeat(X[-1:], N - len(X), 0)])
        target = X.copy()
        if prev is not None:                          # start from last relaxed state + target motion
            X = 0.5 * (prev + (target - prev_target)) + 0.5 * target   # carry contacts, but don't drift
        rest = np.linalg.norm(np.diff(X, axis=0), axis=1)
        rest2 = rest[:-1] + rest[1:]
        w = np.ones(N); w[0] = 0; w[-1] = 0
        X = np.ascontiguousarray(X)
        _proj(X, w, nb_i, rest, b_i, rest2, I, J, O, OR, R_LINE, relax_iters, 0.0)
        out.append([X.copy()])
        prev, prev_target = X.copy(), target
    if log: log(f'morph: {frames + 1} frames, N={N}, L_loose={L0:.2f} L_tight={L1:.2f}')
    fr = {k: v * L0 / L for k, v in marks.items()}   # marks were fractions of the loose length
    # trim point: keep `stub` of line beyond where the knot ends (the designed tight end minus its free tail)
    fr['_corte'] = (L1 - tail + stub) / L
    return out, fr
