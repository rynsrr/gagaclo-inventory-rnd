import React from 'react';
import {
  FileText,
  Clock,
  Send,
  Keyboard,
  Printer,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react';

export function TeamStructureView() {
  // Daftar 5 PPIC (Responsible)
  const ppicList = [
    {
      name: 'Royan',
      code: 'PPIC #1',
      border: 'border-blue-500/80',
      badgeBg: 'bg-blue-900/60 text-blue-300 border border-blue-500/40',
      raciBg: 'bg-blue-950 text-blue-300 border border-blue-600/40',
      glow: 'shadow-blue-500/10',
    },
    {
      name: 'Cynara',
      code: 'PPIC #2',
      border: 'border-purple-500/80',
      badgeBg: 'bg-purple-900/60 text-purple-300 border border-purple-500/40',
      raciBg: 'bg-purple-950 text-purple-300 border border-purple-600/40',
      glow: 'shadow-purple-500/10',
    },
    {
      name: 'Ami',
      code: 'PPIC #3',
      border: 'border-emerald-500/80',
      badgeBg: 'bg-emerald-900/60 text-emerald-300 border border-emerald-500/40',
      raciBg: 'bg-emerald-950 text-emerald-300 border border-emerald-600/40',
      glow: 'shadow-emerald-500/10',
    },
    {
      name: 'Ryan',
      code: 'PPIC #4',
      border: 'border-amber-500/80',
      badgeBg: 'bg-amber-900/60 text-amber-300 border border-amber-500/40',
      raciBg: 'bg-amber-950 text-amber-300 border border-amber-600/40',
      glow: 'shadow-amber-500/10',
    },
    {
      name: 'Hanami',
      code: 'PPIC #5',
      border: 'border-rose-500/80',
      badgeBg: 'bg-rose-900/60 text-rose-300 border border-rose-500/40',
      raciBg: 'bg-rose-950 text-rose-300 border border-rose-600/40',
      glow: 'shadow-rose-500/10',
    },
  ];

  // Daftar 3 Support Team (Support)
  const supportList = [
    {
      name: 'Sheva',
      code: 'SUPPORT #1',
      border: 'border-cyan-500/80',
      badgeBg: 'bg-cyan-900/60 text-cyan-300 border border-cyan-500/40',
      raciBg: 'bg-cyan-950 text-cyan-300 border border-cyan-600/40',
    },
    {
      name: 'Ade',
      code: 'SUPPORT #2',
      border: 'border-teal-500/80',
      badgeBg: 'bg-teal-900/60 text-teal-300 border border-teal-500/40',
      raciBg: 'bg-teal-950 text-teal-300 border border-teal-600/40',
    },
    {
      name: 'Tri',
      code: 'SUPPORT #3',
      border: 'border-sky-500/80',
      badgeBg: 'bg-sky-900/60 text-sky-300 border border-sky-500/40',
      raciBg: 'bg-sky-950 text-sky-300 border border-sky-600/40',
    },
  ];

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 p-4 md:p-6 lg:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* 1. Header Minimalis & Tab Selector */}
        <div className="relative rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 p-5 md:p-6 shadow-2xl overflow-hidden">
          <div
            className="absolute inset-0 opacity-15 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, #38bdf8 1px, transparent 0)',
              backgroundSize: '24px 24px',
            }}
          />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-white">
              STRUKTUR ORGANISASI TIM INVENTORY SAMPLE
            </h1>
          </div>
        </div>

        {/* 2. Main Content Area */}
        <div className="space-y-6">
          
          {/* Top-Down Hierarchical Flowchart Card */}
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 md:p-8 shadow-xl backdrop-blur-sm">
              <div className="flex flex-col items-center">

                {/* ========================================================= */}
                {/* TINGKAT 1 (ATAS): SUPERVISOR SAMPLE R&D (SURURI)           */}
                {/* ========================================================= */}
                <div className="w-full max-w-lg">
                  <div className="relative rounded-xl bg-slate-950/90 border-2 border-blue-500 p-5 sm:p-6 shadow-xl shadow-blue-500/10 transition hover:shadow-blue-500/20">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-xl md:text-2xl font-black text-white leading-tight">SURURI</div>
                        <div className="text-xs font-semibold text-blue-300 mt-1">Supervisor Sample R&amp;D</div>
                      </div>
                      <span className="px-3 py-1 rounded text-[11px] font-bold bg-blue-900 text-blue-200 border border-blue-600 shrink-0">
                        [ C / I ] Consulted &amp; Informed
                      </span>
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-800 text-xs text-slate-300 leading-relaxed space-y-1">
                      <div className="flex items-start gap-1.5">
                        <span className="text-blue-400 font-bold select-none">-</span>
                        <span>Merancang alur kerja pendataan</span>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <span className="text-blue-400 font-bold select-none">-</span>
                        <span>Memantau kinerja tim</span>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <span className="text-blue-400 font-bold select-none">-</span>
                        <span>Menerima laporan input inventory</span>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <span className="text-blue-400 font-bold select-none">-</span>
                        <span>Me-review dan meng-improve fasilitas penunjang operasional</span>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <span className="text-blue-400 font-bold select-none">-</span>
                        <span>Follow-up kendala ke atasan</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Panah Alur Komando: Sururi ➔ Jasmine (Garis Bersih Tanpa Teks di Tengah) */}
                <div className="flex flex-col items-center my-3 relative">
                  <div className="w-1 h-8 bg-gradient-to-b from-blue-500 to-emerald-500 rounded-full" />
                  <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[9px] border-t-emerald-500 drop-shadow-[0_0_4px_rgba(16,185,129,0.8)]" />
                </div>

                {/* ========================================================= */}
                {/* TINGKAT 2 (BAWAHNYA): LEADER INVENTORY (JASMINE)           */}
                {/* ========================================================= */}
                <div className="w-full max-w-lg">
                  <div className="relative rounded-xl bg-emerald-950/30 border-2 border-emerald-500 p-5 sm:p-6 shadow-xl shadow-emerald-500/10 transition hover:shadow-emerald-500/20">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-xl md:text-2xl font-black text-white leading-tight">JASMINE</div>
                        <div className="text-xs font-semibold text-emerald-300 mt-1">Inventory Team Leader (Superuser)</div>
                      </div>
                      <span className="px-3 py-1 rounded text-[11px] font-bold bg-emerald-900 text-emerald-200 border border-emerald-600 shrink-0">
                        [ A ] Accountable
                      </span>
                    </div>
                    <div className="mt-3 pt-3 border-t border-emerald-900/50 text-xs text-slate-300 leading-relaxed space-y-1">
                      <div className="flex items-start gap-1.5">
                        <span className="text-emerald-400 font-bold select-none">-</span>
                        <span>Menetapkan &amp; membagi target harian ke 8 personil</span>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <span className="text-emerald-400 font-bold select-none">-</span>
                        <span>Memonitor progres input dan validasi kelengkapan box</span>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <span className="text-emerald-400 font-bold select-none">-</span>
                        <span>Eskalasi kendala operasional</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Panah Alur Cabang: Jasmine ➔ PPIC & Tim Support (Garis Bersih) */}
                <div className="w-full max-w-4xl my-3 relative flex flex-col items-center">
                  <div className="w-1 h-6 bg-emerald-500 rounded-full" />
                  
                  {/* Spine horizontal menghubungkan cabang PPIC & Support */}
                  <div className="w-3/4 h-1 bg-gradient-to-r from-amber-500 via-emerald-500 to-cyan-500 rounded-full relative">
                    {/* Left Drop: Ke PPIC */}
                    <div className="absolute left-0 top-0 flex flex-col items-center -translate-x-1/2">
                      <div className="w-1 h-6 bg-amber-500" />
                      <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[8px] border-t-amber-500" />
                    </div>
                    
                    {/* Right Drop: Ke Tim Support */}
                    <div className="absolute right-0 top-0 flex flex-col items-center translate-x-1/2">
                      <div className="w-1 h-6 bg-cyan-500" />
                      <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[8px] border-t-cyan-500" />
                    </div>
                  </div>

                  <div className="h-4" />
                </div>

                {/* ========================================================= */}
                {/* TINGKAT 3 (DI BAWAHNYA LAGI): PPIC & TIM SUPPORT          */}
                {/* ========================================================= */}
                <div className="w-full grid grid-cols-1 md:grid-cols-12 gap-5 mt-2">

                  {/* 3A. WING 5 PPIC (MENURUN KE BAWAH) */}
                  <div className="md:col-span-7 rounded-xl bg-slate-950/80 border-2 border-amber-500/60 p-5 shadow-lg shadow-amber-500/5 space-y-3">
                    <div className="flex items-center justify-between mb-1 pb-2 border-b border-amber-500/30">
                      <span className="text-amber-400 font-bold text-sm tracking-wide">
                        📦 5 PPIC &mdash; [ R ] RESPONSIBLE (PENANGGUNG JAWAB UTAMA BOX)
                      </span>
                    </div>

                    {/* Kartu 5 Personil PPIC */}
                    <div className="flex flex-col gap-2.5">
                      {ppicList.map((p) => (
                        <div
                          key={p.name}
                          className={`rounded-lg bg-slate-900/90 border-2 ${p.border} px-4 py-3 flex items-center justify-between transition hover:translate-x-1 hover:shadow-lg`}
                        >
                          <div className="flex items-center gap-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${p.badgeBg}`}>
                              {p.code}
                            </span>
                            <div className="text-base font-extrabold text-white">{p.name}</div>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${p.raciBg} shrink-0`}>
                            [ R ] Responsible
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Rincian Tugas 5 PPIC (DI BAGIAN BAWAH) */}
                    <div className="rounded-lg bg-amber-950/30 border border-amber-500/20 p-3 text-xs text-slate-300 leading-relaxed space-y-1.5 pt-3">
                      <div className="flex items-start gap-1.5">
                        <span className="text-amber-400 font-bold select-none">-</span>
                        <span>Mengumpulkan &amp; mendata sampel yang menjadi tanggung jawabnya, atau mendelegasikannya ke Tim Support lengkap dengan info Buyer, lokasi, dan jenis sampel</span>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <span className="text-amber-400 font-bold select-none">-</span>
                        <span>Melakukan pendataan &amp; input sampel fisik secara akurat ke dalam sistem</span>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <span className="text-amber-400 font-bold select-none">-</span>
                        <span>Mencapai target kuota harian personal</span>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <span className="text-amber-400 font-bold select-none">-</span>
                        <span>Memverifikasi fisik sampel saat box penuh melalui cetak list sample, lalu menyerahkannya ke Leader untuk verifikasi checklist &amp; tanda tangan</span>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <span className="text-amber-400 font-bold select-none">-</span>
                        <span>Melaporkan segera ke Leader apabila ditemukan kendala operasional lapangan</span>
                      </div>
                    </div>
                  </div>

                  {/* 3B. WING 3 TIM SUPPORT (MENURUN KE BAWAH) */}
                  <div className="md:col-span-5 rounded-xl bg-slate-950/80 border-2 border-cyan-500/60 p-5 shadow-lg shadow-cyan-500/5 space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1 pb-2 border-b border-cyan-500/30">
                        <span className="text-cyan-400 font-bold text-sm tracking-wide">
                          ⚡ 3 TIM SUPPORT &mdash; [ S ] SUPPORT
                        </span>
                      </div>

                      {/* Kartu 3 Personil Support */}
                      <div className="flex flex-col gap-2.5 mt-3 mb-3">
                        {supportList.map((s) => (
                          <div
                            key={s.name}
                            className={`rounded-lg bg-slate-900/90 border-2 ${s.border} px-4 py-3 flex items-center justify-between transition hover:translate-x-1 hover:shadow-lg`}
                          >
                            <div className="flex items-center gap-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${s.badgeBg}`}>
                                {s.code}
                              </span>
                              <div className="text-base font-extrabold text-white">{s.name}</div>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${s.raciBg} shrink-0`}>
                              [ S ] Support
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Rincian Tugas 3 Tim Support (DI BAGIAN BAWAH) */}
                      <div className="rounded-lg bg-cyan-950/30 border border-cyan-500/20 p-3 text-xs text-slate-300 leading-relaxed space-y-1.5 pt-3">
                        <div className="flex items-start gap-1.5">
                          <span className="text-cyan-400 font-bold select-none">-</span>
                          <span>Menerima sampel fisik yang didelegasikan oleh PPIC beserta kelengkapan keterangan Buyer, lokasi rak/box, dan jenis sampel</span>
                        </div>
                        <div className="flex items-start gap-1.5">
                          <span className="text-cyan-400 font-bold select-none">-</span>
                          <span>Melakukan input data sampel ke dalam sistem secara cepat, teliti, dan akurat berdasarkan arahan PPIC</span>
                        </div>
                        <div className="flex items-start gap-1.5">
                          <span className="text-cyan-400 font-bold select-none">-</span>
                          <span>Mencapai target kuota harian asistensi (target harian personal tim support)</span>
                        </div>
                        <div className="flex items-start gap-1.5">
                          <span className="text-cyan-400 font-bold select-none">-</span>
                          <span>Membantu penataan fisik sampel di rak/box dan membantu persiapan fisik sebelum box diverifikasi penuh</span>
                        </div>
                        <div className="flex items-start gap-1.5">
                          <span className="text-cyan-400 font-bold select-none">-</span>
                          <span>Menginfokan segera ke PPIC terkait atau Leader jika data sampel tidak lengkap, barcode bermasalah, atau terjadi kendala teknis</span>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

              </div>
            </div>

            {/* ========================================================= */}
            {/* 3. STANDAR OPERASIONAL PROSEDUR (SOP) DI BAWAH BAGAN       */}
            {/* ========================================================= */}
            <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 md:p-8 shadow-xl backdrop-blur-sm space-y-6">
              
              {/* Header SOP */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-slate-800/80 pb-5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base md:text-lg font-bold tracking-tight text-white flex items-center gap-2">
                      STANDAR OPERASIONAL PROSEDUR (SOP) PENDATAAN &amp; KELENGKAPAN BOX
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Alur kerja pendataan, verifikasi fisik box penuh, dan kontrol mutu inventory sample R&amp;D
                    </p>
                  </div>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700 self-start md:self-auto">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                  <span>5 Tahap Pelaksanaan</span>
                </div>
              </div>

              {/* Baris 1: Tahap 01, 02, 03 (3 Kolom Responsif) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Tahap 01 */}
                <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-4 flex flex-col justify-between hover:border-slate-700 transition">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-700/50">
                        TAHAP 01
                      </span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-blue-400" /> 08:00 - 08:30 WIB
                      </span>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Briefing &amp; Target Harian</h3>
                      <p className="text-[11px] text-blue-300 mt-0.5">PIC: Leader (Jasmine) &amp; SPV (Sururi)</p>
                    </div>
                    <div className="space-y-1.5 text-xs text-slate-300 pt-2 border-t border-slate-800/80">
                      <div className="flex items-start gap-1.5">
                        <span className="text-blue-400 font-bold select-none">-</span>
                        <span>Leader koordinasi dengan SPV menentukan target harian tim (cth: 400 PCE/hari).</span>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <span className="text-blue-400 font-bold select-none">-</span>
                        <span>Leader bagi kuota ke 8 personil (5 PPIC @52 PCE, 3 Support @47 PCE).</span>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <span className="text-blue-400 font-bold select-none">-</span>
                        <span>Penetapan prioritas rak &amp; box yang dikerjakan hari ini.</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tahap 02 */}
                <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-4 flex flex-col justify-between hover:border-slate-700 transition">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-700/50">
                        TAHAP 02
                      </span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Send className="w-3 h-3 text-purple-400" /> 08:30 - 10:00 WIB
                      </span>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Pengumpulan &amp; Delegasi</h3>
                      <p className="text-[11px] text-purple-300 mt-0.5">PIC: PPIC &amp; Tim Support</p>
                    </div>
                    <div className="space-y-1.5 text-xs text-slate-300 pt-2 border-t border-slate-800/80">
                      <div className="flex items-start gap-1.5">
                        <span className="text-purple-400 font-bold select-none">-</span>
                        <span>PPIC kumpulkan sampel fisik sesuai box/rak yang menjadi tanggung jawabnya.</span>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <span className="text-purple-400 font-bold select-none">-</span>
                        <span>Delegasi ke Support wajib sertakan: <b>Nomor Buyer</b>, <b>Lokasi Rak &amp; Box</b>, dan <b>Jenis Sampel</b>.</span>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <span className="text-purple-400 font-bold select-none">-</span>
                        <span>Tim Support periksa fisik sampel sebelum proses input dimulai.</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tahap 03 */}
                <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-4 flex flex-col justify-between hover:border-slate-700 transition">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700/50">
                        TAHAP 03
                      </span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Keyboard className="w-3 h-3 text-amber-400" /> Jam Operasional
                      </span>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Standar Input Sistem Web</h3>
                      <p className="text-[11px] text-amber-300 mt-0.5">PIC: PPIC &amp; Tim Support</p>
                    </div>
                    <div className="space-y-1.5 text-xs text-slate-300 pt-2 border-t border-slate-800/80">
                      <div className="flex items-start gap-1.5">
                        <span className="text-amber-400 font-bold select-none">-</span>
                        <span>Input data sampel langsung ke box terkait di sistem web Gagaclo Inventory.</span>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <span className="text-amber-400 font-bold select-none">-</span>
                        <span>Wajib gunakan <b>HURUF KAPITAL (UPPERCASE)</b> (Style, Buyer, Art, Size, Color).</span>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <span className="text-amber-400 font-bold select-none">-</span>
                        <span>Satuan standar kuantiti adalah <b>PCE</b> (Piece). Fisik sampel ditata rapi ke box.</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Baris 2: Tahap 04 (Krusial - Highlighted) & Tahap 05 (Rekap Sore) */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                
                {/* Tahap 04: SOP Krusial Validasi Box Penuh */}
                <div className="md:col-span-7 rounded-xl bg-gradient-to-br from-emerald-950/40 via-slate-950/90 to-slate-950 border-2 border-emerald-500/50 p-4 sm:p-5 shadow-lg shadow-emerald-950/30">
                  <div className="flex flex-col h-full justify-between space-y-3">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-900/80 text-emerald-200 border border-emerald-500/60">
                          TAHAP 04 — SOP KRUSIAL
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-600/40 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Wajib Checklist &amp; TTD
                        </span>
                      </div>
                      <div className="mt-2.5">
                        <h3 className="text-sm md:text-base font-bold text-white flex items-center gap-1.5">
                          <Printer className="w-4 h-4 text-emerald-400" />
                          Verifikasi Box Penuh &amp; Validasi Fisik
                        </h3>
                        <p className="text-[11px] text-emerald-300 mt-0.5">PIC: PPIC (Responsible) &amp; Leader (Accountable)</p>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs text-slate-200 pt-2.5 border-t border-emerald-500/20">
                      <div className="flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                        <span>Tandai status box menjadi <b>"Penuh"</b> di sistem web saat kapasitas maksimal tercapai.</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                        <span>PPIC klik tombol <b>"Print Sample List"</b> untuk mencetak rekap fisik sampel box tersebut.</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                        <span>Lakukan crosscheck fisik sampel 1 per 1 bersama Support sesuai lembar cetak (Style, Buyer, Qty).</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">4</span>
                        <span>Serahkan lembar cetak ke <b>Leader (Jasmine)</b> untuk verifikasi checklist &amp; tanda tangan validasi.</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">5</span>
                        <span className="text-emerald-300 font-medium">Box resmi disegel fisik &amp; sistem; isi box terkunci dari perubahan sembarangan.</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tahap 05: Rekap Harian & Eskalasi Kendala */}
                <div className="md:col-span-5 rounded-xl bg-slate-950/70 border border-slate-800 p-4 sm:p-5 flex flex-col justify-between hover:border-slate-700 transition">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-700/50">
                        TAHAP 05
                      </span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-sky-400" /> 16:00 - 16:30 WIB
                      </span>
                    </div>
                    <div>
                      <h3 className="text-sm md:text-base font-bold text-white">Rekap Harian &amp; Eskalasi Kendala</h3>
                      <p className="text-[11px] text-sky-300 mt-0.5">PIC: Leader (Jasmine) &amp; SPV (Sururi)</p>
                    </div>
                    <div className="space-y-2 text-xs text-slate-300 pt-2.5 border-t border-slate-800/80">
                      <div className="flex items-start gap-1.5">
                        <span className="text-sky-400 font-bold select-none">-</span>
                        <span>Leader monitor capaian target 8 personil via banner sistem dan rekap tim.</span>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <span className="text-sky-400 font-bold select-none">-</span>
                        <span>Leader salin teks rekap (<b>Salin Rekap Chat</b>) dan laporkan ke grup chat serta ke SPV.</span>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <span className="text-sky-400 font-bold select-none">-</span>
                        <span>Kendala sistem atau selisih fisik segera dilaporkan; SPV menindaklanjuti kendala fasilitas ke manajemen atasan.</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Aturan Kedisiplinan Operasional (Callout Bar) */}
              <div className="rounded-xl bg-rose-950/20 border border-rose-500/30 p-4 text-xs">
                <div className="flex items-center gap-2 mb-2.5 text-rose-300 font-bold">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>ATURAN KEDISIPLINAN OPERASIONAL &amp; INTEGRITAS DATA</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-slate-300">
                  <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                    <span className="text-rose-400 font-semibold block mb-0.5">1. Dilarang Pindah Tanpa Update</span>
                    Dilarang memindahkan sampel fisik antar-box tanpa memperbarui data di sistem web terlebih dahulu.
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                    <span className="text-rose-400 font-semibold block mb-0.5">2. Integritas Box Penuh Bersegel</span>
                    Box penuh yang telah diverifikasi &amp; bertanda tangan Leader tidak boleh diubah/dikurangi kecuali via Dispatch Outgoing.
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                    <span className="text-rose-400 font-semibold block mb-0.5">3. Batas Cut-Off Laporan</span>
                    Pencatatan capaian harian dan pengiriman rekap grup chat ditutup maksimal pukul 16:30 WIB setiap hari kerja.
                  </div>
                </div>
              </div>

            </div>
        </div>
      </div>
    </div>
  );
}
export default TeamStructureView;
