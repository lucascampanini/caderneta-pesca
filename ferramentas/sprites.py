"""Blender: procedural 3D tackle sprites (transparent PNG) for the rig diagrams.
blender -b --factory-startup --python sprites.py -- OUTDIR [only1,only2]
All parts hang vertically: the line attaches at the top (+Z). Units: 1 = one 'rig unit'."""
import bpy, bmesh, sys, os, math, json
from mathutils import Vector, Matrix

argv = sys.argv[sys.argv.index('--') + 1:]
OUT = argv[0]; os.makedirs(OUT, exist_ok=True)
ONLY = set(argv[1].split(',')) if len(argv) > 1 and argv[1] else None
PX_PER_UNIT = 230          # render scale (pixels per unit)

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = 'CYCLES'
prefs = bpy.context.preferences.addons['cycles'].preferences
prefs.compute_device_type = 'OPTIX'; prefs.get_devices()
for d in prefs.devices: d.use = d.type == 'OPTIX'
sc.cycles.device = 'GPU'; sc.cycles.samples = 64; sc.cycles.use_denoising = True; sc.cycles.denoiser = 'OPTIX'
sc.render.film_transparent = True
sc.view_settings.view_transform = 'AgX'; sc.view_settings.look = 'AgX - Medium High Contrast'
sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'

world = bpy.data.worlds.new('w'); sc.world = world; world.use_nodes = True
bg = world.node_tree.nodes['Background']; bg.inputs['Color'].default_value = (0.55, 0.6, 0.62, 1); bg.inputs['Strength'].default_value = 0.55

def light(name, loc, energy, size, color=(1, 1, 1)):
    l = bpy.data.lights.new(name, 'AREA'); l.energy = energy; l.size = size; l.color = color
    o = bpy.data.objects.new(name, l); o.location = loc; sc.collection.objects.link(o)
    o.rotation_euler = (Vector((0, 0, 0)) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
light('key', (-3, -5, 4), 600, 4, (1, 0.97, 0.92))
light('fill', (4, -4, 0), 220, 5, (0.88, 0.94, 1))
light('rim', (1, 5, 3), 450, 3)

cam_d = bpy.data.cameras.new('cam'); cam_d.type = 'ORTHO'
cam = bpy.data.objects.new('cam', cam_d); sc.collection.objects.link(cam); sc.camera = cam
cam.location = (0, -10, 0); cam.rotation_euler = (math.radians(90), 0, 0)

# ---------------- materials ----------------
def principled(name, color, rough=0.4, metal=0.0, coat=0.0, trans=0.0, sss=0.0, emit=None, alpha=1.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1); b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal; b.inputs['Coat Weight'].default_value = coat
    b.inputs['Transmission Weight'].default_value = trans
    if sss: b.inputs['Subsurface Weight'].default_value = sss; b.inputs['Subsurface Radius'].default_value = (0.1, 0.05, 0.03)
    if emit: b.inputs['Emission Color'].default_value = (*emit, 1); b.inputs['Emission Strength'].default_value = 0.6
    return m

def srgb(h):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(((v + 0.055) / 1.055) ** 2.4 if v > 0.04045 else v / 12.92 for v in c)

def two_tone(name, back, belly, metal=0.0, rough=0.3, coat=0.6, trans=0.0, scales=True, edge=0.0):
    """Lure paint: back colour on -X, belly on +X (object space), glossy coat, subtle scale bump."""
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree
    b = nt.nodes['Principled BSDF']
    tc = nt.nodes.new('ShaderNodeTexCoord'); sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(tc.outputs['Object'], sep.inputs[0])
    mr = nt.nodes.new('ShaderNodeMapRange'); mr.inputs['From Min'].default_value = -0.12; mr.inputs['From Max'].default_value = 0.12
    nt.links.new(sep.outputs['X'], mr.inputs['Value'])
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].position = 0.35; ramp.color_ramp.elements[0].color = (*back, 1)
    ramp.color_ramp.elements[1].position = 0.62; ramp.color_ramp.elements[1].color = (*belly, 1)
    nt.links.new(mr.outputs['Result'], ramp.inputs['Fac'])
    nt.links.new(ramp.outputs['Color'], b.inputs['Base Color'])
    b.inputs['Metallic'].default_value = metal; b.inputs['Roughness'].default_value = rough
    b.inputs['Coat Weight'].default_value = coat; b.inputs['Transmission Weight'].default_value = trans
    if scales:
        vo = nt.nodes.new('ShaderNodeTexVoronoi'); vo.inputs['Scale'].default_value = 60
        nt.links.new(tc.outputs['Object'], vo.inputs['Vector'])
        bm = nt.nodes.new('ShaderNodeBump'); bm.inputs['Strength'].default_value = 0.18; bm.inputs['Distance'].default_value = 0.01
        nt.links.new(vo.outputs['Distance'], bm.inputs['Height']); nt.links.new(bm.outputs['Normal'], b.inputs['Normal'])
    return m

