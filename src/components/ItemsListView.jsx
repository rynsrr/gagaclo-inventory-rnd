import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { isSupport, isHelper, isSuperuser } from '../utils/authUtils';
import { 
  Search, 
  FileSpreadsheet, 
  Plus, 
  Edit3, 
  Trash2, 
  QrCode, 
  Tag, 
  Calendar, 
  Filter, 
  Layers, 
  Boxes,
  ArrowUpDown,
  CheckCircle2,
  Clock,
  AlertCircle,
  Lock,
} from 'lucide-react';

export const ItemsListView = () => {
  const { 
    items, 
    boxes, 
    racks, 
    ppicMembers, 
    deleteItem, 
    setItemModalConfig, 
    setSelectedBoxNumber,
    setQrModalBox,
    exportToExcel,
    currentUser,
  } = useInventory();

  const [search, setSearch] = useState('');
  const [filterRack, setFilterRack] = useState('ALL');
  const [filterPpic, setFilterPpic] = useState('ALL');
  const [filterCat, setFilterCat] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [sortField, setSortField] = useState('dateIn');
  const [sortAsc, setSortAsc] = useState(false);

  // Filter items
  const filtered = items.filter((item) => {
    // Rack filter
    if (filterRack !== 'ALL') {
      const box = boxes.find(b => b.boxNumber === Number(item.boxNumber));
      if (!box || box.rackId !== Number(filterRack)) return false;
    }
    // PPIC filter
    if (filterPpic !== 'ALL' && item.picName.toLowerCase() !== filterPpic.toLowerCase()) {
      return false;
    }
    // Category filter
    if (filterCat !== 'ALL' && item.category !== filterCat) {
      return false;
    }
    // Status filter
    if (filterStatus !== 'ALL' && item.status !== filterStatus) {
      return false;
    }
    // Search query
    if (search.trim() !== '') {
      const q = search.toLowerCase();
      const matchName = item.name.toLowerCase().includes(q);
      const matchSku = item.sku && item.sku.toLowerCase().includes(q);
      const matchBox = String(item.boxNumber).includes(q);
      const matchPic = item.picName.toLowerCase().includes(q);
      const matchDesc = item.description && item.description.toLowerCase().includes(q);
      return matchName || matchSku || matchBox || matchPic || matchDesc;
    }
    return true;
  });

  // Sorting
  const sorted = [...filtered].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];

    if (sortField === 'boxNumber' || sortField === 'qty') {
      valA = Number(valA) || 0;
      valB = Number(valB) || 0;
    } else {
      valA = String(valA || '').toLowerCase();
      valB = String(valB || '').toLowerCase();
    }

    if (valA < valB) return sortAsc ? -1 : 1;
    if (valA > valB) return sortAsc ? 1 : -1;
    return 0;
  });

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'In Storage':
        return (
          <span className="inline-flex items-center space-x-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>Tersedia</span>
          </span>
        );
      case 'Borrowed':
        return (
          <span className="inline-flex items-center space-x-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
            <Clock className="w-3 h-3 text-amber-600" />
            <span>Dipinjam</span>
          </span>
        );
      case 'In Review':
        return (
          <span className="inline-flex items-center space-x-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
            <AlertCircle className="w-3 h-3 text-purple-600" />
            <span>Review</span>
          </span>
        );
      default:
        return (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-5">
      
      {/* Top Action & Filter Toolbar */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama sampel, SKU, nomor box, PIC..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center flex-wrap gap-2.5">
            <button
              onClick={exportToExcel}
              className="flex items-center space-x-1.5 px-3 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg shadow-xs transition"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export ke Excel</span>
            </button>

            <button
              onClick={() => setItemModalConfig({ isOpen: true, item: null, targetBoxNumber: 1 })}
              className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>+ Catat Item Baru</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2.5 text-xs">
          <span className="font-bold text-slate-600 flex items-center space-x-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter:</span>
          </span>

          <select
            value={filterRack}
            onChange={(e) => setFilterRack(e.target.value)}
            className="p-1.5 rounded-lg border border-slate-300 bg-white font-medium"
          >
            <option value="ALL">Semua Rak</option>
            {racks.map(r => (
              <option key={r.id} value={r.id}>{r.name} ({r.category})</option>
            ))}
          </select>

          <select
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value)}
            className="p-1.5 rounded-lg border border-slate-300 bg-white font-medium"
          >
            <option value="ALL">Semua Kategori</option>
            <option value="SAMPLE">SAMPLE</option>
            <option value="MATERIAL">MATERIAL</option>
          </select>

          <select
            value={filterPpic}
            onChange={(e) => setFilterPpic(e.target.value)}
            className="p-1.5 rounded-lg border border-slate-300 bg-white font-medium"
          >
            <option value="ALL">Semua PIC</option>
            {ppicMembers.map(p => (
              <option key={p.id} value={p.name}>{p.name}</option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="p-1.5 rounded-lg border border-slate-300 bg-white font-medium"
          >
            <option value="ALL">Semua Status</option>
            <option value="In Storage">In Storage (Tersedia)</option>
            <option value="Borrowed">Borrowed (Dipinjam)</option>
            <option value="In Review">In Review</option>
          </select>

          {(filterRack !== 'ALL' || filterCat !== 'ALL' || filterPpic !== 'ALL' || filterStatus !== 'ALL' || search) && (
            <button
              onClick={() => {
                setFilterRack('ALL');
                setFilterCat('ALL');
                setFilterPpic('ALL');
                setFilterStatus('ALL');
                setSearch('');
              }}
              className="text-blue-600 font-semibold hover:underline px-1"
            >
              Reset
            </button>
          )}

          <div className="ml-auto text-slate-500 font-medium">
            Menampilkan <strong>{sorted.length}</strong> dari {items.length} item
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-900 text-slate-200 font-bold uppercase tracking-wider text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">
                  <button onClick={() => toggleSort('sku')} className="flex items-center space-x-1 hover:text-white">
                    <span>SKU / Kode</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </button>
                </th>
                <th className="py-3 px-4">
                  <button onClick={() => toggleSort('name')} className="flex items-center space-x-1 hover:text-white">
                    <span>Nama Item / Deskripsi</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </button>
                </th>
                <th className="py-3 px-4">
                  <button onClick={() => toggleSort('category')} className="flex items-center space-x-1 hover:text-white">
                    <span>Kategori</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </button>
                </th>
                <th className="py-3 px-4">
                  <button onClick={() => toggleSort('boxNumber')} className="flex items-center space-x-1 hover:text-white">
                    <span>Lokasi Box & Rak</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </button>
                </th>
                <th className="py-3 px-4">
                  <button onClick={() => toggleSort('picName')} className="flex items-center space-x-1 hover:text-white">
                    <span>PIC PPIC</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </button>
                </th>
                <th className="py-3 px-4 text-center">
                  <button onClick={() => toggleSort('qty')} className="flex items-center justify-center space-x-1 mx-auto hover:text-white">
                    <span>Qty</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </button>
                </th>
                <th className="py-3 px-4">
                  <button onClick={() => toggleSort('status')} className="flex items-center space-x-1 hover:text-white">
                    <span>Status</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </button>
                </th>
                <th className="py-3 px-4">
                  <button onClick={() => toggleSort('dateIn')} className="flex items-center space-x-1 hover:text-white">
                    <span>Tgl Masuk</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </button>
                </th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Tidak ada item yang ditemukan.
                  </td>
                </tr>
              ) : (
                sorted.map((item) => {
                  const box = boxes.find(b => b.boxNumber === Number(item.boxNumber));
                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition">
                      
                      {/* SKU */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                        {item.sku || '-'}
                      </td>

                      {/* Name & Description */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-bold text-slate-900 line-clamp-1" title={item.name}>
                          {item.name}
                        </div>
                        {item.description && (
                          <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                            {item.description}
                          </div>
                        )}
                        {item.tags && item.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {item.tags.map((t, i) => (
                              <span key={i} className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                                #{t}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          item.category === 'SAMPLE' ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        }`}>
                          {item.category}
                        </span>
                      </td>

                      {/* Box & Rack */}
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => setSelectedBoxNumber(item.boxNumber)}
                          className="font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center space-x-1"
                        >
                          <span>BOX #{item.boxNumber}</span>
                          <span className="text-[10px] font-normal text-slate-500">
                            ({box ? box.rackName : ''})
                          </span>
                        </button>
                        <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                          {box ? box.rackDescription : ''}
                        </div>
                      </td>

                      {/* PIC */}
                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        <div className="flex items-center space-x-1.5">
                          <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                          <span>{item.picName}</span>
                        </div>
                      </td>

                      {/* Qty & Unit */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-black text-slate-900 text-sm">{item.qty}</span>{' '}
                        <span className="text-slate-500 text-[11px]">{item.unit || 'pcs'}</span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {getStatusBadge(item.status)}
                      </td>

                      {/* Date In */}
                      <td className="py-3.5 px-4 font-mono text-slate-600">
                        {item.dateIn || '-'}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => {
                              if (box) setQrModalBox(box);
                            }}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                            title="Label Box"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                          </button>
                          {(!currentUser || isSuperuser(currentUser) || isSupport(currentUser) || isHelper(currentUser) || !item.picName || String(currentUser.name).trim().toLowerCase() === String(item.picName).trim().toLowerCase()) ? (
                            <>
                              <button
                                onClick={() => setItemModalConfig({ isOpen: true, item, targetBoxNumber: item.boxNumber })}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                title="Edit Item"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={async () => {
                                  if (window.confirm(`Hapus "${item.name || item.style || item.kode}"?`)) {
                                    try {
                                      await deleteItem(item.id);
                                    } catch (err) {
                                      console.error('Delete item error:', err);
                                    }
                                  }
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                title="Hapus"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <span
                              className="p-1.5 text-slate-400 inline-flex items-center"
                              title={`Terkunci: Data item ini milik PIC ${item.picName}. Satu user tidak dapat mengedit data user lain.`}
                            >
                              <Lock className="w-3.5 h-3.5 text-slate-400" />
                            </span>
                          )}
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
