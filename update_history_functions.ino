// Improved functions to APPEND history data, not replace it

// Save water level history data to Firebase with timestamp
void saveWaterLevelHistory() {
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
  
  // Format timestamp for unique entry (HH:MM:SS)
  char timeStr[9];
  strftime(timeStr, sizeof(timeStr), "%H:%M:%S", &timeinfo);
  
  // Calculate water level percentage from distance
  float waterLevelPercent = 100 - lastDist1;  // Convert distance to level percentage
  
  // Send data to Firebase - using PUSH to create a new entry with timestamp
  HTTPClient http;
  String url = firebaseURL + "/users/" + deviceOwnerUserID + "/waterLevelHistory/" + String(dateStr) + "/" + deviceContainerKey + ".json";
  
  // Create JSON with timestamp and value
  DynamicJsonDocument doc(256);
  doc["timestamp"] = String(timeStr);
  doc["value"] = waterLevelPercent;
  
  String payload;
  serializeJson(doc, payload);
  
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  
  // Use PATCH to add to existing data
  int httpCode = http.PUT(payload);
  if (httpCode > 0) {
    Serial.println("Water level history saved: " + String(httpCode));
  } else {
    Serial.println("Error saving water level history: " + http.errorToString(httpCode));
  }
  
  http.end();
}

// Save waste bin history data to Firebase with timestamp
void saveWasteBinHistory() {
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
  
  // Format timestamp for unique entry (HH:MM:SS)
  char timeStr[9];
  strftime(timeStr, sizeof(timeStr), "%H:%M:%S", &timeinfo);
  
  // Send data to Firebase - using PUSH to create a new entry with timestamp
  HTTPClient http;
  String url = firebaseURL + "/users/" + deviceOwnerUserID + "/wasteBinHistory/" + String(dateStr) + "/" + deviceContainerKey + ".json";
  
  // Create JSON with timestamp and values
  DynamicJsonDocument doc(256);
  doc["timestamp"] = String(timeStr);
  doc["fullness"] = binFullness;
  doc["weight"] = lastWeight;
  
  String payload;
  serializeJson(doc, payload);
  
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  
  // Use PATCH to add to existing data
  int httpCode = http.PUT(payload);
  if (httpCode > 0) {
    Serial.println("Waste bin history saved: " + String(httpCode));
  } else {
    Serial.println("Error saving waste bin history: " + http.errorToString(httpCode));
  }
  
  http.end();
}

// Add these two lines at the end of your sendDataToFirebase() function:
//
// // Save history data
// saveWaterLevelHistory();
// saveWasteBinHistory();