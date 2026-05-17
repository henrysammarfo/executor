import { createFileRoute, Outlet, redirect, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LayoutDashboard, Upload, Mail, FileAudio, LogOut } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login" });
  },
  component: AuthLayout,
});

function AuthLayout() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);
  return (
    <div className="min-h-screen flex bg-secondary/30">
      <aside className="hidden md:flex w-60 flex-col border-r border-border/60 bg-card p-5">
        <Link to="/" className="flex items-center gap-2 font-medium tracking-tight mb-8">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-foreground" />
          EXECUTOR
        </Link>
        <nav className="flex flex-col gap-1 text-sm">
          <SideLink to="/dashboard" icon={LayoutDashboard}>Dashboard</SideLink>
          <SideLink to="/upload" icon={Upload}>New meeting</SideLink>
          <SideLink to="/meetings" icon={FileAudio}>Meetings</SideLink>
          <SideLink to="/followups" icon={Mail}>Follow-ups</SideLink>
        </nav>
        <div className="mt-auto pt-6 border-t border-border/60">
          <div className="text-xs text-foreground/50 truncate">{email}</div>
          <button
            onClick={async () => { await supabase.auth.signOut(); router.navigate({ to: "/" }); }}
            className="mt-2 flex items-center gap-2 text-sm text-foreground/70 hover:text-foreground"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>
      <div className="flex-1 min-w-0">
        <div className="md:hidden flex items-center justify-between p-4 border-b border-border/60 bg-card">
          <Link to="/" className="font-medium">EXECUTOR</Link>
          <div className="flex gap-3 text-sm">
            <Link to="/dashboard">Board</Link>
            <Link to="/upload">New</Link>
            <Link to="/followups">Follow-ups</Link>
          </div>
        </div>
        <main className="p-5 md:p-10 max-w-[1400px] mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function SideLink({ to, icon: Icon, children }: { to: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-secondary text-foreground/80"
      activeProps={{ className: "flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary text-foreground font-medium" }}
    >
      <Icon className="h-4 w-4" /> {children}
    </Link>
  );
}
