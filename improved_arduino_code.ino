#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <HardwareSerial.h>
#include "HX711.h"
#include <WiFi.h>
#include <HTTPClient.h>
#include <NTPClient.h>
#include <WiFiUdp.h>
#include <ArduinoJson.h>

// WiFi credentials
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// Firebase configuration 
const char* FIREBASE_URL = "drainsentry-default-rtdb.firebaseio.com";
const String USER_ID = "YOUR_USER_ID"; // Replace with your Firebase user ID
const String DEVICE_CONTAINER_ID = "device1"; // The ID used in Firebase

// Sensor pins
#define SENSOR1_RX 18  // Water level sensor
#define SENSOR1_TX 19
#define SENSOR2_RX 16  // Bin fullness sensor
#define SENSOR2_TX 17

#define GSM_TX 26
#define GSM_RX 27

#define LOADCELL_DOUT 33
#define LOADCELL_SCK 32
#define WEIGHT_THRESHOLD 2.0  // in kg

// Alert thresholds (these could be updated via Firebase)
#define WATER_LEVEL_THRESHOLD 80  // Water level above 80% triggers alert
#define BIN_FULLNESS_THRESHOLD 80 // Bin fullness above 80% triggers alert

HX711 scale;

// Timing settings
const unsigned long sensorReadInterval = 10000;  // Read sensors every 10 seconds
const unsigned long firebaseUpdateInterval = 60000; // Update Firebase every minute 
unsigned long lastSensorReadTime = 0;
unsigned long lastFirebaseUpdateTime = 0;

// NTP for time synchronization
WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, "pool.ntp.org");

// Setup serial communications
HardwareSerial sensor1(2);    // UART2 - Water level sensor
HardwareSerial sensor2(1);    // UART1 - Bin fullness sensor
HardwareSerial gsmSerial(0);  // UART0 - GSM module

// LCD Display 
LiquidCrystal_I2C lcd(0x27, 16, 2);

// Variables to store sensor readings
float waterDistance = -1;     // Raw distance from water sensor
int waterLevel = 0;           // Converted water level percentage
float binDistance = -1;       // Raw distance from bin sensor
int binFullness = 0;          // Converted bin fullness percentage
float binWeight = 0;          // Weight from load cell

// Phone number for SMS alerts (could be stored in Firebase)
const char* emergencyPhone = "09815409364";

void setup() {
  // Initialize serial communications
  Serial.begin(115200);
  sensor1.begin(9600, SERIAL_8N1, SENSOR1_RX, SENSOR1_TX);
  sensor2.begin(9600, SERIAL_8N1, SENSOR2_RX, SENSOR2_TX);
  gsmSerial.begin(9600, SERIAL_8N1, GSM_TX, GSM_RX);

  // Initialize LCD display
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("DrainSentry");
  lcd.setCursor(0, 1);
  lcd.print("Initializing...");
  
  // Initialize weight sensor
  scale.begin(LOADCELL_DOUT, LOADCELL_SCK);
  scale.set_scale(420.0983); // This value needs to be calibrated for your specific load cell
  scale.tare();              // Reset the scale to 0
  
  // Initialize GSM module
  initGSM();
  
  // Connect to WiFi
  connectWiFi();
  
  // Initialize time client
  timeClient.begin();
  timeClient.setTimeOffset(28800); // +8 hours (28800 seconds) for PHT (Philippine Time)
  
  Serial.println("Setup complete!");
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("System Ready");
}

void loop() {
  unsigned long currentMillis = millis();
  
  // Read sensors at regular intervals
  if (currentMillis - lastSensorReadTime >= sensorReadInterval) {
    lastSensorReadTime = currentMillis;
    readSensors();
    updateLCD();
    checkAlerts();
  }
  
  // Update Firebase at regular intervals
  if (currentMillis - lastFirebaseUpdateTime >= firebaseUpdateInterval) {
    lastFirebaseUpdateTime = currentMillis;
    updateFirebase();
    updateTime(); // Update NTP time
  }
  
  // Process any incoming GSM messages
  while (gsmSerial.available()) {
    String response = gsmSerial.readStringUntil('\n');
    Serial.println("GSM: " + response);
  }
}

