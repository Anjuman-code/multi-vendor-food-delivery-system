import { z } from "zod";

export const createPayoutSchema = z.object({
  vendorId: z.string().min(1, "Vendor ID is required"),
  amount: z.number().min(0, "Amount must be non-negative"),
  periodStart: z.preprocess((v) => (v instanceof Date ? v : new Date(v as string)), z.date()),
  periodEnd: z.preprocess((v) => (v instanceof Date ? v : new Date(v as string)), z.date()),
  method: z.string().min(1, "Payout method is required"),
  orderCount: z.number().int().min(0).optional().default(0),
  commissionTotal: z.number().min(0).optional().default(0),
  notes: z.string().max(500).optional(),
});

export const processPayoutSchema = z.object({
  status: z.enum(["processing", "completed", "failed"]),
  transactionRef: z.string().optional(),
  notes: z.string().max(500).optional(),
});

export type CreatePayoutInput = z.infer<typeof createPayoutSchema>;
export type ProcessPayoutInput = z.infer<typeof processPayoutSchema>;
