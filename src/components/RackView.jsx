import React, { useState } from 'react';
import { 
  useInventory 
} from '../context/InventoryContext';
import { 
  Search, 
  Filter, 
  Box as BoxIcon, 
  MapPin, 
  User, 
  Plus, 
  QrCode, 
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Eye,
  Info
} from 'lucide-react';

export const RackView = () => {
  const { 
    racks, 
    boxes, 
    items, 
    ppicMembers, 
    getItemsInBox, 
    setSelectedBoxNumber, 
    setItemModalConfig, 
    setQrModalBox,
    selectedRackFilter,
    setSelectedRackFilter,
    selectedPpicFilter,
    setSelectedPpicFilter,
    selectedCategoryFilter,
    setSelectedCategoryFilter,
    searchQuery,
    setSearchQuery
  } = useInventory();

  const [viewDensity, setViewDensity] = useState('normal'); // 'normal' or 'compact'

  // Filter boxes according to user selections
  const filteredBoxes = boxes.filter((box) => {
    // Rack filter
    if (selectedRackFilter !== 'ALL' && box.rackId !== Number(selectedRackFilter)) {
      return false;
    }
    // PPIC filter
    if (selectedPpicFilter !== 'ALL' && box.picName.toLowerCase() !== selectedPpicFilter.toLowerCase()) {
      return false;
    }
    // Category filter
    if (selectedCategoryFilter !== 'ALL' && box.category !== selectedCategoryFilter) {
      return false;
    }
    // Search query
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchBox = String(box.boxNumber).includes(q) || box.code.toLowerCase().includes(q);
      const matchPic = box.picName.toLowerCase().includes(q);
      const matchRack = box.rackName.toLowerCase().includes(q);
      
      // Also match items inside box
      const boxItems = getItemsInBox(box.boxNumber);
      const matchItem = boxItems.some(i => 
        i.name.toLowerCase().includes(q) || 
        (i.sku && i.sku.toLowerCase().includes(q)) ||
        (i.description && i.description.toLowerCase().includes(q))
      );

      return matchBox || matchPic || matchRack || matchItem;
    }
    return true;
  });

  // Get distinct racks present in filteredBoxes
  const racksToDisplay = selectedRackFilter === 'ALL' 
    ? racks 
    : racks.filter(r => r.id === Number(selectedRackFilter));

  const getPpicBadge = (picName) => {
    switch (picName) {
      case 'Royan':
        return { bg: 'bg-indigo-100 text-indigo-800 border-indigo-200', dot: 'bg-indigo-600' };
      case 'Cynara':
        return { bg: 'bg-purple-100 text-purple-800 border-purple-200', dot: 'bg-purple-600' };
      case 'Ami':
        return { bg: 'bg-emerald-100 text-emerald-800 border-emerald-200', dot: 'bg-emerald-600' };
      case 'Ryan':
        return { bg: 'bg-amber-100 text-amber-800 border-amber-200', dot: 'bg-amber-600' };
      case 'Hanami':
        return { bg: 'bg-rose-100 text-rose-800 border-rose-200', dot: 'bg-rose-600' };
      default:
        return { bg: 'bg-slate-100 text-slate-800 border-slate-200', dot: 'bg-slate-600' };
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Control & Filter Toolbar */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nomor box (cth: 16), nama PIC, atau nama barang..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Filter Rak */}
            <div className="flex items-center space-x-1.5 text-xs font-medium text-slate-700 bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200">
              <span className="text-slate-500">Rak:</span>
              <select
                value={selectedRackFilter}
                onChange={(e) => setSelectedRackFilter(e.target.value)}
                className="bg-transparent font-semibold focus:outline-none cursor-pointer"
              >
                <option value="ALL">Semua Rak (1-5)</option>
                {racks.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.category})
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Kategori */}
            <div className="flex items-center space-x-1.5 text-xs font-medium text-slate-700 bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200">
              <span className="text-slate-500">Kategori:</span>
              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="bg-transparent font-semibold focus:outline-none cursor-pointer"
              >
                <option value="ALL">Semua Kategori</option>
                <option value="SAMPLE">SAMPLE (Rak 1-2)</option>
                <option value="MATERIAL">MATERIAL (Rak 3-5)</option>
              </select>
            </div>

            {/* Filter PPIC PIC */}
            <div className="flex items-center space-x-1.5 text-xs font-medium text-slate-700 bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200">
              <span className="text-slate-500">PIC PPIC:</span>
              <select
                value={selectedPpicFilter}
                onChange={(e) => setSelectedPpicFilter(e.target.value)}
                className="bg-transparent font-semibold focus:outline-none cursor-pointer"
              >
                <option value="ALL">Semua Anggota PPIC</option>
                {ppicMembers.map((p) => (
                  <option key={p.id} value={p.name}>
                    #{p.ppicNumber} {p.name} ({p.totalBoxes} Box)
                  </option>
                ))}
              </select>
            </div>

            {/* Reset Filter Button */}
            {(selectedRackFilter !== 'ALL' || selectedCategoryFilter !== 'ALL' || selectedPpicFilter !== 'ALL' || searchQuery !== '') && (
              <button
                onClick={() => {
                  setSelectedRackFilter('ALL');
                  setSelectedCategoryFilter('ALL');
                  setSelectedPpicFilter('ALL');
                  setSearchQuery('');
                }}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold px-2 py-1 underline"
              >
                Reset Filter
              </button>
            )}
          </div>
        </div>

        {/* Legend bar */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
          <div className="flex items-center flex-wrap gap-3">
            <span className="font-semibold text-slate-700">Warna PIC PPIC:</span>
            {ppicMembers.map((pic) => (
              <button
                key={pic.id}
                onClick={() => setSelectedPpicFilter(selectedPpicFilter === pic.name ? 'ALL' : pic.name)}
                className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-md border text-xs font-medium transition ${
                  selectedPpicFilter === pic.name ? 'ring-2 ring-blue-500 shadow-sm' : ''
                } ${pic.tagBg}`}
              >
                <span className={`w-2 h-2 rounded-full ${pic.avatarBg}`}></span>
                <span>{pic.name}</span>
                <span className="opacity-70">({pic.totalBoxes})</span>
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-3 text-slate-400">
            <span className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500"></span>
              <span>Ada Item</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded bg-slate-200 border border-slate-300"></span>
              <span>Kosong</span>
            </span>
          </div>
        </div>
      </div>

      {/* Racks Sections */}
      <div className="space-y-8">
        {racksToDisplay.map((rack) => {
          // Get boxes for this rack that match filter
          const rackBoxes = filteredBoxes.filter((b) => b.rackId === rack.id);

          if (rackBoxes.length === 0 && (selectedPpicFilter !== 'ALL' || searchQuery)) {
            return null; // hide empty filtered rack
          }

          const isBlueRack = rack.rackType.toLowerCase().includes('blue');

          return (
            <div 
              key={rack.id} 
              className={`bg-white rounded-2xl shadow-sm border overflow-hidden transition ${
                isBlueRack ? 'border-blue-300 shadow-blue-50' : 'border-slate-300'
              }`}
            >
              {/* Rack Header matching Document styling */}
              <div 
                className={`px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b ${
                  isBlueRack 
                    ? 'bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white border-blue-800' 
                    : 'bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white border-slate-800'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`px-2.5 py-1 rounded text-xs font-black uppercase tracking-wider ${
                    rack.category === 'SAMPLE' ? 'bg-amber-400 text-slate-950 font-bold' : 'bg-emerald-400 text-slate-950 font-bold'
                  }`}>
                    {rack.category}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h2 className="text-xl font-black tracking-tight">{rack.name}</h2>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white/20 font-medium">
                        {rack.boxRange}
                      </span>
                    </div>
                    <p className="text-xs text-slate-200 flex items-center space-x-1.5 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 inline text-slate-300" />
                      <span>{rack.fullDescription}</span>
                    </p>
                  </div>
                </div>

                {/* Rack Stats */}
                <div className="flex items-center space-x-3 text-xs">
                  <div className="bg-black/20 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-white/10">
                    <span className="text-slate-300">Total Box: </span>
                    <strong className="text-white font-bold">{rack.totalBoxes} Box</strong>
                  </div>
                  <div className="bg-black/20 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-white/10">
                    <span className="text-slate-300">Tampil: </span>
                    <strong className="text-emerald-300 font-bold">{rackBoxes.length} Box</strong>
                  </div>
                </div>
              </div>

              {/* Physical Shelves Container */}
              <div className="p-5 sm:p-6 bg-slate-100/60">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3.5">
                  {rackBoxes.map((box) => {
                    const boxItems = getItemsInBox(box.boxNumber);
                    const itemCount = boxItems.length;
                    const totalQty = boxItems.reduce((acc, curr) => acc + (Number(curr.qty) || 0), 0);
                    const hasItems = itemCount > 0;
                    const ppicStyle = getPpicBadge(box.picName);

                    return (
                      <div
                        key={box.boxNumber}
                        onClick={() => setSelectedBoxNumber(box.boxNumber)}
                        className={`group relative bg-white rounded-xl border p-3.5 flex flex-col justify-between transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md hover:-translate-y-0.5 ${
                          hasItems
                            ? 'border-slate-300 hover:border-blue-500 ring-0 hover:ring-2 hover:ring-blue-100'
                            : 'border-dashed border-slate-300/80 bg-slate-50/50 hover:bg-white hover:border-slate-400'
                        }`}
                      >
                        {/* Top Indicator & Box Code */}
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-1.5">
                            <span className="text-lg font-black text-slate-900 tracking-tight">
                              #{box.boxNumber}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              {box.code}
                            </span>
                          </div>
                          
                          {/* Item status badge */}
                          {hasItems ? (
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center space-x-0.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              <span>{itemCount}</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-medium italic">
                              Kosong
                            </span>
                          )}
                        </div>

                        {/* Middle: PPIC PIC Name */}
                        <div className="my-2.5">
                          <div className={`inline-flex items-center space-x-1 text-xs font-semibold px-2 py-0.5 rounded-md border ${ppicStyle.bg}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${ppicStyle.dot}`}></span>
                            <span>{box.picName}</span>
                          </div>
                          
                          {/* Item Preview list */}
                          {hasItems && (
                            <p className="text-[11px] text-slate-600 line-clamp-1 mt-1.5 font-medium" title={boxItems[0]?.name}>
                              {boxItems[0]?.name}
                              {itemCount > 1 && ` (+${itemCount - 1} lainnya)`}
                            </p>
                          )}
                        </div>

                        {/* Footer & Quick Hover Actions */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                          <span>
                            {hasItems ? `${totalQty} unit` : '0 unit'}
                          </span>
                          
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setQrModalBox(box);
                              }}
                              className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                              title="Cetak Label QR Box"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setItemModalConfig({ isOpen: true, item: null, targetBoxNumber: box.boxNumber });
                              }}
                              className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"
                              title="Tambah Item ke Box Ini"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Visual Occupancy Bar */}
                        <div className="absolute bottom-0 left-0 right-0 h-1 rounded-b-xl overflow-hidden bg-slate-100">
                          <div 
                            className={`h-full transition-all duration-300 ${
                              hasItems ? 'bg-blue-500' : 'bg-transparent'
                            }`}
                            style={{ width: hasItems ? `${Math.min(100, (itemCount / 5) * 100)}%` : '0%' }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}

        {filteredBoxes.length === 0 && (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
            <BoxIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">Tidak ada box yang cocok</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
              Coba sesuaikan kata kunci pencarian atau ubah filter Rak, Kategori, atau PIC PPIC.
            </p>
            <button
              onClick={() => {
                setSelectedRackFilter('ALL');
                setSelectedCategoryFilter('ALL');
                setSelectedPpicFilter('ALL');
                setSearchQuery('');
              }}
              className="mt-4 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-500 transition shadow-sm"
            >
              Tampilkan Semua Box
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