void readSensors() {
  // Read water level sensor
  flushSerial(sensor1);
  delay(50);
  waterDistance = readA02Distance(sensor1);
  
  // Convert distance to water level percentage (assuming max water height is 100cm)
  // When distance is small, water level is high
  if (waterDistance > 0 && waterDistance <= 100) {
    waterLevel = map(waterDistance, 100, 0, 0, 100);
    waterLevel = constrain(waterLevel, 0, 100);
  }
  
  Serial.print("Water Level: ");
  Serial.print(waterLevel);
  Serial.println("%");
  
  // Read bin fullness sensor
  flushSerial(sensor2);
  delay(50);
  binDistance = readA02Distance(sensor2);
  
  // Convert distance to bin fullness percentage (assuming bin height is 50cm)
  // When distance is small, bin is more full
  if (binDistance > 0 && binDistance <= 50) {
    binFullness = map(binDistance, 50, 0, 0, 100);
    binFullness = constrain(binFullness, 0, 100);
  }
  
  Serial.print("Bin Fullness: ");
  Serial.print(binFullness);
  Serial.println("%");
  
  // Read weight sensor
  if (scale.is_ready()) {
    binWeight = scale.get_units(10); // Average of 10 readings for stability
    binWeight = max(0, binWeight);   // Ensure weight is not negative
    
    Serial.print("Bin Weight: ");
    Serial.print(binWeight);
    Serial.println(" kg");
  } else {
    Serial.println("HX711 not ready");
  }
}

void updateLCD() {
  lcd.clear();
  
  // First row: Water level and time
  lcd.setCursor(0, 0);
  lcd.print("WL:");
  lcd.print(waterLevel);
  lcd.print("%");
  
  // Get current time for display
  if (WiFi.status() == WL_CONNECTED) {
    timeClient.update();
    String timeStr = String(timeClient.getHours()) + ":" + 
                    (timeClient.getMinutes() < 10 ? "0" : "") + 
                    String(timeClient.getMinutes());
    
    lcd.setCursor(9, 0);
    lcd.print(timeStr);
  }
  
  // Second row: Bin fullness and weight
  lcd.setCursor(0, 1);
  lcd.print("BF:");
  lcd.print(binFullness);
  lcd.print("%");
  
  lcd.setCursor(8, 1);
  lcd.print("W:");
  lcd.print(binWeight, 1);
  lcd.print("kg");
}

void checkAlerts() {
  // Check water level alert
  if (waterLevel >= WATER_LEVEL_THRESHOLD) {
    String message = "ALERT: Water level at " + String(waterLevel) + "% (Main Street Junction)";
    sendSMS(emergencyPhone, message);
  }
  
  // Check bin fullness alert
  if (binFullness >= BIN_FULLNESS_THRESHOLD) {
    String message = "ALERT: Waste bin " + String(binFullness) + "% full (Main Street Junction)";
    sendSMS(emergencyPhone, message);
  }
  
  // Check bin weight alert
  if (binWeight >= WEIGHT_THRESHOLD) {
    String message = "ALERT: Waste bin weight " + String(binWeight) + "kg (Main Street Junction)";
    sendSMS(emergencyPhone, message);
  }
}

void updateFirebase() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected. Reconnecting...");
    connectWiFi();
    if (WiFi.status() != WL_CONNECTED) {
      return; // Skip Firebase update if reconnection fails
    }
  }
  
  // Update time
  timeClient.update();
  String timestamp = getFormattedTimestamp();
  String dateStr = getFormattedDate();
  
  // Update water level data
  updateWaterLevel(timestamp);
  
  // Update waste bin data
  updateWasteBin(timestamp);
  
  // Update device status (to show as "active")
  updateDeviceStatus(timestamp);
  
  // Save historical data (for charts and trends)
  saveWaterLevelHistory(dateStr);
  saveWasteBinHistory(dateStr);
  
  Serial.println("Firebase update complete");
}

void updateWaterLevel(const String& timestamp) {
  HTTPClient http;
  String url = "https://" + String(FIREBASE_URL) + "/users/" + USER_ID + "/waterLevels/" + DEVICE_CONTAINER_ID + ".json";
  
  // Create JSON payload
  StaticJsonDocument<256> doc;
  doc["id"] = "WL-001";
  doc["location"] = "Main Street Junction";
  doc["level"] = waterLevel;
  doc["lastUpdated"] = timestamp;
  
  String payload;
  serializeJson(doc, payload);
  
  // Send PUT request to Firebase
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  
  int httpCode = http.PUT(payload);
  if (httpCode > 0) {
    String response = http.getString();
    Serial.println("Water level updated: " + response);
  } else {
    Serial.println("Water level update failed: " + http.errorToString(httpCode));
  }
  
  http.end();
}

