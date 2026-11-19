import React, { useState, useMemo } from 'react';
import { 
  useInventory 
} from '../context/InventoryContext';
import { 
  X, 
  Plus, 
  QrCode, 
  Edit3, 
  Trash2, 
  ArrowRightLeft, 
  Calendar, 
  Tag, 
  User, 
  Boxes, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Save,
  ArrowUpRight,
  ArrowDownRight,
  Printer,
  CheckSquare,
  Search,
  Copy,
  Check,
  Lock,
  ShieldAlert,
  FileText,
  Send,
  ShoppingCart,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import { BoxLabel } from './BoxLabel';
import { CardPrintModal } from './CardPrintModal';
import { SampleListPrintModal } from './SampleListPrintModal';
import { DispatchModal } from './DispatchModal';
import { AiTagScannerModal } from './AiTagScannerModal';
import { getNextSampleCode, getNextMaterialCode, allocateNextSequentialCode } from '../utils/sequenceResolver';
import { supabase } from '../lib/supabase';
import { isHelper, resolveItemInputter } from '../utils/authUtils';

export const BoxDetailModal = () => {
  const { selectedBoxNumber, getBoxDetails } = useInventory();
  const box = getBoxDetails(selectedBoxNumber);
  return box ? <BoxDetail key={box.boxNumber} box={box} /> : null;
};

function BoxDetail({ box }) {
  const {
    setSelectedBoxNumber,
    getItemsInBox,
    addItem,
    deleteItem,
    deleteMultipleItems,
    setItemModalConfig,
    setQrModalBox,
    updateBoxNotes,
    setBoxFull,
    setTransactionModalConfig,
    updateItem,
    boxes,
    items,
    showNotification,
    currentUser,
    isSuperuser,
    dispatchCart,
    addToDispatchCart,
    addMultipleToDispatchCart,
    isItemInDispatchCart,
    reassignBoxOwnership,
    ppicMembers,
  } = useInventory();
  const selectedBoxNumber = box.boxNumber;
  const itemsInBox = getItemsInBox(selectedBoxNumber);
  const isSuper = isSuperuser?.(currentUser);
  const isHelperUser = isHelper(currentUser);
  const isRealOwner = currentUser && box.picName && String(currentUser.name).trim().toLowerCase() === String(box.picName).trim().toLowerCase();
  const isCrossPpic = currentUser && !isRealOwner && !isHelperUser && !isSuper;
  const isBoxManager = !currentUser || isSuper || isHelperUser || !box.picName || isRealOwner;
  const isOwner = isBoxManager || isCrossPpic;

  const canEditItem = (item) => {
    if (isBoxManager) return true;
    if (!currentUser) return true;
    const inputter = item?.inputtedBy || item?.createdBy;
    if (inputter && String(inputter).trim().toLowerCase() === String(currentUser.name).trim().toLowerCase()) return true;
    return false;
  };
  const [copiedId, setCopiedId] = useState(null);
  const [dispatchModalItem, setDispatchModalItem] = useState(null);
  const [dispatchPreselectedItems, setDispatchPreselectedItems] = useState([]);

  const handleCopyCode = (e, code, id) => {
    e?.stopPropagation();
    if (!code || code === '-') return;
    try {
      navigator.clipboard.writeText(code);
      setCopiedId(id);
      showNotification?.('📋 Kode sample berhasil disalin!', 'info', 2000);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      showNotification?.('📋 Kode sample disalin', 'info', 2000);
    }
  };

  const handleDuplicateItem = (itemToCopy) => {
    if (!isOwner) {
      showNotification?.(`Akses ditolak: Box ini dialokasikan untuk ${box.picName}. Satu user tidak dapat mengedit data user lain.`, 'error', 4500);
      return;
    }
    setItemModalConfig({
      isOpen: true,
      item: {
        ...itemToCopy,
        id: undefined,
        kode: '',
        sku: '',
      },
      targetBoxNumber: box.boxNumber,
      isDuplicate: true,
    });
    showNotification?.('📋 Data item diduplikasi! Kode unik baru otomatis dibuat saat disimpan.', 'info', 3000);
  };

  const handleCopySelectedInfo = () => {
    const selected = itemsInBox.filter(i => selectedItemIds.has(i.id));
    if (selected.length === 0) return;
    const textLines = selected.map((i, idx) => 
      `${idx + 1}. [${i.kode || i.sku || '-'}] ${i.style || i.deskripsi || i.name || 'Sample'} | Sample No: ${i.sampleNo || '-'} | Size: ${i.size || '-'} | Color: ${i.color || '-'} | Qty: ${i.jumlah || i.qty || 1} ${String(i.satuan || i.unit || 'PCE').toUpperCase() === 'PCS' ? 'PCE' : (i.satuan || i.unit || 'PCE')}`
    ).join('\n');

    try {
      navigator.clipboard.writeText(textLines);
      showNotification?.('📋 Data item terpilih berhasil disalin ke clipboard!', 'info', 3000);
    } catch {
      showNotification?.('Gagal menyalin ke clipboard', 'error', 3000);
    }
  };
  const [savingFullStatus, setSavingFullStatus] = useState(false);
  const [fullStatusError, setFullStatusError] = useState('');
  const toggleFullStatus = async () => {
    if (!isBoxManager) {
      showNotification?.(`Akses ditolak: Box ini dialokasikan untuk ${box.picName}. Satu user tidak dapat mengubah status box user lain.`, 'error', 4500);
      return;
    }
    setSavingFullStatus(true);
    setFullStatusError('');
    try {
      await setBoxFull(box.boxNumber, !box.isFull);
    } catch {
      setFullStatusError('Status box gagal disimpan. Coba lagi.');
    } finally {
      setSavingFullStatus(false);
    }
  };
  const [boxNotes, setBoxNotes] = useState(box.notes || '');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [showBoxLabelModal, setShowBoxLabelModal] = useState(false);
  const [showSampleListPrintModal, setShowSampleListPrintModal] = useState(false);
  const [cardPrintItems, setCardPrintItems] = useState(null);
  const [selectedItemIds, setSelectedItemIds] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [isAiScannerOpen, setIsAiScannerOpen] = useState(false);
  const [isEditPicModalOpen, setIsEditPicModalOpen] = useState(false);
  const [selectedNewPic, setSelectedNewPic] = useState('');
  const [isReassigningPic, setIsReassigningPic] = useState(false);
  const [reassignError, setReassignError] = useState(null);

  const handleDirectSaveAiData = async (extracted) => {
    const styleTrim = String(extracted.style || 'SAMPLE').trim().toUpperCase();
    const sampleNoTrim = String(extracted.sampleNo || '').trim().toUpperCase();
    const sizeTrim = String(extracted.size || 'ONESIZE').trim().toUpperCase();
    const colorTrim = String(extracted.color || 'NA').trim().toUpperCase();
    const buyerNoTrim = String(extracted.buyerNo || 'NA').trim().toUpperCase();
    const trackClean = (extracted.track && String(extracted.track).trim()) ? String(extracted.track).trim().toUpperCase() : 'NA';
    const tanggalClean = extracted.tanggal || 'NA';
    const isMat = box.category === 'MATERIAL';

    const finalKode = await allocateNextSequentialCode(
      supabase,
      isMat ? 'MATERIAL' : 'SAMPLE',
      items
    );

    const placeClean = `BOX ${box.boxNumber} (${box.rackName || 'LANTAI'} - ${box.picName || 'Royan'})`;
    const fullDeskripsi = sampleNoTrim
      ? `${styleTrim} - Sample: ${sampleNoTrim} - Size: ${sizeTrim}`
      : `${styleTrim} - Size: ${sizeTrim}`;

    const payload = {
      track: trackClean,
      tanggal: tanggalClean,
      kode: finalKode,
      buyerNo: buyerNoTrim,
      jenisSample: extracted.jenisSample || 'PPS',
      style: styleTrim,
      sampleNo: sampleNoTrim,
      size: sizeTrim,
      deskripsi: fullDeskripsi,
      color: colorTrim,
      jumlah: Number(extracted.jumlah) || 1,
      satuan: 'PCE',
      place: placeClean,
      name: sampleNoTrim
        ? `${styleTrim} (Sample: ${sampleNoTrim}, Size: ${sizeTrim})`
        : `${styleTrim} (Size: ${sizeTrim})`,
      sku: finalKode,
      buyerNumber: buyerNoTrim,
      description: fullDeskripsi,
      qty: Number(extracted.jumlah) || 1,
      unit: 'PCE',
      boxNumber: box.boxNumber,
      rackId: Number(box.rackId) || 1,
      rackName: box.rackName || 'RACK 1',
      picName: box.picName || 'Royan',
      category: box.category || 'SAMPLE',
      status: 'In Storage',
      dateIn: tanggalClean,
    };

    await addItem(payload);
    showNotification?.(`⚡ [${finalKode}] Berhasil dicatat langsung ke BOX #${box.boxNumber}!`, 'success', 3500);
  };

  // Instant Move Box Dialog state
  const [movingItems, setMovingItems] = useState(null);
  const [targetBoxNum, setTargetBoxNum] = useState(1);
  const [isMoving, setIsMoving] = useState(false);
  const [moveError, setMoveError] = useState(null);

  // Delete Item(s) Dialog state
  const [itemToDelete, setItemToDelete] = useState(null); // single item object OR array of items
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const openMoveModal = (itemsToMove) => {
    setMoveError(null);
    setMovingItems(itemsToMove);
    const otherBox = boxes.find(b => Number(b.boxNumber) !== Number(box.boxNumber) && Number(b.boxNumber) < 900000);
    setTargetBoxNum(otherBox ? otherBox.boxNumber : 1);
  };

  const handleConfirmMove = async () => {
    if (!movingItems || movingItems.length === 0) return;
    const destBox = boxes.find(b => Number(b.boxNumber) === Number(targetBoxNum));
    if (!destBox) {
      setMoveError('Pilih box tujuan yang valid.');
      return;
    }
    setIsMoving(true);
    setMoveError(null);
    try {
      for (const it of movingItems) {
        await updateItem(it.id, {
          boxNumber: destBox.boxNumber,
          rackId: destBox.rackId,
          rackName: destBox.rackName,
          picName: destBox.picName,
          category: destBox.category,
          place: `BOX ${destBox.boxNumber} (${destBox.rackName || 'LANTAI'} - ${destBox.picName || 'Royan'})`,
        });
      }
      setSelectedItemIds(prev => {
        const next = new Set(prev);
        movingItems.forEach(i => next.delete(i.id));
        return next;
      });
      showNotification?.(
        '⚠️ PENGINGAT WAJIB: Item berhasil dipindahkan! Harap cetak kartu sample baru atau tulis Place baru di kartu fisik!',
        'warning',
        8000
      );
      setMovingItems(null);
    } catch (err) {
      console.error('Error saat memindahkan item:', err);
      setMoveError(err?.message || 'Gagal memindahkan item.');
    } finally {
      setIsMoving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      if (Array.isArray(itemToDelete)) {
        const ids = itemToDelete.map(i => i.id);
        await deleteMultipleItems(ids);
        setSelectedItemIds(prev => {
          const next = new Set(prev);
          ids.forEach(id => next.delete(id));
          return next;
        });
      } else {
        await deleteItem(itemToDelete.id);
        setSelectedItemIds(prev => {
          const next = new Set(prev);
          next.delete(itemToDelete.id);
          return next;
        });
      }
      setItemToDelete(null);
    } catch (err) {
      console.error('Error saat menghapus item:', err);
      setDeleteError(err?.message || 'Gagal menghapus item.');
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleItemSelect = (id) => {
    setSelectedItemIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedItemIds.size === itemsInBox.length) {
      setSelectedItemIds(new Set());
    } else {
      setSelectedItemIds(new Set(itemsInBox.map(i => i.id)));
    }
  };

  const handlePrintLabel = () => {
    setShowBoxLabelModal(true);
  };

  const handleSaveNotes = () => {
    if (!isBoxManager) {
      showNotification?.(`Akses ditolak: Catatan Box #${box.boxNumber} milik ${box.picName}. Satu user tidak dapat mengedit data user lain.`, 'error', 4500);
      return;
    }
    setIsSavingNotes(true);
    updateBoxNotes(box.boxNumber, boxNotes);
    setTimeout(() => setIsSavingNotes(false), 600);
  };

  const filteredItems = itemsInBox.filter(item => {
    if (filterStatus !== 'ALL' && item.status !== filterStatus) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (item.kode || item.sku || '').toLowerCase().includes(q) ||
      (item.buyerNo || '').toLowerCase().includes(q) ||
      (item.style || item.deskripsi || item.name || '').toLowerCase().includes(q) ||
      (item.size || '').toLowerCase().includes(q) ||
      (item.color || '').toLowerCase().includes(q) ||
      (item.sampleNo || '').toLowerCase().includes(q)
    );
  });

  // Natural alphanumeric sort: Mengurutkan Style & Deskripsi secara teratur berdasarkan angka & alfabet (A-Z)
  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      const styleA = String(a.style || a.deskripsi || a.name || '').trim();
      const styleB = String(b.style || b.deskripsi || b.name || '').trim();
      const cmp = styleA.localeCompare(styleB, undefined, { numeric: true, sensitivity: 'base' });
      if (cmp !== 0) return cmp;

      const sizeA = String(a.size || '').trim();
      const sizeB = String(b.size || '').trim();
      const sizeCmp = sizeA.localeCompare(sizeB, undefined, { numeric: true, sensitivity: 'base' });
      if (sizeCmp !== 0) return sizeCmp;

      const codeA = String(a.kode || a.sku || '').trim();
      const codeB = String(b.kode || b.sku || '').trim();
      return codeA.localeCompare(codeB, undefined, { numeric: true });
    });
  }, [filteredItems]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'In Storage':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>Tersimpan</span>
          </span>
        );
      case 'Borrowed':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            <span>Dipinjam</span>
          </span>
        );
      case 'In Review':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
            <span>Review</span>
          </span>
        );
      default:
        return (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="font-apple fixed inset-0 z-50 bg-black/50 backdrop-blur-md flex items-center justify-center p-1.5 sm:p-3 overflow-y-auto print:p-0 print:bg-transparent transition-opacity">
      <div className={`bg-white rounded-[26px] shadow-[0_30px_70px_rgba(0,0,0,0.2)] border border-black/[0.08] w-full max-w-[98vw] 2xl:max-w-[1780px] max-h-[96vh] flex flex-col overflow-hidden ${cardPrintItems || showBoxLabelModal || showSampleListPrintModal ? 'no-print' : ''}`}>
        
        {/* Apple Dark Header - Responsive & Rapi */}
        <div className="bg-[#161618] text-white p-3.5 sm:p-5 border-b border-white/[0.08] shrink-0 space-y-3">
          {/* Baris 1: Judul Box, Badges, & Tombol Close Pinned */}
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white whitespace-nowrap shrink-0">
                {box.code}
              </h2>
              <span className={`text-[10.5px] px-2.5 py-0.5 rounded-full font-semibold tracking-wide uppercase shrink-0 ${
                box.category === 'SAMPLE' ? 'bg-[#ff9500]/20 text-[#ffb340] border border-[#ff9500]/30' : 'bg-[#34c759]/20 text-[#6ce38c] border border-[#34c759]/30'
              }`}>
                {box.category}
              </span>
              <span className="text-[10.5px] text-white/80 font-medium px-2.5 py-0.5 rounded-full bg-white/10 border border-white/10 shrink-0">
                {box.rackName}
              </span>
            </div>

            {/* Tombol Tutup Pinned di Pojok Kanan Atas */}
            <button
              type="button"
              onClick={() => setSelectedBoxNumber(null)}
              aria-label="Tutup detail box"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer shrink-0 active:scale-95"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Baris 2: Tombol Aksi Box */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={toggleFullStatus}
              disabled={savingFullStatus || !isBoxManager}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold text-white transition cursor-pointer active:scale-95 ${
                !isBoxManager
                  ? 'bg-white/10 text-white/40 opacity-60 cursor-not-allowed'
                  : box.isFull 
                  ? 'bg-white/15 hover:bg-white/25 text-white border border-white/20' 
                  : 'bg-[#0071e3] hover:bg-[#0077ed] text-white shadow-xs'
              }`}
              title={!isBoxManager ? `Terkunci: Box ini milik PPIC ${box.picName}` : undefined}
            >
              {!isBoxManager && <Lock className="inline w-3 h-3 mr-1 -mt-0.5" />}
              {savingFullStatus ? 'Menyimpan…' : box.isFull ? 'Buka kembali box' : 'Tandai penuh'}
            </button>
            {fullStatusError && <span role="alert" className="text-xs text-[#ff453a]">{fullStatusError}</span>}

            <button
              type="button"
              onClick={() => setShowSampleListPrintModal(true)}
              className="flex items-center space-x-1.5 text-xs font-medium bg-white/10 hover:bg-white/20 text-white border border-white/15 px-3 py-1.5 rounded-full transition cursor-pointer active:scale-95"
              title="Cetak Lembar Daftar Sample Box (Format A4)"
            >
              <FileText className="w-3.5 h-3.5 text-[#2997ff]" />
              <span>Print List Sample</span>
            </button>

            <button
              type="button"
              onClick={() => setShowBoxLabelModal(true)}
              className="flex items-center space-x-1.5 text-xs font-medium bg-[#ff9500]/20 hover:bg-[#ff9500]/30 text-[#ffb340] border border-[#ff9500]/40 px-3.5 py-1.5 rounded-full transition cursor-pointer active:scale-95"
              title="Cetak Label Stiker Box (Desain Resmi)"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Label Box</span>
            </button>
          </div>

          {/* Baris 3: Catatan Box */}
          <div className="w-full">
            {isBoxManager ? (
              <div className="flex items-center gap-1.5 w-full">
                <input
                  type="text"
                  value={boxNotes}
                  onChange={(e) => setBoxNotes(e.target.value)}
                  onBlur={handleSaveNotes}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSaveNotes();
                    }
                  }}
                  placeholder="Tambah deskripsi / catatan box..."
                  className="w-full text-xs text-white placeholder:text-white/40 bg-white/10 border border-white/15 rounded-xl px-3 py-1.5 focus:outline-hidden focus:ring-2 focus:ring-[#0071e3]/40 focus:bg-white/15 transition"
                  title="Klik untuk ubah catatan (Tekan Enter untuk simpan)"
                />
                <button
                  type="button"
                  onClick={handleSaveNotes}
                  className="text-xs font-medium text-white bg-white/15 hover:bg-white/25 border border-white/20 shrink-0 px-3 py-1.5 rounded-xl transition cursor-pointer active:scale-95"
                  title="Simpan Catatan"
                >
                  {isSavingNotes ? '✓ Tersimpan' : 'Simpan'}
                </button>
              </div>
            ) : (
              <p className="text-xs text-white/60 italic truncate" title={boxNotes || 'Tidak ada catatan'}>
                {boxNotes ? `Catatan: ${boxNotes}` : 'Tidak ada catatan khusus'}
              </p>
            )}
          </div>
        </div>

        {/* Apple Style PPIC & Quick Stats Bar */}
        <div className="bg-[#f5f5f7] px-5 py-3 border-b border-black/[0.06] flex flex-wrap items-center justify-between gap-3 text-xs text-[#1d1d1f] shrink-0">
          <div className="flex items-center space-x-3 flex-wrap gap-y-2">
            <span className="text-[#86868b] font-medium">PPIC</span>
            <div className="flex items-center space-x-2 bg-white px-3 py-1 rounded-full border border-black/[0.06] shadow-2xs font-semibold text-[#1d1d1f]">
              <span className="w-2 h-2 rounded-full bg-[#0071e3]"></span>
              <span>#{box.ppicNumber} {box.picName}</span>
            </div>
            {/* Tombol Edit Kepemilikan Box */}
            <button
              type="button"
              onClick={() => {
                setSelectedNewPic('');
                setReassignError(null);
                setIsEditPicModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white hover:bg-black/[0.05] active:bg-black/[0.08] text-[#0071e3] border border-[#0071e3]/30 font-semibold text-xs transition-all shadow-2xs cursor-pointer"
              title="Ubah kepemilikan PIC untuk Box ini"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Edit Kepemilikan</span>
            </button>
            {isSuper && String(currentUser?.name).trim().toLowerCase() !== String(box.picName).trim().toLowerCase() && (
              <span className="text-[11px] font-semibold text-[#b25000] bg-[#ff9500]/15 border border-[#ff9500]/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                ⚡ Mode Superuser (Akses Penuh)
              </span>
            )}
            {isHelperUser && (
              <span className="text-[11px] font-semibold text-[#006b52] bg-[#30b0c7]/15 border border-[#30b0c7]/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                🛠️ Tim Support (Membantu {box.picName})
              </span>
            )}
            {isCrossPpic && (
              <span className="text-[11px] font-semibold text-[#0071e3] bg-[#0071e3]/10 border border-[#0071e3]/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                🤝 Bantuan Antar-PPIC (Membantu {box.picName})
              </span>
            )}
          </div>

          <div className="flex items-center space-x-4 text-[#86868b]">
            <div className="text-[13px]">
              Total: <strong className="text-[#1d1d1f] font-semibold tabular-nums">{itemsInBox.reduce((sum, i) => sum + (Number(i.qty) || 0), 0)} unit</strong>
            </div>
          </div>
        </div>

        {/* Cross-PPIC Helper Notice */}
        {isCrossPpic && (
          <div className="bg-blue-50/90 border-b border-blue-200/90 px-5 py-2.5 flex items-center gap-2.5 text-xs text-blue-950 font-semibold shadow-2xs">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse shrink-0"></span>
            <div className="flex-1 leading-snug">
              <strong>Mode Bantuan Antar-PPIC:</strong> Anda sedang login sebagai <strong>{currentUser?.name}</strong> untuk membantu input item di Box #{box.boxNumber} (Milik PPIC <strong>{box.picName}</strong>). Stok fisik masuk ke Box {box.picName}, dan credit input harian tercatat atas nama <strong>{currentUser?.name}</strong>.
            </div>
          </div>
        )}

        {/* Read-Only Notice when viewing another PPIC's box */}
        {!isOwner && (
          <div className="bg-amber-50/90 border-b border-amber-200/90 px-5 py-2.5 flex items-center gap-2.5 text-xs text-amber-900 font-semibold shadow-2xs">
            <Lock className="w-4 h-4 text-amber-600 shrink-0" />
            <div className="flex-1 leading-snug">
              <strong>Mode Baca Saja (Terkunci):</strong> Box #{box.boxNumber} dialokasikan untuk PPIC <strong>{box.picName}</strong>. Anda sedang login sebagai <strong>{currentUser?.name}</strong>, sehingga tidak dapat menambah, mengubah, memindahkan, atau menghapus data di box ini.
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          
          {/* Action Row */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center flex-wrap gap-2.5">
              <div className="flex items-center space-x-2">
                <h3 className="text-[15px] font-semibold text-[#1d1d1f] tracking-tight">
                  Daftar Barang
                </h3>
                <span className="bg-[#1d1d1f] text-white text-[11px] px-2.5 py-0.5 rounded-full font-medium tabular-nums">
                  {itemsInBox.length}
                </span>
              </div>

              {/* Quick Search in Box */}
              {itemsInBox.length > 2 && (
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-[#86868b] absolute left-3 top-2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari kode / style / size..."
                    className="pl-8 pr-3 py-1.5 bg-[#f5f5f7] border border-black/[0.08] rounded-full text-xs text-[#1d1d1f] placeholder:text-[#86868b] w-48 focus:outline-hidden focus:ring-2 focus:ring-[#0071e3]/20 focus:bg-white transition"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center flex-wrap gap-2">
              
              {/* Print Selected or All Cards */}
              {itemsInBox.length > 0 && (
                <button
                  onClick={() => {
                    if (selectedItemIds.size > 0) {
                      setCardPrintItems(itemsInBox.filter(i => selectedItemIds.has(i.id)));
                    } else {
                      setCardPrintItems(itemsInBox);
                    }
                  }}
                  className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition cursor-pointer ${
                    selectedItemIds.size > 0
                      ? 'bg-[#0071e3] hover:bg-[#0077ed] text-white shadow-xs'
                      : 'bg-white hover:bg-[#f5f5f7] text-[#1d1d1f] border border-black/[0.08] shadow-2xs'
                  }`}
                  title="Cetak Kartu Fisik Item"
                >
                  <Printer className="w-3.5 h-3.5 text-[#ff9500]" />
                  <span>
                    {selectedItemIds.size > 0
                      ? `Cetak Terpilih (${selectedItemIds.size})`
                      : `Cetak Semua Kartu (${itemsInBox.length})`}
                  </span>
                </button>
              )}

              {/* Print List Sample (Manifest Lembar A4) */}
              {itemsInBox.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowSampleListPrintModal(true)}
                  className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium bg-white hover:bg-[#f5f5f7] text-[#1d1d1f] border border-black/[0.08] shadow-2xs transition cursor-pointer"
                  title="Cetak Lembar Daftar / Manifest Sample Box (Format A4)"
                >
                  <FileText className="w-3.5 h-3.5 text-[#0071e3]" />
                  <span>
                    {selectedItemIds.size > 0
                      ? `Print List Terpilih (${selectedItemIds.size})`
                      : `Print List Sample (${itemsInBox.length})`}
                  </span>
                </button>
              )}

              {/* Bulk Dispatch: Add to Cart (Marketplace Model) */}
              {selectedItemIds.size > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const selected = itemsInBox.filter(i => selectedItemIds.has(i.id));
                    addMultipleToDispatchCart(selected);
                  }}
                  className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-[#ff2d55] hover:bg-[#e02447] text-white rounded-full text-xs font-medium shadow-xs transition cursor-pointer"
                  title="Masukkan semua item yang dicentang ke Keranjang Pengiriman"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>+ Keranjang Kirim ({selectedItemIds.size})</span>
                </button>
              )}

              {/* Bulk Dispatch Items Direct */}
              {selectedItemIds.size > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setDispatchPreselectedItems(itemsInBox.filter(i => selectedItemIds.has(i.id)));
                    setDispatchModalItem(null);
                  }}
                  className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-full text-xs font-medium shadow-xs transition cursor-pointer"
                  title="Kirim semua item yang dicentang ke luar"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Kirim Terpilih ({selectedItemIds.size})</span>
                </button>
              )}

              {/* Bulk Move Items to another Box (Only Box Manager) */}
              {isBoxManager && selectedItemIds.size > 0 && (
                <button
                  onClick={() => openMoveModal(itemsInBox.filter(i => selectedItemIds.has(i.id)))}
                  className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-[#ff9500] hover:bg-[#f08c00] text-white rounded-full text-xs font-medium shadow-xs transition cursor-pointer"
                  title="Pindahkan semua item yang dicentang ke Box lain"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>Pindah Box ({selectedItemIds.size})</span>
                </button>
              )}

              {/* Bulk Copy Info */}
              {selectedItemIds.size > 0 && (
                <button
                  type="button"
                  onClick={handleCopySelectedInfo}
                  className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-[#f5f5f7] hover:bg-[#ebebee] text-[#1d1d1f] rounded-full text-xs font-medium border border-black/[0.06] transition cursor-pointer"
                  title="Salin ringkasan data item yang dicentang ke clipboard"
                >
                  <Copy className="w-3.5 h-3.5 text-[#0071e3]" />
                  <span>Copy Data ({selectedItemIds.size})</span>
                </button>
              )}

              {/* Bulk Delete Items (Only Box Manager) */}
              {isBoxManager && selectedItemIds.size > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setDeleteError(null);
                    setItemToDelete(itemsInBox.filter(i => selectedItemIds.has(i.id)));
                  }}
                  className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-[#ff3b30]/10 hover:bg-[#ff3b30]/20 text-[#ff3b30] border border-[#ff3b30]/20 rounded-full text-xs font-medium transition cursor-pointer"
                  title="Hapus semua item yang dicentang dari box ini"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Terpilih ({selectedItemIds.size})</span>
                </button>
              )}

              {isOwner ? (
                <>
                  <button
                    type="button"
                    onClick={() => setIsAiScannerOpen(true)}
                    className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-gradient-to-r from-[#0071e3] to-[#5ac8fa] hover:brightness-110 text-white rounded-full text-xs font-semibold shadow-xs transition cursor-pointer"
                    title="Pindai Kartu / Tag Sampel dengan Gemini AI"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Scan Tag AI</span>
                  </button>

                  <button
                    onClick={() => setItemModalConfig({ isOpen: true, item: null, targetBoxNumber: box.boxNumber })}
                    className="flex items-center space-x-1.5 px-4 py-1.5 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-full text-xs font-medium shadow-xs transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isCrossPpic ? 'Bantu Input Item' : 'Tambah Item'}</span>
                  </button>
                </>
              ) : (
                <span
                  className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-[#f5f5f7] text-[#86868b] rounded-full text-xs font-medium border border-black/[0.06] cursor-not-allowed"
                  title={`Terkunci: Box #${box.boxNumber} adalah milik PPIC ${box.picName}. Satu user tidak dapat mengedit data user lain.`}
                >
                  <Lock className="w-3.5 h-3.5 text-[#86868b]" />
                  <span>Terkunci ({box.picName})</span>
                </span>
              )}
            </div>
          </div>

          {/* Items Content */}
          {itemsInBox.length === 0 ? (
            <div className="text-center py-12 px-4 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              <Boxes className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">Box ini masih kosong</p>
              <p className="text-xs text-slate-500 mt-0.5">Belum ada sample atau material yang dicatat ke Box #{box.boxNumber}.</p>
              {isOwner ? (
                <button
                  onClick={() => setItemModalConfig({ isOpen: true, item: null, targetBoxNumber: box.boxNumber })}
                  className="mt-3 inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isCrossPpic ? 'Bantu Catat Item Pertama' : 'Catat Item Pertama'}</span>
                </button>
              ) : (
                <span className="mt-3 inline-flex items-center gap-1.5 text-xs text-slate-400 font-semibold bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                  <Lock className="w-3.5 h-3.5" /> Hanya PPIC {box.picName} yang dapat menambah item ke box ini
                </span>
              )}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-8 px-4 border border-slate-200 rounded-xl bg-slate-50 text-slate-500 text-xs">
              <p className="font-semibold text-slate-700">Tidak ada item yang sesuai pencarian "{searchQuery}"</p>
              <button
                onClick={() => setSearchQuery('')}
                className="mt-2 text-blue-600 hover:underline font-bold"
              >
                Hapus Pencarian
              </button>
            </div>
          ) : (
            <>
              {/* Mobile Card List View (< sm screens) */}
              <div className="sm:hidden space-y-2.5 max-h-[66dvh] overflow-y-auto pr-0.5">
                <div className="flex items-center justify-between px-1 py-1 bg-slate-100 rounded-lg text-xs font-semibold text-slate-700">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={selectedItemIds.size === itemsInBox.length && itemsInBox.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-slate-300 text-blue-600 focus:ring-0 w-4 h-4 cursor-pointer"
                    />
                    <span>Pilih Semua ({itemsInBox.length})</span>
                  </label>
                  <span className="text-[11px] text-slate-500">{selectedItemIds.size} terpilih</span>
                </div>

                {sortedItems.map((item) => {
                  const isSelected = selectedItemIds.has(item.id);
                  const inputter = resolveItemInputter(item, box);
                  const isOwnerInput = String(inputter.name).toLowerCase() === String(box.picName || '').toLowerCase();

                  return (
                    <div
                      key={`mob-item-${item.id}`}
                      className={`p-3 rounded-2xl border transition-all ${
                        isSelected 
                          ? 'bg-blue-50/80 border-blue-300 ring-1 ring-blue-400' 
                          : 'bg-white border-black/[0.08] shadow-2xs'
                      }`}
                    >
                      {/* Header Card: Checkbox + Kode + Jenis + Status */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleItemSelect(item.id)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-0 w-4 h-4 cursor-pointer shrink-0"
                          />
                          <button
                            type="button"
                            onClick={(e) => handleCopyCode(e, item.kode || item.sku, item.id)}
                            className="font-mono font-bold text-slate-900 bg-slate-100 active:bg-blue-100 px-2 py-0.5 rounded-md border border-slate-200 text-xs flex items-center gap-1 shrink-0"
                            title="Salin Kode"
                          >
                            <span>{item.kode || item.sku || '-'}</span>
                            {copiedId === item.id ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3 text-slate-400" />
                            )}
                          </button>
                          {item.jenisSample && (
                            <span className="text-[10px] font-black uppercase px-1.5 py-0.5 bg-amber-400 text-slate-950 rounded shrink-0">
                              {item.jenisSample}
                            </span>
                          )}
                          {item.buyerNo && item.buyerNo !== '-' && item.buyerNo !== 'NA' && (
                            <span className="text-xs text-slate-500 font-mono truncate">
                              ({item.buyerNo})
                            </span>
                          )}
                        </div>
                        <div className="shrink-0">
                          {getStatusBadge(item.status)}
                        </div>
                      </div>

                      {/* Style & Deskripsi */}
                      <div className="mb-2">
                        <h4 className="font-bold text-slate-900 text-xs sm:text-sm leading-snug">
                          {item.style || item.deskripsi || item.name}
                        </h4>
                        {item.sampleNo && item.sampleNo !== '' && (
                          <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                            Sample No: <strong className="text-slate-800">{item.sampleNo}</strong>
                          </p>
                        )}
                      </div>

                      {/* Info Chips: Size, Warna, Qty, Penginput */}
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] mb-2.5">
                        {item.size && (
                          <span className="font-bold text-slate-800 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-[10px] uppercase">
                            Size: {item.size}
                          </span>
                        )}
                        {item.color && item.color !== '-' && item.color !== 'NA' && (
                          <span className="text-slate-700 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-[10px] font-medium">
                            {item.color}
                          </span>
                        )}
                        <span className="font-mono font-bold text-slate-900 bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded text-[10px]">
                          {item.jumlah !== undefined && item.jumlah !== null ? item.jumlah : item.qty}{' '}
                          {String(item.satuan || item.unit || 'PCE').toUpperCase() === 'PCS' ? 'PCE' : (item.satuan || item.unit || 'PCE')}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border truncate ${inputter.badgeClass}`}>
                          <User className="w-2.5 h-2.5" />
                          <span>{inputter.name}</span>
                          {!isOwnerInput && <span className="opacity-70">(bantu)</span>}
                        </span>
                      </div>

                      {/* Action Bar Mobile */}
                      <div className="flex items-center justify-between pt-2 border-t border-black/[0.06] gap-1">
                        <div className="flex items-center gap-1 flex-wrap">
                          {canEditItem(item) && (
                            <button
                              type="button"
                              onClick={() => setItemModalConfig({ isOpen: true, item, targetBoxNumber: box.boxNumber })}
                              className="px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                          )}
                          {isOwner && (
                            <button
                              type="button"
                              onClick={() => handleDuplicateItem(item)}
                              className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition"
                              title="Duplikat"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setCardPrintItems([item])}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Cetak Kartu Fisik"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          {isOwner && (
                            <button
                              type="button"
                              onClick={() => addToDispatchCart(item, 1)}
                              className={`p-1.5 rounded-lg transition ${
                                isItemInDispatchCart(item.id) ? 'text-rose-600 bg-rose-100 font-bold' : 'text-slate-500 hover:bg-slate-100'
                              }`}
                              title="Keranjang Kirim"
                            >
                              <ShoppingCart className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {isOwner && (
                            <button
                              type="button"
                              onClick={() => {
                                setDispatchModalItem(item);
                                setDispatchPreselectedItems([]);
                              }}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              title="Kirim Keluar"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {isOwner && (
                            <button
                              type="button"
                              onClick={() => {
                                const newStatus = item.status === 'In Storage' ? 'Borrowed' : 'In Storage';
                                updateItem(item.id, { status: newStatus });
                              }}
                              className={`px-2 py-1 text-[11px] font-bold rounded-lg border transition ${
                                item.status === 'In Storage'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}
                            >
                              {item.status === 'In Storage' ? 'Pinjam' : 'Kembali'}
                            </button>
                          )}
                          {canEditItem(item) && !isHelperUser && (
                            <button
                              type="button"
                              onClick={() => {
                                setDeleteError(null);
                                setItemToDelete(item);
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition"
                              title="Hapus"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop & Tablet Table View (hidden on mobile, block on >= sm) */}
              <div className="hidden sm:block border border-slate-200 rounded-xl overflow-hidden shadow-2xs bg-white w-full">
                <div className="overflow-x-auto overflow-y-auto max-h-[66vh] scrollbar-thin w-full">
                  <table className="w-full min-w-[700px] table-fixed text-left border-collapse text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-xs tracking-wider sticky top-0 z-10 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-2 w-9 text-center">
                          <input
                            type="checkbox"
                            checked={selectedItemIds.size === itemsInBox.length && itemsInBox.length > 0}
                            onChange={handleSelectAll}
                            className="rounded border-slate-300 text-blue-600 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                            title="Pilih / Batal Pilih Semua"
                          />
                        </th>
                        <th className="py-2.5 px-2.5 w-[17%]">Kode / Sample</th>
                        <th className="py-2.5 px-2.5 w-[26%]">Style &amp; Deskripsi</th>
                        <th className="py-2.5 px-2 w-[13%]">Size &amp; Warna</th>
                        <th className="py-2.5 px-1.5 text-center w-[7%]">Jumlah</th>
                        <th className="py-2.5 px-1.5 text-center w-[12%]">Penginput</th>
                        <th className="py-2.5 px-1 text-center w-[10%]">Status</th>
                        <th className="py-2.5 px-2 text-right w-[15%]">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sortedItems.map((item, idx) => {
                        const isSelected = selectedItemIds.has(item.id);
                        return (
                          <tr
                            key={item.id}
                            className={`transition hover:bg-blue-50/60 ${
                              isSelected 
                                ? 'bg-blue-50/80 font-medium' 
                                : (idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40')
                            }`}
                          >
                            {/* Checkbox */}
                            <td className="py-2 px-2 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleItemSelect(item.id)}
                                className="rounded border-slate-300 text-blue-600 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                                title="Centang untuk cetak kartu"
                              />
                            </td>

                            {/* Kode, Jenis Sample & Buyer (Dengan Fitur Copy) */}
                            <td className="py-2 px-2.5 min-w-0">
                              <div className="flex items-center space-x-1 min-w-0">
                                <button
                                  type="button"
                                  onClick={(e) => handleCopyCode(e, item.kode || item.sku, item.id)}
                                  className="font-mono font-bold text-slate-900 bg-slate-100 hover:bg-blue-100 hover:text-blue-700 hover:border-blue-300 px-1.5 py-0.5 rounded-md border border-slate-200 text-xs flex items-center gap-1 transition cursor-pointer shadow-2xs shrink-0"
                                  title="Klik untuk Salin Kode ke Clipboard"
                                >
                                  <span>{item.kode || item.sku || '-'}</span>
                                  {copiedId === item.id ? (
                                    <Check className="w-3 h-3 text-emerald-600 animate-pulse" />
                                  ) : (
                                    <Copy className="w-3 h-3 text-slate-400 group-hover/code:text-blue-600 transition" />
                                  )}
                                </button>
                                {item.jenisSample && (
                                  <span className="text-xs font-black uppercase px-1 py-0.5 bg-amber-400 text-slate-950 rounded shrink-0">
                                    {item.jenisSample}
                                  </span>
                                )}
                                {item.buyerNo && item.buyerNo !== '-' && item.buyerNo !== 'NA' && (
                                  <span className="text-xs text-slate-500 font-mono truncate" title={`Buyer: ${item.buyerNo}`}>
                                    ({item.buyerNo})
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Style & Deskripsi */}
                            <td className="py-2 px-2.5 min-w-0">
                              <div className="font-bold text-slate-900 text-xs truncate" title={item.style || item.deskripsi || item.name}>
                                {item.style || item.deskripsi || item.name}
                              </div>
                              {item.sampleNo && item.sampleNo !== '' && (
                                <div className="text-xs text-slate-500 font-mono truncate" title={`Sample No: ${item.sampleNo}`}>
                                  Sample No: <strong>{item.sampleNo}</strong>
                                </div>
                              )}
                            </td>

                            {/* Size & Warna */}
                            <td className="py-2 px-2 min-w-0">
                              <div className="flex items-center space-x-1 text-xs truncate">
                                {item.size ? (
                                  <span className="font-black text-slate-800 bg-slate-100 border border-slate-300 px-1 py-0.5 rounded text-xs uppercase shrink-0">
                                    {item.size}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-xs">-</span>
                                )}
                                {item.color && item.color !== '-' && item.color !== 'NA' && (
                                  <span className="text-slate-700 text-xs font-medium truncate" title={`Color: ${item.color}`}>
                                    {item.color}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Qty & Satuan */}
                            <td className="py-2 px-1.5 text-center font-mono font-black text-slate-900 text-xs">
                              {item.jumlah !== undefined && item.jumlah !== null ? item.jumlah : item.qty}{' '}
                              <span className="text-xs font-normal text-slate-500 uppercase">
                                {String(item.satuan || item.unit || 'PCE').toUpperCase() === 'PCS' ? 'PCE' : (item.satuan || item.unit || 'PCE')}
                              </span>
                            </td>

                            {/* Penginput */}
                            <td className="py-2 px-1.5 text-center min-w-0">
                              {(() => {
                                const inputter = resolveItemInputter(item, box);
                                const isOwnerInput = String(inputter.name).toLowerCase() === String(box.picName || '').toLowerCase();
                                return (
                                  <div className="flex flex-col items-center justify-center min-w-0">
                                    <span
                                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border truncate max-w-full shadow-2xs ${inputter.badgeClass}`}
                                      title={`Diinput oleh: ${inputter.name} (${inputter.role})${!isOwnerInput ? ` • Bantuan untuk PPIC ${box.picName}` : ''}`}
                                    >
                                      <User className="w-3 h-3 shrink-0" />
                                      <span className="truncate">{inputter.name}</span>
                                    </span>
                                    {!isOwnerInput && (
                                      <span className="text-[10px] text-slate-400 font-semibold tracking-tight leading-none mt-0.5 truncate" title={`Bantuan input untuk ${box.picName}`}>
                                        bantu {box.picName}
                                      </span>
                                    )}
                                  </div>
                                );
                              })()}
                            </td>

                            {/* Status */}
                            <td className="py-2 px-1 text-center">
                              {getStatusBadge(item.status)}
                            </td>

                            {/* Actions */}
                            <td className="py-2 px-2 text-right">
                              <div className="flex items-center justify-end space-x-0.5">
                                {isOwner && (
                                  <button
                                    type="button"
                                    onClick={() => handleDuplicateItem(item)}
                                    className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition cursor-pointer"
                                    title="Copy / Duplikat Item (Buat item baru)"
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setCardPrintItems([item])}
                                  className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition cursor-pointer"
                                  title="Cetak Kartu Fisik Item Ini"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </button>
                                {isOwner && (
                                  <button
                                    type="button"
                                    onClick={() => addToDispatchCart(item, 1)}
                                    className={`p-1 rounded transition cursor-pointer flex items-center gap-1 ${
                                      isItemInDispatchCart(item.id)
                                        ? 'text-rose-600 bg-rose-100/90 font-black'
                                        : 'text-slate-500 hover:text-rose-600 hover:bg-rose-50'
                                    }`}
                                    title={isItemInDispatchCart(item.id) ? "Sudah di Keranjang (Klik untuk tambah)" : "Masukkan ke Keranjang Pengiriman (Model Marketplace)"}
                                  >
                                    <ShoppingCart className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {isOwner && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setDispatchModalItem(item);
                                      setDispatchPreselectedItems([]);
                                    }}
                                    className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition cursor-pointer"
                                    title="Kirim Keluar (Buyer / ANZO QC / ANZO TW / ANZO QC CHINA / RDTW / RDC)"
                                  >
                                    <Send className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {isOwner && (
                                  <button
                                    type="button"
                                    onClick={() => openMoveModal([item])}
                                    className="p-1 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded transition cursor-pointer"
                                    title="Pindah ke Box Lain"
                                  >
                                    <ArrowRightLeft className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {isOwner && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newStatus = item.status === 'In Storage' ? 'Borrowed' : 'In Storage';
                                      updateItem(item.id, { status: newStatus });
                                    }}
                                    className={`px-1.5 py-0.5 text-xs font-black rounded transition cursor-pointer ${
                                      item.status === 'In Storage'
                                        ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                    }`}
                                    title="Ganti Status Simpan / Pinjam"
                                  >
                                    {item.status === 'In Storage' ? 'Pinjam' : 'Kembali'}
                                  </button>
                                )}
                                {canEditItem(item) ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => setItemModalConfig({ isOpen: true, item, targetBoxNumber: box.boxNumber })}
                                      className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition cursor-pointer"
                                      title="Edit Item"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                    {!isHelperUser && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setDeleteError(null);
                                          setItemToDelete(item);
                                        }}
                                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                        title="Hapus Item"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </>
                                ) : (
                                  <span
                                    className="p-1 text-slate-400 inline-flex items-center"
                                    title={`Terkunci: Data item ini milik ${box.picName}`}
                                  >
                                    <Lock className="w-3 h-3 text-slate-400" />
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

      </div>

      {/* Box Label Print Modal Preview */}
      {showBoxLabelModal && (
        <div className="fixed inset-0 z-60 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 print:p-0 print:bg-transparent print:block">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-lg w-full max-h-[92vh] overflow-y-auto flex flex-col items-center animate-fade-in print:p-0 print:max-w-none print:max-h-none print:shadow-none print:rounded-none print:w-full">
            <div className="no-print w-full flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
              <h3 className="font-black text-slate-900 text-sm">Preview Label Box #{box.boxNumber}</h3>
              <button onClick={() => setShowBoxLabelModal(false)} className="text-slate-500 hover:text-slate-900 p-1.5 rounded-lg hover:bg-slate-200 transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Exact Box Label Component */}
            <div className="my-2">
              <BoxLabel box={box} isPrintMode={true} />
            </div>

            {/* Print & Close Buttons */}
            <div className="no-print w-full flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
              <button
                onClick={() => setShowBoxLabelModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Tutup
              </button>
              <button
                onClick={() => window.print()}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-md"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Label Ini</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Physical Inventory Cards Modal */}
      {cardPrintItems && (
        <CardPrintModal 
          itemsToPrint={cardPrintItems} 
          onClose={() => setCardPrintItems(null)} 
        />
      )}

      {/* Printable Sample List Manifest Modal */}
      {showSampleListPrintModal && (
        <SampleListPrintModal
          box={box}
          items={selectedItemIds.size > 0 ? itemsInBox.filter(i => selectedItemIds.has(i.id)) : itemsInBox}
          onClose={() => setShowSampleListPrintModal(false)}
        />
      )}

      {/* Quick Move Item(s) to Another Box Modal */}
      {movingItems && (
        <div className="fixed inset-0 z-[70] bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in no-print">
          <div className="bg-white rounded-[22px] shadow-[0_24px_50px_rgba(0,0,0,0.18)] border border-black/[0.08] max-w-md w-full overflow-hidden flex flex-col font-apple animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-3.5 bg-[#fbfbfd] border-b border-black/[0.06] flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-full bg-[#ff9500]/15 text-[#ff9500] flex items-center justify-center">
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                </div>
                <h3 className="font-semibold text-[#1d1d1f] text-[15px] tracking-tight">
                  Pindah Box ({movingItems.length} Item)
                </h3>
              </div>
              <button
                onClick={() => setMovingItems(null)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f5f5f7] hover:bg-[#e8e8ed] text-[#86868b] hover:text-[#1d1d1f] transition-colors cursor-pointer"
                aria-label="Tutup"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* Item preview list */}
              <div>
                <span className="block font-medium text-[#86868b] mb-1.5">Item yang akan dipindahkan:</span>
                <div className="max-h-36 overflow-y-auto space-y-1 bg-[#f5f5f7] border border-black/[0.05] rounded-xl p-2.5">
                  {movingItems.map((it) => (
                    <div key={it.id} className="flex items-center justify-between text-xs font-medium text-[#1d1d1f] py-0.5">
                      <span className="font-mono bg-white px-1.5 py-0.5 rounded-md border border-black/[0.08] text-[11px]">
                        {it.kode || it.sku || '-'}
                      </span>
                      <span className="truncate max-w-[190px] text-[#1d1d1f] ml-2">
                        {it.style || it.deskripsi || it.name}
                      </span>
                      <span className="text-[#86868b] ml-auto whitespace-nowrap text-xs tabular-nums">
                        {it.jumlah || it.qty} {String(it.satuan || it.unit || 'PCE').toUpperCase() === 'PCS' ? 'PCE' : (it.satuan || it.unit || 'PCE')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Destination Box Picker */}
              <div>
                <label className="block font-medium text-[#1d1d1f] mb-1.5">
                  Nomor Box Tujuan (saat ini di Box #{box.boxNumber}):
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 border border-black/[0.08] rounded-xl px-3 py-2 bg-[#f5f5f7] flex-1 focus-within:bg-white focus-within:border-[#0071e3] focus-within:ring-4 focus-within:ring-[#0071e3]/15 transition">
                    <span className="font-semibold text-[#86868b] text-xs">BOX #</span>
                    <input
                      type="number"
                      min="1"
                      max="72"
                      value={targetBoxNum}
                      onChange={(e) => setTargetBoxNum(Math.max(1, Math.min(72, Number(e.target.value) || 1)))}
                      className="w-16 font-mono font-semibold text-sm text-[#1d1d1f] focus:outline-hidden bg-transparent"
                    />
                    {(() => {
                      const dest = boxes.find(b => Number(b.boxNumber) === Number(targetBoxNum));
                      return dest ? (
                        <span className="text-[11px] font-medium text-[#0071e3] bg-[#0071e3]/10 px-2 py-0.5 rounded-full border border-[#0071e3]/20 ml-auto truncate">
                          {dest.rackName || 'LANTAI'} • {dest.picName || 'Royan'}
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-[#ff3b30] ml-auto">Box #{targetBoxNum}</span>
                      );
                    })()}
                  </div>
                </div>

                {/* Quick Box Chips */}
                <div className="flex items-center gap-1 mt-2.5 flex-wrap text-xs">
                  <span className="text-[#86868b] font-medium mr-0.5">Pilihan Box:</span>
                  {boxes
                    .filter(b => Number(b.boxNumber) !== Number(box.boxNumber) && Number(b.boxNumber) <= 72)
                    .slice(0, 10)
                    .map(b => (
                      <button
                        key={b.boxNumber}
                        type="button"
                        onClick={() => setTargetBoxNum(b.boxNumber)}
                        className={`px-2 py-0.5 rounded-full font-medium text-xs transition cursor-pointer ${
                          targetBoxNum === b.boxNumber
                            ? 'bg-[#0071e3] text-white shadow-xs'
                            : 'bg-[#f5f5f7] hover:bg-[#ebebee] text-[#1d1d1f] border border-black/[0.06]'
                        }`}
                      >
                        #{b.boxNumber}
                      </button>
                    ))}
                </div>
              </div>

              {moveError && (
                <div className="p-2.5 rounded-xl bg-[#ff3b30]/8 border border-[#ff3b30]/20 text-[#ff3b30] font-medium text-xs flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-[#ff3b30] shrink-0" />
                  <span>{moveError}</span>
                </div>
              )}

              <div className="pt-3 border-t border-black/[0.06] flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setMovingItems(null)}
                  disabled={isMoving}
                  className="px-4 py-2 rounded-xl text-[#1d1d1f] font-medium text-xs bg-[#f5f5f7] hover:bg-[#ebebee] border border-black/[0.06] transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmMove}
                  disabled={isMoving}
                  className="px-5 py-2 bg-[#0071e3] hover:bg-[#0077ed] text-white font-medium text-xs rounded-xl shadow-xs transition flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>{isMoving ? 'Memindahkan...' : 'Pindahkan Sekarang'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Item Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-[75] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in no-print">
          <div className="bg-white rounded-[22px] shadow-[0_24px_50px_rgba(0,0,0,0.18)] border border-black/[0.08] max-w-sm w-full overflow-hidden flex flex-col font-apple animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 text-center">
              <div className="w-11 h-11 rounded-full bg-[#ff3b30]/10 text-[#ff3b30] flex items-center justify-center mx-auto mb-3">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-[16px] font-semibold text-[#1d1d1f] tracking-tight">
                {Array.isArray(itemToDelete) ? `Hapus ${itemToDelete.length} Item?` : 'Hapus Item Ini?'}
              </h3>
              <p className="text-xs text-[#86868b] mt-1.5 leading-relaxed">
                {Array.isArray(itemToDelete) ? (
                  <span>
                    Item yang Anda centang akan dikeluarkan secara permanen dari <strong className="text-[#1d1d1f]">Box #{box.boxNumber}</strong>.
                  </span>
                ) : (
                  <span>
                    Yakin ingin menghapus <strong className="text-[#1d1d1f]">"{itemToDelete.name || itemToDelete.style || itemToDelete.kode}"</strong> dari <strong className="text-[#1d1d1f]">Box #{box.boxNumber}</strong>?
                  </span>
                )}
              </p>

              {deleteError && (
                <div className="mt-3 p-2 rounded-xl bg-[#ff3b30]/8 border border-[#ff3b30]/20 text-[#ff3b30] text-xs font-medium">
                  {deleteError}
                </div>
              )}

              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => { setItemToDelete(null); setDeleteError(null); }}
                  className="flex-1 py-2.5 rounded-xl bg-[#f5f5f7] hover:bg-[#ebebee] text-[#1d1d1f] font-medium text-xs border border-black/[0.06] transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleConfirmDelete}
                  className="flex-1 py-2.5 rounded-xl bg-[#ff3b30] hover:bg-[#e03026] text-white font-medium text-xs transition shadow-xs cursor-pointer disabled:opacity-50 flex items-center justify-center space-x-1"
                >
                  {isDeleting ? <span>Menghapus...</span> : <span>Ya, Hapus</span>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Outgoing Dispatch Modal (Buyer, Anzo, RDTW, RDC, ANZOTW) */}
      {Boolean(dispatchModalItem || dispatchPreselectedItems.length > 0) && (
        <DispatchModal
          isOpen={Boolean(dispatchModalItem || dispatchPreselectedItems.length > 0)}
          onClose={() => {
            setDispatchModalItem(null);
            setDispatchPreselectedItems([]);
          }}
          item={dispatchModalItem}
          preselectedItems={dispatchPreselectedItems}
        />
      )}

      {/* AI Tag Scanner Modal */}
      <AiTagScannerModal
        isOpen={isAiScannerOpen}
        onClose={() => setIsAiScannerOpen(false)}
        targetBoxNumber={box.boxNumber}
        onApplyToForm={(extracted) => {
          setItemModalConfig({
            isOpen: true,
            item: null,
            targetBoxNumber: box.boxNumber,
            prefill: extracted,
          });
        }}
        onDirectSave={handleDirectSaveAiData}
      />

      {/* Modal Edit Kepemilikan Box (PIC Transfer) */}
      {isEditPicModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-black/[0.08] relative">
            <button
              type="button"
              onClick={() => {
                setIsEditPicModalOpen(false);
                setReassignError(null);
              }}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-black/[0.05] text-[#86868b] hover:text-[#1d1d1f] transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[#0071e3]/10 text-[#0071e3] flex items-center justify-center shrink-0">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-[#1d1d1f]">Edit Kepemilikan Box #{box.boxNumber}</h3>
                <p className="text-xs text-[#86868b]">Alihkan box dan seluruh isinya ke anggota PPIC lain</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#f5f5f7] border border-black/[0.06] mb-4 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[#86868b]">PIC Saat Ini:</span>
                <span className="font-semibold text-[#1d1d1f]">#{box.ppicNumber} {box.picName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#86868b]">Lokasi Rak:</span>
                <span className="font-semibold text-[#1d1d1f]">{box.rackName || `Rak ${box.rackId}`}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#86868b]">Jumlah Item:</span>
                <span className="font-semibold text-[#0071e3]">{itemsInBox.length} sample/material</span>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-[#1d1d1f] mb-1.5">
                Pilih PIC Baru:
              </label>
              <select
                value={selectedNewPic}
                onChange={(e) => setSelectedNewPic(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-white border border-black/[0.12] focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/20 text-xs font-medium text-[#1d1d1f] outline-hidden cursor-pointer"
              >
                <option value="">- Pilih Anggota PPIC -</option>
                {ppicMembers
                  ?.filter((p) => p.name.toLowerCase() !== String(box.picName || '').toLowerCase())
                  .map((p) => (
                    <option key={p.id} value={p.name}>
                      PPIC #{p.ppicNumber} - {p.name}
                    </option>
                  ))}
              </select>
              <p className="text-[11px] text-[#86868b] mt-1.5 leading-relaxed">
                Seluruh {itemsInBox.length} item di dalam Box #{box.boxNumber} akan otomatis diperbarui kepemilikannya ke PIC baru dan disinkronkan ke Cloud Supabase.
              </p>
            </div>

            {reassignError && (
              <div className="mb-4 p-2.5 rounded-xl bg-[#ff3b30]/10 border border-[#ff3b30]/20 text-[#ff3b30] text-xs font-medium">
                {reassignError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/[0.06]">
              <button
                type="button"
                disabled={isReassigningPic}
                onClick={() => {
                  setIsEditPicModalOpen(false);
                  setReassignError(null);
                }}
                className="px-4 py-2 rounded-xl bg-[#f5f5f7] hover:bg-[#ebebee] text-[#1d1d1f] text-xs font-semibold transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={!selectedNewPic || isReassigningPic}
                onClick={async () => {
                  if (!selectedNewPic) return;
                  setIsReassigningPic(true);
                  setReassignError(null);
                  try {
                    await reassignBoxOwnership(box.boxNumber, selectedNewPic, { syncItems: true });
                    setIsEditPicModalOpen(false);
                  } catch (err) {
                    setReassignError(err?.message || 'Gagal mengalihkan kepemilikan box.');
                  } finally {
                    setIsReassigningPic(false);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition cursor-pointer flex items-center gap-1.5"
              >
                {isReassigningPic ? (
                  <span>Menyimpan...</span>
                ) : (
                  <>
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Konfirmasi Alihkan</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
