import React, { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { useInventory } from '../context/InventoryContext';
import {
  Archive,
  ClipboardList,
  Search,
  List,
  Download,
  Pencil,
  Trash2,
  Plus,
} from 'lucide-react';

export function TotalItemsSummaryView() {
  const { boxes, items, deleteItem, setItemModalConfig } = useInventory();
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // Full item list with rack lookup + search
  const [query, setQuery] = useState('');
  const boxRackMap = useMemo(() => {
    const map = {};
    boxes.forEach((b) => {
      map[b.boxNumber] = b;
    });
    return map;
  }, [boxes]);

  const allItems = useMemo(() => {
    return items
      .map((item) => {
        const box = boxRackMap[Number(item.boxNumber)];
        return {
          ...item,
          track: item.track || '-',
          tanggal: item.tanggal || item.dateIn || '-',
          kode: item.kode || item.sku || '-',
          buyerNo: item.buyerNo || item.buyerNumber || '-',
          jenisSample: item.jenisSample || item.sampleType || 'DEVELOP',
          style: item.style || item.name || '-',
          sampleNo: item.sampleNo && item.sampleNo !== 'NA' ? item.sampleNo : '-',
          size: item.size || '-',
          color: item.color && item.color !== '-' ? item.color : '-',
          jumlah: Number.isFinite(Number(item.jumlah)) ? Number(item.jumlah) : (Number(item.qty) || 0),
          satuan: (item.satuan || item.unit || 'PCS').toUpperCase(),
          place: item.place || (box ? `BOX ${box.boxNumber} (${box.rackName} - ${box.picName})` : '-'),
          boxLabel: `BOX ${item.boxNumber}`,
          rackName: box ? box.rackName : '-',
          picName: item.picName || (box ? box.picName : '-'),
          dateIn: item.dateIn || item.tanggal || '-',
        };
      })
      .sort((a, b) => Number(b.boxNumber) - Number(a.boxNumber) || (a.style || '').localeCompare(b.style || ''));
  }, [items, boxRackMap]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allItems;
    return allItems.filter((item) =>
      [
        item.track, item.tanggal, item.kode, item.buyerNo, item.jenisSample,
        item.style, item.sampleNo, item.size, item.color, item.satuan,
        item.place, item.boxLabel, item.rackName, item.picName, item.status,
      ]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q))
    );
  }, [allItems, query]);

  const dashClass = (value) => (value && value !== '-' ? 'text-slate-700' : 'text-slate-300');

  const handleExport = () => {
    const rows = filteredItems.map((item, i) => ({
      No: i + 1,
      Tanggal: item.tanggal,
      Kode: item.kode,
      Track: item.track,
      Buyer: item.buyerNo,
      'Jenis Sample': item.jenisSample,
      Style: item.style,
      'Sample No': item.sampleNo,
      Size: item.size,
      Color: item.color,
      Jumlah: item.jumlah,
      Satuan: item.satuan,
      Box: item.boxLabel,
      Rak: item.rackName,
      PIC: item.picName,
      Place: item.place,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ringkasan Inventory');
    XLSX.writeFile(wb, `GAGACLO_RINGKASAN_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <Archive className="h-5 w-5 text-blue-600" aria-hidden="true" />
          Ringkasan Total Item Tersimpan
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Preview agregat semua sample &amp; material yang tercatat di seluruh 72 box (5 rak).
        </p>
      </div>

      {/* Full item list */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <List className="h-4 w-4 text-slate-500" aria-hidden="true" />
            Daftar Semua Barang Tersimpan
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">
              {filteredItems.length} / {allItems.length}
            </span>
          </h2>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari kode, buyer, style, warna, box, rak, PIC..."
                className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <button
              type="button"
              onClick={() => setItemModalConfig({ isOpen: true, item: null, targetBoxNumber: null })}
              className="flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-100 whitespace-nowrap"
              title="Tambah item / sample baru"
            >
              <Plus className="h-4 w-4" />
              Tambah Item
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100 whitespace-nowrap"
              title="Export daftar ini (sesuai pencarian) ke Excel (.xlsx)"
            >
              <Download className="h-4 w-4" />
              Export Excel
            </button>
          </div>
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-400">
                <th className="w-8 px-3 py-2 font-semibold">#</th>
                <th className="whitespace-nowrap px-3 py-2 font-semibold">Tanggal</th>
                <th className="px-3 py-2 font-semibold">Kode &amp; Track</th>
                <th className="whitespace-nowrap px-3 py-2 font-semibold">Buyer</th>
                <th className="whitespace-nowrap px-3 py-2 font-semibold">Jenis</th>
                <th className="px-3 py-2 font-semibold">Deskripsi</th>
                <th className="whitespace-nowrap px-3 py-2 text-right font-semibold">Qty</th>
                <th className="px-3 py-2 font-semibold">Lokasi</th>
                <th className="w-20 px-3 py-2 text-center font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-sm text-slate-400">
                    Tidak ada barang yang cocok dengan pencarian.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, idx) => (
                  <tr key={item.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 align-top">
                    <td className="px-3 py-2.5 text-slate-400">{idx + 1}</td>
                    <td className={`px-3 py-2.5 whitespace-nowrap ${dashClass(item.tanggal)}`}>{item.tanggal}</td>
                    <td className="px-3 py-2.5">
                      <div className={`font-mono text-xs font-semibold ${dashClass(item.kode)}`}>{item.kode}</div>
                      {item.track && item.track !== '-' && (
                        <div className="mt-0.5 font-mono text-[10px] text-slate-400">Track: {item.track}</div>
                      )}
                    </td>
                    <td className={`px-3 py-2.5 whitespace-nowrap font-mono text-xs ${dashClass(item.buyerNo)}`}>{item.buyerNo}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className="rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                        {item.jenisSample}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 max-w-[22rem] break-words">
                      <div className="font-medium text-slate-800">{item.style}</div>
                      <div className="mt-0.5 space-x-2 text-[11px] text-slate-500">
                        {item.sampleNo && item.sampleNo !== '-' && <span>Sample: <strong className="text-slate-600">{item.sampleNo}</strong></span>}
                        {item.size && item.size !== '-' && <span>Size: <strong className="text-slate-600">{item.size}</strong></span>}
                        {item.color && item.color !== '-' && <span className={dashClass(item.color)}>{item.color}</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-right font-bold text-slate-900">
                      {item.jumlah.toLocaleString('id-ID')} <span className="text-[11px] font-normal text-slate-400">{item.satuan}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="text-xs font-semibold text-slate-700">{item.boxLabel}</div>
                      <div className="mt-0.5 text-[11px] text-slate-500">
                        {item.rackName}
                        {item.picName && item.picName !== '-' && ` • ${item.picName}`}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setItemModalConfig({ isOpen: true, item, targetBoxNumber: Number(item.boxNumber) })}
                          className="p-1.5 rounded-lg bg-blue-50 text-blue-600 transition hover:bg-blue-100"
                          title="Edit item ini"
                          aria-label={`Edit ${item.style || item.kode}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        {confirmDeleteId === item.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await deleteItem(item.id);
                                } catch (e) {
                                  alert('Gagal menghapus item: ' + (e?.message || e));
                                }
                                setConfirmDeleteId(null);
                              }}
                              className="px-2 py-1 rounded-lg bg-red-600 text-white text-[11px] font-bold transition hover:bg-red-700"
                              title="Konfirmasi hapus permanen"
                            >
                              Hapus?
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-1.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-[11px] font-bold transition hover:bg-slate-200"
                              title="Batal"
                            >
                              Batal
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(item.id)}
                            className="p-1.5 rounded-lg bg-red-50 text-red-600 transition hover:bg-red-100"
                            title="Hapus item ini"
                            aria-label={`Hapus ${item.style || item.kode}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
