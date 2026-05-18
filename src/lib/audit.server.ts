import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type AuditEvent = {
  owner_id?: string | null;
  event_type: string;
  status?: "info" | "success" | "warn" | "error";
  message?: string;
  meeting_id?: string | null;
  action_item_id?: string | null;
  follow_up_id?: string | null;
  metadata?: Record<string, unknown>;
};

export async function audit(e: AuditEvent) {
  try {
    await supabaseAdmin.from("execution_log").insert({
      owner_id: e.owner_id ?? null,
      event_type: e.event_type,
      status: e.status ?? "info",
      message: e.message ?? null,
      meeting_id: e.meeting_id ?? null,
      action_item_id: e.action_item_id ?? null,
      follow_up_id: e.follow_up_id ?? null,
      metadata: e.metadata ?? null,
    });
  } catch (err) {
    console.error("audit log failed", err);
  }
}
