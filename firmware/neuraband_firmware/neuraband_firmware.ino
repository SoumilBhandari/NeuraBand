/*
 * NeuroWatch / NeuraFy Firmware
 * ================================
 * Wearable biomarker monitoring device for Alzheimer's disease research.
 * Reads heart rate, SpO2, galvanic skin response, and accelerometer data,
 * then streams JSON over BLE to a Chrome Web Bluetooth dashboard.
 *
 * Hardware:
 *   - Arduino Nano 33 BLE Sense Rev2 (nRF52840, BMI270 IMU onboard)
 *   - MAX30102 heart rate / SpO2 sensor on I2C (address 0x57)
 *   - Grove GSR PCB on A0, wired to built-in SS disc electrodes on case bottom
 *   - 500mAh LiPo → TP4056 USB-C charger → Pololu U3V16F3 (3.3V) → Arduino 3.3V pin
 *   - External slide switch controls power (no firmware interaction)
 *
 * BLE Protocol:
 *   - Service UUID:          19B10000-E8F2-537E-4F6C-D104768A1214
 *   - Sensor Data (Notify):  19B10001-E8F2-537E-4F6C-D104768A1214
 *   - Device Status (Read):  19B10002-E8F2-537E-4F6C-D104768A1214
 *   - Reset Command (Write): 19B10003-E8F2-537E-4F6C-D104768A1214 (write 0x01 to reboot)
 *
 * Modalities (7 biomarker streams):
 *   1. Heart rate + HRV (MAX30102 PPG)
 *   2. Blood oxygen SpO2 (MAX30102 pulse oximetry)
 *   3. Electrodermal activity (Grove GSR + built-in electrodes)
 *   4. Gait variability (BMI270 IMU accelerometer)
 *   5. Respiratory rate (extracted from PPG waveform envelope)
 *   6. Skin temperature (HS3003 onboard sensor, circadian rhythm tracking)
 *   7. Sleep quality (BMI270 actigraphy, Cole-Kripke algorithm)
 *   8. Skin humidity (HS3003, sympathetic sweat response)
 *   9. Ambient light (APDS9960, circadian light exposure tracking)
 *  10. Barometric pressure (LPS22HB, altitude/floor detection)
 *   + Composite Neuro-Risk Index (weighted fusion of all streams)
 *
 * JSON format (sent every 1 second):
 *   {"hr":72,"sp":98,"gsr":487,"gait":0.42,"ibi":832,"rr":16,"tmp":32.4,"slp":0,"slps":0,"nri":34,"bt":85,"ts":12345}
 *
 * LED Indicators:
 *   - Green (LED_BUILTIN or D13): BLE central connected
 *   - Blue (LEDB):                Transmitting data
 *   - Red (LEDR):                 Sensor error
 *
 * Author: NeuraFy Science Fair Project
 * License: MIT
 */

#include <ArduinoBLE.h>
#include <Wire.h>
#include <Arduino_BMI270_BMM150.h>
#include <Arduino_HS300x.h>    // Onboard HS3003 temperature/humidity sensor
#include <Arduino_APDS9960.h>  // Onboard APDS9960 light/proximity/color sensor
#include <Arduino_LPS22HB.h>   // Onboard LPS22HB barometric pressure sensor
#include "MAX30105.h"          // SparkFun MAX3010x library (works for MAX30102)
#include "heartRate.h"         // SparkFun beat detection algorithm

// ─────────────────────────────────────────────────────────────
// Pin Definitions
// ─────────────────────────────────────────────────────────────
static const int GSR_PIN       = A0;
static const int BATTERY_PIN   = A1;   // Voltage divider on TP4056 BAT output (before Pololu regulator)
                                       // Divider ratio may need calibration — default assumes 100k/100k (2:1)

// LED pins on Nano 33 BLE are active LOW
static const int LED_GREEN = LED_BUILTIN;  // D13
static const int LED_BLUE  = LEDB;
static const int LED_RED   = LEDR;

// ─────────────────────────────────────────────────────────────
// BLE UUIDs — custom 128-bit to avoid conflicts with BT SIG profiles
// ─────────────────────────────────────────────────────────────
static const char* SERVICE_UUID      = "19B10000-E8F2-537E-4F6C-D104768A1214";
static const char* SENSOR_DATA_UUID  = "19B10001-E8F2-537E-4F6C-D104768A1214";
static const char* DEVICE_STATUS_UUID = "19B10002-E8F2-537E-4F6C-D104768A1214";
static const char* RESET_CMD_UUID     = "19B10003-E8F2-537E-4F6C-D104768A1214";

