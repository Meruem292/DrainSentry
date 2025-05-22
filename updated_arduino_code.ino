#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <HardwareSerial.h>
#include "HX711.h"
#include <WiFi.h>
#include <HTTPClient.h>
#include <NTPClient.h>
#include <WiFiUdp.h>

// Firebase credentials
const char* FIREBASE_HOST = "YOUR_PROJECT_ID.firebaseio.com"; // Replace with your Firebase project ID
const char* FIREBASE_AUTH = "YOUR_FIREBASE_AUTH_TOKEN"; // Replace with your Firebase auth token
const char* DEVICE_ID = "WL-001"; // Device ID for Firebase
const char* USER_ID = ""; // Will be set dynamically when the device connects to Firebase

// WiFi credentials
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// Sensor pins
#define SENSOR1_RX 18
#define SENSOR1_TX 19
#define SENSOR2_RX 16
#define SENSOR2_TX 17

#define GSM_TX 26
#define GSM_RX 27

#define DIST_THRESHOLD 10.0

#define LOADCELL_DOUT 33
#define LOADCELL_SCK 32
#define WEIGHT_THRESHOLD 2.0  // in kg

HX711 scale;

// Timing settings
const unsigned long interval = 2000;        // Read sensors every 2 seconds
const unsigned long firebaseInterval = 60000; // Send to Firebase every minute
unsigned long lastReadTime = 0;
unsigned long lastFirebaseTime = 0;

// NTP for date and time
WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, "pool.ntp.org");

HardwareSerial sensor1(2);    // UART2
HardwareSerial sensor2(1);    // UART1
HardwareSerial gsmSerial(0);  // UART0 (default)

LiquidCrystal_I2C lcd(0x27, 16, 2);

float lastDist1 = -1;
float lastDist2 = -1;
float lastWeight = 0;
int binFullness = 0; // Based on distance sensor 2

void setup() {
  Serial.begin(115200);
  sensor1.begin(9600, SERIAL_8N1, SENSOR1_RX, SENSOR1_TX);
  sensor2.begin(9600, SERIAL_8N1, SENSOR2_RX, SENSOR2_TX);
  gsmSerial.begin(9600, SERIAL_8N1, GSM_TX, GSM_RX);

  // Initialize display
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("Starting...");

  // Initialize scale
  scale.begin(LOADCELL_DOUT, LOADCELL_SCK);
  scale.set_scale();  // Set later after calibration
  scale.tare();       // Reset the scale to 0
  Serial.println("Load cell initialized");

  // Initialize GSM
  sendATCommand("AT");
  sendATCommand("AT+CMGF=1");  // SMS text mode

  // Connect to WiFi
  connectWiFi();
  
  // Initialize NTP
  timeClient.begin();
  timeClient.setTimeOffset(0); // Set your time zone offset in seconds
  
  // Find owner user ID
  findDeviceOwner();
}

