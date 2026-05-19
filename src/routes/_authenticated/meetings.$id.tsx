import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  syncActionItemToAsana,
  syncActionItemToJira,
  syncActionItemToNotion,
} from "@/lib/sync-actions.functions";
import { toast } from "sonner";
import { ExternalLink, Loader2, SendToBack } from "lucide-react";

export const Route = createFileRoute("/_authenticated/meetings/$id")({
  head: () => ({ meta: [{ title: "Meeting - EXECUTOR" }] }),
  component: MeetingDetail,
});

function MeetingDetail() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const { data, error, isLoading } = useQuery({
    queryKey: ["meeting", id],
    queryFn: async () => {
      const [{ data: meeting, error: meetingError }, { data: items, error: itemsError }] =
        await Promise.all([
          supabase.from("meetings").select("*").eq("id", id).single(),
          supabase.from("action_items").select("*").eq("meeting_id", id).order("created_at"),
        ]);

      if (meetingError) throw meetingError;
      if (itemsError) throw itemsError;

      return { meeting, items: items ?? [] };
    },
  });

  if (isLoading) return <div className="text-foreground/60">Loading...</div>;

  if (error) {
    return (
      <div className="max-w-4xl">
        <Link to="/meetings" className="text-sm text-foreground/60 hover:underline">
          Back to meetings
        </Link>
        <div className="mt-6 rounded-xl border border-border/60 bg-card p-5">
          <h1 className="text-lg font-medium">Could not open meeting</h1>
          <p className="mt-2 text-sm text-foreground/60">{(error as Error).message}</p>
        </div>
      </div>
    );
  }

  if (!data?.meeting) return <div className="text-foreground/60">Meeting not found.</div>;

  const meeting = data.meeting;
  const transcript = formatTranscript(meeting.transcript_text);

  return (
    <div className="max-w-4xl">
      <Link to="/meetings" className="text-sm text-foreground/60 hover:underline">
        Back to meetings
      </Link>
      <h1 className="text-3xl font-medium tracking-tight mt-3">{meeting.title}</h1>
      <div className="text-sm text-foreground/50 mt-1">
        {new Date(meeting.created_at).toLocaleString()} - {meeting.organizer_email}
      </div>

      <h2 className="text-lg font-medium mt-10 mb-3">Action items ({data.items.length})</h2>
      <div className="space-y-3">
        {data.items.map((item) => (
          <ActionItemEditor
            key={item.id}
            item={item}
            onSaved={() => {
              queryClient.invalidateQueries({ queryKey: ["meeting", id] });
              queryClient.invalidateQueries({ queryKey: ["items"] });
            }}
          />
        ))}
      </div>

      <h2 className="text-lg font-medium mt-10 mb-3">Transcript</h2>
      <div className="rounded-xl bg-card border border-border/60 p-5 text-sm leading-7 text-foreground/80 max-h-[500px] overflow-auto">
        {transcript ? (
          transcript.split(/\n{2,}/).map((paragraph, index) => (
            <p key={`${index}-${paragraph.slice(0, 20)}`} className="mb-4 last:mb-0">
              {paragraph}
            </p>
          ))
        ) : (
          <p className="text-foreground/50">(no transcript)</p>
        )}
      </div>
    </div>
  );
}

type ActionItem = {
  id: string;
  what: string;
  who_name: string | null;
  who_email: string | null;
  manager_email: string | null;
  due_date: string | null;
  priority: "high" | "medium" | "low";
  status: "open" | "overdue" | "complete";
  verbatim_quote: string | null;
  asana_task_url: string | null;
  jira_issue_url: string | null;
  notion_page_url: string | null;
};

