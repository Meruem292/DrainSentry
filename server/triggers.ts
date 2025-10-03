import { admin, isFirebaseInitialized } from "./firebase";
import { PushNotificationService } from "./notification-service";

// Simple in-memory cooldown to avoid spamming notifications for the same event
const notificationCooldown = new Map<string, number>();
const COOLDOWN_PERIOD_MS = 5 * 60 * 1000; // 5 minutes

function canSendNotification(key: string): boolean {
  const lastSent = notificationCooldown.get(key);
  if (lastSent && Date.now() - lastSent < COOLDOWN_PERIOD_MS) {
    console.log(`Notification for ${key} is on cooldown.`);
    return false;
  }
  notificationCooldown.set(key, Date.now());
  return true;
}

export function initializeTriggers() {
  if (!isFirebaseInitialized) {
    console.warn("TRIGGERS: Skipping initialization because Firebase Admin SDK is not available.");
    return;
  }

  console.log("🔥 Initializing real-time notification triggers...");

  const db = admin.database();
  const usersRef = db.ref("users");

  // Listen for new users being added
  usersRef.on("child_added", (userSnapshot: admin.database.DataSnapshot) => {
    const user = userSnapshot.val();
    if (!user || !user.uid) return;

    const devicesRef = userSnapshot.ref.child("devices");

    // Listen for new devices being added for that user
    devicesRef.on("child_added", (deviceSnapshot: admin.database.DataSnapshot) => {
      const device = deviceSnapshot.val();
      if (!device || !device.id) return;

      const handleNewHistoryEntry = (
        historySnapshot: admin.database.DataSnapshot,
        type: "water_level" | "waste_bin"
      ) => {
        const historyEntry = historySnapshot.val();
        if (!historyEntry) return;

        const isCritical =
          (type === "water_level" && historyEntry.level > 85) ||
          (type === "waste_bin" && historyEntry.fullness > 85);

        if (isCritical) {
          const notificationKey = `${device.id}-${type}`;
          if (!canSendNotification(notificationKey)) {
            return;
          }

          const service = PushNotificationService.getInstance();
          const message =
            type === "water_level"
              ? `Critical water level (${historyEntry.level}%) detected at ${
                  device.name || device.id
                }.`
              : `Waste bin is nearly full (${historyEntry.fullness}%) at ${
                  device.name || device.id
                }.`;

          console.log(`CRITICAL EVENT DETECTED for user ${user.uid}: ${message}`);
          service.sendNotificationToUser(user.uid, {
            type: type,
            message: message,
            severity: "critical",
            deviceId: device.id,
          });
        }
      };

      // Listen for new water level entries, starting from now
      const waterHistoryRef = deviceSnapshot.ref.child("waterLevelHistory");
      waterHistoryRef
        .orderByKey()
        .startAt(new Date().toISOString())
        .on("child_added", (snap: admin.database.DataSnapshot) =>
          handleNewHistoryEntry(snap, "water_level")
        );

      // Listen for new waste bin entries, starting from now
      const wasteHistoryRef = deviceSnapshot.ref.child("wasteBinHistory");
      wasteHistoryRef
        .orderByKey()
        .startAt(new Date().toISOString())
        .on("child_added", (snap: admin.database.DataSnapshot) =>
          handleNewHistoryEntry(snap, "waste_bin")
        );
    });
  });
}