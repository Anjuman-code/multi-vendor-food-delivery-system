import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/lib/toast";
import supportService from "@/services/supportService";
import type { SupportTicket, TicketStatus } from "@/types/support";
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
  MessageSquare,
  Send,
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

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  const fetchTicket = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const res = await supportService.getMyTicket(id);
    if (res.success && res.data) {
      setTicket(res.data.ticket);
    } else {
      toast.error("Error", {
        description: res.message || "Ticket not found.",
      });
      navigate("/support");
    }
    setLoading(false);
  }, [id, navigate]);

  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  const handleReply = async () => {
    if (!id || !replyText.trim()) return;
    setSending(true);
    try {
      const res = await supportService.addMessage(id, {
        message: replyText.trim(),
      });
      if (res.success && res.data) {
        setTicket(res.data.ticket);
        setReplyText("");
        toast.success("Reply sent");
      } else {
        toast.error("Error", {
          description: res.message || "Failed to send reply.",
        });
      }
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!ticket) return null;

  const assignedName = () => {
    if (!ticket.assignedTo) return null;
    if (typeof ticket.assignedTo === "object") {
      return `${ticket.assignedTo.firstName} ${ticket.assignedTo.lastName}`;
    }
    return null;
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <button
          onClick={() => navigate("/support")}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Support
        </button>

        {/* Header */}
        <div className="mb-6">
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
            {TICKET_TYPE_LABELS[ticket.type]} · Created{" "}
            {fmtDateTime(ticket.createdAt)}
          </p>
        </div>

        {/* Resolution banner */}
        {ticket.resolution && (
          <Card className="p-4 mb-6 bg-emerald-50 border-emerald-200">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-emerald-800">
                  Resolution
                </p>
                <p className="text-sm text-emerald-700 mt-1">
                  {ticket.resolution}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Waiting banner */}
        {ticket.status === "waiting_on_user" && (
          <Card className="p-4 mb-6 bg-orange-50 border-orange-200">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-orange-800">
                  Support is waiting for your response
                </p>
                <p className="text-sm text-orange-700 mt-1">
                  Please reply below to continue the conversation.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Assigned agent */}
        {assignedName() && (
          <p className="text-xs text-gray-400 mb-4">
            Assigned to <span className="font-medium text-gray-600">{assignedName()}</span>
          </p>
        )}

        {/* Messages Thread */}
        <div className="space-y-4 mb-6">
          {ticket.messages.map((msg, idx) => {
            const isCustomer =
              typeof msg.senderId === "string" ||
              (typeof msg.senderId === "object" &&
                msg.senderId._id &&
                typeof ticket.userId === "object" &&
                ticket.userId._id &&
                msg.senderId._id === ticket.userId._id);

            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                className={`flex ${isCustomer ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    isCustomer
                      ? "bg-orange-500 text-white"
                      : "bg-gray-100 text-gray-900"
                  }`}
                >
                  {!isCustomer && (
                    <p className="text-xs font-semibold text-gray-500 mb-1">
                      {typeof msg.senderId === "object" && msg.senderId
                        ? `${msg.senderId.firstName} ${msg.senderId.lastName}`
                        : "Support Agent"}
                    </p>
                  )}
                  <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {msg.attachments.map((att, i) => (
                        <a
                          key={i}
                          href={att}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`text-xs underline ${
                            isCustomer
                              ? "text-orange-100 hover:text-white"
                              : "text-blue-600 hover:text-blue-800"
                          }`}
                        >
                          Attachment {i + 1}
                        </a>
                      ))}
                    </div>
                  )}
                  <p
                    className={`text-xs mt-1 ${
                      isCustomer ? "text-orange-100" : "text-gray-400"
                    }`}
                  >
                    {fmtTime(msg.createdAt)}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Reply form */}
        {ticket.status !== "closed" && ticket.status !== "resolved" && (
          <Card className="p-4">
            <p className="text-sm font-medium text-gray-700 mb-3">
              Add a reply
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
                className="bg-orange-500 hover:bg-orange-600"
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

        {/* Closed message */}
        {ticket.status === "closed" && (
          <Card className="p-6 text-center">
            <MessageSquare className="h-8 w-8 mx-auto text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">
              This ticket has been closed. If you need further assistance, please
              create a new ticket.
            </p>
          </Card>
        )}
      </motion.div>
    </div>
  );
}
