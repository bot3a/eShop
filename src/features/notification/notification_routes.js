import { Router } from "express";
import NotificationController from "./notification_controller.js";
import AuthController from "./../auth/auth_controller.js";

const NotificationRoutes = Router();

NotificationRoutes.use(AuthController.protect);

// Routes for logged-in user
NotificationRoutes.get("/me", NotificationController.getUserNotifications);
NotificationRoutes.patch(
  "/read/:notificationId",
  NotificationController.markNotificationRead,
);

NotificationRoutes.post(
  "/custom",
  NotificationController.sendCustomNotification,
);

NotificationRoutes.post(
  "/send-all",
  NotificationController.broadcastNotification,
);

export default NotificationRoutes;
