/**
 * MongoDB connection setup with event listeners and error handling.
 */
import mongoose from "mongoose";

/** Connect to MongoDB using the URI from environment variables. */
export const connectDatabase = async (): Promise<void> => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error("FATAL: MONGODB_URI is not defined in environment variables");
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB initial connection error:", error);
    process.exit(1);
  }

  // ── Connection event listeners ───────────────────────────────
  mongoose.connection.on("error", (err) => {
    console.error("MongoDB connection error:", err);
  });

  mongoose.connection.on("disconnected", () => {
    console.warn("MongoDB disconnected. Attempting to reconnect…");
  });

  mongoose.connection.on("reconnected", () => {
    console.log("MongoDB reconnected");
  });
};

export default connectDatabase;
