import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { X, ArrowLeftRight, Save } from 'lucide-react';

export const TransactionModal = ({ isOpen, onClose }) => {
  const { items, boxes, ppicMembers, addTransaction, updateItem, currentUser } = useInventory();

  const [type, setType] = useState('BORROW');
  const [selectedItemId, setSelectedItemId] = useState(items[0]?.id || '');
  const [boxNumber, setBoxNumber] = useState(1);
  const [qty, setQty] = useState(1);
  const [unit, setUnit] = useState('pcs');
  const [picName, setPicName] = useState(() => currentUser?.name || 'Royan');
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
    <div className="font-apple fixed inset-0 z-50 bg-black/50 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-[26px] shadow-[0_30px_70px_rgba(0,0,0,0.2)] border border-black/[0.08] w-full max-w-lg overflow-hidden">
        
        {/* Apple Style Header */}
        <div className="bg-[#fbfbfd] px-6 py-4 flex items-center justify-between border-b border-black/[0.06] shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0071e3]/10 text-[#0071e3]">
              <ArrowLeftRight className="w-4 h-4" />
            </div>
            <h3 className="text-[15px] font-semibold text-[#1d1d1f] tracking-tight">Catat Mutasi / Peminjaman Barang</h3>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f5f5f7] hover:bg-[#e8e8ed] text-[#86868b] hover:text-[#1d1d1f] transition-colors cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-xs">
          
          {/* Transaction Type Segmented */}
          <div>
            <label className="block font-medium text-[#1d1d1f] mb-1.5">Jenis Mutasi</label>
            <div className="grid grid-cols-4 gap-1.5 bg-black/[0.04] p-1 rounded-full border border-black/[0.04]">
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
                  className={`py-1.5 text-xs font-medium rounded-full transition cursor-pointer text-center ${
                    type === t.id
                      ? 'bg-white text-[#1d1d1f] shadow-xs'
                      : 'text-[#86868b] hover:text-[#1d1d1f]'
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

          {/* Apple Style Actions */}
          <div className="pt-3 border-t border-black/[0.06] flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-[#1d1d1f] bg-[#f5f5f7] hover:bg-[#ebebee] border border-black/[0.06] transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-xl text-xs font-medium flex items-center space-x-1.5 shadow-xs transition cursor-pointer"
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
