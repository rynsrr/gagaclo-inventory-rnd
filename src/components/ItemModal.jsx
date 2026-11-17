import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import { supabase } from '../lib/supabase';
import { CardPrintModal } from './CardPrintModal';
import { AiTagScannerModal } from './AiTagScannerModal';
import { isSupport, isHelper, isSuperuser } from '../utils/authUtils';
import { 
  resolveUniqueCode, 
  getNextSampleCode, 
  getNextMaterialCode, 
  allocateNextSequentialCode, 
  reserveCode, 
  releaseCode 
} from '../utils/sequenceResolver';
import { 
  X, 
  Save, 
  MapPin,
  AlertCircle,
  AlertTriangle,
  Calendar,
  Info,
  Edit3,
  CheckCircle2,
  Lock,
  Unlock,
  Printer,
  Check,
  Sparkles,
} from 'lucide-react';

// Every row on the sample card is mandatory. "NA" is an accepted value when
// the information genuinely does not exist; "-" and empty text are not.
// Catatan: "kode" di-generate otomatis unik & berurutan di background agar tidak bentrok antar user.
const REQUIRED_FIELDS = [
  { key: 'track', label: 'Track/Note' },
  { key: 'tanggal', label: 'Tanggal Sample' },
  { key: 'buyerNo', label: 'Buyer No' },
  { key: 'jenisSample', label: 'Jenis Sample' },
  { key: 'style', label: 'Nama / No. Style' },
  { key: 'sampleNo', label: 'Sample No' },
  { key: 'size', label: 'Size' },
  { key: 'color', label: 'Color / Warna' },
  { key: 'jumlah', label: 'Jumlah' },
  { key: 'satuan', label: 'Satuan' },
];

const isBlank = (value) => {
  const text = String(value ?? '').trim();
  return text === '' || text === '-';
};

// Normalise the "no information" marker so it is always stored as "NA".
const clean = (value) => {
  const text = String(value ?? '').trim();
  return text.toLowerCase() === 'na' ? 'NA' : text;
};

const TEXT_KEYS = [
  'track', 'tanggal', 'buyerNo', 'jenisSample', 'style',
  'sampleNo', 'size', 'color', 'satuan', 'place',
];

// Legacy / imported records can miss columns. When opening them for edit,
// pre-fill the gaps with NA so they satisfy the "all columns required" rule.
const fillBlankWithNA = (data) => {
  const next = { ...data };
  TEXT_KEYS.forEach((key) => { if (isBlank(next[key])) next[key] = 'NA'; });
  return next;
};

// Re-export getNextSampleCode from sequenceResolver utility
export { getNextSampleCode };

export function formatTodayDate() {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = String(now.getFullYear());
  return `${dd}-${mm}-${yyyy}`;
}

import { formatToDDMMYYYY } from '../utils/dateUtils';
export { formatToDDMMYYYY };

export const ItemModal = () => {
  const { itemModalConfig } = useInventory();
  if (!itemModalConfig?.isOpen) return null;
  return <ItemModalContent key={itemModalConfig.item?.id || itemModalConfig.targetBoxNumber || 'new'} />;
};

