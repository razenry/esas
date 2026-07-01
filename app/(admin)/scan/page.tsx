"use client";

import { useEffect, useState, useRef } from "react";
import { 
  QrCode, Camera, ShieldAlert, CheckCircle2, User, 
  MapPin, Phone, CreditCard, ShoppingBag, Copy, 
  Check, RefreshCw, AlertCircle, ClipboardCheck, Play, ArrowRight 
} from "lucide-react";
import { formatCurrency, formatDate, formatWeight, copyTextToClipboard } from "@/lib/utils";
import confetti from "canvas-confetti";

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

interface Session {
  userId: string;
  shiftId: string;
  roleName: string;
  userName: string;
  shiftName: string;
  permissions: string[];
}

export default function ScanPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [scannedTx, setScannedTx] = useState<Transaction | null>(null);
  const [manualCode, setManualCode] = useState("");
  
  // Webcam scanning
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const scannerRef = useRef<import("html5-qrcode").Html5Qrcode | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  
  // Anti-double scan state
  const [doubleScanWarning, setDoubleScanWarning] = useState<{
    officerName: string;
    timestamp: string;
    shiftName: string;
  } | null>(null);

  // Copy status
  const [copiedTxId, setCopiedTxId] = useState<string | null>(null);

  // Checklists states
  const [ktpChecked, setKtpChecked] = useState(false);
  const [paymentChecked, setPaymentChecked] = useState(false);
  const [handoverChecked, setHandoverChecked] = useState(false);

  // Load session
  const fetchSession = async () => {
    try {
      const res = await fetch("/api/auth/session");
      const data = await res.json();
      setSession(data.session);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchSession();
  }, []);

  // Web camera scanner lifecycle
  useEffect(() => {
    // Dynamic import to prevent Node compilation error on SSR
    if (cameraActive) {
      if (typeof window !== "undefined" && !window.isSecureContext) {
        setCameraError("Akses kamera diblokir oleh browser karena koneksi tidak aman (HTTP). Silakan gunakan input manual di bawah untuk pengujian lokal, atau gunakan HTTPS.");
        setCameraActive(false);
        return;
      }

      const { Html5Qrcode } = require("html5-qrcode");
      
      const qrScanner = new Html5Qrcode("reader");
      scannerRef.current = qrScanner;

      qrScanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText: string) => {
          // Success callback (decodedText should be the UUID)
          handleScanSuccess(decodedText);
          stopCamera();
        },
        (errorMessage: string) => {
          // Silent scan errors
        }
      ).catch((err: unknown) => {
        console.error("Camera startup failed:", err);
        setCameraError("Kamera tidak dapat diakses. Pastikan izin kamera telah diberikan.");
        setCameraActive(false);
      });
    }

    return () => {
      stopCamera();
    };
  }, [cameraActive]);

  const stopCamera = () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      scannerRef.current.stop().then(() => {
        scannerRef.current = null;
      }).catch((e: unknown) => console.error("Error stopping camera:", e));
    }
    setCameraActive(false);
  };

  // Retrieve transaction details after scan (UUID or code string)
  const handleScanSuccess = async (txId: string) => {
    setIsLoading(true);
    setErrorMsg("");
    setFeedbackMsg("");
    setDoubleScanWarning(null);
    setScannedTx(null);
    
    // Reset checklists
    setKtpChecked(false);
    setPaymentChecked(false);
    setHandoverChecked(false);

    try {
      const res = await fetch(`/api/transactions/${txId}`);
      const data = await res.json();

      if (!res.ok) {
        // Check if double scan conflict
        if (data.error === "DOUBLE_SCAN") {
          setDoubleScanWarning(data.handoverDetails);
          // Fetch partial details to show who
          const txRes = await fetch(`/api/transactions/${txId}`);
          // Wait, if it failed on status 409 we can query it again without actions
        } else {
          setErrorMsg(data.error || "Transaksi tidak ditemukan.");
        }
      } else {
        setScannedTx(data.transaction);
        // If status is complete already, show warning
        if (data.transaction.status === "Selesai" || data.transaction.status === "Barang Diserahkan") {
          // Find handover details from audit logs
          const handoverLog = data.transaction.auditLogs.find((l: { action: string }) => l.action === "CONFIRM_HANDOVER");
          setDoubleScanWarning({
            officerName: handoverLog?.user?.name || "Petugas Penyerahan",
            timestamp: handoverLog?.timestamp || data.transaction.updatedAt,
            shiftName: handoverLog?.shift?.name || "Shift Terkait",
          });
        }
      }
    } catch (e) {
      setErrorMsg("Koneksi server gagal.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSearch = () => {
    if (!manualCode.trim()) return;
    handleScanSuccess(manualCode.trim());
  };

  // Perform State validation
  const executeAction = async (action: string) => {
    if (!scannedTx) return;

    // Checklists client-side validation
    if (action === "VERIFY_ADMIN" && !ktpChecked) {
      setErrorMsg("Harap centang verifikasi KTP fisik customer terlebih dahulu.");
      return;
    }
    if (action === "CONFIRM_HANDOVER" && (!paymentChecked || !handoverChecked)) {
      setErrorMsg("Harap centang validasi bukti pembayaran dan berita acara serah terima terlebih dahulu.");
      return;
    }

    setActionLoading(true);
    setFeedbackMsg("");
    setErrorMsg("");

    try {
      const res = await fetch(`/api/transactions/${scannedTx.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.error === "DOUBLE_SCAN") {
          setDoubleScanWarning(data.handoverDetails);
        } else {
          setErrorMsg(data.error || "Gagal memproses tindakan.");
        }
      } else {
        setFeedbackMsg(
          action === "VERIFY_ADMIN"
            ? "Verifikasi administrasi sukses! Status: Menunggu Penyerahan."
            : "Emas berhasil diserahkan! Transaksi Selesai."
        );
        
        // Celebration confetti on gold handover!
        if (action === "CONFIRM_HANDOVER") {
          confetti({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.6 },
            colors: ["#d4af37", "#ffffff", "#eed270"],
          });
        }

        // Reload details of this tx
        handleScanSuccess(scannedTx.id);
      }
    } catch (e) {
      setErrorMsg("Koneksi gagal.");
    } finally {
      setActionLoading(false);
    }
  };

  // Google Docs format helper
  const copyToClipboard = (tx: Transaction) => {
    const goldItemsText = tx.items
      .map(item => `${item.product.name} (x${item.qty})`)
      .join(", ");
    
    const textToCopy = `NO_TX\t${tx.transactionNumber}\nNO_ANTRIAN\t${tx.queueNumber}\nNAMA\t${tx.customer.name}\nNIK\t${tx.customer.nik}\nHP\t${tx.customer.phone}\nALAMAT\t${tx.customer.address}\nEMAS\t${goldItemsText}\nPEMBAYARAN\t${tx.paymentMethod.name}\nTANGGAL\t${formatDate(tx.createdAt)}`;
    
    copyTextToClipboard(textToCopy);
    setCopiedTxId(tx.id);
    setTimeout(() => setCopiedTxId(null), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white md:text-3xl font-sans">Terminal Pemindaian QR</h2>
        <p className="text-xs text-zinc-400">Pindai QR Code antrian customer untuk memproses administrasi dan penyerahan barang</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        
        {/* Left Column: QR scanner, Camera, and simulator selector (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="rounded-2xl border border-zinc-800 bg-[#121316] p-6 space-y-4">
            {/* Camera Scanner Content */}
            <div className="space-y-4 flex flex-col items-center">
              {cameraError && (
                <div className="w-full rounded-xl bg-red-950/40 border border-red-500/20 p-3 text-center text-xs text-red-400 animate-pulse">
                  {cameraError}
                </div>
              )}

              <div className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-black border border-zinc-800 flex items-center justify-center aspect-square">
                {cameraActive ? (
                  <div id="reader" className="w-full h-full" />
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-6 text-zinc-500">
                    <Camera className="h-10 w-10 text-zinc-600 mb-2" />
                    <span className="text-xs">Kamera tidak aktif</span>
                  </div>
                )}
              </div>

              <div className="flex w-full gap-2">
                {cameraActive ? (
                  <button
                    onClick={stopCamera}
                    className="w-full rounded-xl bg-zinc-900 border border-zinc-800 py-2.5 text-xs font-semibold text-zinc-300 hover:text-white cursor-pointer"
                  >
                    Hentikan Kamera
                  </button>
                ) : (
                  <button
                    onClick={() => { setCameraActive(true); setCameraError(""); }}
                    className="w-full rounded-xl bg-gold-gradient py-2.5 text-xs font-bold text-black cursor-pointer"
                  >
                    Aktifkan Kamera QR
                  </button>
                )}
              </div>
            </div>

              {/* Manual Input Fallback */}
              <div className="border-t border-zinc-800/80 pt-4 flex gap-2">
                <input
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Atau input UUID / No Transaksi..."
                  className="flex-1 rounded-xl bg-zinc-900 border border-zinc-800 px-3.5 py-2 text-xs text-white placeholder-zinc-500 outline-none focus:border-gold-500"
                />
                <button
                  onClick={handleManualSearch}
                  className="rounded-xl bg-zinc-900 border border-zinc-850 hover:border-zinc-700 px-4 py-2 text-xs font-semibold text-zinc-300 hover:text-white"
                >
                  Cari
                </button>
              </div>
            </div>
          </div>

        {/* Right Column: Transaction display and validation console (7 cols) */}
        <div className="lg:col-span-7 rounded-2xl border border-zinc-800 bg-[#121316] p-6 flex flex-col min-h-[480px]">
          
          {/* Double Scan Blocking Alert */}
          {doubleScanWarning && (
            <div className="mb-6 rounded-2xl border border-rose-500/20 bg-rose-950/20 p-5 text-rose-400 flex items-start gap-4 animate-slide-up">
              <ShieldAlert className="h-6 w-6 text-rose-500 shrink-0 mt-0.5" />
              <div className="space-y-1.5 text-xs leading-relaxed">
                <h4 className="font-extrabold text-sm text-rose-300">Barang Sudah Pernah Diserahkan!</h4>
                <p className="text-rose-400">
                  QR Code transaksi ini telah berhasil diproses sebelumnya. Sistem melarang penyerahan ganda (Anti-Double Scan).
                </p>
                <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 rounded-lg bg-zinc-950/50 p-3 ring-1 ring-rose-500/10 text-[11px] text-zinc-400 font-medium">
                  <span>Petugas Penyerah:</span>
                  <strong className="text-white">{doubleScanWarning.officerName}</strong>
                  <span>Tanggal & Jam:</span>
                  <strong className="text-white">{formatDate(doubleScanWarning.timestamp)}</strong>
                  <span>Shift Tugas:</span>
                  <strong className="text-white">{doubleScanWarning.shiftName}</strong>
                </div>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-brand-blue-500 mb-2" />
              <span className="text-xs text-zinc-400">Mengambil detail transaksi...</span>
            </div>
          ) : errorMsg ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-8 w-8 text-red-500 mb-2" />
              <p className="text-xs text-red-400 font-semibold">{errorMsg}</p>
            </div>
          ) : !scannedTx ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 text-center text-zinc-500">
              <QrCode className="h-12 w-12 text-zinc-700 mb-3" />
              <h4 className="text-sm font-bold text-zinc-400">Menunggu Pemindaian QR Code</h4>
              <p className="text-[11px] text-zinc-500 max-w-sm mt-1">
                Pindai QR code antrian customer pada scanner atau gunakan simulator di sebelah kiri untuk memproses validasi berkas.
              </p>
            </div>
          ) : (
            /* TRANSACTION CONTENT IS LOADED */
            <div className="space-y-6 animate-slide-up flex-1 flex flex-col justify-between">
              
              <div className="space-y-5">
                {/* Header details */}
                <div className="flex justify-between items-start border-b border-zinc-800 pb-4">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-zinc-500">Nomor Antrian</span>
                    <h3 className="text-3xl font-extrabold text-brand-gradient tracking-tight">{scannedTx.queueNumber}</h3>
                    <code className="text-[10px] font-mono text-zinc-400 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-850 mt-1 inline-block">
                      {scannedTx.transactionNumber}
                    </code>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-zinc-500 block">Status Transaksi</span>
                    <span className="inline-block mt-1.5 rounded-full bg-zinc-900 border border-zinc-800 px-3 py-1 text-xs font-semibold text-white">
                      {scannedTx.status === "Waiting_Admin" ? "Menunggu Administrasi" : scannedTx.status}
                    </span>
                  </div>
                </div>

                {feedbackMsg && (
                  <div className="rounded-xl bg-zinc-900 border border-zinc-850 p-2.5 text-center text-xs font-semibold text-emerald-400">
                    {feedbackMsg}
                  </div>
                )}

                {/* Google Docs Helper Widget */}
                <div className="rounded-xl bg-zinc-950 p-3.5 border border-zinc-850 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <ClipboardCheck className="h-5 w-5 text-brand-blue-500" />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-white">Salin Berkas Administrasi</span>
                      <span className="text-[10px] text-zinc-500">Salin detail transaksi untuk rekap sheets</span>
                    </div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(scannedTx)}
                    className="flex items-center gap-1 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:text-white transition-all cursor-pointer"
                  >
                    {copiedTxId === scannedTx.id ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                        Tersalin
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Salin
                      </>
                    )}
                  </button>
                </div>

                {/* Customer Profiling */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-xl bg-zinc-900/60 p-4 border border-zinc-800/80 space-y-2.5">
                    <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Customer Profile</h4>
                    <div className="text-xs space-y-1.5">
                      <p className="text-white"><strong className="text-zinc-500">Nama:</strong> {scannedTx.customer.name}</p>
                      <p className="text-zinc-300"><strong className="text-zinc-500">NIK:</strong> {scannedTx.customer.nik}</p>
                      <p className="text-zinc-300"><strong className="text-zinc-500">HP:</strong> {scannedTx.customer.phone}</p>
                      <p className="text-zinc-300 leading-relaxed"><strong className="text-zinc-500">Alamat:</strong> {scannedTx.customer.address}</p>
                    </div>
                  </div>

                  <div className="rounded-xl bg-zinc-900/60 p-4 border border-zinc-800/80 space-y-2.5">
                    <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Pesanan Emas</h4>
                    <div className="space-y-1.5 text-xs max-h-[100px] overflow-y-auto no-scrollbar">
                      {scannedTx.items.map(item => (
                        <div key={item.id} className="flex justify-between font-medium">
                          <span className="text-zinc-300">{item.product.name} (x{item.qty})</span>
                          <span className="text-white font-bold">{formatCurrency(item.price * item.qty)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-zinc-800 pt-2 flex justify-between text-xs font-bold">
                      <span className="text-zinc-400">Total: {scannedTx.paymentMethod.name}</span>
                      <span className="text-brand-red-500">
                        {formatCurrency(scannedTx.items.reduce((acc, curr) => acc + (curr.qty * curr.price), 0))}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Validation checklist card */}
                {(!doubleScanWarning) && (
                  <div className="rounded-xl bg-zinc-900/60 p-4 border border-zinc-800/80 space-y-3">
                    <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Daftar Pemeriksaan Petugas</h4>
                    
                    <div className="space-y-2">
                      {/* Admin validation steps */}
                      {(session?.roleName === "Petugas Administrasi" || session?.roleName === "Super Admin" || session?.roleName === "Admin Booth") && (
                        <label className="flex items-center gap-3 text-xs text-zinc-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={ktpChecked}
                            onChange={(e) => setKtpChecked(e.target.checked)}
                            className="h-4.5 w-4.5 rounded bg-zinc-950 border-zinc-800 text-brand-blue-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                          />
                          <span>Verifikasi KTP Fisik Asli & NIK cocok</span>
                        </label>
                      )}

                      {/* Penyerahan validation steps */}
                      {(session?.roleName === "Petugas Penyerahan" || session?.roleName === "Super Admin" || session?.roleName === "Admin Booth") && (
                        <>
                          <label className="flex items-center gap-3 text-xs text-zinc-300 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={paymentChecked}
                              onChange={(e) => setPaymentChecked(e.target.checked)}
                              className="h-4.5 w-4.5 rounded bg-zinc-950 border-zinc-800 text-brand-blue-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                            />
                            <span>Validasi kecocokan bukti pembayaran ({scannedTx.paymentMethod.name})</span>
                          </label>
                          <label className="flex items-center gap-3 text-xs text-zinc-300 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={handoverChecked}
                              onChange={(e) => setHandoverChecked(e.target.checked)}
                              className="h-4.5 w-4.5 rounded bg-zinc-950 border-zinc-800 text-brand-blue-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                            />
                            <span>Tanda Tangan Surat Berita Acara Penyerahan Emas</span>
                          </label>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-8 flex justify-end gap-3">
                {doubleScanWarning ? (
                  <button
                    disabled
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-zinc-850 py-3 text-xs font-bold text-zinc-500 border border-zinc-800"
                  >
                    Antrian Sudah Selesai Diproses (Anti-Double Scan)
                  </button>
                ) : (
                  <>
                    {/* Petugas Administrasi verification action */}
                    {(session?.roleName === "Petugas Administrasi" || session?.roleName === "Super Admin" || session?.roleName === "Admin Booth") && (
                      <button
                        onClick={() => executeAction("VERIFY_ADMIN")}
                        disabled={actionLoading || (scannedTx.status !== "Menunggu Administrasi" && scannedTx.status !== "Waiting_Admin")}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-brand-gradient py-3 text-xs font-bold text-white transition-all hover:opacity-95 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                      >
                        {actionLoading ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            Verifikasi Administrasi Selesai
                            <ArrowRight className="h-3.5 w-3.5" />
                          </>
                        )}
                      </button>
                    )}

                    {/* Petugas Penyerahan verification action */}
                    {(session?.roleName === "Petugas Penyerahan" || session?.roleName === "Super Admin" || session?.roleName === "Admin Booth") && (
                      <button
                        onClick={() => executeAction("CONFIRM_HANDOVER")}
                        disabled={actionLoading || (scannedTx.status !== "Menunggu Penyerahan" && scannedTx.status !== "Administrasi Selesai")}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-450 py-3 text-xs font-bold text-zinc-950 transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                      >
                        {actionLoading ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            Konfirmasi Penyerahan Emas
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </>
                        )}
                      </button>
                    )}
                  </>
                )}
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
}
