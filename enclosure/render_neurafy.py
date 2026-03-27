"""
NeuraFy Enclosure — Blender Photorealistic Render Script
=========================================================
Run headless:  blender --background --python render_neurafy.py
Outputs 4K PNGs to ./renders/
"""

import bpy
import bmesh
import os
import math
from mathutils import Vector, Euler

# ── Paths ──
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
STL_DIR = os.path.join(SCRIPT_DIR, "stl")
OUT_DIR = os.path.join(SCRIPT_DIR, "renders")
os.makedirs(OUT_DIR, exist_ok=True)


# ═══════════════════════════════════════════════════════
# 1. SCENE SETUP
# ═══════════════════════════════════════════════════════

def setup_scene():
    """Clear scene and configure render settings."""
    # Delete everything
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)

    # Remove orphan data
    for block in bpy.data.meshes:
        if block.users == 0:
            bpy.data.meshes.remove(block)
    for block in bpy.data.materials:
        if block.users == 0:
            bpy.data.materials.remove(block)

    scene = bpy.context.scene

    # Render engine — Cycles for photorealism
    scene.render.engine = 'CYCLES'
    prefs = bpy.context.preferences.addons['cycles'].preferences

    # Try GPU, fallback to CPU
    try:
        prefs.compute_device_type = 'METAL'  # macOS Apple Silicon
        prefs.get_devices()
        for d in prefs.devices:
            d.use = True
        scene.cycles.device = 'GPU'
        print("Using Metal GPU rendering")
    except Exception:
        scene.cycles.device = 'CPU'
        print("Falling back to CPU rendering")

    # Quality settings
    scene.cycles.samples = 256
    scene.cycles.use_denoising = True
    scene.cycles.denoiser = 'OPENIMAGEDENOISE'
    scene.cycles.use_adaptive_sampling = True
    scene.cycles.adaptive_threshold = 0.01

    # Resolution — 4K
    scene.render.resolution_x = 3840
    scene.render.resolution_y = 2160
    scene.render.resolution_percentage = 100

    # Film — transparent background
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'
    scene.render.image_settings.compression = 15

    # Color management
    scene.view_settings.view_transform = 'Filmic'
    scene.view_settings.look = 'High Contrast'

    # World — dark HDRI-like environment
    world = bpy.data.worlds.new("NeuraBandWorld")
    scene.world = world
    world.use_nodes = True
    nodes = world.node_tree.nodes
    links = world.node_tree.links
    nodes.clear()

    bg = nodes.new('ShaderNodeBackground')
    bg.inputs['Color'].default_value = (0.012, 0.015, 0.025, 1.0)
    bg.inputs['Strength'].default_value = 0.3
    output = nodes.new('ShaderNodeOutputWorld')
    links.new(bg.outputs['Background'], output.inputs['Surface'])

    return scene


# ═══════════════════════════════════════════════════════
# 2. MATERIALS
# ═══════════════════════════════════════════════════════

def hex_to_linear(hex_str):
    """Convert hex color to linear sRGB for Blender."""
    h = hex_str.lstrip('#')
    r, g, b = tuple(int(h[i:i+2], 16) / 255.0 for i in (0, 2, 4))
    # sRGB to linear
    def s2l(c):
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    return (s2l(r), s2l(g), s2l(b), 1.0)


def make_material(name, base_color, roughness=0.5, metallic=0.0,
                  subsurface=0.0, transmission=0.0, alpha=1.0,
                  emission_color=None, emission_strength=0.0):
    """Create a Principled BSDF material."""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()

    bsdf = nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.inputs['Base Color'].default_value = base_color
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = metallic
    # Subsurface weight (Blender 4.x)
    if hasattr(bsdf.inputs, 'Subsurface Weight'):
        bsdf.inputs['Subsurface Weight'].default_value = subsurface
    elif 'Subsurface' in bsdf.inputs:
        bsdf.inputs['Subsurface'].default_value = subsurface

    if transmission > 0:
        if 'Transmission Weight' in bsdf.inputs:
            bsdf.inputs['Transmission Weight'].default_value = transmission
        elif 'Transmission' in bsdf.inputs:
            bsdf.inputs['Transmission'].default_value = transmission
        bsdf.inputs['IOR'].default_value = 1.45

    if emission_color and emission_strength > 0:
        if 'Emission Color' in bsdf.inputs:
            bsdf.inputs['Emission Color'].default_value = emission_color
            bsdf.inputs['Emission Strength'].default_value = emission_strength

    if alpha < 1.0:
        bsdf.inputs['Alpha'].default_value = alpha
        mat.blend_method = 'BLEND' if hasattr(mat, 'blend_method') else None

    output = nodes.new('ShaderNodeOutputMaterial')
    links.new(bsdf.outputs['BSDF'], output.inputs['Surface'])

    return mat


