import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/lib/toast";
import React, { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

const SOCKET_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
  "http://localhost:2002";

// ── Payload shapes ──────────────────────────────────────────────

export interface DriverLocationPayload {
  driverId: string;
  orderId: string;
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  timestamp: string;
}

// ── Context type ─────────────────────────────────────────────────

export interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  connectionFailed: boolean;
  /** Number of unread new orders (vendors only). Resets via clearNewOrderCount. */
  newOrderCount: number;
  clearNewOrderCount: () => void;
  /** Last driver location update — available to customers watching an active order */
  driverLocation: DriverLocationPayload | null;
  /** Subscribe to driver location for a specific orderId */
  watchOrderLocation: (orderId: string) => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  connectionFailed: false,
  newOrderCount: 0,
  clearNewOrderCount: () => {},
  driverLocation: null,
  watchOrderLocation: () => {},
});

export const useSocketContext = () => useContext(SocketContext);

// ── Helpers ──────────────────────────────────────────────────────

function playBeep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(660, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  } catch {
    /* AudioContext not available */
  }
}

// ── Provider ─────────────────────────────────────────────────────

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionFailed, setConnectionFailed] = useState(false);
  const [newOrderCount, setNewOrderCount] = useState(0);
  const [driverLocation, setDriverLocation] = useState<DriverLocationPayload | null>(null);

  // One socket per authenticated user — recreate on login/logout
  useEffect(() => {
    if (!user) {
      setSocket(null);
      setIsConnected(false);
      setConnectionFailed(false);
      return;
    }

    // The browser automatically sends the HttpOnly accessToken cookie with
    // the Socket.IO handshake when withCredentials is true — no need to
    // read from localStorage.
    const s = io(SOCKET_URL, {
      withCredentials: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30_000,
      reconnectionAttempts: Infinity,
    });

    s.on("connect", () => {
      setIsConnected(true);
      setConnectionFailed(false);
    });
    s.on("disconnect", () => setIsConnected(false));
    s.on("connect_error", () => {
      setConnectionFailed(true);
      setIsConnected(false);
    });

    setSocket(s);

    return () => {
      s.disconnect();
      setSocket(null);
      setIsConnected(false);
    };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Vendor: new incoming order ───────────────────────────────
  // The user-facing toast is raised centrally by NotificationContext (via the
  // `notification:new` event). Here we only keep the live order-count badge and
  // the audible alert that are specific to the vendor workspace.
  useEffect(() => {
    if (!socket || user?.role !== "vendor") return;

    const handler = () => {
      setNewOrderCount((n) => n + 1);
      playBeep();
    };

    socket.on("newOrder", handler);
    return () => {
      socket.off("newOrder", handler);
    };
  }, [socket, user?.role]);

  // ── Customer: live driver location for active-order tracking ──
  useEffect(() => {
    if (!socket || user?.role !== "customer") return;

    const locationHandler = (data: DriverLocationPayload) => {
      setDriverLocation(data);
    };

    socket.on("driver:locationUpdate", locationHandler);
    return () => {
      socket.off("driver:locationUpdate", locationHandler);
    };
  }, [socket, user?.role]);

  // ── Driver: new delivery available ───────────────────────────
  // Broadcast to available drivers; this has no persisted notification, so the
  // toast + audible alert live here.
  useEffect(() => {
    if (!socket || user?.role !== "driver") return;

    const handler = (data: {
      orderNumber: string;
      restaurantName?: string;
      deliveryFee?: number;
    }) => {
      toast.info("New Delivery Available!", {
        description: `Order ${data.orderNumber}${data.restaurantName ? ` from ${data.restaurantName}` : ""}${data.deliveryFee ? ` · ৳${data.deliveryFee}` : ""}`,
      });
      playBeep();
    };

    socket.on("driver:newDeliveryAvailable", handler);
    return () => {
      socket.off("driver:newDeliveryAvailable", handler);
    };
  }, [socket, user?.role]);

  const watchOrderLocation = (orderId: string) => {
    if (socket) {
      socket.emit("joinOrderRoom", orderId);
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        connectionFailed,
        newOrderCount,
        clearNewOrderCount: () => setNewOrderCount(0),
        driverLocation,
        watchOrderLocation,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};
