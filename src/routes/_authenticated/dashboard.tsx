import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { draftFollowup } from "@/lib/draft-followup.functions";
import { markItemComplete } from "@/lib/followup-actions.functions";
import { toast } from "sonner";
import { motion } from "motion/react";
import { CalendarClock, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — EXECUTOR" }] }),
  component: DashboardPage,
});

type Item = {
  id: string;
  what: string;
  who_name: string | null;
  who_email: string | null;
  due_date: string | null;
  priority: "high" | "medium" | "low";
  status: "open" | "overdue" | "complete";
  risk_score: number | null;
  risk_reason: string | null;
  meeting_id: string;
};

function useItems() {
  return useQuery({
    queryKey: ["items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("action_items")
        .select("*")
        .order("due_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as Item[];
    },
  });
}

function DashboardPage() {
  const { data: items = [], isLoading } = useItems();
  const qc = useQueryClient();
  const draft = useServerFn(draftFollowup);
  const complete = useServerFn(markItemComplete);

  const total = items.length;
  const done = items.filter((i) => i.status === "complete").length;
  const overdueItems = items.filter((i) => i.status === "overdue");
  const openItems = items.filter((i) => i.status === "open");
  const doneItems = items.filter((i) => i.status === "complete");
  const completionPct = total > 0 ? Math.round((done / total) * 100) : 0;

  const onDraft = async (id: string) => {
    const t = toast.loading("Drafting follow-up…");
    try {
      await draft({ data: { itemId: id } });
      toast.success("Draft ready in Follow-ups", { id: t });
    } catch (e) {
      toast.error((e as Error).message, { id: t });
    }
  };
  const onComplete = async (id: string) => {
    try {
      await complete({ data: { itemId: id } });
      qc.invalidateQueries({ queryKey: ["items"] });
      toast.success("Marked complete");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-medium tracking-tight">Execution dashboard</h1>
          <p className="text-foreground/60 mt-1">
            Every commitment from every meeting. Risk-scored and watched.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="rounded-2xl bg-card border border-border/60 px-5 py-3">
            <div className="text-xs text-foreground/50 uppercase tracking-wider">Completion</div>
            <div className="flex items-center gap-3 mt-1">
              <div className="text-2xl font-medium">
                {done}/{total}
              </div>
              <div className="w-24 h-2 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full bg-[oklch(0.72_0.16_150)]"
                  style={{ width: `${completionPct}%` }}
                />
              </div>
            </div>
          </div>
          <Link to="/upload" className="cta-glossy rounded-full px-5 py-3 text-sm">
            New meeting
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-20 text-foreground/50">
          <Loader2 className="h-5 w-5 animate-spin inline mr-2" />
          Loading…
        </div>
      ) : total === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid lg:grid-cols-3 gap-5">
          <Column title="In Progress" count={openItems.length} tint="bg-card">
            {openItems.map((i) => (
              <ItemCard key={i.id} item={i} onDraft={onDraft} onComplete={onComplete} />
            ))}
            {openItems.length === 0 && <Empty label="Nothing in flight" />}
          </Column>
          <Column
            title="Overdue"
            count={overdueItems.length}
            tint="bg-[color-mix(in_oklab,var(--risk-high)_8%,var(--card))] border-[color-mix(in_oklab,var(--risk-high)_30%,var(--border))]"
          >
            {overdueItems.map((i) => (
              <ItemCard key={i.id} item={i} onDraft={onDraft} onComplete={onComplete} highlight />
            ))}
            {overdueItems.length === 0 && <Empty label="Clean. Nothing past due." />}
          </Column>
          <Column title="Complete" count={doneItems.length} tint="bg-card">
            {doneItems.map((i) => (
              <ItemCard key={i.id} item={i} onDraft={onDraft} onComplete={onComplete} muted />
            ))}
            {doneItems.length === 0 && <Empty label="Mark items complete to see them here" />}
          </Column>
        </div>
      )}
    </div>
  );
}

function Column({
  title,
  count,
  tint,
  children,
}: {
  title: string;
  count: number;
  tint: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-2xl border border-border/60 p-4 ${tint}`}>
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="font-medium">{title}</div>
        <div className="text-xs text-foreground/50">{count}</div>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return <div className="text-center text-sm text-foreground/40 py-8">{label}</div>;
}

function ItemCard({
  item,
  onDraft,
  onComplete,
  highlight,
  muted,
}: {
  item: Item;
  onDraft: (id: string) => void;
  onComplete: (id: string) => void;
  highlight?: boolean;
  muted?: boolean;
}) {
  const risk = item.risk_score;
  const riskTint =
    risk == null
      ? "bg-secondary text-foreground/60"
      : risk >= 67
        ? "bg-[oklch(0.62_0.22_27)] text-white"
        : risk >= 34
          ? "bg-[oklch(0.78_0.16_75)] text-foreground"
          : "bg-[oklch(0.72_0.16_150)] text-white";
  const due = item.due_date ? new Date(item.due_date) : null;
  const overdueDays =
    due && item.status === "overdue" ? Math.floor((Date.now() - due.getTime()) / 86400000) : 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl bg-card border ${highlight ? "border-[color-mix(in_oklab,var(--risk-high)_60%,var(--border))]" : "border-border/60"} p-4 ${muted ? "opacity-60" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm font-medium leading-snug">{item.what}</div>
        <span
          className={`text-[10px] uppercase tracking-wider rounded-full px-2 py-0.5 ${riskTint}`}
        >
          {risk == null ? "—" : `${risk}`}
        </span>
      </div>
      <div className="mt-3 flex items-center gap-3 text-xs text-foreground/60">
        <span>{item.who_name ?? "Unassigned"}</span>
        {due && (
          <span
            className={`inline-flex items-center gap-1 ${item.status === "overdue" ? "text-[oklch(0.62_0.22_27)]" : ""}`}
          >
            <CalendarClock className="h-3 w-3" />
            {due.toLocaleDateString()}
            {overdueDays > 0 && <span>· {overdueDays}d late</span>}
          </span>
        )}
        <span className="ml-auto uppercase text-[10px] tracking-wider">{item.priority}</span>
      </div>
      {item.risk_reason && (
        <div className="mt-2 text-xs text-foreground/50 italic line-clamp-2">
          {item.risk_reason}
        </div>
      )}
      {!muted && (
        <div className="mt-3 flex gap-2">
          {item.who_email && (item.status === "overdue" || (risk ?? 0) >= 67) && (
            <button
              onClick={() => onDraft(item.id)}
              className="text-xs rounded-full bg-foreground text-background px-3 py-1.5 inline-flex items-center gap-1"
            >
              <AlertTriangle className="h-3 w-3" /> Draft follow-up
            </button>
          )}
          <button
            onClick={() => onComplete(item.id)}
            className="text-xs rounded-full border border-border px-3 py-1.5 inline-flex items-center gap-1 hover:bg-secondary"
          >
            <CheckCircle2 className="h-3 w-3" /> Done
          </button>
        </div>
      )}
    </motion.div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-3xl border border-dashed border-border p-16 text-center bg-card">
      <h3 className="text-xl font-medium">No commitments tracked yet.</h3>
      <p className="text-foreground/60 mt-2 max-w-md mx-auto">
        Upload a meeting transcript or audio file. EXECUTOR will extract every action item with
        owner, deadline, and risk score.
      </p>
      <Link to="/upload" className="mt-6 inline-block cta-glossy rounded-full px-5 py-3 text-sm">
        Upload your first meeting
      </Link>
    </div>
  );
}
