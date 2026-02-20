// import admin from "./firebase.js";

// if (!admin.apps.length) {
//   admin.initializeApp({
//     credential: admin.credential.applicationDefault(),
//   });
// }

// /**
//  * Send push notification via FCM
//  * @param {string} fcmToken - Device token
//  * @param {object} payload - { title?: string, body?: string, type?: string }
//  * @returns {Promise<string>} - Message ID returned by FCM
//  */
// export async function sendPushNotification(fcmToken, payload = {}) {
//   if (!fcmToken || typeof fcmToken !== "string") {
//     throw new Error("Valid FCM token is required");
//   }

//   const title =
//     typeof payload.title === "string" && payload.title.trim()
//       ? payload.title
//       : "Default Title";

//   const body =
//     typeof payload.body === "string" && payload.body.trim()
//       ? payload.body
//       : "Default Body";

//   const type =
//     typeof payload.type === "string" && payload.type.trim()
//       ? payload.type
//       : "general";

//   const message = {
//     token: fcmToken,
//     notification: { title, body },
//     data: { type },
//   };

//   try {
//     const response = await admin.messaging().send(message);
//     console.log(`Notification sent successfully. Message ID: ${response}`);
//     return response;
//   } catch (error) {
//     console.error("Error sending push notification:", error);
//     throw error;
//   }
// }

import admin from "./firebase.js";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

/**
 * Send push notification via FCM
 * @param {string} fcmToken - Device token
 * @param {object} payload - { title?: string, body?: string, type?: string }
 * @returns {Promise<string>} - Message ID returned by FCM
 */
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

// Add default export
export default { sendPushNotification };
