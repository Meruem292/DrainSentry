#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <HardwareSerial.h>
#include "HX711.h"
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <time.h>

// Device configuration
#define DEVICE_ID "WL-001"

// Hardware pins
#define SENSOR1_RX 18
#define SENSOR1_TX 19
#define SENSOR2_RX 16
#define SENSOR2_TX 17
#define GSM_TX 26
#define GSM_RX 27
#define LOADCELL_DOUT 33
#define LOADCELL_SCK 32

// Network configuration
const char* ssid = "YourWiFiSSID";     // Replace with your WiFi SSID
const char* password = "YourPassword";  // Replace with your WiFi password

// Firebase config - use your Firebase project's URL
const String firebaseURL = "https://your-firebase-project-id-default-rtdb.firebaseio.com";
const String userID = "5crasIlN8rd78y9j7nY9ukj61SH2"; // The user ID from your database

// Device configuration from Firebase
float waterLevelThreshold = 80.0;  // Default, will be updated from Firebase
float binFullnessThreshold = 80.0;  // Default, will be updated from Firebase
float wasteWeightThreshold = 14.0;  // Default, will be updated from Firebase
bool notificationsEnabled = true;   // Default, will be updated from Firebase
bool notifyOnWaterLevel = true;     // Default, will be updated from Firebase
bool notifyOnBinFullness = true;    // Default, will be updated from Firebase
bool notifyOnWeight = true;         // Default, will be updated from Firebase
String contactNumbers[5];           // Array to store contact numbers
int numContacts = 0;                // Number of contacts

// Timing variables
const unsigned long sensorReadInterval = 2000;         // Read sensors every 2 seconds
const unsigned long configFetchInterval = 300000;      // Fetch config every 5 minutes
const unsigned long dataSendInterval = 60000;          // Send data every 1 minute
unsigned long lastSensorReadTime = 0;
unsigned long lastConfigFetchTime = 0;
unsigned long lastDataSendTime = 0;

// Sensor variables
HX711 scale;
float lastDist1 = -1;
float lastDist2 = -1;
float lastWeight = 0;
int binFullness = 0;  // Calculated based on distance sensor 2 (0-100%)

// Serial interfaces
HardwareSerial sensor1(2);    // UART2
HardwareSerial sensor2(1);    // UART1
HardwareSerial gsmSerial(0);  // UART0 (default)

// LCD display
LiquidCrystal_I2C lcd(0x27, 16, 2);

void setup() {
  Serial.begin(115200);
  sensor1.begin(9600, SERIAL_8N1, SENSOR1_RX, SENSOR1_TX);
  sensor2.begin(9600, SERIAL_8N1, SENSOR2_RX, SENSOR2_TX);
  gsmSerial.begin(9600, SERIAL_8N1, GSM_TX, GSM_RX);

  lcd.init();
  lcd.backlight();

  lcd.setCursor(0, 0);
  lcd.print("DrainSentry");
  lcd.setCursor(0, 1);
  lcd.print("Starting...");
  delay(1000);

  // Initialize GSM module
  Serial.println("Initializing GSM module...");
  sendATCommand("AT");
  sendATCommand("AT+CMGF=1");  // SMS text mode
  
  // Initialize load cell
  scale.begin(LOADCELL_DOUT, LOADCELL_SCK);
  scale.set_scale(420.0f);  // This value needs calibration for your specific load cell
  scale.tare();             // Reset the scale to 0
  Serial.println("Load cell initialized");

  // Connect to WiFi
  connectToWiFi();
  
  // Get initial configuration from Firebase
  fetchDeviceConfiguration();
}

void loop() {
  unsigned long currentTime = millis();

  // Read sensors at regular interval
  if (currentTime - lastSensorReadTime >= sensorReadInterval) {
    lastSensorReadTime = currentTime;
    readSensors();
    updateLCD();
    checkAlertConditions();
  }

  // Send data to Firebase at regular interval
  if (currentTime - lastDataSendTime >= dataSendInterval) {
    lastDataSendTime = currentTime;
    sendDataToFirebase();
  }

  // Fetch configuration from Firebase at regular interval
  if (currentTime - lastConfigFetchTime >= configFetchInterval) {
    lastConfigFetchTime = currentTime;
    fetchDeviceConfiguration();
  }
}

