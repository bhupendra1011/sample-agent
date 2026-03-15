/*
  Hello Blink — NodeMCU built-in LED

  The NodeMCU has a built-in LED on pin D4 (GPIO2).
  Note: It's active LOW — LOW = ON, HIGH = OFF.

  Upload this first to verify your setup works.
*/

#define LED_PIN D4  // Built-in LED on NodeMCU

void setup() {
  Serial.begin(115200);
  Serial.println("\nHello Blink — NodeMCU LED test");

  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, HIGH);  // Start OFF (active low)
}

void loop() {
  digitalWrite(LED_PIN, LOW);   // ON
  Serial.println("LED ON");
  delay(500);

  digitalWrite(LED_PIN, HIGH);  // OFF
  Serial.println("LED OFF");
  delay(500);
}
