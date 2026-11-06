import React, { useState, useEffect, useRef } from 'react';
import { useInventory } from '../context/InventoryContext';
import { CardPrintModal } from './CardPrintModal';
import { supabase } from '../lib/supabase';
import { resolveUniqueCode, getNextSampleCode, getNextMaterialCode, reserveCode, releaseCode } from '../utils/sequenceResolver';
import { 
  X, 
  Save, 
  Printer, 
  MapPin,
  AlertCircle,
  AlertTriangle,
  Calendar,
  Info,
  Sparkles,
  Edit3,
  CheckCircle2
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
  { key: 'place', label: 'Place' },
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
    showNotification
  } = useInventory();

  const hiddenDateRef = useRef(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [savedItemReminder, setSavedItemReminder] = useState(null);
  const [itemToPrintFromReminder, setItemToPrintFromReminder] = useState(null);

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

    const generateCode = () => {
      const c = isMat 
        ? getNextMaterialCode(items, clientIdRef.current) 
        : getNextSampleCode(items, clientIdRef.current);
      reserveCode(c, clientIdRef.current);
      return c;
    };

    if (itemModalConfig.item) {
      const item = itemModalConfig.item;
      const defaultBoxPlace = bObj 
        ? `BOX ${bObj.boxNumber} (${bObj.rackName || 'LANTAI'} - ${bObj.picName || 'Royan'})` 
        : `BOX ${bNum}`;

      const codeVal = isDuplicate ? generateCode() : (item.kode || item.sku || generateCode());
      if (isDuplicate) reserveCode(codeVal, clientIdRef.current);

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
        satuan: item.satuan || item.unit || (isMat ? 'MTR' : 'PCS'),
        boxNumber: bNum,
        place: item.place || defaultBoxPlace,
        status: item.status || 'In Storage',
      });
    } else {
      const defaultBoxPlace = bObj 
        ? `BOX ${bObj.boxNumber} (${bObj.rackName || 'LANTAI'} - ${bObj.picName || 'Royan'})` 
        : `BOX ${bNum}`;
      const codeVal = generateCode();

      return {
        track: '',
        tanggal: formatTodayDate(),
        kode: codeVal,
        buyerNo: '',
        jenisSample: '',
        style: '',
        sampleNo: '',
        size: '',
        color: '',
        jumlah: 1,
        satuan: isMat ? 'MTR' : 'PCS',
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

  // Handle Box Number change directly without heavy 72-option select
  const handleBoxNumberChange = (num) => {
    const boxNum = Math.max(1, Math.min(72, Number(num) || 1));
    const targetBox = boxes.find(b => Number(b.boxNumber) === boxNum);
    const properPlace = targetBox
      ? `BOX ${targetBox.boxNumber} (${targetBox.rackName || 'LANTAI'} - ${targetBox.picName || 'Royan'})`
      : `BOX ${boxNum}`;
    
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

    const styleTrim = clean(formData.style);
    const sampleNoTrim = clean(formData.sampleNo);
    const buyerNoTrim = clean(formData.buyerNo);
    const sizeTrim = clean(formData.size).toUpperCase();
    const colorTrim = clean(formData.color);
    const trackClean = clean(formData.track);
    const tanggalClean = clean(formData.tanggal);
    const satuanClean = clean(formData.satuan).toUpperCase();
    const placeClean = clean(formData.place) || (boxObj ? `BOX ${boxNum} (${boxObj.rackName} - ${boxObj.picName})` : `BOX ${boxNum}`);
    const fullDeskripsi = sampleNoTrim
      ? `${styleTrim} - Sample: ${sampleNoTrim} - Size: ${sizeTrim}`
      : `${styleTrim} - Size: ${sizeTrim}`;

    setIsSubmitting(true);
    setSubmitError(null);

    // Live multi-user sequence check: cari urutan nomor tertinggi terbaru agar kode selalu unik & urut
    let activeItems = [...items];
    if (supabase) {
      try {
        const { data: remoteRecent } = await supabase
          .from('items')
          .select('id, kode, sku')
          .order('id', { ascending: false })
          .limit(100);
        if (Array.isArray(remoteRecent) && remoteRecent.length > 0) {
          const knownIds = new Set(activeItems.map(i => String(i.id)));
          remoteRecent.forEach(ri => {
            if (!knownIds.has(String(ri.id))) {
              activeItems.push({ id: ri.id, kode: ri.kode, sku: ri.sku });
            }
          });
        }
      } catch (e) {
        console.warn('Live sequence check fallback to local:', e);
      }
    }

    // Tentukan kode sample/material unik berurutan: jika edit pakai kode asal, jika baru auto-generate urut unik
    let finalKode;
    if (isEditing && (itemModalConfig.item?.kode || itemModalConfig.item?.sku)) {
      finalKode = itemModalConfig.item.kode || itemModalConfig.item.sku;
    } else {
      const desiredCode = formData.kode || (isMaterialBox ? getNextMaterialCode(activeItems) : getNextSampleCode(activeItems));
      const resolvedCode = resolveUniqueCode(desiredCode, activeItems, currentItemId);
      finalKode = resolvedCode.finalCode;
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
      let savedResult;
      if (isEditing) {
        savedResult = await updateItem(itemModalConfig.item.id, payload);
      } else {
        savedResult = await addItem(payload);
      }

      // Tampilkan reminder wajib: Print Card Sample ATAU Tulis Kode & Place di Kartu Lama
      setSavedItemReminder({
        item: savedResult || { ...payload, id: 'temp-' + Date.now() },
        boxNumber: boxNum,
        place: placeClean,
        kode: finalKode,
        style: styleTrim,
      });

      // Notif mention saja tanpa memunculkan nomor
      showNotification?.(
        '⚠️ PENGINGAT WAJIB: Item tersimpan! Segera cetak kartu sample baru ATAU tuliskan Kode & Place di kartu fisik!',
        'warning',
        8000
      );
    } catch (err) {
      console.error('Error saat menyimpan item:', err);
      setSubmitError(err?.message || 'Gagal menyimpan perubahan. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentBoxObj = boxes.find(b => Number(b.boxNumber) === Number(formData.boxNumber));

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-hidden animate-fade-in print:p-0 print:bg-transparent">
      <div className={`bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-4xl overflow-hidden flex flex-col max-h-[96vh] ${showPrintModal ? 'no-print' : ''}`}>
        
        {/* Modal Header (Compact) */}
        <div className="no-print inventory-dialog-heading px-4 py-2.5 flex items-center justify-between border-b border-slate-800 bg-slate-900 text-white shrink-0">
          <div className="flex items-center space-x-2.5 min-w-0">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-blue-500 text-white text-[10px] font-black shrink-0">
              KTP
            </span>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-black tracking-tight uppercase truncate">
                {isDuplicate 
                  ? `Copy / Duplikat Item (Box #${formData.boxNumber})` 
                  : (isEditing ? `Edit Kartu Sampel (Box #${formData.boxNumber})` : `Kartu Fisik KTP (Box #${formData.boxNumber})`)}
              </h3>
            </div>
            {isEditing && (itemModalConfig.item?.kode || itemModalConfig.item?.sku) && (
              <span className="hidden sm:inline-flex items-center text-[10px] font-mono font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700 shrink-0">
                {itemModalConfig.item?.kode || itemModalConfig.item?.sku}
              </span>
            )}
            <span className="hidden sm:inline-flex items-center text-[11px] font-bold text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-600/50 shrink-0">
              BOX #{formData.boxNumber} ({currentBoxObj?.rackName || 'LANTAI'} - {currentBoxObj?.picName || 'Royan'})
            </span>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowPrintModal(true)}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border border-slate-700 cursor-pointer shadow-2xs"
              title="Cetak Multiple Card Ukuran KTP dalam 1 Lembar A4"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Cetak Multi-KTP</span>
            </button>
            <button
              type="button"
              onClick={() => setItemModalConfig({ isOpen: false, item: null, targetBoxNumber: null })}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Top Warning Banner: Mandatory Reminder */}
        {submitError ? (
          <div className="bg-rose-50 border-b border-rose-300 text-rose-900 px-3.5 py-1 text-xs font-bold flex items-center gap-2 shrink-0">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <span className="truncate">{submitError}</span>
          </div>
        ) : (
          <div className="bg-amber-500/10 border-b border-amber-300/60 text-amber-950 px-3 py-1 text-[11px] font-semibold flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>
                <strong>REMINDER WAJIB:</strong> Setelah simpan, wajib <strong>Print Card Baru (KTP)</strong> ATAU <strong>Tulis Kode & Place di Kartu Lama</strong>.
              </span>
            </div>
            <span className="text-[10px] text-amber-800 font-bold shrink-0 hidden md:inline">
              *Kode otomatis dibuat unik & berurutan (tidak perlu diketik)
            </span>
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

            {/* BARIS 2: Buyer No & Place / Lokasi (Kode Sample Otomatis Unik di Background) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
              {/* Buyer No */}
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

              {/* Place (Ringan & Cepat: Box Badge + Stepper / Input, No 72-item select lag!) */}
              <div className="border border-slate-300 rounded-lg p-1.5 bg-slate-50 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-0.5">
                  <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    Place / Lokasi <span className="text-rose-500">*</span>:
                  </label>
                  <span className="text-[9px] text-slate-500 font-semibold">Box 1 - 72</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="flex-1 min-w-0 bg-white px-2 py-0.5 rounded border border-slate-200 font-bold text-[11px] text-slate-800 truncate" title={formData.place}>
                    BOX #{formData.boxNumber} ({currentBoxObj?.rackName || 'LANTAI'})
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[10px] font-bold text-slate-400">#</span>
                    <input
                      type="number"
                      min="1"
                      max="72"
                      value={formData.boxNumber}
                      onChange={(e) => handleBoxNumberChange(e.target.value)}
                      className="w-12 px-1.5 py-0.5 bg-white border border-slate-300 rounded text-center text-xs font-black font-mono focus:outline-none focus:border-blue-500"
                      title="Ganti nomor Box (1 - 72)"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* BARIS 3: Jenis Sample (Chip Buttons) & Deskripsi / Style */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-1.5 items-center">
              {/* Jenis Sample Pills */}
              <div className={`md:col-span-4 border rounded-lg p-1.5 bg-white transition ${
                errors.jenisSample ? 'border-rose-500 bg-rose-50/50 ring-1 ring-rose-400' : 'border-slate-300'
              }`}>
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Jenis Sample <span className="text-rose-500">*</span>:
                </label>
                <div className="flex items-center gap-1">
                  {['DEVELOP', 'PPS', 'ORI'].map((type) => {
                    const isSelected = formData.jenisSample === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          setFormData(p => ({ ...p, jenisSample: type }));
                          if (errors.jenisSample) setErrors(prev => ({ ...prev, jenisSample: null }));
                        }}
                        className={`flex-1 py-1 rounded-md text-[11px] font-black uppercase tracking-wider transition border cursor-pointer text-center ${
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
              <div className={`md:col-span-8 border rounded-lg p-1.5 bg-white transition ${
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

              {/* Satuan */}
              <div className={`border rounded-lg p-1.5 bg-white transition ${
                errors.satuan ? 'border-rose-500 bg-rose-50/50' : 'border-slate-300 focus-within:border-blue-500'
              }`}>
                <div className="flex items-center justify-between mb-0.5">
                  <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    Satuan <span className="text-rose-500">*</span>:
                  </label>
                  <div className="flex items-center gap-1">
                    {['PCS', 'YARD', 'MTR', 'ROLL', 'NA'].map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => {
                          setFormData(p => ({ ...p, satuan: s }));
                          if (errors.satuan) setErrors(prev => ({ ...prev, satuan: null }));
                        }}
                        className={`px-1.5 py-0.2 rounded text-[9px] font-bold transition cursor-pointer ${
                          formData.satuan === s ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  type="text"
                  value={formData.satuan}
                  onChange={(e) => {
                    setFormData(p => ({ ...p, satuan: e.target.value.toUpperCase() }));
                    if (errors.satuan) setErrors(prev => ({ ...prev, satuan: null }));
                  }}
                  placeholder="PCS / YARD / MTR / NA"
                  className="w-full text-xs font-bold uppercase focus:outline-none bg-transparent"
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
              disabled={isSubmitting}
              className="px-5 py-1.5 rounded-xl text-xs font-black shadow-md transition flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20 cursor-pointer disabled:opacity-50"
              title="Simpan item ke box (Ctrl+Enter)"
            >
              <Save className="w-4 h-4" />
              <span>
                {isSubmitting 
                  ? 'Menyimpan...' 
                  : (isDuplicate ? 'Simpan Item Salinan' : (isEditing ? 'Simpan Perubahan' : 'Simpan ke Box'))}
              </span>
            </button>
          </div>
        </div>

      </div>

      {/* Modal Pengingat Wajib: Print Card Sample / Update Kartu Lama */}
      {savedItemReminder && (
        <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-fade-in no-print">
          <div className="bg-white rounded-2xl shadow-2xl border-2 border-amber-500 w-full max-w-md overflow-hidden flex flex-col p-5 animate-scale-up">
            
            {/* Header Icon */}
            <div className="flex items-center gap-3 border-b border-amber-200 pb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-1.5">
                  <span>PENGINGAT WAJIB!</span>
                  <span className="px-1.5 py-0.2 bg-rose-600 text-white text-[9px] font-black rounded uppercase">WAJIB</span>
                </h3>
                <p className="text-[11px] font-bold text-amber-700">
                  Print Kartu Baru atau Update Kartu Lama
                </p>
              </div>
            </div>

            {/* Info Item */}
            <div className="my-3.5 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold">Kode Sample:</span>
                <span className="font-mono font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-sm">
                  {savedItemReminder.kode}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold">Place / Lokasi:</span>
                <span className="font-bold text-slate-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  {savedItemReminder.place}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold">Style / Barang:</span>
                <span className="font-bold text-slate-900 truncate max-w-[200px]" title={savedItemReminder.style}>
                  {savedItemReminder.style}
                </span>
              </div>
            </div>

            {/* Pesan Instruksi Wajib */}
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-950 text-xs leading-relaxed space-y-1.5">
              <p className="font-black text-amber-900 flex items-center gap-1">
                <span>⚠️</span>
                <span>INSTRUKSI WAJIB BAGIAN GUDANG / R&D:</span>
              </p>
              <p className="font-medium text-slate-800 text-[11.5px]">
                Item telah tersimpan. Anda <strong>WAJIB</strong> lakukan salah satu:
              </p>
              <div className="space-y-1.5 text-slate-800 font-semibold text-[11px] pl-1">
                <div className="flex items-start gap-1.5">
                  <span className="text-blue-600 font-black">1.</span>
                  <span><strong>CETAK CARD SAMPLE BARU</strong> (Ukuran KTP) untuk fisik sampel ini, <em>ATAU</em></span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="text-amber-700 font-black">2.</span>
                  <span><strong>TULISKAN MANUAL</strong> keterangan <strong>Kode Sample ({savedItemReminder.kode})</strong> dan <strong>Place ({savedItemReminder.place})</strong> pada kartu lama!</span>
                </div>
              </div>
            </div>

            {/* Tombol Aksi */}
            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setItemToPrintFromReminder(savedItemReminder.item);
                }}
                className="w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-black shadow-md shadow-blue-900/20 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4 text-amber-300" />
                <span>🖨️ Cetak Card Sample Sekarang (Ukuran KTP)</span>
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setSavedItemReminder(null);
                  setItemModalConfig({ isOpen: false, item: null, targetBoxNumber: null });
                }}
                className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold border border-slate-300 transition cursor-pointer text-center"
              >
                ✓ Selesai (Sudah Ditulis di Kartu Lama)
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Multi-Card A4 Print Modal */}
      {(showPrintModal || itemToPrintFromReminder) && (
        <CardPrintModal 
          itemsToPrint={[itemToPrintFromReminder || formData]} 
          onClose={() => {
            setShowPrintModal(false);
            if (itemToPrintFromReminder) {
              setItemToPrintFromReminder(null);
              setSavedItemReminder(null);
              setItemModalConfig({ isOpen: false, item: null, targetBoxNumber: null });
            }
          }} 
        />
      )}
    </div>
  );
};
