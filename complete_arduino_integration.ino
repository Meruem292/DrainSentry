#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <HardwareSerial.h>
#include <HX711.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// Network credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// DrainSentry server endpoint - REPLACE WITH YOUR REPLIT APP URL
const char* serverUrl = "https://your-replit-app.replit.app/api/sensor-data";

// Device identifier (must match what's in user's account)
const char* deviceId = "DS-001";

// Pins for sensors
#define SENSOR1_RX 18
#define SENSOR1_TX 19
#define SENSOR2_RX 16
#define SENSOR2_TX 17

#define GSM_TX 26
#define GSM_RX 27

#define LOADCELL_DOUT 33
#define LOADCELL_SCK 32

// Default thresholds (these will be updated from server response)
float WATER_LEVEL_THRESHOLD = 80.0; // in percentage (lower distance = higher water level)
float BIN_FULLNESS_THRESHOLD = 80.0; // in percentage
float WEIGHT_THRESHOLD = 80.0;  // in kg

// Maximum height for calculating water level percentage (adjust based on your sensor position)
const float WATER_MAX_HEIGHT = 100.0; // cm

// Array to store contact numbers retrieved from server
String contactNumbers[5];
int numContacts = 0;
bool notificationsEnabled = false;
bool notifyOnWaterLevel = true;
bool notifyOnBinFullness = true;
bool notifyOnWeight = true;

HX711 scale;

// Timing variables
const unsigned long sensorReadInterval = 2000;      // Read sensors every 2 seconds
const unsigned long serverUpdateInterval = 30000;   // Update server every 30 seconds
unsigned long lastSensorReadTime = 0;
unsigned long lastServerUpdateTime = 0;

HardwareSerial sensor1(2);    // UART2
HardwareSerial sensor2(1);    // UART1
HardwareSerial gsmSerial(0);  // UART0 (default)

LiquidCrystal_I2C lcd(0x27, 16, 2);

float lastDist1 = -1;
float lastDist2 = -1;
float lastWeight = -1;

// Variables to store current values for server updates
float currentWaterLevel = 0;
float currentBinFullness = 0;
float currentWeight = 0;

void setup() {
  Serial.begin(115200);
  sensor1.begin(9600, SERIAL_8N1, SENSOR1_RX, SENSOR1_TX);
  sensor2.begin(9600, SERIAL_8N1, SENSOR2_RX, SENSOR2_TX);
  gsmSerial.begin(9600, SERIAL_8N1, GSM_TX, GSM_RX);

  lcd.init();
  lcd.backlight();

  Serial.println("DrainSentry system starting...");
  lcd.setCursor(0, 0);
  lcd.print("DrainSentry");
  lcd.setCursor(0, 1);
  lcd.print("Starting...");
  delay(1000);

  // Initialize GSM
  sendATCommand("AT");
  sendATCommand("AT+CMGF=1");  // SMS text mode

  // Initialize load cell
  scale.begin(LOADCELL_DOUT, LOADCELL_SCK);
  scale.set_scale(420.0f);  // This value is obtained by calibration
  scale.tare();             // Reset the scale to 0
  Serial.println("Load cell initialized");

  // Connect to WiFi
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  
  int wifiAttempts = 0;
  while (WiFi.status() != WL_CONNECTED && wifiAttempts < 20) {
    delay(500);
    Serial.print(".");
    wifiAttempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi connected");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
    
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("WiFi Connected");
    lcd.setCursor(0, 1);
    lcd.print(WiFi.localIP());
    delay(2000);
    
    // Get initial configuration from server
    updateServerAndGetConfig();
  } else {
    Serial.println("\nWiFi connection failed");
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("WiFi Failed");
    lcd.setCursor(0, 1);
    lcd.print("Using defaults");
    delay(2000);
  }
  
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("DrainSentry");
  lcd.setCursor(0, 1);
  lcd.print("ID: ");
  lcd.print(deviceId);
  delay(2000);
}

void loop() {
  unsigned long currentTime = millis();

  // Read sensors at regular intervals
  if (currentTime - lastSensorReadTime >= sensorReadInterval) {
    lastSensorReadTime = currentTime;
    readSensors();
    updateLCD();
    checkThresholds();
  }

  // Update server at regular intervals
  if (currentTime - lastServerUpdateTime >= serverUpdateInterval) {
    lastServerUpdateTime = currentTime;
    updateServerAndGetConfig();
  }
}

