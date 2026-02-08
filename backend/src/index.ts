import express, { Request, Response } from "express";
import "dotenv/config";
import cors from "cors";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";

import Name from "./models/Name";
import restaurantRoutes from "./routes/restaurantRoutes";
import authRoutes from "./routes/authRoutes";

// ── App setup ────────────────────────────────────────────────────
const app = express();

const corsOptions: cors.CorsOptions = {
  origin: "http://localhost:5173",
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

// ── Database ─────────────────────────────────────────────────────
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("MONGODB_URI is not defined in environment variables");
  process.exit(1);
}

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("MongoDB connected successfully"))
  .catch((error: unknown) => console.error("MongoDB connection error:", error));

// ── Routes ───────────────────────────────────────────────────────
app.use("/api/restaurants", restaurantRoutes);
app.use("/api/auth", authRoutes);

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "OK" });
});

app.get("/save/:name", async (req: Request, res: Response) => {
  try {
    const newName = new Name({ name: req.params.name });
    await newName.save();
    res.json({ message: "Name saved successfully", data: newName });
  } catch (error: unknown) {
    res.status(500).json({ error: "Failed to save name" });
  }
});

// ── Start server ─────────────────────────────────────────────────
const PORT = process.env.PORT || 2002;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;
