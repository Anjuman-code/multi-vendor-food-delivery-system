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
import { PageHeader, SectionCard } from "@/components/vendor";
import { toast } from "@/lib/toast";
import { applyServerErrors } from "@/lib/formErrors";
import supportService from "@/services/supportService";
import type { TicketType, TicketPriority } from "@/types/support";
import { cn } from "@/utils/cn";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useNavigate, useSearchParams } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
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
  subject: z
    .string()
    .min(5, "Subject must be at least 5 characters")
    .max(200, "Subject must be at most 200 characters"),
  message: z
    .string()
    .min(10, "Message must be at least 10 characters")
    .max(2000, "Message must be at most 2000 characters"),
  orderId: z.string().optional(),
});

type TicketFormData = z.infer<typeof ticketSchema>;

const PRIORITY_OPTIONS: { value: TicketPriority; label: string; description: string }[] = [
  { value: "low", label: "Low", description: "General question" },
  { value: "medium", label: "Medium", description: "Issue affecting operations" },
  { value: "high", label: "High", description: "Urgent problem" },
  { value: "urgent", label: "Urgent", description: "Critical — needs immediate attention" },
];

const TYPE_OPTIONS: { value: TicketType; label: string }[] = [
  { value: "restaurant_complaint", label: "Restaurant Issue" },
  { value: "refund_request", label: "Payment / Payout" },
  { value: "order_issue", label: "Order Dispute" },
  { value: "account_issue", label: "Account Issue" },
  { value: "general", label: "General Inquiry" },
];

export default function VendorCreateTicketPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [priority, setPriority] = useState<TicketPriority>("medium");
  const [submitting, setSubmitting] = useState(false);

  const prefillType = searchParams.get("type") as TicketType | null;

  const form = useForm<TicketFormData>({
    resolver: zodResolver(ticketSchema),
    mode: "onTouched",
    defaultValues: {
      type: prefillType && TYPE_OPTIONS.some((o) => o.value === prefillType)
        ? prefillType
        : "general",
    },
  });

  const {
    register,
    handleSubmit,
    control,
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
        toast.success("Ticket Created", {
          description: "Your support ticket has been submitted.",
        });
        navigate(`/vendor/support/${res.data.ticket._id}`);
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
    <div className="mx-auto max-w-2xl space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <PageHeader
          title="Create Support Ticket"
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

        <SectionCard>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="type">Category</Label>
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="type">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.type && (
                <p className="text-sm text-destructive">{errors.type.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                placeholder="Brief description of your issue"
                {...register("subject")}
                className={errors.subject ? "border-destructive" : ""}
              />
              {errors.subject && (
                <p className="text-sm text-destructive">{errors.subject.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                rows={6}
                placeholder="Describe your issue in detail..."
                {...register("message")}
                className={errors.message ? "border-destructive" : ""}
              />
              {errors.message && (
                <p className="text-sm text-destructive">{errors.message.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="orderId">
                Order Number{" "}
                <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="orderId"
                placeholder="e.g. ORD-12345"
                {...register("orderId")}
              />
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <div className="grid grid-cols-2 gap-2">
                {PRIORITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPriority(opt.value)}
                    className={cn(
                      "rounded-xl border-2 p-3 text-left transition-all",
                      priority === opt.value
                        ? "border-primary bg-accent"
                        : "border-border hover:border-muted-foreground/40",
                    )}
                  >
                    <p className="text-sm font-medium text-foreground">
                      {opt.label}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {opt.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <Button
              type="submit"
              disabled={submitting}
              variant="brand"
              className="w-full py-6"
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  Submit Ticket
                </span>
              )}
            </Button>
          </form>
        </SectionCard>
      </motion.div>
    </div>
  );
}
