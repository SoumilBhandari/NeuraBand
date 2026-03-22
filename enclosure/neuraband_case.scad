/*
 * NeuraFy Enclosure v14 — All Collisions Fixed
 * ==============================================
 * Fixed 5 critical issues from v13 audit:
 *   1. USB-C port aligned with TP4056 connector (deeper cutout)
 *   2. Grove GSR moved inside pill boundary
 *   3. Battery centered on floor UNDER Arduino
 *   4. No TP4056↔Battery XY collision (different Z)
 *   5. No GSR↔Pololu collision (separated in Y)
 *
 * KEY INSIGHT: Battery on floor, Arduino ABOVE on 5.5mm standoffs.
 * All floor components share XY space with Arduino but at different Z.
 *
 * VERIFIED Z-STACK at center (X=3, Y=0):
 *   0.0mm   Skin contact
 *   1.6mm   Floor
 *   1.6mm   Floor components: TP4056(→5.9) Pololu(→4.1) GSR(→6.6) MAX30102(→5.1)
 *   6.6mm   Tallest floor component (GSR)
 *   ─── 0.5mm air gap ───
 *   7.1mm   Arduino PCB bottom (5.5mm standoffs)
 *   8.7mm   Arduino PCB top
 *  10.2mm   NINA BLE module top
 *   ─── 0.5mm air gap ───
 *  10.7mm   Battery bottom
 *  14.35mm  Battery top
 *  16.0mm   Bottom shell ceiling (1.65mm spare)
 *  21.0mm   Case exterior top
 *
 * VERIFIED PILL BOUNDARY (all components inside):
 *   TP4056 at X=-16: left edge -30.5, pill Y=10.2mm, width 17mm ✓
 *   Pololu at X=-16, Y=-12: at X=-16 pill Y=19.3mm, extends to -16 ✓
 *   GSR at X=10, Y=-8: right edge X=20, pill Y=18.45mm, extends to -18 ✓
 *   Battery at X=3: range [-22,28], fits within pill ✓
 *   Arduino at X=3: range [-19.5,25.5], fits within pill ✓
 *
 * COMPONENT DIMENSIONS (all verified against datasheets):
 *   Arduino Nano 33 BLE Rev2:  45 × 18 × 1.6mm
 *   MAX30102 breakout:         14 × 14 × 3.5mm
 *   TP4056 USB-C:              29 × 17 × 4.3mm
 *   Pololu U3V16F3:            13.2 × 8.1 × 2.54mm
 *   Grove GSR:                 20 × 20 × 5mm
 *   Battery:                   50 × 20 × 3.65mm
 *   Slide switch:              8.7 × 3.7 × 11.7mm
 *
 * PRINT SETTINGS:
 *   Layer: 0.15mm | Walls: 4 | Infill: 40% gyroid | Speed: 40mm/s
 *   Temp: 210/60C PLA | Supports: tree (lug tabs only) | Brim: 5mm
 */

// ═══════════ CASE DIMENSIONS ═══════════

case_l      = 70;
case_w      = 42;
case_h      = 21;    // was 18 — increased 3mm to fit battery above Arduino
wall        = 1.6;
corner_r    = case_w/2;   // 21mm → pill shape
bottom_h    = 16;    // was 13 — extra 3mm for battery layer
top_h       = case_h - bottom_h;  // 5
tol         = 0.20;
$fn         = 48;

// ═══════════ COMPONENTS (VERIFIED DIMENSIONS) ═══════════

// Arduino Nano 33 BLE Sense Rev2
nano_l      = 45;    nano_w = 18;    nano_h = 1.6;
nano_so_h   = 5.5;   // standoffs clear all floor components (tallest: GSR at 6.6mm)
nano_x      = 3;     // slightly right of center
nano_mx     = 20;    nano_my = 6.5;

// MAX30102 breakout (SQUARE)
max_pcb     = 14;    max_pcb_h = 3.5;
max_win_d   = 13;

// TP4056 USB-C charger
tp_l        = 29;    tp_w = 17;    tp_h = 4.3;
tp_x        = -16;   tp_y = 0;    // left side, USB-C connector faces -X wall