void loop() {
  unsigned long currentTime = millis();
  
  // Read sensors periodically
  if (currentTime - lastReadTime >= interval) {
    lastReadTime = currentTime;
    
    // Read water level sensor
    flushSerial(sensor1);
    delay(50);
    lastDist1 = readA02Distance(sensor1);
    
    // Convert to water level percentage (assuming 100cm is 0% and 0cm is 100%)
    int waterLevel = map(lastDist1, 100, 0, 0, 100);
    waterLevel = constrain(waterLevel, 0, 100);
    
    Serial.print("Water Level: ");
    Serial.print(waterLevel);
    Serial.println("%");

    // Read bin fullness sensor
    flushSerial(sensor2);
    delay(50);
    lastDist2 = readA02Distance(sensor2);
    
    // Convert to bin fullness percentage (assuming 50cm is 0% and 5cm is 100%)
    binFullness = map(lastDist2, 50, 5, 0, 100);
    binFullness = constrain(binFullness, 0, 100);
    
    Serial.print("Bin Fullness: ");
    Serial.print(binFullness);
    Serial.println("%");

    // Read weight sensor
    if (scale.is_ready()) {
      lastWeight = scale.get_units();  // You may need calibration
      
      // Convert to weight percentage (assuming 10kg is 100%)
      int weightPercentage = (lastWeight / 10.0) * 100;
      weightPercentage = constrain(weightPercentage, 0, 100);
      
      Serial.print("Weight: ");
      Serial.print(lastWeight);
      Serial.print("kg (");
      Serial.print(weightPercentage);
      Serial.println("%)");
    }
    
    // Update LCD display
    updateLCD(waterLevel, binFullness, lastWeight);
    
    // Send SMS alerts if thresholds are exceeded
    if (waterLevel >= 85) {
      sendSMS("09815409364", "Alert: Water level high at " + String(waterLevel) + "%!");
    }
    
    if (binFullness >= 85) {
      sendSMS("09815409364", "Alert: Waste bin nearly full at " + String(binFullness) + "%!");
    }
    
    if (lastWeight >= WEIGHT_THRESHOLD) {
      sendSMS("09815409364", "Alert: Waste bin weight high at " + String(lastWeight) + "kg!");
    }
  }
  
  // Send data to Firebase periodically
  if (currentTime - lastFirebaseTime >= firebaseInterval && USER_ID[0] != '\0') {
    lastFirebaseTime = currentTime;
    sendDataToFirebase();
  }
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

void findDeviceOwner() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected. Can't find device owner.");
    return;
  }
  
  HTTPClient http;
  String url = "https://" + String(FIREBASE_HOST) + "/users.json?auth=" + String(FIREBASE_AUTH);
  
  Serial.println("Finding device owner...");
  Serial.println(url);
  
  http.begin(url);
  int httpCode = http.GET();
  
  if (httpCode > 0) {
    String payload = http.getString();
    Serial.println("Users data:");
    Serial.println(payload);
    
    // Parse JSON to find which user has this device
    // This is a simplified approach. In a real implementation, use ArduinoJson library
    int searchPos = 0;
    while ((searchPos = payload.indexOf(DEVICE_ID, searchPos)) != -1) {
      // Find the user ID that contains this device
      int userStart = payload.lastIndexOf("\"", searchPos);
      int userEnd = payload.indexOf("\"", userStart + 1);
      
      if (userStart != -1 && userEnd != -1) {
        String userId = payload.substring(userStart + 1, userEnd);
        Serial.print("Found device under user: ");
        Serial.println(userId);
        
        // Set the global USER_ID
        userId.toCharArray(USER_ID, userId.length() + 1);
        break;
      }
      
      searchPos++;
    }
  } else {
    Serial.print("Failed to fetch users data: ");
    Serial.println(httpCode);
  }
  
  http.end();
}

