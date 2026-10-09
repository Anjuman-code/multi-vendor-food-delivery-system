import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export enum OutboxStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SENT = 'sent',
  FAILED = 'failed',
}

export interface IEmailOutbox {
  eventKey: string;
  recipient: string;
  userId?: Types.ObjectId;
  idempotencyKey: string;
  payload: Record<string, unknown>;
  encryptedAuthPayload?: string; // AES-256-GCM encrypted OTP / auth tokens only; purged upon terminal state
  status: OutboxStatus;
  attempts: number;
  maxAttempts: number;
  nextAttemptAt: Date;
  leaseExpiresAt?: Date;
  lastError?: string;
  messageId?: string;
  sentAt?: Date;
  expiresAt: Date; // TTL index
  createdAt: Date;
  updatedAt: Date;
}

export type EmailOutboxDocument = Document & IEmailOutbox;

const emailOutboxSchema = new Schema<IEmailOutbox>(
  {
    eventKey: { type: String, required: true, index: true },
    recipient: { type: String, required: true, lowercase: true, trim: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', sparse: true },
    idempotencyKey: { type: String, required: true, unique: true },
    payload: { type: Schema.Types.Mixed, default: {} },
    encryptedAuthPayload: { type: String },
    status: {
      type: String,
      enum: Object.values(OutboxStatus),
      default: OutboxStatus.PENDING,
      index: true,
    },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 3 },
    nextAttemptAt: { type: Date, default: Date.now, index: true },
    leaseExpiresAt: { type: Date, index: true },
    lastError: { type: String },
    messageId: { type: String },
    sentAt: { type: Date },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

// TTL index to automatically purge records once expiresAt has passed
emailOutboxSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound query index for worker job pickup
emailOutboxSchema.index({ status: 1, nextAttemptAt: 1, leaseExpiresAt: 1 });

const EmailOutbox: Model<IEmailOutbox> = mongoose.model<IEmailOutbox>(
  'EmailOutbox',
  emailOutboxSchema,
);

export default EmailOutbox;
