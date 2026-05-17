import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/meetings/$id")({
  head: () => ({ meta: [{ title: "Meeting — EXECUTOR" }] }),
  component: MeetingDetail,
});

function MeetingDetail() {
  const { id } = Route.useParams();
  const { data } = useQuery({
    queryKey: ["meeting", id],
    queryFn: async () => {
      const [{ data: m }, { data: items }] = await Promise.all([
        supabase.from("meetings").select("*").eq("id", id).single(),
        supabase.from("action_items").select("*").eq("meeting_id", id).order("created_at"),
      ]);
      return { meeting: m, items: items ?? [] };
    },
  });
  if (!data?.meeting) return <div className="text-foreground/60">Loading…</div>;
  const m = data.meeting;
  return (
    <div className="max-w-4xl">
      <Link to="/meetings" className="text-sm text-foreground/60 hover:underline">← All meetings</Link>
      <h1 className="text-3xl font-medium tracking-tight mt-3">{m.title}</h1>
      <div className="text-sm text-foreground/50 mt-1">{new Date(m.created_at).toLocaleString()} · {m.organizer_email}</div>

      <h2 className="text-lg font-medium mt-10 mb-3">Action items ({data.items.length})</h2>
      <div className="space-y-3">
        {data.items.map((i) => (
          <div key={i.id} className="rounded-xl bg-card border border-border/60 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="font-medium text-sm">{i.what}</div>
              <span className="text-xs text-foreground/50 uppercase">{i.status}</span>
            </div>
            <div className="text-xs text-foreground/60 mt-1">
              {i.who_name ?? "Unassigned"} · {i.due_date ? new Date(i.due_date).toLocaleDateString() : "no date"} · {i.priority}
            </div>
            {i.verbatim_quote && <div className="text-xs italic text-foreground/50 mt-2">"{i.verbatim_quote}"</div>}
          </div>
        ))}
      </div>

      <h2 className="text-lg font-medium mt-10 mb-3">Transcript</h2>
      <pre className="rounded-xl bg-card border border-border/60 p-5 text-sm whitespace-pre-wrap font-mono text-foreground/80 max-h-[500px] overflow-auto">
        {m.transcript_text || "(no transcript)"}
      </pre>
    </div>
  );
}