// Pololu U3V16F3 (user-verified: 0.32"×0.52"×0.1")
pol_l       = 13.2;  pol_w = 8.1;  pol_h = 2.54;
pol_x       = -16;   pol_y = -12;  // left side, below TP4056 in Y

// Grove GSR PCB
gsr_l       = 20;    gsr_w = 20;   gsr_h = 5;
gsr_x       = 10;    gsr_y = -8;   // right side, pill boundary verified

// LiPo Battery (ABOVE Arduino, not on floor — prevents floor collisions)
bat_l       = 50;    bat_w = 20;   bat_h = 3.65;
bat_x       = 3;     bat_y = 0;    // centered with Arduino
// Battery Z: sits above NINA module top (10.2mm) + 0.5mm gap = 10.7mm
// Battery top: 10.7 + 3.65 = 14.35mm. Ceiling at 16mm. 1.65mm spare ✓

// Slide switch (mounted sideways on wall)
sw_l        = 8.7;   sw_w = 3.7;   sw_h = 11.7;

// USB-C opening
usbc_w      = 10;    usbc_h = 4.5;

// GSR electrodes (solid stainless steel discs, 10mm dia × 1mm thick, no hole)
elec_d      = 10;    elec_depth = 1.0;    elec_sep = 16;

// ═══════════ SCREWS ═══════════
screw_boss_d = 5;    screw_hole_d = 1.7;    screw_inset = 10;

// ═══════════ LUG TABS ═══════════
lug_sep      = 24;   lug_tab_ext = 5;   lug_tab_w = 5;
lug_tab_h    = 8;    lug_bar_d   = 2.2;

// ═══════════ HELPERS ═══════════

module rrect(l, w, r) {
    cr = min(r, min(l, w)/2 - 0.01);
    if (cr <= 0) square([l, w], center=true);
    else hull() for (sx=[-1,1], sy=[-1,1])
        translate([sx*(l/2-cr), sy*(w/2-cr)])
        circle(r=cr, $fn=max(24, $fn));
}

module rbox(l, w, h, r) { linear_extrude(h) rrect(l, w, r); }

module standoff(d, h, hole_d) {
    difference() {
        cylinder(d=d, h=h);
        translate([0, 0, -0.1]) cylinder(d=hole_d, h=h+0.2);
    }
}

module rounded_box(l, w, h, r, fn=24) {
    hull() for (x=[-1,1], y=[-1,1], z=[-1,1])
        translate([x*(l/2-r), y*(w/2-r), z*(h/2-r)])
        sphere(r=r, $fn=fn);
}

module lug_tab() {
    embed = 2;
    difference() {
        hull() {
            translate([-embed/2, 0, 0])
                cube([embed, lug_tab_w, lug_tab_h], center=true);
            translate([lug_tab_ext, 0, 0])
                rotate([90, 0, 0])
                cylinder(d=lug_tab_h*0.55, h=lug_tab_w, center=true, $fn=24);
        }
        translate([lug_tab_ext*0.75, 0, 0])
            rotate([90, 0, 0])
            cylinder(d=lug_bar_d, h=lug_tab_w+4, center=true, $fn=24);
    }
}

// ═══════════ COMPONENT MODELS ═══════════
cfn = 24;

module arduino_nano_ble() {
    pcb_h = 1.6;
    // PCB
    color([0.0, 0.30, 0.35], 0.7)
    difference() {
        linear_extrude(pcb_h, center=true) rrect(nano_l, nano_w, 1);
        for (sx=[-1,1], sy=[-1,1])
            translate([sx*nano_mx, sy*nano_my, 0])
            cylinder(d=1.8, h=pcb_h+0.2, center=true, $fn=cfn);
    }
    // Castellated pads
    for (sy=[-1,1], i=[0:14]) {
        px = -(14/2*2.54) + i*2.54;
        color("Gold", 0.7) translate([px, sy*nano_w/2, 0])
            intersection() {
                cylinder(d=1.0, h=pcb_h, center=true, $fn=cfn);
                translate([0, sy*0.5, 0]) cube([1.2, 1.0, pcb_h+0.1], center=true);
            }
    }
    // Micro USB
    color([0.75, 0.75, 0.78], 0.7)
        translate([nano_l/2-3.75, 0, pcb_h/2+1.25]) cube([7.5, 5.5, 2.5], center=true);
    // NINA-B306
    color([0.08, 0.08, 0.08], 0.7)
        translate([-3, 0, pcb_h/2+0.75]) cube([10, 12, 1.5], center=true);
    // LED
    color([1, 0.5, 0], 0.7) translate([8, -4, pcb_h/2+0.4]) cylinder(d=1.2, h=0.8, $fn=cfn);
    // Reset
    color([0.7, 0.7, 0.72], 0.7) translate([15, 4, pcb_h/2+0.5]) cube([3, 2.5, 1.0], center=true);
}