def create_materials():
    """Create all PBR materials for NeuraFy components."""
    mats = {}

    # Case shells — glossy teal plastic with subtle subsurface
    mats['bottom_shell'] = make_material(
        'BottomShell', hex_to_linear('4A9BAA'),
        roughness=0.18, subsurface=0.03)

    mats['top_shell'] = make_material(
        'TopShell', hex_to_linear('5AABBA'),
        roughness=0.18, subsurface=0.03, alpha=0.85)

    # PCBs — matte with slight sheen
    mats['arduino'] = make_material(
        'ArduinoPCB', hex_to_linear('004D59'), roughness=0.55)

    mats['max30102'] = make_material(
        'MAX30102', hex_to_linear('5C1429'), roughness=0.55)

    mats['tp4056'] = make_material(
        'TP4056', hex_to_linear('142659'), roughness=0.55)

    mats['pololu'] = make_material(
        'Pololu', hex_to_linear('147326'), roughness=0.55)

    mats['grove_gsr'] = make_material(
        'GroveGSR', hex_to_linear('148026'), roughness=0.55)

    # Battery — brushed aluminum
    mats['battery'] = make_material(
        'Battery', hex_to_linear('B8B8C0'),
        roughness=0.28, metallic=0.85)

    # Electrodes — polished stainless steel
    mats['electrode'] = make_material(
        'Electrode', hex_to_linear('D0D0D5'),
        roughness=0.12, metallic=1.0)

    # Slide switch — dark plastic
    mats['slide_switch'] = make_material(
        'SlideSwitch', hex_to_linear('1E1E22'), roughness=0.35)

    # Screws — steel
    mats['screws'] = make_material(
        'Screws', hex_to_linear('606068'),
        roughness=0.22, metallic=0.92)

    # Sensor window — glass/transparent
    mats['sensor_window'] = make_material(
        'SensorWindow', hex_to_linear('E8F0EC'),
        roughness=0.02, transmission=0.92)

    return mats


# ═══════════════════════════════════════════════════════
# 3. IMPORT & ASSIGN MATERIALS
# ═══════════════════════════════════════════════════════

COMPONENT_MAP = {
    'bottom_shell': 'bottom_shell',
    'top_shell': 'top_shell',
    'arduino': 'arduino',
    'max30102': 'max30102',
    'tp4056': 'tp4056',
    'pololu': 'pololu',
    'grove_gsr': 'grove_gsr',
    'battery': 'battery',
    'electrode_left': 'electrode',
    'electrode_right': 'electrode',
    'slide_switch': 'slide_switch',
    'screws': 'screws',
    'sensor_window': 'sensor_window',
}


def import_components(materials):
    """Import all STL files and assign materials."""
    objects = {}

    for stl_name, mat_key in COMPONENT_MAP.items():
        filepath = os.path.join(STL_DIR, f"{stl_name}.stl")
        if not os.path.exists(filepath):
            print(f"WARNING: Missing {filepath}")
            continue

        bpy.ops.wm.stl_import(filepath=filepath)
        obj = bpy.context.active_object
        obj.name = stl_name

        # Scale: OpenSCAD exports in mm, Blender uses meters
        obj.scale = (0.001, 0.001, 0.001)
        bpy.ops.object.transform_apply(scale=True)

        # Smooth shading
        bpy.ops.object.shade_smooth()

        # Auto smooth via modifier (Blender 4.x)
        mod = obj.modifiers.new("EdgeSplit", 'EDGE_SPLIT')
        mod.split_angle = math.radians(30)

        # Assign material
        if mat_key in materials:
            obj.data.materials.clear()
            obj.data.materials.append(materials[mat_key])

        objects[stl_name] = obj
        print(f"  Imported: {stl_name} ({len(obj.data.vertices)} verts)")

    return objects


# ═══════════════════════════════════════════════════════
# 4. LIGHTING
# ═══════════════════════════════════════════════════════

