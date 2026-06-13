import { Button } from "@/components/ui/button";
import {
  PageHeader,
  SectionCard,
  StatusBadge,
  VendorEmptyState,
  type StatusTone,
} from "@/components/vendor";
import { useToast } from "@/hooks/use-toast";
import supportService from "@/services/supportService";
import type { SupportTicket, TicketStatus } from "@/types/support";
import { TICKET_STATUS_LABELS, TICKET_TYPE_LABELS } from "@/types/support";
import { formatDateTime } from "@/utils/format";
import { motion } from "framer-motion";
import {
  HelpCircle,
  Loader2,
  MessageSquare,
  Package,
  Plus,
  Store,
  CreditCard,
  Wrench,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const QUICK_ACTIONS = [
  {
    type: "restaurant_complaint" as const,
    label: "Restaurant Issue",
    description: "Problem with your restaurant listing",
    icon: Store,
  },
  {
    type: "refund_request" as const,
    label: "Payment / Payout",
    description: "Issues with payments or payouts",
    icon: CreditCard,
  },
  {
    type: "order_issue" as const,
    label: "Order Dispute",
    description: "Problem with a customer order",
    icon: Package,
  },
  {
    type: "general" as const,
    label: "Platform Bug",
    description: "Report a bug or technical issue",
    icon: Wrench,
  },
  {
    type: "account_issue" as const,
    label: "Account Issue",
    description: "Problems with your vendor account",
    icon: HelpCircle,
  },
  {
    type: "general" as const,
    label: "General Inquiry",
    description: "Anything else we can help with",
    icon: MessageSquare,
  },
];

// Status semantics preserved from STATUS_COLORS, rendered via StatusBadge tones.
const STATUS_TONES: Record<TicketStatus, StatusTone> = {
  open: "warning",
  in_progress: "info",
  waiting_on_user: "warning",
  resolved: "success",
  closed: "neutral",
};

export default function VendorSupportPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    const res = await supportService.getMyTickets();
    if (res.success && res.data) {
      setTickets(res.data.tickets);
    } else {
      toast({
        title: "Error",
        description: res.message || "Failed to load tickets.",
        variant: "destructive",
      });
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Help & Support"
        description="Get help with your vendor account and restaurants."
        actions={
          <Button asChild variant="brand">
            <Link to="/vendor/support/new">
              <Plus className="h-4 w-4 mr-2" />
              New Ticket
            </Link>
          </Button>
        }
      />

      {/* Quick Actions */}
      <SectionCard title="What can we help with?">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {QUICK_ACTIONS.map((action, idx) => (
            <motion.div
              key={`${action.type}-${action.label}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Link to={`/vendor/support/new?type=${action.type}`}>
                <div className="group h-full cursor-pointer rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-md">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-primary transition-transform group-hover:scale-110">
                    <action.icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">
                    {action.label}
                  </h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {action.description}
                  </p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </SectionCard>

      {/* My Tickets */}
      <SectionCard title="My Tickets">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : tickets.length === 0 ? (
          <VendorEmptyState
            icon={MessageSquare}
            title="No tickets yet"
            description="When you contact support, your tickets will appear here."
            action={{
              label: "Create your first ticket",
              onClick: () => navigate("/vendor/support/new"),
            }}
          />
        ) : (
          <div className="space-y-2">
            {tickets.map((ticket, idx) => (
              <motion.div
                key={ticket._id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
              >
                <Link to={`/vendor/support/${ticket._id}`}>
                  <div className="cursor-pointer rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-md">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          {ticket.ticketNumber && (
                            <span className="font-mono text-xs text-muted-foreground">
                              {ticket.ticketNumber}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">·</span>
                          <span className="text-xs text-muted-foreground">
                            {TICKET_TYPE_LABELS[ticket.type]}
                          </span>
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
                        tone={STATUS_TONES[ticket.status]}
                        className="flex-shrink-0"
                      />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
