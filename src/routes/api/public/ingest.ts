import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { extractForMeetingAdmin } from "@/lib/extract-core.server";
import { audit } from "@/lib/audit.server";

const Body = z.object({
  title: z.string().min(1).max(500),
  organizer_email: z.string().email(),
  owner_email: z.string().email(),
  transcript_text: z.string().min(1).max(500_000),
  source: z.string().max(64).optional(),
});

function verify(body: string, signature: string | null) {
  const secret = process.env.INGEST_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const Route = createFileRoute("/api/public/ingest")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();
        if (!verify(raw, request.headers.get("x-ingest-signature"))) {
          return new Response("Invalid signature", { status: 401 });
        }
        let json: unknown;
        try { json = JSON.parse(raw); } catch { return new Response("Bad JSON", { status: 400 }); }
        const parsed = Body.safeParse(json);
        if (!parsed.success) {
          return Response.json({ error: parsed.error.flatten() }, { status: 400 });
        }
        const b = parsed.data;

        // Resolve owner by email via profiles
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("email", b.owner_email)
          .maybeSingle();
        if (!profile) {
          return Response.json({ error: "Unknown owner_email" }, { status: 404 });
        }

        const { data: meeting, error: mErr } = await supabaseAdmin
          .from("meetings")
          .insert({
            owner_id: profile.id,
            title: b.title,
            organizer_email: b.organizer_email,
            transcript_text: b.transcript_text,
            source: b.source ?? "webhook",
          })
          .select("id")
          .single();
        if (mErr || !meeting) {
          return Response.json({ error: mErr?.message ?? "Insert failed" }, { status: 500 });
        }

        await audit({
          owner_id: profile.id,
          event_type: "ingest",
          status: "success",
          message: `Webhook ingested meeting "${b.title}"`,
          meeting_id: meeting.id,
        });

        // Fire extraction synchronously (within request window)
        try {
          const r = await extractForMeetingAdmin(meeting.id);
          return Response.json({ ok: true, meeting_id: meeting.id, items_extracted: r.inserted });
        } catch (e) {
          await audit({
            owner_id: profile.id,
            event_type: "extract",
            status: "error",
            message: (e as Error).message,
            meeting_id: meeting.id,
          });
          return Response.json(
            { ok: true, meeting_id: meeting.id, extraction_error: (e as Error).message },
            { status: 202 },
          );
        }
      },
      GET: async () => Response.json({ ok: true, hint: "POST signed JSON to ingest" }),
    },
  },
});
