import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteNav, SiteFooter } from "@/components/site-chrome";
import { Check } from "lucide-react";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — EXECUTOR" },
      {
        name: "description",
        content: "Outcome-based pricing. Pay per decision executed, not per seat.",
      },
      { property: "og:title", content: "EXECUTOR — Pricing" },
      {
        property: "og:description",
        content: "Free for 30 days. $49/user under 50 seats. $29/user enterprise.",
      },
    ],
  }),
  component: () => {
    const tiers = [
      {
        name: "Starter",
        price: "Free",
        sub: "30 days",
        features: ["Up to 10 meetings", "All 5 agents", "Email follow-ups", "Risk scoring"],
        cta: "Start free",
      },
      {
        name: "Team",
        price: "$49",
        sub: "/user/month · <50 seats",
        features: [
          "Unlimited meetings",
          "Live Speechmatics",
          "Auto-send rules",
          "Slack integration",
        ],
        cta: "Start trial",
        highlight: true,
      },
      {
        name: "Enterprise",
        price: "$29",
        sub: "/user/month · 100+ seats",
        features: [
          "Outcome-based pricing",
          "On-device transcription",
          "SSO + audit log",
          "Dedicated CSM",
        ],
        cta: "Talk to us",
      },
    ];
    return (
      <div className="min-h-screen bg-background">
        <SiteNav />
        <div className="max-w-[1100px] mx-auto px-6 md:px-10 pt-40 pb-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-medium tracking-tight">
              Pay for <span className="font-serif-italic">execution</span>, not seats.
            </h1>
            <p className="mt-4 text-foreground/70 max-w-xl mx-auto">
              Free 30 days. Cancel anytime.
            </p>
          </div>
          <div className="mt-16 grid md:grid-cols-3 gap-5">
            {tiers.map((t) => (
              <div
                key={t.name}
                className={`rounded-3xl border p-7 ${t.highlight ? "bg-foreground text-background border-foreground" : "bg-card border-border/60"}`}
              >
                <div className="text-sm uppercase tracking-wider opacity-70">{t.name}</div>
                <div className="mt-3 text-4xl font-medium">{t.price}</div>
                <div className="text-sm opacity-60">{t.sub}</div>
                <ul className="mt-6 space-y-2 text-sm">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <Check className="h-4 w-4 opacity-60" /> {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/login"
                  className={`mt-7 block text-center rounded-full px-5 py-3 text-sm ${t.highlight ? "bg-background text-foreground" : "cta-glossy"}`}
                >
                  {t.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
        <SiteFooter />
      </div>
    );
  },
});
