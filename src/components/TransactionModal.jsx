import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { X, ArrowLeftRight, Save } from 'lucide-react';

export const TransactionModal = ({ isOpen, onClose }) => {
  const { items, boxes, ppicMembers, addTransaction, updateItem } = useInventory();

  const [type, setType] = useState('BORROW');
  const [selectedItemId, setSelectedItemId] = useState(items[0]?.id || '');
  const [boxNumber, setBoxNumber] = useState(1);
  const [qty, setQty] = useState(1);
  const [unit, setUnit] = useState('pcs');
  const [picName, setPicName] = useState('Royan');
  const [recipient, setRecipient] = useState('');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleItemSelect = (itemId) => {
    setSelectedItemId(itemId);
    const item = items.find(i => i.id === itemId);
    if (item) {
      setBoxNumber(item.boxNumber);
      setPicName(item.picName);
      setUnit(item.unit || 'pcs');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const item = items.find(i => i.id === selectedItemId);
    const targetBox = boxes.find(b => b.boxNumber === Number(boxNumber));

    const itemName = item ? item.name : 'Sample Item';

    addTransaction({
      type,
      itemId: selectedItemId,
      itemName,
      boxNumber: Number(boxNumber),
      rackName: targetBox ? targetBox.rackName : 'RACK 1',
      qty: Number(qty) || 1,
      unit,
      picName,
      recipientOrSource: recipient.trim() || '-',
      notes: notes.trim(),
    });

    // If borrowing or returning, optionally sync item status
    if (item) {
      if (type === 'BORROW') {
        updateItem(item.id, { status: 'Borrowed' });
      } else if (type === 'RETURN') {
        updateItem(item.id, { status: 'In Storage' });
      }
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ArrowLeftRight className="w-5 h-5 text-blue-400" />
            <h3 className="text-base font-bold">Catat Mutasi / Peminjaman Barang</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          
          {/* Transaction Type */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Jenis Mutasi</label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'BORROW', label: 'Pinjam' },
                { id: 'RETURN', label: 'Kembali' },
                { id: 'IN', label: 'Masuk' },
                { id: 'OUT', label: 'Keluar' },
              ].map((t) => (
                <button
                  type="button"
                  key={t.id}
                  onClick={() => setType(t.id)}
                  className={`py-2 text-xs font-bold rounded-lg border transition ${
                    type === t.id
                      ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Select Item */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Pilih Item Inventory</label>
            <select
              value={selectedItemId}
              onChange={(e) => handleItemSelect(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium"
            >
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} (Box #{i.boxNumber} - {i.picName})
                </option>
              ))}
            </select>
          </div>

          {/* Qty & Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Jumlah</label>
              <input
                type="number"
                min="1"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Satuan</label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* PIC & Recipient */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">PIC PPIC</label>
              <select
                value={picName}
                onChange={(e) => setPicName(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white font-semibold"
              >
                {ppicMembers.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {type === 'BORROW' ? 'Nama Peminjam / Tim' : 'Pihak Terkait'}
              </label>
              <input
                type="text"
                placeholder="Contoh: Tim QC / Desainer Cindy"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Catatan / Keperluan</label>
            <textarea
              rows={2}
              placeholder="Tuliskan tujuan peminjaman atau pengeluaran sampel..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-100 font-semibold"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold flex items-center space-x-1.5 shadow-xs"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Mutasi</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
