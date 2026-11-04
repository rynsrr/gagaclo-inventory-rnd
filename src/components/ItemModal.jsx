import React, { useState, useEffect } from 'react';
import { useInventory } from '../context/InventoryContext';
import { InventoryCard } from './InventoryCard';
import { RACK_GROUPS, DEFAULT_PLACES } from '../data/simpleData';
import { 
  X, 
  Save, 
  Printer, 
  MapPin, 
  Sparkles, 
  FileText, 
  Calendar, 
  Check 
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
        // Edit mode: populate from existing item
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
        // New item mode: targetBoxNum
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
    // Extract box number from string like "BOX 12 (RACK 1 - Ryan)"
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
    if (!formData.kode.trim()) newErrors.kode = 'Kode barang wajib diisi (contoh: RF08-84)';
    if (!formData.deskripsi.trim()) newErrors.deskripsi = 'Deskripsi barang wajib diisi';
    if (Number(formData.jumlah) <= 0) newErrors.jumlah = 'Jumlah minimal 1';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const boxNum = Number(formData.boxNumber) || 1;
    const boxObj = boxes.find(b => b.boxNumber === boxNum);

    const payload = {
      // 1. Exact Sample Card Fields
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

      // 2. Compatibility mapping for system context & 3D warehouse
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
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-4xl overflow-hidden flex flex-col max-h-[94vh]">
        
        {/* Modal Header */}
        <div className="no-print bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-600 rounded-xl text-white shadow-sm">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-black tracking-tight text-white">
                  {isEditing ? 'Edit Data Kartu Sampel' : 'Catat Item Baru ke Box'}
                </h3>
                <span className="bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">
                  Format Kartu Fisik
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Formulir input disamakan persis dengan standar kartu fisik inventory: Track, Tanggal, Kode, Deskripsi, Color, Jumlah, Satuan, Place.
              </p>
            </div>
          </div>
          <button
            onClick={() => setItemModalConfig({ isOpen: false, item: null, targetBoxNumber: null })}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Split into Form (Left) and Live Card Preview (Right) */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 bg-slate-50">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left: Form Fields (7 Columns on LG) */}
            <form onSubmit={handleSubmit} id="sample-card-form" className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3.5 text-xs">
              
              {/* Row 1: Track & Tanggal */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Track (No. Resi / Pengiriman)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: DHL : 5475890895"
                    value={formData.track}
                    onChange={(e) => setFormData({ ...formData, track: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Tanggal <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 17-Jul-2026"
                    value={formData.tanggal}
                    onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
              </div>

              {/* Row 2: Kode & Color */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Kode (Kode Sampel / Material) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: RF08-84 atau SMP-POLO-01"
                    value={formData.kode}
                    onChange={(e) => setFormData({ ...formData, kode: e.target.value.toUpperCase() })}
                    className={`w-full text-xs p-2.5 rounded-lg border font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white ${
                      errors.kode ? 'border-rose-500 bg-rose-50/40' : 'border-slate-300'
                    }`}
                  />
                  {errors.kode && <p className="text-rose-500 text-[11px] mt-1">{errors.kode}</p>}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Color (Warna)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Navy, Antique Silver, atau -"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
              </div>

              {/* Row 3: Deskripsi */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Deskripsi Barang <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Contoh: metal buckle 50mm metal buckle-female / Fabric Swatch 24s"
                  value={formData.deskripsi}
                  onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
                  className={`w-full text-xs p-2.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white leading-relaxed ${
                    errors.deskripsi ? 'border-rose-500 bg-rose-50/40' : 'border-slate-300'
                  }`}
                />
                {errors.deskripsi && <p className="text-rose-500 text-[11px] mt-1">{errors.deskripsi}</p>}
              </div>

              {/* Row 4: Jumlah, Satuan & Place */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Jumlah <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.jumlah}
                    onChange={(e) => setFormData({ ...formData, jumlah: Number(e.target.value) || 0 })}
                    className={`w-full text-xs p-2.5 rounded-lg border font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white ${
                      errors.jumlah ? 'border-rose-500' : 'border-slate-300'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Satuan
                  </label>
                  <input
                    type="text"
                    placeholder="PCS, ROLL, METER"
                    value={formData.satuan}
                    onChange={(e) => setFormData({ ...formData, satuan: e.target.value.toUpperCase() })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 font-bold uppercase focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Status Fisik
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="In Storage">In Storage (Tersedia)</option>
                    <option value="Borrowed">Borrowed (Dipinjam)</option>
                    <option value="In Review">In Review (Uji Coba)</option>
                    <option value="Production">Production (Di Workshop)</option>
                  </select>
                </div>
              </div>

              {/* Row 5: Place (Pilihan 72 Box Penyimpanan) */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-800">
                    Place (Lokasi Box Penyimpanan) <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-blue-700 bg-blue-100 font-bold px-1.5 py-0.5 rounded">
                    Box 1 - 72 (Rak 1 - 5)
                  </span>
                </div>
                <select
                  value={formData.place}
                  onChange={(e) => handleBoxSelect(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer"
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
                {currentBoxObj && (
                  <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>Lokasi: {currentBoxObj.rackName} ({currentBoxObj.rackDescription}) • PIC: <strong>{currentBoxObj.picName}</strong></span>
                  </p>
                )}
              </div>

              {/* Row 6: Qty Dipakai & Tanggal Dipakai */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-100">
                <div>
                  <label className="block font-bold italic text-slate-600 mb-1">
                    Qty Dipakai (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="Kosongkan jika kartu untuk tulis manual"
                    value={formData.qtyDipakai}
                    onChange={(e) => setFormData({ ...formData, qtyDipakai: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold italic text-slate-600 mb-1">
                    Tanggal Dipakai (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="Kosongkan jika kartu untuk tulis manual"
                    value={formData.tanggalDipakai}
                    onChange={(e) => setFormData({ ...formData, tanggalDipakai: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

            </form>

            {/* Right: Live Preview Sample Card (5 Columns on LG) */}
            <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3 sticky top-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center space-x-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    Live Preview Kartu Fisik
                  </h4>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">1:1 Tag Cetak</span>
              </div>

              <p className="text-[11px] text-slate-500 leading-tight">
                Kartu di bawah ini terupdate otomatis secara real-time dan siap langsung dicetak untuk ditempelkan pada fisik sampel/box:
              </p>

              {/* Exact Card Preview */}
              <div className="flex justify-center p-2 bg-slate-50 rounded-xl border border-dashed border-slate-300 overflow-x-auto">
                <InventoryCard item={formData} isPrintMode={false} />
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handlePrintCard}
                  className="w-full flex items-center justify-center space-x-2 py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-xs"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Kartu Fisik Ini (Print / PDF)</span>
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="no-print bg-white px-6 py-3.5 border-t border-slate-200 flex items-center justify-end space-x-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setItemModalConfig({ isOpen: false, item: null, targetBoxNumber: null })}
            className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold transition"
          >
            Batal
          </button>
          
          <button
            type="submit"
            form="sample-card-form"
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black shadow-md transition flex items-center space-x-1.5"
          >
            <Save className="w-4 h-4" />
            <span>{isEditing ? 'Simpan Perubahan' : 'Simpan Item ke Box'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
