import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteNav, SiteFooter } from "@/components/site-chrome";

export const Route = createFileRoute("/product")({
  head: () => ({
    meta: [
      { title: "Product — EXECUTOR" },
      {
        name: "description",
        content:
          "Five specialized agents coordinating across the full accountability lifecycle: Scribe, Extractor, Assigner, Monitor, Executor.",
      },
      { property: "og:title", content: "EXECUTOR — How it works" },
      { property: "og:description", content: "The execution stack, end to end." },
    ],
  }),
  component: () => (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <div className="max-w-[1000px] mx-auto px-6 md:px-10 pt-40 pb-24">
        <h1 className="text-4xl md:text-6xl font-medium tracking-tight">
          The first agent that <span className="font-serif-italic">enforces</span>.
        </h1>
        <p className="mt-6 text-lg text-foreground/70 max-w-2xl">
          Other tools transcribe and summarize. EXECUTOR runs a five-agent pipeline that takes the
          next step when humans don't.
        </p>
        <div className="mt-16 space-y-10">
          {[
            [
              "Scribe",
              "Real-time and batch transcription via Speechmatics. On-device option for confidential meetings.",
            ],
            [
              "Extractor",
              "Gemini Pro in JSON mode pulls every commitment with what, who, when, priority, and the verbatim quote.",
            ],
            ["Assigner", "Resolves owners against your directory and creates tracked tasks."],
            [
              "Monitor",
              "Cron-driven scans every 6 hours. Marks overdue, scores completion risk per item, surfaces what's slipping.",
            ],
            [
              "Executor",
              "When a deadline passes, drafts a firm but collaborative follow-up. Auto-sends after 24h. Escalates after 2 missed strikes.",
            ],
          ].map(([n, d], i) => (
            <div
              key={n}
              className="grid md:grid-cols-[120px_1fr] gap-6 pb-10 border-b border-border/60 last:border-0"
            >
              <div>
                <div className="font-serif-italic text-3xl text-foreground/40">0{i + 1}</div>
                <div className="font-medium mt-1">{n}</div>
              </div>
              <p className="text-foreground/70 leading-relaxed">{d}</p>
            </div>
          ))}
        </div>
        <Link to="/login" className="mt-12 inline-block cta-glossy rounded-full px-6 py-3 text-sm">
          Start free
        </Link>
      </div>
      <SiteFooter />
    </div>
  ),
});