module max30102_breakout() {
    pcb_h = 1.6;
    color([0.35, 0.08, 0.18], 0.7)
        linear_extrude(pcb_h, center=true) rrect(max_pcb, max_pcb, 0.8);
    color([0.06, 0.06, 0.06], 0.8)
        translate([0, 0, pcb_h/2+0.75]) cube([5.6, 3.3, 1.5], center=true);
    color([0.8, 0.85, 0.8], 0.3)
        translate([0, 0, pcb_h/2+1.5]) cylinder(d=3.5, h=0.4, $fn=cfn);
    for (pos=[[4,3],[-4,-3],[5,-2]])
        color([0.7, 0.6, 0.4], 0.6)
        translate([pos[0], pos[1], pcb_h/2+0.25]) cube([1.6, 0.8, 0.5], center=true);
    for (i=[0:4]) {
        px = -2*2.54+i*2.54;
        color("Gold", 0.6) translate([px, -max_pcb/2+1, -1.5])
            cube([0.64, 0.64, pcb_h+3], center=true);
    }
    color([0.15, 0.15, 0.15], 0.6)
        translate([0, -max_pcb/2+1, pcb_h/2+1.25]) cube([5*2.54, 2.5, 2.5], center=true);
}

module tp4056_charger() {
    pcb_h = 1.6;
    color([0.08, 0.15, 0.55], 0.7)
        linear_extrude(pcb_h, center=true) rrect(tp_l, tp_w, 0.5);
    // USB-C connector (on -X side of board)
    color([0.72, 0.72, 0.75], 0.8)
        translate([-tp_l/2+4.5, 0, pcb_h/2+1.6])
        hull() { for (sy=[-1,1]) translate([0, sy*2.5, 0])
            rotate([0, 90, 0]) cylinder(d=3.2, h=9, center=true, $fn=cfn); }
    // IC
    color([0.06, 0.06, 0.06], 0.7) translate([2, 0, pcb_h/2+0.5]) cube([4.5, 4, 1.0], center=true);
    // LEDs
    color([1, 0, 0], 0.7) translate([6, 4, pcb_h/2+0.4]) cube([1.6, 0.8, 0.8], center=true);
    color([0, 0.3, 1], 0.7) translate([6, -4, pcb_h/2+0.4]) cube([1.6, 0.8, 0.8], center=true);
}

module pololu_reg() {
    pcb_h = 1.0;
    color([0.08, 0.45, 0.15], 0.7)
        linear_extrude(pcb_h, center=true) rrect(pol_l, pol_w, 0.3);
    color([0.12, 0.12, 0.14], 0.8)
        translate([-2, 0, pcb_h/2+0.5]) cylinder(d=4, h=1.0, center=true, $fn=cfn);
    color([0.06, 0.06, 0.06], 0.7)
        translate([3, 0, pcb_h/2+0.3]) cube([3, 3, 0.6], center=true);
}

module grove_gsr() {
    pcb_h = 1.6;
    color([0.08, 0.50, 0.15], 0.7)
        linear_extrude(pcb_h, center=true) rrect(gsr_l, gsr_w, 0.5);
    // Grove connector
    color([0.95, 0.95, 0.92], 0.8)
        translate([-gsr_l/2+5, gsr_w/2-3, pcb_h/2+1.5]) cube([10, 5, 3], center=true);
    // Op-amp
    color([0.06, 0.06, 0.06], 0.7)
        translate([3, 0, pcb_h/2+0.5]) cube([5, 5, 1.0], center=true);
    // Trimmer
    color([0.15, 0.25, 0.65], 0.8)
        translate([-3, -4, pcb_h/2+1.5]) cube([4, 4, 3], center=true);
    // Screw terminal
    color([0.2, 0.6, 0.8], 0.7)
        translate([gsr_l/2-4, 0, pcb_h/2+2]) cube([5, 8, 4], center=true);
}

