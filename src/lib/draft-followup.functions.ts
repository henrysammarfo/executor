import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getGeminiProModel } from "@/lib/ai-gateway";
import { generateText, Output } from "ai";
import { z } from "zod";

export const draftFollowup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { itemId: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: item, error } = await supabase
      .from("action_items")
      .select("*, meetings(title, organizer_email)")
      .eq("id", data.itemId)
      .single();
    if (error || !item) throw new Error("Item not found");
    if (!item.who_email) throw new Error("Add an owner email before drafting a follow-up.");

    const { data: existing } = await supabase
      .from("follow_ups")
      .select("*")
      .eq("action_item_id", item.id)
      .in("status", ["pending_review", "auto_send"])
      .limit(1)
      .maybeSingle();
    if (existing) return existing;

    const model = getGeminiProModel();

    const today = new Date();
    const due = item.due_date ? new Date(item.due_date) : null;
    const overdueDays = item.due_date
      ? Math.max(0, Math.floor((today.getTime() - new Date(item.due_date).getTime()) / 86400000))
      : 0;
    const daysUntilDue = due ? Math.ceil((due.getTime() - today.getTime()) / 86400000) : null;
    const timingContext =
      overdueDays > 0
        ? `${overdueDays} day${overdueDays === 1 ? "" : "s"} overdue`
        : daysUntilDue == null
          ? "no deadline is currently set"
          : daysUntilDue <= 0
            ? "due today"
            : `due in ${daysUntilDue} day${daysUntilDue === 1 ? "" : "s"}`;

    const { experimental_output } = await generateText({
      model,
      prompt: `Draft a brief, professional follow-up email from the meeting organizer to ${item.who_name ?? "the assignee"} about a commitment that needs attention.

Action item: "${item.what}"
Committed during: ${(item.meetings as { title: string } | null)?.title ?? "the meeting"}
Original commitment: "${item.verbatim_quote ?? "stated during the meeting"}"
Deadline: ${item.due_date ?? "unspecified"} (${timingContext})
Priority: ${item.priority}
Risk score: ${item.risk_score ?? "not scored"}

Tone: firm but collaborative. 4-6 short sentences. Ask for status, blockers, and the next concrete delivery date. No fluff, no greeting "I hope this finds you well". Sign as the organizer.`,
      experimental_output: Output.object({
        schema: z.object({ subject: z.string(), body: z.string() }),
      }),
    });

    const scheduled = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const { data: inserted, error: insErr } = await supabase
      .from("follow_ups")
      .insert({
        action_item_id: item.id,
        owner_id: userId,
        draft_subject: experimental_output.subject,
        draft_email: experimental_output.body,
        recipient_email: item.who_email,
        recipient_name: item.who_name,
        escalation_level: 0,
        status: "pending_review",
        scheduled_send_at: scheduled,
      })
      .select("*")
      .single();
    if (insErr) throw new Error(insErr.message);
    return inserted;
  });
