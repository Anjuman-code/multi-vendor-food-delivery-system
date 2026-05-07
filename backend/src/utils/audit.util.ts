/**
 * Audit logging utility — call after sensitive admin/vendor actions
 * to leave an immutable compliance trail.
 */
import { Types } from "mongoose";
import AuditLog, { IAuditChange } from "../models/AuditLog";

interface AuditEntry {
  actorId: Types.ObjectId;
  actorRole: string;
  action: string;
  resourceType: string;
  resourceId: Types.ObjectId;
  changes: IAuditChange[];
  metadata?: Record<string, unknown>;
}

/** Create an audit log entry. Non-blocking — failures are logged but not thrown. */
export const createAuditLog = async (entry: AuditEntry): Promise<void> => {
  try {
    await AuditLog.create({
      actorId: entry.actorId,
      actorRole: entry.actorRole,
      action: entry.action,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
      changes: entry.changes,
      metadata: entry.metadata,
    });
  } catch (error) {
    // Audit failure must never break the main flow
    console.error("[AuditLog] Failed to create entry:", error);
  }
};
