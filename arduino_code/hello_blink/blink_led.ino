/*
 * Smart Light Controller - FIXED PINS
 * States: OFF → CONNECTING → READY → DISCONNECTING → OFF
 */

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
  // Orange = Red + Green
  digitalWrite(LED_RED, HIGH);
  digitalWrite(LED_GREEN, HIGH);
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

void setup() {
  Serial.begin(115200);
  Serial.println("\n=== Smart Light Controller ===");
  
  pinMode(LED_RED, OUTPUT);
  pinMode(LED_GREEN, OUTPUT);
  pinMode(LED_BLUE, OUTPUT);
  pinMode(BTN_PIN, INPUT_PULLUP);
  
  setOff();
  Serial.println("State: OFF");
}

void loop() {
  bool buttonState = digitalRead(BTN_PIN);
  bool buttonPressed = (lastButtonState == HIGH && buttonState == LOW);
  
  if (buttonPressed) {
    delay(50);
  }
  
  switch (currentState) {
    
    case STATE_OFF:
      setOff();
      if (buttonPressed) {
        currentState = STATE_CONNECTING;
        stateStartTime = millis();
        Serial.println("State: CONNECTING (orange blink)");
      }
      break;
    
    case STATE_CONNECTING:
      blinkOrange();
      if (millis() - stateStartTime > 15000) {
        currentState = STATE_READY;
        Serial.println("State: READY (green)");
      }
      break;
    
    case STATE_READY:
      setGreen();
      if (buttonPressed) {
        currentState = STATE_DISCONNECTING;
        stateStartTime = millis();
        Serial.println("State: DISCONNECTING (orange blink)");
      }
      break;
    
    case STATE_DISCONNECTING:
      blinkOrange();
      if (millis() - stateStartTime > 2000) {
        currentState = STATE_OFF;
        Serial.println("State: OFF");
      }
      break;
  }
  
  lastButtonState = buttonState;
  delay(10);
}