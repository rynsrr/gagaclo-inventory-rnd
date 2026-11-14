import { useState, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import {
  Send,
  Building2,
  Calendar,
  User,
  Search,
  RotateCcw,
  Printer,
  Undo2,
  ArrowRight,
  Plus,
  Truck,
  ShoppingCart,
} from 'lucide-react';
import {
  DISPATCH_DESTINATIONS,
  isItemDispatched,
  decodeDispatchData,
  getDestinationColor,
} from '../utils/dispatchUtils';
import { DispatchModal } from './DispatchModal';
import { DispatchReturnModal } from './DispatchReturnModal';
import { DispatchManifestModal } from './DispatchManifestModal';
import { DispatchCartModal } from './DispatchCartModal';

export function DispatchOutgoingView() {
  const { items, cancelDispatch, dispatchCart } = useInventory();

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDestination, setSelectedDestination] = useState('ALL'); // 'ALL' | 'BUYER' | 'ANZO' | 'RDTW' | 'RDC' | 'ANZOTW' | 'LAINNYA'
  const [selectedType, setSelectedType] = useState('ALL'); // 'ALL' | 'PERMANENT' | 'REVIEW'

  // Modals state
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [cartModalOpen, setCartModalOpen] = useState(false);
  const [cartCheckoutItems, setCartCheckoutItems] = useState(null);
  const [returnItem, setReturnItem] = useState(null);
  const [manifestItems, setManifestItems] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);

  // Multi-selection for bulk manifest printing
  const [selectedItemIds, setSelectedItemIds] = useState(new Set());

  // All dispatched items
  const dispatchedItems = useMemo(() => {
    return items
      .filter(isItemDispatched)
      .map(item => {
        const dispatchInfo = decodeDispatchData(item);
        return {
          ...item,
          dispatchInfo,
        };
      })
      .sort((a, b) => {
        const dateA = a.dispatchInfo?.date || '';
        const dateB = b.dispatchInfo?.date || '';
        return dateB.localeCompare(dateA);
      });
  }, [items]);

  // Summary Metrics
  const stats = useMemo(() => {
    let totalPcs = 0;
    let permanentPcs = 0;
    let reviewPcs = 0;
    const destCounts = {
      BUYER: 0,
      ANZO_QC: 0,
      ANZO_TW: 0,
      ANZO_QC_CHINA: 0,
      RDTW: 0,
      RDC: 0,
      LAINNYA: 0,
    };

    dispatchedItems.forEach(it => {
      const q = Number(it.jumlah ?? it.qty ?? 1);
      totalPcs += q;
      if (it.dispatchInfo?.type === 'PERMANENT') {
        permanentPcs += q;
      } else {
        reviewPcs += q;
      }

      let dest = it.dispatchInfo?.destinationId || 'LAINNYA';
      if (dest === 'ANZO') dest = 'ANZO_QC';
      if (dest === 'ANZOTW') dest = 'ANZO_TW';

      if (destCounts[dest] !== undefined) {
        destCounts[dest] += q;
      } else {
        destCounts.LAINNYA += q;
      }
    });

    return {
      totalItems: dispatchedItems.length,
      totalPcs,
      permanentPcs,
      reviewPcs,
      destCounts,
    };
  }, [dispatchedItems]);

  // Filtered Items
  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return dispatchedItems.filter(it => {
      // 1. Destination Filter
      if (selectedDestination !== 'ALL') {
        let dest = it.dispatchInfo?.destinationId;
        if (dest === 'ANZO') dest = 'ANZO_QC';
        if (dest === 'ANZOTW') dest = 'ANZO_TW';
        if (dest !== selectedDestination) return false;
      }

      // 2. Type Filter
      if (selectedType !== 'ALL') {
        if (it.dispatchInfo?.type !== selectedType) return false;
      }

      // 3. Search query
      if (q) {
        const matchKode = String(it.kode || it.sku || '').toLowerCase().includes(q);
        const matchStyle = String(it.style || it.name || it.deskripsi || '').toLowerCase().includes(q);
        const matchSampleNo = String(it.sampleNo || '').toLowerCase().includes(q);
        const matchRecipient = String(it.dispatchInfo?.recipient || '').toLowerCase().includes(q);
        const matchNotes = String(it.dispatchInfo?.notes || '').toLowerCase().includes(q);
        const matchDest = String(it.dispatchInfo?.destinationLabel || '').toLowerCase().includes(q);
        const matchBuyer = String(it.buyerNo || it.buyerNumber || it.dispatchInfo?.buyerName || '').toLowerCase().includes(q);
        return matchKode || matchStyle || matchSampleNo || matchRecipient || matchNotes || matchDest || matchBuyer;
      }

      return true;
    });
  }, [dispatchedItems, selectedDestination, selectedType, searchQuery]);

  // Multi-select toggle
  const toggleSelectAll = () => {
    if (selectedItemIds.size === filteredItems.length && filteredItems.length > 0) {
      setSelectedItemIds(new Set());
    } else {
      setSelectedItemIds(new Set(filteredItems.map(i => i.id)));
    }
  };

  const toggleSelectItem = (id) => {
    const next = new Set(selectedItemIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedItemIds(next);
  };

  const handleCancel = async (item) => {
    const confirmed = window.confirm(
      `Batalkan pengiriman sampel "${item.style || item.kode}"?\n\nSampel akan dikembalikan ke status penyimpanan di Box #${item.dispatchInfo?.originBox || item.boxNumber}.`
    );
    if (!confirmed) return;

    setCancellingId(item.id);
    try {
      await cancelDispatch(item);
    } catch (err) {
      console.error('Cancel dispatch failed', err);
      alert('Gagal membatalkan pengiriman: ' + (err?.message || err));
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white rounded-2xl p-5 sm:p-6 shadow-xl border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold">
              <Truck className="w-3.5 h-3.5" />
              <span>Monitoring Pengiriman Sampel Keluar R&amp;D</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              Daftar Sampel Terkirim Keluar
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 font-medium max-w-2xl">
              Memantau sampel yang dikirim ke <strong>Buyer</strong>, <strong>ANZO QC</strong>, <strong>ANZO TW</strong>, <strong>ANZO QC CHINA</strong>, <strong>RDTW</strong>, dan <strong>RDC</strong>. Sampel keluar permanen mengurangi stok box, sedangkan sampel review dapat diterima kembali.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {selectedItemIds.size > 0 && (
              <button
                type="button"
                onClick={() => setManifestItems(dispatchedItems.filter(i => selectedItemIds.has(i.id)))}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black transition flex items-center gap-2 shadow-lg shadow-indigo-600/30 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Surat Jalan ({selectedItemIds.size})</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setCartModalOpen(true)}
              className={`px-4 py-2.5 rounded-xl text-xs font-black transition flex items-center gap-2 shadow-lg cursor-pointer ${
                dispatchCart?.length > 0
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30 animate-pulse-subtle'
                  : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
              }`}
              title="Buka Keranjang Pengiriman (Model Marketplace)"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Keranjang ({dispatchCart?.length || 0})</span>
            </button>
            <button
              type="button"
              onClick={() => setDispatchModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black transition flex items-center gap-2 shadow-lg shadow-blue-600/30 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>+ Catat Pengiriman Baru</span>
            </button>
          </div>
        </div>

        {/* 4 Quick Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-slate-800">
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Sampel Keluar</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-white">{stats.totalPcs}</span>
              <span className="text-xs font-bold text-slate-400">PCS ({stats.totalItems} item)</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 backdrop-blur-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-300 block">Keluar Permanen</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-rose-300">{stats.permanentPcs}</span>
              <span className="text-xs font-bold text-rose-400">PCS (Stok R&amp;D Berkurang)</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 backdrop-blur-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 block">Review Sementara</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-amber-300">{stats.reviewPcs}</span>
              <span className="text-xs font-bold text-amber-400">PCS (Pending Kembali)</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 block">Tujuan Teraktif</span>
            <div className="text-sm font-black text-emerald-300 mt-1 truncate">
              Buyer: {stats.destCounts.BUYER || 0} • ANZO QC: {stats.destCounts.ANZO_QC || 0}
            </div>
            <span className="text-[10px] text-emerald-400/80">ANZO TW: {stats.destCounts.ANZO_TW || 0} • ANZO QC CHINA: {stats.destCounts.ANZO_QC_CHINA || 0} • RDTW: {stats.destCounts.RDTW || 0} • RDC: {stats.destCounts.RDC || 0}</span>
          </div>
        </div>
      </div>

      {/* Destination Pills Filter */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs">
        <span className="text-xs font-black text-slate-700 flex items-center gap-1.5 px-2">
          <Building2 className="w-3.5 h-3.5 text-blue-600" />
          Filter Tujuan:
        </span>
        <button
          type="button"
          onClick={() => setSelectedDestination('ALL')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            selectedDestination === 'ALL'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
        >
          Semua Tujuan ({stats.totalPcs} PCS)
        </button>

        {DISPATCH_DESTINATIONS.map(dest => {
          const isSelected = selectedDestination === dest.id;
          const count = stats.destCounts[dest.id] || 0;
          return (
            <button
              key={dest.id}
              type="button"
              onClick={() => setSelectedDestination(dest.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                isSelected
                  ? `${dest.color} ring-2 ring-blue-500 font-black shadow-xs`
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <span>{dest.label}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/70 font-mono">
                {count} PCS
              </span>
            </button>
          );
        })}
      </div>

      {/* Controls Bar: Search & Nature Filter */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari kode, style, nomor sample, nama penerima, atau catatan..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Nature Filter Pills */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-xs font-bold text-slate-600 hidden md:inline">Sifat:</span>
          <button
            type="button"
            onClick={() => setSelectedType('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              selectedType === 'ALL'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            Semua Sifat
          </button>
          <button
            type="button"
            onClick={() => setSelectedType('PERMANENT')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              selectedType === 'PERMANENT'
                ? 'bg-rose-700 text-white'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            Keluar Permanen
          </button>
          <button
            type="button"
            onClick={() => setSelectedType('REVIEW')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              selectedType === 'REVIEW'
                ? 'bg-amber-600 text-white'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            Review Sementara
          </button>
        </div>
      </div>

      {/* Dispatched Items Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {filteredItems.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center">
              <Truck className="w-7 h-7" />
            </div>
            <h3 className="text-base font-black text-slate-900">
              {dispatchedItems.length === 0
                ? 'Belum Ada Sampel yang Dikirim Keluar'
                : 'Tidak Ditemukan Sampel dengan Filter Ini'}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {dispatchedItems.length === 0
                ? 'Sampel yang dikirim ke Buyer, ANZO QC, ANZO TW, ANZO QC CHINA, RDTW, atau RDC dapat dicatat langsung lewat tombol di bawah atau dari menu detail Box.'
                : 'Coba ubah kata kunci pencarian atau sesuaikan filter tujuan/sifat pengiriman.'}
            </p>
            {dispatchedItems.length === 0 && (
              <button
                type="button"
                onClick={() => setDispatchModalOpen(true)}
                className="mt-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs inline-flex items-center gap-2 shadow-md shadow-blue-600/20 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Catat Pengiriman Pertama</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-3 text-center w-8">
                    <input
                      type="checkbox"
                      checked={selectedItemIds.size === filteredItems.length && filteredItems.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded text-blue-600 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-3">Tujuan &amp; Sifat</th>
                  <th className="py-3 px-3">Sampel (Style / Kode)</th>
                  <th className="py-3 px-2 text-center">Size / Color</th>
                  <th className="py-3 px-2 text-right">Qty</th>
                  <th className="py-3 px-3">Asal Box &amp; PIC</th>
                  <th className="py-3 px-3">Tanggal &amp; Penerima</th>
                  <th className="py-3 px-3">Catatan</th>
                  <th className="py-3 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item) => {
                  const dInfo = item.dispatchInfo;
                  const isPermanent = dInfo?.type === 'PERMANENT';
                  const isSelected = selectedItemIds.has(item.id);

                  return (
                    <tr
                      key={item.id}
                      className={`transition ${isSelected ? 'bg-blue-50/60' : 'hover:bg-slate-50/70'}`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectItem(item.id)}
                          className="rounded text-blue-600 cursor-pointer"
                        />
                      </td>

                      {/* Tujuan & Sifat */}
                      <td className="py-3 px-3 space-y-1">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black border ${getDestinationColor(dInfo?.destinationId)}`}>
                          <Building2 className="w-3 h-3" />
                          <span>{dInfo?.destinationLabel || 'Luar'}</span>
                        </span>
                        <div>
                          <span className={`inline-block px-2 py-0.2 rounded text-[10px] font-black ${
                            isPermanent
                              ? 'bg-slate-900 text-white'
                              : 'bg-amber-100 text-amber-900 border border-amber-300'
                          }`}>
                            {isPermanent ? 'Permanen' : 'Review Sementara'}
                          </span>
                        </div>
                      </td>

                      {/* Sampel (Style / Kode) */}
                      <td className="py-3 px-3">
                        <div className="font-black text-slate-900 text-xs">
                          {item.style || item.name || 'Sample'}
                        </div>
                        <div className="flex items-center gap-2 font-mono text-[11px] text-slate-600 pt-0.5">
                          <span className="font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                            {item.kode || item.sku || '-'}
                          </span>
                          {item.sampleNo && (
                            <span className="text-slate-500">No: {item.sampleNo}</span>
                          )}
                        </div>
                      </td>

                      {/* Size / Color */}
                      <td className="py-3 px-2 text-center text-[11px]">
                        <span className="font-bold text-slate-800">{item.size || '-'}</span>
                        {item.color && item.color !== '-' && (
                          <span className="block text-[10px] text-slate-500">{item.color}</span>
                        )}
                      </td>

                      {/* Qty */}
                      <td className="py-3 px-2 text-right">
                        <span className="font-mono font-black text-sm text-slate-900">
                          {item.jumlah ?? item.qty ?? 1}
                        </span>
                        <span className="text-[10px] text-slate-500 block font-bold">
                          {item.satuan || 'PCS'}
                        </span>
                      </td>

                      {/* Asal Box & PIC */}
                      <td className="py-3 px-3 text-[11px]">
                        <div className="font-black text-slate-800">
                          BOX #{dInfo?.originBox || item.boxNumber}
                        </div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1 pt-0.5">
                          <User className="w-3 h-3 text-slate-400" />
                          <span>{dInfo?.pic || item.picName || 'Royan'}</span>
                        </div>
                      </td>

                      {/* Tanggal & Penerima */}
                      <td className="py-3 px-3 text-[11px]">
                        <div className="font-bold text-slate-800 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{dInfo?.date || '-'}</span>
                        </div>
                        {dInfo?.recipient && (
                          <div className="text-[10px] text-slate-600 pt-0.5">
                            Penerima: <strong>{dInfo.recipient}</strong>
                          </div>
                        )}
                      </td>

                      {/* Catatan */}
                      <td className="py-3 px-3 text-[11px] text-slate-600 max-w-[200px] truncate" title={dInfo?.notes || item.description || ''}>
                        {dInfo?.notes || item.description || item.deskripsi || '-'}
                      </td>

                      {/* Aksi */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* If Review: Terima Kembali ke Box */}
                          {!isPermanent && (
                            <button
                              type="button"
                              onClick={() => setReturnItem(item)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] transition flex items-center gap-1 shadow-xs cursor-pointer"
                              title="Terima kembali sampel ini dari review ke dalam box R&D"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Terima Kembali</span>
                            </button>
                          )}

                          {/* Print Manifest */}
                          <button
                            type="button"
                            onClick={() => setManifestItems([item])}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                            title="Cetak Surat Jalan / Tanda Terima"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {/* Cancel Dispatch */}
                          <button
                            type="button"
                            disabled={cancellingId === item.id}
                            onClick={() => handleCancel(item)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer disabled:opacity-40"
                            title="Batal Kirim (Kembalikan ke box asal)"
                          >
                            <Undo2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Standalone Dispatch Modal (Triggered by + Catat Pengiriman Baru) */}
      {dispatchModalOpen && (
        <StandaloneDispatchSelector
          isOpen={dispatchModalOpen}
          onClose={() => setDispatchModalOpen(false)}
        />
      )}

      {/* Dispatch Cart Modal (Model Marketplace) */}
      <DispatchCartModal
        isOpen={cartModalOpen}
        onClose={() => setCartModalOpen(false)}
        onProceedToDispatch={(cartItems) => {
          setCartModalOpen(false);
          setCartCheckoutItems(cartItems);
        }}
      />

      {/* Checkout Dispatch Modal (Triggered from Cart) */}
      {cartCheckoutItems && (
        <DispatchModal
          isOpen={true}
          onClose={() => setCartCheckoutItems(null)}
          preselectedItems={cartCheckoutItems}
        />
      )}

      {/* Return Modal */}
      {returnItem && (
        <DispatchReturnModal
          isOpen={Boolean(returnItem)}
          onClose={() => setReturnItem(null)}
          item={returnItem}
        />
      )}

      {/* Manifest Modal */}
      {manifestItems && (
        <DispatchManifestModal
          isOpen={Boolean(manifestItems)}
          onClose={() => setManifestItems(null)}
          items={manifestItems}
        />
      )}
    </div>
  );
}

/**
 * Helper selector to pick a box and item when user clicks "+ Catat Pengiriman Baru" directly from the outgoing view
 */
function StandaloneDispatchSelector({ isOpen, onClose }) {
  const { items, boxes, getItemsInBox } = useInventory();
  const [selectedBox, setSelectedBox] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [activeDispatchItem, setActiveDispatchItem] = useState(null);

  if (!isOpen) return null;

  const boxItems = selectedBox ? getItemsInBox(Number(selectedBox)) : [];

  const handleProceed = () => {
    const item = items.find(i => String(i.id) === String(selectedItemId));
    if (!item) return;
    setActiveDispatchItem(item);
  };

  if (activeDispatchItem) {
    return (
      <DispatchModal
        isOpen={Boolean(activeDispatchItem)}
        onClose={() => {
          setActiveDispatchItem(null);
          onClose();
        }}
        item={activeDispatchItem}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in no-print">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Send className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-black">Pilih Sampel yang Akan Dikirim</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white transition cursor-pointer"
          >
            ×
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          {/* Pick Box */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-800">1. Pilih Box Asal Sampel *</label>
            <select
              value={selectedBox}
              onChange={(e) => {
                setSelectedBox(e.target.value);
                setSelectedItemId('');
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold bg-white"
            >
              <option value="">-- Pilih Box (1 - 72) --</option>
              {boxes.map((b) => {
                const count = getItemsInBox(b.boxNumber).length;
                return (
                  <option key={b.boxNumber} value={b.boxNumber}>
                    BOX #{b.boxNumber} ({b.rackName || 'RACK'} - {b.picName || 'Royan'}) • {count} item
                  </option>
                );
              })}
            </select>
          </div>

          {/* Pick Item in Box */}
          {selectedBox && (
            <div className="space-y-1.5">
              <label className="font-bold text-slate-800">2. Pilih Sampel di Dalam Box #{selectedBox} *</label>
              {boxItems.length === 0 ? (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800">
                  Box #{selectedBox} kosong (tidak ada sampel fisik di dalam box ini).
                </div>
              ) : (
                <select
                  value={selectedItemId}
                  onChange={(e) => setSelectedItemId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold bg-white"
                >
                  <option value="">-- Pilih Sampel --</option>
                  {boxItems.map((it) => (
                    <option key={it.id} value={it.id}>
                      [{it.kode || it.sku}] {it.style || it.name} • {it.jumlah ?? it.qty ?? 1} {it.satuan || 'PCS'} (Size: {it.size || '-'})
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={!selectedItemId}
              onClick={handleProceed}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition flex items-center gap-1.5 shadow-md shadow-blue-600/20 cursor-pointer disabled:opacity-40"
            >
              <span>Lanjut ke Formulir Kirim</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DispatchOutgoingView;
