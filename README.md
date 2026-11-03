# GAGACLO - R&D Storage Inventory Management App

Aplikasi Web Manajemen & Pencatatan Inventory Sample & Material R&D Gagaclo yang dibangun berdasarkan data manifes penyimpanan resmi:
- **Ref Dokumen**: `GAGACLO - Storage - 20261102`
- **Unit**: `INVENTORY MANAGEMENT RND`
- **Total Rak**: 5 Racks (36 Box Sample, 36 Box Material)
- **Total Box**: 72 Boxes (Box 1 s/d 72)
- **Tim PPIC**: 5 PIC (Royan, Cynara, Ami, Ryan, Hanami)

---

## 📋 Struktur Data Rak & Alokasi Box (Sesuai Dokumen)

### 1. RACK 1 (SAMPLE)
- **Lokasi & Deskripsi**: *Blue rack, sample warehouse*
- **Rentang Box**: Box 1 - 16 (Total: 16 Box)
- **Alokasi Tim PPIC**:
  - `1` **Royan**: Box 1-3, 16 (4 Box)
  - `2` **Cynara**: Box 4-6 (3 Box)
  - `3` **Ami**: Box 7-9 (3 Box)
  - `4` **Ryan**: Box 10-12 (3 Box)
  - `5` **Hanami**: Box 13-15 (3 Box)

### 2. RACK 2 (SAMPLE)
- **Lokasi & Deskripsi**: *White rack, sample warehouse, way to the new building*
- **Rentang Box**: Box 17 - 36 (Total: 20 Box)
- **Alokasi Tim PPIC**:
  - `1` **Royan**: Box 17-20 (4 Box)
  - `2` **Cynara**: Box 21-24 (4 Box)
  - `3` **Ami**: Box 25-28 (4 Box)
  - `4` **Ryan**: Box 29-32 (4 Box)
  - `5` **Hanami**: Box 33-36 (4 Box)

### 3. RACK 3 (MATERIAL)
- **Lokasi & Deskripsi**: *White rack, new building*
- **Rentang Box**: Box 37 - 48 (Total: 12 Box)
- **Alokasi Tim PPIC**:
  - `1` **Royan**: Box 37-38, 47 (3 Box)
  - `2` **Cynara**: Box 39-40, 48 (3 Box)
  - `3` **Ami**: Box 41-42 (2 Box)
  - `4` **Ryan**: Box 43-44 (2 Box)
  - `5` **Hanami**: Box 45-46 (2 Box)

### 4. RACK 4 (MATERIAL)
- **Lokasi & Deskripsi**: *White rack, new building*
- **Rentang Box**: Box 49 - 60 (Total: 12 Box)
- **Alokasi Tim PPIC**:
  - `1` **Royan**: Box 49-50 (2 Box)
  - `2` **Cynara**: Box 51-52 (2 Box)
  - `3` **Ami**: Box 53-54, 59 (3 Box)
  - `4` **Ryan**: Box 55-56, 60 (3 Box)
  - `5` **Hanami**: Box 57-58 (2 Box)

### 5. RACK 5 (MATERIAL)
- **Lokasi & Deskripsi**: *White rack, new building*
- **Rentang Box**: Box 61 - 72 (Total: 12 Box)
- **Alokasi Tim PPIC**:
  - `1` **Royan**: Box 61-62, 72 (3 Box)
  - `2` **Cynara**: Box 63-64 (2 Box)
  - `3` **Ami**: Box 65-66 (2 Box)
  - `4` **Ryan**: Box 67-68 (2 Box)
  - `5` **Hanami**: Box 69-70, 71 (3 Box)

---

## 🎯 Rekapitulasi Alokasi per PIC PPIC

| No | Nama PIC | Box Sample | Box Material | Total Box |
|---|---|:---:|:---:|:---:|
| 1 | **Royan** | 8 | 8 | **16 Box** |
| 2 | **Cynara** | 7 | 7 | **14 Box** |
| 3 | **Ami** | 7 | 7 | **14 Box** |
| 4 | **Ryan** | 7 | 7 | **14 Box** |
| 5 | **Hanami** | 7 | 7 | **14 Box** |
| **TOTAL** | | **36** | **36** | **72 Box** |

---

## 🚀 Fitur Utama Aplikasi

1. **Denah Rak & Box Interaktif (Visual 1-72)**:
   - Visualisasi tata letak fisik Rak 1 s/d 5.
   - Filter cepat berdasarkan Rak, Kategori (Sample/Material), atau PIC PPIC.
   - Indikator kapasitas dan jumlah item tersimpan di setiap box.
   - Klik box mana pun untuk membuka detail dan daftar sampel di dalamnya.

2. **Pencatatan & Master Item Inventory**:
   - Catat sampel/material baru lengkap dengan SKU, nama, kategori, nomor box, PIC, qty, unit, status (In Storage, Borrowed, In Review), tanggal masuk, dan catatan.
   - Edit, hapus, dan pindah box.

3. **Log Mutasi (In / Out / Borrow / Return)**:
   - Mencatat keluar-masuk sampel, peminjaman oleh tim QC / fitting, dan mutasi relokasi antar box.

4. **Dashboard Tim PPIC**:
   - Pantau alokasi box dan volume sampel yang sedang dipegang oleh masing-masing PIC (Royan, Cynara, Ami, Ryan, Hanami).

5. **Dokumen Cetak & Label QR**:
   - Cetak lembar manifes persis format dokumen resmi asli per rak.
   - Cetak stiker label QR untuk fisik box di gudang.

6. **Export & Backup**:
   - Export langsung ke file Microsoft Excel (`.xlsx`) multi-sheet (Items, Master Box, Racks, PPIC Summary, Log Mutasi).
   - Backup & Restore data format JSON.
   - Reset ke kondisi awal sewaktu-waktu.

---

## 💻 Menjalankan Aplikasi

Aplikasi berjalan di server lokal:
```bash
npm run dev
```
Akses melalui browser: `http://127.0.0.1:5173/`
