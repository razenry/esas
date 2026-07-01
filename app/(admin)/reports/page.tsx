"use client";

import { useEffect, useState } from "react";
import { 
  BarChart3, Calendar, Clock, CreditCard, ShoppingBag, 
  User, Download, Printer, RefreshCw, Eye, ArrowRight, Table 
} from "lucide-react";
import { formatCurrency, formatDate, formatWeight } from "@/lib/utils";

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

type ReportTab = "shift" | "petugas" | "produk" | "pendapatan";

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>("shift");
  const [data, setData] = useState<DashboardData | null>(null);
  const [shifts, setShifts] = useState<{ id: string; name: string }[]>([]);
  
  // Report filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedShiftId, setSelectedShiftId] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchShifts = async () => {
    try {
      const res = await fetch("/api/shifts");
      const data = await res.json();
      if (data.shifts) {
        setShifts(data.shifts.filter((s: { id: string; name: string; isActive: boolean }) => s.isActive));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchReportData = async () => {
    setIsLoading(true);
    setError("");
    try {
      const queryParams = new URLSearchParams();
      if (startDate) queryParams.set("startDate", startDate);
      if (endDate) queryParams.set("endDate", endDate);
      if (selectedShiftId) queryParams.set("shiftId", selectedShiftId);

      const res = await fetch(`/api/reports?${queryParams.toString()}`);
      if (!res.ok) {
        throw new Error("Gagal mengambil data laporan.");
      }
      const reportData = await res.json();
      setData(reportData);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Kesalahan internal");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchShifts();
    fetchReportData();
  }, [startDate, endDate, selectedShiftId]);

  // Export CSV / Excel Utility
  const triggerExport = (format: "csv" | "excel") => {
    if (!data) return;

    let csvContent = "";
    let filename = "";

    // Helper to format currency for spreadsheets
    const num = (v: number) => v.toString();

    if (activeTab === "shift") {
      csvContent = "Shift;Jumlah Transaksi;Total Pendapatan\n" + 
        data.rekapShift.map(s => `"${s.name}";${s.transactions};${s.revenue}`).join("\n");
      filename = `rekap_shift_${Date.now()}`;
    } else if (activeTab === "petugas") {
      csvContent = "Nama Petugas;Username;Peran;Verifikasi Administrasi;Konfirmasi Penyerahan\n" + 
        data.rekapPetugas.map(o => `"${o.name}";"${o.username}";"${o.role}";${o.verifications};${o.handovers}`).join("\n");
      filename = `rekap_petugas_${Date.now()}`;
    } else if (activeTab === "produk") {
      csvContent = "Nama Produk;Keping Terjual;Berat Satuan (gr);Total Berat (gr);Total Pendapatan\n" + 
        data.rekapProduk.map(p => `"${p.name}";${p.qty};${p.weight};${p.totalWeight};${p.revenue}`).join("\n");
      filename = `rekap_produk_${Date.now()}`;
    } else if (activeTab === "pendapatan") {
      csvContent = "Metode Pembayaran;Jumlah Transaksi;Total Pendapatan\n" + 
        data.rekapPendapatan.map(p => `"${p.name}";${p.transactions};${p.revenue}`).join("\n");
      filename = `rekap_pendapatan_${Date.now()}`;
    }

    // Excel compatibility: append UTF-8 BOM \uFEFF to resolve Indonesian special formats
    const blobContent = format === "excel" ? "\uFEFF" + csvContent : csvContent;
    const blob = new Blob([blobContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.${format === "excel" ? "xls" : "csv"}`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const triggerPrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header controls */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between no-print">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white md:text-3xl font-sans">Laporan & Rekapitulasi</h2>
          <p className="text-xs text-zinc-400">Unduh data performa penjualan, rekap shift petugas, dan ekspor berkas audit</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => triggerExport("csv")}
            disabled={isLoading || !data}
            className="flex items-center gap-1.5 rounded-xl bg-zinc-900 border border-zinc-800 px-3.5 py-2 text-xs font-semibold text-zinc-300 hover:text-white transition-all disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            Ekspor CSV
          </button>
          <button
            onClick={() => triggerExport("excel")}
            disabled={isLoading || !data}
            className="flex items-center gap-1.5 rounded-xl bg-zinc-900 border border-zinc-800 px-3.5 py-2 text-xs font-semibold text-zinc-300 hover:text-white transition-all disabled:opacity-50"
          >
            <Table className="h-3.5 w-3.5 text-emerald-400" />
            Ekspor Excel
          </button>
          <button
            onClick={triggerPrint}
            disabled={isLoading || !data}
            className="flex items-center gap-1.5 rounded-xl bg-brand-gradient px-3.5 py-2 text-xs font-bold text-white hover:opacity-95 transition-all disabled:opacity-50"
          >
            <Printer className="h-3.5 w-3.5" />
            Cetak PDF / Laporan
          </button>
        </div>
      </div>

      {/* Grid: Filters Box (no-print) */}
      <div className="rounded-2xl border border-zinc-800 bg-[#121316] p-5 grid grid-cols-1 gap-4 sm:grid-cols-3 no-print">
        <div className="flex items-center gap-2.5">
          <Calendar className="h-4 w-4 text-zinc-500" />
          <div className="flex-1">
            <label className="block text-[10px] font-bold text-zinc-500 uppercase">Mulai Tanggal</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 w-full rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-xs text-white outline-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Calendar className="h-4 w-4 text-zinc-500" />
          <div className="flex-1">
            <label className="block text-[10px] font-bold text-zinc-500 uppercase">Sampai Tanggal</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 w-full rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-xs text-white outline-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Clock className="h-4 w-4 text-zinc-500" />
          <div className="flex-1">
            <label className="block text-[10px] font-bold text-zinc-500 uppercase">Saring Shift</label>
            <select
              value={selectedShiftId}
              onChange={(e) => setSelectedShiftId(e.target.value)}
              className="mt-1 w-full rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-xs text-white outline-none cursor-pointer"
            >
              <option value="">-- Semua Shift --</option>
              {shifts.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* print-only report header */}
      <div className="hidden print:block border-b border-zinc-400 pb-4 text-zinc-900">
        <h1 className="text-xl font-bold">LAPORAN REKAPITULASI PENJUALAN BOOTH</h1>
        <p className="text-xs">Sima Booth Administration System (SBAS)</p>
        <div className="mt-3 text-xs grid grid-cols-2 gap-2 text-zinc-700">
          <span>Periode Cetak: <strong>{startDate || "Awal Event"} s/d {endDate || "Sekarang"}</strong></span>
          {selectedShiftId && <span>Saringan Shift: <strong>{shifts.find(s => s.id === selectedShiftId)?.name}</strong></span>}
        </div>
      </div>

      {/* Tabs list (no-print) */}
      <div className="flex border-b border-zinc-850 bg-zinc-950/40 rounded-xl overflow-hidden no-print">
        {[
          { id: "shift", name: "Rekap Shift", icon: Clock },
          { id: "petugas", name: "Rekap Petugas", icon: User },
          { id: "produk", name: "Rekap Produk", icon: ShoppingBag },
          { id: "pendapatan", name: "Rekap Pembayaran", icon: CreditCard },
        ].map((tab) => {
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ReportTab)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3.5 text-xs font-bold border-b-2 transition-all ${
                isSelected
                  ? "border-brand-blue-500 text-brand-blue-500 bg-brand-blue-500/5"
                  : "border-transparent text-zinc-400 hover:text-white"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.name}
            </button>
          );
        })}
      </div>

      {/* Report Workspace table container */}
      <div className="rounded-2xl border border-zinc-800 bg-[#121316] overflow-hidden print:border-zinc-400 print:bg-white print:text-zinc-900">
        
        {isLoading ? (
          <div className="py-16 text-center text-zinc-500">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-brand-blue-500" />
            <span>Merekap data transaksi...</span>
          </div>
        ) : error || !data ? (
          <div className="py-16 text-center text-red-400 font-semibold">{error || "Gagal memuat laporan."}</div>
        ) : (
          <div className="p-4 md:p-6">
            
            {/* 1. Shift Tab */}
            {activeTab === "shift" && (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-950/30 text-[10px] uppercase font-bold text-zinc-400 print:border-zinc-400 print:bg-zinc-100 print:text-zinc-700">
                    <th className="px-5 py-4">Nama Shift</th>
                    <th className="px-5 py-4">Jumlah Transaksi Selesai</th>
                    <th className="px-5 py-4 text-right">Total Pendapatan (IDR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850 print:divide-zinc-200">
                  {data.rekapShift.map((s) => (
                    <tr key={s.id} className="hover:bg-zinc-800/10 print:text-zinc-800">
                      <td className="px-5 py-4 font-bold text-white print:text-zinc-900">{s.name}</td>
                      <td className="px-5 py-4 text-zinc-300 print:text-zinc-700">{s.transactions} trx</td>
                      <td className="px-5 py-4 text-right font-bold text-brand-red-500 print:text-zinc-950">
                        {formatCurrency(s.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 2. Officer Tab */}
            {activeTab === "petugas" && (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-950/30 text-[10px] uppercase font-bold text-zinc-400 print:border-zinc-400 print:bg-zinc-100 print:text-zinc-700">
                    <th className="px-5 py-4">Nama Petugas</th>
                    <th className="px-5 py-4">Username</th>
                    <th className="px-5 py-4">Peran Perwakilan</th>
                    <th className="px-5 py-4">Verifikasi Administrasi</th>
                    <th className="px-5 py-4 text-right">Penyerahan Emas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850 print:divide-zinc-200">
                  {data.rekapPetugas.map((o) => (
                    <tr key={o.username} className="hover:bg-zinc-800/10 print:text-zinc-800">
                      <td className="px-5 py-4 font-bold text-white print:text-zinc-900">{o.name}</td>
                      <td className="px-5 py-4 text-zinc-300 font-mono print:text-zinc-700">{o.username}</td>
                      <td className="px-5 py-4 text-zinc-400 print:text-zinc-500">{o.role}</td>
                      <td className="px-5 py-4 text-zinc-300 print:text-zinc-700 font-bold">{o.verifications} kali</td>
                      <td className="px-5 py-4 text-right text-emerald-400 font-bold print:text-emerald-700">
                        {o.handovers} kali
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 3. Product Tab */}
            {activeTab === "produk" && (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-950/30 text-[10px] uppercase font-bold text-zinc-400 print:border-zinc-400 print:bg-zinc-100 print:text-zinc-700">
                    <th className="px-5 py-4">Nama Emas</th>
                    <th className="px-5 py-4">Keping Terjual</th>
                    <th className="px-5 py-4">Berat Per Keping</th>
                    <th className="px-5 py-4">Total Berat Terjual</th>
                    <th className="px-5 py-4 text-right">Total Penjualan (IDR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850 print:divide-zinc-200">
                  {data.rekapProduk.map((p) => (
                    <tr key={p.name} className="hover:bg-zinc-800/10 print:text-zinc-800">
                      <td className="px-5 py-4 font-bold text-white print:text-zinc-900">{p.name}</td>
                      <td className="px-5 py-4 text-zinc-300 print:text-zinc-700">{p.qty} keping</td>
                      <td className="px-5 py-4 text-zinc-400 print:text-zinc-500">{formatWeight(p.weight)}</td>
                      <td className="px-5 py-4 text-zinc-300 print:text-zinc-700 font-semibold">{formatWeight(p.totalWeight)}</td>
                      <td className="px-5 py-4 text-right font-bold text-brand-red-500 print:text-zinc-950">
                        {formatCurrency(p.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 4. Payment Tab */}
            {activeTab === "pendapatan" && (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-950/30 text-[10px] uppercase font-bold text-zinc-400 print:border-zinc-400 print:bg-zinc-100 print:text-zinc-700">
                    <th className="px-5 py-4">Metode Pembayaran</th>
                    <th className="px-5 py-4">Jumlah Transaksi</th>
                    <th className="px-5 py-4 text-right">Total Pendapatan (IDR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850 print:divide-zinc-200">
                  {data.rekapPendapatan.map((p) => (
                    <tr key={p.name} className="hover:bg-zinc-800/10 print:text-zinc-800">
                      <td className="px-5 py-4 font-bold text-white print:text-zinc-900">{p.name}</td>
                      <td className="px-5 py-4 text-zinc-300 print:text-zinc-700">{p.transactions} trx</td>
                      <td className="px-5 py-4 text-right font-bold text-brand-red-500 print:text-zinc-950">
                        {formatCurrency(p.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

          </div>
        )}
      </div>

      {/* print-only signatures footer */}
      <div className="hidden print:grid grid-cols-2 gap-12 mt-12 text-xs text-zinc-900 pt-8 border-t border-zinc-200">
        <div className="text-center space-y-16">
          <p>Disiapkan Oleh:</p>
          <div className="flex flex-col">
            <span className="font-bold underline">_________________________</span>
            <span className="text-[10px] text-zinc-500">Petugas Administrasi Booth</span>
          </div>
        </div>
        <div className="text-center space-y-16">
          <p>Disetujui Oleh:</p>
          <div className="flex flex-col">
            <span className="font-bold underline">_________________________</span>
            <span className="text-[10px] text-zinc-500">Super Admin / Spv Event</span>
          </div>
        </div>
      </div>
      
      {/* CSS print utility overlay */}
      <style jsx global>{`
        @media print {
          body {
            background-color: white !important;
            color: black !important;
            padding: 0 !important;
          }
          aside, header, .no-print, .bottom-4 {
            display: none !important;
          }
          .flex-1 {
            padding: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
