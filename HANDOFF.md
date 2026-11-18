# HANDOFF.md — Serah Terima Proyek

Dokumen ini untuk agen koding berikutnya. Terakhir diperbarui: 2026-11-18.

---

## 1. Ringkasan Proyek

- **Produk:** GAGACLO Inventory Management R&D (pendataan sample & material, 72 box, 5 rak, 5 PIC)
- **Stack:** Vite 8 + React 19 + Tailwind CSS v4, JavaScript (bukan TypeScript)
- **Backend:** Supabase (Postgres + Realtime), SDK `@supabase/supabase-js`
- **Deploy:** Vercel, live di https://gagaclo-inventory-rnd.vercel.app/
- **Repo:** https://github.com/rynsrr/gagaclo-inventory-rnd (branch `main`)
- **Lokasi lokal:** `G:\Inventory App Vercel`

## 2. Aturan Proyek yang WAJIB Dibaca

1. `DESIGN.md` — identitas visual (data-first, utilitarian, palet slate + Gagaclo Blue `#0071e3`)
2. `antislop.md` — filter UI R-01..R-38. Yang paling sering menjerat:
   - R-02: **dilarang memakai em dash (—)** di teks UI
   - R-03: mobile tidak boleh overflow, tombol minimal 44px
   - R-26: setiap tombol harus benar-benar berfungsi
   - R-27: setiap tampilan data wajib punya empty/loading/error state
   - R-35: wajib `npm run lint` dan `npm run build` sukses sebelum selesai

## 3. Perintah

```bash
npm install       # dependency
npm run dev       # dev server Vite (default http://localhost:5173)
npm run build     # build produksi
npm run lint      # oxlint
```

`npm run lint` menghasilkan ~215 warning tapi **0 error**. Itu kondisi baseline, bukan regresi.

## 4. Environment

`.env.local` sudah ada di mesin ini dan **tidak di-commit** (`.gitignore` menutup `.env*`).

```
VITE_SUPABASE_URL=https://xtkjzqeqotewaggjfnzr.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_R0UVw4tSyvLWu0muMjOSYA_BNqKWyEv
```

Keduanya kunci publik (anon/publishable), aman untuk read. Untuk operasi tulis, RLS Supabase mengizinkan anon (lihat `supabase_schema.sql`).

## 5. Arsitektur Data

Sumber kebenaran: **Supabase**. localStorage hanya cache.

- **`src/context/InventoryContext.jsx`** (~3700 baris) — inti aplikasi. Semua state, CRUD, sinkronisasi, realtime ada di sini.
- **`src/lib/supabase.js`** — klien + konverter `localXToDb` / `dbXToLocal`.

Tabel cloud:

| Tabel | Isi |
|---|---|
| `items` | Item sample/material |
| `boxes` | Metadata 72 box + baris sistem |
| `transactions` | Log mutasi IN/OUT/BORROW/RETURN/RELOCATE |
| `sequence_counters` | Counter kode atomik |
| `issues` | **Tidak ada di produksi** (404). Fitur isu memakai baris `boxes` 999998. |

Baris sistem di tabel `boxes` (jangan difilter keluar):

| box_number | code | Kegunaan |
|---|---|---|
| 999997 | `SYSTEM_CODE_REVISIONS` | Log revisi kode |
| 999998 | `SYSTEM_ISSUES` | Isu & usulan tim |
| 999999 | `SYSTEM_TIMER` | Timer & target harian |

## 6. Jebakan Penting (baca sebelum menulis kode)

### 6.1 Supabase membatasi 1000 baris per request
`limit(10000)` **dipotong di 1000**. Ini penyebab 609 item di box 17–36 tampak hilang. Gunakan pagination `.range(from, to)` sampai habis (lihat `syncFromSupabase`). Jangan pernah andalkan `limit` besar.

