# GAGACLO - R&D Storage Inventory Management App (3D Warehouse & Card Print)

Aplikasi Web Manajemen & Pencatatan Inventory Sample & Material R&D Gagaclo lengkap dengan:
1. **Pencatatan Cepat & Cetak Kartu Fisik (1:1 Standar Kotak Penyimpanan)**
2. **Visualisasi 3D Interaktif Rak Fisik & 72 Box Penyimpanan (Three.js WebGL)**
3. **Denah Rak 2D (Rak 1 s/d 5) & Pembagian Tim PPIC (Royan, Cynara, Ami, Ryan, Hanami)**
4. **Export Excel (.xlsx) & Backup Data**
5. **Siap Deploy ke GitHub & Vercel**

---

## 🚀 Panduan Upload ke GitHub & Vercel

Repository git lokal sudah diinisialisasi pada branch `main`.

### Langkah 1: Upload ke GitHub

1. Buka [github.com/new](https://github.com/new) dan buat repository baru (misal diberi nama: `gagaclo-inventory-rnd`).
2. Jangan centang "Initialize this repository with a README" (karena sudah ada).
3. Salin URL repository Anda (misal: `https://github.com/USERNAME/gagaclo-inventory-rnd.git`).
4. Buka PowerShell / Terminal di folder ini dan jalankan:
   ```bash
   git remote add origin https://github.com/USERNAME/gagaclo-inventory-rnd.git
   git push -u origin main
   ```

---

### Langkah 2: Deploy ke Vercel

Aplikasi sudah dilengkapi file `vercel.json` sehingga proses deploy langsung otomatis:

#### Cara 1: Menggunakan Website Vercel (Direkomendasikan)
1. Buka [vercel.com](https://vercel.com) dan login dengan akun GitHub Anda.
2. Klik tombol **"Add New..."** -> **"Project"**.
3. Pilih repository `gagaclo-inventory-rnd` dari daftar repository GitHub Anda.
4. Pada konfigurasi build:
   - **Framework Preset**: Vite (otomatis terdeteksi)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Klik **"Deploy"**. Dalam ~30 detik, website inventaris Anda akan langsung aktif dengan link publik (misal: `https://gagaclo-inventory-rnd.vercel.app`)!

#### Cara 2: Menggunakan Terminal (Vercel CLI)
Jika Anda memiliki akun Vercel dan ingin deploy langsung dari terminal:
```bash
npx vercel
```
Ikuti petunjuk di layar (login & konfirmasi deploy).

---

## 🧊 Fitur 3D Warehouse & Ilustrasi Rak

Tab **"Ilustrasi 3D Rak & Box"** menampilkan ruang gudang 3D secara interaktif:
- **Rak 1 (SAMPLE - Blue Rack)**: Tiang baja biru dengan kapasitas 16 box (Box 1 - 16).
- **Rak 2 (SAMPLE - White Rack)**: Tiang putih lorong gudang dengan 20 box (Box 17 - 36).
- **Rak 3, 4, 5 (MATERIAL - White Rack)**: Rak gedung baru dengan masing-masing 12 box (Box 37 - 72).
- **Interaksi 3D**:
  - **Putar Kamera 360°**: Klik kiri mouse dan seret.
  - **Zoom In/Out**: Scroll roda mouse.
  - **Geser Posisi**: Klik kanan mouse dan seret.
  - **Hover Box**: Menampilkan kartu info mengambang (*HUD tooltip*) berisi Nomor Box, PIC PPIC, dan jumlah barang di dalamnya.
  - **Klik Box**: Langsung membuka detail barang di box tersebut dan pilihan cetak kartu.
  - **Filter Highlight PIC**: Sorot hanya box milik Royan, Cynara, Ami, Ryan, atau Hanami. Box lain otomatis menjadi transparan.

---

## 🏷️ Fitur Cetak Kartu Fisik

Tab **"Kartu & Input (Super Simple)"**:
- Formulir input mencakup field standar: `Track`, `Tanggal`, `Kode`, `Deskripsi`, `Color`, `Jumlah`, `Satuan`, `Place`, `Qty Dipakai`, `Tanggal Dipakai`.
- *Live Preview* di sisi kanan langsung menyesuaikan tampilan kartu.
- Cetak satuan atau cetak banyak kartu (*batch print A4*) siap potong dan diselipkan ke wadah fisik sampel.

---

## 💻 Menjalankan di Komputer Lokal

```bash
npm run dev
```
Akses di browser: `http://127.0.0.1:5173/`