M = {
    'metal': principled('metal', (0.62, 0.64, 0.66), 0.2, 1.0),
    'black_nickel': principled('bn', (0.08, 0.08, 0.09), 0.25, 1.0),
    'gold': principled('gold', (0.9, 0.62, 0.22), 0.25, 1.0),
    'lead': principled('lead', (0.28, 0.3, 0.31), 0.55, 0.6),
    'bead': principled('bead', srgb('#c7312b'), 0.12, 0.0, 0.8),
    'float_top': principled('ft', srgb('#e5532d'), 0.25, 0.0, 0.7),
    'float_bot': principled('fb', srgb('#f4f2ea'), 0.3, 0.0, 0.6),
    'eye_w': principled('eyew', (0.95, 0.82, 0.2), 0.15, 0.0, 1.0),
    'eye_b': principled('eyeb', (0.01, 0.01, 0.01), 0.1, 0.0, 1.0),
    'lip': principled('lip', (0.85, 0.9, 0.92), 0.05, 0.0, 0.5, trans=0.9),
    'carbon': principled('carbon', (0.04, 0.045, 0.05), 0.3, 0.2, 0.9),
    'cork': principled('cork', (0.55, 0.38, 0.22), 0.8),
}

# ---------------- geometry helpers ----------------
def new_obj(name, bm, mat):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me); sc.collection.objects.link(ob)
    ob.data.materials.append(mat)
    for p in me.polygons: p.use_smooth = True
    return ob

def lathe(name, prof, mat, flat=1.0, seg=40, z0=0.0, bend=None):
    """prof: list of (z, r) from top to bottom; cross-section ellipse rx=r, ry=r*flat. bend(z)->x offset."""
    bm = bmesh.new(); rings = []
    for z, r in prof:
        ring = []
        for i in range(seg):
            a = 2 * math.pi * i / seg
            x = r * math.cos(a) + (bend(z) if bend else 0); y = r * flat * math.sin(a)
            ring.append(bm.verts.new((x, y, z + z0)))
        rings.append(ring)
    for k in range(len(rings) - 1):
        for i in range(seg):
            a, b = rings[k][i], rings[k][(i + 1) % seg]; c, d = rings[k + 1][(i + 1) % seg], rings[k + 1][i]
            bm.faces.new((a, b, c, d))
    if prof[0][1] > 1e-4: bm.faces.new(list(reversed(rings[0])))
    if prof[-1][1] > 1e-4: bm.faces.new(rings[-1])
    return new_obj(name, bm, mat)

def smooth_prof(pts, n=40):
    """Catmull-Rom over (z, r) control points."""
    out = []
    P = [pts[0]] + pts + [pts[-1]]
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        for t in [j / n for j in range(n)]:
            out.append(tuple(0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t * t + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t ** 3) for k in range(2)))
    out.append(pts[-1])
    return [(z, max(0.0, r)) for z, r in out]

def tube(name, pts, radius, mat, cyclic=False):
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '3D'
    cu.bevel_mode = 'ROUND'; cu.bevel_depth = radius; cu.bevel_resolution = 5; cu.use_fill_caps = True; cu.resolution_u = 16
    sp = cu.splines.new('NURBS'); sp.points.add(len(pts) - 1)
    for p, q in zip(sp.points, pts): p.co = (*q, 1)
    sp.order_u = min(4, len(pts)); sp.use_endpoint_u = not cyclic; sp.use_cyclic_u = cyclic
    ob = bpy.data.objects.new(name, cu); sc.collection.objects.link(ob); ob.data.materials.append(mat)
    return ob

