import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import supportService from "@/services/supportService";
import type { SupportTicket, TicketStatus, TicketPriority } from "@/types/support";
import {
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
  TICKET_TYPE_LABELS,
} from "@/types/support";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Loader2,
  Send,
  UserCheck,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const STATUS_COLORS: Record<TicketStatus, string> = {
  open: "bg-amber-100 text-amber-700",
  in_progress: "bg-blue-100 text-blue-700",
  waiting_on_user: "bg-orange-100 text-orange-700",
  resolved: "bg-emerald-100 text-emerald-700",
  closed: "bg-gray-100 text-gray-500",
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-gray-100 text-gray-500",
};

const STATUS_OPTIONS: { value: TicketStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "waiting_on_user", label: "Waiting on User" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

const PRIORITY_OPTIONS: { value: TicketPriority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const fmtDateTime = (d: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(d));

const fmtTime = (d: string) =>
  new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(d));

export default function AdminTicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<TicketStatus>("open");
  const [priority, setPriority] = useState<TicketPriority>("medium");
  const [resolution, setResolution] = useState("");
  const [savingMeta, setSavingMeta] = useState(false);

  const fetchTicket = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const res = await supportService.getTicketDetail(id);
    if (res.success && res.data) {
      setTicket(res.data.ticket);
      setStatus(res.data.ticket.status);
      setPriority(res.data.ticket.priority);
      setResolution(res.data.ticket.resolution || "");
    } else {
      toast({
        title: "Error",
        description: res.message || "Ticket not found.",
        variant: "destructive",
      });
      navigate("/admin/support");
    }
    setLoading(false);
  }, [id, toast, navigate]);

  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  const handleReply = async () => {
    if (!id || !replyText.trim()) return;
    setSending(true);
    try {
      const res = await supportService.adminReply(id, {
        message: replyText.trim(),
      });
      if (res.success && res.data) {
        setTicket(res.data.ticket);
        setStatus(res.data.ticket.status);
        setReplyText("");
        toast({ title: "Reply sent" });
      } else {
        toast({
          title: "Error",
          description: res.message || "Failed to send reply.",
          variant: "destructive",
        });
      }
    } finally {
      setSending(false);
    }
  };

  const handleUpdateMeta = async () => {
    if (!id) return;
    setSavingMeta(true);
    try {
      const res = await supportService.updateTicket(id, {
        status,
        priority,
        resolution: resolution || undefined,
      });
      if (res.success && res.data) {
        setTicket(res.data.ticket);
        toast({ title: "Ticket updated" });
      } else {
        toast({
          title: "Error",
          description: res.message || "Failed to update ticket.",
          variant: "destructive",
        });
      }
    } finally {
      setSavingMeta(false);
    }
  };

  const hasMetaChanges =
    ticket &&
    (status !== ticket.status ||
      priority !== ticket.priority ||
      resolution !== (ticket.resolution || ""));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!ticket) return null;

  const userName = () => {
    if (typeof ticket.userId === "object" && ticket.userId) {
      return `${ticket.userId.firstName} ${ticket.userId.lastName}`;
    }
    return "Unknown";
  };

  const userEmail = () => {
    if (typeof ticket.userId === "object" && ticket.userId) {
      return ticket.userId.email;
    }
    return "";
  };

  const assignedName = () => {
    if (!ticket.assignedTo) return null;
    if (typeof ticket.assignedTo === "object") {
      return `${ticket.assignedTo.firstName} ${ticket.assignedTo.lastName}`;
    }
    return null;
  };

  const orderNumber = () => {
    if (!ticket.orderId) return null;
    if (typeof ticket.orderId === "object") {
      return ticket.orderId.orderNumber;
    }
    return ticket.orderId;
  };

  const isSender = (senderId: SupportTicket["messages"][0]["senderId"]) => {
    if (typeof senderId === "object" && senderId._id) {
      return typeof ticket.userId === "object" && ticket.userId._id
        ? senderId._id !== ticket.userId._id
        : true;
    }
    return typeof ticket.userId === "string"
      ? senderId !== ticket.userId
      : true;
  };

  return (
    <div className="max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <button
          onClick={() => navigate("/admin/support")}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Support
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main thread */}
          <div className="lg:col-span-2 space-y-4">
            {/* Header */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                {ticket.ticketNumber && (
                  <span className="text-xs font-mono text-gray-400">
                    {ticket.ticketNumber}
                  </span>
                )}
                <span
                  className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[ticket.status]}`}
                >
                  {TICKET_STATUS_LABELS[ticket.status]}
                </span>
                <span
                  className={`text-xs font-medium px-2.5 py-1 rounded-full ${PRIORITY_COLORS[ticket.priority]}`}
                >
                  {TICKET_PRIORITY_LABELS[ticket.priority]}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">{ticket.subject}</h1>
              <p className="text-sm text-gray-500 mt-1">
                {TICKET_TYPE_LABELS[ticket.type]} · Created {fmtDateTime(ticket.createdAt)}
              </p>
            </div>

            {/* Resolution banner */}
            {ticket.resolution && (
              <Card className="p-4 bg-emerald-50 border-emerald-200">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-800">Resolution</p>
                    <p className="text-sm text-emerald-700 mt-1">{ticket.resolution}</p>
                  </div>
                </div>
              </Card>
            )}

            {/* Messages */}
            <div className="space-y-4">
              {ticket.messages.map((msg, idx) => {
                const isAdmin = isSender(msg.senderId);
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className={`flex ${isAdmin ? "justify-start" : "justify-end"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        isAdmin
                          ? "bg-indigo-100 text-gray-900"
                          : "bg-gray-100 text-gray-900"
                      }`}
                    >
                      <p className="text-xs font-semibold text-gray-500 mb-1">
                        {typeof msg.senderId === "object" && msg.senderId
                          ? `${msg.senderId.firstName} ${msg.senderId.lastName}`
                          : "User"}
                        {isAdmin && (
                          <span className="ml-1.5 text-[10px] bg-indigo-200 text-indigo-700 px-1.5 py-0.5 rounded-full">
                            Staff
                          </span>
                        )}
                      </p>
                      <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {msg.attachments.map((att, i) => (
                            <a
                              key={i}
                              href={att}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 underline hover:text-blue-800"
                            >
                              Attachment {i + 1}
                            </a>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {fmtTime(msg.createdAt)}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Reply form */}
            {ticket.status !== "closed" && (
              <Card className="p-4">
                <p className="text-sm font-medium text-gray-700 mb-3">
                  Reply as Support
                </p>
                <Textarea
                  rows={3}
                  placeholder="Type your reply..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="mb-3"
                />
                <div className="flex justify-end">
                  <Button
                    onClick={handleReply}
                    disabled={!replyText.trim() || sending}
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Send Reply
                  </Button>
                </div>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Ticket info */}
            <Card className="p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Ticket Details
              </h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-400 text-xs">Customer</p>
                  <p className="font-medium text-gray-900">{userName()}</p>
                  <p className="text-gray-500 text-xs">{userEmail()}</p>
                </div>
                {orderNumber() && (
                  <div>
                    <p className="text-gray-400 text-xs">Related Order</p>
                    <p className="font-medium text-gray-900 font-mono">
                      {orderNumber()}
                    </p>
                  </div>
                )}
                {assignedName() && (
                  <div>
                    <p className="text-gray-400 text-xs">Assigned To</p>
                    <p className="font-medium text-gray-900">{assignedName()}</p>
                  </div>
                )}
                <div>
                  <p className="text-gray-400 text-xs">Created</p>
                  <p className="text-gray-700">{fmtDateTime(ticket.createdAt)}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Last Updated</p>
                  <p className="text-gray-700">{fmtDateTime(ticket.updatedAt)}</p>
                </div>
              </div>
            </Card>

            {/* Management */}
            <Card className="p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Manage Ticket
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as TicketStatus)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none bg-white"
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TicketPriority)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none bg-white"
                  >
                    {PRIORITY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">
                    Resolution Note
                  </label>
                  <Textarea
                    rows={3}
                    placeholder="Resolution notes (shown when resolved)"
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                  />
                </div>
                <Button
                  onClick={handleUpdateMeta}
                  disabled={!hasMetaChanges || savingMeta}
                  className="w-full bg-indigo-600 hover:bg-indigo-700"
                >
                  {savingMeta ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <UserCheck className="h-4 w-4 mr-2" />
                  )}
                  Update Ticket
                </Button>
              </div>
            </Card>

            {/* Quick actions */}
            <Card className="p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Quick Actions
              </h3>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => {
                    setStatus("waiting_on_user");
                    setResolution("");
                  }}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Set to Waiting on User
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => {
                    setStatus("in_progress");
                    setResolution("");
                  }}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Set to In Progress
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                  onClick={() => setStatus("resolved")}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Mark as Resolved
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
