import { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import {
  X,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  Send,
  Building2,
  ArrowRight,
  Package,
  Layers,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export function DispatchCartModal({ isOpen, onClose, onProceedToDispatch }) {
  const {
    dispatchCart,
    removeFromDispatchCart,
    updateDispatchCartQty,
    clearDispatchCart,
  } = useInventory();

  const [confirmClear, setConfirmClear] = useState(false);

  if (!isOpen) return null;

  const totalItems = dispatchCart.length;
  const totalPcs = dispatchCart.reduce((sum, item) => sum + (Number(item.dispatchQty) || 1), 0);

  // Group items by origin Box
  const originBoxes = Array.from(new Set(dispatchCart.map(i => Number(i.boxNumber) || 1))).sort((a, b) => a - b);

  const handleCheckout = () => {
    if (dispatchCart.length === 0) return;
    onProceedToDispatch(dispatchCart);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-fade-in no-print">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header (E-Commerce Cart Style) */}
        <div className="px-5 py-4 bg-gradient-to-r from-rose-900 via-rose-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-500/20 rounded-xl border border-rose-400/30 text-rose-300">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black tracking-tight text-white">
                  Keranjang Pengiriman Sampel
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white shadow-2xs">
                  {totalItems} Item
                </span>
              </div>
              <p className="text-[11px] text-rose-200 font-medium">
                Model Marketplace: Masukkan sampel dari berbagai box ke keranjang sebelum dikirim
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            aria-label="Tutup Keranjang"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {dispatchCart.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-400 mx-auto flex items-center justify-center">
                <ShoppingCart className="w-8 h-8" />
              </div>
              <h4 className="text-sm font-black text-slate-800">
                Keranjang Pengiriman Anda Masih Kosong
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Buka menu <strong>Detail Box</strong> atau <strong>Tabel Semua Data</strong>, lalu klik ikon <strong>🛒 (+ Keranjang)</strong> pada sampel yang ingin Anda kirim.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-3 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition cursor-pointer inline-flex items-center gap-2"
              >
                <span>Pilih Sampel Sekarang</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Origin Boxes Overview Bar */}
              <div className="flex items-center justify-between text-xs px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200/90 text-slate-600">
                <div className="flex items-center gap-1.5 font-bold">
                  <Package className="w-3.5 h-3.5 text-blue-600" />
                  <span>Asal Pengambilan:</span>
                  <span className="text-slate-800 font-black">
                    {originBoxes.map(b => `Box #${b}`).join(', ')}
                  </span>
                </div>
                <div className="text-[11px] font-semibold text-slate-500">
                  Total: <strong className="text-rose-700 font-black">{totalPcs} PCS</strong>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2.5">
                {dispatchCart.map((item, index) => {
                  const available = Number(item.availableQty ?? item.jumlah ?? item.qty ?? 1);
                  const currentQty = Number(item.dispatchQty) || 1;

                  return (
                    <div
                      key={item.id || index}
                      className="p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white shadow-2xs hover:shadow-xs transition space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="px-2 py-0.5 rounded text-[10px] font-black font-mono bg-blue-100 text-blue-800 border border-blue-200">
                              BOX #{item.boxNumber}
                            </span>
                            {item.buyerNo && item.buyerNo !== '-' && item.buyerNo !== 'NA' && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200">
                                {item.buyerNo}
                              </span>
                            )}
                            <span className="text-[10px] font-mono font-bold text-slate-500">
                              Kode: {item.kode || item.sku || '-'}
                            </span>
                          </div>

                          <h4 className="text-sm font-black text-slate-900 truncate">
                            {item.style || item.name || 'Sample R&D'}
                          </h4>

                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 font-medium mt-0.5">
                            {item.sampleNo && <span>No: <strong>{item.sampleNo}</strong></span>}
                            {item.size && <span>• Size: <strong>{item.size}</strong></span>}
                            {item.color && <span>• Warna: <strong>{item.color}</strong></span>}
                            {item.picName && <span>• PIC: <strong>{item.picName}</strong></span>}
                          </div>
                        </div>

                        {/* Remove item button */}
                        <button
                          type="button"
                          onClick={() => removeFromDispatchCart(item.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          title="Hapus dari keranjang"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Quantity Selector Bar (Marketplace Stepper) */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <span className="text-[11px] font-semibold text-slate-500">
                          Stok Tersedia di Box: <strong className="text-slate-800">{available} PCS</strong>
                        </span>

                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-slate-600">Kirim:</span>
                          <div className="flex items-center rounded-lg border border-slate-300 bg-slate-50 overflow-hidden shadow-2xs">
                            <button
                              type="button"
                              onClick={() => updateDispatchCartQty(item.id, currentQty - 1)}
                              disabled={currentQty <= 1}
                              className="px-2.5 py-1 text-slate-600 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition"
                              title="Kurangi Qty"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <input
                              type="number"
                              min={1}
                              max={available}
                              value={currentQty}
                              onChange={(e) => updateDispatchCartQty(item.id, e.target.value)}
                              className="w-12 text-center py-1 text-xs font-black text-slate-900 bg-white border-x border-slate-300 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => updateDispatchCartQty(item.id, currentQty + 1)}
                              disabled={currentQty >= available}
                              className="px-2.5 py-1 text-slate-600 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition"
                              title="Tambah Qty"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          <span className="text-xs font-black text-rose-700 font-mono">
                            PCS
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer / Checkout Actions */}
        {dispatchCart.length > 0 && (
          <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
              {confirmClear ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-rose-700">Kosongkan semua?</span>
                  <button
                    type="button"
                    onClick={() => {
                      clearDispatchCart();
                      setConfirmClear(false);
                    }}
                    className="px-2.5 py-1 rounded bg-rose-600 text-white text-xs font-black hover:bg-rose-700 transition cursor-pointer"
                  >
                    Ya, Bersihkan
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClear(false)}
                    className="px-2 py-1 rounded text-slate-600 text-xs font-semibold hover:bg-slate-200 transition cursor-pointer"
                  >
                    Batal
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmClear(true)}
                  className="text-xs font-semibold text-slate-500 hover:text-rose-600 flex items-center gap-1 transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Kosongkan Keranjang</span>
                </button>
              )}

              <div className="text-right sm:text-left sm:pl-4 sm:border-l sm:border-slate-300">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Pengiriman</span>
                <span className="text-base font-black text-slate-900">
                  {totalItems} Item <span className="text-rose-600 font-mono">({totalPcs} PCS)</span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition cursor-pointer"
              >
                + Pilih Barang Lain
              </button>
              <button
                type="button"
                onClick={handleCheckout}
                className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 via-rose-700 to-pink-700 hover:from-rose-500 hover:to-pink-600 text-white text-xs font-black transition flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30 hover:shadow-xl hover:scale-102 active:scale-98 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Lanjut ke Pengiriman (Checkout)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
