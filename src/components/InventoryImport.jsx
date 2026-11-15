import React, { useState } from 'react';
import { Download, Upload, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { parseInventoryRows } from '../utils/inventoryExcel';

export function InventoryImport({ isOpen, onClose }) {
  const { boxes, importInventoryItems } = useInventory();
  const [items, setItems] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!isOpen) return null;

  async function readFile(event) {
    const file = event.target.files[0];
    setItems([]);
    setMessage('');
    setError('');
    if (!file) return;
    setBusy(true);
    try {
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(await file.arrayBuffer(), { cellDates: false });
      const sheet = workbook.Sheets.Data;
      if (!sheet) throw new Error('Lembar "Data" tidak ditemukan di dalam file Excel.');
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, dateNF: 'yyyy-mm-dd' });
      setItems(parseInventoryRows(rows, boxes));
    } catch (err) {
      setError(err.message || 'File Excel tidak bisa dibaca.');
    } finally {
      setBusy(false);
    }
  }

  async function saveItems() {
    setBusy(true);
    setError('');
    try {
      const warning = await importInventoryItems(items);
      setMessage(`${items.length} item berhasil ditambahkan ke inventaris.`);
      setItems([]);
      if (warning) setError(warning);
    } catch (err) {
      setError(err.message || 'Impor gagal.');
    } finally {
      setBusy(false);
    }
  }

  const handleClose = () => {
    if (busy) return;
    setItems([]);
    setMessage('');
    setError('');
    if (onClose) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden text-slate-800">
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-emerald-600 text-white">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">Impor Data Excel (.xlsx)</h3>
              <p className="text-[10px] text-slate-400">Tambahkan data sample &amp; material dari spreadsheet</p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Tutup"
            disabled={busy}
            onClick={handleClose}
            className="p-1 text-slate-400 hover:text-white rounded-md transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs">
          <p className="text-slate-600 leading-relaxed">
            Isi lembar sheet <strong>Data</strong> pada template Excel, lalu pilih file. Setiap baris akan ditambahkan sebagai item baru ke dalam box terkait.
          </p>

          <a
            href="/template-impor-inventory.xlsx"
            download
            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Unduh Template Excel Resmi</span>
          </a>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Pilih File Spreadsheet (.xlsx)
            </label>
            <input
              type="file"
              accept=".xlsx"
              disabled={busy}
              onChange={readFile}
              className="block w-full text-xs text-slate-700 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 file:cursor-pointer border border-slate-200 rounded-lg p-1.5 cursor-pointer"
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {message && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-start gap-2 font-semibold">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <span>{message}</span>
            </div>
          )}

          {items.length > 0 && (
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 font-bold flex items-center justify-between">
              <span>Siap ditambahkan:</span>
              <span className="px-2 py-0.5 rounded bg-blue-600 text-white font-mono text-xs">{items.length} item</span>
            </div>
          )}

          {/* Footer Action */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={handleClose}
              className="px-3 py-2 rounded-lg border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition cursor-pointer"
            >
              Tutup
            </button>
            <button
              type="button"
              disabled={busy || !items.length}
              onClick={saveItems}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{busy ? 'Memproses…' : 'Simpan ke Inventory'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
