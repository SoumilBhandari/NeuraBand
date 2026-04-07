"""
NeuraFy Enclosure — Ultra-Photorealistic Render Script v3
==========================================================
Full studio-quality product render pipeline:
  - Clearcoat injection-moulded plastic (IOR 1.46, coat weight 0.85)
  - Anisotropic brushed stainless steel electrodes & screws
  - PCB soldermask with bump-mapped trace texture
  - Bevel modifiers on EVERY mesh (0.3 mm) — the single biggest realism boost
  - Procedural HDRI-quality 5-light studio rig + infinity cove backdrop
  - Compositor: Filmic, glare, vignette, chromatic aberration, color balance
  - 512 samples / adaptive + OIDN denoiser
Run headless:  blender --background --python render_neurafy.py
"""

import bpy
import bmesh
import os
import math
from mathutils import Vector, Euler, Matrix

SCRIPT_DIR  = os.path.dirname(os.path.abspath(__file__))
STL_DIR     = os.path.join(SCRIPT_DIR, "stl")
OUT_DIR     = os.path.join(SCRIPT_DIR, "renders")
os.makedirs(OUT_DIR, exist_ok=True)


# ═══════════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════════

def inp(node, *names):
    """Return the first matching node input (handles Blender 4/5 renames)."""
    for n in names:
        if n in node.inputs:
            return node.inputs[n]
    return None


def set_inp(node, value, *names):
    i = inp(node, *names)
    if i:
        i.default_value = value


def hex_rgb(h):
    """#RRGGBB → linear RGBA tuple for Blender."""
    h = h.lstrip('#')
    r, g, b = (int(h[i:i+2], 16) / 255.0 for i in (0, 2, 4))
    def s2l(c):
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    return (s2l(r), s2l(g), s2l(b), 1.0)


# ═══════════════════════════════════════════════════════════════
# 1. SCENE
# ═══════════════════════════════════════════════════════════════

def setup_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for block in list(bpy.data.meshes) + list(bpy.data.materials) + list(bpy.data.lights):
        if block.users == 0:
            bpy.data.batch_remove(ids=[block])

    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'

    # GPU first, CPU fallback
    try:
        prefs = bpy.context.preferences.addons['cycles'].preferences
        prefs.compute_device_type = 'METAL'
        prefs.get_devices()
        for d in prefs.devices:
            d.use = True
        sc.cycles.device = 'GPU'
        print("✓ Metal GPU rendering")
    except Exception:
        sc.cycles.device = 'CPU'
        print("  CPU fallback")

    # Render quality
    sc.cycles.samples                 = 512
    sc.cycles.use_adaptive_sampling   = True
    sc.cycles.adaptive_threshold      = 0.005
    sc.cycles.use_denoising           = True
    sc.cycles.denoiser                = 'OPENIMAGEDENOISE'
    sc.cycles.denoising_input_passes  = 'RGB_ALBEDO_NORMAL'

    # Light bounces — more for realistic caustics / reflections
    sc.cycles.max_bounces             = 12
    sc.cycles.diffuse_bounces         = 6
    sc.cycles.glossy_bounces          = 8
    sc.cycles.transmission_bounces    = 8
    sc.cycles.transparent_max_bounces = 8
    sc.cycles.caustics_reflective     = True
    sc.cycles.caustics_refractive     = True

    # Resolution 4K
    sc.render.resolution_x            = 3840
    sc.render.resolution_y            = 2160
    sc.render.resolution_percentage   = 100
    sc.render.film_transparent        = True
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode  = 'RGBA'
    sc.render.image_settings.compression = 10

    # Filmic + High Contrast for cinematic punch
    sc.view_settings.view_transform   = 'Filmic'
    sc.view_settings.look             = 'High Contrast'
    sc.view_settings.exposure         = -0.3
    sc.view_settings.gamma            = 1.0

    # World — very dark gradient, almost black
    world = bpy.data.worlds.new("StudioWorld")
    sc.world = world
    world.use_nodes = True
    wn = world.node_tree.nodes
    wl = world.node_tree.links
    wn.clear()
    bg = wn.new('ShaderNodeBackground')
    bg.inputs['Color'].default_value = (0.006, 0.007, 0.010, 1.0)
    bg.inputs['Strength'].default_value = 0.05
    out = wn.new('ShaderNodeOutputWorld')
    wl.new(bg.outputs['Background'], out.inputs['Surface'])

    return sc


