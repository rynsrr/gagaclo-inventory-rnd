import React, { useState } from 'react';
import { Download, Upload, X, CheckCircle2, AlertCircle, FileSpreadsheet, Loader2 } from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { parseInventoryRows, resolveDataSheet, applyCodesToWorkbook, downloadWorkbook } from '../utils/inventoryExcel';

export function InventoryImport({ isOpen, onClose }) {
  const { boxes, importInventoryItems } = useInventory();
  const [preview, setPreview] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState('');

  if (!isOpen) return null;

  async function readFile(event) {
    const file = event.target.files[0];
    setPreview(null);
    setMessage('');
    setError('');
    setFileName(file?.name || '');
    if (!file) return;
    setBusy(true);
    try {
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(await file.arrayBuffer(), { cellDates: false });
      const { sheetName, sheet } = resolveDataSheet(workbook);
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, dateNF: 'yyyy-mm-dd' });
      const parsed = parseInventoryRows(rows, boxes);
      setPreview({ workbook, sheetName, XLSX, ...parsed });
    } catch (err) {
      setError(err.message || 'File Excel tidak bisa dibaca.');
    } finally {
      setBusy(false);
    }
  }

  async function saveItems() {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await importInventoryItems(preview.items);
      const savedItems = result.items || [];
      const codedWorkbook = applyCodesToWorkbook(
        preview.workbook,
        preview.sheetName,
        savedItems,
        preview.sourceRows,
        preview.kodeColumn,
        preview.XLSX
      );
      const baseName = (fileName || 'import-inventory').replace(/\.(xlsx|xls)$/i, '');
      downloadWorkbook(codedWorkbook, `${baseName}-berkode.xlsx`, preview.XLSX);
      setMessage(`${savedItems.length} item tersimpan dan file Excel berkode sudah diunduh.`);
      setPreview({ ...preview, workbook: codedWorkbook, items: savedItems, saved: true });
      if (result.warning) setError(result.warning);
    } catch (err) {
      setError(err.message || 'Impor gagal.');
    } finally {
      setBusy(false);
    }
  }

  const handleClose = () => {
    if (busy) return;
    setPreview(null);
    setMessage('');
    setError('');
    setFileName('');
    if (onClose) onClose();
  };

  const items = preview?.items || [];
  const missingCodes = items.filter(item => !item.kode).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden text-slate-800">
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-emerald-600 text-white">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">Impor Data Excel (.xlsx)</h3>
              <p className="text-[10px] text-slate-400">Kode kosong akan diisi otomatis oleh sistem</p>
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

        <div className="p-5 space-y-4 text-xs">
          <p className="text-slate-600 leading-relaxed">
            Kosongkan kolom <strong>Kode</strong> bila belum punya. Sistem akan membuat kode berurutan untuk setiap baris, menyimpan ke inventory, lalu mengunduh file Excel yang sudah berisi kode.
          </p>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Kolom <strong>Tanggal</strong> boleh diisi <span className="font-mono font-semibold">NA</span> bila belum tersedia, atau format YYYY-MM-DD bila ada.
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
            <label className="block text-xs font-bold text-slate-700 mb-1.5" htmlFor="inventory-import-file">
              Pilih File Spreadsheet (.xlsx)
            </label>
            <input
              id="inventory-import-file"
              type="file"
              accept=".xlsx,.xls"
              disabled={busy}
              onChange={readFile}
              className="block w-full text-xs text-slate-700 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 file:cursor-pointer border border-slate-200 rounded-lg p-1.5 cursor-pointer"
            />
          </div>

          {busy && (
            <div className="flex items-center gap-2 text-slate-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Memproses file dan kode…</span>
            </div>
          )}

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

          {preview && items.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 font-bold">
                <span className="flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4" />
                  <span className="truncate max-w-[200px]">{fileName}</span>
                </span>
                <span className="px-2 py-0.5 rounded bg-blue-600 text-white font-mono text-xs shrink-0">{items.length} item</span>
              </div>
              {!preview.saved && (
                <p className="text-[11px] text-slate-500">
                  {missingCodes > 0
                    ? `${missingCodes} baris belum punya kode dan akan dibuat otomatis saat disimpan.`
                    : 'Semua baris sudah punya kode. Kode bentrok akan disesuaikan otomatis.'}
                </p>
              )}
              <div className="max-h-52 overflow-y-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-50 text-slate-600 uppercase tracking-wide">
                    <tr>
                      <th className="px-2.5 py-2 font-bold">Kode</th>
                      <th className="px-2.5 py-2 font-bold">Deskripsi</th>
                      <th className="px-2.5 py-2 font-bold">Box</th>
                      <th className="px-2.5 py-2 font-bold">Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr key={`${item.kode}-${index}`} className="border-t border-slate-100">
                        <td className="px-2.5 py-1.5 font-mono text-slate-900">
                          {item.kode || <span className="text-amber-600">otomatis</span>}
                        </td>
                        <td className="px-2.5 py-1.5 text-slate-600 truncate max-w-[160px]">{item.description}</td>
                        <td className="px-2.5 py-1.5 text-slate-600">{item.boxNumber}</td>
                        <td className="px-2.5 py-1.5 text-slate-600">{item.qty}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

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
              disabled={busy || !items.length || preview?.saved}
              onClick={saveItems}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{busy ? 'Memproses…' : 'Isi Kode & Simpan'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
