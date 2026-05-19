import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getGeminiProModel } from "@/lib/ai-gateway";
import { generateText, Output } from "ai";
import { z } from "zod";
import { audit } from "@/lib/audit.server";
import { scoreActionItemRisk } from "@/lib/risk-score";

const ItemSchema = z.object({
  what: z.string(),
  who_name: z.string().nullable(),
  who_email: z.string().nullable(),
  due_date: z.string().nullable(),
  priority: z.enum(["high", "medium", "low"]),
  verbatim_quote: z.string().nullable(),
});

// Admin-side extraction used by webhook ingest (no user context).
export async function extractForMeetingAdmin(meetingId: string) {
  const { data: meeting, error } = await supabaseAdmin
    .from("meetings")
    .select("id, owner_id, transcript_text")
    .eq("id", meetingId)
    .single();
  if (error || !meeting) throw new Error("Meeting not found");
  if (!meeting.transcript_text) throw new Error("Meeting has no transcript");

  const model = getGeminiProModel();
  const today = new Date().toISOString().slice(0, 10);

  const { experimental_output } = await generateText({
    model,
    prompt: `Today is ${today}. Extract every action item from this transcript with what, who_name, who_email, due_date (ISO or null), priority (high/medium/low), verbatim_quote.

TRANSCRIPT:
${meeting.transcript_text}`,
    experimental_output: Output.object({
      schema: z.object({ items: z.array(ItemSchema) }),
    }),
  });

  const items = experimental_output.items;
  if (items.length === 0) {
    await audit({
      owner_id: meeting.owner_id,
      event_type: "extract",
      status: "warn",
      message: "No action items found",
      meeting_id: meeting.id,
    });
    return { inserted: 0 };
  }

  const rows = items.map((it) => {
    const baselineRisk = scoreActionItemRisk(it);
    return {
      meeting_id: meeting.id,
      owner_id: meeting.owner_id,
      what: it.what,
      who_name: it.who_name,
      who_email: it.who_email,
      due_date: it.due_date,
      priority: it.priority,
      verbatim_quote: it.verbatim_quote,
      risk_score: baselineRisk.score,
      risk_reason: baselineRisk.reason,
      status: "open" as const,
    };
  });

  const { data: inserted, error: iErr } = await supabaseAdmin
    .from("action_items")
    .insert(rows)
    .select("id");
  if (iErr) throw new Error(iErr.message);

  await audit({
    owner_id: meeting.owner_id,
    event_type: "extract",
    status: "success",
    message: `Extracted ${inserted?.length ?? 0} action items`,
    meeting_id: meeting.id,
    metadata: { count: inserted?.length ?? 0 },
  });

  return { inserted: inserted?.length ?? 0 };
}
