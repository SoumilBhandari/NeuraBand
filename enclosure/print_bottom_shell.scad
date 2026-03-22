/*
 * NeuraFy — Bottom Shell (Print-Ready)
 * =====================================
 * Export: Render (F6) → Export as STL
 *
 * Orientation: Prints with floor DOWN (skin-contact side on build plate).
 *              This gives the smoothest finish on the sensor/electrode surface.
 *
 * PRINT SETTINGS:
 *   Layer height:  0.15mm
 *   Walls:         4 perimeters
 *   Infill:        40% gyroid
 *   Speed:         40mm/s
 *   Temp:          210°C nozzle / 60°C bed (PLA)
 *   Supports:      Tree supports (for lug tabs only)
 *   Brim:          5mm (helps adhesion on curved pill shape)
 *   Est. time:     ~2 hours
 *   Est. material: ~12g PLA
 *
 * DIMENSIONS: 70 × 42 × 16mm (pill shape)
 *
 * FEATURES:
 *   - MAX30102 sensor window (13mm dia, centered on bottom)
 *   - 2× GSR electrode recesses (10mm dia, 1mm deep, at ±16mm from center)
 *   - Wire channels through floor for electrode connections
 *   - USB-C port opening (left end, 22mm deep)
 *   - Slide switch slot (right side wall)
 *   - 4× M2 screw bosses with pilot holes
 *   - 4× Arduino standoffs (5.5mm tall)
 *   - MAX30102 mounting ring + board pocket
 *   - 4× Apple Watch lug tabs (spring bar channels)
 *   - Charging indicator holes
 */

use <neuraband_case.scad>

bottom_shell();
