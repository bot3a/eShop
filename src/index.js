// routes/index.js
import AuthRoutes from "./features/auth/auth_routes.js";
import UserRoutes from "./features/user/user_routes.js";
import CategoryRoutes from "./features/category/category_routes.js";
import ProductRoutes from "./features/product/product_routes.js";
import CartRoutes from "./features/cart/cart_routes.js";
import OrderRoutes from "./features/order/order_routes.js";
import ReviewRoutes from "./features/review/review_routes.js";
import NotificationRoutes from "./features/notification/notification_routes.js";
import FCMRoutes from "./features/notification/fcm/fcm_routes.js";
import AddressRoutes from "./features/address/address_routes.js";
import UploadRoutes from "./features/upload/upload_routes.js";
import PaymentRoutes from "./features/payment/payment_routes.js";
import WishListRoutes from "./features/wishlist/wishlist_routes.js";

export const setupRoutes = (app) => {
  app.use("/api/v1/auth", AuthRoutes);
  app.use("/api/v1/users", UserRoutes);
  app.use("/api/v1/categories", CategoryRoutes);
  app.use("/api/v1/products", ProductRoutes);
  app.use("/api/v1/carts", CartRoutes);
  app.use("/api/v1/wishlist", WishListRoutes);
  app.use("/api/v1/orders", OrderRoutes);
  app.use("/api/v1/reviews", ReviewRoutes);
  app.use("/api/v1/notification", NotificationRoutes);
  app.use("/api/v1/fcm", FCMRoutes);
  app.use("/api/v1/address", AddressRoutes);
  app.use("/api/v1/upload", UploadRoutes);
  app.use("/api/v1/payment", PaymentRoutes);
};