void sendDataToFirebase() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected. Reconnecting...");
    connectWiFi();
    if (WiFi.status() != WL_CONNECTED) {
      return;
    }
  }
  
  if (USER_ID[0] == '\0') {
    Serial.println("No user ID found. Can't send data to Firebase.");
    findDeviceOwner();
    return;
  }
  
  // Update NTP time
  timeClient.update();
  
  // Format current date (YYYY-MM-DD)
  time_t epochTime = timeClient.getEpochTime();
  struct tm *ptm = gmtime(&epochTime);
  char dateStr[11];
  sprintf(dateStr, "%04d-%02d-%02d", ptm->tm_year + 1900, ptm->tm_mon + 1, ptm->tm_mday);
  
  // Format current time for lastUpdated
  char timeStr[20];
  sprintf(timeStr, "%02d/%02d/%04d, %02d:%02d:%02d", 
          ptm->tm_mon + 1, ptm->tm_mday, ptm->tm_year + 1900,
          ptm->tm_hour, ptm->tm_min, ptm->tm_sec);
  
  // Convert distance to water level percentage (0-100%)
  int waterLevel = map(lastDist1, 100, 0, 0, 100);
  waterLevel = constrain(waterLevel, 0, 100);
  
  // Convert second distance to bin fullness (0-100%)
  int fullness = map(lastDist2, 50, 5, 0, 100);
  fullness = constrain(fullness, 0, 100);
  
  HTTPClient http;
  
  // Update current water level data
  String waterUrl = "https://" + String(FIREBASE_HOST) + "/users/" + USER_ID + "/waterLevels/device1.json?auth=" + String(FIREBASE_AUTH);
  String waterData = "{\"id\":\"" + String(DEVICE_ID) + "\",\"location\":\"Main Street Junction\",\"level\":" + String(waterLevel) + ",\"lastUpdated\":\"" + String(timeStr) + "\"}";
  
  http.begin(waterUrl);
  http.addHeader("Content-Type", "application/json");
  int httpResponseCode = http.PUT(waterData);
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.println("Water level data sent: " + response);
  } else {
    Serial.print("Error sending water level data: ");
    Serial.println(httpResponseCode);
  }
  
  http.end();
  
  // Update current waste bin data
  String binUrl = "https://" + String(FIREBASE_HOST) + "/users/" + USER_ID + "/wasteBins/device1.json?auth=" + String(FIREBASE_AUTH);
  String binData = "{\"id\":\"" + String(DEVICE_ID) + "\",\"location\":\"Main Street Junction\",\"fullness\":" + String(fullness) + ",\"weight\":" + String(lastWeight) + ",\"lastEmptied\":\"" + String(timeStr) + "\"}";
  
  http.begin(binUrl);
  http.addHeader("Content-Type", "application/json");
  httpResponseCode = http.PUT(binData);
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.println("Waste bin data sent: " + response);
  } else {
    Serial.print("Error sending waste bin data: ");
    Serial.println(httpResponseCode);
  }
  
  http.end();
  
  // Update device status
  String deviceUrl = "https://" + String(FIREBASE_HOST) + "/users/" + USER_ID + "/devices/device1.json?auth=" + String(FIREBASE_AUTH);
  String deviceData = "{\"status\":\"active\",\"lastSeen\":\"" + String(timeStr) + "\"}";
  
  http.begin(deviceUrl);
  http.addHeader("Content-Type", "application/json");
  httpResponseCode = http.PUT(deviceData);
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.println("Device status updated: " + response);
  } else {
    Serial.print("Error updating device status: ");
    Serial.println(httpResponseCode);
  }
  
  http.end();
  
  // Save to historical data
  String historyUrl = "https://" + String(FIREBASE_HOST) + "/users/" + USER_ID + "/waterLevelHistory/" + String(dateStr) + "/device1.json?auth=" + String(FIREBASE_AUTH);
  String historyData = String(waterLevel);
  
  http.begin(historyUrl);
  http.addHeader("Content-Type", "application/json");
  httpResponseCode = http.PUT(historyData);
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.println("Water level history saved: " + response);
  } else {
    Serial.print("Error saving water level history: ");
    Serial.println(httpResponseCode);
  }
  
  http.end();
  
  // Update waste bin history
  String wasteBinHistoryUrl = "https://" + String(FIREBASE_HOST) + "/users/" + USER_ID + "/wasteBinHistory/" + String(dateStr) + "/device1.json?auth=" + String(FIREBASE_AUTH);
  String wasteBinHistoryData = "{\"fullness\":" + String(fullness) + ",\"weight\":" + String(lastWeight) + "}";
  
  http.begin(wasteBinHistoryUrl);
  http.addHeader("Content-Type", "application/json");
  httpResponseCode = http.PUT(wasteBinHistoryData);
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.println("Waste bin history saved: " + response);
  } else {
    Serial.print("Error saving waste bin history: ");
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

void updateLCD(int waterLevel, int binFullness, float weight) {
  lcd.clear();
  
  // First row: Water level and bin fullness
  lcd.setCursor(0, 0);
  lcd.print("WL:");
  lcd.print(waterLevel);
  lcd.print("%");
  
  lcd.setCursor(8, 0);
  lcd.print("BF:");
  lcd.print(binFullness);
  lcd.print("%");
  
  // Second row: Weight
  lcd.setCursor(0, 1);
  lcd.print("WT:");
  lcd.print(weight, 1);
  lcd.print("kg");
}