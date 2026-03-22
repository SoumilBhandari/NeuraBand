# NeuraBand — Bill of Materials

## Core Components

| # | Component | Qty | Approx Cost | Source | Notes |
|---|-----------|-----|-------------|--------|-------|
| 1 | Arduino Nano 33 BLE Sense Rev2 | 1 | $35 | Arduino Store | nRF52840, BMI270 IMU, BLE 5.0 |
| 2 | MAX30102 Breakout (RCWL-0531) | 1 | $3-5 | Amazon | Must be 3.3V I2C compatible variant |
| 3 | Grove GSR Sensor | 1 | $8-10 | Seeed Studio | Includes finger electrodes and cable |
| 4 | 500mAh LiPo Battery | 1 | $5-8 | Amazon | Flat pouch, ~48x30x5mm, with JST connector |
| 5 | TP4056 USB-C Charging Module | 1 | $2-3 | Amazon | Must have DW01A protection (6-pin version) |
| 6 | MT3608 Boost Converter | 1 | $1-2 | Amazon | Adjustable output, set to 5.0V |

## Consumables & Accessories

| # | Item | Qty | Approx Cost | Notes |
|---|------|-----|-------------|-------|
| 7 | Jumper Wires (female-female) | 10 | $3 | 10cm length preferred for tight enclosure |
| 8 | PLA Filament (white) | ~50g | $2 | From a standard 1kg spool |
| 9 | M2 x 5mm Self-Tapping Screws | 4 | $1 | Fallback if snap-fits break |
| 10 | 3M VHB Double-Sided Tape | 1 strip | $1 | For mounting components inside case |
| 11 | Silicone Watch Band (20mm) | 1 | $5 | Standard 20mm quick-release band |
| 12 | Heat Shrink Tubing | assorted | $2 | For wire insulation |

## Optional

| # | Item | Qty | Approx Cost | Notes |
|---|------|-----|-------------|-------|
| 13 | 100k Resistors (1/4W) | 2 | $0.10 | For battery voltage divider on A1 |
| 14 | Sandpaper (400, 800, 1000 grit) | 1 each | $3 | Post-processing the enclosure |
| 15 | Rust-Oleum Filler Primer (gray) | 1 can | $6 | Smooths layer lines |
| 16 | Matte White Spray Paint | 1 can | $5 | Medical-grade white finish |

## Total Estimated Cost

- **Core components**: ~$55-65
- **With accessories**: ~$75-85
- **With optional finishing**: ~$90-95

## Tools Required (not purchased)

- Soldering iron + solder
- Multimeter (for MT3608 voltage adjustment)
- Small screwdriver (for GSR potentiometer calibration)
- Wire strippers
- Hot glue gun (for locking MT3608 potentiometer)
- Access to FDM 3D printer (0.4mm nozzle)
