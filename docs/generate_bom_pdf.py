"""Generate a professional NeuraFy BOM PDF with specific parts and purchase links."""

from fpdf import FPDF
import os

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "NeuraFy_Parts_List.pdf")


class BomPDF(FPDF):
    def header(self):
        self.set_font("Helvetica", "B", 22)
        self.set_text_color(30, 30, 30)
        self.cell(0, 12, "NeuraFy - Complete Parts List", new_x="LMARGIN", new_y="NEXT", align="C")
        self.set_font("Helvetica", "", 10)
        self.set_text_color(100, 100, 100)
        self.cell(0, 6, "Wearable Biomarker Monitor for Early Alzheimer's Detection", new_x="LMARGIN", new_y="NEXT", align="C")
        self.ln(4)
        self.set_draw_color(200, 200, 200)
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(4)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(150, 150, 150)
        self.cell(0, 10, f"NeuraFy Project - Page {self.page_no()}/{{nb}}", align="C")

    def section_title(self, title):
        self.set_font("Helvetica", "B", 13)
        self.set_text_color(20, 80, 120)
        self.cell(0, 10, title, new_x="LMARGIN", new_y="NEXT")
        self.ln(1)

    def table_header(self, cols, widths):
        self.set_font("Helvetica", "B", 8)
        self.set_fill_color(235, 240, 245)
        self.set_text_color(40, 40, 40)
        for col, w in zip(cols, widths):
            self.cell(w, 7, col, border=1, fill=True, align="C")
        self.ln()

    def part_row(self, num, name, spec, qty, price, source, fill=False):
        """Render a two-line row: name + spec on separate lines."""
        self.set_text_color(30, 30, 30)
        if fill:
            self.set_fill_color(248, 250, 252)

        row_h = 12
        x = self.get_x()
        y = self.get_y()

        # Check page break
        if y + row_h > self.h - self.b_margin:
            self.add_page()
            y = self.get_y()

        # # column
        self.set_font("Helvetica", "", 8)
        self.cell(8, row_h, str(num), border=1, fill=fill, align="C")

        # Product name + spec (two lines in one cell)
        self.set_font("Helvetica", "B", 7.5)
        name_x = self.get_x()
        self.cell(72, row_h / 2, name, border="TLR", fill=fill, align="L")
        self.set_xy(name_x, y + row_h / 2)
        self.set_font("Helvetica", "", 6.5)
        self.set_text_color(80, 80, 80)
        self.cell(72, row_h / 2, spec, border="BLR", fill=fill, align="L")
        self.set_text_color(30, 30, 30)

        # Move to next column
        self.set_xy(name_x + 72, y)
        self.set_font("Helvetica", "", 8)
        self.cell(10, row_h, str(qty), border=1, fill=fill, align="C")
        self.set_font("Helvetica", "B", 8)
        self.cell(18, row_h, price, border=1, fill=fill, align="C")
        self.set_font("Helvetica", "", 6.5)
        self.set_text_color(40, 80, 140)
        self.cell(82, row_h, source, border=1, fill=fill, align="L")
        self.set_text_color(30, 30, 30)
        self.ln()


pdf = BomPDF()
pdf.alias_nb_pages()
pdf.set_auto_page_break(auto=True, margin=20)
pdf.add_page()

# -------------------------------------------------------
# CORE ELECTRONICS
# -------------------------------------------------------
pdf.section_title("1. Core Electronics")
cols = ["#", "Product / Specification", "Qty", "Price", "Where to Buy"]
widths = [8, 72, 10, 18, 82]
pdf.table_header(cols, widths)

pdf.part_row(1,
    "Arduino Nano 33 BLE Sense Rev2 [ABX00070]",
    "nRF52840 SoC, BMI270 IMU, BLE 5.0, 45x18mm, 3.3V logic, with headers",
    "1", "$39.70",
    "store-usa.arduino.cc/products/nano-33-ble-sense-rev2-with-headers",
    fill=False)

pdf.part_row(2,
    "HiLetgo MAX30102 Heart Rate Sensor Breakout",
    "Pulse oximetry + SpO2, I2C 3.3V, replaces MAX30100, 14x14mm PCB",
    "1", "$5.99",
    "amazon.com/dp/B07QC67KMQ",
    fill=True)

pdf.part_row(3,
    "Seeed Studio Grove GSR Sensor v1.2",
    "Galvanic skin response, 3.3V/5V, includes finger electrode straps + cable",
    "1", "$7.90",
    "amazon.com/dp/B012TNYDE4  (or seeedstudio.com p-1614)",
    fill=False)

pdf.part_row(4,
    "EEMB 3.7V 500mAh LiPo Battery (403048)",
    "Rechargeable Li-polymer, JST-PH 2.0 connector, 30.5x50x4.3mm pouch",
    "1", "$9.99",
    "amazon.com/dp/B095W6742D",
    fill=True)

