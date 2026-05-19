import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { RealtimeClient } from "@speechmatics/real-time-client";
import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createRealtimeSpeechmaticsToken } from "@/lib/speechmatics.functions";
import { extractActionItems } from "@/lib/extract.functions";
import { toast } from "sonner";
import { FileText, Loader2, Mic, Square, Wand2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/live")({
  head: () => ({ meta: [{ title: "Live meeting - EXECUTOR" }] }),
  component: LiveMeetingPage,
});

type SpeechmaticsMessage = {
  message: string;
  results?: Array<{
    alternatives?: Array<{ content?: string }>;
  }>;
};

function resultText(message: SpeechmaticsMessage) {
  return (
    message.results
      ?.map((result) => result.alternatives?.[0]?.content)
      .filter(Boolean)
      .join(" ") ?? ""
  );
}

function appendTranscriptChunk(current: string, chunk: string) {
  const text = chunk.trim();
  if (!text) return current;

  const joiner = !current || /^[.,!?;:]/.test(text) ? "" : " ";
  return `${current}${joiner}${text}`;
}

function getSupportedMimeType() {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type));
}

function LiveMeetingPage() {
  const router = useRouter();
  const getToken = useServerFn(createRealtimeSpeechmaticsToken);
  const extract = useServerFn(extractActionItems);
  const clientRef = useRef<RealtimeClient | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const transcriptRef = useRef("");

  const [title, setTitle] = useState("");
  const [organizer, setOrganizer] = useState("");
  const [status, setStatus] = useState<
    "idle" | "connecting" | "recording" | "stopping" | "extracting"
  >("idle");
  const [lines, setLines] = useState<string[]>([]);
  const [partial, setPartial] = useState("");

  const start = async () => {
    try {
      setStatus("connecting");
      const [{ token }, stream] = await Promise.all([
        getToken({ data: { ttl: 600 } }),
        navigator.mediaDevices.getUserMedia({ audio: true }),
      ]);

      const client = new RealtimeClient({ appId: "executor-live" });
      client.addEventListener("receiveMessage", ({ data }) => {
        const message = data as SpeechmaticsMessage;
        const text = resultText(message);
        if (!text) return;
        if (message.message === "AddPartialTranscript") {
          setPartial(text);
        }
        if (message.message === "AddTranscript") {
          transcriptRef.current = appendTranscriptChunk(transcriptRef.current, text);
          setLines((current) => [...current, text]);
          setPartial("");
        }
      });

      await client.start(token, {
        transcription_config: {
          language: "en",
          operating_point: "enhanced",
          enable_partials: true,
          max_delay: 2,
        },
      });

      const mimeType = getSupportedMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorder.ondataavailable = async (event) => {
        if (event.data.size === 0) return;
        client.sendAudio(await event.data.arrayBuffer());
      };
      recorder.start(500);

      clientRef.current = client;
      recorderRef.current = recorder;
      streamRef.current = stream;
      setLines([]);
      setPartial("");
      transcriptRef.current = "";
      setStatus("recording");
    } catch (error) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      toast.error((error as Error).message);
      setStatus("idle");
    }
  };

  const stop = async () => {
    setStatus("stopping");
    recorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    try {
      await clientRef.current?.stopRecognition({ noTimeout: true });
    } catch (error) {
      console.warn(error);
    }
    setStatus("idle");
  };

  const createMeeting = async () => {
    const transcript = transcriptRef.current.trim();
    if (!transcript) {
      toast.error("No final transcript captured yet");
      return;
    }
    try {
      setStatus("extracting");
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { data: meeting, error } = await supabase
        .from("meetings")
        .insert({
          owner_id: u.user.id,
          title: title || `Live meeting ${new Date().toLocaleString()}`,
          organizer_email: organizer || u.user.email,
          transcript_text: transcript,
          source: "live",
        })
        .select("*")
        .single();
      if (error) throw error;

      const out = await extract({ data: { meetingId: meeting.id } });
      toast.success(`Extracted ${out.inserted} action item${out.inserted === 1 ? "" : "s"}`);
      router.navigate({ to: "/dashboard" });
    } catch (error) {
      toast.error((error as Error).message);
      setStatus("idle");
    }
  };

  const busy = status !== "idle";
  const wordCount = transcriptRef.current.split(/\s+/).filter(Boolean).length;

  return (
    <div className="max-w-5xl">
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-medium tracking-tight md:text-4xl">Live meeting</h1>
          <p className="mt-1 text-foreground/60">
            Stream microphone audio to Speechmatics, then extract commitments into the execution
            board.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {status === "recording" ? (
            <button
              onClick={stop}
              className="rounded-full border border-border px-5 py-3 text-sm hover:bg-secondary"
            >
              <Square className="mr-2 inline h-4 w-4" />
              Stop
            </button>
          ) : (
            <button
              disabled={busy}
              onClick={start}
              className="cta-glossy rounded-full px-5 py-3 text-sm disabled:opacity-60"
            >
              {status === "connecting" ? (
                <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
              ) : (
                <Mic className="mr-2 inline h-4 w-4" />
              )}
              Start meeting
            </button>
          )}
          <button
            disabled={busy || lines.length === 0}
            onClick={createMeeting}
            className="rounded-full border border-border px-5 py-3 text-sm hover:bg-secondary disabled:opacity-50"
          >
            {status === "extracting" ? (
              <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="mr-2 inline h-4 w-4" />
            )}
            End + extract
          </button>
        </div>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-[320px_1fr]">
        <section className="rounded-2xl border border-border/60 bg-card p-5">
          <h2 className="flex items-center gap-2 text-sm font-medium">
            <FileText className="h-4 w-4" />
            Meeting details
          </h2>
          <div className="mt-4 space-y-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Meeting title"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              type="email"
              value={organizer}
              onChange={(e) => setOrganizer(e.target.value)}
              placeholder="Organizer email"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-secondary/50 p-3">
              <div className="text-xs uppercase tracking-wider text-foreground/50">Status</div>
              <div className="mt-1 font-medium capitalize">{status}</div>
            </div>
            <div className="rounded-xl bg-secondary/50 p-3">
              <div className="text-xs uppercase tracking-wider text-foreground/50">Words</div>
              <div className="mt-1 font-medium">{wordCount}</div>
            </div>
          </div>
        </section>

        <section className="min-h-[520px] rounded-2xl border border-border/60 bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-medium">Transcript</h2>
            {status === "recording" && (
              <span className="rounded-full bg-[oklch(0.62_0.22_27)] px-2 py-0.5 text-xs text-white">
                Recording
              </span>
            )}
          </div>
          <div className="h-[440px] overflow-auto rounded-xl border border-border/40 bg-background p-4 font-mono text-sm leading-6">
            {lines.length === 0 && !partial && (
              <div className="flex h-full items-center justify-center text-center text-foreground/40">
                Start the meeting and speak into the microphone.
              </div>
            )}
            {lines.map((line, index) => (
              <p key={`${index}-${line}`} className="mb-3">
                {line}
              </p>
            ))}
            {partial && <p className="text-foreground/45">{partial}</p>}
          </div>
        </section>
      </div>
    </div>
  );
}
