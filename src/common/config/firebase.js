import admin from "firebase-admin";
import dotenv from "dotenv";

dotenv.config({ path: "./.env" });

// Check if the Firebase service account variable exists
const base64Key = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

if (!base64Key) {
  console.error(
    "❌ FIREBASE_SERVICE_ACCOUNT_BASE64 is missing in config.env. Firebase will not initialize.",
  );
} else {
  const serviceAccount = JSON.parse(
    Buffer.from(base64Key, "base64").toString("utf8"),
  );

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log("✅ Firebase initialized");
  }
}

export default admin;
