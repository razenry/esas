"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Shield, Users, Sun, Moon, LogOut, Check, ChevronDown, RefreshCw } from "lucide-react";

interface Session {
  userId: string;
  shiftId: string;
  roleName: string;
  userName: string;
  shiftName: string;
  permissions: string[];
}

export default function DemoRoleSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null>(null);
  const [shifts, setShifts] = useState<{ id: string; name: string }[]>([]);
  const [selectedShiftId, setSelectedShiftId] = useState<string>("");
  const [isOpen, setIsOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch session and shifts on load
  const fetchSession = async () => {
    try {
      const res = await fetch("/api/auth/session");
      const data = await res.json();
      setSession(data.session);
      if (data.session) {
        setSelectedShiftId(data.session.shiftId);
      }
    } catch (e) {
      console.error("Error fetching session:", e);
    }
  };

  const fetchShifts = async () => {
    try {
      const res = await fetch("/api/shifts");
      const data = await res.json();
      if (data.shifts) {
        const activeShifts = data.shifts.filter((s: { id: string; name: string; isActive: boolean }) => s.isActive);
        setShifts(activeShifts);
      }
    } catch (e) {
      console.error("Error fetching shifts:", e);
    }
  };

  useEffect(() => {
    fetchSession();
    fetchShifts();
  }, [pathname]);

  const switchRole = async (roleName: string | null) => {
    setIsLoading(true);
    try {
      if (roleName === null) {
        // Customer Mode (Logout)
        await fetch("/api/auth/session", { method: "DELETE" });
        setSession(null);
        router.push("/");
      } else {
        // Switch to specific role
        const res = await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            switchRoleName: roleName,
            switchShiftId: selectedShiftId || undefined,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setSession(data.session);
          // Redirect to appropriate route based on role
          if (roleName === "Super Admin" || roleName === "Admin Booth") {
            router.push("/dashboard");
          } else if (roleName === "Petugas Administrasi" || roleName === "Petugas Penyerahan") {
            router.push("/scan");
          }
        }
      }
    } catch (e) {
      console.error("Error switching role:", e);
    } finally {
      setIsLoading(false);
      // Force page refresh to update all states
      router.refresh();
    }
  };

  const handleShiftChange = async (shiftId: string) => {
    setSelectedShiftId(shiftId);
    if (session) {
      // Re-trigger auth POST with new shift for same role to simulate shift switch
      setIsLoading(true);
      try {
        await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            switchRoleName: session.roleName,
            switchShiftId: shiftId,
          }),
        });
        await fetchSession();
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
        router.refresh();
      }
    }
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-5xl rounded-2xl bg-zinc-950/95 p-3 text-white shadow-2xl ring-1 ring-brand-blue-500/20 backdrop-blur-md transition-all duration-300">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-brand-red-500 animate-pulse" />
            <div className="flex flex-col">
              <span className="text-xs font-semibold uppercase tracking-wider text-brand-red-500">Staging Control Panel</span>
              <span className="text-[10px] text-zinc-400">
                Mode saat ini:{" "}
                <strong className="text-zinc-200">
                  {session ? `${session.roleName} (${session.userName})` : "Customer View"}
                </strong>
              </span>
            </div>
          </div>
          
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="rounded-lg p-1 hover:bg-zinc-800 md:hidden"
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </button>
        </div>

        {isOpen && (
          <div className="flex flex-wrap items-center gap-2 md:flex-nowrap">
            {/* Shift Selector */}
            <div className="flex items-center gap-1.5 rounded-lg bg-zinc-900 px-2.5 py-1.5 text-xs ring-1 ring-zinc-800">
              <span className="text-zinc-500">Shift:</span>
              <select 
                value={selectedShiftId} 
                onChange={(e) => handleShiftChange(e.target.value)}
                className="bg-transparent font-medium text-brand-blue-500 outline-none cursor-pointer"
              >
                {shifts.map(s => (
                  <option key={s.id} value={s.id} className="bg-zinc-950 text-white">
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Customer Mode Button */}
            <button
              onClick={() => switchRole(null)}
              disabled={isLoading}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                !session
                  ? "bg-brand-blue-500 text-white font-semibold shadow-lg shadow-brand-blue-500/20"
                  : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white"
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              Customer Mode
            </button>

            {/* Role Buttons */}
            {["Petugas Administrasi", "Petugas Penyerahan", "Admin Booth", "Super Admin"].map((role) => {
              const isActive = session?.roleName === role;
              return (
                <button
                  key={role}
                  onClick={() => switchRole(role)}
                  disabled={isLoading}
                  className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                    isActive
                      ? "bg-brand-blue-500 text-white font-semibold shadow-lg shadow-brand-blue-500/20"
                      : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                  }`}
                >
                  {isActive && <Check className="h-3 w-3" />}
                  {role.replace("Petugas ", "")}
                </button>
              );
            })}

            {session && (
              <button
                onClick={() => switchRole(null)}
                className="flex items-center gap-1 rounded-lg bg-red-950/40 px-2 py-1.5 text-xs font-medium text-red-400 transition-all hover:bg-red-900/60 hover:text-red-200"
                title="Log Out Session"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
