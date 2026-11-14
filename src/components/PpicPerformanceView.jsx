import { useState, useMemo, useEffect } from 'react';
import { useInventory } from '../context/InventoryContext';
import {
  Calendar,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Users,
  Target,
  Edit2,
  Check,
  X,
} from 'lucide-react';
import {
  getItemRecordDate,
  getLocalTodayIso,
  formatDateIndo,
  formatDateIndoFull,
} from '../utils/dateUtils';
import { isManager, isSuperuser } from '../utils/authUtils';

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
    currentUser,
    showNotification,
    syncFromSupabase,
  } = useInventory();

  const isMgr = isManager(currentUser) || isSuperuser(currentUser);
  const [dailyTarget, setDailyTarget] = useState(() => {
    try {
      const saved = localStorage.getItem('gagaclo_daily_target_pcs');
      return saved ? Math.max(1, Number(saved)) : 150;
    } catch {
      return 150;
    }
  });
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [tempTarget, setTempTarget] = useState(dailyTarget.toString());

  const handleSaveTarget = (e) => {
    e?.preventDefault?.();
    const num = Math.max(1, parseInt(tempTarget, 10) || 150);
    setDailyTarget(num);
    localStorage.setItem('gagaclo_daily_target_pcs', num.toString());
    setIsEditingTarget(false);
    if (showNotification) {
      showNotification(`Target input harian berhasil disetel ke ${num} PCS oleh ${currentUser?.name || 'Manager'}.`, 'success', 3000);
    }
  };

  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [expandedCards, setExpandedCards] = useState({});

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

      // Deteksi penginput riil (Support vs PIC)
      const tags = Array.isArray(item.tags) ? item.tags : [];
      const supportTag = tags.find((t) => typeof t === 'string' && (t.startsWith('support:') || t.startsWith('helper:')));
      const inputtedByTag = tags.find((t) => typeof t === 'string' && t.startsWith('inputted_by:'));
      const rawSupport =
        item.supportName ||
        item.helperName ||
        (supportTag ? decodeURIComponent(supportTag.slice(supportTag.indexOf(':') + 1)) : null) ||
        (inputtedByTag ? decodeURIComponent(inputtedByTag.slice(12)) : null) ||
        (item.inputtedBy && ['sheva', 'ade', 'tri', 'helper 1', 'helper 2', 'helper 3'].some((n) => String(item.inputtedBy).toLowerCase().includes(n))
          ? item.inputtedBy
          : null) ||
        (item.createdBy && ['sheva', 'ade', 'tri', 'helper 1', 'helper 2', 'helper 3'].some((n) => String(item.createdBy).toLowerCase().includes(n))
          ? item.createdBy
          : null);

      let resolvedSupport = null;
      if (rawSupport) {
        const sStr = String(rawSupport).trim();
        if (/helper\s*1/i.test(sStr)) resolvedSupport = 'Sheva';
        else if (/helper\s*2/i.test(sStr)) resolvedSupport = 'Ade';
        else if (/helper\s*3/i.test(sStr)) resolvedSupport = 'Tri';
        else {
          const match = ['Sheva', 'Ade', 'Tri'].find((s) => s.toLowerCase() === sStr.toLowerCase());
          if (match) resolvedSupport = match;
        }
      }

      // Tentukan siapa kontributor sebenarnya (8 orang)
      let contributor = null;
      if (resolvedSupport) {
        contributor = resolvedSupport;
      } else {
        const inputByStr = String(item.inputtedBy || item.createdBy || '').trim().toLowerCase();
        const foundMember = DEFAULT_TEAM_MEMBERS.find((m) => m.name.toLowerCase() === inputByStr);
        if (foundMember) {
          contributor = foundMember.name;
        } else {
          // Fallback ke PIC pemilik box
          const matchPic = DEFAULT_TEAM_MEMBERS.find((m) => m.name.toLowerCase() === boxPic.toLowerCase());
          contributor = matchPic ? matchPic.name : (boxPic || 'Royan');
        }
      }

      const enrichedItem = {
        ...item,
        recordDate: dateKey,
        boxLabel: `BOX ${item.boxNumber}`,
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

  const todayIso = getLocalTodayIso();
  const [selectedDailyDate, setSelectedDailyDate] = useState(todayIso);

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

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">
      {/* Header Controls: Date Picker & Refresh */}
      <div className="p-4 sm:p-5 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
              <Calendar className="h-4.5 w-4.5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-800 flex items-center gap-2">
                Rekap Harian Penyimpanan Tim R&D
                <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {currentDailyData.totalPcs} PCS
                </span>
              </h1>
              <p className="text-xs text-slate-500">
                Catatan kuantitatif input barang harian 8 anggota tim (5 PPIC &amp; 3 Support) secara setara &amp; transparan
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
        </div>
      </div>

      {/* Target Harian Tim (Full Width di Bagian Atas) */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-indigo-50/90 via-purple-50/60 to-blue-50/70 rounded-2xl border border-indigo-200/90 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-2xs">
              <Target className="w-4 h-4" />
            </div>
            <span className="text-xs font-black text-indigo-950 uppercase tracking-wider">
              TARGET HARIAN
            </span>
          </div>

          {isMgr && !isEditingTarget && (
            <button
              type="button"
              onClick={() => {
                setTempTarget(dailyTarget.toString());
                setIsEditingTarget(true);
              }}
              className="text-xs font-bold text-indigo-700 hover:text-indigo-900 bg-white hover:bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-200 flex items-center gap-1.5 shadow-2xs cursor-pointer transition"
              title="Ubah Target Harian Tim (Wewenang Manager)"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Ubah</span>
            </button>
          )}
        </div>

        {isEditingTarget ? (
          <form onSubmit={handleSaveTarget} className="flex flex-wrap items-center gap-2 pt-1 pb-1">
            <span className="text-xs font-bold text-indigo-900">Set Target Baru:</span>
            <input
              type="number"
              min="1"
              max="10000"
              autoFocus
              value={tempTarget}
              onChange={(e) => setTempTarget(e.target.value)}
              className="w-24 px-3 py-1.5 bg-white border border-indigo-300 rounded-xl text-sm font-black text-indigo-950 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
            <span className="text-xs font-bold text-indigo-900">PCS</span>
            <button
              type="submit"
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1 shadow-2xs cursor-pointer transition"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Simpan</span>
            </button>
            <button
              type="button"
              onClick={() => setIsEditingTarget(false)}
              className="px-3 py-1.5 rounded-xl bg-white text-slate-500 hover:text-slate-800 border border-slate-200 text-xs font-bold cursor-pointer transition"
            >
              Batal
            </button>
          </form>
        ) : (
          <div className="flex items-baseline justify-between flex-wrap gap-2">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black text-slate-900 tabular-nums">
                {currentDailyData.totalPcs}
              </span>
              <span className="text-base sm:text-lg font-bold text-indigo-700">
                / {dailyTarget} PCS
              </span>
            </div>
            <span className={`text-xs sm:text-sm font-black px-3 py-1 rounded-xl ${
              currentDailyData.totalPcs >= dailyTarget
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : 'bg-indigo-100 text-indigo-900'
            }`}>
              {Math.round((currentDailyData.totalPcs / dailyTarget) * 100)}%
            </span>
          </div>
        )}

        <div className="space-y-1.5">
          <div className="w-full bg-slate-200/90 rounded-full h-3 overflow-hidden p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-500 shadow-xs ${
                currentDailyData.totalPcs >= dailyTarget
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                  : 'bg-gradient-to-r from-indigo-600 to-purple-600'
              }`}
              style={{ width: `${Math.min(100, Math.round((currentDailyData.totalPcs / dailyTarget) * 100))}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
            <span>
              {currentDailyData.totalPcs >= dailyTarget
                ? '🎉 Luar biasa! Target input harian telah tercapai (100%+)'
                : `Sisa ${Math.max(0, dailyTarget - currentDailyData.totalPcs)} PCS`}
            </span>
            <span className="text-indigo-600 font-medium">Oleh Mgr. Jasmine</span>
          </div>
        </div>
      </div>

      {/* Ringkasan 3 Metrik Hari Terpilih */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Card 1: Total PCS Disimpan */}
        <div className="p-4 bg-gradient-to-br from-emerald-50/80 to-emerald-100/40 rounded-2xl border border-emerald-200/80 flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
              Total PCS Disimpan
            </div>
            <div className="mt-1 text-2xl font-black text-emerald-950 tabular-nums">
              {currentDailyData.totalPcs.toLocaleString('id-ID')}{' '}
              <span className="text-sm font-semibold text-emerald-700">PCS</span>
            </div>
          </div>
          <div className="mt-2 text-xs text-emerald-700">
            Dari {currentDailyData.totalItems} transaksi di 8 anggota tim
          </div>
        </div>

        {/* Card 2: Kontributor Teraktif */}
        <div className="p-4 bg-gradient-to-br from-blue-50/80 to-blue-100/40 rounded-2xl border border-blue-200/80 flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">
              Kontributor Teraktif
            </div>
            <div className="mt-1 text-2xl font-black text-blue-950 truncate">
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
                return maxPcs > 0 ? `${topPerson} - ${maxPcs} PCS` : 'Belum Ada Input';
              })()}
            </div>
          </div>
          <div className="mt-2 text-xs text-blue-700">Jumlah input terbanyak tanggal ini</div>
        </div>

        {/* Card 3: Riwayat Hari Tercatat */}
        <div className="p-4 bg-gradient-to-br from-slate-50 to-slate-100/60 rounded-2xl border border-slate-200/80 flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              Riwayat Hari Tercatat
            </div>
            <div className="mt-1 text-2xl font-black text-slate-800 tabular-nums">
              {dailyTeamRecords.dates.length} <span className="text-sm font-semibold text-slate-500">Hari</span>
            </div>
          </div>
          <div className="mt-2 text-xs text-slate-500">Total data riwayat hari tersimpan</div>
        </div>
      </div>

      {/* 8 KARTU ANGGOTA TIM: 5 PPIC & 3 Support Berdampingan Setara */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Users className="h-4 w-4 text-slate-600" />
            <span>Capaian Input Harian 8 Anggota Tim (5 PPIC &amp; 3 Support)</span>
          </h2>
          <span className="text-[11px] text-slate-500 font-semibold">
            Tanggal: {formatDateIndoFull(selectedDailyDate)}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {DEFAULT_TEAM_MEMBERS.map((member) => {
            const stats = currentDailyData.byPerson?.[member.name] || { pcs: 0, items: 0, itemsList: [], assistedBoxes: {} };
            const allTime = allTimeTeamTotals.byPerson?.[member.name] || { pcs: 0, items: 0 };
            const isExpanded = Boolean(expandedCards[member.name]);
            const assistedList = Object.entries(stats.assistedBoxes || {}).filter(([_, pcs]) => pcs > 0);

            return (
              <div
                key={member.name}
                className={`p-4 rounded-2xl border ${member.border} ${member.bg} backdrop-blur-md flex flex-col justify-between transition shadow-2xs hover:shadow-xs`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-200/60">
                    <span className="font-black text-sm text-slate-900">{member.name}</span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${member.tagBg}`}>
                      {member.role}
                    </span>
                  </div>

                  <div className="mt-1">
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                      Di-Input Hari Ini:
                    </div>
                    <div className="mt-0.5 text-2xl font-black text-slate-900 tabular-nums">
                      {stats.pcs.toLocaleString('id-ID')}{' '}
                      <span className="text-xs font-semibold text-slate-500">PCS</span>
                    </div>
                    <div className="text-xs text-slate-600 mt-0.5">
                      {stats.items > 0 ? `${stats.items} sampel masuk` : 'Belum ada input'}
                    </div>
                  </div>

                  {/* Keterangan jika membantu input ke box PPIC lain */}
                  {assistedList.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-slate-200/60">
                      <div className="text-[10px] font-bold text-slate-500 uppercase">Membantu Box PPIC:</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {assistedList.map(([pName, pPcs]) => (
                          <span key={pName} className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/90 text-slate-700 border border-slate-200">
                            {pName}: <strong>{pPcs} PCS</strong>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Total Akumulasi Semua Hari */}
                  <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-medium">Total Akumulasi:</span>
                    <span className="font-black text-slate-900 tabular-nums">
                      {allTime.pcs.toLocaleString('id-ID')} PCS
                    </span>
                  </div>
                </div>

                {stats.itemsList.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-slate-200/60">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedCards((prev) => ({
                          ...prev,
                          [member.name]: !prev[member.name],
                        }))
                      }
                      className="w-full text-[11px] font-bold text-blue-700 hover:text-blue-900 flex items-center justify-between cursor-pointer"
                    >
                      <span>{isExpanded ? 'Tutup Rincian' : `Lihat ${stats.itemsList.length} Sampel`}</span>
                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>

                    {isExpanded && (
                      <div className="mt-2 space-y-1.5 max-h-44 overflow-y-auto pr-1">
                        {stats.itemsList.map((it, itemIdx) => (
                          <div
                            key={itemIdx}
                            className="text-[11px] p-2 rounded-lg bg-white/95 border border-slate-200/80 leading-tight shadow-2xs"
                          >
                            <div className="font-bold text-slate-900 truncate">{it.style}</div>
                            <div className="text-[10px] text-slate-600 flex justify-between items-center mt-1">
                              <span className="font-mono font-semibold">
                                {it.boxLabel} ({it.boxPic}) • {it.kode}
                              </span>
                              <span className="font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                {it.jumlah} PCS
                              </span>
                            </div>
                            <div className="text-[9.5px] text-slate-400 mt-1 flex justify-between items-center border-t border-slate-100 pt-1">
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

      {/* SATU TABEL UTAMA RIWAYAT: 8 Kolom Anggota Tim Sejajar (5 PPIC & 3 Support) */}
      <div className="p-4 sm:p-5 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Users className="h-4 w-4 text-blue-600" />
              <span>Tabel Riwayat Input Harian Tim R&D (PCS per Orang)</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Catatan kuantitatif input harian 8 anggota tim (5 PPIC &amp; 3 Support) secara setara dan transparan
            </p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-bold text-slate-700 uppercase">
                <th className="px-3 py-2.5">Tanggal</th>
                {DEFAULT_TEAM_MEMBERS.map((m) => (
                  <th key={m.name} className="px-3 py-2.5 text-right whitespace-nowrap">
                    <div>{m.name}</div>
                    <div className="text-[9px] font-bold text-slate-400 lowercase">{m.role}</div>
                  </th>
                ))}
                <th className="px-3 py-2.5 text-right font-black text-slate-900">Total (PCS)</th>
                <th className="px-3 py-2.5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* Baris Total Akumulasi di Atas */}
              {dailyTeamRecords.dates.length > 0 && (
                <tr className="border-b-2 border-blue-300 bg-gradient-to-r from-blue-100/90 via-indigo-50/80 to-blue-100/90 font-black text-slate-900 shadow-2xs">
                  <td className="px-3 py-2.5 font-black text-blue-950 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-700 text-white text-[10px] font-black tracking-wide shadow-2xs">
                      Σ TOTAL PER ORANG
                    </span>
                  </td>
                  {DEFAULT_TEAM_MEMBERS.map((m) => {
                    const pcs = allTimeTeamTotals.byPerson[m.name]?.pcs || 0;
                    return (
                      <td
                        key={`top-total-${m.name}`}
                        className="px-3 py-2.5 text-right font-black tabular-nums text-blue-950"
                      >
                        {pcs > 0 ? pcs.toLocaleString('id-ID') : '-'}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2.5 text-right font-black text-emerald-800 tabular-nums">
                    {allTimeTeamTotals.grandTotalPcs.toLocaleString('id-ID')}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-200/80 text-blue-900">
                      Semua Hari
                    </span>
                  </td>
                </tr>
              )}

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
                      {DEFAULT_TEAM_MEMBERS.map((m) => {
                        const pcs = record.byPerson[m.name]?.pcs || 0;
                        return (
                          <td
                            key={`col-${dateKey}-${m.name}`}
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
            {dailyTeamRecords.dates.length > 0 && (
              <tfoot className="border-t-2 border-slate-300 bg-slate-100/90 font-black">
                <tr className="border-t-2 border-slate-300 bg-gradient-to-r from-slate-100 via-blue-50/40 to-slate-100 text-[11px] font-black text-slate-900">
                  <td className="px-3 py-2.5 font-black text-slate-900 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 text-white text-[10px] font-black tracking-wide shadow-2xs">
                      TOTAL KESELURUHAN
                    </span>
                  </td>
                  {DEFAULT_TEAM_MEMBERS.map((m) => {
                    const pcs = allTimeTeamTotals.byPerson[m.name]?.pcs || 0;
                    return (
                      <td
                        key={`foot-total-${m.name}`}
                        className="px-3 py-2.5 text-right font-black tabular-nums text-slate-900"
                      >
                        {pcs > 0 ? pcs.toLocaleString('id-ID') : '-'}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2.5 text-right font-black text-emerald-800 tabular-nums">
                    {allTimeTeamTotals.grandTotalPcs.toLocaleString('id-ID')}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-200 text-slate-700">
                      {dailyTeamRecords.dates.length} Hari
                    </span>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}

export default PpicPerformanceView;
