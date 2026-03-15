/*
 * Smart Light Controller with WiFi
 * States: OFF → CONNECTING → READY → DISCONNECTING → OFF
 */

 #include <ESP8266WiFi.h>

 // ===== CHANGE THESE =====
 const char* WIFI_SSID = "YOUR_WIFI_NAME";
 const char* WIFI_PASS = "YOUR_WIFI_PASSWORD";
 // ========================
 
 // FIXED: Red and Blue swapped
 #define LED_RED    D8
 #define LED_GREEN  D7
 #define LED_BLUE   D6
 #define BTN_PIN    D3
 
 enum State {
   STATE_OFF,
   STATE_CONNECTING,
   STATE_READY,
   STATE_DISCONNECTING
 };
 
 State currentState = STATE_OFF;
 bool lastButtonState = HIGH;
 unsigned long stateStartTime = 0;
 unsigned long lastBlinkTime = 0;
 bool blinkOn = false;
 
 // LED Colors
 void setOff() {
   digitalWrite(LED_RED, LOW);
   digitalWrite(LED_GREEN, LOW);
   digitalWrite(LED_BLUE, LOW);
 }
 
 void setGreen() {
   digitalWrite(LED_RED, LOW);
   digitalWrite(LED_GREEN, HIGH);
   digitalWrite(LED_BLUE, LOW);
 }
 
 void setOrange() {
   digitalWrite(LED_RED, HIGH);
   digitalWrite(LED_GREEN, HIGH);
   digitalWrite(LED_BLUE, LOW);
 }
 
 void setRed() {
   digitalWrite(LED_RED, HIGH);
   digitalWrite(LED_GREEN, LOW);
   digitalWrite(LED_BLUE, LOW);
 }
 
 void blinkOrange() {
   if (millis() - lastBlinkTime > 300) {
     blinkOn = !blinkOn;
     if (blinkOn) {
       setOrange();
     } else {
       setOff();
     }
     lastBlinkTime = millis();
   }
 }
 
 // WiFi Functions
 bool connectWiFi() {
   Serial.println("\n--- Connecting to WiFi ---");
   Serial.print("SSID: ");
   Serial.println(WIFI_SSID);
   
   WiFi.begin(WIFI_SSID, WIFI_PASS);
   
   int attempts = 0;
   while (WiFi.status() != WL_CONNECTED && attempts < 30) {
     blinkOrange();
     delay(500);
     Serial.print(".");
     attempts++;
   }
   
   if (WiFi.status() == WL_CONNECTED) {
     Serial.println("\n✓ WiFi Connected!");
     Serial.print("IP Address: ");
     Serial.println(WiFi.localIP());
     Serial.print("Signal Strength (RSSI): ");
     Serial.print(WiFi.RSSI());
     Serial.println(" dBm");
     return true;
   } else {
     Serial.println("\n✗ WiFi Connection Failed!");
     return false;
   }
 }
 
 void disconnectWiFi() {
   Serial.println("\n--- Disconnecting WiFi ---");
   WiFi.disconnect();
   Serial.println("✓ WiFi Disconnected");
 }
 
 void setup() {
   Serial.begin(115200);
   Serial.println("\n\n=============================");
   Serial.println("  Smart Light Controller");
   Serial.println("=============================");
   
   pinMode(LED_RED, OUTPUT);
   pinMode(LED_GREEN, OUTPUT);
   pinMode(LED_BLUE, OUTPUT);
   pinMode(BTN_PIN, INPUT_PULLUP);
   
   // Start OFF
   WiFi.mode(WIFI_STA);
   WiFi.disconnect();
   setOff();
   
   Serial.println("State: OFF");
   Serial.println("Press button to start...");
 }
 
 void loop() {
   bool buttonState = digitalRead(BTN_PIN);
   bool buttonPressed = (lastButtonState == HIGH && buttonState == LOW);
   
   if (buttonPressed) {
     delay(50);  // Debounce
   }
   
   switch (currentState) {
     
     case STATE_OFF:
       setOff();
       if (buttonPressed) {
         currentState = STATE_CONNECTING;
         stateStartTime = millis();
         Serial.println("\nState: CONNECTING");
         
         // Start WiFi connection
         if (connectWiFi()) {
           currentState = STATE_READY;
           setGreen();
           Serial.println("\nState: READY (Green LED)");
           Serial.println("Ready to receive MCP commands!");
         } else {
           // Connection failed - go back to OFF
           setRed();
           delay(2000);
           currentState = STATE_OFF;
           setOff();
           Serial.println("\nState: OFF (Connection failed)");
         }
       }
       break;
     
     case STATE_CONNECTING:
       // This state is handled in connectWiFi() blocking call
       blinkOrange();
       break;
     
     case STATE_READY:
       setGreen();
       if (buttonPressed) {
         currentState = STATE_DISCONNECTING;
         stateStartTime = millis();
         Serial.println("\nState: DISCONNECTING");
         disconnectWiFi();
       }
       break;
     
     case STATE_DISCONNECTING:
       blinkOrange();
       if (millis() - stateStartTime > 2000) {
         currentState = STATE_OFF;
         setOff();
         Serial.println("\nState: OFF");
         Serial.println("Press button to start...");
       }
       break;
   }
   
   lastButtonState = buttonState;
   delay(10);
 }