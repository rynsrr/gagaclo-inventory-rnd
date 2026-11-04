import React, { useState } from 'react';
import { 
  X, 
  Printer, 
  Copy, 
  Scissors, 
  CheckSquare, 
  Square, 
  Check, 
  ListFilter,
  Eye,
  Layers
} from 'lucide-react';
import { InventoryCard } from './InventoryCard';

export const CardPrintModal = ({ itemsToPrint, onClose }) => {
  if (!itemsToPrint || itemsToPrint.length === 0) return null;

  // Track checked items (default to all selected)
  const [selectedItemIds, setSelectedItemIds] = useState(() => {
    return new Set(itemsToPrint.map((item, idx) => item.id || item.kode || `item-${idx}`));
  });

  const isSingleOriginalItem = itemsToPrint.length === 1;
  const [copiesPerCard, setCopiesPerCard] = useState(isSingleOriginalItem ? 8 : 1);
  const [showCutGuides, setShowCutGuides] = useState(true);
  const [showChecklistDrawer, setShowChecklistDrawer] = useState(true);

  // Toggle single item selection
  const toggleItemSelection = (id) => {
    setSelectedItemIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Select all items
  const selectAll = () => {
    setSelectedItemIds(new Set(itemsToPrint.map((item, idx) => item.id || item.kode || `item-${idx}`)));
  };

  // Deselect all items
  const deselectAll = () => {
    setSelectedItemIds(new Set());
  };

  // Filter items that are currently checked
  const activeItems = itemsToPrint.filter((item, idx) => {
    const id = item.id || item.kode || `item-${idx}`;
    return selectedItemIds.has(id);
  });

  // Generate flat list of copies to print
  const cardsToPrint = [];
  activeItems.forEach((item, itemIdx) => {
    for (let c = 0; c < copiesPerCard; c++) {
      cardsToPrint.push({
        ...item,
        _printUniqueId: `${item.id || item.kode || itemIdx}-copy-${c}`
      });
    }
  });

  const totalCards = cardsToPrint.length;
  const estimatedPages = Math.ceil(totalCards / 8); // 8 cards per A4 page

  const handlePrint = () => {
    if (cardsToPrint.length === 0) return;
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fade-in print:p-0 print:bg-white print:static print:inset-auto">
      
      {/* Container */}
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-5xl max-h-[96vh] flex flex-col overflow-hidden print:max-w-none print:max-h-none print:shadow-none print:border-none print:rounded-none">
        
        {/* Top Control Bar (Hidden when printing) */}
        <div className="no-print bg-slate-900 text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-600 rounded-lg text-white">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-black tracking-tight text-white uppercase">
                  Cetak Multi-Kartu A4 (Ukuran KTP)
                </h3>
                <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-1.5 py-0.5 rounded uppercase">
                  85.6 × 54 mm
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {activeItems.length} dari {itemsToPrint.length} kartu terpilih × {copiesPerCard} salinan = <strong className="text-white font-bold">{totalCards} kartu dicetak</strong> (± {estimatedPages} lembar A4)
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              disabled={cardsToPrint.length === 0}
              className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-black shadow-lg transition transform active:scale-95 ${
                cardsToPrint.length > 0
                  ? 'bg-blue-600 hover:bg-blue-500 text-white cursor-pointer'
                  : 'bg-slate-700 text-slate-400 cursor-not-allowed opacity-60'
              }`}
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Sekarang ({totalCards} Kartu)</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
              title="Tutup dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Checklist Selection Drawer (Hidden when printing) */}
        {itemsToPrint.length > 1 && (
          <div className="no-print bg-slate-100 border-b border-slate-300 px-5 py-3 shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <div className="flex items-center space-x-2">
                <CheckSquare className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-slate-800">
                  Ceklist Kartu yang Mau Dicetak:
                </span>
                <span className="bg-blue-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
                  {selectedItemIds.size} dari {itemsToPrint.length} kartu terpilih
                </span>
              </div>

              <div className="flex items-center space-x-1.5 text-xs">
                <button
                  type="button"
                  onClick={selectAll}
                  className="px-2.5 py-1 rounded-lg font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
                >
                  Pilih Semua ({itemsToPrint.length})
                </button>
                <button
                  type="button"
                  onClick={deselectAll}
                  className="px-2.5 py-1 rounded-lg font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
                >
                  Batal Pilih Semua
                </button>
              </div>
            </div>

            {/* Checklist Items Container */}
            <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-1.5 bg-white rounded-xl border border-slate-200 shadow-inner">
              {itemsToPrint.map((item, idx) => {
                const itemId = item.id || item.kode || `item-${idx}`;
                const isChecked = selectedItemIds.has(itemId);
                return (
                  <label
                    key={itemId}
                    className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border text-xs cursor-pointer select-none transition ${
                      isChecked
                        ? 'bg-blue-50/90 border-blue-400 text-blue-950 font-bold shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleItemSelection(itemId)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                    />
                    <span className="font-mono text-[11px] bg-slate-900 text-white px-1.5 py-0.5 rounded font-bold">
                      {item.kode || item.sku || `SAMPLE-${idx + 1}`}
                    </span>
                    {item.jenisSample && (
                      <span className="text-[10px] font-black uppercase px-1 py-0.2 bg-amber-400 text-slate-950 rounded">
                        {item.jenisSample}
                      </span>
                    )}
                    <span className="max-w-[150px] truncate text-slate-800 font-medium">
                      {item.style || item.deskripsi || item.name}
                    </span>
                    {item.size && (
                      <span className="text-[10px] bg-slate-200 text-slate-700 px-1 rounded font-bold uppercase">
                        {item.size}
                      </span>
                    )}
                    {item.color && (
                      <span className="text-[10px] text-slate-500">
                        • {item.color}
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* Toolbar: Options for copies & cut guidelines (Hidden when printing) */}
        <div className="no-print bg-slate-800/90 text-slate-200 px-5 py-2.5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 text-xs shrink-0">
          
          {/* Quick preset copies */}
          <div className="flex items-center space-x-2">
            <span className="text-slate-400 font-medium flex items-center gap-1">
              <Copy className="w-3.5 h-3.5 text-blue-400" />
              <span>Salinan Tiap Kartu:</span>
            </span>
            <div className="flex items-center space-x-1 bg-slate-900 p-1 rounded-lg border border-slate-700">
              <button
                type="button"
                onClick={() => setCopiesPerCard(1)}
                className={`px-2.5 py-1 rounded text-xs font-bold transition cursor-pointer ${
                  copiesPerCard === 1 
                    ? 'bg-blue-600 text-white shadow-xs' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                1 Salinan
              </button>
              <button
                type="button"
                onClick={() => setCopiesPerCard(8)}
                className={`px-2.5 py-1 rounded text-xs font-bold transition cursor-pointer ${
                  copiesPerCard === 8 
                    ? 'bg-blue-600 text-white shadow-xs' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                8 Salinan (1 Lembar)
              </button>
              <button
                type="button"
                onClick={() => setCopiesPerCard(10)}
                className={`px-2.5 py-1 rounded text-xs font-bold transition cursor-pointer ${
                  copiesPerCard === 10 
                    ? 'bg-blue-600 text-white shadow-xs' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                10 Salinan
              </button>
            </div>

            {/* Custom input */}
            <div className="flex items-center space-x-1 ml-1 text-slate-300">
              <span>atau:</span>
              <input
                type="number"
                min="1"
                max="100"
                value={copiesPerCard}
                onChange={(e) => setCopiesPerCard(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-14 bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-center text-xs font-bold text-white focus:outline-none focus:border-blue-500"
              />
              <span className="text-slate-400">lembar/kartu</span>
            </div>
          </div>

          {/* Cut guide toggle */}
          <label className="flex items-center space-x-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showCutGuides}
              onChange={(e) => setShowCutGuides(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5 cursor-pointer"
            />
            <span className="text-xs text-slate-300 flex items-center gap-1 font-medium">
              <Scissors className="w-3.5 h-3.5 text-amber-400" />
              <span>Garis Bantu Potong (Dashed Cut Lines)</span>
            </span>
          </label>
        </div>

        {/* Printable Paper Area */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-200 print:bg-white print:p-0 print:overflow-visible">
          
          {cardsToPrint.length === 0 ? (
            <div className="max-w-md mx-auto text-center py-16 px-4 bg-white rounded-2xl shadow-md border border-slate-300 text-slate-500 space-y-3">
              <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto border border-amber-200">
                <CheckSquare className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">
                Belum Ada Kartu yang Diceklist
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Silakan centang kartu pada daftar di atas untuk menampilkannya di lembar cetak A4.
              </p>
              <button
                type="button"
                onClick={selectAll}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
              >
                Centang Semua Kartu ({itemsToPrint.length})
              </button>
            </div>
          ) : (
            /* Simulated A4 Paper in screen preview */
            <div className="mx-auto bg-white shadow-xl rounded-md p-4 sm:p-6 max-w-[210mm] border border-slate-300 print:shadow-none print:border-none print:p-0 print:max-w-none print:m-0">
              
              {/* The Print Grid: 2 columns of KTP cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-[8mm] gap-y-[4mm] justify-items-center print:grid-cols-2 print:gap-x-[8mm] print:gap-y-[3mm] print:justify-center">
                {cardsToPrint.map((item, index) => (
                  <div 
                    key={item._printUniqueId || index}
                    className={`relative p-0 print:break-inside-avoid print:page-break-inside-avoid ${
                      showCutGuides 
                        ? 'border border-dashed border-slate-400 print:border-slate-400' 
                        : ''
                    }`}
                    style={{ width: '85.6mm', height: '53.98mm' }}
                  >
                    <InventoryCard item={item} isPrintMode={true} />
                  </div>
                ))}
              </div>

            </div>
          )}

        </div>

        {/* Modal Bottom Footer (Hidden when printing) */}
        <div className="no-print bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 shrink-0">
          <div className="flex items-center space-x-2">
            <span className="font-semibold">Ukuran KTP Standar:</span>
            <span className="font-mono bg-slate-200 px-1.5 py-0.5 rounded text-slate-800 font-bold">85.6 mm × 54.0 mm</span>
            <span className="text-slate-400">•</span>
            <span>Muat hingga <strong>8–10 kartu</strong> dalam 1 lembar kertas A4</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-100 font-semibold text-slate-700 transition cursor-pointer"
            >
              Tutup
            </button>
            <button
              onClick={handlePrint}
              disabled={cardsToPrint.length === 0}
              className={`px-5 py-2 rounded-lg font-bold flex items-center space-x-1.5 shadow-sm transition ${
                cardsToPrint.length > 0
                  ? 'bg-slate-900 hover:bg-slate-800 text-white cursor-pointer'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>Cetak {totalCards} Kartu</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
