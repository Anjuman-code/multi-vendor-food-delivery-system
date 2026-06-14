import {
  ConfirmDialog,
  DataTable,
  type DataTableColumn,
  EmptyState,
  FilterBar,
  PageHeader,
  SegmentedTabs,
  StatusBadge,
} from "@/components/admin";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/lib/toast";
import adminService from "@/services/adminService";
import { formatDate } from "@/utils/format";
import { CheckCircle2, EyeOff, RotateCcw, Star, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface Review {
  _id: string;
  restaurantId: { name: string } | string;
  userId: { firstName: string; lastName: string; email: string } | string;
  rating: number;
  comment?: string;
  status: "pending" | "published" | "hidden" | "removed";
  createdAt: string;
  moderationNote?: string;
}

const STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "published", label: "Published" },
  { value: "hidden", label: "Hidden" },
  { value: "removed", label: "Removed" },
];

const authorOf = (r: Review) =>
  typeof r.userId === "object" && r.userId
    ? { name: `${r.userId.firstName} ${r.userId.lastName}`, email: r.userId.email }
    : { name: "Unknown", email: "" };

const restaurantOf = (r: Review) =>
  typeof r.restaurantId === "object" && r.restaurantId ? r.restaurantId.name : "—";

const Stars = ({ rating }: { rating: number }) => (
  <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5`}>
    {Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`h-3.5 w-3.5 ${
          i < rating ? "fill-amber-400 text-amber-400" : "fill-muted text-muted-foreground/30"
        }`}
      />
    ))}
  </div>
);

export default function ReviewModerationPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatus] = useState("pending");
  const [rating, setRating] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Review | null>(null);
  const [dialog, setDialog] = useState<"remove" | "hide" | null>(null);

  const fetchReviews = useCallback(
    async (p = 1) => {
      setLoading(true);
      try {
        const res = await adminService.listReviews({
          page: p,
          limit: 20,
          status: status === "all" ? undefined : status,
          rating: rating === "all" ? undefined : rating,
        });
        const d = (
          res.data as {
            data: {
              reviews: Review[];
              pagination: { total: number; pages: number; page: number; limit: number };
            };
          }
        ).data;
        setReviews(d.reviews);
        setTotal(d.pagination.total);
        setTotalPages(d.pagination.pages);
        setPage(d.pagination.page);
      } catch {
        toast.error("Failed to load reviews");
      } finally {
        setLoading(false);
      }
    },
    [status, rating],
  );

  useEffect(() => {
    fetchReviews(1);
  }, [status, rating]);

  const handleApprove = async (r: Review) => {
    try {
      await adminService.approveReview(r._id);
      toast.success(r.status === "hidden" ? "Review restored" : "Review published");
      fetchReviews(page);
    } catch {
      toast.error("Action failed");
    }
  };

  const handleRemove = async (reason?: string) => {
    if (!selected) return;
    try {
      await adminService.removeReview(selected._id, { reason: reason! });
      toast.success("Review removed");
      fetchReviews(page);
    } catch {
      toast.error("Action failed");
      throw new Error("failed");
    }
  };

  const handleHide = async () => {
    if (!selected) return;
    try {
      await adminService.hideReview(selected._id);
      toast.success("Review hidden");
      fetchReviews(page);
    } catch {
      toast.error("Action failed");
      throw new Error("failed");
    }
  };

  // Client-side comment/author search (backend list has no search param).
  const filtered = search.trim()
    ? reviews.filter((r) => {
        const q = search.trim().toLowerCase();
        const a = authorOf(r);
        return (
          (r.comment ?? "").toLowerCase().includes(q) ||
          a.name.toLowerCase().includes(q) ||
          a.email.toLowerCase().includes(q) ||
          restaurantOf(r).toLowerCase().includes(q)
        );
      })
    : reviews;

  const columns: DataTableColumn<Review>[] = [
    {
      key: "author",
      header: "Author",
      render: (r) => {
        const a = authorOf(r);
        return (
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{a.name}</p>
            {a.email && <p className="truncate text-xs text-muted-foreground">{a.email}</p>}
          </div>
        );
      },
    },
    {
      key: "restaurant",
      header: "Restaurant",
      render: (r) => <span className="text-sm text-foreground">{restaurantOf(r)}</span>,
    },
    { key: "rating", header: "Rating", render: (r) => <Stars rating={r.rating} /> },
    {
      key: "comment",
      header: "Comment",
      render: (r) => (
        <div className="max-w-xs">
          <p className="truncate text-sm text-muted-foreground" title={r.comment}>
            {r.comment ?? <span className="italic text-muted-foreground/60">No comment</span>}
          </p>
          {r.moderationNote && (
            <p className="mt-0.5 truncate text-xs text-red-600" title={r.moderationNote}>
              Note: {r.moderationNote}
            </p>
          )}
        </div>
      ),
    },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
    {
      key: "date",
      header: "Date",
      render: (r) => <span className="text-muted-foreground">{formatDate(r.createdAt)}</span>,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (r) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          {r.status === "pending" && (
            <IconBtn title="Publish" tone="emerald" onClick={() => handleApprove(r)}>
              <CheckCircle2 className="h-4 w-4" />
            </IconBtn>
          )}
          {r.status === "hidden" && (
            <IconBtn title="Restore" tone="emerald" onClick={() => handleApprove(r)}>
              <RotateCcw className="h-4 w-4" />
            </IconBtn>
          )}
          {r.status !== "hidden" && r.status !== "removed" && (
            <IconBtn
              title="Hide"
              tone="muted"
              onClick={() => {
                setSelected(r);
                setDialog("hide");
              }}
            >
              <EyeOff className="h-4 w-4" />
            </IconBtn>
          )}
          {r.status !== "removed" && (
            <IconBtn
              title="Remove"
              tone="red"
              onClick={() => {
                setSelected(r);
                setDialog("remove");
              }}
            >
              <Trash2 className="h-4 w-4" />
            </IconBtn>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Review Moderation" description={`${total} total reviews`} />

      <SegmentedTabs value={status} onChange={setStatus} options={STATUS_TABS} />

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search comment, author or restaurant…"
      >
        <Select value={rating} onValueChange={setRating}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All ratings" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All ratings</SelectItem>
            {[5, 4, 3, 2, 1].map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n} star{n > 1 ? "s" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterBar>

      <DataTable
        columns={columns}
        data={filtered}
        getRowId={(r) => r._id}
        loading={loading}
        emptyState={
          <EmptyState
            icon={Star}
            title="No reviews to moderate"
            description="Try adjusting your filters."
            className="border-0"
          />
        }
        pagination={
          search.trim()
            ? undefined
            : { page, pages: totalPages, total, onPageChange: (p) => fetchReviews(p) }
        }
      />

      <ConfirmDialog
        open={dialog === "remove"}
        onClose={() => setDialog(null)}
        onConfirm={handleRemove}
        title="Remove review?"
        description="The review will be permanently removed from the platform."
        confirmLabel="Remove"
        requireReason
        reasonPlaceholder="Reason for removal…"
        destructive
      />
      <ConfirmDialog
        open={dialog === "hide"}
        onClose={() => setDialog(null)}
        onConfirm={handleHide}
        title="Hide review?"
        description="The review will be hidden from customers but not deleted. You can restore it later."
        confirmLabel="Hide"
        destructive={false}
      />
    </div>
  );
}

const toneClass = {
  red: "hover:bg-red-50 hover:text-red-600",
  emerald: "hover:bg-emerald-50 hover:text-emerald-600",
  muted: "hover:bg-muted hover:text-foreground",
} as const;

const IconBtn: React.FC<{
  title: string;
  tone: keyof typeof toneClass;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ title, tone, onClick, children }) => (
  <button
    onClick={onClick}
    title={title}
    aria-label={title}
    className={`rounded-lg p-1.5 text-muted-foreground transition-colors ${toneClass[tone]}`}
  >
    {children}
  </button>
);
