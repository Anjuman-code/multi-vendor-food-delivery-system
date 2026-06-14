import { SectionCard } from "@/components/rider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/lib/toast";
import { applyServerErrors } from "@/lib/formErrors";
import type { TicketPriority, TicketType } from "@/types/support";
import supportService from "@/services/supportService";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";

const ticketSchema = z.object({
  type: z.enum([
    "order_issue",
    "refund_request",
    "account_issue",
    "restaurant_complaint",
    "driver_complaint",
    "general",
  ]),
  subject: z.string().min(5, "At least 5 characters").max(200),
  message: z.string().min(10, "At least 10 characters").max(2000),
  orderId: z.string().optional(),
});
type TicketFormData = z.infer<typeof ticketSchema>;

const TYPE_OPTIONS: { value: TicketType; label: string }[] = [
  { value: "order_issue", label: "Delivery issue" },
  { value: "refund_request", label: "Payment problem" },
  { value: "account_issue", label: "Account issue" },
  { value: "general", label: "General inquiry" },
];

const PRIORITY_OPTIONS: { value: TicketPriority; label: string; description: string }[] = [
  { value: "low", label: "Low", description: "General question" },
  { value: "medium", label: "Medium", description: "Affecting deliveries" },
  { value: "high", label: "High", description: "Urgent problem" },
  { value: "urgent", label: "Urgent", description: "Needs immediate help" },
];

export default function RiderCreateTicketPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [priority, setPriority] = useState<TicketPriority>("medium");
  const [submitting, setSubmitting] = useState(false);

  const prefill = searchParams.get("type") as TicketType | null;
  const form = useForm<TicketFormData>({
    resolver: zodResolver(ticketSchema),
    mode: "onTouched",
    defaultValues: {
      type:
        prefill && TYPE_OPTIONS.some((o) => o.value === prefill)
          ? prefill
          : "general",
    },
  });

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = form;

  const onSubmit = async (data: TicketFormData) => {
    setSubmitting(true);
    try {
      const res = await supportService.createTicket({
        ...data,
        priority,
        orderId: data.orderId || undefined,
      });
      if (res.success && res.data) {
        toast.success("Ticket created", { description: "We'll be in touch." });
        navigate(`/rider/support/${res.data.ticket._id}`);
      } else {
        applyServerErrors(form, res, {
          fallbackMessage: res.message || "Failed to create ticket.",
        });
      }
    } catch (err) {
      applyServerErrors(form, err, {
        fallbackMessage: "Failed to create ticket.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6">
      <button
        onClick={() => navigate("/rider/support")}
        className="mb-5 flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to support
      </button>

      <h1 className="mb-5 text-xl font-bold text-foreground">
        Create support ticket
      </h1>

      <SectionCard>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-2">
            <Label>Category</Label>
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.type && (
              <p className="text-sm text-red-600">{errors.type.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              placeholder="Brief description"
              {...register("subject")}
            />
            {errors.subject && (
              <p className="text-sm text-red-600">{errors.subject.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              rows={6}
              placeholder="Describe your issue in detail…"
              {...register("message")}
            />
            {errors.message && (
              <p className="text-sm text-red-600">{errors.message.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="orderId">
              Order number{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </Label>
            <Input id="orderId" placeholder="e.g. ORD-12345" {...register("orderId")} />
          </div>

          <div className="space-y-2">
            <Label>Priority</Label>
            <div className="grid grid-cols-2 gap-2">
              {PRIORITY_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setPriority(o.value)}
                  className={`rounded-lg border-2 p-3 text-left transition-colors ${
                    priority === o.value
                      ? "border-brand-500 bg-accent"
                      : "border-border hover:border-brand-200"
                  }`}
                >
                  <p className="text-sm font-medium text-foreground">{o.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {o.description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" /> Submit ticket
              </>
            )}
          </Button>
        </form>
      </SectionCard>
    </div>
  );
}