def setup_lighting():
    """Create studio-quality 3-point lighting."""

    # Key light — warm, strong, upper right
    bpy.ops.object.light_add(type='AREA', location=(0.12, -0.10, 0.15))
    key = bpy.context.active_object
    key.name = "KeyLight"
    key.data.energy = 8.0
    key.data.size = 0.15
    key.data.color = (1.0, 0.95, 0.88)  # warm
    key.rotation_euler = Euler((math.radians(55), math.radians(10), math.radians(35)))

    # Fill light — cool, softer, left side
    bpy.ops.object.light_add(type='AREA', location=(-0.12, -0.06, 0.08))
    fill = bpy.context.active_object
    fill.name = "FillLight"
    fill.data.energy = 3.0
    fill.data.size = 0.20
    fill.data.color = (0.88, 0.92, 1.0)  # cool
    fill.rotation_euler = Euler((math.radians(45), math.radians(-15), math.radians(-30)))

    # Rim light — behind and above for edge glow
    bpy.ops.object.light_add(type='SPOT', location=(0.0, 0.12, 0.12))
    rim = bpy.context.active_object
    rim.name = "RimLight"
    rim.data.energy = 15.0
    rim.data.spot_size = math.radians(60)
    rim.data.spot_blend = 0.5
    rim.data.color = (0.95, 0.98, 1.0)
    rim.rotation_euler = Euler((math.radians(130), 0, math.radians(180)))

    # Accent light — subtle bottom fill to show underside detail
    bpy.ops.object.light_add(type='AREA', location=(0.0, -0.05, -0.03))
    accent = bpy.context.active_object
    accent.name = "AccentLight"
    accent.data.energy = 1.5
    accent.data.size = 0.10
    accent.data.color = (0.7, 0.85, 1.0)
    accent.rotation_euler = Euler((math.radians(-80), 0, 0))

    return key, fill, rim, accent


# ═══════════════════════════════════════════════════════
# 5. GROUND PLANE
# ═══════════════════════════════════════════════════════

def add_ground_plane():
    """Add a subtle dark ground plane for shadow catching."""
    bpy.ops.mesh.primitive_plane_add(size=0.5, location=(0, 0, -0.002))
    plane = bpy.context.active_object
    plane.name = "GroundPlane"

    mat = bpy.data.materials.new("GroundMat")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()

    bsdf = nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.inputs['Base Color'].default_value = (0.015, 0.018, 0.028, 1.0)
    bsdf.inputs['Roughness'].default_value = 0.6
    bsdf.inputs['Metallic'].default_value = 0.0

    # Subtle reflection
    if 'Specular IOR Level' in bsdf.inputs:
        bsdf.inputs['Specular IOR Level'].default_value = 0.3
    elif 'Specular' in bsdf.inputs:
        bsdf.inputs['Specular'].default_value = 0.3

    output = nodes.new('ShaderNodeOutputMaterial')
    links.new(bsdf.outputs['BSDF'], output.inputs['Surface'])

    plane.data.materials.append(mat)
    return plane


# ═══════════════════════════════════════════════════════
# 6. CAMERA SETUP & RENDER
# ═══════════════════════════════════════════════════════

# Device center in Blender coordinates (mm -> m)
# Case is 70x42x21 mm, centered at origin in OpenSCAD
CX, CY, CZ = 0.0, 0.0, 0.0105  # center of case (10.5mm up)

CAMERAS = {
    'hero_angle': {
        'location': (0.09, -0.09, 0.07),
        'target': (CX, CY, CZ),
        'lens': 65,
        'desc': 'Main poster shot — 45 deg isometric',
    },
    'exploded': {
        'location': (0.11, -0.11, 0.09),
        'target': (CX, CY, 0.03),
        'lens': 50,
        'desc': 'Exploded view (requires offset objects)',
        'skip': True,  # We'll do this as a separate pass
    },
    'bottom_skin': {
        'location': (0.06, -0.06, -0.05),
        'target': (CX, CY, 0.001),
        'lens': 50,
        'desc': 'Underside — electrodes and sensor window',
        'no_ground': True,
    },
    'usb_port': {
        'location': (-0.10, -0.03, 0.015),
        'target': (-0.035, CY, 0.008),
        'lens': 70,
        'desc': 'Left side — USB-C charging port detail',
    },
    'internals': {
        'location': (0.08, -0.08, 0.06),
        'target': (CX, CY, 0.007),
        'lens': 60,
        'desc': 'Top shell removed — internal components visible',
    },
    'closeup_top': {
        'location': (0.06, -0.07, 0.055),
        'target': (CX, CY, 0.018),
        'lens': 65,
        'desc': 'Close-up of top surface with NEURAFY branding',
    },
}


def setup_camera(cam_config):
    """Create and position camera for a specific angle."""
    # Remove existing cameras
    for obj in bpy.data.objects:
        if obj.type == 'CAMERA':
            bpy.data.objects.remove(obj, do_unlink=True)

    bpy.ops.object.camera_add(location=cam_config['location'])
    cam = bpy.context.active_object
    cam.name = "RenderCamera"
    cam.data.lens = cam_config['lens']
    cam.data.clip_start = 0.001
    cam.data.clip_end = 10.0

    # Depth of field for cinematic look
    cam.data.dof.use_dof = True
    cam.data.dof.aperture_fstop = 11.0
    target = Vector(cam_config['target'])
    cam.data.dof.focus_distance = (Vector(cam_config['location']) - target).length

    # Point at target
    direction = target - Vector(cam_config['location'])
    rot_quat = direction.to_track_quat('-Z', 'Y')
    cam.rotation_euler = rot_quat.to_euler()

    bpy.context.scene.camera = cam
    return cam