def ring(name, center, R, w, mat, axis='y'):
    pts = []
    for i in range(24):
        a = 2 * math.pi * i / 24
        if axis == 'y': pts.append((center[0] + R * math.cos(a), center[1], center[2] + R * math.sin(a)))
        else: pts.append((center[0], center[1] + R * math.cos(a), center[2] + R * math.sin(a)))
    return tube(name, pts, w, mat, cyclic=True)

def sphere(name, loc, r, mat, scale=(1, 1, 1)):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=r, location=loc)
    ob = bpy.context.active_object; ob.scale = scale; ob.data.materials.append(mat); bpy.ops.object.shade_smooth()
    ob.name = name; return ob

def hook_pts(kind='wide', s=1.0):
    """Hook centreline hanging from the eye at the top (0,0,0). Point faces up on the -X side."""
    if kind == 'circular':
        P = [(0, 0, 0), (0, 0, -0.25), (0.02, 0, -0.5), (-0.1, 0, -0.72), (-0.34, 0, -0.74), (-0.46, 0, -0.55), (-0.42, 0, -0.36), (-0.3, 0, -0.3)]
    elif kind == 'maruseigo':
        P = [(0, 0, 0), (0, 0, -0.22), (0.0, 0, -0.42), (-0.12, 0, -0.6), (-0.34, 0, -0.6), (-0.42, 0, -0.42), (-0.4, 0, -0.22)]
    elif kind == 'haste':
        P = [(0, 0, 0), (0, 0, -0.5), (0, 0, -0.85), (-0.12, 0, -1.05), (-0.34, 0, -1.04), (-0.42, 0, -0.86), (-0.4, 0, -0.66)]
    elif kind == 'offset':
        P = [(0, 0, 0), (0, 0, -0.08), (-0.1, 0, -0.16), (-0.1, 0, -0.24), (0, 0, -0.3), (0, 0, -0.62), (-0.14, 0, -0.84), (-0.4, 0, -0.84), (-0.5, 0, -0.62), (-0.48, 0, -0.38)]
    else:
        P = [(0, 0, 0), (0, 0, -0.3), (0, 0, -0.55), (-0.13, 0, -0.76), (-0.38, 0, -0.76), (-0.48, 0, -0.56), (-0.46, 0, -0.34)]
    return [(x * s, y * s, z * s) for x, y, z in P]

def make_hook(name, kind='wide', s=1.0, w=0.028, mat=None, loc=(0, 0, 0), rot_z=0.0, eye=True):
    mat = mat or M['black_nickel']
    P = hook_pts(kind, s)
    R = Matrix.Rotation(rot_z, 4, 'Z')
    P = [tuple(Vector(loc) + R @ Vector(p)) for p in P]
    objs = [tube(name, P, w * s, mat)]
    tip, prev = Vector(P[-1]), Vector(P[-2]); d = (tip - prev).normalized()
    bpy.ops.mesh.primitive_cone_add(vertices=16, radius1=w * s, radius2=0, depth=0.12 * s, location=tip + d * 0.06 * s)
    c = bpy.context.active_object; c.rotation_mode = 'QUATERNION'; c.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(d)
    c.data.materials.append(mat); objs.append(c)
    side = (R @ Vector((1, 0, 0))).normalized()
    objs.append(tube(name + '_farpa', [tuple(tip - d * 0.02 * s), tuple(tip - d * 0.06 * s + side * 0.06 * s), tuple(tip - d * 0.12 * s + side * 0.07 * s)], w * 0.6 * s, mat))
    if eye: objs.append(ring(name + '_olho', (loc[0], loc[1], loc[2] + 0.06 * s), 0.06 * s, w * 0.9 * s, mat))
    return objs

