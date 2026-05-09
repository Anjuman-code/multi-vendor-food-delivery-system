import adminService from "@/services/adminService";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Range = "7d" | "30d" | "90d" | "365d";

interface RevenueStats {
  timeSeries: Array<{
    date: string;
    gmv: number;
    orders: number;
    revenue: number;
    refunded: number;
  }>;
  totals: {
    gmv: number;
    orders: number;
    platformRevenue: number;
    refunded: number;
    netRevenue: number;
  };
  byPaymentMethod: Array<{ method: string; count: number; total: number }>;
}

const formatBDT = (n: number) => `৳${n.toLocaleString("en-BD")}`;

export default function RevenueReportsPage() {
  const [range, setRange] = useState<Range>("30d");
  const [data, setData] = useState<RevenueStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    adminService
      .getRevenue(range)
      .then((res) => setData((res.data as { data: RevenueStats }).data))
      .finally(() => setLoading(false));
  }, [range]);

  return (
    <div className="space-y-5">
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-xl font-bold text-gray-900">Revenue Reports</h1>
          <p className="text-sm text-gray-500">Platform financial overview</p>
        </div>
        <div className="flex gap-1">
          {(["7d", "30d", "90d", "365d"] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${range === r ? "bg-indigo-600 text-white" : "text-gray-500 hover:bg-gray-100"}`}
            >
              {r}
            </button>
          ))}
        </div>
      </motion.div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-[3px] border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      ) : data ? (
        <>
          {/* KPI tiles */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              {
                label: "GMV",
                value: formatBDT(data.totals.gmv),
                color: "text-indigo-600",
              },
              {
                label: "Orders",
                value: data.totals.orders.toLocaleString(),
                color: "text-violet-600",
              },
              {
                label: "Platform Revenue",
                value: formatBDT(data.totals.platformRevenue),
                color: "text-emerald-600",
              },
              {
                label: "Refunded",
                value: formatBDT(data.totals.refunded),
                color: "text-red-600",
              },
              {
                label: "Net Revenue",
                value: formatBDT(data.totals.netRevenue),
                color: "text-gray-900",
              },
            ].map((t) => (
              <div
                key={t.label}
                className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-center"
              >
                <p className={`text-2xl font-bold ${t.color}`}>{t.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{t.label}</p>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <h2 className="text-sm font-bold text-gray-700 mb-4">
              Daily GMV & Revenue
            </h2>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={data.timeSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(d: string) => d.slice(5)}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "none",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="gmv"
                  stroke="#6366f1"
                  strokeWidth={2}
                  name="GMV"
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="Revenue"
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Payment methods */}
          {data.byPaymentMethod?.length > 0 && (
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <h2 className="text-sm font-bold text-gray-700 mb-4">
                By Payment Method
              </h2>
              <div className="space-y-2">
                {data.byPaymentMethod.map((m) => (
                  <div
                    key={m.method}
                    className="flex items-center justify-between text-sm py-2 border-b border-gray-50 last:border-0"
                  >
                    <span className="capitalize text-gray-700">
                      {m.method.replace(/_/g, " ")}
                    </span>
                    <div className="flex items-center gap-4 text-right">
                      <span className="text-gray-500">{m.count} orders</span>
                      <span className="font-medium text-gray-900">
                        {formatBDT(m.total)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
