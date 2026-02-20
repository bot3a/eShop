import { Router } from "express";
import ProductController from "./product_controller.js";
import AuthController from "../auth/auth_controller.js";
import CategoryController from "../category/category_controller.js";
import ReviewRouter from "../review/review_routes.js";

const ProductRoutes = Router();
import { upload } from "../middleware/multer.js";

// Nested route for reviews
ProductRoutes.use("/:productId/reviews", ReviewRouter);

// Route for top 5 cheap products
ProductRoutes.get(
  "/top-5-cheap",
  ProductController.aliasTopProduct,
  ProductController.fetchAllProducts,
);

ProductRoutes.get("/search", ProductController.searchProducts);

// Route for top featured products
ProductRoutes.get(
  "/top-featured",
  ProductController.topFeaturedProduct,
  ProductController.fetchAllProducts,
);

// Route for product statistics
ProductRoutes.get("/product-stats", ProductController.getProductStats);

// Route for all products & create product
ProductRoutes.route("/").get(ProductController.fetchAllProducts);

ProductRoutes.route("/").post(
  AuthController.protect,
  upload.array("images", 3),
  ProductController.validateProductFields,
  // CategoryController.validateCategory,
  ProductController.createProduct,
);

// Route to fetch products by category
ProductRoutes.get("/category/:id", ProductController.fetchProductByCategory);

// Routes for a single product by ID
ProductRoutes.route("/:id")
  .get(ProductController.fetchProduct)
  .put(
    AuthController.protect,
    AuthController.restrictTo("admin"),
    upload.array("images", 3),
    ProductController.updateProduct,
  )
  .delete(
    AuthController.protect,
    AuthController.restrictTo("admin"),
    ProductController.deleteProduct,
  );

export default ProductRoutes;