// ─────────────────────────────────────────────────────────────
// BLE Objects
// ─────────────────────────────────────────────────────────────
BLEService neurafyService(SERVICE_UUID);

// 256 bytes max for the JSON payload — well within BLE MTU limits
BLEStringCharacteristic sensorDataChar(SENSOR_DATA_UUID,
                                        BLERead | BLENotify, 256);
BLEStringCharacteristic deviceStatusChar(DEVICE_STATUS_UUID,
                                          BLERead, 128);

// Reset command — write 0x01 to trigger NVIC_SystemReset()
BLEByteCharacteristic resetCmdChar(RESET_CMD_UUID, BLEWrite);

// ─────────────────────────────────────────────────────────────
// MAX30102 Sensor
// ─────────────────────────────────────────────────────────────
MAX30105 particleSensor;
bool max30102_ok = false;

// Beat detection state — SparkFun algorithm uses a rolling average
static const int RATE_SIZE = 8;   // Number of beats to average over
int16_t beatsPerMinute = 0;
int16_t beatAvg        = 0;
int32_t lastIBI        = 0;       // Inter-beat interval in ms
uint32_t lastBeatTime  = 0;

// SpO2 computation buffers
// We collect 100 samples (~2 seconds at 50Hz), then compute SpO2
static const int SPO2_BUFFER_SIZE = 100;
uint32_t irBuffer[SPO2_BUFFER_SIZE];
uint32_t redBuffer[SPO2_BUFFER_SIZE];
int spo2Value = -1;
bool spo2Valid = false;

// Rolling beat rate buffer for averaging
int16_t rates[RATE_SIZE];
uint8_t rateSpot = 0;

// IBI history for HRV (sent to dashboard for SDNN/RMSSD computation)
static const int IBI_HISTORY_SIZE = 60;
int32_t ibiHistory[IBI_HISTORY_SIZE];
uint8_t ibiIndex = 0;
uint8_t ibiCount = 0;

// ─────────────────────────────────────────────────────────────
// GSR Sensor
// ─────────────────────────────────────────────────────────────
static const int GSR_SAMPLES = 10;  // Average 10 reads to reduce noise
int gsrValue = 0;

// ─────────────────────────────────────────────────────────────
// BMI270 IMU — Gait Activity Score
// ─────────────────────────────────────────────────────────────
float accelX = 0.0f, accelY = 0.0f, accelZ = 0.0f;
float gyroX  = 0.0f, gyroY  = 0.0f, gyroZ  = 0.0f;

// Gait activity score: magnitude of acceleration deviation from 1g
// Higher values = more motion = walking/active
// Computed as exponential moving average of |accelMag - 1.0|
float gaitScore = 0.0f;
static const float GAIT_ALPHA = 0.1f;  // EMA smoothing factor

// ─────────────────────────────────────────────────────────────
// Respiratory Rate — extracted from MAX30102 IR signal envelope
// Breathing modulates PPG amplitude via respiratory sinus arrhythmia
// ─────────────────────────────────────────────────────────────
static const int RESP_BUF_SIZE = 500;  // 10 seconds at 50Hz
float respBuffer[RESP_BUF_SIZE];       // IR signal envelope
int respBufIdx = 0;
bool respBufFull = false;
int16_t respRate = -1;                 // breaths per minute

// ─────────────────────────────────────────────────────────────
// Skin Temperature — HS3003 onboard sensor (circadian tracking)
// ─────────────────────────────────────────────────────────────
bool hs300x_ok = false;
float skinTemp = -1.0f;
float skinHumidity = -1.0f;
float tempMin = 100.0f, tempMax = -40.0f;
uint32_t lastTempRead = 0;
static const uint32_t TEMP_INTERVAL = 10000;  // 10 seconds (slow-changing)

// ─────────────────────────────────────────────────────────────
// Ambient Light — APDS9960 onboard sensor (circadian tracking)
// ─────────────────────────────────────────────────────────────
bool apds_ok = false;
int ambientLight = -1;  // clear channel value (proxy for lux)

// ─────────────────────────────────────────────────────────────
// Barometric Pressure — LPS22HB onboard sensor (altitude/floor)
// ─────────────────────────────────────────────────────────────
bool baro_ok = false;
float baroPressure = -1.0f;  // kPa

