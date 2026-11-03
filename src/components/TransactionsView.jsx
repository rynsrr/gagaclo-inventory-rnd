import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { 
  ArrowLeftRight, 
  ArrowDownLeft, 
  ArrowUpRight, 
  RotateCcw, 
  MoveRight, 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  User, 
  FileText 
} from 'lucide-react';

export const TransactionsView = ({ onOpenTransactionModal }) => {
  const { transactions, boxes } = useInventory();
  const [filterType, setFilterType] = useState('ALL');
  const [search, setSearch] = useState('');

  const filtered = transactions.filter((t) => {
    if (filterType !== 'ALL' && t.type !== filterType) return false;
    if (search.trim() !== '') {
      const q = search.toLowerCase();
      return (
        t.itemName.toLowerCase().includes(q) ||
        (t.picName && t.picName.toLowerCase().includes(q)) ||
        (t.recipientOrSource && t.recipientOrSource.toLowerCase().includes(q)) ||
        (t.notes && t.notes.toLowerCase().includes(q)) ||
        String(t.boxNumber).includes(q)
      );
    }
    return true;
  });

  const getTrxBadge = (type) => {
    switch (type) {
      case 'IN':
        return (
          <span className="inline-flex items-center space-x-1 text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
            <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
            <span>MASUK (IN)</span>
          </span>
        );
      case 'OUT':
        return (
          <span className="inline-flex items-center space-x-1 text-xs font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
            <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
            <span>KELUAR (OUT)</span>
          </span>
        );
      case 'BORROW':
        return (
          <span className="inline-flex items-center space-x-1 text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>PINJAM</span>
          </span>
        );
      case 'RETURN':
        return (
          <span className="inline-flex items-center space-x-1 text-xs font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800">
            <RotateCcw className="w-3.5 h-3.5 text-sky-600" />
            <span>KEMBALI</span>
          </span>
        );
      case 'RELOCATE':
        return (
          <span className="inline-flex items-center space-x-1 text-xs font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
            <MoveRight className="w-3.5 h-3.5 text-purple-600" />
            <span>PINDAH BOX</span>
          </span>
        );
      default:
        return <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100">{type}</span>;
    }
  };

  return (
    <div className="space-y-5">
      
      {/* Top Filter and Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari transaksi: nama barang, peminjam, box..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
            />
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onOpenTransactionModal}
              className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>+ Catat Mutasi Baru</span>
            </button>
          </div>

        </div>

        {/* Filter Type Pills */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs">
          <span className="font-bold text-slate-500 mr-1">Tipe Mutasi:</span>
          {['ALL', 'IN', 'OUT', 'BORROW', 'RETURN', 'RELOCATE'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1 rounded-lg font-semibold transition ${
                filterType === type
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {type === 'ALL' ? 'Semua Mutasi' : type}
            </button>
          ))}
          <span className="ml-auto text-slate-500">
            Total {filtered.length} log aktivitas
          </span>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-900 text-slate-200 font-bold uppercase tracking-wider text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Waktu</th>
                <th className="py-3 px-4">Tipe Mutasi</th>
                <th className="py-3 px-4">Nama Barang</th>
                <th className="py-3 px-4">Lokasi Box</th>
                <th className="py-3 px-4 text-center">Qty</th>
                <th className="py-3 px-4">PIC PPIC</th>
                <th className="py-3 px-4">Pihak / Tujuan</th>
                <th className="py-3 px-4">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Belum ada catatan mutasi yang cocok.
                  </td>
                </tr>
              ) : (
                filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition">
                    <td className="py-3.5 px-4 font-mono text-slate-600 whitespace-nowrap">
                      {t.date}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getTrxBadge(t.type)}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 max-w-xs">
                      {t.itemName}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-700">
                      BOX #{t.boxNumber}
                      {t.rackName && <span className="text-[10px] text-slate-400 block font-normal">{t.rackName}</span>}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-900">
                      {t.qty} <span className="text-[10px] font-normal text-slate-500">{t.unit || 'pcs'}</span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      {t.picName}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 max-w-xs">
                      {t.recipientOrSource || '-'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 text-[11px] max-w-xs">
                      {t.notes || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
