import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import {
  Users,
  ShieldCheck,
  Award,
  Layers,
  ArrowRight,
  ExternalLink,
  Info,
  CheckCircle2,
  Box as BoxIcon,
  Sparkles,
} from 'lucide-react';

export function TeamStructureView({ onSelectPic, onNavigateTo3D }) {
  const { boxes, items } = useInventory();
  const [activeTab, setActiveTab] = useState('chart'); // 'chart' | 'matrix' | 'boxes'

  // Perhitungan box per PPIC
  const ppicStats = [
    {
      name: 'Royan',
      code: 'PPIC #1',
      boxes: [1, 2, 3, 16, 17, 18, 19, 20, 37, 38, 47, 49, 50, 61, 62, 72],
      rackBreakdown: 'Rak 1 (4), Rak 2 (4), Rak 3 (3), Rak 4 (2), Rak 5 (3)',
      border: 'border-blue-500/80',
      badgeBg: 'bg-blue-900/60 text-blue-300 border border-blue-500/40',
      raciBg: 'bg-blue-950 text-blue-300 border border-blue-600/40',
      glow: 'shadow-blue-500/10',
    },
    {
      name: 'Cynara',
      code: 'PPIC #2',
      boxes: [4, 5, 6, 21, 22, 23, 24, 39, 40, 48, 51, 52, 63, 64],
      rackBreakdown: 'Rak 1 (3), Rak 2 (4), Rak 3 (3), Rak 4 (2), Rak 5 (2)',
      border: 'border-purple-500/80',
      badgeBg: 'bg-purple-900/60 text-purple-300 border border-purple-500/40',
      raciBg: 'bg-purple-950 text-purple-300 border border-purple-600/40',
      glow: 'shadow-purple-500/10',
    },
    {
      name: 'Ami',
      code: 'PPIC #3',
      boxes: [7, 8, 9, 25, 26, 27, 28, 41, 42, 53, 54, 59, 65, 66],
      rackBreakdown: 'Rak 1 (3), Rak 2 (4), Rak 3 (2), Rak 4 (3), Rak 5 (2)',
      border: 'border-emerald-500/80',
      badgeBg: 'bg-emerald-900/60 text-emerald-300 border border-emerald-500/40',
      raciBg: 'bg-emerald-950 text-emerald-300 border border-emerald-600/40',
      glow: 'shadow-emerald-500/10',
    },
    {
      name: 'Ryan',
      code: 'PPIC #4',
      boxes: [10, 11, 12, 29, 30, 31, 32, 43, 44, 55, 56, 60, 67, 68],
      rackBreakdown: 'Rak 1 (3), Rak 2 (4), Rak 3 (2), Rak 4 (3), Rak 5 (2)',
      border: 'border-amber-500/80',
      badgeBg: 'bg-amber-900/60 text-amber-300 border border-amber-500/40',
      raciBg: 'bg-amber-950 text-amber-300 border border-amber-600/40',
      glow: 'shadow-amber-500/10',
    },
    {
      name: 'Hanami',
      code: 'PPIC #5',
      boxes: [13, 14, 15, 33, 34, 35, 36, 45, 46, 57, 58, 69, 70, 71],
      rackBreakdown: 'Rak 1 (3), Rak 2 (4), Rak 3 (2), Rak 4 (2), Rak 5 (3)',
      border: 'border-rose-500/80',
      badgeBg: 'bg-rose-900/60 text-rose-300 border border-rose-500/40',
      raciBg: 'bg-rose-950 text-rose-300 border border-rose-600/40',
      glow: 'shadow-rose-500/10',
    },
  ];

  const supportTeam = [
    {
      name: 'Sheva',
      code: 'SUPPORT #1',
      role: 'Data Entry Assistant',
      desc: 'Membantu fisik & input sampel perbantuan di box 5 PPIC',
      border: 'border-teal-500/80',
      badgeBg: 'bg-teal-900/60 text-teal-300 border border-teal-500/40',
    },
    {
      name: 'Ade',
      code: 'SUPPORT #2',
      role: 'Data Entry Assistant',
      desc: 'Membantu fisik & input sampel perbantuan di box 5 PPIC',
      border: 'border-cyan-500/80',
      badgeBg: 'bg-cyan-900/60 text-cyan-300 border border-cyan-500/40',
    },
    {
      name: 'Tri',
      code: 'SUPPORT #3',
      role: 'Data Entry Assistant',
      desc: 'Membantu fisik & input sampel perbantuan di box 5 PPIC',
      border: 'border-sky-500/80',
      badgeBg: 'bg-sky-900/60 text-sky-300 border border-sky-500/40',
    },
  ];

  return (
    <div className="w-full min-h-[calc(100vh-140px)] bg-[#090d16] text-slate-100 p-4 md:p-8 font-sans selection:bg-blue-600 selection:text-white">
      <div className="max-w-[1600px] mx-auto space-y-6">

        {/* 1. Header Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-slate-900/80 border border-slate-700/60 p-6 md:p-8 shadow-2xl backdrop-blur-md">
          {/* Subtle Grid overlay */}
          <div
            className="absolute inset-0 opacity-15 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, #38bdf8 1px, transparent 0)',
              backgroundSize: '24px 24px',
            }}
          />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <span className="px-3 py-1 rounded-md bg-blue-600 text-white font-bold text-xs tracking-wider uppercase shadow-sm">
                  GAGACLO R&D
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-700">
                  ISO 9001:2015 Clause 5.3
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-400 text-xs font-semibold border border-emerald-700/50">
                  RACI Matrix
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight text-white">
                STRUKTUR ORGANISASI TIM INVENTORY SAMPLE
              </h1>
              <p className="text-sm md:text-base text-slate-400 font-normal">
                Model Lini &amp; Staf &bull; Rantai Komando, Akuntabilitas, dan Pembagian 72 Box Tersebar
              </p>
            </div>

            {/* Quick Status Pill */}
            <div className="flex flex-row sm:flex-col sm:items-end justify-between items-center bg-slate-950/70 border border-emerald-500/40 rounded-xl px-5 py-3 shadow-inner">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  STATUS RESMI
                </span>
              </div>
              <div className="text-xs text-slate-300 font-medium mt-1">
                72 Box &bull; 5 Rak &bull; 9 Personil
              </div>
            </div>
          </div>

          {/* Tab Selector */}
          <div className="relative z-10 flex items-center gap-2 mt-6 pt-4 border-t border-slate-800/80">
            <button
              onClick={() => setActiveTab('chart')}
              className={`px-4 py-2 rounded-lg text-xs md:text-sm font-semibold transition flex items-center gap-2 ${
                activeTab === 'chart'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Bagan Visual Lini &amp; Staf</span>
            </button>
            <button
              onClick={() => setActiveTab('matrix')}
              className={`px-4 py-2 rounded-lg text-xs md:text-sm font-semibold transition flex items-center gap-2 ${
                activeTab === 'matrix'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Matriks RACI Lengkap</span>
            </button>
            <button
              onClick={() => setActiveTab('boxes')}
              className={`px-4 py-2 rounded-lg text-xs md:text-sm font-semibold transition flex items-center gap-2 ${
                activeTab === 'boxes'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <BoxIcon className="w-4 h-4" />
              <span>Daftar Alokasi 72 Box</span>
            </button>
          </div>
        </div>

        {/* 2. Main Content Area */}
        {activeTab === 'chart' && (
          <div className="space-y-6">
            {/* Landscape Organizational Chart Card */}
            <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 md:p-8 shadow-xl backdrop-blur-sm overflow-x-auto">
              <div className="min-w-[1200px] flex flex-col lg:flex-row gap-6 items-stretch">

                {/* Left Column: Management & Leader */}
                <div className="w-full lg:w-[380px] shrink-0 flex flex-col justify-center space-y-6">
                  
                  {/* SURURI (SPV) */}
                  <div className="relative rounded-xl bg-slate-950/80 border-2 border-blue-500/80 p-5 shadow-lg shadow-blue-500/10">
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-2.5 py-0.5 rounded text-[11px] font-bold tracking-wider uppercase border border-blue-500/60 text-blue-400 bg-blue-950/50">
                        SPV SAMPLE
                      </span>
                      <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-blue-900 text-blue-200 border border-blue-600">
                        [ C / I ] Consulted
                      </span>
                    </div>
                    <div className="text-xl font-extrabold text-white">SURURI</div>
                    <div className="text-xs font-semibold text-blue-300 mt-0.5">Supervisor Sample R&amp;D</div>
                    <div className="mt-3 pt-3 border-t border-slate-800 text-xs text-slate-400 leading-relaxed">
                      Supervisi strategis, kebijakan mutu sampel, persetujuan target besar, dan eskalasi manajemen puncak.
                    </div>
                  </div>

                  {/* Connecting Line Downward with Label */}
                  <div className="flex flex-col items-center justify-center my-1">
                    <div className="w-0.5 h-6 bg-blue-500" />
                    <span className="text-[11px] font-bold text-blue-400 tracking-wider uppercase py-0.5">
                      Supervisi Kebijakan
                    </span>
                    <div className="w-0.5 h-6 bg-emerald-500" />
                  </div>

                  {/* JASMINE (Leader) */}
                  <div className="relative rounded-xl bg-emerald-950/30 border-2 border-emerald-500/90 p-6 shadow-xl shadow-emerald-500/10">
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-2.5 py-0.5 rounded text-[11px] font-bold tracking-wider uppercase border border-emerald-500/60 text-emerald-400 bg-emerald-950/50">
                        LEADER
                      </span>
                      <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-emerald-900 text-emerald-200 border border-emerald-600">
                        [ A ] Accountable
                      </span>
                    </div>
                    <div className="text-2xl font-black text-white">JASMINE</div>
                    <div className="text-xs font-semibold text-emerald-300 mt-0.5">Inventory Team Leader (Superuser)</div>
                    <div className="mt-3 pt-3 border-t border-emerald-900/50 text-xs text-slate-300 leading-relaxed">
                      Penanggung jawab mutlak target tim (400 pcs/hari), validasi kelengkapan 72 box, monitoring kinerja PIC, dan penugasan tim support.
                    </div>
                  </div>

                </div>

                {/* Right Column: 5 PPIC + 3 Support Team */}
                <div className="flex-1 flex flex-col justify-between space-y-6">

                  {/* Top Wing: 5 PPIC (Responsible - Box Owners) */}
                  <div className="rounded-xl bg-slate-950/70 border border-amber-500/40 p-5 shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-amber-400 font-bold text-sm tracking-wide">
                          📦 5 PPIC &mdash; [ R ] RESPONSIBLE (PENANGGUNG JAWAB UTAMA 72 BOX)
                        </span>
                      </div>
                      <span className="text-xs text-amber-300/80 font-medium">
                        Total: 72 Box Tersebar di Rak 1–5
                      </span>
                    </div>

                    <div className="grid grid-cols-5 gap-3">
                      {ppicStats.map((p) => (
                        <div
                          key={p.name}
                          className={`rounded-lg bg-slate-900/90 border-2 ${p.border} p-3.5 flex flex-col justify-between transition hover:-translate-y-1 hover:shadow-lg`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-1 mb-2">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${p.badgeBg}`}>
                                {p.code}
                              </span>
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${p.raciBg}`}>
                                [ R ] Resp.
                              </span>
                            </div>
                            <div className="text-base font-extrabold text-white">{p.name}</div>
                            <div className="text-xs font-semibold text-amber-400 mt-0.5">
                              {p.boxes.length} Box Tersebar
                            </div>
                          </div>
                          <div className="mt-2.5 pt-2 border-t border-slate-800 text-[11px] text-slate-400 leading-tight">
                            {p.rackBreakdown}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Mid Connector: Collaboration Arrow */}
                  <div className="flex items-center justify-center gap-3 py-1 bg-slate-950/50 border border-slate-800 rounded-lg px-4">
                    <span className="text-cyan-400 text-xs font-bold flex items-center gap-2">
                      ▲ Asistensi Langsung: Menghitung &amp; Input Fisik Sampel Bersama PPIC di Rak
                    </span>
                  </div>

                  {/* Bottom Wing: 3 Support Team */}
                  <div className="rounded-xl bg-slate-950/70 border border-cyan-500/40 p-5 shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-cyan-400 font-bold text-sm tracking-wide">
                          ⚡ 3 SUPPORT TEAM &mdash; [ S ] SUPPORT (ASISTENSI PERCEPATAN DATA ENTRY FISIK)
                        </span>
                      </div>
                      <span className="text-xs text-cyan-300/80 font-medium">
                        Tenaga Percepatan Pengisian 72 Box
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      {supportTeam.map((s) => (
                        <div
                          key={s.name}
                          className={`rounded-lg bg-slate-900/90 border-2 ${s.border} p-4 flex flex-col justify-between transition hover:-translate-y-1 hover:shadow-lg`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${s.badgeBg}`}>
                                {s.code}
                              </span>
                              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-teal-950 text-teal-300 border border-teal-600/40">
                                [ S ] Support
                              </span>
                            </div>
                            <div className="text-lg font-extrabold text-white">{s.name}</div>
                            <div className="text-xs font-semibold text-cyan-300 mt-0.5">{s.role}</div>
                          </div>
                          <div className="mt-3 pt-2.5 border-t border-slate-800 text-xs text-slate-400 leading-relaxed">
                            {s.desc}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

              </div>
            </div>

            {/* RACI Legend Bar */}
            <div className="rounded-xl bg-slate-900/70 border border-slate-800 p-6 shadow-lg">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-400" />
                LEGENDA METODE RACI (ISO 9001:2015 CLAUSE 5.3)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-950/60 border border-emerald-900/40">
                  <span className="px-2 py-1 rounded font-bold bg-emerald-950 text-emerald-300 border border-emerald-600 shrink-0">
                    [ A ] ACCOUNTABLE
                  </span>
                  <div className="text-slate-300 leading-relaxed">
                    <strong className="text-white">Jasmine (Leader):</strong> Pemilik keputusan mutlak &amp; penanggung jawab hasil akhir target tim harian, status 72 box, dan alur kerja.
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

                <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-950/60 border border-teal-900/40">
                  <span className="px-2 py-1 rounded font-bold bg-teal-950 text-teal-300 border border-teal-600 shrink-0">
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
                  <td className="py-3.5 px-4 font-semibold text-white">Penetapan Kebijakan &amp; Alokasi 72 Box</td>
                  <td className="py-3.5 px-4 text-center font-bold text-blue-400">Accountable [A]</td>
                  <td className="py-3.5 px-4 text-center font-bold text-emerald-400">Consulted [C]</td>
                  <td className="py-3.5 px-4 text-center text-slate-400">Informed [I]</td>
                  <td className="py-3.5 px-4 text-center text-slate-400">Informed [I]</td>
                </tr>
                <tr className="hover:bg-slate-800/40 transition">
                  <td className="py-3.5 px-4 font-semibold text-white">Penentuan Target Harian (400 Pcs/Hari)</td>
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
                  <td className="py-3.5 px-4 font-semibold text-white">Pencatatan Kirim Keluar (Dispatch)</td>
                  <td className="py-3.5 px-4 text-center text-slate-400">Informed [I]</td>
                  <td className="py-3.5 px-4 text-center font-bold text-emerald-400">Accountable [A]</td>
                  <td className="py-3.5 px-4 text-center font-bold text-amber-400">Responsible [R]</td>
                  <td className="py-3.5 px-4 text-center font-bold text-teal-400">Support [S]</td>
                </tr>
                <tr className="hover:bg-slate-800/40 transition">
                  <td className="py-3.5 px-4 font-semibold text-white">Audit Akurasi Data &amp; Status Box Penuh</td>
                  <td className="py-3.5 px-4 text-center font-bold text-blue-400">Consulted [C]</td>
                  <td className="py-3.5 px-4 text-center font-bold text-emerald-400">Accountable [A]</td>
                  <td className="py-3.5 px-4 text-center font-bold text-amber-400">Responsible [R]</td>
                  <td className="py-3.5 px-4 text-center text-slate-400">Informed [I]</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Detailed 72 Box Allocations */}
        {activeTab === 'boxes' && (
          <div className="rounded-2xl bg-slate-900/70 border border-slate-800 p-6 md:p-8 shadow-xl space-y-6">
            <h2 className="text-lg font-bold text-white">Rincian Pembagian 72 Box Fisik per PPIC</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {ppicStats.map((p) => (
                <div key={p.name} className={`rounded-xl bg-slate-950/80 border-2 ${p.border} p-5 space-y-4`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${p.badgeBg}`}>
                        {p.code}
                      </span>
                      <h3 className="text-xl font-extrabold text-white mt-1">{p.name}</h3>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-slate-800 text-amber-400 font-bold text-xs border border-slate-700">
                      {p.boxes.length} Box
                    </span>
                  </div>

                  <div className="text-xs text-slate-400">
                    <strong>Distribusi Rak:</strong> {p.rackBreakdown}
                  </div>

                  <div className="space-y-1.5">
                    <div className="text-xs font-semibold text-slate-300">Daftar Nomor Box:</div>
                    <div className="flex flex-wrap gap-1.5">
                      {p.boxes.map((b) => (
                        <span
                          key={b}
                          className="px-2 py-1 rounded bg-slate-900 text-slate-200 text-xs font-mono font-bold border border-slate-700"
                        >
                          Box #{b}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
export default TeamStructureView;
