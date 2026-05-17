import { Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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
          <Link to="/product" className="hover:text-foreground">Product</Link>
          <Link to="/pricing" className="hover:text-foreground">Pricing</Link>
          <Link to="/about" className="hover:text-foreground">About</Link>
        </nav>
        <div className="flex items-center gap-3">
          {authed ? (
            <>
              <Link to="/dashboard" className="text-sm hover:underline">Dashboard</Link>
              <button
                onClick={async () => { await supabase.auth.signOut(); router.navigate({ to: "/" }); }}
                className="text-sm text-foreground/70 hover:text-foreground"
              >Sign out</button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm hover:underline">Sign in</Link>
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
