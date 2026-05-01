import cookieParser from 'cookie-parser';
import cors from 'cors';
import 'dotenv/config';
import express, { Express, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import http from 'http';
import path from 'path';
import { mongoSanitiseMiddleware } from './middleware/sanitize.middleware';
import { initSocket } from './socket';

import { RATE_LIMITS } from './config/constants';
import { connectDatabase } from './config/database';
import { errorHandler } from './middleware/error.middleware';
import Name from './models/Name';
import routes from './routes';

// ── App setup ────────────────────────────────────────────────────
const app: Express = express();
app.set('trust proxy', 1);

// ── CORS (must be before other middleware) ──────────────────────
const allowedOrigins = (
  process.env.CORS_ALLOWED_ORIGINS ||
  process.env.FRONTEND_URL ||
  'http://localhost:5173'
)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (no origin header).
    if (!origin) {
      callback(null, true);
      return;
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('CORS: Origin not allowed'));
  },
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

if (process.env.NODE_ENV === 'production') {
  app.use((req: Request, res: Response, next) => {
    const forwardedProto = req.headers['x-forwarded-proto'];
    const isForwardedHttps =
      typeof forwardedProto === 'string' &&
      forwardedProto.split(',')[0].trim() === 'https';

    if (req.secure || isForwardedHttps) {
      next();
      return;
    }

    res.status(400).json({
      success: false,
      message: 'HTTPS is required in production',
    });
  });
}

// ── Security middleware ──────────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);
app.use(mongoSanitiseMiddleware);

// General rate limit
app.use(
  rateLimit({
    windowMs: RATE_LIMITS.GENERAL_API.windowMs,
    max: RATE_LIMITS.GENERAL_API.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: 'Too many requests, please try again later',
    },
  }),
);
app.use(express.json({ limit: '12mb' }));
app.use(express.urlencoded({ extended: true, limit: '12mb' }));
app.use(cookieParser());

// ── Static uploads ───────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ── Database ─────────────────────────────────────────────────────
connectDatabase();

// ── Routes ───────────────────────────────────────────────────────
app.use('/api', routes);

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Legacy helper route (kept for backwards compatibility)
app.get('/save/:name', async (req: Request, res: Response) => {
  try {
    const newName = new Name({ name: req.params.name });
    await newName.save();
    res.json({ message: 'Name saved successfully', data: newName });
  } catch (_error: unknown) {
    res.status(500).json({ error: 'Failed to save name' });
  }
});

// ── Global error handler (must be last) ──────────────────────────
app.use(errorHandler);

// ── Start server ─────────────────────────────────────────────────
const PORT = process.env.PORT || 2002;
const server = http.createServer(app);
initSocket(server);
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;
