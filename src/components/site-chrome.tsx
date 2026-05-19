import { Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const demoUrl = "https://executor.genesis-ai.workers.dev";
const shareText =
  "EXECUTOR turns meetings into tracked commitments, monitored execution risk, and AI-drafted follow-ups.";
const xShareUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(demoUrl)}`;
const linkedInShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(demoUrl)}`;

function XLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M18.2 2h3.3l-7.2 8.2L22.8 22h-6.7l-5.2-6.8L4.9 22H1.6l7.7-8.8L1.2 2h6.8l4.7 6.2L18.2 2Zm-1.2 18h1.8L7 3.9H5.1L17 20Z" />
    </svg>
  );
}

function LinkedInLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5ZM.4 8h4.2v13.6H.4V8Zm7.4 0h4v1.86h.06c.56-1.06 1.94-2.18 3.99-2.18 4.27 0 5.06 2.81 5.06 6.46v7.46h-4.18v-6.61c0-1.58-.03-3.61-2.2-3.61-2.21 0-2.55 1.72-2.55 3.5v6.72H7.8V8Z" />
    </svg>
  );
}

function SocialLinks({ compact = false }: { compact?: boolean }) {
  const linkClass =
    "inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-background/70 text-foreground/70 transition hover:text-foreground hover:bg-background";

  return (
    <div className={compact ? "flex items-center gap-2" : "flex items-center gap-3"}>
      <a
        href={xShareUrl}
        target="_blank"
        rel="noreferrer"
        aria-label="Share EXECUTOR on X"
        className={linkClass}
      >
        <XLogo className="h-4 w-4" />
      </a>
      <a
        href={linkedInShareUrl}
        target="_blank"
        rel="noreferrer"
        aria-label="Share EXECUTOR on LinkedIn"
        className={linkClass}
      >
        <LinkedInLogo className="h-4 w-4" />
      </a>
    </div>
  );
}

export function SiteNav() {
  const [authed, setAuthed] = useState(false);
  const router = useRouter();
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setAuthed(!!s));
    return () => sub.subscription.unsubscribe();
  }, []);
  return (
    <header className="absolute top-0 left-0 right-0 z-30 px-6 md:px-10 py-6">
      <div className="max-w-[1200px] mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-medium tracking-tight">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-foreground" />
          <span>EXECUTOR</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm text-foreground/70">
          <Link to="/product" className="hover:text-foreground">
            Product
          </Link>
          <Link to="/pricing" className="hover:text-foreground">
            Pricing
          </Link>
          <Link to="/about" className="hover:text-foreground">
            About
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          <div className="hidden lg:block">
            <SocialLinks compact />
          </div>
          {authed ? (
            <>
              <Link to="/dashboard" className="text-sm hover:underline">
                Dashboard
              </Link>
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  router.navigate({ to: "/" });
                }}
                className="text-sm text-foreground/70 hover:text-foreground"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm hover:underline">
                Sign in
              </Link>
              <Link to="/login" className="text-sm rounded-full cta-glossy px-4 py-2">
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-32 border-t border-border/60">
      <div className="max-w-[1200px] mx-auto px-6 md:px-10 py-12 flex flex-col md:flex-row justify-between gap-6 text-sm text-foreground/60">
        <div>
          <div className="font-medium text-foreground">EXECUTOR</div>
          <div className="mt-1">Meetings without EXECUTOR are just conversations.</div>
          <div className="mt-4">
            <SocialLinks />
          </div>
        </div>
        <div className="flex gap-8">
          <Link to="/product">Product</Link>
          <Link to="/pricing">Pricing</Link>
          <Link to="/about">About</Link>
          <Link to="/login">Sign in</Link>
        </div>
      </div>
    </footer>
  );
}
