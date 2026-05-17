import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Polls Speechmatics batch API until transcript ready or timeout
export const transcribeMeeting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { meetingId: string; audioPath: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const apiKey = process.env.SPEECHMATICS_API_KEY;
    if (!apiKey) throw new Error("SPEECHMATICS_API_KEY not configured");

    // Download audio from private bucket
    const { data: file, error: dErr } = await supabase.storage
      .from("audio")
      .download(data.audioPath);
    if (dErr || !file) throw new Error(dErr?.message ?? "Audio not found");

    // Submit batch job
    const form = new FormData();
    form.append(
      "config",
      JSON.stringify({
        type: "transcription",
        transcription_config: { language: "en", operating_point: "enhanced" },
      }),
    );
    form.append("data_file", file, "audio");

    const sub = await fetch("https://asr.api.speechmatics.com/v2/jobs", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
    if (!sub.ok) throw new Error(`Speechmatics submit failed: ${await sub.text()}`);
    const { id } = (await sub.json()) as { id: string };

    // Poll up to 90s
    let transcript = "";
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      const stat = await fetch(`https://asr.api.speechmatics.com/v2/jobs/${id}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const j = (await stat.json()) as { job: { status: string } };
      if (j.job.status === "done") {
        const tr = await fetch(
          `https://asr.api.speechmatics.com/v2/jobs/${id}/transcript?format=txt`,
          { headers: { Authorization: `Bearer ${apiKey}` } },
        );
        transcript = await tr.text();
        break;
      }
      if (j.job.status === "rejected") throw new Error("Transcription rejected");
    }
    if (!transcript) throw new Error("Transcription timed out");

    await supabase
      .from("meetings")
      .update({ transcript_text: transcript })
      .eq("id", data.meetingId);

    return { transcript };
  });
