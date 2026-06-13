import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import supportService from "@/services/supportService";
import type { TicketType, TicketPriority } from "@/types/support";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
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
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [priority, setPriority] = useState<TicketPriority>("medium");
  const [submitting, setSubmitting] = useState(false);

  const prefillType = searchParams.get("type") as TicketType | null;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TicketFormData>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      type: prefillType && TYPE_OPTIONS.some((o) => o.value === prefillType)
        ? prefillType
        : "general",
    },
  });

  const onSubmit = async (data: TicketFormData) => {
    setSubmitting(true);
    try {
      const res = await supportService.createTicket({
        ...data,
        priority,
        orderId: data.orderId || undefined,
      });
      if (res.success && res.data) {
        toast({
          title: "Ticket Created",
          description: "Your support ticket has been submitted.",
        });
        navigate(`/vendor/support/${res.data.ticket._id}`);
      } else {
        toast({
          title: "Error",
          description: res.message || "Failed to create ticket.",
          variant: "destructive",
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <button
          onClick={() => navigate("/vendor/support")}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Support
        </button>

        <h1 className="text-xl font-bold text-gray-900 mb-6">
          Create Support Ticket
        </h1>

        <Card className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="type">Category</Label>
              <select
                id="type"
                {...register("type")}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none bg-white"
              >
                {TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {errors.type && (
                <p className="text-red-500 text-sm">{errors.type.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                placeholder="Brief description of your issue"
                {...register("subject")}
                className={errors.subject ? "border-red-500" : ""}
              />
              {errors.subject && (
                <p className="text-red-500 text-sm">{errors.subject.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                rows={6}
                placeholder="Describe your issue in detail..."
                {...register("message")}
                className={errors.message ? "border-red-500" : ""}
              />
              {errors.message && (
                <p className="text-red-500 text-sm">{errors.message.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="orderId">
                Order Number{" "}
                <span className="text-gray-400 font-normal">(optional)</span>
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
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      priority === opt.value
                        ? "border-orange-500 bg-orange-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <p className="text-sm font-medium text-gray-900">{opt.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{opt.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-orange-500 hover:bg-orange-600 py-6"
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
        </Card>
      </motion.div>
    </div>
  );
}
