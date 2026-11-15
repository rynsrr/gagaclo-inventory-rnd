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
} from 'lucide-react';
import {
  getItemRecordDate,
  getLocalTodayIso,
  formatDateIndo,
  formatDateIndoFull,
} from '../utils/dateUtils';
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
  } = useInventory();

  const [dailyTarget, setDailyTarget] = useState(() => {
    try {
      const saved = localStorage.getItem('gagaclo_daily_target_pcs');
      return saved ? Math.max(1, Number(saved)) : 150;
    } catch {
      return 150;
    }
  });

  // Dengarkan perubahan target harian dari banner & bersihkan target individu lama agar seluruh tim sinkron
  useEffect(() => {
    try {
      localStorage.removeItem('gagaclo_individual_targets');
    } catch {}

    const handleTargetChange = () => {
      try {
        const saved = localStorage.getItem('gagaclo_daily_target_pcs');
        if (saved) setDailyTarget(Math.max(1, Number(saved)));
      } catch {}
    };
    window.addEventListener('storage', handleTargetChange);
    window.addEventListener('gagaclo_target_updated', handleTargetChange);
    return () => {
      window.removeEventListener('storage', handleTargetChange);
      window.removeEventListener('gagaclo_target_updated', handleTargetChange);
    };
  }, []);

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
                  {currentDailyData.totalPcs} PCS
                </span>
              </h1>
              <p className="text-xs text-[#86868b]">
                Catatan kuantitatif input barang harian 8 anggota tim (5 PPIC &amp; 3 Support) secara setara &amp; transparan
              </p>
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
                return maxPcs > 0 ? `${topPerson} - ${maxPcs} PCS` : 'Belum Ada Input';
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
                          / {personTarget} PCS
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
                              ? (stats.pcs > personTarget ? `✓ +${stats.pcs - personTarget} PCS surplus` : '✓ Tercapai')
                              : `Sisa ${Math.max(0, personTarget - stats.pcs)} PCS`}
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
                            {pName}: <strong>{pPcs} PCS</strong>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Total Akumulasi Semua Hari */}
                  <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
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
                      className="w-full text-xs font-bold text-blue-700 hover:text-blue-900 flex items-center justify-between cursor-pointer"
                    >
                      <span>{isExpanded ? 'Tutup Rincian' : `Lihat ${stats.itemsList.length} Sampel`}</span>
                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>

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
                                {it.jumlah} PCS
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

      {/* SATU TABEL UTAMA RIWAYAT: 8 Kolom Anggota Tim Sejajar (5 PPIC & 3 Support) */}
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
                <th scope="col" className="px-4 py-3.5 sm:px-5 sm:py-4 text-right font-black text-slate-900 whitespace-nowrap">Total (PCS)</th>
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
    </div>
  );
}

export default PpicPerformanceView;
