import React, { useMemo, useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { PpicMissingMentionBar } from './PpicMissingMentionBar';
import { getNextSampleCode, getNextMaterialCode } from '../utils/sequenceResolver';
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
  AlertTriangle,
  ShieldCheck,
  Zap,
  Copy,
  Check,
  BarChart3,
  Users,
  RotateCcw,
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

/**
 * Normalisasi format tanggal apapun ke standar YYYY-MM-DD
 */
export function normalizeDateKey(dateStr) {
  if (!dateStr || dateStr === 'NA' || dateStr === '-') return null;
  const clean = String(dateStr).trim();
  if (/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/.test(clean)) {
    const [, d, m, y] = clean.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  if (/^(\d{4})-(\d{1,2})-(\d{1,2})/.test(clean)) {
    const [, y, m, d] = clean.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  const parsed = new Date(clean);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return null;
}

/**
 * Format string YYYY-MM-DD ke teks bahasa Indonesia (contoh: 08 Nov 2026)
 */
export function formatDateIndo(isoDateStr) {
  if (!isoDateStr) return '-';
  const parts = String(isoDateStr).split('-');
  if (parts.length !== 3) return isoDateStr;
  const [y, m, d] = parts;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const monthIdx = Number(m) - 1;
  return `${Number(d)} ${months[monthIdx] || m} ${y}`;
}

const DEFAULT_PICS = ['Royan', 'Cynara', 'Ami', 'Ryan', 'Hanami'];

export function TotalItemsSummaryView() {
  const {
    boxes,
    items,
    deleteItem,
    updateItem,
    setItemModalConfig,
    currentUser,
    ppicMembers,
    showNotification,
  } = useInventory();

  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [viewMode, setViewMode] = useState('styles'); // 'styles' | 'table' | 'daily' | 'duplicates'
  const [ageFilter, setAgeFilter] = useState('ALL'); // 'ALL' | 'FRESH' | 'MEDIUM' | 'AGED' | 'CRITICAL'
  const [expandedStyles, setExpandedStyles] = useState({});
  const [fixingItemId, setFixingItemId] = useState(null);
  const [copiedRekap, setCopiedRekap] = useState(false);
  const [expandedDailyPics, setExpandedDailyPics] = useState({});

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
          styleKey: key,
          buyerNos: new Set(),
          boxes: new Set(),
          sampleTypes: new Set(),
          items: [],
          totalPcs: 0,
          oldestDays: 0,
          oldestLabel: '-',
          oldestTier: 'none',
        };
      }
      const g = groups[key];
      g.items.push(item);
      g.totalPcs += Number(item.jumlah) || 0;
      if (item.buyerNo && item.buyerNo !== 'NA') g.buyerNos.add(item.buyerNo);
      g.boxes.add(Number(item.boxNumber));
      if (item.jenisSample) g.sampleTypes.add(item.jenisSample.toUpperCase());

      if (item.age.days >= g.oldestDays) {
        g.oldestDays = item.age.days;
        g.oldestLabel = item.age.label;
        g.oldestTier = item.age.tier;
      }
    });

    return Object.values(groups).sort((a, b) => b.totalPcs - a.totalPcs || a.styleName.localeCompare(b.styleName));
  }, [filteredItems]);

  // 1. FITUR KODE YANG SAMA (DUPLIKAT) & PERBAIKAN
  const duplicateCodeGroups = useMemo(() => {
    const map = {};
    allItems.forEach((item) => {
      const cleanCode = String(item.kode || item.sku || '').trim().toUpperCase();
      if (!cleanCode || cleanCode === 'NA' || cleanCode === '-') return;
      if (!map[cleanCode]) map[cleanCode] = [];
      map[cleanCode].push(item);
    });

    return Object.entries(map)
      .filter(([_, list]) => list.length > 1)
      .map(([code, list]) => ({
        code,
        count: list.length,
        items: list,
        differentBoxes: new Set(list.map((i) => Number(i.boxNumber))).size > 1,
        differentStyles: new Set(list.map((i) => i.style.toUpperCase())).size > 1,
        totalPcs: list.reduce((acc, curr) => acc + (Number(curr.jumlah) || 0), 0),
      }))
      .sort((a, b) => b.count - a.count);
  }, [allItems]);

  // Auto-Fix Duplikat: Buat kode baru unik berurutan
  const handleAutoFixCode = async (item) => {
    try {
      setFixingItemId(item.id);
      const isMaterial = item.jenisSample === 'MATERIAL' || Number(item.boxNumber) >= 65;
      const newCode = isMaterial ? getNextMaterialCode(items) : getNextSampleCode(items);

      if (updateItem) {
        await updateItem(item.id, { kode: newCode, sku: newCode });
      }

      if (showNotification) {
        showNotification(
          `Kode item "${item.style}" (BOX ${item.boxNumber}) berhasil diperbarui menjadi "${newCode}". Masalah duplikasi selesai!`,
          'success',
          4500
        );
      }
    } catch (err) {
      console.error('Auto fix error:', err);
      if (showNotification) {
        showNotification(`Gagal memperbarui kode: ${err.message}`, 'error', 5000);
      }
    } finally {
      setFixingItemId(null);
    }
  };

  // 2. FITUR TIAP PPIC PERHARI SIMPAN BERAPA PCS
  const activePics = useMemo(() => {
    const set = new Set(DEFAULT_PICS);
    if (Array.isArray(ppicMembers)) {
      ppicMembers.forEach((p) => {
        if (p.name) set.add(p.name);
      });
    }
    return Array.from(set);
  }, [ppicMembers]);

  const dailyPicRecords = useMemo(() => {
    const map = {};
    allItems.forEach((item) => {
      const dateKey = normalizeDateKey(item.tanggal) || normalizeDateKey(item.dateIn);
      if (!dateKey) return;
      if (!map[dateKey]) {
        map[dateKey] = {
          date: dateKey,
          totalPcs: 0,
          totalItems: 0,
          byPic: {},
          items: [],
        };
      }
      const pcs = Number(item.jumlah) || 0;
      const pic = String(item.picName || 'Lainnya').trim();
      map[dateKey].totalPcs += pcs;
      map[dateKey].totalItems += 1;
      map[dateKey].items.push(item);

      if (!map[dateKey].byPic[pic]) {
        map[dateKey].byPic[pic] = { pcs: 0, items: 0, itemsList: [] };
      }
      map[dateKey].byPic[pic].pcs += pcs;
      map[dateKey].byPic[pic].items += 1;
      map[dateKey].byPic[pic].itemsList.push(item);
    });

    const dates = Object.keys(map).sort((a, b) => b.localeCompare(a));
    return { map, dates };
  }, [allItems]);

  // Tanggal default untuk view harian: hari ini atau tanggal terbaru yang ada data
  const todayIso = new Date().toISOString().slice(0, 10);
  const [selectedDailyDate, setSelectedDailyDate] = useState(() => {
    if (dailyPicRecords.dates.includes(todayIso)) return todayIso;
    return dailyPicRecords.dates[0] || todayIso;
  });

  const currentDailyData = dailyPicRecords.map[selectedDailyDate] || {
    date: selectedDailyDate,
    totalPcs: 0,
    totalItems: 0,
    byPic: {},
    items: [],
  };

  // Copy Rekap Harian Chat
  const handleCopyDailyRekap = () => {
    const dateFormatted = formatDateIndo(selectedDailyDate);
    const picLines = activePics
      .map((pic) => {
        const stats = currentDailyData.byPic[pic] || { pcs: 0, items: 0 };
        return `- ${pic.padEnd(8)}: ${stats.pcs} PCS (${stats.items} sampel)`;
      })
      .join('\n');

    const text = `📊 REKAP PENYIMPANAN HARIAN R&D GAGACLO\n📅 Tanggal: ${dateFormatted}\n━━━━━━━━━━━━━━━━━━━━\n${picLines}\n━━━━━━━━━━━━━━━━━━━━\n📦 TOTAL HARIAN: ${currentDailyData.totalPcs} PCS (${currentDailyData.totalItems} sampel)`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedRekap(true);
      setTimeout(() => setCopiedRekap(false), 2500);
      if (showNotification) {
        showNotification('Teks rekap harian berhasil disalin ke clipboard!', 'success', 3000);
      }
    }
  };

  const toggleStyleExpand = (styleKey) => {
    setExpandedStyles((prev) => ({
      ...prev,
      [styleKey]: !prev[styleKey],
    }));
  };

  const expandAllStyles = () => {
    const all = {};
    styleGroups.forEach((g) => {
      all[g.styleKey] = true;
    });
    setExpandedStyles(all);
  };

  const collapseAllStyles = () => {
    setExpandedStyles({});
  };

  // Export to Excel with Storage Age & PIC info
  const handleExportExcel = async () => {
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

  const SAMPLE_TYPES = ['DEVELOP', 'PPS', 'ORI', 'BULK SAMPLE', 'ARSIP'];

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <Archive className="h-5 w-5 text-blue-600" aria-hidden="true" />
            Ringkasan Total Item &amp; Aktivitas R&D
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Pelacakan umur simpan, rekap harian simpan PCS per PIC, matriks style, dan audit kode duplikat.
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 self-start sm:self-center flex-wrap">
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

          <button
            type="button"
            onClick={() => setViewMode('daily')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'daily'
                ? 'bg-white text-emerald-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Harian per PPIC</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-bold">
              {currentDailyData.totalPcs} PCS
            </span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('duplicates')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'duplicates'
                ? 'bg-white text-amber-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Kode Sama &amp; Perbaikan</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                duplicateCodeGroups.length > 0
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {duplicateCodeGroups.length > 0 ? `${duplicateCodeGroups.length} Duplikat` : '✓ 0'}
            </span>
          </button>
        </div>
      </div>

      {/* Mention & Rekap Kurang per PIC */}
      <PpicMissingMentionBar />

      {/* ========================================================================= */}
      {/* SUB-VIEW 1: HARIAN PER PPIC (SIMPAN BERAPA PCS PER HARI)                  */}
      {/* ========================================================================= */}
      {viewMode === 'daily' && (
        <div className="space-y-4">
          {/* Header Controls: Date Picker & Quick Actions */}
          <div className="inventory-panel p-4 sm:p-5 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-emerald-600" />
                <h2 className="text-sm font-bold text-slate-800">
                  Aktivitas Penyimpanan Harian per Anggota PPIC
                </h2>
              </div>
              <p className="text-xs text-slate-500">
                Memantau berapa total PCS dan jumlah sampel yang disimpan oleh masing-masing PIC setiap hari.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Date Input */}
              <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold">
                <span className="text-slate-500 text-[11px]">Tanggal:</span>
                <input
                  type="date"
                  value={selectedDailyDate}
                  onChange={(e) => setSelectedDailyDate(e.target.value)}
                  className="bg-transparent text-slate-800 font-bold focus:outline-none cursor-pointer text-xs"
                />
              </div>

              {/* Quick Pick: Hari Ini */}
              <button
                type="button"
                onClick={() => setSelectedDailyDate(todayIso)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition border cursor-pointer ${
                  selectedDailyDate === todayIso
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                Hari Ini
              </button>

              {/* Salin Rekap Harian */}
              <button
                type="button"
                onClick={handleCopyDailyRekap}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                {copiedRekap ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Salin Rekap Harian Chat</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Ringkasan Total Hari Ini */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 bg-gradient-to-br from-emerald-50/80 to-emerald-100/40 rounded-2xl border border-emerald-200/80">
              <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                Total PCS Disimpan ({formatDateIndo(selectedDailyDate)})
              </div>
              <div className="mt-1 text-2xl font-black text-emerald-950 tabular-nums">
                {currentDailyData.totalPcs.toLocaleString('id-ID')} <span className="text-sm font-semibold text-emerald-700">PCS</span>
              </div>
              <div className="mt-0.5 text-xs text-emerald-700">
                Dari {currentDailyData.totalItems} transaksi sampel di 5 PIC
              </div>
            </div>

            <div className="p-4 bg-gradient-to-br from-blue-50/80 to-blue-100/40 rounded-2xl border border-blue-200/80">
              <div className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">
                PIC Paling Aktif Hari Ini
              </div>
              <div className="mt-1 text-2xl font-black text-blue-950">
                {(() => {
                  let topPic = '-';
                  let maxPcs = 0;
                  activePics.forEach((p) => {
                    const pcs = currentDailyData.byPic[p]?.pcs || 0;
                    if (pcs > maxPcs) {
                      maxPcs = pcs;
                      topPic = p;
                    }
                  });
                  return maxPcs > 0 ? `${topPic} (${maxPcs} PCS)` : 'Belum Ada Input';
                })()}
              </div>
              <div className="mt-0.5 text-xs text-blue-700">Kontribusi terbesar pada tanggal ini</div>
            </div>

            <div className="p-4 bg-gradient-to-br from-slate-50 to-slate-100/60 rounded-2xl border border-slate-200/80">
              <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                Riwayat Hari Tercatat
              </div>
              <div className="mt-1 text-2xl font-black text-slate-800 tabular-nums">
                {dailyPicRecords.dates.length} <span className="text-sm font-semibold text-slate-500">Hari</span>
              </div>
              <div className="mt-0.5 text-xs text-slate-500">Total data riwayat tersimpan</div>
            </div>
          </div>

          {/* Grid 5 Kartu PIC: Royan, Cynara, Ami, Ryan, Hanami */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {activePics.map((picName, idx) => {
              const picStats = currentDailyData.byPic[picName] || { pcs: 0, items: 0, itemsList: [] };
              const colorSchemes = [
                { border: 'border-blue-200', bg: 'bg-blue-50/40', text: 'text-blue-900', badge: 'bg-blue-100 text-blue-800' },
                { border: 'border-purple-200', bg: 'bg-purple-50/40', text: 'text-purple-900', badge: 'bg-purple-100 text-purple-800' },
                { border: 'border-emerald-200', bg: 'bg-emerald-50/40', text: 'text-emerald-900', badge: 'bg-emerald-100 text-emerald-800' },
                { border: 'border-amber-200', bg: 'bg-amber-50/40', text: 'text-amber-900', badge: 'bg-amber-100 text-amber-800' },
                { border: 'border-rose-200', bg: 'bg-rose-50/40', text: 'text-rose-900', badge: 'bg-rose-100 text-rose-800' },
              ];
              const scheme = colorSchemes[idx % colorSchemes.length];
              const isExpanded = Boolean(expandedDailyPics[picName]);

              return (
                <div
                  key={picName}
                  className={`p-4 rounded-2xl border ${scheme.border} ${scheme.bg} backdrop-blur-md flex flex-col justify-between transition shadow-2xs hover:shadow-xs`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-sm text-slate-900">{picName}</span>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${scheme.badge}`}>
                        PIC #{idx + 1}
                      </span>
                    </div>

                    <div className="mt-1">
                      <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                        Simpan Hari Ini:
                      </div>
                      <div className="mt-0.5 text-2xl font-black text-slate-900 tabular-nums">
                        {picStats.pcs.toLocaleString('id-ID')}{' '}
                        <span className="text-xs font-semibold text-slate-500">PCS</span>
                      </div>
                      <div className="text-xs text-slate-600 mt-0.5">
                        {picStats.items > 0 ? `${picStats.items} sampel masuk` : 'Belum ada input'}
                      </div>
                    </div>
                  </div>

                  {picStats.itemsList.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-200/60">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedDailyPics((prev) => ({
                            ...prev,
                            [picName]: !prev[picName],
                          }))
                        }
                        className="w-full text-[11px] font-bold text-blue-700 hover:text-blue-900 flex items-center justify-between cursor-pointer"
                      >
                        <span>{isExpanded ? 'Tutup Rincian' : `Lihat ${picStats.itemsList.length} Sampel`}</span>
                        {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>

                      {isExpanded && (
                        <div className="mt-2 space-y-1.5 max-h-36 overflow-y-auto pr-1">
                          {picStats.itemsList.map((it, itemIdx) => (
                            <div
                              key={itemIdx}
                              className="text-[11px] p-1.5 rounded-lg bg-white/90 border border-slate-200/60 leading-tight"
                            >
                              <div className="font-bold text-slate-800 truncate">{it.style}</div>
                              <div className="text-[10px] text-slate-500 flex justify-between mt-0.5">
                                <span>{it.boxLabel}</span>
                                <span className="font-semibold text-emerald-700">{it.jumlah} PCS</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Tabel Riwayat Harian per PIC */}
          <div className="inventory-panel p-4 sm:p-5 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <BarChart3 className="h-4 w-4 text-blue-600" />
                  <span>Tabel Riwayat Penyimpanan Harian (PCS per PIC)</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Klik tanggal untuk melihat rincian detail kartu di atas.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-bold text-slate-700 uppercase">
                    <th className="px-3 py-2.5">Tanggal</th>
                    {activePics.map((pic) => (
                      <th key={pic} className="px-3 py-2.5 text-right">
                        {pic} (PCS)
                      </th>
                    ))}
                    <th className="px-3 py-2.5 text-right font-black text-emerald-800">Total Harian</th>
                    <th className="px-3 py-2.5 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dailyPicRecords.dates.length === 0 ? (
                    <tr>
                      <td colSpan={activePics.length + 3} className="px-4 py-8 text-center text-slate-400">
                        Belum ada riwayat tanggal penyimpanan barang.
                      </td>
                    </tr>
                  ) : (
                    dailyPicRecords.dates.map((dateKey) => {
                      const record = dailyPicRecords.map[dateKey];
                      const isSelected = selectedDailyDate === dateKey;
                      return (
                        <tr
                          key={dateKey}
                          onClick={() => setSelectedDailyDate(dateKey)}
                          className={`transition cursor-pointer ${
                            isSelected ? 'bg-blue-50/70 font-semibold' : 'hover:bg-slate-50/80'
                          }`}
                        >
                          <td className="px-3 py-2 font-bold text-slate-800 whitespace-nowrap">
                            {formatDateIndo(dateKey)}
                            {dateKey === todayIso && (
                              <span className="ml-1.5 px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-black">
                                Hari Ini
                              </span>
                            )}
                          </td>
                          {activePics.map((pic) => {
                            const pcs = record.byPic[pic]?.pcs || 0;
                            return (
                              <td
                                key={pic}
                                className={`px-3 py-2 text-right tabular-nums ${
                                  pcs > 0 ? 'font-bold text-slate-800' : 'text-slate-300'
                                }`}
                              >
                                {pcs > 0 ? `${pcs.toLocaleString('id-ID')} PCS` : '-'}
                              </td>
                            );
                          })}
                          <td className="px-3 py-2 text-right font-black text-emerald-700 tabular-nums">
                            {record.totalPcs.toLocaleString('id-ID')} PCS
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span className="text-[11px] text-blue-600 hover:underline">
                              {isSelected ? '✓ Terpilih' : 'Pilih'}
                            </span>
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
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 2: KODE SAMA / DUPLIKAT & PERBAIKAN OTOMATIS                     */}
      {/* ========================================================================= */}
      {viewMode === 'duplicates' && (
        <div className="space-y-4">
          {duplicateCodeGroups.length === 0 ? (
            <div className="inventory-panel p-8 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-2xs text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                <ShieldCheck className="w-8 h-8 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Semua Kode Sampel Unik (100% Bebas Duplikat)
                </h2>
                <p className="mt-1 text-xs text-slate-500 max-w-lg mx-auto">
                  Seluruh <strong>{allItems.length} sampel</strong> yang tersebar di 72 box memiliki nomor kode yang
                  valid dan unik. Tidak ada nomor kode yang bentrok antar box maupun antar PIC.
                </p>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition cursor-pointer"
                >
                  Kembali ke Daftar Tabel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Alert Banner */}
              <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-300 text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-amber-200/60 text-amber-900 shrink-0 mt-0.5">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold">
                      Ditemukan {duplicateCodeGroups.length} Nomor Kode yang Dipakai Ganda
                    </h2>
                    <p className="text-xs text-amber-800 mt-0.5">
                      Nomor kode berikut terdaftar pada lebih dari satu item. Gunakan tombol{' '}
                      <strong>"⚡ Buat Kode Unik Baru"</strong> untuk menormalkan kode secara instan atau{' '}
                      <strong>"✏️ Edit"</strong> untuk mengubah manual.
                    </p>
                  </div>
                </div>

                <div className="text-xs font-bold px-3 py-1.5 rounded-xl bg-amber-100 border border-amber-300/80 self-start sm:self-center shrink-0">
                  Total {duplicateCodeGroups.reduce((a, b) => a + b.count, 0)} Item Perlu Dicek
                </div>
              </div>

              {/* Duplicate Cards per Code */}
              <div className="space-y-3">
                {duplicateCodeGroups.map((group) => (
                  <div
                    key={group.code}
                    className="p-4 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-2xs space-y-3"
                  >
                    {/* Card Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-sm font-black px-2.5 py-1 rounded-lg bg-amber-100 text-amber-950 border border-amber-300">
                          KODE #{group.code}
                        </span>
                        <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                          Digunakan {group.count} Kali
                        </span>
                        {group.differentBoxes && (
                          <span className="text-[11px] text-slate-500 font-medium">
                            (Tersebar di {group.items.map((i) => `BOX ${i.boxNumber}`).join(', ')})
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-500 font-medium">
                        Total Kuantitas: <strong>{group.totalPcs} PCS</strong>
                      </div>
                    </div>

                    {/* Table of items sharing this code */}
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-bold text-slate-700 uppercase">
                            <th className="px-3 py-2">No</th>
                            <th className="px-3 py-2">Lokasi Box</th>
                            <th className="px-3 py-2">Style &amp; Buyer</th>
                            <th className="px-3 py-2">Jenis Sample</th>
                            <th className="px-3 py-2 text-right">Qty</th>
                            <th className="px-3 py-2">PIC Pemilik</th>
                            <th className="px-3 py-2 text-center">Aksi Perbaikan</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {group.items.map((item, idx) => {
                            const isFixing = fixingItemId === item.id;
                            const isDeletable =
                              !currentUser ||
                              !item.picName ||
                              String(currentUser.name).trim().toLowerCase() === String(item.picName).trim().toLowerCase();

                            return (
                              <tr key={item.id} className="hover:bg-slate-50/70 transition">
                                <td className="px-3 py-2.5 font-bold text-slate-400">{idx + 1}</td>
                                <td className="px-3 py-2.5">
                                  <div className="font-bold text-blue-700">{item.boxLabel}</div>
                                  <div className="text-[10px] text-slate-400">{item.rackName}</div>
                                </td>
                                <td className="px-3 py-2.5">
                                  <div className="font-bold text-slate-900">{item.style}</div>
                                  <div className="text-[10px] text-slate-500">Buyer: {item.buyerNo}</div>
                                </td>
                                <td className="px-3 py-2.5">
                                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[10px]">
                                    {item.jenisSample}
                                  </span>
                                </td>
                                <td className="px-3 py-2.5 text-right font-black text-slate-800 tabular-nums">
                                  {item.jumlah} <span className="text-[10px] text-slate-400 font-normal">PCS</span>
                                </td>
                                <td className="px-3 py-2.5 font-semibold text-slate-700">
                                  {item.picName}
                                </td>
                                <td className="px-3 py-2.5">
                                  <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                    {/* 1-Click Auto Fix: Beri kode baru unik */}
                                    <button
                                      type="button"
                                      disabled={isFixing}
                                      onClick={() => handleAutoFixCode(item)}
                                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition flex items-center gap-1 cursor-pointer disabled:opacity-50 shadow-2xs"
                                      title="Generate kode unik baru untuk item ini agar tidak bentrok lagi"
                                    >
                                      <Zap className="h-3 w-3" />
                                      <span>{isFixing ? 'Memperbaiki...' : '⚡ Buat Kode Unik Baru'}</span>
                                    </button>

                                    {/* Edit Item Modal */}
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setItemModalConfig({
                                          isOpen: true,
                                          item,
                                          targetBoxNumber: Number(item.boxNumber),
                                        })
                                      }
                                      className="p-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition cursor-pointer"
                                      title="Edit detail item ini"
                                      aria-label={`Edit ${item.style}`}
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </button>

                                    {/* Hapus jika memang duplikat salah input */}
                                    {isDeletable ? (
                                      confirmDeleteId === item.id ? (
                                        <div className="flex items-center gap-1">
                                          <button
                                            type="button"
                                            onClick={async () => {
                                              try {
                                                await deleteItem(item.id);
                                              } catch (e) {
                                                console.error(e);
                                              } finally {
                                                setConfirmDeleteId(null);
                                              }
                                            }}
                                            className="px-2 py-0.5 rounded bg-red-600 text-white text-[10px] font-bold cursor-pointer"
                                          >
                                            Hapus?
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setConfirmDeleteId(null)}
                                            className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] cursor-pointer"
                                          >
                                            Batal
                                          </button>
                                        </div>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => setConfirmDeleteId(item.id)}
                                          className="p-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition cursor-pointer"
                                          title="Hapus item ini jika duplikat salah input"
                                          aria-label={`Hapus ${item.style}`}
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      )
                                    ) : (
                                      <span
                                        className="p-1 rounded-lg bg-slate-100 text-slate-400 cursor-not-allowed"
                                        title={`Terkunci: Data milik PIC ${item.picName}`}
                                      >
                                        <Lock className="h-3.5 w-3.5" />
                                      </span>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 3 & 4: PENGELOMPOKAN STYLE & DAFTAR TABEL & UMUR                */}
      {/* ========================================================================= */}
      {(viewMode === 'styles' || viewMode === 'table') && (
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
                  className={`px-2.5 py-1.5 rounded-lg font-bold transition cursor-pointer border ${
                    ageFilter === 'FRESH'
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                  }`}
                >
                  &lt; 30 Hari ({metrics.fresh})
                </button>
                <button
                  type="button"
                  onClick={() => setAgeFilter('MEDIUM')}
                  className={`px-2.5 py-1.5 rounded-lg font-bold transition cursor-pointer border ${
                    ageFilter === 'MEDIUM'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-blue-50 hover:bg-blue-100 text-blue-800 border-blue-200'
                  }`}
                >
                  30–90 Hari ({metrics.medium})
                </button>
                <button
                  type="button"
                  onClick={() => setAgeFilter('AGED')}
                  className={`px-2.5 py-1.5 rounded-lg font-bold transition cursor-pointer border ${
                    ageFilter === 'AGED'
                      ? 'bg-amber-600 text-white border-amber-600'
                      : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200'
                  }`}
                >
                  90–180 Hari ({metrics.aged})
                </button>
                <button
                  type="button"
                  onClick={() => setAgeFilter('CRITICAL')}
                  className={`px-2.5 py-1.5 rounded-lg font-bold transition cursor-pointer border ${
                    ageFilter === 'CRITICAL'
                      ? 'bg-rose-600 text-white border-rose-600'
                      : 'bg-rose-50 hover:bg-rose-100 text-rose-900 border-rose-200'
                  }`}
                >
                  &gt; 180 Hari ({metrics.critical})
                </button>
              </div>
            </div>

            {/* Actions: Expand/Collapse & Export Excel */}
            <div className="flex items-center gap-2 self-start lg:self-center">
              {viewMode === 'styles' && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={expandAllStyles}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-bold transition cursor-pointer"
                  >
                    Buka Semua
                  </button>
                  <button
                    type="button"
                    onClick={collapseAllStyles}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-bold transition cursor-pointer"
                  >
                    Tutup Semua
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={handleExportExcel}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Unduh Excel</span>
              </button>
            </div>
          </div>

          {/* Mode 1: Pengelompokan Style Matrix */}
          {viewMode === 'styles' && (
            <div className="space-y-3 pt-1">
              {styleGroups.length === 0 ? (
                <div className="p-8 text-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                  Tidak ada style yang sesuai dengan filter umur atau pencarian.
                </div>
              ) : (
                styleGroups.map((group) => {
                  const isExpanded = Boolean(expandedStyles[group.styleKey]);
                  const buyerDisplay = Array.from(group.buyerNos).join(', ') || 'NA';
                  const boxNumbers = Array.from(group.boxes).sort((a, b) => a - b);

                  return (
                    <div
                      key={group.styleKey}
                      className="border border-slate-200/90 rounded-2xl bg-white shadow-2xs hover:border-slate-300 transition overflow-hidden"
                    >
                      {/* Style Summary Header Bar */}
                      <div className="p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-gradient-to-r from-slate-50/70 via-white to-white">
                        <div className="flex items-start sm:items-center gap-3">
                          <button
                            type="button"
                            onClick={() => toggleStyleExpand(group.styleKey)}
                            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer shrink-0 mt-0.5 sm:mt-0"
                            aria-label={isExpanded ? 'Tutup rincian' : 'Buka rincian'}
                          >
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </button>

                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h2 className="font-bold text-sm sm:text-base text-slate-900 tracking-tight">
                                {group.styleName}
                              </h2>
                              <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                Buyer: {buyerDisplay}
                              </span>
                              <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/60">
                                {group.items.length} Sampel • {group.totalPcs} PCS
                              </span>
                            </div>

                            <div className="mt-1 flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                              <span className="flex items-center gap-1 font-medium">
                                <Archive className="h-3.5 w-3.5 text-slate-400" />
                                <span>Lokasi:</span>
                                <strong className="text-slate-700">
                                  {boxNumbers.map((b) => `BOX ${b}`).join(', ')}
                                </strong>
                              </span>

                              <span className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5 text-slate-400" />
                                <span>Sampel Tertua:</span>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    group.oldestTier === 'critical'
                                      ? 'bg-rose-100 text-rose-800'
                                      : group.oldestTier === 'aged'
                                      ? 'bg-amber-100 text-amber-900'
                                      : group.oldestTier === 'medium'
                                      ? 'bg-blue-100 text-blue-800'
                                      : 'bg-emerald-100 text-emerald-800'
                                  }`}
                                >
                                  {group.oldestLabel}
                                </span>
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Checklist Kelengkapan & Aksi Cepat Tambah Sampel */}
                        <div className="flex items-center gap-2 self-start md:self-center flex-wrap">
                          {/* Checklist Tahapan Sample */}
                          <div className="flex items-center gap-1 p-1 bg-slate-100/80 rounded-xl border border-slate-200/80 text-[10px] font-bold">
                            {SAMPLE_TYPES.map((type) => {
                              const exists = group.sampleTypes.has(type);
                              return (
                                <span
                                  key={type}
                                  title={`${type}: ${exists ? 'Sudah ada sampel' : 'Belum ada sampel'}`}
                                  className={`px-1.5 py-0.5 rounded-md flex items-center gap-1 transition ${
                                    exists
                                      ? 'bg-white text-emerald-700 shadow-2xs font-bold'
                                      : 'text-slate-400 opacity-60'
                                  }`}
                                >
                                  {exists && <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" />}
                                  <span>{type === 'BULK SAMPLE' ? 'BULK' : type}</span>
                                </span>
                              );
                            })}
                          </div>

                          {/* Tombol Tambah Sampel Cepat untuk Style Ini */}
                          <button
                            type="button"
                            onClick={() =>
                              setItemModalConfig({
                                isOpen: true,
                                item: null,
                                targetBoxNumber: boxNumbers[0] || 1,
                                prefill: {
                                  style: group.styleName,
                                  buyerNo: Array.from(group.buyerNos)[0] || '',
                                },
                              })
                            }
                            className="px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs transition flex items-center gap-1 cursor-pointer border border-blue-200"
                            title={`Tambah sampel baru untuk style ${group.styleName}`}
                          >
                            <Plus className="h-3 w-3" />
                            <span>Tambah Sampel</span>
                          </button>
                        </div>
                      </div>

                      {/* Collapsible Items Table for this Style */}
                      {isExpanded && (
                        <div className="border-t border-slate-100 p-3 sm:p-4 bg-slate-50/40">
                          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                            <table className="w-full text-left text-xs">
                              <thead>
                                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 uppercase">
                                  <th className="px-3 py-2">Kode</th>
                                  <th className="px-3 py-2">Tanggal</th>
                                  <th className="px-3 py-2">Umur Simpan</th>
                                  <th className="px-3 py-2">Jenis</th>
                                  <th className="px-3 py-2">Sample No</th>
                                  <th className="px-3 py-2">Size &amp; Warna</th>
                                  <th className="px-3 py-2 text-right">Jumlah</th>
                                  <th className="px-3 py-2">Box &amp; PIC</th>
                                  <th className="px-3 py-2 text-center">Aksi</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {group.items.map((item) => (
                                  <tr key={item.id} className="hover:bg-slate-50/70 transition">
                                    <td className="px-3 py-2 font-mono font-bold text-blue-700">{item.kode}</td>
                                    <td className="px-3 py-2 text-slate-600">{item.tanggal}</td>
                                    <td className="px-3 py-2">
                                      <span
                                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-block ${
                                          item.age.tier === 'critical'
                                            ? 'bg-rose-100 text-rose-800'
                                            : item.age.tier === 'aged'
                                            ? 'bg-amber-100 text-amber-900'
                                            : item.age.tier === 'medium'
                                            ? 'bg-blue-100 text-blue-800'
                                            : 'bg-emerald-100 text-emerald-800'
                                        }`}
                                      >
                                        {item.age.label}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 font-semibold text-slate-800">{item.jenisSample}</td>
                                    <td className="px-3 py-2 font-mono text-slate-600">{item.sampleNo}</td>
                                    <td className="px-3 py-2 text-slate-600">
                                      {item.size} {item.color && item.color !== 'NA' ? `• ${item.color}` : ''}
                                    </td>
                                    <td className="px-3 py-2 text-right font-black text-slate-900 tabular-nums">
                                      {item.jumlah} <span className="text-[10px] text-slate-400 font-normal">{item.satuan}</span>
                                    </td>
                                    <td className="px-3 py-2">
                                      <div className="font-bold text-blue-700">{item.boxLabel}</div>
                                      <div className="text-[10px] text-slate-400">{item.picName}</div>
                                    </td>
                                    <td className="px-3 py-2">
                                      <div className="flex items-center justify-center gap-1">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setItemModalConfig({
                                              isOpen: true,
                                              item,
                                              targetBoxNumber: Number(item.boxNumber),
                                            })
                                          }
                                          className="p-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition cursor-pointer"
                                          title="Edit item ini"
                                          aria-label={`Edit ${item.kode}`}
                                        >
                                          <Pencil className="h-3 w-3" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Mode 2: Tabel Lengkap Standar & Umur */}
          {viewMode === 'table' && (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 uppercase">
                    <th className="px-3 py-2.5">No</th>
                    <th className="px-3 py-2.5">Tanggal</th>
                    <th className="px-3 py-2.5">Umur Simpan</th>
                    <th className="px-3 py-2.5">Kode</th>
                    <th className="px-3 py-2.5">Track</th>
                    <th className="px-3 py-2.5">Buyer</th>
                    <th className="px-3 py-2.5">Jenis</th>
                    <th className="px-3 py-2.5">Style</th>
                    <th className="px-3 py-2.5">Sample No</th>
                    <th className="px-3 py-2.5">Size</th>
                    <th className="px-3 py-2.5">Color</th>
                    <th className="px-3 py-2.5 text-right">Jumlah</th>
                    <th className="px-3 py-2.5">Box &amp; PIC</th>
                    <th className="px-3 py-2.5 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={14} className="px-4 py-8 text-center text-slate-400">
                        Tidak ada item yang cocok dengan pencarian atau filter umur.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item, i) => (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition">
                        <td className="px-3 py-2.5 font-bold text-slate-400">{i + 1}</td>
                        <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">
                          <div className="flex items-center gap-1 font-mono text-[11px]">
                            <Calendar className="h-3 w-3 text-slate-400" />
                            <span>{item.tanggal}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold inline-block shadow-2xs ${
                              item.age.tier === 'critical'
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : item.age.tier === 'aged'
                                ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                : item.age.tier === 'medium'
                                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            }`}
                          >
                            {item.age.label}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 font-mono font-bold text-blue-700">{item.kode}</td>
                        <td className="px-3 py-2.5 font-mono text-slate-600">{item.track}</td>
                        <td className="px-3 py-2.5 font-mono text-slate-700">{item.buyerNo}</td>
                        <td className="px-3 py-2.5 font-semibold text-slate-800">{item.jenisSample}</td>
                        <td className="px-3 py-2.5 font-bold text-slate-900 max-w-xs truncate">{item.style}</td>
                        <td className="px-3 py-2.5 font-mono text-slate-600">{item.sampleNo}</td>
                        <td className="px-3 py-2.5 text-slate-600">{item.size}</td>
                        <td className="px-3 py-2.5 text-slate-600">{item.color}</td>
                        <td className="px-3 py-2.5 text-right font-black text-slate-900 tabular-nums whitespace-nowrap">
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
      )}
    </div>
  );
}
