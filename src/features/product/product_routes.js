import { Router } from "express";
import ProductController from "./product_controller.js";
import AuthController from "../auth/auth_controller.js";

import ReviewRouter from "../review/review_routes.js";

const ProductRoutes = Router();
import { upload } from "../middleware/multer.js";

ProductRoutes.use("/:productId/reviews", ReviewRouter);

ProductRoutes.get(
  "/top-5-cheap",
  ProductController.aliasTopProduct,
  ProductController.fetchAllProducts,
);

ProductRoutes.get("/search", ProductController.searchProducts);

ProductRoutes.get(
  "/top-featured",
  ProductController.topFeaturedProduct,
  ProductController.fetchAllProducts,
);

ProductRoutes.get("/product-stats", ProductController.getProductStats);

ProductRoutes.route("/").get(ProductController.fetchAllProducts);

ProductRoutes.route("/").post(
  AuthController.protect,
  upload.array("images", 3),
  ProductController.validateProductFields,

  ProductController.createProduct,
);

ProductRoutes.get("/category/:id", ProductController.fetchProductByCategory);

ProductRoutes.route("/:id").get(ProductController.fetchProduct);

ProductRoutes.use(AuthController.protect, AuthController.restrictTo("admin"));
ProductRoutes.route("/:id")
  .put(upload.array("images", 3), ProductController.updateProduct)
  .delete(ProductController.deleteProduct);

export default ProductRoutes;
