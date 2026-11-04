import React, { useState, useEffect, useRef } from 'react';
import { useInventory } from '../context/InventoryContext';
import { RACK_GROUPS, DEFAULT_PLACES } from '../data/simpleData';
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
    style: '',
    size: '',
    detail: '',
    deskripsi: '',
    color: '-',
    jumlah: 1,
    satuan: 'PCS',
    boxNumber: 1,
    place: '',
    qtyDipakai: '',
    tanggalDipakai: '',
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
          style: item.style || item.name || item.deskripsi || '',
          size: item.size || '',
          detail: item.detail || '',
          deskripsi: item.deskripsi || item.name || item.description || '',
          color: item.color || '-',
          jumlah: item.jumlah !== undefined && item.jumlah !== null ? item.jumlah : (item.qty || 1),
          satuan: item.satuan || item.unit || 'PCS',
          boxNumber: bNum,
          place: item.place || defaultBoxPlace,
          qtyDipakai: item.qtyDipakai || '',
          tanggalDipakai: item.tanggalDipakai || '',
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
          style: '',
          size: '',
          detail: '',
          deskripsi: '',
          color: '-',
          jumlah: 1,
          satuan: 'PCS',
          boxNumber: bNum,
          place: defaultBoxPlace,
          qtyDipakai: '',
          tanggalDipakai: '',
          status: 'In Storage',
        });
      }
      setErrors({});
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

  const handlePrintCard = () => {
    window.print();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!formData.kode.trim()) newErrors.kode = 'Wajib isi Kode barang';
    if (!formData.style.trim()) newErrors.style = 'Wajib isi Nama / Nomer Style';
    if (!formData.size.trim()) newErrors.size = 'Wajib isi Size';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const boxNum = Number(formData.boxNumber) || 1;
    const boxObj = boxes.find(b => b.boxNumber === boxNum);

    const styleTrim = formData.style.trim();
    const sizeTrim = formData.size.trim().toUpperCase();
    const detailTrim = (formData.detail || '').trim();
    const fullDeskripsi = detailTrim 
      ? `${styleTrim} - Size: ${sizeTrim} (${detailTrim})` 
      : `${styleTrim} - Size: ${sizeTrim}`;

    const payload = {
      track: formData.track.trim() || '-',
      tanggal: formData.tanggal.trim(),
      kode: formData.kode.trim(),
      style: styleTrim,
      size: sizeTrim,
      detail: detailTrim,
      deskripsi: fullDeskripsi,
      color: formData.color.trim() || '-',
      jumlah: Number(formData.jumlah) || 1,
      satuan: (formData.satuan || 'PCS').toUpperCase().trim(),
      place: formData.place || (boxObj ? `BOX ${boxNum} (${boxObj.rackName} - ${boxObj.picName})` : `BOX ${boxNum}`),
      qtyDipakai: formData.qtyDipakai.trim(),
      tanggalDipakai: formData.tanggalDipakai.trim(),

      // System context mappings
      name: `${styleTrim} (Size: ${sizeTrim})`,
      sku: formData.kode.trim(),
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
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-lg overflow-hidden flex flex-col max-h-[95vh]">
        
        {/* Modal Header */}
        <div className="no-print bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-blue-600 rounded-lg text-white">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black tracking-tight text-white">
                {isEditing ? `Edit Kartu Sampel (Box #${formData.boxNumber})` : `Input Langsung Kartu Sampel (Box #${formData.boxNumber})`}
              </h3>
              <p className="text-[11px] text-slate-400">
                Ketik langsung pada baris kartu fisik di bawah ini:
              </p>
            </div>
          </div>
          <button
            onClick={() => setItemModalConfig({ isOpen: false, item: null, targetBoxNumber: null })}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Direct Interactive Card */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 flex flex-col items-center justify-center">
          
          {/* Validation Alert */}
          {(errors.kode || errors.style || errors.size) && (
            <div className="no-print w-full max-w-[420px] mb-3 p-2.5 bg-rose-50 border border-rose-300 rounded-xl text-rose-700 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errors.kode || errors.style || errors.size}</span>
            </div>
          )}

          {/* THE PHYSICAL SAMPLE CARD (DIRECT IN-PLACE INPUT) */}
          <div className="w-full max-w-[420px] bg-white p-2.5 sm:p-3 rounded-xl shadow-lg border border-slate-300 box-border">
            <form onSubmit={handleSubmit} id="direct-card-form">
              
              <table className="w-full border-collapse border-2 border-black text-xs text-left">
                <tbody>
                  
                  {/* Track */}
                  <tr className="border-b border-black">
                    <td className="w-[32%] py-2 px-2.5 font-bold border-r border-black align-middle text-black whitespace-nowrap bg-slate-50/70">
                      Track
                    </td>
                    <td className="p-0 align-middle">
                      <input
                        type="text"
                        placeholder="Contoh: DHL : 5475890895"
                        value={formData.track}
                        onChange={(e) => setFormData({ ...formData, track: e.target.value })}
                        className="w-full py-1.5 px-2.5 text-xs font-medium text-black focus:outline-none focus:bg-blue-50/60 transition placeholder:text-slate-300 font-mono bg-transparent"
                      />
                    </td>
                  </tr>

                  {/* Tanggal (Klik Kalender ATAU Tulis Manual) */}
                  <tr className="border-b border-black">
                    <td className="py-2 px-2.5 font-bold border-r border-black align-middle text-black whitespace-nowrap bg-slate-50/70">
                      Tanggal
                    </td>
                    <td className="p-0 align-middle">
                      <div className="flex items-center w-full relative">
                        <input
                          type="text"
                          placeholder="Contoh: 4-Nov-2026"
                          value={formData.tanggal}
                          onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                          className="flex-1 py-1.5 px-2.5 text-xs font-semibold text-black focus:outline-none focus:bg-blue-50/60 transition bg-transparent"
                          title="Tulis manual atau klik ikon kalender di kanan"
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
                          className="no-print p-1.5 mr-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                          title="Klik untuk buka kalender & pilih tanggal"
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

                  {/* Kode (Otomatis SAMPLE-00001, SAMPLE-00002 dst, atau Tulis Manual) */}
                  <tr className="border-b border-black">
                    <td className="py-2 px-2.5 font-bold border-r border-black align-middle text-black whitespace-nowrap bg-slate-50/70">
                      Kode <span className="text-rose-500">*</span>
                    </td>
                    <td className="p-0 align-middle">
                      <div className="flex items-center w-full">
                        <input
                          type="text"
                          placeholder="SAMPLE-00001"
                          value={formData.kode}
                          onChange={(e) => setFormData({ ...formData, kode: e.target.value.toUpperCase() })}
                          className={`flex-1 py-1.5 px-2.5 text-xs font-black text-black font-mono focus:outline-none uppercase transition bg-transparent ${
                            errors.kode ? 'bg-rose-50 placeholder:text-rose-400' : 'focus:bg-blue-50/60'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, kode: getNextSampleCode(items) }))}
                          className="no-print mr-1.5 px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-bold rounded border border-blue-200 transition shrink-0 flex items-center space-x-1"
                          title="Generate nomor urut otomatis berikutnya"
                        >
                          <Sparkles className="w-3 h-3 text-blue-600" />
                          <span>Auto</span>
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Deskripsi (2 Kolom: Nama/Nomer Style & Size, Wajib Diisi) */}
                  <tr className="border-b border-black">
                    <td className="py-2 px-2.5 font-bold border-r border-black align-top text-black whitespace-nowrap bg-slate-50/70">
                      <div>Deskripsi <span className="text-rose-500">*</span></div>
                      <div className="text-[10px] text-slate-400 font-normal">Style & Size</div>
                    </td>
                    <td className="p-1.5 align-top">
                      <div className="space-y-1.5">
                        {/* 2 Kolom: Nama / Nomer Style & Size */}
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-1.5">
                          {/* Kolom 1: Nama / Nomer Style (Wajib) */}
                          <div className="sm:col-span-8">
                            <input
                              type="text"
                              placeholder="Nama / Nomer Style * (misal: #6613 Ergodyne)"
                              value={formData.style}
                              onChange={(e) => setFormData({ ...formData, style: e.target.value })}
                              className={`w-full py-1.5 px-2 text-xs font-bold text-black border focus:outline-none rounded transition ${
                                errors.style ? 'border-rose-500 bg-rose-50 placeholder:text-rose-400' : 'border-slate-300 focus:border-blue-500 focus:bg-blue-50/50 placeholder:text-slate-400'
                              }`}
                            />
                            {errors.style && <p className="text-rose-500 text-[10px] mt-0.5">{errors.style}</p>}
                          </div>

                          {/* Kolom 2: Size (Wajib) */}
                          <div className="sm:col-span-4">
                            <input
                              type="text"
                              placeholder="Size * (L, M, 32...)"
                              value={formData.size}
                              onChange={(e) => setFormData({ ...formData, size: e.target.value.toUpperCase() })}
                              className={`w-full py-1.5 px-2 text-xs font-black uppercase text-black border focus:outline-none rounded transition ${
                                errors.size ? 'border-rose-500 bg-rose-50 placeholder:text-rose-400' : 'border-slate-300 focus:border-blue-500 focus:bg-blue-50/50 placeholder:text-slate-400'
                              }`}
                            />
                            {errors.size && <p className="text-rose-500 text-[10px] mt-0.5">{errors.size}</p>}
                          </div>
                        </div>

                        {/* Keterangan detail tambahan (opsional) */}
                        <input
                          type="text"
                          placeholder="Keterangan detail tambahan (opsional: misal Pique 24s / buckle 50mm)"
                          value={formData.detail}
                          onChange={(e) => setFormData({ ...formData, detail: e.target.value })}
                          className="w-full py-1 px-2 text-[11px] text-slate-700 border border-slate-200 focus:outline-none focus:border-blue-500 focus:bg-blue-50/40 rounded transition placeholder:text-slate-300 bg-white"
                        />
                      </div>
                    </td>
                  </tr>

                  {/* Color */}
                  <tr className="border-b border-black">
                    <td className="py-2 px-2.5 font-bold border-r border-black align-middle text-black whitespace-nowrap bg-slate-50/70">
                      Color
                    </td>
                    <td className="p-0 align-middle">
                      <input
                        type="text"
                        placeholder="Contoh: Navy / -"
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        className="w-full py-1.5 px-2.5 text-xs font-medium text-black focus:outline-none focus:bg-blue-50/60 transition placeholder:text-slate-300 bg-transparent"
                      />
                    </td>
                  </tr>

                  {/* Jumlah */}
                  <tr className="border-b border-black">
                    <td className="py-2 px-2.5 font-bold border-r border-black align-middle text-black whitespace-nowrap bg-slate-50/70">
                      Jumlah
                    </td>
                    <td className="p-0 align-middle">
                      <input
                        type="number"
                        min="1"
                        value={formData.jumlah}
                        onChange={(e) => setFormData({ ...formData, jumlah: Number(e.target.value) || 0 })}
                        className="w-full py-1.5 px-2.5 text-sm font-black text-black focus:outline-none focus:bg-blue-50/60 transition bg-transparent"
                      />
                    </td>
                  </tr>

                  {/* Satuan */}
                  <tr className="border-b border-black">
                    <td className="py-2 px-2.5 font-bold border-r border-black align-middle text-black whitespace-nowrap bg-slate-50/70">
                      Satuan
                    </td>
                    <td className="p-0 align-middle">
                      <input
                        type="text"
                        placeholder="PCS"
                        value={formData.satuan}
                        onChange={(e) => setFormData({ ...formData, satuan: e.target.value.toUpperCase() })}
                        className="w-full py-1.5 px-2.5 text-xs font-bold uppercase text-black focus:outline-none focus:bg-blue-50/60 transition placeholder:text-slate-300 bg-transparent"
                      />
                    </td>
                  </tr>

                  {/* Place */}
                  <tr className="border-b border-black">
                    <td className="py-2 px-2.5 font-bold border-r border-black align-middle text-black whitespace-nowrap bg-slate-50/70">
                      Place
                    </td>
                    <td className="p-0 align-middle">
                      <select
                        value={formData.place}
                        onChange={(e) => handleBoxSelect(e.target.value)}
                        className="w-full py-1.5 px-2 text-xs font-black text-black uppercase focus:outline-none focus:bg-blue-50/60 bg-transparent cursor-pointer"
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

                  {/* Qty Dipakai */}
                  <tr className="border-b-2 border-dotted border-black">
                    <td className="py-2 px-2.5 font-bold italic border-r border-black align-middle text-black whitespace-nowrap bg-slate-50/70">
                      Qty Dipakai
                    </td>
                    <td className="p-0 align-middle">
                      <input
                        type="text"
                        placeholder="(Kosongkan jika untuk tulis manual)"
                        value={formData.qtyDipakai}
                        onChange={(e) => setFormData({ ...formData, qtyDipakai: e.target.value })}
                        className="w-full py-1.5 px-2.5 text-xs font-semibold text-black focus:outline-none focus:bg-blue-50/60 transition placeholder:text-slate-300 placeholder:italic font-mono bg-transparent"
                      />
                    </td>
                  </tr>

                  {/* Tanggal Dipakai */}
                  <tr className="border-b-2 border-dotted border-black">
                    <td className="py-2 px-2.5 font-bold italic border-r border-black align-middle text-black whitespace-nowrap bg-slate-50/70">
                      Tanggal Dipakai
                    </td>
                    <td className="p-0 align-middle">
                      <input
                        type="text"
                        placeholder="(Kosongkan jika untuk tulis manual)"
                        value={formData.tanggalDipakai}
                        onChange={(e) => setFormData({ ...formData, tanggalDipakai: e.target.value })}
                        className="w-full py-1.5 px-2.5 text-xs font-semibold text-black focus:outline-none focus:bg-blue-50/60 transition placeholder:text-slate-300 placeholder:italic bg-transparent"
                      />
                    </td>
                  </tr>

                </tbody>
              </table>

            </form>
          </div>

          {/* Subtitle helper */}
          {currentBoxObj && (
            <p className="no-print text-[11px] text-slate-500 mt-3 flex items-center gap-1 font-medium">
              <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>Tersimpan di: <strong>{currentBoxObj.rackName}</strong> ({currentBoxObj.rackDescription}) • PIC: <strong>{currentBoxObj.picName}</strong></span>
            </p>
          )}

        </div>

        {/* Modal Footer Actions */}
        <div className="no-print bg-white px-5 py-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={handlePrintCard}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-xs"
            title="Cetak Kartu Fisik Ini ke Printer / PDF"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>Cetak Kartu Ini</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setItemModalConfig({ isOpen: false, item: null, targetBoxNumber: null })}
              className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold transition"
            >
              Batal
            </button>
            
            <button
              type="submit"
              form="direct-card-form"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black shadow-md transition flex items-center space-x-1.5"
            >
              <Save className="w-4 h-4" />
              <span>{isEditing ? 'Simpan Perubahan' : 'Simpan ke Box'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
