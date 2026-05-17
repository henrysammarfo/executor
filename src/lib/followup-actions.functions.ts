import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const sendFollowup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { followupId: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: f, error } = await supabase
      .from("follow_ups")
      .select("*, action_items(who_email, who_name, what)")
      .eq("id", data.followupId)
      .single();
    if (error || !f) throw new Error("Follow-up not found");

    const item = f.action_items as { who_email: string | null; who_name: string | null; what: string } | null;
    const to = item?.who_email;
    if (!to) throw new Error("No recipient email on action item");

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
        subject: f.draft_subject,
        text: f.draft_email,
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Resend failed: ${t}`);
    }

    const { error: uErr } = await supabase
      .from("follow_ups")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", f.id);
    if (uErr) throw new Error(uErr.message);

    return { ok: true };
  });

export const cancelFollowup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { followupId: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("follow_ups")
      .update({ status: "cancelled" })
      .eq("id", data.followupId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const markItemComplete = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { itemId: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("action_items")
      .update({ status: "complete", completed_at: new Date().toISOString() })
      .eq("id", data.itemId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
