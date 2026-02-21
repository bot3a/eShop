// app.js
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import mongoSanitize from "mongo-sanitize";

import { setupRoutes } from "./index.js";
import AppError from "./common/utils/appError.js";
import globalErrorHandler from "./common/controllers/error_controller.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ==================== MIDDLEWARE DEFINITIONS ====================

// Security headers and CORS (helmet + cors)
app.use(helmet());
app.use(cors());

// Logging (Morgan) – only in dev/prod
if (["development", "production"].includes(process.env.NODE_ENV)) {
  app.use(morgan("dev"));
}

// Stripe webhook raw body (must come before other body parsers)
app.use("/api/v1/payment/webhook", express.raw({ type: "application/json" }));

// Regular body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sanitization middleware (skips webhook route)
app.use((req, res, next) => {
  if (req.originalUrl === "/api/v1/payment/webhook") return next();

  req.body = mongoSanitize(req.body);
  req.params = mongoSanitize(req.params);

  if (req.query && typeof req.query === "object") {
    Object.keys(req.query).forEach(
      (key) => (req.query[key] = mongoSanitize(req.query[key])),
    );
  }

  next();
});

// ==================== ROUTES ====================

// Health check
app.get("/api/v1/health", (_req, res) => res.send("Server is running!"));

// API Routes (imported from routes/index.js)
setupRoutes(app);

// SPA fallback for production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../client/build")));
  app.use((req, res, _next) => {
    res.sendFile(path.join(__dirname, "../client/build", "index.html"));
  });
}

// 404 handler
app.use((_req, _res, next) => {
  next(new AppError("Cannot find route.", 404));
});

// Global error handler
app.use(globalErrorHandler);

export default app;
