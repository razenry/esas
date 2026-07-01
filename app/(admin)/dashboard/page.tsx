"use client";

import { useEffect, useState } from "react";
import { 
  TrendingUp, Users, ShoppingBag, CreditCard, Clock, 
  ArrowUpRight, ArrowDownRight, RefreshCw, Award 
} from "lucide-react";
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell 
} from "recharts";
import { formatCurrency, formatWeight } from "@/lib/utils";

interface DashboardData {
  totals: {
    totalToday: number;
    completedToday: number;
    pendingToday: number;
    cancelledToday: number;
    totalItemsHandedOverToday: number;
    revenueToday: number;
    revenueMonth: number;
  };
  salesTrend: { time: string; transactions: number; revenue: number }[];
  rekapProduk: { name: string; qty: number; weight: number; revenue: number; totalWeight: number }[];
  rekapShift: { id: string; name: string; transactions: number; revenue: number }[];
  rekapPetugas: { name: string; username: string; role: string; verifications: number; handovers: number }[];
  rekapPendapatan: { name: string; transactions: number; revenue: number }[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeQueue, setActiveQueue] = useState<{
    waitingAdmin: any[];
    waitingHandover: any[];
    activeServing: any[];
    completed: any[];
  }>({
    waitingAdmin: [],
    waitingHandover: [],
    activeServing: [],
    completed: [],
  });

