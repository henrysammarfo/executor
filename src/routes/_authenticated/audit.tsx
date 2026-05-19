import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, AlertTriangle, Info, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/audit")({
  head: () => ({ meta: [{ title: "Audit log — EXECUTOR" }] }),
  component: AuditPage,
});

const icons = {
  success: <CheckCircle2 className="h-4 w-4 text-[oklch(0.65_0.18_150)]" />,
  warn: <AlertTriangle className="h-4 w-4 text-[oklch(0.78_0.16_75)]" />,
  error: <AlertCircle className="h-4 w-4 text-[oklch(0.62_0.22_27)]" />,
  info: <Info className="h-4 w-4 text-foreground/50" />,
};

function AuditPage() {
  const { data: rows = [] } = useQuery({
    queryKey: ["audit"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("execution_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div>
      <h1 className="text-3xl md:text-4xl font-medium tracking-tight">Audit log</h1>
      <p className="text-foreground/60 mt-1">
        Every autonomous action EXECUTOR has taken. Last 200 entries.
      </p>

      <div className="mt-8 rounded-2xl border border-border/60 bg-card divide-y divide-border/60 overflow-hidden">
        {rows.length === 0 && (
          <div className="p-12 text-center text-foreground/50">Quiet so far.</div>
        )}
        {rows.map((r) => (
          <div key={r.id} className="p-4 flex items-start gap-3">
            <div className="mt-0.5">{icons[r.status as keyof typeof icons] ?? icons.info}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium uppercase tracking-wider text-xs text-foreground/70">
                  {r.event_type.replace("_", " ")}
                </span>
                <span className="text-xs text-foreground/40">·</span>
                <span className="text-xs text-foreground/40">
                  {new Date(r.created_at).toLocaleString()}
                </span>
              </div>
              {r.message && <div className="text-sm text-foreground/80 mt-1">{r.message}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
