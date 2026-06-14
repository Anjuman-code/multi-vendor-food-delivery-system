/**
 * RiderContext — shared rider session state owned by the RiderLayout.
 *
 * Centralises the driver profile, the current active delivery and the
 * availability toggle so the shell header, the dashboard and the active
 * delivery screen all read/write one source of truth instead of each fetching
 * (and drifting) on their own.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { toast } from "@/lib/toast";
import riderService, {
  type DriverProfile,
  type RiderOrder,
} from "@/services/riderService";

interface RiderContextValue {
  profile: DriverProfile | null;
  activeOrder: RiderOrder | null;
  loading: boolean;
  toggling: boolean;
  refresh: () => Promise<void>;
  setActiveOrder: (order: RiderOrder | null) => void;
  toggleAvailability: () => Promise<void>;
}

const RiderContext = createContext<RiderContextValue | null>(null);

export const useRider = (): RiderContextValue => {
  const ctx = useContext(RiderContext);
  if (!ctx) throw new Error("useRider must be used within RiderProvider");
  return ctx;
};

const unwrap = <T,>(res: unknown): T | undefined =>
  (res as { data?: { data?: T } })?.data?.data;

export const RiderProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [activeOrder, setActiveOrder] = useState<RiderOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [profileRes, activeRes] = await Promise.allSettled([
        riderService.getProfile(),
        riderService.getActiveDelivery(),
      ]);
      if (profileRes.status === "fulfilled") {
        setProfile(
          unwrap<{ profile: DriverProfile }>(profileRes.value)?.profile ?? null,
        );
      }
      if (activeRes.status === "fulfilled") {
        setActiveOrder(
          unwrap<{ order: RiderOrder | null }>(activeRes.value)?.order ?? null,
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const toggleAvailability = useCallback(async () => {
    if (!profile) return;
    const next = !profile.isAvailable;
    setToggling(true);
    try {
      await riderService.setAvailability(next);
      setProfile((p) => (p ? { ...p, isAvailable: next } : p));
      toast.success(next ? "You're now online" : "You're now offline", {
        description: next
          ? "You'll receive new delivery requests."
          : "You won't receive new deliveries.",
      });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      toast.error(msg ?? "Couldn't update availability");
    } finally {
      setToggling(false);
    }
  }, [profile]);

  return (
    <RiderContext.Provider
      value={{
        profile,
        activeOrder,
        loading,
        toggling,
        refresh,
        setActiveOrder,
        toggleAvailability,
      }}
    >
      {children}
    </RiderContext.Provider>
  );
};