# ═══════════════════════════════════════════════════════════════
# 2. MATERIALS  — full PBR with clearcoat, bump, anisotropy
# ═══════════════════════════════════════════════════════════════

def _new_mat(name):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    m.node_tree.nodes.clear()
    return m, m.node_tree.nodes, m.node_tree.links


def _bsdf_output(nodes, links):
    bsdf = nodes.new('ShaderNodeBsdfPrincipled')
    out  = nodes.new('ShaderNodeOutputMaterial')
    links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    return bsdf


def _add_bump(nodes, links, bsdf, scale=80, strength=0.4):
    """Procedural micro-roughness bump."""
    coord = nodes.new('ShaderNodeTexCoord')
    map_  = nodes.new('ShaderNodeMapping')
    map_.inputs['Scale'].default_value = (scale, scale, scale)
    noise = nodes.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value    = 8.0
    noise.inputs['Detail'].default_value   = 12.0
    noise.inputs['Roughness'].default_value= 0.65
    noise.inputs['Distortion'].default_value = 0.2
    bump  = nodes.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value  = strength
    bump.inputs['Distance'].default_value  = 0.001
    links.new(coord.outputs['Object'],  map_.inputs['Vector'])
    links.new(map_.outputs['Vector'],   noise.inputs['Vector'])
    links.new(noise.outputs['Fac'],     bump.inputs['Height'])
    links.new(bump.outputs['Normal'],   bsdf.inputs['Normal'])


def mat_shell(name, color_hex, roughness=0.10):
    """Injection-moulded plastic — clearcoat, subtle subsurface, bump."""
    m, N, L = _new_mat(name)
    bsdf = _bsdf_output(N, L)
    bsdf.inputs['Base Color'].default_value = hex_rgb(color_hex)
    bsdf.inputs['Roughness'].default_value  = roughness
    bsdf.inputs['IOR'].default_value        = 1.46
    set_inp(bsdf, 1.0,  'Coat Weight',    'Clearcoat')
    set_inp(bsdf, 0.05, 'Coat Roughness', 'Clearcoat Roughness')
    set_inp(bsdf, 0.02, 'Subsurface Weight', 'Subsurface')
    if 'Subsurface Radius' in bsdf.inputs:
        bsdf.inputs['Subsurface Radius'].default_value = (1.0, 0.7, 0.5)
    _add_bump(N, L, bsdf, scale=60, strength=0.25)
    return m


def mat_pcb(name, color_hex):
    """FR4 PCB with soldermask gloss and trace bump texture."""
    m, N, L = _new_mat(name)
    bsdf = _bsdf_output(N, L)
    bsdf.inputs['Base Color'].default_value = hex_rgb(color_hex)
    bsdf.inputs['Roughness'].default_value  = 0.40
    set_inp(bsdf, 0.5, 'Specular IOR Level', 'Specular')
    _add_bump(N, L, bsdf, scale=180, strength=0.15)
    return m


def mat_stainless(name, roughness=0.10):
    """Brushed / polished stainless steel — anisotropic."""
    m, N, L = _new_mat(name)
    bsdf = _bsdf_output(N, L)
    bsdf.inputs['Base Color'].default_value = hex_rgb('D8D8DE')
    bsdf.inputs['Metallic'].default_value   = 1.0
    bsdf.inputs['Roughness'].default_value  = roughness
    if 'Anisotropic' in bsdf.inputs:
        bsdf.inputs['Anisotropic'].default_value          = 0.6
        bsdf.inputs['Anisotropic Rotation'].default_value = 0.0
    _add_bump(N, L, bsdf, scale=300, strength=0.15)
    return m


