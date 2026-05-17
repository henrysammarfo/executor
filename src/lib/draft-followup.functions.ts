import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway";
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

    const gateway = createLovableAiGatewayProvider(process.env.LOVABLE_API_KEY!);
    const model = gateway("google/gemini-3-pro-preview");

    const today = new Date();
    const overdueDays = item.due_date
      ? Math.max(0, Math.floor((today.getTime() - new Date(item.due_date).getTime()) / 86400000))
      : 0;

    const { experimental_output } = await generateText({
      model,
      prompt: `Draft a brief, professional follow-up email from the meeting organizer to ${item.who_name ?? "the assignee"} about an overdue action item.

Action item: "${item.what}"
Committed during: ${(item.meetings as { title: string } | null)?.title ?? "the meeting"}
Original commitment: "${item.verbatim_quote ?? "stated during the meeting"}"
Original deadline: ${item.due_date ?? "unspecified"} (${overdueDays} day${overdueDays === 1 ? "" : "s"} overdue)
Priority: ${item.priority}

Tone: firm but collaborative. 4-6 short sentences. Ask for an update and a new realistic deadline. No fluff, no greeting "I hope this finds you well". Sign as the organizer.`,
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
        status: "pending_review",
        scheduled_send_at: scheduled,
      })
      .select("*")
      .single();
    if (insErr) throw new Error(insErr.message);
    return inserted;
  });
