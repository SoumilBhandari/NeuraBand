/*
 * NeuraFy — Top Shell / Lid (Print-Ready)
 * ========================================
 * Export: Render (F6) → Export as STL
 *
 * Orientation: Prints with the OUTER face DOWN (NEURAFY text on build plate).
 *              The lid is already oriented correctly — flat outer surface
 *              on the bottom, nesting lip pointing UP during print.
 *
 * PRINT SETTINGS:
 *   Layer height:  0.15mm
 *   Walls:         4 perimeters
 *   Infill:        40% gyroid
 *   Speed:         40mm/s
 *   Temp:          210°C nozzle / 60°C bed (PLA)
 *   Supports:      Light supports under battery retention rails
 *   Brim:          5mm
 *   Est. time:     ~45 minutes
 *   Est. material: ~8g PLA
 *
 * DIMENSIONS: 70 × 42 × 5mm (pill shape) + 3mm nesting lip
 *
 * FEATURES:
 *   - NEURAFY debossed text (0.8mm deep, clearly visible after print)
 *   - Nesting lip (3mm tall, fits inside bottom shell with 0.2mm tolerance)
 *   - Battery retention: Y-rails + X end stops + center rib
 *   - 4× M2 screw through-holes with countersinks
 */

use <neuraband_case.scad>

top_shell();
