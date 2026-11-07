import React, { useMemo, useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { PpicMissingMentionBar } from './PpicMissingMentionBar';
import {
  Archive,
  Search,
  List,
  Download,
  Pencil,
  Trash2,
  Plus,
  Lock,
  Clock,
  Shirt,
  CheckCircle2,
  Layers,
  Calendar,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

/**
 * Menghitung umur simpan item secara presisi berdasarkan tanggal masuk
 */
export function calculateStorageAge(dateStr) {
  if (!dateStr || dateStr === 'NA' || dateStr === '-') {
    return { days: 0, label: '-', tier: 'none' };
  }
  let parsedDate = null;
  const clean = String(dateStr).trim();
  if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(clean)) {
    const [d, m, y] = clean.split(/[-/]/);
    parsedDate = new Date(Number(y), Number(m) - 1, Number(d));
  } else if (/^\d{4}-\d{2}-\d{2}/.test(clean)) {
    const [y, m, d] = clean.split('-');
    parsedDate = new Date(Number(y), Number(m) - 1, Number(d));
  } else {
    const d = new Date(clean);
    if (!isNaN(d.getTime())) parsedDate = d;
  }

  if (!parsedDate || isNaN(parsedDate.getTime())) {
    return { days: 0, label: '-', tier: 'none' };
  }

  const now = new Date();
  const startOfDayNow = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfDayItem = new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate()).getTime();
  const diffDays = Math.max(0, Math.round((startOfDayNow - startOfDayItem) / (1000 * 60 * 60 * 24)));

  let label = `${diffDays} hari`;
  if (diffDays === 0) label = 'Hari ini';
  else if (diffDays >= 365) {
    const years = (diffDays / 365).toFixed(1);
    label = `${years} thn`;
  } else if (diffDays >= 30) {
    const m = Math.floor(diffDays / 30);
    const r = diffDays % 30;
    label = r > 0 ? `${m} bln ${r} hr` : `${m} bulan`;
  }

  let tier = 'fresh';
  if (diffDays >= 180) tier = 'critical'; // > 6 bulan (Lama)
  else if (diffDays >= 90) tier = 'aged'; // 3 - 6 bulan (Perlu Review)
  else if (diffDays >= 30) tier = 'medium'; // 1 - 3 bulan

  return { days: diffDays, label, tier };
}

