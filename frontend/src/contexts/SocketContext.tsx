import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/lib/toast";
import type { DeliveryStage } from "@/types/order";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
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

export interface TypingPayload {
  orderId: string;
  channel: string;
  isTyping: boolean;
  userId: string;
  role: string;
}

// ── Context type ─────────────────────────────────────────────────

export interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  connectionFailed: boolean;
  /** Number of unread new orders (vendors only). Resets via clearNewOrderCount. */
  newOrderCount: number;
  clearNewOrderCount: () => void;
  /** Live driver location keyed by orderId — available to every role. */
  orderLocations: Record<string, DriverLocationPayload>;
  /** Live ETA (minutes) keyed by orderId. */
  orderEtas: Record<string, number>;
  /** Live fine-grained delivery stage keyed by orderId. */
  orderStages: Record<string, DeliveryStage>;
  /** Back-compat: the most recent driver location update (any order). */
  driverLocation: DriverLocationPayload | null;
  /** Join an order room to receive its location/stage/eta/chat events. */
  joinOrderRoom: (orderId: string) => void;
  /** Leave an order room when no longer viewing it. */
  leaveOrderRoom: (orderId: string) => void;
  /** Back-compat alias of joinOrderRoom. */
  watchOrderLocation: (orderId: string) => void;
  /** Emit an ephemeral typing indicator on an order chat channel. */
  emitTyping: (orderId: string, channel: string, isTyping: boolean) => void;
}

const noop = () => {};

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  connectionFailed: false,
  newOrderCount: 0,
  clearNewOrderCount: noop,
  orderLocations: {},
  orderEtas: {},
  orderStages: {},
  driverLocation: null,
  joinOrderRoom: noop,
  leaveOrderRoom: noop,
  watchOrderLocation: noop,
  emitTyping: noop,
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
  const [orderLocations, setOrderLocations] = useState<
    Record<string, DriverLocationPayload>
  >({});
  const [orderEtas, setOrderEtas] = useState<Record<string, number>>({});
  const [orderStages, setOrderStages] = useState<Record<string, DeliveryStage>>(
    {},
  );
  const [driverLocation, setDriverLocation] =
    useState<DriverLocationPayload | null>(null);

  // Rooms we've asked to join, so we can re-join after a reconnect.
  const joinedRooms = useRef<Set<string>>(new Set());

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
      // Re-join any order rooms after a reconnect.
      joinedRooms.current.forEach((orderId) => s.emit("joinOrderRoom", orderId));
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

  // ── All roles: live order telemetry (location / eta / stage) ──
  useEffect(() => {
    if (!socket) return;

    const onLocation = (data: DriverLocationPayload) => {
      setOrderLocations((prev) => ({ ...prev, [data.orderId]: data }));
      setDriverLocation(data);
    };
    const onEta = (data: { _id: string; etaMinutes: number }) => {
      if (typeof data?.etaMinutes === "number")
        setOrderEtas((prev) => ({ ...prev, [data._id]: data.etaMinutes }));
    };
    const onStage = (data: { _id: string; deliveryStage: DeliveryStage }) => {
      if (data?.deliveryStage)
        setOrderStages((prev) => ({ ...prev, [data._id]: data.deliveryStage }));
    };

    socket.on("driver:locationUpdate", onLocation);
    socket.on("order:etaUpdate", onEta);
    socket.on("order:stageUpdate", onStage);
    socket.on("order:riderAssigned", onStage);
    return () => {
      socket.off("driver:locationUpdate", onLocation);
      socket.off("order:etaUpdate", onEta);
      socket.off("order:stageUpdate", onStage);
      socket.off("order:riderAssigned", onStage);
    };
  }, [socket]);

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

  const joinOrderRoom = useCallback(
    (orderId: string) => {
      if (!orderId) return;
      joinedRooms.current.add(orderId);
      if (socket) socket.emit("joinOrderRoom", orderId);
    },
    [socket],
  );

  const leaveOrderRoom = useCallback(
    (orderId: string) => {
      if (!orderId) return;
      joinedRooms.current.delete(orderId);
      if (socket) socket.emit("leaveOrderRoom", orderId);
    },
    [socket],
  );

  const emitTyping = useCallback(
    (orderId: string, channel: string, isTyping: boolean) => {
      if (socket && orderId)
        socket.emit("order:chatTyping", { orderId, channel, isTyping });
    },
    [socket],
  );

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        connectionFailed,
        newOrderCount,
        clearNewOrderCount: () => setNewOrderCount(0),
        orderLocations,
        orderEtas,
        orderStages,
        driverLocation,
        joinOrderRoom,
        leaveOrderRoom,
        watchOrderLocation: joinOrderRoom,
        emitTyping,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};
