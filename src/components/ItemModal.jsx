import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import { supabase } from '../lib/supabase';
import { CardPrintModal } from './CardPrintModal';
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
  Sparkles,
  Edit3,
  CheckCircle2,
  Lock,
  Printer,
  Check,
} from 'lucide-react';

// Every row on the sample card is mandatory. "NA" is an accepted value when
// the information genuinely does not exist; "-" and empty text are not.
// Catatan: "kode" di-generate otomatis unik & berurutan di background agar tidak bentrok antar user.
const REQUIRED_FIELDS = [
  { key: 'track', label: 'Track' },
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

export function formatToDDMMYYYY(str) {
  if (!str || str === 'NA' || str === '-') return str || '';
  const cleanStr = String(str).trim();
  // If already dd-mm-yyyy or dd/mm/yyyy (4 digit year)
  if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(cleanStr)) {
    const parts = cleanStr.split(/[-/]/);
    return `${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}-${parts[2]}`;
  }
  // If dd-mm-yy or dd/mm/yy (2 digit year, e.g. 06-11-26) -> convert to 2026
  if (/^\d{1,2}[-/]\d{1,2}[-/]\d{2}$/.test(cleanStr)) {
    const parts = cleanStr.split(/[-/]/);
    return `${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}-20${parts[2]}`;
  }
  // If YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleanStr)) {
    const [y, m, d] = cleanStr.split('-');
    return `${d}-${m}-${y}`;
  }
  // Month name e.g. "4-Nov-2026" or "04-Nov-2026"
  const monthMap = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
  const textMatch = cleanStr.match(/^(\d{1,2})[-/ ]([A-Za-z]{3})[-/ ](\d{2,4})$/);
  if (textMatch) {
    const d = textMatch[1].padStart(2, '0');
    const m = monthMap[textMatch[2].toLowerCase()] || '01';
    let y = textMatch[3];
    if (y.length === 2) y = `20${y}`;
    return `${d}-${m}-${y}`;
  }
  return cleanStr;
}

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
        jenisSample: item.jenisSample || item.sampleType || '',
        style: item.style || item.name || item.deskripsi || '',
        sampleNo: item.sampleNo || '',
        size: item.size || '',
        color: item.color && item.color !== '-' ? item.color : '',
        jumlah: item.jumlah !== undefined && item.jumlah !== null ? item.jumlah : (item.qty || 1),
        satuan: 'PCS',
        boxNumber: bNum,
        place: item.place || defaultBoxPlace,
        status: item.status || 'In Storage',
      });
    } else {
      const defaultBoxPlace = bObj 
        ? `BOX ${bObj.boxNumber} (${bObj.rackName || 'LANTAI'} - ${bObj.picName || 'Royan'})` 
        : `BOX ${bNum}`;

      // JIT Allocation: untuk item baru, kode kosong di awal dan baru dialokasikan secara atomik saat tombol Simpan diklik
      return {
        track: itemModalConfig.prefill?.track || '',
        tanggal: formatTodayDate(),
        kode: '',
        buyerNo: itemModalConfig.prefill?.buyerNo || '',
        jenisSample: itemModalConfig.prefill?.jenisSample || '',
        style: itemModalConfig.prefill?.style || '',
        sampleNo: '',
        size: '',
        color: '',
        jumlah: 1,
        satuan: 'PCS',
        boxNumber: bNum,
        place: defaultBoxPlace,
        status: 'In Storage',
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
    const isOwnerBox = !currentUser || !boxObj?.picName || String(currentUser.name).trim().toLowerCase() === String(boxObj.picName).trim().toLowerCase();
    if (!isOwnerBox) {
      setSubmitError(`Akses ditolak: Box #${boxNum} adalah milik PIC "${boxObj?.picName}". Anda sedang login sebagai "${currentUser?.name}". Satu user tidak dapat mengedit data user lain.`);
      return;
    }

    const styleTrim = clean(formData.style);
    const sampleNoTrim = clean(formData.sampleNo);
    const buyerNoTrim = clean(formData.buyerNo);
    const sizeTrim = clean(formData.size).toUpperCase();
    const colorTrim = clean(formData.color);
    const trackClean = clean(formData.track);
    const tanggalClean = clean(formData.tanggal);
    const satuanClean = 'PCS';
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
  const isOwner = !currentUser || !currentBoxObj?.picName || String(currentUser.name).trim().toLowerCase() === String(currentBoxObj.picName).trim().toLowerCase();

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-hidden animate-fade-in print:p-0 print:bg-transparent">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-4xl overflow-hidden flex flex-col max-h-[96vh]">
        
        {/* Modal Header (Compact) */}
        <div className="no-print inventory-dialog-heading px-4 py-2.5 flex items-center justify-between border-b border-slate-800 bg-slate-900 text-white shrink-0">
          <div className="flex items-center space-x-2.5 min-w-0">
            <span className="inline-flex items-center text-xs font-bold text-amber-300 bg-amber-950/80 px-2.5 py-1 rounded border border-amber-600/50 shrink-0">
              BOX #{formData.boxNumber} ({currentBoxObj?.rackName || 'LANTAI'} - {currentBoxObj?.picName || 'Royan'})
            </span>
            {isEditing && (itemModalConfig.item?.kode || itemModalConfig.item?.sku) && (
              <span className="inline-flex items-center text-[10px] font-mono font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700 shrink-0">
                {itemModalConfig.item?.kode || itemModalConfig.item?.sku}
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              type="button"
              onClick={() => setItemModalConfig({ isOpen: false, item: null, targetBoxNumber: null })}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Read-Only Banner when box belongs to another PIC */}
        {!isOwner && (
          <div className="no-print bg-amber-50 border-b border-amber-300 text-amber-950 px-4 py-2 text-xs font-bold flex items-center gap-2.5 shrink-0">
            <Lock className="w-4 h-4 text-amber-600 shrink-0" />
            <div className="flex-1 leading-snug">
              Akses Terkunci: Box #{formData.boxNumber} dialokasikan untuk PIC <strong>{currentBoxObj?.picName}</strong>. Anda login sebagai <strong>{currentUser?.name}</strong>, sehingga tidak dapat menambah atau mengedit item pada box ini.
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
              className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] whitespace-nowrap cursor-pointer transition shadow-2xs shrink-0"
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
          <div className="bg-rose-50 border-b border-rose-300 px-3.5 py-1 text-[11px] text-rose-800 flex items-center gap-1.5 shrink-0 font-semibold">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <span>Kolom belum terisi: <strong className="text-rose-900">{Object.values(errors).filter(Boolean).join(', ')}</strong> (isi NA jika tidak ada info)</span>
          </div>
        )}

        {/* Form Body: Compact 2/3 Column Card Sub-Layout (Fits 100% on screen, ZERO scroll!) */}
        <form onSubmit={handleSubmit} id="direct-card-form" className="p-2.5 sm:p-3 bg-slate-100 flex-1 overflow-y-auto">
          <div className="bg-white border-2 border-black rounded-xl p-2.5 sm:p-3 shadow-sm space-y-1.5 text-xs">
            
            {/* BARIS 1: Track & Tanggal Sample */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
              {/* Track */}
              <div className={`border rounded-lg p-1.5 bg-white transition ${
                errors.track ? 'border-rose-500 bg-rose-50/50' : 'border-slate-300 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-400'
              }`}>
                <div className="flex items-center justify-between mb-0.5">
                  <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    Track <span className="text-rose-500">*</span>:
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(p => ({ ...p, track: 'NA' }));
                      if (errors.track) setErrors(prev => ({ ...prev, track: null }));
                    }}
                    className="text-[9px] font-black px-1.5 py-0.2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-300 transition cursor-pointer"
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
                    setFormData(p => ({ ...p, track: e.target.value }));
                    if (errors.track) setErrors(prev => ({ ...prev, track: null }));
                  }}
                  placeholder="Contoh: DHL : 5475890895 / NA"
                  className="w-full text-xs font-semibold text-slate-900 focus:outline-none font-mono bg-transparent"
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
                  <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    Tanggal Sample (DD-MM-YYYY) <span className="text-rose-500">*</span>:
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(p => ({ ...p, tanggal: formatTodayDate() }));
                        if (errors.tanggal) setErrors(prev => ({ ...prev, tanggal: null }));
                      }}
                      className="text-[9px] font-black px-1.5 py-0.2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded border border-blue-200 transition cursor-pointer"
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
                      className="text-[9px] font-black px-1.5 py-0.2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-300 transition cursor-pointer"
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
                    placeholder="dd-mm-yyyy (contoh: 06-11-2026) / NA"
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

            {/* BARIS 2: Buyer No (Kode Sample & Lokasi Box Otomatis Mengikuti Box Terpilih) */}
            <div className={`border rounded-lg p-1.5 bg-white transition ${
              errors.buyerNo ? 'border-rose-500 bg-rose-50/50' : 'border-slate-300 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-400'
            }`}>
              <div className="flex items-center justify-between mb-0.5">
                <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                  Buyer No <span className="text-rose-500">*</span>:
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setFormData(p => ({ ...p, buyerNo: 'NA' }));
                    if (errors.buyerNo) setErrors(prev => ({ ...prev, buyerNo: null }));
                  }}
                  className="text-[9px] font-black px-1.5 py-0.2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-300 transition cursor-pointer"
                >
                  + NA
                </button>
              </div>
              <input
                type="text"
                list="buyer-datalist"
                value={formData.buyerNo}
                onChange={(e) => {
                  setFormData(p => ({ ...p, buyerNo: e.target.value.toUpperCase() }));
                  if (errors.buyerNo) setErrors(prev => ({ ...prev, buyerNo: null }));
                }}
                placeholder="Contoh: RSD-250015-2 / NA"
                className="w-full text-xs font-bold font-mono uppercase focus:outline-none bg-transparent"
              />
              <datalist id="buyer-datalist">
                {(suggestions.buyerNo || []).map((b, idx) => (
                  <option key={`by-${idx}`} value={b} />
                ))}
              </datalist>
            </div>

            {/* BARIS 3: Jenis Sample (Chip Buttons) & Deskripsi / Style */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-1.5 items-center">
              {/* Jenis Sample Pills */}
              <div className={`md:col-span-6 border rounded-lg p-1.5 bg-white transition ${
                errors.jenisSample ? 'border-rose-500 bg-rose-50/50 ring-1 ring-rose-400' : 'border-slate-300'
              }`}>
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Jenis Sample <span className="text-rose-500">*</span>:
                </label>
                <div className="flex items-center gap-1">
                  {['DEVELOP', 'PPS', 'ORI', 'BULK SAMPLE', 'ARSIP'].map((type) => {
                    const isSelected = formData.jenisSample === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          setFormData(p => ({ ...p, jenisSample: type }));
                          if (errors.jenisSample) setErrors(prev => ({ ...prev, jenisSample: null }));
                        }}
                        className={`flex-1 py-1 px-1 rounded-md text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition border cursor-pointer text-center whitespace-nowrap ${
                          isSelected
                            ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                        }`}
                      >
                        {isSelected && <span className="text-amber-300 mr-0.5">✓</span>}
                        {type}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Nama / No. Style */}
              <div className={`md:col-span-6 border rounded-lg p-1.5 bg-white transition ${
                errors.style ? 'border-rose-500 bg-rose-50/50' : 'border-slate-300 focus-within:border-blue-500'
              }`}>
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-0.5">
                  Nama / No. Style <span className="text-rose-500">*</span>:
                </label>
                <input
                  type="text"
                  list="style-datalist"
                  value={formData.style}
                  onChange={(e) => {
                    setFormData(p => ({ ...p, style: e.target.value }));
                    if (errors.style) setErrors(prev => ({ ...prev, style: null }));
                  }}
                  placeholder="Contoh: WL920FR / 6435 / NA"
                  className="w-full text-xs font-bold text-slate-900 focus:outline-none bg-transparent"
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
              <div className={`md:col-span-4 border rounded-lg p-1.5 bg-white transition ${
                errors.sampleNo ? 'border-rose-500 bg-rose-50/50' : 'border-slate-300 focus-within:border-blue-500'
              }`}>
                <div className="flex items-center justify-between mb-0.5">
                  <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    Sample No <span className="text-rose-500">*</span>:
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(p => ({ ...p, sampleNo: 'NA' }));
                      if (errors.sampleNo) setErrors(prev => ({ ...prev, sampleNo: null }));
                    }}
                    className="text-[9px] font-black px-1.5 py-0.2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-300 transition cursor-pointer"
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
                  placeholder="RSD-250015-2 / NA"
                  className="w-full text-xs font-mono font-bold uppercase focus:outline-none bg-transparent"
                />
                <datalist id="sampleno-datalist">
                  {(suggestions.sampleNo || []).map((sn, idx) => (
                    <option key={`sno-${idx}`} value={sn} />
                  ))}
                </datalist>
              </div>

              {/* Size dengan 1-Click Chips */}
              <div className={`md:col-span-4 border rounded-lg p-1.5 bg-white transition ${
                errors.size ? 'border-rose-500 bg-rose-50/50' : 'border-slate-300 focus-within:border-blue-500'
              }`}>
                <div className="flex items-center justify-between mb-0.5">
                  <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    Size <span className="text-rose-500">*</span>:
                  </label>
                  <div className="flex items-center gap-0.5">
                    {['S', 'M', 'L', 'XL', 'FREE', 'NA'].map(sz => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => {
                          setFormData(p => ({ ...p, size: sz }));
                          if (errors.size) setErrors(prev => ({ ...prev, size: null }));
                        }}
                        className={`px-1 py-0.2 rounded text-[9px] font-bold transition cursor-pointer ${
                          formData.size === sz ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                        }`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  type="text"
                  list="size-datalist"
                  value={formData.size}
                  onChange={(e) => {
                    setFormData(p => ({ ...p, size: e.target.value.toUpperCase() }));
                    if (errors.size) setErrors(prev => ({ ...prev, size: null }));
                  }}
                  placeholder="Ketik atau klik chip di atas..."
                  className="w-full text-xs font-black uppercase focus:outline-none bg-transparent"
                />
                <datalist id="size-datalist">
                  {(suggestions.size || []).map((sz, idx) => (
                    <option key={`sz-${idx}`} value={sz} />
                  ))}
                </datalist>
              </div>

              {/* Color dengan 1-Click Chips */}
              <div className={`md:col-span-4 border rounded-lg p-1.5 bg-white transition ${
                errors.color ? 'border-rose-500 bg-rose-50/50' : 'border-slate-300 focus-within:border-blue-500'
              }`}>
                <div className="flex items-center justify-between mb-0.5">
                  <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    Color / Warna <span className="text-rose-500">*</span>:
                  </label>
                  <div className="flex items-center gap-0.5">
                    {['BLACK', 'WHITE', 'NAVY', 'GREY', 'NA'].map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => {
                          setFormData(p => ({ ...p, color: c }));
                          if (errors.color) setErrors(prev => ({ ...prev, color: null }));
                        }}
                        className={`px-1 py-0.2 rounded text-[9px] font-bold transition cursor-pointer ${
                          formData.color === c ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  type="text"
                  list="color-datalist"
                  value={formData.color}
                  onChange={(e) => {
                    setFormData(p => ({ ...p, color: e.target.value.toUpperCase() }));
                    if (errors.color) setErrors(prev => ({ ...prev, color: null }));
                  }}
                  placeholder="Ketik atau klik chip di atas..."
                  className="w-full text-xs font-bold uppercase focus:outline-none bg-transparent"
                />
                <datalist id="color-datalist">
                  {(suggestions.color || []).map((c, idx) => (
                    <option key={`c-${idx}`} value={c} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* BARIS 5: Jumlah (Qty) & Satuan */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
              {/* Jumlah */}
              <div className={`border rounded-lg p-1.5 bg-white transition ${
                errors.jumlah ? 'border-rose-500 bg-rose-50/50' : 'border-slate-300 focus-within:border-blue-500'
              }`}>
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-0.5">
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
                  className="w-full text-xs font-black font-mono focus:outline-none bg-transparent"
                />
              </div>

              {/* Satuan (Terkunci ke PCS) */}
              <div className="border border-slate-300 rounded-lg p-1.5 bg-slate-50/80 transition">
                <div className="flex items-center justify-between mb-0.5">
                  <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    Satuan <span className="text-rose-500">*</span>:
                  </label>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-100 text-blue-700 border border-blue-200">
                    PCS
                  </span>
                </div>
                <input
                  type="text"
                  value="PCS"
                  readOnly
                  disabled
                  className="w-full text-xs font-black font-mono text-slate-800 bg-transparent cursor-not-allowed select-none focus:outline-none"
                />
              </div>
            </div>

          </div>
        </form>

        {/* Modal Footer Actions (Sticky, Always visible) */}
        <div className="no-print bg-white px-4 py-2 border-t border-slate-200 flex items-center justify-between gap-2 shrink-0">
          <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
            💡 Tekan <kbd className="px-1.5 py-0.5 bg-slate-100 rounded border border-slate-300 font-mono text-[10px] text-slate-700 font-bold">Ctrl + Enter</kbd> untuk simpan cepat
          </span>
          <div className="flex items-center space-x-2 ml-auto">
            <button
              type="button"
              onClick={() => setItemModalConfig({ isOpen: false, item: null, targetBoxNumber: null })}
              className="px-4 py-1.5 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              form="direct-card-form"
              disabled={isSubmitting || !isOwner}
              className={`px-5 py-1.5 rounded-xl text-xs font-black shadow-md transition flex items-center space-x-1.5 ${
                !isOwner
                  ? 'bg-slate-400 text-white cursor-not-allowed opacity-60'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20 cursor-pointer disabled:opacity-50'
              }`}
              title={!isOwner ? `Terkunci: Box #${formData.boxNumber} milik PIC ${currentBoxObj?.picName}` : "Simpan item ke box (Ctrl+Enter)"}
            >
              {!isOwner ? <Lock className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              <span>
                {!isOwner
                  ? `Terkunci (${currentBoxObj?.picName || 'Lain'})`
                  : (isSubmitting 
                    ? 'Menyimpan...' 
                    : (isDuplicate ? 'Simpan Item Salinan' : (isEditing ? 'Simpan Perubahan' : 'Simpan ke Box')))}
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
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden p-6 sm:p-7 space-y-5 animate-scale-in">
            
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
    </div>
  );
};
