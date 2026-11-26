import React, { useMemo, useState } from 'react';
import { X, Printer, CheckSquare, Square, Search, Trash2, Check } from 'lucide-react';
import { BoxLabel } from './BoxLabel';
import { useInventory } from '../context/InventoryContext';
import { getBoxDisplayNumber } from '../utils/boxDisplayUtils';

export const BoxLabelPrintModal = ({ isOpen, onClose, initialBoxNumber = null }) => {
  const { boxes, racks, ppicMembers } = useInventory();

  const [selectedRackId, setSelectedRackId] = useState(
    initialBoxNumber ? String(boxes.find(b => Number(b.boxNumber) === Number(initialBoxNumber))?.rackId || 'ALL') : 'ALL'
  );
  const [selectedPpic, setSelectedPpic] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBoxIds, setSelectedBoxIds] = useState(
    initialBoxNumber ? [Number(initialBoxNumber)] : []
  );

  // Filter boxes based on user selection
  const filteredBoxes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return boxes.filter(box => {
      if (selectedRackId === 'RACKS_ONLY' && Number(box.rackId) > 5) return false;
      if (selectedRackId === 'LEMARI_ONLY' && Number(box.rackId) < 6) return false;
      if (
        selectedRackId !== 'ALL' &&
        selectedRackId !== 'RACKS_ONLY' &&
        selectedRackId !== 'LEMARI_ONLY' &&
        Number(box.rackId) !== Number(selectedRackId)
      ) {
        return false;
      }
      if (selectedPpic !== 'ALL' && String(box.picName || '').toLowerCase() !== selectedPpic.toLowerCase()) {
        return false;
      }
      if (q) {
        const disp = getBoxDisplayNumber(box).toLowerCase();
        const rack = String(box.rackName || '').toLowerCase();
        const pic = String(box.picName || '').toLowerCase();
        const num = String(box.boxNumber);
        if (!disp.includes(q) && !rack.includes(q) && !pic.includes(q) && !num.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [boxes, selectedRackId, selectedPpic, searchQuery]);

  // Preserve selection order or sorted order for printing
  const boxesToPrint = useMemo(() => {
    if (selectedBoxIds.length > 0) {
      const idSet = new Set(selectedBoxIds.map(Number));
      return boxes
        .filter(b => idSet.has(Number(b.boxNumber)))
        .sort((a, b) => Number(a.boxNumber) - Number(b.boxNumber));
    }
    return filteredBoxes;
  }, [boxes, selectedBoxIds, filteredBoxes]);

  // Pair labels 2-up per A4 Portrait sheet (2 x A5 Landscape = 210x148mm each on 210x297mm A4)
  const a4PrintSheets = useMemo(() => {
    const sheets = [];
    for (let i = 0; i < boxesToPrint.length; i += 2) {
      sheets.push([boxesToPrint[i], boxesToPrint[i + 1] || null]);
    }
    return sheets;
  }, [boxesToPrint]);

  if (!isOpen) return null;

  const selectedSet = new Set(selectedBoxIds.map(Number));

  const toggleBoxSelection = (boxNumber) => {
    const num = Number(boxNumber);
    setSelectedBoxIds(prev => (
      prev.includes(num) ? prev.filter(id => id !== num) : [...prev, num]
    ));
  };

  const handleSelectAllFiltered = () => {
    const filteredNums = filteredBoxes.map(b => Number(b.boxNumber));
    const allSelected = filteredNums.length > 0 && filteredNums.every(n => selectedSet.has(n));
    if (allSelected) {
      const fSet = new Set(filteredNums);
      setSelectedBoxIds(prev => prev.filter(id => !fSet.has(id)));
    } else {
      setSelectedBoxIds(prev => Array.from(new Set([...prev, ...filteredNums])));
    }
  };

  const handleClearSelection = () => {
    setSelectedBoxIds([]);
  };

  const handlePrint = () => {
    window.print();
  };

  const allFilteredSelected =
    filteredBoxes.length > 0 && filteredBoxes.every(b => selectedSet.has(Number(b.boxNumber)));

  return (
    <div className="font-apple fixed inset-0 z-50 bg-black/50 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fade-in print:p-0 print:bg-white print:static print:inset-auto print:block">
      <div className="bg-white rounded-[26px] shadow-[0_30px_70px_rgba(0,0,0,0.2)] border border-black/[0.08] w-full max-w-5xl max-h-[95vh] flex flex-col overflow-hidden print:max-w-none print:max-h-none print:shadow-none print:border-none print:rounded-none print:overflow-visible print:block">

        {/* Apple Dark Header (hidden in print) */}
        <div className="no-print bg-[#161618] text-white px-5 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08]">
          <div className="flex items-center space-x-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white shrink-0">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-white tracking-tight">
                Cetak Label Box A5 di Kertas A4 (2 Label / Lembar A4)
              </h3>
              <p className="text-xs text-white/60 mt-0.5">
                Klik beberapa kartu label untuk memilih banyak box sekaligus (bisa gabung Rak &amp; Lemari) lalu cetak 1x pada kertas A4 Portrait.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handlePrint}
              disabled={boxesToPrint.length === 0}
              className="flex items-center space-x-1.5 px-4 sm:px-5 py-2 bg-[#0071e3] hover:bg-[#0077ed] disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>
                Cetak ({boxesToPrint.length} Label • {a4PrintSheets.length} Lembar A4)
              </span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
              aria-label="Tutup"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Filter & Multi-Select Toolbar (hidden in print) */}
        <div className="no-print bg-slate-50 px-5 sm:px-6 py-3 border-b border-slate-200 flex flex-col gap-2.5 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Filter Lokasi */}
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-slate-600">Lokasi:</span>
                <select
                  value={selectedRackId}
                  onChange={(e) => setSelectedRackId(e.target.value)}
                  className="p-1.5 rounded-lg border border-slate-300 bg-white font-medium cursor-pointer"
                >
                  <option value="ALL">Semua Penyimpanan ({racks.length} Lokasi)</option>
                  <option value="RACKS_ONLY">Semua Rak (Rak 1 - 5 • 72 Box)</option>
                  <option value="LEMARI_ONLY">Semua Lemari (Lemari 1 - 12 • 120 Box)</option>
                  {racks.map(r => (
                    <option key={r.id} value={String(r.id)}>
                      {r.name} ({r.boxRange || `${r.totalBoxes} Box`})
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter PPIC */}
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-slate-600">PPIC:</span>
                <select
                  value={selectedPpic}
                  onChange={(e) => setSelectedPpic(e.target.value)}
                  className="p-1.5 rounded-lg border border-slate-300 bg-white font-medium cursor-pointer"
                >
                  <option value="ALL">Semua PPIC</option>
                  {ppicMembers.map(p => (
                    <option key={p.id} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quick Search Box */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari 1, 1A, 2B..."
                  className="pl-7 pr-2.5 py-1.5 w-36 sm:w-44 rounded-lg border border-slate-300 bg-white font-medium focus:outline-hidden focus:border-[#0071e3]"
                />
              </div>

              <button
                type="button"
                onClick={handleSelectAllFiltered}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg font-bold text-slate-700 cursor-pointer"
              >
                {allFilteredSelected ? <CheckSquare className="w-3.5 h-3.5 text-[#0071e3]" /> : <Square className="w-3.5 h-3.5 text-slate-400" />}
                <span>
                  {allFilteredSelected
                    ? `Batal Pilih Filter Ini (${filteredBoxes.length})`
                    : `Pilih Semua di Filter Ini (${filteredBoxes.length})`}
                </span>
              </button>

              {selectedBoxIds.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-lg font-bold text-rose-700 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Reset Pilihan ({selectedBoxIds.length})</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 text-slate-600 font-semibold">
              <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-bold">
                {selectedBoxIds.length > 0 ? `Dipilih Manual: ${selectedBoxIds.length} Box` : `Semua Tampilan: ${filteredBoxes.length} Box`}
              </span>
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                {a4PrintSheets.length} Lembar A4
              </span>
            </div>
          </div>

          {/* Selected Chips Preview */}
          {selectedBoxIds.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap pt-1.5 border-t border-slate-200/80">
              <span className="text-[11px] font-bold text-slate-500">Antrean Cetak:</span>
              {boxesToPrint.slice(0, 24).map((b) => (
                <button
                  key={b.boxNumber}
                  type="button"
                  onClick={() => toggleBoxSelection(b.boxNumber)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#0071e3] text-white text-[11px] font-bold hover:bg-[#005bb5] transition cursor-pointer"
                  title="Klik untuk hapus dari pilihan cetak"
                >
                  <span>#{getBoxDisplayNumber(b)}</span>
                  <X className="w-3 h-3 opacity-80" />
                </button>
              ))}
              {boxesToPrint.length > 24 && (
                <span className="text-[11px] font-semibold text-slate-500">
                  +{boxesToPrint.length - 24} label lainnya
                </span>
              )}
            </div>
          )}
        </div>

        {/* ON-SCREEN Interactive Multi-Select Grid (hidden in print) */}
        <div className="no-print p-5 sm:p-6 overflow-y-auto flex-1 bg-slate-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 justify-items-center">
            {filteredBoxes.map((box) => {
              const isSelected = selectedSet.has(Number(box.boxNumber));
              return (
                <div
                  key={box.boxNumber}
                  onClick={() => toggleBoxSelection(box.boxNumber)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleBoxSelection(box.boxNumber);
                    }
                  }}
                  className={`relative w-full max-w-[460px] cursor-pointer rounded-lg transition-all select-none ${
                    isSelected
                      ? 'ring-4 ring-[#0071e3] shadow-lg scale-[1.01]'
                      : 'hover:ring-2 hover:ring-slate-400 opacity-95 hover:opacity-100'
                  }`}
                  title={`Klik untuk ${isSelected ? 'batal pilih' : 'pilih'} Box #${getBoxDisplayNumber(box)}`}
                >
                  {/* Selection Indicator Badge */}
                  <div
                    className={`absolute top-2.5 right-2.5 z-10 flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold shadow-md transition ${
                      isSelected
                        ? 'bg-[#0071e3] text-white'
                        : 'bg-white/95 text-slate-600 border border-slate-300'
                    }`}
                  >
                    {isSelected ? (
                      <>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Dipilih</span>
                      </>
                    ) : (
                      <span>Pilih</span>
                    )}
                  </div>
                  <BoxLabel box={box} isPrintMode={false} />
                </div>
              );
            })}
          </div>
          {filteredBoxes.length === 0 && (
            <div className="text-center py-12 text-slate-500 text-sm font-medium">
              Tidak ada label box yang cocok dengan filter atau pencarian.
            </div>
          )}
        </div>

        {/* PRINT-ONLY 2-Up A4 Portrait Sheets (2 x A5 Landscape = 210x148mm per label on 210x297mm A4) */}
        <div className="hidden print:block print:bg-white print:p-0 print:m-0">
          {a4PrintSheets.map((pair, sheetIdx) => (
            <div key={`a4-sheet-${sheetIdx}`} className="print-a4-two-up-sheet">
              {/* Top A5 Label (210mm x 148mm) */}
              <BoxLabel box={pair[0]} isPrintMode={true} fitA4Sheet={true} />

              {/* Subtle Dashed Cut Guide at Exact A4 Midpoint (148.5mm) */}
              <div
                className="w-full border-t border-dashed border-slate-400"
                style={{ height: '1mm', boxSizing: 'border-box' }}
              />

              {/* Bottom A5 Label (210mm x 148mm) */}
              {pair[1] ? (
                <BoxLabel box={pair[1]} isPrintMode={true} fitA4Sheet={true} />
              ) : (
                <div style={{ width: '210mm', height: '148mm' }} />
              )}
            </div>
          ))}
        </div>

        {/* Footer (hidden in print) */}
        <div className="no-print bg-slate-50 px-5 sm:px-6 py-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span>
            Format Cetak: <strong>Kertas A4 Portrait</strong> • Ukuran Label: <strong>A5 Landscape (210 x 148 mm)</strong> • <strong>2 Label per Lembar A4</strong> (dengan garis potong tengah)
          </span>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-bold transition cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
