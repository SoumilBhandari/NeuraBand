# NeuraFy

**Wearable Biomarker Monitor for Alzheimer's Disease Early Detection**

A continuous passive monitoring wearable that tracks four neurologically relevant biomarkers — heart rate variability, blood oxygen, electrodermal activity, and gait — streaming live data over BLE to a clinical-grade Chrome dashboard. Built as the future-work hardware extension of an MRI/PET-based Alzheimer's progression prediction model.

---

## Why This Matters

Alzheimer's disease affects brain regions controlling autonomic functions (cardiac rhythm, skin conductance, motor coordination) **years before** cognitive symptoms appear. NeuraFy monitors these prodromal biomarkers continuously, enabling earlier detection than periodic clinical assessments.

| Biomarker | Sensor | Clinical Relevance |
|-----------|--------|-------------------|
| Heart Rate Variability | MAX30102 PPG | Low HRV correlates with 2.34x ADRD risk (Rouch et al., 2024) |
| Blood Oxygen (SpO2) | MAX30102 Pulse Ox | Reduced SpO2 associated with cognitive impairment |
| Electrodermal Activity | Built-in SS Electrodes | EDA deficits linked to ventromedial frontal cortex degeneration |
| Gait Variability | BMI270 IMU | Wearable accelerometers differentiate dementia subtypes at 85.5% accuracy |

> See [`docs/scientific_references.md`](docs/scientific_references.md) for 13 peer-reviewed studies supporting each biomarker.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        NeuraFy Device                           │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ MAX30102 │  │Grove GSR │  │ BMI270   │  │ 500mAh LiPo  │  │
│  │ HR/SpO2  │  │ EDA      │  │ IMU/Gait │  │ + TP4056 USB-C│  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └───────────────┘  │
│       │I2C          │A0           │Onboard                     │
│  ┌────┴─────────────┴─────────────┴────┐                       │
│  │     Arduino Nano 33 BLE Sense Rev2  │                       │
│  │            nRF52840 SoC             │                       │
│  └──────────────┬──────────────────────┘                       │
│                 │ BLE 5.0                                      │
└─────────────────┼──────────────────────────────────────────────┘
                  │
        ┌─────────┴─────────┐
        │  Chrome Dashboard │
        │  Web Bluetooth API│
        │  Real-time Charts │
        │  Clinical Insights│
        └───────────────────┘
```

---

## Features

### Firmware
- 4-sensor fusion at 1Hz BLE transmission rate
- HRV computation (SDNN, RMSSD, IBI) from inter-beat intervals
- Gait activity scoring via exponential moving average of acceleration
- I2C bus auto-recovery and software watchdog timer
- BLE software reset (no physical access needed)
- JSON streaming: `{"hr":72,"sp":98,"gsr":487,"gait":0.42,"ibi":832,"bt":85,"ts":12345}`

### Dashboard
- Real-time Chart.js visualization with 60-sample rolling window
- Clinical Decision Support engine with evidence-based thresholds
- HRV analysis panel (SDNN, RMSSD, autonomic status classification)
- SpO2 circular progress ring with reference ranges
- Dark/light theme with localStorage persistence
- Demo mode with synthetic physiological data
- CSV data export for ML pipeline integration
- Auto-reconnect on BLE disconnect (exponential backoff)
- Session timer for longitudinal tracking

### Enclosure
- Pill-shaped 3D-printed case (70 x 42 x 18mm)
- Apple Watch band compatible lug tabs (24mm spacing)
- Built-in stainless steel GSR disc electrodes (10mm)
- MAX30102 optical window flush with skin contact surface
- USB-C charging port
- M2 screw assembly with Phillips pan head fasteners
- Print-ready STL files included

---

## Project Structure

```
NeuraBand/
├── firmware/
│   └── neuraband_firmware/
│       └── neuraband_firmware.ino    # Arduino sketch (569 lines)
├── dashboard/
│   ├── index.html                    # Clinical UI
│   ├── app.js                        # BLE client + charts + insights
│   └── style.css                     # Dual-theme styling
├── enclosure/
│   ├── neuraband_case.scad           # Parametric OpenSCAD source
│   ├── print_bottom_shell.scad       # Print wrapper — bottom
│   ├── print_top_shell.scad          # Print wrapper — top
│   ├── print_test_fit.scad           # Print wrapper — test fit
│   ├── bottom_shell.stl              # Ready-to-print STL
│   ├── top_shell.stl                 # Ready-to-print STL
│   └── test_fit.stl                  # Fit verification STL
├── docs/
│   ├── bom.md                        # Bill of materials (~$75 total)
│   ├── scientific_references.md      # 13 peer-reviewed citations
│   └── wiring_diagram.txt            # Pin assignments + I2C map
└── README.md
```

---

## Quick Start

### 1. Print the Case
Open `enclosure/print_bottom_shell.scad` and `print_top_shell.scad` in OpenSCAD, or load the STL files directly into your slicer.

| Setting | Value |
|---------|-------|
| Layer Height | 0.15mm |
| Walls | 4 perimeters |
| Infill | 40% gyroid |
| Material | PLA, 210/60C |
| Supports | Tree (lug tabs only) |
| Brim | 5mm |

### 2. Flash the Firmware
```bash
# Install Arduino IDE 2.x, then add these via Library Manager:
#   - ArduinoBLE
#   - Arduino_BMI270_BMM150
#   - SparkFun MAX3010x Pulse and Proximity Sensor Library

# Connect Arduino Nano 33 BLE Sense Rev2 via USB-C
# Select board: Arduino Nano 33 BLE
# Open firmware/neuraband_firmware/neuraband_firmware.ino
# Upload (Ctrl+U)
```

### 3. Launch the Dashboard
```bash
cd dashboard
python3 -m http.server 8000
# Open Chrome → http://localhost:8000
# Click "Connect" → select "NeuraFy"
```

---

## Bill of Materials

| Component | Est. Cost |
|-----------|-----------|
| Arduino Nano 33 BLE Sense Rev2 | $35 |
| MAX30102 Breakout (RCWL-0531) | $4 |
| Grove GSR Sensor | $9 |
| 500mAh LiPo Battery (50x20x3.65mm) | $6 |
| TP4056 USB-C Charger | $2 |
| Pololu 3.3V Step-Up Regulator | $5 |
| M2 Screws, Wire, Misc | $5 |
| Apple Watch Band Adapters (44mm) | $4 |
| SS Disc Electrodes (10mm) | $3 |
| Conductive Silver Epoxy | $8 |
| **Total** | **~$81** |

> Full BOM with links: [`docs/bom.md`](docs/bom.md)

---

## BLE Protocol

| Characteristic | UUID | Direction | Purpose |
|---------------|------|-----------|---------|
| Service | `19B10000-E8F2-537E-4F6C-D104768A1214` | — | GATT service container |
| Sensor Data | `19B10001-...` | Notify (1Hz) | JSON sensor readings |
| Device Status | `19B10002-...` | Read | Firmware version, sensor health |
| Reset Command | `19B10003-...` | Write | Send `0x01` to reboot device |

---

## Limitations

This is a **research prototype**, not a medical device.

- Consumer-grade sensors provide lower accuracy than clinical instruments
- GSR as a preclinical AD biomarker is still exploratory
- SpO2 calibration requires empirical tuning per device
- Meaningful clinical conclusions require longitudinal baselines (months/years of data)
- Not FDA approved or clinically validated

---

## License

MIT

---

*Built for a regional science fair — predicting Alzheimer's disease progression through continuous passive biomarker monitoring.*
