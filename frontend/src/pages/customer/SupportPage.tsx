import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { toast } from "@/lib/toast";
import supportService from "@/services/supportService";
import type { SupportTicket } from "@/types/support";
import { TICKET_TYPE_LABELS } from "@/types/support";
import { formatDateTime } from "@/utils/format";
import { motion } from "framer-motion";
import {
  Bike,
  CreditCard,
  HelpCircle,
  Loader2,
  MessageSquare,
  Package,
  Plus,
  Store,
  User,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const QUICK_ACTIONS = [
  {
    type: "order_issue" as const,
    label: "Order Issue",
    description: "Problem with a recent order",
    icon: Package,
    color: "bg-blue-100 text-blue-600",
  },
  {
    type: "refund_request" as const,
    label: "Refund Request",
    description: "Request a refund for an order",
    icon: CreditCard,
    color: "bg-emerald-100 text-emerald-600",
  },
  {
    type: "restaurant_complaint" as const,
    label: "Restaurant Issue",
    description: "Report a restaurant problem",
    icon: Store,
    color: "bg-amber-100 text-amber-600",
  },
  {
    type: "driver_complaint" as const,
    label: "Driver Issue",
    description: "Report a delivery problem",
    icon: Bike,
    color: "bg-purple-100 text-purple-600",
  },
  {
    type: "account_issue" as const,
    label: "Account Problem",
    description: "Issues with your account",
    icon: User,
    color: "bg-rose-100 text-rose-600",
  },
  {
    type: "general" as const,
    label: "General Inquiry",
    description: "Anything else we can help with",
    icon: HelpCircle,
    color: "bg-gray-100 text-gray-600",
  },
];

export default function SupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    const res = await supportService.getMyTickets();
    if (res.success && res.data) {
      setTickets(res.data.tickets);
    } else {
      toast.error("Error", {
        description: res.message || "Failed to load tickets.",
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <PageHeader
          title="Help & Support"
          description="We're here to help. Choose a topic or view your existing tickets."
          actions={
            <Button asChild className="bg-orange-500 hover:bg-orange-600">
              <Link to="/support/new">
                <Plus className="h-4 w-4 mr-2" />
                New Ticket
              </Link>
            </Button>
          }
        />

        {/* Quick Actions */}
        <div className="mb-10">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
            What can we help with?
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {QUICK_ACTIONS.map((action, idx) => (
              <motion.div
                key={action.type}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Link to={`/support/new?type=${action.type}`}>
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
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
            My Tickets
          </h2>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
            </div>
          ) : tickets.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title="No tickets yet"
              description="When you contact support, your tickets will appear here."
              action={{
                label: "Create your first ticket",
                onClick: () => navigate("/support/new"),
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
                  <Link to={`/support/${ticket._id}`}>
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
                            {formatDateTime(ticket.updatedAt)}
                          </p>
                        </div>
                        <StatusBadge status={ticket.status} size="sm" />
                      </div>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
