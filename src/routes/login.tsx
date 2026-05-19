import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteNav } from "@/components/site-chrome";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — EXECUTOR" },
      { name: "description", content: "Sign in to your EXECUTOR workspace." },
    ],
  }),
  beforeLoad: async () => {
    if (typeof window === "undefined") return;

    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/dashboard" });
  },
  component: LoginPage,
});

function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name },
            emailRedirectTo: `${window.location.origin}/dashboard`,
          },
        });
        if (error) throw error;
        toast.success("Account created. Check your email to confirm.");
        // If autoconfirm is off, user still needs to verify; otherwise session is set.
        const { data } = await supabase.auth.getSession();
        if (data.session) router.navigate({ to: "/dashboard" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.navigate({ to: "/dashboard" });
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <div className="flex items-center justify-center min-h-screen px-6">
        <div className="w-full max-w-md rounded-3xl border border-border/60 bg-card p-8 shadow-soft">
          <h1 className="text-2xl font-medium tracking-tight">
            {mode === "signin" ? "Welcome back" : "Create your workspace"}
          </h1>
          <p className="text-sm text-foreground/60 mt-1">
            {mode === "signin"
              ? "Sign in to your EXECUTOR account."
              : "Free for 30 days. No card required."}
          </p>
          <form onSubmit={onSubmit} className="mt-6 space-y-3">
            {mode === "signup" && (
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                required
                className="w-full rounded-xl border border-border bg-input/40 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            )}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
              className="w-full rounded-xl border border-border bg-input/40 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              minLength={6}
              className="w-full rounded-xl border border-border bg-input/40 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full cta-glossy rounded-xl py-3 text-sm font-medium disabled:opacity-60"
            >
              {loading ? "Working…" : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>
          <button
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="mt-5 text-sm text-foreground/60 hover:text-foreground w-full text-center"
          >
            {mode === "signin" ? "No account? Create one" : "Already have an account? Sign in"}
          </button>
          <div className="mt-6 text-center text-xs text-foreground/40">
            <Link to="/">← Back to site</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
