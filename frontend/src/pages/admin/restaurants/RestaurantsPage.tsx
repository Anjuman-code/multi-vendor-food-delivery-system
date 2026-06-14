import {
  ConfirmDialog,
  DataTable,
  type DataTableColumn,
  EmptyState,
  exportToCsv,
  FilterBar,
  PageHeader,
  StatusBadge,
  type StatusTone,
  type SortDir,
} from "@/components/admin";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import adminService from "@/services/adminService";
import { formatDate } from "@/utils/format";
import {
  CheckCircle2,
  Download,
  DoorOpen,
  Star,
  Store,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

interface Restaurant {
  _id: string;
  name: string;
  cuisineType: string[];
  approvalStatus: "pending" | "approved" | "rejected";
  isActive: boolean;
  isTemporarilyClosed: boolean;
  isFeatured?: boolean;
  rating: { average: number; count: number };
  totalOrders: number;
  address: { street?: string; area: string; district: string };
  createdAt: string;
}

interface ApiResponse {
  data: {
    restaurants: Restaurant[];
    pagination: { page: number; pages: number; total: number; limit: number };
  };
}

type DialogType = "approve" | "reject" | "feature" | "close" | "reopen";

const approvalTone: Record<Restaurant["approvalStatus"], StatusTone> = {
  approved: "success",
  pending: "warning",
  rejected: "danger",
};

const stateOf = (r: Restaurant): { label: string; tone: StatusTone } => {
  if (r.approvalStatus !== "approved")
    return {
      label: r.approvalStatus.charAt(0).toUpperCase() + r.approvalStatus.slice(1),
      tone: approvalTone[r.approvalStatus],
    };
  if (r.isTemporarilyClosed) return { label: "Closed", tone: "neutral" };
  if (!r.isActive) return { label: "Inactive", tone: "neutral" };
  return { label: "Live", tone: "success" };
};

export default function RestaurantsPage() {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [search, setSearch] = useState("");
  const [approval, setApproval] = useState("all");
  const [activity, setActivity] = useState("all");
  const [featured, setFeatured] = useState("all");
  const [sort, setSort] = useState<{ key: string; dir: SortDir }>({
    key: "createdAt",
    dir: "desc",
  });

  const [selected, setSelected] = useState<Restaurant | null>(null);
  const [dialog, setDialog] = useState<DialogType | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchRestaurants = useCallback(
    async (p = 1) => {
      setLoading(true);
      try {
        const params: Record<string, unknown> = {
          page: p,
          limit: 20,
          sort: sort.key,
          order: sort.dir,
        };
        if (search) params.search = search;
        if (approval !== "all") params.approvalStatus = approval;
        if (activity !== "all") params.isActive = activity === "active";
        if (featured !== "all") params.isFeatured = featured === "featured";

        const res = await adminService.listRestaurants(params);
        const d = (res.data as ApiResponse).data;
        setRestaurants(d.restaurants);
        setTotal(d.pagination.total);
        setTotalPages(d.pagination.pages);
        setPage(d.pagination.page);
      } catch {
        toast({ title: "Failed to load restaurants", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    },
    [search, approval, activity, featured, sort, toast],
  );

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => fetchRestaurants(1), 300);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [search, approval, activity, featured, sort, fetchRestaurants]);

  const handleAction = async (reason?: string) => {
    if (!selected || !dialog) return;
    const map: Record<DialogType, () => Promise<unknown>> = {
      approve: () => adminService.approveRestaurant(selected._id),
      reject: () => adminService.rejectRestaurant(selected._id, { reason: reason! }),
      feature: () => adminService.featureRestaurant(selected._id),
      close: () => adminService.closeRestaurant(selected._id, { reason: reason! }),
      reopen: () => adminService.reopenRestaurant(selected._id),
    };
    try {
      await map[dialog]();
      toast({ title: "Restaurant updated" });
      await fetchRestaurants(page);
    } catch {
      toast({ title: "Action failed", variant: "destructive" });
      throw new Error("action failed");
    }
  };

  const exportCsv = () =>
    exportToCsv("restaurants", restaurants, [
      { key: "name", header: "Name", value: (r) => r.name },
      {
        key: "location",
        header: "Location",
        value: (r) => `${r.address?.area ?? ""}, ${r.address?.district ?? ""}`,
      },
      { key: "cuisine", header: "Cuisine", value: (r) => (r.cuisineType ?? []).join(" / ") },
      { key: "status", header: "Status", value: (r) => stateOf(r).label },
      { key: "featured", header: "Featured", value: (r) => (r.isFeatured ? "yes" : "no") },
      { key: "rating", header: "Rating", value: (r) => (r.rating?.count ? r.rating.average.toFixed(1) : "") },
      { key: "orders", header: "Orders", value: (r) => String(r.totalOrders ?? 0) },
      { key: "joined", header: "Added", value: (r) => formatDate(r.createdAt) },
    ]);

  const columns: DataTableColumn<Restaurant>[] = [
    {
      key: "name",
      header: "Restaurant",
      sortable: true,
      render: (r) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <Store className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{r.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {r.address?.area}
              {r.address?.district ? `, ${r.address.district}` : ""}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "cuisine",
      header: "Cuisine",
      render: (r) => (
        <span className="text-xs text-muted-foreground">
          {r.cuisineType?.slice(0, 2).join(", ") || "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (r) => {
        const s = stateOf(r);
        return <StatusBadge label={s.label} tone={s.tone} />;
      },
    },
    {
      key: "rating",
      header: "Rating",
      align: "center",
      render: (r) =>
        r.rating?.count ? (
          <span className="inline-flex items-center gap-1 text-sm text-foreground">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            {r.rating.average.toFixed(1)}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "totalOrders",
      header: "Orders",
      align: "right",
      sortable: true,
      render: (r) => <span className="text-muted-foreground">{(r.totalOrders ?? 0).toLocaleString()}</span>,
    },
    {
      key: "featured",
      header: "Featured",
      align: "center",
      render: (r) =>
        r.isFeatured ? (
          <Star className="mx-auto h-4 w-4 fill-brand-500 text-brand-500" aria-label="Featured" />
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "createdAt",
      header: "Added",
      sortable: true,
      render: (r) => <span className="text-muted-foreground">{formatDate(r.createdAt)}</span>,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (r) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          {r.approvalStatus === "pending" && (
            <>
              <IconBtn title="Approve" tone="emerald" onClick={() => { setSelected(r); setDialog("approve"); }}>
                <CheckCircle2 className="h-4 w-4" />
              </IconBtn>
              <IconBtn title="Reject" tone="red" onClick={() => { setSelected(r); setDialog("reject"); }}>
                <XCircle className="h-4 w-4" />
              </IconBtn>
            </>
          )}
          {r.approvalStatus === "approved" &&
            (r.isTemporarilyClosed ? (
              <IconBtn title="Reopen" tone="emerald" onClick={() => { setSelected(r); setDialog("reopen"); }}>
                <DoorOpen className="h-4 w-4" />
              </IconBtn>
            ) : (
              <IconBtn title="Temporarily close" tone="amber" onClick={() => { setSelected(r); setDialog("close"); }}>
                <XCircle className="h-4 w-4" />
              </IconBtn>
            ))}
          <IconBtn
            title={r.isFeatured ? "Unfeature" : "Feature"}
            tone="brand"
            active={r.isFeatured}
            onClick={() => { setSelected(r); setDialog("feature"); }}
          >
            <Star className={`h-4 w-4 ${r.isFeatured ? "fill-current" : ""}`} />
          </IconBtn>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Restaurants"
        description={`${total} total restaurants`}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => navigate("/admin/restaurants/approval-queue")}>
              Approval Queue
            </Button>
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={!restaurants.length}>
              <Download className="mr-1.5 h-4 w-4" /> Export CSV
            </Button>
          </>
        }
      />

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name or area…"
      >
        <Select value={approval} onValueChange={setApproval}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Approval" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All approvals</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Select value={activity} onValueChange={setActivity}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Activity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All activity</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Select value={featured} onValueChange={setFeatured}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Featured" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All restaurants</SelectItem>
            <SelectItem value="featured">Featured only</SelectItem>
            <SelectItem value="not-featured">Not featured</SelectItem>
          </SelectContent>
        </Select>
      </FilterBar>

      <DataTable
        columns={columns}
        data={restaurants}
        getRowId={(r) => r._id}
        loading={loading}
        sort={sort}
        onSortChange={setSort}
        onRowClick={(r) => navigate(`/admin/restaurants/${r._id}`)}
        emptyState={
          <EmptyState
            icon={Store}
            title="No restaurants found"
            description="Try adjusting your search or filters."
            className="border-0"
          />
        }
        pagination={{ page, pages: totalPages, total, onPageChange: (p) => fetchRestaurants(p) }}
      />

      <ConfirmDialog
        open={dialog === "approve"}
        onClose={() => setDialog(null)}
        onConfirm={handleAction}
        title={`Approve ${selected?.name}?`}
        description="The restaurant will go live and customers can place orders."
        confirmLabel="Approve"
        destructive={false}
      />
      <ConfirmDialog
        open={dialog === "reject"}
        onClose={() => setDialog(null)}
        onConfirm={handleAction}
        title={`Reject ${selected?.name}?`}
        description="Provide a reason for rejection to inform the vendor."
        confirmLabel="Reject"
        requireReason
        reasonPlaceholder="Reason for rejection…"
        destructive
      />
      <ConfirmDialog
        open={dialog === "feature"}
        onClose={() => setDialog(null)}
        onConfirm={handleAction}
        title={selected?.isFeatured ? `Unfeature ${selected.name}?` : `Feature ${selected?.name}?`}
        description={
          selected?.isFeatured
            ? "Remove this restaurant from the featured section."
            : "Add this restaurant to the featured section on the homepage."
        }
        confirmLabel={selected?.isFeatured ? "Unfeature" : "Feature"}
        destructive={false}
      />
      <ConfirmDialog
        open={dialog === "close"}
        onClose={() => setDialog(null)}
        onConfirm={handleAction}
        title={`Temporarily close ${selected?.name}?`}
        description="The restaurant will be unavailable to customers until reopened."
        confirmLabel="Close"
        requireReason
        reasonPlaceholder="Reason for closure…"
        destructive={false}
      />
      <ConfirmDialog
        open={dialog === "reopen"}
        onClose={() => setDialog(null)}
        onConfirm={handleAction}
        title={`Reopen ${selected?.name}?`}
        description="The restaurant will become available to customers again."
        confirmLabel="Reopen"
        destructive={false}
      />
    </div>
  );
}

const toneClass = {
  amber: "hover:bg-amber-50 hover:text-amber-600",
  red: "hover:bg-red-50 hover:text-red-600",
  emerald: "hover:bg-emerald-50 hover:text-emerald-600",
  brand: "hover:bg-accent hover:text-brand-500",
} as const;

const IconBtn: React.FC<{
  title: string;
  tone: keyof typeof toneClass;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ title, tone, active, onClick, children }) => (
  <button
    onClick={onClick}
    title={title}
    aria-label={title}
    className={`rounded-lg p-1.5 transition-colors ${
      active ? "bg-accent text-brand-500" : "text-muted-foreground"
    } ${toneClass[tone]}`}
  >
    {children}
  </button>
);