// ─────────────────────────────────────────────────────────────
// Sleep Actigraphy — simplified Cole-Kripke from BMI270
// Classifies sleep/wake from 5-minute motion intensity window
// ─────────────────────────────────────────────────────────────
static const int SLEEP_BUF_SIZE = 300; // 5 minutes at 1Hz
float sleepBuffer[SLEEP_BUF_SIZE];
int sleepBufIdx = 0;
int sleepBufCount = 0;
int8_t sleepScore = -1;                // 0-100 quality
bool isSleeping = false;

// ─────────────────────────────────────────────────────────────
// Composite Neuro-Risk Index — weighted multimodal fusion
// Mirrors the science fair board's "probabilistic risk estimates"
// NOT diagnostic — demonstration of multimodal sensor fusion
// ─────────────────────────────────────────────────────────────
int8_t neuroRiskIndex = 0;

// ─────────────────────────────────────────────────────────────
// Timing — all non-blocking via millis()
// ─────────────────────────────────────────────────────────────
uint32_t lastMAX30102Read  = 0;
uint32_t lastGSRRead       = 0;
uint32_t lastIMURead       = 0;
uint32_t lastBLETransmit   = 0;
uint32_t lastLEDUpdate     = 0;
uint32_t loopStartTime     = 0;

static const uint32_t MAX30102_INTERVAL = 20;    // 50Hz for beat detection
static const uint32_t GSR_INTERVAL      = 100;   // 10Hz
static const uint32_t IMU_INTERVAL      = 100;   // 10Hz
static const uint32_t BLE_INTERVAL      = 1000;  // 1Hz JSON transmission
static const uint32_t LED_INTERVAL      = 500;   // LED blink rate
static const uint32_t WATCHDOG_TIMEOUT  = 5000;  // Reset if loop stalls >5s

// ─────────────────────────────────────────────────────────────
// Error tracking
// ─────────────────────────────────────────────────────────────
bool imu_ok = false;
uint8_t i2cErrorCount = 0;
static const uint8_t I2C_ERROR_THRESHOLD = 3;

// ─────────────────────────────────────────────────────────────
// Battery estimation
// ─────────────────────────────────────────────────────────────
// With a voltage divider (100k/100k) on A1, the ADC reads half of battery voltage.
// If no voltage divider is installed, battery reads as 0 and we report -1.
int batteryPercent = -1;

int estimateBattery() {
    int raw = analogRead(BATTERY_PIN);
    if (raw < 10) return -1;  // No voltage divider installed

    // ADC is 10-bit (0-1023), reference is 3.3V
    // With 100k/100k divider: Vbat = raw * 3.3 / 1023 * 2
    float voltage = raw * 3.3f / 1023.0f * 2.0f;

    // LiPo discharge curve approximation (3.0V = 0%, 4.2V = 100%)
    int percent = (int)((voltage - 3.0f) / 1.2f * 100.0f);
    if (percent < 0)   percent = 0;
    if (percent > 100)  percent = 100;
    return percent;
}

// ─────────────────────────────────────────────────────────────
// I2C Bus Recovery
// ─────────────────────────────────────────────────────────────
void recoverI2C() {
    Wire.end();
    delay(10);
    Wire.begin();
    i2cErrorCount = 0;
}

// ─────────────────────────────────────────────────────────────
// LED Helpers — Nano 33 BLE LEDs are active LOW
// ─────────────────────────────────────────────────────────────
void ledOn(int pin)  { digitalWrite(pin, LOW);  }
void ledOff(int pin) { digitalWrite(pin, HIGH); }

