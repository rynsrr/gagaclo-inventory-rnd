import React from 'react';
import { useInventory } from '../context/InventoryContext';
import { 
  Users, 
  Box, 
  Layers, 
  CheckCircle, 
  ExternalLink, 
  Plus, 
  Tag, 
  ArrowRight,
  ShieldCheck,
  TrendingUp
} from 'lucide-react';

export const PpicDashboardView = () => {
  const { 
    ppicMembers, 
    boxes, 
    items, 
    setSelectedBoxNumber, 
    setSelectedPpicFilter, 
    setActiveTab,
    setItemModalConfig 
  } = useInventory();

  return (
    <div className="space-y-6">
      
      {/* Intro Header */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-6 shadow-sm border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs px-2.5 py-0.5 rounded-full font-bold">
                Tim PPIC R&D
              </span>
              <span className="text-xs text-slate-400">Total 72 Box Terdistribusi</span>
            </div>
            <h2 className="text-2xl font-black tracking-tight mt-1">
              Alokasi & Manajemen Tim PPIC (5 PIC)
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Setiap anggota tim PPIC bertanggung jawab atas sejumlah box sample & material di Rak 1 hingga Rak 5 sesuai pembagian resmi GAGACLO Storage Dokumen 20261102.
            </p>
          </div>

          <div className="flex items-center space-x-3 text-center">
            <div className="bg-white/10 backdrop-blur-xs px-4 py-3 rounded-xl border border-white/10">
              <div className="text-2xl font-black text-amber-300">5</div>
              <div className="text-[11px] text-slate-300 uppercase tracking-wider font-semibold">Anggota PPIC</div>
            </div>
            <div className="bg-white/10 backdrop-blur-xs px-4 py-3 rounded-xl border border-white/10">
              <div className="text-2xl font-black text-emerald-300">72</div>
              <div className="text-[11px] text-slate-300 uppercase tracking-wider font-semibold">Total Box</div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of 5 PPIC Members */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {ppicMembers.map((pic) => {
          // Get boxes for this pic
          const picBoxes = boxes.filter(b => b.picName.toLowerCase() === pic.name.toLowerCase());
          const picItems = items.filter(i => i.picName.toLowerCase() === pic.name.toLowerCase());
          const sampleBoxes = picBoxes.filter(b => b.category === 'SAMPLE');
          const materialBoxes = picBoxes.filter(b => b.category === 'MATERIAL');
          const totalUnits = picItems.reduce((acc, curr) => acc + (Number(curr.qty) || 0), 0);
          const occupiedBoxes = picBoxes.filter(b => items.some(i => Number(i.boxNumber) === b.boxNumber));

          return (
            <div 
              key={pic.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between hover:border-slate-300 transition duration-200"
            >
              {/* Member Card Header */}
              <div className="p-5 border-b border-slate-100">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-white text-lg shadow-md ${pic.avatarBg}`}>
                      {pic.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-slate-400">PPIC #{pic.ppicNumber}</span>
                        <h3 className="text-lg font-black text-slate-900">{pic.name}</h3>
                      </div>
                    </div>
                  </div>

                  <span className="bg-blue-50 text-blue-700 text-xs font-black px-2.5 py-1 rounded-lg border border-blue-200">
                    {picBoxes.length} Box
                  </span>
                </div>

                {/* Box Breakdown Metric */}
                <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                  <div className="bg-amber-50/70 border border-amber-200/80 p-2.5 rounded-xl">
                    <span className="text-amber-800 font-medium text-[11px] block">Box Sample</span>
                    <strong className="text-base font-black text-amber-950">{sampleBoxes.length} Box</strong>
                    <span className="text-[10px] text-amber-700 block mt-0.5">Rak 1 - 2</span>
                  </div>

                  <div className="bg-emerald-50/70 border border-emerald-200/80 p-2.5 rounded-xl">
                    <span className="text-emerald-800 font-medium text-[11px] block">Box Material</span>
                    <strong className="text-base font-black text-emerald-950">{materialBoxes.length} Box</strong>
                    <span className="text-[10px] text-emerald-700 block mt-0.5">Rak 3 - 5</span>
                  </div>
                </div>

                {/* Utilization meter */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                    <span>Okupansi Box ({occupiedBoxes.length}/{picBoxes.length})</span>
                    <span className="font-bold text-slate-700">
                      {Math.round((occupiedBoxes.length / picBoxes.length) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-blue-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${(occupiedBoxes.length / picBoxes.length) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Inventory Summary */}
                <div className="mt-3 flex items-center justify-between text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl">
                  <span>Item Tersimpan:</span>
                  <strong className="text-slate-900 font-bold">
                    {picItems.length} jenis ({totalUnits} unit)
                  </strong>
                </div>
              </div>

              {/* Box badges list */}
              <div className="p-5 flex-1 bg-slate-50/50">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
                  Daftar Nomor Box Milik {pic.name}:
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                  {picBoxes.map((box) => {
                    const hasItem = items.some(i => Number(i.boxNumber) === box.boxNumber);
                    return (
                      <button
                        key={box.boxNumber}
                        onClick={() => setSelectedBoxNumber(box.boxNumber)}
                        className={`text-xs font-bold px-2 py-1 rounded-md border transition flex items-center space-x-1 ${
                          hasItem
                            ? 'bg-blue-600 text-white border-blue-700 hover:bg-blue-700 shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                        title={`Buka Box #${box.boxNumber} (${box.rackName})`}
                      >
                        <span>#{box.boxNumber}</span>
                        {hasItem && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="p-3 border-t border-slate-100 bg-white flex items-center justify-between text-xs">
                <button
                  onClick={() => {
                    setSelectedPpicFilter(pic.name);
                    setActiveTab('racks');
                  }}
                  className="font-bold text-blue-600 hover:text-blue-800 flex items-center space-x-1 px-2 py-1 rounded hover:bg-blue-50 transition"
                >
                  <span>Lihat di Denah Rak</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => {
                    const firstBox = picBoxes[0] ? picBoxes[0].boxNumber : 1;
                    setItemModalConfig({ isOpen: true, item: null, targetBoxNumber: firstBox });
                  }}
                  className="font-semibold text-slate-600 hover:text-slate-900 flex items-center space-x-1 px-2 py-1 rounded hover:bg-slate-100 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Item</span>
                </button>
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
};
