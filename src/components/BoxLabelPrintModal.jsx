import React, { useState } from 'react';
import { X, Printer, CheckSquare, Square, Download, Filter } from 'lucide-react';
import { BoxLabel } from './BoxLabel';
import { useInventory } from '../context/InventoryContext';

export const BoxLabelPrintModal = ({ isOpen, onClose, initialBoxNumber = null }) => {
  const { boxes, racks, ppicMembers } = useInventory();

  const [selectedRackId, setSelectedRackId] = useState(
    initialBoxNumber ? (boxes.find(b => b.boxNumber === initialBoxNumber)?.rackId || 'ALL') : 'ALL'
  );
  const [selectedPpic, setSelectedPpic] = useState('ALL');
  const [selectedBoxIds, setSelectedBoxIds] = useState(
    initialBoxNumber ? [initialBoxNumber] : []
  );

  if (!isOpen) return null;

  // Filter boxes based on user selection
  const filteredBoxes = boxes.filter(box => {
    if (selectedRackId !== 'ALL' && box.rackId !== Number(selectedRackId)) return false;
    if (selectedPpic !== 'ALL' && box.picName.toLowerCase() !== selectedPpic.toLowerCase()) return false;
    return true;
  });

  const boxesToPrint = selectedBoxIds.length > 0 
    ? boxes.filter(b => selectedBoxIds.includes(b.boxNumber))
    : filteredBoxes;

  const handlePrint = () => {
    window.print();
  };

  const handleSelectAllFiltered = () => {
    if (selectedBoxIds.length === filteredBoxes.length) {
      setSelectedBoxIds([]);
    } else {
      setSelectedBoxIds(filteredBoxes.map(b => b.boxNumber));
    }
  };

  return (
    <div className="font-apple fixed inset-0 z-50 bg-black/50 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fade-in print:p-0 print:bg-white print:static print:inset-auto print:block">
      <div className="bg-white rounded-[26px] shadow-[0_30px_70px_rgba(0,0,0,0.2)] border border-black/[0.08] w-full max-w-5xl max-h-[95vh] flex flex-col overflow-hidden print:max-w-none print:max-h-none print:shadow-none print:border-none print:rounded-none print:overflow-visible print:block">
        
        {/* Apple Dark Header (hidden in print) */}
        <div className="no-print bg-[#161618] text-white px-6 py-4 flex items-center justify-between border-b border-white/[0.08]">
          <div className="flex items-center space-x-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-white tracking-tight">
                Cetak Label Stiker Box (Desain Resmi GAGACLO)
              </h3>
              <p className="text-xs text-white/60 mt-0.5">
                Desain 1:1 sesuai standar: Judul Box, Nomor Raksasa, Bar Lavender Nama PPIC, Lokasi Rak &amp; Unit RND.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 px-5 py-2 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-xl text-xs font-medium shadow-xs transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Sekarang ({boxesToPrint.length} Label)</span>
            </button>

            <button
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
              aria-label="Tutup"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Filter Toolbar (hidden in print) */}
        <div className="no-print bg-slate-50 px-6 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Filter Rak */}
            <div className="flex items-center space-x-1.5">
              <span className="font-bold text-slate-600">Pilih Rak:</span>
              <select
                value={selectedRackId}
                onChange={(e) => {
                  setSelectedRackId(e.target.value);
                  setSelectedBoxIds([]);
                }}
                className="p-1.5 rounded-lg border border-slate-300 bg-white font-medium"
              >
                <option value="ALL">Semua Penyimpanan ({racks.length} Lokasi)</option>
                {racks.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.category} - {r.totalBoxes} Box)
                  </option>
                ))}
              </select>
            </div>

            {/* Filter PPIC */}
            <div className="flex items-center space-x-1.5">
              <span className="font-bold text-slate-600">Pilih PPIC:</span>
              <select
                value={selectedPpic}
                onChange={(e) => {
                  setSelectedPpic(e.target.value);
                  setSelectedBoxIds([]);
                }}
                className="p-1.5 rounded-lg border border-slate-300 bg-white font-medium"
              >
                <option value="ALL">Semua PPIC</option>
                {ppicMembers.map(p => (
                  <option key={p.id} value={p.name}>
                    {p.name} ({p.totalBoxes} Box)
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleSelectAllFiltered}
              className="px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg font-bold text-slate-700"
            >
              {selectedBoxIds.length === filteredBoxes.length && filteredBoxes.length > 0
                ? 'Batal Pilih Semua'
                : `Pilih Semua di Tampilan Ini (${filteredBoxes.length})`}
            </button>
          </div>

          <div className="text-slate-600 font-semibold">
            Siap Cetak: <strong className="text-blue-600 font-black">{boxesToPrint.length} Label</strong>
          </div>

        </div>

        {/* Printable Area */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-100 print:bg-white print:p-0 print:overflow-visible">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 justify-items-center print:flex print:flex-col print:items-center print:gap-0">
            {boxesToPrint.map((box) => (
              <div 
                key={box.boxNumber}
                className="relative print:break-inside-avoid print:page-break-inside-avoid print:break-after-page print:page-break-after-always flex flex-col items-center"
              >
                <BoxLabel box={box} isPrintMode={true} />
              </div>
            ))}
          </div>

        </div>

        {/* Footer (hidden in print) */}
        <div className="no-print bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Menampilkan <strong>{boxesToPrint.length} label</strong></span>
          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 border border-slate-300 rounded-lg hover:bg-slate-200 font-semibold text-slate-700"
            >
              Tutup
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold flex items-center space-x-1.5 shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak {boxesToPrint.length} Label</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
