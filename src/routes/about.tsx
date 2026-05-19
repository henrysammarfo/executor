import { createFileRoute } from "@tanstack/react-router";
import { SiteNav, SiteFooter } from "@/components/site-chrome";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — EXECUTOR" },
      {
        name: "description",
        content:
          "Why the accountability gap is the most expensive unsolved problem in enterprise software.",
      },
      { property: "og:title", content: "Why EXECUTOR exists" },
    ],
  }),
  component: () => (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <div className="max-w-[820px] mx-auto px-6 md:px-10 pt-40 pb-24">
        <h1 className="text-4xl md:text-6xl font-medium tracking-tight">
          Insight is cheap. <span className="font-serif-italic">Execution is the moat.</span>
        </h1>
        <div className="prose prose-lg mt-10 text-foreground/75 leading-relaxed space-y-6">
          <p>
            40% of organizations now run AI meeting assistants. 70% of the action items those
            assistants generate are never completed. Both numbers are true. Together they explain a
            $259B/year drag on enterprise productivity.
          </p>
          <p>
            Every other meeting tool stops at the summary. Otter.ai. Fireflies. Notion AI. They tell
            you what to do. None of them check if you did it. That gap — between decision and
            execution — is unmanned. EXECUTOR guards it.
          </p>
          <p>
            Five agents coordinate across the lifecycle: <b>Scribe</b> transcribes. <b>Extractor</b>{" "}
            finds every commitment. <b>Assigner</b> creates ownership. <b>Monitor</b> watches
            deadlines. <b>Executor</b> takes the next step when humans stall.
          </p>
          <p>
            The point isn't another dashboard. The point is that something autonomous is finally
            watching the gap.
          </p>
        </div>
      </div>
      <SiteFooter />
    </div>
  ),
});
