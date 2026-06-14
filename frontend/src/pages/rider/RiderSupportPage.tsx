import { EmptyState, PageHeader, SectionCard, StatusBadge } from "@/components/rider";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import supportService from "@/services/supportService";
import type { SupportTicket, TicketStatus } from "@/types/support";
import { TICKET_STATUS_LABELS, TICKET_TYPE_LABELS } from "@/types/support";
import { formatDateTime } from "@/utils/format";
import {
  Bike,
  CreditCard,
  HelpCircle,
  Loader2,
  MessageSquare,
  Package,
  Plus,
  User,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const QUICK_ACTIONS = [
  { type: "order_issue", label: "Delivery issue", description: "Problem with a delivery", icon: Bike, tint: "bg-blue-50 text-blue-600" },
  { type: "refund_request", label: "Payment problem", description: "Earnings or payout issue", icon: CreditCard, tint: "bg-emerald-50 text-emerald-600" },
  { type: "account_issue", label: "Account issue", description: "Problem with your account", icon: User, tint: "bg-rose-50 text-rose-600" },
  { type: "general", label: "Platform bug", description: "Report a technical issue", icon: Package, tint: "bg-purple-50 text-purple-600" },
  { type: "general", label: "General inquiry", description: "Anything else", icon: HelpCircle, tint: "bg-muted text-muted-foreground" },
] as const;

const STATUS_TONE: Record<TicketStatus, "warning" | "info" | "brand" | "success" | "neutral"> = {
  open: "warning",
  in_progress: "info",
  waiting_on_user: "brand",
  resolved: "success",
  closed: "neutral",
};

export default function RiderSupportPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    const res = await supportService.getMyTickets();
    if (res.success && res.data) setTickets(res.data.tickets);
    else
      toast({
        title: "Error",
        description: res.message || "Failed to load tickets.",
        variant: "destructive",
      });
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    void fetchTickets();
  }, [fetchTickets]);

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4 sm:p-6">
      <PageHeader
        title="Help & support"
        subtitle="Get help with deliveries, payments and your account"
        actions={
          <Button asChild size="sm">
            <Link to="/rider/support/new">
              <Plus className="mr-1.5 h-4 w-4" /> New ticket
            </Link>
          </Button>
        }
      />

      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          What can we help with?
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {QUICK_ACTIONS.map((a) => (
            <Link
              key={`${a.type}-${a.label}`}
              to={`/rider/support/new?type=${a.type}`}
              className="group rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-brand-300 hover:bg-accent/40"
            >
              <span
                className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg ${a.tint}`}
              >
                <a.icon className="h-5 w-5" />
              </span>
              <p className="text-sm font-semibold text-foreground">{a.label}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {a.description}
              </p>
            </Link>
          ))}
        </div>
      </div>

      <SectionCard title="My tickets" flush>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
          </div>
        ) : tickets.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="No tickets yet"
            description="When you contact support, your tickets appear here."
            action={{
              label: "Create your first ticket",
              onClick: () => navigate("/rider/support/new"),
            }}
            className="border-0"
          />
        ) : (
          <ul className="divide-y divide-border">
            {tickets.map((ticket) => (
              <li key={ticket._id}>
                <Link
                  to={`/rider/support/${ticket._id}`}
                  className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                      {ticket.ticketNumber && (
                        <span className="font-mono">{ticket.ticketNumber}</span>
                      )}
                      <span>·</span>
                      <span>{TICKET_TYPE_LABELS[ticket.type]}</span>
                    </div>
                    <p className="truncate font-medium text-foreground">
                      {ticket.subject}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {ticket.messages.length} message
                      {ticket.messages.length !== 1 ? "s" : ""} ·{" "}
                      {formatDateTime(ticket.updatedAt)}
                    </p>
                  </div>
                  <StatusBadge
                    label={TICKET_STATUS_LABELS[ticket.status]}
                    tone={STATUS_TONE[ticket.status]}
                    icon={false}
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
