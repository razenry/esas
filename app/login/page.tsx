"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Lock, User, RefreshCw, KeyRound, Sparkles } from "lucide-react";


const loginSchema = z.object({
  username: z.string().min(1, "Username wajib diisi"),
  password: z.string().min(1, "Password wajib diisi"),
  shiftId: z.string().min(1, "Pilih shift tugas Anda"),
});

interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

export default function LoginPage() {
  const router = useRouter();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
      shiftId: "",
    },
  });

  // Load shifts on mount
  useEffect(() => {
    const fetchShifts = async () => {
      try {
        const res = await fetch("/api/shifts");
        const data = await res.json();
        if (data.shifts) {
          setShifts(data.shifts.filter((s: Shift) => s.isActive));
        }
      } catch (e) {
        console.error("Error loading shifts:", e);
      }
    };
    fetchShifts();
  }, []);

  const onSubmit = async (data: z.infer<typeof loginSchema>) => {
    setIsLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const resData = await res.json();

      if (!res.ok) {
        setErrorMsg(resData.error || "Gagal masuk. Periksa kembali detail Anda.");
      } else {
        // Redirect based on role
        const role = resData.session.roleName;
        if (role === "Super Admin" || role === "Admin Booth") {
          router.push("/dashboard");
        } else {
          router.push("/scan");
        }
        router.refresh();
      }
    } catch (e) {
      setErrorMsg("Koneksi gagal. Hubungi administrator.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 font-sans text-foreground transition-colors duration-200">

      {/* Decorative background glow */}
      <div className="absolute top-1/4 left-1/4 h-80 w-80 rounded-full bg-brand-red-500/10 blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 h-80 w-80 rounded-full bg-brand-blue-500/10 blur-[120px]" />

      <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-card border border-border p-8 shadow-2xl ring-1 ring-brand-blue-500/10">
        
        {/* Header logo */}
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-gradient shadow-lg shadow-brand-blue-500/20">
            <KeyRound className="h-6 w-6 text-white" />
          </div>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-foreground">Portal Petugas</h2>
          <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
            Sima Booth Administration System (SBAS)
          </p>
        </div>

        {errorMsg && (
          <div className="mt-6 rounded-xl bg-red-950/20 border border-red-500/20 p-3.5 text-center text-xs text-red-400">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-5">
          {/* Shift Selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Pilih Shift Tugas *</label>
            <div className="relative">
              <select
                {...register("shiftId")}
                className="w-full appearance-none rounded-xl bg-background border border-border px-4 py-3 text-sm text-foreground outline-none focus:border-brand-blue-500 focus:ring-1 focus:ring-brand-blue-500 transition-all cursor-pointer"
              >
                <option value="" className="text-foreground bg-card">-- Pilih Shift Kerja Anda --</option>
                {shifts.map((s) => (
                  <option key={s.id} value={s.id} className="text-foreground bg-card">
                    {s.name} ({s.startTime} - {s.endTime})
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500">
                ▼
              </div>
            </div>
            {errors.shiftId && <span className="text-[10px] text-red-500">{errors.shiftId.message}</span>}
          </div>

          {/* Username */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Username *</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                {...register("username")}
                placeholder="Masukkan username Anda"
                className="w-full rounded-xl bg-background border border-border pl-11 pr-4 py-3 text-sm text-foreground placeholder-zinc-400 dark:placeholder-zinc-500 outline-none focus:border-brand-blue-500 focus:ring-1 focus:ring-brand-blue-500 transition-all"
              />
            </div>
            {errors.username && <span className="text-[10px] text-red-500">{errors.username.message}</span>}
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Password *</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                {...register("password")}
                type="password"
                placeholder="••••••••"
                className="w-full rounded-xl bg-background border border-border pl-11 pr-4 py-3 text-sm text-foreground placeholder-zinc-400 dark:placeholder-zinc-500 outline-none focus:border-brand-blue-500 focus:ring-1 focus:ring-brand-blue-500 transition-all"
              />
            </div>
            {errors.password && <span className="text-[10px] text-red-500">{errors.password.message}</span>}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-gradient py-3 text-sm font-bold text-white transition-all hover:opacity-95 disabled:opacity-50"
          >
            {isLoading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              "Masuk Tugas"
            )}
          </button>
        </form>

        <div className="mt-6 border-t border-zinc-800/80 pt-4 text-center">
          <p className="text-[10px] text-zinc-500">
            Hanya untuk petugas resmi PT SIMA (Sinar Inti Maju). Seluruh aktivitas login dipantau dan masuk audit log.
          </p>
        </div>
      </div>
    </div>
  );
}
