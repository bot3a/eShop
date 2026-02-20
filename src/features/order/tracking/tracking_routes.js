import { Router } from "express";
import AuthController from "../../auth/auth_controller.js";
import TrackingController from "./tracking_controller.js";

const TrackingRoutes = Router();

TrackingRoutes.get("/all", TrackingController.getAllTrackingItems);
TrackingRoutes.use(AuthController.protect);

TrackingRoutes.put(
  "/:trackingId/status",
  TrackingController.updateProductStatus
);
TrackingRoutes.get(
  "/:orderId/tracking/:productId",
  TrackingController.getOrderProductTracking
);

export default TrackingRoutes;
