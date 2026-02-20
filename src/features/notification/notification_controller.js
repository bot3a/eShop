import catchAsync from "../../common/utils/catchAsync.js";
import AppError from "../../common/utils/appError.js";

import Notification from "./notification_model.js";
import User from "../user/user_model.js";

import FCMToken from "./fcm/fcm_model.js";
import { sendPushNotification } from "../../common/config/fcmService.js";

const NotificationController = {
  // 📥 Get notifications for logged-in user
  getUserNotifications: catchAsync(async (req, res, next) => {
    const userId = req.user.id;

    const notifications = await Notification.find({ user: userId }).sort({
      sent_at: -1,
    });

    res.status(200).json({
      status: "success",
      data: notifications,
    });
  }),

  // ✅ Mark single notification as read
  markNotificationRead: catchAsync(async (req, res, next) => {
    const userId = req.user.id;
    const { notificationId } = req.params;

    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, user: userId },
      { read: true },
      { new: true },
    );

    if (!notification) {
      return next(new AppError("Notification not found", 404));
    }

    res.status(200).json({
      status: "success",
      data: notification,
    });
  }),

  // 📤 Send custom notification to a user
  sendCustomNotification: catchAsync(async (req, res, next) => {
    const { userId, title, body, type } = req.body;

    if (!userId) return next(new AppError("User ID required", 400));

    const user = await User.findById(userId);
    if (!user) return next(new AppError("User not found", 404));

    const safeTitle =
      typeof title === "string" && title.trim() ? title : "Default Title";
    const safeBody =
      typeof body === "string" && body.trim() ? body : "Default Body";
    const safeType = ["order", "message", "reminder", "general"].includes(type)
      ? type
      : "general";

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

    res.status(201).json({
      status: "success",
      message: "Notification sent successfully",
      data: notification,
    });
  }),

  broadcastNotification: catchAsync(async (req, res, next) => {
    const { title, body, type } = req.body;

    const safeTitle =
      typeof title === "string" && title.trim() ? title : "Default Title";
    const safeBody =
      typeof body === "string" && body.trim() ? body : "Default Body";
    const safeType = ["order", "message", "reminder", "general"].includes(type)
      ? type
      : "general";

    // 📌 Get all users
    const users = await User.find({});

    // 📝 Save notifications and send push for each user
    const notifications = [];

    for (const user of users) {
      // Save notification
      const notification = await Notification.create({
        user: user._id,
        title: safeTitle,
        body: safeBody,
        type: safeType,
      });
      notifications.push(notification);

      // Send push notification if FCM token exists
      const fcmTokenDoc = await FCMToken.findOne({ user: user._id });
      if (fcmTokenDoc?.fcmToken) {
        try {
          await sendPushNotification(fcmTokenDoc.fcmToken, {
            title: safeTitle,
            body: safeBody,
            type: safeType,
          });
        } catch (error) {
          console.error(
            `Failed to send push to user ${user._id}:`,
            error.message,
          );
        }
      }
    }

    res.status(201).json({
      status: "success",
      message: "Broadcast notification sent to all users",
      data: notifications,
    });
  }),
};

export default NotificationController;
