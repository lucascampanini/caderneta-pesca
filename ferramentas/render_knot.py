"""Blender: build and render one knot animation from the simulation JSON.
blender -b --factory-startup --python render_knot.py -- JSON OUTDIR [--still FRAME,...] [--res 960x540] [--samples 48]
Writes OUTDIR/<name>.mp4 (or stills) and OUTDIR/<name>.timeline.json (chapter times)."""
import bpy, sys, json, math, os
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:]
JSON, OUT = argv[0], argv[1]
opts = {argv[i]: argv[i + 1] for i in range(2, len(argv) - 1, 2)}
D = json.load(open(JSON))
NAME = D['name']
FPS = 30
RES = tuple(int(v) for v in opts.get('--res', '960x540').split('x'))
SAMPLES = int(opts.get('--samples', '48'))
VIEW = D.get('view', {})

# ---------------- scene ----------------
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = 'CYCLES'
prefs = bpy.context.preferences.addons['cycles'].preferences
prefs.compute_device_type = 'OPTIX'; prefs.get_devices()
for d in prefs.devices: d.use = d.type == 'OPTIX'
sc.cycles.device = 'GPU'
sc.cycles.samples = SAMPLES
sc.cycles.use_denoising = True
sc.cycles.denoiser = 'OPTIX'
sc.cycles.max_bounces = 6
sc.render.resolution_x, sc.render.resolution_y = RES
sc.render.fps = FPS
sc.view_settings.view_transform = 'AgX'
sc.view_settings.look = 'AgX - Medium High Contrast'
sc.render.film_transparent = False

def mat(name, base, rough=0.45, metal=0.0, coat=0.0, sss=0.0, trans=0.0, ior=1.45, bump=None, spec=0.5):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*base, 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    b.inputs['Coat Weight'].default_value = coat
    b.inputs['Transmission Weight'].default_value = trans
    b.inputs['IOR'].default_value = ior
    b.inputs['Specular IOR Level'].default_value = spec
    if sss:
        b.inputs['Subsurface Weight'].default_value = sss
        b.inputs['Subsurface Radius'].default_value = (0.05, 0.05, 0.05)
    if bump == 'braid':
        # braided line: diagonal bands along the curve UV (U = along the line, V = around it)
        tc = nt.nodes.new('ShaderNodeTexCoord')
        mp = nt.nodes.new('ShaderNodeMapping')
        mp.inputs['Scale'].default_value = (1, 1, 1)
        sep = nt.nodes.new('ShaderNodeSeparateXYZ')
        math1 = nt.nodes.new('ShaderNodeMath'); math1.operation = 'MULTIPLY_ADD'
        math1.inputs[1].default_value = 1.0
        mul = nt.nodes.new('ShaderNodeMath'); mul.operation = 'MULTIPLY'; mul.inputs[1].default_value = 260.0
        nt.links.new(tc.outputs['UV'], sep.inputs[0])
        nt.links.new(sep.outputs['X'], mul.inputs[0])            # along the line
        nt.links.new(mul.outputs[0], math1.inputs[2])
        mul2 = nt.nodes.new('ShaderNodeMath'); mul2.operation = 'MULTIPLY'; mul2.inputs[1].default_value = 6.2832
        nt.links.new(sep.outputs['Y'], mul2.inputs[0])            # around the line
        nt.links.new(mul2.outputs[0], math1.inputs[0])
        sin1 = nt.nodes.new('ShaderNodeMath'); sin1.operation = 'SINE'
        nt.links.new(math1.outputs[0], sin1.inputs[0])
        bm = nt.nodes.new('ShaderNodeBump'); bm.inputs['Strength'].default_value = 0.35; bm.inputs['Distance'].default_value = 0.004
        nt.links.new(sin1.outputs[0], bm.inputs['Height'])
        nt.links.new(bm.outputs['Normal'], b.inputs['Normal'])
    return m