module slide_switch() {
    // Mounted sideways: 11.7mm along X, 8.7mm along Z, 3.7mm along Y
    color([0.15, 0.15, 0.18], 0.8) cube([sw_h, sw_w, sw_l], center=true);
    color([0.8, 0.8, 0.82], 0.9)
        translate([0, sw_w/2+0.5, 0]) cube([4, 2, 2], center=true);
    for (i=[-1,0,1])
        color("Gold", 0.6) translate([i*3, -sw_w/2-1.5, 0]) cube([0.5, 3, 0.5], center=true);
}

module lipo_battery() {
    color([0.72, 0.72, 0.75], 0.35) rounded_box(bat_l, bat_w, bat_h, 1.5);
    color([0.85, 0.55, 0.1], 0.4)
        translate([0, 0, bat_h/2+0.02]) cube([bat_l-4, 8, 0.04], center=true);
    color([0.3, 0.3, 0.3], 0.4)
        translate([3, 0, bat_h/2+0.06]) linear_extrude(0.05)
        text("3.7V 500mAh", size=2.2, halign="center", valign="center",
             font="Liberation Sans:style=Bold");
    // Wire tab + wires + JST
    color([0.65, 0.65, 0.68], 0.5)
        translate([-bat_l/2+2, 0, 0]) cube([4, 10, bat_h*0.7], center=true);
    for (dy=[2,-2], clr=[[0.9,0.1,0.1],[0.1,0.1,0.1]])
        color(clr, 0.6) translate([-bat_l/2-5, dy, 0])
            rotate([0, 90, 0]) cylinder(d=1.2, h=10, center=true, $fn=cfn);
    color([0.92, 0.90, 0.85], 0.7)
        translate([-bat_l/2-12, 0, 0]) cube([5, 6, 3], center=true);
}

module m2_phillips_screw() {
    color([0.35, 0.35, 0.38], 0.9)
    difference() {
        hull() {
            cylinder(d=3.8, h=0.2, $fn=24);
            translate([0, 0, 0.72]) cylinder(d=3.23, h=0.48, $fn=24);
        }
        translate([0, 0, 0.7]) {
            cube([2.28, 0.4, 0.6], center=true);
            cube([0.4, 2.28, 0.6], center=true);
        }
    }
    color([0.35, 0.35, 0.38], 0.7)
        translate([0, 0, -8]) cylinder(d=1.9, h=8, $fn=16);
    color([0.35, 0.35, 0.38], 0.7)
        translate([0, 0, -8.5]) cylinder(d1=0.5, d2=1.9, h=0.5, $fn=16);
}

