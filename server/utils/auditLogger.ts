export interface AuditLogEvent {
  action: string;
  userId?: number | null;
  targetId?: string | number | null;
  details?: Record<string, any>;
  ip?: string;
  timestamp?: string;
}

export function logAuditEvent(event: AuditLogEvent): void {
  const payload = {
    timestamp: event.timestamp || new Date().toISOString(),
    action: event.action,
    userId: event.userId ?? null,
    targetId: event.targetId ?? null,
    details: event.details || {},
    ip: event.ip || "unknown",
  };

  console.log(`[AUDIT] ${JSON.stringify(payload)}`);
}