def render_view(name, config, objects):
    """Set up and render a specific camera angle."""
    print(f"\n{'='*50}")
    print(f"Rendering: {name} — {config['desc']}")
    print(f"{'='*50}")

    if config.get('skip'):
        print(f"  Skipping (manual setup needed)")
        return

    # Handle visibility for specific views
    if name == 'internals':
        # Hide top shell to show internals
        if 'top_shell' in objects:
            objects['top_shell'].hide_render = True
            objects['top_shell'].hide_viewport = True
    elif name == 'bottom_skin':
        # Hide top shell and internals for clean underside view
        for key in ['top_shell', 'screws']:
            if key in objects:
                objects[key].hide_render = True
                objects[key].hide_viewport = True
        # Hide ground plane (camera is below it)
        gp = bpy.data.objects.get("GroundPlane")
        if gp:
            gp.hide_render = True
            gp.hide_viewport = True
        # Add strong underside light
        bpy.ops.object.light_add(type='AREA', location=(0.0, 0.0, -0.06))
        under_light = bpy.context.active_object
        under_light.name = "UndersideLight"
        under_light.data.energy = 12.0
        under_light.data.size = 0.15
        under_light.data.color = (1.0, 0.97, 0.92)
        under_light.rotation_euler = Euler((math.radians(180), 0, 0))
    else:
        # Show everything
        for obj in objects.values():
            obj.hide_render = False
            obj.hide_viewport = False

    setup_camera(config)

    # Render
    filepath = os.path.join(OUT_DIR, f"{name}.png")
    bpy.context.scene.render.filepath = filepath
    bpy.ops.render.render(write_still=True)
    print(f"  Saved: {filepath}")

    # Reset visibility
    for obj in objects.values():
        obj.hide_render = False
        obj.hide_viewport = False
    gp = bpy.data.objects.get("GroundPlane")
    if gp:
        gp.hide_render = False
        gp.hide_viewport = False
    # Remove temporary underside light
    ul = bpy.data.objects.get("UndersideLight")
    if ul:
        bpy.data.objects.remove(ul, do_unlink=True)


# ═══════════════════════════════════════════════════════
# 7. EXPLODED VIEW
# ═══════════════════════════════════════════════════════

def render_exploded(objects):
    """Create exploded view by offsetting components along Z."""
    print(f"\n{'='*50}")
    print(f"Rendering: exploded — Full exploded view")
    print(f"{'='*50}")

    gap = 0.014  # 14mm in meters

    # Save original positions
    originals = {}
    for name, obj in objects.items():
        originals[name] = obj.location.copy()

    # Offset layers
    layer_offsets = {
        'bottom_shell': 0,
        'sensor_window': 0,
        'electrode_left': 0,
        'electrode_right': 0,
        'max30102': gap,
        'tp4056': gap,
        'pololu': gap,
        'grove_gsr': gap,
        'slide_switch': gap,
        'arduino': gap * 2,
        'battery': gap * 2.5,
        'top_shell': gap * 3,
        'screws': gap * 3,
    }

    for name, offset in layer_offsets.items():
        if name in objects:
            objects[name].location.z += offset

    # Camera for exploded view
    config = {
        'location': (0.12, -0.12, 0.12),
        'target': (CX, CY, 0.035),
        'lens': 45,
    }
    setup_camera(config)

    filepath = os.path.join(OUT_DIR, "exploded.png")
    bpy.context.scene.render.filepath = filepath
    bpy.ops.render.render(write_still=True)
    print(f"  Saved: {filepath}")

    # Restore positions
    for name, obj in objects.items():
        if name in originals:
            obj.location = originals[name]


# ═══════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════

def main():
    print("\n" + "="*60)
    print("  NeuraFy Enclosure — Photorealistic Render Pipeline")
    print("="*60 + "\n")

    # 1. Setup
    scene = setup_scene()
    print("[1/6] Scene configured (Cycles, 4K, Filmic)")

    # 2. Materials
    materials = create_materials()
    print(f"[2/6] Created {len(materials)} PBR materials")

    # 3. Import
    print("[3/6] Importing components...")
    objects = import_components(materials)
    print(f"  Total: {len(objects)} objects imported")

    # 4. Lighting
    setup_lighting()
    print("[4/6] Studio lighting configured (4-point)")

    # 5. Ground plane
    add_ground_plane()
    print("[5/6] Ground plane added")

    # 6. Render all views
    print("[6/6] Rendering views...\n")

    for name, config in CAMERAS.items():
        render_view(name, config, objects)

    # Exploded view (special handling)
    render_exploded(objects)

    print("\n" + "="*60)
    print("  ALL RENDERS COMPLETE")
    print(f"  Output: {OUT_DIR}")
    print("="*60 + "\n")


if __name__ == "__main__":
    main()
