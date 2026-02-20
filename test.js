// import admin from "./firebase.js";

// async function testFCM(token) {
//   try {
//     const message = {
//       token: token,
//       notification: {
//         title: "Test Notification test2",
//         body: "Hello u Node.js!",
//       },
//       data: { type: "TEST" },
//     };
//     const response = await admin.messaging().send(message);
//     console.log("FCM sent successfully:", response);
//   } catch (err) {
//     console.error("FCM Error:", err);
//   }
// }

// testFCM(
//   "dA7iqRdETXicEadPjK6l-_:APA91bGu2vpo5sgFec4FlPPXSVsW4x0EFNPAmS0P3Uu6CbvhjKKIcHczRGj_tyK0JWKAN3cyoa3r9XgKSG9uk-X1b8nlKnpgA5J1oy9ctPNj4N1wQw9a6FU"
// );

import sendFCM from "../notification/fcmService.js";

const userToken = user.fcmToken; // Get the FCM token of the user
if (userToken) {
  await sendTestNotification(
    userToken,
    "Order Created",
    "Your order has been successfully placed.",
    { orderId: newOrder._id.toString(), status: "pending" }
  );
}

async function sendTestNotification() {
  try {
    const response = await sendFCM(
      "dA7iqRdETXicEadPjK6l-_:APA91bGu2vpo5sgFec4FlPPXSVsW4x0EFNPAmS0P3Uu6CbvhjKKIcHczRGj_tyK0JWKAN3cyoa3r9XgKSG9uk-X1b8nlKnpgA5J1oy9ctPNj4N1wQw9a6FU", // Token
      "Test Notification", // Title
      "Hello, this is a test notification!", // Body
      { type: "TEST" } // Optional custom data
    );
    console.log("Notification sent successfully", response);
  } catch (err) {
    console.error("Error sending notification", err);
  }
}
