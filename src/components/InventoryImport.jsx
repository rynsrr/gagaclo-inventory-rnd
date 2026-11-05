import React, { useRef, useState } from 'react';
import { Download, Upload, X } from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { parseInventoryRows } from '../utils/inventoryExcel';

export function InventoryImport() {
  const dialogRef = useRef(null);
  const { boxes, importInventoryItems } = useInventory();
  const [items, setItems] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

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
      if (!sheet) throw new Error('Lembar Data tidak ditemukan.');
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
      setMessage(`${items.length} item ditambahkan.`);
      setItems([]);
      if (warning) setError(warning);
    } catch (err) {
      setError(err.message || 'Impor gagal.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" onClick={() => dialogRef.current.showModal()}
        className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-semibold hover:bg-slate-100">
        <Upload className="h-3.5 w-3.5" /> Impor Excel
      </button>
      <dialog ref={dialogRef} onCancel={event => { if (busy) event.preventDefault(); }}
        aria-labelledby="inventory-import-title"
        className="no-print m-auto w-[min(92vw,28rem)] rounded-2xl border border-slate-200 bg-white p-5 shadow-xl backdrop:bg-black/45">
        <div className="flex items-center justify-between">
          <h2 id="inventory-import-title" className="text-base font-bold">Impor Excel</h2>
          <button type="button" aria-label="Tutup" disabled={busy}
            onClick={() => dialogRef.current.close()} className="rounded-lg p-1 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="my-3 text-sm text-slate-600">Isi lembar Data, lalu pilih file. Setiap baris menambah item baru.</p>
        <a href="/template-impor-inventory.xlsx" download
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700">
          <Download className="h-4 w-4" /> Unduh template Excel
        </a>
        <label className="mt-4 block text-sm font-semibold">
          Pilih file Excel
          <input type="file" accept=".xlsx" disabled={busy} onChange={readFile}
            className="mt-1 block w-full rounded-lg border border-slate-200 p-2 text-sm" />
        </label>
        {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
        {message && <p role="status" className="mt-3 text-sm text-emerald-700">{message}</p>}
        {items.length > 0 && <p className="mt-3 text-sm">{items.length} item siap ditambahkan.</p>}
        <button type="button" disabled={busy || !items.length} onClick={saveItems}
          className="mt-4 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {busy ? 'Memproses…' : 'Simpan ke Inventory'}
        </button>
      </dialog>
    </>
  );
}
