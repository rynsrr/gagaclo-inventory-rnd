import { useState, useMemo, useEffect } from 'react';
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
  Printer,
} from 'lucide-react';
import { DISPATCH_DESTINATIONS, DISPATCH_TYPES } from '../utils/dispatchUtils';
import { DispatchManifestModal } from './DispatchManifestModal';

export function DispatchModal({ isOpen, onClose, item, preselectedItems = [] }) {
  const { dispatchItem, currentUser, suggestions, items, clearDispatchCart } = useInventory();

  // If single item or multiple items
  const itemsToDispatch = item ? [item] : preselectedItems;

  const [destinationId, setDestinationId] = useState('BUYER');
  const [selectedBuyer, setSelectedBuyer] = useState('');
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
  const [manifestPreviewItems, setManifestPreviewItems] = useState(null);
  const [manifestInitialConfig, setManifestInitialConfig] = useState(null);
  const [hasDispatched, setHasDispatched] = useState(false);

  const isSingle = itemsToDispatch.length === 1;
  const singleItem = itemsToDispatch[0];
  const maxQty = Number(singleItem?.jumlah ?? singleItem?.qty ?? 1);

  // Unified list of Buyer No from suggestions store and inventory items
  const buyerList = useMemo(() => {
    const set = new Set();
    (suggestions?.buyerNo || []).forEach(b => {
      const s = String(b || '').trim().toUpperCase();
      if (s && s !== 'NA' && s !== '-') set.add(s);
    });
    (items || []).forEach(it => {
      const b = String(it.buyerNo || it.buyerNumber || '').trim().toUpperCase();
      if (b && b !== 'NA' && b !== '-') set.add(b);
    });
    return Array.from(set).sort();
  }, [suggestions, items]);

  // Set default buyer from singleItem if available
  useEffect(() => {
    if (singleItem?.buyerNo && singleItem.buyerNo !== 'NA' && singleItem.buyerNo !== '-') {
      setSelectedBuyer(String(singleItem.buyerNo).trim().toUpperCase());
    }
  }, [singleItem]);

  if (!isOpen || itemsToDispatch.length === 0) return null;

  const selectedDest = DISPATCH_DESTINATIONS.find(d => d.id === destinationId);
  let destinationLabel = selectedDest?.label || destinationId;
  if (destinationId === 'BUYER') {
    destinationLabel = selectedBuyer.trim() ? `Buyer (${selectedBuyer.trim()})` : 'Buyer';
  } else if (destinationId === 'LAINNYA') {
    destinationLabel = customDestination.trim() || 'Tujuan Khusus';
  }

  const handlePreviewPdf = () => {
    const previewList = itemsToDispatch.map((it) => {
      const itemQty = isSingle ? Number(qty) : Number(it.dispatchQty ?? it.jumlah ?? it.qty ?? 1);
      return {
        ...it,
        jumlah: itemQty,
        qty: itemQty,
        dispatchQty: itemQty,
        sampleNo: it.sampleNo || it.buyerNo || 'NA',
        dispatchData: {
          destinationId,
          destinationLabel,
          buyerName: destinationId === 'BUYER' ? selectedBuyer.trim() : destinationLabel,
          type: dispatchType,
          date: dispatchDate,
          recipient: recipient.trim(),
          notes: notes.trim(),
        },
      };
    });
    setManifestInitialConfig({
      buyerName: destinationId === 'BUYER' ? selectedBuyer.trim() : destinationLabel,
      date: dispatchDate,
    });
    setManifestPreviewItems(previewList);
  };

  const handleSubmit = async (e, shouldPrintAfter = false) => {
    if (e && e.preventDefault) e.preventDefault();
    setError(null);

    if (destinationId === 'BUYER' && !selectedBuyer.trim()) {
      setError('Wajib memilih atau mengisi nama Buyer tujuan pengiriman sesuai list Buyer No.');
      return;
    }

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
      const dispatchedList = [];
      for (const it of itemsToDispatch) {
        const itemQty = isSingle ? Number(qty) : Number(it.dispatchQty ?? it.jumlah ?? it.qty ?? 1);
        await dispatchItem(it, {
          destinationId,
          destinationLabel,
          buyerName: destinationId === 'BUYER' ? selectedBuyer.trim() : '',
          type: dispatchType,
          date: dispatchDate,
          qty: itemQty,
          recipient: recipient.trim(),
          notes: notes.trim(),
        });
        dispatchedList.push({
          ...it,
          jumlah: itemQty,
          qty: itemQty,
          dispatchQty: itemQty,
          sampleNo: it.sampleNo || it.buyerNo || 'NA',
          dispatchData: {
            destinationId,
            destinationLabel,
            buyerName: destinationId === 'BUYER' ? selectedBuyer.trim() : destinationLabel,
            type: dispatchType,
            date: dispatchDate,
            recipient: recipient.trim(),
            notes: notes.trim(),
          },
        });
      }
      clearDispatchCart();

      if (shouldPrintAfter) {
        setHasDispatched(true);
        setManifestInitialConfig({
          buyerName: destinationId === 'BUYER' ? selectedBuyer.trim() : destinationLabel,
          date: dispatchDate,
        });
        setManifestPreviewItems(dispatchedList);
      } else {
        onClose();
      }
    } catch (err) {
      console.error('Dispatch error:', err);
      setError(err?.message || 'Gagal memproses pengiriman sampel.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="font-apple fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md animate-fade-in no-print">
      <div className="relative w-full max-w-lg bg-white rounded-[26px] shadow-[0_30px_70px_rgba(0,0,0,0.2)] border border-black/[0.08] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Apple Dark Header */}
        <div className="px-6 py-4 bg-[#161618] text-white flex items-center justify-between border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold tracking-tight text-white flex items-center gap-2">
                Catat Pengiriman Sampel Keluar
              </h3>
              <p className="text-[11px] text-white/60">
                Kirim sampel ke Buyer, ANZO QC, ANZO TW, QC CHINA, RDTW, atau RDC
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-3.5 h-3.5" />
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
            <div className="flex items-center justify-between text-xs font-bold text-slate-500">
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
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 font-mono">
                  <span>Kode: <strong>{singleItem.kode || singleItem.sku}</strong></span>
                  {singleItem.sampleNo && <span>• No: <strong>{singleItem.sampleNo}</strong></span>}
                  {singleItem.size && <span>• Size: <strong>{singleItem.size}</strong></span>}
                  {singleItem.color && <span>• Color: <strong>{singleItem.color}</strong></span>}
                </div>
                <div className="text-xs text-emerald-700 font-bold">
                  Stok Tersedia di Box #{singleItem.boxNumber}: {maxQty} PCS
                </div>
              </div>
            ) : (
              <div className="max-h-32 overflow-y-auto space-y-1.5 pr-1">
                {itemsToDispatch.map((it) => (
                  <div key={it.id} className="flex justify-between items-center text-xs bg-white p-2 rounded-lg border border-slate-200">
                    <div className="min-w-0 pr-2">
                      <div className="font-bold text-slate-800 truncate">{it.style || it.kode}</div>
                      <div className="text-xs text-slate-500">
                        Box #{it.boxNumber} {it.buyerNo && `• Buyer: ${it.buyerNo}`}
                      </div>
                    </div>
                    <span className="font-mono font-black text-rose-700 shrink-0 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                      {it.dispatchQty ?? it.jumlah ?? it.qty ?? 1} PCS
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 1. Tujuan Pengiriman */}
          <div className="space-y-2">
            <label className="font-bold text-slate-800 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                Tujuan Pengiriman <span className="text-rose-500">*</span>
              </span>
              <span className="text-xs text-slate-400 font-normal">Pilih salah satu</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {DISPATCH_DESTINATIONS.map((dest) => {
                const isSelected = destinationId === dest.id;
                return (
                  <button
                    key={dest.id}
                    type="button"
                    onClick={() => {
                      setDestinationId(dest.id);
                      if (error) setError(null);
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? `${dest.color} ring-2 ring-blue-500 font-black shadow-xs`
                        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <span>{dest.label}</span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => {
                  setDestinationId('LAINNYA');
                  if (error) setError(null);
                }}
                className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  destinationId === 'LAINNYA'
                    ? 'bg-slate-800 text-white border-slate-800 ring-2 ring-slate-400 shadow-xs font-black'
                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <span>Lainnya</span>
              </button>
            </div>

            {/* WAJIB PILIH BUYER JIKA TUJUAN = BUYER */}
            {destinationId === 'BUYER' && (
              <div className="p-3.5 rounded-xl bg-rose-50/80 border border-rose-200 space-y-2 mt-2 animate-fade-in">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-rose-950 flex items-center gap-1.5">
                    <span>Pilih Nama Buyer Tujuan</span>
                    <span className="text-rose-500 font-black text-sm">*</span>
                  </label>
                  <span className="text-xs text-rose-700 font-semibold bg-rose-100/80 px-2 py-0.5 rounded-full border border-rose-200">
                    Wajib Diisi Sesuai List Buyer No
                  </span>
                </div>
                
                <div className="relative">
                  <input
                    type="text"
                    list="dispatch-buyer-options"
                    value={selectedBuyer}
                    onChange={(e) => {
                      setSelectedBuyer(e.target.value.toUpperCase());
                      if (error) setError(null);
                    }}
                    placeholder="Ketik atau pilih nama Buyer (misal: UNIQLO, GAP, H&M, ZARA...)"
                    className="w-full px-3 py-2 rounded-lg border-2 border-rose-300 bg-white text-xs font-black text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 uppercase tracking-wide font-mono"
                    required
                  />
                  <datalist id="dispatch-buyer-options">
                    {buyerList.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </datalist>
                </div>

                {/* Quick Selection Buttons from Buyer List */}
                {buyerList.length > 0 && (
                  <div className="pt-1">
                    <span className="text-xs font-bold text-rose-900 block mb-1">
                      Pilihan Cepat dari List Buyer No:
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5 max-h-24 overflow-y-auto pr-1">
                      {buyerList.slice(0, 15).map((b) => (
                        <button
                          key={b}
                          type="button"
                          onClick={() => {
                            setSelectedBuyer(b);
                            if (error) setError(null);
                          }}
                          className={`px-2 py-0.5 rounded text-xs font-black transition cursor-pointer border ${
                            selectedBuyer === b
                              ? 'bg-rose-600 text-white border-rose-700 shadow-2xs'
                              : 'bg-white hover:bg-rose-100 text-rose-900 border-rose-200'
                          }`}
                        >
                          {b}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

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
                    <p className="text-xs text-slate-600 leading-tight">
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
                    className="px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 whitespace-nowrap cursor-pointer"
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
          <div className="text-xs text-slate-500 flex items-center justify-between border-t border-slate-100 pt-2">
            <span>PIC Pengirim: <strong>{currentUser?.name || singleItem?.picName || 'Royan'}</strong></span>
            <span>Stok Box #{singleItem?.boxNumber || '-'} akan berkurang otomatis</span>
          </div>

          {/* Apple Style Footer Actions */}
          <div className="pt-3 flex flex-wrap items-center justify-between gap-2 border-t border-black/[0.06]">
            <button
              type="button"
              onClick={handlePreviewPdf}
              className="px-3.5 py-2 rounded-xl border border-black/[0.08] bg-white hover:bg-[#f5f5f7] text-[#1d1d1f] font-medium text-xs transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Lihat format dokumen Invoice & Packing List (PDF) sebelum dikirim"
            >
              <FileText className="w-3.5 h-3.5 text-[#0071e3]" />
              <span>Pratinjau PDF</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl border border-black/[0.06] bg-[#f5f5f7] hover:bg-[#ebebee] text-[#1d1d1f] font-medium text-xs transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={(e) => handleSubmit(e, true)}
                className="px-4 py-2 rounded-xl bg-[#5856d6] hover:bg-[#4b49b8] text-white font-medium text-xs transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                title="Catat pengiriman dan langsung buka Invoice & Packing List siap cetak PDF"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Kirim &amp; Cetak PDF</span>
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] text-white font-medium text-xs transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Memproses...' : 'Konfirmasi Kirim'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Manifest & Invoice PDF Modal */}
      {manifestPreviewItems && (
        <DispatchManifestModal
          isOpen={Boolean(manifestPreviewItems)}
          onClose={() => {
            setManifestPreviewItems(null);
            if (hasDispatched) {
              onClose();
            }
          }}
          items={manifestPreviewItems}
          initialConfig={manifestInitialConfig}
        />
      )}
    </div>
  );
}

export default DispatchModal;
