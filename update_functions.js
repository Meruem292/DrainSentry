// This file contains updated functions for both web app and Arduino code

// 1. ARDUINO CODE UPDATES
// Add these functions to your Arduino code to ensure history data is properly saved with timestamps

/*
void saveTimestampedWaterLevelHistory() {
  if (!deviceRegistered || WiFi.status() != WL_CONNECTED) {
    return;
  }
  
  // Get current date and time
  time_t now;
  time(&now);
  struct tm timeinfo;
  localtime_r(&now, &timeinfo);
  
  // Format date (YYYY-MM-DD) for main path
  char dateStr[11];
  strftime(dateStr, sizeof(dateStr), "%Y-%m-%d", &timeinfo);
  
  // Format timestamp (HH_MM_SS) for entry key - using underscore to make it valid for Firebase paths
  char timeStr[9];
  strftime(timeStr, sizeof(timeStr), "%H_%M_%S", &timeinfo);
  
  // Calculate water level percentage from sensor
  float waterLevelPercent = 100 - lastDist1;  // Convert distance to level percentage
  
  // Create URL with timestamp as a unique key under this date and device
  String historyUrl = firebaseURL + "/users/" + deviceOwnerUserID + 
                     "/waterLevelHistory/" + String(dateStr) + "/" + 
                     deviceContainerKey + "/" + String(timeStr) + ".json";
  
  // Create JSON containing the value
  String payload = "{\"value\":" + String(waterLevelPercent) + "}";
  
  HTTPClient http;
  http.begin(historyUrl);
  http.addHeader("Content-Type", "application/json");
  
  int httpCode = http.PUT(payload);
  if (httpCode > 0) {
    Serial.println("Water level history saved with timestamp: " + String(httpCode));
  } else {
    Serial.println("Error saving water level history: " + http.errorToString(httpCode));
  }
  
  http.end();
}

void saveTimestampedWasteBinHistory() {
  if (!deviceRegistered || WiFi.status() != WL_CONNECTED) {
    return;
  }
  
  // Get current date and time
  time_t now;
  time(&now);
  struct tm timeinfo;
  localtime_r(&now, &timeinfo);
  
  // Format date (YYYY-MM-DD) for main path
  char dateStr[11];
  strftime(dateStr, sizeof(dateStr), "%Y-%m-%d", &timeinfo);
  
  // Format timestamp (HH_MM_SS) for entry key
  char timeStr[9];
  strftime(timeStr, sizeof(timeStr), "%H_%M_%S", &timeinfo);
  
  // Create URL with timestamp as a unique key
  String historyUrl = firebaseURL + "/users/" + deviceOwnerUserID + 
                     "/wasteBinHistory/" + String(dateStr) + "/" + 
                     deviceContainerKey + "/" + String(timeStr) + ".json";
  
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
    Serial.println("Waste bin history saved with timestamp: " + String(httpCode));
  } else {
    Serial.println("Error saving waste bin history: " + http.errorToString(httpCode));
  }
  
  http.end();
}

// Call these functions at the end of your sendDataToFirebase() function:
//
// // Save timestamped history data to create multiple entries per day
// saveTimestampedWaterLevelHistory();
// saveTimestampedWasteBinHistory();
*/

// 2. WEB APP CHANGES - WASTE BINS PAGE IMPROVEMENTS
// This ensures charts only show real data with no placeholders

/*
// In your waste-bins.tsx file, replace chart component with this:

{wasteBins && wasteBins.length > 0 ? (
  <div className="h-80 w-full">
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={binHistory.filter(entry => entry.timestamp && entry.fullness !== undefined)}
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="date" 
          tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        />
        <YAxis domain={[0, 100]} />
        <Tooltip 
          formatter={(value) => [`${value}%`, 'Bin Fullness']}
          labelFormatter={(date) => new Date(date).toLocaleDateString()}
        />
        <Bar 
          dataKey="fullness" 
          name="Bin Fullness" 
          fill="#10b981" 
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  </div>
) : (
  <div className="flex items-center justify-center h-72 bg-gray-50 rounded-lg border border-gray-100">
    <div className="text-center">
      <p className="text-gray-500 mb-2">No history data available</p>
      <p className="text-sm text-gray-400">Data will appear here after readings are received</p>
    </div>
  </div>
)}
*/

// 3. IMPROVED HISTORY DATA FETCH FUNCTION
// This ensures we're only displaying real data from Firebase, no dummy or placeholder data

/*
// In dashboard.tsx or wherever you need to fetch history data:

// Fetch actual water level history from Firebase
async function fetchWaterLevelHistory(userId, deviceKey, days = 7) {
  const historyEntries = [];
  const today = new Date();
  
  // Get data for each of the last N days
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    const historyRef = ref(database, `users/${userId}/waterLevelHistory/${dateStr}/${deviceKey}`);
    
    try {
      const snapshot = await get(historyRef);
      if (snapshot.exists()) {
        const dayData = snapshot.val();
        
        // Handle different data formats
        if (typeof dayData === 'object') {
          // If format is multiple timestamped entries for this day
          Object.entries(dayData).forEach(([timeKey, data]) => {
            if (typeof data === 'object' && data.value !== undefined) {
              // Convert timestamp format HH_MM_SS to standard time
              const formattedDate = new Date(`${dateStr}T${timeKey.replace(/_/g, ':')}`);
              
              historyEntries.push({
                date: formattedDate,
                fullDate: formattedDate.toLocaleDateString(),
                value: data.value
              });
            }
          });
        } else if (typeof dayData === 'number') {
          // If format is just a single value for the day
          const formattedDate = new Date(`${dateStr}T12:00:00`);
          historyEntries.push({
            date: formattedDate,
            fullDate: formattedDate.toLocaleDateString(),
            value: dayData
          });
        }
      }
    } catch (error) {
      console.error(`Error fetching history for ${dateStr}:`, error);
    }
  }
  
  // Sort by date
  return historyEntries.sort((a, b) => a.date - b.date);
}
*/