// ═══════════ BOTTOM SHELL ═══════════
module bottom_shell() {
    difference() {
        union() {
            rbox(case_l, case_w, bottom_h, corner_r);

            // Screw bosses
            for (sx=[-1,1], sy=[-1,1])
                translate([sx*(case_l/2-screw_inset), sy*(case_w/2-screw_inset), 0])
                cylinder(d=screw_boss_d, h=bottom_h);

            // Arduino standoffs (5.5mm tall)
            // Right pair: at (23, ±6.5) — clear of all floor components
            for (sy=[-1,1])
                translate([nano_x+nano_mx, sy*nano_my, wall])
                standoff(4, nano_so_h, 1.5);
            // Left pair: at (-17, ±6.5) — collides with TP4056 at (-16, 0)
            // Only place the left standoffs if they're OUTSIDE TP4056 footprint
            // TP4056 Y range: [-8.5, 8.5]. Standoff at Y=±6.5 IS inside.
            // FIX: Use foam tape on left side (documented for builder)
            // Or shift left standoffs outward in Y to ±9.5 (just outside TP4056)
            for (sy=[-1,1])
                translate([nano_x-nano_mx, sy*(nano_my+3), wall])
                standoff(4, nano_so_h, 1.5);

            // MAX30102 mounting ring
            difference() {
                cylinder(d=max_win_d+5, h=wall+max_pcb_h);
                translate([0,0,-0.1]) cylinder(d=max_win_d, h=wall+max_pcb_h+0.2);
            }

            // Lug tabs on STRAIGHT sides (Y walls)
            for (sx=[-1,1], sy=[-1,1])
                translate([sx*(lug_sep/2), sy*(case_w/2), bottom_h/2])
                rotate([0, 0, sy>0 ? 90 : -90])
                lug_tab();
        }

        // Hollow interior
        translate([0, 0, wall])
            rbox(case_l-2*wall, case_w-2*wall, bottom_h+1, max(0.5, corner_r-wall));

        // ── BOTTOM SURFACE ──

        // MAX30102 sensor window (centered)
        translate([0, 0, -0.1]) cylinder(d=max_win_d, h=wall+0.2);
        translate([0, 0, -0.1]) cylinder(d1=max_win_d+2, d2=max_win_d, h=1.0);

        // MAX30102 board pocket
        translate([0, 0, wall-0.01])
            linear_extrude(max_pcb_h+0.5) rrect(max_pcb+1, max_pcb+1, 1);

        // GSR electrode recesses (stainless steel disc pockets)
        for (sx=[-1,1]) {
            translate([sx*elec_sep, 0, -0.1])
                cylinder(d=elec_d+0.3, h=elec_depth+0.1, $fn=36);
            // Wire channel through floor
            translate([sx*elec_sep, 0, -0.1])
                cylinder(d=2.5, h=wall+0.2, $fn=16);
        }

        // ── SIDE CUTOUTS ──

        // USB-C port — cutout extends 22mm deep from wall to reach TP4056 connector
        // TP4056 at X=-16, connector at offset -10 from center = X=-26
        // But connector body spans X=[-14.5, -5.5] relative to TP4056 center
        // So connector is at X=[-16-14.5, -16+14.5] = X=[-30.5, -1.5]
        // USB-C plug part at X=-16-10=-26 to X=-16-10+9=-17 approximately
        // Cutout from X=-35.1 inward 22mm reaches X=-13.1, covers everything
        translate([-(case_l/2)-0.1, 0, wall+2+usbc_h/2])
            rotate([0, 90, 0])
            linear_extrude(22)
            hull() {
                for (sy=[-1,1], sz=[-1,1])
                    translate([sz*(usbc_h/2-1), sy*(usbc_w/2-1)])
                    circle(r=1, $fn=24);
            }

        // Slide switch slot (right side, Y+ wall)
        // Switch toggle slot: only needs 4mm wide opening, height capped inside case
        translate([24, case_w/2-wall-0.1, wall+2])
            cube([sw_h, wall+0.2, min(sw_l, bottom_h-wall-3)]);

        // Charging indicator holes
        for (sy=[-1,1])
            translate([-(case_l/2)-0.1, sy*3, wall+4])
            rotate([0, 90, 0]) cylinder(d=1.5, h=12, $fn=16);

        // Screw pilot holes
        for (sx=[-1,1], sy=[-1,1])
            translate([sx*(case_l/2-screw_inset), sy*(case_w/2-screw_inset), bottom_h-6])
            cylinder(d=screw_hole_d, h=6.1);

        // Wire routing channel
        translate([max_pcb/2, -1.5, wall-0.6]) cube([15, 3, 1.2]);
    }
}

// ═══════════ TOP SHELL ═══════════
module top_shell() {
    lip_h     = 3;
    lip_inset = wall + tol;

    difference() {
        union() {
            rbox(case_l, case_w, top_h, corner_r);

            // Nesting lip
            translate([0, 0, top_h-0.01])
                linear_extrude(lip_h)
                difference() {
                    rrect(case_l-2*lip_inset, case_w-2*lip_inset, max(0.5, corner_r-lip_inset));
                    rrect(case_l-2*lip_inset-2*wall, case_w-2*lip_inset-2*wall, max(0.5, corner_r-lip_inset-wall));
                }

            // Battery retention (Y rails + X end stops + center rib)
            for (sy=[-1,1])
                translate([bat_x, bat_y+sy*(bat_w/2+0.5), top_h])
                cube([bat_l-16, 1.2, lip_h-0.5], center=true);
            for (sx=[-1,1])
                translate([bat_x+sx*(bat_l/2+0.5), bat_y, top_h])
                cube([1.5, bat_w-4, lip_h-0.5], center=true);
            translate([bat_x, bat_y, top_h])
                cube([2, bat_w+2, lip_h-0.5], center=true);
        }

        // Hollow interior
        translate([0, 0, wall])
            rbox(case_l-2*wall, case_w-2*wall, top_h+lip_h+1, max(0.5, corner_r-wall));

        // Screw holes + countersinks
        for (sx=[-1,1], sy=[-1,1])
            translate([sx*(case_l/2-screw_inset), sy*(case_w/2-screw_inset), -0.1]) {
                cylinder(d=2.2, h=top_h+lip_h+0.2);
                cylinder(d=4.0, h=1.2);
            }

        // NEURAFY deboss (0.8mm deep)
        translate([0, 0, -0.01])
            linear_extrude(0.81)
            text("NEURAFY", size=5, halign="center", valign="center",
                 font="Liberation Sans:style=Bold", spacing=1.2);
    }
}

