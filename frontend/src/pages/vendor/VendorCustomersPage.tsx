import { useCallback, useEffect, useState } from "react";
import { Repeat, ShoppingBag, Sparkles, Users } from "lucide-react";

import {
  DataTable,
  FilterBar,
  PageHeader,
  StatCard,
  StatusBadge,
  VendorEmptyState,
  type DataTableColumn,
} from "@/components/vendor";
import { toast } from "@/lib/toast";
import vendorService from "@/services/vendorService";
import type {
  VendorCustomer,
  VendorCustomersSummary,
} from "@/types/vendor";
import { formatCurrency, formatDate, formatPercent } from "@/utils/format";

const PER_PAGE = 20;

const EMPTY_SUMMARY: VendorCustomersSummary = {
  totalCustomers: 0,
  newCustomers: 0,
  repeatRate: 0,
  avgOrdersPerCustomer: 0,
};

const VendorCustomersPage = () => {
  const [customers, setCustomers] = useState<VendorCustomer[]>([]);
  const [summary, setSummary] = useState<VendorCustomersSummary>(EMPTY_SUMMARY);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Debounce search input.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await vendorService.getCustomers({
      page,
      limit: PER_PAGE,
      search: debouncedSearch || undefined,
    });
    if (res.success && res.data) {
      setCustomers(res.data.customers);
      setSummary(res.data.summary);
      setPages(res.data.pagination.pages);
      setTotal(res.data.pagination.total);
    } else {
      toast.error("Error", {
        description: res.message || "Failed to load customers",
      });
    }
    setLoading(false);
  }, [page, debouncedSearch]);

  useEffect(() => {
    load();
  }, [load]);

  const columns: DataTableColumn<VendorCustomer>[] = [
    {
      key: "name",
      header: "Customer",
      render: (c) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
            {c.name
              .split(" ")
              .map((n) => n.charAt(0))
              .slice(0, 2)
              .join("")
              .toUpperCase() || "?"}
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{c.name}</p>
            {c.email && (
              <p className="truncate text-xs text-muted-foreground">{c.email}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "orders",
      header: "Orders",
      align: "right",
      render: (c) => <span className="font-medium text-foreground">{c.orders}</span>,
    },
    {
      key: "totalSpent",
      header: "Total spent",
      align: "right",
      render: (c) => (
        <span className="font-semibold text-foreground">
          {formatCurrency(c.totalSpent)}
        </span>
      ),
    },
    {
      key: "lastOrder",
      header: "Last order",
      align: "right",
      render: (c) => (
        <span className="text-muted-foreground">{formatDate(c.lastOrder)}</span>
      ),
    },
    {
      key: "segment",
      header: "Segment",
      render: (c) => <StatusBadge status={c.segment} />,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description="Understand who orders from your restaurants and how often."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total customers"
          value={summary.totalCustomers.toLocaleString()}
          icon={Users}
          accent="brand"
          loading={loading}
        />
        <StatCard
          label="New (30 days)"
          value={summary.newCustomers.toLocaleString()}
          icon={Sparkles}
          loading={loading}
        />
        <StatCard
          label="Repeat rate"
          value={formatPercent(summary.repeatRate)}
          icon={Repeat}
          loading={loading}
          hint="ordered more than once"
        />
        <StatCard
          label="Avg orders / customer"
          value={summary.avgOrdersPerCustomer.toFixed(1)}
          icon={ShoppingBag}
          loading={loading}
        />
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name or email…"
      />

      <DataTable
        columns={columns}
        data={customers}
        getRowId={(c) => c._id}
        loading={loading}
        sort={{ key: "totalSpent", dir: "desc" }}
        pagination={{ page, pages, total, onPageChange: setPage }}
        emptyState={
          <VendorEmptyState
            icon={Users}
            title={debouncedSearch ? "No matching customers" : "No customers yet"}
            description={
              debouncedSearch
                ? "Try a different name or email."
                : "Customers will appear here once you start receiving orders."
            }
            className="border-0"
          />
        }
      />
    </div>
  );
};

export default VendorCustomersPage;