def treble(name, loc, s=0.55):
    objs = []
    for k in range(3):
        objs += make_hook(f'{name}{k}', 'wide', s, 0.03, M['black_nickel'], loc=loc, rot_z=k * 2 * math.pi / 3, eye=False)
    objs.append(ring(name + '_argola', (loc[0], loc[1], loc[2] + 0.08), 0.07, 0.015, M['metal']))
    return objs

def eyes(name, z, x, r, flat):
    return [sphere(name + 'w', (x, -r * 0.2 - flat, z), r, M['eye_w'], (1, 0.4, 1)), sphere(name + 'b', (x, -r * 0.6 - flat, z), r * 0.5, M['eye_b'], (1, 0.4, 1))]

# ---------------- colour schemes for lures ----------------
CORES = {
    'prata': ('#6c7a82', '#e6eaec', 1.0), 'osso': ('#d9cdb2', '#f4efe2', 0.0), 'natural': ('#4f6b64', '#dfe7e2', 0.4),
    'transp': ('#bcd4d8', '#eef7f8', 0.0), 'branco': ('#e9e9e4', '#ffffff', 0.0), 'dorsoverde': ('#2f5a2e', '#efeee0', 0.0),
    'dourado': ('#9a6a14', '#f2cf6a', 1.0), 'limao': ('#8fae12', '#e9f56b', 0.0), 'fogo': ('#e7452a', '#f9d33a', 0.0),
    'preto': ('#0e0e0e', '#2b2b2b', 0.0), 'roxo': ('#3e2163', '#8a63c0', 0.0), 'vermelho': ('#8f1612', '#e04a3c', 0.0),
    'laranja': ('#c8470e', '#ff9a3c', 0.0), 'amarelo': ('#d9a90c', '#fff07a', 0.0), 'glow': ('#a9d98a', '#f0ffd8', 0.0),
}
def paint(cor):
    back, belly, metal = CORES[cor]
    return two_tone('tinta_' + cor, srgb(back), srgb(belly), metal=metal, rough=0.18 if metal else 0.3,
                    trans=0.6 if cor == 'transp' else 0.0)

# ---------------- lure builders (head at the top, z from 0 downwards) ----------------
def fish_prof(L, rmax, head=0.25, tail=0.08):
    return smooth_prof([(0, 0.0), (-0.03 * L, rmax * 0.55), (-head * L, rmax), (-0.55 * L, rmax * 0.92), (-0.88 * L, rmax * 0.45), (-L, tail * rmax)], 10)

