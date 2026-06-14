import { SectionCard, StatusBadge } from "@/components/rider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import supportService from "@/services/supportService";
import type { SupportTicket, TicketStatus } from "@/types/support";
import {
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
  TICKET_TYPE_LABELS,
} from "@/types/support";
import { formatDateTime } from "@/utils/format";
import { cn } from "@/utils/cn";
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

const STATUS_TONE: Record<TicketStatus, "warning" | "info" | "brand" | "success" | "neutral"> = {
  open: "warning",
  in_progress: "info",
  waiting_on_user: "brand",
  resolved: "success",
  closed: "neutral",
};

const fmtTime = (d: string) =>
  new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(
    new Date(d),
  );

export default function RiderTicketDetailPage() {
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
    if (res.success && res.data) setTicket(res.data.ticket);
    else {
      toast({
        title: "Error",
        description: res.message || "Ticket not found.",
        variant: "destructive",
      });
      navigate("/rider/support");
    }
    setLoading(false);
  }, [id, toast, navigate]);

  useEffect(() => {
    void fetchTicket();
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
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    );
  }
  if (!ticket) return null;

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

  const closed = ticket.status === "closed";
  const resolved = ticket.status === "resolved";

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6">
      <button
        onClick={() => navigate("/rider/support")}
        className="mb-5 flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to support
      </button>

      <div className="mb-5">
        <div className="mb-2 flex items-center gap-2">
          {ticket.ticketNumber && (
            <span className="font-mono text-xs text-muted-foreground">
              {ticket.ticketNumber}
            </span>
          )}
          <StatusBadge
            label={TICKET_STATUS_LABELS[ticket.status]}
            tone={STATUS_TONE[ticket.status]}
            icon={false}
          />
          <StatusBadge
            label={TICKET_PRIORITY_LABELS[ticket.priority]}
            tone="neutral"
            icon={false}
          />
        </div>
        <h1 className="text-xl font-bold text-foreground">{ticket.subject}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {TICKET_TYPE_LABELS[ticket.type]} · Created{" "}
          {formatDateTime(ticket.createdAt)}
        </p>
      </div>

      {ticket.resolution && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <div>
            <p className="text-sm font-semibold text-emerald-800">Resolution</p>
            <p className="mt-1 text-sm text-emerald-700">{ticket.resolution}</p>
          </div>
        </div>
      )}

      {ticket.status === "waiting_on_user" && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-brand-200 bg-accent p-4">
          <Clock className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
          <div>
            <p className="text-sm font-semibold text-foreground">
              Support is waiting for your response
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Reply below to continue.
            </p>
          </div>
        </div>
      )}

      <div className="mb-5 space-y-4">
        {ticket.messages.map((msg, idx) => {
          const mine = isSender(msg.senderId);
          return (
            <div
              key={idx}
              className={cn("flex", mine ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-3",
                  mine
                    ? "bg-brand-500 text-white"
                    : "bg-muted text-foreground",
                )}
              >
                {!mine && (
                  <p className="mb-1 text-xs font-semibold text-muted-foreground">
                    {typeof msg.senderId === "object" && msg.senderId
                      ? `${msg.senderId.firstName} ${msg.senderId.lastName}`
                      : "Support agent"}
                  </p>
                )}
                <p className="whitespace-pre-wrap text-sm">{msg.message}</p>
                <p
                  className={cn(
                    "mt-1 text-xs",
                    mine ? "text-white/70" : "text-muted-foreground",
                  )}
                >
                  {fmtTime(msg.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {!closed && !resolved ? (
        <SectionCard>
          <p className="mb-3 text-sm font-medium text-foreground">Add a reply</p>
          <Textarea
            rows={3}
            placeholder="Type your reply…"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            className="mb-3"
          />
          <div className="flex justify-end">
            <Button onClick={handleReply} disabled={!replyText.trim() || sending}>
              {sending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Send reply
            </Button>
          </div>
        </SectionCard>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-6 text-center">
          <MessageSquare className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            This ticket is {closed ? "closed" : "resolved"}. Create a new ticket
            if you need more help.
          </p>
        </div>
      )}
    </div>
  );
}