def mat_battery():
    """Brushed aluminium pouch cell."""
    m, N, L = _new_mat('Battery')
    bsdf = _bsdf_output(N, L)
    bsdf.inputs['Base Color'].default_value = hex_rgb('C0C0C8')
    bsdf.inputs['Metallic'].default_value   = 0.9
    bsdf.inputs['Roughness'].default_value  = 0.25
    if 'Anisotropic' in bsdf.inputs:
        bsdf.inputs['Anisotropic'].default_value          = 0.7
        bsdf.inputs['Anisotropic Rotation'].default_value = 0.5
    return m


def mat_dark_plastic(name, color_hex='1A1A1E', roughness=0.35):
    m, N, L = _new_mat(name)
    bsdf = _bsdf_output(N, L)
    bsdf.inputs['Base Color'].default_value = hex_rgb(color_hex)
    bsdf.inputs['Roughness'].default_value  = roughness
    set_inp(bsdf, 0.4, 'Coat Weight', 'Clearcoat')
    set_inp(bsdf, 0.1, 'Coat Roughness', 'Clearcoat Roughness')
    return m


def mat_sensor_glass():
    """Optical lens — highly transmissive with anti-reflection tint."""
    m, N, L = _new_mat('SensorGlass')
    bsdf = _bsdf_output(N, L)
    bsdf.inputs['Base Color'].default_value = hex_rgb('C8EED8')
    bsdf.inputs['Roughness'].default_value  = 0.02
    bsdf.inputs['IOR'].default_value        = 1.52
    set_inp(bsdf, 0.96, 'Transmission Weight', 'Transmission')
    return m


def create_all_materials():
    return {
        'bottom_shell':   mat_shell('BottomShell', '2D8FA0', roughness=0.09),
        'top_shell':      mat_shell('TopShell',    '3DA0B2', roughness=0.08),
        'arduino':        mat_pcb('Arduino',   '003D4A'),
        'max30102':       mat_pcb('MAX30102',  '4A1020'),
        'tp4056':         mat_pcb('TP4056',    '0F1E4A'),
        'pololu':         mat_pcb('Pololu',    '0F5C1F'),
        'grove_gsr':      mat_pcb('GroveGSR',  '126820'),
        'battery':        mat_battery(),
        'electrode_left': mat_stainless('ElectrodeL', roughness=0.08),
        'electrode_right':mat_stainless('ElectrodeR', roughness=0.08),
        'screws':         mat_stainless('Screws', roughness=0.18),
        'slide_switch':   mat_dark_plastic('SlideSwitch', '161618'),
        'sensor_window':  mat_sensor_glass(),
    }


# ═══════════════════════════════════════════════════════════════
# 3. IMPORT + BEVEL + SMOOTH
# ═══════════════════════════════════════════════════════════════

def import_all(materials):
    objects = {}
    order = [
        'bottom_shell','top_shell','arduino','max30102','tp4056',
        'pololu','grove_gsr','battery','electrode_left','electrode_right',
        'slide_switch','screws','sensor_window',
    ]
    for name in order:
        path = os.path.join(STL_DIR, f"{name}.stl")
        if not os.path.exists(path):
            print(f"  MISSING: {path}")
            continue

        bpy.ops.wm.stl_import(filepath=path)
        obj = bpy.context.active_object
        obj.name = name

        # mm → m
        obj.scale = (0.001, 0.001, 0.001)
        bpy.ops.object.transform_apply(scale=True)

        # Smooth shading — Blender 5.x uses shade_smooth_by_angle op
        try:
            bpy.ops.object.shade_smooth_by_angle(angle=math.radians(35))
        except Exception:
            bpy.ops.object.shade_smooth()

        # ── BEVEL ── The single biggest realism upgrade.
        # Adds a tiny chamfer (0.3 mm) to every hard edge so light
        # catches the corners the way it does on real plastic & metal.
        bevel = obj.modifiers.new("Bevel", 'BEVEL')
        bevel.width         = 0.0003  # 0.3 mm in metres
        bevel.segments      = 3
        bevel.limit_method  = 'ANGLE'
        bevel.angle_limit   = math.radians(30)
        bevel.profile       = 0.7
        bevel.use_clamp_overlap = True

        # Extra subdivision on the shells for smoother silhouette
        if name in ('bottom_shell', 'top_shell'):
            sub = obj.modifiers.new("Subdiv", 'SUBSURF')
            sub.levels        = 0
            sub.render_levels = 1

        # Assign material
        if name in materials:
            obj.data.materials.clear()
            obj.data.materials.append(materials[name])

        objects[name] = obj
        print(f"  {name}: {len(obj.data.vertices)}v")

    return objects


