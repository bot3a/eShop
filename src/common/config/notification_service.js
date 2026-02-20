import Notification from "./../../features/notification/notification_model.js";
import FCMToken from "./../../features/notification/fcm/fcm_model.js";
import { sendPushNotification } from "../../common/config/fcmService.js";

export const sendCustomNotificationService = async ({
  userId,
  safeTitle,
  safeBody,
  safeType,
}) => {
  if (!userId) return null;

  // 📝 Save notification
  const notification = await Notification.create({
    user: userId,
    title: safeTitle,
    body: safeBody,
    type: safeType,
  });

  // 📲 Send push notification (non-blocking)
  const fcmTokenDoc = await FCMToken.findOne({ user: userId });
  if (fcmTokenDoc?.fcmToken) {
    try {
      await sendPushNotification(fcmTokenDoc.fcmToken, {
        title: safeTitle,
        body: safeBody,
        type: safeType,
      });
    } catch (error) {
      console.error(
        `Failed to send push notification to user ${userId}:`,
        error.message,
      );
    }
  }
};