const ItemModalContent = () => {
  const { 
    itemModalConfig, 
    setItemModalConfig, 
    addItem, 
    updateItem, 
    boxes,
    items,
    suggestions = {},
    removeSuggestion,
    showNotification,
    currentUser,
  } = useInventory();

  const hiddenDateRef = useRef(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [savedReminder, setSavedReminder] = useState(null);
  const savedReminderRef = useRef(null);
  savedReminderRef.current = savedReminder;
  const [showPrintModal, setShowPrintModal] = useState(false);

  const isDuplicate = Boolean(itemModalConfig.isDuplicate);
  const isEditing = Boolean(itemModalConfig.item && !isDuplicate);
  const targetBoxNum = Number(itemModalConfig.targetBoxNumber) || (itemModalConfig.item ? Number(itemModalConfig.item.boxNumber) : 1);
  const targetBoxObj = boxes.find(b => Number(b.boxNumber) === Number(targetBoxNum));
  const isMaterialBox = targetBoxObj?.category === 'MATERIAL';

  const clientIdRef = useRef('user_' + Math.random().toString(36).substr(2, 6));

  // Sticky Context (Session-Lock) State
  const [stickyBuyer, setStickyBuyer] = useState(() => {
    return localStorage.getItem('gagaclo_sticky_buyer') || 'AN05';
  });
  const [isBuyerLocked, setIsBuyerLocked] = useState(() => {
    const saved = localStorage.getItem('gagaclo_lock_buyer_enabled');
    return saved !== null ? saved === 'true' : true;
  });

  const [stickyJenis, setStickyJenis] = useState(() => {
    return localStorage.getItem('gagaclo_sticky_jenis') || 'PPS';
  });
  const [isJenisLocked, setIsJenisLocked] = useState(() => {
    const saved = localStorage.getItem('gagaclo_lock_jenis_enabled');
    return saved !== null ? saved === 'true' : true;
  });

  const [isAiScannerOpen, setIsAiScannerOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('gagaclo_lock_buyer_enabled', isBuyerLocked ? 'true' : 'false');
  }, [isBuyerLocked]);

  useEffect(() => {
    localStorage.setItem('gagaclo_lock_jenis_enabled', isJenisLocked ? 'true' : 'false');
  }, [isJenisLocked]);

  const [formData, setFormData] = useState(() => {
    const bNum = Number(itemModalConfig.item?.boxNumber) || targetBoxNum;
    const bObj = boxes.find(b => Number(b.boxNumber) === Number(bNum));
    const isMat = bObj?.category === 'MATERIAL';

    if (itemModalConfig.item) {
      const item = itemModalConfig.item;
      const defaultBoxPlace = bObj 
        ? `BOX ${bObj.boxNumber} (${bObj.rackName || 'LANTAI'} - ${bObj.picName || 'Royan'})` 
        : `BOX ${bNum}`;

      // JIT Allocation: jika duplikasi, kosongkan kode agar di-generate baru saat tombol Simpan ditekan
      const codeVal = isDuplicate ? '' : (item.kode || item.sku || '');

      return fillBlankWithNA({
        track: item.track || '',
        tanggal: formatToDDMMYYYY(item.tanggal || item.dateIn) || formatTodayDate(),
        kode: codeVal,
        buyerNo: item.buyerNo || item.buyerNumber || '',
        jenisSample: (item.jenisSample === 'ARSIP' ? 'ARCHIVE' : item.jenisSample) || item.sampleType || '',
        style: item.style || item.name || item.deskripsi || '',
        sampleNo: item.sampleNo || '',
        size: item.size || '',
        color: item.color && item.color !== '-' ? item.color : '',
        jumlah: item.jumlah !== undefined && item.jumlah !== null ? item.jumlah : (item.qty || 1),
        satuan: 'PCE',
        boxNumber: bNum,
        place: item.place || defaultBoxPlace,
        status: item.status || 'In Storage',
        inputtedBy: item.inputtedBy || item.createdBy || currentUser?.name || 'Royan',
      });
    } else {
      const defaultBoxPlace = bObj 
        ? `BOX ${bObj.boxNumber} (${bObj.rackName || 'LANTAI'} - ${bObj.picName || 'Royan'})` 
        : `BOX ${bNum}`;

      const defaultLockedBuyer = localStorage.getItem('gagaclo_sticky_buyer') || 'AN05';
      const defaultLockedJenis = localStorage.getItem('gagaclo_sticky_jenis') || 'PPS';
      const isLockBuyerActive = localStorage.getItem('gagaclo_lock_buyer_enabled') !== 'false';
      const isLockJenisActive = localStorage.getItem('gagaclo_lock_jenis_enabled') !== 'false';

      // JIT Allocation: untuk item baru, kode kosong di awal dan baru dialokasikan secara atomik saat tombol Simpan diklik
      return {
        track: itemModalConfig.prefill?.track || '',
        tanggal: itemModalConfig.prefill?.tanggal || formatTodayDate(),
        kode: '',
        buyerNo: itemModalConfig.prefill?.buyerNo || (isLockBuyerActive ? defaultLockedBuyer : ''),
        jenisSample: (itemModalConfig.prefill?.jenisSample === 'ARSIP' ? 'ARCHIVE' : itemModalConfig.prefill?.jenisSample) || (isLockJenisActive ? defaultLockedJenis : ''),
        style: itemModalConfig.prefill?.style || '',
        sampleNo: itemModalConfig.prefill?.sampleNo || '',
        size: itemModalConfig.prefill?.size || '',
        color: itemModalConfig.prefill?.color || '',
        jumlah: itemModalConfig.prefill?.jumlah !== undefined ? Number(itemModalConfig.prefill.jumlah) : 1,
        satuan: 'PCE',
        boxNumber: bNum,
        place: defaultBoxPlace,
        status: 'In Storage',
        inputtedBy: currentUser?.name || 'Royan',
      };
    }
  });

  // Release reservation on unmount
  useEffect(() => {
    const codeToRelease = formData.kode;
    const cid = clientIdRef.current;
    return () => {
      if (codeToRelease && !isEditing) {
        releaseCode(codeToRelease, cid);
      }
    };
  }, []);

  const [errors, setErrors] = useState({});

  const currentItemId = isEditing ? itemModalConfig.item?.id : null;

  // Clear a field's error as soon as the user fills it (including with "NA").
  useEffect(() => {
    setErrors((prev) => {
      const keys = Object.keys(prev);
      if (keys.length === 0) return prev;
      const next = {};
      let changed = false;
      for (const key of keys) {
        if (!prev[key]) continue;
        const stillBlank = key === 'jumlah'
          ? !(Number(formData.jumlah) > 0)
          : isBlank(formData[key]);
        if (stillBlank) next[key] = prev[key];
        else changed = true;
      }
      return changed ? next : prev;
    });
  }, [formData]);

  // Deteksi jika kode yang sedang di-input/edit sudah dipakai oleh item lain
  const duplicateItemMatch = useMemo(() => {
    const curCode = String(formData.kode || '').trim().toUpperCase();
    if (!curCode || curCode === 'NA' || curCode === '-') return null;
    const currentId = itemModalConfig.item?.id;
    return (
      items.find((i) => {
        if (currentId && String(i.id) === String(currentId)) return false;
        const k = String(i.kode || i.sku || '').trim().toUpperCase();
        return k === curCode;
      }) || null
    );
  }, [formData.kode, items, itemModalConfig.item]);

  // Fast Selection: Rekomendasi Buyer No, Size, dan Color yang paling sering & banyak digunakan di inventory
  const fastSelectionRecommendations = useMemo(() => {
    const buyerFreq = {};
    const sizeFreq = {};
    const colorFreq = {};

    (items || []).forEach((it) => {
      const b = String(it.buyerNo || it.buyer_no || '').trim().toUpperCase();
      if (b && b !== 'NA' && b !== '-') {
        buyerFreq[b] = (buyerFreq[b] || 0) + 1;
      }
      const s = String(it.size || '').trim().toUpperCase();
      if (s && s !== 'NA' && s !== '-' && s !== 'FREE') {
        sizeFreq[s] = (sizeFreq[s] || 0) + 1;
      }
      const c = String(it.color || '').trim().toUpperCase();
      if (c && c !== 'NA' && c !== '-') {
        colorFreq[c] = (colorFreq[c] || 0) + 1;
      }
    });

    const getTopList = (freqMap, defaultList, limit = 5) => {
      const sortedByFreq = Object.entries(freqMap)
        .sort((a, b) => b[1] - a[1])
        .map(([k]) => k);
      const combined = [...new Set([...sortedByFreq, ...defaultList])].filter(
        (x) => x && x !== 'FREE' && x !== 'NA' && x !== '-'
      );
      return combined.slice(0, limit);
    };

    return {
      buyerNo: [...getTopList(buyerFreq, ['AN05', 'AN01', 'AN02', 'UNIQLO', 'GAP'], 5), 'NA'],
      size: [...getTopList(sizeFreq, ['S', 'M', 'L', 'XL', 'XXL'], 5), 'NA'],
      color: [...getTopList(colorFreq, ['BLACK', 'WHITE', 'NAVY', 'GREY', 'BEIGE'], 5), 'NA'],
    };
  }, [items]);

  // Handle box selection change
  const handleBoxSelect = (selectedPlaceValue) => {
    const match = selectedPlaceValue.match(/BOX\s+(\d+)/i);
    const boxNum = match ? Number(match[1]) : formData.boxNumber;
    const targetBox = boxes.find(b => Number(b.boxNumber) === Number(boxNum));
    const properPlace = targetBox
      ? `BOX ${targetBox.boxNumber} (${targetBox.rackName || 'LANTAI'} - ${targetBox.picName || 'Royan'})`
      : selectedPlaceValue;
    
    setFormData(prev => ({
      ...prev,
      place: properPlace,
      boxNumber: boxNum,
    }));
  };

  // Keyboard shortcut: Ctrl/Cmd + Enter to Save, Escape to close
  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        const form = document.getElementById('direct-card-form');
        if (form && !isSubmitting) {
          form.requestSubmit();
        }
      }
      if (e.key === 'Escape') {
        if (savedReminderRef.current) return;
        setItemModalConfig({ isOpen: false, item: null, targetBoxNumber: null });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isSubmitting, setItemModalConfig]);

  // Handle Date picker selection from calendar popup -> Format: dd-mm-yyyy
  const handleDatePickerChange = (e) => {
    const val = e.target.value; // Format: "YYYY-MM-DD"
    if (!val) return;
    const parts = val.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const month = parts[1];
      const day = parts[2];
      const formatted = `${day}-${month}-${year}`; // dd-mm-yyyy
      setFormData(prev => ({ ...prev, tanggal: formatted }));
      if (errors.tanggal) setErrors(prev => ({ ...prev, tanggal: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);
    const newErrors = {};
    REQUIRED_FIELDS.forEach(({ key, label }) => {
      const blank = key === 'jumlah'
        ? !(Number(formData.jumlah) > 0)
        : isBlank(formData[key]);
      if (blank) newErrors[key] = label;
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const boxNum = Number(formData.boxNumber) || 1;
    const boxObj = boxes.find(b => Number(b.boxNumber) === boxNum);
    const isSuper = isSuperuser?.(currentUser);
    const isSupportUser = isSupport?.(currentUser) || isHelper?.(currentUser);
    const isOwnerBox = !currentUser || isSuper || isSupportUser || !boxObj?.picName || String(currentUser.name).trim().toLowerCase() === String(boxObj.picName).trim().toLowerCase();
    const isInputter = itemModalConfig.item && currentUser && (
      (itemModalConfig.item.inputtedBy && String(currentUser.name).trim().toLowerCase() === String(itemModalConfig.item.inputtedBy).trim().toLowerCase()) ||
      (itemModalConfig.item.createdBy && String(currentUser.name).trim().toLowerCase() === String(itemModalConfig.item.createdBy).trim().toLowerCase())
    );
    const canSubmit = !isEditing || isOwnerBox || isInputter;
    if (!canSubmit) {
      setSubmitError(`Akses ditolak: Data sampel ini di Box #${boxNum} dialokasikan untuk PPIC "${boxObj?.picName}". Anda sedang login sebagai "${currentUser?.name}". Satu user tidak dapat mengedit data user lain.`);
      return;
    }

    const styleTrim = clean(formData.style).toUpperCase();
    const sampleNoTrim = clean(formData.sampleNo).toUpperCase();
    const buyerNoTrim = clean(formData.buyerNo).toUpperCase();
    const sizeTrim = clean(formData.size).toUpperCase();
    const colorTrim = clean(formData.color).toUpperCase();
    const trackClean = clean(formData.track).toUpperCase();
    const rawTanggal = clean(formData.tanggal);
    const tanggalClean = formatToDDMMYYYY(rawTanggal) || rawTanggal;
    const satuanClean = 'PCE';
    const placeClean = clean(formData.place) || (boxObj ? `BOX ${boxNum} (${boxObj.rackName} - ${boxObj.picName})` : `BOX ${boxNum}`);
    const fullDeskripsi = sampleNoTrim
      ? `${styleTrim} - Sample: ${sampleNoTrim} - Size: ${sizeTrim}`
      : `${styleTrim} - Size: ${sizeTrim}`;

    setIsSubmitting(true);
    setSubmitError(null);

    // Alokasi kode unik Just-in-Time saat simpan: jika edit pakai kode asal, jika baru/duplikat ambil urutan terbaru secara atomik
    let finalKode;
    if (isEditing && (itemModalConfig.item?.kode || itemModalConfig.item?.sku)) {
      finalKode = itemModalConfig.item.kode || itemModalConfig.item.sku;
    } else {
      finalKode = await allocateNextSequentialCode(
        supabase,
        isMaterialBox ? 'MATERIAL' : 'SAMPLE',
        items
      );
    }

    // Release any temporary reservation
    releaseCode(formData.kode, clientIdRef.current);
    releaseCode(finalKode, clientIdRef.current);

    const inputterFinal = formData.inputtedBy || currentUser?.name || 'Royan';
    const isSupportName = ['sheva', 'ade', 'tri'].includes(String(inputterFinal).toLowerCase());
    const trackingTags = [
      `inputted_by:${encodeURIComponent(inputterFinal)}`,
      ...(isSupportName ? [`helper:${encodeURIComponent(inputterFinal)}`] : []),
    ];

    const payload = {
      track: trackClean,
      tanggal: tanggalClean,
      kode: finalKode,
      buyerNo: buyerNoTrim,
      jenisSample: clean(formData.jenisSample),
      style: styleTrim,
      sampleNo: sampleNoTrim,
      size: sizeTrim,
      deskripsi: fullDeskripsi,
      color: colorTrim,
      jumlah: Number(formData.jumlah) || 1,
      satuan: satuanClean,
      place: placeClean,

      // System context mappings
      name: sampleNoTrim
        ? `${styleTrim} (Sample: ${sampleNoTrim}, Size: ${sizeTrim})`
        : `${styleTrim} (Size: ${sizeTrim})`,
      sku: finalKode,
      buyerNumber: buyerNoTrim,
      description: fullDeskripsi,
      qty: Number(formData.jumlah) || 1,
      unit: satuanClean,
      boxNumber: boxNum,
      rackId: boxObj ? Number(boxObj.rackId) : 1,
      rackName: boxObj ? boxObj.rackName : 'RACK 1',
      picName: boxObj ? boxObj.picName : 'Royan',
      category: boxObj ? boxObj.category : 'SAMPLE',
      status: formData.status || 'In Storage',
      dateIn: tanggalClean,
      inputtedBy: inputterFinal,
      createdBy: isEditing ? (itemModalConfig.item?.createdBy || inputterFinal) : inputterFinal,
      helperName: isSupportName ? inputterFinal : (itemModalConfig.item?.helperName || null),
      tags: [
        ...(Array.isArray(itemModalConfig.item?.tags)
          ? itemModalConfig.item.tags.filter(t => typeof t === 'string' && !t.startsWith('inputted_by:') && !t.startsWith('helper:'))
          : []),
        ...trackingTags,
      ],
    };

    try {
      if (isEditing) {
        await updateItem(itemModalConfig.item.id, payload);
      } else {
        await addItem(payload);
      }

      const shortCode = String(finalKode || '').replace(/^(SAMPLE|MAT)-/i, '').trim();
      const shortLocation = `BOX ${boxNum}`;

      setSavedReminder({
        kode: shortCode,
        lokasi: shortLocation,
        itemForPrint: {
          ...payload,
          id: itemModalConfig.item?.id || Date.now(),
        },
      });
    } catch (err) {
      console.error('Error saat menyimpan item:', err);
      setSubmitError(err?.message || 'Gagal menyimpan perubahan. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentBoxObj = boxes.find(b => Number(b.boxNumber) === Number(formData.boxNumber));
  const isSuper = isSuperuser?.(currentUser);
  const isSupportUser = isSupport?.(currentUser) || isHelper?.(currentUser);
  const isRealOwner = currentUser && currentBoxObj?.picName && String(currentUser.name).trim().toLowerCase() === String(currentBoxObj.picName).trim().toLowerCase();
  const isCrossPpic = currentUser && !isRealOwner && !isSupportUser && !isSuper;
  const isInputter = isEditing && itemModalConfig.item && currentUser && (
    (itemModalConfig.item.inputtedBy && String(currentUser.name).trim().toLowerCase() === String(itemModalConfig.item.inputtedBy).trim().toLowerCase()) ||
    (itemModalConfig.item.createdBy && String(currentUser.name).trim().toLowerCase() === String(itemModalConfig.item.createdBy).trim().toLowerCase())
  );
  const isOwner = !isEditing || isRealOwner || isSuper || isSupportUser || isCrossPpic || isInputter;

  return (
    <div className="font-apple fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-0 sm:p-4 overflow-hidden animate-fade-in print:p-0 print:bg-transparent">
      <div className="bg-white rounded-none sm:rounded-[26px] shadow-[0_30px_70px_rgba(0,0,0,0.2)] border-0 sm:border border-black/[0.08] w-full max-w-4xl overflow-hidden flex flex-col h-[100dvh] sm:h-auto sm:max-h-[96vh]">
        
        {/* Apple Dark Header */}
        <div className="no-print px-4 sm:px-5 py-3 sm:py-3.5 pt-[max(env(safe-area-inset-top),12px)] flex items-center justify-between border-b border-white/[0.08] bg-[#161618] text-white shrink-0">
          <div className="flex items-center space-x-2 min-w-0">
            <span className="inline-flex items-center text-xs font-semibold text-white bg-white/10 px-2.5 sm:px-3 py-1 rounded-full border border-white/15 truncate">
              BOX #{formData.boxNumber} ({currentBoxObj?.rackName || 'LANTAI'} - {currentBoxObj?.picName || 'Royan'})
            </span>
            {isEditing && (itemModalConfig.item?.kode || itemModalConfig.item?.sku) && (
              <span className="hidden sm:inline-flex items-center text-xs font-mono font-medium text-white/80 bg-white/10 px-2.5 py-0.5 rounded-full border border-white/10 shrink-0">
                {itemModalConfig.item?.kode || itemModalConfig.item?.sku}
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsAiScannerOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#0071e3] to-[#5ac8fa] hover:brightness-110 text-white text-xs font-bold shadow-xs transition cursor-pointer active:scale-95"
              title="Pindai Kartu / Tag Sampel dengan Gemini AI"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Scan Tag AI</span>
            </button>

            <button
              type="button"
              onClick={() => setItemModalConfig({ isOpen: false, item: null, targetBoxNumber: null })}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer active:scale-95"
              aria-label="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Support User Banner */}
        {isSupportUser && !isRealOwner && currentBoxObj?.picName && (
          <div className="no-print bg-teal-50 border-b border-teal-300 text-teal-950 px-4 py-2 text-xs font-bold flex items-center gap-2.5 shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-600 animate-pulse shrink-0"></span>
            <div className="flex-1 leading-snug">
              <strong>Mode Tim Support:</strong> Anda sedang login sebagai <strong>{currentUser?.name}</strong> untuk membantu input item di Box #{formData.boxNumber} (Milik PPIC <strong>{currentBoxObj?.picName}</strong>). Stok tetap tercatat di Box {currentBoxObj?.picName}, dan kontribusi input dicatat secara Dual-Tracking.
            </div>
          </div>
        )}

        {/* Cross-PPIC Helper Banner */}
        {isCrossPpic && !isRealOwner && currentBoxObj?.picName && (
          <div className="no-print bg-blue-50 border-b border-blue-300 text-blue-950 px-4 py-2 text-xs font-bold flex items-center gap-2.5 shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse shrink-0"></span>
            <div className="flex-1 leading-snug">
              <strong>Mode Bantuan Antar-PPIC:</strong> Anda sedang login sebagai <strong>{currentUser?.name}</strong> untuk membantu input item di Box #{formData.boxNumber} (Milik PPIC <strong>{currentBoxObj?.picName}</strong>). Stok fisik masuk ke Box {currentBoxObj?.picName}, dan credit input harian tercatat atas nama <strong>{currentUser?.name}</strong>.
            </div>
          </div>
        )}

        {/* Read-Only Banner when box belongs to another PPIC */}
        {!isOwner && (
          <div className="no-print bg-amber-50 border-b border-amber-300 text-amber-950 px-4 py-2 text-xs font-bold flex items-center gap-2.5 shrink-0">
            <Lock className="w-4 h-4 text-amber-600 shrink-0" />
            <div className="flex-1 leading-snug">
              Akses Terkunci: Box #{formData.boxNumber} dialokasikan untuk PPIC <strong>{currentBoxObj?.picName}</strong>. Anda login sebagai <strong>{currentUser?.name}</strong>, sehingga tidak dapat mengedit item pada box ini.
            </div>
          </div>
        )}

        {/* Peringatan Kode Duplikat & Tombol Perbaikan Instan */}
        {duplicateItemMatch && (
          <div className="no-print bg-amber-50 border-b border-amber-300 text-amber-950 px-4 py-2 text-xs font-bold flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Perhatian: Kode sample <strong>#{formData.kode}</strong> sudah tercatat pada Style <strong>"{duplicateItemMatch.style}"</strong> di <strong>BOX #{duplicateItemMatch.boxNumber}</strong>.
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                const isMat = isMaterialBox;
                const freshCode = isMat
                  ? getNextMaterialCode(items, clientIdRef.current)
                  : getNextSampleCode(items, clientIdRef.current);
                setFormData((p) => ({ ...p, kode: freshCode }));
                reserveCode(freshCode, clientIdRef.current);
              }}
              className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs whitespace-nowrap cursor-pointer transition shadow-2xs shrink-0"
              title="Ganti ke kode baru unik yang belum dipakai"
            >
              ⚡ Buat Kode Baru Unik
            </button>
          </div>
        )}

        {/* Top Error Banner (jika ada error) */}
        {submitError && (
          <div className="bg-rose-50 border-b border-rose-300 text-rose-900 px-3.5 py-1 text-xs font-bold flex items-center gap-2 shrink-0">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <span className="truncate">{submitError}</span>
          </div>
        )}

        {/* Validation Error Alert (Compact) */}
        {Object.keys(errors).length > 0 && (
          <div className="bg-rose-50 border-b border-rose-300 px-3.5 py-1 text-xs text-rose-800 flex items-center gap-1.5 shrink-0 font-semibold">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <span>Kolom belum terisi: <strong className="text-rose-900">{Object.values(errors).filter(Boolean).join(', ')}</strong> (isi NA jika tidak ada info)</span>
          </div>
        )}

        {/* Form Body: Apple Inset Grouped layout */}
        <form onSubmit={handleSubmit} id="direct-card-form" className="p-2 sm:p-4 bg-[#f5f5f7] flex-1 overflow-y-auto overscroll-contain">
          <div className="bg-white border border-black/[0.08] rounded-2xl sm:rounded-[22px] p-3 sm:p-4 shadow-2xs space-y-2.5 text-xs">
            
            {/* BARIS 1: Track & Tanggal Sample */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
              {/* Track/Note */}
              <div className={`border rounded-lg p-1.5 bg-white transition ${
                errors.track ? 'border-rose-500 bg-rose-50/50' : 'border-slate-300 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-400'
              }`}>
                <div className="flex items-center justify-between mb-0.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Track/Note <span className="text-rose-500">*</span>:
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(p => ({ ...p, track: 'NA' }));
                      if (errors.track) setErrors(prev => ({ ...prev, track: null }));
                    }}
                    className="text-xs font-black px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-300 transition cursor-pointer"
                    title="Isi otomatis NA"
                  >
                    + NA
                  </button>
                </div>
                <input
                  type="text"
                  list="track-datalist"
                  value={formData.track}
                  onChange={(e) => {
                    setFormData(p => ({ ...p, track: e.target.value.toUpperCase() }));
                    if (errors.track) setErrors(prev => ({ ...prev, track: null }));
                  }}
                  placeholder="Contoh: DHL : 5475890895 / 240GSM FLEECE / CATATAN KHUSUS / NA"
                  className="w-full text-xs font-semibold text-slate-900 focus:outline-none font-mono bg-transparent uppercase"
                />
                <datalist id="track-datalist">
                  {(suggestions.track || []).map((t, idx) => (
                    <option key={`tr-${idx}`} value={t} />
                  ))}
                </datalist>
              </div>

              {/* Tanggal Sample */}
              <div className={`border rounded-lg p-1.5 bg-white transition ${
                errors.tanggal ? 'border-rose-500 bg-rose-50/50' : 'border-slate-300 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-400'
              }`}>
                <div className="flex items-center justify-between mb-0.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Tanggal Sample (DD-MM-YYYY) <span className="text-rose-500">*</span>:
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(p => ({ ...p, tanggal: formatTodayDate() }));
                        if (errors.tanggal) setErrors(prev => ({ ...prev, tanggal: null }));
                      }}
                      className="text-xs font-black px-1.5 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded border border-blue-200 transition cursor-pointer"
                      title="Isi tanggal hari ini (DD-MM-YYYY)"
                    >
                      Hari Ini
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(p => ({ ...p, tanggal: 'NA' }));
                        if (errors.tanggal) setErrors(prev => ({ ...prev, tanggal: null }));
                      }}
                      className="text-xs font-black px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-300 transition cursor-pointer"
                      title="Isi NA"
                    >
                      + NA
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={formData.tanggal}
                    onChange={(e) => {
                      setFormData(p => ({ ...p, tanggal: e.target.value }));
                      if (errors.tanggal) setErrors(prev => ({ ...prev, tanggal: null }));
                    }}
                    onBlur={(e) => {
                      const raw = e.target.value;
                      if (raw) {
                        const formatted = formatToDDMMYYYY(raw);
                        if (formatted && formatted !== raw) {
                          setFormData(p => ({ ...p, tanggal: formatted }));
                        }
                      }
                    }}
                    placeholder="DD-MM-YYYY (contoh: 06-11-2026) / NA"
                    className="w-full text-xs font-semibold text-slate-900 focus:outline-none bg-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      try { hiddenDateRef.current?.showPicker(); }
                      catch { hiddenDateRef.current?.focus(); }
                    }}
                    className="p-1 hover:bg-slate-100 rounded text-blue-600 transition cursor-pointer shrink-0"
                    title="Buka kalender"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                  </button>
                  <input
                    ref={hiddenDateRef}
                    type="date"
                    onChange={handleDatePickerChange}
                    className="sr-only"
                    tabIndex={-1}
                  />
                </div>
              </div>
            </div>

            {/* BARIS 2: Buyer No dengan Fast Selection Rekomendasi & Sticky Lock Info */}
            <div className={`border rounded-lg p-2 bg-white transition flex flex-col justify-between ${
              errors.buyerNo
                ? 'border-rose-500 bg-rose-50/50'
                : isBuyerLocked
                  ? 'border-emerald-400 bg-emerald-50/15 ring-1 ring-emerald-300/60'
                  : 'border-slate-300 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-400'
            }`}>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Buyer No <span className="text-rose-500">*</span>:
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const next = !isBuyerLocked;
                        setIsBuyerLocked(next);
                        if (next && formData.buyerNo) {
                          setStickyBuyer(formData.buyerNo);
                          localStorage.setItem('gagaclo_sticky_buyer', formData.buyerNo);
                        }
                      }}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition cursor-pointer select-none ${
                        isBuyerLocked
                          ? 'bg-emerald-100/90 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
                          : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200 hover:text-slate-700'
                      }`}
                      title={isBuyerLocked ? 'Buyer Terkunci (klik untuk buka kunci)' : 'Klik untuk mengunci Buyer ini agar otomatis terisi pada item berikutnya'}
                    >
                      {isBuyerLocked ? (
                        <>
                          <Lock className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>Terkunci {formData.buyerNo ? `(${formData.buyerNo})` : ''}</span>
                        </>
                      ) : (
                        <>
                          <Unlock className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>Kunci Buyer</span>
                        </>
                      )}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(p => ({ ...p, buyerNo: 'NA' }));
                      if (errors.buyerNo) setErrors(prev => ({ ...prev, buyerNo: null }));
                      if (isBuyerLocked) {
                        setStickyBuyer('NA');
                        localStorage.setItem('gagaclo_sticky_buyer', 'NA');
                      }
                    }}
                    className="text-xs font-black px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-300 transition cursor-pointer"
                  >
                    + NA
                  </button>
                </div>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    list="buyer-datalist"
                    value={formData.buyerNo}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      setFormData(p => ({ ...p, buyerNo: val }));
                      if (errors.buyerNo) setErrors(prev => ({ ...prev, buyerNo: null }));
                      if (isBuyerLocked) {
                        setStickyBuyer(val);
                        localStorage.setItem('gagaclo_sticky_buyer', val);
                      }
                    }}
                    placeholder="Contoh: AN05 / RSD-250015-2 / NA"
                    className="w-full text-xs font-bold font-mono uppercase focus:outline-none bg-transparent pr-6"
                  />
                  {isBuyerLocked && (
                    <Lock className="w-3.5 h-3.5 text-emerald-600 absolute right-1 pointer-events-none opacity-80" />
                  )}
                </div>
                <datalist id="buyer-datalist">
                  {(suggestions.buyerNo || []).map((b, idx) => (
                    <option key={`by-${idx}`} value={b} />
                  ))}
                </datalist>
              </div>

              {/* Fast Selection Rekomendasi Paling Sering Digunakan */}
              <div className="flex items-center gap-1 mt-1.5 pt-1.5 border-t border-slate-200/80 overflow-x-auto">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight shrink-0 mr-0.5">
                  Pilihan:
                </span>
                {fastSelectionRecommendations.buyerNo.map((b) => {
                  const isSelected = formData.buyerNo === b;
                  return (
                    <button
                      key={b}
                      type="button"
                      onClick={() => {
                        setFormData(p => ({ ...p, buyerNo: b }));
                        if (errors.buyerNo) setErrors(prev => ({ ...prev, buyerNo: null }));
                        if (isBuyerLocked) {
                          setStickyBuyer(b);
                          localStorage.setItem('gagaclo_sticky_buyer', b);
                        }
                      }}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase transition cursor-pointer text-center whitespace-nowrap flex items-center gap-1 ${
                        isSelected
                          ? 'bg-[#0071e3] text-white shadow-xs'
                          : 'bg-[#f5f5f7] hover:bg-[#ebebee] text-[#1d1d1f] border border-black/[0.06]'
                      }`}
                    >
                      {isSelected && isBuyerLocked && <Lock className="w-2.5 h-2.5 text-white/80" />}
                      <span>{b}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* BARIS 3: Jenis Sample (Chip Buttons) & Deskripsi / Style */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-1.5 items-center">
              {/* Jenis Sample Pills & Sticky Lock Info */}
              <div className={`md:col-span-6 border rounded-xl p-2 bg-white transition ${
                errors.jenisSample
                  ? 'border-rose-500 bg-rose-50/50 ring-1 ring-rose-400'
                  : isJenisLocked
                    ? 'border-emerald-400 bg-emerald-50/15 ring-1 ring-emerald-300/60'
                    : 'border-slate-300'
              }`}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Jenis Sample <span className="text-rose-500">*</span>:
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const next = !isJenisLocked;
                        setIsJenisLocked(next);
                        if (next && formData.jenisSample) {
                          setStickyJenis(formData.jenisSample);
                          localStorage.setItem('gagaclo_sticky_jenis', formData.jenisSample);
                        }
                      }}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition cursor-pointer select-none ${
                        isJenisLocked
                          ? 'bg-emerald-100/90 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
                          : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200 hover:text-slate-700'
                      }`}
                      title={isJenisLocked ? 'Jenis Sample Terkunci (klik untuk buka kunci)' : 'Klik untuk mengunci Jenis Sample ini agar otomatis terisi pada item berikutnya'}
                    >
                      {isJenisLocked ? (
                        <>
                          <Lock className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>Terkunci {formData.jenisSample ? `(${formData.jenisSample})` : ''}</span>
                        </>
                      ) : (
                        <>
                          <Unlock className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>Kunci Jenis</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {['DEVELOP', 'PPS', 'ORI', 'BULK SAMPLE', 'ARCHIVE'].map((type) => {
                    const isSelected = formData.jenisSample === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          setFormData(p => ({ ...p, jenisSample: type }));
                          if (errors.jenisSample) setErrors(prev => ({ ...prev, jenisSample: null }));
                          if (isJenisLocked) {
                            setStickyJenis(type);
                            localStorage.setItem('gagaclo_sticky_jenis', type);
                          }
                        }}
                        className={`flex-1 min-w-[70px] sm:min-w-0 py-1.5 px-2 rounded-lg text-xs font-black uppercase tracking-wider transition border cursor-pointer text-center select-none active:scale-95 flex items-center justify-center gap-1 ${
                          isSelected
                            ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                        }`}
                      >
                        {isSelected && <span className="text-amber-300 mr-0.5">✓</span>}
                        {isSelected && isJenisLocked && <Lock className="w-3 h-3 text-emerald-400" />}
                        <span>{type}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Nama / No. Style */}
              <div className={`md:col-span-6 border rounded-lg p-1.5 bg-white transition ${
                errors.style ? 'border-rose-500 bg-rose-50/50' : 'border-slate-300 focus-within:border-blue-500'
              }`}>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-0.5">
                  Nama / No. Style <span className="text-rose-500">*</span>:
                </label>
                <input
                  type="text"
                  list="style-datalist"
                  value={formData.style}
                  onChange={(e) => {
                    setFormData(p => ({ ...p, style: e.target.value.toUpperCase() }));
                    if (errors.style) setErrors(prev => ({ ...prev, style: null }));
                  }}
                  placeholder="Contoh: WL920FR / 6435 / NA"
                  className="w-full text-xs font-bold text-slate-900 focus:outline-none bg-transparent uppercase"
                />
                <datalist id="style-datalist">
                  {(suggestions.style || []).map((s, idx) => (
                    <option key={`st-${idx}`} value={s} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* BARIS 4: Sample No, Size (dengan Preset Chips), & Color (dengan Preset Chips) */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-1.5">
              {/* Sample No */}
              <div className={`md:col-span-4 border rounded-xl p-2 bg-white transition flex flex-col justify-between ${
                errors.sampleNo ? 'border-[#ff3b30] bg-[#ff3b30]/5' : 'border-black/[0.08] focus-within:border-[#0071e3] focus-within:ring-2 focus-within:ring-[#0071e3]/15'
              }`}>
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <label className="text-[11px] font-semibold text-[#86868b] uppercase tracking-wider whitespace-nowrap">
                      Sample No <span className="text-[#ff3b30]">*</span>:
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(p => ({ ...p, sampleNo: 'NA' }));
                        if (errors.sampleNo) setErrors(prev => ({ ...prev, sampleNo: null }));
                      }}
                      className="text-[10px] font-medium px-1.5 py-0.5 bg-[#f5f5f7] hover:bg-[#ebebee] text-[#1d1d1f] rounded-md border border-black/[0.06] transition cursor-pointer"
                      title="Isi NA"
                    >
                      + NA
                    </button>
                  </div>
                  <input
                    type="text"
                    list="sampleno-datalist"
                    value={formData.sampleNo}
                    onChange={(e) => {
                      setFormData(p => ({ ...p, sampleNo: e.target.value.toUpperCase() }));
                      if (errors.sampleNo) setErrors(prev => ({ ...prev, sampleNo: null }));
                    }}
                    placeholder="Contoh: RSD-250015-2 / NA"
                    className="w-full text-xs font-mono font-semibold uppercase focus:outline-hidden bg-transparent text-[#1d1d1f] placeholder:text-[#86868b]"
                  />
                  <datalist id="sampleno-datalist">
                    {(suggestions.sampleNo || []).map((sn, idx) => (
                      <option key={`sno-${idx}`} value={sn} />
                    ))}
                  </datalist>
                </div>
                <div className="mt-1.5 pt-1.5 border-t border-black/[0.04] text-[10px] text-[#86868b] truncate">
                  Nomor identifikasi sample
                </div>
              </div>

              {/* Size dengan 1-Click Chips */}
              <div className={`md:col-span-4 border rounded-xl p-2 bg-white transition flex flex-col justify-between ${
                errors.size ? 'border-[#ff3b30] bg-[#ff3b30]/5' : 'border-black/[0.08] focus-within:border-[#0071e3] focus-within:ring-2 focus-within:ring-[#0071e3]/15'
              }`}>
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <label className="text-[11px] font-semibold text-[#86868b] uppercase tracking-wider whitespace-nowrap">
                      Size <span className="text-[#ff3b30]">*</span>:
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(p => ({ ...p, size: 'NA' }));
                        if (errors.size) setErrors(prev => ({ ...prev, size: null }));
                      }}
                      className="text-[10px] font-medium px-1.5 py-0.5 bg-[#f5f5f7] hover:bg-[#ebebee] text-[#1d1d1f] rounded-md border border-black/[0.06] transition cursor-pointer"
                      title="Isi NA"
                    >
                      + NA
                    </button>
                  </div>
                  <input
                    type="text"
                    list="size-datalist"
                    value={formData.size}
                    onChange={(e) => {
                      setFormData(p => ({ ...p, size: e.target.value.toUpperCase() }));
                      if (errors.size) setErrors(prev => ({ ...prev, size: null }));
                    }}
                    placeholder="Ketik size atau pilih chip..."
                    className="w-full text-xs font-semibold uppercase focus:outline-hidden bg-transparent text-[#1d1d1f] placeholder:text-[#86868b]"
                  />
                  <datalist id="size-datalist">
                    {(suggestions.size || []).map((sz, idx) => (
                      <option key={`sz-${idx}`} value={sz} />
                    ))}
                  </datalist>
                </div>
                <div className="flex items-center gap-1 mt-1.5 pt-1.5 border-t border-black/[0.04] overflow-x-auto">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight shrink-0 mr-0.5">
                    Pilihan:
                  </span>
                  {fastSelectionRecommendations.size.map(sz => {
                    const isSelected = formData.size === sz;
                    return (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => {
                          setFormData(p => ({ ...p, size: sz }));
                          if (errors.size) setErrors(prev => ({ ...prev, size: null }));
                        }}
                        className={`flex-1 py-0.5 px-1 rounded-full text-[10px] font-semibold tracking-wide uppercase transition cursor-pointer text-center whitespace-nowrap ${
                          isSelected
                            ? 'bg-[#0071e3] text-white shadow-2xs'
                            : 'bg-[#f5f5f7] hover:bg-[#ebebee] text-[#1d1d1f] border border-black/[0.06]'
                        }`}
                      >
                        {sz}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Color dengan 1-Click Chips */}
              <div className={`md:col-span-4 border rounded-xl p-2 bg-white transition flex flex-col justify-between ${
                errors.color ? 'border-[#ff3b30] bg-[#ff3b30]/5' : 'border-black/[0.08] focus-within:border-[#0071e3] focus-within:ring-2 focus-within:ring-[#0071e3]/15'
              }`}>
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <label className="text-[11px] font-semibold text-[#86868b] uppercase tracking-wider whitespace-nowrap">
                      Color / Warna <span className="text-[#ff3b30]">*</span>:
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(p => ({ ...p, color: 'NA' }));
                        if (errors.color) setErrors(prev => ({ ...prev, color: null }));
                      }}
                      className="text-[10px] font-medium px-1.5 py-0.5 bg-[#f5f5f7] hover:bg-[#ebebee] text-[#1d1d1f] rounded-md border border-black/[0.06] transition cursor-pointer"
                      title="Isi NA"
                    >
                      + NA
                    </button>
                  </div>
                  <input
                    type="text"
                    list="color-datalist"
                    value={formData.color}
                    onChange={(e) => {
                      setFormData(p => ({ ...p, color: e.target.value.toUpperCase() }));
                      if (errors.color) setErrors(prev => ({ ...prev, color: null }));
                    }}
                    placeholder="Ketik warna atau pilih chip..."
                    className="w-full text-xs font-semibold uppercase focus:outline-hidden bg-transparent text-[#1d1d1f] placeholder:text-[#86868b]"
                  />
                  <datalist id="color-datalist">
                    {(suggestions.color || []).map((c, idx) => (
                      <option key={`c-${idx}`} value={c} />
                    ))}
                  </datalist>
                </div>
                <div className="flex items-center gap-1 mt-1.5 pt-1.5 border-t border-black/[0.04] overflow-x-auto">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight shrink-0 mr-0.5">
                    Pilihan:
                  </span>
                  {fastSelectionRecommendations.color.map(c => {
                    const isSelected = formData.color === c;
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => {
                          setFormData(p => ({ ...p, color: c }));
                          if (errors.color) setErrors(prev => ({ ...prev, color: null }));
                        }}
                        className={`flex-1 py-0.5 px-1 rounded-full text-[10px] font-semibold tracking-wide uppercase transition cursor-pointer text-center whitespace-nowrap ${
                          isSelected
                            ? 'bg-[#1d1d1f] text-white shadow-2xs'
                            : 'bg-[#f5f5f7] hover:bg-[#ebebee] text-[#1d1d1f] border border-black/[0.06]'
                        }`}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* BARIS 5: Jumlah (Qty), Satuan & Penginput */}
            <div className="grid grid-cols-2 md:grid-cols-12 gap-2">
              {/* Jumlah */}
              <div className={`col-span-1 md:col-span-3 border rounded-xl p-2 bg-white transition ${
                errors.jumlah ? 'border-rose-500 bg-rose-50/50' : 'border-slate-300 focus-within:border-blue-500'
              }`}>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-0.5">
                  Jumlah (Qty) <span className="text-rose-500">*</span>:
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.jumlah}
                  onChange={(e) => {
                    setFormData(p => ({ ...p, jumlah: Number(e.target.value) || 0 }));
                    if (errors.jumlah) setErrors(prev => ({ ...prev, jumlah: null }));
                  }}
                  className="w-full text-sm font-black font-mono focus:outline-none bg-transparent"
                />
              </div>

              {/* Satuan (Terkunci ke PCE) */}
              <div className="col-span-1 md:col-span-3 border border-slate-300 rounded-xl p-2 bg-slate-50/80 transition">
                <div className="flex items-center justify-between mb-0.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Satuan <span className="text-rose-500">*</span>:
                  </label>
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">
                    PCE
                  </span>
                </div>
                <input
                  type="text"
                  value="PCE"
                  readOnly
                  disabled
                  className="w-full text-sm font-black font-mono text-slate-800 bg-transparent cursor-not-allowed select-none focus:outline-none"
                />
              </div>

              {/* Penginput (Disembunyikan di Mobile View sesuai permintaan) */}
              <div className="hidden md:block col-span-2 md:col-span-6 border border-slate-300 rounded-xl p-2 bg-white transition focus-within:border-blue-500">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-0.5">
                  Penginput:
                </label>
                <select
                  value={formData.inputtedBy || currentUser?.name || 'Royan'}
                  onChange={(e) => setFormData(p => ({ ...p, inputtedBy: e.target.value }))}
                  className="w-full text-xs font-bold text-slate-900 bg-transparent focus:outline-none cursor-pointer py-0.5"
                >
                  <optgroup label="PPIC Utama">
                    <option value="Royan">Royan (PPIC #1)</option>
                    <option value="Cynara">Cynara (PPIC #2)</option>
                    <option value="Ami">Ami (PPIC #3)</option>
                    <option value="Ryan">Ryan (PPIC #4)</option>
                    <option value="Hanami">Hanami (PPIC #5)</option>
                  </optgroup>
                  <optgroup label="Tim Support">
                    <option value="Sheva">Sheva (Support #1)</option>
                    <option value="Ade">Ade (Support #2)</option>
                    <option value="Tri">Tri (Support #3)</option>
                  </optgroup>
                  <optgroup label="Pimpinan">
                    <option value="Jasmine">Jasmine (Leader)</option>
                  </optgroup>
                </select>
              </div>
            </div>

          </div>
        </form>

        {/* Modal Footer Actions (Apple Sheet Style) */}
        <div className="no-print bg-[#fbfbfd] px-4 sm:px-5 py-3 pb-[max(env(safe-area-inset-bottom),12px)] border-t border-black/[0.08] flex items-center justify-between gap-2.5 shrink-0">
          <span className="text-xs text-[#86868b] font-normal hidden sm:inline">
            Tekan <kbd className="px-1.5 py-0.5 bg-black/[0.05] rounded-md border border-black/[0.08] font-mono text-[11px] text-[#1d1d1f] font-medium">Ctrl + Enter</kbd> untuk simpan cepat
          </span>
          <div className="flex items-center space-x-2 w-full sm:w-auto ml-auto">
            <button
              type="button"
              onClick={() => setItemModalConfig({ isOpen: false, item: null, targetBoxNumber: null })}
              className="py-2.5 sm:py-2 px-3 sm:px-4 rounded-xl text-xs font-semibold text-[#1d1d1f] bg-[#f5f5f7] hover:bg-[#ebebee] border border-black/[0.08] transition cursor-pointer text-center active:scale-95"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => setIsAiScannerOpen(true)}
              className="py-2.5 sm:py-2 px-3.5 sm:px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#0071e3] to-[#5ac8fa] hover:brightness-110 shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              title="Pindai Kartu / Tag Sampel dengan Gemini AI"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Scan Tag AI</span>
            </button>
            <button
              type="submit"
              form="direct-card-form"
              disabled={isSubmitting || !isOwner}
              className={`flex-1 sm:flex-initial py-2.5 sm:py-2 px-5 rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition flex items-center justify-center space-x-2 active:scale-98 ${
                !isOwner
                  ? 'bg-black/20 text-[#86868b] cursor-not-allowed opacity-60'
                  : 'bg-[#0071e3] hover:bg-[#0077ed] text-white cursor-pointer disabled:opacity-50'
              }`}
              title={!isOwner ? `Terkunci: Box #${formData.boxNumber} milik PPIC ${currentBoxObj?.picName}` : "Simpan item ke box (Ctrl+Enter)"}
            >
              {!isOwner ? <Lock className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              <span>
                {!isOwner
                  ? `Terkunci (${currentBoxObj?.picName || 'Lain'})`
                  : (isSubmitting 
                    ? 'Menyimpan...' 
                    : (isDuplicate ? 'Simpan Item Salinan' : (isEditing ? 'Simpan Perubahan' : (isCrossPpic ? `Bantu Simpan ke Box #${formData.boxNumber}` : 'Simpan ke Box'))))}
              </span>
            </button>
          </div>
        </div>

      </div>

      {/* Centered Blocking Reminder Modal */}
      {savedReminder && (
        <div 
          className="fixed inset-0 z-[60] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="saved-reminder-title"
        >
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden p-6 sm:p-7 space-y-5 animate-scale-in">
            
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 id="saved-reminder-title" className="text-base font-bold text-slate-900">
                  Item Berhasil Disimpan
                </h3>
                <p className="text-xs text-slate-500">
                  Perbarui kartu fisik sampel sebelum beralih ke menu lain.
                </p>
              </div>
            </div>

            {/* Instruction description */}
            <p className="text-xs text-slate-600 leading-relaxed">
              Silakan cetak sample card ATAU tuliskan kode dan lokasi berikut pada kartu fisik:
            </p>

            {/* Clean Highlight Info Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
                <span className="text-xs font-semibold text-slate-500 tracking-wide uppercase">
                  KODE SAMPLE
                </span>
                <span className="text-lg font-mono font-bold text-slate-900 tracking-wider">
                  {savedReminder.kode}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 tracking-wide uppercase">
                  LOKASI
                </span>
                <span className="text-base font-bold text-blue-700">
                  {savedReminder.lokasi}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                onClick={() => setShowPrintModal(true)}
                className="w-full min-h-[44px] py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Sample Card</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSavedReminder(null);
                  setItemModalConfig({ isOpen: false, item: null, targetBoxNumber: null });
                }}
                className="w-full min-h-[44px] py-2.5 px-4 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold border border-slate-300 transition flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              >
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Selesai (Sudah Dicatat)</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Print Modal */}
      {showPrintModal && savedReminder && (
        <CardPrintModal
          itemsToPrint={[savedReminder.itemForPrint]}
          onClose={() => {
            setShowPrintModal(false);
          }}
        />
      )}

      {/* AI Tag Scanner Modal */}
      <AiTagScannerModal
        isOpen={isAiScannerOpen}
        onClose={() => setIsAiScannerOpen(false)}
        targetBoxNumber={Number(formData.boxNumber) || targetBoxNum}
        defaultBuyer={isBuyerLocked ? stickyBuyer : formData.buyerNo}
        defaultJenisSample={isJenisLocked ? stickyJenis : formData.jenisSample}
        onApplyToForm={(extracted) => {
          setFormData((prev) => ({
            ...prev,
            style: extracted.style && extracted.style !== 'NA' ? extracted.style : prev.style,
            sampleNo: extracted.sampleNo && extracted.sampleNo !== 'NA' ? extracted.sampleNo : prev.sampleNo,
            size: extracted.size && extracted.size !== 'NA' ? extracted.size : prev.size,
            color: extracted.color && extracted.color !== 'NA' ? extracted.color : prev.color,
            buyerNo: isBuyerLocked && stickyBuyer ? stickyBuyer : (extracted.buyerNo || prev.buyerNo),
            jenisSample: isJenisLocked && stickyJenis ? stickyJenis : (extracted.jenisSample || prev.jenisSample),
            tanggal: extracted.tanggal || prev.tanggal,
            jumlah: extracted.jumlah !== undefined ? Number(extracted.jumlah) : prev.jumlah,
            satuan: 'PCE',
            track: extracted.track && extracted.track !== 'NA' ? extracted.track : prev.track,
          }));
          showNotification?.('✨ Data dari tag sampel berhasil diisi ke formulir!', 'success', 3000);
          setIsAiScannerOpen(false);
        }}
      />
    </div>
  );
};
