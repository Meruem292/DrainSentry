#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <HardwareSerial.h>
#include "HX711.h"
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <time.h>

// Device configuration
#define DEVICE_ID "DS-001"  // This is the ID of your device

// Hardware pins
#define SENSOR1_RX 18       // Water level sensor
#define SENSOR1_TX 19
#define SENSOR2_RX 16       // Bin fullness sensor
#define SENSOR2_TX 17

#define GSM_TX 26
#define GSM_RX 27

#define LOADCELL_DOUT 33
#define LOADCELL_SCK 32

// WiFi credentials
const char* ssid = "SKYWORTH_AX_DF63";
const char* password = "082305087";

// Firebase config
const String firebaseURL = "https://drainsentry-default-rtdb.firebaseio.com";

// Device owner info
String deviceOwnerUserID = "";
String deviceContainerKey = "";

// Device configuration from Firebase
float waterLevelThreshold = 80.0;
float binFullnessThreshold = 80.0;
float wasteWeightThreshold = 14.0;
bool notificationsEnabled = true;
bool notifyOnWaterLevel = true;
bool notifyOnBinFullness = true;
bool notifyOnWeight = true;
String contactNumbers[5];
int numContacts = 0;

// Timing variables
const unsigned long sensorReadInterval = 2000;
const unsigned long configFetchInterval = 300000;
const unsigned long dataSendInterval = 5000;
const unsigned long findDeviceInterval = 60000;
unsigned long lastSensorReadTime = 0;
unsigned long lastConfigFetchTime = 0;
unsigned long lastDataSendTime = 0;
unsigned long lastFindDeviceTime = 0;

// Alert management
const unsigned long alertCooldown = 3600000;  // 1 hour cooldown between same-type alerts
const float waterLevelChangeThreshold = 5.0;  // Minimum % change to trigger new alert
const float criticalWaterLevel = 95.0;        // Immediately alert if this level is reached
unsigned long lastWaterAlertTime = 0;
unsigned long lastFullnessAlertTime = 0;
unsigned long lastWeightAlertTime = 0;
bool waterAlertActive = false;
bool fullnessAlertActive = false;
bool weightAlertActive = false;
float lastAlertedWaterLevel = 0.0;
unsigned int waterAlertCount = 0;
unsigned int fullnessAlertCount = 0;
unsigned int weightAlertCount = 0;

// Device status
bool deviceRegistered = false;

// Sensor variables
HX711 scale;
float lastDist1 = -1;
float lastDist2 = -1;
float lastWeight = 0;
int binFullness = 0;

// Serial interfaces
HardwareSerial sensor1(2);    // UART2
HardwareSerial sensor2(1);    // UART1
HardwareSerial gsmSerial(0);  // UART0

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
  scale.set_scale(420.0f);
  scale.tare();
  Serial.println("Load cell initialized");

  // Set up time
  configTime(8 * 3600, 0, "pool.ntp.org", "time.nist.gov");

  // Connect to WiFi
  connectToWiFi();
  
  // Find this device in the database
  findDeviceInDatabase();
}