M_MAIN = mat('linha', (0.95, 0.66, 0.05), rough=0.42, sss=0.15, bump='braid')
M_TAG = mat('ponta', (0.98, 0.34, 0.06), rough=0.42, sss=0.15, bump='braid')
M_LEAD = mat('lider', (0.62, 0.86, 0.95), rough=0.08, trans=0.75, ior=1.42, spec=0.6)
M_METAL = mat('metal', (0.56, 0.58, 0.6), rough=0.22, metal=1.0)
M_DARK = mat('metal_escuro', (0.12, 0.12, 0.13), rough=0.3, metal=1.0)
M_BG = mat('fundo', (0.055, 0.075, 0.068), rough=0.9, spec=0.2)
M_GLOW = bpy.data.materials.new('brilho'); M_GLOW.use_nodes = True
em = M_GLOW.node_tree.nodes.new('ShaderNodeEmission'); em.inputs['Color'].default_value = (1.0, 0.55, 0.2, 1); em.inputs['Strength'].default_value = 6
M_GLOW.node_tree.links.new(em.outputs[0], M_GLOW.node_tree.nodes['Material Output'].inputs['Surface'])

def curve_obj(name, pts, radius, material, cyclic=False, res=10):
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '3D'
    cu.bevel_mode = 'ROUND'; cu.bevel_depth = radius; cu.bevel_resolution = 6
    cu.use_fill_caps = True; cu.resolution_u = res
    sp = cu.splines.new('POLY'); sp.points.add(len(pts) - 1)
    for p, q in zip(sp.points, pts): p.co = (*q, 1)
    sp.use_cyclic_u = cyclic
    ob = bpy.data.objects.new(name, cu); sc.collection.objects.link(ob)
    ob.data.materials.append(material)
    return ob

def smooth_curve(name, pts, radius, material, cyclic=False):
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '3D'
    cu.bevel_mode = 'ROUND'; cu.bevel_depth = radius; cu.bevel_resolution = 6; cu.use_fill_caps = True
    cu.resolution_u = 24
    sp = cu.splines.new('NURBS'); sp.points.add(len(pts) - 1)
    for p, q in zip(sp.points, pts): p.co = (*q, 1)
    sp.order_u = 4; sp.use_endpoint_u = not cyclic; sp.use_cyclic_u = cyclic
    ob = bpy.data.objects.new(name, cu); sc.collection.objects.link(ob); ob.data.materials.append(material)
    return ob

# ---------------- static props ----------------
ob_meta = D['obstacles']
if ob_meta.get('type') == 'hook':
    R, w = ob_meta['eye_r'], ob_meta['wire']
    ring = [(0, R * math.cos(t), R * math.sin(t)) for t in [i / 48 * 2 * math.pi for i in range(48)]]
    smooth_curve('olho', ring, w, M_METAL, cyclic=True)
    sh = smooth_curve('anzol', ob_meta['shank'], w, M_METAL)
    # point + barb
    tip = Vector(ob_meta['shank'][-1]); prev = Vector(ob_meta['shank'][-2])
    dirv = (tip - prev).normalized()
    bpy.ops.mesh.primitive_cone_add(vertices=24, radius1=w, radius2=0.0, depth=0.32, location=tip + dirv * 0.16)
    cone = bpy.context.active_object; cone.rotation_mode = 'QUATERNION'
    cone.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(dirv); cone.data.materials.append(M_METAL)
    bpy.ops.object.shade_smooth()
    barb_base = tip + dirv * 0.05
    smooth_curve('farpa', [tuple(barb_base), tuple(barb_base + dirv * -0.06 + Vector((0.12, 0, 0.0))), tuple(barb_base + Vector((0.2, 0, -0.18)))], w * 0.55, M_METAL)
for k, lead in enumerate(D.get('leaders') or []):
    curve_obj(f'lider{k}', lead['pts'], lead.get('r', D['r_line'] * 1.25), M_LEAD)

# backdrop: big curved sweep
bpy.ops.mesh.primitive_plane_add(size=80, location=(0, 0, -3.2))
floor = bpy.context.active_object; floor.data.materials.append(M_BG)
bpy.ops.mesh.primitive_plane_add(size=80, location=(0, 18, 10), rotation=(math.radians(90), 0, 0))
wall = bpy.context.active_object; wall.data.materials.append(M_BG)

