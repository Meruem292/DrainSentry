//
// ADD THESE FUNCTIONS TO YOUR ARDUINO CODE
//

// Function to save history data with timestamp to create multiple entries per day
void saveWaterLevelHistoryWithTimestamp() {
  if (!deviceRegistered || WiFi.status() != WL_CONNECTED) {
    return;
  }
  
  // Get current time for timestamp
  time_t now;
  time(&now);
  struct tm timeinfo;
  localtime_r(&now, &timeinfo);
  
  // Format date for main history path (YYYY-MM-DD)
  char dateStr[11];
  strftime(dateStr, sizeof(dateStr), "%Y-%m-%d", &timeinfo);
  
  // Format timestamp for entry key (HH_MM_SS)
  char timeStr[9];
  strftime(timeStr, sizeof(timeStr), "%H_%M_%S", &timeinfo);
  
  // Calculate water level percentage from distance
  float waterLevelPercent = 100 - lastDist1;  // Convert distance to level percentage
  
  // Send data to Firebase - using UNIQUE KEY for each reading
  HTTPClient http;
  String url = firebaseURL + "/users/" + deviceOwnerUserID + "/waterLevelHistory/" + String(dateStr) + "/" + deviceContainerKey + "/" + String(timeStr) + ".json";
  
  // Create JSON for entry
  DynamicJsonDocument doc(128);
  doc["value"] = waterLevelPercent;
  
  String payload;
  serializeJson(doc, payload);
  
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  
  int httpCode = http.PUT(payload);
  if (httpCode > 0) {
    Serial.println("Water level history saved with timestamp: " + String(httpCode));
  } else {
    Serial.println("Error saving water level history: " + http.errorToString(httpCode));
  }
  
  http.end();
}

// Function to save waste bin history data with timestamp
void saveWasteBinHistoryWithTimestamp() {
  if (!deviceRegistered || WiFi.status() != WL_CONNECTED) {
    return;
  }
  
  // Get current time for timestamp
  time_t now;
  time(&now);
  struct tm timeinfo;
  localtime_r(&now, &timeinfo);
  
  // Format date for main history path (YYYY-MM-DD)
  char dateStr[11];
  strftime(dateStr, sizeof(dateStr), "%Y-%m-%d", &timeinfo);
  
  // Format timestamp for entry key (HH_MM_SS)
  char timeStr[9];
  strftime(timeStr, sizeof(timeStr), "%H_%M_%S", &timeinfo);
  
  // Send data to Firebase - using UNIQUE KEY for each reading
  HTTPClient http;
  String url = firebaseURL + "/users/" + deviceOwnerUserID + "/wasteBinHistory/" + String(dateStr) + "/" + deviceContainerKey + "/" + String(timeStr) + ".json";
  
  // Create JSON for entry
  DynamicJsonDocument doc(128);
  doc["fullness"] = binFullness;
  doc["weight"] = lastWeight;
  
  String payload;
  serializeJson(doc, payload);
  
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  
  int httpCode = http.PUT(payload);
  if (httpCode > 0) {
    Serial.println("Waste bin history saved with timestamp: " + String(httpCode));
  } else {
    Serial.println("Error saving waste bin history: " + http.errorToString(httpCode));
  }
  
  http.end();
}

// MODIFY YOUR sendDataToFirebase() FUNCTION
// Add these two lines at the end:
//
// // Save history data with timestamp
// saveWaterLevelHistoryWithTimestamp();
// saveWasteBinHistoryWithTimestamp();