import adminService, { ChartRange, DashboardStats } from "@/services/adminService";
import { motion } from "framer-motion";
import {
    AlertTriangle,
    ArrowUpRight,
    CheckCircle,
    Clock,
    Package,
    ShoppingBag,
    Store,
    TrendingDown,
    TrendingUp,
    Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
    CartesianGrid,
    Cell,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

const COLORS = ["#6366f1", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#f97316"];

const fade = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
};

const formatBDT = (n: number) =>
  new Intl.NumberFormat("en-BD", { style: "currency", currency: "BDT", maximumFractionDigits: 0 }).format(n);

const pct = (v: number | null) => {
  if (v === null) return null;
  return { value: Math.abs(v).toFixed(1), up: v >= 0 };
};

// ── KPI Card ────────────────────────────────────────────────────

interface KpiProps {
  title: string;
  value: string;
  sub?: string;
  change?: { value: string; up: boolean } | null;
  icon: React.ElementType;
  iconColor: string;
  delay?: number;
}

const KpiCard: React.FC<KpiProps> = ({ title, value, sub, change, icon: Icon, iconColor, delay = 0 }) => (
  <motion.div
    variants={fade}
    initial="initial"
    animate="animate"
    transition={{ delay, duration: 0.35 }}
    className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
  >
    <div className="flex items-start justify-between mb-4">
      <div className={`p-2.5 rounded-xl ${iconColor}`}>
        <Icon className="w-5 h-5" />
      </div>
      {change !== null && change !== undefined && (
        <span
          className={`flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
            change.up ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
          }`}
        >
          {change.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {change.value}%
        </span>
      )}
    </div>
    <p className="text-2xl font-bold text-gray-900 mb-0.5">{value}</p>
    <p className="text-sm text-gray-500">{title}</p>
    {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
  </motion.div>
);

// ── Pending actions ──────────────────────────────────────────────

interface PendingItem {
  _id: string;
  orderNumber?: string;
  name?: string;
  email?: string;
  priority?: string;
  createdAt?: string;
}

interface PendingActions {
  stuckOrders: PendingItem[];
  pendingRestaurants: PendingItem[];
  urgentTickets: PendingItem[];
}

// ── Main Component ───────────────────────────────────────────────

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [charts, setCharts] = useState<Record<string, unknown[]> | null>(null);
  const [pending, setPending] = useState<PendingActions | null>(null);
  const [range, setRange] = useState<ChartRange>("30d");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [sRes, pRes] = await Promise.all([
          adminService.getDashboardStats(),
          adminService.getPendingActions(),
        ]);
        setStats((sRes.data as { data: DashboardStats }).data);
        setPending((pRes.data as { data: PendingActions }).data);
      } catch {
        // errors shown by httpClient interceptor
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    adminService.getDashboardCharts(range).then((res) => {
      setCharts((res.data as { data: Record<string, unknown[]> }).data);
    });
  }, [range]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-[3px] border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!stats) return null;

  const kpis: KpiProps[] = [
    {
      title: "Gross Merchandise Value",
      value: formatBDT(stats.today.gmv),
      change: pct(stats.changes.gmvPct),
      icon: TrendingUp,
      iconColor: "bg-indigo-50 text-indigo-600",
      delay: 0,
    },
    {
      title: "Platform Revenue",
      value: formatBDT(stats.today.revenue),
      sub: "15% of GMV",
      icon: ArrowUpRight,
      iconColor: "bg-emerald-50 text-emerald-600",
      delay: 0.05,
    },
    {
      title: "Orders Today",
      value: String(stats.today.orders),
      sub: `${stats.today.deliveredOrders} delivered`,
      change: pct(stats.changes.ordersPct),
      icon: ShoppingBag,
      iconColor: "bg-violet-50 text-violet-600",
      delay: 0.1,
    },
    {
      title: "New Customers",
      value: String(stats.today.newCustomers),
      change: pct(stats.changes.customersPct),
      icon: Users,
      iconColor: "bg-sky-50 text-sky-600",
      delay: 0.15,
    },
    {
      title: "Avg. Order Value",
      value: formatBDT(stats.today.avgOrderValue),
      icon: Package,
      iconColor: "bg-amber-50 text-amber-600",
      delay: 0.2,
    },
    {
      title: "Cancellation Rate",
      value: `${stats.today.cancellationRate}%`,
      sub: `${stats.today.cancelledOrders} cancelled`,
      icon: TrendingDown,
      iconColor: stats.today.cancellationRate > 10 ? "bg-red-50 text-red-600" : "bg-gray-50 text-gray-600",
      delay: 0.25,
    },
  ];

  const liveStatuses = Object.entries(stats.liveOperations.activeOrders ?? {}).filter(([, v]) => v > 0);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map((k) => (
          <KpiCard key={k.title} {...k} />
        ))}
      </div>

      {/* Live Ops + Pending Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Live Operations */}
        <motion.div
          variants={fade}
          initial="initial"
          animate="animate"
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-widest">Live Operations</h2>
          </div>
          <div className="space-y-2">
            {liveStatuses.map(([status, count]) => (
              <div key={status} className="flex justify-between items-center text-sm">
                <span className="capitalize text-gray-600">{status.replace(/_/g, " ")}</span>
                <span className="font-bold text-gray-900">{count as number}</span>
              </div>
            ))}
            {liveStatuses.length === 0 && (
              <p className="text-sm text-gray-400 italic">No active orders</p>
            )}
            {stats.liveOperations.stuckPendingOrders > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2 text-amber-600 text-sm">
                <AlertTriangle className="w-4 h-4" />
                <span>{stats.liveOperations.stuckPendingOrders} stuck orders (&gt;10 min)</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Pending Actions */}
        <motion.div
          variants={fade}
          initial="initial"
          animate="animate"
          transition={{ delay: 0.35 }}
          className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm col-span-1 lg:col-span-2"
        >
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-widest mb-4">Requires Attention</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                label: "Restaurant Approvals",
                count: stats.pendingActions.restaurantApprovals,
                icon: Store,
                href: "/admin/restaurants/approval-queue",
                color: "text-violet-600 bg-violet-50",
              },
              {
                label: "Vendor Applications",
                count: stats.pendingActions.vendorApplications,
                icon: Users,
                href: "/admin/users/vendors",
                color: "text-indigo-600 bg-indigo-50",
              },
              {
                label: "Support Tickets",
                count: stats.pendingActions.openSupportTickets,
                icon: AlertTriangle,
                href: "/admin/support",
                color: "text-amber-600 bg-amber-50",
              },
              {
                label: "Driver Applications",
                count: stats.pendingActions.driverApplications,
                icon: Package,
                href: "/admin/users/drivers",
                color: "text-sky-600 bg-sky-50",
              },
            ].map((item) => (
              <Link
                key={item.label}
                to={item.href}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors border border-gray-100"
              >
                <div className={`p-2 rounded-lg ${item.color}`}>
                  <item.icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900">{item.count}</p>
                  <p className="text-xs text-gray-500">{item.label}</p>
                </div>
              </Link>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Charts */}
      {charts && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* Order timeseries */}
          <motion.div
            variants={fade}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.4 }}
            className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-gray-700">Orders & GMV</h2>
              <div className="flex gap-1">
                {(["7d", "30d", "90d"] as ChartRange[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                      range === r ? "bg-indigo-600 text-white" : "text-gray-500 hover:bg-gray-100"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={charts.orderTimeSeries as unknown[]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d: string) => d.slice(5)} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}
                />
                <Line yAxisId="left" type="monotone" dataKey="orders" stroke="#6366f1" strokeWidth={2} dot={false} name="Orders" />
                <Line yAxisId="right" type="monotone" dataKey="gmv" stroke="#10b981" strokeWidth={2} dot={false} name="GMV" />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Cuisine distribution */}
          <motion.div
            variants={fade}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.45 }}
            className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm"
          >
            <h2 className="text-sm font-bold text-gray-700 mb-4">Cuisine Distribution</h2>
            {charts.cuisineDistribution && (charts.cuisineDistribution as unknown[]).length > 0 ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width={180} height={180}>
                  <PieChart>
                    <Pie
                      data={charts.cuisineDistribution as unknown[]}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      strokeWidth={0}
                    >
                      {(charts.cuisineDistribution as unknown[]).map((_: unknown, idx: number) => (
                        <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 10, border: "none" }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1.5 min-w-0">
                  {(charts.cuisineDistribution as Array<{ name: string; count: number }>)
                    .slice(0, 8)
                    .map((c, i) => (
                      <div key={c.name} className="flex items-center gap-2 text-xs">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: COLORS[i % COLORS.length] }}
                        />
                        <span className="text-gray-600 truncate">{c.name}</span>
                        <span className="ml-auto font-bold text-gray-900">{c.count}</span>
                      </div>
                    ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center pt-8">No data yet</p>
            )}
          </motion.div>
        </div>
      )}

      {/* Stuck orders + pending restaurants */}
      {pending && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Stuck Orders */}
          <motion.div
            variants={fade}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.5 }}
            className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm"
          >
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-amber-500" />
              <h2 className="text-sm font-bold text-gray-700">Stuck Orders</h2>
            </div>
            {pending.stuckOrders.length === 0 ? (
              <div className="flex items-center gap-2 text-emerald-600 text-sm">
                <CheckCircle className="w-4 h-4" />
                <span>No stuck orders — all good!</span>
              </div>
            ) : (
              <div className="space-y-2">
                {pending.stuckOrders.map((o) => (
                  <Link
                    key={o._id}
                    to={`/admin/orders/${o._id}`}
                    className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-amber-50 transition-colors text-sm border border-amber-100"
                  >
                    <span className="font-mono font-medium text-gray-700">#{o.orderNumber}</span>
                    <span className="text-amber-600 text-xs">Pending &gt;10 min</span>
                  </Link>
                ))}
              </div>
            )}
          </motion.div>

          {/* Approval Queue */}
          <motion.div
            variants={fade}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.55 }}
            className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4 text-violet-500" />
                <h2 className="text-sm font-bold text-gray-700">Approval Queue</h2>
              </div>
              <Link to="/admin/restaurants/approval-queue" className="text-xs text-indigo-600 hover:underline">
                View all
              </Link>
            </div>
            {pending.pendingRestaurants.length === 0 ? (
              <p className="text-sm text-gray-400">No pending approvals</p>
            ) : (
              <div className="space-y-2">
                {pending.pendingRestaurants.map((r) => (
                  <Link
                    key={r._id}
                    to={`/admin/restaurants/${r._id}`}
                    className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-violet-50 transition-colors text-sm border border-violet-100"
                  >
                    <span className="font-medium text-gray-700 truncate">{r.name}</span>
                    <span className="text-violet-600 text-xs shrink-0 ml-2">Review →</span>
                  </Link>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}
