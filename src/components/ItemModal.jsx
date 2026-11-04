import React, { useState, useEffect, useRef } from 'react';
import { useInventory } from '../context/InventoryContext';
import { RACK_GROUPS, DEFAULT_PLACES } from '../data/simpleData';
import { CardPrintModal } from './CardPrintModal';
import { 
  X, 
  Save, 
  Printer, 
  MapPin, 
  FileText,
  AlertCircle,
  Calendar,
  Sparkles
} from 'lucide-react';

/**
 * Calculates next sequential code: SAMPLE-00001, SAMPLE-00002, etc. (5-digit numbering)
 * Increments sequentially based on existing items in storage.
 */
export function getNextSampleCode(items = []) {
  let maxSeq = 0;
  if (Array.isArray(items)) {
    items.forEach(item => {
      const code = String(item.kode || item.sku || '');
      const match = code.match(/SAMPLE[-_ ]?(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }
    });
  }
  const nextSeq = maxSeq + 1;
  return `SAMPLE-${String(nextSeq).padStart(5, '0')}`;
}

export const ItemModal = () => {
  const { 
    itemModalConfig, 
    setItemModalConfig, 
    addItem, 
    updateItem, 
    boxes,
    items
  } = useInventory();

  const hiddenDateRef = useRef(null);
  const [showPrintModal, setShowPrintModal] = useState(false);

  const isEditing = Boolean(itemModalConfig.item);
  const targetBoxNum = Number(itemModalConfig.targetBoxNumber) || (itemModalConfig.item ? Number(itemModalConfig.item.boxNumber) : 1);

  function formatTodayDate() {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    return `${now.getDate()}-${months[now.getMonth()]}-${now.getFullYear()}`;
  }

  const [formData, setFormData] = useState({
    track: '',
    tanggal: formatTodayDate(),
    kode: '',
    buyerNo: '',
    jenisSample: 'DEVELOP',
    style: '',
    sampleNo: '',
    size: '',
    color: '',
    jumlah: 1,
    satuan: 'PCS',
    boxNumber: 1,
    place: '',
    status: 'In Storage',
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (itemModalConfig.isOpen) {
      if (itemModalConfig.item) {
        // Edit mode
        const item = itemModalConfig.item;
        const bNum = Number(item.boxNumber) || targetBoxNum;
        const bObj = boxes.find(b => b.boxNumber === bNum);
        const defaultBoxPlace = bObj 
          ? `BOX ${bObj.boxNumber} (${bObj.rackName} - ${bObj.picName})` 
          : `BOX ${bNum}`;

        setFormData({
          track: item.track || '',
          tanggal: item.tanggal || item.dateIn || formatTodayDate(),
          kode: item.kode || item.sku || getNextSampleCode(items),
          buyerNo: item.buyerNo || item.buyerNumber || '',
          jenisSample: item.jenisSample || item.sampleType || 'DEVELOP',
          style: item.style || item.name || item.deskripsi || '',
          sampleNo: item.sampleNo && item.sampleNo !== 'NA' ? item.sampleNo : '',
          size: item.size || '',
          color: item.color && item.color !== '-' ? item.color : '',
          jumlah: item.jumlah !== undefined && item.jumlah !== null ? item.jumlah : (item.qty || 1),
          satuan: item.satuan || item.unit || 'PCS',
          boxNumber: bNum,
          place: item.place || defaultBoxPlace,
          status: item.status || 'In Storage',
        });
      } else {
        // New item mode: auto-generate sequential code SAMPLE-00001, SAMPLE-00002...
        const bNum = targetBoxNum || 1;
        const bObj = boxes.find(b => b.boxNumber === bNum);
        const defaultBoxPlace = bObj 
          ? `BOX ${bObj.boxNumber} (${bObj.rackName} - ${bObj.picName})` 
          : `BOX ${bNum}`;

        setFormData({
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
        });
      }
      setErrors({});
      setShowPrintModal(false);
    }
  }, [itemModalConfig.isOpen, itemModalConfig.item, itemModalConfig.targetBoxNumber, items]);

  if (!itemModalConfig.isOpen) return null;

  // Handle box selection change
  const handleBoxSelect = (selectedPlaceValue) => {
    const match = selectedPlaceValue.match(/BOX\s+(\d+)/i);
    const boxNum = match ? Number(match[1]) : formData.boxNumber;
    
    setFormData(prev => ({
      ...prev,
      place: selectedPlaceValue,
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

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!formData.kode.trim()) newErrors.kode = 'Wajib isi Kode barang';
    if (!formData.style.trim()) newErrors.style = 'Wajib isi Nama / Nomer Style';
    if (!formData.size.trim()) newErrors.size = 'Wajib isi Size';
    if (!formData.color.trim() || formData.color.trim() === '-') newErrors.color = 'Wajib isi Color / Warna';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const boxNum = Number(formData.boxNumber) || 1;
    const boxObj = boxes.find(b => b.boxNumber === boxNum);

    const styleTrim = formData.style.trim();
    const sampleNoTrim = formData.sampleNo.trim();
    const buyerNoTrim = formData.buyerNo.trim() || '-';
    const sizeTrim = formData.size.trim().toUpperCase();
    const colorTrim = formData.color.trim();
    const fullDeskripsi = sampleNoTrim 
      ? `${styleTrim} - Sample: ${sampleNoTrim} - Size: ${sizeTrim}` 
      : `${styleTrim} - Size: ${sizeTrim}`;

    const payload = {
      track: formData.track.trim() || '-',
      tanggal: formData.tanggal.trim(),
      kode: formData.kode.trim(),
      buyerNo: buyerNoTrim,
      jenisSample: formData.jenisSample || 'DEVELOP',
      style: styleTrim,
      sampleNo: sampleNoTrim,
      size: sizeTrim,
      deskripsi: fullDeskripsi,
      color: colorTrim,
      jumlah: Number(formData.jumlah) || 1,
      satuan: (formData.satuan || 'PCS').toUpperCase().trim(),
      place: formData.place || (boxObj ? `BOX ${boxNum} (${boxObj.rackName} - ${boxObj.picName})` : `BOX ${boxNum}`),

      // System context mappings
      name: sampleNoTrim 
        ? `${styleTrim} (Sample: ${sampleNoTrim}, Size: ${sizeTrim})` 
        : `${styleTrim} (Size: ${sizeTrim})`,
      sku: formData.kode.trim(),
      buyerNumber: buyerNoTrim,
      description: fullDeskripsi,
      qty: Number(formData.jumlah) || 1,
      unit: (formData.satuan || 'PCS').toUpperCase().trim(),
      boxNumber: boxNum,
      rackId: boxObj ? boxObj.rackId : 1,
      rackName: boxObj ? boxObj.rackName : 'RACK 1',
      picName: boxObj ? boxObj.picName : 'Royan',
      category: boxObj ? boxObj.category : 'SAMPLE',
      status: formData.status || 'In Storage',
      dateIn: formData.tanggal.trim(),
    };

    if (isEditing) {
      updateItem(itemModalConfig.item.id, payload);
    } else {
      addItem(payload);
    }

    setItemModalConfig({ isOpen: false, item: null, targetBoxNumber: null });
  };

  const currentBoxObj = boxes.find(b => b.boxNumber === Number(formData.boxNumber));

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in print:p-0 print:bg-transparent">
      <div className={`bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-md overflow-hidden flex flex-col max-h-[96vh] ${showPrintModal ? 'no-print' : ''}`}>
        
        {/* Modal Header */}
        <div className="no-print bg-slate-900 text-white px-5 py-3 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-blue-600 rounded-lg text-white">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <h3 className="text-xs font-black tracking-tight text-white uppercase">
                  {isEditing ? `Edit Kartu (Box #${formData.boxNumber})` : `Kartu Fisik KTP (Box #${formData.boxNumber})`}
                </h3>
                <span className="bg-amber-400 text-slate-950 text-[9px] font-black px-1.5 py-0.2 rounded uppercase">
                  Ukuran KTP (8.5 x 5.4 cm)
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                Ketik langsung pada baris kartu sampel di bawah ini:
              </p>
            </div>
          </div>
          <button
            onClick={() => setItemModalConfig({ isOpen: false, item: null, targetBoxNumber: null })}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body: Direct Interactive Card */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-100 flex flex-col items-center justify-center">
          
          {/* Validation Alert */}
          {(errors.kode || errors.style || errors.sampleNo || errors.size || errors.color) && (
            <div className="no-print w-full max-w-[340px] mb-2.5 p-2 bg-rose-50 border border-rose-300 rounded-lg text-rose-700 text-[11px] flex items-center space-x-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
              <span>{errors.style || errors.sampleNo || errors.size || errors.color || errors.kode}</span>
            </div>
          )}

          {/* THE PHYSICAL SAMPLE CARD (EXACT KTP DIMENSIONS 85.6mm x 54mm) */}
          <div className="w-[85.6mm] max-w-[350px] bg-white p-1.5 rounded-lg shadow-md border border-slate-400 box-border">
            <form onSubmit={handleSubmit} id="direct-card-form">
              
              <table className="w-full border-collapse border-[1.5px] border-black text-[9.5px] leading-tight text-left">
                <tbody>
                  
                  {/* Track */}
                  <tr className="border-b border-black">
                    <td className="w-[30%] py-1 px-1.5 font-bold border-r border-black align-middle text-black whitespace-nowrap bg-slate-50/70">
                      Track
                    </td>
                    <td className="p-0 align-middle">
                      <input
                        type="text"
                        placeholder="Contoh: DHL : 5475890895"
                        value={formData.track}
                        onChange={(e) => setFormData({ ...formData, track: e.target.value })}
                        className="w-full py-0.5 px-1.5 text-[9px] font-medium text-black focus:outline-none focus:bg-blue-50/60 transition placeholder:text-slate-300 font-mono bg-transparent"
                      />
                    </td>
                  </tr>

                  {/* Tanggal (Klik Kalender ATAU Tulis Manual) */}
                  <tr className="border-b border-black">
                    <td className="py-1 px-1.5 font-bold border-r border-black align-middle text-black whitespace-nowrap bg-slate-50/70">
                      Tanggal
                    </td>
                    <td className="p-0 align-middle">
                      <div className="flex items-center w-full relative">
                        <input
                          type="text"
                          placeholder="4-Nov-2026"
                          value={formData.tanggal}
                          onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                          className="flex-1 py-0.5 px-1.5 text-[9px] font-semibold text-black focus:outline-none focus:bg-blue-50/60 transition bg-transparent"
                          title="Tulis manual atau klik ikon kalender"
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
                          className="no-print p-0.5 mr-1 text-slate-500 hover:text-blue-600 rounded transition"
                          title="Pilih tanggal dari kalender"
                        >
                          <Calendar className="w-3 h-3 text-blue-600" />
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
                  <tr className="border-b border-black">
                    <td className="py-1 px-1.5 font-bold border-r border-black align-middle text-black whitespace-nowrap bg-slate-50/70">
                      Kode <span className="text-rose-500">*</span>
                    </td>
                    <td className="p-0 align-middle">
                      <div className="grid grid-cols-2 gap-0 items-center w-full">
                        {/* Kolom 1: Kode Barang (50%) */}
                        <div className="flex items-center min-w-0 border-r border-black px-1.5 py-0.5">
                          <input
                            type="text"
                            placeholder="SAMPLE-00001"
                            value={formData.kode}
                            onChange={(e) => setFormData({ ...formData, kode: e.target.value.toUpperCase() })}
                            className={`min-w-0 flex-1 py-0.5 text-[9px] font-black text-black font-mono focus:outline-none uppercase transition bg-transparent ${
                              errors.kode ? 'bg-rose-50 placeholder:text-rose-400' : 'focus:bg-blue-50/60'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, kode: getNextSampleCode(items) }))}
                            className="no-print shrink-0 p-0.5 ml-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded border border-blue-200 transition flex items-center justify-center cursor-pointer"
                            title="Generate nomor urut otomatis berikutnya"
                          >
                            <Sparkles className="w-2.5 h-2.5 text-blue-600" />
                          </button>
                        </div>

                        {/* Kolom 2: Buyer No (50%) */}
                        <div className="flex items-center min-w-0 px-1.5 py-0.5 gap-1">
                          <span className="text-[7.5px] font-bold text-slate-500 shrink-0 select-none">Buyer:</span>
                          <input
                            type="text"
                            placeholder="No. Buyer"
                            value={formData.buyerNo}
                            onChange={(e) => setFormData({ ...formData, buyerNo: e.target.value.toUpperCase() })}
                            className="min-w-0 flex-1 py-0.5 text-[8.5px] font-bold text-black font-mono focus:outline-none focus:bg-blue-50/60 transition bg-transparent placeholder:text-slate-400"
                            title="Nomor Buyer / Buyer PO"
                          />
                        </div>
                      </div>
                    </td>
                  </tr>

                  {/* Jenis Sample (ORI / DEVELOP / PPS) */}
                  <tr className="border-b border-black">
                    <td className="py-1 px-1.5 font-bold border-r border-black align-middle text-black whitespace-nowrap bg-slate-50/70">
                      Jenis Sample <span className="text-rose-500">*</span>
                    </td>
                    <td className="py-0.5 px-1 align-middle">
                      <div className="flex items-center gap-1.5">
                        {['ORI', 'DEVELOP', 'PPS'].map((type) => {
                          const isSelected = (formData.jenisSample || 'DEVELOP') === type;
                          return (
                            <button
                              key={type}
                              type="button"
                              onClick={() => setFormData({ ...formData, jenisSample: type })}
                              className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider transition border cursor-pointer ${
                                isSelected
                                  ? 'bg-slate-950 text-white border-slate-950 shadow-xs'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                              }`}
                            >
                              {isSelected && <span className="mr-0.5 text-amber-300 font-bold">✓</span>}
                              {type}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                  </tr>

                  {/* Deskripsi (3 Kolom: Nama/Nomer Style *, Sample No, & Size *) */}
                  <tr className="border-b border-black">
                    <td className="py-1 px-1.5 font-bold border-r border-black align-middle text-black whitespace-nowrap bg-slate-50/70">
                      Deskripsi <span className="text-rose-500">*</span>
                    </td>
                    <td className="p-0 align-middle">
                      <div className="grid grid-cols-12 gap-0.5 p-0.5">
                        {/* Kolom 1: Nama / Nomer Style (Wajib) */}
                        <div className="col-span-5">
                          <input
                            type="text"
                            placeholder="Nama/No. Style *"
                            value={formData.style}
                            onChange={(e) => {
                              setFormData({ ...formData, style: e.target.value });
                              if (errors.style) setErrors(prev => ({ ...prev, style: null }));
                            }}
                            className={`w-full py-0.5 px-1 text-[8.5px] font-bold text-black border focus:outline-none rounded transition ${
                              errors.style ? 'border-rose-500 bg-rose-50 placeholder:text-rose-400' : 'border-slate-200 focus:border-blue-500 focus:bg-blue-50/50 placeholder:text-slate-400'
                            }`}
                          />
                        </div>

                        {/* Kolom 2: Sample Number (Default Kosong) */}
                        <div className="col-span-4">
                          <input
                            type="text"
                            placeholder="Sample No"
                            value={formData.sampleNo}
                            onChange={(e) => setFormData({ ...formData, sampleNo: e.target.value.toUpperCase() })}
                            className="w-full py-0.5 px-1 text-[8.5px] font-black uppercase text-black font-mono border border-slate-200 focus:border-blue-500 focus:bg-blue-50/50 rounded transition placeholder:text-slate-400"
                            title="Nomor Sample (Opsional, kosongkan jika tidak ada)"
                          />
                        </div>

                        {/* Kolom 3: Size (Wajib) */}
                        <div className="col-span-3">
                          <input
                            type="text"
                            placeholder="Size *"
                            value={formData.size}
                            onChange={(e) => {
                              setFormData({ ...formData, size: e.target.value.toUpperCase() });
                              if (errors.size) setErrors(prev => ({ ...prev, size: null }));
                            }}
                            className={`w-full py-0.5 px-1 text-[8.5px] font-black uppercase text-black border focus:outline-none rounded transition ${
                              errors.size ? 'border-rose-500 bg-rose-50 placeholder:text-rose-400' : 'border-slate-200 focus:border-blue-500 focus:bg-blue-50/50 placeholder:text-slate-400'
                            }`}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>

                  {/* Color (Wajib Isi) */}
                  <tr className="border-b border-black">
                    <td className="py-1 px-1.5 font-bold border-r border-black align-middle text-black whitespace-nowrap bg-slate-50/70">
                      Color <span className="text-rose-500">*</span>
                    </td>
                    <td className="p-0 align-middle">
                      <input
                        type="text"
                        placeholder="Warna / Color * (Wajib)"
                        value={formData.color}
                        onChange={(e) => {
                          setFormData({ ...formData, color: e.target.value });
                          if (errors.color) setErrors(prev => ({ ...prev, color: null }));
                        }}
                        className={`w-full py-0.5 px-1.5 text-[9px] font-bold text-black focus:outline-none transition bg-transparent ${
                          errors.color ? 'bg-rose-50 placeholder:text-rose-400' : 'focus:bg-blue-50/60 placeholder:text-slate-400'
                        }`}
                      />
                    </td>
                  </tr>

                  {/* Jumlah & Satuan (1 Baris Hemat Tempat) */}
                  <tr className="border-b border-black">
                    <td className="py-1 px-1.5 font-bold border-r border-black align-middle text-black whitespace-nowrap bg-slate-50/70">
                      Jumlah
                    </td>
                    <td className="p-0 align-middle">
                      <div className="grid grid-cols-2 gap-0 items-center w-full">
                        <div className="flex items-center min-w-0 border-r border-black px-1.5 py-0.5">
                          <input
                            type="number"
                            min="1"
                            value={formData.jumlah}
                            onChange={(e) => setFormData({ ...formData, jumlah: Number(e.target.value) || 0 })}
                            className="w-full py-0.5 text-[9.5px] font-black text-black focus:outline-none focus:bg-blue-50/60 transition bg-transparent"
                            placeholder="Qty"
                          />
                        </div>
                        <div className="flex items-center min-w-0 px-1.5 py-0.5">
                          <input
                            type="text"
                            placeholder="Satuan (PCS)"
                            value={formData.satuan}
                            onChange={(e) => setFormData({ ...formData, satuan: e.target.value.toUpperCase() })}
                            className="w-full py-0.5 text-[9px] font-bold uppercase text-black focus:outline-none focus:bg-blue-50/60 transition placeholder:text-slate-400 bg-transparent"
                          />
                        </div>
                      </div>
                    </td>
                  </tr>

                  {/* Place */}
                  <tr>
                    <td className="py-1 px-1.5 font-bold border-r border-black align-middle text-black whitespace-nowrap bg-slate-50/70">
                      Place
                    </td>
                    <td className="p-0 align-middle">
                      <select
                        value={formData.place}
                        onChange={(e) => handleBoxSelect(e.target.value)}
                        className="w-full py-0.5 px-1 text-[8.5px] font-black text-black uppercase focus:outline-none focus:bg-blue-50/60 bg-transparent cursor-pointer"
                      >
                        {!DEFAULT_PLACES.includes(formData.place) && formData.place && (
                          <option value={formData.place}>{formData.place}</option>
                        )}
                        {RACK_GROUPS.map((rg) => (
                          <optgroup key={rg.name} label={`${rg.name} — ${rg.range}`}>
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

            </form>
          </div>

          {/* Subtitle helper */}
          {currentBoxObj && (
            <p className="no-print text-[10px] text-slate-500 mt-2 flex items-center gap-1 font-medium">
              <MapPin className="w-3 h-3 text-blue-600 shrink-0" />
              <span>Tersimpan di: <strong>{currentBoxObj.rackName}</strong> • PIC: <strong>{currentBoxObj.picName}</strong></span>
            </p>
          )}

        </div>

        {/* Modal Footer Actions */}
        <div className="no-print bg-white px-4 py-2.5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowPrintModal(true)}
            className="flex items-center space-x-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition shadow-xs"
            title="Cetak Multiple Card Ukuran KTP dalam 1 Lembar A4"
          >
            <Printer className="w-3.5 h-3.5 text-amber-400" />
            <span>Cetak A4 (Multi-KTP)</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setItemModalConfig({ isOpen: false, item: null, targetBoxNumber: null })}
              className="px-3 py-1.5 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-bold transition"
            >
              Batal
            </button>
            
            <button
              type="submit"
              form="direct-card-form"
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-black shadow-md transition flex items-center space-x-1"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isEditing ? 'Simpan Perubahan' : 'Simpan ke Box'}</span>
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
