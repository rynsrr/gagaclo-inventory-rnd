import React from 'react';
import { X, Printer, CheckSquare, Square, Download } from 'lucide-react';
import { InventoryCard } from './InventoryCard';

export const CardPrintModal = ({ itemsToPrint, onClose }) => {
  if (!itemsToPrint || itemsToPrint.length === 0) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-5xl max-h-[95vh] flex flex-col overflow-hidden">
        
        {/* Header (hidden in print) */}
        <div className="no-print bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-600 rounded-lg text-white">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Cetak Kartu Inventory Sample ({itemsToPrint.length} Card)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Format kartu sesuai standar fisik: Track, Tanggal, Kode, Deskripsi, Color, Jumlah, Satuan, Place, Qty Dipakai, Tanggal Dipakai.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-md transition"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Sekarang (Print / PDF)</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Area */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-100 print:bg-white print:p-0">
          
          <div className="no-print mb-4 text-xs text-slate-600 bg-blue-50 border border-blue-200 p-3 rounded-lg flex items-center justify-between">
            <span>
              💡 <strong>Tips Cetak:</strong> Klik <strong>"Cetak Sekarang"</strong> untuk membuka dialog cetak browser. Kartu dapat dipotong sesuai garis tepi dan dimasukkan ke dalam box penyimpanan atau ditempelkan pada plastik sampel.
            </span>
            <span className="font-bold text-blue-800">
              {itemsToPrint.length} Kartu Siap Cetak
            </span>
          </div>

          {/* Grid of cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-6 justify-items-center print:grid-cols-2 print:gap-4 print:p-2">
            {itemsToPrint.map((item, index) => (
              <div 
                key={item.id || index}
                className="relative print:break-inside-avoid print:page-break-inside-avoid"
              >
                <InventoryCard item={item} isPrintMode={true} />
              </div>
            ))}
          </div>

        </div>

        {/* Footer (hidden in print) */}
        <div className="no-print bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Total: <strong>{itemsToPrint.length} kartu</strong></span>
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
              <span>Cetak Kartu</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