def lure(art, cor):
    m = paint(cor); objs = []
    if art in ('zara', 'helice'):
        L = 1.15 if art == 'zara' else 1.0
        b = lathe('corpo', smooth_prof([(0, 0.0), (-0.04, 0.07), (-0.3, 0.125), (-0.7, 0.115), (-L + 0.05, 0.05), (-L, 0.0)], 10), m, 0.92)
        objs += [b] + eyes('o', -0.13, -0.05, 0.035, 0.08)
        objs += [ring('argola', (0, 0, 0.04), 0.035, 0.012, M['metal'])]
        objs += treble('g1', (0, 0, -0.42), 0.42) + treble('g2', (0, 0, -L - 0.05), 0.42)
        if art == 'helice':
            for zz in (0.02, -L - 0.01):
                for k in range(2):
                    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, zz))
                    bl = bpy.context.active_object; bl.scale = (0.2, 0.01, 0.05); bl.rotation_euler = (0.5 if k else -0.5, 0, k * math.pi)
                    bl.data.materials.append(M['metal']); objs.append(bl)
    elif art == 'popper':
        b = lathe('corpo', smooth_prof([(0, 0.13), (-0.08, 0.15), (-0.45, 0.12), (-0.8, 0.06), (-0.9, 0.0)], 10), m, 1.0)
        face = lathe('boca', [(0.005, 0.0), (0.005, 0.12), (-0.04, 0.12), (-0.04, 0.0)], principled('bocap', (0.05, 0.05, 0.05), 0.3), 1.0)
        objs += [b, face] + eyes('o', -0.14, -0.06, 0.035, 0.1)
        objs += [ring('argola', (0, 0, 0.05), 0.035, 0.012, M['metal'])] + treble('g1', (0, 0, -0.42), 0.42) + treble('g2', (0, 0, -0.95), 0.42)
    elif art == 'sapo':
        b = lathe('corpo', smooth_prof([(0, 0.0), (-0.05, 0.1), (-0.25, 0.18), (-0.5, 0.17), (-0.62, 0.05), (-0.64, 0.0)], 10), m, 0.65)
        objs += [b] + eyes('o', -0.1, -0.08, 0.04, 0.05) + eyes('o2', -0.1, 0.08, 0.04, 0.05)
        sk = principled('saia', srgb(CORES[cor][1]), 0.5)
        for k in range(-3, 4):
            objs.append(tube(f'perna{k}', [(0.04 * k, 0, -0.58), (0.06 * k, 0.0, -0.75), (0.09 * k, 0, -0.95)], 0.012, sk))
        for side in (-1, 1):
            objs += make_hook('anzold' + str(side), 'wide', 0.55, 0.03, loc=(0.0, 0, -0.05), rot_z=math.pi / 2 + side * 0.35, eye=False)
        objs += [ring('argola', (0, 0, 0.03), 0.035, 0.012, M['metal'])]
    elif art in ('meia', 'crank'):
        L, rm, fl = (1.1, 0.11, 0.7) if art == 'meia' else (0.75, 0.17, 0.75)
        b = lathe('corpo', fish_prof(L, rm, 0.32 if art == 'meia' else 0.4, 0.3), m, fl)
        objs += [b] + eyes('o', -0.1 * L / 0.75, -0.04, 0.032, rm * fl * 0.6)
        bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.1 if art == 'meia' else 0.16, depth=0.01, location=(0.07, 0, 0.06 if art == 'meia' else 0.1))
        lp = bpy.context.active_object; lp.scale = (0.9, 0.55, 1); lp.rotation_euler = (0, math.radians(-35), 0); lp.data.materials.append(M['lip']); objs.append(lp)
        objs += [ring('argola', (0.0, 0, 0.05), 0.03, 0.012, M['metal'])] + treble('g1', (0.02, 0, -0.42 * L), 0.4) + treble('g2', (0, 0, -L - 0.05), 0.4)
    elif art == 'jig':
        hd = sphere('cabeca', (0, 0, -0.08), 0.1, paint(cor) if cor != 'prata' else M['lead'])
        objs += [hd] + eyes('o', -0.07, -0.03, 0.028, 0.07)
        sk = principled('saia_' + cor, srgb(CORES[cor][1]), 0.45, sss=0.2)
        sk2 = principled('saia2_' + cor, srgb(CORES[cor][0]), 0.45, sss=0.2)
        for k in range(28):
            a = 2 * math.pi * k / 28
            objs.append(tube(f'fio{k}', [(0.06 * math.cos(a), 0.06 * math.sin(a), -0.15), (0.1 * math.cos(a), 0.1 * math.sin(a), -0.4), (0.14 * math.cos(a) + 0.02 * math.sin(3 * a), 0.12 * math.sin(a), -0.75)], 0.008, sk if k % 3 else sk2))
        objs += make_hook('anzol', 'wide', 0.8, 0.03, loc=(0, 0, -0.12), eye=False) + [ring('argola', (0, 0, 0.02), 0.03, 0.012, M['metal'])]
    elif art == 'shad':
        hd = sphere('cabeca', (0, 0, -0.07), 0.08, M['lead'])
        b = lathe('corpo', smooth_prof([(-0.09, 0.07), (-0.25, 0.1), (-0.6, 0.07), (-0.8, 0.035), (-0.86, 0.03)], 10), m, 0.6)
        tl = sphere('cauda', (0.03, 0, -0.93), 0.1, m, (0.55, 1.0, 0.9))
        tl.rotation_euler = (0, math.radians(25), 0)
        objs += [hd, b, tl] + eyes('o', -0.06, -0.02, 0.025, 0.06) + [ring('argola', (0, 0, 0.02), 0.03, 0.012, M['metal'])]
    elif art == 'colher':
        mm = M['gold'] if cor == 'dourado' else M['metal']
        b = lathe('colher', smooth_prof([(0, 0.0), (-0.08, 0.1), (-0.35, 0.17), (-0.62, 0.12), (-0.72, 0.0)], 10), mm, 0.18)
        stripe = lathe('faixa', smooth_prof([(-0.12, 0.0), (-0.2, 0.06), (-0.45, 0.08), (-0.6, 0.0)], 8), principled('fx_' + cor, srgb(CORES[cor][0]), 0.3), 0.2)
        stripe.location.y = -0.012
        objs += [b, stripe, ring('argola', (0, 0, 0.03), 0.035, 0.012, M['metal'])] + treble('g', (0, 0, -0.8), 0.42)
    elif art == 'spinner':
        objs.append(tube('haste', [(0, 0, 0.04), (0, 0, -0.3), (0, 0, -0.75)], 0.01, M['metal']))
        bl = lathe('pa', smooth_prof([(-0.05, 0.0), (-0.12, 0.08), (-0.25, 0.09), (-0.33, 0.0)], 8), M['gold'] if cor == 'dourado' else M['metal'], 0.15)
        bl.location.x = 0.09; bl.rotation_euler = (0, math.radians(18), math.radians(25))
        body = lathe('corpo', smooth_prof([(-0.36, 0.0), (-0.38, 0.04), (-0.5, 0.05), (-0.62, 0.04), (-0.65, 0.0)], 8), m, 1.0)
        objs += [bl, body, ring('argola', (0, 0, 0.06), 0.03, 0.01, M['metal'])] + treble('g', (0, 0, -0.78), 0.4)
    return objs