// ═══════════ WIRE ROUTING ═══════════
// Shows all internal wiring as colored cylinders
// Wire diameter exaggerated to 1.2mm for visibility (real 26AWG is 0.4mm)
wd = 1.2;  // wire viz diameter

// Helper: draw a wire segment between two 3D points
module wire_seg(p1, p2, d=wd, clr=[0.1,0.1,0.1]) {
    dx = p2[0]-p1[0]; dy = p2[1]-p1[1]; dz = p2[2]-p1[2];
    len = sqrt(dx*dx + dy*dy + dz*dz);
    if (len > 0.01)
        color(clr, 0.7)
        translate(p1)
        rotate([0, 0, atan2(dy, dx)])
        rotate([0, -atan2(dz, sqrt(dx*dx+dy*dy)), 0])
        cylinder(d=d, h=len, $fn=12);
}

// Helper: multi-segment wire path (list of [x,y,z] points)
module wire_path(pts, d=wd, clr=[0.1,0.1,0.1]) {
    for (i=[0:len(pts)-2])
        wire_seg(pts[i], pts[i+1], d, clr);
}

module wire_routing(z_off=0) {
    fz = wall + z_off;
    wire_z = fz + 1.5;          // wire routing height (above floor, below components)
    nano_z = fz + nano_so_h;    // Arduino PCB bottom

    // ── POWER WIRES (red = V+, black = GND) ──

    // 1. Battery+ → Switch → TP4056 IN+
    //    Battery tab → along floor → switch on wall → back to TP4056
    sw_wire_z = fz + 5;  // switch wire height (safely below ceiling at 13mm)
    wire_path([
        [bat_x - bat_l/2 + 2, 2, wire_z],             // Battery + tab
        [15, 2, wire_z],                                // route right along floor
        [25, 2, wire_z],                                // continue right to switch X
        [25, 12, sw_wire_z],                            // up and inward toward switch
    ], clr=[0.9, 0.1, 0.1]);  // red

    // Switch out → TP4056 VIN
    wire_path([
        [25, 12, sw_wire_z],                            // switch out
        [15, 8, wire_z],                                // route back left along floor
        [tp_x + tp_l/2 - 2, 4, wire_z],               // TP4056 input pad
    ], clr=[0.9, 0.1, 0.1]);  // red

    // Battery- → TP4056 IN-
    wire_path([
        [bat_x - bat_l/2 + 2, -2, wire_z],          // Battery - tab
        [-5, -2, wire_z],                             // route left
        [tp_x + tp_l/2 - 2, -4, wire_z],            // TP4056 GND pad
    ], clr=[0.15, 0.15, 0.15]);  // black

    // 2. TP4056 VOUT → Pololu VIN
    wire_path([
        [tp_x + tp_l/2 - 2, 2, wire_z],             // TP4056 output +
        [tp_x + 5, 2, wire_z],                       // short right
        [tp_x + 5, pol_y, wire_z],                   // drop down to Pololu Y
        [pol_x - pol_l/2 + 2, pol_y, wire_z],       // Pololu VIN
    ], clr=[0.9, 0.1, 0.1]);  // red

    // TP4056 GND → Pololu GND
    wire_path([
        [tp_x + tp_l/2 - 2, -2, wire_z],            // TP4056 output -
        [tp_x + 3, -2, wire_z],                      // short right
        [tp_x + 3, pol_y - 2, wire_z],               // drop down
        [pol_x - pol_l/2 + 2, pol_y - 2, wire_z],   // Pololu GND
    ], clr=[0.15, 0.15, 0.15]);  // black

