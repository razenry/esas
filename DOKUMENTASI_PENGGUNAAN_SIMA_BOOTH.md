# PANDUAN PENGGUNAAN SISTEM ADMINISTRASI SIMA BOOTH (SIMA BOOTH ADMINISTRATION SYSTEM - SBAS)

Dokumen ini berisi panduan operasional lengkap Sistem Administrasi SIMA Booth (SBAS) untuk semua peran, mulai dari sisi Customer (Client) hingga seluruh tingkat Administrator (Petugas Administrasi, Petugas Penyerahan, Admin Booth, dan Super Admin).

---

## DAFTAR ISI

1. ALUR KERJA UTAMA SISTEM (WORKFLOW OVERVIEW)
2. SISI CUSTOMER / CLIENT (REGISTRASI MANDIRI)
3. SISI PETUGAS ADMINISTRASI (LOKET 1 - VALIDASI DATA)
4. SISI PETUGAS PENYERAHAN (LOKET 2 - SERAH TERIMA EMAS)
5. SISI ADMIN BOOTH & SUPER ADMIN (MONITORING & REKAP)
6. FORMAT EKSPOR REKAPITULASI (TEMPLATE 18 KOLOM EXCEL)
7. PANDUAN PENANGANAN MASALAH (TROUBLESHOOTING)

---

## 1. ALUR KERJA UTAMA SISTEM (WORKFLOW OVERVIEW)

Sistem SBAS dirancang untuk mendigitalisasi antrean fisik serta mencatat transaksi emas di booth pameran Sima Gold secara real-time. Alur transaksi berjalan linear sebagai berikut:

```
[Customer Daftar di HP/Tablet] ──> Status: "Menunggu Administrasi" (A-xxx)
               │
               ▼
[Loket 1: Verifikasi KTP Admin] ──> Status: "Administrasi Selesai" / "Menunggu Penyerahan"
               │
               ▼
[Loket 2: Konfirmasi Serah Emas] ──> Status: "Selesai" (Emas Diserahkan)
```

---

## 2. SISI CUSTOMER / CLIENT (REGISTRASI MANDIRI)

Layar ini diakses oleh Customer melalui pemindaian QR Code di pintu masuk booth pameran, atau disediakan pada perangkat tablet mandiri di depan booth.

### Langkah Pendaftaran:

1. **Pengisian Identitas**:
   - Customer mengisi **NIK (16 Digit)**, **Nama Lengkap**, **Nomor HP (WhatsApp Aktif)**, **Alamat Rumah**, serta _Email_ & _Catatan Khusus_ (opsional).
2. **Pemilihan Logam Emas**:
   - Pilih jenis kepingan emas Sima Gold dan tentukan jumlah kuantitas (`qty`) yang dibeli menggunakan tombol tambah/kurang (+/-).
   - Rincian total gramasi emas dan total harga pembelian akan ter-kalkulasi otomatis di bagian bawah secara real-time.
3. **Pemilihan Metode Pembayaran**:
   - Pilih metode pembayaran yang akan digunakan (misalnya: _Cash_, _QRIS_, _Transfer BCA_, _Debit_, dll.).
4. **Pembuatan Antrean**:
   - Klik tombol **"Daftar Transaksi & Ambil Antrean"**.
   - Sistem akan menerbitkan tiket tanda terima digital yang menampilkan **QR Code**, **Nomor Antrean (misal: A-001)**, dan **Kode Transaksi unik**.

### Fitur Penting Sisi Client:

- **Tanda Terima Tahan Refresh**: Jika halaman browser tidak sengaja tertutup atau di-refresh, nomor antrean dan QR Code **tidak akan hilang** karena tersimpan di memori lokal (`localStorage`) HP customer.
- **Informasi Posisi Antrean Live**: Di bawah QR Code tiket, sistem akan menampilkan informasi posisi antrean secara langsung:
  - _"Anda berada di antrean ke-X (menunggu X orang di depan Anda)"_.
  - Ketika customer berada di urutan terdepan, muncul pesan hijau berkedip: **"Giliran Anda berikutnya! Silakan merapat ke Counter Administrasi"**.
- **Pembatalan Mandiri (Cancel)**: Jika customer batal melanjutkan transaksi, mereka dapat mengklik tombol **"Batalkan Antrean Ini"** di bawah tiket. Sistem akan menghapus antrean dari server secara aman dan membersihkan browser.
- **Cetak/Simpan PDF**: Customer bisa menekan tombol **"Cetak / Simpan Bukti"** untuk mengunduh tiket dalam format PDF atau langsung mencetaknya ke printer thermal.

