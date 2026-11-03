import React, { useState, useEffect } from 'react';
import { useInventory } from '../context/InventoryContext';
import { X, Sparkles, AlertCircle, Save, Check } from 'lucide-react';

export const ItemModal = () => {
  const { 
    itemModalConfig, 
    setItemModalConfig, 
    addItem, 
    updateItem, 
    boxes, 
    racks,
    ppicMembers 
  } = useInventory();

  const isEditing = Boolean(itemModalConfig.item);
  const targetBox = itemModalConfig.targetBoxNumber || (itemModalConfig.item ? itemModalConfig.item.boxNumber : 1);

  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: 'SAMPLE',
    boxNumber: 1,
    picName: 'Royan',
    qty: 1,
    unit: 'pcs',
    status: 'In Storage',
    dateIn: new Date().toISOString().split('T')[0],
    description: '',
    tagsString: '',
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (itemModalConfig.isOpen) {
      if (itemModalConfig.item) {
        // Edit mode
        const item = itemModalConfig.item;
        setFormData({
          name: item.name || '',
          sku: item.sku || '',
          category: item.category || 'SAMPLE',
          boxNumber: Number(item.boxNumber) || 1,
          picName: item.picName || 'Royan',
          qty: item.qty || 1,
          unit: item.unit || 'pcs',
          status: item.status || 'In Storage',
          dateIn: item.dateIn || new Date().toISOString().split('T')[0],
          description: item.description || '',
          tagsString: item.tags ? item.tags.join(', ') : '',
        });
      } else {
        // New item mode
        const initialBoxNum = Number(itemModalConfig.targetBoxNumber) || 1;
        const boxObj = boxes.find(b => b.boxNumber === initialBoxNum);
        
        setFormData({
          name: '',
          sku: generateSku(boxObj ? boxObj.category : 'SAMPLE'),
          category: boxObj ? boxObj.category : 'SAMPLE',
          boxNumber: initialBoxNum,
          picName: boxObj ? boxObj.picName : 'Royan',
          qty: 1,
          unit: 'pcs',
          status: 'In Storage',
          dateIn: new Date().toISOString().split('T')[0],
          description: '',
          tagsString: '',
        });
      }
      setErrors({});
    }
  }, [itemModalConfig.isOpen, itemModalConfig.item, itemModalConfig.targetBoxNumber]);

  if (!itemModalConfig.isOpen) return null;

  function generateSku(category) {
    const prefix = category === 'MATERIAL' ? 'MAT' : 'SMP';
    const year = new Date().getFullYear();
    const rand = Math.floor(100 + Math.random() * 900);
    return `${prefix}-${year}-${rand}`;
  }

  const handleBoxChange = (boxNum) => {
    const num = Number(boxNum);
    const boxObj = boxes.find(b => b.boxNumber === num);
    if (boxObj) {
      setFormData(prev => ({
        ...prev,
        boxNumber: num,
        category: boxObj.category,
        picName: boxObj.picName,
      }));
    } else {
      setFormData(prev => ({ ...prev, boxNumber: num }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Nama item/sample wajib diisi';
    if (!formData.boxNumber) newErrors.boxNumber = 'Pilih nomor box';
    if (Number(formData.qty) <= 0) newErrors.qty = 'Quantity minimal 1';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const tags = formData.tagsString
      ? formData.tagsString.split(',').map(t => t.trim()).filter(Boolean)
      : [];

    const payload = {
      name: formData.name.trim(),
      sku: formData.sku.trim(),
      category: formData.category,
      boxNumber: Number(formData.boxNumber),
      picName: formData.picName,
      qty: Number(formData.qty),
      unit: formData.unit.trim() || 'pcs',
      status: formData.status,
      dateIn: formData.dateIn,
      description: formData.description.trim(),
      tags,
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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div>
            <h3 className="text-lg font-black tracking-tight">
              {isEditing ? 'Edit Item Inventory' : 'Catat Item Baru ke Box'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {isEditing 
                ? `Memperbarui data item di Box #${formData.boxNumber}` 
                : 'Lengkapi formulir pencatatan barang sample/material berikut.'}
            </p>
          </div>
          <button
            onClick={() => setItemModalConfig({ isOpen: false, item: null, targetBoxNumber: null })}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
          
          {/* Item Name */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Nama Item / Sampel / Material <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Contoh: Fabric Swatch Cotton Combed 30s / Sample Polo Navy"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`w-full text-sm p-2.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white ${
                errors.name ? 'border-rose-500 bg-rose-50/30' : 'border-slate-300'
              }`}
            />
            {errors.name && <p className="text-rose-500 text-xs mt-1">{errors.name}</p>}
          </div>

          {/* SKU / Item Code & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-slate-700">Kode SKU / Kode Barang</label>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, sku: generateSku(formData.category) })}
                  className="text-blue-600 hover:text-blue-800 text-[11px] font-semibold flex items-center space-x-0.5"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Generate Acak</span>
                </button>
              </div>
              <input
                type="text"
                placeholder="SMP-2026-001"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                className="w-full text-sm p-2.5 rounded-lg border border-slate-300 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Kategori Dokumen</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full text-sm p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium"
              >
                <option value="SAMPLE">SAMPLE (Rak 1 - 2)</option>
                <option value="MATERIAL">MATERIAL (Rak 3 - 5)</option>
              </select>
            </div>
          </div>

          {/* Box Selector & Auto-fill PIC */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Pilih Nomor Box (1 - 72) <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.boxNumber}
                onChange={(e) => handleBoxChange(e.target.value)}
                className="w-full text-sm p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-bold"
              >
                {boxes.map((b) => (
                  <option key={b.boxNumber} value={b.boxNumber}>
                    BOX {b.boxNumber} ({b.rackName} - {b.category} - PIC: {b.picName})
                  </option>
                ))}
              </select>
              {currentBoxObj && (
                <p className="text-[11px] text-slate-500 mt-1">
                  📍 {currentBoxObj.rackName} • {currentBoxObj.rackDescription}
                </p>
              )}
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                PIC PPIC (Penanggung Jawab)
              </label>
              <select
                value={formData.picName}
                onChange={(e) => setFormData({ ...formData, picName: e.target.value })}
                className="w-full text-sm p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-semibold"
              >
                {ppicMembers.map((p) => (
                  <option key={p.id} value={p.name}>
                    #{p.ppicNumber} {p.name}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 mt-1">
                Sesuai pembagian manifest: Box {formData.boxNumber} ditugaskan ke {currentBoxObj?.picName}.
              </p>
            </div>
          </div>

          {/* Quantity, Unit & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Jumlah (Qty) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={formData.qty}
                onChange={(e) => setFormData({ ...formData, qty: e.target.value })}
                className="w-full text-sm p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
              />
              {errors.qty && <p className="text-rose-500 text-xs mt-1">{errors.qty}</p>}
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Satuan</label>
              <input
                type="text"
                placeholder="pcs, roll, meter, cards"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full text-sm p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Status Fisik</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full text-sm p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium"
              >
                <option value="In Storage">In Storage (Tersedia)</option>
                <option value="Borrowed">Borrowed (Dipinjam)</option>
                <option value="In Review">In Review (Uji Coba)</option>
                <option value="Production">Production (Di Workshop)</option>
              </select>
            </div>
          </div>

          {/* Date In & Tags */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Tanggal Masuk</label>
              <input
                type="date"
                value={formData.dateIn}
                onChange={(e) => setFormData({ ...formData, dateIn: e.target.value })}
                className="w-full text-sm p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Tags / Label (Pisahkan koma)</label>
              <input
                type="text"
                placeholder="Cotton, Outer, SS27, Washing"
                value={formData.tagsString}
                onChange={(e) => setFormData({ ...formData, tagsString: e.target.value })}
                className="w-full text-sm p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Notes / Description */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Spesifikasi & Keterangan Tambahan</label>
            <textarea
              rows={3}
              placeholder="Catatan detail material, nama vendor, hasil fitting, dsb..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={() => setItemModalConfig({ isOpen: false, item: null, targetBoxNumber: null })}
              className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg font-semibold transition"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow-md transition flex items-center space-x-1.5"
            >
              <Save className="w-4 h-4" />
              <span>{isEditing ? 'Simpan Perubahan' : 'Catat ke Inventory'}</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