# ---------------- natural baits ----------------
def natural(ic):
    objs = []
    if ic == 'tuvira':
        m = two_tone('tuv', srgb('#4a3424'), srgb('#9a7a58'), rough=0.35, coat=0.3)
        objs.append(lathe('tuvira', smooth_prof([(0, 0.0), (-0.04, 0.05), (-0.15, 0.075), (-0.6, 0.06), (-1.1, 0.03), (-1.35, 0.005)], 10), m, 0.55,
                          bend=lambda z: 0.08 * math.sin(z * 4.5)))
        objs += eyes('o', -0.06, -0.02, 0.018, 0.03)
    elif ic == 'peixe':
        m = two_tone('lamb', srgb('#55716a'), srgb('#e9eeec'), metal=0.6, rough=0.2)
        objs.append(lathe('lambari', fish_prof(0.75, 0.1, 0.3, 0.15), m, 0.45))
        bpy.ops.mesh.primitive_cylinder_add(vertices=3, radius=0.1, depth=0.01, location=(0, 0, -0.82))
        t = bpy.context.active_object; t.rotation_euler = (math.radians(90), 0, math.radians(30)); t.data.materials.append(principled('cauda', srgb('#c9b06a'), 0.4)); objs.append(t)
        objs += eyes('o', -0.08, -0.02, 0.025, 0.04)
    elif ic == 'minhoca':
        m = principled('minh', srgb('#b5655e'), 0.35, sss=0.4, coat=0.5)
        pts = [(0.06 * math.sin(i * 0.9), 0, -i * 0.07) for i in range(14)]
        objs.append(tube('minhoca', pts, 0.035, m))
    elif ic == 'fruta':
        m = principled('fruta', srgb('#4a1f5e'), 0.25, coat=0.8, sss=0.1)
        objs += [sphere('fruta', (0, 0, -0.18), 0.17, m), tube('cabinho', [(0, 0, 0.0), (0.02, 0, -0.03), (0.0, 0, -0.04)], 0.012, principled('cab', srgb('#4a6b2a'), 0.6))]
    elif ic == 'massa':
        m = principled('massa', srgb('#e2cc94'), 0.75, sss=0.2)
        o = sphere('massa', (0, 0, -0.16), 0.16, m, (1, 0.9, 1.05))
        d = o.modifiers.new('disp', 'DISPLACE'); tx = bpy.data.textures.new('n', 'CLOUDS'); tx.noise_scale = 0.08; d.texture = tx; d.strength = 0.03
        objs.append(o)
    elif ic == 'posta':
        skin = principled('pele', srgb('#9aa6ac'), 0.25, 0.5); flesh = principled('carne', srgb('#e8a7a0'), 0.55, sss=0.3)
        bpy.ops.mesh.primitive_cylinder_add(vertices=40, radius=0.16, depth=0.32, location=(0, 0, -0.2))
        c = bpy.context.active_object; c.scale = (1, 0.6, 1); c.data.materials.append(flesh); c.data.materials.append(skin)
        for poly in c.data.polygons:
            if abs(poly.normal.z) < 0.5: poly.material_index = 1
        c.rotation_euler = (math.radians(90), 0, math.radians(-25)); c.scale = (1, 1, 0.55)
        objs.append(c)
    elif ic == 'caranguejo':
        sh = principled('carap', srgb('#9a4b28'), 0.45, coat=0.5)
        objs.append(sphere('carapaca', (0, 0, -0.18), 0.17, sh, (1, 0.45, 0.8)))
        for side in (-1, 1):
            for k in range(3):
                objs.append(tube(f'pata{side}{k}', [(0.12 * side, 0, -0.12 - k * 0.07), (0.25 * side, 0, -0.1 - k * 0.09), (0.3 * side, 0, -0.2 - k * 0.1)], 0.018, sh))
            objs.append(tube(f'garra{side}', [(0.1 * side, 0, -0.08), (0.2 * side, 0, 0.0), (0.22 * side, 0, 0.06)], 0.03, sh))
            objs.append(sphere(f'pinca{side}', (0.23 * side, 0, 0.08), 0.045, sh, (1, 0.6, 1.3)))
    elif ic == 'milho':
        m = principled('milho', srgb('#f2c94c'), 0.3, coat=0.4, sss=0.2)
        for k, (x, z) in enumerate([(0, -0.06), (0.06, -0.17), (-0.01, -0.28)]):
            objs.append(sphere(f'grao{k}', (x, 0, z), 0.065, m, (1, 0.8, 1.15)))
    elif ic == 'coracao':
        m = principled('cor', srgb('#7a1a24'), 0.3, coat=0.6, sss=0.2)
        objs.append(lathe('coracao', smooth_prof([(0, 0.0), (-0.04, 0.09), (-0.14, 0.13), (-0.3, 0.07), (-0.38, 0.0)], 10), m, 0.8))
    return objs

