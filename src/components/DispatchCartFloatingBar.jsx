import { useInventory } from '../context/InventoryContext';
import { ShoppingCart, ArrowRight } from 'lucide-react';

export function DispatchCartFloatingBar({ onOpenCart }) {
  const { dispatchCart } = useInventory();

  if (!dispatchCart || dispatchCart.length === 0) return null;

  const totalItems = dispatchCart.length;
  const totalPcs = dispatchCart.reduce((sum, item) => sum + (Number(item.dispatchQty) || 1), 0);

  return (
    <div className="fixed bottom-5 right-5 z-40 animate-fade-in no-print">
      <button
        type="button"
        onClick={onOpenCart}
        className="group flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-rose-600 via-rose-700 to-pink-700 text-white rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 border border-white/20 cursor-pointer"
        aria-label="Keranjang Pengiriman"
      >
        <div className="relative flex items-center justify-center p-2 bg-white/20 rounded-xl">
          <ShoppingCart className="w-5 h-5 text-white" />
          <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-slate-950 font-black text-[11px] shadow">
            {totalItems}
          </span>
        </div>
        <div className="text-left">
          <div className="text-[10px] uppercase font-black tracking-wider text-rose-100">
            Keranjang Pengiriman
          </div>
          <div className="text-xs font-black text-white">
            {totalItems} Item <span className="font-mono text-amber-300">({totalPcs} PCS)</span>
          </div>
        </div>
        <div className="pl-2 border-l border-white/20 text-xs font-black flex items-center gap-1 text-white group-hover:translate-x-0.5 transition">
          <span>Lihat Keranjang</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </div>
      </button>
    </div>
  );
}
