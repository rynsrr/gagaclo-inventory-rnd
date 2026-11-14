import React, { useState } from 'react';
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
} from 'lucide-react';
import { BoxLabel } from './BoxLabel';
import { CardPrintModal } from './CardPrintModal';
import { SampleListPrintModal } from './SampleListPrintModal';
import { DispatchModal } from './DispatchModal';
import { getNextSampleCode, getNextMaterialCode } from '../utils/sequenceResolver';

export const BoxDetailModal = () => {
  const { selectedBoxNumber, getBoxDetails } = useInventory();
  const box = getBoxDetails(selectedBoxNumber);
  return box ? <BoxDetail key={box.boxNumber} box={box} /> : null;
};

function BoxDetail({ box }) {
  const {
    setSelectedBoxNumber,
    getItemsInBox,
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
  } = useInventory();
  const selectedBoxNumber = box.boxNumber;
  const itemsInBox = getItemsInBox(selectedBoxNumber);
  const isOwner = !currentUser || !box.picName || String(currentUser.name).trim().toLowerCase() === String(box.picName).trim().toLowerCase();
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
      `${idx + 1}. [${i.kode || i.sku || '-'}] ${i.style || i.deskripsi || i.name || 'Sample'} | Sample No: ${i.sampleNo || '-'} | Size: ${i.size || '-'} | Color: ${i.color || '-'} | Qty: ${i.jumlah || i.qty || 1} ${i.satuan || i.unit || 'PCS'}`
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
    if (!isOwner) {
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
    if (!isOwner) {
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

  const getStatusBadge = (status) => {
    switch (status) {
      case 'In Storage':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>Tersimpan</span>
          </span>
        );
      case 'Borrowed':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            <span>Dipinjam</span>
          </span>
        );
      case 'In Review':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
            <span>Review</span>
          </span>
        );
      default:
        return (
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-1 sm:p-3 overflow-y-auto animate-fade-in print:p-0 print:bg-transparent">
      <div className={`bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-[98vw] 2xl:max-w-[1780px] max-h-[96vh] flex flex-col overflow-hidden ${cardPrintItems || showBoxLabelModal || showSampleListPrintModal ? 'no-print' : ''}`}>
        
        {/* Header */}
        <div className="inventory-dialog-heading p-5 flex items-start justify-between border-b border-slate-800">
          <div className="flex items-start space-x-3.5 min-w-0 flex-1 mr-4">
            <div className="w-full">
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <h2 className="text-xl font-black tracking-tight">{box.code}</h2>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${
                  box.category === 'SAMPLE' ? 'bg-amber-400 text-slate-950' : 'bg-emerald-400 text-slate-950'
                }`}>
                  {box.category}
                </span>
                <span className="text-xs text-slate-300 font-medium px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                  {box.rackName}
                </span>
              </div>

              {/* Simple Description / Catatan Box Persis di Bawah Box */}
              <div className="mt-1.5 flex items-center gap-2 max-w-xl">
                {isOwner ? (
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
                      className="w-full text-xs text-slate-800 placeholder:text-slate-400 bg-white border border-slate-300 rounded-md px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs transition"
                      title="Klik untuk ubah catatan (Tekan Enter untuk simpan)"
                    />
                    <button
                      type="button"
                      onClick={handleSaveNotes}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-white hover:bg-slate-50 border border-slate-300 shadow-2xs shrink-0 px-2.5 py-1 rounded-md transition cursor-pointer"
                      title="Simpan Catatan"
                    >
                      {isSavingNotes ? '✓ Tersimpan' : 'Simpan'}
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic truncate" title={boxNotes || 'Tidak ada catatan'}>
                    {boxNotes ? `Catatan: ${boxNotes}` : 'Tidak ada catatan khusus'}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={toggleFullStatus}
              disabled={savingFullStatus || !isOwner}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold text-white transition ${
                !isOwner
                  ? 'bg-slate-500 opacity-60 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-500 disabled:opacity-50'
              }`}
              title={!isOwner ? `Terkunci: Box ini milik PIC ${box.picName}` : undefined}
            >
              {!isOwner && <Lock className="inline w-3 h-3 mr-1 -mt-0.5" />}
              {savingFullStatus ? 'Menyimpan…' : box.isFull ? 'Buka kembali box' : 'Tandai penuh'}
            </button>
            {fullStatusError && <span role="alert" className="text-xs text-red-700">{fullStatusError}</span>}
            <button
              type="button"
              onClick={() => setShowSampleListPrintModal(true)}
              className="flex items-center space-x-1.5 text-xs font-bold bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 px-3 py-1.5 rounded-lg shadow-2xs transition cursor-pointer"
              title="Cetak Lembar Daftar Sample Box (Format A4)"
            >
              <FileText className="w-4 h-4 text-blue-600" />
              <span>Print List Sample</span>
            </button>
            <button
              onClick={() => setShowBoxLabelModal(true)}
              className="flex items-center space-x-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 px-3 py-1.5 rounded-lg shadow-sm transition"
              title="Cetak Label Stiker Box (Desain Resmi)"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Label Box</span>
            </button>
            <button
              onClick={() => setSelectedBoxNumber(null)}
              aria-label="Tutup detail box"
              className="text-slate-500 hover:text-slate-900 p-1.5 rounded-lg hover:bg-slate-200 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PIC & Quick Stats Bar */}
        <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-3">
            <span className="text-slate-500 font-medium">PIC</span>
            <div className="flex items-center space-x-2 bg-white px-3 py-1 rounded-lg border border-slate-200 shadow-2xs font-semibold text-slate-800">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
              <span>#{box.ppicNumber} {box.picName}</span>
            </div>
          </div>

          <div className="flex items-center space-x-4 text-slate-600">
            <div>
              Total: <strong className="text-slate-900 font-bold">{itemsInBox.reduce((sum, i) => sum + (Number(i.qty) || 0), 0)} unit</strong>
            </div>
          </div>
        </div>

        {/* Read-Only Notice when viewing another PIC's box */}
        {!isOwner && (
          <div className="bg-amber-50/90 border-b border-amber-200/90 px-5 py-2.5 flex items-center gap-2.5 text-xs text-amber-900 font-semibold shadow-2xs">
            <Lock className="w-4 h-4 text-amber-600 shrink-0" />
            <div className="flex-1 leading-snug">
              <strong>Mode Baca Saja (Terkunci):</strong> Box #{box.boxNumber} dialokasikan untuk PIC <strong>{box.picName}</strong>. Anda sedang login sebagai <strong>{currentUser?.name}</strong>, sehingga tidak dapat menambah, mengubah, memindahkan, atau menghapus data di box ini.
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          
          {/* Action Row */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center flex-wrap gap-2.5">
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                  Daftar Barang
                </h3>
                <span className="bg-slate-900 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                  {itemsInBox.length}
                </span>
              </div>

              {/* Quick Search in Box */}
              {itemsInBox.length > 2 && (
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari kode / style / size..."
                    className="pl-8 pr-2.5 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs w-44 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition"
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
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold shadow-xs transition cursor-pointer ${
                    selectedItemIds.size > 0
                      ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20'
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                  title="Cetak Kartu Fisik Item"
                >
                  <Printer className="w-3.5 h-3.5 text-amber-400" />
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
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 shadow-2xs transition cursor-pointer"
                  title="Cetak Lembar Daftar / Manifest Sample Box (Format A4)"
                >
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  <span>
                    {selectedItemIds.size > 0
                      ? `Print List Terpilih (${selectedItemIds.size})`
                      : `Print List Sample (${itemsInBox.length})`}
                  </span>
                </button>
              )}

              {/* Bulk Dispatch Items (Buyer, Anzo, RDTW, RDC, ANZOTW) */}
              {selectedItemIds.size > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setDispatchPreselectedItems(itemsInBox.filter(i => selectedItemIds.has(i.id)));
                    setDispatchModalItem(null);
                  }}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-xs transition cursor-pointer"
                  title="Kirim semua item yang dicentang ke luar (Buyer / Anzo / RDTW / RDC / ANZOTW)"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Kirim Terpilih ({selectedItemIds.size})</span>
                </button>
              )}

              {/* Bulk Move Items to another Box (Only Owner) */}
              {isOwner && selectedItemIds.size > 0 && (
                <button
                  onClick={() => openMoveModal(itemsInBox.filter(i => selectedItemIds.has(i.id)))}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-black shadow-xs transition cursor-pointer"
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
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold border border-slate-300 shadow-2xs transition cursor-pointer"
                  title="Salin ringkasan data item yang dicentang ke clipboard"
                >
                  <Copy className="w-3.5 h-3.5 text-blue-600" />
                  <span>Copy Data ({selectedItemIds.size})</span>
                </button>
              )}

              {/* Bulk Delete Items (Only Owner) */}
              {isOwner && selectedItemIds.size > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setDeleteError(null);
                    setItemToDelete(itemsInBox.filter(i => selectedItemIds.has(i.id)));
                  }}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold shadow-xs transition cursor-pointer"
                  title="Hapus semua item yang dicentang dari box ini"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Terpilih ({selectedItemIds.size})</span>
                </button>
              )}

              {isOwner ? (
                <button
                  onClick={() => setItemModalConfig({ isOpen: true, item: null, targetBoxNumber: box.boxNumber })}
                  className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-xs transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Item</span>
                </button>
              ) : (
                <span
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 text-slate-400 rounded-lg text-xs font-bold border border-slate-200 cursor-not-allowed"
                  title={`Terkunci: Box #${box.boxNumber} adalah milik PIC ${box.picName}. Satu user tidak dapat mengedit data user lain.`}
                >
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
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
                  className="mt-3 inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Catat Item Pertama</span>
                </button>
              ) : (
                <span className="mt-3 inline-flex items-center gap-1.5 text-xs text-slate-400 font-semibold bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                  <Lock className="w-3.5 h-3.5" /> Hanya PIC {box.picName} yang dapat menambah item ke box ini
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
            /* High-Density Compact Table View */
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs bg-white w-full">
              <div className="overflow-x-hidden overflow-y-auto max-h-[66vh] scrollbar-thin w-full">
                <table className="w-full table-fixed text-left border-collapse text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider sticky top-0 z-10 border-b border-slate-200">
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
                      <th className="py-2.5 px-2.5 w-[18%]">Kode / Sample</th>
                      <th className="py-2.5 px-2.5 w-[32%]">Style &amp; Deskripsi</th>
                      <th className="py-2.5 px-2 w-[14%]">Size &amp; Warna</th>
                      <th className="py-2.5 px-1.5 text-center w-[8%]">Jumlah</th>
                      <th className="py-2.5 px-1 text-center w-[11%]">Status</th>
                      <th className="py-2.5 px-2 text-right w-[17%]">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredItems.map((item, idx) => {
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
                                className="font-mono font-bold text-slate-900 bg-slate-100 hover:bg-blue-100 hover:text-blue-700 hover:border-blue-300 px-1.5 py-0.5 rounded-md border border-slate-200 text-[11px] flex items-center gap-1 transition cursor-pointer shadow-2xs shrink-0"
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
                                <span className="text-[9px] font-black uppercase px-1 py-0.2 bg-amber-400 text-slate-950 rounded shrink-0">
                                  {item.jenisSample}
                                </span>
                              )}
                              {item.buyerNo && item.buyerNo !== '-' && item.buyerNo !== 'NA' && (
                                <span className="text-[10px] text-slate-500 font-mono truncate" title={`Buyer: ${item.buyerNo}`}>
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
                              <div className="text-[10px] text-slate-500 font-mono truncate" title={`Sample No: ${item.sampleNo}`}>
                                Sample No: <strong>{item.sampleNo}</strong>
                              </div>
                            )}
                          </td>

                          {/* Size & Warna */}
                          <td className="py-2 px-2 min-w-0">
                            <div className="flex items-center space-x-1 text-xs truncate">
                              {item.size ? (
                                <span className="font-black text-slate-800 bg-slate-100 border border-slate-300 px-1 py-0.2 rounded text-[10px] uppercase shrink-0">
                                  {item.size}
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[10px]">-</span>
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
                            <span className="text-[9px] font-normal text-slate-500 uppercase">
                              {item.satuan || item.unit || 'PCS'}
                            </span>
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
                                  onClick={() => {
                                    setDispatchModalItem(item);
                                    setDispatchPreselectedItems([]);
                                  }}
                                  className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition cursor-pointer"
                                  title="Kirim Keluar (Buyer / Anzo / RDTW / RDC / ANZOTW)"
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
                                  className={`px-1.5 py-0.5 text-[9px] font-black rounded transition cursor-pointer ${
                                    item.status === 'In Storage'
                                      ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                  }`}
                                  title="Ganti Status Simpan / Pinjam"
                                >
                                  {item.status === 'In Storage' ? 'Pinjam' : 'Kembali'}
                                </button>
                              )}
                              {isOwner ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => setItemModalConfig({ isOpen: true, item, targetBoxNumber: box.boxNumber })}
                                    className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition cursor-pointer"
                                    title="Edit Item"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
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
          )}
        </div>

      </div>

      {/* Box Label Print Modal Preview */}
      {showBoxLabelModal && (
        <div className="fixed inset-0 z-60 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 print:p-0 print:bg-transparent print:block">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-lg w-full max-h-[92vh] overflow-y-auto flex flex-col items-center animate-fade-in print:p-0 print:max-w-none print:max-h-none print:shadow-none print:rounded-none print:w-full">
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
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 max-w-md w-full overflow-hidden flex flex-col">
            <div className="inventory-dialog-heading px-5 py-3.5 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <ArrowRightLeft className="w-4 h-4 text-amber-400" />
                <h3 className="font-black text-slate-900 text-sm uppercase">
                  Pindah Box ({movingItems.length} Item)
                </h3>
              </div>
              <button
                onClick={() => setMovingItems(null)}
                className="text-slate-500 hover:text-slate-900 p-1 rounded-lg hover:bg-slate-200 cursor-pointer"
                aria-label="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* Item preview list */}
              <div>
                <span className="block font-bold text-slate-600 mb-1">Item yang akan dipindahkan:</span>
                <div className="max-h-36 overflow-y-auto space-y-1 bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                  {movingItems.map((it) => (
                    <div key={it.id} className="flex items-center justify-between text-[11px] font-semibold text-slate-800 py-0.5">
                      <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-300 text-[10px]">
                        {it.kode || it.sku || '-'}
                      </span>
                      <span className="truncate max-w-[190px] text-slate-700 ml-2">
                        {it.style || it.deskripsi || it.name}
                      </span>
                      <span className="text-slate-500 ml-auto whitespace-nowrap text-[10px]">
                        {it.jumlah || it.qty} {it.satuan || it.unit || 'PCS'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Destination Box Picker (Lightweight Alternative, No 71-option select) */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nomor Box Tujuan (saat ini di Box #{box.boxNumber}):
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 border border-slate-300 rounded-xl px-3 py-2 bg-white flex-1 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
                    <span className="font-black text-slate-500 text-xs">BOX #</span>
                    <input
                      type="number"
                      min="1"
                      max="72"
                      value={targetBoxNum}
                      onChange={(e) => setTargetBoxNum(Math.max(1, Math.min(72, Number(e.target.value) || 1)))}
                      className="w-16 font-mono font-black text-sm text-slate-900 focus:outline-none bg-transparent"
                    />
                    {(() => {
                      const dest = boxes.find(b => Number(b.boxNumber) === Number(targetBoxNum));
                      return dest ? (
                        <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 ml-auto truncate">
                          {dest.rackName || 'LANTAI'} • {dest.picName || 'Royan'}
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-rose-500 ml-auto">Box #{targetBoxNum}</span>
                      );
                    })()}
                  </div>
                </div>

                {/* Quick Box Chips */}
                <div className="flex items-center gap-1 mt-2 flex-wrap text-[11px]">
                  <span className="text-slate-400 font-semibold mr-0.5">Pilihan Box:</span>
                  {boxes
                    .filter(b => Number(b.boxNumber) !== Number(box.boxNumber) && Number(b.boxNumber) <= 72)
                    .slice(0, 10)
                    .map(b => (
                      <button
                        key={b.boxNumber}
                        type="button"
                        onClick={() => setTargetBoxNum(b.boxNumber)}
                        className={`px-2 py-0.5 rounded-md font-bold border transition cursor-pointer ${
                          targetBoxNum === b.boxNumber
                            ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-300'
                        }`}
                      >
                        #{b.boxNumber}
                      </button>
                    ))}
                </div>
              </div>

              {moveError && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-300 text-rose-800 font-bold text-xs flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{moveError}</span>
                </div>
              )}

              <div className="pt-2 border-t border-slate-200 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setMovingItems(null)}
                  disabled={isMoving}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-bold hover:bg-slate-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmMove}
                  disabled={isMoving}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl shadow-md transition flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer"
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
        <div className="fixed inset-0 z-[75] bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in no-print">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 max-w-sm w-full overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 text-center">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-black text-slate-900">
                {Array.isArray(itemToDelete) ? `Hapus ${itemToDelete.length} Item?` : 'Hapus Item Ini?'}
              </h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                {Array.isArray(itemToDelete) ? (
                  <span>
                    Item yang Anda centang akan dikeluarkan secara permanen dari <strong>Box #{box.boxNumber}</strong>.
                  </span>
                ) : (
                  <span>
                    Yakin ingin menghapus <strong>"{itemToDelete.name || itemToDelete.style || itemToDelete.kode}"</strong> dari <strong>Box #{box.boxNumber}</strong>?
                  </span>
                )}
              </p>

              {deleteError && (
                <div className="mt-3 p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                  {deleteError}
                </div>
              )}

              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => { setItemToDelete(null); setDeleteError(null); }}
                  className="flex-1 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleConfirmDelete}
                  className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition shadow-xs cursor-pointer disabled:opacity-50 flex items-center justify-center space-x-1"
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
    </div>
  );
};
