# DESIGN.md

> Arah Desain & Identitas Visual: GAGACLO - Inventory Management RND
> Dokumen ini adalah acuan **jiwa & arah visual** produk. Dipadukan dengan filter `antislop.md`.

---

## 1. Identitas & Karakter Produk
- **Produk:** Sistem operasional pendataan fisik inventory sample & material R&D Gagaclo (72 Box, 5 Rak, 5 PIC).
- **Karakter:** Utilitarian industri, ergonomis, taktil, cepat, dan presisi.
- **Prinsip Utama:**
  - *Data-First:* Antarmuka mengutamakan keterbacaan data, kecepatan input kasir/gudang, dan kepadatan informasi tanpa distraksi visual.
  - *No Fluff:* Tidak ada hiasan dekoratif generik (tanpa blob 3D acak, tanpa gradien neon hampa, tanpa kata buzzword).
  - *Tactile Physicality:* Setiap box di layar merepresentasikan box kardus fisik nomor 1 sampai 72 di rak gudang fisik.

---

## 2. Dial Desain (1 sampai 3)
- **ENERGY: 2** (Tinggi utilitas, kontras fungsional tinggi untuk gudang, fokus pada efisiensi kerja cepat).
- **RHYTHM: 2** (Struktur tabular padat, grid rak 3D/2D yang rapi, hierarki jelas antara nomor box, kode sampel, dan status).
- **MOTION: 1** (Gerakan minimal dan sangat cepat: transisi geser laci 3D taktil, modal fade-in cepat tanpa animasi lambat).

---

## 3. Palet Warna (Maksimal 2-3 Warna Inti + 1 Aksen)
1. **Slate / Industrial Gray (Inti Netral):**
   - Background terang: `#f8fafc` (Slate 50), border `#cbd5e1` (Slate 300), teks `#0f172a` (Slate 900).
   - Mode gelap: `#090d16` (Slate 950 deep), border `#1e293b` (Slate 800), teks `#f8fafc`.
2. **Gagaclo Blue (Aksen Utama Fungsional):**
   - `#2563eb` (Blue 600) untuk aksi primer (Simpan, Tambah Item, tombol aktif).
3. **Warna Status Operasional (Fungsional & Terbatas):**
   - **Amber (`#d97706` / `#fef3c7`):** Box sedang diisi / Sample KTP / Reminder.
   - **Emerald (`#059669` / `#d1fae5`):** Box penuh / Stok ready / Sukses simpan.
   - **Rose (`#e11d48` / `#ffe4e6`):** Box kurang / Hapus / Akses terkunci antar PIC.

---

## 4. Tipografi
- **UI Sans:** Font antarmuka sistem bersih (`Inter`, `-apple-system`, `system-ui`) dengan bobot tebal untuk label box dan status.
- **Monospace Teknis:** `font-mono` digunakan tegas pada identifikasi kode (`SMP-0001`, `MAT-0001`), nomor box (`BOX #37`), nomor PO, dan kuantitas unit.

---

## 5. Komponen & Bentuk
- Sudut lengkung terukur: `rounded-xl` (12px) untuk modal dan card container, `rounded-md` atau `rounded-lg` untuk tombol dan input. Bukan bentuk kapsul penuh (*full pill*) di semua elemen (patuh R-11).
- Bayangan halus (`shadow-xs` / `shadow-2xs`), bukan bayangan gelap tebal di semua tempat (patuh R-12).
- Bahasa UI: Bahasa Indonesia operasional lugas dan jelas (patuh R-15 & R-16).
