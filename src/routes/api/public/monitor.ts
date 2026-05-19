import { createFileRoute } from "@tanstack/react-router";
import "@tanstack/react-start";
import { timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getGeminiProModel } from "@/lib/ai-gateway";
import { generateText, Output } from "ai";
import { z } from "zod";
import { audit } from "@/lib/audit.server";

const MAX_RETRIES = 3;

function getCronToken(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice("Bearer ".length);
  return request.headers.get("x-cron-key");
}

function verifyCronRequest(request: Request) {
  const secret = process.env.CRON_SECRET;
  const token = getCronToken(request);
  if (!secret) {
    return { ok: false, response: new Response("CRON_SECRET not configured", { status: 503 }) };
  }
  if (!token) {
    return { ok: false, response: new Response("Missing cron authorization", { status: 401 }) };
  }

  const expected = Buffer.from(secret);
  const actual = Buffer.from(token);
  const valid = expected.length === actual.length && timingSafeEqual(expected, actual);
  if (!valid) {
    return { ok: false, response: new Response("Invalid cron authorization", { status: 401 }) };
  }

  return { ok: true, response: null };
}

async function draftFor(item: {
  what: string;
  who_name: string | null;
  who_email?: string | null;
  due_date: string | null;
  priority: string;
  risk_score?: number | null;
  risk_reason?: string | null;
  verbatim_quote: string | null;
}) {
  const model = getGeminiProModel();
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

async function draftEscalationFor(item: {
  what: string;
  who_name: string | null;
  who_email: string | null;
  manager_email: string | null;
  due_date: string | null;
  priority: string;
  risk_score: number | null;
  risk_reason: string | null;
  verbatim_quote: string | null;
}) {
  const model = getGeminiProModel();
  const { experimental_output } = await generateText({
    model,
    prompt: `Draft a concise escalation email to the manager for an overdue commitment that has already missed two follow-ups.

Action: ${item.what}
Assignee: ${item.who_name ?? "Unassigned"}${item.who_email ? ` <${item.who_email}>` : ""}
Manager: ${item.manager_email}
Original deadline: ${item.due_date ?? "unspecified"}
Priority: ${item.priority}
Risk score: ${item.risk_score ?? "not scored"}${item.risk_reason ? ` - ${item.risk_reason}` : ""}
Commitment quote: "${item.verbatim_quote ?? ""}"

Tone: direct, factual, and professional. 4-6 short sentences. Ask the manager to unblock or reassign the work and provide a concrete recovery date. Do not blame the assignee.`,
    experimental_output: Output.object({
      schema: z.object({ subject: z.string(), body: z.string() }),
    }),
  });
  return experimental_output;
}

async function sendEmail(to: string, subject: string, text: string) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) throw new Error("RESEND_API_KEY not configured");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resendKey}`,
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM ?? "EXECUTOR <onboarding@resend.dev>",
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
      POST: async ({ request }) => {
        const auth = verifyCronRequest(request);
        if (!auth.ok) return auth.response;

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
          const { data: existing } = await supabaseAdmin
            .from("follow_ups")
            .select("id, status")
            .eq("action_item_id", item.id)
            .in("status", ["pending_review", "auto_send"])
            .limit(1);
          if (existing && existing.length > 0) continue;

          const { data: sentFollowups } = await supabaseAdmin
            .from("follow_ups")
            .select("id, sent_at, escalation_level")
            .eq("action_item_id", item.id)
            .eq("status", "sent")
            .order("sent_at", { ascending: false });

          const ownerFollowups = (sentFollowups ?? []).filter(
            (f) => (f.escalation_level ?? 0) === 0,
          );
          const hasManagerEscalation =
            item.escalation_count > 0 ||
            (sentFollowups ?? []).some((f) => (f.escalation_level ?? 0) > 0);
          const lastOwnerSentAt = ownerFollowups[0]?.sent_at
            ? new Date(ownerFollowups[0].sent_at).getTime()
            : null;
          const ownerCooldownActive =
            lastOwnerSentAt != null && Date.now() - lastOwnerSentAt < 24 * 60 * 60 * 1000;

          if (ownerFollowups.length >= 2 && item.manager_email && !hasManagerEscalation) {
            try {
              const draft = await draftEscalationFor(item);
              const scheduled = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
              const { data: inserted } = await supabaseAdmin
                .from("follow_ups")
                .insert({
                  action_item_id: item.id,
                  owner_id: item.owner_id,
                  draft_subject: draft.subject,
                  draft_email: draft.body,
                  recipient_email: item.manager_email,
                  recipient_name: "Manager",
                  escalation_level: 1,
                  escalation_reason:
                    "Two owner follow-ups were sent and the item is still overdue.",
                  status: "pending_review",
                  scheduled_send_at: scheduled,
                })
                .select("id")
                .single();
              await supabaseAdmin
                .from("action_items")
                .update({
                  escalation_count: item.escalation_count + 1,
                  last_escalated_at: new Date().toISOString(),
                })
                .eq("id", item.id);
              stats.drafted++;
              await audit({
                owner_id: item.owner_id,
                event_type: "manager_escalation_draft",
                status: "warn",
                message: `Drafted manager escalation for "${item.what.slice(0, 80)}"`,
                action_item_id: item.id,
                follow_up_id: inserted?.id,
              });
            } catch (e) {
              await audit({
                owner_id: item.owner_id,
                event_type: "manager_escalation_draft",
                status: "error",
                message: (e as Error).message,
                action_item_id: item.id,
              });
            }
            continue;
          }

          if (!item.who_email || ownerCooldownActive) continue;
          try {
            const draft = await draftFor(item);
            const scheduled = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
            const { data: inserted } = await supabaseAdmin
              .from("follow_ups")
              .insert({
                action_item_id: item.id,
                owner_id: item.owner_id,
                draft_subject: draft.subject,
                draft_email: draft.body,
                recipient_email: item.who_email,
                recipient_name: item.who_name,
                escalation_level: 0,
                status: "pending_review",
                scheduled_send_at: scheduled,
              })
              .select("id")
              .single();
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
          const recipient = f.recipient_email ?? item?.who_email;
          if (!recipient) continue;
          try {
            await sendEmail(recipient, f.draft_subject, f.draft_email);
            await supabaseAdmin
              .from("follow_ups")
              .update({
                status: "sent",
                sent_at: new Date().toISOString(),
                last_attempt_at: new Date().toISOString(),
              })
              .eq("id", f.id);
            stats.auto_sent++;
            await audit({
              owner_id: f.owner_id,
              event_type: "send",
              status: "success",
              message: `${(f.escalation_level ?? 0) > 0 ? "Auto-sent escalation" : "Auto-sent"} to ${recipient}`,
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
                scheduled_send_at: giveUp
                  ? f.scheduled_send_at
                  : new Date(Date.now() + retries * 3600_000).toISOString(),
              })
              .eq("id", f.id);
            if (giveUp) stats.failed++;
            else stats.retried++;
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
