//
// ADD THESE FUNCTIONS TO YOUR ARDUINO CODE
// This solution stores data with proper timestamps, not replacing the old data
//

// Save water level history to Firebase with unique timestamp key
void saveWaterLevelHistory() {
  if (!deviceRegistered || WiFi.status() != WL_CONNECTED) {
    return;
  }
  
  // Get current time for timestamp formatting
  time_t now;
  time(&now);
  struct tm timeinfo;
  localtime_r(&now, &timeinfo);
  
  // Format date (YYYY-MM-DD) for main path
  char dateStr[11];
  strftime(dateStr, sizeof(dateStr), "%Y-%m-%d", &timeinfo);
  
  // Format timestamp (HH_MM_SS) for unique entry key
  char timeStr[9];
  strftime(timeStr, sizeof(timeStr), "%H_%M_%S", &timeinfo);
  
  // Calculate water level percentage
  float waterLevelPercent = 100 - lastDist1;  // Convert distance to level percentage
  
  // Use the timestamp as the entry key to save multiple readings for same day
  String historyUrl = firebaseURL + "/users/" + deviceOwnerUserID + "/waterLevelHistory/" + String(dateStr) + "/" + deviceContainerKey + "/" + String(timeStr) + ".json";
  
  // Create JSON for water level value
  String payload = "{\"value\":" + String(waterLevelPercent) + "}";
  
  HTTPClient http;
  http.begin(historyUrl);
  http.addHeader("Content-Type", "application/json");
  
  int httpCode = http.PUT(payload);
  if (httpCode > 0) {
    Serial.println("Water level history saved (timestamp: " + String(timeStr) + "): " + String(httpCode));
  } else {
    Serial.println("Error saving water level history: " + http.errorToString(httpCode));
  }
  
  http.end();
}

// Save waste bin history to Firebase with unique timestamp key
void saveWasteBinHistory() {
  if (!deviceRegistered || WiFi.status() != WL_CONNECTED) {
    return;
  }
  
  // Get current time for timestamp formatting
  time_t now;
  time(&now);
  struct tm timeinfo;
  localtime_r(&now, &timeinfo);
  
  // Format date (YYYY-MM-DD) for main path
  char dateStr[11];
  strftime(dateStr, sizeof(dateStr), "%Y-%m-%d", &timeinfo);
  
  // Format timestamp (HH_MM_SS) for unique entry key
  char timeStr[9];
  strftime(timeStr, sizeof(timeStr), "%H_%M_%S", &timeinfo);
  
  // Create unique key for this reading
  String historyUrl = firebaseURL + "/users/" + deviceOwnerUserID + "/wasteBinHistory/" + String(dateStr) + "/" + deviceContainerKey + "/" + String(timeStr) + ".json";
  
  // Create JSON for waste bin data
  DynamicJsonDocument doc(128);
  doc["fullness"] = binFullness;
  doc["weight"] = lastWeight;
  
  String payload;
  serializeJson(doc, payload);
  
  HTTPClient http;
  http.begin(historyUrl);
  http.addHeader("Content-Type", "application/json");
  
  int httpCode = http.PUT(payload);
  if (httpCode > 0) {
    Serial.println("Waste bin history saved (timestamp: " + String(timeStr) + "): " + String(httpCode));
  } else {
    Serial.println("Error saving waste bin history: " + http.errorToString(httpCode));
  }
  
  http.end();
}

// MODIFY YOUR sendDataToFirebase() FUNCTION
// Add these two lines to send data to Firebase history:
//
// // Save history data with timestamps - this ensures multiple entries per day
// saveWaterLevelHistory();
// saveWasteBinHistory();