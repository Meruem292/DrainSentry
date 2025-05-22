// Add these functions at the end of your Arduino code, before the closing brace

// Save water level history data to Firebase
void saveWaterLevelHistory() {
  if (!deviceRegistered || WiFi.status() != WL_CONNECTED) {
    return;
  }
  
  // Get formatted date for history (YYYY-MM-DD)
  time_t now;
  time(&now);
  struct tm timeinfo;
  localtime_r(&now, &timeinfo);
  char dateStr[11];
  strftime(dateStr, sizeof(dateStr), "%Y-%m-%d", &timeinfo);
  
  // Calculate water level percentage from distance
  float waterLevelPercent = 100 - lastDist1;  // Convert distance to level percentage
  
  // Send data to Firebase
  HTTPClient http;
  String url = firebaseURL + "/users/" + deviceOwnerUserID + "/waterLevelHistory/" + String(dateStr) + "/" + deviceContainerKey + ".json";
  
  // For water level history, simply store the value (no need for a complex object)
  String payload = String(waterLevelPercent);
  
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  
  int httpCode = http.PUT(payload);
  if (httpCode > 0) {
    Serial.println("Water level history saved: " + String(httpCode));
  } else {
    Serial.println("Error saving water level history: " + http.errorToString(httpCode));
  }
  
  http.end();
}

// Save waste bin history data to Firebase
void saveWasteBinHistory() {
  if (!deviceRegistered || WiFi.status() != WL_CONNECTED) {
    return;
  }
  
  // Get formatted date for history (YYYY-MM-DD)
  time_t now;
  time(&now);
  struct tm timeinfo;
  localtime_r(&now, &timeinfo);
  char dateStr[11];
  strftime(dateStr, sizeof(dateStr), "%Y-%m-%d", &timeinfo);
  
  // Send data to Firebase
  HTTPClient http;
  String url = firebaseURL + "/users/" + deviceOwnerUserID + "/wasteBinHistory/" + String(dateStr) + "/" + deviceContainerKey + ".json";
  
  // Create JSON for waste bin history
  DynamicJsonDocument doc(256);
  doc["fullness"] = binFullness;
  doc["weight"] = lastWeight;
  
  String payload;
  serializeJson(doc, payload);
  
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  
  int httpCode = http.PUT(payload);
  if (httpCode > 0) {
    Serial.println("Waste bin history saved: " + String(httpCode));
  } else {
    Serial.println("Error saving waste bin history: " + http.errorToString(httpCode));
  }
  
  http.end();
}

// The modification you need to make to your existing sendDataToFirebase() function:
// Add these two lines at the end of the function:
//
//   // Save history data
//   saveWaterLevelHistory();
//   saveWasteBinHistory();