world = bpy.data.worlds.new('w'); sc.world = world; world.use_nodes = True
world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.02, 0.025, 0.024, 1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.6

def area(name, loc, energy, size, color=(1, 1, 1), target=(1, 0, 0)):
    l = bpy.data.lights.new(name, 'AREA'); l.energy = energy; l.size = size; l.color = color
    o = bpy.data.objects.new(name, l); o.location = loc; sc.collection.objects.link(o)
    d = Vector(target) - Vector(loc); o.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    return o
tgt = VIEW.get('target', (1.2, 0.0, 0.1))
area('key', (tgt[0] - 4, -6, 7), 900, 5, (1.0, 0.96, 0.9), tgt)
area('fill', (tgt[0] + 6, -5, 2), 250, 6, (0.85, 0.92, 1.0), tgt)
area('rim', (tgt[0] + 1, 6, 5), 700, 4, (1.0, 0.95, 0.85), tgt)

# camera
cam_d = bpy.data.cameras.new('cam'); cam_d.lens = VIEW.get('lens', 50)
cam_d.dof.use_dof = True; cam_d.dof.aperture_fstop = VIEW.get('fstop', 5.6)
cam = bpy.data.objects.new('cam', cam_d); sc.collection.objects.link(cam); sc.camera = cam
empty = bpy.data.objects.new('alvo', None); sc.collection.objects.link(empty); empty.location = tgt
cam_d.dof.focus_object = empty
tr = cam.constraints.new('TRACK_TO'); tr.target = empty; tr.track_axis = 'TRACK_NEGATIVE_Z'; tr.up_axis = 'UP_Y'

# ---------------- the line(s) ----------------
frames = D['frames']                      # [frame][line][particle][xyz]
n_lines = len(frames[0])
r = D['r_line']
# subsample simulation frames for shape keys
sim_keys = list(range(0, len(frames), 2))
if sim_keys[-1] != len(frames) - 1: sim_keys.append(len(frames) - 1)

objs = []   # (object, part)  part in {'main','tag','line2'}
for li in range(n_lines):
    P0 = frames[0][li]; N = len(P0)
    split = D['split'][li] if li < len(D['split']) else None
    parts = []
    if split is not None:
        cut = int(round(split * (N - 1)))
        parts.append(('main', 0, cut + 1, M_MAIN if li == 0 else M_LEAD))
        parts.append(('tag', cut, N, M_TAG if li == 0 else M_LEAD))
    else:
        parts.append(('main', 0, N, M_LEAD))
    for kind, a, b, m in parts:
        ob = curve_obj(f'linha{li}_{kind}', [tuple(p) for p in P0[a:b]], r if li == 0 else r * 1.2, m)
        ob.shape_key_add(name='Basis')
        keys = []
        for fi in sim_keys[1:]:
            kb = ob.shape_key_add(name=f'f{fi}', from_mix=False)
            for p, q in zip(kb.data, frames[fi][li][a:b]): p.co = q
            keys.append(kb)
        objs.append(dict(ob=ob, kind=kind, line=li, a=a, b=b, keys=keys))

# ---------------- timeline ----------------
marks = D['marks']; steps = D['steps']
split0 = D['split'][0]
MODE = D.get('mode', 'tag')
main_obj = next(o for o in objs if o['kind'] == 'main' and o['line'] == 0)
tag_obj = next(o for o in objs if o['kind'] == 'tag' and o['line'] == 0)

def path_of(o):
    P = frames[0][o['line']][o['a']:o['b']]
    sl = [0.0]
    for i in range(1, len(P)): sl.append(sl[-1] + (Vector(P[i]) - Vector(P[i - 1])).length)
    return P, sl
def point_at(P, sl, fr):
    fr = max(0.0, min(1.0, fr)); tot = sl[-1]
    for i in range(1, len(sl)):
        if sl[i] >= fr * tot:
            t = (fr * tot - sl[i - 1]) / max(1e-9, sl[i] - sl[i - 1])
            return Vector(P[i - 1]).lerp(Vector(P[i]), t)
    return Vector(P[-1])