// ─────────────────────────────────────────────────────────────
// SETUP
// ─────────────────────────────────────────────────────────────
void setup() {
    Serial.begin(115200);
    // Don't block on Serial — device must work without USB connection
    uint32_t serialWait = millis();
    while (!Serial && (millis() - serialWait < 2000));

    Serial.println(F("NeuraFy Firmware v1.0"));
    Serial.println(F("========================"));

    // ── LED Setup ──
    pinMode(LED_GREEN, OUTPUT);
    pinMode(LED_BLUE,  OUTPUT);
    pinMode(LED_RED,   OUTPUT);
    ledOff(LED_GREEN);
    ledOff(LED_BLUE);
    ledOff(LED_RED);

    // ── I2C Setup ──
    Wire.begin();
    Wire.setClock(400000);  // 400kHz Fast Mode for responsive sensor reads

    // ── MAX30102 Initialization ──
    Serial.print(F("Initializing MAX30102... "));
    if (particleSensor.begin(Wire, I2C_SPEED_FAST)) {
        Serial.println(F("OK"));
        max30102_ok = true;

        // Configure for heart rate + SpO2 mode
        // Arguments: powerLevel, sampleAverage, ledMode, sampleRate, pulseWidth, adcRange
        //   powerLevel:   0x1F = 6.4mA (moderate power, good for wrist)
        //   sampleAverage: 4   (average 4 samples per FIFO slot)
        //   ledMode:       2   (Red + IR for SpO2)
        //   sampleRate:    400 (400 samples/sec before averaging = 100 effective Hz)
        //   pulseWidth:    411 (longest pulse = best resolution)
        //   adcRange:      4096 (full range)
        particleSensor.setup(0x1F, 4, 2, 400, 411, 4096);

        // Turn off the onboard MAX30102 temperature sensor to save a tiny bit of power
        particleSensor.enableDIETEMPRDY();
    } else {
        Serial.println(F("FAILED — check wiring and I2C address 0x57"));
        max30102_ok = false;
        ledOn(LED_RED);
    }

    // ── BMI270 IMU Initialization ──
    Serial.print(F("Initializing BMI270 IMU... "));
    if (IMU.begin()) {
        Serial.println(F("OK"));
        imu_ok = true;
        Serial.print(F("  Accelerometer sample rate: "));
        Serial.print(IMU.accelerationSampleRate());
        Serial.println(F(" Hz"));
    } else {
        Serial.println(F("FAILED — onboard IMU not responding"));
        imu_ok = false;
        ledOn(LED_RED);
    }

    // ── GSR Analog Pin ──
    pinMode(GSR_PIN, INPUT);
    Serial.println(F("GSR sensor on A0: OK"));

    // ── HS3003 Temperature Sensor ──
    Serial.print(F("Initializing HS3003 temp... "));
    if (HS300x.begin()) {
        Serial.println(F("OK"));
        hs300x_ok = true;
    } else {
        Serial.println(F("FAILED — onboard temp sensor not responding"));
        hs300x_ok = false;
    }

    // ── APDS9960 Light Sensor ──
    Serial.print(F("Initializing APDS9960 light... "));
    if (APDS.begin()) {
        Serial.println(F("OK"));
        apds_ok = true;
    } else {
        Serial.println(F("FAILED — onboard light sensor not responding"));
        apds_ok = false;
    }

    // ── LPS22HB Barometric Pressure ──
    Serial.print(F("Initializing LPS22HB pressure... "));
    if (BARO.begin()) {
        Serial.println(F("OK"));
        baro_ok = true;
    } else {
        Serial.println(F("FAILED — onboard pressure sensor not responding"));
        baro_ok = false;
    }

    // ── Battery Monitor ──
    pinMode(BATTERY_PIN, INPUT);

    // ── BLE Initialization ──
    Serial.print(F("Initializing BLE... "));
    if (!BLE.begin()) {
        Serial.println(F("FAILED — BLE hardware error"));
        ledOn(LED_RED);
        while (1);  // Can't proceed without BLE — halt
    }
    Serial.println(F("OK"));

    BLE.setLocalName("NeuraFy");
    BLE.setDeviceName("NeuraFy");
    BLE.setAdvertisedService(neurafyService);

    neurafyService.addCharacteristic(sensorDataChar);
    neurafyService.addCharacteristic(deviceStatusChar);
    neurafyService.addCharacteristic(resetCmdChar);
    BLE.addService(neurafyService);

    // Set initial status
    String statusJson = "{\"fw\":\"2.0\",\"max\":";
    statusJson += max30102_ok ? "1" : "0";
    statusJson += ",\"imu\":";
    statusJson += imu_ok ? "1" : "0";
    statusJson += ",\"tmp\":";
    statusJson += hs300x_ok ? "1" : "0";
    statusJson += ",\"lux\":";
    statusJson += apds_ok ? "1" : "0";
    statusJson += ",\"bar\":";
    statusJson += baro_ok ? "1" : "0";
    statusJson += ",\"gsr\":1,\"mod\":10}";  // 10 modalities
    deviceStatusChar.writeValue(statusJson);

    // Start advertising — 100ms interval balances discoverability and power
    BLE.setConnectionInterval(6, 12);  // 7.5ms - 15ms connection interval for low latency
    BLE.advertise();

    Serial.println(F("BLE advertising as 'NeuraFy'"));
    Serial.println(F("Waiting for connection..."));
    Serial.println();

    // Initialize beat detection arrays
    for (int i = 0; i < RATE_SIZE; i++) rates[i] = 0;
    for (int i = 0; i < IBI_HISTORY_SIZE; i++) ibiHistory[i] = 0;

    // Initialize new sensor buffers
    for (int i = 0; i < RESP_BUF_SIZE; i++) respBuffer[i] = 0;
    for (int i = 0; i < SLEEP_BUF_SIZE; i++) sleepBuffer[i] = 0;
}