void readSensors() {
  // Read water level sensor 1
  flushSerial(sensor1);
  delay(50);
  lastDist1 = readA02Distance(sensor1);
  
  // Convert distance to water level percentage (lower distance = higher water level)
  if (lastDist1 > 0 && lastDist1 <= WATER_MAX_HEIGHT) {
    // Calculate water level as percentage (100% when distance is 0, 0% when distance is MAX_HEIGHT)
    currentWaterLevel = 100 * (1 - (lastDist1 / WATER_MAX_HEIGHT));
  }
  
  Serial.print("Water Level: ");
  Serial.print(currentWaterLevel);
  Serial.println("%");

  // Read bin fullness sensor
  flushSerial(sensor2);
  delay(50);
  lastDist2 = readA02Distance(sensor2);
  
  // Convert distance to bin fullness percentage (lower distance = more full)
  if (lastDist2 > 0 && lastDist2 <= WATER_MAX_HEIGHT) {
    // Calculate bin fullness as percentage (100% when distance is 0, 0% when distance is MAX_HEIGHT)
    currentBinFullness = 100 * (1 - (lastDist2 / WATER_MAX_HEIGHT));
  }
  
  Serial.print("Bin Fullness: ");
  Serial.print(currentBinFullness);
  Serial.println("%");

  // Read weight sensor
  if (scale.is_ready()) {
    currentWeight = scale.get_units();
    Serial.print("Weight: ");
    Serial.print(currentWeight);
    Serial.println(" kg");
  } else {
    Serial.println("HX711 not ready");
  }
}

void updateLCD() {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("W:");
  lcd.print(currentWaterLevel, 1);
  lcd.print("% B:");
  lcd.print(currentBinFullness, 1);
  lcd.print("%");
  
  lcd.setCursor(0, 1);
  lcd.print("Weight: ");
  lcd.print(currentWeight, 1);
  lcd.print("kg");
}

void checkThresholds() {
  // Check if any threshold is exceeded and send SMS if notifications are enabled
  if (!notificationsEnabled || numContacts == 0) {
    return; // No need to check if notifications are disabled or no contacts
  }
  
  // Check water level threshold
  if (notifyOnWaterLevel && currentWaterLevel >= WATER_LEVEL_THRESHOLD) {
    String message = "ALERT: DrainSentry [" + String(deviceId) + "] - Water level at " + String(currentWaterLevel, 1) + "% (threshold: " + String(WATER_LEVEL_THRESHOLD) + "%)";
    sendNotifications(message);
  }
  
  // Check bin fullness threshold
  if (notifyOnBinFullness && currentBinFullness >= BIN_FULLNESS_THRESHOLD) {
    String message = "ALERT: DrainSentry [" + String(deviceId) + "] - Bin fullness at " + String(currentBinFullness, 1) + "% (threshold: " + String(BIN_FULLNESS_THRESHOLD) + "%)";
    sendNotifications(message);
  }
  
  // Check weight threshold
  if (notifyOnWeight && currentWeight >= WEIGHT_THRESHOLD) {
    String message = "ALERT: DrainSentry [" + String(deviceId) + "] - Bin weight at " + String(currentWeight, 1) + "kg (threshold: " + String(WEIGHT_THRESHOLD) + "kg)";
    sendNotifications(message);
  }
}

void sendNotifications(String message) {
  Serial.println("Sending notifications: " + message);
  
  // Send to all contacts
  for (int i = 0; i < numContacts; i++) {
    if (contactNumbers[i].length() > 0) {
      sendSMS(contactNumbers[i].c_str(), message.c_str());
    }
  }
}

