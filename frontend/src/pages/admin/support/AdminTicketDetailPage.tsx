import {
  DetailHeader,
  EmptyState,
  FormDialog,
  KeyValueList,
  SectionCard,
  StatusBadge,
} from "@/components/admin";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import adminService from "@/services/adminService";
import supportService from "@/services/supportService";
import type {
  SupportTicket,
  TicketPriority,
  TicketStatus,
  UpdateTicketPayload,
} from "@/types/support";
import { TICKET_TYPE_LABELS } from "@/types/support";
import { formatDateTime } from "@/utils/format";
import {
  CheckCircle2,
  Clock,
  LifeBuoy,
  Loader2,
  Send,
  UserCheck,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

const formatTime = (d: string) =>
  new Date(d).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

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

interface AdminOption {
  _id: string;
  firstName: string;
  lastName: string;
}

export default function AdminTicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [busyField, setBusyField] = useState<string | null>(null);

  // Resolution dialog
  const [resolveOpen, setResolveOpen] = useState(false);
  const [resolutionNote, setResolutionNote] = useState("");

  // Reassign dialog
  const [assignOpen, setAssignOpen] = useState(false);
  const [admins, setAdmins] = useState<AdminOption[]>([]);
  const [assigneeId, setAssigneeId] = useState("");

  const fetchTicket = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const res = await supportService.getTicketDetail(id);
    if (res.success && res.data) {
      setTicket(res.data.ticket);
    } else {
      toast({ title: "Ticket not found", variant: "destructive" });
    }
    setLoading(false);
  }, [id, toast]);

  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  // ── Persisted mutations ───────────────────────────────────────────
  const persist = async (payload: UpdateTicketPayload, field: string, successMsg: string) => {
    if (!id) return;
    setBusyField(field);
    try {
      const res = await supportService.updateTicket(id, payload);
      if (res.success) {
        toast({ title: successMsg });
        await fetchTicket();
      } else {
        toast({ title: res.message || "Update failed", variant: "destructive" });
      }
    } catch {
      toast({ title: "Update failed", variant: "destructive" });
    } finally {
      setBusyField(null);
    }
  };

  const handleReply = async () => {
    if (!id || !replyText.trim()) return;
    setSending(true);
    try {
      const res = await supportService.adminReply(id, { message: replyText.trim() });
      if (res.success && res.data) {
        setTicket(res.data.ticket);
        setReplyText("");
        toast({ title: "Reply sent" });
      } else {
        toast({ title: res.message || "Failed to send reply", variant: "destructive" });
      }
    } finally {
      setSending(false);
    }
  };

  const submitResolution = async () => {
    await persist(
      { status: "resolved", resolution: resolutionNote.trim() || undefined },
      "resolve",
      "Ticket resolved",
    );
    setResolveOpen(false);
    setResolutionNote("");
  };

  const openReassign = async () => {
    setAssignOpen(true);
    try {
      const res = await adminService.listAdmins();
      setAdmins((res.data as { data: { admins: AdminOption[] } }).data.admins);
    } catch {
      setAdmins([]);
    }
  };

  const submitReassign = async () => {
    if (!assigneeId) return;
    await persist({ assignedTo: assigneeId }, "assign", "Ticket reassigned");
    setAssignOpen(false);
    setAssigneeId("");
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-96 lg:col-span-2" />
          <Skeleton className="h-96 lg:col-span-1" />
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <EmptyState
        icon={LifeBuoy}
        title="Ticket not found"
        description="This ticket may have been removed."
        action={{ label: "Back to support", onClick: () => history.back() }}
      />
    );
  }

  const customer =
    typeof ticket.userId === "object" && ticket.userId
      ? { name: `${ticket.userId.firstName} ${ticket.userId.lastName}`, email: ticket.userId.email }
      : { name: "Unknown", email: "" };

  const assignedName =
    typeof ticket.assignedTo === "object" && ticket.assignedTo
      ? `${ticket.assignedTo.firstName} ${ticket.assignedTo.lastName}`
      : null;
  const assignedId =
    typeof ticket.assignedTo === "object" && ticket.assignedTo
      ? ticket.assignedTo._id
      : typeof ticket.assignedTo === "string"
        ? ticket.assignedTo
        : null;

  const order =
    typeof ticket.orderId === "object" && ticket.orderId ? ticket.orderId : null;

  const isClosed = ticket.status === "closed";
  const isResolved = ticket.status === "resolved";
  const assignedToMe = !!user && assignedId === user.id;

  return (
    <div className="space-y-5">
      <DetailHeader
        backTo="/admin/support"
        backLabel="Support"
        title={ticket.subject}
        icon={LifeBuoy}
        subtitle={
          <>
            {ticket.ticketNumber && (
              <span className="font-mono">{ticket.ticketNumber} · </span>
            )}
            {TICKET_TYPE_LABELS[ticket.type]} · {formatDateTime(ticket.createdAt)}
          </>
        }
        badges={
          <>
            <StatusBadge status={ticket.status} />
            <StatusBadge status={ticket.priority} size="sm" />
          </>
        }
        actions={
          <>
            {!isClosed && (
              <Button variant="outline" size="sm" onClick={openReassign} disabled={busyField === "assign"}>
                <UserCheck className="mr-1.5 h-4 w-4" />
                {assignedName ? "Reassign" : "Assign"}
              </Button>
            )}
            {!isClosed && !assignedToMe && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => persist({ assignedTo: user!.id }, "assign", "Assigned to you")}
                disabled={!user || busyField === "assign"}
              >
                Assign to me
              </Button>
            )}
            {!isClosed && !isResolved && (
              <Button
                variant="brand"
                size="sm"
                onClick={() => setResolveOpen(true)}
                disabled={busyField === "resolve"}
              >
                <CheckCircle2 className="mr-1.5 h-4 w-4" /> Resolve
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Conversation */}
        <div className="space-y-4 lg:col-span-2">
          {ticket.resolution && (
            <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              <div>
                <p className="text-sm font-semibold text-emerald-800">Resolution</p>
                <p className="mt-0.5 text-sm text-emerald-700">{ticket.resolution}</p>
              </div>
            </div>
          )}

          <SectionCard title="Conversation">
            <div className="space-y-3">
              {ticket.messages.map((msg, idx) => {
                const isStaff =
                  msg.senderRole === "admin" || msg.senderRole === "support";
                const senderName =
                  typeof msg.senderId === "object" && msg.senderId
                    ? `${msg.senderId.firstName} ${msg.senderId.lastName}`
                    : isStaff
                      ? "Support"
                      : customer.name;
                return (
                  <div key={idx} className={`flex ${isStaff ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                        isStaff
                          ? "bg-accent text-accent-foreground"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      <p className="mb-0.5 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                        {senderName}
                        {isStaff && (
                          <span className="rounded-full bg-brand-500/15 px-1.5 py-0.5 text-[10px] font-bold text-brand-600">
                            Staff
                          </span>
                        )}
                      </p>
                      <p className="whitespace-pre-wrap text-sm">{msg.message}</p>
                      {msg.attachments?.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-2">
                          {msg.attachments.map((att, i) => (
                            <a
                              key={i}
                              href={att}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-medium text-primary underline"
                            >
                              Attachment {i + 1}
                            </a>
                          ))}
                        </div>
                      )}
                      <p className="mt-1 text-[11px] text-muted-foreground/70">
                        {formatTime(msg.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>

          {isClosed ? (
            <div className="rounded-xl border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
              This ticket is closed. Reopen it (change status) to continue the conversation.
            </div>
          ) : (
            <SectionCard title="Reply as Support">
              <Textarea
                rows={3}
                placeholder="Type your reply…"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="mb-3"
              />
              <div className="flex justify-end">
                <Button variant="brand" onClick={handleReply} disabled={!replyText.trim() || sending}>
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
        </div>

        {/* Sidebar */}
        <div className="space-y-4 lg:col-span-1">
          <SectionCard title="Ticket Details">
            <KeyValueList
              columns={1}
              items={[
                { label: "Customer", value: customer.name },
                ...(customer.email ? [{ label: "Email", value: customer.email }] : []),
                ...(order
                  ? [
                      {
                        label: "Related Order",
                        value: (
                          <Link
                            to={`/admin/orders/${order._id}`}
                            className="font-mono font-semibold text-primary hover:underline"
                          >
                            #{order.orderNumber}
                          </Link>
                        ),
                      },
                    ]
                  : []),
                { label: "Assigned to", value: assignedName ?? "Unassigned" },
                { label: "Created", value: formatDateTime(ticket.createdAt) },
                { label: "Last updated", value: formatDateTime(ticket.updatedAt) },
              ]}
            />
          </SectionCard>

          <SectionCard title="Status" description="Changes apply immediately.">
            <Select
              value={ticket.status}
              onValueChange={(v) =>
                persist({ status: v as TicketStatus }, "status", "Status updated")
              }
              disabled={busyField === "status"}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SectionCard>

          <SectionCard title="Priority" description="Changes apply immediately.">
            <Select
              value={ticket.priority}
              onValueChange={(v) =>
                persist({ priority: v as TicketPriority }, "priority", "Priority updated")
              }
              disabled={busyField === "priority"}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SectionCard>

          {!isClosed && (
            <SectionCard title="Quick Actions">
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  disabled={busyField === "status"}
                  onClick={() =>
                    persist({ status: "waiting_on_user" }, "status", "Set to waiting on user")
                  }
                >
                  <Clock className="mr-2 h-4 w-4" /> Set to Waiting on User
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  disabled={busyField === "status"}
                  onClick={() => persist({ status: "in_progress" }, "status", "Set to in progress")}
                >
                  <UserCheck className="mr-2 h-4 w-4" /> Set to In Progress
                </Button>
                {!isResolved && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                    onClick={() => setResolveOpen(true)}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" /> Mark as Resolved
                  </Button>
                )}
              </div>
            </SectionCard>
          )}
        </div>
      </div>

      {/* Resolution dialog */}
      <FormDialog
        open={resolveOpen}
        onOpenChange={(o) => !o && setResolveOpen(false)}
        title="Resolve Ticket"
        description="Add an optional resolution note the customer will see."
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setResolveOpen(false)} disabled={busyField === "resolve"}>
              Cancel
            </Button>
            <Button variant="brand" onClick={submitResolution} disabled={busyField === "resolve"}>
              {busyField === "resolve" ? "Saving…" : "Resolve Ticket"}
            </Button>
          </>
        }
      >
        <div className="space-y-1.5">
          <Label htmlFor="resolution">Resolution note (optional)</Label>
          <Textarea
            id="resolution"
            rows={3}
            value={resolutionNote}
            onChange={(e) => setResolutionNote(e.target.value)}
            placeholder="How was this ticket resolved?"
          />
        </div>
      </FormDialog>

      {/* Reassign dialog */}
      <FormDialog
        open={assignOpen}
        onOpenChange={(o) => !o && setAssignOpen(false)}
        title="Assign Ticket"
        description="Assign this ticket to a support agent."
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setAssignOpen(false)} disabled={busyField === "assign"}>
              Cancel
            </Button>
            <Button variant="brand" onClick={submitReassign} disabled={!assigneeId || busyField === "assign"}>
              {busyField === "assign" ? "Saving…" : "Assign"}
            </Button>
          </>
        }
      >
        <div className="space-y-1.5">
          <Label>Support agent</Label>
          <Select value={assigneeId} onValueChange={setAssigneeId}>
            <SelectTrigger>
              <SelectValue placeholder="Select an agent" />
            </SelectTrigger>
            <SelectContent>
              {admins.map((a) => (
                <SelectItem key={a._id} value={a._id}>
                  {a.firstName} {a.lastName}
                  {user && a._id === user.id ? " (you)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </FormDialog>
    </div>
  );
}
