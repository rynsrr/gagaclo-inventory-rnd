import { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import {
  X,
  Send,
  Building2,
  Calendar,
  User,
  FileText,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
} from 'lucide-react';
import { DISPATCH_DESTINATIONS, DISPATCH_TYPES } from '../utils/dispatchUtils';

export function DispatchModal({ isOpen, onClose, item, preselectedItems = [] }) {
  const { dispatchItem, currentUser } = useInventory();

  // If single item or multiple items
  const itemsToDispatch = item ? [item] : preselectedItems;

  const [destinationId, setDestinationId] = useState('BUYER');
  const [customDestination, setCustomDestination] = useState('');
  const [dispatchType, setDispatchType] = useState('PERMANENT'); // 'PERMANENT' | 'REVIEW'
  const [dispatchDate, setDispatchDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [recipient, setRecipient] = useState('');
  const [notes, setNotes] = useState('');
  const [qty, setQty] = useState(() => {
    if (itemsToDispatch.length === 1) {
      return Number(itemsToDispatch[0].jumlah ?? itemsToDispatch[0].qty ?? 1);
    }
    return 1;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || itemsToDispatch.length === 0) return null;

  const isSingle = itemsToDispatch.length === 1;
  const singleItem = itemsToDispatch[0];
  const maxQty = Number(singleItem?.jumlah ?? singleItem?.qty ?? 1);

  const selectedDest = DISPATCH_DESTINATIONS.find(d => d.id === destinationId);
  const destinationLabel = destinationId === 'LAINNYA'
    ? (customDestination.trim() || 'Tujuan Khusus')
    : (selectedDest?.label || destinationId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (destinationId === 'LAINNYA' && !customDestination.trim()) {
      setError('Harap masukkan nama tujuan pengiriman.');
      return;
    }

    if (isSingle && (Number(qty) <= 0 || Number(qty) > maxQty)) {
      setError(`Jumlah pengiriman harus antara 1 sampai ${maxQty} PCS.`);
      return;
    }

    setIsSubmitting(true);
    try {
      for (const it of itemsToDispatch) {
        const itemQty = isSingle ? Number(qty) : Number(it.jumlah ?? it.qty ?? 1);
        await dispatchItem(it, {
          destinationId,
          destinationLabel,
          type: dispatchType,
          date: dispatchDate,
          qty: itemQty,
          recipient: recipient.trim(),
          notes: notes.trim(),
        });
      }
      onClose();
    } catch (err) {
      console.error('Dispatch error:', err);
      setError(err?.message || 'Gagal memproses pengiriman sampel.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in no-print">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-500/20 rounded-xl border border-blue-400/30 text-blue-300">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black tracking-tight text-white flex items-center gap-2">
                Catat Pengiriman Sampel Keluar R&D
              </h3>
              <p className="text-[11px] text-blue-200 font-medium">
                Kirim sampel ke Buyer, Anzo, RDTW, RDC, atau ANZOTW
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

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Item Preview Card */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
              <span>{isSingle ? 'Item yang Akan Dikirim:' : `${itemsToDispatch.length} Item Terpilih:`}</span>
              <span className="font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                {isSingle ? `BOX #${singleItem.boxNumber}` : 'Multi-Box'}
              </span>
            </div>

            {isSingle ? (
              <div className="space-y-1">
                <div className="text-sm font-black text-slate-900">
                  {singleItem.style || singleItem.name || 'Sample R&D'}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600 font-mono">
                  <span>Kode: <strong>{singleItem.kode || singleItem.sku}</strong></span>
                  {singleItem.sampleNo && <span>• No: <strong>{singleItem.sampleNo}</strong></span>}
                  {singleItem.size && <span>• Size: <strong>{singleItem.size}</strong></span>}
                  {singleItem.color && <span>• Color: <strong>{singleItem.color}</strong></span>}
                </div>
                <div className="text-[11px] text-emerald-700 font-bold">
                  Stok Tersedia di Box #{singleItem.boxNumber}: {maxQty} PCS
                </div>
              </div>
            ) : (
              <div className="max-h-24 overflow-y-auto space-y-1 pr-1">
                {itemsToDispatch.map((it) => (
                  <div key={it.id} className="flex justify-between items-center text-[11px] bg-white p-1.5 rounded border border-slate-200">
                    <span className="font-bold text-slate-800 truncate max-w-[260px]">{it.style || it.kode}</span>
                    <span className="font-mono font-black text-emerald-700">{it.jumlah ?? it.qty ?? 1} PCS</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 1. Tujuan Pengiriman */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-800 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                Tujuan Pengiriman <span className="text-rose-500">*</span>
              </span>
              <span className="text-[10px] text-slate-400 font-normal">Pilih salah satu</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {DISPATCH_DESTINATIONS.map((dest) => {
                const isSelected = destinationId === dest.id;
                return (
                  <button
                    key={dest.id}
                    type="button"
                    onClick={() => setDestinationId(dest.id)}
                    className={`p-2 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? `${dest.color} ring-2 ring-blue-400 font-black shadow-xs`
                        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <span>{dest.label}</span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setDestinationId('LAINNYA')}
                className={`p-2 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  destinationId === 'LAINNYA'
                    ? 'bg-slate-800 text-white border-slate-800 ring-2 ring-slate-400 shadow-xs'
                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <span>Lainnya</span>
              </button>
            </div>

            {destinationId === 'LAINNYA' && (
              <input
                type="text"
                value={customDestination}
                onChange={(e) => setCustomDestination(e.target.value)}
                placeholder="Tuliskan nama tujuan pengiriman..."
                className="w-full mt-2 px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-bold"
              />
            )}
          </div>

          {/* 2. Sifat Pengiriman: Permanen vs Review */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-800 flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
              Sifat Pengiriman <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {DISPATCH_TYPES.map((t) => {
                const isSelected = dispatchType === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => setDispatchType(t.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition flex flex-col justify-between space-y-1.5 ${
                      isSelected
                        ? (t.id === 'PERMANENT'
                            ? 'bg-rose-50/80 border-rose-300 ring-2 ring-rose-200'
                            : 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-200')
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs text-slate-900">{t.label}</span>
                      {isSelected ? (
                        <CheckCircle2 className={`w-4 h-4 ${t.id === 'PERMANENT' ? 'text-rose-600' : 'text-amber-600'}`} />
                      ) : (
                        <span className="w-4 h-4 rounded-full border border-slate-300" />
                      )}
                    </div>
                    <p className="text-[10px] text-slate-600 leading-tight">
                      {t.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. Jumlah Qty & Tanggal */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {isSingle && (
              <div className="space-y-1">
                <label className="font-bold text-slate-800">Jumlah Kirim (PCS) *</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="1"
                    max={maxQty}
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-black text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 tabular-nums"
                  />
                  <button
                    type="button"
                    onClick={() => setQty(maxQty)}
                    className="px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[10px] font-bold text-slate-700 whitespace-nowrap cursor-pointer"
                  >
                    Kirim Semua
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="font-bold text-slate-800 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                Tanggal Kirim *
              </label>
              <input
                type="date"
                value={dispatchDate}
                onChange={(e) => setDispatchDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              />
            </div>
          </div>

          {/* 4. Penerima / No. Surat Jalan / Resi (Opsional) */}
          <div className="space-y-1">
            <label className="font-bold text-slate-800 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-500" />
              Nama Penerima / No. Surat Jalan / Resi (Opsional)
            </label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="Contoh: Pak Budi (RDC) / SJ-2026/11/04"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
            />
          </div>

          {/* 5. Catatan Tambahan (Opsional) */}
          <div className="space-y-1">
            <label className="font-bold text-slate-800 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              Catatan / Keperluan Pengiriman (Opsional)
            </label>
            <textarea
              rows="2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Catatan keperluan kirim sampel..."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs resize-none"
            />
          </div>

          {/* PIC Info */}
          <div className="text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-100 pt-2">
            <span>PIC Pengirim: <strong>{currentUser?.name || singleItem?.picName || 'Royan'}</strong></span>
            <span>Stok Box #{singleItem?.boxNumber || '-'} akan berkurang otomatis</span>
          </div>

          {/* Footer Actions */}
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
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition flex items-center gap-1.5 shadow-md shadow-blue-500/20 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Memproses...' : 'Konfirmasi Kirim Sampel'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default DispatchModal;
