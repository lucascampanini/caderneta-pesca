"""Compiled Gauss-Seidel projection for the rope solver (numba)."""
import numpy as np
from numba import njit


@njit(cache=True)
def _dist_pair(X, w, a, b, rest, k):
    dx = X[b, 0] - X[a, 0]; dy = X[b, 1] - X[a, 1]; dz = X[b, 2] - X[a, 2]
    L = np.sqrt(dx * dx + dy * dy + dz * dz) + 1e-12
    ws = w[a] + w[b]
    if ws == 0.0:
        return
    c = (L - rest) / L * k / ws
    X[a, 0] += w[a] * c * dx; X[a, 1] += w[a] * c * dy; X[a, 2] += w[a] * c * dz
    X[b, 0] -= w[b] * c * dx; X[b, 1] -= w[b] * c * dy; X[b, 2] -= w[b] * c * dz


@njit(cache=True)
def _ftl(X, w, a, b, rest, lead_a):
    """Follow-the-leader: only the follower moves (unless it is pinned)."""
    dx = X[b, 0] - X[a, 0]; dy = X[b, 1] - X[a, 1]; dz = X[b, 2] - X[a, 2]
    L = np.sqrt(dx * dx + dy * dy + dz * dz) + 1e-12
    c = (L - rest) / L
    if lead_a:
        if w[b] == 0.0:
            _dist_pair(X, w, a, b, rest, 1.0); return
        X[b, 0] -= c * dx; X[b, 1] -= c * dy; X[b, 2] -= c * dz
    else:
        if w[a] == 0.0:
            _dist_pair(X, w, a, b, rest, 1.0); return
        X[a, 0] += c * dx; X[a, 1] += c * dy; X[a, 2] += c * dz


@njit(cache=True)
def project(X, w, nb_i, rest, b_i, rest2, I, J, O, OR, r, iters, bend):
    n_nb = nb_i.shape[0]
    n_b = b_i.shape[0]
    n_p = I.shape[0]
    M = O.shape[0]
    N = X.shape[0]
    two_r = 2.0 * r
    for it in range(iters):
        # stretch: alternate sweep direction so tension crosses the whole rope each iteration
        if it % 2 == 0:
            for e in range(n_nb):
                _ftl(X, w, nb_i[e], nb_i[e] + 1, rest[e], True)
        else:
            for e in range(n_nb - 1, -1, -1):
                _ftl(X, w, nb_i[e], nb_i[e] + 1, rest[e], False)
        if it == iters - 1:
            for e in range(n_nb):
                _dist_pair(X, w, nb_i[e], nb_i[e] + 1, rest[e], 1.0)
        # bending: only resists folding (distance i..i+2 shorter than straight)
        for e in range(n_b):
            a = b_i[e]; b = a + 2
            dx = X[b, 0] - X[a, 0]; dy = X[b, 1] - X[a, 1]; dz = X[b, 2] - X[a, 2]
            L = np.sqrt(dx * dx + dy * dy + dz * dz)
            if L < rest2[e]:
                _dist_pair(X, w, a, b, rest2[e], bend)
        # rope-rope contact
        for p in range(n_p):
            a = I[p]; b = J[p]
            dx = X[b, 0] - X[a, 0]
            if dx > two_r or dx < -two_r:
                continue
            dy = X[b, 1] - X[a, 1]
            if dy > two_r or dy < -two_r:
                continue
            dz = X[b, 2] - X[a, 2]
            L2 = dx * dx + dy * dy + dz * dz
            if L2 < two_r * two_r:
                _dist_pair(X, w, a, b, two_r, 1.0)
        # static obstacles
        for i in range(N):
            if w[i] == 0.0:
                continue
            for m in range(M):
                dx = X[i, 0] - O[m, 0]; dy = X[i, 1] - O[m, 1]; dz = X[i, 2] - O[m, 2]
                mn = OR[m] + r
                L2 = dx * dx + dy * dy + dz * dz
                if L2 < mn * mn:
                    L = np.sqrt(L2) + 1e-12
                    s = (mn - L) / L
                    X[i, 0] += dx * s; X[i, 1] += dy * s; X[i, 2] += dz * s