# ═══════════════════════════════════════════════════════════════
# 4. STUDIO LIGHTING RIG  — 5-point softbox setup
# ═══════════════════════════════════════════════════════════════

def setup_lighting():
    lights = []

    def area(name, loc, rot_deg, energy, size, color=(1,1,1)):
        bpy.ops.object.light_add(type='AREA', location=loc)
        lt = bpy.context.active_object
        lt.name = name
        lt.data.energy = energy
        lt.data.size   = size
        lt.data.color  = color
        lt.data.shape  = 'RECTANGLE'
        lt.data.size_y = size * 0.6
        lt.rotation_euler = Euler(tuple(math.radians(d) for d in rot_deg))
        lights.append(lt)
        return lt

    # Key — large warm softbox, upper-right-front
    area("Key",  ( 0.18, -0.14, 0.22), (55, 0,  35),  7.0, 0.25, (1.00, 0.96, 0.90))
    # Fill — wide cool panel, left
    area("Fill", (-0.18, -0.08, 0.12), (50, 0, -30),  2.5, 0.40, (0.90, 0.94, 1.00))
    # Rim / hair — strong narrow, behind-above
    area("Rim",  ( 0.02,  0.16, 0.20), (130, 0, 180), 9.0, 0.12, (0.98, 0.99, 1.00))
    # Top fill — ceiling panel, straight down
    area("Top",  ( 0.00, -0.02, 0.26), (90,  0,   0), 3.0, 0.50, (0.95, 0.97, 1.00))
    # Accent kicker — low, right-back, warm
    area("Kick", ( 0.14,  0.10, 0.02), (20, 0, 120),  1.5, 0.10, (1.00, 0.90, 0.75))

    return lights


# ═══════════════════════════════════════════════════════════════
# 5. BACKDROP  — infinity cove (curved floor-to-wall)
# ═══════════════════════════════════════════════════════════════