export function TotalItemsSummaryView() {
  const { boxes, items, deleteItem, setItemModalConfig, currentUser } = useInventory();
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [viewMode, setViewMode] = useState('styles'); // 'styles' | 'table'
  const [ageFilter, setAgeFilter] = useState('ALL'); // 'ALL' | 'FRESH' | 'MEDIUM' | 'AGED' | 'CRITICAL'
  const [expandedStyles, setExpandedStyles] = useState({});

  const [query, setQuery] = useState('');
  const boxRackMap = useMemo(() => {
    const map = {};
    boxes.forEach((b) => {
      map[b.boxNumber] = b;
    });
    return map;
  }, [boxes]);

  const allItems = useMemo(() => {
    return items
      .map((item) => {
        const box = boxRackMap[Number(item.boxNumber)];
        const rawDate = item.tanggal || item.dateIn || 'NA';
        const age = calculateStorageAge(rawDate);
        return {
          ...item,
          track: item.track || 'NA',
          tanggal: rawDate,
          age,
          kode: item.kode || item.sku || 'NA',
          buyerNo: item.buyerNo || item.buyerNumber || 'NA',
          jenisSample: (item.jenisSample || item.sampleType || 'DEVELOP').toUpperCase(),
          style: (item.style || item.name || 'TANPA STYLE').trim(),
          sampleNo: item.sampleNo || 'NA',
          size: item.size || 'NA',
          color: item.color && item.color !== '-' ? item.color : 'NA',
          jumlah: Number.isFinite(Number(item.jumlah)) ? Number(item.jumlah) : (Number(item.qty) || 0),
          satuan: (item.satuan || item.unit || 'PCS').toUpperCase(),
          place: item.place || (box ? `BOX ${box.boxNumber} (${box.rackName} - ${box.picName})` : 'NA'),
          boxLabel: `BOX ${item.boxNumber}`,
          boxNumber: Number(item.boxNumber) || 1,
          rackName: box ? box.rackName : 'NA',
          picName: item.picName || (box ? box.picName : 'NA'),
          dateIn: item.dateIn || item.tanggal || 'NA',
        };
      })
      .sort((a, b) => b.age.days - a.age.days || Number(b.boxNumber) - Number(a.boxNumber));
  }, [items, boxRackMap]);

  // Metric counts
  const metrics = useMemo(() => {
    let fresh = 0;
    let medium = 0;
    let aged = 0;
    let critical = 0;
    allItems.forEach((i) => {
      if (i.age.tier === 'fresh') fresh++;
      else if (i.age.tier === 'medium') medium++;
      else if (i.age.tier === 'aged') aged++;
      else if (i.age.tier === 'critical') critical++;
    });
    return { fresh, medium, aged, critical, total: allItems.length };
  }, [allItems]);

  // Filtered by search & age
  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allItems.filter((item) => {
      // Age tier filter
      if (ageFilter === 'FRESH' && item.age.tier !== 'fresh') return false;
      if (ageFilter === 'MEDIUM' && item.age.tier !== 'medium') return false;
      if (ageFilter === 'AGED' && item.age.tier !== 'aged') return false;
      if (ageFilter === 'CRITICAL' && item.age.tier !== 'critical') return false;

      // Query filter
      if (!q) return true;
      return [
        item.track, item.tanggal, item.kode, item.buyerNo, item.jenisSample,
        item.style, item.sampleNo, item.size, item.color, item.satuan,
        item.place, item.boxLabel, item.rackName, item.picName, item.status,
      ]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q));
    });
  }, [allItems, query, ageFilter]);

  // Group items by style
  const styleGroups = useMemo(() => {
    const groups = {};
    filteredItems.forEach((item) => {
      const key = item.style.toUpperCase();
      if (!groups[key]) {
        groups[key] = {
          styleName: item.style,
          buyerNo: item.buyerNo !== 'NA' ? item.buyerNo : null,
          items: [],
          sampleTypes: {},
          totalQty: 0,
          oldestAge: item.age,
          boxes: new Map(),
        };
      }
      groups[key].items.push(item);
      groups[key].totalQty += item.jumlah;

      const typeKey = item.jenisSample;
      if (!groups[key].sampleTypes[typeKey]) {
        groups[key].sampleTypes[typeKey] = [];
      }
      groups[key].sampleTypes[typeKey].push(item);

      if (item.boxNumber) {
        groups[key].boxes.set(item.boxNumber, item.picName);
      }

      if (item.age.days > groups[key].oldestAge.days) {
        groups[key].oldestAge = item.age;
      }

      if (!groups[key].buyerNo && item.buyerNo && item.buyerNo !== 'NA') {
        groups[key].buyerNo = item.buyerNo;
      }
    });

    return Object.values(groups).sort((a, b) => b.items.length - a.items.length || b.oldestAge.days - a.oldestAge.days);
  }, [filteredItems]);

  const toggleStyleExpand = (styleKey) => {
    setExpandedStyles((prev) => ({
      ...prev,
      [styleKey]: !prev[styleKey],
    }));
  };

  const renderBadge = (age) => {
    if (age.tier === 'none') return <span className="text-slate-400 text-xs">-</span>;
    if (age.tier === 'critical') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
          <Clock className="w-3 h-3 text-rose-500" />
          <span>{age.label} (Lama)</span>
        </span>
      );
    }
    if (age.tier === 'aged') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
          <Clock className="w-3 h-3 text-amber-600" />
          <span>{age.label} (Review)</span>
        </span>
      );
    }
    if (age.tier === 'medium') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
          <Clock className="w-3 h-3 text-blue-500" />
          <span>{age.label}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
        <Clock className="w-3 h-3 text-emerald-500" />
        <span>{age.label}</span>
      </span>
    );
  };

  const dashClass = (value) => (value && value !== '-' && value !== 'NA' ? 'text-slate-700' : 'text-slate-400');

  const handleExport = async () => {
    const XLSX = await import('xlsx');
    const rows = filteredItems.map((item, i) => ({
      No: i + 1,
      Tanggal: item.tanggal,
      'Umur Simpan (Hari)': item.age.days,
      'Status Umur': item.age.label,
      Kode: item.kode,
      Track: item.track,
      Buyer: item.buyerNo,
      'Jenis Sample': item.jenisSample,
      Style: item.style,
      'Sample No': item.sampleNo,
      Size: item.size,
      Color: item.color,
      Jumlah: item.jumlah,
      Satuan: item.satuan,
      Box: item.boxLabel,
      Rak: item.rackName,
      PIC: item.picName,
      Place: item.place,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ringkasan Inventory');
    XLSX.writeFile(wb, `GAGACLO_RINGKASAN_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const SAMPLE_TYPES = ['DEVELOP', 'PPS', 'ORI', 'BULK SAMPLE'];

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <Archive className="h-5 w-5 text-blue-600" aria-hidden="true" />
            Ringkasan Total Item &amp; Umur Simpan
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Analisis umur simpan sample, pelacakan kelengkapan per style, dan rekap semua 72 box.
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 self-start sm:self-center">
          <button
            type="button"
            onClick={() => setViewMode('styles')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'styles'
                ? 'bg-white text-blue-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Shirt className="w-3.5 h-3.5" />
            <span>Pengelompokan Style</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-200/60">
              {styleGroups.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'table'
                ? 'bg-white text-blue-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>Daftar Tabel &amp; Umur</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200/80 text-slate-700 font-bold">
              {filteredItems.length}
            </span>
          </button>
        </div>
      </div>

      {/* Mention & Rekap Kurang per PIC */}
      <PpicMissingMentionBar />

      {/* Main Section */}
      <section className="inventory-panel p-4 sm:p-5 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
        
        {/* Controls: Search, Aging Filter Chips, Actions */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 flex-1">
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari style, buyer, kode, box, PIC..."
                className="w-full rounded-xl border border-slate-200/90 bg-slate-50/80 py-2 pl-9 pr-3 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100/60 transition shadow-2xs"
              />
            </div>

            {/* Quick Aging Filter Chips */}
            <div className="flex items-center gap-1.5 flex-wrap text-xs">
              <button
                type="button"
                onClick={() => setAgeFilter('ALL')}
                className={`px-2.5 py-1.5 rounded-lg font-bold transition cursor-pointer border ${
                  ageFilter === 'ALL'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                Semua Umur ({metrics.total})
              </button>
              <button
                type="button"
                onClick={() => setAgeFilter('FRESH')}
                className={`px-2.5 py-1.5 rounded-lg font-semibold transition cursor-pointer border ${
                  ageFilter === 'FRESH'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-emerald-50 hover:bg-emerald-100/70 text-emerald-800 border-emerald-200'
                }`}
                title="Tersimpan kurang dari 30 hari"
              >
                &lt; 30 Hari ({metrics.fresh})
              </button>
              <button
                type="button"
                onClick={() => setAgeFilter('MEDIUM')}
                className={`px-2.5 py-1.5 rounded-lg font-semibold transition cursor-pointer border ${
                  ageFilter === 'MEDIUM'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-blue-50 hover:bg-blue-100/70 text-blue-800 border-blue-200'
                }`}
                title="Tersimpan 1 hingga 3 bulan"
              >
                30–90 Hari ({metrics.medium})
              </button>
              <button
                type="button"
                onClick={() => setAgeFilter('AGED')}
                className={`px-2.5 py-1.5 rounded-lg font-bold transition cursor-pointer border ${
                  ageFilter === 'AGED'
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'bg-amber-50 hover:bg-amber-100/70 text-amber-900 border-amber-200'
                }`}
                title="Tersimpan 3 hingga 6 bulan (butuh review)"
              >
                &gt; 90 Hari ({metrics.aged})
              </button>
              {metrics.critical > 0 && (
                <button
                  type="button"
                  onClick={() => setAgeFilter('CRITICAL')}
                  className={`px-2.5 py-1.5 rounded-lg font-bold transition cursor-pointer border ${
                    ageFilter === 'CRITICAL'
                      ? 'bg-rose-600 text-white border-rose-600'
                      : 'bg-rose-50 hover:bg-rose-100/70 text-rose-800 border-rose-200'
                  }`}
                  title="Tersimpan lebih dari 6 bulan"
                >
                  &gt; 180 Hari ({metrics.critical})
                </button>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setItemModalConfig({ isOpen: true, item: null, targetBoxNumber: null })}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/90 px-3.5 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-100 shadow-2xs hover:-translate-y-0.5 active:scale-95 cursor-pointer whitespace-nowrap"
              title="Tambah item / sample baru"
            >
              <Plus className="h-4 w-4" />
              <span>Tambah Item</span>
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/90 px-3.5 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100 shadow-2xs hover:-translate-y-0.5 active:scale-95 cursor-pointer whitespace-nowrap"
              title="Export daftar ini ke Excel (.xlsx) dengan kolom umur simpan"
            >
              <Download className="h-4 w-4" />
              <span>Export Excel</span>
            </button>
          </div>
        </div>

        {/* MODE 1: Pengelompokan Berdasarkan Nama Style */}
        {viewMode === 'styles' && (
          <div className="space-y-3.5">
            {styleGroups.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-400">
                Tidak ada style yang cocok dengan pencarian dan filter umur.
              </div>
            ) : (
              styleGroups.map((group) => {
                const isExpanded = expandedStyles[group.styleName] !== false; // default expanded
                const boxList = Array.from(group.boxes.keys()).sort((a, b) => a - b);

                return (
                  <div
                    key={group.styleName}
                    className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs hover:border-slate-300 transition"
                  >
                    {/* Style Card Header */}
                    <div className="p-3.5 sm:p-4 bg-slate-50/70 border-b border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <div className="p-2 bg-blue-100 text-blue-700 rounded-lg shrink-0 mt-0.5">
                          <Shirt className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                              {group.styleName}
                            </h3>
                            {group.buyerNo && (
                              <span className="text-[11px] font-mono font-semibold px-2 py-0.2 bg-slate-200 text-slate-700 rounded">
                                Buyer: {group.buyerNo}
                              </span>
                            )}
                            <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.2 rounded-full">
                              {group.items.length} Sampel ({group.totalQty} PCS)
                            </span>
                          </div>

                          {/* Box Locations & Oldest Age */}
                          <div className="mt-1.5 flex items-center gap-2 flex-wrap text-xs text-slate-500">
                            <span className="flex items-center gap-1 font-medium text-slate-600">
                              <Layers className="w-3.5 h-3.5 text-slate-400" />
                              <span>Lokasi Box:</span>
                            </span>
                            {boxList.map((bNum) => (
                              <span
                                key={bNum}
                                className="inline-flex items-center gap-1 px-1.5 py-0.2 bg-white border border-slate-200 rounded font-bold text-slate-800 text-[11px]"
                              >
                                BOX {bNum}
                                <span className="text-[9px] font-normal text-slate-400">
                                  ({group.boxes.get(bNum)})
                                </span>
                              </span>
                            ))}

                            <span className="text-slate-300">•</span>
                            <span className="text-slate-600 text-[11px]">Umur tertua:</span>
                            {renderBadge(group.oldestAge)}
                          </div>
                        </div>
                      </div>

                      {/* Header Actions */}
                      <div className="flex items-center gap-2 self-start md:self-center shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            setItemModalConfig({
                              isOpen: true,
                              item: null,
                              targetBoxNumber: boxList[0] || null,
                              prefill: {
                                style: group.styleName,
                                buyerNo: group.buyerNo || '',
                              },
                            })
                          }
                          className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                          title={`Tambah sampel baru untuk style "${group.styleName}"`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Tambah Sampel</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleStyleExpand(group.styleName)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition cursor-pointer"
                          aria-label={isExpanded ? 'Tutup rincian' : 'Buka rincian'}
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Completeness Status Checklist */}
                    <div className="px-3.5 py-2.5 bg-slate-50/30 border-b border-slate-100 flex items-center gap-2 overflow-x-auto text-xs scrollbar-none">
                      <span className="text-[11px] font-semibold text-slate-500 shrink-0">Status Sampel:</span>
                      {SAMPLE_TYPES.map((type) => {
                        const samplesOfType = group.sampleTypes[type];
                        const exists = Boolean(samplesOfType && samplesOfType.length > 0);

                        return (
                          <div
                            key={type}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs shrink-0 ${
                              exists
                                ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900 font-bold'
                                : 'bg-slate-50 border-slate-200 text-slate-400 font-medium'
                            }`}
                          >
                            {exists ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            ) : (
                              <span className="w-3.5 h-3.5 flex items-center justify-center text-[10px] text-slate-400 font-mono">○</span>
                            )}
                            <span>{type}</span>
                            {exists && (
                              <span className="text-[10px] font-mono font-bold text-emerald-700 bg-white/80 px-1 rounded">
                                {samplesOfType.map((s) => `B#${s.boxNumber}`).join(', ')}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Detailed Items Table for this Style */}
                    {isExpanded && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-slate-100 text-[10px] uppercase tracking-wide text-slate-400 bg-white">
                              <th className="px-3 py-2 font-semibold">Jenis</th>
                              <th className="px-3 py-2 font-semibold">Kode Sample</th>
                              <th className="px-3 py-2 font-semibold">Size &amp; Warna</th>
                              <th className="px-3 py-2 font-semibold text-right">Qty</th>
                              <th className="px-3 py-2 font-semibold">Lokasi Box</th>
                              <th className="px-3 py-2 font-semibold">Tanggal Masuk</th>
                              <th className="px-3 py-2 font-semibold">Umur Simpan</th>
                              <th className="w-16 px-3 py-2 text-center font-semibold">Aksi</th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.items.map((item) => (
                              <tr key={item.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                                <td className="px-3 py-2 whitespace-nowrap">
                                  <span className="px-2 py-0.5 rounded font-bold text-[10.5px] bg-slate-100 text-slate-800 border border-slate-200">
                                    {item.jenisSample}
                                  </span>
                                </td>
                                <td className="px-3 py-2 font-mono font-semibold text-slate-900">
                                  {item.kode}
                                </td>
                                <td className="px-3 py-2 text-slate-700">
                                  Size: <strong className="text-slate-900">{item.size}</strong> • Warna: <span className={dashClass(item.color)}>{item.color}</span>
                                  {item.sampleNo && item.sampleNo !== 'NA' && (
                                    <span className="text-slate-400 ml-1.5">(Sample #{item.sampleNo})</span>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-right font-bold text-slate-900">
                                  {item.jumlah} <span className="text-[10px] font-normal text-slate-400">{item.satuan}</span>
                                </td>
                                <td className="px-3 py-2">
                                  <span className="font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                                    {item.boxLabel}
                                  </span>
                                  <span className="text-slate-500 text-[11px] ml-1.5">
                                    {item.rackName} • {item.picName}
                                  </span>
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-slate-600">
                                  {item.tanggal}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap">
                                  {renderBadge(item.age)}
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() => setItemModalConfig({ isOpen: true, item, targetBoxNumber: item.boxNumber })}
                                    className="p-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-600 transition cursor-pointer"
                                    title="Edit item ini"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* MODE 2: Daftar Semua Barang Tersimpan (Tabel Lengkap + Kolom Umur) */}
        {viewMode === 'table' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-400">
                  <th className="w-8 px-3 py-2 font-semibold">#</th>
                  <th className="whitespace-nowrap px-3 py-2 font-semibold">Tanggal Masuk</th>
                  <th className="whitespace-nowrap px-3 py-2 font-semibold">Umur Simpan</th>
                  <th className="px-3 py-2 font-semibold">Kode &amp; Track</th>
                  <th className="whitespace-nowrap px-3 py-2 font-semibold">Buyer</th>
                  <th className="whitespace-nowrap px-3 py-2 font-semibold">Jenis</th>
                  <th className="px-3 py-2 font-semibold">Deskripsi &amp; Style</th>
                  <th className="whitespace-nowrap px-3 py-2 text-right font-semibold">Qty</th>
                  <th className="px-3 py-2 font-semibold">Lokasi Box</th>
                  <th className="w-20 px-3 py-2 text-center font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-sm text-slate-400">
                      Tidak ada barang yang cocok dengan pencarian dan filter umur.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item, idx) => (
                    <tr key={item.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 align-top">
                      <td className="px-3 py-2.5 text-slate-400">{idx + 1}</td>
                      <td className={`px-3 py-2.5 whitespace-nowrap ${dashClass(item.tanggal)}`}>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{item.tanggal}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {renderBadge(item.age)}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className={`font-mono text-xs font-semibold ${dashClass(item.kode)}`}>{item.kode}</div>
                        {item.track && item.track !== 'NA' && (
                          <div className="mt-0.5 font-mono text-[10px] text-slate-400">Track: {item.track}</div>
                        )}
                      </td>
                      <td className={`px-3 py-2.5 whitespace-nowrap font-mono text-xs ${dashClass(item.buyerNo)}`}>
                        {item.buyerNo === 'NA' ? 'NA' : item.buyerNo}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className="rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                          {item.jenisSample}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 max-w-[20rem] break-words">
                        <div className="font-bold text-slate-900">{item.style}</div>
                        <div className="mt-0.5 space-x-2 text-[11px] text-slate-500">
                          {item.sampleNo && item.sampleNo !== 'NA' && (
                            <span>Sample: <strong className="text-slate-600">{item.sampleNo}</strong></span>
                          )}
                          {item.size && item.size !== 'NA' && (
                            <span>Size: <strong className="text-slate-600">{item.size}</strong></span>
                          )}
                          {item.color && item.color !== 'NA' && (
                            <span className={dashClass(item.color)}>{item.color}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-right font-bold text-slate-900">
                        {item.jumlah.toLocaleString('id-ID')}{' '}
                        <span className="text-[11px] font-normal text-slate-400">{item.satuan}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="text-xs font-bold text-blue-700">{item.boxLabel}</div>
                        <div className="mt-0.5 text-[11px] text-slate-500">
                          {item.rackName}
                          {item.picName && item.picName !== 'NA' && ` • ${item.picName}`}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-center gap-1.5">
                          {!currentUser ||
                          !item.picName ||
                          String(currentUser.name).trim().toLowerCase() === String(item.picName).trim().toLowerCase() ? (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  setItemModalConfig({
                                    isOpen: true,
                                    item,
                                    targetBoxNumber: Number(item.boxNumber),
                                  })
                                }
                                className="p-1.5 rounded-lg bg-blue-50 text-blue-600 transition hover:bg-blue-100 cursor-pointer"
                                title="Edit item ini"
                                aria-label={`Edit ${item.style || item.kode}`}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              {String(confirmDeleteId) === String(item.id) ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      try {
                                        await deleteItem(item.id);
                                      } catch (e) {
                                        console.error('Delete item error:', e);
                                      } finally {
                                        setConfirmDeleteId(null);
                                      }
                                    }}
                                    className="px-2 py-1 rounded-lg bg-red-600 text-white text-[11px] font-bold transition hover:bg-red-700 cursor-pointer"
                                    title="Konfirmasi hapus permanen"
                                  >
                                    Hapus?
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="px-1.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-[11px] font-bold transition hover:bg-slate-200 cursor-pointer"
                                    title="Batal"
                                  >
                                    Batal
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(item.id)}
                                  className="p-1.5 rounded-lg bg-red-50 text-red-600 transition hover:bg-red-100 cursor-pointer"
                                  title="Hapus item ini"
                                  aria-label={`Hapus ${item.style || item.kode}`}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </>
                          ) : (
                            <span
                              className="p-1.5 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center cursor-not-allowed"
                              title={`Terkunci: Data sampel ini milik PIC ${item.picName}. Satu user tidak dapat mengedit data user lain.`}
                            >
                              <Lock className="h-3.5 w-3.5 text-slate-400" />
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
