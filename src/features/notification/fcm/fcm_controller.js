import catchAsync from "../../../common/utils/catchAsync.js";
import AppError from "../../../common/utils/appError.js";

import FCMToken from "./fcm_model.js";
import User from "../../user/user_model.js";

const FCMController = {
  saveFCMToken: catchAsync(async (req, res, next) => {
    const { userId, fcmToken } = req.body;

    if (!fcmToken) return next(new AppError("FCM token is required", 400));

    const user = await User.findById(userId);
    if (!user) return next(new AppError("User not found", 404));

    await FCMToken.findOneAndUpdate(
      { user: userId },
      { fcmToken, updatedAt: Date.now() },
      { upsert: true, new: true },
    );

    res.status(200).json({
      status: "success",
      message: "FCM token saved successfully",
    });
  }),

  markAsRead: catchAsync(async (req, res, next) => {
    const { userId, fcmToken } = req.body;

    if (!fcmToken) return next(new AppError("FCM token is required", 400));

    const user = await User.findById(userId);
    if (!user) return next(new AppError("User not found", 404));

    await FCMToken.findOneAndUpdate(
      { user: userId },
      { fcmToken, updatedAt: Date.now() },
      { upsert: true, new: true },
    );

    res.status(200).json({
      status: "success",
      message: "FCM token saved successfully",
    });
  }),
};

export default FCMController;
