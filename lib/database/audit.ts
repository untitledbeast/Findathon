import { supabase } from '@/lib/supabase';
import { RequestContext } from '@/lib/context/request-context';

export interface AuditEvent {
  action: string;
  entityType: string;
  entityId: string;
  previousValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
}

export const AuditService = {
  async log(context: RequestContext, event: AuditEvent): Promise<void> {
    // Non-blocking fire and forget
    Promise.resolve().then(async () => {
      try {
        await supabase.from('audit_logs').insert({
          action: event.action,
          entity_type: event.entityType,
          entity_id: event.entityId,
          user_id: context.user?.id || null,
          previous_value: event.previousValue || null,
          new_value: event.newValue || null,
          ip_address: context.ip,
          user_agent: context.userAgent,
          request_id: context.requestId,
          created_at: new Date().toISOString()
        });
      } catch (err) {
        console.error('Audit log failed silently:', err);
      }
    });
  }
};
