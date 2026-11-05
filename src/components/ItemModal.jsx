import React, { useState, useEffect, useRef } from 'react';
import { useInventory } from '../context/InventoryContext';
import { RACK_GROUPS, DEFAULT_PLACES } from '../data/simpleData';
import { CardPrintModal } from './CardPrintModal';
import { SuggestionInput } from './SuggestionInput';
import { supabase } from '../lib/supabase';
import { resolveUniqueCode, getNextSampleCode } from '../utils/sequenceResolver';
import { 
  X, 
  Save, 
  Printer, 
  MapPin,
  AlertCircle,
  AlertTriangle,
  Calendar,
  Info,
  Sparkles
} from 'lucide-react';

// Every row on the sample card is mandatory. "NA" is an accepted value when
// the information genuinely does not exist; "-" and empty text are not.
const REQUIRED_FIELDS = [
  { key: 'track', label: 'Track' },
  { key: 'tanggal', label: 'Tanggal Sample' },
  { key: 'kode', label: 'Kode' },
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
  'track', 'tanggal', 'kode', 'buyerNo', 'jenisSample', 'style',
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

  const isDuplicate = Boolean(itemModalConfig.isDuplicate);
  const isEditing = Boolean(itemModalConfig.item && !isDuplicate);
  const targetBoxNum = Number(itemModalConfig.targetBoxNumber) || (itemModalConfig.item ? Number(itemModalConfig.item.boxNumber) : 1);

  function formatTodayDate() {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    return `${now.getDate()}-${months[now.getMonth()]}-${now.getFullYear()}`;
  }

  const [formData, setFormData] = useState(() => {
    if (itemModalConfig.item) {
      const item = itemModalConfig.item;
      const bNum = Number(item.boxNumber) || targetBoxNum;
      const bObj = boxes.find(b => Number(b.boxNumber) === Number(bNum));
      const defaultBoxPlace = bObj 
        ? `BOX ${bObj.boxNumber} (${bObj.rackName || 'LANTAI'} - ${bObj.picName || 'Royan'})` 
        : `BOX ${bNum}`;

      return fillBlankWithNA({
        track: item.track || '',
        tanggal: item.tanggal || item.dateIn || formatTodayDate(),
        kode: isDuplicate ? getNextSampleCode(items) : (item.kode || item.sku || getNextSampleCode(items)),
        buyerNo: item.buyerNo || item.buyerNumber || '',
        jenisSample: item.jenisSample || item.sampleType || 'DEVELOP',
        style: item.style || item.name || item.deskripsi || '',
        sampleNo: item.sampleNo || '',
        size: item.size || '',
        color: item.color && item.color !== '-' ? item.color : '',
        jumlah: item.jumlah !== undefined && item.jumlah !== null ? item.jumlah : (item.qty || 1),
        satuan: item.satuan || item.unit || 'PCS',
        boxNumber: bNum,
        place: item.place || defaultBoxPlace,
        status: item.status || 'In Storage',
      });
    } else {
      const bNum = targetBoxNum || 1;
      const bObj = boxes.find(b => Number(b.boxNumber) === Number(bNum));
      const defaultBoxPlace = bObj 
        ? `BOX ${bObj.boxNumber} (${bObj.rackName || 'LANTAI'} - ${bObj.picName || 'Royan'})` 
        : `BOX ${bNum}`;

      return {
        track: '',
        tanggal: formatTodayDate(),
        kode: getNextSampleCode(items),
        buyerNo: '',
        jenisSample: 'DEVELOP',
        style: '',
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

  const [errors, setErrors] = useState({});

  const currentItemId = isEditing ? itemModalConfig.item?.id : null;

  // Real-time check if entered code already exists in another item in the database
  const existingItemWithSameCode = React.useMemo(() => {
    const entered = String(formData.kode || '').trim().toUpperCase();
    if (!entered || entered === 'NA') return null;
    return items.find(i => 
      String(i.id) !== String(currentItemId) &&
      String(i.kode || i.sku || '').trim().toUpperCase() === entered
    );
  }, [formData.kode, items, currentItemId]);

  const autoResolvedCode = React.useMemo(() => {
    if (!existingItemWithSameCode) return formData.kode;
    return resolveUniqueCode(formData.kode, items, currentItemId).finalCode;
  }, [formData.kode, items, currentItemId, existingItemWithSameCode]);

  // Dynamic rack groupings from live `boxes`
  const dynamicRackGroups = React.useMemo(() => {
    const validBoxes = [...boxes]
      .filter((b) => Number(b.boxNumber) < 900000 && Number(b.boxNumber) > 0)
      .sort((a, b) => Number(a.boxNumber) - Number(b.boxNumber));

    const groupMap = new Map();

    validBoxes.forEach((b) => {
      const rackName = b.rackName || (Number(b.rackId) === 0 ? 'LANTAI' : 'RACK 1');
      if (!groupMap.has(rackName)) {
        groupMap.set(rackName, []);
      }
      const placeVal = `BOX ${b.boxNumber} (${rackName} - ${b.picName || 'Royan'})`;
      groupMap.get(rackName).push({
        boxNumber: b.boxNumber,
        value: placeVal,
        label: `BOX #${b.boxNumber} — PIC: ${b.picName || 'Royan'}`,
      });
    });

    return Array.from(groupMap.entries()).map(([name, bList]) => ({
      name,
      boxes: bList,
    }));
  }, [boxes]);

  const allKnownPlaces = React.useMemo(() => {
    const set = new Set();
    dynamicRackGroups.forEach(rg => rg.boxes.forEach(b => set.add(b.value)));
    return set;
  }, [dynamicRackGroups]);

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

  // Handle Date picker selection from calendar popup
  const handleDatePickerChange = (e) => {
    const val = e.target.value; // Format: "YYYY-MM-DD"
    if (!val) return;
    const parts = val.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const monthIdx = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const formatted = `${day}-${months[monthIdx]}-${year}`;
      setFormData(prev => ({ ...prev, tanggal: formatted }));
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
    const kodeClean = clean(formData.kode);
    const satuanClean = clean(formData.satuan).toUpperCase();
    const placeClean = clean(formData.place) || (boxObj ? `BOX ${boxNum} (${boxObj.rackName} - ${boxObj.picName})` : `BOX ${boxNum}`);
    const fullDeskripsi = sampleNoTrim
      ? `${styleTrim} - Sample: ${sampleNoTrim} - Size: ${sizeTrim}`
      : `${styleTrim} - Size: ${sizeTrim}`;

    setIsSubmitting(true);
    setSubmitError(null);

    // JIKA KODE SUDAH ADA MAKA TIDAK BISA SIMPAN
    if (existingItemWithSameCode) {
      setIsSubmitting(false);
      setSubmitError(
        `❌ TIDAK BISA SIMPAN: Kode "${formData.kode}" sudah terdaftar di BOX #${existingItemWithSameCode.boxNumber || '?'} (${existingItemWithSameCode.style || existingItemWithSameCode.name || 'Barang lain'})! Kode tidak boleh sama. Silakan ubah kode menjadi "${autoResolvedCode}" terlebih dahulu.`
      );
      showNotification?.(
        `❌ Tidak bisa simpan! Kode "${formData.kode}" sudah ada di sistem. Ubah kode terlebih dahulu agar bisa disimpan.`,
        'error',
        7000
      );
      return;
    }

    // Live multi-user sequence collision check right before save
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

    const resolvedCode = resolveUniqueCode(kodeClean, activeItems, currentItemId);
    const finalKode = resolvedCode.finalCode;

    // JIKA KODE TERNYATA SUDAH DIGUNAKAN DI REMOTE / MULTI-USER -> TIDAK BISA SIMPAN!
    if (resolvedCode.wasAdjusted) {
      setIsSubmitting(false);
      setSubmitError(
        `❌ TIDAK BISA SIMPAN: Kode "${resolvedCode.originalCode || kodeClean}" baru saja disimpan oleh pengguna lain! Kode tidak boleh sama. Silakan ubah ke kode "${resolvedCode.finalCode}" agar bisa disimpan.`
      );
      showNotification?.(
        `❌ Tidak bisa simpan! Kode "${resolvedCode.originalCode || kodeClean}" sudah ada di sistem. Silakan ganti ke "${resolvedCode.finalCode}".`,
        'error',
        8000
      );
      return;
    }

    const payload = {
      track: trackClean,
      tanggal: tanggalClean,
      kode: finalKode,
      buyerNo: buyerNoTrim,
      jenisSample: clean(formData.jenisSample) || 'DEVELOP',
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
      setItemModalConfig({ isOpen: false, item: null, targetBoxNumber: null });
    } catch (err) {
      console.error('Error saat menyimpan item:', err);
      setSubmitError(err?.message || 'Gagal menyimpan perubahan. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentBoxObj = boxes.find(b => Number(b.boxNumber) === Number(formData.boxNumber));

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in print:p-0 print:bg-transparent">
      <div className={`bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-2xl overflow-hidden flex flex-col max-h-[96vh] ${showPrintModal ? 'no-print' : ''}`}>
        
        {/* Modal Header */}
        <div className="no-print inventory-dialog-heading px-5 py-3.5 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-3">
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-black tracking-tight text-slate-900 uppercase">
                  {isDuplicate 
                    ? `Copy / Duplikat Item (Box #${formData.boxNumber})` 
                    : (isEditing ? `Edit Kartu Sampel (Box #${formData.boxNumber})` : `Kartu Fisik KTP (Box #${formData.boxNumber})`)}
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Ketik langsung pada baris kartu sampel di bawah ini:
              </p>
            </div>
          </div>
          <button
            onClick={() => setItemModalConfig({ isOpen: false, item: null, targetBoxNumber: null })}
            className="text-slate-500 hover:text-slate-900 p-1.5 rounded-lg hover:bg-slate-200 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error / Warning Alert message */}
        {submitError && (
          <div className="mx-4 mt-3 px-3.5 py-2.5 rounded-xl border-2 text-xs font-bold flex items-center gap-2.5 shrink-0 animate-fade-in shadow-xs bg-rose-50 border-rose-400 text-rose-950">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span className="leading-snug flex-1">{submitError}</span>
            {existingItemWithSameCode && (
              <button
                type="button"
                onClick={() => {
                  setFormData(prev => ({ ...prev, kode: autoResolvedCode }));
                  setSubmitError(null);
                }}
                className="no-print shrink-0 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-black rounded-lg shadow-sm transition cursor-pointer flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Pakai Kode {autoResolvedCode}</span>
              </button>
            )}
          </div>
        )}

        {/* Modal Body: Direct Interactive Card (Enlarged for Optimal Visibility) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 flex flex-col items-center justify-center">

          {/* Hint: every column is mandatory, use NA when there is no information */}
          <div className="no-print w-full max-w-[580px] mb-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-900">
            <Info className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" aria-hidden="true" />
            <p>
              <strong>Semua kolom wajib diisi.</strong> Jika tidak ada informasi, isi dengan{' '}
              <span className="rounded border border-amber-300 bg-white px-1 font-mono font-black">NA</span>.
              {' '}Tanggal Sample diisi tanggal sample (contoh <span className="font-mono">5-Nov-2026</span>) atau{' '}
              <span className="rounded border border-amber-300 bg-white px-1 font-mono font-black">NA</span>.
            </p>
          </div>

          {/* Validation Alert */}
          {Object.keys(errors).length > 0 && (
            <div className="no-print w-full max-w-[580px] mb-3 p-3 bg-rose-50 border-2 border-rose-400 rounded-xl text-rose-800 text-xs flex items-start space-x-2.5 shadow-sm animate-fade-in">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
              <div>
                <p className="font-bold text-rose-900">Kolom Wajib Belum Diisi (*):</p>
                <p className="font-semibold mt-0.5 text-rose-700">
                  {Object.values(errors).filter(Boolean).join(' • ')}
                </p>
                <p className="mt-1 text-rose-700">Jika tidak ada informasi, isi dengan <strong>NA</strong>.</p>
              </div>
            </div>
          )}

          {/* Notice: Kode Sudah Ada -> TIDAK BISA SIMPAN */}
          {existingItemWithSameCode && (
            <div className="no-print w-full max-w-[580px] mb-3 p-3.5 bg-rose-50 border-2 border-rose-500 rounded-xl text-rose-950 text-xs shadow-md animate-fade-in">
              <div className="flex items-start space-x-2.5">
                <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5 animate-bounce" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="font-black text-rose-900 text-sm">
                      ⛔ KODE SUDAH ADA — TIDAK BISA SIMPAN!
                    </p>
                    <span className="px-2 py-0.5 text-[10px] font-black bg-rose-600 text-white rounded-full uppercase tracking-wider">
                      Kode Tidak Boleh Sama
                    </span>
                  </div>
                  <p className="mt-1 text-rose-800 leading-relaxed font-semibold">
                    Kode <span className="font-mono font-black text-rose-950 bg-rose-200/90 px-1.5 py-0.5 rounded border border-rose-400">{formData.kode}</span> sudah terdaftar di <strong>BOX #{existingItemWithSameCode.boxNumber || '?'}</strong> ({existingItemWithSameCode.style || existingItemWithSameCode.name || 'Barang lain'}). Tombol simpan dinonaktifkan sampai kode diubah.
                  </p>
                  <div className="mt-2.5 p-2 bg-white rounded-lg border-2 border-rose-300 flex items-center justify-between gap-2 flex-wrap shadow-2xs">
                    <div className="text-[11px] text-slate-800 font-semibold">
                      💡 Kode unik berikutnya yang tersedia: <strong className="font-mono text-xs text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">{autoResolvedCode}</strong>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, kode: autoResolvedCode }));
                        if (submitError) setSubmitError(null);
                      }}
                      className="px-3.5 py-1.5 text-xs font-black text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>Pakai Kode {autoResolvedCode} ➔</span>
                    </button>
                  </div>
                  <p className="mt-1.5 text-[10px] text-rose-700 italic">
                    * Klik tombol <strong>"Pakai Kode {autoResolvedCode}"</strong> di atas agar tombol Simpan kembali aktif.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* THE PHYSICAL SAMPLE CARD (EXPANDED PREVIEW CONTAINER) */}
          <div className="w-full max-w-[580px] bg-white p-3 sm:p-4 rounded-2xl shadow-xl border border-slate-300 ring-4 ring-slate-200/60 box-border">
            <form onSubmit={handleSubmit} id="direct-card-form">
              
              <table className="w-full border-collapse border-2 border-black text-xs sm:text-sm leading-normal text-left">
                <tbody>
                  
                  {/* Track */}
                  <tr className="border-b-2 border-black">
                    <td className="w-[28%] py-2 px-3 font-bold border-r-2 border-black align-middle text-black whitespace-nowrap bg-slate-50/80">
                      Track <span className="text-rose-500">*</span>
                    </td>
                    <td className="p-0 align-middle">
                      <SuggestionInput
                        value={formData.track}
                        onChange={(val) => setFormData(prev => ({ ...prev, track: val }))}
                        suggestions={suggestions.track || []}
                        placeholder="DHL : 5475890895 / NA *"
                        onRemoveOption={(val) => removeSuggestion && removeSuggestion('track', val)}
                        className="w-full"
                        inputClassName={`w-full py-2 px-3 text-xs sm:text-sm font-medium text-black focus:outline-none transition font-mono bg-transparent ${
                          errors.track ? 'bg-rose-50 placeholder:text-rose-400' : 'focus:bg-blue-50/60 placeholder:text-slate-300'
                        }`}
                        title="Wajib diisi. Pilih tracking dari list, ketik baru, atau isi NA jika tidak ada info"
                      />
                    </td>
                  </tr>

                  {/* Tanggal Sample (Klik Kalender ATAU Tulis Manual / NA) */}
                  <tr className="border-b-2 border-black">
                    <td className="py-2 px-3 font-bold border-r-2 border-black align-middle text-black whitespace-nowrap bg-slate-50/80">
                      Tanggal Sample <span className="text-rose-500">*</span>
                    </td>
                    <td className="p-0 align-middle">
                      <div className={`flex items-center w-full relative ${errors.tanggal ? 'bg-rose-50' : ''}`}>
                        <input
                          type="text"
                          placeholder="5-Nov-2026 / NA *"
                          value={formData.tanggal}
                          onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                          className={`flex-1 py-2 px-3 text-xs sm:text-sm font-semibold text-black focus:outline-none transition bg-transparent ${
                            errors.tanggal ? 'placeholder:text-rose-400' : 'focus:bg-blue-50/60'
                          }`}
                          title="Tanggal sample wajib diisi. Tulis manual, klik ikon kalender, atau isi NA jika tidak ada info"
                        />
                        {/* Native Calendar Picker Trigger */}
                        <button
                          type="button"
                          onClick={() => {
                            try {
                              hiddenDateRef.current?.showPicker();
                            } catch (err) {
                              hiddenDateRef.current?.focus();
                            }
                          }}
                          className="no-print p-1.5 mr-2 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                          title="Pilih tanggal dari kalender"
                        >
                          <Calendar className="w-4 h-4 text-blue-600" />
                        </button>
                        <input
                          ref={hiddenDateRef}
                          type="date"
                          onChange={handleDatePickerChange}
                          className="sr-only"
                          tabIndex={-1}
                        />
                      </div>
                    </td>
                  </tr>

                  {/* Kode & Buyer No (1 Baris Rapi, No Overlap) */}
                  <tr className="border-b-2 border-black">
                    <td className="py-2 px-3 font-bold border-r-2 border-black align-middle text-black whitespace-nowrap bg-slate-50/80">
                      Kode <span className="text-rose-500">*</span>
                    </td>
                    <td className="p-0 align-middle">
                      <div className="grid grid-cols-2 gap-0 items-center w-full">
                        {/* Kolom 1: Kode Barang (50%) */}
                        <div className={`flex items-center min-w-0 border-r-2 border-black px-3 py-1.5 transition ${
                          existingItemWithSameCode ? 'bg-amber-50/90' : ''
                        }`}>
                          <input
                            type="text"
                            placeholder="SAMPLE-00001"
                            value={formData.kode}
                            onChange={(e) => {
                              setFormData({ ...formData, kode: e.target.value.toUpperCase() });
                              if (submitError) setSubmitError(null);
                            }}
                            className={`min-w-0 flex-1 py-0.5 text-xs sm:text-sm font-black font-mono focus:outline-none uppercase transition bg-transparent ${
                              existingItemWithSameCode 
                                ? 'text-amber-900 font-bold' 
                                : errors.kode ? 'bg-rose-50 placeholder:text-rose-400 text-black' : 'text-black focus:bg-blue-50/60'
                            }`}
                          />
                          {existingItemWithSameCode && (
                            <span 
                              className="no-print mr-1 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-amber-500 text-white rounded shrink-0 select-none cursor-help shadow-2xs"
                              title={`Kode sudah ada di BOX #${existingItemWithSameCode.boxNumber}! Kode tidak boleh sama.`}
                            >
                              Sudah Ada
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({ ...prev, kode: existingItemWithSameCode ? autoResolvedCode : getNextSampleCode(items) }));
                              if (submitError) setSubmitError(null);
                            }}
                            className={`no-print shrink-0 p-1 ml-1 rounded-lg border transition flex items-center justify-center cursor-pointer shadow-2xs ${
                              existingItemWithSameCode
                                ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600 animate-pulse'
                                : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200'
                            }`}
                            title={existingItemWithSameCode ? `Ganti ke kode baru yang unik (${autoResolvedCode})` : "Generate nomor urut otomatis berikutnya"}
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Kolom 2: Buyer No (50% - Wajib Diisi) */}
                        <div className={`flex items-center min-w-0 px-2.5 py-1.5 gap-1.5 transition rounded ${
                          errors.buyerNo ? 'bg-rose-50 ring-2 ring-rose-500' : ''
                        }`}>
                          <span className="text-[11px] font-bold text-slate-800 shrink-0 select-none">
                            Buyer <span className="text-rose-600 font-black">*</span>:
                          </span>
                          <SuggestionInput
                            value={formData.buyerNo}
                            onChange={(val) => {
                              setFormData(prev => ({ ...prev, buyerNo: val.toUpperCase() }));
                              if (errors.buyerNo) setErrors(prev => ({ ...prev, buyerNo: null }));
                            }}
                            suggestions={suggestions.buyerNo || []}
                            placeholder="No. Buyer *"
                            uppercase
                            onRemoveOption={(val) => removeSuggestion && removeSuggestion('buyerNo', val)}
                            className="min-w-0 flex-1"
                            inputClassName={`w-full py-0.5 text-xs sm:text-sm font-bold font-mono focus:outline-none transition bg-transparent ${
                              errors.buyerNo ? 'text-rose-900 placeholder:text-rose-400' : 'text-black focus:bg-blue-50/60 placeholder:text-slate-400'
                            }`}
                            title="Nomor Buyer / Buyer PO (Pilih dari list atau ketik baru)"
                          />
                        </div>
                      </div>
                    </td>
                  </tr>

                  {/* Jenis Sample (ORI / DEVELOP / PPS) */}
                  <tr className="border-b-2 border-black">
                    <td className="py-2 px-3 font-bold border-r-2 border-black align-middle text-black whitespace-nowrap bg-slate-50/80 leading-tight">
                      <div>Jenis Sample <span className="text-rose-500">*</span></div>
                      <div className="text-[10px] font-normal text-slate-500 mt-0.5">*(Centang salah satu)</div>
                    </td>
                    <td className="py-1.5 px-3 align-middle">
                      <div className="flex items-center gap-2">
                        {['ORI', 'DEVELOP', 'PPS'].map((type) => {
                          const isSelected = (formData.jenisSample || 'DEVELOP') === type;
                          return (
                            <button
                              key={type}
                              type="button"
                              onClick={() => setFormData({ ...formData, jenisSample: type })}
                              className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider transition border cursor-pointer ${
                                isSelected
                                  ? 'bg-slate-950 text-white border-slate-950 shadow-xs'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                              }`}
                            >
                              {isSelected && <span className="mr-1 text-amber-300 font-bold">✓</span>}
                              {type}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                  </tr>

                  {/* Deskripsi (3 Kolom: Nama/Nomer Style *, Sample No *, & Size *) */}
                  <tr className="border-b-2 border-black">
                    <td className="py-2 px-3 font-bold border-r-2 border-black align-middle text-black whitespace-nowrap bg-slate-50/80">
                      Deskripsi <span className="text-rose-500">*</span>
                    </td>
                    <td className="p-0 align-middle">
                      <div className="grid grid-cols-12 gap-1.5 p-1.5">
                        {/* Kolom 1: Nama / Nomer Style (Wajib) */}
                        <div className="col-span-5">
                          <SuggestionInput
                            value={formData.style}
                            onChange={(val) => {
                              setFormData(prev => ({ ...prev, style: val }));
                              if (errors.style) setErrors(prev => ({ ...prev, style: null }));
                            }}
                            suggestions={suggestions.style || []}
                            placeholder="Nama/No. Style *"
                            onRemoveOption={(val) => removeSuggestion && removeSuggestion('style', val)}
                            className="w-full"
                            inputClassName={`w-full py-1.5 px-2.5 text-xs sm:text-sm font-bold text-black border focus:outline-none rounded-lg transition ${
                              errors.style ? 'border-rose-500 bg-rose-50 placeholder:text-rose-400' : 'border-slate-200 focus:border-blue-500 focus:bg-blue-50/50 placeholder:text-slate-400'
                            }`}
                            title="Nama / No. Style (Pilih dari list atau ketik baru)"
                          />
                        </div>

                        {/* Kolom 2: Sample Number (Wajib Diisi) */}
                        <div className="col-span-4">
                          <SuggestionInput
                            value={formData.sampleNo}
                            onChange={(val) => {
                              setFormData(prev => ({ ...prev, sampleNo: val.toUpperCase() }));
                              if (errors.sampleNo) setErrors(prev => ({ ...prev, sampleNo: null }));
                            }}
                            suggestions={suggestions.sampleNo || []}
                            placeholder="SAMPLE NO *"
                            uppercase
                            onRemoveOption={(val) => removeSuggestion && removeSuggestion('sampleNo', val)}
                            className="w-full"
                            inputClassName={`w-full py-1.5 px-2.5 text-xs sm:text-sm font-black uppercase font-mono border focus:outline-none rounded-lg transition ${
                              errors.sampleNo 
                                ? 'border-rose-500 bg-rose-50 text-rose-900 ring-2 ring-rose-500 placeholder:text-rose-400' 
                                : 'text-black border-slate-200 focus:border-blue-500 focus:bg-blue-50/50 placeholder:text-slate-400'
                            }`}
                            title="Nomor Sample (Pilih dari list atau ketik baru)"
                          />
                        </div>

                        {/* Kolom 3: Size (Wajib) */}
                        <div className="col-span-3">
                          <SuggestionInput
                            value={formData.size}
                            onChange={(val) => {
                              setFormData(prev => ({ ...prev, size: val.toUpperCase() }));
                              if (errors.size) setErrors(prev => ({ ...prev, size: null }));
                            }}
                            suggestions={suggestions.size || []}
                            placeholder="SIZE *"
                            uppercase
                            onRemoveOption={(val) => removeSuggestion && removeSuggestion('size', val)}
                            className="w-full"
                            inputClassName={`w-full py-1.5 px-2 text-xs sm:text-sm font-black uppercase text-black border focus:outline-none rounded-lg transition text-center ${
                              errors.size ? 'border-rose-500 bg-rose-50 placeholder:text-rose-400' : 'border-slate-200 focus:border-blue-500 focus:bg-blue-50/50 placeholder:text-slate-400'
                            }`}
                            title="Size (Pilih dari list atau ketik baru)"
                          />
                        </div>
                      </div>
                    </td>
                  </tr>

                  {/* Color (Wajib Isi) */}
                  <tr className="border-b-2 border-black">
                    <td className="py-2 px-3 font-bold border-r-2 border-black align-middle text-black whitespace-nowrap bg-slate-50/80">
                      Color <span className="text-rose-500">*</span>
                    </td>
                    <td className="p-0 align-middle">
                      <SuggestionInput
                        value={formData.color}
                        onChange={(val) => {
                          setFormData(prev => ({ ...prev, color: val.toUpperCase() }));
                          if (errors.color) setErrors(prev => ({ ...prev, color: null }));
                        }}
                        suggestions={suggestions.color || []}
                        placeholder="Warna / Color * (Wajib)"
                        uppercase
                        onRemoveOption={(val) => removeSuggestion && removeSuggestion('color', val)}
                        className="w-full"
                        inputClassName={`w-full py-2 px-3 text-xs sm:text-sm font-bold text-black focus:outline-none transition bg-transparent ${
                          errors.color ? 'bg-rose-50 placeholder:text-rose-400 ring-2 ring-rose-500' : 'focus:bg-blue-50/60 placeholder:text-slate-400'
                        }`}
                        title="Warna / Color (Pilih dari list atau ketik baru)"
                      />
                    </td>
                  </tr>

                  {/* Jumlah & Satuan (1 Baris Hemat Tempat) */}
                  <tr className="border-b-2 border-black">
                    <td className="py-2 px-3 font-bold border-r-2 border-black align-middle text-black whitespace-nowrap bg-slate-50/80">
                      Jumlah <span className="text-rose-500">*</span>
                    </td>
                    <td className="p-0 align-middle">
                      <div className="grid grid-cols-2 gap-0 items-center w-full">
                        <div className={`flex items-center min-w-0 border-r-2 border-black px-3 py-1.5 ${errors.jumlah ? 'bg-rose-50' : ''}`}>
                          <input
                            type="number"
                            min="1"
                            value={formData.jumlah}
                            onChange={(e) => setFormData({ ...formData, jumlah: Number(e.target.value) || 0 })}
                            className="w-full py-0.5 text-xs sm:text-sm font-black text-black focus:outline-none focus:bg-blue-50/60 transition bg-transparent font-mono"
                            placeholder="Qty *"
                            title="Jumlah wajib diisi (minimal 1)"
                          />
                        </div>
                        <div className={`flex items-center min-w-0 px-3 py-1.5 ${errors.satuan ? 'bg-rose-50' : ''}`}>
                          <SuggestionInput
                            value={formData.satuan}
                            onChange={(val) => setFormData(prev => ({ ...prev, satuan: val.toUpperCase() }))}
                            suggestions={suggestions.satuan || []}
                            placeholder="Satuan / NA *"
                            uppercase
                            onRemoveOption={(val) => removeSuggestion && removeSuggestion('satuan', val)}
                            className="w-full"
                            inputClassName="w-full py-0.5 text-xs sm:text-sm font-bold uppercase text-black focus:outline-none focus:bg-blue-50/60 transition placeholder:text-slate-400 bg-transparent"
                            title="Satuan wajib diisi. Pilih dari list, ketik baru, atau isi NA jika tidak ada info"
                          />
                        </div>
                      </div>
                    </td>
                  </tr>

                  {/* Place */}
                  <tr>
                    <td className="py-2 px-3 font-bold border-r-2 border-black align-middle text-black whitespace-nowrap bg-slate-50/80">
                      Place <span className="text-rose-500">*</span>
                    </td>
                    <td className="p-0 align-middle">
                      <select
                        value={formData.place}
                        onChange={(e) => handleBoxSelect(e.target.value)}
                        className={`w-full py-2 px-3 text-xs sm:text-sm font-black text-black uppercase focus:outline-none focus:bg-blue-50/60 cursor-pointer ${
                          errors.place ? 'bg-rose-50' : 'bg-transparent'
                        }`}
                        title="Lokasi penyimpanan wajib dipilih"
                      >
                        {!allKnownPlaces.has(formData.place) && formData.place && (
                          <option value={formData.place}>{formData.place}</option>
                        )}
                        {dynamicRackGroups.map((rg) => (
                          <optgroup key={rg.name} label={`=== ${rg.name} ===`}>
                            {rg.boxes.map((b) => (
                              <option key={b.value} value={b.value}>
                                {b.value}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </td>
                  </tr>

                </tbody>
              </table>

              {/* Quick Preset Chips for Ultra-Fast Selection */}
              <div className="no-print mt-3 pt-2.5 border-t border-slate-200/80 flex flex-col gap-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="flex items-center gap-1 font-bold text-slate-700">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Pintasan Cepat Size & Warna:
                  </span>
                  <span className="text-[10px] text-slate-400">klik untuk isi instan</span>
                </div>
                
                {/* Size Chips */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-0.5">Size:</span>
                  {['S', 'M', 'L', 'XL', '2XL', 'FREE SIZE'].map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, size: sz }));
                        if (errors.size) setErrors(prev => ({ ...prev, size: null }));
                      }}
                      className={`px-2 py-0.5 rounded text-[11px] font-bold border transition cursor-pointer ${
                        formData.size === sz
                          ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>

                {/* Popular Color Chips */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-0.5">Color:</span>
                  {['BLACK', 'WHITE', 'NAVY', 'GREY', 'SAGE', 'BEIGE'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, color: c }));
                        if (errors.color) setErrors(prev => ({ ...prev, color: null }));
                      }}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border transition cursor-pointer ${
                        formData.color === c
                          ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

            </form>
          </div>

          {/* Subtitle helper */}
          {currentBoxObj && (
            <p className="no-print text-xs text-slate-500 mt-3 flex items-center gap-1.5 font-medium">
              <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>Tersimpan di: <strong className="text-slate-700">{currentBoxObj.rackName}</strong> • PIC: <strong className="text-slate-700">{currentBoxObj.picName}</strong></span>
            </p>
          )}

        </div>

        {/* Modal Footer Actions */}
        <div className="no-print bg-white px-5 py-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowPrintModal(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
            title="Cetak Multiple Card Ukuran KTP dalam 1 Lembar A4"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>Cetak A4 (Multi-KTP)</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setItemModalConfig({ isOpen: false, item: null, targetBoxNumber: null })}
              className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Batal
            </button>
            
            <button
              type="submit"
              form="direct-card-form"
              disabled={isSubmitting || Boolean(existingItemWithSameCode)}
              className={`px-5 py-2 rounded-xl text-xs font-black shadow-md transition flex items-center space-x-1.5 ${
                existingItemWithSameCode
                  ? 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed shadow-none'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20 cursor-pointer disabled:opacity-50'
              }`}
              title={existingItemWithSameCode ? 'Kode sudah ada! Tidak bisa simpan sebelum kode diubah' : 'Simpan item ke box'}
            >
              <Save className="w-4 h-4" />
              <span>
                {isSubmitting 
                  ? 'Menyimpan...' 
                  : existingItemWithSameCode 
                    ? 'Tidak Bisa Simpan (Kode Kembar)' 
                    : (isDuplicate ? 'Simpan Item Salinan' : (isEditing ? 'Simpan Perubahan' : 'Simpan ke Box'))}
              </span>
            </button>
          </div>
        </div>

      </div>

      {/* Multi-Card A4 Print Modal */}
      {showPrintModal && (
        <CardPrintModal 
          itemsToPrint={[formData]} 
          onClose={() => setShowPrintModal(false)} 
        />
      )}
    </div>
  );
};
