import { Router } from "express";
import AuthController from "./../auth/auth_controller.js";
import PaymentController from "./payment_controller.js";

const PaymentRoutes = Router();

PaymentRoutes.route("/create-intent").post(
  AuthController.protect,
  PaymentController.createPaymentIntent,
);

PaymentRoutes.route("/webhook").post(PaymentController.handleWebhook);

export default PaymentRoutes;
