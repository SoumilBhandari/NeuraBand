/*
 * NeuraFy — Test Fit Assembly (Print-Ready, Optional)
 * =====================================================
 * Export: Render (F6) → Export as STL
 *
 * This prints BOTH shells assembled together as a single piece.
 * Use this to verify dimensions and aesthetics before printing
 * the individual shells. NOT functional — screws won't work,
 * shells can't be separated.
 *
 * Print at 20% infill draft quality (0.2mm layers) for a fast
 * ~1 hour test print.
 *
 * PRINT SETTINGS (draft):
 *   Layer height:  0.20mm
 *   Walls:         3 perimeters
 *   Infill:        20% grid
 *   Speed:         60mm/s
 *   Supports:      Tree (for lug tabs)
 *   Est. time:     ~1 hour
 *   Est. material: ~15g PLA
 */

use <neuraband_case.scad>

assembly();