pdf.part_row(5,
    "HiLetgo TP4056 USB-C Charger Module (3-pack)",
    "5V 1A Li-ion charger, DW01A + 8205A dual protection, Type-C input",
    "1pk", "$5.99",
    "amazon.com/dp/B07PKND8KG",
    fill=False)

pdf.part_row(6,
    "Pololu U3V16F3 3.3V Step-Up/Down Regulator",
    "2.5-16V input, 3.3V 600mA output, 10x13mm, pin-compatible header",
    "1", "$6.95",
    "pololu.com/product/4940",
    fill=True)

pdf.ln(4)

# -------------------------------------------------------
# ENCLOSURE & MECHANICAL
# -------------------------------------------------------
pdf.section_title("2. Enclosure & Mechanical")
pdf.table_header(cols, widths)

pdf.part_row(7,
    "PLA Filament 1.75mm (white or teal)",
    "Any brand, 1kg spool (only ~50g needed), 200-220C print temp",
    "50g", "$2",
    "amazon.com (Hatchbox, eSUN, Overture, etc.)",
    fill=False)

pdf.part_row(8,
    "uxcell M2x5mm Pan Head Self-Tapping Screws (50pk)",
    "Phillips drive, 316 stainless steel, for case assembly (need 4 of 50)",
    "4", "$6.49",
    "amazon.com/dp/B07Q36GBKY",
    fill=True)

pdf.part_row(9,
    "uxcell 10mm Stainless Steel Round Disc Blanks",
    "3/8in dia, 1mm thick, 304 SS stamping blanks for GSR electrodes",
    "2", "$6.49",
    "amazon.com/dp/B0FPLS43WW  (100-pack, only need 2)",
    fill=False)

pdf.part_row(10,
    "MG Chemicals 8331-14G Silver Conductive Epoxy",
    "Two-part silver-filled adhesive, bonds SS electrodes to signal wires",
    "1", "$35",
    "amazon.com/dp/B07XYFJG7J",
    fill=True)

pdf.part_row(11,
    "Apple Watch 42mm/44mm/45mm Band Lug Adapters",
    "Metal spring bar connectors, accepts 24mm straps, pair (black)",
    "1pr", "$8",
    "amazon.com/dp/B07M8PGJ9M",
    fill=False)

pdf.part_row(12,
    "24mm Silicone/Nylon Quick-Release Watch Band",
    "Breathable sport band, 24mm width, fits lug adapters above",
    "1", "$8",
    "amazon.com (search '24mm quick release watch band')",
    fill=True)

pdf.ln(4)

# -------------------------------------------------------
# WIRING & ASSEMBLY
# -------------------------------------------------------
pdf.section_title("3. Wiring & Assembly")
pdf.table_header(cols, widths)

pdf.part_row(13,
    "Female-to-Female Dupont Jumper Wires 10cm (40pk)",
    "2.54mm pitch, 24AWG, multi-color, for internal wiring",
    "10+", "$4",
    "amazon.com/dp/B00RLQE3E0",
    fill=False)

pdf.part_row(14,
    "Ginsco 580pc Heat Shrink Tubing Kit",
    "2:1 ratio, 6 colors, 11 sizes (1.5mm-10mm), polyolefin",
    "1kit", "$6.99",
    "amazon.com/dp/B01MFA3OFA",
    fill=True)

pdf.part_row(15,
    "3M VHB 4910 Double-Sided Mounting Tape",
    "Clear, 1in wide, for securing battery + PCBs inside enclosure",
    "1 ft", "$1",
    "amazon.com (search '3M VHB tape clear 1 inch')",
    fill=False)

pdf.part_row(16,
    "100k Ohm 1/4W Metal Film Resistors",
    "For battery voltage divider on pin A1 (Vbat / 2)",
    "2", "$0.10",
    "amazon.com (any 100k 1/4W pack, e.g. dp/B0185FGYYA)",
    fill=True)

pdf.ln(4)

# -------------------------------------------------------
# OPTIONAL FINISHING
# -------------------------------------------------------
pdf.section_title("4. Optional Finishing (for science fair presentation)")
pdf.table_header(cols, widths)

pdf.part_row(17,
    "Wet/Dry Sandpaper Assortment (400/800/1000 grit)",
    "For smoothing 3D printed layer lines before painting",
    "1set", "$3",
    "amazon.com (search 'wet dry sandpaper assortment')",
    fill=False)

pdf.part_row(18,
    "Rust-Oleum Filler Primer Spray (gray)",
    "Fills minor imperfections + layer lines, sand between coats",
    "1can", "$6",
    "amazon.com (search 'Rust-Oleum filler primer gray')",
    fill=True)

