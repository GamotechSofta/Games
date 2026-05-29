import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
const isProd = String(process.env.NODE_ENV || "").toLowerCase() === "production";

const MONGO_OPTIONS = {
  maxPoolSize: 20,
  minPoolSize: 2,
  serverSelectionTimeoutMS: 15000,
  connectTimeoutMS: 15000,
  socketTimeoutMS: 45000,
  maxIdleTimeMS: 60000,
  autoIndex: !isProd,
};

const connectDB = async () => {
  if (!MONGODB_URI) {
    console.error("Error connecting to MongoDB: MONGODB_URI (or MONGO_URI) is not set");
    process.exit(1);
  }

  mongoose.connection.on("error", (err) => {
    console.error("[MongoDB] connection error:", err.message);
  });
  mongoose.connection.on("disconnected", () => {
    console.warn("[MongoDB] disconnected");
  });

  try {
    const conn = await mongoose.connect(MONGODB_URI, MONGO_OPTIONS);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    try {
      const { getRatesMap } = await import("../models/rate/rate.js");
      await getRatesMap();
    } catch (warmupErr) {
      console.warn("[db] rates cache warmup failed:", warmupErr?.message || warmupErr);
    }
  } catch (error) {
    console.error("Error connecting to MongoDB:", error.message);
    process.exit(1);
  }
};

export default connectDB;
