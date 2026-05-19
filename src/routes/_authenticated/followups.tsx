import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { sendFollowup, cancelFollowup, retryFollowup } from "@/lib/followup-actions.functions";
import { toast } from "sonner";
import { useEffect, useMemo, useState } from "react";

type Tab = "all" | "pending_review" | "sent" | "failed" | "cancelled";

export const Route = createFileRoute("/_authenticated/followups")({
  head: () => ({ meta: [{ title: "Follow-ups — EXECUTOR" }] }),
  component: FollowupsPage,
});

function FollowupsPage() {
  const qc = useQueryClient();
  const send = useServerFn(sendFollowup);
  const cancel = useServerFn(cancelFollowup);
  const retry = useServerFn(retryFollowup);
  const [tab, setTab] = useState<Tab>("all");

  const { data: rows = [] } = useQuery({
    queryKey: ["followups"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("follow_ups")
        .select("*, action_items(what, who_name, who_email)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const counts = useMemo(() => {
    const c: Record<string, number> = {
      all: rows.length,
      pending_review: 0,
      sent: 0,
      failed: 0,
      cancelled: 0,
    };
    for (const r of rows) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [rows]);

  const visible = rows.filter((r) => tab === "all" || r.status === tab);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["followups"] });

  return (
    <div>
      <h1 className="text-3xl md:text-4xl font-medium tracking-tight">Follow-ups</h1>
      <p className="text-foreground/60 mt-1">
        EXECUTOR drafts these autonomously when commitments slip. Review or let them send.
      </p>

      <div className="mt-6 flex flex-wrap gap-1.5 bg-card border border-border/60 rounded-full p-1 w-fit">
        {(["all", "pending_review", "sent", "failed", "cancelled"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-full text-xs uppercase tracking-wider transition ${tab === t ? "bg-foreground text-background" : "text-foreground/60 hover:text-foreground"}`}
          >
            {t.replace("_", " ")} <span className="opacity-60 ml-1">{counts[t] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-4">
        {visible.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center bg-card text-foreground/60">
            Nothing here yet.
          </div>
        )}
        {visible.map((f) => {
          const item = f.action_items as {
            what: string;
            who_name: string | null;
            who_email: string | null;
          } | null;
          return (
            <div key={f.id} className="rounded-2xl bg-card border border-border/60 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs text-foreground/50 uppercase tracking-wider">
                    To {f.recipient_email ?? item?.who_email ?? "-"}
                  </div>
                  <div className="font-medium mt-1">{f.draft_subject}</div>
                  <div className="text-xs text-foreground/60 mt-1">Re: {item?.what}</div>
                  {(f.escalation_level ?? 0) > 0 && (
                    <div className="mt-2 inline-flex rounded-full bg-[oklch(0.62_0.22_27)]/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-[oklch(0.62_0.22_27)]">
                      Manager escalation
                    </div>
                  )}
                </div>
                <StatusBadge status={f.status} scheduled={f.scheduled_send_at} />
              </div>
              <pre className="mt-4 text-sm whitespace-pre-wrap font-sans text-foreground/85 bg-secondary/40 rounded-xl p-4 border border-border/40">
                {f.draft_email}
              </pre>
              {f.last_error && (
                <div className="mt-3 text-xs text-[oklch(0.62_0.22_27)] bg-[oklch(0.62_0.22_27)]/8 rounded-lg px-3 py-2 border border-[oklch(0.62_0.22_27)]/20">
                  <span className="font-medium">Last error:</span> {f.last_error}
                  {(f.retry_count ?? 0) > 0 && (
                    <span className="ml-2 opacity-70">
                      · {f.retry_count} attempt{f.retry_count === 1 ? "" : "s"}
                    </span>
                  )}
                </div>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                {f.status === "pending_review" && (
                  <>
                    <button
                      onClick={async () => {
                        const t = toast.loading("Sending…");
                        try {
                          await send({ data: { followupId: f.id } });
                          toast.success("Sent", { id: t });
                          invalidate();
                        } catch (e) {
                          toast.error((e as Error).message, { id: t });
                          invalidate();
                        }
                      }}
                      className="cta-glossy rounded-full px-4 py-2 text-sm"
                    >
                      Send now
                    </button>
                    <button
                      onClick={async () => {
                        await cancel({ data: { followupId: f.id } });
                        invalidate();
                      }}
                      className="rounded-full border border-border px-4 py-2 text-sm hover:bg-secondary"
                    >
                      Cancel
                    </button>
                  </>
                )}
                {f.status === "failed" && (
                  <button
                    onClick={async () => {
                      await retry({ data: { followupId: f.id } });
                      toast.success("Re-queued");
                      invalidate();
                    }}
                    className="rounded-full border border-border px-4 py-2 text-sm hover:bg-secondary"
                  >
                    Retry
                  </button>
                )}
                {f.sent_at && (
                  <span className="text-xs text-foreground/50 self-center">
                    Sent {new Date(f.sent_at).toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatusBadge({ status, scheduled }: { status: string; scheduled: string | null }) {
  const [left, setLeft] = useState("");
  useEffect(() => {
    if (status !== "pending_review" || !scheduled) return;
    const tick = () => {
      const ms = new Date(scheduled).getTime() - Date.now();
      if (ms <= 0) {
        setLeft("auto-sends now");
        return;
      }
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      setLeft(`auto-sends in ${h}h ${m}m`);
    };
    tick();
    const i = setInterval(tick, 30000);
    return () => clearInterval(i);
  }, [status, scheduled]);
  const tint =
    status === "sent"
      ? "bg-[oklch(0.72_0.16_150)] text-white"
      : status === "failed"
        ? "bg-[oklch(0.62_0.22_27)] text-white"
        : status === "cancelled"
          ? "bg-secondary text-foreground/60"
          : "bg-[oklch(0.78_0.16_75)] text-foreground";
  return (
    <div className="text-right">
      <span className={`text-[10px] uppercase tracking-wider rounded-full px-2 py-0.5 ${tint}`}>
        {status.replace("_", " ")}
      </span>
      {status === "pending_review" && <div className="text-xs text-foreground/50 mt-1">{left}</div>}
    </div>
  );
}
