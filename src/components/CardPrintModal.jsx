import React, { useState } from 'react';
import { X, Printer, Copy, Scissors } from 'lucide-react';
import { InventoryCard } from './InventoryCard';

export const CardPrintModal = ({ itemsToPrint, onClose }) => {
  if (!itemsToPrint || itemsToPrint.length === 0) return null;

  const isSingleItem = itemsToPrint.length === 1;
  // Default to 8 copies if single item so it fills 1 A4 sheet (2 columns x 4 rows), or 1 if multiple items
  const [copiesPerCard, setCopiesPerCard] = useState(isSingleItem ? 8 : 1);
  const [showCutGuides, setShowCutGuides] = useState(true);

  // Generate flat list of cards to print
  const cardsToPrint = [];
  itemsToPrint.forEach((item, itemIdx) => {
    for (let c = 0; c < copiesPerCard; c++) {
      cardsToPrint.push({
        ...item,
        _printUniqueId: `${item.id || item.kode || itemIdx}-copy-${c}`
      });
    }
  });

  const totalCards = cardsToPrint.length;
  const estimatedPages = Math.ceil(totalCards / 8); // 8 cards per A4 page (optimal comfortable spacing)

  const handlePrint = () => {
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
                {itemsToPrint.length} item × {copiesPerCard} salinan = <strong className="text-white font-bold">{totalCards} kartu</strong> (± {estimatedPages} lembar kertas A4)
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="flex items-center space-x-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black shadow-lg transition transform active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Sekarang (Print / PDF)</span>
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

        {/* Toolbar: Options for copies & cut guidelines (Hidden when printing) */}
        <div className="no-print bg-slate-800/90 text-slate-200 px-5 py-2.5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 text-xs shrink-0">
          
          {/* Quick preset copies */}
          <div className="flex items-center space-x-2">
            <span className="text-slate-400 font-medium flex items-center gap-1">
              <Copy className="w-3.5 h-3.5 text-blue-400" />
              <span>Salinan:</span>
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
                1 Kartu
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
                8 Kartu (1 Lembar A4)
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
                10 Kartu (1 Lembar Penuh)
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
              <span className="text-slate-400">kartu</span>
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
          
          {/* Simulated A4 Paper in screen preview */}
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
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold flex items-center space-x-1.5 shadow-sm transition cursor-pointer"
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