# ---------------- terminal tackle ----------------
def tackle(kind):
    objs = []
    if kind.startswith('anzol_'):
        k = kind[6:]
        if k == 'garateia': objs += treble('t', (0, 0, -0.06), 0.75)
        else: objs += make_hook('anzol', k, 1.0, 0.03)
    elif kind in ('girador', 'girador_rol'):
        objs += [ring('o1', (0, 0, 0.0), 0.05, 0.016, M['metal'], 'x'), ring('o2', (0, 0, -0.34), 0.05, 0.016, M['metal'], 'x')]
        objs.append(lathe('barril', smooth_prof([(-0.07, 0.02), (-0.1, 0.045), (-0.17, 0.05), (-0.24, 0.045), (-0.27, 0.02)], 6), M['black_nickel'] if kind == 'girador' else M['metal'], 1.0))
        if kind == 'girador_rol': objs.append(sphere('rol', (0, 0, -0.17), 0.04, M['gold']))
    elif kind == 'oliva':
        objs.append(lathe('oliva', smooth_prof([(0, 0.02), (-0.04, 0.06), (-0.2, 0.1), (-0.36, 0.06), (-0.4, 0.02)], 8), M['lead'], 1.0))
    elif kind == 'chata':
        objs.append(lathe('chata', smooth_prof([(-0.06, 0.0), (-0.08, 0.12), (-0.25, 0.16), (-0.42, 0.12), (-0.44, 0.0)], 8), M['lead'], 0.35))
        objs.append(ring('olho', (0, 0, -0.03), 0.035, 0.012, M['metal']))
    elif kind == 'chumbinho':
        objs.append(sphere('chumbinho', (0, 0, -0.06), 0.06, M['lead']))
    elif kind == 'micanga':
        objs.append(sphere('micanga', (0, 0, -0.04), 0.045, M['bead']))
    elif kind == 'boia':
        objs += [tube('antena', [(0, 0, 0.0), (0, 0, -0.1), (0, 0, -0.18)], 0.015, M['float_top']),
                 lathe('topo', smooth_prof([(-0.18, 0.0), (-0.2, 0.08), (-0.3, 0.14), (-0.38, 0.15)], 8), M['float_top'], 1.0),
                 lathe('base', smooth_prof([(-0.38, 0.15), (-0.5, 0.13), (-0.66, 0.05), (-0.72, 0.0)], 8), M['float_bot'], 1.0)]
    elif kind == 'crimp':
        objs.append(lathe('luva', [(0, 0.022), (-0.1, 0.022)], M['metal'], 1.6))
    elif kind == 'vara':
        objs.append(tube('blank', [(-0.95, 0, 0.6), (-0.45, 0, 0.32), (0.0, 0, 0.06)], 0.022, M['carbon']))
        for k, t in enumerate((0.25, 0.62)):
            p = Vector((-0.95, 0, 0.6)).lerp(Vector((0, 0, 0.06)), t)
            objs.append(ring(f'passador{k}', (p.x + 0.02, 0, p.z - 0.06), 0.035 - 0.01 * k, 0.008, M['metal']))
        objs.append(ring('ponteira', (0.0, 0, 0.02), 0.02, 0.008, M['metal']))
    return objs

