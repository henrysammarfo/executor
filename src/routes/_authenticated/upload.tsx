import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { extractActionItems } from "@/lib/extract.functions";
import { transcribeMeeting } from "@/lib/transcribe.functions";
import { toast } from "sonner";
import { Loader2, FileAudio, FileText } from "lucide-react";

export const Route = createFileRoute("/_authenticated/upload")({
  head: () => ({ meta: [{ title: "New meeting — EXECUTOR" }] }),
  component: UploadPage,
});

function UploadPage() {
  const router = useRouter();
  const extract = useServerFn(extractActionItems);
  const transcribe = useServerFn(transcribeMeeting);
  const [mode, setMode] = useState<"text" | "audio">("text");
  const [title, setTitle] = useState("");
  const [organizer, setOrganizer] = useState("");
  const [transcript, setTranscript] = useState("");
  const [audio, setAudio] = useState<File | null>(null);
  const [phase, setPhase] = useState<"idle" | "uploading" | "transcribing" | "extracting">("idle");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");

      setPhase("uploading");
      let audioPath: string | null = null;
      let transcriptText: string | null = transcript || null;

      if (mode === "audio" && audio) {
        audioPath = `${u.user.id}/${Date.now()}-${audio.name}`;
        const { error: upErr } = await supabase.storage.from("audio").upload(audioPath, audio);
        if (upErr) throw upErr;
      }

      const { data: meeting, error } = await supabase
        .from("meetings")
        .insert({
          owner_id: u.user.id,
          title,
          organizer_email: organizer || u.user.email,
          transcript_text: transcriptText,
          audio_path: audioPath,
        })
        .select("*")
        .single();
      if (error) throw error;

      if (mode === "audio" && audioPath) {
        setPhase("transcribing");
        toast.message("Transcribing audio (this can take ~30s)…");
        const t = await transcribe({ data: { meetingId: meeting.id, audioPath } });
        transcriptText = t.transcript;
      }

      setPhase("extracting");
      toast.message("Extracting action items…");
      const out = await extract({ data: { meetingId: meeting.id } });
      toast.success(`Extracted ${out.inserted} action item${out.inserted === 1 ? "" : "s"}`);
      router.navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error((err as Error).message);
      setPhase("idle");
    }
  };

  const busy = phase !== "idle";

  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl md:text-4xl font-medium tracking-tight">New meeting</h1>
      <p className="text-foreground/60 mt-1">Drop a transcript or audio. EXECUTOR will do the rest.</p>

      <div className="mt-8 flex gap-2 text-sm">
        <button
          onClick={() => setMode("text")}
          className={`rounded-full px-4 py-2 border ${mode === "text" ? "bg-foreground text-background border-foreground" : "border-border bg-card"}`}
        ><FileText className="h-4 w-4 inline mr-1"/> Paste transcript</button>
        <button
          onClick={() => setMode("audio")}
          className={`rounded-full px-4 py-2 border ${mode === "audio" ? "bg-foreground text-background border-foreground" : "border-border bg-card"}`}
        ><FileAudio className="h-4 w-4 inline mr-1"/> Upload audio</button>
      </div>

      <form onSubmit={submit} className="mt-6 space-y-4 bg-card border border-border/60 rounded-3xl p-6 shadow-soft">
        <input
          required value={title} onChange={e => setTitle(e.target.value)}
          placeholder="Meeting title (e.g. Q3 planning sync)"
          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <input
          type="email" value={organizer} onChange={e => setOrganizer(e.target.value)}
          placeholder="Organizer email (defaults to your email)"
          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {mode === "text" ? (
          <textarea
            required={mode === "text"} value={transcript} onChange={e => setTranscript(e.target.value)}
            placeholder="Paste your meeting transcript here. Speaker names help but are not required."
            rows={12}
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring font-mono"
          />
        ) : (
          <label className="block border border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:bg-secondary/40">
            <input
              type="file" accept="audio/*,video/mp4"
              onChange={e => setAudio(e.target.files?.[0] ?? null)}
              className="hidden"
            />
            <FileAudio className="h-6 w-6 mx-auto text-foreground/40" />
            <div className="mt-3 text-sm">
              {audio ? <><b>{audio.name}</b> · {(audio.size / 1024 / 1024).toFixed(1)} MB</> : "Click to choose an audio file"}
            </div>
            <div className="text-xs text-foreground/50 mt-1">MP3, WAV, M4A, MP4</div>
          </label>
        )}
        <button
          disabled={busy}
          type="submit"
          className="cta-glossy rounded-full px-6 py-3 text-sm font-medium inline-flex items-center gap-2 disabled:opacity-60"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {phase === "idle" && "Extract action items"}
          {phase === "uploading" && "Uploading…"}
          {phase === "transcribing" && "Transcribing…"}
          {phase === "extracting" && "Extracting commitments…"}
        </button>
      </form>
    </div>
  );
}
