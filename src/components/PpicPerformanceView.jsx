import { useState, useMemo, useEffect } from 'react';
import { useInventory } from '../context/InventoryContext';
import {
  Calendar,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Users,
  Eye,
  Check,
  Target,
  List,
  Search,
  Copy,
  Download,
  Clock,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  RotateCcw,
  Boxes,
  ExternalLink,
  Filter,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  getItemRecordDate,
  getLocalTodayIso,
  formatDateIndo,
  formatDateIndoFull,
} from '../utils/dateUtils';
import { getDailyTargetForDate } from '../utils/targetUtils';
import { getDynamicMemberQuote } from '../data/motivationalQuotes';

// 8 Anggota Tim R&D Resmi (5 PPIC & 3 Support)
const DEFAULT_TEAM_MEMBERS = [
  { name: 'Royan', role: 'PPIC #1', type: 'PPIC', tagBg: 'bg-blue-100 text-blue-800', border: 'border-blue-200', bg: 'bg-blue-50/40', textAccent: 'text-blue-900' },
  { name: 'Cynara', role: 'PPIC #2', type: 'PPIC', tagBg: 'bg-purple-100 text-purple-800', border: 'border-purple-200', bg: 'bg-purple-50/40', textAccent: 'text-purple-900' },
  { name: 'Ami', role: 'PPIC #3', type: 'PPIC', tagBg: 'bg-emerald-100 text-emerald-800', border: 'border-emerald-200', bg: 'bg-emerald-50/40', textAccent: 'text-emerald-900' },
  { name: 'Ryan', role: 'PPIC #4', type: 'PPIC', tagBg: 'bg-amber-100 text-amber-800', border: 'border-amber-200', bg: 'bg-amber-50/40', textAccent: 'text-amber-900' },
  { name: 'Hanami', role: 'PPIC #5', type: 'PPIC', tagBg: 'bg-rose-100 text-rose-800', border: 'border-rose-200', bg: 'bg-rose-50/40', textAccent: 'text-rose-900' },
  { name: 'Sheva', role: 'Support #1', type: 'Support', tagBg: 'bg-teal-100 text-teal-800', border: 'border-teal-200', bg: 'bg-teal-50/40', textAccent: 'text-teal-900' },
  { name: 'Ade', role: 'Support #2', type: 'Support', tagBg: 'bg-cyan-100 text-cyan-800', border: 'border-cyan-200', bg: 'bg-cyan-50/40', textAccent: 'text-cyan-900' },
  { name: 'Tri', role: 'Support #3', type: 'Support', tagBg: 'bg-sky-100 text-sky-800', border: 'border-sky-200', bg: 'bg-sky-50/40', textAccent: 'text-sky-900' },
];