---

## 3. SISI PETUGAS ADMINISTRASI (LOKET 1 - VALIDASI DATA)

Petugas Administrasi bertugas di loket pertama untuk menyamakan berkas fisik customer dengan data inputan digital.

### Langkah Operasional:

1. **Login & Pilih Shift**: Login menggunakan akun petugas administrasi (username: `petugasadmin`) dan pilih shift tugas aktif Anda.
2. **Buka Menu "Scan QR"**:
   - Aktifkan kamera scanner di layar aplikasi, atau masukkan Kode Transaksi secara manual jika kamera laptop tidak tersedia.
   - Pindai QR Code tiket yang disodorkan oleh customer.
3. **Verifikasi Data**:
   - Periksa **KTP fisik** customer dan pastikan kesesuaian NIK serta Nama dengan data di layar.
   - Klik centang kotak: `[x] Verifikasi KTP fisik sesuai`.
4. **Fitur Salin Cepat Excel (Kunci Produktivitas)**:
   - Klik tombol **"Salin NIK, Nama, Alamat"** (tombol berwarna biru di panel clipboard).
   - Buka file spreadsheet Excel rekap utama Anda, arahkan kursor ke kolom **NIK (Kolom O)**, lalu tekan `Ctrl+V`.
   - **Keunggulan**: Data NIK (dengan tanda backtick ` agar format angka 16 digit tidak rusak/scientific), Nama, dan Alamat akan langsung ter-paste dan terpisah ke dalam kolom masing-masing secara otomatis dalam sekali tempel!
5. **Verifikasi Selesai**:
   - Klik tombol **"Verifikasi Administrasi Selesai"**. Status transaksi customer akan berubah menjadi `"Administrasi Selesai"` dan otomatis masuk ke monitor antrean penyerahan emas di Loket 2.

---

## 4. SISI PETUGAS PENYERAHAN (LOKET 2 - SERAH TERIMA EMAS)

Petugas Penyerahan bertugas menyerahkan fisik emas kepada customer dan mengonfirmasi pelunasan pembayaran.

### Langkah Operasional:

1. **Penerimaan Customer**: Customer yang nomor antreannya dipanggil ke Counter Penyerahan akan menyodorkan bukti tiket antreannya kembali.
2. **Pindai Tiket**:
   - Pindai kembali QR Code customer di menu "Scan QR".
   - Sistem akan memunculkan detail profil dan rincian produk emas yang wajib diserahkan.
3. **Verifikasi Akhir**:
   - Pastikan customer telah melunasi pembayaran sesuai metode yang dipilih.
   - Centang kotak verifikasi: `[x] Bukti pembayaran telah divalidasi` dan `[x] Berita acara serah terima emas telah ditandatangani`.
4. **Proteksi Double Scan (Sangat Penting!)**:
   - Sistem dilengkapi fitur anti-fraud pintar. Jika emas untuk nomor antrean tersebut **sudah pernah diserahkan sebelumnya**, sistem akan menolak pemindaian ulang dan memunculkan peringatan merah menyala: _"Peringatan: Transaksi ini sudah diselesaikan sebelumnya oleh petugas [Nama Petugas] pada jam [WIB]!"_. Ini mencegah penyerahan emas ganda secara tidak sengaja.
5. **Konfirmasi Serah Terima**:
   - Klik **"Konfirmasi Penyerahan Barang & Selesai"**. Efek animasi selebrasi (confetti emas) akan muncul menandakan transaksi sukses diselesaikan dan antrean ditutup secara bersih.

---

## 5. SISI ADMIN BOOTH & SUPER ADMIN (MONITORING & REKAP)

Peran ini memegang otoritas pengawasan jalannya event pameran secara keseluruhan.

### Fitur Utama:

1. **Monitor Antrean Real-Time (Dashboard)**:
   - Terbagi menjadi 3 panel live: **Antrian Administrasi (Loket 1)**, **Penyerahan Emas (Loket 2)**, dan **Riwayat Selesai hari ini**.
   - Monitor memuat informasi nama customer, waktu masuk loket, dan status secara dinamis.
   - **Teknologi Bebas Lag**: Pemuatan statistik rekap telah dipisahkan dari monitor antrean. Admin dapat memantau pergerakan antrean seketika tanpa terganggu proses loading halaman yang berat.
2. **Manajemen Master Data (Menu Master Data)**:
   - Mengelola dan memperbarui data Petugas (User), Shift Kerja, Produk Emas yang aktif dijual, serta Metode Pembayaran yang tersedia di booth.
3. **Pembatalan Paksa**:
   - Jika ada customer yang meninggalkan antrean fisik (kabur/tidak datang saat dipanggil), admin dapat membuka menu **Data Transaksi**, memilih transaksi tersebut, lalu mengklik tombol **"Batalkan Transaksi"** untuk melepaskan nomor antrean.

---

## 6. FORMAT EKSPOR REKAPITULASI (TEMPLATE 18 KOLOM EXCEL)

Di menu **Laporan & Rekap**, admin dapat mengunduh seluruh data penjualan dengan menekan tombol **"Ekspor Format Excel"**. Berkas Excel yang dihasilkan otomatis mengikuti skema 18 kolom berikut:

| Kolom | Nama Kolom                | Deskripsi / Sumber Data                               |
| :---: | :------------------------ | :---------------------------------------------------- |
| **A** | **Harga Dasar**           | Harga jual dasar produk emas sebelum pajak/markup     |
| **B** | **Tgl Pesan**             | Waktu pemesanan dibuat oleh customer                  |
| **C** | **No. PO**                | Nomor Purchase Order (menggunakan Kode Transaksi)     |
| **D** | **No. Pesanan**           | Nomor Urut Pesanan                                    |
| **E** | **Nama Pelanggan**        | Nama Lengkap Pembeli                                  |
| **F** | **LOGAM MULIA**           | Brand Logam Mulia (Sima Gold)                         |
| **G** | **GRAM**                  | Berat satuan gram produk (misal: 0.5, 1, 5, 10)       |
| **H** | **Keterangan Detil**      | Deskripsi gabungan nama produk dan kuantitas          |
| **I** | **Kuantitas SO**          | Jumlah kepingan emas yang dibeli                      |
| **J** | **Harga satuan pph**      | Besaran nilai PPh/pajak per unit produk               |
| **K** | **Total Harga (Inc PPH)** | Harga satuan emas setelah ditambah komponen pajak PPh |
| **L** | **Total (Inc PPH)**       | Total nilai belanja keseluruhan transaksi             |
| **M** | **GRAMASI**               | Total berat gramasi emas dalam satu pesanan           |
| **N** | **KETERANGAN**            | Catatan tambahan dari transaksi                       |
| **O** | **NIK**                   | Nomor Induk Kependudukan (16 Digit) pembeli           |
| **P** | **NAMA**                  | Nama Lengkap KTP Pembeli                              |
| **Q** | **ALAMAT**                | Alamat KTP Pembeli                                    |
| **R** | **NO SERI**               | Nomor Seri fisik Emas (diinput manual oleh admin)     |

---

## 7. PANDUAN PENANGANAN MASALAH (TROUBLESHOOTING)

#### Masalah 1: Layar Admin Menampilkan "0 Antrean" padahal Customer Aktif

- **Penyebab**: Browser menyimpan cache pemanggilan data monitor antrean yang lama (stale data).
- **Solusi**: Sistem kami sudah dilengkapi pengidentifikasi cache-buster otomatis (`?t=` timestamp). Jika masih terjadi delay, cukup tekan tombol **"Refresh Data"** di pojok kanan atas layar dashboard admin untuk menyegarkan koneksi database Turso.

#### Masalah 2: Nomor Antrean Kemarin Muncul di Layar Monitor Hari Ini

- **Solusi**: Di database, antrean yang belum diproses akan tetap berstatus aktif meskipun hari telah berganti agar tidak ada transaksi yang terlewat secara sepihak. Admin disarankan untuk meninjau menu **Data Transaksi** pada pagi hari sebelum pameran dimulai dan membatalkan (cancel) antrean hari sebelumnya yang hangus/tidak dilanjutkan.

#### Masalah 3: Scanner Kamera di Admin Tidak Bisa Menyala

- **Penyebab**: Browser memblokir akses kamera laptop karena aplikasi diakses menggunakan protokol HTTP biasa yang dinilai tidak aman oleh standar keamanan browser modern (browser membutuhkan protokol HTTPS aman untuk mengizinkan akses web-camera).
- **Solusi**:
  1. Akses aplikasi menggunakan tautan domain HTTPS aman yang disediakan oleh Vercel (misalnya: `https://esas-app.vercel.app`).
  2. Apabila terpaksa menggunakan localhost (development HTTP), gunakan input pencarian kode manual di sisi kiri layar scanner untuk memproses transaksi.

1. npx tsx scripts/migrate-turso.ts ← Buat tabel di Turso
2. npx tsx prisma/seed.ts ← Isi data awal
