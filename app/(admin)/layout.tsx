import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import Link from "next/link";
import { 
  LayoutDashboard, QrCode, Search, BarChart3, Settings, 
  LogOut, User, Clock, Menu, ShieldAlert 
} from "lucide-react";
import AdminHeaderClient from "@/components/AdminHeaderClient";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  // Define navigation items with required permission check
  const navItems = [
    {
      name: "Dashboard",
      href: "/dashboard",
      iconName: "dashboard",
      roles: ["Super Admin", "Admin Booth"],
    },
    {
      name: "Scan QR",
      href: "/scan",
      iconName: "scan",
      roles: ["Super Admin", "Admin Booth", "Petugas Administrasi", "Petugas Penyerahan"],
    },
    {
      name: "Data Transaksi",
      href: "/transactions",
      iconName: "search",
      roles: ["Super Admin", "Admin Booth", "Petugas Administrasi", "Petugas Penyerahan"],
    },
    {
      name: "Laporan & Rekap",
      href: "/reports",
      iconName: "reports",
      roles: ["Super Admin", "Admin Booth"],
    },
    {
      name: "Master Data",
      href: "/settings",
      iconName: "settings",
      roles: ["Super Admin"],
    },
  ];

  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    dashboard: LayoutDashboard,
    scan: QrCode,
    search: Search,
    reports: BarChart3,
    settings: Settings,
  };

  const allowedNavs = navItems.filter((item) => item.roles.includes(session.roleName));

  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans transition-colors duration-200">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 flex-col border-r border-border bg-card p-5 md:flex transition-colors duration-200">
        <div className="flex items-center gap-3 px-2 py-4">
          <img src="/favicon.ico" alt="SIMA Logo" className="h-9 w-9 object-contain" />
          <div>
            <h1 className="text-base font-bold text-foreground tracking-tight">SIMA <span className="text-brand-red-500">BOOTH</span></h1>
            <p className="text-[9px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-medium">Administration</p>
          </div>
        </div>

        {/* Sidebar Nav Links */}
        <nav className="mt-8 flex-1 space-y-1">
          {allowedNavs.map((item) => {
            const IconComponent = iconMap[item.iconName] || LayoutDashboard;
            return (
              <Link
                key={item.name}
                href={item.href}
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:bg-zinc-800/10 dark:hover:bg-zinc-800/40 hover:text-foreground dark:hover:text-white transition-all"
              >
                <IconComponent className="h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer User Info */}
        <div className="border-t border-border pt-4 flex flex-col gap-2.5">
          <div className="flex items-center gap-3 rounded-xl bg-background p-2.5 ring-1 ring-border min-w-0 w-full">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-blue-500/10 text-brand-blue-500">
              <User className="h-4 w-4" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="truncate text-xs font-bold text-foreground">{session.userName}</span>
              <span className="truncate text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">{session.roleName}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 px-2 text-[10px] text-zinc-500 dark:text-zinc-400">
            <Clock className="h-3 w-3 text-brand-red-500" />
            <span>Shift: <strong className="text-foreground">{session.shiftName}</strong></span>
          </div>
        </div>
      </aside>

      {/* Main Workspace Column */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Header client helper for logout / hamburger */}
        <AdminHeaderClient 
          userName={session.userName} 
          roleName={session.roleName} 
          shiftName={session.shiftName}
          allowedNavs={allowedNavs} 
        />
        
        {/* Scrollable page body */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
