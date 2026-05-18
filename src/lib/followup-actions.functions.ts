import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { audit } from "@/lib/audit.server";

async function sendViaResend(to: string, subject: string, text: string) {
  const resendKey = process.env.RESEND_API_KEY;
  const lovableKey = process.env.LOVABLE_API_KEY;
  if (!resendKey || !lovableKey) throw new Error("Missing email credentials");
  const res = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": resendKey,
    },
    body: JSON.stringify({
      from: "EXECUTOR <onboarding@resend.dev>",
      to: [to],
      subject,
      text,
    }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

export const sendFollowup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { followupId: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: f, error } = await supabase
      .from("follow_ups")
      .select("*, action_items(who_email, who_name, what)")
      .eq("id", data.followupId)
      .single();
    if (error || !f) throw new Error("Follow-up not found");
    const item = f.action_items as { who_email: string | null; what: string } | null;
    const to = item?.who_email;
    if (!to) throw new Error("No recipient email on action item");

    try {
      await sendViaResend(to, f.draft_subject, f.draft_email);
    } catch (e) {
      const retries = (f.retry_count ?? 0) + 1;
      await supabase
        .from("follow_ups")
        .update({
          retry_count: retries,
          last_error: (e as Error).message,
          last_attempt_at: new Date().toISOString(),
          status: retries >= 3 ? "failed" : f.status,
        })
        .eq("id", f.id);
      await audit({
        owner_id: userId,
        event_type: "send",
        status: "error",
        message: (e as Error).message,
        follow_up_id: f.id,
        action_item_id: f.action_item_id,
        metadata: { retry_count: retries, manual: true },
      });
      throw e;
    }

    const { error: uErr } = await supabase
      .from("follow_ups")
      .update({ status: "sent", sent_at: new Date().toISOString(), last_attempt_at: new Date().toISOString() })
      .eq("id", f.id);
    if (uErr) throw new Error(uErr.message);

    await audit({
      owner_id: userId,
      event_type: "send",
      status: "success",
      message: `Sent to ${to}`,
      follow_up_id: f.id,
      action_item_id: f.action_item_id,
      metadata: { manual: true },
    });
    return { ok: true };
  });

export const retryFollowup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { followupId: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("follow_ups")
      .update({
        status: "pending_review",
        retry_count: 0,
        last_error: null,
        scheduled_send_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      })
      .eq("id", data.followupId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const cancelFollowup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { followupId: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("follow_ups")
      .update({ status: "cancelled" })
      .eq("id", data.followupId);
    if (error) throw new Error(error.message);
    await audit({
      owner_id: userId,
      event_type: "cancel",
      status: "info",
      follow_up_id: data.followupId,
    });
    return { ok: true };
  });

export const markItemComplete = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { itemId: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("action_items")
      .update({ status: "complete", completed_at: new Date().toISOString() })
      .eq("id", data.itemId);
    if (error) throw new Error(error.message);

    // Cascade: cancel any pending follow-ups for this item so we don't email
    // someone after they've already delivered.
    const { data: cancelled } = await supabaseAdmin
      .from("follow_ups")
      .update({ status: "cancelled" })
      .eq("action_item_id", data.itemId)
      .in("status", ["pending_review", "auto_send"])
      .select("id");

    await audit({
      owner_id: userId,
      event_type: "item_complete",
      status: "success",
      action_item_id: data.itemId,
      metadata: { cancelled_followups: cancelled?.length ?? 0 },
    });

    return { ok: true, cancelled: cancelled?.length ?? 0 };
  });
