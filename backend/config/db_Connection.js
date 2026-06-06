import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
const isProd = String(process.env.NODE_ENV || "").toLowerCase() === "production";

mongoose.set("bufferCommands", false);

const MONGO_OPTIONS = {
  maxPoolSize: Number(process.env.MONGO_MAX_POOL_SIZE || (isProd ? 100 : 50)),
  minPoolSize: Number(process.env.MONGO_MIN_POOL_SIZE || (isProd ? 5 : 2)),
  serverSelectionTimeoutMS: 15000,
  connectTimeoutMS: 15000,
  socketTimeoutMS: 45000,
  // Fail fast when all pool connections are in use (default driver wait is unlimited).
  waitQueueTimeoutMS: Number(process.env.MONGO_WAIT_QUEUE_TIMEOUT_MS || 10000),
  maxIdleTimeMS: 60000,
  autoIndex: !isProd,
};

let dbReady = false;

export function isDbReady() {
  return dbReady && mongoose.connection.readyState === 1;
}

const connectDB = async () => {
  if (!MONGODB_URI) {
    console.error("Error connecting to MongoDB: MONGODB_URI (or MONGO_URI) is not set");
    process.exit(1);
  }

  mongoose.connection.on("error", (err) => {
    console.error("[MongoDB] connection error:", err.message);
    dbReady = false;
  });
  mongoose.connection.on("disconnected", () => {
    console.warn("[MongoDB] disconnected");
    dbReady = false;
  });
  mongoose.connection.on("connected", () => {
    dbReady = true;
  });

  try {
    const conn = await mongoose.connect(MONGODB_URI, MONGO_OPTIONS);
    dbReady = true;
    console.log(`MongoDB Connected: ${conn.connection.host} (pool max ${MONGO_OPTIONS.maxPoolSize})`);

    try {
      const { getRatesMap } = await import("../models/rate/rate.js");
      await getRatesMap();
    } catch (warmupErr) {
      console.warn("[db] rates cache warmup failed:", warmupErr?.message || warmupErr);
    }

  } catch (error) {
    dbReady = false;
    console.error("Error connecting to MongoDB:", error.message);
    process.exit(1);
  }
};

export default connectDB;
