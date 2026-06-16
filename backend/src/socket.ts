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

export interface DriverLocationPayload {
  driverId: string;
  orderId: string;
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  accuracy?: number;
  batteryLevel?: number;
  timestamp: string;
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
    let room: string;
    if (role === 'vendor') {
      room = `vendor:${userId}`;
    } else if (role === 'driver') {
      room = `driver:${userId}`;
    } else if (role === 'admin' || role === 'support') {
      room = 'admin:room';
    } else {
      room = `user:${userId}`;
    }
    void socket.join(room);

    // Role-agnostic personal room — every user joins `notify:<userId>` so the
    // notification service can push in-app notifications without knowing the
    // recipient's role.
    void socket.join(`notify:${userId}`);

    // Any authenticated party viewing a live order joins its order room so it
    // receives location, stage, ETA and chat events. Per-message/-channel
    // authorization is still enforced by the REST layer.
    socket.on('joinOrderRoom', (orderId: string) => {
      if (typeof orderId === 'string' && orderId) void socket.join(`order:${orderId}`);
    });
    socket.on('leaveOrderRoom', (orderId: string) => {
      if (typeof orderId === 'string' && orderId) void socket.leave(`order:${orderId}`);
    });

    // Back-compat: the rider location-broadcast hook emits this name.
    if (role === 'driver') {
      socket.on('driver:joinOrderRoom', (orderId: string) => {
        if (typeof orderId === 'string' && orderId) void socket.join(`order:${orderId}`);
      });
    }

    // Ephemeral typing indicator — relayed live, never persisted.
    socket.on(
      'order:chatTyping',
      (data: { orderId: string; channel: string; isTyping: boolean }) => {
        if (!data?.orderId) return;
        socket.to(`order:${data.orderId}`).emit('order:chatTyping', {
          orderId: data.orderId,
          channel: data.channel,
          isTyping: !!data.isTyping,
          userId,
          role,
        });
      },
    );

    // Driver location updates — persist and relay to customer
    if (role === 'driver') {
      socket.on('driver:locationUpdate', async (payload: DriverLocationPayload) => {
        try {
          const DriverLocationEvent = (await import('./models/DriverLocationEvent')).default;
          const Order = (await import('./models/Order')).default;

          await DriverLocationEvent.create({
            driverId: payload.driverId,
            orderId: payload.orderId,
            location: {
              type: 'Point',
              coordinates: [payload.longitude, payload.latitude],
            },
            heading: payload.heading,
            speed: payload.speed,
            accuracy: payload.accuracy,
            batteryLevel: payload.batteryLevel,
            timestamp: new Date(payload.timestamp),
          });

          // Relay to the customer who owns this order…
          const order = await Order.findById(payload.orderId).select('customerId');
          if (order) {
            io!.to(`user:${order.customerId.toString()}`).emit('driver:locationUpdate', payload);
          }
          // …and to anyone watching the order room (vendor, admin) plus the
          // admin ops room that drives the live fleet map.
          io!.to(`order:${payload.orderId}`).emit('driver:locationUpdate', payload);
          io!.to('admin:room').emit('driver:locationUpdate', payload);
        } catch {
          // Non-blocking
        }
      });

      // Auto-set unavailable on disconnect while on a delivery
      socket.on('disconnect', async () => {
        try {
          const DriverProfile = (await import('./models/DriverProfile')).default;
          await DriverProfile.updateOne(
            { userId, isAvailable: true },
            { isAvailable: false },
          );
        } catch {
          // Non-blocking
        }
      });
    }
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
