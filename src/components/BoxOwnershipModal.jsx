import React, { useState, useMemo } from 'react';
import {
  X,
  Users,
  UserCheck,
  Check,
  Search,
  Info,
  Package,
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';

export function BoxOwnershipModal({ isOpen, onClose }) {
  const {
    boxes,
    racks,
    items,
    ppicMembers,
    reassignBoxOwnership,
    reassignMultipleBoxesOwnership,
  } = useInventory();

  const [search, setSearch] = useState('');
  const [selectedRackFilter, setSelectedRackFilter] = useState('ALL');
  const [selectedPicFilter, setSelectedPicFilter] = useState('ALL');
  const [selectedBoxes, setSelectedBoxes] = useState(new Set());
  const [targetBatchPic, setTargetBatchPic] = useState('');
  const [confirmDialog, setConfirmDialog] = useState(null); // { mode: 'single'|'batch', boxNum?, boxNums?, oldPic?, newPic?, itemCount? }
  const [isProcessing, setIsProcessing] = useState(false);

  // Compute item counts per box
  const itemCountByBox = useMemo(() => {
    const map = new Map();
    items.forEach((it) => {
      const bNum = Number(it.boxNumber);
      if (bNum > 0) {
        map.set(bNum, (map.get(bNum) || 0) + 1);
      }
    });
    return map;
  }, [items]);

  // Compute total units per box
  const unitCountByBox = useMemo(() => {
    const map = new Map();
    items.forEach((it) => {
      const bNum = Number(it.boxNumber);
      if (bNum > 0) {
        map.set(bNum, (map.get(bNum) || 0) + (Number(it.qty) || Number(it.jumlah) || 1));
      }
    });
    return map;
  }, [items]);

  // PPIC box distribution summary
  const picDistribution = useMemo(() => {
    return ppicMembers.map((pic) => {
      const assigned = boxes.filter(
        (b) => String(b.picName || '').trim().toLowerCase() === String(pic.name).trim().toLowerCase()
      );
      const occupied = assigned.filter((b) => (itemCountByBox.get(b.boxNumber) || 0) > 0);
      return {
        ...pic,
        boxCount: assigned.length,
        occupiedCount: occupied.length,
      };
    });
  }, [ppicMembers, boxes, itemCountByBox]);

  // Filter semua box aktif (termasuk Rak 1-5 & Lemari 1)
  const filteredBoxes = useMemo(() => {
    const userBoxes = boxes.filter((b) => Number(b.boxNumber) > 0 && Number(b.boxNumber) < 900000);
    return userBoxes.filter((b) => {
      if (selectedRackFilter !== 'ALL' && String(b.rackId) !== String(selectedRackFilter)) {
        return false;
      }
      if (
        selectedPicFilter !== 'ALL' &&
        String(b.picName || '').toLowerCase() !== String(selectedPicFilter).toLowerCase()
      ) {
        return false;
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const numMatch = String(b.boxNumber).includes(q);
        const nameMatch = String(b.picName || '').toLowerCase().includes(q);
        const rackMatch = String(b.rackName || '').toLowerCase().includes(q);
        if (!numMatch && !nameMatch && !rackMatch) return false;
      }
      return true;
    }).sort((a, b) => Number(a.boxNumber) - Number(b.boxNumber));
  }, [boxes, selectedRackFilter, selectedPicFilter, search]);

  if (!isOpen) return null;

  const handleToggleSelectBox = (boxNum) => {
    setSelectedBoxes((prev) => {
      const next = new Set(prev);
      if (next.has(boxNum)) {
        next.delete(boxNum);
      } else {
        next.add(boxNum);
      }
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    if (selectedBoxes.size === filteredBoxes.length && filteredBoxes.length > 0) {
      setSelectedBoxes(new Set());
    } else {
      setSelectedBoxes(new Set(filteredBoxes.map((b) => b.boxNumber)));
    }
  };

  const initiateSingleReassign = (box, newPicName) => {
    if (!newPicName || newPicName === box.picName) return;
    const count = itemCountByBox.get(box.boxNumber) || 0;
    setConfirmDialog({
      mode: 'single',
      boxNum: box.boxNumber,
      rackName: box.rackName,
      oldPic: box.picName || 'Tidak Diketahui',
      newPic: newPicName,
      itemCount: count,
    });
  };

  const initiateBatchReassign = () => {
    if (selectedBoxes.size === 0 || !targetBatchPic) return;
    const nums = Array.from(selectedBoxes);
    const totalItems = nums.reduce((sum, n) => sum + (itemCountByBox.get(n) || 0), 0);
    setConfirmDialog({
      mode: 'batch',
      boxNums: nums,
      newPic: targetBatchPic,
      itemCount: totalItems,
    });
  };

  const executeReassignment = async () => {
    if (!confirmDialog || isProcessing) return;
    setIsProcessing(true);
    try {
      if (confirmDialog.mode === 'single') {
        await reassignBoxOwnership(confirmDialog.boxNum, confirmDialog.newPic, { syncItems: true });
      } else if (confirmDialog.mode === 'batch') {
        await reassignMultipleBoxesOwnership(confirmDialog.boxNums, confirmDialog.newPic, { syncItems: true });
        setSelectedBoxes(new Set());
        setTargetBatchPic('');
      }
      setConfirmDialog(null);
    } catch (err) {
      console.error('Reassignment failed:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200 font-apple">
      <div className="bg-white w-full max-w-4xl max-h-[92vh] rounded-[24px] shadow-2xl border border-black/[0.08] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-black/[0.06] flex items-start justify-between bg-white shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#0071e3]/10 text-[#0071e3] flex items-center justify-center shrink-0 shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-[#1d1d1f] tracking-tight">
                  Edit Kepemilikan Box
                </h2>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#0071e3]/10 text-[#0071e3]">
                  Alokasi PIC 72 Box
                </span>
              </div>
              <p className="text-xs text-[#86868b] mt-0.5">
                Alihkan kepemilikan box antar anggota tim PPIC. Seluruh item fisik di dalam box otomatis mengikuti PIC baru.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/[0.04] hover:bg-black/[0.08] active:bg-black/[0.12] text-[#86868b] hover:text-[#1d1d1f] flex items-center justify-center transition-all cursor-pointer shrink-0"
            title="Tutup Modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Member Distribution Chips */}
        <div className="px-6 py-3 bg-[#f5f5f7] border-b border-black/[0.06] flex items-center gap-2.5 overflow-x-auto scrollbar-none shrink-0">
          <span className="text-[11px] font-semibold text-[#86868b] uppercase tracking-wider shrink-0 mr-1">
            Alokasi PIC:
          </span>
          {picDistribution.map((pic) => (
            <button
              key={pic.id}
              type="button"
              onClick={() => setSelectedPicFilter(selectedPicFilter === pic.name ? 'ALL' : pic.name)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer border ${
                selectedPicFilter === pic.name
                  ? 'bg-[#0071e3] text-white border-[#0071e3] shadow-xs'
                  : 'bg-white text-[#1d1d1f] border-black/[0.06] hover:border-black/[0.15]'
              }`}
              title={`Klik untuk filter box milik ${pic.name}`}
            >
              <span className={`w-2 h-2 rounded-full ${selectedPicFilter === pic.name ? 'bg-white' : 'bg-[#0071e3]'}`} />
              <span>{pic.name}</span>
              <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold ${
                selectedPicFilter === pic.name ? 'bg-white/20 text-white' : 'bg-black/[0.05] text-[#86868b]'
              }`}>
                {pic.boxCount} box
              </span>
            </button>
          ))}
        </div>

        {/* Filter & Search Bar */}
        <div className="px-6 py-3.5 bg-white border-b border-black/[0.06] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[260px]">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[160px] max-w-xs">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#86868b]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nomor box, rak..."
                className="w-full pl-8 pr-3 py-1.5 bg-[#f5f5f7] border border-transparent focus:border-[#0071e3] rounded-xl text-xs text-[#1d1d1f] placeholder-[#86868b] focus:outline-hidden transition-all"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#86868b] hover:text-[#1d1d1f]"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Filter Rak */}
            <div className="flex items-center gap-1.5 text-xs text-[#86868b]">
              <span>Rak:</span>
              <select
                value={selectedRackFilter}
                onChange={(e) => setSelectedRackFilter(e.target.value)}
                className="bg-[#f5f5f7] border border-black/[0.06] rounded-xl px-2.5 py-1.5 text-xs font-semibold text-[#1d1d1f] focus:outline-hidden cursor-pointer"
              >
                <option value="ALL">Semua Penyimpanan ({racks.length})</option>
                {racks.map((r) => (
                  <option key={r.id} value={String(r.id)}>
                    {r.name} {r.boxRange ? `(${r.boxRange})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter PIC Dropdown */}
            <div className="flex items-center gap-1.5 text-xs text-[#86868b]">
              <span>PIC:</span>
              <select
                value={selectedPicFilter}
                onChange={(e) => setSelectedPicFilter(e.target.value)}
                className="bg-[#f5f5f7] border border-black/[0.06] rounded-xl px-2.5 py-1.5 text-xs font-semibold text-[#1d1d1f] focus:outline-hidden cursor-pointer"
              >
                <option value="ALL">Semua PIC</option>
                {ppicMembers.map((p) => (
                  <option key={p.id} value={p.name}>
                    #{p.ppicNumber} {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Select All Checkbox Button */}
          <button
            type="button"
            onClick={handleSelectAllFiltered}
            className="text-xs font-semibold text-[#0071e3] hover:text-[#0077ed] flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0071e3]/10 hover:bg-[#0071e3]/15 transition-all cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>
              {selectedBoxes.size === filteredBoxes.length && filteredBoxes.length > 0
                ? 'Batal Pilih Semua'
                : `Pilih Semua (${filteredBoxes.length})`}
            </span>
          </button>
        </div>

        {/* Batch Action Bar (Appears when boxes are selected) */}
        {selectedBoxes.size > 0 && (
          <div className="px-6 py-2.5 bg-blue-50/90 border-b border-blue-200/90 flex flex-wrap items-center justify-between gap-3 text-xs text-blue-950 font-semibold shrink-0 animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
              <span>
                <strong>{selectedBoxes.size} Box</strong> dipilih untuk dialihkan kepemilikannya:
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#86868b]">Pindahkan ke PIC:</span>
              <select
                value={targetBatchPic}
                onChange={(e) => setTargetBatchPic(e.target.value)}
                className="bg-white border border-blue-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 focus:outline-hidden shadow-2xs cursor-pointer"
              >
                <option value="">Pilih PPIC Tujuan...</option>
                {ppicMembers.map((p) => (
                  <option key={p.id} value={p.name}>
                    #{p.ppicNumber} {p.name} ({p.role})
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!targetBatchPic || isProcessing}
                onClick={initiateBatchReassign}
                className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs transition-all shadow-xs cursor-pointer"
              >
                Terapkan Alih Kepemilikan
              </button>
            </div>
          </div>
        )}

        {/* Box List Body */}
        <div className="p-6 flex-1 overflow-y-auto">
          {filteredBoxes.length === 0 ? (
            <div className="py-16 text-center text-[#86868b] space-y-2">
              <Package className="w-10 h-10 mx-auto text-[#86868b]/40" />
              <p className="text-sm font-semibold text-[#1d1d1f]">Tidak ada box yang sesuai filter.</p>
              <p className="text-xs">Coba ubah kata kunci pencarian atau sesuaikan filter rak dan PIC.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {filteredBoxes.map((box) => {
                const count = itemCountByBox.get(box.boxNumber) || 0;
                const units = unitCountByBox.get(box.boxNumber) || 0;
                const isSelected = selectedBoxes.has(box.boxNumber);
                const ppic = ppicMembers.find(
                  (p) => String(p.name).toLowerCase() === String(box.picName || '').toLowerCase()
                );

                return (
                  <div
                    key={box.boxNumber}
                    className={`rounded-2xl border p-4 transition-all duration-150 flex flex-col justify-between ${
                      isSelected
                        ? 'bg-[#0071e3]/5 border-[#0071e3] shadow-xs'
                        : 'bg-white border-black/[0.08] hover:border-black/[0.16] hover:shadow-xs'
                    }`}
                  >
                    <div>
                      {/* Box Card Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectBox(box.boxNumber)}
                            className="w-4 h-4 rounded-md text-[#0071e3] border-slate-300 focus:ring-0 cursor-pointer"
                          />
                          <div>
                            <span className="font-mono text-sm font-black text-[#1d1d1f]">
                              BOX #{box.boxNumber}
                            </span>
                            <span className="text-[11px] text-[#86868b] font-medium block">
                              {box.rackName}
                            </span>
                          </div>
                        </div>

                        {/* Occupancy Badge */}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            count > 0
                              ? 'bg-[#34c759]/15 text-[#248a3d] border border-[#34c759]/25'
                              : 'bg-black/[0.04] text-[#86868b]'
                          }`}
                        >
                          {count > 0 ? `${count} Item (${units} PCE)` : 'Kosong'}
                        </span>
                      </div>

                      {/* Current Owner Info */}
                      <div className="mt-3 pt-2.5 border-t border-black/[0.04] flex items-center justify-between text-xs">
                        <span className="text-[11px] text-[#86868b] font-medium">Pemilik Saat Ini:</span>
                        <div className="flex items-center gap-1.5 font-bold text-[#1d1d1f]">
                          <span className="w-2 h-2 rounded-full bg-[#0071e3]" />
                          <span>#{box.ppicNumber || (ppic ? ppic.ppicNumber : 0)} {box.picName}</span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Reassign Dropdown */}
                    <div className="mt-3 pt-2.5 border-t border-black/[0.04] flex items-center justify-between gap-2">
                      <span className="text-[11px] text-[#86868b] font-medium shrink-0">Alihkan ke:</span>
                      <select
                        value=""
                        onChange={(e) => initiateSingleReassign(box, e.target.value)}
                        className="bg-[#f5f5f7] hover:bg-black/[0.06] border border-black/[0.08] rounded-xl px-2.5 py-1 text-xs font-semibold text-[#1d1d1f] focus:outline-hidden cursor-pointer max-w-[150px] truncate"
                      >
                        <option value="">Pilih PIC Baru...</option>
                        {ppicMembers.map((p) => (
                          <option
                            key={p.id}
                            value={p.name}
                            disabled={p.name.toLowerCase() === String(box.picName || '').toLowerCase()}
                          >
                            {p.name} {p.name.toLowerCase() === String(box.picName || '').toLowerCase() ? '(Aktif)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-black/[0.06] bg-[#f5f5f7] flex items-center justify-between text-xs text-[#86868b] shrink-0">
          <div>
            Total: <strong className="text-[#1d1d1f] font-semibold">{boxes.filter((b) => Number(b.boxNumber) > 0 && Number(b.boxNumber) <= 72).length} Box</strong> terdaftar di sistem.
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white hover:bg-black/[0.04] text-[#1d1d1f] font-semibold border border-black/[0.08] transition-all shadow-2xs cursor-pointer"
          >
            Selesai
          </button>
        </div>
      </div>

      {/* Confirmation Dialog Overlay */}
      {confirmDialog && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-black/[0.08] space-y-4 animate-in zoom-in-95 duration-150 font-apple">
            <div className="w-12 h-12 rounded-2xl bg-[#ff9500]/15 text-[#ff9500] flex items-center justify-center">
              <UserCheck className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-[#1d1d1f]">
                Konfirmasi Alih Kepemilikan Box
              </h3>
              <p className="text-xs text-[#86868b] mt-1 leading-relaxed">
                {confirmDialog.mode === 'single' ? (
                  <>
                    Apakah Anda yakin ingin memindahkan kepemilikan <strong>Box #{confirmDialog.boxNum}</strong> ({confirmDialog.rackName}) dari <strong>{confirmDialog.oldPic}</strong> ke <strong>{confirmDialog.newPic}</strong>?
                  </>
                ) : (
                  <>
                    Apakah Anda yakin ingin memindahkan kepemilikan <strong>{confirmDialog.boxNums.length} Box terpilih</strong> ke <strong>{confirmDialog.newPic}</strong>?
                  </>
                )}
              </p>
            </div>

            {confirmDialog.itemCount > 0 && (
              <div className="bg-blue-50/80 border border-blue-200/80 rounded-xl p-3 text-xs text-blue-900 leading-snug flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  Terdapat <strong>{confirmDialog.itemCount} item</strong> di dalam box ini. Kepemilikan seluruh item dan lokasi penempatan akan otomatis disinkronkan ke <strong>{confirmDialog.newPic}</strong> di Supabase Cloud.
                </span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={executeReassignment}
                className="px-5 py-2 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] text-white font-bold text-xs transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                {isProcessing ? 'Menyimpan...' : 'Ya, Alihkan Kepemilikan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
