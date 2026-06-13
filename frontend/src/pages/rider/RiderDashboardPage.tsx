import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import riderService, { type DriverProfile, type EarningsData, type RiderOrder } from "@/services/riderService";
import { motion } from "framer-motion";
import {
    Activity,
    ArrowRight,
    CheckCircle,
    DollarSign,
    MapPin,
    Package,
    Star,
    TrendingUp,
    Truck
} from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

const fmt = (n: number) => `৳${n.toLocaleString("en-BD")}`;
const fmtTime = (d: string) =>
  new Date(d).toLocaleTimeString("en-BD", { hour: "2-digit", minute: "2-digit" });

const StatCard: React.FC<{
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  sub?: string;
}> = ({ label, value, icon: Icon, color, sub }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
  >
    <div className="flex items-start justify-between mb-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
    <p className="text-2xl font-bold text-gray-900">{value}</p>
    <p className="text-sm text-gray-500 mt-0.5">{label}</p>
    {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
  </motion.div>
);

const RiderDashboardPage: React.FC = () => {
  const { toast } = useToast();
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [activeOrder, setActiveOrder] = useState<RiderOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [togglingAvailability, setTogglingAvailability] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [profileRes, earningsRes, activeRes] = await Promise.allSettled([
        riderService.getProfile(),
        riderService.getEarnings(),
        riderService.getActiveDelivery(),
      ]);
      if (profileRes.status === "fulfilled") {
        const d = (profileRes.value as { data: { data: { profile: DriverProfile } } }).data;
        setProfile(d.data?.profile ?? null);
      }
      if (earningsRes.status === "fulfilled") {
        const d = (earningsRes.value as { data: { data: EarningsData } }).data;
        setEarnings(d.data ?? null);
      }
      if (activeRes.status === "fulfilled") {
        const d = (activeRes.value as { data: { data: { order: RiderOrder | null } } }).data;
        setActiveOrder(d.data?.order ?? null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const toggleAvailability = async () => {
    if (!profile) return;
    setTogglingAvailability(true);
    try {
      await riderService.setAvailability(!profile.isAvailable);
      setProfile((p) => p ? { ...p, isAvailable: !p.isAvailable } : p);
      toast({
        title: !profile.isAvailable ? "You're now online" : "You're now offline",
        description: !profile.isAvailable
          ? "You'll receive available delivery notifications."
          : "You won't receive new delivery requests.",
      });
    } catch {
      toast({ variant: "destructive", title: "Failed to update availability" });
    } finally {
      setTogglingAvailability(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  // Not approved yet
  if (profile && profile.applicationStatus !== "approved") {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-6">
        <div className="max-w-sm text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center mx-auto">
            <Truck className="w-8 h-8 text-orange-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">
            {profile.applicationStatus === "pending" ? "Application Under Review" : "Application Not Approved"}
          </h2>
          <p className="text-gray-500 text-sm">
            {profile.applicationStatus === "pending"
              ? "Our team is reviewing your application. You'll be notified once approved."
              : <>Your application was not approved. Reason: {profile.rejectionReason ?? "No reason provided"}. Please <Link to="/rider/support" className="text-orange-600 underline font-medium">contact support</Link>.</>}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Availability toggle */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-2xl border p-5 flex items-center justify-between ${
          profile?.isAvailable
            ? "bg-green-50 border-green-200"
            : "bg-gray-50 border-gray-200"
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-3 h-3 rounded-full ${
              profile?.isAvailable ? "bg-green-500 animate-pulse" : "bg-gray-300"
            }`}
          />
          <div>
            <p className="font-semibold text-gray-900">
              {profile?.isAvailable ? "Online — accepting deliveries" : "Offline"}
            </p>
            <p className="text-sm text-gray-500">
              {profile?.isAvailable
                ? "You'll receive new order notifications"
                : "Toggle on to start receiving deliveries"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="availability" className="sr-only">
            Availability
          </Label>
          <Switch
            id="availability"
            checked={profile?.isAvailable ?? false}
            onCheckedChange={toggleAvailability}
            disabled={togglingAvailability}
            className="data-[state=checked]:bg-green-500"
          />
        </div>
      </motion.div>

      {/* Active delivery banner */}
      {activeOrder && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-5 text-white"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium opacity-80">Active Delivery</p>
              <p className="text-lg font-bold mt-1">Order #{activeOrder.orderNumber}</p>
              <p className="text-sm opacity-80 mt-1">
                {typeof activeOrder.restaurantId === "object"
                  ? activeOrder.restaurantId.name
                  : ""}
              </p>
              <Badge className="mt-2 bg-white/20 text-white border-0 capitalize">
                {activeOrder.status.replace(/_/g, " ")}
              </Badge>
            </div>
            <Button asChild size="sm" className="bg-white text-orange-600 hover:bg-orange-50">
              <Link to="/rider/active">
                Continue <ArrowRight className="w-3 h-3 ml-1" />
              </Link>
            </Button>
          </div>
        </motion.div>
      )}

      {/* Today's stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Today's Earnings"
          value={fmt(earnings?.today.earnings ?? 0)}
          icon={DollarSign}
          color="bg-green-50 text-green-600"
        />
        <StatCard
          label="Deliveries Today"
          value={earnings?.today.deliveries ?? 0}
          icon={CheckCircle}
          color="bg-blue-50 text-blue-600"
        />
        <StatCard
          label="Total Earnings"
          value={fmt(earnings?.allTime.earnings ?? 0)}
          icon={TrendingUp}
          color="bg-purple-50 text-purple-600"
          sub={`${earnings?.allTime.deliveries ?? 0} total deliveries`}
        />
        <StatCard
          label="Rating"
          value={profile?.rating.average.toFixed(1) ?? "—"}
          icon={Star}
          color="bg-yellow-50 text-yellow-600"
          sub={`${profile?.rating.count ?? 0} ratings`}
        />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link to="/rider/available">
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4 group cursor-pointer"
          >
            <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center group-hover:bg-orange-100 transition-colors">
              <Package className="w-6 h-6 text-orange-500" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">Available Orders</p>
              <p className="text-sm text-gray-500">Pick up waiting deliveries</p>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
          </motion.div>
        </Link>

        <Link to="/rider/earnings">
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4 group cursor-pointer"
          >
            <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center group-hover:bg-green-100 transition-colors">
              <Activity className="w-6 h-6 text-green-500" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">Earnings Overview</p>
              <p className="text-sm text-gray-500">Track your performance</p>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
          </motion.div>
        </Link>
      </div>

      {/* Recent deliveries */}
      {(earnings?.recentDeliveries?.length ?? 0) > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Recent Deliveries</h3>
            <Link to="/rider/history" className="text-sm text-orange-500 hover:text-orange-600">
              View all
            </Link>
          </div>
          <ul className="divide-y divide-gray-50">
            {earnings!.recentDeliveries.slice(0, 5).map((order) => (
              <li key={order._id} className="flex items-center gap-4 px-5 py-3.5">
                <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4 text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    Order #{order.orderNumber}
                  </p>
                  <p className="text-xs text-gray-500">
                    {order.deliveryAddress?.area} •{" "}
                    {order.actualDeliveryTime ? fmtTime(order.actualDeliveryTime) : ""}
                  </p>
                </div>
                <p className="text-sm font-semibold text-green-600 shrink-0">
                  {fmt((order.deliveryFee ?? 0) + (order.tipAmount ?? 0))}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default RiderDashboardPage;
