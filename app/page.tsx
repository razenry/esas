"use client";

import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  Sparkles, CheckCircle2, ShoppingBag, CreditCard, User, 
  MapPin, Phone, Mail, FileText, ArrowRight, Plus, Minus, Download, RefreshCw 
} from "lucide-react";
import { formatCurrency, formatWeight } from "@/lib/utils";


// Form validation schema
const formSchema = z.object({
  name: z.string().min(1, "Nama lengkap wajib diisi"),
  nik: z.string()
    .length(16, "NIK harus tepat 16 digit")
    .regex(/^\d+$/, "NIK harus berupa angka"),
  address: z.string().min(1, "Alamat wajib diisi"),
  phone: z.string()
    .min(10, "Nomor HP minimal 10 digit")
    .regex(/^\+?[\d\s-]+$/, "Nomor HP tidak valid"),
  email: z.string().email("Format email tidak valid").optional().or(z.literal("")),
  notes: z.string().optional(),
  paymentMethodId: z.string().min(1, "Metode pembayaran wajib dipilih"),
});

interface Product {
  id: string;
  name: string;
  weight: number;
  price: number;
  isActive: boolean;
}

interface PaymentMethod {
  id: string;
  name: string;
  isActive: boolean;
}

export default function CustomerPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successData, setSuccessData] = useState<{
    transactionId: string;
    transactionNumber: string;
    queueNumber: string;
    customerName: string;
  } | null>(null);

  // Initialize form
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      nik: "",
      address: "",
      phone: "",
      email: "",
      notes: "",
      paymentMethodId: "",
    },
  });

  const formValues = watch();

  // Load products and payment methods
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prodRes, pmRes] = await Promise.all([
          fetch("/api/products"),
          fetch("/api/payment-methods"),
        ]);
        const prodData = await prodRes.json();
        const pmData = await pmRes.json();

        if (prodData.products) {
          setProducts(prodData.products.filter((p: Product) => p.isActive));
        }
        if (pmData.paymentMethods) {
          setPaymentMethods(pmData.paymentMethods.filter((pm: PaymentMethod) => pm.isActive));
        }
      } catch (e) {
        console.error("Error loading form options:", e);
      }
    };
    fetchData();
  }, []);

  // Form Auto-save to Local Storage
  useEffect(() => {
    const savedDraft = localStorage.getItem("sbas_customer_form_draft");
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        Object.entries(draft.fields || {}).forEach(([key, value]) => {
          setValue(key as keyof z.infer<typeof formSchema>, value as string);
        });
        if (draft.selectedProducts) {
          setSelectedProducts(draft.selectedProducts);
        }
      } catch (e) {
        console.error("Failed to parse saved draft:", e);
      }
    }
  }, [setValue]);

  // Save changes to local storage on input changes
  useEffect(() => {
    if (successData) return; // Don't save if already succeeded
    const draft = {
      fields: formValues,
      selectedProducts,
    };
    localStorage.setItem("sbas_customer_form_draft", JSON.stringify(draft));
  }, [formValues, selectedProducts, successData]);

  // Product Qty Actions
  const handleQuantityChange = (productId: string, val: number) => {
    setSelectedProducts((prev) => {
      const next = { ...prev };
      const current = next[productId] || 0;
      const newQty = current + val;
      if (newQty <= 0) {
        delete next[productId];
      } else {
        next[productId] = newQty;
      }
      return next;
    });
  };

  // Calculate live total price
  const calculateTotal = () => {
    let total = 0;
    Object.entries(selectedProducts).forEach(([prodId, qty]) => {
      const prod = products.find((p) => p.id === prodId);
      if (prod) {
        total += prod.price * qty;
      }
    });
    return total;
  };

  // Form Submit Handler
  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    // Validate that at least 1 product is selected
    const productItems = Object.entries(selectedProducts).map(([productId, qty]) => ({
      productId,
      qty,
    }));

    if (productItems.length === 0) {
      setErrorMessage("Silakan pilih minimal 1 produk emas Sima.");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: {
            name: data.name,
            nik: data.nik,
            address: data.address,
            phone: data.phone,
            email: data.email || undefined,
            notes: data.notes || undefined,
          },
          paymentMethodId: data.paymentMethodId,
          items: productItems,
        }),
      });

      const responseData = await res.json();

      if (!res.ok) {
        setErrorMessage(responseData.error || "Gagal membuat transaksi.");
      } else {
        // Success
        setSuccessData({
          transactionId: responseData.transactionId,
          transactionNumber: responseData.transactionNumber,
          queueNumber: responseData.queueNumber,
          customerName: data.name,
        });
        // Clear Local Storage draft
        localStorage.removeItem("sbas_customer_form_draft");
        setSelectedProducts({});
        reset();
      }
    } catch (e) {
      setErrorMessage("Terjadi kesalahan koneksi server.");
    } finally {
      setIsLoading(false);
    }
  };

  const resetAfterSuccess = () => {
    setSuccessData(null);
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-brand-blue-500 selection:text-white transition-colors duration-200">
      {/* Premium Header */}
      <header className="relative border-b border-border bg-card/80 px-6 py-5 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-gradient shadow-lg shadow-brand-blue-500/20">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-foreground md:text-xl">
                SIMA <span className="text-brand-red-500">BOOTH</span>
              </h1>
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Administration System</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-card px-3.5 py-1.5 text-xs font-semibold text-brand-red-500 ring-1 ring-brand-blue-500/25">
              Event Exhibition Mode
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-6xl px-4 py-8 md:py-12">
        {successData ? (
          /* SUCCESS RECEIPT VIEW */
          <div className="mx-auto max-w-lg animate-slide-up rounded-3xl bg-card p-6 shadow-2xl ring-1 ring-brand-blue-500/30 border border-border md:p-8">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-950/50 text-emerald-400 ring-1 ring-emerald-500/30">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <h2 className="text-2xl font-bold text-foreground md:text-3xl">Registrasi Berhasil!</h2>
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                Silakan tunjukkan QR Code atau Nomor Antrian ini kepada Petugas Administrasi di booth.
              </p>
            </div>

            {/* Queue Receipt Block */}
            <div className="relative mt-8 overflow-hidden rounded-2xl bg-background border border-border p-6">
              {/* Decorative border cutouts */}
              <div className="absolute -left-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-card" />
              <div className="absolute -right-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-card" />
              <div className="absolute left-6 right-6 top-1/2 border-t border-dashed border-zinc-800" />

              {/* Upper half - Queue details */}
              <div className="pb-8 text-center border-b border-dashed border-border">
                <p className="text-xs uppercase tracking-widest text-zinc-500">Nomor Antrian Anda</p>
                <div className="mt-2 text-6xl font-extrabold text-brand-gradient tracking-tight">
                  {successData.queueNumber}
                </div>
                <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                  Nama Customer: <strong className="text-foreground">{successData.customerName}</strong>
                </p>
              </div>

              {/* Lower half - Transaction & QR details */}
              <div className="pt-8 flex flex-col items-center">
                <p className="text-xs uppercase tracking-widest text-zinc-500">Nomor Transaksi</p>
                <code className="mt-1 rounded bg-card px-3 py-1 text-sm font-mono text-foreground ring-1 ring-border">
                  {successData.transactionNumber}
                </code>

                {/* QR Code Container */}
                <div className="mt-6 rounded-2xl bg-white p-4 shadow-lg">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${successData.transactionId}`}
                    alt="Transaction QR Code"
                    className="h-44 w-44"
                  />
                </div>
                <span className="mt-2 text-[10px] text-zinc-500">SCAN QR UNTUK VALIDASI KTP & BARANG</span>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-8 flex flex-col gap-3">
              <button
                onClick={() => window.print()}
                className="flex items-center justify-center gap-2 rounded-xl bg-card hover:bg-background border border-border py-3 text-sm font-semibold text-foreground transition-all"
              >
                <Download className="h-4 w-4" />
                Cetak / Simpan Bukti
              </button>
              <button
                onClick={resetAfterSuccess}
                className="flex items-center justify-center gap-2 rounded-xl bg-brand-gradient hover:opacity-95 py-3 text-sm font-semibold text-white transition-all"
              >
                Buat Formulir Baru
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          /* FORM FILLING VIEW */
          <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            
            {/* Left Column: Form & Payment (7 cols) */}
            <div className="space-y-8 lg:col-span-7">
              {errorMessage && (
                <div className="rounded-xl bg-red-950/40 border border-red-500/20 p-4 text-sm text-red-400">
                  {errorMessage}
                </div>
              )}

              {/* Step 1: Customer Info */}
              <div className="rounded-3xl bg-card border border-border p-6 md:p-8">
                <div className="mb-6 flex items-center gap-3 border-b border-border pb-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-blue-500/10 text-brand-blue-500">
                    <User className="h-4 w-4" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground">1. Data Diri Customer</h2>
                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Nama Lengkap *</label>
                    <input
                      {...register("name")}
                      placeholder="Masukkan nama sesuai KTP"
                      className="rounded-xl bg-background border border-border px-4 py-3 text-sm text-foreground placeholder-zinc-400 dark:placeholder-zinc-500 outline-none focus:border-brand-blue-500 focus:ring-1 focus:ring-brand-blue-500 transition-all"
                    />
                    {errors.name && <span className="text-[11px] text-red-500 dark:text-red-400">{errors.name.message}</span>}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">NIK (Nomor Induk Kependudukan) *</label>
                    <input
                      {...register("nik")}
                      maxLength={16}
                      placeholder="16 Digit NIK KTP Anda"
                      className="rounded-xl bg-background border border-border px-4 py-3 text-sm text-foreground placeholder-zinc-400 dark:placeholder-zinc-500 outline-none focus:border-brand-blue-500 focus:ring-1 focus:ring-brand-blue-500 transition-all"
                    />
                    {errors.nik && <span className="text-[11px] text-red-500 dark:text-red-400">{errors.nik.message}</span>}
                  </div>

                  <div className="flex flex-col gap-1.5 md:col-span-2">
                    <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Alamat Lengkap *</label>
                    <textarea
                      {...register("address")}
                      rows={2}
                      placeholder="Alamat domisili lengkap"
                      className="rounded-xl bg-background border border-border px-4 py-3 text-sm text-foreground placeholder-zinc-400 dark:placeholder-zinc-500 outline-none focus:border-brand-blue-500 focus:ring-1 focus:ring-brand-blue-500 transition-all resize-none"
                    />
                    {errors.address && <span className="text-[11px] text-red-500 dark:text-red-400">{errors.address.message}</span>}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Nomor HP / WhatsApp *</label>
                    <input
                      {...register("phone")}
                      placeholder="Contoh: 08123456789"
                      className="rounded-xl bg-background border border-border px-4 py-3 text-sm text-foreground placeholder-zinc-400 dark:placeholder-zinc-500 outline-none focus:border-brand-blue-500 focus:ring-1 focus:ring-brand-blue-500 transition-all"
                    />
                    {errors.phone && <span className="text-[11px] text-red-500 dark:text-red-400">{errors.phone.message}</span>}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Email (Opsional)</label>
                    <input
                      {...register("email")}
                      placeholder="customer@domain.com"
                      className="rounded-xl bg-background border border-border px-4 py-3 text-sm text-foreground placeholder-zinc-400 dark:placeholder-zinc-500 outline-none focus:border-brand-blue-500 focus:ring-1 focus:ring-brand-blue-500 transition-all"
                    />
                    {errors.email && <span className="text-[11px] text-red-500 dark:text-red-400">{errors.email.message}</span>}
                  </div>

                  <div className="flex flex-col gap-1.5 md:col-span-2">
                    <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Catatan Tambahan (Opsional)</label>
                    <input
                      {...register("notes")}
                      placeholder="Tambahkan catatan khusus transaksi bila ada"
                      className="rounded-xl bg-background border border-border px-4 py-3 text-sm text-foreground placeholder-zinc-400 dark:placeholder-zinc-500 outline-none focus:border-brand-blue-500 focus:ring-1 focus:ring-brand-blue-500 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Step 2: Payment Method */}
              <div className="rounded-3xl bg-card border border-border p-6 md:p-8">
                <div className="mb-6 flex items-center gap-3 border-b border-border pb-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-blue-500/10 text-brand-blue-500">
                    <CreditCard className="h-4 w-4" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground">2. Metode Pembayaran</h2>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {paymentMethods.map((pm) => {
                    const isSelected = formValues.paymentMethodId === pm.id;
                    return (
                      <button
                        key={pm.id}
                        type="button"
                        onClick={() => setValue("paymentMethodId", pm.id)}
                        className={`flex flex-col items-center justify-center gap-2 rounded-2xl border px-4 py-4 text-center transition-all ${
                          isSelected
                            ? "bg-brand-blue-500/10 border-brand-blue-500 text-brand-blue-500 shadow-lg shadow-brand-blue-500/5"
                            : "bg-background border-border text-zinc-500 hover:border-zinc-400 hover:text-foreground"
                        }`}
                      >
                        <CreditCard className="h-5 w-5" />
                        <span className="text-xs font-semibold">{pm.name}</span>
                      </button>
                    );
                  })}
                </div>
                {errors.paymentMethodId && (
                  <span className="mt-2 block text-xs text-red-400">{errors.paymentMethodId.message}</span>
                )}
              </div>
            </div>

            {/* Right Column: Products & Summary (5 cols) */}
            <div className="space-y-8 lg:col-span-5">
              
              {/* Product Selector */}
              <div className="rounded-3xl bg-card border border-border p-6 md:p-8">
                <div className="mb-6 flex items-center gap-3 border-b border-border pb-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-blue-500/10 text-brand-blue-500">
                    <ShoppingBag className="h-4 w-4" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground">3. Pilih Emas Sima</h2>
                </div>

                {products.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-zinc-500">
                    <RefreshCw className="h-6 w-6 animate-spin mb-2" />
                    <span className="text-xs">Memuat katalog emas...</span>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1 no-scrollbar">
                    {products.map((product) => {
                      const qty = selectedProducts[product.id] || 0;
                      return (
                        <div
                          key={product.id}
                          className="flex items-center justify-between rounded-2xl bg-background border border-border p-3.5 transition-all hover:border-zinc-400 dark:hover:border-zinc-600"
                        >
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-foreground">{product.name}</span>
                            <span className="text-[11px] text-zinc-500 dark:text-zinc-400">{formatWeight(product.weight)}</span>
                            <span className="mt-1 text-xs font-semibold text-brand-red-500">
                              {formatCurrency(product.price)}
                            </span>
                          </div>

                          {/* Qty Counter */}
                          <div className="flex items-center gap-3 rounded-xl bg-card p-1.5 ring-1 ring-border">
                            <button
                              type="button"
                              onClick={() => handleQuantityChange(product.id, -1)}
                              disabled={qty === 0}
                              className="flex h-7 w-7 items-center justify-center rounded-lg bg-background hover:bg-card border border-border text-zinc-500 disabled:opacity-30 disabled:pointer-events-none transition-all"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-6 text-center text-sm font-bold text-foreground">
                              {qty}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleQuantityChange(product.id, 1)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg bg-background hover:bg-card border border-border text-zinc-500 transition-all"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Order Summary */}
              <div className="rounded-3xl bg-gradient-to-br from-card to-background border border-brand-blue-500/20 p-6 md:p-8">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Ringkasan Pesanan</h3>
                
                {/* List of chosen items */}
                <div className="mt-4 space-y-3 border-b border-border pb-4">
                  {Object.entries(selectedProducts).length === 0 ? (
                    <div className="py-4 text-center text-xs text-zinc-500">Belum ada emas terpilih</div>
                  ) : (
                    Object.entries(selectedProducts).map(([prodId, qty]) => {
                      const prod = products.find(p => p.id === prodId);
                      if (!prod) return null;
                      return (
                        <div key={prodId} className="flex justify-between text-xs text-zinc-650 dark:text-zinc-300">
                          <span>{prod.name} (x{qty})</span>
                          <span>{formatCurrency(prod.price * qty)}</span>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Total Price */}
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Total Pembayaran</span>
                  <span className="text-xl font-bold text-brand-gradient">
                    {formatCurrency(calculateTotal())}
                  </span>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-gradient py-3 text-sm font-bold text-white transition-all hover:opacity-95 disabled:opacity-50 disabled:pointer-events-none"
                >
                  {isLoading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Kirim Formulir & Ambil Antrian
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>

            </div>
          </form>
        )}
      </main>
    </div>
  );
}
