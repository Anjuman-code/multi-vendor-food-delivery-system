import { useToast } from "@/hooks/use-toast";
import riderService, { type EarningsData, type RiderOrder } from "@/services/riderService";
import { motion } from "framer-motion";
import {
    DollarSign,
    MapPin,
    Star,
    TrendingUp,
    Truck,
} from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";

const fmt = (n: number) => `৳${n.toLocaleString("en-BD")}`;
const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-BD", { month: "short", day: "numeric" });
const fmtDateTime = (d: string) =>
  new Date(d).toLocaleDateString("en-BD", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const PeriodCard: React.FC<{
  label: string;
  earnings: number;
  deliveries: number;
  fees: number;
  tips: number;
  accent?: string;
}> = ({ label, earnings, deliveries, fees, tips, accent = "bg-orange-500" }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
  >
    <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">{label}</p>
    <p className="text-3xl font-bold text-gray-900">{fmt(earnings)}</p>
    <p className="text-sm text-gray-500 mt-1">{deliveries} deliveries</p>
    <div className="mt-3 pt-3 border-t border-gray-50 flex gap-4 text-xs text-gray-500">
      <span>Fees: <strong className="text-gray-700">{fmt(fees)}</strong></span>
      <span>Tips: <strong className="text-gray-700">{fmt(tips)}</strong></span>
    </div>
    {/* Progress bar — visual only */}
    <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full ${accent} rounded-full`} style={{ width: `${Math.min(100, (earnings / 5000) * 100)}%` }} />
    </div>
  </motion.div>
);

const RiderEarningsPage: React.FC = () => {
  const { toast } = useToast();
  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [history, setHistory] = useState<RiderOrder[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadEarnings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await riderService.getEarnings();
      const d = (res as { data: { data: EarningsData } }).data;
      setEarnings(d.data ?? null);
    } catch {
      toast({ variant: "destructive", title: "Failed to load earnings" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const loadHistory = useCallback(async (page: number) => {
    setHistoryLoading(true);
    try {
      const res = await riderService.getDeliveryHistory({ page, limit: 20 });
      const d = (res as { data: { data: { deliveries: RiderOrder[]; pagination: { total: number } } } }).data;
      setHistory(d.data?.deliveries ?? []);
      setHistoryTotal(d.data?.pagination?.total ?? 0);
      setHistoryPage(page);
    } catch {
      toast({ variant: "destructive", title: "Failed to load delivery history" });
    } finally {
      setHistoryLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadEarnings();
    void loadHistory(1);
  }, [loadEarnings, loadHistory]);

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-32 bg-gray-100 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  // Weekly chart — bar chart using raw divs
  const maxDayEarnings = Math.max(...(earnings?.weeklyBreakdown ?? []).map((d) => d.earnings), 1);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Earnings</h1>

      {/* Period cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {earnings && (
          <>
            <PeriodCard label="Today" accent="bg-blue-500" {...earnings.today} />
            <PeriodCard label="This Week" accent="bg-orange-500" {...earnings.thisWeek} />
            <PeriodCard label="This Month" accent="bg-purple-500" {...earnings.thisMonth} />
          </>
        )}
      </div>

      {/* All-time summary */}
      {earnings && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Earned", value: fmt(earnings.allTime.earnings), icon: DollarSign, color: "text-green-600 bg-green-50" },
            { label: "Total Deliveries", value: String(earnings.allTime.deliveries), icon: Truck, color: "text-blue-600 bg-blue-50" },
          ].map((stat) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Weekly bar chart */}
      {earnings && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-orange-500" />
            This Week
          </h3>
          <div className="flex items-end gap-2 h-24">
            {earnings.weeklyBreakdown.map((day) => {
              const heightPct = maxDayEarnings > 0 ? (day.earnings / maxDayEarnings) * 100 : 0;
              return (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-1.5">
                  <div
                    className="w-full bg-orange-100 rounded-t-md relative group"
                    style={{ height: `${Math.max(4, heightPct)}%` }}
                  >
                    {day.earnings > 0 && (
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        {fmt(day.earnings)}
                      </div>
                    )}
                    <div
                      className="absolute inset-0 bg-orange-400 rounded-t-md"
                      style={{ height: "100%" }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-400">
                    {new Date(day.date).toLocaleDateString("en-BD", { weekday: "short" })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Delivery history */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Delivery History</h3>
          <p className="text-sm text-gray-500 mt-0.5">{historyTotal} completed deliveries</p>
        </div>

        {historyLoading ? (
          <div className="p-5 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : history.length === 0 ? (
          <div className="p-12 text-center">
            <Star className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">No deliveries yet</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {history.map((order) => {
              const restaurant =
                typeof order.restaurantId === "object" ? order.restaurantId : null;
              return (
                <li key={order._id} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      #{order.orderNumber}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {restaurant?.name ?? ""}
                      {order.deliveryAddress?.area ? ` → ${order.deliveryAddress.area}` : ""}
                      {order.actualDeliveryTime ? ` • ${fmtDateTime(order.actualDeliveryTime)}` : ""}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-green-600 shrink-0">
                    {fmt((order.deliveryFee ?? 0) + (order.tipAmount ?? 0))}
                  </p>
                </li>
              );
            })}
          </ul>
        )}

        {/* Pagination */}
        {historyTotal > 20 && (
          <div className="p-4 flex justify-center gap-3 border-t border-gray-50">
            <button
              disabled={historyPage === 1 || historyLoading}
              onClick={() => void loadHistory(historyPage - 1)}
              className="px-4 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
            >
              Previous
            </button>
            <span className="px-3 py-1.5 text-sm text-gray-500">
              Page {historyPage} of {Math.ceil(historyTotal / 20)}
            </span>
            <button
              disabled={historyPage >= Math.ceil(historyTotal / 20) || historyLoading}
              onClick={() => void loadHistory(historyPage + 1)}
              className="px-4 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RiderEarningsPage;
