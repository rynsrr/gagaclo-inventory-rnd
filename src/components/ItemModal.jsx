import React, { useState, useEffect } from 'react';
import { useInventory } from '../context/InventoryContext';
import { RACK_GROUPS, DEFAULT_PLACES } from '../data/simpleData';
import { 
  X, 
  Save, 
  Printer, 
  MapPin, 
  FileText,
  AlertCircle
} from 'lucide-react';

export const ItemModal = () => {
  const { 
    itemModalConfig, 
    setItemModalConfig, 
    addItem, 
    updateItem, 
    boxes 
  } = useInventory();

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
          kode: item.kode || item.sku || '',
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
        // New item mode
        const bNum = targetBoxNum || 1;
        const bObj = boxes.find(b => b.boxNumber === bNum);
        const defaultBoxPlace = bObj 
          ? `BOX ${bObj.boxNumber} (${bObj.rackName} - ${bObj.picName})` 
          : `BOX ${bNum}`;

        setFormData({
          track: '',
          tanggal: formatTodayDate(),
          kode: '',
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
  }, [itemModalConfig.isOpen, itemModalConfig.item, itemModalConfig.targetBoxNumber]);

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

  const handlePrintCard = () => {
    window.print();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!formData.kode.trim()) newErrors.kode = 'Wajib isi Kode barang';
    if (!formData.deskripsi.trim()) newErrors.deskripsi = 'Wajib isi Deskripsi barang';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const boxNum = Number(formData.boxNumber) || 1;
    const boxObj = boxes.find(b => b.boxNumber === boxNum);

    const payload = {
      track: formData.track.trim() || '-',
      tanggal: formData.tanggal.trim(),
      kode: formData.kode.trim(),
      deskripsi: formData.deskripsi.trim(),
      color: formData.color.trim() || '-',
      jumlah: Number(formData.jumlah) || 1,
      satuan: (formData.satuan || 'PCS').toUpperCase().trim(),
      place: formData.place || (boxObj ? `BOX ${boxNum} (${boxObj.rackName} - ${boxObj.picName})` : `BOX ${boxNum}`),
      qtyDipakai: formData.qtyDipakai.trim(),
      tanggalDipakai: formData.tanggalDipakai.trim(),

      // System context mappings
      name: formData.deskripsi.trim(),
      sku: formData.kode.trim(),
      description: formData.deskripsi.trim(),
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
          {(errors.kode || errors.deskripsi) && (
            <div className="no-print w-full max-w-[420px] mb-3 p-2.5 bg-rose-50 border border-rose-300 rounded-xl text-rose-700 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errors.kode || errors.deskripsi}</span>
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
                        className="w-full py-1.5 px-2.5 text-xs font-medium text-black focus:outline-none focus:bg-blue-50/60 transition placeholder:text-slate-300 font-mono"
                      />
                    </td>
                  </tr>

                  {/* Tanggal */}
                  <tr className="border-b border-black">
                    <td className="py-2 px-2.5 font-bold border-r border-black align-middle text-black whitespace-nowrap bg-slate-50/70">
                      Tanggal
                    </td>
                    <td className="p-0 align-middle">
                      <input
                        type="text"
                        placeholder="17-Jul-2026"
                        value={formData.tanggal}
                        onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                        className="w-full py-1.5 px-2.5 text-xs font-semibold text-black focus:outline-none focus:bg-blue-50/60 transition"
                      />
                    </td>
                  </tr>

                  {/* Kode */}
                  <tr className="border-b border-black">
                    <td className="py-2 px-2.5 font-bold border-r border-black align-middle text-black whitespace-nowrap bg-slate-50/70">
                      Kode <span className="text-rose-500">*</span>
                    </td>
                    <td className="p-0 align-middle">
                      <input
                        type="text"
                        placeholder="Contoh: RF08-84"
                        value={formData.kode}
                        onChange={(e) => setFormData({ ...formData, kode: e.target.value.toUpperCase() })}
                        className={`w-full py-1.5 px-2.5 text-xs font-black text-black font-mono focus:outline-none uppercase transition ${
                          errors.kode ? 'bg-rose-50 placeholder:text-rose-400' : 'focus:bg-blue-50/60 placeholder:text-slate-300'
                        }`}
                      />
                    </td>
                  </tr>

                  {/* Deskripsi */}
                  <tr className="border-b border-black">
                    <td className="py-2 px-2.5 font-bold border-r border-black align-top text-black whitespace-nowrap bg-slate-50/70">
                      Deskripsi <span className="text-rose-500">*</span>
                    </td>
                    <td className="p-0 align-top">
                      <textarea
                        rows={2}
                        placeholder="metal buckle 50mm metal buckle-female"
                        value={formData.deskripsi}
                        onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
                        className={`w-full py-1.5 px-2.5 text-xs font-medium text-black focus:outline-none resize-none leading-snug transition ${
                          errors.deskripsi ? 'bg-rose-50 placeholder:text-rose-400' : 'focus:bg-blue-50/60 placeholder:text-slate-300'
                        }`}
                      />
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
                        className="w-full py-1.5 px-2.5 text-xs font-medium text-black focus:outline-none focus:bg-blue-50/60 transition placeholder:text-slate-300"
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
                        className="w-full py-1.5 px-2.5 text-sm font-black text-black focus:outline-none focus:bg-blue-50/60 transition"
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
                        className="w-full py-1.5 px-2.5 text-xs font-bold uppercase text-black focus:outline-none focus:bg-blue-50/60 transition placeholder:text-slate-300"
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
                        className="w-full py-1.5 px-2.5 text-xs font-semibold text-black focus:outline-none focus:bg-blue-50/60 transition placeholder:text-slate-300 placeholder:italic font-mono"
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
                        className="w-full py-1.5 px-2.5 text-xs font-semibold text-black focus:outline-none focus:bg-blue-50/60 transition placeholder:text-slate-300 placeholder:italic"
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
