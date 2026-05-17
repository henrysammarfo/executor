import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { sendFollowup, cancelFollowup } from "@/lib/followup-actions.functions";
import { toast } from "sonner";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/_authenticated/followups")({
  head: () => ({ meta: [{ title: "Follow-ups — EXECUTOR" }] }),
  component: FollowupsPage,
});

function FollowupsPage() {
  const qc = useQueryClient();
  const send = useServerFn(sendFollowup);
  const cancel = useServerFn(cancelFollowup);
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

  return (
    <div>
      <h1 className="text-3xl md:text-4xl font-medium tracking-tight">Follow-ups</h1>
      <p className="text-foreground/60 mt-1">EXECUTOR drafts these autonomously when commitments slip. Review or let them send.</p>
      <div className="mt-8 space-y-4">
        {rows.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center bg-card text-foreground/60">
            No follow-ups yet. EXECUTOR drafts one when an item goes overdue.
          </div>
        )}
        {rows.map(f => {
          const item = f.action_items as { what: string; who_name: string | null; who_email: string | null } | null;
          return (
            <div key={f.id} className="rounded-2xl bg-card border border-border/60 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs text-foreground/50 uppercase tracking-wider">To {item?.who_email ?? "—"}</div>
                  <div className="font-medium mt-1">{f.draft_subject}</div>
                  <div className="text-xs text-foreground/60 mt-1">Re: {item?.what}</div>
                </div>
                <StatusBadge status={f.status} scheduled={f.scheduled_send_at} />
              </div>
              <pre className="mt-4 text-sm whitespace-pre-wrap font-sans text-foreground/85 bg-secondary/40 rounded-xl p-4 border border-border/40">
                {f.draft_email}
              </pre>
              {f.status === "pending_review" && (
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={async () => {
                      const t = toast.loading("Sending…");
                      try { await send({ data: { followupId: f.id } }); toast.success("Sent", { id: t }); qc.invalidateQueries({ queryKey: ["followups"] }); }
                      catch (e) { toast.error((e as Error).message, { id: t }); }
                    }}
                    className="cta-glossy rounded-full px-4 py-2 text-sm"
                  >Send now</button>
                  <button
                    onClick={async () => { await cancel({ data: { followupId: f.id } }); qc.invalidateQueries({ queryKey: ["followups"] }); }}
                    className="rounded-full border border-border px-4 py-2 text-sm hover:bg-secondary"
                  >Cancel</button>
                </div>
              )}
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
      if (ms <= 0) { setLeft("auto-sends now"); return; }
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      setLeft(`auto-sends in ${h}h ${m}m`);
    };
    tick();
    const i = setInterval(tick, 30000);
    return () => clearInterval(i);
  }, [status, scheduled]);
  const tint =
    status === "sent" ? "bg-[oklch(0.72_0.16_150)] text-white" :
    status === "cancelled" ? "bg-secondary text-foreground/60" :
    "bg-[oklch(0.78_0.16_75)] text-foreground";
  return (
    <div className="text-right">
      <span className={`text-[10px] uppercase tracking-wider rounded-full px-2 py-0.5 ${tint}`}>{status.replace("_", " ")}</span>
      {status === "pending_review" && <div className="text-xs text-foreground/50 mt-1">{left}</div>}
    </div>
  );
}
