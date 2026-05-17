import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/meetings")({
  head: () => ({ meta: [{ title: "Meetings — EXECUTOR" }] }),
  component: MeetingsList,
});

function MeetingsList() {
  const { data: meetings = [] } = useQuery({
    queryKey: ["meetings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meetings")
        .select("id, title, organizer_email, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div>
      <h1 className="text-3xl md:text-4xl font-medium tracking-tight">Meetings</h1>
      <p className="text-foreground/60 mt-1">Every transcript EXECUTOR has processed.</p>
      <div className="mt-8 space-y-3">
        {meetings.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center bg-card">
            <p className="text-foreground/60">No meetings yet.</p>
            <Link to="/upload" className="mt-4 inline-block cta-glossy rounded-full px-5 py-2 text-sm">Upload one</Link>
          </div>
        )}
        {meetings.map(m => (
          <Link
            key={m.id}
            to="/meetings/$id"
            params={{ id: m.id }}
            className="block rounded-2xl bg-card border border-border/60 p-5 hover:border-foreground/30 transition-colors"
          >
            <div className="font-medium">{m.title}</div>
            <div className="text-xs text-foreground/50 mt-1">
              {new Date(m.created_at).toLocaleString()} · {m.organizer_email}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
