import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export enum EmailDeliveryStatus {
  QUEUED = 'queued',
  SENT = 'sent',
  FAILED = 'failed',
  BOUNCED = 'bounced',
}

export interface IEmailLog {
  outboxId?: Types.ObjectId;
  eventKey: string;
  recipient: string;
  userId?: Types.ObjectId;
  status: EmailDeliveryStatus;
  provider: string; // 'smtp' | 'sandbox' | 'ethereal'
  providerMessageId?: string;
  attempts: number;
  errorSummary?: string;
  sentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type EmailLogDocument = Document & IEmailLog;

const emailLogSchema = new Schema<IEmailLog>(
  {
    outboxId: { type: Schema.Types.ObjectId, ref: 'EmailOutbox', index: true },
    eventKey: { type: String, required: true, index: true },
    recipient: { type: String, required: true, lowercase: true, trim: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true, sparse: true },
    status: {
      type: String,
      enum: Object.values(EmailDeliveryStatus),
      required: true,
      index: true,
    },
    provider: { type: String, required: true, default: 'smtp' },
    providerMessageId: { type: String },
    attempts: { type: Number, default: 1 },
    errorSummary: { type: String },
    sentAt: { type: Date },
  },
  { timestamps: true },
);

emailLogSchema.index({ createdAt: -1 });
emailLogSchema.index({ recipient: 1, createdAt: -1 });
emailLogSchema.index({ status: 1, createdAt: -1 });

const EmailLog: Model<IEmailLog> = mongoose.model<IEmailLog>(
  'EmailLog',
  emailLogSchema,
);

export default EmailLog;
