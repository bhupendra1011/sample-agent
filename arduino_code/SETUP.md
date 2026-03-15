# Arduino Setup Guide

## 1. Install Arduino IDE

Download and install **Arduino IDE 2.x** from:
https://www.arduino.cc/en/software

## 2. Add ESP8266 Board Support

1. Open Arduino IDE
2. Go to **Arduino IDE → Settings** (or **File → Preferences** on Windows)
3. In **Additional Board Manager URLs**, add:
   ```
   https://arduino.esp8266.com/stable/package_esp8266com_index.json
   ```
4. Click OK
5. Go to **Tools → Board → Boards Manager**
6. Search `esp8266` → Install **"esp8266 by ESP8266 Community"**

## 3. Install Libraries

Go to **Tools → Manage Libraries** and install these:

| Library | Author | Version |
|---------|--------|---------|
| Adafruit NeoPixel | Adafruit | 1.12+ |
| Adafruit SSD1306 | Adafruit | 2.5+ |
| Adafruit GFX Library | Adafruit | 1.11+ |
| ArduinoJson | Benoit Blanchon | 7.x |

> When prompted to install dependencies for Adafruit libraries, click **"Install All"**

## 4. Configure Board

1. Connect NodeMCU via USB
2. Go to **Tools** menu and set:

| Setting | Value |
|---------|-------|
| Board | NodeMCU 1.0 (ESP-12E Module) |
| Upload Speed | 115200 |
| CPU Frequency | 80 MHz |
| Flash Size | 4MB (FS:2MB OTA:~1019KB) |
| Port | Select your USB port (e.g., /dev/cu.usbserial-XXX) |

> **Mac tip**: If no port appears, you may need the CH340 USB driver:
> https://github.com/adrianmihalko/ch340g-ch34g-ch34x-mac-os-x-driver

## 5. Edit WiFi Credentials

Open `smart_light/smart_light.ino` and edit these two lines:

```cpp
const char* WIFI_SSID = "YOUR_WIFI_SSID";       // ← Your WiFi name
const char* WIFI_PASS = "YOUR_WIFI_PASSWORD";    // ← Your WiFi password
```

## 6. Upload

1. Click the **Upload** button (→ arrow) in Arduino IDE
2. Wait for "Done uploading"
3. Open **Serial Monitor** (magnifying glass icon) at **115200 baud**
4. You should see:
   ```
   === IoT Smart Light Starting ===
   OLED initialized
   NeoPixel initialized (16 LEDs on pin D4)
   Connecting to WiFi: YOUR_SSID......
   Connected! IP: 192.168.1.XXX
   mDNS started: http://smartlight.local
   HTTP server started on port 80
   === Ready ===
   ```

## 7. Test

```bash
# Health check
curl http://<IP_FROM_SERIAL>/health

# Turn on red
curl -X POST http://<IP_FROM_SERIAL>/light \
  -H "Content-Type: application/json" \
  -d '{"on":true,"color":"#FF0000","brightness":80}'

# Check status
curl http://<IP_FROM_SERIAL>/status

# Turn off
curl -X POST http://<IP_FROM_SERIAL>/light \
  -H "Content-Type: application/json" \
  -d '{"on":false}'
```

## Wiring Reference

```
NodeMCU          LED Ring (WS2812B)
  D4  ──────►  DIN
  3V3 ──────►  VCC  (use VIN for brighter)
  GND ──────►  GND

NodeMCU          OLED (SSD1306 I2C)
  D1  ──────►  SCL
  D2  ──────►  SDA
  3V3 ──────►  VCC
  GND ──────►  GND
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| No port in Arduino IDE | Install CH340 USB driver (link above) |
| Upload fails | Hold FLASH button on NodeMCU during upload start |
| OLED blank | Try changing `OLED_ADDR` from `0x3C` to `0x3D` |
| LEDs don't light | Check DIN wiring to D4, try VIN for power |
| WiFi won't connect | Check SSID/password, ensure 2.4GHz (not 5GHz) |
| mDNS not working | Use IP address directly — mDNS is flaky on some networks |
