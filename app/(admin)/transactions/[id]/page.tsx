"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, FileText, ClipboardCheck, Clock, CheckCircle2, 
  XCircle, Copy, Check, ChevronRight, Ban, RefreshCw 
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

export default function TransactionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);

  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState("");

  const loadTransaction = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/transactions/${id}`);
      if (!res.ok) {
        throw new Error("Transaksi tidak ditemukan.");
      }
      const data = await res.json();
      setTransaction(data.transaction);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Gagal memuat transaksi.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTransaction();
  }, [id]);

  const copyToClipboard = () => {
    if (!transaction) return;
    const goldItemsText = transaction.items
      .map(item => `${item.product.name} (x${item.qty})`)
      .join(", ");
    
    const textToCopy = `NO_TX\t${transaction.transactionNumber}\nNO_ANTRIAN\t${transaction.queueNumber}\nNAMA\t${transaction.customer.name}\nNIK\t${transaction.customer.nik}\nHP\t${transaction.customer.phone}\nALAMAT\t${transaction.customer.address}\nEMAS\t${goldItemsText}\nPEMBAYARAN\t${transaction.paymentMethod.name}\nTANGGAL\t${formatDate(transaction.createdAt)}`;
    
    copyTextToClipboard(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const executeAction = async (action: string) => {
    if (!transaction) return;
    setActionLoading(true);
    setFeedbackMsg("");
    try {
      const res = await fetch(`/api/transactions/${transaction.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const resData = await res.json();

      if (!res.ok) {
        setFeedbackMsg(resData.error || "Gagal mengubah status.");
      } else {
        setFeedbackMsg("Status transaksi berhasil diubah!");
        loadTransaction();
      }
    } catch (e) {
      setFeedbackMsg("Kesalahan koneksi.");
    } finally {
      setActionLoading(false);
    }
  };

  const cancelTransaction = async () => {
    if (!transaction) return;
    setActionLoading(true);
    setFeedbackMsg("");
    try {
      const res = await fetch(`/api/transactions/${transaction.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Dibatalkan" }),
      });
      const resData = await res.json();

      if (!res.ok) {
        setFeedbackMsg(resData.error || "Gagal membatalkan transaksi.");
      } else {
        setFeedbackMsg("Transaksi dibatalkan.");
        loadTransaction();
      }
    } catch (e) {
      setFeedbackMsg("Kesalahan koneksi.");
    } finally {
      setActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-brand-blue-500" />
          <span className="text-sm text-zinc-400">Memuat rincian transaksi...</span>
        </div>
      </div>
    );
  }

  if (error || !transaction) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <p className="text-red-400 font-semibold">{error || "Transaksi tidak ditemukan."}</p>
        <Link 
          href="/transactions"
          className="flex items-center gap-1.5 rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-2 text-xs text-white hover:bg-zinc-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Transaksi
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Navigation & Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/transactions"
          className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-all"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Daftar Transaksi
        </Link>
        <div className="flex items-center gap-2 text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
          <span>Transactions</span>
          <ChevronRight className="h-3 w-3" />
          <span className="text-zinc-400 font-mono">{transaction.transactionNumber}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column: Info & items (2 cols) */}
        <div className="md:col-span-2 space-y-6">
          {/* Card: Customer Info */}
          <div className="rounded-2xl border border-zinc-800 bg-[#121316] p-6 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider pb-3 border-b border-zinc-850">
              Identitas Customer
            </h3>
            
            <div className="grid grid-cols-3 gap-3 text-xs leading-relaxed">
              <span className="text-zinc-500">Nama Lengkap</span>
              <span className="col-span-2 font-bold text-white">{transaction.customer.name}</span>

              <span className="text-zinc-500">NIK (KTP)</span>
              <span className="col-span-2 font-mono text-zinc-300">{transaction.customer.nik}</span>

              <span className="text-zinc-500">Nomor Telepon</span>
              <span className="col-span-2 text-zinc-300">{transaction.customer.phone}</span>

              <span className="text-zinc-500">Alamat Domisili</span>
              <span className="col-span-2 text-zinc-300">{transaction.customer.address}</span>

              {transaction.customer.email && (
                <>
                  <span className="text-zinc-500">Email</span>
                  <span className="col-span-2 text-zinc-300">{transaction.customer.email}</span>
                </>
              )}
              {transaction.customer.notes && (
                <>
                  <span className="text-zinc-500">Catatan Khusus</span>
                  <span className="col-span-2 text-zinc-400 italic">"{transaction.customer.notes}"</span>
                </>
              )}
            </div>
          </div>

          {/* Card: Items Order */}
          <div className="rounded-2xl border border-zinc-800 bg-[#121316] p-6 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider pb-3 border-b border-zinc-850">
              Daftar Pembelian Logam Emas
            </h3>

            <div className="space-y-3">
              {transaction.items.map((item) => (
                <div key={item.id} className="flex justify-between items-center bg-zinc-950 p-4 rounded-xl border border-zinc-850 text-xs">
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

            <div className="flex justify-between items-center pt-3 border-t border-zinc-850 text-xs">
              <span className="text-zinc-400 font-medium">Metode Pembayaran: <strong className="text-white">{transaction.paymentMethod.name}</strong></span>
              <div className="text-right">
                <span className="text-[10px] text-zinc-500 block">Total Transaksi</span>
                <span className="text-base font-bold text-brand-gradient">
                  {formatCurrency(transaction.items.reduce((acc, curr) => acc + (curr.qty * curr.price), 0))}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Workflow status & logs (1 col) */}
        <div className="space-y-6">
          
          {/* Card: Queue Code Panel */}
          <div className="rounded-2xl border border-brand-blue-500/20 bg-gradient-to-br from-zinc-950 to-zinc-900 p-6 text-center">
            <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Nomor Antrian</span>
            <div className="text-5xl font-extrabold text-brand-gradient tracking-tight mt-1">
              {transaction.queueNumber}
            </div>
            <div className="mt-3 inline-flex items-center rounded-full bg-zinc-900 px-3 py-1 ring-1 ring-zinc-800 text-[10px] text-zinc-300 font-mono">
              {transaction.status === "Waiting_Admin" ? "Menunggu Administrasi" : transaction.status}
            </div>
          </div>

          {/* Card: Workflow Action */}
          <div className="rounded-2xl border border-zinc-800 bg-[#121316] p-6 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Validasi Petugas</h3>
            
            {feedbackMsg && (
              <div className="rounded-xl bg-zinc-900 border border-zinc-850 p-2.5 text-center text-xs font-semibold text-brand-blue-500">
                {feedbackMsg}
              </div>
            )}

            <div className="flex flex-col gap-2.5">
              {/* Copy data button */}
              <button
                onClick={copyToClipboard}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-950 border border-zinc-850 hover:border-zinc-700 py-3 text-xs font-semibold text-zinc-300 hover:text-white transition-all cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-400" />
                    Data KTP Tersalin!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Salin ke Google Docs
                  </>
                )}
              </button>

              {/* Action buttons */}
              {(transaction.status === "Menunggu Administrasi" || transaction.status === "Waiting_Admin") && (
                <button
                  onClick={() => executeAction("VERIFY_ADMIN")}
                  disabled={actionLoading}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand-gradient hover:opacity-95 py-3 text-xs font-bold text-white disabled:opacity-50 transition-all cursor-pointer"
                >
                  Verifikasi Administrasi Selesai
                </button>
              )}

              {transaction.status === "Menunggu Penyerahan" && (
                <button
                  onClick={() => executeAction("CONFIRM_HANDOVER")}
                  disabled={actionLoading}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-450 py-3 text-xs font-bold text-zinc-950 disabled:opacity-50 transition-all cursor-pointer"
                >
                  Konfirmasi Penyerahan Emas
                </button>
              )}

              {/* Cancel Button */}
              {(["Menunggu Administrasi", "Menunggu Penyerahan", "Administrasi Selesai"].includes(transaction.status) || transaction.status === "Waiting_Admin") && (
                <button
                  onClick={cancelTransaction}
                  disabled={actionLoading}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-zinc-900 border border-zinc-850 hover:bg-red-950/20 hover:text-red-400 py-3 text-xs font-bold text-zinc-400 transition-all cursor-pointer"
                >
                  <Ban className="h-4 w-4" />
                  Batalkan Transaksi
                </button>
              )}
            </div>
          </div>

          {/* Card: Audit Trail */}
          <div className="rounded-2xl border border-zinc-800 bg-[#121316] p-6 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Histori Aktivitas</h3>
            <div className="space-y-3.5 max-h-[220px] overflow-y-auto pr-1 no-scrollbar text-xs">
              {transaction.auditLogs.map((log) => (
                <div key={log.id} className="border-l-2 border-zinc-800 pl-3.5 leading-relaxed space-y-0.5">
                  <span className="text-[10px] text-zinc-500 block font-mono">{formatDate(log.timestamp)}</span>
                  <p className="text-zinc-300 font-medium">{log.details}</p>
                  {log.user && (
                    <span className="text-[9px] text-zinc-500 block">
                      Oleh: {log.user.name} ({log.shift?.name || "Shift"})
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
