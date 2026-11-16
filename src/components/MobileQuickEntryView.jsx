import React, { useState, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import { 
  Camera, 
  Sparkles, 
  Plus, 
  Copy, 
  Check, 
  Pencil, 
  Trash2, 
  Printer, 
  Calendar, 
  Clock, 
  ChevronDown, 
  Boxes, 
  Zap, 
} from 'lucide-react';
import { getItemRecordDate, getLocalTodayIso, formatToDDMMYYYY } from '../utils/dateUtils';
import { CardPrintModal } from './CardPrintModal';

export const MobileQuickEntryView = ({
  onOpenAiScanner,
  onOpen3dView,
  onDirectScanImage,
}) => {
  const {
    items,
    boxes,
    currentUser,
    dailyTarget,
    deleteItem,
    setItemModalConfig,
    setSelectedBoxNumber,
    showNotification,
  } = useInventory();

  // State target box yang sedang aktif diisi (default ke Box #1 atau box terakhir)
  const [activeBoxNumber, setActiveBoxNumber] = useState(() => {
    return Number(localStorage.getItem('gagaclo_mobile_target_box')) || 1;
  });

  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'my'
  const [selectedPrintItem, setSelectedPrintItem] = useState(null);
  const [copiedCode, setCopiedCode] = useState(null);
  const [isBoxPickerOpen, setIsBoxPickerOpen] = useState(false);
  const [boxRackFilter, setBoxRackFilter] = useState('ALL');

  // Simpan activeBoxNumber ke localStorage saat berubah
  const handleSelectBox = (num) => {
    const boxNum = Number(num);
    setActiveBoxNumber(boxNum);
    localStorage.setItem('gagaclo_mobile_target_box', String(boxNum));
    setIsBoxPickerOpen(false);
  };

  // Detail box yang sedang aktif
  const currentBox = useMemo(() => {
    return boxes.find((b) => Number(b.boxNumber) === activeBoxNumber) || boxes[0] || { boxNumber: activeBoxNumber, rackName: 'RAK 1', picName: 'Royan' };
  }, [boxes, activeBoxNumber]);

  // Sampel di dalam box yang sedang aktif
  const currentBoxItems = useMemo(() => {
    return items.filter((it) => Number(it.boxNumber || it.box_number) === activeBoxNumber && it.status !== 'DELETED');
  }, [items, activeBoxNumber]);

  const currentBoxPcs = useMemo(() => {
    return currentBoxItems.reduce((acc, it) => acc + (Number(it.jumlah || it.qty || it.pcs) || 1), 0);
  }, [currentBoxItems]);

  // Filter sampel yang diinput HARI INI
  const todayIso = getLocalTodayIso();

  const todayItems = useMemo(() => {
    return items
      .filter((it) => {
        if (it.status === 'DELETED') return false;
        const recDate = getItemRecordDate(it);
        return recDate === todayIso;
      })
      .sort((a, b) => {
        // Urutkan dari yang terbaru (newest first)
        const timeA = new Date(a.createdAt || a.created_at || 0).getTime() || 0;
        const timeB = new Date(b.createdAt || b.created_at || 0).getTime() || 0;
        return timeB - timeA;
      });
  }, [items, todayIso]);

  // Total PCS hari ini oleh semua tim
  const todayTotalPcs = useMemo(() => {
    return todayItems.reduce((acc, it) => acc + (Number(it.jumlah || it.qty || it.pcs) || 1), 0);
  }, [todayItems]);

  // Sampel hari ini khusus user yang sedang login
  const currentUserName = currentUser?.name ? String(currentUser.name).trim().toLowerCase() : '';
  const myTodayItems = useMemo(() => {
    if (!currentUserName) return todayItems;
    return todayItems.filter((it) => {
      const penginput = String(it.penginput || it.picName || it.pic || '').trim().toLowerCase();
      return penginput === currentUserName;
    });
  }, [todayItems, currentUserName]);

  const myTodayPcs = useMemo(() => {
    return myTodayItems.reduce((acc, it) => acc + (Number(it.jumlah || it.qty || it.pcs) || 1), 0);
  }, [myTodayItems]);

  // Items to display in feed based on filter
  const displayedItems = filterMode === 'my' ? myTodayItems : todayItems;
  const displayedPcs = filterMode === 'my' ? myTodayPcs : todayTotalPcs;

  // Persentase target tim hari ini
  const targetPcs = Math.max(1, dailyTarget || 400);
  const targetPercent = Math.min(100, Math.round((todayTotalPcs / targetPcs) * 100));

  // Salin kode ke clipboard
  const handleCopyCode = (code, e) => {
    e?.stopPropagation();
    if (!code) return;
    try {
      navigator.clipboard.writeText(code);
      setCopiedCode(code);
      showNotification(`Kode ${code} disalin ke clipboard!`, 'info', 2000);
      setTimeout(() => setCopiedCode(null), 1500);
    } catch {}
  };

  // Hapus item dengan konfirmasi
  const handleDeleteItem = async (item, e) => {
    e?.stopPropagation();
    const name = item.style || item.sampleNo || item.kode || 'item';
    if (window.confirm(`Yakin ingin menghapus sampel "${name}"?`)) {
      await deleteItem(item.id);
      showNotification('Sampel berhasil dihapus.', 'info');
    }
  };

  // Filter 72 box untuk picker
  const filteredBoxes = useMemo(() => {
    if (boxRackFilter === 'ALL') return boxes;
    return boxes.filter((b) => String(b.rackName || '').toUpperCase() === boxRackFilter);
  }, [boxes, boxRackFilter]);

  return (
    <div className="mobile-quick-entry font-apple space-y-3.5 pb-20 select-none">
      
      {/* 1. TOP BAR: Mode Switcher (Kasir vs 3D) & Salutation */}
      <div className="flex items-center justify-between gap-2 bg-[#161618] text-white p-3 rounded-2xl border border-white/10 shadow-sm">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-[#0071e3] to-[#5ac8fa] text-white shadow-xs shrink-0">
            <Zap className="h-5 w-5 stroke-[2.2]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white truncate">
                Halo, {currentUser?.name || 'Tim RnD'} 👋
              </span>
              <span className="text-[9px] font-semibold text-emerald-300 bg-emerald-500/20 border border-emerald-500/30 px-1.5 py-0.2 rounded-full shrink-0">
                {currentUser?.role || 'PPIC'}
              </span>
            </div>
            <p className="text-[10px] text-white/50 leading-tight">
              Mode Kasir &bull; Siap jepret kartu sampel
            </p>
          </div>
        </div>
      </div>

      {/* 2. STATS CAPAIAN TARGET TEAM & HARI INI */}
      <div className="bg-white rounded-2xl border border-black/[0.08] p-3 shadow-xs space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#0071e3]" />
            <span className="font-semibold text-[#1d1d1f]">Capaian Input Hari Ini</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold tabular-nums text-[#1d1d1f]">
              {todayTotalPcs.toLocaleString('id-ID')}
            </span>
            <span className="text-[10px] text-[#86868b] tabular-nums">
              / {targetPcs.toLocaleString('id-ID')} PCE
            </span>
            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full tabular-nums ${
              targetPercent >= 100 
                ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' 
                : 'bg-black/[0.04] text-[#1d1d1f]'
            }`}>
              {targetPercent}%
            </span>
          </div>
        </div>

        {/* Progress Bar Fitness Style */}
        <div className="w-full bg-black/[0.06] rounded-full h-2 overflow-hidden p-0.5">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${
              targetPercent >= 100 ? 'bg-[#34c759]' : 'bg-[#0071e3]'
            }`}
            style={{ width: `${Math.min(100, targetPercent)}%` }}
          />
        </div>
      </div>

      {/* 3. TARGET BOX SELECTOR (Pilih Box yang Sedang Diisi) */}
      <div className="bg-white rounded-2xl border border-black/[0.08] p-3.5 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[#86868b]">
            Target Box Pengisian
          </span>
          <button
            type="button"
            onClick={() => setIsBoxPickerOpen((p) => !p)}
            className="text-[11px] font-bold text-[#0071e3] hover:underline flex items-center gap-0.5 cursor-pointer"
          >
            <span>{isBoxPickerOpen ? 'Tutup Pilihan' : 'Ganti Box'}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isBoxPickerOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Box Card Info */}
        <div className="flex items-center justify-between bg-black/[0.03] border border-black/[0.06] rounded-xl p-2.5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0071e3]/10 text-[#0071e3] font-bold text-sm shrink-0 border border-[#0071e3]/20 shadow-2xs">
              #{activeBoxNumber}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#1d1d1f]">
                  BOX #{activeBoxNumber}
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-white border border-black/[0.08] text-[#86868b]">
                  {currentBox.rackName || 'RAK 1'}
                </span>
              </div>
              <p className="text-[11px] text-[#86868b] mt-0.5">
                PIC: <strong>@{currentBox.picName || 'Royan'}</strong> &bull; {currentBoxItems.length} item ({currentBoxPcs} PCE)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSelectedBoxNumber(activeBoxNumber)}
            className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-black/[0.04] border border-black/[0.08] text-[11px] font-semibold text-[#1d1d1f] shadow-2xs transition cursor-pointer shrink-0"
          >
            Lihat Box
          </button>
        </div>

        {/* Accordion Box Picker (Jika Dibuka) */}
        {isBoxPickerOpen && (
          <div className="pt-2 border-t border-black/[0.06] space-y-2 animate-in fade-in duration-150">
            {/* Filter Rak */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
              {['ALL', 'RAK 1', 'RAK 2', 'RAK 3', 'RAK 4', 'RAK 5'].map((rk) => (
                <button
                  key={rk}
                  type="button"
                  onClick={() => setBoxRackFilter(rk)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition cursor-pointer ${
                    boxRackFilter === rk
                      ? 'bg-[#1d1d1f] text-white shadow-2xs'
                      : 'bg-black/[0.04] text-[#86868b] hover:bg-black/[0.08]'
                  }`}
                >
                  {rk === 'ALL' ? 'Semua Rak' : rk}
                </button>
              ))}
            </div>

            {/* Grid 72 Box (Scrollable) */}
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 max-h-48 overflow-y-auto p-1 bg-black/[0.02] rounded-xl border border-black/[0.04]">
              {filteredBoxes.map((b) => {
                const bNum = Number(b.boxNumber);
                const isSelected = bNum === activeBoxNumber;
                return (
                  <button
                    key={bNum}
                    type="button"
                    onClick={() => handleSelectBox(bNum)}
                    className={`p-1.5 rounded-lg text-center transition cursor-pointer border ${
                      isSelected
                        ? 'bg-[#0071e3] text-white border-[#0071e3] shadow-xs font-bold'
                        : 'bg-white hover:bg-black/[0.04] text-[#1d1d1f] border-black/[0.06]'
                    }`}
                  >
                    <div className="text-[11px] font-mono leading-tight">#{bNum}</div>
                    <div className={`text-[8px] truncate ${isSelected ? 'text-white/80' : 'text-[#86868b]'}`}>
                      {b.picName || 'PIC'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 4. HERO ACTION CARD: JEPRET TAG SAMPEL (SCAN AI) */}
      <div className="bg-gradient-to-br from-[#12141a] via-[#181a24] to-[#12141a] text-white rounded-3xl p-4 sm:p-5 shadow-lg border border-white/10 space-y-3.5 relative overflow-hidden">
        {/* Ambient glow accent */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#0071e3]/20 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-[#30d158] animate-pulse" />
            <span className="text-[11px] font-mono font-semibold tracking-wide text-white/70">
              GEMINI FLASH VISION AI
            </span>
          </div>
          <span className="text-[10px] text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full font-medium">
            Target: BOX #{activeBoxNumber}
          </span>
        </div>

        {/* TOMBOL UTAMA BESAR: SCAN AI */}
        <button
          type="button"
          onClick={() => onOpenAiScanner?.(activeBoxNumber)}
          className="w-full py-4 px-4 rounded-2xl bg-gradient-to-r from-[#0071e3] via-[#0077ed] to-[#5ac8fa] text-white shadow-xl shadow-blue-900/40 hover:brightness-110 active:scale-98 transition-all flex items-center justify-center gap-3 cursor-pointer relative z-10"
        >
          <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0">
            <Camera className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div className="text-left">
            <div className="text-sm sm:text-base font-extrabold tracking-tight leading-tight flex items-center gap-1.5">
              <span>Jepret Tag Sampel (Scan AI)</span>
              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse shrink-0" />
            </div>
            <div className="text-[10px] sm:text-[11px] text-white/80 mt-0.5 font-medium">
              Ekstraksi tulisan tangan &amp; label otomatis &lt; 1.5 detik
            </div>
          </div>
        </button>

        {/* Input Manual via Form */}
        <button
          type="button"
          onClick={() => {
            setItemModalConfig({
              isOpen: true,
              item: null,
              targetBoxNumber: activeBoxNumber,
            });
          }}
          className="w-full py-2.5 px-3 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/10 text-white flex items-center justify-center gap-2 text-center transition cursor-pointer active:scale-95 text-xs font-bold relative z-10"
          title="Input Manual dengan Ketik Formulir"
        >
          <Plus className="w-4 h-4 text-amber-300" />
          <span>Ketik Manual (Form Lengkap)</span>
        </button>
      </div>

      {/* 5. FEED: DAFTAR SAMPEL BARU DIMASUKKAN HARI INI (Hanya Tampil Jika Ada Item Hari Ini) */}
      {displayedItems.length > 0 && (
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between px-1">
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-[#1d1d1f] flex items-center gap-1.5">
                <span>Sampel Masuk Hari Ini</span>
                <span className="text-[10px] font-bold bg-[#0071e3]/10 text-[#0071e3] px-2 py-0.2 rounded-full tabular-nums">
                  {displayedItems.length} Item &bull; {displayedPcs} PCE
                </span>
              </h3>
              <p className="text-[10px] text-[#86868b] mt-0.5">
                Riwayat pendataan real-time hari ini ({formatToDDMMYYYY(todayIso)})
              </p>
            </div>

            {/* Filter Pill: Semua vs Saya */}
            <div className="flex items-center p-0.5 bg-black/[0.04] rounded-full border border-black/[0.06] shrink-0">
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition cursor-pointer ${
                  filterMode === 'all'
                    ? 'bg-white text-[#1d1d1f] shadow-2xs font-bold'
                    : 'text-[#86868b]'
                }`}
              >
                Semua ({todayItems.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('my')}
                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition cursor-pointer ${
                  filterMode === 'my'
                    ? 'bg-white text-[#1d1d1f] shadow-2xs font-bold'
                    : 'text-[#86868b]'
                }`}
              >
                Saya ({myTodayItems.length})
              </button>
            </div>
          </div>

          {/* List of Cards */}
          <div className="space-y-2">
            {displayedItems.map((item) => {
              const qty = Number(item.jumlah || item.qty || item.pcs) || 1;
              const isDispatched = item.status === 'Dispatched' || item.status === 'Terkirim';
              const isBorrowed = item.status === 'Borrowed' || item.status === 'Dipinjam';

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-black/[0.08] p-3 shadow-xs space-y-2 hover:border-[#0071e3]/30 transition"
                >
                  {/* Row 1: Box Badge, Code & Status */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                      {/* Box Number Pill */}
                      <button
                        type="button"
                        onClick={() => setSelectedBoxNumber(Number(item.boxNumber || item.box_number))}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#0071e3]/10 text-[#0071e3] text-[10px] font-extrabold border border-[#0071e3]/20 hover:bg-[#0071e3] hover:text-white transition cursor-pointer"
                        title="Klik untuk membuka box ini"
                      >
                        <Boxes className="w-3 h-3" />
                        <span>BOX #{item.boxNumber || item.box_number || 1}</span>
                      </button>

                      {/* Unique Code Pill with 1-tap Copy */}
                      <button
                        type="button"
                        onClick={(e) => handleCopyCode(item.kode || item.sku, e)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/[0.04] hover:bg-black/[0.08] text-[#1d1d1f] text-[10px] font-mono font-bold border border-black/[0.08] transition cursor-pointer"
                        title="Salin kode sampel"
                      >
                        {copiedCode === (item.kode || item.sku) ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3 text-[#86868b]" />
                        )}
                        <span>{item.kode || item.sku || '-'}</span>
                      </button>

                      {/* Jenis Sample Pill */}
                      {item.jenisSample && item.jenisSample !== 'NA' && (
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-700 border border-amber-500/20">
                          {item.jenisSample}
                        </span>
                      )}
                    </div>

                    {/* Status Pill */}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 border ${
                      isDispatched
                        ? 'bg-blue-50 text-blue-600 border-blue-200'
                        : isBorrowed
                        ? 'bg-amber-50 text-amber-600 border-amber-200'
                        : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                    }`}>
                      {isDispatched ? 'Terkirim' : isBorrowed ? 'Dipinjam' : 'Dalam Box'}
                    </span>
                  </div>

                  {/* Row 2: Style & Sample No */}
                  <div>
                    <h4 className="text-xs font-bold text-[#1d1d1f] leading-snug">
                      {item.style || item.name || 'Sample Garmen Tanpa Nama'}
                    </h4>
                    {item.sampleNo && item.sampleNo !== 'NA' && (
                      <p className="text-[11px] font-medium text-[#86868b] mt-0.5">
                        Artikel: <strong className="text-[#1d1d1f]">{item.sampleNo}</strong>
                      </p>
                    )}
                  </div>

                  {/* Row 3: Detail Chips (Size, Color, Qty, Buyer) */}
                  <div className="flex items-center gap-1.5 flex-wrap text-[10px] text-[#86868b] pt-0.5">
                    {item.size && item.size !== 'NA' && (
                      <span className="bg-black/[0.03] px-2 py-0.5 rounded border border-black/[0.06] font-medium text-[#1d1d1f]">
                        Size: <strong>{item.size}</strong>
                      </span>
                    )}
                    {item.color && item.color !== 'NA' && (
                      <span className="bg-black/[0.03] px-2 py-0.5 rounded border border-black/[0.06] font-medium text-[#1d1d1f]">
                        Warna: <strong>{item.color}</strong>
                      </span>
                    )}
                    <span className="bg-[#0071e3]/10 text-[#0071e3] px-2 py-0.5 rounded font-bold">
                      {qty} PCE
                    </span>
                    {item.buyerNo && item.buyerNo !== 'NA' && (
                      <span className="text-[#86868b]">
                        &bull; Buyer: {item.buyerNo}
                      </span>
                    )}
                  </div>

                  {/* Row 4: Penginput info & Actions */}
                  <div className="flex items-center justify-between pt-1 border-t border-black/[0.04] text-[10px] text-[#86868b]">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#86868b]" />
                      <span>{item.penginput || item.picName || 'Tim'} &bull; Hari ini</span>
                    </div>

                    {/* Action Buttons: Edit, Print, Delete */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setSelectedPrintItem(item)}
                        className="p-1.5 rounded-lg text-[#86868b] hover:text-[#0071e3] hover:bg-black/[0.04] transition cursor-pointer"
                        title="Cetak KTP Sampel"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setItemModalConfig({
                            isOpen: true,
                            item,
                            targetBoxNumber: Number(item.boxNumber || item.box_number || 1),
                          });
                        }}
                        className="p-1.5 rounded-lg text-[#86868b] hover:text-[#0071e3] hover:bg-black/[0.04] transition cursor-pointer"
                        title="Edit rincian sampel"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteItem(item, e)}
                        className="p-1.5 rounded-lg text-[#86868b] hover:text-[#ff3b30] hover:bg-red-50 transition cursor-pointer"
                        title="Hapus sampel ini"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal Cetak KTP Sampel (Jika Dipilih) */}
      {selectedPrintItem && (
        <CardPrintModal
          itemsToPrint={[selectedPrintItem]}
          onClose={() => setSelectedPrintItem(null)}
        />
      )}

    </div>
  );
};