void updateWasteBin(const String& timestamp) {
  HTTPClient http;
  String url = "https://" + String(FIREBASE_URL) + "/users/" + USER_ID + "/wasteBins/" + DEVICE_CONTAINER_ID + ".json";
  
  // Create JSON payload
  StaticJsonDocument<256> doc;
  doc["id"] = "WL-001";
  doc["location"] = "Main Street Junction";
  doc["fullness"] = binFullness;
  doc["weight"] = binWeight;
  doc["lastEmptied"] = "Never"; // This would be updated when bin is emptied
  
  String payload;
  serializeJson(doc, payload);
  
  // Send PUT request to Firebase
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  
  int httpCode = http.PUT(payload);
  if (httpCode > 0) {
    String response = http.getString();
    Serial.println("Waste bin updated: " + response);
  } else {
    Serial.println("Waste bin update failed: " + http.errorToString(httpCode));
  }
  
  http.end();
}

void updateDeviceStatus(const String& timestamp) {
  HTTPClient http;
  String url = "https://" + String(FIREBASE_URL) + "/users/" + USER_ID + "/devices/" + DEVICE_CONTAINER_ID + ".json";
  
  // Create JSON payload - only update status and lastSeen
  // (Other device properties maintained in Firebase)
  String payload = "{\"status\":\"active\",\"lastSeen\":\"" + timestamp + "\"}";
  
  // Send PATCH request to update only these fields
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  
  int httpCode = http.PATCH(payload);
  if (httpCode > 0) {
    String response = http.getString();
    Serial.println("Device status updated: " + response);
  } else {
    Serial.println("Device status update failed: " + http.errorToString(httpCode));
  }
  
  http.end();
}

void saveWaterLevelHistory(const String& dateStr) {
  HTTPClient http;
  String url = "https://" + String(FIREBASE_URL) + "/users/" + USER_ID + "/waterLevelHistory/" + dateStr + "/" + DEVICE_CONTAINER_ID + ".json";
  
  // For water level history, just store the level value
  String payload = String(waterLevel);
  
  // Send PUT request to Firebase
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  
  int httpCode = http.PUT(payload);
  if (httpCode > 0) {
    String response = http.getString();
    Serial.println("Water level history saved: " + response);
  } else {
    Serial.println("Water level history save failed: " + http.errorToString(httpCode));
  }
  
  http.end();
}

void saveWasteBinHistory(const String& dateStr) {
  HTTPClient http;
  String url = "https://" + String(FIREBASE_URL) + "/users/" + USER_ID + "/wasteBinHistory/" + dateStr + "/" + DEVICE_CONTAINER_ID + ".json";
  
  // Create JSON payload for waste bin history
  String payload = "{\"fullness\":" + String(binFullness) + ",\"weight\":" + String(binWeight) + "}";
  
  // Send PUT request to Firebase
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  
  int httpCode = http.PUT(payload);
  if (httpCode > 0) {
    String response = http.getString();
    Serial.println("Waste bin history saved: " + response);
  } else {
    Serial.println("Waste bin history save failed: " + http.errorToString(httpCode));
  }
  
  http.end();
}

void connectWiFi() {
  Serial.println("Connecting to WiFi...");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Connecting WiFi");
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    lcd.setCursor(attempts % 16, 1);
    lcd.print(".");
    attempts++;
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
  } else {
    Serial.println("\nWiFi connection failed");
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("WiFi Failed");
    delay(2000);
  }
}

void initGSM() {
  Serial.println("Initializing GSM module...");
  
  sendATCommand("AT");        // Test AT command
  sendATCommand("AT+CMGF=1"); // Set SMS to text mode
  
  // Configure SMS settings
  sendATCommand("AT+CNMI=1,2,0,0,0"); // New message indications
  
  Serial.println("GSM module initialized");
}

void updateTime() {
  if (WiFi.status() == WL_CONNECTED) {
    timeClient.update();
    Serial.print("Current time: ");
    Serial.println(getFormattedTimestamp());
  }
}

// Get current time in human-readable format
String getFormattedTimestamp() {
  timeClient.update();
  time_t epochTime = timeClient.getEpochTime();
  struct tm *ptm = gmtime((time_t *)&epochTime);
  
  char buffer[32];
  sprintf(buffer, "%02d/%02d/%04d, %02d:%02d:%02d",
          ptm->tm_mon + 1, ptm->tm_mday, ptm->tm_year + 1900,
          ptm->tm_hour, ptm->tm_min, ptm->tm_sec);
  
  return String(buffer);
}

// Get current date in YYYY-MM-DD format for history
String getFormattedDate() {
  timeClient.update();
  time_t epochTime = timeClient.getEpochTime();
  struct tm *ptm = gmtime((time_t *)&epochTime);
  
  char buffer[11];
  sprintf(buffer, "%04d-%02d-%02d", 
          ptm->tm_year + 1900, ptm->tm_mon + 1, ptm->tm_mday);
  
  return String(buffer);
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

void sendSMS(const char* phoneNumber, const String& message) {
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