import { Router } from "express";
import AuthController from "../auth/auth_controller.js";
import WishListController from "./wishlist_controller.js";
const WishListRoutes = Router();

WishListRoutes.use(AuthController.protect);

WishListRoutes.route("/me").get(WishListController.getWishlist);

WishListRoutes.route("/:productId").post(
  WishListController.validateWishListProduct,
  WishListController.addToWishlist,
);

WishListRoutes.route("/add/:productId")
  .post(
    WishListController.validateWishListProduct,
    WishListController.toggleWishlist,
  )
  .delete(
    WishListController.validateWishListProduct,
    WishListController.removeFromWishlist,
  );

export default WishListRoutes;
