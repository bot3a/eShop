import { Schema, model } from "mongoose";

const fcmTokenSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },
  fcmToken: {
    type: String,
    required: true,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

const FCMToken = model("FCMToken", fcmTokenSchema);
export default FCMToken;