  const fetchActiveQueue = async () => {
    try {
      const res = await fetch("/api/queue/active");
      const data = await res.json();
      if (data.success) {
        setActiveQueue({
          waitingAdmin: data.waitingAdmin || [],
          waitingHandover: data.waitingHandover || [],
          activeServing: data.activeServing || [],
          completed: data.completed || [],
        });
      }
    } catch (e) {
      console.error("Failed to fetch queue monitor:", e);
    }
  };

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/reports");
      if (!res.ok) {
        throw new Error("Gagal memuat data laporan.");
      }
      const reportData = await res.json();
      setData(reportData);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Terjadi kesalahan.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    fetchActiveQueue();
    const interval = setInterval(fetchActiveQueue, 5000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-brand-blue-500" />
          <span className="text-sm text-zinc-400">Menghitung rekap penjualan...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-red-400">
        {error || "Gagal memuat data dashboard."}
      </div>
    );
  }

  const { totals, salesTrend, rekapProduk, rekapShift, rekapPetugas, rekapPendapatan } = data;

  // Colors for Recharts
  const COLORS = ["#3b82f6", "#ef4444", "#a1a1aa", "#1d4ed8", "#dc2626"];

  return (
    <div className="space-y-8">
      {/* Page Title & Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">Dashboard Pemantauan</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Pemantauan transaksi dan performa booth event secara real-time</p>
        </div>
        <button
          onClick={fetchDashboardData}
          className="flex items-center gap-2 rounded-xl bg-card border border-border px-4 py-2 text-xs font-semibold text-zinc-500 dark:text-zinc-300 transition-all hover:bg-background cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh Data
        </button>
      </div>

      {/* Grid: Stat Summary Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        
        {/* Total Today */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Antrian Hari Ini</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-background text-zinc-500 dark:text-zinc-400 ring-1 ring-border">
              <Users className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-foreground">{totals.totalToday}</span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">transaksi</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-zinc-500">
            <span>{totals.pendingToday} antrian menunggu tindakan</span>
          </div>
        </div>

        {/* Total Handed Over Today */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Emas Diserahkan</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-background text-zinc-500 dark:text-zinc-400 ring-1 ring-border">
              <ShoppingBag className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-foreground">{totals.totalItemsHandedOverToday}</span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">keping emas</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-emerald-500 dark:text-emerald-400">
            <span>{totals.completedToday} antrian selesai</span>
          </div>
        </div>

        {/* Revenue Today */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Omzet Hari Ini</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-background text-zinc-500 dark:text-zinc-400 ring-1 ring-border">
              <TrendingUp className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-bold text-brand-gradient tracking-tight">
              {formatCurrency(totals.revenueToday)}
            </span>
          </div>
          <div className="mt-3 flex items-center gap-1 text-[10px] text-zinc-500">
            <span>Dari transaksi berstatus Selesai</span>
          </div>
        </div>

        {/* Revenue Month */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Omzet Bulan Ini</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-background text-zinc-500 dark:text-zinc-400 ring-1 ring-border">
              <CreditCard className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-bold text-brand-gradient tracking-tight">
              {formatCurrency(totals.revenueMonth)}
            </span>
          </div>
          <div className="mt-3 flex items-center gap-1 text-[10px] text-zinc-500">
            <span>Sejak tanggal 1 bulan ini</span>
          </div>
        </div>

      </div>

      {/* Grid: Charts Area */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        
        {/* Sales Trend Chart (8 cols) */}
        <div className="rounded-2xl border border-border bg-card p-6 lg:col-span-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Tren Penjualan Hari Ini</h3>
              <p className="text-[10px] text-zinc-500">Grafik transaksi dan omzet berdasarkan jam operasional booth</p>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesTrend}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" stroke="#888888" fontSize={10} tickLine={false} />
                <YAxis stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", borderRadius: "12px", fontSize: "11px", color: "var(--foreground)" }}
                  formatter={(value: any, name: any) => {
                    if (name === "revenue") return [formatCurrency(value), "Omzet"];
                    return [value, "Transaksi"];
                  }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Shift breakdown (4 cols) */}
        <div className="rounded-2xl border border-border bg-card p-6 lg:col-span-4">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Performa Shift</h3>
          <p className="text-[10px] text-zinc-500 mb-6">Distribusi omzet per shift petugas hari ini</p>

          <div className="flex h-56 items-center justify-center">
            {rekapShift.length === 0 || rekapShift.every(s => s.revenue === 0) ? (
              <span className="text-xs text-zinc-500">Belum ada omzet masuk</span>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={rekapShift}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="revenue"
                  >
                    {rekapShift.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", borderRadius: "12px", fontSize: "11px", color: "var(--foreground)" }}
                    formatter={(value: unknown) => formatCurrency(Number(value))}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="mt-4 space-y-2">
            {rekapShift.map((shift, idx) => (
              <div key={shift.id} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                  <span className="font-medium text-zinc-600 dark:text-zinc-300">{shift.name}</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-foreground">{formatCurrency(shift.revenue)}</span>
                  <span className="block text-[9px] text-zinc-500">{shift.transactions} trx</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Grid: Master lists */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        
        {/* Top Products Table */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Top Produk Emas</h3>
            <span className="rounded-full bg-background px-2.5 py-0.5 text-[10px] text-brand-red-500 font-semibold ring-1 ring-border">
              Terlaris
            </span>
          </div>

          {rekapProduk.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-500">Belum ada emas terjual</div>
          ) : (
            <div className="divide-y divide-border">
              {rekapProduk.map((prod, idx) => (
                <div key={prod.name} className="flex items-center justify-between py-3.5 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-background font-mono font-bold text-brand-blue-500">
                      {idx + 1}
                    </span>
                    <div className="flex flex-col">
                      <span className="font-bold text-foreground">{prod.name}</span>
                      <span className="text-[10px] text-zinc-500 dark:text-zinc-400">Total berat: {formatWeight(prod.totalWeight)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-foreground">{prod.qty} Keping</span>
                    <span className="block text-[10px] text-brand-red-500">{formatCurrency(prod.revenue)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Officer Performance Table */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Rekap Kinerja Petugas</h3>
            <div className="flex h-5 w-5 items-center justify-center text-brand-red-500">
              <Award className="h-4 w-4" />
            </div>
          </div>

          {rekapPetugas.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-500">Belum ada aktivitas petugas hari ini</div>
          ) : (
            <div className="divide-y divide-border">
              {rekapPetugas.map((off) => (
                <div key={off.username} className="flex items-center justify-between py-3.5 text-xs">
                  <div>
                    <span className="font-bold text-foreground">{off.name}</span>
                    <span className="block text-[10px] text-zinc-500 dark:text-zinc-400">{off.role}</span>
                  </div>
                  <div className="flex gap-4 text-right">
                    {off.verifications > 0 && (
                      <div>
                        <span className="font-semibold text-zinc-700 dark:text-zinc-200">{off.verifications}</span>
                        <span className="block text-[9px] text-zinc-500">Verifikasi</span>
                      </div>
                    )}
                    {off.handovers > 0 && (
                      <div>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">{off.handovers}</span>
                        <span className="block text-[9px] text-zinc-500">Penyerahan</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Real-Time Queue Monitor Section (Admin Side) */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <div>
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Monitor Antrian Real-Time</h3>
              <p className="text-[10px] text-zinc-500">Memantau antrian aktif pada booth secara langsung</p>
            </div>
          </div>
          <span className="text-[10px] font-bold text-zinc-450 bg-background border border-border px-2.5 py-1 rounded-xl">
            Live updates 5s
          </span>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Waiting for Admin Panel */}
          <div className="rounded-xl bg-background border border-border p-4 flex flex-col min-h-[220px]">
            <div className="flex items-center justify-between border-b border-border pb-2.5 mb-3">
              <span className="text-xs font-bold text-zinc-650 uppercase tracking-wider">1. Antrian Administrasi</span>
              <span className="rounded-full bg-brand-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-brand-blue-500">
                {activeQueue.waitingAdmin.length} antrian
              </span>
            </div>
            <div className="space-y-2 flex-1 overflow-y-auto max-h-[280px] no-scrollbar">
              {activeQueue.waitingAdmin.length === 0 ? (
                <div className="flex h-32 items-center justify-center text-xs text-zinc-500 italic">
                  Tidak ada antrian menunggu
                </div>
              ) : (
                activeQueue.waitingAdmin.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between rounded-lg bg-card border border-border p-3 shadow-sm hover:border-brand-blue-500/30 transition-all">
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-zinc-700 truncate">{tx.customerName}</span>
                      <span className="text-[10px] text-zinc-400 font-mono mt-0.5">Masuk: {new Date(tx.createdAt).toLocaleTimeString("id-ID", {hour: '2-digit', minute:'2-digit'})} WIB</span>
                    </div>
                    <span className="text-sm font-extrabold text-brand-blue-500 bg-brand-blue-500/5 px-2 py-1 rounded-md">{tx.queueNumber}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Waiting for Handover Panel */}
          <div className="rounded-xl bg-background border border-border p-4 flex flex-col min-h-[220px]">
            <div className="flex items-center justify-between border-b border-border pb-2.5 mb-3">
              <span className="text-xs font-bold text-zinc-650 uppercase tracking-wider">2. Penyerahan Emas</span>
              <span className="rounded-full bg-brand-red-500/10 px-2 py-0.5 text-[10px] font-bold text-brand-red-500">
                {activeQueue.waitingHandover.length} antrian
              </span>
            </div>
            <div className="space-y-2 flex-1 overflow-y-auto max-h-[280px] no-scrollbar">
              {activeQueue.waitingHandover.length === 0 ? (
                <div className="flex h-32 items-center justify-center text-xs text-zinc-400 italic">
                  Tidak ada antrian menunggu
                </div>
              ) : (
                activeQueue.waitingHandover.map((tx, idx) => (
                  <div 
                    key={tx.id} 
                    className={`flex items-center justify-between rounded-lg border p-3 shadow-sm transition-all ${
                      idx === 0 
                        ? "bg-brand-red-500/5 border-brand-red-500/40 ring-1 ring-brand-red-500/20" 
                        : "bg-card border-border hover:border-brand-red-500/30"
                    }`}
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-zinc-700 truncate">{tx.customerName}</span>
                      {idx === 0 && (
                        <span className="mt-0.5 inline-block text-[9px] uppercase font-bold text-brand-red-500">
                          Panggilan Utama
                        </span>
                      )}
                    </div>
                    <span className={`text-sm font-extrabold px-2 py-1 rounded-md ${idx === 0 ? "bg-brand-red-500/10 text-brand-red-650 text-base" : "bg-brand-red-500/5 text-brand-red-500"}`}>
                      {tx.queueNumber}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Completed Panel */}
          <div className="rounded-xl bg-background border border-border p-4 flex flex-col min-h-[220px]">
            <div className="flex items-center justify-between border-b border-border pb-2.5 mb-3">
              <span className="text-xs font-bold text-zinc-650 uppercase tracking-wider">3. Riwayat Selesai</span>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                Baru Selesai
              </span>
            </div>
            <div className="space-y-2 flex-1 overflow-y-auto max-h-[280px] no-scrollbar">
              {activeQueue.completed.length === 0 ? (
                <div className="flex h-32 items-center justify-center text-xs text-zinc-400 italic">
                  Belum ada antrian selesai
                </div>
              ) : (
                activeQueue.completed.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between rounded-lg bg-card border border-border p-3 opacity-80">
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs text-zinc-450 line-through truncate">{tx.customerName}</span>
                      <span className="text-[9px] text-emerald-600 font-semibold mt-0.5">Selesai: {new Date(tx.updatedAt).toLocaleTimeString("id-ID", {hour: '2-digit', minute:'2-digit'})} WIB</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span className="text-xs font-bold text-zinc-400 font-mono bg-zinc-100 border border-zinc-200 px-1.5 py-0.5 rounded">{tx.queueNumber}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
