import { z } from "zod";

export const createTicketSchema = z.object({
  type: z.enum([
    "order_issue",
    "refund_request",
    "account_issue",
    "restaurant_complaint",
    "driver_complaint",
    "general",
  ]),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional().default("medium"),
  subject: z.string().min(5, "Subject must be at least 5 characters").max(200),
  message: z.string().min(10, "Message must be at least 10 characters").max(2000),
  orderId: z.string().optional(),
});

export const addMessageSchema = z.object({
  message: z.string().min(1, "Message is required").max(2000),
  attachments: z.array(z.string()).optional().default([]),
});

export const updateTicketSchema = z.object({
  status: z.enum(["open", "in_progress", "waiting_on_user", "resolved", "closed"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  assignedTo: z.string().optional(),
  resolution: z.string().max(500).optional(),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type AddMessageInput = z.infer<typeof addMessageSchema>;
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;
