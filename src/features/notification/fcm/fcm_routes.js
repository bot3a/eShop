import { Router } from "express";
import FCMController from "./fcm_controller.js";

const FCMRoutes = Router();

FCMRoutes.route("/save-token").post(FCMController.saveFCMToken);
FCMRoutes.route("/read").post(FCMController.markAsRead);

export default FCMRoutes;
