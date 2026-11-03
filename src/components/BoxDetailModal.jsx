import React, { useState } from 'react';
import { 
  useInventory 
} from '../context/InventoryContext';
import { 
  X, 
  Plus, 
  QrCode, 
  Edit3, 
  Trash2, 
  ArrowRightLeft, 
  Calendar, 
  Tag, 
  MapPin, 
  User, 
  Boxes, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  FileText,
  Save,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

export const BoxDetailModal = () => {
  const { 
    selectedBoxNumber, 
    setSelectedBoxNumber, 
    getBoxDetails, 
    getItemsInBox, 
    deleteItem, 
    setItemModalConfig, 
    setQrModalBox,
    updateBoxNotes,
    setTransactionModalConfig,
    updateItem
  } = useInventory();

  if (selectedBoxNumber === null) return null;

  const box = getBoxDetails(selectedBoxNumber);
  if (!box) return null;

  const itemsInBox = getItemsInBox(selectedBoxNumber);
  const [boxNotes, setBoxNotes] = useState(box.notes || '');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [filterStatus, setFilterStatus] = useState('ALL');

  const handleSaveNotes = () => {
    setIsSavingNotes(true);
    updateBoxNotes(box.boxNumber, boxNotes);
    setTimeout(() => setIsSavingNotes(false), 600);
  };

  const filteredItems = itemsInBox.filter(item => {
    if (filterStatus === 'ALL') return true;
    return item.status === filterStatus;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'In Storage':
        return <span className="inline-flex items-center space-x-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          <span>Tersimpan (In Storage)</span>
        </span>;
      case 'Borrowed':
        return <span className="inline-flex items-center space-x-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
          <Clock className="w-3 h-3 text-amber-600" />
          <span>Dipinjam (Borrowed)</span>
        </span>;
      case 'In Review':
        return <span className="inline-flex items-center space-x-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
          <AlertCircle className="w-3 h-3 text-purple-600" />
          <span>Sedang Review</span>
        </span>;
      default:
        return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
          {status}
        </span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-start justify-between border-b border-slate-800">
          <div className="flex items-start space-x-3.5">
            <div className="bg-blue-600 text-white text-xl font-black px-3.5 py-2 rounded-xl shadow-inner border border-blue-400/40">
              #{box.boxNumber}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-black tracking-tight">{box.code}</h2>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${
                  box.category === 'SAMPLE' ? 'bg-amber-400 text-slate-950' : 'bg-emerald-400 text-slate-950'
                }`}>
                  {box.category}
                </span>
                <span className="text-xs text-slate-300 font-medium px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                  {box.rackName}
                </span>
              </div>
              <p className="text-xs text-slate-300 flex items-center space-x-1.5 mt-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>{box.rackDescription}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setQrModalBox(box)}
              className="flex items-center space-x-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 transition"
              title="Cetak Label QR Box"
            >
              <QrCode className="w-4 h-4 text-sky-400" />
              <span className="hidden sm:inline">Label QR</span>
            </button>
            <button
              onClick={() => setSelectedBoxNumber(null)}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PIC & Quick Stats Bar */}
        <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-3">
            <span className="text-slate-500 font-medium">Penanggung Jawab PPIC:</span>
            <div className="flex items-center space-x-2 bg-white px-3 py-1 rounded-lg border border-slate-200 shadow-2xs font-semibold text-slate-800">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
              <span>#{box.ppicNumber} {box.picName}</span>
            </div>
          </div>

          <div className="flex items-center space-x-4 text-slate-600">
            <div>
              Item Tercatat: <strong className="text-slate-900 font-bold">{itemsInBox.length} jenis</strong>
            </div>
            <div>
              Total Fisik: <strong className="text-slate-900 font-bold">{itemsInBox.reduce((sum, i) => sum + (Number(i.qty) || 0), 0)} unit</strong>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-5">
          
          {/* Action Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-bold text-slate-900">
                Daftar Barang di Box #{box.boxNumber}
              </h3>
              <span className="bg-slate-200 text-slate-700 text-xs px-2 py-0.5 rounded-full font-bold">
                {itemsInBox.length}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setItemModalConfig({ isOpen: true, item: null, targetBoxNumber: box.boxNumber })}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-xs transition"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Item ke Box Ini</span>
              </button>
            </div>
          </div>

          {/* Items List */}
          {itemsInBox.length === 0 ? (
            <div className="text-center py-12 px-4 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              <Boxes className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">Box ini masih kosong</p>
              <p className="text-xs text-slate-500 mt-0.5">Belum ada sample atau material yang dicatat ke Box #{box.boxNumber}.</p>
              <button
                onClick={() => setItemModalConfig({ isOpen: true, item: null, targetBoxNumber: box.boxNumber })}
                className="mt-3 inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Catat Item Pertama</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {itemsInBox.map((item) => (
                <div 
                  key={item.id}
                  className="bg-white rounded-xl border border-slate-200 p-4 hover:border-slate-300 shadow-2xs hover:shadow-xs transition"
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                    
                    {/* Item Details */}
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center flex-wrap gap-2">
                        {item.sku && (
                          <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                            {item.sku}
                          </span>
                        )}
                        <h4 className="text-sm font-bold text-slate-900">
                          {item.name}
                        </h4>
                        {getStatusBadge(item.status)}
                      </div>

                      {item.description && (
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                          {item.description}
                        </p>
                      )}

                      <div className="flex items-center flex-wrap gap-3 pt-2 text-xs text-slate-500">
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>Masuk: {item.dateIn || '-'}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>PIC: {item.picName}</span>
                        </span>
                        {item.tags && item.tags.length > 0 && (
                          <div className="flex items-center space-x-1">
                            <Tag className="w-3.5 h-3.5 text-slate-400" />
                            {item.tags.map((t, idx) => (
                              <span key={idx} className="bg-slate-100 text-slate-600 text-[10px] px-1.5 py-0.2 rounded">
                                #{t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Qty & Actions */}
                    <div className="flex md:flex-col items-center md:items-end justify-between border-t md:border-t-0 pt-2 md:pt-0 gap-2">
                      <div className="text-right">
                        <div className="text-base font-black text-slate-900">
                          {item.qty} <span className="text-xs font-normal text-slate-500">{item.unit || 'pcs'}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1.5">
                        {/* Quick Toggle Status */}
                        <button
                          onClick={() => {
                            const newStatus = item.status === 'In Storage' ? 'Borrowed' : 'In Storage';
                            updateItem(item.id, { status: newStatus });
                          }}
                          className="px-2 py-1 text-[11px] font-semibold rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                          title="Ganti Status Cepat"
                        >
                          {item.status === 'In Storage' ? 'Pinjamkan' : 'Kembalikan'}
                        </button>

                        {/* Edit Button */}
                        <button
                          onClick={() => setItemModalConfig({ isOpen: true, item, targetBoxNumber: box.boxNumber })}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Edit Item"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => {
                            if (window.confirm(`Hapus "${item.name}" dari Box #${box.boxNumber}?`)) {
                              deleteItem(item.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Hapus Item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Internal Box Notes section */}
          <div className="pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>Catatan Tambahan Box #{box.boxNumber}</span>
              </label>
              <button
                onClick={handleSaveNotes}
                className="flex items-center space-x-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSavingNotes ? 'Tersimpan!' : 'Simpan Catatan'}</span>
              </button>
            </div>
            <textarea
              rows={2}
              value={boxNotes}
              onChange={(e) => setBoxNotes(e.target.value)}
              placeholder="Tambahkan catatan khusus untuk box ini (misal: kondisi box, prioritas sampling, instruksi penyimpanan khusus)..."
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
            />
          </div>

        </div>

        {/* Footer */}
        <div className="bg-slate-100 px-5 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Nomor Box: <strong>{box.boxNumber} of 72</strong></span>
          <button
            onClick={() => setSelectedBoxNumber(null)}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg transition"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