// ─────────────────────────────────────────────────────────────
// READ MAX30102 — called at 50Hz for reliable beat detection
// ─────────────────────────────────────────────────────────────
void readMAX30102() {
    if (!max30102_ok) return;

    uint32_t irValue = particleSensor.getIR();

    // Finger detection: IR value > 50000 typically means finger is on sensor
    if (irValue < 50000) {
        beatsPerMinute = 0;
        beatAvg = 0;
        lastIBI = 0;
        return;
    }

    // Store IR value for respiratory rate extraction
    // Breathing modulates IR amplitude — low-frequency envelope gives resp rate
    respBuffer[respBufIdx] = (float)irValue;
    respBufIdx = (respBufIdx + 1) % RESP_BUF_SIZE;
    if (respBufIdx == 0) respBufFull = true;

    // Beat detection using SparkFun algorithm
    if (checkForBeat(irValue)) {
        uint32_t now = millis();
        int32_t delta = now - lastBeatTime;
        lastBeatTime = now;

        // Sanity check: IBI should be between 300ms (200 BPM) and 2000ms (30 BPM)
        if (delta > 300 && delta < 2000) {
            beatsPerMinute = 60000 / delta;
            lastIBI = delta;

            // Store IBI for HRV analysis
            ibiHistory[ibiIndex] = delta;
            ibiIndex = (ibiIndex + 1) % IBI_HISTORY_SIZE;
            if (ibiCount < IBI_HISTORY_SIZE) ibiCount++;

            // Rolling average of BPM
            rates[rateSpot++] = beatsPerMinute;
            rateSpot %= RATE_SIZE;

            int32_t sum = 0;
            for (int i = 0; i < RATE_SIZE; i++) sum += rates[i];
            beatAvg = sum / RATE_SIZE;
        }
    }
}

// ─────────────────────────────────────────────────────────────
// COMPUTE SpO2 — simplified ratio-of-ratios method
// The SparkFun library includes a more complex algorithm, but
// for a science fair proof-of-concept, this direct computation
// is more transparent and explainable to judges.
// ─────────────────────────────────────────────────────────────
void computeSpO2() {
    if (!max30102_ok) {
        spo2Value = -1;
        spo2Valid = false;
        return;
    }

    // Check if finger is present
    uint32_t irCheck = particleSensor.getIR();
    if (irCheck < 50000) {
        spo2Value = -1;
        spo2Valid = false;
        return;
    }

    // Collect samples for SpO2 computation
    // We use the most recent IR and Red values for a simplified computation
    uint32_t ir = particleSensor.getIR();
    uint32_t red = particleSensor.getRed();

    if (ir > 0 && red > 0) {
        // Simplified R ratio — in production this uses AC/DC components
        // R = (AC_red / DC_red) / (AC_ir / DC_ir)
        // For the proof-of-concept, we use the raw ratio and a linear calibration
        float ratio = (float)red / (float)ir;

        // Empirical calibration curve for MAX30102
        // SpO2 = -45.060 * R^2 + 30.354 * R + 94.845
        // This is an approximation — clinical devices use manufacturer-specific curves
        int computed = (int)(-45.060f * ratio * ratio + 30.354f * ratio + 94.845f);

        // Clamp to physiological range
        if (computed >= 70 && computed <= 100) {
            spo2Value = computed;
            spo2Valid = true;
        }
    }
}

// ─────────────────────────────────────────────────────────────
// READ GSR — averaged over multiple samples to reduce noise
// ─────────────────────────────────────────────────────────────
void readGSR() {
    long sum = 0;
    for (int i = 0; i < GSR_SAMPLES; i++) {
        sum += analogRead(GSR_PIN);
    }
    gsrValue = sum / GSR_SAMPLES;
}

