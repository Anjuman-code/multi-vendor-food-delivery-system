import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  PageHeader,
  SectionCard,
  StatusBadge,
  VendorEmptyState,
  type StatusTone,
} from "@/components/vendor";
import { useToast } from "@/hooks/use-toast";
import supportService from "@/services/supportService";
import type { SupportTicket, TicketStatus, TicketPriority } from "@/types/support";
import {
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
  TICKET_TYPE_LABELS,
} from "@/types/support";
import { cn } from "@/utils/cn";
import { formatDateTime, formatRelativeTime } from "@/utils/format";
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

// Status semantics preserved from STATUS_COLORS, rendered via StatusBadge tones.
const STATUS_TONES: Record<TicketStatus, StatusTone> = {
  open: "warning",
  in_progress: "info",
  waiting_on_user: "warning",
  resolved: "success",
  closed: "neutral",
};

const PRIORITY_TONES: Record<TicketPriority, StatusTone> = {
  urgent: "danger",
  high: "warning",
  medium: "warning",
  low: "neutral",
};

export default function VendorTicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
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
      toast({
        title: "Error",
        description: res.message || "Ticket not found.",
        variant: "destructive",
      });
      navigate("/vendor/support");
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
      const res = await supportService.addMessage(id, {
        message: replyText.trim(),
      });
      if (res.success && res.data) {
        setTicket(res.data.ticket);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="mx-auto max-w-3xl">
        <VendorEmptyState
          icon={MessageSquare}
          variant="error"
          title="Ticket not found"
          description="This ticket may have been removed or is no longer available."
          action={{
            label: "Back to Support",
            onClick: () => navigate("/vendor/support"),
          }}
        />
      </div>
    );
  }

  const isSender = (senderId: SupportTicket["messages"][0]["senderId"]) => {
    if (typeof senderId === "object" && senderId._id) {
      return typeof ticket.userId === "object" && ticket.userId._id
        ? senderId._id === ticket.userId._id
        : false;
    }
    return typeof ticket.userId === "string"
      ? senderId === ticket.userId
      : false;
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <PageHeader
          title={ticket.subject}
          subtitle={
            <span className="flex flex-wrap items-center gap-2">
              {ticket.ticketNumber && (
                <span className="font-mono text-xs text-muted-foreground">
                  {ticket.ticketNumber}
                </span>
              )}
              <StatusBadge
                label={TICKET_STATUS_LABELS[ticket.status]}
                tone={STATUS_TONES[ticket.status]}
              />
              <StatusBadge
                label={TICKET_PRIORITY_LABELS[ticket.priority]}
                tone={PRIORITY_TONES[ticket.priority]}
              />
            </span>
          }
          description={`${TICKET_TYPE_LABELS[ticket.type]} · Created ${formatDateTime(
            ticket.createdAt,
          )}`}
          actions={
            <Button
              variant="ghost"
              onClick={() => navigate("/vendor/support")}
              className="text-muted-foreground"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Support
            </Button>
          }
        />

        {ticket.resolution && (
          <SectionCard className="border-emerald-200 bg-emerald-50">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
              <div>
                <p className="text-sm font-semibold text-emerald-800">
                  Resolution
                </p>
                <p className="mt-1 text-sm text-emerald-700">
                  {ticket.resolution}
                </p>
              </div>
            </div>
          </SectionCard>
        )}

        {ticket.status === "waiting_on_user" && (
          <SectionCard className="border-amber-200 bg-amber-50">
            <div className="flex items-start gap-3">
              <Clock className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
              <div>
                <p className="text-sm font-semibold text-amber-800">
                  Support is waiting for your response
                </p>
                <p className="mt-1 text-sm text-amber-700">
                  Please reply below to continue.
                </p>
              </div>
            </div>
          </SectionCard>
        )}

        <SectionCard title="Conversation" icon={<MessageSquare className="h-4 w-4" />}>
          <div className="space-y-4">
            {ticket.messages.map((msg, idx) => {
              const mine = isSender(msg.senderId);
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className={cn("flex", mine ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-4 py-3",
                      mine
                        ? "bg-accent text-accent-foreground"
                        : "bg-muted text-foreground",
                    )}
                  >
                    {!mine && (
                      <p className="mb-1 text-xs font-semibold text-muted-foreground">
                        {typeof msg.senderId === "object" && msg.senderId
                          ? `${msg.senderId.firstName} ${msg.senderId.lastName}`
                          : "Support Agent"}
                      </p>
                    )}
                    <p className="whitespace-pre-wrap text-sm">{msg.message}</p>
                    <p
                      className={cn(
                        "mt-1 text-xs",
                        mine
                          ? "text-accent-foreground/70"
                          : "text-muted-foreground",
                      )}
                    >
                      {formatRelativeTime(msg.createdAt)}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </SectionCard>

        {ticket.status !== "closed" && ticket.status !== "resolved" && (
          <SectionCard title="Add a reply">
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
                variant="brand"
              >
                {sending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Send Reply
              </Button>
            </div>
          </SectionCard>
        )}

        {ticket.status === "closed" && (
          <SectionCard>
            <div className="py-2 text-center">
              <MessageSquare className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                This ticket has been closed. Create a new ticket if you need
                further assistance.
              </p>
            </div>
          </SectionCard>
        )}
      </motion.div>
    </div>
  );
}
