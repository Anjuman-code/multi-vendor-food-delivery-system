import express, { Request, Response } from "express";
import "dotenv/config";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";
import rateLimit from "express-rate-limit";

import { connectDatabase } from "./config/database";
import { RATE_LIMITS } from "./config/constants";
import routes from "./routes";
import { errorHandler } from "./middleware/error.middleware";
import Name from "./models/Name";

// ── App setup ────────────────────────────────────────────────────
const app = express();

// ── Security middleware ──────────────────────────────────────────
app.use(helmet());
app.use(mongoSanitize());

// General rate limit
app.use(
  rateLimit({
    windowMs: RATE_LIMITS.GENERAL_API.windowMs,
    max: RATE_LIMITS.GENERAL_API.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: "Too many requests, please try again later",
    },
  }),
);

const corsOptions: cors.CorsOptions = {
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── Database ─────────────────────────────────────────────────────
connectDatabase();

// ── Routes ───────────────────────────────────────────────────────
app.use("/api", routes);

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "OK", timestamp: new Date().toISOString() });
});

// Legacy helper route (kept for backwards compatibility)
app.get("/save/:name", async (req: Request, res: Response) => {
  try {
    const newName = new Name({ name: req.params.name });
    await newName.save();
    res.json({ message: "Name saved successfully", data: newName });
  } catch (_error: unknown) {
    res.status(500).json({ error: "Failed to save name" });
  }
});

// ── Global error handler (must be last) ──────────────────────────
app.use(errorHandler);

// ── Start server ─────────────────────────────────────────────────
const PORT = process.env.PORT || 2002;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;
