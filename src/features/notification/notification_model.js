import { Schema, model } from "mongoose";
import mongooseOptions from "../../common/utils/mongooseOptions.js";

const notificationSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["order", "message", "reminder", "general"],
      default: "general",
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    sent_at: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  mongooseOptions,
);

const Notification = model("Notification", notificationSchema);

export default Notification;