### 6.2 Upsert parsial membuat baris rusak
`upsert({ box_number, is_full })` ketika baris belum ada akan membuat baris baru dengan kolom lain `NULL`, sehingga box hilang dari rak. **Selalu kirim baris lengkap** lewat `localBoxToDb`.

### 6.3 Kode item punya dua jalur
- Manual: `ItemModal` → `addItem`
- Bulk/scanner: `BoxDetailModal.handleDirectSaveAiData` → `addItem(payload)`

`addItem` di context sudah menstamp `inputtedBy`/`createdBy`/tag `inputted_by:`. Jalur baru **harus lewat `addItem`**, jangan insert langsung.

### 6.4 Hitungan qty
`qty`/`jumlah` harus bilangan bulat positif. Satuan `PCS` dinormalisasi jadi `PCE`.

### 6.5 Tanggal
`dateUtils.formatToDDMMYYYY` dipakai luas. `NA` adalah nilai valid (artinya tidak tersedia), bukan error.

## 7. Fitur yang Baru Ditambahkan (2026-11-18)

### 7.1 Impor Excel dengan kode otomatis
- File: `src/components/InventoryImport.jsx`, `src/utils/inventoryExcel.js`
- Kode boleh kosong → sistem alokasi berurutan → simpan → unduh file yang sama dengan kolom Kode terisi
- Kolom **Tanggal** menerima `NA`
- Kredit penginput diambil dari akun login (`currentUser`)

### 7.2 Tab REVISI KODE
- File: `src/components/CodeRevisionLogView.jsx`, `src/utils/codeRevisionHistory.js`
- Mencatat kode lama → kode baru (edit, bentrok auto, impor)
- Backfill histori dari tag `reclassified_from:` dan `sku` transaksi lama
- Tombstone: entri yang dihapus tidak muncul lagi saat backfill
- Disimpan di localStorage + baris `boxes` 999997

## 8. Status Akhir

- Branch `main` bersih, semua perubahan sudah di-push (`94bbc0e`)
- Working tree hanya `.commandcode/` (tooling, jangan di-commit)
- Dev server sudah dimatikan, port 5173 bebas
- 72 baris `boxes` lengkap, 0 baris rusak
- 1672 item di DB, 1508 aktif, sisanya `DELETED` (box_number -999999)

29 box kosong **bukan** kehilangan data: 28 belum pernah punya transaksi IN, 1 (box 62) pernah berisi lalu dihapus 18 Nov 07:43.

## 9. Utang Teknis / Pekerjaan Lanjutan

1. **Kredit penginput di log mutasi tidak permanen.** Tabel `transactions` tidak punya kolom `actor`/`recipient_or_source`, jadi setelah reload dari cloud hanya `pic_name` yang tersisa. Butuh migrasi SQL bila ingin permanen.
2. **67 item box 59 tanpa jejak penginput.** Diimpor 18 Nov 06:14 & 06:18 oleh versi app lama. Perlu konfirmasi user siapa pelakunya untuk backfill tag `inputted_by`.
3. **Celah nomor kode (572 nomor).** Alokasi selalu `max+1`. User sempat ingin mengisi celah dari nomor kecil, lalu meminta HOLD. Bila dilanjutkan, ubah **dua tempat**: `src/utils/sequenceResolver.js` dan fungsi Postgres `get_next_sequence_code` di `supabase_schema.sql`.
4. **112 duplikat kode sample** (56 grup) di box 18,19,27,28,33,34,36. Belum diperbaiki karena user meminta fokus box 14 dulu.
5. **Template `public/template-impor-inventory.xlsx`** sheet Panduan masih menyebut format tanggal lama (belum menyebut `NA`).

## 10. Konvensi Kerja

- Bahasa UI: Indonesia operasional, lugas
- Komentar kode: hanya bila logika tidak jelas dari nama
- Jangan menambah dependency tanpa alasan kuat
- Verifikasi dengan data nyata (query Supabase), bukan asumsi
- Untuk operasi tulis ke produksi: dry run dulu, tampilkan rencana, baru eksekusi
