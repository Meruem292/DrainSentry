import { storage } from "./storage";
import { PushNotificationService } from "./notification-service";
import { log } from "./vite";

async function checkAllUsersForCriticalAlerts() {
  log("Running critical alert check cron job...", "cron");
  const notificationService = PushNotificationService.getInstance();

  try {
    const users = await storage.getAllUsers();
    if (!users || users.length === 0) {
      log("No users found to check for alerts.", "cron");
      return;
    }

    for (const user of users) {
      log(`Checking alerts for user ${user.id}...`, "cron");
      await notificationService.checkAndNotifyAlerts(user.id);
    }
  } catch (error) {
    console.error("Error in cron job:", error);
  }
}

export function startCronJobs() {
  log("Starting cron jobs...", "cron");
  // Run every minute
  setInterval(checkAllUsersForCriticalAlerts, 60 * 1000);
  // Run it once at startup as well
  checkAllUsersForCriticalAlerts();
}