void loop() {
  unsigned long currentTime = millis();

  if (!deviceRegistered) {
    if (currentTime - lastFindDeviceTime >= findDeviceInterval) {
      lastFindDeviceTime = currentTime;
      findDeviceInDatabase();
    }
    return;
  }

  if (currentTime - lastSensorReadTime >= sensorReadInterval) {
    lastSensorReadTime = currentTime;
    readSensors();
    updateLCD();
    checkAlertConditions();
  }

  if (currentTime - lastDataSendTime >= dataSendInterval) {
    lastDataSendTime = currentTime;
    sendDataToFirebase();
  }

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

void findDeviceInDatabase() {
  if (WiFi.status() != WL_CONNECTED) {
    connectToWiFi();
    if (WiFi.status() != WL_CONNECTED) return;
  }

  Serial.println("Searching for device in database...");
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Finding Device");
  lcd.setCursor(0, 1);
  lcd.print(DEVICE_ID);

  HTTPClient http;
  String url = firebaseURL + "/users.json";
  http.begin(url);
  int httpCode = http.GET();
  
  if (httpCode == HTTP_CODE_OK) {
    String payload = http.getString();
    DynamicJsonDocument doc(16384);
    DeserializationError error = deserializeJson(doc, payload);
    
    if (!error) {
      JsonObject users = doc.as<JsonObject>();
      for (JsonPair user : users) {
        String userId = user.key().c_str();
        JsonObject userData = user.value().as<JsonObject>();
        
        if (userData.containsKey("devices")) {
          JsonObject devices = userData["devices"];
          
          for (JsonPair device : devices) {
            String containerKey = device.key().c_str();
            JsonObject deviceData = device.value().as<JsonObject>();
            
            if (deviceData.containsKey("id") && deviceData["id"].as<String>() == DEVICE_ID) {
              deviceOwnerUserID = userId;
              deviceContainerKey = containerKey;
              deviceRegistered = true;
              
              Serial.println("Device found in database!");
              Serial.print("Owner User ID: ");
              Serial.println(deviceOwnerUserID);
              Serial.print("Device Container Key: ");
              Serial.println(deviceContainerKey);
              
              lcd.clear();
              lcd.setCursor(0, 0);
              lcd.print("Device Found!");
              lcd.setCursor(0, 1);
              lcd.print("Getting Config...");
              delay(1000);
              
              fetchDeviceConfiguration();
              return;
            }
          }
        }
      }
      
      Serial.println("Device not found in any user's account");
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("Device Not Found");
      lcd.setCursor(0, 1);
      lcd.print("Waiting...");
    } else {
      Serial.print("JSON parsing error: ");
      Serial.println(error.c_str());
    }
  } else {
    Serial.print("HTTP error finding device: ");
    Serial.println(httpCode);
  }
  
  http.end();
}

void fetchDeviceConfiguration() {
  if (!deviceRegistered) {
    Serial.println("Device not registered, cannot fetch configuration");
    return;
  }
  
  if (WiFi.status() != WL_CONNECTED) {
    connectToWiFi();
    if (WiFi.status() != WL_CONNECTED) return;
  }

  Serial.println("Fetching device configuration...");
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Fetching config");

  HTTPClient http;
  String url = firebaseURL + "/users/" + deviceOwnerUserID + "/devices/" + deviceContainerKey + ".json";  
  http.begin(url);
  int httpCode = http.GET();
  
  if (httpCode == HTTP_CODE_OK) {
    String payload = http.getString();
    DynamicJsonDocument doc(2048);
    DeserializationError error = deserializeJson(doc, payload);
    
    if (!error) {
      if (doc.containsKey("thresholds")) {
        JsonObject thresholds = doc["thresholds"];
        waterLevelThreshold = thresholds["waterLevel"].as<float>();
        binFullnessThreshold = thresholds["binFullness"].as<float>();
        wasteWeightThreshold = thresholds["wasteWeight"].as<float>();
      }
      
      if (doc.containsKey("notifications")) {
        JsonObject notifications = doc["notifications"];
        notificationsEnabled = notifications["enabled"].as<bool>();
        notifyOnWaterLevel = notifications["notifyOnWaterLevel"].as<bool>();
        notifyOnBinFullness = notifications["notifyOnBinFullness"].as<bool>();
        notifyOnWeight = notifications["notifyOnWeight"].as<bool>();
        
        if (notifications.containsKey("notifyContacts") && notifications["notifyContacts"].is<JsonArray>()) {
          JsonArray contactIDs = notifications["notifyContacts"].as<JsonArray>();
          numContacts = 0;
          
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
  if (!deviceRegistered || WiFi.status() != WL_CONNECTED) return;
  
  HTTPClient http;
  String url = firebaseURL + "/users/" + deviceOwnerUserID + "/contacts/" + contactID + ".json";
  http.begin(url);
  int httpCode = http.GET();
  
  if (httpCode == HTTP_CODE_OK) {
    String payload = http.getString();
    DynamicJsonDocument doc(1024);
    DeserializationError error = deserializeJson(doc, payload);
    
    if (!error && doc.containsKey("phone") && doc.containsKey("status")) {
      String status = doc["status"].as<String>();
      
      if (status == "active") {
        String phone = doc["phone"].as<String>();
        if (numContacts < 5) {
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
  // Read water level sensor
  flushSerial(sensor1);
  delay(50);
  lastDist1 = readA02Distance(sensor1);
  
  // Read bin fullness sensor
  flushSerial(sensor2);
  delay(50);
  lastDist2 = readA02Distance(sensor2);
  
  // Convert distance to bin fullness percentage
  if (lastDist2 > 0) {
    binFullness = map(constrain(lastDist2, 0, 50), 50, 0, 0, 100);
  }
  
  // Read weight from load cell
  if (scale.is_ready()) {
    lastWeight = ((scale.get_units()/2.7)/100);
    if (lastWeight < 0) lastWeight = 0;
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
  
  float waterLevel = 0;
  if (lastDist1 >= 0) {
    waterLevel = 100.0 - (lastDist1 / 100.0 * 100.0);
    waterLevel = constrain(waterLevel, 0.0, 100.0);
    lcd.print(waterLevel, 0);
    lcd.print("%");
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
  if (!deviceRegistered || !notificationsEnabled || numContacts == 0) {
    return;
  }
  
  bool shouldSendWaterAlert = false;
  bool shouldSendFullnessAlert = false;
  bool shouldSendWeightAlert = false;
  String alertMessage = "DrainSentry Alert: ";
  unsigned long currentTime = millis();
  
  // Calculate water level percentage
  float waterLevelPercent = 100.0 - (lastDist1 / 100.0 * 100.0);
  waterLevelPercent = constrain(waterLevelPercent, 0.0, 100.0);
  
  // Check water level alert condition
  if (notifyOnWaterLevel && waterLevelPercent >= waterLevelThreshold) {
    if (waterLevelPercent >= criticalWaterLevel && (currentTime - lastWaterAlertTime >= 60000)) {
      // Critical level - bypass normal cooldown (but still limit to 1 minute)
      shouldSendWaterAlert = true;
      waterAlertActive = true;
      lastWaterAlertTime = currentTime;
      waterAlertCount++;
      alertMessage = "CRITICAL " + alertMessage;
      alertMessage += "Water level at " + String(waterLevelPercent, 0) + "% (>" + String(waterLevelThreshold, 0) + "%). ";
    }
    else if (!waterAlertActive) {
      waterAlertCount++;
      if (waterAlertCount >= 3 || (abs(waterLevelPercent - lastAlertedWaterLevel) >= waterLevelChangeThreshold)) {
        if (currentTime - lastWaterAlertTime >= alertCooldown) {
          shouldSendWaterAlert = true;
          waterAlertActive = true;
          lastWaterAlertTime = currentTime;
          lastAlertedWaterLevel = waterLevelPercent;
          if (waterAlertCount > 1) alertMessage += "[Repeated " + String(waterAlertCount) + "x] ";
          alertMessage += "Water level at " + String(waterLevelPercent, 0) + "% (>" + String(waterLevelThreshold, 0) + "%). ";
        }
      }
    }
  } else {
    waterAlertActive = false;
    waterAlertCount = 0;
  }
  
  // Check bin fullness alert condition
  if (notifyOnBinFullness && binFullness >= binFullnessThreshold) {
    if (!fullnessAlertActive && (currentTime - lastFullnessAlertTime >= alertCooldown)) {
      shouldSendFullnessAlert = true;
      fullnessAlertActive = true;
      lastFullnessAlertTime = currentTime;
      fullnessAlertCount++;
      if (fullnessAlertCount > 1) alertMessage += "[Repeated " + String(fullnessAlertCount) + "x] ";
      alertMessage += "Bin fullness at " + String(binFullness) + "% (>" + String(binFullnessThreshold, 0) + "%). ";
    }
  } else {
    fullnessAlertActive = false;
    fullnessAlertCount = 0;
  }
  
  // Check waste weight alert condition
  if (notifyOnWeight && lastWeight >= wasteWeightThreshold) {
    if (!weightAlertActive && (currentTime - lastWeightAlertTime >= alertCooldown)) {
      shouldSendWeightAlert = true;
      weightAlertActive = true;
      lastWeightAlertTime = currentTime;
      weightAlertCount++;
      if (weightAlertCount > 1) alertMessage += "[Repeated " + String(weightAlertCount) + "x] ";
      alertMessage += "Waste weight at " + String(lastWeight, 1) + "kg (>" + String(wasteWeightThreshold, 1) + "kg).";
    }
  } else {
    weightAlertActive = false;
    weightAlertCount = 0;
  }
  
  // Send SMS if any alert condition is met
  if (shouldSendWaterAlert || shouldSendFullnessAlert || shouldSendWeightAlert) {
    for (int i = 0; i < numContacts; i++) {
      sendSMS(contactNumbers[i].c_str(), alertMessage.c_str());
      delay(1000);
    }
  }
}

void sendDataToFirebase() {
  if (!deviceRegistered || WiFi.status() != WL_CONNECTED) {
    if (!deviceRegistered) Serial.println("Device not registered, cannot send data");
    if (WiFi.status() != WL_CONNECTED) connectToWiFi();
    return;
  }
  
  // Get current time
  time_t now;
  time(&now);
  struct tm timeinfo;
  localtime_r(&now, &timeinfo);
  
  // Format date and time strings for different purposes
  char timeStr[30];
  strftime(timeStr, sizeof(timeStr), "%m/%d/%Y, %H:%M:%S", &timeinfo);
  
  // Format date for Firebase path (YYYY-MM-DD)
  char dateStr[12];
  strftime(dateStr, sizeof(dateStr), "%Y-%m-%d", &timeinfo);
  
  // Format time for Firebase key (HH_MM_SS)
  char firebaseTimeKey[9];
  strftime(firebaseTimeKey, sizeof(firebaseTimeKey), "%H_%M_%S", &timeinfo);
  
  // Calculate water level percentage using the formula from your web app
  float waterLevelPercent = 100.0 - (lastDist1 / 100.0 * 100.0);
  waterLevelPercent = constrain(waterLevelPercent, 0.0, 100.0);
  
  // Update current readings
  HTTPClient http;
  
  // Update water level data
  String waterLevelUrl = firebaseURL + "/users/" + deviceOwnerUserID + "/waterLevels/" + deviceContainerKey + ".json";
  http.begin(waterLevelUrl);
  http.addHeader("Content-Type", "application/json");
  
  DynamicJsonDocument waterLevelDoc(1024);
  waterLevelDoc["id"] = DEVICE_ID;
  waterLevelDoc["location"] = "Main Street Junction";
  waterLevelDoc["level"] = (int)waterLevelPercent;
  waterLevelDoc["lastUpdated"] = String(timeStr);
  
  String waterLevelJson;
  serializeJson(waterLevelDoc, waterLevelJson);
  
  int httpCode = http.PUT(waterLevelJson);
  if (httpCode > 0) {
    Serial.print("Water level data sent, response: ");
    Serial.println(httpCode);
  } else {
    Serial.print("Water level data send error: ");
    Serial.println(http.errorToString(httpCode));
  }
  http.end();
  
  // Update waste bin data
  String wasteBinUrl = firebaseURL + "/users/" + deviceOwnerUserID + "/wasteBins/" + deviceContainerKey + ".json";
  http.begin(wasteBinUrl);
  http.addHeader("Content-Type", "application/json");
  
  DynamicJsonDocument wasteBinDoc(1024);
  wasteBinDoc["id"] = DEVICE_ID;
  wasteBinDoc["location"] = "Main Street Junction";
  wasteBinDoc["fullness"] = binFullness;
  wasteBinDoc["weight"] = lastWeight;
  wasteBinDoc["lastEmptied"] = "Never";
  
  String wasteBinJson;
  serializeJson(wasteBinDoc, wasteBinJson);
  
  httpCode = http.PUT(wasteBinJson);
  if (httpCode > 0) {
    Serial.print("Waste bin data sent, response: ");
    Serial.println(httpCode);
  } else {
    Serial.print("Waste bin data send error: ");
    Serial.println(http.errorToString(httpCode));
  }
  http.end();
  
  // Save to water level history
  String waterHistoryUrl = firebaseURL + "/users/" + deviceOwnerUserID + "/waterLevelHistory/" + String(dateStr) + "/" + deviceContainerKey + "/" + String(firebaseTimeKey) + ".json";
  http.begin(waterHistoryUrl);
  http.addHeader("Content-Type", "application/json");
  
  DynamicJsonDocument waterHistoryDoc(128);
  waterHistoryDoc["value"] = (int)waterLevelPercent;
  
  String waterHistoryJson;
  serializeJson(waterHistoryDoc, waterHistoryJson);
  
  httpCode = http.PUT(waterHistoryJson);
  if (httpCode > 0) {
    Serial.print("Water level history saved, path: ");
    Serial.println(waterHistoryUrl);
  } else {
    Serial.print("Error saving water level history: ");
    Serial.println(http.errorToString(httpCode));
  }
  http.end();
  
  // Save to waste bin history
  String wasteBinHistoryUrl = firebaseURL + "/users/" + deviceOwnerUserID + "/wasteBinHistory/" + String(dateStr) + "/" + deviceContainerKey + "/" + String(firebaseTimeKey) + ".json";
  http.begin(wasteBinHistoryUrl);
  http.addHeader("Content-Type", "application/json");
  
  DynamicJsonDocument wasteBinHistoryDoc(128);
  wasteBinHistoryDoc["fullness"] = binFullness;
  wasteBinHistoryDoc["weight"] = lastWeight;
  
  String wasteBinHistoryJson;
  serializeJson(wasteBinHistoryDoc, wasteBinHistoryJson);
  
  httpCode = http.PUT(wasteBinHistoryJson);
  if (httpCode > 0) {
    Serial.print("Waste bin history saved, path: ");
    Serial.println(wasteBinHistoryUrl);
  } else {
    Serial.print("Error saving waste bin history: ");
    Serial.println(http.errorToString(httpCode));
  }
  http.end();
  
  // Update device status with lastSeen timestamp
  String deviceUrl = firebaseURL + "/users/" + deviceOwnerUserID + "/devices/" + deviceContainerKey + "/lastSeen.json";
  http.begin(deviceUrl);
  http.addHeader("Content-Type", "application/json");
  
  // Directly update just the lastSeen field
  String deviceJson = "\"" + String(timeStr) + "\"";
  
  httpCode = http.PUT(deviceJson);
  if (httpCode > 0) {
    Serial.print("Device last seen updated: ");
    Serial.println(httpCode);
  } else {
    Serial.print("Error updating device status: ");
    Serial.println(http.errorToString(httpCode));
  }
  http.end();
}

float readA02Distance(HardwareSerial &serial) {
  if (serial.available() > 0) {
    String data = serial.readStringUntil('\n');
    if (data.indexOf("R") >= 0) {
      int idx = data.indexOf("R");
      if (idx >= 0 && idx + 1 < data.length()) {
        String distStr = data.substring(idx + 1);
        float dist = distStr.toFloat();
        return dist;
      }
    }
  }
  return -1.0;
}

void flushSerial(HardwareSerial &serial) {
  while (serial.available()) {
    serial.read();
  }
}

void sendATCommand(const char* command) {
  gsmSerial.println(command);
  delay(500);
  while (gsmSerial.available()) {
    String response = gsmSerial.readString();
    Serial.println(response);
  }
}

void sendSMS(const char* phone, const char* message) {
  String smsCommand = "AT+CMGS=\"" + String(phone) + "\"";
  
  gsmSerial.println(smsCommand);
  delay(500);
  gsmSerial.print(message);
  delay(100);
  gsmSerial.write(26);  // Ctrl+Z to send message
  
  Serial.print("SMS sent to ");
  Serial.print(phone);
  Serial.print(": ");
  Serial.println(message);
  
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Sending Alert");
  lcd.setCursor(0, 1);
  lcd.print(phone);
  
  delay(2000);
  
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Alert Sent");
  delay(1000);
  
  // Wait for response
  delay(5000);
  while (gsmSerial.available()) {
    String response = gsmSerial.readString();
    Serial.println(response);
  }
}

void getFormattedDateTime(char* dateStr, char* timeStr, char* fullTimestamp) {
  time_t now;
  time(&now);
  struct tm timeinfo;
  localtime_r(&now, &timeinfo);
  
  strftime(dateStr, 11, "%Y-%m-%d", &timeinfo);
  strftime(timeStr, 9, "%H:%M:%S", &timeinfo);
  strftime(fullTimestamp, 20, "%m/%d/%Y, %H:%M:%S", &timeinfo);
}

void formatTimeForFirebase(const char* timeStr, char* firebaseTimeKey) {
  // Convert HH:MM:SS to HH_MM_SS
  strcpy(firebaseTimeKey, timeStr);
  for(int i=0; i<8; i++) {
    if(firebaseTimeKey[i] == ':') {
      firebaseTimeKey[i] = '_';
    }
  }
}