import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import supportService from "@/services/supportService";
import type { SupportTicket, TicketStatus } from "@/types/support";
import { TICKET_STATUS_LABELS, TICKET_TYPE_LABELS } from "@/types/support";
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
import { Link } from "react-router-dom";

const QUICK_ACTIONS = [
  {
    type: "restaurant_complaint" as const,
    label: "Restaurant Issue",
    description: "Problem with your restaurant listing",
    icon: Store,
    color: "bg-amber-100 text-amber-600",
  },
  {
    type: "refund_request" as const,
    label: "Payment / Payout",
    description: "Issues with payments or payouts",
    icon: CreditCard,
    color: "bg-emerald-100 text-emerald-600",
  },
  {
    type: "order_issue" as const,
    label: "Order Dispute",
    description: "Problem with a customer order",
    icon: Package,
    color: "bg-blue-100 text-blue-600",
  },
  {
    type: "general" as const,
    label: "Platform Bug",
    description: "Report a bug or technical issue",
    icon: Wrench,
    color: "bg-purple-100 text-purple-600",
  },
  {
    type: "account_issue" as const,
    label: "Account Issue",
    description: "Problems with your vendor account",
    icon: HelpCircle,
    color: "bg-rose-100 text-rose-600",
  },
  {
    type: "general" as const,
    label: "General Inquiry",
    description: "Anything else we can help with",
    icon: MessageSquare,
    color: "bg-gray-100 text-gray-600",
  },
];

const STATUS_COLORS: Record<TicketStatus, string> = {
  open: "bg-amber-100 text-amber-700",
  in_progress: "bg-blue-100 text-blue-700",
  waiting_on_user: "bg-orange-100 text-orange-700",
  resolved: "bg-emerald-100 text-emerald-700",
  closed: "bg-gray-100 text-gray-500",
};

const fmtDate = (d: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(d));

export default function VendorSupportPage() {
  const { toast } = useToast();
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
      <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Help & Support</h1>
            <p className="text-sm text-gray-500">
              Get help with your vendor account and restaurants.
            </p>
          </div>
          <Button asChild className="bg-orange-500 hover:bg-orange-600">
            <Link to="/vendor/support/new">
              <Plus className="h-4 w-4 mr-2" />
              New Ticket
            </Link>
          </Button>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          What can we help with?
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {QUICK_ACTIONS.map((action, idx) => (
            <motion.div
              key={`${action.type}-${action.label}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Link to={`/vendor/support/new?type=${action.type}`}>
                <Card className="p-4 hover:shadow-md transition-all cursor-pointer group h-full">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${action.color} group-hover:scale-110 transition-transform`}
                  >
                    <action.icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-gray-900 text-sm">
                    {action.label}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {action.description}
                  </p>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      {/* My Tickets */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          My Tickets
        </h2>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
          </div>
        ) : tickets.length === 0 ? (
          <Card className="p-10 text-center">
            <MessageSquare className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-1">
              No tickets yet
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              When you contact support, your tickets will appear here.
            </p>
            <Button asChild className="bg-orange-500 hover:bg-orange-600">
              <Link to="/vendor/support/new">Create your first ticket</Link>
            </Button>
          </Card>
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
                  <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {ticket.ticketNumber && (
                            <span className="text-xs font-mono text-gray-400">
                              {ticket.ticketNumber}
                            </span>
                          )}
                          <span className="text-xs text-gray-400">·</span>
                          <span className="text-xs text-gray-400">
                            {TICKET_TYPE_LABELS[ticket.type]}
                          </span>
                        </div>
                        <p className="font-medium text-gray-900 truncate">
                          {ticket.subject}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {ticket.messages.length} message
                          {ticket.messages.length !== 1 ? "s" : ""} ·{" "}
                          {fmtDate(ticket.updatedAt)}
                        </p>
                      </div>
                      <span
                        className={`text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${STATUS_COLORS[ticket.status]}`}
                      >
                        {TICKET_STATUS_LABELS[ticket.status]}
                      </span>
                    </div>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