void connectToWiFi() {
  Serial.print("Connecting to WiFi");
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Connecting WiFi");
  
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    lcd.setCursor(attempts % 16, 1);
    lcd.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi connected!");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
    
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("WiFi Connected");
    lcd.setCursor(0, 1);
    lcd.print(WiFi.localIP());
    delay(2000);
  } else {
    Serial.println("\nWiFi connection failed!");
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("WiFi Failed!");
    delay(2000);
  }
}

void fetchDeviceConfiguration() {
  if (WiFi.status() != WL_CONNECTED) {
    connectToWiFi();
    if (WiFi.status() != WL_CONNECTED) {
      return;  // Still not connected, exit
    }
  }

  Serial.println("Fetching device configuration...");
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Fetching config");

  HTTPClient http;
  String url = firebaseURL + "/users/" + userID + "/devices/device1.json";  
  
  http.begin(url);
  int httpCode = http.GET();
  
  if (httpCode == HTTP_CODE_OK) {
    String payload = http.getString();
    
    // Parse the JSON response
    DynamicJsonDocument doc(2048);  // Adjust size based on your JSON response
    DeserializationError error = deserializeJson(doc, payload);
    
    if (!error) {
      // Extract threshold values
      if (doc.containsKey("thresholds")) {
        JsonObject thresholds = doc["thresholds"];
        waterLevelThreshold = thresholds["waterLevel"].as<float>();
        binFullnessThreshold = thresholds["binFullness"].as<float>();
        wasteWeightThreshold = thresholds["wasteWeight"].as<float>();
      }
      
      // Extract notification settings
      if (doc.containsKey("notifications")) {
        JsonObject notifications = doc["notifications"];
        notificationsEnabled = notifications["enabled"].as<bool>();
        notifyOnWaterLevel = notifications["notifyOnWaterLevel"].as<bool>();
        notifyOnBinFullness = notifications["notifyOnBinFullness"].as<bool>();
        notifyOnWeight = notifications["notifyOnWeight"].as<bool>();
        
        // Get contact IDs that should receive notifications
        if (notifications.containsKey("notifyContacts") && notifications["notifyContacts"].is<JsonArray>()) {
          JsonArray contactIDs = notifications["notifyContacts"].as<JsonArray>();
          
          // Reset contacts
          numContacts = 0;
          
          // Fetch each contact's phone number
          for (int i = 0; i < contactIDs.size() && i < 5; i++) {
            String contactID = contactIDs[i].as<String>();
            fetchContactPhoneNumber(contactID);
          }
        }
      }
      
      Serial.println("Configuration updated successfully");
      Serial.print("Water Level Threshold: ");
      Serial.println(waterLevelThreshold);
      Serial.print("Bin Fullness Threshold: ");
      Serial.println(binFullnessThreshold);
      Serial.print("Waste Weight Threshold: ");
      Serial.println(wasteWeightThreshold);
      Serial.print("Notifications Enabled: ");
      Serial.println(notificationsEnabled ? "Yes" : "No");
      
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("Config Updated");
      lcd.setCursor(0, 1);
      lcd.print("Contacts: ");
      lcd.print(numContacts);
      delay(2000);
    } else {
      Serial.print("JSON parsing error: ");
      Serial.println(error.c_str());
    }
  } else {
    Serial.print("HTTP error fetching device config: ");
    Serial.println(httpCode);
  }
  
  http.end();
}

void fetchContactPhoneNumber(String contactID) {
  if (WiFi.status() != WL_CONNECTED) {
    return;  // Not connected to WiFi
  }
  
  HTTPClient http;
  String url = firebaseURL + "/users/" + userID + "/contacts/" + contactID + ".json";
  
  http.begin(url);
  int httpCode = http.GET();
  
  if (httpCode == HTTP_CODE_OK) {
    String payload = http.getString();
    
    DynamicJsonDocument doc(1024);
    DeserializationError error = deserializeJson(doc, payload);
    
    if (!error && doc.containsKey("phone") && doc.containsKey("status")) {
      String status = doc["status"].as<String>();
      
      // Only add active contacts
      if (status == "active") {
        String phone = doc["phone"].as<String>();
        if (numContacts < 5) {  // Limit to 5 contacts
          contactNumbers[numContacts] = phone;
          numContacts++;
          
          Serial.print("Added contact: ");
          Serial.println(phone);
        }
      }
    }
  }
  
  http.end();
}

