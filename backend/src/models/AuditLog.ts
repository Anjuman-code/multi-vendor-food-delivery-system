/**
 * AuditLog — immutable record of sensitive administrative actions.
 * Used for compliance, security review, and change history.
 */
import mongoose, { Model, Schema, Types } from "mongoose";

export interface IAuditChange {
  field: string;
  oldValue?: unknown;
  newValue?: unknown;
}

export interface IAuditLog {
  actorId: Types.ObjectId;
  actorRole: string;
  action: string;
  resourceType: string;
  resourceId: Types.ObjectId;
  changes: IAuditChange[];
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

export type AuditLogDocument = mongoose.HydratedDocument<IAuditLog>;

const auditChangeSchema = new Schema<IAuditChange>(
  {
    field: { type: String, required: true },
    oldValue: { type: Schema.Types.Mixed },
    newValue: { type: Schema.Types.Mixed },
  },
  { _id: false },
);

const auditLogSchema = new Schema<IAuditLog>(
  {
    actorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    actorRole: { type: String, required: true },
    action: { type: String, required: true },
    resourceType: { type: String, required: true },
    resourceId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    changes: { type: [auditChangeSchema], default: [] },
    metadata: { type: Schema.Types.Mixed },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false },
);

auditLogSchema.index({ resourceType: 1, resourceId: 1 });
auditLogSchema.index({ actorId: 1, timestamp: -1 });

const AuditLog: Model<IAuditLog> = mongoose.model<IAuditLog>(
  "AuditLog",
  auditLogSchema,
);

export default AuditLog;