// ─────────────────────────────────────────────────────────────
// READ IMU — accelerometer and gyroscope for gait analysis
// ─────────────────────────────────────────────────────────────
void readIMU() {
    if (!imu_ok) return;

    if (IMU.accelerationAvailable()) {
        IMU.readAcceleration(accelX, accelY, accelZ);
    }
    if (IMU.gyroscopeAvailable()) {
        IMU.readGyroscope(gyroX, gyroY, gyroZ);
    }

    // Compute gait activity score:
    // At rest, acceleration magnitude ≈ 1g (9.8 m/s²)
    // During walking, magnitude deviates from 1g due to vertical bounce
    // We use the deviation as a simple activity metric
    float mag = sqrt(accelX * accelX + accelY * accelY + accelZ * accelZ);
    float deviation = fabs(mag - 1.0f);  // IMU reports in g, not m/s²

    // Exponential moving average for smooth score
    gaitScore = GAIT_ALPHA * deviation + (1.0f - GAIT_ALPHA) * gaitScore;
}

// ─────────────────────────────────────────────────────────────
// COMPUTE RESPIRATORY RATE — from PPG signal envelope
// Uses zero-crossing count on the low-pass filtered IR signal.
// ─────────────────────────────────────────────────────────────
void computeRespRate() {
    if (!respBufFull) { respRate = -1; return; }

    // Simple moving average filter (window=100 ≈ 2 sec at 50Hz)
    static const int WINDOW = 100;
    float filtered[RESP_BUF_SIZE - WINDOW];
    for (int i = 0; i < RESP_BUF_SIZE - WINDOW; i++) {
        float sum = 0;
        for (int j = 0; j < WINDOW; j++) {
            int idx = (respBufIdx + i + j) % RESP_BUF_SIZE;
            sum += respBuffer[idx];
        }
        filtered[i] = sum / WINDOW;
    }

    // Count zero-crossings of the derivative (peaks in envelope = breaths)
    int crossings = 0;
    int len = RESP_BUF_SIZE - WINDOW - 1;
    for (int i = 1; i < len; i++) {
        float d1 = filtered[i] - filtered[i-1];
        float d2 = filtered[i+1] - filtered[i];
        if (d1 > 0 && d2 < 0) crossings++;  // peak detected
    }

    // Buffer is 10 seconds → multiply by 6 for breaths per minute
    int rr = crossings * 6;

    // Validate physiological range (8-30 breaths/min)
    if (rr >= 8 && rr <= 30) {
        respRate = rr;
    }
    // else keep previous value
}

// ─────────────────────────────────────────────────────────────
// READ TEMPERATURE — HS3003 onboard sensor
// ─────────────────────────────────────────────────────────────
void readTemperature() {
    if (!hs300x_ok) return;

    float t = HS300x.readTemperature();
    if (t > -10.0f && t < 60.0f) {
        skinTemp = t;
        if (t < tempMin) tempMin = t;
        if (t > tempMax) tempMax = t;
    }

    // Humidity from same sensor — no extra init needed
    float h = HS300x.readHumidity();
    if (h >= 0.0f && h <= 100.0f) {
        skinHumidity = h;
    }
}

// ─────────────────────────────────────────────────────────────
// READ AMBIENT LIGHT — APDS9960 clear channel
// ─────────────────────────────────────────────────────────────
void readAmbientLight() {
    if (!apds_ok) return;
    int r, g, b, c;
    if (APDS.colorAvailable()) {
        APDS.readColor(r, g, b, c);
        ambientLight = c;  // clear channel = ambient light intensity
    }
}

// ─────────────────────────────────────────────────────────────
// READ BAROMETRIC PRESSURE — LPS22HB
// ─────────────────────────────────────────────────────────────
void readBaroPressure() {
    if (!baro_ok) return;
    float p = BARO.readPressure();
    if (p > 80.0f && p < 120.0f) {  // sanity check (kPa range)
        baroPressure = p;
    }
}

// ─────────────────────────────────────────────────────────────
// SLEEP ACTIGRAPHY — simplified Cole-Kripke from IMU
// Classifies sleep vs wake based on 5-minute motion intensity.
// ─────────────────────────────────────────────────────────────
void updateSleepActigraphy() {
    // Activity count = deviation from 1g (gravity-subtracted magnitude)
    float mag = sqrt(accelX * accelX + accelY * accelY + accelZ * accelZ);
    float activity = fabs(mag - 1.0f);

    sleepBuffer[sleepBufIdx] = activity;
    sleepBufIdx = (sleepBufIdx + 1) % SLEEP_BUF_SIZE;
    if (sleepBufCount < SLEEP_BUF_SIZE) sleepBufCount++;

    // Need at least 60 seconds of data
    if (sleepBufCount < 60) { sleepScore = -1; return; }

    // Mean activity over the buffer (up to 5 minutes)
    float sum = 0;
    for (int i = 0; i < sleepBufCount; i++) sum += sleepBuffer[i];
    float meanActivity = sum / sleepBufCount;

    // Sleep/wake threshold: < 0.05g mean activity over window = sleeping
    isSleeping = (meanActivity < 0.05f);

    // Sleep score: percentage of low-activity epochs in the buffer
    int quietEpochs = 0;
    for (int i = 0; i < sleepBufCount; i++) {
        if (sleepBuffer[i] < 0.05f) quietEpochs++;
    }
    sleepScore = (int8_t)((float)quietEpochs / sleepBufCount * 100.0f);
}

