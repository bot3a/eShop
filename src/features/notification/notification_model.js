// import { Schema, model } from "mongoose";
// import mongooseOptions from "../../common/utils/mongooseOptions.js";

// // Sub-schema for a single notification
// const singleNotificationSchema = new Schema(
//   {
//     title: {
//       type: String,
//       required: true,
//       trim: true,
//     },
//     body: {
//       type: String,
//       required: true,
//       trim: true,
//     },
//     type: {
//       type: String,
//       enum: ["order", "message", "reminder", "general"],
//       default: "general",
//     },
//     sent_at: {
//       type: Date,
//       default: Date.now,
//     },
//     read: {
//       type: Boolean,
//       default: false,
//     },
//   },
//   mongooseOptions,
// );

// // Schema for notifications grouped by user
// const notificationSchema = new Schema(
//   {
//     users: [
//       {
//         userId: {
//           type: Schema.Types.ObjectId,
//           ref: "User",
//           required: true,
//         },
//         notifications: [singleNotificationSchema],
//       },
//     ],
//   },
//   mongooseOptions,
// );

// notificationSchema.virtual("id").get(function () {
//   return this._id.toString();
// });

// const Notification = model("Notification", notificationSchema);

// export default Notification;

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