void readSensors() {
  // Read water level sensor 1
  flushSerial(sensor1);
  delay(50);
  lastDist1 = readA02Distance(sensor1);
  
  // Read bin fullness sensor (sensor 2)
  flushSerial(sensor2);
  delay(50);
  lastDist2 = readA02Distance(sensor2);
  
  // Convert distance to fullness percentage (assuming bin height of 100cm)
  // Adjust the calculation based on your bin's dimensions
  if (lastDist2 > 0) {
    // Invert the relationship: closer distance = higher fullness
    binFullness = map(constrain(lastDist2, 0, 100), 100, 0, 0, 100);
  }
  
  // Read weight from load cell
  if (scale.is_ready()) {
    lastWeight = scale.get_units(5);  // Average of 5 readings for stability
    if (lastWeight < 0) lastWeight = 0;  // Prevent negative readings
  }
  
  // Log sensor data
  Serial.println("----- Sensor Readings -----");
  Serial.print("Water Level Distance: ");
  Serial.print(lastDist1);
  Serial.println(" cm");
  
  Serial.print("Bin Fullness Distance: ");
  Serial.print(lastDist2);
  Serial.println(" cm");
  
  Serial.print("Bin Fullness: ");
  Serial.print(binFullness);
  Serial.println("%");
  
  Serial.print("Waste Weight: ");
  Serial.print(lastWeight);
  Serial.println(" kg");
  Serial.println("--------------------------");
}

void updateLCD() {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("WL:");
  if (lastDist1 >= 0) {
    lcd.print(lastDist1, 1);
    lcd.print("cm");
  } else {
    lcd.print("Error");
  }
  
  lcd.setCursor(0, 1);
  lcd.print("BF:");
  lcd.print(binFullness);
  lcd.print("% W:");
  lcd.print(lastWeight, 1);
  lcd.print("kg");
}

void checkAlertConditions() {
  if (!notificationsEnabled) {
    return;  // Notifications are disabled
  }
  
  bool shouldSendWaterAlert = false;
  bool shouldSendFullnessAlert = false;
  bool shouldSendWeightAlert = false;
  String alertMessage = "DrainSentry Alert: ";
  
  // Check water level alert condition (lower distance = higher water level)
  // Assuming 100cm is empty and 0cm is full
  float waterLevelPercent = 100 - lastDist1;  // Convert to percentage
  if (notifyOnWaterLevel && waterLevelPercent >= waterLevelThreshold) {
    shouldSendWaterAlert = true;
    alertMessage += "Water level at " + String(waterLevelPercent, 0) + "% (>" + String(waterLevelThreshold, 0) + "%). ";
  }
  
  // Check bin fullness alert condition
  if (notifyOnBinFullness && binFullness >= binFullnessThreshold) {
    shouldSendFullnessAlert = true;
    alertMessage += "Bin fullness at " + String(binFullness) + "% (>" + String(binFullnessThreshold, 0) + "%). ";
  }
  
  // Check waste weight alert condition
  if (notifyOnWeight && lastWeight >= wasteWeightThreshold) {
    shouldSendWeightAlert = true;
    alertMessage += "Waste weight at " + String(lastWeight, 1) + "kg (>" + String(wasteWeightThreshold, 1) + "kg).";
  }
  
  // Send SMS if any alert condition is met and we have contacts
  if ((shouldSendWaterAlert || shouldSendFullnessAlert || shouldSendWeightAlert) && numContacts > 0) {
    for (int i = 0; i < numContacts; i++) {
      sendSMS(contactNumbers[i].c_str(), alertMessage.c_str());
      delay(1000);  // Delay between sending to different contacts
    }
  }
}