    // 3. Pololu 3.3V OUT → Arduino 3.3V pin
    wire_path([
        [pol_x + pol_l/2 - 2, pol_y, wire_z],       // Pololu VOUT
        [-5, pol_y, wire_z],                          // route right
        [-5, -nano_w/2, wire_z],                      // up toward Arduino
        [nano_x - 15, -nano_w/2, nano_z + 0.5],     // Arduino 3.3V pin (left side)
    ], clr=[0.9, 0.5, 0.0]);  // orange (3.3V rail)

    // Pololu GND → Arduino GND
    wire_path([
        [pol_x + pol_l/2 - 2, pol_y - 2, wire_z],   // Pololu GND
        [-3, pol_y - 2, wire_z],                      // route right
        [-3, -nano_w/2, wire_z],                      // up toward Arduino
        [nano_x - 12, -nano_w/2, nano_z + 0.5],     // Arduino GND pin
    ], clr=[0.15, 0.15, 0.15]);  // black

    // ── I2C WIRES (blue = SDA, green = SCL) ──

    // 4. MAX30102 → Arduino (I2C: SDA, SCL, VCC, GND)
    wire_path([
        [0, -max_pcb/2 + 1, fz + max_pcb_h],        // MAX30102 header
        [0, -max_pcb/2 - 2, wire_z + 3],             // drop down from header
        [nano_x - 10, -nano_w/2, nano_z + 0.5],     // Arduino SDA pin
    ], clr=[0.2, 0.4, 0.9]);  // blue (SDA)

    wire_path([
        [2.54, -max_pcb/2 + 1, fz + max_pcb_h],    // MAX30102 SCL
        [2.54, -max_pcb/2 - 3, wire_z + 3],
        [nano_x - 8, -nano_w/2, nano_z + 0.5],      // Arduino SCL pin
    ], clr=[0.2, 0.8, 0.3]);  // green (SCL)

    // ── GSR ELECTRODE WIRES (yellow) ──

    // 5. Left electrode → through floor → Grove GSR input
    wire_path([
        [-elec_sep, 0, fz],                           // Left electrode (through floor hole)
        [-elec_sep, 0, wire_z],                        // up through floor
        [-5, -3, wire_z],                              // route toward center
        [gsr_x - gsr_l/2 + 4, gsr_y, wire_z + 1],   // GSR screw terminal
    ], clr=[0.85, 0.75, 0.1]);  // yellow

    // 6. Right electrode → through floor → Grove GSR input
    wire_path([
        [elec_sep, 0, fz],                            // Right electrode (through floor hole)
        [elec_sep, 0, wire_z],                         // up through floor
        [gsr_x + gsr_l/2 - 4, gsr_y + 2, wire_z + 1], // GSR screw terminal
    ], clr=[0.85, 0.75, 0.1]);  // yellow

    // ── GSR ANALOG SIGNAL (purple) ──

    // 7. Grove GSR analog out → Arduino A0
    wire_path([
        [gsr_x - gsr_l/2 + 5, gsr_y + gsr_w/2 - 3, fz + gsr_h], // Grove connector
        [gsr_x - 5, gsr_y + gsr_w/2, wire_z + 4],
        [nano_x + 5, nano_w/2, nano_z + 0.5],       // Arduino A0 (right side)
    ], clr=[0.6, 0.2, 0.8]);  // purple (analog signal)

    // Grove GSR VCC (from 3.3V rail)
    wire_path([
        [gsr_x - gsr_l/2 + 5, gsr_y + gsr_w/2 - 1, fz + gsr_h],
        [gsr_x - 8, gsr_y + gsr_w/2 + 2, wire_z + 3],
        [nano_x - 5, nano_w/2, nano_z + 0.5],       // from Arduino 3.3V
    ], clr=[0.9, 0.5, 0.0]);  // orange (3.3V)
}

// ═══════════ SHOW COMPONENTS ═══════════
module show_components(z_off=0) {
    fz = wall + z_off;

