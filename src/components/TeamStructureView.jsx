import React, { useState } from 'react';
import {
  ShieldCheck,
  Layers,
  Info,
} from 'lucide-react';

export function TeamStructureView() {
  const [activeTab, setActiveTab] = useState('chart'); // 'chart' | 'matrix'

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

            {/* Tab Selector */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('chart')}
                className={`px-4 py-2 rounded-lg text-xs md:text-sm font-semibold transition flex items-center gap-2 cursor-pointer ${
                  activeTab === 'chart'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Bagan Visual Hirarki</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('matrix')}
                className={`px-4 py-2 rounded-lg text-xs md:text-sm font-semibold transition flex items-center gap-2 cursor-pointer ${
                  activeTab === 'matrix'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Matriks RACI Lengkap</span>
              </button>
            </div>
          </div>
        </div>

        {/* 2. Main Content Area */}
        {activeTab === 'chart' && (
          <div className="space-y-6">
            
            {/* Top-Down Hierarchical Flowchart Card */}
            <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 md:p-8 shadow-xl backdrop-blur-sm">
              <div className="flex flex-col items-center">

                {/* ========================================================= */}
                {/* TINGKAT 1 (ATAS): SUPERVISOR SAMPLE R&D (SURURI)           */}
                {/* ========================================================= */}
                <div className="w-full max-w-md">
                  <div className="relative rounded-xl bg-slate-950/90 border-2 border-blue-500 p-5 shadow-xl shadow-blue-500/10 transition hover:shadow-blue-500/20">
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-2.5 py-0.5 rounded text-[11px] font-bold tracking-wider uppercase border border-blue-500/60 text-blue-400 bg-blue-950/50">
                        SPV SAMPLE
                      </span>
                      <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-blue-900 text-blue-200 border border-blue-600">
                        [ C / I ] Consulted &amp; Informed
                      </span>
                    </div>
                    <div className="text-xl md:text-2xl font-black text-white">SURURI</div>
                    <div className="text-xs font-semibold text-blue-300 mt-0.5">Supervisor Sample R&amp;D</div>
                    <div className="mt-3 pt-3 border-t border-slate-800 text-xs text-slate-400 leading-relaxed">
                      Supervisi strategis, kebijakan mutu sampel, persetujuan target besar, dan eskalasi manajemen puncak.
                    </div>
                  </div>
                </div>

                {/* Panah Alur Komando: Sururi ➔ Jasmine */}
                <div className="flex flex-col items-center my-3 relative">
                  <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-emerald-400 rounded-full" />
                  <div className="my-1 px-3 py-1 rounded-full bg-slate-950 border border-emerald-500/60 text-[10px] font-bold text-emerald-300 uppercase tracking-wider shadow-md shadow-emerald-500/10 flex items-center gap-1.5">
                    <span>▼</span>
                    <span>SUPERVISI &amp; ARAHAN KEBIJAKAN</span>
                  </div>
                  <div className="w-1 h-6 bg-gradient-to-b from-emerald-400 to-emerald-500 rounded-full" />
                  <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[9px] border-t-emerald-500 drop-shadow-[0_0_4px_rgba(16,185,129,0.8)]" />
                </div>

                {/* ========================================================= */}
                {/* TINGKAT 2 (BAWAHNYA): LEADER INVENTORY (JASMINE)           */}
                {/* ========================================================= */}
                <div className="w-full max-w-lg">
                  <div className="relative rounded-xl bg-emerald-950/30 border-2 border-emerald-500 p-6 shadow-xl shadow-emerald-500/10 transition hover:shadow-emerald-500/20">
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-2.5 py-0.5 rounded text-[11px] font-bold tracking-wider uppercase border border-emerald-500/60 text-emerald-400 bg-emerald-950/50">
                        LEADER
                      </span>
                      <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-emerald-900 text-emerald-200 border border-emerald-600">
                        [ A ] Accountable
                      </span>
                    </div>
                    <div className="text-2xl md:text-3xl font-black text-white">JASMINE</div>
                    <div className="text-xs font-semibold text-emerald-300 mt-0.5">Inventory Team Leader (Superuser)</div>
                    <div className="mt-3 pt-3 border-t border-emerald-900/50 text-xs text-slate-300 leading-relaxed">
                      Penanggung jawab mutlak target tim, validasi kelengkapan box, monitoring kinerja PIC, dan penugasan tim support.
                    </div>
                  </div>
                </div>

                {/* Panah Alur Cabang: Jasmine ➔ PPIC & Tim Support */}
                <div className="w-full max-w-4xl my-4 relative flex flex-col items-center">
                  <div className="w-1 h-6 bg-emerald-500 rounded-full" />
                  
                  {/* Spine horizontal menghubungkan cabang PPIC & Support */}
                  <div className="w-3/4 h-1 bg-gradient-to-r from-amber-500 via-emerald-500 to-cyan-500 rounded-full relative">
                    {/* Left Drop: Ke PPIC */}
                    <div className="absolute left-0 top-0 w-1 h-6 bg-amber-500 rounded-full" />
                    <div className="absolute left-[-4px] top-6 w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[8px] border-t-amber-500" />
                    
                    {/* Right Drop: Ke Tim Support */}
                    <div className="absolute right-0 top-0 w-1 h-6 bg-cyan-500 rounded-full" />
                    <div className="absolute right-[-4px] top-6 w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[8px] border-t-cyan-500" />
                  </div>

                  {/* Badges di atas alur cabang */}
                  <div className="w-3/4 flex justify-between items-center mt-8 px-2 text-[10px] font-bold tracking-wider uppercase">
                    <span className="px-3 py-1 rounded-full bg-amber-950/90 border border-amber-500/60 text-amber-300 shadow-md">
                      ▼ Target &amp; Penugasan Box
                    </span>
                    <span className="px-3 py-1 rounded-full bg-cyan-950/90 border border-cyan-500/60 text-cyan-300 shadow-md">
                      ▼ Penugasan Asistensi
                    </span>
                  </div>
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
                      <span className="text-xs text-amber-300/80 font-medium">
                        Penanggung Jawab Box
                      </span>
                    </div>

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
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${p.raciBg}`}>
                            [ R ] Resp.
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 3B. WING 3 TIM SUPPORT (MENURUN KE BAWAH) */}
                  <div className="md:col-span-5 rounded-xl bg-slate-950/80 border-2 border-cyan-500/60 p-5 shadow-lg shadow-cyan-500/5 space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1 pb-2 border-b border-cyan-500/30">
                        <span className="text-cyan-400 font-bold text-sm tracking-wide">
                          ⚡ 3 TIM SUPPORT &mdash; [ S ] SUPPORT
                        </span>
                        <span className="text-xs text-cyan-300/80 font-medium">
                          Asistensi Data Entry
                        </span>
                      </div>

                      <div className="flex flex-col gap-2.5 mt-3">
                        {supportList.map((s) => (
                          <div
                            key={s.name}
                            className={`rounded-lg bg-slate-900/90 border-2 ${s.border} px-4 py-3 flex items-center justify-between transition hover:translate-x-1 hover:shadow-lg`}
                          >
                            <div className="flex items-center gap-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${s.badgeBg}`}>
                                {s.code}
                              </span>
                              <div>
                                <div className="text-base font-extrabold text-white">{s.name}</div>
                                <div className="text-[10px] text-cyan-300">Data Entry Assistant</div>
                              </div>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${s.raciBg} shrink-0`}>
                              [ S ] Support
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Banner Alur Asistensi ke PPIC */}
                    <div className="mt-4 p-3 rounded-lg bg-cyan-950/70 border border-cyan-500/50 text-xs text-cyan-200 flex items-center gap-2.5 shadow-inner">
                      <span className="text-cyan-400 text-base font-extrabold animate-pulse">◀</span>
                      <div className="leading-tight">
                        <strong className="text-white font-semibold">Alur Asistensi Lapangan:</strong>
                        <div className="text-cyan-300/90 text-[11px] mt-0.5">Mendampingi &amp; asistensi langsung input fisik bersama 5 PPIC di rak.</div>
                      </div>
                    </div>
                  </div>

                </div>

              </div>
            </div>

            {/* RACI Legend Card */}
            <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-5 md:p-6 shadow-xl">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-400" />
                LEGENDA METODE RACI (ISO 9001:2015 CLAUSE 5.3)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-950/60 border border-emerald-900/40">
                  <span className="px-2 py-1 rounded font-bold bg-emerald-950 text-emerald-300 border border-emerald-600 shrink-0">
                    [ A ] ACCOUNTABLE
                  </span>
                  <div className="text-slate-300 leading-relaxed">
                    <strong className="text-white">Jasmine (Leader):</strong> Pemilik keputusan mutlak &amp; penanggung jawab hasil akhir target tim harian, status kelengkapan box, dan alur kerja.
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-950/60 border border-amber-900/40">
                  <span className="px-2 py-1 rounded font-bold bg-amber-950 text-amber-300 border border-amber-600 shrink-0">
                    [ R ] RESPONSIBLE
                  </span>
                  <div className="text-slate-300 leading-relaxed">
                    <strong className="text-white">5 PPIC (Royan, Cynara, Ami, Ryan, Hanami):</strong> Pelaksana inti yang bertanggung jawab penuh atas fisik dan data pada box yang telah ditentukan.
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-950/60 border border-cyan-900/40">
                  <span className="px-2 py-1 rounded font-bold bg-cyan-950 text-cyan-300 border border-cyan-600 shrink-0">
                    [ S ] SUPPORT
                  </span>
                  <div className="text-slate-300 leading-relaxed">
                    <strong className="text-white">3 Support (Sheva, Ade, Tri):</strong> Tenaga pendukung lapangan yang membantu percepatan proses input data fisik bersama PPIC.
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-950/60 border border-blue-900/40">
                  <span className="px-2 py-1 rounded font-bold bg-blue-950 text-blue-300 border border-blue-600 shrink-0">
                    [ C / I ] CONSULTED &amp; INFORMED
                  </span>
                  <div className="text-slate-300 leading-relaxed">
                    <strong className="text-white">Sururi (SPV Sample):</strong> Konsultasi kebijakan tingkat pimpinan, eskalasi manajemen, serta penerima laporan eksekutif berkala.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: RACI Matrix Table */}
        {activeTab === 'matrix' && (
          <div className="rounded-2xl bg-slate-900/70 border border-slate-800 p-6 md:p-8 shadow-xl overflow-x-auto">
            <h2 className="text-lg font-bold text-white mb-4">Matriks Wewenang &amp; Tanggung Jawab Operasional (RACI)</h2>
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-950/80 text-slate-300 text-xs uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Aktivitas / Alur Proses</th>
                  <th className="py-3 px-4 text-center">Sururi (SPV)</th>
                  <th className="py-3 px-4 text-center">Jasmine (Leader)</th>
                  <th className="py-3 px-4 text-center">5 PPIC</th>
                  <th className="py-3 px-4 text-center">3 Support</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300 text-xs md:text-sm">
                <tr className="hover:bg-slate-800/40 transition">
                  <td className="py-3.5 px-4 font-semibold text-white">Penetapan Kebijakan &amp; Alokasi Box Inventory</td>
                  <td className="py-3.5 px-4 text-center font-bold text-blue-400">Accountable [A]</td>
                  <td className="py-3.5 px-4 text-center font-bold text-emerald-400">Consulted [C]</td>
                  <td className="py-3.5 px-4 text-center text-slate-400">Informed [I]</td>
                  <td className="py-3.5 px-4 text-center text-slate-400">Informed [I]</td>
                </tr>
                <tr className="hover:bg-slate-800/40 transition">
                  <td className="py-3.5 px-4 font-semibold text-white">Penentuan Target Harian Tim &amp; PIC (PCE/Hari)</td>
                  <td className="py-3.5 px-4 text-center text-slate-400">Informed [I]</td>
                  <td className="py-3.5 px-4 text-center font-bold text-emerald-400">Accountable [A]</td>
                  <td className="py-3.5 px-4 text-center font-bold text-amber-400">Responsible [R]</td>
                  <td className="py-3.5 px-4 text-center font-bold text-teal-400">Responsible [R]</td>
                </tr>
                <tr className="hover:bg-slate-800/40 transition">
                  <td className="py-3.5 px-4 font-semibold text-white">Kepemilikan Fisik Box Sample (Box Owner)</td>
                  <td className="py-3.5 px-4 text-center text-slate-400">Informed [I]</td>
                  <td className="py-3.5 px-4 text-center font-bold text-emerald-400">Accountable [A]</td>
                  <td className="py-3.5 px-4 text-center font-bold text-amber-400">Responsible [R]</td>
                  <td className="py-3.5 px-4 text-center font-bold text-teal-400">Support [S]</td>
                </tr>
                <tr className="hover:bg-slate-800/40 transition">
                  <td className="py-3.5 px-4 font-semibold text-white">Input Data &amp; Verifikasi Fisik Sampel</td>
                  <td className="py-3.5 px-4 text-center text-slate-400">Informed [I]</td>
                  <td className="py-3.5 px-4 text-center font-bold text-emerald-400">Accountable [A]</td>
                  <td className="py-3.5 px-4 text-center font-bold text-amber-400">Responsible [R]</td>
                  <td className="py-3.5 px-4 text-center font-bold text-teal-400">Responsible [R]</td>
                </tr>
                <tr className="hover:bg-slate-800/40 transition">
                  <td className="py-3.5 px-4 font-semibold text-white">Pencatatan Kirim Keluar (Dispatch Outgoing)</td>
                  <td className="py-3.5 px-4 text-center text-slate-400">Informed [I]</td>
                  <td className="py-3.5 px-4 text-center font-bold text-emerald-400">Accountable [A]</td>
                  <td className="py-3.5 px-4 text-center font-bold text-amber-400">Responsible [R]</td>
                  <td className="py-3.5 px-4 text-center text-slate-400">Informed [I]</td>
                </tr>
                <tr className="hover:bg-slate-800/40 transition">
                  <td className="py-3.5 px-4 font-semibold text-white">Perbantuan Fisik &amp; Input Cross-Box Antar PIC</td>
                  <td className="py-3.5 px-4 text-center text-slate-400">Informed [I]</td>
                  <td className="py-3.5 px-4 text-center font-bold text-emerald-400">Accountable [A]</td>
                  <td className="py-3.5 px-4 text-center font-bold text-amber-400">Responsible [R]</td>
                  <td className="py-3.5 px-4 text-center font-bold text-cyan-400">Support [S]</td>
                </tr>
                <tr className="hover:bg-slate-800/40 transition">
                  <td className="py-3.5 px-4 font-semibold text-white">Eskalasi Kendala Stok &amp; Audit Mutu Lapangan</td>
                  <td className="py-3.5 px-4 text-center font-bold text-blue-400">Consulted [C]</td>
                  <td className="py-3.5 px-4 text-center font-bold text-emerald-400">Accountable [A]</td>
                  <td className="py-3.5 px-4 text-center font-bold text-amber-400">Responsible [R]</td>
                  <td className="py-3.5 px-4 text-center text-slate-400">Informed [I]</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
}
export default TeamStructureView;
