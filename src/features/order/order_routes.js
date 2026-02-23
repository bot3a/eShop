import { Router } from "express";
import AuthController from "../auth/auth_controller.js";
import OrderController from "./order_controller.js";

const OrderRoutes = Router();

OrderRoutes.use(AuthController.protect);

OrderRoutes.route("/me")
  .post(OrderController.createOrder)
  .get(OrderController.getMyOrders);

OrderRoutes.get(
  "/getAllOrders",
  AuthController.protect,
  OrderController.getAllOrders,
);
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
