/*
 * ============================================
 *  SMART LIGHT CONTROLLER - FULL VERSION
 *  with MCP Server Integration
 * ============================================
 * 
 * Features:
 * - Button ON/OFF control (D3)
 * - WiFi with Static IP
 * - HTTP Server for MCP commands
 * - RGB Color control (any color)
 * - Brightness control (0-100%)
 * - Blink effect with custom frequency
 * - Pulse/Fade effects
 * - Temporary color (e.g., red for 3 seconds)
 * - Multiple named colors
 * 
 * Endpoints:
 * - POST /light    - Control light
 * - GET  /status   - Get current state
 * - GET  /health   - Health check
 * - POST /effect   - Special effects
 * 
 */

 /*
 # Turn on blue
curl -X POST http://192.168.1.50/light \
  -H "Content-Type: application/json" \
  -d '{"on": true, "color": "blue"}'

# Red for 3 seconds (then returns to previous)
curl -X POST http://192.168.1.50/light \
  -H "Content-Type: application/json" \
  -d '{"color": "red", "duration": 3}'

# Blink green for 5 seconds
curl -X POST http://192.168.1.50/light \
  -H "Content-Type: application/json" \
  -d '{"color": "green", "blink": 5}'

# Fast blink (100ms interval)
curl -X POST http://192.168.1.50/light \
  -H "Content-Type: application/json" \
  -d '{"color": "yellow", "blink": 5, "interval": 100}'

# Pulse effect
curl -X POST http://192.168.1.50/light \
  -H "Content-Type: application/json" \
  -d '{"color": "purple", "pulse": 10}'

# Set brightness 50%
curl -X POST http://192.168.1.50/light \
  -H "Content-Type: application/json" \
  -d '{"brightness": 50}'

# Turn off
curl -X POST http://192.168.1.50/light \
  -H "Content-Type: application/json" \
  -d '{"on": false}'

# Get status
curl http://192.168.1.50/status

# See all colors
curl http://192.168.1.50/colors

# Run demo
curl http://192.168.1.50/demo
 
 */

 #include <ESP8266WiFi.h>
 #include <ESP8266WebServer.h>
 #include <ArduinoJson.h>
 
 // ============================================
 // ===== CONFIGURATION - CHANGE THESE ========
 // ============================================
 
 const char* WIFI_SSID = "YOUR_WIFI_SSID";
 const char* WIFI_PASS = "YOUR_PASSWORD_HERE";
 
 // Static IP Configuration
 IPAddress staticIP(192, 168, 1, 50);    // NodeMCU fixed IP
 IPAddress gateway(192, 168, 1, 1);       // Router IP
 IPAddress subnet(255, 255, 255, 0);
 IPAddress dns(8, 8, 8, 8);               // Google DNS
 
 // ============================================
 // ===== PIN DEFINITIONS ======================
 // ============================================
 
 #define LED_RED    D8
 #define LED_GREEN  D7
 #define LED_BLUE   D6
 #define BTN_PIN    D3
 
 // ============================================
 // ===== GLOBAL VARIABLES =====================
 // ============================================
 
 ESP8266WebServer server(80);
 
 // Light State
 struct LightState {
   bool on = false;
   uint8_t r = 0;
   uint8_t g = 0;
   uint8_t b = 0;
   String colorName = "off";
   uint8_t brightness = 100;
 } lightState;
 
 // Effect State
 struct EffectState {
   bool active = false;
   String type = "none";       // "blink", "pulse", "fade", "rainbow"
   unsigned long endTime = 0;  // When effect ends (0 = forever)
   unsigned long interval = 300; // Blink interval in ms
   unsigned long lastToggle = 0;
   bool toggleState = false;
   
   // For temporary color
   bool tempActive = false;
   unsigned long tempEndTime = 0;
   uint8_t tempR, tempG, tempB;
   uint8_t origR, origG, origB;
   String origColorName;
   bool origOn;
 } effect;
 
 // System State
 enum SystemState {
   STATE_OFF,
   STATE_CONNECTING,
   STATE_READY,
   STATE_DISCONNECTING
 };
 
 SystemState currentState = STATE_OFF;
 bool lastButtonState = HIGH;
 unsigned long stateStartTime = 0;
 unsigned long lastConnectBlink = 0;
 bool connectBlinkOn = false;
 
 // ============================================
 // ===== LED CONTROL FUNCTIONS ================
 // ============================================
 
 void setRGB(uint8_t r, uint8_t g, uint8_t b) {
   // Use analogWrite for PWM (0-255 gives brightness control)
   analogWrite(LED_RED, r);
   analogWrite(LED_GREEN, g);
   analogWrite(LED_BLUE, b);
 }
 
 void setOff() {
   setRGB(0, 0, 0);
 }
 
 void applyLightState() {
   if (!lightState.on) {
     setOff();
     return;
   }
   
   // Apply brightness scaling
   uint8_t r = lightState.r * lightState.brightness / 100;
   uint8_t g = lightState.g * lightState.brightness / 100;
   uint8_t b = lightState.b * lightState.brightness / 100;
   
   setRGB(r, g, b);
 }
 
 void setColor(uint8_t r, uint8_t g, uint8_t b) {
   lightState.r = r;
   lightState.g = g;
   lightState.b = b;
   lightState.on = true;
   applyLightState();
 }
 
 // Parse color from name or hex code
 void parseColor(String color) {
   color.toLowerCase();
   color.trim();
   
   // Hex color "#RRGGBB"
   if (color.startsWith("#") && color.length() == 7) {
     long number = strtol(color.c_str() + 1, NULL, 16);
     lightState.r = (number >> 16) & 0xFF;
     lightState.g = (number >> 8) & 0xFF;
     lightState.b = number & 0xFF;
     lightState.colorName = color;
     return;
   }
   
   // Named colors
   if      (color == "red")         { lightState.r = 255; lightState.g = 0;   lightState.b = 0;   }
   else if (color == "green")       { lightState.r = 0;   lightState.g = 255; lightState.b = 0;   }
   else if (color == "blue")        { lightState.r = 0;   lightState.g = 0;   lightState.b = 255; }
   else if (color == "yellow")      { lightState.r = 255; lightState.g = 255; lightState.b = 0;   }
   else if (color == "orange")      { lightState.r = 255; lightState.g = 100; lightState.b = 0;   }
   else if (color == "purple")      { lightState.r = 128; lightState.g = 0;   lightState.b = 128; }
   else if (color == "violet")      { lightState.r = 148; lightState.g = 0;   lightState.b = 211; }
   else if (color == "cyan")        { lightState.r = 0;   lightState.g = 255; lightState.b = 255; }
   else if (color == "magenta")     { lightState.r = 255; lightState.g = 0;   lightState.b = 255; }
   else if (color == "pink")        { lightState.r = 255; lightState.g = 105; lightState.b = 180; }
   else if (color == "white")       { lightState.r = 255; lightState.g = 255; lightState.b = 255; }
   else if (color == "warm_white")  { lightState.r = 255; lightState.g = 200; lightState.b = 150; }
   else if (color == "cool_white")  { lightState.r = 200; lightState.g = 220; lightState.b = 255; }
   else if (color == "gold")        { lightState.r = 255; lightState.g = 215; lightState.b = 0;   }
   else if (color == "silver")      { lightState.r = 192; lightState.g = 192; lightState.b = 192; }
   else if (color == "lime")        { lightState.r = 50;  lightState.g = 255; lightState.b = 50;  }
   else if (color == "teal")        { lightState.r = 0;   lightState.g = 128; lightState.b = 128; }
   else if (color == "indigo")      { lightState.r = 75;  lightState.g = 0;   lightState.b = 130; }
   else if (color == "coral")       { lightState.r = 255; lightState.g = 127; lightState.b = 80;  }
   else if (color == "off")         { lightState.r = 0;   lightState.g = 0;   lightState.b = 0; lightState.on = false; }
   else {
     // Unknown color - default to white
     lightState.r = 255; lightState.g = 255; lightState.b = 255;
     color = "white";
   }
   
   lightState.colorName = color;
 }
 
 // ============================================
 // ===== EFFECT FUNCTIONS =====================
 // ============================================
 
 void startBlink(int durationSec, int intervalMs) {
   effect.active = true;
   effect.type = "blink";
   effect.endTime = (durationSec > 0) ? millis() + (durationSec * 1000) : 0;
   effect.interval = (intervalMs > 0) ? intervalMs : 300;
   effect.lastToggle = millis();
   effect.toggleState = true;
   
   Serial.print("Blink started: ");
   if (durationSec > 0) {
     Serial.print(durationSec);
     Serial.print("s, ");
   } else {
     Serial.print("forever, ");
   }
   Serial.print(effect.interval);
   Serial.println("ms interval");
 }
 
 void startPulse(int durationSec) {
   effect.active = true;
   effect.type = "pulse";
   effect.endTime = (durationSec > 0) ? millis() + (durationSec * 1000) : 0;
   effect.interval = 20;  // Smooth pulse
   effect.lastToggle = millis();
   
   Serial.println("Pulse effect started");
 }
 
 void startTempColor(uint8_t r, uint8_t g, uint8_t b, int durationSec) {
   // Save original state
   effect.origR = lightState.r;
   effect.origG = lightState.g;
   effect.origB = lightState.b;
   effect.origColorName = lightState.colorName;
   effect.origOn = lightState.on;
   
   // Set temporary color
   effect.tempActive = true;
   effect.tempEndTime = millis() + (durationSec * 1000);
   effect.tempR = r;
   effect.tempG = g;
   effect.tempB = b;
   
   // Apply temp color immediately
   lightState.r = r;
   lightState.g = g;
   lightState.b = b;
   lightState.on = true;
   applyLightState();
   
   Serial.print("Temp color for ");
   Serial.print(durationSec);
   Serial.println(" seconds");
 }
 
 void stopEffect() {
   effect.active = false;
   effect.type = "none";
   applyLightState();
   Serial.println("Effect stopped");
 }
 
 void processEffects() {
   // Handle temporary color
   if (effect.tempActive) {
     if (millis() > effect.tempEndTime) {
       // Restore original state
       lightState.r = effect.origR;
       lightState.g = effect.origG;
       lightState.b = effect.origB;
       lightState.colorName = effect.origColorName;
       lightState.on = effect.origOn;
       effect.tempActive = false;
       applyLightState();
       Serial.println("Temp color ended, restored original");
     }
     return;  // Don't process other effects during temp color
   }
   
   if (!effect.active) return;
   
   // Check if effect should end
   if (effect.endTime > 0 && millis() > effect.endTime) {
     stopEffect();
     return;
   }
   
   // Blink effect
   if (effect.type == "blink") {
     if (millis() - effect.lastToggle >= effect.interval) {
       effect.toggleState = !effect.toggleState;
       if (effect.toggleState) {
         applyLightState();
       } else {
         setOff();
       }
       effect.lastToggle = millis();
     }
   }
   
   // Pulse effect (fade in/out)
   else if (effect.type == "pulse") {
     if (millis() - effect.lastToggle >= effect.interval) {
       static int brightness = 0;
       static int direction = 5;
       
       brightness += direction;
       if (brightness >= 100) { brightness = 100; direction = -5; }
       if (brightness <= 0) { brightness = 0; direction = 5; }
       
       uint8_t r = lightState.r * brightness / 100;
       uint8_t g = lightState.g * brightness / 100;
       uint8_t b = lightState.b * brightness / 100;
       setRGB(r, g, b);
       
       effect.lastToggle = millis();
     }
   }
 }
 
 // ============================================
 // ===== HTTP HANDLERS ========================
 // ============================================
 
 void addCorsHeaders() {
   server.sendHeader("Access-Control-Allow-Origin", "*");
   server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
   server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
 }
 
 // POST /light - Main control endpoint
 void handlePostLight() {
   addCorsHeaders();
   
   if (!server.hasArg("plain")) {
     server.send(400, "application/json", "{\"error\":\"No body\"}");
     return;
   }
   
   String body = server.arg("plain");
   Serial.println("\n╔══════════════════════════════╗");
   Serial.println("║  RECEIVED MCP COMMAND        ║");
   Serial.println("╚══════════════════════════════╝");
   Serial.println(body);
   
   JsonDocument doc;
   DeserializationError error = deserializeJson(doc, body);
   
   if (error) {
     Serial.println("JSON parse error!");
     server.send(400, "application/json", "{\"error\":\"Invalid JSON\"}");
     return;
   }
   
   // Stop any active effects first (unless this is adding an effect)
   if (!doc.containsKey("blink") && !doc.containsKey("pulse") && !doc.containsKey("duration")) {
     effect.active = false;
     effect.tempActive = false;
   }
   
   // Handle "on" field
   if (doc.containsKey("on")) {
     lightState.on = doc["on"].as<bool>();
     if (!lightState.on) {
       effect.active = false;
       effect.tempActive = false;
     }
   }
   
   // Handle "color" field
   String newColor = "";
   if (doc.containsKey("color")) {
     newColor = doc["color"].as<String>();
     parseColor(newColor);
     lightState.on = true;
   }
   
   // Handle "brightness" field (0-100)
   if (doc.containsKey("brightness")) {
     lightState.brightness = constrain(doc["brightness"].as<int>(), 0, 100);
   }
   
   // Handle "duration" - temporary color for X seconds
   if (doc.containsKey("duration")) {
     int duration = doc["duration"].as<int>();
     if (duration > 0) {
       startTempColor(lightState.r, lightState.g, lightState.b, duration);
     }
   }
   
   // Handle "blink" field - blink for X seconds (0 = forever)
   if (doc.containsKey("blink")) {
     int blinkDuration = doc["blink"].as<int>();
     int blinkInterval = doc["interval"] | 300;  // Default 300ms
     startBlink(blinkDuration, blinkInterval);
   }
   
   // Handle "pulse" field - pulse effect
   if (doc.containsKey("pulse")) {
     int pulseDuration = doc["pulse"].as<int>();
     startPulse(pulseDuration);
   }
   
   // Handle "effect" field for stopping
   if (doc.containsKey("effect")) {
     String effectType = doc["effect"].as<String>();
     if (effectType == "none" || effectType == "stop") {
       stopEffect();
     }
   }
   
   // Apply state if no special effect
   if (!effect.active && !effect.tempActive) {
     applyLightState();
   }
   
   // Log result
   Serial.println("─────────────────────────────────");
   Serial.print("Light: "); Serial.println(lightState.on ? "ON" : "OFF");
   Serial.print("Color: "); Serial.println(lightState.colorName);
   Serial.print("RGB: "); 
   Serial.print(lightState.r); Serial.print(", ");
   Serial.print(lightState.g); Serial.print(", ");
   Serial.println(lightState.b);
   Serial.print("Brightness: "); Serial.print(lightState.brightness); Serial.println("%");
   Serial.print("Effect: "); Serial.println(effect.active ? effect.type : "none");
   Serial.println("─────────────────────────────────");
   
   // Build response
   JsonDocument res;
   res["success"] = true;
   res["state"]["on"] = lightState.on;
   res["state"]["color"] = lightState.colorName;
   res["state"]["brightness"] = lightState.brightness;
   res["state"]["rgb"]["r"] = lightState.r;
   res["state"]["rgb"]["g"] = lightState.g;
   res["state"]["rgb"]["b"] = lightState.b;
   res["state"]["effect"] = effect.active ? effect.type : "none";
   
   String output;
   serializeJson(res, output);
   server.send(200, "application/json", output);
 }
 
 // GET /status - Get current state
 void handleGetStatus() {
   addCorsHeaders();
   
   JsonDocument doc;
   doc["on"] = lightState.on;
   doc["color"] = lightState.colorName;
   doc["brightness"] = lightState.brightness;
   doc["rgb"]["r"] = lightState.r;
   doc["rgb"]["g"] = lightState.g;
   doc["rgb"]["b"] = lightState.b;
   doc["effect"]["active"] = effect.active;
   doc["effect"]["type"] = effect.type;
   doc["device"] = "NodeMCU-SmartLight";
   doc["version"] = "1.0.0";
   doc["ip"] = WiFi.localIP().toString();
   doc["rssi"] = WiFi.RSSI();
   doc["uptime_seconds"] = millis() / 1000;
   doc["free_heap"] = ESP.getFreeHeap();
   
   String output;
   serializeJson(doc, output);
   server.send(200, "application/json", output);
 }
 
 // GET /health - Simple health check
 void handleHealth() {
   addCorsHeaders();
   server.send(200, "application/json", "{\"status\":\"ok\",\"device\":\"NodeMCU-SmartLight\"}");
 }
 
 // GET /colors - List available colors
 void handleColors() {
   addCorsHeaders();
   String json = "{\"colors\":[";
   json += "\"red\",\"green\",\"blue\",\"yellow\",\"orange\",\"purple\",";
   json += "\"violet\",\"cyan\",\"magenta\",\"pink\",\"white\",";
   json += "\"warm_white\",\"cool_white\",\"gold\",\"silver\",";
   json += "\"lime\",\"teal\",\"indigo\",\"coral\",\"off\"";
   json += "],\"note\":\"You can also use hex codes like #FF5500\"}";
   server.send(200, "application/json", json);
 }
 
 // GET /demo - Run a demo sequence
 void handleDemo() {
   addCorsHeaders();
   server.send(200, "application/json", "{\"status\":\"Demo starting...\"}");
   
   Serial.println("\n*** DEMO MODE ***");
   
   // Demo sequence
   String colors[] = {"red", "orange", "yellow", "green", "cyan", "blue", "purple", "pink", "white"};
   int numColors = 9;
   
   for (int i = 0; i < numColors; i++) {
     parseColor(colors[i]);
     lightState.on = true;
     applyLightState();
     Serial.print("Demo: "); Serial.println(colors[i]);
     delay(500);
   }
   
   // Blink demo
   startBlink(3, 200);
   delay(3000);
   stopEffect();
   
   // Return to green (ready state)
   parseColor("green");
   lightState.on = true;
   applyLightState();
   Serial.println("*** DEMO COMPLETE ***\n");
 }
 
 // OPTIONS handler for CORS
 void handleOptions() {
   addCorsHeaders();
   server.send(204);
 }
 
 // ============================================
 // ===== WIFI FUNCTIONS =======================
 // ============================================
 
 void blinkConnecting() {
   if (millis() - lastConnectBlink > 300) {
     connectBlinkOn = !connectBlinkOn;
     if (connectBlinkOn) {
       setRGB(255, 100, 0);  // Orange
     } else {
       setOff();
     }
     lastConnectBlink = millis();
   }
 }
 
 bool connectWiFi() {
   Serial.println("\n╔══════════════════════════════╗");
   Serial.println("║  CONNECTING TO WIFI          ║");
   Serial.println("╚══════════════════════════════╝");
   Serial.print("SSID: "); Serial.println(WIFI_SSID);
   Serial.print("Static IP: "); Serial.println(staticIP);
   
   // Configure static IP
   WiFi.config(staticIP, gateway, subnet, dns);
   WiFi.begin(WIFI_SSID, WIFI_PASS);
   
   int attempts = 0;
   while (WiFi.status() != WL_CONNECTED && attempts < 40) {
     blinkConnecting();
     delay(500);
     Serial.print(".");
     attempts++;
   }
   
   if (WiFi.status() == WL_CONNECTED) {
     Serial.println("\n");
     Serial.println("┌────────────────────────────────┐");
     Serial.println("│  ✓ WiFi CONNECTED!             │");
     Serial.println("└────────────────────────────────┘");
     Serial.print("IP Address: "); Serial.println(WiFi.localIP());
     Serial.print("Gateway: "); Serial.println(WiFi.gatewayIP());
     Serial.print("Signal: "); Serial.print(WiFi.RSSI()); Serial.println(" dBm");
     return true;
   } else {
     Serial.println("\n✗ WiFi Connection FAILED!");
     return false;
   }
 }
 
 void startServer() {
   // Register routes
   server.on("/light", HTTP_POST, handlePostLight);
   server.on("/light", HTTP_OPTIONS, handleOptions);
   server.on("/status", HTTP_GET, handleGetStatus);
   server.on("/health", HTTP_GET, handleHealth);
   server.on("/colors", HTTP_GET, handleColors);
   server.on("/demo", HTTP_GET, handleDemo);
   
   server.begin();
   
   Serial.println("\n┌────────────────────────────────┐");
   Serial.println("│  HTTP SERVER STARTED           │");
   Serial.println("└────────────────────────────────┘");
   Serial.println("\nEndpoints:");
   Serial.print("  POST http://"); Serial.print(WiFi.localIP()); Serial.println("/light");
   Serial.print("  GET  http://"); Serial.print(WiFi.localIP()); Serial.println("/status");
   Serial.print("  GET  http://"); Serial.print(WiFi.localIP()); Serial.println("/health");
   Serial.print("  GET  http://"); Serial.print(WiFi.localIP()); Serial.println("/colors");
   Serial.print("  GET  http://"); Serial.print(WiFi.localIP()); Serial.println("/demo");
   
   Serial.println("\n╔══════════════════════════════════════╗");
   Serial.println("║  READY FOR MCP COMMANDS!             ║");
   Serial.println("╚══════════════════════════════════════╝");
   
   Serial.println("\nExample commands:");
   Serial.println("  Turn on:    {\"on\": true, \"color\": \"blue\"}");
   Serial.println("  Turn off:   {\"on\": false}");
   Serial.println("  Blink 5s:   {\"color\": \"red\", \"blink\": 5}");
   Serial.println("  Red 3 sec:  {\"color\": \"red\", \"duration\": 3}");
   Serial.println("  Brightness: {\"brightness\": 50}");
   Serial.println("  Pulse:      {\"color\": \"purple\", \"pulse\": 10}");
   Serial.println("");
 }
 
 void disconnectWiFi() {
   Serial.println("\n--- Disconnecting WiFi ---");
   server.stop();
   WiFi.disconnect();
   Serial.println("✓ Disconnected");
 }
 
 // ============================================
 // ===== SETUP & LOOP =========================
 // ============================================
 
 void setup() {
   Serial.begin(115200);
   delay(100);
   
   Serial.println("\n\n");
   Serial.println("╔═══════════════════════════════════════╗");
   Serial.println("║                                       ║");
   Serial.println("║   SMART LIGHT CONTROLLER v1.0         ║");
   Serial.println("║   with MCP Server Integration         ║");
   Serial.println("║                                       ║");
   Serial.println("╚═══════════════════════════════════════╝");
   
   // Initialize pins
   pinMode(LED_RED, OUTPUT);
   pinMode(LED_GREEN, OUTPUT);
   pinMode(LED_BLUE, OUTPUT);
   pinMode(BTN_PIN, INPUT_PULLUP);
   
   // Initialize WiFi
   WiFi.mode(WIFI_STA);
   WiFi.disconnect();
   
   // Start OFF
   setOff();
   
   Serial.println("\nState: OFF");
   Serial.println("Press button to start...\n");
 }
 
 void loop() {
   // Handle HTTP requests when connected
   if (currentState == STATE_READY) {
     server.handleClient();
     processEffects();
   }
   
   // Button handling
   bool buttonState = digitalRead(BTN_PIN);
   bool buttonPressed = (lastButtonState == HIGH && buttonState == LOW);
   
   if (buttonPressed) {
     delay(50);  // Debounce
     Serial.println("\n[BUTTON PRESSED]");
   }
   
   // State machine
   switch (currentState) {
     
     case STATE_OFF:
       setOff();
       if (buttonPressed) {
         currentState = STATE_CONNECTING;
         stateStartTime = millis();
         
         if (connectWiFi()) {
           startServer();
           currentState = STATE_READY;
           
           // Set to green (ready)
           parseColor("green");
           lightState.on = true;
           applyLightState();
         } else {
           // Failed - show red briefly
           setRGB(255, 0, 0);
           delay(2000);
           currentState = STATE_OFF;
           setOff();
           Serial.println("\nState: OFF (Connection failed)");
         }
       }
       break;
     
     case STATE_READY:
       // LED controlled by MCP or effects
       if (buttonPressed) {
         currentState = STATE_DISCONNECTING;
         stateStartTime = millis();
         disconnectWiFi();
         effect.active = false;
         effect.tempActive = false;
       }
       break;
     
     case STATE_DISCONNECTING:
       blinkConnecting();  // Orange blink
       if (millis() - stateStartTime > 2000) {
         currentState = STATE_OFF;
         setOff();
         lightState.on = false;
         Serial.println("\nState: OFF");
         Serial.println("Press button to start...");
       }
       break;
   }
   
   lastButtonState = buttonState;
   delay(10);
 }
 