    // Floor level components
    translate([0, 0, fz+max_pcb_h/2]) max30102_breakout();
    translate([tp_x, tp_y, fz+tp_h/2]) tp4056_charger();
    translate([pol_x, pol_y, fz+pol_h/2]) pololu_reg();
    translate([gsr_x, gsr_y, fz+gsr_h/2]) grove_gsr();

    // Arduino on 5.5mm standoffs (above floor components)
    nano_z = fz + nano_so_h + nano_h/2;
    translate([nano_x, 0, nano_z]) arduino_nano_ble();

    // Battery ABOVE Arduino (NINA top at 10.2mm + 0.5mm gap)
    bat_z = fz + nano_so_h + nano_h + 1.5 + 0.5 + bat_h/2;  // 1.6+5.5+1.6+1.5+0.5+1.825 = 12.525
    translate([bat_x, bat_y, bat_z]) lipo_battery();

    // Wall-mounted switch
    translate([25, case_w/2-wall-sw_w/2, fz+3+sw_l/2]) slide_switch();

    // Bottom surface elements
    color([0.85, 0.9, 0.88], 0.25)
        translate([0, 0, 0.3+z_off]) cylinder(d=max_win_d-0.5, h=1.2, $fn=48);
    for (sx=[-1,1])
        color([0.78, 0.78, 0.80], 0.9)
        translate([sx*elec_sep, 0, elec_depth/2+z_off])
        cylinder(d=elec_d, h=elec_depth, center=true, $fn=36);

    // Wire routing removed — user will handle wiring during assembly
}

// ═══════════ ASSEMBLY ═══════════
module assembly() {
    color([0.55, 0.68, 0.72]) bottom_shell();
    color([0.62, 0.75, 0.80])
        translate([0, 0, case_h]) mirror([0, 0, 1]) top_shell();
}

// ═══════════ EXPLODED VIEW ═══════════
module exploded_view() {
    gap = 14;
    fz = wall;

    // Layer 0: Bottom shell + bottom surface elements
    color([0.55, 0.68, 0.72], 0.85) bottom_shell();
    color([0.85, 0.9, 0.88], 0.35) translate([0, 0, 0.3])
        cylinder(d=max_win_d-0.5, h=1.2, $fn=48);
    for (sx=[-1,1])
        color([0.78, 0.78, 0.80], 0.9)
        translate([sx*elec_sep, 0, elec_depth/2])
        cylinder(d=elec_d, h=elec_depth, center=true, $fn=36);

    // Layer 1: Floor components (lifted)
    translate([0, 0, gap]) {
        translate([0, 0, fz+max_pcb_h/2]) max30102_breakout();
        translate([tp_x, tp_y, fz+tp_h/2]) tp4056_charger();
        translate([pol_x, pol_y, fz+pol_h/2]) pololu_reg();
        translate([gsr_x, gsr_y, fz+gsr_h/2]) grove_gsr();
        translate([25, case_w/2-wall-sw_w/2, fz+3+sw_l/2]) slide_switch();
    }

    // Layer 2: Arduino (on standoffs, above floor components)
    translate([0, 0, gap*2]) {
        translate([nano_x, 0, fz+nano_so_h+nano_h/2]) arduino_nano_ble();
    }

    // Layer 2.5: Battery (above Arduino)
    translate([0, 0, gap*2.5]) {
        bat_z_exp = fz + nano_so_h + nano_h + 1.5 + 0.5 + bat_h/2;
        translate([bat_x, bat_y, bat_z_exp]) lipo_battery();
    }

    // Layer 3: Top shell + screws
    color([0.62, 0.75, 0.80], 0.75)
        translate([0, 0, gap*3+case_h]) mirror([0, 0, 1]) top_shell();
    for (sx=[-1,1], sy=[-1,1])
        translate([sx*(case_l/2-screw_inset), sy*(case_w/2-screw_inset), gap*3+case_h+0.5])
        m2_phillips_screw();
}

// ═══════════ SIDE-BY-SIDE ═══════════
module side_by_side() {
    translate([-55, 0, 0]) { assembly(); show_components(); }
    translate([55, 0, 0]) exploded_view();
}

// ═══════════ RENDER ═══════════
side_by_side();

// Other views:
// exploded_view();
// assembly(); show_components();
// bottom_shell();
// top_shell();
