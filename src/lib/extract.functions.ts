import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway";
import { generateText, Output } from "ai";
import { z } from "zod";

const ItemSchema = z.object({
  what: z.string(),
  who_name: z.string().nullable(),
  who_email: z.string().nullable(),
  due_date: z.string().nullable(),
  priority: z.enum(["high", "medium", "low"]),
  verbatim_quote: z.string().nullable(),
});

export const extractActionItems = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { meetingId: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: meeting, error: mErr } = await supabase
      .from("meetings")
      .select("id, transcript_text, created_at")
      .eq("id", data.meetingId)
      .single();
    if (mErr || !meeting) throw new Error("Meeting not found");
    if (!meeting.transcript_text) throw new Error("Meeting has no transcript");

    const apiKey = process.env.LOVABLE_API_KEY!;
    const gateway = createLovableAiGatewayProvider(apiKey);
    const model = gateway("google/gemini-3-pro-preview");

    const today = new Date().toISOString().slice(0, 10);
    const prompt = `Today is ${today}. Extract every action item from this meeting transcript.

For each item identify:
- what: the specific deliverable in one short sentence
- who_name: the person committed to it (or null if unclear)
- who_email: their email if mentioned (else null)
- due_date: ISO 8601 datetime if a deadline is mentioned or implied (else null). Resolve relative dates like "by Friday" against today.
- priority: high / medium / low based on tone, urgency, and stated importance
- verbatim_quote: the exact line from the transcript that established the commitment

Return an array of items.

TRANSCRIPT:
${meeting.transcript_text}`;

    const { experimental_output } = await generateText({
      model,
      prompt,
      experimental_output: Output.object({
        schema: z.object({ items: z.array(ItemSchema) }),
      }),
    });

    const items = experimental_output.items;
    if (items.length === 0) return { inserted: 0, items: [] };

    const rows = items.map((it) => ({
      meeting_id: meeting.id,
      owner_id: userId,
      what: it.what,
      who_name: it.who_name,
      who_email: it.who_email,
      due_date: it.due_date,
      priority: it.priority,
      verbatim_quote: it.verbatim_quote,
      status: "open" as const,
    }));

    const { data: inserted, error: iErr } = await supabase
      .from("action_items")
      .insert(rows)
      .select("*");
    if (iErr) throw new Error(iErr.message);

    // Best-effort risk scoring (don't fail if it errors)
    try {
      const riskModel = gateway("google/gemini-3-flash-preview");
      await Promise.all(
        (inserted ?? []).map(async (row) => {
          const { experimental_output: r } = await generateText({
            model: riskModel,
            prompt: `Score completion risk 0-100 (higher = more likely to slip).
What: ${row.what}
Who: ${row.who_name ?? "unassigned"}
Due: ${row.due_date ?? "no date"}
Priority: ${row.priority}
Today: ${today}`,
            experimental_output: Output.object({
              schema: z.object({ score: z.number().min(0).max(100), reason: z.string() }),
            }),
          });
          await supabase
            .from("action_items")
            .update({ risk_score: r.score, risk_reason: r.reason })
            .eq("id", row.id);
        }),
      );
    } catch (e) {
      console.error("risk scoring failed", e);
    }

    return { inserted: inserted?.length ?? 0, items: inserted };
  });