function ActionItemEditor({ item, onSaved }: { item: ActionItem; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState<"asana" | "jira" | "notion" | null>(null);
  const syncAsana = useServerFn(syncActionItemToAsana);
  const syncJira = useServerFn(syncActionItemToJira);
  const syncNotion = useServerFn(syncActionItemToNotion);
  const [draft, setDraft] = useState({
    what: item.what,
    who_name: item.who_name ?? "",
    who_email: item.who_email ?? "",
    manager_email: item.manager_email ?? "",
    due_date: toDateInputValue(item.due_date),
    priority: item.priority,
    status: item.status,
  });

  const save = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("action_items")
        .update({
          what: draft.what.trim(),
          who_name: draft.who_name.trim() || null,
          who_email: draft.who_email.trim() || null,
          manager_email: draft.manager_email.trim() || null,
          due_date: draft.due_date ? new Date(`${draft.due_date}T17:00:00`).toISOString() : null,
          priority: draft.priority,
          status: draft.status,
          completed_at: draft.status === "complete" ? new Date().toISOString() : null,
        })
        .eq("id", item.id);

      if (error) throw error;

      toast.success("Action item updated");
      setEditing(false);
      onSaved();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const syncExternal = async (target: "asana" | "jira" | "notion") => {
    setSyncing(target);
    const label = target === "asana" ? "Asana" : target === "jira" ? "Jira" : "Notion";
    const t = toast.loading(`Syncing to ${label}...`);
    try {
      const result =
        target === "asana"
          ? await syncAsana({ data: { itemId: item.id } })
          : target === "jira"
            ? await syncJira({ data: { itemId: item.id } })
            : await syncNotion({ data: { itemId: item.id } });
      toast.success(result.reused ? `${label} already synced` : `Synced to ${label}`, { id: t });
      onSaved();
      if (result.url) window.open(result.url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error((error as Error).message, { id: t });
    } finally {
      setSyncing(null);
    }
  };

  if (!editing) {
    return (
      <div className="rounded-xl bg-card border border-border/60 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="font-medium text-sm">{item.what}</div>
          <span className="text-xs text-foreground/50 uppercase">{item.status}</span>
        </div>
        <div className="text-xs text-foreground/60 mt-1">
          {item.who_name ?? "Unassigned"} -{" "}
          {item.due_date ? new Date(item.due_date).toLocaleDateString() : "no date"} -{" "}
          {item.priority}
        </div>
        {item.verbatim_quote && (
          <div className="text-xs italic text-foreground/50 mt-2">"{item.verbatim_quote}"</div>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => setEditing(true)}
            className="rounded-full border border-border px-3 py-1.5 text-xs hover:bg-secondary"
          >
            Edit
          </button>
          {item.asana_task_url ? (
            <a
              href={item.asana_task_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs hover:bg-secondary"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Asana
            </a>
          ) : (
            <button
              onClick={() => syncExternal("asana")}
              disabled={syncing !== null}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs hover:bg-secondary disabled:opacity-60"
            >
              {syncing === "asana" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <SendToBack className="h-3.5 w-3.5" />
              )}
              Sync Asana
            </button>
          )}
          {item.jira_issue_url ? (
            <a
              href={item.jira_issue_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs hover:bg-secondary"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Jira
            </a>
          ) : (
            <button
              onClick={() => syncExternal("jira")}
              disabled={syncing !== null}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs hover:bg-secondary disabled:opacity-60"
            >
              {syncing === "jira" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <SendToBack className="h-3.5 w-3.5" />
              )}
              Sync Jira
            </button>
          )}
          {item.notion_page_url ? (
            <a
              href={item.notion_page_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs hover:bg-secondary"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Notion
            </a>
          ) : (
            <button
              onClick={() => syncExternal("notion")}
              disabled={syncing !== null}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs hover:bg-secondary disabled:opacity-60"
            >
              {syncing === "notion" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <SendToBack className="h-3.5 w-3.5" />
              )}
              Sync Notion
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-card border border-border/60 p-4">
      <div className="space-y-3">
        <label className="block">
          <span className="text-xs text-foreground/50">Commitment</span>
          <textarea
            value={draft.what}
            onChange={(event) => setDraft((current) => ({ ...current, what: event.target.value }))}
            className="mt-1 min-h-20 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </label>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block">
            <span className="text-xs text-foreground/50">Owner name</span>
            <input
              value={draft.who_name}
              onChange={(event) =>
                setDraft((current) => ({ ...current, who_name: event.target.value }))
              }
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
          <label className="block">
            <span className="text-xs text-foreground/50">Owner email</span>
            <input
              type="email"
              value={draft.who_email}
              onChange={(event) =>
                setDraft((current) => ({ ...current, who_email: event.target.value }))
              }
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
          <label className="block">
            <span className="text-xs text-foreground/50">Manager email</span>
            <input
              type="email"
              value={draft.manager_email}
              onChange={(event) =>
                setDraft((current) => ({ ...current, manager_email: event.target.value }))
              }
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
          <label className="block">
            <span className="text-xs text-foreground/50">Due date</span>
            <input
              type="date"
              value={draft.due_date}
              onChange={(event) =>
                setDraft((current) => ({ ...current, due_date: event.target.value }))
              }
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-foreground/50">Priority</span>
              <select
                value={draft.priority}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    priority: event.target.value as ActionItem["priority"],
                  }))
                }
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-foreground/50">Status</span>
              <select
                value={draft.status}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    status: event.target.value as ActionItem["status"],
                  }))
                }
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="open">Open</option>
                <option value="overdue">Overdue</option>
                <option value="complete">Complete</option>
              </select>
            </label>
          </div>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <button
          onClick={save}
          disabled={saving || !draft.what.trim()}
          className="cta-glossy rounded-full px-4 py-2 text-sm disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save"}
        </button>
        <button
          onClick={() => setEditing(false)}
          disabled={saving}
          className="rounded-full border border-border px-4 py-2 text-sm hover:bg-secondary disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function toDateInputValue(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function formatTranscript(value: string | null) {
  if (!value) return "";

  return value
    .replace(/\s*\n+\s*/g, " ")
    .replace(/\s+([.,!?;:])/g, "$1")
    .replace(/([.!?])\s+/g, "$1\n\n")
    .replace(/\s+/g, " ")
    .replace(/\n\s+/g, "\n")
    .trim();
}