P_tag, sl_tag = path_of(tag_obj); P_main, sl_main = path_of(main_obj)
def frac_tag(name):
    if name == 'end': return 1.0
    return max(0.0, min(1.0, (marks[name] - split0) / (1 - split0)))
def frac_main(name):
    if name in ('end', 'tag'): return 1.0
    return max(0.0, min(1.0, marks[name] / split0))

cu_tag = tag_obj['ob'].data; cu_main = main_obj['ob'].data
for c in (cu_tag, cu_main):
    c.bevel_factor_mapping_end = 'SPLINE'; c.bevel_factor_mapping_start = 'SPLINE'

if MODE == 'double':
    # both legs of the doubled line advance together from the rod side towards the bight
    def set_reveal(m, fr):
        v = frac_main(m) if isinstance(m, str) else m
        cu_main.bevel_factor_end = v; cu_main.keyframe_insert('bevel_factor_end', frame=fr)
        cu_tag.bevel_factor_start = 1 - v; cu_tag.keyframe_insert('bevel_factor_start', frame=fr)
    def reveal_value(): return cu_main.bevel_factor_end
    glows_fn = [lambda v: point_at(P_main, sl_main, v), lambda v: point_at(P_tag, sl_tag, 1 - v)]
    path_len = sl_main[-1]
    span = lambda a_, b_: (frac_main(b_) - frac_main(a_)) * path_len
else:
    def set_reveal(m, fr):
        v = frac_tag(m) if isinstance(m, str) else m
        cu_tag.bevel_factor_end = v; cu_tag.keyframe_insert('bevel_factor_end', frame=fr)
    def reveal_value(): return cu_tag.bevel_factor_end
    glows_fn = [lambda v: point_at(P_tag, sl_tag, v)]
    path_len = sl_tag[-1]
    span = lambda a_, b_: (frac_tag(b_) - frac_tag(a_)) * path_len

SPEED = D.get('speed', 1.6)            # path units per second while threading
HOLD = int(FPS * 0.9)
timeline = []
path_steps = [st for st in steps if st[0] not in ('aperto', 'corte')]
first = path_steps[0][0] if MODE == 'double' else 0.0
f = 1
set_reveal(first, f)
f += int(FPS * 0.8)
set_reveal(first, f)
for (a_, b_, txt) in path_steps:
    dur = max(int(FPS * 1.0), int(span(a_, b_) / SPEED * FPS))
    t0 = f
    set_reveal(a_, f); f += dur; set_reveal(b_, f)
    timeline.append(dict(t0=round((t0 - 1) / FPS, 3), t1=round((f - 1) / FPS, 3), txt=txt))
    f += HOLD
    set_reveal(b_, f)
for c in (cu_tag, cu_main):
    if c.animation_data and c.animation_data.action:
        for fc in c.animation_data.action.fcurves:
            for kp in fc.keyframe_points: kp.interpolation = 'BEZIER'; kp.easing = 'EASE_IN_OUT'

glows = []
for gf in glows_fn:
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r * 1.25, location=(0, 0, 0))
    g = bpy.context.active_object; g.data.materials.append(M_GLOW); bpy.ops.object.shade_smooth()
    glows.append((g, gf))

# tightening: step through the simulation shape keys
aperto = next((st for st in steps if st[0] == 'aperto'), None)
t_ap0 = f
TIGHT = int(FPS * D.get('tight_secs', 2.4))
nk = len(objs[0]['keys'])
for o in objs:
    for j, kb in enumerate(o['keys']):
        fj = t_ap0 + (j + 1) * TIGHT / nk
        kb.value = 0.0; kb.keyframe_insert('value', frame=max(1, fj - TIGHT / nk))
        kb.value = 1.0; kb.keyframe_insert('value', frame=fj)
        if j < nk - 1:
            kb.value = 0.0; kb.keyframe_insert('value', frame=fj + TIGHT / nk)
    if o['ob'].data.shape_keys.animation_data:
        for fc in o['ob'].data.shape_keys.animation_data.action.fcurves:
            for kp in fc.keyframe_points: kp.interpolation = 'LINEAR'
