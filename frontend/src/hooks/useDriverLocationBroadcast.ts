/**
 * useDriverLocationBroadcast — streams the rider's GPS position to the customer
 * while a delivery is active.
 *
 * It watches the device location and relays each ping over the socket
 * (`driver:locationUpdate`), which the backend persists and forwards to the
 * order's customer for live tracking. Pings are throttled to avoid hammering
 * the server / draining the battery.
 */
import { useEffect, useRef, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { useSocketContext } from "@/contexts/SocketContext";

export interface BroadcastPosition {
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  accuracy?: number;
}

interface Options {
  /** Minimum gap between relayed pings, in ms. */
  throttleMs?: number;
}

export interface LocationBroadcastState {
  position: BroadcastPosition | null;
  /** Geolocation permission / hardware error, if any. */
  error: string | null;
  /** True while actively watching + broadcasting. */
  active: boolean;
}

export function useDriverLocationBroadcast(
  orderId: string | null | undefined,
  enabled: boolean,
  { throttleMs = 10_000 }: Options = {},
): LocationBroadcastState {
  const { socket } = useSocketContext();
  const { user } = useAuth();
  const [position, setPosition] = useState<BroadcastPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastSentRef = useRef(0);

  useEffect(() => {
    if (!enabled || !orderId || !socket || !user?.id) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("Location is not available on this device.");
      return;
    }

    // Join the order room so the relay reaches the right customer.
    socket.emit("driver:joinOrderRoom", orderId);

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setError(null);
        const next: BroadcastPosition = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          heading: pos.coords.heading ?? undefined,
          speed: pos.coords.speed ?? undefined,
          accuracy: pos.coords.accuracy ?? undefined,
        };
        setPosition(next);

        const now = Date.now();
        if (now - lastSentRef.current < throttleMs) return;
        lastSentRef.current = now;

        socket.emit("driver:locationUpdate", {
          driverId: user.id,
          orderId,
          latitude: next.latitude,
          longitude: next.longitude,
          heading: next.heading,
          speed: next.speed,
          accuracy: next.accuracy,
          timestamp: new Date(now).toISOString(),
        });
      },
      (err) => {
        setError(
          err.code === err.PERMISSION_DENIED
            ? "Location permission denied. Enable it so customers can track you."
            : "Couldn't read your location.",
        );
      },
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 20_000 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [enabled, orderId, socket, user?.id, throttleMs]);

  return { position, error, active: enabled && !!orderId && !error };
}
