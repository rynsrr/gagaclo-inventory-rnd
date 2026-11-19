import React, { useMemo, useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { getNextSampleCode, getNextMaterialCode } from '../utils/sequenceResolver';
import {
  getLocalTodayIso,
  getItemRecordDate,
  normalizeDateKey,
  formatDateIndo,
  formatToDDMMYYYY,
} from '../utils/dateUtils';
export { getLocalTodayIso, getItemRecordDate, normalizeDateKey, formatDateIndo };
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
  Calendar,
  Shirt,
  CheckCircle2,
  Layers,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  ShieldCheck,
  Zap,
  Copy,
  Check,
  RotateCcw,
  RefreshCw,
  Building2,
  ShoppingCart,
  LayoutList,
  LayoutGrid,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { isItemDispatched, decodeDispatchData } from '../utils/dispatchUtils';
import { isSuperuser, isHelper } from '../utils/authUtils';

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
  const {
    boxes,
    items,
    deleteItem,
    updateItem,
    setItemModalConfig,
    currentUser,
    ppicMembers,
    showNotification,
    syncFromSupabase,
    dispatchCart,
    addToDispatchCart,
    isItemInDispatchCart,
  } = useInventory();

  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const handleManualSync = async () => {
    setIsManualSyncing(true);
    try {
      const res = await syncFromSupabase(undefined, false);
      if (res?.success) {
        if (showNotification) showNotification('Data inventory & aktivitas harian berhasil disinkronkan langsung dari server cloud!', 'success', 3000);
      }
    } finally {
      setIsManualSyncing(false);
    }
  };

  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [viewMode, setViewMode] = useState('styles'); // 'styles' | 'table' | 'daily' | 'duplicates'
  const [ageFilter, setAgeFilter] = useState('ALL'); // 'ALL' | 'FRESH' | 'MEDIUM' | 'AGED' | 'CRITICAL'
  const [expandedStyles, setExpandedStyles] = useState({});
  const [fixingItemId, setFixingItemId] = useState(null);

  const [query, setQuery] = useState('');
  const [subLayout, setSubLayout] = useState('table'); // 'table' | 'cards'
  const [categoryFilter, setCategoryFilter] = useState('ALL'); // 'ALL' | 'SAMPLE' | 'MATERIAL' | 'BORROWED' | 'DISPATCHED'
  const [sortField, setSortField] = useState('date'); // 'date' | 'age' | 'kode' | 'track' | 'buyer' | 'jenis' | 'style' | 'sampleNo' | 'size' | 'color' | 'jumlah' | 'box'
  const [sortDirection, setSortDirection] = useState('desc'); // 'asc' | 'desc'
  const [pageSize, setPageSize] = useState(50); // 50 | 100 | 250 | 0 (0 = Semua)
  const [currentPage, setCurrentPage] = useState(1);
  const [copiedCodeId, setCopiedCodeId] = useState(null);

  const handleHeaderSort = (field) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      const defaultDescFields = ['date', 'age', 'jumlah'];
      setSortDirection(defaultDescFields.includes(field) ? 'desc' : 'asc');
    }
    setCurrentPage(1);
  };

  const handleCopyCode = (e, code, id) => {
    e?.stopPropagation();
    if (!code || code === '-') return;
    try {
      navigator.clipboard.writeText(code);
      setCopiedCodeId(id);
      showNotification?.('📋 Kode berhasil disalin!', 'info', 2000);
      setTimeout(() => setCopiedCodeId(null), 2000);
    } catch {
      showNotification?.('📋 Kode disalin', 'info', 2000);
    }
  };
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
        const formattedDate = formatToDDMMYYYY(rawDate) || rawDate;
        const age = calculateStorageAge(formattedDate);
        const recordDate = getItemRecordDate(item);
        return {
          ...item,
          recordDate,
          track: item.track || 'NA',
          tanggal: formattedDate,
          age,
          kode: item.kode || item.sku || 'NA',
          buyerNo: item.buyerNo || item.buyerNumber || 'NA',
          jenisSample: (item.jenisSample || item.sampleType || 'DEVELOP').toUpperCase(),
          style: (item.style || item.name || 'TANPA STYLE').trim(),
          sampleNo: item.sampleNo || 'NA',
          size: item.size || 'NA',
          color: item.color && item.color !== '-' ? item.color : 'NA',
          jumlah: Number.isFinite(Number(item.jumlah)) ? Number(item.jumlah) : (Number(item.qty) || 0),
          satuan: String(item.satuan || item.unit || 'PCE').toUpperCase() === 'PCS' ? 'PCE' : String(item.satuan || item.unit || 'PCE').toUpperCase(),
          place: item.place || (box ? `BOX ${box.boxNumber} (${box.rackName} - ${box.picName})` : 'NA'),
          boxLabel: `BOX ${item.boxNumber}`,
          boxNumber: Number(item.boxNumber) || 1,
          rackName: box ? box.rackName : 'NA',
          picName: item.picName || (box ? box.picName : 'NA'),
          dateIn: formattedDate,
          helperName: (() => {
            if (item.helperName) return item.helperName;
            const tags = Array.isArray(item.tags) ? item.tags : [];
            const tag = tags.find(t => typeof t === 'string' && t.startsWith('helper:'));
            return tag ? decodeURIComponent(tag.slice(7)) : null;
          })(),
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
        item.helperName,
      ]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q));
    });
  }, [allItems, query, ageFilter]);

  // List seluruh item untuk view mode table / flat cards (dengan kategori & sorting)
  const tableItems = useMemo(() => {
    let list = filteredItems;
    if (categoryFilter === 'SAMPLE') {
      list = list.filter((i) => i.category === 'SAMPLE');
    } else if (categoryFilter === 'MATERIAL') {
      list = list.filter((i) => i.category === 'MATERIAL');
    } else if (categoryFilter === 'BORROWED') {
      list = list.filter((i) => i.status === 'Borrowed');
    } else if (categoryFilter === 'DISPATCHED') {
      list = list.filter((i) => isItemDispatched(i));
    }

    const mult = sortDirection === 'asc' ? 1 : -1;

    return [...list].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'date': {
          const da = a.recordDate || a.dateIn || '';
          const db = b.recordDate || b.dateIn || '';
          if (da && db) {
            cmp = da.localeCompare(db);
          }
          if (cmp === 0) {
            cmp = (b.age?.days || 0) - (a.age?.days || 0);
          }
          break;
        }
        case 'age': {
          cmp = (a.age?.days || 0) - (b.age?.days || 0);
          break;
        }
        case 'kode': {
          cmp = (a.kode || '').localeCompare(b.kode || '', undefined, { numeric: true, sensitivity: 'base' });
          break;
        }
        case 'track': {
          cmp = (a.track || '').localeCompare(b.track || '', undefined, { numeric: true });
          break;
        }
        case 'buyer': {
          cmp = (a.buyerNo || '').localeCompare(b.buyerNo || '', undefined, { numeric: true });
          break;
        }
        case 'jenis': {
          cmp = (a.jenisSample || '').localeCompare(b.jenisSample || '');
          break;
        }
        case 'style': {
          cmp = (a.style || '').localeCompare(b.style || '', undefined, { numeric: true });
          break;
        }
        case 'sampleNo': {
          cmp = (a.sampleNo || '').localeCompare(b.sampleNo || '', undefined, { numeric: true });
          break;
        }
        case 'size': {
          cmp = (a.size || '').localeCompare(b.size || '', undefined, { numeric: true });
          break;
        }
        case 'color': {
          cmp = (a.color || '').localeCompare(b.color || '');
          break;
        }
        case 'jumlah': {
          cmp = (Number(a.jumlah) || 0) - (Number(b.jumlah) || 0);
          break;
        }
        case 'box': {
          cmp = (Number(a.boxNumber) || 0) - (Number(b.boxNumber) || 0);
          if (cmp === 0) {
            cmp = (a.picName || '').localeCompare(b.picName || '');
          }
          break;
        }
        default:
          cmp = 0;
      }

      if (cmp !== 0) {
        return cmp * mult;
      }
      return (a.kode || '').localeCompare(b.kode || '', undefined, { numeric: true });
    });
  }, [filteredItems, categoryFilter, sortField, sortDirection]);

  const totalTableItems = tableItems.length;
  const totalPages = pageSize > 0 ? Math.ceil(totalTableItems / pageSize) : 1;
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages || 1);

  const paginatedItems = useMemo(() => {
    if (pageSize <= 0) return tableItems;
    const start = (safeCurrentPage - 1) * pageSize;
    return tableItems.slice(start, start + pageSize);
  }, [tableItems, safeCurrentPage, pageSize]);

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
      if (item.jenisSample) {
        const norm = item.jenisSample.toUpperCase();
        g.sampleTypes.add(norm === 'ARSIP' ? 'ARCHIVE' : norm);
      }

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
      PPIC: item.picName,
      Place: item.place,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ringkasan Inventory');
    XLSX.writeFile(wb, `GAGACLO_RINGKASAN_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const SAMPLE_TYPES = ['DEVELOP', 'PPS', 'ORI', 'BULK SAMPLE', 'ARCHIVE'];

  const renderSortableHeader = (field, label, align = 'left', extraClass = '') => {
    const isActive = sortField === field;
    return (
      <th
        key={field}
        onClick={() => handleHeaderSort(field)}
        className={`px-3.5 py-3 cursor-pointer select-none group transition-all duration-150 whitespace-nowrap ${
          align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
        } ${
          isActive
            ? 'text-[#0071e3] bg-[#0071e3]/[0.08] font-bold shadow-2xs'
            : 'text-[#86868b] hover:text-[#1d1d1f] hover:bg-black/[0.04]'
        } ${extraClass}`}
        title={`Klik untuk mengurutkan berdasarkan ${label} (${
          isActive
            ? sortDirection === 'asc'
              ? 'Sedang urut A ke Z / Terkecil. Klik untuk membalik urutan (Z ke A / Terbesar)'
              : 'Sedang urut Z ke A / Terbesar. Klik untuk membalik urutan (A ke Z / Terkecil)'
            : 'Klik untuk mengurutkan'
        })`}
        aria-sort={isActive ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
      >
        <div
          className={`inline-flex items-center gap-1.5 ${
            align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'
          }`}
        >
          <span>{label}</span>
          <span className="inline-flex items-center shrink-0">
            {isActive ? (
              sortDirection === 'asc' ? (
                <ArrowUp className="w-3.5 h-3.5 text-[#0071e3]" />
              ) : (
                <ArrowDown className="w-3.5 h-3.5 text-[#0071e3]" />
              )
            ) : (
              <ArrowUpDown className="w-3 h-3 text-[#86868b]/40 opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </span>
        </div>
      </th>
    );
  };

  return (
    <div className="space-y-5 font-apple">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-bold text-[#1d1d1f] tracking-tight">
            <Archive className="h-5 w-5 text-[#0071e3]" aria-hidden="true" />
            Ringkasan Total Item &amp; Aktivitas R&amp;D
          </h1>
          <p className="mt-0.5 text-xs text-[#86868b]">
            Pelacakan umur simpan, rekap harian simpan PCS per PPIC, matriks style, dan audit kode duplikat.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Tombol Sinkron Real-time Otomatis */}
          <button
            type="button"
            onClick={handleManualSync}
            disabled={isManualSyncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border border-[#34c759]/30 bg-[#34c759]/10 hover:bg-[#34c759]/20 text-[#30d158] transition cursor-pointer shadow-xs disabled:opacity-60"
            title="Sinkronkan data inventory real-time dari Supabase (Otomatis sync tiap 4 detik)"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#30d158] ${isManualSyncing ? 'animate-spin' : ''}`} />
            <span>{isManualSyncing ? 'Menyinkronkan...' : 'Sinkron Real-Time'}</span>
            <span className="relative flex h-2 w-2 ml-0.5" title="Koneksi Cloud Real-time Aktif">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#34c759] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#34c759]"></span>
            </span>
          </button>

          {/* View Mode Switcher (Apple Segmented Control Style) */}
          <div className="inline-flex items-center p-1 bg-black/[0.04] rounded-full border border-black/[0.05] gap-0.5 max-w-full overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => setViewMode('styles')}
              className={`px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                viewMode === 'styles'
                  ? 'bg-white text-[#1d1d1f] shadow-[0_2px_8px_rgba(0,0,0,0.08)] ring-1 ring-black/[0.04]'
                  : 'text-[#86868b] hover:text-[#1d1d1f] hover:bg-black/[0.02]'
              }`}
            >
              <Shirt className="w-3.5 h-3.5" />
              <span>Pengelompokan Style</span>
              <span className={`text-[11px] px-1.5 py-0.2 rounded-full font-medium tabular-nums ${
                viewMode === 'styles' ? 'bg-[#0071e3]/10 text-[#0071e3]' : 'bg-black/[0.05] text-[#86868b]'
              }`}>
                {styleGroups.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                viewMode === 'table'
                  ? 'bg-white text-[#1d1d1f] shadow-[0_2px_8px_rgba(0,0,0,0.08)] ring-1 ring-black/[0.04]'
                  : 'text-[#86868b] hover:text-[#1d1d1f] hover:bg-black/[0.02]'
              }`}
              title="Tampilkan seluruh item satu per satu tanpa pengelompokan style"
            >
              <List className="w-3.5 h-3.5" />
              <span>Semua Item (Tanpa Kelompok)</span>
              <span className={`text-[11px] px-1.5 py-0.2 rounded-full font-medium tabular-nums ${
                viewMode === 'table' ? 'bg-[#0071e3]/10 text-[#0071e3]' : 'bg-black/[0.05] text-[#86868b]'
              }`}>
                {totalTableItems}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('duplicates')}
              className={`px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                viewMode === 'duplicates'
                  ? 'bg-white text-[#1d1d1f] shadow-[0_2px_8px_rgba(0,0,0,0.08)] ring-1 ring-black/[0.04]'
                  : 'text-[#86868b] hover:text-[#1d1d1f] hover:bg-black/[0.02]'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Kode Sama &amp; Perbaikan</span>
              <span
                className={`text-[11px] px-1.5 py-0.2 rounded-full font-medium tabular-nums ${
                  duplicateCodeGroups.length > 0
                    ? 'bg-[#ff9500]/15 text-[#c96700]'
                    : 'bg-[#34c759]/15 text-[#30d158]'
                }`}
              >
                {duplicateCodeGroups.length > 0 ? `${duplicateCodeGroups.length} Duplikat` : '✓ 0'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUB-VIEW: KODE SAMA / DUPLIKAT & PERBAIKAN OTOMATIS                      */}
      {/* ========================================================================= */}
      {viewMode === 'duplicates' && (
        <div className="space-y-4">
          {duplicateCodeGroups.length === 0 ? (
            <div className="inventory-panel p-8 bg-white/95 backdrop-blur-md rounded-lg border border-slate-200/80 shadow-2xs text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                <ShieldCheck className="w-8 h-8 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Semua Kode Sampel Unik (100% Bebas Duplikat)
                </h2>
                <p className="mt-1 text-xs text-slate-500 max-w-lg mx-auto">
                  Seluruh <strong>{allItems.length} sampel</strong> yang tersebar di 72 box memiliki nomor kode yang
                  valid dan unik. Tidak ada nomor kode yang bentrok antar box maupun antar PPIC.
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
              <div className="p-4 rounded-lg bg-amber-50/90 border border-amber-300 text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
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
                    className="p-4 bg-white/95 backdrop-blur-md rounded-lg border border-slate-200/90 shadow-2xs space-y-3"
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
                          <span className="text-xs text-slate-500 font-medium">
                            (Tersebar di {group.items.map((i) => `BOX ${i.boxNumber}`).join(', ')})
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-500 font-medium">
                        Total Kuantitas: <strong>{group.totalPcs} PCE</strong>
                      </div>
                    </div>

                    {/* Table of items sharing this code */}
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50/90 text-xs font-bold text-slate-700 uppercase">
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
                            const isHelperUser = isHelper(currentUser);
                            const isPicOwner = !item.picName || String(currentUser?.name).trim().toLowerCase() === String(item.picName).trim().toLowerCase();
                            const isDeletable = !currentUser || (!isHelperUser && (isSuperuser(currentUser) || isPicOwner));

                            return (
                              <tr key={item.id} className="hover:bg-slate-50/70 transition">
                                <td className="px-3 py-2.5 font-bold text-slate-400">{idx + 1}</td>
                                <td className="px-3 py-2.5">
                                  <div className="font-bold text-blue-700">{item.boxLabel}</div>
                                  <div className="text-xs text-slate-400">{item.rackName}</div>
                                </td>
                                <td className="px-3 py-2.5">
                                  <div className="font-bold text-slate-900">{item.style}</div>
                                  <div className="text-xs text-slate-500">Buyer: {item.buyerNo}</div>
                                </td>
                                <td className="px-3 py-2.5">
                                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-xs">
                                    {item.jenisSample}
                                  </span>
                                </td>
                                <td className="px-3 py-2.5 text-right font-black text-slate-800 tabular-nums">
                                  {item.jumlah} <span className="text-xs text-slate-400 font-normal">PCE</span>
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
                                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition flex items-center gap-1 cursor-pointer disabled:opacity-50 shadow-2xs"
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
                                            className="px-2 py-0.5 rounded bg-red-600 text-white text-xs font-bold cursor-pointer"
                                          >
                                            Hapus?
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setConfirmDeleteId(null)}
                                            className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-xs cursor-pointer"
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
                                        title={`Terkunci: Data milik PPIC ${item.picName}`}
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
        <section className="inventory-panel p-4 sm:p-5 bg-white/90 backdrop-blur-xl rounded-[22px] border border-black/[0.08] shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4 font-apple">
          {/* Controls: Search, Aging Filter Chips, Actions */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 flex-1">
              <div className="relative w-full sm:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#86868b]" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Cari style, buyer, kode, box, PPIC..."
                  className="w-full rounded-full border border-black/[0.07] bg-black/[0.03] py-2 pl-9 pr-3 text-xs sm:text-sm text-[#1d1d1f] placeholder:text-[#86868b] focus:border-[#0071e3] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0071e3]/20 transition shadow-xs"
                />
              </div>

              {/* Quick Aging Filter Chips (Apple Segmented Style) */}
              <div className="flex items-center gap-1.5 flex-wrap text-xs">
                <button
                  type="button"
                  onClick={() => setAgeFilter('ALL')}
                  className={`px-3 py-1.5 rounded-full font-semibold transition cursor-pointer border select-none ${
                    ageFilter === 'ALL'
                      ? 'bg-[#1d1d1f] text-white border-[#1d1d1f] shadow-xs'
                      : 'bg-black/[0.03] hover:bg-black/[0.06] text-[#86868b] border-black/[0.06]'
                  }`}
                >
                  Semua Umur ({metrics.total})
                </button>
                <button
                  type="button"
                  onClick={() => setAgeFilter('FRESH')}
                  className={`px-3 py-1.5 rounded-full font-semibold transition cursor-pointer border select-none ${
                    ageFilter === 'FRESH'
                      ? 'bg-[#34c759] text-white border-[#34c759] shadow-xs'
                      : 'bg-[#34c759]/10 hover:bg-[#34c759]/20 text-[#30d158] border-[#34c759]/25'
                  }`}
                >
                  &lt; 30 Hari ({metrics.fresh})
                </button>
                <button
                  type="button"
                  onClick={() => setAgeFilter('MEDIUM')}
                  className={`px-3 py-1.5 rounded-full font-semibold transition cursor-pointer border select-none ${
                    ageFilter === 'MEDIUM'
                      ? 'bg-[#0071e3] text-white border-[#0071e3] shadow-xs'
                      : 'bg-[#0071e3]/10 hover:bg-[#0071e3]/20 text-[#0071e3] border-[#0071e3]/25'
                  }`}
                >
                  30–90 Hari ({metrics.medium})
                </button>
                <button
                  type="button"
                  onClick={() => setAgeFilter('AGED')}
                  className={`px-3 py-1.5 rounded-full font-semibold transition cursor-pointer border select-none ${
                    ageFilter === 'AGED'
                      ? 'bg-[#ff9500] text-white border-[#ff9500] shadow-xs'
                      : 'bg-[#ff9500]/10 hover:bg-[#ff9500]/20 text-[#c96700] border-[#ff9500]/25'
                  }`}
                >
                  90–180 Hari ({metrics.aged})
                </button>
                <button
                  type="button"
                  onClick={() => setAgeFilter('CRITICAL')}
                  className={`px-3 py-1.5 rounded-full font-semibold transition cursor-pointer border select-none ${
                    ageFilter === 'CRITICAL'
                      ? 'bg-[#ff3b30] text-white border-[#ff3b30] shadow-xs'
                      : 'bg-[#ff3b30]/10 hover:bg-[#ff3b30]/20 text-[#ff3b30] border-[#ff3b30]/25'
                  }`}
                >
                  &gt; 180 Hari ({metrics.critical})
                </button>
              </div>
            </div>

            {/* Actions: Expand/Collapse & Export Excel */}
            <div className="flex items-center gap-2 self-start lg:self-center">
              {viewMode === 'styles' && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={expandAllStyles}
                    className="px-3 py-1.5 rounded-full border border-black/[0.08] text-[#1d1d1f] bg-white hover:bg-black/[0.03] text-xs font-semibold transition cursor-pointer"
                  >
                    Buka Semua
                  </button>
                  <button
                    type="button"
                    onClick={collapseAllStyles}
                    className="px-3 py-1.5 rounded-full border border-black/[0.08] text-[#1d1d1f] bg-white hover:bg-black/[0.03] text-xs font-semibold transition cursor-pointer"
                  >
                    Tutup Semua
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={handleExportExcel}
                className="px-3.5 py-1.5 rounded-full bg-[#34c759] hover:bg-[#30d158] text-white font-semibold text-xs transition flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Unduh Excel</span>
              </button>
            </div>
          </div>

          {/* Sub-Toolbar Khusus Mode "Semua Item (Tanpa Kelompok)" */}
          {viewMode === 'table' && (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-black/[0.06] text-xs">
              {/* Filter Kategori & Status */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[#86868b] text-[11px] font-semibold uppercase tracking-wider mr-1">Filter:</span>
                {[
                  { key: 'ALL', label: `Semua (${filteredItems.length})` },
                  { key: 'SAMPLE', label: `Sample (${filteredItems.filter((i) => i.category === 'SAMPLE').length})` },
                  { key: 'MATERIAL', label: `Material (${filteredItems.filter((i) => i.category === 'MATERIAL').length})` },
                  { key: 'BORROWED', label: `Dipinjam (${filteredItems.filter((i) => i.status === 'Borrowed').length})` },
                  { key: 'DISPATCHED', label: `Dikirim (${filteredItems.filter((i) => isItemDispatched(i)).length})` },
                ].map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => {
                      setCategoryFilter(f.key);
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer border ${
                      categoryFilter === f.key
                        ? 'bg-[#0071e3] text-white border-[#0071e3] shadow-xs'
                        : 'bg-white text-[#1d1d1f] border-black/[0.08] hover:bg-black/[0.03]'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Sorting & Layout Switcher */}
              <div className="flex items-center gap-2.5 flex-wrap">
                {/* Sorting Dropdown & Reset */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <div className="flex items-center gap-1.5 bg-[#f5f5f7] px-3 py-1 rounded-full border border-black/[0.06]">
                    <ArrowUpDown className="w-3.5 h-3.5 text-[#86868b]" />
                    <span className="text-[#86868b] text-[11px] font-semibold">Urutkan:</span>
                    <select
                      value={`${sortField}-${sortDirection}`}
                      onChange={(e) => {
                        const val = e.target.value;
                        const parts = val.split('-');
                        const dir = parts.pop();
                        const field = parts.join('-');
                        setSortField(field);
                        setSortDirection(dir === 'asc' ? 'asc' : 'desc');
                        setCurrentPage(1);
                      }}
                      className="bg-transparent text-xs font-semibold text-[#1d1d1f] focus:outline-hidden cursor-pointer"
                    >
                      <option value="date-desc">Tanggal Masuk (Terbaru)</option>
                      <option value="date-asc">Tanggal Masuk (Terlama)</option>
                      <option value="age-desc">Umur Simpan (Terlama)</option>
                      <option value="age-asc">Umur Simpan (Terbaru)</option>
                      <option value="kode-asc">Kode (A-Z)</option>
                      <option value="kode-desc">Kode (Z-A)</option>
                      <option value="style-asc">Style (A-Z)</option>
                      <option value="style-desc">Style (Z-A)</option>
                      <option value="jumlah-desc">Jumlah (Terbanyak)</option>
                      <option value="jumlah-asc">Jumlah (Tersedikit)</option>
                      <option value="box-asc">Nomor Box (1-72)</option>
                      <option value="box-desc">Nomor Box (72-1)</option>
                      <option value="buyer-asc">Buyer (A-Z)</option>
                      <option value="buyer-desc">Buyer (Z-A)</option>
                      <option value="track-asc">Track (A-Z)</option>
                      <option value="jenis-asc">Jenis (A-Z)</option>
                      <option value="sampleNo-asc">Sample No (A-Z)</option>
                      <option value="size-asc">Size (A-Z)</option>
                      <option value="color-asc">Color (A-Z)</option>
                      {!['date-desc','date-asc','age-desc','age-asc','kode-asc','kode-desc','style-asc','style-desc','jumlah-desc','jumlah-asc','box-asc','box-desc','buyer-asc','buyer-desc','track-asc','jenis-asc','sampleNo-asc','size-asc','color-asc'].includes(`${sortField}-${sortDirection}`) && (
                        <option value={`${sortField}-${sortDirection}`}>
                          {sortField.toUpperCase()} ({sortDirection === 'asc' ? 'A-Z' : 'Z-A'})
                        </option>
                      )}
                    </select>
                  </div>

                  {(sortField !== 'date' || sortDirection !== 'desc') && (
                    <button
                      type="button"
                      onClick={() => {
                        setSortField('date');
                        setSortDirection('desc');
                        setCurrentPage(1);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold text-[#0071e3] bg-[#0071e3]/10 hover:bg-[#0071e3]/15 transition cursor-pointer border border-[#0071e3]/20"
                      title="Kembalikan urutan standar (Tanggal Terbaru)"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset</span>
                    </button>
                  )}
                </div>

                {/* Tampilan Toggle: Tabel vs Kartu */}
                <div className="inline-flex items-center p-0.5 bg-[#f5f5f7] rounded-full border border-black/[0.06]">
                  <button
                    type="button"
                    onClick={() => setSubLayout('table')}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${
                      subLayout === 'table'
                        ? 'bg-white text-[#0071e3] shadow-xs'
                        : 'text-[#86868b] hover:text-[#1d1d1f]'
                    }`}
                    title="Tampilan Tabel Spreadsheet Lengkap"
                  >
                    <LayoutList className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Tabel</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubLayout('cards')}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${
                      subLayout === 'cards'
                        ? 'bg-white text-[#0071e3] shadow-xs'
                        : 'text-[#86868b] hover:text-[#1d1d1f]'
                    }`}
                    title="Tampilan Kartu List Satuan"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Kartu</span>
                  </button>
                </div>
              </div>
            </div>
          )}

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
                      className="border border-slate-200/90 rounded-lg bg-white shadow-2xs hover:border-slate-300 transition overflow-hidden"
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
                              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                Buyer: {buyerDisplay}
                              </span>
                              <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/60">
                                {group.items.length} Sampel • {group.totalPcs} PCE
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
                                  className={`px-2 py-0.5 rounded-full text-xs font-bold ${
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
                          <div className="flex items-center gap-1 p-1 bg-slate-100/80 rounded-xl border border-slate-200/80 text-xs font-bold">
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
                                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-600 uppercase">
                                  <th className="px-3 py-2">Kode</th>
                                  <th className="px-3 py-2">Tanggal</th>
                                  <th className="px-3 py-2">Umur Simpan</th>
                                  <th className="px-3 py-2">Jenis</th>
                                  <th className="px-3 py-2">Sample No</th>
                                  <th className="px-3 py-2">Size &amp; Warna</th>
                                  <th className="px-3 py-2 text-right">Jumlah</th>
                                  <th className="px-3 py-2">Box &amp; PPIC</th>
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
                                        className={`px-2 py-0.5 rounded-full text-xs font-bold inline-block ${
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
                                      {item.jumlah} <span className="text-xs text-slate-400 font-normal">{item.satuan}</span>
                                    </td>
                                    <td className="px-3 py-2">
                                      {isItemDispatched(item) ? (
                                        <div className="space-y-0.5">
                                          <span className="inline-block px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs">
                                            🚀 Dikirim ({decodeDispatchData(item)?.destinationLabel || 'Luar'})
                                          </span>
                                          <div className="text-xs text-slate-400">Asal {item.boxLabel}</div>
                                        </div>
                                      ) : (
                                        <>
                                          <div className="font-bold text-blue-700">{item.boxLabel}</div>
                                          <div className="text-xs text-slate-400">{item.picName}</div>
                                        </>
                                      )}
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

          {/* Mode 2: Tampilan Seluruh Item (Tanpa Kelompok) */}
          {viewMode === 'table' && (
            <div className="space-y-4">
              {/* Layout 1: Tampilan Kartu List Satuan */}
              {subLayout === 'cards' && (
                <div>
                  {totalTableItems === 0 ? (
                    <div className="p-12 text-center text-[#86868b] bg-black/[0.02] rounded-[18px] border border-dashed border-black/[0.08]">
                      Tidak ada item yang cocok dengan pencarian atau filter yang dipilih.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {paginatedItems.map((item, i) => {
                        const rowNumber = (pageSize > 0 ? (safeCurrentPage - 1) * pageSize : 0) + i + 1;
                        const isHelperUser = isHelper(currentUser);
                        const isPicOwner = !item.picName || String(currentUser?.name).trim().toLowerCase() === String(item.picName).trim().toLowerCase();
                        const isInputter = currentUser && (
                          (item.inputtedBy && String(currentUser.name).trim().toLowerCase() === String(item.inputtedBy).trim().toLowerCase()) ||
                          (item.createdBy && String(currentUser.name).trim().toLowerCase() === String(item.createdBy).trim().toLowerCase())
                        );
                        const canEdit = !currentUser || isSuperuser(currentUser) || isHelperUser || isPicOwner || isInputter;
                        const canDelete = !currentUser || (!isHelperUser && (isSuperuser(currentUser) || isPicOwner || isInputter));

                        return (
                          <div
                            key={item.id}
                            className="p-4 rounded-[20px] bg-white border border-black/[0.07] shadow-2xs hover:border-black/[0.14] hover:shadow-xs transition-all flex flex-col justify-between"
                          >
                            <div>
                              {/* Header Baris 1: No, Kode (copyable), Jenis Sample, Buyer, Umur Simpan Badge */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-semibold text-xs text-[#86868b] tabular-nums">#{rowNumber}</span>
                                  <button
                                    type="button"
                                    onClick={(e) => handleCopyCode(e, item.kode, item.id)}
                                    className="font-mono font-bold text-xs text-[#0071e3] bg-[#0071e3]/10 hover:bg-[#0071e3]/15 px-2 py-0.5 rounded-lg border border-[#0071e3]/20 flex items-center gap-1 transition cursor-pointer"
                                    title="Klik untuk salin kode"
                                  >
                                    <span>{item.kode}</span>
                                    {copiedCodeId === item.id ? (
                                      <Check className="w-3 h-3 text-emerald-600" />
                                    ) : (
                                      <Copy className="w-3 h-3 text-[#0071e3]/60" />
                                    )}
                                  </button>
                                  <span className="text-[10px] font-black uppercase px-1.5 py-0.5 bg-amber-400 text-slate-950 rounded">
                                    {item.jenisSample}
                                  </span>
                                  {item.buyerNo && item.buyerNo !== '-' && item.buyerNo !== 'NA' && (
                                    <span className="text-xs text-[#86868b] font-mono">({item.buyerNo})</span>
                                  )}
                                </div>
                                <span
                                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold inline-block border tabular-nums shrink-0 ${
                                    item.age.tier === 'critical'
                                      ? 'bg-[#ff3b30]/10 text-[#ff3b30] border-[#ff3b30]/25'
                                      : item.age.tier === 'aged'
                                      ? 'bg-[#ff9500]/10 text-[#c96700] border-[#ff9500]/25'
                                      : item.age.tier === 'medium'
                                      ? 'bg-[#0071e3]/10 text-[#0071e3] border-[#0071e3]/25'
                                      : 'bg-[#34c759]/10 text-[#30d158] border-[#34c759]/25'
                                  }`}
                                >
                                  {item.age.label}
                                </span>
                              </div>

                              {/* Style Name & Detail Row */}
                              <div className="mt-2.5">
                                <h4 className="font-bold text-sm text-[#1d1d1f] leading-snug break-words">
                                  {item.style}
                                </h4>
                                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#86868b]">
                                  {item.sampleNo && item.sampleNo !== 'NA' && (
                                    <span>Sample No: <strong className="text-[#1d1d1f] font-mono">{item.sampleNo}</strong></span>
                                  )}
                                  <span>Size: <strong className="text-[#1d1d1f] font-mono">{item.size}</strong></span>
                                  <span>Warna: <strong className="text-[#1d1d1f]">{item.color}</strong></span>
                                  <span className="font-bold text-[#1d1d1f] bg-black/[0.04] px-2 py-0.5 rounded-md">
                                    {item.jumlah} {item.satuan}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Footer: Lokasi Box & PPIC, Status, Action buttons */}
                            <div className="mt-3 pt-2.5 border-t border-black/[0.05] flex items-center justify-between gap-2 text-xs">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="w-2 h-2 rounded-full bg-[#0071e3] shrink-0" />
                                <span className="font-semibold text-[#1d1d1f] truncate">{item.boxLabel}</span>
                                <span className="text-[#86868b] truncate">• {item.rackName} • {item.picName}</span>
                                {item.helperName && (
                                  <span className="text-[10px] font-bold text-[#0071e3] bg-[#0071e3]/10 px-1.5 py-0.2 rounded-full shrink-0">
                                    Input: {item.helperName}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => addToDispatchCart(item, 1)}
                                  className={`p-1.5 rounded-lg transition cursor-pointer ${
                                    isItemInDispatchCart(item.id)
                                      ? 'bg-rose-100 text-rose-700 font-bold'
                                      : 'bg-black/[0.04] hover:bg-rose-50 text-slate-600 hover:text-rose-600'
                                  }`}
                                  title="Tambah ke Keranjang Pengiriman"
                                  aria-label={`Tambah ${item.style || item.kode} ke Keranjang`}
                                >
                                  <ShoppingCart className="h-3.5 w-3.5" />
                                </button>
                                {canEdit && (
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
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                )}
                                {canDelete && (
                                  String(confirmDeleteId) === String(item.id) ? (
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
                                        className="px-2 py-1 rounded-lg bg-red-600 text-white text-xs font-bold transition hover:bg-red-700 cursor-pointer"
                                        title="Konfirmasi hapus permanen"
                                      >
                                        Hapus?
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setConfirmDeleteId(null)}
                                        className="px-1.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold transition hover:bg-slate-200 cursor-pointer"
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
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  )
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Layout 2: Tampilan Tabel Spreadsheet Lengkap */}
              {subLayout === 'table' && (
                <div className="overflow-x-auto rounded-[18px] border border-black/[0.06] bg-white shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-black/[0.06] bg-black/[0.02] text-[11px] font-semibold text-[#86868b] uppercase tracking-wider select-none">
                        <th
                          onClick={() => {
                            setSortField('date');
                            setSortDirection('desc');
                            setCurrentPage(1);
                          }}
                          className="px-3.5 py-3 cursor-pointer hover:text-[#1d1d1f] hover:bg-black/[0.04] transition-colors whitespace-nowrap"
                          title="Klik untuk reset urutan ke default (Tanggal Masuk Terbaru)"
                        >
                          <div className="inline-flex items-center gap-1">
                            <span>No</span>
                            {sortField === 'date' && sortDirection === 'desc' && (
                              <span className="w-1.5 h-1.5 rounded-full bg-[#0071e3]" title="Urutan Default" />
                            )}
                          </div>
                        </th>
                        {renderSortableHeader('date', 'Tanggal')}
                        {renderSortableHeader('age', 'Umur Simpan')}
                        {renderSortableHeader('kode', 'Kode')}
                        {renderSortableHeader('track', 'Track')}
                        {renderSortableHeader('buyer', 'Buyer')}
                        {renderSortableHeader('jenis', 'Jenis')}
                        {renderSortableHeader('style', 'Style & Deskripsi')}
                        {renderSortableHeader('sampleNo', 'Sample No')}
                        {renderSortableHeader('size', 'Size')}
                        {renderSortableHeader('color', 'Color')}
                        {renderSortableHeader('jumlah', 'Jumlah', 'right')}
                        {renderSortableHeader('box', 'Box & PPIC')}
                        <th className="px-3.5 py-3 text-center whitespace-nowrap">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/[0.04]">
                      {totalTableItems === 0 ? (
                        <tr>
                          <td colSpan={14} className="px-4 py-12 text-center text-[#86868b]">
                            Tidak ada item yang cocok dengan pencarian atau filter yang dipilih.
                          </td>
                        </tr>
                      ) : (
                        paginatedItems.map((item, i) => {
                          const rowNumber = (pageSize > 0 ? (safeCurrentPage - 1) * pageSize : 0) + i + 1;
                          const isHelperUser = isHelper(currentUser);
                          const isPicOwner = !item.picName || String(currentUser?.name).trim().toLowerCase() === String(item.picName).trim().toLowerCase();
                          const isInputter = currentUser && (
                            (item.inputtedBy && String(currentUser.name).trim().toLowerCase() === String(item.inputtedBy).trim().toLowerCase()) ||
                            (item.createdBy && String(currentUser.name).trim().toLowerCase() === String(item.createdBy).trim().toLowerCase())
                          );
                          const canEdit = !currentUser || isSuperuser(currentUser) || isHelperUser || isPicOwner || isInputter;
                          const canDelete = !currentUser || (!isHelperUser && (isSuperuser(currentUser) || isPicOwner || isInputter));

                          return (
                            <tr key={item.id} className="hover:bg-black/[0.02] transition-colors">
                              <td className="px-3.5 py-3 font-semibold text-[#86868b] tabular-nums">{rowNumber}</td>
                              <td className="px-3.5 py-3 text-[#1d1d1f] whitespace-nowrap">
                                <div className="flex items-center gap-1.5 font-mono text-xs text-[#86868b]">
                                  <Calendar className="h-3.5 w-3.5 text-[#86868b]" />
                                  <span className="text-[#1d1d1f]">{item.tanggal}</span>
                                </div>
                              </td>
                              <td className="px-3.5 py-3 whitespace-nowrap">
                                <span
                                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold inline-block border tabular-nums ${
                                    item.age.tier === 'critical'
                                      ? 'bg-[#ff3b30]/10 text-[#ff3b30] border-[#ff3b30]/25'
                                      : item.age.tier === 'aged'
                                      ? 'bg-[#ff9500]/10 text-[#c96700] border-[#ff9500]/25'
                                      : item.age.tier === 'medium'
                                      ? 'bg-[#0071e3]/10 text-[#0071e3] border-[#0071e3]/25'
                                      : 'bg-[#34c759]/10 text-[#30d158] border-[#34c759]/25'
                                  }`}
                                >
                                  {item.age.label}
                                </span>
                              </td>
                              <td className="px-3.5 py-3 whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={(e) => handleCopyCode(e, item.kode, item.id)}
                                  className="font-mono font-bold text-xs text-[#0071e3] hover:text-[#0077ed] bg-[#0071e3]/10 hover:bg-[#0071e3]/15 px-2 py-0.5 rounded-md flex items-center gap-1 transition cursor-pointer"
                                  title="Klik untuk salin kode"
                                >
                                  <span>{item.kode}</span>
                                  {copiedCodeId === item.id ? (
                                    <Check className="w-3 h-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3 h-3 text-[#0071e3]/50" />
                                  )}
                                </button>
                              </td>
                              <td className="px-3.5 py-3 font-mono text-[#86868b]">{item.track}</td>
                              <td className="px-3.5 py-3 font-mono text-[#1d1d1f]">{item.buyerNo}</td>
                              <td className="px-3.5 py-3 font-medium text-[#1d1d1f]">{item.jenisSample}</td>
                              <td className="px-3.5 py-3 font-semibold text-[#1d1d1f] max-w-xs truncate" title={item.style}>
                                {item.style}
                              </td>
                              <td className="px-3.5 py-3 font-mono text-[#86868b]">{item.sampleNo}</td>
                              <td className="px-3.5 py-3 text-[#86868b]">{item.size}</td>
                              <td className="px-3.5 py-3 text-[#86868b]">{item.color}</td>
                              <td className="px-3.5 py-3 text-right font-bold text-[#1d1d1f] tabular-nums whitespace-nowrap">
                                {item.jumlah.toLocaleString('id-ID')}{' '}
                                <span className="text-[11px] font-normal text-[#86868b]">{item.satuan}</span>
                              </td>
                              <td className="px-3.5 py-3">
                                {isItemDispatched(item) ? (
                                  <div className="space-y-0.5">
                                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#ff9500]/10 text-[#c96700] border border-[#ff9500]/25 font-semibold text-xs">
                                      🚀 Dikirim ke {decodeDispatchData(item)?.destinationLabel || 'Luar'}
                                    </span>
                                    <div className="text-[11px] text-[#86868b]">Asal: {item.boxLabel} • {item.picName}</div>
                                  </div>
                                ) : (
                                  <>
                                    <div className="text-xs font-semibold text-[#0071e3]">{item.boxLabel}</div>
                                    <div className="mt-0.5 text-[11px] text-[#86868b]">
                                      {item.rackName}
                                      {item.picName && item.picName !== 'NA' && ` • ${item.picName}`}
                                    </div>
                                    {item.helperName && (
                                      <div className="mt-1">
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#0071e3]/10 text-[#0071e3] border border-[#0071e3]/20 text-[10px] font-bold">
                                          📝 Input: {item.helperName}
                                        </span>
                                      </div>
                                    )}
                                  </>
                                )}
                              </td>
                              <td className="px-3 py-2.5">
                                {(() => {
                                  if (!canEdit && !canDelete) {
                                    return (
                                      <div className="text-center text-xs text-slate-300 font-bold">
                                        Hanya Baca
                                      </div>
                                    );
                                  }

                                  return (
                                    <div className="flex items-center justify-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => addToDispatchCart(item, 1)}
                                        className={`p-1.5 rounded-lg transition cursor-pointer ${
                                          isItemInDispatchCart(item.id)
                                            ? 'bg-rose-100 text-rose-700 font-bold'
                                            : 'bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600'
                                        }`}
                                        title={isItemInDispatchCart(item.id) ? "Sudah ada di keranjang kirim (+1)" : "Tambah ke Keranjang Pengiriman"}
                                        aria-label={`Tambah ${item.style || item.kode} ke Keranjang`}
                                      >
                                        <ShoppingCart className="h-3.5 w-3.5" />
                                      </button>
                                      {canEdit && (
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
                                      )}
                                      {canDelete && (
                                        String(confirmDeleteId) === String(item.id) ? (
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
                                              className="px-2 py-1 rounded-lg bg-red-600 text-white text-xs font-bold transition hover:bg-red-700 cursor-pointer"
                                              title="Konfirmasi hapus permanen"
                                            >
                                              Hapus?
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => setConfirmDeleteId(null)}
                                              className="px-1.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold transition hover:bg-slate-200 cursor-pointer"
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
                                        )
                                      )}
                                    </div>
                                  );
                                })()}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination Controls untuk viewMode === 'table' */}
              {totalPages > 1 && (
                <div className="p-3.5 bg-[#f5f5f7] rounded-[18px] border border-black/[0.06] flex flex-wrap items-center justify-between gap-3 text-xs text-[#86868b]">
                  <div>
                    Menampilkan <strong className="text-[#1d1d1f] font-semibold">{pageSize > 0 ? (safeCurrentPage - 1) * pageSize + 1 : 1}</strong> - <strong className="text-[#1d1d1f] font-semibold">{pageSize > 0 ? Math.min(safeCurrentPage * pageSize, totalTableItems) : totalTableItems}</strong> dari <strong className="text-[#1d1d1f] font-semibold">{totalTableItems}</strong> item
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <span>Per hal:</span>
                      <select
                        value={pageSize}
                        onChange={(e) => {
                          setPageSize(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        className="bg-white border border-black/[0.08] rounded-lg px-2 py-1 text-xs font-semibold text-[#1d1d1f] focus:outline-hidden cursor-pointer"
                      >
                        <option value="50">50</option>
                        <option value="100">100</option>
                        <option value="250">250</option>
                        <option value="0">Semua</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={safeCurrentPage <= 1}
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        className="px-3 py-1 rounded-lg bg-white hover:bg-black/[0.04] border border-black/[0.08] font-semibold text-[#1d1d1f] disabled:opacity-40 transition cursor-pointer"
                      >
                        Sebelumnya
                      </button>
                      <span className="px-2 font-semibold text-[#1d1d1f] tabular-nums">
                        {safeCurrentPage} / {totalPages}
                      </span>
                      <button
                        type="button"
                        disabled={safeCurrentPage >= totalPages}
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        className="px-3 py-1 rounded-lg bg-white hover:bg-black/[0.04] border border-black/[0.08] font-semibold text-[#1d1d1f] disabled:opacity-40 transition cursor-pointer"
                      >
                        Selanjutnya
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