f = t_ap0 + TIGHT
if aperto: timeline.append(dict(t0=round((t_ap0 - 1) / FPS, 3), t1=round((f - 1) / FPS, 3), txt=aperto[2]))
corte = next((st for st in steps if st[0] == 'corte'), None)
if corte and 'corte' in marks:
    f += int(FPS * 0.6)
    t_c0 = f
    cu_tag.bevel_factor_end = 1.0; cu_tag.keyframe_insert('bevel_factor_end', frame=f)
    f += int(FPS * 0.9)
    cu_tag.bevel_factor_end = frac_tag('corte'); cu_tag.keyframe_insert('bevel_factor_end', frame=f)
    for fc in cu_tag.animation_data.action.fcurves:
        if fc.data_path == 'bevel_factor_end':
            for kp in fc.keyframe_points[-2:]: kp.interpolation = 'BEZIER'; kp.easing = 'EASE_IN_OUT'
    timeline.append(dict(t0=round((t_c0 - 1) / FPS, 3), t1=round((f - 1) / FPS, 3), txt=corte[2]))
f_end = f + int(FPS * 1.4)

# glow(s) ride on the advancing end(s) while threading; hidden afterwards
for fr in range(1, t_ap0 + 1):
    sc.frame_set(fr)
    v = reveal_value()
    moving = 0.002 < v < 0.999
    for g, gf in glows:
        g.location = gf(v); g.keyframe_insert('location', frame=fr)
        sv = 1.0 if moving else 0.0
        g.scale = (sv, sv, sv); g.keyframe_insert('scale', frame=fr)
for g, _ in glows:
    g.scale = (0, 0, 0); g.keyframe_insert('scale', frame=t_ap0 + 1)

# camera: gentle orbit, closer during the tightening
az0, el, dist = VIEW.get('az', -62), VIEW.get('el', 24), VIEW.get('dist', 9.0)
def cam_at(az, el, dist):
    a, e = math.radians(az), math.radians(el)
    return Vector(tgt) + Vector((dist * math.cos(e) * math.sin(-a), -dist * math.cos(e) * math.cos(a), dist * math.sin(e)))
keys = [(1, az0, dist), (t_ap0, az0 + VIEW.get('orbit', 14), dist), (f_end, az0 + VIEW.get('orbit', 14) + 6, dist * VIEW.get('zoom_end', 0.82))]
for fr, az, ds in keys:
    cam.location = cam_at(az, el, ds); cam.keyframe_insert('location', frame=fr)
sc.frame_start, sc.frame_end = 1, f_end

os.makedirs(OUT, exist_ok=True)
json.dump({'name': NAME, 'fps': FPS, 'duration': round((f_end - 1) / FPS, 3), 'steps': timeline},
          open(os.path.join(OUT, f'{NAME}.timeline.json'), 'w'), ensure_ascii=False, indent=1)

if '--still' in opts:
    for fr in [int(v) for v in opts['--still'].split(',')]:
        sc.frame_set(min(fr, f_end))
        sc.render.filepath = os.path.join(OUT, f'{NAME}_f{fr:04d}.png')
        sc.render.image_settings.file_format = 'PNG'
        bpy.ops.render.render(write_still=True)
    print('STILLS DONE', f_end)
else:
    sc.render.image_settings.file_format = 'FFMPEG'
    sc.render.ffmpeg.format = 'MPEG4'
    sc.render.ffmpeg.codec = 'H264'
    sc.render.ffmpeg.constant_rate_factor = 'HIGH'
    sc.render.ffmpeg.ffmpeg_preset = 'GOOD'
    sc.render.ffmpeg.gopsize = 6
    sc.render.filepath = os.path.join(OUT, f'{NAME}.mp4')
    bpy.ops.render.render(animation=True)
    print('VIDEO DONE', f_end)
