import mongoose from "mongoose";
export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.DB_URL);
    console.log(`✅ Connected to MONGODB: ${conn.connection.host}`);
  } catch (error) {
    console.error("💥 MONGODB connection error", error);
    process.exit(1);
  }
};
