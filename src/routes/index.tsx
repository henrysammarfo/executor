import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { SiteNav, SiteFooter } from "@/components/site-chrome";
import { Mic, ListChecks, AlertTriangle, Send, Radar } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EXECUTOR — Meetings without EXECUTOR are just conversations" },
      {
        name: "description",
        content:
          "Autonomous multi-agent system that turns meeting decisions into tracked commitments. Extract, assign, monitor, and follow up — automatically.",
      },
      { property: "og:title", content: "EXECUTOR — Autonomous Enterprise Execution" },
      {
        property: "og:description",
        content: "70% of AI-generated action items are never completed. EXECUTOR closes the gap.",
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <SiteNav />
      <Hero />
      <ProblemSection />
      <AgentsSection />
      <HowItWorks />
      <CTASection />
      <SiteFooter />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative min-h-screen flex justify-center">
      {/* Background video */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="w-full h-full object-cover [transform:scaleY(-1)]"
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260302_085640_276ea93b-d7da-4418-a09b-2aa5b490e838.mp4"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[26.416%] from-[rgba(255,255,255,0)] to-[66.943%] to-white" />
      </div>

      <div className="relative z-10 w-full max-w-[1200px] mx-auto px-6 md:px-10 pt-32 md:pt-48 lg:pt-[290px] flex flex-col items-center text-center gap-y-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="inline-flex items-center gap-2 rounded-full bg-white/80 backdrop-blur px-4 py-1.5 border border-border/60 text-xs text-foreground/70 shadow-soft"
        >
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[oklch(0.72_0.16_150)]" />
          AI Agent Olympics: Gemini + Speechmatics + Vultr
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.1 }}
          className="font-medium tracking-[-0.04em] text-[40px] sm:text-[56px] md:text-[68px] lg:text-[80px] leading-[1.02] text-[#373a46]"
        >
          Turn meetings into{" "}
          <span className="font-serif-italic text-[50px] sm:text-[72px] md:text-[88px] lg:text-[100px] text-foreground">
            execution
          </span>
          <br />
          for your team
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.2 }}
          className="text-base md:text-lg text-[#373a46]/80 max-w-[554px]"
        >
          EXECUTOR is the first autonomous agent that doesn't just summarize meetings — it monitors
          every commitment and takes the next step when humans stall.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.3 }}
          className="w-full max-w-[520px]"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              window.location.href = "/login";
            }}
            className="flex items-center gap-2 p-2 rounded-[40px] bg-[#fcfcfc] border border-border/70 shadow-soft"
          >
            <input
              type="email"
              required
              placeholder="you@company.com"
              className="flex-1 bg-transparent px-4 py-2 text-sm focus:outline-none placeholder:text-foreground/40"
            />
            <button
              type="submit"
              className="cta-glossy rounded-full px-5 py-3 text-sm font-medium whitespace-nowrap"
            >
              Create Free Account
            </button>
          </form>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="flex flex-wrap items-center justify-center gap-3 text-xs text-foreground/70"
        >
          {["Google Gemini", "Speechmatics live transcription", "Vultr monitor worker"].map(
            (label) => (
              <span
                key={label}
                className="rounded-full border border-border/70 bg-white/70 px-3 py-1 shadow-soft"
              >
                {label}
              </span>
            ),
          )}
        </motion.div>
      </div>
    </section>
  );
}

