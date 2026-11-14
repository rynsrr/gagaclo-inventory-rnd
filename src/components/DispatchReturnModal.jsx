import { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import {
  X,
  RotateCcw,
  Box as BoxIcon,
  Calendar,
  FileText,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { decodeDispatchData } from '../utils/dispatchUtils';

export function DispatchReturnModal({ isOpen, onClose, item }) {
  const { returnDispatchedItem, boxes, currentUser } = useInventory();

  const dispatchInfo = decodeDispatchData(item);
  const defaultTargetBox = Number(dispatchInfo?.originBox || item?.boxNumber || 1);

  const [targetBoxNumber, setTargetBoxNumber] = useState(defaultTargetBox);
  const [returnDate, setReturnDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('Selesai review, kondisi baik.');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !item) return null;

  const selectedBoxObj = boxes.find(b => Number(b.boxNumber) === Number(targetBoxNumber));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await returnDispatchedItem(item, {
        targetBoxNumber: Number(targetBoxNumber),
        date: returnDate,
        notes: notes.trim(),
      });
      onClose();
    } catch (err) {
      console.error('Return dispatch error:', err);
      setError(err?.message || 'Gagal memproses penerimaan kembali sampel.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in no-print">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 rounded-xl border border-emerald-400/30 text-emerald-300">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black tracking-tight text-white flex items-center gap-2">
                Terima Kembali Sampel ke Box
              </h3>
              <p className="text-[11px] text-emerald-200 font-medium">
                Selesai review dari {dispatchInfo?.destinationLabel || 'Review Luar'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Item Details Summary */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
              <span>Sampel yang Diterima Kembali:</span>
              <span className="font-mono text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded border border-emerald-300">
                {item.jumlah ?? item.qty ?? 1} PCS
              </span>
            </div>
            <div className="text-sm font-black text-slate-900">
              {item.style || item.name || 'Sample R&D'}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600 font-mono">
              <span>Kode: <strong>{item.kode || item.sku}</strong></span>
              {item.sampleNo && <span>• No: <strong>{item.sampleNo}</strong></span>}
              {item.size && <span>• Size: <strong>{item.size}</strong></span>}
              {item.color && <span>• Color: <strong>{item.color}</strong></span>}
            </div>
            <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200">
              Asal pengiriman: <strong>{dispatchInfo?.destinationLabel || 'Review'}</strong> • Asal Box awal: <strong>BOX #{defaultTargetBox}</strong>
            </div>
          </div>

          {/* Target Box Selection */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-800 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <BoxIcon className="w-3.5 h-3.5 text-emerald-600" />
                Simpan Kembali ke Box Target <span className="text-rose-500">*</span>
              </span>
              <span className="text-[10px] text-slate-400 font-normal">Pilih Box 1 - 72</span>
            </label>
            <select
              value={targetBoxNumber}
              onChange={(e) => setTargetBoxNumber(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            >
              {boxes.map((b) => (
                <option key={b.boxNumber} value={b.boxNumber}>
                  BOX #{b.boxNumber} ({b.rackName || 'RACK'} - PIC: {b.picName || 'Royan'}) {b.boxNumber === defaultTargetBox ? '★ Box Asal' : ''}
                </option>
              ))}
            </select>
            {selectedBoxObj && (
              <p className="text-[11px] text-emerald-700 font-medium">
                Disimpan di: <strong>BOX #{selectedBoxObj.boxNumber}</strong> ({selectedBoxObj.rackName} • PIC: {selectedBoxObj.picName})
              </p>
            )}
          </div>

          {/* Return Date */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-800 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              Tanggal Diterima Kembali *
            </label>
            <input
              type="date"
              value={returnDate}
              onChange={(e) => setReturnDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            />
          </div>

          {/* Notes / Condition */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-800 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              Catatan Kondisi / Keterangan (Opsional)
            </label>
            <textarea
              rows="2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Selesai review, kondisi baik, fitting disetujui..."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs resize-none"
            />
          </div>

          <div className="text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-100 pt-2">
            <span>PIC Penerima: <strong>{currentUser?.name || 'Royan'}</strong></span>
            <span>Stok Box #{targetBoxNumber} akan bertambah</span>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Menyimpan...' : 'Konfirmasi Terima ke Box'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default DispatchReturnModal;