# ---------------- render one sprite ----------------
manifest = {}
def render(name, objs):
    if ONLY and name not in ONLY and name.split('_')[0] not in ONLY:
        for o in objs: bpy.data.objects.remove(o, do_unlink=True)
        return
    bpy.context.view_layer.update()
    lo = Vector((1e9, 1e9, 1e9)); hi = -lo
    deps = bpy.context.evaluated_depsgraph_get()
    for o in objs:
        oe = o.evaluated_get(deps)
        for c in oe.bound_box:
            w = oe.matrix_world @ Vector(c); lo = Vector(map(min, lo, w)); hi = Vector(map(max, hi, w))
    pad = 0.04
    W, H = (hi.x - lo.x) + 2 * pad, (hi.z - lo.z) + 2 * pad
    cam.location = ((lo.x + hi.x) / 2, -10, (lo.z + hi.z) / 2)
    cam_d.ortho_scale = max(W, H)
    sc.render.resolution_x = max(8, int(round(W * PX_PER_UNIT))); sc.render.resolution_y = max(8, int(round(H * PX_PER_UNIT)))
    sc.render.filepath = os.path.join(OUT, name + '.png')
    bpy.ops.render.render(write_still=True)
    # where the line attaches (the top of the part, x=0) in image fractions
    S = max(W, H); ppu = max(sc.render.resolution_x, sc.render.resolution_y) / S
    manifest[name] = {'ppu': ppu, 'x0': cam.location.x - sc.render.resolution_x / ppu / 2, 'z1': cam.location.z + sc.render.resolution_y / ppu / 2}
    for o in objs: bpy.data.objects.remove(o, do_unlink=True)

for kind in ['anzol_wide', 'anzol_circular', 'anzol_maruseigo', 'anzol_haste', 'anzol_offset', 'anzol_garateia',
             'girador', 'girador_rol', 'oliva', 'chata', 'chumbinho', 'micanga', 'boia', 'crimp', 'vara']:
    render(kind, tackle(kind))
for ic in ['tuvira', 'peixe', 'minhoca', 'fruta', 'massa', 'posta', 'caranguejo', 'milho', 'coracao']:
    render('nat_' + ic, natural(ic))
for art in ['zara', 'helice', 'popper', 'sapo', 'meia', 'crank', 'jig', 'shad', 'colher', 'spinner']:
    for cor in CORES:
        render(f'isca_{art}_{cor}', lure(art, cor))
old = {}
mf = os.path.join(OUT, 'manifest.json')
if os.path.exists(mf): old = json.load(open(mf))
old.update(manifest)
json.dump(old, open(mf, 'w'), indent=1)
print('SPRITES DONE', len(manifest))
