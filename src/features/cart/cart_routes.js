import { Router } from "express";
import AuthController from "./../auth/auth_controller.js";
import CartController from "./cart_controller.js";
import { validateCartInput } from "././middleware/cart_middleware.js";

const CartRoutes = Router();

CartRoutes.use(AuthController.protect);

CartRoutes.route("/me")
  .get(CartController.getCart)
  .post(validateCartInput, CartController.addToCart)
  .patch(validateCartInput, CartController.updateCart);

CartRoutes.delete("/clear", CartController.clearCart);

CartRoutes.route("/:id").delete(CartController.removeFromCart);

export default CartRoutes;
