import { useToast } from "@/hooks/use-toast";
import React, { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./AuthContext";

const SOCKET_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
  "http://localhost:2002";

// ── Payload shapes ──────────────────────────────────────────────

interface NewOrderPayload {
  _id: string;
  orderNumber: string;
  customerName: string;
  total: number;
}

interface OrderStatusPayload {
  _id: string;
  orderNumber: string;
  newStatus: string;
}

// ── Context type ─────────────────────────────────────────────────

export interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  connectionFailed: boolean;
  /** Number of unread new orders (vendors only). Resets via clearNewOrderCount. */
  newOrderCount: number;
  clearNewOrderCount: () => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  connectionFailed: false,
  newOrderCount: 0,
  clearNewOrderCount: () => {},
});

export const useSocketContext = () => useContext(SocketContext);

// ── Helpers ──────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready: "Ready for Pickup",
  picked_up: "Picked Up",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

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
  const { toast } = useToast();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionFailed, setConnectionFailed] = useState(false);
  const [newOrderCount, setNewOrderCount] = useState(0);

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
  useEffect(() => {
    if (!socket || user?.role !== "vendor") return;

    const handler = (data: NewOrderPayload) => {
      setNewOrderCount((n) => n + 1);
      toast({
        title: "New Order!",
        description: `${data.orderNumber} · ${data.customerName} · ৳${data.total.toLocaleString("en-BD")}`,
      });
      playBeep();
    };

    socket.on("newOrder", handler);
    return () => {
      socket.off("newOrder", handler);
    };
  }, [socket, user?.role, toast]);

  // ── Customer: order status changed ───────────────────────────
  useEffect(() => {
    if (!socket || user?.role !== "customer") return;

    const handler = (data: OrderStatusPayload) => {
      const label = STATUS_LABEL[data.newStatus] ?? data.newStatus;
      toast({
        title: "Order Update",
        description: `Order ${data.orderNumber} is now ${label}.`,
      });
    };

    socket.on("orderStatusUpdate", handler);
    return () => {
      socket.off("orderStatusUpdate", handler);
    };
  }, [socket, user?.role, toast]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        connectionFailed,
        newOrderCount,
        clearNewOrderCount: () => setNewOrderCount(0),
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};
