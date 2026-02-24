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

app.use(helmet());
app.use(cors());

if (["development", "production"].includes(process.env.NODE_ENV)) {
  app.use(morgan("dev"));
}

app.use("/api/v1/payment/webhook", express.raw({ type: "application/json" }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

app.get("/api/v1/health", (_req, res) => res.send("Server is running!"));

setupRoutes(app);

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../client/build")));
  app.use((req, res, _next) => {
    res.sendFile(path.join(__dirname, "../client/build", "index.html"));
  });
}

app.use((_req, _res, next) => {
  next(new AppError("Cannot find route.", 404));
});

app.use(globalErrorHandler);

export default app;