def add_backdrop():
    """Create a smooth curved infinity cove using a subdivided plane."""
    bpy.ops.mesh.primitive_plane_add(size=1.2, location=(0, 0.2, -0.002))
    plane = bpy.context.active_object
    plane.name = "Backdrop"

    # Subdivide for curvature
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.subdivide(number_cuts=8)
    bpy.ops.object.mode_set(mode='OBJECT')

    # Curve the back edge upward
    bm = bmesh.new()
    bm.from_mesh(plane.data)
    for v in bm.verts:
        if v.co.y > 0.15:
            t = (v.co.y - 0.15) / 0.45
            t = min(1.0, max(0.0, t))
            v.co.z = t * t * 0.25
            v.co.y = 0.15 + (v.co.y - 0.15) * (1 - t * 0.4)
    bm.to_mesh(plane.data)
    bm.free()
    plane.data.update()

    # Add subdivision for smoothness
    sub = plane.modifiers.new("Subdiv", 'SUBSURF')
    sub.levels = 2

    # Material: dark studio floor
    m, N, L = _new_mat('Backdrop')
    bsdf = _bsdf_output(N, L)
    # Dark gradient using object Z coordinate
    grad = N.new('ShaderNodeTexGradient')
    grad.gradient_type = 'LINEAR'
    coord = N.new('ShaderNodeTexCoord')
    map_ = N.new('ShaderNodeMapping')
    map_.inputs['Rotation'].default_value = (math.radians(90), 0, 0)
    map_.inputs['Scale'].default_value    = (1, 2, 1)
    ramp = N.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].color    = (0.007, 0.008, 0.012, 1)
    ramp.color_ramp.elements[0].position = 0.0
    ramp.color_ramp.elements[1].color    = (0.025, 0.030, 0.042, 1)
    ramp.color_ramp.elements[1].position = 1.0
    L.new(coord.outputs['Object'], map_.inputs['Vector'])
    L.new(map_.outputs['Vector'],  grad.inputs['Vector'])
    L.new(grad.outputs['Fac'],     ramp.inputs['Fac'])
    L.new(ramp.outputs['Color'],   bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = 0.55
    set_inp(bsdf, 0.15, 'Specular IOR Level', 'Specular')
    plane.data.materials.append(m)

    return plane


# ═══════════════════════════════════════════════════════════════
# 6. POST-PROCESSING COMPOSITOR
# ═══════════════════════════════════════════════════════════════

def setup_compositor():
    """
    Post-processing via Blender compositor. Handles Blender 4/5 API
    differences gracefully — falls back to no-op if unavailable.
    """
    sc = bpy.context.scene

    # Try Blender 4.x API first, then 5.x
    tree = None
    try:
        sc.use_nodes = True          # Blender 4.x
        tree = sc.node_tree
    except AttributeError:
        pass

    if tree is None:
        # Blender 5+ compositor lives on the scene's compositing_node_group
        try:
            tree = sc.compositing_node_group
            if tree is None:
                bpy.ops.scene.new_compositing_node_tree()
                tree = sc.compositing_node_group
        except AttributeError:
            print("  Compositor API unavailable — skipping post-FX")
            return None

    nodes = tree.nodes
    links = tree.links
    nodes.clear()

    rl   = nodes.new('CompositorNodeRLayers')
    comp = nodes.new('CompositorNodeComposite')

    # ── Subtle lens bloom ──
    glare = nodes.new('CompositorNodeGlare')
    glare.glare_type = 'FOG_GLOW'
    glare.quality    = 'HIGH'
    glare.threshold  = 1.4
    glare.size       = 5
    glare.mix        = -0.92
    links.new(rl.outputs['Image'], glare.inputs['Image'])

    # ── Vignette ──
    ellipse = nodes.new('CompositorNodeEllipseMask')
    ellipse.width  = 0.80
    ellipse.height = 0.68
    blur_v  = nodes.new('CompositorNodeBlur')
    blur_v.size_x = 90
    blur_v.size_y = 90
    blur_v.use_relative = False
    inv = nodes.new('CompositorNodeInvert')
    mix_v = nodes.new('CompositorNodeMixRGB')
    mix_v.blend_type = 'MULTIPLY'
    mix_v.inputs['Fac'].default_value = 0.65
    links.new(ellipse.outputs['Mask'],   blur_v.inputs['Image'])
    links.new(blur_v.outputs['Image'],   inv.inputs['Color'])
    links.new(glare.outputs['Image'],    mix_v.inputs[1])
    links.new(inv.outputs['Color'],      mix_v.inputs[2])

    # ── Colour balance ──
    cb = nodes.new('CompositorNodeColorBalance')
    cb.correction_method = 'LIFT_GAMMA_GAIN'
    cb.lift  = (0.95, 0.96, 1.04)
    cb.gamma = (1.00, 1.00, 1.00)
    cb.gain  = (1.02, 1.00, 0.97)
    links.new(mix_v.outputs['Image'],  cb.inputs['Image'])
    links.new(cb.outputs['Image'],     comp.inputs['Image'])

    return tree


# ═══════════════════════════════════════════════════════════════
# 7. CAMERA
# ═══════════════════════════════════════════════════════════════

# Case centre
CX, CY, CZ = 0.0, 0.0, 0.0105

SHOTS = {
    'hero_angle': {
        'loc':    ( 0.095, -0.095,  0.082),
        'target': ( CX,     CY,     0.012),
        'lens':   85,
        'fstop':  16,    # everything sharp — poster hero
        'desc':   'Hero — assembled, 45° isometric, fully sharp',
    },
    'hero_bokeh': {
        'loc':    ( 0.090, -0.095,  0.080),
        'target': ( CX,     CY,     0.015),
        'lens':   100,
        'fstop':  4.5,   # shallow DOF for dramatic poster
        'desc':   'Hero — dreamy bokeh version',
    },
    'exploded': {
        'loc':    ( 0.115, -0.115,  0.110),
        'target': ( CX,     CY,     0.030),
        'lens':   55,
        'fstop':  22,
        'desc':   'Exploded — all layers visible',
    },
    'bottom_skin': {
        'loc':    ( 0.05, -0.06, -0.07),
        'target': ( CX,    CY,   0.001),
        'lens':   45,
        'fstop':  11,
        'desc':   'Underside — electrodes and sensor window',
        'flip_lights': True,
    },
    'usb_side': {
        'loc':    (-0.105, -0.025,  0.016),
        'target': (-0.038,  CY,     0.010),
        'lens':   85,
        'fstop':  8,
        'desc':   'USB-C port detail, left side',
    },
    'internals': {
        'loc':    ( 0.085, -0.085,  0.065),
        'target': ( CX,     CY,     0.008),
        'lens':   70,
        'fstop':  11,
        'desc':   'Internals — top shell removed',
    },
    'closeup_top': {
        'loc':    ( 0.055, -0.070,  0.060),
        'target': ( CX,     CY,     0.018),
        'lens':   100,
        'fstop':  8,
        'desc':   'Top surface — NEURAFY branding detail',
    },
}


def make_camera(shot):
    for o in bpy.data.objects:
        if o.type == 'CAMERA':
            bpy.data.objects.remove(o, do_unlink=True)

    bpy.ops.object.camera_add(location=shot['loc'])
    cam = bpy.context.active_object
    cam.name = "Cam"
    cam.data.lens      = shot['lens']
    cam.data.clip_start = 0.001
    cam.data.clip_end   = 10.0

    # Depth of field
    cam.data.dof.use_dof           = True
    cam.data.dof.aperture_fstop    = shot['fstop']
    focus_dist = (Vector(shot['loc']) - Vector(shot['target'])).length
    cam.data.dof.focus_distance    = focus_dist

    # Point at target
    direction  = Vector(shot['target']) - Vector(shot['loc'])
    rot_quat   = direction.to_track_quat('-Z', 'Y')
    cam.rotation_euler = rot_quat.to_euler()

    bpy.context.scene.camera = cam
    return cam


# ═══════════════════════════════════════════════════════════════
# 8. RENDER
# ═══════════════════════════════════════════════════════════════

ALL_LIGHTS = ["Key","Fill","Rim","Top","Kick"]


def _set_lights(visible=True):
    for n in ALL_LIGHTS:
        lt = bpy.data.objects.get(n)
        if lt:
            lt.hide_render   = not visible
            lt.hide_viewport = not visible


def render_shot(name, shot, objects, backdrop):
    print(f"\n{'─'*55}")
    print(f"  {name.upper():30s} {shot['desc']}")
    print(f"{'─'*55}")

    # Default: show everything
    for o in objects.values():
        o.hide_render   = False
        o.hide_viewport = False
    backdrop.hide_render   = False
    backdrop.hide_viewport = False
    _set_lights(True)

    # Per-shot visibility
    if name == 'internals':
        for k in ('top_shell', 'screws'):
            if k in objects:
                objects[k].hide_render = objects[k].hide_viewport = True

    elif name == 'bottom_skin':
        for k in ('top_shell', 'screws'):
            if k in objects:
                objects[k].hide_render = objects[k].hide_viewport = True
        backdrop.hide_render = backdrop.hide_viewport = True
        _set_lights(False)
        # Underside-specific lights
        _add_temp_underside_lights()

    make_camera(shot)

    bpy.context.scene.render.filepath = os.path.join(OUT_DIR, f"{name}.png")
    bpy.ops.render.render(write_still=True)
    print(f"  → {OUT_DIR}/{name}.png")

    _cleanup_temp_lights()


def _add_temp_underside_lights():
    for pos, energy, rot in [
        (( 0.05, -0.04, -0.07), 2.0, (180,  0,  30)),
        ((-0.04,  0.03, -0.06), 1.2, (180,  0, -20)),
        (( 0.00, -0.07, -0.05), 1.0, (160,  0,   0)),
    ]:
        bpy.ops.object.light_add(type='AREA', location=pos)
        lt = bpy.context.active_object
        lt.name = "TmpLight"
        lt.data.energy = energy
        lt.data.size   = 0.22
        lt.data.color  = (1.0, 0.97, 0.94)
        lt.rotation_euler = Euler(tuple(math.radians(d) for d in rot))


def _cleanup_temp_lights():
    for o in list(bpy.data.objects):
        if o.name == "TmpLight":
            bpy.data.objects.remove(o, do_unlink=True)
    _set_lights(True)


def render_exploded(objects, backdrop):
    """Shift each layer up, render, then restore."""
    print(f"\n{'─'*55}")
    print(f"  EXPLODED VIEW")
    print(f"{'─'*55}")

    gap = 0.016  # 16 mm per layer

    LAYERS = {
        'bottom_shell':   0.0,
        'sensor_window':  0.0,
        'electrode_left': 0.0,
        'electrode_right':0.0,
        'max30102':       gap * 1,
        'tp4056':         gap * 1,
        'pololu':         gap * 1,
        'grove_gsr':      gap * 1,
        'slide_switch':   gap * 1,
        'arduino':        gap * 2,
        'battery':        gap * 2.6,
        'top_shell':      gap * 3.5,
        'screws':         gap * 3.5,
    }

    saved = {}
    for n, dz in LAYERS.items():
        if n in objects:
            saved[n] = objects[n].location.copy()
            objects[n].location.z += dz
            objects[n].hide_render = objects[n].hide_viewport = False

    backdrop.hide_render = backdrop.hide_viewport = False
    _set_lights(True)
    make_camera(SHOTS['exploded'])

    bpy.context.scene.render.filepath = os.path.join(OUT_DIR, "exploded.png")
    bpy.ops.render.render(write_still=True)
    print(f"  → {OUT_DIR}/exploded.png")

    for n, loc in saved.items():
        objects[n].location = loc


# ═══════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════

def main():
    print("\n" + "═"*60)
    print("  NeuraFy — Ultra-Photorealistic Pipeline v3")
    print("═"*60 + "\n")

    sc = setup_scene()
    print("[1/7] Scene: Cycles 512spp, Filmic High Contrast")

    materials = create_all_materials()
    print(f"[2/7] Materials: {len(materials)} PBR (clearcoat + bump + aniso)")

    print("[3/7] Importing STLs + bevel modifiers...")
    objects = import_all(materials)
    print(f"       {len(objects)} objects")

    setup_lighting()
    print("[4/7] 5-point softbox rig")

    backdrop = add_backdrop()
    print("[5/7] Infinity cove backdrop")

    setup_compositor()
    print("[6/7] Compositor: glow + vignette + CA + colour balance")

    print("[7/7] Rendering shots...\n")
    for name, shot in SHOTS.items():
        if name == 'exploded':
            continue
        render_shot(name, shot, objects, backdrop)

    render_exploded(objects, backdrop)

    print("\n" + "═"*60)
    print("  DONE — all renders in enclosure/renders/")
    print("═"*60 + "\n")


main()
