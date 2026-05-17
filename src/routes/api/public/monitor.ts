import { createFileRoute } from "@tanstack/react-router";
import "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway";
import { generateText, Output } from "ai";
import { z } from "zod";

async function draftFor(item: {
  id: string;
  what: string;
  who_name: string | null;
  who_email: string | null;
  due_date: string | null;
  priority: string;
  verbatim_quote: string | null;
}) {
  const gateway = createLovableAiGatewayProvider(process.env.LOVABLE_API_KEY!);
  const model = gateway("google/gemini-3-pro-preview");
  const { experimental_output } = await generateText({
    model,
    prompt: `Draft a brief, firm but collaborative follow-up email about an overdue commitment.
Action: ${item.what}
Owner: ${item.who_name ?? "assignee"}
Original deadline: ${item.due_date}
Commitment quote: "${item.verbatim_quote ?? ""}"
Priority: ${item.priority}
4-6 short sentences. Ask for a status update and a new realistic deadline.`,
    experimental_output: Output.object({
      schema: z.object({ subject: z.string(), body: z.string() }),
    }),
  });
  return experimental_output;
}

async function sendEmail(to: string, subject: string, text: string) {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  if (!lovableKey || !resendKey) return false;
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
  return res.ok;
}

export const Route = createFileRoute("/api/public/monitor")({
  server: {
    handlers: {
      POST: async () => {
        const now = new Date().toISOString();
        let stats = { marked_overdue: 0, drafted: 0, auto_sent: 0 };

        // 1) Mark overdue
        const { data: nowOverdue } = await supabaseAdmin
          .from("action_items")
          .update({ status: "overdue" })
          .eq("status", "open")
          .lt("due_date", now)
          .select("id");
        stats.marked_overdue = nowOverdue?.length ?? 0;

        // 2) For overdue items without a pending follow-up, draft one
        const { data: overdue } = await supabaseAdmin
          .from("action_items")
          .select("*")
          .eq("status", "overdue");
        for (const item of overdue ?? []) {
          if (!item.who_email) continue;
          const { data: existing } = await supabaseAdmin
            .from("follow_ups")
            .select("id, status")
            .eq("action_item_id", item.id)
            .in("status", ["pending_review", "auto_send", "sent"])
            .limit(1);
          if (existing && existing.length > 0) continue;
          try {
            const draft = await draftFor(item);
            const scheduled = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
            await supabaseAdmin.from("follow_ups").insert({
              action_item_id: item.id,
              owner_id: item.owner_id,
              draft_subject: draft.subject,
              draft_email: draft.body,
              status: "pending_review",
              scheduled_send_at: scheduled,
            });
            stats.drafted++;
          } catch (e) {
            console.error("draft failed for", item.id, e);
          }
        }

        // 3) Auto-send anything pending past its scheduled_send_at
        const { data: due } = await supabaseAdmin
          .from("follow_ups")
          .select("*, action_items(who_email, who_name, what)")
          .eq("status", "pending_review")
          .lt("scheduled_send_at", now);
        for (const f of due ?? []) {
          const item = f.action_items as { who_email: string | null } | null;
          if (!item?.who_email) continue;
          const ok = await sendEmail(item.who_email, f.draft_subject, f.draft_email);
          if (ok) {
            await supabaseAdmin
              .from("follow_ups")
              .update({ status: "sent", sent_at: new Date().toISOString() })
              .eq("id", f.id);
            stats.auto_sent++;
          }
        }

        return Response.json({ ok: true, ran_at: now, ...stats });
      },
      GET: async () => Response.json({ ok: true, hint: "POST to run monitor" }),
    },
  },
});
