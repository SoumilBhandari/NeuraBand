#!/bin/bash
# Export individual component STLs from OpenSCAD for Blender import
# Each component is exported at its assembled position

SCAD="/opt/homebrew/bin/openscad"
DIR="$(cd "$(dirname "$0")" && pwd)"
OUT="$DIR/stl"
MAIN="$DIR/neuraband_case.scad"

mkdir -p "$OUT"

echo "=== NeuraFy Component STL Export ==="
echo "Output: $OUT"
echo ""

# Bottom shell (already exists but re-export for consistency)
echo "[1/13] Bottom shell..."
$SCAD -o "$OUT/bottom_shell.stl" -D "" \
  <(echo "use <$MAIN>; bottom_shell();") 2>/dev/null && echo "  OK" || echo "  FAIL"

# Top shell at assembled position (mirrored at Z=21)
echo "[2/13] Top shell..."
$SCAD -o "$OUT/top_shell.stl" -D "" \
  <(echo "use <$MAIN>; translate([0,0,21]) mirror([0,0,1]) top_shell();") 2>/dev/null && echo "  OK" || echo "  FAIL"

# Arduino at assembled position
echo "[3/13] Arduino..."
$SCAD -o "$OUT/arduino.stl" -D "" \
  <(echo 'use <'"$MAIN"'>;
    fz = 1.6;
    translate([3, 0, fz + 5.5 + 1.6/2]) arduino_nano_ble();') 2>/dev/null && echo "  OK" || echo "  FAIL"

# MAX30102
echo "[4/13] MAX30102..."
$SCAD -o "$OUT/max30102.stl" -D "" \
  <(echo 'use <'"$MAIN"'>;
    fz = 1.6;
    translate([0, 0, fz + 3.5/2]) max30102_breakout();') 2>/dev/null && echo "  OK" || echo "  FAIL"

# TP4056
echo "[5/13] TP4056..."
$SCAD -o "$OUT/tp4056.stl" -D "" \
  <(echo 'use <'"$MAIN"'>;
    fz = 1.6;
    translate([-16, 0, fz + 4.3/2]) tp4056_charger();') 2>/dev/null && echo "  OK" || echo "  FAIL"

# Pololu
echo "[6/13] Pololu..."
$SCAD -o "$OUT/pololu.stl" -D "" \
  <(echo 'use <'"$MAIN"'>;
    fz = 1.6;
    translate([-16, -12, fz + 2.54/2]) pololu_reg();') 2>/dev/null && echo "  OK" || echo "  FAIL"

# Grove GSR
echo "[7/13] Grove GSR..."
$SCAD -o "$OUT/grove_gsr.stl" -D "" \
  <(echo 'use <'"$MAIN"'>;
    fz = 1.6;
    translate([10, -8, fz + 5/2]) grove_gsr();') 2>/dev/null && echo "  OK" || echo "  FAIL"

# Battery
echo "[8/13] Battery..."
$SCAD -o "$OUT/battery.stl" -D "" \
  <(echo 'use <'"$MAIN"'>;
    fz = 1.6;
    bat_z = fz + 5.5 + 1.6 + 1.5 + 0.5 + 3.65/2;
    translate([3, 0, bat_z]) lipo_battery();') 2>/dev/null && echo "  OK" || echo "  FAIL"

# Slide switch
echo "[9/13] Slide switch..."
$SCAD -o "$OUT/slide_switch.stl" -D "" \
  <(echo 'use <'"$MAIN"'>;
    fz = 1.6;
    translate([25, 42/2 - 1.6 - 3.7/2, fz + 3 + 8.7/2]) slide_switch();') 2>/dev/null && echo "  OK" || echo "  FAIL"

# Left electrode
echo "[10/13] Left electrode..."
$SCAD -o "$OUT/electrode_left.stl" -D "" \
  <(echo '$fn=36; translate([-16, 0, 1.0/2]) cylinder(d=10, h=1.0, center=true);') 2>/dev/null && echo "  OK" || echo "  FAIL"

# Right electrode
echo "[11/13] Right electrode..."
$SCAD -o "$OUT/electrode_right.stl" -D "" \
  <(echo '$fn=36; translate([16, 0, 1.0/2]) cylinder(d=10, h=1.0, center=true);') 2>/dev/null && echo "  OK" || echo "  FAIL"

# Sensor window
echo "[12/13] Sensor window..."
$SCAD -o "$OUT/sensor_window.stl" -D "" \
  <(echo '$fn=48; translate([0, 0, 0.3]) cylinder(d=12.5, h=1.2);') 2>/dev/null && echo "  OK" || echo "  FAIL"

# Screws (4x at corners)
echo "[13/13] Screws..."
$SCAD -o "$OUT/screws.stl" -D "" \
  <(echo 'use <'"$MAIN"'>;
    for (sx=[-1,1], sy=[-1,1])
      translate([sx*(70/2-10), sy*(42/2-10), 21+0.5])
      m2_phillips_screw();') 2>/dev/null && echo "  OK" || echo "  FAIL"

echo ""
echo "=== Export complete ==="
ls -la "$OUT"/*.stl 2>/dev/null | awk '{print $5, $9}'
