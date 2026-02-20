import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

import { connectDB } from "./common/config/db.js";
import "./common/config/firebase.js";

import express, { json, urlencoded } from "express";
import path from "path";
import morgan from "morgan";
import helmet from "helmet";
import AppError from "./common/utils/appError.js";
import globalErrorHandler from "./common/controllers/error_controller.js";
import Stripe from "stripe";
import cors from "cors";
import mongoSanitize from "mongo-sanitize";

// Routes & controllers
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
import TrackingRoutes from "./features/order/tracking/tracking_routes.js";
import WishListRoutes from "./features/wishlist/wishlist_routes.js";

const app = express();
const __dirname = path.resolve();

const PORT = process.env.PORT || 3000;
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-09-30.clover",
});

// Special handling: Stripe webhook needs raw body BEFORE any body parsing middleware
// Apply raw body parser conditionally only to webhook endpoint
app.use(
  "/api/v1/payment",
  (req, res, next) => {
    if (req.originalUrl === "/api/v1/payment/webhook") {
      express.raw({ type: "application/json" })(req, res, next);
    } else {
      express.json()(req, res, next); // parse json for non-webhook routes
    }
  },
  PaymentRoutes,
);

// Security & CORS
app.use(helmet());
app.use(cors());

// Logging
if (["development", "production"].includes(process.env.NODE_ENV)) {
  app.use(morgan("dev"));
}

// Sanitize requests (skip for webhook since it uses raw body)
app.use((req, _res, next) => {
  // Skip sanitization for webhook since it's already parsed as raw
  if (req.originalUrl === "/api/v1/payment/webhook") {
    return next();
  }

  req.body = mongoSanitize(req.body);
  req.params = mongoSanitize(req.params);
  if (typeof req.query === "object" && req.query !== null) {
    Object.keys(req.query).forEach(
      (key) => (req.query[key] = mongoSanitize(req.query[key])),
    );
  }
  next();
});

// JSON & URL-encoded parsers for other routes
app.use(json());
app.use(urlencoded({ extended: true }));

// Health check
app.get("/api/v1/health", (_req, res) => res.send("Server is running!"));

// API Routes
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
app.use("/api/v1/tracking", TrackingRoutes);

// SPA fallback for production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "client/build")));

  // No path, just middleware for unmatched routes
  app.use((req, res, next) => {
    res.sendFile(path.join(__dirname, "client/build", "index.html"));
  });
}

// 404 handler (must be after all routes including SPA fallback)
app.use((_req, _res, next) => {
  next(new AppError("Cannot find route.", 404));
});

// Global error handler
app.use(globalErrorHandler);

// Start server AFTER all middleware/routes are registered
const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server is up and running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
};

startServer();