void updateServerAndGetConfig() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected. Cannot update server.");
    return;
  }
  
  HTTPClient http;
  
  Serial.println("Sending data to server...");
  http.begin(serverUrl);
  http.addHeader("Content-Type", "application/json");
  
  // Create JSON document
  DynamicJsonDocument doc(1024);
  doc["deviceId"] = deviceId;
  doc["waterLevel"] = currentWaterLevel;
  doc["binFullness"] = currentBinFullness;
  doc["binWeight"] = currentWeight;
  doc["timestamp"] = String(millis()); // Just a placeholder timestamp
  
  String requestBody;
  serializeJson(doc, requestBody);
  
  int httpResponseCode = http.POST(requestBody);
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.println("HTTP Response code: " + String(httpResponseCode));
    Serial.println("Response: " + response);
    
    // Parse the response to get configuration
    DynamicJsonDocument responseDoc(1024);
    DeserializationError error = deserializeJson(responseDoc, response);
    
    if (!error && responseDoc["success"]) {
      // Update thresholds
      if (responseDoc.containsKey("thresholds")) {
        WATER_LEVEL_THRESHOLD = responseDoc["thresholds"]["waterLevel"] | 80.0f;
        BIN_FULLNESS_THRESHOLD = responseDoc["thresholds"]["binFullness"] | 80.0f;
        WEIGHT_THRESHOLD = responseDoc["thresholds"]["wasteWeight"] | 80.0f;
        
        Serial.println("Updated thresholds from server:");
        Serial.println("Water Level: " + String(WATER_LEVEL_THRESHOLD) + "%");
        Serial.println("Bin Fullness: " + String(BIN_FULLNESS_THRESHOLD) + "%");
        Serial.println("Weight: " + String(WEIGHT_THRESHOLD) + "kg");
      }
      
      // Update notification settings
      if (responseDoc.containsKey("notifications")) {
        notificationsEnabled = responseDoc["notifications"]["enabled"] | false;
        notifyOnWaterLevel = responseDoc["notifications"]["notifyOnWaterLevel"] | true;
        notifyOnBinFullness = responseDoc["notifications"]["notifyOnBinFullness"] | true;
        notifyOnWeight = responseDoc["notifications"]["notifyOnWeight"] | true;
        
        // Clear contacts array
        numContacts = 0;
        
        // Get notification contacts if available
        if (responseDoc["notifications"].containsKey("notifyContacts")) {
          JsonArray contactsArray = responseDoc["notifications"]["notifyContacts"];
          int i = 0;
          
          for (JsonVariant contact : contactsArray) {
            if (i < 5) { // Limit to 5 contacts
              contactNumbers[i] = contact.as<String>();
              numContacts++;
              i++;
            }
          }
          
          Serial.println("Updated notification settings:");
          Serial.println("Notifications enabled: " + String(notificationsEnabled ? "Yes" : "No"));
          Serial.println("Number of contacts: " + String(numContacts));
        }
      }
    }
  }
  else {
    Serial.print("Error on HTTP request: ");
    Serial.println(httpResponseCode);
  }
  
  http.end();
}

// Flush serial buffer to clear old data
void flushSerial(HardwareSerial& serial) {
  while (serial.available()) {
    serial.read();
  }
}

// Read distance from A02-21AU sensor robustly
float readA02Distance(HardwareSerial& serial) {
  unsigned char data[4];
  unsigned long start = millis();

  while (millis() - start < 150) {  // Slightly longer timeout
    if (serial.available() >= 4) {
      for (int i = 0; i < 4; i++) {
        data[i] = serial.read();
      }
      if (data[0] == 0xFF) {
        int sum = (data[0] + data[1] + data[2]) & 0xFF;
        if (sum == data[3]) {
          return ((data[1] << 8) + data[2]) / 10.0;
        }
      }
    }
  }
  return -1.0;  // Error or no valid data
}

void sendATCommand(const char* cmd) {
  gsmSerial.println(cmd);
  delay(500);
  while (gsmSerial.available()) {
    Serial.write(gsmSerial.read());
  }
}

void sendSMS(const char* phoneNumber, const char* message) {
  Serial.print("Sending SMS to ");
  Serial.println(phoneNumber);

  gsmSerial.println("AT+CMGF=1");
  delay(500);

  gsmSerial.print("AT+CMGS=\"");
  gsmSerial.print(phoneNumber);
  gsmSerial.println("\"");
  delay(500);

  gsmSerial.print(message);
  delay(500);

  gsmSerial.write(26);  // Ctrl+Z to send SMS
  delay(5000);

  Serial.println("SMS sent.");
}