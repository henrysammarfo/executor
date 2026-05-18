import { createFileRoute } from "@tanstack/react-router";
import "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway";
import { generateText, Output } from "ai";
import { z } from "zod";
import { audit } from "@/lib/audit.server";

const MAX_RETRIES = 3;

async function draftFor(item: {
  what: string;
  who_name: string | null;
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
  if (!lovableKey || !resendKey) throw new Error("Missing email credentials");
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
  return true;
}

export const Route = createFileRoute("/api/public/monitor")({
  server: {
    handlers: {
      POST: async () => {
        const now = new Date().toISOString();
        const stats = { marked_overdue: 0, drafted: 0, auto_sent: 0, retried: 0, failed: 0 };

        // 1) Mark overdue
        const { data: nowOverdue } = await supabaseAdmin
          .from("action_items")
          .update({ status: "overdue" })
          .eq("status", "open")
          .lt("due_date", now)
          .select("id, owner_id");
        stats.marked_overdue = nowOverdue?.length ?? 0;
        for (const r of nowOverdue ?? []) {
          await audit({
            owner_id: r.owner_id,
            event_type: "item_overdue",
            status: "warn",
            action_item_id: r.id,
          });
        }

        // 2) Draft follow-ups for overdue items without an active one
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
            const { data: inserted } = await supabaseAdmin.from("follow_ups").insert({
              action_item_id: item.id,
              owner_id: item.owner_id,
              draft_subject: draft.subject,
              draft_email: draft.body,
              status: "pending_review",
              scheduled_send_at: scheduled,
            }).select("id").single();
            stats.drafted++;
            await audit({
              owner_id: item.owner_id,
              event_type: "draft",
              status: "success",
              message: `Drafted follow-up for "${item.what.slice(0, 80)}"`,
              action_item_id: item.id,
              follow_up_id: inserted?.id,
            });
          } catch (e) {
            await audit({
              owner_id: item.owner_id,
              event_type: "draft",
              status: "error",
              message: (e as Error).message,
              action_item_id: item.id,
            });
          }
        }

        // 3) Auto-send pending past their scheduled time (with retry/failure tracking)
        const { data: due } = await supabaseAdmin
          .from("follow_ups")
          .select("*, action_items(who_email, who_name, what)")
          .eq("status", "pending_review")
          .lt("scheduled_send_at", now);
        for (const f of due ?? []) {
          const item = f.action_items as { who_email: string | null } | null;
          if (!item?.who_email) continue;
          try {
            await sendEmail(item.who_email, f.draft_subject, f.draft_email);
            await supabaseAdmin
              .from("follow_ups")
              .update({ status: "sent", sent_at: new Date().toISOString(), last_attempt_at: new Date().toISOString() })
              .eq("id", f.id);
            stats.auto_sent++;
            await audit({
              owner_id: f.owner_id,
              event_type: "send",
              status: "success",
              message: `Auto-sent to ${item.who_email}`,
              follow_up_id: f.id,
              action_item_id: f.action_item_id,
            });
          } catch (e) {
            const retries = (f.retry_count ?? 0) + 1;
            const giveUp = retries >= MAX_RETRIES;
            await supabaseAdmin
              .from("follow_ups")
              .update({
                retry_count: retries,
                last_error: (e as Error).message,
                last_attempt_at: new Date().toISOString(),
                status: giveUp ? "failed" : "pending_review",
                // back off: next retry in 1h * retries
                scheduled_send_at: giveUp ? f.scheduled_send_at : new Date(Date.now() + retries * 3600_000).toISOString(),
              })
              .eq("id", f.id);
            if (giveUp) stats.failed++; else stats.retried++;
            await audit({
              owner_id: f.owner_id,
              event_type: "send",
              status: "error",
              message: `${giveUp ? "Gave up after" : "Retry"} ${retries}: ${(e as Error).message}`,
              follow_up_id: f.id,
              action_item_id: f.action_item_id,
              metadata: { retry_count: retries },
            });
          }
        }

        await audit({
          event_type: "monitor_run",
          status: "info",
          message: `Marked ${stats.marked_overdue} overdue · Drafted ${stats.drafted} · Sent ${stats.auto_sent} · Retried ${stats.retried} · Failed ${stats.failed}`,
          metadata: stats,
        });

        return Response.json({ ok: true, ran_at: now, ...stats });
      },
      GET: async () => Response.json({ ok: true, hint: "POST to run monitor" }),
    },
  },
});
