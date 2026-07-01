"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, Menu, X, User, Clock, LayoutDashboard, QrCode, Search, BarChart3, Settings } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

interface NavItem {
  name: string;
  href: string;
  iconName: string;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  scan: QrCode,
  search: Search,
  reports: BarChart3,
  settings: Settings,
};

interface AdminHeaderClientProps {
  userName: string;
  roleName: string;
  shiftName: string;
  allowedNavs: NavItem[];
}

export default function AdminHeaderClient({
  userName,
  roleName,
  shiftName,
  allowedNavs,
}: AdminHeaderClientProps) {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/session", { method: "DELETE" });
      router.push("/login");
      router.refresh();
    } catch (e) {
      console.error("Logout failed:", e);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <>
      {/* Mobile Top Header */}
      <header className="flex items-center justify-between border-b border-border bg-card px-5 py-4 md:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-gradient">
            <LayoutDashboard className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-bold text-foreground tracking-tight">SIMA <span className="text-brand-red-500">BOOTH</span></span>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button 
            onClick={() => setMobileMenuOpen(true)}
            className="rounded-lg p-1.5 hover:bg-zinc-800/10 text-zinc-500 dark:text-zinc-300"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Desktop Header */}
      <header className="hidden items-center justify-between border-b border-border bg-card px-8 py-4 md:flex">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">System Workspace</span>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span className="text-[10px] text-emerald-400 font-medium tracking-wide">CONNECTED</span>
        </div>

        <div className="flex items-center gap-5">
          {/* Shift info badge */}
          <div className="flex items-center gap-1.5 rounded-lg bg-background px-3 py-1.5 text-xs text-zinc-500 dark:text-zinc-400 ring-1 ring-border">
            <Clock className="h-3.5 w-3.5 text-brand-red-500" />
            <span>Shift: <strong className="text-foreground">{shiftName}</strong></span>
          </div>

          {/* User profile dropdown/button */}
          <div className="flex items-center gap-3 border-l border-border pl-5">
            <div className="text-right">
              <p className="text-xs font-bold text-foreground">{userName}</p>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-semibold uppercase">{roleName}</p>
            </div>
            <ThemeToggle />
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-950/20 text-red-400 border border-red-950/40 hover:bg-red-900/40 hover:text-red-200 transition-all cursor-pointer"
              title="Keluar Tugas"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex bg-black/60 md:hidden animate-fade-in">
          {/* Sidebar drawer content */}
          <div className="relative flex w-4/5 max-w-sm flex-col bg-card p-5 shadow-2xl border-r border-border animate-slide-up">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-gradient">
                  <LayoutDashboard className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm font-bold text-foreground">Sima Booth</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg p-1.5 hover:bg-zinc-800/10 text-zinc-400"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Mobile Nav Links */}
            <nav className="mt-6 flex-1 space-y-1">
              {allowedNavs.map((item) => {
                const IconComponent = iconMap[item.iconName] || LayoutDashboard;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-4 py-3 text-xs font-bold text-zinc-500 dark:text-zinc-400 transition-all hover:bg-zinc-800/10 hover:text-foreground dark:hover:text-white"
                  >
                    <IconComponent className="h-4 w-4" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            {/* Mobile Drawer Footer User Info */}
            <div className="border-t border-border pt-4 space-y-3">
              <div className="flex items-center gap-3 rounded-xl bg-background p-3 ring-1 ring-border">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-blue-500/10 text-brand-blue-500">
                  <User className="h-4 w-4" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="truncate text-xs font-bold text-foreground">{userName}</span>
                  <span className="truncate text-[10px] text-zinc-500 dark:text-zinc-400">{roleName}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 px-1.5">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-brand-red-500" />
                  <span>Shift: <strong className="text-foreground">{shiftName}</strong></span>
                </div>
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="flex items-center gap-1 text-red-500 hover:text-red-400 font-semibold"
                >
                  <LogOut className="h-3 w-3" />
                  Keluar
                </button>
              </div>
            </div>
          </div>

          {/* Close tap panel */}
          <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
        </div>
      )}
    </>
  );
}
