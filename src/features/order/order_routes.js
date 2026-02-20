import { Router } from "express";
import AuthController from "../auth/auth_controller.js";
import OrderController from "./order_controller.js";

const OrderRoutes = Router();

OrderRoutes.use(AuthController.protect);

OrderRoutes.post("/me", OrderController.createOrder);
OrderRoutes.get("/me", AuthController.protect, OrderController.getAllOrders);
OrderRoutes.get(
  "/:orderId",
  AuthController.protect,
  OrderController.getOrderById,
);

OrderRoutes.get(
  "/payment/:paymentIntentId",
  OrderController.getOrderByPaymentIntent,
);
OrderRoutes.post("/:orderId", OrderController.updateOrderStatus);

export default OrderRoutes;
