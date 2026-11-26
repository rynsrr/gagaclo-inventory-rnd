import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { X, Search, QrCode, ArrowRight } from 'lucide-react';

export const QuickScannerModal = () => {
  const { 
    quickScannerOpen, 
    setQuickScannerOpen, 
    setSelectedBoxNumber, 
    boxes, 
    racks,
    getItemsInBox 
  } = useInventory();

  const [inputVal, setInputVal] = useState('');
  const [filterRack, setFilterRack] = useState('ALL');

  if (!quickScannerOpen) return null;

  const maxBoxNumber = boxes.reduce((max, b) => Math.max(max, Number(b.boxNumber) || 0), 82);

  const handleSelectBox = (boxNumber) => {
    setSelectedBoxNumber(boxNumber);
    setQuickScannerOpen(false);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const cleanNum = parseInt(inputVal.replace(/\D/g, ''), 10);
    if (boxes.some(b => Number(b.boxNumber) === cleanNum)) {
      handleSelectBox(cleanNum);
    } else {
      alert(`Masukkan nomor box valid antara 1 sampai ${maxBoxNumber}.`);
    }
  };

  const filteredBoxes = boxes.filter(b => {
    if (filterRack !== 'ALL' && b.rackId !== Number(filterRack)) return false;
    if (inputVal.trim()) {
      const q = inputVal.toLowerCase();
      return (
        String(b.boxNumber).includes(q) ||
        b.picName.toLowerCase().includes(q) ||
        b.code.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="font-apple fixed inset-0 z-50 bg-black/50 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-[26px] shadow-[0_30px_70px_rgba(0,0,0,0.2)] border border-black/[0.08] w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Apple Style Header */}
        <div className="bg-[#fbfbfd] px-6 py-4 flex items-center justify-between border-b border-black/[0.06] shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0071e3]/10 text-[#0071e3]">
              <QrCode className="w-4 h-4" />
            </div>
            <h3 className="text-[15px] font-semibold text-[#1d1d1f] tracking-tight">Lompat Cepat ke Box (1 - {maxBoxNumber})</h3>
          </div>
          <button
            onClick={() => setQuickScannerOpen(false)}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f5f5f7] hover:bg-[#e8e8ed] text-[#86868b] hover:text-[#1d1d1f] transition-colors cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Search input */}
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                autoFocus
                placeholder="Ketik nomor box (cth: 16) atau nama PIC lalu tekan Enter..."
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center space-x-1 shadow-xs transition"
            >
              <span>Buka Box</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick rack filter */}
          <div className="flex items-center space-x-2 mt-3 text-xs overflow-x-auto py-1">
            <span className="text-slate-500 font-medium shrink-0">Filter Lokasi:</span>
            <button
              type="button"
              onClick={() => setFilterRack('ALL')}
              className={`px-2.5 py-1 rounded-lg font-bold transition shrink-0 ${
                filterRack === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              Semua
            </button>
            {racks.map(r => (
              <button
                key={r.id}
                type="button"
                onClick={() => setFilterRack(String(r.id))}
                className={`px-2.5 py-1 rounded-lg font-bold transition shrink-0 ${
                  filterRack === String(r.id)
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {r.name}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Click Numbers Grid */}
        <div className="p-4 overflow-y-auto flex-1">
          <p className="text-xs text-slate-500 mb-2 font-medium">
            Klik nomor box untuk langsung membuka catatan inventory di dalamnya:
          </p>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
            {filteredBoxes.map((b) => {
              const items = getItemsInBox(b.boxNumber);
              const hasItems = items.length > 0;
              return (
                <button
                  key={b.boxNumber}
                  onClick={() => handleSelectBox(b.boxNumber)}
                  className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-between hover:scale-105 shadow-2xs ${
                    hasItems
                      ? 'bg-blue-50 border-blue-300 text-blue-900 font-black'
                      : 'bg-white border-slate-200 text-slate-700 font-bold hover:border-slate-400'
                  }`}
                >
                  <span className="text-sm font-black">#{b.boxNumber}</span>
                  <span className="text-xs text-slate-500 font-medium mt-0.5 truncate w-full">
                    {b.picName}
                  </span>
                  {hasItems && (
                    <span className="text-xs bg-emerald-100 text-emerald-800 px-1 rounded-full font-bold mt-1">
                      {items.length} item
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-100 px-5 py-3 border-t border-slate-200 text-right text-xs">
          <button
            onClick={() => setQuickScannerOpen(false)}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg transition"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
