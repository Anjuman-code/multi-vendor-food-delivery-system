import { DataTable, EmptyState, PageHeader, type DataTableColumn } from "@/components/rider";
import { toast } from "@/lib/toast";
import riderService, { type RiderOrder } from "@/services/riderService";
import { formatCurrency, formatDateTime } from "@/utils/format";
import { History } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";

const PAGE_SIZE = 20;

const RiderHistoryPage: React.FC = () => {
  const [rows, setRows] = useState<RiderOrder[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (p: number) => {
      setLoading(true);
      try {
        const res = await riderService.getDeliveryHistory({
          page: p,
          limit: PAGE_SIZE,
        });
        const d = (
          res as unknown as {
            data: {
              data: {
                deliveries: RiderOrder[];
                pagination: { total: number };
              };
            };
          }
        ).data.data;
        setRows(d?.deliveries ?? []);
        setTotal(d?.pagination?.total ?? 0);
        setPage(p);
      } catch {
        toast.error("Failed to load history");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void load(1);
  }, [load]);

  const columns: DataTableColumn<RiderOrder>[] = [
    {
      key: "orderNumber",
      header: "Order",
      render: (o) => (
        <span className="font-medium text-foreground">#{o.orderNumber}</span>
      ),
    },
    {
      key: "restaurant",
      header: "Restaurant",
      render: (o) =>
        typeof o.restaurantId === "object" ? o.restaurantId.name : "—",
    },
    {
      key: "area",
      header: "Dropped at",
      render: (o) => o.deliveryAddress?.area ?? "—",
    },
    {
      key: "date",
      header: "Delivered",
      render: (o) =>
        o.actualDeliveryTime ? formatDateTime(o.actualDeliveryTime) : "—",
    },
    {
      key: "earnings",
      header: "Earned",
      align: "right",
      render: (o) => (
        <span className="font-semibold text-emerald-600">
          {formatCurrency((o.deliveryFee ?? 0) + (o.tipAmount ?? 0))}
        </span>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4 sm:p-6">
      <PageHeader
        title="Delivery history"
        subtitle={`${total} completed deliver${total === 1 ? "y" : "ies"}`}
      />

      <DataTable
        columns={columns}
        data={rows}
        getRowId={(o) => o._id}
        loading={loading}
        emptyState={
          <EmptyState
            icon={History}
            title="No deliveries yet"
            description="Completed deliveries will show up here."
          />
        }
        pagination={{
          page,
          pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
          total,
          onPageChange: (p) => void load(p),
        }}
      />
    </div>
  );
};

export default RiderHistoryPage;
