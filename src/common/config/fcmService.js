import admin from "./firebase.js";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

export async function sendPushNotification(fcmToken, payload = {}) {
  if (!fcmToken || typeof fcmToken !== "string") {
    throw new Error("Valid FCM token is required");
  }

  const title = payload.title?.trim() || "Default Title";
  const body = payload.body?.trim() || "Default Body";
  const type = ["order", "message", "reminder", "general"].includes(
    payload.type,
  )
    ? payload.type
    : "general";

  const message = {
    token: fcmToken,
    notification: { title, body },
    data: { type },
  };

  try {
    const response = await admin.messaging().send(message);
    console.log(`Notification sent successfully. Message ID: ${response}`);
    return response;
  } catch (error) {
    console.error("Error sending push notification:", error);
    throw error;
  }
}

export default { sendPushNotification };
