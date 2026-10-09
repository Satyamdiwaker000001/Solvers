import { AuditLog } from "../models.js";

/** Append-only audit record for sensitive admin/state-changing actions (FR-AUD). */
export async function recordAudit({ actorId, action, targetType, targetId, detail = "" }) {
  try {
    await AuditLog.create({
      actor: actorId || null,
      action,
      targetType,
      targetId: String(targetId),
      detail: String(detail || "").slice(0, 2000),
    });
  } catch (err) {
    // Audit failure must never break the primary operation, but it must be loud.
    console.error(`[audit] FAILED to record ${action} on ${targetType}/${targetId}:`, err.message);
  }
}
