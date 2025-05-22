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