function ProblemSection() {
  return (
    <section className="px-6 md:px-10 py-24 md:py-32">
      <div className="max-w-[1200px] mx-auto grid md:grid-cols-3 gap-10">
        <div className="md:col-span-1">
          <p className="text-sm uppercase tracking-widest text-foreground/50">The gap</p>
          <h2 className="mt-3 text-3xl md:text-4xl font-medium tracking-tight">
            Every AI tool tells you what to do.{" "}
            <span className="font-serif-italic">Nobody checks if you did it.</span>
          </h2>
        </div>
        <div className="md:col-span-2 grid sm:grid-cols-3 gap-6">
          {[
            { stat: "70%", label: "of AI-generated action items are never completed" },
            { stat: "$259B", label: "lost annually to unproductive meetings in the US" },
            { stat: "<50%", label: "of action items hit their stated deadline" },
          ].map((s) => (
            <div key={s.stat} className="rounded-2xl border border-border/60 p-6 bg-card">
              <div className="text-4xl md:text-5xl font-medium tracking-tight">{s.stat}</div>
              <div className="mt-3 text-sm text-foreground/60 leading-relaxed">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const AGENTS = [
  { icon: Mic, name: "Scribe", desc: "Real-time transcription via Speechmatics. Batch or live." },
  {
    icon: ListChecks,
    name: "Extractor",
    desc: "Gemini Pro pulls every commitment: what, who, when, priority.",
  },
  { icon: Send, name: "Assigner", desc: "Resolves owners, creates tasks, emails confirmation." },
  {
    icon: Radar,
    name: "Monitor",
    desc: "Polls every 6 hours. Flags overdue. Scores completion risk.",
  },
  {
    icon: AlertTriangle,
    name: "Executor",
    desc: "Drafts the follow-up. Auto-sends after 24h. Escalates after 2 misses.",
  },
];

function AgentsSection() {
  return (
    <section className="px-6 md:px-10 py-20 md:py-28 bg-secondary/40 border-y border-border/60">
      <div className="max-w-[1200px] mx-auto">
        <div className="max-w-2xl">
          <p className="text-sm uppercase tracking-widest text-foreground/50">
            Five agents. One job.
          </p>
          <h2 className="mt-3 text-3xl md:text-4xl font-medium tracking-tight">
            The execution stack, <span className="font-serif-italic">end to end.</span>
          </h2>
        </div>
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {AGENTS.map((a, i) => (
            <motion.div
              key={a.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="rounded-2xl bg-card border border-border/60 p-5 flex flex-col gap-3"
            >
              <div className="h-9 w-9 rounded-full bg-foreground/5 flex items-center justify-center">
                <a.icon className="h-4 w-4" />
              </div>
              <div className="text-xs text-foreground/40">0{i + 1}</div>
              <div className="font-medium">{a.name}</div>
              <div className="text-sm text-foreground/60 leading-relaxed">{a.desc}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      n: "01",
      t: "Upload or stream a meeting",
      d: "Drop in audio or paste a transcript. Live capture works too.",
    },
    {
      n: "02",
      t: "EXECUTOR extracts commitments",
      d: "Owners, deadlines, priority, verbatim quotes. Structured. Searchable.",
    },
    {
      n: "03",
      t: "It watches the gap, not you",
      d: "Risk scored. Overdue surfaced. Drafts written before you ask.",
    },
    {
      n: "04",
      t: "Acts when humans stall",
      d: "Auto-sends a firm follow-up after 24h. Escalates after 2 misses.",
    },
  ];
  return (
    <section className="px-6 md:px-10 py-24 md:py-32">
      <div className="max-w-[1200px] mx-auto grid md:grid-cols-2 gap-12">
        <div>
          <p className="text-sm uppercase tracking-widest text-foreground/50">How it works</p>
          <h2 className="mt-3 text-3xl md:text-4xl font-medium tracking-tight">
            The last mile of <span className="font-serif-italic">accountability</span>, automated.
          </h2>
          <p className="mt-6 text-foreground/60 max-w-md">
            Other AI tools stop at the summary. EXECUTOR starts there — and doesn't stop until the
            work actually ships.
          </p>
        </div>
        <div className="space-y-6">
          {steps.map((s) => (
            <div key={s.n} className="flex gap-5 pb-6 border-b border-border/60 last:border-0">
              <div className="font-serif-italic text-2xl text-foreground/40 min-w-[40px]">
                {s.n}
              </div>
              <div>
                <div className="font-medium">{s.t}</div>
                <div className="text-sm text-foreground/60 mt-1">{s.d}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="px-6 md:px-10 pb-24">
      <div className="max-w-[1200px] mx-auto rounded-3xl bg-foreground text-background p-10 md:p-16 text-center">
        <h2 className="text-3xl md:text-5xl font-medium tracking-tight">
          Meetings without EXECUTOR
          <br />
          <span className="font-serif-italic opacity-80">are just conversations.</span>
        </h2>
        <p className="mt-4 text-background/60 max-w-xl mx-auto">
          Start free. Upload a transcript. Watch a real agent take the next step.
        </p>
        <Link
          to="/login"
          className="mt-8 inline-block rounded-full bg-background text-foreground px-6 py-3 text-sm font-medium hover:opacity-90"
        >
          Create Free Account
        </Link>
      </div>
    </section>
  );
}