void sendDataToFirebase() {
  if (WiFi.status() != WL_CONNECTED) {
    connectToWiFi();
    if (WiFi.status() != WL_CONNECTED) {
      return;  // Still not connected, exit
    }
  }
  
  // Get current time
  time_t now;
  time(&now);
  struct tm timeinfo;
  localtime_r(&now, &timeinfo);
  char timeStr[30];
  strftime(timeStr, sizeof(timeStr), "%m/%d/%Y, %H:%M:%S", &timeinfo);
  
  // Update water level data
  HTTPClient http;
  String waterLevelUrl = firebaseURL + "/users/" + userID + "/waterLevels/device1.json";
  http.begin(waterLevelUrl);
  http.addHeader("Content-Type", "application/json");
  
  // Create JSON for water level update
  DynamicJsonDocument waterLevelDoc(1024);
  waterLevelDoc["id"] = DEVICE_ID;
  waterLevelDoc["location"] = "Main Street Junction"; // This should come from the config
  waterLevelDoc["level"] = 100 - lastDist1;  // Convert distance to level percentage
  waterLevelDoc["lastUpdated"] = String(timeStr);
  
  String waterLevelJson;
  serializeJson(waterLevelDoc, waterLevelJson);
  
  int httpCode = http.PATCH(waterLevelJson);
  if (httpCode > 0) {
    Serial.print("Water level data sent, response: ");
    Serial.println(httpCode);
  } else {
    Serial.print("Water level data send error: ");
    Serial.println(http.errorToString(httpCode));
  }
  http.end();
  
  // Update waste bin data
  String wasteBinUrl = firebaseURL + "/users/" + userID + "/wasteBins/device1.json";
  http.begin(wasteBinUrl);
  http.addHeader("Content-Type", "application/json");
  
  // Create JSON for waste bin update
  DynamicJsonDocument wasteBinDoc(1024);
  wasteBinDoc["id"] = DEVICE_ID;
  wasteBinDoc["location"] = "Main Street Junction"; // This should come from the config
  wasteBinDoc["fullness"] = binFullness;
  wasteBinDoc["weight"] = lastWeight;
  wasteBinDoc["lastEmptied"] = "Never"; // This should be updated when bin is emptied
  
  String wasteBinJson;
  serializeJson(wasteBinDoc, wasteBinJson);
  
  httpCode = http.PATCH(wasteBinJson);
  if (httpCode > 0) {
    Serial.print("Waste bin data sent, response: ");
    Serial.println(httpCode);
  } else {
    Serial.print("Waste bin data send error: ");
    Serial.println(http.errorToString(httpCode));
  }
  http.end();
  
  // Update device status (to show as active in the app)
  String deviceUrl = firebaseURL + "/users/" + userID + "/devices/device1.json";
  http.begin(deviceUrl);
  http.addHeader("Content-Type", "application/json");
  
  // Create JSON for device status update
  DynamicJsonDocument deviceDoc(256);
  deviceDoc["lastSeen"] = String(timeStr);
  deviceDoc["status"] = "active";
  
  String deviceJson;
  serializeJson(deviceDoc, deviceJson);
  
  httpCode = http.PATCH(deviceJson);
  http.end();
  
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Data Sent");
  lcd.setCursor(0, 1);
  lcd.print("Status: Active");
  delay(1000);
}

// Flush serial buffer to clear old data
void flushSerial(HardwareSerial& serial) {
  while (serial.available()) {
    serial.read();
  }
}

// Read distance from A02-21AU sensor
float readA02Distance(HardwareSerial& serial) {
  unsigned char data[4];
  unsigned long start = millis();

  while (millis() - start < 150) {  // 150ms timeout
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

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Sending Alert");
  lcd.setCursor(0, 1);
  lcd.print(phoneNumber);

  gsmSerial.println("AT+CMGF=1");  // SMS text mode
  delay(500);

  gsmSerial.print("AT+CMGS=\"");
  gsmSerial.print(phoneNumber);
  gsmSerial.println("\"");
  delay(500);

  gsmSerial.print(message);
  delay(500);

  gsmSerial.write(26);  // Ctrl+Z to send SMS
  delay(5000);  // Wait for SMS to be sent

  Serial.println("SMS sent.");
  
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Alert Sent");
  delay(1000);
}