import mongoose from "mongoose";
// import dotenv from "dotenv";
// dotenv.config({ path: "./.env" });

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.DB_URL);
    console.log(`✅ Connected to MONGODB: ${conn.connection.host}`);
  } catch (error) {
    console.error("💥 MONGODB connection error", error);
    process.exit(1);
  }
};
