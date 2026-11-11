import React, { useState } from 'react';
import { 
  X, 
  Printer, 
  CheckSquare, 
  Square, 
  FileText, 
  Search,
  Filter
} from 'lucide-react';

export const SampleListPrintModal = ({ box, items = [], onClose }) => {
  const [selectedIds, setSelectedIds] = useState(() => new Set(items.map((i, idx) => i.id || `item-${idx}`)));
  const [searchTerm, setSearchTerm] = useState('');

  if (!box) return null;

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(items.map((i, idx) => i.id || `item-${idx}`)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const filteredItems = items.filter(item => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const matchCode = (item.kode || item.sku || '').toLowerCase().includes(term);
    const matchStyle = (item.style || item.deskripsi || item.name || '').toLowerCase().includes(term);
    const matchSampleNo = (item.sampleNo || '').toLowerCase().includes(term);
    const matchColor = (item.color || item.warna || '').toLowerCase().includes(term);
    const matchSize = (item.size || '').toLowerCase().includes(term);
    return matchCode || matchStyle || matchSampleNo || matchColor || matchSize;
  });

  const activeItems = filteredItems.filter((item, idx) => {
    const id = item.id || `item-${idx}`;
    return selectedIds.has(id);
  });

  const totalUnits = activeItems.reduce((sum, item) => sum + (Number(item.qty || item.jumlah) || 1), 0);

  const handlePrint = () => {
    window.print();
  };

  const printDateStr = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="fixed inset-0 z-[80] bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fade-in print:p-0 print:bg-white print:static print:inset-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-5xl max-h-[96vh] flex flex-col overflow-hidden print:max-w-none print:max-h-none print:shadow-none print:border-none print:rounded-none">
        
        {/* Top Control Bar (Hidden on print) */}
        <div className="no-print bg-slate-900 text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-wide flex items-center gap-2">
                <span>Print List Sample — BOX #{box.boxNumber}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                  {box.rackName}
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Format Lembar Manifest / Daftar Isi Box resmi untuk arsip & stock opname fisik
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handlePrint}
              disabled={activeItems.length === 0}
              className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-900/30 transition cursor-pointer active:scale-95"
            >
              <Printer className="w-4 h-4 text-white" />
              <span>Cetak Sekarang ({activeItems.length} Item)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup jendela cetak list sample"
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter & Toolbar (Hidden on print) */}
        <div className="no-print bg-slate-50 px-5 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-3">
            <span className="text-slate-600 font-semibold">Pilih Item:</span>
            <button
              type="button"
              onClick={selectAll}
              className="inline-flex items-center gap-1 text-slate-700 hover:text-blue-600 font-medium"
            >
              <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
              <span>Pilih Semua ({items.length})</span>
            </button>
            <button
              type="button"
              onClick={deselectAll}
              className="inline-flex items-center gap-1 text-slate-700 hover:text-rose-600 font-medium"
            >
              <Square className="w-3.5 h-3.5 text-slate-400" />
              <span>Kosongkan</span>
            </button>
          </div>

          <div className="flex items-center space-x-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Saring kode/style..."
                className="pl-8 pr-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs w-48 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <span className="text-slate-500 font-medium">
              Terpilih: <strong className="text-slate-900">{activeItems.length}</strong> dari {items.length} item ({totalUnits} unit)
            </span>
          </div>
        </div>

        {/* Printable Document Body (Preview on screen, full A4 on print) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 print:p-0 print:overflow-visible">
          
          <div className="max-w-[210mm] mx-auto bg-white p-6 sm:p-8 border border-slate-200 print:border-none shadow-sm print:shadow-none print:p-0 print:m-0 text-slate-900 font-sans text-xs">
            
            {/* Header Instansi & Judul Dokumen */}
            <div className="border-b-2 border-slate-900 pb-3 mb-4 flex items-start justify-between">
              <div>
                <h1 className="text-base font-black tracking-tight text-slate-950 uppercase">
                  PT GAGACLO INDONESIA
                </h1>
                <p className="text-[11px] font-bold text-slate-700 tracking-wider uppercase">
                  RESEARCH & DEVELOPMENT DIVISION — INVENTORY SYSTEM
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Dokumen Manifest & Daftar Isi Sampel Box Fisik
                </p>
              </div>

              <div className="text-right">
                <span className="inline-block px-3 py-1 bg-slate-900 text-white font-black text-sm rounded tracking-wide">
                  BOX #{box.boxNumber}
                </span>
                <p className="text-[10px] text-slate-500 mt-1">
                  Dicetak: {printDateStr} WIB
                </p>
              </div>
            </div>

            {/* Box Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200 mb-4 print:bg-white print:border-slate-300 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Kategori Box</span>
                <span className="font-extrabold text-slate-900">{box.category || 'SAMPLE'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Lokasi / Rak</span>
                <span className="font-extrabold text-slate-900">{box.rackName || 'RACK'}</span>
                {box.rackDescription && (
                  <span className="text-[10px] text-slate-500 block truncate">{box.rackDescription}</span>
                )}
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">PIC Pengelola</span>
                <span className="font-extrabold text-slate-900">#{box.ppicNumber} {box.picName}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Isi</span>
                <span className="font-extrabold text-slate-900">{activeItems.length} Item ({totalUnits} Unit)</span>
              </div>
              {box.notes && (
                <div className="col-span-2 sm:col-span-4 pt-1 border-t border-slate-200 print:border-slate-300">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Catatan Box</span>
                  <span className="text-slate-700 italic">{box.notes}</span>
                </div>
              )}
            </div>

            {/* Table of Samples */}
            {activeItems.length > 0 ? (
              <div className="border border-slate-300 rounded-md overflow-hidden mb-6 print:border-slate-400">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-slate-100 print:bg-slate-200 text-slate-900 border-b border-slate-300 print:border-slate-400 font-bold uppercase text-[10px]">
                      <th className="py-2 px-2.5 w-10 text-center border-r border-slate-300 print:border-slate-400">No.</th>
                      <th className="py-2 px-3 w-32 border-r border-slate-300 print:border-slate-400">Kode Sample</th>
                      <th className="py-2 px-3 border-r border-slate-300 print:border-slate-400">Style & Deskripsi</th>
                      <th className="py-2 px-3 w-28 border-r border-slate-300 print:border-slate-400">Size & Warna</th>
                      <th className="py-2 px-2.5 w-16 text-center border-r border-slate-300 print:border-slate-400">Qty</th>
                      <th className="py-2 px-2.5 w-24 text-center border-r border-slate-300 print:border-slate-400">Status</th>
                      <th className="py-2 px-2.5 w-14 text-center">Cek</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 print:divide-slate-300">
                    {activeItems.map((item, idx) => (
                      <tr 
                        key={item.id || idx}
                        className="hover:bg-slate-50/80 transition print:break-inside-avoid print:page-break-inside-avoid"
                      >
                        <td className="py-1.5 px-2.5 text-center text-slate-500 border-r border-slate-300 print:border-slate-300 tabular-nums">
                          {idx + 1}
                        </td>
                        <td className="py-1.5 px-3 font-mono font-bold text-slate-900 border-r border-slate-300 print:border-slate-300 whitespace-nowrap">
                          {item.kode || item.sku || '-'}
                        </td>
                        <td className="py-1.5 px-3 border-r border-slate-300 print:border-slate-300">
                          <div className="font-bold text-slate-900 leading-snug">
                            {item.style || item.deskripsi || item.name || 'Sample'}
                          </div>
                          {(item.sampleNo || item.buyerNo) && (
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              {item.sampleNo ? `Sample No: ${item.sampleNo}` : ''}
                              {item.sampleNo && item.buyerNo ? ' • ' : ''}
                              {item.buyerNo ? `Buyer: ${item.buyerNo}` : ''}
                            </div>
                          )}
                        </td>
                        <td className="py-1.5 px-3 border-r border-slate-300 print:border-slate-300 text-slate-700">
                          <span className="font-semibold">{item.size || '-'}</span>
                          {(item.color || item.warna) && (
                            <span className="text-slate-500 block text-[10px]">
                              {item.color || item.warna}
                            </span>
                          )}
                        </td>
                        <td className="py-1.5 px-2.5 text-center font-bold text-slate-900 border-r border-slate-300 print:border-slate-300 whitespace-nowrap">
                          {item.qty || item.jumlah || 1} {item.satuan || item.unit || 'PCS'}
                        </td>
                        <td className="py-1.5 px-2.5 text-center border-r border-slate-300 print:border-slate-300 text-[10px]">
                          <span className={`inline-block px-1.5 py-0.5 rounded font-bold ${
                            item.borrowStatus === 'BORROWED'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          }`}>
                            {item.borrowStatus === 'BORROWED' ? 'Dipinjam' : 'Tersimpan'}
                          </span>
                        </td>
                        <td className="py-1.5 px-2.5 text-center">
                          <span className="inline-block w-4 h-4 border border-slate-400 rounded-sm"></span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-10 border border-dashed border-slate-300 rounded-lg text-slate-400">
                Tidak ada sampel yang dipilih untuk dicetak.
              </div>
            )}

            {/* Signature & Verification Block */}
            <div className="grid grid-cols-2 gap-8 pt-4 border-t border-slate-300 text-xs print:break-inside-avoid">
              <div className="text-center">
                <p className="text-[10px] uppercase font-bold text-slate-500 mb-12">
                  Dibuat / Disiapkan Oleh (PIC Box)
                </p>
                <div className="w-48 mx-auto border-b border-slate-800 mb-1"></div>
                <p className="font-bold text-slate-900">#{box.ppicNumber} {box.picName}</p>
                <p className="text-[10px] text-slate-500">Tim R&D Gagaclo</p>
              </div>

              <div className="text-center">
                <p className="text-[10px] uppercase font-bold text-slate-500 mb-12">
                  Diperiksa & Diverifikasi Oleh
                </p>
                <div className="w-48 mx-auto border-b border-slate-800 mb-1"></div>
                <p className="font-bold text-slate-900">( Supervisor / Leader R&D )</p>
                <p className="text-[10px] text-slate-500">Tanggal: _____ / _____ / 2026</p>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
