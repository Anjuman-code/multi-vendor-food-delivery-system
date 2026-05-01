/**
 * Socket.IO server – real-time notifications for vendors and customers.
 *
 * Rooms:
 *   vendor:<userId>  – vendor receives newOrder events
 *   user:<userId>    – customer receives orderStatusUpdate events
 */
import { Server as HTTPServer } from 'http';
import { Socket, Server as SocketServer } from 'socket.io';
import { verifyAccessToken } from './utils/jwt.util';

// ── Module-level singleton ────────────────────────────────────
let io: SocketServer | null = null;

// ── Types ─────────────────────────────────────────────────────
interface SocketData {
  userId: string;
  role: string;
}

export interface NewOrderPayload {
  _id: string;
  orderNumber: string;
  customerName: string;
  total: number;
  items: { name: string; quantity: number }[];
  status: string;
  createdAt: Date;
}

export interface OrderStatusUpdatePayload {
  _id: string;
  orderNumber: string;
  newStatus: string;
  previousStatus: string;
  updatedAt: Date;
}

// ── Initialise ────────────────────────────────────────────────

/** Parse a raw Cookie header string into a key→value map. */
function parseCookieHeader(cookieHeader: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const pair of cookieHeader.split(';')) {
    const idx = pair.indexOf('=');
    if (idx === -1) continue;
    const key = pair.slice(0, idx).trim();
    const value = pair.slice(idx + 1).trim();
    if (key) result[key] = value;
  }
  return result;
}

/**
 * Attach Socket.IO to an existing HTTP server.
 * Call once at startup, before the server starts listening.
 */
export const initSocket = (server: HTTPServer): SocketServer => {
  const allowedOrigins = (
    process.env.CORS_ALLOWED_ORIGINS ||
    process.env.FRONTEND_URL ||
    'http://localhost:5173'
  )
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  io = new SocketServer(server, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
  });

  // ── Authentication middleware ────────────────────────────────
  io.use((socket: Socket, next) => {
    // 1. Explicit token in handshake auth or query (kept for non-browser clients)
    // 2. HttpOnly accessToken cookie sent automatically by the browser
    const cookieHeader = socket.handshake.headers.cookie ?? '';
    const cookieToken = parseCookieHeader(cookieHeader)['accessToken'];

    const token =
      (socket.handshake.auth.token as string | undefined) ||
      (socket.handshake.query.token as string | undefined) ||
      cookieToken;

    if (!token) {
      return next(new Error('Authentication error: no token provided'));
    }

    try {
      const decoded = verifyAccessToken(token);
      (socket.data as SocketData).userId = decoded.userId;
      (socket.data as SocketData).role = decoded.role;
      next();
    } catch {
      next(new Error('Authentication error: invalid or expired token'));
    }
  });

  // ── Connection handler ────────────────────────────────────────
  io.on('connection', (socket: Socket) => {
    const { userId, role } = socket.data as SocketData;

    // Join role-scoped room for targeted delivery
    const room =
      role === 'vendor' ? `vendor:${userId}` : `user:${userId}`;
    void socket.join(room);
  });

  return io;
};

// ── Accessor ──────────────────────────────────────────────────

/** Retrieve the initialised Socket.IO instance (throws if not yet set up). */
export const getIO = (): SocketServer => {
  if (!io) {
    throw new Error('Socket.IO has not been initialised. Call initSocket() first.');
  }
  return io;
};
