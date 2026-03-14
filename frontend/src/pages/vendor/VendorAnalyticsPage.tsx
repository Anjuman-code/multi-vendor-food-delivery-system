import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Loader2,
  BarChart3,
} from "lucide-react";
import vendorService from "@/services/vendorService";
import type { VendorAnalytics } from "@/types/vendor";

const PERIOD_OPTIONS = [
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "Last 30 Days" },
  { value: "90d", label: "Last 90 Days" },
  { value: "12m", label: "Last 12 Months" },
];

const VendorAnalyticsPage: React.FC = () => {
  const [analytics, setAnalytics] = useState<VendorAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("30d");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const res = await vendorService.getAnalytics(period);
      if (res.success && res.data) {
        setAnalytics(res.data);
      }
      setLoading(false);
    };
    load();
  }, [period]);

  const toSafeNumber = (value: unknown): number => {
    const parsed = typeof value === "number" ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const formatCurrency = (amount: unknown) =>
    `৳${toSafeNumber(amount).toLocaleString("en-BD")}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12 text-gray-500">
        Failed to load analytics data.
      </div>
    );
  }

  const revenueByDay =
    analytics.revenueByDay ??
    analytics.revenueOverTime?.map((point) => ({
      date: point.date,
      revenue: toSafeNumber(point.revenue),
    })) ??
    [];

  const ordersByDay =
    analytics.ordersByDay ??
    analytics.revenueOverTime?.map((point) => ({
      date: point.date,
      count: toSafeNumber(point.orders),
    })) ??
    [];

  const topItems =
    analytics.topItems ??
    analytics.topSellingItems?.map((item) => ({
      name: item.name,
      orderCount: toSafeNumber(item.quantity),
      revenue: toSafeNumber(item.revenue),
    })) ??
    [];

  const totalRevenue = toSafeNumber(analytics.totalRevenue);
  const totalOrders = toSafeNumber(analytics.totalOrders);
  const averageOrderValue = toSafeNumber(analytics.averageOrderValue);

  const sanitizedRevenueByDay = revenueByDay.map((point) => ({
    ...point,
    revenue: toSafeNumber(point.revenue),
  }));

  const sanitizedOrdersByDay = ordersByDay.map((point) => ({
    ...point,
    count: toSafeNumber(point.count),
  }));

  const sanitizedTopItems = topItems.map((item) => ({
    ...item,
    orderCount: toSafeNumber(item.orderCount),
    revenue: toSafeNumber(item.revenue),
  }));

  const maxRevenue = Math.max(
    ...sanitizedRevenueByDay.map((d) => d.revenue),
    1,
  );
  const maxOrders = Math.max(...sanitizedOrdersByDay.map((d) => d.count), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">
            Track your business performance
          </p>
        </div>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="text-sm bg-white border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
        >
          {PERIOD_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-gray-200 p-6"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-green-100 rounded-xl">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-sm text-gray-500">Total Revenue</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(totalRevenue)}
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white rounded-xl border border-gray-200 p-6"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-blue-100 rounded-xl">
              <ShoppingBag className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-sm text-gray-500">Total Orders</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalOrders}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl border border-gray-200 p-6"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-orange-100 rounded-xl">
              <TrendingUp className="w-5 h-5 text-orange-600" />
            </div>
            <span className="text-sm text-gray-500">Avg Order Value</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(averageOrderValue)}
          </p>
        </motion.div>
      </div>

      {/* Revenue Chart (CSS-based bar chart) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-white rounded-xl border border-gray-200 p-6"
      >
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 className="w-5 h-5 text-gray-500" />
          <h3 className="text-lg font-semibold text-gray-900">
            Revenue Over Time
          </h3>
        </div>
        {sanitizedRevenueByDay.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No data available</p>
        ) : (
          <div className="flex items-end gap-1 h-48">
            {sanitizedRevenueByDay.map((d, idx) => {
              const pct = (d.revenue / maxRevenue) * 100;
              return (
                <div
                  key={idx}
                  className="flex-1 flex flex-col items-center gap-1 group"
                >
                  <div className="relative w-full flex justify-center">
                    <div className="absolute -top-8 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                      {formatCurrency(d.revenue)}
                    </div>
                    <div
                      className="w-full max-w-[32px] bg-gradient-to-t from-orange-500 to-red-400 rounded-t transition-all hover:from-orange-600 hover:to-red-500"
                      style={{ height: `${Math.max(pct, 2)}%` }}
                    />
                  </div>
                  {sanitizedRevenueByDay.length <= 14 && (
                    <span className="text-[10px] text-gray-400 -rotate-45 origin-top-left mt-1 whitespace-nowrap">
                      {d.date}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Orders Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-xl border border-gray-200 p-6"
      >
        <div className="flex items-center gap-2 mb-6">
          <ShoppingBag className="w-5 h-5 text-gray-500" />
          <h3 className="text-lg font-semibold text-gray-900">
            Orders Over Time
          </h3>
        </div>
        {sanitizedOrdersByDay.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No data available</p>
        ) : (
          <div className="flex items-end gap-1 h-48">
            {sanitizedOrdersByDay.map((d, idx) => {
              const pct = (d.count / maxOrders) * 100;
              return (
                <div
                  key={idx}
                  className="flex-1 flex flex-col items-center gap-1 group"
                >
                  <div className="relative w-full flex justify-center">
                    <div className="absolute -top-8 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                      {d.count} orders
                    </div>
                    <div
                      className="w-full max-w-[32px] bg-gradient-to-t from-blue-500 to-indigo-400 rounded-t transition-all hover:from-blue-600 hover:to-indigo-500"
                      style={{ height: `${Math.max(pct, 2)}%` }}
                    />
                  </div>
                  {sanitizedOrdersByDay.length <= 14 && (
                    <span className="text-[10px] text-gray-400 -rotate-45 origin-top-left mt-1 whitespace-nowrap">
                      {d.date}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Top Items */}
      {sanitizedTopItems.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white rounded-xl border border-gray-200 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Top Selling Items
          </h3>
          <div className="space-y-3">
            {sanitizedTopItems.map((item, idx) => {
              const maxCount = sanitizedTopItems[0].orderCount || 1;
              const pct = Math.round((item.orderCount / maxCount) * 100);
              return (
                <div key={idx} className="flex items-center gap-3">
                  <span className="w-6 text-sm font-bold text-gray-400 text-right">
                    {idx + 1}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium text-gray-900">
                        {item.name}
                      </span>
                      <span className="text-gray-500">
                        {item.orderCount} orders ·{" "}
                        {formatCurrency(item.revenue)}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default VendorAnalyticsPage;