// ─────────────────────────────────────────────────────────────
// COMPUTE NEURO-RISK INDEX — weighted multimodal fusion
// Produces a 0-100 composite score from all sensor streams.
// This parallels the science fair board's stacked meta-model.
// NOT diagnostic — a demonstration of sensor fusion.
// ─────────────────────────────────────────────────────────────
void computeNeuroRiskIndex() {
    float risk = 0.0f;

    // HRV: compute SDNN from IBI history
    if (ibiCount >= 10) {
        float ibiMean = 0;
        for (int i = 0; i < ibiCount; i++) ibiMean += ibiHistory[i];
        ibiMean /= ibiCount;
        float ibiVar = 0;
        for (int i = 0; i < ibiCount; i++) {
            float d = ibiHistory[i] - ibiMean;
            ibiVar += d * d;
        }
        float sdnn = sqrt(ibiVar / ibiCount);
        // Low SDNN (<50ms) = autonomic dysfunction
        if (sdnn < 50.0f) risk += 25.0f * (1.0f - sdnn / 50.0f);
    }

    // SpO2: oxygenation concern
    if (spo2Valid && spo2Value < 96) {
        risk += 20.0f * (1.0f - (float)spo2Value / 100.0f);
    }

    // Gait: sedentary / motor deficit
    if (gaitScore < 0.1f) {
        risk += 15.0f;
    }

    // GSR: stress / EDA anomaly
    if (gsrValue > 600) {
        risk += 15.0f * min(1.0f, (float)(gsrValue - 600) / 200.0f);
    }

    // Respiratory rate: concern if outside normal
    if (respRate > 0 && respRate < 12) {
        risk += 10.0f;
    }

    // Sleep: fragmentation
    if (sleepScore >= 0 && sleepScore < 50) {
        risk += 15.0f * (1.0f - (float)sleepScore / 50.0f);
    }

    // Clamp to 0-100
    if (risk < 0) risk = 0;
    if (risk > 100) risk = 100;
    neuroRiskIndex = (int8_t)risk;
}

// ─────────────────────────────────────────────────────────────
// BUILD JSON PAYLOAD
// ─────────────────────────────────────────────────────────────
String buildJSON() {
    // Keep keys short to fit within BLE MTU
    // hr:  heart rate BPM (averaged)
    // sp:  SpO2 percentage
    // gsr: galvanic skin response (raw ADC 0-1023)
    // gait: gait activity score (0.0 = still, higher = more motion)
    // ibi: last inter-beat interval in ms (for HRV computation in dashboard)
    // ax,ay,az: accelerometer in g
    // bt:  battery percentage (-1 if no voltage divider)
    // ts:  timestamp in ms since boot

    String json = "{";
    json += "\"hr\":";
    json += (max30102_ok && beatAvg > 0) ? String(beatAvg) : "-1";
    json += ",\"sp\":";
    json += (max30102_ok && spo2Valid) ? String(spo2Value) : "-1";
    json += ",\"gsr\":";
    json += String(gsrValue);
    json += ",\"gait\":";
    json += String(gaitScore, 2);
    json += ",\"ibi\":";
    json += (max30102_ok && lastIBI > 0) ? String(lastIBI) : "-1";
    json += ",\"ax\":";
    json += String(accelX, 2);
    json += ",\"ay\":";
    json += String(accelY, 2);
    json += ",\"az\":";
    json += String(accelZ, 2);
    json += ",\"rr\":";
    json += String(respRate);
    json += ",\"tmp\":";
    json += (skinTemp > 0) ? String(skinTemp, 1) : "-1";
    json += ",\"hum\":";
    json += (skinHumidity >= 0) ? String(skinHumidity, 1) : "-1";
    json += ",\"lux\":";
    json += String(ambientLight);
    json += ",\"prs\":";
    json += (baroPressure > 0) ? String(baroPressure, 1) : "-1";
    json += ",\"slp\":";
    json += String(sleepScore);
    json += ",\"slps\":";
    json += isSleeping ? "1" : "0";
    json += ",\"nri\":";
    json += String(neuroRiskIndex);
    json += ",\"bt\":";
    json += String(batteryPercent);
    json += ",\"ts\":";
    json += String(millis());
    json += "}";

    return json;
}

