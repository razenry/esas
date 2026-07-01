"use client";

import { useEffect, useState } from "react";
import { 
  Search as SearchIcon, Filter, Clock, CreditCard, ShoppingBag, 
  Calendar, User, FileText, CheckCircle2, AlertTriangle, XCircle, 
  Copy, Check, ArrowRight, Eye, ClipboardCheck, Ban, RefreshCw
} from "lucide-react";
import { formatCurrency, formatDate, formatWeight, copyTextToClipboard } from "@/lib/utils";

interface Transaction {
  id: string;
  transactionNumber: string;
  queueNumber: string;
  status: string;
  customerId: string;
  paymentMethodId: string;
  createdAt: string;
  updatedAt: string;
  customer: {
    name: string;
    nik: string;
    address: string;
    phone: string;
    email: string | null;
    notes: string | null;
  };
  paymentMethod: {
    name: string;
  };
  items: {
    id: string;
    qty: number;
    price: number;
    product: {
      name: string;
      weight: number;
    };
  }[];
  auditLogs: {
    id: string;
    timestamp: string;
    action: string;
    details: string;
    user?: { name: string; username: string } | null;
    shift?: { name: string } | null;
  }[];
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<{ id: string; name: string }[]>([]);
  const [shifts, setShifts] = useState<{ id: string; name: string }[]>([]);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  // Filters State
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [shiftId, setShiftId] = useState("");
  const [productId, setProductId] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [copiedTxId, setCopiedTxId] = useState<string | null>(null);
  const [copiedExcelTxId, setCopiedExcelTxId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState("");

  // Fetch Master Data
  const loadFilters = async () => {
    try {
      const [prodRes, pmRes, shiftRes] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/payment-methods"),
        fetch("/api/shifts"),
      ]);
      const prodData = await prodRes.json();
      const pmData = await pmRes.json();
      const shiftData = await shiftRes.json();

      if (prodData.products) setProducts(prodData.products);
      if (pmData.paymentMethods) setPaymentMethods(pmData.paymentMethods);
      if (shiftData.shifts) setShifts(shiftData.shifts);
    } catch (e) {
      console.error("Error loading filters data:", e);
    }
  };

  // Fetch Transactions List
  const loadTransactions = async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (search) queryParams.set("search", search);
      if (status) queryParams.set("status", status);
      if (shiftId) queryParams.set("shiftId", shiftId);
      if (productId) queryParams.set("productId", productId);
      if (paymentMethodId) queryParams.set("paymentMethodId", paymentMethodId);
      if (startDate) queryParams.set("startDate", startDate);
      if (endDate) queryParams.set("endDate", endDate);

      const res = await fetch(`/api/transactions?${queryParams.toString()}`);
      const data = await res.json();
      if (data.transactions) {
        setTransactions(data.transactions);
        // Refresh active selected transaction if open
        if (selectedTx) {
          const updated = data.transactions.find((t: Transaction) => t.id === selectedTx.id);
          if (updated) setSelectedTx(updated);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFilters();
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [search, status, shiftId, productId, paymentMethodId, startDate, endDate]);

  // Copy details helper for Google Docs migration
  const copyToClipboard = (tx: Transaction) => {
    const goldItemsText = tx.items
      .map(item => `${item.product.name} (x${item.qty})`)
      .join(", ");
    
    const textToCopy = `NO_TX\t${tx.transactionNumber}\nNO_ANTRIAN\t${tx.queueNumber}\nNAMA\t${tx.customer.name}\nNIK\t${tx.customer.nik}\nHP\t${tx.customer.phone}\nALAMAT\t${tx.customer.address}\nEMAS\t${goldItemsText}\nPEMBAYARAN\t${tx.paymentMethod.name}\nTANGGAL\t${formatDate(tx.createdAt)}`;
    
    copyTextToClipboard(textToCopy);
    setCopiedTxId(tx.id);
    setTimeout(() => setCopiedTxId(null), 2500);
  };

  // Excel columns O, P, Q format helper (NIK, NAMA, ALAMAT)
  const copyExcelRow = (tx: Transaction) => {
    const textToCopy = `\`${tx.customer.nik}\t${tx.customer.name}\t${tx.customer.address}`;
    copyTextToClipboard(textToCopy);
    setCopiedExcelTxId(tx.id);
    setTimeout(() => setCopiedExcelTxId(null), 2500);
  };

  // Status Action (Admin click confirm, handover, or cancel)
  const executeAction = async (action: string) => {
    if (!selectedTx) return;
    setActionLoading(true);
    setFeedbackMsg("");
    try {
      const res = await fetch(`/api/transactions/${selectedTx.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const resData = await res.json();

      if (!res.ok) {
        setFeedbackMsg(resData.error || "Gagal mengubah status.");
      } else {
        setFeedbackMsg("Status transaksi berhasil diubah!");
        loadTransactions();
      }
    } catch (e) {
      setFeedbackMsg("Kesalahan koneksi.");
    } finally {
      setActionLoading(false);
    }
  };

  const cancelTransaction = async () => {
    if (!selectedTx) return;
    setActionLoading(true);
    setFeedbackMsg("");
    try {
      const res = await fetch(`/api/transactions/${selectedTx.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Dibatalkan" }),
      });
      const resData = await res.json();

      if (!res.ok) {
        setFeedbackMsg(resData.error || "Gagal membatalkan transaksi.");
      } else {
        setFeedbackMsg("Transaksi dibatalkan.");
        loadTransactions();
      }
    } catch (e) {
      setFeedbackMsg("Kesalahan koneksi.");
    } finally {
      setActionLoading(false);
    }
  };

  // Status Badges Styling Helper
  const getStatusBadge = (statusStr: string) => {
    const styleMap: Record<string, string> = {
      "Menunggu Administrasi": "bg-yellow-500/10 text-yellow-400 ring-yellow-500/30",
      "Waiting_Admin": "bg-yellow-500/10 text-yellow-400 ring-yellow-500/30",
      "Administrasi Selesai": "bg-blue-500/10 text-blue-400 ring-blue-500/30",
      "Menunggu Penyerahan": "bg-purple-500/10 text-purple-400 ring-purple-500/30",
      "Selesai": "bg-emerald-500/10 text-emerald-400 ring-emerald-500/30",
      "Barang Diserahkan": "bg-emerald-500/10 text-emerald-400 ring-emerald-500/30",
      "Dibatalkan": "bg-rose-500/10 text-rose-400 ring-rose-500/30",
    };
    const displayStatus = statusStr === "Waiting_Admin" ? "Menunggu Administrasi" : statusStr;
    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold ring-1 ${styleMap[statusStr] || "bg-zinc-800 text-zinc-400 ring-zinc-700"}`}>
        {displayStatus}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white md:text-3xl font-sans">Administrasi Transaksi</h2>
        <p className="text-xs text-zinc-400">Kelola formulir, validasi antrian, dan verifikasi berkas customer</p>
      </div>

      {/* Grid: Filters Box */}
      <div className="rounded-2xl border border-zinc-800 bg-[#121316] p-5 space-y-4">
        
        {/* Row 1: Search & Status */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="relative md:col-span-2">
            <SearchIcon className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari Nama, NIK, HP, No Transaksi atau Antrian..."
              className="w-full rounded-xl bg-zinc-900 border border-zinc-800 pl-11 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-gold-500 transition-all"
            />
          </div>

          <div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-2.5 text-xs text-white outline-none cursor-pointer"
            >
              <option value="">-- Semua Status --</option>
              <option value="Menunggu Administrasi">Menunggu Administrasi</option>
              <option value="Administrasi Selesai">Administrasi Selesai</option>
              <option value="Menunggu Penyerahan">Menunggu Penyerahan</option>
              <option value="Selesai">Selesai</option>
              <option value="Dibatalkan">Dibatalkan</option>
            </select>
          </div>

          <div>
            <select
              value={shiftId}
              onChange={(e) => setShiftId(e.target.value)}
              className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-2.5 text-xs text-white outline-none cursor-pointer"
            >
              <option value="">-- Semua Shift --</option>
              {shifts.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Gold, Payment & Dates */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-2.5 text-xs text-white outline-none cursor-pointer"
            >
              <option value="">-- Semua Produk Emas --</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={paymentMethodId}
              onChange={(e) => setPaymentMethodId(e.target.value)}
              className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-2.5 text-xs text-white outline-none cursor-pointer"
            >
              <option value="">-- Semua Pembayaran --</option>
              {paymentMethods.map(pm => (
                <option key={pm.id} value={pm.id}>{pm.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold text-zinc-500">Mulai</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-2 text-xs text-white outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold text-zinc-500">Sampai</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-2 text-xs text-white outline-none"
            />
          </div>
        </div>

      </div>

      {/* Layout Grid: Table list & Detail overlay */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        
        {/* Left: Transaction Table (8 cols or full if no selection) */}
        <div className={`rounded-2xl border border-zinc-800 bg-[#121316] overflow-hidden ${selectedTx ? "lg:col-span-7" : "lg:col-span-12"}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950/60 text-[10px] uppercase tracking-wider text-zinc-400 font-bold">
                  <th className="px-5 py-4">Antrian</th>
                  <th className="px-5 py-4">Nomor Transaksi</th>
                  <th className="px-5 py-4">Customer</th>
                  <th className="px-5 py-4">Metode Bayar</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-850">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-zinc-500">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-brand-blue-500" />
                      <span>Memuat data transaksi...</span>
                    </td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-zinc-500">
                      Tidak ada transaksi ditemukan.
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => {
                    const isCurrent = selectedTx?.id === tx.id;
                    return (
                      <tr 
                        key={tx.id} 
                        className={`hover:bg-zinc-800/20 transition-all ${isCurrent ? "bg-brand-blue-500/5 border-l-2 border-l-brand-blue-500" : ""}`}
                      >
                        <td className="px-5 py-4 font-bold text-brand-blue-500">{tx.queueNumber}</td>
                        <td className="px-5 py-4">
                          <span className="font-mono text-zinc-300 block">{tx.transactionNumber}</span>
                          <span className="text-[10px] text-zinc-500">{formatDate(tx.createdAt)}</span>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-bold text-white">{tx.customer.name}</p>
                          <p className="text-[10px] text-zinc-400">NIK: {tx.customer.nik}</p>
                        </td>
                        <td className="px-5 py-4 text-zinc-300 font-medium">{tx.paymentMethod.name}</td>
                        <td className="px-5 py-4">{getStatusBadge(tx.status)}</td>
                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={() => setSelectedTx(tx)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 transition-all"
                            title="Lihat Detail"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Detail Overlay Drawer (5 cols) */}
        {selectedTx && (
          <div className="lg:col-span-5 rounded-2xl border border-zinc-800 bg-[#121316] p-6 space-y-6 animate-slide-up self-start">
            
            {/* Header detail */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Detail Antrian</h3>
                <span className="text-[11px] font-mono text-zinc-400">{selectedTx.transactionNumber}</span>
              </div>
              <button 
                onClick={() => setSelectedTx(null)}
                className="text-xs text-zinc-500 hover:text-white rounded-lg p-1 bg-zinc-950 ring-1 ring-zinc-850"
              >
                Tutup
              </button>
            </div>

            {feedbackMsg && (
              <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-3 text-center text-xs font-semibold text-brand-blue-500">
                {feedbackMsg}
              </div>
            )}

            {/* Unified Copy Clipboard Widget */}
            <div className="rounded-xl bg-zinc-950 p-4 border border-zinc-850 space-y-3">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-brand-blue-500" />
                <span className="text-xs font-bold text-white">Fasilitas Salin Data (Clipboard)</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <button
                  onClick={() => copyToClipboard(selectedTx)}
                  className="flex items-center justify-center gap-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 py-2.5 font-semibold text-zinc-300 hover:text-white transition-all cursor-pointer"
                >
                  {copiedTxId === selectedTx.id ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      Salin Lengkap
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Salin Lengkap
                    </>
                  )}
                </button>
                <button
                  onClick={() => copyExcelRow(selectedTx)}
                  className="flex items-center justify-center gap-1.5 rounded-lg bg-brand-blue-500/10 border border-brand-blue-500/20 hover:border-brand-blue-500/40 py-2.5 font-semibold text-brand-blue-500 hover:text-brand-blue-400 transition-all cursor-pointer"
                >
                  {copiedExcelTxId === selectedTx.id ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      Tersalin!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Salin NIK, Nama, Alamat
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Customer profile */}
            <div className="space-y-3.5">
              <h4 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Identitas Customer</h4>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <span className="text-zinc-500">Nama</span>
                <span className="col-span-2 font-bold text-white">{selectedTx.customer.name}</span>

                <span className="text-zinc-500">NIK</span>
                <span className="col-span-2 font-mono text-zinc-300">{selectedTx.customer.nik}</span>

                <span className="text-zinc-500">Telepon</span>
                <span className="col-span-2 text-zinc-300">{selectedTx.customer.phone}</span>

                <span className="text-zinc-500">Alamat</span>
                <span className="col-span-2 text-zinc-300 leading-relaxed">{selectedTx.customer.address}</span>

                {selectedTx.customer.email && (
                  <>
                    <span className="text-zinc-500">Email</span>
                    <span className="col-span-2 text-zinc-300">{selectedTx.customer.email}</span>
                  </>
                )}
                {selectedTx.customer.notes && (
                  <>
                    <span className="text-zinc-500">Catatan</span>
                    <span className="col-span-2 text-zinc-400 italic">"{selectedTx.customer.notes}"</span>
                  </>
                )}
              </div>
            </div>

            {/* Product items order list */}
            <div className="space-y-3.5 border-t border-zinc-850 pt-4">
              <h4 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Daftar Logam Emas</h4>
              <div className="space-y-2">
                {selectedTx.items.map((item) => (
                  <div key={item.id} className="flex justify-between items-center bg-zinc-950 p-2.5 rounded-xl border border-zinc-850 text-xs">
                    <div>
                      <p className="font-bold text-white">{item.product.name}</p>
                      <p className="text-[10px] text-zinc-500">{formatWeight(item.product.weight)} @ {formatCurrency(item.price)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-zinc-200">x{item.qty} keping</p>
                      <p className="text-[10px] text-brand-red-500 font-semibold">{formatCurrency(item.price * item.qty)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Dynamic Status Workflow Actions */}
            <div className="space-y-3.5 border-t border-zinc-850 pt-4">
              <h4 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Alur Validasi</h4>
              <div className="flex flex-wrap gap-2">
                {/* Petugas Administrasi actions */}
                {selectedTx.status === "Menunggu Administrasi" && (
                  <button
                    onClick={() => executeAction("VERIFY_ADMIN")}
                    disabled={actionLoading}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-brand-gradient hover:opacity-95 py-2.5 text-xs font-bold text-white disabled:opacity-50 transition-all cursor-pointer"
                  >
                    Verifikasi Administrasi Selesai
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}

                {/* Petugas Penyerahan actions */}
                {selectedTx.status === "Menunggu Penyerahan" && (
                  <button
                    onClick={() => executeAction("CONFIRM_HANDOVER")}
                    disabled={actionLoading}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 py-2.5 text-xs font-bold text-zinc-950 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    Konfirmasi Penyerahan Emas
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </button>
                )}

                {/* Cancel action (Admin/Super Admin only) */}
                {["Menunggu Administrasi", "Menunggu Penyerahan", "Administrasi Selesai"].includes(selectedTx.status) && (
                  <button
                    onClick={cancelTransaction}
                    disabled={actionLoading}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-red-900/40 hover:text-red-400 px-3.5 py-2.5 text-xs font-bold text-zinc-400 transition-all cursor-pointer"
                  >
                    <Ban className="h-3.5 w-3.5" />
                    Batalkan
                  </button>
                )}

                {/* Status indicator on complete */}
                {selectedTx.status === "Selesai" && (
                  <div className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-950/20 text-emerald-400 ring-1 ring-emerald-500/20 rounded-xl py-2.5 text-xs font-bold">
                    <CheckCircle2 className="h-4 w-4" />
                    Transaksi Selesai & Diserahkan
                  </div>
                )}
                {selectedTx.status === "Dibatalkan" && (
                  <div className="flex-1 flex items-center justify-center gap-1.5 bg-rose-950/20 text-rose-400 ring-1 ring-rose-500/20 rounded-xl py-2.5 text-xs font-bold">
                    <XCircle className="h-4 w-4" />
                    Transaksi Telah Dibatalkan
                  </div>
                )}
              </div>
            </div>

            {/* Audit log flow */}
            <div className="space-y-3.5 border-t border-zinc-850 pt-4">
              <h4 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Histori Aktivitas</h4>
              <div className="space-y-3 max-h-[140px] overflow-y-auto pr-1 no-scrollbar">
                {selectedTx.auditLogs.map((log) => (
                  <div key={log.id} className="text-[10px] text-zinc-400 leading-relaxed border-l-2 border-zinc-800 pl-3">
                    <p className="text-zinc-500 font-mono">{formatDate(log.timestamp)}</p>
                    <p className="text-zinc-200">{log.details}</p>
                    {log.user && (
                      <p className="text-[9px] text-zinc-500">
                        Oleh: {log.user.name} ({log.shift?.name || "Shift"})
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
