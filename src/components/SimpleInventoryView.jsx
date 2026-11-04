import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { 
  Plus, 
  Search, 
  Printer, 
  FileSpreadsheet, 
  RotateCcw, 
  Trash2, 
  Edit3, 
  CheckSquare, 
  Square, 
  Boxes, 
  Sparkles, 
  MapPin, 
  Calendar,
  X,
  Eye,
  Check
} from 'lucide-react';
import { INITIAL_CARD_ITEMS, DEFAULT_PLACES, RACK_GROUPS } from '../data/simpleData';
import { InventoryCard } from './InventoryCard';
import { CardPrintModal } from './CardPrintModal';

const STORAGE_KEY = 'gagaclo_simple_card_inventory_v1';

export const SimpleInventoryView = () => {
  // Items state
  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map((item) => {
            if (!item.place || item.place === 'SOFI 1' || item.place === 'SOFI 2') {
              return { ...item, place: 'BOX 1 (RACK 1 - Royan)' };
            }
            return item;
          });
        }
      }
    } catch (e) {
      console.error(e);
    }
    return INITIAL_CARD_ITEMS;
  });

  // Persist items
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error(e);
    }
  }, [items]);

  // Form State
  const defaultForm = {
    id: null,
    track: 'DHL : 5475890895',
    tanggal: formatTodayDate(),
    kode: 'SAMPLE-00001',
    jenisSample: 'DEVELOP',
    style: 'Metal Buckle 50mm',
    sampleNo: 'NA',
    size: '50MM',
    deskripsi: 'Metal Buckle 50mm - Sample: NA - Size: 50MM',
    color: 'Silver',
    jumlah: 15,
    satuan: 'PCS',
    place: 'BOX 1 (RACK 1 - Royan)',
  };

  const [form, setForm] = useState(defaultForm);
  const [isEditing, setIsEditing] = useState(false);
  const [showLivePreview, setShowLivePreview] = useState(true);

  // Search & Filters
  const [search, setSearch] = useState('');
  const [filterPlace, setFilterPlace] = useState('ALL');

  // Print modal state
  const [printModalItems, setPrintModalItems] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);

  function formatTodayDate() {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    return `${now.getDate()}-${months[now.getMonth()]}-${now.getFullYear()}`;
  }

  // Handle Form Submit
  const handleSave = (e) => {
    e.preventDefault();
    if (!form.kode.trim() || !form.color.trim() || form.color.trim() === '-') {
      alert('Mohon isi Kode dan Color (Wajib diisi).');
      return;
    }

    const sampleNoTrim = (form.sampleNo || '').trim() || 'NA';
    const styleTrim = (form.style || form.deskripsi || '').trim();
    const sizeTrim = (form.size || '').trim();
    const fullDeskripsi = styleTrim 
      ? `${styleTrim} - Sample: ${sampleNoTrim} - Size: ${sizeTrim}` 
      : form.deskripsi;

    const itemToSave = {
      ...form,
      jenisSample: form.jenisSample || 'DEVELOP',
      style: styleTrim,
      sampleNo: sampleNoTrim,
      size: sizeTrim,
      deskripsi: fullDeskripsi,
    };

    if (isEditing && form.id) {
      // Update
      setItems((prev) =>
        prev.map((item) => (item.id === form.id ? { ...itemToSave } : item))
      );
      setIsEditing(false);
    } else {
      // Add New
      const newItem = {
        ...itemToSave,
        id: 'item-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      };
      setItems((prev) => [newItem, ...prev]);
    }

    // Reset to clean default
    setForm({
      id: null,
      track: '',
      tanggal: formatTodayDate(),
      kode: '',
      jenisSample: 'DEVELOP',
      style: '',
      sampleNo: 'NA',
      size: '',
      deskripsi: '',
      color: '',
      jumlah: 1,
      satuan: 'PCS',
      place: form.place || 'BOX 1 (RACK 1 - Royan)',
    });
  };

  const handleEdit = (item) => {
    setForm(item);
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id, name) => {
    if (window.confirm(`Hapus "${name}" dari list data?`)) {
      setItems((prev) => prev.filter((item) => item.id !== id));
      setSelectedIds((prev) => prev.filter((i) => i !== id));
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setForm({
      id: null,
      track: '',
      tanggal: formatTodayDate(),
      kode: '',
      deskripsi: '',
      color: '-',
      jumlah: 1,
      satuan: 'PCS',
      place: 'BOX 1 (RACK 1 - Royan)',
      qtyDipakai: '',
      tanggalDipakai: '',
    });
  };

  const handleResetData = () => {
    if (window.confirm('Reset data kembali ke contoh awal? Semua data akan dikembalikan ke contoh bawaan.')) {
      setItems(INITIAL_CARD_ITEMS);
      localStorage.removeItem(STORAGE_KEY);
      setSelectedIds([]);
    }
  };

  // Selection for batch print
  const handleToggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredItems.map((i) => i.id));
    }
  };

  // Print handlers
  const handlePrintSingle = (item) => {
    setPrintModalItems([item]);
  };

  const handlePrintSelected = () => {
    const selected = items.filter((i) => selectedIds.includes(i.id));
    if (selected.length === 0) {
      alert('Pilih minimal 1 item dengan mencentang kotak di tabel.');
      return;
    }
    setPrintModalItems(selected);
  };

  const handlePrintAll = () => {
    if (filteredItems.length === 0) {
      alert('Tidak ada item untuk dicetak.');
      return;
    }
    setPrintModalItems(filteredItems);
  };

  // Export Excel
  const handleExportExcel = () => {
    const dataToExport = items.map((item, idx) => ({
      'No': idx + 1,
      'Track': item.track,
      'Tanggal': item.tanggal,
      'Kode': item.kode,
      'Deskripsi': item.deskripsi,
      'Color': item.color,
      'Jumlah': item.jumlah,
      'Satuan': item.satuan,
      'Place': item.place,
      'Qty Dipakai': item.qtyDipakai || '',
      'Tanggal Dipakai': item.tanggalDipakai || '',
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventory Cards');
    XLSX.writeFile(wb, `GAGACLO_INVENTORY_CARDS_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Filter Items
  const filteredItems = items.filter((item) => {
    if (filterPlace !== 'ALL' && item.place !== filterPlace) {
      return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        item.kode.toLowerCase().includes(q) ||
        item.deskripsi.toLowerCase().includes(q) ||
        (item.track && item.track.toLowerCase().includes(q)) ||
        (item.place && item.place.toLowerCase().includes(q)) ||
        (item.color && item.color.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className={printModalItems ? 'no-print space-y-6' : 'space-y-6'}>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="bg-blue-600 text-white text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                GAGACLO STORAGE
              </span>
              <span className="text-xs text-slate-500 font-medium">Input & Cetak Kartu Fisik</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
              Pencatatan Inventory & Cetak Kartu Sampel
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Input data barang, simpan ke daftar, dan langsung print kartu fisik sesuai format standar kotak penyimpanan.
            </p>
          </div>

          {/* Quick Buttons */}
          <div className="flex items-center flex-wrap gap-2">
            <button
              onClick={handlePrintSelected}
              disabled={selectedIds.length === 0}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-xs ${
                selectedIds.length > 0
                  ? 'bg-blue-600 hover:bg-blue-500 text-white'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Printer className="w-4 h-4" />
              <span>Print Terpilih ({selectedIds.length})</span>
            </button>

            <button
              onClick={handlePrintAll}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>Print Semua ({filteredItems.length})</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="flex items-center space-x-1.5 px-3 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition shadow-xs"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span className="hidden sm:inline">Export Excel</span>
            </button>

            <button
              onClick={handleResetData}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
              title="Reset ke Contoh Bawaan"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Section: Form Input & Real-Time Card Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Form (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-6">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-black text-slate-900">
                {isEditing ? '✏️ Edit Data Kartu' : '➕ Input Data Baru'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Isi data di bawah ini, format kartu akan otomatis terbuat.
              </p>
            </div>
            {isEditing && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="text-xs text-slate-500 hover:text-rose-600 font-bold"
              >
                Batal Edit
              </button>
            )}
          </div>

          <form onSubmit={handleSave} className="space-y-4 text-xs">
            
            {/* Row 1: Track & Tanggal */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Track (No. Resi / Kurir)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: DHL : 5475890895"
                  value={form.track}
                  onChange={(e) => setForm({ ...form, track: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Tanggal
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 17-Jul-2026"
                  value={form.tanggal}
                  onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                />
              </div>
            </div>

            {/* Row 2: Kode, Jenis Sample, & Color */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
              <div className="sm:col-span-4">
                <label className="block font-bold text-slate-700 mb-1">
                  Kode Barang / SKU <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: RF08-84"
                  value={form.kode}
                  onChange={(e) => setForm({ ...form, kode: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 font-black font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="sm:col-span-4">
                <label className="block font-bold text-slate-700 mb-1">
                  Jenis Sample <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-1">
                  {['ORI', 'DEVELOP', 'PPS'].map((type) => {
                    const isSelected = (form.jenisSample || 'DEVELOP') === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setForm({ ...form, jenisSample: type })}
                        className={`py-2 rounded-lg text-xs font-black uppercase transition border cursor-pointer ${
                          isSelected
                            ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                        }`}
                      >
                        {isSelected && <span className="mr-0.5 text-amber-400">✓</span>}
                        {type}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="sm:col-span-4">
                <label className="block font-bold text-slate-700 mb-1">
                  Color (Warna) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Warna / Color * (Wajib)"
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                />
              </div>
            </div>

            {/* Row 3: Deskripsi (Nama Style, Sample Number, Size) */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-5">
                <label className="block font-bold text-slate-700 mb-1">
                  Nama / No. Style <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Metal Buckle 50mm"
                  value={form.style || ''}
                  onChange={(e) => setForm({ ...form, style: e.target.value, deskripsi: `${e.target.value} - Sample: ${form.sampleNo || 'NA'} - Size: ${form.size || ''}` })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                />
              </div>

              <div className="sm:col-span-4">
                <label className="block font-bold text-slate-700 mb-1">
                  Sample Number <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center space-x-1">
                  <input
                    type="text"
                    required
                    placeholder="Sample No. (NA) *"
                    value={form.sampleNo || ''}
                    onChange={(e) => setForm({ ...form, sampleNo: e.target.value.toUpperCase(), deskripsi: `${form.style || ''} - Sample: ${e.target.value.toUpperCase()} - Size: ${form.size || ''}` })}
                    className="flex-1 text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold uppercase"
                  />
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, sampleNo: 'NA', deskripsi: `${form.style || ''} - Sample: NA - Size: ${form.size || ''}` })}
                    className="px-2.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-black transition border border-slate-200"
                    title="Isi 'NA' jika tidak ada nomor sample"
                  >
                    NA
                  </button>
                </div>
              </div>

              <div className="sm:col-span-3">
                <label className="block font-bold text-slate-700 mb-1">
                  Size <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="50MM / L"
                  value={form.size || ''}
                  onChange={(e) => setForm({ ...form, size: e.target.value.toUpperCase(), deskripsi: `${form.style || ''} - Sample: ${form.sampleNo || 'NA'} - Size: ${e.target.value.toUpperCase()}` })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-black uppercase"
                />
              </div>
            </div>

            {/* Row 4: Jumlah, Satuan, Place */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Jumlah (Qty)
                </label>
                <input
                  type="number"
                  min="1"
                  value={form.jumlah}
                  onChange={(e) => setForm({ ...form, jumlah: Number(e.target.value) || 0 })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 font-black text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Satuan
                </label>
                <input
                  type="text"
                  placeholder="PCS, ROLL, METER"
                  value={form.satuan}
                  onChange={(e) => setForm({ ...form, satuan: e.target.value.toUpperCase() })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 font-bold uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700">
                    Place (Lokasi Box Penyimpanan)
                  </label>
                  <span className="text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded font-bold">
                    72 Box Tersedia
                  </span>
                </div>
                <select
                  value={form.place}
                  onChange={(e) => setForm({ ...form, place: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-xs cursor-pointer"
                >
                  {!DEFAULT_PLACES.includes(form.place) && form.place && (
                    <option value={form.place}>{form.place}</option>
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
                <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-blue-600 shrink-0" />
                  <span>Ambil tempat langsung dari Box 1 - 72 (Rak 1 - 5)</span>
                </p>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-3 flex items-center justify-end space-x-2">
              {isEditing && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl font-semibold"
                >
                  Batal
                </button>
              )}
              <button
                type="submit"
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-md transition flex items-center space-x-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>{isEditing ? 'Simpan Perubahan' : 'Tambahkan ke List'}</span>
              </button>
            </div>

          </form>
        </div>

        {/* Right: Live Preview of Card (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-6 sticky top-20">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
            <div className="flex items-center space-x-1.5">
              <Eye className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-black text-slate-900">
                Preview Kartu Fisik
              </h3>
            </div>
            <button
              onClick={() => handlePrintSingle(form)}
              className="flex items-center space-x-1 text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Preview Ini</span>
            </button>
          </div>

          <p className="text-[11px] text-slate-400 mb-3">
            Format di bawah ini adalah tampilan persis saat dicetak:
          </p>

          <div className="flex justify-center p-2 bg-slate-50 rounded-xl border border-dashed border-slate-300">
            <InventoryCard item={form} isPrintMode={false} />
          </div>
        </div>

      </div>

      {/* Bottom Section: Table List Semua Data */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        
        {/* Table Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          <div className="flex items-center space-x-3">
            <h3 className="text-base font-black text-slate-900">
              Daftar Semua Data Inventory
            </h3>
            <span className="bg-blue-100 text-blue-800 font-bold text-xs px-2.5 py-0.5 rounded-full">
              {filteredItems.length} Data
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search */}
            <div className="relative min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Cari kode, deskripsi, place..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Filter Place */}
            <select
              value={filterPlace}
              onChange={(e) => setFilterPlace(e.target.value)}
              className="text-xs p-1.5 border border-slate-300 rounded-lg bg-white font-medium"
            >
              <option value="ALL">Semua Place / Lokasi</option>
              {Array.from(new Set(items.map((i) => i.place))).map((p, idx) => (
                <option key={idx} value={p}>{p}</option>
              ))}
            </select>

            {/* Select All Checkbox Button */}
            <button
              onClick={handleSelectAll}
              className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
            >
              {selectedIds.length === filteredItems.length && filteredItems.length > 0
                ? 'Batal Pilih Semua'
                : 'Pilih Semua'}
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-900 text-slate-200 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === filteredItems.length && filteredItems.length > 0}
                    onChange={handleSelectAll}
                    className="rounded cursor-pointer"
                  />
                </th>
                <th className="py-3 px-3">Kode</th>
                <th className="py-3 px-3">Deskripsi Barang</th>
                <th className="py-3 px-3">Track</th>
                <th className="py-3 px-3">Tanggal</th>
                <th className="py-3 px-3">Color</th>
                <th className="py-3 px-3 text-center">Jumlah</th>
                <th className="py-3 px-3">Place</th>
                <th className="py-3 px-3 text-center">Qty Dipakai</th>
                <th className="py-3 px-4 text-right">Aksi Cetak / Kelola</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    Belum ada data barang. Silakan input data pada formulir di atas.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isChecked = selectedIds.includes(item.id);
                  return (
                    <tr 
                      key={item.id} 
                      className={`hover:bg-blue-50/50 transition ${
                        isChecked ? 'bg-blue-50/70' : ''
                      }`}
                    >
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelect(item.id)}
                          className="rounded cursor-pointer"
                        />
                      </td>

                      {/* Kode */}
                      <td className="py-3 px-3 font-mono font-black text-slate-900 text-sm whitespace-nowrap">
                        {item.kode}
                      </td>

                      {/* Deskripsi */}
                      <td className="py-3 px-3 font-semibold text-slate-800 max-w-xs leading-relaxed">
                        {item.deskripsi}
                      </td>

                      {/* Track */}
                      <td className="py-3 px-3 font-mono text-slate-600 whitespace-nowrap">
                        {item.track || '-'}
                      </td>

                      {/* Tanggal */}
                      <td className="py-3 px-3 font-medium text-slate-600 whitespace-nowrap">
                        {item.tanggal}
                      </td>

                      {/* Color */}
                      <td className="py-3 px-3 text-slate-600">
                        {item.color || '-'}
                      </td>

                      {/* Jumlah */}
                      <td className="py-3 px-3 text-center font-bold text-slate-900">
                        {item.jumlah} <span className="text-[10px] text-slate-500 font-normal">{item.satuan}</span>
                      </td>

                      {/* Place */}
                      <td className="py-3 px-3 font-black text-slate-900 uppercase">
                        <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                          {item.place}
                        </span>
                      </td>

                      {/* Qty Dipakai */}
                      <td className="py-3 px-3 text-center text-slate-500 italic">
                        {item.qtyDipakai || '-'}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* Print Card Button */}
                          <button
                            onClick={() => handlePrintSingle(item)}
                            className="flex items-center space-x-1 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[11px] font-bold shadow-2xs transition"
                            title="Cetak Kartu Fisik Ini"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Print Card</span>
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => handleEdit(item)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Edit"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDelete(item.id, item.deskripsi)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Hapus"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 gap-2">
          <div>
            Menampilkan <strong>{filteredItems.length}</strong> data | Terpilih untuk print:{' '}
            <strong className="text-blue-600">{selectedIds.length}</strong> kartu
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrintSelected}
              disabled={selectedIds.length === 0}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs transition ${
                selectedIds.length > 0
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              Cetak Kartu Terpilih
            </button>
          </div>
        </div>

      </div>

      </div>

      {/* Print Modal */}
      {printModalItems && (
        <CardPrintModal
          itemsToPrint={printModalItems}
          onClose={() => setPrintModalItems(null)}
        />
      )}

    </div>
  );
};