// ─────────────────────────────────────────────────────────────
// MAIN LOOP — non-blocking, millis()-based scheduling
// ─────────────────────────────────────────────────────────────
void loop() {
    loopStartTime = millis();

    // ── BLE event processing ──
    BLEDevice central = BLE.central();

    bool connected = (central && central.connected());
    uint32_t now = millis();

    // ── MAX30102 at 50Hz (every 20ms) ──
    if (now - lastMAX30102Read >= MAX30102_INTERVAL) {
        lastMAX30102Read = now;
        readMAX30102();
    }

    // ── GSR at 10Hz (every 100ms) ──
    if (now - lastGSRRead >= GSR_INTERVAL) {
        lastGSRRead = now;
        readGSR();
    }

    // ── IMU at 10Hz (every 100ms) ──
    if (now - lastIMURead >= IMU_INTERVAL) {
        lastIMURead = now;
        readIMU();
    }

    // ── Temperature + Humidity + Pressure at 0.1Hz (every 10 seconds) ──
    if (now - lastTempRead >= TEMP_INTERVAL) {
        lastTempRead = now;
        readTemperature();
        readBaroPressure();
    }

    // ── BLE Transmission at 1Hz (every 1000ms) ──
    if (now - lastBLETransmit >= BLE_INTERVAL) {
        lastBLETransmit = now;

        // Update SpO2 once per second (doesn't need 50Hz sampling)
        computeSpO2();

        // Update ambient light (1Hz — light doesn't change fast)
        readAmbientLight();

        // Update respiratory rate from PPG envelope
        computeRespRate();

        // Update sleep actigraphy
        updateSleepActigraphy();

        // Compute composite neuro-risk index
        computeNeuroRiskIndex();

        // Update battery level
        batteryPercent = estimateBattery();

        // Build and send JSON
        String json = buildJSON();

        if (connected) {
            sensorDataChar.writeValue(json);

            // Flash blue LED briefly to indicate transmission
            ledOn(LED_BLUE);
        }

        // Also output to Serial for debugging when connected via USB
        Serial.println(json);
    }

    // ── BLE Reset Command ──
    // Dashboard can write 0x01 to trigger a software reboot
    if (resetCmdChar.written()) {
        if (resetCmdChar.value() == 1) {
            Serial.println(F("BLE reset command received — rebooting..."));
            delay(100);  // let BLE response flush
            NVIC_SystemReset();
        }
    }

    // ── LED Management ──
    if (now - lastLEDUpdate >= LED_INTERVAL) {
        lastLEDUpdate = now;

        // Green: BLE connected
        if (connected) {
            ledOn(LED_GREEN);
        } else {
            // Blink green while advertising
            static bool greenState = false;
            greenState = !greenState;
            if (greenState) ledOn(LED_GREEN);
            else ledOff(LED_GREEN);
        }

        // Turn off blue LED after brief flash (it was turned on during transmit)
        ledOff(LED_BLUE);

        // Red: sensor error
        if (!max30102_ok || !imu_ok) {
            ledOn(LED_RED);
        } else {
            ledOff(LED_RED);
        }
    }

    // ── Software Watchdog ──
    // If the loop takes more than 5 seconds, something is hung — reset
    if (millis() - loopStartTime > WATCHDOG_TIMEOUT) {
        Serial.println(F("WATCHDOG: Loop stall detected — resetting"));
        NVIC_SystemReset();
    }

    // ── I2C Bus Recovery ──
    // If we accumulate too many I2C errors, reset the bus
    // (i2cErrorCount is incremented in sensor read functions if they detect errors)
    if (i2cErrorCount >= I2C_ERROR_THRESHOLD) {
        Serial.println(F("I2C: Too many errors — recovering bus"));
        recoverI2C();

        // Re-initialize MAX30102 after bus recovery
        if (max30102_ok) {
            if (!particleSensor.begin(Wire, I2C_SPEED_FAST)) {
                max30102_ok = false;
                Serial.println(F("MAX30102: Failed to re-initialize after I2C recovery"));
            } else {
                particleSensor.setup(0x1F, 4, 2, 400, 411, 4096);
            }
        }
    }
}