export function PpicPerformanceView() {
  const {
    boxes,
    items,
    showNotification,
    syncFromSupabase,
    setSelectedBoxNumber,
    targetSetBy = 'Jasmine',
    targetNote,
  } = useInventory();

  const todayIso = getLocalTodayIso();
  const [selectedDailyDate, setSelectedDailyDate] = useState(todayIso);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'cards' | 'log' | 'matrix'
  const [logDateScope, setLogDateScope] = useState('selected'); // 'selected' | 'all'
  const [logPersonFilter, setLogPersonFilter] = useState('ALL'); // 'ALL' | member.name
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [logSortField, setLogSortField] = useState('time'); // 'time' | 'person' | 'code' | 'style' | 'qty' | 'box'
  const [logSortDirection, setLogSortDirection] = useState('desc'); // 'asc' | 'desc'
  const [logPageSize, setLogPageSize] = useState(50);
  const [logCurrentPage, setLogCurrentPage] = useState(1);
  const [copiedCodeId, setCopiedCodeId] = useState(null);

  // Target Harian Tim per tanggal (mengikuti aturan: berubah per hari, jika tidak diubah maka sama dengan hari sebelumnya)
  const [dailyTarget, setDailyTarget] = useState(() => getDailyTargetForDate(selectedDailyDate));

  // Update target saat tanggal dipilih berubah atau saat ada perubahan target dari komponen lain
  useEffect(() => {
    setDailyTarget(getDailyTargetForDate(selectedDailyDate));
  }, [selectedDailyDate]);

  useEffect(() => {
    try {
      localStorage.removeItem('gagaclo_individual_targets');
    } catch {}

    const handleTargetChange = () => {
      setDailyTarget(getDailyTargetForDate(selectedDailyDate));
    };
    window.addEventListener('storage', handleTargetChange);
    window.addEventListener('gagaclo_target_updated', handleTargetChange);
    return () => {
      window.removeEventListener('storage', handleTargetChange);
      window.removeEventListener('gagaclo_target_updated', handleTargetChange);
    };
  }, [selectedDailyDate]);

  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [expandedCards, setExpandedCards] = useState({});

  // Rotasi kata-kata dinamis (pujian/ajakan) setiap 7 detik
  const [quoteTick, setQuoteTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setQuoteTick((t) => (t + 1) % 1000);
    }, 7000);
    return () => clearInterval(timer);
  }, []);

  const handleManualSync = async () => {
    setIsManualSyncing(true);
    try {
      const res = await syncFromSupabase(undefined, false);
      if (res?.success) {
        if (showNotification) {
          showNotification(
            'Data rekap harian berhasil disinkronkan dari server cloud!',
            'success',
            3000
          );
        }
      }
    } finally {
      setIsManualSyncing(false);
    }
  };

  const boxRackMap = useMemo(() => {
    const map = {};
    boxes.forEach((b) => {
      map[b.boxNumber] = b;
    });
    return map;
  }, [boxes]);

  // Record harian untuk 8 anggota tim secara transparan dan setara
  const dailyTeamRecords = useMemo(() => {
    const map = {};
    const teamNames = DEFAULT_TEAM_MEMBERS.map((m) => m.name);

    items.forEach((item) => {
      const box = boxRackMap[Number(item.boxNumber)];
      const dateKey = item.recordDate || getItemRecordDate(item);
      if (!dateKey) return;

      if (!map[dateKey]) {
        map[dateKey] = {
          date: dateKey,
          totalPcs: 0,
          totalItems: 0,
          byPerson: {},
          items: [],
        };
        teamNames.forEach((name) => {
          map[dateKey].byPerson[name] = { pcs: 0, items: 0, itemsList: [], assistedBoxes: {} };
        });
      }

      const pcs = Number(item.jumlah) || 0;
      const boxPic = String(item.picName || (box ? box.picName : 'Lainnya')).trim();

      // Deteksi penginput riil (PPIC Utama maupun Support)
      const tags = Array.isArray(item.tags) ? item.tags : [];
      const inputtedByTag = tags.find((t) => typeof t === 'string' && t.startsWith('inputted_by:'));
      const supportTag = tags.find((t) => typeof t === 'string' && (t.startsWith('support:') || t.startsWith('helper:')));

      const rawInputtedBy =
        item.inputtedBy ||
        item.createdBy ||
        (inputtedByTag ? decodeURIComponent(inputtedByTag.slice(12)) : null) ||
        item.supportName ||
        item.helperName ||
        (supportTag ? decodeURIComponent(supportTag.slice(supportTag.indexOf(':') + 1)) : null);

      let contributor = null;
      if (rawInputtedBy) {
        const sStr = String(rawInputtedBy).trim().toLowerCase();
        if (/helper\s*1/i.test(sStr)) contributor = 'Sheva';
        else if (/helper\s*2/i.test(sStr)) contributor = 'Ade';
        else if (/helper\s*3/i.test(sStr)) contributor = 'Tri';
        else {
          const match = DEFAULT_TEAM_MEMBERS.find((m) => m.name.toLowerCase() === sStr);
          if (match) contributor = match.name;
        }
      }

      if (!contributor) {
        // Fallback ke PIC pemilik box
        const matchPic = DEFAULT_TEAM_MEMBERS.find((m) => m.name.toLowerCase() === boxPic.toLowerCase());
        contributor = matchPic ? matchPic.name : (boxPic || 'Royan');
      }

      const enrichedItem = {
        ...item,
        recordDate: dateKey,
        boxLabel: `BOX ${item.boxNumber}`,
        rackName: box?.rackName || 'RACK -',
        style: (item.style || item.name || 'TANPA STYLE').trim(),
        kode: item.kode || item.sku || 'NA',
        jumlah: pcs,
        boxPic: boxPic,
        contributor: contributor,
        isCrossBox: contributor !== boxPic,
      };

      map[dateKey].totalPcs += pcs;
      map[dateKey].totalItems += 1;
      map[dateKey].items.push(enrichedItem);

      if (!map[dateKey].byPerson[contributor]) {
        map[dateKey].byPerson[contributor] = { pcs: 0, items: 0, itemsList: [], assistedBoxes: {} };
      }
      map[dateKey].byPerson[contributor].pcs += pcs;
      map[dateKey].byPerson[contributor].items += 1;
      map[dateKey].byPerson[contributor].itemsList.push(enrichedItem);

      if (contributor !== boxPic && boxPic) {
        map[dateKey].byPerson[contributor].assistedBoxes[boxPic] =
          (map[dateKey].byPerson[contributor].assistedBoxes[boxPic] || 0) + pcs;
      }
    });

    const dates = Object.keys(map).sort((a, b) => b.localeCompare(a));
    return { map, dates };
  }, [items, boxRackMap]);

  // Akumulasi total PCS per anggota tim semua hari
  const allTimeTeamTotals = useMemo(() => {
    const totals = {
      byPerson: {},
      grandTotalPcs: 0,
      grandTotalItems: 0,
    };
    DEFAULT_TEAM_MEMBERS.forEach((m) => {
      totals.byPerson[m.name] = { pcs: 0, items: 0 };
    });

    dailyTeamRecords.dates.forEach((dateKey) => {
      const record = dailyTeamRecords.map[dateKey];
      if (!record) return;
      totals.grandTotalPcs += record.totalPcs || 0;
      totals.grandTotalItems += record.totalItems || 0;

      DEFAULT_TEAM_MEMBERS.forEach((m) => {
        const pData = record.byPerson[m.name];
        if (pData) {
          totals.byPerson[m.name].pcs += pData.pcs || 0;
          totals.byPerson[m.name].items += pData.items || 0;
        }
      });
    });

    return totals;
  }, [dailyTeamRecords]);

  // Otomatis pindah hari ke hari ini saat komponen dibuka atau saat tanggal berubah
  useEffect(() => {
    setSelectedDailyDate(todayIso);
  }, [todayIso]);

  const currentDailyData = dailyTeamRecords.map[selectedDailyDate] || {
    date: selectedDailyDate,
    totalPcs: 0,
    totalItems: 0,
    byPerson: {},
    items: [],
  };

  const formatItemTime = (item) => {
    const raw = item?.createdAt || item?.created_at;
    if (!raw) return null;
    try {
      const d = new Date(raw);
      if (!isNaN(d.getTime())) {
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        return `${hh}:${mm}`;
      }
    } catch {}
    return null;
  };

  const getMemberBadge = (name) => {
    const m = DEFAULT_TEAM_MEMBERS.find((x) => x.name.toLowerCase() === String(name || '').toLowerCase());
    return m ? m.tagBg : 'bg-slate-100 text-slate-800';
  };

  const getMemberRole = (name) => {
    const m = DEFAULT_TEAM_MEMBERS.find((x) => x.name.toLowerCase() === String(name || '').toLowerCase());
    return m ? m.role : 'Anggota';
  };

  const rawLogItems = useMemo(() => {
    if (logDateScope === 'selected') {
      return currentDailyData.items || [];
    }
    const all = [];
    dailyTeamRecords.dates.forEach((d) => {
      const rec = dailyTeamRecords.map[d];
      if (rec?.items) {
        all.push(...rec.items);
      }
    });
    return all;
  }, [logDateScope, currentDailyData, dailyTeamRecords]);

  const filteredLogItems = useMemo(() => {
    return rawLogItems.filter((item) => {
      if (logPersonFilter !== 'ALL') {
        if (item.contributor !== logPersonFilter) return false;
      }
      if (logSearchQuery.trim()) {
        const q = logSearchQuery.toLowerCase();
        const match =
          (item.kode || '').toLowerCase().includes(q) ||
          (item.style || '').toLowerCase().includes(q) ||
          (item.buyerNo || '').toLowerCase().includes(q) ||
          (item.sampleNo || '').toLowerCase().includes(q) ||
          (item.size || '').toLowerCase().includes(q) ||
          (item.color || '').toLowerCase().includes(q) ||
          (item.contributor || '').toLowerCase().includes(q) ||
          (item.boxLabel || '').toLowerCase().includes(q) ||
          (item.boxPic || '').toLowerCase().includes(q) ||
          (item.rackName || '').toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [rawLogItems, logPersonFilter, logSearchQuery]);

  const sortedLogItems = useMemo(() => {
    const mult = logSortDirection === 'asc' ? 1 : -1;
    return [...filteredLogItems].sort((a, b) => {
      let cmp = 0;
      switch (logSortField) {
        case 'time': {
          const tA = a.createdAt || a.created_at || a.recordDate || '';
          const tB = b.createdAt || b.created_at || b.recordDate || '';
          cmp = tA.localeCompare(tB);
          break;
        }
        case 'person': {
          cmp = (a.contributor || '').localeCompare(b.contributor || '');
          break;
        }
        case 'code': {
          cmp = (a.kode || '').localeCompare(b.kode || '', undefined, { numeric: true, sensitivity: 'base' });
          break;
        }
        case 'style': {
          cmp = (a.style || '').localeCompare(b.style || '', undefined, { numeric: true });
          break;
        }
        case 'qty': {
          cmp = (Number(a.jumlah) || 0) - (Number(b.jumlah) || 0);
          break;
        }
        case 'box': {
          cmp = (Number(a.boxNumber) || 0) - (Number(b.boxNumber) || 0);
          break;
        }
        default:
          cmp = 0;
      }
      if (cmp !== 0) return cmp * mult;
      return (b.id || '').toString().localeCompare((a.id || '').toString());
    });
  }, [filteredLogItems, logSortField, logSortDirection]);

  const totalLogItems = sortedLogItems.length;
  const totalLogPcs = useMemo(() => {
    return sortedLogItems.reduce((acc, curr) => acc + (Number(curr.jumlah) || 0), 0);
  }, [sortedLogItems]);

  const totalLogPages = logPageSize > 0 ? Math.ceil(totalLogItems / logPageSize) : 1;
  const safeLogCurrentPage = Math.min(Math.max(1, logCurrentPage), totalLogPages || 1);

  const paginatedLogItems = useMemo(() => {
    if (logPageSize <= 0) return sortedLogItems;
    const start = (safeLogCurrentPage - 1) * logPageSize;
    return sortedLogItems.slice(start, start + logPageSize);
  }, [sortedLogItems, safeLogCurrentPage, logPageSize]);

  const handleCopyCode = (e, code, id) => {
    e?.stopPropagation();
    if (!code || code === '-' || code === 'NA') return;
    try {
      navigator.clipboard.writeText(code);
      setCopiedCodeId(id);
      showNotification?.('📋 Kode sample berhasil disalin!', 'info', 2000);
      setTimeout(() => setCopiedCodeId(null), 2000);
    } catch {
      showNotification?.('📋 Kode sample disalin', 'info', 2000);
    }
  };

  const handleLogHeaderSort = (field) => {
    if (logSortField === field) {
      setLogSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setLogSortField(field);
      setLogSortDirection(field === 'time' || field === 'qty' ? 'desc' : 'asc');
    }
    setLogCurrentPage(1);
  };

  const renderSortableHeader = (field, label, align = 'left', extraClass = '') => {
    const isActive = logSortField === field;
    return (
      <th
        key={field}
        onClick={() => handleLogHeaderSort(field)}
        className={`px-3.5 py-3 cursor-pointer select-none group transition-all duration-150 whitespace-nowrap ${
          align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
        } ${
          isActive
            ? 'text-[#0071e3] bg-[#0071e3]/[0.08] font-bold shadow-2xs'
            : 'text-[#86868b] hover:text-[#1d1d1f] hover:bg-black/[0.04]'
        } ${extraClass}`}
        title={`Klik untuk mengurutkan berdasarkan ${label} (${
          isActive
            ? logSortDirection === 'asc'
              ? 'A ke Z / Terkecil, klik untuk Z ke A / Terbesar'
              : 'Z ke A / Terbesar, klik untuk A ke Z / Terkecil'
            : 'Klik untuk mengurutkan'
        })`}
      >
        <div
          className={`inline-flex items-center gap-1.5 ${
            align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'
          }`}
        >
          <span>{label}</span>
          <span className="inline-flex items-center shrink-0">
            {isActive ? (
              logSortDirection === 'asc' ? (
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

  const handleExportExcelLog = async () => {
    try {
      const XLSX = await import('xlsx');
      const rows = sortedLogItems.map((item, i) => ({
        No: i + 1,
        'Tanggal Record': item.recordDate || item.tanggal,
        'Waktu Input': formatItemTime(item) ? `${formatItemTime(item)} WIB` : '-',
        Penginput: item.contributor,
        'Peran Tim': getMemberRole(item.contributor),
        'Kode Sample': item.kode,
        Style: item.style,
        'Sample No': item.sampleNo || 'NA',
        Buyer: item.buyerNo || 'NA',
        'Jenis Sample': item.jenisSample || 'DEVELOP',
        Size: item.size || 'NA',
        Warna: item.color || 'NA',
        Jumlah: item.jumlah,
        Satuan: 'PCE',
        'Box Tujuan': item.boxLabel,
        Rak: item.rackName,
        'PIC Box': item.boxPic,
        Keterangan: item.isCrossBox ? `Bantu Box ${item.boxPic}` : 'Mandiri',
        Status: item.status || 'In Storage',
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Log Input Harian');
      XLSX.writeFile(wb, `GAGACLO_LOG_INPUT_${selectedDailyDate}.xlsx`);
      showNotification?.('📥 Log input berhasil diunduh ke Excel!', 'success', 2500);
    } catch (e) {
      console.error('Export error:', e);
      showNotification?.('Gagal mengunduh Excel log', 'error', 3000);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-5 font-apple">
      {/* Header Controls: Date Picker & Refresh (Apple Glass Style) */}
      <div className="p-4 sm:p-5 bg-white/90 backdrop-blur-xl rounded-[22px] border border-black/[0.08] shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-[#34c759]/15 text-[#30d158] border border-[#34c759]/25 shrink-0">
              <Calendar className="h-4.5 w-4.5 stroke-[2.2]" />
            </div>
            <div>
              <h1 className="text-base font-bold text-[#1d1d1f] flex items-center gap-2 tracking-tight">
                Rekap Harian Penyimpanan Tim R&amp;D
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#34c759]/15 text-[#30d158] border border-[#34c759]/30 tabular-nums">
                  {currentDailyData.totalPcs} PCE
                </span>
              </h1>
              <p className="text-xs text-[#86868b]">
                Catatan kuantitatif input barang harian 8 anggota tim (5 PPIC &amp; 3 Support) secara setara &amp; transparan
              </p>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-900 text-[11px] font-bold">
                  <Target className="w-3 h-3 text-amber-600" />
                  <span>Target Ditentukan {targetSetBy || 'Jasmine'}: {dailyTarget.toLocaleString('id-ID')} PCE</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Cloud Base Synced</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Date Input (Tampil: Tanggal, Bulan dan Tahun) */}
          <label
            className="relative flex items-center gap-2 bg-black/[0.03] hover:bg-black/[0.06] px-3.5 py-1.5 rounded-full border border-black/[0.07] text-xs font-semibold text-[#1d1d1f] cursor-pointer transition shadow-2xs group"
            title="Klik untuk memilih tanggal dari kalender"
          >
            <Calendar className="w-3.5 h-3.5 text-[#86868b] group-hover:text-[#0071e3] transition shrink-0" />
            <span className="text-[#86868b] text-xs">Tanggal:</span>
            <span className="text-[#1d1d1f] font-semibold tracking-tight">
              {formatDateIndoFull(selectedDailyDate)}
            </span>
            <Calendar className="w-3.5 h-3.5 text-[#86868b] group-hover:text-[#1d1d1f] ml-0.5 shrink-0" />
            <input
              type="date"
              value={selectedDailyDate}
              onChange={(e) => {
                if (e.target.value) setSelectedDailyDate(e.target.value);
              }}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              onClick={(e) => {
                try {
                  e.currentTarget.showPicker?.();
                } catch {}
              }}
            />
          </label>

          {/* Quick Pick: Hari Ini */}
          <button
            type="button"
            onClick={() => setSelectedDailyDate(todayIso)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition border cursor-pointer select-none ${
              selectedDailyDate === todayIso
                ? 'bg-[#0071e3] text-white border-[#0071e3] shadow-xs'
                : 'bg-white hover:bg-[#f5f5f7] text-[#1d1d1f] border-black/[0.08]'
            }`}
          >
            Hari Ini
          </button>

          {/* Refresh Data Real-Time */}
          <button
            type="button"
            onClick={handleManualSync}
            disabled={isManualSyncing}
            className="px-3.5 py-1.5 rounded-full text-xs font-semibold border border-[#34c759]/30 bg-[#34c759]/10 hover:bg-[#34c759]/20 text-[#30d158] transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-60"
            title="Refresh data aktivitas harian langsung dari server cloud"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#30d158] ${isManualSyncing ? 'animate-spin' : ''}`} />
            <span>{isManualSyncing ? 'Sync...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* View Mode Segmented Controls */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="inline-flex items-center p-1 bg-black/[0.04] rounded-full border border-black/[0.05] gap-0.5 max-w-full overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'all'
                ? 'bg-white text-[#1d1d1f] shadow-[0_2px_8px_rgba(0,0,0,0.08)] ring-1 ring-black/[0.04]'
                : 'text-[#86868b] hover:text-[#1d1d1f] hover:bg-black/[0.02]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Semua Tampilan</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('cards')}
            className={`px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'cards'
                ? 'bg-white text-[#1d1d1f] shadow-[0_2px_8px_rgba(0,0,0,0.08)] ring-1 ring-black/[0.04]'
                : 'text-[#86868b] hover:text-[#1d1d1f] hover:bg-black/[0.02]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Capaian 8 Anggota</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('log')}
            className={`px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'log'
                ? 'bg-white text-[#1d1d1f] shadow-[0_2px_8px_rgba(0,0,0,0.08)] ring-1 ring-black/[0.04]'
                : 'text-[#86868b] hover:text-[#1d1d1f] hover:bg-black/[0.02]'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>Log Detail Input Barang</span>
            <span className={`text-[11px] px-1.5 py-0.2 rounded-full font-medium tabular-nums ${
              activeTab === 'log' ? 'bg-[#0071e3]/10 text-[#0071e3]' : 'bg-black/[0.05] text-[#86868b]'
            }`}>
              {currentDailyData.totalPcs} PCE
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('matrix')}
            className={`px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'matrix'
                ? 'bg-white text-[#1d1d1f] shadow-[0_2px_8px_rgba(0,0,0,0.08)] ring-1 ring-black/[0.04]'
                : 'text-[#86868b] hover:text-[#1d1d1f] hover:bg-black/[0.02]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Riwayat Harian</span>
            <span className={`text-[11px] px-1.5 py-0.2 rounded-full font-medium tabular-nums ${
              activeTab === 'matrix' ? 'bg-[#0071e3]/10 text-[#0071e3]' : 'bg-black/[0.05] text-[#86868b]'
            }`}>
              {dailyTeamRecords.dates.length} Hari
            </span>
          </button>
        </div>
      </div>

      {(activeTab === 'all' || activeTab === 'cards') && (
        <>
          {/* Ringkasan 2 Metrik Pendukung (Apple Metric Cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Card 1: Kontributor Teraktif */}
        <div className="p-4 sm:p-5 bg-white/90 backdrop-blur-xl rounded-[20px] border border-black/[0.08] shadow-xs flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-semibold text-[#86868b] uppercase tracking-wider">
              Kontributor Teraktif
            </div>
            <div className="mt-1 text-2xl font-bold text-[#1d1d1f] truncate">
              {(() => {
                let topPerson = '-';
                let maxPcs = 0;
                DEFAULT_TEAM_MEMBERS.forEach((m) => {
                  const pcs = currentDailyData.byPerson?.[m.name]?.pcs || 0;
                  if (pcs > maxPcs) {
                    maxPcs = pcs;
                    topPerson = `${m.name} (${m.role})`;
                  }
                });
                return maxPcs > 0 ? `${topPerson} - ${maxPcs} PCE` : 'Belum Ada Input';
              })()}
            </div>
          </div>
          <div className="mt-2 text-xs text-[#0071e3] font-medium">Jumlah input terbanyak pada tanggal ini</div>
        </div>

        {/* Card 2: Riwayat Hari Tercatat */}
        <div className="p-4 sm:p-5 bg-white/90 backdrop-blur-xl rounded-[20px] border border-black/[0.08] shadow-xs flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-semibold text-[#86868b] uppercase tracking-wider">
              Riwayat Hari Tercatat
            </div>
            <div className="mt-1 text-2xl font-bold text-[#1d1d1f] tabular-nums">
              {dailyTeamRecords.dates.length} <span className="text-sm font-medium text-[#86868b]">Hari</span>
            </div>
          </div>
          <div className="mt-2 text-xs text-[#86868b]">Total data riwayat hari tersimpan</div>
        </div>
      </div>

      {/* 8 KARTU ANGGOTA TIM: 5 PPIC & 3 Support Berdampingan Setara */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Users className="h-4 w-4 text-slate-600" />
            <span>Capaian Input Harian 8 Anggota Tim (5 PPIC &amp; 3 Support)</span>
          </h2>
          <span className="text-xs text-slate-500 font-semibold">
            Tanggal: {formatDateIndoFull(selectedDailyDate)}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {DEFAULT_TEAM_MEMBERS.map((member) => {
            const stats = currentDailyData.byPerson?.[member.name] || { pcs: 0, items: 0, itemsList: [], assistedBoxes: {} };
            const allTime = allTimeTeamTotals.byPerson?.[member.name] || { pcs: 0, items: 0 };
            const isExpanded = Boolean(expandedCards[member.name]);
            const assistedList = Object.entries(stats.assistedBoxes || {}).filter(([_, pcs]) => pcs > 0);

            // Perhitungan Target Individu (Auto derive dari Daily Team Target, PIC Asli +10% dibanding Support)
            const isPicAsli = !member.role?.toLowerCase()?.includes('support');
            const autoTarget = isPicAsli
              ? Math.max(1, Math.round((dailyTarget / 8.5) * 1.1))
              : Math.max(1, Math.round(dailyTarget / 8.5));
            const personTarget = autoTarget;
            const personPercent = Math.round((stats.pcs / personTarget) * 100);
            const isPersonAchieved = stats.pcs >= personTarget;
            const memberQuote = getDynamicMemberQuote(member, stats, personTarget, quoteTick);

            return (
              <div
                key={member.name}
                className={`p-4 rounded-lg border ${member.border} ${member.bg} backdrop-blur-md flex flex-col justify-between transition shadow-2xs hover:shadow-xs`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-200/60">
                    <span className="font-black text-sm text-slate-900">{member.name}</span>
                    <span className={`text-xs font-black px-2 py-0.5 rounded-full ${member.tagBg}`}>
                      {member.role}
                    </span>
                  </div>

                  {/* Bagian Capaian & Target Harian Individu */}
                  <div className="mt-1">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      <span>Di-Input Hari Ini:</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 lowercase">
                        {isPicAsli ? 'pic asli (+10%)' : 'support'}
                      </span>
                    </div>

                    <div className="mt-0.5 flex items-baseline justify-between gap-1">
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-slate-900 tabular-nums">
                          {stats.pcs.toLocaleString('id-ID')}
                        </span>
                        <span className="text-xs font-bold text-indigo-700">
                          / {personTarget} PCE
                        </span>
                      </div>
                      <span
                        className={`text-xs font-black px-1.5 py-0.5 rounded-md ${
                          isPersonAchieved
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-indigo-100 text-indigo-900'
                        }`}
                      >
                        {personPercent}%
                      </span>
                    </div>

                        {/* Mini Progress Bar Target */}
                        <div className="w-full bg-slate-200/90 rounded-full h-1.5 mt-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isPersonAchieved ? 'bg-emerald-500' : 'bg-indigo-600'
                            }`}
                            style={{ width: `${Math.min(100, personPercent)}%` }}
                          />
                        </div>

                        {/* Sub-keterangan: status target & sampel */}
                        <div className="flex items-center justify-between text-xs mt-1 text-slate-600">
                          <span>{stats.items > 0 ? `${stats.items} sampel masuk` : 'Belum ada input'}</span>
                          <span className={`font-bold ${isPersonAchieved ? 'text-emerald-700' : 'text-slate-500'}`}>
                            {isPersonAchieved
                              ? (stats.pcs > personTarget ? `✓ +${stats.pcs - personTarget} PCE surplus` : '✓ Tercapai')
                              : `Sisa ${Math.max(0, personTarget - stats.pcs)} PCE`}
                          </span>
                        </div>

                        {/* Badge Kata Dinamis: Pujian / Ajakan Kejar Target */}
                        <div
                          onClick={() => setQuoteTick((t) => (t + 1) % 1000)}
                          className={`mt-2 w-full text-center text-xs font-bold px-2 py-1 rounded-xl border transition-all duration-500 cursor-pointer select-none truncate ${
                            memberQuote.type === 'praise'
                              ? 'bg-emerald-100/90 text-emerald-950 border-emerald-300 shadow-2xs hover:bg-emerald-200/90'
                              : memberQuote.type === 'almost'
                                ? 'bg-amber-100 text-amber-950 border-amber-300 shadow-2xs hover:bg-amber-200'
                                : memberQuote.type === 'progress'
                                  ? 'bg-indigo-50 text-indigo-900 border-indigo-200 hover:bg-indigo-100/80'
                                  : 'bg-slate-100/90 text-slate-700 border-slate-200 hover:bg-slate-200/80'
                          }`}
                          title="Kata motivasi dinamis (klik untuk acak kata-kata)"
                        >
                          {memberQuote.text}
                        </div>
                  </div>

                  {/* Keterangan jika membantu input ke box PPIC lain */}
                  {assistedList.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-slate-200/60">
                      <div className="text-xs font-bold text-slate-500 uppercase">Membantu Box PPIC:</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {assistedList.map(([pName, pPcs]) => (
                          <span key={pName} className="text-xs font-bold px-1.5 py-0.5 rounded bg-white/90 text-slate-700 border border-slate-200">
                            {pName}: <strong>{pPcs} PCE</strong>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Total Akumulasi Semua Hari */}
                  <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Total Akumulasi:</span>
                    <span className="font-black text-slate-900 tabular-nums">
                      {allTime.pcs.toLocaleString('id-ID')} PCE
                    </span>
                  </div>
                </div>

                {stats.itemsList.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-slate-200/60">
                    <div className="flex items-center justify-between gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedCards((prev) => ({
                            ...prev,
                            [member.name]: !prev[member.name],
                          }))
                        }
                        className="text-xs font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1 cursor-pointer"
                      >
                        <span>{isExpanded ? 'Tutup Rincian' : `Lihat ${stats.itemsList.length} Sampel`}</span>
                        {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setLogPersonFilter(member.name);
                          setLogCurrentPage(1);
                          if (activeTab === 'cards') setActiveTab('log');
                          setTimeout(() => {
                            document.getElementById('log-section')?.scrollIntoView({ behavior: 'smooth' });
                          }, 50);
                        }}
                        className="text-[11px] font-semibold text-[#0071e3] hover:underline flex items-center gap-1 cursor-pointer"
                        title={`Buka log untuk ${member.name}`}
                      >
                        <List className="w-3 h-3" />
                        <span>Filter Log</span>
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="mt-2 space-y-1.5 max-h-44 overflow-y-auto pr-1">
                        {stats.itemsList.map((it, itemIdx) => (
                          <div
                            key={itemIdx}
                            className="text-xs p-2 rounded-lg bg-white/95 border border-slate-200/80 leading-tight shadow-2xs"
                          >
                            <div className="font-bold text-slate-900 truncate">{it.style}</div>
                            <div className="text-xs text-slate-600 flex justify-between items-center mt-1">
                              <span className="font-mono font-semibold">
                                {it.boxLabel} ({it.boxPic}) • {it.kode}
                              </span>
                              <span className="font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                {it.jumlah} PCE
                              </span>
                            </div>
                            <div className="text-xs text-slate-400 mt-1 flex justify-between items-center border-t border-slate-100 pt-1">
                              <span>
                                Tgl Sample: <strong className="text-slate-600">{it.tanggal || 'NA'}</strong>
                              </span>
                              {it.isCrossBox && (
                                <span className="text-teal-700 font-bold">
                                  Bantu Box {it.boxPic}
                                </span>
                              )}
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
      </div>
      </>
      )}

      {/* ========================================================================= */}
      {/* 4. LOG DETAIL INPUT BARANG HARIAN (AUDIT TRAIL SELURUH ITEM DI-INPUT)    */}
      {/* ========================================================================= */}
      {(activeTab === 'all' || activeTab === 'log') && (
        <div id="log-section" className="p-4 sm:p-5 bg-white/95 backdrop-blur-md rounded-[20px] border border-slate-200/80 shadow-2xs space-y-4">
          {/* Header Bar Log */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-black/[0.06]">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0071e3]/10 text-[#0071e3]">
                  <List className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-[#1d1d1f] flex items-center gap-2 tracking-tight">
                    Log Detail Input Barang Harian
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#0071e3]/10 text-[#0071e3] tabular-nums border border-[#0071e3]/20">
                      {totalLogItems} Sampel • {totalLogPcs.toLocaleString('id-ID')} PCE
                    </span>
                  </h3>
                  <p className="text-xs text-[#86868b] mt-0.5">
                    {logDateScope === 'selected'
                      ? `Rincian seluruh sampel dan material yang dicatat pada ${formatDateIndoFull(selectedDailyDate)}`
                      : `Rincian seluruh riwayat input dari ${dailyTeamRecords.dates.length} hari yang tercatat`}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Toggle Scope: Hari Ini / Terpilih vs Semua Hari */}
              <div className="inline-flex items-center p-0.5 bg-black/[0.04] rounded-full border border-black/[0.06]">
                <button
                  type="button"
                  onClick={() => {
                    setLogDateScope('selected');
                    setLogCurrentPage(1);
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${
                    logDateScope === 'selected'
                      ? 'bg-white text-[#0071e3] shadow-xs'
                      : 'text-[#86868b] hover:text-[#1d1d1f]'
                  }`}
                  title="Tampilkan hanya tanggal yang dipilih pada header"
                >
                  Tanggal Terpilih ({currentDailyData.items.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLogDateScope('all');
                    setLogCurrentPage(1);
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${
                    logDateScope === 'all'
                      ? 'bg-white text-[#0071e3] shadow-xs'
                      : 'text-[#86868b] hover:text-[#1d1d1f]'
                  }`}
                  title="Tampilkan riwayat dari seluruh tanggal yang tersimpan"
                >
                  Semua Riwayat ({dailyTeamRecords.dates.length} Hari)
                </button>
              </div>

              {/* Unduh Excel Log */}
              <button
                type="button"
                onClick={handleExportExcelLog}
                disabled={sortedLogItems.length === 0}
                className="px-3.5 py-1.5 rounded-full bg-[#34c759] hover:bg-[#30d158] text-white font-semibold text-xs transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                title="Unduh seluruh data log ini ke format spreadsheet Excel (.xlsx)"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Unduh Excel</span>
              </button>
            </div>
          </div>

          {/* Filter Bar: Pencarian & Filter Per Personel */}
          <div className="space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-3.5 h-3.5 text-[#86868b] absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={logSearchQuery}
                  onChange={(e) => {
                    setLogSearchQuery(e.target.value);
                    setLogCurrentPage(1);
                  }}
                  placeholder="Cari kode sample, style, buyer, nomor box, warna..."
                  className="w-full pl-8 pr-3 py-1.5 bg-[#f5f5f7] border border-black/[0.08] rounded-full text-xs text-[#1d1d1f] placeholder:text-[#86868b] focus:outline-hidden focus:ring-2 focus:ring-[#0071e3]/20 focus:bg-white transition"
                />
                {logSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setLogSearchQuery('')}
                    className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Reset Sort Button */}
              {(logSortField !== 'time' || logSortDirection !== 'desc') && (
                <button
                  type="button"
                  onClick={() => {
                    setLogSortField('time');
                    setLogSortDirection('desc');
                    setLogCurrentPage(1);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold text-[#0071e3] bg-[#0071e3]/10 hover:bg-[#0071e3]/15 transition cursor-pointer border border-[#0071e3]/20 self-start sm:self-auto"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Urutan</span>
                </button>
              )}
            </div>

            {/* Filter Chips: 8 Personel + Semua */}
            <div className="flex items-center gap-1.5 flex-wrap overflow-x-auto pb-1 text-xs">
              <span className="text-[#86868b] text-[11px] font-semibold uppercase tracking-wider mr-1">Penginput:</span>
              <button
                type="button"
                onClick={() => {
                  setLogPersonFilter('ALL');
                  setLogCurrentPage(1);
                }}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer border ${
                  logPersonFilter === 'ALL'
                    ? 'bg-[#0071e3] text-white border-[#0071e3] shadow-xs'
                    : 'bg-white text-[#1d1d1f] border-black/[0.08] hover:bg-black/[0.03]'
                }`}
              >
                Semua ({rawLogItems.length})
              </button>
              {DEFAULT_TEAM_MEMBERS.map((m) => {
                const count = rawLogItems.filter((i) => i.contributor === m.name).length;
                const pcs = rawLogItems
                  .filter((i) => i.contributor === m.name)
                  .reduce((acc, curr) => acc + (Number(curr.jumlah) || 0), 0);
                return (
                  <button
                    key={m.name}
                    type="button"
                    onClick={() => {
                      setLogPersonFilter(m.name);
                      setLogCurrentPage(1);
                    }}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer border flex items-center gap-1.5 ${
                      logPersonFilter === m.name
                        ? 'bg-[#0071e3] text-white border-[#0071e3] shadow-xs'
                        : 'bg-white text-[#1d1d1f] border-black/[0.08] hover:bg-black/[0.03]'
                    }`}
                  >
                    <span>{m.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      logPersonFilter === m.name ? 'bg-white/20 text-white' : 'bg-black/[0.05] text-[#86868b]'
                    }`}>
                      {pcs} PCE
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Table Log Detail */}
          <div className="overflow-x-auto rounded-[16px] border border-black/[0.06] bg-white shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-black/[0.06] bg-black/[0.02] text-[11px] font-semibold text-[#86868b] uppercase tracking-wider select-none">
                  <th className="px-3.5 py-3 text-center w-12">No</th>
                  {renderSortableHeader('time', 'Waktu / Tanggal')}
                  {renderSortableHeader('person', 'Penginput')}
                  {renderSortableHeader('code', 'Kode Sample')}
                  {renderSortableHeader('style', 'Style & Deskripsi')}
                  <th className="px-3.5 py-3">Sample No / Buyer</th>
                  <th className="px-3.5 py-3">Size &amp; Warna</th>
                  {renderSortableHeader('qty', 'Jumlah', 'right')}
                  {renderSortableHeader('box', 'Box Tujuan')}
                  <th className="px-3.5 py-3">Keterangan</th>
                  <th className="px-3.5 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04]">
                {paginatedLogItems.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-12 text-center text-[#86868b]">
                      <div className="max-w-xs mx-auto space-y-2">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                          <List className="w-5 h-5" />
                        </div>
                        <div className="font-semibold text-slate-700">Tidak ada log input ditemukan</div>
                        <p className="text-xs text-slate-400">
                          {logSearchQuery
                            ? `Tidak ada hasil yang sesuai dengan kata kunci "${logSearchQuery}".`
                            : 'Belum ada catatan item yang di-input pada tanggal atau filter yang dipilih.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedLogItems.map((item, i) => {
                    const rowNumber = (logPageSize > 0 ? (safeLogCurrentPage - 1) * logPageSize : 0) + i + 1;
                    const itemTime = formatItemTime(item);
                    const memberBadge = getMemberBadge(item.contributor);
                    const memberRole = getMemberRole(item.contributor);

                    return (
                      <tr key={item.id || i} className="hover:bg-black/[0.02] transition-colors">
                        <td className="px-3.5 py-3 font-semibold text-[#86868b] text-center tabular-nums">
                          {rowNumber}
                        </td>
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="font-semibold text-[#1d1d1f] text-xs">
                              {formatDateIndo(item.recordDate || item.tanggal)}
                            </span>
                            {itemTime && (
                              <span className="text-[10px] font-mono text-[#86868b] flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" />
                                {itemTime} WIB
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${memberBadge}`}>
                              {item.contributor}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              ({memberRole})
                            </span>
                          </div>
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
                        <td className="px-3.5 py-3 max-w-xs">
                          <div className="font-bold text-[#1d1d1f] text-xs truncate" title={item.style}>
                            {item.style}
                          </div>
                          {item.jenisSample && (
                            <span className="inline-block mt-0.5 text-[10px] font-bold uppercase px-1.5 py-0.2 bg-amber-100 text-amber-900 rounded">
                              {item.jenisSample}
                            </span>
                          )}
                        </td>
                        <td className="px-3.5 py-3 whitespace-nowrap font-mono text-xs text-slate-600">
                          <div>{item.sampleNo || '-'}</div>
                          {item.buyerNo && item.buyerNo !== 'NA' && (
                            <div className="text-[10px] text-slate-400">{item.buyerNo}</div>
                          )}
                        </td>
                        <td className="px-3.5 py-3 whitespace-nowrap text-xs">
                          <div className="flex items-center gap-1">
                            {item.size && item.size !== 'NA' ? (
                              <span className="font-bold text-slate-800 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200 uppercase text-[11px]">
                                {item.size}
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                            {item.color && item.color !== 'NA' && item.color !== '-' && (
                              <span className="text-slate-600 text-xs truncate max-w-[100px]" title={item.color}>
                                • {item.color}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3.5 py-3 text-right font-black text-slate-900 tabular-nums whitespace-nowrap">
                          <span className="text-sm font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            {item.jumlah}{' '}
                            <span className="text-[10px] text-emerald-600 font-normal uppercase">
                              PCE
                            </span>
                          </span>
                        </td>
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setSelectedBoxNumber?.(Number(item.boxNumber))}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs transition border border-blue-200 cursor-pointer"
                            title={`Buka rincian Box #${item.boxNumber} (${item.rackName})`}
                          >
                            <Boxes className="w-3 h-3 text-blue-600" />
                            <span>{item.boxLabel}</span>
                            <span className="text-[10px] text-blue-500 font-normal">({item.rackName})</span>
                          </button>
                        </td>
                        <td className="px-3.5 py-3 whitespace-nowrap text-xs">
                          {item.isCrossBox ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200 text-[11px] font-semibold" title={`Membantu input ke box milik PPIC ${item.boxPic}`}>
                              <Users className="w-3 h-3 text-teal-600" />
                              <span>Bantu {item.boxPic}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-50 text-slate-600 border border-slate-200 text-[11px]">
                              <span>Mandiri ({item.boxPic})</span>
                            </span>
                          )}
                        </td>
                        <td className="px-3.5 py-3 text-center whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            <span>{item.status || 'Tersimpan'}</span>
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controller */}
          {totalLogItems > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-black/[0.06] text-xs">
              <div className="flex items-center gap-2 text-[#86868b] flex-wrap">
                <span>Tampilkan:</span>
                <select
                  value={logPageSize}
                  onChange={(e) => {
                    setLogPageSize(Number(e.target.value));
                    setLogCurrentPage(1);
                  }}
                  className="bg-[#f5f5f7] border border-black/[0.08] rounded-md px-2 py-1 text-xs font-semibold text-[#1d1d1f] cursor-pointer"
                >
                  <option value={25}>25 per halaman</option>
                  <option value={50}>50 per halaman</option>
                  <option value={100}>100 per halaman</option>
                  <option value={0}>Semua ({totalLogItems})</option>
                </select>
                <span className="tabular-nums">
                  Menampilkan {logPageSize > 0 ? `${(safeLogCurrentPage - 1) * logPageSize + 1} - ${Math.min(safeLogCurrentPage * logPageSize, totalLogItems)}` : `1 - ${totalLogItems}`} dari {totalLogItems} item ({totalLogPcs.toLocaleString('id-ID')} PCE)
                </span>
              </div>

              {logPageSize > 0 && totalLogPages > 1 && (
                <div className="flex items-center gap-1 self-center">
                  <button
                    type="button"
                    onClick={() => setLogCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={safeLogCurrentPage <= 1}
                    className="px-3 py-1 rounded-md border border-black/[0.08] text-xs font-semibold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-black/[0.03] transition cursor-pointer"
                  >
                    Sebelumnya
                  </button>
                  <span className="px-2 font-semibold text-[#1d1d1f] tabular-nums">
                    {safeLogCurrentPage} / {totalLogPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setLogCurrentPage((p) => Math.min(totalLogPages, p + 1))}
                    disabled={safeLogCurrentPage >= totalLogPages}
                    className="px-3 py-1 rounded-md border border-black/[0.08] text-xs font-semibold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-black/[0.03] transition cursor-pointer"
                  >
                    Selanjutnya
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* SATU TABEL UTAMA RIWAYAT: 8 Kolom Anggota Tim Sejajar (5 PPIC & 3 Support) */}
      {(activeTab === 'all' || activeTab === 'matrix') && (
        <div className="p-4 sm:p-5 bg-white/95 backdrop-blur-md rounded-lg border border-slate-200/80 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Users className="h-4 w-4 text-blue-600" />
              <span>Log Aktivitas &amp; Riwayat Input Harian R&amp;D</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Rekapitulasi kuantitatif produktivitas 8 personel (5 PPIC &amp; 3 Support) secara berkala dan terukur.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 uppercase tracking-wide">
                <th scope="col" className="px-4 py-3.5 sm:px-5 sm:py-4 whitespace-nowrap">Tanggal</th>
                {DEFAULT_TEAM_MEMBERS.map((m) => (
                  <th key={m.name} scope="col" className="px-4 py-3.5 sm:px-5 sm:py-4 text-right whitespace-nowrap min-w-[76px]">
                    <div className="font-extrabold text-slate-900">{m.name}</div>
                    <div className="text-xs font-semibold text-slate-400 lowercase mt-0.5">{m.role}</div>
                  </th>
                ))}
                <th scope="col" className="px-4 py-3.5 sm:px-5 sm:py-4 text-right font-black text-slate-900 whitespace-nowrap">Total (PCE)</th>
                <th scope="col" className="px-4 py-3.5 sm:px-5 sm:py-4 text-center whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dailyTeamRecords.dates.length === 0 ? (
                <tr>
                  <td colSpan={DEFAULT_TEAM_MEMBERS.length + 3} className="px-4 py-8 text-center text-slate-400">
                    Belum ada riwayat tanggal penyimpanan barang.
                  </td>
                </tr>
              ) : (
                dailyTeamRecords.dates.map((dateKey) => {
                  const record = dailyTeamRecords.map[dateKey];
                  const isSelected = selectedDailyDate === dateKey;
                  return (
                    <tr
                      key={dateKey}
                      onClick={() => setSelectedDailyDate(dateKey)}
                      className={`transition cursor-pointer ${
                        isSelected ? 'bg-blue-50/80 font-semibold' : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <td className="px-4 py-3 sm:px-5 sm:py-3 font-bold text-slate-800 whitespace-nowrap">
                        <span>{formatDateIndo(dateKey)}</span>
                        {dateKey === todayIso && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-xs font-black border border-emerald-300">
                            Hari Ini
                          </span>
                        )}
                      </td>
                      {DEFAULT_TEAM_MEMBERS.map((m) => {
                        const pcs = record.byPerson[m.name]?.pcs || 0;
                        return (
                          <td
                            key={`col-${dateKey}-${m.name}`}
                            className={`px-4 py-3 sm:px-5 sm:py-3 text-right tabular-nums font-mono ${
                              pcs > 0 ? 'font-bold text-slate-800' : 'text-slate-300'
                            }`}
                          >
                            {pcs > 0 ? pcs.toLocaleString('id-ID') : '-'}
                          </td>
                        );
                      })}
                      <td className="px-4 py-3 sm:px-5 sm:py-3 text-right font-black text-emerald-700 font-mono tabular-nums text-xs sm:text-sm">
                        {record.totalPcs.toLocaleString('id-ID')}
                      </td>
                      <td className="px-4 py-3 sm:px-5 sm:py-3 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDailyDate(dateKey);
                          }}
                          aria-label={isSelected ? `Tanggal ${formatDateIndo(dateKey)} aktif` : `Pilih tanggal ${formatDateIndo(dateKey)}`}
                          title={isSelected ? 'Tanggal sedang ditampilkan di kartu atas' : 'Klik untuk tampilkan rincian tanggal ini di kartu atas'}
                          className={`inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
                            isSelected
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-700 border border-slate-200 hover:border-blue-300'
                          }`}
                        >
                          {isSelected ? (
                            <>
                              <Check className="w-3.5 h-3.5" aria-hidden="true" />
                              <span className="hidden sm:inline">Aktif</span>
                            </>
                          ) : (
                            <>
                              <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                              <span className="hidden sm:inline">Pilih</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {dailyTeamRecords.dates.length > 0 && (
              <tfoot className="border-t-2 border-slate-950 bg-slate-900 text-white font-black shadow-md">
                <tr className="text-xs font-black text-white">
                  <td className="px-4 py-3.5 sm:px-5 sm:py-4 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-600 text-white text-xs font-black uppercase tracking-wider shadow-xs">
                      TOTAL KESELURUHAN
                    </span>
                  </td>
                  {DEFAULT_TEAM_MEMBERS.map((m) => {
                    const pcs = allTimeTeamTotals.byPerson[m.name]?.pcs || 0;
                    return (
                      <td
                        key={`foot-total-${m.name}`}
                        className="px-4 py-3.5 sm:px-5 sm:py-4 text-right font-black font-mono tabular-nums text-white text-xs sm:text-sm"
                      >
                        {pcs > 0 ? pcs.toLocaleString('id-ID') : '-'}
                      </td>
                    );
                  })}
                  <td className="px-4 py-3.5 sm:px-5 sm:py-4 text-right font-black font-mono text-emerald-400 tabular-nums text-xs sm:text-sm">
                    {allTimeTeamTotals.grandTotalPcs.toLocaleString('id-ID')}
                  </td>
                  <td className="px-4 py-3.5 sm:px-5 sm:py-4 text-center whitespace-nowrap">
                    <span className="text-xs font-bold font-mono px-2 py-1 rounded-md bg-slate-800 text-slate-200 border border-slate-700">
                      {dailyTeamRecords.dates.length} Hari
                    </span>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
      )}
    </div>
  );
}

export default PpicPerformanceView;
