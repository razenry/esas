"use client";

import { useEffect, useState } from "react";
import { 
  Settings, ShoppingBag, CreditCard, Clock, ShieldCheck, 
  Trash2, Plus, Edit2, ShieldAlert, RefreshCw, FileText, CheckCircle2,
  Users
} from "lucide-react";
import { formatCurrency, formatDate, formatWeight } from "@/lib/utils";

type SettingsTab = "general" | "products" | "payments" | "shifts" | "users" | "roles" | "logs";

const AVAILABLE_PERMISSIONS = [
  { value: "crud_users", label: "Kelola User (CRUD User)" },
  { value: "crud_roles", label: "Kelola Role (CRUD Role)" },
  { value: "crud_shifts", label: "Kelola Shift Kerja" },
  { value: "crud_products", label: "Kelola Katalog Emas" },
  { value: "crud_payment_methods", label: "Kelola Metode Bayar" },
  { value: "configure_settings", label: "Mengubah Pengaturan Umum" },
  { value: "view_all_transactions", label: "Melihat Semua Transaksi" },
  { value: "edit_transactions", label: "Mengubah Transaksi" },
  { value: "change_transaction_status", label: "Mengubah Status Transaksi (Admin)" },
  { value: "view_all_reports", label: "Melihat Laporan & Grafik" },
  { value: "export_data", label: "Mengekspor Laporan (CSV/XLS)" },
  { value: "scan_qr", label: "Memindai QR Code Antrian" },
  { value: "verify_admin", label: "Melakukan Verifikasi Berkas KTP" },
  { value: "confirm_handover", label: "Melakukan Serah Terima Emas" },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const [session, setSession] = useState<any>(null);
  
  // Database states
  const [products, setProducts] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // General settings state
  const [generalSettings, setGeneralSettings] = useState({
    booth_name: "",
    event_location: "",
    admin_docs_google_url: "",
    queue_prefix: "A",
  });

  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Form states
  const [productForm, setProductForm] = useState({ id: "", name: "", weight: "", price: "", isActive: true });
  const [paymentForm, setPaymentForm] = useState({ id: "", name: "", isActive: true });
  const [shiftForm, setShiftForm] = useState({ id: "", name: "", startTime: "", endTime: "", isActive: true });
  const [userForm, setUserForm] = useState({ id: "", name: "", username: "", password: "", roleId: "" });
  const [roleForm, setRoleForm] = useState<{ id: string; name: string; permissions: string[] }>({ id: "", name: "", permissions: [] });

  const [isEditing, setIsEditing] = useState(false);

  const fetchSession = async () => {
    try {
      const res = await fetch("/api/auth/session");
      const data = await res.json();
      setSession(data.session);
    } catch (e) {
      console.error(e);
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [prodRes, pmRes, shiftRes, logRes, usersRes, rolesRes, settingsRes] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/payment-methods"),
        fetch("/api/shifts"),
        fetch("/api/logs"),
        fetch("/api/users").catch(() => null),
        fetch("/api/roles").catch(() => null),
        fetch("/api/settings").catch(() => null),
      ]);

      const prodData = await prodRes.json();
      const pmData = await pmRes.json();
      const shiftData = await shiftRes.json();
      const logData = await logRes.json();

      if (prodData.products) setProducts(prodData.products);
      if (pmData.paymentMethods) setPayments(pmData.paymentMethods);
      if (shiftData.shifts) setShifts(shiftData.shifts);
      if (logData.logs) setAuditLogs(logData.logs);

      if (usersRes) {
        const usersData = await usersRes.json();
        if (usersData.users) setUsers(usersData.users);
      }
      if (rolesRes) {
        const rolesData = await rolesRes.json();
        if (rolesData.roles) setRoles(rolesData.roles);
      }
      if (settingsRes) {
        const settingsData = await settingsRes.json();
        if (settingsData.settings) {
          setGeneralSettings({
            booth_name: settingsData.settings.booth_name || "",
            event_location: settingsData.settings.event_location || "",
            admin_docs_google_url: settingsData.settings.admin_docs_google_url || "",
            queue_prefix: settingsData.settings.queue_prefix || "A",
          });
        }
      }
    } catch (e) {
      console.error("Failed to load settings data", e);
    } finally {
      setIsLoading(false);
    }
  };

  const saveGeneralSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(generalSettings),
      });

      const resData = await res.json();
      if (!res.ok) {
        setErrorMsg(resData.error || "Gagal menyimpan pengaturan.");
      } else {
        setSuccessMsg("Pengaturan umum berhasil disimpan!");
        loadData();
      }
    } catch (e) {
      setErrorMsg("Koneksi gagal.");
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
    loadData();
  }, []);

  // Form Resetters
  const resetProductForm = () => {
    setProductForm({ id: "", name: "", weight: "", price: "", isActive: true });
    setIsEditing(false);
  };
  const resetPaymentForm = () => {
    setPaymentForm({ id: "", name: "", isActive: true });
    setIsEditing(false);
  };
  const resetShiftForm = () => {
    setShiftForm({ id: "", name: "", startTime: "", endTime: "", isActive: true });
    setIsEditing(false);
  };
  const resetUserForm = () => {
    setUserForm({ id: "", name: "", username: "", password: "", roleId: "" });
    setIsEditing(false);
  };
  const resetRoleForm = () => {
    setRoleForm({ id: "", name: "", permissions: [] });
    setIsEditing(false);
  };

  // CRUD Product
  const saveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.name || !productForm.weight || !productForm.price) return;
    setActionLoading(true);
    setErrorMsg("");
    setSuccessMsg("");
    
    try {
      const url = "/api/products";
      const method = isEditing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productForm),
      });

      const resData = await res.json();
      if (!res.ok) {
        setErrorMsg(resData.error || "Gagal menyimpan produk.");
      } else {
        setSuccessMsg(isEditing ? "Produk berhasil diperbarui!" : "Produk berhasil ditambahkan!");
        resetProductForm();
        loadData();
      }
    } catch (e) {
      setErrorMsg("Koneksi gagal.");
    } finally {
      setActionLoading(false);
    }
  };

  // CRUD Payment
  const savePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentForm.name) return;
    setActionLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const url = "/api/payment-methods";
      const method = isEditing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paymentForm),
      });

      const resData = await res.json();
      if (!res.ok) {
        setErrorMsg(resData.error || "Gagal menyimpan pembayaran.");
      } else {
        setSuccessMsg(isEditing ? "Metode pembayaran diperbarui!" : "Metode pembayaran ditambahkan!");
        resetPaymentForm();
        loadData();
      }
    } catch (e) {
      setErrorMsg("Koneksi gagal.");
    } finally {
      setActionLoading(false);
    }
  };

  // CRUD Shift
  const saveShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shiftForm.name || !shiftForm.startTime || !shiftForm.endTime) return;
    setActionLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const url = "/api/shifts";
      const method = isEditing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(shiftForm),
      });

      const resData = await res.json();
      if (!res.ok) {
        setErrorMsg(resData.error || "Gagal menyimpan shift.");
      } else {
        setSuccessMsg(isEditing ? "Shift berhasil diperbarui!" : "Shift berhasil ditambahkan!");
        resetShiftForm();
        loadData();
      }
    } catch (e) {
      setErrorMsg("Koneksi gagal.");
    } finally {
      setActionLoading(false);
    }
  };

  // CRUD User
  const saveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.name || !userForm.username || !userForm.roleId) return;
    if (!isEditing && !userForm.password) {
      setErrorMsg("Password wajib diisi untuk user baru");
      return;
    }
    setActionLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const url = isEditing ? `/api/users/${userForm.id}` : "/api/users";
      const method = isEditing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userForm),
      });

      const resData = await res.json();
      if (!res.ok) {
        setErrorMsg(resData.error || "Gagal menyimpan user.");
      } else {
        setSuccessMsg(isEditing ? "User berhasil diperbarui!" : "User berhasil ditambahkan!");
        resetUserForm();
        loadData();
      }
    } catch (e) {
      setErrorMsg("Koneksi gagal.");
    } finally {
      setActionLoading(false);
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus user ini?")) return;
    setActionLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
      });

      const resData = await res.json();
      if (!res.ok) {
        setErrorMsg(resData.error || "Gagal menghapus user.");
      } else {
        setSuccessMsg("User berhasil dihapus!");
        loadData();
      }
    } catch (e) {
      setErrorMsg("Koneksi gagal.");
    } finally {
      setActionLoading(false);
    }
  };

  // CRUD Role
  const saveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleForm.name) return;
    setActionLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const url = isEditing ? `/api/roles/${roleForm.id}` : "/api/roles";
      const method = isEditing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(roleForm),
      });

      const resData = await res.json();
      if (!res.ok) {
        setErrorMsg(resData.error || "Gagal menyimpan role.");
      } else {
        setSuccessMsg(isEditing ? "Role berhasil diperbarui!" : "Role berhasil ditambahkan!");
        resetRoleForm();
        loadData();
      }
    } catch (e) {
      setErrorMsg("Koneksi gagal.");
    } finally {
      setActionLoading(false);
    }
  };

  const deleteRole = async (roleId: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus role ini?")) return;
    setActionLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await fetch(`/api/roles/${roleId}`, {
        method: "DELETE",
      });

      const resData = await res.json();
      if (!res.ok) {
        setErrorMsg(resData.error || "Gagal menghapus role.");
      } else {
        setSuccessMsg("Role berhasil dihapus!");
        loadData();
      }
    } catch (e) {
      setErrorMsg("Koneksi gagal.");
    } finally {
      setActionLoading(false);
    }
  };

  const handlePermissionChange = (perm: string, checked: boolean) => {
    setRoleForm((prev) => {
      const perms = [...prev.permissions];
      if (checked) {
        if (!perms.includes(perm)) perms.push(perm);
      } else {
        const idx = perms.indexOf(perm);
        if (idx !== -1) perms.splice(idx, 1);
      }
      return { ...prev, permissions: perms };
    });
  };

  // Gate Check
  if (session && session.roleName !== "Super Admin") {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-950/20 text-red-500 border border-red-900/20">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">Akses Terbatas</h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm">
            Halaman konfigurasi Master Data dan Log Audit hanya dapat diakses oleh tingkat akun **Super Admin**.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white md:text-3xl font-sans">Konfigurasi Master Data</h2>
          <p className="text-xs text-zinc-400">Atur katalog produk emas, metode pembayaran, shift, dan pantau log audit sistem</p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition-all"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {successMsg && (
        <div className="rounded-xl bg-emerald-950/20 text-emerald-400 border border-emerald-900/20 p-3.5 text-center text-xs font-semibold">
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="rounded-xl bg-red-950/20 text-red-400 border border-red-900/20 p-3.5 text-center text-xs font-semibold">
          {errorMsg}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-zinc-850 bg-zinc-950/40 rounded-xl overflow-hidden">
        {[
          { id: "general", name: "Pengaturan Umum", icon: Settings },
          { id: "products", name: "Katalog Emas", icon: ShoppingBag },
          { id: "payments", name: "Metode Bayar", icon: CreditCard },
          { id: "shifts", name: "Shift Kerja", icon: Clock },
          { id: "users", name: "Manajemen User", icon: Users },
          { id: "roles", name: "Manajemen Role", icon: ShieldCheck },
          { id: "logs", name: "Log Audit Sistem", icon: FileText },
        ].map((tab) => {
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id as SettingsTab); setErrorMsg(""); setSuccessMsg(""); setIsEditing(false); }}
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

      {/* Workspace Panel */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">

        {/* Tab: General Settings */}
        {activeTab === "general" && (
          <form onSubmit={saveGeneralSettings} className="lg:col-span-12 rounded-2xl border border-zinc-800 bg-[#121316] p-6 space-y-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider pb-3 border-b border-zinc-800">
              Pengaturan Umum Aplikasi
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-zinc-500">Nama Stan Booth (Booth Name)</label>
                <input
                  value={generalSettings.booth_name}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, booth_name: e.target.value })}
                  placeholder="Contoh: Sima Gold Exhibition Booth"
                  required
                  className="rounded-xl bg-zinc-900 border border-zinc-800 px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 outline-none focus:border-brand-blue-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-zinc-500">Lokasi Event (Location)</label>
                <input
                  value={generalSettings.event_location}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, event_location: e.target.value })}
                  placeholder="Contoh: Grand Indonesia Mall, Jakarta"
                  required
                  className="rounded-xl bg-zinc-900 border border-zinc-800 px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 outline-none focus:border-brand-blue-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-zinc-500">Prefix Nomor Antrian (Queue Prefix) *</label>
                <input
                  value={generalSettings.queue_prefix}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, queue_prefix: e.target.value.toUpperCase().slice(0, 5) })}
                  placeholder="Contoh: A, B, Q, SIMA"
                  required
                  className="rounded-xl bg-zinc-900 border border-zinc-800 px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 outline-none focus:border-brand-blue-500 font-bold tracking-wider"
                />
                <span className="text-[9px] text-zinc-500 block">Prefix akan ditambahkan di depan nomor antrian (contoh: prefix &quot;Q&quot; akan menghasilkan &quot;Q-001&quot;). Maksimal 5 karakter.</span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-zinc-500">Google Sheets URL Administrasi</label>
                <input
                  value={generalSettings.admin_docs_google_url}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, admin_docs_google_url: e.target.value })}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  className="rounded-xl bg-zinc-900 border border-zinc-800 px-3.5 py-2.5 text-xs text-white placeholder-zinc-655 outline-none focus:border-brand-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-zinc-800">
              <button
                type="submit"
                disabled={actionLoading}
                className="rounded-xl bg-brand-gradient hover:opacity-95 px-6 py-2.5 text-xs font-bold text-white disabled:opacity-50 transition-all cursor-pointer"
              >
                {actionLoading ? "Menyimpan..." : "Simpan Pengaturan"}
              </button>
            </div>
          </form>
        )}
        
        {/* Tab 1: Products */}
        {activeTab === "products" && (
          <>
            {/* Table list (8 cols) */}
            <div className="lg:col-span-8 rounded-2xl border border-zinc-800 bg-[#121316] overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-950/40 text-[10px] uppercase font-bold text-zinc-400">
                    <th className="px-5 py-4">Nama Produk</th>
                    <th className="px-5 py-4">Berat</th>
                    <th className="px-5 py-4">Harga Kepingan</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850">
                  {products.map((p) => (
                    <tr key={p.id} className="hover:bg-zinc-800/10 text-zinc-300">
                      <td className="px-5 py-4 font-bold text-white">{p.name}</td>
                      <td className="px-5 py-4">{formatWeight(p.weight)}</td>
                      <td className="px-5 py-4 text-brand-red-500 font-bold">{formatCurrency(p.price)}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold ${p.isActive ? "bg-emerald-950/50 text-emerald-400 ring-1 ring-emerald-500/25" : "bg-zinc-900 text-zinc-500"}`}>
                          {p.isActive ? "Aktif" : "Nonaktif"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => { setProductForm({ id: p.id, name: p.name, weight: String(p.weight), price: String(p.price), isActive: p.isActive }); setIsEditing(true); }}
                          className="rounded-lg p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all cursor-pointer"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Input Form (4 cols) */}
            <form onSubmit={saveProduct} className="lg:col-span-4 rounded-2xl border border-zinc-800 bg-[#121316] p-6 space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider pb-2 border-b border-zinc-800">
                {isEditing ? "Ubah Produk" : "Tambah Produk Baru"}
              </h3>
              
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-zinc-500">Nama Produk *</label>
                <input
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  placeholder="Contoh: Emas Sima 1g"
                  required
                  className="rounded-xl bg-zinc-900 border border-zinc-800 px-3.5 py-2.5 text-xs text-white placeholder-zinc-655 outline-none focus:border-brand-blue-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-zinc-500">Berat Logam (Gram) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={productForm.weight}
                  onChange={(e) => setProductForm({ ...productForm, weight: e.target.value })}
                  placeholder="Contoh: 1.0"
                  required
                  className="rounded-xl bg-zinc-900 border border-zinc-800 px-3.5 py-2.5 text-xs text-white placeholder-zinc-655 outline-none focus:border-brand-blue-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-zinc-500">Harga Per Keping (IDR) *</label>
                <input
                  type="number"
                  value={productForm.price}
                  onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                  placeholder="Contoh: 1000000"
                  required
                  className="rounded-xl bg-zinc-900 border border-zinc-800 px-3.5 py-2.5 text-xs text-white placeholder-zinc-655 outline-none focus:border-brand-blue-500"
                />
              </div>

              <label className="flex items-center gap-2.5 text-xs text-zinc-300 select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={productForm.isActive}
                  onChange={(e) => setProductForm({ ...productForm, isActive: e.target.checked })}
                  className="h-4 w-4 rounded bg-zinc-950 border-zinc-800 text-brand-blue-500 cursor-pointer"
                />
                <span>Status Aktif Penjualan</span>
              </label>

              <div className="flex gap-2 pt-2">
                {isEditing && (
                  <button
                    type="button"
                    onClick={resetProductForm}
                    className="flex-1 rounded-xl bg-zinc-900 border border-zinc-800 py-2.5 text-xs font-semibold text-zinc-400 hover:text-white"
                  >
                    Batal
                  </button>
                )}
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 rounded-xl bg-brand-gradient py-2.5 text-xs font-bold text-white hover:opacity-95 disabled:opacity-50"
                >
                  Simpan Produk
                </button>
              </div>
            </form>
          </>
        )}

        {/* Tab 2: Payment Methods */}
        {activeTab === "payments" && (
          <>
            {/* Table list */}
            <div className="lg:col-span-8 rounded-2xl border border-zinc-800 bg-[#121316] overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-950/40 text-[10px] uppercase font-bold text-zinc-400">
                    <th className="px-5 py-4">Nama Metode Pembayaran</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-zinc-800/10 text-zinc-300">
                      <td className="px-5 py-4 font-bold text-white">{p.name}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold ${p.isActive ? "bg-emerald-950/50 text-emerald-400 ring-1 ring-emerald-500/25" : "bg-zinc-900 text-zinc-500"}`}>
                          {p.isActive ? "Aktif" : "Nonaktif"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => { setPaymentForm({ id: p.id, name: p.name, isActive: p.isActive }); setIsEditing(true); }}
                          className="rounded-lg p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all cursor-pointer"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Input Form */}
            <form onSubmit={savePayment} className="lg:col-span-4 rounded-2xl border border-zinc-800 bg-[#121316] p-6 space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider pb-2 border-b border-zinc-800">
                {isEditing ? "Ubah Pembayaran" : "Tambah Pembayaran Baru"}
              </h3>
              
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-zinc-500">Nama Pembayaran *</label>
                <input
                  value={paymentForm.name}
                  onChange={(e) => setPaymentForm({ ...paymentForm, name: e.target.value })}
                  placeholder="Contoh: QRIS"
                  required
                  className="rounded-xl bg-zinc-900 border border-zinc-800 px-3.5 py-2.5 text-xs text-white placeholder-zinc-655 outline-none focus:border-brand-blue-500"
                />
              </div>

              <label className="flex items-center gap-2.5 text-xs text-zinc-300 select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={paymentForm.isActive}
                  onChange={(e) => setPaymentForm({ ...paymentForm, isActive: e.target.checked })}
                  className="h-4 w-4 rounded bg-zinc-950 border-zinc-800 text-brand-blue-500 cursor-pointer"
                />
                <span>Status Aktif Pembayaran</span>
              </label>

              <div className="flex gap-2 pt-2">
                {isEditing && (
                  <button
                    type="button"
                    onClick={resetPaymentForm}
                    className="flex-1 rounded-xl bg-zinc-900 border border-zinc-800 py-2.5 text-xs font-semibold text-zinc-400 hover:text-white"
                  >
                    Batal
                  </button>
                )}
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 rounded-xl bg-brand-gradient py-2.5 text-xs font-bold text-white hover:opacity-95 disabled:opacity-50"
                >
                  Simpan Pembayaran
                </button>
              </div>
            </form>
          </>
        )}

        {/* Tab 3: Shifts */}
        {activeTab === "shifts" && (
          <>
            {/* Table list */}
            <div className="lg:col-span-8 rounded-2xl border border-zinc-800 bg-[#121316] overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-950/40 text-[10px] uppercase font-bold text-zinc-400">
                    <th className="px-5 py-4">Nama Shift</th>
                    <th className="px-5 py-4">Waktu Tugas</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850">
                  {shifts.map((s) => (
                    <tr key={s.id} className="hover:bg-zinc-800/10 text-zinc-300">
                      <td className="px-5 py-4 font-bold text-white">{s.name}</td>
                      <td className="px-5 py-4 font-mono text-zinc-400">{s.startTime} - {s.endTime}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold ${s.isActive ? "bg-emerald-950/50 text-emerald-400 ring-1 ring-emerald-500/25" : "bg-zinc-900 text-zinc-500"}`}>
                          {s.isActive ? "Aktif" : "Nonaktif"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => { setShiftForm({ id: s.id, name: s.name, startTime: s.startTime, endTime: s.endTime, isActive: s.isActive }); setIsEditing(true); }}
                          className="rounded-lg p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all cursor-pointer"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Input Form */}
            <form onSubmit={saveShift} className="lg:col-span-4 rounded-2xl border border-zinc-800 bg-[#121316] p-6 space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider pb-2 border-b border-zinc-800">
                {isEditing ? "Ubah Shift" : "Tambah Shift Baru"}
              </h3>
              
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-zinc-500">Nama Shift *</label>
                <input
                  value={shiftForm.name}
                  onChange={(e) => setShiftForm({ ...shiftForm, name: e.target.value })}
                  placeholder="Contoh: Shift Pagi"
                  required
                  className="rounded-xl bg-zinc-900 border border-zinc-800 px-3.5 py-2.5 text-xs text-white placeholder-zinc-655 outline-none focus:border-brand-blue-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-zinc-500">Jam Mulai (HH:MM) *</label>
                <input
                  value={shiftForm.startTime}
                  onChange={(e) => setShiftForm({ ...shiftForm, startTime: e.target.value })}
                  placeholder="Contoh: 07.00"
                  required
                  className="rounded-xl bg-zinc-900 border border-zinc-800 px-3.5 py-2.5 text-xs text-white placeholder-zinc-655 outline-none focus:border-brand-blue-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-zinc-500">Jam Selesai (HH:MM) *</label>
                <input
                  value={shiftForm.endTime}
                  onChange={(e) => setShiftForm({ ...shiftForm, endTime: e.target.value })}
                  placeholder="Contoh: 12.00"
                  required
                  className="rounded-xl bg-zinc-900 border border-zinc-800 px-3.5 py-2.5 text-xs text-white placeholder-zinc-655 outline-none focus:border-brand-blue-500"
                />
              </div>

              <label className="flex items-center gap-2.5 text-xs text-zinc-300 select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={shiftForm.isActive}
                  onChange={(e) => setShiftForm({ ...shiftForm, isActive: e.target.checked })}
                  className="h-4 w-4 rounded bg-zinc-950 border-zinc-800 text-brand-blue-500 cursor-pointer"
                />
                <span>Status Aktif Shift</span>
              </label>

              <div className="flex gap-2 pt-2">
                {isEditing && (
                  <button
                    type="button"
                    onClick={resetShiftForm}
                    className="flex-1 rounded-xl bg-zinc-900 border border-zinc-800 py-2.5 text-xs font-semibold text-zinc-400 hover:text-white"
                  >
                    Batal
                  </button>
                )}
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 rounded-xl bg-brand-gradient py-2.5 text-xs font-bold text-white hover:opacity-95 disabled:opacity-50"
                >
                  Simpan Shift
                </button>
              </div>
            </form>
          </>
        )}

        {/* Tab 4: Users Management */}
        {activeTab === "users" && (
          <>
            {/* Table list */}
            <div className="lg:col-span-8 rounded-2xl border border-zinc-800 bg-[#121316] overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-950/40 text-[10px] uppercase font-bold text-zinc-400">
                    <th className="px-5 py-4">Nama Lengkap</th>
                    <th className="px-5 py-4">Username</th>
                    <th className="px-5 py-4">Peran (Role)</th>
                    <th className="px-5 py-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-zinc-800/10 text-zinc-300">
                      <td className="px-5 py-4 font-bold text-white">{u.name}</td>
                      <td className="px-5 py-4 font-mono">{u.username}</td>
                      <td className="px-5 py-4">
                        <span className="inline-flex rounded-full bg-zinc-900 border border-zinc-800 px-2.5 py-0.5 text-[10px] text-zinc-300 font-semibold">
                          {u.role?.name || "No Role"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right space-x-2">
                        <button
                          onClick={() => {
                            setUserForm({ id: u.id, name: u.name, username: u.username, password: "", roleId: u.roleId });
                            setIsEditing(true);
                          }}
                          className="rounded-lg p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all cursor-pointer"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => deleteUser(u.id)}
                          className="rounded-lg p-1.5 bg-zinc-900 hover:bg-red-950/20 text-zinc-400 hover:text-red-400 border border-transparent hover:border-red-950/40 transition-all cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Input Form */}
            <form onSubmit={saveUser} className="lg:col-span-4 rounded-2xl border border-zinc-800 bg-[#121316] p-6 space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider pb-2 border-b border-zinc-800">
                {isEditing ? "Ubah Petugas" : "Tambah Petugas Baru"}
              </h3>
              
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-zinc-500">Nama Lengkap *</label>
                <input
                  value={userForm.name}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                  placeholder="Contoh: Budi Santoso"
                  required
                  className="rounded-xl bg-zinc-900 border border-zinc-800 px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-brand-blue-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-zinc-500">Username *</label>
                <input
                  value={userForm.username}
                  onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                  placeholder="Contoh: budi123"
                  required
                  className="rounded-xl bg-zinc-900 border border-zinc-800 px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-brand-blue-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-zinc-500">
                  Password {isEditing ? "(Kosongkan jika tidak diubah)" : "*"}
                </label>
                <input
                  type="password"
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  placeholder={isEditing ? "••••••••" : "Masukkan password baru"}
                  required={!isEditing}
                  className="rounded-xl bg-zinc-900 border border-zinc-800 px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-brand-blue-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-zinc-500">Peran Tugas *</label>
                <select
                  value={userForm.roleId}
                  onChange={(e) => setUserForm({ ...userForm, roleId: e.target.value })}
                  required
                  className="rounded-xl bg-zinc-900 border border-zinc-800 px-3.5 py-2.5 text-xs text-white outline-none focus:border-brand-blue-500 cursor-pointer"
                >
                  <option value="">-- Pilih Peran Tugas --</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                {isEditing && (
                  <button
                    type="button"
                    onClick={resetUserForm}
                    className="flex-1 rounded-xl bg-zinc-900 border border-zinc-800 py-2.5 text-xs font-semibold text-zinc-400 hover:text-white"
                  >
                    Batal
                  </button>
                )}
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 rounded-xl bg-brand-gradient py-2.5 text-xs font-bold text-white hover:opacity-95 disabled:opacity-50"
                >
                  Simpan User
                </button>
              </div>
            </form>
          </>
        )}

        {/* Tab 5: Roles Management */}
        {activeTab === "roles" && (
          <>
            {/* Table list */}
            <div className="lg:col-span-8 rounded-2xl border border-zinc-800 bg-[#121316] overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-950/40 text-[10px] uppercase font-bold text-zinc-400">
                    <th className="px-5 py-4">Nama Peran (Role)</th>
                    <th className="px-5 py-4">Izin Akses (Permissions)</th>
                    <th className="px-5 py-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850">
                  {roles.map((r) => {
                    let perms: string[] = [];
                    try {
                      perms = JSON.parse(r.permissions);
                    } catch (e) {}
                    return (
                      <tr key={r.id} className="hover:bg-zinc-800/10 text-zinc-300">
                        <td className="px-5 py-4 font-bold text-white">{r.name}</td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-1 max-w-[400px]">
                            {perms.map((p) => (
                              <span key={p} className="inline-block rounded bg-zinc-900/60 text-zinc-400 px-1.5 py-0.5 text-[9px] font-medium border border-zinc-800/50">
                                {p}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right space-x-2">
                          <button
                            onClick={() => {
                              setRoleForm({ id: r.id, name: r.name, permissions: perms });
                              setIsEditing(true);
                            }}
                            className="rounded-lg p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all cursor-pointer"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => deleteRole(r.id)}
                            className="rounded-lg p-1.5 bg-zinc-900 hover:bg-red-950/20 text-zinc-400 hover:text-red-400 border border-transparent hover:border-red-950/40 transition-all cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Input Form */}
            <form onSubmit={saveRole} className="lg:col-span-4 rounded-2xl border border-zinc-800 bg-[#121316] p-6 space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider pb-2 border-b border-zinc-800">
                {isEditing ? "Ubah Role" : "Tambah Role Baru"}
              </h3>
              
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-zinc-500">Nama Peran *</label>
                <input
                  value={roleForm.name}
                  onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                  placeholder="Contoh: Operator Kasir"
                  required
                  className="rounded-xl bg-zinc-900 border border-zinc-800 px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-brand-blue-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-zinc-500">Hak Izin Akses (Permissions) *</label>
                <div className="rounded-xl bg-zinc-950 p-3 border border-zinc-850 space-y-2 max-h-[220px] overflow-y-auto no-scrollbar">
                  {AVAILABLE_PERMISSIONS.map((perm) => {
                    const isChecked = roleForm.permissions.includes(perm.value);
                    return (
                      <label key={perm.value} className="flex items-start gap-2.5 text-[11px] text-zinc-400 hover:text-white cursor-pointer py-0.5 select-none">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => handlePermissionChange(perm.value, e.target.checked)}
                          className="h-3.5 w-3.5 rounded bg-zinc-900 border-zinc-800 text-brand-blue-500 focus:ring-0 focus:ring-offset-0 cursor-pointer mt-0.5"
                        />
                        <span>{perm.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                {isEditing && (
                  <button
                    type="button"
                    onClick={resetRoleForm}
                    className="flex-1 rounded-xl bg-zinc-900 border border-zinc-800 py-2.5 text-xs font-semibold text-zinc-400 hover:text-white"
                  >
                    Batal
                  </button>
                )}
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 rounded-xl bg-brand-gradient py-2.5 text-xs font-bold text-white hover:opacity-95 disabled:opacity-50"
                >
                  Simpan Role
                </button>
              </div>
            </form>
          </>
        )}

        {/* Tab 4: Audit Logs Feed */}
        {activeTab === "logs" && (
          <div className="lg:col-span-12 rounded-2xl border border-zinc-800 bg-[#121316] p-6 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider pb-3 border-b border-zinc-800">
              Umpan Aktivitas Sistem (Audit Trail)
            </h3>

            {auditLogs.length === 0 ? (
              <div className="py-12 text-center text-zinc-500 text-xs">Tidak ada log aktivitas tercatat.</div>
            ) : (
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1 no-scrollbar text-xs">
                {auditLogs.map((log) => (
                  <div key={log.id} className="flex flex-col gap-1 border-l-2 border-brand-red-500/20 pl-4 py-1 leading-relaxed">
                    <span className="text-[10px] text-zinc-500 font-mono">{formatDate(log.timestamp)}</span>
                    <p className="text-zinc-200">
                      <strong className="text-brand-red-500">[{log.action}]</strong> {log.details}
                    </p>
                    <div className="flex items-center gap-3 text-[9px] text-zinc-500">
                      {log.user && (
                        <span>Petugas: <strong className="text-zinc-300">{log.user.name}</strong> ({log.user.role.name})</span>
                      )}
                      {log.shift && (
                        <span>Shift: <strong className="text-zinc-300">{log.shift.name}</strong></span>
                      )}
                      {log.transaction && (
                        <span>No Antrian: <strong className="text-zinc-300">{log.transaction.queueNumber}</strong></span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
