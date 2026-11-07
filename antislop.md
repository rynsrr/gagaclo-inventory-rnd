# antislop.md

> Anti Slop: Filter Aturan UI untuk AI Coding Agent (R-01 sampai R-38)
> Dokumen ini adalah **filter**, bukan panduan gaya. Arah desain (warna, mood, kepribadian) berasal dari `DESIGN.md`.

---

## Tingkat 1: Hard Gate (Mutlak, Tanpa Pengecualian)
*Melanggar salah satunya dianggap gagal, apa pun alasannya.*

- **R-02**: Dilarang memakai tanda em dash (—) di teks UI. Gunakan koma, titik, titik dua, atau tanda kurung.
- **R-03**: Tampilan mobile harus benar. Tidak boleh ada overflow horizontal, teks terpotong keluar kotak, atau tombol sentuh di bawah 44px.
- **R-17**: Dilarang memunculkan angka atau statistik tanpa sumber data nyata. Jika belum ada data, jangan tampilkan angka karangan.
- **R-18**: Dilarang menampilkan testimoni fiktif (avatar AI, nama acak). Tanpa testimoni asli, bagian testimoni dilarang dibuat.
- **R-23**: Dilarang membuat logo, foto profil, statistik, atau struktur navigasi tanpa instruksi pengguna. Tanyakan dulu atau gunakan placeholder berlabel jelas.
- **R-24**: Tidak boleh ada link atau tombol navbar yang mengarah ke halaman/seksi yang tidak ada atau mati.
- **R-25**: Kontras teks minimal memenuhi standar WCAG AA (4,5:1 untuk teks normal, 3:1 untuk teks besar).
- **R-26**: Setiap tombol dan link harus benar-benar berfungsi (memiliki aksi/event handler nyata), atau dihapus jika tidak berfungsi.
- **R-27**: Setiap komponen UI yang menampilkan data wajib memiliki state kosong (*empty state*), state pemuatan (*loading state*), dan penanganan galat (*error state*).
- **R-28**: FAQ dilarang berisi pertanyaan template generik yang tidak relevan dengan produk.
- **R-32**: Semua elemen interaktif harus bisa dioperasikan melalui keyboard, lengkap dengan indikator fokus yang terlihat jelas.
- **R-33**: Dilarang menambah fitur dengan skrip yang mengubah file sumber lewat string replace rapuh. Fitur harus ditulis langsung dan bersih di kode sumbernya.
- **R-34**: Jika tersedia toggle tema (terang/gelap), kedua mode harus berfungsi penuh dan memiliki kontras yang benar.
- **R-35**: Aplikasi wajib dijalankan dan diuji terlebih dahulu (lint & build) sebelum dinyatakan selesai.
- **R-36**: Dilarang mencantumkan klaim keamanan, kepatuhan, atau performa tanpa bukti nyata (misal "SOC 2" atau "300% lebih cepat").
- **R-37**: Wajib memiliki arah desain terdefinisi (`DESIGN.md` atau brief). Tanpa itu, hasil berstatus "draft without direction" dengan dial default ENERGY 1 / RHYTHM 1 / MOTION 1.
- **R-38**: Semua konten harus nyata atau berupa placeholder berlabel transparan. Bagian kosong jauh lebih baik daripada data palsu yang dikarang.

---

## Tingkat 2: Purpose-Gate (Boleh Asal Ada Alasan Tertulis)
*Teknik di bawah ini gagal hanya jika muncul sebagai default tanpa tujuan jelas, atau alasannya tidak dituliskan.*

- **R-01**: Gradien biru-ungu generik, efek glow, dan tombol biru neon.
- **R-04**: Ikon generik AI (sparkles, bintang, petir, berlian, robot).
- **R-06**: Font monospace raksasa dan label huruf kapital dengan spasi berlebih (*letter-spacing* ekstrem).
- **R-07**: Latar belakang grid teknis atau blueprint tanpa konteks fungsional.
- **R-08**: Tanda panah (→ ↗) di hampir setiap tombol.
- **R-09**: Badge kapsul tanpa fungsi seperti "AI Powered" atau "New".
- **R-10**: Glassmorphism (maksimal 1 sampai 2 elemen saja jika diperlukan secara visual).
- **R-12**: Bayangan (*box-shadow*) di semua komponen secara seragam.
- **R-13**: Efek glow berlebihan (maksimal 1 sampai 2 elemen).
- **R-14**: Kartu fitur yang semuanya identik tanpa variasi hierarki.
- **R-19**: Animasi harus memiliki tujuan UX yang jelas dan sesuai dengan dial MOTION yang ditentukan.
- **R-22**: Ilustrasi generik (Undraw, Storyset, blob 3D hiasan tanpa makna).

---

## Tingkat 3: Quality Locks (Konsistensi & Kualitas)

- **R-05**: Dilarang menggunakan tata letak template AI generik (hero + 3 kartu fitur, "Cara Kerja" 3 langkah klise, bar "Trusted By", footer 4 kolom template).
- **R-11**: Tidak semua elemen interaktif berbentuk pil (*rounded-full*).
- **R-15**: Larangan tombol aksi generik tanpa konteks seperti "Get Started" atau "Learn More". Gunakan kata kerja langsung (misal: "Catat Item", "Cetak Label").
- **R-16**: Dilarang menggunakan kata-kata buzzword kosong seperti "Seamless", "Revolutionary", "Powerful", "Effortless".
- **R-20**: Desain harus memiliki identitas kuat. Jika logo diganti dan desain terasa sama persis dengan template lain, berarti desain terlalu generik.
- **R-21**: Mode gelap dipilih atas alasan utilitas kerja pengguna atau merek, bukan sekadar gaya "tech".
- **R-29**: Palet warna dibatasi maksimal 2 sampai 3 warna inti ditambah 1 warna aksen fungsional.
- **R-30**: Dilarang meniru mentah-mentah antarmuka produk populer (Linear, Vercel, Stripe, Notion) kecuali diminta spesifik.
- **R-31**: **Setiap keputusan desain besar wajib memiliki alasan satu baris tertulis.** Ini adalah inti filter Anti-Slop.

---

## Dial Desain Proyek
Setiap sesi UI menetapkan nilai dial (skala 1 sampai 3):
- **ENERGY (1-3):** Kepadatan data, intensitas warna, dan urgensi visual.
- **RHYTHM (1-3):** Variasi struktur tata letak dan hierarki visual.
- **MOTION (1-3):** Tingkat dan kecepatan animasi/transisi antarmuka.

---

## Delivery Gate
Sebelum tugas diselesaikan, verifikasi 4 blok wajib:
1. **Hard Gate Check:** Pastikan R-02 (tanpa em dash), R-03 (mobile responsive), R-25 (kontras WCAG AA), R-26 (tombol berfungsi) lulus 100%.
2. **Purpose Check:** Pastikan tidak ada teknik visual hiasan tanpa alasan fungsional.
3. **Identity Check:** Antarmuka terasa unik untuk Gagaclo R&D Inventory.
4. **Verification:** Jalankan `npm run lint` & `npm run build` sukses 0 error.
