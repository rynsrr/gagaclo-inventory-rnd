import { useState, useMemo, useEffect } from 'react';
import { useInventory } from '../context/InventoryContext';
import {
  Calendar,
  RefreshCw,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  BarChart3,
  ClipboardList,
  Users,
  Sparkles,
} from 'lucide-react';
import {
  getItemRecordDate,
  getLocalTodayIso,
  formatDateIndo,
  formatDateIndoFull,
} from '../utils/dateUtils';
import { isHelper } from '../utils/authUtils';

const DEFAULT_PICS = ['Royan', 'Cynara', 'Ami', 'Ryan', 'Hanami'];
const DEFAULT_HELPERS = ['Helper 1', 'Helper 2', 'Helper 3'];

export function PpicPerformanceView() {
  const {
    boxes,
    items,
    ppicMembers,
    showNotification,
    syncFromSupabase,
  } = useInventory();

  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [copiedRekap, setCopiedRekap] = useState(false);
  const [expandedDailyPics, setExpandedDailyPics] = useState({});
  const [expandedDailyHelpers, setExpandedDailyHelpers] = useState({});

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

  const activePics = useMemo(() => {
    const set = new Set(DEFAULT_PICS);
    if (Array.isArray(ppicMembers)) {
      ppicMembers.forEach((p) => {
        if (p.name && !isHelper(p)) set.add(p.name);
      });
    }
    return Array.from(set);
  }, [ppicMembers]);

  const dailyPicRecords = useMemo(() => {
    const map = {};
    items.forEach((item) => {
      const box = boxRackMap[Number(item.boxNumber)];
      const dateKey = item.recordDate || getItemRecordDate(item);
      if (!dateKey) return;
      if (!map[dateKey]) {
        map[dateKey] = {
          date: dateKey,
          totalPcs: 0,
          totalItems: 0,
          byPic: {},
          byHelper: {},
          items: [],
        };
      }
      const pcs = Number(item.jumlah) || 0;
      const pic = String(item.picName || (box ? box.picName : 'Lainnya')).trim();

      // Deteksi apakah item di-input oleh Helper (Asisten Rekap)
      const tags = Array.isArray(item.tags) ? item.tags : [];
      const helperTag = tags.find(t => typeof t === 'string' && t.startsWith('helper:'));
      const inputtedByTag = tags.find(t => typeof t === 'string' && t.startsWith('inputted_by:'));
      const rawHelper = item.helperName ||
        (helperTag ? decodeURIComponent(helperTag.slice(7)) : null) ||
        (inputtedByTag ? decodeURIComponent(inputtedByTag.slice(12)) : null) ||
        (item.inputtedBy && String(item.inputtedBy).toLowerCase().startsWith('helper') ? item.inputtedBy : null) ||
        (item.createdBy && String(item.createdBy).toLowerCase().startsWith('helper') ? item.createdBy : null);

      const helperName = rawHelper ? String(rawHelper).trim() : null;

      const enrichedItem = {
        ...item,
        recordDate: dateKey,
        boxLabel: `BOX ${item.boxNumber}`,
        style: (item.style || item.name || 'TANPA STYLE').trim(),
        kode: item.kode || item.sku || 'NA',
        jumlah: pcs,
        picName: pic,
        helperName: helperName || null,
      };

      map[dateKey].totalPcs += pcs;
      map[dateKey].totalItems += 1;
      map[dateKey].items.push(enrichedItem);

      if (!map[dateKey].byPic[pic]) {
        map[dateKey].byPic[pic] = { pcs: 0, items: 0, itemsList: [] };
      }
      map[dateKey].byPic[pic].pcs += pcs;
      map[dateKey].byPic[pic].items += 1;
      map[dateKey].byPic[pic].itemsList.push(enrichedItem);

      // Catat produktivitas helper
      if (helperName) {
        if (!map[dateKey].byHelper[helperName]) {
          map[dateKey].byHelper[helperName] = { pcs: 0, items: 0, byPic: {}, itemsList: [] };
        }
        map[dateKey].byHelper[helperName].pcs += pcs;
        map[dateKey].byHelper[helperName].items += 1;
        map[dateKey].byHelper[helperName].itemsList.push(enrichedItem);
        map[dateKey].byHelper[helperName].byPic[pic] = (map[dateKey].byHelper[helperName].byPic[pic] || 0) + pcs;
      }
    });

    const dates = Object.keys(map).sort((a, b) => b.localeCompare(a));
    return { map, dates };
  }, [items, boxRackMap]);

  const allTimePicTotals = useMemo(() => {
    const totals = {
      byPic: {},
      grandTotalPcs: 0,
      grandTotalItems: 0,
    };
    activePics.forEach((pic) => {
      totals.byPic[pic] = { pcs: 0, items: 0 };
    });

    dailyPicRecords.dates.forEach((dateKey) => {
      const record = dailyPicRecords.map[dateKey];
      if (!record) return;
      totals.grandTotalPcs += record.totalPcs || 0;
      totals.grandTotalItems += record.totalItems || 0;

      activePics.forEach((pic) => {
        const picData = record.byPic[pic];
        if (picData) {
          totals.byPic[pic].pcs += picData.pcs || 0;
          totals.byPic[pic].items += picData.items || 0;
        }
      });
    });

    return totals;
  }, [activePics, dailyPicRecords]);

  // Akumulasi total PCS & transaksi per Helper (Asisten Rekap)
  const allTimeHelperTotals = useMemo(() => {
    const totals = {
      byHelper: {
        'Helper 1': { pcs: 0, items: 0, byPic: {} },
        'Helper 2': { pcs: 0, items: 0, byPic: {} },
        'Helper 3': { pcs: 0, items: 0, byPic: {} },
      },
      grandTotalHelperPcs: 0,
      grandTotalHelperItems: 0,
    };

    dailyPicRecords.dates.forEach((dateKey) => {
      const record = dailyPicRecords.map[dateKey];
      if (!record || !record.byHelper) return;

      Object.entries(record.byHelper).forEach(([hName, hData]) => {
        if (!totals.byHelper[hName]) {
          totals.byHelper[hName] = { pcs: 0, items: 0, byPic: {} };
        }
        totals.byHelper[hName].pcs += hData.pcs || 0;
        totals.byHelper[hName].items += hData.items || 0;
        totals.grandTotalHelperPcs += hData.pcs || 0;
        totals.grandTotalHelperItems += hData.items || 0;

        Object.entries(hData.byPic || {}).forEach(([pName, pPcs]) => {
          totals.byHelper[hName].byPic[pName] = (totals.byHelper[hName].byPic[pName] || 0) + pPcs;
        });
      });
    });

    return totals;
  }, [dailyPicRecords]);

  const todayIso = getLocalTodayIso();
  const [selectedDailyDate, setSelectedDailyDate] = useState(todayIso);

  // Otomatis pindah hari ke hari ini saat komponen dibuka atau saat tanggal berubah
  useEffect(() => {
    setSelectedDailyDate(todayIso);
  }, [todayIso]);

  const currentDailyData = dailyPicRecords.map[selectedDailyDate] || {
    date: selectedDailyDate,
    totalPcs: 0,
    totalItems: 0,
    byPic: {},
    byHelper: {},
    items: [],
  };

  const todayTotalHelperPcs = useMemo(() => {
    if (!currentDailyData?.byHelper) return 0;
    return Object.values(currentDailyData.byHelper).reduce((acc, h) => acc + (h.pcs || 0), 0);
  }, [currentDailyData]);

  const handleCopyDailyRekap = () => {
    const dateFormatted = formatDateIndo(selectedDailyDate);
    const picLines = activePics
      .map((pic) => {
        const stats = currentDailyData.byPic[pic] || { pcs: 0, items: 0 };
        return `- ${pic.padEnd(8)}: ${stats.pcs} PCS (${stats.items} sampel)`;
      })
      .join('\n');

    let helperSection = '';
    const activeHelpersToday = Object.keys(currentDailyData.byHelper || {});
    if (activeHelpersToday.length > 0) {
      const helperLines = activeHelpersToday
        .map((hName) => {
          const stats = currentDailyData.byHelper[hName] || { pcs: 0, items: 0, byPic: {} };
          const picBreakdownStr = Object.entries(stats.byPic || {})
            .map(([p, pcs]) => `${p}: ${pcs} PCS`)
            .join(', ');
          return `- ${hName}: ${stats.pcs} PCS (${stats.items} sampel) [Bantu: ${picBreakdownStr || '-'}]`;
        })
        .join('\n');
      helperSection = `\n━━━━━━━━━━━━━━━━━━━━\n📝 KONTROL INPUT ASISTEN REKAP (HELPER):\n${helperLines}`;
    }

    const text = `📊 REKAP PENYIMPANAN HARIAN R&D GAGACLO\n📅 Tanggal: ${dateFormatted}\n━━━━━━━━━━━━━━━━━━━━\n📦 ALOKASI PENYIMPANAN SESUAI BOX PIC:\n${picLines}${helperSection}\n━━━━━━━━━━━━━━━━━━━━\n📦 TOTAL HARIAN: ${currentDailyData.totalPcs} PCS (${currentDailyData.totalItems} sampel)`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedRekap(true);
      setTimeout(() => setCopiedRekap(false), 2500);
      if (showNotification) {
        showNotification('Teks rekap harian berhasil disalin!', 'success', 3000);
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">
      {/* Header Controls: Date Picker & Actions */}
      <div className="p-4 sm:p-5 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
              <Calendar className="h-4.5 w-4.5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-800 flex items-center gap-2">
                Rekap Harian Penyimpanan PPIC
                <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {currentDailyData.totalPcs} PCS
                </span>
              </h1>
              <p className="text-xs text-slate-500">
                Pantau total PCS dan jumlah sampel yang di-input/disimpan oleh tiap PIC per hari
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Date Input (Tampil: Tanggal, Bulan dan Tahun) */}
          <label
            className="relative flex items-center gap-2 bg-slate-50 hover:bg-slate-100/90 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold cursor-pointer transition shadow-2xs group"
            title="Klik untuk memilih tanggal dari kalender"
          >
            <Calendar className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-600 transition shrink-0" />
            <span className="text-slate-500 text-[11px]">Tanggal:</span>
            <span className="text-slate-900 font-bold tracking-tight">
              {formatDateIndoFull(selectedDailyDate)}
            </span>
            <Calendar className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 ml-0.5 shrink-0" />
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
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border cursor-pointer ${
              selectedDailyDate === todayIso
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
            }`}
          >
            Hari Ini
          </button>

          {/* Refresh Data Real-Time */}
          <button
            type="button"
            onClick={handleManualSync}
            disabled={isManualSyncing}
            className="px-3 py-1.5 rounded-xl text-xs font-bold border border-emerald-500/40 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 transition flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-60"
            title="Refresh data aktivitas harian langsung dari server cloud"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${isManualSyncing ? 'animate-spin' : ''}`} />
            <span>{isManualSyncing ? 'Sync...' : 'Refresh'}</span>
          </button>

          {/* Salin Rekap Harian */}
          <button
            type="button"
            onClick={handleCopyDailyRekap}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            {copiedRekap ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span>Tersalin!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Salin Rekap Chat</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Ringkasan Total Hari Terpilih */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 bg-gradient-to-br from-emerald-50/80 to-emerald-100/40 rounded-2xl border border-emerald-200/80">
          <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
            Total PCS Disimpan ({formatDateIndoFull(selectedDailyDate)})
          </div>
          <div className="mt-1 text-2xl font-black text-emerald-950 tabular-nums">
            {currentDailyData.totalPcs.toLocaleString('id-ID')}{' '}
            <span className="text-sm font-semibold text-emerald-700">PCS</span>
          </div>
          <div className="mt-0.5 text-xs text-emerald-700">
            Dari {currentDailyData.totalItems} transaksi sampel di {activePics.length} PIC
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
            { border: 'border-blue-200', bg: 'bg-blue-50/40', badge: 'bg-blue-100 text-blue-800' },
            { border: 'border-purple-200', bg: 'bg-purple-50/40', badge: 'bg-purple-100 text-purple-800' },
            { border: 'border-emerald-200', bg: 'bg-emerald-50/40', badge: 'bg-emerald-100 text-emerald-800' },
            { border: 'border-amber-200', bg: 'bg-amber-50/40', badge: 'bg-amber-100 text-amber-800' },
            { border: 'border-rose-200', bg: 'bg-rose-50/40', badge: 'bg-rose-100 text-rose-800' },
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
                    Di-Input Hari Ini:
                  </div>
                  <div className="mt-0.5 text-2xl font-black text-slate-900 tabular-nums">
                    {picStats.pcs.toLocaleString('id-ID')}{' '}
                    <span className="text-xs font-semibold text-slate-500">PCS</span>
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    {picStats.items > 0 ? `${picStats.items} sampel masuk` : 'Belum ada input'}
                  </div>
                </div>

                {/* Total Akumulasi Semua Hari per PIC */}
                <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-medium">Total Akumulasi:</span>
                  <span className="font-black text-slate-900 tabular-nums">
                    {(allTimePicTotals.byPic[picName]?.pcs || 0).toLocaleString('id-ID')} PCS
                  </span>
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
                    <div className="mt-2 space-y-1.5 max-h-44 overflow-y-auto pr-1">
                      {picStats.itemsList.map((it, itemIdx) => (
                        <div
                          key={itemIdx}
                          className="text-[11px] p-2 rounded-lg bg-white/95 border border-slate-200/80 leading-tight shadow-2xs"
                        >
                          <div className="font-bold text-slate-900 truncate">{it.style}</div>
                          <div className="text-[10px] text-slate-600 flex justify-between items-center mt-1">
                            <span className="font-mono font-semibold">
                              {it.boxLabel} • {it.kode}
                            </span>
                            <span className="font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                              {it.jumlah} PCS
                            </span>
                          </div>
                          <div className="text-[9.5px] text-slate-400 mt-1 flex justify-between items-center border-t border-slate-100 pt-1">
                            <span>
                              Tgl Sample: <strong className="text-slate-600">{it.tanggal || 'NA'}</strong>
                            </span>
                            {it.recordDate && (
                              <span className="text-blue-600 font-semibold">
                                Tgl Input: {it.recordDate}
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

      {/* SEKSI KHUSUS: KONTROL INPUT ASISTEN REKAP (3 HELPER DATA) */}
      <div className="p-4 sm:p-5 bg-gradient-to-br from-teal-50/70 via-cyan-50/40 to-slate-50/80 rounded-2xl border border-teal-200/80 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-teal-200/60 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-2xs font-black">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2 flex-wrap">
                Kontrol Input Asisten Rekap (Helper Data)
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-300">
                  Dual-Tracking
                </span>
                {todayTotalHelperPcs > 0 && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                    +{todayTotalHelperPcs.toLocaleString('id-ID')} PCS Hari Ini
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Kontrol akurat berapa PCS dan berapa sampel yang di-input oleh 3 Asisten Rekap ke box 5 PIC. Stok tetap tercatat di Box PIC yang bersangkutan.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-[11px] font-bold text-teal-800 bg-white/80 border border-teal-200 px-2.5 py-1 rounded-xl shadow-2xs">
              Akumulasi Helper: <strong className="text-teal-950 font-black">{allTimeHelperTotals.grandTotalHelperPcs.toLocaleString('id-ID')} PCS</strong> ({allTimeHelperTotals.grandTotalHelperItems} sampel)
            </span>
          </div>
        </div>

        {/* 3 Kartu Helper */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {DEFAULT_HELPERS.map((helperName, hIdx) => {
            const hToday = currentDailyData.byHelper?.[helperName] || { pcs: 0, items: 0, byPic: {}, itemsList: [] };
            const hAllTime = allTimeHelperTotals.byHelper?.[helperName] || { pcs: 0, items: 0, byPic: {} };
            const isExpanded = Boolean(expandedDailyHelpers[helperName]);
            const assistedPics = Object.entries(hToday.byPic || {}).filter(([_, pcs]) => pcs > 0);

            const helperColors = [
              { border: 'border-teal-200', bg: 'bg-white/90', headerBg: 'bg-teal-50', badge: 'bg-teal-600 text-white', textAccent: 'text-teal-900' },
              { border: 'border-cyan-200', bg: 'bg-white/90', headerBg: 'bg-cyan-50', badge: 'bg-cyan-600 text-white', textAccent: 'text-cyan-900' },
              { border: 'border-sky-200', bg: 'bg-white/90', headerBg: 'bg-sky-50', badge: 'bg-sky-600 text-white', textAccent: 'text-sky-900' },
            ];
            const theme = helperColors[hIdx % helperColors.length];

            return (
              <div
                key={helperName}
                className={`rounded-2xl border ${theme.border} ${theme.bg} p-4 shadow-2xs flex flex-col justify-between transition hover:shadow-xs`}
              >
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-lg ${theme.badge} flex items-center justify-center font-black text-xs shadow-2xs`}>
                        H{hIdx + 1}
                      </div>
                      <div>
                        <span className="font-black text-sm text-slate-900">{helperName}</span>
                        <span className="text-[10px] text-slate-500 block">Asisten Rekap Data</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-black uppercase text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full">
                      Cross-Box
                    </span>
                  </div>

                  {/* Input Hari Ini */}
                  <div className="mt-3">
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                      Di-Input Hari Ini:
                    </div>
                    <div className="mt-0.5 text-2xl font-black text-slate-900 tabular-nums">
                      {hToday.pcs.toLocaleString('id-ID')}{' '}
                      <span className="text-xs font-semibold text-slate-500">PCS</span>
                    </div>
                    <div className="text-xs text-slate-600 mt-0.5">
                      {hToday.items > 0 ? `${hToday.items} sampel masuk` : 'Belum ada input hari ini'}
                    </div>
                  </div>

                  {/* PIC yang dibantu hari ini */}
                  {assistedPics.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100">
                      <div className="text-[10px] font-bold text-slate-500 uppercase">Membantu Box PIC:</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {assistedPics.map(([pName, pPcs]) => (
                          <span key={pName} className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200">
                            {pName}: <strong>{pPcs} PCS</strong>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Total Akumulasi Helper Semua Hari */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-medium">Total Akumulasi:</span>
                    <span className="font-black text-slate-900 tabular-nums">
                      {hAllTime.pcs.toLocaleString('id-ID')} PCS ({hAllTime.items} sampel)
                    </span>
                  </div>
                </div>

                {/* Rincian Sampel Helper */}
                {hToday.itemsList.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedDailyHelpers((prev) => ({
                          ...prev,
                          [helperName]: !prev[helperName],
                        }))
                      }
                      className="w-full text-[11px] font-bold text-teal-700 hover:text-teal-900 flex items-center justify-between cursor-pointer"
                    >
                      <span>{isExpanded ? 'Tutup Rincian' : `Lihat ${hToday.itemsList.length} Sampel (${hToday.pcs} PCS)`}</span>
                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>

                    {isExpanded && (
                      <div className="mt-2 space-y-1.5 max-h-44 overflow-y-auto pr-1">
                        {hToday.itemsList.map((it, itemIdx) => (
                          <div
                            key={itemIdx}
                            className="text-[11px] p-2 rounded-lg bg-white border border-teal-200/80 leading-tight shadow-2xs"
                          >
                            <div className="font-bold text-slate-900 truncate">{it.style}</div>
                            <div className="text-[10px] text-slate-600 flex justify-between items-center mt-1">
                              <span className="font-mono font-semibold">
                                {it.boxLabel} ({it.picName}) • {it.kode}
                              </span>
                              <span className="font-black text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200">
                                {it.jumlah} PCS
                              </span>
                            </div>
                            <div className="text-[9.5px] text-slate-400 mt-1 flex justify-between items-center border-t border-slate-100 pt-1">
                              <span>
                                Tgl Sample: <strong className="text-slate-600">{it.tanggal || 'NA'}</strong>
                              </span>
                              <span className="text-teal-700 font-semibold">
                                Direkap: {helperName}
                              </span>
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

      {/* Tabel Riwayat Harian per PIC */}
      <div className="p-4 sm:p-5 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <BarChart3 className="h-4 w-4 text-blue-600" />
              <span>Tabel Riwayat Penyimpanan Harian (PCS per PIC)</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Klik tanggal untuk memuat data &amp; rincian detail kartu di atas
            </p>
          </div>
        </div>

        {/* Total Akumulasi per PIC Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1 pb-1">
          {activePics.map((pic, idx) => {
            const totalPicPcs = allTimePicTotals.byPic[pic]?.pcs || 0;
            const totalPicItems = allTimePicTotals.byPic[pic]?.items || 0;
            const colorBadges = [
              'bg-blue-50/80 text-blue-900 border-blue-200',
              'bg-purple-50/80 text-purple-900 border-purple-200',
              'bg-emerald-50/80 text-emerald-900 border-emerald-200',
              'bg-amber-50/80 text-amber-900 border-amber-200',
              'bg-rose-50/80 text-rose-900 border-rose-200',
            ];
            const badgeCls = colorBadges[idx % colorBadges.length];
            return (
              <div
                key={`summary-bar-${pic}`}
                className={`p-2.5 rounded-xl border ${badgeCls} flex flex-col justify-between shadow-2xs`}
              >
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider opacity-80">
                  <span>{pic}</span>
                  <span className="text-[9px] font-black">TOTAL</span>
                </div>
                <div className="mt-1 text-base font-black tabular-nums">
                  {totalPicPcs.toLocaleString('id-ID')}{' '}
                  <span className="text-[10px] font-bold opacity-75">PCS</span>
                </div>
                <div className="text-[10px] opacity-75 mt-0.5">
                  {totalPicItems} transaksi sampel
                </div>
              </div>
            );
          })}
          <div className="p-2.5 rounded-xl border bg-gradient-to-br from-emerald-100/90 to-teal-100/90 border-emerald-300 text-emerald-950 flex flex-col justify-between shadow-2xs">
            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-emerald-900">
              <span>TOTAL SEMUA</span>
              <span className="text-[9px] font-black px-1.5 py-0.2 bg-emerald-200/80 rounded">
                {dailyPicRecords.dates.length} HARI
              </span>
            </div>
            <div className="mt-1 text-base font-black tabular-nums text-emerald-950">
              {allTimePicTotals.grandTotalPcs.toLocaleString('id-ID')}{' '}
              <span className="text-[10px] font-bold text-emerald-800">PCS</span>
            </div>
            <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
              {allTimePicTotals.grandTotalItems} transaksi di {activePics.length} PIC
            </div>
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
                <th className="px-3 py-2.5 text-right font-black text-emerald-800">Total Harian (PCS)</th>
                <th className="px-3 py-2.5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* Baris Total Akumulasi per PIC di bagian teratas tabel */}
              {dailyPicRecords.dates.length > 0 && (
                <tr className="border-b-2 border-blue-300 bg-gradient-to-r from-blue-100/90 via-indigo-50/80 to-blue-100/90 font-black text-slate-900 shadow-2xs">
                  <td className="px-3 py-2.5 font-black text-blue-900 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-600 text-white text-[10px] font-black tracking-wide shadow-2xs">
                      Σ TOTAL PER PIC
                    </span>
                  </td>
                  {activePics.map((pic) => {
                    const pcs = allTimePicTotals.byPic[pic]?.pcs || 0;
                    return (
                      <td
                        key={`top-total-${pic}`}
                        className="px-3 py-2.5 text-right font-black tabular-nums text-blue-950"
                      >
                        {pcs > 0 ? pcs.toLocaleString('id-ID') : '-'}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2.5 text-right font-black text-emerald-800 tabular-nums">
                    {allTimePicTotals.grandTotalPcs.toLocaleString('id-ID')}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-200/80 text-blue-900">
                      Semua Hari
                    </span>
                  </td>
                </tr>
              )}

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
                            {pcs > 0 ? pcs.toLocaleString('id-ID') : '-'}
                          </td>
                        );
                      })}
                      <td className="px-3 py-2 text-right font-black text-emerald-700 tabular-nums">
                        {record.totalPcs.toLocaleString('id-ID')}
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
            {dailyPicRecords.dates.length > 0 && (
              <tfoot className="border-t-2 border-slate-300 bg-slate-100/90 font-black">
                <tr className="border-t-2 border-slate-300 bg-gradient-to-r from-slate-100 via-blue-50/40 to-slate-100 text-[11px] font-black text-slate-900">
                  <td className="px-3 py-2.5 font-black text-slate-900 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 text-white text-[10px] font-black tracking-wide shadow-2xs">
                      TOTAL KESELURUHAN
                    </span>
                  </td>
                  {activePics.map((pic) => {
                    const pcs = allTimePicTotals.byPic[pic]?.pcs || 0;
                    return (
                      <td
                        key={`foot-total-${pic}`}
                        className="px-3 py-2.5 text-right font-black tabular-nums text-slate-900"
                      >
                        {pcs > 0 ? pcs.toLocaleString('id-ID') : '-'}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2.5 text-right font-black text-emerald-800 tabular-nums">
                    {allTimePicTotals.grandTotalPcs.toLocaleString('id-ID')}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-200 text-slate-700">
                      {dailyPicRecords.dates.length} Hari
                    </span>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Tabel Riwayat Harian per Helper (Asisten Rekap) */}
      <div className="p-4 sm:p-5 bg-white/95 backdrop-blur-md rounded-2xl border border-teal-200/80 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <ClipboardList className="h-4 w-4 text-teal-600" />
              <span>Tabel Riwayat Input Harian Asisten Rekap (PCS per Helper)</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Data kontrol kuantitatif berapa PCS yang dimasukkan masing-masing helper setiap harinya
            </p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-teal-200 bg-teal-50/80 text-[11px] font-bold text-teal-900 uppercase">
                <th className="px-3 py-2.5">Tanggal</th>
                {DEFAULT_HELPERS.map((hName) => (
                  <th key={hName} className="px-3 py-2.5 text-right">
                    {hName} (PCS)
                  </th>
                ))}
                <th className="px-3 py-2.5 text-right font-black text-teal-950">Total Helper (PCS)</th>
                <th className="px-3 py-2.5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* Baris Total Akumulasi per Helper di bagian atas tabel */}
              {dailyPicRecords.dates.length > 0 && (
                <tr className="border-b-2 border-teal-300 bg-gradient-to-r from-teal-100/90 via-cyan-50/80 to-teal-100/90 font-black text-slate-900 shadow-2xs">
                  <td className="px-3 py-2.5 font-black text-teal-950 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-teal-700 text-white text-[10px] font-black tracking-wide shadow-2xs">
                      Σ TOTAL PER HELPER
                    </span>
                  </td>
                  {DEFAULT_HELPERS.map((hName) => {
                    const pcs = allTimeHelperTotals.byHelper[hName]?.pcs || 0;
                    return (
                      <td
                        key={`top-helper-total-${hName}`}
                        className="px-3 py-2.5 text-right font-black tabular-nums text-teal-950"
                      >
                        {pcs > 0 ? pcs.toLocaleString('id-ID') : '-'}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2.5 text-right font-black text-teal-900 tabular-nums">
                    {allTimeHelperTotals.grandTotalHelperPcs.toLocaleString('id-ID')}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-200/80 text-teal-900">
                      Semua Hari
                    </span>
                  </td>
                </tr>
              )}

              {dailyPicRecords.dates.length === 0 ? (
                <tr>
                  <td colSpan={DEFAULT_HELPERS.length + 3} className="px-4 py-8 text-center text-slate-400">
                    Belum ada riwayat tanggal penyimpanan barang.
                  </td>
                </tr>
              ) : (
                dailyPicRecords.dates.map((dateKey) => {
                  const record = dailyPicRecords.map[dateKey];
                  const isSelected = selectedDailyDate === dateKey;
                  const helperObj = record.byHelper || {};
                  const dateTotalHelperPcs = Object.values(helperObj).reduce((acc, h) => acc + (h.pcs || 0), 0);

                  return (
                    <tr
                      key={`helper-row-${dateKey}`}
                      onClick={() => setSelectedDailyDate(dateKey)}
                      className={`transition cursor-pointer ${
                        isSelected ? 'bg-teal-50/70 font-semibold' : 'hover:bg-slate-50/80'
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
                      {DEFAULT_HELPERS.map((hName) => {
                        const pcs = helperObj[hName]?.pcs || 0;
                        return (
                          <td
                            key={`helper-col-${dateKey}-${hName}`}
                            className={`px-3 py-2 text-right tabular-nums ${
                              pcs > 0 ? 'font-bold text-teal-900' : 'text-slate-300'
                            }`}
                          >
                            {pcs > 0 ? pcs.toLocaleString('id-ID') : '-'}
                          </td>
                        );
                      })}
                      <td className="px-3 py-2 text-right font-black text-teal-800 tabular-nums">
                        {dateTotalHelperPcs > 0 ? dateTotalHelperPcs.toLocaleString('id-ID') : '-'}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className="text-[11px] text-teal-700 hover:underline">
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
  );
}

export default PpicPerformanceView;
