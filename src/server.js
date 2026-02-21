// server.js
import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

import { connectDB } from "./common/config/db.js";
import app from "./app.js";

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
};

startServer();
