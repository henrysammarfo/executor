import { createSpeechmaticsJWT } from "@speechmatics/auth";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const createRealtimeSpeechmaticsToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { ttl?: number } | undefined) => input ?? {})
  .handler(async ({ data }) => {
    const apiKey = process.env.SPEECHMATICS_API_KEY;
    if (!apiKey) throw new Error("SPEECHMATICS_API_KEY not configured");

    const ttl = Math.min(Math.max(data.ttl ?? 300, 60), 600);
    const token = await createSpeechmaticsJWT({
      type: "rt",
      apiKey,
      ttl,
      region: "eu",
    });

    return { token, expiresIn: ttl };
  });