pdf.part_row(19,
    "Rust-Oleum 2X Matte Spray Paint (white or teal)",
    "Final enclosure color coat, 2 light coats recommended",
    "1can", "$5",
    "amazon.com (search 'Rust-Oleum 2X matte spray')",
    fill=False)

pdf.ln(6)

# -------------------------------------------------------
# COST SUMMARY
# -------------------------------------------------------
pdf.section_title("Cost Summary")
pdf.set_font("Helvetica", "", 10)
pdf.set_text_color(30, 30, 30)
summaries = [
    ("Core electronics (items 1-6):", "$76.52"),
    ("Enclosure & mechanical (items 7-12):", "$66.98"),
    ("Wiring & assembly (items 13-16):", "$12.09"),
    ("Optional finishing (items 17-19):", "$14.00"),
    ("", ""),
    ("Total (without finishing):", "$155.59"),
    ("Total (with finishing):", "$169.59"),
]
for label, value in summaries:
    if not label:
        pdf.ln(2)
        continue
    is_total = "Total" in label
    pdf.set_font("Helvetica", "B" if is_total else "", 10)
    pdf.cell(100, 7, label)
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(40, 7, value, new_x="LMARGIN", new_y="NEXT")

pdf.set_font("Helvetica", "I", 8)
pdf.set_text_color(120, 120, 120)
pdf.ln(2)
pdf.cell(0, 5, "Note: Many parts come in multi-packs (screws 50pk, discs 100pk, wires 40pk).", new_x="LMARGIN", new_y="NEXT")
pdf.cell(0, 5, "Actual per-unit cost is lower. Prices as of April 2026, may vary.", new_x="LMARGIN", new_y="NEXT")

pdf.ln(6)

# -------------------------------------------------------
# TOOLS REQUIRED
# -------------------------------------------------------
pdf.section_title("Tools Required (not purchased)")
pdf.set_font("Helvetica", "", 9.5)
pdf.set_text_color(30, 30, 30)
tools = [
    "Soldering iron + lead-free solder (e.g. Hakko FX-888D or any 60W station)",
    "Multimeter (for setting Pololu output voltage, checking continuity)",
    "Wire strippers / flush cutters",
    "Small Phillips screwdriver (PH0 for M2 screws)",
    "Hot glue gun (for locking regulator potentiometer after adjustment)",
    "FDM 3D printer access (0.4mm nozzle, 0.2mm layer height, PLA at 210C)",
]
for t in tools:
    pdf.cell(5, 6, "-")
    pdf.cell(0, 6, f"  {t}", new_x="LMARGIN", new_y="NEXT")

pdf.ln(4)

# -------------------------------------------------------
# WIRING REFERENCE
# -------------------------------------------------------
pdf.section_title("Quick Wiring Reference")
pdf.set_font("Helvetica", "", 9)
wiring_info = [
    "LiPo BAT+ / BAT- to TP4056 B+ / B-",
    "TP4056 OUT+ / OUT- to Pololu VIN / GND",
    "Pololu VOUT (3.3V) to Arduino 3.3V pin (NOT VIN)",
    "MAX30102 SDA/SCL to Arduino A4/A5 (I2C, 3.3V)",
    "MAX30102 VIN to 3.3V, GND to GND",
    "Grove GSR SIG to Arduino A0, VCC to 3.3V, GND to GND",
    "SS Electrodes to Grove GSR finger electrode pads (via conductive silver epoxy)",
    "Battery voltage divider: BAT+ to 100k to A1, A1 to 100k to GND",
]
for w in wiring_info:
    pdf.cell(5, 5.5, "-")
    pdf.cell(0, 5.5, f"  {w}", new_x="LMARGIN", new_y="NEXT")

pdf.ln(6)

# -------------------------------------------------------
# KEY SPECIFICATIONS
# -------------------------------------------------------
pdf.section_title("Key Enclosure Specifications")
pdf.set_font("Helvetica", "", 9)
specs = [
    "Enclosure dimensions: 70 x 42 x 21 mm (pill/capsule shape)",
    "Wall thickness: 1.6 mm (structurally strong for PLA)",
    "Screw holes: 4x M2 at corners (60mm x 32mm spacing)",
    "USB-C port: left side cutout for TP4056 charging",
    "Bottom skin-contact: 2x 10mm SS electrodes + 12.5mm optical sensor window",
    "Band mounting: Apple Watch 42/44/45mm lug adapters (24mm strap width)",
    "Internal Z-stack: floor 1.6mm, components 1.6-14.4mm, ceiling 16mm, top shell 5mm",
]
for s in specs:
    pdf.cell(5, 5.5, "-")
    pdf.cell(0, 5.5, f"  {s}", new_x="LMARGIN", new_y="NEXT")

pdf.output(OUT)
print(f"PDF saved to: {OUT}")
